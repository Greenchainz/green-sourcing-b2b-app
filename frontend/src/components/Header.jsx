import './Header.css'

function Header({ healthStatus }) {
  return (
    <header className="header">
      <div className="container header-content">
        <div className="logo">
          <h1>🌱 GreenChainz</h1>
        </div>
        <nav className="nav">
          <a href="#suppliers">Suppliers</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </nav>
        {healthStatus && (
          <div className="health-status">
            <span className={`status-indicator ${healthStatus.ok ? 'ok' : 'error'}`}>
              {healthStatus.ok ? '●' : '○'}
            </span>
            <span className="status-text">
              {healthStatus.database === 'connected' ? 'System Online' : 'System Offline'}
            </span>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header
