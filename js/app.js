// Ponto de entrada: navegação, eventos da interface e sessão.
import { statusAoDesmarcar } from "./calculos.js";
import { esc, lerNumero, textoOuNulo, urlOk } from "./formato.js";
import { lerForm, toast } from "./ui.js";
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

function render() {
  if (!S.session) return renderLogin();
  if (!S.souMembro) { $app.innerHTML = telaSemAcesso(); return; }
  const rota = rotaAtual();
  $app.innerHTML = `<div class="shell">
    <header class="top">
      <a class="brand" href="#inicio">Nosso Primeiro Lar</a>
      <nav class="nav">${Object.entries(ROTAS).map(([k, [rotulo]]) => `<a href="#${k}" class="${k === rota ? "on" : ""}">${rotulo}</a>`).join("")}</nav>
      <div class="who"><span>${esc(S.membros[meuId()] || "")}</span><button class="linkbtn" data-act="sair">Sair</button></div>
    </header>
    <main class="view" id="view">${ROTAS[rota][1]()}</main>
  </div>${S.item ? painelItem() : ""}`;
  if (S.item) requestAnimationFrame(() => document.querySelectorAll(".overlay,.sheet").forEach((e) => e.classList.add("show")));
}

/* ---------- painel do item ---------- */
function abrirPainel(id) {
  S.item = id; S.novaOpcao = false;
  document.body.style.overflow = "hidden";
  render();
}
function fecharPainel(animar = true) {
  const fechar = () => { S.item = null; document.body.style.overflow = ""; render(); };
  if (!animar) return fechar();
  document.querySelectorAll(".overlay,.sheet").forEach((x) => x.classList.remove("show"));
  setTimeout(fechar, ANIMACAO_PAINEL_MS);
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

async function salvarOrcamento() {
  const valor = lerNumero(document.getElementById("orc").value);
  const { error } = await sb.from("config").update({ orcamento_total: valor }).eq("id", 1);
  if (error) return toast("Não foi possível salvar o orçamento.", true);
  S.config.orcamento_total = valor; render(); toast("Orçamento salvo");
}

async function apagarItem(it) {
  if (!confirm(`Remover “${it.nome}” da lista? As opções e comentários dele também serão apagados.`)) return;
  await salvar("itens", "delete", null, it.id);
  S.itens = S.itens.filter((i) => i.id !== it.id);
  fecharPainel(false);
  toast("Item removido");
}

async function alternarCurtida(opcaoId) {
  const o = S.opcoes.find((x) => x.id === opcaoId);
  const eu = meuId();
  const curtidas = o.curtidas.includes(eu) ? o.curtidas.filter((u) => u !== eu) : [...o.curtidas, eu];
  Object.assign(o, await salvar("opcoes", "update", { curtidas }, opcaoId));
  render();
}

/** Só uma opção escolhida por item; escolher também avança o status do item. */
async function alternarEscolha(opcaoId, it) {
  const o = S.opcoes.find((x) => x.id === opcaoId);
  const marcar = !o.escolhida;
  for (const outra of opcoesDe(o.item_id).filter((x) => x.escolhida && x.id !== opcaoId)) {
    Object.assign(outra, await salvar("opcoes", "update", { escolhida: false }, outra.id));
  }
  Object.assign(o, await salvar("opcoes", "update", { escolhida: marcar }, opcaoId));
  if (marcar && ["nao_iniciado", "pesquisando"].includes(it.status)) await atualizarItem(it.id, { status: "escolhido" });
  render();
  toast(marcar ? "Opção escolhida" : "Escolha desfeita");
}

async function apagarOpcao(opcaoId) {
  if (!confirm("Remover esta opção?")) return;
  await salvar("opcoes", "delete", null, opcaoId);
  S.opcoes = S.opcoes.filter((o) => o.id !== opcaoId);
  render(); toast("Opção removida");
}

async function apagarComentario(comentarioId) {
  await salvar("comentarios", "delete", null, comentarioId);
  S.comentarios = S.comentarios.filter((c) => c.id !== comentarioId);
  render();
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
    item_id: S.item, nome: d.nome.trim(), loja: textoOuNulo(d.loja), preco: lerNumero(d.preco), url, imagem_url: imagem,
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
  try { await enviar(e.target); } catch { /* salvar() já avisou o usuário */ } finally { botao.disabled = false; }
});

document.addEventListener("keydown", (e) => { if (e.key === "Escape" && S.item) fecharPainel(); });
window.addEventListener("hashchange", () => { render(); scrollTo({ top: 0 }); });

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
  if (S.souMembro) { await carregar(); ouvirMudancas(render); }
  render();
}
// setTimeout: chamar o Supabase direto dentro deste listener pode travar o cliente
sb.auth.onAuthStateChange((_e, session) => setTimeout(() => iniciar(session)));
