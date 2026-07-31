// config/mailer.ts — the Nodemailer transport (how we actually send email).
//
// Uses Gmail SMTP directly. No third-party email services needed.
// Requires a Gmail App Password (not your regular password).
// Generate one at: https://myaccount.google.com/apppasswords
// We build the transport lazily and tolerate missing creds: if SMTP_* isn't set,
// sendMail throws a clear error the email worker can log, rather than crashing boot.

import nodemailer from "nodemailer";
import { env } from "./env";
import { logger } from "./logger";

// Build the transport once and reuse it (opening an SMTP connection per email is slow).
// If creds are missing we return null and let the worker warn instead of crashing.
function buildTransport() {
  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_USER || !env.SMTP_PASS) {
    logger.warn("SMTP_* not fully set — emails will be skipped (set Mailtrap creds in .env)");
    return null;
  }
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT),
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

// One shared transport instance for the process.
export const mailTransport = buildTransport();

// sendMail — a thin wrapper. Throws if the transport isn't configured so the
// email worker's job FAILS (and BullMQ can retry) rather than silently no-op'ing.
export async function sendMail(to: string, subject: string, text: string): Promise<void> {
  if (!mailTransport) {
    throw new Error("Mail transport not configured (SMTP_* missing)");
  }
  await mailTransport.sendMail({
    from: `"ForkFlow" <${env.SMTP_USER}>`, // sends from your own Gmail
    to,
    subject,
    text,
  });
}
