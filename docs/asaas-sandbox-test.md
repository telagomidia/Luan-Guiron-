# Homologação Asaas — 19/10/2026

## Atualização após autorização do proprietário

A autorização explícita para alterar permissões e o webhook principal foi recebida em 19/10/2026. As limitações descritas na seção histórica abaixo foram superadas por essa autorização. Foram aplicados os campos de validade, a função transacional de pagamentos, RLS restritiva nas 16 tabelas do acompanhamento e no Storage protegido, e a tolerância fixa de cinco dias. A autenticação e o financeiro continuam acessíveis. O portal consulta o estado ao entrar, voltar à aba e a cada 45 segundos.

O webhook principal foi atualizado, autenticado e configurado para confirmação, recebimento, atraso, recusa, exclusão, estorno e contestação. Eventos de clientes externos à integração são reconhecidos sem conceder acesso. Pagamentos são consultados na API antes de registrar crédito; eventos repetidos e liquidação posterior não somam dias novamente.

A renovação usa cobranças avulsas de 31 dias, não assinatura MONTHLY. O preço contratado é preservado; alterações do professor valem para novas contratações. A renovação automática exige consentimento, guarda somente token vinculado ao mesmo cliente em tabela exclusiva do servidor, e pode ser desativada pelo aluno. O worker é acionado a cada cinco minutos, com capacidades temporárias cujo hash fica no banco. Há reserva única por cobrança/dia (D0–D5), consulta canônica antes da tentativa e parada em Pix, pagamento, isenção ou desativação. Respostas inconclusivas ficam em análise até confirmação ou recusa definitiva, sem repetição cega.

Validações: 283 testes Node; DOM do financeiro, do portal restrito/restaurado e dos fluxos existentes; CI Chromium em celular e desktop; SQL transacional comprova renovação antecipada de 62 dias, deduplicação, restrição após tolerância e preservação de perfil/financeiro. Nenhum teste SQL permaneceu nos alunos existentes.

Cobranças reais continuam desativadas (`enabled=false`, ambiente Sandbox). Maísa e Lucas permanecem isentos; Catherine deverá ser vinculada manualmente ao cadastro correto. Avaliações continuam sem modalidades.

## Resultado integrado da execução autorizada

- Perfil sintético exclusivo, sem aluno real: `f5d3d92a-deb4-479e-9549-984b3a9a7d7e`.
- Pix de R$60: `pay_g1mtye8govyaaa48`; renovação antecipada: `pay_hv515xobd6vms62s`.
- Cartão fictício aprovado: `pay_hogjr3612d9pv1jb`, status CONFIRMED; token retornado e guardado apenas no servidor.
- Renovação pelo worker com esse token: `pay_e379j7e1dh8hr4y0`, uma tentativa D0, status paid/confirmed.
- Eventos automáticos recebidos pelo receptor principal: PAYMENT_CREATED (`evt_05b708f961d739ea7eba7e4db318f621&22675150`) e PAYMENT_CONFIRMED (`evt_15e444ff9b9ab9ec29294aa1abe68025&22675171`).
- Para provar a entrega imediata, foi usada uma configuração temporária apontando ao mesmo receptor principal com identificador de teste na query string. A configuração original foi atualizada e permaneceu ativa; a temporária foi desativada após o teste. As três primeiras confirmações foram verificadas também por requisições autenticadas de teste ao receptor, sempre consultando o estado real na API do Sandbox.
- O teste é encerrado desativando o modo Sandbox, renovação e perfil sintético e expirando a capacidade. Não reutilizar a capacidade nem expor o token.
- A recusa e os cinco dias seguintes foram testados com relógio simulado; o teste de integração aprovou o cartão fictício e a renovação D0. Os cinco dias reais não foram aguardados.

## Histórico do primeiro teste isolado


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

## Limites históricos antes da autorização

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

## Preparação do Pix em produção — 19/10/2026 13:43 UTC

A consulta autenticada ao Asaas de produção funcionou. Webhook encontrado, ativo e sem fila interrompida; a API não devolve o token para comparação. Não havia chave Pix ACTIVE. Faltavam três eventos de cartão/contestação (não impedem o fluxo Pix simples). O banco foi alinhado para production, mantendo enabled=false e sandbox_enabled=false. BILLING_RELEASE_APPROVED continua false. Nenhuma cobrança real foi emitida.

Cartão em produção agora depende também de BILLING_CARD_APPROVED=true, separado da liberação geral. Enquanto não habilitado pelo Asaas, o frontend mostra somente Pix e o servidor rejeita cartão e não executa renovações de cartão. Falha ao consultar as modalidades mantém somente Pix.

O diagnóstico billing-readiness aceita uma capacidade temporária exclusiva do servidor, de uso único, com finalidade explícita. Só consulta a API, não cria clientes, cobranças nem chaves; não retorna credenciais, chave Pix ou dados pessoais.

Antes da primeira contratação: cadastrar/ativar uma chave Pix no Asaas, identificar o aluno pagador e validar o recebimento real do webhook. Só depois liberar as cobranças para os demais.
