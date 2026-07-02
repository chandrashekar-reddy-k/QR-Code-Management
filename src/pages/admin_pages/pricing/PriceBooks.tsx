import React, { useState, useEffect } from "react";
import { Plus, Edit2, CheckCircle2, XCircle } from "lucide-react";
import fetchData from "../../../helper";
import { toast } from "react-toastify";

interface PriceBook {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function PriceBooks() {
  const [priceBooks, setPriceBooks] = useState<PriceBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<PriceBook | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isActive, setIsActive] = useState(true);

  const fetchPriceBooks = async () => {
    setLoading(true);
    try {
      const response = await fetchData<{ status: number; data: PriceBook[] }>("/pricing/price-books");
      if (response && response.data) {
        setPriceBooks(response.data);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch price books");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPriceBooks();
  }, []);

  const handleOpenCreate = () => {
    setEditingBook(null);
    setName("");
    setCode("");
    setIsActive(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (book: PriceBook) => {
    setEditingBook(book);
    setName(book.name);
    setCode(book.code);
    setIsActive(book.isActive);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) {
      toast.warn("Name and unique code are required");
      return;
    }

    try {
      const payload = { name, code: code.toUpperCase(), isActive };
      const response = await fetchData<{ status: number; message: string }>("/pricing/price-books", "POST", payload);
      if (response && response.status === 200) {
        toast.success(response.message || "Price book saved successfully");
        setModalOpen(false);
        fetchPriceBooks();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save price book");
    }
  };

  const toggleActiveStatus = async (book: PriceBook) => {
    try {
      const payload = { name: book.name, code: book.code, isActive: !book.isActive };
      const response = await fetchData<{ status: number; message: string }>("/pricing/price-books", "POST", payload);
      if (response && response.status === 200) {
        toast.success(`Price book ${!book.isActive ? 'activated' : 'deactivated'} successfully`);
        fetchPriceBooks();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update price book status");
    }
  };

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Price Book Framework</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage distinct pricing channels (e.g. POS, ONLINE, QUICK, VEHICLE)</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-all shadow-sm"
        >
          <Plus size={18} />
          Create Price Book
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Channel Code</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm text-slate-700 dark:text-slate-300">
              {priceBooks.map((book) => (
                <tr key={book.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-all">
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{book.name}</td>
                  <td className="px-6 py-4 font-mono text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30 px-2 py-1 rounded inline-block mt-3">{book.code}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleActiveStatus(book)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                        book.isActive
                          ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                          : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                      }`}
                    >
                      {book.isActive ? (
                        <>
                          <CheckCircle2 size={12} />
                          Active
                        </>
                      ) : (
                        <>
                          <XCircle size={12} />
                          Inactive
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleOpenEdit(book)}
                      className="text-slate-500 hover:text-green-600 dark:hover:text-green-400 transition-all"
                      title="Edit Price Book"
                    >
                      <Edit2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {priceBooks.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-slate-400">
                    No Price Books found. Click "Create Price Book" to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100 dark:border-slate-700">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {editingBook ? "Edit Price Book" : "Create Price Book"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                ✕
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-green-600"
                  placeholder="e.g. POS Price Book"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                  Channel Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={!!editingBook}
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="e.g. POS, ONLINE, QUICK, VEHICLE"
                  required
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
                />
                <label htmlFor="isActive" className="text-sm text-slate-700 dark:text-slate-300 select-none">
                  Active (prices under this book will resolve)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
