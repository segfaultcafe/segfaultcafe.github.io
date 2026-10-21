---
title: "Flecha Dev Log #6: Tornando Explícitas as Conversões Numéricas"
date: 2024-09-06
published: true
lang: pt-BR
translation_key: "flecha-explicit-numeric-conversions"
original_url: /flecha-explicit-numeric-conversions
permalink: /pt-br/flecha-explicit-numeric-conversions
---
# [](#intro)Introdução

Olá, pessoal!

Flecha tinha inteiros de várias larguras, variantes assinadas e não assinadas, e dois tipos de ponto flutuante. O analisador semântico rejeitou deliberadamente a aritmética entre diferentes tipos numéricos.

Isso deu-nos uma regra segura, mas ainda não uma linguagem prática.

Programas reais eventualmente precisam transformar um `i32` em um `i64`, estreitar um valor para `u8`, ou cruzar o limite entre inteiros e ponto flutuante. Se essas conversões não fossem acontecer silenciosamente, precisávamos de uma operação explícita com semântica precisa.

Os moldes numéricos, portanto, precisam de um significado preciso através de todo o compilador.

# [](#two-spellings-one-operation) Duas ortografias, uma operação

Flecha ganhou duas grafias de elenco:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">i32 first = 32 as i32;
i32 second = 10.cast&lt;i32&gt;;

i64 wide = first.cast&lt;i64&gt;;
u8 narrow = wide.cast&lt;u8&gt;;
f64 decimal = narrow.cast&lt;f64&gt;;</code></pre></div></div>
`value as Type` é conciso quando a conversão faz parte de uma expressão maior. `value.cast<Type>` é encadeável e se encaixa no vocabulário de conversão do estilo de membro que esperamos crescer mais tarde.

Ambas as formas produzem o mesmo nó AST e a mesma semântica. Não queríamos dois sistemas de conversão escondidos atrás de duas partes de sintaxe.

# [](#a-cast-crosses-every-stage)Um cast atravessa todas as etapas

Os moldes numéricos são um exemplo perfeito de por que um recurso de linguagem nunca é “apenas sintaxe”.

O tokenizer precisava da palavra-chave `as`. O analisador precisava lançar precedência e análise postfix. O AST precisava de um `CastExpression` contendo a expressão de entrada e o tipo de alvo. A análise semântica teve de resolver o alvo e rejeitar os pares de código-alvo não suportados. A descida teve de preservar ambos os tipos na RI ligada. Finalmente, a geração de código LLVM teve que selecionar a instrução correta.

Os testes seguiram o mesmo caminho:

- testes de análise verificados tanto ortografia e encadeamento;
- testes semânticos verificados conversões legais e ilegais;
- os testes de redução verificavam o molde delimitado;
- testes de geração de código verificaram o comportamento da LLVM;
- o exemplo nativo verificou o valor final de saída.

Este tornou-se o nosso padrão normal para o trabalho de linguagem. Uma característica não foi concluída porque o analisador aceitou. Acabou quando o gasoduto completo concordou com o que significava.

# [](#signedness-is-behavior)Signedness is behavior

Considere converter um inteiro para um inteiro mais amplo. O LLVM precisa saber se deve assinar a extensão ou a extensão zero. Converter um inteiro para um flutuador também depende se a fonte está assinada. A conversão de um float para um inteiro depende do destino.

A infra- estrutura selecionou as operações usando os tipos semânticos de Flecha:

- inteiro para inteiro usou um molde de mudança de largura com a assinatura de origem;
- o inteiro assinado para flutuar usou uma conversão assinada;
- inteiro não assinado para flutuar usou uma conversão não assinada;
- o flutuador para inteiros assinados ou não assinados seguiu a assinatura do destino;
- alterações de largura flutuante utilizadas em moldes de ponto flutuante.

Um elenco explícito não é uma permissão mágica para esquecer tipos. É o ponto onde o programador pede uma transformação específica, e o compilador deve implementar essa transformação exatamente.

# [](#why-no-implicit-numeric-promotion)Por que nenhuma promoção numérica implícita?

Muitas linguagens promovem automaticamente inteiros menores ou combinam inteiros e valores de ponto flutuante. Isso é conveniente até que a conversão selecionada não é o um programador de sistemas esperado.

Flecha escolheu uma regra inicial mais simples:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">i32 count = 10;
i64 total = 32;

// result := count + total;       // incompatible operand types
result := count.cast&lt;i64&gt; + total;</code></pre></div></div>
A conversão aparece exatamente onde a informação pode ser ampliada, estreitada, arredondada ou reinterpretada numericamente. Isso torna a revisão de código mais fácil e mantém regras de sobrecarga ou promoção fora do primeiro tipo de sistema.

Podemos sempre adicionar as conveniências cuidadosamente especificadas mais tarde. Remover uma conversão invisível depois que os usuários dependem dela é muito mais difícil.

# [](#casts-compose)Casts compõem

Porque os moldes são expressões, eles trabalham em qualquer lugar outro valor funciona:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">i32 main() {
    first := 32 as i32;
    second := 10.cast&lt;i32&gt;;
    base := first + second;
    wide := base.cast&lt;i64&gt;;
    narrow := wide.cast&lt;u8&gt;;
    decimal := narrow.cast&lt;f64&gt;;
    result := (decimal as f32) as i32;
    return result;
}</code></pre></div></div>
Este programa viaja através de várias representações e ainda retorna `42`. É pequeno, mas prova que a análise, validação semântica, redução e geração de código nativo concordam em toda a cadeia.

# [](#conclusion)Conclusão

Os moldes numéricos deram a Flecha uma fuga da estrita igualdade de tipo sem enfraquecer a regra de que as conversões devem ser visíveis.

Eles também demonstram um padrão durável: oferecem sintaxe de fonte concisa, reduzi-lo para uma operação semântica, e manter detalhes de instrução específicos do alvo na infra-estrutura.

<a href="/">Voltar</a>
