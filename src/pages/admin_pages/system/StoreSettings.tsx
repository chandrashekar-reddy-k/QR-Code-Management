import { useState } from 'react';
import { Save, Store, MapPin, Settings, Truck, Smartphone, Home, Users, LogIn, ShoppingCart, Gift, Receipt } from 'lucide-react';
import StoreSettingTab from './storeSettings/tabs/StoreSettingTab';
import AddressSettingTab from './storeSettings/tabs/AddressSettingTab';
import OtherSettingTab from './storeSettings/tabs/OtherSettingTab';
import DeliveryBoySettingTab from './storeSettings/tabs/DeliveryBoySettingTab';
import AppSettingTab from './storeSettings/tabs/AppSettingTab';
import FrontendHomeSettingTab from './storeSettings/tabs/FrontendHomeSettingTab';
import SellerSettingTab from './storeSettings/tabs/SellerSettingTab';
import LoginSettingTab from './storeSettings/tabs/LoginSettingTab';
import CartSettingTab from './storeSettings/tabs/CartSettingTab';
import ReferEarnSettingTab from './storeSettings/tabs/ReferEarnSettingTab';
import AdditionalChargesTab from './storeSettings/tabs/AdditionalChargesTab';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import { PrimaryButton } from '../../../components/ui';

const StoreSettings = () => {
  const [activeTab, setActiveTab] = useState('store-setting');
  const [saving, setSaving] = useState(false);

  // Store Setting Form Data
  const [storeFormData, setStoreFormData] = useState({
    appName: 'VillagKart',
    supportNumber: '9876543210',
    supportEmail: 'support@villagkart.com',
    logo: null as File | null,
    fssaiLicImage: null as File | null,
    panelLoginBackgroundImage: null as File | null,
    copyrightDetails: '',
  });

  // Address Setting Form Data
  const [addressFormData, setAddressFormData] = useState({
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    country: '',
    pincode: '',
    landmark: '',
    latitude: '',
    longitude: '',
  });

  // Other Setting Form Data
  const [otherFormData, setOtherFormData] = useState({
    maxCartItems: '1000',
    minOrderAmount: '1',
    lowStockLimit: '20',
  });

  // Delivery Boy Setting Form Data
  const [deliveryBoyFormData, setDeliveryBoyFormData] = useState({
    bonusType: '',
    commission: '',
    deliveryBoyBonusPercentage: '20',
    minimumBonusAmount: '10',
    maximumBonusAmount: '40',
    orderDeliveryOTP: false,
  });

  // App Setting Form Data
  const [appFormData, setAppFormData] = useState({
    customerAppEnabled: true,
    sellerAppEnabled: true,
    deliveryBoyAppEnabled: true,
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.wrteam.egrocer',
    appStoreUrl: 'https://testflight.apple.com/join/fcRe3J9F',
    androidVersionSystemStatus: false,
    androidRequiredForceUpdate: false,
    androidCurrentVersion: '1.0.0',
    iosVersionSystemStatus: false,
    iosRequiredForceUpdate: false,
    iosCurrentVersion: '1.0.0',
  });

  // FrontEnd Home Setting Form Data
  const [frontendHomeFormData, setFrontendHomeFormData] = useState({
    displayCategorySection: true,
    categoryCount: '10',
    displayBrandSection: true,
    brandCount: '10',
    displaySellerSection: true,
    sellerCount: '10',
    displayCountrySection: true,
    countryCount: '10',
  });

  // Seller Setting Form Data
  const [sellerFormData, setSellerFormData] = useState({
    oneSellerCart: true,
    sellerCommission: '10',
    selfPickupMode: true,
  });

  // Login Setting Form Data
  const [loginFormData, setLoginFormData] = useState({
    phoneLogin: true,
    googleLogin: true,
    appleLogin: true,
    emailLogin: true,
    phoneAuthOTP: true,
    phoneAuthPassword: false,
    firebaseAuthentication: true,
    customSMSGatewayOTP: false,
  });

  // Cart Setting Form Data
  const [cartFormData, setCartFormData] = useState({
    notificationDelayAfterCartAddition: '1',
    notificationInterval: '1',
    notificationStopTime: '772',
  });

  // Refer & Earn Setting Form Data
  const [referEarnFormData, setReferEarnFormData] = useState({
    minimumOrderAmountForReferral: '200',
    referralCreditAmountFirstOrder: '5',
  });

  // Additional Charges Form Data
  const [additionalChargesFormData, setAdditionalChargesFormData] = useState([
    {
      id: '1',
      chargeTitle: 'Handling charge',
      chargeAmount: '30',
    },
  ]);

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [fssaiPreview, setFssaiPreview] = useState<string | null>(null);
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null);

  const handleStoreChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setStoreFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAddressFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleOtherChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setOtherFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDeliveryBoyChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setDeliveryBoyFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setDeliveryBoyFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setAppFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setAppFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFrontendHomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFrontendHomeFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFrontendHomeFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSellerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setSellerFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setSellerFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setLoginFormData((prev) => ({ ...prev, [name]: checked }));
    }
  };

  const handleCartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCartFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleReferEarnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setReferEarnFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAdditionalChargesAdd = () => {
    const newCharge = {
      id: Date.now().toString(),
      chargeTitle: '',
      chargeAmount: '',
    };
    setAdditionalChargesFormData((prev) => [...prev, newCharge]);
  };

  const handleAdditionalChargesRemove = (id: string) => {
    setAdditionalChargesFormData((prev) => prev.filter((charge) => charge.id !== id));
  };

  const handleAdditionalChargesChange = (id: string, field: 'chargeTitle' | 'chargeAmount', value: string) => {
    setAdditionalChargesFormData((prev) =>
      prev.map((charge) => (charge.id === id ? { ...charge, [field]: value } : charge))
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (file) {
      setStoreFormData((prev) => ({ ...prev, [field]: file }));
      
      const reader = new FileReader();
      reader.onloadend = () => {
        if (field === 'logo') {
          setLogoPreview(reader.result as string);
        } else if (field === 'fssaiLicImage') {
          setFssaiPreview(reader.result as string);
        } else if (field === 'panelLoginBackgroundImage') {
          setBackgroundPreview(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (field: string) => {
    setStoreFormData((prev) => ({ ...prev, [field]: null }));
    if (field === 'logo') {
      setLogoPreview(null);
    } else if (field === 'fssaiLicImage') {
      setFssaiPreview(null);
    } else if (field === 'panelLoginBackgroundImage') {
      setBackgroundPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    const tabNames: Record<string, string> = {
      'store-setting': 'Store',
      'address-setting': 'Address',
      'other-setting': 'Other',
      'delivery-boy-setting': 'Delivery Boy',
      'app-setting': 'App',
      'frontend-home-setting': 'FrontEnd Home',
      'seller-setting': 'Seller',
      'login-setting': 'Login',
      'cart-setting': 'Cart Setting',
      'refer-earn-setting': 'Refer & Earn Setting',
      'additional-charges': 'Additional Charges',
    };
    alert(`${tabNames[activeTab] || 'Settings'} settings updated successfully!`);
    setSaving(false);
  };

  const tabs = [
    { id: 'store-setting', label: 'Store Setting', icon: Store },
    { id: 'address-setting', label: 'Address Setting', icon: MapPin },
    { id: 'other-setting', label: 'Other Setting', icon: Settings },
    { id: 'delivery-boy-setting', label: 'Delivery Boy Setting', icon: Truck },
    { id: 'app-setting', label: 'App Setting', icon: Smartphone },
    { id: 'frontend-home-setting', label: 'FrontEnd Home Setting', icon: Home },
    { id: 'seller-setting', label: 'Seller Setting', icon: Users },
    { id: 'login-setting', label: 'Login Setting', icon: LogIn },
    { id: 'cart-setting', label: 'Cart Setting', icon: ShoppingCart },
    { id: 'refer-earn-setting', label: 'Refer & Earn Setting', icon: Gift },
    { id: 'additional-charges', label: 'Additional Charges', icon: Receipt },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'store-setting':
        return (
          <StoreSettingTab
            formData={storeFormData}
            logoPreview={logoPreview}
            fssaiPreview={fssaiPreview}
            backgroundPreview={backgroundPreview}
            onChange={handleStoreChange}
            onFileChange={handleFileChange}
            onRemoveImage={removeImage}
          />
        );
      case 'address-setting':
        return <AddressSettingTab formData={addressFormData} onChange={handleAddressChange} />;
      case 'other-setting':
        return <OtherSettingTab formData={otherFormData} onChange={handleOtherChange} />;
      case 'delivery-boy-setting':
        return <DeliveryBoySettingTab formData={deliveryBoyFormData} onChange={handleDeliveryBoyChange} />;
      case 'app-setting':
        return <AppSettingTab formData={appFormData} onChange={handleAppChange} />;
      case 'frontend-home-setting':
        return <FrontendHomeSettingTab formData={frontendHomeFormData} onChange={handleFrontendHomeChange} />;
      case 'seller-setting':
        return <SellerSettingTab formData={sellerFormData} onChange={handleSellerChange} />;
      case 'login-setting':
        return <LoginSettingTab formData={loginFormData} onChange={handleLoginChange} />;
      case 'cart-setting':
        return <CartSettingTab formData={cartFormData} onChange={handleCartChange} />;
      case 'refer-earn-setting':
        return <ReferEarnSettingTab formData={referEarnFormData} onChange={handleReferEarnChange} />;
      case 'additional-charges':
        return (
          <AdditionalChargesTab
            charges={additionalChargesFormData}
            onAdd={handleAdditionalChargesAdd}
            onRemove={handleAdditionalChargesRemove}
            onChange={handleAdditionalChargesChange}
          />
        );
      default:
        return (
          <StoreSettingTab
            formData={storeFormData}
            logoPreview={logoPreview}
            fssaiPreview={fssaiPreview}
            backgroundPreview={backgroundPreview}
            onChange={handleStoreChange}
            onFileChange={handleFileChange}
            onRemoveImage={removeImage}
          />
        );
    }
  };

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">Store Settings</h1>
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Tabs - Separate Container */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 mb-4 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors relative flex-shrink-0 ${
                  activeTab === tab.id
                    ? 'text-orange-600'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Icon size={16} className="flex-shrink-0" />
                <span>{tab.label}</span>
                {activeTab === tab.id && (
                  <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-orange-600"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <form onSubmit={handleSubmit}>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-3 md:p-6">
          {renderTabContent()}
        </div>
        <div className="mt-4 flex justify-end">
          <PrimaryButton
            type="submit"
            disabled={saving}
            className="flex items-center gap-2"
          >
            <Save size={16} />
            {saving ? 'Updating...' : 'Update Settings'}
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
};

export default StoreSettings;
