import { Link } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import StructuredData from "@/components/StructuredData";
import { BLOG_POSTS, getBlogPostPath } from "@shared/blogPosts";

const rawYoutubeIds = (import.meta.env.VITE_BLOG_YOUTUBE_VIDEO_IDS as string | undefined)
  ?.split(",")
  .map((videoId) => videoId.trim())
  .filter(Boolean) ?? [];

const youtubeVideoIds = rawYoutubeIds.slice(0, 3);

const blogIndexSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "GreenChainz Blog",
  url: "https://greenchainz.com/blog",
  description:
    "Question-first guides for sustainable materials procurement, compliance workflows, and supplier sourcing execution.",
  hasPart: BLOG_POSTS.map((post) => ({
    "@type": "BlogPosting",
    headline: post.title,
    datePublished: post.publishedAt,
    description: post.description,
    url: `https://greenchainz.com${getBlogPostPath(post.slug)}`,
  })),
};

const blogFaqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: BLOG_POSTS.slice(0, 5).map((post) => ({
    "@type": "Question",
    name: post.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: post.quickAnswer,
    },
  })),
};

function formatDate(dateIso: string): string {
  return new Date(dateIso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function Blog() {
  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="GreenChainz Blog | SEO + AEO Guides for Sustainable Procurement"
        description="Question-led content for architects, suppliers, and procurement teams. Get practical SEO/AEO and sustainable material execution guides."
        canonicalPath="/blog"
      />
      <StructuredData data={blogIndexSchema} />
      <StructuredData data={blogFaqSchema} />
      <Header />

      <main className="flex-1">
        <section className="py-16 md:py-20 bg-gradient-to-b from-background to-secondary/20">
          <div className="container max-w-5xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-4">GreenChainz Blog</p>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
              Publish once. Rank better. Repurpose everywhere.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-3xl">
              This blog is built for SEO + AEO: every post starts from a real customer question, gives a direct answer
              fast, then goes deeper. Use the feed links below to auto-distribute to other platforms.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <a
                href="/blog/rss.xml"
                className="inline-flex items-center rounded-md border border-border px-3 py-2 text-foreground hover:bg-accent transition-colors"
              >
                RSS feed
              </a>
              <a
                href="/blog/feed.json"
                className="inline-flex items-center rounded-md border border-border px-3 py-2 text-foreground hover:bg-accent transition-colors"
              >
                JSON feed
              </a>
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="container max-w-5xl">
            <h2 className="text-2xl font-bold text-foreground mb-6">Latest question-led posts</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {BLOG_POSTS.map((post) => (
                <article key={post.slug} className="rounded-xl border border-border bg-card p-6 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-primary font-semibold mb-2">{post.question}</p>
                  <h3 className="text-xl font-semibold text-foreground leading-snug">
                    <Link href={getBlogPostPath(post.slug)} className="hover:text-primary transition-colors">
                      {post.title}
                    </Link>
                  </h3>
                  <p className="mt-3 text-sm text-muted-foreground">{post.description}</p>
                  <p className="mt-3 text-sm text-foreground">
                    <span className="font-medium">Quick answer:</span> {post.quickAnswer}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(post.publishedAt)} · {post.readTimeMinutes} min read
                    </span>
                    <Link href={getBlogPostPath(post.slug)} className="text-sm font-medium text-primary hover:underline">
                      Read post →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 bg-secondary/30">
          <div className="container max-w-5xl">
            <h2 className="text-2xl font-bold text-foreground mb-3">Founder videos</h2>
            <p className="text-muted-foreground mb-6">
              Same idea as your About page, now set up for YouTube hosting. Add comma-separated IDs in{" "}
              <code className="text-foreground">VITE_BLOG_YOUTUBE_VIDEO_IDS</code> to control these embeds.
            </p>
            {youtubeVideoIds.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2">
                {youtubeVideoIds.map((videoId) => (
                  <div key={videoId} className="overflow-hidden rounded-xl border border-border bg-card">
                    <div className="aspect-video">
                      <iframe
                        className="h-full w-full"
                        src={`https://www.youtube.com/embed/${encodeURIComponent(videoId)}`}
                        title="GreenChainz founder video"
                        loading="lazy"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
                No YouTube videos configured yet. Set <code className="text-foreground">VITE_BLOG_YOUTUBE_VIDEO_IDS</code>{" "}
                in your environment, for example: <code className="text-foreground">abc123,def456</code>.
              </div>
            )}
          </div>
        </section>

        <section className="py-12">
          <div className="container max-w-5xl">
            <div className="rounded-xl border border-border bg-card p-6 md:p-8">
              <h2 className="text-2xl font-bold text-foreground">Auto-post this content to other sites</h2>
              <p className="mt-3 text-muted-foreground">
                Use your RSS or JSON feed as the trigger in Zapier/Make/Buffer. Publish a shorter version to LinkedIn
                or Medium, then link back to your canonical GreenChainz post.
              </p>
              <div className="mt-5 space-y-2 text-sm text-foreground">
                <p>1. Trigger: new item in <span className="font-medium">/blog/rss.xml</span> or <span className="font-medium">/blog/feed.json</span></p>
                <p>2. Action: generate short social summary + CTA</p>
                <p>3. Action: post to external channel with backlink</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
