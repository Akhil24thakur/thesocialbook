const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.updateMany({where: {email: 'as7262287@gmail.com'}, data: {isVerified: true}})
  .then(r => { console.log('Updated:', r.count); return p.user.findMany({where: {email: 'as7262287@gmail.com'}, select: {id: true, name: true, email: true, isVerified: true}}); })
  .then(users => console.log('Verified users:', JSON.stringify(users, null, 2)))
  .catch(e => console.error('ERR', e.message))
  .finally(() => p.$disconnect());