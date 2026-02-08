export default function LoginPage() {
  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h1>Login</h1>
      <a href="/.auth/login/aad" style={{ 
        padding: '10px 20px', 
        background: '#0070f3', 
        color: 'white', 
        textDecoration: 'none',
        borderRadius: '5px',
        display: 'inline-block'
      }}>
        Sign in with Microsoft
      </a>
    </div>
  );
}
