(() => {
 'use strict';
 const {esc:E,value:V,date:D}=LG_PORTAL;
 const measures={weight_kg:['Peso','kg'],height_cm:['Altura','cm'],body_fat_pct:['Gordura corporal','%'],lean_mass_kg:['Massa magra','kg'],fat_mass_kg:['Massa gorda','kg'],systolic_bp:['Pressão sistólica','mmHg'],diastolic_bp:['Pressão diastólica','mmHg'],resting_hr:['FC de repouso','bpm'],spo2:['SpO₂','%'],temperature_c:['Temperatura','°C'],body_density:['Densidade corporal','g/cm³']};
 const circumferences={neck:'Pescoço',chest:'Tórax',waist:'Cintura',abdomen:'Abdômen',hip:'Quadril',arm_right:'Braço direito',arm_left:'Braço esquerdo',forearm_right:'Antebraço direito',forearm_left:'Antebraço esquerdo',thigh_right:'Coxa direita',thigh_left:'Coxa esquerda',calf_right:'Panturrilha direita',calf_left:'Panturrilha esquerda'};
 const skinfolds={triceps:'Tríceps',subscapular:'Subescapular',biceps:'Bíceps',chest:'Peitoral',midaxillary:'Axilar média',suprailiac:'Supra-ilíaca',abdominal:'Abdominal',thigh:'Coxa',calf:'Panturrilha'};
 const table=(caption,heads,rows)=>'<div class="table-wrap"><table><caption>'+E(caption)+'</caption><thead><tr>'+heads.map(x=>'<th scope="col">'+E(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(cell=>'<td>'+cell+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
 const note=(label,text)=>text?'<p class="prescription-note"><strong>'+E(label)+':</strong> '+E(text)+'</p>':'';
 const reps=x=>x.rep_min==null?(x.rep_max==null?'Não informado':'Até '+V(x.rep_max)):V(x.rep_min)+(x.rep_max!=null&&x.rep_max!==x.rep_min?'–'+V(x.rep_max):'');
 function training(bundle,name){
  const p=bundle.plan;
  return '<div class="report-brand">LG · LUAN GUIRON — TREINAMENTO PERSONALIZADO</div><h1>'+E(p.name)+'</h1><p>Aluno: '+E(name)+'</p><p>Objetivo: '+E(p.goal||'Não informado')+'</p><p>Período: '+D(p.starts_on)+' → '+D(p.ends_on)+'</p>'+bundle.workouts.map(w=>'<section class="print-workout"><h2>'+E(w.name)+'</h2>'+note('Orientações',w.notes)+table(w.name,['Exercício','Séries','Repetições','RIR','Descanso'],w.exercises.map(x=>[E(x.exercise_name),V(x.target_sets),reps(x),V(x.target_rir),V(x.rest_seconds,'s')]))+w.exercises.filter(x=>x.execution_notes||x.notes).map(x=>'<h3>'+E(x.exercise_name)+'</h3>'+note('Execução',x.execution_notes)+note('Observações',x.notes)).join('')+'</section>').join('')+note('Instruções gerais',p.notes)+'<p class="small">RIR: repetições que você estima conseguir realizar antes da falha. Siga as orientações do professor.</p>';
 }
 function assessment(bundle,name){
  const a=bundle.assessment;
  let result='<div class="report-brand">LG · LUAN GUIRON — AVALIAÇÃO FÍSICA</div><h1>Minha avaliação</h1><p>'+E(name)+' · '+D(a.assessed_at)+'</p>'+table('Medidas e resultados',['Medida','Resultado'],Object.entries(measures).filter(([key])=>a[key]!=null).map(([key,[label,unit]])=>[E(label),V(a[key],unit)]))+note('Protocolo de composição',a.protocol)+note('Observações',a.notes);
  for(const[row,labels,title,unit]of [[bundle.circ,circumferences,'Perimetria','cm'],[bundle.skin,skinfolds,'Dobras cutâneas','mm']])if(row)result+='<h2>'+title+'</h2>'+table(title,['Medida','Resultado'],Object.entries(labels).filter(([key])=>row[key]!=null).map(([key,label])=>[E(label),V(row[key],unit)]));
  if(bundle.strength.length)result+='<h2>Força — dinamometria</h2>'+table('Tentativas registradas',['Teste','Lado','Tentativa','Força (kgf)','Validade'],bundle.strength.map(s=>[E(s.muscle_group),E(s.side||'Não informado'),V(s.attempt),V(s.force_kgf),s.is_valid?'Válida':'Inválida']));
  for(const v of bundle.vo2){result+='<h2>Teste cardiorrespiratório</h2><p><strong>VO₂máx estimado:</strong> '+V(v.vo2max_ml_kg_min,'mL/kg/min')+'</p>'+note('Protocolo',v.protocol)+'<p class="small">Valor estimado pelo teste registrado; não corresponde à mensuração direta por ergoespirometria.</p>'+table('Frequência cardíaca',['Registro','bpm'],[['Pico observado',V(v.peak_hr??v.max_hr)],['Recuperação ao término',V(v.recovery_hr_0)],['Recuperação 1 min',V(v.recovery_hr_1)],['Recuperação 2 min',V(v.recovery_hr_2)],['Recuperação 3 min',V(v.recovery_hr_3)]])+note('Observações do teste',v.notes);const stages=bundle.stages.filter(s=>s.vo2_test_id===v.id);if(stages.length)result+=table('Estágios',['Estágio','Duração (s)','Velocidade (km/h)','Inclinação (%)','FC 2 min','FC 3 min','Borg'],stages.map(s=>[V(s.stage_number),V(s.duration_seconds),V(s.speed_kmh),V(s.incline_pct),V(s.hr_min2),V(s.hr_min3),V(s.borg)]));}
  return result+'<p class="small">Resultados registrados pelo professor. As interpretações e orientações devem ser discutidas no acompanhamento.</p>';
 }
 function progression(assessments,key,label,unit){
  const points=[...assessments].reverse().filter(a=>a[key]!==null&&a[key]!==undefined&&a[key]!==''&&Number.isFinite(Number(a[key])));
  if(points.length<2)return '<p class="muted">São necessárias duas avaliações com '+E(label.toLowerCase())+' para mostrar a tendência.</p>';
  const values=points.map(a=>Number(a[key])),min=Math.min(...values),max=Math.max(...values),spread=max-min||1;
  const times=points.map(a=>Date.parse(a.assessed_at+'T12:00:00Z')),timeSpread=times.at(-1)-times[0]||1;
  const coords=points.map((a,i)=>[(30+(times[i]-times[0])/timeSpread*440).toFixed(2),(120-(values[i]-min)/spread*85).toFixed(2)]);
  return '<figure class="trend"><figcaption>'+E(label)+' · '+E(unit)+'</figcaption><svg viewBox="0 0 500 155" role="img" aria-label="'+E(label)+' de '+E(points[0][key])+' para '+E(points.at(-1)[key])+' '+E(unit)+'"><line x1="30" y1="130" x2="470" y2="130" stroke="#e1d9eb"/><polyline points="'+coords.map(x=>x.join(',')).join(' ')+'" fill="none" stroke="#7135e8" stroke-width="3"/>'+coords.map(([x,y],i)=>'<circle cx="'+x+'" cy="'+y+'" r="4" fill="#7135e8"><title>'+D(points[i].assessed_at)+': '+E(values[i])+' '+E(unit)+'</title></circle>').join('')+'</svg><p class="small">'+D(points[0].assessed_at)+' → '+D(points.at(-1).assessed_at)+' · '+E(values[0])+' → '+E(values.at(-1))+' '+E(unit)+'</p></figure>';
 }
 function sessionTable(sets){return table('Séries realizadas',['Exercício','Série','Carga (kg)','Repetições','RIR','Estado'],sets.map(s=>[E(s.workout_exercises?.exercise_name||'Exercício'),V(s.set_number),V(s.load_kg),V(s.reps),V(s.rir),s.completed?'Realizada':'Não realizada']));}
 window.LG_PORTAL_VIEWS=Object.freeze({table,note,reps,training,assessment,progression,sessionTable,measures});
})();
