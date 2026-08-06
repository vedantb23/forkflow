import "../src/config/env";
import { sendMail } from "../src/config/mailer";

const TO = "vedant2k5@gmail.com";
const SUBJECT = "🍽️ ForkFlow Email Test — It Works!";
const BODY = `
Hey Vedant!

If you're reading this, ForkFlow's email system is working perfectly.

This email was sent by the ForkFlow backend using Nodemailer + your configured SMTP provider.

— ForkFlow Bot 🤖
`.trim();

async function main() {
  console.log(`📧 Sending test email to ${TO}...`);
  try {
    await sendMail(TO, SUBJECT, BODY);
    console.log("✅ Email sent successfully! Check your inbox (and spam folder).");
  } catch (err) {
    console.error("❌ Email failed to send:", err);
    process.exit(1);
  }
  process.exit(0);
}

main();
