import { useState } from "react";
import { AlertCircle } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Card } from "../components/ui/card";
import SEOHead from "../components/SEOHead";
import StructuredData, { aboutPageSchema } from "../components/StructuredData";
import { trpc } from "../lib/trpc";

export default function About() {
  const [videoError, setVideoError] = useState<string | null>(null);

  // Prefer an explicitly configured MP4 URL for maximum browser compatibility.
  const aboutVideoUrl = (import.meta.env.VITE_ABOUT_VIDEO_URL ?? "").trim();
  const aboutVideoToken = (import.meta.env.VITE_ABOUT_VIDEO_TOKEN ?? "").trim();

  // Hooks can’t be conditional; keep input valid but disable unless configured.
  const tokenForQuery =
    aboutVideoToken.length >= 8 ? aboutVideoToken : "00000000";

  const founderVideoQuery = trpc.founderVideo.publicGet.useQuery(
    { token: tokenForQuery },
    {
      enabled: !aboutVideoUrl && aboutVideoToken.length >= 8,
      retry: false,
    }
  );

  const resolvedVideoUrl =
    aboutVideoUrl || founderVideoQuery.data?.videoUrl || "";
  const showLoading = founderVideoQuery.isLoading;
  const showUnavailable =
    !aboutVideoUrl &&
    aboutVideoToken.length >= 8 &&
    (founderVideoQuery.error || (!showLoading && !founderVideoQuery.data));
  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="About GreenChainz — Verified Decision Engine for Sustainable Building Materials"
        description="GreenChainz is not a material directory. It's a verified decision engine that surfaces validated swaps, routes RFQs to suppliers who can actually deliver, and generates CSI-formatted submittals — from spec to submittal."
        canonicalPath="/about"
      />
      <StructuredData data={aboutPageSchema} />
      <Header />

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.85_0.15_145)] via-[oklch(0.75_0.12_145)] to-[oklch(0.65_0.14_145)] opacity-10 animate-gradient"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,oklch(0.80_0.20_145_/_0.3),transparent_50%)]"></div>

        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-block px-4 py-2 rounded-full bg-primary/10 border border-primary/30 backdrop-blur-sm mb-4">
              <span className="text-sm font-semibold text-primary">
                Why We Exist
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
              Not a directory.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[oklch(0.85_0.15_145)] to-[oklch(0.65_0.14_145)]">
                A decision engine.
              </span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              The data existed. The EPDs existed. What was missing was the layer
              that takes a material decision, answers "what do I switch to?",
              routes an RFQ to suppliers who can actually reach your jobsite,
              and hands the GC a submittal that passes first review. That's what
              we built.
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
                Straight from the Founder
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                No pitch deck. No corporate rehearsal. Hear why this platform
                exists and who it's coming for.
              </p>
            </div>

            <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black aspect-video">
              {showLoading ? (
                <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
                  Loading video…
                </div>
              ) : resolvedVideoUrl ? (
                <video
                  className="w-full h-full object-cover"
                  controls
                  preload="metadata"
                  playsInline
                  crossOrigin="anonymous"
                  onError={(e) => {
                    // Better error logging for debugging CORS / load issues
                    // and show a user-friendly message in the UI.
                    // eslint-disable-next-line no-console
                    console.error("About video error:", e);
                    setVideoError("Video failed to load. The URL may be missing, access-restricted, or blocked by CORS.");
                  }}
                >
                  <source
                    src={resolvedVideoUrl}
                    type={/\.webm($|\?)/.test(resolvedVideoUrl) ? "video/webm" : /\.mp4($|\?)/.test(resolvedVideoUrl) ? "video/mp4" : undefined}
                  />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground px-6 text-center">
                  Founder video not configured yet.
                </div>
              )}

              {(videoError || showUnavailable) && (
                <div className="absolute inset-x-0 bottom-0 bg-black/70 text-white text-sm p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Video unavailable</p>
                    <p className="opacity-90">
                      {videoError ??
                        (founderVideoQuery.error?.message ||
                          "This video could not be loaded. Check VITE_ABOUT_VIDEO_URL or VITE_ABOUT_VIDEO_TOKEN.")}
                    </p>
                  </div>
                </div>
              )}
            </div>
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
              <h3 className="text-2xl font-bold text-foreground mb-4">
                Our Mission
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Capture the spec at the moment the material decision is made —
                then carry it through swap, RFQ, and submittal without dropping
                the verification context. Green procurement should be the path
                of least resistance, enforced by software, not consultants.
              </p>
            </Card>

            <Card className="p-8 bg-card/60 backdrop-blur-md border-border/50 hover:shadow-xl transition-all duration-300">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[oklch(0.75_0.12_145)] to-[oklch(0.65_0.14_145)] flex items-center justify-center text-3xl mb-6">
                🔭
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-4">
                Our Vision
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                A construction industry where verified suppliers win specs on
                merit, not relationships. Where carbon is tracked as rigorously
                as cost. Where "Buy Clean" is the default workflow — not a
                compliance burden. And where no project team ever has to
                manually chase an EPD PDF again.
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
                The Broken System We're Dismantling
              </h2>
              <p className="text-lg text-muted-foreground">
                While the rest of the world automated, construction procurement
                stayed manual, opaque, and controlled by incumbents who benefit
                directly from your confusion.
              </p>
            </div>

            <div className="space-y-6">
              {[
                {
                  title:
                    "The Spec and the Sourcing Are Completely Disconnected",
                  problem:
                    "Project teams specify in BIM or on paper. Sourcing happens in email, spreadsheets, and phone calls — by someone else, days later. The decision context is lost every time.",
                  solution:
                    "GreenChainz intercepts the material decision the moment it's made — inside Revit, Forma, or via RFQ. Swap suggestions and routing happen at spec time, not after it.",
                  icon: "📄",
                },
                {
                  title: "Self-Reported Sustainability Is Worthless",
                  problem:
                    "Every supplier claims to be green. None of it is verified. Specifying the wrong product means compliance failures, audit risk, and liability.",
                  solution:
                    "Every material in GreenChainz is third-party verified. Confidence levels are always visible. Scores are server-side and immutable — suppliers can't edit them.",
                  icon: "🚫",
                },
                {
                  title: "RFQs Go to the Wrong Suppliers",
                  problem:
                    "A concrete supplier 600 miles from the jobsite isn't a real option. Manual RFQ processes ignore shipping class, distance, and delivery capacity entirely.",
                  solution:
                    "GreenChainz routes RFQs by material type and shipping class. Local-heavy materials stay local. Suppliers who can't deliver don't see the RFQ.",
                  icon: "⚖️",
                },
                {
                  title: "The Submittal Is an Afterthought",
                  problem:
                    "A material gets selected. Someone else assembles the submittal. It's rejected. Three weeks of schedule, wasted.",
                  solution:
                    "GreenChainz generates the CSI MasterFormat submittal automatically from the approved selection — EPD, verification statements, supplier data, all included.",
                  icon: "🔌",
                },
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
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        {item.title}
                      </h3>
                      <p className="text-muted-foreground mb-2">
                        <span className="font-medium text-destructive">
                          Problem:
                        </span>{" "}
                        {item.problem}
                      </p>
                      <p className="text-muted-foreground">
                        <span className="font-medium text-primary">
                          Solution:
                        </span>{" "}
                        {item.solution}
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
                  <h2 className="text-3xl font-bold text-foreground mb-4">
                    Meet Jerit Norville
                  </h2>
                  <p className="text-lg text-muted-foreground mb-4">
                    <span className="font-semibold text-foreground">
                      Founder & CEO
                    </span>
                  </p>
                  <div className="space-y-4 text-muted-foreground leading-relaxed">
                    <p>
                      Jerit's path to GreenChainz started in the military, moved
                      through construction project management, and landed in
                      tech—where he saw an opportunity to fix a broken system.
                    </p>
                    <p>
                      After watching procurement teams struggle with LEED
                      compliance on multi-million dollar projects, he realized
                      the problem wasn't a lack of sustainable products—it was a
                      lack of accessible data. Architects wanted to specify
                      green materials. Contractors wanted to source them. But
                      nobody had time to become an EPD expert.
                    </p>
                    <p>
                      So Jerit built GreenChainz: a platform that treats
                      sustainability data like any other spec—searchable,
                      comparable, and built into the tools teams already use.
                    </p>
                    <p className="font-medium text-foreground">
                      &ldquo;The construction industry doesn&rsquo;t have a
                      sustainability problem. It has a data access problem.
                      We&rsquo;re fixing that&mdash;with or without the legacy
                      players&rsquo; permission.&rdquo;
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
                  icon: "⚡",
                  title: "Speed Over Perfection",
                  description:
                    "Ship fast, iterate faster. The project timeline has no patience for endless polish.",
                  color:
                    "from-[oklch(0.85_0.15_145)] to-[oklch(0.75_0.12_145)]",
                },
                {
                  icon: "🔍",
                  title: "Data Over Marketing",
                  description:
                    "We trust third-party certifications, not supplier claims. No greenwashing allowed.",
                  color:
                    "from-[oklch(0.75_0.12_145)] to-[oklch(0.65_0.14_145)]",
                },
                {
                  icon: "🤝",
                  title: "Integration Over Disruption",
                  description:
                    "We meet users where they are - Excel, Revit, Chrome - not in yet another dashboard.",
                  color:
                    "from-[oklch(0.65_0.14_145)] to-[oklch(0.55_0.16_145)]",
                },
                {
                  icon: "💰",
                  title: "ROI Over Virtue Signaling",
                  description:
                    "Sustainability should save money and time, not cost extra. We prove it.",
                  color:
                    "from-[oklch(0.80_0.20_145)] to-[oklch(0.70_0.12_145)]",
                },
                {
                  icon: "🌍",
                  title: "Access Over Exclusivity",
                  description:
                    "Green building should not be a luxury. We price for scale, not prestige.",
                  color:
                    "from-[oklch(0.75_0.12_145)] to-[oklch(0.65_0.14_145)]",
                },
                {
                  icon: "🔧",
                  title: "Tools Over Consultants",
                  description:
                    "Empower teams to do it themselves. No expensive audits required.",
                  color:
                    "from-[oklch(0.70_0.12_145)] to-[oklch(0.60_0.14_145)]",
                },
              ].map((value, index) => (
                <Card
                  key={index}
                  className="p-6 bg-card/60 backdrop-blur-md border-border/50 hover:shadow-xl hover:scale-105 transition-all duration-300 group"
                >
                  <div
                    className={`w-14 h-14 rounded-xl bg-gradient-to-br ${value.color} flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform duration-300`}
                  >
                    {value.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {value.title}
                  </h3>
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
              Ready to Source Smarter?
            </h2>
            <p className="text-lg text-muted-foreground">
              Join the project teams and suppliers already closing deals on
              verified sustainable materials — without the back-and-forth.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <a href="/get-started" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto px-8 py-4 text-lg font-semibold rounded-lg bg-gradient-to-r from-[oklch(0.75_0.12_145)] to-[oklch(0.65_0.14_145)] text-white hover:shadow-lg hover:scale-105 transition-all duration-300">
                  Get Started Free
                </button>
              </a>
              <a href="/contact" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto px-8 py-4 text-lg font-semibold rounded-lg border-2 border-primary/30 bg-background/50 backdrop-blur-sm hover:bg-primary/5 hover:border-primary/50 transition-all duration-300">
                  Talk to Jerit
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
