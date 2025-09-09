import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

export default function KnapsackInput() {
  const [capacity, setCapacity] = useState(10);
  const [items, setItems] = useState([
    { name: "A", value: 6, weight: 2 },
    { name: "B", value: 10, weight: 4 },
    { name: "C", value: 12, weight: 6 },
  ]);

  const [dp, setDp] = useState([]); 
  const [dpHistory, setDpHistory] = useState([]); // snapshots for undo
  const [fillStep, setFillStep] = useState(0); // how many cells have been filled
  const [totalSteps, setTotalSteps] = useState(0);
  const [dpComplete, setDpComplete] = useState(false);

  // Backtracking state
  const [backtrackSequence, setBacktrackSequence] = useState([]); // precomputed sequence of actions
  const [backtrackIndex, setBacktrackIndex] = useState(0); // how many backtrack steps done
  const [chosenItemsSet, setChosenItemsSet] = useState(new Set());

  // Derived values (parsed & sanitized)
  const parsedItems = useMemo(() => {
    return items.map((it) => ({
      name: it.name || "",
      value: Number(it.value) || 0,
      weight: Number(it.weight) || 0,
    }));
  }, [items]);

  const n = parsedItems.length;
  const W = Math.max(0, Number(capacity) || 0);

  // Utility to deep clone a dp array
  const cloneDp = (arr) => arr.map((r) => r.slice());

  // Initialize DP matrix and control variables
  const initializeDP = () => {
    const zero = Array.from({ length: W + 1 }, () => 0);
    const initial = Array.from({ length: n + 1 }, () => zero.slice());
    setDp(initial);
    setDpHistory([cloneDp(initial)]);
    setFillStep(0);
    setTotalSteps(n * (W + 1));
    setDpComplete(false);
    setBacktrackSequence([]);
    setBacktrackIndex(0);
    setChosenItemsSet(new Set());
  };

  // Call initialize on first render and when n or W changes
  useEffect(() => {
    initializeDP();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, W]);

  // Compute coordinates for a given fillStep (0-based)
  const stepToCoords = (stepIndex) => {
    if (stepIndex < 0) return null;
    const row = Math.floor(stepIndex / (W + 1)) + 1; // i (1..n)
    const col = stepIndex % (W + 1); // w (0..W)
    return { i: row, w: col };
  };

  // Perform a single DP fill step
  const nextFillStep = () => {
    if (fillStep >= totalSteps) return;
    const stepIndex = fillStep; // current cell to compute
    const { i, w } = stepToCoords(stepIndex);

    const item = parsedItems[i - 1];
    const newDp = cloneDp(dp);

    if (w < item.weight) {
      newDp[i][w] = newDp[i - 1][w];
    } else {
      const without = newDp[i - 1][w];
      const withItem = newDp[i - 1][w - item.weight] + item.value;
      newDp[i][w] = Math.max(without, withItem);
    }

    const newHistory = dpHistory.slice(0, fillStep + 1); // in case user had undone some steps
    newHistory.push(cloneDp(newDp));

    setDp(newDp);
    setDpHistory(newHistory);
    setFillStep((s) => s + 1);

    if (fillStep + 1 === totalSteps) {
      setDpComplete(true);
    }
  };

  // Revert one fill step
  const prevFillStep = () => {
    if (fillStep <= 0) return;
    const newIndex = fillStep - 1;
    const snapshot = dpHistory[newIndex];
    setDp(cloneDp(snapshot));
    setDpHistory(dpHistory.slice(0, newIndex + 1));
    setFillStep(newIndex);
    setDpComplete(false);
  };

  // Build the backtracking sequence from completed DP
  const startBacktrack = () => {
    if (!dpComplete) return;
    const snapshot = dp; // current dp (completed)
    let i = n;
    let w = W;
    const seq = [];
    const chosen = new Set();

    while (i > 0) {
      const val = snapshot[i][w];
      const valWithout = snapshot[i - 1][w];
      if (val === valWithout) {
        // item i was not chosen
        seq.push({ i, w, chosen: false, itemIndex: i - 1 });
        i = i - 1;
      } else {
        // item i chosen
        seq.push({ i, w, chosen: true, itemIndex: i - 1 });
        chosen.add(i - 1);
        w = w - parsedItems[i - 1].weight;
        i = i - 1;
      }
    }

    // seq is in order from i=n down to i=1; stepping through seq[0], seq[1], ... simulates the backtracking
    setBacktrackSequence(seq);
    setBacktrackIndex(0);
    setChosenItemsSet(new Set());
  };

  const backtrackNext = () => {
    if (!dpComplete || backtrackIndex >= backtrackSequence.length) return;
    const step = backtrackSequence[backtrackIndex];
    if (step.chosen) {
      setChosenItemsSet((prev) => new Set([...Array.from(prev), step.itemIndex]));
    }
    setBacktrackIndex((s) => s + 1);
  };

  const backtrackPrev = () => {
    if (!dpComplete || backtrackIndex <= 0) return;
    const prevIndex = backtrackIndex - 1;
    const step = backtrackSequence[prevIndex];
    if (step.chosen) {
      setChosenItemsSet((prev) => {
        const copy = new Set(Array.from(prev));
        copy.delete(step.itemIndex);
        return copy;
      });
    }
    setBacktrackIndex(prevIndex);
  };

  // UI helpers for item manipulation
  const handleAddItem = () => setItems((s) => [...s, { name: "", value: "", weight: "" }]);
  const handleDeleteItem = (index) => setItems((s) => s.filter((_, i) => i !== index));
  const handleItemChange = (index, field, value) => {
    const copy = items.slice();
    copy[index] = { ...copy[index], [field]: value };
    setItems(copy);
  };

  // Some small inline styles for the DP table
  const styles = {
    table: {
      borderCollapse: "collapse",
      marginTop: 12,
      overflowX: "auto",
    },
    cell: {
      border: "1px solid #444",
      padding: "6px 8px",
      minWidth: 48,
      textAlign: "center",
      backgroundColor: "#fff",
      color: "#000",
    },
    headerCell: {
      border: "1px solid #555",
      padding: "6px 8px",
      backgroundColor: "#2b2b3d",
      color: "#fff",
      fontWeight: 700,
    },
  };

  // Highlighting helpers
  const currentFillCoords = fillStep < totalSteps ? stepToCoords(fillStep) : null;
  const currentBacktrackCoords = backtrackSequence[backtrackIndex] || null;

  return (
    <div className="container">
      <h1 className="title">Knapsack Problem — DP step visualizer</h1>

      <div className="section">
        <h2 className="label">Knapsack Capacity</h2>
        <input
          type="number"
          min="0"
          value={capacity}
          onChange={(e) => setCapacity(Number(e.target.value))}
          className="knapsackcapacity"
        />
      </div>

      <div className="section">
        <h2 className="subtitle">Items</h2>
        {items.length === 0 && <p className="empty">No items yet.</p>}
        <ul className="item-list">
          {items.map((item, index) => (
            <li key={index} className="item">
              <div className="item-grid">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => handleItemChange(index, "name", e.target.value)}
                  placeholder="Name"
                  className="input"
                />
                <input
                  type="number"
                  min="0"
                  value={item.value}
                  onChange={(e) => handleItemChange(index, "value", e.target.value)}
                  placeholder="Value"
                  className="input"
                />
                <input
                  type="number"
                  min="0"
                  value={item.weight}
                  onChange={(e) => handleItemChange(index, "weight", e.target.value)}
                  placeholder="Weight"
                  className="input"
                />
                <button onClick={() => handleDeleteItem(index)} className="delete">
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>

        <button onClick={handleAddItem} className="button" style={{ marginTop: 6 }}>
          Add Item
        </button>
      </div>

      <div className="section">
        <h2 className="subtitle">DP Table (step-by-step)</h2>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={initializeDP} className="button">
            Initialize DP
          </button>
          <button onClick={prevFillStep} className="button" disabled={fillStep <= 0}>
            ◀ Prev Fill
          </button>
          <button onClick={nextFillStep} className="button" disabled={fillStep >= totalSteps}>
            Next Fill ▶
          </button>

          <div style={{ marginLeft: 12 }}>
            Step: {fillStep} / {totalSteps}
          </div>

          <button
            onClick={() => {
              if (!dpComplete) {
                alert("Finish filling the table first (use Next Fill) before starting backtracking.");
                return;
              }
              startBacktrack();
            }}
            className="button"
            style={{ marginLeft: 12 }}
            disabled={!dpComplete}
          >
            Start Backtrack
          </button>

          <button onClick={backtrackPrev} className="button" disabled={backtrackIndex <= 0}>
            ◀ Prev BT
          </button>
          <button onClick={backtrackNext} className="button" disabled={!dpComplete || backtrackIndex >= backtrackSequence.length}>
            Next BT ▶
          </button>

          <div style={{ marginLeft: 12 }}>
            Backtrack: {Math.min(backtrackIndex, backtrackSequence.length)} / {backtrackSequence.length}
          </div>
        </div>

        {/* DP table rendering */}
        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.headerCell}>i\w</th>
                {Array.from({ length: W + 1 }, (_, w) => (
                  <th key={w} style={styles.headerCell}>
                    {w}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: n + 1 }, (_, i) => (
                <tr key={i}>
                  <td style={{ ...styles.headerCell, textAlign: "left" }}>{i === 0 ? "0 (no items)" : `${i} (${parsedItems[i - 1].name || "#"})`}</td>
                  {Array.from({ length: W + 1 }, (_, w) => {
                    const value = dp?.[i]?.[w] ?? 0;

                    // Determine styles for highlights
                    let bg = styles.cell.backgroundColor;
                    let color = styles.cell.color;
                    let fontWeight = 400;

                    // Highlight current fill cell
                    if (currentFillCoords && currentFillCoords.i === i && currentFillCoords.w === w) {
                      bg = "#ffd966"; // yellow
                    }

                    // If cell is already filled (i row <= filled rows) we make it slightly greenish
                    const filledUntil = Math.floor((fillStep - 1) / (W + 1)) + 1;
                    const isFilled = (() => {
                      if (fillStep === 0) return i === 0 && w === 0; // only base
                      const maxFilledRow = Math.floor((fillStep - 1) / (W + 1)) + 1; // last row index that has some cells filled
                      if (i < maxFilledRow) return true;
                      if (i === maxFilledRow) {
                        const lastCol = (fillStep - 1) % (W + 1);
                        return w <= lastCol;
                      }
                      return i === 0; // row 0 is always filled
                    })();

                    if (isFilled) {
                      bg = "#e6fff2"; // light green
                    }

                    // Highlight backtrack current cell
                    if (currentBacktrackCoords && currentBacktrackCoords.i === i && currentBacktrackCoords.w === w) {
                      bg = currentBacktrackCoords.chosen ? "#9be7ff" : "#ff9e9e"; // blue if chosen, red if skipped
                      fontWeight = 700;
                    }

                    // If the item corresponding to this row is chosen, highlight its row label later; here we style cells lightly
                    if (chosenItemsSet.has(i - 1) && i > 0) {
                      bg = "#d7f3d7"; // pale green
                      fontWeight = 700;
                    }

                    return (
                      <td
                        key={w}
                        style={{ ...styles.cell, backgroundColor: bg, color, fontWeight }}
                      >
                        {value}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 12 }}>
          <strong>Selected items so far (during backtrack):</strong>
          {chosenItemsSet.size === 0 ? (
            <span style={{ marginLeft: 8, color: "#aaa" }}>none</span>
          ) : (
            <span style={{ marginLeft: 8 }}>{Array.from(chosenItemsSet).map((idx) => parsedItems[idx].name || `#${idx}`).join(", ")}</span>
          )}
        </div>

        <div style={{ marginTop: 8 }}>
          <strong>Final optimal value (if filled):</strong>
          <span style={{ marginLeft: 8 }}>{dpComplete ? dp[n][W] : "(complete the fill to know)"}</span>
        </div>

      </div>

      <div style={{ height: 80 }} />
    </div>
  );
}
