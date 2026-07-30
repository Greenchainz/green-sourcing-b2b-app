import { useState, useEffect, useRef, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

/** SHA-1 k-anonymity check via the server-side HIBP proxy. */
async function hibpPasswordPwned(password: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    const prefix = hashHex.slice(0, 5);
    const suffix = hashHex.slice(5);

    const res = await fetch(`/api/hibp/${prefix}`);
    if (!res.ok) return false;

    const text = await res.text();
    return text.split("\n").some((line) => line.split(":")[0].trim() === suffix);
  } catch {
    return false;
  }
}

function mapAuthError(message: string): string {
  if (message.includes("already exists")) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (message.includes("valid email")) {
    return "Please enter a valid email address.";
  }
  if (message.includes("at least 8")) {
    return "Password must be at least 8 characters.";
  }
  if (message.includes("Too many")) {
    return "Too many sign-up attempts. Please try again shortly.";
  }
  if (message.includes("unavailable") || message.includes("failed")) {
    return message;
  }
  return "Sign-up failed.";
}

export default function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (password.length === 0) {
        setHint(null);
        return;
      }
      if (password.length < 8) {
        setHint("Password must be at least 8 characters.");
        return;
      }
      const pwned = await hibpPasswordPwned(password);
      if (pwned) {
        setHint("This password has appeared in a known data breach. Choose another.");
      } else {
        setHint(null);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [password]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/email/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json() as { success?: boolean; redirectTo?: string; error?: string };

      if (!res.ok || !data.success) {
        setError(mapAuthError(data.error ?? "Sign-up failed.") ?? "Sign-up failed.");
        return;
      }

      setSuccess("Account created! Redirecting…");
      setEmail("");
      setPassword("");
      setConfirm("");

      if (data.redirectTo) {
        window.location.href = data.redirectTo;
      }
    } catch {
      setError("Sign-up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-1">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading || !!success}
          placeholder="you@example.com"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="signup-password">Password</Label>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading || !!success}
          placeholder="At least 8 characters"
        />
        {hint && (
          <div aria-live="polite" className="text-orange-600 text-sm">
            {hint}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="signup-confirm">Confirm password</Label>
        <Input
          id="signup-confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={loading || !!success}
          placeholder="Repeat your password"
        />
      </div>

      {error && (
        <div role="alert" className="text-red-600 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div role="alert" className="text-green-600 text-sm">
          {success}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading || !!success}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating account…
          </>
        ) : (
          "Create account"
        )}
      </Button>
    </form>
  );
}
