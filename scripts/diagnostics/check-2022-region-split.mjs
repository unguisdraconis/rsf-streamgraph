import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyCrossYearZoneOverrides,
  parseRSFCsv,
} from "../../src/utils/parseCSV.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dataDir = path.join(root, "public", "data");
const records = fs
  .readdirSync(dataDir)
  .filter((file) => /^\d{4}\.csv$/.test(file))
  .flatMap((file) =>
    parseRSFCsv(
      fs.readFileSync(path.join(dataDir, file), "utf8"),
      Number.parseInt(file, 10),
    ),
  );

function countsFor2022(rows) {
  const counts = { Europe: 0, EEAC: 0 };
  for (const row of rows) {
    if (row.year === 2022 && row.zone in counts) counts[row.zone] += 1;
  }
  return counts;
}

const before = countsFor2022(records);
const after = countsFor2022(applyCrossYearZoneOverrides(records));
assert.deepEqual(before, { Europe: 53, EEAC: 0 });
assert.deepEqual(after, { Europe: 40, EEAC: 13 });
console.log("PASS 2022 region split", { before, after });
