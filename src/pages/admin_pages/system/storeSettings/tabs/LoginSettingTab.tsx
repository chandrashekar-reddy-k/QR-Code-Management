interface LoginSettingTabProps {
  formData: {
    phoneLogin: boolean;
    googleLogin: boolean;
    appleLogin: boolean;
    emailLogin: boolean;
    phoneAuthOTP: boolean;
    phoneAuthPassword: boolean;
    firebaseAuthentication: boolean;
    customSMSGatewayOTP: boolean;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const LoginSettingTab = ({ formData, onChange }: LoginSettingTabProps) => {
  const renderToggle = (name: string, label: string, checked: boolean) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-700">
          {label}
        </label>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            name={name}
            checked={checked}
            onChange={onChange}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-300 after:border-gray-300 dark:after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 dark:peer-checked:bg-green-500"></div>
        </label>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {renderToggle('phoneLogin', 'Phone Login', formData.phoneLogin)}
      {renderToggle('googleLogin', 'Google Login', formData.googleLogin)}
      {renderToggle('appleLogin', 'Apple Login', formData.appleLogin)}
      {renderToggle('emailLogin', 'Email Login', formData.emailLogin)}
      {renderToggle('phoneAuthOTP', 'Phone Auth OTP', formData.phoneAuthOTP)}
      {renderToggle('phoneAuthPassword', 'Phone Auth Password', formData.phoneAuthPassword)}
      {renderToggle('firebaseAuthentication', 'Firebase Authentication', formData.firebaseAuthentication)}
      {renderToggle('customSMSGatewayOTP', 'Custom SMS Gateway OTP based', formData.customSMSGatewayOTP)}
    </div>
  );
};

export default LoginSettingTab;

