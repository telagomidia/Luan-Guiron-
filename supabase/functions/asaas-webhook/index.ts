import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import {asaasClient,checked} from '../_shared/asaas.ts';
import {syncPayment} from '../_shared/sync.ts';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
Deno.serve(async req=>{
 const reply=(status:number)=>new Response(JSON.stringify({received:status===200}),{status,headers:{'Content-Type':'application/json'}});
 if(req.method!=='POST')return reply(405);
 const token=Deno.env.get('ASAAS_WEBHOOK_TOKEN'),provided=req.headers.get('asaas-access-token');if(!token||token.length<32)return reply(503);
 const hash=async(s:string)=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
 const [a,b]=await Promise.all([hash(token),hash(provided||'')]);let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];if(diff)return reply(401);
 try{
  const event=await req.json();if(typeof event.id!=='string'||typeof event.event!=='string')return reply(400);
  const prior=await checked(db.from('billing_events').select('id').eq('id',event.id).maybeSingle());if(prior)return reply(200);
  const env=Deno.env.get('ASAAS_ENVIRONMENT')||'',asaas=asaasClient(env,Deno.env.get('ASAAS_API_KEY')||'');
  if(event.event.startsWith('PAYMENT_')&&event.payment?.id){
   const result=await syncPayment(db,asaas,event.payment.id,event.id,event.event,env);
   if(!result.ignored)return reply(200);
  }
  // Foreign/unmapped events are acknowledged without granting credit or blocking the queue.
  const {error}=await db.from('billing_events').insert({id:event.id,event:event.event,resource_id:event.payment?.id||event.subscription?.id||event.checkout?.id||null});if(error&&error.code!=='23505')throw error;
  return reply(200);
 }catch(error){console.error('asaas_webhook_failed',error instanceof Error?error.message:'unknown');return reply(503);}
});
