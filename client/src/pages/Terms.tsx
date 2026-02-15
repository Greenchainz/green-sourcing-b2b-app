import { useEffect, useState } from 'react';
import Markdown from 'react-markdown';

export function Terms() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        const response = await fetch('/legal/terms.md');
        const text = await response.text();
        setContent(text);
      } catch (error) {
        console.error('Failed to load Terms of Service:', error);
        setContent('# Error Loading Terms of Service\n\nPlease try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchTerms();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <article className="prose prose-invert max-w-none">
          <Markdown>{content}</Markdown>
        </article>
        <div className="mt-12 pt-8 border-t border-border text-sm text-muted-foreground">
          <p>Last updated: February 15, 2026</p>
          <p>For questions, contact: legal@greenchainz.com</p>
        </div>
      </div>
    </div>
  );
}
