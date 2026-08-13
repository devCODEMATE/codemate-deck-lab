#!/usr/bin/env node
/**
 * scripts/build-standard-catalog.js
 * -----------------------------------------------------------------------
 * Lee lo que ya bajó y cacheó fetch-tcgdex.js (data/cards/by-set/*.json +
 * data/sets.json) — SIN pedir nada a internet — y arma:
 *
 *   data/standard-cards.json
 *
 * con el mismo formato que espera app.js: solo cartas con regulationMark
 * H/I/J, más toda la Energía Básica (siempre legal en cualquier formato).
 *
 * Es rápido y barato porque no depende de la red — se puede correr las
 * veces que haga falta (por ejemplo, si mañana cambia la lista de marcas
 * legales, no hay que re-descargar nada, solo ajustar LEGAL_REGULATION_MARKS
 * acá abajo y volver a correr este script).
 *
 * Uso: node scripts/build-standard-catalog.js
 * Requiere: haber corrido antes scripts/fetch-tcgdex.js
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CARDS_DIR = path.join(DATA_DIR, 'cards', 'by-set');
const OUTPUT_PATH = path.join(DATA_DIR, 'standard-cards.json');
const MIN_EXPECTED_CARDS = 2000; // piso de seguridad — ajustar con el número real de la primera corrida exitosa

// Cartas legales en la rotación Standard actual (ver anuncio de pokemon.com
// sobre la rotación 2026). Actualizar esta lista cuando salga una marca nueva.
const LEGAL_REGULATION_MARKS = ['H', 'I', 'J'];

function log(msg) {
  console.log(`[build-standard-catalog] ${msg}`);
}

// TCGdex usa "category" sin tilde ("Pokemon"); app.js compara contra el
// estilo con tilde ("Pokémon") en todos lados (orden del mazo, chequeo de
// mulligan, estadísticas) — esta es la conversión más importante del script.
function normalizeSupertype(category) {
  if (category === 'Pokemon') return 'Pokémon';
  return category; // "Trainer" / "Energy" ya coinciden
}

// Arma un array `subtypes` al estilo pokemontcg.io a partir de los campos
// separados de TCGdex, porque app.js chequea `card.subtypes?.includes('Basic')`
// y lee `subtypes[0]` como etiqueta para mostrar.
function buildSubtypes(card, supertype) {
  if (supertype === 'Pokémon') {
    const subtypes = [];
    if (card.stage) subtypes.push(card.stage.replace(/^Stage(\d)$/, 'Stage $1'));
    if (card.suffix) subtypes.push(card.suffix);
    return subtypes;
  }
  if (supertype === 'Trainer') return card.trainerType ? [card.trainerType] : [];
  if (supertype === 'Energy') return card.energyType ? [card.energyType] : [];
  return [];
}

function isStandardLegal(card, supertype) {
  if (LEGAL_REGULATION_MARKS.includes(card.regulationMark)) return true;
  if (supertype === 'Energy' && card.energyType === 'Basic') return true;
  return false;
}

function normalizeCard(card, setMeta) {
  const supertype = normalizeSupertype(card.category);
  return {
    id: card.id,
    name: card.name,
    supertype,
    subtypes: buildSubtypes(card, supertype),
    hp: card.hp || null,
    types: card.types || [],
    regulationMark: card.regulationMark || null,
    rarity: card.rarity || null,
    weaknesses: card.weaknesses || [],
    set: {
      id: setMeta.id,
      name: setMeta.name,
      series: setMeta.serie?.name || null,
      ptcgoCode: setMeta.tcgOnline || null,
      releaseDate: setMeta.releaseDate || null,
    },
    number: String(card.localId),
    images: {
      small: card.image ? `${card.image}/low.webp` : null,
      large: card.image ? `${card.image}/high.webp` : null,
    },
  };
}

function main() {
  if (!fs.existsSync(CARDS_DIR)) {
    console.error(`No existe ${CARDS_DIR}. Corré primero: node scripts/fetch-tcgdex.js`);
    process.exit(1);
  }

  const setsMeta = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'sets.json'), 'utf8'));
  const setMetaById = setsMeta.reduce((acc, s) => {
    acc[s.id] = s;
    return acc;
  }, {});

  const setFiles = fs.readdirSync(CARDS_DIR).filter((f) => f.endsWith('.json'));
  log(`Leyendo ${setFiles.length} archivos cacheados de data/cards/by-set...`);

  const standardCards = [];
  let totalRead = 0;

  for (const file of setFiles) {
    const setId = file.replace(/\.json$/, '');
    const setMeta = setMetaById[setId];
    if (!setMeta) {
      log(`  ATENCIÓN: ${file} no tiene metadata en sets.json, lo salteo.`);
      continue;
    }
    const cards = JSON.parse(fs.readFileSync(path.join(CARDS_DIR, file), 'utf8'));
    for (const card of cards) {
      if (card.incomplete) continue; // carta que falló al bajar, sin datos reales
      totalRead += 1;
      const supertype = normalizeSupertype(card.category);
      if (!isStandardLegal(card, supertype)) continue;
      standardCards.push(normalizeCard(card, setMeta));
    }
  }

  log(`${totalRead} cartas leídas en total, ${standardCards.length} son Standard-legales (H/I/J + Energía Básica).`);

  // Dedupe por id (red de seguridad)
  const seen = new Set();
  const deduped = standardCards.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  const missingImages = deduped.filter((c) => !c.images.small).length;
  log(`Cartas sin imagen: ${missingImages}`);

  if (deduped.length < MIN_EXPECTED_CARDS) {
    console.error(`ABORT: solo ${deduped.length} cartas, se esperaban al menos ${MIN_EXPECTED_CARDS}.`);
    console.error('No se escribe el archivo de salida — se mantiene el caché anterior intacto.');
    process.exit(1);
  }

  const output = {
    lastUpdated: new Date().toISOString(),
    totalCards: deduped.length,
    source: 'tcgdex',
    cards: deduped,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  log(`Guardado en ${OUTPUT_PATH}`);
}

main();