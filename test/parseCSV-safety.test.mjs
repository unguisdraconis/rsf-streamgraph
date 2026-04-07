import assert from "assert";
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

console.log("PASS parseCSV-safety.test.mjs");
