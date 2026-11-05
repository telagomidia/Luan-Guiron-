import fs from 'node:fs';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_ENTRY||'playwright');
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']}:{})});
try {
 for(const reducedMotion of ['no-preference','reduce']) {
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<body data-lg-page="portal"><form><label>E-mail<input type="email" required aria-describedby="hint"></label><span id="hint">Seu e-mail</span><button>Enviar</button></form><button id="copy">Copiar</button><div id="content"></div><dialog><input type="file" data-photo="front"></dialog><p id="reading">Conteúdo estático</p></body>');
  await page.addStyleTag({content:read('lg-interactions.css')});
  await page.addScriptTag({content:read('lg-interactions.js')});
  await page.locator('form button').click();
  assert.equal(await page.locator('[aria-invalid="true"]').count(),1);
  assert.match(await page.locator('input[type=email]').getAttribute('aria-describedby'),/hint lg-field-error-/);
  await page.locator('input[type=email]').fill('aluno@example.test');
  assert.equal(await page.locator('.lg-field-error').count(),0);
  assert.equal(await page.locator('input[type=email]').getAttribute('aria-describedby'),'hint');
  assert.notEqual(await page.locator('input[type=email]').evaluate(el=>getComputedStyle(el).outlineStyle),'none');
  await page.evaluate(()=>{const c=document.querySelector('#content');c.innerHTML='<section id="result"><h2>Salvo</h2></section>';LG_MOTION.celebrate(c.firstChild,true);LG_MOTION.celebrate(c.firstChild,true);});
  assert.equal(await page.locator('.lg-success-mark').count(),1);
  assert.equal(await page.locator('.lg-success-mark i').count(),reducedMotion==='reduce'?0:10);
  if(reducedMotion==='reduce')assert.equal(await page.locator('.lg-success-mark path').evaluate(el=>getComputedStyle(el).animationName),'none');
  assert.equal(await page.locator('#reading').evaluate(el=>getComputedStyle(el).animationName),'none');
  await page.evaluate(()=>{const b=document.querySelector('#copy');LG_MOTION.copied(b);LG_MOTION.copied(b);document.querySelector('dialog').showModal();});
  const image={name:'test.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS1sAAAAASUVORK5CYII=','base64')};
  await page.locator('[data-photo]').setInputFiles(image);
  assert.equal(await page.locator('.lg-photo-preview').count(),1);
  const old=await page.locator('.lg-photo-preview').getAttribute('src');
  await page.locator('[data-photo]').setInputFiles({...image,name:'other.png'});
  assert.equal(await page.locator('.lg-photo-preview').count(),1);
  assert.notEqual(await page.locator('.lg-photo-preview').getAttribute('src'),old);
  await page.evaluate(()=>document.querySelector('dialog').close());
  await page.waitForFunction(()=>!document.querySelector('.lg-photo-preview'));
  await page.waitForFunction(()=>document.querySelector('#copy').textContent==='Copiar');
  assert.deepEqual(errors,[]);
  await page.close();
 }
 console.log('PASS: keyboard focus, native validation recovery, bounded feedback, single celebration, reduced motion, repeat-copy and photo preview lifecycle');
}finally{await browser.close();}
