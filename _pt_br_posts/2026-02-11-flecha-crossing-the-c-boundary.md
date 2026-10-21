---
title: "Flecha Dev Log #25: Atravessando a Fronteira com C"
date: 2026-02-11
published: true
lang: pt-BR
translation_key: "flecha-crossing-the-c-boundary"
original_url: /flecha-crossing-the-c-boundary
permalink: /pt-br/flecha-crossing-the-c-boundary
---
# [](#intro)Introdução

Olá, pessoal!

Uma língua nativa eventualmente precisa chamar o código que não compilou. Sistemas operacionais, bibliotecas maduras e até mesmo o próprio tempo de execução de uma língua muitas vezes se encontram no C ABI.

A implementação tentadora é “deixar o linker descobrir isso.” Flecha tomou a abordagem oposta: tornar o limite estreito, explícito e rigoroso o suficiente para que as representações não suportadas falhem antes de ligar.

# [](#an-extern-is-only-a-declaration)Uma externa é apenas uma declaração

Uma função externa tem uma assinatura Flecha mas nenhum corpo Flecha:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">extern unsafe i32 native_read(
    *const char path,
    usize path_length,
    *u8 output,
    usize capacity
);</code></pre></div></div>
O linker nativo fornece a implementação. O símbolo exportado é exatamente `native_read`, sem um prefixo de módulo Flecha, enquanto a pesquisa de nome dentro Flecha ainda respeita o módulo que o declarou.

As declarações externas devem ser funções livres e não genéricas. Não podem ser sobreposições do ciclo de vida ou o ponto de entrada do programa. Essas restrições mantêm o comportamento de chamada específico da linguagem longe de um limite que promete o C ABI.

# [](#extern-and-unsafe-mean-different-things)Extern e inseguro significam coisas diferentes

`extern` diz de onde vem a implementação. `unsafe` diz que responsabilidade a chamada carrega.

Uma função externa só escalar pode ser segura:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">extern i32 native_add(i32 left, i32 right);
</code></pre></div></div>
Uma assinatura contendo ponteiros brutos deve ser insegura, e cada chamada precisa de uma permissão normal e insegura. Um ponteiro bruto cruzando esta fronteira não ganha nenhuma propriedade, vida útil, pseudônimo, procedência, ou garantia de nulidade simplesmente porque sua declaração tem um tipo.

Flecha também se recusa a passar rastreio de posse ou emprestado alocações para uma função externa. Até que um contrato de propriedade externa possa descrever o que o código nativo faz com essa memória, a resposta segura é não adivinhar.

# [](#a-deliberately-small-abi)Uma ABI deliberadamente pequena

O primeiro ABI suporta `void`, escalares inteiros e de ponto flutuante, `bool`, `char` e ponteiros brutos. Argumentos inteiros estreitos recebem o sinal ou extensão zero exigido pelo alvo C ABI.

Referências, fatias, tuplas, estruturas, valores de erro e strings por valor são rejeitadas. Seus formulários em memória são detalhes de implementação Flecha, não interfaces C acidentais.

Strings expõem bytes explicitamente com `data()` dentro de código inseguro, enquanto o comprimento viaja separadamente. Dois manipuladores de tempo de execução versionados suportam a própria ponte de string do compilador, mas bibliotecas comuns veem ponteiros de byte e comprimentos.

# [](#linking-is-part-of-the-command)Linking faz parte do comando

Compilações executáveis aceitam entradas nativas repetitivas:

```sh
flecha build src/main.fl -o app --link native_io.o --link libmath.a
```
Longbow registra os mesmos objetos ou arquivos no manifesto do projeto. A emissão do objeto pára deliberadamente antes do linker, mantendo “compilar este módulo” distinto de “constituir este executável”.

# [](#filesystem-as-a-real-test)Filesystem I/O como um teste real

A biblioteca padrão usa este limite para oferecer uma leitura segura de arquivo inteiro:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">@imports
    :: lib::std::io::filesystem;

contents, err := filesystem::read_file("input.fl");
if err != none {
    return err;
}</code></pre></div></div>
O wrapper valida o caminho, chama uma função de execução versionada, e recebe uma string própria no sucesso. Os arquivos vazios têm sucesso com uma string vazia. Bytes nulos incorporados e terminações de linha de plataforma são preservadas porque o conteúdo é bytes, não secretamente decodificado texto.

Erros distinguem arquivos faltando, permissão negada, caminhos inválidos, conteúdo superdimensionado, leituras falhadas e falha na alocação. O arquivo está fechado e o armazenamento parcial é liberado em cada caminho.

No POSIX, os caminhos viajam como sequências de byte. No Windows, os caminhos UTF-8 são validados e convertidos para UTF-16 antes da abertura. Essas diferenças pertencem ao papel de execução, não a todos os programas Flecha.

# [](#conclusion)Conclusão

A interoperabilidade é mais segura quando nenhum dos lados é solicitado a fingir. Flecha nomeia o subconjunto C-compatível, faz chamadas de memória brutas visivelmente inseguras, preserva verificações de propriedade na borda e envolve detalhes da plataforma em uma API padrão segura.

A fronteira é intencionalmente pequena. Pequenos limites são mais fáceis de entender, testar e confiar.

Espero que você tenha gostado deste texto e aprendido algo novo. Como sempre, não se esqueça de fazer sua pesquisa **

<a href="/">Voltar</a>
