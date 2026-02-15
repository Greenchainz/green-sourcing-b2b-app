import { Link } from 'wouter';
import Header from '../components/Header';
import Footer from '../components/Footer';
import VideoPlaceholder from '../components/VideoPlaceholder';
import LeadCaptureForm from '../components/LeadCaptureForm';
import { Card } from '../components/ui/card';

export default function RevitPlugin() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero Section with Gradient */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.85_0.15_145)] via-[oklch(0.75_0.12_145)] to-[oklch(0.65_0.14_145)] opacity-10 animate-gradient"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,oklch(0.80_0.20_145_/_0.3),transparent_50%)]"></div>
        
        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-block px-4 py-2 rounded-full bg-primary/10 border border-primary/30 backdrop-blur-sm mb-4">
              <span className="text-sm font-semibold text-primary">Revit Plugin</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
              Sustainable BIM{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[oklch(0.85_0.15_145)] to-[oklch(0.65_0.14_145)]">
                Without Leaving Revit
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Select any element in your model. Get instant carbon calculations, material swaps, and LEED credit tracking—all inside Revit.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <a href="#signup" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto px-8 py-4 text-lg font-semibold rounded-lg bg-gradient-to-r from-[oklch(0.75_0.12_145)] to-[oklch(0.65_0.14_145)] text-white hover:shadow-lg hover:scale-105 transition-all duration-300">
                  Get Early Access
                </button>
              </a>
              <a href="#demo" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto px-8 py-4 text-lg font-semibold rounded-lg border-2 border-primary/30 bg-background/50 backdrop-blur-sm hover:bg-primary/5 hover:border-primary/50 transition-all duration-300">
                  Watch Demo
                </button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Video Demo Section */}
      <section id="demo" className="py-20 bg-secondary/30">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <VideoPlaceholder
              title="See the Revit Plugin in Action"
              description="Watch how we integrate sustainability data directly into your BIM workflow"
              aspectRatio="16/9"
            />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background to-secondary/20"></div>
        
        <div className="container relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              BIM Meets Sustainability
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              The first Revit plugin that treats carbon like any other parameter.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              {
                icon: '🏗️',
                title: 'Element-Level Carbon',
                description: 'Select any wall, floor, or beam. See its embodied carbon instantly in the properties panel.',
                color: 'from-[oklch(0.85_0.15_145)] to-[oklch(0.75_0.12_145)]'
              },
              {
                icon: '🔄',
                title: 'One-Click Swaps',
                description: 'Replace materials with greener alternatives without changing geometry or schedules.',
                color: 'from-[oklch(0.75_0.12_145)] to-[oklch(0.65_0.14_145)]'
              },
              {
                icon: '📈',
                title: 'Live LEED Tracker',
                description: 'Dashboard shows real-time MR credit progress as you design.',
                color: 'from-[oklch(0.65_0.14_145)] to-[oklch(0.55_0.16_145)]'
              },
              {
                icon: '🎯',
                title: 'Target Benchmarking',
                description: 'Set carbon budgets per building phase. Get alerts when you exceed them.',
                color: 'from-[oklch(0.80_0.20_145)] to-[oklch(0.70_0.12_145)]'
              },
              {
                icon: '📋',
                title: 'Export Schedules',
                description: 'Generate material schedules with EPD data, carbon scores, and supplier contacts.',
                color: 'from-[oklch(0.75_0.12_145)] to-[oklch(0.65_0.14_145)]'
              },
              {
                icon: '🔗',
                title: 'Sync with GreenChainz',
                description: 'Your material library stays in sync across Revit, Excel, and the web app.',
                color: 'from-[oklch(0.70_0.12_145)] to-[oklch(0.60_0.14_145)]'
              }
            ].map((feature, index) => (
              <Card
                key={index}
                className="p-6 bg-card/60 backdrop-blur-md border-border/50 hover:shadow-xl hover:scale-105 transition-all duration-300 group"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-secondary/30">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
              Three Steps to Sustainable Design
            </h2>

            <div className="space-y-8">
              {[
                {
                  step: '01',
                  title: 'Install the Plugin',
                  description: 'Download from Autodesk App Store. Compatible with Revit 2021-2025.',
                  color: 'oklch(0.85_0.15_145)'
                },
                {
                  step: '02',
                  title: 'Select Elements',
                  description: 'Click any model element. Our plugin queries its material properties and matches to EPD data.',
                  color: 'oklch(0.75_0.12_145)'
                },
                {
                  step: '03',
                  title: 'Optimize & Export',
                  description: 'Swap materials, track credits, and export schedules with full sustainability data.',
                  color: 'oklch(0.65_0.14_145)'
                }
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-6 p-6 rounded-xl bg-card/60 backdrop-blur-md border border-border/50 hover:shadow-lg transition-all duration-300"
                >
                  <div
                    className="flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${item.color}, oklch(0.55_0.16_145))` }}
                  >
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Signup Section */}
      <section id="signup" className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.85_0.15_145_/_0.1)] to-[oklch(0.65_0.14_145_/_0.1)]"></div>
        
        <div className="container relative z-10">
          <div className="max-w-2xl mx-auto">
            <Card className="p-8 md:p-12 bg-card/80 backdrop-blur-lg border-border/50 shadow-2xl">
              <div className="text-center mb-8">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Join the Waitlist
                </h2>
                <p className="text-lg text-muted-foreground">
                  Be among the first to get the Revit Plugin when we launch. No credit card required.
                </p>
              </div>

              <LeadCaptureForm toolName="Revit Plugin" />

              <div className="mt-8 pt-8 border-t border-border/30">
                <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Revit 2021-2025
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Free trial
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
