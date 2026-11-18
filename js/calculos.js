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
