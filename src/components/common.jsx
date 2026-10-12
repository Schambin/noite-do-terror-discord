// Pedaços pequenos usados em várias telas.
import { BYNAME, gameUrl } from "../data/games.js";
import { FACETS } from "../lib/filters.js";
import { COLORS, colorHex } from "../state/evento.js";

// Link para a página do jogo na Steam (ou na busca da Steam pelo nome)
export function GameLink({ name, className, style }) {
  const g = BYNAME[name];
  if (!g) return <a className={className} style={style}>{name}</a>;
  return <a className={className} style={style} href={gameUrl(g)} target="_blank" rel="noopener noreferrer" title="Abrir na loja">{name}</a>;
}

// Bolinha com a cor do participante, seguida do nome (se showName)
export function PlayerTag({ player, showName }) {
  return <><span className="pdot" style={{ background: colorHex(player && player.color) }} />{showName && (player ? player.name : "alguém")}</>;
}

export function ColorSwatches({ value, onChange, small }) {
  return (
    <div className="swatches">
      {COLORS.map(([id, label, hex]) => (
        <button key={id} type="button" className={"sw" + (small ? " sm" : "")} aria-pressed={id === value} title={label} aria-label={label}
          style={{ background: hex }} onClick={() => onChange(id)} />
      ))}
    </div>
  );
}

// Carta (por enquanto um chapéu de bobo genérico; o dono do evento vai mandar o
// design próprio). Para trocar o visual, mude só este componente.
// skip = pular (colorido), ban = banir (preto), save = salvar (vermelho).
const CARD_NAME = { ban: "Carta de banir", save: "Carta de salvar", skip: "Carta de pular" };
const CARD_COLORS = {
  ban: { l: "#F3EEE6", m: "#F3EEE6", r: "#F3EEE6", b: "#F3EEE6", k: "#F3EEE6" },
  save: { l: "#C8102E", m: "#C8102E", r: "#C8102E", b: "#C8102E", k: "#C8102E" },
  skip: { l: "#D62828", m: "#1D4ED8", r: "#F2B705", b: "#F2B705", k: "#F2B705" },
};
export function JokerCard({ type, used }) {
  const c = CARD_COLORS[type];
  return (
    <span className={`jcard ${type}${used ? " used" : ""}`} title={CARD_NAME[type] + (used ? " (usada)" : "")}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <path d="M30 72C26 58 18 50 10 44C24 40 36 48 42 60Z" fill={c.l} />
        <path d="M58 72C64 58 76 50 90 46C84 58 74 66 70 72Z" fill={c.r} />
        <path d="M36 72C36 50 42 30 52 18C64 30 66 52 62 72Z" fill={c.m} />
        <rect x="27" y="70" width="47" height="11" rx="3" fill={c.b} />
        <circle cx="10" cy="44" r="5.5" fill={c.k} /><circle cx="52" cy="17" r="5.5" fill={c.k} /><circle cx="90" cy="46" r="5.5" fill={c.k} />
      </svg>
    </span>
  );
}

// Um grupo de filtros (Jogadores, Tema ou Tamanho) com a contagem de cada opção
export function FacetGroup({ facet, selected, counts, onToggle }) {
  return (
    <fieldset>
      <legend>{facet.legend}</legend>
      {facet.opts.map(o => (
        <label key={o.id} className={"opt" + (counts[o.id] === 0 ? " zero" : "")}>
          <input type="checkbox" value={o.id} checked={selected.has(o.id)} onChange={e => onToggle(o.id, e.target.checked)} />
          {o.color && <span className="swatch" style={{ background: o.color }} />}
          <span className="name">{o.label}</span>
          <span className="count">{counts[o.id]}</span>
        </label>
      ))}
    </fieldset>
  );
}

// Filtros ativos como "chips" que removem o filtro ao clicar
export function FilterChips({ q, onClearQ, filters, onRemove, extra = [], onClearAll }) {
  const chips = FACETS.flatMap(f => [...filters[f.key]].map(id => ({ key: f.key, id, label: f.chip(f.opts.find(o => o.id === id)) })));
  const count = (q ? 1 : 0) + chips.length + extra.length;
  return (
    <div className="chips">
      {q && <button className="chip" aria-label={`Remover filtro Busca: “${q}”`} onClick={onClearQ}>Busca: “{q}” <span aria-hidden="true">×</span></button>}
      {chips.map(c => <button key={c.key + c.id} className="chip" aria-label={`Remover filtro ${c.label}`} onClick={() => onRemove(c.key, c.id)}>{c.label} <span aria-hidden="true">×</span></button>)}
      {extra.map(x => <button key={x.label} className="chip" onClick={x.action}>{x.label} <span aria-hidden="true">×</span></button>)}
      {onClearAll && count > 1 && <button className="chip clear" onClick={onClearAll}>Limpar tudo</button>}
    </div>
  );
}
