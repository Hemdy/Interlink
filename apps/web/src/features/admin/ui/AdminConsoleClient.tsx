"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/ToastProvider";

interface AdminUserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  roles: string[];
  createdAt: string;
}

interface VerificationRow {
  id: string;
  mentorId: string;
  firstName: string;
  lastName: string;
  email: string;
  currentPosition: string | null;
  organisation: string | null;
  documentReference: string | null;
  supportingSummary: string | null;
  status: string;
  submittedAt: string;
}

interface ReportRow {
  id: string;
  reason: string;
  description: string;
  status: string;
  resolution: string | null;
  reporter: { firstName: string; lastName: string } | null;
  reportedUser: { firstName: string; lastName: string } | null;
  createdAt: string;
}

interface AuditLogRow {
  id: string;
  action: string;
  entityType: string;
  actorFirstName: string | null;
  actorLastName: string | null;
  createdAt: string;
}

export function AdminConsoleClient({
  usersList,
  verifications,
  reportsList,
  industriesList,
  auditLogsList,
}: {
  usersList: AdminUserRow[];
  verifications: VerificationRow[];
  reportsList: ReportRow[];
  industriesList: Array<{ id: string; name: string; description: string | null }>;
  auditLogsList: AuditLogRow[];
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [tab, setTab] = useState<"verifications" | "reports" | "users" | "categories" | "audit">(
    "verifications",
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [resolutionText, setResolutionText] = useState<Record<string, string>>({});

  async function reviewVerification(id: string, status: "reviewed" | "verified" | "rejected") {
    setBusyId(id);
    try {
      const res = await fetch(`/api/v1/admin/verifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        pushToast({ kind: "success", title: `Verification marked ${status}` });
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function resolveReport(id: string, status: "under_review" | "resolved" | "dismissed") {
    const resolution =
      resolutionText[id]?.trim() || `Reviewed by administrator (${status})`;
    setBusyId(id);
    try {
      const res = await fetch(`/api/v1/admin/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, resolution }),
      });
      if (res.ok) {
        pushToast({ kind: "success", title: `Report updated to ${status}` });
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function updateUserStatus(userId: string, status: "active" | "suspended") {
    setBusyId(userId);
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        pushToast({ kind: "success", title: `Account marked ${status}` });
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/v1/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: catName, description: catDesc }),
    });
    if (res.ok) {
      pushToast({ kind: "success", title: "Industry category added" });
      setCatName("");
      setCatDesc("");
      router.refresh();
    } else {
      pushToast({ kind: "error", title: "Category already exists or invalid" });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {[
          { id: "verifications", label: `Mentor Verification (${verifications.length})` },
          { id: "reports", label: `Safety Reports (${reportsList.length})` },
          { id: "users", label: `Users (${usersList.length})` },
          { id: "categories", label: `Industries (${industriesList.length})` },
          { id: "audit", label: `Audit Logs (${auditLogsList.length})` },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id as typeof tab)}
            className={`rounded-[2px] px-4 py-2 text-xs font-medium ${
              tab === item.id
                ? "bg-interlink-forest text-white"
                : "border border-interlink-border bg-interlink-surface text-interlink-ink hover:border-interlink-forest"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "verifications" && (
        <div className="space-y-4">
          {verifications.length === 0 ? (
            <Card>
              <p className="text-sm text-interlink-muted">
                No mentor verification records submitted yet.
              </p>
            </Card>
          ) : (
            verifications.map((v) => (
              <Card key={v.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-interlink-ink">
                        {v.firstName} {v.lastName}
                      </h3>
                      <Badge tone={v.status === "verified" ? "forest" : "warning"}>
                        {v.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-interlink-muted">
                      {v.currentPosition ?? "Mentor"}
                      {v.organisation ? ` · ${v.organisation}` : ""} &middot; {v.email}
                    </p>
                    {v.supportingSummary && (
                      <p className="mt-2 text-xs text-slate-700">{v.supportingSummary}</p>
                    )}
                    {v.documentReference && (
                      <a
                        href={v.documentReference}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block text-xs text-interlink-link underline"
                      >
                        {v.documentReference}
                      </a>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      loading={busyId === v.id}
                      onClick={() => reviewVerification(v.id, "reviewed")}
                    >
                      Mark Reviewed
                    </Button>
                    <Button
                      size="sm"
                      loading={busyId === v.id}
                      onClick={() => reviewVerification(v.id, "verified")}
                    >
                      Approve Verified
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      loading={busyId === v.id}
                      onClick={() => reviewVerification(v.id, "rejected")}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === "reports" && (
        <div className="space-y-4">
          {reportsList.length === 0 ? (
            <Card>
              <p className="text-sm text-interlink-muted">No safety reports filed.</p>
            </Card>
          ) : (
            reportsList.map((r) => (
              <Card key={r.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold capitalize text-interlink-ink">
                        {r.reason.replace(/_/g, " ")}
                      </h3>
                      <Badge tone={r.status === "open" ? "danger" : "neutral"}>
                        {r.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-interlink-muted">
                      Reported:{" "}
                      {r.reportedUser
                        ? `${r.reportedUser.firstName} ${r.reportedUser.lastName}`
                        : "User"}{" "}
                      &middot; By:{" "}
                      {r.reporter
                        ? `${r.reporter.firstName} ${r.reporter.lastName}`
                        : "User"}
                    </p>
                    <p className="mt-2 text-sm text-slate-700">{r.description}</p>
                    {r.resolution && (
                      <p className="mt-2 text-xs text-interlink-forest">
                        Resolution: {r.resolution}
                      </p>
                    )}
                  </div>
                </div>

                {r.status !== "resolved" && r.status !== "dismissed" && (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                    <div className="flex-1">
                      <Input
                        placeholder="Record investigation notes / resolution..."
                        value={resolutionText[r.id] ?? ""}
                        onChange={(e) =>
                          setResolutionText((prev) => ({ ...prev, [r.id]: e.target.value }))
                        }
                      />
                    </div>
                    <Button
                      size="sm"
                      loading={busyId === r.id}
                      onClick={() => resolveReport(r.id, "resolved")}
                    >
                      Resolve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      loading={busyId === r.id}
                      onClick={() => resolveReport(r.id, "dismissed")}
                    >
                      Dismiss
                    </Button>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      {tab === "users" && (
        <Card padded={false} className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-interlink-border bg-interlink-app-bg text-interlink-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Roles</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usersList.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium text-interlink-ink">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3 capitalize text-slate-600">{u.roles.join(", ")}</td>
                  <td className="px-4 py-3">
                    <Badge tone={u.status === "active" ? "success" : "danger"}>{u.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {u.status === "active" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        loading={busyId === u.id}
                        onClick={() => updateUserStatus(u.id, "suspended")}
                      >
                        Suspend
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        loading={busyId === u.id}
                        onClick={() => updateUserStatus(u.id, "active")}
                      >
                        Reactivate
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === "categories" && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          <Card className="md:col-span-7">
            <h3 className="font-display text-base font-semibold text-interlink-ink">
              Active Industry Categories
            </h3>
            <ul className="mt-4 divide-y divide-slate-100 text-sm">
              {industriesList.map((ind) => (
                <li key={ind.id} className="py-2.5">
                  <p className="font-medium text-interlink-ink">{ind.name}</p>
                  {ind.description && (
                    <p className="text-xs text-interlink-muted">{ind.description}</p>
                  )}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="md:col-span-5">
            <h3 className="font-display text-base font-semibold text-interlink-ink">
              Add Industry Category
            </h3>
            <form onSubmit={addCategory} className="mt-4 space-y-3">
              <Input
                label="Category Name"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                required
              />
              <Input
                label="Description"
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
              />
              <Button type="submit" className="w-full">
                Create Category
              </Button>
            </form>
          </Card>
        </div>
      )}

      {tab === "audit" && (
        <Card padded={false} className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-interlink-border bg-interlink-app-bg text-interlink-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Timestamp</th>
                <th className="px-4 py-3 font-semibold">Actor</th>
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 font-semibold">Entity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogsList.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-2.5 text-slate-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-interlink-ink">
                    {log.actorFirstName
                      ? `${log.actorFirstName} ${log.actorLastName}`
                      : "System"}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-interlink-forest">{log.action}</td>
                  <td className="px-4 py-2.5 text-slate-600">{log.entityType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
