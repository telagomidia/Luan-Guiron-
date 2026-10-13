# Diário de treino LG — plano e revisão (#39)

## Escopo aprovado

Começar treino → escolher A/B/C → registrar cada série junto da prescrição →
finalizar → consultar pelo calendário. Escolha livre, mesmo com sugestão.
Professor consulta o mesmo registro em Alunos → aluno → Histórico.

## Estudo e decisões

- Reaproveitar workout_sessions, exercise_sets e o RPC atômico existente.
- Acrescentar exercise_notes e workout_snapshot à sessão, sem reescrever dados.
- RPC v2 invoker chama o RPC anterior e salva metadados na mesma transação.
  Erro nas observações desfaz também sessão/séries; UUID reaproveitado no retry.
- Snapshot obtido do banco, não do navegador: nome do treino/plano/exercícios
  permanece legível após renomear a prescrição. Registros antigos usam o nome
  relacionado atual, pois não possuíam snapshot.
- Sugestão: próximo treino na ordem do plano após a última sessão desse plano;
  primeiro treino se não houver histórico; último volta ao primeiro. Não é
  recomendação de frequência/descanso. O aluno pode escolher qualquer opção.
- Calendário: mês completo, páginas de 500 registros, limites inclusivo/exclusivo
  em UTC derivados do fuso local do navegador. Duas sessões no dia são listadas.
- Sem armazenamento persistente de dados pessoais no navegador. Formulário
  permanece durante erro; aviso ao sair com alterações. Salvar requer conexão.
- Carga é kg, opcional (incluindo zero); repetições obrigatórias nas séries
  marcadas. RIR opcional. Observações: 2000 caracteres por exercício.

## Plano executado

1. Conferir esquema e permissões reais; consultar documentação Supabase atual.
2. Criar alteração aditiva e validar com dados sintéticos/ROLLBACK.
3. Implementar seleção, registro integrado, calendário e leitura pelo professor.
4. Revisar visual LG, acessibilidade, segurança e funcionamento.
5. Executar testes locais e CI, revisar PR, publicar e verificar arquivos servidos.

## Verificações

- SQL transacional antes da migração: salvamento atômico, zero, retry, notas,
  isolamento entre alunos, exercício fora do treino, rollback de erro, bloqueio
  de plano inativo e acesso do professor. Nenhum dado de QA persistido.
- Migração aplicada pelo conector. Verificação posterior somente de leitura:
  colunas/defaults presentes, RPC invoker, anon sem execute, authenticated com
  execute. Uma repetição do teste de escrita foi rejeitada pela proteção automática
  e não foi repetida por outra via.
- Advisor não trouxe novos alertas: continuam os alertas preexistentes de
  allowlist administrativa com RLS sem política (fechada por padrão) e proteção
  contra senhas vazadas desativada. Configuração Auth não foi alterada.
  Referência: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Unitários: sequência, retorno ao primeiro, ano bissexto, virada de ano,
  paginação mensal, zero, notas, escape, snapshot e payload v2.
- Chromium: 320/390/768/1440 px, prescrição, escolha diferente da sugestão,
  20/40/60 kg, observações, erro/retry, mesmo UUID, clique duplo, dois treinos no dia,
  mudança de mês, erro do calendário, detalhes do aluno e leitor do professor.
- Suítes anteriores de portal, anamnese, navegação e responsividade mantidas.

## Revisão de qualidade e identidade

Roxo, marca, tipografia e cabeçalho LG preservados. Campos próximos ao exercício
reduzem a distância entre ler e registrar. Sem estética de outro projeto,
ornamentos ou bibliotecas novas. Rótulos explícitos, foco visível e calendário
operável por teclado. Tabelas contidas no celular. Portal continua noindex.
Backend sem nova concessão de acesso, sem service key no cliente; textos escapados.

## Recuperação

Se o front-end precisar ser revertido, reverter apenas o PR; o RPC anterior
continua funcionando. Não remover as colunas novas, pois guardam registros.
