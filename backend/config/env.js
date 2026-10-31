// config/env.js
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

const requiredEnvVars = [
  // 'DB_URI', // Database URI
  // 'PORT', // Port number
  // 'NODE_ENV', // Node environment
  // 'EMAIL_HOST', // Email host for sending emails
  // 'EMAIL_PORT', // Email port for sending emails
  // 'EMAIL_USER', // Email user for sending emails
  // 'EMAIL_PASS', // Email password for sending emails
  // 'AWS_ACCESS_KEY_ID', // AWS access key ID
  // 'AWS_SECRET_ACCESS_KEY', // AWS secret access key
  // 'AWS_REGION', // AWS region
  // 'S3_BUCKET_NAME', // S3 bucket name
];

requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1); // Exit the process if a variable is missing
  }
});

export default process.env; // Export all environment variables