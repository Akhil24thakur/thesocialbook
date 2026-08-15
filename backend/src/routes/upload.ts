import { Router } from "express";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const router = Router();

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_SIZE = 5 * 1024 * 1024;
const BUCKET = process.env.SUPABASE_BUCKET ?? "uploads";

function supabase() {
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_KEY;
  if (!url || !key) {
    throw new Error("Supabase is not configured (SUPABASE_URL / SUPABASE_SERVICE_KEY)");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPG, PNG, WEBP or GIF images are allowed"));
  },
});

router.post("/", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image file received" });
  }
  try {
    const ext = (req.file.originalname.match(/\.([a-z0-9]+)$/i)?.[1] ?? "jpg").toLowerCase();
    const filename = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
    const { error } = await supabase().storage.from(BUCKET).upload(filename, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabase().storage.from(BUCKET).getPublicUrl(filename);
    return res.status(201).json({ url: data.publicUrl, filename });
  } catch (e: any) {
    console.error("upload failed:", e.message ?? e);
    return res.status(500).json({ error: "Upload failed: " + (e.message ?? "unknown error") });
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