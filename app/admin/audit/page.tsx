'use client';

import { useEffect, useState, useCallback } from 'react';
import { FileText, RefreshCw, Clock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AuditLogEntry } from '@/lib/server/admin/admin-store';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/audit-logs?limit=200');
      const data = await res.json();
      if (data.success && data.data) {
        setLogs(data.data.logs);
      }
    } catch {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-violet-500" />
            Security & Administrative Audit Trail
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immutable log of all user modifications, credit grants, promo codes, and configuration changes.
          </p>
        </div>

        <Button size="sm" variant="outline" onClick={fetchLogs} className="text-xs">
          <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', loading && 'animate-spin')} />
          Refresh Audit Trail
        </Button>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/60 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border/40 bg-muted/40 font-semibold text-muted-foreground">
              <th className="p-3.5 pl-5">Timestamp</th>
              <th className="p-3.5">Action</th>
              <th className="p-3.5">Admin Email</th>
              <th className="p-3.5">Target Type</th>
              <th className="p-3.5 pr-5">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  {loading ? 'Loading audit trail...' : 'No audit records logged yet.'}
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                  <td className="p-3.5 pl-5 text-muted-foreground whitespace-nowrap font-mono text-[11px]">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="p-3.5 font-bold text-foreground">
                    <span className="px-2 py-0.5 rounded bg-muted font-mono text-[10px]">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3.5 font-medium text-foreground">{log.adminEmail}</td>
                  <td className="p-3.5 uppercase text-[10px] text-muted-foreground font-semibold">
                    {log.targetType}
                  </td>
                  <td className="p-3.5 pr-5 text-muted-foreground text-[11px] leading-relaxed">
                    {log.details}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
