import Header from '../components/Header';
import Footer from '../components/Footer';
import VideoPlaceholder from '../components/VideoPlaceholder';
import { Card } from '../components/ui/card';

export default function About() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.85_0.15_145)] via-[oklch(0.75_0.12_145)] to-[oklch(0.65_0.14_145)] opacity-10 animate-gradient"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,oklch(0.80_0.20_145_/_0.3),transparent_50%)]"></div>
        
        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-block px-4 py-2 rounded-full bg-primary/10 border border-primary/30 backdrop-blur-sm mb-4">
              <span className="text-sm font-semibold text-primary">About GreenChainz</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
              Building a{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[oklch(0.85_0.15_145)] to-[oklch(0.65_0.14_145)]">
                Sustainable Future
              </span>
              {' '}One Material at a Time
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              We're on a mission to make sustainable building materials as easy to source as conventional ones—because saving the planet shouldn't require a PhD in environmental science.
            </p>
          </div>
        </div>
      </section>

      {/* Founder Video Section */}
      <section className="py-20 bg-secondary/30">
        <div className="container">
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                A Message from Our Founder
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Hear the story behind GreenChainz and why we're building the future of sustainable sourcing.
              </p>
            </div>
            
            <VideoPlaceholder
              title="Meet Jerit Norville"
              description="Founder & CEO shares the GreenChainz vision"
              aspectRatio="16/9"
            />
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background to-secondary/20"></div>
        
        <div className="container relative z-10">
          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <Card className="p-8 bg-card/60 backdrop-blur-md border-border/50 hover:shadow-xl transition-all duration-300">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[oklch(0.85_0.15_145)] to-[oklch(0.75_0.12_145)] flex items-center justify-center text-3xl mb-6">
                🎯
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-4">Our Mission</h3>
              <p className="text-muted-foreground leading-relaxed">
                To eliminate the friction between sustainability goals and procurement reality. We believe green building shouldn't cost more time, money, or sanity—it should be the default. By plugging AI-powered tools directly into the workflows architects, contractors, and procurement teams already use, we're making compliance automatic and alternatives obvious.
              </p>
            </Card>

            <Card className="p-8 bg-card/60 backdrop-blur-md border-border/50 hover:shadow-xl transition-all duration-300">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[oklch(0.75_0.12_145)] to-[oklch(0.65_0.14_145)] flex items-center justify-center text-3xl mb-6">
                🔭
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-4">Our Vision</h3>
              <p className="text-muted-foreground leading-relaxed">
                A construction industry where every material decision is informed by real environmental data, where greenwashing is impossible, and where sustainable products compete on a level playing field. We envision a world where "Buy Clean" isn't a regulation to fear—it's a competitive advantage to embrace.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* The Problem We're Solving */}
      <section className="py-20 bg-secondary/30">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                The Problem We're Solving
              </h2>
              <p className="text-lg text-muted-foreground">
                The construction industry is stuck in the analog age when it comes to sustainability.
              </p>
            </div>

            <div className="space-y-6">
              {[
                {
                  title: 'Manual EPD Lookups',
                  problem: 'Teams waste hours digging through PDFs and databases to verify environmental product declarations.',
                  solution: 'We automate it—instant lookups across 50K+ verified EPDs.',
                  icon: '📄'
                },
                {
                  title: 'Greenwashing Everywhere',
                  problem: 'Suppliers make vague "eco-friendly" claims without data to back them up.',
                  solution: 'We surface only certified, third-party verified products.',
                  icon: '🚫'
                },
                {
                  title: 'Compliance Chaos',
                  problem: 'LEED, Buy Clean, and local regulations create a moving target of requirements.',
                  solution: 'We track the rules and flag non-compliance in real-time.',
                  icon: '⚖️'
                },
                {
                  title: 'Disconnected Tools',
                  problem: 'Sustainability data lives in separate platforms, forcing context-switching.',
                  solution: 'We integrate directly into Excel, Revit, and your browser.',
                  icon: '🔌'
                }
              ].map((item, index) => (
                <Card
                  key={index}
                  className="p-6 bg-card/60 backdrop-blur-md border-border/50 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-[oklch(0.85_0.15_145)] to-[oklch(0.75_0.12_145)] flex items-center justify-center text-2xl">
                      {item.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-foreground mb-2">{item.title}</h3>
                      <p className="text-muted-foreground mb-2">
                        <span className="font-medium text-destructive">Problem:</span> {item.problem}
                      </p>
                      <p className="text-muted-foreground">
                        <span className="font-medium text-primary">Solution:</span> {item.solution}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Founder Story */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background to-secondary/20"></div>
        
        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto">
            <Card className="p-8 md:p-12 bg-card/60 backdrop-blur-md border-border/50">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-shrink-0">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[oklch(0.85_0.15_145)] to-[oklch(0.65_0.14_145)] flex items-center justify-center text-5xl">
                    👤
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-foreground mb-4">Meet Jerit Norville</h2>
                  <p className="text-lg text-muted-foreground mb-4">
                    <span className="font-semibold text-foreground">Founder & CEO</span>
                  </p>
                  <div className="space-y-4 text-muted-foreground leading-relaxed">
                    <p>
                      Jerit's path to GreenChainz started in the military, moved through construction project management, and landed in tech—where he saw an opportunity to fix a broken system.
                    </p>
                    <p>
                      After watching procurement teams struggle with LEED compliance on multi-million dollar projects, he realized the problem wasn't a lack of sustainable products—it was a lack of accessible data. Architects wanted to specify green materials. Contractors wanted to source them. But nobody had time to become an EPD expert.
                    </p>
                    <p>
                      So Jerit built GreenChainz: a platform that treats sustainability data like any other spec—searchable, comparable, and built into the tools teams already use.
                    </p>
                    <p className="font-medium text-foreground">
                      &ldquo;We&rsquo;re not here to guilt-trip anyone into going green. We&rsquo;re here to make it so easy that there&rsquo;s no excuse not to.&rdquo;
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-secondary/30">
        <div className="container">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Our Values
              </h2>
              <p className="text-lg text-muted-foreground">
                The principles that guide everything we build.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: '⚡',
                  title: 'Speed Over Perfection',
                  description: 'Ship fast, iterate faster. The planet does not have time for endless polish.',
                  color: 'from-[oklch(0.85_0.15_145)] to-[oklch(0.75_0.12_145)]'
                },
                {
                  icon: '🔍',
                  title: 'Data Over Marketing',
                  description: 'We trust third-party certifications, not supplier claims. No greenwashing allowed.',
                  color: 'from-[oklch(0.75_0.12_145)] to-[oklch(0.65_0.14_145)]'
                },
                {
                  icon: '🤝',
                  title: 'Integration Over Disruption',
                  description: 'We meet users where they are - Excel, Revit, Chrome - not in yet another dashboard.',
                  color: 'from-[oklch(0.65_0.14_145)] to-[oklch(0.55_0.16_145)]'
                },
                {
                  icon: '💰',
                  title: 'ROI Over Virtue Signaling',
                  description: 'Sustainability should save money and time, not cost extra. We prove it.',
                  color: 'from-[oklch(0.80_0.20_145)] to-[oklch(0.70_0.12_145)]'
                },
                {
                  icon: '🌍',
                  title: 'Access Over Exclusivity',
                  description: 'Green building should not be a luxury. We price for scale, not prestige.',
                  color: 'from-[oklch(0.75_0.12_145)] to-[oklch(0.65_0.14_145)]'
                },
                {
                  icon: '🔧',
                  title: 'Tools Over Consultants',
                  description: 'Empower teams to do it themselves. No expensive audits required.',
                  color: 'from-[oklch(0.70_0.12_145)] to-[oklch(0.60_0.14_145)]'
                }
              ].map((value, index) => (
                <Card
                  key={index}
                  className="p-6 bg-card/60 backdrop-blur-md border-border/50 hover:shadow-xl hover:scale-105 transition-all duration-300 group"
                >
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${value.color} flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    {value.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">{value.title}</h3>
                  <p className="text-muted-foreground">{value.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.85_0.15_145_/_0.1)] to-[oklch(0.65_0.14_145_/_0.1)]"></div>
        
        <div className="container relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Join the Movement
            </h2>
            <p className="text-lg text-muted-foreground">
              We are building the future of sustainable construction. Be part of it.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <a href="/get-started" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto px-8 py-4 text-lg font-semibold rounded-lg bg-gradient-to-r from-[oklch(0.75_0.12_145)] to-[oklch(0.65_0.14_145)] text-white hover:shadow-lg hover:scale-105 transition-all duration-300">
                  Get Started Free
                </button>
              </a>
              <a href="/contact" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto px-8 py-4 text-lg font-semibold rounded-lg border-2 border-primary/30 bg-background/50 backdrop-blur-sm hover:bg-primary/5 hover:border-primary/50 transition-all duration-300">
                  Contact Us
                </button>
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
