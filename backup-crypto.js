(function(root,factory){const api=factory(root.crypto||(typeof require==='function'?require('node:crypto').webcrypto:null));if(typeof module==='object'&&module.exports)module.exports=api;else root.LG_BACKUP=api;})(globalThis,function(crypto){
 'use strict';
 const TABLES=['profiles','exercise_library','assessments','circumferences','skinfolds','strength_tests','vo2_tests','vo2_stages','anamneses','training_plans','workouts','workout_exercises','workout_sessions','exercise_sets','guidance','progress_photos','student_followups'];
 const BUCKETS=['progress-photos','assessment-docs','assessment-documents'];
 const ITERATIONS=600000,MAX_FILE=100*1024*1024,MAX_BYTES=50*1024*1024;
 const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
 function fail(message){throw new Error(message);}
 function password(value){if(typeof value!=='string'||value.length<12||value.length>256)fail('Use uma senha de backup com 12 a 256 caracteres.');return value;}
 function b64(bytes){let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);}
 function bytes(s,max=MAX_FILE){if(typeof s!=='string'||s.length>Math.ceil(max/3)*4||s.length%4!==0||/[^A-Za-z0-9+/=]/.test(s))fail('Arquivo de backup inválido.');let a;try{a=Uint8Array.from(atob(s),c=>c.charCodeAt(0));}catch{fail('Arquivo de backup inválido.');}if(a.length>max)fail('Arquivo muito grande.');if(b64(a)!==s)fail('Arquivo de backup inválido.');return a;}
 async function sha256(data){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',data))].map(x=>x.toString(16).padStart(2,'0')).join('');}
 function fileKey(f){if(!f||!BUCKETS.includes(f.bucket_id)||typeof f.name!=='string'||!f.name||f.name.length>1024||f.name.startsWith('/')||f.name.split('/').some(x=>x==='..'||!x))fail('Referência de arquivo inválida.');return f.bucket_id+'/'+f.name;}
 function snapshot(value){
  if(!value||value.format!=='lg-system-snapshot'||value.version!==1||value.project_ref!=='ziunjhebdkqdmvsrjxhm'||!Number.isFinite(Date.parse(value.created_at)))fail('Formato de backup incompatível.');
  if(!value.tables||Object.keys(value.tables).length!==TABLES.length||Object.keys(value.tables).some(x=>!TABLES.includes(x)))fail('Tabelas do backup incompatíveis.');
  for(const t of TABLES)if(!Array.isArray(value.tables[t])||value.tables[t].length>100000||value.tables[t].some(r=>!r||typeof r!=='object'||Array.isArray(r)))fail('Tabela inválida: '+t);
  if(!Array.isArray(value.private_notes)||!Array.isArray(value.storage_files)||value.storage_files.length>10000)fail('Manifesto de backup inválido.');
  const indexes={};for(const t of TABLES){indexes[t]=new Set();for(const r of value.tables[t]){const k=r.id??r.assessment_id;if(k==null||indexes[t].has(String(k)))fail('Identificador ausente ou duplicado: '+t);indexes[t].add(String(k));}}
  const links={assessments:['profiles','student_id'],circumferences:['assessments','assessment_id'],skinfolds:['assessments','assessment_id'],strength_tests:['assessments','assessment_id'],vo2_tests:['assessments','assessment_id'],vo2_stages:['vo2_tests','vo2_test_id'],anamneses:['profiles','student_id'],training_plans:['profiles','student_id'],workouts:['training_plans','plan_id'],workout_exercises:['workouts','workout_id'],workout_sessions:['profiles','student_id'],exercise_sets:['workout_sessions','session_id'],guidance:['profiles','student_id'],progress_photos:['profiles','student_id'],student_followups:['profiles','student_id']};
  for(const [t,[parent,key]] of Object.entries(links))for(const r of value.tables[t])if(r[key]!=null&&!indexes[parent].has(String(r[key])))fail('Referência sem registro: '+t+'.'+key);
  for(const [t,parent,key] of [['workout_sessions','workouts','workout_id'],['exercise_sets','workout_exercises','exercise_id']])for(const r of value.tables[t])if(!indexes[parent].has(String(r[key])))fail('Referência sem registro: '+t+'.'+key);
  for(const n of value.private_notes)if(!indexes.profiles.has(String(n.profile_id))||typeof n.observations!=='string')fail('Observação privada inválida.');
  const names=new Set();for(const f of value.storage_files){const key=fileKey(f);if(names.has(key))fail('Arquivo duplicado.');names.add(key);}
  for(const p of value.tables.progress_photos)if(p.storage_path&&!names.has('progress-photos/'+p.storage_path))fail('Backup incompleto: foto cadastrada sem arquivo no Storage.');
  for(const a of value.tables.assessments)if(a.bioimpedance_pdf_path&&!names.has('assessment-documents/'+a.bioimpedance_pdf_path)&&!names.has('assessment-docs/'+a.bioimpedance_pdf_path))fail('Backup incompleto: PDF cadastrado sem arquivo no Storage.');
  if(encoder.encode(JSON.stringify(value)).length>20*1024*1024)fail('Dados do backup excedem 20 MB.');
  return value;
 }
 async function validate(payload){
  if(!payload||payload.format!=='lg-encrypted-app-content'||payload.version!==1||!Array.isArray(payload.attachments))fail('Conteúdo de backup inválido.');
  const s=snapshot(payload.snapshot),expected=new Set(s.storage_files.map(fileKey)),seen=new Set();let total=0;
  for(const a of payload.attachments){const key=fileKey(a);if(!expected.has(key)||seen.has(key))fail('Arquivos não correspondem ao manifesto.');seen.add(key);const data=bytes(a.data,MAX_BYTES);total+=data.length;if(total>MAX_BYTES||a.size!==data.length||typeof a.sha256!=='string'||a.sha256!==await sha256(data))fail('Integridade dos arquivos não confirmada.');}
  if(seen.size!==expected.size)fail('Backup incompleto: faltam arquivos.');
  return {created_at:s.created_at,tables:Object.fromEntries(TABLES.map(t=>[t,s.tables[t].length])),files:seen.size,bytes:total,private_notes:s.private_notes.length};
 }
 async function key(pass,salt){if(!crypto?.subtle)fail('Este navegador não oferece criptografia segura. Use HTTPS e um navegador atualizado.');const material=await crypto.subtle.importKey('raw',encoder.encode(password(pass)),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:ITERATIONS},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
 const aad=encoder.encode('lg-app-backup:1:AES-256-GCM:PBKDF2-SHA256:600000');
 async function encrypt(payload,pass){await validate(payload);password(pass);const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),plain=encoder.encode(JSON.stringify(payload));if(plain.length>75*1024*1024)fail('Backup muito grande.');const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad},await key(pass,salt),plain);plain.fill(0);return JSON.stringify({format:'lg-app-backup',version:1,cipher:'AES-256-GCM',kdf:'PBKDF2-SHA256',iterations:ITERATIONS,salt:b64(salt),iv:b64(iv),ciphertext:b64(new Uint8Array(ciphertext))});}
 async function decrypt(text,pass){password(pass);if(typeof text!=='string'||text.length>MAX_FILE)fail('Arquivo muito grande.');let envelope;try{envelope=JSON.parse(text);}catch{fail('Arquivo de backup inválido.');}
  if(envelope?.format!=='lg-app-backup'||envelope.version!==1||envelope.cipher!=='AES-256-GCM'||envelope.kdf!=='PBKDF2-SHA256'||envelope.iterations!==ITERATIONS)fail('Formato de backup incompatível.');
  const salt=bytes(envelope.salt,16),iv=bytes(envelope.iv,12),ciphertext=bytes(envelope.ciphertext,75*1024*1024+16);if(salt.length!==16||iv.length!==12)fail('Arquivo de backup inválido.');let plain;
  try{plain=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:aad},await key(pass,salt),ciphertext));}catch{fail('Senha incorreta ou arquivo alterado.');}
  let payload;try{payload=JSON.parse(decoder.decode(plain));}finally{plain.fill(0);}await validate(payload);return payload;
 }
 async function deadline(promise){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('A conexão demorou demais. Tente novamente.')),30000);})]);}finally{clearTimeout(timer);}}
 async function collect(client,progress=()=>{}){const {data,error}=await deadline(client.rpc('export_system_backup'));if(error)throw new Error('Não foi possível obter o backup. Confira seu acesso de professor ativo.');const s=snapshot(data),attachments=[];let total=0;
  for(const f of s.storage_files){progress('Copiando arquivo '+(attachments.length+1)+' de '+s.storage_files.length+'…');const out=await deadline(client.storage.from(f.bucket_id).download(f.name));if(out.error||!out.data)fail('Falha ao copiar um arquivo. Nenhum backup será disponibilizado.');if(total+out.data.size>MAX_BYTES)fail('Arquivos excedem 50 MB. Use um backup operacional externo.');const data=new Uint8Array(await out.data.arrayBuffer());total+=data.length;attachments.push({bucket_id:f.bucket_id,name:f.name,size:data.length,sha256:await sha256(data),data:b64(data)});}
  // Storage bytes are outside Postgres MVCC. Reject inventory changes during collection.
  const check=await deadline(client.rpc('export_system_backup'));if(check.error||JSON.stringify(check.data?.storage_files)!==JSON.stringify(s.storage_files))fail('Os arquivos mudaram durante o backup. Tente novamente sem uploads em andamento.');
  const payload={format:'lg-encrypted-app-content',version:1,snapshot:s,attachments};await validate(payload);return payload;
 }
 return Object.freeze({TABLES,BUCKETS,MAX_FILE,ITERATIONS,password,snapshot,validate,encrypt,decrypt,collect,sha256,b64});
});
