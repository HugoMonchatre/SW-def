// Rune speed & efficiency calculation service
// Ancient runes: rank >= 13
const MAX_GRIND_REGULAR = 5;
const MAX_GRIND_ANCIENT = 6;

// Max substat values (5 rolls at max per roll, classic values used for efficiency)
const SUBSTAT_MAX_CLASSIC = {
  1: 1875, // HP+   (375×5)
  2: 40,   // HP%   (8×5)
  3: 100,  // ATK+  (20×5)
  4: 40,   // ATK%  (8×5)
  5: 100,  // DEF+  (20×5)
  6: 40,   // DEF%  (8×5)
  8: 30,   // SPD   (6×5)
  9: 30,   // CRI Rate% (6×5)
  10: 35,  // CRI DMG%  (7×5)
  11: 40,  // RES%  (8×5)
  12: 40,  // ACC%  (8×5)
};


// Flat stats (HP+, ATK+, DEF+) are worth half per unit vs % stats
const FLAT_STATS = new Set([1, 3, 5]);

function statScore(statId, value) {
  const max = SUBSTAT_MAX_CLASSIC[statId];
  if (!max) return 0;
  return FLAT_STATS.has(statId) ? value / (2 * max) : value / max;
}

export function computeRuneEfficiency(rune) {
  // Main stat always counts as 1.0 (assumed at max)
  let raw = 1.0;

  // Innate (prefix) — not grindable
  if (rune.prefix_eff && rune.prefix_eff[0] !== 0) {
    raw += statScore(rune.prefix_eff[0], rune.prefix_eff[1]);
  }

  // Substats — grind (sub[3]) included in current value
  if (rune.sec_eff) {
    rune.sec_eff.forEach(sub => {
      raw += statScore(sub[0], sub[1] + (sub[3] || 0));
    });
  }

  // No subs revealed yet
  if (raw === 1) return 0;

  // 2.8 = 1.0 (main) + 0.2 (innate, 1 roll) + 4×0.4 (subs averaging 2 rolls each)
  return Math.round(10000 * raw / 2.8) / 100;
}

const SET_NAMES = { 3: 'swift', 10: 'despair', 13: 'violent', 15: 'will' };

function getRuneSpeed(rune) {
  let speed = 0;
  if (rune.pri_eff && rune.pri_eff[0] === 8) speed += rune.pri_eff[1];
  if (rune.prefix_eff && rune.prefix_eff[0] === 8) speed += rune.prefix_eff[1];
  if (rune.sec_eff) {
    rune.sec_eff.forEach(sub => {
      if (sub[0] === 8) speed += sub[1] + (sub[3] || 0);
    });
  }
  return speed;
}

function isAncient(rune) {
  return rune.rank >= 13;
}

function getRuneMaxSpeed(rune) {
  // Slot 2 has speed as main stat (not grindable) — no grind bonus
  if (rune.slot_no === 2) return getRuneSpeed(rune);
  const maxGrind = isAncient(rune) ? MAX_GRIND_ANCIENT : MAX_GRIND_REGULAR;
  let speed = 0;
  if (rune.pri_eff && rune.pri_eff[0] === 8) speed += rune.pri_eff[1];
  if (rune.prefix_eff && rune.prefix_eff[0] === 8) speed += rune.prefix_eff[1];
  if (rune.sec_eff) {
    rune.sec_eff.forEach(sub => {
      if (sub[0] === 8) speed += sub[1] + maxGrind;
    });
  }
  return speed;
}

function buildRuneInfo(rune, speedFn) {
  const maxGrind = rune.slot_no !== 2 ? (isAncient(rune) ? MAX_GRIND_ANCIENT : MAX_GRIND_REGULAR) : 0;
  const speedBreakdown = [];

  if (rune.pri_eff && rune.pri_eff[0] === 8)
    speedBreakdown.push({ source: 'main', value: rune.pri_eff[1] });
  if (rune.prefix_eff && rune.prefix_eff[0] === 8)
    speedBreakdown.push({ source: 'prefix', value: rune.prefix_eff[1] });
  if (rune.sec_eff) {
    rune.sec_eff.forEach(sub => {
      if (sub[0] === 8) speedBreakdown.push({
        source: 'sub',
        value: sub[1] + (sub[3] || 0),
        grind: sub[3] || 0,
        maxGrind,
      });
    });
  }

  return {
    id:      rune.rune_id,
    slot:    rune.slot_no,
    set:     SET_NAMES[rune.set_id] || rune.set_id,
    ancient: isAncient(rune),
    speed:   speedFn(rune),
    speedBreakdown,
  };
}

function calculateBestRuneSet(allRunes, mainSetId, offsetSetId = null, speedFn = getRuneSpeed) {
  const runesBySlotAndSet = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {}, 6: {} };

  allRunes.forEach(rune => {
    const slot = rune.slot_no;
    const set = rune.set_id;
    if (!runesBySlotAndSet[slot][set]) runesBySlotAndSet[slot][set] = [];
    runesBySlotAndSet[slot][set].push({ raw: rune, slot, set, speed: speedFn(rune) });
  });

  for (let slot = 1; slot <= 6; slot++) {
    for (let set in runesBySlotAndSet[slot]) {
      runesBySlotAndSet[slot][set].sort((a, b) => b.speed - a.speed);
    }
  }

  const getBestRune = (slot, setId = null) => {
    if (setId !== null) {
      const runes = runesBySlotAndSet[slot][setId];
      return runes && runes.length > 0 ? runes[0] : null;
    }
    let best = null;
    for (let set in runesBySlotAndSet[slot]) {
      const runes = runesBySlotAndSet[slot][set];
      if (runes.length > 0 && (!best || runes[0].speed > best.speed)) best = runes[0];
    }
    return best;
  };

  const slots = [1, 2, 3, 4, 5, 6];
  let bestTotal = -1;
  let bestRunes = null;

  for (let i = 0; i < slots.length - 3; i++) {
    for (let j = i + 1; j < slots.length - 2; j++) {
      for (let k = j + 1; k < slots.length - 1; k++) {
        for (let l = k + 1; l < slots.length; l++) {
          const mainSlots = [slots[i], slots[j], slots[k], slots[l]];
          const offsetSlots = slots.filter(s => !mainSlots.includes(s));

          let valid = true;
          let total = 0;
          const selected = [];

          for (const slot of mainSlots) {
            const rune = getBestRune(slot, mainSetId);
            if (!rune) { valid = false; break; }
            total += rune.speed;
            selected.push(rune);
          }

          if (!valid) continue;

          for (const slot of offsetSlots) {
            const rune = offsetSetId ? getBestRune(slot, offsetSetId) : getBestRune(slot);
            if (offsetSetId && !rune) { valid = false; break; }
            if (rune) { total += rune.speed; selected.push(rune); }
          }

          if (!valid) continue;
          if (total > bestTotal) {
            bestTotal = total;
            bestRunes = selected;
          }
        }
      }
    }
  }

  return { total: bestTotal, runes: bestRunes ? bestRunes.map(r => buildRuneInfo(r.raw, speedFn)) : [] };
}

// Set IDs: Swift=3, Violent=13, Despair=10, Will=15
const SWIFT_BONUS = 25;

export function computeBestRuneSets(allRunes) {
  const calc = (setId, offsetId, fn) => calculateBestRuneSet(allRunes, setId, offsetId, fn);

  const swift       = calc(3,  null, getRuneSpeed);
  const swiftMax    = calc(3,  null, getRuneMaxSpeed);
  const swiftWill   = calc(3,  15,   getRuneSpeed);
  const swiftWillMx = calc(3,  15,   getRuneMaxSpeed);
  const vio         = calc(13, null, getRuneSpeed);
  const vioMax      = calc(13, null, getRuneMaxSpeed);
  const vioWill     = calc(13, 15,   getRuneSpeed);
  const vioWillMx   = calc(13, 15,   getRuneMaxSpeed);
  const des         = calc(10, null, getRuneSpeed);
  const desMax      = calc(10, null, getRuneMaxSpeed);
  const desWill     = calc(10, 15,   getRuneSpeed);
  const desWillMx   = calc(10, 15,   getRuneMaxSpeed);

  return {
    swift:           swift.total      > 0 ? swift.total      + SWIFT_BONUS : -1,
    swiftMax:        swiftMax.total   > 0 ? swiftMax.total   + SWIFT_BONUS : -1,
    swiftRunes:      swift.runes,
    swiftWill:       swiftWill.total  > 0 ? swiftWill.total  + SWIFT_BONUS : -1,
    swiftWillMax:    swiftWillMx.total > 0 ? swiftWillMx.total + SWIFT_BONUS : -1,
    swiftWillRunes:  swiftWill.runes,
    violent:         vio.total        > 0 ? vio.total        : -1,
    violentMax:      vioMax.total     > 0 ? vioMax.total     : -1,
    violentRunes:    vio.runes,
    violentWill:     vioWill.total    > 0 ? vioWill.total    : -1,
    violentWillMax:  vioWillMx.total  > 0 ? vioWillMx.total  : -1,
    violentWillRunes: vioWill.runes,
    despair:         des.total        > 0 ? des.total        : -1,
    despairMax:      desMax.total     > 0 ? desMax.total     : -1,
    despairRunes:    des.runes,
    despairWill:     desWill.total    > 0 ? desWill.total    : -1,
    despairWillMax:  desWillMx.total  > 0 ? desWillMx.total  : -1,
    despairWillRunes: desWill.runes,
  };
}
