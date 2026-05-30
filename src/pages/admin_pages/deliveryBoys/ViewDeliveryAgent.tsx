import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { User, ChevronDown } from "lucide-react";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";
import { formatDate } from "../../../utils/formatters";
import {
  DataTable,
  ViewIconButton,
  Button,
  SelectInput,
} from "../../../components/ui";
import { useGetDeliveryBoyDetailsById } from "../../../hooks/deliveryBoy";

interface AgentEducation {
  id: string;
  qualification?: string;
  institution?: string;
  yearOfPassing?: number | string;
  cgpa?: string | null;
}

interface AgentExperience {
  id: string;
  organization?: string;
  designation?: string;
  fromDate?: string;
  toDate?: string;
  responsibilities?: string | null;
}

interface AgentBank {
  id: string;
  accountHolderName?: string;
  bankName?: string;
  branchName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  passbookFile?: string | null;
}

interface DeliveryAgentDocument {
  id: string;
  documentType: string;
  fileUrl: string;
}

interface ApiDeliveryBoy {
  id: string;
  name?: string;
  surname?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  fatherOrSpouseName?: string;
  gender?: string;
  nationality?: string;
  dob?: string;
  agentEducations?: AgentEducation[];
  agentExperiences?: AgentExperience[];
  agentBank?: AgentBank | null;
  deliveryAgentDocuments?: DeliveryAgentDocument[];
  approvalStatus?:
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "DOCUMENT_VERIFICATION";
}

interface DeliveryBoyResponseData {
  data: ApiDeliveryBoy;
}

const ViewDeliveryAgent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, refetch } = useGetDeliveryBoyDetailsById(id || "");
  const [activeTab, setActiveTab] = useState("Orders");
  const [statusUpdateOpen, setStatusUpdateOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [currentStatus, setCurrentStatus] = useState<string>("Submitted");
  const [currentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const tabs = [
    "Orders",
    "Transactions",
    "Education Details",
    "Experience Details",
    "Documents Upload",
    "Bank and Settlement Data",
  ];

  useEffect(() => {
    if (id) refetch();
  }, [id, refetch]);

  const responseData = data as DeliveryBoyResponseData | undefined;
  const deliveryBoy = responseData?.data;
  const approvalStatusLabelMap: Record<string, string> = {
    PENDING: "Pending",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    DOCUMENT_VERIFICATION: "Document Verification",
  };

  useEffect(() => {
    if (!deliveryBoy?.approvalStatus) return;
    const mappedStatus =
      approvalStatusLabelMap[deliveryBoy.approvalStatus] || "Submitted";
    setCurrentStatus(mappedStatus);
    setSelectedStatus(mappedStatus);
  }, [deliveryBoy?.approvalStatus]);

  const valueOrDash = (value?: string | null) => value || "---";

  type OrderRow = {
    orderNumber: string;
    user: string;
    address: string;
    payment: string;
    status: string;
    date: string;
  };

  const orderColumns = [
    {
      key: "orderNumber",
      label: "ID",
      sortable: true,
      render: (row: OrderRow) => <div className="text-center">{row.orderNumber}</div>,
    },
    {
      key: "user",
      label: "User",
      sortable: true,
      render: (row: OrderRow) => <div className="text-center">{row.user}</div>,
    },
    {
      key: "address",
      label: "Delivery Address",
      sortable: true,
      render: (row: OrderRow) => (
        <div className="text-center">{row.address}</div>
      ),
    },
    {
      key: "payment",
      label: "P. Method",
      sortable: true,
      render: (row: OrderRow) => (
        <div className="text-center">{row.payment}</div>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (row: OrderRow) => (
        <div className="text-center">{row.status}</div>
      ),
    },
    {
      key: "date",
      label: "Date & Time",
      sortable: true,
      render: (row: OrderRow) => <div className="text-center">{row.date}</div>,
    },
    {
      key: "actions",
      label: "Actions",
      render: (row: OrderRow) => (
        <div className="text-center" onClick={(e) => e.stopPropagation()}>
          <ViewIconButton
            onClick={() =>
              navigate(
                `/home-delivery-orders/view/${row.id}?page=${currentPage}&limit=${itemsPerPage}`
              )
            }
            size={14}
            tooltip="View"
            className="text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
          />
        </div>
      ),
    }
    // {
    //   key: "actions",
    //   label: "Actions",
    //   render: (row: OrderRow) => (
    //     <div className="text-center" onClick={(e) => e.stopPropagation()}>
    //       <ViewIconButton
    //         onClick={() => navigate(`/delivery-boys/view/${row.id}`)}
    //         size={12}
    //         tooltip="View"
    //       />
    //     </div>
    //   ),
    // },
  ];

  const ordersData: OrderRow[] =
    deliveryBoy && Array.isArray((deliveryBoy as any).orders)
      ? (deliveryBoy as any).orders.map((order: any) => ({
        id: order.id,
        orderNumber: order.orderNumber || "---",
        user: order.consumer
          ? `${order.consumer.name || "---"} (${order.consumer.phone || "---"})`
          : "---",
        address: order.address
          ? [
            order.address.line1,
            order.address.line2,
            order.address.city,
            order.address.state,
            order.address.pincode,
          ]
            .filter(Boolean)
            .join(", ")
          : "---",
        payment: order.payment?.method || "---",
        status: order.delivery?.status || "---",
        date: order.createdAt ? formatDate(order.createdAt) : "---",
      }))
      : [];

  const transactionColumns = [
    {
      key: "id",
      label: "ID",
      sortable: true,
      render: (row: any) => <div className="text-center">{row.id}</div>,
    },
    {
      key: "vendor",
      label: "Vendor Name",
      sortable: true,
      render: (row: any) => <div className="text-center">{row.vendor}</div>,
    },
    {
      key: "orderId",
      label: "Order ID",
      sortable: true,
      render: (row: any) => <div className="text-center">{row.orderId}</div>,
    },
    {
      key: "orderNumber",
      label: "Order Number",
      sortable: true,
      render: (row: any) => (
        <div className="text-center">{row.orderNumber}</div>
      ),
    },
    {
      key: "product",
      label: "Product Name",
      sortable: true,
      render: (row: any) => <div className="text-center">{row.product}</div>,
    },
    {
      key: "qty",
      label: "Qty",
      sortable: true,
      render: (row: any) => <div className="text-center">{row.qty}</div>,
    },
    {
      key: "type",
      label: "Type",
      sortable: true,
      render: (row: any) => <div className="text-center">{row.type}</div>,
    },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      render: (row: any) => <div className="text-center">{row.amount}</div>,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (row: any) => <div className="text-center">{row.status}</div>,
    },
    {
      key: "method",
      label: "Method",
      sortable: true,
      render: (row: any) => <div className="text-center">{row.method}</div>,
    },
    {
      key: "message",
      label: "Message",
      sortable: true,
      render: (row: any) => <div className="text-center">{row.message}</div>,
    },
    {
      key: "created",
      label: "Created On",
      sortable: true,
      render: (row: any) => <div className="text-center">{row.created}</div>,
    },
  ];

  // Helper to get vendor name if available
  const getVendorName = (row: any) => {
    // If you have vendor info in transaction, return it, else N/A
    return row?.warehouse?.name || "N/A";
  };

  // Helper to get product names as comma separated
  const getProductNames = (order: any) => {
    if (order?.items && Array.isArray(order.items)) {
      return order.items.map((item: any) => item.productName).join(", ");
    }
    if (order?.products && Array.isArray(order.products)) {
      return order.products.map((item: any) => item.productName).join(", ");
    }
    return "---";
  };

  // Prepare transaction data from API
  const transactionData =
    deliveryBoy &&
      deliveryBoy.transactions &&
      Array.isArray(deliveryBoy.transactions.deliveryAssignments)
      ? deliveryBoy.transactions.deliveryAssignments.map((txn: any) => ({
        id: txn.id || "---",
        vendor: getVendorName(txn),
        orderId: txn.order?.id || "---",
        orderNumber: txn.order?.orderNumber || "---",
        product: getProductNames(txn.order),
        qty:
          txn.uniqueProductCount ??
          (txn.order?.items?.length || txn.order?.products?.length || "---"),
        type: txn.order?.deliveryType || "---",
        amount:
          txn.order?.totalAmount !== undefined
            ? txn.order.totalAmount
            : "---",
        status: txn.paymentStatus || txn.order?.payment?.status || "---",
        method: txn.paymentMethod || txn.order?.payment?.method || "---",
        message: txn.paymentMessage || "---",
        created: txn.createdAt ? formatDate(txn.createdAt) : "---",
      }))
      : [];

  const educationColumns = [
    {
      key: "qualification",
      label: "Education Qualification",
      sortable: true,
      render: (row: AgentEducation) => (
        <div className="text-center">{valueOrDash(row.qualification)}</div>
      ),
    },
    {
      key: "institution",
      label: "Institution / University",
      sortable: true,
      render: (row: AgentEducation) => (
        <div className="text-center">{valueOrDash(row.institution)}</div>
      ),
    },
    {
      key: "yearOfPassing",
      label: "Year of Passing",
      sortable: true,
      render: (row: AgentEducation) => (
        <div className="text-center">
          {valueOrDash(row.yearOfPassing?.toString())}
        </div>
      ),
    },
    {
      key: "cgpa",
      label: "CGPA",
      sortable: true,
      render: (row: AgentEducation) => (
        <div className="text-center">{valueOrDash(row.cgpa)}</div>
      ),
    },
  ];

  const experienceColumns = [
    {
      key: "organization",
      label: "Organization",
      sortable: true,
      render: (row: AgentExperience) => (
        <div className="text-center">{valueOrDash(row.organization)}</div>
      ),
    },
    {
      key: "designation",
      label: "Designation",
      sortable: true,
      render: (row: AgentExperience) => (
        <div className="text-center">{valueOrDash(row.designation)}</div>
      ),
    },
    {
      key: "fromDate",
      label: "From",
      sortable: true,
      render: (row: AgentExperience) => (
        <div className="text-center">
          {valueOrDash(row.fromDate ? formatDate(row.fromDate) : undefined)}
        </div>
      ),
    },
    {
      key: "toDate",
      label: "To",
      sortable: true,
      render: (row: AgentExperience) => (
        <div className="text-center">
          {valueOrDash(row.toDate ? formatDate(row.toDate) : undefined)}
        </div>
      ),
    },
    {
      key: "responsibilities",
      label: "Roles & Responsibilities",
      sortable: true,
      render: (row: AgentExperience) => (
        <div className="text-center">{valueOrDash(row.responsibilities)}</div>
      ),
    },
  ];

  const handleStatusUpdate = () => {
    if (!selectedStatus) return;

    console.log("Updating delivery agent status to:", selectedStatus);

    setCurrentStatus(selectedStatus);
    setStatusUpdateOpen(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Submitted":
        return "text-blue-600";
      case "Document Verification":
        return "text-orange-600";
      case "Approved":
        return "text-green-600";
      case "Rejected":
        return "text-red-600";
      case "On Hold":
        return "text-yellow-600";
      default:
        return "text-gray-600";
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setStatusUpdateOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm text-gray-500">
        Loading details...
      </div>
    );
  }

  if (!deliveryBoy) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 mb-4">User not found</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="w-full px-2 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mt-4 mb-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          View Delivery Agent
        </h1>
        <BackButton />
      </div>

      <Breadcrumbs />

      {/* ================= PROFILE CARD ================= */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-6">
        <div className="flex gap-6">
          {/* User Icon */}
          <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <User size={32} className="text-gray-400" />
          </div>

          {/* ================= STRING STYLE PROFILE ================= */}
          <div className="flex-1">
            <div className="space-y-3 text-sm">
              {/* Row 1 */}
              <div className="grid grid-cols-2 gap-x-10">
                <div className="grid grid-cols-[180px_10px_1fr] items-center">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Full Name
                  </span>
                  <span>:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {valueOrDash(deliveryBoy.name)}
                  </span>
                </div>

                <div className="grid grid-cols-[180px_10px_1fr] items-center">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Email ID
                  </span>
                  <span>:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {valueOrDash(deliveryBoy.email)}
                  </span>
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-2 gap-x-10">
                <div className="grid grid-cols-[180px_10px_1fr] items-center">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Surname
                  </span>
                  <span>:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {valueOrDash(deliveryBoy.surname)}
                  </span>
                </div>

                <div className="grid grid-cols-[180px_10px_1fr] items-center">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Phone Number
                  </span>
                  <span>:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {valueOrDash(deliveryBoy.phone)}
                  </span>
                </div>
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-2 gap-x-10">
                <div className="grid grid-cols-[180px_10px_1fr] items-center">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Father / Spouse Name
                  </span>
                  <span>:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {valueOrDash(deliveryBoy.fatherOrSpouseName)}
                  </span>
                </div>

                <div className="grid grid-cols-[180px_10px_1fr] items-center">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Alternate Phone
                  </span>
                  <span>:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {valueOrDash(deliveryBoy.alternatePhone)}
                  </span>
                </div>
              </div>

              {/* Row 4 */}
              <div className="grid grid-cols-2 gap-x-10">
                <div className="grid grid-cols-[180px_10px_1fr] items-center">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Gender
                  </span>
                  <span>:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {valueOrDash(deliveryBoy.gender)}
                  </span>
                </div>

                <div className="grid grid-cols-[180px_10px_1fr] items-center">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Nationality
                  </span>
                  <span>:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {valueOrDash(deliveryBoy.nationality)}
                  </span>
                </div>
              </div>

              {/* Row 5 */}
              <div className="grid grid-cols-2 gap-x-10">
                <div className="grid grid-cols-[180px_10px_1fr] items-center">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Date of Birth
                  </span>
                  <span>:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {deliveryBoy.dob ? deliveryBoy.dob : "---"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-6">
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto tabs-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab
                ? "text-gray-900 dark:text-gray-100 border-b-2 border-orange-500 dark:border-orange-400"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "Orders" && (
        <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <DataTable
                data={ordersData}
                columns={orderColumns}
                keyExtractor={(row) => row.id}
                emptyMessage="No Orders Found"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === "Transactions" && (
        <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <DataTable
                data={transactionData}
                columns={transactionColumns}
                keyExtractor={(row) => row.id}
                emptyMessage="No Transactions Found"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === "Education Details" && (
        <Section title="Education Details">
          <div className="overflow-x-auto">
            <DataTable
              data={deliveryBoy.agentEducations || []}
              columns={educationColumns}
              loading={false}
              keyExtractor={(row, index) => row.id || `edu-${index}`}
              emptyMessage="No Education Details Data"
            />
          </div>
        </Section>
      )}

      {activeTab === "Experience Details" && (
        <Section title="Experience Details">
          <div className="overflow-x-auto">
            <DataTable
              data={deliveryBoy.agentExperiences || []}
              columns={experienceColumns}
              loading={false}
              keyExtractor={(row, index) => row.id || `exp-${index}`}
              emptyMessage="No Experience Details Data"
            />
          </div>
        </Section>
      )}

      {activeTab === "Documents Upload" && (
        <Section title="Documents">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-sm">
            {deliveryBoy.deliveryAgentDocuments &&
              deliveryBoy.deliveryAgentDocuments.length > 0 ? (
              deliveryBoy.deliveryAgentDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 
                       bg-white dark:bg-gray-800 
                       p-3 transition-shadow hover:shadow-md"
                >
                  <div
                    className="h-24 mb-2 rounded-md 
                         bg-gray-100 dark:bg-gray-700 
                         border border-dashed border-gray-300 dark:border-gray-600 
                         flex items-center justify-center 
                         text-xs font-medium text-gray-400 dark:text-gray-300"
                  >
                    {doc.fileUrl ? (
                      <img
                        src={doc.fileUrl}
                        alt={doc.documentType}
                        className="h-full object-contain rounded-md"
                      />
                    ) : (
                      "No Image"
                    )}
                  </div>
                  <p className="font-medium text-gray-700 dark:text-gray-200">
                    {doc.documentType
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </p>
                </div>
              ))
            ) : (
              <div className="col-span-4 text-gray-400">
                No Documents Uploaded
              </div>
            )}
          </div>
        </Section>
      )}

      {activeTab === "Bank and Settlement Data" && (
        <Section title="Bank Details">
          {deliveryBoy.agentBank ? (
            <>
              <div className="space-y-3 text-sm">
                {/* Row 1 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10">
                  <div className="grid grid-cols-[180px_10px_1fr] items-center">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Account Holder Name
                    </span>
                    <span>:</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {valueOrDash(deliveryBoy.agentBank.accountHolderName)}
                    </span>
                  </div>
                  <div className="grid grid-cols-[180px_10px_1fr] items-center">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Bank Account Number
                    </span>
                    <span>:</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {valueOrDash(deliveryBoy.agentBank.accountNumber)}
                    </span>
                  </div>
                </div>
                {/* Row 2 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10">
                  <div className="grid grid-cols-[180px_10px_1fr] items-center">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Bank Name
                    </span>
                    <span>:</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {valueOrDash(deliveryBoy.agentBank.bankName)}
                    </span>
                  </div>
                  <div className="grid grid-cols-[180px_10px_1fr] items-center">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      IFSC Code
                    </span>
                    <span>:</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {valueOrDash(deliveryBoy.agentBank.ifscCode)}
                    </span>
                  </div>
                </div>
                {/* Row 3 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10">
                  <div className="grid grid-cols-[180px_10px_1fr] items-center">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Branch Name
                    </span>
                    <span>:</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {valueOrDash(deliveryBoy.agentBank.branchName)}
                    </span>
                  </div>
                  <div className="grid grid-cols-[180px_10px_1fr] items-center">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      UPI ID
                    </span>
                    <span>:</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {valueOrDash(deliveryBoy.agentBank.upiId)}
                    </span>
                  </div>
                </div>
              </div>
              {/* Cancelled Cheque */}
              <div className="mt-6">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Cancelled Cheque
                </p>
                <div
                  className="h-36 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 
                          bg-gray-100 dark:bg-gray-700 
                          flex items-center justify-center 
                          text-gray-400 dark:text-gray-300"
                >
                  {deliveryBoy.agentBank.passbookFile ? (
                    <img
                      src={deliveryBoy.agentBank.passbookFile}
                      alt="Cancelled Cheque"
                      className="h-full object-contain rounded-md"
                    />
                  ) : (
                    "No Image"
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-gray-400">No Bank Details Available</div>
          )}
        </Section>
      )}

      {/* ================= CURRENT STATUS ================= */}
      <div className="mt-8 flex justify-center">
        <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Left: Current Status */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                Current Status :
              </span>
              <span
                className={`text-sm font-bold ${getStatusColor(currentStatus)}`}
              >
                {currentStatus}
              </span>
            </div>

            {/* Right: Update Button */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setStatusUpdateOpen(!statusUpdateOpen)}
                className="flex items-center gap-2 px-5 py-2 bg-green-50 dark:bg-green-900/20 border border-green-600 dark:border-green-500 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-sm font-medium"
              >
                Update Status
                <ChevronDown
                  size={14}
                  className={`transition-transform ${statusUpdateOpen ? "rotate-180" : ""
                    }`}
                />
              </button>

              {statusUpdateOpen && (
                <div className="absolute right-0 mt-2 w-[220px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                  <div className="p-4">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select Status
                    </label>

                    <SelectInput
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      options={[
                        { value: "Submitted", label: "Submitted" },
                        {
                          value: "Document Verification",
                          label: "Document Verification",
                        },
                        { value: "Approved", label: "Approved" },
                        { value: "Rejected", label: "Rejected" },
                        { value: "On Hold", label: "On Hold" },
                      ]}
                      className="w-full text-xs mb-4"
                    />

                    <div className="flex gap-2">
                      <Button
                        onClick={handleStatusUpdate}
                        variant="primary"
                        size="sm"
                        className="flex-1"
                      >
                        Update
                      </Button>
                      <Button
                        onClick={() => setStatusUpdateOpen(false)}
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Detail = ({ label, value }: { label: string; value?: string }) => (
  <div>
    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
      {label}
    </p>
    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
      {value || "---"}
    </p>
  </div>
);

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
    <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">
      {title}
    </h2>
    {children}
  </div>
);

export default ViewDeliveryAgent;
