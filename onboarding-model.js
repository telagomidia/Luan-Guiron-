/* Clinical answers remain in the form until an authenticated write is confirmed. */
(() => {
 'use strict';
 const failure=(code,message)=>Object.assign(new Error(message||code),{code});
 const normalizeEmail=value=>String(value||'').trim().toLowerCase();
 function validate(values){
  const email=normalizeEmail(values.email),password=String(values.password||'');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw failure('validation','Informe um e-mail válido.');
  if(password.length<8||password.length>128)throw failure('validation','Use uma senha de 8 a 128 caracteres.');
  if(values.existing_access!=='on'&&password!==values.confirm_password)throw failure('validation','As senhas não são iguais.');
  const name=String(values.full_name||'').trim(),birth=String(values.birth_date||'');
  if(!name||name.length>200)throw failure('validation','Confira o nome completo.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(birth)||!Number.isFinite(Date.parse(birth))||new Date(birth).toISOString().slice(0,10)!==birth||birth>new Date().toISOString().slice(0,10)||birth<'1900-01-01')throw failure('validation','Confira a data de nascimento.');
  if(!['male','female'].includes(values.sex))throw failure('validation','Informe o sexo biológico.');
  // Reuse the same health-field validation as the student portal, before creating access.
  LG_PORTAL.anamPayload(values,'validation','validation');
  return{email,password,meta:{full_name:name,birth_date:birth,sex:values.sex}};
 }
 function createFlow(client){
  let busy=false,completed=false,loginRequired=false,email=null,uid=null;
  const id=crypto.randomUUID();
  const state=()=>({busy,completed,loginRequired,email});
  async function submit(values){
   if(busy||completed)return{status:completed?'completed':'busy'};
   const credentials=validate({...values,existing_access:loginRequired?'on':values.existing_access});
   if(email&&credentials.email!==email)throw failure('identity_changed','Use o mesmo e-mail do acesso criado.');
   busy=true;
   try{
    if(!uid){
     const login=loginRequired||values.existing_access==='on';
     // A lost signup response may have created the account. Do not silently create again.
     if(!login)loginRequired=true;
     const result=await LG_AUTH.deadline(()=>login?client.auth.signInWithPassword({email:credentials.email,password:credentials.password}):client.auth.signUp({email:credentials.email,password:credentials.password,options:{data:credentials.meta}}));
     if(result.error){
      const ambiguous=result.error.code==='request_timeout'||result.error.name==='AuthRetryableFetchError'||result.error.status>=500||result.error.status===0;
      if(!login&&!ambiguous&&!['user_already_exists','email_exists'].includes(result.error.code))loginRequired=false;
      throw result.error;
     }
     if(!result.data?.session||!result.data?.user?.id){email=credentials.email;return{status:'pending_confirmation'};}
     uid=result.data.user.id;email=credentials.email;
    }
    const identity=await LG_AUTH.deadline(()=>client.auth.getUser());
    if(identity.error){uid=null;throw identity.error;}
    if(identity.data?.user?.id!==uid||normalizeEmail(identity.data?.user?.email)!==email){uid=null;throw failure('identity_changed','O acesso não corresponde ao aluno informado. Entre novamente.');}
    const api=LG_PORTAL.createApi(client,uid),profile=await api.profile();
    if(profile?.id!==uid||profile.role!=='student')throw failure('profile_role_invalid');
    if(profile.active!==true)throw failure('profile_inactive');
    // Do not overwrite an anamnesis previously submitted through another page/device.
    const existing=await api.anamnesis();
    if(existing&&existing.id!==id)throw failure('existing_anam','Você já tem uma anamnese enviada. Abra sua área LG para consultar ou editar.');
    await api.saveAnam(values,id,existing?.answers||{});
    completed=true;return{status:'completed'};
   }finally{busy=false;}
  }
  function message(e){
   if(['validation','identity_changed','existing_anam'].includes(e?.code))return e.message;
   if(e?.code==='email_not_confirmed')return 'Confirme seu e-mail pelo link recebido e depois clique em “Entrar e enviar anamnese”. As respostas continuam aqui.';
   if(e?.code==='user_already_exists'||e?.code==='email_exists')return 'Se você já tem acesso, entre com seu e-mail e senha para enviar a anamnese.';
   if(e?.code==='42501')return 'Não foi possível salvar com as permissões desta conta. As respostas continuam no formulário; entre em contato com o professor.';
   if(e?.code==='unconfirmed'||e?.code==='request_timeout')return 'Não foi possível confirmar o envio. Suas respostas continuam aqui; tente novamente sem fechar esta página.';
   return LG_AUTH.message(e)+' As respostas continuam no formulário; não feche esta página.';
  }
  return Object.freeze({submit,state,message});
 }
 window.LG_ONBOARDING=Object.freeze({validate,createFlow});
})();
