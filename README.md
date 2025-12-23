# call-disposition-bitrix24

Aplicativo interno para **classificação de ligações de usuários** dentro do Bitrix24, com:

* Identificação da **última ligação concluída** do usuário logado.
* Classificação rápida via **lista de status pré-definidos**.
* **Histórico paginado** das últimas ligações com status.
* **Worker em background** (PAGE_BACKGROUND_WORKER) que detecta novas ligações concluídas e **abre o app automaticamente**.
* Código organizado por **responsabilidade** (core, domínio, UI, serviços, background).

---

## 1. Objetivo da aplicação

Melhorar o controle sobre o resultado das ligações feitas via telefonia do Bitrix24, permitindo:

* Saber rapidamente **o que aconteceu** em cada ligação (reunião agendada, caixa postal, secretaria, etc.).
* Registrar o **resultado da chamada** direto na atividade de ligação (`crm.activity` → campo `DESCRIPTION`).
* Facilitar métricas e filtros posteriores com base nesse status.
* Automatizar a abertura da tela de classificação assim que uma nova ligação é concluída.

---

## 2. Visão geral de funcionamento

1. O usuário abre o app “Classificação de Ligações” no Bitrix24.
2. O app:

   * Obtém o **usuário atual** (`user.current`).
   * Identifica se ele é **admin** ou não.
   * Carrega as **últimas atividades de ligação concluídas** (`crm.activity.list` com `TYPE_ID = 2`, `COMPLETED = "Y"`, `RESPONSIBLE_ID = usuário logado`).
3. Na interface principal:

   * Mostra a **última ligação concluída** do usuário (contato + telefone).
   * Permite escolher um **resultado** em um `<select>`.
   * Ao clicar em **“Salvar resultado desta ligação”**, o app chama `crm.activity.update` atualizando o campo `DESCRIPTION`.
4. Abaixo, o app lista o **histórico das últimas ligações** (até 50), paginado.

   * Ao clicar numa linha da tabela, a ligação é selecionada e a área “Ligação selecionada” é atualizada.
5. No bloco “Background worker (Admin)”:

   * Um admin pode clicar em **“Registrar / atualizar BACKGROUND WORKER”**.
   * Isso registra o placement `PAGE_BACKGROUND_WORKER` apontando para `background/background.html`.
   * O worker roda de tempos em tempos (a cada 3 s) e:

     * Monitora a última ligação concluída do usuário.
     * Quando detecta uma nova, chama `BX24.openApplication()` para abrir o app de classificação.

---

## 3. Estrutura de pastas e arquivos

> Importante: **o `index.html` precisa estar na raiz do ZIP** para o Bitrix reconhecer o app.

```text
/
├─ index.html                  # Bootstrap mínimo – apenas redireciona para app/app.html
├─ app/
│  └─ app.html                 # UI principal da aplicação
├─ background/
│  ├─ background.html          # HTML do PAGE_BACKGROUND_WORKER
│  └─ background.worker.js     # Lógica JS do worker em background
├─ core/
│  ├─ app-namespace.js         # Cria o namespace global App e submódulos
│  ├─ logging.js               # Função de log compartilhada (App.log)
│  ├─ url-utils.js             # Cálculo de APP_BASE_URL, ROOT_BASE_URL, handlerUrl, bgHandlerUrl
│  └─ bitrix-init.js           # BX24.init + user.current + setup inicial
├─ domain/
│  ├─ call-domain.js           # Funções de domínio: formatos, extração de telefone, etc.
│  ├─ call-service.js          # Orquestra crm.activity.list, crm.activity.update
│  └─ background-register.js   # Registra PAGE_BACKGROUND_WORKER no Bitrix
└─ ui/
   ├─ styles.css               # Estilos da interface
   ├─ dom-refs.js              # Mapeia elementos do DOM em App.ui.refs
   ├─ render.js                # Renderização de UI (ligação atual, tabela, loading)
   └─ events.js                # Eventos de clique (botões, paginação, clique em linha)
```

---

## 4. Detalhes de cada componente

### 4.1. `index.html` (bootstrap / redirecionamento)

* Não possui interface nem lógica de negócio.
* Único objetivo: ser o **ponto de entrada exigido pelo Bitrix**.
* Ao carregar, calcula a URL base (root) e faz:

```js
window.location.replace(root + 'app/app.html');
```

Assim, o Bitrix enxerga `index.html`, mas a interface real roda em `app/app.html`.

---

### 4.2. `app/app.html` (UI principal)

Responsabilidades:

* Declarar a estrutura visual:

  * Header com título e nome do usuário.
  * Card de background worker (somente admins).
  * Card da **última ligação** + escolha de status + botão salvar.
  * Card de **Log** (apenas para admins).
  * Card de **Histórico** com tabela e paginação.
* Importar os scripts **na ordem correta**:

```html
<!-- núcleo / namespace -->
<script src="../core/app-namespace.js"></script>
<script src="../core/logging.js"></script>
<script src="../core/url-utils.js"></script>

<!-- domínio -->
<script src="../domain/call-domain.js"></script>

<!-- UI -->
<script src="../ui/dom-refs.js"></script>
<script src="../ui/render.js"></script>

<!-- serviços -->
<script src="../domain/call-service.js"></script>
<script src="../domain/background-register.js"></script>

<!-- inicialização Bitrix + eventos -->
<script src="../core/bitrix-init.js"></script>
<script src="../ui/events.js"></script>
```

A ordem é importante porque:

* `app-namespace.js` cria o objeto global `App`.
* `logging.js` define `App.log`.
* `url-utils.js` grava `App.config` e URLs do handler.
* `call-domain.js` escreve em `App.domain`.
* `dom-refs.js` preenche `App.ui.refs`.
* `render.js` usa `App.ui.refs` e `App.domain`.
* `call-service.js` usa `App.renderActivitiesTable`, `App.showLoadingLastCall`, etc.
* `background-register.js` usa `App.getHandlerUrls`.
* `bitrix-init.js` faz `BX24.init` e, no fim, chama `App.loadLastCall`.
* `events.js` conecta os botões às funções globais `App.*`.

---

### 4.3. `background/background.html` e `background.worker.js`

#### `background.html`

* Também minimalista em UI (sem interface).
* Carrega:

```html
<script src="//api.bitrix24.com/api/v1/"></script>
<script src="../core/app-namespace.js"></script>
<script src="../core/logging.js"></script>
<script src="background.worker.js"></script>
```

#### `background.worker.js`

Responsabilidades:

* Rodar como handler de `PAGE_BACKGROUND_WORKER`.

* Descobrir o `CURRENT_USER_ID` (via `user.current`).

* A cada 3 segundos:

  * Chama `crm.activity.list` com:

    * `TYPE_ID: 2` (ligação),
    * `COMPLETED: 'Y'`,
    * `RESPONSIBLE_ID: CURRENT_USER_ID`.
  * Pega a **primeira atividade** (mais recente).
  * Se for a primeira vez, apenas armazena o `lastActivityId`.
  * Se detectar que o ID mudou em relação ao `lastActivityId`:

    * Atualiza `lastActivityId`.
    * Chama `BX24.openApplication()` para abrir o app de classificação.

* Loga mensagens via `bgLog` (no console, e opcionalmente no App.log).

---

### 4.4. Pasta `core/`

#### `app-namespace.js`

Cria e garante a estrutura base:

```js
const App = global.App = global.App || {};

App.state  = App.state  || {};
App.ui     = App.ui     || {};
App.domain = App.domain || {};
App.config = App.config || {};
```

Isso garante que todos os módulos seguintes possam escrever em `App.*` sem sobrescrever o que já existe.

---

#### `logging.js`

* Define `App.log(msg, data)`:

  * Formata o horário `[HH:MM:SS]`.
  * Se houver `<textarea id="log">`, escreve a linha lá (para admins).
  * Sempre faz também `console.log`.
* Adiciona um listener global para erros JS:

```js
window.addEventListener('error', function (ev) {
    const msg = ev.message || (ev.error && ev.error.message) || ev.error || '';
    log('JS ERROR GLOBAL', msg);
});
```

Isso ajuda a ver diretamente no log do app qualquer erro de JS que esteja quebrando a tela.

---

#### `url-utils.js`

Calcula URLs base:

* A partir da URL atual (`app/app.html`), ele calcula:

  * `APP_BASE_URL` → caminho até `/app/`.
  * `ROOT_BASE_URL` → caminho até a raiz (`/app_local/hash/`).

* Define:

  * `App.config.handlerUrl = ROOT_BASE_URL + 'index.html'`
  * `App.config.bgHandlerUrl = ROOT_BASE_URL + 'background/background.html'`

Essas URLs são usadas pelo módulo de registro do background worker.

---

#### `bitrix-init.js`

Responsabilidades:

1. Chamar `BX24.init`.
2. Pedir `user.current`:

   * Gravar `App.state.CURRENT_USER_ID`.
   * Descobrir se o usuário é admin (`App.state.IS_ADMIN`).
3. Ajustar UI inicial:

   * Colocar o nome do usuário no header.
   * Esconder bloco de admin + log caso não seja admin.
4. Por fim, chamar:

```js
App.loadLastCall();
```

que vem de `domain/call-service.js`.

---

### 4.5. Pasta `domain/`

#### `call-domain.js`

Funções puramente de domínio (sem mexer em DOM):

* `extractPhoneFromSubject(subject)`
  Tenta extrair um número de telefone de dentro do `SUBJECT` usando regex.

* `formatDurationMmSs(startIso, endIso)`
  Calcula diferença entre `START_TIME` e `END_TIME` e devolve `MM:SS`.

* `resolveContactAndPhone(activity)`
  Usa `activity.COMMUNICATIONS` (quando disponível) para:

  * Descobrir o nome do contato (HONORIFIC, NAME, LAST_NAME, etc.).
  * Descobrir o telefone principal.
  * Se não tiver `COMMUNICATIONS`, tenta extrair do `SUBJECT`.

Tudo isso é exposto via:

```js
App.domain.extractPhoneFromSubject = ...
App.domain.formatDurationMmSs      = ...
App.domain.resolveContactAndPhone  = ...
```

---

#### `call-service.js`

Serviço de aplicação para **carregar** e **salvar** informações das atividades.

* Gerencia `App.state`:

  * `CURRENT_USER_ID`
  * `ACTIVITIES`
  * `LAST_ACTIVITY`
  * `isLoadingActivities`
  * `loadTimeoutId`
  * `currentPage`
  * `PAGE_SIZE`

* Função `loadLastCall()`:

  1. Garante que existe `CURRENT_USER_ID`.
  2. Evita chamadas concorrentes (se `isLoadingActivities` já está true, ignora).
  3. Liga a UI de loading via `App.showLoadingLastCall(true)`.
  4. Dispara um **timeout de segurança** (10 s).
  5. Chama `crm.activity.list` com os filtros de chamada concluída.
  6. No callback:

     * Cancela o timeout.
     * Desliga o loading.
     * Trata erros de API.
     * Povoa `App.state.ACTIVITIES`.
     * Configura `App.state.currentPage = 0`.
     * Atualiza a atividade atual com `App.setCurrentActivity(...)`.
     * Renderiza a tabela via `App.renderActivitiesTable(...)`.

* Função `saveCallResult()`:

  1. Usa `App.state.LAST_ACTIVITY`.
  2. Lê o `<select id="call-result">`.
  3. Chama `crm.activity.update` alterando somente `DESCRIPTION`.
  4. Em caso de sucesso, exibe `alert('Resultado salvo com sucesso.')` e recarrega as ligações (`loadLastCall()`).

Além disso, expõe:

```js
App.loadLastCall       = loadLastCall;
App.saveCallResult     = saveCallResult;
App.setCurrentActivity = setCurrentActivity;
```

---

#### `background-register.js`

Função única para registrar o `PAGE_BACKGROUND_WORKER`:

* Verifica se `App.state.IS_ADMIN` é true.
* Obtém URLs via `App.getHandlerUrls()`.
* Faz:

  1. `placement.unbind` para limpar qualquer registro anterior.
  2. `placement.bind` com:

     * `PLACEMENT: 'PAGE_BACKGROUND_WORKER'`
     * `HANDLER: bgHandlerUrl`
     * `OPTIONS: { ERROR_HANDLER_URL: handlerUrl, errorHandlerUrl: handlerUrl }`

Em caso de sucesso, alerta “Background worker registrado com sucesso.”
Em caso de erro, mostra o JSON do erro.

---

### 4.6. Pasta `ui/`

#### `styles.css`

Estilização da UI:

* Layout geral (`body`, `.header`, `.container`, `.card`).
* Botões e selects.
* Tabela (`th`, `td`, hover em linhas).
* Bloco da ligação atual (`.current-call-main`, `.current-call-contact`).
* Bloco de observação.

---

#### `dom-refs.js`

Centraliza referências do DOM em `App.ui.refs`:

```js
App.ui.refs = {
    logEl:              document.getElementById('log'),
    logCardEl:          document.getElementById('log-card'),
    appHeaderEl:        document.getElementById('app-header'),
    adminBlockEl:       document.getElementById('admin-block'),
    lastCallTextEl:     document.getElementById('last-call-text'),
    currentCallTitleEl: document.getElementById('current-call-title'),
    btnRefreshLast:     document.getElementById('btn-refresh-last'),
    btnSaveResult:      document.getElementById('btn-save-result'),
    selectResult:       document.getElementById('call-result'),
    btnRegisterBg:      document.getElementById('btn-register-bg'),
    callsTableBody:     document.querySelector('#calls-table tbody'),
    btnPrevPage:        document.getElementById('btn-prev-page'),
    btnNextPage:        document.getElementById('btn-next-page'),
    pageIndicator:      document.getElementById('page-indicator'),
    bgStatusEl:         document.getElementById('bg-status')
};
```

Isso facilita manutenção: se mudar um ID no HTML, basta atualizar aqui.

---

#### `render.js`

Funções de renderização:

* `applyStatusFromDescription(activity)`:

  * Lê `activity.DESCRIPTION` e tenta encontrar um valor correspondente no `<select>` de resultados.

* `renderCurrentActivity(activity, fromList)`:

  * Atualiza o título (Última ligação/Ligação selecionada).
  * Mostra contato + telefone.
  * Chama `applyStatusFromDescription`.

* `showLoadingLastCall(isLoading)`:

  * Mostra “carregando…” e desabilita o botão de refresh enquanto busca no CRM.

* `renderActivitiesTable(activities, currentPage, pageSize)`:

  * Renderiza a tabela de histórico.
  * Cria os `<tr>` conforme os dados.
  * Calcula paginação e atualiza `pageIndicator`.
  * Desabilita/habilita botões de anterior/próxima página.
  * Em cada linha, adiciona `click` que chama `App.onActivityRowClick(idx)`.

---

#### `events.js`

Conecta **UI → Serviços**:

* Botão “Atualizar última ligação” → `App.loadLastCall()`.
* Botão “Salvar resultado desta ligação” → `App.saveCallResult()`.
* Botão “Registrar / atualizar BACKGROUND WORKER” → `App.registerBackgroundWorker()`.

Paginação:

* `btnPrevPage` e `btnNextPage`:

  * Atualizam `App.state.currentPage`.
  * Chamam `App.renderActivitiesTable(...)`.
  * Usam `ev.preventDefault()` para evitar comportamento estranho de navegação.

Clique na linha:

* Define `App.onActivityRowClick(idx)` que:

  * Atualiza `App.state.LAST_ACTIVITY` com a atividade clicada.
  * Chama `App.renderCurrentActivity(..., true)`.

---

## 5. Instalação no Bitrix24 (app local via ZIP)

### 5.1. Empacotamento

1. No seu ambiente local, garanta a estrutura de pastas descrita acima.
2. Na hora de compactar:

   * Selecione **todas as pastas e arquivos** (`index.html`, `app/`, `background/`, `core/`, `domain/`, `ui/`)
   * Crie o `.zip` **direto desses itens**, e não de uma pasta pai.
3. Resultado esperado ao abrir o ZIP:

   * Você deve ver `index.html` na raiz do ZIP.
   * E as pastas `app/`, `background/`, `core/`, `domain/`, `ui/` logo abaixo.

> Se o `index.html` ficar dentro de uma subpasta, o Bitrix não vai achar o ponto de entrada.

---

### 5.2. Registro como aplicação local

No Bitrix24 (cloud, interface típica em PT-BR):

1. Acesse **“Aplicações”** (menu principal).
2. Vá em algo como **“Adicionar aplicação”** → **“Aplicação personalizada / Aplicação local”**
   (o nome exato pode variar conforme a versão/idioma, mas é a opção de “minha aplicação / custom”).
3. Escolha a opção de carregar um **arquivo ZIP**.
4. Se o Bitrix pedir:

   * Nome interno / Nome de exibição da aplicação (ex.: `SDR Call Classifier`).
   * Se for necessário informar a URL do handler, use o padrão que ele mostrar, mas na maioria dos casos, ao subir o ZIP com `index.html` na raiz, ele já assume `index.html` como entrypoint automaticamente.
5. Conclua o cadastro.

Após isso, o Bitrix irá hospedar o seu app em algo como:

```text
https://cdn.bitrix24.com.br/<id_portal>/app_local/<hash>/
```

E irá servir o `index.html`, que redireciona para `app/app.html`.

---

### 5.3. Permissões recomendadas

Na configuração da aplicação (dependendo da tela de cadastro):

* **CRM**: acesso de leitura e atualização (`crm.activity.list`, `crm.activity.update`).
* **Telephony**: dependendo do portal, mas em geral o app precisa ler somente atividades de CRM; a telefonia em si já gera as atividades.
* **User (user.current)**: leitura do usuário atual.
* **placement**: permissão para registrar `PAGE_BACKGROUND_WORKER` e `openApplication`.

Se o Bitrix tiver uma aba de **escopos (scope)**, garanta que ao menos:

* `crm`
* `user`
* `placement`

estão marcados.

---

## 6. Configuração do Background Worker dentro do app

1. Entre no Bitrix com um **usuário admin**.

2. Abra o app “Classificação de Ligações”.

3. No card “Background worker (Admin)”, clique em:

   > **Registrar / atualizar BACKGROUND WORKER**

4. O app fará:

   * `placement.unbind` de qualquer registro anterior de `PAGE_BACKGROUND_WORKER`.
   * `placement.bind` registrando `background/background.html` como handler.

5. Em caso de sucesso, você verá um alerta:

   > “Background worker registrado com sucesso.”

A partir daí, o Bitrix chamará periodicamente o `background.html`, que por sua vez executa `background.worker.js`, monitora as ligações concluídas e abre a aplicação quando detecta uma nova.

---

## 7. Uso diário pelos usuários

### 7.1. Classificação da última ligação

1. O usuário realiza a ligação normalmente pela telefonia integrada ao Bitrix.
2. Quando a ligação é encerrada:

   * Se o background worker estiver configurado e funcionando, o app pode ser aberto automaticamente.
   * Ou o usuário pode abrir o app manualmente no menu de aplicações.
3. Ao abrir o app:

   * A primeira área mostra:
     **“Última ligação concluída:”**
     `NOME DO CONTATO | TELEFONE`.
4. O usuário escolhe um valor no `<select>`:

   * REUNIÃO AGENDADA
   * FALEI COM SECRETÁRIA
   * FOLLOW-UP
   * RETORNO POR E-MAIL
   * NÃO TEM INTERESSE
   * NÃO FAZ LOCAÇÃO
   * CAIXA POSTAL
5. Clica em **“Salvar resultado desta ligação”**.

   * O app chama `crm.activity.update` e grava esse valor em `DESCRIPTION`.

### 7.2. Selecionar ligações anteriores

1. No card “Histórico recente de ligações”, o usuário vê até as últimas 50 ligações concluídas.
2. Pode navegar pelas páginas com os botões `<` e `>`.
3. Ao clicar em qualquer linha:

   * A área de “Ligação selecionada” é atualizada.
   * O `select` de resultado tenta ser preenchido automaticamente com o que estiver em `DESCRIPTION`.
4. O usuário pode alterar o resultado e salvar novamente, ajustando o status da ligação anterior.

---

## 8. Tratamento de erros e timeouts

* A função de carregamento (`loadLastCall`) usa um **timeout de 10 segundos**:

  * Se a API `crm.activity.list` não responder nesse tempo:

    * O app registra no log: “TIMEOUT: crm.activity.list não respondeu em 10s.”
    * Desativa o estado de loading.
    * Mostra mensagem de “Nenhuma chamada encontrada” e tabela vazia.
* Quaisquer erros JS aparecem:

  * No `console` do navegador.
  * No `<textarea id="log">` (se o usuário for admin).
* Os erros de API (`result.error()`) são logados e, em alguns casos, exibidos via `alert`.

---

## 9. Manutenção, extensão e SOLID (breve visão)

A estrutura foi pensada para facilitar manutenção e extensão:

* **Single Responsibility**:

  * Cada arquivo cuida de um aspecto: namespace, log, URL, domínio de chamadas, UI, services, background, etc.

* **Aberto para extensão / fechado para modificação**:

  * Para adicionar um novo status:

    * Basta editar o `<select>` em `app.html`.
    * A lógica de `applyStatusFromDescription` continua válida.
  * Para mudar estilo:

    * Ajustar apenas `ui/styles.css`.
  * Para ajustar pooling do worker:

    * Alterar o intervalo no `setInterval` em `background.worker.js`.

* **Acoplamento controlado**:

  * Comunicação via `App.*`, evitando variáveis globais soltas.
  * UI só mexe em DOM através de `App.ui.refs`.

---

## 10. Atualização da aplicação

Quando precisar subir uma nova versão:

1. Atualize os arquivos localmente.
2. Gere um novo `.zip` com a mesma estrutura (index.html na raiz).
3. No Bitrix, vá em **Configurações da aplicação** → opção de **Atualizar** / reenviar ZIP.
4. Substitua o ZIP antigo pelo novo.
5. Se a estrutura/URL do background tiver mudado (por ex. se mover `background/`), entre com um admin no app e clique novamente em **“Registrar / atualizar BACKGROUND WORKER”** para garantir o bind correto.
