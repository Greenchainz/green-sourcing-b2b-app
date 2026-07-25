import { useRoute, Link } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import StructuredData from "@/components/StructuredData";
import { BLOG_POSTS, getBlogPostBySlug } from "@shared/blogPosts";

function formatDate(dateIso: string): string {
  return new Date(dateIso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogPostPage() {
  const [, params] = useRoute<{ slug: string }>("/blog/:slug");
  const slug = params?.slug ?? "";
  const post = getBlogPostBySlug(slug);

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col">
        <SEOHead
          title="Blog Post Not Found | GreenChainz"
          description="The requested blog post could not be found."
          canonicalPath="/blog"
        />
        <Header />
        <main className="flex-1">
          <div className="container max-w-3xl py-16">
            <h1 className="text-3xl font-bold text-foreground">Post not found</h1>
            <p className="mt-3 text-muted-foreground">
              That article does not exist or may have been moved.
            </p>
            <Link href="/blog" className="mt-6 inline-flex text-primary hover:underline">
              ← Back to blog
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const canonicalPath = `/blog/${post.slug}`;
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    author: {
      "@type": "Organization",
      name: "GreenChainz",
    },
    mainEntityOfPage: `https://greenchainz.com${canonicalPath}`,
    keywords: post.tags.join(", "),
  };

  const relatedPosts = BLOG_POSTS.filter((item) => item.slug !== post.slug).slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title={`${post.title} | GreenChainz Blog`}
        description={post.description}
        canonicalPath={canonicalPath}
      />
      <StructuredData data={articleSchema} />
      <Header />

      <main className="flex-1">
        <article className="container max-w-3xl py-12">
          <Link href="/blog" className="text-sm text-primary hover:underline">
            ← Back to blog
          </Link>
          <p className="mt-5 text-xs uppercase tracking-widest text-primary font-semibold">{post.question}</p>
          <h1 className="mt-3 text-4xl font-bold text-foreground leading-tight">{post.title}</h1>
          <p className="mt-4 text-lg text-muted-foreground">{post.description}</p>

          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>{formatDate(post.publishedAt)}</span>
            <span>·</span>
            <span>{post.readTimeMinutes} min read</span>
          </div>

          <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-foreground">
            <span className="font-semibold">Quick answer:</span> {post.quickAnswer}
          </div>

          <div className="mt-8 space-y-8">
            {post.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-2xl font-semibold text-foreground">{section.heading}</h2>
                <div className="mt-3 space-y-4 text-muted-foreground leading-7">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>

        <section className="pb-14">
          <div className="container max-w-3xl">
            <h3 className="text-xl font-semibold text-foreground mb-4">More questions we answer</h3>
            <div className="grid gap-4 md:grid-cols-3">
              {relatedPosts.map((relatedPost) => (
                <Link
                  key={relatedPost.slug}
                  href={`/blog/${relatedPost.slug}`}
                  className="rounded-lg border border-border bg-card p-4 hover:border-primary/50 transition-colors"
                >
                  <p className="text-xs uppercase tracking-wide text-primary font-semibold mb-2">{relatedPost.question}</p>
                  <p className="text-sm font-medium text-foreground">{relatedPost.title}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
