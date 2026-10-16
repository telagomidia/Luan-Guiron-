(() => {
 'use strict';
 const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 window.LG_TRAINER_JOURNAL={mount(holder,client,studentId){
  let ticket=0,cursor=new Date(),selected='',monthRows=[];
  cursor=new Date(cursor.getFullYear(),cursor.getMonth(),1);
  const query=async q=>{const r=await LG_AUTH.deadline(()=>q);if(r.error)throw r.error;return r.data;};
  const visible=t=>holder.isConnected&&t===ticket;
  const fail=(t,retry)=>{if(!visible(t))return;holder.innerHTML='<p class="bad" role="status">Não foi possível carregar os treinos registrados.</p><button type="button" class="ghost">Tentar novamente</button>';holder.querySelector('button').onclick=retry;};
  const dateLabel=day=>new Date(day+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
  function drawDay(day){
   selected=day||'';
   holder.querySelectorAll('[data-day]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.day===selected)));
   const target=holder.querySelector('#trainerJournalDay');if(!target)return;
   const rows=monthRows.filter(s=>LG_JOURNAL.dayKey(s.performed_at)===selected);
   target.innerHTML=selected?'<h3>'+E(dateLabel(selected))+'</h3>'+(rows.length?'<div class="list">'+rows.map(s=>'<article class="row"><div><strong>'+E(LG_JOURNAL.name(s))+'</strong><p class="muted">'+E(new Date(s.performed_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}))+' · '+E(LG_JOURNAL.planName(s))+'</p></div><button type="button" class="ghost" data-journal-session="'+E(s.id)+'">Ver cargas e observações</button></article>').join('')+'</div>':'<p class="muted">Nenhum treino registrado neste dia.</p>'):'<p class="muted">Selecione um dia do calendário para consultar o treino.</p>';
   target.querySelectorAll('[data-journal-session]').forEach(b=>b.onclick=()=>detail(b.dataset.journalSession));
  }
  function paint(){
   holder.innerHTML='<h2>Calendário de treinos</h2><p class="muted">'+monthRows.length+' sessão(ões) registrada(s) neste mês.</p>'+LG_JOURNAL.calendar(cursor.getFullYear(),cursor.getMonth(),monthRows,selected)+'<div id="trainerJournalDay" aria-live="polite"></div>';
   holder.querySelectorAll('[data-month]').forEach(b=>b.onclick=()=>{cursor=new Date(cursor.getFullYear(),cursor.getMonth()+Number(b.dataset.month),1);selected='';loadMonth();});
   holder.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>drawDay(b.dataset.day));
   drawDay(selected);
  }
  async function loadMonth(){
   const t=++ticket;holder.innerHTML='<p role="status">Carregando calendário de treinos...</p>';
   try{
    const range=LG_JOURNAL.monthRange(cursor.getFullYear(),cursor.getMonth());
    monthRows=await query(client.from('workout_sessions').select('id,performed_at,notes,workout_snapshot,workouts(name,training_plans(name))').eq('student_id',studentId).gte('performed_at',range.start).lt('performed_at',range.end).order('performed_at',{ascending:false}).order('id').range(0,499));
    if(!visible(t))return;
    if(!selected&&monthRows.length)selected=LG_JOURNAL.dayKey(monthRows[0].performed_at);
    paint();
   }catch{fail(t,loadMonth);}
  }
  async function detail(id){
   const t=++ticket;holder.innerHTML='<p role="status">Carregando séries e cargas...</p>';
   try{
    const s=await query(client.from('workout_sessions').select('id,performed_at,notes,exercise_notes,workout_snapshot,workouts(name,training_plans(name))').eq('student_id',studentId).eq('id',id).single());
    const sets=await query(client.from('exercise_sets').select('exercise_id,set_number,load_kg,reps,rir,rest_seconds,completed,workout_exercises(exercise_name)').eq('session_id',s.id).order('set_number'));
    if(!visible(t))return;
    holder.innerHTML='<button type="button" class="ghost" id="journalBack">← Voltar ao calendário</button><h2>'+E(LG_JOURNAL.name(s))+'</h2><p class="muted">'+E(new Date(s.performed_at).toLocaleString('pt-BR'))+' · '+E(LG_JOURNAL.planName(s))+'</p>'+(s.notes?'<p class="prescription-note"><strong>Observação do treino:</strong> '+E(s.notes)+'</p>':'')+LG_JOURNAL.detail(s,sets);
    holder.querySelector('#journalBack').onclick=paint;
   }catch{fail(t,()=>detail(id));}
  }
  loadMonth();
 }};
})();