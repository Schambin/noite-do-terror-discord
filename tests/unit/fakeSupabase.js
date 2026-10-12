// Supabase falso em memória, só com o que src/lib/store.js usa:
// select/insert/update/delete com .eq(), .maybeSingle(), .select() depois da
// escrita, e canais realtime que recebem INSERT/UPDATE/DELETE de todos.
// Cada operação espera um "tick" antes de rodar, para as chamadas se intercalarem
// como numa rede de verdade.
const tick = () => new Promise(r => setTimeout(r, Math.random() * 3));
const clone = v => v == null ? v : JSON.parse(JSON.stringify(v));

export function createFakeServer() {
  const table = new Map();
  const channels = new Set();
  const emit = payload => { for (const ch of channels) setTimeout(() => ch.handler && ch.handler(clone(payload)), Math.random() * 3); };

  class Query {
    constructor(op, body) { this.op = op; this.body = body; this.filters = []; this.single = false; this.returning = false; }
    select() { if (this.op !== "select") this.returning = true; return this; }
    eq(col, val) { this.filters.push([col, val]); return this; }
    maybeSingle() { this.single = true; return this; }
    match(row) { return this.filters.every(([c, v]) => row[c] === v); }
    async run() {
      await tick();
      if (this.op === "select") {
        const rows = [...table.values()].filter(r => this.match(r)).map(clone);
        return { data: this.single ? (rows[0] || null) : rows, error: null };
      }
      if (this.op === "insert") {
        if (table.has(this.body.key)) return { data: null, error: { code: "23505", message: "duplicate key" } };
        const row = { ...clone(this.body) }; table.set(row.key, row);
        emit({ eventType: "INSERT", new: clone(row), old: {} });
        return { data: null, error: null };
      }
      const hit = [...table.values()].filter(r => this.match(r));
      if (this.op === "update") {
        for (const r of hit) { Object.assign(r, clone(this.body)); emit({ eventType: "UPDATE", new: clone(r), old: { key: r.key } }); }
      } else if (this.op === "delete") {
        for (const r of hit) { table.delete(r.key); emit({ eventType: "DELETE", new: {}, old: { key: r.key } }); }
      }
      return { data: this.returning ? hit.map(r => ({ key: r.key, ver: r.ver })) : null, error: null };
    }
    then(res, rej) { return this.run().then(res, rej); }
  }

  function client() {
    return {
      from: () => ({
        select: () => new Query("select"),
        insert: body => new Query("insert", body),
        update: body => new Query("update", body),
        delete: () => new Query("delete"),
      }),
      channel() {
        const ch = { handler: null };
        return {
          on(_type, _filter, handler) { ch.handler = handler; return this; },
          subscribe(cb) { channels.add(ch); setTimeout(() => cb("SUBSCRIBED"), 0); return this; },
          _ch: ch,
        };
      },
      removeChannel(c) { channels.delete(c._ch); },
    };
  }
  return { table, client };
}
