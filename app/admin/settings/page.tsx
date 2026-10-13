'use client';

import { useEffect, useState } from 'react';
import {
  Settings,
  Shield,
  Save,
  Bell,
  AlertTriangle,
  UserCheck,
  CreditCard,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { AppSettings } from '@/lib/server/admin/admin-store';
import { toast } from 'sonner';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/admin/settings');
        const data = await res.json();
        if (data.success && data.data) {
          setSettings(data.data);
        }
      } catch {
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    }
    void fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Platform settings updated successfully');
        setSettings(data.data.settings);
      } else {
        toast.error(data.error || 'Failed to update settings');
      }
    } catch {
      toast.error('Network error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="h-64 rounded-2xl bg-muted/40 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
          <Settings className="w-6 h-6 text-violet-500" />
          Global Platform Settings & Feature Gates
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure signup allowances, system maintenance banners, and platform-wide monetization modes.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: User Registration Controls */}
        <div className="p-6 rounded-2xl border border-border/60 bg-card/60 space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-violet-500" />
            Registration & Signup Policy
          </h2>

          <div className="flex items-center justify-between py-2 border-b border-border/40">
            <div>
              <div className="text-xs font-semibold text-foreground">Allow New User Registrations</div>
              <div className="text-[11px] text-muted-foreground">
                When disabled, new signups are blocked and visitors are notified registrations are paused.
              </div>
            </div>
            <Switch
              checked={settings.allowRegistrations}
              onCheckedChange={(val) => setSettings({ ...settings, allowRegistrations: val })}
            />
          </div>

          <div className="space-y-1.5 pt-2">
            <Label className="text-xs font-semibold">Default Tokens Credited upon Sign-Up</Label>
            <Input
              type="number"
              value={settings.defaultTokensOnSignup}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  defaultTokensOnSignup: parseInt(e.target.value) || 0,
                })
              }
              className="text-xs max-w-xs h-8"
            />
            <p className="text-[11px] text-muted-foreground">
              New accounts automatically start with this token allowance (standard: 250,000).
            </p>
          </div>

          <div className="space-y-1.5 pt-2">
            <Label className="text-xs font-semibold">Free Tier Daily Course Generation Limit</Label>
            <Input
              type="number"
              value={settings.freeTierDailyCourseLimit}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  freeTierDailyCourseLimit: parseInt(e.target.value) || 1,
                })
              }
              className="text-xs max-w-xs h-8"
            />
          </div>
        </div>

        {/* Section 2: Platform Maintenance & Announcements */}
        <div className="p-6 rounded-2xl border border-border/60 bg-card/60 space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Maintenance Mode & Announcements
          </h2>

          <div className="flex items-center justify-between py-2 border-b border-border/40">
            <div>
              <div className="text-xs font-semibold text-foreground">Maintenance Mode</div>
              <div className="text-[11px] text-muted-foreground">
                Displays a maintenance notice to standard users while allowing administrators access.
              </div>
            </div>
            <Switch
              checked={settings.maintenanceMode}
              onCheckedChange={(val) => setSettings({ ...settings, maintenanceMode: val })}
            />
          </div>

          <div className="space-y-1.5 pt-2">
            <Label className="text-xs font-semibold">Maintenance Notice Message</Label>
            <Input
              value={settings.maintenanceMessage}
              onChange={(e) => setSettings({ ...settings, maintenanceMessage: e.target.value })}
              className="text-xs h-8"
            />
          </div>

          <div className="space-y-1.5 pt-2">
            <Label className="text-xs font-semibold">System Announcement Banner</Label>
            <Input
              value={settings.systemAnnouncement}
              onChange={(e) => setSettings({ ...settings, systemAnnouncement: e.target.value })}
              className="text-xs h-8"
            />
            <p className="text-[11px] text-muted-foreground">
              Broadcasted banner across the studio navigation bar.
            </p>
          </div>
        </div>

        {/* Section 3: Payment & Monetization Mode */}
        <div className="p-6 rounded-2xl border border-border/60 bg-card/60 space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-500" />
            Monetization & Checkout Processing Mode
          </h2>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Checkout Engine</Label>
            <select
              value={settings.paymentMode}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  paymentMode: e.target.value as 'simulated' | 'stripe',
                })
              }
              className="w-full max-w-xs text-xs p-2 rounded-lg border border-border/60 bg-background"
            >
              <option value="simulated">Simulated Sandbox (Instant test upgrades & purchases)</option>
              <option value="stripe">Live Stripe Gateway</option>
            </select>
            <p className="text-[11px] text-muted-foreground">
              In Simulated Sandbox mode, users can test upgrading plans and buying credit packs without real cards.
            </p>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={saving}
            className="bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs px-6"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {saving ? 'Saving...' : 'Save Platform Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
}
