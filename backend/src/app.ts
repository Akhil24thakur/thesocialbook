import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import postRoutes from "./routes/posts.js";
import userRoutes from "./routes/users.js";
import storyRoutes from "./routes/stories.js";
import reelRoutes from "./routes/reels.js";
import notificationRoutes from "./routes/notifications.js";
import conversationRoutes from "./routes/conversations.js";
import crashRoutes from "./routes/crash.js";
import { meVersionHandler, mePublicKeyHandler } from "./routes/users.js";
import uploadRoutes from "./routes/upload.js";
import updateRoutes from "./routes/update.js";
import liveRoutes from "./routes/live.js";
import birthdayRoutes from "./routes/birthday.js";
import { requireAuth } from "./middleware/auth.js";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "thesocialbook-api", time: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/users", userRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/reels", reelRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/conversations", conversationRoutes);
app.put("/api/me/version", requireAuth, meVersionHandler);
app.put("/api/me/public-key", requireAuth, mePublicKeyHandler);
app.use("/api/crash-report", crashRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api", updateRoutes);
app.use("/api/live", liveRoutes);
app.use("/api/birthday", birthdayRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});