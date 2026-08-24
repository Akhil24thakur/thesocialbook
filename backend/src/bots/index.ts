import { startPostSchedulers } from "./postScheduler.js";
import { startFollowScheduler } from "./followScheduler.js";

export function startBots() {
  console.log("\n=== Starting SocialBook Bots ===\n");
  startPostSchedulers();
  startFollowScheduler();
  console.log("=== Bots Active ===\n");
}
