import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useInventory } from '../../../hooks/useInventory';
import { useGetAllProductList } from '../../../hooks/product';
import { Transfer } from '../../../types/inventory.types';
import { FormSection, SelectInput, TextInput, PrimaryButton, Button, BackButton } from '../../../components/ui';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import fetchData from '../../../helper';

const CreateTransfer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { transfers, setTransfers, locations, setLocations, snapshots } = useInventory();

  const [loadingWarehouses, setLoadingWarehouses] = useState(false);

  const [formData, setFormData] = useState({
    fromLocation: '',
    toLocation: '',
    notes: '',
    lines: [] as Array<{ variantId: string; sku: string; productName: string; currentOnHand: number; transferQty: number }>,
  });

  // Fetch products scoped specifically to selected fromLocation (warehouse/partner)
  const { data: productsRes, isLoading: loadingProducts } = useGetAllProductList(1, 1000, "", true, undefined, formData.fromLocation);
  const productsList = useMemo(() => {
    return productsRes?.data?.products || productsRes?.data || [];
  }, [productsRes]);

  // Fetch warehouses from API on mount
  useEffect(() => {
    const fetchWarehouses = async () => {
      setLoadingWarehouses(true);
      try {
        const res = await fetchData('warehouses', 'GET');
        const warehouses = res?.data || res || [];
        if (Array.isArray(warehouses) && warehouses.length > 0) {
          setLocations(warehouses.map((w: { id: string; name: string; code: string }) => ({
            code: w.id || w.code,
            name: w.name,
          })));
        }
      } catch (err) {
        console.warn('Could not load warehouses:', err);
      } finally {
        setLoadingWarehouses(false);
      }
    };
    fetchWarehouses();
  }, []);

  // Pre-fill form from navigation state or auto-populate initial line when products load
  useEffect(() => {
    if (location.state) {
      const state = location.state as any;
      if (state.fromLocation) {
        setFormData(prev => ({
          ...prev,
          fromLocation: state.fromLocation,
        }));
      }
      if (state.variantId && state.sku && state.productName && state.currentOnHand) {
        setFormData(prev => ({
          ...prev,
          lines: [{
            variantId: state.variantId,
            sku: state.sku,
            productName: state.productName,
            currentOnHand: state.currentOnHand,
            transferQty: 1,
          }],
        }));
        return;
      }
    }

    // Auto add initial product line if location selected, lines array is empty and products are loaded
    if (formData.fromLocation && productsList.length > 0) {
      setFormData(prev => {
        if (prev.lines.length > 0) return prev;
        const firstProduct = productsList[0];
        const variant = firstProduct.variants?.[0] || firstProduct.masterVariant || {};
        const sku = variant.sku || firstProduct.sku || firstProduct.slug || 'SKU-001';
        const stock = firstProduct.stock ?? variant.stock ?? 100;
        return {
          ...prev,
          lines: [{
            variantId: variant.id || firstProduct.id,
            sku: sku,
            productName: firstProduct.name || 'Unnamed Product',
            currentOnHand: stock,
            transferQty: 1,
          }]
        };
      });
    }
  }, [location.state, productsList, formData.fromLocation]);

  const handleCreateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fromLocation || !formData.toLocation || formData.lines.length === 0) {
      alert('Please fill in all required fields');
      return;
    }

    const newTransfer: Transfer = {
      id: `TRF-${String(transfers.length + 1).padStart(3, '0')}`,
      fromLocation: formData.fromLocation,
      toLocation: formData.toLocation,
      skus: formData.lines,
      status: 'Requested',
      requestedBy: 'Admin',
      requestedAt: new Date().toISOString(),
      notes: formData.notes,
    };

    setTransfers([newTransfer, ...transfers]);
    alert('Transfer created successfully!');
    navigate('/inventory/operations/transfers');
  };

  const handleCancel = () => {
    navigate('/inventory/operations/transfers');
  };

  const addLine = () => {
    if (productsList.length > 0) {
      const firstProduct = productsList[0];
      const variant = firstProduct.variants?.[0] || firstProduct.masterVariant || {};
      const sku = variant.sku || firstProduct.sku || firstProduct.slug || 'SKU-001';
      const stock = firstProduct.stock ?? variant.stock ?? 100;

      setFormData((prev) => ({
        ...prev,
        lines: [
          ...prev.lines,
          {
            variantId: variant.id || firstProduct.id,
            sku: sku,
            productName: firstProduct.name || 'Unnamed Product',
            currentOnHand: stock,
            transferQty: 1,
          },
        ],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        lines: [
          ...prev.lines,
          {
            variantId: '',
            sku: '',
            productName: '',
            currentOnHand: 0,
            transferQty: 1,
          },
        ],
      }));
    }
  };

  const updateLineProduct = (index: number, productId: string) => {
    const selectedProd = productsList.find((p: any) => p.id === productId);
    if (!selectedProd) return;

    const variant = selectedProd.variants?.[0] || selectedProd.masterVariant || {};
    const sku = variant.sku || selectedProd.sku || selectedProd.slug || 'SKU-001';
    const stock = selectedProd.stock ?? variant.stock ?? 100;

    setFormData((prev) => ({
      ...prev,
      lines: prev.lines.map((line, i) =>
        i === index
          ? {
              ...line,
              variantId: variant.id || selectedProd.id,
              sku: sku,
              productName: selectedProd.name,
              currentOnHand: stock,
            }
          : line
      ),
    }));
  };

  const removeLine = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index),
    }));
  };

  const updateLineQty = (index: number, qty: number) => {
    setFormData((prev) => ({
      ...prev,
      lines: prev.lines.map((line, i) => 
        i === index ? { ...line, transferQty: qty } : line
      ),
    }));
  };

  // Get location name from code
  const getLocationName = (code: string) => {
    const location = locations.find(loc => loc.code === code);
    return location ? location.name : code;
  };

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          Create Transfer
        </h1>
        <BackButton onClick={() => navigate('/inventory/operations/transfers')} />
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Create Transfer Form */}
      <FormSection
        title="Create Transfer"
        description="Transfer inventory items from one location to another"
        onSubmit={handleCreateTransfer}
        variant="white"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectInput
            label="From Location"
            value={formData.fromLocation}
            onChange={(e) => setFormData((prev) => ({ ...prev, fromLocation: e.target.value }))}
            required
            placeholder={loadingWarehouses ? "Loading locations..." : "Select location"}
            options={[
              { value: '', label: loadingWarehouses ? 'Loading locations...' : 'Select location' },
              ...locations.map((loc) => ({
                value: loc.code,
                label: loc.name,
              })),
            ]}
          />
          <SelectInput
            label="To Location"
            value={formData.toLocation}
            onChange={(e) => setFormData((prev) => ({ ...prev, toLocation: e.target.value }))}
            required
            placeholder={loadingWarehouses ? "Loading locations..." : "Select location"}
            options={[
              { value: '', label: loadingWarehouses ? 'Loading locations...' : 'Select location' },
              ...locations.map((loc) => ({
                value: loc.code,
                label: loc.name,
              })),
            ]}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
            rows={3}
            placeholder="Additional notes (optional)"
            className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-xs font-medium text-gray-700">
              Transfer Items <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            {formData.fromLocation && (
              <Button
                type="button"
                onClick={addLine}
                variant="outline"
                size="sm"
              >
                Add Item
              </Button>
            )}
          </div>
          
          {!formData.fromLocation ? (
            <div className="p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50 text-center">
              <p className="text-xs text-gray-500 font-medium">Please select a "From Location" first to view and add products for transfer.</p>
            </div>
          ) : formData.lines.length === 0 ? (
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 text-center">
              <p className="text-xs text-gray-500">No items added. Click "Add Item" to add products to transfer.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {formData.lines.map((line, index) => (
                <div key={index} className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                    <div className="sm:col-span-2">
                      <SelectInput
                        label="Product"
                        value={productsList.find((p: any) => p.name === line.productName)?.id || ''}
                        onChange={(e) => updateLineProduct(index, e.target.value)}
                        required
                        placeholder={loadingProducts ? "Loading products..." : "Select product"}
                        options={[
                          { value: '', label: loadingProducts ? 'Loading products...' : 'Select product' },
                          ...productsList.map((p: any) => ({
                            value: p.id,
                            label: `${p.name} (${p.sku || p.slug || 'SKU'})`,
                          })),
                        ]}
                      />
                    </div>
                    <div>
                      <TextInput
                        label="SKU"
                        value={line.sku}
                        disabled
                        className="bg-white"
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <TextInput
                          label="Quantity"
                          type="number"
                          min="1"
                          max={line.currentOnHand}
                          value={line.transferQty.toString()}
                          onChange={(e) => updateLineQty(index, parseInt(e.target.value) || 1)}
                          required
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={() => removeLine(index)}
                        variant="outline"
                        size="sm"
                        className="mt-6"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Available: {line.currentOnHand} units
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 px-4 py-2 bg-white border border-gray-300 dark:border-gray-600 text-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium"
          >
            Cancel
          </button>
          <PrimaryButton
            type="submit"
            className="flex-1"
          >
            Create Transfer
          </PrimaryButton>
        </div>
      </FormSection>
    </div>
  );
};

export default CreateTransfer;

