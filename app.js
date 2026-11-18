import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";

// Chave publicável (pode ficar no front-end); o acesso real é controlado pelas políticas RLS.
const sb = createClient("https://lpbsxzqrrthfooxnxqet.supabase.co", "sb_publishable_7wwad-vkUjm8ZZpemC6ExA_07V18CwG");

const COMODOS = ["Cozinha", "Quarto", "Banheiro", "Sala", "Lavanderia", "Organização e utilidades", "Decoração"];
const PRIORIDADES = { essencial: "Essencial", importante: "Importante", complementar: "Complementar" };
const STATUS = { nao_iniciado: "Não iniciado", pesquisando: "Pesquisando opções", escolhido: "Escolhido", comprado: "Comprado" };
const ETAPAS = {
  antecedencia: ["Com bastante antecedência", "Itens duráveis que podem ser comprados aos poucos, aproveitando promoções."],
  pesquisar: ["Pesquisar e comparar", "Compras maiores: vale acompanhar preços e esperar boas oportunidades."],
  meses_antes: ["Alguns meses antes", "Depende das medidas e do espaço do apartamento. Confirme antes de comprar."],
  perto: ["Perto da mudança", "Itens de consumo ou de última hora. Comprar cedo demais não compensa."],
};
const ORDEM_PRIO = { essencial: 0, importante: 1, complementar: 2 };
const ORDEM_ETAPA = { antecedencia: 0, pesquisar: 1, meses_antes: 2, perto: 3 };

const S = { session: null, membros: {}, itens: [], opcoes: [], comentarios: [], config: {}, abertos: new Set(), filtro: { q: "", status: "todos", prio: "todas" }, finPor: "comodo", item: null, novaOpcao: false };
const $app = document.getElementById("app");

/* ---------- utilidades ---------- */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const brl = (n) => (n == null || isNaN(n) ? "—" : Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
const dataBR = (d) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
const urlOk = (u) => /^https?:\/\//i.test(u || "");
const num = (v) => { if (v === "" || v == null) return null; const n = Number(String(v).replace(/\./g, "").replace(",", ".")); return isNaN(n) ? null : n; };
const numIn = (n) => (n == null ? "" : String(n).replace(".", ","));
const nome = (uid) => S.membros[uid] || "—";
const opcoesDe = (id) => S.opcoes.filter((o) => o.item_id === id);
const escolhida = (id) => opcoesDe(id).find((o) => o.escolhida);
const unitario = (it) => it.preco_estimado ?? escolhida(it.id)?.preco ?? null;
const estimado = (it) => (unitario(it) == null ? null : unitario(it) * it.quantidade);
const pago = (it) => (it.status === "comprado" ? Number(it.preco_pago || 0) : 0);
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const foto = (it) => [it.imagem_url, escolhida(it.id)?.imagem_url, ...opcoesDe(it.id).map((o) => o.imagem_url)].find(urlOk);

const I = {
  chev: '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m6 9 6 6 6-6"/></svg>',
  x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/></svg>',
};

function toast(msg, err = false) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.className = "show" + (err ? " err" : "");
  clearTimeout(toast.t); toast.t = setTimeout(() => (t.className = err ? "err" : ""), 2600);
}
const fotoHTML = (url, label, cls = "photo") =>
  `<div class="${cls}">${urlOk(url) ? `<img src="${esc(url)}" alt="${esc(label)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ""}<span class="ph" aria-hidden="true">${esc((label || "?").trim()[0] || "?")}</span></div>`;
const linkExt = (u, txt) => (urlOk(u) ? `<a class="pill" href="${esc(u)}" target="_blank" rel="noopener noreferrer nofollow">${txt} ${I.ext}</a>` : "");

/* ---------- dados ---------- */
async function carregar() {
  const [m, i, o, c, cf] = await Promise.all([
    sb.from("membros").select("user_id,nome"),
    sb.from("itens").select("*").order("ordem"),
    sb.from("opcoes").select("*").order("criado_em"),
    sb.from("comentarios").select("*").order("criado_em"),
    sb.from("config").select("*").eq("id", 1).maybeSingle(),
  ]);
  const erro = [m, i, o, c, cf].find((r) => r.error);
  if (erro) { toast("Não foi possível carregar os dados.", true); console.error(erro.error); return; }
  S.membros = Object.fromEntries(m.data.map((x) => [x.user_id, x.nome]));
  S.itens = i.data; S.opcoes = o.data; S.comentarios = c.data; S.config = cf.data || {};
}

async function salvar(tabela, op, valores, id) {
  let q = sb.from(tabela);
  q = op === "insert" ? q.insert(valores).select().single() : op === "delete" ? q.delete().eq("id", id) : q.update(valores).eq("id", id).select().single();
  const { data, error } = await q;
  if (error) { console.error(error); toast("Não foi possível salvar. Tente novamente.", true); throw error; }
  return data;
}

let recarga;
function tempoReal() {
  sb.channel("lar")
    .on("postgres_changes", { event: "*", schema: "public" }, () => {
      clearTimeout(recarga);
      recarga = setTimeout(async () => { await carregar(); render(); }, 300);
    })
    .subscribe();
}

/* ---------- navegação ---------- */
const ROTAS = { inicio: "Início", lista: "Lista", esquecidos: "Esquecidos", etapas: "Etapas", financas: "Finanças" };
const rota = () => (location.hash.slice(1) in ROTAS ? location.hash.slice(1) : "inicio");
window.addEventListener("hashchange", () => { render(); scrollTo({ top: 0 }); });

function render() {
  if (!S.session) return renderAuth();
  if (!S.souMembro) return renderSemAcesso();
  const r = rota();
  const meu = S.membros[S.session.user.id];
  const views = { inicio: vInicio, lista: vLista, esquecidos: vEsquecidos, etapas: vEtapas, financas: vFinancas };
  $app.innerHTML = `<div class="shell">
    <header class="top">
      <a class="brand" href="#inicio">Nosso Primeiro Lar</a>
      <nav class="nav">${Object.entries(ROTAS).map(([k, v]) => `<a href="#${k}" class="${k === r ? "on" : ""}">${v}</a>`).join("")}</nav>
      <div class="who"><span>${esc(meu || "")}</span><button class="linkbtn" data-act="sair">Sair</button></div>
    </header>
    <main class="view" id="view">${views[r]()}</main>
  </div>${S.item ? sheetHTML() : ""}`;
  if (S.item) requestAnimationFrame(() => document.querySelectorAll(".overlay,.sheet").forEach((e) => e.classList.add("show")));
}

/* ---------- componentes ---------- */
function cardItem(it) {
  const est = estimado(it);
  return `<button class="card ${it.status === "comprado" ? "done" : ""}" data-act="abrir" data-id="${it.id}">
    ${fotoHTML(foto(it), it.nome)}
    <div class="body">
      <span class="name">${esc(it.nome)}</span>
      <span class="tag"><i class="dot ${it.status === "comprado" ? "comprado" : it.prioridade}"></i>${esc(it.comodo)} · ${STATUS[it.status]}</span>
      ${est != null ? `<span class="price" style="text-align:left">${brl(est)}</span>` : ""}
    </div></button>`;
}
function linhaItem(it) {
  const est = it.status === "comprado" && it.preco_pago != null ? it.preco_pago : estimado(it);
  return `<div class="check-row ${it.status === "comprado" ? "done" : ""}">
    <input type="checkbox" class="cbox" data-act="check" data-id="${it.id}" ${it.status === "comprado" ? "checked" : ""} aria-label="Marcar ${esc(it.nome)} como comprado">
    ${fotoHTML(foto(it), it.nome, "photo thumb")}
    <button class="open" data-act="abrir" data-id="${it.id}">
      <div class="name">${esc(it.nome)}${it.quantidade > 1 ? ` <span class="muted small">× ${it.quantidade}</span>` : ""}</div>
      <span class="tag"><i class="dot ${it.prioridade}"></i>${PRIORIDADES[it.prioridade]} · ${STATUS[it.status]}${opcoesDe(it.id).length ? ` · ${opcoesDe(it.id).length} opç${opcoesDe(it.id).length > 1 ? "ões" : "ão"}` : ""}</span>
    </button>
    <span class="price">${est != null ? brl(est) : ""}</span>
  </div>`;
}
const barra = (p, cls = "") => `<div class="bar ${cls}"><i style="width:${p}%"></i></div>`;

/* ---------- views ---------- */
function totais(lista = S.itens) {
  const comprados = lista.filter((i) => i.status === "comprado");
  const estTotal = lista.reduce((s, i) => s + (estimado(i) || 0), 0);
  const gasto = comprados.reduce((s, i) => s + pago(i), 0);
  const reservar = lista.filter((i) => i.status !== "comprado").reduce((s, i) => s + (estimado(i) || 0), 0);
  return { total: lista.length, comprados: comprados.length, pendentes: lista.length - comprados.length, estTotal, gasto, reservar, semPreco: lista.filter((i) => i.status !== "comprado" && estimado(i) == null).length };
}
function contagem() {
  const alvo = new Date((S.config.data_mudanca || "2029-02-01") + "T00:00:00");
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const dias = Math.max(0, Math.round((alvo - hoje) / 864e5));
  let meses = (alvo.getFullYear() - hoje.getFullYear()) * 12 + alvo.getMonth() - hoje.getMonth();
  if (alvo.getDate() < hoje.getDate()) meses--;
  return { dias, meses: Math.max(0, meses), alvo };
}

function vInicio() {
  const t = totais(); const c = contagem();
  const prioritarios = S.itens.filter((i) => i.status !== "comprado")
    .sort((a, b) => ORDEM_PRIO[a.prioridade] - ORDEM_PRIO[b.prioridade] || ORDEM_ETAPA[a.etapa] - ORDEM_ETAPA[b.etapa] || a.ordem - b.ordem).slice(0, 8);
  const mes = c.alvo.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return `<section class="hero">
      <span class="eyebrow">Mudança prevista · ${esc(mes)}</span>
      <h1 class="display">Nosso Primeiro Lar</h1>
      <div class="hero-meta">
        <div><div class="count">${c.dias.toLocaleString("pt-BR")}</div><span class="muted small">dias até a mudança</span></div>
        <div><div class="count">${c.meses}</div><span class="muted small">meses para planejar</span></div>
        <div style="flex:1;min-width:220px"><div class="between small"><span class="muted">Progresso das compras</span><span>${pct(t.comprados, t.total)}%</span></div><div style="margin-top:10px">${barra(pct(t.comprados, t.total))}</div></div>
      </div>
    </section>
    <section class="section">
      <div class="stats">
        <div class="stat"><span class="eyebrow">Planejados</span><b>${t.total}</b></div>
        <div class="stat"><span class="eyebrow">Comprados</span><b>${t.comprados}</b></div>
        <div class="stat"><span class="eyebrow">Pendentes</span><b>${t.pendentes}</b></div>
        <div class="stat"><span class="eyebrow">Total estimado</span><b>${brl(t.estTotal)}</b></div>
        <div class="stat"><span class="eyebrow">Já gasto</span><b>${brl(t.gasto)}</b></div>
        <div class="stat"><span class="eyebrow">Ainda reservar</span><b>${brl(t.reservar)}</b></div>
      </div>
      ${t.semPreco ? `<p class="muted small">${t.semPreco} itens pendentes ainda sem preço estimado — os totais vão ficando mais precisos conforme vocês adicionam valores.</p>` : ""}
    </section>
    <section class="section">
      <div class="section-head"><div><span class="eyebrow">Próximos passos</span><h2 class="h2">Itens prioritários</h2></div><a class="pill" href="#etapas">Ver por etapas</a></div>
      ${prioritarios.length ? `<div class="grid">${prioritarios.map(cardItem).join("")}</div>` : `<p class="empty">Tudo comprado. Agora é só se mudar.</p>`}
    </section>
    <section class="section">
      <div class="section-head"><div><span class="eyebrow">Por cômodo</span><h2 class="h2">Andamento</h2></div></div>
      <div class="fin">${comodos().map((cm) => { const tt = totais(S.itens.filter((i) => i.comodo === cm)); return `<a class="fin-row" style="grid-template-columns:1fr auto;text-decoration:none" href="#lista" data-act="irComodo" data-c="${esc(cm)}"><span>${esc(cm)}</span><span class="muted small">${tt.comprados} de ${tt.total}</span>${barra(pct(tt.comprados, tt.total), "thin")}</a>`; }).join("")}</div>
    </section>`;
}

const comodos = () => [...COMODOS, ...new Set(S.itens.map((i) => i.comodo).filter((c) => !COMODOS.includes(c)))].filter((c) => S.itens.some((i) => i.comodo === c) || COMODOS.includes(c));

function filtrar(lista) {
  const { q, status, prio } = S.filtro; const qq = q.trim().toLowerCase();
  return lista.filter((i) => (!qq || (i.nome + " " + i.categoria).toLowerCase().includes(qq))
    && (status === "todos" || (status === "pendentes" ? i.status !== "comprado" : i.status === "comprado"))
    && (prio === "todas" || i.prioridade === prio));
}

function vLista() {
  const f = S.filtro;
  const seg = (campo, opts) => `<div class="seg">${opts.map(([v, l]) => `<button data-act="filtro" data-k="${campo}" data-v="${v}" class="${f[campo] === v ? "on" : ""}">${l}</button>`).join("")}</div>`;
  return `<section class="hero" style="padding-top:36px"><span class="eyebrow">Lista de compras</span><h1 class="display" style="font-size:clamp(40px,6vw,64px)">Cômodo por cômodo</h1></section>
    <div class="toolbar">
      <input class="input" type="search" placeholder="Buscar item" value="${esc(f.q)}" data-act="busca" aria-label="Buscar item">
      ${seg("status", [["todos", "Todos"], ["pendentes", "Pendentes"], ["comprados", "Comprados"]])}
      ${seg("prio", [["todas", "Todas"], ["essencial", "Essenciais"], ["importante", "Importantes"], ["complementar", "Complementares"]])}
      <button class="btn sm" data-act="novo">Adicionar item</button>
    </div>
    <div style="margin-top:24px" id="rooms">${comodos().map(roomHTML).join("")}</div>`;
}
function roomHTML(cm) {
  const todos = S.itens.filter((i) => i.comodo === cm); const lista = filtrar(todos); const t = totais(todos);
  const aberto = S.abertos.has(cm) || (S.filtro.q && lista.length);
  const cats = [...new Set(lista.map((i) => i.categoria))];
  return `<div class="room ${aberto ? "open" : ""}">
    <button class="room-head" data-act="room" data-c="${esc(cm)}" aria-expanded="${!!aberto}">
      <span class="h2">${esc(cm)}</span>
      <span class="row"><span class="muted small">${t.comprados}/${t.total}</span>${I.chev}</span>
      ${barra(pct(t.comprados, t.total), "thin")}
    </button>
    <div class="room-body"><div><div class="room-inner">
      ${lista.length ? cats.map((c) => `<div class="eyebrow cat-title">${esc(c)}</div><div class="check-list">${lista.filter((i) => i.categoria === c).map(linhaItem).join("")}</div>`).join("") : `<p class="empty">Nenhum item com esses filtros.</p>`}
    </div></div></div></div>`;
}

function vEsquecidos() {
  const lista = S.itens.filter((i) => i.esquecido);
  const pend = lista.filter((i) => i.status !== "comprado");
  return `<section class="hero" style="padding-top:36px"><span class="eyebrow">Os pequenos essenciais</span><h1 class="display" style="font-size:clamp(40px,6vw,64px)">O que sempre esquecem</h1>
    <p class="muted" style="max-width:620px">Não adianta ter geladeira sem ter talheres. Estes são os itens pequenos que fazem falta já na primeira noite. Marque qualquer item como “esquecível” no detalhe dele para que apareça aqui.</p>
    <div style="max-width:420px"><div class="between small"><span class="muted">${lista.length - pend.length} de ${lista.length} garantidos</span><span>${pct(lista.length - pend.length, lista.length)}%</span></div><div style="margin-top:10px">${barra(pct(lista.length - pend.length, lista.length))}</div></div>
  </section>
  <section class="section" style="margin-top:40px"><div class="check-list">${lista.sort((a, b) => (a.status === "comprado") - (b.status === "comprado")).map(linhaItem).join("") || `<p class="empty" style="padding:24px">Nenhum item marcado.</p>`}</div></section>`;
}

function vEtapas() {
  return `<section class="hero" style="padding-top:36px"><span class="eyebrow">Sem pressa</span><h1 class="display" style="font-size:clamp(40px,6vw,64px)">Compras por etapa</h1>
    <p class="muted" style="max-width:620px">A ideia não é comprar tudo agora: é saber o que pesquisar, acompanhar preços e aproveitar boas oportunidades até a mudança.</p></section>
    <div class="stages section" style="margin-top:32px">${Object.entries(ETAPAS).map(([k, [titulo, desc]]) => {
      const l = S.itens.filter((i) => i.etapa === k).sort((a, b) => (a.status === "comprado") - (b.status === "comprado") || ORDEM_PRIO[a.prioridade] - ORDEM_PRIO[b.prioridade]);
      const feitos = l.filter((i) => i.status === "comprado").length;
      return `<div class="stage"><div><h3 class="h2" style="font-size:22px">${titulo}</h3><p class="muted small" style="margin:6px 0 0">${desc}</p></div>
        <div><div class="between small muted"><span>${feitos} de ${l.length}</span><span>${pct(feitos, l.length)}%</span></div><div style="margin-top:8px">${barra(pct(feitos, l.length), "thin")}</div></div>
        <ul>${l.map((i) => `<li class="${i.status === "comprado" ? "done" : ""}"><button data-act="abrir" data-id="${i.id}"><span>${esc(i.nome)}</span><span class="muted small">${esc(i.comodo)}</span></button></li>`).join("")}</ul></div>`;
    }).join("")}</div>`;
}

function vFinancas() {
  const t = totais(); const orc = S.config.orcamento_total;
  const chave = S.finPor;
  const grupos = [...new Set(S.itens.map((i) => i[chave]))].sort((a, b) => chave === "comodo" ? comodos().indexOf(a) - comodos().indexOf(b) : a.localeCompare(b, "pt-BR"));
  const comparaMax = Math.max(orc || 0, t.estTotal, t.gasto, 1);
  return `<section class="hero" style="padding-top:36px"><span class="eyebrow">Planejamento financeiro</span><h1 class="display" style="font-size:clamp(40px,6vw,64px)">Quanto custa o lar</h1></section>
    <section class="section" style="margin-top:32px">
      <div class="fields" style="max-width:560px;align-items:end">
        <label class="field">Orçamento total planejado (R$)<input class="input" inputmode="decimal" id="orc" value="${numIn(orc)}" placeholder="Ex.: 40000"></label>
        <button class="btn ghost" data-act="salvarOrc" style="justify-self:start">Salvar orçamento</button>
      </div>
    </section>
    <section class="section">
      <div class="stats">
        <div class="stat"><span class="eyebrow">Orçamento</span><b>${brl(orc)}</b></div>
        <div class="stat"><span class="eyebrow">Estimado</span><b>${brl(t.estTotal)}</b></div>
        <div class="stat"><span class="eyebrow">Gasto real</span><b>${brl(t.gasto)}</b></div>
        <div class="stat"><span class="eyebrow">Restante a comprar</span><b>${brl(t.reservar)}</b></div>
        <div class="stat"><span class="eyebrow">Saldo do orçamento</span><b>${orc != null ? brl(orc - t.gasto) : "—"}</b></div>
        <div class="stat"><span class="eyebrow">Folga prevista</span><b>${orc != null ? brl(orc - t.gasto - t.reservar) : "—"}</b></div>
      </div>
      <div style="display:grid;gap:14px;margin-top:28px;max-width:720px">
        ${[["Orçamento", orc || 0], ["Estimado", t.estTotal], ["Gasto real", t.gasto]].map(([l, v]) => `<div><div class="between small"><span class="muted">${l}</span><span>${brl(v)}</span></div><div style="margin-top:6px">${barra(Math.round((v / comparaMax) * 100))}</div></div>`).join("")}
      </div>
      ${orc != null && t.gasto + t.reservar > orc ? `<p class="small" style="color:var(--warn);margin-top:18px">A previsão atual passa o orçamento em ${brl(t.gasto + t.reservar - orc)}.</p>` : ""}
    </section>
    <section class="section">
      <div class="section-head"><div><span class="eyebrow">Detalhamento</span><h2 class="h2">Gastos por ${chave === "comodo" ? "cômodo" : "categoria"}</h2></div>
        <div class="seg"><button data-act="finPor" data-v="comodo" class="${chave === "comodo" ? "on" : ""}">Cômodo</button><button data-act="finPor" data-v="categoria" class="${chave === "categoria" ? "on" : ""}">Categoria</button></div></div>
      <div class="fin"><div class="fin-row head"><span>${chave === "comodo" ? "Cômodo" : "Categoria"}</span><span>Estimado</span><span>Gasto</span><span>Falta</span></div>
      ${grupos.map((g) => { const tt = totais(S.itens.filter((i) => i[chave] === g)); return `<div class="fin-row"><span>${esc(g)}</span><span data-l="Estimado">${brl(tt.estTotal)}</span><span data-l="Gasto">${brl(tt.gasto)}</span><span data-l="Falta">${brl(tt.reservar)}</span>${barra(pct(tt.gasto, tt.gasto + tt.reservar), "thin")}</div>`; }).join("")}</div>
      <p class="muted small">Estimado usa o preço estimado do item (ou da opção escolhida) multiplicado pela quantidade. Gasto considera o valor pago registrado nos itens comprados.</p>
    </section>`;
}

/* ---------- detalhe do item ---------- */
function sheetHTML() {
  const novo = S.item === "novo";
  const it = novo ? { nome: "", comodo: "Cozinha", categoria: "Geral", quantidade: 1, prioridade: "importante", status: "nao_iniciado", etapa: "pesquisar", esquecido: false } : S.itens.find((i) => i.id === S.item);
  if (!it) { S.item = null; return ""; }
  const ops = novo ? [] : opcoesDe(it.id);
  const coms = novo ? [] : S.comentarios.filter((c) => c.item_id === it.id);
  const sel = (n, obj, v) => `<select class="input" name="${n}">${Object.entries(obj).map(([k, l]) => `<option value="${k}" ${k === v ? "selected" : ""}>${l}</option>`).join("")}</select>`;
  const comodoOpts = Object.fromEntries(comodos().map((c) => [c, c]));
  return `<div class="overlay" data-act="fechar"></div>
  <aside class="sheet" role="dialog" aria-modal="true" aria-label="${esc(it.nome || "Novo item")}">
    <div class="sheet-close"><button data-act="fechar" aria-label="Fechar">${I.x}</button></div>
    ${fotoHTML(novo ? null : foto(it), it.nome || "+", "photo sheet-hero")}
    <div class="sheet-body">
      <div><span class="eyebrow">${esc(it.comodo)} · ${esc(it.categoria)}</span><h2 class="display" style="font-size:clamp(34px,6vw,52px);margin-top:8px">${esc(it.nome || "Novo item")}</h2>
        ${novo ? "" : `<p class="muted small" style="margin:10px 0 0">Adicionado ${it.criado_por ? `por ${esc(nome(it.criado_por))} ` : "na lista inicial "}em ${dataBR(it.criado_em)} · Atualizado ${it.atualizado_por ? `por ${esc(nome(it.atualizado_por))} ` : ""}em ${dataBR(it.atualizado_em)}</p>`}</div>

      ${novo ? "" : `<div><span class="eyebrow">Status</span><div class="status-pick" style="margin-top:10px">${Object.entries(STATUS).map(([k, l]) => `<button data-act="status" data-v="${k}" class="${it.status === k ? "on" : ""}">${l}</button>`).join("")}</div></div>`}

      <form id="form-item" class="fields">
        <label class="field full">Nome<input class="input" name="nome" required maxlength="120" value="${esc(it.nome)}"></label>
        <label class="field">Cômodo<input class="input" name="comodo" list="lista-comodos" required value="${esc(it.comodo)}"><datalist id="lista-comodos">${Object.keys(comodoOpts).map((c) => `<option value="${esc(c)}">`).join("")}</datalist></label>
        <label class="field">Categoria<input class="input" name="categoria" required value="${esc(it.categoria)}"></label>
        <label class="field">Quantidade<input class="input" name="quantidade" type="number" min="1" value="${it.quantidade}"></label>
        <label class="field">Prioridade${sel("prioridade", PRIORIDADES, it.prioridade)}</label>
        <label class="field">Etapa${sel("etapa", Object.fromEntries(Object.entries(ETAPAS).map(([k, v]) => [k, v[0]])), it.etapa)}</label>
        <label class="field">Preço estimado por unidade (R$)<input class="input" name="preco_estimado" inputmode="decimal" value="${numIn(it.preco_estimado)}" placeholder="${escolhida(it.id) ? "Usando a opção escolhida" : ""}"></label>
        <label class="field">Valor pago no total (R$)<input class="input" name="preco_pago" inputmode="decimal" value="${numIn(it.preco_pago)}"></label>
        <label class="field">Foto (link da imagem)<input class="input" name="imagem_url" type="url" placeholder="https://" value="${esc(it.imagem_url)}"></label>
        <label class="field full">Descrição<textarea class="input" name="descricao">${esc(it.descricao)}</textarea></label>
        <label class="field full">Nossa preferência<textarea class="input" name="preferencia" placeholder="Cor, tamanho, material, marca, o que cada um prefere…">${esc(it.preferencia)}</textarea></label>
        <label class="field full">Observações<textarea class="input" name="observacoes">${esc(it.observacoes)}</textarea></label>
        <label class="row small full" style="color:var(--muted)"><input type="checkbox" class="cbox" name="esquecido" ${it.esquecido ? "checked" : ""}> Item pequeno que costuma ser esquecido</label>
        <div class="row full"><button class="btn" type="submit">${novo ? "Adicionar à lista" : "Salvar alterações"}</button>${novo ? "" : `<button class="btn danger" type="button" data-act="apagarItem">Remover item</button>`}</div>
      </form>

      ${novo ? "" : `
      <div>
        <div class="between"><div><span class="eyebrow">Comparação</span><h3 class="h2" style="font-size:24px">Opções encontradas</h3></div><button class="btn sm ghost" data-act="toggleOpcao">${S.novaOpcao ? "Cancelar" : "Adicionar opção"}</button></div>
        ${S.novaOpcao ? formOpcao() : ""}
        <div class="options" style="margin-top:16px">${ops.map(opcaoHTML).join("") || `<p class="muted small">Nenhuma opção ainda. Adicionem links de lojas diferentes para comparar.</p>`}</div>
        ${ops.length > 1 ? tabelaComparacao(ops) : ""}
      </div>
      <div>
        <span class="eyebrow">Conversa</span><h3 class="h2" style="font-size:24px;margin-bottom:14px">Comentários</h3>
        <div class="comments">${coms.map((c) => `<div class="comment"><div class="between small"><span>${esc(nome(c.autor))}</span><span class="muted">${dataBR(c.criado_em)}${c.autor === S.session.user.id ? ` <button class="linkbtn" data-act="apagarComentario" data-id="${c.id}">apagar</button>` : ""}</span></div><p style="margin:4px 0 0;white-space:pre-wrap">${esc(c.texto)}</p></div>`).join("")}</div>
        <form id="form-comentario" class="row" style="margin-top:14px;flex-wrap:nowrap"><input class="input" name="texto" maxlength="2000" placeholder="Escreva um comentário" required><button class="btn sm" type="submit">Enviar</button></form>
      </div>`}
    </div>
  </aside>`;
}
function formOpcao() {
  return `<form id="form-opcao" class="fields callout" style="margin-top:16px">
    <label class="field">Produto / modelo<input class="input" name="nome" required></label>
    <label class="field">Loja<input class="input" name="loja"></label>
    <label class="field">Preço (R$)<input class="input" name="preco" inputmode="decimal"></label>
    <label class="field">Link de compra<input class="input" name="url" type="url" placeholder="https://"></label>
    <label class="field full">Foto (link da imagem)<input class="input" name="imagem_url" type="url" placeholder="https://"></label>
    <label class="field full">Características<textarea class="input" name="caracteristicas" placeholder="Capacidade, medidas, voltagem, cor…"></textarea></label>
    <label class="field full">Observações<textarea class="input" name="observacoes"></textarea></label>
    <div class="full"><button class="btn" type="submit">Salvar opção</button></div>
  </form>`;
}
function opcaoHTML(o) {
  const eu = S.session.user.id; const gosto = o.curtidas.includes(eu);
  const quem = o.curtidas.map(nome).join(" e ");
  return `<div class="opt ${o.escolhida ? "chosen" : ""}">
    ${fotoHTML(o.imagem_url, o.nome)}
    <div class="opt-body">
      <div class="between"><span class="eyebrow">${esc(o.loja || "Loja não informada")}${o.escolhida ? " · Escolhida" : ""}</span></div>
      <div style="font-weight:500;overflow-wrap:anywhere">${esc(o.nome)}</div>
      <div class="opt-price">${brl(o.preco)}</div>
      ${o.caracteristicas ? `<div class="small muted" style="white-space:pre-wrap">${esc(o.caracteristicas)}</div>` : ""}
      ${o.observacoes ? `<div class="small" style="white-space:pre-wrap">${esc(o.observacoes)}</div>` : ""}
      ${quem ? `<div class="small muted">Gostou: ${esc(quem)}</div>` : ""}
      <div class="small muted">Adicionada por ${esc(nome(o.criado_por))} em ${dataBR(o.criado_em)}</div>
      <div class="opt-actions">
        ${linkExt(o.url, "Abrir loja")}
        <button class="pill ${gosto ? "on" : ""}" data-act="curtir" data-id="${o.id}" aria-pressed="${gosto}">${I.heart} ${gosto ? "Eu gosto" : "Gostei"}</button>
        <button class="pill ${o.escolhida ? "on" : ""}" data-act="escolher" data-id="${o.id}">${o.escolhida ? "Escolhida" : "Escolher esta"}</button>
        <button class="pill" data-act="apagarOpcao" data-id="${o.id}">Remover</button>
      </div>
    </div></div>`;
}
function tabelaComparacao(ops) {
  const menor = Math.min(...ops.filter((o) => o.preco != null).map((o) => o.preco));
  return `<div class="compare-wrap" style="margin-top:18px"><table class="compare"><thead><tr><th>Produto</th><th>Loja</th><th>Preço</th><th>Preferência</th></tr></thead><tbody>
    ${ops.map((o) => `<tr><td>${esc(o.nome)}</td><td>${esc(o.loja || "—")}</td><td style="white-space:nowrap">${brl(o.preco)}${o.preco === menor ? ' <span class="muted small">menor</span>' : ""}</td><td>${o.escolhida ? "Escolhida" : o.curtidas.length ? `${o.curtidas.length} curtida${o.curtidas.length > 1 ? "s" : ""}` : "—"}</td></tr>`).join("")}
  </tbody></table></div>`;
}

/* ---------- ações ---------- */
async function atualizarItem(id, valores, msg) {
  const it = S.itens.find((i) => i.id === id); const antes = { ...it };
  Object.assign(it, valores); render();
  try { Object.assign(it, await salvar("itens", "update", valores, id)); render(); if (msg) toast(msg); }
  catch { Object.assign(it, antes); render(); }
}

async function toggleCheck(id, marcado) {
  const it = S.itens.find((i) => i.id === id);
  const valores = { status: marcado ? "comprado" : escolhida(id) ? "escolhido" : opcoesDe(id).length ? "pesquisando" : "nao_iniciado" };
  if (marcado && it.preco_pago == null && escolhida(id)?.preco != null) valores.preco_pago = escolhida(id).preco * it.quantidade;
  await atualizarItem(id, valores, marcado ? `${it.nome} marcado como comprado` : `${it.nome} voltou para a lista`);
}

const lerForm = (f) => Object.fromEntries(new FormData(f).entries());

$app.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-act]"); if (!el) return;
  const { act, id } = el.dataset;
  if (act === "check") return; // tratado no change
  const it = S.itens.find((i) => i.id === S.item);
  switch (act) {
    case "sair": await sb.auth.signOut(); break;
    case "abrir": S.item = id; S.novaOpcao = false; document.body.style.overflow = "hidden"; render(); break;
    case "novo": S.item = "novo"; document.body.style.overflow = "hidden"; render(); break;
    case "fechar": document.querySelectorAll(".overlay,.sheet").forEach((x) => x.classList.remove("show")); setTimeout(() => { S.item = null; document.body.style.overflow = ""; render(); }, 300); break;
    case "room": { const c = el.dataset.c; S.abertos.has(c) ? S.abertos.delete(c) : S.abertos.add(c); el.closest(".room").classList.toggle("open"); el.setAttribute("aria-expanded", S.abertos.has(c)); break; }
    case "irComodo": S.abertos.add(el.dataset.c); break;
    case "filtro": S.filtro[el.dataset.k] = el.dataset.v; render(); break;
    case "finPor": S.finPor = el.dataset.v; render(); break;
    case "salvarOrc": {
      const v = num(document.getElementById("orc").value);
      const { error } = await sb.from("config").update({ orcamento_total: v }).eq("id", 1);
      if (error) toast("Não foi possível salvar o orçamento.", true); else { S.config.orcamento_total = v; render(); toast("Orçamento salvo"); }
      break;
    }
    case "status": await atualizarItem(it.id, { status: el.dataset.v }, "Status atualizado"); break;
    case "apagarItem": if (confirm(`Remover “${it.nome}” da lista? As opções e comentários dele também serão apagados.`)) { await salvar("itens", "delete", null, it.id); S.itens = S.itens.filter((i) => i.id !== it.id); S.item = null; document.body.style.overflow = ""; render(); toast("Item removido"); } break;
    case "toggleOpcao": S.novaOpcao = !S.novaOpcao; render(); break;
    case "curtir": {
      const o = S.opcoes.find((x) => x.id === id); const eu = S.session.user.id;
      const curtidas = o.curtidas.includes(eu) ? o.curtidas.filter((u) => u !== eu) : [...o.curtidas, eu];
      Object.assign(o, await salvar("opcoes", "update", { curtidas }, id)); render(); break;
    }
    case "escolher": {
      const o = S.opcoes.find((x) => x.id === id); const marcar = !o.escolhida;
      for (const x of opcoesDe(o.item_id).filter((x) => x.escolhida && x.id !== id)) Object.assign(x, await salvar("opcoes", "update", { escolhida: false }, x.id));
      Object.assign(o, await salvar("opcoes", "update", { escolhida: marcar }, id));
      if (marcar && ["nao_iniciado", "pesquisando"].includes(it.status)) await atualizarItem(it.id, { status: "escolhido" });
      render(); toast(marcar ? "Opção escolhida" : "Escolha desfeita"); break;
    }
    case "apagarOpcao": if (confirm("Remover esta opção?")) { await salvar("opcoes", "delete", null, id); S.opcoes = S.opcoes.filter((o) => o.id !== id); render(); toast("Opção removida"); } break;
    case "apagarComentario": await salvar("comentarios", "delete", null, id); S.comentarios = S.comentarios.filter((c) => c.id !== id); render(); break;
  }
});

$app.addEventListener("change", (e) => {
  const el = e.target.closest('[data-act="check"]'); if (el) toggleCheck(el.dataset.id, el.checked);
});
$app.addEventListener("input", (e) => {
  if (e.target.dataset.act !== "busca") return;
  S.filtro.q = e.target.value;
  document.getElementById("rooms").innerHTML = comodos().map(roomHTML).join("");
});

$app.addEventListener("submit", async (e) => {
  e.preventDefault(); const f = e.target; const btn = f.querySelector('[type="submit"]'); btn.disabled = true;
  try {
    if (f.id === "form-item") {
      const d = lerForm(f);
      if (d.imagem_url && !urlOk(d.imagem_url)) throw toast("O link da foto precisa começar com https://", true);
      const v = { nome: d.nome.trim(), comodo: d.comodo.trim(), categoria: d.categoria.trim() || "Geral", quantidade: Math.max(1, parseInt(d.quantidade) || 1), prioridade: d.prioridade, etapa: d.etapa, preco_estimado: num(d.preco_estimado), preco_pago: num(d.preco_pago), imagem_url: d.imagem_url.trim() || null, descricao: d.descricao.trim() || null, preferencia: d.preferencia.trim() || null, observacoes: d.observacoes.trim() || null, esquecido: !!d.esquecido };
      if (S.item === "novo") { const novo = await salvar("itens", "insert", { ...v, ordem: 999 }); S.itens.push(novo); S.item = novo.id; S.abertos.add(novo.comodo); render(); toast("Item adicionado"); }
      else await atualizarItem(S.item, v, "Alterações salvas");
    } else if (f.id === "form-opcao") {
      const d = lerForm(f);
      if ((d.url && !urlOk(d.url)) || (d.imagem_url && !urlOk(d.imagem_url))) throw toast("Os links precisam começar com https://", true);
      const nova = await salvar("opcoes", "insert", { item_id: S.item, nome: d.nome.trim(), loja: d.loja.trim() || null, preco: num(d.preco), url: d.url.trim() || null, imagem_url: d.imagem_url.trim() || null, caracteristicas: d.caracteristicas.trim() || null, observacoes: d.observacoes.trim() || null });
      S.opcoes.push(nova); S.novaOpcao = false;
      const it = S.itens.find((i) => i.id === S.item);
      if (it.status === "nao_iniciado") await atualizarItem(it.id, { status: "pesquisando" });
      render(); toast("Opção adicionada");
    } else if (f.id === "form-comentario") {
      const c = await salvar("comentarios", "insert", { item_id: S.item, texto: f.texto.value.trim() });
      S.comentarios.push(c); render(); toast("Comentário enviado");
    }
  } catch { /* erro já mostrado */ } finally { btn.disabled = false; }
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && S.item) document.querySelector('[data-act="fechar"]')?.click(); });

/* ---------- autenticação ---------- */
function renderAuth(modo = "entrar") {
  $app.innerHTML = `<div class="auth"><form class="auth-box view" id="auth">
    <div><span class="eyebrow">Espaço privado</span><h1 class="display" style="font-size:52px;margin-top:10px">Nosso Primeiro Lar</h1><p class="muted">Planejamento da nossa mudança em fevereiro de 2029.</p></div>
    <div class="seg" style="justify-self:start"><button type="button" data-modo="entrar" class="${modo === "entrar" ? "on" : ""}">Entrar</button><button type="button" data-modo="criar" class="${modo === "criar" ? "on" : ""}">Criar conta</button></div>
    ${modo === "criar" ? `<label class="field">Seu nome<input class="input" name="nome" required autocomplete="given-name"></label>` : ""}
    <label class="field">E-mail<input class="input" name="email" type="email" required autocomplete="email"></label>
    <label class="field">Senha<input class="input" name="senha" type="password" required minlength="6" autocomplete="${modo === "criar" ? "new-password" : "current-password"}"></label>
    <button class="btn" type="submit">${modo === "criar" ? "Criar conta" : "Entrar"}</button>
    <p class="muted small" id="auth-msg"></p>
  </form></div>`;
  const form = document.getElementById("auth");
  form.querySelectorAll("[data-modo]").forEach((b) => (b.onclick = () => renderAuth(b.dataset.modo)));
  form.onsubmit = async (e) => {
    e.preventDefault(); const d = lerForm(form); const msg = document.getElementById("auth-msg"); const btn = form.querySelector('[type="submit"]');
    btn.disabled = true; msg.textContent = "Aguarde…";
    const r = modo === "criar"
      ? await sb.auth.signUp({ email: d.email, password: d.senha, options: { data: { nome: d.nome.trim() }, emailRedirectTo: location.origin + location.pathname } })
      : await sb.auth.signInWithPassword({ email: d.email, password: d.senha });
    btn.disabled = false;
    if (r.error) msg.textContent = r.error.message.includes("Invalid login") ? "E-mail ou senha incorretos." : "Não foi possível continuar: " + r.error.message;
    else if (modo === "criar" && !r.data.session) msg.textContent = "Conta criada. Confirme pelo link enviado ao seu e-mail e depois entre.";
  };
}
function renderSemAcesso() {
  $app.innerHTML = `<div class="auth"><div class="auth-box view"><h1 class="display" style="font-size:44px">Acesso restrito</h1><p class="muted">Esta conta não faz parte deste planejamento. O espaço é exclusivo para as duas pessoas cadastradas.</p><button class="btn ghost" id="sair">Sair</button></div></div>`;
  document.getElementById("sair").onclick = () => sb.auth.signOut();
}

let iniciado = false;
// setTimeout: chamar o Supabase direto dentro deste listener pode travar o cliente
sb.auth.onAuthStateChange((_e, session) => setTimeout(() => iniciar(session)));
async function iniciar(session) {
  S.session = session;
  if (!session) { iniciado = false; return render(); }
  if (iniciado) return; iniciado = true;
  const { data } = await sb.rpc("eh_membro");
  S.souMembro = !!data;
  if (S.souMembro) { await carregar(); tempoReal(); }
  render();
}
