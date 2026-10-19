import {checked,paymentUrl} from './asaas.ts';
import {today,plusDays,validCpf} from '../billing/model.mjs';
export async function createCharge(db:any,asaas:any,profile:any,account:any,settings:any,body:any){
 const kind=body.service_id?'assessment':'monthly';
 if(!['PIX','CREDIT_CARD'].includes(body.method))throw Error('invalid_method');
 if(kind==='monthly'&&account?.exempt)throw Error('exempt');
 if(account?.asaas_customer_id&&account.environment!==settings.environment)throw Error('environment_mismatch');
 if(account?.asaas_subscription_id)throw Error('legacy_subscription_requires_review');
 let amount=account?.price_cents||settings.monthly_cents,name='Treinamento personalizado — 31 dias';
 if(kind==='assessment'){const service:any=await checked(db.from('billing_services').select('*').eq('id',body.service_id).eq('active',true).single());amount=service.price_cents;name=service.name;}
 let existingQuery=db.from('billing_orders').select('*').eq('student_id',profile.id).eq('kind',kind).in('status',['creating','pending','overdue','review']).order('created_at',{ascending:false}).limit(1);
 if(kind==='assessment')existingQuery=existingQuery.eq('service_id',body.service_id);
 const existing:any=await checked(existingQuery.maybeSingle());
 if(existing){if(existing.method!==body.method)throw Error('existing_payment_method');if(existing.payment_url)return {url:paymentUrl(existing.payment_url),order_id:existing.id,reused:true};throw Error('order_requires_reconciliation');}
 if(!account?.asaas_customer_id&&!validCpf(body.cpf))throw Error('invalid_cpf');
 const start=today(),end=plusDays(start,31).slice(0,10);
 const order:any=await checked(db.from('billing_orders').insert({student_id:profile.id,kind,service_id:body.service_id||null,amount_cents:amount,method:body.method,period_start:start,period_end:end,environment:settings.environment,cycle_due_at:account?.access_until||new Date().toISOString(),auto_renew_consent:kind==='monthly'&&body.method==='CREDIT_CARD'&&body.auto_renew===true}).select().single());
 let customer=account?.asaas_customer_id;
 if(!customer){const c=await asaas('/customers','POST',{name:profile.full_name,...(profile.email?{email:profile.email}:{}),cpfCnpj:body.cpf.replace(/\D/g,''),externalReference:profile.id,notificationDisabled:account?.is_test===true});customer=c.id;
  await checked(db.from('billing_accounts').upsert({student_id:profile.id,asaas_customer_id:customer,environment:settings.environment,exempt:account?.exempt||false,is_test:account?.is_test||false,enrolled:kind==='monthly',price_cents:kind==='monthly'?amount:null,auto_renew:kind==='monthly'&&body.method==='CREDIT_CARD'&&body.auto_renew===true}));
 }else if(kind==='monthly')await checked(db.from('billing_accounts').update({enrolled:true,price_cents:amount,auto_renew:body.method==='CREDIT_CARD'&&body.auto_renew===true}).eq('student_id',profile.id));
 // One provider payment per cycle for Pix and card. Card details stay on the hosted invoice.
 const p=await asaas('/payments','POST',{customer,billingType:body.method,value:amount/100,dueDate:start,description:name,externalReference:order.id});
 const url=paymentUrl(p.invoiceUrl);
 await checked(db.from('billing_orders').update({provider_id:p.id,payment_url:url,status:'pending'}).eq('id',order.id));
 return {url,order_id:order.id,payment_id:p.id};
}
