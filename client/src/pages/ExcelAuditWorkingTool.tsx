import { Link } from 'wouter';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function ExcelAuditWorkingTool() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="py-20 md:py-32">
          <div className="container">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <div className="inline-block px-4 py-2 rounded-full bg-primary/10 border border-primary/30 backdrop-blur-sm mb-4">
                <span className="text-sm font-semibold text-primary">Excel Audit Tool</span>
              </div>

              <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
                Excel Audit{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[oklch(0.85_0.15_145)] to-[oklch(0.65_0.14_145)]">
                  Working Tool
                </span>
              </h1>

              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Upload your Bill of Materials spreadsheet and get instant sustainability scoring,
                carbon analysis, and greener material alternatives — powered by the GreenChainz
                CCPS engine.
              </p>

              <div className="bg-card border border-border rounded-2xl p-12 shadow-lg">
                <div className="space-y-6">
                  <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-10 h-10 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                      />
                    </svg>
                  </div>

                  <h3 className="text-2xl font-semibold text-foreground">
                    Coming Soon
                  </h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    The interactive Excel Audit tool is currently in development. Sign up for early
                    access to be the first to try it.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                    <Link href="/excel-audit">
                      <button className="px-8 py-4 text-lg font-semibold rounded-lg bg-gradient-to-r from-[oklch(0.75_0.12_145)] to-[oklch(0.65_0.14_145)] text-white hover:shadow-lg hover:scale-105 transition-all duration-300">
                        Get Early Access
                      </button>
                    </Link>
                    <Link href="/">
                      <button className="px-8 py-4 text-lg font-semibold rounded-lg border-2 border-primary/30 bg-background/50 backdrop-blur-sm hover:bg-primary/5 hover:border-primary/50 transition-all duration-300">
                        Back to Home
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
