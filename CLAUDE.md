# Noite do Terror: contexto para o Claude

Site do evento "Halloween do Discord". Leia este arquivo antes de mexer em qualquer coisa.

**Quem pede mudanças aqui muitas vezes não é programador.** Explique em português simples o que mudou e como testar, sem jargão. Antes de terminar, rode `npm test` e `npm run build`. Se algo quebrar, conserte antes de entregar.

## O evento

- Servidor do Discord, de **sexta 30/10/2026 às 17h até 01/11/2026**.
- A live é controlada pelos participantes. Uma roleta sorteia jogos co-op, e quem acumular mais horas jogadas ganha R$100.
- O site tem duas abas:
  - **Catálogo**: 143 jogos com busca e filtros facetados (jogadores, tema, tamanho).
  - **Roleta**: sorteio ponderado com as cartas dos participantes.
- Jogos não podem repetir, mas isso é **manual**: o ADM usa "Banir (ADM)" nos que já foram jogados.

## Regras das cartas (definidas pelo dono do evento, não mudar sem ele pedir)

- Cada participante tem uma conta com **nome, cor e PIN de 4 números**. Cores: Azul, Verde, Amarelo, Roxo, Rosa, Vermelho, Preto, Branco. A cor aparece ao lado das cartas.
- Cada participante recebe:
  - **3 cartas de pular** (joker colorido). Quando a roleta cai num jogo, a pessoa pode pular: gasta uma carta e a roleta gira de novo.
  - **1 carta de banir** (joker preto). Tira um jogo da roleta.
  - **1 carta de salvar** (joker vermelho). Dobra a chance de um jogo não banido. Cada carta de salvar no mesmo jogo multiplica por 2 de novo (2 cartas = 4×).
- Banir e salvar podem ser colocadas e retiradas à vontade.
- Todos veem quantas cartas cada um tem e onde cada carta foi colocada.
- Cada um só mexe nas próprias cartas. O ADM mexe nas de todos.
- O visual das cartas é um chapéu de bobo genérico em SVG (`JokerCard` em `src/components/common.jsx`). O dono vai mandar o design próprio. **Não use** as imagens de referência que ele mostrou antes: uma tinha marca d'água de banco de imagens e a outra era ilustração de terceiros.

## ADM

- O PIN do ADM é definido no primeiro acesso e **só pode ser definido uma vez**.
- Só o ADM vê:
  - o botão de girar;
  - a área "Quem entra na roleta" (filtros, desmarcar jogo, "Banir (ADM)", porcentagens com precisão de 0,01%);
  - "Vai ser esse! ✅";
  - "devolver carta" no histórico;
  - "Devolver todas as cartas e limpar histórico".
- O giro funciona assim:
  1. O ADM gira e o resultado é gravado no banco.
  2. Todos os aparelhos animam até o mesmo jogo.
  3. Aparece "Alguém quer pular?". Se duas pessoas apertam juntas, só a primeira gasta a carta.
  4. Quando alguém pula, a tela do ADM gira de novo sozinha depois de 1,7 s.

## Arquitetura

- **React 19 + Vite**. Sem TypeScript, sem biblioteca de estado. Deploy no **Netlify** (ver `netlify.toml`: build `npm run build`, pasta `dist`).
- **Supabase**, só ele. Não existe modo local/offline: cada participante usa as cartas no próprio aparelho, e a roleta que vale é a do ADM, que aparece na live.
- Uma tabela, `public.estado`, com as colunas `key` (texto, PK), `value` (jsonb), `ver` (inteiro) e `updated_at`. O SQL está em `supabase/setup.sql`.
- Chaves usadas:
  - `config`: configuração da roleta feita pelo ADM. Fica no banco, então todos calculam a mesma roleta e o ADM pode trocar de aparelho.
  - `spin`: `{seq, winner, state: live|skipped|chosen, by}`.
  - `admin`: `{pin}` (hash).
  - `players/<id>`: `{name, color, pin, skipsUsed, ban, save, ts}`.
  - `history/<id>`: `{game, type: pulado|escolhido, by, ts, undone}`.
- **Toda escrita** passa por `Store.tx` em `src/lib/store.js`:
  1. Lê a linha.
  2. Calcula o valor novo.
  3. Faz `update ... where ver = versão lida`, com até 6 tentativas.

  É isso que garante "só o primeiro pulo vale" e "PIN do ADM só uma vez". Não troque por `upsert` direto.
- As mudanças chegam a todos pelo Realtime (`postgres_changes`). A cada (re)conexão, e quando a aba volta a ficar visível, o estado inteiro é recarregado.
- PINs são guardados como hash SHA-256 (`src/lib/hash.js`).
- `localStorage` só lembra "quem sou eu neste aparelho" (`nt-me`, `nt-adm`). Todo acesso a ele passa por `src/lib/storage.js` (try/catch), porque alguns navegadores bloqueiam o armazenamento e isso já derrubou o site uma vez.

### Onde fica cada coisa

| Arquivo | O quê |
|---|---|
| `src/data/games.js` | Lista de jogos (para adicionar ou corrigir jogo) e links da Steam |
| `src/lib/filters.js` | Filtros do catálogo e textos ("2 a 4 jogadores", "~5 GB") |
| `src/lib/wheel.js` | Pesos, efeito das cartas, sorteio (lógica pura, testada) |
| `src/lib/pool.js` | Monta o grupo da roleta a partir da `config` do ADM |
| `src/lib/store.js` | Leitura/escrita no Supabase com concorrência otimista + realtime |
| `src/state/evento.js` | Estado global (`useEvento()`) e todas as ações (criar conta, pular, girar...) |
| `src/components/` | Telas: `Catalog`, `Roulette`, `SpinResult`, `PlayersCards`, `AccountBox`, `AdminPanel`, `HistoryList`, `WheelSvg`, `common` |
| `src/style.css` | Todo o visual (cores em variáveis no `:root`, tema claro e escuro) |
| `src/config.js` | URL e chave anon do Supabase |

## Regras

- **Nunca** coloque a chave `service_role`/`secret` do Supabase no código. Só a `anon`/`publishable` (que é pública) vai em `src/config.js`.
- **Nunca** rode os testes e2e (`npx playwright test`) contra o banco do evento: eles apagam a tabela. Só contra o Supabase local (ver `tests/e2e/README.md`).
- Mudança no banco (tabela, policies) vai em `supabase/setup.sql`, escrita para poder rodar de novo sem erro (`if not exists`, `drop policy if exists`), e alguém precisa rodá-la no SQL Editor do projeto.
- Mudou alguma regra das cartas ou da roleta? Atualize os testes em `tests/unit/` e este arquivo.
- Mantenha os textos da interface em português do Brasil.

## Comandos

```bash
npm install
npm run dev       # site local em http://localhost:5173 (precisa de src/config.js preenchido)
npm test          # testes de unidade (roleta, cartas, concorrência com Supabase falso)
npm run build     # gera dist/
```

## Segurança (já combinado com o dono)

A segurança é só no navegador. O PIN impede uso por engano ou brincadeira, mas alguém com conhecimento técnico consegue burlar (a chave anon pode escrever na tabela). Para um evento entre amigos isso foi aceito.

## Pendências

- [ ] Criar o projeto no Supabase, rodar `supabase/setup.sql` e preencher `src/config.js` (passo a passo no `LEIA-ME.md`).
- [ ] Ligar o Netlify ao repositório do GitHub.
- [ ] Teste real com 2 ou 3 pessoas antes do evento.
- [ ] Abrir o projeto do Supabase alguns dias antes e no dia (projeto gratuito pausa após ~7 dias sem uso).
- [ ] Trocar os jokers genéricos pelo design próprio das cartas quando o dono enviar.
