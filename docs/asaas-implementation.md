# Pagamentos Asaas — implantação inicial

Implementação vinculada à issue #52. Direção visual: manter identidade LG, navegação existente, formulários simples, títulos legíveis e ação de pagamento explícita. Nenhuma modalidade de avaliação criada.

## Entregue

- Área do aluno “Plano e pagamentos”: mensalidade, isenção, cobranças, histórico, link de pagamento e catálogo vazio.
- Gestão “Cobranças”: preço para novas contratações, isenções individuais, cadastro futuro de avaliações como inativas e consulta de pagamentos.
- Banco com RLS e privilégios por coluna; alunos só consultam seus próprios registros.
- Mensalidade inicial de R$60; Maísa e Lucas identificados no banco e isentos. Catherine depende de cadastro e identificação explícita, sem associação automática por nome.
- Funções `billing` e `asaas-webhook`, autenticação interna, consulta canônica de pagamentos, deduplicação transacional e reserva de pedido antes de chamadas financeiras.
- Chaves do Asaas exclusivamente em secrets do servidor. CPF enviado ao Asaas, sem persistência no banco local.

## Estado operacional

**Cobranças desativadas. Não é uma integração financeira homologada.**

`billing_settings.enabled=false`, `starts_on=null`, `grace_days=null` e `BILLING_RELEASE_APPROVED` ausente impedem criar cobranças. O código já foi publicado no servidor, mas faltam os secrets do Asaas e os testes reais de Sandbox. Nenhum aluno é bloqueado por inadimplência nesta etapa. O campo `profiles.active` não foi alterado.

- Pix: criação de cobrança avulsa quando solicitado pelo aluno; ainda não há geração mensal agendada ou lembretes.
- Cartão: criação de checkout recorrente; vínculo de checkout, assinatura e pagamento precisa ser confirmado com payloads reais no Sandbox antes da liberação.
- Preço: altera somente novas contratações. Reajuste agendado para assinaturas existentes ainda não implementado.
- Cancelamento, estorno e conciliação operacional: administrados no Asaas nesta etapa; automação completa no painel ainda pendente.
- Restrição de treinos por inadimplência e cálculo final de validade: dependem da decisão de vencimento/tolerância e ainda não foram ativados/implementados nas políticas de treino.
- Pedidos com timeout permanecem reservados para evitar criação duplicada. Recuperação exige verificar no Asaas por externalReference antes de corrigir localmente. Não marcar como falho sem consultar o provedor.
- Catalogação de avaliações preparada; homologar associação dos pagamentos avulsos com cartão antes de ativar serviços.

## Configuração de Sandbox

No Supabase, Edge Functions > Secrets, cadastrar sem enviar credenciais em chat:

- `ASAAS_API_KEY`: chave da conta Sandbox.
- `ASAAS_ENVIRONMENT`: `sandbox`.
- `ASAAS_WEBHOOK_TOKEN`: token aleatório com pelo menos 32 caracteres, diferente da chave da API.

Endpoint: `https://ziunjhebdkqdmvsrjxhm.supabase.co/functions/v1/asaas-webhook`.

Configurar no Asaas os eventos `PAYMENT_*` necessários, `SUBSCRIPTION_CREATED`, `SUBSCRIPTION_UPDATED`, `SUBSCRIPTION_INACTIVATED`, `SUBSCRIPTION_DELETED` e eventos `CHECKOUT_*`. Envio sequencial recomendado. O webhook usa o cabeçalho `asaas-access-token`; a função `billing` valida a sessão com `auth.getUser`. A validação JWT do gateway fica desativada porque cada função autentica internamente (sessão/token específico).

Somente depois de completar os itens pendentes, definir regras de vencimento e tolerância, liberar um aluno de teste e configurar `BILLING_RELEASE_APPROVED=true`. Não habilitar o banco inteiro sem isolamento de dados/testes. Usar ambiente/projeto de homologação para testar com usuários sintéticos; não cobrar alunos existentes para validar.

## Homologação antes de produção

1. Confirmar URLs e comportamento de checkout Sandbox, associação cliente/pedido/assinatura e primeiro pagamento.
2. Validar pagamento Pix, aprovação/recusa de cartão, expiração, cancelamento, estorno e contestação.
3. Testar eventos fora de ordem, duplicados e falha após criação remota; deduplicar o pedido e renovar o período uma única vez.
4. Completar conciliação, vencimento mensal ancorado, cancelamento e validade de acesso.
5. Conferir condições e tarifas da conta, configurar credenciais de produção e webhook separado; limpar vínculos Sandbox antes de produção. Nunca reutilizar IDs de ambientes distintos.
6. Manter plano de retorno: desabilitar novas contratações, preservar histórico e acompanhar separadamente assinaturas ativas no Asaas. Desabilitar o site não cancela recorrências remotas.

## Validação registrada

- 275 testes Node aprovados (incluindo quatro testes financeiros).
- Integração DOM de cobrança e portal aprovada.
- RLS testado com identidade de aluno: apenas conta própria visível; alteração de preço/isenção e RPC de pagamentos negadas.
- RPC validado em transação revertida: evento repetido grava um pagamento e sincroniza pedido atomicamente.
- Função publicada rejeita ausência de sessão e token de sessão inválido com HTTP 401.
- Webhook sem secret configurado responde HTTP 503 sem modificar registros.
- Auditoria Supabase: sem política em `billing_events` é intencional (somente service role). Aviso preexistente de proteção de senha vazada desativada: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .

## Referências

- https://docs.asaas.com/docs/checkout-asaas
- https://docs.asaas.com/docs/checkout-com-assinatura-recorrente
- https://docs.asaas.com/docs/receba-eventos-do-asaas-no-seu-endpoint-de-webhook
- https://docs.asaas.com/docs/faq-assinaturas
