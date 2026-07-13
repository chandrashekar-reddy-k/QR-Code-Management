import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus } from "lucide-react";
import Transfers from "./Transfers";
import GRN from "./GRN";
import CycleCounts from "./CycleCounts";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import { PrimaryButton } from "../../../components/ui";

const Operations = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab from URL
  const getActiveTab = () => {
    if (location.pathname.includes("/transfers")) return "transfers";
    if (location.pathname.includes("/grn")) return "grn";
    if (location.pathname.includes("/cycle-counts")) return "cycle-counts";
    return "transfers"; // default
  };

  const [activeTab, setActiveTab] = useState(getActiveTab());

  useEffect(() => {
    const tab = getActiveTab();
    setActiveTab(tab);
    // Redirect to default tab if on base path
    if (location.pathname === "/inventory/operations") {
      navigate("/inventory/operations/transfers", { replace: true });
    }
  }, [location.pathname, navigate]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    navigate(`/inventory/operations/${tab}`);
  };

  const tabs = [
    {
      id: "transfers",
      label: "Transfers",
      path: "/inventory/operations/transfers",
    },
    {
      id: "grn",
      label: "Goods Receipts (GRN)",
      path: "/inventory/operations/grn",
    },
    {
      id: "cycle-counts",
      label: "Cycle Counts",
      path: "/inventory/operations/cycle-counts",
    },
  ];

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          Operations
        </h1>
        {activeTab === "transfers" && (
          <PrimaryButton
            onClick={() => navigate("/inventory/operations/transfers/create")}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            Create Transfer
          </PrimaryButton>
        )}
        {activeTab === "grn" && (
          <PrimaryButton
            onClick={() => {
              window.dispatchEvent(new CustomEvent("openCreateGRNModal"));
            }}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            Create GRN
          </PrimaryButton>
        )}
        {activeTab === "cycle-counts" && (
          <PrimaryButton
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("openCreateCycleCountModal")
              );
            }}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            Start Cycle Count
          </PrimaryButton>
        )}
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Tabs - Separate Container */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 mb-4 overflow-hidden w-1/2">
        <div className="flex w-full border-b border-gray-200 overflow-x-auto tabs-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors relative ${
                activeTab === tab.id
                  ? "text-orange-600 dark:text-orange-400"
                  : "text-gray-600 hover:text-gray-900 dark:hover:text-gray-200"
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
        {activeTab === "transfers" && <Transfers />}
        {activeTab === "grn" && <GRN />}
        {activeTab === "cycle-counts" && <CycleCounts />}
      </div>
    </div>
  );
};

export default Operations;
