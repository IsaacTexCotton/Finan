// Gera os ícones PNG do app a partir de icons/icon.svg, com o Chromium que o Playwright já usa.
// Uso: node tools/gerar-icones.js   (não vai para o site publicado: só `icons/` vai)
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');

const pasta = path.join(__dirname, '..', 'icons');
const svg = fs.readFileSync(path.join(pasta, 'icon.svg'), 'utf8');
const ICONES = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['icon-maskable-512.png', 512], // a letra já fica na área segura central: o Android pode recortar as bordas
  ['apple-touch-icon.png', 180],
];

(async () => {
  const navegador = await chromium.launch();
  const pagina = await navegador.newPage();
  for (const [arquivo, tamanho] of ICONES) {
    await pagina.setViewportSize({ width: tamanho, height: tamanho });
    await pagina.setContent(`<style>html,body{margin:0}svg{display:block;width:${tamanho}px;height:${tamanho}px}</style>${svg}`);
    await pagina.screenshot({ path: path.join(pasta, arquivo), clip: { x: 0, y: 0, width: tamanho, height: tamanho } });
  }
  await navegador.close();
})();
