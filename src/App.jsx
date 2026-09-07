import React, { useState, useEffect } from "react";
import {
  parseRSFCsv,
  alignScoreDirection,
  aggregateByZoneYear,
  applyCrossYearZoneOverrides,
} from "./utils/parseCSV";
import Streamgraph from "./components/Streamgraph";

/**
 * CSV file manifest.
 * Each entry maps a file in /public/data/ to its fallback year.
 * The parser reads the year from the data when available;
 * fallbackYear is used only when the file lacks a year column.
 *
 * The 2012 file covers the combined 2011–2012 edition. Its raw year value is
 * "2011-12"; the parser represents that single edition as 2012.
 *
 * Add or remove entries here to match the files you have.
 */
const DATA_BASE = `${import.meta.env.BASE_URL}data/`;

const CSV_FILES = [
  { file: `${DATA_BASE}2002.csv`, year: 2002 },
  { file: `${DATA_BASE}2003.csv`, year: 2003 },
  { file: `${DATA_BASE}2004.csv`, year: 2004 },
  { file: `${DATA_BASE}2005.csv`, year: 2005 },
  { file: `${DATA_BASE}2006.csv`, year: 2006 },
  { file: `${DATA_BASE}2007.csv`, year: 2007 },
  { file: `${DATA_BASE}2008.csv`, year: 2008 },
  { file: `${DATA_BASE}2009.csv`, year: 2009 },
  { file: `${DATA_BASE}2010.csv`, year: 2010 },
  { file: `${DATA_BASE}2012.csv`, year: 2012 },
  { file: `${DATA_BASE}2013.csv`, year: 2013 },
  { file: `${DATA_BASE}2014.csv`, year: 2014 },
  { file: `${DATA_BASE}2015.csv`, year: 2015 },
  { file: `${DATA_BASE}2016.csv`, year: 2016 },
  { file: `${DATA_BASE}2017.csv`, year: 2017 },
  { file: `${DATA_BASE}2018.csv`, year: 2018 },
  { file: `${DATA_BASE}2019.csv`, year: 2019 },
  { file: `${DATA_BASE}2020.csv`, year: 2020 },
  { file: `${DATA_BASE}2021.csv`, year: 2021 },
  { file: `${DATA_BASE}2022.csv`, year: 2022 },
  { file: `${DATA_BASE}2023.csv`, year: 2023 },
  { file: `${DATA_BASE}2024.csv`, year: 2024 },
  { file: `${DATA_BASE}2025.csv`, year: 2025 },
];

const ZONE_KEYS = [
  "Europe",
  "Africa",
  "Americas",
  "Asia-Pacific",
  "MENA",
  "EEAC",
];

const thStyle = { padding: "6px 12px", textAlign: "left" };
const tdStyle = { padding: "4px 12px" };

export default function App() {
  const [allRecords, setAllRecords] = useState([]);
  const [metric, setMetric] = useState("avgScore");
  const [layout, setLayout] = useState("zero");
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [dimensions, setDimensions] = useState({
    width: Math.max(280, Math.min(window.innerWidth - 40, 1100)),
    height: 520,
  });

  // Responsive resize
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: Math.max(280, Math.min(window.innerWidth - 40, 1100)),
        height: 520,
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Load all CSVs from /public/data/ on mount
  useEffect(() => {
    async function load() {
      setLoading(true);
      const combined = [];
      const loadErrors = [];

      for (const { file, year } of CSV_FILES) {
        try {
          const resp = await fetch(file);
          if (!resp.ok) {
            // Silently skip files that don't exist
            if (resp.status !== 404) {
              loadErrors.push(`${file}: HTTP ${resp.status}`);
            }
            continue;
          }
          const text = await resp.text();
          const records = parseRSFCsv(text, year);
          combined.push(...records);
        } catch (e) {
          loadErrors.push(`${file}: ${e.message}`);
        }
      }

      setErrors(loadErrors);
      setAllRecords(combined);
      setLoading(false);
    }
    load();
  }, []);

  // Reconcile the 2022 regions, then align score direction for display.
  const recordsWithCrossYearZones = applyCrossYearZoneOverrides(allRecords);
  const directionAligned = alignScoreDirection(recordsWithCrossYearZones);

  const includedMeansByYear = directionAligned.reduce((acc, record) => {
    if (record.score === null) return acc;
    const year = record.year;
    if (!acc[year]) acc[year] = { sum: 0, count: 0 };
    acc[year].sum += record.score;
    acc[year].count += 1;
    return acc;
  }, {});

  const aggregated = aggregateByZoneYear(directionAligned, metric).map((row) => {
    const includedData = includedMeansByYear[row.year];
    return {
      ...row,
      includedMean:
        metric === "avgScore" && includedData && includedData.count > 0
          ? +(includedData.sum / includedData.count).toFixed(2)
          : null,
    };
  });

  // Stats
  const yearsWithData = aggregated.map((r) => r.year);
  const recordsWithScore = allRecords.filter((r) => r.score !== null).length;
  const recordsWithZone = allRecords.filter((r) => r.zone !== null).length;

  return (
    <div
      style={{
        maxWidth: 1140,
        margin: "0 auto",
        padding: "20px",
        fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
      }}
    >
      <h1
        id="page-title"
        style={{ fontSize: 24, marginBottom: 4, color: "#222" }}
      >
        RSF World Press Freedom Index
      </h1>
      <p style={{ color: "#666", marginBottom: 20, fontSize: 14 }}>
        Explore changing regional patterns in Reporters Without Borders data.
        Stacked Area is the preferred view; Streamgraph preserves the original
        visual experiment.
      </p>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          gap: 20,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <label style={{ fontSize: 14 }}>
          <strong>Metric: </strong>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            style={{ marginLeft: 4, padding: "4px 8px", fontSize: 14 }}
          >
            <option value="avgScore">Average Score</option>
            <option value="count">Country Count</option>
          </select>
        </label>

        <label style={{ fontSize: 14 }}>
          <strong>Layout: </strong>
          <select
            value={layout}
            onChange={(e) => setLayout(e.target.value)}
            style={{ marginLeft: 4, padding: "4px 8px", fontSize: 14 }}
          >
            <option value="zero">Stacked Area</option>
            <option value="wiggle">Streamgraph comparison</option>
          </select>
        </label>

        <span style={{ fontSize: 12, color: "#999" }}>
          {allRecords.length.toLocaleString()} total records ·{" "}
          {recordsWithScore.toLocaleString()} with scores ·{" "}
          {recordsWithZone.toLocaleString()} with zones · {yearsWithData.length}{" "}
          editions
        </span>
      </div>

      {/* Warnings */}
      {errors.length > 0 && (
        <div
          style={{
            background: "#fff8e1",
            border: "1px solid #ffe082",
            borderRadius: 6,
            padding: "8px 14px",
            marginBottom: 12,
            fontSize: 13,
            color: "#8d6e00",
          }}
        >
          <strong>⚠ Some files could not be loaded:</strong>
          <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Methodology and comparability note */}
      {metric === "avgScore" && (
        <div
          id="methodology-note"
          style={{
            background: "#f0f4ff",
            border: "1px solid #c5cae9",
            borderRadius: 6,
            padding: "8px 14px",
            marginBottom: 12,
            fontSize: 12,
            color: "#37474f",
          }}
        >
          <strong>Interpretive score view:</strong> regional score bands are
          stacked to show changing patterns and visual continuity; the combined
          stack height is not an additive RSF score. Pre-2013 scores are
          subtracted from 100 to align direction only, not to statistically
          normalize them. Magnitudes are not demonstrated to be comparable
          across methodology eras.
          <br />
          The combined 2011–2012 edition is plotted at 2012; there is no separate
          2011 observation. Dashed annotations identify that edition and the 2013
          and 2022 methodology changes. Visual continuity does not establish
          statistical equivalence.
          <br />
          MENA = Middle East & North Africa; EEAC = Eastern Europe & Central
          Asia.
          <br />
          Source:{" "}
          <a
            href="https://rsf.org/en/index"
            target="_blank"
            rel="noopener noreferrer"
          >
            Reporters Without Borders
          </a>{" "}
          . Analysis and visualization by Jeremiah King; implementation was
          AI-assisted.
        </div>
      )}

      {/* Chart */}
      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: "#999" }}>
          Loading CSV data…
        </div>
      ) : aggregated.length === 0 ? (
        <div
          style={{
            padding: 60,
            textAlign: "center",
            color: "#999",
            border: "2px dashed #ccc",
            borderRadius: 12,
          }}
        >
          No data could be loaded. Please check that your CSV files are in the{" "}
          <code>/public/data/</code> folder and that the filenames match the
          manifest in <code>App.jsx</code>.
        </div>
      ) : (
        <Streamgraph
          data={aggregated}
          width={dimensions.width}
          height={dimensions.height}
          metric={metric}
          layout={layout}
          labelledBy="page-title"
        />
      )}

      {/* Data table */}
      {aggregated.length > 0 && (
        <details style={{ marginTop: 24 }}>
          <summary style={{ cursor: "pointer", fontSize: 14, color: "#555" }}>
            View aggregated data table
          </summary>
          <div style={{ overflowX: "auto", marginTop: 8 }}>
            <table
              style={{
                borderCollapse: "collapse",
                fontSize: 13,
                width: "100%",
              }}
            >
              <caption>
                {metric === "avgScore"
                  ? "Direction-aligned regional mean scores by RSF index edition"
                  : "Included country counts by region and RSF index edition"}
              </caption>
              <thead>
                <tr>
                  <th scope="col" style={thStyle}>
                    Edition
                  </th>
                  {ZONE_KEYS.map((zone) => (
                    <th key={zone} scope="col" style={thStyle}>
                      {zone}
                    </th>
                  ))}
                  {metric === "avgScore" && (
                    <th scope="col" style={thStyle}>
                      Mean of included country scores
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {aggregated.map((row) => (
                  <tr key={row.year}>
                    <th scope="row" style={tdStyle}>
                      {row.year === 2012 ? "2011–2012" : row.year}
                    </th>
                    {ZONE_KEYS.map((zone) => (
                      <td key={zone} style={tdStyle}>
                        {row[zone] == null ? "–" : row[zone]}
                      </td>
                    ))}
                    {metric === "avgScore" && (
                      <td style={tdStyle}>{row.includedMean ?? "–"}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
