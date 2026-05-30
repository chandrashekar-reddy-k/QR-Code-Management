import { useState } from "react";
import { Save, CreditCard } from "lucide-react";
import {
  TextInput,
  SelectInput,
  PrimaryButton,
  FormSectionWithDots,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";

const PaymentMethods = () => {
  const [saving, setSaving] = useState(false);

  // COD Payments
  const [codPayments, setCodPayments] = useState({
    enabled: true,
    mode: "Global", // 'Global' or 'Product wise'
  });

  // PayPal Payments
  const [paypalPayments, setPaypalPayments] = useState({
    enabled: false,
    paymentMode: "sandbox", // 'sandbox' or 'live'
    currencyCode: "",
    businessEmail: "",
    notificationUrl: "https://uatadmin.villagkart.com/customer/ipn",
  });

  // Razorpay Payments
  const [razorpayPayments, setRazorpayPayments] = useState({
    enabled: false,
    keyId: "rzp_test_RQ9IsRrFSfpet0",
    secretKey: "VoGxsSNhBKhP1o8LwAylZonc",
  });

  // Paystack Payments
  const [paystackPayments, setPaystackPayments] = useState({
    enabled: false,
    publicKey: "",
    secretKey: "",
    currencyCode: "",
  });

  // Stripe Payments
  const [stripePayments, setStripePayments] = useState({
    enabled: false,
    publishableKey: "0",
    secretKey: "0",
    webhookSecretKey: "0",
    paymentEndpointUrl: "https://uatadmin.villagkart.com/webhook/stripe",
    currencyCode: "Indian rupee",
    mode: "sandbox", // 'sandbox' or 'live'
  });

  // Paytm Payments
  const [paytmPayments, setPaytmPayments] = useState({
    enabled: false,
    paymentMode: "sandbox", // 'sandbox' or 'live'
    merchantKey: "",
    merchantId: "",
  });

  // Midtrans Payments
  const [midtransPayments, setMidtransPayments] = useState({
    enabled: false,
    paymentMode: "sandbox", // 'sandbox' or 'live'
    serverKey: "",
    notificationUrl: "https://uatadmin.villagkart.com/midtrans/callback",
    returnUrl: "https://uatweb.villagkart.com/web-payment-status",
  });

  // Phonepe Payments
  const [phonepePayments, setPhonepePayments] = useState({
    enabled: false,
    paymentMode: "live", // 'sandbox' or 'live'
    merchantId: "",
    clientId: "",
    clientVersion: "",
    clientSecret: "",
  });

  // Cashfree Payments
  const [cashfreePayments, setCashfreePayments] = useState({
    enabled: false,
    paymentMode: "sandbox", // 'sandbox' or 'live'
    appId: "",
    secretKey: "",
    notificationUrl: "https://uatadmin.villagkart.com/cashfree/callback",
  });

  // Paytabs Payments
  const [paytabsPayments, setPaytabsPayments] = useState({
    enabled: false,
    paymentMode: "sandbox", // 'sandbox' or 'live'
    profileId: "",
    secretKey: "",
    notificationUrl: "https://uatadmin.villagkart.com/paytabs/callback",
  });

  const handleCodChange = (field: string, value: string | boolean) => {
    setCodPayments((prev) => ({ ...prev, [field]: value }));
  };

  const handlePaypalChange = (field: string, value: string | boolean) => {
    setPaypalPayments((prev) => ({ ...prev, [field]: value }));
  };

  const handleRazorpayChange = (field: string, value: string | boolean) => {
    setRazorpayPayments((prev) => ({ ...prev, [field]: value }));
  };

  const handlePaystackChange = (field: string, value: string | boolean) => {
    setPaystackPayments((prev) => ({ ...prev, [field]: value }));
  };

  const handleStripeChange = (field: string, value: string | boolean) => {
    setStripePayments((prev) => ({ ...prev, [field]: value }));
  };

  const handlePaytmChange = (field: string, value: string | boolean) => {
    setPaytmPayments((prev) => ({ ...prev, [field]: value }));
  };

  const handleMidtransChange = (field: string, value: string | boolean) => {
    setMidtransPayments((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhonepeChange = (field: string, value: string | boolean) => {
    setPhonepePayments((prev) => ({ ...prev, [field]: value }));
  };

  const handleCashfreeChange = (field: string, value: string | boolean) => {
    setCashfreePayments((prev) => ({ ...prev, [field]: value }));
  };

  const handlePaytabsChange = (field: string, value: string | boolean) => {
    setPaytabsPayments((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    alert("Payment methods settings updated successfully!");
    setSaving(false);
  };

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
          Payment Gateways & Methods Settings
        </h1>
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {/* COD Payments */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  COD Payments
                </h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={codPayments.enabled}
                    onChange={(e) =>
                      handleCodChange("enabled", e.target.checked)
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 dark:peer-focus:ring-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-300 after:border-gray-300 dark:after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-600 dark:peer-checked:bg-gray-400"></div>
                </label>
              </div>
              {codPayments.enabled && (
                <div>
                  <SelectInput
                    label="COD Mode"
                    value={codPayments.mode}
                    onChange={(e) => handleCodChange("mode", e.target.value)}
                    options={[
                      {
                        value: "Global",
                        label:
                          "Global : Will be considered for all the products.",
                      },
                      {
                        value: "Product wise",
                        label:
                          "Product wise : Product wise COD wil be considered.",
                      },
                    ]}
                  />
                </div>
              )}
            </div>

            {/* PayPal Payments */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                    Paypal Payments
                  </h3>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paypalPayments.enabled}
                    onChange={(e) =>
                      handlePaypalChange("enabled", e.target.checked)
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 dark:peer-focus:ring-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-300 after:border-gray-300 dark:after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-600 dark:peer-checked:bg-gray-400"></div>
                </label>
              </div>
              {paypalPayments.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <SelectInput
                    label="Payment Mode[ sandbox / live ]"
                    value={paypalPayments.paymentMode}
                    onChange={(e) =>
                      handlePaypalChange("paymentMode", e.target.value)
                    }
                    options={[
                      { value: "sandbox", label: "sandbox" },
                      { value: "live", label: "live" },
                    ]}
                  />
                  <TextInput
                    label="Currency Code [ PayPal supported ]"
                    type="text"
                    value={paypalPayments.currencyCode}
                    onChange={(e) =>
                      handlePaypalChange("currencyCode", e.target.value)
                    }
                    placeholder="Enter currency code"
                  />
                  <TextInput
                    label="Paypal Business Email"
                    type="email"
                    value={paypalPayments.businessEmail}
                    onChange={(e) =>
                      handlePaypalChange("businessEmail", e.target.value)
                    }
                    placeholder="Enter business email"
                  />
                  <TextInput
                    label="Notification URL(Set this as IPN notification URL in you PayPal account)"
                    type="url"
                    value={paypalPayments.notificationUrl}
                    onChange={(e) =>
                      handlePaypalChange("notificationUrl", e.target.value)
                    }
                  />
                </div>
              )}
            </div>

            {/* Razorpay Payments */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                    Razorpay Payments
                  </h3>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={razorpayPayments.enabled}
                    onChange={(e) =>
                      handleRazorpayChange("enabled", e.target.checked)
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 dark:peer-focus:ring-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-300 after:border-gray-300 dark:after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-600 dark:peer-checked:bg-gray-400"></div>
                </label>
              </div>
              {razorpayPayments.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <TextInput
                    label="Razorpay key ID"
                    type="text"
                    value={razorpayPayments.keyId}
                    onChange={(e) =>
                      handleRazorpayChange("keyId", e.target.value)
                    }
                  />
                  <TextInput
                    label="Secret Key"
                    type="text"
                    value={razorpayPayments.secretKey}
                    onChange={(e) =>
                      handleRazorpayChange("secretKey", e.target.value)
                    }
                  />
                </div>
              )}
            </div>

            {/* Paystack Payments */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                    Paystack Payments
                  </h3>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paystackPayments.enabled}
                    onChange={(e) =>
                      handlePaystackChange("enabled", e.target.checked)
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 dark:peer-focus:ring-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-300 after:border-gray-300 dark:after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-600 dark:peer-checked:bg-gray-400"></div>
                </label>
              </div>
              {paystackPayments.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <TextInput
                    label="Paystack Pubic Key"
                    type="text"
                    value={paystackPayments.publicKey}
                    onChange={(e) =>
                      handlePaystackChange("publicKey", e.target.value)
                    }
                    placeholder="Enter public key"
                  />
                  <TextInput
                    label="Paystack Secret Key"
                    type="text"
                    value={paystackPayments.secretKey}
                    onChange={(e) =>
                      handlePaystackChange("secretKey", e.target.value)
                    }
                    placeholder="Enter secret key"
                  />
                  <TextInput
                    label="Currency Code[Paystack Supported]"
                    type="text"
                    value={paystackPayments.currencyCode}
                    onChange={(e) =>
                      handlePaystackChange("currencyCode", e.target.value)
                    }
                    placeholder="Enter currency code"
                  />
                </div>
              )}
            </div>

            {/* Stripe Payments */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                    Stripe Payments
                  </h3>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stripePayments.enabled}
                    onChange={(e) =>
                      handleStripeChange("enabled", e.target.checked)
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 dark:peer-focus:ring-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-300 after:border-gray-300 dark:after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-600 dark:peer-checked:bg-gray-400"></div>
                </label>
              </div>
              {stripePayments.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <TextInput
                    label="Stripe Publishable Key"
                    type="text"
                    value={stripePayments.publishableKey}
                    onChange={(e) =>
                      handleStripeChange("publishableKey", e.target.value)
                    }
                  />
                  <TextInput
                    label="Stripe Secret Key"
                    type="text"
                    value={stripePayments.secretKey}
                    onChange={(e) =>
                      handleStripeChange("secretKey", e.target.value)
                    }
                  />
                  <TextInput
                    label="Stripe Webhook Secret Key"
                    type="text"
                    value={stripePayments.webhookSecretKey}
                    onChange={(e) =>
                      handleStripeChange("webhookSecretKey", e.target.value)
                    }
                  />
                  <TextInput
                    label="Payment Endpoint URL (Set this as Endpoint URL in your Stripe account)"
                    type="url"
                    value={stripePayments.paymentEndpointUrl}
                    onChange={(e) =>
                      handleStripeChange("paymentEndpointUrl", e.target.value)
                    }
                  />
                  <TextInput
                    label="Currency Code [ Stripe supported]"
                    type="text"
                    value={stripePayments.currencyCode}
                    onChange={(e) =>
                      handleStripeChange("currencyCode", e.target.value)
                    }
                  />
                  <SelectInput
                    label="Mode"
                    value={stripePayments.mode}
                    onChange={(e) => handleStripeChange("mode", e.target.value)}
                    options={[
                      { value: "sandbox", label: "sandbox (Testing)" },
                      { value: "live", label: "live (Production)" },
                    ]}
                  />
                </div>
              )}
            </div>

            {/* Paytm Payments */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                    Paytm Payments
                  </h3>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paytmPayments.enabled}
                    onChange={(e) =>
                      handlePaytmChange("enabled", e.target.checked)
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 dark:peer-focus:ring-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-300 after:border-gray-300 dark:after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-600 dark:peer-checked:bg-gray-400"></div>
                </label>
              </div>
              {paytmPayments.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <SelectInput
                    label="Paytm Payment Mode [ sandbox / live ]"
                    value={paytmPayments.paymentMode}
                    onChange={(e) =>
                      handlePaytmChange("paymentMode", e.target.value)
                    }
                    options={[
                      { value: "sandbox", label: "sandbox" },
                      { value: "live", label: "live" },
                    ]}
                  />
                  <TextInput
                    label="Merchant key"
                    type="text"
                    value={paytmPayments.merchantKey}
                    onChange={(e) =>
                      handlePaytmChange("merchantKey", e.target.value)
                    }
                    placeholder="Enter merchant key"
                  />
                  <TextInput
                    label="Merchant ID"
                    type="text"
                    value={paytmPayments.merchantId}
                    onChange={(e) =>
                      handlePaytmChange("merchantId", e.target.value)
                    }
                    placeholder="Enter merchant ID"
                  />
                </div>
              )}
            </div>

            {/* Midtrans Payments */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                    Midtrans Payments
                  </h3>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={midtransPayments.enabled}
                    onChange={(e) =>
                      handleMidtransChange("enabled", e.target.checked)
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 dark:peer-focus:ring-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-300 after:border-gray-300 dark:after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-600 dark:peer-checked:bg-gray-400"></div>
                </label>
              </div>
              {midtransPayments.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <SelectInput
                    label="Midtrans Payment Mode [ sandbox / live ]"
                    value={midtransPayments.paymentMode}
                    onChange={(e) =>
                      handleMidtransChange("paymentMode", e.target.value)
                    }
                    options={[
                      { value: "sandbox", label: "sandbox" },
                      { value: "live", label: "live" },
                    ]}
                  />
                  <TextInput
                    label="Server Key"
                    type="text"
                    value={midtransPayments.serverKey}
                    onChange={(e) =>
                      handleMidtransChange("serverKey", e.target.value)
                    }
                    placeholder="Enter server key"
                  />
                  <TextInput
                    label="Notification URL (Set this as Webhook URL in your Midtrans account)"
                    type="url"
                    value={midtransPayments.notificationUrl}
                    onChange={(e) =>
                      handleMidtransChange("notificationUrl", e.target.value)
                    }
                  />
                  <div>
                    <TextInput
                      label="Return URL (Set this as Webhook URL in your Midtrans account)"
                      type="url"
                      value={midtransPayments.returnUrl}
                      onChange={(e) =>
                        handleMidtransChange("returnUrl", e.target.value)
                      }
                    />
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                      ( Note ** : Confirm you added website url in Web
                      Setting/General Web Settings)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Phonepe Payments */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                    Phonepe Payments
                  </h3>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={phonepePayments.enabled}
                    onChange={(e) =>
                      handlePhonepeChange("enabled", e.target.checked)
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 dark:peer-focus:ring-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-300 after:border-gray-300 dark:after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-600 dark:peer-checked:bg-gray-400"></div>
                </label>
              </div>
              {phonepePayments.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <SelectInput
                    label="Phonepe Payment Mode [ sandbox / live ]"
                    value={phonepePayments.paymentMode}
                    onChange={(e) =>
                      handlePhonepeChange("paymentMode", e.target.value)
                    }
                    options={[
                      { value: "sandbox", label: "sandbox" },
                      { value: "live", label: "Production ( live)" },
                    ]}
                  />
                  <TextInput
                    label="Merchant ID"
                    type="text"
                    value={phonepePayments.merchantId}
                    onChange={(e) =>
                      handlePhonepeChange("merchantId", e.target.value)
                    }
                    placeholder="Enter merchant ID"
                  />
                  <TextInput
                    label="Client ID"
                    type="text"
                    value={phonepePayments.clientId}
                    onChange={(e) =>
                      handlePhonepeChange("clientId", e.target.value)
                    }
                    placeholder="Enter client ID"
                  />
                  <TextInput
                    label="Client Version"
                    type="text"
                    value={phonepePayments.clientVersion}
                    onChange={(e) =>
                      handlePhonepeChange("clientVersion", e.target.value)
                    }
                    placeholder="Enter client version"
                  />
                  <TextInput
                    label="Client Secret"
                    type="text"
                    value={phonepePayments.clientSecret}
                    onChange={(e) =>
                      handlePhonepeChange("clientSecret", e.target.value)
                    }
                    placeholder="Enter client secret"
                  />
                </div>
              )}
            </div>

            {/* Cashfree Payments */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                    Cashfree Payments
                  </h3>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cashfreePayments.enabled}
                    onChange={(e) =>
                      handleCashfreeChange("enabled", e.target.checked)
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 dark:peer-focus:ring-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-300 after:border-gray-300 dark:after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-600 dark:peer-checked:bg-gray-400"></div>
                </label>
              </div>
              {cashfreePayments.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <SelectInput
                    label="Cashfree Payment Mode [ sandbox / live ]"
                    value={cashfreePayments.paymentMode}
                    onChange={(e) =>
                      handleCashfreeChange("paymentMode", e.target.value)
                    }
                    options={[
                      { value: "sandbox", label: "sandbox" },
                      { value: "live", label: "live" },
                    ]}
                  />
                  <TextInput
                    label="App ID"
                    type="text"
                    value={cashfreePayments.appId}
                    onChange={(e) =>
                      handleCashfreeChange("appId", e.target.value)
                    }
                    placeholder="Enter app ID"
                  />
                  <TextInput
                    label="Secret Key"
                    type="text"
                    value={cashfreePayments.secretKey}
                    onChange={(e) =>
                      handleCashfreeChange("secretKey", e.target.value)
                    }
                    placeholder="Enter secret key"
                  />
                  <TextInput
                    label="Notification URL (Set this as Webhook URL in your Cashfree account)"
                    type="url"
                    value={cashfreePayments.notificationUrl}
                    onChange={(e) =>
                      handleCashfreeChange("notificationUrl", e.target.value)
                    }
                  />
                </div>
              )}
            </div>

            {/* Paytabs Payments */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                    Paytabs Payments
                  </h3>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paytabsPayments.enabled}
                    onChange={(e) =>
                      handlePaytabsChange("enabled", e.target.checked)
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 dark:peer-focus:ring-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-300 after:border-gray-300 dark:after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-600 dark:peer-checked:bg-gray-400"></div>
                </label>
              </div>
              {paytabsPayments.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <SelectInput
                    label="Paytabs Payment Mode [ sandbox / live ]"
                    value={paytabsPayments.paymentMode}
                    onChange={(e) =>
                      handlePaytabsChange("paymentMode", e.target.value)
                    }
                    options={[
                      { value: "sandbox", label: "sandbox" },
                      { value: "live", label: "live" },
                    ]}
                  />
                  <TextInput
                    label="Profile ID"
                    type="text"
                    value={paytabsPayments.profileId}
                    onChange={(e) =>
                      handlePaytabsChange("profileId", e.target.value)
                    }
                    placeholder="Enter profile ID"
                  />
                  <TextInput
                    label="Secret Key"
                    type="text"
                    value={paytabsPayments.secretKey}
                    onChange={(e) =>
                      handlePaytabsChange("secretKey", e.target.value)
                    }
                    placeholder="Enter secret key"
                  />
                  <TextInput
                    label="Notification URL"
                    type="url"
                    value={paytabsPayments.notificationUrl}
                    onChange={(e) =>
                      handlePaytabsChange("notificationUrl", e.target.value)
                    }
                  />
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="mt-6 flex items-center justify-end gap-3">
            <PrimaryButton
              type="submit"
              disabled={saving}
              isLoading={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium"
            >
              <Save size={14} />
              <span>Update</span>
            </PrimaryButton>
          </div>
        </div>
      </form>
    </div>
  );
};

export default PaymentMethods;
