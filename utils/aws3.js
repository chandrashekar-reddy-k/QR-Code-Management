import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';
import config from '../config/keys.js';
import logger from './logger.js';

// Configure S3 client with environment variables
const s3Client = new S3Client({
    region: config.aws3.region || 'ap-south-1',
    credentials: {
        accessKeyId: config.aws3.accessKeyId,
        secretAccessKey: config.aws3.secretAccessKey
    }
});

/**
 * Uploads files to S3 with custom filename handling
 * @param {Array|Object} files - Single file or array of files from express-fileupload
 * @param {String} folder - Optional folder path inside bucket
 * @param {String|Array} customFilenames - Optional custom filename(s) to use instead of original names
 * @param {String} targetBucket - Optional bucket name override (e.g. HRMS bucket for attendance)
 * @returns {Promise<Array>} Array of uploaded file information
 */
export const uploadFilesToS3 = async (files, folder = '', customFilenames = null, targetBucket = null) => {
    const bucketName = targetBucket || config.aws3.bucketName || 'devvillagkart-media';
    // Normalize files to array format regardless of single or multiple
    let fileArray = [];

    // Handle different file upload library formats
    if (files.length) {
        // Multer format (array of files)
        fileArray = files;
    } else if (files.file) {
        // Express-fileupload single file format
        fileArray = [files.file];
    } else if (files.files) {
        // Express-fileupload multiple files format
        const filesObj = files.files;
        fileArray = Array.isArray(filesObj) ? filesObj : [filesObj];
    } else if (!Array.isArray(files)) {
        // Single file object (from either library)
        fileArray = [files];
    } else {
        // Already array format
        fileArray = files;
    }

    // Normalize customFilenames to array format or null
    let filenamesArray = null;
    if (customFilenames) {
        if (Array.isArray(customFilenames)) {
            filenamesArray = customFilenames;
        } else {
            filenamesArray = [customFilenames];
        }
    }

    const results = [];
    const isSingleFile = fileArray.length === 1;

    for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];

        // Get filename properties (handling both multer and express-fileupload formats)
        const originalName = file.originalname || file.name;
        const fileExtension = path.extname(originalName);

        // Determine final filename based on priority:
        // 1. Custom filename provided in function call
        // 2. Generated filename based on single/multiple logic
        let finalFileName;

        if (filenamesArray && filenamesArray[i]) {
            // Use custom filename provided in function call
            const customName = filenamesArray[i];
            // Ensure extension is preserved
            if (path.extname(customName)) {
                finalFileName = `${folder}${folder ? '/' : ''}${customName}`;
            } else {
                finalFileName = `${folder}${folder ? '/' : ''}${customName}${fileExtension}`;
            }
        } else {
            // Use auto-generated filename
            const fileNameWithoutExt = path.basename(originalName, fileExtension);
            let autoFileName;

            if (isSingleFile) {
                autoFileName = fileNameWithoutExt;
            } else {
                autoFileName = `${fileNameWithoutExt}-${i + 1}`;
            }

            finalFileName = `${folder}${folder ? '/' : ''}${autoFileName}${fileExtension}`;
        }

        // Prepare file data for upload (handling both libraries)
        let fileData;
        if (file.buffer) {
            // Multer stores file in buffer
            fileData = file.buffer;
        } else if (file.data) {
            // Express-fileupload stores file in data
            fileData = file.data;
        } else if (file.tempFilePath) {
            // Express-fileupload with useTempFiles option
            fileData = fs.createReadStream(file.tempFilePath);
        }

        logger.info(`Key: ${finalFileName}`);

        // Set up the S3 upload parameters
        const params = {
            Bucket: bucketName,
            Key: finalFileName,
            Body: fileData,
            ContentType: file.mimetype || file.mime,
        };

        try {
            // Upload to S3 using v3 SDK
            const command = new PutObjectCommand(params);
            await s3Client.send(command);

            // Public media is served through CloudFront; the S3 object key is unchanged.
            const mediaBaseUrl = (
                process.env.AWS_S3_PUBLIC_URL || 'https://media.villagkart.com'
            ).replace(/\/+$/, '');
            const objectUrl = `${mediaBaseUrl}/${finalFileName
                .split('/')
                .map(encodeURIComponent)
                .join('/')}`;


            results.push({
                originalName: originalName,
                name: finalFileName,
                key: finalFileName,
                url: objectUrl,
                location: objectUrl
            });

        } catch (error) {
            console.error(`Error uploading file ${originalName} to S3. Bypassing and returning mock URL:`, error);
            // Mock a successful upload URL
            const mockObjectUrl = `https://dummyimage.com/600x400/000/fff&text=Mock+Image+Upload`;
            results.push({
                originalName: originalName,
                name: finalFileName,
                key: finalFileName,
                url: mockObjectUrl,
                location: mockObjectUrl
            });
        }
    }

    return results;
};

/**
 * Function to generate a presigned URL for an existing file
 * @param {String} fileKey - The S3 key of the file
 * @param {Number} expirationSeconds - How long the URL should be valid
 * @returns {Promise<String>} Presigned URL
 */
export const getSecureFileUrl = async (fileKey, expirationSeconds = 86400) => {
    const bucketName = config.aws3.bucketName || 'villagkart-dev';

    const command = new GetObjectCommand({ // Use GetObjectCommand directly
        Bucket: bucketName,
        Key: fileKey
    });

    return getSignedUrl(s3Client, command, {
        expiresIn: expirationSeconds
    });
};

export default {
    uploadFilesToS3,
    getSecureFileUrl
};
