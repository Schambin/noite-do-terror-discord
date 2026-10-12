import { describe, it, expect } from "vitest";
import { weights, cardMap, finalWheel, pickWeighted, sliceCenter } from "../../src/lib/wheel.js";
import { normalizeConfig, poolFromConfig, activeGames, normalizedPct } from "../../src/lib/pool.js";
import { GAMELIST } from "../../src/data/games.js";

const g = id => ({ id });

describe("pesos", () => {
  it("modo igual divide 100% entre todos", () => {
    expect(weights([g("a"), g("b"), g("c"), g("d")], "equal", {})).toEqual([25, 25, 25, 25]);
  });
  it("modo personalizado reparte o que sobrou entre os jogos sem valor", () => {
    expect(weights([g("a"), g("b"), g("c")], "custom", { a: 50 })).toEqual([50, 25, 25]);
  });
  it("se os valores digitados já passam de 100%, os sem valor ficam com 0", () => {
    expect(weights([g("a"), g("b"), g("c")], "custom", { a: 70, b: 40 })).toEqual([70, 40, 0]);
  });
});

describe("cartas", () => {
  const pool = [["A", 25], ["B", 25], ["C", 25], ["D", 25]];
  it("carta de banir tira o jogo da roleta final", () => {
    const fw = finalWheel(pool, cardMap([{ id: "p1", ban: "B" }]));
    expect(fw.map(([n]) => n)).toEqual(["A", "C", "D"]);
  });
  it("cada carta de salvar no mesmo jogo multiplica por 2", () => {
    const fw = finalWheel(pool, cardMap([{ id: "p1", save: "A" }, { id: "p2", save: "A" }, { id: "p3", save: "C" }]));
    expect(Object.fromEntries(fw)).toEqual({ A: 100, B: 25, C: 50, D: 25 });
  });
  it("banir ganha de salvar", () => {
    const fw = finalWheel(pool, cardMap([{ id: "p1", save: "A" }, { id: "p2", ban: "A" }]));
    expect(fw.map(([n]) => n)).not.toContain("A");
  });
});

describe("sorteio", () => {
  const fw = [["A", 10], ["B", 30], ["C", 60]];
  it("respeita os pesos", () => {
    expect(pickWeighted(fw, () => 0)).toBe("A");
    expect(pickWeighted(fw, () => 0.2)).toBe("B");
    expect(pickWeighted(fw, () => 0.39)).toBe("B");
    expect(pickWeighted(fw, () => 0.4)).toBe("C");
    expect(pickWeighted(fw, () => 0.9999)).toBe("C");
  });
  it("roleta vazia não sorteia", () => { expect(pickWeighted([])).toBeNull(); });
  it("centro da fatia", () => {
    expect(sliceCenter(fw, "A")).toBeCloseTo(18);
    expect(sliceCenter(fw, "C")).toBeCloseTo(252);
  });
});

describe("config do ADM", () => {
  it("config vazia = todos os jogos com chance igual", () => {
    const pool = poolFromConfig(normalizeConfig(null));
    expect(pool).toHaveLength(GAMELIST.length);
    expect(pool.reduce((a, [, w]) => a + w, 0)).toBeCloseTo(100, 1);
  });
  it("filtros, desmarcados e banidos pelo ADM saem do grupo", () => {
    const c = normalizeConfig({ filters: { themes: ["T"] }, banned: ["Cry of Fear"], off: ["CRYO"] });
    const names = activeGames(c).map(x => x.name);
    expect(names.length).toBeGreaterThan(5);
    expect(names).not.toContain("Cry of Fear");
    expect(names).not.toContain("CRYO");
    expect(activeGames(c).every(x => x.themes.includes("T"))).toBe(true);
  });
  it("ajustar para 100% mantém a proporção", () => {
    const c = normalizeConfig({ filters: { themes: ["T"] }, mode: "custom", pct: { "Cry of Fear": 50 } });
    const pct = normalizedPct(c);
    const sum = activeGames(c).reduce((a, x) => a + pct[x.id], 0);
    expect(sum).toBeCloseTo(100, 0);
    expect(pct["Cry of Fear"]).toBe(50);
  });
});
