(() => {
 'use strict';
 const error=(code,message)=>Object.assign(new Error(message||code),{code});
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const number=(value,label,min,max,integer=false)=>{
  if(value===null||value===undefined||value==='')return null;
  const n=Number(String(value).replace(',','.'));
  if(!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n)))throw error('validation',label+': informe '+(integer?'um inteiro ':'um número ')+'entre '+min+' e '+max+'.');
  return n;
 };
 const safeUrl=value=>{try{const url=new URL(value);return url.protocol==='https:'?url.href:null;}catch{return null;}};
 const date=value=>value?new Date(/^\d{4}-\d{2}-\d{2}$/.test(value)?value+'T12:00:00':value).toLocaleDateString('pt-BR'):'Não informado';
 const value=(v,unit='')=>v===null||v===undefined||v===''?'Não informado':esc(v)+(unit?' '+unit:'');
 function normalizeSets(rows){
  const selected=rows.filter(row=>row.completed===true),keys=new Set();
  if(!selected.length)throw error('validation','Marque ao menos uma série realizada.');
  if(selected.length>1000)throw error('validation','Muitas séries.');
  return selected.map(row=>{
   const set=number(row.set_number,'Número da série',1,50,true),reps=number(row.reps,'Repetições',1,1000,true);
   if(!row.exercise_id||set===null||reps===null)throw error('validation','Informe as repetições de cada série marcada como realizada.');
   const key=row.exercise_id+':'+set;if(keys.has(key))throw error('validation','Há uma série repetida.');keys.add(key);
   return{exercise_id:row.exercise_id,set_number:set,reps,load_kg:number(row.load_kg,'Carga (kg)',0,2000),rir:number(row.rir,'RIR',0,10)};
  });
 }
 const anamFields=[['training_goal','Objetivo principal'],['training_history','Histórico de treino e esportes'],['current_activity','Atividade física atual'],['weekly_availability','Disponibilidade semanal'],['session_duration','Tempo disponível por treino'],['profession_routine','Profissão e rotina'],['pain_injuries','Dores e lesões'],['medical_conditions','Condições de saúde diagnosticadas'],['medications','Medicamentos'],['limitations','Limitações de movimento'],['preferences','Preferências'],['sleep_quality','Qualidade do sono'],['nutrition_notes','Alimentação no dia a dia'],['cardio_history','Histórico de cardio'],['additional_notes','Informações adicionais']];
 const parqQuestions=['Algum médico já disse que você possui problema cardíaco e que só deveria realizar atividade física recomendada por um médico?','Você sente dor no peito durante atividade física?','No último mês, sentiu dor no peito mesmo sem realizar atividade física?','Você já perdeu o equilíbrio por tontura ou já perdeu a consciência?','Possui algum problema ósseo ou articular que possa piorar com atividade física?','Algum médico prescreveu medicamento para pressão arterial ou problema cardíaco?','Existe algum outro motivo de saúde pelo qual você não deveria realizar atividade física?'];
 function anamPayload(values,id,studentId){
  const out={id,student_id:studentId,submitted_at:new Date().toISOString(),updated_at:new Date().toISOString()};
  for(const[key,label]of anamFields){const s=String(values[key]||'').trim();if(s.length>5000)throw error('validation',label+': texto muito longo.');out[key]=s||null;}
  if(!out.training_goal)throw error('validation','Informe seu objetivo principal.');
  out.sleep_hours=number(values.sleep_hours,'Horas de sono',0,24);
  out.parq_answers={};parqQuestions.forEach((question,i)=>{const answer=values['parq_'+i];if(!['yes','no'].includes(answer))throw error('validation','Responda todas as perguntas do PAR-Q.');out.parq_answers['q'+(i+1)]={question,answer};});
  if(values.reviewed!=='on')throw error('validation','Confirme a revisão das suas informações antes de enviar.');
  return out;
 }
 function message(e){if(e?.code==='validation')return e.message;if(e?.code==='42501')return 'Seu acesso não permite esta operação ou o plano foi desativado. Atualize a tela.';if(e?.code==='P0001')return String(e.message||'Confira os dados.');if(e?.code==='unconfirmed'||e?.code==='request_timeout')return 'Não foi possível confirmar. Confira o histórico antes de repetir; o formulário mantém seus dados.';if(e?.code==='PGRST116')return 'Registro não encontrado ou alterado. Atualize a tela.';return 'Não foi possível carregar ou salvar. Confira a conexão e tente novamente.';}
 function createApi(client,uid){
  async function query(builder){const controller=new AbortController();let timer;try{const result=await Promise.race([Promise.resolve(builder.abortSignal(controller.signal)),new Promise((_,reject)=>{timer=setTimeout(()=>{reject(error('request_timeout'));controller.abort();},20000);})]);if(result.error)throw result.error;return result.data;}finally{clearTimeout(timer);}}
  const own=(table,columns='*')=>client.from(table).select(columns).eq('student_id',uid);
  return {
   uid,query,
   profile:()=>query(client.from('profiles').select('id,full_name,email,phone,birth_date,sex,start_date,goal,role,active').eq('id',uid).single()),
   plans:()=>query(own('training_plans').order('created_at',{ascending:false})),
   async plan(id){const p=await query(own('training_plans').eq('id',id).single());const workouts=await query(client.from('workouts').select('*').eq('plan_id',p.id).order('position'));const exercises=workouts.length?await query(client.from('workout_exercises').select('*').in('workout_id',workouts.map(w=>w.id)).order('position')):[];return{plan:p,workouts:workouts.map(w=>({...w,exercises:exercises.filter(e=>e.workout_id===w.id)}))};},
   sessions:(offset=0)=>query(own('workout_sessions','id,workout_id,performed_at,notes,workouts(name,training_plans(name))').order('performed_at',{ascending:false}).range(offset,offset+19)),
   async session(id){const session=await query(own('workout_sessions','id,workout_id,performed_at,notes,workouts(name,training_plans(name))').eq('id',id).single());const sets=await query(client.from('exercise_sets').select('id,exercise_id,set_number,load_kg,reps,rir,completed,workout_exercises(exercise_name)').eq('session_id',session.id).order('set_number'));return{session,sets};},
   async record(id,workoutId,performedAt,notes,rows){const sets=normalizeSets(rows);if(!id||!workoutId||!Number.isFinite(Date.parse(performedAt))||Date.parse(performedAt)>Date.now()+300000)throw error('validation','Confira a data e o treino da sessão.');if(String(notes||'').length>5000)throw error('validation','Observações: até 5000 caracteres.');const saved=await query(client.rpc('record_student_workout',{p_session_id:id,p_workout_id:workoutId,p_performed_at:performedAt,p_notes:notes||'',p_sets:sets}));if(saved?.id!==id)throw error('unconfirmed');return saved;},
   assessments:()=>query(own('assessments').order('assessed_at',{ascending:false})),
   async assessment(id){const a=await query(own('assessments').eq('id',id).single());const [circ,skin,strength,vo2]=await Promise.all([query(client.from('circumferences').select('*').eq('assessment_id',id).maybeSingle()),query(client.from('skinfolds').select('*').eq('assessment_id',id).maybeSingle()),query(client.from('strength_tests').select('*').eq('assessment_id',id).order('attempt')),query(client.from('vo2_tests').select('*').eq('assessment_id',id))]);const stages=vo2.length?await query(client.from('vo2_stages').select('*').in('vo2_test_id',vo2.map(v=>v.id)).order('stage_number')):[];return{assessment:a,circ,skin,strength,vo2,stages};},
   photos:()=>query(own('progress_photos','id,photo_date,view,storage_path').order('photo_date',{ascending:false})),
   guidance:()=>query(own('guidance','id,title,body,created_at').order('created_at',{ascending:false})),
   anamnesis:()=>query(own('anamneses').order('updated_at',{ascending:false}).limit(1).maybeSingle()),
   async saveAnam(values,id,answers={}){const row={...anamPayload(values,id,uid),answers};const saved=await query(client.from('anamneses').upsert(row,{onConflict:'id'}).select('id,student_id').single());if(saved?.id!==id||saved.student_id!==uid)throw error('unconfirmed');return saved;},
   async signed(bucket,path){if(!['progress-photos','assessment-documents','assessment-docs'].includes(bucket)||typeof path!=='string'||!path.startsWith(uid+'/')||path.includes('..'))throw error('validation','Arquivo não disponível para sua conta.');const result=await LG_AUTH.deadline(()=>client.storage.from(bucket).createSignedUrl(path,300));if(result.error)throw result.error;const url=safeUrl(result.data?.signedUrl);if(!url)throw error('unconfirmed');return url;},
   async updateProfile(values){const result=await LG_AUTH.deadline(()=>client.functions.invoke('student-profile',{body:{full_name:values.full_name,phone:values.phone,birth_date:values.birth_date,sex:values.sex}}));if(result.error){let reason;try{reason=await result.error.context?.json();}catch{}throw error('validation',reason?.error||'Não foi possível atualizar o perfil.');}if(result.data?.profile?.id!==uid)throw error('unconfirmed');return result.data.profile;},
   async password(next,confirm){if(String(next).length<8||String(next).length>128||next!==confirm)throw error('validation','Use de 8 a 128 caracteres e confirme a mesma senha.');const identity=await LG_AUTH.deadline(()=>client.auth.getUser());if(identity.error||identity.data?.user?.id!==uid)throw error('42501');const result=await LG_AUTH.deadline(()=>client.auth.updateUser({password:next}));if(result.error)throw result.error;if(result.data?.user?.id!==uid)throw error('unconfirmed');}
  };
 }
 window.LG_PORTAL=Object.freeze({esc,number,safeUrl,date,value,normalizeSets,anamFields,parqQuestions,anamPayload,message,createApi});
})();
