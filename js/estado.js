// Estado da aplicação e acesso ao Supabase.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";
import { COMODOS } from "./dominio.js";
import { opcaoEscolhida, opcoesDoItem, valorEstimado } from "./calculos.js";
import { urlOk } from "./formato.js";
import { toast } from "./ui.js";

// Chave publicável (pode ficar no front-end); o acesso real é controlado pelas políticas RLS.
export const sb = createClient("https://lpbsxzqrrthfooxnxqet.supabase.co", "sb_publishable_7wwad-vkUjm8ZZpemC6ExA_07V18CwG");

const ESPERA_TEMPO_REAL_MS = 300;

export const S = {
  session: null, souMembro: false,
  membros: {}, itens: [], opcoes: [], comentarios: [], config: {},
  // estado só da interface
  listaModo: "comodos", comodoAtual: null, filtro: { q: "", status: "todos", prio: "todas" }, finPor: "comodo", item: null, novaOpcao: false,
};

/* ---------- consultas ao estado ---------- */
export const nomeDe = (uid) => S.membros[uid] || "—";
export const meuId = () => S.session.user.id;
export const itemPorId = (id) => S.itens.find((i) => i.id === id);
export const opcoesDe = (itemId) => opcoesDoItem(S.opcoes, itemId);
export const escolhidaDe = (itemId) => opcaoEscolhida(S.opcoes, itemId);
export const estimadoDe = (item) => valorEstimado(item, S.opcoes);

/** Foto do item; sem foto própria, usa a da opção escolhida ou de qualquer opção. */
export const fotoDe = (item) => [item.imagem_url, escolhidaDe(item.id)?.imagem_url, ...opcoesDe(item.id).map((o) => o.imagem_url)].find(urlOk);

/** Cômodos padrão na ordem fixa, seguidos dos criados pelos usuários. */
export const comodos = () => [...COMODOS, ...new Set(S.itens.map((i) => i.comodo).filter((c) => !COMODOS.includes(c)))];

/* ---------- banco ---------- */
export async function carregar() {
  const [m, i, o, c, cf] = await Promise.all([
    sb.from("membros").select("user_id,nome"),
    sb.from("itens").select("*").order("ordem"),
    sb.from("opcoes").select("*").order("criado_em"),
    sb.from("comentarios").select("*").order("criado_em"),
    sb.from("config").select("*").eq("id", 1).maybeSingle(),
  ]);
  const falha = [m, i, o, c, cf].find((r) => r.error);
  if (falha) { console.error(falha.error); toast("Não foi possível carregar os dados.", true); return; }
  S.membros = Object.fromEntries(m.data.map((x) => [x.user_id, x.nome]));
  S.itens = i.data; S.opcoes = o.data; S.comentarios = c.data; S.config = cf.data || {};
}

/** Grava no banco e devolve a linha salva; em erro, avisa o usuário e relança. */
export async function salvar(tabela, operacao, valores, id) {
  const q = sb.from(tabela);
  const consultas = {
    insert: () => q.insert(valores).select().single(),
    update: () => q.update(valores).eq("id", id).select().single(),
    delete: () => q.delete().eq("id", id),
  };
  const { data, error } = await consultas[operacao]();
  if (error) { console.error(error); toast("Não foi possível salvar. Tente novamente.", true); throw error; }
  return data;
}

/** Recarrega tudo quando o outro membro altera algo (agrupando mudanças próximas). */
export function ouvirMudancas(aoMudar) {
  let timer;
  sb.channel("lar")
    .on("postgres_changes", { event: "*", schema: "public" }, () => {
      clearTimeout(timer);
      timer = setTimeout(async () => { await carregar(); aoMudar(); }, ESPERA_TEMPO_REAL_MS);
    })
    .subscribe();
}
