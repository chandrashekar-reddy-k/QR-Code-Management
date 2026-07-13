import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useInventory } from '../../../hooks/useInventory';
import { Transfer } from '../../../types/inventory.types';
import { FormSection, SelectInput, TextInput, PrimaryButton, Button, BackButton } from '../../../components/ui';
import Breadcrumbs from '../../../components/common/Breadcrumbs';

const CreateTransfer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { transfers, setTransfers, locations, snapshots } = useInventory();
  
  const [formData, setFormData] = useState({
    fromLocation: '',
    toLocation: '',
    notes: '',
    lines: [] as Array<{ variantId: string; sku: string; productName: string; currentOnHand: number; transferQty: number }>,
  });

  // Pre-fill form from navigation state (if coming from inventory overview or SKU detail)
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
      }
    }
  }, [location.state]);

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
    // Get snapshots from the selected "from" location
    const locationSnapshots = formData.fromLocation 
      ? snapshots.filter(s => s.locationCode === formData.fromLocation && s.onHand > 0)
      : snapshots.filter(s => s.onHand > 0);
    
    if (locationSnapshots.length > 0) {
      const firstSnapshot = locationSnapshots[0];
      setFormData((prev) => ({
        ...prev,
        lines: [
          ...prev.lines,
          {
            variantId: firstSnapshot.variantId,
            sku: firstSnapshot.sku,
            productName: firstSnapshot.productName,
            currentOnHand: firstSnapshot.onHand,
            transferQty: 1,
          },
        ],
      }));
    } else {
      alert('No products available at the selected location');
    }
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
            placeholder="Select location"
            options={[
              { value: '', label: 'Select location' },
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
            placeholder="Select location"
            options={[
              { value: '', label: 'Select location' },
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
            <Button
              type="button"
              onClick={addLine}
              variant="outline"
              size="sm"
            >
              Add Item
            </Button>
          </div>
          
          {formData.lines.length === 0 ? (
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 text-center">
              <p className="text-xs text-gray-500">No items added. Click "Add Item" to add products to transfer.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {formData.lines.map((line, index) => (
                <div key={index} className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                    <div className="sm:col-span-2">
                      <TextInput
                        label="Product"
                        value={line.productName}
                        disabled
                        className="bg-white"
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

