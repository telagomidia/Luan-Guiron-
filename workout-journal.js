(() => {
 'use strict';
 const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const dayKey=value=>{const d=new Date(value);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
 function monthRange(year,month){return{start:new Date(year,month,1).toISOString(),end:new Date(year,month+1,1).toISOString()};}
 function suggested(workouts,last){
  if(!workouts.length)return null;
  const i=workouts.findIndex(w=>w.id===last?.workout_id);
  return workouts[(i+1)%workouts.length].id;
 }
 function normalizeNotes(notes){
  const out={};
  for(const [id,text]of Object.entries(notes||{})){
   if(typeof text!=='string'||text.length>2000)throw Object.assign(new Error('Observação: até 2000 caracteres por exercício.'),{code:'validation'});
   if(text.trim())out[id]=text.trim();
  }
  return out;
 }
 const name=s=>s.workout_snapshot?.name||s.workouts?.name||'Treino';
 const planName=s=>s.workout_snapshot?.plan_name||s.workouts?.training_plans?.name||'Plano';
 function detail(session,sets){
  const groups=new Map(),snapshot=session.workout_snapshot?.exercises||{};
  for(const s of sets){if(!groups.has(s.exercise_id))groups.set(s.exercise_id,[]);groups.get(s.exercise_id).push(s);}
  for(const id of Object.keys(session.exercise_notes||{}))if(!groups.has(id))groups.set(id,[]);
  const val=v=>v===null||v===undefined?'—':E(v);
  return '<div class="journal-details">'+[...groups].sort(([a],[b])=>(snapshot[a]?.position??0)-(snapshot[b]?.position??0)).map(([id,rows])=>{
   const title=snapshot[id]?.name||rows[0]?.workout_exercises?.exercise_name||'Exercício';
   return '<section class="journal-exercise"><h3>'+E(title)+'</h3>'+(rows.length?'<div class="table-wrap"><table><caption class="small">Séries realizadas — '+E(title)+'</caption><thead><tr><th scope="col">Série</th><th scope="col">Carga (kg)</th><th scope="col">Reps</th><th scope="col">RIR</th></tr></thead><tbody>'+[...rows].sort((a,b)=>a.set_number-b.set_number).map(s=>'<tr><td>'+val(s.set_number)+'</td><td>'+val(s.load_kg)+'</td><td>'+val(s.reps)+'</td><td>'+val(s.rir)+'</td></tr>').join('')+'</tbody></table></div>':'<p class="small">Sem séries registradas neste exercício.</p>')+(session.exercise_notes?.[id]?'<p class="prescription-note"><strong>Observações de hoje:</strong> '+E(session.exercise_notes[id])+'</p>':'')+'</section>';
  }).join('')+'</div>';
 }
 function calendar(year,month,sessions,selected){
  const first=new Date(year,month,1),days=new Date(year,month+1,0).getDate(),counts={};
  sessions.forEach(s=>{const k=dayKey(s.performed_at);counts[k]=(counts[k]||0)+1;});
  const title=first.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
  return '<div class="journal-month"><button type="button" class="ghost" data-month="-1" aria-label="Mês anterior">←</button><h3>'+E(title)+'</h3><button type="button" class="ghost" data-month="1" aria-label="Próximo mês">→</button></div><div class="journal-calendar" aria-label="Dias do mês">'+['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d=>'<span class="journal-weekday">'+d+'</span>').join('')+Array(first.getDay()).fill('<span aria-hidden="true"></span>').join('')+Array.from({length:days},(_,i)=>{
   const day=i+1,key=dayKey(new Date(year,month,day)),n=counts[key]||0;
   return '<button type="button" class="journal-day'+(n?' has-session':'')+'" data-day="'+key+'" aria-pressed="'+(key===selected)+'" '+(key===dayKey(new Date())?'aria-current="date" ':'')+'aria-label="'+day+' de '+E(title)+', '+n+' treino(s) registrado(s)">'+day+(n?'<span aria-hidden="true">✓</span>':'')+'</button>';
  }).join('')+'</div><p class="small">✓ Treino registrado · toque em um dia para consultar.</p>';
 }
 window.LG_JOURNAL=Object.freeze({dayKey,monthRange,suggested,normalizeNotes,name,planName,detail,calendar});
})();
