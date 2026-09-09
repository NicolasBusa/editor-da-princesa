# Navegação e composição 4.1

Execute `node tests/browser/mobile-editor-verify.mjs` com o servidor na porta 4173 e Chromium de teste com CDP na porta 9335.

Verificado em 9 de setembro de 2026:

- Layouts de 320, 393, 430, 700, 852 e 1360 px sem overflow horizontal da página; barra inferior acessível nos tamanhos de celular.
- Foto de exemplo em 393 × 852: cerca de 578 px de altura com ferramentas recolhidas e 362 px com os ajustes abertos.
- Todos os oito grupos de ajustes continuam acessíveis na navegação horizontal.
- Arraste de exposição: 7–8 atualizações no primeiro segundo em Chromium desktop com viewport mobile; primeiro frame em 110–170 ms. Refinamento completo após o gesto. Esses valores não medem desempenho num iPhone físico.
- Indicador Revelando somente na aplicação de câmera/preset; ajustes sem indicador.
- Espelhamento horizontal confirmado com uma imagem assimétrica; desfazer/refazer pela interface.
- Textos com múltiplas linhas, estilo, cor, arraste, duplicação, remoção e desfazer.
- Renderização PNG exportada coincide pixel a pixel com a prévia na mesma resolução, com texto rotacionado e moldura.
- Retratinho sem chamada de desenho de texto fixo.
- Importação de JPEG 1200 × 1800 e exportação pela interface em JPEG 720 × 1080 concluídas.
- `npm test`: 94 verificações de processamento, 39 de câmeras e 8 testes de presets/servidor/adesivos passaram.

Não houve teste em Safari num iPhone físico.
