"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { authFetch, getApiBase } from "@/lib/api-client";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
] as const;

const CATEGORIES = [
  "Hardware",
  "Software",
  "Network",
  "Infrastructure",
  "Security",
  "Access",
  "Other",
];

type Priority = (typeof PRIORITIES)[number]["value"];

interface FormState {
  title: string;
  description: string;
  priority: Priority;
  category: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  priority: "medium",
  category: "Hardware",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TicketSubmitSheet({ open, onOpenChange, onSuccess }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function handleClose(value: boolean) {
    if (!value) {
      // Reset on close
      setForm(EMPTY_FORM);
      setError(null);
      setSubmitted(false);
    }
    onOpenChange(value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.title.length > 120) {
      setError("Title must be 120 characters or fewer.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authFetch(`${getApiBase()}/api/v1/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(
          data?.error?.message ?? "Failed to submit ticket. Please try again."
        );
        return;
      }

      setSubmitted(true);
      onSuccess?.();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const titleRemaining = 120 - form.title.length;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="flex flex-col w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-2">
          <SheetTitle>Submit a Ticket</SheetTitle>
          <SheetDescription>
            Describe your issue and our IT team will be notified.
          </SheetDescription>
        </SheetHeader>

        {submitted ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
            <div className="h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-white">
              Ticket submitted!
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              IT staff have been notified and will follow up shortly.
            </p>
            <Button
              className="mt-4 bg-red-600 hover:bg-red-700 text-white rounded-xl"
              onClick={() => handleClose(false)}
            >
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 gap-5 px-4 py-2">
            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Title <span className="text-red-500">*</span>
                </label>
                <span
                  className={`text-xs tabular-nums ${
                    titleRemaining < 20
                      ? "text-red-500"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {titleRemaining} left
                </span>
              </div>
              <Input
                placeholder="Brief description of the issue"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                maxLength={120}
                required
                className="rounded-xl bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-white/10"
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                placeholder="Provide details about the issue — steps to reproduce, impact, etc."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                required
                rows={5}
                className="w-full resize-none rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-800 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 dark:focus:border-red-500/50 transition-colors"
              />
            </div>

            {/* Priority */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Priority
              </label>
              <Select value={form.priority} onValueChange={(v: string | null) => { if (v) setForm((f) => ({ ...f, priority: v as Priority })); }}>
                <SelectTrigger className="w-full rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-800 h-10">
                  <span className="truncate">{PRIORITIES.find(p => p.value === form.priority)?.label ?? form.priority}</span>
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Category
              </label>
              <Select value={form.category} onValueChange={(v: string | null) => { if (v) setForm((f) => ({ ...f, category: v })); }}>
                <SelectTrigger className="w-full rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-800 h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-3 py-2.5">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <SheetFooter className="px-0 pb-0 mt-auto">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl h-10"
              >
                {isSubmitting ? "Submitting…" : "Submit Ticket"}
              </Button>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
