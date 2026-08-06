import nodemailer from "nodemailer";
import { env } from "./env";
import { logger } from "./logger";

function buildTransport() {
  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_USER || !env.SMTP_PASS) {
    logger.warn("SMTP_* not fully set — emails will be skipped (set Mailtrap creds in .env)");
    return null;
  }
  const port = Number(env.SMTP_PORT);
  const isGmail = env.SMTP_HOST.includes("gmail");

  return nodemailer.createTransport({
    ...(isGmail
      ? { service: "gmail" }
      : {
          host: env.SMTP_HOST,
          port,
          secure: port === 465,
        }),
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

export const mailTransport = buildTransport();

export async function sendMail(to: string, subject: string, text: string): Promise<void> {
  if (!mailTransport) {
    throw new Error("Mail transport not configured (SMTP_* missing)");
  }
  await mailTransport.sendMail({
    from: `"ForkFlow" <${env.SMTP_USER}>`,
    to,
    subject,
    text,
  });
}
