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
  const [dpHistory, setDpHistory] = useState([]);
  const [fillStep, setFillStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [dpComplete, setDpComplete] = useState(false);

  const [backtrackSequence, setBacktrackSequence] = useState([]);
  const [backtrackIndex, setBacktrackIndex] = useState(0);
  const [chosenItemsSet, setChosenItemsSet] = useState(new Set());

  const parsedItems = useMemo(() => {
    return items.map((it) => ({
      name: it.name || "",
      value: Number(it.value) || 0,
      weight: Number(it.weight) || 0,
    }));
  }, [items]);

  const n = parsedItems.length;
  const W = Math.max(0, Number(capacity) || 0);

  const cloneDp = (arr) => arr.map((r) => r.slice());

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

  useEffect(() => {
    initializeDP();
  }, [n, W]);

  const stepToCoords = (stepIndex) => {
    if (stepIndex < 0) return null;
    const row = Math.floor(stepIndex / (W + 1)) + 1;
    const col = stepIndex % (W + 1);
    return { i: row, w: col };
  };

  const nextFillStep = () => {
    if (fillStep >= totalSteps) return;
    const stepIndex = fillStep;
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

    const newHistory = dpHistory.slice(0, fillStep + 1);
    newHistory.push(cloneDp(newDp));

    setDp(newDp);
    setDpHistory(newHistory);
    setFillStep((s) => s + 1);

    if (fillStep + 1 === totalSteps) {
      setDpComplete(true);
    }
  };

  const prevFillStep = () => {
    if (fillStep <= 0) return;
    const newIndex = fillStep - 1;
    const snapshot = dpHistory[newIndex];
    setDp(cloneDp(snapshot));
    setDpHistory(dpHistory.slice(0, newIndex + 1));
    setFillStep(newIndex);
    setDpComplete(false);
  };

  const startBacktrack = () => {
    if (!dpComplete) return;
    const snapshot = dp;
    let i = n;
    let w = W;
    const seq = [];
    const chosen = new Set();

    while (i > 0) {
      const val = snapshot[i][w];
      const valWithout = snapshot[i - 1][w];
      if (val === valWithout) {
        seq.push({ i, w, chosen: false, itemIndex: i - 1 });
        i = i - 1;
      } else {
        seq.push({ i, w, chosen: true, itemIndex: i - 1 });
        chosen.add(i - 1);
        w = w - parsedItems[i - 1].weight;
        i = i - 1;
      }
    }

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

  const handleAddItem = () =>
    setItems((s) => [...s, { name: "", value: "", weight: "" }]);
  const handleDeleteItem = (index) =>
    setItems((s) => s.filter((_, i) => i !== index));
  const handleItemChange = (index, field, value) => {
    const copy = items.slice();
    copy[index] = { ...copy[index], [field]: value };
    setItems(copy);
  };

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
        <h2 className="subtitle">DP Table</h2>

        <div className="controls">
          <button onClick={initializeDP} className="button">
            Initialize DP
          </button>
          <button onClick={prevFillStep} className="button" disabled={fillStep <= 0}>
            ◀ Prev Fill
          </button>
          <button onClick={nextFillStep} className="button" disabled={fillStep >= totalSteps}>
            Next Fill ▶
          </button>

          <div className="step-counter">
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
            disabled={!dpComplete}
          >
            Start Backtrack
          </button>

          <button onClick={backtrackPrev} className="button" disabled={backtrackIndex <= 0}>
            ◀ Prev
          </button>
          <button
            onClick={backtrackNext}
            className="button"
            disabled={!dpComplete || backtrackIndex >= backtrackSequence.length}
          >
            Next ▶
          </button>

          <div className="step-counter">
            Backtrack: {Math.min(backtrackIndex, backtrackSequence.length)} /{" "}
            {backtrackSequence.length}
          </div>
        </div>

        {/* DP table */}
        <div className="table-container">
          <table className="dp-table">
            <thead>
              <tr>
                <th className="header-cell">i\w</th>
                {Array.from({ length: W + 1 }, (_, w) => (
                  <th key={w} className="header-cell">
                    {w}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: n + 1 }, (_, i) => (
                <tr key={i}>
                  <td className="header-cell left-label">
                    {i === 0 ? "0 (no items)" : `${i} (${parsedItems[i - 1].name || "#"})`}
                  </td>
                  {Array.from({ length: W + 1 }, (_, w) => {
                    const value = dp?.[i]?.[w] ?? 0;

                    let className = "cell";
                    if (currentFillCoords && currentFillCoords.i === i && currentFillCoords.w === w) {
                      className += " current-fill";
                    }

                    const isFilled = (() => {
                      if (fillStep === 0) return i === 0 && w === 0;
                      const maxFilledRow = Math.floor((fillStep - 1) / (W + 1)) + 1;
                      if (i < maxFilledRow) return true;
                      if (i === maxFilledRow) {
                        const lastCol = (fillStep - 1) % (W + 1);
                        return w <= lastCol;
                      }
                      return i === 0;
                    })();

                    if (isFilled) className += " filled";

                    if (currentBacktrackCoords && currentBacktrackCoords.i === i && currentBacktrackCoords.w === w) {
                      className += currentBacktrackCoords.chosen ? " chosen" : " skipped";
                    }

                    if (chosenItemsSet.has(i - 1) && i > 0) {
                      className += " selected";
                    }

                    return (
                      <td key={w} className={className}>
                        {value}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
