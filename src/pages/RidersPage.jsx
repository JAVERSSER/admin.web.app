// src/pages/RidersPage.jsx
import { useState } from "react";
import { Button, Card, Modal, Input, StatusBadge, ConfirmDialog, SearchInput, Pagination } from "../components/UI";
import { RIDER_STATUS_CONFIG } from "../utils/mockData";

function RiderDetailModal({ rider, onClose, onApprove, onSuspend, onActivate, toast }) {
  const [suspendReason, setSuspendReason] = useState("");
  const [showSuspendForm, setShowSuspendForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const sc = RIDER_STATUS_CONFIG[rider.status] || RIDER_STATUS_CONFIG.offline;

  const handleApprove = async () => {
    setLoading(true);
    await onApprove(rider.id);
    toast.success(`${rider.name} approved!`);
    onClose();
    setLoading(false);
  };

  const handleSuspend = async () => {
    if (!suspendReason.trim()) return;
    setLoading(true);
    await onSuspend(rider.id, suspendReason);
    toast.success(`${rider.name} suspended`);
    onClose();
    setLoading(false);
  };

  const handleActivate = async () => {
    setLoading(true);
    await onActivate(rider.id);
    toast.success(`${rider.name} reactivated`);
    onClose();
    setLoading(false);
  };

  return (
    <Modal open title={`Rider: ${rider.name}`} onClose={onClose} size="md">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/8">
        <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center text-3xl">🛵</div>
        <div className="flex-1">
          <div className="text-xl font-bold text-white">{rider.name}</div>
          <div className="text-sm text-gray-400">{rider.email}</div>
          <div className={`flex items-center gap-1.5 text-xs font-medium mt-1 ${sc.color}`}>
            <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
            {sc.label}
          </div>
        </div>
        {!rider.approved && <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold px-3 py-1.5 rounded-xl">⏳ Pending Approval</span>}
        {rider.suspended && <span className="bg-red-500/10 text-red-400 border border-red-500/30 text-xs font-bold px-3 py-1.5 rounded-xl">🚫 Suspended</span>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Deliveries", value: rider.deliveries, icon: "📦" },
          { label: "Rating", value: `⭐ ${rider.rating || "N/A"}`, icon: null },
          { label: "Earnings", value: `$${rider.earnings || 0}`, icon: "💰" },
        ].map((s, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-white">{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="space-y-2 mb-6">
        {[
          { label: "Phone", value: rider.phone },
          { label: "Vehicle", value: rider.vehicle },
          { label: "Plate No.", value: rider.plateNo },
          { label: "Joined", value: rider.joined },
        ].map((r, i) => (
          <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
            <span className="text-xs text-gray-500 uppercase font-semibold tracking-wide">{r.label}</span>
            <span className="text-sm text-white">{r.value || "—"}</span>
          </div>
        ))}
      </div>

      {/* Suspend form */}
      {showSuspendForm && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 mb-4">
          <div className="text-sm font-medium text-red-400 mb-2">Reason for suspension</div>
          <textarea value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} rows={2} className="w-full bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-red-500 resize-none mb-3" placeholder="Enter reason..." />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSuspendForm(false)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={handleSuspend} disabled={!suspendReason.trim()} loading={loading}>Confirm Suspend</Button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap pt-4 border-t border-white/8">
        {!rider.approved && !rider.suspended && (
          <Button variant="success" onClick={handleApprove} loading={loading}>✅ Approve Rider</Button>
        )}
        {rider.suspended ? (
          <Button variant="success" onClick={handleActivate} loading={loading}>🔓 Reactivate Rider</Button>
        ) : (
          rider.approved && !showSuspendForm && (
            <Button variant="danger" onClick={() => setShowSuspendForm(true)}>🚫 Suspend Rider</Button>
          )
        )}
        <Button variant="outline" className="ml-auto" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
}

const PER_PAGE = 10;

export default function RidersPage({ riders, onApprove, onSuspend, onActivate, toast }) {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const filtered = riders.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.name.toLowerCase().includes(q) || r.phone.includes(q);
    const matchStatus =
      statusFilter === "all"       ? true :
      statusFilter === "pending"   ? !r.approved && !r.suspended :
      statusFilter === "suspended" ? r.suspended :
      r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const stats = [
    { label: "Total",      value: riders.length,                                color: "text-white" },
    { label: "Online",     value: riders.filter(r => r.status === "online").length,     color: "text-emerald-400" },
    { label: "Delivering", value: riders.filter(r => r.status === "delivering").length, color: "text-sky-400" },
    { label: "Offline",    value: riders.filter(r => r.status === "offline").length,    color: "text-gray-500" },
    { label: "Pending",    value: riders.filter(r => !r.approved).length,               color: "text-amber-400" },
  ];

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {stats.map((s, i) => (
          <div key={i} className="bg-gray-900 border border-white/8 rounded-2xl p-4 text-center">
            <div className={`text-2xl font-black font-display ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search rider name or phone..." />
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none">
          <option value="all">All Status</option>
          <option value="online">Online</option>
          <option value="delivering">Delivering</option>
          <option value="offline">Offline</option>
          <option value="pending">Pending Approval</option>
          <option value="suspended">Suspended</option>
        </select>
        <Button variant="outline" className="ml-auto" onClick={() => toast.info("Export coming soon!")}>📤 Export</Button>
      </div>

      {/* Table */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8">
                {["Rider", "Phone", "Vehicle", "Status", "Rating", "Deliveries", "Earnings", "Approval", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((r) => {
                const sc = RIDER_STATUS_CONFIG[r.status] || RIDER_STATUS_CONFIG.offline;
                return (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center text-base flex-shrink-0">🛵</div>
                        <div>
                          <div className="font-semibold text-white">{r.name}</div>
                          <div className="text-xs text-gray-500">{r.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{r.phone}</td>
                    <td className="px-4 py-3"><span className="text-xs bg-gray-800 border border-white/10 rounded-lg px-2 py-1 text-gray-300">{r.vehicle}</span></td>
                    <td className="px-4 py-3">
                      <div className={`flex items-center gap-1.5 text-xs font-medium ${sc.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} ${r.status !== "offline" ? "animate-pulse" : ""}`} />
                        {sc.label}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-amber-400">⭐ {r.rating || "—"}</td>
                    <td className="px-4 py-3 font-semibold text-white">{r.deliveries}</td>
                    <td className="px-4 py-3 font-bold text-emerald-400">${r.earnings}</td>
                    <td className="px-4 py-3">
                      {r.suspended ? (
                        <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded-lg font-semibold">🚫 Suspended</span>
                      ) : r.approved ? (
                        <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-lg font-semibold">✅ Approved</span>
                      ) : (
                        <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded-lg font-semibold">⏳ Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <Button variant="outline" size="sm" onClick={() => setSelected(r)}>View</Button>
                        {!r.approved && <Button variant="success" size="sm" onClick={async () => { await onApprove(r.id); toast.success(`${r.name} approved`); }}>Approve</Button>}
                        {r.approved && !r.suspended && <Button variant="danger" size="sm" onClick={() => setSelected(r)}>Suspend</Button>}
                        {r.suspended && <Button variant="warning" size="sm" onClick={async () => { await onActivate(r.id); toast.success(`${r.name} reactivated`); }}>Activate</Button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-12 text-gray-500 text-sm">No riders found</div>}
        </div>
        {filtered.length > PER_PAGE && (
          <div className="px-4 py-3 border-t border-white/8">
            <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
          </div>
        )}
      </Card>

      {selected && (
        <RiderDetailModal
          rider={selected}
          onClose={() => setSelected(null)}
          onApprove={onApprove}
          onSuspend={onSuspend}
          onActivate={onActivate}
          toast={toast}
        />
      )}
    </div>
  );
}