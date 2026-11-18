// Rodar com: node --test tests/   (Node 23.6+ lê o .ts direto)
import { test } from "node:test";
import assert from "node:assert/strict";
import { extrairProduto, lojaDoLink } from "../supabase/functions/ler-produto/extrair.ts";

test("link: só https de lojas aceitas", () => {
  assert.equal(lojaDoLink("https://produto.mercadolivre.com.br/MLB-123-sofa")?.loja, "Mercado Livre");
  assert.equal(lojaDoLink("https://www.amazon.com.br/dp/B0X")?.loja, "Amazon");
  for (const ruim of ["http://www.amazon.com.br/dp/B0X", "https://amazon.com.br.evil.com/x", "https://evilamazon.com.br/x",
    "https://user:x@amazon.com.br/", "https://amazon.com.br:8080/", "https://169.254.169.254/latest", "https://localhost/",
    "file:///etc/passwd", "não é link"]) assert.equal(lojaDoLink(ruim), null, ruim);
});

test("produto: JSON-LD com @graph, marca, gtin e oferta", () => {
  const html = `<script type="application/ld+json">{"@graph":[{"@type":"WebPage"},{"@type":"Product","name":"Sofá 3 Lugares &amp; Chaise","brand":{"@type":"Brand","name":"Mobly"},"gtin13":"7891234567890","sku":"S1","image":["https://img.loja/1.jpg"],"offers":{"@type":"Offer","price":"2499.90","priceCurrency":"BRL","availability":"https://schema.org/InStock"}}]}</script>`;
  assert.deepEqual(extrairProduto(html), { nome: "Sofá 3 Lugares & Chaise", marca: "Mobly", preco: 2499.9, moeda: "BRL", imagem: "https://img.loja/1.jpg", gtin: "7891234567890", sku: "S1", modelo: null, disponivel: true });
});

test("produto: sem JSON-LD usa Open Graph; preço em formato brasileiro", () => {
  const p = extrairProduto(`<meta property="og:title" content="Geladeira Frost Free"><meta property="og:image" content="https://img/g.jpg"><meta property="product:price:amount" content="3.199,00">`);
  assert.equal(p.nome, "Geladeira Frost Free"); assert.equal(p.preco, 3199); assert.equal(p.imagem, "https://img/g.jpg"); assert.equal(p.disponivel, null);
});

test("produto: imagem http e JSON quebrado são ignorados", () => {
  const p = extrairProduto(`<script type="application/ld+json">{quebrado</script><meta property="og:image" content="http://x/y.jpg">`);
  assert.equal(p.nome, null); assert.equal(p.imagem, null);
});
