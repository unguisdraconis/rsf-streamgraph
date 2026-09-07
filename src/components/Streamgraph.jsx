import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import * as d3 from "d3";
import { ZONE_KEYS } from "../utils/parseCSV";

const ZONE_COLORS = {
  Europe: "#4e79a7",
  Africa: "#d96c00",
  Americas: "#c83e4d",
  "Asia-Pacific": "#2a7f7b",
  MENA: "#3f8f3f",
  EEAC: "#8f5a9d",
};

function tickYears(data, width) {
  const years = data.map((row) => row.year);
  if (width >= 720) return years;

  const required = new Set([2002, 2010, 2012, 2013, 2021, 2022, 2025]);
  return years.filter((year, index) => index % 3 === 0 || required.has(year));
}

export default function Streamgraph({
  data,
  width = 960,
  height = 520,
  metric = "avgScore",
  layout = "zero",
  labelledBy = undefined,
}) {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const [hoveredZone, setHoveredZone] = useState(null);
  const [pinnedZone, setPinnedZone] = useState(null);
  const titleId = useId();
  const descriptionId = useId();
  const compact = width < 640;
  const margin = {
    top: 58,
    right: compact ? 18 : 32,
    bottom: compact ? 68 : 58,
    left: compact ? 48 : 64,
  };
  const innerW = Math.max(1, width - margin.left - margin.right);
  const innerH = Math.max(1, height - margin.top - margin.bottom);
  const isAverage = metric === "avgScore";
  const activeZone = hoveredZone ?? pinnedZone;
  const chartForm = layout === "wiggle" ? "streamgraph" : "stacked area chart";

  const draw = useCallback(() => {
    if (!data || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    svg
      .append("title")
      .attr("id", titleId)
      .text(
        isAverage
          ? `RSF direction-aligned regional mean scores, ${chartForm}`
          : `RSF country counts by region, ${chartForm}`,
      );
    svg
      .append("desc")
      .attr("id", descriptionId)
      .text(
        isAverage
          ? `An interpretive ${chartForm} of direction-aligned regional mean scores. Bands show changing regional patterns and visual continuity; their combined height is not an additive RSF score. The combined 2011-2012 edition is plotted at 2012, and annotations identify the 2013 and 2022 methodology changes. Exact values are available in the table after the chart.`
          : `A ${chartForm} of additive country counts. Band thickness represents the number of included countries in each mutually exclusive project region. Exact values are available in the table after the chart.`,
      );

    const xScale = d3
      .scaleLinear()
      .domain(d3.extent(data, (row) => row.year))
      .range([0, innerW]);
    const offsetFn =
      layout === "wiggle" ? d3.stackOffsetWiggle : d3.stackOffsetNone;
    const orderFn =
      layout === "wiggle" ? d3.stackOrderInsideOut : d3.stackOrderNone;
    const series = d3
      .stack()
      .keys(ZONE_KEYS)
      .offset(offsetFn)
      .order(orderFn)(data);
    const yScale = d3
      .scaleLinear()
      .domain([
        d3.min(series, (layer) => d3.min(layer, (point) => point[0])),
        d3.max(series, (layer) => d3.max(layer, (point) => point[1])),
      ])
      .nice()
      .range([innerH, 0]);
    const area = d3
      .area()
      .x((point) => xScale(point.data.year))
      .y0((point) => yScale(point[0]))
      .y1((point) => yScale(point[1]))
      .curve(d3.curveBasis);
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    const hoverLine = g
      .append("line")
      .attr("y1", 0)
      .attr("y2", innerH)
      .attr("stroke", "#333")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4,3")
      .attr("opacity", 0)
      .attr("pointer-events", "none");

    const showTooltip = (event, zone, row) => {
      const tooltip = d3.select(tooltipRef.current);
      const containerRect =
        tooltipRef.current.parentNode.getBoundingClientRect();
      const value = row[zone];
      tooltip
        .style("display", "block")
        .style("left", `${event.clientX - containerRect.left + 8}px`)
        .style("top", `${event.clientY - containerRect.top + 8}px`)
        .html(
          `<strong style="color:${ZONE_COLORS[zone]}">${zone}</strong><br/>` +
            `Edition: <strong>${row.year === 2012 ? "2011–2012" : row.year}</strong><br/>` +
            `${isAverage ? "Direction-aligned regional mean" : "Countries"}: <strong>${value}</strong>` +
            `${isAverage && row.includedMean != null ? `<br/>Mean of included country scores: <strong>${row.includedMean}</strong>` : ""}`,
        );
    };

    const hideTooltip = () => {
      setHoveredZone(null);
      hoverLine.attr("opacity", 0);
      d3.select(tooltipRef.current).style("display", "none");
    };

    g.selectAll("path.layer")
      .data(series)
      .join("path")
      .attr("class", "layer")
      .attr("d", area)
      .attr("fill", (layer) => ZONE_COLORS[layer.key])
      .attr("opacity", (layer) =>
        activeZone === null || activeZone === layer.key ? 0.88 : 0.15,
      )
      .attr("stroke", "white")
      .attr("stroke-width", 0.5)
      .style("cursor", "crosshair")
      .on("mouseenter", (_event, layer) => setHoveredZone(layer.key))
      .on("mousemove", function (event, layer) {
        const [mx] = d3.pointer(event, g.node());
        const year = xScale.invert(mx);
        const row = d3.least(data, (candidate) =>
          Math.abs(candidate.year - year),
        );
        hoverLine
          .attr("x1", xScale(row.year))
          .attr("x2", xScale(row.year))
          .attr("opacity", 0.55);
        showTooltip(event, layer.key, row);
      })
      .on("mouseleave", hideTooltip);

    if (isAverage) {
      [
        { year: 2012, label: "2011–12 combined", anchor: "end", dx: -4, y: 12 },
        { year: 2013, label: "2013 methodology", anchor: "start", dx: 4, y: 26 },
        { year: 2022, label: "2022 methodology", anchor: "start", dx: 4, y: 12 },
      ].forEach(({ year, label, anchor, dx, y }) => {
        const x = xScale(year);
        g.append("line")
          .attr("x1", x)
          .attr("x2", x)
          .attr("y1", 0)
          .attr("y2", innerH)
          .attr("stroke", "#8b1a1a")
          .attr("stroke-width", 1.5)
          .attr("stroke-dasharray", "6,4")
          .attr("opacity", 0.8)
          .attr("pointer-events", "none");
        g.append("text")
          .attr("x", x + dx)
          .attr("y", y)
          .attr("text-anchor", anchor)
          .attr("font-size", compact ? 9 : 10)
          .attr("fill", "#8b1a1a")
          .attr("pointer-events", "none")
          .text(label);
      });
    }

    if (layout !== "wiggle" && !isAverage) {
      g.append("g").call(d3.axisLeft(yScale).ticks(6));
    }

    const xAxis = d3
      .axisBottom(xScale)
      .tickValues(tickYears(data, width))
      .tickFormat((year) => (year === 2012 ? "2011–12" : d3.format("d")(year)));
    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(xAxis)
      .selectAll("text")
      .attr("font-size", compact ? 9 : 11)
      .attr("transform", "rotate(-45)")
      .attr("text-anchor", "end")
      .attr("dx", "-0.5em")
      .attr("dy", "0.25em");

    svg
      .append("text")
      .attr("x", margin.left + innerW / 2)
      .attr("y", height - 4)
      .attr("text-anchor", "middle")
      .attr("font-size", 13)
      .attr("fill", "#555")
      .text("Index edition");
    if (layout !== "wiggle") {
      svg
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -(margin.top + innerH / 2))
        .attr("y", 15)
        .attr("text-anchor", "middle")
        .attr("font-size", 12)
        .attr("fill", "#555")
        .text(isAverage ? "Regional mean bands (not additive)" : "Country count");
    }
    svg
      .append("text")
      .attr("x", margin.left + innerW / 2)
      .attr("y", 22)
      .attr("text-anchor", "middle")
      .attr("font-size", compact ? 15 : 18)
      .attr("font-weight", 600)
      .attr("fill", "#222")
      .text(
        isAverage
          ? `RSF regional mean score patterns — ${layout === "wiggle" ? "streamgraph" : "stacked area"}`
          : `RSF country count by region — ${layout === "wiggle" ? "streamgraph" : "stacked area"}`,
      );
  }, [
    activeZone,
    chartForm,
    compact,
    data,
    descriptionId,
    height,
    innerH,
    innerW,
    isAverage,
    layout,
    margin.left,
    margin.top,
    titleId,
    width,
  ]);

  useEffect(() => {
    draw();
  }, [draw]);

  const accessibleLabelledBy = [labelledBy, titleId].filter(Boolean).join(" ");

  return (
    <section className="chart-region" aria-label="Interactive visualization">
      <div className="chart-legend" aria-label="Regions">
        {ZONE_KEYS.map((zone) => (
          <button
            className="legend-button"
            key={zone}
            type="button"
            onMouseEnter={() => setHoveredZone(zone)}
            onMouseLeave={() => setHoveredZone(null)}
            onFocus={() => setHoveredZone(zone)}
            onBlur={() => setHoveredZone(null)}
            onClick={() =>
              setPinnedZone((current) => (current === zone ? null : zone))
            }
            aria-label={`Highlight ${zone} region`}
            aria-pressed={pinnedZone === zone}
          >
            <span
              className="legend-swatch"
              style={{ backgroundColor: ZONE_COLORS[zone] }}
              aria-hidden="true"
            />
            {zone}
          </button>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        {activeZone
          ? `${activeZone} is highlighted. Activate its legend button to keep or clear the highlight.`
          : "All regions are shown without emphasis."}
      </p>
      <div className="chart-canvas">
        <svg
          ref={svgRef}
          role="img"
          aria-labelledby={accessibleLabelledBy}
          aria-describedby={descriptionId}
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          preserveAspectRatio="xMidYMid meet"
          data-chart-form={chartForm}
          data-chart-metric={isAverage ? "average-score" : "country-count"}
        />
        <div ref={tooltipRef} className="chart-tooltip" aria-hidden="true" />
      </div>
    </section>
  );
}
