import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title: string;
  description: string;
  canonicalPath: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
}

/**
 * SEOHead — Per-page meta tags for SEO and social sharing.
 *
 * Adds: <title>, <meta description>, <link canonical>,
 *       Open Graph tags, and Twitter Card tags.
 *
 * Usage:
 *   <SEOHead
 *     title="EPD Lookup & Sustainable Materials Procurement Software — GreenChainz"
 *     description="GreenChainz is the B2B procurement platform..."
 *     canonicalPath="/"
 *   />
 */
export default function SEOHead({
  title,
  description,
  canonicalPath,
  ogTitle,
  ogDescription,
  ogImage = 'https://greenchainz.com/images/og-image-homepage.jpg',
}: SEOHeadProps) {
  const canonicalUrl = `https://greenchainz.com${canonicalPath}`;
  const resolvedOgTitle = ogTitle || title;
  const resolvedOgDescription = ogDescription || description;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={resolvedOgTitle} />
      <meta property="og:description" content={resolvedOgDescription} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="GreenChainz" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={resolvedOgTitle} />
      <meta name="twitter:description" content={resolvedOgDescription} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
