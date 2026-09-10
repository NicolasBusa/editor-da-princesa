# Editor da Princesa · versão 5.1

No celular, a foto ocupa a área principal e a barra inferior rola horizontalmente. Toque em uma ferramenta para abrir seus controles; em Ajustes, deslize a segunda barra para acessar Luz, Cor, HSL, Curvas, Gradação, Detalhes, Efeitos e Recorte. Toque novamente na ferramenta ou em **Ver a foto** para recolher o painel. Importação, histórico e exportação ficam no topo; comparação e zoom continuam abaixo da foto.

Adesivos podem ser espelhados pelo botão ↔ do elemento selecionado. A ferramenta **Texto** adiciona várias caixas com fonte, cor, negrito, itálico, sombra e alinhamento; arraste, gire, redimensione, duplique ou exclua como um adesivo. Textos participam do histórico e da exportação, mas não dos presets. A moldura Retratinho tem a borda inferior sem frase fixa.

Durante o arraste dos ajustes, a prévia usa uma resolução temporária menor e atualiza continuamente; ao terminar o gesto, refina a resolução. Um worker separado permite responder ao próximo gesto enquanto a prévia completa termina. O motor e os valores dos controles continuam os mesmos; a exportação usa a resolução escolhida. **Revelando** aparece somente ao aplicar uma câmera ou preset salvo.

Onze câmeras do projeto DAZZ Retro Camera foram adaptadas para pós-processamento no editor em amarelo, nuvens e coelhinhos. O processamento acontece no navegador, sem upload das fotos a um servidor. O app também tem entrada pela senha **1309**, coleção de presets conectada ao Supabase e 67 adesivos em sete categorias. Veja [SUPABASE.md](SUPABASE.md) para a configuração da nuvem.

## Aplicativo instalável

O site é um PWA instalável com ícone próprio criado a partir da foto da Isadora. No iPhone, abra o site, toque em **Compartilhar**, escolha **Adicionar à Tela de Início**, ative **Abrir como App** e confirme em **Adicionar**. O botão **Instalar aplicativo** no rodapé também abre esse guia; navegadores que oferecem instalação direta usam o mesmo botão.

O manifesto define o modo independente, orientação vertical, cores e ícones de 192/512 px. O service worker guarda a tela de acesso e os recursos públicos necessários para mostrar uma página offline, além de reaproveitar recursos do editor já carregados. Por segurança, abrir uma nova sessão do editor continua exigindo conexão e autenticação. Quando uma nova versão estiver pronta, o app oferece **Atualizar** sem interromper silenciosamente uma edição aberta.

Para verificar a experiência no navegador, inicie um Chromium de teste com depuração remota na porta 9335 e execute `node tests/browser/pwa-verify.mjs`. O teste simula um iPhone, registra o service worker, abre o guia de instalação, captura `tests/browser/pwa-install-mobile.png` e interrompe a rede para validar a página offline.

## Abrir

Requer Node.js 22 ou superior, sem dependências de instalação:


Execute **npm start** e abra [o editor](http://127.0.0.1:4173/). Use HTTP, não abra index.html diretamente pelo explorador de arquivos. Para os testes, execute **npm test**.

## As onze câmeras

| Câmera | Resposta principal | Formato |
| --- | --- | --- |
| B&W CLASSIC | Mistura monocromática, contraste firme e grão forte | 3:2 / 2:3 |
| CCD R | Sombras frias, ruído digital e aberração cromática | 4:3 / 3:4 |
| CPM35 | Negativo quente, dourados suaves e pele protegida | 3:2 / 2:3 |
| D CLASSIC | Digital equilibrado, limpo e definido | 4:3 / 3:4 |
| FISHEYE | Olho de peixe, vinheta forte e formato quadrado | 1:1 |
| FQS | Filme Fuji frio com verdes e cianos suaves | 3:2 / 2:3 |
| FXN-R | Negativo frio, sombras ciano e boa definição | 3:2 / 2:3 |
| GRD R | Compacta de rua, baixa saturação e nitidez alta | 4:3 / 3:4 |
| INST C | Papel instantâneo quente com imagem 3:4 | Instantâneo 3:4 |
| INST SQC | Papel instantâneo quente e imagem quadrada | Instantâneo 1:1 |
| U300 | Filme quente, dourados vivos e grão fino | 3:2 / 2:3 |

Esses são os onze perfis principais exibidos na galeria. Use Antes/depois ou Presença da câmera em zero para conferir a imagem sem tratamento, mantendo o formato e os ajustes manuais. As cinco câmeras da versão anterior continuam reconhecidas internamente para que presets antigos permaneçam utilizáveis.

Presença mistura a contribuição fotográfica completa. Textura controla grão, microtextura química e vazamentos; lente, tom e cor permanecem independentes. Nova captura troca a seed: brilho, recorte e outros ajustes não sorteiam uma textura nova. Importar uma foto também cria uma seed nova; desfazer restaura a seed anterior. Os corações guardam câmeras favoritas no navegador.

## Edição, composição e exportação

Permanecem os ajustes de luz, cor, HSL em oito faixas, curvas geral/RGB, gradação de sombras/meios-tons/realces, detalhes e efeitos analógicos manuais. Há restauração individual, por grupo e geral; histórico de 50 alterações; zoom 100%; divisor antes/depois; molduras decorativas, legenda, 67 adesivos em sete categorias e cartinha de aniversário.

O recorte respeita o formato da câmera. Você escolhe e move a região dentro desse formato. Trocar a câmera preserva o recorte como região de interesse, centralizando nela a nova área de imagem; o original continua intacto. Rotação e alinhamento ocorrem antes da óptica, e o alinhamento aproxima a imagem para cobrir cantos vazios. A borda do INSTANT é adicionada por fora da área revelada, sem esticar ou encobrir a foto. Adesivos e molduras decorativas são aplicados sobre a composição final.

JPEG e PNG podem ser exportados em tamanho original após recorte/formato, máxima dimensão disponível, 2048/1080 px ou dimensões personalizadas. JPEG permite qualidade de 40–100% e compõe transparência sobre branco. PNG preserva alfa. A borda instantânea participa da dimensão final e dos limites; a opção Original conserva a resolução da área de imagem após o recorte, acrescentando pixels de papel quando a borda está ligada.

Limites: entrada de 35 MB; prévia de até 1100 px e 1,21 MP; exportação de até 24 MP e 8192 px por lado, incluindo a borda. Original avisa se exceder o limite; Máxima disponível ajusta a dimensão. O processamento de óptica é mais custoso que um ajuste de cor; fotos grandes podem exigir dimensão menor conforme a memória do aparelho.

O zoom 100% mapeia um pixel da composição para um pixel CSS. Prévia e exportação compartilham formato e motor; diferenças de reamostragem, grão muito fino e compressão podem aparecer entre resoluções. A orientação EXIF é decodificada pelo navegador. Saída sRGB de 8 bits; sem revelação RAW/HDR ou preservação dos metadados EXIF/ICC originais. HEIC depende do navegador. A edição em andamento não persiste após recarregar a página.

## Comparação e referências

Com o servidor em desenvolvimento, abra [/dev/profile-comparison](http://127.0.0.1:4173/dev/profile-comparison). A página revela a mesma fotografia nas onze câmeras, permite trocar a seed e desligar grão, borda e vazamentos juntos. O download é da prévia de comparação (até 640 px); use o editor para exportação em resolução maior.

As definições foram transportadas do DAZZ para o motor paramétrico do navegador, sem depender de captura ao vivo ou LUT em tempo de execução. A procedência e a licença MIT estão registradas em [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Veja [VALIDACAO.md](VALIDACAO.md) para testes e limitações e [filmEngine/README.md](filmEngine/README.md) para a arquitetura.

## Publicar e usar no iPhone

A versão 4 está preparada para Vercel com a função `api/index.mjs` e `vercel.json`. Configure `APP_PASSWORD`, `APP_SESSION_SECRET`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY` e `PRESET_LIBRARY_ID` como variáveis protegidas do projeto e publique com `vercel --prod`. A função valida a senha, assina a sessão e acessa o Supabase; arquivos privados e todo `/dev/` continuam bloqueados. Não publique a pasta como um site estático: isso contornaria a proteção de entrada. Veja [SUPABASE.md](SUPABASE.md) para os detalhes.

Em outra hospedagem Node, execute `npm start` com `NODE_ENV=production` e `APP_ORIGIN` igual à origem HTTPS pública. Nesse modo, `HOST` e `PORT` também podem ser definidos pela plataforma.

## Baixar, modificar e atualizar

O código fica no repositório privado [NicolasBusa/editor-da-princesa](https://github.com/NicolasBusa/editor-da-princesa). Para trabalhar com histórico de versões, instale o Git e execute:

```bash
git clone https://github.com/NicolasBusa/editor-da-princesa.git
cd editor-da-princesa
npm start
```

Abra `http://127.0.0.1:4173` e use a senha **1309**. O `.env` é opcional no desenvolvimento: sem ele, os presets ficam somente em `.runtime/presets.json`. Para usar a coleção real do Supabase localmente, copie `.env.example` para `.env`, preencha as três variáveis do Supabase e mantenha as credenciais fora do Git. Depois de modificar e testar:

```bash
git add .
git commit -m "Descreva a alteração"
git push origin main
```

Para publicar manualmente no projeto existente da Vercel, instale o CLI, entre na mesma conta e vincule a pasta uma vez:

```bash
npm install --global vercel
vercel login
vercel link --project editor-da-princesa
vercel --prod
```

As variáveis de produção já estão guardadas no projeto da Vercel. Não envie o `.env` ao GitHub. Para deploy automático, abra Project Settings → Git na Vercel, conecte este repositório e conceda à integração da Vercel acesso ao repositório privado. Depois disso, cada `git push` no branch `main` atualiza a produção; outros branches geram previews.

Para acesso na mesma rede Wi-Fi, defina HOST=0.0.0.0 antes de npm start e abra http://IP-DO-COMPUTADOR:4173 no telefone. Compartilhamento nativo geralmente requer HTTPS e suporte do navegador; o download permanece disponível. O layout é mobile-first, com controles roláveis abaixo da foto. Ainda não houve teste em Safari num iPhone físico.

A cartinha está no elemento love-dialog de index.html. Personalize os textos e a assinatura ali. Os estilos ficam em styles.css e studio.css. Os perfis são módulos JavaScript próprios em cameraProfiles/ para manter o projeto sem compilação; suas tipagens estão em CameraProfile.d.ts.

