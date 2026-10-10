/* Shared questionnaire. Self-reported measurements are not professional assessments. */
(() => {
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const text=(key,label,extra={})=>({key,label,type:'textarea',...extra});
 const input=(key,label,type='text',extra={})=>({key,label,type,...extra});
 const choice=(key,label,options)=>({key,label,type:'select',options});
 const yn=['Sim','Não'];
 const sections=[
  {title:'Identificação',fields:[input('full_name','Nome completo'),input('birth_date','Data de nascimento','date'),input('profession','Profissão'),input('phone','Telefone','tel',{max:40}),input('height_cm','Altura declarada (cm)','number',{min:50,max:250,step:0.1,hint:'Ex.: 156 cm. Informação declarada, não medida em avaliação.'}),input('weight_kg','Peso declarado (kg)','number',{min:1,max:500,step:0.1,hint:'Informação declarada, não medida em avaliação.'})]},
  {title:'Histórico de treinamento',fields:[choice('practices_strength','Já pratica musculação?',yn),text('training_history','Há quanto tempo treina? Conte seu histórico de treinamento.'),text('current_training_frequency','Qual é sua frequência atual de treino?'),text('weekly_availability','Quantos dias por semana consegue se comprometer?'),text('session_duration','Quanto tempo tem disponível por treino?'),choice('previous_coaching','Já teve acompanhamento de personal ou outro profissional?',yn),choice('experience_level','Como considera seu nível de experiência?',['Iniciante','Intermediário','Avançado'])]},
  {title:'Objetivos',fields:[text('training_goal','Qual é seu principal objetivo com o treinamento?',{required:true}),text('goal_categories','Seu objetivo envolve hipertrofia, emagrecimento/redução de gordura, força, condicionamento, saúde ou outro?'),text('body_priorities','Quais regiões do corpo gostaria de priorizar?'),text('aesthetic_goal','Existe algum objetivo estético específico?'),text('performance_goal','Existe algum objetivo funcional ou de desempenho?'),text('goal_deadline','Tem algum prazo ou evento específico relacionado ao objetivo?')]},
  {title:'Saúde, dores e lesões',fields:[text('medical_conditions','Possui alguma doença ou condição de saúde diagnosticada?'),text('medications','Utiliza algum medicamento regularmente?'),text('past_injuries','Já sofreu alguma lesão? Qual?'),text('current_injuries','Possui alguma lesão atualmente? Qual?'),text('pain_injuries','Sente dor ou desconforto durante algum exercício ou movimento?'),text('surgeries','Já realizou alguma cirurgia? Qual e quando?'),text('medical_restrictions','Possui alguma restrição médica para atividade física?'),text('limitations','Existe algum exercício que evita por dor ou desconforto?')]},
  {title:'Rotina',fields:[text('profession_routine','Como é sua rotina de trabalho ou estudo?'),choice('work_posture','Passa grande parte do dia sentado ou em pé?',['Sentado','Em pé','Alterna entre sentado e em pé','Outra rotina']),input('sleep_hours','Em média, quantas horas dorme por noite?','number',{min:0,max:24,step:0.5}),text('sleep_quality','Como considera a qualidade do sono?'),choice('stress_level','Como considera seu nível de estresse?',['Baixo','Médio','Alto']),text('current_activity','Pratica outra atividade física além da musculação? Qual?'),text('cardio_history','Realiza cardio? Quantas vezes por semana?')]},
  {title:'Alimentação e hábitos',fields:[input('meals_per_day','Quantas refeições costuma realizar por dia?','number',{min:0,max:30,step:1}),choice('nutrition_followup','Possui acompanhamento nutricional?',yn),text('nutrition_notes','Como considera sua alimentação atualmente?'),input('water_liters','Aproximadamente quanta água bebe por dia? (litros)','number',{min:0,max:20,step:0.1}),text('supplements','Utiliza suplementos? Quais?'),text('smoking','Fuma?'),text('alcohol','Consome bebidas alcoólicas? Com qual frequência?'),text('caffeine','Consome cafeína ou energéticos? Com qual frequência?')]},
  {title:'Preferências e aderência',fields:[text('preferences','Quais exercícios ou tipos de treino você mais gosta?'),text('disliked_exercises','Existe algum exercício que não gosta?'),choice('equipment_preference','Prefere máquinas, pesos livres ou não possui preferência?',['Máquinas','Pesos livres','Não possuo preferência']),text('adherence_difficulty','Qual foi sua maior dificuldade para manter uma rotina de treinamento anteriormente?'),text('attendance_barriers','O que poderia dificultar sua frequência aos treinos?'),text('additional_notes','Existe alguma informação importante que não foi perguntada e que o treinador deveria saber?')]}
 ];
 const fields=sections.flatMap(s=>s.fields);
 const parqQuestions=['Algum médico já disse que você possui problema cardíaco e que só deveria realizar atividade física recomendada por um médico?','Você sente dor no peito durante atividade física?','No último mês, sentiu dor no peito mesmo sem realizar atividade física?','Você já perdeu o equilíbrio por tontura ou já perdeu a consciência?','Possui algum problema ósseo ou articular que possa piorar com atividade física?','Algum médico prescreveu medicamento para pressão arterial ou problema cardíaco?','Existe algum outro motivo de saúde pelo qual você não deveria realizar atividade física?'];
 function value(row,key,profile={}){
  if(row?.answers?.questionnaire_version===2&&Object.hasOwn(row.answers,key))return row.answers[key]??'';
  if(row?.[key]!==null&&row?.[key]!==undefined)return row[key];
  if(row?.answers&&Object.hasOwn(row.answers,key))return row.answers[key]??'';
  return ['full_name','birth_date','phone'].includes(key)?profile[key]??'':'';
 }
 function normalize(values,previous={}){
  const result={...previous,questionnaire_version:2};
  for(const f of fields){
   if(!Object.hasOwn(values,f.key))continue;
   const raw=String(values[f.key]??'').trim();
   if(!raw){result[f.key]=null;continue;}
   const fail=message=>{throw Object.assign(new Error(f.label+': '+message),{code:'validation'});};
   if(f.type==='number'){
    const n=Number(raw.replace(',','.'));
    if(!Number.isFinite(n)||n<f.min||n>f.max||(f.step===1&&!Number.isInteger(n)))fail('informe um valor entre '+f.min+' e '+f.max+'.');
    result[f.key]=n;
   }else{
    if(raw.length>(f.type==='tel'?40:f.type==='text'?200:5000))fail('texto muito longo.');
    if(f.type==='select'&&!f.options.includes(raw))fail('selecione uma das opções.');
    if(f.type==='date'&&(!/^\d{4}-\d{2}-\d{2}$/.test(raw)||!Number.isFinite(Date.parse(raw))||new Date(raw).toISOString().slice(0,10)!==raw||raw<'1900-01-01'||raw>new Date().toISOString().slice(0,10)))fail('confira a data.');
    result[f.key]=raw;
   }
  }
  return result;
 }
 function field(f,row,profile={},prefix='anam'){
  const v=value(row,f.key,profile),id=prefix+'_'+f.key,required=f.required?' required':'',label='<label for="'+id+'">'+esc(f.label)+'</label>';
  let control;
  if(f.type==='textarea')control='<textarea id="'+id+'" name="'+f.key+'" maxlength="5000"'+required+'>'+esc(v)+'</textarea>';
  else if(f.type==='select')control='<select id="'+id+'" name="'+f.key+'"><option value="">Selecione / não informado</option>'+f.options.map(o=>'<option value="'+esc(o)+'"'+(v===o?' selected':'')+'>'+esc(o)+'</option>').join('')+'</select>';
  else control='<input id="'+id+'" name="'+f.key+'" type="'+f.type+'" value="'+esc(v)+'"'+required+(f.type==='number'?' min="'+f.min+'" max="'+f.max+'" step="'+(f.step===1?1:'any')+'"':f.type==='date'?' min="1900-01-01" max="'+new Date().toISOString().slice(0,10)+'"':' maxlength="'+(f.type==='tel'?40:200)+'"')+'>';
  return '<div class="field '+(f.type==='textarea'?'full':'')+'">'+label+control+(f.hint?'<small class="muted">'+esc(f.hint)+'</small>':'')+'</div>';
 }
 function parq(row={},className='parq-question'){
  return '<h3>PAR-Q · saúde e segurança</h3><p class="muted">Respostas positivas sinalizam informações que o profissional deve revisar; não são diagnósticos.</p>'+parqQuestions.map((q,i)=>{
   const a=row?.parq_answers?.['q'+(i+1)]?.answer??row?.answers?.parq_answers?.['q'+(i+1)]?.answer;
   return '<div class="'+className+'"><label for="parq_'+i+'">'+esc(q)+'</label><select id="parq_'+i+'" name="parq_'+i+'" required><option value="">Selecione</option><option value="no"'+(a==='no'?' selected':'')+'>Não</option><option value="yes"'+(a==='yes'?' selected':'')+'>Sim</option></select></div>';
  }).join('');
 }
 const review='<label class="check-label" style="display:flex;align-items:flex-start;gap:10px"><input style="width:auto" name="reviewed" type="checkbox" required><span>Revisei minhas respostas e confirmo o envio ao profissional responsável.</span></label>';
 function formSections(row,profile){
  return sections.map((s,i)=>'<section class="anam-section"><h2>'+(i+1)+'. '+esc(s.title)+'</h2><div class="form-grid">'+s.fields.map(f=>field(f,row,profile)).join('')+'</div>'+(i===3?parq(row):'')+'</section>').join('');
 }
 function report(row,profile={}){
  const display=(f,v)=>v===null||v===undefined||v===''?'Não informado':f.type==='date'&&/^\d{4}-\d{2}-\d{2}$/.test(String(v))?String(v).split('-').reverse().join('/'):esc(v)+(f.key==='height_cm'?' cm':f.key==='weight_kg'?' kg':f.key==='water_liters'?' L':f.key==='sleep_hours'?' h':'');
  const groups=sections.map((s,i)=>'<section class="student-section anam-section"><h2>'+(i+1)+'. '+esc(s.title)+'</h2><div class="student-grid">'+s.fields.map(f=>'<div class="student-value"><small>'+esc(f.label)+'</small><div style="white-space:pre-wrap">'+display(f,value(row,f.key,profile))+'</div></div>').join('')+'</div></section>').join('');
  return '<p class="muted">Altura e peso são informações declaradas pelo aluno. Registros anteriores mantêm suas respostas; perguntas acrescentadas podem estar sem resposta.</p>'+groups+'<section class="student-section anam-section"><h2>PAR-Q · saúde e segurança</h2>'+parqQuestions.map((question,i)=>'<div class="student-value"><small>'+esc(question)+'</small>'+({yes:'Sim',no:'Não'}[row.parq_answers?.['q'+(i+1)]?.answer??row.answers?.parq_answers?.['q'+(i+1)]?.answer]||'Não informado')+'</div>').join('')+'</section>';
 }
 function signupPages(){
  const birth='<div class="field full"><label for="birth_day">Data de nascimento</label><div class="birth-grid"><select id="birth_day" aria-label="Dia" required><option value="">Dia</option></select><select id="birth_month" aria-label="Mês" required><option value="">Mês</option>'+['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m,i)=>'<option value="'+(i+1)+'">'+m+'</option>').join('')+'</select><input id="birth_year" type="number" min="1900" aria-label="Ano" placeholder="Ano" required></div><input name="birth_date" type="hidden"></div>';
  const sex='<div class="field"><label for="signup_sex">Sexo biológico</label><select id="signup_sex" name="sex" required><option value="">Selecione</option><option value="female">Feminino</option><option value="male">Masculino</option></select></div>';
  const access='<h3>Seu acesso</h3><label style="display:flex;gap:10px;align-items:center"><input style="width:auto" name="existing_access" type="checkbox">Já tenho acesso: entrar e enviar esta anamnese</label><div class="form"><div class="field full"><label for="signup_email">E-mail</label><input id="signup_email" name="email" type="email" required autocomplete="email"></div><div class="field"><label for="signup_password">Senha</label><input id="signup_password" name="password" type="password" minlength="8" maxlength="128" required autocomplete="new-password"></div><div class="field"><label for="signup_confirm">Confirmar senha</label><input id="signup_confirm" name="confirm_password" type="password" minlength="8" maxlength="128" required autocomplete="new-password"></div></div><p>'+review+'</p><p id="resumeGuide" class="muted" hidden>Após confirmar o e-mail, volte a esta aba e entre para enviar. Se fechar antes de enviar, preencha a anamnese na sua área LG. <a href="./index.html" target="_blank" rel="noopener">Abrir login em outra aba</a>.</p>';
  return sections.map((s,i)=>'<section class="page'+(i===0?' on':'')+'"><div class="card"><h2>'+(i+1)+'. '+esc(s.title)+'</h2><div class="form">'+s.fields.map(f=>f.key==='birth_date'?birth:field({...f,required:f.key==='full_name'||f.required},null,{},'signup')).join('')+(i===0?sex:'')+'</div>'+(i===3?parq({},'yn'):'')+(i===6?access:'')+'</div></section>').join('')+'<div id="err" class="error" role="status" aria-live="polite"></div><div class="actions"><button type="button" id="back" style="visibility:hidden">← Voltar</button><button type="button" class="primary" id="next">Continuar →</button></div>';
 }
 window.LG_ANAM=Object.freeze({sections,fields,parqQuestions,value,normalize,formSections,parq,review,report,signupPages});
})();
