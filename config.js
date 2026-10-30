window.LG_CONFIG={supabaseUrl:"https://ziunjhebdkqdmvsrjxhm.supabase.co",supabaseKey:"sb_publishable_XYbldUl0dXkaf9C9XLMDZA_2cG26rHC"};
window.LG_URLS={
  origin:'https://luanguiron.com.br',
  login:()=> 'https://luanguiron.com.br/',
  signup:()=> 'https://luanguiron.com.br/cadastro',
  password:()=> 'https://luanguiron.com.br/senha',
  portal:()=> 'https://luanguiron.com.br/portal',
  isAdmin:(pathname=location.pathname)=>/\/admin(?:\.html)?\/?$/.test(pathname)
};
if(LG_URLS.isAdmin()){
 window.LG_ADMIN_READY=new Promise((resolve,reject)=>{
  const start=async()=>{
   try{
    for(const src of ['./student-management.js?v=10','./student-removal.js?v=2','./student-alerts.js?v=1','./training-import.js?v=2','./training-pdf.js?v=1','./plan-management.js?v=2','./training-ui.js?v=2','./training-context.js?v=1','./training-context-ui.js?v=1','./student-access.js?v=2']){
     await new Promise((loaded,failed)=>{
      const script=document.createElement('script');let timer;
      const finish=fn=>{clearTimeout(timer);script.onload=script.onerror=null;fn();};
      script.src=src;script.onload=()=>finish(loaded);
      script.onerror=()=>finish(()=>failed(Object.assign(Error('Não foi possível carregar o painel. Atualize a página.'),{code:'admin_modules_unavailable'})));
      timer=setTimeout(()=>{script.remove();finish(()=>failed(Object.assign(Error('O painel demorou para carregar. Confira a conexão e atualize a página.'),{code:'admin_modules_unavailable'})));},15000);
      document.body.appendChild(script);
     });
    }
    resolve();
   }catch(error){reject(error);}
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 });
}
