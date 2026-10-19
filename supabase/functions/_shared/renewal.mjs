import {retryDay,paymentState} from '../billing/model.mjs';
export function renewalDecision({account,order,payment,attempts=[],now=Date.now()}){
 if(account.exempt||!account.enrolled||!account.auto_renew)return {action:'skip'};
 const day=retryDay(account.access_until,now);
 if(day===null)return {action:'skip'};
 if(order&&(order.method!=='CREDIT_CARD'||!['pending','overdue'].includes(order.status)))return {action:'skip'};
 if(payment?.billingType&&payment.billingType!=='CREDIT_CARD')return {action:'skip'};
 if(payment&&(payment.deleted||!['pending','overdue'].includes(paymentState(payment.status))))return {action:'reconcile'};
 if(attempts.some(a=>a.status==='reserved'||a.status==='unknown'))return {action:'reconcile'};
 if(attempts.some(a=>a.attempt_day===day))return {action:'skip'};
 return {action:'attempt',day};
}
