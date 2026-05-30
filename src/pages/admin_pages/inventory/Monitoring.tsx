import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Reservations from "./Reservations";
import Alerts from "./Alerts";
import Breadcrumbs from "../../../components/common/Breadcrumbs";

const Monitoring = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab from URL
  const getActiveTab = () => {
    if (location.pathname.includes("/reservations")) return "reservations";
    if (location.pathname.includes("/alerts")) return "alerts";
    return "reservations"; // default
  };

  const [activeTab, setActiveTab] = useState(getActiveTab());

  useEffect(() => {
    const tab = getActiveTab();
    setActiveTab(tab);
    // Redirect to default tab if on base path
    if (location.pathname === "/inventory/monitoring") {
      navigate("/inventory/monitoring/reservations", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, navigate]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    navigate(`/inventory/monitoring/${tab}`);
  };

  const tabs = [
    {
      id: "reservations",
      label: "Reservations",
      path: "/inventory/monitoring/reservations",
    },
    { id: "alerts", label: "Alerts", path: "/inventory/monitoring/alerts" },
  ];

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
          Monitoring
        </h1>
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Tabs - Separate Container */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 mb-4 overflow-hidden w-1/2">
        <div className="flex w-full border-b border-gray-200 dark:border-gray-700 overflow-x-auto tabs-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors relative ${
                activeTab === tab.id
                  ? "text-orange-600 dark:text-orange-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-orange-600 dark:bg-orange-400"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content - Render Different Pages */}
      <div>
        {activeTab === "reservations" && <Reservations />}
        {activeTab === "alerts" && <Alerts />}
      </div>
    </div>
  );
};

export default Monitoring;
