const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const phones = ['6230639189', '8628086110', '8894249354', '8219847074'];
Promise.all(phones.map(phone => 
  p.user.updateMany({where: {phone: phone}, data: {isVerified: true}})
    .then(r => console.log('Updated', phone, ':', r.count))
))
.then(() => p.user.findMany({where: {phone: {in: phones}}, select: {id: true, name: true, phone: true, isVerified: true}}))
.then(users => console.log('Verified users:', JSON.stringify(users, null, 2)))
.catch(e => console.error('ERR', e.message))
.finally(() => p.$disconnect());