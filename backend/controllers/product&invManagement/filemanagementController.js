import { uploadFilesToS3, getSecureFileUrl } from "../../utils/aws3.js";
import logger from "../../utils/logger.js";


const uploadFile = async (req, res) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      logger.warn('File upload failed - No files uploaded');
      return res.status(400).send({ status: false, response: 'No files were uploaded.' });
    }

    if (!req.files.file) {
      logger.warn('File upload failed - No file named "file"');
      return res.status(400).send({ status: false, response: 'No file named "file" was uploaded.' });
    }

    //const healthCenterData = await HealthCenter.findById(req.user.healthCenterId);
    const file = req.files.file;
    const fileName = file.name + '-' + Date.now();

    const folderName = 'uploads';

    const fileUrl = await uploadFilesToS3(file, folderName, fileName);

    logger.info('File uploaded successfully', { fileUrl });
    res.status(200).send({ status: true, response: 'File uploaded successfully', data: fileUrl });
  } catch (error) {
    logger.error('Error in uploadFile', { error });
    res.status(500).send({
      status: false,
      response: 'Internal Server Error',
      error: error.message
    });
  }
};


//Get File from S3
const getPresignedFile = async (req, res) => {
  try {
    const key = req.body.key;
    if (!key) {
      logger.warn('Presigned URL generation failed - No key provided');
      return res.status(400).send({ status: false, response: 'Key is required to generate presigned URL.' });
    }
    const getUrl = await getSecureFileUrl(key);

    logger.info('Presigned URL generated successfully', { key, getUrl });
    res.status(200).send({ status: true, response: 'Presigned URL generated successfully', data: getUrl });
  } catch (error) {
    logger.error('Error generating presigned URL', { error });
    res.status(500).send({
      status: false,
      response: 'Internal Server Error',
      error: error.message
    });
  }
};

export { uploadFile, getPresignedFile };