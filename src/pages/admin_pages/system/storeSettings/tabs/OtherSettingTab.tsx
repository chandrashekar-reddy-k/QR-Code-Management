import { TextInput } from '../../../../../components/ui';

interface OtherSettingTabProps {
  formData: {
    maxCartItems: string;
    minOrderAmount: string;
    lowStockLimit: string;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const OtherSettingTab = ({ formData, onChange }: OtherSettingTabProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Maximum Items Allowed In Cart */}
      <div>
        <TextInput
          label="Maximum Items Allowed In Cart"
          type="number"
          name="maxCartItems"
          value={formData.maxCartItems}
          onChange={onChange}
          min="1"
          required
        />
        <p className="text-[10px] text-gray-500 mt-1">( Maximum items user can add to cart at once )</p>
      </div>

      {/* Minimum Order Amount */}
      <div>
        <TextInput
          label="Minimum Order Amount"
          type="number"
          name="minOrderAmount"
          value={formData.minOrderAmount}
          onChange={onChange}
          min="0"
          step="0.01"
        />
        <p className="text-[10px] text-gray-500 mt-1">( Below this user will not allowed to place order )</p>
      </div>

      {/* Low stock limit */}
      <div>
        <TextInput
          label="Low stock limit"
          type="number"
          name="lowStockLimit"
          value={formData.lowStockLimit}
          onChange={onChange}
          min="0"
        />
        <p className="text-[10px] text-gray-500 mt-1">( Product will be considered as low stock if stock goes below this limit )</p>
      </div>
    </div>
  );
};

export default OtherSettingTab;

