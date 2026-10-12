// Real browser, actual portal scripts and CSS; synthetic data, no account access.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_ENTRY||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const read=f=>fs.readFileSync(root+f);
const output=process.env.MOBILE_SCREENSHOTS||'/tmp/mobile-layout-screenshots';
fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']}:{})});
try{
 for(const width of [320,390,430,768,850,851,1440]){
  const page=await browser.newPage({viewport:{width,height:844}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>{
   const pathname=new URL(r.request().url()).pathname;
   const f=pathname.slice(1);
   if(!/^[\w./-]+$/.test(f)||f.includes('..')||!fs.existsSync(root+f))return r.abort();
   return r.fulfill({contentType:f.endsWith('.css')?'text/css':f.endsWith('.webp')?'image/webp':'text/html',body:f==='portal.html'?read(f).toString().replace(/<script\b[\s\S]*?<\/script>/gi,''):read(f)});
  });
  await page.goto('http://portal.test/portal.html');
  await page.evaluate(()=>{
   const profile={id:'qa',role:'student',full_name:'Lucas Teste',email:'qa@example.invalid'};
   window.LG_AUTH={createClient:()=>({}),access:async()=>({user:{id:'qa'},profile}),sessionExpired:()=>false,message:()=> 'Falha'};
   window.qaApi={profile:async()=>profile,plans:async()=>[{id:'plan',active:true,name:'Bloco inicial — adaptação técnica, hipertrofia e recomposição corporal',goal:'Hipertrofia com ênfase em peito, ombros, costas e braços.'}],sessions:async()=>[],assessments:async()=>[],anamnesis:async()=>null,guidance:async()=>[]};
  });
  for(const f of ['anamnesis-schema.js','portal-model.js','portal-views.js'])await page.addScriptTag({content:read(f).toString()});
  await page.evaluate(()=>window.LG_PORTAL={...LG_PORTAL,createApi:()=>qaApi});
  await page.addScriptTag({content:read('portal-app.js').toString()});
  await page.locator('.training-focus').waitFor();
  const toggle=page.locator('#portalMenuToggle'),nav=page.locator('#studentNav');
  const fits=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow @'+width);
  await fits();
  assert.notEqual(await page.locator('.training-focus').evaluate(e=>getComputedStyle(e).boxShadow),'none');
  if(width<=850){
   assert.equal(await nav.isVisible(),false);
   const brand=await page.locator('header .brand').boundingBox();
   assert.ok(Math.abs(brand.x+brand.width/2-width/2)<2,'Centered brand @'+width);
   assert.ok((await page.locator('h1').boundingBox()).y<180,'No empty navigation gap');
   await toggle.focus();await page.keyboard.press('Enter');assert.equal(await toggle.getAttribute('aria-expanded'),'true');
   assert.equal(await nav.locator('button:visible').count(),8);await fits();
   assert.equal(await nav.evaluate(e=>getComputedStyle(e).position),'static');
   const navBox=await nav.boundingBox(),mainBox=await page.locator('main').boundingBox();
   assert.ok(navBox.y>=71&&mainBox.y>=navBox.y+navBox.height-1,'Menu below header without covering content');
   if(width===390)await page.screenshot({path:output+'/portal-menu-open.png'});
   await page.keyboard.press('Escape');assert.equal(await nav.isVisible(),false);
   assert.equal(await toggle.evaluate(e=>e===document.activeElement),true);
   await toggle.click();await page.locator('[data-page="guidance"]').click();
   await page.getByRole('heading',{name:'Minhas orientações'}).waitFor();
   assert.equal(await nav.isVisible(),false);assert.equal(await page.locator('#content').evaluate(e=>e===document.activeElement),true);
   await toggle.click();await page.locator('[data-page="profile"]').click();
   await page.locator('#profileName').fill('Alteração não salva');
   page.once('dialog',dialog=>dialog.dismiss());
   await toggle.click();await page.locator('[data-page="home"]').click();
   assert.equal(await nav.isVisible(),true);assert.equal(await page.locator('#profileName').inputValue(),'Alteração não salva');
   await page.locator('h1').click();assert.equal(await nav.isVisible(),false);
   page.once('dialog',dialog=>dialog.accept());await toggle.click();await page.locator('[data-page="home"]').click();
   await page.locator('.training-focus').waitFor();
   assert.equal(await page.evaluate(()=>scrollY),0,'Header remains reachable after navigation');
   if(width===390)await page.screenshot({path:output+'/portal-menu-closed.png'});
   await toggle.click();await page.setViewportSize({width:1200,height:844});
   assert.equal(await toggle.isVisible(),false);assert.equal(await nav.isVisible(),true);
   await page.waitForFunction(()=>document.querySelector('#portalMenuToggle').getAttribute('aria-expanded')==='false');
   await page.setViewportSize({width,height:844});await nav.waitFor({state:'hidden'});
  }else{assert.equal(await toggle.isVisible(),false);assert.equal(await nav.locator('button:visible').count(),8);}
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('PASS: portal top menu at seven widths, brand centering, keyboard/Escape, all options, focus, dirty form guard, outside click, resize, shadows and no overflow.');
}finally{await browser.close();}
