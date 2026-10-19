export function asaasClient(env:string,key:string){
 if(!['sandbox','production'].includes(env)||!key)throw Error('asaas_not_configured');
 const base=env==='sandbox'?'https://api-sandbox.asaas.com/v3':'https://api.asaas.com/v3';
 return async(path:string,method='GET',payload?:unknown)=>{
  const r=await fetch(base+path,{method,headers:{access_token:key,'Content-Type':'application/json','User-Agent':'LuanGuironBilling/2.0'},body:payload?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(method==='POST'?65000:20000)});
  const data=await r.json();if(!r.ok){const e=Object.assign(Error('asaas_request_failed'),{status:r.status,codes:(data.errors||[]).map((x:any)=>String(x.code)),descriptions:(data.errors||[]).map((x:any)=>String(x.description))});throw e;}return data;
 };
}
export async function checked<T>(operation:PromiseLike<{data:T,error:any}>):Promise<T>{const {data,error}=await operation;if(error)throw error;return data;}
export function paymentUrl(value:string){const u=new URL(value);if(u.protocol!=='https:'||!(u.hostname==='asaas.com'||u.hostname.endsWith('.asaas.com')))throw Error('invalid_payment_url');return value;}
