import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import {mpClient,mpSeller} from '../_shared/mercadopago-api.ts';
import {validateMpSignature} from '../_shared/mercadopago.mjs';
import {syncMpPayment} from '../_shared/mp-checkout.ts';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
Deno.serve(async req=>{
 const reply=(v:unknown,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'Content-Type':'application/json'}});
 if(req.method!=='POST')return reply({},405);
 const secret=Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET');if(!secret)return reply({error:'webhook_not_configured'},503);
 try{
  const url=new URL(req.url),id=url.searchParams.get('data.id')||'',signature=req.headers.get('x-signature')||'',requestId=req.headers.get('x-request-id')||'';
  if(!await validateMpSignature({secret,signature,requestId,dataId:id}))return reply({error:'invalid_signature'},401);
  const body=await req.json();if(body.type!=='payment'||String(body.data?.id)!==id)return reply({error:'invalid_notification'},400);
  const mp=mpClient(Deno.env.get('MERCADOPAGO_ENVIRONMENT')||'',Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')||''),seller=await mpSeller(mp);
  const result=await syncMpPayment(db,mp,seller,id,'mp:webhook:'+requestId+':'+signature,body.action==='payment.created'?'MERCADOPAGO_CREATED':'MERCADOPAGO_UPDATED');
  return reply({received:true,ignored:result.ignored===true});
 }catch{return reply({error:'webhook_unavailable'},503);}
});
