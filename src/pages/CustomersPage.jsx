// src/pages/CustomersPage.jsx
import { useState } from "react";
import { Button, Card, Modal, ConfirmDialog, SearchInput, Pagination } from "../components/UI";

function CustomerDetailModal({ customer, orders, onClose, onBlock, onUnblock, toast }) {
  const customerOrders = orders.filter(o => o.customer === customer.name);

  return (
    <Modal open title={`Customer: ${customer.name}`} onClose={onClose} size="lg">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-2xl font-black text-white">
          {customer.name[0]}
        </div>
        <div className="flex-1">
          <div className="text-xl font-bold text-white">{customer.name}</div>
          <div className="text-sm text-gray-400">{customer.email}</div>
          <div className="text-sm text-gray-500 mt-0.5">📞 {customer.phone}</div>
        </div>
        <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${customer.blocked ? "bg-red-500/10 text-red-400 border-red-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"}`}>
          {customer.blocked ? "🚫 Blocked" : "✅ Active"}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Total Orders",  value: customer.orders,       color: "text-blue-400"    },
          { label: "Total Spent",   value: `$${customer.spent}`,  color: "text-orange-400"  },
          { label: "Member Since",  value: customer.joined,       color: "text-gray-300"    },
        ].map((s, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-3 text-center">
            <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="mb-6">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Recent Orders</div>
        {customerOrders.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-4">No orders found for this customer</div>
        ) : (
          <div className="space-y-2">
            {customerOrders.slice(0, 5).map(o => (
              <div key={o.id} className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
                <div>
                  <div className="text-sm font-mono text-orange-400">{o.id}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{(o.items||[]).map(i=>i.name).join(", ")}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-white">${o.total}</div>
                  <div className="text-xs text-gray-500">{o.time}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-white/8">
        {customer.blocked ? (
          <Button variant="success" onClick={async () => { await onUnblock(customer.id); toast.success(`${customer.name} unblocked`); onClose(); }}>🔓 Unblock Customer</Button>
        ) : (
          <Button variant="danger" onClick={async () => { await onBlock(customer.id); toast.success(`${customer.name} blocked`); onClose(); }}>🚫 Block Customer</Button>
        )}
        <Button variant="outline" className="ml-auto" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
}

export default function CustomersPage({ customers, orders, onBlock, onUnblock, toast }) {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const PER_PAGE = 8;

  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone.includes(q);
    const matchStatus = statusFilter === "all" || (statusFilter === "active" ? !c.blocked : c.blocked);
    return matchSearch && matchStatus;
  });

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleExport = () => {
    const csv = ["Name,Email,Phone,Orders,Spent,Joined,Status",
      ...customers.map(c => `${c.name},${c.email},${c.phone},${c.orders},${c.spent},${c.joined},${c.blocked?"Blocked":"Active"}`)
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "customers.csv"; a.click();
    toast.success("Customers exported as CSV");
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Customers", value: customers.length,                              color: "text-white"       },
          { label: "Active",          value: customers.filter(c=>!c.blocked).length,        color: "text-emerald-400" },
          { label: "Blocked",         value: customers.filter(c=>c.blocked).length,         color: "text-red-400"     },
          { label: "Total Revenue",   value: `$${customers.reduce((s,c)=>s+c.spent,0).toFixed(0)}`, color: "text-orange-400" },
        ].map((s, i) => (
          <div key={i} className="bg-gray-900 border border-white/8 rounded-2xl p-4 flex items-center gap-3">
            <div className={`text-2xl font-black font-display ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, email or phone..." />
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none">
          <option value="all">All Customers</option>
          <option value="active">Active Only</option>
          <option value="blocked">Blocked Only</option>
        </select>
        <Button variant="outline" className="ml-auto" onClick={handleExport}>📤 Export CSV</Button>
      </div>

      {/* Table */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8">
                {["Customer", "Email", "Phone", "Orders", "Total Spent", "Joined", "Status", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((c) => (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                        {c.name[0]}
                      </div>
                      <span className="font-semibold text-white">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{c.email}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{c.phone}</td>
                  <td className="px-4 py-3 font-semibold text-white">{c.orders}</td>
                  <td className="px-4 py-3 font-bold text-emerald-400">${c.spent}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{c.joined}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${c.blocked ? "bg-red-500/10 text-red-400 border-red-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"}`}>
                      {c.blocked ? "🚫 Blocked" : "✅ Active"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => setSelected(c)}>View</Button>
                      {c.blocked ? (
                        <Button variant="success" size="sm" onClick={async () => { await onUnblock(c.id); toast.success(`${c.name} unblocked`); }}>Unblock</Button>
                      ) : (
                        <Button variant="danger" size="sm" onClick={async () => { await onBlock(c.id); toast.success(`${c.name} blocked`); }}>Block</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {paginated.length === 0 && <div className="text-center py-12 text-gray-500 text-sm">No customers found</div>}
        </div>
        <div className="p-4">
          <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
        </div>
      </Card>

      {selected && (
        <CustomerDetailModal
          customer={selected}
          orders={orders}
          onClose={() => setSelected(null)}
          onBlock={onBlock}
          onUnblock={onUnblock}
          toast={toast}
        />
      )}
    </div>
  );
}