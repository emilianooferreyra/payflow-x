import type { Request } from "express";

export function extractIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const forwardedStr = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return forwardedStr ?? req.ip ?? req.socket?.remoteAddress ?? "";
}

export function isPrivateIp(ip: string): boolean {
  const clean = ip.replace("::ffff:", "");
  if (["127.0.0.1", "::1", "localhost"].includes(clean)) return true;
  if (clean.startsWith("10.") || clean.startsWith("192.168.")) return true;
  if (clean.startsWith("172.")) {
    const second = parseInt(clean.split(".")[1], 10);
    return second >= 16 && second <= 31;
  }
  return false;
}
