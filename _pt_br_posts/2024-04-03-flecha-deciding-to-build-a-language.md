---
title: "Flecha Dev Log #0: Decidindo Criar uma Linguagem de Programação"
date: 2024-04-03
published: true
lang: pt-BR
translation_key: "flecha-deciding-to-build-a-language"
original_url: /flecha-deciding-to-build-a-language
permalink: /pt-br/flecha-deciding-to-build-a-language
---
# [](#intro)Introdução

Olá, pessoal!

Por muito tempo, este blog foi onde eu documentou pesquisa de segurança, máquinas vulneráveis, técnicas de exploração, e as coisas que eu aprendi ao desmontar software.

Eventualmente, uma pergunta diferente começou a seguir-nos:

** O que aprenderíamos se, em vez de apenas desmontarmos sistemas, tentássemos construir um a partir da linguagem?**

Não é um transpiler que entrega silenciosamente o trabalho difícil a outra língua fonte. Não é um analisador que reconhece algumas expressões e pára lá. Queríamos construir uma linguagem de sistemas digitados estaticamente, segui-la até o código nativo, e entender cada limite que cruzamos.

Essa decisão tornou-se Flecha.

Este é o Dev Log # 0 porque ainda não havia nenhuma arquitetura do compilador para descrever. Havia apenas uma direção, uma lista crescente de perguntas, e uma segunda decisão que importava tanto: nós documentaríamos a viagem enquanto isso acontecia.

Vamos saltar para cima dele!

# [](#why-a-language) Porquê uma linguagem?

Construir uma linguagem de programação é uma quantidade irracional de trabalho se o único objetivo é inventar pontuação diferente.

A parte interessante é que uma linguagem nos força a conectar assuntos que muitas vezes são aprendidos separadamente:

- análise e gramática;
- sistemas de tipo e diagnósticos;
- análise do fluxo de controlo e do fluxo de dados;
- disposição e propriedade da memória;
- ABIs, arquivos de objetos e linkers;
- tempos de execução e bibliotecas padrão;
- ferramentas de compilação, pacotes e suporte ao editor.

Uma decisão de sintaxe chega eventualmente ao código da máquina. Uma regra de memória eventualmente se torna um diagnóstico, uma análise de fluxo de controle, uma operação em tempo de execução, ou todos os três. Uma característica que parece bonita em um exemplo pode se tornar impossível de explicar uma vez que cruza um limite de função.

Era exactamente o tipo de projecto que queríamos.

# [](#the-direction) A direção

A descrição inicial de Flecha foi intencionalmente curta:

> Uma linguagem de baixo nível, digitada estaticamente para software que precisa de execução previsível, controle explícito sobre a memória e acesso direto a alvos nativos.

Queríamos o controle associado às linguagens tipo C, reduzindo o comportamento acidental indefinido e melhorando os tipos, diagnósticos e ferramentas.

O objetivo não era esconder a programação de sistemas. Alocação, acesso inseguro, conversões, transferência de controle e limpeza devem permanecer visíveis o suficiente para que um leitor possa raciocinar sobre o custo e comportamento do código próximo.

Ao mesmo tempo, “explicável” não deve se tornar uma desculpa para a cerimônia. Uma função simples ainda deve parecer simples:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">i32 add(i32 left, i32 right) {
    return left + right;
}

i32 main() {
    answer := add(20, 22);
    return answer;
}</code></pre></div></div>
Este pequeno exemplo já contém várias decisões previstas. Interfaces de função são digitadas estaticamente. A inferência local está disponível quando o compilador já sabe a resposta. A execução é directa. Não há nenhum runtime coletado lixo esperando atrás da declaração de retorno.

# [](#principles-before-features)Princípios antes das funcionalidades

É fácil começar uma língua coletando recursos que gostamos de outras línguas. Em vez disso, tentámos começar com restrições.

Flecha deve fornecer:

- execução determinística sem coletor de lixo;
- a representação previsível dos dados e as convenções de convocação;
- limites não seguros explícitos;
- forte digitação estática sem uma superfície acadêmica;
- conversões visíveis entre tipos primitivos distintos;
- diagnóstico útil e orientado para a fonte;
- a geração de objetos nativos e executáveis;
- interoperabilidade C simples;
- um núcleo suficientemente pequeno que a linguagem possa eventualmente compilar-se.

Estes princípios não responderam a todas as perguntas de sintaxe. Eles deram-nos uma maneira de avaliar um.

Se uma operação alocar, o programador pode ver onde começa a propriedade? Se uma conversão perde informação, essa decisão é explícita? Se o código é inseguro, um revisor pode encontrar o limite? Se o compilador rejeita um programa, ele pode explicar por que no local de origem correto?

Essas perguntas se tornaram mais duradouras do que qualquer primeiro rascunho da gramática.

# [](#non-goals-matter-too)Non-goals importam também

Um novo projeto pode prometer tudo porque nada colidiu ainda. Queríamos dizer o que Flecha não tentaria no seu primeiro núcleo:

- sem classes ou herança de implementação;
- nenhum sistema de excepção;
- nenhum tempo de execução implícito de recolha de lixo;
- nenhuma alocação oculta do heap como resposta padrão;
- ausência de geradores, coroutinas ou funções assíncronas na primeira implementação;
- nenhuma alegação de um ITB estável enquanto a língua ainda estava a ser descoberta.

Mesmo a análise sofisticada da vida não era algo que pudéssemos declarar terminado antes de escrever os programas que precisava entender.

Estes não eram julgamentos permanentes sobre o que faz uma boa linguagem. Foram decisões de alcance. Um compilador pequeno com limites honestos é mais útil do que uma especificação que promete dez anos de trabalho em sua primeira página.

# [](#choosing-the-tools)Choosing as ferramentas

O primeiro compilador seria escrito em C++ moderno.

Essa escolha nos manteve próximos do sistema operacional, expôs as decisões de memória e propriedade dentro do próprio compilador, e nos deu acesso ao ecossistema LLVM sem adicionar outro tempo de execução gerenciado à cadeia de ferramentas.

A LLVM lidaria com a seleção de instruções específicas do alvo, a emissão de objetos e a infraestrutura de otimização que não queríamos reinventar. Flecha ainda teria sua semântica. LLVM deve receber um programa após nomes, tipos, conversões e fluxo de controle de linguagem já terem sido decididos.

Também escolhemos `.fl` para arquivos fonte e `flecha` para o comando compilador. O projeto finalmente tinha um nome, um arquivo e um destino:

```text
main.fl → flecha → native program
```
Tudo entre essas flechas ainda precisava ser construído.

# [](#why-document-now) Porquê documentar agora?

Esperar até que o idioma fosse “feito” teria produzido documentação mais limpa e um relato pior de como foi feito.

O desenvolvimento do compilador está cheio de decisões que parecem óbvias após a arquitetura circundante existir. Queríamos preservar as perguntas:

- Porquê adicionar um modelo semântico separado?
- Porquê baixar outra IR antes da LLVM?
- Porquê representar uma string como uma view antes de adicionar um proprietário?
- Porquê continuar a formatar em tempo de execução?
- Porque é que não é iniciado diferente de zero?
- Que regras de memória são implementadas e quais ainda são propostas?

Assim, a documentação tornou-se parte do ciclo de desenvolvimento.

A especificação descreveria a direção atual. Documentos de design diriam se uma ideia foi implementada, proposta ou não resolvida. Os testes preservariam o comportamento. Dev logs iria contar a história de que um manual de referência não pode: que problema apareceu, quais alternativas importaram, e por que uma decisão desbloqueou a próxima.

Isto também significava permitir-nos mudar de ideias publicamente. A sintaxe precoce pode desaparecer. Uma simples regra de propriedade poderia falhar quando os laços chegassem. Um recurso conveniente poderia acabar para esconder um custo que queríamos visível.

Esta não é a documentação que está a ficar velha. Esta é a jornada que está sendo documentada honestamente.

# [](#the-first-roadmap) O primeiro roteiro

O caminho inicial foi deliberadamente vertical:

```text
characters
  → tokens
  → syntax tree
  → semantic meaning
  → typed lowering
  → LLVM IR
  → native object
  → executable
```
Não queríamos projetar uma enorme superfície linguística antes de provar que um pequeno programa poderia atravessar todo o oleoduto.

Após esse caminho trabalhado, recursos poderiam chegar com uma definição exigente de “feito”: sintaxe, semântica, rebaixamento, geração de código, diagnósticos, testes e documentação seriam todos necessários para concordar.

O primeiro problema concreto era óbvio. Antes que Flecha pudesse entender ou compilar um programa, o código fonte precisava de uma forma dentro do compilador.

# [](#conclusion)Conclusão

Flecha começou com curiosidade mais do que certeza.

Sabíamos que queríamos código nativo, memória explícita, tipos fortes, custos visíveis e diagnósticos úteis. Sabíamos também que as decisões interessantes só apareceriam depois que esses objetivos atingissem programas reais.

Documentar o projeto do Dev Log #0 nos dá um registro desse movimento – desde a intenção, até a implementação, até os casos estranhos que forçam uma linguagem a se tornar precisa.

Há muito para construir, muito para quebrar, e definitivamente muito para pesquisar.

É aí que começa a jornada do compilador: tokens, um analisador e uma árvore de sintaxe abstrata.

Espero que gostem da viagem. Como sempre, não se esqueça de fazer sua pesquisa **

<a href="/">Voltar</a>
