import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BOT_USERNAMES = ["sadhguru", "dilkiawaaz", "sochkasafar", "sheroshayari"];

async function main() {
  console.log("Looking up bot users...");
  const bots = await prisma.user.findMany({
    where: { username: { in: BOT_USERNAMES } },
    select: { id: true, username: true, name: true },
  });

  if (bots.length === 0) {
    console.log("No bot users found. Nothing to delete.");
    return;
  }

  const botIds = bots.map((b) => b.id);
  console.log(`Found ${bots.length} bot users:`);
  bots.forEach((b) => console.log(`  - @${b.username} (${b.name}) [id=${b.id}]`));

  console.log("\nDeleting bot data...");

  const deletedComments = await prisma.liveComment.deleteMany({ where: { userId: { in: botIds } } });
  console.log(`  Deleted ${deletedComments.count} live comments`);

  const deletedViewers = await prisma.liveViewer.deleteMany({ where: { userId: { in: botIds } } });
  console.log(`  Deleted ${deletedViewers.count} live viewer records`);

  const deletedLikes = await prisma.like.deleteMany({ where: { userId: { in: botIds } } });
  console.log(`  Deleted ${deletedLikes.count} likes`);

  const deletedCommentsPost = await prisma.comment.deleteMany({ where: { userId: { in: botIds } } });
  console.log(`  Deleted ${deletedCommentsPost.count} post comments`);

  const deletedStories = await prisma.story.deleteMany({ where: { authorId: { in: botIds } } });
  console.log(`  Deleted ${deletedStories.count} stories`);

  const deletedPosts = await prisma.post.deleteMany({ where: { authorId: { in: botIds } } });
  console.log(`  Deleted ${deletedPosts.count} posts`);

  const deletedFollowsAsFollower = await prisma.follow.deleteMany({ where: { followerId: { in: botIds } } });
  console.log(`  Deleted ${deletedFollowsAsFollower.count} follows (as follower)`);

  const deletedFollowsAsFollowing = await prisma.follow.deleteMany({ where: { followingId: { in: botIds } } });
  console.log(`  Deleted ${deletedFollowsAsFollowing.count} follows (as following)`);

  const deletedConversations = await prisma.conversationParticipant.deleteMany({ where: { userId: { in: botIds } } });
  console.log(`  Deleted ${deletedConversations.count} conversation participants`);

  const deletedMessages = await prisma.message.deleteMany({ where: { senderId: { in: botIds } } });
  console.log(`  Deleted ${deletedMessages.count} messages`);

  const deletedNotifications = await prisma.notification.deleteMany({ where: { userId: { in: botIds } } });
  console.log(`  Deleted ${deletedNotifications.count} notifications`);

  const deletedUsers = await prisma.user.deleteMany({ where: { id: { in: botIds } } });
  console.log(`  Deleted ${deletedUsers.count} bot users`);

  console.log("\nDone. All bot users and their data have been removed.");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
