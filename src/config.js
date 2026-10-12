// Configuração do Supabase (no painel do Supabase: Project Settings > API).
//   url: a "Project URL", ex.: "https://abcdefghijkl.supabase.co"
//   key: a chave "anon" / "publishable". Ela é pública, pode ficar aqui no código.
// NUNCA coloque aqui a chave "service_role" / "secret".
// As variáveis VITE_SUPABASE_URL e VITE_SUPABASE_KEY, se existirem, têm prioridade
// (opcional: dá para configurar por variáveis de ambiente no Netlify).
export const SUPABASE_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL || "",
  key: import.meta.env.VITE_SUPABASE_KEY || "",
};
