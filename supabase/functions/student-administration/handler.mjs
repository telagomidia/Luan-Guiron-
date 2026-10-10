// Shared guard for existing create-student/delete-student service-role endpoints.
export function studentAdministrationHandler({caller,admin,action}){
 const origin='https://telagomidia.github.io',headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
 const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
 return async req=>{
  if(req.headers.get('Origin')&&req.headers.get('Origin')!==origin)return reply({error:'Origem não permitida.'},403);
  if(req.method==='OPTIONS')return new Response('ok',{headers});
  if(req.method!=='POST')return reply({error:'Use POST.'},405);
  try{
   const authorization=req.headers.get('Authorization')||'';if(!/^Bearer\s+\S+$/i.test(authorization))return reply({error:'Entre novamente.'},401);
   const client=caller(authorization),identity=await client.auth.getUser();if(identity.error||!identity.data?.user)return reply({error:'Sessão inválida.'},401);
   const trainer=await client.from('profiles').select('role,active').eq('id',identity.data.user.id).maybeSingle();
   if(trainer.error||trainer.data?.role!=='trainer'||trainer.data.active!==true)return reply({error:'Apenas o professor ativo pode gerenciar alunos.'},403);
   const raw=await req.text();if(raw.length>20000)return reply({error:'Dados muito grandes.'},400);let body;try{body=JSON.parse(raw);}catch{return reply({error:'Dados inválidos.'},400);}if(!body||typeof body!=='object'||Array.isArray(body))return reply({error:'Dados inválidos.'},400);
   if(action==='delete'){
    const id=body.id;if(typeof id!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)||id===identity.data.user.id)return reply({error:'Selecione um aluno válido.'},400);
    const student=await admin.from('profiles').select('role').eq('id',id).maybeSingle();if(student.error||student.data?.role!=='student')return reply({error:'Perfil de aluno não encontrado.'},404);
    const deleted=await admin.auth.admin.deleteUser(id);if(deleted.error)return reply({error:'Não foi possível excluir o aluno. Verifique vínculos e arquivos antes de tentar novamente.'},400);return reply({ok:true});
   }
   if(action!=='create')return reply({error:'Operação inválida.'},400);
   const text=(field,max)=>{const v=body[field];if(v==null||v==='')return null;if(typeof v!=='string'||v.length>max)throw new Error('invalid_field');return v.trim()||null;};
   let email,full_name,phone,birth_date,sex,start_date,goal,observations;
   try{email=text('email',254)?.toLowerCase();full_name=text('full_name',160);phone=text('phone',40);birth_date=text('birth_date',10);sex=text('sex',10);start_date=text('starts_on',10);goal=text('goal',1000);observations=text('observations',10000);}catch{return reply({error:'Confira os campos do cadastro.'},400);}
   const date=v=>v===null||(/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v);
   if(!email||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!full_name||!date(birth_date)||!date(start_date)||(sex!==null&&!['female','male'].includes(sex)))return reply({error:'Confira nome, e-mail, datas e sexo do cadastro.'},400);
   const created=await admin.auth.admin.createUser({email,password:crypto.randomUUID()+'Aa1!',email_confirm:true,user_metadata:{full_name}});
   if(created.error||!created.data?.user)return reply({error:'Não foi possível criar o acesso. Confira se o e-mail já está cadastrado.'},400);
   const id=created.data.user.id,profile={id,role:'student',full_name,email,phone,birth_date,sex,start_date,goal,observations,active:true};
   const saved=await admin.from('profiles').upsert(profile);if(saved.error){const cleanup=await admin.auth.admin.deleteUser(id);return reply({error:cleanup.error?'O cadastro ficou incompleto. Peça revisão ao administrador antes de repetir.':'Não foi possível gravar o perfil. Confira os dados.'},400);}
   return reply({ok:true,id});
  }catch{return reply({error:'Não foi possível concluir. Confira sua conexão e tente novamente.'},500);}
 };
}
