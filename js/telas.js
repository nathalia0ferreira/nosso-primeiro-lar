// Geração do HTML de cada tela. Só lê o estado; ações ficam em app.js.
import { ETAPAS, ITEM_NOVO, ORDEM_PRIORIDADE, PRIORIDADES, QTD_PRIORITARIOS, STATUS, DATA_MUDANCA_PADRAO } from "./dominio.js";
import { comprado, contagemRegressiva, prioritarios, resumo } from "./calculos.js";
import { brl, dataBR, esc, numeroParaCampo, pct } from "./formato.js";
import { ICONES, barra, cabecalhoPagina, foto, linkExterno, progresso, segmentos } from "./ui.js";
import { S, comodos, escolhidaDe, estimadoDe, fotoDe, itemPorId, meuId, nomeDe, opcoesDe } from "./estado.js";

const resumoDe = (itens = S.itens) => resumo(itens, S.opcoes);
const pendentesPrimeiro = (a, b) => comprado(a) - comprado(b);
const plural = (n, um, varios) => (n > 1 ? varios : um);

/* ---------- componentes de item ---------- */
function cardItem(it) {
  const est = estimadoDe(it);
  return `<button class="card ${comprado(it) ? "done" : ""}" data-act="abrir" data-id="${it.id}">
    ${foto(fotoDe(it), it.nome)}
    <div class="body">
      <span class="name">${esc(it.nome)}</span>
      <span class="tag"><i class="dot ${comprado(it) ? "comprado" : it.prioridade}"></i>${esc(it.comodo)} · ${STATUS[it.status]}</span>
      ${est != null ? `<span class="price" style="text-align:left">${brl(est)}</span>` : ""}
    </div></button>`;
}

function linhaItem(it) {
  const valor = comprado(it) && it.preco_pago != null ? it.preco_pago : estimadoDe(it);
  const nOpcoes = opcoesDe(it.id).length;
  return `<div class="check-row ${comprado(it) ? "done" : ""}">
    <input type="checkbox" class="cbox" data-act="check" data-id="${it.id}" ${comprado(it) ? "checked" : ""} aria-label="Marcar ${esc(it.nome)} como comprado">
    ${foto(fotoDe(it), it.nome, "photo thumb")}
    <button class="open" data-act="abrir" data-id="${it.id}">
      <div class="name">${esc(it.nome)}${it.quantidade > 1 ? ` <span class="muted small">× ${it.quantidade}</span>` : ""}</div>
      <span class="tag"><i class="dot ${it.prioridade}"></i>${PRIORIDADES[it.prioridade]} · ${STATUS[it.status]}${nOpcoes ? ` · ${nOpcoes} ${plural(nOpcoes, "opção", "opções")}` : ""}</span>
    </button>
    <span class="price">${valor != null ? brl(valor) : ""}</span>
  </div>`;
}

const estatistica = (rotulo, valor) => `<div class="stat"><span class="eyebrow">${rotulo}</span><b>${valor}</b></div>`;

/* ---------- Início ---------- */
export function telaInicio() {
  const t = resumoDe();
  const c = contagemRegressiva(S.config.data_mudanca || DATA_MUDANCA_PADRAO);
  const mes = c.alvo.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const proximos = prioritarios(S.itens, QTD_PRIORITARIOS);
  return `<section class="hero">
      <span class="eyebrow">Mudança prevista · ${esc(mes)}</span>
      <h1 class="display">Nosso Primeiro Lar</h1>
      <div class="hero-meta">
        <div><div class="count">${c.dias.toLocaleString("pt-BR")}</div><span class="muted small">dias até a mudança</span></div>
        <div><div class="count">${c.meses}</div><span class="muted small">meses para planejar</span></div>
        <div style="flex:1;min-width:220px">${progresso("Progresso das compras", t.comprados, t.total)}</div>
      </div>
    </section>
    <section class="section">
      <div class="stats">
        ${estatistica("Planejados", t.total)}${estatistica("Comprados", t.comprados)}${estatistica("Pendentes", t.pendentes)}
        ${estatistica("Total estimado", brl(t.estTotal))}${estatistica("Já gasto", brl(t.gasto))}${estatistica("Ainda reservar", brl(t.reservar))}
      </div>
      ${t.semPreco ? `<p class="muted small">${t.semPreco} itens pendentes ainda sem preço estimado — os totais vão ficando mais precisos conforme vocês adicionam valores.</p>` : ""}
    </section>
    <section class="section">
      <div class="section-head"><div><span class="eyebrow">Próximos passos</span><h2 class="h2">Itens prioritários</h2></div><a class="pill" href="#etapas">Ver por etapas</a></div>
      ${proximos.length ? `<div class="grid">${proximos.map(cardItem).join("")}</div>` : `<p class="empty">Tudo comprado. Agora é só se mudar.</p>`}
    </section>
    <section class="section">
      <div class="section-head"><div><span class="eyebrow">Por cômodo</span><h2 class="h2">Andamento</h2></div></div>
      <div class="fin">${comodos().map((cm) => {
        const tc = resumoDe(S.itens.filter((i) => i.comodo === cm));
        return `<a class="fin-row" style="grid-template-columns:1fr auto;text-decoration:none" href="#lista" data-act="irComodo" data-c="${esc(cm)}"><span>${esc(cm)}</span><span class="muted small">${tc.comprados} de ${tc.total}</span>${barra(pct(tc.comprados, tc.total), "thin")}</a>`;
      }).join("")}</div>
    </section>`;
}

/* ---------- Lista ---------- */
function filtrar(lista) {
  const { q, status, prio } = S.filtro;
  const busca = q.trim().toLowerCase();
  const passaStatus = (i) => status === "todos" || (status === "pendentes" ? !comprado(i) : comprado(i));
  return lista.filter((i) => (!busca || `${i.nome} ${i.categoria}`.toLowerCase().includes(busca)) && passaStatus(i) && (prio === "todas" || i.prioridade === prio));
}

export function comodoHTML(cm) {
  const todos = S.itens.filter((i) => i.comodo === cm);
  const lista = filtrar(todos);
  const t = resumoDe(todos);
  const aberto = S.abertos.has(cm) || (S.filtro.q && lista.length);
  const categorias = [...new Set(lista.map((i) => i.categoria))];
  return `<div class="room ${aberto ? "open" : ""}">
    <button class="room-head" data-act="room" data-c="${esc(cm)}" aria-expanded="${!!aberto}">
      <span class="h2">${esc(cm)}</span>
      <span class="row"><span class="muted small">${t.comprados}/${t.total}</span>${ICONES.chev}</span>
      ${barra(pct(t.comprados, t.total), "thin")}
    </button>
    <div class="room-body"><div><div class="room-inner">
      ${lista.length ? categorias.map((c) => `<div class="eyebrow cat-title">${esc(c)}</div><div class="check-list">${lista.filter((i) => i.categoria === c).map(linhaItem).join("")}</div>`).join("") : `<p class="empty">Nenhum item com esses filtros.</p>`}
    </div></div></div></div>`;
}

export const comodosHTML = () => comodos().map(comodoHTML).join("");

export function telaLista() {
  const f = S.filtro;
  return `<section class="hero page">${cabecalhoPagina("Lista de compras", "Cômodo por cômodo")}</section>
    <div class="toolbar">
      <input class="input" type="search" placeholder="Buscar item" value="${esc(f.q)}" data-act="busca" aria-label="Buscar item">
      ${segmentos([["todos", "Todos"], ["pendentes", "Pendentes"], ["comprados", "Comprados"]], f.status, 'data-act="filtro" data-k="status"')}
      ${segmentos([["todas", "Todas"], ["essencial", "Essenciais"], ["importante", "Importantes"], ["complementar", "Complementares"]], f.prio, 'data-act="filtro" data-k="prio"')}
      <button class="btn sm" data-act="novo">Adicionar item</button>
    </div>
    <div style="margin-top:24px" id="rooms">${comodosHTML()}</div>`;
}

/* ---------- Esquecidos ---------- */
export function telaEsquecidos() {
  const lista = S.itens.filter((i) => i.esquecido).sort(pendentesPrimeiro);
  const feitos = lista.filter(comprado).length;
  return `<section class="hero page">
    ${cabecalhoPagina("Os pequenos essenciais", "O que sempre esquecem", "Não adianta ter geladeira sem ter talheres. Estes são os itens pequenos que fazem falta já na primeira noite. Marque qualquer item como “esquecível” no detalhe dele para que apareça aqui.")}
    <div style="max-width:420px">${progresso(`${feitos} de ${lista.length} garantidos`, feitos, lista.length)}</div>
  </section>
  <section class="section" style="margin-top:40px"><div class="check-list">${lista.map(linhaItem).join("") || `<p class="empty" style="padding:24px">Nenhum item marcado.</p>`}</div></section>`;
}

/* ---------- Etapas ---------- */
export function telaEtapas() {
  const coluna = ([etapa, [titulo, descricao]]) => {
    const lista = S.itens.filter((i) => i.etapa === etapa).sort((a, b) => pendentesPrimeiro(a, b) || ORDEM_PRIORIDADE[a.prioridade] - ORDEM_PRIORIDADE[b.prioridade]);
    const feitos = lista.filter(comprado).length;
    return `<div class="stage"><div><h3 class="h2" style="font-size:22px">${titulo}</h3><p class="muted small" style="margin:6px 0 0">${descricao}</p></div>
      ${progresso(`${feitos} de ${lista.length}`, feitos, lista.length, "thin")}
      <ul>${lista.map((i) => `<li class="${comprado(i) ? "done" : ""}"><button data-act="abrir" data-id="${i.id}"><span>${esc(i.nome)}</span><span class="muted small">${esc(i.comodo)}</span></button></li>`).join("")}</ul></div>`;
  };
  return `<section class="hero page">${cabecalhoPagina("Sem pressa", "Compras por etapa", "A ideia não é comprar tudo agora: é saber o que pesquisar, acompanhar preços e aproveitar boas oportunidades até a mudança.")}</section>
    <div class="stages section" style="margin-top:32px">${Object.entries(ETAPAS).map(coluna).join("")}</div>`;
}

/* ---------- Finanças ---------- */
export function telaFinancas() {
  const t = resumoDe();
  const orc = S.config.orcamento_total;
  const chave = S.finPor;
  const ordemComodos = comodos();
  const grupos = [...new Set(S.itens.map((i) => i[chave]))]
    .sort((a, b) => (chave === "comodo" ? ordemComodos.indexOf(a) - ordemComodos.indexOf(b) : a.localeCompare(b, "pt-BR")));
  const maiorValor = Math.max(orc || 0, t.estTotal, t.gasto, 1);
  const comOrcamento = (f) => (orc != null ? brl(f(orc)) : "—");
  return `<section class="hero page">${cabecalhoPagina("Planejamento financeiro", "Quanto custa o lar")}</section>
    <section class="section" style="margin-top:32px">
      <div class="fields" style="max-width:560px;align-items:end">
        <label class="field">Orçamento total planejado (R$)<input class="input" inputmode="decimal" id="orc" value="${numeroParaCampo(orc)}" placeholder="Ex.: 40000"></label>
        <button class="btn ghost" data-act="salvarOrc" style="justify-self:start">Salvar orçamento</button>
      </div>
    </section>
    <section class="section">
      <div class="stats">
        ${estatistica("Orçamento", brl(orc))}${estatistica("Estimado", brl(t.estTotal))}${estatistica("Gasto real", brl(t.gasto))}
        ${estatistica("Restante a comprar", brl(t.reservar))}${estatistica("Saldo do orçamento", comOrcamento((o) => o - t.gasto))}${estatistica("Folga prevista", comOrcamento((o) => o - t.gasto - t.reservar))}
      </div>
      <div style="display:grid;gap:14px;margin-top:28px;max-width:720px">
        ${[["Orçamento", orc || 0], ["Estimado", t.estTotal], ["Gasto real", t.gasto]].map(([l, v]) => `<div><div class="between small"><span class="muted">${l}</span><span>${brl(v)}</span></div><div style="margin-top:6px">${barra(pct(v, maiorValor))}</div></div>`).join("")}
      </div>
      ${orc != null && t.gasto + t.reservar > orc ? `<p class="small" style="color:var(--warn);margin-top:18px">A previsão atual passa o orçamento em ${brl(t.gasto + t.reservar - orc)}.</p>` : ""}
    </section>
    <section class="section">
      <div class="section-head"><div><span class="eyebrow">Detalhamento</span><h2 class="h2">Gastos por ${chave === "comodo" ? "cômodo" : "categoria"}</h2></div>
        ${segmentos([["comodo", "Cômodo"], ["categoria", "Categoria"]], chave, 'data-act="finPor"')}</div>
      <div class="fin"><div class="fin-row head"><span>${chave === "comodo" ? "Cômodo" : "Categoria"}</span><span>Estimado</span><span>Gasto</span><span>Falta</span></div>
      ${grupos.map((g) => {
        const tg = resumoDe(S.itens.filter((i) => i[chave] === g));
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
  return `<p class="muted small" style="margin:10px 0 0">Adicionado ${por(it.criado_por, "na lista inicial ")}em ${dataBR(it.criado_em)} · Atualizado ${por(it.atualizado_por, "")}em ${dataBR(it.atualizado_em)}</p>`;
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
    <label class="field">Preço estimado por unidade (R$)<input class="input" name="preco_estimado" inputmode="decimal" value="${numeroParaCampo(it.preco_estimado)}" placeholder="${!novo && escolhidaDe(it.id) ? "Usando a opção escolhida" : ""}"></label>
    <label class="field">Valor pago no total (R$)<input class="input" name="preco_pago" inputmode="decimal" value="${numeroParaCampo(it.preco_pago)}"></label>
    <label class="field">Foto (link da imagem)<input class="input" name="imagem_url" type="url" placeholder="https://" value="${esc(it.imagem_url)}"></label>
    <label class="field full">Descrição<textarea class="input" name="descricao">${esc(it.descricao)}</textarea></label>
    <label class="field full">Nossa preferência<textarea class="input" name="preferencia" placeholder="Cor, tamanho, material, marca, o que cada um prefere…">${esc(it.preferencia)}</textarea></label>
    <label class="field full">Observações<textarea class="input" name="observacoes">${esc(it.observacoes)}</textarea></label>
    <label class="row small full" style="color:var(--muted)"><input type="checkbox" class="cbox" name="esquecido" ${it.esquecido ? "checked" : ""}> Item pequeno que costuma ser esquecido</label>
    <div class="row full"><button class="btn" type="submit">${novo ? "Adicionar à lista" : "Salvar alterações"}</button>${novo ? "" : `<button class="btn danger" type="button" data-act="apagarItem">Remover item</button>`}</div>
  </form>`;
}

const formOpcao = () => `<form id="form-opcao" class="fields callout" style="margin-top:16px">
    <label class="field">Produto / modelo<input class="input" name="nome" required></label>
    <label class="field">Loja<input class="input" name="loja"></label>
    <label class="field">Preço (R$)<input class="input" name="preco" inputmode="decimal"></label>
    <label class="field">Link de compra<input class="input" name="url" type="url" placeholder="https://"></label>
    <label class="field full">Foto (link da imagem)<input class="input" name="imagem_url" type="url" placeholder="https://"></label>
    <label class="field full">Características<textarea class="input" name="caracteristicas" placeholder="Capacidade, medidas, voltagem, cor…"></textarea></label>
    <label class="field full">Observações<textarea class="input" name="observacoes"></textarea></label>
    <div class="full"><button class="btn" type="submit">Salvar opção</button></div>
  </form>`;

function opcaoHTML(o) {
  const gosto = o.curtidas.includes(meuId());
  const quemGostou = o.curtidas.map(nomeDe).join(" e ");
  return `<div class="opt ${o.escolhida ? "chosen" : ""}">
    ${foto(o.imagem_url, o.nome)}
    <div class="opt-body">
      <div class="between"><span class="eyebrow">${esc(o.loja || "Loja não informada")}${o.escolhida ? " · Escolhida" : ""}</span></div>
      <div style="font-weight:500;overflow-wrap:anywhere">${esc(o.nome)}</div>
      <div class="opt-price">${brl(o.preco)}</div>
      ${o.caracteristicas ? `<div class="small muted" style="white-space:pre-wrap">${esc(o.caracteristicas)}</div>` : ""}
      ${o.observacoes ? `<div class="small" style="white-space:pre-wrap">${esc(o.observacoes)}</div>` : ""}
      ${quemGostou ? `<div class="small muted">Gostou: ${esc(quemGostou)}</div>` : ""}
      <div class="small muted">Adicionada por ${esc(nomeDe(o.criado_por))} em ${dataBR(o.criado_em)}</div>
      <div class="opt-actions">
        ${linkExterno(o.url, "Abrir loja")}
        <button class="pill ${gosto ? "on" : ""}" data-act="curtir" data-id="${o.id}" aria-pressed="${gosto}">${ICONES.heart} ${gosto ? "Eu gosto" : "Gostei"}</button>
        <button class="pill ${o.escolhida ? "on" : ""}" data-act="escolher" data-id="${o.id}">${o.escolhida ? "Escolhida" : "Escolher esta"}</button>
        <button class="pill" data-act="apagarOpcao" data-id="${o.id}">Remover</button>
      </div>
    </div></div>`;
}

function tabelaComparacao(opcoes) {
  const menorPreco = Math.min(...opcoes.filter((o) => o.preco != null).map((o) => o.preco));
  const preferencia = (o) => (o.escolhida ? "Escolhida" : o.curtidas.length ? `${o.curtidas.length} ${plural(o.curtidas.length, "curtida", "curtidas")}` : "—");
  return `<div class="compare-wrap" style="margin-top:18px"><table class="compare"><thead><tr><th>Produto</th><th>Loja</th><th>Preço</th><th>Preferência</th></tr></thead><tbody>
    ${opcoes.map((o) => `<tr><td>${esc(o.nome)}</td><td>${esc(o.loja || "—")}</td><td style="white-space:nowrap">${brl(o.preco)}${o.preco === menorPreco ? ' <span class="muted small">menor</span>' : ""}</td><td>${preferencia(o)}</td></tr>`).join("")}
  </tbody></table></div>`;
}

function secaoOpcoes(it) {
  const opcoes = opcoesDe(it.id);
  return `<div>
    <div class="between"><div><span class="eyebrow">Comparação</span><h3 class="h2" style="font-size:24px">Opções encontradas</h3></div><button class="btn sm ghost" data-act="toggleOpcao">${S.novaOpcao ? "Cancelar" : "Adicionar opção"}</button></div>
    ${S.novaOpcao ? formOpcao() : ""}
    <div class="options" style="margin-top:16px">${opcoes.map(opcaoHTML).join("") || `<p class="muted small">Nenhuma opção ainda. Adicionem links de lojas diferentes para comparar.</p>`}</div>
    ${opcoes.length > 1 ? tabelaComparacao(opcoes) : ""}
  </div>`;
}

function secaoComentarios(it) {
  const comentario = (c) => `<div class="comment"><div class="between small"><span>${esc(nomeDe(c.autor))}</span><span class="muted">${dataBR(c.criado_em)}${c.autor === meuId() ? ` <button class="linkbtn" data-act="apagarComentario" data-id="${c.id}">apagar</button>` : ""}</span></div><p style="margin:4px 0 0;white-space:pre-wrap">${esc(c.texto)}</p></div>`;
  return `<div>
    <span class="eyebrow">Conversa</span><h3 class="h2" style="font-size:24px;margin-bottom:14px">Comentários</h3>
    <div class="comments">${S.comentarios.filter((c) => c.item_id === it.id).map(comentario).join("")}</div>
    <form id="form-comentario" class="row" style="margin-top:14px;flex-wrap:nowrap"><input class="input" name="texto" maxlength="2000" placeholder="Escreva um comentário" required><button class="btn sm" type="submit">Enviar</button></form>
  </div>`;
}

/** Painel lateral (ou inferior, no celular) com o item aberto; "" se não houver item. */
export function painelItem() {
  const novo = S.item === "novo";
  const it = novo ? ITEM_NOVO : itemPorId(S.item);
  if (!it) { S.item = null; return ""; }
  return `<div class="overlay" data-act="fechar"></div>
  <aside class="sheet" role="dialog" aria-modal="true" aria-label="${esc(it.nome || "Novo item")}">
    <div class="sheet-close"><button data-act="fechar" aria-label="Fechar">${ICONES.x}</button></div>
    ${foto(novo ? null : fotoDe(it), it.nome || "+", "photo sheet-hero")}
    <div class="sheet-body">
      <div><span class="eyebrow">${esc(it.comodo)} · ${esc(it.categoria)}</span><h2 class="display" style="font-size:clamp(34px,6vw,52px);margin-top:8px">${esc(it.nome || "Novo item")}</h2>
        ${novo ? "" : historico(it)}</div>
      ${novo ? "" : `<div><span class="eyebrow">Status</span><div class="status-pick" style="margin-top:10px">${Object.entries(STATUS).map(([k, l]) => `<button data-act="status" data-v="${k}" class="${it.status === k ? "on" : ""}">${l}</button>`).join("")}</div></div>`}
      ${formItem(it, novo)}
      ${novo ? "" : secaoOpcoes(it) + secaoComentarios(it)}
    </div>
  </aside>`;
}

/* ---------- Acesso ---------- */
export const telaLogin = () => `<div class="auth"><form class="auth-box view" id="auth">
    <div><span class="eyebrow">Espaço privado</span><h1 class="display" style="font-size:52px;margin-top:10px">Nosso Primeiro Lar</h1><p class="muted">Planejamento da nossa mudança em fevereiro de 2029.</p></div>
    <label class="field">E-mail<input class="input" name="email" type="email" required autocomplete="email"></label>
    <label class="field">Senha<input class="input" name="senha" type="password" required autocomplete="current-password"></label>
    <button class="btn" type="submit">Entrar</button>
    <p class="muted small" id="auth-msg"></p>
  </form></div>`;

export const telaSemAcesso = () => `<div class="auth"><div class="auth-box view"><h1 class="display" style="font-size:44px">Acesso restrito</h1><p class="muted">Esta conta não faz parte deste planejamento. O espaço é exclusivo para as duas pessoas cadastradas.</p><button class="btn ghost" data-act="sair">Sair</button></div></div>`;
