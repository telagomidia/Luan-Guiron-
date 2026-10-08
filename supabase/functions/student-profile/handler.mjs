export function studentProfileHandler({ caller, admin }) {
 const headers={'Access-Control-Allow-Origin':'https://telagomidia.github.io','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
 const reply=(value,status=200)=>new Response(JSON.stringify(value),{status,headers});
 return async request=>{
  if(request.headers.get('Origin')&&request.headers.get('Origin')!=='https://telagomidia.github.io')return reply({error:'Origem não permitida.'},403);
  if(request.method==='OPTIONS')return new Response('ok',{headers});
  if(request.method!=='POST')return reply({error:'Use POST.'},405);
  try{
   const authorization=request.headers.get('Authorization')||'';
   if(!/^Bearer\s+\S+$/i.test(authorization))return reply({error:'Entre novamente.'},401);
   const client=caller(authorization),identity=await client.auth.getUser();
   if(identity.error||!identity.data?.user)return reply({error:'Sessão inválida.'},401);
   const id=identity.data.user.id,access=await client.from('profiles').select('role,active').eq('id',id).maybeSingle();
   if(access.error||access.data?.role!=='student'||access.data.active!==true)return reply({error:'Apenas aluno ativo pode editar seu perfil.'},403);
   const body=await request.json(),name=String(body.full_name||'').trim(),phone=String(body.phone||'').trim(),birth=body.birth_date||null,sex=body.sex||null;
   if(!name||name.length>160||phone.length>40|| (sex!==null&&!['female','male'].includes(sex)))return reply({error:'Confira nome, telefone e sexo.'},400);
   if(birth&&(typeof birth!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(birth)||!Number.isFinite(Date.parse(birth+'T12:00:00Z'))||new Date(birth+'T12:00:00Z').toISOString().slice(0,10)!==birth||birth>new Date().toISOString().slice(0,10)||birth<'1900-01-01'))return reply({error:'Confira a data de nascimento.'},400);
   const saved=await admin.from('profiles').update({full_name:name,phone:phone||null,birth_date:birth,sex}).eq('id',id).eq('role','student').eq('active',true).select('id,full_name,phone,birth_date,sex').single();
   if(saved.error||saved.data?.id!==id)return reply({error:'Não foi possível confirmar a alteração.'},409);
   return reply({profile:saved.data});
  }catch{return reply({error:'Não foi possível atualizar o perfil.'},500);}
 };
}
