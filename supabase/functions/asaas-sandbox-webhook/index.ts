// Dedicated Sandbox receiver. No production host or student-data path exists here.
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import {asaasClient,checked} from '../_shared/asaas.ts';
import {sha256} from '../_shared/sandbox-policy.mjs';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
Deno.serve(async req=>{
 const reply=(status:number)=>new Response(JSON.stringify({received:status===200}),{status,headers:{'Content-Type':'application/json'}});
 if(req.method!=='POST')return reply(405);
 if(Deno.env.get('ASAAS_ENVIRONMENT')!=='sandbox')return reply(409);
 const token=Deno.env.get('ASAAS_WEBHOOK_TOKEN')||'';if(token.length<32)return reply(503);
 if(await sha256(req.headers.get('asaas-access-token')||'')!==await sha256(token))return reply(401);
 try{
  const event=await req.json();if(typeof event.id!=='string'||typeof event.event!=='string')return reply(400);
  if(!event.payment?.id)return reply(200);
  const asaas=asaasClient('sandbox',Deno.env.get('ASAAS_API_KEY')||'');const p=await asaas('/payments/'+encodeURIComponent(event.payment.id));
  if(typeof p.externalReference!=='string'||!p.externalReference.startsWith('sandbox-run:'))return reply(200);
  const id=p.externalReference.slice(12);if(!/^[0-9a-f-]{36}$/i.test(id))return reply(400);
  const run:any=await checked(db.from('billing_sandbox_runs').select('id,customer_id,amount_cents').eq('id',id).maybeSingle());
  if(!run||run.customer_id!==p.customer||Math.round(Number(p.value)*100)!==run.amount_cents)return reply(400);
  await checked(db.rpc('billing_record_sandbox_event',{p_run:run.id,p_event_id:event.id,p_event:event.event,p_status:p.deleted?'DELETED':p.status}));
  return reply(200);
 }catch{return reply(503);}
});
