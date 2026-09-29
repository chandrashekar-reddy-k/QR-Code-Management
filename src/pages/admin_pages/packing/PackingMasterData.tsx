import React, { useState, useEffect, useMemo } from 'react';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  Search,
  Filter,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  masterDataService,
  Category,
  UnitOfMeasure,
} from '../../../api/packing/masterDataService';
import DataTable from '../../../components/packing/ui/DataTable';
import Modal from '../../../components/packing/ui/Modal';
import ConfirmModal from '../../../components/packing/ui/ConfirmModal';
import Button from '../../../components/packing/ui/Button';

export const PackingMasterData: React.FC = () => {
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
      const data = await masterDataService.getProducts();
      setDataList(data);
      const cats = await masterDataService.getCategories();
      setCategories(cats);
      const ums = await masterDataService.getUOMs();
      setUOMs(ums);
      setSearchQuery('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch master data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isCreating) {
        await masterDataService.createProduct(formData);
        setSuccess('Created successfully!');
      } else if (isEditing && selectedRecord) {
        await masterDataService.updateProduct(selectedRecord.id, formData);
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
      await masterDataService.deleteProduct(selectedRecord.id);
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
      await masterDataService.toggleProductStatus(selectedRecord.id);
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
      // Exclude Finished Goods from this view
      if (item.type === 'FINISHED_GOOD' || item.productType === 'FINISHED_GOOD') return false;

      if (filterStatus !== 'All') {
        if (filterStatus === 'Active' && !item.isActive) return false;
        if (filterStatus === 'Inactive' && item.isActive) return false;
      }

      if (filterType !== 'All' && item.type !== filterType) return false;
      if (filterCategory !== 'All' && item.categoryId !== filterCategory) return false;

      if (!searchQuery) return true;
      const lowerQuery = searchQuery.toLowerCase();
      return (
        item.name?.toLowerCase().includes(lowerQuery) ||
        item.sku?.toLowerCase().includes(lowerQuery)
      );
    });
  }, [dataList, searchQuery, filterType, filterCategory, filterStatus]);



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

  const generateSkuFromName = (name: string, uomId?: string) => {
    if (!name?.trim()) return '';
    const nameClean = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase().padEnd(4, 'X');
    const selectedUom = uoms.find((u) => u.id === (uomId || formData.uomId));
    let unitCode = selectedUom?.abbreviation || selectedUom?.name || 'P';
    let qty = 1;
    const match = name.match(/(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?/);
    if (match) {
      qty = match[1] as any;
      if (match[2] && !uomId) {
        unitCode = match[2].toUpperCase();
      }
    }
    const unitClean = unitCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return `${nameClean}-${qty}-${unitClean}`;
  };

  const getColumns = () => {
    const cols: any[] = [];
    
    cols.push({
      key: 'sku',
      label: 'SKU',
      className: 'w-[18%] text-left p-4',
      render: (r: any) => {
        const skuValue = r.sku || r.resolvedSku || '-';
        return (
          <span
            className="font-mono font-semibold text-xs text-slate-700 dark:text-gray-200 bg-slate-100 dark:bg-gray-700/60 px-2 py-0.5 rounded border border-slate-200 dark:border-gray-600 inline-block truncate max-w-[160px]"
            title={skuValue}
          >
            {skuValue}
          </span>
        );
      },
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
            Production Store Room
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

      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
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
              <option value="NON-BRANDED" className="dark:bg-gray-800">NON BRANDED</option>
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
        title={`${isCreating ? 'Create' : 'Edit'} Product`}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-gray-300 mb-1">
                  Product Name
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Aashirvaad Atta 5kg"
                  value={formData.name || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    const autoSku = isCreating ? generateSkuFromName(val, formData.uomId) : formData.sku;
                    setFormData({ ...formData, name: val, ...(isCreating && { sku: autoSku }) });
                  }}
                  className="w-full border border-slate-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-gray-300">
                    Product SKU
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const autoSku = generateSkuFromName(formData.name || '', formData.uomId);
                      setFormData({ ...formData, sku: autoSku });
                    }}
                    className="text-[11px] text-green-600 dark:text-green-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Sparkles size={12} />
                    Auto Generate
                  </button>
                </div>
                <input
                  required
                  type="text"
                  placeholder="e.g. AASH-5-KG"
                  value={formData.sku || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
                  className="w-full border border-slate-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm font-mono focus:ring-1 focus:ring-green-600 focus:border-green-600"
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
                  onChange={(e) => {
                    const val = e.target.value;
                    const autoSku = isCreating ? generateSkuFromName(formData.name || '', val) : formData.sku;
                    setFormData({ ...formData, uomId: val, ...(isCreating && { sku: autoSku }) });
                  }}
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
