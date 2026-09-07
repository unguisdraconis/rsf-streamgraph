import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appSource = fs.readFileSync(path.join(root, "src", "App.jsx"), "utf8");
const chartSource = fs.readFileSync(
  path.join(root, "src", "components", "Streamgraph.jsx"),
  "utf8",
);

assert.match(appSource, /useState\("zero"\)/, "Stacked Area should be default");
assert.match(appSource, /<strong>Layout: <\/strong>/);
assert.match(appSource, /<option value="wiggle">Streamgraph comparison<\/option>/);
assert.doesNotMatch(
  appSource,
  /metric === "count" && \(\s*<label[^>]*>\s*<strong>.*layout/,
  "the layout comparison should not be restricted to Country Count",
);

assert.match(chartSource, /\.stack\(\)/, "the chart should use D3 stacking");
assert.match(chartSource, /d3\s*\.area\(\)/, "the chart should use area bands");
assert.doesNotMatch(chartSource, /d3\s*\.line\(\)/);
assert.doesNotMatch(chartSource, /score-line|segmented line chart/);
assert.match(chartSource, /Regional mean bands \(not additive\)/);
assert.match(chartSource, /combined height is not an additive RSF score/);
assert.match(chartSource, /additive country counts/);

for (const annotation of [
  "2011–12 combined",
  "2013 methodology",
  "2022 methodology",
]) {
  assert.match(
    chartSource,
    new RegExp(annotation),
    `${annotation} annotation should remain available`,
  );
}

assert.match(appSource, /there is no separate\s+2011 observation/);
assert.match(appSource, /not to statistically\s+normalize/);
assert.match(appSource, /Visual continuity does not establish\s+statistical equivalence/);
assert.match(appSource, /Mean of included country scores/);
assert.doesNotMatch(appSource, /world average|world score/i);

assert.match(chartSource, /aria-pressed=/);
assert.match(chartSource, /aria-live=/);
assert.match(chartSource, /data-chart-form=/);
assert.match(appSource, /<caption>/);
assert.match(appSource, /scope="col"/);
assert.match(appSource, /scope="row"/);

console.log("PASS visual-intent.test.mjs");
