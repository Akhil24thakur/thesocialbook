import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// Keep Supabase for rollback: STORAGE_PROVIDER=supabase → use Supabase, otherwise R2.
function getSupabaseBucket(): string {
  return process.env.SUPABASE_BUCKET ?? "uploads";
}

// R2 env validation — only required when provider is r2
function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) {
    throw new Error(
      "R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL"
    );
  }
  return { accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl: publicBaseUrl.replace(/\/+$/, "") };
}

let s3Client: S3Client | null = null;
function getS3Client(): S3Client {
  const { accountId, accessKeyId, secretAccessKey } = getR2Config();
  if (!s3Client) {
    const endpoint = process.env.R2_ENDPOINT ?? `https://${accountId}.r2.cloudflarestorage.com`;
    s3Client = new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return s3Client;
}

function supabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

export function isSupabaseProvider(): boolean {
  return (process.env.STORAGE_PROVIDER ?? "r2").toLowerCase() === "supabase";
}

export function isR2Url(url: string): boolean {
  if (!url) return false;
  try {
    const r2Base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, "");
    if (r2Base && url.startsWith(r2Base)) return true;
    // Fallback checks for raw R2 endpoints
    if (url.includes(".r2.cloudflarestorage.com") || url.includes(".r2.dev")) return true;
    return false;
  } catch {
    return false;
  }
}

export function getPublicUrl(key: string): string {
  if (isSupabaseProvider()) {
    const { data } = supabaseClient().storage.from(getSupabaseBucket()).getPublicUrl(key);
    return data.publicUrl;
  }
  const { publicBaseUrl } = getR2Config();
  const cleanKey = key.replace(/^\/+/, "");
  return `${publicBaseUrl}/${cleanKey}`;
}

function extractR2Key(url: string): string | null {
  if (!isR2Url(url)) return null;
  try {
    const r2Base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, "");
    if (r2Base && url.startsWith(r2Base)) {
      return url.slice(r2Base.length).replace(/^\/+/, "");
    }
    // For raw r2.dev / cloudflarestorage urls, extract pathname
    const u = new URL(url);
    return u.pathname.replace(/^\/+/, "");
  } catch {
    return null;
  }
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<string> {
  if (isSupabaseProvider()) {
    const bucket = getSupabaseBucket();
    const { error } = await supabaseClient().storage.from(bucket).upload(key, body, {
      contentType,
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabaseClient().storage.from(bucket).getPublicUrl(key);
    return data.publicUrl;
  }
  const { bucket } = getR2Config();
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  return getPublicUrl(key);
}

export async function deleteObject(urlOrKey: string): Promise<void> {
  if (!urlOrKey) return;
  // Never attempt to delete Supabase objects via R2
  if (!isR2Url(urlOrKey)) {
    // If it's a Supabase URL or not an R2 URL, do nothing (no-op for rollback safety)
    // If caller passed a raw key that looks like an R2 key but url is supabase, isR2Url will be false.
    // To support deletion by raw key when provider is r2, check if it looks like a key (no http)
    if (urlOrKey.startsWith("http")) return;
    // If it's a raw key and provider is supabase, also no-op — only delete R2 keys.
    if (isSupabaseProvider()) return;
  }
  const key = urlOrKey.startsWith("http") ? extractR2Key(urlOrKey) : urlOrKey;
  if (!key) return;
  const { bucket } = getR2Config();
  try {
    await getS3Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (e: any) {
    // Log but don't throw — post/story deletion should succeed even if storage delete fails
    console.error(`R2 delete failed for key ${key}:`, e.message ?? e);
  }
}
