"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import {
  Badge,
  Button,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@bytecats/ui-kit";
import { cn } from "@/lib/utils";
import { isConvexId } from "@/lib/convexId";
import { toastMutationError, toastMutationSuccess } from "@/lib/mutationToast";
import { ClientForm } from "@/components/clients/ClientForm";
import {
  Building2,
  Users,
  Cpu,
  Target,
  Swords,
  DollarSign,
  Plus,
  BrainCircuit,
  Lightbulb,
  ShieldCheck,
  ShieldAlert,
  Network,
  Share2,
  Heart,
  Link2,
  Mail,
  Phone,
  UserCheck,
  Globe,
  ExternalLink,
} from "lucide-react";

const STATUS_CONFIG = {
  active: { color: "bg-green-500/10 text-green-400 border-green-500/20", label: "Active" },
  inactive: { color: "bg-slate-500/10 text-slate-500 border-slate-500/20", label: "Inactive" },
} as const;

const INFLUENCE_CONFIG = {
  champion: { color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Champion" },
  decision_maker: { color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20", label: "Decision Maker" },
  blocker: { color: "bg-red-500/10 text-red-400 border-red-500/20", label: "Blocker" },
  neutral: { color: "bg-slate-500/10 text-slate-400 border-slate-500/20", label: "Neutral" },
} as const;

export default function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = use(params);
  const validClientId = isConvexId(clientId);
  const client = useQuery(
    api.clients.get,
    validClientId ? { clientId: clientId as Id<"clients"> } : "skip",
  );
  const updateClient = useMutation(api.clients.update);

  const deals = useQuery(
    api.deals.list,
    validClientId ? { clientId: clientId as Id<"clients"> } : "skip",
  );

  const [editOpen, setEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("network");

  // State for Personnel Dossier modal & creation
  const [personnelModalOpen, setPersonnelModalOpen] = useState(false);
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);

  // Individual Dossier states
  const [pName, setPName] = useState("");
  const [pRole, setPRole] = useState("");
  const [pEmail, setPEmail] = useState("");
  const [pPhone, setPPhone] = useState("");
  const [pLinkedin, setPLinkedin] = useState("");
  const [pTwitter, setPTwitter] = useState("");
  const [pGithub, setPGithub] = useState("");
  const [pPersonalWebsite, setPPersonalWebsite] = useState("");
  const [pInfluence, setPInfluence] = useState<"champion" | "decision_maker" | "blocker" | "neutral">("neutral");
  const [pInterests, setPInterests] = useState("");
  const [pBgNotes, setPBgNotes] = useState("");
  const [pBgStatus, setPBgStatus] = useState<"pending" | "verified" | "flagged" | "none">("none");

  // Corporate social media edit states
  const [compLinkedin, setCompLinkedin] = useState("");
  const [compTwitter, setCompTwitter] = useState("");
  const [compGithub, setCompGithub] = useState("");

  // State for Downstream Client ("Their Clients")
  const [dsName, setDsName] = useState("");
  const [dsIndustry, setDsIndustry] = useState("");
  const [dsRelType, setDsRelType] = useState("Key Account");

  if (!validClientId) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/[0.06] text-sm text-slate-600">
        <p>Invalid client link.</p>
        <Link href="/dashboard/clients" className="text-cyan-400 hover:underline">
          Back to Clients
        </Link>
      </div>
    );
  }

  if (client === undefined) {
    return (
      <div className="space-y-6 p-1">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  if (client === null) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/[0.06] text-sm text-slate-600">
        <p>Client record not found.</p>
        <Link href="/dashboard/clients" className="text-cyan-400 hover:underline">
          Back to Clients
        </Link>
      </div>
    );
  }

  const status = STATUS_CONFIG[client.status];

  // Save Corporate Social Media Hub links
  async function handleSaveCorporateSocials() {
    try {
      await updateClient({
        clientId: client!._id,
        companyLinkedin: compLinkedin || undefined,
        companyTwitter: compTwitter || undefined,
        companyGithub: compGithub || undefined,
      });
      toastMutationSuccess("Company socials saved");
    } catch (error) {
      toastMutationError(error, "Failed to save company socials");
    }
  }

  // Handlers for Employee / Who's Who Dossiers
  async function handleSavePersonnel() {
    if (!pName.trim() || !pRole.trim()) {
      toastMutationError("Name and role are required");
      return;
    }
    const current = client?.keyPersonnel ?? [];
    const newRecord = {
      id: editingPersonId || `person-${Date.now()}`,
      name: pName.trim(),
      role: pRole.trim(),
      email: pEmail.trim() || undefined,
      phone: pPhone.trim() || undefined,
      linkedin: pLinkedin.trim() || undefined,
      twitter: pTwitter.trim() || undefined,
      github: pGithub.trim() || undefined,
      personalWebsite: pPersonalWebsite.trim() || undefined,
      influenceLevel: pInfluence,
      personalInterests: pInterests.split(",").map((s) => s.trim()).filter(Boolean),
      backgroundCheckNotes: pBgNotes.trim() || undefined,
      backgroundCheckStatus: pBgStatus,
    };

    let updatedList;
    if (editingPersonId) {
      updatedList = current.map((p) => (p.id === editingPersonId ? { ...p, ...newRecord } : p));
    } else {
      updatedList = [...current, newRecord];
    }

    try {
      await updateClient({
        clientId: client!._id,
        keyPersonnel: updatedList,
      });
      toastMutationSuccess(editingPersonId ? "Dossier updated" : "Dossier added");
      setPersonnelModalOpen(false);
      resetPersonnelForm();
    } catch (error) {
      toastMutationError(error, "Failed to save dossier");
    }
  }

  function resetPersonnelForm() {
    setEditingPersonId(null);
    setPName("");
    setPRole("");
    setPEmail("");
    setPPhone("");
    setPLinkedin("");
    setPTwitter("");
    setPGithub("");
    setPPersonalWebsite("");
    setPInfluence("neutral");
    setPInterests("");
    setPBgNotes("");
    setPBgStatus("none");
  }

  function handleOpenEditPersonnel(p: any) {
    setEditingPersonId(p.id);
    setPName(p.name);
    setPRole(p.role);
    setPEmail(p.email || "");
    setPPhone(p.phone || "");
    setPLinkedin(p.linkedin || "");
    setPTwitter(p.twitter || "");
    setPGithub(p.github || "");
    setPPersonalWebsite(p.personalWebsite || "");
    setPInfluence(p.influenceLevel || "neutral");
    setPInterests(p.personalInterests ? p.personalInterests.join(", ") : "");
    setPBgNotes(p.backgroundCheckNotes || "");
    setPBgStatus(p.backgroundCheckStatus || "none");
    setPersonnelModalOpen(true);
  }

  // Handler for Downstream Clients ("Their Clients")
  async function handleAddDownstreamClient() {
    if (!dsName.trim()) {
      toastMutationError("Downstream company name is required");
      return;
    }
    const current = client?.downstreamClients ?? [];
    try {
      await updateClient({
        clientId: client!._id,
        downstreamClients: [
          ...current,
          {
            name: dsName.trim(),
            industry: dsIndustry.trim() || undefined,
            relationshipType: dsRelType,
          },
        ],
      });
      toastMutationSuccess("Downstream client tracked");
      setDsName("");
      setDsIndustry("");
    } catch (error) {
      toastMutationError(error, "Failed to add downstream client");
    }
  }

  return (
    <div className="space-y-6 p-1">
      {/* Top Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/dashboard/clients"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs text-slate-400 transition-colors hover:border-cyan-500/20 hover:text-white"
        >
          &larr; Back to Clients
        </Link>
        <Button type="button" size="sm" onClick={() => setEditOpen(true)} className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold">
          Edit Corporate Profile
        </Button>
      </div>

      {/* Main Corporate Intelligence Card */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0c1222]/90 p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-2xl font-bold text-cyan-400 uppercase border border-cyan-500/20">
              {client.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-white">{client.name}</h1>
                <Badge variant="secondary" className={cn("text-[10px] px-2 py-0.5", status.color)}>
                  {status.label}
                </Badge>
              </div>
              <p className="text-sm font-medium text-slate-400 mt-0.5">{client.company} {client.industry && `· ${client.industry}`}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-slate-300">
            {client.annualRevenue && (
              <Badge variant="outline" className="border-white/10 bg-white/5 py-1 px-2.5">
                <DollarSign className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Revenue: {client.annualRevenue}
              </Badge>
            )}
            {client.companySize && (
              <Badge variant="outline" className="border-white/10 bg-white/5 py-1 px-2.5">
                <Building2 className="w-3.5 h-3.5 mr-1 text-cyan-400" /> Size: {client.companySize}
              </Badge>
            )}
          </div>
        </div>

        {/* Corporate Social Media & Web Hub Bar */}
        <div className="pt-4 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-2">Company Web & Social Hub:</span>
            {client.website && (
              <a href={client.website.startsWith("http") ? client.website : `https://${client.website}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-cyan-400 hover:bg-white/10 transition-all">
                <Globe className="w-3.5 h-3.5 text-cyan-400" /> Website <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>
            )}
            {client.companyLinkedin && (
              <a href={client.companyLinkedin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20 transition-all">
                <Link2 className="w-3.5 h-3.5 text-cyan-400" /> LinkedIn <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>
            )}
            {client.companyTwitter && (
              <a href={client.companyTwitter} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-500/10 border border-sky-500/20 text-sky-300 hover:bg-sky-500/20 transition-all">
                <Link2 className="w-3.5 h-3.5 text-sky-400" /> Twitter/X <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>
            )}
            {client.companyGithub && (
              <a href={client.companyGithub} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 transition-all">
                <Link2 className="w-3.5 h-3.5 text-purple-400" /> GitHub <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>
            )}
          </div>
        </div>

        {/* Intelligence Stats Summary */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-4 border-t border-white/[0.06]">
          <div className="p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Key Personnel Dossiers</span>
            <span className="text-lg font-bold text-white mt-1 block">{client.keyPersonnel?.length ?? 0} Profiles</span>
          </div>
          <div className="p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Their Client Network</span>
            <span className="text-lg font-bold text-cyan-400 mt-1 block">{client.downstreamClients?.length ?? 0} Accounts</span>
          </div>
          <div className="p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Verified Background Checks</span>
            <span className="text-lg font-bold text-emerald-400 mt-1 block">
              {(client.keyPersonnel ?? []).filter((p) => p.backgroundCheckStatus === "verified").length} Cleared
            </span>
          </div>
          <div className="p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Identified Needs</span>
            <span className="text-lg font-bold text-purple-400 mt-1 block">{client.identifiedNeeds?.length ?? 0} Items</span>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="line" className="max-w-full gap-2 overflow-x-auto border-b border-white/[0.08]">
          <TabsTrigger value="network" className="gap-2 text-xs font-semibold">
            <Network className="w-4 h-4 text-cyan-400" /> Personnel Social & Background Dossiers
          </TabsTrigger>
          <TabsTrigger value="their_clients" className="gap-2 text-xs font-semibold">
            <Share2 className="w-4 h-4 text-emerald-400" /> Client's Client Network ({client.downstreamClients?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="deals" className="gap-2 text-xs">
            Deals ({deals?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: WHO'S WHO PERSONNEL & BACKGROUND DOSSIERS */}
        <TabsContent value="network" className="space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Individual Employee Social Media & Intelligence Dossiers</h3>
              <p className="text-xs text-slate-400">Personal social media handles (LinkedIn, Twitter, GitHub, Website), influence mapping, and background audit records.</p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                resetPersonnelForm();
                setPersonnelModalOpen(true);
              }}
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs"
            >
              <UserCheck className="w-3.5 h-3.5 mr-1" /> Add Personnel Dossier
            </Button>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(client.keyPersonnel ?? []).length === 0 ? (
              <div className="col-span-full h-40 flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.06] text-xs text-slate-500">
                <span>No personnel dossiers created yet.</span>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => setPersonnelModalOpen(true)}
                  className="text-cyan-400 text-xs mt-1"
                >
                  + Add first personnel profile
                </Button>
              </div>
            ) : (
              client.keyPersonnel?.map((person) => {
                const influence = INFLUENCE_CONFIG[person.influenceLevel || "neutral"];
                return (
                  <div key={person.id} className="p-5 rounded-xl border border-white/[0.08] bg-[#0c1222] flex flex-col justify-between space-y-4 shadow-lg">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center text-sm">
                            {person.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white">{person.name}</h4>
                            <p className="text-xs text-slate-400">{person.role}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className={cn("text-[10px] px-2 py-0.5", influence.color)}>
                          {influence.label}
                        </Badge>
                      </div>

                      {/* Contact & Social Links */}
                      <div className="space-y-1 text-xs text-slate-300 pt-1 border-t border-white/[0.06]">
                        {person.email && <div className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-slate-500" /><span className="truncate">{person.email}</span></div>}
                        {person.phone && <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-slate-500" /><span>{person.phone}</span></div>}

                        {/* Individual Social Media Icons */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {person.linkedin && (
                            <a href={person.linkedin} target="_blank" rel="noreferrer" className="p-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20" title="LinkedIn">
                              <Link2 className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {person.twitter && (
                            <a href={person.twitter} target="_blank" rel="noreferrer" className="p-1 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 hover:bg-sky-500/20" title="Twitter/X">
                              <Link2 className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {person.github && (
                            <a href={person.github} target="_blank" rel="noreferrer" className="p-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20" title="GitHub">
                              <Link2 className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {person.personalWebsite && (
                            <a href={person.personalWebsite} target="_blank" rel="noreferrer" className="p-1 rounded bg-white/10 text-slate-300 border border-white/20 hover:bg-white/20" title="Personal Site">
                              <Globe className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Personal Interests */}
                      {person.personalInterests && person.personalInterests.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 flex items-center gap-1">
                            <Heart className="w-3 h-3 text-rose-400" /> Personal Interests
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {person.personalInterests.map((interest, i) => (
                              <Badge key={i} variant="outline" className="border-rose-500/20 bg-rose-500/5 text-rose-300 text-[10px]">
                                {interest}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Background Check Indicator */}
                      <div className="pt-2 border-t border-white/[0.06]">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[11px] text-slate-400">Background Check:</span>
                          {person.backgroundCheckStatus === "verified" ? (
                            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px]">
                              <ShieldCheck className="w-3 h-3 mr-1" /> Verified Clean
                            </Badge>
                          ) : person.backgroundCheckStatus === "flagged" ? (
                            <Badge variant="outline" className="border-red-500/30 text-red-400 bg-red-500/10 text-[10px]">
                              <ShieldAlert className="w-3 h-3 mr-1" /> Flagged
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-slate-500/30 text-slate-400 text-[10px]">
                              Pending / None
                            </Badge>
                          )}
                        </div>
                        {person.backgroundCheckNotes && (
                          <p className="text-[11px] text-slate-400 mt-1 bg-white/[0.02] p-2 rounded border border-white/[0.04] italic">
                            "{person.backgroundCheckNotes}"
                          </p>
                        )}
                      </div>
                    </div>

                    <Button type="button" variant="outline" size="sm" onClick={() => handleOpenEditPersonnel(person)} className="w-full text-xs border-white/10">
                      Update Dossier
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* TAB 2: CLIENT'S CLIENT NETWORK ("THEIR CLIENTS") */}
        <TabsContent value="their_clients" className="space-y-6 pt-4">
            <div className="p-5 rounded-xl border border-white/[0.08] bg-[#0c1222] space-y-4">
              <h3 className="text-sm font-semibold text-white">Add Downstream Account / Customer of {client.name}</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  value={dsName}
                  onChange={(e) => setDsName(e.target.value)}
                  placeholder="Downstream Company Name"
                  className="bg-white/5 border-white/10 text-xs text-white"
                />
                <Input
                  value={dsIndustry}
                  onChange={(e) => setDsIndustry(e.target.value)}
                  placeholder="Industry / Vertical"
                  className="bg-white/5 border-white/10 text-xs text-white"
                />
                <Select value={dsRelType} onValueChange={setDsRelType}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Key Account">Key Account</SelectItem>
                    <SelectItem value="Vendor">Vendor</SelectItem>
                    <SelectItem value="Strategic Partner">Strategic Partner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end">
                <Button type="button" size="sm" onClick={handleAddDownstreamClient} className="bg-emerald-500 text-black font-semibold text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Track Downstream Client
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(client.downstreamClients ?? []).length === 0 ? (
                <div className="col-span-full h-32 flex items-center justify-center rounded-xl border border-dashed border-white/[0.06] text-xs text-slate-500">
                  No downstream accounts tracked yet.
                </div>
              ) : (
                client.downstreamClients?.map((ds, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-white/[0.08] bg-[#0c1222] space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-white">{ds.name}</h4>
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px]">
                        {ds.relationshipType}
                      </Badge>
                    </div>
                    {ds.industry && <p className="text-xs text-slate-400">{ds.industry}</p>}
                  </div>
                ))
              )}
            </div>
          </TabsContent>

        <TabsContent value="deals" className="space-y-4 pt-4">
          {deals === undefined ? (
            <div className="space-y-2">
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
            </div>
          ) : deals.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-white/[0.06] text-xs text-slate-500">
              No deals linked to this client yet.
            </div>
          ) : (
            <div className="space-y-2">
              {deals.map((deal) => (
                <div
                  key={deal._id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-[#0c1222]/80 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{deal.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{deal.stage.replace(/_/g, " ")}</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-white">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 0,
                    }).format(deal.value)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Personnel Dossier & Background Check Modal */}
      <Dialog open={personnelModalOpen} onOpenChange={setPersonnelModalOpen}>
        <DialogContent className="bg-[#0c1222] border-white/[0.08] sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingPersonId ? "Edit Personnel Intelligence Dossier" : "New Personnel Intelligence Dossier"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Full Name *</label>
                <Input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="Jane Smith" className="bg-white/5 border-white/10 text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Title / Position *</label>
                <Input value={pRole} onChange={(e) => setPRole(e.target.value)} placeholder="VP of Product" className="bg-white/5 border-white/10 text-white" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Email</label>
                <Input value={pEmail} onChange={(e) => setPEmail(e.target.value)} placeholder="jane@client.com" className="bg-white/5 border-white/10 text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Phone</label>
                <Input value={pPhone} onChange={(e) => setPPhone(e.target.value)} placeholder="+1 (555) 000-0000" className="bg-white/5 border-white/10 text-white" />
              </div>
            </div>

            {/* Social Media Inputs */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">LinkedIn URL</label>
                <Input value={pLinkedin} onChange={(e) => setPLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." className="bg-white/5 border-white/10 text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Twitter / X Handle</label>
                <Input value={pTwitter} onChange={(e) => setPTwitter(e.target.value)} placeholder="https://x.com/..." className="bg-white/5 border-white/10 text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">GitHub Profile</label>
                <Input value={pGithub} onChange={(e) => setPGithub(e.target.value)} placeholder="https://github.com/..." className="bg-white/5 border-white/10 text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Personal Website / Blog</label>
                <Input value={pPersonalWebsite} onChange={(e) => setPPersonalWebsite(e.target.value)} placeholder="https://..." className="bg-white/5 border-white/10 text-white" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Influence & Buying Role</label>
                <Select value={pInfluence} onValueChange={(v) => setPInfluence(v as any)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="champion">Champion (Internal Supporter)</SelectItem>
                    <SelectItem value="decision_maker">Decision Maker</SelectItem>
                    <SelectItem value="blocker">Blocker</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Background Check Status</label>
                <Select value={pBgStatus} onValueChange={(v) => setPBgStatus(v as any)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None / Unchecked</SelectItem>
                    <SelectItem value="pending">Pending Audit</SelectItem>
                    <SelectItem value="verified">Verified Clean</SelectItem>
                    <SelectItem value="flagged">Flagged Notes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-medium">Personal Interests & Hobbies (comma-separated)</label>
              <Input value={pInterests} onChange={(e) => setPInterests(e.target.value)} placeholder="Sailing, Machine Learning, Angel Investing" className="bg-white/5 border-white/10 text-white" />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-medium">Background Check & Compliance Notes</label>
              <Textarea
                value={pBgNotes}
                onChange={(e) => setPBgNotes(e.target.value)}
                placeholder="Audit findings, public profile verification, previous leadership roles..."
                rows={3}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setPersonnelModalOpen(false)} className="text-slate-400">Cancel</Button>
              <Button type="button" onClick={handleSavePersonnel} className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold">
                Save Dossier
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#0c1222] border-white/[0.08] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Corporate Profile</DialogTitle>
          </DialogHeader>
          <ClientForm
            client={client}
            onSuccess={() => setEditOpen(false)}
            onCancel={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
