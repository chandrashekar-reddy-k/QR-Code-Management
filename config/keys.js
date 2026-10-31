export default {
  aws3: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'ap-south-1',
    bucketName: process.env.S3_BUCKET_NAME || 'devvillagkart-media',
    hrmsBucketName: process.env.HRMS_S3_BUCKET_NAME || 'villagkart-hrms',
  },
};
