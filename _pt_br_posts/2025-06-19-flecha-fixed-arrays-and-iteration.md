---
title: "Flecha Dev Log #14: Arrays Fixos, Limites e Iteração"
date: 2025-06-19
published: true
lang: pt-BR
translation_key: "flecha-fixed-arrays-and-iteration"
original_url: /flecha-fixed-arrays-and-iteration
permalink: /pt-br/flecha-fixed-arrays-and-iteration
---
# [](#intro)Introdução

Olá, pessoal!

Flecha também pode descrever dados contíguos cujo tamanho faz parte do tipo.

Arrays fixos combinam indexação verificada, empréstimo de array, iteração de intervalo, loops contados e incremento postfix. Várias regras linguísticas devem concordar: layout, inicialização, cópia, ordem de avaliação, limites, empréstimo e controle de loop.

# [](#length-is-part-of-the-type)Length faz parte do tipo

`[N]T` contém exatamente elementos em linha `N`:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">[4]u8 values = [10, 20, 30, 40];
[4]u8 zeros = none;
[4]u8 repeated = [7; 4];
inferred := [1, 2, 3];
[0]u8 empty = [];
[2][3]u8 grid = [[1, 2, 3], [4, 5, 6]];</code></pre></div></div>
`[4]u8` e `[5]u8` são tipos diferentes. Construir ou não aloca nenhum buffer de pilha separado.

Os inicializadores da lista devem fornecer exatamente o número esperado de elementos. Os valores em falta não estão silenciosamente cheios de zero. `none` é como um programador solicita explicitamente a inicialização recursiva zero.

Um inicializador de repetição avalia seu valor uma vez e copia o resultado, mesmo para uma contagem zero. Listar elementos avaliar uma vez cada um da esquerda para a direita.

# [](#copies-own-their-inline-storage)Copies possuem seu armazenamento em linha

Atribuição, parâmetros e retorna copiar valores de ordem fixa:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">[2]u8 changed([2]u8 value) {
    value[0] = 42;
    return value;
}

i32 main() {
    original := [1, 2];
    copy := original;
    copy[0] = 42;
    return original[0] as i32;
}</code></pre></div></div>
A alteração da cópia não altera a fonte. Arrays aninhados copiam recursivamente. Elementos de ponteiro bruto copiam endereços sem adquirir a propriedade de seus ponteiros.

Os tipos de elementos próprios e emprestados foram excluídos até que suas regras de destruição e vida útil pudessem ser representadas de forma sólida.

# [](#bounds-before-addresses)Bounds before address

`values.len()` retorna `usize`. Um índice também deve ser `usize`; literais inteiros adotam esse contexto, enquanto os inteiros já digitados precisam de um elenco explícito.

Índices constantes inválidos conhecidos são erros de tempo de compilação. Os índices dinâmicos recebem uma verificação de tempo de execução antes do cálculo do endereço ou acesso.

Isso é importante. O compilador não deve derivar um ponteiro invalid out-of-bounds e só então decidir não desreferenciá-lo.

Armadilhas de acesso dinâmicas inválidas. Blocos inseguros não desactivam a verificação. A indexação não controlada não foi introduzida acidentalmente através de uma permissão insegura mais ampla.

Para uma loja, Flecha captura o receptor, avalia o índice uma vez, termina a verificação de limites, e só então avalia o lado direito. Os efeitos secundários têm, portanto, uma ordem específica.

# [](#borrowing-is-conservative)Browrowing é conservador

Arrays se integram com referências verificadas:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">[3]u8 values = [1, 2, 3];
element := &amp;values[1];
*element = 42;</code></pre></div></div>
A primeira implementação trata todo o array root como uma região emprestada. Mesmo dois índices de elementos diferentes não são assumidos desarticulados.

Isso rejeita alguns programas seguros, mas evita dependendo do raciocínio do índice que o compilador ainda não executa. Elementos compartilhados emprestados podem coexistir; possibilidades mutáveis sobrepostas não podem.

A inicialização tardia também opera em todo o array. A atribuição de cada elemento individualmente ainda não prova o agregado inicializado.

# [](#two-kinds-of-loop) Dois tipos de laço

A iteração de alcance torna a travessia orientada para leitura concisa:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">for (index, value) := range values {
    stdoutln(index);
    stdoutln(value);
}

for (_, value) := range values {
    stdoutln(value);
}</code></pre></div></div>
A expressão array avalia uma vez e é copiada para um instantâneo privado. Cada ligação de valor é outra cópia. Mutar o array original não muda esse instantâneo.

Para alterar o original, use a indexação através de um loop contado:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">loop usize index = 0; index &lt; values.len(); index++ {
    if index == 1 {
        proceed;
    }
    values[index]++;
}</code></pre></div></div>
`proceed` executa a atualização antes de testar a condição novamente. `break` sai sem ele. A localização alvo do `++` avalia uma vez e a expressão produz seu valor anterior.

# [](#implementation-shape)Forma de implementação

O analisador normaliza loops contados em um inicializador scoped mais um nó tipo tempo com uma atualização separada. Os nós de alcance retêm metadados de origem suficientes para bons diagnósticos ao introduzir instantâneos de compilador e ligações de cursores.

Arrays menores para valores de array LLVM e endereços nativos. Repetir a inicialização usa um loop contado em vez de expandir o inicializador uma vez por elemento.

Novamente, a conveniência da fonte foi reduzida para um vocabulário de infra-estrutura menor.

# [](#conclusion)Conclusão

Arrays fixos fornecem armazenamento em linha contíguo Flecha, layout previsível, cópias de valor, acesso verificado, empréstimos seguros e loops práticos.

<a href="/">Voltar</a>
