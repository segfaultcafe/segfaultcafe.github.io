---
title: "Flecha Dev Log #29: Tornando Acionáveis as Falhas do Linker"
date: 2026-06-27
published: true
lang: pt-BR
translation_key: "flecha-linker-diagnostics"
original_url: /flecha-linker-diagnostics
permalink: /pt-br/flecha-linker-diagnostics
---
# [](#intro)Introdução

Olá, pessoal!

A compilação nativa tem uma costura estranha. Flecha pode analisar, verificar e baixar com sucesso um programa, emitir um arquivo de objeto correto e, em seguida, depender de um driver C++ para produzir o executável.

Quando esse último passo falha, “linker saiu com código 1” é tecnicamente verdadeiro e praticamente inútil.

Mudamos a descoberta do linker e reportamos para que o compilador explique o que ele tentou e o que a máquina está faltando.

# [](#build-has-distinct-stages)Build tem fases distintas

A linha de comando expõe os pontos de paragem do compilador:

```text
flecha check input.fl
flecha --emit-llvm input.fl
flecha --emit-object input.fl -o input.o
flecha build input.fl -o input
```
Apenas o último comando precisa do linkador nativo. Isso importa para diagnósticos: uma fonte de verificação do usuário não deve ser dito para instalar um SDK que a operação solicitada nunca usa.

Também nos dá um limite de falhas limpo. Se a emissão do objeto tiver sucesso e a ligação executável falhar, o erro pertence à descoberta ou invocação da cadeia de ferramentas do host em vez da interface do Flecha.

# [](#discovery-you-can-explain) Descoberta que você pode explicar

Em cada plataforma, Flecha busca um conjunto documentado de drivers C++ adequados. Registra quais candidatos foram tentados em vez de descartar essa informação.

Se nenhum pode ser usado, o diagnóstico lista os nomes do driver tentado e dá pré-requisitos específicos da plataforma: arquivos de desenvolvimento e inicialização no Linux, o ambiente de Clang UCRT64 no Windows, ou ferramentas de linha de comando Xcode e um macOS SDK no macOS.

Quando um driver lança mas a ligação falha, Flecha inclui a saída real do linker. Nunca devemos esconder a única mensagem que nomeia um símbolo indefinido, biblioteca em falta ou arquitetura incompatível.

# [](#an-authoritative-override)Uma substituição autorizada

A descoberta automática é conveniente até que uma máquina tenha várias cadeias de ferramentas. `FLECHA_LINKER` seleciona um nome do driver ou caminho completo:

```sh
FLECHA_LINKER=/opt/llvm/bin/clang++ flecha build src/main.fl -o app
```
O comando é autoritário. Se for inválido, Flecha relata que falha em vez de cair silenciosamente para outro compilador e produzir um binário com uma cadeia de ferramentas que o usuário não selecionou.

Esse comportamento é especialmente útil em ambientes de IC e construção reprodutível, onde um recuo inesperado é muitas vezes pior do que uma falha clara.

# [](#temporary-output-must-be-safe)Saída temporária deve ser segura

Compilações executáveis primeiro emitem código Flecha para um objeto temporário único e depois invocam o driver nativo.

Usando um caminho único evita uma colisão fácil, mas destrutiva: se o executável solicitado é chamado `program` e o usuário liga um `program.o` próximo, saída do compilador nunca deve sobrescrever esse objeto de entrada. Os artefatos temporários são detalhes de implementação; as entradas de links fornecidas pelo usuário não são descartáveis.

A mesma regra faz construções simultâneas e invocações repetidas muito menos surpreendentes.

# [](#runtime-discovery-is-part-of-the-story)A descoberta do runtime faz parte da história

Um compilador instalado encontra sua biblioteca em tempo de execução em relação ao seu próprio executável. Existe uma sobreposição de desenvolvimento para diagnósticos, mas layouts instalados não dependem do repositório que os produziu.

Quando o link falha porque o tempo de execução está ausente ou inutilizável, o erro identifica o local esperado. O diagnóstico deve conectar a ação do usuário ao componente em falta, não pedir-lhes para entender os internos do compilador primeiro.

# [](#conclusion)Conclusão

O relatório de erro faz parte do design da ferramenta. Flecha agora distingue o trabalho de frontend do link nativo, explica a descoberta do driver, respeita um cancelamento explícito, preserva a saída do linker e oferece conselhos para a plataforma real.

O objetivo é simples: uma construção falhada deve nos deixar com a próxima ação, não um mistério.

Espero que você tenha gostado deste texto e aprendido algo novo. Como sempre, não se esqueça de fazer sua pesquisa **

<a href="/">Voltar</a>
