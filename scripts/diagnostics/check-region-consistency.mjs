import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ZONE_KEYS,
  applyCrossYearZoneOverrides,
  parseRSFCsv,
} from "../../src/utils/parseCSV.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dataDir = path.join(root, "public", "data");
const records = applyCrossYearZoneOverrides(
  fs
    .readdirSync(dataDir)
    .filter((file) => /^\d{4}\.csv$/.test(file))
    .flatMap((file) =>
      parseRSFCsv(
        fs.readFileSync(path.join(dataDir, file), "utf8"),
        Number.parseInt(file, 10),
      ),
    ),
);

assert.ok(records.every((record) => ZONE_KEYS.includes(record.zone)));
const zonesByCountry = new Map();
for (const record of records) {
  if (!zonesByCountry.has(record.iso)) zonesByCountry.set(record.iso, new Set());
  zonesByCountry.get(record.iso).add(record.zone);
}
const inconsistent = [...zonesByCountry].filter(([, zones]) => zones.size > 1);
assert.deepEqual(inconsistent, [], "a country should retain one project region");
console.log("PASS region consistency", {
  rows: records.length,
  countries: zonesByCountry.size,
  regions: ZONE_KEYS.length,
});
