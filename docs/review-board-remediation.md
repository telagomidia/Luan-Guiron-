# Correções da banca — issue #71

Base revisada: `72e10fe87978cba145933573c148c7f13ba6eb89`. Trabalho feito sequencialmente; sem migração ou publicação em produção nesta etapa.

| Ordem | Correção | Evidência |
|---|---|---|
| 1 | Avaliação em uma RPC transacional invoker; valida anexos antes de escrever; uploads em caminhos imutáveis | assessment-save.test.cjs e assessment-atomic-rls.sql |
| 2 | Falha de consulta de acesso conserva formulário; revogação confirmada também respeita rascunho e operação em andamento | portal-access-draft-ui.check.mjs |
| 3 | Exclusão limita espera a 20s; resultado incerto permite fechar sem repetir operação automaticamente | student-removal-ui.check.mjs |
| 4 | Falha em qualquer consulta do perfil mostra indisponibilidade com nova tentativa | student-hub-ui.check.mjs |
| 5 | Limites numéricos/JSON no banco; snapshot de treino derivado da prescrição e preservado em atualizações | student-integrity-rls.sql |
| 6 | Protocolo armazenado renderizado com escape | student-hub-ui.check.mjs |
| 7 | Workflow reutilizável de validação é dependência do deploy; contrato de schema impede frontend antes das migrations | quality.yml, pages.yml, check-release-schema.cjs |
| 8 | Todos os tests/*-rls.sql rodam em PostgreSQL descartável; CI adicional com Supabase Auth/Mailpit/PostgREST reais locais | tests/db/run.mjs, supabase-integration.sh, auth-roundtrip.mjs |
| 9 | Regex sem escapes ambíguos no histórico e upgrade; descanso 90 gravado em teste SQL real | workout-journal-rls.sql |
| 10 | Uma implementação de lista/exclusão; inicialização aguarda módulos obrigatórios e falha explicitamente | admin-loader-ui.check.mjs |
| 11 | Supabase JS 2.57.4 servido do próprio repositório com checksum e licença | vendor.test.cjs |
| 12 | weak_password orienta corrigir senha, sem falsa confirmação de cadastro | onboarding-ui.check.mjs |

## Contrato de publicação

Esta branch precisa das três migrations `20261030100022`, `20261030100432` e `20261030100839`, nesta ordem, antes de publicar o frontend. O workflow de Pages consulta apenas a RPC pública de leitura `review_release_ready()`; se estiver ausente ou retornar falso, não publica. Nenhuma credencial privilegiada é usada pelo frontend ou por esse check.

Os novos checks de integridade são NOT VALID para preservar registros históricos, mas são exigidos para novas escritas. Nenhuma rotina apaga ou corrige dados clínicos antigos automaticamente.

Uploads anteriores não são sobrescritos. Se uma resposta da RPC se perder, arquivos novos são conservados porque a transação pode ter sido confirmada; uma limpeza de órfãos deve verificar referências antes de remover qualquer objeto. O mesmo UUID de avaliação é reaproveitado durante tentativas na tela.

## Ambientes de teste

`npm ci --prefix tests/db && node tests/db/run.mjs` executa PostgreSQL via PGlite com um snapshot exclusivamente de schema (sem dados e sem segredos) capturado antes das correções. `bootstrap.sql` representa os contratos mínimos de Auth/Storage para esses testes; não é um servidor de autenticação.

No CI, `supabase-integration.sh` cria outro projeto local descartável com Auth/Storage/PostgREST/Mailpit reais. Os mesmos scripts SQL também rodam nele. `auth-roundtrip.mjs` recusa URLs que não sejam loopback e verifica cadastro, e-mail local, confirmação, login, trigger de perfil, anamnese, leitura pelo professor e isolamento de outro aluno. Não envia mensagens para endereços reais.

A nova banca deve considerar os resultados completos do CI, inclusive esse teste e Chromium, antes de declarar aprovação.
