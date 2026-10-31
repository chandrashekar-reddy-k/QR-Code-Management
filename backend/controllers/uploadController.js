import logger from '../utils/logger.js';
import {prisma} from '../config/prismaClient.js';
import { errorResponse, successResponse } from '../utils/responseHelper.js';
import { uploadFilesToS3, getSecureFileUrl } from "../utils/aws3.js";

/**
 * Upload user photo to S3
 */
const uploadFile = async (req, res) => {
    try {
        // logger.info('file:', req.files.photo)
        if (!req.files || !req.files.photo) {
            logger.warn(`photo missing`);
            return errorResponse(res, 400, 'No photo uploaded');        
        }

        const userId = req.user?.id; // assuming you set user in req.user after auth
        if (!userId) {
            return errorResponse(res, 400, 'User ID missing');
        }

        // req.files.photo can be a single file or multiple depending on frontend
        const results = await uploadFilesToS3(req.files.photo, "user-photos");

        // results.key should be like "user-photos/abc.png"
        const fileKey = results[0].key;

        // save in DB
        await prisma.user.update({
            where: { id: userId },
            data: { avatar: fileKey },
        });

        return successResponse(res, 200, { results }, 'File uploaded successfully');
    
    } catch (error) {
        logger.error(`Error in uploadFile`, { message: error.message, stack: error.stack });
        return errorResponse(res, 500, 'Internal Server Error', error.message);
    }
};

const getFile = async (req, res) => {
    try {
        // const { key } = req.params;   // file key will be passed in URL param
        // if (!key) {
        //     return errorResponse(res, 400, 'File key is required');        
        // }

        const userId = req.user?.id; // or req.params.userId depending on your flow
        if (!userId) {
            return errorResponse(res, 400, 'User ID missing');
        }

        // get avatar key from DB
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { avatar: true },
        });

        if (!user || !user.avatar) {
            return errorResponse(res, 404, 'No avatar found for this user');
        }

        const key = user.avatar

        // Expiration can also be customized via query param (?expiresIn=600)
        const expiresIn = req.query.expiresIn ? parseInt(req.query.expiresIn) : 3600;

        const url = await getSecureFileUrl(key, expiresIn);

        return successResponse(res, 200, { key, url }, 'File get successfully');
    } catch (error) {
        logger.error(`generating file URL`, { message: error.message, stack: error.stack });
        return errorResponse(res, 500, 'Internal Server Error', error.message);
    }
};

export { uploadFile, getFile }; 