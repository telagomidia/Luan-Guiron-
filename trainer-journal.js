(() => {
 'use strict';
 const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 window.LG_TRAINER_JOURNAL={mount(holder,client,studentId){
  let ticket=0,offset=0;
  const query=async q=>{const r=await LG_AUTH.deadline(()=>q);if(r.error)throw r.error;return r.data;};
  const visible=t=>holder.isConnected&&t===ticket;
  const fail=(t,retry)=>{if(!visible(t))return;holder.innerHTML='<p class="bad" role="status">Não foi possível carregar os treinos registrados.</p><button type="button" class="ghost">Tentar novamente</button>';holder.querySelector('button').onclick=retry;};
  async function list(){
   const t=++ticket;holder.innerHTML='<p role="status">Carregando treinos registrados...</p>';
   try{
    const rows=await query(client.from('workout_sessions').select('id,performed_at,notes,workout_snapshot,workouts(name,training_plans(name))').eq('student_id',studentId).order('performed_at',{ascending:false}).order('id').range(offset,offset+19));
    if(!visible(t))return;
    holder.innerHTML='<h2>Treinos registrados pelo aluno</h2>'+(rows.length?'<div class="list">'+rows.map(s=>'<article class="row"><div><strong>'+E(LG_JOURNAL.name(s))+'</strong><p class="muted">'+E(new Date(s.performed_at).toLocaleString('pt-BR'))+' · '+E(LG_JOURNAL.planName(s))+'</p></div><button type="button" class="ghost" data-journal-session="'+E(s.id)+'">Ver cargas e observações</button></article>').join('')+'</div>':'<p class="muted">Nenhum treino registrado nesta página.</p>')+'<div class="actions"><button type="button" class="ghost" id="journalPrevious" '+(offset===0?'disabled':'')+'>Anteriores</button><button type="button" class="ghost" id="journalNext" '+(rows.length<20?'disabled':'')+'>Próximos</button></div>';
    holder.querySelectorAll('[data-journal-session]').forEach(b=>b.onclick=()=>detail(b.dataset.journalSession));
    holder.querySelector('#journalPrevious').onclick=()=>{offset=Math.max(0,offset-20);list();};
    holder.querySelector('#journalNext').onclick=()=>{offset+=20;list();};
   }catch{fail(t,list);}
  }
  async function detail(id){
   const t=++ticket;holder.innerHTML='<p role="status">Carregando séries...</p>';
   try{
    const s=await query(client.from('workout_sessions').select('id,performed_at,notes,exercise_notes,workout_snapshot,workouts(name,training_plans(name))').eq('student_id',studentId).eq('id',id).single());
    const sets=await query(client.from('exercise_sets').select('exercise_id,set_number,load_kg,reps,rir,completed,workout_exercises(exercise_name)').eq('session_id',s.id).order('set_number'));
    if(!visible(t))return;
    holder.innerHTML='<button type="button" class="ghost" id="journalBack">← Treinos registrados</button><h2>'+E(LG_JOURNAL.name(s))+'</h2><p class="muted">'+E(new Date(s.performed_at).toLocaleString('pt-BR'))+'</p>'+(s.notes?'<p class="prescription-note">'+E(s.notes)+'</p>':'')+LG_JOURNAL.detail(s,sets);
    holder.querySelector('#journalBack').onclick=list;
   }catch{fail(t,()=>detail(id));}
  }
  list();
 }};
})();
