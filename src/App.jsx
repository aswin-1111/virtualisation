import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import p5 from "p5";

/**
 * Knapsack 0/1 Visualizer
 * - Left: inputs (capacity + items)
 * - Right Top: DP table (d3.js) with step-by-step filling and highlights
 * - Right Bottom: p5.js canvas showing items and final chosen set
 *
 * Notes:
 * - Install deps: npm i d3 p5
 * - Drop this component anywhere; it's self-contained and uses Tailwind-like utility classes.
 */
export default function KnapsackVisualizer() {
  // -------------------- Input state --------------------
  const [capacity, setCapacity] = useState(10);
  const [items, setItems] = useState([
    { name: "A", value: 6, weight: 2 },
    { name: "B", value: 10, weight: 4 },
    { name: "C", value: 12, weight: 6 },
  ]);

  const addItem = () => setItems([...items, { name: "", value: 1, weight: 1 }]);
  const updateItem = (idx, field, value) => {
    const upd = [...items];
    upd[idx] = { ...upd[idx], [field]: value };
    setItems(upd);
  };
  const deleteItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  // -------------------- DP + Steps --------------------
  const { steps, n, C, gridMeta } = useMemo(() => computeSteps(items, capacity), [items, capacity]);
  const [stepIdx, setStepIdx] = useState(0);
  useEffect(() => setStepIdx(0), [items, capacity]);

  // Auto-play controls
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(500);
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setStepIdx((s) => (s < steps.length - 1 ? s + 1 : (clearInterval(id), s)));
    }, speedMs);
    return () => clearInterval(id);
  }, [isPlaying, speedMs, steps.length]);

  // -------------------- d3 DP Table --------------------
  const svgRef = useRef(null);
  const d3InitRef = useRef(false);
  const latestStepRef = useRef(null);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const width = Math.min(900, 40 * (C + 2));
    const cell = Math.max(20, Math.floor((width - 100) / (C + 2)));
    const height = (n + 3) * cell;

    const svg = d3.select(svgEl).attr("viewBox", `0 0 ${width} ${height}`).attr("width", "100%");

    // Build once
    if (!d3InitRef.current) {
      svg.selectAll("*").remove();

      // Title
      svg
        .append("text")
        .attr("x", 12)
        .attr("y", 18)
        .attr("font-size", 14)
        .attr("font-weight", 600)
        .text("Dynamic Programming Table (values)");

      // Groups
      svg.append("g").attr("class", "grid");
      svg.append("g").attr("class", "axisX");
      svg.append("g").attr("class", "axisY");
      svg.append("g").attr("class", "highlights");

      d3InitRef.current = true;
    }

    // Scales & positions
    const x0 = 80; // left margin for row labels
    const y0 = 30; // top margin for column labels

    // Axis labels (capacity 0..C)
    const axisX = svg.select("g.axisX");
    const cols = d3.range(C + 1);
    const colG = axisX.selectAll("g.colLab").data(cols, (d) => d);
    const colGEnter = colG.enter().append("g").attr("class", "colLab");
    colGEnter
      .append("text")
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .attr("x", (d) => x0 + (d + 1) * cell + cell / 2)
      .attr("y", y0 - 6)
      .text((d) => d);
    colG.exit().remove();

    // Row labels (i = 0..n) with item metadata
    const axisY = svg.select("g.axisY");
    const rows = d3.range(n + 1).map((i) => ({
      i,
      label: i === 0 ? "i=0 (no items)" : `${i}. ${gridMeta.items[i - 1].name || "(item)"}  w=${gridMeta.items[i - 1].weight}, v=${gridMeta.items[i - 1].value}`,
    }));
    const rowG = axisY.selectAll("g.rowLab").data(rows, (d) => d.i);
    const rowEnter = rowG.enter().append("g").attr("class", "rowLab");
    rowEnter
      .append("text")
      .attr("x", 8)
      .attr("y", (d) => y0 + (d.i + 1) * cell + cell * 0.65)
      .attr("font-size", 12)
      .text((d) => d.label);
    rowG.exit().remove();

    // Grid cells
    const grid = svg.select("g.grid");
    const data = [];
    for (let i = 0; i <= n; i++) {
      for (let w = 0; w <= C; w++) {
        data.push({ i, w });
      }
    }

    const cells = grid.selectAll("g.cell").data(data, (d) => `${d.i}-${d.w}`);
    const cellsEnter = cells.enter().append("g").attr("class", "cell");

    cellsEnter
      .append("rect")
      .attr("x", (d) => x0 + (d.w + 1) * cell)
      .attr("y", (d) => y0 + (d.i + 1) * cell)
      .attr("width", cell)
      .attr("height", cell)
      .attr("fill", "#fff")
      .attr("stroke", "#bbb");

    cellsEnter
      .append("text")
      .attr("x", (d) => x0 + (d.w + 1) * cell + cell / 2)
      .attr("y", (d) => y0 + (d.i + 1) * cell + cell * 0.62)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .text(0);

    cells.exit().remove();

    // highlight layers
    const hi = svg.select("g.highlights");
    hi.selectAll("*").remove();
    const currRect = hi
      .append("rect")
      .attr("class", "curr")
      .attr("fill", "none")
      .attr("stroke", "orange")
      .attr("stroke-width", 2);

    const upRect = hi
      .append("rect")
      .attr("class", "up")
      .attr("fill", "none")
      .attr("stroke", "#888")
      .attr("stroke-dasharray", "4 2");

    const diagRect = hi
      .append("rect")
      .attr("class", "diag")
      .attr("fill", "none")
      .attr("stroke", "#888")
      .attr("stroke-dasharray", "4 2");

    // Update on step change
    const render = (step) => {
      if (!step) return;
      // Fill texts for all computed cells up to current step
      const dpSoFar = buildDpSoFar(steps, step.stepNumber, n, C);

      grid
        .selectAll("g.cell")
        .select("text")
        .text((d) => dpSoFar[d.i][d.w]);

      // Color fills based on value density
      const maxVal = d3.max(dpSoFar.flat());
      const color = d3.scaleLinear().domain([0, maxVal || 1]).range(["#ffffff", "#d1e8ff"]);
      grid
        .selectAll("g.cell")
        .select("rect")
        .attr("fill", (d) => color(dpSoFar[d.i][d.w]))
        .attr("stroke", "#bbb");

      // Highlight current and dependencies
      const rectPos = (ii, ww) => ({
        x: x0 + (ww + 1) * cell,
        y: y0 + (ii + 1) * cell,
        w: cell,
        h: cell,
      });

      const c = rectPos(step.i, step.w);
      currRect.attr("x", c.x).attr("y", c.y).attr("width", c.w).attr("height", c.h);

      if (step.reason === "heavy") {
        const u = rectPos(step.i - 1, step.w);
        upRect.attr("x", u.x).attr("y", u.y).attr("width", u.w).attr("height", u.h).style("opacity", 1);
        diagRect.style("opacity", 0);
      } else {
        const u = rectPos(step.i - 1, step.w);
        const dpos = rectPos(step.i - 1, step.w - step.item.weight);
        upRect.attr("x", u.x).attr("y", u.y).attr("width", u.w).attr("height", u.h).style("opacity", 1);
        diagRect.attr("x", dpos.x).attr("y", dpos.y).attr("width", dpos.w).attr("height", dpos.h).style("opacity", 1);
      }

      // Emphasize chosen value by thicker stroke
      grid
        .selectAll("g.cell")
        .select("rect")
        .attr("stroke-width", (d) => (d.i === step.i && d.w === step.w ? 2 : 1));
    };

    latestStepRef.current = { render };
    render(steps[stepIdx]);
  }, [n, C, steps, stepIdx, gridMeta.items]);

  useEffect(() => {
    // When step changes, rerender highlights/values without rebuilding grid
    latestStepRef.current?.render?.(steps[stepIdx]);
  }, [stepIdx, steps]);

  // -------------------- p5 Canvas --------------------
  const p5Ref = useRef(null);
  const p5InstanceRef = useRef(null);
  const p5DataRef = useRef({ items: [], chosen: new Set(), focusIdx: null });

  // (Re)create p5 instance once
  useEffect(() => {
    if (!p5Ref.current) return;

    if (p5InstanceRef.current) {
      p5InstanceRef.current.remove();
      p5InstanceRef.current = null;
    }

    const sketch = (p) => {
      const W = 900;
      const H = 260;
      p.setup = () => {
        p.createCanvas(W, H);
        p.textFont("system-ui, -apple-system, Segoe UI, Roboto");
      };

      p.draw = () => {
        p.background(255);

        // Draw knapsack outline
        p.push();
        p.stroke(20);
        p.noFill();
        p.strokeWeight(2);
        p.rect(20, 20, W - 40, H - 80, 14);
        p.pop();

        // Title
        p.fill(30);
        p.noStroke();
        p.textSize(14);
        p.text("Items (highlight shows current row's item). Final chosen items are filled.", 22, H - 40);

        const items = p5DataRef.current.items || [];
        const chosen = p5DataRef.current.chosen || new Set();
        const focus = p5DataRef.current.focusIdx;

        // Layout items as tiles
        const pad = 10;
        const tileW = Math.max(70, Math.min(140, (W - 2 * pad) / Math.max(1, items.length) - pad));
        const tileH = 60;
        items.forEach((it, idx) => {
          const x = 30 + idx * (tileW + pad);
          const y = 40;

          // Tile bg
          p.stroke(180);
          p.strokeWeight(focus === idx ? 3 : 1.2);
          if (chosen.has(idx)) {
            p.fill(210, 240, 210); // green-ish if chosen in final set
          } else {
            p.fill(245);
          }
          p.rect(x, y, tileW, tileH, 10);

          // Name and stats
          p.fill(30);
          p.noStroke();
          p.textSize(13);
          p.textAlign(p.LEFT, p.TOP);
          p.text(`${it.name || "(item)"}`, x + 10, y + 8);
          p.textSize(12);
          p.text(`w=${it.weight}  v=${it.value}`, x + 10, y + 28);
        });
      };
    };

    p5InstanceRef.current = new p5(sketch, p5Ref.current);

    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      }
    };
  }, []);

  // Update p5 data on step change and when final
  useEffect(() => {
    const step = steps[stepIdx];
    p5DataRef.current.items = gridMeta.items;
    p5DataRef.current.focusIdx = step ? step.i - 1 : null; // current row's item index

    // If final, show chosen set
    if (stepIdx === steps.length - 1) {
      const chosen = new Set(backtrackChosen(gridMeta, n, C));
      p5DataRef.current.chosen = chosen;
    } else {
      p5DataRef.current.chosen = new Set();
    }
  }, [steps, stepIdx, n, C, gridMeta]);

  // -------------------- UI helpers --------------------
  const canStepBack = stepIdx > 0;
  const canStepFwd = stepIdx < steps.length - 1;
  const reset = () => setStepIdx(0);

  // -------------------- Render --------------------
  return (
    <div className="w-full min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT: Inputs */}
        <div className="lg:col-span-4 bg-white rounded-2xl shadow p-4 space-y-4">
          <h1 className="text-2xl font-semibold">0/1 Knapsack — Step-by-Step</h1>
          <p className="text-sm text-gray-600">Enter capacity and items, then use the controls to walk through the dynamic programming table filling.</p>

          <div className="space-y-2">
            <label className="text-sm font-medium">Knapsack Capacity</label>
            <input
              type="number"
              min={0}
              className="border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring"
              value={capacity}
              onChange={(e) => setCapacity(Math.max(0, parseInt(e.target.value || 0)))}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Items</h2>
              <button
                onClick={addItem}
                className="px-3 py-1.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
              >
                + Add Item
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-auto pr-1">
              {items.length === 0 && (
                <div className="text-sm text-gray-500">No items yet.</div>
              )}
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    className="col-span-4 border rounded-lg px-2 py-1.5"
                    placeholder="Name"
                    value={it.name}
                    onChange={(e) => updateItem(idx, "name", e.target.value)}
                  />
                  <input
                    type="number"
                    min={0}
                    className="col-span-3 border rounded-lg px-2 py-1.5"
                    placeholder="Value"
                    value={it.value}
                    onChange={(e) => updateItem(idx, "value", Math.max(0, parseInt(e.target.value || 0)))}
                  />
                  <input
                    type="number"
                    min={0}
                    className="col-span-3 border rounded-lg px-2 py-1.5"
                    placeholder="Weight"
                    value={it.weight}
                    onChange={(e) => updateItem(idx, "weight", Math.max(0, parseInt(e.target.value || 0)))}
                  />
                  <button
                    onClick={() => deleteItem(idx)}
                    className="col-span-2 px-2 py-1.5 rounded-lg border hover:bg-gray-50"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsPlaying(false);
                  reset();
                }}
                className="px-3 py-1.5 rounded-xl border"
              >
                Reset
              </button>
              <button
                onClick={() => setStepIdx((s) => (canStepBack ? s - 1 : s))}
                disabled={!canStepBack}
                className={`px-3 py-1.5 rounded-xl border ${!canStepBack ? "opacity-50" : ""}`}
              >
                ◀ Step
              </button>
              {isPlaying ? (
                <button onClick={() => setIsPlaying(false)} className="px-3 py-1.5 rounded-xl bg-amber-500 text-white">
                  Pause
                </button>
              ) : (
                <button onClick={() => setIsPlaying(true)} className="px-3 py-1.5 rounded-xl bg-green-600 text-white">
                  Play
                </button>
              )}
              <button
                onClick={() => setStepIdx((s) => (canStepFwd ? s + 1 : s))}
                disabled={!canStepFwd}
                className={`px-3 py-1.5 rounded-xl border ${!canStepFwd ? "opacity-50" : ""}`}
              >
                Step ▶
              </button>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <label className="text-sm text-gray-600">Speed</label>
              <input
                type="range"
                min={100}
                max={1500}
                value={speedMs}
                onChange={(e) => setSpeedMs(parseInt(e.target.value))}
              />
              <span className="text-xs text-gray-500 w-14">{speedMs}ms</span>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Step {Math.min(stepIdx + 1, steps.length)} / {steps.length}
            </div>
          </div>
        </div>

        {/* RIGHT: Visualizations */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl shadow p-3">
            <svg ref={svgRef} className="w-full h-[420px]" />
            <ExplainPanel step={steps[stepIdx]} />
          </div>
          <div className="bg-white rounded-2xl shadow p-3">
            <div ref={p5Ref} className="w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ExplainPanel({ step }) {
  if (!step) return null;
  if (step.i === 0) {
    return (
      <div className="mt-2 text-sm text-gray-700">
        Initial row (i = 0): with no items, value is 0 for all capacities.
      </div>
    );
  }
  if (step.reason === "heavy") {
    return (
      <div className="mt-2 text-sm text-gray-700">
        Considering item <b>{step.item.name || "(item)"}</b> (w={step.item.weight}, v={step.item.value}) at capacity <b>{step.w}</b>:
        weight exceeds capacity, so we <b>copy up</b> → value stays <b>{step.fromUp}</b>.
      </div>
    );
  }
  return (
    <div className="mt-2 text-sm text-gray-700">
      Considering item <b>{step.item.name || "(item)"}</b> (w={step.item.weight}, v={step.item.value}) at capacity <b>{step.w}</b>:
      compare <b>skip</b> = up = {step.fromUp} vs <b>take</b> = diag + v = {step.fromDiag} + {step.item.value} = {step.fromDiag + step.item.value} → choose <b>{step.take ? "take" : "skip"}</b> = {step.value}.
    </div>
  );
}

// -------------------- DP Computation + Steps --------------------
function computeSteps(itemsIn, capacityIn) {
  const items = (itemsIn || [])
    .map((d, i) => ({ name: d.name?.trim() || `Item ${i + 1}`, value: +d.value || 0, weight: +d.weight || 0 }))
    .filter((d) => d.weight >= 0 && d.value >= 0);
  const C = Math.max(0, +capacityIn || 0);
  const n = items.length;

  // dp[i][w]
  const dp = Array.from({ length: n + 1 }, () => Array(C + 1).fill(0));
  const steps = [];

  // Initial row i=0 already 0s; still push steps for rendering
  for (let w = 0; w <= C; w++) {
    steps.push({ stepNumber: steps.length, i: 0, w, value: 0, reason: "base", item: { name: "", weight: 0, value: 0 }, fromUp: 0, fromDiag: 0, take: false });
  }

  for (let i = 1; i <= n; i++) {
    const { weight: wi, value: vi } = items[i - 1];
    for (let w = 0; w <= C; w++) {
      if (wi > w) {
        dp[i][w] = dp[i - 1][w];
        steps.push({
          stepNumber: steps.length,
          i,
          w,
          value: dp[i][w],
          reason: "heavy",
          item: items[i - 1],
          fromUp: dp[i - 1][w],
          fromDiag: null,
          take: false,
        });
      } else {
        const skip = dp[i - 1][w];
        const take = dp[i - 1][w - wi] + vi;
        dp[i][w] = Math.max(skip, take);
        steps.push({
          stepNumber: steps.length,
          i,
          w,
          value: dp[i][w],
          reason: "choose",
          item: items[i - 1],
          fromUp: skip,
          fromDiag: dp[i - 1][w - wi],
          take: take >= skip,
        });
      }
    }
  }

  return { steps, n, C, gridMeta: { items, dp } };
}

function buildDpSoFar(steps, upToStepNumber, n, C) {
  const dp = Array.from({ length: n + 1 }, () => Array(C + 1).fill(0));
  for (const s of steps) {
    if (s.stepNumber > upToStepNumber) break;
    dp[s.i][s.w] = s.value;
  }
  return dp;
}

function backtrackChosen(gridMeta, n, C) {
  const { items, dp } = gridMeta;
  const chosen = [];
  let i = n;
  let w = C;
  while (i > 0 && w >= 0) {
    if (dp[i][w] === dp[i - 1][w]) {
      i -= 1; // skipped
    } else {
      // taken
      chosen.push(i - 1);
      w -= items[i - 1].weight;
      i -= 1;
    }
  }
  return chosen.reverse();
}
