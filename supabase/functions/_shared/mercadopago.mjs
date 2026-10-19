export function mpPaymentState(p){
 if(Number(p.transaction_amount_refunded)>0||p.status==='refunded')return 'refunded';
 return {approved:'paid',pending:'pending',in_process:'pending',authorized:'review',in_mediation:'review',charged_back:'review',rejected:'failed',cancelled:'canceled'}[p.status]||'review';
}
export function mpCheckoutUrl(value){const u=new URL(value);if(u.protocol!=='https:'||u.hostname!=='sandbox.mercadopago.com.br'||!u.pathname.startsWith('/checkout/'))throw Error('unsafe_checkout_url');return u.href;}
export async function validateMpSignature({secret,signature,requestId,dataId,now=Date.now()}){
 if(!secret||typeof signature!=='string'||typeof requestId!=='string'||!requestId||typeof dataId!=='string'||!/^\d+$/.test(dataId))return false;
 const fields=Object.fromEntries(signature.split(',').map(s=>s.trim().split('=')));
 if(!/^\d{10,13}$/.test(fields.ts||'')||!/^\d{13,16}$/.test(String(now))||!/^([a-f0-9]{64})$/i.test(fields.v1||''))return false;
 const timestamp=Number(fields.ts)*(fields.ts.length===10?1000:1);
 if(Math.abs(now-timestamp)>300000)return false;
 const message=`id:${dataId};request-id:${requestId};ts:${fields.ts};`;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(message)));
 const expected=[...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');let diff=0;for(let i=0;i<64;i++)diff|=expected.charCodeAt(i)^fields.v1.toLowerCase().charCodeAt(i);return diff===0;
}
