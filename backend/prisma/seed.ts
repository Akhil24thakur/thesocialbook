import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const samplePosts = [
  { content: "Namaste! Just launched TheSocialBook - a social network made in India, for India.", author: 1 },
  { content: "Mumbai rains today. Traffic was crazy but the chai at the corner stall made it all worth it.", author: 2 },
  { content: "Anyone else watching the cricket match tonight? India looking strong!", author: 3 },
  { content: "Tip: The best filter coffee in Bengaluru is at that small shop on MG Road. Fight me.", author: 2 },
  { content: "Happy to announce our startup is hiring! DM me if you are a React Native developer.", author: 3 },
];

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const users = [
    { name: "Aarav Sharma", username: "aarav_sharma", phone: "9876500001", email: "aarav@thesocialbook.dev", bio: "Building things. Bengaluru." },
    { name: "Priya Patel", username: "priya_patel", phone: "9876500002", email: "priya@thesocialbook.dev", bio: "Chai lover | Ahmedabad" },
    { name: "Rohan Verma", username: "rohan_verma", phone: "9876500003", email: "rohan@thesocialbook.dev", bio: "Startup founder. Mumbai." },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { phone: u.phone },
      update: { username: u.username, email: u.email },
      create: { ...u, passwordHash },
    });
  }

  const all = await prisma.user.findMany();
  const byPhone = new Map(all.map((u) => [u.phone, u.id]));

  for (const p of samplePosts) {
    const authorId = byPhone.get(`987650000${p.author}`);
    await prisma.post.create({ data: { content: p.content, authorId: authorId! } });
  }

  const posts = await prisma.post.findMany();
  const [p1, p2] = posts;
  const [u1, u2, u3] = all;
  if (p1 && p2 && u2 && u3) {
    await prisma.like.upsert({ where: { userId_postId: { userId: u2.id, postId: p1.id } }, update: {}, create: { userId: u2.id, postId: p1.id } });
    await prisma.like.upsert({ where: { userId_postId: { userId: u3.id, postId: p1.id } }, update: {}, create: { userId: u3.id, postId: p1.id } });
    await prisma.like.upsert({ where: { userId_postId: { userId: u1.id, postId: p2.id } }, update: {}, create: { userId: u1.id, postId: p2.id } });
    await prisma.comment.create({ data: { postId: p1.id, authorId: u2.id, content: "Great initiative! Jai Hind" } });
  }

  console.log("Seed complete. Demo logins:");
  for (const u of users) console.log(`  ${u.name} -> phone: ${u.phone} / password: password123`);
}

main().finally(() => prisma.$disconnect());