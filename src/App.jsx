import React, { useState } from "react";
import "./App.css";

export default function KnapsackInput() {
  const [capacity, setCapacity] = useState("");
  const [items, setItems] = useState([]);

  const handleAddItem = () => {
    setItems([...items, { name: "", value: "", weight: "" }]);
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index][field] = value;
    setItems(updatedItems);
  };

  const handleDeleteItem = (index) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
  };

  return (
    <div className="container">
      <h1 className="title">Knapsack Problem Setup</h1>

      {/* Knapsack Capacity */}
      <div className="section">
        <h2 className="label">Knapsack Capacity</h2>
        <input
          type="number"
          min="1"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          className="knapsackcapacity"
          placeholder="Enter capacity"
        />
      </div>

      {/* Items List */}
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
                  min="1"
                  value={item.value}
                  onChange={(e) => handleItemChange(index, "value", e.target.value)}
                  placeholder="Value"
                  className="input"
                />
                <input
                  type="number"
                  min="1"
                  value={item.weight}
                  onChange={(e) => handleItemChange(index, "weight", e.target.value)}
                  placeholder="Weight"
                  className="input"
                />
                <button
                  onClick={() => handleDeleteItem(index)}
                  className="delete"
                >
                  Delete Item
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Add Item Button */}
      <button onClick={handleAddItem} className="button">
        Add Item
      </button>
    </div>
  );
}
