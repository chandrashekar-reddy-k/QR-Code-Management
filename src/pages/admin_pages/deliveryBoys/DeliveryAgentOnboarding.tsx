import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  GraduationCap,
  MapPin,
  Trash2,
  Upload,
  User,
} from "lucide-react";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";
import {
  PrimaryButton,
  Button,
  TextInput,
  SelectInput,
  FormSectionWithDots,
} from "../../../components/ui";
import { toast } from "react-toastify";
import {
  useDeliveryAgentOnboarding,
  useDeliveryAgentUpdateStep,
} from "../../../hooks/deliveryAgentOnboarding";
import { useGetDeliveryBoyDetailsById } from "../../../hooks/deliveryBoy";
import { uploadImageFile } from "../../../lib/uploadImage";
import {
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
} from "../../../validationSchema/deliveryAgentValidation";

const STORAGE_KEY = "deliveryAgentOnboarding_userId";

const GENDER_OPTIONS = [
  { value: "", label: "Select Gender" },
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
];

const MARITAL_OPTIONS = [
  { value: "", label: "Select Marital Status" },
  { value: "SINGLE", label: "Single" },
  { value: "MARRIED", label: "Married" },
  { value: "DIVORCED", label: "Divorced" },
  { value: "WIDOWED", label: "Widowed" },
];

const STATE_OPTIONS = [
  { value: "Telangana", label: "Telangana" },
  { value: "Andhra Pradesh", label: "Andhra Pradesh" },
  { value: "Karnataka", label: "Karnataka" },
];

const CITY_OPTIONS = [
  { value: "Hyderabad", label: "Hyderabad" },
  { value: "Vijayawada", label: "Vijayawada" },
  { value: "Bangalore", label: "Bangalore" },
];

const currentYear = new Date().getFullYear();

// Create year options
const YEAR_OF_PASSING_OPTIONS = [
  { value: "", label: "Select Year" }, // default option
  ...Array.from({ length: 50 }, (_, i) => {
    const y = String(currentYear - i);
    return { value: y, label: y };
  }),
];

const STEP3_CARD =
  "rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md p-4 sm:p-6";

/** Same field layout as Add Delivery Agent (deliveryBoys) — composed into API line1 + city/state/pincode */
type DetailedAddressForm = {
  doorNo: string;
  roadNo: string;
  colony: string;
  mandal: string;
  state: string;
  city: string;
  pincode: string;
};

function emptyDetailedAddress(): DetailedAddressForm {
  return {
    doorNo: "",
    roadNo: "",
    colony: "",
    mandal: "",
    state: "",
    city: "",
    pincode: "",
  };
}

function detailedAddressToApi(a: DetailedAddressForm): {
  line1: string;
  city: string;
  state: string;
  pincode: string;
} {
  const parts = [a.doorNo, a.roadNo, a.colony, a.mandal]
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    line1: parts.join(", "),
    city: a.city.trim(),
    state: a.state.trim(),
    pincode: a.pincode.trim(),
  };
}

function isDetailedAddressComplete(a: DetailedAddressForm): boolean {
  return (
    !!a.doorNo.trim() &&
    !!a.roadNo.trim() &&
    !!a.colony.trim() &&
    !!a.mandal.trim() &&
    !!a.state.trim() &&
    !!a.city.trim() &&
    !!a.pincode.trim()
  );
}

/** Approved Step 3 design — education row */
type EducationRow = {
  qualification: string;
  institution: string;
  yearOfPassing: string;
  marksOrCgpa: string;
};
/** Approved Step 3 design — experience row (shown when “Do you have work experience?” = Yes) */
type ExperienceRow = {
  organization: string;
  designation: string;
  fromDate: string;
  toDate: string;
  responsibilities: string;
};

function emptyEducationRow(): EducationRow {
  return {
    qualification: "",
    institution: "",
    yearOfPassing: "",
    marksOrCgpa: "",
  };
}

function emptyExperienceRow(): ExperienceRow {
  return {
    organization: "",
    designation: "",
    fromDate: "",
    toDate: "",
    responsibilities: "",
  };
}

function acceptPaySlipFile(f: File): boolean {
  return (
    /^image\//i.test(f.type) ||
    /^application\/pdf$/i.test(f.type) ||
    /\.(png|jpe?g|pdf|webp|heic|heif|jfif|bmp|gif|tiff?)$/i.test(f.name)
  );
}
/** Step 4 — fixed document slots (approved design); URLs filled via upload API on select/drop */
type Step4DocumentSlot = {
  id: string;
  documentType: string;
  label: string;
  fileUrl: string | null;
  fileName: string | null;
  uploading: boolean;
};

const STEP4_SLOT_DEFS: Pick<
  Step4DocumentSlot,
  "id" | "documentType" | "label"
>[] = [
    { id: "aadhar", documentType: "AADHAR_CARD", label: "Aadhaar Card" },
    { id: "pan", documentType: "PAN_CARD", label: "Pan Card" },
    { id: "driving", documentType: "DRIVING_LICENSE", label: "Driving License" },
    {
      id: "passportPhoto",
      documentType: "PASSPORT_PHOTO",
      label: "Upload Passport size Photo",
    },
  ];

const STEP4_DOCUMENT_TYPE_FALLBACKS: Record<string, string[]> = {
  AADHAR_CARD: ["AADHAAR_CARD", "AADHAAR"],
  PHOTO: ["PASSPORT_PHOTO", "PASSPORT_SIZE_PHOTO"],
};

function initialStep4Slots(): Step4DocumentSlot[] {
  return STEP4_SLOT_DEFS.map((d) => ({
    ...d,
    fileUrl: null,
    fileName: null,
    uploading: false,
  }));
}

type AgentAddress = {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  doorNo?: string;
  roadNo?: string;
  colony?: string;
  mandal?: string;
  village?: string;
  locality?: string;
  area?: string;
  district?: string;
};

type AgentEducation = {
  qualification?: string;
  institution?: string;
  yearOfPassing?: number | string;
  cgpaPercentageMarks?: string;
  marksOrCgpa?: string;
  percentage?: string;
  marks?: string;
};

type AgentExperience = {
  organization?: string;
  designation?: string;
  fromDate?: string;
  toDate?: string;
  rolesAndResponsibilities?: string;
  responsibilities?: string;
};

type AgentDocument = {
  documentType?: string;
  fileUrl?: string;
  url?: string;
  type?: string;
};

type AgentBank = {
  accountHolderName?: string;
  accountName?: string;
  bankName?: string;
  branchName?: string;
  branch?: string;
  accountNumber?: string;
  ifscCode?: string;
  ifsc?: string;
  upiId?: string;
  cancelledChequeUrl?: string;
  bankPassbookOrChequeUrl?: string;
};

type AgentDetails = {
  id?: string;
  name?: string;
  surname?: string;
  fatherOrSpouseName?: string;
  phone?: string;
  alternatePhone?: string;
  email?: string;
  dob?: string;
  gender?: string;
  maritalStatus?: string;
  nationality?: string;
  addresses?: AgentAddress[];
  permanentAddress?: AgentAddress;
  communicationAddress?: AgentAddress;
  agentEducations?: AgentEducation[];
  education?: AgentEducation[];
  educations?: AgentEducation[];
  educationDetails?: AgentEducation[];
  agentExperiences?: AgentExperience[];
  experience?: AgentExperience[];
  experiences?: AgentExperience[];
  experienceDetails?: AgentExperience[];
  deliveryAgentDocuments?: AgentDocument[];
  documents?: Array<AgentDocument | string>;
  agentBank?: AgentBank | null;
  bankInfo?: AgentBank | null;
  paySlipUrls?: string[];
  lastSixMonthsPaySlipUrls?: string[];
};

function addressToDetailed(addr?: AgentAddress): DetailedAddressForm {
  const line = [addr?.line1, addr?.line2].filter(Boolean).join(", ");
  const parts = String(line)
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return {
    doorNo: String(addr?.doorNo || parts[0] || ""),
    roadNo: String(addr?.roadNo || parts[1] || parts[0] || ""),
    colony: String(
      addr?.colony ||
      addr?.village ||
      addr?.locality ||
      addr?.area ||
      parts[2] ||
      "",
    ),
    mandal: String(addr?.mandal || addr?.district || parts[3] || ""),
    city: String(addr?.city || ""),
    state: String(addr?.state || ""),
    pincode: String(addr?.pincode || ""),
  };
}

function fileNameFromUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const last = url.split("/").pop() || "";
    return decodeURIComponent(last) || url;
  } catch {
    return url;
  }
}

function toDateInputValue(value?: string | null): string {
  const v = String(value || "").trim();
  if (!v) return "";
  // If already yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  // If dd-mm-yyyy, convert to yyyy-mm-dd
  if (/^\d{2}-\d{2}-\d{4}$/.test(v)) {
    const [day, month, year] = v.split("-");
    return `${year}-${month}-${day}`;
  }
  const fromIso = v.split("T")[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(fromIso)) return fromIso;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function FilePreview({ url, label }: { url: string; label: string }) {
  const [isError, setIsError] = useState(false);
  return (
    <div className="mt-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2">
      {!isError ? (
        <img
          src={url}
          alt={label}
          className="h-28 sm:h-32 w-auto max-w-full rounded object-contain mx-auto"
          onError={() => setIsError(true)}
        />
      ) : (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline break-all"
        >
          View uploaded file
        </a>
      )}
    </div>
  );
}

function withCurrentOption(
  base: { value: string; label: string }[],
  value: string,
): { value: string; label: string }[] {
  const current = value.trim();
  if (!current) return base;
  const exists = base.some((o) => o.value === current);
  return exists ? base : [{ value: current, label: current }, ...base];
}

const DeliveryAgentOnboarding = () => {
  const [errors, setErrors] = useState<any>({});
  const navigate = useNavigate();
  const { id: routeAgentId } = useParams<{ id: string }>();
  const isEditMode = useMemo(() => !!routeAgentId?.trim(), [routeAgentId]);
  const { mutateAsync: createMutateAsync, isPending: isCreating } =
    useDeliveryAgentOnboarding();
  const [userId, setUserId] = useState<string>("");

  const effectiveId = useMemo(
    () => (isEditMode ? routeAgentId : userId),
    [isEditMode, routeAgentId, userId]
  );

  const { mutateAsync: updateMutateAsync, isPending: isUpdating } =
    useDeliveryAgentUpdateStep(effectiveId || "");

  const isPending = isEditMode ? isUpdating : isCreating;
  const { data: editData, isLoading: isEditLoading } =
    useGetDeliveryBoyDetailsById(routeAgentId || "");
  const hasPrefilledRef = useRef(false);

  useEffect(() => {
    if (!isEditMode) {
      sessionStorage.removeItem(STORAGE_KEY);
      setUserId("");
    }
  }, [isEditMode]);

  const [step, setStep] = useState(1);
  const totalSteps = 5;

  const isStepCompleted = (stepNum: number) => stepNum < step;
  const goToStep = (stepNum: number) => {
    if (stepNum <= step) setStep(stepNum);
  };

  const persistUserId = (id: string) => {
    setUserId(id);
    sessionStorage.setItem(STORAGE_KEY, id);
  };

  // Step 1
  const [s1, setS1] = useState({
    fullName: "",
    surname: "",
    fatherOrSpouseName: "",
    phone: "",
    alternatePhone: "",
    email: "",
    dob: "",
    gender: "",
    maritalStatus: "",
    nationality: "",
  });

  // Step 2 — same structure as deliveryBoys/AddDeliveryAgent
  const [permanentAddress, setPermanentAddress] =
    useState<DetailedAddressForm>(emptyDetailedAddress);
  const [sameAsPermanent, setSameAsPermanent] = useState(false);
  const [communicationAddress, setCommunicationAddress] =
    useState<DetailedAddressForm>(emptyDetailedAddress);

  useEffect(() => {
    if (sameAsPermanent) {
      setCommunicationAddress({ ...permanentAddress });
    }
  }, [sameAsPermanent, permanentAddress]);

  // Step 3 — approved UI: education grid, experience Yes/No, pay slips upload
  const [education, setEducation] = useState<EducationRow[]>([
    emptyEducationRow(),
  ]);
  const [hasExperience, setHasExperience] = useState<"yes" | "no">("no");
  const [experience, setExperience] = useState<ExperienceRow[]>([
    emptyExperienceRow(),
  ]);
  const [paySlipFiles, setPaySlipFiles] = useState<File[]>([]);
  const [existingPaySlipUrls, setExistingPaySlipUrls] = useState<string[]>([]);
  const [isDraggingPaySlips, setIsDraggingPaySlips] = useState(false);

  // Step 4 — fixed uploads; each file uploaded immediately via uploadImageFile
  const [step4Docs, setStep4Docs] =
    useState<Step4DocumentSlot[]>(initialStep4Slots);
  const [draggingStep4Id, setDraggingStep4Id] = useState<string | null>(null);

  // Step 5 — approved: 3-col bank grid, cheque upload, declarations
  const [bank, setBank] = useState({
    accountHolderName: "",
    bankName: "",
    branchName: "",
    accountNumber: "",
    ifscCode: "",
    upiId: "",
  });
  const [cancelledChequeFile, setCancelledChequeFile] = useState<File | null>(
    null,
  );
  const [existingCancelledChequeUrl, setExistingCancelledChequeUrl] =
    useState<string>("");
  const [selectedChequePreviewUrl, setSelectedChequePreviewUrl] =
    useState<string>("");
  const [isDraggingCheque, setIsDraggingCheque] = useState(false);
  const [declaration1, setDeclaration1] = useState(false);
  const [declaration2, setDeclaration2] = useState(false);

  const stateOptions = useMemo(() => {
    let opts = STATE_OPTIONS;
    opts = withCurrentOption(opts, permanentAddress.state);
    opts = withCurrentOption(opts, communicationAddress.state);
    return opts;
  }, [permanentAddress.state, communicationAddress.state]);

  const cityOptions = useMemo(() => {
    let opts = CITY_OPTIONS;
    opts = withCurrentOption(opts, permanentAddress.city);
    opts = withCurrentOption(opts, communicationAddress.city);
    return opts;
  }, [permanentAddress.city, communicationAddress.city]);

  const mutateStep = useCallback(
    async (payload: Record<string, unknown>) => {
      // If edit mode OR user already created (has userId), use UPDATE
      if (isEditMode || (userId && step > 1)) {
        return await updateMutateAsync(payload);
      }

      // Otherwise create
      return await createMutateAsync(payload);
    },
    [isEditMode, userId, updateMutateAsync, createMutateAsync],
  );


  useEffect(() => {
    if (!userId) {
      const storedId = sessionStorage.getItem(STORAGE_KEY);
      if (storedId) {
        setUserId(storedId);
      }
    }
  }, [userId]);

  useEffect(() => {
    if (
      !cancelledChequeFile ||
      !cancelledChequeFile.type.startsWith("image/")
    ) {
      setSelectedChequePreviewUrl("");
      return;
    }
    const objectUrl = URL.createObjectURL(cancelledChequeFile);
    setSelectedChequePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [cancelledChequeFile]);

  const requireUserId = () => {
    if (isEditMode) return true;

    let id = userId;

    if (!id) {
      id = sessionStorage.getItem(STORAGE_KEY) || "";
      if (id) setUserId(id);
    }

    if (!id) {
      alert("Session expired. Please start again from step 1.");
      setStep(1);
      return false;
    }

    return true;
  };

  useEffect(() => {
    if (!isEditMode || hasPrefilledRef.current) return;
    const source =
      ((editData as { data?: AgentDetails } | undefined)?.data as
        | AgentDetails
        | undefined) || (editData as AgentDetails | undefined);
    if (!source) return;

    hasPrefilledRef.current = true;

    const resolvedId = String(source.id || routeAgentId || "");
    if (resolvedId) persistUserId(resolvedId);

    setS1({
      fullName: String(source.name || ""),
      surname: String(source.surname || ""),
      fatherOrSpouseName: String(source.fatherOrSpouseName || ""),
      phone: String(source.phone || ""),
      alternatePhone: String(source.alternatePhone || ""),
      email: String(source.email || ""),
      dob: toDateInputValue(source.dob),
      gender: String(source.gender || "MALE"),
      maritalStatus: String(source.maritalStatus || "SINGLE"),
      nationality: String(source.nationality || "Indian"),
    });

    const addresses = source.addresses || [];
    const byLabel = (labels: string[]) =>
      addresses.find((a) =>
        labels.includes(
          String((a as { label?: string }).label || "").toUpperCase(),
        ),
      );
    const permanentApi =
      source.permanentAddress ||
      byLabel(["PERMANENT", "PERMANENT_ADDRESS", "HOME", "PRIMARY"]) ||
      addresses[0];
    const communicationApi =
      source.communicationAddress ||
      byLabel(["COMMUNICATION", "COMMUNICATION_ADDRESS", "CURRENT"]) ||
      addresses[1] ||
      permanentApi;
    const permanent = addressToDetailed(permanentApi);
    const communication = addressToDetailed(communicationApi);
    setPermanentAddress(permanent);
    setCommunicationAddress(communication);
    const equalComm =
      JSON.stringify(detailedAddressToApi(permanent)) ===
      JSON.stringify(detailedAddressToApi(communication));
    setSameAsPermanent(equalComm);

    const educationList =
      source.agentEducations ||
      source.education ||
      source.educations ||
      source.educationDetails ||
      [];
    const eduRows = educationList
      .map((e) => ({
        qualification: String(e.qualification || ""),
        institution: String(e.institution || ""),
        yearOfPassing: String(e.yearOfPassing || ""),
        marksOrCgpa: String(
          e.cgpa ||
          e.cgpaPercentageMarks ||
          e.marksOrCgpa ||
          e.percentage ||
          e.marks ||
          "",
        ),
      }))
      .filter(
        (e) =>
          e.qualification || e.institution || e.yearOfPassing || e.marksOrCgpa,
      );
    setEducation(eduRows.length ? eduRows : [emptyEducationRow()]);

    const experienceList =
      source.agentExperiences ||
      source.experience ||
      source.experiences ||
      source.experienceDetails ||
      [];
    const expRows = experienceList
      .map((e) => ({
        organization: String(e.organization || ""),
        designation: String(e.designation || ""),
        fromDate: e.fromDate ? String(e.fromDate).slice(0, 4) : "",
        toDate: e.toDate ? String(e.toDate).slice(0, 4) : "",
        responsibilities: String(
          e.rolesAndResponsibilities || e.responsibilities || "",
        ),
        payslips: Array.isArray(e.payslips) ? e.payslips : [],
      }))
      .filter(
        (e) =>
          e.organization ||
          e.designation ||
          e.fromDate ||
          e.toDate ||
          e.responsibilities,
      );
    setExperience(expRows.length ? expRows : [emptyExperienceRow()]);
    setHasExperience(expRows.length ? "yes" : "no");
    // Show payslips from first experience if present, else fallback to old logic
    if (expRows.length && expRows[0].payslips && expRows[0].payslips.length) {
      setExistingPaySlipUrls(expRows[0].payslips.filter((u) => !!u?.trim()));
    } else {
      setExistingPaySlipUrls(
        (source.lastSixMonthsPaySlipUrls || source.paySlipUrls || []).filter(
          (u) => !!u?.trim(),
        ),
      );
    }
    setPaySlipFiles([]);

    const rawDocs = source.deliveryAgentDocuments || source.documents || [];
    const docs: AgentDocument[] = rawDocs
      .map((d) => {
        if (typeof d === "string") return { fileUrl: d };
        return d as AgentDocument;
      })
      .filter((d) => !!(d.fileUrl || d.url));
    setStep4Docs(
      initialStep4Slots().map((slot) => {
        const match = docs.find(
          (d) =>
            String(d.documentType || d.type || "").toUpperCase() ===
            slot.documentType,
        );
        const fallback =
          slot.documentType === "AADHAR_CARD"
            ? docs[0]
            : slot.documentType === "PAN_CARD"
              ? docs[1]
              : slot.documentType === "DRIVING_LICENSE"
                ? docs[2]
                : docs[3];
        const url = String(
          match?.fileUrl ||
          match?.url ||
          fallback?.fileUrl ||
          fallback?.url ||
          "",
        );
        return {
          ...slot,
          fileUrl: url || null,
          fileName: fileNameFromUrl(url),
          uploading: false,
        };
      }),
    );

    const bankFromApi = source.agentBank || source.bankInfo || null;
    if (bankFromApi) {
      // Use index signature to access unknown fields
      const b: any = bankFromApi;
      setBank({
        accountHolderName: String(b.accountHolderName || b.accountName || ""),
        bankName: String(b.bankName || ""),
        branchName: String(b.branchName || b.branch || ""),
        accountNumber: String(b.accountNumber || ""),
        ifscCode: String(b.ifscCode || b.ifsc || ""),
        upiId: String(b.upiId || ""),
      });
      const chequeUrl = String(
        b.cancelledChequeUrl ||
        b.bankPassbookOrChequeUrl ||
        b.passbookFile ||
        "",
      );
      setExistingCancelledChequeUrl(chequeUrl);
      setDeclaration1(!!b.declarationAccepted);
      setDeclaration2(!!b.kycAuthorization);
    }
  }, [editData, isEditMode, routeAgentId]);

 const submitStep1 = useCallback(async () => {
  const payload: Record<string, unknown> = {
    step: 1,
    fullName: s1.fullName.trim(),
    surname: s1.surname.trim(),
    fatherOrSpouseName: s1.fatherOrSpouseName.trim(),
    phone: s1.phone.trim(),
    email: s1.email.trim(),
    dob: s1.dob,
    gender: s1.gender,
    maritalStatus: s1.maritalStatus,
    nationality: s1.nationality.trim() || "Indian",
  };

  const alt = s1.alternatePhone.trim();
  if (alt) payload.alternatePhone = alt;

  let res;

  //  FIX: check userId also
  if (isEditMode || userId) {
    res = await updateMutateAsync(payload);   //  UPDATE
  } else {
    res = await createMutateAsync(payload);   //  CREATE (first time only)

    const uid = res?.userId;
    if (uid) persistUserId(uid);
  }

  const next = res?.nextStep ?? 2;
  setStep(next);
}, [s1, isEditMode, userId, createMutateAsync, updateMutateAsync]);

  const submitStep2 = useCallback(async () => {
    if (!requireUserId()) return;
    if (!isDetailedAddressComplete(permanentAddress)) {
      alert(
        "Please fill all permanent address fields (door, road, colony, mandal, state, city, pincode).",
      );
      return;
    }
    const comm = sameAsPermanent ? permanentAddress : communicationAddress;
    if (!sameAsPermanent && !isDetailedAddressComplete(comm)) {
      alert(
        "Please fill all communication address fields, or check “Same as above”.",
      );
      return;
    }
    const payload: Record<string, unknown> = {
      step: 2,
      permanentAddress: detailedAddressToApi(permanentAddress),
      sameAsPermanent,
      communicationAddress: detailedAddressToApi(comm),
    };
    if (!isEditMode) payload.userId = userId;
    const res = await mutateStep(payload);
    setStep(res?.nextStep ?? 3);
  }, [
    mutateStep,
    userId,
    permanentAddress,
    communicationAddress,
    sameAsPermanent,
    isEditMode,
  ]);

  const appendPaySlipFiles = useCallback((files: FileList | File[]) => {
    const list = Array.from(files).filter(acceptPaySlipFile);

    if (list.length === 0) return;

    const hasPDF = list.some((f) => f.type === "application/pdf");
    const hasImage = list.some((f) => f.type.startsWith("image/"));

    setPaySlipFiles((prev) => {
      const prevHasPDF = prev.some((f) => f.type === "application/pdf");
      const prevHasImage = prev.some((f) => f.type.startsWith("image/"));

          //  LIMIT CHECK (THIS IS WHAT YOU ADD)
    const totalCount =
      prev.length + existingPaySlipUrls.length + list.length;

    if (totalCount > 6) {
      toast.error("Max 6 pay slips allowed");
      return prev;
    }

      //  Prevent mixing
      if (
        (prevHasPDF && hasImage) ||
        (prevHasImage && hasPDF)
      ) {
        toast.error("Cannot mix PDF and images. Upload either 1 PDF or 6 images.");
        return prev;
      }

      const combined = [...prev, ...list];

      //  If PDF → only 1 allowed
      if (combined.some((f) => f.type === "application/pdf")) {
        if (combined.length > 1) {
          toast.error("Only one PDF is allowed.");
          return prev;
        }
      }

      //  If images → max 6
      const imageCount = combined.filter((f) =>
        f.type.startsWith("image/")
      ).length;

      if (imageCount > 6) {
        toast.error("You can upload maximum 6 images.");
        return prev;
      }

      return combined;
    });
  }, [existingPaySlipUrls]);

  const submitStep3 = useCallback(async () => {
    if (!requireUserId()) return;
    // Education
    const edu = education
      .filter(
        (e) =>
          e.qualification.trim() &&
          e.institution.trim() &&
          e.yearOfPassing.trim(),
      )
      .map((e) => ({
        qualification: e.qualification.trim(),
        institution: e.institution.trim(),
        yearOfPassing: parseInt(e.yearOfPassing, 10) || currentYear,
        cgpa: e.marksOrCgpa.trim() || "",
      }));
    // if (edu.length === 0) {
    //   alert(
    //     "Please add at least one qualification with Education Qualification, Institution/University, and Year of Passing.",
    //   );
    //   return;
    // }

    // Experience
    let exp: Record<string, unknown>[] = [];
    if (hasExperience === "yes") {
      const expRows = experience.filter(
        (e) => e.organization.trim() && e.designation.trim(),
      );
      for (const e of expRows) {
        // toDate can be empty string, so only check fromDate
        if (!e.fromDate.trim()) {
          alert("Each experience entry needs From date.");
          return;
        }
      }
      exp = expRows.map((e) => ({
        organization: e.organization.trim(),
        designation: e.designation.trim(),
        fromDate: e.fromDate.trim(),
        toDate: e.toDate.trim(),
        responsibilities: e.responsibilities.trim() || "",
        payslips: [], // will fill below
      }));
      if (exp.length === 0) {
        alert(
          "Please add at least one work experience, or select “No” for work experience.",
        );
        return;
      }
    }

    // Pay slips: assign to first experience if present
    let paySlipUrls: string[] = [];
    let paySlipsForValidation: any[] = [];

    if (hasExperience === "yes") {
      if (paySlipFiles.length > 0) {
        paySlipsForValidation = paySlipFiles;
      } else if (existingPaySlipUrls.length > 0) {
        paySlipsForValidation = existingPaySlipUrls;
      } else {
        setErrors((prev) => ({
          ...prev,
          paySlips: "Upload pay slips (images or PDF)",
        }));
        alert("Upload pay slips (images or PDF)");
        return;
      }
    }

    // Upload files if needed
    if (paySlipFiles.length > 0) {
      try {
        for (const f of paySlipFiles) {
          paySlipUrls.push(await uploadImageFile(f));
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Pay slip upload failed");
        return;
      }
    }
    if (exp.length > 0 && paySlipUrls.length > 0) {
      exp[0].payslips = paySlipUrls;
    } else if (exp.length > 0 && existingPaySlipUrls.length > 0) {
      exp[0].payslips = existingPaySlipUrls;
    }

    // Validate using schema with exactly 6 paySlips
    try {
      await step3Schema.validate(
        {
          education,
          experience,
          hasExperience,
          paySlips: paySlipsForValidation,
        },
        { abortEarly: false }
      );
    } catch (err: any) {
      const newErrors: any = {};
      if (err.inner?.length) {
        err.inner.forEach((e: any) => {
          newErrors[e.path] = e.message;
        });
      } else if (err.path) {
        newErrors[err.path] = err.message;
      }
      setErrors(newErrors);
      if (Object.values(newErrors).length > 0) {
        alert(Object.values(newErrors)[0]);
      }
      return;
    }

    setErrors((prev) => {
      const next = { ...prev };
      delete next.paySlips;
      return next;
    });

    const payload: Record<string, unknown> = {
      step: 3,
      education: edu,
      experience: exp,
    };
    if (!isEditMode) payload.userId = userId;

    const res = await mutateStep(payload);
    setStep(res?.nextStep ?? 4);
  }, [
    mutateStep,
    userId,
    education,
    experience,
    hasExperience,
    paySlipFiles,
    isEditMode,
    existingPaySlipUrls,
    setErrors,
  ]);

  const uploadStep4SlotFile = useCallback(
    async (slotId: string, file: File) => {
      if (!acceptPaySlipFile(file)) {
        toast.error("Only image files or PDF are allowed.");
        return;
      }
      setStep4Docs((prev) =>
        prev.map((s) => (s.id === slotId ? { ...s, uploading: true } : s)),
      );
      try {
        const fileUrl = await uploadImageFile(file);
        setStep4Docs((prev) =>
          prev.map((s) =>
            s.id === slotId
              ? { ...s, uploading: false, fileUrl, fileName: file.name }
              : s,
          ),
        );
      } catch (e) {
        setStep4Docs((prev) =>
          prev.map((s) => (s.id === slotId ? { ...s, uploading: false } : s)),
        );
        toast.error(e instanceof Error ? e.message : "Upload failed");
      }
    },
    [],
  );

  const clearStep4Slot = useCallback((slotId: string) => {
    setStep4Docs((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? { ...s, fileUrl: null, fileName: null, uploading: false }
          : s,
      ),
    );
  }, []);

  const submitStep4 = useCallback(async () => {
    if (!requireUserId()) return;
    const missing = step4Docs.filter((d) => !d.fileUrl?.trim());
    if (missing.length > 0) {
      alert(
        `Please upload all required documents:\n${missing.map((m) => `• ${m.label}`).join("\n")}`,
      );
      return;
    }
    const stillUploading = step4Docs.some((d) => d.uploading);
    if (stillUploading) {
      alert("Please wait for uploads to finish.");
      return;
    }
    // Postman expects: documents: [{ documentType, fileUrl }]
    const documents = step4Docs.map((d) => ({
      documentType:
        d.documentType === "PHOTO" ? "PASSPORT_PHOTO" : d.documentType,
      fileUrl: d.fileUrl as string,
    }));
    const payload: Record<string, unknown> = {
      step: 4,
      documents,
    };
    if (!isEditMode) {
      payload.userId = userId;
    }
    const res = await mutateStep(payload);
    setStep(res?.nextStep ?? 5);
  }, [mutateStep, userId, step4Docs, isEditMode]);

  const setChequeFromFiles = useCallback((files: FileList | File[]) => {
    const first = Array.from(files).find(acceptPaySlipFile);
    if (!first && Array.from(files).length > 0) {
      toast.error("Only image files or PDF are allowed.");
      return;
    }
    if (first) setCancelledChequeFile(first);
  }, []);

  const submitStep5 = useCallback(async () => {
    if (!requireUserId()) return;

    if (!cancelledChequeFile && !existingCancelledChequeUrl.trim()) {
      alert("Please upload cancelled cheque or bank passbook front page.");
      return;
    }
    if (!declaration1 || !declaration2) {
      alert("Please confirm both declarations to finish.");
      return;
    }

    let passbookFile = existingCancelledChequeUrl.trim();
    if (cancelledChequeFile) {
      try {
        passbookFile = await uploadImageFile(cancelledChequeFile);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Document upload failed");
        return;
      }
    }

    const payload: Record<string, unknown> = {
      step: 5,
      bankInfo: {
        accountHolderName: bank.accountHolderName.trim(),
        bankName: bank.bankName.trim(),
        branchName: bank.branchName.trim(),
        accountNumber: bank.accountNumber.trim(),
        ifscCode: bank.ifscCode.trim(),
        upiId: bank.upiId.trim() || undefined,
        passbookFile,
        declarationAccepted: !!declaration1,
        kycAuthorization: !!declaration2,
      },
    };
    if (!isEditMode) payload.userId = userId;

    await mutateStep(payload);
    if (!isEditMode) sessionStorage.removeItem(STORAGE_KEY);
    navigate("/delivery-boys/manage");
  }, [
    mutateStep,
    userId,
    bank,
    cancelledChequeFile,
    existingCancelledChequeUrl,
    declaration1,
    declaration2,
    isEditMode,
    navigate,
  ]);

  const validateStepData = async (
    currentStep: number,
    shouldSetErrors = true,
  ) => {
    try {
      if (currentStep === 1) {
        await step1Schema.validate(s1, { abortEarly: false });
      }
      if (currentStep === 2) {
        await step2Schema.validate(
          { permanentAddress, communicationAddress, sameAsPermanent },
          { abortEarly: false },
        );
      }
      if (currentStep === 3) {
        // Use same paySlips logic as submitStep3
        let paySlipsForValidation: any[] = [];

        if (hasExperience === "yes") {
          if (paySlipFiles.length > 0) {
            paySlipsForValidation = paySlipFiles;
          } else if (existingPaySlipUrls.length > 0) {
            paySlipsForValidation = existingPaySlipUrls;
          } else {
            setErrors((prev) => ({
              ...prev,
              paySlips: "Upload either 1 PDF or 6 images",
            }));
            alert("Upload either 1 PDF or 6 images");
            return;
          }
        }
        await step3Schema.validate(
          { education, experience, hasExperience, paySlips: paySlipsForValidation },
          { abortEarly: false },
        );
      }
      if (currentStep === 4) {
        await step4Schema.validate(
          { documents: step4Docs },
          { abortEarly: false },
        );
      }
      if (currentStep === 5) {
        await step5Schema.validate(
          {
            ...bank,
            declaration1,
            declaration2,
            cancelledCheque: cancelledChequeFile || existingCancelledChequeUrl,
          },
          { abortEarly: false },
        );
      }

      if (shouldSetErrors) setErrors({});
      return true;
    } catch (err: any) {
      const newErrors: any = {};

      if (err.inner?.length) {
        err.inner.forEach((e: any) => {
          newErrors[e.path] = e.message;
        });
      } else if (err.path) {
        newErrors[err.path] = err.message;
      }

      if (shouldSetErrors) setErrors(newErrors);
      return false;
    }
  };

  const validateStep = async () => validateStepData(step, true);

  const validateSingleField = useCallback(
    async (path: string) => {
      try {
        if (step === 1) {
          await step1Schema.validateAt(path, s1);
        } else if (step === 2) {
          await step2Schema.validateAt(path, {
            permanentAddress,
            communicationAddress,
            sameAsPermanent,
          });
        } else if (step === 3) {
          await step3Schema.validateAt(path, {
            education,
            experience,
            hasExperience,
          });
        } else if (step === 4) {
          await step4Schema.validateAt(path, { documents: step4Docs });
        } else if (step === 5) {
          await step5Schema.validateAt(path, {
            ...bank,
            declaration1,
            declaration2,
            cancelledCheque: cancelledChequeFile || existingCancelledChequeUrl,
          });
        }
        setErrors((prev: Record<string, string>) => {
          if (!prev[path]) return prev;
          const next = { ...prev };
          delete next[path];
          return next;
        });
      } catch (err: any) {
        setErrors((prev: Record<string, string>) => ({
          ...prev,
          [path]: err?.message || "Invalid value",
        }));
      }
    },
    [
      step,
      s1,
      permanentAddress,
      communicationAddress,
      sameAsPermanent,
      education,
      experience,
      hasExperience,
      step4Docs,
      bank,
      declaration1,
      declaration2,
      cancelledChequeFile,
      existingCancelledChequeUrl,
    ],
  );

  const prevStepRef = useRef(step);
  const prevS1Ref = useRef(s1);
  const prevPermanentRef = useRef(permanentAddress);
  const prevCommunicationRef = useRef(communicationAddress);
  const prevSameAsPermanentRef = useRef(sameAsPermanent);
  const prevEducationRef = useRef(education);
  const prevExperienceRef = useRef(experience);
  const prevHasExperienceRef = useRef(hasExperience);
  const prevStep4DocsRef = useRef(step4Docs);
  const prevBankRef = useRef(bank);
  const prevDeclaration1Ref = useRef(declaration1);
  const prevDeclaration2Ref = useRef(declaration2);
  const prevCancelledChequeFileRef = useRef(cancelledChequeFile);
  const prevExistingChequeUrlRef = useRef(existingCancelledChequeUrl);

  useEffect(() => {
    // Reset "first interaction" behavior when step changes
    if (prevStepRef.current !== step) {
      prevStepRef.current = step;
      setErrors({});
      return;
    }

    if (step === 1) {
      const prev = prevS1Ref.current;
      const fields: Array<keyof typeof s1> = [
        "fullName",
        "surname",
        "fatherOrSpouseName",
        "phone",
        "alternatePhone",
        "email",
        "dob",
        "gender",
        "maritalStatus",
        "nationality",
      ];
      fields.forEach((f) => {
        if (prev[f] !== s1[f]) validateSingleField(String(f));
      });
      prevS1Ref.current = s1;
      return;
    }

    if (step === 2) {
      const pPrev = prevPermanentRef.current;
      const cPrev = prevCommunicationRef.current;
      const addrKeys: Array<keyof DetailedAddressForm> = [
        "doorNo",
        "roadNo",
        "colony",
        "mandal",
        "state",
        "city",
        "pincode",
      ];
      addrKeys.forEach((k) => {
        if (pPrev[k] !== permanentAddress[k])
          validateSingleField(`permanentAddress.${k}`);
        if (cPrev[k] !== communicationAddress[k])
          validateSingleField(`communicationAddress.${k}`);
      });
      if (prevSameAsPermanentRef.current !== sameAsPermanent) {
        validateSingleField("sameAsPermanent");
      }
      prevPermanentRef.current = permanentAddress;
      prevCommunicationRef.current = communicationAddress;
      prevSameAsPermanentRef.current = sameAsPermanent;
      return;
    }

    if (step === 3) {
      if (prevHasExperienceRef.current !== hasExperience) {
        validateSingleField("hasExperience");
        if (hasExperience !== "yes") {
          setErrors((prev: Record<string, string>) => {
            const next = { ...prev };
            Object.keys(next).forEach((k) => {
              if (k.startsWith("experience[") || k === "paySlips")
                delete next[k];
            });
            return next;
          });
        }
      }
      const eduKeys: Array<keyof EducationRow> = [
        "qualification",
        "institution",
        "yearOfPassing",
        "marksOrCgpa",
      ];
      const maxEdu = Math.max(
        prevEducationRef.current.length,
        education.length,
      );
      for (let i = 0; i < maxEdu; i++) {
        const prevRow = prevEducationRef.current[i];
        const curRow = education[i];
        if (!curRow) continue;
        eduKeys.forEach((k) => {
          const prevVal = prevRow ? prevRow[k] : "";
          if (prevVal !== curRow[k])
            validateSingleField(`education[${i}].${k}`);
        });
      }
      const expKeys: Array<keyof ExperienceRow> = [
        "organization",
        "designation",
        "responsibilities",
      ];
      const maxExp = Math.max(
        prevExperienceRef.current.length,
        experience.length,
      );
      for (let i = 0; i < maxExp; i++) {
        const prevRow = prevExperienceRef.current[i];
        const curRow = experience[i];
        if (!curRow) continue;
        expKeys.forEach((k) => {
          const prevVal = prevRow ? prevRow[k] : "";
          if (prevVal !== curRow[k])
            validateSingleField(`experience[${i}].${k}`);
        });
        const prevFrom = prevRow ? prevRow.fromDate : "";
        if (prevFrom !== curRow.fromDate) {
          const fromPath = `experience[${i}].fromDate`;
          setErrors((prev: Record<string, string>) => {
            const next = { ...prev };
            if (!String(curRow.fromDate || "").trim()) {
              next[fromPath] = "From date is required";
            } else {
              delete next[fromPath];
            }
            return next;
          });
        }
        const prevTo = prevRow ? prevRow.toDate : "";
        if (prevTo !== curRow.toDate || prevFrom !== curRow.fromDate) {
          const toPath = `experience[${i}].toDate`;
          setErrors((prev: Record<string, string>) => {
            const next = { ...prev };
            const from = String(curRow.fromDate || "").trim();
            const to = String(curRow.toDate || "").trim();
            if (from && to && Number(to) < Number(from)) {
              next[toPath] = "To year cannot be before From year";
            } else {
              delete next[toPath];
            }
            return next;
          });
        }
      }

      prevHasExperienceRef.current = hasExperience;
      prevEducationRef.current = education;
      prevExperienceRef.current = experience;
      return;
    }

    if (step === 4) {
      const prevDocs = prevStep4DocsRef.current;
      const maxDocs = Math.max(prevDocs.length, step4Docs.length);
      for (let i = 0; i < maxDocs; i++) {
        const prevUrl = prevDocs[i]?.fileUrl || "";
        const curUrl = step4Docs[i]?.fileUrl || "";
        if (prevUrl !== curUrl) validateSingleField(`documents[${i}].fileUrl`);
      }
      prevStep4DocsRef.current = step4Docs;
      return;
    }

    if (step === 5) {
      const bPrev = prevBankRef.current;
      const bankKeys: Array<keyof typeof bank> = [
        "accountHolderName",
        "bankName",
        "branchName",
        "accountNumber",
        "ifscCode",
        "upiId",
      ];
      bankKeys.forEach((k) => {
        if (bPrev[k] !== bank[k]) validateSingleField(String(k));
      });
      if (prevDeclaration1Ref.current !== declaration1)
        validateSingleField("declaration1");
      if (prevDeclaration2Ref.current !== declaration2)
        validateSingleField("declaration2");
      if (
        prevCancelledChequeFileRef.current !== cancelledChequeFile ||
        prevExistingChequeUrlRef.current !== existingCancelledChequeUrl
      ) {
        validateSingleField("cancelledCheque");
      }
      prevBankRef.current = bank;
      prevDeclaration1Ref.current = declaration1;
      prevDeclaration2Ref.current = declaration2;
      prevCancelledChequeFileRef.current = cancelledChequeFile;
      prevExistingChequeUrlRef.current = existingCancelledChequeUrl;
    }
  }, [
    step,
    s1,
    permanentAddress,
    communicationAddress,
    sameAsPermanent,
    education,
    experience,
    hasExperience,
    paySlipFiles,
    existingPaySlipUrls,
    step4Docs,
    bank,
    declaration1,
    declaration2,
    cancelledChequeFile,
    existingCancelledChequeUrl,
    validateSingleField,
  ]);

  const onNext = async () => {
    console.log("Current Step:", step);

    const isValid = await validateStep();
    

    if (!isValid) {
      console.log("Validation Errors:", errors);
      return;
    }

    console.log("Calling API for step:", step);
    if (step === 1) await submitStep1();
    else if (step === 2) await submitStep2();
    else if (step === 3) await submitStep3();
    else if (step === 4) await submitStep4();
    else if (step === 5) await submitStep5();
  };

  // const onNext = async () => {
  //   try {
  //     if (step === 1) await submitStep1();
  //     else if (step === 2) await submitStep2();
  //     else if (step === 3) await submitStep3();
  //     else if (step === 4) await submitStep4();
  //     else if (step === 5) await submitStep5();
  //   } catch {
  //     // toast handled in hook
  //   }
  // };

  const onBack = () => {
    if (step > 1) setStep(step - 1);
  };

  if (isEditMode && isEditLoading && !hasPrefilledRef.current) {
    return (
      <div className="w-full px-3 py-8 text-sm text-gray-600 dark:text-gray-300">
        Loading delivery agent details...
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-8">
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
          {isEditMode ? "Edit Delivery Agent" : "Add Delivery Agent"}
        </h1>
        <BackButton to="/delivery-boys/manage" />
      </div>
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        {/* Progress indicator — same pattern as Add Delivery Agent */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">
              {isEditMode ? "Edit Delivery Agent" : "Add Delivery Agent"}
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
              Step {step} of {totalSteps}
            </span>
          </div>
          <div className="flex items-center justify-between min-w-0">
            {[1, 2, 3, 4, 5].map((stepNum) => (
              <div key={stepNum} className="flex items-center flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => goToStep(stepNum)}
                  className={`flex items-center gap-2 min-w-0 ${stepNum <= step
                    ? "cursor-pointer"
                    : "cursor-not-allowed opacity-50"
                    }`}
                  disabled={stepNum > step}
                >
                  <div
                    className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${stepNum === step
                      ? "bg-green-600 text-white"
                      : isStepCompleted(stepNum)
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                      }`}
                  >
                    {isStepCompleted(stepNum) ? (
                      <CheckCircle size={16} className="text-white" />
                    ) : (
                      stepNum
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium hidden sm:block truncate ${stepNum === step
                      ? "text-green-600 dark:text-green-400"
                      : isStepCompleted(stepNum)
                        ? "text-green-500 dark:text-green-400"
                        : "text-gray-500 dark:text-gray-400"
                      }`}
                  >
                    {stepNum === 1 && "Personal Info"}
                    {stepNum === 2 && "Address Info"}
                    {stepNum === 3 && "Education & Experience"}
                    {stepNum === 4 && "Documents"}
                    {stepNum === 5 && "Bank & Settlement"}
                  </span>
                </button>
                {stepNum < totalSteps && (
                  <div className="flex-1 h-0.5 mx-1 sm:mx-2 bg-gray-200 dark:bg-gray-700 min-w-[8px]">
                    <div
                      className={`h-full transition-all ${stepNum < step
                        ? "bg-green-500"
                        : "bg-gray-200 dark:bg-gray-700"
                        }`}
                      style={{
                        width: stepNum < step ? "100%" : "0%",
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {step === 1 && (
          <div>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
              <User
                size={16}
                className="text-green-600 dark:text-green-400 shrink-0"
              />
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Step 1: Personal Information
              </h3>
              {isStepCompleted(1) && (
                <CheckCircle
                  size={16}
                  className="text-green-500 dark:text-green-400 shrink-0"
                />
              )}
            </div>
            <FormSectionWithDots title="Personal Information">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextInput
                  label="Full Name"
                  placeholder="Enter full name"
                  value={s1.fullName}
                  onChange={(e) => setS1({ ...s1, fullName: e.target.value })}
                  required
                  error={errors.fullName}
                />
                <TextInput
                  label="Sur Name"
                  placeholder="Enter surname"
                  value={s1.surname}
                  onChange={(e) => setS1({ ...s1, surname: e.target.value })}
                  required
                  error={errors.surname}
                />
                <TextInput
                  label="Father's / Spouse Name"
                  placeholder="Enter name"
                  className="md:col-span-2"
                  value={s1.fatherOrSpouseName}
                  onChange={(e) =>
                    setS1({ ...s1, fatherOrSpouseName: e.target.value })
                  }
                  required
                  error={errors.fatherOrSpouseName}
                />
                <TextInput
                  label="Email ID"
                  type="email"
                  placeholder="Enter email address"
                  value={s1.email}
                  onChange={(e) => setS1({ ...s1, email: e.target.value })}
                  required
                  error={errors.email}
                />
                <div>
                  <TextInput
                    label="Date Of Birth"
                    type="date"
                    value={s1.dob}
                    onChange={(e) => setS1({ ...s1, dob: e.target.value })}
                    required
                    error={errors.dob}
                  />
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                    dd-mm-yyyy
                  </p>
                </div>
                <SelectInput
                  label="Gender"
                  value={s1.gender}
                  onChange={(e) => setS1({ ...s1, gender: e.target.value })}
                  options={GENDER_OPTIONS}
                  required
                  error={errors.gender}
                />
                <TextInput
                  label="Mobile Number"
                  type="tel"
                  onlyNumbers
                  maxLength={10}
                  placeholder="Enter mobile number"
                  value={s1.phone}
                  onChange={(e) => setS1({ ...s1, phone: e.target.value })}
                  required
                  error={errors.phone}
                />
                <TextInput
                  label="Alternate Mobile Number"
                  type="tel"
                  onlyNumbers
                  maxLength={10}
                  placeholder="Enter alternate mobile number"
                  value={s1.alternatePhone}
                  onChange={(e) =>
                    setS1({ ...s1, alternatePhone: e.target.value })
                  }
                  error={errors.alternatePhone}
                />
                <SelectInput
                  label="Marital Status"
                  value={s1.maritalStatus}
                  onChange={(e) =>
                    setS1({ ...s1, maritalStatus: e.target.value })
                  }
                  options={MARITAL_OPTIONS}
                  required
                  error={errors.maritalStatus}
                />
                <TextInput
                  label="Nationality"
                  placeholder="e.g. Indian"
                  value={s1.nationality}
                  onChange={(e) =>
                    setS1({ ...s1, nationality: e.target.value })
                  }
                  error={errors.nationality}
                />
              </div>
            </FormSectionWithDots>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
              <MapPin
                size={16}
                className="text-green-600 dark:text-green-400 shrink-0"
              />
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Step 2: Address Information
              </h3>
              {isStepCompleted(2) && (
                <CheckCircle
                  size={16}
                  className="text-green-500 dark:text-green-400 shrink-0"
                />
              )}
            </div>

            <FormSectionWithDots title="Permanent Address">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextInput
                  label="Door No / Flat No"
                  value={permanentAddress.doorNo}
                  onChange={(e) =>
                    setPermanentAddress({
                      ...permanentAddress,
                      doorNo: e.target.value,
                    })
                  }
                  required
                  error={errors["permanentAddress.doorNo"]}
                />
                <TextInput
                  label="Road No"
                  value={permanentAddress.roadNo}
                  onChange={(e) =>
                    setPermanentAddress({
                      ...permanentAddress,
                      roadNo: e.target.value,
                    })
                  }
                  required
                  error={errors["permanentAddress.roadNo"]}
                />
                <TextInput
                  label="Colony / Village"
                  value={permanentAddress.colony}
                  onChange={(e) =>
                    setPermanentAddress({
                      ...permanentAddress,
                      colony: e.target.value,
                    })
                  }
                  required
                  error={errors["permanentAddress.colony"]}
                />
                <TextInput
                  label="Mandal"
                  value={permanentAddress.mandal}
                  onChange={(e) =>
                    setPermanentAddress({
                      ...permanentAddress,
                      mandal: e.target.value,
                    })
                  }
                  required
                  error={errors["permanentAddress.mandal"]}
                />
                <SelectInput
                  label="Select State"
                  value={permanentAddress.state}
                  onChange={(e) =>
                    setPermanentAddress({
                      ...permanentAddress,
                      state: e.target.value,
                    })
                  }
                  options={stateOptions}
                  placeholder="Select State"
                  required
                  error={errors["permanentAddress.state"]}
                />
                <SelectInput
                  label="Select City"
                  value={permanentAddress.city}
                  onChange={(e) =>
                    setPermanentAddress({
                      ...permanentAddress,
                      city: e.target.value,
                    })
                  }
                  options={cityOptions}
                  placeholder="Select City"
                  required
                  error={errors["permanentAddress.city"]}
                />
                <TextInput
                  label="Pincode"
                  value={permanentAddress.pincode}
                  onChange={(e) =>
                    setPermanentAddress({
                      ...permanentAddress,
                      pincode: e.target.value,
                    })
                  }
                  required
                  onlyNumbers
                  maxLength={6}
                  error={errors["permanentAddress.pincode"]}
                />
              </div>
            </FormSectionWithDots>

            <FormSectionWithDots title="Communication Address">
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                  <span className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sameAsPermanent}
                      onChange={(e) => setSameAsPermanent(e.target.checked)}
                      className="accent-green-600 rounded border-gray-300"
                    />
                    <span>Same as Above</span>
                  </span>
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextInput
                  label="Door No / Flat No"
                  value={communicationAddress.doorNo}
                  onChange={(e) =>
                    setCommunicationAddress({
                      ...communicationAddress,
                      doorNo: e.target.value,
                    })
                  }
                  disabled={sameAsPermanent}
                  required={!sameAsPermanent}
                  error={
                    !sameAsPermanent
                      ? errors["communicationAddress.doorNo"]
                      : ""
                  }
                />
                <TextInput
                  label="Road No"
                  value={communicationAddress.roadNo}
                  onChange={(e) =>
                    setCommunicationAddress({
                      ...communicationAddress,
                      roadNo: e.target.value,
                    })
                  }
                  disabled={sameAsPermanent}
                  required={!sameAsPermanent}
                  error={
                    !sameAsPermanent
                      ? errors["communicationAddress.roadNo"]
                      : ""
                  }
                />
                <TextInput
                  label="Colony / Village"
                  value={communicationAddress.colony}
                  onChange={(e) =>
                    setCommunicationAddress({
                      ...communicationAddress,
                      colony: e.target.value,
                    })
                  }
                  disabled={sameAsPermanent}
                  required={!sameAsPermanent}
                  error={
                    !sameAsPermanent
                      ? errors["communicationAddress.colony"]
                      : ""
                  }
                />
                <TextInput
                  label="Mandal"
                  value={communicationAddress.mandal}
                  onChange={(e) =>
                    setCommunicationAddress({
                      ...communicationAddress,
                      mandal: e.target.value,
                    })
                  }
                  disabled={sameAsPermanent}
                  required={!sameAsPermanent}
                  error={
                    !sameAsPermanent
                      ? errors["communicationAddress.mandal"]
                      : ""
                  }
                />
                <SelectInput
                  label="Select State"
                  value={communicationAddress.state}
                  onChange={(e) =>
                    setCommunicationAddress({
                      ...communicationAddress,
                      state: e.target.value,
                    })
                  }
                  options={stateOptions}
                  placeholder="Select State"
                  disabled={sameAsPermanent}
                  required={!sameAsPermanent}
                  error={
                    !sameAsPermanent ? errors["communicationAddress.state"] : ""
                  }
                />
                <SelectInput
                  label="Select City"
                  value={communicationAddress.city}
                  onChange={(e) =>
                    setCommunicationAddress({
                      ...communicationAddress,
                      city: e.target.value,
                    })
                  }
                  options={cityOptions}
                  placeholder="Select City"
                  disabled={sameAsPermanent}
                  required={!sameAsPermanent}
                  error={
                    !sameAsPermanent ? errors["communicationAddress.city"] : ""
                  }
                />
                <TextInput
                  label="Pincode"
                  value={communicationAddress.pincode}
                  onChange={(e) =>
                    setCommunicationAddress({
                      ...communicationAddress,
                      pincode: e.target.value,
                    })
                  }
                  disabled={sameAsPermanent}
                  onlyNumbers
                  maxLength={6}
                  required={!sameAsPermanent}
                  error={
                    !sameAsPermanent
                      ? errors["communicationAddress.pincode"]
                      : ""
                  }
                />
              </div>
            </FormSectionWithDots>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
              <GraduationCap
                size={16}
                className="text-green-600 dark:text-green-400 shrink-0"
              />
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Step 3: Education & Experience
              </h3>
              {isStepCompleted(3) && (
                <CheckCircle
                  size={16}
                  className="text-green-500 dark:text-green-400 shrink-0"
                />
              )}
            </div>

            {/* ================= EDUCATION ================= */}
            <div>
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Education Details
                </h4>
                <div className="mt-1 border-t border-dashed border-gray-300 dark:border-gray-600" />
              </div>

              <div className={STEP3_CARD}>
                {education.map((row, i) => (
                  <div key={i} className="mb-6 last:mb-0 relative">
                    {education.length > 1 && (
                      <div className="absolute right-0 top-0 z-10">
                        <button
                          type="button"
                          className="p-1.5 text-red-500"
                          onClick={() =>
                            setEducation(education.filter((_, j) => j !== i))
                          }
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pr-8">
                      <TextInput
                        label="Education Qualification"
                        // required
                        value={row.qualification}
                        onChange={(e) => {
                          const next = [...education];
                          next[i] = { ...row, qualification: e.target.value };
                          setEducation(next);
                        }}
                        error={errors?.[`education[${i}].qualification`]}
                      />

                      <TextInput
                        label="Institution/University"
                        // required
                        value={row.institution}
                        onChange={(e) => {
                          const next = [...education];
                          next[i] = { ...row, institution: e.target.value };
                          setEducation(next);
                        }}
                        error={errors?.[`education[${i}].institution`]}
                      />

                      <SelectInput
                        label="Year of Passing"
                        // required
                        value={row.yearOfPassing}
                        onChange={(e) => {
                          const next = [...education];
                          next[i] = { ...row, yearOfPassing: e.target.value };
                          setEducation(next);
                        }}
                        options={YEAR_OF_PASSING_OPTIONS}
                        error={errors?.[`education[${i}].yearOfPassing`]}
                      />

                      <TextInput
                        label="CGPA/Percentage/Marks"
                        value={row.marksOrCgpa}
                        onlyNumbers
                        // required
                        onChange={(e) => {
                          const next = [...education];
                          next[i] = { ...row, marksOrCgpa: e.target.value };
                          setEducation(next);
                        }}
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  className="text-sm text-green-600"
                  onClick={() =>
                    setEducation([...education, emptyEducationRow()])
                  }
                >
                  + Add Qualification
                </button>
              </div>
            </div>

            {/* ================= EXPERIENCE ================= */}
            <div>
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Experience Details
                </h4>
              </div>

              <div className={STEP3_CARD}>
                <p className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Do you have work experience?
                </p>

                <div className="flex gap-4">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <input
                      type="radio"
                      value="yes"
                      checked={hasExperience === "yes"}
                      onChange={() => setHasExperience("yes")}
                    />{" "}
                    Yes
                  </label>

                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <input
                      type="radio"
                      value="no"
                      checked={hasExperience === "no"}
                      onChange={() => setHasExperience("no")}
                    />{" "}
                    No
                  </label>
                </div>

                {/*  radio error */}
                {errors.hasExperience && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.hasExperience}
                  </p>
                )}

                {hasExperience === "yes" && (
                  <>
                    {experience.map((row, i) => (
                      <div key={i} className="mt-4 grid md:grid-cols-5 gap-4">
                        <TextInput
                          label="Organization"
                          value={row.organization}
                          onChange={(e) => {
                            const next = [...experience];
                            next[i] = {
                              ...next[i],
                              organization: e.target.value,
                            };
                            setExperience(next);
                          }}
                          error={errors?.[`experience[${i}].organization`]}
                        />

                        <TextInput
                          label="Designation"
                          value={row.designation}
                          onChange={(e) => {
                            const next = [...experience];
                            next[i] = {
                              ...next[i],
                              designation: e.target.value,
                            };
                            setExperience(next);
                          }}
                          error={errors?.[`experience[${i}].designation`]}
                        />

                        <SelectInput
                          label="From (Year of Joining)"
                          value={row.fromDate}
                          onChange={(e) => {
                            const next = [...experience];
                            next[i] = { ...next[i], fromDate: e.target.value };
                            setExperience(next);
                          }}
                          options={YEAR_OF_PASSING_OPTIONS}
                          error={errors?.[`experience[${i}].fromDate`]}
                        />

                        <SelectInput
                          label="To (Year of Leaving)"
                          value={row.toDate}
                          onChange={(e) => {
                            const next = [...experience];
                            next[i] = { ...next[i], toDate: e.target.value };
                            setExperience(next);
                          }}
                          options={YEAR_OF_PASSING_OPTIONS}
                          error={errors?.[`experience[${i}].toDate`]}
                        />

                        <TextInput
                          label="Responsibilities"
                          value={row.responsibilities}
                          onChange={(e) => {
                            const next = [...experience];
                            next[i] = {
                              ...next[i],
                              responsibilities: e.target.value,
                            };
                            setExperience(next);
                          }}
                          error={errors?.[`experience[${i}].responsibilities`]}
                        />
                      </div>
                    ))}

                    <button
                      className="text-sm text-green-600"
                      type="button"
                      onClick={() =>
                        setExperience([...experience, emptyExperienceRow()])
                      }
                    >
                      + Add Experience
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* ================= PAY SLIPS ================= */}
            {hasExperience === "yes" && (

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Upload last 6 months pay slips (images or PDF)
                </label>

                <div
                  className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors ${isDraggingPaySlips
                    ? "border-[#00891D] dark:border-green-500 bg-green-50/50 dark:bg-green-900/20"
                    : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 hover:border-gray-400 dark:hover:border-gray-500"
                    } ${errors.paySlips ? "border-red-500" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingPaySlips(true);
                  }}
                  onDragLeave={() => setIsDraggingPaySlips(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingPaySlips(false);
                    if (paySlipFiles.length + existingPaySlipUrls.length >= 6) {
                      toast.error("You can upload a maximum of 6 pay slips.");
                      return;
                    }
                    if (e.dataTransfer.files?.length)
                      appendPaySlipFiles(e.dataTransfer.files);
                  }}
                >
                  <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf,.pdf"
                    className="hidden"
                    id="paySlips-upload-onboarding"
                    disabled={paySlipFiles.length + existingPaySlipUrls.length >= 6}
                    onChange={(e) => {
                      if (e.target.files?.length)
                        appendPaySlipFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />

                  <label
                    htmlFor="paySlips-upload-onboarding"
                    className={`cursor-pointer block ${ paySlipFiles.length + existingPaySlipUrls.length >= 6 ? "opacity-50 pointer-events-none" : ""}`}
                  >
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#00891D] rounded-full flex items-center justify-center mb-3">
                        <Upload size={24} className="text-white" />
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5">
                        Drag and Drop or Choose file to upload
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
                        supported formats PNG, JPEG, PDF
                      </p>
                    </div>
                  </label>
                </div>

                {paySlipFiles.length >= 6 && (
                  <p className="text-green-600 text-xs mt-1">
                    You have uploaded 6 pay slips.
                  </p>
                )}

                {/* ERROR MESSAGE */}
                {errors.paySlips && (
                  <p className="text-red-500 text-xs mt-1">{errors.paySlips}</p>
                )}
                {(existingPaySlipUrls.length > 0 || paySlipFiles.length > 0) && (
                  <div className="mt-3 space-y-1">

                    {/* Existing Files */}
                    {existingPaySlipUrls.map((url, idx) => (
                      <div
                        key={`existing-${idx}`}
                        className="flex items-center justify-between gap-2 text-xs bg-gray-50 dark:bg-gray-800/80 rounded px-2 py-2"
                      >
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-green-700 dark:text-green-400 underline"
                        >
                          {fileNameFromUrl(url) || `Payslip ${idx + 1}`}
                        </a>
                        <button
                          type="button"
                          className="text-red-500 shrink-0 p-1"
                          onClick={() =>
                            setExistingPaySlipUrls((prev) =>
                              prev.filter((_, j) => j !== idx)
                            )
                          }
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}

                    {/* New Files */}
                    {paySlipFiles.map((f, idx) => (
                      <div
                        key={`new-${idx}`}
                        className="flex items-center justify-between gap-2 text-xs bg-gray-50 dark:bg-gray-800/80 rounded px-2 py-2"
                      >
                        <span className="truncate text-gray-700 dark:text-gray-300">
                          {f.name}
                        </span>
                        <button
                          type="button"
                          className="text-red-500 shrink-0 p-1"
                          onClick={() =>
                            setPaySlipFiles((prev) =>
                              prev.filter((_, j) => j !== idx)
                            )
                          }
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}

                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="w-full space-y-8">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
              <FileText
                size={16}
                className="text-green-600 dark:text-green-400 shrink-0"
              />
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Step 4: Documents
              </h3>
              {isStepCompleted(4) && (
                <CheckCircle
                  size={16}
                  className="text-green-500 dark:text-green-400 shrink-0"
                />
              )}
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-4 mb-2">
              Each file is uploaded immediately using the same image upload API
              as products. All four documents are required to continue.
            </p>

            {step4Docs.map((slot, index) => {
              const errorMsg = errors[`documents[${index}].fileUrl`]; // ✅ error mapping

              return (
                <div key={slot.id} className="w-full">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                      {slot.label}
                    </span>

                    {slot.fileUrl && !slot.uploading && (
                      <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-medium text-[#00891D] dark:text-green-400">
                        <CheckCircle size={12} className="shrink-0" />
                        Saved
                      </span>
                    )}
                  </div>

                  {/* Upload Box */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors ${draggingStep4Id === slot.id
                      ? "border-[#00891D] dark:border-green-500 bg-green-50/50 dark:bg-green-900/20"
                      : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 hover:border-gray-400 dark:hover:border-gray-500"
                      } ${slot.uploading ? "opacity-70 pointer-events-none" : ""} ${errorMsg ? "border-red-500" : ""
                      }`} // ✅ red border if error
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDraggingStep4Id(slot.id);
                    }}
                    onDragLeave={() => setDraggingStep4Id(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDraggingStep4Id(null);
                      const f = e.dataTransfer.files?.[0];
                      if (f) void uploadStep4SlotFile(slot.id, f);
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*,application/pdf,.pdf"
                      className="hidden"
                      id={`step4-upload-${slot.id}`}
                      disabled={slot.uploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void uploadStep4SlotFile(slot.id, f);
                        e.target.value = "";
                      }}
                    />

                    <label
                      htmlFor={`step4-upload-${slot.id}`}
                      className="cursor-pointer block"
                    >
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#00891D] rounded-full flex items-center justify-center mb-3">
                          {slot.uploading ? (
                            <span className="text-white text-xs font-semibold animate-pulse">
                              …
                            </span>
                          ) : (
                            <Upload size={24} className="text-white" />
                          )}
                        </div>

                        <p className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5">
                          {slot.uploading
                            ? "Uploading…"
                            : "Drag and Drop or Choose file to upload"}
                        </p>

                        <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
                          supported formats PNG, JPEG, PDF
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* ✅ ERROR MESSAGE */}
                  {errorMsg && (
                    <p className="text-red-500 text-xs mt-1">{errorMsg}</p>
                  )}

                  {/* File Name */}
                  {slot.fileName && slot.fileUrl && !slot.uploading && (
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs bg-gray-50 dark:bg-gray-800/80 rounded px-2 py-2">
                      <span className="truncate text-gray-700 dark:text-gray-300">
                        {slot.fileName}
                      </span>
                      <button
                        type="button"
                        className="text-red-500 shrink-0 p-1 hover:opacity-80"
                        onClick={() => clearStep4Slot(slot.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}

                  {/* Preview */}
                  {slot.fileUrl && !slot.uploading && (
                    <FilePreview url={slot.fileUrl} label={slot.label} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {step === 5 && (
          <div className="max-w-4xl mx-auto w-full space-y-6">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
              <CreditCard
                size={16}
                className="text-green-600 dark:text-green-400 shrink-0"
              />
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Step 5: Bank and settlement Data
              </h3>
              {isStepCompleted(5) && (
                <CheckCircle
                  size={16}
                  className="text-green-500 dark:text-green-400 shrink-0"
                />
              )}
            </div>

            {/* BANK DETAILS */}
            <div className={STEP3_CARD}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TextInput
                  label="Account Holder Name"
                  value={bank.accountHolderName}
                  onChange={(e) =>
                    setBank({ ...bank, accountHolderName: e.target.value })
                  }
                  required
                  error={errors.accountHolderName}
                />
                <TextInput
                  label="Bank Name"
                  value={bank.bankName}
                  onChange={(e) =>
                    setBank({ ...bank, bankName: e.target.value })
                  }
                  required
                  error={errors.bankName}
                />
                <TextInput
                  label="Branch Name"
                  value={bank.branchName}
                  onChange={(e) =>
                    setBank({ ...bank, branchName: e.target.value })
                  }
                  required
                  error={errors.branchName}
                />
                <TextInput
                  label="Bank Account Number"
                  value={bank.accountNumber}
                  onChange={(e) =>
                    setBank({ ...bank, accountNumber: e.target.value })
                  }
                  required
                  onlyNumbers
                  error={errors.accountNumber}
                />
                <TextInput
                  label="Bank IFSC Code"
                  value={bank.ifscCode}
                  onChange={(e) =>
                    setBank({ ...bank, ifscCode: e.target.value })
                  }
                  required
                  error={errors.ifscCode}
                />
                <TextInput
                  label="UPI ID (Optional)"
                  value={bank.upiId}
                  onChange={(e) => setBank({ ...bank, upiId: e.target.value })}
                  error={errors.upiId}
                />
              </div>
            </div>

            {/* CHEQUE UPLOAD */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cancelled Cheque or Bank Passbook Front Page Upload
              </label>

              <div
                className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors ${isDraggingCheque
                  ? "border-[#00891D] dark:border-green-500 bg-green-50/50 dark:bg-green-900/20"
                  : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50"
                  } ${errors.cancelledCheque ? "border-red-500" : ""}`} // ✅ red border
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingCheque(true);
                }}
                onDragLeave={() => setIsDraggingCheque(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingCheque(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) setChequeFromFiles([f]);
                }}
              >
                <input
                  type="file"
                  accept="image/*,application/pdf,.pdf"
                  className="hidden"
                  id="cancelled-cheque-upload"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setChequeFromFiles(e.target.files);
                    e.target.value = "";
                  }}
                />

                <label
                  htmlFor="cancelled-cheque-upload"
                  className="cursor-pointer block"
                >
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-12 h-12 bg-[#00891D] rounded-full flex items-center justify-center mb-3">
                      <Upload size={24} className="text-white" />
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200">
                      Drag and Drop or Choose file to upload
                    </p>
                  </div>
                </label>
              </div>

              {/* ✅ CHEQUE ERROR */}
              {errors.cancelledCheque && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.cancelledCheque}
                </p>
              )}

              {(cancelledChequeFile || existingCancelledChequeUrl) && (
                <div className="mt-3 flex justify-between text-xs bg-gray-50 rounded px-2 py-2">
                  <span>
                    {cancelledChequeFile?.name ||
                      fileNameFromUrl(existingCancelledChequeUrl) ||
                      "Uploaded file"}
                  </span>
                  <button
                    type="button"
                    className="text-red-500"
                    onClick={() => {
                      setCancelledChequeFile(null);
                      setExistingCancelledChequeUrl("");
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}

              {selectedChequePreviewUrl && (
                <img
                  src={selectedChequePreviewUrl}
                  className="mt-2 h-28 mx-auto"
                />
              )}
            </div>

            {/* DECLARATIONS */}
            <div className="space-y-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={declaration1}
                  onChange={(e) => setDeclaration1(e.target.checked)}
                />
                <span className="text-xs">
                  I hereby declare that all the information provided above is
                  true and correct.
                </span>
              </label>

              {/* ✅ ERROR */}
              {errors.declaration1 && (
                <p className="text-red-500 text-xs">{errors.declaration1}</p>
              )}

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={declaration2}
                  onChange={(e) => setDeclaration2(e.target.checked)}
                />
                <span className="text-xs">
                  I authorize VillagKart to verify my KYC, and banking details.
                </span>
              </label>

              {/*  ERROR */}
              {errors.declaration2 && (
                <p className="text-red-500 text-xs">{errors.declaration2}</p>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3 mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
          {step > 1 && (
            <Button
              type="button"
              variant="secondary"
              onClick={onBack}
              disabled={isPending}
            >
              <ChevronLeft size={18} className="mr-1" /> Back
            </Button>
          )}
          <PrimaryButton
            type="button"
            onClick={onNext}
            disabled={isPending}
            className="min-w-[120px]"
          >
            {isPending
              ? "Saving…"
              : step === 5
                ? isEditMode
                  ? "Update"
                  : "Finish"
                : "Save & continue"}
            {!isPending && step < 5 && (
              <ChevronRight size={18} className="ml-1" />
            )}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
};

export default DeliveryAgentOnboarding;
