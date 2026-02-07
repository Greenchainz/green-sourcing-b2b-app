// middleware/parseAuth.js
function parseAuth(req, res, next) {
  const clientPrincipal = req.headers['x-ms-client-principal'];
  
  if (!clientPrincipal) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const decoded = Buffer.from(clientPrincipal, 'base64').toString('utf-8');
    req.user = JSON.parse(decoded);
    
    // Now req.user contains:
    // - userId
    // - userDetails (email)
    // - identityProvider ('aad')
    // - userRoles (array)
    
    next();
  } catch (error) {
    console.error('Auth parsing error:', error);
    return res.status(401).json({ error: 'Invalid auth token' });
  }
}

module.exports = { parseAuth };
