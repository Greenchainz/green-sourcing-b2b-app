import { signIn } from "@/app/app.auth";

export default async function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">GreenChainz</h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to access the Global Trust Layer
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <form
            action={async () => {
              "use server";
              await signIn("microsoft-entra-id", { redirectTo: "/dashboard" });
            }}
          >
            <button
              type="submit"
              className="flex w-full items-center justify-center rounded-md border border-transparent bg-[#0078D4] px-4 py-3 text-base font-medium text-white hover:bg-[#006abc] focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:ring-offset-2"
            >
              <svg
                className="mr-3 h-5 w-5"
                viewBox="0 0 23 23"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fill="currentColor"
                  d="M0 0h11v11H0zM12 0h11v11H12zM0 12h11v11H0zM12 12h11v11H12z"
                />
              </svg>
              Sign in with Microsoft Entra ID
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
