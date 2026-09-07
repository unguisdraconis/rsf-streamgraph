import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  alignScoreDirection,
  parseRSFCsv,
} from "../../src/utils/parseCSV.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const file = path.join(root, "public", "data", "2012.csv");
const raw = parseRSFCsv(fs.readFileSync(file, "utf8"), 2012);
const aligned = alignScoreDirection(raw);
const extent = (rows) => [
  Math.min(...rows.map((row) => row.score)),
  Math.max(...rows.map((row) => row.score)),
];

assert.deepEqual(extent(raw), [-10, 142]);
assert.deepEqual(extent(aligned), [-42, 110]);
assert.ok(aligned.some((row) => row.score < 0));
assert.ok(aligned.some((row) => row.score > 100));
console.log("PASS score direction alignment", {
  rawExtent: extent(raw),
  alignedExtent: extent(aligned),
  note: "100 - score changes direction only; no values are clamped",
});
