import nodemailer from "nodemailer";

const user = process.env.EMAIL_USER;
const pass = process.env.EMAIL_PASS;
const host = "smtp.gmail.com";
const port =  465;
const secure = "false";


const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass },
});

export default transporter;
