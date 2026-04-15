"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type Role = "admin" | "it_staff" | "end_user";

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

interface UserFormSheetProps {
  mode: "create" | "edit";
  user?: ApiUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function UserFormSheet({
  mode,
  user,
  open,
  onOpenChange,
  onSuccess,
}: UserFormSheetProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("end_user");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(mode === "edit" && user ? user.name : "");
      setEmail(mode === "edit" && user ? user.email : "");
      setPassword("");
      setRole(mode === "edit" && user ? user.role : "end_user");
      setError(null);
    }
  }, [open, mode, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res =
        mode === "create"
          ? await authFetch("/api/v1/users", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name, email, password, role }),
            })
          : await authFetch(`/api/v1/users/${user!.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name, email, role }),
            });

      if (res.ok) {
        onSuccess();
        onOpenChange(false);
        return;
      }

      const data = await res.json();
      if (data.error?.code === "EMAIL_CONFLICT") {
        setError("This email is already in use.");
      } else if (data.error?.code === "VALIDATION_ERROR") {
        const fieldErrors = data.error.details?.fieldErrors as
          | Record<string, string[]>
          | undefined;
        if (fieldErrors) {
          const messages = Object.entries(fieldErrors)
            .flatMap(([field, errs]) =>
              errs.map((e) => `${field}: ${e}`)
            )
            .join(". ");
          setError(messages || "Please check your input and try again.");
        } else {
          setError("Please check your input and try again.");
        }
      } else {
        setError("Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-0 w-full sm:max-w-md">
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-slate-100 dark:border-white/10">
          <SheetTitle>{mode === "create" ? "Add User" : "Edit User"}</SheetTitle>
          <SheetDescription>
            {mode === "create"
              ? "Create a new user account and assign a role."
              : "Update name, email, or role for this user."}
          </SheetDescription>
        </SheetHeader>

        <form
          id="user-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              required
              autoComplete="off"
              className="h-10 rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Email <span className="text-red-500">*</span>
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
              autoComplete="off"
              className="h-10 rounded-xl"
            />
          </div>

          {mode === "create" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Password <span className="text-red-500">*</span>
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
                minLength={8}
                autoComplete="new-password"
                className="h-10 rounded-xl"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="h-10 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-800 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/30 transition-colors"
            >
              <option value="end_user">End User</option>
              <option value="it_staff">IT Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl px-3 py-2">
              {error}
            </p>
          )}
        </form>

        <SheetFooter className="px-5 pb-5 pt-4 border-t border-slate-100 dark:border-white/10 flex flex-row gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="flex-1 rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="user-form"
            disabled={isSubmitting}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl"
          >
            {isSubmitting
              ? "Saving..."
              : mode === "create"
              ? "Create User"
              : "Save Changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
