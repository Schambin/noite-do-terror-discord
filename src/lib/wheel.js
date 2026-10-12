// Matemática da roleta: pesos do grupo do ADM e efeito das cartas de banir/salvar.

// Pesos (em %) dos jogos ativos. Modo "equal" divide igual; "custom" usa os valores
// digitados e reparte o que sobrou de 100% entre os jogos sem valor.
export function weights(active, mode, pct) {
  if (mode !== "custom" || !active.length) return active.map(() => active.length ? 100 / active.length : 0);
  const vals = active.map(g => pct[g.id] != null && pct[g.id] !== "" ? +pct[g.id] : null);
  const used = vals.reduce((a, v) => a + (v || 0), 0);
  const emptyCount = vals.filter(v => v == null).length;
  const share = emptyCount && used < 100 ? (100 - used) / emptyCount : 0;
  return vals.map(v => v == null ? share : v);
}

// Grupo publicado pelo ADM: lista de [nome do jogo, peso]
export function buildPool(active, mode, pct) {
  const w = weights(active, mode, pct);
  return active.map((g, i) => [g.name, Math.round(w[i] * 10000) / 10000]);
}

// Quem colocou carta de banir/salvar em cada jogo: { bans: {jogo: [players]}, saves: {...} }
export function cardMap(players) {
  const bans = {}, saves = {};
  for (const p of players) {
    if (p.ban) (bans[p.ban] = bans[p.ban] || []).push(p);
    if (p.save) (saves[p.save] = saves[p.save] || []).push(p);
  }
  return { bans, saves };
}

// Roleta final: tira os banidos por carta e multiplica o peso por 2^(cartas de salvar)
export function finalWheel(pool, { bans, saves }) {
  return pool
    .filter(([n]) => !bans[n])
    .map(([n, w]) => [n, w * Math.pow(2, (saves[n] || []).length)])
    .filter(([, w]) => w > 0);
}

// Sorteio ponderado (rnd: gerador de número aleatório entre 0 e 1).
export function pickWeighted(fw, rnd = Math.random) {
  const tot = fw.reduce((a, [, w]) => a + w, 0);
  if (!fw.length || tot <= 0) return null;
  let r = rnd() * tot, acc = 0;
  for (const [n, w] of fw) { acc += w; if (r < acc) return n; }
  return fw[fw.length - 1][0];
}

// Ângulo (graus, 0 = topo) do centro da fatia de um jogo
export function sliceCenter(fw, name) {
  const tot = fw.reduce((a, [, w]) => a + w, 0);
  const idx = fw.findIndex(([n]) => n === name);
  if (idx < 0 || tot <= 0) return null;
  let before = 0; for (let i = 0; i < idx; i++) before += fw[i][1];
  return (before + fw[idx][1] / 2) / tot * 360;
}
