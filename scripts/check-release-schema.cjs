// Deployment must never expose the new client before the corresponding DB migrations exist.
const fs=require('node:fs'),vm=require('node:vm');const context={location:{pathname:'/'}};context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync('config.js','utf8'),context);
(async()=>{
 const response=await fetch(context.LG_CONFIG.supabaseUrl+'/rest/v1/rpc/review_release_ready',{method:'POST',headers:{apikey:context.LG_CONFIG.supabaseKey,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(15000)});
 if(!response.ok||await response.json()!==true)throw Error('Deploy bloqueado: aplique e valide as três migrations de revisão antes de publicar o frontend.');
 console.log('PASS: database release contract ready');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
