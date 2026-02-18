import { NextRequest, NextResponse } from "next/server";

const R2_WORKER = process.env.UPLOAD_R2_WORKER_API;
const R2_API_KEY = process.env.R2_UPLOAD_API_KEY;

export interface UploadImageResponse {
  success: true;
  url: string;
  key: string;
  contentType: string;
}

/**
 * POST /api/upload-image
 *
 * Accepts a multipart/form-data body with a single "file" field.
 * Proxies the binary to the Cloudflare R2 worker using the server-side API key
 * (the key is never exposed to the browser).
 *
 * Returns: { success, url, key, contentType }
 */
export async function POST(req: NextRequest) {
  console.log(R2_WORKER);
  console.log(R2_API_KEY);
  if (!R2_WORKER || !R2_API_KEY) {
    return NextResponse.json(
      { error: "R2 upload is not configured. Set UPLOAD_R2_WORKER_API and R2_UPLOAD_API_KEY." },
      { status: 503 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "image/avif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Allowed: JPEG, PNG, GIF, WebP, SVG, AVIF.` },
        { status: 400 }
      );
    }

    // Validate file size (max 10 MB)
    const MAX_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.` },
        { status: 400 }
      );
    }

    // Send binary to R2 worker
    const arrayBuffer = await file.arrayBuffer();
    const r2Res = await fetch(`${R2_WORKER}/upload`, {
      method: "POST",
      headers: {
        "X-Api-Key": R2_API_KEY,
        "Content-Type": file.type,
      },
      body: arrayBuffer,
    });

    if (!r2Res.ok) {
      let errMsg = `R2 worker error ${r2Res.status}`;
      try {
        const body = await r2Res.json();
        errMsg = body?.error || body?.message || errMsg;
      } catch {
        /* ignore */
      }
      return NextResponse.json({ error: errMsg }, { status: 502 });
    }

    const data = (await r2Res.json()) as UploadImageResponse;
    return NextResponse.json(data);
  } catch (err) {
    console.error("[upload-image] Unexpected error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
