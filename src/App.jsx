import React, { useState, useEffect, useCallback } from "react";
import {
  parseRSFCsv,
  normalizeScores,
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
 * The 2012 file covers 2011–2012. If its year column reads "2011",
 * the parser remaps it to 2012 automatically.
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

const ZONE_COLORS_TABLE = {
  Europe: "#4e79a7",
  Africa: "#f28e2b",
  Americas: "#e15759",
  "Asia-Pacific": "#76b7b2",
  MENA: "#59a14f",
  EEAC: "#af7aa1",
};

const thStyle = { padding: "6px 12px", textAlign: "left" };
const tdStyle = { padding: "4px 12px" };

export default function App() {
  const [allRecords, setAllRecords] = useState([]);
  const [metric, setMetric] = useState("avgScore");
  const [layout, setLayout] = useState("zero");
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [dimensions, setDimensions] = useState({
    width: Math.min(window.innerWidth - 40, 1100),
    height: 560,
  });

  // Responsive resize
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: Math.min(window.innerWidth - 40, 1100),
        height: 560,
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

  // Optional: drag-and-drop to add extra CSV files at runtime
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.name.toLowerCase().endsWith(".csv"),
    );
    if (files.length === 0) return;

    Promise.all(
      files.map(
        (f) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              const match = f.name.match(/(\d{4})/);
              const year = match ? parseInt(match[1], 10) : 2020;
              resolve(parseRSFCsv(reader.result, year));
            };
            reader.readAsText(f);
          }),
      ),
    ).then((results) => {
      const newRecords = results.flat();
      setAllRecords((prev) => [...prev, ...newRecords]);
    });
  }, []);

  const handleDragOver = (e) => e.preventDefault();

  // Apply cross-year zone overrides before normalization and aggregation
  const recordsWithCrossYearZones = applyCrossYearZoneOverrides(allRecords);
  const normalized = normalizeScores(recordsWithCrossYearZones);

  const worldAveragesByYear = normalized.reduce((acc, record) => {
    if (record.score === null) return acc;
    const year = record.year;
    if (!acc[year]) acc[year] = { sum: 0, count: 0 };
    acc[year].sum += record.score;
    acc[year].count += 1;
    return acc;
  }, {});

  const aggregated = aggregateByZoneYear(normalized, metric).map((row) => {
    const worldData = worldAveragesByYear[row.year];
    return {
      ...row,
      worldAvg:
        metric === "avgScore" && worldData && worldData.count > 0
          ? +(worldData.sum / worldData.count).toFixed(2)
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
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <h1 style={{ fontSize: 24, marginBottom: 4, color: "#222" }}>
        RSF World Press Freedom Index
      </h1>
      <p style={{ color: "#666", marginBottom: 20, fontSize: 14 }}>
        Interactive Streamgraph — Reporters Without Borders data by region.
        Hover a region to highlight it.
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
            <option value="wiggle">Streamgraph</option>
            <option value="zero">Stacked Area</option>
          </select>
        </label>

        <span style={{ fontSize: 12, color: "#999" }}>
          {allRecords.length.toLocaleString()} total records ·{" "}
          {recordsWithScore.toLocaleString()} with scores ·{" "}
          {recordsWithZone.toLocaleString()} with zones · {yearsWithData.length}{" "}
          years
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

      {/* Methodology note */}
      {metric === "avgScore" && (
        <div
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
          <strong>Note:</strong> RSF changed methodology in 2013. Scores before
          2013 (lower = more free, 0–100+) are inverted to match the 2013+ scale
          (higher = more free, 0–100). The{" "}
          <span style={{ color: "#c00" }}>dashed red line</span> marks this
          transition. Years without a corresponding CSV file will appear as
          gaps.
          <br />
          For the most direct comparison of normalized average scores, use the{" "}
          <strong>Stacked Area</strong> layout.
          <br />
          MENA = Middle East & North Africa; EEAC = Eastern Europe & Central
          Asia.
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
              <thead>
                <tr>
                  <th style={thStyle}>Year</th>
                  {Object.keys(ZONE_COLORS_TABLE).map((zone) => (
                    <th key={zone} style={thStyle}>
                      {zone}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {aggregated.map((row) => (
                  <tr key={row.year}>
                    <td style={tdStyle}>{row.year}</td>
                    {Object.keys(ZONE_COLORS_TABLE).map((zone) => (
                      <td key={zone} style={tdStyle}>
                        {row[zone] == null ? "–" : row[zone]}
                      </td>
                    ))}
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
