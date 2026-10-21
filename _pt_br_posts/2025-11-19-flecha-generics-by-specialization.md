---
title: "Flecha Dev Log #22: Genéricos por Especialização"
date: 2025-11-19
published: true
lang: pt-BR
translation_key: "flecha-generics-by-specialization"
original_url: /flecha-generics-by-specialization
permalink: /pt-br/flecha-generics-by-specialization
---
# [](#intro)Introdução

Olá, pessoal!

Uma vez que os módulos nos permitem construir bibliotecas reutilizáveis, a repetição tornou-se muito mais fácil de ver. Um contêiner para `i32` e o mesmo contêiner para `u64` diferiram principalmente na ortografia, mas o compilador os tratou como implementações não relacionadas.

Flecha precisava de genéricos, mas também precisava deles para se adequar à linguagem que já tínhamos: tipos nativos concretos, layout determinístico, análise de propriedade, e nenhuma máquina de tipo runtime escondida.

A resposta foi especialização em tempo de compilação.

# [](#explicit-type-arguments)Explicit type arguments

Uma função genérica declara seus parâmetros de tipo ao lado de seu nome:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">T identity&lt;T&gt;(T value) {
    return value;
}

(A, B) pair&lt;A, B&gt;(A first, B second) {
    return (first, second);
}

i32 answer = identity&lt;i32&gt;(42);
name, count := pair&lt;stringv, usize&gt;("arrows", 3);</code></pre></div></div>
Os argumentos de tipo são explícitos. Flecha não os infere dos argumentos de chamada. Isso mantém os sites de chamadas legíveis e torna a especialização determinística antes de sobrecarga ordinária e regras de conversão fazer o seu trabalho.

Parâmetros de tipo podem aparecer dentro de tipos de compostos, assim `[]T`, `*T`, tuplas contendo `T`, e estruturas parametrizadas por `T` todos usam o mesmo mecanismo.

# [](#generic-structures)Estruturas genéricas

As estruturas e seus métodos também podem ser genéricos:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">structure Box&lt;T&gt; {
    T value;
};

T Box&lt;T&gt;::get(&amp;const self) {
    return self-&gt;value;
}

void Box&lt;T&gt;::set(&amp;self, T value) {
    self-&gt;value = value;
}</code></pre></div></div>
O método repete os parâmetros de tipo do proprietário. Torna a relação explícita na fonte e dá ao compilador uma declaração completa, mesmo quando corpos de método são descobertos separadamente da estrutura.

Um método também pode introduzir seus próprios parâmetros de tipo. Os parâmetros do proprietário e os parâmetros do método formam uma chave de especialização ordenada, então o compilador sabe exatamente qual função concreta está verificando.

# [](#templates-do-not-reach-the-backend)Templates não alcançam a infraestrutura

O compilador analisa e registra uma declaração genérica, mas não reduz um `T` abstrato para LLVM.

Quando o código pede `Box&lt;i32&gt;`, uma fase de expansão pré-semântica cria uma estrutura de concreto e métodos de concreto. Essas declarações passam então pelo oleoduto comum: verificação de tipo, regras de inicialização, verificação de empréstimo, análise de alocação, RI vinculada, redução e geração de código.

Essa foi a importante decisão arquitectónica. Os genéricos não criam um compilador paralelo dentro do compilador. Eles materializam declarações Flecha comuns o suficiente cedo que cada verificação de segurança existente pode raciocinar sobre tipos de concreto.

A mesma declaração mais os mesmos tipos de argumentos ordenados mapas para uma especialização em cache, incluindo quando é alcançado através de diferentes módulos. Aplicações aninhadas, como `Box&lt;Box&lt;i32&gt;&gt;`, constroem naturalmente a mesma regra.

# [](#errors-at-instantiation)Erros aparecem onde os tipos se tornam concretos

A sintaxe genérica e os fatos não dependentes podem ser verificados quando o modelo é carregado. Operações cuja validade depende do `T` são verificadas quando uma especialização é solicitada.

Se um corpo copia `T`, instanciando-o com um tipo não copiável falha. Se precisar de um valor padrão, um tipo sem construção padrão válida falha. O diagnóstico aponta para o uso do concreto e a operação genérica que não pôde ser satisfeita.

Ainda não há restrição ou linguagem característica. Em vez de fingir que cada `T` suporta cada operação, Flecha valida o corpo real sob cada substituição de concreto.

# [](#bounded-expansion)Expansão é limitada

A geração de tempo de compilação precisa de limites, assim como a alocação de tempo de execução. Flecha caps especialização ancestralidade, o número de declarações materializadas, e gerou volume de token.

Um modelo recursivamente em expansão, portanto, termina em um diagnóstico compilador em vez de uma máquina exausta. Esses limites fazem parte de tornar previsível o comportamento do compilador, não apenas detalhes de implementação defensiva.

# [](#conclusion)Conclusão

Os genéricos Flecha são deliberadamente concretos. Código fonte é reutilizável, mas cada programa gerado é construído a partir de layouts específicos e operações específicas que o compilador normal pode verificar.

O resultado parece agradavelmente pequeno na superfície: adicione `&lt;T&gt;`, instancie-o explicitamente, e deixe que a mesma maquinaria semântica prove a especialização válida.

Espero que você tenha gostado deste texto e aprendido algo novo. Como sempre, não se esqueça de fazer sua pesquisa **

<a href="/">Voltar</a>
