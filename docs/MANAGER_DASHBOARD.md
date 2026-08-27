# CHAMA — Painel do Gestor / Gerente

## Objetivo

O painel de gestão é o centro de comando da loja. Não é uma tela de números genéricos: consolida operação, caixa, estoque, pedidos, entregas, clientes, equipe e alertas em tempo real, sempre respeitando tenant, store e RBAC.

## Visão executiva

### Hoje
- faturamento bruto e líquido;
- número de vendas e ticket médio;
- pedidos por canal: PDV, WhatsApp, web e manual;
- recebimentos por meio de pagamento;
- pedidos aguardando pagamento;
- entregas em andamento;
- margem bruta estimada;
- comparação com período anterior.

### Operação agora
- pedidos novos;
- pedidos aguardando pagamento;
- preparando;
- prontos para retirada;
- em rota;
- atrasados;
- alertas críticos.

## Estoque

- valor do estoque;
- quantidade e cobertura;
- ruptura;
- estoque abaixo do mínimo;
- excesso/parado;
- vencidos;
- próximos do vencimento D-7/D-30 configuráveis;
- divergências de inventário;
- perdas e ajustes;
- curva ABC;
- giro;
- produtos mais e menos vendidos;
- sugestão de reposição baseada em mínimo/máximo e histórico.

## Financeiro e caixa

- vendas por período;
- pagamentos por meio;
- PIX, dinheiro, cartão, voucher e link;
- pagamentos pendentes/falhos/estornados;
- sangrias e suprimentos;
- abertura e fechamento de caixa;
- divergência entre esperado e contado;
- fiado/caderneta e limites;
- contas a receber operacionais;
- margem por produto, seção e categoria.

## Pedidos e clientes

- pedidos por status;
- origem e conversão por canal;
- taxa de cancelamento;
- tempo médio de preparação;
- clientes recorrentes;
- clientes novos;
- ticket médio;
- produtos frequentemente comprados juntos;
- clientes inativos;
- observações de atendimento permitidas pela política de privacidade.

## Entregas

- kanban operacional;
- pedidos aguardando preparação;
- prontos;
- em rota;
- entregues;
- atrasados;
- taxa média por zona;
- tempo estimado x real;
- desempenho operacional de entregadores;
- falhas de entrega e motivo;
- prova de entrega quando habilitada.

## CHAMA ZAP

- conversas ativas;
- fila de handoff;
- tempo de primeira resposta;
- conversão conversa -> pedido;
- pedidos abandonados;
- fallback;
- temas fora do escopo;
- opt-outs;
- qualidade das respostas;
- alertas de integração.

## Pessoas e segurança

- usuários ativos;
- últimos acessos;
- tentativas suspeitas;
- MFA quando exigido;
- permissões por papel;
- ações administrativas recentes;
- trilha de auditoria;
- sessões revogadas.

## Administração

O dono tem acesso a configuração completa da loja, plano, canais, integrações, políticas de preço, estoque, usuários e segurança. O gerente possui visão ampla operacional, mas ações financeiras e administrativas sensíveis dependem de permissão explícita.

## UX

O painel deve oferecer filtros por período e loja, comparação temporal, drill-down do card para a lista que originou o indicador, estados vazios úteis e alertas priorizados. Nenhum card pode exibir dados de outro tenant.

## Segurança

- métricas sempre filtradas por tenant/store autorizados;
- agregações financeiras calculadas no servidor;
- nenhuma permissão baseada apenas em rota de frontend;
- exportações auditadas;
- dados sensíveis minimizados;
- ações destrutivas protegidas por autorização e confirmação;
- cache segregado por tenant/store;
- queries agregadas com limites e índices adequados.
