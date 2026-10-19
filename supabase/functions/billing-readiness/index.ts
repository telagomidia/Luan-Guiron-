// Read-only provider diagnostics. Never creates customers, payments or Pix keys.
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import {asaasClient,checked} from '../_shared/asaas.ts';
import {authorizeJob} from '../_shared/jobs.ts';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
Deno.serve(async req=>{
 const reply=(v:unknown,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(req.method!=='POST')return reply({error:'method_not_allowed'},405);
 try{
  const job:any=await authorizeJob(db,await req.json(),'worker');
  if(!job||job.result?.purpose!=='billing_readiness')return reply({error:'unauthorized'},401);
  const claimed:any=await checked(db.from('billing_jobs').update({state:'running'}).eq('id',job.id).eq('state','ready').select('id').maybeSingle());if(!claimed)return reply({error:'already_used'},409);
  const env=Deno.env.get('ASAAS_ENVIRONMENT')||'';
  if(env!=='production')return reply({environment:env,production_ready:false},409);
  const asaas=asaasClient(env,Deno.env.get('ASAAS_API_KEY')||'');
  const hooks=await asaas('/webhooks?limit=100');
  const hook=hooks.data?.find((h:any)=>h.url===Deno.env.get('SUPABASE_URL')+'/functions/v1/asaas-webhook');
  const expected=['PAYMENT_CREATED','PAYMENT_CONFIRMED','PAYMENT_RECEIVED','PAYMENT_OVERDUE','PAYMENT_CREDIT_CARD_CAPTURE_REFUSED','PAYMENT_DELETED','PAYMENT_REFUNDED','PAYMENT_CHARGEBACK_REQUESTED','PAYMENT_CHARGEBACK_DISPUTE','PAYMENT_AWAITING_CHARGEBACK_REVERSAL'];
  let pix={checked:false,active_keys:0};
  try{const keys=await asaas('/pix/addressKeys?limit=1&status=ACTIVE');pix={checked:true,active_keys:keys.totalCount??keys.data?.length??0};}catch{}
  const settings:any=await checked(db.from('billing_settings').select('enabled,environment,monthly_cents,duration_days,grace_days').single());
  const token=Deno.env.get('ASAAS_WEBHOOK_TOKEN')||'';
  const report={environment:env,api_authenticated:true,release_approved:Deno.env.get('BILLING_RELEASE_APPROVED')==='true',webhook:{found:!!hook,enabled:hook?.enabled===true,interrupted:hook?.interrupted===true,token_configured:token.length>=32,token_matches:typeof hook?.authToken==='string'?hook.authToken===token:null,missing_events:expected.filter(e=>!hook?.events?.includes(e))},pix,settings};
  await checked(db.from('billing_jobs').update({state:'done',result:{purpose:'billing_readiness',report},expires_at:new Date().toISOString()}).eq('id',job.id));
  return reply(report);
 }catch(e:any){return reply({error:'readiness_failed',provider_status:e?.status,provider_codes:e?.codes},503);}
});
