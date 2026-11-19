import { test } from "node:test";
import assert from "node:assert/strict";
import { nomeDoIcone } from "../js/icones.js";

const i = (nome, categoria = "", comodo = "") => nomeDoIcone({ nome, categoria, comodo });

test("ícone: casos em que a ordem importa", () => {
  assert.equal(i("Escorredor de talheres"), "escorredor");
  assert.equal(i("Panos de prato", "Têxteis"), "toalha");
  assert.equal(i("Pano de chão", "Limpeza"), "limpeza");
  assert.equal(i("Protetor de colchão"), "colchao");
  assert.equal(i("Mesa de centro"), "mesa");
  assert.equal(i("Sacos para armazenamento"), "saco");
  assert.equal(i("Potes para armazenamento"), "pote");
  assert.equal(i("Tapete de banheiro"), "tapete");
  assert.equal(i("Pá de lixo"), "vassoura");
  assert.equal(i("Organizador de produtos"), "caixa");
  assert.equal(i("Produtos de limpeza"), "limpeza");
  assert.equal(i("Micro-ondas"), "microondas");
  assert.equal(i("Fogão ou cooktop"), "fogao");
});

test("ícone: itens novos da pesquisa e vistoria", () => {
  for (const [nome, esperado] of [["Filtro ou purificador de água", "copo"], ["Chuveiro", "chuveiro"], ["Escada doméstica", "escada"],
    ["Ferro de passar", "ferro"], ["Tábua de passar roupa", "ferro"], ["Desentupidor", "sanitario"], ["Assento sanitário", "sanitario"],
    ["Tesoura", "tesoura"], ["Lanterna", "lanterna"], ["Ventilador", "ventilador"], ["Assadeiras e formas", "panela"],
    ["Mesa de jantar e cadeiras", "mesa"], ["Tigelas", "prato"], ["Isqueiro ou acendedor de fogão", "fogao"]]) assert.equal(i(nome), esperado, nome);
  const v = (nome, categoria) => nomeDoIcone({ nome, categoria, comodo: "Vistoria do apartamento" });
  assert.equal(v("Testar todas as tomadas", "Elétrica"), "eletrica");
  assert.equal(v("Testar portas e fechaduras", "Portas e janelas"), "porta");
  assert.equal(v("Fotografar tudo", "Documentos"), "documento");
  assert.equal(v("Paredes sem fissuras", "Acabamentos"), "checklist");
  // produtos da vistoria usam o nome
  assert.equal(v("Testador de tomada", "Produtos para a vistoria"), "eletrica");
  assert.equal(v("Bolinha de gude", "Produtos para a vistoria"), "bolinha");
  assert.equal(v("Adesivos vermelhos", "Produtos para a vistoria"), "adesivo");
  assert.equal(v("Trena", "Produtos para a vistoria"), "trena");
});

test("ícone: categoria e cômodo como reserva; casinha por último", () => {
  assert.equal(i("Coisa nova", "Iluminação"), "luminaria");
  assert.equal(i("Algo", "Geral", "Cozinha"), "casa");
});

test("ícone: todos os itens atuais têm ícone próprio", () => {
  const itens = ["Cortina ou box, se necessário", "Porta-sabonete", "Suporte para papel higiênico", "Papel higiênico", "Escova sanitária",
    "Organizador de produtos", "Tapete de banheiro", "Toalhas de banho", "Toalhas de rosto", "Lixeira", "Sacos de lixo",
    "Sacos para armazenamento", "Fogão ou cooktop", "Geladeira", "Micro-ondas", "Air fryer", "Liquidificador", "Copos", "Pratos",
    "Xícaras", "Potes para armazenamento", "Panos de prato", "Abridor de latas e garrafas", "Escorredor de louça",
    "Escorredor de talheres", "Facas de cozinha", "Frigideiras", "Panelas", "Tábuas de corte", "Talheres", "Utensílios de cozinha",
    "Plantas", "Vasos", "Objetos decorativos", "Relógio", "Organizadores decorativos", "Espelhos", "Quadros", "Mantas",
    "Máquina de lavar", "Baldes", "Escova de limpeza", "Esponjas", "Luvas de limpeza", "Pá de lixo", "Pano de chão",
    "Panos de limpeza", "Produtos de limpeza", "Rodo", "Vassoura", "Cesto de roupas", "Pregadores", "Varal", "Capacho",
    "Adaptadores", "Extensões elétricas", "Filtros de linha", "Lâmpadas", "Pilhas", "Fita adesiva", "Fita isolante",
    "Kit de ferramentas básico", "Trena", "Caixas organizadoras", "Organizadores de gaveta", "Kit de primeiros socorros",
    "Cortinas", "Luminárias", "Cama", "Colchão", "Guarda-roupa", "Cabides", "Cobertores", "Jogos de cama", "Protetor de colchão",
    "Travesseiros", "Almofadas", "Tapete", "Televisão", "Mesa de centro", "Rack ou painel", "Sofá"];
  const sem = itens.filter((n) => i(n) === "casa");
  assert.deepEqual(sem, []);
});
