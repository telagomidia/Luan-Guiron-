const {test}=require('node:test'),assert=require('node:assert/strict');
const teacher='11111111-1111-4111-8111-111111111111',student='22222222-2222-4222-8222-222222222222';
async function setup(action,options={}){
 const {studentAdministrationHandler}=await import('../supabase/functions/student-administration/handler.mjs');let calls=[];
 const result=opts=>({select(){return this;},eq(){return this;},maybeSingle:async()=>opts});
 const caller=()=>({auth:{getUser:async()=>options.invalidSession?{error:{}}:{data:{user:{id:teacher}}}},from:()=>result({data:{role:options.role||'trainer',active:options.active!==false}})});
 const admin={from:()=>({...result({data:{role:options.targetRole||'student'}}),upsert:async profile=>{calls.push(['profile',profile]);return options.saveError?{error:{}}:{};}}),auth:{admin:{createUser:async p=>{calls.push(['create',p]);return {data:{user:{id:student}}};},deleteUser:async id=>{calls.push(['delete',id]);return {};}}}};
 const handler=studentAdministrationHandler({caller,admin,action});
 const req=(body={},extra={})=>new Request('https://example.invalid',{method:'POST',headers:{Authorization:'Bearer qa','Content-Type':'application/json',...extra.headers},body:JSON.stringify(body),...extra});
 return {handler,calls,req};
}
for(const action of ['create','delete']){
 for(const options of [{active:false},{role:'student'},{invalidSession:true}])test(action+' rejects '+JSON.stringify(options),async()=>{const {handler,calls,req}=await setup(action,options);assert.ok((await handler(req({id:student,email:'qa@example.invalid',full_name:'QA'}))).status>=401);assert.equal(calls.length,0);});
 test(action+' rejects wrong method and origin',async()=>{const {handler,calls,req}=await setup(action);assert.equal((await handler(new Request('https://example.invalid'))).status,405);assert.equal((await handler(req({}, {headers:{Authorization:'Bearer qa',Origin:'https://evil.invalid'}}))).status,403);assert.equal(calls.length,0);});
}
test('create accepts only student role and cleans failed profile',async()=>{const {handler,calls,req}=await setup('create',{saveError:true});assert.equal((await handler(req({email:'QA@example.invalid',full_name:' QA ',role:'trainer',active:true,observations:'Private'}))).status,400);assert.equal(calls[0][1].user_metadata.role,undefined);assert.equal(calls[1][1].role,'student');assert.equal(calls[1][1].email,'qa@example.invalid');assert.equal(calls[1][1].observations,'Private');assert.deepEqual(calls[2],['delete',student]);});
test('create succeeds and never returns temporary password',async()=>{const {handler,calls,req}=await setup('create');const response=await handler(req({email:'qa@example.invalid',full_name:'QA'}));assert.equal(response.status,200);assert.deepEqual(await response.json(),{ok:true,id:student});assert.ok(calls[0][1].password);});
for(const body of [{email:'bad',full_name:'QA'},{email:'qa@example.invalid',full_name:''},{email:'qa@example.invalid',full_name:'QA',birth_date:'2026-02-30'},{email:'qa@example.invalid',full_name:'QA',sex:'invalid'}])test('create validates '+JSON.stringify(body),async()=>{const {handler,calls,req}=await setup('create');assert.equal((await handler(req(body))).status,400);assert.equal(calls.length,0);});
test('delete forbids self, invalid ID and non-student target',async()=>{const {handler,calls,req}=await setup('delete',{targetRole:'trainer'});for(const id of [teacher,'bad',student])assert.ok((await handler(req({id}))).status>=400);assert.equal(calls.length,0);});
test('delete removes only validated student target',async()=>{const {handler,calls,req}=await setup('delete');assert.equal((await handler(req({id:student}))).status,200);assert.deepEqual(calls,[['delete',student]]);});
