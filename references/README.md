# Referências para calibração

As cinco pastas estão preparadas e vazias de fotografias. Os manifestos têm 15 tipos de cena e campos para câmera, lente, filme, ISO, exposição, flash, revelação, scanner e pós-processamento, além da licença/autorização e procedência.

Use apenas imagens devidamente licenciadas ou fornecidas pelo proprietário. Nenhuma imagem de terceiros foi baixada. Compare conjuntos com revelação e digitalização conhecidas: a mesma câmera não implica o mesmo resultado de laboratório. Registre também a orientação e o recorte. Não remova marcas de autoria.

| Perfil | Referência de engenharia fornecida | Prioridades |
| --- | --- | --- |
| CLASSIC 38 | Compacta T2, Sonnar 38 mm f/2.8; negativo Portra 400 | Pele, rolloff, tons, grão fino, lente neutra |
| FLASH 800 | FunSaver, negativo 800, flash manual | Queda do flash, noite, grão, bordas, cor |
| LOMO 32 | LC-A / Minitar-1 32 mm | Vinheta, contraste, saturação seletiva, cantos |
| DREAM 120 | 120N, lente plástica 60 mm f/8, 6×6 | Suavidade radial, formato, microcontraste, vinheta |
| INSTANT 160 | SX-70, filme colorido aproximadamente ASA 160 | Tons instantâneos, exposição, separação de cor, química, folha |

Os nomes comerciais acima são apenas referências de engenharia, fora da interface. Os parâmetros do motor foram escolhidos como aproximações iniciais. Não foram medidos nem ajustados a pares de fotografias reais.

Documentação primária consultada em 8 de setembro de 2026, apenas como texto:

- A [ficha da Kodak sobre FunSaver](https://business.kodakmoments.com/product/kodak-fun-saver-single-use-camera) informa filme 800 e alcance de flash de aproximadamente 1,2–3,5 m. Esse intervalo delimita o controle de distância; não fornece profundidade para uma imagem importada.
- A [documentação Kodak Portra 400 E-4050](https://business.kodakmoments.com/sites/default/files/files/resources/portra400-techpub-e4050.pdf) é referência para resposta tonal e características do negativo. Não extraímos uma LUT nem afirmamos reproduzir suas curvas sensitométricas.
- O [guia oficial de uso da SX-70](https://support.polaroid.com/hc/en-us/articles/360015377860-How-to-use-a-folding-SX-70-camera) informa ISO 160 e a necessidade de mais luz que filmes de maior sensibilidade.
- A [ficha oficial do formato SX-70](https://www.polaroid.com/en_us/products/bw-sx70-instant-film?quantity=1) informa folha 107 × 88 mm e área 79 × 77 mm. No motor, adotamos altura/largura de 107/88 para a folha e 79/77 para a imagem; a margem superior de 5,5 mm é uma escolha geométrica para produzir margem inferior maior. Essa ficha é usada apenas para o formato físico.

Os dados de lente T2/LC-A/120N vieram da especificação do projeto; não são uma calibração ótica. As fotos sintéticas em tests/fixtures/ são uma ferramenta de desenvolvimento e não pertencem aos conjuntos reais acima.
