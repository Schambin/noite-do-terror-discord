// Acesso a objetos por caminho "a/b/c" (ex.: "players/p123/skipsUsed").

export function getAt(o, p) { return p.split("/").reduce((x, k) => x == null ? undefined : x[k], o); }

// Grava v no caminho p; null/undefined apaga a chave.
export function setAt(o, p, v) {
  const ks = p.split("/"); let x = o;
  for (let i = 0; i < ks.length - 1; i++) {
    if (x[ks[i]] == null || typeof x[ks[i]] !== "object") x[ks[i]] = {};
    x = x[ks[i]];
  }
  const k = ks[ks.length - 1];
  if (v === null || v === undefined) delete x[k]; else x[k] = v;
}

export const clone = v => v == null ? null : JSON.parse(JSON.stringify(v));

// Cada participante e cada item do histórico é uma linha própria no banco;
// config, spin e admin são uma linha cada.
const PER_ITEM = new Set(["players", "history"]);
export function splitPath(path) {
  const segs = path.split("/");
  const n = PER_ITEM.has(segs[0]) ? 2 : 1;
  return { key: segs.slice(0, n).join("/"), sub: segs.slice(n).join("/") };
}

export const newId = prefix => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
