# CHAMA — Estoque por Lotes, Validade e Entrada Inteligente

## Decisão de domínio

Lote e validade pertencem ao estoque recebido, não ao produto canônico. O mesmo produto pode possuir múltiplos lotes com quantidades e vencimentos diferentes.

## Fluxo de entrada

1. OCR extrai itens, fornecedor, custo e campos detectáveis.
2. Cada campo recebe confiança e pode ser revisado.
3. Lote e validade são aceitos quando presentes no documento.
4. Quando não estiverem no cupom, o operador informa manualmente ou faz leitura complementar da embalagem.
5. Nenhuma validade é inventada pelo OCR.
6. A entrada cria lote(s), atualiza saldo e preserva a origem documental.

## Validação

- validade deve ser posterior à data de entrada quando informada;
- lote pode ser obrigatório por configuração de categoria/produto;
- itens vencidos não podem ser vendidos;
- alertas devem ser configuráveis, com padrões D-30 e D-7;
- lote deve permanecer rastreável nas saídas e perdas.

## FEFO

A saída automática deve priorizar o lote com menor validade disponível. O algoritmo deve ignorar lotes expirados, bloqueados, zerados ou pertencentes a outra loja/tenant.

## Código de barras

O CHAMA deve aceitar GTIN/EAN via:

- leitor USB/Bluetooth em modo teclado;
- câmera do dispositivo;
- digitação manual;
- SKU interno.

A leitura resolve o produto no catálogo e, no PDV, adiciona o item sem exigir integração especial com o leitor físico.

## Segurança e integridade

- toda entrada é transacional;
- quantidade nunca é atualizada sem movimento correspondente;
- tenant/store são derivados do contexto autenticado;
- OCR nunca confirma estoque sozinho;
- campos de baixa confiança exigem revisão;
- eventos externos devem ser idempotentes;
- saída por FEFO deve ser bloqueada transacionalmente para evitar dupla baixa concorrente.
