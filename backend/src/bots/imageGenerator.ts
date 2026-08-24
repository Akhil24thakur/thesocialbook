import { createCanvas } from "@napi-rs/canvas";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const OUTPUT_DIR = join(process.cwd(), "generated");

interface QuoteImageOptions {
  text: string;
  category: "sad" | "love" | "motivation" | "shayari";
  botName: string;
}

export interface StoryImageOptions {
  content: string;
  authorName: string;
  avatarUrl?: string | null;
}

const THEMES: Record<string, { gradient: string[]; textColor: string; accentColor: string }> = {
  sad: {
    gradient: ["#1a1a2e", "#16213e", "#0f3460"],
    textColor: "#e0e0e0",
    accentColor: "#7b68ee",
  },
  love: {
    gradient: ["#2d1b33", "#4a1942", "#6b2d5b"],
    textColor: "#f8e8ee",
    accentColor: "#ff6b9d",
  },
  motivation: {
    gradient: ["#1a0a00", "#2d1600", "#4a2500"],
    textColor: "#fff3e0",
    accentColor: "#ff9800",
  },
  shayari: {
    gradient: ["#0a1a1a", "#0d2626", "#103333"],
    textColor: "#e0f2f1",
    accentColor: "#26a69a",
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  sad: "\u2764\uFE0F Sad Quote",
  love: "\uD83D\uDC95 Love Quote",
  motivation: "\uD83D\uDCAA Motivation",
  shayari: "\uD83C\uDFA4 Shayari",
};

function wrapText(ctx: any, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export async function generateStoryImage(options: StoryImageOptions): Promise<string> {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const width = 1080;
  const height = 1920;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Background gradient - purple/blue theme
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, "#1a1a2e");
  grad.addColorStop(0.5, "#16213e");
  grad.addColorStop(1, "#0f3460");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Decorative circle
  ctx.beginPath();
  ctx.arc(width / 2, height / 2 - 100, 300, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(124, 58, 237, 0.08)";
  ctx.fill();

  // Avatar circle (if we have an avatar URL, just draw a circle)
  ctx.beginPath();
  ctx.arc(width / 2, 300, 60, 0, Math.PI * 2);
  ctx.fillStyle = "#7C3AED";
  ctx.fill();

  // Author initial
  ctx.font = "bold 48px sans-serif";
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.fillText(options.authorName.charAt(0).toUpperCase(), width / 2, 318);

  // Author name
  ctx.font = "bold 32px sans-serif";
  ctx.fillStyle = "#e0e0e0";
  ctx.fillText(options.authorName, width / 2, 400);

  // Divider line
  ctx.beginPath();
  ctx.moveTo(width / 2 - 80, 440);
  ctx.lineTo(width / 2 + 80, 440);
  ctx.strokeStyle = "#7C3AED";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Quote marks
  ctx.font = "bold 120px serif";
  ctx.fillStyle = "rgba(124, 58, 237, 0.3)";
  ctx.fillText("\u201C", width / 2 - 350, 600);
  ctx.fillText("\u201D", width / 2 + 320, 1400);

  // Post content text - strip hashtags and emojis for cleaner look
  const cleanText = options.content
    .replace(/#[\w]+/g, "")
    .replace(/[\u{1F600}-\u{1F64F}]/gu, "")
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, "")
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, "")
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, "")
    .replace(/[\u{2600}-\u{26FF}]/gu, "")
    .replace(/[\u{2700}-\u{27BF}]/gu, "")
    .trim()
    .replace(/\n\s*\n/g, "\n");

  ctx.font = "42px sans-serif";
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";

  const maxWidth = width - 240;
  const lines = wrapText(ctx, cleanText, maxWidth);
  const lineHeight = 64;
  const totalTextHeight = lines.length * lineHeight;
  const startY = (height - totalTextHeight) / 2;

  for (let i = 0; i < Math.min(lines.length, 18); i++) {
    ctx.fillText(lines[i], width / 2, startY + i * lineHeight);
  }

  // "Shared from SocialBook" at bottom
  ctx.font = "28px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText("Shared from SocialBook", width / 2, height - 120);

  // Save
  const buffer = canvas.toBuffer("image/png");
  const filename = `story_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`;
  const filepath = join(OUTPUT_DIR, filename);
  await writeFile(filepath, buffer);

  return filepath;
}

export async function generateQuoteImage(options: QuoteImageOptions): Promise<string> {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const width = 1080;
  const height = 1080;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const theme = THEMES[options.category];

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, theme.gradient[0]);
  grad.addColorStop(0.5, theme.gradient[1]);
  grad.addColorStop(1, theme.gradient[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Decorative circle
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, 350, 0, Math.PI * 2);
  ctx.fillStyle = `${theme.accentColor}15`;
  ctx.fill();

  // Category label
  ctx.font = "bold 32px sans-serif";
  ctx.fillStyle = theme.accentColor;
  ctx.textAlign = "center";
  ctx.fillText(CATEGORY_LABELS[options.category], width / 2, 180);

  // Divider line
  ctx.beginPath();
  ctx.moveTo(width / 2 - 100, 210);
  ctx.lineTo(width / 2 + 100, 210);
  ctx.strokeStyle = theme.accentColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Quote marks
  ctx.font = "bold 120px serif";
  ctx.fillStyle = `${theme.accentColor}40`;
  ctx.fillText("\u201C", width / 2 - 350, 380);
  ctx.fillText("\u201D", width / 2 + 320, 680);

  // Quote text
  ctx.font = "48px sans-serif";
  ctx.fillStyle = theme.textColor;
  ctx.textAlign = "center";

  const maxWidth = width - 200;
  const lines = wrapText(ctx, options.text, maxWidth);
  const lineHeight = 70;
  const totalTextHeight = lines.length * lineHeight;
  const startY = (height - totalTextHeight) / 2 + 20;

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], width / 2, startY + i * lineHeight);
  }

  // Bottom accent line
  ctx.beginPath();
  ctx.moveTo(width / 2 - 60, height - 200);
  ctx.lineTo(width / 2 + 60, height - 200);
  ctx.strokeStyle = theme.accentColor;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Bot name
  ctx.font = "bold 36px sans-serif";
  ctx.fillStyle = theme.accentColor;
  ctx.fillText(`~ ${options.botName}`, width / 2, height - 140);

  // Watermark
  ctx.font = "24px sans-serif";
  ctx.fillStyle = `${theme.textColor}60`;
  ctx.fillText("SocialBook", width / 2, height - 80);

  // Save
  const buffer = canvas.toBuffer("image/png");
  const filename = `quote_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`;
  const filepath = join(OUTPUT_DIR, filename);
  await writeFile(filepath, buffer);

  return filepath;
}
