import { useState } from 'react'
import './App.css'

function App() {
  const [rows, setRows] = useState([{ symbol: '', date: '', value: '', isEditable: true }])
  const [activeTab, setActiveTab] = useState('portfolio');

  const handleInputChange = (index: number, field: 'symbol' | 'date' | 'value', value: string) => {
    const updatedRows = [...rows]
    updatedRows[index][field] = value
    setRows(updatedRows)
  }

  const addRow = () => {
    setRows([...rows, { symbol: '', date: '', value: '', isEditable: true }])
  }

  const toggleEdit = (index: number) => {
    const updatedRows = [...rows]
    updatedRows[index].isEditable = !updatedRows[index].isEditable
    setRows(updatedRows)
  }

  const saveTableData = async () => {
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
    } catch (error) {
      console.error('Error sending data to backend:', error)
    }
  }

  return (
    <>
      <h1>Stock Portfolio App</h1>
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
                      disabled={!row.isEditable}
                    />
                  </td>
                  <td>
                    {row.isEditable ? (
                      <button onClick={() => toggleEdit(index)}>Save</button>
                    ) : (
                      <button onClick={() => toggleEdit(index)}>Edit</button>
                    )}
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
        </div>
      )}
    </div>
  </>
  )
}
export default App;