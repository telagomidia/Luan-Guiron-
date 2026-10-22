// Synthetic registration fixture; no email or database traffic.
(() => {
 const qa=window.ONBOARDING_QA={signup:0,login:0,writes:[],mode:'normal'};
 const original=window.setTimeout.bind(window);
 window.setTimeout=(fn,delay,...args)=>{if(delay===5000){qa.redirect={fn,delay};return -5000;}return original(fn,delay,...args);};
 window.supabase={createClient:(url,key,options)=>{
  qa.options=options;
  return {auth:{signUp:async args=>{qa.signup++;qa.signupArgs=args;if(qa.mode==='failure')return{error:{code:'weak_password'}};if(qa.mode==='uncertain')throw{code:'request_timeout'};return{data:{user:{id:'qa-student'},session:null}};}}};
 }};
})();
