/**
 * Parses and normalizes RSF CSV data across all year formats (2002–2025).
 *
 * FORMAT A  (2002, 2003, 2005):
 *   Year (N);ISO;Rank N;Score N;Score N without the exactions;Score N with
 *   the exactions;Score exaction;...;FR_country;EN_country;ES_country;...;Zone
 *   • Many 2002 scores are blank
 *   • Spaces frequently replace semicolons in numeric fields
 *
 * FORMAT B  (2012–2021):
 *   Year (N);ISO;Rank N;Score N;Score N without the exactions;Score N with
 *   the exactions;Score exaction;...;Rank N-1;Score N-1;Rank evolution;
 *   FR_country;EN_country;ES_country;AR_country;FA_country;Zone
 *   • 2012 file covers 2011–2012; year column may read "2011" → remap to 2012
 *   • Same space-for-semicolon corruption in numeric fields
 *
 * FORMAT C  (2022–2025):
 *   ISO;Score;Rank;Political Context;Rank_Pol;Economic Context;Rank_Eco;
 *   Legal Context;Rank_Leg;Social Context;Rank_Soc;Safety;Rank_Saf;
 *   Situation;Zone;Country_FR;Country_EN;Country_ES;Country_PT;
 *   Country_AR;Country_FA;Year (N);Rank N-1;Rank evolution;Score N-1;
 *   Score evolution
 *   • No year in first column; year is near the end or inferred from filename
 *   • "Zone" column contains the geographic region
 *   • "Situation" column contains the press-freedom status label
 */

// ─── Zone Normalization ────────────────────────────────────────────

const ZONE_ALIASES = {
  "ue balkans": "Europe",
  "ue balkan": "Europe",
  "eu balkans": "Europe",
  "eu balkan": "Europe",
  "ue bal": "Europe",
  "ue b": "Europe",
  "e balkans": "Europe",
  europe: "Europe",
  afrique: "Africa",
  africa: "Africa",
  amériques: "Americas",
  ameriques: "Americas",
  amérique: "Americas",
  amerique: "Americas",
  americas: "Americas",
  amériqu: "Americas",
  "asie-pacifique": "Asia-Pacific",
  "asie pacifique": "Asia-Pacific",
  "asie-paci": "Asia-Pacific",
  "asie-p": "Asia-Pacific",
  "asia-pacific": "Asia-Pacific",
  "asia pacific": "Asia-Pacific",
  "europe asie centrale": "Europe",
  "europe - asie centrale": "Europe",
  "maghreb moyen orient": "MENA",
  "maghreb - moyen orient": "MENA",
  "moyen orient": "MENA",
  "moyen-orient": "MENA",
  mena: "MENA",
  eeac: "EEAC",
  eac: "EEAC",
};

function normalizeZone(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const sanitized = trimmed
    .replace(/\uFFFD/g, "e")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[–—]/g, " ")
    .replace(/[^a-zA-Z0-9 -]/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const key = sanitized.toLowerCase();
  if (ZONE_ALIASES[key]) return ZONE_ALIASES[key];

  const aliasEntries = Object.entries(ZONE_ALIASES).sort(
    ([a], [b]) => b.length - a.length,
  );
  for (const [alias, canonical] of aliasEntries) {
    if (key.startsWith(alias) || alias.startsWith(key)) {
      return canonical;
    }
  }

  return null;
}

/**
 * Parse a numeric value from a potentially dirty string.
 * Handles European commas, embedded spaces, leading/trailing junk.
 */
function parseNum(val) {
  if (val == null) return NaN;
  let cleaned = String(val).trim().replace(",", ".");
  cleaned = cleaned.replace(/[^0-9.\-]/g, "");
  const n = parseFloat(cleaned);
  return isFinite(n) ? n : NaN;
}

/**
 * Repair a raw CSV line before splitting on semicolons.
 * Fixes spaces that should be semicolons in the first few numeric columns.
 *   "2015;FIN;1 48;92"  →  "2015;FIN;1;48;92"
 *   "2003;COM 5;3"      →  "2003;COM;5;3"
 */
function repairLine(line) {
  let repaired = line.replace(/;([A-Z]{2,3})\s+(\d)/g, ";$1;$2");

  const parts = repaired.split(";");
  for (let i = 0; i < Math.min(parts.length, 8); i++) {
    const match = parts[i].trim().match(/^(\d+)\s+(\d[\d.]*)$/);
    if (match) {
      parts.splice(i, 1, match[1], match[2]);
    }
  }

  return parts.join(";");
}

// ─── Format Detection ──────────────────────────────────────────────

function detectFormat(headerCells) {
  const h0 = (headerCells[0] || "").trim().toLowerCase();
  const joined = headerCells.join(";").toLowerCase();

  if (h0.startsWith("year") || h0.startsWith("année")) {
    if (
      joined.includes("fr_country") ||
      joined.includes("en_country") ||
      joined.includes("rank n-1")
    ) {
      return "B";
    }
    return "A";
  }

  if (h0 === "iso" || h0.startsWith("iso")) {
    return "C";
  }

  return "unknown";
}

function findCol(headers, ...needles) {
  return headers.findIndex((h) => {
    const lc = (h || "").trim().toLowerCase();
    return needles.some((n) => lc === n || lc.includes(n));
  });
}

function findZoneInRow(cells) {
  for (let j = cells.length - 1; j >= 0; j--) {
    const zone = normalizeZone(cells[j]);
    if (zone) return zone;
  }
  return null;
}

// ─── Year Remapping ────────────────────────────────────────────────

const YEAR_REMAP = {
  2011: 2012,
};

function normalizeYear(rawYear, fallbackYear) {
  let y = parseInt(String(rawYear), 10);
  if (isNaN(y) && fallbackYear) y = fallbackYear;
  if (YEAR_REMAP[y]) y = YEAR_REMAP[y];
  return y;
}

// ─── Main Parser ───────────────────────────────────────────────────

/**
 * Parse a single RSF CSV string.
 * @param {string} csvText       Raw CSV content
 * @param {number} fallbackYear  Year to use when the file has no year column
 */
export function parseRSFCsv(csvText, fallbackYear) {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  const rawHeader = lines[0].split(";");
  const format = detectFormat(rawHeader);
  const records = [];

  if (format === "A" || format === "B") {
    const iZone = findCol(rawHeader, "zone");
    const iEN = findCol(rawHeader, "en_country");

    for (let i = 1; i < lines.length; i++) {
      const repairedLine = repairLine(lines[i]);
      const cells = repairedLine.split(";");

      if (cells.length < 3) continue;

      const year = normalizeYear(cells[0], fallbackYear);
      const iso = (cells[1] || "").trim().replace(/\s+/g, "");
      const rank = parseNum(cells[2]);
      const score = parseNum(cells[3]);

      let zone = null;
      if (iZone >= 0 && cells[iZone]) {
        zone = normalizeZone(cells[iZone]);
      }
      if (!zone) {
        zone = findZoneInRow(cells);
      }

      let country = "";
      if (iEN >= 0 && cells[iEN]) {
        country = cells[iEN].trim();
      }

      if (!iso || isNaN(year)) continue;

      const zones = Array.isArray(zone) ? zone : [zone];
      for (const z of zones) {
        if (!z) continue;
        records.push({
          year,
          iso,
          rank: isNaN(rank) ? null : rank,
          score: isNaN(score) ? null : score,
          zone: z,
          country,
        });
      }
    }
  } else if (format === "C") {
    const iISO = findCol(rawHeader, "iso");
    const iScore = findCol(rawHeader, "score");
    const iRank = findCol(rawHeader, "rank");
    const iZone = findCol(rawHeader, "zone");
    const iEN = findCol(rawHeader, "country_en");
    const iYear = findCol(rawHeader, "year");

    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(";");
      if (cells.length < 3) continue;

      const iso = (cells[iISO >= 0 ? iISO : 0] || "")
        .trim()
        .replace(/\s+/g, "");
      const score = parseNum(cells[iScore >= 0 ? iScore : 1]);
      const rank = parseNum(cells[iRank >= 0 ? iRank : 2]);

      let year = fallbackYear;
      if (iYear >= 0 && cells[iYear]) {
        const parsed = parseInt(cells[iYear], 10);
        if (!isNaN(parsed) && parsed > 1990 && parsed < 2100) {
          year = parsed;
        }
      }

      let zone = null;
      if (iZone >= 0 && cells[iZone]) {
        zone = normalizeZone(cells[iZone]);
      }
      if (!zone) {
        zone = findZoneInRow(cells);
      }

      let country = "";
      if (iEN >= 0 && cells[iEN]) {
        country = cells[iEN].trim();
      }

      if (!iso || isNaN(score)) continue;

      const zones = Array.isArray(zone) ? zone : [zone];
      for (const z of zones) {
        if (!z) continue;
        records.push({
          year,
          iso,
          rank: isNaN(rank) ? null : rank,
          score,
          zone: z,
          country,
        });
      }
    }
  } else {
    for (let i = 1; i < lines.length; i++) {
      const repairedLine = repairLine(lines[i]);
      const cells = repairedLine.split(";");
      if (cells.length < 3) continue;

      const year = normalizeYear(cells[0], fallbackYear);
      const iso = (cells[1] || "").trim().replace(/\s+/g, "");
      const rank = parseNum(cells[2]);
      const score = parseNum(cells[3]);
      const zone = findZoneInRow(cells);

      if (!iso || isNaN(year)) continue;

      const zones = Array.isArray(zone) ? zone : [zone];
      for (const z of zones) {
        if (!z) continue;
        records.push({
          year,
          iso,
          rank: isNaN(rank) ? null : rank,
          score: isNaN(score) ? null : score,
          zone: z,
          country: "",
        });
      }
    }
  }

  return records;
}

// ─── Score Normalization ───────────────────────────────────────────

/**
 * RSF changed scoring methodology in 2013:
 *   2002–2012: Lower score = more free (0 = best, ~105 = worst)
 *   2013–2025: Higher score = more free (100 = best, 0 = worst)
 *
 * This function aligns all years to a single direction.
 *
 * @param {'higherIsBetter'|'lowerIsBetter'} direction
 */
export function normalizeScores(records, direction = "higherIsBetter") {
  return records.map((r) => {
    if (r.score === null) return r;

    let normalized;
    if (r.year <= 2012) {
      if (direction === "higherIsBetter") {
        normalized = Math.max(0, 100 - r.score);
      } else {
        normalized = r.score;
      }
    } else {
      if (direction === "higherIsBetter") {
        normalized = r.score;
      } else {
        normalized = Math.max(0, 100 - r.score);
      }
    }

    return { ...r, score: +normalized.toFixed(2) };
  });
}

// ─── Aggregation ───────────────────────────────────────────────────

export const ZONE_KEYS = [
  "Europe",
  "Africa",
  "Americas",
  "Asia-Pacific",
  "MENA",
  "EEAC",
];

/**
 * Aggregate records into the shape needed for D3 stacking:
 *   [ { year, Europe, Africa, Americas, 'Asia-Pacific', MENA, EEAC }, ... ]
 *
 * @param {'avgScore'|'count'} metric
 */
export function aggregateByZoneYear(records, metric = "avgScore") {
  const map = {};
  for (const r of records) {
    if (!r.zone || !r.year) continue;
    if (r.score === null && metric === "avgScore") continue;

    if (!map[r.year]) map[r.year] = {};
    if (!map[r.year][r.zone]) map[r.year][r.zone] = [];
    if (r.score !== null) {
      map[r.year][r.zone].push(r.score);
    } else {
      if (metric === "count") map[r.year][r.zone].push(0);
    }
  }

  const years = Object.keys(map)
    .map(Number)
    .sort((a, b) => a - b);

  return years.map((y) => {
    const row = { year: y };
    for (const z of ZONE_KEYS) {
      const arr = (map[y] && map[y][z]) || [];
      if (metric === "count") {
        row[z] = arr.length;
      } else {
        row[z] =
          arr.length > 0
            ? +(arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(2)
            : null;
      }
    }
    return row;
  });
}
