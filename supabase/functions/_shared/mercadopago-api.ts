export function mpClient(env:string,key:string){
 if(env!=='sandbox'||!key)throw Error('mercadopago_not_configured');
 return async(path:string,method='GET',body?:unknown)=>{
  const response=await fetch('https://api.mercadopago.com'+path,{method,headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});
  const data=await response.json();if(!response.ok)throw Object.assign(Error('mercadopago_request_failed'),{status:response.status});return data;
 };
}
export async function mpSeller(mp:any){const user=await mp('/users/me');if(!user.tags?.includes('test_user')||user.site_id!=='MLB')throw Error('test_seller_required');return String(user.id);}
