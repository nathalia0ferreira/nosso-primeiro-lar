// Funções puras (sem rede): validação do link e leitura dos dados estruturados da página.

/** Lojas aceitas. Um link só é aberto se o domínio (ou um subdomínio dele) estiver aqui. */
export const LOJAS: Record<string, string> = {
  "mercadolivre.com.br": "Mercado Livre", "mercadolivre.com": "Mercado Livre", "mercadolibre.com": "Mercado Livre",
  "amazon.com.br": "Amazon", "amzn.to": "Amazon", "a.co": "Amazon",
  "magazineluiza.com.br": "Magalu", "magalu.com": "Magalu",
  "casasbahia.com.br": "Casas Bahia", "pontofrio.com.br": "Ponto", "extra.com.br": "Extra",
  "madeiramadeira.com.br": "MadeiraMadeira", "mobly.com.br": "Mobly", "tokstok.com.br": "Tok&Stok",
  "shopee.com.br": "Shopee", "americanas.com.br": "Americanas", "submarino.com.br": "Submarino",
  "leroymerlin.com.br": "Leroy Merlin", "kabum.com.br": "KaBuM!", "fastshop.com.br": "Fast Shop",
  "carrefour.com.br": "Carrefour", "westwing.com.br": "Westwing", "camicado.com.br": "Camicado",
  "etna.com.br": "Etna", "havan.com.br": "Havan",
};

/** Loja do link se ele for https, sem usuário/senha/porta e de um domínio aceito; senão null. */
export function lojaDoLink(texto: string): { url: URL; loja: string } | null {
  let url: URL;
  try { url = new URL(texto.trim()); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  const dominio = Object.keys(LOJAS).find((d) => host === d || host.endsWith("." + d));
  return dominio ? { url, loja: LOJAS[dominio] } : null;
}

export type Produto = {
  nome: string | null; marca: string | null; preco: number | null; moeda: string | null;
  imagem: string | null; gtin: string | null; sku: string | null; modelo: string | null; disponivel: boolean | null;
};

const ENTIDADES: Record<string, string> = { "&quot;": '"', "&#39;": "'", "&apos;": "'", "&lt;": "<", "&gt;": ">", "&amp;": "&" };
const decodificar = (s: string) => s.replace(/&(?:quot|#39|apos|lt|gt|amp);/g, (e) => ENTIDADES[e]);

const texto = (v: unknown): string | null => {
  if (typeof v === "number") return String(v);
  if (typeof v === "string" && v.trim()) return decodificar(v.trim()).slice(0, 300);
  if (v && typeof v === "object" && "name" in v) return texto((v as { name: unknown }).name);
  return null;
};

const numero = (v: unknown): number | null => {
  if (typeof v === "number") return isFinite(v) && v > 0 ? v : null;
  if (typeof v !== "string") return null;
  const limpo = v.replace(/[^\d.,]/g, "");
  // "1.234,56" (formato brasileiro) ou "1234.56" (padrão do schema.org)
  const n = Number(/,\d{1,2}$/.test(limpo) ? limpo.replace(/\./g, "").replace(",", ".") : limpo.replace(/,/g, ""));
  return isFinite(n) && n > 0 ? n : null;
};

const linkHttps = (v: unknown): string | null => {
  const u = Array.isArray(v) ? v[0] : v && typeof v === "object" && "url" in v ? (v as { url: unknown }).url : v;
  return typeof u === "string" && /^https:\/\//i.test(u) ? u.slice(0, 1000) : null;
};

function produtosDoJsonLd(html: string): Record<string, unknown>[] {
  const achados: Record<string, unknown>[] = [];
  const visitar = (n: unknown): void => {
    if (Array.isArray(n)) return n.forEach(visitar);
    if (!n || typeof n !== "object") return;
    const o = n as Record<string, unknown>;
    const tipos = ([] as unknown[]).concat(o["@type"] ?? []);
    if (tipos.includes("Product") || tipos.includes("ProductGroup")) achados.push(o);
    if (o["@graph"]) visitar(o["@graph"]);
  };
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { visitar(JSON.parse(m[1].trim())); } catch { /* bloco inválido: ignora */ }
  }
  return achados;
}

const meta = (html: string, prop: string): string | null => {
  const tag = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*>`, "i"))?.[0];
  return tag?.match(/content=["']([^"']*)["']/i)?.[1] ?? null;
};

/**
 * A Amazon não publica JSON-LD nem Open Graph: lê o título, o preço da oferta principal e a foto do HTML.
 * shortcut: depende dos ids atuais da página da Amazon; se mudarem, cai em "preencha à mão".
 */
function paginaAmazon(html: string) {
  const titulo = html.match(/id="productTitle"[^>]*>([^<]+)</)?.[1].replace(/\s+/g, " ");
  const imagemTag = html.match(/<img[^>]+id="landingImage"[^>]*>/)?.[0] ?? "";
  const imagem = imagemTag.match(/data-old-hires="(https:[^"]+)"/)?.[1] ?? decodificar(imagemTag).match(/"(https:\/\/[^"]+)"/)?.[1];
  return {
    nome: texto(titulo),
    preco: numero(Number(html.match(/"priceAmount":([\d.]+)/)?.[1])),
    imagem: linkHttps(imagem),
  };
}

/** Dados do produto no HTML: JSON-LD (schema.org), depois Open Graph, depois o formato da Amazon. */
export function extrairProduto(html: string): Produto {
  const p = produtosDoJsonLd(html)[0] ?? {};
  const ofertas = ([] as unknown[]).concat(p.offers ?? []) as Record<string, unknown>[];
  const oferta = ofertas.find((o) => numero(o?.price ?? o?.lowPrice) != null) ?? ofertas[0] ?? {};
  const disponibilidade = typeof oferta.availability === "string" ? /InStock|LimitedAvailability|PreOrder/i.test(oferta.availability) : null;
  const amazon = paginaAmazon(html);
  return {
    nome: texto(p.name) ?? texto(meta(html, "og:title")) ?? amazon.nome,
    marca: texto(p.brand),
    preco: numero(oferta.price ?? oferta.lowPrice) ?? numero(meta(html, "product:price:amount")) ?? amazon.preco,
    moeda: texto(oferta.priceCurrency) ?? texto(meta(html, "product:price:currency")) ?? (amazon.preco != null ? "BRL" : null),
    imagem: linkHttps(p.image) ?? linkHttps(meta(html, "og:image")) ?? amazon.imagem,
    gtin: texto(p.gtin13 ?? p.gtin ?? p.gtin14 ?? p.gtin12 ?? p.gtin8),
    sku: texto(p.sku),
    modelo: texto(p.model ?? p.mpn),
    disponivel: disponibilidade,
  };
}
