import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { Search, FileText, Users, BarChart3, CheckCircle } from 'lucide-react';

export function HowItWorks() {
  const [, setLocation] = useLocation();

  const steps = [
    {
      icon: Search,
      title: "1. Search Sustainable Materials",
      description: "Browse our verified database of sustainable building materials. Filter by carbon footprint, certifications (LEED, WELL, Living Building Challenge), price range, and location.",
      features: [
        "Real-time EPD data from Building Transparency EC3",
        "Carbon footprint comparison across materials",
        "Certification verification (LEED, WELL, LBC, Declare)",
        "Supplier filtering by region and delivery timeline"
      ]
    },
    {
      icon: FileText,
      title: "2. Create Request for Quotation (RFQ)",
      description: "Submit detailed RFQs with material specifications, quantities, delivery requirements, and sustainability criteria. Our AI helps ensure completeness.",
      features: [
        "AI-powered RFQ validation and completeness check",
        "Automatic CSI MasterFormat categorization",
        "Sustainability requirements specification",
        "Multi-material RFQ support"
      ]
    },
    {
      icon: Users,
      title: "3. Receive Verified Supplier Bids",
      description: "Get competitive bids from verified suppliers in your region. All suppliers are pre-screened for certification validity and product authenticity.",
      features: [
        "Real-time bid notifications",
        "Supplier verification badges",
        "Direct messaging with suppliers",
        "Bid comparison dashboard"
      ]
    },
    {
      icon: BarChart3,
      title: "4. Compare & Analyze",
      description: "Use our carbon vs. price trade-off analysis to make informed decisions. See how each bid impacts your project's carbon budget and LEED credits.",
      features: [
        "Carbon vs. price visualization",
        "LEED credit impact analysis",
        "Material swap recommendations",
        "Project carbon budget tracking"
      ]
    },
    {
      icon: CheckCircle,
      title: "5. Award & Track",
      description: "Award the RFQ to your chosen supplier and track order fulfillment. Generate compliance reports for LEED submissions.",
      features: [
        "One-click RFQ award",
        "Order tracking and delivery updates",
        "Automated compliance report generation",
        "CSI submittal package creation"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border">
        <div className="container py-6">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/')}
            className="mb-4"
          >
            ← Back to Home
          </Button>
          <h1 className="text-4xl font-bold mb-4">How GreenChainz Works</h1>
          <p className="text-xl text-muted-foreground max-w-3xl">
            From material search to compliance reporting, GreenChainz streamlines sustainable procurement for architects, contractors, and procurement teams.
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="container py-16">
        <div className="space-y-16">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="flex gap-8 items-start">
                {/* Icon */}
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="w-8 h-8 text-primary" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-3">{step.title}</h2>
                  <p className="text-lg text-muted-foreground mb-4">
                    {step.description}
                  </p>
                  <ul className="space-y-2">
                    {step.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-foreground/90">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-16 pt-16 border-t border-border text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join hundreds of architects and procurement teams using GreenChainz to source verified sustainable materials faster.
          </p>
          <div className="flex gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => setLocation('/get-started')}
            >
              Start Free Trial
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => setLocation('/materials')}
            >
              Browse Materials
            </Button>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="bg-muted/30 py-16">
        <div className="container">
          <h2 className="text-3xl font-bold mb-12 text-center">Platform Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-xl font-bold mb-3">AI-Powered Intelligence</h3>
              <p className="text-muted-foreground">
                ChainBot AI agent helps validate RFQs, recommend material swaps, and ensure compliance with sustainability standards.
              </p>
            </div>
            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-xl font-bold mb-3">Revit Integration</h3>
              <p className="text-muted-foreground">
                Export material specifications directly from Revit models. Sync carbon data back to your BIM workflow.
              </p>
            </div>
            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-xl font-bold mb-3">Real-Time Collaboration</h3>
              <p className="text-muted-foreground">
                Message suppliers, share specifications, and negotiate pricing—all within the platform.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
