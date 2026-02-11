import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
interface LeadCaptureFormProps {
  toolName: string;
  onSuccess?: () => void;
}

export default function LeadCaptureForm({ toolName, onSuccess }: LeadCaptureFormProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !name) {
      alert('Please provide your name and email');
      return;
    }

    setIsSubmitting(true);

    try {
      // POST to Azure backend
      const response = await fetch('https://greenchainz-container.jollyrock-a66f2da6.eastus.azurecontainerapps.io/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          company: company.trim() || undefined,
          toolName
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit');
      }

      setSubmitted(true);
      setEmail('');
      setName('');
      setCompany('');
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Lead submission error:', error);
      alert(error instanceof Error ? error.message : 'Something went wrong. Please try again or contact us directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="p-6 rounded-lg bg-primary/10 border border-primary/30 backdrop-blur-sm">
        <div className="flex items-center space-x-3 mb-2">
          <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <h3 className="text-lg font-semibold text-foreground">Success!</h3>
        </div>
        <p className="text-muted-foreground">We'll be in touch soon with early access details.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium text-foreground">
          Full Name *
        </label>
        <Input
          id="name"
          type="text"
          placeholder="John Doe"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="bg-background/50 backdrop-blur-sm border-border/50"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Work Email *
        </label>
        <Input
          id="email"
          type="email"
          placeholder="john@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="bg-background/50 backdrop-blur-sm border-border/50"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="company" className="text-sm font-medium text-foreground">
          Company (Optional)
        </label>
        <Input
          id="company"
          type="text"
          placeholder="Acme Construction"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="bg-background/50 backdrop-blur-sm border-border/50"
        />
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 hover:scale-105 hover:shadow-lg"
      >
        {isSubmitting ? 'Submitting...' : 'Get Early Access'}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        By signing up, you agree to receive product updates and early access invitations.
      </p>
    </form>
  );
}
