# Cadastro autônomo: confirmar acesso antes da anamnese

## Diagnóstico de 21/10/2026

Foram encontradas duas contas de alunos ativas, com e-mail confirmado, sem anamnese e sem ocultação temporária. Ambas estavam fora da aplicação da cobrança. Não havia resposta de anamnese no banco para recuperar ou vincular. As consultas não trouxeram os conteúdos clínicos dos alunos.

No fluxo anterior, as sete etapas eram preenchidas antes da criação da conta. Com confirmação de e-mail, signup não retorna sessão autenticada e a anamnese não é enviada. O aluno precisava confirmar o e-mail, voltar à mesma aba e submeter novamente. Fechar a aba perdia as respostas ainda não enviadas. A correção anterior dava feedback de pendência, mas mantinha essa sequência frágil.

## Resolução

1. Manter identificação e acesso na primeira etapa. Autenticar/verificar o perfil antes de liberar os demais grupos de perguntas.
2. Quando houver confirmação pendente, permanecer na primeira etapa com instrução clara. Uma conta existente entra por login, sem novo cadastro.
3. Separar validação de acesso e validação clínica. Após autenticar, apagar senhas do formulário e manter sessão isolada em memória, com renovação durante o preenchimento.
4. No envio final, verificar novamente identidade, e-mail, perfil e autorização; validar revisão e respostas, manter UUID estável e confirmar `id,student_id` retornados pela gravação.
5. Se houver erro, preservar o formulário e não exibir sucesso. Se a sessão expirar, voltar à primeira etapa para entrar novamente sem apagar respostas. Impedir sobrescrita de uma anamnese já enviada por outro fluxo.
6. Exibir na aba Anamneses do professor os cadastros que aguardam envio, sem fabricar respostas vazias para eliminar pendências.

## Segurança e recuperação

Não se desativa a confirmação de e-mail, não se altera cobrança/RLS nem se usa senha administrativa no navegador. As respostas não são colocadas em metadados de autenticação, logs, localStorage ou sessionStorage. A sessão isolada do cadastro não substitui a do professor.

Se o formulário antigo ainda estiver aberto, o aluno pode confirmar o e-mail, usar sua conta existente e reenviar. Se já fechou, precisa entrar no site, abrir Anamnese, preencher/revisar e salvar. As respostas que não foram enviadas ao banco não podem ser recuperadas por esta correção.

## Verificação

- Testes de modelo: acesso sem respostas clínicas, confirmação pendente, identidade/perfil indevidos, validação, reautenticação, erro/retry com mesmo ID e confirmação de gravação.
- Página real em DOM e no CI em Chromium: confirmação antes das próximas etapas, isolamento da sessão, limpeza de senha, PAR-Q explícito, revisão, erro de gravação, clique duplicado e vínculo ao aluno correto; larguras 320, 390, 768 e 1440.
- Painel: dados enviados visíveis no relatório/PDF e cadastros sem anamnese visíveis como pendentes.
- Verificação do banco por consultas somente leitura; nenhuma resposta clínica real alterada ou presumida.
