// Real local Auth + Mailpit + PostgREST; refuses every non-loopback URL.
import fs from 'node:fs';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
const config=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const origin=config.API_URL||config.api_url,anon=config.ANON_KEY||config.anon_key,service=config.SERVICE_ROLE_KEY||config.service_role_key;
assert.ok(['127.0.0.1','localhost'].includes(new URL(origin).hostname),'Only disposable local Supabase is allowed');
const mail=config.INBUCKET_URL||config.inbucket_url||'http://127.0.0.1:54324';assert.ok(['127.0.0.1','localhost'].includes(new URL(mail).hostname));
const request=async(path,body,token=anon,method=body?'POST':'GET',extra={})=>{const response=await fetch(origin+path,{method,headers:{apikey:anon,Authorization:'Bearer '+token,'Content-Type':'application/json',...extra},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});const data=await response.json();assert.ok(response.ok,'Local API request failed: '+path+' ('+response.status+')');return data;};
const tag=randomUUID(),email='signup-'+tag+'@example.invalid',password='QA-only-'+randomUUID()+'aA1!';
const registered=await request('/auth/v1/signup',{email,password,data:{full_name:'Synthetic Student',role:'trainer',birth_date:'1990-01-01',sex:'male'}});
assert.ok(registered.id||registered.user?.id);assert.ok(!registered.access_token,'Signup must wait for email confirmation');
let confirmation;
for(let i=0;i<40&&!confirmation;i++){
 const list=await fetch(mail+'/api/v1/messages').then(r=>r.json());
 const message=list.messages?.find(m=>m.To?.some(t=>t.Address===email));
 if(message){const detail=await fetch(mail+'/api/v1/message/'+message.ID).then(r=>r.json());confirmation=(detail.HTML||detail.Text||'').match(/https?:[^\s"<>]+\/auth\/v1\/verify\?[^\s"<>]+/)?.[0]?.replaceAll('&amp;','&');}
 if(!confirmation)await new Promise(r=>setTimeout(r,500));
}
assert.ok(confirmation,'Signup confirmation email was not captured by local Mailpit');
assert.ok(['127.0.0.1','localhost'].includes(new URL(confirmation).hostname));
const confirmed=await fetch(confirmation,{redirect:'manual',signal:AbortSignal.timeout(15000)});assert.ok([302,303].includes(confirmed.status));assert.ok(!confirmed.headers.get('location')?.includes('error='));
const login=await request('/auth/v1/token?grant_type=password',{email,password});const token=login.access_token,id=login.user.id;
assert.ok(login.user.email_confirmed_at);const [profile]=await request('/rest/v1/profiles?id=eq.'+id+'&select=id,role',null,token);assert.equal(profile.role,'student','Editable metadata must not grant teacher role');
const anamId=randomUUID();await request('/rest/v1/anamneses',{id:anamId,student_id:id,training_goal:'Synthetic integration goal',sleep_hours:8,answers:{questionnaire_version:2},submitted_at:new Date().toISOString()},token,'POST',{'Prefer':'return=representation'});
const teacherEmail='teacher-'+tag+'@example.invalid';const teacher=await request('/auth/v1/admin/users',{email:teacherEmail,password,email_confirm:true,user_metadata:{full_name:'Synthetic Teacher'}},service);
await request('/rest/v1/profiles?id=eq.'+teacher.id,{role:'trainer'},service,'PATCH');
const teacherLogin=await request('/auth/v1/token?grant_type=password',{email:teacherEmail,password});
const rows=await request('/rest/v1/anamneses?id=eq.'+anamId+'&select=student_id,training_goal',null,teacherLogin.access_token);assert.equal(rows[0].training_goal,'Synthetic integration goal');assert.equal(rows[0].student_id,id);
const other=await request('/auth/v1/admin/users',{email:'other-'+tag+'@example.invalid',password,email_confirm:true,user_metadata:{full_name:'Other Student'}},service);
const otherLogin=await request('/auth/v1/token?grant_type=password',{email:other.email,password});assert.equal((await request('/rest/v1/anamneses?id=eq.'+anamId,null,otherLogin.access_token)).length,0);
console.log('PASS: actual signup, local confirmation email, verification link, login, profile trigger, metadata escalation denied, anamnesis saved, teacher read, other student denied');
