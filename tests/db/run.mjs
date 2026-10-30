// Disposable PostgreSQL (WASM), including actual RLS, triggers and transaction rollback.
import {PGlite} from '@electric-sql/pglite';import fs from 'node:fs';
const root=new URL('../../',import.meta.url),db=new PGlite();
const migrations=fs.readdirSync(new URL('supabase/migrations/',root)).filter(f=>f>='20261030100022_').sort().map(f=>'supabase/migrations/'+f);
const suites=fs.readdirSync(new URL('tests/',root)).filter(f=>f.endsWith('-rls.sql')).sort().map(f=>'tests/'+f);
try{
 for(const file of ['tests/db/bootstrap.sql','tests/db/pre-review-schema.sql',...migrations,...suites]){
  try{await db.exec(fs.readFileSync(new URL(file,root),'utf8'));console.log('PASS '+file);}catch(error){throw Error(file+': '+error.message,{cause:error});}
 }
}finally{await db.close();}
