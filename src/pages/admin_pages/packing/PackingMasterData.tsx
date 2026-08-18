import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Box,
  Tag,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  Search,
  Filter,
  RotateCcw,
} from 'lucide-react';
import {
  masterDataService,
  Category,
  UnitOfMeasure,
  Product,
} from '../../../api/packing/masterDataService';
import DataTable from '../../../components/packing/ui/DataTable';
import Modal from '../../../components/packing/ui/Modal';
import ConfirmModal from '../../../components/packing/ui/ConfirmModal';
import Button from '../../../components/packing/ui/Button';

export const PackingMasterData: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'categories' | 'uom' | 'products'>('categories');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Data states
  const [dataList, setDataList] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [uoms, setUOMs] = useState<UnitOfMeasure[]>([]);

  // Modals
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isToggleModalOpen, setIsToggleModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  // Form states
  const [formData, setFormData] = useState<any>({});

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'categories') {
        const data = await masterDataService.getCategories();
        setDataList(data);
      } else if (activeTab === 'uom') {
        const data = await masterDataService.getUOMs();
        setDataList(data);
      } else if (activeTab === 'products') {
        const data = await masterDataService.getProducts();
        setDataList(data);
        const cats = await masterDataService.getCategories();
        setCategories(cats);
        const ums = await masterDataService.getUOMs();
        setUOMs(ums);
      }
      setSearchQuery('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch master data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isCreating) {
        if (activeTab === 'categories') await masterDataService.createCategory(formData);
        if (activeTab === 'uom') await masterDataService.createUOM(formData);
        if (activeTab === 'products') await masterDataService.createProduct(formData);
        setSuccess('Created successfully!');
      } else if (isEditing && selectedRecord) {
        if (activeTab === 'categories') await masterDataService.updateCategory(selectedRecord.id, formData);
        if (activeTab === 'uom') await masterDataService.updateUOM(selectedRecord.id, formData);
        if (activeTab === 'products') await masterDataService.updateProduct(selectedRecord.id, formData);
        setSuccess('Updated successfully!');
      }
      closeModals();
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Save failed.');
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleDelete = async () => {
    if (!selectedRecord) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (activeTab === 'categories') await masterDataService.deleteCategory(selectedRecord.id);
      if (activeTab === 'uom') await masterDataService.deleteUOM(selectedRecord.id);
      if (activeTab === 'products') await masterDataService.deleteProduct(selectedRecord.id);
      setSuccess('Deleted successfully!');
      closeModals();
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Delete failed.');
    } finally {
      setLoading(false);
      setIsDeleteModalOpen(false);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedRecord) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (activeTab === 'categories') await masterDataService.toggleCategoryStatus(selectedRecord.id);
      if (activeTab === 'uom') await masterDataService.toggleUOMStatus(selectedRecord.id);
      if (activeTab === 'products') await masterDataService.toggleProductStatus(selectedRecord.id);
      setSuccess('Status toggled successfully!');
      closeModals();
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Toggle status failed.');
    } finally {
      setLoading(false);
      setIsToggleModalOpen(false);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const closeModals = () => {
    setIsCreating(false);
    setIsEditing(false);
    setIsDeleteModalOpen(false);
    setIsToggleModalOpen(false);
    setSelectedRecord(null);
    setFormData({});
  };

  const openCreate = () => {
    closeModals();
    setFormData({});
    setIsCreating(true);
  };

  const openEdit = (record: any) => {
    closeModals();
    setSelectedRecord(record);
    setFormData(record);
    setIsEditing(true);
  };

  const openDelete = (record: any) => {
    setSelectedRecord(record);
    setIsDeleteModalOpen(true);
  };

  const openToggle = (record: any) => {
    setSelectedRecord(record);
    setIsToggleModalOpen(true);
  };

  const checkIsReferenced = (row: any) => {
    if (!row._count) return false;
    const { products, recipesAsOutput, recipeItems, workOrders, finishedGoods } = row._count;
    return (
      products > 0 ||
      recipesAsOutput > 0 ||
      recipeItems > 0 ||
      workOrders > 0 ||
      finishedGoods > 0
    );
  };

  const filteredData = useMemo(() => {
    return dataList.filter((item) => {
      if (filterStatus !== 'All') {
        if (filterStatus === 'Active' && !item.isActive) return false;
        if (filterStatus === 'Inactive' && item.isActive) return false;
      }

      if (activeTab === 'products') {
        if (filterType !== 'All' && item.type !== filterType) return false;
        if (filterCategory !== 'All' && item.categoryId !== filterCategory) return false;
      }

      if (!searchQuery) return true;
      const lowerQuery = searchQuery.toLowerCase();
      if (activeTab === 'categories')
        return (
          item.name?.toLowerCase().includes(lowerQuery) ||
          item.description?.toLowerCase().includes(lowerQuery)
        );
      if (activeTab === 'uom')
        return (
          item.name?.toLowerCase().includes(lowerQuery) ||
          item.abbreviation?.toLowerCase().includes(lowerQuery)
        );
      if (activeTab === 'products')
        return (
          item.name?.toLowerCase().includes(lowerQuery) ||
          item.sku?.toLowerCase().includes(lowerQuery)
        );
      return true;
    });
  }, [dataList, searchQuery, activeTab, filterType, filterCategory, filterStatus]);

  const tabs = [
    { id: 'categories', label: 'Categories', icon: <Layers size={16} /> },
    { id: 'uom', label: 'Units of Measure', icon: <Box size={16} /> },
    { id: 'products', label: 'Products', icon: <Tag size={16} /> },
  ] as const;

  const renderActions = (row: any) => {
    const isReferenced = checkIsReferenced(row);
    const deleteTooltip = isReferenced
      ? 'Cannot delete because it is assigned to other records'
      : 'Delete';
    return (
      <div className="flex justify-center gap-2">
        <button
          className="flex items-center justify-center w-8 h-8 border border-slate-200 dark:border-gray-700 rounded-lg text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-800 shadow-xs"
          title="Edit"
          onClick={() => openEdit(row)}
        >
          <Edit2 size={15} strokeWidth={1.5} />
        </button>
        <div title={deleteTooltip}>
          <button
            className={`flex items-center justify-center w-8 h-8 border border-slate-200 dark:border-gray-700 rounded-lg transition-colors bg-white dark:bg-gray-800 shadow-xs ${
              isReferenced
                ? 'text-slate-300 dark:text-gray-600 cursor-not-allowed'
                : 'text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-700'
            }`}
            disabled={isReferenced}
            onClick={() => {
              if (!isReferenced) openDelete(row);
            }}
          >
            <Trash2 size={15} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    );
  };

  const getColumns = () => {
    const cols: any[] = [];
    if (activeTab === 'categories') {
      cols.push({
        key: 'name',
        label: 'Name',
        className: 'w-[35%] text-left p-4',
        render: (r: any) => (
          <span
            className="font-semibold text-slate-800 dark:text-white block truncate max-w-[200px]"
            title={r.name}
          >
            {r.name}
          </span>
        ),
      });
      cols.push({
        key: 'description',
        label: 'Description',
        className: 'w-[40%] text-left p-4',
        render: (r: any) => (
          <span
            className="text-slate-600 dark:text-gray-300 block truncate max-w-[300px]"
            title={r.description}
          >
            {r.description || '-'}
          </span>
        ),
      });
    } else if (activeTab === 'uom') {
      cols.push({
        key: 'name',
        label: 'Name',
        className: 'w-[45%] text-left p-4',
        render: (r: any) => (
          <span
            className="font-semibold text-slate-800 dark:text-white block truncate max-w-[250px]"
            title={r.name}
          >
            {r.name}
          </span>
        ),
      });
      cols.push({
        key: 'abbreviation',
        label: 'Abbreviation',
        className: 'w-[30%] text-left p-4',
        render: (r: any) => (
          <span className="font-mono text-slate-600 dark:text-gray-300">
            {r.abbreviation}
          </span>
        ),
      });
    } else if (activeTab === 'products') {
      cols.push({
        key: 'sku',
        label: 'SKU',
        className: 'w-[20%] text-left p-4',
        render: (r: any) => (
          <span
            className="font-mono font-medium text-slate-600 dark:text-gray-300 block truncate max-w-[120px]"
            title={r.sku}
          >
            {r.sku}
          </span>
        ),
      });
      cols.push({
        key: 'name',
        label: 'Name',
        className: 'w-[25%] text-left p-4',
        render: (r: any) => (
          <span
            className="font-semibold text-slate-800 dark:text-white block truncate max-w-[200px]"
            title={r.name}
          >
            {r.name}
          </span>
        ),
      });
      cols.push({
        key: 'type',
        label: 'Type',
        className: 'w-[15%] text-left p-4',
        render: (r: any) => (
          <span className="text-slate-600 dark:text-gray-300 text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-gray-700 px-2 py-1 rounded-md">
            {r.type?.replace('_', ' ')}
          </span>
        ),
      });
      cols.push({
        key: 'category',
        label: 'Category',
        className: 'w-[15%] text-left p-4',
        render: (r: any) => (
          <span
            className="text-slate-600 dark:text-gray-300 block truncate max-w-[150px]"
            title={r.category?.name}
          >
            {r.category?.name || '-'}
          </span>
        ),
      });
      cols.push({
        key: 'uom',
        label: 'UOM',
        className: 'w-[10%] text-left p-4',
        render: (r: any) => (
          <span className="text-slate-600 dark:text-gray-300">
            {r.uom?.abbreviation || '-'}
          </span>
        ),
      });
    }

    cols.push({
      key: 'isActive',
      label: 'Status',
      className: 'w-[10%] text-center p-4',
      render: (r: any) => (
        <div className="flex flex-col items-center justify-center gap-1">
          <button
            onClick={() => openToggle(r)}
            className={`relative inline-flex h-6 w-[42px] items-center rounded-full transition-colors focus:outline-none ${
              r.isActive ? 'bg-[#00891D]' : 'bg-slate-300 dark:bg-gray-600 hover:bg-slate-400'
            }`}
            title={r.isActive ? 'Click to Deactivate' : 'Click to Activate'}
          >
            <span
              className="inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-xs"
              style={{
                transform: r.isActive ? 'translateX(20px)' : 'translateX(2px)',
              }}
            />
          </button>
          <span
            className={`text-[11px] font-semibold leading-none ${
              r.isActive ? 'text-[#00891D]' : 'text-slate-500 dark:text-gray-400'
            }`}
          >
            {r.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      ),
    });
    cols.push({
      key: 'actions',
      label: 'Actions',
      className: 'w-[15%] text-center p-4',
      render: renderActions,
    });
    return cols;
  };

  return (
    <div className="space-y-6 text-left pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">
            Master Data Management
          </h2>
          <p className="text-sm text-slate-500 dark:text-gray-400">
            Manage foundational entities for the Packing ERP system.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2 text-red-700 dark:text-red-300 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-sm">
          <CheckCircle2 size={16} />
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 dark:border-gray-700 gap-4">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                closeModals();
                setError('');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-green-600 text-green-700 dark:text-green-400 bg-green-50/50 dark:bg-green-900/20'
                  : 'border-transparent text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 hover:border-slate-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm font-semibold shadow-xs transition-all mb-2"
        >
          <Plus size={16} />
          <span>Create New</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        {activeTab === 'products' ? (
          <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 shadow-xs h-10 overflow-hidden">
            <div className="px-3 flex items-center justify-center text-slate-500 dark:text-gray-400">
              <Filter size={16} />
            </div>
            <div className="w-px h-6 bg-slate-200 dark:bg-gray-700" />

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 text-sm font-semibold text-slate-700 dark:text-gray-300 bg-transparent border-none focus:ring-0 outline-none cursor-pointer appearance-none min-w-[110px]"
            >
              <option value="All" className="dark:bg-gray-800">Type</option>
              <option value="RAW_MATERIAL" className="dark:bg-gray-800">RAW MATERIAL</option>
              <option value="PACKAGING" className="dark:bg-gray-800">PACKAGING</option>
              <option value="FINISHED_GOOD" className="dark:bg-gray-800">FINISHED GOOD</option>
            </select>

            <div className="w-px h-6 bg-slate-200 dark:bg-gray-700" />

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 text-sm font-semibold text-slate-700 dark:text-gray-300 bg-transparent border-none focus:ring-0 outline-none cursor-pointer appearance-none min-w-[120px]"
            >
              <option value="All" className="dark:bg-gray-800">Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="dark:bg-gray-800">
                  {c.name}
                </option>
              ))}
            </select>

            <div className="w-px h-6 bg-slate-200 dark:bg-gray-700" />

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-sm font-semibold text-slate-700 dark:text-gray-300 bg-transparent border-none focus:ring-0 outline-none cursor-pointer appearance-none min-w-[100px]"
            >
              <option value="All" className="dark:bg-gray-800">Status</option>
              <option value="Active" className="dark:bg-gray-800">Active</option>
              <option value="Inactive" className="dark:bg-gray-800">Inactive</option>
            </select>

            <div className="w-px h-6 bg-slate-200 dark:bg-gray-700" />

            <button
              onClick={() => {
                setFilterType('All');
                setFilterCategory('All');
                setFilterStatus('All');
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors bg-transparent"
            >
              <RotateCcw size={14} />
              Reset Filter
            </button>
          </div>
        ) : (
          <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 shadow-xs h-10 overflow-hidden">
            <div className="px-3 flex items-center justify-center text-slate-500 dark:text-gray-400">
              <Filter size={16} />
            </div>
            <div className="w-px h-6 bg-slate-200 dark:bg-gray-700" />

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-sm font-semibold text-slate-700 dark:text-gray-300 bg-transparent border-none focus:ring-0 outline-none cursor-pointer appearance-none min-w-[100px]"
            >
              <option value="All" className="dark:bg-gray-800">Status</option>
              <option value="Active" className="dark:bg-gray-800">Active</option>
              <option value="Inactive" className="dark:bg-gray-800">Inactive</option>
            </select>

            <div className="w-px h-6 bg-slate-200 dark:bg-gray-700" />

            <button
              onClick={() => {
                setFilterStatus('All');
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors bg-transparent"
            >
              <RotateCcw size={14} />
              Reset Filter
            </button>
          </div>
        )}

        <div className="relative w-full md:w-64 h-10 flex items-center bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 shadow-xs">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-full pl-3 pr-10 bg-transparent border-none focus:ring-0 outline-none text-sm text-slate-700 dark:text-gray-200"
          />
          <Search className="absolute right-3 text-slate-400" size={16} />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs">
        {loading && dataList.length === 0 ? (
          <div className="p-10 flex justify-center text-green-600">
            <Loader2 size={32} className="animate-spin" />
          </div>
        ) : (
          <DataTable
            columns={getColumns()}
            data={filteredData}
            keyExtractor={(row: any) => row.id}
          />
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isCreating || isEditing}
        onClose={closeModals}
        title={`${isCreating ? 'Create' : 'Edit'} ${
          tabs.find((t) => t.id === activeTab)?.label
        }`}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {activeTab === 'categories' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-gray-300 mb-1">
                  Name
                </label>
                <input
                  required
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full border border-slate-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-gray-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full border border-slate-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600"
                />
              </div>
            </div>
          )}

          {activeTab === 'uom' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-gray-300 mb-1">
                  Name (e.g. Kilograms)
                </label>
                <input
                  required
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full border border-slate-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-gray-300 mb-1">
                  Abbreviation (e.g. kg)
                </label>
                <input
                  required
                  type="text"
                  value={formData.abbreviation || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, abbreviation: e.target.value })
                  }
                  className="w-full border border-slate-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600"
                />
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-gray-300 mb-1">
                  Product SKU
                </label>
                <input
                  required
                  type="text"
                  value={formData.sku || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
                  className="w-full border border-slate-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-gray-300 mb-1">
                  Product Name
                </label>
                <input
                  required
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full border border-slate-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  required
                  value={formData.categoryId || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, categoryId: e.target.value })
                  }
                  className="w-full border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600"
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-gray-300 mb-1">
                  Unit of Measure
                </label>
                <select
                  required
                  value={formData.uomId || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, uomId: e.target.value })
                  }
                  className="w-full border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600"
                >
                  <option value="">Select UOM</option>
                  {uoms.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.abbreviation})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-gray-300 mb-1">
                  Type *
                </label>
                <select
                  required
                  value={formData.type || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  className="w-full border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600"
                >
                  <option value="">Select Type</option>
                  <option value="RAW_MATERIAL">RAW MATERIAL</option>
                  <option value="PACKAGING">PACKAGING</option>
                  <option value="FINISHED_GOOD">FINISHED GOOD</option>
                </select>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 gap-2 border-t border-slate-100 dark:border-gray-700 mt-4">
            <Button type="button" variant="secondary" onClick={closeModals}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={loading}>
              Save
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={closeModals}
        onConfirm={handleDelete}
        title="Confirm Delete"
        message={`Are you sure you want to delete ${selectedRecord?.name}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={loading}
      />

      <ConfirmModal
        isOpen={isToggleModalOpen}
        onClose={closeModals}
        onConfirm={handleToggleStatus}
        title="Confirm Status Change"
        message={`Are you sure you want to ${
          selectedRecord?.isActive ? 'deactivate' : 'activate'
        } ${selectedRecord?.name}?`}
        confirmText={selectedRecord?.isActive ? 'Deactivate' : 'Activate'}
        variant={selectedRecord?.isActive ? 'danger' : 'info'}
        isLoading={loading}
      />
    </div>
  );
};

export default PackingMasterData;
