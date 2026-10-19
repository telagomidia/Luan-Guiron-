# Mercado Pago — Checkout Pro em Sandbox

Preparado em 19/10/2026. Asaas preservado. Cobranças reais continuam desativadas (`billing_settings.enabled=false`, `BILLING_RELEASE_APPROVED=false`). Mercado Pago só aceita `MERCADOPAGO_ENVIRONMENT=sandbox`, vendedor brasileiro com tag `test_user`, contas locais marcadas `is_test` e pagamentos canônicos com `live_mode=false`. O prefixo APP_USR também é usado nas credenciais de teste atuais do Checkout Pro e, sozinho, não identifica produção.

## Resultado desta etapa

- Secrets reconhecidos; token autenticado como vendedor de teste brasileiro.
- Preferência de R$60 criada na API de teste: `3778551742-6ec6b42b-f626-4689-bad4-e5bc46f85212`.
- Pedido local: `f3569bc8-953b-4ecf-a7cd-48687059aa2c`.
- Link: https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=3778551742-6ec6b42b-f626-4689-bad4-e5bc46f85212 . Usar somente comprador e cartão de teste.
- Perfil local sintético identificado como TESTE MERCADO PAGO; nenhuma conta real foi convertida para teste. Modo MP de teste ativado apenas para contas is_test. O perfil e a capacidade devem ser encerrados após o teste integrado.
- 288 testes Node aprovados, incluindo assinatura HMAC e tolerância do timestamp, URL de checkout, aprovação/recusa/estorno, identidade do vendedor, ambiente, valor, moeda e preferência. DOM cobre acesso somente de conta de teste e acionamento da função correta.
- SQL transacional confirma 31 dias após aprovação, deduplicação, retirada do crédito após estorno, rejeição de outro provedor e RLS da área financeira; tudo revertido ao terminar a verificação.

## Pendente no painel

Em Suas integrações → Site Luan — Testes → Webhooks → Configurar notificações:

URL: `https://ziunjhebdkqdmvsrjxhm.supabase.co/functions/v1/mercadopago-webhook`.

Selecionar Pagamentos. Salvar e cadastrar a chave secreta gerada no Supabase como `MERCADOPAGO_WEBHOOK_SECRET`. Não é o Access Token e não deve ser enviada em conversas ou repositórios. O receptor devolve 503 enquanto não estiver configurada e 401 para assinatura inválida. A configuração no painel não foi realizada por este código.

Após configurar: validar a simulação de notificação e pagar o checkout com comprador e cartão fictícios, consultando o estado canônico. A documentação informa que pagamentos com credenciais de teste podem não enviar notificações; por isso o botão Atualizar pagamentos consulta o provedor e reconcilia a própria conta. Uma simulação de webhook com ID inexistente é reconhecida sem conceder acesso; não comprova pagamento.

## Segurança e comportamento

- Prefêrencias e pagamentos têm referência ao pedido interno, valor calculado no servidor e moeda BRL. A preferência recebida no merchant order deve coincidir com a armazenada.
- IDs de pagamento são separados por prefixo interno `mp:` no campo legado `asaas_id`. A RPC de MP só aceita pedidos MP em Sandbox e contas is_test.
- As tabelas existentes conservam RLS; novos campos de ativação não recebem grants de escrita para usuários. A autenticação, perfis e pagamentos continuam acessíveis após a tolerância; dados de acompanhamento continuam sujeitos à proteção existente.
- Retorno do checkout não concede acesso. Aprovação é consultada na API; pendência/recusa não concedem dias. Pagamentos aprovados adicionais para a mesma compra vão para revisão. Estorno parcial ou total retira o crédito até revisão.
- Checkout Pro desta etapa não cria assinatura nem consentimento de renovação; não salva cartão nem executa retentativas automáticas. As regras de recorrência e D1–D5 exigem outra integração e homologação antes de liberação.
- Nenhuma chave ou token é devolvido ao navegador ou gravado em logs pelo código.
- Auditoria Supabase: sem mudanças nos avisos preexistentes de pg_net em public e proteção contra senhas vazadas; tabelas exclusivas de serviço intencionalmente sem políticas públicas. Referências: https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public e https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .

## Referências oficiais

- https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/test-accounts
- https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/create-payment-preference
- https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/payment-notifications
