"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Button, Input, Label } from "@bytecats/ui-kit";
import { LogIn } from "lucide-react";

interface LoginScreenProps {
  onLogin: (pubkey: string, name: string) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const login = useMutation(api.chat.login);
  const [pubkey, setPubkey] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pubkey.trim() || !password.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await login({ pubkey: pubkey.trim(), password: password.trim() });
      if (result.ok) {
        onLogin(result.user.pubkey, result.user.name);
      } else {
        setError(result.error);
      }
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#070b14] p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Seridian Dashboard</h1>
          <p className="mt-2 text-sm text-slate-400">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">Username</Label>
            <Input
              value={pubkey}
              onChange={(e) => setPubkey(e.target.value)}
              placeholder="e.g. dee"
              className="bg-white/5 border-white/10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="bg-white/5 border-white/10"
            />
          </div>
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          <Button
            type="submit"
            className="w-full bg-seridian-500 text-slate-950 hover:bg-seridian-400"
            disabled={!pubkey.trim() || !password.trim() || loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <p className="text-center text-xs text-slate-600">
          Contact admin for credentials
        </p>
      </div>
    </div>
  );
}
