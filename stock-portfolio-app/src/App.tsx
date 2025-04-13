import { useEffect } from 'react'
import { useState } from 'react'
import plotly from 'plotly.js-dist-min'
import './App.css'
import plotly from 'react-plotly.js'
import { validStocks } from './valid_stocks'

function App() {
  const [rows, setRows] = useState([{ symbol: '', date: '', value: '', isEditable: true }])
  const [activeTab, setActiveTab] = useState('portfolio');
  const [tickers, setTickers] = useState<string[]>([]);
  const [contributions, setContributions] = useState<number[]>([]);

  const handleInputChange = (index: number, field: 'symbol' | 'date' | 'value', value: string) => {
    const updatedRows = [...rows]
    updatedRows[index][field] = value
    setRows(updatedRows)
  }

  const handleValidation = (index: number, field: 'symbol' | 'date' | 'value') => {
    const row = rows[index]
    const value = row[field]

    // Validation logic
    if (field === 'symbol') {
      if (!validStocks.includes(value.toUpperCase())) {
        alert('Invalid stock symbol. Please enter a valid S&P 500 stock symbol.')
        return
      }
    } else if (field === 'date') {
      const inputDate = new Date(value)
      const minDate = new Date('2010-01-01')
      const today = new Date('2025-04-13')
      if (inputDate < minDate || inputDate > today) {
        alert('Invalid date. Please enter a date after 2010 and not in the future.')
        return
      }
    } else if (field === 'value') {
      if (isNaN(Number(value)) || Number(value) <= 0) {
        alert('Invalid value. Please enter a positive number.')
        return
      }
    }
  }

  const addRow = () => {
    setRows([...rows, { symbol: '', date: '', value: '', isEditable: true }])
  }

  const removeRow = (index: number) => {
    const updatedRows = rows.filter((_, rowIndex) => rowIndex !== index)
    setRows(updatedRows)
  }

  const toggleEdit = (index: number) => {
    const updatedRows = [...rows]
    updatedRows[index].isEditable = !updatedRows[index].isEditable
    setRows(updatedRows)
  }

  function createPieChart() {
    // sample data for the pie chart

    var data = [{
      values: [19, 26, 55],
      labels: ['Residential', 'Non-Residential', 'Utility'],
      type: "pie" as const
    }];
    
    var layout = {
      height: 400,
      width: 500
    };
    
    plotly.newPlot('myDiv', data, layout);
  }

  function createHistogram(){
    var x = [];
    for (var i = 0; i < 500; i ++) {
	    x[i] = Math.random();
    }

    var trace = {
    x: x,
    type: 'histogram' as const,
    };
    var data = [trace];
    plotly.newPlot('myDiv', data);
  }
  const saveTableData = async () => {
    // Validate all rows before saving
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
  
      // Validate stock symbol
      if (!validStocks.includes(row.symbol.toUpperCase())) {
        alert(`Row ${i + 1}: Invalid stock symbol. Please enter a valid S&P 500 stock symbol.`)
        return
      }
  
      // Validate purchase date
      const inputDate = new Date(row.date)
      const minDate = new Date('2010-01-01')
      const today = new Date('2025-04-13')
      if (inputDate < minDate || inputDate > today) {
        alert(`Row ${i + 1}: Invalid date. Please enter a date after 2010 and not in the future.`)
        return
      }
  
      // Validate value of purchase
      if (isNaN(Number(row.value)) || Number(row.value) <= 0) {
        alert(`Row ${i + 1}: Invalid value. Please enter a positive number.`)
        return
      }
    }
    // If all rows are valid, proceed to save the data
    try {
      const response = await fetch('http://127.0.0.1:5000/save-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rows), // Send the table data
      })
      const result = await response.json()
      console.log('Response from backend:', result)
      alert('Table data saved successfully!')
    } catch (error) {
      console.error('Error sending data to backend:', error)
      alert('Failed to save table data. Please try again.')
    }
  }
 
 
  return (
    <>
      <h1>Portalyzer</h1>
      {/* Tab Navigation */}
      <div className="tabs">
        <button
          className={activeTab === 'portfolio' ? 'active' : ''}
          onClick={() => setActiveTab('portfolio')}
        >
          Portfolio
        </button>
        <button
          className={activeTab === 'graphs' ? 'active' : ''}
          onClick={() => setActiveTab('graphs')}
        >
          Graphs
        </button>
      </div>
      <div className = "tab-content">
        {activeTab === 'portfolio' && (
        <>
          <table>
            <thead>
              <tr>
                <th>Stock</th>
                <th>Purchase Date</th>
                <th>Value of Purchase</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index}>
                  <td>
                    <input
                      type="text"
                      value={row.symbol}
                      onChange={(e) =>
                        handleInputChange(index, 'symbol', e.target.value)
                      }
                      onBlur={() => handleValidation(index, 'symbol')}
                      disabled={!row.isEditable}
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) =>
                        handleInputChange(index, 'date', e.target.value)
                      }
                      onBlur={() => handleValidation(index, 'date')}
                      disabled={!row.isEditable}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={row.value}
                      onChange={(e) =>
                        handleInputChange(index, 'value', e.target.value)
                      }
                      onBlur={() => handleValidation(index, 'value')}
                      disabled={!row.isEditable}
                    />
                  </td>
                  <td>
                    {row.isEditable ? (
                      <button onClick={() => toggleEdit(index)}>Save</button>
                    ) : (
                      <button onClick={() => toggleEdit(index)}>Edit</button>
                    )}
                    <button onClick={() => removeRow(index)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={addRow}>Add Row</button>
          <button onClick={saveTableData}>Save Table Data</button>
        </>
      )}
      {activeTab === 'graphs' && (
        <div className="graphs">
          <h2>Graphs</h2>
          <p>Neat simulations are made here.</p>
          <div id="myDiv"></div>
          <button onClick={createPieChart}>Generate Pie Chart</button>
        </div>
      )}
    </div>
  </>
  )
}
export default App;


