---
title: "Flecha Dev Log #21: Módulos, Imports e Longbow"
date: 2025-10-08
published: true
lang: pt-BR
translation_key: "flecha-modules-and-longbow"
original_url: /flecha-modules-and-longbow
permalink: /pt-br/flecha-modules-and-longbow
---
# [](#intro)Introdução

Olá, pessoal!

Um compilador pode entender programas cada vez mais interessantes e ainda nos deixar com uma pergunta muito limitante: o que acontece quando o programa não se encaixa mais em um arquivo?

Flecha precisava de um modelo de projeto. Não só uma maneira de localizar arquivos, mas uma resposta precisa para nomes, visibilidade, dependências, ciclos e o comando que transforma um diretório em um programa.

Esse trabalho produziu módulos, importações explícitas, e Longbow, ferramenta de projeto de Flecha.

# [](#one-file-one-module)One arquivo, um módulo

Um arquivo fonte Flecha pode declarar o módulo que representa:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">module factorial;

export i32 calculate(i32 value) {
    if value &lt;= 1 {
        return 1;
    }
    return value * calculate(value - 1);
}</code></pre></div></div>
O nome do módulo deve corresponder à haste do arquivo. `factorial.fl` é `factorial`; a declaração não é um segundo nome, não relacionado que pode se afastar do sistema de arquivos.

Essa pequena restrição elimina a ambiguidade. Um caminho identifica um arquivo, o arquivo identifica um módulo, e o compilador pode dar erros úteis quando esses fatos discordam.

# [](#imports-are-namespaces)Imports são espaços de nomes

Importa ao vivo em um bloco visível perto do topo do arquivo:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">module main;

@imports
    :: root::math::factorial
    :: root::parser::tokens as parser_tokens
    :: lib::std::io::filesystem;

void main() {
    stdoutln(factorial::calculate(5));
}</code></pre></div></div>
Uma importação não injecta todas as declarações no âmbito atual. Ele introduz um espaço de nomes, e sites de uso permanecem qualificados. Isso custa alguns personagens e nos compra algo muito mais importante: quando lemos `factorial::calculate`, sabemos de onde veio o nome.

`root::` começa na raiz de origem do projeto. O `lib::name::` começa em uma raiz de biblioteca configurada. Outros nomes resolvem a colisão ocasional sem alterar o módulo original. Importações de diretório e importações agrupadas também estão disponíveis, mas eles mantêm a mesma regra: código importado permanece visivelmente namespaced.

As declarações de topo são privadas, a menos que marcado `export`. Importar um arquivo, portanto, não publica acidentalmente todos os detalhes de sua implementação.

# [](#the-graph-is-the-program) O gráfico é o programa

O arquivo de entrada é apenas o início. Flecha segue suas importações, valida cada módulo, e compila o gráfico alcançável juntos.

Caminhos canônicos garantem que um arquivo fonte é carregado uma vez mesmo quando é alcançado através de diferentes rotas. Módulos em falta, fugas de caminho, erros de declaração, ciclos de importação, e excesso de importação de profundidade param compilação com diagnósticos em vez de criar misterioso comportamento linker mais tarde.

Isto é especialmente importante para o trabalho do compilador geracional: a resolução do nome deve ver um gráfico estável antes que a análise semântica comece a fazer promessas sobre tipos e propriedade.

# [](#longbow)Longbow dá ao gráfico uma casa

Datilografar sinalizadores de compilador manualmente é útil ao criar um compilador. Não é assim que queremos viver dentro de um projeto.

Longbow lê um `longbow.toml`, fornece a raiz fonte e mapas de biblioteca, e possui o diretório de saída. Um novo projeto executável torna-se:

```sh
longbow new arrows
cd arrows
longbow check
longbow run
```
`check` executa o frontend completo sem produzir um executável. `build` cria o programa. `run` constrói e executa, enquanto argumentos após `--` vão para o programa. `clean` remove saída gerada por Longbow.

Projetos de bibliotecas usam o mesmo layout, e dependências de caminhos locais tornam outro projeto Flecha disponível através de uma importação `lib::`. Longbow também busca diretórios pais para o manifesto, então os comandos funcionam naturalmente de dentro do `src`.

# [](#why-this-feels-bigger)Por que isso parece maior do que o carregamento de arquivos

Os módulos permitiram escrever a biblioteca padrão em Flecha. A configuração do projeto tornou as bibliotecas reprodutíveis. A visibilidade explícita tornou as APIs deliberadas. Um gráfico de importação agora alimenta análise semântica, verificação de propriedade, redução e geração de código nativo como um único programa.

Este é um desses marcos que se parece com ferramentas de fora, mas muda a escala de cada recurso de linguagem dentro. Flecha deixou de ser apenas um compilador que aceita um arquivo fonte. Tornou-se uma ferramenta que entende um projeto.

# [](#conclusion)Conclusão

A principal decisão foi manter o modelo sem surpresas: os módulos de nomes do sistema de arquivos, as importações introduzem espaços de nomes, as exportações definem o limite e Longbow registra como as peças se encaixam.

Há muito pouca magia nessa descrição, e é exatamente por isso que funciona.

Espero que você tenha gostado deste texto e aprendido algo novo. Como sempre, não se esqueça de fazer sua pesquisa **

<a href="/">Voltar</a>
