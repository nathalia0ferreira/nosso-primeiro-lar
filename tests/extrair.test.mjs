// Rodar com: node --test tests/   (Node 23.6+ lê o .ts direto)
import { test } from "node:test";
import assert from "node:assert/strict";
import { extrairProduto, ipPrivado, lojaDoLink } from "../supabase/functions/ler-produto/extrair.ts";

test("link: qualquer site público https; nome conhecido ou domínio", () => {
  assert.equal(lojaDoLink("https://produto.mercadolivre.com.br/MLB-123-sofa")?.loja, "Mercado Livre");
  assert.equal(lojaDoLink("https://www.amazon.com.br/dp/B0X")?.loja, "Amazon");
  assert.equal(lojaDoLink("https://jacotei.com.br/air-fryer/p")?.loja, "JáCotei");
  assert.equal(lojaDoLink("https://www.lojinha-qualquer.com.br/produto")?.loja, "lojinha-qualquer.com.br");
  assert.equal(lojaDoLink("https://amazon.com.br.evil.com/x")?.loja, "amazon.com.br.evil.com"); // não finge ser a Amazon
  for (const ruim of ["http://www.amazon.com.br/dp/B0X", "https://user:x@amazon.com.br/", "https://amazon.com.br:8080/",
    "https://169.254.169.254/latest", "https://127.0.0.1/", "https://[::1]/", "https://localhost/", "https://intranet/",
    "https://servidor.local/", "https://db.internal/", "https://app.localhost/", "https://2130706433/",
    "file:///etc/passwd", "javascript:alert(1)", "não é link"]) assert.equal(lojaDoLink(ruim), null, ruim);
});

test("ip: privados bloqueados, públicos liberados", () => {
  for (const p of ["10.0.0.1", "127.0.0.1", "169.254.169.254", "172.16.5.4", "172.31.255.1", "192.168.0.1", "100.64.0.1", "0.0.0.0",
    "::1", "::", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "224.0.0.1"]) assert.equal(ipPrivado(p), true, p);
  for (const p of ["8.8.8.8", "172.32.0.1", "200.147.67.142", "2804:14c::1", "2606:4700::6810:84e5"]) assert.equal(ipPrivado(p), false, p);
});

test("produto: JSON-LD com @graph, marca, gtin e oferta", () => {
  const html = `<script type="application/ld+json">{"@graph":[{"@type":"WebPage"},{"@type":"Product","name":"Sofá 3 Lugares &amp; Chaise","brand":{"@type":"Brand","name":"Mobly"},"gtin13":"7891234567890","sku":"S1","image":["https://img.loja/1.jpg"],"offers":{"@type":"Offer","price":"2499.90","priceCurrency":"BRL","availability":"https://schema.org/InStock"}}]}</script>`;
  assert.deepEqual(extrairProduto(html), { nome: "Sofá 3 Lugares & Chaise", marca: "Mobly", preco: 2499.9, moeda: "BRL", imagem: "https://img.loja/1.jpg", gtin: "7891234567890", sku: "S1", modelo: null, disponivel: true, vendedor: null });
});

test("produto: sem JSON-LD usa Open Graph; preço em formato brasileiro", () => {
  const p = extrairProduto(`<meta property="og:title" content="Geladeira Frost Free"><meta property="og:image" content="https://img/g.jpg"><meta property="product:price:amount" content="3.199,00">`);
  assert.equal(p.nome, "Geladeira Frost Free"); assert.equal(p.preco, 3199); assert.equal(p.imagem, "https://img/g.jpg"); assert.equal(p.disponivel, null);
});

test("produto: página da Amazon (sem JSON-LD nem Open Graph)", () => {
  const html = `<span id="productTitle" class="a-size-large">   Toalha de Rosto Velvet &amp; Macia   </span>
    <img alt="" src="https://m.media-amazon.com/images/I/a._SX38_.jpg" data-old-hires="https://m.media-amazon.com/images/I/a._SL1500_.jpg" id="landingImage" data-a-dynamic-image="{&quot;https://m.media-amazon.com/images/I/a._SY355_.jpg&quot;:[355,355]}">
    <script>{"priceAmount":22.94,"currencySymbol":"R$"}</script>`;
  const p = extrairProduto(html);
  assert.equal(p.nome, "Toalha de Rosto Velvet & Macia");
  assert.equal(p.preco, 22.94); assert.equal(p.moeda, "BRL");
  assert.equal(p.imagem, "https://m.media-amazon.com/images/I/a._SL1500_.jpg");
});

test("produto: imagem http e JSON quebrado são ignorados", () => {
  const p = extrairProduto(`<script type="application/ld+json">{quebrado</script><meta property="og:image" content="http://x/y.jpg">`);
  assert.equal(p.nome, null); assert.equal(p.imagem, null);
});
