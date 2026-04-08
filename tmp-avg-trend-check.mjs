import fs from "fs";
import path from "path";
const { parseRSFCsv, normalizeScores, aggregateByZoneYear } =
  await import("./src/utils/parseCSV.js");
const dataDir = "./public/data";
const files = fs.readdirSync(dataDir).filter((f) => f.endsWith(".csv"));
let allRecords = [];
for (const file of files) {
  const year = parseInt(file.slice(0, 4), 10);
  const text = fs.readFileSync(path.join(dataDir, file), "utf8");
  const records = parseRSFCsv(text, year);
  allRecords.push(...records);
}
const norm = normalizeScores(allRecords, "higherIsBetter");
const agg = aggregateByZoneYear(norm, "avgScore");
const years = agg.filter((row) => row.year >= 2013 && row.year <= 2021);
console.log(JSON.stringify(years, null, 2));
