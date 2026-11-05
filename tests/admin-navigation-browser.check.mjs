import fs from 'node:fs';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_ENTRY||'playwright');
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
const html=read('admin.html'),inline=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].filter(m=>!m[1].includes('src=')).map(m=>m[2]).join('\n');
const browser=await chromium.launch({headless:true});
try{
 for(const width of [320,390,850,851,1440]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>{const f=new URL(r.request().url()).pathname.slice(1);if(f.includes('..'))return r.abort();try{r.fulfill({contentType:f.endsWith('.css')?'text/css':f.endsWith('.webp')?'image/webp':'text/html',body:f.endsWith('.webp')?fs.readFileSync(new URL('../'+f,import.meta.url)):f==='admin.html'?html.replace(/<script\b[\s\S]*?<\/script>/g,''):read(f)});}catch{r.abort();}});
  await page.goto('https://admin.test/admin.html');
  await page.evaluate(()=>{
   const query={select(){return this},eq(){return this},order(){return this},then(resolve){resolve({data:[],count:0})}};
   window.LG_AUTH={createClient:()=>({from:()=>query,rpc:async()=>({data:[]})}),access:async()=>({profile:{role:'trainer',full_name:'Luan Guiron'}})};
   window.LG_URLS={signup:()=> 'https://luanguiron.com.br/cadastro'};
   Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>window.copiedLink=text}});
  });
  await page.addScriptTag({content:inline});await page.locator('.stats').waitFor();
  await page.addScriptTag({content:read('admin-navigation.js')});
  await page.addScriptTag({content:read('lg-interactions.js')});
  assert.equal(await page.locator('.quick-links').count(),0);
  assert.equal(await page.locator('#nav button').count(),9);
  assert.equal(await page.locator('#nav [aria-current="page"]').innerText(),'Visão geral');
  const fits=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await fits();
  if(width<=850){
   assert.equal(await page.locator('#nav').isVisible(),false);
   await page.locator('#adminMenuToggle').focus();await page.keyboard.press('Enter');
   assert.equal(await page.locator('#adminMenuToggle').getAttribute('aria-expanded'),'true');
   assert.equal(await page.locator('#adminMenuDialog').evaluate(e=>e.open),true);
   await page.locator('#adminCopySignup').click();assert.equal(await page.evaluate(()=>copiedLink),'https://luanguiron.com.br/cadastro');
   await page.keyboard.press('Escape');assert.equal(await page.locator('#adminMenuToggle').evaluate(e=>e===document.activeElement),true);
   await page.locator('#adminMenuToggle').click();await page.mouse.click(width-2,450);assert.equal(await page.locator('#nav').isVisible(),false);
   await page.locator('#adminMenuToggle').click();
   if(width===390)await page.waitForTimeout(200);
   if(width===390)await page.screenshot({path:'/tmp/lg-admin-sidebar-mobile.png'});
   await page.locator('#nav [data-page="Alunos"]').click();await page.waitForFunction(()=>!document.querySelector('#adminMenuDialog').open);
   assert.equal(await page.locator('#view').evaluate(e=>e===document.activeElement),true);
   await page.locator('#adminMenuToggle').click();await page.locator('#adminMenuClose').click();
   await page.locator('#adminMenuToggle').click();await page.setViewportSize({width:1200,height:900});await page.waitForFunction(()=>document.querySelector('.shell>#adminSidebar'));
   assert.equal(await page.locator('#adminMenuDialog').evaluate(e=>e.open),false);assert.equal(await page.locator('.shell>#adminSidebar').count(),1);
   await page.setViewportSize({width,height:900});await page.locator('#nav').waitFor({state:'hidden'});assert.equal(await page.locator('#nav').isVisible(),false);
  }else{
   assert.equal(await page.locator('#adminMenuToggle').isVisible(),false);assert.equal(await page.locator('#nav').isVisible(),true);
   if(width===1440)await page.screenshot({path:'/tmp/lg-admin-sidebar-desktop.png'});
  }
  await fits();assert.deepEqual(errors,[]);await page.close();
 }
 console.log('PASS: admin sidebar at 5 widths; 9 routes, no quick-links, keyboard, Escape, backdrop, close, copy, selected route, focus and responsive relocation.');
}finally{await browser.close();}
