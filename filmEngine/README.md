# Motor fotográfico compartilhado

`cameraProfiles/*.js` contém apenas registros imutáveis de parâmetros. `CameraProfile.d.ts` documenta o contrato. Mantemos JavaScript ES Modules para executar diretamente no navegador, sem exigir TypeScript ou compilação. Nenhum perfil contém uma LUT, imagem de sobreposição ou implementação paralela do processamento.

## Ordem

1. `photo-engine.js` aplica rotação, espelhamento, alinhamento e região de interesse. `format/` inscreve a janela do filme nessa região. A imagem já chega ao motor com o formato correto.
2. `processing.js` aplica os ajustes manuais de luz/cor/curvas. Eles continuam disponíveis independentemente da câmera.
3. `lens/` amostra a origem com interpolação bilinear ponderada por alfa, distorção radial pequena, separação de canais e uma função de espalhamento de cinco amostras. O raio varia continuamente do centro aos cantos. A queda de transmissão opera em luz linear; não desenha um círculo preto sobre a imagem. O microcontraste atua localmente. A distância focal registrada descreve a referência; não reconstrói perspectiva nem detalhes perdidos na foto original.
4. `exposure/` analisa uma amostra da luminosidade e aplica ganho linear. Bias, variação limitada por seed, perda em pouca luz e latitude são específicos de cada câmera. A classificação de pouca luz é uma heurística baseada nos pixels e pode confundir assunto escuro com iluminação fraca.
5. `flash/` existe apenas quando o perfil fornece seus parâmetros. Mistura exposição ambiente com energia proporcional ao inverso do quadrado de uma distância aproximada. A máscara é alongada, ajustável, modulada por cor e luminância. A estimativa de refletância conserva cor e deixa pixels pretos pretos. Não é segmentação, relighting por IA nem um mapa real de profundidade.
6. `bloom/` extrai fontes intensas antes da compressão de tons; `halation/` usa a dispersão fora dessas fontes. Os raios acompanham a dimensão da imagem. O CLASSIC usa magnitudes pequenas.
7. `tone/` calcula contraste analítico, toe e shoulder exponencial; `color/` faz separação de cor, saturação por matiz/luminosidade/condição de exposição, proteção aproximada de pele e ajustes seletivos em realces e sombras. As operações são em ponto flutuante. As LUTs restantes em `processing.js` pertencem às curvas manuais do editor, não definem câmeras.
8. `grain/` gera ruído multiescala dependente de luminância para negativos. O instantâneo utiliza variações de densidade de baixa frequência, desenvolvimento de bordas e superfície fina. Seeds tornam a realização estável. DREAM pode gerar vazamento procedural: chance de 12%, com lado, posição, largura, contorno, intensidade e temperatura variáveis. A maioria das capturas não tem vazamento.
9. `output/` comprime cromaticidade fora do gamut em direção à luminância antes da quantização, mistura a presença da câmera e conserva alfa. Em presença zero o motor retorna a entrada sem alterações.
10. Os detalhes e efeitos analógicos manuais continuam como ajustes posteriores. A saída monta o papel externo do INSTANT, depois molduras decorativas, adesivos e legenda.

## Formato e cache

O recorte acontece antes da lente. A função óptica sempre recebe as dimensões da área do filme, sem contar o papel. O INSTANT usa a mesma área de imagem ao ligar/desligar a borda. O papel é desenhado proceduralmente na resolução de saída, com margem inferior maior.

Miniatura, prévia, comparação e exportação usam `renderEditor`/`renderSize` e o mesmo worker. A chave de cache inclui câmera, presença, textura, opções, flash, seed, ajustes e geometria. A decoração não precisa recalcular a fotografia. A seed pertence à receita e ao histórico; trocar câmera ou ajustar brilho não gera uma nova realização.

## Limites do modelo

O motor é uma aproximação sobre uma imagem sRGB já capturada. Não recupera dados de sensor/negativo, não altera a perspectiva para uma lente física e não simula química espectral completa. Não foi calibrado contra os conjuntos reais, que estão aguardando fotografias autorizadas em `references/`. A equivalência entre saída e prévia foi testada na mesma resolução; em dimensões diferentes, reamostragem e integração de grão fino podem diferir.

O processamento roda em worker quando disponível. Os buffers temporários crescem com a quantidade de pixels; o máximo de 24 MP não garante memória suficiente em todos os aparelhos. O editor informa falha de alocação/exportação e oferece dimensões menores. Não há benchmark de Safari em iPhone físico.
