# Auto-sincronização de Navegação

## Como funciona

Agora quando você cria ou atualiza um **Cliente**, **Pessoa** ou **Especialidade**, a Navegação é automaticamente sincronizada.

### Fluxo para Clientes e Pessoas:

1. **Criar um novo Cliente**
   - Preenche nome e slug é auto-gerado
   - Ao salvar, automaticamente:
     - Um novo **Link** é criado em Navegação
     - O label do link é o nome do cliente
     - O URL é preenchido com o slug: `/{slug}`

2. **Atualizar um Cliente**
   - Se mudar o nome → label do link é atualizado
   - Se mudar o slug → URL do link é atualizado
   - Se o cliente nunca foi na navegação, cria um novo link

### Fluxo para Especialidades:

1. **Criar uma nova Especialidade**
   - Ao salvar, automaticamente:
     - Um novo **Sublink** é criado no primeiro Link da Navegação
     - O label é o nome da especialidade
     - O URL é preenchido com `/especialidade/{slug}`
     - A relação com a especialidade é estabelecida

2. **Atualizar uma Especialidade**
   - Se mudar o nome → label do sublink é atualizado
   - Se mudar o slug → URL do sublink é atualizado

## Campos adicionados em Navigation

### Link
Adicionados dois novos campos de relação (opcionais):
- **cliente** (oneToOne) - se preenchido, sincroniza automaticamente
- **pessoa** (oneToOne) - se preenchido, sincroniza automaticamente

### Sublink
Já tinha:
- **especialidade** (oneToOne) - se preenchido, sincroniza automaticamente

## Como usar

### Novo processo (SEM o trabalho manual):

```
1. Ir em Clientes
2. Criar novo cliente → slug é auto-gerado
3. Salvar
4. Pronto! ✅ Link já foi criado em Navegação com o slug correto
```

### Se precisar editar manualmente (não é mais necessário):

Se por algum motivo quiser editar o URL manualmente, pode:
1. Ir em Navegação
2. Editar o Link
3. Mudar o URL
4. A sincronização não vai sobrescrever campos que você editou manualmente (contanto que a relação esteja preenchida)

## Sincronização bidirecional

- **Cliente → Navegação**: automática via lifecycle hook
- **Navegação → Cliente**: manual (se quiser manter bidirecional, seria outro desenvolvimento)

## Dados técnicos

Implementado com:
- **Lifecycle hooks** em Cliente, Pessoa e Especialidade
- **Serviço customizado** `sync-navigation.js` que gerencia a sincronização
- **Banco de dados** atualizado via Strapi queryBuilder

Arquivos criados:
```
src/
  ├── api/
  │   ├── cliente/content-types/cliente/lifecycles.js
  │   ├── pessoa/content-types/pessoa/lifecycles.js
  │   └── especialidade/content-types/especialidade/lifecycles.js
  ├── components/navigation/
  │   └── link.json (adicionados campos cliente e pessoa)
  └── services/
      └── sync-navigation.js

dist/ (mesma estrutura)
```

