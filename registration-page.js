(() => {
  'use strict';
  const form=document.querySelector('#registration'),status=document.querySelector('#registrationStatus'),submit=form.querySelector('[type="submit"]'),success=document.querySelector('#registrationSuccess');
  let flow,redirect;
  const bd=form.querySelector('#birth_day'),bm=form.querySelector('#birth_month'),by=form.querySelector('#birth_year');
  by.max=String(new Date().getFullYear());
  for(let day=1;day<=31;day++)bd.insertAdjacentHTML('beforeend','<option value="'+day+'">'+day+'</option>');
  function syncBirth(){const day=+bd.value,month=+bm.value,year=+by.value;const valid=day&&month&&year&&day<=new Date(year,month,0).getDate();bd.setCustomValidity(day&&month&&year&&!valid?'Confira o dia para o mês informado.':'');form.elements.birth_date.value=valid?String(year).padStart(4,'0')+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0'):'';}
  [bd,bm,by].forEach(field=>field.addEventListener('change',syncBirth));by.addEventListener('input',syncBirth);
  try{
    const client=supabase.createClient(LG_CONFIG.supabaseUrl,LG_CONFIG.supabaseKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'lg-registration-isolated'},global:{fetch:(input,options)=>fetch(input,{...options,signal:AbortSignal.timeout(12000)})}});
    flow=LG_REGISTRATION.create(client);
  }catch{status.textContent='Não foi possível carregar o cadastro. Atualize a página.';submit.disabled=true;return;}
  form.onsubmit=async event=>{
    event.preventDefault();syncBirth();if(flow.state().busy||flow.state().submitted||flow.state().uncertain||!form.reportValidity())return;
    const values=Object.fromEntries(new FormData(form)),controls=[...form.elements];
    controls.forEach(field=>field.disabled=true);status.textContent='Criando seu acesso…';
    try{
      const result=await flow.register(values);
      if(result.status!=='submitted')return;
      form.elements.password.value=form.elements.confirm_password.value='';form.hidden=true;success.hidden=false;
      success.querySelector('[data-email]').textContent=result.email;
      status.textContent='';success.focus();
      redirect=setTimeout(()=>location.replace(LG_URLS.login()),5000);
    }catch(error){status.textContent=flow.message(error);if(!flow.state().uncertain)controls.forEach(field=>field.disabled=false);}
  };
  window.addEventListener('pagehide',()=>clearTimeout(redirect),{once:true});
})();
