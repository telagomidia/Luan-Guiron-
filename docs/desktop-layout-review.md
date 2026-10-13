# Correção desktop — #41

Causa: ausência da abertura de @media(max-width:800px) no sistema visual LG.
As regras para celular se aplicavam ao desktop: hero empilhado, logo reduzida,
seções em uma coluna e espaçamento interno apertado.

Correção: restaurar o limite responsivo e atualizar a versão do CSS nas páginas
inicial, professor e aluno. Sem redesenhar componentes, mudar identidade ou dados.
As regras existentes de celular foram preservadas.

QA: o teste novo falhou antes da correção (hero com uma coluna em 1024 px).
Depois passou em 320/390/430/768/1024/1366/1440/1920 px: 136 verificações
responsivas, além de checagens de colunas e espaçamento desktop.
Inspeção visual desktop com assets reais e comparação de estilos computados
mobile (hero, manifesto e texto) antes/depois sem mudanças nas medidas.
Fluxo de diário de treino mantido. CI obrigatória antes do merge.

Revisão: mesma marca, cores, hierarquia e componentes LG. Nenhuma estética externa.
Sem bibliotecas ou requisições adicionais; foco e semântica mantidos.
