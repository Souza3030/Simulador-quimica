# Ativar o banco e o painel administrativo

A configuração web do projeto `termolab-8f502` já está em `firebase.ts`. Ela identifica o projeto no navegador e **não concede acesso de administrador**. A proteção dos cadernos está em `firestore.rules`.

## 1. Criar o Firestore

No [Console do Firebase](https://console.firebase.google.com/project/termolab-8f502/overview), abra **Build → Firestore Database → Criar banco de dados**. Selecione o banco **(default)**, escolha a localização definitiva e conclua a criação. A localização não pode ser alterada depois.

## 2. Ativar o login

Abra **Build → Authentication → Sign-in method** e ative **Google**. Configure o e-mail de suporte solicitado. Para usar e-mail e senha no painel, ative também **E-mail/senha**. Em **Settings → Authorized domains**, adicione o domínio da hospedagem e `localhost` para desenvolvimento local, se ainda não estiver listado.

O painel aceita login com Google ou com e-mail e senha digitados na página. A conta de e-mail e senha precisa confirmar o link de verificação enviado pelo Firebase. O projeto não armazena senhas no código nem no Firestore.

## 3. Publicar as regras

Com acesso de proprietário ou editor ao projeto Firebase, faça login na CLI e publique as regras:

```sh
npm ci
npx firebase-tools login
npx firebase-tools deploy --project termolab-8f502 --only firestore:rules
```

Também é possível copiar o conteúdo de `firestore.rules` para **Firestore Database → Rules** no Console e clicar em **Publicar**. O e-mail de administrador verificado está definido nessa regra. Edite a regra se precisar trocar o administrador e publique novamente.

## 4. Hospedar as três páginas, se desejar

```sh
npm run build
npx firebase-tools deploy --project termolab-8f502 --only hosting
```

O site inclui `/`, `/caderno.html` e `/admin.html`. A configuração de Hosting também mapeia `/caderno` e `/admin` para as páginas correspondentes. O Firebase Hosting cria um endereço público; enviar o código ao GitHub, por si só, não publica o site.

## Dados e acesso

- Coleção `notebooks`; ID de cada documento = UID do proprietário no Firebase Authentication.
- Campos: `ownerUid`, `email`, `updatedAt` (carimbo do servidor) e `data` (anotações, ensaios, leituras e progresso).
- Cada usuário autenticado pode ler e escrever somente o próprio documento. A listagem de todos os documentos exige o e-mail administrador **verificado** e especificado em `firestore.rules`.
- O caderno continua salvando localmente quando não há login ou conexão. Ao entrar, a versão mais recente segundo `updatedAt` é usada; antes de substituição por uma versão remota, uma cópia local é guardada em `termolab-investigacoes-v2-backup` e pode ser retomada pelo botão **Restaurar cópia local** no caderno. Exporte JSON se desejar uma cópia independente.
- O painel lista apenas documentos já sincronizados. Ele mostra totais, busca por e-mail/UID, detalhes, anotações e exportação JSON individual.

Se aparecer **permission-denied**, confira se as regras foram publicadas no projeto correto, se a conta tem o e-mail esperado e se ele está verificado. Se aparecer **auth/unauthorized-domain**, revise os domínios autorizados no Authentication. Se surgir **failed-precondition**, confira se o Firestore `(default)` foi criado.
