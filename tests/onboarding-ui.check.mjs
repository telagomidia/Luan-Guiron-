import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {onboardingChecks} from './onboarding-checks.mjs';
const {Window}=await import(process.env.HAPPY_DOM_ENTRY||'happy-dom');
const root=fileURLToPath(new URL('../',import.meta.url));
for(const mode of ['normal','foreign','inactive']){
 const w=new Window({url:'https://onboarding.test/cadastro.html',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,disableComputedStyleRendering:true}});
 w.document.write(fs.readFileSync(root+'cadastro.html','utf8').replace(/<script\b[\s\S]*?<\/script>/gi,''));w.scrollTo=()=>{};
 w.eval(fs.readFileSync(root+'tests/onboarding-fixture.js','utf8'));w.ONBOARDING_QA.foreign=mode==='foreign';w.ONBOARDING_QA.inactive=mode==='inactive';
 for(const file of ['config.js','auth-client.js','anamnesis-schema.js','portal-model.js','onboarding-model.js','onboarding-page.js'])w.eval(fs.readFileSync(root+file,'utf8'));
 console.log('PASS '+mode+': '+await w.eval('('+onboardingChecks.toString()+')()'));
 await w.happyDOM.close();
}
