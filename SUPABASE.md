# Senha e presets · versão 4

## Uso

Inicie com `npm start` (Node.js 22 ou superior), abra o editor e entre com **1309**. Em Câmeras → Meus presets, ajuste a foto e toque em **Salvar**. Cada preset guarda câmera, presença, textura, opções da câmera, flash, luz, cor, HSL, curvas, gradação, detalhes, efeitos analógicos e moldura. O enquadramento (recorte, rotação, alinhamento e espelhamento) é opcional.

Toque no nome de um preset para aplicar tudo em uma única alteração do histórico. Desfazer restaura o visual anterior. Renomear altera somente o nome; Atualizar substitui as configurações pelo visual atual, após confirmação; Excluir remove o preset da coleção compartilhada.

Fotos, adesivos, legendas e a seed da captura não fazem parte dos presets e não são enviados ao servidor. A edição completa aberta continua temporária; exporte a foto para guardá-la. A coleção pertence ao cantinho: todas as pessoas com a senha têm acesso aos mesmos presets. Não há contas individuais nem Supabase Auth neste modelo de senha compartilhada.

## Conectar ao Supabase

A integração está conectada ao projeto **Editor da Princesa** (`aizoldeswdwpebwaozpy`), hospedado em São Paulo. O `.env` local contém a URL, uma secret key moderna e o identificador privado da biblioteca; ele não deve ser publicado nem compartilhado. Sem essa configuração, somente o ambiente de desenvolvimento salva em `.runtime/presets.json` (até 500 presets), com indicação explícita na interface. Esses dados não sincronizam entre computadores e não são migrados automaticamente ao ativar o Supabase. O modo de produção recusa iniciar sem Supabase configurado; falhas na nuvem nunca desviam gravações para o armazenamento local.

1. A migration versionada `supabase/migrations/20260909144347_create_princess_presets.sql` já foi aplicada. `supabase/schema.sql` permanece como referência para instalação manual em outro projeto. Ela cria a tabela `public.princess_presets`, o índice da biblioteca, ativa RLS e concede acesso somente a `service_role`.
2. Copie `.env.example` para `.env` no diretório do projeto.
3. Preencha `SUPABASE_URL` com a URL HTTPS do projeto e `SUPABASE_SECRET_KEY` com uma secret key do Dashboard → Settings → API Keys. Também é aceita uma chave legada `service_role`. Use o arquivo local ou o gerenciador de segredos da hospedagem; não coloque a chave em JavaScript público nem em mensagens.
4. Gere um UUID com `node -p "crypto.randomUUID()"` e salve em `PRESET_LIBRARY_ID`. Mantenha esse mesmo valor nos servidores que compartilham a coleção; mudar o identificador abre outra biblioteca.
5. Reinicie o servidor. Salve um preset e atualize a página. A interface deve mostrar **Salvos no Supabase**. Verifique também a linha criada no banco com a consulta abaixo; em seguida, teste aplicar, renomear e excluir pela interface.

```sql
select id, name, recipe->>'camera' as camera, created_at
from public.princess_presets
where library_id = 'SUBSTITUA-PELO-UUID-DA-BIBLIOTECA'::uuid
order by created_at desc;
```

Para revisar as permissões no SQL Editor:

```sql
select relrowsecurity from pg_class
where oid = 'public.princess_presets'::regclass;
select grantee, privilege_type from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'princess_presets';
```

RLS deve estar ativo; `anon` e `authenticated` não devem possuir acesso à tabela. Verifique também o Security Advisor do projeto. Não crie políticas públicas para contornar erros de configuração: neste desenho, somente o backend valida a sessão e acessa o banco. Os grants explícitos também atendem às novas regras do Data API de 2026.

## Hospedar

Na Vercel, configure as três variáveis do Supabase, `APP_PASSWORD=1309` e um `APP_SESSION_SECRET` aleatório com pelo menos 32 caracteres como variáveis protegidas. `api/index.mjs` e `vercel.json` executam toda a aplicação na mesma origem HTTPS, na região de São Paulo. Um novo deploy é necessário depois de alterar as variáveis. Não sirva a pasta como hospedagem estática.

Em outra hospedagem Node, execute o servidor com `NODE_ENV=production`, `APP_ORIGIN=https://dominio-do-editor` (sem barra final), `HOST=0.0.0.0` e `PORT` da plataforma. Termine HTTPS na hospedagem/proxy e encaminhe as requisições para o Node. A aplicação e `/api/` devem compartilhar a mesma origem.

A senha é verificada no servidor. Na Vercel, a sessão usa um cookie assinado HttpOnly, SameSite=Strict e Secure, com validade de sete dias, aceito por instâncias independentes da função. A ação Sair revoga a sessão na instância ativa e apaga o cookie. Em um servidor Node sem `APP_SESSION_SECRET`, a sessão aleatória reside em memória e reiniciar o processo encerra as sessões. A interface permite entrar novamente mantendo a foto aberta.

O limitador de erros de senha reside em memória e oferece proteção por instância; a plataforma também deve aplicar os próprios controles contra abuso. `.env`, `.runtime`, código de backend, SQL e testes não são servidos pelo HTTP (a imagem sintética de teste é liberada somente em desenvolvimento, após autenticação). `.env` e `.runtime` ficam fora do ZIP e do controle de versão. A chave elevada fica exclusivamente no backend; o navegador usa apenas `/api/presets`, protegido pela sessão e pela verificação de origem nas operações de escrita.

## Verificação feita nesta entrega

`npm test`: 94 verificações de processamento, 39 de câmeras e oito testes para receitas, servidor/CRUD/autenticação, sessões entre instâncias, transporte Supabase simulado e categorias de adesivos. O teste do adaptador verifica autenticação por `apikey`, escopo fixo da biblioteca, operações REST e tratamento de erro, **sem conectar a um projeto real**.

`node tests/browser/presets-verify.mjs`: entrada correta/incorreta, salvar múltiplos presets, igualdade dos pixels ao reaplicar, desfazer/refazer, renomear/atualizar/excluir, persistência após recarregar, sessão expirada e layouts de 320 a 1360 px. Use o Chromium de teste com CDP na porta 9335, conforme VALIDACAO.md. Há capturas em `tests/browser/presets-*.png`.

A validação real no projeto passou: migration local/remota alinhada; RLS ativo; nenhum `SELECT` para `anon` ou `authenticated`; CRUD liberado para `service_role`; ciclo criar/listar/atualizar/excluir concluído via servidor; zero linhas de teste restantes; Advisors de segurança e performance sem alertas. As chaves legadas foram desativadas e o servidor usa uma secret key moderna. Não houve teste em Safari/iPhone físico.

Referências oficiais consultadas: [API keys](https://supabase.com/docs/guides/getting-started/api-keys), [proteção da API](https://supabase.com/docs/guides/api/securing-your-api) e [changelog](https://supabase.com/changelog).


