(() => {
 'use strict';
 const form=document.querySelector('#onboarding');
 form.innerHTML=LG_ANAM.signupPages();
 document.querySelector('.steps').innerHTML=LG_ANAM.sections.map((_,i)=>'<i class="dot'+(i===0?' on':'')+'"></i>').join('');
 const pages=[...form.querySelectorAll('.page')],dots=[...document.querySelectorAll('.dot')];
 const back=document.querySelector('#back'),next=document.querySelector('#next'),status=document.querySelector('#err');
 const existing=form.elements.existing_access,guide=document.querySelector('#resumeGuide');
 let step=0,flow;
 const showStatus=text=>{status.textContent=text;};
 const bd=document.querySelector('#birth_day'),bm=document.querySelector('#birth_month'),by=document.querySelector('#birth_year');
 by.max=String(new Date().getFullYear());
 for(let d=1;d<=31;d++)bd.insertAdjacentHTML('beforeend','<option value="'+d+'">'+d+'</option>');
 function syncBirth(){
  const d=+bd.value,m=+bm.value,y=+by.value;
  if(!d||!m||!y||d>new Date(y,m,0).getDate()){form.elements.birth_date.value='';bd.setCustomValidity(d&&m&&y?'Confira o dia para o mês informado.':'');return;}
  bd.setCustomValidity('');form.elements.birth_date.value=String(y).padStart(4,'0')+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');
 }
 [bd,bm,by].forEach(x=>x.addEventListener('change',syncBirth));by.addEventListener('input',syncBirth);
 function show(){
  document.querySelector('#stepLabel').textContent='Etapa '+(step+1)+' de '+pages.length+' · '+LG_ANAM.sections[step].title;
  pages.forEach((p,i)=>p.classList.toggle('on',i===step));dots.forEach((d,i)=>d.classList.toggle('on',i<=step));
  back.style.visibility=step?'visible':'hidden';
  next.textContent=step===pages.length-1?(existing.checked?'Entrar e enviar anamnese':'Criar acesso e enviar'):'Continuar →';
 }
 existing.onchange=()=>{
  if(flow?.state().loginRequired)existing.checked=true;
  form.elements.confirm_password.required=!existing.checked;
  form.elements.confirm_password.disabled=existing.checked;
  form.elements.password.autocomplete=existing.checked?'current-password':'new-password';show();
 };
 function busy(value){
  // Preserve the submitted snapshot while requests are in flight.
  for(const field of form.elements)field.disabled=value;
  if(!value){form.elements.confirm_password.disabled=existing.checked;form.elements.email.readOnly=Boolean(flow?.state().email);show();}
 }
 try{
  const client=supabase.createClient(LG_CONFIG.supabaseUrl,LG_CONFIG.supabaseKey,{
   auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'lg-onboarding-isolated'},
   global:{fetch:(input,options)=>fetch(input,{...options,signal:AbortSignal.timeout(12000)})}
  });
  flow=LG_ONBOARDING.createFlow(client);
 }catch{showStatus('Não foi possível carregar o acesso. Atualize a página.');next.disabled=true;return;}
 back.onclick=()=>{if(!flow.state().busy&&step>0){step--;show();}};
 async function advance(){
  if(flow.state().busy||flow.state().completed)return;
  syncBirth();
  for(let i=0;i<=(step===pages.length-1?pages.length-1:step);i++){
   const invalid=[...pages[i].querySelectorAll('input,select,textarea')].find(x=>!x.disabled&&!x.checkValidity());
   if(invalid){step=i;show();invalid.reportValidity();return;}
  }
  if(step<pages.length-1){step++;show();scrollTo({top:0,behavior:'smooth'});return;}
  const values=Object.fromEntries(new FormData(form));
  busy(true);next.textContent='Conferindo acesso e enviando...';showStatus('');
  try{
   const result=await flow.submit(values);
   if(result.status==='completed'){
    form.elements.password.value=form.elements.confirm_password.value='';
    form.style.display='none';document.querySelector('#stepLabel').hidden=true;document.querySelector('.steps').style.display='none';document.querySelector('#success').style.display='block';
   }else if(result.status==='pending_confirmation'){
    showStatus('Envio da anamnese pendente. Confirme seu e-mail (ou entre, se já confirmou) e volte a esta página para clicar em “Entrar e enviar anamnese”. Não feche esta página: suas respostas ainda não foram salvas.');
   }
  }catch(e){showStatus(flow.message(e));}
  finally{
   if(flow.state().loginRequired){existing.checked=true;existing.onchange();guide.hidden=false;}
   busy(false);
  }
 }
 next.onclick=advance;
 form.noValidate=true;form.onsubmit=event=>{event.preventDefault();advance();};
 window.addEventListener('beforeunload',event=>{if(flow.state().loginRequired&&!flow.state().completed){event.preventDefault();event.returnValue='';}});
 show();
})();
