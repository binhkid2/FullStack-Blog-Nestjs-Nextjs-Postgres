"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, X, ImageIcon } from "lucide-react";
import type { UploadImageResponse } from "@/app/api/upload-image/route";

interface Props {
  /** Current image URL (controlled) */
  value?: string;
  /** Called when a new image URL is ready (after upload) or cleared (empty string) */
  onChange: (url: string) => void;
  /** Alt text value */
  altValue?: string;
  /** Called when alt text changes */
  onAltChange?: (alt: string) => void;
  /** Label shown above the dropzone */
  label?: string;
}

const ACCEPTED = "image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/avif";

export function ImageUploader({
  value,
  onChange,
  altValue = "",
  onAltChange,
  label = "Featured Image",
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", file);

        const res = await fetch("/api/upload-image", {
          method: "POST",
          body: fd,
        });

        const data = (await res.json()) as UploadImageResponse & { error?: string };

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Upload failed");
        }

        onChange(data.url);
        toast.success("Image uploaded successfully!");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onChange]
  );

  // ── Drag & Drop handlers ───────────────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  // ── File input change ──────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
      // Reset so the same file can be re-selected if removed
      e.target.value = "";
    }
  };

  const handleRemove = () => {
    onChange("");
    onAltChange?.("");
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      {value ? (
        /* ── Preview ──────────────────────────────────────────────────────── */
        <div className="relative rounded-xl overflow-hidden border bg-muted">
          {/* Plain <img> — domain is dynamic (R2/custom), avoids next/image remotePatterns config */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={altValue || "Featured image preview"}
            className="aspect-video w-full object-cover"
          />

          {/* Overlay — Replace / Remove actions */}
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span className="ml-1.5">Replace</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleRemove}
              disabled={uploading}
            >
              <X className="h-4 w-4" />
              <span className="ml-1.5">Remove</span>
            </Button>
          </div>

          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          )}
        </div>
      ) : (
        /* ── Dropzone ─────────────────────────────────────────────────────── */
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          disabled={uploading}
          className={`
            w-full rounded-xl border-2 border-dashed p-8
            flex flex-col items-center justify-center gap-2
            text-sm text-muted-foreground transition-colors cursor-pointer
            hover:border-primary/50 hover:bg-muted/40
            focus:outline-none focus-visible:ring-2 focus-visible:ring-ring
            disabled:cursor-not-allowed disabled:opacity-60
            ${dragOver ? "border-primary bg-primary/5" : "border-border"}
          `}
        >
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span>Uploading…</span>
            </>
          ) : (
            <>
              <ImageIcon className="h-8 w-8 opacity-40" />
              <span className="font-medium">
                {dragOver ? "Drop to upload" : "Click or drag an image here"}
              </span>
              <span className="text-xs opacity-70">
                JPEG · PNG · GIF · WebP · SVG · AVIF — max 10 MB
              </span>
            </>
          )}
        </button>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Alt text field — always shown */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Image alt text</Label>
        <Input
          placeholder="Describe the image for accessibility…"
          value={altValue}
          onChange={(e) => onAltChange?.(e.target.value)}
        />
      </div>
    </div>
  );
}
