import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import {asaasClient,checked} from '../_shared/asaas.ts';
import {createCharge} from '../_shared/charges.ts';
import {today} from './model.mjs';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
const origins=['https://luanguiron.com.br','https://telagomidia.github.io','https://luan-guiron.telagomidia.workers.dev'];
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'',headers={'Content-Type':'application/json','Access-Control-Allow-Origin':origins.includes(origin)?origin:origins[0],'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Vary':'Origin'};
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{headers});if(req.method!=='POST')return reply({error:'method_not_allowed'},405);
 try{
  const jwt=req.headers.get('authorization')?.replace(/^Bearer /i,'');if(!jwt)return reply({error:'unauthorized'},401);
  const {data:{user},error}=await db.auth.getUser(jwt);if(error||!user)return reply({error:'unauthorized'},401);
  const profile:any=await checked(db.from('profiles').select('id,full_name,email,role,active').eq('id',user.id).single());
  if(!profile.active||profile.role!=='student')return reply({error:'forbidden'},403);
  const body=await req.json();
  if(body.action==='capabilities')return reply({card_enabled:Deno.env.get('ASAAS_ENVIRONMENT')==='sandbox'||Deno.env.get('BILLING_CARD_APPROVED')==='true'});
  if(body.method==='CREDIT_CARD'&&Deno.env.get('ASAAS_ENVIRONMENT')==='production'&&Deno.env.get('BILLING_CARD_APPROVED')!=='true')throw Error('card_not_available');
  if(body.action==='stop_auto_renew'){await checked(db.from('billing_accounts').update({auto_renew:false}).eq('student_id',user.id));return reply({success:true});}
  const settings:any=await checked(db.from('billing_settings').select('*').single());
  const account:any=await checked(db.from('billing_accounts').select('*').eq('student_id',user.id).maybeSingle());
  const sandbox=settings.environment==='sandbox'&&settings.sandbox_enabled&&account?.is_test;
  if(!sandbox&&(!settings.enabled||settings.environment!=='production'||Deno.env.get('BILLING_RELEASE_APPROVED')!=='true'))throw Error('billing_disabled');
  if(!sandbox&&(!settings.starts_on||today()<settings.starts_on))throw Error('billing_not_started');
  if(Deno.env.get('ASAAS_ENVIRONMENT')!==settings.environment)throw Error('environment_mismatch');
  const asaas=asaasClient(settings.environment,Deno.env.get('ASAAS_API_KEY')||'');
  return reply(await createCharge(db,asaas,profile,account,settings,body));
 }catch(error){const code=error instanceof Error?error.message:'billing_unavailable';const allowed=['card_not_available','billing_disabled','billing_not_started','exempt','asaas_not_configured','environment_mismatch','invalid_cpf','invalid_method','existing_payment_method','order_requires_reconciliation','legacy_subscription_requires_review'];return reply({error:allowed.includes(code)?code:'billing_unavailable'},allowed.includes(code)?409:503);}
});
