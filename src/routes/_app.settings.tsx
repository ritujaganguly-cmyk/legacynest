import type React from "react";
import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bell, Fingerprint, KeyRound, LogOut, Shield, Smartphone, UserCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/lib/session-store";
import { dataService } from "@/lib/data/mock";
import { DataRights } from "@/components/compliance/DataRights";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Account & Security — LegacyNest" }] }),
  component: SettingsPage,
});

const SECURITY_STORAGE_KEY = (userId: string) => `legacynest.security.v1.${userId}`;

type SecurityPrefs = {
  twoFactor: boolean;
  biometric: boolean;
  trustedDevices: boolean;
  planReminders: boolean;
  caregiverActivity: boolean;
};

const DEFAULT_SECURITY: SecurityPrefs = {
  twoFactor: true,
  biometric: true,
  trustedDevices: false,
  planReminders: true,
  caregiverActivity: false,
};

function loadSecurityPrefs(userId: string): SecurityPrefs {
  try {
    const raw = localStorage.getItem(SECURITY_STORAGE_KEY(userId));
    if (raw) return { ...DEFAULT_SECURITY, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_SECURITY;
}

function saveSecurityPrefs(userId: string, prefs: SecurityPrefs) {
  try {
    localStorage.setItem(SECURITY_STORAGE_KEY(userId), JSON.stringify(prefs));
  } catch { /* ignore */ }
}

function SettingsPage() {
  const { user, signOut } = useSession();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [securityPrefs, setSecurityPrefs] = useState<SecurityPrefs>(DEFAULT_SECURITY);
  const [savingSecurity, setSavingSecurity] = useState(false);

  // Load existing profile + security prefs
  useEffect(() => {
    if (!user) return;
    setSecurityPrefs(loadSecurityPrefs(user.id));
    // Display name is stored in localStorage (separate from parent_profile.full_name)
    try {
      const saved = localStorage.getItem(`legacynest.displayname.${user.id}`);
      if (saved) setDisplayName(saved);
    } catch { /* ignore */ }
    // Phone comes from parent profile
    dataService.getParentProfile().then((p) => {
      if (p) {
        const profile = p as Record<string, unknown>;
        if (profile.phone) setPhone(profile.phone as string);
      }
    });
  }, [user]);

  async function handleSaveProfile() {
    setSaving(true);
    try {
      // Save display name to localStorage only — does NOT overwrite parent_profile.full_name
      if (user) {
        try { localStorage.setItem(`legacynest.displayname.${user.id}`, displayName); } catch { /* ignore */ }
      }
      // Save phone to parent_profile only
      if (phone) await dataService.updateProfile("", phone);
      toast.success("Profile updated successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save profile.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  function updatePref(key: keyof SecurityPrefs, value: boolean) {
    setSecurityPrefs((prev) => ({ ...prev, [key]: value }));
  }

  function handleSaveSecurity() {
    if (!user) return;
    setSavingSecurity(true);
    saveSecurityPrefs(user.id, securityPrefs);
    setTimeout(() => {
      setSavingSecurity(false);
      toast.success("Preferences saved.");
    }, 300);
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

      {/* Profile */}
      <Section title="Profile" icon={UserCircle}>
        <div className="py-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground" htmlFor="displayName">Display Name</label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground" htmlFor="phone">Phone</label>
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
            <div className="text-sm font-medium text-foreground px-3 py-2.5">{user?.email ?? "—"}</div>
          </div>

          <div className="space-y-1.5">
            <div className="text-sm text-muted-foreground">Account ID</div>
            <div className="text-sm font-mono font-medium text-foreground px-3 py-2.5 break-all">{user?.id ?? "—"}</div>
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground font-semibold px-4 py-2.5 hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Profile"}
          </button>
        </div>
      </Section>

      {/* Security */}
      <Section title="Security" icon={Shield}>
        <Toggle
          icon={KeyRound}
          label="Two-factor authentication"
          desc="Require a code from your authenticator on every sign-in."
          checked={securityPrefs.twoFactor}
          onChange={(v) => updatePref("twoFactor", v)}
        />
        <Toggle
          icon={Fingerprint}
          label="Biometric unlock"
          desc="Use fingerprint or Face ID on supported devices."
          checked={securityPrefs.biometric}
          onChange={(v) => updatePref("biometric", v)}
        />
        <Toggle
          icon={Smartphone}
          label="Trusted devices only"
          desc="Block sign-ins from devices you haven't approved."
          checked={securityPrefs.trustedDevices}
          onChange={(v) => updatePref("trustedDevices", v)}
        />
        <div className="pt-3">
          <button
            onClick={handleSaveSecurity}
            disabled={savingSecurity}
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground font-semibold px-4 py-2.5 hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {savingSecurity ? "Saving…" : "Save Security Settings"}
          </button>
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Notifications" icon={Bell}>
        <Toggle
          icon={Bell}
          label="Plan reminders"
          desc="Monthly check-ins to keep your legacy plan current."
          checked={securityPrefs.planReminders}
          onChange={(v) => updatePref("planReminders", v)}
        />
        <Toggle
          icon={Bell}
          label="Caregiver activity"
          desc="Get notified when a caregiver updates a record."
          checked={securityPrefs.caregiverActivity}
          onChange={(v) => updatePref("caregiverActivity", v)}
        />
        <div className="pt-3">
          <button
            onClick={handleSaveSecurity}
            disabled={savingSecurity}
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground font-semibold px-4 py-2.5 hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {savingSecurity ? "Saving…" : "Save Notifications"}
          </button>
        </div>
      </Section>

      {/* Data & Privacy */}
      <Section title="Data & Privacy" icon={ShieldCheck}>
        <div className="py-4">
          <DataRights />
        </div>
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
  checked,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
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
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-9 appearance-none rounded-full bg-surface-container relative cursor-pointer transition-colors checked:bg-primary before:absolute before:top-0.5 before:left-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-4"
      />
    </label>
  );
}
