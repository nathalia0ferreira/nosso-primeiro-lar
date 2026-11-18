// Funções puras (sem rede): validação do link e leitura dos dados estruturados da página.

/** Nomes bonitos das lojas conhecidas; qualquer outro site público também é aceito, com o domínio como nome. */
export const LOJAS: Record<string, string> = {
  "jacotei.com.br": "JáCotei", "buscape.com.br": "Buscapé", "zoom.com.br": "Zoom",
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

// Nomes que só existem em redes internas.
const SUFIXOS_INTERNOS = [".localhost", ".local", ".internal", ".lan", ".home", ".corp", ".intranet", ".home.arpa", ".svc", ".cluster.local"];

/**
 * Loja do link se ele for https, sem usuário/senha/porta, e de um nome de domínio público
 * (nada de IP direto, localhost ou nomes de rede interna); senão null.
 * O destino real (DNS) é conferido à parte por `ipPrivado`, no servidor.
 */
export function lojaDoLink(texto: string): { url: URL; loja: string } | null {
  let url: URL;
  try { url = new URL(texto.trim()); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  const ehIp = /^[\d.]+$/.test(host) || host.includes(":") || host.startsWith("[");
  const tld = host.split(".").pop() ?? "";
  if (ehIp || !host.includes(".") || !/^(?:[a-z]{2,63}|xn--[a-z0-9-]+)$/.test(tld) || host === "localhost") return null;
  if (SUFIXOS_INTERNOS.some((s) => ("." + host).endsWith(s))) return null;
  const dominio = Object.keys(LOJAS).find((d) => host === d || host.endsWith("." + d));
  return { url, loja: dominio ? LOJAS[dominio] : host.replace(/^www\./, "") };
}

/** true para endereços que não são da internet pública (rede local, loopback, link-local, etc.). */
export function ipPrivado(ip: string): boolean {
  const v = ip.toLowerCase().replace(/^\[|\]$/g, "");
  const v4 = v.match(/^(?:::ffff:)?(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19));
  }
  return v === "::" || v === "::1" || /^f[cd]/.test(v) || /^fe[89ab]/.test(v) || v.startsWith("::ffff:") || v.startsWith("64:ff9b:");
}

export type Produto = {
  nome: string | null; marca: string | null; preco: number | null; moeda: string | null;
  imagem: string | null; gtin: string | null; sku: string | null; modelo: string | null; disponivel: boolean | null;
  vendedor: string | null; // quem vende a oferta (em comparadores, é a loja de verdade);
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
    vendedor: texto(oferta.seller),
  };
}
