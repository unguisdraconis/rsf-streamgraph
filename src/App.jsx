import React, { useState, useEffect, useCallback } from "react";
import {
  parseRSFCsv,
  normalizeScores,
  aggregateByZoneYear,
} from "./utils/parseCSV";
import Streamgraph from "./components/Streamgraph";

/**
 * CSV file manifest.
 * `fallbackYear` is used when the file lacks a year column (Format C)
 * or when the year column contains an ambiguous value.
 *
 * NOTE: The 2012 file covers the 2011–2012 period. Its year column
 * may read "2011" — the parser remaps this to 2012 automatically.
 * There is no separate 2004, 2006–2011 file from RSF in this dataset.
 */
const CSV_FILES = [
  { file: "/data/rsf_2002.csv", year: 2002 },
  { file: "/data/rsf_2003.csv", year: 2003 },
  { file: "/data/rsf_2005.csv", year: 2005 },
  { file: "/data/rsf_2012.csv", year: 2012 },
  { file: "/data/rsf_2013.csv", year: 2013 },
  { file: "/data/rsf_2014.csv", year: 2014 },
  { file: "/data/rsf_2015.csv", year: 2015 },
  { file: "/data/rsf_2016.csv", year: 2016 },
  { file: "/data/rsf_2017.csv", year: 2017 },
  { file: "/data/rsf_2018.csv", year: 2018 },
  { file: "/data/rsf_2019.csv", year: 2019 },
  { file: "/data/rsf_2020.csv", year: 2020 },
  { file: "/data/rsf_2021.csv", year: 2021 },
  { file: "/data/rsf_2022.csv", year: 2022 },
  { file: "/data/rsf_2023.csv", year: 2023 },
  { file: "/data/rsf_2024.csv", year: 2024 },
  { file: "/data/rsf_2025.csv", year: 2025 },
];

export default function App() {
  const [allRecords, setAllRecords] = useState([]);
  const [metric, setMetric] = useState("avgScore");
  const [layout, setLayout] = useState("wiggle");
  const [scoreDir, setScoreDir] = useState("higherIsBetter");
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

  // Load all CSVs
  useEffect(() => {
    async function load() {
      setLoading(true);
      const combined = [];
      const loadErrors = [];

      for (const { file, year } of CSV_FILES) {
        try {
          const resp = await fetch(file);
          if (!resp.ok) {
            loadErrors.push(`${file}: HTTP ${resp.status}`);
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

  // Drag-and-drop support
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

  // Apply score normalization and aggregation
  const normalized = normalizeScores(allRecords, scoreDir);
  const aggregated = aggregateByZoneYear(normalized, metric);

  // Stats for display
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
        Interactive Streamgraph — Reporters Without Borders data by region
        (2002–2025). Hover a region to highlight. Drag &amp; drop CSVs to add
        data.
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

        {metric === "avgScore" && (
          <label style={{ fontSize: 14 }}>
            <strong>Score direction: </strong>
            <select
              value={scoreDir}
              onChange={(e) => setScoreDir(e.target.value)}
              style={{ marginLeft: 4, padding: "4px 8px", fontSize: 14 }}
            >
              <option value="higherIsBetter">Higher = More Free</option>
              <option value="lowerIsBetter">Lower = More Free (raw)</option>
            </select>
          </label>
        )}

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
          <strong>Note:</strong> RSF changed methodology in 2022. Scores before
          2022 (lower = more free, 0–100+) are inverted to match the 2022+ scale
          (higher = more free, 0–100). The{" "}
          <span style={{ color: "#c00" }}>dashed red line</span> marks this
          transition. The 2002 file has mostly missing scores and may show as
          zero. No data exists for 2004 or 2006–2011.
        </div>
      )}

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
          No data loaded. Drop your RSF CSV files here.
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
                <tr
                  style={{
                    background: "#f5f5f5",
                    borderBottom: "2px solid #ddd",
                  }}
                >
                  <th style={thStyle}>Year</th>
                  {[
                    "Europe",
                    "Africa",
                    "Americas",
                    "Asia-Pacific",
                    "MENA",
                    "EEAC",
                  ].map((z) => (
                    <th
                      key={z}
                      style={{ ...thStyle, color: ZONE_COLORS_TABLE[z] }}
                    >
                      {z}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {aggregated.map((row) => (
                  <tr key={row.year} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={tdStyle}>
                      <strong>{row.year}</strong>
                    </td>
                    {[
                      "Europe",
                      "Africa",
                      "Americas",
                      "Asia-Pacific",
                      "MENA",
                      "EEAC",
                    ].map((z) => (
                      <td key={z} style={tdStyle}>
                        {row[z]}
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
