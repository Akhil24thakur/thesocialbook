const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.updateMany({where: {phone: '8888888888'}, data: {isVerified: true}})
  .then(r => { console.log('Updated:', r.count); return p.user.findMany({where: {phone: '8888888888'}, select: {id: true, name: true, phone: true, isVerified: true}}); })
  .then(users => console.log('Verified users:', JSON.stringify(users, null, 2)))
  .catch(e => console.error('ERR', e.message))
  .finally(() => p.$disconnect());