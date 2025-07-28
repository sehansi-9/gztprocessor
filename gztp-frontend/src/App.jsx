import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [stateData, setStateData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('http://localhost:8000/mindep/state/latest')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch state')
        return res.json()
      })
      .then((data) => {
        setStateData(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return (
    <>
      <h1>Latest MinDep State</h1>
      <div className="card">
        {loading && <p>Loading...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {stateData && !stateData.error && (
          <div>
            <p><strong>Gazette:</strong> {stateData.gazette_number}</p>
            <p><strong>Date:</strong> {stateData.date}</p>
            <h3>State:</h3>
            <pre style={{ textAlign: 'left', background: '#f5f5f5', padding: '1em' }}>
              {JSON.stringify(stateData.state, null, 2)}
            </pre>
          </div>
        )}
        {stateData?.error && (
          <p style={{ color: 'orange' }}>⚠️ {stateData.error}</p>
        )}
      </div>
    </>
  )
}

export default App
