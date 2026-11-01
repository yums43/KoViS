import { database, issueSession, noStore, passwordHash, safeEqual, sameOrigin, sessionCookie, throttle } from "../../../../lib/native-auth";
export const dynamic="force-dynamic";
export async function POST(request:Request) {
  if (!sameOrigin(request)) return noStore({error:"Permintaan tidak sah."},403);
  let body:Record<string,unknown>;
  try { if(Number(request.headers.get("content-length")||0)>8192) throw Error();body=await request.json(); } catch {return noStore({error:"Data tidak sah."},400);}
  const email=typeof body.email==="string"?body.email.trim().toLowerCase():"";
  const password=typeof body.password==="string"?body.password:"";
  if(email.length>160||password.length>128||!email||!password)return noStore({error:"Maklumat login tidak sah."},400);
  if(!(await throttle("login:"+await (await import("../../../../lib/native-auth")).digest(email),8)))return noStore({error:"Terlalu banyak cubaan. Cuba semula nanti."},429);
  const row=await database().prepare(`SELECT u.id,u.active,c.password_hash,c.password_salt,c.password_iterations FROM users u JOIN auth_credentials c ON c.user_id=u.id WHERE u.email=? AND u.dataset='live'`).bind(email).first<{id:string;active:number;password_hash:string;password_salt:string;password_iterations:number}>();
  // Use an expensive dummy derivation for unknown users to reduce timing differences.
  const salt=row?.password_salt??"00".repeat(32);
  const calculated=await passwordHash(password,salt,row?.password_iterations??310000);
  if(!row||row.active!==1||!safeEqual(calculated,row.password_hash))return noStore({error:"E-mel atau kata laluan tidak sah."},401);
  return noStore({ok:true},200,sessionCookie(await issueSession(row.id)));
}
