import { useEffect, useState } from 'react'
import plotly from 'plotly.js-dist-min'
import './App.css'
import { validStocks } from './valid_stocks'

function App() {
  const [rows, setRows] = useState([{ symbol: '', date: '', value: '', isEditable: true }])
  const [activeTab, setActiveTab] = useState('portfolio')
  const [tickers, setTickers] = useState<string[]>([])
  const [contributions, setContributions] = useState<number[]>([])
  const [histogramData, setHistogramData] = useState<{ x: number[], y: number[] }>({ x: [], y: [] })

  const handleInputChange = (index: number, field: 'symbol' | 'date' | 'value', value: string) => {
    const updatedRows = [...rows]
    updatedRows[index][field] = value
    setRows(updatedRows)
  }

  const handleValidation = (index: number, field: 'symbol' | 'date' | 'value') => {
    const row = rows[index]
    const value = row[field]

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

  const createPieChart = () => {
    if (tickers.length === 0 || contributions.length === 0) {
      alert('No data available to generate the pie chart.')
      return
    }

    const data = [
      {
        values: contributions,
        labels: tickers,
        type: 'pie' as const,
      },
    ]

    const layout = {
      title: 'Risk Contribution by Asset',
      height: 400,
      width: 500,
    }

    plotly.newPlot('myDiv', data, layout)
  }

  const createHistogram = () => {
    if (histogramData.x.length === 0 || histogramData.y.length === 0) {
      alert('No histogram data available.')
      return
    }

    const trace = {
      x: histogramData.x,
      y: histogramData.y,
      type: 'bar' as const,
    }

    const layout = {
      title: 'Simulated Portfolio Return Distribution',
      xaxis: { title: 'Return Bins' },
      yaxis: { title: 'Frequency' },
    }

    plotly.newPlot('myDiv', [trace], layout)
  }

  const saveTableData = async () => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!validStocks.includes(row.symbol.toUpperCase())) {
        alert(`Row ${i + 1}: Invalid stock symbol.`)
        return
      }

      const inputDate = new Date(row.date)
      const minDate = new Date('2010-01-01')
      const today = new Date('2025-04-13')
      if (inputDate < minDate || inputDate > today) {
        alert(`Row ${i + 1}: Invalid date.`)
        return
      }

      if (isNaN(Number(row.value)) || Number(row.value) <= 0) {
        alert(`Row ${i + 1}: Invalid value.`)
        return
      }
    }

    try {
      const response = await fetch('http://127.0.0.1:5000/save-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rows),
      })

      const result = await response.json()
      console.log('Backend response:', result)
      alert('Table data saved successfully!')
    } catch (error) {
      console.error('Error saving table data:', error)
      alert('Failed to save table data.')
    }
  }

  useEffect(() => {
    if (activeTab === 'graphs') {
      fetch('http://127.0.0.1:5000/get-risk-contributions')
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            alert(`Backend error: ${data.error}`)
          } else {
            console.log("Fetched data:", data)
            setTickers(data.tickers || [])
            setContributions(data.contributions || [])
            setHistogramData(data.histogram || { x: [], y: [] })
          }
        })
        .catch(err => {
          alert('Error connecting to backend for risk data.')
          console.error(err)
        })
    }
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'graphs' && tickers.length > 0 && contributions.length > 0) {
      createPieChart()
    }
  }, [activeTab, tickers, contributions])

  useEffect(() => {
    if (activeTab === 'graphs' && histogramData.x.length > 0) {
      createHistogram()
    }
  }, [activeTab, histogramData])

  return (
    <>
      <h1>Portalyzer</h1>

      <div className="tabs">
        <button className={activeTab === 'portfolio' ? 'active' : ''} onClick={() => setActiveTab('portfolio')}>Portfolio</button>
        <button className={activeTab === 'graphs' ? 'active' : ''} onClick={() => setActiveTab('graphs')}>Graphs</button>
      </div>

      <div className="tab-content">
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
                        onChange={(e) => handleInputChange(index, 'symbol', e.target.value)}
                        onBlur={() => handleValidation(index, 'symbol')}
                        disabled={!row.isEditable}
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        value={row.date}
                        onChange={(e) => handleInputChange(index, 'date', e.target.value)}
                        onBlur={() => handleValidation(index, 'date')}
                        disabled={!row.isEditable}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.value}
                        onChange={(e) => handleInputChange(index, 'value', e.target.value)}
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
            <div id="myDiv" style={{ marginBottom: '20px' }}></div>
            <button onClick={createPieChart}>Generate Pie Chart</button>
            <button onClick={createHistogram}>Generate Histogram</button>
          </div>
        )}
      </div>
    </>
  )
}

export default App
