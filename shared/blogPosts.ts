export interface BlogSection {
  heading: string;
  paragraphs: string[];
}

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  question: string;
  quickAnswer: string;
  publishedAt: string;
  updatedAt?: string;
  readTimeMinutes: number;
  tags: string[];
  sections: BlogSection[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "what-is-epd-and-why-it-matters",
    title: "What Is an EPD and Why Does It Matter for Architects?",
    description:
      "A plain-English guide to Environmental Product Declarations, why specs fail without them, and how to use EPD data in real projects.",
    question: "What is an EPD and why does it matter in material decisions?",
    quickAnswer:
      "An EPD is a third-party verified report of a product's environmental impact. It matters because it is how teams prove compliance, compare options, and reduce embodied carbon risk.",
    publishedAt: "2026-07-15T00:00:00.000Z",
    readTimeMinutes: 6,
    tags: ["EPD", "LEED v5", "Embodied Carbon", "Procurement"],
    sections: [
      {
        heading: "What an EPD actually is",
        paragraphs: [
          "An Environmental Product Declaration (EPD) is a standardized, independently verified document that reports life-cycle environmental impact data for a building product.",
          "In practice, it gives architects and procurement teams a trusted basis for comparison instead of relying on marketing claims.",
        ],
      },
      {
        heading: "Why teams get stuck without EPDs",
        paragraphs: [
          "Without verified documentation, sustainability claims are hard to defend during design review, submittal review, or compliance audits.",
          "That gap creates rework: late substitutions, delayed RFQs, and extra rounds of submittal rejection.",
        ],
      },
      {
        heading: "How to use EPDs faster",
        paragraphs: [
          "Start with hard gates: required certifications, performance constraints, and carbon thresholds. Then rank qualified options by deliverability, not just lowest carbon on paper.",
          "This keeps sustainability practical and procurement-ready.",
        ],
      },
    ],
  },
  {
    slug: "how-to-reduce-rfq-delays-for-sustainable-materials",
    title: "How to Reduce RFQ Delays for Sustainable Materials",
    description:
      "A tactical playbook to cut RFQ cycle time and get faster supplier responses without compromising compliance.",
    question: "How do you speed up RFQs for sustainable building materials?",
    quickAnswer:
      "Use a standardized RFQ intake, filter suppliers by real delivery capability, and package compliance requirements up front so quotes come back actionable.",
    publishedAt: "2026-07-15T00:00:00.000Z",
    readTimeMinutes: 5,
    tags: ["RFQ", "Supplier Onboarding", "Construction Ops"],
    sections: [
      {
        heading: "Why RFQs stall",
        paragraphs: [
          "Most delays happen before pricing: missing documentation requirements, unclear scope, and supplier mismatch by geography or capability.",
          "If those inputs are vague, every quote round becomes a clarification round.",
        ],
      },
      {
        heading: "A faster RFQ structure",
        paragraphs: [
          "Collect material requirements once in a structured format: product type, performance constraints, compliance docs needed, target delivery window, and jobsite region.",
          "Then route only to suppliers who can satisfy those constraints.",
        ],
      },
      {
        heading: "What to include in every request",
        paragraphs: [
          "Include EPD requirement language, acceptable alternatives, and submittal expectations in the initial request.",
          "That turns RFQ replies from exploratory to executable.",
        ],
      },
    ],
  },
  {
    slug: "leed-v5-material-compliance-checklist",
    title: "LEED v5 Material Compliance Checklist for Busy Teams",
    description:
      "A practical checklist for design and procurement teams trying to stay on track with embodied-carbon and documentation requirements.",
    question: "What should be in a LEED v5 material compliance checklist?",
    quickAnswer:
      "Your checklist should cover verified EPD availability, embodied carbon thresholds, supplier documentation readiness, and submittal completeness.",
    publishedAt: "2026-07-15T00:00:00.000Z",
    readTimeMinutes: 7,
    tags: ["LEED v5", "Checklist", "Submittals"],
    sections: [
      {
        heading: "Start with required evidence",
        paragraphs: [
          "Define which documents are mandatory before a product can be considered: EPD, relevant certifications, and key technical datasheets.",
          "Treat missing documentation as a blocker, not an afterthought.",
        ],
      },
      {
        heading: "Evaluate procurement reality",
        paragraphs: [
          "The best-looking option on paper is not always buildable on schedule. Include lead time, regional availability, and supplier responsiveness in the pass/fail logic.",
          "This avoids late-stage value-engineering surprises.",
        ],
      },
      {
        heading: "Close the loop with submittals",
        paragraphs: [
          "Every selected material should roll into a clean, CSI-ready submittal package with traceable references back to the approved criteria.",
          "That linkage is what keeps compliance defensible.",
        ],
      },
    ],
  },
  {
    slug: "best-way-to-compare-building-materials-in-2026",
    title: "Best Way to Compare Building Materials in 2026",
    description:
      "How to compare building materials beyond a single carbon number so you can pick options that actually win specs and get installed.",
    question: "What is the best way to compare sustainable building materials?",
    quickAnswer:
      "Compare materials with a weighted score across compliance, documentation quality, lead time, cost signal, and embodied carbon instead of using a single metric.",
    publishedAt: "2026-07-15T00:00:00.000Z",
    readTimeMinutes: 6,
    tags: ["Material Discovery", "SWAP Engine", "Decision Support"],
    sections: [
      {
        heading: "Single-metric comparisons fail",
        paragraphs: [
          "Lowest carbon does not always mean most viable. Real project decisions are constrained by code, schedule, budget, and supplier reliability.",
          "A comparison model should reflect those constraints explicitly.",
        ],
      },
      {
        heading: "Use weighted scoring",
        paragraphs: [
          "Create a transparent weighting model that puts compliance and buildability first, then differentiates qualified options by sustainability and cost.",
          "This keeps the process defendable to owners, GCs, and reviewers.",
        ],
      },
      {
        heading: "Make results procurement-ready",
        paragraphs: [
          "The output should be a short list that can be quoted and approved immediately, not a long list of theoretical alternatives.",
          "That is where decision support turns into revenue impact.",
        ],
      },
    ],
  },
  {
    slug: "how-to-auto-distribute-blog-posts-across-platforms",
    title: "How to Auto-Distribute Blog Posts Across Platforms",
    description:
      "Publish once on your site and automatically syndicate to major channels using feeds and automation tools without duplicate-content penalties.",
    question: "How can I publish once and push my content to other sites automatically?",
    quickAnswer:
      "Publish on your own site first, expose RSS/JSON feeds, and connect them to automation tools (like Zapier or Make) to post summaries on external platforms with canonical links back to your site.",
    publishedAt: "2026-07-15T00:00:00.000Z",
    readTimeMinutes: 5,
    tags: ["AEO", "Distribution", "RSS", "Growth"],
    sections: [
      {
        heading: "Keep your site as source of truth",
        paragraphs: [
          "Always publish the full article on your own domain first. External platforms should carry a shorter version that links back to the canonical post.",
          "This protects SEO value and consolidates authority on your site.",
        ],
      },
      {
        heading: "Use machine-readable feeds",
        paragraphs: [
          "RSS and JSON Feed endpoints let external tools detect new posts automatically. When a new post appears, your automation can trigger syndication steps.",
          "This is the simplest way to run 'publish once, distribute everywhere'.",
        ],
      },
      {
        heading: "Suggested automation flow",
        paragraphs: [
          "Trigger on new feed item, generate a short social summary, post to LinkedIn/X/Medium, and include a backlink to the original article.",
          "This gives you consistent distribution with minimal weekly effort.",
        ],
      },
    ],
  },
];

export function getBlogPostPath(slug: string): string {
  return `/blog/${slug}`;
}

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}
