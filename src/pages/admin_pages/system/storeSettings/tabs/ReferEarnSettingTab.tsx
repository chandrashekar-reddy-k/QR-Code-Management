import { TextInput } from '../../../../../components/ui';

interface ReferEarnSettingTabProps {
  formData: {
    minimumOrderAmountForReferral: string;
    referralCreditAmountFirstOrder: string;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ReferEarnSettingTab = ({ formData, onChange }: ReferEarnSettingTabProps) => {
  return (
    <div className="space-y-6">
      {/* Refer & Earn Settings Section */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">Refer & Earn Setting</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Minimum Order Amount For Referral */}
          <div>
            <TextInput
              label="Minimum Order Amount For Referral"
              type="number"
              name="minimumOrderAmountForReferral"
              value={formData.minimumOrderAmountForReferral}
              onChange={onChange}
              min="0"
              step="0.01"
            />
          </div>

          {/* Referral Credit Amount First Order */}
          <div>
            <TextInput
              label="Referral Credit Amount First Order"
              type="number"
              name="referralCreditAmountFirstOrder"
              value={formData.referralCreditAmountFirstOrder}
              onChange={onChange}
              min="0"
              step="0.01"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferEarnSettingTab;

