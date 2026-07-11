import { Bell, Clock } from "lucide-react";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";

const mockNotifications = [
  {
    id: 1,
    title: "Order Item #Dairy Milk Chocolate has been Cancelled",
    timeAgo: "a month ago",
  },
  {
    id: 2,
    title: "Order Item #5-star chocolate has been Cancelled",
    timeAgo: "2 months ago",
  },
  {
    id: 3,
    title: "Order Item #5-star chocolate has been Cancelled",
    timeAgo: "2 months ago",
  },
  {
    id: 4,
    title: "Order Item #5-star chocolate has been Cancelled",
    timeAgo: "2 months ago",
  },
];

const Notifications = () => {
  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Header */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          Notifications
        </h1>
        <BackButton to="/" />
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Notifications Card */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <Bell size={18} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                All Notifications
              </p>
              <p className="text-[11px] text-gray-500">
                Showing {mockNotifications.length} notifications
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {mockNotifications.map((item) => (
            <div
              key={item.id}
              className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <p className="text-xs sm:text-sm text-gray-800 leading-snug">
                {item.title}
              </p>
              <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-500">
                <Clock size={12} className="text-gray-400" />
                <span>{item.timeAgo}</span>
              </div>
            </div>
          ))}

          {mockNotifications.length === 0 && (
            <div className="px-4 py-8 text-center text-xs sm:text-sm text-gray-500">
              You have no notifications right now.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;


