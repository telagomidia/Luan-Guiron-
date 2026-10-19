# Homologação isolada Asaas — 18/10/2026

## Resultado comprovado

- Chave de API autenticada no Sandbox, sem ler/exibir o secret.
- Cobrança Pix fictícia de R$60: `pay_57x19hbb4tkbostc`.
- Cliente sintético: “TESTE SANDBOX LUAN — NAO E ALUNO”, sem e-mail/telefone e com notificações desativadas.
- Link: https://sandbox.asaas.com/i/57x19hbb4tkbostc . Não pagar com dinheiro real.
- Confirmação pelo endpoint oficial de simulação; retorno `RECEIVED`.
- Webhook exclusivo de teste recebeu `PAYMENT_CREATED` e `PAYMENT_RECEIVED`.
- Registro confirmado em `2026-10-19T01:05:07.781366Z`; validade de teste até `2026-11-19T01:05:07.781366Z`, exatamente 31 dias.
- Repetição do mesmo evento não ampliou a validade.
- 279 testes Node passaram; quatro novos cobrem ciclo fixo, renovação antecipada, tolerância de cinco dias e calendário de retentativas D1–D5.
- Alunos não podem ler os dados de execução/capacidades nem executar a RPC de teste. Testado no banco com role authenticated.

## Isolamento

As tabelas `billing_sandbox_runs` e `billing_sandbox_events` são exclusivas do service role, têm RLS e não possuem grants para anon/authenticated. O runner exige uma capacidade aleatória com expiração; seu hash é armazenado e o valor nunca é gravado no repositório. O receptor só aceita a chave de webhook e só consulta a API fixa de Sandbox. Valor, cliente fictício e referência de teste são controlados pelo servidor; nenhuma rota permite escolher um host de produção ou um aluno real.

O webhook original não foi substituído, removido ou desativado. Um webhook adicional foi criado para o receptor de teste. Depois da validação, o webhook adicional foi desativado e a capacidade de execução encerrada. Eventos desta cobrança também podem aparecer na fila do webhook original, que ainda não reconhece referências `sandbox-run:`; não interpretar falhas desse receptor antigo como falha do receptor isolado.

## Limites e trabalho bloqueado

A revisão automática rejeitou a migração ampla que alteraria políticas de acesso nas tabelas existentes, comportamento financeiro e armazenamento de tokens de cartão. Também rejeitou substituir o webhook ativo e a tentativa de pausar temporariamente sua configuração. Essas operações não foram executadas. O caminho final de homologação não modifica o webhook original.

A proposta ampla foi preservada na branch de trabalho `feat/billing-31day-sandbox`; não foi aplicada. Ela ainda exige revisão e testes adicionais antes de liberação. Nenhum novo campo dessa migração foi aplicado ao banco atual.

Consequências: os 31 dias foram comprovados no registro ISOLADO do teste, não implantados nas permissões de alunos; tolerância e dias de retentativa foram validados como regras de cálculo, mas ainda não há cron de cobrança de cartões nem bloqueio financeiro ativo no portal. `billing_settings.enabled=false` e os pagamentos de alunos permaneceram zerados. Avaliações continuam sem modalidades cadastradas.

Para a etapa de cartão será necessário homologar o token retornado pelo provedor, consentimento de renovação a cada 31 dias, reserva de tentativa única por dia, consulta canônica antes de repetir, parada após pagamento por qualquer meio, recusas permanentes e falhas inconclusivas. Não prometer recorrência mensal nativa como ciclo de 31 dias.

## Auditoria

RLS sem políticas nas tabelas exclusivas de serviço é intencional; não adicionar políticas de leitura para suprimir o aviso. O aviso preexistente de proteção contra senhas vazadas é independente desta alteração: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .

## Referências

- https://docs.asaas.com/reference/confirmar-pagamento
- https://docs.asaas.com/docs/cobrancas-via-cartao-de-credito
- https://docs.asaas.com/docs/webhook-para-cobrancas
