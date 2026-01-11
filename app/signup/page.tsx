import { redirect } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;

function toQueryString(searchParams: SearchParams): string {
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

export default async function SignupPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const searchParams = await props.searchParams;
  // We currently onboard users via Microsoft sign-in on /login.
  // Keep /signup as a stable entrypoint for marketing links and role preselection.
  redirect(`/login${toQueryString(searchParams)}`);
}
