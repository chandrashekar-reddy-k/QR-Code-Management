import { useState, useEffect } from "react";
import { CheckCircle, Package, ArrowRight, Clock, XCircle, ChevronRight } from "lucide-react";
import { PickingCompleteMobile } from "./PickingCompleteMobile";

interface PickingCompleteProps {
  onNavigate: (screen: string) => void;
  data?: any;
}

export function PickingComplete({ onNavigate, data }: PickingCompleteProps) {
  const storedUser = localStorage.getItem("user");
  const userObj = storedUser ? JSON.parse(storedUser) : null;
  const userRole = userObj?.role;

  // Staff login (SHOPKEEPER / STORE_STAFF) uses the original mobile picking complete UI
  const isStaffLogin = !userRole || userRole === "SHOPKEEPER" || userRole === "STORE_STAFF";

  if (isStaffLogin) {
    return <PickingCompleteMobile onNavigate={onNavigate} data={data} />;
  }

  const order = data || {};
  const items: any[] = order.items || [];

  const totalItems = items.length;
  const pickedItems = items.filter((i) => i.is_picked).length;
  const rejectedItems = items.filter((i) => i.is_rejected).length;

  // Calculate Time Taken
  const startTime = order.picking_started_at || order.pickingStartedAt;
  const endTime = order.picking_completed_at || order.pickingCompletedAt || new Date().toISOString();
  let timeTakenMinutes = 0;
  if (startTime && endTime) {
    timeTakenMinutes = Math.max(1, Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000));
  }

  const slaMinutes = order.sla_minutes || 30;
  const isSlaBreached = timeTakenMinutes > slaMinutes;

  const formatTimeOnly = (dateStr?: string) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatOrderDateTime = (dateStr?: string): string => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "—";

    const day = String(date.getDate()).padStart(2, '0');
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;

    return `${day}-${month}-${year}, ${hours}:${minutes} ${ampm}`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F4F6]">
      {/* 1. Standard Partner Portal Header */}
      <div className="bg-white px-4 sm:px-6 lg:px-8 py-6 border-b border-gray-200">
        <nav className="text-xs text-gray-500 flex items-center gap-1 mb-3">
          <button onClick={() => onNavigate("dashboard")} className="hover:text-green-600 transition-colors">Home</button>
          <ChevronRight size={12} />
          <button onClick={() => onNavigate("picking-queue")} className="hover:text-green-600 transition-colors">Picking Queue</button>
          <ChevronRight size={12} />
          <span className="font-medium text-orange-600">Order #{order?.order_number}</span>
        </nav>
        <div className="mt-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Picking Complete Summary
          </h1>
        </div>
      </div>

      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
        {/* 2. Success Banner */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={24} className="text-[#00891D]" />
          <div>
            <h3 className="text-green-900 font-bold text-sm">Picking Completed Successfully</h3>
            <p className="text-green-700 text-xs mt-0.5">Order #{order.order_number || "—"}</p>
          </div>
        </div>

        {/* 3. Compact Order Summary Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-gray-900 font-bold text-base mb-4 border-b border-gray-100 pb-3">Order Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500 text-sm">Order Number</span>
              <span className="text-gray-900 font-bold text-sm">#{order.order_number || "—"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500 text-sm">Assigned Shopkeeper</span>
              <span className="text-gray-900 font-semibold text-sm">{order.shopkeeper_name || order.shopkeeper?.name || "Unassigned"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500 text-sm">Completed By</span>
              <span className="text-gray-900 font-semibold text-sm">{userObj?.name || userObj?.username || "Store Manager"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500 text-sm">Total Items</span>
              <span className="text-gray-900 font-semibold text-sm">{totalItems}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500 text-sm">Picked Items</span>
              <span className="text-green-600 font-bold text-sm">{pickedItems}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500 text-sm">Rejected Items</span>
              <span className={`font-bold text-sm ${rejectedItems > 0 ? "text-red-600" : "text-gray-900"}`}>{rejectedItems}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500 text-sm">Time Taken</span>
              <span className="text-gray-900 font-semibold text-sm">{timeTakenMinutes} mins</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500 text-sm">Completed At</span>
              <span className="text-gray-900 font-semibold text-sm">{formatOrderDateTime(endTime)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-50 md:col-span-2">
              <span className="text-gray-500 text-sm">SLA Status</span>
              {isSlaBreached ? (
                <span className="bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded text-xs font-bold">
                  SLA Breached ({slaMinutes}m SLA)
                </span>
              ) : (
                <span className="bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded text-xs font-bold">
                  Within SLA
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 4. Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {(() => {
            const packingStatus = (order.status || "").toLowerCase();
            const isInProgress = packingStatus === "packing";
            const isCompleted = packingStatus === "packed" || packingStatus === "ready" || packingStatus === "dispatched";

            if (isCompleted) {
              return (
                <button
                  onClick={() => onNavigate("packing-queue")}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg py-3 px-4 border border-gray-300 bg-white hover:bg-gray-50 transition-colors text-gray-700 font-semibold text-sm shadow-sm"
                >
                  <span>View</span>
                </button>
              );
            }

            const buttonText = isInProgress ? "Resume Packing" : "Start Packing";
            return (
              <button
                onClick={() => onNavigate("packing-queue")}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg py-3 px-4 bg-[#00891D] hover:bg-[#006614] transition-colors text-white font-bold text-sm shadow-sm"
              >
                <Package size={18} />
                <span>{buttonText}</span>
                <ArrowRight size={18} />
              </button>
            );
          })()}
          <button
            onClick={() => onNavigate("picking-queue")}
            className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors bg-white text-center shadow-sm"
          >
            Back to Picking Queue
          </button>
        </div>
      </div>
    </div>
  );
}
