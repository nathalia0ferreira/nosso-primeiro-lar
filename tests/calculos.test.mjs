// Rodar com: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { contagemRegressiva, precoUnitario, prioritarios, resumo, statusAoDesmarcar, valorEstimado } from "../js/calculos.js";
import { esc, lerNumero, urlOk } from "../js/formato.js";

const item = (o) => ({ id: "x", quantidade: 1, status: "nao_iniciado", prioridade: "importante", etapa: "pesquisar", ordem: 0, preco_estimado: null, preco_pago: null, ...o });
const opcoes = [
  { item_id: "g", preco: 3000, escolhida: false },
  { item_id: "g", preco: 2800, escolhida: true },
];

test("preço: estimado do item vence a opção escolhida", () => {
  assert.equal(precoUnitario(item({ id: "g" }), opcoes), 2800);
  assert.equal(precoUnitario(item({ id: "g", preco_estimado: 2500 }), opcoes), 2500);
  assert.equal(precoUnitario(item({ id: "sem" }), opcoes), null);
});

test("estimado multiplica pela quantidade", () => {
  assert.equal(valorEstimado(item({ preco_estimado: 100, quantidade: 2 }), []), 200);
  assert.equal(valorEstimado(item({}), []), null);
});

test("resumo: estimado, gasto e reserva", () => {
  const itens = [
    item({ id: "g" }),
    item({ id: "t", preco_estimado: 100, quantidade: 2 }),
    item({ id: "s", preco_estimado: 2000, status: "comprado", preco_pago: 1800 }),
    item({ id: "n" }),
  ];
  const r = resumo(itens, opcoes);
  assert.deepEqual(r, { total: 4, comprados: 1, pendentes: 3, estTotal: 5000, gasto: 1800, reservar: 3000, semPreco: 1 });
});

test("item comprado sem valor pago conta zero no gasto", () => {
  assert.equal(resumo([item({ status: "comprado" })], []).gasto, 0);
});

test("prioritários: só pendentes, essencial primeiro, depois etapa", () => {
  const itens = [
    item({ id: "a", prioridade: "complementar" }),
    item({ id: "b", prioridade: "essencial", etapa: "perto" }),
    item({ id: "c", prioridade: "essencial", etapa: "antecedencia" }),
    item({ id: "d", prioridade: "essencial", status: "comprado" }),
  ];
  assert.deepEqual(prioritarios(itens, 2).map((i) => i.id), ["c", "b"]);
});

test("desmarcar compra volta ao status certo", () => {
  assert.equal(statusAoDesmarcar(true, true), "escolhido");
  assert.equal(statusAoDesmarcar(false, true), "pesquisando");
  assert.equal(statusAoDesmarcar(false, false), "nao_iniciado");
});

test("contagem regressiva", () => {
  const c = contagemRegressiva("2029-02-01", new Date(2026, 10, 18));
  assert.equal(c.meses, 26);
  assert.equal(c.dias, 806);
  assert.equal(contagemRegressiva("2020-01-01", new Date(2026, 0, 1)).dias, 0);
});

test("formato: números brasileiros, links e escape", () => {
  assert.equal(lerNumero("1.234,56"), 1234.56);
  assert.equal(lerNumero(""), null);
  assert.equal(lerNumero("abc"), null);
  assert.equal(urlOk("javascript:alert(1)"), false);
  assert.equal(urlOk("https://loja.com"), true);
  assert.equal(esc(`<img src=x onerror="a">`), "&lt;img src=x onerror=&quot;a&quot;&gt;");
});
