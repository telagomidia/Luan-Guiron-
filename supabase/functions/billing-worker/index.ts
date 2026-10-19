import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import {asaasClient,checked,paymentUrl} from '../_shared/asaas.ts';
import {authorizeJob} from '../_shared/jobs.ts';
import {syncPayment} from '../_shared/sync.ts';
import {renewalDecision} from '../_shared/renewal.mjs';
import {today,plusDays} from '../billing/model.mjs';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
Deno.serve(async req=>{
 const reply=(v:unknown,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'Content-Type':'application/json'}});
 if(req.method!=='POST')return reply({error:'method_not_allowed'},405);
 let job:any;
 try{
  job=await authorizeJob(db,await req.json(),'worker');if(!job)return reply({error:'unauthorized'},401);
  const claimed:any=await checked(db.from('billing_jobs').update({state:'running'}).eq('id',job.id).eq('state','ready').select('id').maybeSingle());
  if(!claimed)return reply({skipped:true});
  const s:any=await checked(db.from('billing_settings').select('*').single());
  const sandbox=s.environment==='sandbox'&&s.sandbox_enabled;
  const production=s.environment==='production'&&Deno.env.get('BILLING_CARD_APPROVED')==='true'&&s.enabled&&s.starts_on&&today()>=s.starts_on&&Deno.env.get('BILLING_RELEASE_APPROVED')==='true';
  if((!sandbox&&!production)||s.environment!==Deno.env.get('ASAAS_ENVIRONMENT'))return reply({disabled:true});
  const asaas=asaasClient(s.environment,Deno.env.get('ASAAS_API_KEY')||'');
  let q=db.from('billing_accounts').select('*').eq('enrolled',true).eq('auto_renew',true).eq('exempt',false).eq('environment',s.environment).lte('access_until',new Date().toISOString()).gte('access_until',new Date(Date.now()-6*86400000).toISOString()).limit(50);
  if(sandbox)q=q.eq('is_test',true);
  const accounts:any=await checked(q);
  let attempted=0;
  for(const a of accounts){
   if(renewalDecision({account:a}).action!=='attempt')continue;
   const card:any=await checked(db.from('billing_card_tokens').select('*').eq('student_id',a.student_id).eq('environment',s.environment).eq('customer_id',a.asaas_customer_id).maybeSingle());
   if(!card){await checked(db.from('billing_accounts').update({renewal_issue:'card_update_required'}).eq('student_id',a.student_id));continue;}
   let order:any=await checked(db.from('billing_orders').select('*').eq('student_id',a.student_id).eq('kind','monthly').in('status',['creating','pending','overdue','review']).order('created_at',{ascending:false}).limit(1).maybeSingle());
   if(order&&renewalDecision({account:a,order}).action!=='attempt')continue;
   if(!order){
    const start=today();order=await checked(db.from('billing_orders').insert({student_id:a.student_id,kind:'monthly',amount_cents:a.price_cents||s.monthly_cents,method:'CREDIT_CARD',period_start:start,period_end:plusDays(start).slice(0,10),environment:s.environment,cycle_due_at:a.access_until,auto_renew_consent:true}).select().single());
    // Persist the order before creating a provider payment; an uncertain creation is never repeated.
    const p=await asaas('/payments','POST',{customer:a.asaas_customer_id,billingType:'CREDIT_CARD',value:order.amount_cents/100,dueDate:start,description:'Treinamento personalizado — 31 dias',externalReference:order.id});
    order={...order,status:'pending',provider_id:p.id,payment_url:paymentUrl(p.invoiceUrl)};
    await checked(db.from('billing_orders').update({status:order.status,provider_id:order.provider_id,payment_url:order.payment_url}).eq('id',order.id));
   }
   const p=await asaas('/payments/'+encodeURIComponent(order.provider_id));
   if(p.customer!==a.asaas_customer_id||Math.round(p.value*100)!==order.amount_cents)throw Error('payment_mismatch');
   const attempts:any=await checked(db.from('billing_attempts').select('attempt_day,status').eq('order_id',order.id));
   const decision=renewalDecision({account:a,order,payment:p,attempts});
   if(decision.action!=='attempt'){await syncPayment(db,asaas,p.id,'worker:'+crypto.randomUUID(),'WORKER_RECONCILE',s.environment);continue;}
   // Recheck cancellation immediately before reserving the attempt. Unique reservation serializes workers.
   const current:any=await checked(db.from('billing_accounts').select('*').eq('student_id',a.student_id).single());
   if(renewalDecision({account:current,order,payment:p,attempts}).action!=='attempt')continue;
   const {data:reservation,error}=await db.from('billing_attempts').insert({order_id:order.id,attempt_day:decision.day}).select('id').single();
   if(error?.code==='23505')continue;if(error)throw error;
   attempted++;
   try{
    await asaas('/payments/'+encodeURIComponent(p.id)+'/payWithCreditCard','POST',{creditCardToken:card.token});
    const synced=await syncPayment(db,asaas,p.id,'worker:'+reservation.id,'WORKER_ATTEMPT',s.environment);
    await checked(db.from('billing_attempts').update({status:synced.status==='paid'?'confirmed':'unknown'}).eq('id',reservation.id));
    await checked(db.from('billing_accounts').update({renewal_issue:null}).eq('student_id',a.student_id));
   }catch(e:any){
    // Definitive refusal can be tried on the next day; timeouts stay pending for reconciliation.
    const definitive=e?.status===400;
    await checked(db.from('billing_attempts').update({status:definitive?'declined':'unknown'}).eq('id',reservation.id));
    await checked(db.from('billing_accounts').update({renewal_issue:definitive?'card_declined':'payment_under_review'}).eq('student_id',a.student_id));
   }
   break; // Bound runtime to one potentially slow card authorization per invocation.
  }
  await checked(db.from('billing_jobs').update({state:'done',result:{attempted}}).eq('id',job.id));return reply({attempted});
 }catch{if(job)await db.from('billing_jobs').update({state:'failed'}).eq('id',job.id);return reply({error:'worker_unavailable'},503);}
});
