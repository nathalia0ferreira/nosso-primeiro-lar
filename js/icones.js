// Ícones de traço para itens sem foto, escolhidos pelo nome (depois categoria, depois cômodo).

const D = {
  geladeira: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M6 9h12M9 5v2M9 12v3"/>',
  fogao: '<rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><circle cx="15" cy="10" r="2"/><path d="M4 15h16"/>',
  microondas: '<rect x="2" y="5" width="20" height="14" rx="2"/><rect x="5" y="8" width="10" height="8" rx="1"/><path d="M18 9v.01M18 12v.01"/>',
  eletroportatil: '<path d="M7 3h10l-1 11H8L7 3z"/><rect x="6" y="14" width="12" height="7" rx="2"/><circle cx="12" cy="17.5" r="1"/>',
  airfryer: '<rect x="5" y="4" width="14" height="17" rx="3"/><path d="M5 10h14"/><circle cx="12" cy="15.5" r="2"/>',
  prato: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/>',
  copo: '<path d="M7 3h10l-1.5 17a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1L7 3z"/><path d="M7.5 8h9"/>',
  xicara: '<path d="M4 8h12v5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5V8z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16M3 21h14"/>',
  talheres: '<path d="M6 3v6a2 2 0 0 0 4 0V3M8 3v18"/><path d="M17 3c-2 2-2.5 6-1 9h2V3zM17 12v9"/>',
  faca: '<path d="M4 20 16 8c2-2 4-2 4-2s0 2-2 4L9 19"/><path d="M4 20l3-1"/>',
  panela: '<path d="M4 10h16v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-5z"/><path d="M2 10h2M20 10h2M9 7c0-1 1-2 3-2s3 1 3 2"/>',
  frigideira: '<circle cx="9" cy="14" r="6"/><path d="M13.5 10 21 4"/>',
  tabua: '<rect x="4" y="5" width="14" height="16" rx="3"/><path d="M18 9h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2"/>',
  pote: '<rect x="5" y="9" width="14" height="11" rx="2"/><rect x="4" y="5" width="16" height="4" rx="1"/>',
  escorredor: '<path d="M3 12h18l-2 8H5l-2-8z"/><path d="M7 12V6M11 12V4M15 12V6"/>',
  abridor: '<path d="M14 4a4 4 0 0 1 0 8l-8 8-2-2 8-8a4 4 0 0 1 2-6z"/><circle cx="14" cy="8" r="1"/>',
  lixeira: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
  saco: '<path d="M7 8h10l2 13H5L7 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  toalha: '<path d="M3 4h18"/><path d="M7 4v14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4"/><path d="M7 14h10"/>',
  tapete: '<rect x="3" y="6" width="18" height="11" rx="1"/><path d="M5 17v3M9 17v3M13 17v3M17 17v3"/>',
  cortina: '<path d="M3 4h18M5 4v16M19 4v16M5 4c2 4 2 12 4 16M19 4c-2 4-2 12-4 16"/>',
  espelho: '<circle cx="12" cy="10" r="7"/><path d="M12 17v4M9 21h6"/>',
  quadro: '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="m3 16 5-5 4 4 3-3 6 6"/>',
  planta: '<path d="M12 17V11M12 11c0-4 3-6 7-6 0 4-3 6-7 6zM12 12c0-3-2-5-5-5 0 3 2 5 5 5z"/><path d="M7 17h10l-1 4H8l-1-4z"/>',
  relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  manta: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 14c3 2 6 2 9 0s6-2 9 0"/>',
  lavar: '<rect x="4" y="2" width="16" height="20" rx="2"/><circle cx="12" cy="13" r="5"/><path d="M7 6h2"/>',
  vassoura: '<path d="M12 2v10M7 12h10l2 10H5l2-10zM10 16v6M14 16v6"/>',
  balde: '<path d="M5 8h14l-2 13H7L5 8z"/><path d="M5 8c0-3 3-5 7-5s7 2 7 5"/>',
  limpeza: '<path d="M8 10h8v11H8zM10 10V6h4v4M14 6h4"/>',
  varal: '<path d="M3 5h18M7 5v3M17 5v3"/><path d="M5 8h4v6H5zM15 8h4v6h-4z"/>',
  cesto: '<path d="M4 9h16l-2 11H6L4 9z"/><path d="M8 9l4-5 4 5M9 13v4M15 13v4"/>',
  cabide: '<path d="M12 8a2 2 0 1 1 2-2c0 1-2 1.5-2 3L3 16h18l-9-7"/>',
  eletrica: '<path d="M9 2v5M15 2v5"/><rect x="6" y="7" width="12" height="6" rx="2"/><path d="M12 13v4a3 3 0 0 1-3 3H8"/>',
  lampada: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
  pilha: '<rect x="3" y="8" width="16" height="8" rx="2"/><path d="M21 11v2M7 12h4M9 10v4"/>',
  ferramenta: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-2.5 2.5-2.5z"/>',
  fita: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  trena: '<rect x="3" y="6" width="14" height="12" rx="2"/><circle cx="10" cy="12" r="3"/><path d="M17 15h4"/>',
  caixa: '<rect x="3" y="8" width="18" height="12" rx="1"/><path d="M2 8l2-4h16l2 4M10 12h4"/>',
  socorro: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2M12 10v6M9 13h6"/>',
  luminaria: '<path d="M8 3h8l3 8H5l3-8zM12 11v9M8 21h8"/>',
  cama: '<path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7M3 14h18M3 18v2M21 18v2M6 9V7h5v2"/>',
  colchao: '<rect x="3" y="8" width="18" height="8" rx="2"/><path d="M3 12h18M6 16v2M18 16v2"/>',
  guardaroupa: '<rect x="4" y="2" width="16" height="20" rx="1"/><path d="M12 2v20M10 11v2M14 11v2"/>',
  travesseiro: '<path d="M4 8c0-2 2-3 8-3s8 1 8 3v8c0 2-2 3-8 3s-8-1-8-3V8z"/>',
  tv: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  sofa: '<path d="M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3"/><path d="M2 13a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v4H2v-4zM5 17v2M19 17v2"/>',
  mesa: '<path d="M3 9h18M5 9l-1 10M19 9l1 10M3 9l2-3h14l2 3"/>',
  rack: '<rect x="2" y="11" width="20" height="8" rx="1"/><path d="M12 11v8M4 19v2M20 19v2"/>',
  papel: '<circle cx="9" cy="10" r="6"/><circle cx="9" cy="10" r="2"/><path d="M9 16h10V10h-4"/>',
  casa: '<path d="M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6"/>',
};

// Ordem importa: o mais específico primeiro ("escorredor de talheres" é escorredor, não talheres).
const REGRAS = [
  [/escorredor/, "escorredor"], [/geladeira|freezer/, "geladeira"], [/fogao|cooktop/, "fogao"], [/micro-?ondas/, "microondas"],
  [/air ?fryer|fritadeira/, "airfryer"], [/liquidificador|batedeira|cafeteira|sanduicheira|torradeira|eletroport/, "eletroportatil"],
  [/xicara|caneca/, "xicara"], [/copo|taca/, "copo"], [/panos? de prato/, "toalha"], [/prato|louca|tigela/, "prato"],
  [/faca/, "faca"], [/talher|utensilio|concha|colher|garfo/, "talheres"], [/frigideira/, "frigideira"], [/panela/, "panela"],
  [/tabua/, "tabua"], [/abridor/, "abridor"], [/saco/, "saco"], [/pote|armazenamento/, "pote"], [/lixeira/, "lixeira"],
  [/papel higienico/, "papel"], [/tapete|capacho/, "tapete"], [/cortina|box/, "cortina"], [/toalha|pano de rosto/, "toalha"],
  [/espelho/, "espelho"], [/quadro|parede/, "quadro"], [/planta|vaso|natureza/, "planta"], [/relogio/, "relogio"],
  [/manta|cobertor|edredom/, "manta"], [/maquina de lavar|lavadora|secadora/, "lavar"], [/vassoura|rodo|pa de lixo|escova/, "vassoura"],
  [/balde/, "balde"], [/varal|pregador/, "varal"], [/cesto/, "cesto"], [/cabide/, "cabide"],
  [/lampada/, "lampada"], [/luminaria|abajur|iluminacao/, "luminaria"], [/pilha|bateria/, "pilha"],
  [/extens|filtros? de linha|adaptador|tomada|eletrica/, "eletrica"], [/fita/, "fita"], [/trena/, "trena"], [/ferrament/, "ferramenta"],
  [/socorro|saude|remedio/, "socorro"], [/organiz|caixa|porta-|suporte/, "caixa"],
  [/esponja|luva|pano|limpeza|sanitaria|desinfet/, "limpeza"],
  [/protetor de colchao|colchao/, "colchao"], [/jogo de cama|jogos de cama|lencol/, "cama"], [/cama/, "cama"],
  [/guarda-?roupa|armario|comoda/, "guardaroupa"], [/travesseiro|almofada/, "travesseiro"], [/televis|tv\b/, "tv"],
  [/sofa/, "sofa"], [/mesa|cadeira/, "mesa"], [/rack|painel|estante/, "rack"], [/textei/, "toalha"], [/decora|objeto/, "quadro"],
  [/eletrodomest/, "geladeira"], [/movei/, "sofa"],
];

const normalizar = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Nome do ícone para o item: tenta o nome, depois a categoria, depois o cômodo; senão, a casinha. */
export function nomeDoIcone(item) {
  for (const texto of [item.nome, item.categoria, item.comodo].map(normalizar)) {
    const regra = REGRAS.find(([re]) => re.test(texto));
    if (regra) return regra[1];
  }
  return "casa";
}

export const iconeDoItem = (item) =>
  `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${D[nomeDoIcone(item)]}</svg>`;
