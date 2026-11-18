// Ponto de entrada: navegação, eventos da interface e sessão.
import { statusAoDesmarcar } from "./calculos.js";
import { esc, lerNumero, numeroParaCampo, textoOuNulo, urlOk } from "./formato.js";
import { lerForm, toast } from "./ui.js";
import { acharPromo } from "./dominio.js";
import { S, carregar, escolhidaDe, itemPorId, meuId, opcoesDe, ouvirMudancas, salvar, sb } from "./estado.js";
import { comodosHTML, painelItem, telaEsquecidos, telaEtapas, telaFinancas, telaInicio, telaLista, telaLogin, telaSemAcesso } from "./telas.js";

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
const rotaAtual = () => (location.hash.slice(1) in ROTAS ? location.hash.slice(1) : "inicio");

let rotaAnterior = null;
function render() {
  if (!S.session) return renderLogin();
  if (!S.souMembro) { $app.innerHTML = telaSemAcesso(); return; }
  const rota = rotaAtual();
  const entrou = rota !== rotaAnterior; // anima só ao trocar de página, não a cada atualização
  rotaAnterior = rota;
  const painelAntes = document.querySelector(".sheet.show");
  const rolagemPainel = painelAntes?.scrollTop ?? 0;
  $app.innerHTML = `<a class="skip" href="#view">Pular para o conteúdo</a><div class="shell">
    <header class="top">
      <a class="brand" href="#inicio">Nosso Primeiro Lar</a>
      <nav class="nav" aria-label="Principal">${Object.entries(ROTAS).map(([k, [rotulo]]) => `<a href="#${k}" class="${k === rota ? "on" : ""}"${k === rota ? ' aria-current="page"' : ""}>${rotulo}</a>`).join("")}</nav>
      <div class="who"><span>${esc(S.membros[meuId()] || "")}</span><button class="linkbtn" data-act="sair">Sair</button></div>
    </header>
    <main class="view${entrou ? " enter" : ""}" id="view" tabindex="-1">${ROTAS[rota][1]()}</main>
  </div>${S.item ? painelItem() : ""}`;
  document.title = `${ROTAS[rota][0]} · Nosso Primeiro Lar`;
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
const rascunhoAtivo = () => { rascunho = true; };
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
  produto_nao_identificado: "Não encontrei os dados do produto nessa página. Preencha à mão.",
  loja_indisponivel: "A loja não deixou ler a página agora. Preencha à mão ou tente mais tarde.",
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
function acharMaisBarato() {
  const campo = document.getElementById("op-url");
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

async function lerLink() {
  const form = document.getElementById("form-opcao");
  const campo = (n) => form.elements[n];
  const msg = document.getElementById("link-msg");
  const url = campo("url").value.trim();
  if (!/^https:\/\//i.test(url)) { msg.textContent = "Cole um link que comece com https://"; campo("url").focus(); return; }
  const botao = form.querySelector('[data-act="lerLink"]');
  botao.disabled = true; msg.textContent = "Lendo a página da loja…";
  const { data, error } = await sb.functions.invoke("ler-produto", { body: { url } });
  botao.disabled = false;
  if (error || !data?.produto) {
    msg.textContent = MSG_LINK[data?.erro] || "Não foi possível ler o link agora. Preencha à mão.";
    return;
  }
  const p = data.produto;
  const emReais = !p.moeda || p.moeda === "BRL";
  const preencher = (n, v) => { if (v != null && v !== "") campo(n).value = v; };
  preencher("nome", p.nome);
  preencher("loja", data.loja);
  preencher("url", data.url);
  if (emReais) preencher("preco", numeroParaCampo(p.preco));
  preencher("imagem_url", p.imagem);
  const detalhes = [p.marca && `Marca: ${p.marca}`, p.modelo && `Modelo: ${p.modelo}`, p.gtin && `Código de barras: ${p.gtin}`,
    p.sku && `Código na loja: ${p.sku}`, p.disponivel === false && "Indisponível na consulta"].filter(Boolean).join("\n");
  if (detalhes && !campo("caracteristicas").value) campo("caracteristicas").value = detalhes;
  campo("consultado_em").value = data.consultado_em;
  rascunhoAtivo();
  msg.textContent = `Dados de ${data.loja} preenchidos${p.preco == null || !emReais ? ", sem preço" : ""}. Confira, informe o frete se souber e salve.`;
}

function alternarComodo(el) {
  const c = el.dataset.c;
  S.abertos.has(c) ? S.abertos.delete(c) : S.abertos.add(c);
  el.closest(".room").classList.toggle("open");
  el.setAttribute("aria-expanded", S.abertos.has(c));
}

/* ---------- formulários ---------- */
function dadosDoItem(d) {
  return {
    nome: d.nome.trim(), comodo: d.comodo.trim(), categoria: d.categoria.trim() || "Geral",
    quantidade: Math.max(1, parseInt(d.quantidade) || 1), prioridade: d.prioridade, etapa: d.etapa,
    preco_estimado: lerNumero(d.preco_estimado), preco_pago: lerNumero(d.preco_pago),
    imagem_url: textoOuNulo(d.imagem_url), descricao: textoOuNulo(d.descricao),
    preferencia: textoOuNulo(d.preferencia), observacoes: textoOuNulo(d.observacoes), esquecido: !!d.esquecido,
  };
}

async function enviarItem(form) {
  const valores = dadosDoItem(lerForm(form));
  if (valores.imagem_url && !urlOk(valores.imagem_url)) return toast("O link da foto precisa começar com https://", true);
  if (S.item !== "novo") return atualizarItem(S.item, valores, "Alterações salvas");
  const novo = await salvar("itens", "insert", { ...valores, ordem: ORDEM_ITEM_NOVO });
  S.itens.push(novo); S.item = novo.id; S.abertos.add(novo.comodo);
  render(); toast("Item adicionado");
}

async function enviarOpcao(form) {
  const d = lerForm(form);
  const url = textoOuNulo(d.url), imagem = textoOuNulo(d.imagem_url);
  if ((url && !urlOk(url)) || (imagem && !urlOk(imagem))) return toast("Os links precisam começar com https://", true);
  const nova = await salvar("opcoes", "insert", {
    item_id: S.item, nome: d.nome.trim(), loja: textoOuNulo(d.loja), preco: lerNumero(d.preco), frete: lerNumero(d.frete),
    consultado_em: d.consultado_em || null, url, imagem_url: imagem,
    caracteristicas: textoOuNulo(d.caracteristicas), observacoes: textoOuNulo(d.observacoes),
  });
  S.opcoes.push(nova); S.novaOpcao = false;
  const it = itemPorId(S.item);
  if (it.status === "nao_iniciado") await atualizarItem(it.id, { status: "pesquisando" });
  render(); toast("Opção adicionada");
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
  room: alternarComodo,
  irComodo: (el) => S.abertos.add(el.dataset.c),
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
  lerLink,
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
  document.getElementById("rooms").innerHTML = comodosHTML(); // sem render() para não perder o foco da busca
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
