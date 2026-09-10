# Validação · onze câmeras DAZZ e PWA

Atualização de 10 de setembro de 2026. As onze câmeras do projeto DAZZ Retro Camera foram adaptadas para pós-processamento no Editor da Princesa: B&W Classic, CCD R, CPM35, D Classic, FISHEYE, FQS, FXN-R, GRD R, INST C, INST SQC e U300. A implementação traduz as configurações originais de exposição, tom, cor, grão, lente e formato para o motor de imagem já usado pelo editor.

O site também foi convertido em um PWA instalável. O manifesto, os ícones derivados da foto da Isadora, o modo independente, a orientação vertical, o guia de instalação para iPhone, o ciclo de atualização e a página offline foram validados em uma janela Chromium de 393 × 852 px com densidade 3×. O service worker assumiu o escopo raiz e entregou a tela offline quando a rede foi interrompida.

Os cinco perfis da versão anterior continuam disponíveis internamente para abrir presets salvos no Supabase, mas deixaram de aparecer na galeria principal. A origem MIT e os termos da dependência estão registrados em [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Testes automatizados

- **100 verificações** em `tests/processing.test.mjs`: luz, cor, detalhes, efeitos analógicos, HSL, curvas, gradação, intensidade, estabilidade e alfa.
- **66 verificações** em `tests/cameras.test.mjs`: catálogo exato das onze câmeras, procedência, resposta própria, determinismo, monocromia, distorção fisheye, papel instantâneo e compatibilidade com os perfis antigos.
- **10 testes** de modelo, PWA, persistência, servidor e adesivos confirmam o manifesto, os tamanhos dos ícones, as rotas públicas, a autenticação e presets com câmeras atuais ou legadas.
- A integração real no Chromium valida cada câmera, exportação idêntica à prévia, Antes/depois, intensidade, nova captura, desfazer/refazer, grão, formatos, papel instantâneo, recorte, adesivos, molduras, PNG/JPEG e favoritos.

Resultados das exportações comparadas pixel a pixel com a prévia:

| Câmera | PNG exportado | Resultado |
| --- | --- | --- |
| B&W Classic | 600 × 400 | Idêntico à prévia |
| CCD R | 533 × 400 | Idêntico à prévia |
| CPM35 | 600 × 400 | Idêntico à prévia |
| D Classic | 533 × 400 | Idêntico à prévia |
| FISHEYE | 400 × 400 | Idêntico à prévia |
| FQS | 600 × 400 | Idêntico à prévia |
| FXN-R | 600 × 400 | Idêntico à prévia |
| GRD R | 533 × 400 | Idêntico à prévia |
| INST C | 343 × 460, incluindo papel | Idêntico à prévia |
| INST SQC | 457 × 556, incluindo papel | Idêntico à prévia |
| U300 | 600 × 400 | Idêntico à prévia |

## Interface móvel

A seção Câmeras abre com a faixa horizontal das onze opções imediatamente visível. Cada cartão usa a miniatura correspondente do projeto DAZZ, aceita favoritos e mantém os ajustes manuais durante a troca. A coleção de presets pessoais aparece depois dos controles de câmera.

O editor foi verificado sem transbordamento horizontal nas larguras 320, 375, 393, 430, 768 e 1360 px. As alterações dos controles gerais continuam instantâneas, enquanto a animação de revelação permanece restrita à aplicação de uma câmera ou preset. A integração também confirma gestos de texto, espelhamento de adesivos e fidelidade da exportação.

## Escopo da adaptação

Esta é uma implementação de pós-processamento: ela aplica as características visuais das receitas DAZZ a fotos já carregadas. Recursos exclusivos de captura em tempo real, sensores físicos e LUTs que não fazem parte dos dados disponíveis não são simulados como equivalência de hardware.

A saída é sRGB de 8 bits, sem RAW/HDR nem preservação dos metadados EXIF/ICC originais. O limite de entrada é 35 MB e o de exportação é 24 MP/8192 px, incluindo o papel instantâneo. HEIC e compartilhamento dependem do navegador. A interface foi validada em Chromium responsivo; ainda não houve teste em um iPhone físico.
