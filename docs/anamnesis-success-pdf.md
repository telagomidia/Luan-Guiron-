# Confirmação da anamnese e PDF LG

## Plano e implementação

1. Reutilizar a confirmação de gravação da API do portal, sem alterar schema ou permissões.
2. Mostrar diálogo acessível com visto verde e “Anamnese salva”; manter controles bloqueados por 3 segundos, fechar o diálogo e abrir Início. Cancelar o retorno se a página sair. Falhas mantêm as respostas e permitem tentar novamente.
3. Acrescentar Gerar PDF LG ao perfil do aluno e ao modal da anamnese no painel do professor. Usar o mesmo relatório compartilhado de 48 perguntas e PAR-Q, com logo, identidade LG, aluno, atualização, emissão e aviso de confidencialidade.
4. Abrir a visualização de impressão local. Escolher Salvar como PDF na impressão do navegador. O relatório não é enviado ao Storage nem publicado. Pop-up bloqueado recebe orientação. Conteúdo é escapado; vínculo entre registro e aluno é obrigatório.
5. Revisar estilo e acessibilidade existentes, testar sucesso/falha/repetição, retorno após 3 segundos, respostas antigas, campos vazios, textos longos, PDF A4 e celular antes do merge e deploy.

## Validação

Testes unitários e de integração DOM cobrem conteúdo completo, vínculo, escape de texto, controles, timer, cancelamento ao sair da página, falha sem popup e os dois botões do professor. Chromium verifica o tempo real e o layout em 320, 390, 768 e 1440px, abertura/impressão e renderização de PDFs padrão e com resposta longa usando apenas dados sintéticos. Os PDFs e suas páginas renderizadas são artefatos de QA para revisão visual, sem dados de alunos reais.

Nenhuma resposta de saúde é alterada por esta mudança. Não há migração SQL.
