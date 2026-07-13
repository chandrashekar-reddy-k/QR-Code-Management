import { Clock } from "lucide-react";
import { useParams } from "react-router-dom";
import { Badge } from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";

const ViewTimeSlot = () => {
  const { id } = useParams<{ id: string }>();

  // Mock data - in real app, fetch from API
  const timeSlot = {
    id: parseInt(id || "1"),
    title: "Morning 9AM to 12PM",
    fromTime: "09:00",
    toTime: "12:00",
    lastOrderTime: "11:30",
    status: "active" as const,
  };

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          Time Slot Details
        </h1>
        <BackButton to="/system/delivery-settings" />
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Details Card */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
        <div className="space-y-6">
          {/* ID */}
          <div className="pb-4 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={16} className="text-blue-600" />
              <label className="text-xs font-semibold text-gray-700 uppercase">
                ID
              </label>
            </div>
            <p className="text-sm font-bold text-gray-900">{timeSlot.id}</p>
          </div>

          {/* Title */}
          <div className="pb-4 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={16} className="text-blue-600" />
              <label className="text-xs font-semibold text-gray-700 uppercase">
                Title
              </label>
            </div>
            <p className="text-sm font-bold text-gray-900">{timeSlot.title}</p>
          </div>

          {/* Time Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-4 border-b border-gray-200">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="text-blue-600" />
                <label className="text-xs font-semibold text-gray-700 uppercase">
                  From Time
                </label>
              </div>
              <p className="text-sm font-medium text-gray-900">
                {timeSlot.fromTime}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="text-blue-600" />
                <label className="text-xs font-semibold text-gray-700 uppercase">
                  To Time
                </label>
              </div>
              <p className="text-sm font-medium text-gray-900">
                {timeSlot.toTime}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="text-blue-600" />
                <label className="text-xs font-semibold text-gray-700 uppercase">
                  Last Order Time
                </label>
              </div>
              <p className="text-sm font-medium text-gray-900">
                {timeSlot.lastOrderTime}
              </p>
            </div>
          </div>

          {/* Status */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock size={16} className="text-blue-600" />
              <label className="text-xs font-semibold text-gray-700 uppercase">
                Status
              </label>
            </div>
            <Badge status={timeSlot.status} size="sm" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewTimeSlot;
