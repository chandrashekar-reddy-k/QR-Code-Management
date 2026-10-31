import { prisma } from '../config/prismaClient.js';
import { generateOTP } from '../utils/otpUtils.js';
import logger from '../utils/logger.js';
import { errorResponse, successResponse } from '../utils/responseHelper.js';
import { generateUserToken } from '../utils/jwtUtils.js';
import pkg from '@prisma/client';
const { UserRole } = pkg;
// jkhfjksd
// jkjkgjh
// lkjhklhk
const sendOtp = async (req, res) => {
    try {
        const { countryCode, phone, deviceToken, role } = req.body;
        logger.info(`Incoming OTP request: ${phone}`, { role });

        if (!countryCode || !phone) {
            logger.warn(`countryCode or phone missing`);
            return errorResponse(res, 400, 'countryCode and Mobile No. is required');
        }
// jalshlk
        const user = await prisma.user.findFirst({
            where: { phone: phone }
        })
        if (!user) {
            logger.warn(`Mobile No. ${phone} does not exist`);
            return errorResponse(res, 400, 'Mobile No. does not exist');
        }

        // If role is specified, validate user has that role
        if (role) {
            if (user.role !== role) {
                logger.warn(`Role mismatch for user ${user.id}`, {
                    requestedRole: role,
                    actualRole: user.role
                });
                return errorResponse(res, 403, `User does not have ${role} role`);
            }
        }

        if (deviceToken) {
            await prisma.deviceToken.upsert({
                where: { deviceToken },
                update: { updatedAt: new Date() },
                create: { deviceToken, userId: user.id },
            });
            logger.info(`Device token stored/updated for user ${user.id}`);
        }

        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes

        const userOtp = await prisma.session.create({
            data: {
                userId: user.id,
                otp: otp,
                expiresAt,
            }
        })
        return successResponse(res, 201, { userOtp }, 'OTP sent successfully');
    } catch (error) {
        logger.error(`Error in sendOtp`, { message: error.message, stack: error.stack });
        return errorResponse(res, 500, 'Internal Server Error', error.message);
    }
};

const verifyOtp = async (req, res) => {
    try {
        const { countryCode, phone, otp, role } = req.body;
        if (!countryCode || !phone || !otp) {
            return errorResponse(res, 400, 'countryCode, Mobile No. and OTP are required');
        }
        const user = await prisma.user.findUnique({
            where: { phone: phone },
            include: {
                store: {
                    select: {
                        id: true,
                        name: true,
                        status: true
                    }
                },
                supplier: {
                    select: {
                        id: true,
                        companyName: true
                    }
                }
            }
        })
        if (!user) {
            logger.warn(`Mobile No. ${phone} does not exist`);
            return errorResponse(res, 400, 'Mobile No. does not exist');
        }

        // If role is specified, validate user has that role
        if (role) {
            if (user.role !== role) {
                logger.warn(`Role mismatch for user ${user.id}`, {
                    requestedRole: role,
                    actualRole: user.role
                });
                return errorResponse(res, 403, `User does not have ${role} role`);
            }
        }

        // find valid session
        const session = await prisma.session.findFirst({
            where: {
                userId: user.id,
                otp: otp,
                expiresAt: { gt: new Date() }, // must not be expired
            },
            orderBy: { createdAt: "desc" }, // latest OTP
        });
        if (!session) {
            return errorResponse(res, 400, 'Invalid or expired otp');
        }

        const accessToken = generateUserToken(user);
        await prisma.session.update({
            where: { id: session.id },
            data: { otp: null, token: accessToken } // Invalidate OTP after successful verification
        });

        // Include store and supplier info for PARTNER role
        const responseData = { accessToken };
        if (user.role === UserRole.PARTNER) {
            responseData.user = {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                store: user.store,
                supplier: user.supplier
            };
        }

        return successResponse(res, 200, responseData, 'OTP verified successfully');
    } catch (error) {
        logger.error(`Error in verifyOtp`, { message: error.message, stack: error.stack });
        return errorResponse(res, 500, 'Internal Server Error', error.message);
    }
}

const resendOtp = async (req, res) => {
    try {
        const { countryCode, phone } = req.body;
        logger.info(`Incoming OTP request: ${phone}`);

        if (!phone) {
            logger.warn(`countryCode or phone missing`);
            return errorResponse(res, 400, 'countryCode and Mobile No. is required');
        }

        const user = await prisma.user.findUnique({
            where: { phone: phone }
        })
        if (!user) {
            logger.warn(`Mobile No. ${phone} does not exist`);
            return errorResponse(res, 400, 'Mobile No. does not exist');
        }

        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes

        // check if session already exists for this user
        const existingSession = await prisma.session.findFirst({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
        });

        let userOtp;
        if (existingSession) {
            // update existing session with new OTP
            userOtp = await prisma.session.update({
                where: { id: existingSession.id },
                data: { otp, expiresAt, token: null }, // reset token if any
            });
        } else {
            // if no session exists, create one
            userOtp = await prisma.session.create({
                data: {
                    userId: user.id,
                    otp: otp,
                    expiresAt,
                }
            })
        }
        return successResponse(res, 201, { userOtp }, 'OTP resent successfully');
    } catch (error) {
        logger.error(`Error in sendOtp`, { message: error.message, stack: error.stack });
        return errorResponse(res, 500, 'Internal Server Error', error.message);
    }
};

const logout = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return errorResponse(res, 400, 'Authorization token is required');
        }

        const accessToken = authHeader.split(" ")[1]; // Extract the token
        const session = await prisma.session.findFirst({
            where: { token: accessToken },
        });

        if (!session) {
            logger.warn(`Invalid or expired token`);
            return errorResponse(res, 401, 'Invalid or expired token');
        }

        // Invalidate token (logout)
        await prisma.session.update({
            where: { id: session.id },
            data: { token: null }, // clearing token = logged out
        });

        return successResponse(res, 200, {}, 'Logged out successfully');
    } catch (error) {
        logger.error(`Error in logout`, { message: error.message, stack: error.stack });
        return errorResponse(res, 500, 'Internal Server Error', error.message);
    }
};

export {
    sendOtp,
    verifyOtp,
    resendOtp,
    logout
}