import fs from "fs";
const mod = await import("./src/utils/parseCSV.js");
const text = fs.readFileSync("./public/data/2022.csv", "utf8");
const records = mod.parseRSFCsv(text, 2022);
const counts = {};
for (const r of records) counts[r.zone] = (counts[r.zone] || 0) + 1;
console.log("zone counts", counts);
const agg = mod.aggregateByZoneYear(records, "avgScore");
console.log("agg", JSON.stringify(agg, null, 2));
