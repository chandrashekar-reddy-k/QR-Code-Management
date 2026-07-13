import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";

import {
  SearchInput,
  ConfirmModal,
  ViewIconButton,
  EditIconButton,
  DeleteIconButton,
  DataTable,
  Pagination,
  PrimaryButton,
} from "../../../../components/ui";
import Breadcrumbs from "../../../../components/common/Breadcrumbs";

interface TableRole {
  id: string;
  name: string;
  createdAt?: string;
}

const AccessManagement = () => {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string | null;
  }>({ isOpen: false, id: null });

  // Dummy roles data
  const [tableRoles, setTableRoles] = useState<TableRole[]>([
    {
      id: "1",
      name: "Partners",
      createdAt: "2026-01-14T10:00:00Z",
    },
    {
      id: "2",
      name: "Vendors",
      createdAt: "2026-01-14T10:00:00Z",
    },
    {
      id: "3",
      name: "Delivery Agents",
      createdAt: "2026-01-14T10:00:00Z",
    },
  ]);

  const filteredRoles: TableRole[] = useMemo(() => {
    if (!searchTerm.trim()) return tableRoles;
    const q = searchTerm.toLowerCase();
    return tableRoles.filter(
      (role) =>
        role.id.toLowerCase().includes(q) ||
        role.name.toLowerCase().includes(q)
    );
  }, [tableRoles, searchTerm]);

  const paginatedRoles = filteredRoles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDeleteClick = (id: string) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.id) return;
    setTableRoles((prev) => prev.filter((role) => role.id !== deleteConfirm.id));
    setDeleteConfirm({ isOpen: false, id: null });
  };

  const columns = [
    {
      key: "id",
      label: "ID",
      sortable: false,
      render: (role: TableRole) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {role.id}
          </span>
        </div>
      ),
    },
    {
      key: "name",
      label: "ROLES",
      sortable: false,
      render: (role: TableRole) => (
        <div className="text-left">
          <span className="text-xs sm:text-sm font-semibold text-gray-900">
            {role.name}
          </span>
        </div>
      ),
    },
    {
      key: "createdAt",
      label: "CREATED ON",
      sortable: false,
      render: (role: TableRole) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {role.createdAt
              ? new Date(role.createdAt).toLocaleString()
              : "—"}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      label: "ACTIONS",
      sortable: false,
      render: (role: TableRole) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <ViewIconButton
              onClick={() => navigate(`/master-setup/roles/view/${role.id}`)}
              size={12}
              tooltip="View"
            />
            <EditIconButton
              onClick={() => navigate(`/master-setup/roles/edit/${role.id}`)}
              size={12}
              tooltip="Edit"
            />
            <DeleteIconButton
              onClick={() => handleDeleteClick(role.id)}
              size={12}
              tooltip="Delete"
            />
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          Access Management
        </h1>
        <PrimaryButton
          onClick={() => navigate("/master-setup/roles/create")}
          size="sm"
          className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
        >
          <Plus size={14} className="sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm">Add New Role</span>
        </PrimaryButton>
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Search */}
      <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="w-full lg:w-72 lg:flex-shrink-0">
          <SearchInput
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 w-full"
          />
        </div>
      </div>

      {/* Roles Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable
            data={paginatedRoles}
            columns={columns}
            sortField={null}
            sortDirection={null}
            onSort={() => {}}
            loading={false}
            keyExtractor={(role) => role.id}
            emptyMessage="No roles found"
          />
        </div>

        {/* Pagination */}
        {filteredRoles.length > 0 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 whitespace-nowrap">
                  Show
                </span>
                <select
                  value={itemsPerPage.toString()}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="w-16 h-7 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white text-gray-900"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <span className="text-gray-600 whitespace-nowrap">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(
                    currentPage * itemsPerPage,
                    filteredRoles.length
                  )}{" "}
                  of {filteredRoles.length}
                </span>
              </div>

              <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                  <Pagination
                    currentPage={currentPage}
                    pagination={{
                      page: currentPage,
                      limit: itemsPerPage,
                      total: filteredRoles.length,
                      totalPages: Math.max(
                        1,
                        Math.ceil(filteredRoles.length / itemsPerPage)
                      ),
                      hasNext:
                        currentPage <
                        Math.max(
                          1,
                          Math.ceil(filteredRoles.length / itemsPerPage)
                        ),
                      hasPrev: currentPage > 1,
                    }}
                    onPageChange={setCurrentPage}
                  />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Role"
        message="Are you sure you want to delete this role? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default AccessManagement;

