# Cadastro e conclusão na área do aluno

Este fluxo substitui a continuação do questionário na aba de cadastro.

1. O aluno preenche identificação, e-mail e senha em uma única tela e clica em Cadastrar.
2. Após confirmação da requisição de criação da conta, a tela apresenta o aviso para confirmar o e-mail e retorna à página inicial em cinco segundos. Uma falha não inicia esse retorno.
3. O link de confirmação enviado por Supabase continua apontando para a página inicial. O cadastro usa sessão isolada e não preenche nem grava uma anamnese.
4. Ao abrir o início do portal, se ainda não houver uma anamnese, aparece Finalize seu cadastro. Terminar cadastro abre o formulário existente de Anamnese. O aviso não reaparece durante a mesma visita, nem para quem já possui anamnese.
5. A anamnese mantém seu envio autenticado, revisão explícita, confirmação da gravação e apresentação ao professor.

Erros ao consultar a anamnese não são interpretados como ausência de envio. O controle de acesso financeiro existente continua aplicado. Senhas são apagadas do formulário após a confirmação; não se armazena questionário no navegador.

Verificação: testes unitários de validação, retorno de signup, erros e clique duplicado; página real em DOM para aviso e temporizador de cinco segundos; portal com anamnese ausente, enviada e erro de leitura. O CI verifica cadastro e pop-up em Chromium, nas larguras de celular e desktop.
