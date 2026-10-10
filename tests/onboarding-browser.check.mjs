import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {onboardingChecks} from './onboarding-checks.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_ENTRY||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const browser=await chromium.launch({headless:true});
try{
 for(const width of [320,390,768,1440])for(const mode of ['normal','foreign','inactive']){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();
  await page.addInitScript({path:root+'tests/onboarding-fixture.js'});
  await page.addInitScript(mode=>{window.addEventListener('DOMContentLoaded',()=>{window.ONBOARDING_QA.foreign=mode==='foreign';window.ONBOARDING_QA.inactive=mode==='inactive';});},mode);
  await page.route('**/*',route=>{
   const url=new URL(route.request().url()),file=url.pathname.slice(1)||'cadastro.html';
   if(url.hostname!=='onboarding.test')return route.fulfill({status:200,body:''});
   if(!/^[\w./-]+$/.test(file)||file.includes('..'))return route.abort();
   const contentType=file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.webp')?'image/webp':'text/html';
   return route.fulfill({status:200,contentType,body:fs.readFileSync(root+file)});
  });
  await page.goto('https://onboarding.test/cadastro.html');
  console.log('PASS Chromium '+width+' '+mode+': '+await page.evaluate(onboardingChecks));
  const fits=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);assert.ok(fits,'Onboarding content must fit at '+width);
  await context.close();
 }
}finally{await browser.close();}
