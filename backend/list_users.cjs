const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.findMany({ select: { id: true, name: true, phone: true, email: true, isVerified: true } })
  .then(users => console.log(JSON.stringify(users, null, 2)))
  .catch(e => console.error('ERR', e.message))
  .finally(() => p.$disconnect());