import assert from "assert";
import fs from "fs";
import { parseRSFCsv, aggregateByZoneYear } from "../src/utils/parseCSV.js";

const csvText = `ISO;Score;Rank;Political Context;Rank_Pol;Economic Context;Rank_Eco;Legal Context;Rank_Leg;Social Context;Rank_Soc;Safety;Rank_Saf;Zone;Country_EN;Country_FR;Country_ES;Country_AR;Country_FA;Year (N);Rank N-1;Rank evolution;Score N-1;Score evolution
USA;75,00;1;90,00;1;80,00;1;85,00;1;88,00;1;92,00;1;Am�riques;United States;États-Unis;Estados Unidos;الولايات المتحدة;??????;2025;1;0;74,00;1,00`;

const records = parseRSFCsv(csvText, 2025);
assert.strictEqual(records.length, 1, "Expected one record to be parsed");
assert.strictEqual(
  records[0].zone,
  "Americas",
  "Zone alias should normalize malformed Americas labels",
);

const aggregated = aggregateByZoneYear(records, "avgScore");
assert.strictEqual(aggregated.length, 1, "Expected one aggregated year entry");
assert.ok(
  aggregated[0].Americas > 0,
  "Expected Americas average score to be greater than zero",
);

const csvTextEurope = `ISO;Score;Rank;Political Context;Rank_Pol;Economic Context;Rank_Eco;Legal Context;Rank_Leg;Social Context;Rank_Soc;Safety;Rank_Saf;Zone;Country_EN;Country_FR;Country_ES;Country_AR;Country_FA;Year (N);Rank N-1;Rank evolution;Score N-1;Score evolution
FRA;65,00;10;80,00;10;60,00;10;75,00;10;70,00;10;80,00;10;UE Balkans;France;France;Francia;??;??;2025;9;1;64,00;1,00`;

const recordsEurope = parseRSFCsv(csvTextEurope, 2025);
assert.strictEqual(
  recordsEurope.length,
  1,
  "Expected one Europe record to be parsed",
);
assert.strictEqual(
  recordsEurope[0].zone,
  "Europe",
  "Zone alias should normalize malformed Europe labels",
);

const aggregatedEurope = aggregateByZoneYear(recordsEurope, "avgScore");
assert.strictEqual(
  aggregatedEurope.length,
  1,
  "Expected one aggregated year entry for Europe sample",
);
assert.ok(
  aggregatedEurope[0].Europe > 0,
  "Expected Europe average score to be greater than zero",
);

const csvTextAsia = `ISO;Score;Rank;Political Context;Rank_Pol;Economic Context;Rank_Eco;Legal Context;Rank_Leg;Social Context;Rank_Soc;Safety;Rank_Saf;Zone;Country_EN;Country_FR;Country_ES;Country_AR;Country_FA;Year (N);Rank N-1;Rank evolution;Score N-1;Score evolution
JPN;80,00;5;85,00;5;75,00;5;78,00;5;82,00;5;88,00;5;Asi�-Pacifique;Japan;Japon;Japón;اليابان;??????;2025;5;0;79,00;1,00`;

const recordsAsia = parseRSFCsv(csvTextAsia, 2025);
assert.strictEqual(
  recordsAsia.length,
  1,
  "Expected one Asia-Pacific record to be parsed",
);
assert.strictEqual(
  recordsAsia[0].zone,
  "Asia-Pacific",
  "Zone alias should normalize malformed Asia-Pacific labels",
);

const aggregatedAsia = aggregateByZoneYear(recordsAsia, "avgScore");
assert.strictEqual(
  aggregatedAsia.length,
  1,
  "Expected one aggregated year entry for Asia-Pacific sample",
);
assert.ok(
  aggregatedAsia[0]["Asia-Pacific"] > 0,
  "Expected Asia-Pacific average score to be greater than zero",
);

const csvTextMENA = `ISO;Score;Rank;Political Context;Rank_Pol;Economic Context;Rank_Eco;Legal Context;Rank_Leg;Social Context;Rank_Soc;Safety;Rank_Saf;Zone;Country_EN;Country_FR;Country_ES;Country_AR;Country_FA;Year (N);Rank N-1;Rank evolution;Score N-1;Score evolution
TUN;65,00;30;70,00;30;60,00;30;65,00;30;68,00;30;75,00;30;Maghreb - Moyen-Orient;Tunisia;Tunisie;Túnez;تونس;??????;2022;29;1;64,00;1,00`;

const recordsMENA = parseRSFCsv(csvTextMENA, 2022);
assert.strictEqual(
  recordsMENA.length,
  1,
  "Expected one MENA record to be parsed",
);
assert.strictEqual(
  recordsMENA[0].zone,
  "MENA",
  "Zone alias should normalize malformed MENA labels",
);

const aggregatedMENA = aggregateByZoneYear(recordsMENA, "avgScore");
assert.strictEqual(
  aggregatedMENA.length,
  1,
  "Expected one aggregated year entry for MENA sample",
);
assert.ok(
  aggregatedMENA[0].MENA > 0,
  "Expected MENA average score to be greater than zero",
);

const csvTextEuropeAsie = `ISO;Score;Rank;Political Context;Rank_Pol;Economic Context;Rank_Eco;Legal Context;Rank_Leg;Social Context;Rank_Soc;Safety;Rank_Saf;Zone;Country_EN;Country_FR;Country_ES;Country_AR;Country_FA;Year (N);Rank N-1;Rank evolution;Score N-1;Score evolution
ARM;70,00;40;65,00;40;55,00;40;60,00;40;70,00;40;80,00;40;Europe - Asie centrale;Armenia;Arménie;Armenia;أرمينيا;??????;2022;39;1;69,00;1,00`;

const recordsEuropeAsie = parseRSFCsv(csvTextEuropeAsie, 2022);
assert.strictEqual(
  recordsEuropeAsie.length,
  2,
  "Expected two Europe - Asie centrale records to be parsed for dual-region mapping",
);
assert.deepStrictEqual(
  recordsEuropeAsie.map((r) => r.zone).sort(),
  ["EEAC", "Europe"],
  "Expected Europe - Asie centrale to map to both Europe and EEAC",
);

const aggregatedEuropeAsie = aggregateByZoneYear(recordsEuropeAsie, "avgScore");
assert.strictEqual(
  aggregatedEuropeAsie.length,
  1,
  "Expected one aggregated year entry for Europe - Asie centrale sample",
);
assert.ok(
  aggregatedEuropeAsie[0].Europe > 0,
  "Expected Europe average score to be greater than zero",
);
assert.ok(
  aggregatedEuropeAsie[0].EEAC > 0,
  "Expected EEAC average score to be greater than zero for dual-region mapping",
);

const csvTextEEAC = `ISO;Score;Rank;Political Context;Rank_Pol;Economic Context;Rank_Eco;Legal Context;Rank_Leg;Social Context;Rank_Soc;Safety;Rank_Saf;Zone;Country_EN;Country_FR;Country_ES;Country_AR;Country_FA;Year (N);Rank N-1;Rank evolution;Score N-1;Score evolution
ARM;70,00;40;65,00;40;55,00;40;60,00;40;70,00;40;80,00;40;EEAC;Armenia;Arménie;Armenia;أرمينيا;??????;2022;39;1;69,00;1,00`;

const recordsEEAC = parseRSFCsv(csvTextEEAC, 2022);
assert.strictEqual(
  recordsEEAC.length,
  1,
  "Expected one EEAC record to be parsed",
);
assert.strictEqual(
  recordsEEAC[0].zone,
  "EEAC",
  "Zone alias should normalize EEAC labels",
);

const aggregatedEEAC = aggregateByZoneYear(recordsEEAC, "avgScore");
assert.strictEqual(
  aggregatedEEAC.length,
  1,
  "Expected one aggregated year entry for EEAC sample",
);
assert.ok(
  aggregatedEEAC[0].EEAC > 0,
  "Expected EEAC average score to be greater than zero",
);

// Real 2022 file regression: ensure MENA and Europe values are parsed from actual data
const real2022 = fs.readFileSync("./public/data/2022.csv", "utf8");
const real2022Records = parseRSFCsv(real2022, 2022);
const real2022Zones = real2022Records.reduce((acc, r) => {
  if (r.zone) acc[r.zone] = (acc[r.zone] || 0) + 1;
  return acc;
}, {});
assert.ok(
  real2022Zones.MENA > 0,
  "Expected MENA records to be present in 2022 real data",
);
assert.ok(
  real2022Zones.Europe > 0,
  "Expected Europe records to be present in 2022 real data",
);

const real2022Agg = aggregateByZoneYear(real2022Records, "avgScore");
assert.ok(
  real2022Agg[0].MENA > 0,
  "Expected MENA average score to be greater than zero for 2022 real data",
);
assert.ok(
  real2022Agg[0].Europe > 0,
  "Expected Europe average score to be greater than zero for 2022 real data",
);

console.log("PASS parseCSV-safety.test.mjs");
