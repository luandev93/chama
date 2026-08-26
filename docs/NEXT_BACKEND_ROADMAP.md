# CHAMA — Próximos blocos do backend

## Núcleo comercial já estruturado
- Multi-tenant, autenticação, sessões e RBAC.
- Categorias, seções e política de precificação.
- Estoque físico/reservado e movimentações transacionais.
- Pedidos, reservas, confirmação e cancelamento.

## Próxima sequência obrigatória
1. Pagamentos: intenção, pagamento, provider adapter, idempotência e webhook assinado.
2. PDV: abertura de venda, pagamento, fechamento e comprovante não fiscal.
3. Entrega: endereço, zonas, taxa, status e atribuição.
4. Ingestão: documento, OCR, revisão e conciliação.
5. CHAMA ZAP: canal, conversa, carrinho e tools sobre o núcleo comercial.
6. Hardening: testes, CI, rate limit, observabilidade e backups.

## Regra arquitetural
WhatsApp, PDV e web nunca alteram estoque diretamente. Todos passam pelo mesmo domínio de pedidos, reservas, pagamentos e confirmação.

## Regra de pagamento
Nenhum webhook externo confirma venda diretamente sem:
- verificação de assinatura;
- idempotência por evento;
- validação de valor e moeda;
- correlação com a intenção de pagamento;
- transação atômica para mudança de estado.
