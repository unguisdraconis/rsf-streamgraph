# Bundled RSF export provenance

These 23 CSV files are the Reporters Without Borders World Press Freedom Index
source exports used by this project. They are preserved unchanged. The application
parses and interprets them at runtime; it does not write schema reconciliation,
region normalization, score-direction alignment, or aggregation back into these
source artifacts.

The table transcribes the source URL and local acquisition date from each file's
Windows `Zone.Identifier` metadata and filesystem timestamps before that
machine-specific evidence is lost through Git transport.

Dates are local calendar dates on the acquisition machine (America/New_York). The
download URLs and acquisition dates are retained as provenance for the unchanged
exports.

| File | Downloaded | Index-page referrer | Direct RSF export |
| --- | --- | --- | --- |
| `2002.csv` | 2026-04-07 | [2002 index](https://rsf.org/en/index?year=2002) | [CSV](https://rsf.org/sites/default/files/import_classement/2002.csv) |
| `2003.csv` | 2026-04-07 | [2003 index](https://rsf.org/en/index?year=2003) | [CSV](https://rsf.org/sites/default/files/import_classement/2003.csv) |
| `2004.csv` | 2026-04-07 | [2004 index](https://rsf.org/en/index?year=2004) | [CSV](https://rsf.org/sites/default/files/import_classement/2004.csv) |
| `2005.csv` | 2026-04-07 | [2005 index](https://rsf.org/en/index?year=2005) | [CSV](https://rsf.org/sites/default/files/import_classement/2005.csv) |
| `2006.csv` | 2026-04-07 | [2006 index](https://rsf.org/en/index?year=2006) | [CSV](https://rsf.org/sites/default/files/import_classement/2006.csv) |
| `2007.csv` | 2026-04-07 | [2007 index](https://rsf.org/en/index?year=2007) | [CSV](https://rsf.org/sites/default/files/import_classement/2007.csv) |
| `2008.csv` | 2026-04-07 | [2008 index](https://rsf.org/en/index?year=2008) | [CSV](https://rsf.org/sites/default/files/import_classement/2008.csv) |
| `2009.csv` | 2026-04-08 | [2009 index](https://rsf.org/en/index?year=2009) | [CSV](https://rsf.org/sites/default/files/import_classement/2009.csv) |
| `2010.csv` | 2026-04-08 | [2010 index](https://rsf.org/en/index?year=2010) | [CSV](https://rsf.org/sites/default/files/import_classement/2010.csv) |
| `2012.csv` | 2026-04-07 | [2012 index](https://rsf.org/en/index?year=2012) | [CSV](https://rsf.org/sites/default/files/import_classement/2012.csv) |
| `2013.csv` | 2026-04-07 | [2013 index](https://rsf.org/en/index?year=2013) | [CSV](https://rsf.org/sites/default/files/import_classement/2013.csv) |
| `2014.csv` | 2026-04-07 | [2014 index](https://rsf.org/en/index?year=2014) | [CSV](https://rsf.org/sites/default/files/import_classement/2014.csv) |
| `2015.csv` | 2026-04-07 | [2015 index](https://rsf.org/en/index?year=2015) | [CSV](https://rsf.org/sites/default/files/import_classement/2015.csv) |
| `2016.csv` | 2026-04-07 | [2016 index](https://rsf.org/en/index?year=2016) | [CSV](https://rsf.org/sites/default/files/import_classement/2016.csv) |
| `2017.csv` | 2026-04-07 | [2017 index](https://rsf.org/en/index?year=2017) | [CSV](https://rsf.org/sites/default/files/import_classement/2017.csv) |
| `2018.csv` | 2026-04-07 | [2018 index](https://rsf.org/en/index?year=2018) | [CSV](https://rsf.org/sites/default/files/import_classement/2018.csv) |
| `2019.csv` | 2026-04-07 | [2019 index](https://rsf.org/en/index?year=2019) | [CSV](https://rsf.org/sites/default/files/import_classement/2019.csv) |
| `2020.csv` | 2026-04-07 | [2020 index](https://rsf.org/en/index?year=2020) | [CSV](https://rsf.org/sites/default/files/import_classement/2020.csv) |
| `2021.csv` | 2026-04-07 | [2021 index](https://rsf.org/en/index?year=2021) | [CSV](https://rsf.org/sites/default/files/import_classement/2021.csv) |
| `2022.csv` | 2026-04-07 | [2022 index](https://rsf.org/en/index?year=2022) | [CSV](https://rsf.org/sites/default/files/import_classement/2022.csv) |
| `2023.csv` | 2026-04-07 | [2023 index](https://rsf.org/en/index?year=2023) | [CSV](https://rsf.org/sites/default/files/import_classement/2023.csv) |
| `2024.csv` | 2026-04-07 | [2024 index](https://rsf.org/en/index?year=2024) | [CSV](https://rsf.org/sites/default/files/import_classement/2024.csv) |
| `2025.csv` | 2026-04-07 | [current index](https://rsf.org/en/index) | [CSV](https://rsf.org/sites/default/files/import_classement/2025.csv) |

The direct URLs above were the `HostUrl` values recorded at download time. URL
availability can change independently of the copies bundled here.

Diagnostic scripts test the application's interpretation and reconciliation logic
against these exports without modifying them. The originals are shared with
attribution for this non-commercial educational project under
[RSF's published sharing terms](https://rsf.org/en/methodology-used-compiling-world-press-freedom-index-2026),
which authorize non-commercial copying, distribution, and communication while
restricting modification or adaptation without consent. The application produces
its derived analytical structures, tables, and visualizations at runtime. This
note records the project's provenance and reuse basis; it is not a universal legal
determination and does not apply an RSF license to the repository's source code.
