// Peças de interface sem dados do planejamento: ícones, avisos, fotos e barras.
import { esc, pct, urlOk } from "./formato.js";

const TOAST_MS = 2600;

export const ICONES = {
  chev: '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m6 9 6 6 6-6"/></svg>',
  x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/></svg>',
};

let timerToast;
export function toast(msg, erro = false) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "show" + (erro ? " err" : "");
  clearTimeout(timerToast);
  timerToast = setTimeout(() => (t.className = erro ? "err" : ""), TOAST_MS);
}

/** Foto do produto; sem link válido (ou se a imagem falhar), mostra a inicial do nome. */
export const foto = (url, rotulo, classe = "photo") =>
  `<div class="${classe}">${urlOk(url) ? `<img src="${esc(url)}" alt="${esc(rotulo)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ""}<span class="ph" aria-hidden="true">${esc((rotulo || "?").trim()[0] || "?")}</span></div>`;

export const linkExterno = (url, texto) =>
  urlOk(url) ? `<a class="pill" href="${esc(url)}" target="_blank" rel="noopener noreferrer nofollow">${texto} ${ICONES.ext}</a>` : "";

export const barra = (p, classe = "") => `<div class="bar ${classe}"><i style="width:${p}%"></i></div>`;

/** Rótulo à esquerda, porcentagem à direita e barra embaixo. */
export const progresso = (rotulo, feitos, total, classe = "") =>
  `<div class="progress ${classe}"><div class="between small"><span class="muted">${rotulo}</span><span>${pct(feitos, total)}%</span></div>${barra(pct(feitos, total), classe.includes("thin") ? "thin" : "")}</div>`;

export const cabecalhoPagina = (rotulo, titulo, descricao = "") =>
  `<span class="eyebrow">${rotulo}</span><h1 class="display page-title">${titulo}</h1>${descricao ? `<p class="muted lead">${descricao}</p>` : ""}`;

export const segmentos = (opcoes, ativo, atributos) =>
  `<div class="seg" role="group">${opcoes.map(([v, l]) => `<button type="button" ${atributos} data-v="${v}" class="${ativo === v ? "on" : ""}" aria-pressed="${ativo === v}">${l}</button>`).join("")}</div>`;

export const lerForm = (form) => Object.fromEntries(new FormData(form).entries());
