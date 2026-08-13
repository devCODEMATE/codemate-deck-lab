#!/usr/bin/env node
/**
 * scripts/fetch-tcgdex.js
 * -----------------------------------------------------------------------
 * Trae y CACHEA las cartas de TCGdex (api.tcgdex.net) para los sets que
 * pueden contener cartas Standard-legales (H/I/J), y las guarda en:
 *
 *   data/cards/by-set/{setId}.json   (cartas completas de ese set)
 *   data/sets.json                    (metadata de todos los sets relevantes)
 *
 * Adaptado del patrón usado en codemate-pokedex-collection (fetch-tcgdex.js)
 * — mismo truco de caché: si un set YA tiene su archivo guardado, no lo
 * vuelve a descargar. Por eso las corridas mensuales, después de la primera,
 * son rápidas: solo bajan los sets NUEVOS que hayan salido ese mes.
 *
 * A diferencia de Pokédex Collection, acá NO guardamos el catálogo entero
 * (no hace falta para Deck Lab) — solo sets con releaseDate >= 2023-01-01,
 * que es el universo posible de cartas con marca H/I/J.
 *
 * Uso:
 *   node scripts/fetch-tcgdex.js                 -> trae/actualiza todo
 *   node scripts/fetch-tcgdex.js --force          -> ignora la caché y re-descarga todo
 *
 * Requiere Node 18+ (usa fetch nativo).
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace(/^--/, '').split('=');
  acc[key] = value ?? true;
  return acc;
}, {});

const LANG = 'en';
const API = `https://api.tcgdex.net/v2/${LANG}`;
const DATA_DIR = path.join(__dirname, '..', 'data');
const CARDS_DIR = path.join(DATA_DIR, 'cards', 'by-set');
const CONCURRENCY = 8;
const force = Boolean(args.force);

// Igual que en fetch-cards.js: las marcas de regulación no existían antes de
// la era Scarlet & Violet (marca G, marzo 2023). Cualquier set anterior a
// esta fecha NO puede tener cartas H/I/J — no hace falta ni mirarlo.
const EARLIEST_RELEVANT_RELEASE_DATE = '2023-01-01';

function log(msg) {
  console.log(`[fetch-tcgdex] ${msg}`);
}

async function fetchJSON(url, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
      return await res.json();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 1000 * attempt * attempt));
    }
  }
}

/**
 * Trae una carta con dos intentos, igual que en Pokédex Collection:
 *   1) por su id combinado: /cards/{setId}-{localId}
 *   2) si falla, por set + número local por separado
 */
async function fetchCardResilient(brief, setId, failedList) {
  try {
    return await fetchJSON(`${API}/cards/${encodeURIComponent(brief.id)}`);
  } catch (firstErr) {
    try {
      const viaLocalId = await fetchJSON(
        `${API}/sets/${encodeURIComponent(setId)}/cards/${encodeURIComponent(brief.localId)}`
      );
      log(`  -> "${brief.id}" se recuperó por la vía set+localId.`);
      return viaLocalId;
    } catch (secondErr) {
      log(`  ATENCIÓN: no se pudo traer "${brief.id}" (${secondErr.message}). La salteo.`);
      failedList.push({ label: brief.id, error: secondErr.message });
      return null;
    }
  }
}

async function runPool(items, worker, concurrency = CONCURRENCY) {
  const results = new Array(items.length);
  let next = 0;
  async function runner() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runner));
  return results;
}

function setMeta(setDetail) {
  return {
    id: setDetail.id,
    name: setDetail.name,
    logo: setDetail.logo || null,
    symbol: setDetail.symbol || null,
    serie: setDetail.serie || null,
    releaseDate: setDetail.releaseDate || null,
    tcgOnline: setDetail.tcgOnline || null,
    cardCount: setDetail.cardCount,
  };
}

async function main() {
  fs.mkdirSync(CARDS_DIR, { recursive: true });

  log('Trayendo lista de sets...');
  const setBriefs = await fetchJSON(`${API}/sets`);
  log(`Total de sets en TCGdex: ${setBriefs.length}`);

  // Un solo fetch por set para saber su fecha — barato, y nos deja descartar
  // de entrada todo lo anterior a 2023 sin tocar ni una carta.
  log('Chequeando fechas de lanzamiento...');
  const setDetails = await runPool(setBriefs, (brief) => fetchJSON(`${API}/sets/${brief.id}`));
  const relevantSets = setDetails.filter((s) => s.releaseDate && s.releaseDate >= EARLIEST_RELEVANT_RELEASE_DATE);
  log(`  -> ${relevantSets.length} sets relevantes (desde ${EARLIEST_RELEVANT_RELEASE_DATE}).`);

  const allSetsMeta = [];
  let totalCards = 0;
  let setsSkippedFromCache = 0;
  const failedCards = [];

  for (let i = 0; i < relevantSets.length; i++) {
    const setDetail = relevantSets[i];
    log(`Set ${i + 1}/${relevantSets.length}: ${setDetail.id} (${setDetail.name})`);
    allSetsMeta.push(setMeta(setDetail));

    const outFile = path.join(CARDS_DIR, `${setDetail.id}.json`);

    if (!force && fs.existsSync(outFile)) {
      log('  -> ya está en caché, lo salteo (usá --force para re-descargar)');
      const cached = JSON.parse(fs.readFileSync(outFile, 'utf8'));
      totalCards += cached.length;
      setsSkippedFromCache += 1;
      continue;
    }

    const briefs = setDetail.cards;
    log(`  -> ${briefs.length} cartas, descargando detalle completo...`);

    let done = 0;
    const fullCards = await runPool(briefs, async (brief) => {
      const full = await fetchCardResilient(brief, setDetail.id, failedCards);
      done++;
      if (done % 20 === 0 || done === briefs.length) {
        process.stdout.write(`\r  -> ${done}/${briefs.length} cartas`);
      }
      return full || { ...brief, incomplete: true };
    });
    process.stdout.write('\n');

    fs.writeFileSync(outFile, JSON.stringify(fullCards, null, 2));
    totalCards += fullCards.length;
    log(`  -> guardado en ${path.relative(process.cwd(), outFile)}`);
  }

  fs.writeFileSync(path.join(DATA_DIR, 'sets.json'), JSON.stringify(allSetsMeta, null, 2));

  log(
    `Listo. ${allSetsMeta.length} sets relevantes (${setsSkippedFromCache} ya estaban en caché), ${totalCards} cartas en total.`
  );
  if (failedCards.length) {
    log(`ATENCIÓN: ${failedCards.length} carta(s) no se pudieron traer. Revisar failedCards en el log de arriba.`);
  }
}

main().catch((err) => {
  console.error('[fetch-tcgdex] ERROR:', err);
  process.exit(1);
});