import {clearSessionCookie,noStore,revokeSession,sameOrigin} from "../../../../lib/native-auth";
export const dynamic="force-dynamic";
export async function POST(request:Request){
 if(!sameOrigin(request))return noStore({error:"Permintaan tidak sah."},403);
 await revokeSession();
 return noStore({ok:true},200,clearSessionCookie());
}
