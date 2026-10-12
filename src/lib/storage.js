// localStorage protegido: alguns navegadores bloqueiam o armazenamento e
// um acesso sem try/catch já derrubou o site uma vez.
export const LS = {
  get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sem armazenamento */ } },
  del: k => { try { localStorage.removeItem(k); } catch (e) { /* sem armazenamento */ } },
  json(k, fallback) { try { return JSON.parse(this.get(k)) ?? fallback; } catch (e) { return fallback; } },
};
