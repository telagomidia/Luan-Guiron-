import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import {cents,monthEnd,paymentState} from '../billing/model.mjs';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
Deno.serve(async req=>{
 const reply=(status:number)=>new Response(JSON.stringify({received:status===200}),{status,headers:{'Content-Type':'application/json'}});
 if(req.method!=='POST')return reply(405);
 const token=Deno.env.get('ASAAS_WEBHOOK_TOKEN'),provided=req.headers.get('asaas-access-token');
 if(!token||token.length<32)return reply(503);
 // Hash before comparing so comparison work is independent of the secret's prefix.
 const hash=async(s:string)=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
 const [a,b]=await Promise.all([hash(token),hash(provided||'')]);let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];if(diff)return reply(401);
 try{
  const event=await req.json();if(typeof event.id!=='string'||typeof event.event!=='string')return reply(400);
  const {data:prior,error:priorError}=await db.from('billing_events').select('id').eq('id',event.id).maybeSingle();if(priorError)throw priorError;if(prior)return reply(200);
  const key=Deno.env.get('ASAAS_API_KEY'),env=Deno.env.get('ASAAS_ENVIRONMENT');if(!key||!['sandbox','production'].includes(env||''))return reply(503);
  const base=env==='production'?'https://api.asaas.com/v3':'https://api-sandbox.asaas.com/v3';
  async function get(path:string){const r=await fetch(base+path,{headers:{access_token:key!,'User-Agent':'LuanGuironBilling/1.0'},signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('provider_unavailable');return r.json();}
  if(event.event.startsWith('PAYMENT_')&&event.payment?.id){
   const p=await get('/payments/'+encodeURIComponent(event.payment.id));
   const {data:account,error:accountError}=await db.from('billing_accounts').select('*').eq('asaas_customer_id',p.customer).maybeSingle();if(accountError)throw accountError;
   if(!account)throw Error('unmapped_customer');
   let order=null;
   if(/^[0-9a-f-]{36}$/i.test(p.externalReference||'')){const r=await db.from('billing_orders').select('*').eq('id',p.externalReference).eq('student_id',account.student_id).maybeSingle();if(r.error)throw r.error;order=r.data;}
   if(!order&&p.subscription&&account.asaas_subscription_id===p.subscription){const r=await db.from('billing_orders').select('*').eq('student_id',account.student_id).eq('kind','monthly').eq('method','CREDIT_CARD').order('created_at',{ascending:false}).limit(1).maybeSingle();if(r.error)throw r.error;order=r.data;}
   if(!order)throw Error('unmapped_order');
   if(cents(p.value)!==order.amount_cents)throw Error('amount_mismatch');
   const status=p.deleted?'canceled':paymentState(p.status);
   const {error}=await db.rpc('billing_record_payment',{event_id:event.id,event_name:event.event,payment:{asaas_id:p.id,student_id:account.student_id,order_id:order.id,subscription_id:p.subscription||null,amount_cents:cents(p.value),status,due_date:p.dueDate,period_end:order.kind==='monthly'?monthEnd(p.dueDate):order.period_end,paid_at:status==='paid'?(p.confirmedDate||p.paymentDate||p.clientPaymentDate||null):null}});if(error)throw error;
   // Do not label a checkout order paid solely from a browser return.
   return reply(200);
  }
  if(event.event.startsWith('SUBSCRIPTION_')&&event.subscription?.id){
   const s=await get('/subscriptions/'+encodeURIComponent(event.subscription.id));
   const {data:account,error:ae}=await db.from('billing_accounts').select('*').eq('asaas_customer_id',s.customer).maybeSingle();if(ae)throw ae;if(!account)throw Error('unmapped_customer');
   // Match only a unique local recurring checkout for this customer.
   const {data:orders,error:oe}=await db.from('billing_orders').select('id,amount_cents,created_at').eq('student_id',account.student_id).eq('kind','monthly').eq('method','CREDIT_CARD').in('status',['creating','pending']);if(oe)throw oe;
   if(account.asaas_subscription_id!==s.id&&(orders?.length!==1||cents(s.value)!==orders[0].amount_cents||s.cycle!=='MONTHLY'||s.billingType!=='CREDIT_CARD'||String(s.dateCreated)<orders[0].created_at.slice(0,10)))throw Error('unmapped_subscription');
   const {error}=await db.from('billing_accounts').update({asaas_subscription_id:s.id,subscription_status:s.status,updated_at:new Date().toISOString()}).eq('student_id',account.student_id);if(error)throw error;
  }
  if(event.event.startsWith('CHECKOUT_')&&event.checkout?.id){
   const {data:order,error}=await db.from('billing_orders').select('id').eq('provider_id',event.checkout.id).maybeSingle();if(error)throw error;if(!order)throw Error('unmapped_checkout');
   // Financial truth comes from canonical payment queries, not checkout payload amounts.
  }
  const {error}=await db.from('billing_events').insert({id:event.id,event:event.event,resource_id:event.payment?.id||event.subscription?.id||event.checkout?.id||null});if(error&&error.code!=='23505')throw error;
  return reply(200);
 }catch{return reply(503);}
});
