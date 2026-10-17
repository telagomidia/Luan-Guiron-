import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { canCharge, validCpf, today, monthEnd } from './model.mjs';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
const origins=['https://luanguiron.com.br','https://telagomidia.github.io','https://luan-guiron.telagomidia.workers.dev'];
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'',headers={'Content-Type':'application/json','Access-Control-Allow-Origin':origins.includes(origin)?origin:origins[0],'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Vary':'Origin'};
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method!=='POST')return reply({error:'method_not_allowed'},405);
 try{
  const jwt=req.headers.get('authorization')?.replace(/^Bearer /i,'');
  if(!jwt)return reply({error:'unauthorized'},401);
  const {data:{user},error:authError}=await db.auth.getUser(jwt);
  if(authError||!user)return reply({error:'unauthorized'},401);
  const {data:profile,error:profileError}=await db.from('profiles').select('id,full_name,role,active').eq('id',user.id).single();
  if(profileError||!profile?.active||profile.role!=='student')return reply({error:'forbidden'},403);
  const body=await req.json();if(!['PIX','CREDIT_CARD'].includes(body.method))return reply({error:'invalid_method'},400);
  const kind=body.service_id?'assessment':'monthly';
  const {data:settings,error:settingsError}=await db.from('billing_settings').select('*').single();if(settingsError)throw settingsError;
  const {data:account,error:accountError}=await db.from('billing_accounts').select('*').eq('student_id',user.id).maybeSingle();if(accountError)throw accountError;
  canCharge(settings,account,kind);
  if(Deno.env.get('BILLING_RELEASE_APPROVED')!=='true')throw Error('billing_disabled');
  const env=settings.environment;
  if(Deno.env.get('ASAAS_ENVIRONMENT')!==env)throw Error('environment_mismatch');
  const key=Deno.env.get('ASAAS_API_KEY');if(!key)throw Error('asaas_not_configured');
  const base=env==='production'?'https://api.asaas.com/v3':'https://api-sandbox.asaas.com/v3';
  async function asaas(path:string,method='GET',payload?:unknown){const r=await fetch(base+path,{method,headers:{access_token:key!,'Content-Type':'application/json','User-Agent':'LuanGuironBilling/1.0'},body:payload?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('asaas_request_failed');return r.json();}
  let amount=settings.monthly_cents,name='Treinamento personalizado — mensalidade';
  if(kind==='assessment'){const {data:service,error}=await db.from('billing_services').select('*').eq('id',body.service_id).eq('active',true).single();if(error||!service)return reply({error:'service_unavailable'},400);amount=service.price_cents;name=service.name;}
  if(kind==='monthly'&&account?.asaas_subscription_id)return reply({error:'subscription_exists'},409);
  const start=today(),end=monthEnd(start);
  // Reserve before any remote POST. Ambiguous timeouts stay reserved for reconciliation.
  const {data:order,error:reserveError}=await db.from('billing_orders').insert({student_id:user.id,kind,service_id:body.service_id||null,amount_cents:amount,method:body.method,period_start:start,period_end:end}).select().single();
  if(reserveError)return reply({error:'existing_order_or_retry_pending'},409);
  let customer=account?.asaas_customer_id;
  if(!customer){if(!validCpf(body.cpf)){await db.from('billing_orders').update({status:'failed'}).eq('id',order.id);return reply({error:'invalid_cpf'},400);}
   const created=await asaas('/customers','POST',{name:profile.full_name,email:user.email,cpfCnpj:body.cpf.replace(/\D/g,''),externalReference:user.id});customer=created.id;
   const {error}=await db.from('billing_accounts').upsert({student_id:user.id,asaas_customer_id:customer,exempt:account?.exempt||false});if(error)throw error;
  }
  const returnUrl='https://luanguiron.com.br/portal.html#billing';
  let provider,url;
  if(body.method==='PIX'){
   provider=await asaas('/payments','POST',{customer,billingType:'PIX',value:amount/100,dueDate:start,description:name,externalReference:order.id});url=provider.invoiceUrl;
  }else{
   provider=await asaas('/checkouts','POST',{customer,billingTypes:['CREDIT_CARD'],chargeTypes:[kind==='monthly'?'RECURRENT':'DETACHED'],minutesToExpire:60,externalReference:order.id,callback:{successUrl:returnUrl,cancelUrl:returnUrl,expiredUrl:returnUrl},items:[{name,description:name,quantity:1,value:amount/100}],...(kind==='monthly'?{subscription:{cycle:'MONTHLY',nextDueDate:start+' 12:00:00'}}:{})});
   url=(env==='production'?'https://asaas.com':'https://sandbox.asaas.com')+'/checkoutSession/show?id='+encodeURIComponent(provider.id);
  }
  const parsed=new URL(url);if(parsed.protocol!=='https:'||!(parsed.hostname==='asaas.com'||parsed.hostname.endsWith('.asaas.com')))throw Error('invalid_payment_url');
  const {error:saveError}=await db.from('billing_orders').update({provider_id:provider.id,payment_url:url,status:'pending'}).eq('id',order.id);if(saveError)throw saveError;
  return reply({url,order_id:order.id});
 }catch(error){const code=error instanceof Error?error.message:'billing_unavailable';const allowed=['billing_disabled','billing_not_started','exempt','asaas_not_configured','environment_mismatch'];return reply({error:allowed.includes(code)?code:'billing_unavailable'},allowed.includes(code)?409:503);}
});
