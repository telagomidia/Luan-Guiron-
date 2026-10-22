(() => {
  'use strict';
  const failure=(code,message)=>Object.assign(new Error(message||code),{code});
  function validate(values){
    const email=String(values.email||'').trim().toLowerCase(),name=String(values.full_name||'').trim(),password=String(values.password||'');
    if(!name||name.length>160)throw failure('validation','Informe seu nome completo.');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw failure('validation','Informe um e-mail válido.');
    if(password.length<8||password.length>128)throw failure('validation','Use uma senha de 8 a 128 caracteres.');
    if(password!==values.confirm_password)throw failure('validation','As senhas não são iguais.');
    const birth=String(values.birth_date||''),sex=String(values.sex||'');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(birth)||!Number.isFinite(Date.parse(birth))||new Date(birth).toISOString().slice(0,10)!==birth||birth<'1900-01-01'||birth>new Date().toISOString().slice(0,10))throw failure('validation','Confira a data de nascimento.');
    if(!['male','female'].includes(sex))throw failure('validation','Informe o sexo biológico.');
    return{email,password,full_name:name,birth_date:birth,sex};
  }
  function create(client){
    let busy=false,submitted=false,uncertain=false;
    return Object.freeze({
      state:()=>({busy,submitted,uncertain}),
      async register(values){
        if(busy||submitted||uncertain)return{status:submitted?'submitted':busy?'busy':'uncertain'};
        const v=validate(values);busy=true;
        try{
          const result=await LG_AUTH.deadline(()=>client.auth.signUp({email:v.email,password:v.password,options:{data:{full_name:v.full_name,birth_date:v.birth_date,sex:v.sex},emailRedirectTo:LG_URLS.login()}}));
          if(result.error)throw result.error;
          if(!result.data?.user?.id)throw failure('request_timeout');
          submitted=true;return{status:'submitted',email:v.email};
        }catch(error){
          uncertain=error?.code==='request_timeout'||error?.name==='AuthRetryableFetchError'||error?.name==='AbortError'||error?.name==='TypeError'||error?.status>=500||error?.status===0;
          throw error;
        }finally{busy=false;}
      },
      message(error){
        if(error?.code==='validation')return error.message;
        if(uncertain)return 'Não foi possível confirmar a resposta do serviço. Confira seu e-mail antes de repetir o cadastro. Se a conta já foi criada, confirme o link e entre pelo Login.';
        if(['user_already_exists','email_exists'].includes(error?.code))return 'Você já pode usar o Login com sua conta existente. Confira também seu e-mail de confirmação.';
        return LG_AUTH.message(error);
      }
    });
  }
  window.LG_REGISTRATION=Object.freeze({validate,create});
})();
