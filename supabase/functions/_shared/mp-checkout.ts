import {checked} from './asaas.ts';
import {mpCheckoutUrl,mpPaymentState} from './mercadopago.mjs';
import {cents,today,plusDays} from '../billing/model.mjs';
export async function createMpCheckout(db:any,mp:any,seller:string,profile:any,account:any,settings:any,serviceId?:string){
 if(!settings.mercadopago_sandbox_enabled||!account?.is_test||!profile.active||account.environment!=='sandbox')throw Error('test_account_required');
 if(!serviceId&&account.exempt)throw Error('exempt');
 if(account.asaas_customer_id||account.asaas_subscription_id)throw Error('dedicated_test_account_required');
 const kind=serviceId?'assessment':'monthly';let amount=account.price_cents||settings.monthly_cents,title='Treinamento personalizado — 31 dias — TESTE';
 if(serviceId){const service:any=await checked(db.from('billing_services').select('*').eq('id',serviceId).eq('active',true).single());amount=service.price_cents;title=service.name+' — TESTE';}
 let query=db.from('billing_orders').select('*').eq('student_id',profile.id).eq('kind',kind).in('status',['creating','pending','overdue','review']).order('created_at',{ascending:false}).limit(1);
 if(serviceId)query=query.eq('service_id',serviceId);
 const existing:any=await checked(query.maybeSingle());
 if(existing){if(existing.provider!=='mercadopago'||existing.environment!=='sandbox')throw Error('provider_mismatch');if(existing.payment_url)return {url:mpCheckoutUrl(existing.payment_url),order_id:existing.id,reused:true};throw Error('order_requires_reconciliation');}
 const start=today();
 const order:any=await checked(db.from('billing_orders').insert({student_id:profile.id,kind,service_id:serviceId||null,provider:'mercadopago',environment:'sandbox',amount_cents:amount,method:'CHECKOUT',period_start:start,period_end:plusDays(start).slice(0,10),cycle_due_at:account.access_until||new Date().toISOString()}).select().single());
 const back='https://telagomidia.github.io/Luan-Guiron-/portal.html#billing';
 const pref=await mp('/checkout/preferences','POST',{items:[{id:order.id,title,currency_id:'BRL',quantity:1,unit_price:amount/100}],external_reference:order.id,metadata:{integration:'luan-guiron-sandbox',order_id:order.id},notification_url:Deno.env.get('SUPABASE_URL')+'/functions/v1/mercadopago-webhook?source_news=webhooks',back_urls:{success:back,pending:back,failure:back},auto_return:'approved',payment_methods:{installments:1,excluded_payment_types:[{id:'ticket'},{id:'atm'}]}});
 if(String(pref.collector_id)!==seller)throw Error('seller_mismatch');
 const url=mpCheckoutUrl(pref.sandbox_init_point);
 await checked(db.from('billing_orders').update({provider_id:String(pref.id),payment_url:url,status:'pending'}).eq('id',order.id));
 if(kind==='monthly')await checked(db.from('billing_accounts').update({enrolled:true,auto_renew:false,price_cents:amount}).eq('student_id',profile.id));
 return {url,order_id:order.id,preference_id:String(pref.id)};
}
export async function syncMpPayment(db:any,mp:any,seller:string,id:string,eventId:string,eventName='MERCADOPAGO_PAYMENT'){
 if(!/^\d+$/.test(id))throw Error('invalid_payment_id');
 let payment:any;try{payment=await mp('/v1/payments/'+id);}catch(e:any){if(e.status===404)return {ignored:true,reason:'payment_not_found'};throw e;}
 if(payment.live_mode!==false||String(payment.collector_id)!==seller)throw Error('test_payment_required');
 if(!/^[0-9a-f-]{36}$/i.test(payment.external_reference||''))return {ignored:true,reason:'unmapped_reference'};
 const order:any=await checked(db.from('billing_orders').select('*').eq('id',payment.external_reference).eq('provider','mercadopago').eq('environment','sandbox').maybeSingle());
 if(!order)return {ignored:true,reason:'unmapped_order'};
 const account:any=await checked(db.from('billing_accounts').select('*').eq('student_id',order.student_id).single());
 if(!account.is_test||account.environment!=='sandbox'||payment.currency_id!=='BRL'||cents(payment.transaction_amount)!==order.amount_cents)throw Error('payment_mismatch');
 if(!/^\d+$/.test(String(payment.order?.id||'')))throw Error('merchant_order_missing');
 const merchant=await mp('/merchant_orders/'+payment.order.id);
 if(String(merchant.preference_id)!==order.provider_id)throw Error('preference_mismatch');
 let state=mpPaymentState(payment);
 const other:any=await checked(db.from('billing_payments').select('asaas_id').eq('order_id',order.id).eq('status','paid').neq('asaas_id','mp:'+id).maybeSingle());
 if(state==='paid'&&other)state='review';
 if(state==='paid'&&!Number.isFinite(Date.parse(payment.date_approved)))throw Error('approval_date_missing');
 await checked(db.rpc('billing_record_mp_payment',{event_id:eventId,event_name:eventName,payment:{asaas_id:'mp:'+id,student_id:order.student_id,order_id:order.id,amount_cents:order.amount_cents,status:state,due_date:order.period_start,period_end:order.period_end,paid_at:state==='paid'?payment.date_approved:null}}));
 return {payment_id:id,status:state,order_id:order.id};
}
export async function reconcileMpOrder(db:any,mp:any,seller:string,order:any){
 const list=await mp('/v1/payments/search?external_reference='+encodeURIComponent(order.id)+'&sort=date_created&criteria=desc&limit=30');
 for(const payment of list.results||[])await syncMpPayment(db,mp,seller,String(payment.id),'mp:reconcile:'+crypto.randomUUID(),'MERCADOPAGO_RECONCILE');
 return {checked:(list.results||[]).length};
}
