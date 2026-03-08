// src/pages/MenuPage.jsx
import { useState } from "react";
import { Button, Card, Modal, Input, Textarea, Select, Toggle, ConfirmDialog, SearchInput } from "../components/UI";

const CATEGORY_OPTIONS = [
  { value: "Burgers", label: "🍔 Burgers" },
  { value: "Noodles", label: "🍜 Noodles" },
  { value: "Pizza",   label: "🍕 Pizza"   },
  { value: "Rice",    label: "🍚 Rice"    },
  { value: "Grills",  label: "🍗 Grills"  },
  { value: "Salads",  label: "🥗 Salads"  },
  { value: "Japanese",label: "🍱 Japanese"},
  { value: "Drinks",  label: "🥤 Drinks"  },
  { value: "Desserts",label: "🍰 Desserts"},
];

const CATEGORY_EMOJI = {
  Burgers: "🍔", Noodles: "🍜", Pizza: "🍕", Rice: "🍚",
  Grills: "🍗", Salads: "🥗", Japanese: "🍱", Drinks: "🥤", Desserts: "🍰",
};

function ItemForm({ initial, onSave, onClose, loading }) {
  const [form, setForm] = useState(initial || { name: "", category: "Burgers", price: "", description: "", emoji: "🍔", available: true });
  const [errors, setErrors] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(initial?.imageUrl || "");

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.price || isNaN(form.price) || Number(form.price) <= 0) e.price = "Enter a valid price";
    if (!form.category) e.category = "Select a category";
    return e;
  };

  const submit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave({ ...form, price: parseFloat(form.price) }, imageFile);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex flex-col items-center gap-2 w-20 flex-shrink-0">
          {/* Image preview or emoji */}
          {imagePreview ? (
            <div className="relative w-20 h-20">
              <img src={imagePreview} alt="preview" className="w-20 h-20 rounded-2xl object-cover border border-white/10" />
              <button type="button" onClick={() => { setImagePreview(""); setImageFile(null); }} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center hover:bg-red-600 leading-none">✕</button>
            </div>
          ) : (
            <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center text-4xl border border-white/10">{form.emoji}</div>
          )}
          <input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} className="w-16 text-center bg-gray-800 border border-white/10 rounded-xl px-2 py-1.5 text-sm text-white outline-none focus:border-orange-500" placeholder="Emoji" maxLength={2} />
          <label className="cursor-pointer text-[10px] text-orange-400 hover:text-orange-300 text-center leading-tight">
            📷 Upload photo
            <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          </label>
        </div>
        <div className="flex-1 space-y-3">
          <Input label="Item Name" value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors(p => ({ ...p, name: "" })); }} placeholder="e.g. Beef Burger" error={errors.name} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Category" value={form.category} onChange={(e) => { const cat = e.target.value; setForm({ ...form, category: cat, emoji: CATEGORY_EMOJI[cat] || form.emoji }); setErrors(p => ({ ...p, category: "" })); }} options={CATEGORY_OPTIONS} />
            <Input label="Price ($)" type="number" min="0" step="0.5" value={form.price} onChange={(e) => { setForm({ ...form, price: e.target.value }); setErrors(p => ({ ...p, price: "" })); }} placeholder="0.00" error={errors.price} />
          </div>
        </div>
      </div>
      <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description..." rows={2} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Calories (optional)" type="number" placeholder="e.g. 450 kcal" value={form.calories || ""} onChange={(e) => setForm({ ...form, calories: e.target.value })} />
        <Input label="Prep Time (min)" type="number" placeholder="e.g. 15" value={form.prepTime || ""} onChange={(e) => setForm({ ...form, prepTime: e.target.value })} />
      </div>
      <Toggle label="Available for ordering" sublabel="Toggle off to hide from customers" checked={form.available} onChange={(v) => setForm({ ...form, available: v })} />
      <div className="flex gap-3 pt-2 justify-end">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={submit} loading={loading}>{initial ? "Save Changes" : "Add Item"}</Button>
      </div>
    </div>
  );
}

export default function MenuPage({ items, onAdd, onEdit, onDelete, onToggle, toast }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [catFilter, setCatFilter] = useState("all");
  const [availFilter, setAvailFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const categories = ["all", ...new Set(items.map(i => i.category))];

  const filtered = items.filter(item => {
    const matchCat = catFilter === "all" || item.category === catFilter;
    const matchAvail = availFilter === "all" || (availFilter === "available" ? item.available : !item.available);
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) || item.category.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchAvail && matchSearch;
  });

  const handleAdd = async (data, imageFile) => {
    setLoading(true);
    await onAdd(data, imageFile);
    toast.success(`"${data.name}" added to menu`);
    setShowAdd(false);
    setLoading(false);
  };

  const handleEdit = async (data, imageFile) => {
    setLoading(true);
    await onEdit(editItem.id, data, imageFile);
    toast.success(`"${data.name}" updated`);
    setEditItem(null);
    setLoading(false);
  };

  const handleDelete = async () => {
    await onDelete(deleteItem.id);
    toast.success(`"${deleteItem.name}" deleted`);
    setDeleteItem(null);
  };

  const handleToggle = async (item) => {
    await onToggle(item.id, !item.available);
    toast.info(`"${item.name}" marked as ${!item.available ? "available" : "unavailable"}`);
  };

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Items", value: items.length, icon: "🍔", color: "text-orange-400" },
          { label: "Available", value: items.filter(i => i.available).length, icon: "✅", color: "text-emerald-400" },
          { label: "Unavailable", value: items.filter(i => !i.available).length, icon: "⛔", color: "text-red-400" },
          { label: "Categories", value: categories.length - 1, icon: "📂", color: "text-blue-400" },
        ].map((s, i) => (
          <div key={i} className="bg-gray-900 border border-white/8 rounded-2xl p-4 flex items-center gap-3">
            <span className="text-2xl">{s.icon}</span>
            <div>
              <div className={`text-xl font-black ${s.color} font-display`}>{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Search menu items..." />
        <div className="flex gap-1 flex-wrap">
          {categories.map(c => (
            <button key={c} onClick={() => setCatFilter(c)} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all capitalize ${catFilter === c ? "bg-orange-500 text-white" : "bg-gray-800 text-gray-400 hover:text-white border border-white/10"}`}>
              {c === "all" ? "All" : c}
            </button>
          ))}
        </div>
        <select value={availFilter} onChange={(e) => setAvailFilter(e.target.value)} className="bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none">
          <option value="all">All Status</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
        </select>
        <Button variant="primary" className="ml-auto" onClick={() => setShowAdd(true)}>+ Add Item</Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-3 xl:grid-cols-4">
        {filtered.map((item) => (
          <div key={item.id} className={`bg-gray-900 border rounded-2xl p-4 transition-all hover:border-orange-500/30 ${item.available ? "border-white/8" : "border-white/5 opacity-70"}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center text-3xl overflow-hidden">
                {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" /> : (item.emoji || "🍽️")}
              </div>
              <Toggle checked={item.available} onChange={() => handleToggle(item)} />
            </div>
            <div className="font-semibold text-white text-sm">{item.name}</div>
            <div className="text-xs text-gray-500 mt-0.5">{item.category}</div>
            {item.description && <div className="text-xs text-gray-600 mt-1.5 line-clamp-2">{item.description}</div>}
            <div className="flex items-center justify-between mt-3">
              <span className="text-lg font-black text-orange-400">${item.price}</span>
              <span className="text-xs text-gray-500">📦 {item.orders || 0}</span>
            </div>
            {!item.available && <div className="text-[10px] text-red-400 font-medium mt-1">⛔ Unavailable</div>}
            <div className="flex gap-2 mt-3 pt-3 border-t border-white/8">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditItem(item)}>✏️ Edit</Button>
              <Button variant="danger" size="sm" onClick={() => setDeleteItem(item)}>🗑️</Button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">🍽️</div>
          <div>No items found</div>
        </div>
      )}

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="➕ Add New Menu Item" size="md">
        <ItemForm onSave={handleAdd} onClose={() => setShowAdd(false)} loading={loading} />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="✏️ Edit Menu Item" size="md">
        {editItem && <ItemForm initial={editItem} onSave={handleEdit} onClose={() => setEditItem(null)} loading={loading} />}
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Delete Menu Item"
        message={`Are you sure you want to delete "${deleteItem?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}