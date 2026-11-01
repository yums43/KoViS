import { database, digest, issueSession, newSalt, noStore, passwordHash, passwordIterations, sameOrigin, sessionCookie, throttle } from "../../../../lib/native-auth";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return noStore({error:"Permintaan tidak sah."},403);
  if (!(await throttle("register",5))) return noStore({error:"Terlalu banyak cubaan."},429);
  let body: Record<string,unknown>;
  try { if (Number(request.headers.get("content-length")||0)>8192) throw Error(); body=await request.json(); } catch {return noStore({error:"Data tidak sah."},400);}
  const name=typeof body.name==="string"?body.name.trim():"";
  const email=typeof body.email==="string"?body.email.trim().toLowerCase():"";
  const password=typeof body.password==="string"?body.password:"";
  if (name.length<3||name.length>120||email.length>160||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<12||password.length>128||!/[a-zA-Z]/.test(password)||!/[0-9]/.test(password)||body.consent!==true) return noStore({error:"Sila lengkapkan nama, e-mel, kata laluan minimum 12 aksara (huruf dan nombor), dan persetujuan privasi."},400);
  const id=crypto.randomUUID(), salt=newSalt(), hash=await passwordHash(password,salt);
  try {
    await database().batch([
      database().prepare("INSERT INTO users (id,identity,email,name,role,active,created,dataset) VALUES (?,NULL,?,?,'visitor',1,?,'live')").bind(id,email,name,new Date().toISOString()),
      database().prepare("INSERT INTO auth_credentials (user_id,password_hash,password_salt,password_algorithm,password_iterations,password_changed_at) VALUES (?,?,?,'PBKDF2-SHA256',?,?)").bind(id,hash,salt,passwordIterations(),new Date().toISOString())
    ]);
    const token=await issueSession(id);
    return noStore({ok:true,role:"visitor",emailVerificationImplemented:false},201,sessionCookie(token));
  } catch { return noStore({error:"Pendaftaran tidak berjaya. E-mel mungkin sudah digunakan."},409); }
}
