import fs from 'fs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const privateKey = fs.readFileSync(path.resolve(__dirname, 'keys', 'private.key'), 'utf8');

const payload = {
  id: '36b6ef8b-9fc5-445e-93a8-4582952181ae',
  phone: '9030348585',
  email: 'phirangipuram@villagkart.com',
  name: 'Phirangipuram Warehouse',
  role: 'PARTNER',
  permissions: ['*'],
  roles: ['PARTNER']
};

const token = jwt.sign(payload, privateKey, {
  algorithm: 'RS256',
  expiresIn: '365d',
  issuer: 'villagkart-identity-service',
  audience: 'villagkart'
});

console.log('GENERATED_TOKEN:', token);

