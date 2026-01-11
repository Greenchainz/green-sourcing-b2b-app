// app/components/StructuredData.tsx
export default function StructuredData() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "GreenChainz",
    "url": "https://greenchainz.com",
    "logo": "https://greenchainz.com/brand/greenchainz-logo.png",
    "description": "B2B marketplace for verified sustainable building materials with carbon tracking and EPD integration",
    "foundingDate": "2025",
    "founders": [{
      "@type": "Person",
      "name": "Jerit Norville"
    }],
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Danville",
      "addressRegion": "VA",
      "addressCountry": "US"
    },
    "sameAs": [
      "https://www.linkedin.com/company/greenchainz",
      "https://www.facebook.com/61583188363386/"
    ],
    "offers": {
      "@type": "Offer",
      "itemOffered": {
        "@type": "Service",
        "name": "Verified Sustainable Building Materials Marketplace",
        "description": "EPD-verified materials, LEED credit support, carbon scoring"
      }
    }
  };

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "GreenChainz",
    "image": "https://greenchainz.com/brand/greenchainz-logo.png",
    "@id": "https://greenchainz.com",
    "url": "https://greenchainz.com",
    "priceRange": "$$",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Danville",
      "addressRegion": "VA",
      "addressCountry": "US"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 36.5859718,
      "longitude": -79.3950228
    },
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
      "opens": "09:00",
      "closes": "17:00"
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
    </>
  );
}
