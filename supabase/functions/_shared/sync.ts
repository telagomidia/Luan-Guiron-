import {checked} from './asaas.ts';
import {cents,paymentState,plusDays} from '../billing/model.mjs';
export async function syncPayment(db:any,asaas:any,id:string,eventId:string,eventName:string,environment:string){
 const p=await asaas('/payments/'+encodeURIComponent(id));
 const account:any=await checked(db.from('billing_accounts').select('*').eq('asaas_customer_id',p.customer).maybeSingle());
 // Ignore unrelated Asaas customers rather than stopping the entire webhook queue.
 if(!account)return {ignored:true,reason:'unmapped_customer'};
 if(account.environment!==environment)throw Error('environment_mismatch');
 let order:any=null;
 if(/^[0-9a-f-]{36}$/i.test(p.externalReference||''))order=await checked(db.from('billing_orders').select('*').eq('id',p.externalReference).eq('student_id',account.student_id).maybeSingle());
 if(!order)order=await checked(db.from('billing_orders').select('*').eq('provider_id',p.id).eq('student_id',account.student_id).maybeSingle());
 if(!order)return {ignored:true,reason:'unmapped_order'};
 if(order.environment!==environment||cents(p.value)!==order.amount_cents)throw Error('payment_mismatch');
 if(eventName==='PAYMENT_CREDIT_CARD_CAPTURE_REFUSED')await checked(db.from('billing_attempts').update({status:'declined'}).eq('order_id',order.id).in('status',['reserved','unknown']));
 const state=p.deleted?'canceled':paymentState(p.status);
 // Keep full timestamp from the first verified confirmation. Later settlement must not add days.
 await checked(db.rpc('billing_record_payment',{event_id:eventId,event_name:eventName,payment:{asaas_id:p.id,student_id:account.student_id,order_id:order.id,subscription_id:p.subscription||null,amount_cents:cents(p.value),status:state,due_date:p.dueDate,period_end:plusDays(p.dueDate,31).slice(0,10),paid_at:state==='paid'?new Date().toISOString():null}}));
 if(p.creditCard?.creditCardToken&&p.customer===account.asaas_customer_id){
  await checked(db.from('billing_card_tokens').upsert({student_id:account.student_id,customer_id:p.customer,token:p.creditCard.creditCardToken,environment}));
 }
 return {payment_id:p.id,status:state,order_id:order.id};
}
