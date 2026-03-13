import { useState } from 'react';
import { api } from '../lib/api-client';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

export default function ApiTest() {
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.checkHealth();
      setHealthStatus(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Backend API Test</h1>
      
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Health Check</h2>
        
        <Button onClick={testHealth} disabled={loading}>
          {loading ? 'Testing...' : 'Test Backend Connection'}
        </Button>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
            <p className="text-red-800 font-semibold">Error:</p>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {healthStatus && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
            <p className="text-green-800 font-semibold">Backend Status:</p>
            <pre className="mt-2 text-sm text-green-700">
              {JSON.stringify(healthStatus, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <p className="text-blue-800 font-semibold">Backend URL:</p>
          <p className="text-blue-600 text-sm mt-1">
            https://greenchainz-container.jollyrock-a66f2da6.eastus.azurecontainerapps.io
          </p>
        </div>
      </Card>
    </div>
  );
}
