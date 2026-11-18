// Formatação e validação de valores. Sem dependência de DOM ou de rede.

const ENTIDADES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Escapa texto para uso seguro dentro de HTML e atributos. */
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ENTIDADES[c]);

export const brl = (n) => (n == null || isNaN(n) ? "—" : Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));

export const dataBR = (d) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

/** Só links http(s): bloqueia javascript:, data: etc. */
export const urlOk = (u) => /^https?:\/\//i.test(u || "");

/** Lê valor digitado no padrão brasileiro ("1.234,56") como número; vazio ou inválido vira null. */
export function lerNumero(v) {
  if (v === "" || v == null) return null;
  const n = Number(String(v).replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? null : n;
}

/** Número para preencher um campo de texto no padrão brasileiro. */
export const numeroParaCampo = (n) => (n == null ? "" : String(n).replace(".", ","));

export const pct = (parte, total) => (total ? Math.round((parte / total) * 100) : 0);

export const textoOuNulo = (s) => (s ?? "").trim() || null;
