(()=>{
const base=window.openStudentHub;
if(!base)return;
window.openStudentHub=async function(id,tab='overview'){
  await base(id,tab);
  let head=view.querySelector('.student-hub-head');
  if(head&&!head.querySelector('[data-copy-training-context]')){
    let b=document.createElement('button');
    b.className='primary';
    b.dataset.copyTrainingContext='1';
    b.textContent='Copiar contexto para ChatGPT';
    b.onclick=()=>copyTrainingContext(id);
    let right=head.querySelector('button')?.parentElement;
    if(right&&right!==head)right.prepend(b);else head.appendChild(b);
  }
};
})();