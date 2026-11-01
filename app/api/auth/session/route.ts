import {currentUser,noStore} from "../../../../lib/native-auth";
export const dynamic="force-dynamic";
export async function GET(){const user=await currentUser();return noStore({user:user?{id:user.id,name:user.name,email:user.email,role:user.role}:null});}
