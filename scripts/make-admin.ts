import 'dotenv/config';
import { prisma } from '@/db/client';

const email = process.argv[2] ?? process.env.ADMIN_EMAIL;

if (!email) {
  // eslint-disable-next-line no-console
  console.error('Usage: tsx scripts/make-admin.ts <email>');
  process.exit(1);
}

prisma.user
  .update({ where: { email }, data: { role: 'ADMIN' } })
  .then((user) => {
    // eslint-disable-next-line no-console
    console.log(`${user.email} is now an admin.`);
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Could not promote user:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
