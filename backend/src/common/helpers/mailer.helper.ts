import * as nodemailer from 'nodemailer';

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  if (!host) {
    // Console fallback for development
    transporter = nodemailer.createTransport({ jsonTransport: true });
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

export async function sendMail(options: MailOptions): Promise<void> {
  const from = process.env.MAIL_FROM || 'no-reply@blog.local';
  const t = getTransporter();

  if (!process.env.SMTP_HOST) {
    console.log('[MAIL CONSOLE FALLBACK]');
    console.log(`  TO: ${options.to}`);
    console.log(`  SUBJECT: ${options.subject}`);
    console.log(`  BODY: ${options.html}`);
    return;
  }

  await t.sendMail({ from, ...options });
}
