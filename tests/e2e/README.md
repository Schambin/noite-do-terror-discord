# Teste com vários aparelhos

`evento.spec.js` abre um ADM e dois participantes, cada um num navegador separado, todos ligados ao mesmo Supabase, e passa pelo evento inteiro: PIN do ADM, contas, cartas, giro, pulos simultâneos, giro automático, confirmação, login em outro aparelho e "devolver todas as cartas".

Ele roda contra um **Supabase local** (precisa do Docker Desktop ligado). **Não rode contra o banco do evento**: o teste apaga a tabela.

```bash
# numa pasta fora do repositório:
npx supabase init
cp <repo>/supabase/setup.sql supabase/migrations/20261012000000_setup.sql
npx supabase start -x studio,imgproxy,storage-api,edge-runtime,logflare,vector,supavisor,mailpit,postgres-meta
npx supabase status    # mostra a API URL e a chave anon

# no repositório:
VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_KEY=<chave anon local> npx playwright test
```

O Playwright usa o Microsoft Edge instalado (`PW_CHANNEL=chrome` para usar o Chrome).
