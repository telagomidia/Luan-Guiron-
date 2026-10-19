alter table public.billing_sandbox_runs add column webhook_id text;
-- Reserved for compatibility; original webhooks are never paused by the runner.
alter table public.billing_sandbox_runs add column paused_webhooks jsonb not null default '[]'::jsonb;
