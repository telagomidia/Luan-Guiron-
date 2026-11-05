(() => {
 'use strict';
 const sidebar=document.querySelector('#adminSidebar'),dialog=document.querySelector('#adminMenuDialog'),toggle=document.querySelector('#adminMenuToggle'),shell=document.querySelector('.shell'),view=document.querySelector('#view');
 if(!sidebar||!dialog||!toggle)return;
 const mobile=matchMedia('(max-width:850px)');
 function close(navigate=false){
  if(!dialog.open)return;
  dialog.close();toggle.setAttribute('aria-expanded','false');document.body.classList.remove('admin-menu-open');
  if(navigate)view.focus({preventScroll:true});else toggle.focus({preventScroll:true});
 }
 function layout(){
  close();
  if(mobile.matches)dialog.append(sidebar);else shell.prepend(sidebar);
 }
 toggle.addEventListener('click',()=>{if(dialog.open)return close();dialog.showModal();toggle.setAttribute('aria-expanded','true');document.body.classList.add('admin-menu-open');(sidebar.querySelector('[aria-current="page"]')||sidebar.querySelector('button')).focus();});
 document.querySelector('#adminMenuClose').addEventListener('click',()=>close());
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();});
 document.querySelector('#adminCopySignup').addEventListener('click',async()=>{
  const status=document.querySelector('#adminCopyStatus');
  try{await navigator.clipboard.writeText(window.LG_URLS.signup());status.textContent='Link copiado.';}
  catch{status.textContent='Não foi possível copiar. Tente novamente.';}
 });
 window.LG_ADMIN_MENU=Object.freeze({close});mobile.addEventListener('change',layout);layout();
})();
