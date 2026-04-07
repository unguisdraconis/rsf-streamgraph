import React, { useRef, useEffect, useState, useCallback } from "react";
import * as d3 from "d3";
import { ZONE_KEYS } from "../utils/parseCSV";

const MARGIN = { top: 40, right: 180, bottom: 50, left: 60 };

const ZONE_COLORS = {
  Europe: "#4e79a7",
  Africa: "#f28e2b",
  Americas: "#e15759",
  "Asia-Pacific": "#76b7b2",
  MENA: "#59a14f",
  EEAC: "#af7aa1",
};

export default function Streamgraph({
  data,
  width = 960,
  height = 500,
  metric = "avgScore",
  layout = "wiggle",
}) {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const [hoveredZone, setHoveredZone] = useState(null);

  const innerW = width - MARGIN.left - MARGIN.right;
  const innerH = height - MARGIN.top - MARGIN.bottom;

  const draw = useCallback(() => {
    if (!data || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // ── Scales ──────────────────────────────────────────────
    const xScale = d3
      .scaleLinear()
      .domain(d3.extent(data, (d) => d.year))
      .range([0, innerW]);

    // ── Stack generator ─────────────────────────────────────
    const offsetFn =
      layout === "wiggle" ? d3.stackOffsetWiggle : d3.stackOffsetNone;
    const orderFn =
      layout === "wiggle" ? d3.stackOrderInsideOut : d3.stackOrderNone;

    const stack = d3.stack().keys(ZONE_KEYS).offset(offsetFn).order(orderFn);

    const series = stack(data);

    const yMin = d3.min(series, (s) => d3.min(s, (d) => d[0]));
    const yMax = d3.max(series, (s) => d3.max(s, (d) => d[1]));

    const yScale = d3.scaleLinear().domain([yMin, yMax]).range([innerH, 0]);

    // ── Area generator ──────────────────────────────────────
    const area = d3
      .area()
      .x((d) => xScale(d.data.year))
      .y0((d) => yScale(d[0]))
      .y1((d) => yScale(d[1]))
      .curve(d3.curveBasis);

    // ── Root <g> ────────────────────────────────────────────
    const g = svg
      .append("g")
      .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    // ── Vertical hover line ─────────────────────────────────
    const hoverLine = g
      .append("line")
      .attr("class", "hover-line")
      .attr("y1", 0)
      .attr("y2", innerH)
      .attr("stroke", "#333")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4,3")
      .attr("opacity", 0)
      .attr("pointer-events", "none");

    // ── Draw layers ─────────────────────────────────────────
    g.selectAll("path.layer")
      .data(series)
      .join("path")
      .attr("class", "layer")
      .attr("d", area)
      .attr("fill", (d) => ZONE_COLORS[d.key])
      .attr("opacity", (d) =>
        hoveredZone === null || hoveredZone === d.key ? 0.85 : 0.15,
      )
      .attr("stroke", "white")
      .attr("stroke-width", 0.5)
      .style("cursor", "pointer")
      .on("mouseenter", function (_event, d) {
        setHoveredZone(d.key);
      })
      .on("mousemove", function (event, d) {
        const tooltip = d3.select(tooltipRef.current);
        const [mx] = d3.pointer(event, g.node());

        hoverLine.attr("x1", mx).attr("x2", mx).attr("opacity", 0.6);

        const yearFloat = xScale.invert(mx);
        const bisect = d3.bisector((r) => r.year).left;
        let idx = bisect(data, yearFloat, 1);
        idx = Math.min(idx, data.length - 1);
        if (idx > 0) {
          const d0 = data[idx - 1];
          const d1 = data[idx];
          if (yearFloat - d0.year < d1.year - yearFloat) {
            idx = idx - 1;
          }
        }
        const closest = data[idx];
        const val = closest[d.key];

        tooltip
          .style("display", "block")
          .style("left", `${event.pageX + 14}px`)
          .style("top", `${event.pageY - 28}px`).html(`
            <strong style="color:${ZONE_COLORS[d.key]}">${d.key}</strong><br/>
            Year: <strong>${closest.year}</strong><br/>
            ${metric === "avgScore" ? "Avg Score" : "Countries"}: <strong>${val}</strong>
          `);
      })
      .on("mouseleave", function () {
        setHoveredZone(null);
        hoverLine.attr("opacity", 0);
        d3.select(tooltipRef.current).style("display", "none");
      });

    // ── X Axis ──────────────────────────────────────────────
    const years = data.map((d) => d.year);
    const xAxis = d3
      .axisBottom(xScale)
      .tickValues(years)
      .tickFormat(d3.format("d"));

    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(xAxis)
      .selectAll("text")
      .attr("font-size", 11)
      .attr("transform", "rotate(-45)")
      .attr("text-anchor", "end")
      .attr("dx", "-0.5em")
      .attr("dy", "0.25em");

    // ── Y Axis (stacked area only) ─────────────────────────
    if (layout !== "wiggle") {
      const yAxis = d3.axisLeft(yScale).ticks(6);
      g.append("g").call(yAxis).selectAll("text").attr("font-size", 12);
    }

    // ── Axis labels ─────────────────────────────────────────
    svg
      .append("text")
      .attr("x", MARGIN.left + innerW / 2)
      .attr("y", height - 4)
      .attr("text-anchor", "middle")
      .attr("font-size", 13)
      .attr("fill", "#555")
      .text("Year");

    if (layout !== "wiggle") {
      svg
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -(MARGIN.top + innerH / 2))
        .attr("y", 16)
        .attr("text-anchor", "middle")
        .attr("font-size", 13)
        .attr("fill", "#555")
        .text(metric === "avgScore" ? "Average Score" : "Number of Countries");
    }

    // ── Title ───────────────────────────────────────────────
    svg
      .append("text")
      .attr("x", MARGIN.left + innerW / 2)
      .attr("y", 22)
      .attr("text-anchor", "middle")
      .attr("font-size", 18)
      .attr("font-weight", 600)
      .attr("fill", "#222")
      .text(
        `RSF Press Freedom — ${
          metric === "avgScore" ? "Average Score" : "Country Count"
        } by Region`,
      );

    // ── Methodology change annotation ───────────────────────
    const x2022 = xScale(2022);
    if (x2022 >= 0 && x2022 <= innerW) {
      g.append("line")
        .attr("x1", x2022)
        .attr("x2", x2022)
        .attr("y1", 0)
        .attr("y2", innerH)
        .attr("stroke", "#c00")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "6,4")
        .attr("opacity", 0.7);

      g.append("text")
        .attr("x", x2022 + 4)
        .attr("y", 14)
        .attr("font-size", 10)
        .attr("fill", "#c00")
        .text("New methodology →");
    }

    // ── Legend ───────────────────────────────────────────────
    const legend = svg
      .append("g")
      .attr(
        "transform",
        `translate(${MARGIN.left + innerW + 16}, ${MARGIN.top + 10})`,
      );

    ZONE_KEYS.forEach((z, i) => {
      const row = legend
        .append("g")
        .attr("transform", `translate(0, ${i * 26})`)
        .style("cursor", "pointer")
        .on("mouseenter", () => setHoveredZone(z))
        .on("mouseleave", () => setHoveredZone(null));

      row
        .append("rect")
        .attr("width", 16)
        .attr("height", 16)
        .attr("rx", 3)
        .attr("fill", ZONE_COLORS[z])
        .attr("opacity", hoveredZone === null || hoveredZone === z ? 1 : 0.25);

      row
        .append("text")
        .attr("x", 22)
        .attr("y", 13)
        .attr("font-size", 13)
        .attr(
          "fill",
          hoveredZone === null || hoveredZone === z ? "#222" : "#aaa",
        )
        .text(z);
    });
  }, [data, innerW, innerH, width, height, hoveredZone, layout, metric]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div style={{ position: "relative" }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}
      />
      <div
        ref={tooltipRef}
        style={{
          display: "none",
          position: "absolute",
          pointerEvents: "none",
          background: "rgba(255,255,255,0.96)",
          border: "1px solid #ccc",
          borderRadius: 6,
          padding: "8px 12px",
          fontSize: 13,
          lineHeight: 1.5,
          boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
          zIndex: 10,
        }}
      />
    </div>
  );
}
