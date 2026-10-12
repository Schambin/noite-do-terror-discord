// Resultado do giro e o painel "Alguém quer pular esse jogo?".
import { useState } from "react";
import { useEvento, canEdit, spendSkip, confirmPick, SKIPS } from "../state/evento.js";
import { GameLink, PlayerTag } from "./common.jsx";

export default function SpinResult() {
  const ev = useEvento();
  const s = ev.data.spin;
  const [busy, setBusy] = useState(false);
  const by = ev.players.find(p => p.id === s.by);
  const label = s.state === "skipped" ? "Pulado por " : s.state === "chosen" ? "Vai ser esse! ✅" : "O escolhido é";

  async function skip(pid) {
    setBusy(true);
    try { await spendSkip(pid); } catch (e) { console.error(e); alert(e.message); } finally { setBusy(false); }
  }

  return <>
    <div className="winner" aria-live="polite">
      <span className="wlabel">{label}{s.state === "skipped" && <PlayerTag player={by} showName />}</span>
      <GameLink className="wname" name={s.winner} style={s.state === "skipped" ? { textDecoration: "line-through" } : undefined} />
    </div>

    {s.state === "skipped" && ev.isAdmin && <div className="skipBox"><p>Girando de novo…</p></div>}
    {s.state === "live" && (
      <div className="skipBox">
        <p>Alguém quer pular esse jogo?</p>
        <div className="skipBtns">
          {!ev.players.length && <span className="facet-note">Nenhum participante cadastrado ainda.</span>}
          {ev.players.map(p => {
            const left = SKIPS - (p.skipsUsed || 0), mine = canEdit(ev, p.id);
            return (
              <button key={p.id} className="skipBtn" disabled={busy || !mine || left <= 0}
                title={mine ? "Usar carta de pular" : "Só o próprio participante pode usar"} onClick={() => skip(p.id)}>
                <PlayerTag player={p} showName /> · pular ({left})
              </button>
            );
          })}
        </div>
        {!ev.me && !ev.isAdmin && <p className="facet-note" style={{ margin: "10px 0 0", fontWeight: 400 }}>Entre na sua conta para usar suas cartas.</p>}
        {ev.isAdmin && <div style={{ marginTop: 12 }}><button className="btn" id="confirmBtn" onClick={confirmPick}>Vai ser esse! ✅</button></div>}
      </div>
    )}
  </>;
}
