"use client"

import { useMemo, useState } from "react"
import "./fractional-knapsack.css"

type Item = {
  name: string
  value: number | string
  weight: number | string
}

type ParsedItem = {
  name: string
  value: number
  weight: number
}

type PlannedStep = {
  idx: number
  name: string
  value: number
  weight: number
  ratio: number
  fraction: number
  takenWeight: number
  takenValue: number
}

function clampNonNegative(n: number) {
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

export default function FractionalKnapsack() {
  const [capacity, setCapacity] = useState<number>(10)
  const [items, setItems] = useState<Item[]>([
    { name: "A", value: 6, weight: 2 },
    { name: "B", value: 10, weight: 4 },
    { name: "C", value: 12, weight: 6 },
  ])

  // Greedy progression index (0..totalSteps)
  const [stepIndex, setStepIndex] = useState<number>(0)

  const parsedItems = useMemo<ParsedItem[]>(
    () =>
      items.map((it) => ({
        name: (it.name ?? "").toString(),
        value: clampNonNegative(Number(it.value) || 0),
        weight: clampNonNegative(Number(it.weight) || 0),
      })),
    [items],
  )

  const W = clampNonNegative(Number(capacity) || 0)

  const { plan, totalSteps } = useMemo(() => {
    const withRatio = parsedItems
      .map((it, idx) => ({
        ...it,
        idx,
        ratio: it.weight > 0 ? it.value / it.weight : 0,
      }))
      .sort((a, b) => b.ratio - a.ratio)

    let remaining = W
    const steps: PlannedStep[] = withRatio.map((it) => {
      if (remaining <= 0 || it.weight <= 0) {
        return {
          idx: it.idx,
          name: it.name,
          value: it.value,
          weight: it.weight,
          ratio: it.ratio,
          fraction: 0,
          takenWeight: 0,
          takenValue: 0,
        }
      }
      if (remaining >= it.weight) {
        remaining -= it.weight
        return {
          idx: it.idx,
          name: it.name,
          value: it.value,
          weight: it.weight,
          ratio: it.ratio,
          fraction: it.weight > 0 ? 1 : 0,
          takenWeight: it.weight,
          takenValue: it.value,
        }
      } else {
        const fraction = it.weight > 0 ? remaining / it.weight : 0
        const takenValue = it.value * fraction
        const takenWeight = remaining
        remaining = 0
        return {
          idx: it.idx,
          name: it.name,
          value: it.value,
          weight: it.weight,
          ratio: it.ratio,
          fraction,
          takenWeight,
          takenValue,
        }
      }
    })

    const lastIndex = Math.max(
      -1,
      steps.findLastIndex((s) => s.fraction > 0),
    )
    const total = Math.max(0, lastIndex + 1)

    return { plan: steps, totalSteps: total }
  }, [parsedItems, W])

  const current = useMemo(() => {
    const applied = plan.slice(0, stepIndex)
    const totalValue = applied.reduce((acc, s) => acc + s.takenValue, 0)
    const usedWeight = applied.reduce((acc, s) => acc + s.takenWeight, 0)
    const remaining = Math.max(0, W - usedWeight)
    return { totalValue, usedWeight, remaining }
  }, [plan, stepIndex, W])

  const initialize = () => setStepIndex(0)
  const next = () => stepIndex < totalSteps && setStepIndex((s) => s + 1)
  const prev = () => stepIndex > 0 && setStepIndex((s) => s - 1)

  // Item editing
  const handleAddItem = () => setItems((s) => [...s, { name: "", value: "", weight: "" }])
  const handleDeleteItem = (index: number) => setItems((s) => s.filter((_, i) => i !== index))
  const handleItemChange = (index: number, field: keyof Item, value: string) => {
    const copy = items.slice()
    copy[index] = { ...copy[index], [field]: value }
    setItems(copy)
    setStepIndex(0)
  }

  // Current row for highlight
  const currentRow = totalSteps > 0 ? Math.min(stepIndex, Math.max(0, totalSteps - 1)) : -1

  return (
    <div className="container">
      <h1 className="title">Fractional Knapsack — Greedy Step Visualizer</h1>

      {/* Capacity */}
      <div className="section">
        <h2 className="subtitle">Knapsack Capacity</h2>
        <input
          type="number"
          min="0"
          value={capacity}
          onChange={(e) => {
            const v = Number(e.target.value)
            setCapacity(Number.isFinite(v) ? v : 0)
            setStepIndex(0)
          }}
          className="knapsackcapacity"
        />
      </div>

      {/* Items editor */}
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

      {/* Controls */}
      <div className="section">
        <h2 className="subtitle">Greedy Steps</h2>

        <div className="controls">
          <button onClick={initialize} className="button">
            Initialize
          </button>
          <button onClick={prev} className="button" disabled={stepIndex <= 0}>
            ◀ Prev
          </button>
          <button onClick={next} className="button" disabled={stepIndex >= totalSteps}>
            Next ▶
          </button>

          <div className="step-counter">
            Step: {stepIndex} / {totalSteps}
          </div>

          <div className="step-counter">
            Used: {current.usedWeight.toFixed(2)} / {W.toFixed(2)}
          </div>
          <div className="step-counter">Remaining: {current.remaining.toFixed(2)}</div>
          <div className="step-counter">Total Value: {current.totalValue.toFixed(2)}</div>
        </div>
      </div>

      {/* Greedy order table */}
      <div className="section">
        <h2 className="subtitle">Greedy Order (by value/weight)</h2>

        <div className="table-container">
          <table className="dp-table">
            <thead>
              <tr>
                <th className="header-cell">#</th>
                <th className="header-cell">Name</th>
                <th className="header-cell">Value</th>
                <th className="header-cell">Weight</th>
                <th className="header-cell">Ratio</th>
                <th className="header-cell">Taken Fraction</th>
                <th className="header-cell">Taken Weight</th>
                <th className="header-cell">Taken Value</th>
              </tr>
            </thead>
            <tbody>
              {plan.map((s, i) => {
                const isApplied = i < stepIndex && s.fraction > 0
                const isCurrent = i === currentRow && totalSteps > 0

                const rowClass = isCurrent ? " current-fill" : isApplied ? " chosen" : ""

                return (
                  <tr key={`${s.idx}-${i}`}>
                    <td className={`cell${rowClass}`}>{i + 1}</td>
                    <td className={`cell${rowClass}`}>{s.name || "-"}</td>
                    <td className={`cell${rowClass}`}>{s.value.toFixed(2)}</td>
                    <td className={`cell${rowClass}`}>{s.weight.toFixed(2)}</td>
                    <td className={`cell${rowClass}`}>{Number.isFinite(s.ratio) ? s.ratio.toFixed(3) : "—"}</td>
                    <td className={`cell${rowClass}`}>{s.fraction > 0 ? s.fraction.toFixed(3) : "0"}</td>
                    <td className={`cell${rowClass}`}>{s.takenWeight.toFixed(2)}</td>
                    <td className={`cell${rowClass}`}>{s.takenValue.toFixed(2)}</td>
                  </tr>
                )
              })}
              {plan.length === 0 && (
                <tr>
                  <td className="cell" colSpan={8}>
                    Add items to see the greedy order.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
