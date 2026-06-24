import type React from "react";
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bell, Fingerprint, KeyRound, LogOut, Shield, Smartphone, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/lib/session-store";
import { dataService } from "@/lib/data/mock";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Account & Security — LegacyNest" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, signOut } = useSession();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSaveProfile() {
    setSaving(true);
    try {
      const ok = await dataService.updateProfile(displayName, phone || undefined);
      if (ok) {
        toast.success("Profile updated successfully.");
      } else {
        toast.error("Failed to update profile. Please try again.");
      }
    } catch {
      toast.error("An error occurred while saving your profile.");
    } finally {
      setSaving(false);
    }
  }

  function handleSignOut() {
    signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Account & Security</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your profile, security keys, and notification preferences.
        </p>
      </div>

      <Section title="Profile" icon={UserCircle}>
        <div className="py-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground" htmlFor="displayName">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground" htmlFor="phone">
              Phone
            </label>
            <input
              id="phone"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter phone number"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
          </div>

          <div className="space-y-1.5">
            <div className="text-sm text-muted-foreground">Email</div>
            <div className="text-sm font-medium text-foreground px-3 py-2.5">
              {user?.email ?? "—"}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-sm text-muted-foreground">Account ID</div>
            <div className="text-sm font-mono font-medium text-foreground px-3 py-2.5">
              {user?.id ?? "—"}
            </div>
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground font-semibold px-4 py-2.5 hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Save Profile"}
          </button>
        </div>
      </Section>

      <Section title="Security" icon={Shield}>
        <Toggle
          icon={KeyRound}
          label="Two-factor authentication"
          desc="Require a code from your authenticator on every sign-in."
          defaultOn
        />
        <Toggle
          icon={Fingerprint}
          label="Biometric unlock"
          desc="Use fingerprint or Face ID on supported devices."
          defaultOn
        />
        <Toggle
          icon={Smartphone}
          label="Trusted devices only"
          desc="Block sign-ins from devices you haven't approved."
        />
      </Section>

      <Section title="Notifications" icon={Bell}>
        <Toggle
          icon={Bell}
          label="Plan reminders"
          desc="Monthly check-ins to keep your legacy plan current."
          defaultOn
        />
        <Toggle
          icon={Bell}
          label="Caregiver activity"
          desc="Get notified when a caregiver updates a record."
        />
      </Section>

      <button
        onClick={handleSignOut}
        className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive font-semibold px-4 py-2.5 hover:bg-destructive/10 transition-colors"
      >
        <LogOut className="h-4 w-4" /> Sign out securely
      </button>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="legacy-card p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

function Toggle({
  icon: Icon,
  label,
  desc,
  defaultOn,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
  defaultOn?: boolean;
}) {
  const [checked, setChecked] = useState(!!defaultOn);

  return (
    <label className="py-3 grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3 items-center cursor-pointer">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
        className="h-5 w-9 appearance-none rounded-full bg-surface-container relative cursor-pointer transition-colors checked:bg-primary before:absolute before:top-0.5 before:left-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-4"
      />
    </label>
  );
}
