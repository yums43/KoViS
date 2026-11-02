import {env} from 'cloudflare:workers';
export const dynamic='force-dynamic';
export async function GET(){
  const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
  try {
    await env.DB!.prepare('SELECT 1 FROM system_settings LIMIT 1').first();
    return Response.json({status:'ok',service:'kovis',version:'0.2.0',database:'ready'},{headers});
  } catch {
    return Response.json({status:'unavailable',service:'kovis',version:'0.2.0'},{status:503,headers});
  }
}
