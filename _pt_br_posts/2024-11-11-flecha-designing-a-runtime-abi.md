---
title: "Flecha Dev Log #8: Projetando uma ABI de Runtime"
date: 2024-11-11
published: true
lang: pt-BR
translation_key: "flecha-designing-a-runtime-abi"
original_url: /flecha-designing-a-runtime-abi
permalink: /pt-br/flecha-designing-a-runtime-abi
---
# [](#intro)Introdução

Olá, pessoal!

Um compilador pode emitir aritmética e ramificações sem muita ajuda. Imprimindo um valor é diferente. Formatar números, escrever bytes, relatar falhas em tempo de execução e interagir com o sistema operacional são serviços – não instruções LLVM.

Poderíamos emitir chamadas diretamente para qualquer função C++ é conveniente. Em vez disso, Flecha usa um pequeno, versão C ABI entre programas gerados e o tempo de execução.

Foi a primeira vez que tivemos que perguntar não só “o que significa Flecha?” mas também “que promessa binária conecta o código compilado ao seu tempo de execução?”

# [](#a-versioned-boundary)Uma fronteira versionada

Cada símbolo de execução recebeu o prefixo `flecha_runtime_v1_`.

```c
void flecha_runtime_v1_stdout_i32(int32_t value);
void flecha_runtime_v1_stdout_f64(double value);
void flecha_runtime_v1_stdout_bool(uint8_t value);
void flecha_runtime_v1_stdout_newline(void);
```
O cabeçalho público usa escalares C de largura fixa, `size_t`, tipos inteiros de tamanho ponteiro, e ponteiros brutos. Ele não expõe classes C++, objetos de biblioteca padrão, exceções ou manipulação de nomes C++.

Isso nos dá uma superfície binária estável mesmo que o compilador e o tempo de execução sejam implementados em C++. Uma declaração de quebra requer uma nova versão e prefixo do ABI. Adicionar um novo símbolo de versão um é possível sem alterar chamadas existentes.

# [](#values-cross-in-simple-pieces) Valores cruzados em pedaços simples

`stringv` é representado em código gerado como um ponteiro e comprimento. No limite de tempo de execução, cruza-se como esses dois argumentos:

```c
void flecha_runtime_v1_stdout_string_view(
    const char* data,
    size_t length
);
```
Não é necessário terminar o bytes nulos, e o exterminador não faz parte do comprimento. O tempo de execução escreve exatamente a faixa de bytes que Flecha passou.

Isto é menos mágico do que passar uma estrutura específica do compilador por valor, e esse é o ponto. Os limites ABI devem ser chatos o suficiente para inspecionar com ferramentas de plataforma comuns.

# [](#formatting-belongs-to-the-runtime)Formating pertence ao tempo de execução

Flecha expõe `stdout` e `stdoutln`:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">i32 main() {
    stdoutln("Flecha");
    stdoutln(32);
    stdoutln(64 as u64);
    stdoutln(1.5);
    stdoutln(true);
    stdoutln('!');
    return 42;
}</code></pre></div></div>
O compilador emite uma chamada de tempo de execução digitada para o valor. `stdoutln` emite a mesma chamada digitada seguida da função newline.

O tempo de execução decide que uma impressão booleana como `true` ou `false`, quantos dígitos significativos um flutuador recebe, e que macro formato inteiro portátil corresponde a cada largura.

Manter a formatação fora do rebaixamento do LLVM impede que a política de saída voltada para o usuário se espalhe pelo código de construção de instruções da infraestrutura.

# [](#object-files-can-stand-alone)Object arquivos podem ficar sozinhos

A compilação somente com objetos intencionalmente não requer o arquivo em tempo de execução. O objeto resultante pode conter símbolos de execução Flecha não resolvidos, assim como um objeto C comum pode conter chamadas de biblioteca não resolvidas.

Compilações executáveis são diferentes. O compilador nativo liga automaticamente o arquivo de execução configurado. Se estiver faltando ou o linker falhar, Flecha relata um diagnóstico estruturado do compilador.

Isto preservou a separação anterior:

- a emissão de objectos produz uma unidade relocável;
- a construção executável resolve as suas dependências em tempo de execução.

Essa separação também facilita a embalagem, a ligação externa e a interoperabilidade C.

# [](#small-runtime-large-decision)Um runtime pequeno, uma grande decisão

A primeira execução foi intencionalmente pequena. Ele usou operações padrão de I/O C e expôs apenas as funções geradas código necessário.

Mas a decisão arquitetônica era maior do que o arquivo:

> O código gerado fala com um ABI documentado e versionado — não diretamente com o compilador interno.

A partir deste ponto em diante, limites de verificações, valores próprios, alocação, e outras características assistidas em tempo de execução tiveram uma casa adequada.

# [](#conclusion)Conclusão

Com o ABI em tempo de execução, um programa Flecha pode imprimir todas as views escalar e string suportadas, em seguida, sair como um executável nativo normal.

O limite versionado pode crescer sem acoplamento de código gerado para detalhes de implementação C++.

<a href="/">Voltar</a>
