// Same registration checks run in happy-dom and Chromium, with synthetic data.
export async function onboardingChecks(){
 const qa=window.ONBOARDING_QA,doc=document;
 const one=s=>{const el=doc.querySelector(s);if(!el)throw Error('Missing '+s);return el;};
 const check=(yes,label)=>{if(!yes)throw Error(label);};
 const settle=()=>new Promise(resolve=>setTimeout(resolve,50));
 check(qa.options.auth.persistSession===false&&qa.options.auth.detectSessionInUrl===false,'Registration keeps other sessions isolated');
 check(!doc.querySelector('[name="training_goal"]'),'Signup must not ask the anamnesis');
 check(!doc.querySelector('#next'),'No next questionnaire step');
 for(const [name,value] of Object.entries({full_name:'Aluno QA',email:'onboarding-qa@example.invalid',sex:'male',password:'Synthetic-Password-123',confirm_password:'Synthetic-Password-123'}))one('[name="'+name+'"]').value=value;
 one('#birth_day').value='11';one('#birth_month').value='1';one('#birth_year').value='1996';
 one('#registration').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
 one('#registration').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
 await settle();
 check(qa.signup===1,'Only one signup request');
 check(qa.writes.length===0&&qa.login===0,'No anamnesis write or sign-in during registration');
 if(qa.mode==='failure'||qa.mode==='uncertain'){
  check(one('#registrationSuccess').hidden,'No success on rejected registration');
  check(!qa.redirect,'No timer on rejected registration');
  check(one('#registrationStatus').textContent.length>0,'Visible error');
  check(one('[type="submit"]').disabled===(qa.mode==='uncertain'),'Known failure allows retry; ambiguous failure avoids duplicates');
  return 'registration failure stays on page with feedback';
 }
 check(one('#registration').hidden&&!one('#registrationSuccess').hidden,'Confirmation notice replaces the form');
 check(one('#registrationSuccess').textContent.includes('5 segundos'),'Five-second notice');
 check(one('[name="password"]').value==='','Password cleared');
 check(qa.redirect?.delay===5000,'Redirect scheduled only after signup acknowledgement');
 check(qa.signupArgs.options.emailRedirectTo==='https://luanguiron.com.br/','Email returns to home');
 return 'single-step signup, confirmation notice, isolated session and five-second return';
}
