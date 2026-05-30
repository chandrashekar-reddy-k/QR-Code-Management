import React, { useEffect, useState, useMemo } from "react";
import {
  Plus,
  RefreshCw,
  Download,
  FileUp,
  MapPin,
  Filter,
  ChevronDown,
  RotateCcw,
  Save,
} from "lucide-react";

import {
  StatCard,
  SearchInput,
  DataTable,
  Pagination,
  SelectInput,
  EditIconButton,
  DeleteIconButton,
  ConfirmModal,
  Button,
  Badge,
  PrimaryButton,
  TextInput,
  FormSectionWithDots,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";

/* -------- types & lookups (unchanged) ------- */
type SystemType =
  | "customer_app"
  | "seller_app"
  | "delivery_boy"
  | "admin"
  | "website";
type LangType = "interface" | "content" | "both";
type Status = "active" | "inactive";

interface Language {
  id: number;
  name: string;
  code: string;
  type: LangType;
  systemType: SystemType;
  default: boolean;
  status: Status;
  supportedLanguage: string;
}

const mockLanguages: Language[] = [
  {
    id: 1,
    name: "English",
    code: "en",
    type: "both",
    systemType: "customer_app",
    default: true,
    status: "active",
    supportedLanguage: "English",
  },
  {
    id: 2,
    name: "हिन्दी",
    code: "hi",
    type: "both",
    systemType: "customer_app",
    default: false,
    status: "active",
    supportedLanguage: "Hindi",
  },
  {
    id: 3,
    name: "English (Seller)",
    code: "en",
    type: "interface",
    systemType: "seller_app",
    default: true,
    status: "active",
    supportedLanguage: "English",
  },
  {
    id: 4,
    name: "Español (Seller)",
    code: "es",
    type: "content",
    systemType: "seller_app",
    default: false,
    status: "active",
    supportedLanguage: "Spanish",
  },
  {
    id: 5,
    name: "English (Delivery)",
    code: "en",
    type: "interface",
    systemType: "delivery_boy",
    default: true,
    status: "active",
    supportedLanguage: "English",
  },
];

const SYSTEM_TYPE_OPTIONS: { value: SystemType; label: string }[] = [
  { value: "customer_app", label: "Customer App" },
  { value: "seller_app", label: "Seller App" },
  { value: "delivery_boy", label: "Delivery Boy" },
  { value: "admin", label: "Admin" },
  { value: "website", label: "Website" },
];

const SUPPORTED_LANGUAGES = [
  "English",
  "Hindi",
  "Spanish",
  "French",
  "Arabic",
  "Chinese",
];

const LANGUAGE_CODE_MAP: Record<string, string> = {
  English: "en",
  Hindi: "hi",
  Spanish: "es",
  French: "fr",
  Arabic: "ar",
  Chinese: "zh",
};

const getSystemLabel = (val: SystemType) =>
  SYSTEM_TYPE_OPTIONS.find((s) => s.value === val)?.label ?? val;

const generateCodeFromSupported = (supported: string, displayName?: string) => {
  if (LANGUAGE_CODE_MAP[supported]) return LANGUAGE_CODE_MAP[supported];
  if (displayName) return displayName.trim().slice(0, 2).toLowerCase();
  return supported.slice(0, 2).toLowerCase();
};

/* -------------------- component -------------------- */
const ManageLanguages: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading] = useState(false);

  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [systemTypeFilter, setSystemTypeFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: number | null;
  }>({
    isOpen: false,
    id: null,
  });

  const [formData, setFormData] = useState({
    name: "",
    systemType: "customer_app" as SystemType,
    default: false,
    supportedLanguage: SUPPORTED_LANGUAGES[0],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setLanguages(mockLanguages);
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    const { name, value, type } = target;
    const checked = (target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Display name is required";
    if (!formData.supportedLanguage)
      newErrors.supportedLanguage = "Supported language required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const ensureSingleDefault = (newLang: Language, list: Language[]) => {
    if (!newLang.default) return list;
    return list.map((l) =>
      l.systemType === newLang.systemType ? { ...l, default: false } : l
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (editingId) {
      // update preserving code/type/status from existing
      setLanguages((prev) =>
        prev
          .map((l) => {
            if (l.id !== editingId) return l;
            return {
              ...l,
              name: formData.name,
              systemType: formData.systemType,
              default: formData.default,
              supportedLanguage: formData.supportedLanguage,
            };
          })
          .map((l) => {
            // if we made this entry default, unset others in same systemType
            if (
              formData.default &&
              l.id !== editingId &&
              l.systemType === formData.systemType
            ) {
              return { ...l, default: false };
            }
            return l;
          })
      );
      alert("Language updated (local)!");
    } else {
      const id =
        languages.length > 0 ? Math.max(...languages.map((l) => l.id)) + 1 : 1;
      const code = generateCodeFromSupported(
        formData.supportedLanguage,
        formData.name
      );
      const newLang: Language = {
        id,
        name: formData.name,
        code,
        type: "both",
        systemType: formData.systemType,
        default: formData.default,
        status: "active",
        supportedLanguage: formData.supportedLanguage,
      };

      setLanguages((prev) => {
        const cleared = ensureSingleDefault(newLang, prev);
        return [...cleared, newLang];
      });

      alert("Language added (local)!");
    }

    resetForm();
    setShowForm(false);
    setEditingId(null);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      systemType: "customer_app",
      default: false,
      supportedLanguage: SUPPORTED_LANGUAGES[0],
    });
    setErrors({});
    setEditingId(null);
  };

  const handleEdit = (lang: Language) => {
    setFormData({
      name: lang.name,
      systemType: lang.systemType,
      default: lang.default,
      supportedLanguage: lang.supportedLanguage,
    });
    setEditingId(lang.id);
    setShowForm(true);
  };

  const handleDeleteClick = (id: number) =>
    setDeleteConfirm({ isOpen: true, id });

  const handleDeleteConfirm = () => {
    if (deleteConfirm.id === null) return;
    setLanguages((prev) => prev.filter((l) => l.id !== deleteConfirm.id));
    setDeleteConfirm({ isOpen: false, id: null });
    alert("Language deleted (local)");
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortField(null);
        setSortDirection(null);
      } else {
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filter + sort
  const filteredAndSortedLanguages = useMemo(() => {
    let filtered = [...languages];

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.name.toLowerCase().includes(term) ||
          l.code.toLowerCase().includes(term) ||
          l.id.toString().includes(term) ||
          getSystemLabel(l.systemType).toLowerCase().includes(term) ||
          l.supportedLanguage.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter((l) => l.status === statusFilter);
    }

    // System Type filter
    if (systemTypeFilter) {
      filtered = filtered.filter((l) => l.systemType === systemTypeFilter);
    }

    // Sorting
    if (sortField && sortDirection) {
      filtered.sort((a, b) => {
        let aValue: string | number | boolean;
        let bValue: string | number | boolean;

        switch (sortField) {
          case "id":
            aValue = a.id;
            bValue = b.id;
            break;
          case "name":
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case "code":
            aValue = a.code.toLowerCase();
            bValue = b.code.toLowerCase();
            break;
          case "type":
            aValue = a.type.toLowerCase();
            bValue = b.type.toLowerCase();
            break;
          case "systemType":
            aValue = getSystemLabel(a.systemType).toLowerCase();
            bValue = getSystemLabel(b.systemType).toLowerCase();
            break;
          case "status":
            aValue = a.status.toLowerCase();
            bValue = b.status.toLowerCase();
            break;
          default:
            return 0;
        }

        if (sortDirection === "asc") {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        } else {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        }
      });
    }

    return filtered;
  }, [
    languages,
    searchTerm,
    statusFilter,
    systemTypeFilter,
    sortField,
    sortDirection,
  ]);

  // Pagination
  const totalPages = Math.ceil(
    filteredAndSortedLanguages.length / itemsPerPage
  );
  const paginatedLanguages = filteredAndSortedLanguages.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setSystemTypeFilter("");
    setCurrentPage(1);
  };

  /* CSV export / import (local) */
  const handleExport = () => {
    const headers = [
      "ID",
      "Name",
      "Code",
      "Type",
      "SystemType",
      "Default",
      "Status",
      "SupportedLanguage",
    ];
    const rows = languages.map((l) => [
      l.id,
      l.name,
      l.code,
      l.type,
      l.systemType,
      l.default ? "true" : "false",
      l.status,
      l.supportedLanguage,
    ]);
    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map((c) => `"${c}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `languages_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const text = ev.target?.result as string;
          const lines = text.split("\n").filter((l) => l.trim());
          const imported: Language[] = [];
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i]
              .split(",")
              .map((c) => c.replace(/"/g, "").trim());
            if (cols.length < 8) continue;
            const id = parseInt(cols[0]) || languages.length + i;
            const name = cols[1] || "";
            const code =
              cols[2] ||
              generateCodeFromSupported(
                cols[7] || SUPPORTED_LANGUAGES[0],
                name
              );
            const type = (cols[3] as LangType) || "both";
            const systemType = (cols[4] as SystemType) || "customer_app";
            const def = cols[5] === "true";
            const status = (cols[6] as Status) || "active";
            const supportedLanguage = cols[7] || SUPPORTED_LANGUAGES[0];
            imported.push({
              id,
              name,
              code,
              type,
              systemType,
              default: def,
              status,
              supportedLanguage,
            });
          }
          if (imported.length) {
            let combined = [...languages];
            for (const imp of imported) {
              if (imp.default)
                combined = combined.map((c) =>
                  c.systemType === imp.systemType ? { ...c, default: false } : c
                );
              combined.push(imp);
            }
            setLanguages(combined);
            alert(`Imported ${imported.length} languages (local).`);
          } else {
            alert("No valid languages found in file.");
          }
        } catch (err) {
          console.error(err);
          alert("Failed to import. Check file format.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Calculate KPI metrics
  const kpiData = useMemo(() => {
    const total = languages.length;
    const active = languages.filter((l) => l.status === "active").length;
    const inactive = languages.filter((l) => l.status === "inactive").length;

    return [
      {
        title: "Total Languages",
        value: total.toLocaleString(),
        icon: MapPin,
        variant: "blue" as const,
      },
      {
        title: "Active",
        value: active.toLocaleString(),
        icon: MapPin,
        variant: "green" as const,
      },
      {
        title: "Inactive",
        value: inactive.toLocaleString(),
        icon: MapPin,
        variant: "red" as const,
      },
    ];
  }, [languages]);

  // Table columns
  const columns = [
    {
      key: "id",
      label: "ID",
      sortable: true,
      render: (lang: Language) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{lang.id}</span>
        </div>
      ),
    },
    {
      key: "name",
      label: "NAME",
      sortable: true,
      render: (lang: Language) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 font-semibold">
            {lang.name}
          </span>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
            ({lang.supportedLanguage})
          </div>
        </div>
      ),
    },
    {
      key: "code",
      label: "CODE",
      sortable: true,
      render: (lang: Language) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{lang.code}</span>
        </div>
      ),
    },
    {
      key: "type",
      label: "TYPE",
      sortable: true,
      render: (lang: Language) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 capitalize">
            {lang.type}
          </span>
        </div>
      ),
    },
    {
      key: "systemType",
      label: "SYSTEM TYPE",
      sortable: true,
      render: (lang: Language) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">
            {getSystemLabel(lang.systemType)}
          </span>
        </div>
      ),
    },
    {
      key: "default",
      label: "DEFAULT",
      sortable: false,
      render: (lang: Language) => (
        <div className="text-center">
          {lang.default ? (
            <Badge status="active" size="sm" />
          ) : (
            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">—</span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      label: "STATUS",
      sortable: true,
      render: (lang: Language) => (
        <div className="text-center">
          <Badge status={lang.status} size="sm" />
        </div>
      ),
    },
    {
      key: "actions",
      label: "ACTIONS",
      sortable: false,
      render: (lang: Language) => (
        <div className="flex items-center justify-center gap-2">
          <EditIconButton
            onClick={() => handleEdit(lang)}
            size={14}
            tooltip="Edit"
          />
          <DeleteIconButton
            onClick={() => handleDeleteClick(lang.id)}
            size={14}
            tooltip="Delete"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-2 mt-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-1">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
            {showForm
              ? editingId
                ? "Edit Language"
                : "Add Language"
              : "Languages"}
          </h1>
          {!showForm && (
            <PrimaryButton
              onClick={() => setShowForm(true)}
              size="sm"
              className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center"
            >
              <Plus size={14} className="sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">Add Language</span>
            </PrimaryButton>
          )}
          {showForm && (
            <BackButton
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
            />
          )}
        </div>
        <Breadcrumbs />
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-6">
          <form onSubmit={handleSubmit}>
            <div className="max-w-4xl">
              <FormSectionWithDots
                title={editingId ? "Edit Language" : "Add New Language"}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <SelectInput
                    label="System Type"
                    required
                    name="systemType"
                    value={formData.systemType}
                    onChange={handleChange}
                    error={errors.systemType}
                    options={SYSTEM_TYPE_OPTIONS}
                  />

                  <SelectInput
                    label="Supported Language"
                    required
                    name="supportedLanguage"
                    value={formData.supportedLanguage}
                    onChange={handleChange}
                    error={errors.supportedLanguage}
                    options={SUPPORTED_LANGUAGES.map((lang) => ({
                      value: lang,
                      label: lang,
                    }))}
                  />

                  <TextInput
                    label="Display Name"
                    required
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Display name in app/web"
                    error={errors.name}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      name="default"
                      checked={formData.default}
                      onChange={handleChange}
                      className="w-4 h-4 border-gray-300 rounded focus:ring-gray-400"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Default language for selected system type</span>
                  </label>
                </div>
              </FormSectionWithDots>

              <div className="flex items-center justify-end gap-3 mt-6">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-xs font-medium"
                >
                  Cancel
                </Button>
                <PrimaryButton
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium"
                >
                  <Save size={14} />
                  <span>{editingId ? "Update Language" : "Add Language"}</span>
                </PrimaryButton>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* KPI Cards */}
      {!showForm && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
          {kpiData.map((kpi, index) => (
            <StatCard
              key={index}
              title={kpi.title}
              value={kpi.value}
              icon={kpi.icon}
              variant={kpi.variant}
              size="md"
              valueSize="2xl"
            />
          ))}
        </div>
      )}

      {/* Export/Import/Refresh Buttons and Search Bar */}
      {!showForm && (
        <div className="mt-2 mb-6 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
          {/* Export, Import, and Refresh Buttons - Left */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={handleExport}
              variant="ghost"
              className="flex items-center gap-1.5 h-10 px-3 sm:px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium bg-white dark:bg-gray-800"
            >
              <Download size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button
              onClick={handleImport}
              variant="ghost"
              className="flex items-center gap-1.5 h-10 px-3 sm:px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium bg-white dark:bg-gray-800"
            >
              <FileUp size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Import</span>
            </Button>
            <Button
              onClick={() => setLanguages(mockLanguages)}
              disabled={loading}
              variant="ghost"
              className="flex items-center gap-1.5 h-10 px-3 sm:px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium bg-white dark:bg-gray-800 disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={`sm:w-4 sm:h-4 ${loading ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>

          {/* Search Bar - Right */}
          <div className="flex-1 w-full sm:max-w-md sm:ml-auto">
            <SearchInput
              placeholder="Search languages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full"
            />
          </div>
        </div>
      )}

      {/* Filters */}
      {!showForm && (
        <div className="mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-gray-300 dark:divide-gray-600 w-full lg:flex-1 lg:max-w-[720px] overflow-hidden">
            {/* Filter icon */}
            <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-center flex-shrink-0">
              <Filter size={18} className="text-gray-700 dark:text-gray-300" />
            </div>

            {/* Status Filter */}
            <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
              <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
                <SelectInput
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { value: "", label: "Status" },
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                  ]}
                />
              </div>
              <ChevronDown
                size={16}
                className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400"
              />
            </div>

            {/* System Type Filter */}
            <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
              <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
                <SelectInput
                  value={systemTypeFilter}
                  onChange={(e) => setSystemTypeFilter(e.target.value)}
                  options={[
                    { value: "", label: "System Type" },
                    ...SYSTEM_TYPE_OPTIONS.map((opt) => ({
                      value: opt.value,
                      label: opt.label,
                    })),
                  ]}
                />
              </div>
              <ChevronDown
                size={16}
                className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400"
              />
            </div>

            {/* Reset button */}
            <div className="px-3 sm:px-4 py-3 sm:py-4 flex-shrink-0">
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap hover:opacity-80 text-orange-600 dark:text-orange-500 w-full sm:w-auto justify-center"
              >
                <RotateCcw size={14} className="sm:w-4 sm:h-4" />
                <span>Reset Filter</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {!showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <DataTable
              data={paginatedLanguages}
              columns={columns}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              keyExtractor={(lang) => lang.id.toString()}
              emptyMessage={
                searchTerm
                  ? "No languages found matching your search"
                  : "No languages found"
              }
              loading={loading}
            />
          </div>

          {/* Pagination */}
          {filteredAndSortedLanguages.length > 0 && (
            <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                  <span className="text-gray-600 dark:text-gray-300 whitespace-nowrap">Show</span>
                  <div className="[&_select]:text-orange-600 dark:[&_select]:text-orange-500 [&_select]:font-medium [&_select]:px-2 [&_select]:py-1 [&_select]:pr-6 [&_select]:border [&_select]:border-gray-300 dark:[&_select]:border-gray-600 [&_select]:rounded-lg [&_select]:bg-white dark:[&_select]:bg-gray-700 [&_select]:w-16 [&_select]:sm:w-20 [&_select]:h-7 [&_select]:text-xs [&_select]:appearance-none">
                    <SelectInput
                      value={itemsPerPage.toString()}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      options={[
                        { value: "10", label: "10" },
                        { value: "25", label: "25" },
                        { value: "50", label: "50" },
                        { value: "100", label: "100" },
                      ]}
                      className="w-16 sm:w-20 h-7 text-xs"
                    />
                  </div>
                  <span className="text-gray-600 dark:text-gray-300 whitespace-nowrap">
                    Showing results{" "}
                    <span className="text-orange-600 dark:text-orange-500 font-medium">
                      {itemsPerPage}
                    </span>{" "}
                    of{" "}
                    <span className="text-orange-600 dark:text-orange-500 font-medium">
                      {filteredAndSortedLanguages.length.toLocaleString()}
                    </span>
                  </span>
                </div>

                <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    totalItems={filteredAndSortedLanguages.length}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Language"
        message="Are you sure you want to delete this language?"
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default ManageLanguages;
