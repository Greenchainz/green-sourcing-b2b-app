// Sentry removed — no client-side initialization
import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 min — avoid refetching data that just arrived
      gcTime: 5 * 60_000, // 5 min — keep inactive cache entries longer
      refetchOnWindowFocus: false, // prevent cascade of refetches on tab switch
      retry: 1, // single retry is enough; 3 (default) adds latency on real errors
    },
  },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (typeof window === "undefined") return;

  const isUnauthorizedTrpcError =
    error instanceof TRPCClientError && error.message === UNAUTHED_ERR_MSG;
  const isUnauthorizedGenericError =
    error instanceof Error && error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorizedTrpcError && !isUnauthorizedGenericError) return;

  // Prevent infinite redirect loops: if we already redirected within 3 seconds,
  // the session is genuinely invalid — clear cache and let login page show.
  const LOOP_GUARD_KEY = "gc_login_redirect_ts";
  try {
    const lastRedirect = Number(sessionStorage.getItem(LOOP_GUARD_KEY) || "0");
    if (Date.now() - lastRedirect < 3000) {
      console.warn("[Auth] Redirect loop detected — clearing cache, showing login");
      sessionStorage.removeItem("gc_auth_user");
      sessionStorage.removeItem(LOOP_GUARD_KEY);
      // Don't redirect again — Login.tsx will show the login form
      return;
    }
    sessionStorage.setItem(LOOP_GUARD_KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable — proceed with redirect
  }

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);

    const suppress = event.query.meta?.suppressGlobalErrorLogging === true;
    if (!suppress) {
      console.error("[API Query Error]", error);
    }
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);

    const suppress =
      event.mutation.options.meta?.suppressGlobalErrorLogging === true;
    if (!suppress) {
      console.error("[API Mutation Error]", error);
    }
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      async fetch(input, init) {
        const response = await globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });

        // Some upstream auth layers return HTML for 401/403 instead of tRPC JSON.
        // That causes "Unexpected token '<' ... not valid JSON" noise in the client.
        const contentType = response.headers.get("content-type") ?? "";
        const isJson =
          contentType.includes("application/json") ||
          contentType.includes("application/problem+json");

        if ((response.status === 401 || response.status === 403) && !isJson) {
          throw new TRPCClientError(UNAUTHED_ERR_MSG);
        }

        return response;
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
