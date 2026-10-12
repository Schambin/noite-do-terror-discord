// Hash dos PINs (SHA-256). Impede uso por engano ou brincadeira, não é
// segurança de verdade: um PIN de 4 números se descobre por tentativa.
export async function sha(t) {
  t = "noite-terror|" + t;
  if (globalThis.crypto && crypto.subtle) {
    const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
  }
  // sem crypto.subtle (página sem HTTPS): hash simples de reserva
  let h1 = 0x811c9dc5, h2 = 0x1b873593;
  for (let i = 0; i < t.length; i++) { h1 = Math.imul(h1 ^ t.charCodeAt(i), 16777619); h2 = Math.imul(h2 ^ t.charCodeAt(i), 2246822519); }
  return "f" + (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16);
}
