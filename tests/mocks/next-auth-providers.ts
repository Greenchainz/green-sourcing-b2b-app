// Mock for next-auth providers
export default function Provider(config: any) {
  return {
    id: config.id || 'mock-provider',
    name: config.name || 'Mock Provider',
    type: config.type || 'oauth',
    ...config,
  };
}
