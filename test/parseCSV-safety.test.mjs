import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  METHODOLOGY_ERAS,
  ZONE_KEYS,
  aggregateByZoneYear,
  alignScoreDirection,
  applyCrossYearZoneOverrides,
  parseRSFCsv,
  segmentByMethodologyEra,
} from "../src/utils/parseCSV.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "public", "data");

function readCorpus() {
  const files = fs
    .readdirSync(dataDir)
    .filter((file) => /^\d{4}\.csv$/.test(file))
    .sort();
  const records = files.flatMap((file) => {
    const fallbackYear = Number.parseInt(file, 10);
    return parseRSFCsv(
      fs.readFileSync(path.join(dataDir, file), "utf8"),
      fallbackYear,
    );
  });
  return { files, records };
}

function zoneCounts(records) {
  return Object.fromEntries(
    ZONE_KEYS.map((zone) => [
      zone,
      records.filter((record) => record.zone === zone).length,
    ]),
  );
}

// Synthetic malformed-label checks protect the encoding-tolerant aliases.
const aliases = [
  ["Am�riques", "Americas", "USA"],
  ["UE Balkans", "Europe", "FRA"],
  ["Asi�-Pacifique", "Asia-Pacific", "JPN"],
  ["Maghreb - Moyen-Orient", "MENA", "TUN"],
  ["Europe - Asie centrale", "Europe", "ARM"],
  ["EEAC", "EEAC", "ARM"],
];

for (const [rawZone, expectedZone, iso] of aliases) {
  const csv = `ISO;Score;Rank;Zone;Country_EN;Year (N)\n${iso};75,00;1;${rawZone};Sample;2025`;
  const parsed = parseRSFCsv(csv, 2025);
  assert.equal(parsed.length, 1, `one row should parse for ${rawZone}`);
  assert.equal(parsed[0].zone, expectedZone, `${rawZone} should normalize`);
}

const score2025 = `ISO;Score 2025;Rank;Zone;Country_EN;Year (N)\nARM;73,96;34;EEAC;Armenia;2025`;
assert.equal(parseRSFCsv(score2025, 2025)[0].score, 73.96);

const { files, records: rawRecords } = readCorpus();
const expectedFiles = [
  ...Array.from({ length: 9 }, (_, index) => `${2002 + index}.csv`),
  ...Array.from({ length: 14 }, (_, index) => `${2012 + index}.csv`),
];
assert.deepEqual(files, expectedFiles, "the repository should contain 23 editions");
assert.equal(rawRecords.length, 4020, "all 4,020 corpus rows should parse");

const editions = [...new Set(rawRecords.map((record) => record.year))].sort();
assert.deepEqual(
  editions,
  expectedFiles.map((file) => Number.parseInt(file, 10)),
  "parsed editions should match the file manifest",
);
assert.ok(
  rawRecords.every((record) => record.score !== null),
  "every corpus row should have a score",
);
assert.ok(
  rawRecords.every((record) => ZONE_KEYS.includes(record.zone)),
  "every corpus row should resolve to a known region",
);

const rowKeys = rawRecords.map(({ year, iso }) => `${year}:${iso}`);
assert.equal(
  new Set(rowKeys).size,
  rowKeys.length,
  "edition and ISO should uniquely identify every row",
);

const combinedText = fs.readFileSync(path.join(dataDir, "2012.csv"), "utf8");
assert.match(combinedText, /2011-12/, "source should identify the combined edition");
const combinedRows = rawRecords.filter((record) => record.year === 2012);
assert.ok(combinedRows.length > 0);
assert.deepEqual(
  [
    Math.min(...combinedRows.map((row) => row.score)),
    Math.max(...combinedRows.map((row) => row.score)),
  ],
  [-10, 142],
  "combined-edition raw scores should retain the source range",
);

const alignedRecords = alignScoreDirection(rawRecords);
const alignedCombined = alignedRecords.filter((record) => record.year === 2012);
assert.deepEqual(
  [
    Math.min(...alignedCombined.map((row) => row.score)),
    Math.max(...alignedCombined.map((row) => row.score)),
  ],
  [-42, 110],
  "direction alignment must not clamp or rescale combined-edition scores",
);

const raw2022 = rawRecords.filter((record) => record.year === 2022);
const raw2022Counts = zoneCounts(raw2022);
assert.deepEqual(
  { Europe: raw2022Counts.Europe, EEAC: raw2022Counts.EEAC },
  { Europe: 53, EEAC: 0 },
  "the source 2022 region merge should remain observable before repair",
);
const reconciled = applyCrossYearZoneOverrides(rawRecords);
const fixed2022Counts = zoneCounts(
  reconciled.filter((record) => record.year === 2022),
);
assert.deepEqual(
  { Europe: fixed2022Counts.Europe, EEAC: fixed2022Counts.EEAC },
  { Europe: 40, EEAC: 13 },
  "cross-year evidence should restore the 2022 Europe/EEAC split",
);

const means = aggregateByZoneYear(alignScoreDirection(reconciled), "avgScore");
const methodologyGroups = segmentByMethodologyEra(means);
assert.deepEqual(
  methodologyGroups.map(({ id }) => id),
  METHODOLOGY_ERAS.map(({ id }) => id),
  "all four methodology eras should remain represented",
);
assert.deepEqual(
  methodologyGroups.map(({ data }) => [data[0].year, data.at(-1).year]),
  [
    [2002, 2010],
    [2012, 2012],
    [2013, 2021],
    [2022, 2025],
  ],
  "era metadata should retain the combined edition and methodology boundaries",
);

const text2025 = fs.readFileSync(path.join(dataDir, "2025.csv"), "utf8");
assert.equal(
  [...text2025].filter((character) => character === "�").length,
  219,
  "the known 2025 replacement-character artifact should remain visible",
);
assert.equal(
  rawRecords.filter((record) => record.year === 2025).length,
  180,
  "all 2025 rows should parse despite damaged display text",
);

console.log("PASS parseCSV-safety.test.mjs");
