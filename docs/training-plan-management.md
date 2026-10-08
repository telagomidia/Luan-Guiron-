# Gerenciamento de planos de treino

## Problemas corrigidos
- Alterações de estado sem confirmar a linha atualizada.
- Cliques repetidos em ações de um mesmo plano.
- Estado ativo/inativo pouco visível e lista sem filtros.
- Exclusão oferecida antes de conferir sessões.
- Criação manual em duas operações, com risco de plano incompleto.

## Implementação
- plan-management.js centraliza validação, consultas e RPCs.
- Ativação/desativação usa comparação com o estado lido e exige retorno da linha.
- A interface mostra estado e quantidade de sessões; planos com sessões não oferecem exclusão.
- A exclusão exige confirmação e texto EXCLUIR, reconsulta histórico e utiliza delete_training_plan.
- Criação manual usa import_training_plan em transação única para plano e 1–5 treinos vazios.
- Nenhuma regra de RLS ou função do banco foi alterada.
- Múltiplos planos ativos continuam permitidos; nenhum outro plano é desativado automaticamente.

## Verificação em 2026-10-08
- 32 testes de gerenciamento e 28 testes de login passaram.
- Testes no banco executados em BEGIN/ROLLBACK: criação de 3 treinos, desativação/reativação, exclusão de plano temporário vazio, bloqueio por sessões na RPC, bloqueio por FK, rollback de criação inválida e negação de exclusão ao aluno.
- Após rollback: nenhum registro QA restante; plano existente preservado.
- Testes autenticados no navegador com a conta do proprietário ficam para validação manual.

## Como testar na página
1. Atualizar o painel e abrir Treinos.
2. Buscar por aluno ou plano e alternar Todos / Ativos / Inativos.
3. Desativar um plano e conferir o estado; reativá-lo e conferir novamente.
4. Criar um plano de TESTE com 3 treinos e conferir A/B/C.
5. Excluir somente esse plano de TESTE sem sessões, digitando EXCLUIR.
6. Em plano com sessões, conferir indicação de bloqueio e manter o histórico.

## Testes
Executar: node --test tests/*.test.cjs
