const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../plan-management.js','utf8');
function setup(options={}) {
 const calls=[],results=options.results||[],toasts=[];
 function builder(table) {
  const chain={};for(const method of ['select','eq','in','update','order'])chain[method]=(...args)=>{calls.push({table,method,args});return chain;};
  for(const method of ['single','maybeSingle'])chain[method]=async()=>{calls.push({table,method});return results.shift()||{};};
  chain.then=(resolve,reject)=>Promise.resolve(results.shift()||{}).then(resolve,reject);return chain;
 }
 const context={window:{},sb:{from:builder,rpc:(name,args)=>{calls.push({rpc:name,args});const p=Promise.resolve(results.shift()||{});p.abortSignal=()=>p;return p;}},Date,AbortController,setTimeout,clearTimeout};
 vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/../training-save.js','utf8'),context);context.LG_TRAINING=context.window.LG_TRAINING;vm.runInContext(source,context);
 return {api:context.window.LG_PLANS,calls,context,toasts};
}
test('activate confirms changed row and matches prior state',async()=>{const s=setup({results:[{data:{id:'p',active:true}}]});await s.api.setActive({id:'p',active:false},true);assert.ok(s.calls.some(x=>x.method==='eq'&&x.args[0]==='active'&&x.args[1]===false));});
test('deactivate confirms changed row',async()=>{const s=setup({results:[{data:{id:'p',active:false}}]});await s.api.setActive({id:'p',active:true},false);});
test('zero affected rows cannot report success',async()=>{const s=setup({results:[{data:null}]});await assert.rejects(s.api.setActive({id:'p',active:true},false),e=>e.code==='plan_changed');});
test('wrong returned state cannot report success',async()=>{const s=setup({results:[{data:{active:true}}]});await assert.rejects(s.api.setActive({id:'p',active:true},false),e=>e.code==='plan_changed');});
test('update errors propagate',async()=>{const s=setup({results:[{error:{code:'42501'}}]});await assert.rejects(s.api.setActive({id:'p',active:true},false),e=>e.code==='42501');});
test('empty workouts have no sessions',async()=>{const s=setup({results:[{data:[]}]});assert.equal(await s.api.history('p'),0);});
test('history counts only workouts of selected plan',async()=>{const s=setup({results:[{data:[{id:'w'}]},{count:2}]});assert.equal(await s.api.history('p'),2);assert.ok(s.calls.some(x=>x.method==='in'&&x.args[1][0]==='w'));});
test('unknown session count blocks deletion',async()=>{const s=setup({results:[{data:[{id:'w'}]},{count:null}]});await assert.rejects(s.api.remove('p'),e=>e.code==='history_unavailable');assert.equal(s.calls.filter(x=>x.rpc).length,0);});
test('session query failure blocks deletion',async()=>{const s=setup({results:[{data:[{id:'w'}]},{error:{code:'42501'}}]});await assert.rejects(s.api.remove('p'));assert.equal(s.calls.filter(x=>x.rpc).length,0);});
test('history blocks RPC entirely',async()=>{const s=setup({results:[{data:[{id:'w'}]},{count:1}]});await assert.rejects(s.api.remove('p'),e=>e.code==='plan_has_history');assert.equal(s.calls.filter(x=>x.rpc).length,0);});
test('empty plan deletes only through server RPC',async()=>{const s=setup({results:[{data:[]},{data:{deleted:true}}]});await s.api.remove('p');assert.equal(s.calls.find(x=>x.rpc).rpc,'delete_training_plan');});
test('server rejects concurrent session',async()=>{const s=setup({results:[{data:[]},{error:{code:'23503'}}]});await assert.rejects(s.api.remove('p'),e=>e.code==='23503');});
test('RPC without confirmation is not success',async()=>{const s=setup({results:[{data:[]},{data:null}]});await assert.rejects(s.api.remove('p'),e=>e.code==='delete_unconfirmed');});
for(let count=1;count<=5;count++)test('atomic create '+count+' workouts',async()=>{const s=setup({results:[{data:'plan-id'}]});assert.equal(await s.api.create({student_id:'student',name:' Test ',workout_count:count}),'plan-id');const payload=s.calls[0].args.p_payload;assert.equal(payload.workouts.length,count);assert.equal(payload.plan_name,'Test');assert.equal(s.calls.length,1);assert.equal(s.calls[0].rpc,'import_training_plan');});
for(const [values,code] of [[{name:'',student_id:'s',workout_count:3},'invalid_plan'],[{name:'x',workout_count:3},'invalid_plan'],[{name:'x',student_id:'s',workout_count:6},'invalid_workout_count'],[{name:'x',student_id:'s',workout_count:2.5},'invalid_workout_count'],[{name:'x',student_id:'s',workout_count:3,starts_on:'2026-10-10',ends_on:'2026-10-01'},'invalid_dates'],[{name:'x',student_id:'s',workout_count:3,starts_on:'2026-02-30'},'invalid_dates']])test('invalid create '+code+JSON.stringify(values),()=>{const s=setup();assert.throws(()=>s.api.createPayload(values),e=>e.code===code);assert.equal(s.calls.length,0);});
test('atomic create server failure propagates',async()=>{const s=setup({results:[{error:{code:'42501'}}]});await assert.rejects(s.api.create({name:'x',student_id:'s',workout_count:3}));});
test('base editor emits correct plan marker',async()=>{
 const html=fs.readFileSync(__dirname+'/../admin.html','utf8');
 for(const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g))if(!m[1].includes('src='))new vm.Script(m[2]);
 const fn=html.slice(html.indexOf('async function openTrainingPlan('),html.indexOf('async function renderWorkout('));
 const s=setup({results:[{data:{id:'p',name:'Teste',student_id:'s'}},{data:[]}]});
 Object.assign(s.context,{students:[],view:{innerHTML:''},esc:x=>x,toast:()=>{},document:{querySelectorAll:()=>[]},renderWorkout:()=>{}});
 vm.runInContext(fn,s.context);await s.context.openTrainingPlan('p');
 assert.ok(s.context.view.innerHTML.includes('data-plan-id="p"'));
});
function uiSetup(options={}) {
 let resolve;const toasts=[],calls=[];
 const context={window:{openTrainingPlan:async()=>{}},view:{querySelectorAll:()=>[]},
   LG_PLANS:{load:options.load|| (async()=>({id:'p',name:'Teste',active:true})),history:async()=>options.sessions||0,setActive:async()=>calls.push('update'),remove:async()=>calls.push('delete'),message:e=>e.code||'error'},
   confirm:()=>options.confirm!==false,prompt:()=>options.typed===undefined?'EXCLUIR':options.typed,toast:t=>toasts.push(t),openTrainingPlan:async()=>{},treinos:async()=>{},document:{}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/../training-ui.js','utf8'),context);
 return {context,toasts,calls};
}
test('cancel toggle does not update',async()=>{const s=uiSetup({confirm:false});await s.context.window.toggleTrainingPlanActive('p');assert.equal(s.calls.length,0);});
test('cancel deletion does not delete',async()=>{const s=uiSetup({confirm:false});await s.context.window.deleteTrainingPlan('p');assert.equal(s.calls.length,0);});
test('wrong confirmation does not delete',async()=>{const s=uiSetup({typed:'wrong'});await s.context.window.deleteTrainingPlan('p');assert.equal(s.calls.length,0);});
test('UI blocks delete before confirmation for history',async()=>{const s=uiSetup({sessions:1});await s.context.window.deleteTrainingPlan('p');assert.equal(s.calls.length,0);assert.equal(s.toasts[0],'plan_has_history');});
test('double click shares busy guard across operations',async()=>{let resolve;const s=uiSetup({load:()=>new Promise(r=>resolve=r)});const p=s.context.window.toggleTrainingPlanActive('p');await s.context.window.deleteTrainingPlan('p');resolve({id:'p',name:'Teste',active:true});await p;assert.deepEqual(s.calls,['update']);});
test('failure releases busy guard',async()=>{let first=true;const s=uiSetup({load:async()=>{if(first){first=false;throw new Error('offline');}return{id:'p',name:'Teste',active:true};}});await s.context.window.toggleTrainingPlanActive('p');await s.context.window.toggleTrainingPlanActive('p');assert.deepEqual(s.calls,['update']);});
