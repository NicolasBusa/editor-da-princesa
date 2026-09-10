# Editor da Princesa · versão 4.1

No celular, a foto ocupa a área principal e a barra inferior rola horizontalmente. Toque em uma ferramenta para abrir seus controles; em Ajustes, deslize a segunda barra para acessar Luz, Cor, HSL, Curvas, Gradação, Detalhes, Efeitos e Recorte. Toque novamente na ferramenta ou em **Ver a foto** para recolher o painel. Importação, histórico e exportação ficam no topo; comparação e zoom continuam abaixo da foto.

Adesivos podem ser espelhados pelo botão ↔ do elemento selecionado. A ferramenta **Texto** adiciona várias caixas com fonte, cor, negrito, itálico, sombra e alinhamento; arraste, gire, redimensione, duplique ou exclua como um adesivo. Textos participam do histórico e da exportação, mas não dos presets. A moldura Retratinho tem a borda inferior sem frase fixa.

Durante o arraste dos ajustes, a prévia usa uma resolução temporária menor e atualiza continuamente; ao terminar o gesto, refina a resolução. Um worker separado permite responder ao próximo gesto enquanto a prévia completa termina. O motor e os valores dos controles continuam os mesmos; a exportação usa a resolução escolhida. **Revelando** aparece somente ao aplicar uma câmera ou preset salvo.

Cinco câmeras com renderização própria num editor de fotos em amarelo, nuvens e coelhinhos. O processamento acontece no navegador, sem upload das fotos a um servidor. Agora com entrada pela senha **1309**, coleção de presets conectada ao Supabase e 67 adesivos em sete categorias. Veja [SUPABASE.md](SUPABASE.md) para a configuração da nuvem.

## Abrir

Requer Node.js 22 ou superior, sem dependências de instalação:


Execute **npm start** e abra [o editor](http://127.0.0.1:4173/). Use HTTP, não abra index.html diretamente pelo explorador de arquivos. Para os testes, execute **npm test**.

## As cinco câmeras

| Câmera | Resposta principal | Formato |
| --- | --- | --- |
| CLASSIC 38 | Pele natural, ombro progressivo nos realces, lente discreta, grão fino | 3:2 / 2:3 |
| FLASH 800 | Flash frontal opcional com distância/posição, grão maior, ótica simples | 3:2 / 2:3 |
| LOMO 32 | Saturação por matiz e luminância, contraste, queda óptica e variação de exposição | 3:2 / 2:3 |
| DREAM 120 | Suavidade radial, centro utilizável, grão fino, vazamentos em 12% das seeds | 1:1 |
| INSTANT 160 | Tons e química instantâneos, resposta a pouca luz, borda externa opcional | Imagem 77:79; folha 88:107 |

Esses são os únicos cinco perfis principais. A seção Câmeras substitui a antiga biblioteca de 24 filtros. Não há uma sexta câmera Original: use Antes/depois ou Presença da câmera em zero para conferir a imagem sem o tratamento, mantendo o formato e seus ajustes manuais.

Presença mistura a contribuição fotográfica completa. Textura controla grão, microtextura química e vazamentos ocasionais; a lente e a cor permanecem independentes. Também há chaves para grão, borda instantânea e vazamentos do DREAM. Nova captura troca a seed: brilho, recorte e outros ajustes não sorteiam uma textura nova. Importar uma foto também cria uma seed nova; desfazer restaura a seed anterior. Os corações guardam câmeras favoritas no navegador.

O FLASH 800 oferece liga/desliga, potência, distância aproximada de 1,2 a 3,5 m e posição horizontal/vertical do assunto. Sem profundidade da cena, a iluminação é uma aproximação espacial ajustável. As outras quatro câmeras ignoram o flash.

## Edição, composição e exportação

Permanecem os ajustes de luz, cor, HSL em oito faixas, curvas geral/RGB, gradação de sombras/meios-tons/realces, detalhes e efeitos analógicos manuais. Há restauração individual, por grupo e geral; histórico de 50 alterações; zoom 100%; divisor antes/depois; molduras decorativas, legenda, 67 adesivos em sete categorias e cartinha de aniversário.

O recorte respeita o formato da câmera. Você escolhe e move a região dentro desse formato. Trocar a câmera preserva o recorte como região de interesse, centralizando nela a nova área de imagem; o original continua intacto. Rotação e alinhamento ocorrem antes da óptica, e o alinhamento aproxima a imagem para cobrir cantos vazios. A borda do INSTANT é adicionada por fora da área revelada, sem esticar ou encobrir a foto. Adesivos e molduras decorativas são aplicados sobre a composição final.

JPEG e PNG podem ser exportados em tamanho original após recorte/formato, máxima dimensão disponível, 2048/1080 px ou dimensões personalizadas. JPEG permite qualidade de 40–100% e compõe transparência sobre branco. PNG preserva alfa. A borda instantânea participa da dimensão final e dos limites; a opção Original conserva a resolução da área de imagem após o recorte, acrescentando pixels de papel quando a borda está ligada.

Limites: entrada de 35 MB; prévia de até 1100 px e 1,21 MP; exportação de até 24 MP e 8192 px por lado, incluindo a borda. Original avisa se exceder o limite; Máxima disponível ajusta a dimensão. O processamento de óptica é mais custoso que um ajuste de cor; fotos grandes podem exigir dimensão menor conforme a memória do aparelho.

O zoom 100% mapeia um pixel da composição para um pixel CSS. Prévia e exportação compartilham formato e motor; diferenças de reamostragem, grão muito fino e compressão podem aparecer entre resoluções. A orientação EXIF é decodificada pelo navegador. Saída sRGB de 8 bits; sem revelação RAW/HDR ou preservação dos metadados EXIF/ICC originais. HEIC depende do navegador. A edição em andamento não persiste após recarregar a página.

## Comparação e referências

Com o servidor em desenvolvimento, abra [/dev/profile-comparison](http://127.0.0.1:4173/dev/profile-comparison). A página revela a mesma fotografia nas cinco câmeras, permite trocar a seed e desligar grão, borda e vazamentos juntos. O download é da prévia de comparação (até 640 px); use o editor para exportação em resolução maior.

As pastas references/classic38, flash800, lomo32, dream120 e instant160 têm manifestos prontos para fotografias licenciadas. Estão vazias de fotos reais. A [documentação de referências](references/README.md) descreve os campos e as fontes técnicas. A calibração com fotografias reais está pendente; os nomes genéricos são aproximações estéticas/ópticas, não reprodução medida das câmeras físicas citadas na especificação.

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

