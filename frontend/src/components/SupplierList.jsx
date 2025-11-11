import SupplierCard from './SupplierCard'
import './SupplierList.css'

function SupplierList({ suppliers }) {
  if (!suppliers || suppliers.length === 0) {
    return (
      <div className="no-suppliers">
        <p>No suppliers available at the moment.</p>
      </div>
    )
  }

  return (
    <div className="supplier-grid">
      {suppliers.map((supplier) => (
        <SupplierCard key={supplier.id} supplier={supplier} />
      ))}
    </div>
  )
}

export default SupplierList
