import './Hero.css'

function Hero() {
  return (
    <section className="hero">
      <div className="container hero-content">
        <h1 className="hero-title">Global Trust Layer for Sustainable Commerce</h1>
        <p className="hero-subtitle">
          Connect with verified sustainable suppliers and build a responsible supply chain
        </p>
        <div className="hero-stats">
          <div className="stat">
            <h3>500+</h3>
            <p>Verified Suppliers</p>
          </div>
          <div className="stat">
            <h3>95%</h3>
            <p>Sustainability Rating</p>
          </div>
          <div className="stat">
            <h3>50+</h3>
            <p>Countries</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
