# CHAMA — Painel do Gestor e Inteligência Comercial

## Objetivo

O painel do gestor é o centro operacional e analítico da loja. Deve responder rapidamente não apenas quanto foi vendido, mas quanto foi ganho, onde existe risco operacional e quais produtos, marcas e categorias sustentam o negócio.

## Indicadores financeiros

- faturamento bruto;
- descontos;
- devoluções e estornos;
- custo das mercadorias vendidas (CMV);
- lucro bruto;
- despesas operacionais quando cadastradas;
- lucro líquido;
- margem bruta e líquida;
- ticket médio;
- comparativo com período anterior.

Regra: faturamento nunca deve ser apresentado como lucro.

## Filtros globais

- período;
- loja;
- categoria;
- seção;
- marca;
- produto;
- canal de venda;
- origem do pedido;
- forma de pagamento.

## Hierarquia comercial

Loja -> Categoria -> Seção -> Marca -> Produto.

A análise deve permitir subir ou descer na hierarquia sem perder o período e os filtros globais.

## Métricas por marca

- unidades vendidas;
- faturamento;
- lucro bruto;
- margem;
- participação nas vendas;
- participação no lucro;
- giro;
- estoque atual;
- risco de ruptura;
- ranking de produtos da marca.

## Estoque e reposição

Cada produto pode possuir configuração efetiva herdada ou própria para:

- estoque mínimo;
- estoque máximo;
- ponto de pedido;
- controle ativo de reposição.

Alertas usam estoque disponível, não apenas estoque físico.

Estados:

- normal;
- atenção: disponível <= ponto de pedido;
- crítico: disponível <= mínimo;
- ruptura: disponível = 0.

A sugestão futura de compra deve considerar consumo, cobertura, estoque reservado, tempo de reposição, histórico e sazonalidade.

## Visualizações recomendadas

- linha: evolução de faturamento e lucro;
- barras horizontais: ranking de marcas, categorias e produtos;
- barras ordenadas: margem por seção/categoria;
- donut: composição percentual de canais ou categorias;
- linha/área: fluxo de caixa;
- matriz volume x lucro: campeões, estrelas, trabalhadores e parados.

Nenhum gráfico deve existir apenas para decoração.

## Segurança

Todos os indicadores são calculados no backend com isolamento obrigatório de tenant e loja. Filtros de escopo são derivados das permissões do usuário autenticado. O frontend não define acesso a dados nem agrega números de fontes sem autorização.
