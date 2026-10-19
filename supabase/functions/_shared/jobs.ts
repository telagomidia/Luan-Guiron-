import {checked} from './asaas.ts';
export async function hashToken(value:string){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function authorizeJob(db:any,body:any,kind:string){
 if(typeof body.token!=='string'||body.token.length<32||typeof body.job_id!=='string')return null;
 return await checked(db.from('billing_jobs').select('*').eq('id',body.job_id).eq('kind',kind).eq('token_hash',await hashToken(body.token)).gt('expires_at',new Date().toISOString()).maybeSingle());
}
