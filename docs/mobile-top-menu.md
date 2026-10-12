# Menu superior da área do aluno — issue #35

## Objetivo e direção

Aplicar o feedback de Lucas sem alterar a identidade LG: roxo, logo oficial,
tipografia e conteúdo existentes. A intervenção se limita à área do aluno.

## Plano executado

1. Substituir a navegação fixa inferior por um botão de três linhas no cabeçalho,
   em telas de até 850 px.
2. Centralizar o conjunto logo + LUAN GUIRON entre colunas laterais iguais;
   manter Sair à direita e preservar a navegação lateral no computador.
3. Abrir as oito opções em duas colunas abaixo do cabeçalho, no fluxo da página,
   sem cobrir o treino. Fechar ao navegar, ao clicar fora ou pressionar Escape.
4. Preservar confirmação de alterações não salvas; desabilitar o botão durante
   salvamentos. Indicar estado expandido, opção atual e foco de teclado.
5. Aplicar sombras discretas aos cartões, listas e botões, sem alterar impressões.
6. Testar, revisar por PR e publicar somente após aprovação da integração contínua.

## Revisão

- Identidade/segmento: conteúdo do treino mantém prioridade; sem elementos
  decorativos novos, gradientes, fontes ou bibliotecas adicionais.
- Consistência: reutiliza os componentes LG, sem importar estética de outro projeto.
- Acessibilidade: controles de pelo menos 44 px, foco visível, Escape devolve foco
  ao botão; opções fechadas saem da navegação por teclado via display:none.
- Segurança: nenhuma alteração em autenticação, permissões, dados ou armazenamento.
- Desempenho/SEO: SVG inline pequeno, sem requisições novas; portal mantém noindex.
- Relatórios: estilos de sombra restritos a screen; impressão preservada.

## Verificação

- Testes unitários existentes e integrações DOM.
- Novo teste Chromium em 320, 390, 430, 768, 850, 851 e 1440 px:
  centralização, ausência de overflow, abertura/fechamento, teclado, seleção,
  confirmação de formulário, redimensionamento, sombras e retorno ao topo.
- Teste de layout existente: seis páginas, cinco larguras e 85 verificações.
- Teste de anamnese adaptado ao novo menu; salvamento e PDF continuam cobertos.
- Todas as contas e informações utilizadas no QA são sintéticas.
