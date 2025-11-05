import './SupplierCard.css'

function SupplierCard({ supplier }) {
  const getRatingColor = (rating) => {
    if (rating >= 90) return '#28a745'
    if (rating >= 75) return '#7fb069'
    if (rating >= 60) return '#ffc107'
    return '#dc3545'
  }

  return (
    <div className="supplier-card">
      <div className="card-header">
        <h3 className="supplier-name">{supplier.name}</h3>
        {supplier.verified && (
          <span className="verified-badge" title="Verified Supplier">
            ✓ Verified
          </span>
        )}
      </div>
      
      <div className="supplier-info">
        <div className="info-row">
          <span className="label">Contact:</span>
          <span className="value">{supplier.contact_person}</span>
        </div>
        <div className="info-row">
          <span className="label">Email:</span>
          <span className="value">{supplier.email}</span>
        </div>
        <div className="info-row">
          <span className="label">Phone:</span>
          <span className="value">{supplier.phone}</span>
        </div>
        <div className="info-row">
          <span className="label">Country:</span>
          <span className="value">{supplier.country}</span>
        </div>
      </div>

      <div className="sustainability-rating">
        <div className="rating-header">
          <span className="rating-label">Sustainability Rating</span>
          <span 
            className="rating-value" 
            style={{ color: getRatingColor(supplier.sustainability_rating) }}
          >
            {supplier.sustainability_rating}%
          </span>
        </div>
        <div className="rating-bar">
          <div 
            className="rating-fill" 
            style={{ 
              width: `${supplier.sustainability_rating}%`,
              backgroundColor: getRatingColor(supplier.sustainability_rating)
            }}
          />
        </div>
      </div>

      <button className="contact-button">Contact Supplier</button>
    </div>
  )
}

export default SupplierCard
