---
title: "Flecha Dev Log #9: De Views de Strings a Strings com Posse"
date: 2024-12-27
published: true
lang: pt-BR
translation_key: "flecha-from-string-views-to-owned-strings"
original_url: /flecha-from-string-views-to-owned-strings
permalink: /pt-br/flecha-from-string-views-to-owned-strings
---
# [](#intro)Introdução

Olá, pessoal!

Flecha tinha um `stringv` imutável: um ponteiro e um comprimento de byte que poderia se referir a texto estático ou de propriedade externa sem alocação.

As views são maravilhosas até precisarmos criar um novo texto.

`stringv` fornece operações úteis verificadas, enquanto `string` é um valor imutável que possui sua alocação.

Juntos, obrigaram-nos a separar claramente texto, armazenamento e propriedade.

# [](#safe-operations-on-a-view) Operações seguras numa view

As operações de primeira view eram intencionalmente pequenas:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">i32 main() {
    text := "flecha";

    stdoutln(text.len());
    stdoutln(text.at(0));
    stdoutln(text[5]);
    stdoutln(text.substr(1, 3));

    return 0;
}</code></pre></div></div>
`len()` retorna o comprimento do bytes. `at(index)` e a indexação retornam um `char` do tamanho de byte verificado. `substr(start, count)` cria outra visão livre de alocação.

Os limites não foram desativados simplesmente porque Flecha é uma linguagem de sistemas. Índices dinâmicos e intervalos inválidos chamam o tempo de execução, imprimem um diagnóstico e terminam em vez de realizar um acesso fora de limite.

A verificação de substring usa o equivalente a `count <= length - start` após verificar `start <= length`. Isso evita transbordar `start + count` durante a verificação em si. Mesmo caminhos de erro precisam de regras aritméticas.

# [](#an-owner-has-a-different-contract)Um proprietário tem um contrato diferente

Um `string` possui um ponteiro de dados, comprimento de byte e capacidade. A atribuição é anulada para a interoperabilidade, mas o comprimento explícito permanece autorizado. Os bytes nulos incorporados são válidos.

Um literal ainda é um `stringv`. A atribuição de um ao `string` cria uma cópia própria:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">string greeting = "hello";
string copied = greeting;
string message = greeting + ", Flecha";
</code></pre></div></div>
O conteúdo das strings é imutável. Concatenação cria um novo proprietário em vez de modificar um operando no lugar.

Isso deu valores de comportamento previsível ao deixar espaço para otimizações de implementação mais tarde.

# [](#conversions-show-the-cost)Conversões mostram o custo

Convertendo uma visualização em um proprietário aloca e copia. Convertendo um proprietário em uma visão não faz nenhum dos dois:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">stringv view = "flecha";

string owned = view.string();
string same = view.cast&lt;string&gt;;

stringv borrowed = owned.view();
stringv sameView = owned.cast&lt;stringv&gt;;</code></pre></div></div>
Os métodos nomeados são preferidos na fonte comum porque `string()` torna a criação de propriedade visível e `view()` comunica acesso não proprietário. Código de conversão genérico pode usar as formas simétricas.

Estávamos começando a construir um vocabulário onde o custo e a propriedade são visíveis no programa, não enterrados em uma convenção em tempo de execução.

# [](#the-first-value-semantics) A semântica do primeiro valor

A implementação inicial escolheu semântica de cópia previsível:

- inicializar ou atribuir a partir de uma string própria cria um valor independente;
- a substituição de um destino só destrói a sua atribuição anterior após o sucesso da substituição;
- um parâmetro próprio recebe um valor próprio;
- devolver o resultado a um proprietário;
- uma view nunca destrói o armazenamento.

Cada local de propriedade é destruído exatamente uma vez em queda normal e em saídas de fluxo de controle através de `return`, `break`, `proceed` e `jumpto`.

Essa última linha tornou a geração de código muito mais interessante. A limpeza já não era algo que pudéssemos acrescentar ao fim de uma função. Cada borda deixando a vida lexical de um valor teve que realizar a destruição apropriada.

A semântica de movimento poderia posteriormente remover cópias desnecessárias, mas somente se o comportamento observável permanecesse coerente. Escolhemos um modelo claro em primeiro lugar e otimização em segundo lugar.

# [](#lifetime-rules-arrive-early) As regras da vida chegam cedo

Uma visão em uma string proprietária não pode sobreviver a esse proprietário. O compilador rejeitou conservadoramente a visão de uma string local que escapava de seu escopo.

Os literais estáticos foram diferentes: seus bytes vivem para a duração do programa. Visões que chegam através de parâmetros também têm armazenamento controlado pelo contexto do chamador.

Ainda não tínhamos um sistema geral de empréstimo, então a decisão segura era rejeitar casos que o compilador não podia provar. Essa é uma regra recorrente da Flecha: a análise incompleta deve estreitar programas aceitos, não silenciosamente ampliar o comportamento inseguro.

# [](#an-api-style-emerges)Um estilo API emerge

Este trabalho também documentou uma convenção de nomes para APIs integradas e de bibliotecas:

- funções de membro usam `camelCase`, como `startsWith()`;
- funções livres usam `snake_case`, tais como `read_line()`;
- nomes de palavras únicas como `len`, `at` e `stdoutln` permanecem simples.

Os símbolos C Runtime mantêm seu prefixo `flecha_runtime_v1_` específico para ABI. Nomeação de implementação e nomeação idiomática Flecha são preocupações separadas.

# [](#conclusion)Conclusão

Os dois tipos de string têm trabalhos complementares. `stringv` fornece observação barata e verificada. `string` fornece propriedade, concatenação, cópia, retorno e limpeza determinística.

A distinção mantém o custo de armazenamento visível: as visualizações observam bytes, enquanto os proprietários são responsáveis por mantê-los e liberá-los.

<a href="/">Voltar</a>
