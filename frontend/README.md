# CHAMA Frontend

Frontend da plataforma CHAMA de gestão comercial inteligente.

## Stack

- **React 19** com TypeScript
- **Vite** para build e dev server
- **TailwindCSS** para estilização
- **React Router DOM** para navegação
- **Context API** para estado global

## Estrutura do Projeto

```text
src/
├── context/          # Contextos React (Auth)
├── layouts/          # Layouts de páginas (Dashboard, ProtectedRoute)
├── pages/            # Páginas da aplicação
├── services/         # Serviços de API (auth, catalog, orders, payments)
├── types/            # Tipos TypeScript compartilhados
└── utils/            # Utilitários e helpers
```

## Instalação

```bash
npm install
```

## Desenvolvimento

```bash
npm run dev
```

O servidor de desenvolvimento estará disponível em `http://localhost:5173`.

## Build

```bash
npm run build
```

## Preview

```bash
npm run preview
```

## Variáveis de Ambiente

Copie `.env.example` para `.env` e ajuste conforme necessário:

```env
VITE_API_URL=http://localhost:3000
```

## Integração com Backend

O frontend segue rigorosamente os princípios do handoff técnico:

- **Backend é a fonte da verdade** para estoque, preços e pagamentos
- **Nunca calcula margens ou confirma pagamentos** localmente
- **Respeita estados oficiais** retornados pela API
- **Trata erros de concorrência** (409 Conflict)
- **Implementa retry seguro** com idempotência

### Serviços Implementados

- `auth.service.ts` - Autenticação com refresh token
- `api.client.ts` - Cliente HTTP com tratamento de erros
- `catalog.service.ts` - Categorias, seções, marcas, produtos, lotes, promoções

### Próximos Serviços

- `orders.service.ts` - Pedidos e reservas
- `payments.service.ts` - PaymentIntents e webhooks
- `stock.service.ts` - Movimentações de estoque
- `analytics.service.ts` - Dashboard e métricas

## Regras de Ouro

1. Frontend = Experiência | Backend = Verdade
2. Nunca confiar em dados calculados no cliente
3. Sempre tratar loading, empty e error states
4. Respeitar RBAC visual (backend valida sempre)
5. Não expor segredos ou tokens no código

## Checklist de Integração

Antes de integrar qualquer tela:

- [ ] Endpoint real disponível
- [ ] Contrato confirmado (Swagger/OpenAPI)
- [ ] Estados de loading implementados
- [ ] Estados vazios tratados
- [ ] Tratamento de erro com códigos
- [ ] Permissões visuais aplicadas
- [ ] Backend continua sendo autoridade
- [ ] Sem segredo exposto
- [ ] Suporte a retry seguro
- [ ] Suporte a 409/conflitos
- [ ] Responsividade testada
- [ ] Acessibilidade básica

## Licença

Proprietário - CHAMA Platform
