import { useState, useEffect } from 'react'
import axios from 'axios'
import Header from './components/Header'
import SupplierList from './components/SupplierList'
import Hero from './components/Hero'
import './App.css'

function App() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [healthStatus, setHealthStatus] = useState(null)

  useEffect(() => {
    fetchHealthStatus()
    fetchSuppliers()
  }, [])

  const fetchHealthStatus = async () => {
    try {
      const response = await axios.get('/health')
      setHealthStatus(response.data)
    } catch (err) {
      console.error('Health check failed:', err)
    }
  }

  const fetchSuppliers = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/suppliers')
      setSuppliers(response.data.suppliers || [])
      setError(null)
    } catch (err) {
      setError('Failed to fetch suppliers. Please try again later.')
      console.error('Error fetching suppliers:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <Header healthStatus={healthStatus} />
      <Hero />
      <main className="container main-content">
        <section className="suppliers-section">
          <h2>Our Verified Sustainable Suppliers</h2>
          <p className="section-description">
            Browse our curated network of verified sustainable suppliers committed to environmental responsibility.
          </p>
          {loading ? (
            <div className="loading">Loading suppliers...</div>
          ) : error ? (
            <div className="error">{error}</div>
          ) : (
            <SupplierList suppliers={suppliers} />
          )}
        </section>
      </main>
      <footer className="footer">
        <div className="container">
          <p>&copy; 2025 GreenChainz. Global Trust Layer for Sustainable Commerce.</p>
        </div>
      </footer>
    </div>
  )
}

export default App
