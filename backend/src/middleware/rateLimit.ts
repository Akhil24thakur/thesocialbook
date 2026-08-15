export function rateLimit(options: {
  windowMs: number;
  max: number;
  message: string;
}) {
  const attempts = new Map<string, { count: number; resetAt: number }>();

  return (req: any, res: any, next: any) => {
    const now = Date.now();
    const ip = req.ip ?? req.socket?.remoteAddress ?? "unknown";
    const identifier =
      typeof req.body?.phone === "string"
        ? req.body.phone
        : typeof req.body?.target === "string"
        ? req.body.target
        : typeof req.body?.email === "string"
        ? req.body.email
        : undefined;

    const keysToCheck = identifier ? [`id:${identifier}`, `ip:${ip}`] : [`ip:${ip}`];

    for (const k of keysToCheck) {
      const entry = attempts.get(k);
      if (!entry || entry.resetAt <= now) {
        attempts.set(k, { count: 1, resetAt: now + options.windowMs });
        continue;
      }
      entry.count += 1;
      if (entry.count > options.max) {
        const waitSec = Math.ceil((entry.resetAt - now) / 1000);
        const waitText = waitSec > 60 ? `${Math.ceil(waitSec / 60)} min` : `${waitSec} sec`;
        return res
          .status(429)
          .json({ error: `${options.message} Try again in ${waitText}.` });
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