// Ponto de entrada: navegação, eventos da interface e sessão.
import { opcaoDoLink, statusAoDesmarcar } from "./calculos.js";
import { esc, lerNumero, textoOuNulo } from "./formato.js";
import { lerForm, toast } from "./ui.js";
import { svg } from "./icones.js";
import { acharPromo } from "./dominio.js";
import { S, carregar, escolhidaDe, itemPorId, meuId, opcoesDe, ouvirMudancas, salvar, sb } from "./estado.js";
import { itensListaHTML, painelItem, telaComodo, telaEsquecidos, telaEtapas, telaFinancas, telaInicio, telaLista, telaLogin, telaSemAcesso } from "./telas.js";

const $app = document.getElementById("app");
const ANIMACAO_PAINEL_MS = 300;
const ORDEM_ITEM_NOVO = 999;

/* ---------- navegação ---------- */
const ROTAS = {
  inicio: ["Início", telaInicio],
  lista: ["Lista", telaLista],
  esquecidos: ["Esquecidos", telaEsquecidos],
  etapas: ["Etapas", telaEtapas],
  financas: ["Finanças", telaFinancas],
};
const ICONE_MENU = { inicio: "casa", lista: "checklist", esquecidos: "lampada", etapas: "calendario", financas: "carteira" };
const PAGINAS = { ...ROTAS, comodo: ["Lista", telaComodo] }; // páginas internas que não aparecem no menu
/** "#comodo/Cozinha" vira { rota: "comodo", param: "Cozinha" }. */
function rotaAtual() {
  const [base, ...resto] = location.hash.slice(1).split("/");
  const rota = base in PAGINAS ? base : "inicio";
  let param = null;
  try { param = resto.length ? decodeURIComponent(resto.join("/")) : null; } catch { /* endereço malformado */ }
  return { rota, param };
}

let rotaAnterior = null;
function render() {
  if (!S.session) return renderLogin();
  if (!S.souMembro) { $app.innerHTML = telaSemAcesso(); return; }
  const { rota, param } = rotaAtual();
  const menu = rota === "comodo" ? "lista" : rota;
  S.comodoAtual = rota === "comodo" ? param : null;
  const chaveRota = `${rota}/${param ?? ""}`;
  const entrou = chaveRota !== rotaAnterior; // anima só ao trocar de página, não a cada atualização
  rotaAnterior = chaveRota;
  const painelAntes = document.querySelector(".sheet.show");
  const rolagemPainel = painelAntes?.scrollTop ?? 0;
  $app.innerHTML = `<a class="skip" href="#view">Pular para o conteúdo</a><div class="shell">
    <header class="top${rota === "inicio" ? "" : " so-menu"}">
      <a class="brand" href="#inicio">Nosso Primeiro Lar</a>
      <nav class="nav" aria-label="Principal">${Object.entries(ROTAS).map(([k, [rotulo]]) => `<a href="#${k}" class="${k === menu ? "on" : ""}"${k === rota ? ' aria-current="page"' : ""}>${svg(ICONE_MENU[k])}<span>${rotulo}</span></a>`).join("")}</nav>
      <div class="who"><span>${esc(S.membros[meuId()] || "")}</span><button class="linkbtn" data-act="sair">Sair</button></div>
    </header>
    <main class="view${entrou ? " enter" : ""}" id="view" tabindex="-1">${PAGINAS[rota][1](param)}</main>
  </div>${S.item ? painelItem() : ""}`;
  document.title = `${param ?? PAGINAS[rota][0]} · Nosso Primeiro Lar`;
  if (!S.item) return;
  const partes = document.querySelectorAll(".overlay,.sheet");
  if (painelAntes) { // painel já estava aberto: mantém posição, sem animar de novo
    partes.forEach((e) => e.classList.add("show", "fixo"));
    document.querySelector(".sheet").scrollTop = rolagemPainel;
  } else {
    requestAnimationFrame(() => partes.forEach((e) => e.classList.add("show")));
    document.querySelector(".sheet-close button")?.focus({ preventScroll: true });
  }
}

/** Atualização vinda do outro usuário: espera quem estiver digitando terminar. */
let renderPendente = false;
let rascunho = false; // há texto digitado e ainda não salvo num formulário do painel
const editando = () => rascunho || document.activeElement?.matches("form .input, #orc");
function liberarRender() {
  rascunho = false;
  if (renderPendente) { renderPendente = false; render(); }
}
function renderRemoto() {
  if (editando()) { renderPendente = true; return; }
  render();
}
document.addEventListener("focusout", () => setTimeout(() => {
  if (renderPendente && !editando()) { renderPendente = false; render(); }
}));

/* ---------- painel do item ---------- */
let focoAntesDoPainel = null;
function abrirPainel(id) {
  if (!S.item) focoAntesDoPainel = document.activeElement;
  S.item = id; S.novaOpcao = false;
  document.body.style.overflow = "hidden";
  render();
}
function fecharPainel() {
  document.querySelectorAll(".overlay,.sheet").forEach((x) => x.classList.remove("show"));
  setTimeout(() => {
    S.item = null; document.body.style.overflow = ""; rascunho = false; renderPendente = false; render();
    // o DOM foi refeito: devolve o foco ao elemento equivalente ao que abriu o painel
    const id = focoAntesDoPainel?.dataset?.id;
    (id && document.querySelector(`[data-act="abrir"][data-id="${id}"]`))?.focus({ preventScroll: true });
  }, ANIMACAO_PAINEL_MS);
}

/* ---------- ações sobre os dados ---------- */
/** Atualização otimista: mostra na hora e desfaz se o banco recusar. */
async function atualizarItem(id, valores, mensagem) {
  const it = itemPorId(id);
  const antes = { ...it };
  Object.assign(it, valores); render();
  try {
    Object.assign(it, await salvar("itens", "update", valores, id));
    render();
    if (mensagem) toast(mensagem);
  } catch {
    Object.assign(it, antes); render();
  }
}

async function marcarComprado(id, marcado) {
  const it = itemPorId(id);
  const escolhida = escolhidaDe(id);
  const valores = { status: marcado ? "comprado" : statusAoDesmarcar(!!escolhida, opcoesDe(id).length > 0) };
  if (marcado && it.preco_pago == null && escolhida?.preco != null) valores.preco_pago = escolhida.preco * it.quantidade;
  await atualizarItem(id, valores, marcado ? `${it.nome} marcado como comprado` : `${it.nome} voltou para a lista`);
}

/**
 * Mostra a mudança na hora e só depois grava. `aplicar` altera o estado e devolve
 * a função que desfaz; se o banco recusar, desfaz (salvar() já avisou o usuário).
 */
// shortcut: o desfazer restaura o estado anterior inteiro; se o outro membro mudar algo nesse meio-tempo, a recarga em tempo real corrige
async function otimista(aplicar, gravar, mensagem) {
  const desfazer = aplicar();
  render();
  try {
    await gravar();
    if (mensagem) toast(mensagem);
  } catch {
    desfazer();
    render();
  }
}

function salvarOrcamento() {
  const valor = lerNumero(document.getElementById("orc").value);
  const antes = S.config.orcamento_total;
  return otimista(
    () => { S.config.orcamento_total = valor; return () => (S.config.orcamento_total = antes); },
    () => salvar("config", "update", { orcamento_total: valor }, 1),
    "Orçamento salvo",
  );
}

function apagarItem(it) {
  if (!confirm(`Remover “${it.nome}” da lista? As opções e comentários dele também serão apagados.`)) return;
  const antes = S.itens;
  return otimista(
    () => {
      S.itens = S.itens.filter((i) => i.id !== it.id);
      S.item = null; document.body.style.overflow = "";
      return () => { S.itens = antes; S.item = it.id; document.body.style.overflow = "hidden"; };
    },
    () => salvar("itens", "delete", null, it.id),
    "Item removido",
  );
}

function alternarCurtida(opcaoId) {
  const o = S.opcoes.find((x) => x.id === opcaoId);
  const eu = meuId();
  const antes = o.curtidas;
  const curtidas = antes.includes(eu) ? antes.filter((u) => u !== eu) : [...antes, eu];
  return otimista(
    () => { o.curtidas = curtidas; return () => (o.curtidas = antes); },
    () => salvar("opcoes", "update", { curtidas }, opcaoId),
  );
}

/** Só uma opção escolhida por item; escolher também avança o status do item. */
function alternarEscolha(opcaoId, it) {
  const o = S.opcoes.find((x) => x.id === opcaoId);
  const marcar = !o.escolhida;
  const outras = opcoesDe(o.item_id).filter((x) => x.escolhida && x.id !== opcaoId);
  const novoStatus = marcar && ["nao_iniciado", "pesquisando"].includes(it.status) ? "escolhido" : null;
  const statusAntes = it.status;
  return otimista(
    () => {
      outras.forEach((x) => (x.escolhida = false));
      o.escolhida = marcar;
      if (novoStatus) it.status = novoStatus;
      return () => { outras.forEach((x) => (x.escolhida = true)); o.escolhida = !marcar; it.status = statusAntes; };
    },
    async () => {
      for (const outra of outras) await salvar("opcoes", "update", { escolhida: false }, outra.id);
      await salvar("opcoes", "update", { escolhida: marcar }, opcaoId);
      if (novoStatus) Object.assign(it, await salvar("itens", "update", { status: novoStatus }, it.id));
    },
    marcar ? "Opção escolhida" : "Escolha desfeita",
  );
}

function apagarOpcao(opcaoId) {
  if (!confirm("Remover esta opção?")) return;
  const antes = S.opcoes;
  return otimista(
    () => { S.opcoes = S.opcoes.filter((o) => o.id !== opcaoId); return () => (S.opcoes = antes); },
    () => salvar("opcoes", "delete", null, opcaoId),
    "Opção removida",
  );
}

function apagarComentario(comentarioId) {
  const antes = S.comentarios;
  return otimista(
    () => { S.comentarios = S.comentarios.filter((c) => c.id !== comentarioId); return () => (S.comentarios = antes); },
    () => salvar("comentarios", "delete", null, comentarioId),
  );
}

/* ---------- preencher opção pelo link ---------- */
const MSG_LINK = {
  loja_nao_suportada: "Esse link não é de um site público. Confira o endereço.",
  endereco_bloqueado: "Esse endereço não pode ser aberto. Confira o link.",
  produto_nao_identificado: "Não encontrei os dados do produto nessa página.",
  loja_indisponivel: "A loja não deixou ler a página agora.",
  redirecionamento_bloqueado: "O link redireciona para um endereço que não pode ser aberto.",
  nao_e_pagina: "Esse link não abre uma página de produto.",
  tempo_esgotado: "A loja demorou demais para responder. Tente de novo.",
  sem_acesso: "Sem permissão para usar esta função.",
};

async function colarLink() {
  try {
    document.getElementById("op-url").value = (await navigator.clipboard.readText()).trim();
  } catch {
    toast("Não consegui acessar a área de transferência. Segure no campo e escolha Colar.", true);
  }
}

/** Pesquisa o produto do link colado em outras lojas. Sem o formulário aberto, abre ele para colar o link. */
function acharMaisBarato(_el, it) {
  const campo = document.getElementById("op-url");
  const salvo = it?.link_produto;
  if (salvo && !campo?.value.trim()) return window.open(acharPromo(salvo), "_blank", "noopener");
  if (!campo) {
    S.novaOpcao = true; render();
    document.getElementById("link-msg").textContent = "Cole o link do produto e toque em Achar mais barato.";
    return document.getElementById("op-url").focus();
  }
  const url = campo.value.trim();
  if (!/^https:\/\//i.test(url)) {
    document.getElementById("link-msg").textContent = "Cole o link do produto primeiro (começando com https://).";
    return campo.focus();
  }
  window.open(acharPromo(url), "_blank", "noopener");
}

/* ---------- formulários ---------- */
function dadosDoItem(d) {
  return {
    nome: d.nome.trim(), comodo: d.comodo.trim(), categoria: d.categoria.trim() || "Geral",
    quantidade: Math.max(1, parseInt(d.quantidade) || 1), prioridade: d.prioridade, etapa: d.etapa,
    preco_pago: lerNumero(d.preco_pago),
    link_produto: textoOuNulo(d.link_produto), observacoes: textoOuNulo(d.observacoes), esquecido: !!d.esquecido,
  };
}

async function enviarItem(form) {
  const valores = dadosDoItem(lerForm(form));
  if (valores.link_produto && !/^https:\/\//i.test(valores.link_produto)) return toast("O link do produto precisa começar com https://", true);
  let id = S.item;
  const linkAntes = itemPorId(id)?.link_produto ?? null;
  if (id !== "novo") {
    await atualizarItem(id, valores, "Alterações salvas");
  } else {
    const novo = await salvar("itens", "insert", { ...valores, ordem: ORDEM_ITEM_NOVO });
    S.itens.push(novo); S.item = id = novo.id;
    render(); toast("Item adicionado");
  }
  const it = itemPorId(id);
  if (it?.link_produto && (it.link_produto !== linkAntes || !it.imagem_url)) fotoDoLink(it);
}

/** Busca a foto que a própria loja usa na página do produto e guarda no item. */
async function fotoDoLink(it) {
  const { data } = await sb.functions.invoke("ler-produto", { body: { url: it.link_produto } });
  const imagem = data?.produto?.imagem;
  if (imagem) return atualizarItem(it.id, { imagem_url: imagem }, "Foto do produto atualizada");
  toast("Não consegui pegar a foto dessa página.", true);
}

async function enviarOpcao(form) {
  const url = form.elements.url.value.trim();
  const msg = document.getElementById("link-msg");
  if (!/^https:\/\//i.test(url)) { msg.textContent = "Cole um link que comece com https://"; return form.elements.url.focus(); }
  if (opcoesDe(S.item).some((o) => o.url === url)) { msg.textContent = "Esse link já está nas opções deste item."; return; }
  const it = itemPorId(S.item);
  msg.textContent = "Lendo a página da loja…";
  const { data } = await sb.functions.invoke("ler-produto", { body: { url } });
  const nova = await salvar("opcoes", "insert", { item_id: S.item, ...opcaoDoLink(it.nome, url, data) });
  S.opcoes.push(nova); S.novaOpcao = false; rascunho = false;
  if (it.status === "nao_iniciado") await atualizarItem(it.id, { status: "pesquisando" });
  render();
  if (data?.produto) toast(nova.preco != null ? "Opção adicionada" : "Opção adicionada, sem preço na página");
  else toast(MSG_LINK[data?.erro] ? `Opção salva só com o link. ${MSG_LINK[data.erro]}` : "Opção salva só com o link: não consegui ler a página.", true);
}

async function enviarComentario(form) {
  const c = await salvar("comentarios", "insert", { item_id: S.item, texto: form.texto.value.trim() });
  S.comentarios.push(c); render(); toast("Comentário enviado");
}

const FORMULARIOS = { "form-item": enviarItem, "form-opcao": enviarOpcao, "form-comentario": enviarComentario };

/* ---------- eventos ---------- */
const ACOES = {
  sair: () => sb.auth.signOut(),
  abrir: (el) => abrirPainel(el.dataset.id),
  novo: () => abrirPainel("novo"),
  fechar: () => fecharPainel(),
  listaModo: (el) => { S.listaModo = el.dataset.v; render(); },
  abaVistoria: (el) => { S.abaVistoria = el.dataset.v; render(); },
  filtro: (el) => { S.filtro[el.dataset.k] = el.dataset.v; render(); },
  finPor: (el) => { S.finPor = el.dataset.v; render(); },
  salvarOrc: salvarOrcamento,
  status: (el, it) => atualizarItem(it.id, { status: el.dataset.v }, "Status atualizado"),
  apagarItem: (_el, it) => apagarItem(it),
  toggleOpcao: () => { S.novaOpcao = !S.novaOpcao; render(); },
  curtir: (el) => alternarCurtida(el.dataset.id),
  escolher: (el, it) => alternarEscolha(el.dataset.id, it),
  apagarOpcao: (el) => apagarOpcao(el.dataset.id),
  apagarComentario: (el) => apagarComentario(el.dataset.id),
  colarLink,
  acharMaisBarato,
};

$app.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-act]");
  const acao = el && ACOES[el.dataset.act]; // "check" e "busca" são tratados em change/input
  if (!acao) return;
  try { await acao(el, itemPorId(S.item)); } catch { /* salvar() já avisou o usuário */ }
});

$app.addEventListener("change", (e) => {
  const el = e.target.closest('[data-act="check"]');
  if (el) marcarComprado(el.dataset.id, el.checked);
});

$app.addEventListener("input", (e) => {
  if (e.target.closest(".sheet form")) rascunho = true;
  if (e.target.dataset.act !== "busca") return;
  S.filtro.q = e.target.value;
  document.getElementById("rooms").innerHTML = itensListaHTML(S.comodoAtual); // sem render() para não perder o foco da busca
});

$app.addEventListener("submit", async (e) => {
  const enviar = FORMULARIOS[e.target.id];
  if (!enviar) return;
  e.preventDefault();
  const botao = e.target.querySelector('[type="submit"]');
  botao.disabled = true;
  try { await enviar(e.target); liberarRender(); } catch { /* salvar() já avisou o usuário */ } finally { botao.disabled = false; }
});

document.addEventListener("keydown", (e) => { if (e.key === "Escape" && S.item) fecharPainel(); });
window.addEventListener("hashchange", () => {
  if (location.hash === "#view") return; // link "pular para o conteúdo"
  render(); scrollTo({ top: 0 });
});

/* ---------- sessão ---------- */
function renderLogin() {
  $app.innerHTML = telaLogin();
  const form = document.getElementById("auth");
  form.onsubmit = async (e) => {
    e.preventDefault();
    const d = lerForm(form);
    const msg = document.getElementById("auth-msg");
    const botao = form.querySelector('[type="submit"]');
    botao.disabled = true; msg.textContent = "Aguarde…";
    const { error } = await sb.auth.signInWithPassword({ email: d.email, password: d.senha });
    botao.disabled = false;
    msg.textContent = error ? "Não foi possível entrar. Confira o e-mail e a senha." : "";
  };
}

let iniciado = false;
async function iniciar(session) {
  S.session = session;
  if (!session) { iniciado = false; return render(); }
  if (iniciado) return;
  iniciado = true;
  const { data } = await sb.rpc("eh_membro");
  S.souMembro = !!data;
  if (S.souMembro) { await carregar(); ouvirMudancas(renderRemoto); }
  render();
}
// setTimeout: chamar o Supabase direto dentro deste listener pode travar o cliente
sb.auth.onAuthStateChange((_e, session) => setTimeout(() => iniciar(session)));
