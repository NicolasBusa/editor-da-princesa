# Validação · cinco câmeras

Atualização de 9 de setembro de 2026: versão 4 adiciona senha e presets. Os 133 testes de processamento continuam passando. Foram adicionadas cinco suítes Node para validação das receitas, autenticação/CSRF/CRUD/persistência e adaptador REST do Supabase com transporte simulado. A integração de navegador verifica igualdade de pixels, desfazer/refazer, vários presets, renomear, atualizar, excluir, persistência e recuperação de sessão sem perder a foto. Layout sem transbordamento em 320, 375, 393, 430, 768 e 1360 px. Veja [SUPABASE.md](SUPABASE.md) para configuração e limites.

Atualização desta entrega: o projeto Supabase real `aizoldeswdwpebwaozpy` foi criado e conectado. A migration foi aplicada e alinhada com o histórico remoto; RLS e grants foram consultados; o CRUD real passou; os Advisors de segurança e performance retornaram “No issues found”; as linhas temporárias foram removidas. Foram importados 51 adesivos em Animais, Entretenimento e Música, totalizando 67. Dois testes Node conferem os arquivos, miniaturas e IDs. A integração de navegador decodificou todas as imagens, conferiu as três contagens, a proporção de um adesivo horizontal, o histórico e o layout de 393 px sem exceções.

Execução em 8 de setembro de 2026, Windows, Node.js 24.14.1 e Chromium com worker. Esta versão substitui o relatório da biblioteca anterior de filtros.

## Testes automatizados

- **94 verificações** em tests/processing.test.mjs: controles manuais de luz, cor, detalhes, efeitos analógicos, oito faixas HSL, curvas e gradação; restauração da identidade com presença zero em cada câmera; estabilidade, alfa e receita intacta.
- **39 testes** em tests/cameras.test.mjs: cinco configurações exatas, diferenças sem grão/borda/vazamentos, óptica presente em cada câmera, determinismo, nova seed, curva CLASSIC monotônica com compressão progressiva de realces e pele de teste próxima à origem, flash com queda espacial/distância e contraste localizado, flash ignorado nas outras câmeras, exposição LOMO limitada, suavidade radial DREAM em padrão de detalhes, frequência dos vazamentos, química e exposição INSTANT, formato e limites de exportação.
- **45 verificações de integração** em tests/browser/cameras-verify.mjs. [Resultados completos](tests/browser/camera-results.json).

Execute npm test para os 133 testes de processamento. Para integração, use Node.js 22+ com WebSocket nativo, npm start e um Chromium de teste com perfil exclusivo e porta de depuração local 9335; execute node tests/browser/cameras-verify.mjs. O script controla a primeira aba do perfil de teste, altera sua edição e favoritos, e grava capturas e downloads na própria pasta. Não use seu perfil pessoal.

Os cinco PNGs originais foram comparados pixel a pixel com a prévia na mesma dimensão. Resultados registrados:

| Câmera | PNG exportado | Resultado |
| --- | --- | --- |
| CLASSIC 38 | 600 × 400 | Idêntico à prévia |
| FLASH 800 | 600 × 400 | Idêntico à prévia |
| LOMO 32 | 600 × 400 | Idêntico à prévia |
| DREAM 120 | 400 × 400 | Idêntico à prévia |
| INSTANT 160 | 446 × 542, incluindo papel | Idêntico à prévia |

Também houve comparação exata de uma composição de 260 × 260 px com recorte, rotação, alinhamento, câmera, adesivo e moldura decorativa; download real de PNG; e exportação JPEG de 180 × 180 px na qualidade escolhida.

A integração confirmou troca de câmera preservando ajustes, presença zero, posição/distância de flash, desfazer/refazer, nova captura reversível pixel a pixel, controles de grão/borda, comparação antes/depois com o mesmo formato, zoom 100%, recorte confirmado/cancelado, adesivos, restauração e favoritos após recarregar.

## Interface e rota de desenvolvimento

Sem transbordamento horizontal nas larguras 320, 375, 393, 430, 768 e 1360 px. Após o acabamento da faixa horizontal de câmeras no celular, as seis larguras foram verificadas novamente. Captura móvel em 393 × 852 px com densidade emulada 2×; a integração também exercitou densidade 3×. Nenhuma exceção não tratada no editor ou na comparação.

Em desenvolvimento, /dev/profile-comparison renderizou as cinco câmeras e desligou grão, borda e vazamentos juntos. Em NODE_ENV=production, o editor retornou HTTP 200 e os caminhos /dev/profile-comparison, /dev/profile-comparison/index.html e /DEV/profile-comparison/index.html retornaram 404. Hospedagem estática deve excluir a pasta dev/.

## Revisão visual

Foram produzidos 12 painéis a partir da composição sintética de tests/fixtures/synthetic-scenes.png: três retratos com tons de pele diferentes, paisagem, rua noturna e natureza-morta de alto contraste, cada cena com a resposta completa e com grão/borda/vazamentos desligados. As cinco câmeras usam presença 100% e seed 41731. Na cena noturna, o flash está ligado apenas no FLASH 800. A origem aparece ao lado para comparação.

Nos painéis, CLASSIC manteve a proposta mais natural; FLASH separou mais os tons e apresentou queda de luz quando ligado; LOMO aprofundou o contraste e os cantos, com cor seletiva; DREAM mostrou janela quadrada e perda progressiva de definição; INSTANT manteve resposta de tons e cor própria sem o papel. Na natureza-morta, os tons claros conservaram textura. Não foi necessário aumentar defeitos para distinguir os perfis. O flash foi ajustado após inspeção para não acrescentar um piso branco em regiões pretas, evitando uma névoa radial.

Os painéis e as capturas acompanham a entrega em validacao-cameras/, com índice HTML. São inspeções perceptuais em cenas sintéticas, não uma medição de correspondência com filme real. A origem e o prompt do material sintético estão em [tests/fixtures/README.md](tests/fixtures/README.md); nenhuma imagem nova de terceiros foi baixada nesta etapa.

## Critérios e pendências

Concluídos: cinco perfis exclusivos na seção Câmeras; um motor compartilhado; exposição/tom/cor/lente/grão próprios; flash específico; DREAM processado em 1:1 e sem blur uniforme; INSTANT independente da borda; resultados distintos sem grão/papel/vazamentos; comparação em modo de desenvolvimento; cinco pastas de referência e manifestos com 15 cenários cada.

**Calibração com fotografias reais permanece pendente**, pois os conjuntos licenciados ainda serão fornecidos. Nenhum perfil afirma equivalência medida com equipamento real. O flash usa distância e máscara aproximadas, sem profundidade real. A detecção de pouca luz é uma heurística de luminosidade; não conhece a iluminação ou o ISO da captura original.

Limites de execução: entrada 35 MB, exportação 24 MP/8192 px incluindo papel, memória e velocidade dependentes do aparelho. A prévia é menor e pode integrar grão fino de forma diferente da resolução final. Saída sRGB de 8 bits, sem RAW/HDR nem metadados EXIF/ICC originais. HEIC e compartilhamento dependem do navegador. Sem teste em Safari num iPhone físico. A sessão não persiste após recarregar.

