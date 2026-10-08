import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { passwordLinkHandler } from "./handler.mjs";
const url = Deno.env.get("SUPABASE_URL")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
Deno.serve(passwordLinkHandler({
  caller: (authorization: string) => createClient(url, anon, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } }),
  admin: createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } }),
}));
