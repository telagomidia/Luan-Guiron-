// Browser integration with synthetic data only. No production session or API.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_ENTRY||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),read=f=>fs.readFileSync(root+f,'utf8'),html=read('admin.html');
const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(x=>x.trim()).join('\n');
const browser=await chromium.launch({headless:true});
try{
 for(const width of [320,390,768,1440]){
  const page=await browser.newPage({viewport:{width,height:950},acceptDownloads:true});let errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{const p=new URL(route.request().url()).pathname;return route.fulfill({status:200,contentType:p.endsWith('.css')?'text/css':p.endsWith('.html')?'text/html':'image/svg+xml',body:p.endsWith('/admin.html')?html.replace(/<script\b[\s\S]*?<\/script>/gi,''):p.endsWith('/responsive.css')?read('responsive.css'):p.endsWith('/lg-design.css')?read('lg-design.css'):'<svg xmlns="http://www.w3.org/2000/svg"/>'});});
  await page.goto('https://lg-qa.invalid/admin.html');
  await page.addScriptTag({content:read('backup-crypto.js')});await page.addScriptTag({content:read('backup-ui.js')});
  await page.evaluate(()=>{
   const teacher={id:'qa-teacher',role:'trainer',active:true,full_name:'QA Teacher'},student={id:'qa-student',role:'student',active:true,full_name:'QA Student',observations:null};
   const tables=Object.fromEntries(LG_BACKUP.TABLES.map(t=>[t,[]]));tables.profiles=[teacher,student];
   const snapshot={format:'lg-system-snapshot',version:1,project_ref:'ziunjhebdkqdmvsrjxhm',created_at:new Date().toISOString(),tables,private_notes:[{profile_id:'qa-student',observations:'PRIVATE QA NOTE'}],storage_files:[{bucket_id:'assessment-documents',name:'qa-student/test.pdf',updated_at:'qa'}]};
   window.backupCalls=0;window.rpcFail=false;
   const client={rpc:async name=>{if(name==='get_trainer_profile_notes')return {data:snapshot.private_notes};window.backupCalls++;await new Promise(r=>setTimeout(r,20));return window.rpcFail?{error:{message:'private SQL detail'}}:{data:snapshot};},storage:{from:()=>({download:async()=>({data:new Blob([new Uint8Array([0,255,1,128])])})})},auth:{signOut:async()=>{}},from:table=>({select(){return this;},eq(){return this;},order(){return this;},then(resolve){resolve({data:table==='profiles'?[student]:[],count:0});}})};
   window.LG_AUTH={createClient:()=>client,access:async()=>({profile:teacher}),sessionExpired:()=>false,message:()=>''};
  });
  await page.addScriptTag({content:inline});await page.locator('#dashboardPriorities').waitFor();
  await page.evaluate(()=>studentForm('qa-student'));await page.locator('textarea[name="observations"]').waitFor();assert.equal(await page.locator('textarea[name="observations"]').inputValue(),'PRIVATE QA NOTE');await page.locator('#modal .modalhead button').click();
  await page.locator('[data-page="Segurança"]').click();await page.locator('#backupCreate').waitFor();
  const bounds=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth}));assert.ok(bounds.width<=bounds.viewport+1,'Backup layout overflow at '+width);
  await page.locator('#backupPass').fill('QA-strong-backup-password');await page.locator('#backupConfirm').fill('Other-backup-password');await page.locator('#backupCreate button').click();await page.waitForFunction(()=>document.querySelector('#backupStatus').textContent.includes('não coincidem'));assert.equal(await page.evaluate(()=>backupCalls),0);
  await page.locator('#backupPass').fill('QA-strong-backup-password');await page.locator('#backupConfirm').fill('QA-strong-backup-password');
  await page.evaluate(()=>{document.querySelector('#backupCreate').requestSubmit();document.querySelector('#backupCreate').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
  await page.waitForFunction(()=>document.querySelector('#backupStatus').textContent.includes('Cópia preparada'));assert.equal(await page.evaluate(()=>backupCalls),2);assert.equal(await page.locator('#backupPass').inputValue(),'');
  const encrypted=await page.evaluate(async()=>fetch(document.querySelector('#backupSave').href).then(r=>r.text()));assert.ok(!encrypted.includes('PRIVATE QA NOTE'));
  const downloaded=page.waitForEvent('download');await page.locator('#backupSave').click();assert.match((await downloaded).suggestedFilename(),/\.lgbackup$/);
  async function verify(password){await page.locator('#backupFile').setInputFiles({name:'qa.lgbackup',mimeType:'application/json',buffer:Buffer.from(encrypted)});await page.locator('#backupVerifyPass').fill(password);await page.locator('#backupVerify button').click();}
  await verify('Wrong-backup-password');await page.waitForFunction(()=>document.querySelector('#backupStatus').textContent.includes('Senha incorreta'));assert.equal(await page.locator('#backupVerifyPass').inputValue(),'');
  await verify('QA-strong-backup-password');await page.waitForFunction(()=>document.querySelector('#backupStatus').textContent.includes('Integridade confirmada'));assert.match(await page.locator('#backupStatus').textContent(),/1 arquivos/);
  await page.locator('[data-page="Dashboard"]').click();await page.locator('[data-page="Segurança"]').click();assert.equal(await page.locator('#backupSave').isVisible(),false);assert.equal(await page.locator('#backupPass').inputValue(),'');
  await page.evaluate(()=>window.rpcFail=true);await page.locator('#backupPass').fill('QA-strong-backup-password');await page.locator('#backupConfirm').fill('QA-strong-backup-password');await page.locator('#backupCreate button').click();await page.waitForFunction(()=>document.querySelector('#backupStatus').textContent.includes('professor ativo'));assert.equal(await page.locator('#backupSave').isVisible(),false);assert.equal(await page.locator('#backupCreate button').isDisabled(),false);assert.deepEqual(errors,[]);
  await page.close();
 }
 console.log('PASS: backup browser integration at 320/390/768/1440: teacher notes, navigation, password mismatch, encryption/download, double submit, saved-file verification, wrong password, cleanup and RPC failure');
}finally{await browser.close();}
