import { describe, it, expect } from "vitest";
import { createSupabaseStore } from "../../src/lib/store.js";
import { createFakeServer } from "./fakeSupabase.js";

const wait = ms => new Promise(r => setTimeout(r, ms));

// Um "aparelho": store + último estado recebido
async function device(server) {
  const d = { data: {}, connected: false };
  d.store = createSupabaseStore(server.client(), { onChange: x => { d.data = x; }, onStatus: ok => { d.connected = ok; } });
  await d.store.start();
  await wait(20);
  return d;
}

describe("store do Supabase", () => {
  it("grava, lê por caminho e espalha para os outros aparelhos", async () => {
    const server = createFakeServer();
    const a = await device(server), b = await device(server);
    await a.store.set("players/pabcd", { name: "Ana", skipsUsed: 0 });
    await a.store.update("players/pabcd", { ban: "Among Us" });
    await wait(30);
    expect(b.data.players.pabcd).toEqual({ name: "Ana", skipsUsed: 0, ban: "Among Us" });
    expect(server.table.get("players/pabcd").ver).toBe(2);
  });

  it("dois aparelhos pulando o mesmo giro: só um consegue", async () => {
    const server = createFakeServer();
    const a = await device(server), b = await device(server);
    await a.store.set("spin", { seq: 1, winner: "Among Us", state: "live" });
    await wait(20);
    const skip = (d, pid) => d.store.tx("spin", cur => (!cur || cur.seq !== 1 || cur.state !== "live") ? undefined : { ...cur, state: "skipped", by: pid });
    const results = await Promise.all([skip(a, "pana"), skip(b, "pbia")]);
    expect(results.filter(Boolean)).toHaveLength(1);
    await wait(30);
    expect(a.data.spin.state).toBe("skipped");
    expect(a.data.spin.by).toBe(b.data.spin.by);
  });

  it("incrementos simultâneos não se perdem", async () => {
    const server = createFakeServer();
    const devs = await Promise.all([1, 2, 3, 4, 5].map(() => device(server)));
    await devs[0].store.set("players/pzzzz", { name: "Zé", skipsUsed: 0 });
    await Promise.all(devs.map(d => d.store.tx("players/pzzzz/skipsUsed", c => (c || 0) + 1)));
    expect(server.table.get("players/pzzzz").value.skipsUsed).toBe(5);
  });

  it("PIN do ADM só pode ser definido uma vez, mesmo com duas tentativas juntas", async () => {
    const server = createFakeServer();
    const a = await device(server), b = await device(server);
    const res = await Promise.all([a.store.tx("admin/pin", c => c ? undefined : "h1"), b.store.tx("admin/pin", c => c ? undefined : "h2")]);
    expect(res.filter(Boolean)).toHaveLength(1);
    expect(["h1", "h2"]).toContain(server.table.get("admin").value.pin);
  });

  it("apagar e criar de novo (limpar histórico e girar outra vez)", async () => {
    const server = createFakeServer();
    const a = await device(server), b = await device(server);
    for (let i = 1; i <= 3; i++) await a.store.tx("spin", cur => ({ seq: ((cur && cur.seq) || 0) + 1, state: "live" }));
    const hid = await a.store.push("history", { game: "X", ts: 1 });
    await a.store.set("spin", null);
    await a.store.set(`history/${hid}`, null);
    await a.store.tx("spin", cur => ({ seq: ((cur && cur.seq) || 0) + 1, state: "live" }));
    await wait(30);
    expect(b.data.spin.seq).toBe(1);
    expect(b.data.history).toBeUndefined();
  });

  it("aparelho que entra depois recebe o estado inteiro", async () => {
    const server = createFakeServer();
    const a = await device(server);
    await a.store.set("config", { mode: "equal" });
    await a.store.set("players/pqwer", { name: "Leo" });
    const late = await device(server);
    expect(late.data.config).toEqual({ mode: "equal" });
    expect(late.data.players.pqwer.name).toBe("Leo");
  });
});

describe("escrita otimista", () => {
  it("aparece na hora no próprio aparelho e depois fica confirmada", async () => {
    const server = createFakeServer();
    const a = await device(server), b = await device(server);
    const p = a.store.tx("config", c => ({ ...(c || {}), banned: ["X"] }), { optimistic: true });
    expect(a.data.config).toEqual({ banned: ["X"] }); // antes do banco responder
    expect(b.data.config).toBeUndefined();
    await p; await wait(30);
    expect(a.data.config).toEqual({ banned: ["X"] });
    expect(b.data.config).toEqual({ banned: ["X"] });
  });

  it("vários cliques seguidos não se perdem", async () => {
    const server = createFakeServer();
    const a = await device(server);
    const add = id => a.store.tx("config", c => ({ banned: [...new Set([...((c && c.banned) || []), id])] }), { optimistic: true });
    const all = Promise.all(["A", "B", "C"].map(add));
    expect(a.data.config.banned).toEqual(["A", "B", "C"]);
    await all;
    expect(server.table.get("config").value.banned.slice().sort()).toEqual(["A", "B", "C"]);
  });
});
