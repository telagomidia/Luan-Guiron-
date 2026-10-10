// Runs unchanged inside both happy-dom and real Chromium.
export async function onboardingChecks(){
 const doc=document,qa=window.ONBOARDING_QA;
 const one=s=>{const el=doc.querySelector(s);if(!el)throw Error('Missing '+s);return el;};
 const check=(yes,label)=>{if(!yes)throw Error(label);};
 const settle=()=>new Promise(r=>setTimeout(r,100));
 const click=async s=>{one(s).click();await settle();};
 const fill=(name,value)=>{const el=one('[name="'+name+'"]');el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));};
 check(qa.options.auth.persistSession===false&&qa.options.auth.detectSessionInUrl===false,'Teacher session must remain isolated');
 fill('full_name','Aluno QA');one('#birth_day').value='11';one('#birth_month').value='1';one('#birth_year').value='1996';one('#birth_year').dispatchEvent(new Event('change',{bubbles:true}));fill('sex','male');
 fill('profession','Profissão QA');fill('phone','015000000000');fill('height_cm','170');fill('weight_kg','70');
 await click('#next');check(one('#stepLabel').textContent.includes('2 de 7'),'Advance to history: '+[...one('.page.on').querySelectorAll('input,select')].filter(x=>!x.checkValidity()).map(x=>x.name+': '+x.validationMessage).join('; '));fill('experience_level','Intermediário');fill('previous_coaching','Sim');
 await click('#next');check(one('#stepLabel').textContent.includes('3 de 7'),'Advance to objectives');
 fill('training_goal','Ganhar força');fill('body_priorities','Prioridade QA');await click('#next');check(one('#stepLabel').textContent.includes('4 de 7'),'Advance to health');
 await click('#next');check(one('#stepLabel').textContent.includes('4 de 7'),'PAR-Q must be answered, not silently defaulted');
 fill('surgeries','Resposta sintética QA');for(let i=0;i<7;i++)fill('parq_'+i,'no');await click('#next');check(one('#stepLabel').textContent.includes('5 de 7'),'Advance to routine');fill('stress_level','Médio');
 await click('#next');check(one('#stepLabel').textContent.includes('6 de 7'),'Advance to habits');fill('water_liters','1.5');fill('meals_per_day','4');fill('supplements','Resposta sintética QA');
 await click('#next');check(one('#stepLabel').textContent.includes('7 de 7'),'Advance to adherence and access');fill('attendance_barriers','Horário QA');
 fill('email','onboarding-qa@example.invalid');fill('password','Synthetic-Password-123');fill('confirm_password','Synthetic-Password-123');fill('sleep_hours','7.5');
 await click('#next');check(qa.signup===0,'Review confirmation precedes signup');one('[name="reviewed"]').checked=true;
 if(qa.foreign||qa.inactive){
  qa.pending=false;await click('#next');check(qa.writes.length===0,'Unsafe account must not write');check(one('#success').style.display==='none','Unsafe account must not claim success');check(!one('#next').disabled,'Failure releases button');return 'unsafe account denied';
 }
 await click('#next');check(qa.signup===1&&qa.writes.length===0,'Pending confirmation creates only access');check(one('#success').style.display==='none','Pending is not completed');check(one('#err').textContent.includes('pendente'),'Pending feedback');check(one('[name="training_goal"]').value==='Ganhar força','Keep responses');check(one('[name="existing_access"]').checked,'Resume by login');check(one('[name="email"]').readOnly,'Keep original account email');
 await click('#next');check(qa.login===1&&qa.signup===1&&qa.writes.length===0,'Unconfirmed retry does not re-register');check(one('#err').textContent.includes('Confirme'),'Show confirmation error');
 qa.confirmed=true;qa.failSave=true;await click('#next');check(qa.writes.length===1&&one('#success').style.display==='none','Failed write is not completed');check(one('[name="training_goal"]').value==='Ganhar força','Save failure retains answers');check(!one('#next').disabled,'Save failure releases controls');
 qa.failSave=false;one('#next').click();one('#next').click();await settle();check(qa.writes.length===2,'Double click sends one retry');check(qa.writes[0].id===qa.writes[1].id,'Retry uses same record ID');check(qa.writes[1].student_id==='onboarding-qa-student','Saved under authenticated student');check(qa.writes[1].submitted_at&&qa.writes[1].sleep_hours===7.5,'Timestamp and decimal sleep');check(one('#success').style.display==='block','Only confirmed save is completed');check(one('[name="password"]').value==='','Clear password after success');check(qa.signup===1,'Account created only once');
 check(qa.writes[1].answers.questionnaire_version===2&&qa.writes[1].answers.height_cm===170&&qa.writes[1].answers.water_liters===1.5&&qa.writes[1].answers.surgeries==='Resposta sintética QA'&&qa.writes[1].answers.attendance_barriers==='Horário QA','New groups saved with explicit units and version');
 return 'confirmation/login/save failure/retry/double click/same-student linkage';
}
