// Simula o evento com vários aparelhos: ADM + Ana + Bia, cada um no próprio
// navegador (contexto separado = localStorage separado), todos ligados ao
// mesmo Supabase.
import { test, expect } from "@playwright/test";

const URL = process.env.VITE_SUPABASE_URL || "http://127.0.0.1:54321";
const KEY = process.env.VITE_SUPABASE_KEY;

// Limpa a tabela antes do teste (a chave anon pode apagar, ver supabase/setup.sql)
async function wipe(request) {
  const r = await request.delete(`${URL}/rest/v1/estado?key=neq.__nada__`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  expect(r.ok()).toBeTruthy();
}

async function device(browser, label) {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  page.on("pageerror", e => console.log(`[${label}] erro na página:`, e.message));
  page.on("dialog", d => d.accept());
  await page.goto("/");
  await page.getByRole("tab", { name: /Roleta/ }).click();
  await expect(page.getByTestId("sync")).toHaveAttribute("data-connected", "true");
  return page;
}

async function createAccount(page, name, pin, color) {
  const acc = page.getByTestId("account");
  await acc.getByRole("button", { name: "Criar conta" }).first().click();
  await acc.getByLabel("Seu nome").fill(name);
  await acc.getByLabel("PIN de 4 números").fill(pin);
  await acc.getByRole("button", { name: color, exact: true }).click();
  await acc.getByRole("button", { name: "Criar conta" }).last().click();
  await expect(page.getByText(`Você é ${name}`)).toBeVisible();
}

const winnerName = page => page.getByTestId("winner").locator(".wname");

test("evento com ADM e dois participantes", async ({ browser, request }) => {
  expect(KEY, "defina VITE_SUPABASE_KEY com a chave anon do Supabase local").toBeTruthy();
  await wipe(request);

  const adm = await device(browser, "ADM");
  const ana = await device(browser, "Ana");
  const bia = await device(browser, "Bia");

  // ADM define o PIN no primeiro acesso
  await adm.getByText("Definir PIN do ADM (primeiro acesso)").click();
  await adm.getByLabel("PIN do ADM").fill("9876");
  await adm.getByRole("button", { name: "Definir" }).click();
  await expect(adm.getByText("Você está no modo ADM")).toBeVisible();
  // os outros não veem o botão de girar nem a área do ADM
  await expect(ana.locator("#spinBtn")).toHaveCount(0);
  await expect(ana.getByTestId("admin")).toHaveCount(0);
  // e não conseguem virar ADM com outro PIN
  await bia.getByText("Sou o ADM").click();
  await bia.getByLabel("PIN do ADM").fill("1111");
  await bia.locator("details").getByRole("button", { name: "Entrar" }).click();
  await expect(bia.getByText("PIN incorreto.")).toBeVisible();

  // participantes criam conta cada um no seu aparelho
  await createAccount(ana, "Ana", "1111", "Verde");
  await createAccount(bia, "Bia", "2222", "Rosa");
  await expect(adm.getByTestId("cards").locator("[data-player]")).toHaveCount(2);

  // ADM monta o grupo: só Terror, e bane um jogo já jogado
  await adm.getByTestId("admin").locator("label.opt", { hasText: "Terror" }).locator("input").check();
  await adm.locator('.rrow[data-game="Cry of Fear"] .banBtn').click();
  await expect(adm.locator('.rrow[data-game="Cry of Fear"] .banBtn')).toHaveText("Banido (ADM)");
  // o grupo novo chega para os participantes (lista da carta de banir)
  const anaBan = ana.locator('[data-player="Ana"]').getByLabel("Colocar carta de banir");
  await expect(anaBan.locator("option", { hasText: "Cry of Fear" })).toHaveCount(0);
  await expect(anaBan.locator("option", { hasText: "CRYO" })).toHaveCount(1);

  // Ana bane um jogo, Bia salva outro; todos veem onde cada carta está
  await anaBan.selectOption("CRYO");
  await bia.locator('[data-player="Bia"]').getByLabel("Colocar carta de salvar").selectOption("Content Warning");
  for (const p of [adm, ana, bia]) {
    await expect(p.getByText("banido por Ana").first()).toBeVisible();
    await expect(p.getByText("salvo por Bia").first()).toBeVisible();
  }
  // Ana não mexe nas cartas da Bia
  await expect(ana.locator('[data-player="Bia"]').getByLabel("Colocar carta de banir")).toHaveCount(0);
  // Ana retira e coloca de novo
  await ana.locator('[data-player="Ana"]').getByRole("button", { name: "retirar carta" }).click();
  await expect(bia.getByText("banido por Ana")).toHaveCount(0);
  await ana.locator('[data-player="Ana"]').getByLabel("Colocar carta de banir").selectOption("CRYO");
  await expect(bia.getByText("banido por Ana").first()).toBeVisible();

  // ADM gira: todos veem o mesmo jogo, e nunca o banido por carta nem pelo ADM
  await adm.locator("#spinBtn").click();
  for (const p of [adm, ana, bia]) await expect(p.getByTestId("winner")).toHaveAttribute("data-state", "live");
  const first = await winnerName(adm).textContent();
  expect(["CRYO", "Cry of Fear"]).not.toContain(first);
  await expect(winnerName(ana)).toHaveText(first);
  await expect(winnerName(bia)).toHaveText(first);

  // Ana e Bia apertam "pular" ao mesmo tempo: só uma carta é gasta
  await Promise.all([
    ana.locator('.skipBtn[data-player="Ana"]').click(),
    bia.locator('.skipBtn[data-player="Bia"]').click(),
  ]);
  await expect(adm.getByTestId("history")).toContainText(first);
  const left = async name => (await adm.locator(`[data-player="${name}"] [data-testid="skips-left"]`).textContent()).trim();
  await expect.poll(async () => [await left("Ana"), await left("Bia")].sort()).toEqual(["Pular: 2/3", "Pular: 3/3"]);
  await expect(adm.getByTestId("history").locator("li")).toHaveCount(1);

  // a tela do ADM gira de novo sozinha e todos acompanham
  for (const p of [adm, ana, bia]) await expect(p.getByTestId("winner")).toHaveAttribute("data-state", "live", { timeout: 20_000 });
  const second = await winnerName(adm).textContent();
  await expect(winnerName(ana)).toHaveText(second);
  await expect(winnerName(bia)).toHaveText(second);

  // ADM confirma
  await adm.locator("#confirmBtn").click();
  for (const p of [adm, ana, bia]) await expect(p.getByTestId("winner")).toHaveAttribute("data-state", "chosen");
  await expect(bia.getByTestId("history")).toContainText("escolhido ✅");

  // Ana entra em outro aparelho com o PIN (errado e depois certo)
  const ana2 = await device(browser, "Ana2");
  await ana2.getByTestId("account").getByLabel("Seu nome").selectOption({ label: "Ana" });
  await ana2.getByTestId("account").getByLabel("PIN").fill("0000");
  await ana2.getByTestId("account").getByRole("button", { name: "Entrar" }).last().click();
  await expect(ana2.getByText("PIN incorreto.")).toBeVisible();
  await ana2.getByTestId("account").getByLabel("PIN").fill("1111");
  await ana2.getByTestId("account").getByRole("button", { name: "Entrar" }).last().click();
  await expect(ana2.getByText("Você é Ana")).toBeVisible();
  await expect(ana2.getByTestId("winner")).toHaveAttribute("data-state", "chosen");

  // recarregar a página mantém tudo
  await bia.reload();
  await bia.getByRole("tab", { name: /Roleta/ }).click();
  await expect(bia.getByText("Você é Bia")).toBeVisible();
  await expect(bia.getByText("salvo por Bia").first()).toBeVisible();

  // ADM devolve todas as cartas e limpa o histórico
  await adm.getByRole("button", { name: "Devolver todas as cartas e limpar histórico" }).click();
  await expect(ana.getByText("banido por Ana")).toHaveCount(0);
  await expect(ana.getByTestId("history")).toHaveCount(0);
  await expect.poll(async () => [await left("Ana"), await left("Bia")]).toEqual(["Pular: 3/3", "Pular: 3/3"]);

  // depois de limpar, o próximo giro anima e aparece para todos
  await adm.locator("#spinBtn").click();
  for (const p of [adm, ana, bia]) await expect(p.getByTestId("winner")).toHaveAttribute("data-state", "live");
});
