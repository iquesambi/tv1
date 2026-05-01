# TV1

Site institucional da TV1, agência de comunicação. Construído com React no frontend e Strapi v5 como CMS headless no backend.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + Vite 8 |
| Roteamento | React Router v6 |
| HTTP | Axios |
| CMS | Strapi v5 |
| Banco de dados | SQLite (dev) |
| Tipografia | Gilroy (self-hosted) |

---

## Estrutura do projeto

```
tv1/
├── backend/      # Strapi v5 — API e CMS
└── frontend/     # React + Vite — interface
```

---

## Pré-requisitos

- Node.js `>=20`
- npm `>=6`

---

## Instalação

### Backend

```bash
cd backend
npm install
npm run develop
```

Admin disponível em `http://localhost:1337/admin`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Site disponível em `http://localhost:5173`

---

## Configuração inicial do Strapi

Após o primeiro `npm run develop`, acesse o admin e:

1. Crie um usuário administrador
2. Vá em **Settings → Users & Permissions → Roles → Public**
3. Libere `find` e `findOne` para todos os content types abaixo:

| Content Type | Permissões necessárias |
|---|---|
| Navigation | find |
| Logo Site | find |
| Marca Nav | find |
| Quarenta Anos | find |
| Redes Sociais | find |
| Cliente | find, findOne |
| Case | find, findOne |
| Equipe | find |

---

## Content Types

### `Navigation` — single type
Menu principal do site. Cada **link** pode ter:
- `label` — texto exibido
- `url` — destino
- `imagem_hover` — imagem de fundo ao abrir o item
- `sublinks[]` — lista de sublinks, cada um com `label`, `url` e `imagem_hover`

> O item cujo `url` for `/pessoas` **não precisa de sublinks** — eles são gerados automaticamente a partir da Equipe.

### `Cliente` — collection type
Clientes da agência. Campos: `nome`, `slug`.
Cada cliente agrupa seus **Cases**.

### `Case` — collection type
Cases de cada cliente. Campos: `titulo`, `slug`, `ano`, `cliente` (relação), `capa` (imagem), e um campo `conteudo` com os seguintes blocos:

| Bloco | Uso |
|---|---|
| `Capa` | Imagem/vídeo de abertura do case |
| `Seção` | Agrupa blocos com título opcional |
| `Subtítulo` | Título interno — pode virar **âncora** e/ou **entrada na timeline** |
| `Texto` | Parágrafo de texto |
| `Descrição` | Texto em destaque |
| `Imagem Simples` | Uma imagem |
| `Imagem Trio` | Três imagens lado a lado |
| `Galeria` | Grade de imagens |
| `Vídeo` | Embed de vídeo |
| `Big Numbers` | Números em destaque com legenda |

**Timeline:** qualquer `Subtítulo` pode ter `timeline: true` com `timeline_nome`, `timeline_data` e `timeline_capa`. Assim um case pode aparecer em múltiplos pontos da linha do tempo.

### `Equipe` — single type
Lista de pessoas da agência, com **drag-and-drop** para reordenar no admin. Campos por membro: `nome`, `cargo`, `bio`, `foto`.

> Ao adicionar um membro da equipe, ele aparece automaticamente como sublink no menu **Pessoas** da home — sem precisar configurar nada no Navigation.

### `Logo Site` — single type
Logo principal exibida na home e nas páginas internas.

### `Marca Nav` — single type
Logos de marcas parceiras exibidas no rodapé da home.

### `Redes Sociais` — single type
Ícones de redes sociais no rodapé.

### `Quarenta Anos` — single type
Badge comemorativo exibido no canto superior da home. Tem campo `ativo` para ligar/desligar.

---

## Páginas

### Home `/`
Menu central animado com os itens de navegação. Comportamento:
- **1º clique** no item — abre o submenu (item sobe, outros se afastam)
- **2º clique** no mesmo item — navega para a página
- **Scroll forte** (↑/↓) enquanto um item está aberto — fecha o atual e abre o adjacente, ou fecha se estiver no limite
- **Hover** nos sublinks — exibe a imagem de fundo cadastrada no item
- **Clique fora** — fecha o menu

### Clientes `/:cliente`
Timeline horizontal com todos os cases do cliente. Navegação por arrastar ou scroll. Cards com efeito de rotação 3D (rotateY) proporcional à velocidade do scroll. Linha do tempo no rodapé com os anos dos cases.

### Case `/:cliente/:case`
Página de case com blocos de conteúdo. Suporta âncoras via hash na URL (ex: `/mequi/lollapalooza#campanha-2023`).

### Pessoas `/pessoas`
Lista de membros da equipe com foto e bio. Layout com sobreposição de foto e texto (foto à direita, nome invade a área da foto). Suporta âncoras por nome (ex: `/pessoas#selma-santa-cruz`).

---

## Transições de página

As mudanças de rota usam uma "cartela" branca que desliza da direita para a esquerda, cobrindo a tela antes de navegar. Implementado em `frontend/src/transition.jsx` via `TransitionProvider` + `useGoTo()`.

---

## Variáveis de ambiente

O backend usa um arquivo `.env` (não commitado). Copie o exemplo:

```bash
cp backend/.env.example backend/.env
```

Preencha com suas chaves:

```env
HOST=0.0.0.0
PORT=1337
APP_KEYS=...
API_TOKEN_SALT=...
ADMIN_JWT_SECRET=...
TRANSFER_TOKEN_SALT=...
JWT_SECRET=...
```

---

## Scripts úteis

### Backend
```bash
npm run develop   # modo dev com hot reload
npm run build     # build de produção
npm run start     # inicia o build de produção
```

### Frontend
```bash
npm run dev       # modo dev
npm run build     # build de produção
npm run preview   # preview do build
```

### Matar processo na porta (se necessário)
```bash
lsof -ti:1337 | xargs kill -9   # backend
lsof -ti:5173 | xargs kill -9   # frontend
```
