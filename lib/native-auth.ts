import { env } from "cloudflare:workers";
import { cookies } from "next/headers";

const encoder = new TextEncoder();
const hex = (bytes: Uint8Array) => Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
const fromHex = (value: string) => new Uint8Array(value.match(/.{2}/g)?.map(x => parseInt(x, 16)) ?? []);
const random = () => hex(crypto.getRandomValues(new Uint8Array(32)));
const iso = () => new Date().toISOString();
const ITERATIONS = 310000;
export const COOKIE_NAME = "__Host-kovis_session";

export function database() {
  if (!env.DB) throw new Error("D1 binding DB is missing");
  return env.DB;
}
export async function digest(value: string) {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}
export async function passwordHash(password: string, salt: string, iterations = ITERATIONS) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const result = await crypto.subtle.deriveBits({name:"PBKDF2", hash:"SHA-256", salt:fromHex(salt), iterations}, key, 256);
  return hex(new Uint8Array(result));
}
export function newSalt() { return random(); }
export function passwordIterations() { return ITERATIONS; }
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}
export function sessionCookie(token: string, maxAge = 60 * 60 * 24 * 7) {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
export function clearSessionCookie() { return sessionCookie("", 0); }
export async function issueSession(userId: string) {
  const token = random(), id = crypto.randomUUID(), created = iso();
  const expires = new Date(Date.now() + 7 * 86400000).toISOString();
  await database().prepare("INSERT INTO auth_sessions (id,user_id,token_hash,created_at,expires_at) VALUES (?,?,?,?,?)")
    .bind(id, userId, await digest(token), created, expires).run();
  return token;
}
export async function currentUser() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return database().prepare(`SELECT u.id,u.email,u.name,u.role,u.active
    FROM auth_sessions s JOIN users u ON u.id=s.user_id
    WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>? AND u.active=1`)
    .bind(await digest(token), iso()).first<{id:string;email:string;name:string;role:string;active:number}>();
}
export async function revokeSession() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (token) await database().prepare("UPDATE auth_sessions SET revoked_at=? WHERE token_hash=?")
    .bind(iso(), await digest(token)).run();
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !!origin && origin === new URL(request.url).origin;
}
export async function throttle(key: string, maximum: number) {
  const bucket = Math.floor(Date.now()/60000);
  const result = await database().prepare("INSERT INTO rate_limits (id,count) VALUES (?,1) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count")
    .bind("auth:"+key+":"+bucket).first<{count:number}>();
  return (result?.count ?? maximum+1) <= maximum;
}
export function noStore(data: unknown, status=200, cookie?: string) {
  const headers = new Headers({"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});
  if (cookie) headers.set("Set-Cookie",cookie);
  return Response.json(data,{status,headers});
}
