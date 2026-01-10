export default function StructuredData() {
  // Organization Schema
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'GreenChainz',
    url: 'https://greenchainz.com',
    logo: 'https://greenchainz.com/brand/greenchainz-logo.png',
    description: 'The Trust Layer for Sustainable Commerce - verified sustainable building materials marketplace',
    sameAs: [
      'https://twitter.com/greenchainzhq',
      'https://linkedin.com/company/greenchainz',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'support@greenchainz.com',
      contactType: 'Customer Support',
      availableLanguage: 'English',
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Richmond',
      addressRegion: 'VA',
      addressCountry: 'US',
    },
  }

  // Website Schema
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'GreenChainz',
    url: 'https://greenchainz.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://greenchainz.com/catalog?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  }

  // Software Application Schema
  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'GreenChainz Platform',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '50',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
    </>
  )
}
