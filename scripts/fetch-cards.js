#!/usr/bin/env node
/**
 * scripts/fetch-cards.js
 * Fetches all Standard-legal Pokémon TCG cards from api.tcgdex.net
 * and caches them locally as data/standard-cards.json
 *
 * Migrated from pokemontcg.io/Scrydex (paid, rate-limited) to TCGdex
 * (free, open-source, no API key required) — Aug 2026.
 *
 * Usage: node scripts/fetch-cards.js
 * Env:   none required. TCGdex has no auth and no published hard rate limit,
 *        but we still throttle concurrent requests to be considerate (see
 *        CONCURRENCY below), per TCGdex's own FAQ guidance.
 */

const fs = require('fs');
const path = require('path');

const API_BASE = 'https://api.tcgdex.net/v2/en';
const LANG = 'en';
const CONCURRENCY = 15; // parallel card detail requests — polite but fast
const MAX_RETRIES = 5;
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'standard-cards.json');
const MIN_EXPECTED_CARDS = 2000; // sanity floor — adjust once you see a real successful count

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJSON(url, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
      console.warn(`  Attempt ${attempt}/${retries} failed with status ${res.status} — ${url}`);
    } catch (err) {
      console.warn(`  Attempt ${attempt}/${retries} threw: ${err.message} — ${url}`);
    }
    if (attempt < retries) {
      const backoff = 1000 * attempt * attempt; // 1s, 4s, 9s, 16s, 25s
      await sleep(backoff);
    }
  }
  throw new Error(`Failed to fetch after ${retries} attempts: ${url}`);
}

// Run async tasks with a concurrency cap, so we don't blast TCGdex with
// thousands of simultaneous requests. Returns results in the same order.
async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

// -------------------------------------------------------------------------
// Step 1: get every Standard-legal set (legality is defined per-set in TCGdex,
// not per-card — much simpler than the old regulationMark card-by-card check)
//
// NOTE: we deliberately do NOT rely on `?legal.standard=eq:true` as a server-
// side filter — in practice it returned 0 results (the nested boolean filter
// doesn't behave as the docs suggest for this endpoint). Instead we fetch
// every set brief, then fetch each one's full detail and check `legal.standard`
// ourselves. Slower, but it only relies on fields we've directly confirmed
// exist in the full Set object response.
// -------------------------------------------------------------------------
async function fetchStandardSets() {
  console.log('Fetching all sets...');
  const setBriefs = await fetchJSON(`${API_BASE}/sets`);
  console.log(`  Found ${setBriefs.length} total sets. Checking which are Standard-legal...`);

  const checked = await mapWithConcurrency(setBriefs, CONCURRENCY, async (brief) => {
    try {
      const full = await fetchJSON(`${API_BASE}/sets/${brief.id}`);
      return full.legal?.standard ? full : null; // keep the FULL object — reused below, no re-fetch needed
    } catch (err) {
      console.warn(`  Could not check legality for set ${brief.id} — ${err.message}`);
      return null;
    }
  });

  const standardSets = checked.filter(Boolean);
  console.log(`  -> ${standardSets.length} Standard-legal sets.`);
  return standardSets;
}

// -------------------------------------------------------------------------
// Step 2: for each card brief in a Standard set, get the full card object (hp, types,
// rarity, regulationMark, legal, images, weaknesses, etc.)
// -------------------------------------------------------------------------
async function fetchCardDetail(cardId) {
  return fetchJSON(`${API_BASE}/cards/${cardId}`);
}

// TCGdex `category` has no accent ("Pokemon"); your app checks the accented
// pokemontcg.io style ("Pokémon") everywhere (sorting, mulligan check, deck
// stats), so we normalize it here — this is the single most important
// conversion in this whole script.
function normalizeSupertype(category) {
  if (category === 'Pokemon') return 'Pokémon';
  return category; // "Trainer" / "Energy" already match
}

// Build a pokemontcg.io-style `subtypes` array from TCGdex's separate fields,
// since your app checks `card.subtypes?.includes('Basic')` and reads
// `subtypes[0]` as a display label.
function buildSubtypes(card, supertype) {
  if (supertype === 'Pokémon') {
    const subtypes = [];
    if (card.stage) {
      // "Stage1" -> "Stage 1", "Stage2" -> "Stage 2", "Basic" stays "Basic"
      subtypes.push(card.stage.replace(/^Stage(\d)$/, 'Stage $1'));
    }
    if (card.suffix) subtypes.push(card.suffix); // "ex", "V", "VMAX", etc.
    return subtypes;
  }
  if (supertype === 'Trainer') {
    return card.trainerType ? [card.trainerType] : []; // "Item" / "Supporter" / "Stadium"
  }
  if (supertype === 'Energy') {
    return card.energyType ? [card.energyType] : []; // "Basic" / "Special"
  }
  return [];
}

function normalizeCard(card, setBrief) {
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
      id: setBrief.id,
      name: setBrief.name,
      series: setBrief.serie?.name || null,
      ptcgoCode: setBrief.tcgOnline || null, // <- the field your app matches decklist imports against
      releaseDate: setBrief.releaseDate || null,
    },
    number: String(card.localId),
    images: {
      small: card.image ? `${card.image}/low.webp` : null,
      large: card.image ? `${card.image}/high.webp` : null,
    },
  };
}

async function main() {
  console.log('=== CodeMate Deck Lab — Standard Card Fetcher (TCGdex) ===');

  const standardSets = await fetchStandardSets();

  const allCards = [];
  let setsProcessed = 0;

  for (const setDetail of standardSets) {
    const cardBriefs = setDetail.cards || [];
    setsProcessed++;
    console.log(`\n[${setsProcessed}/${standardSets.length}] ${setDetail.name} (${setDetail.id}) — ${cardBriefs.length} cards`);

    const fullCards = await mapWithConcurrency(cardBriefs, CONCURRENCY, async (brief) => {
      try {
        const full = await fetchCardDetail(brief.id);
        return normalizeCard(full, setDetail);
      } catch (err) {
        console.warn(`  Skipping ${brief.id} (${brief.name}) — ${err.message}`);
        return null;
      }
    });

    const okCards = fullCards.filter(Boolean);
    console.log(`  -> ${okCards.length}/${cardBriefs.length} fetched successfully`);
    allCards.push(...okCards);
  }

  // Dedupe by id (safety net)
  const seen = new Set();
  const deduped = allCards.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  let missingImages = 0;
  deduped.forEach((c) => {
    if (!c.images.small) missingImages++;
  });

  console.log(`\nTotal unique cards fetched: ${deduped.length}`);
  console.log(`Cards missing image: ${missingImages}`);

  if (deduped.length < MIN_EXPECTED_CARDS) {
    console.error(`\nABORT: only got ${deduped.length} cards, expected at least ${MIN_EXPECTED_CARDS}.`);
    console.error('Not writing output file — keeping previous cached data intact.');
    process.exit(1);
  }

  const output = {
    lastUpdated: new Date().toISOString(),
    totalCards: deduped.length,
    source: 'tcgdex',
    cards: deduped,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));

  console.log(`\nSaved to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error('\nFATAL:', err.message);
  process.exit(1);
});