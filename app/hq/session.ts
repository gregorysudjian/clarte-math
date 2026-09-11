import { cookies } from "next/headers";
import { SESSION_COOKIE, createSessionToken, sessionCookie, verifySessionToken } from "../../lib/auth";

export async function isSignedIn() {
  return verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function startSession() {
  (await cookies()).set(SESSION_COOKIE, createSessionToken(), sessionCookie);
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
