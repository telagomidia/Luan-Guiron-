// Isolated test only: fixed sandbox URL, synthetic customer and R$60 simulated charge.
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import {asaasClient,checked,paymentUrl} from '../_shared/asaas.ts';
import {sha256} from '../_shared/sandbox-policy.mjs';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
Deno.serve(async req=>{
 const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
 if(req.method!=='POST')return reply({error:'method_not_allowed'},405);
 try{
  const body=await req.json();if(typeof body.token!=='string'||body.token.length<32)return reply({error:'unauthorized'},401);
  const run:any=await checked(db.from('billing_sandbox_runs').select('*').eq('id',body.run_id).eq('token_hash',await sha256(body.token)).gt('expires_at',new Date().toISOString()).maybeSingle());if(!run)return reply({error:'unauthorized'},401);
  if(Deno.env.get('ASAAS_ENVIRONMENT')!=='sandbox')return reply({error:'sandbox_environment_required'},409);
  const asaas=asaasClient('sandbox',Deno.env.get('ASAAS_API_KEY')||'');
  if(body.action==='diagnose'){
   await asaas('/customers?limit=1');const hooks=await asaas('/webhooks?limit=100');
   const matching=(hooks.data||[]).filter((h:any)=>h.url===Deno.env.get('SUPABASE_URL')+'/functions/v1/asaas-webhook');
   return reply({sandbox_api:'ok',webhooks:matching.map((h:any)=>({id:h.id,enabled:h.enabled,interrupted:h.interrupted,events:h.events})),token_configured:(Deno.env.get('ASAAS_WEBHOOK_TOKEN')||'').length>=32,state:run.state});
  }
  if(body.action==='configure_webhook'){
   if(run.webhook_id)return reply({configured:true,webhook_id:run.webhook_id});
   const token=Deno.env.get('ASAAS_WEBHOOK_TOKEN')||'';if(token.length<32)throw Error('webhook_token_missing');
   const hooks=await asaas('/webhooks?limit=100');
   const hook=await asaas('/webhooks','POST',{name:'Homologacao isolada 31 dias '+run.id.slice(0,8),url:Deno.env.get('SUPABASE_URL')+'/functions/v1/asaas-sandbox-webhook',email:(hooks.data||[])[0]?.email||'contato@luanguiron.com.br',enabled:true,interrupted:false,apiVersion:3,authToken:token,sendType:'SEQUENTIALLY',events:['PAYMENT_CREATED','PAYMENT_CONFIRMED','PAYMENT_RECEIVED','PAYMENT_OVERDUE','PAYMENT_CREDIT_CARD_CAPTURE_REFUSED','PAYMENT_REFUNDED']});
   await checked(db.from('billing_sandbox_runs').update({webhook_id:hook.id}).eq('id',run.id));return reply({configured:true,webhook_id:hook.id});
  }
  if(body.action==='close'){
   if(run.webhook_id)await asaas('/webhooks/'+encodeURIComponent(run.webhook_id),'PUT',{enabled:false});
   await checked(db.from('billing_sandbox_runs').update({expires_at:new Date().toISOString(),state:'closed'}).eq('id',run.id));return reply({closed:true,original_webhooks_restored:true});
  }
  if(body.action==='prepare'){
   if(run.state!=='ready')return reply({state:run.state,payment_id:run.payment_id});
   if(!run.webhook_id)throw Error('configure_test_webhook_first');
   const reserved=await checked(db.from('billing_sandbox_runs').update({state:'creating'}).eq('id',run.id).eq('state','ready').select().maybeSingle());if(!reserved)return reply({error:'already_running'},409);
   const c=await asaas('/customers','POST',{name:'TESTE SANDBOX LUAN — NAO E ALUNO',cpfCnpj:'52998224725',externalReference:'sandbox-run:'+run.id,notificationDisabled:true});
   await checked(db.from('billing_sandbox_runs').update({customer_id:c.id}).eq('id',run.id));
   const p=await asaas('/payments','POST',{customer:c.id,billingType:'PIX',value:60,dueDate:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),description:'TESTE SANDBOX — acesso de 31 dias — sem dinheiro real',externalReference:'sandbox-run:'+run.id});
   await checked(db.from('billing_sandbox_runs').update({state:'prepared',payment_id:p.id,invoice_url:paymentUrl(p.invoiceUrl),provider_status:p.status}).eq('id',run.id));
   return reply({state:'prepared',payment_id:p.id,url:p.invoiceUrl,amount_cents:6000});
  }
  if(body.action==='confirm'){
   if(run.state!=='prepared')return reply({state:run.state,payment_id:run.payment_id});
   const p=await asaas('/payments/'+encodeURIComponent(run.payment_id));
   if(p.externalReference!=='sandbox-run:'+run.id||p.customer!==run.customer_id||Number(p.value)!==60)throw Error('unsafe_test');
   const reserved=await checked(db.from('billing_sandbox_runs').update({state:'confirming'}).eq('id',run.id).eq('state','prepared').select().maybeSingle());if(!reserved)return reply({error:'already_running'},409);
   const paid=await asaas('/sandbox/payment/'+encodeURIComponent(run.payment_id)+'/confirm','POST');
   await checked(db.from('billing_sandbox_runs').update({state:'confirmed'}).eq('id',run.id));return reply({state:'confirmed',payment_id:paid.id,status:paid.status});
  }
  if(body.action==='status'){
   const events=await checked(db.from('billing_sandbox_events').select('event,status,received_at').eq('run_id',run.id));
   const p=run.payment_id?await asaas('/payments/'+encodeURIComponent(run.payment_id)):null;
   return reply({state:run.state,payment_id:run.payment_id,provider_status:p?.status,paid_at:run.paid_at,access_until:run.access_until,events});
  }
  return reply({error:'invalid_action'},400);
 }catch(error:any){return reply({error:error?.message||'sandbox_test_failed',provider_status:error?.status,provider_codes:error?.codes,provider_descriptions:error?.descriptions},503);}
});
