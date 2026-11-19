// Geração do HTML de cada tela. Só lê o estado; ações ficam em app.js.
import { ETAPAS, ITEM_NOVO, PRODUTOS_VISTORIA, VISTORIA, ehProdutoVistoria, ehVistoria, ORDEM_PRIORIDADE, PRIORIDADES, STATUS, DATA_MUDANCA_PADRAO } from "./dominio.js";
import { comprado, contagemRegressiva, maisBarata, resumo, totalOpcao } from "./calculos.js";
import { brl, dataBR, esc, numeroParaCampo, pct, urlOk } from "./formato.js";
import { iconeDoComodo, iconeDoItem, svg } from "./icones.js";
import { ICONES, barra, cabecalhoPagina, foto, linkExterno, progresso, segmentos } from "./ui.js";
import { S, comodos, estimadoDe, fotoDe, itemPorId, meuId, nomeDe, opcoesDe } from "./estado.js";

const compras = () => S.itens.filter((i) => !ehVistoria(i));
const resumoDe = (itens = compras()) => resumo(itens, S.opcoes);
const pendentesPrimeiro = (a, b) => comprado(a) - comprado(b);
const plural = (n, um, varios) => (n > 1 ? varios : um);
const estatistica = (rotulo, valor) => `<div class="stat"><span class="eyebrow">${rotulo}</span><b>${valor}</b></div>`;

/* ---------- componentes de item ---------- */
function linhaItem(it) {
  const valor = comprado(it) && it.preco_pago != null ? it.preco_pago : estimadoDe(it);
  const nOpcoes = opcoesDe(it.id).length;
  return `<div class="check-row ${comprado(it) ? "done" : ""}">
    <input type="checkbox" class="cbox" data-act="check" data-id="${it.id}" ${comprado(it) ? "checked" : ""} aria-label="Marcar ${esc(it.nome)} como ${ehVistoria(it) ? "conferido" : "comprado"}">
    ${foto(fotoDe(it), it.nome, "photo thumb", iconeDoItem(it))}
    <button class="open" data-act="abrir" data-id="${it.id}">
      <div class="name">${esc(it.nome)}${it.quantidade > 1 ? ` <span class="muted small">× ${it.quantidade}</span>` : ""}</div>
      <span class="tag"><i class="dot ${comprado(it) ? "comprado" : it.prioridade}"></i>${ehProdutoVistoria(it) ? (comprado(it) ? "Comprado" : "A comprar") : ehVistoria(it) ? (comprado(it) ? "Conferido" : "A conferir") : `${PRIORIDADES[it.prioridade]} · ${STATUS[it.status]}`}${nOpcoes ? ` · ${nOpcoes} ${plural(nOpcoes, "opção", "opções")}` : ""}</span>
    </button>
    <span class="price">${valor != null ? brl(valor) : ""}</span>
  </div>`;
}

/* ---------- Início (painéis) ---------- */
/** Anel de progresso com a porcentagem no meio. */
function anel(p) {
  const c = 2 * Math.PI * 18;
  return `<span class="anel" role="img" aria-label="${p}%"><svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="18"/><circle class="anel-valor" cx="22" cy="22" r="18" stroke-dasharray="${(c * Math.min(p, 100)) / 100} ${c}"/></svg><b>${p}%</b></span>`;
}

const miniPainel = (href, icone, rotulo, valor, p) => `<a class="painel mini" href="${href}">
    <span class="mini-topo"><span class="ico-box">${svg(icone)}</span>${p == null ? "" : anel(p)}</span>
    <span class="mini-rotulo">${rotulo}</span><span class="mini-valor">${valor}</span></a>`;

/** Data de hoje no topo do Início. */
function dataDeHoje() {
  const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  return `<header class="saudacao"><span class="muted">${esc(hoje[0].toUpperCase() + hoje.slice(1))}</span></header>`;
}

export function telaInicio() {
  const t = resumoDe();
  const c = contagemRegressiva(S.config.data_mudanca || DATA_MUDANCA_PADRAO);
  const mes = c.alvo.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const orc = S.config.orcamento_total;
  const esquecidos = compras().filter((i) => i.esquecido);
  const vistoria = S.itens.filter((i) => ehVistoria(i) && !ehProdutoVistoria(i));
  const conta = (lista) => lista.filter(comprado).length;
  return `${dataDeHoje()}
    <section class="painel destaque">
      <span class="eyebrow">Mudança em ${esc(mes)}</span>
      <div class="destaque-num">${c.dias.toLocaleString("pt-BR")} <small>dias</small></div>
      <div class="linha"><span>Meses para planejar</span><b>${c.meses}</b></div>
      <div class="linha"><span class="muted">Compras feitas</span><b>${t.comprados} de ${t.total}</b></div>
      <div class="linha caixa-linha"><span class="muted">Ainda reservar</span><b class="destaque-valor">${brl(t.reservar)}</b></div>
    </section>
    <a class="painel financeiro" href="#financas">
      <span class="mini-topo"><span class="ico-box">${svg("carteira")}</span><span><span class="mini-rotulo">Total estimado</span><span class="mini-valor">${brl(t.estTotal)}</span></span></span>
      <span class="barra-dupla" aria-hidden="true"><i class="gasto" style="flex:${t.gasto || 0}"></i><i class="falta" style="flex:${t.reservar || 0}"></i></span>
      <span class="linha-legenda"><span><i class="ponto gasto"></i>Gasto ${brl(t.gasto)}</span><span><i class="ponto falta"></i>Falta ${brl(t.reservar)}</span></span>
    </a>
    <div class="paineis">
      ${miniPainel("#lista", "sacola", "Compras", `${t.comprados} de ${t.total}`, pct(t.comprados, t.total))}
      ${miniPainel("#financas", "carteira", "Orçamento", orc ? brl(t.gasto) : "Sem orçamento", orc ? pct(t.gasto, orc) : null)}
      ${miniPainel("#esquecidos", "lampada", "Esquecidos", `${conta(esquecidos)} de ${esquecidos.length}`, pct(conta(esquecidos), esquecidos.length))}
      ${miniPainel(linkComodo(VISTORIA), "checklist", "Vistoria", `${conta(vistoria)} de ${vistoria.length}`, pct(conta(vistoria), vistoria.length))}
    </div>
    <h2 class="eyebrow secao-painel">Por cômodo</h2>
    <div class="painel lista-painel">${comodos().filter((cm) => cm !== VISTORIA).map((cm) => {
      const tc = resumoDe(S.itens.filter((i) => i.comodo === cm));
      return `<a class="linha-comodo" href="${linkComodo(cm)}"><span class="ico-box sm">${iconeDoComodo(cm)}</span><span class="linha-nome">${esc(cm)}<span class="small muted">${tc.comprados} de ${tc.total}</span></span>${anel(pct(tc.comprados, tc.total))}</a>`;
    }).join("")}</div>`;
}

/* ---------- Lista ---------- */
function filtrar(lista) {
  const { q, status, prio } = S.filtro;
  const busca = q.trim().toLowerCase();
  const passaStatus = (i) => status === "todos" || (status === "pendentes" ? !comprado(i) : comprado(i));
  return lista.filter((i) => (!busca || `${i.nome} ${i.categoria}`.toLowerCase().includes(busca)) && passaStatus(i) && (prio === "todas" || i.prioridade === prio));
}

const linkComodo = (cm) => `#comodo/${encodeURIComponent(cm)}`;

/** Itens já filtrados, agrupados por categoria. */
function porCategoria(lista) {
  if (!lista.length) return `<p class="empty">Nenhum item com esses filtros.</p>`;
  const categorias = [...new Set(lista.map((i) => i.categoria))];
  return categorias.map((c) => `<div class="eyebrow cat-title">${esc(c)}</div><div class="check-list">${lista.filter((i) => i.categoria === c).map(linhaItem).join("")}</div>`).join("");
}

/** Conteúdo filtrado da lista: um cômodo só, ou todos juntos (aba "Tudo"). Atualizado direto pela busca. */
/** Na vistoria, só os itens da aba aberta (checklist ou produtos). */
const daAba = (i) => i.comodo !== VISTORIA || ehProdutoVistoria(i) === (S.abaVistoria === "produtos");

export function itensListaHTML(cm) {
  if (cm) return porCategoria(filtrar(S.itens.filter((i) => i.comodo === cm && daAba(i))));
  const blocos = comodos().map((c) => [c, filtrar(S.itens.filter((i) => i.comodo === c))]).filter(([, l]) => l.length);
  if (!blocos.length) return `<p class="empty">Nenhum item com esses filtros.</p>`;
  return blocos.map(([c, l]) => `<section class="grupo-comodo"><a class="grupo-titulo" href="${linkComodo(c)}"><h2 class="h2">${esc(c)}</h2>${ICONES.chev}</a>${porCategoria(l)}</section>`).join("");
}

const filtros = (comPrioridade) => {
  const f = S.filtro;
  return `<div class="toolbar">
      <input class="input" type="search" placeholder="Buscar item" value="${esc(f.q)}" data-act="busca" aria-label="Buscar item">
      ${segmentos([["todos", "Todos"], ["pendentes", "Pendentes"], ["comprados", "Feitos"]], f.status, 'data-act="filtro" data-k="status"')}
      ${comPrioridade ? segmentos([["todas", "Todas"], ["essencial", "Essenciais"], ["importante", "Importantes"], ["complementar", "Complementares"]], f.prio, 'data-act="filtro" data-k="prio"') : ""}
    </div>`;
};

function cartaoComodo(cm) {
  const t = resumo(S.itens.filter((i) => i.comodo === cm), S.opcoes);
  return `<a class="tile" href="${linkComodo(cm)}">
      <span class="tile-ico">${iconeDoComodo(cm)}</span>
      <span class="tile-nome">${esc(cm)}</span>
      <span class="small muted">${t.comprados} de ${t.total} ${cm === VISTORIA ? "conferidos" : "comprados"}</span>
      ${barra(pct(t.comprados, t.total), "thin")}
    </a>`;
}

export function telaLista() {
  const modo = S.listaModo;
  return `<section class="hero page titulo-linha"><h1 class="display page-title">Lista de compras</h1>
      ${segmentos([["comodos", "Por cômodo"], ["tudo", "Tudo"]], modo, 'data-act="listaModo"')}</section>
    ${modo === "tudo"
      ? `${filtros(true)}<div class="rooms" id="rooms">${itensListaHTML(null)}</div>`
      : `<div class="tiles">${comodos().map(cartaoComodo).join("")}</div>`}`;
}

/** Página de um cômodo: só os itens dele, por categoria. */
export function telaComodo(cm) {
  if (!comodos().includes(cm)) return `<p class="empty">Cômodo não encontrado. <a href="#lista">Voltar para a lista</a></p>`;
  const todos = S.itens.filter((i) => i.comodo === cm && daAba(i));
  const t = resumo(todos, S.opcoes);
  const vistoria = cm === VISTORIA;
  const produtos = vistoria && S.abaVistoria === "produtos";
  return `<a class="voltar" href="#lista">${ICONES.voltar} Lista</a>
    <section class="hero page comodo-hero">
      <span class="comodo-ico">${iconeDoComodo(cm)}</span>
      ${cabecalhoPagina(vistoria ? "Checklist" : "Cômodo", esc(cm))}
      <div class="progress-box">${progresso(`${t.comprados} de ${t.total} ${vistoria && !produtos ? "conferidos" : "comprados"}`, t.comprados, t.total)}</div>
    </section>
    ${vistoria ? `<div class="toolbar">${segmentos([["checklist", "Checklist"], ["produtos", "Produtos"]], S.abaVistoria, 'data-act="abaVistoria"')}</div>` : ""}
    <div class="toolbar"><button class="btn sm" data-act="novo">Adicionar item</button></div>
    ${filtros(!vistoria)}
    <div class="rooms" id="rooms">${itensListaHTML(cm)}</div>`;
}

/* ---------- Esquecidos ---------- */
export function telaEsquecidos() {
  const lista = S.itens.filter((i) => i.esquecido).sort(pendentesPrimeiro);
  const feitos = lista.filter(comprado).length;
  return `<section class="hero page">
    <h1 class="display page-title">Pequenos essenciais</h1>
    <div class="progress-box">${progresso(`${feitos} de ${lista.length} garantidos`, feitos, lista.length)}</div>
  </section>
  <section class="section section-near"><div class="check-list">${lista.map(linhaItem).join("") || `<p class="empty padded">Nenhum item marcado.</p>`}</div></section>`;
}

/* ---------- Etapas ---------- */
export function telaEtapas() {
  const coluna = ([etapa, [titulo, descricao]]) => {
    const lista = compras().filter((i) => i.etapa === etapa).sort((a, b) => pendentesPrimeiro(a, b) || ORDEM_PRIORIDADE[a.prioridade] - ORDEM_PRIORIDADE[b.prioridade]);
    const feitos = lista.filter(comprado).length;
    return `<div class="stage"><div><h2 class="h2 stage-title">${titulo}</h2><p class="muted small stage-desc">${descricao}</p></div>
      ${progresso(`${feitos} de ${lista.length}`, feitos, lista.length, "thin")}
      <ul>${lista.map((i) => `<li class="${comprado(i) ? "done" : ""}"><button data-act="abrir" data-id="${i.id}"><span>${esc(i.nome)}</span><span class="muted small">${esc(i.comodo)}</span></button></li>`).join("")}</ul></div>`;
  };
  return `<section class="hero page">${cabecalhoPagina("Sem pressa", "Compras por etapa", "A ideia não é comprar tudo agora: é saber o que pesquisar, acompanhar preços e aproveitar boas oportunidades até a mudança.")}</section>
    <div class="stages section section-close">${Object.entries(ETAPAS).map(coluna).join("")}</div>`;
}

/* ---------- Finanças ---------- */
export function telaFinancas() {
  const t = resumoDe();
  const orc = S.config.orcamento_total;
  const chave = S.finPor;
  const ordemComodos = comodos();
  const grupos = [...new Set(compras().map((i) => i[chave]))]
    .sort((a, b) => (chave === "comodo" ? ordemComodos.indexOf(a) - ordemComodos.indexOf(b) : a.localeCompare(b, "pt-BR")));
  const maiorValor = Math.max(orc || 0, t.estTotal, t.gasto, 1);
  const comOrcamento = (f) => (orc != null ? brl(f(orc)) : "—");
  return `<section class="hero page">${cabecalhoPagina("Planejamento financeiro", "Quanto custa o lar")}</section>
    <section class="section section-close">
      <div class="fields budget-form">
        <label class="field">Orçamento total planejado (R$)<input class="input" inputmode="decimal" id="orc" value="${numeroParaCampo(orc)}" placeholder="Ex.: 40000"></label>
        <button class="btn ghost self-start" data-act="salvarOrc">Salvar orçamento</button>
      </div>
    </section>
    <section class="section">
      <div class="stats">
        ${estatistica("Orçamento", brl(orc))}${estatistica("Estimado", brl(t.estTotal))}${estatistica("Gasto real", brl(t.gasto))}
        ${estatistica("Restante a comprar", brl(t.reservar))}${estatistica("Saldo do orçamento", comOrcamento((o) => o - t.gasto))}${estatistica("Folga prevista", comOrcamento((o) => o - t.gasto - t.reservar))}
      </div>
      <div class="compare-bars">
        ${[["Orçamento", orc || 0], ["Estimado", t.estTotal], ["Gasto real", t.gasto]].map(([l, v]) => `<div><div class="between small"><span class="muted">${l}</span><span>${brl(v)}</span></div>${barra(pct(v, maiorValor))}</div>`).join("")}
      </div>
      ${orc != null && t.gasto + t.reservar > orc ? `<p class="small alert">A previsão atual passa o orçamento em ${brl(t.gasto + t.reservar - orc)}.</p>` : ""}
    </section>
    <section class="section">
      <div class="section-head"><div><span class="eyebrow">Detalhamento</span><h2 class="h2">Gastos por ${chave === "comodo" ? "cômodo" : "categoria"}</h2></div>
        ${segmentos([["comodo", "Cômodo"], ["categoria", "Categoria"]], chave, 'data-act="finPor"')}</div>
      <div class="fin"><div class="fin-row head"><span>${chave === "comodo" ? "Cômodo" : "Categoria"}</span><span>Estimado</span><span>Gasto</span><span>Falta</span></div>
      ${grupos.map((g) => {
        const tg = resumoDe(compras().filter((i) => i[chave] === g));
        return `<div class="fin-row"><span>${esc(g)}</span><span data-l="Estimado">${brl(tg.estTotal)}</span><span data-l="Gasto">${brl(tg.gasto)}</span><span data-l="Falta">${brl(tg.reservar)}</span>${barra(pct(tg.gasto, tg.gasto + tg.reservar), "thin")}</div>`;
      }).join("")}</div>
      <p class="muted small">Estimado usa o preço estimado do item (ou da opção escolhida) multiplicado pela quantidade. Gasto considera o valor pago registrado nos itens comprados.</p>
    </section>`;
}

/* ---------- Detalhe do item ---------- */
const select = (nome, opcoes, valor) =>
  `<select class="input" name="${nome}">${Object.entries(opcoes).map(([k, l]) => `<option value="${k}" ${k === valor ? "selected" : ""}>${l}</option>`).join("")}</select>`;

function historico(it) {
  const por = (uid, semAutor) => (uid ? `por ${esc(nomeDe(uid))} ` : semAutor);
  return `<p class="muted small meta">Adicionado ${por(it.criado_por, "na lista inicial ")}em ${dataBR(it.criado_em)} · Atualizado ${por(it.atualizado_por, "")}em ${dataBR(it.atualizado_em)}</p>`;
}

function formItem(it, novo) {
  const rotulosEtapa = Object.fromEntries(Object.entries(ETAPAS).map(([k, [titulo]]) => [k, titulo]));
  return `<form id="form-item" class="fields">
    <label class="field full">Nome<input class="input" name="nome" required maxlength="120" value="${esc(it.nome)}"></label>
    <label class="field">Cômodo<input class="input" name="comodo" list="lista-comodos" required value="${esc(it.comodo)}"><datalist id="lista-comodos">${comodos().map((c) => `<option value="${esc(c)}">`).join("")}</datalist></label>
    <label class="field">Categoria<input class="input" name="categoria" required value="${esc(it.categoria)}"></label>
    <label class="field">Quantidade<input class="input" name="quantidade" type="number" min="1" value="${it.quantidade}"></label>
    <label class="field">Prioridade${select("prioridade", PRIORIDADES, it.prioridade)}</label>
    <label class="field">Etapa${select("etapa", rotulosEtapa, it.etapa)}</label>
    <label class="field">Valor pago no total (R$)<input class="input" name="preco_pago" inputmode="decimal" value="${numeroParaCampo(it.preco_pago)}"></label>
    <label class="field full">Link do produto<input class="input" name="link_produto" type="url" inputmode="url" placeholder="Cole o link da loja" autocomplete="off" value="${esc(it.link_produto)}"></label>
    <label class="field full">Observações<textarea class="input" name="observacoes">${esc(it.observacoes)}</textarea></label>
    <label class="row check-label small full muted"><input type="checkbox" class="cbox" name="esquecido" ${it.esquecido ? "checked" : ""}> Item pequeno que costuma ser esquecido</label>
    <div class="row full"><button class="btn" type="submit">${novo ? "Adicionar à lista" : "Salvar alterações"}</button>${novo ? "" : `<button class="btn danger" type="button" data-act="apagarItem">Remover item</button>`}</div>
  </form>`;
}

const formOpcao = () => `<form id="form-opcao" class="callout option-form">
    <label class="field" for="op-url">Link do produto em outra loja</label>
    <div class="link-row"><input class="input" id="op-url" name="url" type="url" inputmode="url" placeholder="Cole aqui o link da loja" autocomplete="off" required>
      <button class="btn sm ghost" type="button" data-act="colarLink">Colar</button></div>
    <div class="row"><button class="btn sm" type="submit">Salvar opção</button>
      <button class="btn sm ghost" type="button" data-act="acharMaisBarato">Achar mais barato</button></div>
    <p class="small muted link-msg" id="link-msg" role="status" aria-live="polite">Nome, loja, preço e foto são lidos da página ao salvar.</p>
  </form>`;

function opcaoHTML(o) {
  const gosto = o.curtidas.includes(meuId());
  const quemGostou = o.curtidas.map(nomeDe).join(" e ");
  return `<div class="opt ${o.escolhida ? "chosen" : ""}">
    ${foto(o.imagem_url, o.nome, "photo", iconeDoItem(itemPorId(o.item_id) ?? o))}
    <div class="opt-body">
      <div class="between"><span class="eyebrow">${esc(o.loja || "Loja não informada")}${o.escolhida ? " · Escolhida" : ""}</span></div>
      <div class="opt-name">${esc(o.nome)}</div>
      <div class="opt-price">${brl(o.preco)}</div>
      <div class="small muted">${o.frete == null ? "Frete não informado" : o.frete > 0 ? `Frete ${brl(o.frete)} · Total ${brl(totalOpcao(o))}` : "Frete grátis"}${o.consultado_em ? ` · Preço de ${dataBR(o.consultado_em)}` : ""}</div>
      ${o.caracteristicas ? `<div class="small muted pre">${esc(o.caracteristicas)}</div>` : ""}
      ${o.observacoes ? `<div class="small pre">${esc(o.observacoes)}</div>` : ""}
      ${quemGostou ? `<div class="small muted">Gostou: ${esc(quemGostou)}</div>` : ""}
      <div class="small muted">Adicionada por ${esc(nomeDe(o.criado_por))} em ${dataBR(o.criado_em)}</div>
      <div class="opt-actions">
        ${linkExterno(o.url, "Abrir loja")}
        <button class="pill ${gosto ? "on" : ""}" data-act="curtir" data-id="${o.id}" aria-pressed="${gosto}">${ICONES.heart} ${gosto ? "Eu gosto" : "Gostei"}</button>
        <button class="pill ${o.escolhida ? "on" : ""}" data-act="escolher" data-id="${o.id}" aria-pressed="${o.escolhida}">${o.escolhida ? "Escolhida" : "Escolher esta"}</button>
        <button class="pill danger" data-act="apagarOpcao" data-id="${o.id}" aria-label="Remover opção ${esc(o.nome)}">Remover</button>
      </div>
    </div></div>`;
}

function tabelaComparacao(opcoes) {
  const melhor = maisBarata(opcoes);
  const preferencia = (o) => (o.escolhida ? "Escolhida" : o.curtidas.length ? `${o.curtidas.length} ${plural(o.curtidas.length, "curtida", "curtidas")}` : "—");
  const total = (o) => (totalOpcao(o) != null ? brl(totalOpcao(o)) : o.preco != null ? `${brl(o.preco)} + frete` : "—");
  const selo = melhor && `<span class="badge">${melhor.comFrete ? "Menor total" : "Menor preço"}</span>`;
  return `<div class="compare-wrap"><table class="compare"><thead><tr><th>Produto</th><th>Loja</th><th>Preço</th><th>Frete</th><th>Total</th><th>Preferência</th></tr></thead><tbody>
    ${opcoes.map((o) => `<tr><td>${esc(o.nome)}${melhor?.id === o.id ? ` ${selo}` : ""}</td><td>${esc(o.loja || "—")}</td><td class="nowrap">${brl(o.preco)}</td><td class="nowrap">${o.frete == null ? "—" : brl(o.frete)}</td><td class="nowrap">${total(o)}</td><td>${preferencia(o)}</td></tr>`).join("")}
  </tbody></table></div>
  ${melhor && !melhor.comFrete ? `<p class="small muted">Sem frete informado, a comparação usa só o preço do produto.</p>` : ""}`;
}

function secaoOpcoes(it) {
  const opcoes = opcoesDe(it.id);
  return `<div>
    <div class="between"><div><span class="eyebrow">Comparação</span><h3 class="h2 sub-title">Opções encontradas</h3></div><button class="btn sm ghost" data-act="toggleOpcao">${S.novaOpcao ? "Cancelar" : "Adicionar opção"}</button></div>
    ${S.novaOpcao ? formOpcao() : `<button class="btn achar" type="button" data-act="acharMaisBarato">Achar mais barato</button>`}
    <div class="options">${opcoes.map(opcaoHTML).join("") || `<p class="muted small">Nenhuma opção ainda. Adicionem links de lojas diferentes para comparar.</p>`}</div>
    ${opcoes.length > 1 ? tabelaComparacao(opcoes) : ""}
  </div>`;
}

function secaoComentarios(it) {
  const comentario = (c) => `<div class="comment"><div class="between small"><span>${esc(nomeDe(c.autor))}</span><span class="muted">${dataBR(c.criado_em)}${c.autor === meuId() ? ` <button class="linkbtn" data-act="apagarComentario" data-id="${c.id}">apagar</button>` : ""}</span></div><p class="comment-text">${esc(c.texto)}</p></div>`;
  return `<div>
    <span class="eyebrow">Conversa</span><h3 class="h2 sub-title comments-title">Comentários</h3>
    <div class="comments">${S.comentarios.filter((c) => c.item_id === it.id).map(comentario).join("")}</div>
    <form id="form-comentario" class="row comment-form"><input class="input" name="texto" maxlength="2000" placeholder="Escreva um comentário" aria-label="Comentário" required><button class="btn sm" type="submit">Enviar</button></form>
  </div>`;
}

/** Painel lateral (ou inferior, no celular) com o item aberto; "" se não houver item. */
export function painelItem() {
  const novo = S.item === "novo";
  const produtoVistoria = S.comodoAtual === VISTORIA && S.abaVistoria === "produtos";
  const it = novo ? { ...ITEM_NOVO, comodo: S.comodoAtual || ITEM_NOVO.comodo, ...(produtoVistoria ? { categoria: PRODUTOS_VISTORIA } : {}) } : itemPorId(S.item);
  if (!it) { S.item = null; return ""; }
  return `<div class="overlay" data-act="fechar"></div>
  <aside class="sheet" role="dialog" aria-modal="true" aria-label="${esc(it.nome || "Novo item")}">
    <div class="sheet-close"><button data-act="fechar" aria-label="Fechar">${ICONES.x}</button></div>
    ${foto(novo ? null : fotoDe(it), it.nome || "+", "photo sheet-hero", iconeDoItem(it))}
    <div class="sheet-body">
      <div><span class="eyebrow">${esc(it.comodo)} · ${esc(it.categoria)}</span><h2 class="display sheet-title">${esc(it.nome || "Novo item")}</h2>
        ${novo ? "" : historico(it)}${!novo && urlOk(it.link_produto) ? `<div class="opt-actions abrir-loja">${linkExterno(it.link_produto, "Abrir na loja")}</div>` : ""}</div>
      ${novo || ehVistoria(it) ? "" : `<div><span class="eyebrow">Status</span><div class="status-pick" role="group" aria-label="Status do item">${Object.entries(STATUS).map(([k, l]) => `<button type="button" data-act="status" data-v="${k}" class="${it.status === k ? "on" : ""}" aria-pressed="${it.status === k}">${l}</button>`).join("")}</div></div>`}
      ${formItem(it, novo)}
      ${novo ? "" : (ehVistoria(it) ? "" : secaoOpcoes(it)) + secaoComentarios(it)}
    </div>
  </aside>`;
}

/* ---------- Acesso ---------- */
export const telaLogin = () => `<div class="auth"><form class="auth-box view" id="auth">
    <div><span class="eyebrow">Espaço privado</span><h1 class="display auth-title">Nosso Primeiro Lar</h1><p class="muted">Planejamento da nossa mudança em fevereiro de 2029.</p></div>
    <label class="field">E-mail<input class="input" name="email" type="email" required autocomplete="email"></label>
    <label class="field">Senha<input class="input" name="senha" type="password" required autocomplete="current-password"></label>
    <button class="btn" type="submit">Entrar</button>
    <p class="muted small" id="auth-msg" role="status" aria-live="polite"></p>
  </form></div>`;

export const telaSemAcesso = () => `<div class="auth"><div class="auth-box view"><h1 class="display auth-title sm">Acesso restrito</h1><p class="muted">Esta conta não faz parte deste planejamento. O espaço é exclusivo para as duas pessoas cadastradas.</p><button class="btn ghost" data-act="sair">Sair</button></div></div>`;
