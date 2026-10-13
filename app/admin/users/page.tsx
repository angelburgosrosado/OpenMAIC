'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  Pencil,
  Trash2,
  Shield,
  Zap,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Lock,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { SafeUser, UserRole, UserTier, UserStatus } from '@/lib/server/auth/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SafeUser | null>(null);

  // Form states
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('user');
  const [newTier, setNewTier] = useState<UserTier>('free');
  const [newTokens, setNewTokens] = useState<number>(250_000);

  // Edit states
  const [editRole, setEditRole] = useState<UserRole>('user');
  const [editTier, setEditTier] = useState<UserTier>('free');
  const [editStatus, setEditStatus] = useState<UserStatus>('active');
  const [editTokenDelta, setEditTokenDelta] = useState<number>(0);
  const [editResetPassword, setEditResetPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (tierFilter !== 'all') params.set('tier', tierFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      params.set('page', String(page));
      params.set('pageSize', '25');

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.data) {
        setUsers(data.data.users);
        setTotal(data.data.total);
      }
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, tierFilter, statusFilter, page]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const openEdit = (u: SafeUser) => {
    setSelectedUser(u);
    setEditRole(u.role);
    setEditTier(u.tier);
    setEditStatus(u.status);
    setEditTokenDelta(0);
    setEditResetPassword('');
    setEditModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword) {
      toast.error('Email and password required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          name: newName,
          role: newRole,
          tier: newTier,
          initialTokens: newTokens,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('User account created');
        setCreateModalOpen(false);
        setNewEmail('');
        setNewName('');
        setNewPassword('');
        void fetchUsers();
      } else {
        toast.error(data.error || 'Failed to create user');
      }
    } catch {
      toast.error('Network error creating user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        role: editRole,
        tier: editTier,
        status: editStatus,
      };
      if (editTokenDelta !== 0) {
        payload.tokenDelta = editTokenDelta;
      }
      if (editResetPassword.trim().length >= 6) {
        payload.password = editResetPassword.trim();
      }

      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('User updated successfully');
        setEditModalOpen(false);
        void fetchUsers();
      } else {
        toast.error(data.error || 'Failed to update user');
      }
    } catch {
      toast.error('Network error updating user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (u: SafeUser) => {
    if (!confirm(`Are you sure you want to permanently delete ${u.email}?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success(`Deleted user ${u.email}`);
        void fetchUsers();
      } else {
        toast.error(data.error || 'Failed to delete user');
      }
    } catch {
      toast.error('Network error deleting user');
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-violet-500" />
            User Management & Accounts
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            View, search, edit roles, adjust token balances, and manage all {total} accounts on OpenMAIC.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={fetchUsers}
            className="text-xs"
            title="Refresh list"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          </Button>
          <Button
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="text-xs bg-violet-600 hover:bg-violet-700 text-white shadow-sm font-semibold"
          >
            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
            Create User Account
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-md flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or user ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs h-8"
          />
        </div>

        {/* Role Filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="text-xs p-1.5 px-2.5 rounded-lg border border-border/60 bg-background text-foreground font-medium"
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
          <option value="creator">Creator</option>
        </select>

        {/* Tier Filter */}
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="text-xs p-1.5 px-2.5 rounded-lg border border-border/60 bg-background text-foreground font-medium"
        >
          <option value="all">All Tiers</option>
          <option value="free">Free Starter</option>
          <option value="pro">Creator Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs p-1.5 px-2.5 rounded-lg border border-border/60 bg-background text-foreground font-medium"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-border/60 bg-card/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/40 bg-muted/40 font-semibold text-muted-foreground">
                <th className="p-3.5 pl-5">User</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5">Tier Plan</th>
                <th className="p-3.5">Token Balance</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Created</th>
                <th className="p-3.5 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    {loading ? 'Loading users...' : 'No users match your search criteria.'}
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                    {/* User info */}
                    <td className="p-3.5 pl-5">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={u.avatar || '/avatars/user.png'}
                          alt={u.name}
                          className="w-8 h-8 rounded-full object-cover ring-1 ring-border/50 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-foreground truncate">{u.name}</div>
                          <div className="text-[11px] text-muted-foreground truncate">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="p-3.5">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                          u.role === 'admin'
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {u.role}
                      </span>
                    </td>

                    {/* Tier */}
                    <td className="p-3.5">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                          u.tier === 'enterprise'
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                            : u.tier === 'pro'
                              ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30'
                              : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {u.tier}
                      </span>
                    </td>

                    {/* Tokens */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5 font-bold tabular-nums text-foreground">
                        <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span>{u.tokenBalance.toLocaleString()}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {u.tokensUsedThisMonth.toLocaleString()} used this month
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-3.5">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-[11px] font-medium',
                          u.status === 'active'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-destructive',
                        )}
                      >
                        {u.status === 'active' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        <span className="capitalize">{u.status}</span>
                      </span>
                    </td>

                    {/* Created */}
                    <td className="p-3.5 text-muted-foreground text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 pr-5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(u)}
                          className="h-7 px-2 text-xs hover:text-foreground"
                          title="Edit User & Tokens"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(u)}
                          disabled={u.role === 'admin'}
                          className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User & Adjust Balance Modal */}
      {selectedUser && (
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="max-w-md p-6 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Edit User & Token Allowance</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Managing account: <strong>{selectedUser.email}</strong> ({selectedUser.id})
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUpdate} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">User Role</Label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="w-full text-xs p-2 rounded-lg border border-border/60 bg-background"
                  >
                    <option value="user">User (Standard)</option>
                    <option value="creator">Creator</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Subscription Tier</Label>
                  <select
                    value={editTier}
                    onChange={(e) => setEditTier(e.target.value as UserTier)}
                    className="w-full text-xs p-2 rounded-lg border border-border/60 bg-background"
                  >
                    <option value="free">Free Starter</option>
                    <option value="pro">Creator Pro</option>
                    <option value="enterprise">Enterprise Studio</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Account Status</Label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as UserStatus)}
                  className="w-full text-xs p-2 rounded-lg border border-border/60 bg-background"
                >
                  <option value="active">Active (Normal access)</option>
                  <option value="suspended">Suspended (Blocked from logging in)</option>
                </select>
              </div>

              {/* Adjust Tokens */}
              <div className="p-3 rounded-xl border border-border/50 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">Token Balance Adjustment</span>
                  <span className="font-mono text-muted-foreground">
                    Current: {selectedUser.tokenBalance.toLocaleString()}
                  </span>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    Add or Deduct Tokens (Delta):
                  </Label>
                  <Input
                    type="number"
                    value={editTokenDelta}
                    onChange={(e) => setEditTokenDelta(parseInt(e.target.value) || 0)}
                    placeholder="e.g. +500000 or -100000"
                    className="text-xs h-8"
                  />
                  <div className="flex gap-1.5 pt-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setEditTokenDelta(100_000)}
                      className="px-2 py-0.5 rounded bg-muted hover:bg-muted/80"
                    >
                      +100K
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditTokenDelta(500_000)}
                      className="px-2 py-0.5 rounded bg-muted hover:bg-muted/80"
                    >
                      +500K
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditTokenDelta(2_000_000)}
                      className="px-2 py-0.5 rounded bg-muted hover:bg-muted/80 font-bold"
                    >
                      +2M Bonus
                    </button>
                  </div>
                </div>
              </div>

              {/* Reset Password */}
              <div className="space-y-1">
                <Label className="text-xs">Reset User Password (Optional)</Label>
                <Input
                  type="password"
                  value={editResetPassword}
                  onChange={(e) => setEditResetPassword(e.target.value)}
                  placeholder="Leave blank to keep current password"
                  className="text-xs h-8"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-violet-600 hover:bg-violet-700 text-white font-semibold"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Create User Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Create User Account</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add a new user directly to the platform with pre-configured tier and tokens.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Display Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Dr. Evelyn Shaw"
                className="text-xs h-8"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Email Address *</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="evelyn@university.edu"
                required
                className="text-xs h-8"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Temporary Password *</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="text-xs h-8"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Role</Label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full text-xs p-2 rounded-lg border border-border/60 bg-background"
                >
                  <option value="user">User</option>
                  <option value="creator">Creator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Tier</Label>
                <select
                  value={newTier}
                  onChange={(e) => setNewTier(e.target.value as UserTier)}
                  className="w-full text-xs p-2 rounded-lg border border-border/60 bg-background"
                >
                  <option value="free">Free Starter</option>
                  <option value="pro">Creator Pro</option>
                  <option value="enterprise">Enterprise Studio</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Initial Token Grant</Label>
              <Input
                type="number"
                value={newTokens}
                onChange={(e) => setNewTokens(parseInt(e.target.value) || 0)}
                className="text-xs h-8"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-violet-600 hover:bg-violet-700 text-white font-semibold"
              >
                {submitting ? 'Creating...' : 'Create Account'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
