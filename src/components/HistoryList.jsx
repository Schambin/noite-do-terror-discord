// Histórico dos últimos giros: jogos pulados (e por quem) e escolhidos.
import { useEvento, undoSkip } from "../state/evento.js";
import { PlayerTag } from "./common.jsx";

const time = ts => new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export default function HistoryList() {
  const ev = useEvento();
  const items = Object.entries(ev.data.history || {}).map(([id, h]) => ({ id, ...h })).sort((a, b) => b.ts - a.ts).slice(0, 20);
  if (!items.length) return null;
  return (
    <div className="hist" data-testid="history">
      <h4>Histórico</h4>
      <ul>
        {items.map(h => (
          <li key={h.id} className={h.undone ? "undone" : ""}>
            <time>{time(h.ts)}</time>
            <strong>{h.game}</strong>
            {h.type === "pulado"
              ? <span>pulado por <PlayerTag player={ev.players.find(p => p.id === h.by)} showName />{h.undone && " (carta devolvida)"}</span>
              : <span>escolhido ✅</span>}
            {ev.isAdmin && h.type === "pulado" && !h.undone && <button className="linkBtn" onClick={() => undoSkip(h.id)}>devolver carta</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}
