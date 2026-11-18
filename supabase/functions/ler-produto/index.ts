// Lê os dados de UM link de produto colado por um membro do planejamento.
// Segurança: só https, só domínios de lojas conhecidas (cada redirecionamento é conferido de novo),
// tempo e tamanho limitados, e só responde a quem é membro.
import { extrairProduto, lojaDoLink } from "./extrair.ts";

const ORIGENS = ["https://nathalia0ferreira.github.io", "http://localhost:5173"];
const MAX_REDIRECIONAMENTOS = 4;
const MAX_BYTES = 2_500_000;
const TEMPO_MS = 9000;

const cabecalhos = (origem: string | null) => ({
  "Access-Control-Allow-Origin": origem && ORIGENS.includes(origem) ? origem : ORIGENS[0],
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
  "Content-Type": "application/json",
});

async function ehMembro(auth: string) {
  const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/eh_membro`, {
    method: "POST", body: "{}",
    headers: { Authorization: auth, apikey: Deno.env.get("SUPABASE_ANON_KEY")!, "Content-Type": "application/json" },
  });
  return r.ok && (await r.json()) === true;
}

/** Lê no máximo `limite` bytes do corpo (páginas gigantes não travam a função). */
async function lerAte(resp: Response, limite: number) {
  const leitor = resp.body!.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;
  while (total < limite) {
    const { done, value } = await leitor.read();
    if (done) break;
    partes.push(value); total += value.length;
  }
  leitor.cancel().catch(() => {});
  const tudo = new Uint8Array(total);
  let i = 0;
  for (const p of partes) { tudo.set(p, i); i += p.length; }
  return new TextDecoder().decode(tudo.subarray(0, limite));
}

/** Segue redirecionamentos manualmente, validando cada destino contra a lista de lojas. */
async function buscarPagina(inicio: URL) {
  let url = inicio;
  const sinal = AbortSignal.timeout(TEMPO_MS);
  for (let i = 0; i <= MAX_REDIRECIONAMENTOS; i++) {
    const resp = await fetch(url, {
      redirect: "manual", signal: sinal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NossoPrimeiroLar/1.0)", "Accept": "text/html", "Accept-Language": "pt-BR" },
    });
    if (resp.status >= 300 && resp.status < 400) {
      resp.body?.cancel();
      const destino = lojaDoLink(new URL(resp.headers.get("location") ?? "", url).href);
      if (!destino) return { erro: "redirecionamento_bloqueado" };
      url = destino.url;
      continue;
    }
    if (!resp.ok) { resp.body?.cancel(); return { erro: "loja_indisponivel", status: resp.status }; }
    if (!(resp.headers.get("content-type") ?? "").includes("html")) { resp.body?.cancel(); return { erro: "nao_e_pagina" }; }
    return { html: await lerAte(resp, MAX_BYTES), final: url };
  }
  return { erro: "redirecionamentos_demais" };
}

Deno.serve(async (req) => {
  const h = cabecalhos(req.headers.get("origin"));
  const responder = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: h });
  if (req.method === "OPTIONS") return new Response(null, { headers: h });
  if (req.method !== "POST") return responder({ erro: "metodo" }, 405);
  if (!(await ehMembro(req.headers.get("authorization") ?? ""))) return responder({ erro: "sem_acesso" }, 403);

  let link = "";
  try { link = String((await req.json()).url ?? "").slice(0, 2000); } catch { /* corpo inválido */ }
  const alvo = lojaDoLink(link);
  if (!alvo) return responder({ erro: "loja_nao_suportada" });

  try {
    const r = await buscarPagina(alvo.url);
    if (!("html" in r)) return responder(r);
    const final = lojaDoLink(r.final.href)!;
    const produto = extrairProduto(r.html);
    if (!produto.nome) return responder({ erro: "produto_nao_identificado", loja: final.loja });
    return responder({ produto, loja: final.loja, url: r.final.href, consultado_em: new Date().toISOString() });
  } catch (e) {
    return responder({ erro: e instanceof DOMException && e.name === "TimeoutError" ? "tempo_esgotado" : "falha" });
  }
});
