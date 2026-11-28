import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST || "smtp.gmail.com";
const port = Number(process.env.SMTP_PORT) || 465;
const secure = process.env.SMTP_SECURE === "true" || port === 465;
const user = process.env.EMAIL_USER;
const pass = process.env.EMAIL_PASS;

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass },
});

export default transporter;
