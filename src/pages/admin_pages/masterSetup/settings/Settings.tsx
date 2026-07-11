import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const EcommerceSettings = () => {
  const [activeTab, setActiveTab] = useState('General');
  const [formData, setFormData] = useState({
    storeName: '',
    storeEmail: '',
    storePhone: '',
    timezone: '',
    currency: '',
    language: '',
    storeAddress: '123 Main Street, City, State, PIN'
  });

  const [paymentData, setPaymentData] = useState({
    paymentStatus: 'Active',
    paymentTimeout: '30 mins',
    enableCashOnDelivery: false,
    enableOnlinePayment: false,
    enableWalletPayment: false
  });

  const [shippingData, setShippingData] = useState({
    defaultShippingMethod: '',
    freeShippingThreshold: '500',
    shippingRatePerKg: '500',
    enableExpressDelivery: false,
    expressDeliveryCharge: '500'
  });

  const [taxData, setTaxData] = useState({
    enableTaxCalculation: false,
    enableOrderTracking: false,
    defaultTaxRate: '500'
  });

  const [orderData, setOrderData] = useState({
    autoConfirmOrders: false,
    enableOrderTracking: false,
    orderCancellationWindow: '500',
    maxOrderQuantity: '500'
  });

  const [productData, setProductData] = useState({
    autoConfirmOrders: false,
    enableOrderTracking: false,
    enableProductReviews: false,
    lowStockThreshold: ''
  });

  const [notificationData, setNotificationData] = useState({
    enableEmailNotifications: false,
    enableSMSNotifications: false,
    enablePushNotifications: false
  });

  const [seoData, setSeoData] = useState({
    metaTitle: '',
    metaKeywords: '',
    facebookLink: 'https://facebook.com/villagkart',
    twitterLink: 'https://twitter.com/villagkart',
    instagramLink: 'https://instagram.com/villagkart',
    metaDescription: ''
  });

  const [securityData, setSecurityData] = useState({
    sessionTimeout: '10',
    minimumPasswordLength: '10',
    autoConfirmOrders: false
  });

  const [commissionData, setCommissionData] = useState({
    enableCommissionSystem: false,
    vendorCommissionRate: '10',
    platformFee: '2'
  });

  const tabs = [
    'General',
    'Payment',
    'Shipping',
    'Tax',
    'Order',
    'Product',
    'Notification',
    'SEO',
    'Security',
    'Commisions'
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    console.log('Saving settings:', formData);
  };

  const handleReset = () => {
    setFormData({
      storeName: '',
      storeEmail: '',
      storePhone: '',
      timezone: '',
      currency: '',
      language: '',
      storeAddress: '123 Main Street, City, State, PIN'
    });
    setPaymentData({
      paymentStatus: 'Active',
      paymentTimeout: '30 mins',
      enableCashOnDelivery: false,
      enableOnlinePayment: false,
      enableWalletPayment: false
    });
    setShippingData({
      defaultShippingMethod: '',
      freeShippingThreshold: '500',
      shippingRatePerKg: '500',
      enableExpressDelivery: false,
      expressDeliveryCharge: '500'
    });
    setTaxData({
      enableTaxCalculation: false,
      enableOrderTracking: false,
      defaultTaxRate: '500'
    });
    setOrderData({
      autoConfirmOrders: false,
      enableOrderTracking: false,
      orderCancellationWindow: '500',
      maxOrderQuantity: '500'
    });
    setProductData({
      autoConfirmOrders: false,
      enableOrderTracking: false,
      enableProductReviews: false,
      lowStockThreshold: ''
    });
    setNotificationData({
      enableEmailNotifications: false,
      enableSMSNotifications: false,
      enablePushNotifications: false
    });
    setSeoData({
      metaTitle: '',
      metaKeywords: '',
      facebookLink: 'https://facebook.com/villagkart',
      twitterLink: 'https://twitter.com/villagkart',
      instagramLink: 'https://instagram.com/villagkart',
      metaDescription: ''
    });
    setSecurityData({
      sessionTimeout: '10',
      minimumPasswordLength: '10',
      autoConfirmOrders: false
    });
    setCommissionData({
      enableCommissionSystem: false,
      vendorCommissionRate: '10',
      platformFee: '2'
    });
  };

  const handlePaymentInputChange = (field: string, value: string | boolean) => {
    setPaymentData(prev => ({ ...prev, [field]: value }));
  };

  const handleShippingInputChange = (field: string, value: string | boolean) => {
    setShippingData(prev => ({ ...prev, [field]: value }));
  };

  const handleTaxInputChange = (field: string, value: string | boolean) => {
    setTaxData(prev => ({ ...prev, [field]: value }));
  };

  const handleOrderInputChange = (field: string, value: string | boolean) => {
    setOrderData(prev => ({ ...prev, [field]: value }));
  };

  const handleProductInputChange = (field: string, value: string | boolean) => {
    setProductData(prev => ({ ...prev, [field]: value }));
  };

  const handleNotificationInputChange = (field: string, value: string | boolean) => {
    setNotificationData(prev => ({ ...prev, [field]: value }));
  };

  const handleSeoInputChange = (field: string, value: string) => {
    setSeoData(prev => ({ ...prev, [field]: value }));
  };

  const handleSecurityInputChange = (field: string, value: string | boolean) => {
    setSecurityData(prev => ({ ...prev, [field]: value }));
  };

  const handleCommissionInputChange = (field: string, value: string | boolean) => {
    setCommissionData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">E-commerce Settings</h1>
          <p className="text-sm text-gray-500">
            Home &gt; Master Setup &gt; <span className="text-orange-500 dark:text-orange-400">E-Commerce Settings</span>
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b border-gray-200 overflow-x-auto tabs-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? 'text-gray-900 border-b-2 border-orange-500 dark:border-orange-400'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* General Tab Content */}
        {activeTab === 'General' && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-8">General</h2>

            {/* First Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Store Name
                </label>
                <input
                  type="text"
                  placeholder="Enter Name"
                  value={formData.storeName}
                  onChange={(e) => handleInputChange('storeName', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Store Email
                </label>
                <input
                  type="email"
                  placeholder="Enter Name"
                  value={formData.storeEmail}
                  onChange={(e) => handleInputChange('storeEmail', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Store Phone
                </label>
                <input
                  type="tel"
                  placeholder="Enter Name"
                  value={formData.storePhone}
                  onChange={(e) => handleInputChange('storePhone', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Timezone
                </label>
                <div className="relative">
                  <select
                    value={formData.timezone}
                    onChange={(e) => handleInputChange('timezone', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent bg-white text-gray-900"
                  >
                    <option value="">Select</option>
                    <option value="UTC">UTC</option>
                    <option value="EST">EST</option>
                    <option value="PST">PST</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Currency
                </label>
                <div className="relative">
                  <select
                    value={formData.currency}
                    onChange={(e) => handleInputChange('currency', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent bg-white text-gray-900"
                  >
                    <option value="">Select</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Language <span className="text-gray-500 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <select
                    value={formData.language}
                    onChange={(e) => handleInputChange('language', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent bg-white text-gray-900"
                  >
                    <option value="">Select</option>
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Store Address */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Store Address
              </label>
              <textarea
                value={formData.storeAddress}
                onChange={(e) => handleInputChange('storeAddress', e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent resize-none bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <button
                onClick={handleSave}
                className="px-12 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors"
              >
                Save
              </button>
              <button
                onClick={handleReset}
                className="px-12 py-3 bg-white hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 font-medium rounded-md border border-gray-300 dark:border-gray-600 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Payment Tab Content */}
        {activeTab === 'Payment' && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Payment <span className="text-gray-500 font-normal text-base">(Optional)</span>
            </h2>

            {/* Payment and Timeout Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 mt-8">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Payment
                </label>
                <div className="relative">
                  <select
                    value={paymentData.paymentStatus}
                    onChange={(e) => handlePaymentInputChange('paymentStatus', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent bg-white text-gray-900"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Payment Timeout (minutes)
                </label>
                <input
                  type="text"
                  value={paymentData.paymentTimeout}
                  onChange={(e) => handlePaymentInputChange('paymentTimeout', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>

            {/* Toggle Switches */}
            <div className="space-y-6 mb-8">
              <div className="flex items-center">
                <button
                  onClick={() => handlePaymentInputChange('enableCashOnDelivery', !paymentData.enableCashOnDelivery)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    paymentData.enableCashOnDelivery ? 'bg-orange-500 dark:bg-orange-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-200 transition-transform ${
                      paymentData.enableCashOnDelivery ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="ml-3 text-sm font-medium text-gray-900">Enable Cash on Delivery</span>
              </div>

              <div className="flex items-center">
                <button
                  onClick={() => handlePaymentInputChange('enableOnlinePayment', !paymentData.enableOnlinePayment)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    paymentData.enableOnlinePayment ? 'bg-orange-500 dark:bg-orange-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-200 transition-transform ${
                      paymentData.enableOnlinePayment ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="ml-3 text-sm font-medium text-gray-900">Enable Online Payment</span>
              </div>

              <div className="flex items-center">
                <button
                  onClick={() => handlePaymentInputChange('enableWalletPayment', !paymentData.enableWalletPayment)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    paymentData.enableWalletPayment ? 'bg-orange-500 dark:bg-orange-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-200 transition-transform ${
                        paymentData.enableWalletPayment ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                <span className="ml-3 text-sm font-medium text-gray-900">Enable Wallet Payment</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <button
                onClick={handleSave}
                className="px-12 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors"
              >
                Save
              </button>
              <button
                onClick={handleReset}
                className="px-12 py-3 bg-white hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 font-medium rounded-md border border-gray-300 dark:border-gray-600 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Shipping Tab Content */}
        {activeTab === 'Shipping' && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Shipping <span className="text-gray-500 font-normal text-base">(Optional)</span>
            </h2>

            {/* First Row - Three Columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 mt-8">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Default shipping method
                </label>
                <div className="relative">
                  <select
                    value={shippingData.defaultShippingMethod}
                    onChange={(e) => handleShippingInputChange('defaultShippingMethod', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent bg-white text-gray-900"
                  >
                    <option value="">Select</option>
                    <option value="standard">Standard Delivery</option>
                    <option value="express">Express Delivery</option>
                    <option value="overnight">Overnight Delivery</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Free shipping Threshhold
                </label>
                <input
                  type="text"
                  value={shippingData.freeShippingThreshold}
                  onChange={(e) => handleShippingInputChange('freeShippingThreshold', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Shipping Rate per Kg
                </label>
                <input
                  type="text"
                  value={shippingData.shippingRatePerKg}
                  onChange={(e) => handleShippingInputChange('shippingRatePerKg', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>

            {/* Second Row - Toggle and Input */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="flex items-center">
                <button
                  onClick={() => handleShippingInputChange('enableExpressDelivery', !shippingData.enableExpressDelivery)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    shippingData.enableExpressDelivery ? 'bg-orange-500 dark:bg-orange-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-200 transition-transform ${
                      shippingData.enableExpressDelivery ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="ml-3 text-sm font-medium text-gray-900">Enable express delivery</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Express Delivery Charge (₹)
                </label>
                <input
                  type="text"
                  value={shippingData.expressDeliveryCharge}
                  onChange={(e) => handleShippingInputChange('expressDeliveryCharge', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <button
                onClick={handleSave}
                className="px-12 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors"
              >
                Save
              </button>
              <button
                onClick={handleReset}
                className="px-12 py-3 bg-white hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 font-medium rounded-md border border-gray-300 dark:border-gray-600 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Tax Tab Content */}
        {activeTab === 'Tax' && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Tax <span className="text-gray-500 font-normal text-base">(Optional)</span>
            </h2>

            {/* Toggle Switches */}
            <div className="space-y-6 mb-8 mt-8">
              <div className="flex items-center">
                <button
                  onClick={() => handleTaxInputChange('enableTaxCalculation', !taxData.enableTaxCalculation)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    taxData.enableTaxCalculation ? 'bg-orange-500 dark:bg-orange-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-200 transition-transform ${
                      taxData.enableTaxCalculation ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="ml-3 text-sm font-medium text-gray-900">Enable Tax Calculation</span>
              </div>

              <div className="flex items-center">
                <button
                  onClick={() => handleTaxInputChange('enableOrderTracking', !taxData.enableOrderTracking)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    taxData.enableOrderTracking ? 'bg-orange-500 dark:bg-orange-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-200 transition-transform ${
                        taxData.enableOrderTracking ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                <span className="ml-3 text-sm font-medium text-gray-900">Enable Order Tracking</span>
              </div>
            </div>

            {/* Default Tax Rate */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Default Tax Rate (%)
              </label>
              <div className="max-w-md">
                <input
                  type="text"
                  value={taxData.defaultTaxRate}
                  onChange={(e) => handleTaxInputChange('defaultTaxRate', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <button
                onClick={handleSave}
                className="px-12 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors"
              >
                Save
              </button>
              <button
                onClick={handleReset}
                className="px-12 py-3 bg-white hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 font-medium rounded-md border border-gray-300 dark:border-gray-600 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Order Tab Content */}
        {activeTab === 'Order' && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Order <span className="text-gray-500 font-normal text-base">(Optional)</span>
            </h2>

            {/* Layout with Toggles and Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-6 mt-8 mb-8">
              {/* First Column - Toggles */}
              <div className="space-y-6">
                <div className="flex items-center">
                  <button
                    onClick={() => handleOrderInputChange('autoConfirmOrders', !orderData.autoConfirmOrders)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      orderData.autoConfirmOrders ? 'bg-orange-500 dark:bg-orange-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-200 transition-transform ${
                        orderData.autoConfirmOrders ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="ml-3 text-sm font-medium text-gray-900">Auto Confirm Orders</span>
                </div>

                <div className="flex items-center">
                  <button
                    onClick={() => handleOrderInputChange('enableOrderTracking', !orderData.enableOrderTracking)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      orderData.enableOrderTracking ? 'bg-orange-500 dark:bg-orange-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-200 transition-transform ${
                          orderData.enableOrderTracking ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  <span className="ml-3 text-sm font-medium text-gray-900">Enable Order Tracking</span>
                </div>
              </div>

              {/* Second Column - Order Cancellation Window */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Order Cancellation Window (hours)
                </label>
                <input
                  type="text"
                  value={orderData.orderCancellationWindow}
                  onChange={(e) => handleOrderInputChange('orderCancellationWindow', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>

              {/* Third Column - Max Order Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Max Order Quantity
                </label>
                <input
                  type="text"
                  value={orderData.maxOrderQuantity}
                  onChange={(e) => handleOrderInputChange('maxOrderQuantity', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <button
                onClick={handleSave}
                className="px-12 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors"
              >
                Save
              </button>
              <button
                onClick={handleReset}
                className="px-12 py-3 bg-white hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 font-medium rounded-md border border-gray-300 dark:border-gray-600 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Product Tab Content */}
        {activeTab === 'Product' && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Product <span className="text-gray-500 font-normal text-base">(Optional)</span>
            </h2>

            {/* Toggle Switches */}
            <div className="space-y-6 mb-8 mt-8">
              <div className="flex items-center">
                <button
                  onClick={() => handleProductInputChange('autoConfirmOrders', !productData.autoConfirmOrders)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    productData.autoConfirmOrders ? 'bg-orange-500 dark:bg-orange-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-200 transition-transform ${
                      productData.autoConfirmOrders ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="ml-3 text-sm font-medium text-gray-900">Auto Confirm Orders</span>
              </div>

              <div className="flex items-center">
                <button
                  onClick={() => handleProductInputChange('enableOrderTracking', !productData.enableOrderTracking)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    productData.enableOrderTracking ? 'bg-orange-500 dark:bg-orange-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-200 transition-transform ${
                        productData.enableOrderTracking ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                <span className="ml-3 text-sm font-medium text-gray-900">Enable Order Tracking</span>
              </div>

              <div className="flex items-center">
                <button
                  onClick={() => handleProductInputChange('enableProductReviews', !productData.enableProductReviews)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    productData.enableProductReviews ? 'bg-orange-500 dark:bg-orange-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-200 transition-transform ${
                        productData.enableProductReviews ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                <span className="ml-3 text-sm font-medium text-gray-900">Enable Order Tracking</span>
              </div>
            </div>

            {/* Low Stock Threshold */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Low Stock Threshold
              </label>
              <div className="max-w-md">
                <input
                  type="text"
                  value={productData.lowStockThreshold}
                  onChange={(e) => handleProductInputChange('lowStockThreshold', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <button
                onClick={handleSave}
                className="px-12 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors"
              >
                Save
              </button>
              <button
                onClick={handleReset}
                className="px-12 py-3 bg-white hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 font-medium rounded-md border border-gray-300 dark:border-gray-600 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Notification Tab Content */}
        {activeTab === 'Notification' && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Notification <span className="text-gray-500 font-normal text-base">(Optional)</span>
            </h2>

            {/* Toggle Switches */}
            <div className="space-y-6 mb-8 mt-8">
              <div className="flex items-center">
                <button
                  onClick={() => handleNotificationInputChange('enableEmailNotifications', !notificationData.enableEmailNotifications)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notificationData.enableEmailNotifications ? 'bg-orange-500 dark:bg-orange-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-200 transition-transform ${
                      notificationData.enableEmailNotifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="ml-3 text-sm font-medium text-gray-900">Enable Email Notofications</span>
              </div>

              <div className="flex items-center">
                <button
                  onClick={() => handleNotificationInputChange('enableSMSNotifications', !notificationData.enableSMSNotifications)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notificationData.enableSMSNotifications ? 'bg-orange-500 dark:bg-orange-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-200 transition-transform ${
                        notificationData.enableSMSNotifications ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                <span className="ml-3 text-sm font-medium text-gray-900">Enable SMS Notifications</span>
              </div>

              <div className="flex items-center">
                <button
                  onClick={() => handleNotificationInputChange('enablePushNotifications', !notificationData.enablePushNotifications)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notificationData.enablePushNotifications ? 'bg-orange-500 dark:bg-orange-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-200 transition-transform ${
                        notificationData.enablePushNotifications ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                <span className="ml-3 text-sm font-medium text-gray-900">Enable Push Notifications</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <button
                onClick={handleSave}
                className="px-12 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors"
              >
                Save
              </button>
              <button
                onClick={handleReset}
                className="px-12 py-3 bg-white hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 font-medium rounded-md border border-gray-300 dark:border-gray-600 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* SEO Tab Content */}
        {activeTab === 'SEO' && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              SEO <span className="text-gray-500 font-normal text-base">(Optional)</span>
            </h2>

            {/* First Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 mt-8">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Meta Title
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={seoData.metaTitle}
                    onChange={(e) => handleSeoInputChange('metaTitle', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder="500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Meta Keywords
                </label>
                <input
                  type="text"
                  value={seoData.metaKeywords}
                  onChange={(e) => handleSeoInputChange('metaKeywords', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Facebook Link
                </label>
                <input
                  type="text"
                  value={seoData.facebookLink}
                  onChange={(e) => handleSeoInputChange('facebookLink', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="https://facebook.com/villagkart"
                />
              </div>
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Twitter Link
                </label>
                <input
                  type="text"
                  value={seoData.twitterLink}
                  onChange={(e) => handleSeoInputChange('twitterLink', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="https://twitter.com/villagkart"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Instagram Link
                </label>
                <input
                  type="text"
                  value={seoData.instagramLink}
                  onChange={(e) => handleSeoInputChange('instagramLink', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="https://instagram.com/villagkart"
                />
              </div>
            </div>

            {/* Meta Description */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Meta Description
              </label>
              <div className="relative">
                <textarea
                  value={seoData.metaDescription}
                  onChange={(e) => handleSeoInputChange('metaDescription', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent resize-none bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="500"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <button
                onClick={handleSave}
                className="px-12 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors"
              >
                Save
              </button>
              <button
                onClick={handleReset}
                className="px-12 py-3 bg-white hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 font-medium rounded-md border border-gray-300 dark:border-gray-600 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Security Tab Content */}
        {activeTab === 'Security' && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Security <span className="text-gray-500 font-normal text-base">(Optional)</span>
            </h2>

            {/* First Row - Session Timeout and Minimum Password Length */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 mt-8">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Session Timeout (minutes)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={securityData.sessionTimeout}
                    onChange={(e) => handleSecurityInputChange('sessionTimeout', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder="10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Minimum Password Length
                </label>
                <input
                  type="text"
                  value={securityData.minimumPasswordLength}
                  onChange={(e) => handleSecurityInputChange('minimumPasswordLength', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="10"
                />
              </div>
            </div>

            {/* Toggle Switch */}
            <div className="space-y-6 mb-8">
              <div className="flex items-center">
                <button
                  onClick={() => handleSecurityInputChange('autoConfirmOrders', !securityData.autoConfirmOrders)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    securityData.autoConfirmOrders ? 'bg-orange-500 dark:bg-orange-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-200 transition-transform ${
                        securityData.autoConfirmOrders ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                <span className="ml-3 text-sm font-medium text-gray-900">Auto Confirm Orders</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <button
                onClick={handleSave}
                className="px-12 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors"
              >
                Save
              </button>
              <button
                onClick={handleReset}
                className="px-12 py-3 bg-white hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 font-medium rounded-md border border-gray-300 dark:border-gray-600 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Commissions Tab Content */}
        {activeTab === 'Commisions' && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Commissions <span className="text-gray-500 font-normal text-base">(Optional)</span>
            </h2>

            {/* Enable Commission System Toggle */}
            <div className="space-y-6 mb-8 mt-8">
              <div className="flex items-center">
                <button
                  onClick={() => handleCommissionInputChange('enableCommissionSystem', !commissionData.enableCommissionSystem)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    commissionData.enableCommissionSystem ? 'bg-orange-500 dark:bg-orange-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-200 transition-transform ${
                      commissionData.enableCommissionSystem ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="ml-3 text-sm font-medium text-gray-900">Enable Commission System</span>
              </div>
            </div>

            {/* Vendor Commission Rate and Platform Fee */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Vendor Commission Rate (%)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={commissionData.vendorCommissionRate}
                    onChange={(e) => handleCommissionInputChange('vendorCommissionRate', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder="10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Platform Fee (%)
                </label>
                <input
                  type="text"
                  value={commissionData.platformFee}
                  onChange={(e) => handleCommissionInputChange('platformFee', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="2"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <button
                onClick={handleSave}
                className="px-12 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors"
              >
                Save
              </button>
              <button
                onClick={handleReset}
                className="px-12 py-3 bg-white hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 font-medium rounded-md border border-gray-300 dark:border-gray-600 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EcommerceSettings;