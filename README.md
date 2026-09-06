# RSF World Press Freedom Index — Streamgraph

An interactive visualization of the [Reporters Without Borders](https://rsf.org/en/index)
(RSF) World Press Freedom Index, covering **2002–2025** across **six world regions**.

**Live demo:** https://unguisdraconis.github.io/rsf-streamgraph/

Built with React 19, Vite, and D3 v7. No backend — the CSVs are served as static
assets and parsed in the browser.

---

## What it shows

23 annual RSF index files are parsed, normalized onto a single scoring scale, and
aggregated into a stacked D3 area chart with two toggles:

| Control    | Options                       | Effect                                          |
| ---------- | ----------------------------- | ----------------------------------------------- |
| **Metric** | Average Score / Country Count | What the band height encodes                    |
| **Layout** | Stacked Area / Streamgraph    | `d3.stackOffsetNone` vs. `d3.stackOffsetWiggle` |

Regions are RSF's own: **Europe** (its "UE Balkans" zone), **Africa**, **Americas**,
**Asia-Pacific**, **MENA** (Middle East & North Africa), and **EEAC** (Eastern Europe
& Central Asia).

Interaction:

- Hovering a band highlights it, dims the others, and pins a vertical year line.
- The tooltip reports the region, year, its value, and that year's **world average**.
- In _Average Score_ mode, bands are colored by RSF's five press-freedom categories
  rather than by region — so the chart reads as a heat map of conditions over time:

  | Category     | Score |
  | ------------ | ----- |
  | Good         | 85+   |
  | Satisfactory | 70–85 |
  | Problematic  | 55–70 |
  | Difficult    | 40–55 |
  | Very serious | 0–40  |

- A dashed red line at **2013** marks RSF's methodology change (see below).
- An expandable table below the chart lists the aggregated per-region values.
- Extra CSVs can be dragged onto the page to be parsed at runtime.

---

## Quick start

```bash
npm install
npm run dev        # dev server with HMR
npm run build      # production build to dist/
npm run preview    # serve the production build locally
npm run lint       # ESLint
npm run test:parser  # parser regression suite
npm run deploy     # build + publish dist/ to the gh-pages branch
```

Requires Node `^20.19.0 || >=22.12.0` (per Vite 8; developed on Node 22).

---

## The data

### Source and coverage

`public/data/` holds one semicolon-delimited CSV per index year, downloaded from RSF.
The parser reads all 23 files and produces **4,020 country-year records**, every one of
them carrying both a score and a region. Country coverage grows from 139 in 2002 to a
steady 180 from 2014 onward.

There is **no `2011.csv`** — this is not an omission. RSF published a single combined
2011–2012 index, so the 2012 file covers both years. Its year column reads `2011`, and
the parser remaps it to 2012 (`YEAR_REMAP`). The chart therefore shows a genuine gap at 2011.

### Three CSV generations

RSF changed its export format twice. The parser sniffs the header row and dispatches
accordingly (`detectFormat`):

**Format B — 2002–2021** (header begins `Year (N)`)

```
Year (N);ISO;Rank N;Score N;Score N without the exactions;Score N with the exactions;
Score exactions;Rank N-1;Score N-1;Rank evolution;FR_country;EN_country;ES_country;
AR_country;FA_country;Zone
```

**Format C — 2022–2025** (header begins `ISO`)

```
ISO;Score;Rank;Political Context;Rank_Pol;Economic Context;Rank_Eco;Legal Context;
Rank_Leg;Social Context;Rank_Soc;Safety;Rank_Saf;Zone;Country_EN;...;Year (N);
Rank N-1;Rank evolution
```

Format C is itself inconsistent: 2022 has 22 columns and no `Country_PT`, while 2025
has 25 columns and labels its score column `Score 2025` rather than `Score`. Columns are
resolved by name, not by position, so this is absorbed transparently.

A third branch (`Format A`) exists in the parser for an older layout without country-name
columns. **No file in this repository triggers it** — it is defensive only.

### Quirks the parser has to absorb

**1. The 2013 scale inversion.** RSF reversed the meaning of its score in 2013:

- 2002–2012: _lower_ is better (0 = best, ~105 = worst)
- 2013–2025: _higher_ is better (100 = best, 0 = worst)

`normalizeScores()` flips pre-2013 values to `100 - score` so the whole series reads in
one direction. Without this the chart is meaningless across the boundary — hence the
dashed marker at 2013.

**2. The 2022 region collapse.** 2022 is the only year that abandons RSF's usual zone
labels. It drops **EEAC entirely**, folding those 13 countries into a merged
`Europe - Asie centrale` zone of 53, and renames MENA to `Maghreb - Moyen-Orient`:

|        | 2021 | 2022 (raw) | 2023 |
| ------ | ---- | ---------- | ---- |
| Europe | 40   | 53         | 40   |
| EEAC   | 13   | 0          | 13   |

Left alone this puts a visible discontinuity in two bands for one year only.
`applyCrossYearZoneOverrides()` repairs it by collecting the ISO codes that are labeled
EEAC in _any other_ year and reassigning them in 2022, restoring the 40/13 split.

**3. Inconsistent and corrupted zone labels.** Across the corpus the `Zone` column takes
nine distinct raw values, mixing French and English (`Afrique`, `Amériques`,
`Asie-Pacifique`, `UE Balkans`, `Maghreb - Moyen-Orient`, `Europe - Asie centrale`,
`MENA`, `EEAC`) — plus one encoding casualty: 2025 contains `Am�riques`, where the
accented character was lost to a bad round-trip.

`normalizeZone()` handles all of it by mapping `U+FFFD` back to `e`, stripping diacritics
via NFD decomposition, normalizing dashes and punctuation to spaces, then matching against
an alias table longest-prefix-first so that truncated labels also resolve.

**4. Encoding.** Most files are UTF-8 with a BOM; 2025 is not. Line endings are CRLF.
Decimal separators are European commas (`92,48`), handled by `parseNum()`.

---

## How it works

```
public/data/*.csv
      │
      ▼
parseRSFCsv()              detect format → split → normalize zone → coerce numbers
      │                    → { year, iso, rank, score, zone, country }
      ▼
applyCrossYearZoneOverrides()   repair the 2022 EEAC collapse
      │
      ▼
normalizeScores()          flip pre-2013 scores onto the modern scale
      │
      ▼
aggregateByZoneYear()      → [{ year, Europe, Africa, Americas, 'Asia-Pacific', MENA, EEAC }]
      │
      ▼
<Streamgraph />            d3.stack → d3.area (curveBasis) → SVG
```

`App.jsx` owns data loading and UI state; `Streamgraph.jsx` is a self-contained D3
renderer that draws into a ref'd `<svg>` from a `useCallback`, redrawing on any change to
data, dimensions, layout, metric, or hover state. React never renders the SVG children —
D3 owns that subtree.

Files that 404 are skipped silently, so the manifest in `App.jsx` can list years you don't
have yet; anything else that fails surfaces as an on-page warning.

### Project structure

```
public/data/          23 RSF CSV files, one per index year
src/
  App.jsx             CSV manifest, loading, controls, layout, data table
  components/
    Streamgraph.jsx   D3 rendering, hover, legends, annotations
  utils/
    parseCSV.js       format detection, parsing, zone + score normalization
  main.jsx            React entry point
test/
  parseCSV-safety.test.mjs   parser regression suite
```

---

## Testing

```bash
npm run test:parser
```

A dependency-free assertion suite (Node's built-in `assert`) covering the parts most
likely to break when RSF ships a new file:

- Zone normalization for each region, including deliberately mangled labels
  (`Am�riques`, `Asi�-Pacifique`, `UE Balkans`, `Maghreb - Moyen-Orient`)
- Aggregation producing non-zero averages for each region
- The 2022 EEAC cross-year override
- A regression test against the **real** `2022.csv`, asserting that MENA and Europe both
  parse and aggregate

---

## Deployment

`vite.config.js` sets `base: "/rsf-streamgraph/"` for GitHub Pages project-site hosting.
`npm run deploy` builds and pushes `dist/` to the `gh-pages` branch via the `gh-pages`
package.

---

## Known issues

- `test/parseCSV-test-utils.mjs` is an
  unused leftover from earlier refactors.
- `tmp-2022-zone-check.mjs`, `tmp-avg-trend-check.mjs` and `tmp-zone-consistency-check.mjs`
  are one-off diagnostic scripts kept for reference, not part of the build.
- There is no `.gitattributes`, so CRLF/LF differences can show up as spurious diffs on
  the CSV and source files.
- `npm run lint` reports one `no-useless-escape` error in `parseCSV.js` and one
  `react-hooks/exhaustive-deps` warning in `Streamgraph.jsx`.
- The format-detection docblock in `parseCSV.js` describes a "Format A" layout that no
  bundled file actually uses.

---

## Credits

Data: [Reporters Without Borders — World Press Freedom Index](https://rsf.org/en/index).
Index scores and regional groupings are RSF's; all parsing, normalization, and
visualization decisions are this project's.

Visualization by **Jeremiah King**.
