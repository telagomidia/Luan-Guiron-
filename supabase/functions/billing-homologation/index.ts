// Bounded Sandbox-only acceptance tests. Expiring capabilities are service-only, never user JWTs.
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import {asaasClient,checked} from '../_shared/asaas.ts';
import {authorizeJob} from '../_shared/jobs.ts';
import {createCharge} from '../_shared/charges.ts';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
Deno.serve(async req=>{
 const reply=(v:unknown,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'Content-Type':'application/json'}});
 if(req.method!=='POST')return reply({},405);
 try{
  const body=await req.json(),job:any=await authorizeJob(db,body,'sandbox');if(!job)return reply({},401);
  if(Deno.env.get('ASAAS_ENVIRONMENT')!=='sandbox')return reply({},409);
  const s:any=await checked(db.from('billing_settings').select('*').single());if(s.environment!=='sandbox'||s.enabled)throw Error('unsafe_environment');
  const asaas=asaasClient('sandbox',Deno.env.get('ASAAS_API_KEY')||'');
  if(body.action==='configure'){
   const hooks=await asaas('/webhooks?limit=100');const hook=hooks.data.find((h:any)=>h.url===Deno.env.get('SUPABASE_URL')+'/functions/v1/asaas-webhook');if(!hook)throw Error('main_webhook_missing');
   const events=[...new Set([...(hook.events||[]),'PAYMENT_CREATED','PAYMENT_CONFIRMED','PAYMENT_RECEIVED','PAYMENT_OVERDUE','PAYMENT_CREDIT_CARD_CAPTURE_REFUSED','PAYMENT_REFUNDED','PAYMENT_DELETED','PAYMENT_CHARGEBACK_REQUESTED','PAYMENT_CHARGEBACK_DISPUTE','PAYMENT_AWAITING_CHARGEBACK_REVERSAL'])];
   const updated=await asaas('/webhooks/'+hook.id,'PUT',{enabled:true,interrupted:false,authToken:Deno.env.get('ASAAS_WEBHOOK_TOKEN'),events});return reply({configured:true,enabled:updated.enabled,events:updated.events});
  }
  if(body.action==='prepare'){
   const lock:any=await checked(db.from('billing_jobs').update({state:'creating'}).eq('id',job.id).eq('state','ready').select('id').maybeSingle());if(!lock)return reply({state:job.state},409);
   const id=crypto.randomUUID();const {data,error}=await db.auth.admin.createUser({id,email:'billing-test-'+id+'@example.invalid',password:crypto.randomUUID()+crypto.randomUUID(),email_confirm:true,user_metadata:{full_name:'TESTE SANDBOX — NÃO É ALUNO'}});if(error)throw error;
   const sid=data.user.id;
   await checked(db.from('profiles').update({full_name:'TESTE SANDBOX — NÃO É ALUNO',active:true}).eq('id',sid));
   await checked(db.from('billing_accounts').insert({student_id:sid,is_test:true,environment:'sandbox'}));
   await checked(db.from('billing_jobs').update({result:{student_id:sid}}).eq('id',job.id));
   await checked(db.from('billing_settings').update({sandbox_enabled:true}).eq('id',true));
   const profile:any=await checked(db.from('profiles').select('*').eq('id',sid).single());const a:any=await checked(db.from('billing_accounts').select('*').eq('student_id',sid).single());
   const payment=await createCharge(db,asaas,profile,a,s,{method:body.action==='renew_card'?'CREDIT_CARD':'PIX',auto_renew:body.action==='renew_card',cpf:'52998224725'});
   await checked(db.from('billing_jobs').update({state:'prepared',result:{student_id:sid,...payment}}).eq('id',job.id));return reply({student_id:sid,...payment});
  }
  const sid=job.result.student_id;if(!sid)throw Error('test_not_prepared');
  const a:any=await checked(db.from('billing_accounts').select('*').eq('student_id',sid).eq('is_test',true).single());
  if(body.action==='test_hook'){
   const hooks=await asaas('/webhooks?limit=100');const hook=await asaas('/webhooks','POST',{name:'Teste temporario do receptor principal '+job.id.slice(0,8),url:Deno.env.get('SUPABASE_URL')+'/functions/v1/asaas-webhook?test_run='+job.id,email:hooks.data[0].email,enabled:true,interrupted:false,apiVersion:3,authToken:Deno.env.get('ASAAS_WEBHOOK_TOKEN'),sendType:'SEQUENTIALLY',events:['PAYMENT_CREATED','PAYMENT_CONFIRMED','PAYMENT_RECEIVED','PAYMENT_CREDIT_CARD_CAPTURE_REFUSED']});
   await checked(db.from('billing_jobs').update({result:{...job.result,test_hook_id:hook.id}}).eq('id',job.id));return reply({test_hook:true});
  }
  if(body.action==='pay_card'){
   const p=await asaas('/payments/'+job.result.payment_id);if(p.customer!==a.asaas_customer_id||p.externalReference!==job.result.order_id||p.billingType!=='CREDIT_CARD'||Number(p.value)!==60)throw Error('unsafe_test_card');
   if(['RECEIVED','CONFIRMED'].includes(p.status))return reply({already_paid:true});
   const paid=await asaas('/payments/'+p.id+'/payWithCreditCard','POST',{creditCard:{holderName:'TESTE SANDBOX',number:'4111111111111111',expiryMonth:'12',expiryYear:'2030',ccv:'123'},creditCardHolderInfo:{name:'TESTE SANDBOX',email:'test@example.invalid',cpfCnpj:'52998224725',postalCode:'01310100',addressNumber:'100',phone:'11999999999'},remoteIp:'203.0.113.10'});
   return reply({provider_status:paid.status,token_returned:!!paid.creditCard?.creditCardToken});
  }
  if(body.action==='diagnose'){
   const hooks=await asaas('/webhooks?limit=100');const hook=hooks.data.find((h:any)=>h.url===Deno.env.get('SUPABASE_URL')+'/functions/v1/asaas-webhook');
   const p=await asaas('/payments/'+job.result.payment_id);
   const probe=await fetch(Deno.env.get('SUPABASE_URL')+'/functions/v1/asaas-webhook',{method:'POST',headers:{'Content-Type':'application/json','asaas-access-token':Deno.env.get('ASAAS_WEBHOOK_TOKEN')!},body:JSON.stringify({id:'test-probe:'+crypto.randomUUID(),event:'PAYMENT_RECEIVED',payment:{id:p.id}})});
   return reply({hook:{enabled:hook?.enabled,interrupted:hook?.interrupted,url:hook?.url},provider_status:p.status,probe_status:probe.status});
  }
  if(body.action==='confirm'){
   const p=await asaas('/payments/'+job.result.payment_id);if(p.customer!==a.asaas_customer_id||p.externalReference!==job.result.order_id||Number(p.value)!==60)throw Error('unsafe_test_payment');
   if(!['RECEIVED','CONFIRMED'].includes(p.status))await asaas('/sandbox/payment/'+p.id+'/confirm','POST');return reply({confirmed:true});
  }
  if(['renew','renew_card'].includes(body.action)){
   if(!a.access_until)throw Error('first_payment_unconfirmed');
   const profile:any=await checked(db.from('profiles').select('*').eq('id',sid).single());const payment=await createCharge(db,asaas,profile,a,s,{method:body.action==='renew_card'?'CREDIT_CARD':'PIX',auto_renew:body.action==='renew_card',cpf:'52998224725'});
   await checked(db.from('billing_jobs').update({result:{...job.result,student_id:sid,...payment}}).eq('id',job.id));return reply(payment);
  }
  if(body.action==='status'){
   const payments:any=await checked(db.from('billing_payments').select('asaas_id,status,paid_at').eq('student_id',sid));return reply({access_until:a.access_until,payments});
  }
  if(body.action==='close'){
   if(job.result.test_hook_id)await asaas('/webhooks/'+job.result.test_hook_id,'PUT',{enabled:false});
   await checked(db.from('billing_settings').update({sandbox_enabled:false}).eq('id',true));
   await checked(db.from('billing_accounts').update({enrolled:false,auto_renew:false}).eq('student_id',sid));
   await checked(db.from('profiles').update({active:false}).eq('id',sid));
   const {error}=await db.auth.admin.updateUserById(sid,{ban_duration:'876000h'});if(error)throw error;
   await checked(db.from('billing_jobs').update({state:'closed',expires_at:new Date().toISOString()}).eq('id',job.id));return reply({closed:true,real_billing_enabled:false});
  }
  return reply({},400);
 }catch(e:any){return reply({error:e?.message||'test_failed',provider_status:e?.status,provider_codes:e?.codes,provider_descriptions:e?.descriptions},503);}
});
