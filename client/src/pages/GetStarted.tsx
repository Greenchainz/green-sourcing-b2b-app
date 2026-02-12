import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getLoginUrl } from '../const';

export default function GetStarted() {
  const [, setLocation] = useLocation();
  const [selectedRole, setSelectedRole] = useState<'buyer' | 'supplier' | null>(null);

  const handleRoleSelect = (role: 'buyer' | 'supplier') => {
    setSelectedRole(role);
  };

  const handleContinue = () => {
    if (!selectedRole) return;

    // Redirect to login with role in returnPath
    const returnPath = selectedRole === 'buyer' ? '/materials' : '/supplier/register';
    window.location.href = getLoginUrl(returnPath);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <section className="flex-1 py-20 bg-gradient-to-b from-background to-secondary/20">
        <div className="container max-w-5xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Welcome to GreenChainz
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Let's get you started. First, tell us what brings you here.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Buyer Card */}
            <Card
              className={`p-8 cursor-pointer transition-all hover:shadow-lg ${
                selectedRole === 'buyer'
                  ? 'ring-2 ring-primary bg-primary/5'
                  : 'hover:border-primary/50'
              }`}
              onClick={() => handleRoleSelect('buyer')}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold text-foreground">I'm a Buyer</h3>
                <p className="text-muted-foreground">
                  Architects, procurement officers, and contractors sourcing sustainable materials
                </p>
                <ul className="text-sm text-muted-foreground space-y-2 text-left w-full">
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Browse verified sustainable materials</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Submit RFQs to matched suppliers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>AI-powered CCPS scoring & analysis</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Excel & Revit plugin integration</span>
                  </li>
                </ul>
                {selectedRole === 'buyer' && (
                  <div className="pt-2">
                    <svg className="w-6 h-6 text-primary mx-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            </Card>

            {/* Supplier Card */}
            <Card
              className={`p-8 cursor-pointer transition-all hover:shadow-lg ${
                selectedRole === 'supplier'
                  ? 'ring-2 ring-primary bg-primary/5'
                  : 'hover:border-primary/50'
              }`}
              onClick={() => handleRoleSelect('supplier')}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold text-foreground">I'm a Supplier</h3>
                <p className="text-muted-foreground">
                  Material suppliers and manufacturers offering sustainable building products
                </p>
                <ul className="text-sm text-muted-foreground space-y-2 text-left w-full">
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>List your sustainable products</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Receive matched RFQs from buyers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Showcase EPD & sustainability data</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Real-time messaging with buyers</span>
                  </li>
                </ul>
                {selectedRole === 'supplier' && (
                  <div className="pt-2">
                    <svg className="w-6 h-6 text-primary mx-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="text-center">
            <Button
              size="lg"
              onClick={handleContinue}
              disabled={!selectedRole}
              className="text-lg px-12 py-6"
            >
              Continue with {selectedRole === 'buyer' ? 'Buyer' : selectedRole === 'supplier' ? 'Supplier' : ''} Account →
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              Free to start • No credit card required • 5-minute setup
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
