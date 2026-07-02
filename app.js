// =====================
// API KEY
// =====================
// CodeMate Deck Lab v6 - 2026
const API_KEY = '9990c70a-8afb-4e89-979a-d6b10faee93f';

// =====================
// LOCAL CATALOG (Fase 0 — cached Standard cards)
// =====================
const CATALOG_URL = 'data/standard-cards.json';
let standardCatalog = [];
let catalogMeta = { lastUpdated: null, totalCards: 0 };

async function loadLocalCatalog() {
  try {
    const res = await fetch(CATALOG_URL);
    if (!res.ok) throw new Error('Catalog not found');
    const json = await res.json();
    standardCatalog = json.cards || [];
    catalogMeta = { lastUpdated: json.lastUpdated, totalCards: json.totalCards };
    console.log(`Loaded local catalog: ${catalogMeta.totalCards} cards (updated ${catalogMeta.lastUpdated})`);
    updateCatalogStatus();
  } catch (e) {
    console.warn('Local catalog not available yet, falling back to live API for Standard searches:', e.message);
  }
}

function updateCatalogStatus() {
  const el = document.getElementById('catalogStatus');
  if (!el || !catalogMeta.lastUpdated) return;
  const date = new Date(catalogMeta.lastUpdated).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  el.textContent = `📦 ${catalogMeta.totalCards} Standard cards · updated ${date}`;
}

// FIX: look up a card in the local catalog before ever hitting the live API.
// Tries exact set+number match first (most reliable), falls back to name-only.
function findInCatalog(cardName, setCode, cardNumber) {
  const nameLower = cardName.toLowerCase();

  // A specific print was requested (set + number). Only accept an EXACT match —
  // silently substituting a different print's art (even same name) is worse
  // than falling through to a live search, which can still find the right one.
  if (setCode && cardNumber) {
    return standardCatalog.find(c => c.set?.ptcgoCode === setCode && c.number === cardNumber) || null;
  }

  // No specific print requested (e.g. basic energy from Limitless) — any
  // matching name is acceptable, there's nothing more specific to go on.
  return standardCatalog.find(c => c.name.toLowerCase() === nameLower) || null;
}

document.addEventListener('DOMContentLoaded', () => {

  loadLocalCatalog();

  // =====================
  // NAVIGATION
  // =====================
  const navButtons = document.querySelectorAll('.nav-btn');
  const sections = document.querySelectorAll('.section');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      navButtons.forEach(b => b.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.section;
      document.getElementById(target).classList.add('active');
    });
  });

  // =====================
  // MOBILE SWIPE NAVIGATION
  // =====================
  let touchStartX = 0;
  let touchStartY = 0;
  const sectionOrder = ['search', 'builder', 'simulator', 'damage'];

  document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const deltaY = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(deltaX) < 60 || Math.abs(deltaX) < Math.abs(deltaY)) return;
    if (document.getElementById('cardModal')) return;
    const activeSection = document.querySelector('.section.active');
    if (!activeSection) return;
    const currentIndex = sectionOrder.indexOf(activeSection.id);
    let nextIndex = -1;
    if (deltaX < -60) nextIndex = currentIndex + 1;
    if (deltaX > 60)  nextIndex = currentIndex - 1;
    if (nextIndex < 0 || nextIndex >= sectionOrder.length) return;
    navButtons.forEach(b => b.classList.remove('active'));
    sections.forEach(s => s.classList.remove('active'));
    const targetId = sectionOrder[nextIndex];
    document.getElementById(targetId).classList.add('active');
    document.querySelector(`[data-section="${targetId}"]`).classList.add('active');
  }, { passive: true });

  // =====================
  // LOGO RESET
  // =====================
  document.querySelector('.logo').addEventListener('click', () => {
    deck = [];
    renderDeck();
    updateDeckStats();
    searchInput.value = '';
    cardGrid.innerHTML = '';
    handDisplay.innerHTML = '';
    document.getElementById('baseDmg').value = '120';
    document.getElementById('weakness').value = '2';
    document.getElementById('resistance').value = '0';
    document.getElementById('coinBonus').value = '0';
    document.getElementById('extraDmg').value = '0';
    document.getElementById('opponentHp').value = '200';
    document.getElementById('damageResult').style.display = 'none';
    navButtons.forEach(b => b.classList.remove('active'));
    sections.forEach(s => s.classList.remove('active'));
    document.querySelector('[data-section="search"]').classList.add('active');
    document.getElementById('search').classList.add('active');
  });

  // =====================
  // SKETCH CARD GENERATOR
  // =====================
  function generateSketchCard(card, W, H) {
    W = W || 130;
    H = H || 182;
    const cx = W / 2;
    const name = card.name || '';
    const lname = name.toLowerCase();
    const supertype = card.supertype || 'Pokémon';
    const subtypes = card.subtypes || [];
    const subtype = subtypes[0] || card.subtype || '';
    const hp = card.hp || '';
    const setCode = (card.set && card.set.ptcgoCode) ? card.set.ptcgoCode : (card.setCode || '??');
    const number = card.number || '?';
    const shortName = name.length > 15 ? name.slice(0, 14) + '…' : name;
    const rightText = supertype === 'Pokémon' ? 'HP ' + hp : subtype || supertype;
    const subLine = supertype === 'Pokémon' ? (subtype || '') + ' type' : '';

    function sh(v) { return (v * H / 182).toFixed(1); }

    function pokemon_lucario() {
      return `<g transform="translate(${cx},${sh(98)})">
<path d="M-14,10 Q-18,-4 -12,-18 Q0,-28 12,-18 Q18,-4 14,10 Q8,20 0,22 Q-8,20 -14,10Z" fill="none" stroke="#111" stroke-width="1.3"/>
<path d="M-12,-18 Q-14,-32 -6,-40 Q0,-44 6,-40 Q14,-32 12,-18 Q6,-14 0,-12 Q-6,-14 -12,-18Z" fill="none" stroke="#111" stroke-width="1.3"/>
<path d="M-10,-36 Q-18,-50 -12,-58 Q-6,-52 -8,-40Z" fill="none" stroke="#111" stroke-width="1.1"/>
<path d="M10,-36 Q18,-50 12,-58 Q6,-52 8,-40Z" fill="none" stroke="#111" stroke-width="1.1"/>
<ellipse cx="-5" cy="-26" rx="2.5" ry="3" fill="#111"/>
<ellipse cx="5" cy="-26" rx="2.5" ry="3" fill="#111"/>
<path d="M-2,-20 Q0,-17 2,-20" fill="none" stroke="#111" stroke-width="0.9"/>
<path d="M-5,-22 Q0,-18 5,-22 Q5,-15 0,-14 Q-5,-15 -5,-22Z" fill="none" stroke="#111" stroke-width="0.9"/>
<path d="M-5,-4 Q0,-8 5,-4 Q4,2 0,4 Q-4,2 -5,-4Z" fill="none" stroke="#333" stroke-width="0.8"/>
<path d="M-14,2 Q-28,-2 -32,10 Q-28,18 -22,14" fill="none" stroke="#111" stroke-width="1.2"/>
<path d="M-32,10 Q-38,6 -36,14 Q-34,20 -28,18 Q-22,16 -22,14Z" fill="none" stroke="#111" stroke-width="1.1"/>
<circle cx="-30" cy="13" r="5" fill="none" stroke="#333" stroke-width="0.8" stroke-dasharray="2,1"/>
<path d="M14,2 Q28,-8 34,-2 Q36,6 30,10" fill="none" stroke="#111" stroke-width="1.2"/>
<path d="M34,-2 Q42,-6 40,4 Q38,12 32,10 Q28,8 30,6Z" fill="none" stroke="#111" stroke-width="1.1"/>
<circle cx="36" cy="2" r="5" fill="none" stroke="#333" stroke-width="0.8" stroke-dasharray="2,1"/>
<ellipse cx="0" cy="18" rx="13" ry="16" fill="none" stroke="#111" stroke-width="1.2"/>
<path d="M-8,22 Q-10,36 -12,48 Q-8,52 -4,50" fill="none" stroke="#111" stroke-width="1.2"/>
<path d="M8,22 Q10,36 12,48 Q8,52 4,50" fill="none" stroke="#111" stroke-width="1.2"/>
<path d="M-12,48 Q-18,52 -14,58 Q-8,60 -4,56 Q-2,52 -4,50Z" fill="none" stroke="#111" stroke-width="1"/>
<path d="M12,48 Q18,52 14,58 Q8,60 4,56 Q2,52 4,50Z" fill="none" stroke="#111" stroke-width="1"/>
<path d="M0,22 Q-16,32 -18,46 Q-14,52 -10,46" fill="none" stroke="#111" stroke-width="1.1"/>
<text x="0" y="66" font-family="Caveat,cursive" font-size="9" fill="#777" text-anchor="middle">(Lucario)</text>
</g>`;
    }

    function pokemon_chienpao() {
      return `<g transform="translate(${cx},${sh(100)})">
<path d="M-22,8 Q-26,-10 -18,-24 Q-8,-34 0,-36 Q8,-34 18,-24 Q26,-10 22,8 Q14,22 0,26 Q-14,22 -22,8Z" fill="none" stroke="#111" stroke-width="1.3"/>
<path d="M-14,-44 Q-18,-58 -10,-66 Q0,-72 10,-66 Q18,-58 14,-44 Q8,-38 0,-36 Q-8,-38 -14,-44Z" fill="none" stroke="#111" stroke-width="1.3"/>
<path d="M-12,-62 Q-18,-74 -8,-78 Q-4,-70 -8,-64Z" fill="none" stroke="#111" stroke-width="1"/>
<path d="M12,-62 Q18,-74 8,-78 Q4,-70 8,-64Z" fill="none" stroke="#111" stroke-width="1"/>
<ellipse cx="-5" cy="-54" rx="3" ry="3.5" fill="#111"/>
<ellipse cx="5" cy="-54" rx="3" ry="3.5" fill="#111"/>
<path d="M-2,-48 Q0,-46 2,-48 Q2,-44 0,-43 Q-2,-44 -2,-48Z" fill="#111"/>
<path d="M-6,-44 Q-8,-36 -7,-28 Q-5,-26 -4,-30 Q-4,-38 -5,-44Z" fill="none" stroke="#111" stroke-width="1.4"/>
<path d="M6,-44 Q8,-36 7,-28 Q5,-26 4,-30 Q4,-38 5,-44Z" fill="none" stroke="#111" stroke-width="1.4"/>
<line x1="-14" y1="-46" x2="-28" y2="-44" stroke="#111" stroke-width="0.9"/>
<line x1="-14" y1="-48" x2="-28" y2="-50" stroke="#111" stroke-width="0.9"/>
<line x1="14" y1="-46" x2="28" y2="-44" stroke="#111" stroke-width="0.9"/>
<line x1="14" y1="-48" x2="28" y2="-50" stroke="#111" stroke-width="0.9"/>
<path d="M22,8 Q38,4 42,16 Q44,28 36,32 Q30,30 32,22 Q34,14 28,12" fill="none" stroke="#111" stroke-width="1.2"/>
<path d="M-18,8 Q-22,24 -20,40" fill="none" stroke="#111" stroke-width="1.2"/>
<path d="M-20,40 Q-26,44 -22,50 Q-16,52 -12,48 Q-10,44 -12,40Z" fill="none" stroke="#111" stroke-width="1"/>
<path d="M18,8 Q22,24 20,40" fill="none" stroke="#111" stroke-width="1.2"/>
<path d="M20,40 Q26,44 22,50 Q16,52 12,48 Q10,44 12,40Z" fill="none" stroke="#111" stroke-width="1"/>
<text x="0" y="62" font-family="Caveat,cursive" font-size="9" fill="#777" text-anchor="middle">(Chien-Pao)</text>
</g>`;
    }

    function pokemon_riolu() {
      return `<g transform="translate(${cx},${sh(105)})">
<path d="M-12,14 Q-16,2 -10,-10 Q0,-18 10,-10 Q16,2 12,14 Q6,22 0,24 Q-6,22 -12,14Z" fill="none" stroke="#111" stroke-width="1.3"/>
<path d="M-10,-10 Q-12,-22 -6,-30 Q0,-34 6,-30 Q12,-22 10,-10 Q5,-6 0,-4 Q-5,-6 -10,-10Z" fill="none" stroke="#111" stroke-width="1.3"/>
<path d="M-8,-26 Q-14,-40 -6,-46 Q-2,-38 -6,-28Z" fill="none" stroke="#111" stroke-width="1.1"/>
<path d="M8,-26 Q14,-40 6,-46 Q2,-38 6,-28Z" fill="none" stroke="#111" stroke-width="1.1"/>
<ellipse cx="-4" cy="-18" rx="3" ry="3.5" fill="#111"/>
<ellipse cx="4" cy="-18" rx="3" ry="3.5" fill="#111"/>
<circle cx="-3" cy="-19" r="1" fill="#fff"/>
<circle cx="5" cy="-19" r="1" fill="#fff"/>
<ellipse cx="0" cy="-13" rx="2" ry="1.5" fill="#111"/>
<path d="M-3,-11 Q0,-8 3,-11" fill="none" stroke="#111" stroke-width="0.9"/>
<path d="M-12,4 Q-22,0 -24,10 Q-20,18 -16,14" fill="none" stroke="#111" stroke-width="1.1"/>
<path d="M12,4 Q22,0 24,10 Q20,18 16,14" fill="none" stroke="#111" stroke-width="1.1"/>
<ellipse cx="-22" cy="12" rx="5" ry="4" fill="none" stroke="#111" stroke-width="1"/>
<ellipse cx="22" cy="12" rx="5" ry="4" fill="none" stroke="#111" stroke-width="1"/>
<path d="M-6,24 Q-8,36 -6,44" fill="none" stroke="#111" stroke-width="1.2"/>
<path d="M6,24 Q8,36 6,44" fill="none" stroke="#111" stroke-width="1.2"/>
<path d="M-6,44 Q-12,46 -10,52 Q-4,54 0,50 Q2,46 0,44Z" fill="none" stroke="#111" stroke-width="1"/>
<path d="M6,44 Q12,46 10,52 Q4,54 0,50 Q-2,46 0,44Z" fill="none" stroke="#111" stroke-width="1"/>
<text x="0" y="58" font-family="Caveat,cursive" font-size="9" fill="#777" text-anchor="middle">(Riolu)</text>
</g>`;
    }

    function pokemon_generic(label) {
      return `<g transform="translate(${cx},${sh(105)})">
<ellipse cx="0" cy="-4" rx="16" ry="18" fill="none" stroke="#111" stroke-width="1.3"/>
<ellipse cx="-7" cy="-19" rx="5" ry="7" fill="none" stroke="#111" stroke-width="1.1"/>
<ellipse cx="7" cy="-19" rx="5" ry="7" fill="none" stroke="#111" stroke-width="1.1"/>
<circle cx="-5" cy="-6" r="2" fill="#111"/>
<circle cx="5" cy="-6" r="2" fill="#111"/>
<path d="M-3,2 Q0,6 3,2" fill="none" stroke="#111" stroke-width="0.9"/>
<ellipse cx="0" cy="18" rx="13" ry="15" fill="none" stroke="#111" stroke-width="1.2"/>
<path d="M-13,8 Q-25,20 -22,36" fill="none" stroke="#111" stroke-width="1.1"/>
<path d="M13,8 Q25,20 22,36" fill="none" stroke="#111" stroke-width="1.1"/>
<line x1="-6" y1="33" x2="-8" y2="52" stroke="#111" stroke-width="1.1"/>
<line x1="6" y1="33" x2="8" y2="52" stroke="#111" stroke-width="1.1"/>
<path d="M-10,52 Q0,56 10,52" fill="none" stroke="#111" stroke-width="0.9"/>
<text x="0" y="64" font-family="Caveat,cursive" font-size="9" fill="#777" text-anchor="middle">(${label})</text>
</g>`;
    }

    function item_gong() {
      return `<g transform="translate(${cx},${sh(100)})">
<rect x="-38" y="-48" width="76" height="8" rx="3" fill="none" stroke="#111" stroke-width="1.4"/>
<rect x="-38" y="-44" width="8" height="80" rx="3" fill="none" stroke="#111" stroke-width="1.3"/>
<rect x="30" y="-44" width="8" height="80" rx="3" fill="none" stroke="#111" stroke-width="1.3"/>
<path d="M-42,36 Q-38,44 -30,44" fill="none" stroke="#111" stroke-width="1.3"/>
<path d="M42,36 Q38,44 30,44" fill="none" stroke="#111" stroke-width="1.3"/>
<line x1="-16" y1="-40" x2="-20" y2="-10" stroke="#111" stroke-width="1"/>
<line x1="16" y1="-40" x2="20" y2="-10" stroke="#111" stroke-width="1"/>
<circle cx="0" cy="10" r="28" fill="none" stroke="#111" stroke-width="2"/>
<circle cx="0" cy="10" r="22" fill="none" stroke="#333" stroke-width="0.8"/>
<circle cx="0" cy="10" r="14" fill="none" stroke="#333" stroke-width="0.8"/>
<circle cx="0" cy="10" r="7" fill="none" stroke="#333" stroke-width="0.8"/>
<circle cx="0" cy="10" r="3" fill="#333"/>
<line x1="26" y1="-14" x2="14" y2="4" stroke="#111" stroke-width="1.4"/>
<ellipse cx="12" cy="6" rx="6" ry="5" fill="none" stroke="#111" stroke-width="1.2"/>
</g>`;
    }

    function item_belt() {
      return `<g transform="translate(${cx},${sh(98)})">
<path d="M-60,-12 Q-62,-4 -60,8 L-18,12 L-18,-12Z" fill="none" stroke="#111" stroke-width="1.3"/>
<path d="M60,-12 Q62,-4 60,8 L18,12 L18,-12Z" fill="none" stroke="#111" stroke-width="1.3"/>
<rect x="-20" y="-22" width="40" height="44" rx="4" fill="none" stroke="#111" stroke-width="1.8"/>
<rect x="-16" y="-18" width="32" height="36" rx="3" fill="none" stroke="#333" stroke-width="0.9"/>
<polygon points="0,-14 3,-5 13,-5 5,2 8,12 0,6 -8,12 -5,2 -13,-5 -3,-5" fill="none" stroke="#111" stroke-width="1.3"/>
<text x="0" y="26" font-family="Caveat,cursive" font-size="9" font-weight="700" fill="#111" text-anchor="middle">MAX</text>
<line x1="-50" y1="-6" x2="-50" y2="2" stroke="#333" stroke-width="0.8"/>
<line x1="-44" y1="-6" x2="-44" y2="2" stroke="#333" stroke-width="0.8"/>
<line x1="-38" y1="-6" x2="-38" y2="2" stroke="#333" stroke-width="0.8"/>
<line x1="50" y1="-6" x2="50" y2="2" stroke="#333" stroke-width="0.8"/>
<line x1="44" y1="-6" x2="44" y2="2" stroke="#333" stroke-width="0.8"/>
<line x1="38" y1="-6" x2="38" y2="2" stroke="#333" stroke-width="0.8"/>
</g>`;
    }

    function item_poffin() {
      return `<g transform="translate(${cx},${sh(100)})">
<rect x="-32" y="8" width="64" height="36" rx="4" fill="none" stroke="#111" stroke-width="1.4"/>
<rect x="-34" y="4" width="68" height="10" rx="3" fill="none" stroke="#111" stroke-width="1.3"/>
<ellipse cx="-12" cy="28" rx="16" ry="12" fill="none" stroke="#111" stroke-width="1.3"/>
<path d="M-24,24 Q-18,10 -12,8 Q-6,10 0,24" fill="none" stroke="#111" stroke-width="1.1"/>
<path d="M-16,12 Q-12,6 -8,12 Q-6,8 -4,12" fill="none" stroke="#333" stroke-width="0.9"/>
<ellipse cx="14" cy="28" rx="14" ry="11" fill="none" stroke="#111" stroke-width="1.3"/>
<path d="M0,24 Q6,12 14,10 Q22,12 28,24" fill="none" stroke="#111" stroke-width="1.1"/>
<circle cx="-14" cy="26" r="1.5" fill="#333"/>
<circle cx="-8" cy="30" r="1.5" fill="#333"/>
<circle cx="12" cy="26" r="1.5" fill="#333"/>
<circle cx="18" cy="30" r="1.5" fill="#333"/>
<line x1="0" y1="4" x2="0" y2="44" stroke="#333" stroke-width="1"/>
<path d="M-6,4 Q0,-4 6,4 Q2,8 0,6 Q-2,8 -6,4Z" fill="none" stroke="#333" stroke-width="0.9"/>
</g>`;
    }

    function item_ball() {
      return `<g transform="translate(${cx},${sh(100)})">
<circle cx="0" cy="4" r="28" fill="none" stroke="#111" stroke-width="1.5"/>
<path d="M-28,4 Q-14,-8 0,-8 Q14,-8 28,4" fill="none" stroke="#111" stroke-width="1.2"/>
<line x1="-28" y1="4" x2="28" y2="4" stroke="#111" stroke-width="1.3"/>
<circle cx="0" cy="4" r="8" fill="none" stroke="#111" stroke-width="1.2"/>
<circle cx="0" cy="4" r="3" fill="#111"/>
<text x="0" y="44" font-family="Caveat,cursive" font-size="9" fill="#777" text-anchor="middle">(Ball)</text>
</g>`;
    }

    function sketch_supporter(label) {
      return `<g transform="translate(${cx},${sh(102)})">
<ellipse cx="0" cy="-26" rx="13" ry="14" fill="none" stroke="#111" stroke-width="1.3"/>
<circle cx="-4" cy="-28" r="2" fill="#111"/>
<circle cx="4" cy="-28" r="2" fill="#111"/>
<path d="M-4,-20 Q0,-16 4,-20" fill="none" stroke="#111" stroke-width="0.9"/>
<path d="M-6,-36 Q-4,-44 0,-46 Q4,-44 6,-36" fill="none" stroke="#111" stroke-width="1"/>
<path d="M-16,-12 Q-18,8 -14,36" fill="none" stroke="#111" stroke-width="1.4"/>
<path d="M16,-12 Q18,8 14,36" fill="none" stroke="#111" stroke-width="1.4"/>
<path d="M-14,36 Q0,40 14,36" fill="none" stroke="#111" stroke-width="1.1"/>
<path d="M-16,-4 Q-30,6 -26,24" fill="none" stroke="#111" stroke-width="1.2"/>
<rect x="-46" y="-4" width="14" height="18" rx="2" fill="none" stroke="#111" stroke-width="1.1"/>
<line x1="-39" y1="-4" x2="-39" y2="14" stroke="#333" stroke-width="0.7"/>
<line x1="-44" y1="2" x2="-34" y2="2" stroke="#333" stroke-width="0.6"/>
<path d="M16,-4 Q30,6 26,24" fill="none" stroke="#111" stroke-width="1.2"/>
<line x1="-8" y1="36" x2="-10" y2="58" stroke="#111" stroke-width="1.2"/>
<line x1="8" y1="36" x2="10" y2="58" stroke="#111" stroke-width="1.2"/>
<path d="M-14,58 Q0,62 14,58" fill="none" stroke="#111" stroke-width="1"/>
<path d="M26,-20 L28,-28 L30,-20 L22,-18 L30,-16 L28,-8 L26,-16 L18,-18Z" fill="none" stroke="#333" stroke-width="0.8"/>
<text x="0" y="72" font-family="Caveat,cursive" font-size="9" fill="#777" text-anchor="middle">(${label})</text>
</g>`;
    }

    function sketch_stadium() {
      return `<g transform="translate(${cx},${sh(102)})">
<path d="M-55,40 L-30,-30 L0,-50 L30,-30 L55,40Z" fill="none" stroke="#333" stroke-width="0.9"/>
<path d="M-8,-38 Q0,-52 8,-38 Q4,-34 0,-36 Q-4,-34 -8,-38Z" fill="none" stroke="#111" stroke-width="1.1"/>
<ellipse cx="0" cy="24" rx="50" ry="18" fill="none" stroke="#111" stroke-width="1.6"/>
<ellipse cx="0" cy="24" rx="36" ry="12" fill="none" stroke="#333" stroke-width="0.9"/>
<line x1="-36" y1="24" x2="36" y2="24" stroke="#333" stroke-width="0.8"/>
<ellipse cx="0" cy="24" rx="16" ry="8" fill="none" stroke="#333" stroke-width="0.8"/>
<path d="M-50,6 L-50,24" fill="none" stroke="#111" stroke-width="1.2"/>
<path d="M-50,6 Q-42,-6 -30,-8" fill="none" stroke="#111" stroke-width="1"/>
<path d="M50,6 L50,24" fill="none" stroke="#111" stroke-width="1.2"/>
<path d="M50,6 Q42,-6 30,-8" fill="none" stroke="#111" stroke-width="1"/>
<path d="M-36,-14 Q-30,-20 -24,-14 Q-24,-8 -30,-6 Q-36,-8 -36,-14Z" fill="none" stroke="#111" stroke-width="1"/>
<path d="M28,-18 Q34,-24 40,-16 Q40,-10 34,-8 Q28,-10 28,-18Z" fill="none" stroke="#111" stroke-width="1"/>
<ellipse cx="-44" cy="-4" rx="5" ry="4" fill="none" stroke="#333" stroke-width="0.8"/>
<ellipse cx="44" cy="-6" rx="4" ry="3" fill="none" stroke="#333" stroke-width="0.8"/>
</g>`;
    }

    function energy_fighting() {
      return `<g transform="translate(${cx},${sh(100)})">
<circle cx="0" cy="0" r="38" fill="none" stroke="#111" stroke-width="1.8"/>
<circle cx="0" cy="0" r="30" fill="none" stroke="#222" stroke-width="1"/>
<circle cx="0" cy="0" r="22" fill="none" stroke="#333" stroke-width="0.7"/>
<path d="M-14,-18 Q-18,-8 -16,4 Q-12,12 -4,14 Q4,14 10,10 Q16,4 14,-4 Q10,-14 4,-18Z" fill="none" stroke="#111" stroke-width="1.5"/>
<path d="M-10,-18 Q-8,-28 -4,-28 Q0,-28 0,-18" fill="none" stroke="#111" stroke-width="1.3"/>
<path d="M0,-18 Q2,-28 6,-28 Q10,-26 8,-18" fill="none" stroke="#111" stroke-width="1.3"/>
<path d="M-14,-4 Q-22,-6 -22,2 Q-20,8 -14,6" fill="none" stroke="#111" stroke-width="1.2"/>
<path d="M16,-22 L20,-28 L18,-22 L24,-20 L18,-18 L20,-12 L16,-18 L10,-16Z" fill="none" stroke="#333" stroke-width="0.9"/>
<text x="0" y="50" font-family="Caveat,cursive" font-size="9" fill="#777" text-anchor="middle">(Fighting)</text>
</g>`;
    }

    function energy_special() {
      return `<g transform="translate(${cx},${sh(100)})">
<circle cx="0" cy="0" r="38" fill="none" stroke="#111" stroke-width="1.8"/>
<circle cx="0" cy="0" r="30" fill="none" stroke="#222" stroke-width="1"/>
<path d="M0,-28 L24,-8 L14,22 L-14,22 L-24,-8Z" fill="none" stroke="#111" stroke-width="1.6"/>
<path d="M0,-28 L0,22" fill="none" stroke="#333" stroke-width="0.8"/>
<path d="M-24,-8 L14,22" fill="none" stroke="#333" stroke-width="0.8"/>
<path d="M24,-8 L-14,22" fill="none" stroke="#333" stroke-width="0.8"/>
<path d="M-24,-8 L24,-8" fill="none" stroke="#333" stroke-width="0.8"/>
<path d="M0,-36 L2,-30 L6,-28 L2,-26 L0,-20" fill="none" stroke="#222" stroke-width="1"/>
<path d="M28,28 L30,22 L32,28 L26,30 L32,32 L30,38 L28,32 L22,30Z" fill="none" stroke="#333" stroke-width="0.8"/>
<text x="0" y="50" font-family="Caveat,cursive" font-size="9" fill="#777" text-anchor="middle">(Special)</text>
</g>`;
    }

    function energy_basic(type) {
      const syms = { Fire:'F', Water:'W', Grass:'G', Lightning:'L', Psychic:'P', Darkness:'D', Metal:'M', Dragon:'N', Fairy:'Y', Colorless:'C' };
      const sym = syms[type] || '?';
      return `<g transform="translate(${cx},${sh(100)})">
<circle cx="0" cy="0" r="38" fill="none" stroke="#111" stroke-width="1.8"/>
<circle cx="0" cy="0" r="28" fill="none" stroke="#222" stroke-width="1"/>
<circle cx="0" cy="0" r="18" fill="none" stroke="#333" stroke-width="0.7"/>
<text x="0" y="14" font-family="Caveat,cursive" font-size="36" font-weight="700" text-anchor="middle" fill="#111">${sym}</text>
<text x="0" y="50" font-family="Caveat,cursive" font-size="9" fill="#777" text-anchor="middle">(${type || 'Basic'})</text>
</g>`;
    }

    function item_generic(label) {
      return `<g transform="translate(${cx},${sh(100)})">
<rect x="-22" y="-22" width="44" height="50" rx="5" fill="none" stroke="#111" stroke-width="1.4"/>
<rect x="-8" y="-30" width="16" height="10" rx="3" fill="none" stroke="#111" stroke-width="1.2"/>
<line x1="0" y1="-12" x2="0" y2="10" stroke="#111" stroke-width="2.2"/>
<line x1="-10" y1="0" x2="10" y2="0" stroke="#111" stroke-width="2.2"/>
<circle cx="-8" cy="20" r="3" fill="none" stroke="#333" stroke-width="0.8"/>
<circle cx="8" cy="20" r="3" fill="none" stroke="#333" stroke-width="0.8"/>
<text x="0" y="40" font-family="Caveat,cursive" font-size="9" fill="#777" text-anchor="middle">(${label})</text>
</g>`;
    }

    let sketchSVG = '';
    let footLeft = '';
    const footRight = `${setCode} ${number}`;

    if (supertype === 'Pokémon') {
      const weakType = card.weaknesses ? card.weaknesses[0].type : '?';
      footLeft = `Weak: ${weakType}`;
      if (lname.includes('lucario')) sketchSVG = pokemon_lucario();
      else if (lname.includes('chien') || lname.includes('pao')) sketchSVG = pokemon_chienpao();
      else if (lname.includes('riolu')) sketchSVG = pokemon_riolu();
      else sketchSVG = pokemon_generic(name.split(' ')[0]);
    } else if (supertype === 'Trainer') {
      footLeft = `[${subtype || 'Trainer'}]`;
      const sub = subtype.toLowerCase();
      if (sub === 'stadium') sketchSVG = sketch_stadium();
      else if (sub === 'supporter') sketchSVG = sketch_supporter(name.split(' ')[0]);
      else if (lname.includes('gong')) sketchSVG = item_gong();
      else if (lname.includes('belt') || lname.includes('band')) sketchSVG = item_belt();
      else if (lname.includes('poffin')) sketchSVG = item_poffin();
      else if (lname.includes('ball')) sketchSVG = item_ball();
      else sketchSVG = item_generic(subtype || 'Item');
    } else {
      footLeft = `[${subtype || 'Basic'} Energy]`;
      if (subtype === 'Special' || lname.includes('rocky') || lname.includes('rainbow') || lname.includes('double')) {
        sketchSVG = energy_special();
      } else if (lname.includes('fight') || subtype === 'Fighting') {
        sketchSVG = energy_fighting();
      } else {
        sketchSVG = energy_basic(subtype || name.replace(' Energy', '').replace('Basic ', ''));
      }
    }

    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
<style>@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&amp;display=swap');</style>
<rect x="1" y="1" width="${W-2}" height="${H-2}" rx="9" fill="#fefefe" stroke="#111" stroke-width="1.8"/>
<rect x="5" y="5" width="${W-10}" height="${H-10}" rx="6" fill="none" stroke="#444" stroke-width="0.5"/>
<text x="9" y="18" font-family="Caveat,cursive" font-size="${W > 80 ? 12 : 7}" font-weight="700" fill="#111">${shortName}</text>
<text x="${W-9}" y="18" font-family="Caveat,cursive" font-size="${W > 80 ? 10 : 6}" fill="#333" text-anchor="end">${rightText}</text>
<line x1="7" y1="23" x2="${W-7}" y2="23" stroke="#222" stroke-width="0.9"/>
${subLine && W > 60 ? `<text x="9" y="32" font-family="Caveat,cursive" font-size="9" fill="#666">${subLine}</text>` : ''}
${sketchSVG}
<line x1="7" y1="${H-36}" x2="${W-7}" y2="${H-36}" stroke="#444" stroke-width="0.6" stroke-dasharray="3,2"/>
${W > 60 ? `<text x="9" y="${H-22}" font-family="Caveat,cursive" font-size="9" fill="#555">${footLeft}</text>` : ''}
<text x="${W-9}" y="${H-10}" font-family="Caveat,cursive" font-size="${W > 60 ? 8 : 5}" fill="#999" text-anchor="end">${footRight}</text>
</svg>`;
  }

  function sketchToDataURI(card, w, h) {
    const svg = generateSketchCard(card, w, h);
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  // =====================
  // TCGdex FALLBACK (third tier, for cards pokemontcg.io hasn't indexed yet —
  // typically very recent promos)
  // =====================
  async function resolveLive(cardName, setCode, cardNumber) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(
        `https://api.pokemontcg.io/v2/cards?q=name:${encodeURIComponent(cardName)}*&pageSize=10`,
        { headers: { 'X-Api-Key': API_KEY }, signal: controller.signal }
      );
      clearTimeout(timeoutId);
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        const exact = data.data.find(c => c.set?.ptcgoCode === setCode && c.number === cardNumber);
        const setM = data.data.find(c => c.set?.ptcgoCode === setCode);
        return exact || setM || data.data[0];
      }
    } catch (e) {
      console.warn(`pokemontcg.io: fetch threw for "${cardName}" — ${e.name}: ${e.message}`);
    }
    return await fetchFromTCGdex(cardName);
  }

  async function fetchFromTCGdex(cardName) {
    const url = `https://api.tcgdex.net/v2/en/cards?name=${encodeURIComponent(cardName)}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) {
        console.warn(`TCGdex: HTTP ${res.status} for "${cardName}" — ${url}`);
        return null;
      }
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        console.warn(`TCGdex: no results for "${cardName}" — ${url}`);
        return null;
      }
      const match = data.find(c => c.name.toLowerCase() === cardName.toLowerCase()) || data[0];
      console.log(`TCGdex: found "${match.name}" for "${cardName}"`);
      const st = guessType(match.name);
      return {
        id: `tcgdex-${match.id}`,
        name: match.name,
        supertype: st,
        subtypes: [guessSubtype(match.name, st)],
        images: { small: `${match.image}/low.webp`, large: `${match.image}/high.webp` },
      };
    } catch (e) {
      console.error(`TCGdex: fetch threw for "${cardName}" — ${e.name}: ${e.message} — ${url}`);
      return null;
    }
  }

  // =====================
  // CARD SEARCH
  // =====================
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const cardGrid = document.getElementById('cardGrid');

  searchBtn.addEventListener('click', () => searchCards());
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchCards();
  });

  async function searchCards() {
    const query = searchInput.value.trim();
    const format = 'standard'; // FIX: app is Standard-only, dropdown removed for clarity
    if (!query) {
      cardGrid.innerHTML = '<p style="color:#7A9BB5;padding:16px">Please enter a card name.</p>';
      return;
    }

    // FIX-10/11: Standard search reads from the local cached catalog — instant, no API call
    if (format === 'standard' && standardCatalog.length > 0) {
      const q = query.toLowerCase();
      const cards = standardCatalog.filter(card => card.name.toLowerCase().includes(q));
      if (cards.length === 0) {
        cardGrid.innerHTML = '<p style="color:#7A9BB5;padding:16px">No Standard legal cards found. Try "All Sets".</p>';
        return;
      }
      renderCards(cards);
      return;
    }

    // FIX-12: fallback to live API — used for "All Sets" or if the local catalog
    // hasn't been generated yet (first run before GitHub Actions has committed it)
    cardGrid.innerHTML = '<p style="color:#7A9BB5;padding:16px">Searching cards...</p>';
    try {
      const url = `https://api.pokemontcg.io/v2/cards?q=name:${query}*&pageSize=60&orderBy=-set.releaseDate`;
      const response = await fetch(url, { headers: { 'X-Api-Key': API_KEY } });
      const data = await response.json();
      let cards = data.data;
      if (!cards || cards.length === 0) {
        cardGrid.innerHTML = '<p style="color:#7A9BB5;padding:16px">No cards found. Try another name.</p>';
        return;
      }
      if (format === 'standard') {
        cards = cards.filter(card => ['H','I','J'].includes(card.regulationMark));
        if (cards.length === 0) {
          cardGrid.innerHTML = '<p style="color:#7A9BB5;padding:16px">No Standard legal cards found. Try "All Sets".</p>';
          return;
        }
      }
      renderCards(cards);
    } catch (error) {
      cardGrid.innerHTML = `<p style="color:#E63946;padding:16px">Error: ${error.message}</p>`;
    }
  }

  function renderCards(cards) {
    cardGrid.innerHTML = '';
    cards.forEach(card => {
      const image = card.images?.small || '';
      const hp = card.hp ? `HP: ${card.hp}` : card.supertype;
      const cardEl = document.createElement('div');
      cardEl.className = 'card-item';
      cardEl.innerHTML = `
        <img src="${image}" alt="${card.name}" loading="lazy" title="Click to zoom">
        <div class="card-name">${card.name}</div>
        <div class="card-hp">${hp}</div>
        <button class="add-btn">+ Add to Deck</button>
      `;
      cardEl.querySelector('img').addEventListener('click', () => openCardModal(card));
      cardEl.querySelector('.add-btn').addEventListener('click', () => addToDeck(card));
      cardGrid.appendChild(cardEl);
    });
  }

  function openCardModal(card) {
    const existing = document.getElementById('cardModal');
    if (existing) existing.remove();
    const largeImg = card.images?.large || card.images?.small || '';
    const overlay = document.createElement('div');
    overlay.className = 'card-modal-overlay';
    overlay.id = 'cardModal';
    overlay.innerHTML = `
      <span class="card-modal-close">✕</span>
      <img src="${largeImg}" class="card-modal-img" alt="${card.name}">
    `;
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.classList.contains('card-modal-close')) {
        overlay.remove();
      }
    });
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        overlay.remove();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
    document.body.appendChild(overlay);
  }

  // =====================
  // DECK BUILDER
  // =====================
  let deck = [];

  function addToDeck(card) {
    if (deck.reduce((sum, c) => sum + c.quantity, 0) >= 60) {
      alert('Your deck already has 60 cards!');
      return;
    }
    const existing = deck.find(c => c.id === card.id);
    const isBasicEnergy = card.supertype === 'Energy' && card.subtypes?.includes('Basic');
    if (existing) {
      if (!isBasicEnergy && existing.quantity >= 4) {
        alert(`You can only have 4 copies of ${card.name}!`);
        return;
      }
      existing.quantity++;
    } else {
      deck.push({ ...card, quantity: 1 });
    }
    renderDeck();
    updateDeckStats();
  }

  function removeFromDeck(cardId) {
    const existing = deck.find(c => c.id === cardId);
    if (!existing) return;
    if (existing.quantity > 1) existing.quantity--;
    else deck = deck.filter(c => c.id !== cardId);
    renderDeck();
    updateDeckStats();
  }

  function removeFully(cardId) {
    deck = deck.filter(c => c.id !== cardId);
    renderDeck();
    updateDeckStats();
  }

  window.removeFromDeck = removeFromDeck;
  window.removeFully = removeFully;
  window.addToDeckById = function(cardId) {
    const card = deck.find(c => c.id === cardId);
    if (card) addToDeck(card);
  };

  function renderDeck() {
    const deckList = document.getElementById('deckList');
    if (deck.length === 0) {
      deckList.innerHTML = '<p style="color:#7A9BB5;text-align:center;padding:32px">Your deck is empty. Search for cards and add them!</p>';
      return;
    }
    const order = ['Pokémon', 'Trainer', 'Energy'];
    const sorted = [...deck].sort((a, b) => order.indexOf(a.supertype) - order.indexOf(b.supertype));
    deckList.innerHTML = '';
    sorted.forEach(card => {
      const row = document.createElement('div');
      row.className = 'deck-card-row';
      const imgEl = document.createElement('img');
      imgEl.style.cssText = 'width:40px;height:56px;border-radius:4px;flex-shrink:0;object-fit:cover;cursor:zoom-in;';
      imgEl.alt = card.name;
      if (card.images?.small) {
        imgEl.src = card.images.small;
        imgEl.onerror = () => { imgEl.src = sketchToDataURI(card, 40, 56); };
      } else {
        imgEl.src = sketchToDataURI(card, 40, 56);
      }
      imgEl.addEventListener('click', () => openCardModal(card)); // FIX: zoom now works in Deck Builder too
      row.appendChild(imgEl);
      row.innerHTML += `
        <div class="deck-card-name">${card.name}</div>
        <div class="deck-card-type">${card.supertype}</div>
        <div class="qty-controls">
          <button class="qty-btn" onclick="removeFromDeck('${card.id}')">−</button>
          <span class="qty-number">${card.quantity}</span>
          <button class="qty-btn" onclick="addToDeckById('${card.id}')">+</button>
        </div>
        <button class="remove-btn" onclick="removeFully('${card.id}')">✕</button>
      `;
      deckList.appendChild(row);
    });
  }

  function updateDeckStats() {
    const total = deck.reduce((sum, c) => sum + c.quantity, 0);
    const pokemon = deck.filter(c => c.supertype === 'Pokémon').reduce((sum, c) => sum + c.quantity, 0);
    const trainers = deck.filter(c => c.supertype === 'Trainer').reduce((sum, c) => sum + c.quantity, 0);
    const energy = deck.filter(c => c.supertype === 'Energy').reduce((sum, c) => sum + c.quantity, 0);
    document.getElementById('cardCount').textContent = total;
    document.getElementById('pokemonCount').textContent = pokemon;
    document.getElementById('trainerCount').textContent = trainers;
    document.getElementById('energyCount').textContent = energy;
    const countEl = document.getElementById('cardCount');
    countEl.style.color = total === 60 ? '#6b9e93' : total > 60 ? '#E63946' : '#ffd166';
    renderProbabilityPanel();
  }

  // =====================
  // DECK IMPORT
  // =====================
  const importBtn = document.getElementById('importBtn');
  const clearDeckBtn = document.getElementById('clearDeckBtn');

  importBtn.addEventListener('click', () => importDeck());
  clearDeckBtn.addEventListener('click', () => {
    deck = [];
    renderDeck();
    updateDeckStats();
    document.getElementById('deckImport').value = '';
  });

  function guessType(name) {
    const n = name.toLowerCase();
    if (n.includes('energy')) return 'Energy';
    const trainerWords = ['professor','research','ball','potion','catcher','switch','nest','ultra','boss','arven','iono','hilda','lillie','belt','pad','gong','balloon','poffin','petrel','mountain','card','power','gravity','determination','premium','poke','special','rocket','team','air','buddy','maximum','orders'];
    if (trainerWords.some(w => n.includes(w))) return 'Trainer';
    return 'Pokémon';
  }

  function guessSubtype(name, supertype) {
    if (supertype !== 'Trainer') return '';
    const n = name.toLowerCase();
    if (['professor','boss','hilda','lillie','arven','iono','petrel'].some(w => n.includes(w))) return 'Supporter';
    if (['mountain','city','gym','forest','tower','arena','park'].some(w => n.includes(w))) return 'Stadium';
    return 'Item';
  }

  // TCG Live shorthand for basic energy type letters
  const ENERGY_TYPE_CODES = {
    G: 'Grass', R: 'Fire', W: 'Water', L: 'Lightning', P: 'Psychic',
    F: 'Fighting', D: 'Darkness', M: 'Metal', Y: 'Fairy', N: 'Dragon', C: 'Colorless',
  };

  function cleanCardName(rawName) {
    // "Basic {D} Energy" -> "Darkness Energy" (was being deleted entirely before,
    // which broke basic energy imports from TCG Live — searched for a card
    // literally named "Energy", which doesn't exist)
    rawName = rawName.replace(/\{([A-Z])\}\s*Energy/gi, (m, code) => `${ENERGY_TYPE_CODES[code.toUpperCase()] || code} Energy`);
    return rawName.replace(/\{[A-Z]\}/g, '').replace(/Basic\s+/gi, '').replace(/\s+/g, ' ').trim();
  }

  function isSkipLine(line) {
    if (/^(Pokémon|Pokemon|Trainer|Energy|Trainers):\s*\d+$/i.test(line)) return true;
    if (/^Total\s+Cards?:\s*\d+$/i.test(line)) return true;
    if (line.trim() === '') return true;
    return false;
  }

  async function importDeck() {
    const text = document.getElementById('deckImport').value.trim();
    if (!text) { alert('Please paste a decklist first!'); return; }
    const lines = text.split('\n').map(l => l.trim());
    const cardLines = lines.filter(line => !isSkipLine(line) && /^\d+\s+\S/.test(line));
    if (cardLines.length === 0) {
      alert('No valid cards found. Make sure you copied the full decklist from Pokémon TCG Live.');
      return;
    }
    importBtn.textContent = '⏳ Importing...';
    importBtn.disabled = true;
    deck = [];
    let imported = 0, withImage = 0, withSketch = 0;

    for (const line of cardLines) {
      // Limitless TCG export quirk: basic energies come out as
      // "4 Grass Energy Energy 27" — the real card name is "Grass Energy",
      // followed by a literal "Energy" placeholder + Limitless's own internal
      // number (not a real print code), which breaks the normal set-code match.
      const limitlessEnergyMatch = line.match(/^(\d+)\s+(.+?\s+Energy)\s+Energy\s+\d+[a-z]?$/i);
      if (limitlessEnergyMatch) {
        const quantity = parseInt(limitlessEnergyMatch[1]);
        const name = cleanCardName(limitlessEnergyMatch[2]);
        const localMatch = findInCatalog(name, '', '');
        const resolvedCard = localMatch || await resolveLive(name, '', '');
        if (resolvedCard) {
          console.log(`IMPORT [energy]: "${line}" -> id="${resolvedCard.id}" set="${resolvedCard.set?.ptcgoCode || resolvedCard.set?.id || ''}" number="${resolvedCard.number || ''}" (${localMatch ? 'local' : 'live'})`);
          const existing = deck.find(c => c.id === resolvedCard.id);
          if (existing) existing.quantity += quantity;
          else deck.push({ ...resolvedCard, quantity });
          imported += quantity; withImage += quantity;
        } else {
          deck.push({ id: `sketch-${name}-${Date.now()}`, name, supertype: 'Energy', subtypes: ['Basic'], quantity, images: { small: '' } });
          imported += quantity; withSketch += quantity;
        }
        continue;
      }

      const match = line.match(/^(\d+)\s+(.+?)\s+([A-Z0-9]{2,6}(?:-[A-Z0-9]{2,6})?)\s+(\d+[a-z]?)$/);
      if (!match) {
        const simple = line.match(/^(\d+)\s+(.+)$/);
        if (simple) {
          const quantity = parseInt(simple[1]);
          // The line may still end in "<CODE> <NUMBER>" even if the strict regex
          // didn't match — strip it before searching (hyphen-aware, e.g. "PR-SV").
          const trailingCodeMatch = simple[2].match(/^(.+?)\s+([A-Z0-9]{2,6}(?:-[A-Z0-9]{2,6})?)\s+(\d+[a-z]?)$/);
          const name = cleanCardName(trailingCodeMatch ? trailingCodeMatch[1] : simple[2]);
          const setCode = trailingCodeMatch ? trailingCodeMatch[2] : '';
          const cardNumber = trailingCodeMatch ? trailingCodeMatch[3] : '';
          if (name) {
            const localMatch = findInCatalog(name, setCode, cardNumber);
            const resolvedCard = localMatch || await resolveLive(name, setCode, cardNumber);
            if (resolvedCard) {
              console.log(`IMPORT [fallback]: "${line}" -> id="${resolvedCard.id}" set="${resolvedCard.set?.ptcgoCode || resolvedCard.set?.id || ''}" number="${resolvedCard.number || ''}" (${localMatch ? 'local' : 'live'})`);
              const existing = deck.find(c => c.id === resolvedCard.id);
              if (existing) existing.quantity += quantity;
              else deck.push({ ...resolvedCard, quantity });
              imported += quantity; withImage += quantity;
            } else {
              const st = guessType(name);
              deck.push({ id: `sketch-${name}-${Date.now()}`, name, supertype: st, subtypes: [guessSubtype(name, st)], quantity, images: { small: '' } });
              imported += quantity; withSketch += quantity;
            }
          }
        }
        continue;
      }
      const quantity = parseInt(match[1]);
      const cardName = cleanCardName(match[2].trim());
      const setCode = match[3];
      const cardNumber = match[4];

      // FIX: check the local Standard catalog first — instant, no network,
      // and immune to the pokemontcg.io intermittent failures we diagnosed.
      const localMatch = findInCatalog(cardName, setCode, cardNumber);
      if (localMatch) {
        console.log(`IMPORT [strict]: "${line}" -> id="${localMatch.id}" set="${localMatch.set?.ptcgoCode || localMatch.set?.id || ''}" number="${localMatch.number || ''}" (local, requested set="${setCode}" number="${cardNumber}")`);
        const existing = deck.find(c => c.id === localMatch.id);
        if (existing) existing.quantity += quantity;
        else deck.push({ ...localMatch, quantity });
        imported += quantity; withImage += quantity;
        continue;
      }

      // Fallback: live API — only reached for cards not in the Standard catalog
      // (e.g. Basic Energy without a regulation mark, promo cards not yet indexed
      // locally, or Expanded-only cards). We only ever match on the EXACT card
      // name — a wrong Pokémon's art is worse than no art for deck-building.
      const resolvedCard = await resolveLive(cardName, setCode, cardNumber);
      if (resolvedCard) {
        console.log(`IMPORT [strict-live]: "${line}" -> id="${resolvedCard.id}" set="${resolvedCard.set?.ptcgoCode || resolvedCard.set?.id || ''}" number="${resolvedCard.number || ''}" (live, requested set="${setCode}" number="${cardNumber}" — NOT FOUND IN LOCAL CATALOG)`);
        const existing = deck.find(c => c.id === resolvedCard.id);
        if (existing) existing.quantity += quantity;
        else deck.push({ ...resolvedCard, quantity });
        imported += quantity; withImage += quantity;
      } else {
        const st = guessType(cardName);
        deck.push({ id: `sketch-${cardName}-${setCode}-${cardNumber}-${Date.now()}`, name: cardName, supertype: st, subtypes: [guessSubtype(cardName, st)], set: { ptcgoCode: setCode }, number: cardNumber, quantity, images: { small: '' } });
        imported += quantity; withSketch += quantity;
      }
    }
    renderDeck();
    updateDeckStats();
    importBtn.textContent = '⚡ Import Deck';
    importBtn.disabled = false;
    const total = deck.reduce((sum, c) => sum + c.quantity, 0);
    alert(`✅ Import complete!\n\n📦 ${total}/60 cards loaded\n🖼️ ${withImage} with real image\n✏️ ${withSketch} with sketch`);
  }

  // =====================
  // DRAW PROBABILITY (hypergeometric distribution)
  // =====================
  function combination(n, r) {
    if (r < 0 || r > n) return 0;
    r = Math.min(r, n - r);
    let result = 1;
    for (let i = 0; i < r; i++) result = (result * (n - i)) / (i + 1);
    return result;
  }

  // P(drawing at least one copy of a card in the opening hand)
  function probabilityAtLeastOne(deckSize, successCount, drawSize) {
    if (successCount <= 0 || deckSize <= 0) return 0;
    if (drawSize > deckSize) drawSize = deckSize;
    const failCount = deckSize - successCount;
    const probNone = combination(failCount, drawSize) / combination(deckSize, drawSize);
    return 1 - probNone;
  }

  function renderProbabilityPanel() {
    const panel = document.getElementById('probabilityPanel');
    if (!panel) return;
    const deckSize = deck.reduce((sum, c) => sum + c.quantity, 0);
    if (deckSize < 7) {
      panel.innerHTML = '';
      return;
    }
    const rows = deck
      .map(card => ({
        name: card.name,
        quantity: card.quantity,
        prob: probabilityAtLeastOne(deckSize, card.quantity, 7),
      }))
      .sort((a, b) => b.prob - a.prob);

    panel.innerHTML = `
      <h3 class="prob-title">📊 Draw Probability — chance of at least 1 copy in your opening 7</h3>
      <div class="prob-list">
        ${rows.map(r => `
          <div class="prob-row">
            <span class="prob-name">${r.name} <span class="prob-qty">×${r.quantity}</span></span>
            <div class="prob-bar-track">
              <div class="prob-bar-fill" style="width:${(r.prob * 100).toFixed(1)}%"></div>
            </div>
            <span class="prob-pct">${(r.prob * 100).toFixed(1)}%</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  // =====================
  // HAND SIMULATOR
  // =====================
  const drawBtn = document.getElementById('drawBtn');
  const handDisplay = document.getElementById('handDisplay');

  drawBtn.addEventListener('click', () => drawOpeningHand());

  function drawOpeningHand() {
    if (deck.length === 0) {
      handDisplay.innerHTML = '<p style="color:#E63946;padding:16px">Your deck is empty! Add cards in Deck Builder first.</p>';
      return;
    }
    const totalCards = deck.reduce((sum, c) => sum + c.quantity, 0);
    if (totalCards < 7) {
      handDisplay.innerHTML = `<p style="color:#E63946;padding:16px">You need at least 7 cards. You have ${totalCards}.</p>`;
      return;
    }
    let fullDeck = [];
    deck.forEach(card => { for (let i = 0; i < card.quantity; i++) fullDeck.push(card); });
    for (let i = fullDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [fullDeck[i], fullDeck[j]] = [fullDeck[j], fullDeck[i]];
    }
    const hand = fullDeck.slice(0, 7);
    const hasBasic = hand.some(c => c.supertype === 'Pokémon' && c.subtypes?.includes('Basic'));
    handDisplay.innerHTML = '';
    if (!hasBasic) {
      handDisplay.innerHTML = `<div style="width:100%;margin-bottom:16px;padding:12px 16px;background:rgba(230,57,70,0.1);border:1px solid #E63946;border-radius:8px;color:#ff6b74;font-size:13px;">⚠️ <strong>Mulligan!</strong> No Basic Pokémon in hand. You would redraw in a real game.</div>`;
    }
    hand.forEach((card, index) => {
      const cardEl = document.createElement('div');
      cardEl.className = 'hand-card';
      cardEl.style.animationDelay = `${index * 0.08}s`;
      const isBasic = card.supertype === 'Pokémon' && card.subtypes?.includes('Basic');
      const imgEl = document.createElement('img');
      imgEl.style.cssText = 'width:100%;border-radius:6px;margin-bottom:6px;cursor:zoom-in;';
      imgEl.alt = card.name;
      if (card.images?.small) {
        imgEl.src = card.images.small;
        imgEl.onerror = () => { imgEl.src = sketchToDataURI(card, 110, 154); };
      } else {
        imgEl.src = sketchToDataURI(card, 110, 154);
      }
      imgEl.addEventListener('click', () => openCardModal(card));
      cardEl.appendChild(imgEl);
      const nameDiv = document.createElement('div');
      nameDiv.className = 'hand-card-name';
      nameDiv.textContent = card.name;
      cardEl.appendChild(nameDiv);
      if (isBasic) {
        const badge = document.createElement('div');
        badge.style.cssText = 'font-size:10px;color:#6b9e93;margin-top:3px';
        badge.textContent = '✓ Basic';
        cardEl.appendChild(badge);
      }
      handDisplay.appendChild(cardEl);
    });

    const basics = hand.filter(c => c.supertype === 'Pokémon' && c.subtypes?.includes('Basic')).length;
    const trainers = hand.filter(c => c.supertype === 'Trainer').length;
    const energies = hand.filter(c => c.supertype === 'Energy').length;
    const statsEl = document.createElement('div');
    statsEl.style.cssText = 'width:100%;margin-top:20px;display:flex;gap:12px;flex-wrap:wrap;';
    statsEl.innerHTML = `
      <div style="background:#0a2a36;border:1px solid #1E3A50;border-radius:8px;padding:12px 20px;text-align:center;min-width:80px"><div style="font-size:22px;font-weight:700;color:#6b9e93">${basics}</div><div style="font-size:11px;color:#7A9BB5;text-transform:uppercase;letter-spacing:1px">Basic Pokémon</div></div>
      <div style="background:#0a2a36;border:1px solid #1E3A50;border-radius:8px;padding:12px 20px;text-align:center;min-width:80px"><div style="font-size:22px;font-weight:700;color:#ffd166">${trainers}</div><div style="font-size:11px;color:#7A9BB5;text-transform:uppercase;letter-spacing:1px">Trainers</div></div>
      <div style="background:#0a2a36;border:1px solid #1E3A50;border-radius:8px;padding:12px 20px;text-align:center;min-width:80px"><div style="font-size:22px;font-weight:700;color:#6b9e93">${energies}</div><div style="font-size:11px;color:#7A9BB5;text-transform:uppercase;letter-spacing:1px">Energies</div></div>
      <div style="background:#0a2a36;border:1px solid #1E3A50;border-radius:8px;padding:12px 20px;text-align:center;min-width:80px"><div style="font-size:22px;font-weight:700;color:#ffd166">${hasBasic ? '✓ Ready' : '✗ Mulligan'}</div><div style="font-size:11px;color:#7A9BB5;text-transform:uppercase;letter-spacing:1px">Hand Status</div></div>
    `;
    handDisplay.appendChild(statsEl);
  }

  // =====================
  // DAMAGE CALCULATOR
  // =====================
  const calcBtn = document.getElementById('calcBtn');
  calcBtn.addEventListener('click', () => calculateDamage());

  function calculateDamage() {
    const base = parseInt(document.getElementById('baseDmg').value) || 0;
    const coin = parseInt(document.getElementById('coinBonus').value) || 0;
    const extra = parseInt(document.getElementById('extraDmg').value) || 0;
    const opponentHp = parseInt(document.getElementById('opponentHp').value) || 0;
    const weaknessVal = parseFloat(document.getElementById('weakness').value);
    const resistanceVal = parseInt(document.getElementById('resistance').value) || 0;
    let total = base + coin + extra;
    if (weaknessVal === 2 || weaknessVal === 1.5) total = Math.floor(total * weaknessVal);
    else if (weaknessVal === 30) total = total + 30;
    total = Math.max(0, total - resistanceVal);
    document.getElementById('damageNumber').textContent = total;
    document.getElementById('damageResult').style.display = 'block';
    const knockoutEl = document.getElementById('knockoutMsg');
    if (opponentHp > 0 && total >= opponentHp) knockoutEl.innerHTML = '💥 <span style="color:#6b9e93;font-size:18px;font-weight:700">KNOCK OUT!</span>';
    else if (opponentHp > 0) knockoutEl.innerHTML = `<span style="color:#7A9BB5">${opponentHp - total} HP remaining — not a KO</span>`;
    else knockoutEl.innerHTML = '';
    let tags = '';
    if (weaknessVal === 2)   tags += '<span style="background:rgba(230,57,70,0.15);color:#ff6b74;padding:4px 10px;border-radius:4px;font-size:12px;margin:2px">×2 Weakness</span>';
    if (weaknessVal === 1.5) tags += '<span style="background:rgba(230,57,70,0.15);color:#ff6b74;padding:4px 10px;border-radius:4px;font-size:12px;margin:2px">×1.5 Weakness</span>';
    if (weaknessVal === 30)  tags += '<span style="background:rgba(230,57,70,0.15);color:#ff6b74;padding:4px 10px;border-radius:4px;font-size:12px;margin:2px">+30 Weakness</span>';
    if (resistanceVal > 0)   tags += `<span style="background:rgba(107,158,147,0.15);color:#6b9e93;padding:4px 10px;border-radius:4px;font-size:12px;margin:2px">-${resistanceVal} Resistance</span>`;
    if (coin > 0)            tags += `<span style="background:rgba(255,209,102,0.15);color:#ffd166;padding:4px 10px;border-radius:4px;font-size:12px;margin:2px">+${coin} Coin Flip</span>`;
    if (extra > 0)           tags += `<span style="background:rgba(255,209,102,0.15);color:#ffd166;padding:4px 10px;border-radius:4px;font-size:12px;margin:2px">+${extra} Tool/Stadium</span>`;
    document.getElementById('damageTags').innerHTML = tags;
  }

  renderDeck();

}); // closes DOMContentLoaded