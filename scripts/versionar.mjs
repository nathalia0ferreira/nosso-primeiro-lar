// Rodar antes de publicar: node scripts/versionar.mjs
// O GitHub Pages deixa cada arquivo em cache por 10 min e o celular não rebusca os módulos importados.
// Este script põe ?v=<versão> no CSS, no app.js e (via import map) em todos os módulos de js/,
// assim cada publicação obriga o navegador a baixar os arquivos novos.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const versao = new Date().toISOString().replace(/\D/g, "").slice(0, 12);
const modulos = readdirSync("js").filter((f) => f.endsWith(".js")).sort();
const mapa = Object.fromEntries(modulos.map((f) => [`./js/${f}`, `./js/${f}?v=${versao}`]));
const bloco = `<!-- versao:inicio -->
  <script type="importmap">${JSON.stringify({ imports: mapa })}</script>
  <link rel="stylesheet" href="styles.css?v=${versao}">
  <script type="module" src="js/app.js?v=${versao}"></script>
  <!-- versao:fim -->`;

const html = readFileSync("index.html", "utf8");
const novo = html.replace(/<!-- versao:inicio -->[\s\S]*?<!-- versao:fim -->/, bloco);
if (novo === html) throw new Error("Marcadores <!-- versao:inicio/fim --> não encontrados em index.html");
writeFileSync("index.html", novo);
console.log(`versão ${versao}: ${modulos.length} módulos`);
