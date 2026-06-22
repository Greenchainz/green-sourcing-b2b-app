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

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (typeof window === "undefined") return;

  const isUnauthorizedTrpcError =
    error instanceof TRPCClientError && error.message === UNAUTHED_ERR_MSG;
  const isUnauthorizedGenericError =
    error instanceof Error && error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorizedTrpcError && !isUnauthorizedGenericError) return;

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
