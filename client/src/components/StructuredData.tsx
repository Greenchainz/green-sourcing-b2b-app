import { Helmet } from 'react-helmet-async';

/**
 * StructuredData — Injects JSON-LD structured data into <head>.
 *
 * Usage:
 *   <StructuredData data={softwareApplicationSchema} />
 *
 * Accepts any valid Schema.org JSON-LD object or @graph array.
 */
export default function StructuredData({ data }: { data: Record<string, unknown> }) {
  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(data)}</script>
    </Helmet>
  );
}

// ─── Pre-built schema objects ───────────────────────────────────────────────

/**
 * Homepage: SoftwareApplication + Organization (combined @graph)
 * Declares GreenChainz as a software tool with category, pricing, features,
 * and links it to the organization entity.
 */
export const homepageSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'GreenChainz',
      url: 'https://greenchainz.com',
      applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'Sustainable Building Materials Procurement',
      operatingSystem: 'Web, Chrome Extension, Revit Plugin, Excel Add-in',
      description:
        'GreenChainz is a B2B SaaS platform for architects and procurement teams that provides instant EPD lookups across 50,000+ verified Environmental Product Declarations, automated RFQ workflows, real-time greenwashing detection via browser extension, and compliance tracking for LEED v5, Buy Clean, Local Law 97, and Title 24.',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description: 'Free to start. No credit card required.',
      },
      featureList: [
        'EPD lookup across 50,000+ verified Environmental Product Declarations',
        'Automated RFQ system with BOM drop',
        'Chrome browser extension for real-time greenwashing detection',
        'Revit plugin for live compliance scanning and material swaps',
        'LEED v5 compliance tracking',
        'Buy Clean Act compliance',
        'Local Law 97 compliance',
        'Title 24 compliance',
        'Carbon Compare tool',
        'Material Credit Score',
        'AI Audit Agent',
      ],
      screenshot: 'https://greenchainz.com/images/og-image-homepage.jpg',
    },
    {
      '@type': 'Organization',
      name: 'GreenChainz',
      url: 'https://greenchainz.com',
      logo: 'https://greenchainz.com/brand/greenchainz-logo.png',
      description:
        'GreenChainz intercepts legacy procurement workflows and injects compliance-ready EPD data directly into tools architects and procurement teams already use — Excel, Revit, and browser — before slow incumbent suppliers respond.',
      founder: {
        '@type': 'Person',
        name: 'Jerit Norville',
        jobTitle: 'Founder & CEO',
      },
      sameAs: [
        'https://www.linkedin.com/company/greenchainz',
        'https://appsource.microsoft.com/en-us/product/web-apps/jeritnorville.greenchainz',
      ],
    },
  ],
};

/**
 * About page: AboutPage + nested Organization
 */
export const aboutPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: 'About GreenChainz',
  url: 'https://greenchainz.com/about',
  description:
    'GreenChainz was founded by Jerit Norville to fix construction\'s data access problem — making verified EPD data, automated RFQs, and real-time greenwashing detection accessible to every architect and procurement team.',
  mainEntity: {
    '@type': 'Organization',
    name: 'GreenChainz',
    url: 'https://greenchainz.com',
    founder: {
      '@type': 'Person',
      name: 'Jerit Norville',
      jobTitle: 'Founder & CEO',
      description:
        'Military veteran turned construction PM turned tech founder. Built GreenChainz to solve the data access gap he saw first-hand on job sites.',
    },
  },
};

/**
 * FAQPage schema — 6 key questions that mirror actual search queries.
 * High GEO impact: FAQ schema is one of the highest-weighted signals
 * for AI Overviews and generative answer engines.
 */

/**
 * Keep FAQ content in a single shared constant so the visible FAQ copy and
 * JSON-LD can reuse the exact same text and avoid schema/content drift.
 */
export const faqItems = [
  {
    question: 'What is an Environmental Product Declaration (EPD) and why do architects need it?',
    answer:
      'An EPD (Environmental Product Declaration) is a third-party verified document that quantifies the environmental impact of a building material across its entire life cycle — from raw material extraction through manufacturing, transportation, use, and end-of-life. Architects need EPDs because LEED v5 now makes embodied carbon quantification mandatory for all new construction projects. Without verified EPDs, architects face compliance failures, audit risks, and potential liability exposure from specifying materials with unverified environmental claims.',
  },
  {
    question: 'How does GreenChainz help architects find verified EPDs?',
    answer:
      'GreenChainz helps architects find verified EPDs by letting them search building materials by type, carbon footprint, and compliance requirement, with compliance information available directly in the browser extension.',
  },
  {
    question: 'Does GreenChainz support LEED v5 compliance?',
    answer:
      'Yes. GreenChainz tracks LEED v5, LEED v4.1, Buy Clean California Act, Local Law 97 (NYC), and Title 24 (California) compliance requirements. The platform automatically flags materials that meet or fail specific regulatory thresholds and generates compliance documentation for LEED submissions. LEED v5\'s new mandatory embodied carbon prerequisite (MRp2) requires exactly the kind of EPD-based documentation that GreenChainz automates.',
  },
  {
    question: 'What is the Buy Clean Act and how does GreenChainz help contractors comply?',
    answer:
      'The Buy Clean Act (Buy Clean California Act and related federal/state policies) requires contractors and procurement teams to source building materials — primarily structural steel, concrete, flat glass, and mineral wool insulation — that meet maximum allowable Global Warming Potential (GWP) limits verified through facility-specific EPDs. GreenChainz helps by automatically filtering materials against Buy Clean thresholds, flagging non-compliant products, and connecting procurement teams with verified suppliers who meet the requirements.',
  },
  {
    question: 'Is GreenChainz free to use?',
    answer:
      'Yes, GreenChainz is free to start with no credit card required. Setup takes under 5 minutes. The platform includes EPD lookup, material comparison, and basic RFQ functionality at no cost. Enterprise features including advanced analytics, team collaboration, and priority supplier matching are available through paid plans.',
  },
  {
    question: 'How is GreenChainz different from EC3 or One Click LCA?',
    answer:
      'EC3 (Embodied Carbon in Construction Calculator) and One Click LCA are carbon calculation and LCA tools — they tell you the carbon impact of a material but do not help you buy it. GreenChainz is a procurement execution platform that turns EPD data into live supplier quotes. Where EC3 ends at data lookup and One Click LCA ends at compliance reporting, GreenChainz continues into automated RFQ generation, real-time greenwashing detection via browser extension, and direct supplier connection. EC3 is a noted GreenChainz data partner, and the two platforms are complementary.',
  },
];

export const faqPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqItems.map(({ question, answer }) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: answer,
    },
  })),
};
