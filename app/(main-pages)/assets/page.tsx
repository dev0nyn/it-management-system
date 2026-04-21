"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  Filter,
  Laptop,
  Monitor,
  Smartphone,
  HardDrive,
  Printer,
  Wifi,
  Package,
  User,
  Tag,
  Pencil,
  Trash2,
  UserPlus,
  UserMinus,
  History,
  X,
  RefreshCw,
  Download,
} from "lucide-react";
import { authFetch, getApiBase, getSessionUser } from "@/lib/api-client";

type AssetStatus = "in_stock" | "assigned" | "repair" | "retired";
type AssetType = "laptop" | "monitor" | "phone" | "server" | "printer" | "network" | "peripheral";

interface Asset {
  id: string;
  tag: string;
  name: string;
  type: AssetType;
  serial: string;
  status: AssetStatus;
  assignedTo: string | null;
  assignedToName: string | null;
  purchaseDate: string | null;
  warrantyExpiry: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AssignmentHistory {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  assignedAt: string;
  unassignedAt: string | null;
}

interface UserSearchResult {
  id: string;
  name: string;
  email: string;
  role: string;
}

const typeIcons: Record<AssetType, React.ElementType> = {
  laptop: Laptop,
  monitor: Monitor,
  phone: Smartphone,
  server: HardDrive,
  printer: Printer,
  network: Wifi,
  peripheral: Package,
};

const statusConfig: Record<AssetStatus, { label: string; className: string }> = {
  in_stock: { label: "In Stock", className: "bg-emerald-100/80 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" },
  assigned: { label: "Assigned", className: "bg-blue-100/80 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400" },
  repair: { label: "In Repair", className: "bg-amber-100/80 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" },
  retired: { label: "Retired", className: "bg-slate-100/80 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400" },
};

const ASSET_TYPES: AssetType[] = ["laptop", "monitor", "phone", "server", "printer", "network", "peripheral"];
const ASSET_STATUSES: AssetStatus[] = ["in_stock", "assigned", "repair", "retired"];

const emptyForm = {
  tag: "",
  name: "",
  type: "laptop" as AssetType,
  serial: "",
  status: "in_stock" as AssetStatus,
  purchaseDate: "",
  warrantyExpiry: "",
};

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [view, setView] = useState<"table" | "grid">("table");
  const [page, setPage] = useState(1);

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [assignAsset, setAssignAsset] = useState<Asset | null>(null);
  const [deleteAsset, setDeleteAsset] = useState<Asset | null>(null);

  // Form state
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Assign dialog
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [assignHistory, setAssignHistory] = useState<AssignmentHistory[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [reassignPending, setReassignPending] = useState(false);
  const userSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Unassign / delete error state
  const [unassignTarget, setUnassignTarget] = useState<Asset | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const session = getSessionUser();
  const canMutate = session?.role === "admin" || session?.role === "it_staff";
  const base = getApiBase();

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set("search", search);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      const res = await authFetch(`${base}/api/v1/assets?${params}`);
      if (res.ok) {
        const json = await res.json();
        setAssets(json.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, base]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Debounced search
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  // User search for assign dialog
  useEffect(() => {
    if (!assignAsset) return;
    if (userSearchTimer.current) clearTimeout(userSearchTimer.current);
    userSearchTimer.current = setTimeout(async () => {
      const params = new URLSearchParams();
      if (userSearch) params.set("search", userSearch);
      const res = await authFetch(`${base}/api/v1/assets/users?${params}`);
      if (res.ok) {
        const json = await res.json();
        setUserResults(json.data ?? []);
      }
    }, 300);
    return () => {
      if (userSearchTimer.current) clearTimeout(userSearchTimer.current);
    };
  }, [userSearch, assignAsset, base]);

  const openAssignDialog = async (asset: Asset) => {
    setAssignAsset(asset);
    setSelectedUser(null);
    setUserSearch("");
    setUserResults([]);
    setAssignLoading(true);
    try {
      const res = await authFetch(`${base}/api/v1/assets/${asset.id}/history`);
      if (res.ok) {
        const json = await res.json();
        setAssignHistory(json.data ?? []);
      }
    } finally {
      setAssignLoading(false);
    }
  };

  const handleAssign = async (force = false) => {
    if (!assignAsset || !selectedUser) return;
    setSaving(true);
    setAssignError("");
    try {
      const res = await authFetch(`${base}/api/v1/assets/${assignAsset.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUser.id, ...(force && { force: true }) }),
      });
      if (!res.ok) {
        const err = await res.json();
        if (err.error?.code === "ALREADY_ASSIGNED" && !force) {
          setReassignPending(true);
          return;
        }
        setAssignError("Failed to assign asset.");
        return;
      }
      setAssignAsset(null);
      setReassignPending(false);
      fetchAssets();
    } catch {
      setAssignError("Failed to assign asset.");
    } finally {
      setSaving(false);
    }
  };

  const handleUnassign = (asset: Asset) => {
    setUnassignTarget(asset);
  };

  const confirmUnassign = async () => {
    if (!unassignTarget) return;
    setSaving(true);
    try {
      const res = await authFetch(`${base}/api/v1/assets/${unassignTarget.id}/unassign`, { method: "POST" });
      if (res.ok) {
        setUnassignTarget(null);
        fetchAssets();
      } else {
        setUnassignTarget(null);
      }
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    setForm(emptyForm);
    setFormError("");
    setCreateOpen(true);
  };

  const openEdit = (asset: Asset) => {
    setForm({
      tag: asset.tag,
      name: asset.name,
      type: asset.type,
      serial: asset.serial,
      status: asset.status,
      purchaseDate: asset.purchaseDate ?? "",
      warrantyExpiry: asset.warrantyExpiry ?? "",
    });
    setFormError("");
    setEditAsset(asset);
  };

  const handleSave = async () => {
    if (!form.tag || !form.name || !form.serial) {
      setFormError("Tag, name, and serial are required.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        tag: form.tag,
        name: form.name,
        type: form.type,
        serial: form.serial,
        status: form.status,
        ...(form.purchaseDate && { purchaseDate: form.purchaseDate }),
        ...(form.warrantyExpiry && { warrantyExpiry: form.warrantyExpiry }),
      };

      const url = editAsset
        ? `${base}/api/v1/assets/${editAsset.id}`
        : `${base}/api/v1/assets`;
      const method = editAsset ? "PATCH" : "POST";

      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        if (err.error?.code === "TAG_CONFLICT") {
          setFormError("Asset tag is already in use.");
        } else {
          setFormError("Failed to save asset.");
        }
        return;
      }

      setCreateOpen(false);
      setEditAsset(null);
      fetchAssets();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteAsset) return;
    setSaving(true);
    setDeleteError("");
    try {
      const res = await authFetch(`${base}/api/v1/assets/${deleteAsset.id}`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        setDeleteAsset(null);
        fetchAssets();
      } else {
        setDeleteError("Failed to delete asset. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  function exportCsv() {
    const rows = [
      ["Tag", "Name", "Type", "Serial", "Status", "Assigned To", "Purchase Date", "Warranty Expiry"],
      ...assets.map((a) => [
        a.tag, a.name, a.type, a.serial, a.status,
        a.assignedToName ?? "",
        a.purchaseDate ? new Date(a.purchaseDate).toLocaleDateString() : "",
        a.warrantyExpiry ? new Date(a.warrantyExpiry).toLocaleDateString() : "",
      ]),
    ];
    const csv = "\uFEFF" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url; a.download = `assets-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const statusCounts = {
    total: assets.length,
    in_stock: assets.filter((a) => a.status === "in_stock").length,
    assigned: assets.filter((a) => a.status === "assigned").length,
    repair: assets.filter((a) => a.status === "repair").length,
    retired: assets.filter((a) => a.status === "retired").length,
  };

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 md:p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 dark:text-white">Assets</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Track and manage IT hardware inventory</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAssets}
            disabled={loading}
            title="Refresh"
            className="flex items-center justify-center h-9 w-9 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={exportCsv}
            disabled={assets.length === 0}
            title="Export CSV"
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-700 disabled:opacity-40 transition-colors text-xs font-medium shrink-0"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          {canMutate && (
            <Button onClick={openCreate} className="bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg transition-all rounded-xl h-9 px-4">
              <Plus className="h-4 w-4 mr-2" />
              Add Asset
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: "Total Assets", value: statusCounts.total, color: "text-slate-800 dark:text-white" },
          { label: "In Stock", value: statusCounts.in_stock, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Assigned", value: statusCounts.assigned, color: "text-blue-600 dark:text-blue-400" },
          { label: "In Repair", value: statusCounts.repair, color: "text-amber-600 dark:text-amber-400" },
          { label: "Retired", value: statusCounts.retired, color: "text-slate-400" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border bg-white dark:bg-zinc-900 p-4 shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10 text-center">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Search & Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by tag, name, or serial…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 rounded-xl bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-white/10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v: string | null) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-40 h-10 rounded-xl border-slate-200 dark:border-white/10">
            <Filter className="h-4 w-4 mr-2 text-slate-400" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {ASSET_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
          {(["table", "grid"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-2 text-sm font-medium transition-colors capitalize ${view === v ? "bg-red-600 text-white" : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800"}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading assets…</div>
      ) : assets.length === 0 ? (
        <div className="text-center py-16 text-slate-400">No assets found.</div>
      ) : view === "table" ? (
        <div className="rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10 overflow-hidden">
          <div className="hidden lg:grid grid-cols-[90px_1fr_120px_110px_160px_130px_120px] gap-4 px-5 py-3 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-zinc-800/50 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <span>Tag</span>
            <span>Asset</span>
            <span>Serial</span>
            <span>Status</span>
            <span>Assigned To</span>
            <span>Warranty</span>
            {canMutate && <span>Actions</span>}
          </div>

          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {assets.map((asset) => {
              const TypeIcon = typeIcons[asset.type];
              const status = statusConfig[asset.status];
              return (
                <div
                  key={asset.id}
                  className="grid grid-cols-1 lg:grid-cols-[90px_1fr_120px_110px_160px_130px_120px] gap-2 lg:gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors group"
                >
                  <div className="flex items-center">
                    <span className="text-sm font-mono font-semibold text-red-600 dark:text-red-400">{asset.tag}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                      <TypeIcon className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{asset.name}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 capitalize">{asset.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="lg:hidden text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 shrink-0">Serial:</span>
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                      <Tag className="h-3 w-3 shrink-0 lg:block hidden" />
                      {asset.serial.slice(-8)}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${status.className}`}>{status.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {asset.assignedToName ? (
                      <>
                        <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="text-sm text-slate-600 dark:text-slate-300 truncate">{asset.assignedToName}</span>
                      </>
                    ) : (
                      <span className="text-sm text-slate-400 italic">Unassigned</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="lg:hidden text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 shrink-0">Warranty:</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {asset.warrantyExpiry
                        ? new Date(asset.warrantyExpiry).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                        : "—"}
                    </span>
                  </div>
                  {canMutate && (
                    <div className="flex items-center gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(asset)}
                        title="Edit"
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {asset.status === "assigned" ? (
                        <button
                          onClick={() => handleUnassign(asset)}
                          title="Unassign"
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-400 hover:text-amber-600 transition-colors"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => openAssignDialog(asset)}
                          title="Assign"
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => openAssignDialog(asset)}
                        title="Assignment history"
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                      >
                        <History className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteAsset(asset)}
                        title="Delete"
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {assets.map((asset) => {
            const TypeIcon = typeIcons[asset.type];
            const status = statusConfig[asset.status];
            return (
              <div key={asset.id} className="rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-11 w-11 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                    <TypeIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${status.className}`}>{status.label}</span>
                </div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-1 truncate">{asset.name}</h3>
                <p className="text-xs text-red-600 dark:text-red-400 font-mono font-semibold mb-3">{asset.tag}</p>
                <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3 shrink-0" />
                    <span className="truncate">{asset.assignedToName || "Unassigned"}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
                    <span>Warranty: {asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—"}</span>
                  </div>
                </div>
                {canMutate && (
                  <div className="flex gap-1 mt-3 pt-3 border-t border-slate-100 dark:border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(asset)} className="flex-1 text-xs py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-300 transition-colors">Edit</button>
                    <button onClick={() => openAssignDialog(asset)} className="flex-1 text-xs py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-300 transition-colors">Assign</button>
                    <button onClick={() => setDeleteAsset(asset)} className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-red-100 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-600 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <span>Showing {assets.length} assets</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-lg" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="px-2">Page {page}</span>
          <Button variant="outline" size="sm" className="rounded-lg" disabled={assets.length < 20} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Dialog open={createOpen || !!editAsset} onOpenChange={(open: boolean) => { if (!open) { setCreateOpen(false); setEditAsset(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editAsset ? "Edit Asset" : "Add Asset"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tag">Tag *</Label>
                <Input id="tag" value={form.tag} onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value }))} placeholder="A-001" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="serial">Serial *</Label>
                <Input id="serial" value={form.serial} onChange={(e) => setForm((f) => ({ ...f, serial: e.target.value }))} placeholder="SN-…" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder='MacBook Pro 16"' />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v: string | null) => { if (v) setForm((f) => ({ ...f, type: v as AssetType })); }}>
                  <SelectTrigger><span className="truncate capitalize">{form.type}</span></SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v: string | null) => { if (v) setForm((f) => ({ ...f, status: v as AssetStatus })); }}>
                  <SelectTrigger><span className="truncate">{statusConfig[form.status]?.label ?? form.status}</span></SelectTrigger>
                  <SelectContent>
                    {ASSET_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="purchaseDate">Purchase Date</Label>
                <Input id="purchaseDate" type="date" value={form.purchaseDate} onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="warrantyExpiry">Warranty Expiry</Label>
                <Input id="warrantyExpiry" type="date" value={form.warrantyExpiry} onChange={(e) => setForm((f) => ({ ...f, warrantyExpiry: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); setEditAsset(null); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white">
              {saving ? "Saving…" : editAsset ? "Save Changes" : "Create Asset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={!!assignAsset} onOpenChange={(open: boolean) => { if (!open) { setAssignAsset(null); setReassignPending(false); setAssignError(""); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Asset — {assignAsset?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Current holder */}
            {assignAsset?.assignedToName && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-sm text-blue-700 dark:text-blue-300">
                <User className="h-4 w-4 shrink-0" />
                <span>Currently assigned to <strong>{assignAsset.assignedToName}</strong></span>
              </div>
            )}

            {/* User search */}
            <div className="space-y-1.5">
              <Label>Search User</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Name or email…"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {userResults.length > 0 && (
                <div className="border rounded-xl divide-y divide-slate-100 dark:divide-white/5 max-h-48 overflow-y-auto">
                  {userResults.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => { setSelectedUser(u); setUserSearch(u.name); setUserResults([]); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors ${selectedUser?.id === u.id ? "bg-red-50 dark:bg-red-500/10" : ""}`}
                    >
                      <div className="h-7 w-7 rounded-full bg-slate-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{u.name}</p>
                        <p className="text-xs text-slate-400 truncate">{u.email}</p>
                      </div>
                      <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-700 text-slate-500 capitalize shrink-0">{u.role.replace("_", " ")}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedUser && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-sm text-emerald-700 dark:text-emerald-300">
                  <span>Selected: <strong>{selectedUser.name}</strong></span>
                  <button onClick={() => { setSelectedUser(null); setUserSearch(""); }} className="text-emerald-500 hover:text-emerald-700">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Assignment history */}
            <div className="space-y-1.5">
              <Label>Assignment History</Label>
              {assignLoading ? (
                <p className="text-xs text-slate-400 py-2">Loading…</p>
              ) : assignHistory.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">No assignment history.</p>
              ) : (
                <div className="border rounded-xl divide-y divide-slate-100 dark:divide-white/5 max-h-40 overflow-y-auto">
                  {[...assignHistory].reverse().map((h) => (
                    <div key={h.id} className="flex items-center justify-between px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2 min-w-0">
                        <User className="h-3 w-3 shrink-0 text-slate-400" />
                        <span className="truncate">{h.userName ?? h.userId}</span>
                      </div>
                      <div className="text-right shrink-0 ml-2 text-slate-400">
                        <div>{new Date(h.assignedAt).toLocaleDateString()}</div>
                        {h.unassignedAt && <div className="text-slate-300">→ {new Date(h.unassignedAt).toLocaleDateString()}</div>}
                        {!h.unassignedAt && <div className="text-emerald-500 font-medium">Active</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {reassignPending && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
              This asset is currently assigned to <strong>{assignAsset?.assignedToName}</strong>. Confirm to reassign it to <strong>{selectedUser?.name}</strong>.
            </div>
          )}
          {assignError && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl px-3 py-2">{assignError}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAssignAsset(null); setReassignPending(false); setAssignError(""); }}>Close</Button>
            {reassignPending ? (
              <Button onClick={() => handleAssign(true)} disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white">
                {saving ? "Reassigning…" : "Confirm Reassign"}
              </Button>
            ) : (
              <Button onClick={() => handleAssign(false)} disabled={!selectedUser || saving} className="bg-red-600 hover:bg-red-700 text-white">
                {saving ? "Assigning…" : "Assign"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unassign Confirmation */}
      <Dialog open={!!unassignTarget} onOpenChange={(open: boolean) => { if (!open) setUnassignTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Unassign Asset</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 dark:text-slate-300 py-2">
            Unassign <strong>{unassignTarget?.name}</strong> from <strong>{unassignTarget?.assignedToName}</strong>? The asset will return to stock.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnassignTarget(null)}>Cancel</Button>
            <Button onClick={confirmUnassign} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white">
              {saving ? "Unassigning…" : "Unassign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteAsset} onOpenChange={(open: boolean) => { if (!open) { setDeleteAsset(null); setDeleteError(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Asset</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 dark:text-slate-300 py-2">
            Are you sure you want to delete <strong>{deleteAsset?.name}</strong> ({deleteAsset?.tag})? This action cannot be undone.
          </p>
          {deleteError && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl px-3 py-2">{deleteError}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteAsset(null); setDeleteError(""); }}>Cancel</Button>
            <Button onClick={handleDelete} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white">
              {saving ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
