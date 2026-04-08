import fs from "fs";
import path from "path";
const { parseRSFCsv } = await import("./src/utils/parseCSV.js");
const dataDir = "./public/data";
const files = fs
  .readdirSync(dataDir)
  .filter((f) => f.endsWith(".csv"))
  .sort();
const countryZones = {};
for (const file of files) {
  const year = parseInt(file.slice(0, 4), 10);
  const text = fs.readFileSync(path.join(dataDir, file), "utf8");
  const records = parseRSFCsv(text, year);
  for (const r of records) {
    if (!r.iso) continue;
    const key = r.iso;
    countryZones[key] ??= {
      iso: key,
      name: r.country || "",
      zones: new Set(),
      years: {},
    };
    countryZones[key].zones.add(r.zone);
    countryZones[key].years[year] = countryZones[key].years[year] || new Set();
    countryZones[key].years[year].add(r.zone);
  }
}
const inconsistent = [];
for (const item of Object.values(countryZones)) {
  if (item.zones.size > 1) {
    inconsistent.push({
      iso: item.iso,
      name: item.name,
      zones: Array.from(item.zones),
      years: Object.fromEntries(
        Object.entries(item.years).map(([y, zs]) => [y, Array.from(zs)]),
      ),
    });
  }
}
console.log("total countries parsed", Object.keys(countryZones).length);
console.log(
  "countries with >1 normalized zone across years",
  inconsistent.length,
);
const sample = inconsistent.slice(0, 50);
console.log(JSON.stringify(sample, null, 2));
