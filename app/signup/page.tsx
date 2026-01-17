import Link from "next/link";

type SearchParams = Record<string, string | string[] | undefined>;

function toQueryString(searchParams: SearchParams = {}): string {
  const params = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(searchParams)) {
    if (rawValue === undefined) continue;
    if (Array.isArray(rawValue)) {
      for (const value of rawValue) params.append(key, value);
      continue;
    }
    params.set(key, rawValue);
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

export default function SignupPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const loginHref = `/login${toQueryString(searchParams)}`;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6 py-16">
      <div className="max-w-xl w-full text-center bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-3">
          Create your GreenChainz account
        </h1>
        <p className="text-slate-600 mb-6">
          Sign-up happens on the secure login screen. We&apos;ll take you there next.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href={loginHref} className="gc-btn gc-btn-primary">
            Continue to Sign Up
          </Link>
          <Link href="/login?type=supplier" className="gc-btn gc-btn-secondary">
            I&apos;m a Supplier
          </Link>
          <Link href="/login?type=architect" className="gc-btn gc-btn-secondary">
            I&apos;m an Architect
          </Link>
        </div>
        <p className="text-xs text-slate-500 mt-6">
          Already have an account? <Link href="/login" className="text-emerald-600 font-semibold">Log in</Link>
        </p>
      </div>
    </div>
  );
}
