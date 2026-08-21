import { Router } from "express";
import multer from "multer";
import crypto from "node:crypto";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { putObject, isSupabaseProvider } from "../lib/storage.js";

const router = Router();

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_FOLDERS = new Set(["avatars", "posts", "stories", "uploads"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPG, PNG, WEBP or GIF images are allowed"));
  },
});

router.post("/", requireAuth, upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image file received" });
  }
  try {
    const ext = (req.file.originalname.match(/\.([a-z0-9]+)$/i)?.[1] ?? "jpg").toLowerCase();
    const filename = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
    const userId = (req as AuthedRequest).userId;

    // Organized R2 keys: avatars/{userId}/{filename} etc. Keep flat for Supabase rollback.
    // Mobile does not yet send folder param, so default to "uploads" — future mobile can send ?folder=avatars|posts|stories
    let key: string;
    if (isSupabaseProvider()) {
      key = filename;
    } else {
      const rawFolder =
        (req.query.folder as string) ||
        (req.query.type as string) ||
        (req.body?.folder as string) ||
        "";
      const folder = ALLOWED_FOLDERS.has(rawFolder) ? rawFolder : "uploads";
      key = `${folder}/${userId}/${filename}`;
    }

    const url = await putObject(key, req.file.buffer, req.file.mimetype);
    // Keep response compatible: frontend uses data.url only, but also return filename/key
    return res.status(201).json({ url, filename: key, key });
  } catch (e: any) {
    console.error("upload failed:", e.message ?? e);
    if (e?.cause?.message) console.error("upload cause:", e.cause.message);
    const provider = isSupabaseProvider() ? "supabase" : "r2";
    let hint = "";
    if (provider === "supabase") {
      const url = process.env.SUPABASE_URL ?? "(missing)";
      const hasKey = !!(process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_KEY);
      hint = url === "(missing)" ? " SUPABASE_URL is not set on this server." : ` SUPABASE_URL=${url} keySet=${hasKey}`;
    } else {
      const hasR2 =
        !!process.env.R2_ACCOUNT_ID &&
        !!process.env.R2_ACCESS_KEY_ID &&
        !!process.env.R2_SECRET_ACCESS_KEY &&
        !!process.env.R2_BUCKET &&
        !!process.env.R2_PUBLIC_BASE_URL;
      hint = hasR2
        ? ` R2_BUCKET=${process.env.R2_BUCKET}`
        : " R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL";
    }
    return res.status(500).json({ error: "Upload failed: " + (e.message ?? "unknown error") + hint });
  }
});

router.use((err: any, _req: any, res: any, _next: any) => {
  const message =
    err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
      ? "Image is too large (max 5MB)"
      : err.message ?? "Upload failed";
  return res.status(400).json({ error: message });
});

export default router;
