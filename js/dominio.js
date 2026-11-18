// Vocabulário do planejamento: valores aceitos pelo banco e seus rótulos na interface.

export const COMODOS = ["Cozinha", "Quarto", "Banheiro", "Sala", "Lavanderia", "Organização e utilidades", "Decoração"];

export const PRIORIDADES = { essencial: "Essencial", importante: "Importante", complementar: "Complementar" };

export const STATUS = { nao_iniciado: "Não iniciado", pesquisando: "Pesquisando opções", escolhido: "Escolhido", comprado: "Comprado" };

export const ETAPAS = {
  antecedencia: ["Com bastante antecedência", "Itens duráveis que podem ser comprados aos poucos, aproveitando promoções."],
  pesquisar: ["Pesquisar e comparar", "Compras maiores: vale acompanhar preços e esperar boas oportunidades."],
  meses_antes: ["Alguns meses antes", "Depende das medidas e do espaço do apartamento. Confirme antes de comprar."],
  perto: ["Perto da mudança", "Itens de consumo ou de última hora. Comprar cedo demais não compensa."],
};

export const ORDEM_PRIORIDADE = { essencial: 0, importante: 1, complementar: 2 };
export const ORDEM_ETAPA = { antecedencia: 0, pesquisar: 1, meses_antes: 2, perto: 3 };

export const DATA_MUDANCA_PADRAO = "2029-02-01";
export const QTD_PRIORITARIOS = 8;

/** Pesquisa do mesmo produto em outras lojas: "achar.promo/" seguido do link do produto, tudo junto. */
export const acharPromo = (link) => `https://achar.promo/${link.trim()}`;

export const ITEM_NOVO = { nome: "", comodo: "Cozinha", categoria: "Geral", quantidade: 1, prioridade: "importante", status: "nao_iniciado", etapa: "pesquisar", esquecido: false };
