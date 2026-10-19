import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import {checked} from '../_shared/asaas.ts';
import {mpClient,mpSeller} from '../_shared/mercadopago-api.ts';
import {authorizeJob} from '../_shared/jobs.ts';
import {createMpCheckout,reconcileMpOrder} from '../_shared/mp-checkout.ts';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
const origins=['https://luanguiron.com.br','https://telagomidia.github.io','https://luan-guiron.telagomidia.workers.dev'];
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'',headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':origins.includes(origin)?origin:origins[0],'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Vary':'Origin'};
 const reply=(v:unknown,s=200)=>new Response(JSON.stringify(v),{status:s,headers});
 if(req.method==='OPTIONS')return new Response(null,{headers});if(req.method!=='POST')return reply({},405);
 try{
  const body=await req.json();let profile:any,job:any;
  if(body.job_id){job=await authorizeJob(db,body,'sandbox');if(!job||job.result?.purpose!=='mercadopago_sandbox')return reply({error:'unauthorized'},401);}
  else {const jwt=req.headers.get('authorization')?.replace(/^Bearer /i,'');const {data:{user},error}=await db.auth.getUser(jwt||'');if(error||!user)return reply({},401);profile=await checked(db.from('profiles').select('*').eq('id',user.id).eq('role','student').eq('active',true).single());}
  const env=Deno.env.get('MERCADOPAGO_ENVIRONMENT')||'',mp=mpClient(env,Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')||''),seller=await mpSeller(mp);
  const settings:any=await checked(db.from('billing_settings').select('*').single());
  if(job&&body.action==='diagnose')return reply({environment:env,token_configured:true,test_seller_verified:true,webhook_secret_configured:!!Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET'),real_billing_enabled:settings.enabled,webhook_url:Deno.env.get('SUPABASE_URL')+'/functions/v1/mercadopago-webhook'});
  if(job&&body.action==='prepare_test'){
   const lock:any=await checked(db.from('billing_jobs').update({state:'creating'}).eq('id',job.id).eq('state','ready').select('id').maybeSingle());if(!lock)return reply({error:'already_prepared'},409);
   const {data,error}=await db.auth.admin.createUser({email:'mp-test-'+crypto.randomUUID()+'@example.invalid',password:crypto.randomUUID()+crypto.randomUUID(),email_confirm:true,user_metadata:{full_name:'TESTE MERCADO PAGO — NÃO É ALUNO'}});if(error)throw error;
   const sid=data.user.id;
   await checked(db.from('profiles').update({full_name:'TESTE MERCADO PAGO — NÃO É ALUNO',active:true}).eq('id',sid));
   await checked(db.from('billing_accounts').insert({student_id:sid,is_test:true,environment:'sandbox'}));
   await checked(db.from('billing_jobs').update({result:{...job.result,student_id:sid}}).eq('id',job.id));
   await checked(db.from('billing_settings').update({mercadopago_sandbox_enabled:true}).eq('id',true));settings.mercadopago_sandbox_enabled=true;
   profile=await checked(db.from('profiles').select('*').eq('id',sid).single());
   const account:any=await checked(db.from('billing_accounts').select('*').eq('student_id',sid).single());
   const checkout=await createMpCheckout(db,mp,seller,profile,account,settings);
   await checked(db.from('billing_jobs').update({state:'prepared',result:{...job.result,student_id:sid,...checkout}}).eq('id',job.id));return reply(checkout);
  }
  if(job){
   const sid=job.result.student_id;
   if(body.action==='close'){
    await checked(db.from('billing_settings').update({mercadopago_sandbox_enabled:false}).eq('id',true));
    if(sid){await checked(db.from('billing_accounts').update({enrolled:false,auto_renew:false}).eq('student_id',sid));await checked(db.from('profiles').update({active:false}).eq('id',sid));await db.auth.admin.updateUserById(sid,{ban_duration:'876000h'});}
    await checked(db.from('billing_jobs').update({state:'closed',expires_at:new Date().toISOString()}).eq('id',job.id));return reply({closed:true});
   }
   if(!sid)return reply({error:'not_prepared'},409);profile=await checked(db.from('profiles').select('*').eq('id',sid).single());
  }
  const account:any=await checked(db.from('billing_accounts').select('*').eq('student_id',profile.id).single());
  if(!account.is_test||account.environment!=='sandbox'||!settings.mercadopago_sandbox_enabled)throw Error('test_account_required');
  if(body.action==='status'||body.action==='reconcile'){
   const orders:any=await checked(db.from('billing_orders').select('*').eq('student_id',profile.id).eq('provider','mercadopago').eq('environment','sandbox').order('created_at',{ascending:false}).limit(20));
   for(const order of orders)await reconcileMpOrder(db,mp,seller,order);
   const current:any=await checked(db.from('billing_accounts').select('access_until').eq('student_id',profile.id).single());return reply({checked:true,access_until:current.access_until});
  }
  return reply(await createMpCheckout(db,mp,seller,profile,account,settings,body.service_id));
 }catch(e:any){const safe=['mercadopago_not_configured','test_seller_required','test_account_required','dedicated_test_account_required','exempt','provider_mismatch','order_requires_reconciliation'];return reply({error:safe.includes(e?.message)?e.message:'mercadopago_unavailable',provider_status:e?.status},409);}
});
