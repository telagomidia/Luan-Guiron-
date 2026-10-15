import fs from 'node:fs';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_ENTRY||'playwright');
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url));
const output=process.env.MOBILE_SCREENSHOTS||'/tmp/mobile-layout-screenshots';fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']}:{})});
try{
 for(const width of [320,390,768,1440]){
  const context=await browser.newContext({viewport:{width,height:900},timezoneId:'America/Sao_Paulo'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>{
   const f=new URL(r.request().url()).pathname.slice(1);
   if(!/^[\w./-]+$/.test(f)||f.includes('..'))return r.abort();
   try{return r.fulfill({contentType:f.endsWith('.css')?'text/css':f.endsWith('.webp')?'image/webp':'text/html',body:f==='portal.html'?read(f).toString().replace(/<script\b[\s\S]*?<\/script>/gi,''):read(f)});}catch{return r.abort();}
  });
  await page.goto('https://journal.test/portal.html');
  for(const f of ['workout-journal.js','anamnesis-schema.js','portal-model.js','portal-views.js'])await page.addScriptTag({content:read(f).toString()});
  await page.evaluate(()=>{
   const profile={id:'own',full_name:'Aluno QA',role:'student'},plan={id:'p',name:'Plano de força QA',active:true};
   const workouts=['a','b','c'].map((id,i)=>({id,name:'Treino '+id.toUpperCase(),position:i+1,exercises:[{id:'e'+id,exercise_name:i===0?'Supino reto':'Exercício QA',target_sets:3,rep_min:8,rep_max:12,target_rir:2,rest_seconds:60,execution_notes:'Prescrição do professor'}]}));
   const now=new Date().toISOString();
   window.qa={fail:true,attempts:[],sessions:[{id:'old',workout_id:'a',performed_at:now,workouts:{name:'Treino A'}}],sets:{old:[]},calendarFail:false};
   const client={rpc(name,payload){
    qa.attempts.push({name,payload});
    return {abortSignal(){return this;},async then(resolve,reject){
     await new Promise(r=>setTimeout(r,150));
     if(qa.fail)return resolve({error:{code:'request_timeout'}});
     if(!qa.sessions.some(s=>s.id===payload.p_session_id)){
      qa.sessions.unshift({id:payload.p_session_id,workout_id:payload.p_workout_id,performed_at:payload.p_performed_at,notes:payload.p_notes,exercise_notes:payload.p_exercise_notes,workout_snapshot:{name:'Treino A',plan_name:plan.name,exercises:{ea:{name:'Supino reto',position:1}}}});
      qa.sets[payload.p_session_id]=payload.p_sets.map(s=>({...s,completed:true}));
     }
     resolve({data:{id:payload.p_session_id}});
    }};
   }};
   const actual=LG_PORTAL.createApi(client,'own');
   window.qaApi={profile:async()=>profile,plans:async()=>[plan],plan:async()=>({plan,workouts}),sessions:async()=>qa.sessions,
    sessionsMonth:async(year,month)=>{if(qa.calendarFail)throw Error('offline');return qa.sessions.filter(s=>{const d=new Date(s.performed_at);return d.getFullYear()===year&&d.getMonth()===month;});},
    latestWorkout:async()=>qa.sessions[0],session:async id=>({session:qa.sessions.find(s=>s.id===id),sets:qa.sets[id]}),
    assessments:async()=>[],anamnesis:async()=>({id:'done'}),record:(...args)=>actual.record(...args)};
   window.LG_AUTH={createClient:()=>client,access:async()=>({profile,user:{id:'own'}}),sessionExpired:()=>false,message:()=> 'Falha',deadline:fn=>fn()};
   window.LG_PORTAL={...LG_PORTAL,createApi:()=>qaApi};
  });
  await page.addScriptTag({content:read('portal-app.js').toString()});
  const fits=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No overflow @'+width);
  await page.locator('.journal-calendar').waitFor();await fits();
  await page.locator('[data-route="training"]').first().click();await page.locator('[data-plan]').click();
  assert.equal(await page.locator('.journal-choice').count(),3);assert.match(await page.locator('.journal-choice.suggested').innerText(),/Treino B/);
  await page.locator('[data-workout="a"]').click();await page.locator('#recordSession').waitFor();
  assert.match(await page.locator('#recordSession').innerText(),/Prescrição do professor/);
  await fits();assert.equal(await page.locator('[data-set-row]').count(),3);
  for(let i=0;i<3;i++){await page.locator('[data-load]').nth(i).fill(String((i+1)*20));await page.locator('[data-reps]').nth(i).fill(String(12-i*2));await page.locator('[data-completed]').nth(i).check();}
  await page.locator('[data-exercise-note]').fill('Última série com ajuda <script>teste</script>');
  await page.locator('#sessionNotes').fill('Treino realizado');
  if(width===390)await page.screenshot({path:output+'/journal-record-mobile.png',fullPage:true});
  await page.locator('#recordSession button[type="submit"]').click();await page.locator('[data-form-status].error').waitFor();
  assert.equal(await page.locator('[data-load]').nth(2).inputValue(),'60');assert.equal(await page.evaluate(()=>qa.sessions.length),1);
  await page.evaluate(()=>qa.fail=false);await page.locator('#recordSession button[type="submit"]').click();
  await page.locator('#recordSession').evaluate(f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  await page.locator('#viewSavedSession').waitFor();
  const attempts=await page.evaluate(()=>qa.attempts);
  assert.equal(attempts.length,2);assert.equal(attempts[0].payload.p_session_id,attempts[1].payload.p_session_id);
  assert.equal(attempts[1].name,'record_student_workout_v2');assert.deepEqual(attempts[1].payload.p_sets.map(s=>s.load_kg),[20,40,60]);
  await page.locator('#viewSavedSession').click();await page.locator('.journal-details').waitFor();
  assert.equal(await page.locator('.journal-details tbody tr').count(),3);assert.match(await page.locator('.journal-details').innerText(),/Última série com ajuda/);assert.equal(await page.locator('#content script').count(),0);await fits();
  if(width<=850)await page.locator('#portalMenuToggle').click();await page.locator('[data-page="home"]').click();await page.locator('[data-calendar-session]').first().waitFor();
  assert.equal(await page.locator('[data-calendar-session]').count(),2);
  assert.equal(await page.locator('.has-session').count(),1);
  if(width===390)await page.locator('#trainingCalendar').screenshot({path:output+'/journal-calendar-mobile.png'});
  await page.locator('[data-month="-1"]').click();await page.getByText('Nenhum treino registrado neste dia.').waitFor();
  await page.evaluate(()=>qa.calendarFail=true);await page.locator('[data-month="1"]').click();await page.locator('#retryCalendar').waitFor();
  await page.evaluate(()=>qa.calendarFail=false);await page.locator('#retryCalendar').click();await page.locator('[data-calendar-session]').first().waitFor();
  await page.locator('[data-calendar-session]').first().click();await page.locator('.journal-details').waitFor();await fits();
  // Exercise the professor reader with the same saved payload, scoped to this student.
  await page.addScriptTag({content:read('trainer-journal.js').toString()});
  await page.evaluate(()=>{
   document.querySelector('#content').innerHTML='<div id="teacherJournal"></div>';
   const client={from(table){let id;return {select(){return this;},eq(key,value){if(key==='student_id'&&value!=='own')throw Error('wrong owner');if(key==='id'||key==='session_id')id=value;return this;},gte(){return this;},lt(){return this;},order(){return this;},range(){return this;},single(){return this;},then(resolve){return Promise.resolve({data:table==='exercise_sets'?qa.sets[id]:id?qa.sessions.find(s=>s.id===id):qa.sessions}).then(resolve);}};}};
   LG_TRAINER_JOURNAL.mount(document.querySelector('#teacherJournal'),client,'own');
  });
  await page.locator('[data-journal-session]').first().click();await page.locator('#journalBack').waitFor();
  assert.match(await page.locator('#teacherJournal').innerText(),/Última série com ajuda/);assert.equal(await page.locator('#teacherJournal tbody tr').count(),3);
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS: 4 viewports, start/choice/suggestion override, prescriptions, 20/40/60 kg, per-exercise note, failure/retry/same UUID/double-submit, calendar/multiple sessions/month/error, detail escaping and professor read.');
}finally{await browser.close();}
