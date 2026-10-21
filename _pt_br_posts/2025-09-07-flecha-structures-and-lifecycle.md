---
title: "Flecha Dev Log #19: Estruturas e Ciclo de Vida Determinístico"
date: 2025-09-07
published: true
lang: pt-BR
translation_key: "flecha-structures-and-lifecycle"
original_url: /flecha-structures-and-lifecycle
permalink: /pt-br/flecha-structures-and-lifecycle
---
# [](#intro)Introdução

Olá, pessoal!

Flecha tinha matrizes e tuplas, mas ambos eram agregados estruturais. Ainda precisávamos de tipos nominais: valores cuja identidade vem de uma declaração e cujos campos, métodos, privacidade, construção e destruição formam um contrato coerente.

As estruturas combinam métodos fora de linha, receptores explícitos, `build`, métodos de ciclo de vida gerados e ultrapassados, privacidade, limpeza recursiva e armazenamento estável para valores imóveis.

# [](#data-first)Data first

Uma estrutura declara campos em linha:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">structure Box {
    i32 x;
    private {
        i32 y;
        bool ready;
    }
};</code></pre></div></div>
Campos e métodos são públicos por padrão. Os membros privados só são acessíveis dentro de métodos pertencentes à estrutura, inclusive através de outra instância do mesmo tipo.

As estruturas são nominais. Duas declarações com campos idênticos ainda são tipos diferentes.

# [](#methods-have-explicit-receivers)Methods têm receptores explícitos

Comportamento é definido fora de linha:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">private i32 Box::hidden(&amp;const self) {
    return self-&gt;y;
}

i32 Box::value(&amp;const self) {
    return self-&gt;x + self-&gt;hidden();
}

void Box::setY(&amp;self, i32 value) {
    self-&gt;y = value;
}</code></pre></div></div>
A assinatura do receptor diz se o método lê, muta ou usa um ponteiro bruto. Os valores de estrutura usam `.`; referências e ponteiros usam `->`.

Os receptores de referência participam em empréstimos controlados. O seu empréstimo implícito dura através da avaliação do argumento e da chamada. Um receptor bruto requer permissão insegura. Não há conversão implícita entre os dois modelos.

# [](#build-initializes-one-value)Build inicializa um valor

Cada estrutura obtém um zero-argumento gerado `init`. Um usuário pode substituí-lo por uma sobreposição:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">Box Box::init(i32 x, i32 y) override {
    return build Box {
        self.x = x;
        self.y = y;
        self.ready = true;
    };
}</code></pre></div></div>
`build` inicializa os campos em ordem de declaração, então executa seu bloco com um valor chamado `self`. Ele não chama recursivamente de inicializador da própria estrutura.

Os padrões de campo são reavaliados para cada construção. Escalares e erros recebem valores zero definidos quando não existe nenhum padrão explícito; ponteiros tornam-se nulos; strings ficam vazios; estruturas aninhadas invocam seu inicializador.

O todo inacabado `self` não pode ser copiado, passado, retornado mais cedo ou usado para chamadas de método. Flecha não implementou construção parcial e descontrair, então blocos de construção rejeitam o fluxo de controle que poderia escapar no meio do caminho.

# [](#tear-is-compiler-invoked)Tear is compiler-invoked

Cada estrutura também tem um gancho `tear` vazio implícito. Um gancho personalizado é executado antes dos campos serem destruídos:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">void Box::tear(&amp;self) override {
    stdoutln("releasing Box");
}</code></pre></div></div>
O código do usuário não pode chamar `tear` diretamente. A limpeza invoca-o, depois destrói campos em ordem de declaração reversa. Arrays e tuplas recursivamente destruir seus elementos ao contrário.

Chamadas diferidas executadas antes dos valores próprios serem destruídos no mesmo escopo. Limpeza cobre queda, retorno, quebra, prosseguir e saltos para fora. As armadilhas de corrida ainda não descontraem.

# [](#copyability-follows-lifecycle)Copiabilidade segue o ciclo de vida

Uma estrutura usando apenas o rasgo gerado e os campos copiáveis podem ser copiados, atribuídos, passados, devolvidos e capturados por adiamento. Possuir campos de strings são copiados.

Uma lágrima personalizada torna a estrutura não copiável neste marco. O compilador não pode duplicar um contrato de limpeza de recursos sem semântica de cópia explícita.

Uma lágrima insegura torna o tipo imóvel também. A construção fresca ocorre diretamente no armazenamento final para que o endereço permaneça estável até a limpeza. Criar tal valor requer uma permissão insegura porque a linguagem está confiando em suas obrigações de memória crua.

Essas restrições se propagam através de matrizes e tuplas.

# [](#native-representation)Native representation

Estruturas inferiores a estruturas LLVM nomeadas, não-embaladas com campos em ordem de declaração.

Os resultados contendo estruturas usam o armazenamento de saída fornecido pelo chamador. Isto evita a deslocalização de valores imóveis durante o retorno. A convenção é interna à Flecha e não uma promessa de compatibilidade com o ABI agregado C.

Novamente, a implementação ofereceu um comportamento nativo útil sem congelar prematuramente um ITB público.

# [](#conclusion)Conclusão

As estruturas reúnem tipos nominais, visibilidade, receptores verificados, receptores inseguros, inicialização padrão, propriedade, ordenação de diferimento, destruição determinística, layout agregado e chamadas nativas.

<a href="/">Voltar</a>
