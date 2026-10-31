import fs from 'fs';
import xlsx from 'xlsx';
import crypto from 'crypto';
import logger from '../utils/logger.js';
import { prisma } from '../config/prismaClient.js';
import { sendOtpEmail } from '../utils/emailUtils.js';
import { sendOTP, normalizeMsg91Mobile } from '../services/sms.service.js';
import { successResponse, errorResponse } from '../utils/responseHelper.js';

// Production consumer API base URL — used for OTP send/verify (has working MSG91)
// Strip /api/v1 suffix — we append it manually per endpoint below so the base stays clean
const CONSUMER_API_URL = (process.env.CONSUMER_API_BASE_URL || 'https://apierpconsumer.villagkart.com')
  .replace(/\/api\/v1\/?$/, '');

/**
 * POST /api/v1/partner/auth/security/send-otp
 * Request: { name, mobile, email, role }
 */
export async function sendSecurityOtp(req, res) {
  try {
    const { name, mobile, email, role } = req.body;

    if (!name || !mobile) {
      return errorResponse(res, 400, 'Name and Mobile number are required');
    }

    // Normalize mobile: strip non-digits, keep 10 digits
    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
    logger.info(`[Security OTP] Sending via consumer API for: ${cleanMobile}`);

    // Proxy OTP send through production consumer API (has working MSG91 setup)
    try {
      const consumerRes = await fetch(`${CONSUMER_API_URL}/api/v1/user/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanMobile, countryCode: '+91' })
      });
      const consumerData = await consumerRes.json();
      logger.info(`[Security OTP] Consumer API response: ${JSON.stringify(consumerData)}`);

      if (!consumerRes.ok) {
        logger.error('[Security OTP] Consumer API error:', consumerData);
        return errorResponse(res, consumerRes.status, consumerData?.message || 'Failed to send OTP');
      }

      console.log(`✅ [Security OTP] OTP dispatched via consumer API for ${cleanMobile}`);
    } catch (proxyErr) {
      logger.error('[Security OTP] Consumer API proxy failed:', proxyErr.message);
      return errorResponse(res, 503, 'OTP service temporarily unavailable');
    }

    // Send OTP via Email as additional fallback
    if (email) {
      try {
        // Generate local OTP just for email (consumer API manages SMS OTP session)
        const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();
        await sendOtpEmail(email, emailOtp, 'security_verification');
        logger.info(`[Security OTP] Email OTP dispatched to: ${email}`);
      } catch (emailErr) {
        logger.warn('[Security OTP] Email dispatch failed:', emailErr.message);
      }
    }

    return successResponse(res, 200, { sent: true, message: 'OTP sent successfully' });
  } catch (error) {
    logger.error('[Security OTP] Failed to send OTP:', error);
    return errorResponse(res, 500, 'Internal server error while sending OTP');
  }
}

/**
 * POST /api/v1/partner/auth/security/verify-otp
 * Request: { name, mobile, email, role, otp }
 */
export async function verifySecurityOtp(req, res) {
  try {
    const { name, mobile, email, role, otp } = req.body;

    if (!mobile || !otp) {
      return errorResponse(res, 400, 'Mobile number and OTP are required');
    }

    // Normalize mobile: strip non-digits, keep 10 digits
    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);

    // Verify OTP via production consumer API (manages the OTP session)
    try {
      const verifyRes = await fetch(`${CONSUMER_API_URL}/api/v1/user/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanMobile, otp, countryCode: '+91' })
      });
      const verifyData = await verifyRes.json();
      logger.info(`[Security OTP] Consumer verify response: ${JSON.stringify(verifyData)}`);

      if (!verifyRes.ok) {
        const errMsg = verifyData?.message || verifyData?.response || 'Invalid OTP code. Please try again.';
        return errorResponse(res, 400, errMsg);
      }

      logger.info(`[Security OTP] OTP verified successfully for: ${cleanMobile}`);
    } catch (proxyErr) {
      logger.error('[Security OTP] Consumer verify proxy failed:', proxyErr.message);
      return errorResponse(res, 503, 'OTP verification service temporarily unavailable');
    }

    // Get client IP address
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

    // Log the successful verification to Excel spreadsheet
    try {
      // Write to a server-safe path relative to the project root
      const { fileURLToPath: _ftu } = await import('url');
      const { dirname: _dn, resolve: _res } = await import('path');
      const _root = _res(_dn(_ftu(import.meta.url)), '..');
      const filePath = _res(_root, 'logs', 'security_verifications.xlsx');
      const newRow = {
        Name: name,
        Mobile: mobile,
        Email: email || 'N/A',
        Role: role || 'N/A',
        'IP Address': ipAddress,
        Timestamp: new Date().toLocaleString()
      };

      let workbook;
      let worksheet;
      let data = [];

      if (fs.existsSync(filePath)) {
        try {
          workbook = xlsx.readFile(filePath);
          worksheet = workbook.Sheets[workbook.SheetNames[0]];
          data = xlsx.utils.sheet_to_json(worksheet);
        } catch (readErr) {
          logger.warn('[Security Log] Could not read existing Excel workbook, creating new:', readErr.message);
          workbook = xlsx.utils.book_new();
        }
      } else {
        workbook = xlsx.utils.book_new();
      }

      data.push(newRow);
      worksheet = xlsx.utils.json_to_sheet(data);
      
      // Clear any existing sheets and replace with fresh data
      workbook.SheetNames = ['Verifications'];
      workbook.Sheets = { Verifications: worksheet };

      xlsx.writeFile(workbook, filePath);
      logger.info(`[Security Log] Verification saved to Excel for: ${email}`);
    } catch (excelErr) {
      logger.error('[Security Log] Failed to save verification to Excel:', excelErr);
    }

    // Log to PostgreSQL Database
    try {
      const logId = crypto.randomUUID();
      await prisma.$executeRawUnsafe(`
        INSERT INTO "SecurityVerificationLog" ("id", "name", "mobile", "email", "role", "ipAddress", "otpCode", "status")
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'VERIFIED')
      `, logId, name, mobile, email || null, role || 'USER', ipAddress, otp);
      logger.info(`[Security Log] Verification saved to DB for: ${email}`);
    } catch (dbErr) {
      logger.error('[Security Log] Failed to save verification to DB:', dbErr);
    }

    return successResponse(res, 200, { verified: true, message: 'Verification successful' });
  } catch (error) {
    logger.error('[Security OTP] Verification failed:', error);
    return errorResponse(res, 500, 'Internal server error during verification');
  }
}

/**
 * GET /api/v1/partner/auth/security/logs
 * Retrieve all verification logs.
 */
export async function getSecurityLogs(req, res) {
  try {
    const logs = await prisma.$queryRawUnsafe(`
      SELECT * FROM "SecurityVerificationLog" ORDER BY "createdAt" DESC
    `);
    return successResponse(res, 200, logs);
  } catch (error) {
    logger.error('[Security Log] Failed to fetch logs:', error);
    return errorResponse(res, 500, 'Internal server error while fetching logs');
  }
}
