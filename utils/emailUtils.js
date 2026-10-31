/**
 * Email utilities for partner API
 * Reuses SMTP configuration from .env (EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS)
 */
import nodemailer from "nodemailer";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";
import logger from "./logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.zoho.in",
    port: parseInt(process.env.EMAIL_PORT || "465", 10),
    secure: process.env.EMAIL_SECURE !== "false", // true for port 465
    auth: {
      user: process.env.EMAIL_USER || "info@tothehr.com",
      pass: process.env.EMAIL_PASS || "Psychoman@123",
    },
    connectionTimeout: 10000,
    socketTimeout: 10000,
  });
};

/**
 * Send OTP email to user
 * @param {string} to - Recipient email
 * @param {string} otp - OTP code
 * @param {string} [purpose='login'] - Purpose: 'login' | 'password_reset'
 * @returns {Promise<object>}
 */
export const sendOtpEmail = async (to, otp, purpose = "login") => {
  const subject =
    purpose === "password_reset"
      ? "VillagKart Partner - Password Reset OTP"
      : purpose === "security_verification"
      ? "VillagKart Partner - Security Verification OTP"
      : "VillagKart Partner - Login OTP";

  const templatePath = path.join(__dirname, "..", "templates", "otp.ejs");
  const htmlContent = await ejs.renderFile(templatePath, { otp, purpose });

  const from =
    process.env.EMAIL_SENDER ||
    `"VillagKart Partner" <${process.env.EMAIL_USER || "noreply@villagkart.com"}>`;

      const info = await getTransporter().sendMail({
    from,
    to,
    subject,
    html: htmlContent,
  });

  logger.info(`OTP email sent to ${to}`, { purpose });
  return info;
};

/**
 * Generic send email with template (for future extensions)
 */
export const sendEmail = async (to, subject, templateName, data = {}) => {
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      const templatePath = path.join(
        __dirname,
        "..",
        "templates",
        `${templateName}.ejs`,
      );
      const htmlContent = await ejs.renderFile(templatePath, data);

      const senderUser = process.env.EMAIL_USER || "info@tothehr.com";
      const from = process.env.EMAIL_SENDER || `"VillagKart Partner" <${senderUser}>`;

          const info = await getTransporter().sendMail({
        from,
        to,
        subject,
        html: htmlContent,
      });

      logger.info(`Email sent to ${to}`, { subject });
      return info;
    } catch (error) {
      attempts++;
      logger.error(`Attempt ${attempts} to send email to ${to} failed`, {
        error: error.message,
      });
      if (attempts >= maxAttempts) {
        throw new Error(`Failed to send email after ${maxAttempts} attempts`);
      }
    }
  }
};

/**
 * Send Welcome & Credentials Email to Newly Onboarded Partner
 * @param {string} to - Recipient email
 * @param {object} partnerData - { name, email, password }
 * @returns {Promise<object>}
 */
export const sendPartnerWelcomeEmail = async (to, { name, email, password }) => {
  const portalUrl = process.env.PARTNER_FRONTEND_URL || "https://partner.villagkart.com";
  const subject = "Welcome to VillagKart — Your Partner Account Credentials";
  
  return sendEmail(to, subject, "partnerCredentials", {
    name,
    email,
    password,
    portalUrl,
  });
};

