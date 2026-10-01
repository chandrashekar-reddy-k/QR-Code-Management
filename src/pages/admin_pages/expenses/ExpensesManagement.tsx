// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
    ArrowLeft,
    Receipt,
    Search,
    Filter,
    CheckCircle2,
    XCircle,
    Eye,
    Clock,
    User,
    Truck,
    AlertCircle,
    Calendar,
    Loader2,
    Check,
    X,
    Settings,
    Plus,
    Building2,
    ChevronRight,
    ChevronLeft,
    RotateCcw,
    ShieldCheck,
    Lock,
    ChevronDown,
    BarChart3,
    Trash2,
    Edit,
    Upload,
    Camera,
    Info,
    FileText,
    Download,
    Banknote,
    Fuel,
    Tag,
    Layers
} from 'lucide-react';
import { 
    getAllExpenses, 
    updateExpenseStatus, 
    getExpenseCategories, 
    createExpenseCategory, 
    updateExpenseCategory,
    deleteExpenseCategory,
    bulkUpdateExpenseStatus, 
    addExpense 
} from '../vsms/services/expenseService';
import { getStoreCashRegister } from '../vsms/services/cashService';
import { exportExpensesToExcel } from '../../../utils/expenseExportHelper';
import ExpenseAnalytics from '../vsms/ExpenseAnalytics';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useUserStore } from '../vsms/store/userStore';
import { useSearchParams, useLocation } from 'react-router-dom';
import adminAPI from '../vsms/services/adminService';

const STATUS_STYLES = {
    PENDING: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    APPROVED: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    REJECTED: 'bg-rose-50 text-rose-600 border-rose-100',
    PAID: 'bg-blue-50 text-blue-600 border-blue-100',
};

const getRemarksOriginal = (desc) => {
    if (!desc) return '';
    const match = desc.match(/\[REMARKS: (.*?)\]/);
    return match ? match[1] : '';
};

function ExpenseActionModal({ isOpen, onClose, actionData, onAction, registerBalance }) {
    const [approvalType, setApprovalType] = useState('FULL');
    const [payingAmount, setPayingAmount] = useState('');
    const [approvedAmount, setApprovedAmount] = useState('');
    const [remarks, setRemarks] = useState('');
    const [balance, setBalance] = useState(0);

    useEffect(() => {
        if (actionData?.expense) {
            setApprovedAmount(actionData.expense.amount);
            setPayingAmount(actionData.expense.amount);
            setBalance(0);
            setRemarks('');
            setApprovalType('FULL');
        }
    }, [actionData]);

    if (!isOpen || !actionData) return null;

    const { expense, action, isReturn } = actionData;

    const handleConfirm = () => {
        onAction(expense.id, action === 'APPROVED' ? 'APPROVED' : (isReturn ? 'RETURNED' : 'REJECTED'), {
            remarks,
            paymentDetails: action === 'APPROVED' ? {
                type: approvalType,
                approved: approvedAmount,
                paid: payingAmount,
                balance: balance
            } : undefined
        });
    };

    const isOverApproved = Number(approvedAmount) > expense.amount;
    const isOverPaid = Number(payingAmount) > Number(approvedAmount || 0);
    const isValid = approvalType === 'FULL'
        ? (!isOverPaid && Number(payingAmount || 0) > 0)
        : (!isOverApproved && !isOverPaid && Number(approvedAmount || 0) > 0);

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className={`p-6 text-white flex items-center justify-between ${action === 'APPROVED' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                            {action === 'APPROVED' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg leading-tight">
                                {action === 'APPROVED' ? 'Process Expense Voucher' : (isReturn ? 'Return for Modification' : 'Reject Expense')}
                            </h3>
                            <p className="text-white/80 text-xs mt-0.5">
                                Voucher #{expense.displayId?.split('-').pop() || expense.id.slice(0, 8)}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                        <X size={18} />
                    </button>
                </div>

                {action === 'APPROVED' ? (
                    <div className="p-0">
                        {/* Type Toggle Tabs */}
                        <div className="flex border-b border-gray-100 p-2 bg-gray-50/50">
                            <button
                                onClick={() => {
                                    setApprovalType('FULL');
                                    setApprovedAmount(expense.amount);
                                    setPayingAmount(expense.amount);
                                    setBalance(0);
                                }}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${approvalType === 'FULL' ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Full Approval
                            </button>
                            <button
                                onClick={() => {
                                    setApprovalType('PARTIAL');
                                    setApprovedAmount(expense.amount);
                                    setPayingAmount('');
                                    setBalance(expense.amount);
                                }}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${approvalType === 'PARTIAL' ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Partial Approval
                            </button>
                        </div>

                        {/* Voucher Summary Card */}
                        <div className="px-6 pb-4 pt-4">
                            <div className="bg-gray-50/50 border border-gray-200 rounded-lg p-5 relative">
                                <div className="absolute top-5 right-5">
                                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-500 text-[9px] font-bold uppercase border border-emerald-100/50">Pending</span>
                                </div>

                                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                    <div className="space-y-0.5">
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">VOUCHER</p>
                                        <p className="text-lg font-bold text-gray-900 leading-none">{expense.displayId?.split('-').pop() || '—'}</p>
                                    </div>
                                    <div></div>

                                    <div className="space-y-0.5">
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">CATEGORY</p>
                                        <p className="text-[11px] font-bold text-gray-700 truncate">{expense.type?.split(' | ')[0] || expense.type}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">DATE</p>
                                        <p className="text-[11px] font-bold text-gray-700">{expense.billDate ? format(new Date(expense.billDate), 'dd-MM-yyyy') : '—'}</p>
                                    </div>

                                    <div className="space-y-0.5">
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">PAID TO</p>
                                        <p className="text-[11px] font-bold text-gray-700 truncate">{expense.paidTo || '—'}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">MODE</p>
                                        <p className="text-[11px] font-bold text-gray-700 uppercase">{expense.paymentMode || '—'}</p>
                                    </div>

                                    <div className="space-y-0.5">
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">CREATED BY</p>
                                        <p className="text-[11px] font-bold text-gray-700 truncate">{expense.user?.name || '—'}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">BILL AMOUNT</p>
                                        <p className="text-lg font-bold text-emerald-600 leading-none">₹{expense.amount.toLocaleString()}</p>
                                    </div>

                                    {getRemarksOriginal(expense.description) && (
                                        <div className="col-span-2 space-y-0.5 pt-3 border-t border-gray-200">
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">REMARKS</p>
                                            <p className="text-[10px] text-gray-500 leading-relaxed italic line-clamp-2">{getRemarksOriginal(expense.description)}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Inputs */}
                        <div className="px-6 space-y-4 pb-6">
                            {approvalType === 'PARTIAL' && (
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Approved Amount</label>
                                        <span className={`text-[10px] font-bold ${isOverApproved ? 'text-rose-500 animate-pulse' : 'text-gray-400'}`}>
                                            Bill: ₹{expense.amount.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">₹</span>
                                        <input
                                            type="number"
                                            value={approvedAmount}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setApprovedAmount(val);
                                                const approved = Number(val || 0);
                                                const paid = Number(payingAmount || 0);
                                                setBalance(approved - paid);
                                            }}
                                            className={`w-full bg-gray-50 border rounded-xl pl-8 pr-4 py-3 text-sm font-bold outline-none transition-all ${isOverApproved ? 'border-rose-300 focus:border-rose-500 bg-rose-50/10' : 'border-gray-200 focus:border-emerald-500'}`}
                                        />
                                    </div>
                                    {isOverApproved && (
                                        <p className="text-[10px] font-bold text-rose-500 ml-1">Error: Amount exceeds bill limit (₹{expense.amount}).</p>
                                    )}
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Pay Now</label>
                                    <span className={`text-[10px] font-bold ${isOverPaid ? 'text-rose-500 animate-pulse' : 'text-gray-400'}`}>
                                        Max: ₹{Number(approvedAmount || 0).toLocaleString()}
                                    </span>
                                </div>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">₹</span>
                                    <input
                                        type="number"
                                        value={payingAmount}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setPayingAmount(val);
                                            const approved = Number(approvedAmount || 0);
                                            const paid = Number(val || 0);
                                            setBalance(approved - paid);
                                        }}
                                        placeholder="0.00"
                                        className={`w-full bg-gray-50 border rounded-xl pl-8 pr-4 py-3 text-sm font-bold outline-none transition-all ${isOverPaid ? 'border-rose-300 focus:border-rose-500 bg-rose-50/10' : 'border-gray-200 focus:border-emerald-500'}`}
                                    />
                                </div>
                                {isOverPaid && (
                                    <p className="text-[10px] font-bold text-rose-500 ml-1">Error: Payment cannot exceed approval (₹{Number(approvedAmount || 0)}).</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider ml-1">Optional Remarks</label>
                                <textarea
                                    rows={2}
                                    value={remarks}
                                    onChange={e => setRemarks(e.target.value)}
                                    placeholder="Add any internal notes..."
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-medium resize-none outline-none focus:bg-white focus:border-emerald-500 transition-all"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-gray-50/50 border-t border-gray-200 flex items-center justify-between">
                            <div className="flex flex-col">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1.5">Pending Balance</p>
                                <p className={`text-lg font-bold leading-none ${balance > 0 ? 'text-emerald-500' : (balance < 0 ? 'text-rose-500' : 'text-emerald-600')}`}>
                                    ₹{balance.toLocaleString()}
                                </p>
                            </div>
                            <button
                                onClick={handleConfirm}
                                disabled={!isValid}
                                className={`px-6 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg active:scale-95 ${isValid ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20' : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'}`}
                            >
                                {approvalType === 'FULL' ? 'Confirm Full Approval' : 'Confirm Partial Approval'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="p-6 space-y-5">
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold uppercase text-rose-500 ml-1 tracking-wider">Reason for {isReturn ? 'Return' : 'Rejection'} <span className="text-rose-600">*</span></label>
                            <textarea
                                rows={3}
                                value={remarks}
                                onChange={e => setRemarks(e.target.value)}
                                placeholder={`Please explain why this is being ${isReturn ? 'returned' : 'rejected'}...`}
                                className="w-full bg-rose-50/20 border border-rose-100 rounded-xl px-4 py-3 text-xs font-medium resize-none outline-none focus:bg-white focus:border-rose-300 transition-all"
                            />
                        </div>
                        <div className="flex gap-4">
                            <button onClick={onClose} className="flex-1 py-3.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-400 hover:bg-gray-50 transition-all">
                                Cancel
                            </button>
                            <button
                                disabled={!remarks.trim()}
                                onClick={handleConfirm}
                                className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-rose-600/20 active:scale-95"
                            >
                                {isReturn ? 'Confirm Return' : 'Confirm Reject'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Categories Management Component
function ExpenseCategoriesTab() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [mainCategory, setMainCategory] = useState('');
    const [subCategory, setSubCategory] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const loadCategories = async () => {
        setLoading(true);
        try {
            const data = await getExpenseCategories();
            setCategories(data || []);
        } catch (error) {
            toast.error('Failed to load categories');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCategories();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!mainCategory.trim()) {
            toast.error('Category name is required');
            return;
        }
        setSubmitting(true);
        try {
            const fullName = subCategory.trim() ? `${mainCategory.trim()} | ${subCategory.trim()}` : mainCategory.trim();
            if (editingCategory) {
                await updateExpenseCategory(editingCategory.id, { name: fullName });
                toast.success('Category updated successfully');
            } else {
                await createExpenseCategory({ name: fullName });
                toast.success('Category created successfully');
            }
            setShowAddModal(false);
            setEditingCategory(null);
            setMainCategory('');
            setSubCategory('');
            loadCategories();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to save category');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this expense category?')) return;
        try {
            await deleteExpenseCategory(id);
            toast.success('Category deleted successfully');
            loadCategories();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to delete category');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-base font-bold text-gray-900">Expense Categories</h3>
                    <p className="text-xs text-gray-500">Configure operational and expenditure categories for voucher tagging</p>
                </div>
                <button
                    onClick={() => {
                        setEditingCategory(null);
                        setMainCategory('');
                        setSubCategory('');
                        setShowAddModal(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm"
                >
                    <Plus size={16} /> Add Category
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20 text-gray-400">
                    <Loader2 className="animate-spin text-emerald-600" size={32} />
                </div>
            ) : categories.length === 0 ? (
                <div className="bg-white rounded-xl p-16 border border-dashed border-gray-200 text-center">
                    <Tag size={40} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-sm font-bold text-gray-500">No expense categories created yet</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-200">
                                <th className="px-6 py-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Main Category</th>
                                <th className="px-6 py-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sub Category</th>
                                <th className="px-6 py-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Scope</th>
                                <th className="px-6 py-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {categories.map((cat) => {
                                const parts = (cat.name || '').split(' | ');
                                const main = parts[0] || cat.name;
                                const sub = parts[1] || '—';
                                return (
                                    <tr key={cat.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 text-xs font-bold text-gray-900">{main}</td>
                                        <td className="px-6 py-4 text-xs font-medium text-gray-600">{sub}</td>
                                        <td className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400">
                                            <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">{cat.type || 'STORE'}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingCategory(cat);
                                                        setMainCategory(main);
                                                        setSubCategory(sub === '—' ? '' : sub);
                                                        setShowAddModal(true);
                                                    }}
                                                    className="p-1 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                                                    title="Edit"
                                                >
                                                    <Edit size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(cat.id)}
                                                    className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {showAddModal && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-base text-gray-900">{editingCategory ? 'Edit Category' : 'Add Category'}</h4>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-700 block mb-1">Main Category Name <span className="text-rose-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    value={mainCategory}
                                    onChange={(e) => setMainCategory(e.target.value)}
                                    placeholder="e.g. Office Supplies, Fuel, Refreshments"
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-700 block mb-1">Sub Category (Optional)</label>
                                <input
                                    type="text"
                                    value={subCategory}
                                    onChange={(e) => setSubCategory(e.target.value)}
                                    placeholder="e.g. Stationary, Tea & Coffee"
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
                                <button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-50">
                                    {submitting ? 'Saving...' : 'Save Category'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ExpensesManagement() {
    const can = useUserStore(s => s.can);
    const [searchParams, setSearchParams] = useSearchParams();
    const storeId = searchParams.get('storeId');
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [paymentFilter, setPaymentFilter] = useState('');

    // activeTab: 'monitoring' | 'analytics' | 'categories'
    const activeTab = searchParams.get('tab') || 'monitoring';
    const setActiveTab = (tabId) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('tab', tabId);
            return next;
        });
    };

    const [selectedExpense, setSelectedExpense] = useState(null);
    const [selected, setSelected] = useState([]);
    const [actionModal, setActionModal] = useState(null);
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [expenseCategories, setExpenseCategories] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [billFile, setBillFile] = useState(null);
    const [billPreview, setBillPreview] = useState(null);
    const [newExpense, setNewExpense] = useState({
        mainCategory: '',
        subCategory: '',
        amount: '',
        paymentMode: 'CASH',
        description: '',
        paidTo: '',
        paidDate: format(new Date(), 'yyyy-MM-dd'),
        billDate: format(new Date(), 'yyyy-MM-dd')
    });
    const [registerBalance, setRegisterBalance] = useState(0);

    const [stores, setStores] = useState([]);
    const user = useUserStore(s => s.user);
    const isGlobalRole = user?.role === 'TENANT_OWNER' || user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'PARTNER' || user?.portalType === 'ADMIN' || !user?.storeId;

    useEffect(() => {
        const fetchStores = async () => {
            if (isGlobalRole && !storeId) {
                try {
                    const res = await adminAPI.getStores();
                    const storeData = res.data?.success ? res.data.data : (res.data || []);
                    setStores(storeData);
                    if (storeData.length === 1 && !storeId) {
                        setSearchParams({ storeId: storeData[0].id });
                    }
                } catch (err) {
                    console.error('Error fetching stores:', err);
                }
            }
        };
        fetchStores();
    }, [isGlobalRole, storeId]);

    useEffect(() => {
        if (!isGlobalRole && !storeId && user?.storeId) {
            setSearchParams({ storeId: user.storeId });
        }
    }, [isGlobalRole, storeId, user]);

    useEffect(() => {
        if (activeTab === 'monitoring') {
            loadExpenses();
        }
        setSelected([]);
        loadCategories();
    }, [date, statusFilter, paymentFilter, activeTab, storeId]);

    const loadCategories = async () => {
        try {
            const data = await getExpenseCategories();
            const grouped = [];
            const cleanPrefix = (str) => {
                if (!str) return '';
                return str.replace(/^\[(AGENT|STORE)\]\s*/i, '').trim();
            };
            data.forEach(cat => {
                const parts = cat.name.split(' | ');
                const main = parts[0];
                const sub = parts[1];

                const displayParts = (cat.displayName || cat.name).split(' | ');
                const mainDisplay = displayParts[0];
                const subDisplay = displayParts[1];

                const cleanMainDisplay = cleanPrefix(mainDisplay || main);
                let mainObj = grouped.find(g => g.name === cleanMainDisplay);
                if (!mainObj) {
                    mainObj = { id: cat.id, name: cleanMainDisplay, rawName: main, subCategories: [] };
                    grouped.push(mainObj);
                }
                if (sub) {
                    mainObj.subCategories.push({
                        id: cat.id,
                        name: cleanPrefix(subDisplay || sub),
                        rawName: sub
                    });
                }
            });
            setExpenseCategories(grouped);
        } catch (e) {
            console.error('Failed to load categories', e);
        }
    };

    const loadExpenses = async () => {
        setLoading(true);
        try {
            const params = {};
            if (date) params.date = date;
            if (statusFilter) params.status = statusFilter;
            if (paymentFilter) params.paymentMode = paymentFilter;
            if (storeId) params.storeId = storeId;
            const data = await getAllExpenses(params);
            setExpenses(data);
        } catch (e) {
            console.error('Failed to load expenses', e);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id, status, extras) => {
        try {
            await updateExpenseStatus(id, status, extras);
            toast.success(`Expense ${status.toLowerCase()} successfully`);
            setActionModal(null);
            loadExpenses();
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed');
        }
    };

    const fetchRegisterBalance = async () => {
        try {
            const dateStr = format(new Date(), 'yyyy-MM-dd');
            const data = await getStoreCashRegister(dateStr);
            setRegisterBalance(data?.liveMetrics?.availableCash || 0);
        } catch (err) {
            console.error('Failed to fetch register balance:', err);
        }
    };

    const handleBulkAction = async (status) => {
        if (!selected.length) return;
        try {
            await bulkUpdateExpenseStatus(selected, status);
            toast.success(`${selected.length} expenses ${status.toLowerCase()}`);
            setSelected([]);
            loadExpenses();
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Bulk action failed');
        }
    };

    const toggleSelect = (id) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
    const toggleAll = () => setSelected(selected.length === expenses.length ? [] : expenses.map(e => e.id));

    const getMeta = (exp) => {
        try {
            const match = exp.description?.match(/\[METADATA:({.+?})\]/);
            return match ? JSON.parse(match[1]) : {};
        } catch { return {}; }
    };
    const getApprovedBy = (desc) => desc?.match(/\[APPROVED_BY:(.+?)\]/)?.[1] || '—';
    const getPaymentInfo = (desc) => {
        const match = desc?.match(/\[PAYMENT: (.*?) \| Paid: ₹(\d+) \| Bal: ₹(\d+)\]/);
        return match ? { type: match[1], paid: match[2], balance: match[3] } : null;
    };
    const getRemarks = (desc) => {
        let clean = desc || '';
        clean = clean.replace(/\[METADATA:({.+?})\]/g, '');
        clean = clean.replace(/\[APPROVED_BY:(.+?)\]/g, '');
        clean = clean.replace(/\[PAID_BY:(.+?)\]/g, '');
        clean = clean.replace(/\[PAYMENT:(.+?)\]/g, '');
        return clean.trim().split('\n').pop() || '—';
    };

    const handleCreateExpense = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const formData = new FormData();
            const finalType = newExpense.subCategory 
                ? `${newExpense.mainCategory} | ${newExpense.subCategory}` 
                : newExpense.mainCategory;
            formData.append('type', finalType);
            formData.append('amount', newExpense.amount);
            formData.append('paymentMode', newExpense.paymentMode);
            formData.append('description', newExpense.description);
            formData.append('paidTo', newExpense.paidTo);
            formData.append('paidDate', newExpense.paidDate);
            formData.append('billDate', newExpense.billDate);
            if (storeId) formData.append('storeId', storeId);
            if (billFile) formData.append('billImage', billFile);

            await addExpense(formData);
            toast.success('Direct expense logged successfully');
            setShowAddExpense(false);
            setNewExpense({
                mainCategory: '',
                subCategory: '',
                amount: '',
                paymentMode: 'CASH',
                description: '',
                paidTo: '',
                paidDate: format(new Date(), 'yyyy-MM-dd'),
                billDate: format(new Date(), 'yyyy-MM-dd')
            });
            setBillFile(null);
            setBillPreview(null);
            loadExpenses();
            setActiveTab('monitoring');
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed to create expense');
        } finally {
            setSubmitting(false);
        }
    };

    if (showAddExpense) {
        return (
            <div className="max-w-4xl mx-auto flex flex-col animate-in fade-in duration-300">
                <div className="bg-white rounded-xl border border-gray-200 shadow-2xl overflow-hidden flex flex-col">
                    <form onSubmit={handleCreateExpense} className="flex flex-col">
                        {/* Header with Back Button */}
                        <div className="px-8 py-6 bg-emerald-600 text-white flex items-center justify-between shrink-0 rounded-t-xl">
                            <div className="flex items-center gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddExpense(false)}
                                    className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-all"
                                >
                                    <ArrowLeft size={20} />
                                </button>
                                <div>
                                    <h4 className="text-lg font-bold tracking-tight leading-none">New Expense Request</h4>
                                    <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">Log direct expenditure & generate expense record</p>
                                </div>
                            </div>
                            <Receipt size={28} className="opacity-20" />
                        </div>

                        {/* Body */}
                        <div className="p-8 space-y-6">
                            {/* Row 1: Categories */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Category <span className="text-rose-500">*</span></label>
                                    <select required value={newExpense.mainCategory} onChange={e => setNewExpense({ ...newExpense, mainCategory: e.target.value, subCategory: '' })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all">
                                        <option value="">Select category</option>
                                        {expenseCategories.map(cat => (
                                            <option key={cat.id} value={cat.rawName}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Sub Category {(() => {
                                        const currentCategoryObj = expenseCategories.find(c => c.rawName === newExpense.mainCategory);
                                        const hasSubCategories = (currentCategoryObj?.subCategories || []).length > 0;
                                        return hasSubCategories && <span className="text-rose-500">*</span>;
                                    })()}</label>
                                    <select
                                        value={newExpense.subCategory}
                                        onChange={e => setNewExpense({ ...newExpense, subCategory: e.target.value })}
                                        required={Boolean(expenseCategories.find(c => c.rawName === newExpense.mainCategory)?.subCategories?.length)}
                                        disabled={!newExpense.mainCategory || !(expenseCategories.find(c => c.rawName === newExpense.mainCategory)?.subCategories?.length)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all disabled:opacity-50"
                                    >
                                        <option value="">Select sub category</option>
                                        {expenseCategories.find(c => c.rawName === newExpense.mainCategory)?.subCategories?.map(sub => (
                                            <option key={sub.id} value={sub.rawName}>{sub.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Row 2: Amount & Paid To */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Bill Amount (₹) <span className="text-rose-500">*</span></label>
                                    <input type="number" step="any" required value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                                        placeholder="0.00"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Paid To / Vendor <span className="text-rose-500">*</span></label>
                                    <input type="text" required value={newExpense.paidTo} onChange={e => setNewExpense({ ...newExpense, paidTo: e.target.value })}
                                        placeholder="e.g. Petrol Bunk, Tea Stall"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" />
                                </div>
                            </div>

                            {/* Row 3: Dates */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Bill Date <span className="text-rose-500">*</span></label>
                                    <input type="date" required value={newExpense.billDate} onChange={e => setNewExpense({ ...newExpense, billDate: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Payment Date <span className="text-rose-500">*</span></label>
                                    <input type="date" required value={newExpense.paidDate} onChange={e => setNewExpense({ ...newExpense, paidDate: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" />
                                </div>
                            </div>

                            {/* Row 4: Mode */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Payment Mode <span className="text-rose-500">*</span></label>
                                    <select required value={newExpense.paymentMode} onChange={e => setNewExpense({ ...newExpense, paymentMode: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all">
                                        <option value="CASH">Cash</option>
                                        <option value="UPI">UPI</option>
                                        <option value="CARD">Card</option>
                                        <option value="CHEQUE">Cheque</option>
                                        <option value="BANK_TRANSFER">Bank Transfer</option>
                                    </select>
                                </div>
                            </div>

                            {/* Row 5: Upload */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider ml-1">Upload Bill</label>
                                <div className="relative group">
                                    <input type="file" accept="image/*,.pdf" onChange={e => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            setBillFile(file);
                                            setBillPreview(URL.createObjectURL(file));
                                        }
                                    }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                    <div className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center transition-all ${billFile ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 group-hover:border-emerald-400 bg-gray-50'}`}>
                                        {billPreview ? (
                                            <div className="relative">
                                                {billFile.type === 'application/pdf' ? (
                                                    <div className="flex flex-col items-center gap-2">
                                                        <FileText size={48} className="text-emerald-500" />
                                                        <p className="text-[10px] font-bold text-emerald-600 truncate max-w-[200px]">{billFile.name}</p>
                                                    </div>
                                                ) : (
                                                    <img src={billPreview} className="w-32 h-32 object-cover rounded-xl shadow-lg" alt="Preview" />
                                                )}
                                                <button type="button" onClick={(e) => { e.preventDefault(); setBillFile(null); setBillPreview(null); }}
                                                    className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-600 transition-all">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-gray-400 mb-3 group-hover:text-emerald-500 transition-all">
                                                    <Upload size={24} />
                                                </div>
                                                <p className="text-sm text-gray-500 font-medium text-center">Drag and Drop or <span className="text-emerald-600 font-bold">Choose file</span> to upload</p>
                                                <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest font-bold">PDF or IMAGE</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Row 6: Description */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Bill Description</label>
                                <textarea rows={3} value={newExpense.description} onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                                    placeholder="Enter the bill description here..."
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all resize-none" />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-6 border-t border-gray-200 bg-gray-50/30 flex justify-end shrink-0 rounded-b-xl">
                            <button type="submit" disabled={submitting}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-4 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 active:scale-95">
                                {submitting ? <Loader2 size={18} className="animate-spin" /> : <Receipt size={18} />}
                                Submit Request
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div key={storeId} className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="text-xs text-gray-500 flex items-center gap-1 mb-2 mt-4">
                    <span>Home</span> &gt; <span>Finance</span> &gt; <span className="text-emerald-600 font-medium">Expense Management</span>
                </div>
            </div>

            {/* Sub-tab Navigation Bar */}
            <div className="border-b border-gray-200 mb-6">
                <div className="flex gap-8 overflow-x-auto no-scrollbar">
                    {[
                        { id: 'monitoring', label: 'Expense Monitoring', icon: Receipt },
                        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                        { id: 'categories', label: 'Expense Categories', icon: Tag }
                    ].map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 py-3.5 border-b-2 text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap outline-none ${isActive
                                    ? 'border-emerald-600 text-emerald-600'
                                    : 'border-transparent text-gray-500 hover:text-emerald-600 hover:border-gray-300'
                                    }`}
                            >
                                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-emerald-600' : 'text-gray-400'} />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {activeTab === 'categories' && <ExpenseCategoriesTab />}

            {activeTab === 'monitoring' && (
                <>
                    {/* Filter controls */}
                    <div className="flex flex-wrap items-center justify-end gap-3 mb-6">
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-600 shadow-sm outline-none cursor-pointer"
                        >
                            <option value="">All Statuses</option>
                            <option value="PENDING">Pending</option>
                            <option value="APPROVED">Approved</option>
                            <option value="REJECTED">Rejected</option>
                            <option value="PAID">Paid</option>
                        </select>

                        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm relative group">
                            <Calendar size={16} className="text-emerald-500" />
                            <input type="date" value={date} onChange={e => setDate(e.target.value)}
                                className="bg-transparent border-none focus:outline-none text-sm font-bold text-gray-700" />
                            {date && (
                                <button onClick={() => setDate('')} className="ml-1 p-1 hover:bg-rose-50 text-gray-300 hover:text-rose-500 rounded-lg transition-all">
                                    <X size={12} strokeWidth={3} />
                                </button>
                            )}
                        </div>

                        <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}
                            className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-600 shadow-sm outline-none cursor-pointer">
                            <option value="">All Modes</option>
                            <option value="CASH">Cash</option>
                            <option value="PERSONAL_CASH">Personal Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="CARD">Card</option>
                            <option value="CHEQUE">Cheque</option>
                            <option value="BANK_TRANSFER">Bank Transfer</option>
                        </select>

                        <button onClick={() => exportExpensesToExcel(expenses)}
                            className="bg-white border border-gray-200 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-gray-50 shadow-sm active:scale-[0.98] transition-all flex items-center gap-2">
                            <Download size={16} /> Export Excel
                        </button>

                        {(isGlobalRole || can('EXPENSES', 'CREATE', 'MONITORING')) && (
                            <button onClick={() => setShowAddExpense(true)}
                                className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-50 active:scale-[0.98] transition-all flex items-center gap-2 shrink-0">
                                <Plus size={16} strokeWidth={3} /> Log Direct Expense
                            </button>
                        )}
                    </div>

                    {/* Bulk Actions */}
                    {selected.length > 0 && (
                        <div className="flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-lg shadow-lg">
                            <span className="text-xs font-bold">{selected.length} selected</span>
                            <div className="flex gap-2 ml-auto">
                                {can('EXPENSES', 'UPDATE', 'APPROVAL') && (
                                    <>
                                        <button onClick={() => handleBulkAction('APPROVED')}
                                            className="px-4 py-1.5 bg-emerald-500 rounded-xl text-[10px] font-bold uppercase hover:bg-emerald-400 transition-all">Approve All</button>
                                        <button onClick={() => handleBulkAction('REJECTED')}
                                            className="px-4 py-1.5 bg-rose-500 rounded-xl text-[10px] font-bold uppercase hover:bg-rose-400 transition-all">Reject All</button>
                                        <button onClick={() => handleBulkAction('PAID')}
                                            className="px-4 py-1.5 bg-emerald-600 rounded-xl text-[10px] font-bold uppercase hover:bg-emerald-500 transition-all">Pay All</button>
                                    </>
                                )}
                                <button onClick={() => setSelected([])} className="p-1.5 hover:bg-white/10 rounded-lg"><X size={14} /></button>
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex items-center justify-center py-32 gap-4 flex-col text-gray-400">
                            <Loader2 className="animate-spin text-emerald-600" size={40} />
                            <p className="font-bold text-xs uppercase tracking-widest italic">Loading expenses...</p>
                        </div>
                    ) : expenses.length === 0 ? (
                        <div className="bg-white rounded-xl p-24 border border-dashed border-gray-200 text-center shadow-inner">
                            <Receipt size={56} className="mx-auto text-gray-200 mb-4" />
                            <h3 className="text-xl font-bold text-gray-400">No Expenses Recorded</h3>
                        </div>
                    ) : (
                        <div className="overflow-x-auto custom-scrollbar pb-4">
                            <table className="w-full text-left border-separate border-spacing-0">
                                <thead>
                                    <tr className="bg-gray-50/50">
                                        <th className="sticky left-0 bg-gray-50/50 z-10 px-4 py-3 border-b border-gray-200 whitespace-nowrap">
                                            <input type="checkbox" checked={selected.length === expenses.length && expenses.length > 0}
                                                onChange={toggleAll} className="rounded" />
                                        </th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 whitespace-nowrap">Voucher ID</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 whitespace-nowrap">Category</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 whitespace-nowrap">Sub Category</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 whitespace-nowrap">Bill Date</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 whitespace-nowrap">Paid Date</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 whitespace-nowrap">Paid To</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 whitespace-nowrap">Bill Amt</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 whitespace-nowrap">Approved By</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 whitespace-nowrap">Created By</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 whitespace-nowrap text-emerald-600">Paid Amt</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 whitespace-nowrap text-emerald-500">Balance</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 whitespace-nowrap">Mode</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 whitespace-nowrap">Bill</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 whitespace-nowrap">Status</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 whitespace-nowrap">Remarks</th>
                                        <th className="sticky right-0 bg-white z-10 px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 text-right whitespace-nowrap">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 bg-white">
                                    {expenses.map((exp) => {
                                        const meta = getMeta(exp);
                                        const payInfo = getPaymentInfo(exp.description);
                                        const remarks = getRemarks(exp.description);
                                        return (
                                            <tr key={exp.id} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="sticky left-0 bg-white group-hover:bg-gray-50/50 z-10 px-4 py-3 border-b border-gray-200 whitespace-nowrap">
                                                    <input type="checkbox" checked={selected.includes(exp.id)} onChange={() => toggleSelect(exp.id)}
                                                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                                                </td>
                                                <td className="px-4 py-3 border-b border-gray-200 whitespace-nowrap text-[11px] font-bold text-gray-600">
                                                    <span className="text-[10px] font-bold text-emerald-600 font-mono tracking-tighter bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">{exp.displayId || '—'}</span>
                                                </td>
                                                <td className="px-4 py-3 border-b border-gray-200 whitespace-nowrap text-[11px] font-bold text-gray-900">
                                                    {(exp.type?.split(' | ')[0] || '-').replace(/^\[(AGENT|STORE)\]\s*/i, '')}
                                                </td>
                                                <td className="px-4 py-3 border-b border-gray-200 whitespace-nowrap text-[11px] font-bold text-gray-600">
                                                    {(exp.type?.split(' | ')[1] || '-').replace(/^\[(AGENT|STORE)\]\s*/i, '')}
                                                </td>
                                                <td className="px-4 py-3 border-b border-gray-200 whitespace-nowrap text-[10px] font-bold text-gray-600">
                                                    {meta.billDate || exp.billDate || exp.date || '—'}
                                                </td>
                                                <td className="px-4 py-3 border-b border-gray-200 whitespace-nowrap text-[10px] font-bold text-gray-600">
                                                    {meta.paidDate || exp.paidDate || '—'}
                                                </td>
                                                <td className="px-4 py-3 border-b border-gray-200 whitespace-nowrap text-[10px] font-bold text-gray-700 capitalize">
                                                    {meta.paidTo || exp.paidTo || '—'}
                                                </td>
                                                <td className="px-4 py-3 border-b border-gray-200 whitespace-nowrap text-[11px] font-bold text-gray-900">
                                                    ₹{exp.amount.toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 border-b border-gray-200 whitespace-nowrap text-[10px] font-bold text-gray-500">
                                                    {getApprovedBy(exp.description)}
                                                </td>
                                                <td className="px-4 py-3 border-b border-gray-200 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-500">
                                                            {exp.user?.name?.[0]}
                                                        </div>
                                                        <span className="text-[10px] font-bold text-gray-600">{exp.user?.name || 'System'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 border-b border-gray-200 whitespace-nowrap text-[10px] font-bold text-emerald-600">
                                                    ₹{payInfo ? Number(payInfo.paid).toLocaleString() : (exp.status === 'PAID' ? exp.amount.toLocaleString() : '0')}
                                                </td>
                                                <td className="px-4 py-3 border-b border-gray-200 whitespace-nowrap text-[10px] font-bold text-emerald-500">
                                                    ₹{payInfo ? Number(payInfo.balance).toLocaleString() : '0'}
                                                </td>
                                                <td className="px-4 py-3 border-b border-gray-200 whitespace-nowrap text-[9px] font-bold text-gray-400 uppercase">
                                                    {exp.paymentMode}
                                                </td>
                                                <td className="px-4 py-3 border-b border-gray-200 whitespace-nowrap">
                                                    {exp.billImage ? (
                                                        <button onClick={() => setSelectedExpense(exp)} className="p-1 bg-slate-50 text-slate-400 rounded-md hover:bg-slate-900 hover:text-white transition-all border border-slate-100">
                                                            <FileText size={10} />
                                                        </button>
                                                    ) : '—'}
                                                </td>
                                                <td className="px-4 py-3 border-b border-gray-200 whitespace-nowrap">
                                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase border ${STATUS_STYLES[exp.status] || 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                                                        {exp.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 border-b border-gray-200 whitespace-nowrap text-[9px] font-bold text-gray-500 max-w-[150px] truncate">
                                                    {remarks}
                                                </td>
                                                <td className="sticky right-0 bg-white group-hover:bg-gray-50/50 z-10 px-4 py-3 border-b border-gray-200 whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {can('EXPENSES', 'UPDATE', 'APPROVAL') && exp.status === 'PENDING' && (
                                                            <>
                                                                <button onClick={() => {
                                                                    setActionModal({ expenseId: exp.id, action: 'APPROVED', expense: exp });
                                                                    fetchRegisterBalance();
                                                                }}
                                                                    className="p-1 bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100" title="Approve">
                                                                    <Check size={10} strokeWidth={3} />
                                                                </button>
                                                                <button onClick={() => setActionModal({ expenseId: exp.id, action: 'REJECTED', isReturn: true, expense: exp })}
                                                                    className="p-1 bg-amber-50 text-amber-600 rounded-md hover:bg-amber-600 hover:text-white transition-all border border-amber-100" title="Return">
                                                                    <RotateCcw size={10} />
                                                                </button>
                                                                <button onClick={() => setActionModal({ expenseId: exp.id, action: 'REJECTED', expense: exp })}
                                                                    className="p-1 bg-rose-50 text-rose-600 rounded-md hover:bg-rose-600 hover:text-white transition-all border border-rose-100" title="Reject">
                                                                    <X size={10} strokeWidth={3} />
                                                                </button>
                                                            </>
                                                        )}
                                                        {can('EXPENSES', 'UPDATE', 'APPROVAL') && exp.status === 'APPROVED' && (
                                                            <button onClick={() => setActionModal({ expenseId: exp.id, action: 'PAID', expense: exp })}
                                                                className="p-1 bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100">
                                                                <ShieldCheck size={10} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {activeTab === 'analytics' && <ExpenseAnalytics />}

            <ExpenseActionModal
                isOpen={!!actionModal}
                onClose={() => setActionModal(null)}
                actionData={actionModal}
                onAction={handleAction}
                registerBalance={registerBalance}
            />

            {/* Bill Preview */}
            {selectedExpense && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-4" onClick={() => setSelectedExpense(null)}>
                    <div className="relative max-w-4xl w-full max-h-screen flex flex-col items-center justify-center gap-4">
                        {selectedExpense.billImage?.toLowerCase().endsWith('.pdf') ? (
                            <iframe src={selectedExpense.billImage} className="w-full h-[80vh] rounded-lg bg-white" title="Bill PDF" />
                        ) : (
                            <img src={selectedExpense.billImage} alt="Bill" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
                        )}
                        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-6 py-3 rounded-lg border border-white/20" onClick={e => e.stopPropagation()}>
                            <p className="text-white text-xs font-bold uppercase tracking-widest">{selectedExpense.type}</p>
                            <span className="w-px h-4 bg-white/20"></span>
                            <p className="text-emerald-400 font-bold">₹{selectedExpense.amount}</p>
                            <button onClick={() => setSelectedExpense(null)} className="ml-4 p-2 bg-white/10 hover:bg-rose-500 text-white rounded-xl transition-all">
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
