import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [rows, setRows] = useState([{ symbol: '', date: '', value: '' }])

  const handleInputChange = (index: number, field: string, value: string) => {
    const updatedRows = [...rows]
    updatedRows[index][field as keyof typeof updatedRows[number]] = value
    setRows(updatedRows)
  }

  const addRow = () => {
    setRows([...rows, { symbol: '', date: '', value: '' }])
  }


  return (
    <>
      <div>
        
      </div>
      <h1>Stock Portfolio</h1>
      <div>
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Purchase Date</th>
              <th>Value of Purchase</th>
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
                  />
                </td>
                <td>
                  <input
                    type="date"
                    value={row.date}
                    onChange={(e) =>
                      handleInputChange(index, 'date', e.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={row.value}
                    onChange={(e) =>
                      handleInputChange(index, 'value', e.target.value)
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={addRow}>Add Row</button>
      </div>
    </>
  )
}

export default App
