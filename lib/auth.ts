import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// Password-only owner login. The password lives in the HQ_PASSWORD environment
// variable; the session is a signed, expiring cookie. Changing the password
// signs everyone out.

export const SESSION_COOKIE = "northstar_hq_session";
const MAX_AGE = 60 * 60 * 24 * 30;

const sha256 = (value: string) => createHash("sha256").update(value).digest();

function signingKey() {
  const password = process.env.HQ_PASSWORD;
  return password ? sha256(`northstar-hq:${process.env.HQ_SESSION_SECRET || ""}:${password}`) : null;
}

const sign = (key: Buffer, value: string) => createHmac("sha256", key).update(value).digest("base64url");

function safeEqual(a: Buffer, b: Buffer) {
  return a.length === b.length && timingSafeEqual(a, b);
}

export const passwordConfigured = () => Boolean(process.env.HQ_PASSWORD);

export function checkPassword(input: string) {
  const password = process.env.HQ_PASSWORD;
  return Boolean(password) && safeEqual(sha256(input), sha256(password!));
}

export function createSessionToken() {
  const key = signingKey();
  if (!key) throw new Error("HQ_PASSWORD is not set");
  const expires = String(Math.floor(Date.now() / 1000) + MAX_AGE);
  return `${expires}.${sign(key, expires)}`;
}

export function verifySessionToken(token: string | undefined) {
  const key = signingKey();
  if (!key || !token) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature || Number(expires) < Date.now() / 1000) return false;
  return safeEqual(Buffer.from(signature), Buffer.from(sign(key, expires)));
}

export const sessionCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE,
  // Secure cookies need HTTPS; allow plain http when running on your own computer.
  secure: process.env.NODE_ENV === "production" && !(process.env.NEXT_PUBLIC_SITE_URL || "").startsWith("http://"),
};
