const attempts = new Map<string, { count: number; resetAt: number }>();

function key(ip: string, phone?: string) {
  return phone ? `p:${phone}` : `ip:${ip}`;
}

export function rateLimit(options: {
  windowMs: number;
  max: number;
  message: string;
}) {
  return (req: any, res: any, next: any) => {
    const now = Date.now();
    const ip = req.ip ?? req.socket?.remoteAddress ?? "unknown";
    const phone = typeof req.body?.phone === "string" ? req.body.phone : undefined;

    for (const k of [key(ip, phone), key(ip)]) {
      const entry = attempts.get(k);
      if (!entry || entry.resetAt <= now) {
        attempts.set(k, { count: 1, resetAt: now + options.windowMs });
        continue;
      }
      entry.count += 1;
      if (entry.count > options.max) {
        const waitMin = Math.ceil((entry.resetAt - now) / 60000);
        return res
          .status(429)
          .json({ error: `${options.message} Try again in ${waitMin} min.` });
      }
    }
    next();
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of attempts) {
    if (v.resetAt <= now) attempts.delete(k);
  }
}, 10 * 60 * 1000).unref();