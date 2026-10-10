// Synthetic fixture only; never contacts Supabase or stores clinical data.
(() => {
 const qa=window.ONBOARDING_QA={signup:0,login:0,writes:[],pending:true,confirmed:false,failSave:false,foreign:false,inactive:false};
 window.supabase={createClient:(url,key,options)=>{
  qa.options=options;
  const user={id:'onboarding-qa-student',email:'onboarding-qa@example.invalid'};
  const builder=table=>{
   let row;
   const q={select(){return this;},eq(){return this;},order(){return this;},limit(){return this;},abortSignal(){return this;},single(){return this;},maybeSingle(){return this;},upsert(value){row=value;qa.writes.push(value);return this;},then(resolve,reject){
    const result=table==='profiles'?{data:{id:user.id,role:'student',active:!qa.inactive}}:row?qa.failSave?{error:{code:'42501'}}:{data:{id:row.id,student_id:row.student_id}}:{data:null};
    return new Promise(r=>setTimeout(()=>r(result),10)).then(resolve,reject);
   }};return q;
  };
  return{from:builder,auth:{
   signUp:async()=>{qa.signup++;return{data:{user,session:qa.pending?null:{}}};},
   signInWithPassword:async()=>{qa.login++;return qa.confirmed?{data:{user,session:{}}}:{error:{code:'email_not_confirmed'}};},
   getUser:async()=>({data:{user:qa.foreign?{...user,id:'foreign'}:user}})
  }};
 }};
})();
