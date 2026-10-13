const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={Date,URL,AbortController,setTimeout,clearTimeout};c.window=c;vm.createContext(c);
for(const f of ['workout-journal.js','portal-model.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const J=c.LG_JOURNAL,M=c.LG_PORTAL;
test('sequence first, next, wrap, foreign last and no workouts',()=>{
 const ws=[{id:'a'},{id:'b'},{id:'c'}];
 assert.equal(J.suggested(ws,null),'a');assert.equal(J.suggested(ws,{workout_id:'a'}),'b');
 assert.equal(J.suggested(ws,{workout_id:'c'}),'a');assert.equal(J.suggested(ws,{workout_id:'foreign'}),'a');assert.equal(J.suggested([],null),null);
});
test('month range handles leap year and year transition in local time',()=>{
 const feb=J.monthRange(2024,1),dec=J.monthRange(2026,11);
 assert.equal(new Date(feb.start).getDate(),1);assert.equal(new Date(feb.end).getMonth(),2);
 assert.equal(new Date(dec.end).getFullYear(),2027);
 assert.equal((J.calendar(2024,1,[],'').match(/data-day=/g)||[]).length,29);
});
test('same local day aggregates multiple sessions, date check is escaped',()=>{
 const when=new Date(2026,9,22,20),key=J.dayKey(when);
 assert.equal(key,'2026-10-22');
 const html=J.calendar(2026,9,[{performed_at:when},{performed_at:when}],key);
 assert.match(html,/2 treino\(s\) registrado\(s\)/);assert.equal((html.match(/has-session/g)||[]).length,1);
});
test('observations trimmed, omitted empty, bounded and escaped in detail',()=>{
 assert.equal(J.normalizeNotes({e:' note '}).e,'note');assert.equal(Object.keys(J.normalizeNotes({e:' '})).length,0);
 assert.throws(()=>J.normalizeNotes({e:'x'.repeat(2001)}));assert.throws(()=>J.normalizeNotes({e:{}}));
 const html=J.detail({exercise_notes:{e:'<img onerror=bad>'},workout_snapshot:{exercises:{e:{name:'Supino original'}}}},[{exercise_id:'e',set_number:1,load_kg:0,reps:12,rir:0,workout_exercises:{exercise_name:'Renamed'}}]);
 assert.match(html,/Supino original/);assert.ok(!html.includes('Renamed'));assert.match(html,/&lt;img/);assert.match(html,/>0<\/td>/);
 assert.match(J.detail({},[{exercise_id:'e',workout_exercises:{exercise_name:'Legacy'}}]),/Legacy/);
});
test('notes-only exercise remains visible in daily detail',()=>assert.match(J.detail({exercise_notes:{e:'Não fiz hoje'},workout_snapshot:{exercises:{e:{name:'Agachamento'}}}},[]),/Sem séries registradas/));
test('monthly query scopes owner, start inclusive/end exclusive and paginates',async()=>{
 const calls=[];let offset=0;
 const q=new Proxy({then(resolve){return Promise.resolve({data:offset===0?Array.from({length:500},(_,i)=>({id:i})):Array.from({length:7},(_,i)=>({id:500+i}))}).then(resolve);}}, {get(t,k){if(k==='then')return t.then;return(...args)=>{calls.push([k,...args]);if(k==='range')offset=args[0];return q;};}});
 const rows=await M.createApi({from:()=>q},'owner').sessionsMonth(2026,9);
 assert.equal(rows.length,507);assert.ok(calls.some(x=>x[0]==='eq'&&x[1]==='student_id'&&x[2]==='owner'));
 assert.ok(calls.some(x=>x[0]==='gte'));assert.ok(calls.some(x=>x[0]==='lt'));assert.equal(calls.filter(x=>x[0]==='range').length,2);
});
test('new save uses v2 with notes and validates before any RPC',async()=>{
 let called=0,payload;
 const q={abortSignal(){return this;},then(resolve){return Promise.resolve({data:{id:'s'}}).then(resolve);}};
 const api=M.createApi({rpc(name,args){called++;assert.equal(name,'record_student_workout_v2');payload=args;return q;}},'owner');
 const rows=[{exercise_id:'e',set_number:1,reps:12,load_kg:20,completed:true}];
 await api.record('s','w',new Date().toISOString(),'session',rows,{e:'note'});
 assert.equal(payload.p_exercise_notes.e,'note');assert.equal(payload.p_sets[0].load_kg,20);assert.equal(payload.p_student_id,undefined);
 await assert.rejects(()=>api.record('s','w',new Date().toISOString(),'',rows,{e:'x'.repeat(2001)}));assert.equal(called,1);
});
