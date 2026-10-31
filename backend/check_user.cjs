require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const candidates = [
  '123456',
  '12345678',
  'password',
  'Password@123',
  'Admin@123',
  'Partner@123',
  'Villagkart@123',
  'admin123',
  '1234',
  'Test@123',
  'test1234',
  'Qwerty@123',
  'password123',
  'villagkart',
  'Phiran@123'
];

async function check() {
  try {
    const users = await prisma.user.findMany({
      where: {
        password: { not: null }
      },
      select: { id: true, email: true, phone: true, role: true, password: true }
    });
    console.log(`Checking ${users.length} users with passwords...`);

    for (const u of users) {
      for (const pwd of candidates) {
        try {
          if (await bcrypt.compare(pwd, u.password)) {
            console.log(`MATCH FOUND! Role: ${u.role} | Email: ${u.email} | Phone: ${u.phone} | Password: ${pwd}`);
          }
        } catch {}
      }
    }
    console.log('Search finished.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
