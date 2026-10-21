# Exclusão e ocultação de alunos

Na Central de alunos, Excluir abre duas opções com nome e e-mail do aluno.

- Temporariamente: escolher de 1 a 3650 dias inteiros. O prazo é calculado pelo servidor. O aluno sai da lista principal e dos seus indicadores, fica em Ocultos e pode ser restaurado a qualquer momento. Ao terminar o prazo ele volta à lista, inclusive se a página permanecer aberta. O cadastro, o histórico, o acesso e as cobranças não são alterados.
- Permanentemente: digitar exatamente `excluir permanentemente`. O servidor exige a mesma confirmação, autentica a sessão, confere professor ativo e alvo aluno, e impede excluir o próprio professor. A conta e os dados de acompanhamento vinculados são removidos pelo endpoint existente, sem restauração pelo site.

A exclusão definitiva não cancela assinaturas no provedor. Vínculos financeiros e arquivos podem impedir a operação; nesse caso o sistema mantém a mensagem de erro no diálogo e sugere a opção temporária. Não são removidas automaticamente restrições de integridade nem cobranças.

## Implantação

1. Aplicar a migração `student_list_archives`.
2. Publicar `delete-student` com a versão atual do handler compartilhado.
3. Publicar os arquivos estáticos; `admin.html` atualiza a versão de `config.js` para carregar `student-removal.js` após a Central de alunos existente.

## Verificação

- Testes de interface com dados sintéticos: filtros, restauração, retorno por prazo, escape de conteúdo, validação de dias/frase, erros, clique duplicado e resposta após navegação.
- Testes do endpoint: sessão inválida, aluno/inativo sem permissão, outro tipo de perfil, confirmação incorreta e falha de integridade.
- Inspeção do banco: RLS ativo, política apenas para professor ativo, acesso anônimo negado e função com SECURITY INVOKER e search_path vazio.
- Nenhum aluno real deve ser excluído para verificar a funcionalidade.
