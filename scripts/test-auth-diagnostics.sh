#!/bin/bash

# Azure AD Authentication Diagnostics Manual Test
# This script demonstrates the authentication flow with debug logging enabled

set -e

echo "========================================"
echo "Azure AD Auth Diagnostics Manual Test"
echo "========================================"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file. Please configure it with your Azure AD credentials."
    echo ""
fi

# Check if AUTH_DEBUG is set
if ! grep -q "^AUTH_DEBUG=true" .env; then
    echo "ℹ️  AUTH_DEBUG not enabled. Adding to .env..."
    echo "AUTH_DEBUG=true" >> .env
    echo "✅ AUTH_DEBUG enabled"
    echo ""
fi

echo "Current AUTH_DEBUG setting:"
grep "AUTH_DEBUG" .env || echo "AUTH_DEBUG=false (default)"
echo ""

echo "========================================"
echo "Test Scenarios"
echo "========================================"
echo ""
echo "This test will demonstrate:"
echo "  1. Trace ID generation"
echo "  2. Structured logging with sensitive data redaction"
echo "  3. Error messages with trace IDs"
echo "  4. Metrics tracking"
echo ""

# Create a simple test file
cat > /tmp/test-auth-diagnostics.ts << 'EOF'
import {
  generateTraceId,
  logAuthEvent,
  redactSensitiveData,
  formatUserError,
  incrementAuthMetric
} from './lib/auth/diagnostics';

console.log('='.repeat(50));
console.log('1. Trace ID Generation');
console.log('='.repeat(50));
const traceId = generateTraceId();
console.log('Generated Trace ID:', traceId);
console.log('');

console.log('='.repeat(50));
console.log('2. Structured Logging (with sensitive data)');
console.log('='.repeat(50));
logAuthEvent('info', 'Token exchange initiated', {
  traceId,
  provider: 'azure',
  step: 'token-exchange',
  metadata: {
    access_token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
    code: 'auth-code-abc123xyz789',
    email: 'user@example.com',
    redirectUri: 'https://www.greenchainz.com/login/callback'
  }
});
console.log('');

console.log('='.repeat(50));
console.log('3. Sensitive Data Redaction');
console.log('='.repeat(50));
const sensitiveData = {
  access_token: 'secret-token-12345',
  refresh_token: 'secret-refresh-67890',
  email: 'user@example.com',
  userId: '12345'
};
console.log('Original:', sensitiveData);
console.log('Redacted:', redactSensitiveData(sensitiveData));
console.log('');

console.log('='.repeat(50));
console.log('4. User-Facing Error Messages');
console.log('='.repeat(50));
const error = new Error('network connection failed');
const userError = formatUserError(error, traceId);
console.log('Technical Error:', error.message);
console.log('User Message:', userError.message);
console.log('Trace ID:', userError.traceId);
console.log('');

console.log('='.repeat(50));
console.log('5. Metrics Tracking');
console.log('='.repeat(50));
incrementAuthMetric('auth_attempt', 'azure', 'token-exchange');
incrementAuthMetric('auth_success', 'azure', 'callback');
console.log('Check console output above for [AUTH_METRIC] entries');
console.log('');

console.log('='.repeat(50));
console.log('6. Error Logging (always logged)');
console.log('='.repeat(50));
logAuthEvent('error', 'Token exchange failed', {
  traceId,
  provider: 'azure',
  step: 'token-rejected',
  statusCode: 401,
  error: new Error('invalid_grant'),
  metadata: {
    error: 'invalid_grant',
    errorDescription: 'AADSTS54005: OAuth2 Authorization code was already redeemed'
  }
});
console.log('');

console.log('✅ All tests completed successfully!');
console.log('');
console.log('Next Steps:');
console.log('  1. Enable AUTH_DEBUG=true in your .env');
console.log('  2. Start the dev server: npm run dev');
console.log('  3. Attempt Azure AD login');
console.log('  4. Check terminal for [AUTH] log entries');
console.log('  5. If auth fails, copy the Trace ID from error message');
console.log('  6. Search logs for that Trace ID to see full flow');
EOF

echo "Running diagnostic tests..."
echo ""

# Run the test with tsx
npx tsx /tmp/test-auth-diagnostics.ts

echo ""
echo "========================================"
echo "Manual Testing Instructions"
echo "========================================"
echo ""
echo "To test the full authentication flow:"
echo ""
echo "1. Ensure Azure AD credentials are configured in .env:"
echo "   - AZURE_CLIENT_ID"
echo "   - AZURE_CLIENT_SECRET"
echo "   - AZURE_TENANT_ID"
echo ""
echo "2. Start the development server:"
echo "   $ npm run dev"
echo ""
echo "3. Navigate to http://localhost:3000/login"
echo ""
echo "4. Click 'Sign in with Microsoft'"
echo ""
echo "5. Complete Azure AD authentication"
echo ""
echo "6. Observe logs in terminal:"
echo "   - Look for [AUTH] entries with trace IDs"
echo "   - Each step of the flow is logged"
echo "   - Sensitive data is automatically redacted"
echo ""
echo "7. If authentication fails:"
echo "   - Copy the Trace ID from the error message"
echo "   - Search terminal logs for that Trace ID"
echo "   - All related log entries will have the same ID"
echo ""
echo "8. To disable debug logging:"
echo "   - Set AUTH_DEBUG=false in .env"
echo "   - Restart dev server"
echo "   - Only errors will be logged"
echo ""
echo "========================================"
echo "Documentation"
echo "========================================"
echo ""
echo "For more information, see:"
echo "  - docs/auth-debugging.md"
echo "  - .env.example (AUTH_DEBUG variable)"
echo ""
echo "✅ Test setup complete!"
