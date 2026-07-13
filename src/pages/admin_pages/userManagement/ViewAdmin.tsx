import { useParams, useNavigate } from "react-router-dom";
import { UserCog, Mail, Phone, Calendar, Shield } from "lucide-react";
import BackButton from "../../../components/common/BackButton";

interface Admin {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

// Mock data - in real app, fetch from API using the ID
const mockAdmins: Admin[] = [
  { id: 1, name: 'John Doe', email: 'john.doe@villagkart.com', phone: '+91-9876543210', role: 'Super Admin', status: 'active', createdAt: '2024-01-15' },
  { id: 2, name: 'Jane Smith', email: 'jane.smith@villagkart.com', phone: '+91-9876543211', role: 'Admin', status: 'active', createdAt: '2024-02-20' },
  { id: 3, name: 'Bob Johnson', email: 'bob.johnson@villagkart.com', phone: '+91-9876543212', role: 'Moderator', status: 'active', createdAt: '2024-03-10' },
  { id: 4, name: 'Alice Williams', email: 'alice.williams@villagkart.com', phone: '+91-9876543213', role: 'Admin', status: 'inactive', createdAt: '2024-04-05' },
];

const ViewAdmin = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // In real app, fetch from API using the ID
  const admin = mockAdmins.find((a) => a.id === parseInt(id || "0"));

  if (!admin) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
            Admin Details
          </h1>
          <div className="flex items-center justify-end">
            <BackButton to="/user-management/admins" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 text-center">
          <p className="text-gray-500 mb-4">
            Admin not found
          </p>
          <BackButton to="/user-management/admins" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title and Back Button */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          Admin Details
        </h1>
        <div className="flex items-center justify-end">
          <BackButton to="/user-management/admins" />
        </div>
      </div>

      {/* Details Card */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm font-semibold text-gray-800">
              {admin.name}
            </p>
            <p className="text-xs text-gray-500">
              {admin.email}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              admin.status === "active"
                ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {admin.status === "active" ? "Active" : "Inactive"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
              <UserCog size={18} className="text-green-600 dark:text-green-400" />
              Personal Information
            </h2>

            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">
                Name
              </p>
              <p className="text-sm font-semibold text-gray-800">
                {admin.name}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase mb-1 flex items-center gap-1">
                <Mail size={12} />
                Email
              </p>
              <p className="text-sm text-gray-700">
                {admin.email}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase mb-1 flex items-center gap-1">
                <Phone size={12} />
                Phone
              </p>
              <p className="text-sm text-gray-700">
                {admin.phone}
              </p>
            </div>
          </div>

          {/* Role & Status Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
              <Shield size={18} className="text-green-600 dark:text-green-400" />
              Role & Status
            </h2>

            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">
                Role
              </p>
              <p className="text-sm font-semibold text-gray-800">
                {admin.role}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">
                Status
              </p>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  admin.status === "active"
                    ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {admin.status === "active" ? "Active" : "Inactive"}
              </span>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase mb-1 flex items-center gap-1">
                <Calendar size={12} />
                Created At
              </p>
              <p className="text-sm text-gray-700">
                {admin.createdAt}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewAdmin;

