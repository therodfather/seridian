"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Button, Input, Label, Badge } from "@bytecats/ui-kit";
import { Key, ShieldAlert, Lock, Check, EyeOff } from "lucide-react";

const INITIAL_SECRETS = [
  { name: "LINEAR_API_KEY", category: "linear", description: "Linear GraphQL API token for background issue & project sync" },
  { name: "GITHUB_ACCESS_TOKEN", category: "github", description: "GitHub Personal Access Token for repository synchronization" },
  { name: "CONVEX_DEPLOYMENT_SECRET", category: "convex", description: "Convex deployment auth token & webhook signature" },
];

export function SecretsVault({ currentUserId = "d" }: { currentUserId?: string }) {
  const secrets = useQuery(api.secrets.listSecrets, { currentUserId });
  const setSecret = useMutation(api.secrets.setSecret);
  const [selectedSecret, setSelectedSecret] = useState<string>("LINEAR_API_KEY");
  const [inputValue, setInputValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const activeSecretObj = secrets?.find((s) => s.name === selectedSecret);

  async function handleSaveSecret(e: React.FormEvent) {
    e.preventDefault();
    if (!inputValue.trim()) return;
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const category = (INITIAL_SECRETS.find((s) => s.name === selectedSecret)?.category ?? "other") as "linear" | "github" | "convex" | "other";
      await setSecret({
        name: selectedSecret,
        secretValue: inputValue.trim(),
        category,
        description: INITIAL_SECRETS.find((s) => s.name === selectedSecret)?.description,
        currentUserId,
      });

      setInputValue("");
      setSuccessMsg(`Successfully saved and masked secret "${selectedSecret}".`);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update secret.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0c1222]/90 p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Lock className="h-4 w-4 text-cyan-400" />
            Write-Only API Keys & Secrets Vault
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Input system integration keys (Linear, GitHub, Convex). Once saved, raw keys are encrypted write-only and cannot be viewed.
          </p>
        </div>
        <Badge variant="secondary" className="bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px]">
          <ShieldAlert className="h-3 w-3 mr-1" />
          Admin Only (D / Rod)
        </Badge>
      </div>

      {/* Secret Selection Cards */}
      <div className="grid gap-3 md:grid-cols-3">
        {INITIAL_SECRETS.map((sec) => {
          const stored = secrets?.find((s) => s.name === sec.name);
          const isSelected = selectedSecret === sec.name;
          return (
            <button
              key={sec.name}
              type="button"
              onClick={() => {
                setSelectedSecret(sec.name);
                setSuccessMsg("");
                setErrorMsg("");
              }}
              className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all ${
                isSelected
                  ? "border-cyan-500/50 bg-cyan-500/10 text-white shadow-lg shadow-cyan-950/40"
                  : "border-white/[0.06] bg-[#080d1a] text-slate-300 hover:border-white/20"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-semibold text-cyan-300">{sec.name}</span>
                  {stored ? (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                      <Check className="w-3 h-3" /> Configured
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">Not Set</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-tight line-clamp-2">{sec.description}</p>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-slate-500 pt-2 border-t border-white/[0.06]">
                <span className="flex items-center gap-1">
                  <EyeOff className="w-3 h-3 text-slate-400" />
                  {stored ? stored.maskedValue : "••••••••••••"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Write-Only Input Form */}
      <form onSubmit={handleSaveSecret} className="space-y-4 pt-2 border-t border-white/[0.06]">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-cyan-400" />
              Update Value for <span className="font-mono text-cyan-300">{selectedSecret}</span>
            </Label>
            <span className="text-[11px] text-amber-400/90 font-medium">
              🔒 Write-Only: Original key cannot be retrieved once saved
            </span>
          </div>

          <Input
            type="password"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={`Enter new ${selectedSecret} token...`}
            className="bg-[#070b14] border-white/10 text-xs font-mono placeholder:text-slate-600 focus:border-cyan-500/50"
          />
        </div>

        {successMsg && (
          <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-slate-500">
            Updating as admin user: <span className="font-semibold text-slate-300">{currentUserId}</span>
          </span>
          <Button
            type="submit"
            disabled={saving || !inputValue.trim()}
            className="bg-cyan-500 text-black hover:bg-cyan-400 font-semibold text-xs px-4"
          >
            {saving ? "Encrypting & Saving..." : "Save Secret"}
          </Button>
        </div>
      </form>
    </div>
  );
}
