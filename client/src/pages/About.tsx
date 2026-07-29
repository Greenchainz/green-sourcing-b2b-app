import Header from "../components/Header";
import Footer from "../components/Footer";
import { Card } from "../components/ui/card";
import SEOHead from "../components/SEOHead";
import StructuredData, { aboutPageSchema } from "../components/StructuredData";
import { trpc } from "../lib/trpc";

// Extract an 11-char YouTube video ID from a full URL or bare ID.
function parseYoutubeId(input: string): string {
  const m = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/.exec(input);
  return m ? m[1] : input.slice(0, 20);
}

export default function About() {
  const aboutVideosQuery = trpc.founderVideo.aboutVideos.useQuery(undefined, {
    retry: false,
    meta: { suppressGlobalErrorLogging: true },
  });

  const videos = aboutVideosQuery.data?.videos ?? [];


  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="About GreenChainz | Verified Materials Decision Platform"
        description="GreenChainz helps teams find validated low-carbon material swaps, route RFQs to qualified suppliers, and generate CSI-ready submittals."
        canonicalPath="/about"
      />
      <StructuredData data={aboutPageSchema} />
      <Header />

      <main className="flex-1">
        <section className="relative overflow-hidden py-20 md:py-32">
          <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.85_0.15_145)] via-[oklch(0.75_0.12_145)] to-[oklch(0.65_0.14_145)] opacity-10" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,oklch(0.80_0.20_145_/_0.3),transparent_50%)]" />

          <div className="container relative z-10">
            <div className="mx-auto max-w-4xl text-center space-y-6">
              <div className="inline-block rounded-full border border-primary/30 bg-primary/10 px-4 py-2 backdrop-blur-sm">
                <span className="text-sm font-semibold text-primary">
                  Why We Exist
                </span>
              </div>

              <h1 className="text-4xl font-bold leading-tight text-foreground md:text-6xl">
                Not a directory.{" "}
                <span className="bg-gradient-to-r from-[oklch(0.85_0.15_145)] to-[oklch(0.65_0.14_145)] bg-clip-text text-transparent">
                  A decision engine.
                </span>
              </h1>

              <p className="mx-auto max-w-3xl text-xl text-muted-foreground">
                The data existed. The EPDs existed. What was missing was the
                layer that takes a material decision, answers what to switch to,
                routes an RFQ to suppliers who can actually reach your jobsite,
                and hands the GC a submittal that passes first review.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-secondary/30 py-20">
          <div className="container">
            <div className="mx-auto max-w-5xl space-y-8">
              <div className="text-center">
                <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
                  Straight from the Founder
                </h2>
                <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                  No pitch deck. No corporate rehearsal. Hear why this platform
                  exists and who it is coming for.
                </p>
              </div>

              <div className="space-y-6">
                {aboutVideosQuery.isLoading ? (
                  <div className="relative aspect-video overflow-hidden rounded-2xl bg-secondary animate-pulse" />
                ) : videos.length === 0 ? (
                  <div className="relative aspect-video overflow-hidden rounded-2xl bg-secondary/50 flex items-center justify-center text-sm text-muted-foreground">
                    No videos added yet.
                  </div>
                ) : (
                  videos.map((v) => (
                    <div key={v.id} className="relative aspect-video overflow-hidden rounded-2xl shadow-2xl">
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${parseYoutubeId(v.youtubeId)}?rel=0&modestbranding=1`}
                        title={v.title || "Founder video"}
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        loading="lazy"
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden py-20">
          <div className="absolute inset-0 bg-gradient-to-b from-background to-secondary/20" />
          <div className="container relative z-10">
            <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2">
              <Card className="border-border/50 bg-card/60 p-8 backdrop-blur-md transition-all duration-300 hover:shadow-xl">
                <h3 className="mb-4 text-2xl font-bold text-foreground">
                  Our Mission
                </h3>
                <p className="leading-relaxed text-muted-foreground">
                  Capture the spec at the moment the material decision is made,
                  then carry it through swap, RFQ, and submittal without
                  dropping the verification context.
                </p>
              </Card>

              <Card className="border-border/50 bg-card/60 p-8 backdrop-blur-md transition-all duration-300 hover:shadow-xl">
                <h3 className="mb-4 text-2xl font-bold text-foreground">
                  Our Vision
                </h3>
                <p className="leading-relaxed text-muted-foreground">
                  A construction industry where verified suppliers win specs on
                  merit, carbon is tracked as rigorously as cost, and the green
                  workflow is the default instead of a burden.
                </p>
              </Card>
            </div>
          </div>
        </section>

        <section className="bg-secondary/30 py-20">
          <div className="container">
            <div className="mx-auto max-w-4xl">
              <div className="mb-12 text-center">
                <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
                  The Broken System We&apos;re Dismantling
                </h2>
                <p className="text-lg text-muted-foreground">
                  Procurement stayed manual, opaque, and controlled by
                  incumbents who benefit from confusion.
                </p>
              </div>

              <div className="space-y-6">
                {[
                  {
                    icon: "📄",
                    title:
                      "The Spec and the Sourcing Are Completely Disconnected",
                    problem:
                      "Project teams specify in BIM or on paper. Sourcing happens later in email, spreadsheets, and phone calls.",
                    solution:
                      "GreenChainz intercepts the decision at spec time, not after it.",
                  },
                  {
                    icon: "🚫",
                    title: "Self-Reported Sustainability Is Worthless",
                    problem:
                      "Every supplier claims to be green. None of it is verified.",
                    solution:
                      "Every material in GreenChainz is third-party verified and scored server-side.",
                  },
                  {
                    icon: "⚖️",
                    title: "RFQs Go to the Wrong Suppliers",
                    problem:
                      "A supplier 600 miles away is not a real option for local-heavy materials.",
                    solution:
                      "RFQs route by material type, shipping class, and delivery capacity.",
                  },
                  {
                    icon: "🔌",
                    title: "The Submittal Is an Afterthought",
                    problem:
                      "A material gets selected. Someone else assembles the submittal. It gets rejected.",
                    solution:
                      "GreenChainz generates the CSI-style submittal automatically from the approved selection.",
                  },
                ].map(item => (
                  <Card
                    key={item.title}
                    className="border-border/50 bg-card/60 p-6 backdrop-blur-md transition-all duration-300 hover:shadow-lg"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[oklch(0.85_0.15_145)] to-[oklch(0.75_0.12_145)] text-2xl">
                        {item.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="mb-2 text-xl font-semibold text-foreground">
                          {item.title}
                        </h3>
                        <p className="mb-2 text-muted-foreground">
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

        <section className="relative overflow-hidden py-20">
          <div className="absolute inset-0 bg-gradient-to-b from-background to-secondary/20" />
          <div className="container relative z-10">
            <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-[160px_1fr]">
              <div className="flex justify-center md:justify-start">
                <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-[oklch(0.85_0.15_145)] to-[oklch(0.65_0.14_145)] text-5xl">
                  👤
                </div>
              </div>
              <div>
                <h2 className="mb-4 text-3xl font-bold text-foreground">
                  Meet Jerit Norville
                </h2>
                <p className="mb-4 text-lg text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    Founder &amp; CEO
                  </span>
                </p>
                <div className="space-y-4 leading-relaxed text-muted-foreground">
                  <p>
                    Jerit&apos;s path to GreenChainz started in the military,
                    moved through construction project management, and landed in
                    tech, where he saw an opportunity to fix a broken system.
                  </p>
                  <p>
                    After watching procurement teams struggle with LEED
                    compliance on multi-million dollar projects, he realized the
                    problem was not a lack of sustainable products. It was a
                    lack of accessible data.
                  </p>
                  <p>
                    So Jerit built GreenChainz: a platform that treats
                    sustainability data like any other spec, searchable,
                    comparable, and built into the tools teams already use.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-secondary/30 py-20">
          <div className="container">
            <div className="mx-auto max-w-4xl text-center">
              <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
                Built for the teams who need a faster path to verified materials
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                Whether you are a supplier, an architect, or a contractor,
                GreenChainz is designed to reduce friction at the moment the
                material decision is made.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
