---
title: "collision - pwnable.kr"
date: 2023-12-02
published: true
lang: pt-BR
translation_key: "collision-pwnable"
original_url: /collision-pwnable
permalink: /pt-br/collision-pwnable
---
# [](#intro)Introdução

Vamos continuar com nossas aventuras de queda de cartas em [Pwnable](https://pwnable.kr). Desta vez, vamos deixar cair o cartão do Fabre. Se você ainda não verificou meu primeiro post resolvendo 'fd' no Pwnable, vá dar uma olhada [here](fd-pwnable).

Vamos começar!

# [](#level-description)Challenge description
> Papai me contou sobre a colisão de hash MD5 legal hoje.
> Eu quero fazer algo assim também!
>
> ssh col@ pwnable. kr - p2222 (pw: guest)

# [](#approach)Approach mindset

Simarly para o último desafio CTF, vamos enfrentar este primeiro entendendo o que é uma colisão de hash  MD5 antes mesmo de ssh para a máquina.

## [](#mindset-step1)Passo 1 - Compreendendo conceitos básicos

A colisão de hash MD5 é um ataque bem definido, com diversos artigos e artigos explicando o conceito. Por exemplo, [D. Kashyap](https://scholarworks.sjsu.edu/cgi/viewcontent.cgi?referer=&httpsredir=1&article=1020&context=etd_projects) tem uma tese de mestrado dedicada completa sobre isso, que pode ser mais do que suficiente para entendermos esse ataque.

Nele, podemos ver que a definição de ataque de colisão é:  "Encontrando duas mensagens diferentes que dão o mesmo valor de hash" .

A ideia é a seguinte: em um ataque de colisão, o objetivo é encontrar duas mensagens distintas $M$ e $M'$ que produzem o mesmo valor de hash $h$. Isso pode ser conceituado modificando subcomponentes de $M$ - dizer $M 0$ e $M 1$ - para criar a nova mensagem $M'$ - composto de $M 0'$ e $M 1'$ - de tal forma que o hash de $M'$ equivale ao hash de $M$.

As relações entre os dois subcomponentes de $M$ e $M'$ são

$$M 0' = M 0 + \Delta M 0$$

e

$$M 1' = M 1 + \Delta M 1$$

onde $\Delta M 0 = M 0' - M 0$ e $\Delta M 1 = M 1' - M 1$ são a diferença bitwise dos dois pares de submensagem. Estes dois, $\Delta M 0$ e $\Delta M 1$, são tipicamente complexos para calcular, mas se bem sucedidos, eles comprometem a integridade dos sistemas usando MD5 permitindo que diferentes entradas sejam tratadas como idênticas.

Embora eu duvide que estes cálculos serão relacionados com este CTF, é uma boa prática entender o conceito mais amplo de colisões, pois isso pode nos ajudar a resolver o desafio. Se você está interessado em ler mais sobre as especificidades da colisão MD5, confira [D. Kashyap](https://scholarworks.sjsu.edu/cgi/viewcontent.cgi?referer=&httpsredir=1&article=1020&context=etd_projects) tese.

## [](#mindset-step2)Passo 2 - Compreender o problema

Muito bem, vamos entrar na máquina e dar uma vista de olhos! Podemos ssh com o comando:

`ssh col@pwnable.kr -p2222`

Lembre-se de passar a senha correta, que é `guest`. Assim que pousarmos na máquina, podemos executar o comando `ls -l`. Isto nos dá:

```bash
col@pwnable:~$ ls -l
total 16
-r-sr-x--- 1 col_pwn col     7341 Jun 11  2014 col
-rw-r--r-- 1 root    root     555 Jun 12  2014 col.c
-r--r----- 1 col_pwn col_pwn   52 Jun 11  2014 flag
```
Vamos dar uma olhada no script `col.c`:

```c
#include <stdio.h>
#include <string.h>
unsigned long hashcode = 0x21DD09EC;
unsigned long check_password(const char* p){
        int* ip = (int*)p;
        int i;
        int res=0;
        for(i=0; i<5; i++){
                res += ip[i];
        }
        return res;
}

int main(int argc, char* argv[]){
        if(argc<2){
                printf("usage : %s [passcode]\n", argv[0]);
                return 0;
        }
        if(strlen(argv[1]) != 20){
                printf("passcode length should be 20 bytes\n");
                return 0;
        }

        if(hashcode == check_password( argv[1] )){
                system("/bin/cat flag");
                return 0;
        }
        else
                printf("wrong passcode.\n");
        return 0;
}
```
Hmmm. Interessante. Isso parece um código de verificação de senha simples, que podemos usar executando `./col <passcode>`. Vamos decifrá-lo.

1. Primeiro, o código verifica se nossa entrada `<passcode>` tem o comprimento 20. Se não, então nos adverte que deve ter comprimento 20.

2. Se o nosso código tem 20 bytes, então o código irá passá-lo para a função `check_password`. Se a saída do `check_password` é igual a `hashcode = 0x21DD09EC`, então resolvemos o desafio.

Vamos entender agora o que a função `check_password` faz:

1. Primeiro, ele inicializa um ponteiro inteiro `ip` que referencia cada 4 bytes de `<passcode>` como um inteiro.

2. Ele então inicializa `res` inteiro como 0, interpretando assim a string de entrada como uma matriz de inteiros. Isso significa que cada 4 bytes da senha são agrupados e interpretados como um inteiro.

3. Finalmente, retorna `res` com a representação hexadecimal do `<passcode>` que fornecemos.

Note que precisamos passar um `<passcode>` representado em seu valor hexadecimal como `hashcode`. É aqui que acontece a colisão! Note que o `<passcode>` deve ter 20 bytes de comprimento. Quando `check_password` é chamado, ele irá quebrar o nosso `<passcode>` em 5 valores inteiros diferentes que devem adicionar até `hashcode`. Isso significa que o `<passcode>` deve adicionar `0x21DD09EC` dentro de 5 iterações. Para isso, precisamos dividir `0x21DD09EC` por 5, e o resultado deve ser nossas sub-mensagens de 4 bytes de nossos 20 bytes `<passcode>`.

Podemos usar [esta calculadora ](https://www.calculator.net/hex-calculator.html) hex para encontrar corretamente a divisão de `hashcode` por 5:

$$\frac{0\text{x21DD09EC}}{5} = 0\text{x6C5CEC8}\text{resto : 4}$$

A divisão não é exata, o que significa que temos um termo sobrando para ser adicionado para recuperar o valor exato de `hashcode`. Isto significa que:

$$\text{resmainder} = 0\text{x21DD09EC} - 4*0\text{x6C5CEC8}$$

Que é o mesmo que

$$\text{resmainder} = 0\text{x21DD09EC} - 0\text{x1B173B20} = 0\text{x6C5CECC}$$

Então, se nossos cálculos estão corretos, nós temos:

$$\text{hashcode} = 0\text{x21DD09EC} = 4*0\text{x6C5CEC8} + 0\text{x6C5CECC}$$

Em outras palavras, nosso `<passcode>` deve ter quatro cordas de 4 bytes com valor `0x6C5CEC8` colidiu com um inteiro de 4 bytes com valor `0x6C5CECC`. Isto irá somar até um inteiro de 20 bytes e `check_password` irá avaliá-lo para o `hashcode`.

A única coisa a ser feita aqui é encontrar com sucesso uma maneira de representar o `<passcode>` como um inteiro de 20 bytes que será convertido da forma como calculamos.

## [](#considerations-step2) Considerações

É importante considerar aqui a endiância - ordem byte - usada pelo sistema. A endianess refere-se à ordem em que bytes são armazenados para tipos de dados multi-byte como inteiros na memória. Existem dois tipos de endívia:

1. **Little endian**: em pequenos sistemas endian, o byte menos significativo (LSB) de uma palavra é armazenado no menor endereço de memória, e o byte mais significativo (MSB) é armazenado no endereço mais alto. Por exemplo, o valor hexadecimal $0\text{x12345678}$ será armazenado na memória como 78, 65, 43 e 21.

2. ** Big endian**: em sistemas Big Endien, o LSB de uma palavra é armazenado no endereço de memória mais alto, e o MSB é armazenado no menor endereço. Por exemplo, o mesmo valor hexadecimal $0\text{x12345678}$ será armazenado na memória como 12, 34, 56 e 78.

## [](#mindset-step3)Passo 3 - Criando o ataque

O primeiro pensamento que temos que fazer é descobrir como escrever nosso `<passcode>` de tal forma que ele é traduzido para o valor `hashcode`, representado em nossos cálculos acima mencionados. Em nossa máquina local, poderíamos escrever um script Python que faz isso. Vamos assumir pouco endian aqui, uma vez que a maioria das arquiteturas x86 são pouco endian.

```python
bytes1 = b'\xC8\xCE\xC5\x06'
bytes2 = b'\xCC\xCE\xC5\x06'

passcode = 4*bytes1 + bytes2

assert len(passcode) == 20, "Passcode does not meet criteria"

print(passcode)
```
Executando o código, afirmamos que o comprimento da senha é 20 e o resultado é:

```bash
kaizen@celestial /tmp/col $ python3 col.py 
b'\xc8\xce\xc5\x06\xc8\xce\xc5\x06\xc8\xce\xc5\x06\xc8\xce\xc5\x06\xcc\xce\xc5\x06'
```
Está bem! Parece estar a funcionar! Mas como podemos executar isso diretamente na linha de comando? Presumo que não teremos permissões para escrever um script Python dentro da máquina CTF... Vamos verificar:

```
col@pwnable:~$ python3 -c "print('hi mom')"
hi mom
```
Ok, nós somos capazes de executar uma linha de comando Python snippet. Vamos resolver este mauzão!

## [](#mindset-step4)Passo 4 - Resolvendo!

Eu tentei algumas abordagens diferentes antes de realmente encontrar a carga útil escrita. Vamos ver o que tentei e porque falhou.

Tentativa 1
Minha primeira tentativa foi passar uma string que tinha o trecho Python incorporado com ele. Eis o que tenho:

```bash
col@pwnable:~$ ./col "python3 -c 'print(4 * \xc8\xce\xc5\x06+\xcc\xce\xc5\x06)'"
passcode length should be 20 bytes
```
Sim. Isso não funcionou. Eu acho que o problema aqui é que o binário `col` está interpretando toda a carga útil como minha senha, e não realmente executando o comando `python3`. Vamos passar à minha segunda tentativa.

Tentativa 2

Vamos tentar substituição de comando, que está basicamente dizendo ao shell para armazenar o resultado do comando `python3` em uma variável e então passá-lo para `col`. No entanto, isso também não funcionou:

```bash
col@pwnable:~$ ./col "$(python3 -c "print(4 * b'\xc8\xce\xc5\x06' + b'\xcc\xce\xc5\x06')")"
passcode length should be 20 bytes
```
O que me fez pensar que o problema era a ordem de citação. Nesta carga útil, estou usando aspas duplas para dois conjuntos diferentes da carga útil, o que pode confundir o shell. Vamos ver a minha terceira tentativa.

Tentativa 3

Minha terceira tentativa foi tentar usar a citação escapando como uma alternativa para um dos pares de citações duplas:

```bash
col@pwnable:~$ ./col "$(python3 -c 'print(4 * b'\''\xc8\xce\xc5\x06'\'' + b'\''\xcc\xce\xc5\x06'\'')')"
passcode length should be 20 bytes
```
Como podemos ver, isso também não funcionou.

Tentativa 4

Eu estava ficando cansado de contar aspas simples, duplas, e escapou de citações únicas. Talvez deva tomar uma abordagem diferente. Talvez o problema não fosse a citação, mas a forma como a função `print` produz bytes brutos.

Então pensei... E se eu forçar a impressão a passar corretamente os bytes brutos usando `sys.stdout` buffer? Bem, vejamos:

```bash
col@pwnable:~$ ./col "$(python3 -c 'import sys; sys.stdout.buffer.write(4 * b"\xc8\xce\xc5\x06"+ b"\xcc\xce\xc5\x06")')"
daddy! I just managed to create a hash collision :)
```
Funcionou! Mas porquê? Temos as seguintes duas respostas:

1. Usando `sys.stdout.buffer.write` obriga bytes brutos a serem escritos diretamente para stdout descritor. Isso evita quaisquer caracteres adicionais que `print` possa adicionar.

2. Nós garantimos que todo o comando Python está incluído em aspas simples, e as strings de byte dentro do comando Python estão fechadas em aspas duplas.

Aproveite o seu cartão Fabre! Este foi mais difícil que o de Poring.

# [](#conclusions) Conclusão

Nesta CTF aprendemos muito! Não só tivemos um pouco de gosto do que as colisões de hash MD5 eram teoricamente, mas também conseguimos um pequeno ambiente para praticar uma versão simplificada disto. Embora o CTF não estivesse realmente relacionado à colisão de hash MD5, o conceito utilizado para resolvê-lo é muito semelhante - mas excessivamente simplificado - a este tópico muito mais complexo.

Também usamos uma pequena ordem de byte endian para resolver isso, que é algo a ter em mente. Big endian não teria trabalhado em uma arquitetura x86, e nosso palpite para usar endian pouco foi inicialmente correto!

Não só isso, nós também precisávamos pensar em diferentes maneiras de criar uma boa carga útil para que os inteiros hexadecimais fossem realmente interpretados pelo binário `col`. Isso mostra por que persistência e resiliência é uma habilidade genial para ter como hacker.

Isto é exatamente o que um hacker faz: encontra seu caminho através. Tínhamos a resposta, só precisávamos de encontrar uma janela aberta, e pelo buraco do coelho vamos!

Obrigado por ficar até o fim. Foi um belo passeio! E lembre-se, sempre faça sua pesquisa **!

<a href="/">Voltar</a>
