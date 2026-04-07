import assert from "assert";
import { parseRSFCsv, aggregateByZoneYear } from "../src/utils/parseCSV.js";

export function assertZoneNormalization(csvText, fallbackYear, expectedZone) {
  const records = parseRSFCsv(csvText, fallbackYear);
  assert.strictEqual(
    records.length,
    1,
    `Expected one record for zone normalization test (${expectedZone})`,
  );
  assert.strictEqual(
    records[0].zone,
    expectedZone,
    `Expected malformed zone label to normalize to ${expectedZone}`,
  );
  return records;
}

export function assertAverageScoreNonZero(records, zone) {
  const aggregated = aggregateByZoneYear(records, "avgScore");
  assert.strictEqual(
    aggregated.length,
    1,
    `Expected one aggregated year entry for zone average test (${zone})`,
  );
  assert.ok(
    aggregated[0][zone] > 0,
    `Expected ${zone} average score to be greater than zero when records exist`,
  );
}

export function assertZoneRecordsExist(records, zone) {
  const matching = records.filter((r) => r.zone === zone);
  assert.ok(
    matching.length > 0,
    `Expected at least one parsed record for zone ${zone}`,
  );
}
