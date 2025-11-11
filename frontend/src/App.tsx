import SupplierProfile from './components/SupplierProfile';
import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-neutral-light">
      <header className="bg-green-primary text-white py-6 shadow-lg">
        <div className="max-w-6xl mx-auto px-6">
          <h1 className="text-3xl font-bold">GreenChainz B2B Platform</h1>
          <p className="text-green-light mt-1">Global Trust Layer for Sustainable Commerce</p>
        </div>
      </header>

      <main className="py-8">
        <SupplierProfile supplierId={1} />
      </main>

      <footer className="bg-neutral-dark text-neutral-light py-4 mt-12">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm">
          © 2025 GreenChainz - Verified Sustainable Sourcing Platform
        </div>
      </footer>
    </div>
  );
}

export default App

