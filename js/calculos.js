// Regras de negócio puras: preços, totais, prioridades e contagem regressiva.
import { ORDEM_ETAPA, ORDEM_PRIORIDADE } from "./dominio.js";

const DIA_MS = 24 * 60 * 60 * 1000;

export const comprado = (item) => item.status === "comprado";

export const opcoesDoItem = (opcoes, itemId) => opcoes.filter((o) => o.item_id === itemId);

export const opcaoEscolhida = (opcoes, itemId) => opcoesDoItem(opcoes, itemId).find((o) => o.escolhida);

/** Preço unitário: o estimado no item tem prioridade; senão, o da opção escolhida. */
export const precoUnitario = (item, opcoes) => item.preco_estimado ?? opcaoEscolhida(opcoes, item.id)?.preco ?? null;

export function valorEstimado(item, opcoes) {
  const unitario = precoUnitario(item, opcoes);
  return unitario == null ? null : unitario * item.quantidade;
}

/** Preço + frete; null quando o frete não foi informado (não dá para comparar como se fosse grátis). */
export const totalOpcao = (o) => (o.preco == null || o.frete == null ? null : Number(o.preco) + Number(o.frete));

/**
 * Opção mais barata para destacar: compara o total (com frete) entre as que têm frete;
 * se nenhuma tiver, compara só o preço e avisa que é sem frete.
 */
export function maisBarata(opcoes) {
  const comTotal = opcoes.filter((o) => totalOpcao(o) != null);
  const base = comTotal.length ? comTotal : opcoes.filter((o) => o.preco != null);
  if (!base.length) return null;
  const valor = (o) => (comTotal.length ? totalOpcao(o) : Number(o.preco));
  const melhor = base.reduce((a, b) => (valor(b) < valor(a) ? b : a));
  return { id: melhor.id, comFrete: comTotal.length > 0 };
}

/**
 * Opção a partir de um link: usa o que a leitura da página trouxe; se não trouxe nada,
 * fica com o nome do item e a loja tirada do endereço (sem preço inventado).
 */
export function opcaoDoLink(nomeItem, url, lido) {
  const p = lido?.produto;
  const emReais = p && (!p.moeda || p.moeda === "BRL");
  const detalhes = p ? [p.marca && `Marca: ${p.marca}`, p.modelo && `Modelo: ${p.modelo}`, p.gtin && `Código de barras: ${p.gtin}`,
    p.sku && `Código na loja: ${p.sku}`, p.disponivel === false && "Indisponível na consulta"].filter(Boolean).join("\n") : "";
  return {
    nome: p?.nome || nomeItem,
    loja: lido?.loja || new URL(url).hostname.replace(/^www\./, ""),
    preco: emReais ? p.preco ?? null : null,
    url: lido?.url || url,
    imagem_url: p?.imagem ?? null,
    caracteristicas: detalhes || null,
    consultado_em: p ? lido.consultado_em ?? null : null,
  };
}

/** Gasto só conta para itens comprados; preco_pago já é o total da compra. */
export const valorPago = (item) => (comprado(item) ? Number(item.preco_pago || 0) : 0);

export function resumo(itens, opcoes) {
  const soma = (lista, f) => lista.reduce((s, i) => s + (f(i) || 0), 0);
  const comprados = itens.filter(comprado);
  const pendentes = itens.filter((i) => !comprado(i));
  return {
    total: itens.length,
    comprados: comprados.length,
    pendentes: pendentes.length,
    estTotal: soma(itens, (i) => valorEstimado(i, opcoes)),
    gasto: soma(comprados, valorPago),
    reservar: soma(pendentes, (i) => valorEstimado(i, opcoes)),
    semPreco: pendentes.filter((i) => valorEstimado(i, opcoes) == null).length,
  };
}

/** Pendentes ordenados por prioridade, depois etapa, depois ordem original. */
export const prioritarios = (itens, limite) =>
  itens
    .filter((i) => !comprado(i))
    .sort((a, b) => ORDEM_PRIORIDADE[a.prioridade] - ORDEM_PRIORIDADE[b.prioridade] || ORDEM_ETAPA[a.etapa] - ORDEM_ETAPA[b.etapa] || a.ordem - b.ordem)
    .slice(0, limite);

/** Status para onde o item volta quando a compra é desmarcada. */
export function statusAoDesmarcar(temEscolhida, temOpcoes) {
  if (temEscolhida) return "escolhido";
  return temOpcoes ? "pesquisando" : "nao_iniciado";
}

export function contagemRegressiva(dataISO, agora = new Date()) {
  const alvo = new Date(dataISO + "T00:00:00");
  const hoje = new Date(agora); hoje.setHours(0, 0, 0, 0);
  const dias = Math.max(0, Math.round((alvo - hoje) / DIA_MS));
  let meses = (alvo.getFullYear() - hoje.getFullYear()) * 12 + alvo.getMonth() - hoje.getMonth();
  if (alvo.getDate() < hoje.getDate()) meses--;
  return { dias, meses: Math.max(0, meses), alvo };
}
