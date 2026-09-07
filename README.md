# RSF World Press Freedom Index — analytical visualization

This project began as a **#30DayChartChallenge** attempt to build a streamgraph
from [Reporters Without Borders (RSF) World Press Freedom Index](https://rsf.org/en/index)
data. Reconciling 23 historical exports exposed a more important story: code can
run and a chart can look convincing while its analysis is still wrong.

Historical schemas, labels, score direction, regional groupings, and methodology
all changed. AI-assisted implementations repeatedly produced plausible but
inaccurate results until human-led validation changed both the data treatment and
the visualization design. The repository name preserves the original experiment;
the current application uses the form appropriate to each metric:

- **Country Count** is additive across six mutually exclusive project regions, so
  a stable-baseline stacked area is the default. The original streamgraph remains
  available as a comparison.
- **Average Score** is not additive. It is shown as one line per region, with
  breaks at methodology boundaries rather than as a misleading stacked total.

The central lesson is: **valid code + attractive visualization ≠ valid analysis**.

**Live site:** https://unguisdraconis.github.io/rsf-streamgraph/

The published site may lag this source branch. This curation pass is intentionally
not being deployed until the redistribution status of the bundled exports is
clarified.

## Human and AI contributions

AI-assisted tools wrote most of the application and scripting implementation.
Jeremiah King developed the analytical and cleaning approach, diagnosed
data-quality and interpretation failures, directed the normalization logic,
validated the transformed results, and made the final visualization and
interpretation decisions.

Earlier Python scripts used during exploration are no longer present. The retained
JavaScript diagnostics capture the claims needed by the current application. Git
authorship should not be read as evidence that the implementation was written
independently of AI assistance, nor that AI independently solved the data problem.

## What the application shows

The browser loads 23 semicolon-delimited CSV exports covering editions 2002–2010,
the combined 2011–2012 edition, and 2013–2025. The parser produces 4,020 unique
edition/ISO records and maps source labels into six project regions: Europe,
Africa, Americas, Asia-Pacific, MENA, and EEAC.

The metric control changes the analytical form:

| Metric | Default form | Optional form | Meaning |
| --- | --- | --- | --- |
| Average Score | Segmented regional lines | None | Arithmetic mean of included country scores in each region |
| Country Count | Stacked area | Streamgraph comparison | Number of included countries in each region |

Hovering the chart reveals an exact value. The region legend supports pointer and
keyboard exploration, and the disclosure below the chart provides the same values
as a structured table.

## Data reconciliation

The parser and application address several source inconsistencies:

- **Changing schemas:** column names and widths vary, including `Score 2025` in
  the latest export. Columns are resolved by headers rather than fixed positions.
- **Multilingual and malformed labels:** French and English region names, damaged
  accents, punctuation variants, and truncated values are mapped to the six
  project regions.
- **Combined edition:** `2012.csv` identifies its year as `2011-12`. It is one
  combined edition, represented internally at 2012; there is no separate 2011
  annual observation and no interpolated value.
- **2022 regional regrouping:** the source merged Eastern Europe and Central Asia
  into Europe. ISO evidence from adjacent editions restores the project grouping
  from 53 Europe / 0 EEAC to 40 Europe / 13 EEAC.
- **2025 encoding damage:** the raw file contains 219 Unicode replacement
  characters, including damaged multilingual country and region text. The raw
  export is preserved; region aliases allow all 180 rows to resolve, but the
  damaged display text has not been fully repaired.
- **Score direction:** earlier scores use the opposite better/worse direction from
  later scores. Pre-2013 values are displayed as `100 - score` only to align that
  direction.

### Score and methodology limitation

Direction alignment is **not** statistical normalization, recalibration, or proof
of a common scale. The combined 2011–2012 source ranges from -10 to 142; direction
alignment preserves the corresponding -42 to 110 range instead of clamping it to
0–100.

Average Score lines are separately drawn for:

- 2002–2010;
- the combined 2011–2012 edition;
- 2013–2021; and
- 2022–2025.

Markers identify the 2013 and 2022 methodology changes. Lines do not bridge
2010→2012, 2012→2013, or 2021→2022. Cross-era magnitudes should therefore be
treated cautiously; the chart supports within-era exploration, not a claim that
all editions share one statistically comparable scale. Modern score-quality
thresholds are not projected backward across historical methodologies.

## Diagnostic evidence

Lightweight Node scripts preserve the investigation as executable evidence:

- `check-2022-region-split.mjs` verifies the real 53/0 source grouping and the
  reconciled 40/13 Europe/EEAC result.
- `check-region-consistency.mjs` verifies 4,020 rows, 191 ISO entities, six known
  regions, and one stable project region per ISO after reconciliation.
- `check-score-direction.mjs` verifies the 2011–2012 raw and transformed extents
  and fails if a later edit silently clamps them.
- `parseCSV-safety.test.mjs` checks the full file/year manifest, unique
  edition/ISO keys, required score and region parsing, methodology segmentation,
  and the known 2025 encoding condition.

Run them with:

```bash
npm run test:parser
npm run test:diagnostics
```

## Data provenance

The bundled files were downloaded directly from RSF. Their original Windows
download metadata records the RSF index page, direct export URL, and local download
date; those details are preserved in [`public/data/README.md`](public/data/README.md)
because NTFS alternate data streams do not travel reliably with Git.

This provenance record does **not** resolve permission to redistribute the data.
RSF's terms for these annual CSV exports still need clarification before this
curated version is promoted or redeployed. No data or code license is inferred.

## Quick start

Requires Node `^20.19.0 || >=22.12.0` (Vite 8).

```bash
npm ci
npm run dev
npm run test:parser
npm run test:diagnostics
npm run lint
npm run build
npm run preview
```

`npm run deploy` exists for the established GitHub Pages workflow, but deployment
is deliberately outside this curation pass.

## Project structure

```text
public/data/          RSF CSV exports and tracked provenance notes
scripts/diagnostics/  focused corpus checks retained from analysis
src/App.jsx           data loading, controls, notes, and exact-value table
src/components/       D3 line, stacked-area, and streamgraph rendering
src/utils/            parsing, region reconciliation, direction alignment
test/                 full-corpus parser regression checks
```

## Known limitations

- Redistribution/right-to-publish terms for the bundled RSF exports remain
  unresolved; this blocks promotion and redeployment.
- Historical methodology changes limit direct score comparison across eras.
- The 2025 source includes widespread encoding damage; only the fields required
  for the current regional analysis are robustly recovered.
- Browser, screen-reader, and other assistive-technology testing is incomplete.
- A screenshot/social preview and broader presentation polish remain future work.
- The repository intentionally has no added software license pending a separate
  licensing decision.

## Deployment architecture

`master` is the source branch. `gh-pages` is independent generated publication
output produced by the `gh-pages` package and should remain separate. The current
work belongs on `fix/rsf-analytical-validity` until it is reviewed and can later be
fast-forwarded into `master`; it should not be deployed from this task.

## Credits

Data and index methodology: [Reporters Without Borders](https://rsf.org/en/index).
Analytical approach, validation direction, and visualization decisions: Jeremiah
King. Application and diagnostic implementation: AI-assisted under Jeremiah's
direction and review.
