(() => {
 'use strict';
 const reduce=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 function animate(el,name='lg-enter'){
  if(!el||reduce()||!el.isConnected)return;
  el.classList.remove(name);void el.offsetWidth;el.classList.add(name);
 }
 function celebrate(host,large=false){
  if(!host||host.querySelector('.lg-success-mark'))return;
  const mark=document.createElement('div');mark.className='lg-success-mark';mark.setAttribute('aria-hidden','true');
  mark.innerHTML='<svg viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="29" fill="#edf8f1"/><path d="m18 32 10 10 19-21" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  if(large&&!reduce())for(let i=0;i<10;i++){const dot=document.createElement('i'),a=i*Math.PI/5;dot.style.setProperty('--x',Math.round(Math.cos(a)*66)+'px');dot.style.setProperty('--y',Math.round(Math.sin(a)*66)+'px');mark.append(dot);}
  host.prepend(mark);
 }
 const copyStates=new WeakMap();
 function copied(button){if(!button)return;const previous=copyStates.get(button),old=previous?.label??button.textContent;if(previous)clearTimeout(previous.timer);button.textContent='Copiado ✓';const timer=setTimeout(()=>{if(button.isConnected)button.textContent=old;copyStates.delete(button);},1800);copyStates.set(button,{label:old,timer});}
 window.LG_MOTION=Object.freeze({animate,celebrate,copied,reduce});
 const errors=new WeakMap();let errorId=0;
 document.addEventListener('invalid',event=>{
  const field=event.target;if(!field.matches('input,select,textarea'))return;
  let msg=errors.get(field);if(!msg){msg=document.createElement('span');msg.className='lg-field-error';msg.id='lg-field-error-'+(++errorId);field.after(msg);errors.set(field,msg);}
  msg.textContent=field.validationMessage;field.setAttribute('aria-invalid','true');
  const ids=new Set((field.getAttribute('aria-describedby')||'').split(' ').filter(Boolean));ids.add(msg.id);field.setAttribute('aria-describedby',[...ids].join(' '));
 },true);
 document.addEventListener('input',event=>{const field=event.target,msg=errors.get(field);if(msg&&field.validity.valid){field.removeAttribute('aria-invalid');const ids=(field.getAttribute('aria-describedby')||'').split(' ').filter(id=>id!==msg.id);if(ids.length)field.setAttribute('aria-describedby',ids.join(' '));else field.removeAttribute('aria-describedby');msg.remove();errors.delete(field);}});
 // Animate only bounded UI surfaces, never entire tables, images or timer ticks.
 const surfaces='#content,#view,#workoutContent,#calendarDay,#trainerJournalDay,#photoComparison,#evoPhotos,#importPreview,#workoutEditor';
 const queued=new Set();let frame=0;
 const observer=new MutationObserver(records=>{
  for(const r of records){
   if(r.type==='childList'&&r.target instanceof Element&&r.target.matches(surfaces)&&r.addedNodes.length)queued.add(r.target);
   for(const node of r.addedNodes){if(!(node instanceof Element))continue;
    if(node.matches('.set-row,.strength-test-row,.vo2-stage'))animate(node,'lg-highlight');
   }
  }
  if(queued.size&&!frame)frame=requestAnimationFrame(()=>{frame=0;queued.forEach(el=>animate(el));queued.clear();});
 });
 observer.observe(document.body,{childList:true,subtree:true});
 // Local photo previews are never uploaded by this module; revoke object URLs.
 const previews=new Map();
 function clearPreview(input){const item=previews.get(input);if(item){URL.revokeObjectURL(item.url);item.box.remove();previews.delete(input);}}
 document.addEventListener('change',event=>{
  const input=event.target;if(!input.matches('input[data-photo]'))return;clearPreview(input);
  const file=input.files?.[0];if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10485760)return;
  const url=URL.createObjectURL(file),box=document.createElement('div'),img=document.createElement('img'),note=document.createElement('p');
  img.className='lg-photo-preview';img.alt='Prévia da foto selecionada';img.src=url;note.className='lg-upload-state';note.textContent='Selecionada — será enviada ao salvar a avaliação.';box.append(img,note);input.after(box);previews.set(input,{url,box});
 });
 document.addEventListener('close',()=>{for(const [input] of previews)if(!input.isConnected||!input.closest('dialog[open]'))clearPreview(input);},true);
 window.addEventListener('pagehide',()=>{for(const [input] of previews)clearPreview(input);observer.disconnect();});
 window.addEventListener('pageshow',()=>observer.observe(document.body,{childList:true,subtree:true}));
 if(document.body.dataset.lgPage==='home'&&'IntersectionObserver' in window){
  const links=[...document.querySelectorAll('.navlinks a[href^="#"]')];
  const sections=links.map(a=>document.getElementById(a.hash.slice(1))).filter(Boolean);
  const active=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting)links.forEach(a=>{if(a.hash==='#'+entry.target.id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});},{rootMargin:'-15% 0px -55% 0px'});sections.forEach(s=>active.observe(s));
  const reveal=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.querySelectorAll('.step').forEach((step,i)=>{step.style.animationDelay=i*65+'ms';animate(step,'lg-reveal');});reveal.unobserve(entry.target);}}),{threshold:.15});
  document.querySelectorAll('.steps').forEach(el=>reveal.observe(el));
 }
})();
