"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CustomerDrawer from "@/components/CustomerDrawer";
import DynamicFields from "@/components/DynamicFields";

const STATUS_MAP: Record<string, { label: string; badge: string }> = {
  POTENTIAL_SELLER: { label: "بائع محتمل",        badge: "badge-orange" },
  SELLER:           { label: "بائع",              badge: "badge-blue" },
  BUYER:            { label: "مشتري",             badge: "badge-green" },
  NO_ANSWER:        { label: "لا يرد",            badge: "badge-orange" },
  CALL_LATER:       { label: "اتصال في وقت لاحق", badge: "badge-purple" },
  INTERESTED:       { label: "مهتم",              badge: "badge-green" },
  NOT_INTERESTED:   { label: "غير مهتم",          badge: "badge-red" },
  WANTS_TO_SELL:    { label: "يرغب في البيع",     badge: "badge-blue" },
  DO_NOT_SELL:      { label: "لا يرغب في البيع", badge: "badge-red" },
  MEETING_SCHEDULED:{ label: "موعد معاينة",       badge: "badge-purple" },
  COMPLETED:        { label: "مكتمل",             badge: "badge-gold" },
  RENTER:           { label: "مستأجر",            badge: "badge-blue" },
  LANDLORD:         { label: "مؤجر",              badge: "badge-purple" },
};

const TYPE_MAP: Record<string, string> = {
  BUYER: "مشتري",
  SELLER: "بائع",
};

const WHATSAPP_TEMPLATES = [
  { id: 1, label: "تفاصيل وحدة", text: "أهلاً بك، بخصوص استفسارك عن الوحدة العقارية، إليك كامل التفاصيل..." },
  { id: 2, label: "متابعة بعد معاينة", text: "سعدنا بلقائك اليوم في المعاينة. هل لديك أي استفسارات إضافية حول العقار؟" },
  { id: 3, label: "عرض مشروع جديد", text: "لدينا عرض حصري في مشروع جديد بمنطقة مميزة. هل ترغب في معرفة التفاصيل؟" },
];

const PROPERTY_TYPES = ["شقة", "فيلا", "توين هاوس", "تاون هاوس", "دوبلكس", "بنتهاوس", "مكتب", "عيادة", "محل تجاري", "مصنع", "أرض مصنع", "أرض سكنية", "أرض صناعية", "مستودع"];
const FACTORY_ACTIVITIES = ["غذائي", "صناعي", "طبي", "هندسي", "كيماوي", "ملابس/نسيج", "أخرى"];

export default function CustomersClient({
  initialCustomers,
  initialTotal,
  users,
  projects,
  isManager,
  view = "ALL",
  settings = {},
  session,
}: {
  initialCustomers: any[];
  initialTotal?: number;
  users: any[];
  projects: any[];
  isManager: boolean;
  view?: "LEADS" | "INVENTORY" | "ALL" | "AVAILABLE_FOR_SALE" | "BUYERS" | "OWNERS" | "NOT_INTERESTED";
  settings?: any;
  session?: any;
}) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [totalCount, setTotalCount] = useState(initialTotal ?? initialCustomers.length);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isFetching, setIsFetching] = useState(false);
  const [hasSearched, setHasSearched] = useState(true);
  const [search, setSearch] = useState("");
  const [subTypeFilter, setSubTypeFilter] = useState<"ALL" | "LEAD" | "SELLER">("ALL");
  
  // Advanced Filter States
  const [filterBuilding, setFilterBuilding] = useState("");
  const [filterUnit, setFilterUnit] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterArea, setFilterArea] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterFloor, setFilterFloor] = useState("");
  const [filterStaff, setFilterStaff] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Applied Filter States (for manual trigger)
  const [appliedFilters, setAppliedFilters] = useState({
    query: "",
    building: "",
    unit: "",
    project: "",
    area: "",
    type: "",
    floor: "",
    staff: "",
    status: "",
    neglected: false
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("filter") === "neglected") {
        setAppliedFilters(prev => ({ ...prev, neglected: true }));
        setHasSearched(true);
      }
    }
  }, []);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isKanban, setIsKanban] = useState(false);

  // Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importProject, setImportProject] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  
  // Drawer State
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  // New Customer State
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newProject, setNewProject] = useState("");
  const [newUnitNumber, setNewUnitNumber] = useState("");
  const [newBuildingNumber, setNewBuildingNumber] = useState("");
  const [newArea, setNewArea] = useState("");
  const [newFloor, setNewFloor] = useState("");
  const [newPropType, setNewPropType] = useState("");
  const [newStatus, setNewStatus] = useState("BUYER");
  const [newFollowUpDate, setNewFollowUpDate] = useState("");
  const [newGeneralNotes, setNewGeneralNotes] = useState("");
  const [newBedrooms, setNewBedrooms] = useState("");
  const [newBathrooms, setNewBathrooms] = useState("");
  const [newUnitSize, setNewUnitSize] = useState("");
  const [newAskingPrice, setNewAskingPrice] = useState("");
  const [newDeliveryDate, setNewDeliveryDate] = useState("");
  const [newInstallmentAmt, setNewInstallmentAmt] = useState("");
  const [newInstallmentRem, setNewInstallmentRem] = useState("");
  const [newInstallmentDet, setNewInstallmentDet] = useState("");
  const [newFinishing, setNewFinishing] = useState("");
  const [newPreferencesSummary, setNewPreferencesSummary] = useState("");
  const [newPaperworkStatus, setNewPaperworkStatus] = useState("");
  const [newPaymentMethod, setNewPaymentMethod] = useState("");
  const [newLeaseDuration, setNewLeaseDuration] = useState("");
  const [newDesiredAreas, setNewDesiredAreas] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [customFieldDefs, setCustomFieldDefs] = useState<any[]>([]);
  const [newCustomData, setNewCustomData] = useState<any>({});

  const router = useRouter();
  const isSeeking = newStatus === "BUYER" || newStatus === "RENTER";
  const isOffering = newStatus === "SELLER" || newStatus === "POTENTIAL_SELLER" || newStatus === "LANDLORD";

  const fetchDefs = async () => {
    const res = await fetch("/api/settings/custom-fields");
    const data = await res.json();
    setCustomFieldDefs(data.filter((f: any) => f.entityType === "CUSTOMER"));
  };

  useEffect(() => {
    fetchDefs();
  }, []);

  const getSuggestedEmployee = (customer: any) => {
    if (!customer.area) return null;
    return users.find(u => u.expertAreas?.toLowerCase().includes(customer.area.toLowerCase()));
  };

  const handlePhoneChange = async (phone: string) => {
    setNewPhone(phone);
    if (phone.length >= 8) {
      try {
        const res = await fetch(`/api/customers/check-phone?phone=${phone}`);
        const data = await res.json();
        if (data.exists) {
          setDuplicateWarning(`⚠️ هذا الرقم مسجل مسبقاً باسم: ${data.customer.name}`);
        } else {
          setDuplicateWarning(null);
        }
      } catch (err) {}
    } else {
      setDuplicateWarning(null);
    }
  };

  const fetchServerCustomers = useCallback(async (
    targetPage = 1,
    currentFilters = appliedFilters,
    targetLimit = pageSize,
    currentSubType = subTypeFilter
  ) => {
    setIsFetching(true);
    try {
      const safeLimit = Math.min(25, Math.max(1, targetLimit));
      const params = new URLSearchParams({
        view: view || "ALL",
        page: targetPage.toString(),
        limit: safeLimit.toString(),
        subType: currentSubType,
      });

      if (currentFilters.query) params.set("q", currentFilters.query);
      if (currentFilters.building) params.set("building", currentFilters.building);
      if (currentFilters.unit) params.set("unit", currentFilters.unit);
      if (currentFilters.project) params.set("project", currentFilters.project);
      if (currentFilters.area) params.set("area", currentFilters.area);
      if (currentFilters.type) params.set("propertyType", currentFilters.type);
      if (currentFilters.floor) params.set("floor", currentFilters.floor);
      if (currentFilters.staff) params.set("staff", currentFilters.staff);
      if (currentFilters.status) params.set("status", currentFilters.status);
      if (currentFilters.neglected) params.set("neglected", "true");

      const res = await fetch(`/api/customers?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
        setTotalCount(data.total || 0);
        setCurrentPage(data.page || 1);
      }
    } catch (err) {
      console.error("Error fetching customers:", err);
    } finally {
      setIsFetching(false);
    }
  }, [view, pageSize, appliedFilters, subTypeFilter]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    fetchServerCustomers(newPage);
  };

  const handleCustomerUpdated = (updatedCustomer: any) => {
    setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? { ...c, ...updatedCustomer } : c));
  };

  const filtered = customers;

  const handleStartSearch = () => {
    const newFilters = {
      query: search,
      building: filterBuilding,
      unit: filterUnit,
      project: filterProject,
      area: filterArea,
      type: filterType,
      floor: filterFloor,
      staff: filterStaff,
      status: filterStatus,
      neglected: false
    };
    setAppliedFilters(newFilters);
    fetchServerCustomers(1, newFilters, pageSize, subTypeFilter);
  };

  const handleSubTypeChange = (newSubType: "ALL" | "LEAD" | "SELLER") => {
    setSubTypeFilter(newSubType);
    fetchServerCustomers(1, appliedFilters, pageSize, newSubType);
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    setSelectedIds(selectedIds.length === filtered.length ? [] : filtered.map(c => c.id));
  };

  const handleBulkAssign = async () => {
    if (!selectedEmployee || selectedIds.length === 0) return;
    setLoading(true);
    try {
      await fetch("/api/customers/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerIds: selectedIds, employeeId: selectedEmployee }),
      });
      fetchServerCustomers(currentPage);
      setSelectedIds([]);
      setSelectedEmployee("");
    } catch (err) {}
    finally { setLoading(false); }
  };

  const handleBulkAction = async (action: string, value?: any) => {
    if (selectedIds.length === 0) return;
    if (action === "RESET" && !confirm("هل أنت متأكد من مسح كافة البيانات الإضافية والملاحظات للعملاء المحددين؟")) return;
    
    setLoading(true);
    try {
      await fetch("/api/customers/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerIds: selectedIds, action, value }),
      });
      fetchServerCustomers(currentPage);
      setSelectedIds([]);
    } catch (err) {}
    finally { setLoading(false); }
  };

  const handleManualAdd = async (e: React.FormEvent, stayInModal = false) => {
    if (e) e.preventDefault();
    setLoading(true);
    
    const isSeeking = newStatus === "BUYER" || newStatus === "RENTER";
    
    const payloadCustomData = {
      ...newCustomData,
      paymentMethod: newPaymentMethod,
      leaseDuration: newLeaseDuration,
    };

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName, phone: newPhone, projectId: newProject,
          unitNumber: newUnitNumber, buildingNumber: newBuildingNumber, 
          area: isSeeking ? newDesiredAreas : newArea,
          floor: newFloor, propertyType: newPropType, status: newStatus,
          bedrooms: parseInt(newBedrooms) || null, bathrooms: parseInt(newBathrooms) || null,
          unitSize: parseFloat(newUnitSize) || null, askingPrice: parseFloat(newAskingPrice) || null,
          deliveryDate: newDeliveryDate, installmentAmount: parseFloat(newInstallmentAmt) || null,
          installmentRemaining: parseInt(newInstallmentRem) || null, installmentDetails: newInstallmentDet,
          finishing: newFinishing, preferencesSummary: newPreferencesSummary,
          paperworkStatus: newPaperworkStatus,
          customData: payloadCustomData,
          followUpDate: newFollowUpDate,
          generalNotes: newGeneralNotes
        }),
      });
      
      const responseData = await res.json();
      
      if (!res.ok) {
        alert("❌ خطأ: " + (responseData.error || "فشل حفظ العميل"));
        return;
      }
      
      if (stayInModal) {
        // Clear only unit fields
        setNewUnitNumber("");
        setNewBuildingNumber("");
        setNewFloor("");
        setNewUnitSize("");
        setNewAskingPrice("");
        setNewInstallmentAmt("");
        setNewInstallmentRem("");
        setNewInstallmentDet("");
        setNewFinishing("");
        setNewCustomData({});
        // Keep newName, newPhone, newStatus, newProject, newArea, newPropType for convenience
        alert("✅ تم حفظ الوحدة بنجاح. يمكنك إدخال وحدة أخرى لنفس العميل.");
      } else {
        setShowAddModal(false);
        // Clear all
        setNewName(""); setNewPhone(""); setNewProject(""); setNewUnitNumber(""); 
        setNewBuildingNumber(""); setNewArea(""); setNewFloor(""); setNewPropType(""); 
        setNewStatus("BUYER");
        setNewFollowUpDate("");
        setNewGeneralNotes("");
        setNewAskingPrice("");
        setNewInstallmentAmt("");
        setNewInstallmentRem("");
        setNewBedrooms("");
        setNewBathrooms("");
        setNewUnitSize("");
        setNewFinishing("");
        setNewPreferencesSummary("");
        setNewPaperworkStatus("");
        setNewPaymentMethod("");
        setNewLeaseDuration("");
        setNewDesiredAreas("");
        setNewCustomData({});
        alert("✅ تم حفظ العميل بنجاح!");
      }
      router.refresh();
    } catch (err) {
      console.error("Error adding customer:", err);
      alert("❌ حدث خطأ أثناء حفظ العميل. تحقق من الاتصال بالإنترنت.");
    }
    finally { setLoading(false); }
  };

  // ─── Download empty template ─────────────────────────────────────────────
  const downloadTemplate = () => {
    const templateData = [{
      "الاسم": "",
      "رقم الهاتف": "",
      "الرقم القومي": "",
      "رقم الوحدة": "",
      "رقم العمارة": "",
      "المشروع": "",
      "المنطقة": "",
      "الدور": "",
      "تاريخ استلام الوحدة": "",
    }];
    const ws = XLSX.utils.json_to_sheet(templateData);
    // Set column widths for better UX
    ws["!cols"] = [
      { wch: 25 }, { wch: 18 }, { wch: 20 }, { wch: 14 },
      { wch: 14 }, { wch: 22 }, { wch: 18 }, { wch: 10 }, { wch: 22 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "نموذج بيانات العملاء");
    XLSX.writeFile(wb, "نموذج_استيراد_عملاء_بائع_محتمل.xlsx");
  };

  // ─── Parse uploaded Excel file ───────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        // Normalize column names
        const normalized = rows.map((row: any) => ({
          name: row["الاسم"] || row["name"] || "",
          phone: String(row["رقم الهاتف"] || row["phone"] || ""),
          nationalId: String(row["الرقم القومي"] || row["nationalId"] || ""),
          unitNumber: String(row["رقم الوحدة"] || row["unitNumber"] || ""),
          buildingNumber: String(row["رقم العمارة"] || row["buildingNumber"] || ""),
          projectName: String(row["المشروع"] || row["projectName"] || ""),
          area: String(row["المنطقة"] || row["area"] || ""),
          floor: String(row["الدور"] || row["floor"] || ""),
          deliveryDate: String(row["تاريخ استلام الوحدة"] || row["deliveryDate"] || ""),
        })).filter((r: any) => r.name && r.phone);
        if (normalized.length === 0) {
          setImportStatus("⚠️ لم يتم العثور على بيانات صالحة. تأكد من تنسيق الملف.");
        } else {
          setImportRows(normalized);
          setImportStatus(`✅ تم قراءة ${normalized.length} سجل. راجع البيانات ثم اضغط استيراد.`);
        }
      } catch (err) {
        setImportStatus("❌ خطأ في قراءة الملف. تأكد أن الملف بصيغة .xlsx أو .xls");
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset input so same file can be re-uploaded
    e.target.value = "";
  };

  // ─── Send import rows to API ─────────────────────────────────────────────
  const handleImport = async () => {
    if (importRows.length === 0) return;
    setImportLoading(true);
    setImportStatus(null);
    try {
      const res = await fetch("/api/customers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customers: importRows, projectId: importProject || null }),
      });
      const data = await res.json();
      if (res.ok) {
        setImportStatus(`🎉 تم الاستيراد بنجاح! تم إضافة ${data.count} عميل كبائع محتمل.`);
        setImportRows([]);
        router.refresh();
      } else {
        setImportStatus("❌ " + (data.error || "فشل الاستيراد"));
      }
    } catch (err) {
      setImportStatus("❌ حدث خطأ في الاتصال بالخادم");
    } finally {
      setImportLoading(false);
    }
  };

  const exportToExcel = () => {
    const dataToExport = filtered.map(c => {
      // Flatten custom data
      const extraFields: any = {};
      if (c.customData) {
        Object.entries(c.customData).forEach(([key, val]) => {
          const def = customFieldDefs.find(d => d.name === key);
          extraFields[def?.label || key] = val;
        });
      }

      return {
        "الاسم": c.name,
        "رقم الهاتف": c.phone,
        "التقييم": "★".repeat(c.leadScore || 3),
        "الحالة": STATUS_MAP[c.status]?.label || c.status,
        "الموظف": c.assignedTo?.name || "غير معين",
        "المشروع": projects.find(p => p.id === c.projectId)?.name || c.projectName || "",
        "المنطقة": c.area || "",
        "رقم العمارة": c.buildingNumber || "",
        "رقم الوحدة": c.unitNumber || "",
        "الدور": c.floor || "",
        "المساحة (م²)": c.unitSize || "",
        "غرف النوم": c.bedrooms || "",
        "الحمامات": c.bathrooms || "",
        "التشطيب": c.finishing || "",
        "السعر المطلوب": c.askingPrice || "",
        "مبلغ القسط": c.installmentAmount || "",
        "الأقساط المتبقية": c.installmentRemaining || "",
        "حالة الأوراق": c.paperworkStatus || "",
        "تاريخ الإضافة": new Date(c.createdAt).toLocaleDateString("ar-EG"),
        "آخر ملاحظة": c.interactions?.[0]?.notes || "",
        ...extraFields
      };
    });
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "بيانات العملاء التفصيلية");
    XLSX.writeFile(wb, `Darek_CRM_Full_Export_${new Date().toLocaleDateString()}.xlsx`);
  };

  const exportToPDF = async () => {
    setLoading(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: html2canvas } = await import("html2canvas");

      const printContainer = document.createElement("div");
      printContainer.style.position = "fixed";
      printContainer.style.left = "-9999px";
      printContainer.style.top = "0";
      printContainer.style.width = "1200px";
      printContainer.style.backgroundColor = "#ffffff";
      printContainer.style.color = "#111827";
      printContainer.style.fontFamily = "'Cairo', system-ui, sans-serif";
      printContainer.style.direction = "rtl";
      printContainer.style.padding = "40px";

      printContainer.innerHTML = `
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;800&display=swap" rel="stylesheet">
        <div style="font-family: 'Cairo', sans-serif; padding: 20px; color: #111827;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #111827; padding-bottom: 20px; margin-bottom: 30px;">
            <div>
              <h1 style="font-size: 26px; color: #111827; margin: 0; font-weight: 800;">دارك العقارية - Darek CRM</h1>
              <p style="font-size: 14px; color: #4b5563; margin: 5px 0 0 0;">تقرير الوحدات المعروضة (بيع وإيجار)</p>
            </div>
            <div style="text-align: left;">
              <p style="font-size: 13px; color: #4b5563; margin: 0;">تاريخ التصدير: ${new Date().toLocaleDateString("ar-EG")}</p>
              <p style="font-size: 13px; color: #4b5563; margin: 5px 0 0 0;">إجمالي الوحدات: ${filtered.length}</p>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 11px; color: #111827;">
            <thead>
              <tr style="background-color: #f3f4f6; border-bottom: 2px solid #111827;">
                <th style="padding: 12px 8px; font-weight: 800; border: 1px solid #d1d5db; text-align: right; width: 140px;">الاسم</th>
                <th style="padding: 12px 8px; font-weight: 800; border: 1px solid #d1d5db; text-align: right; width: 90px;">الهاتف</th>
                <th style="padding: 12px 8px; font-weight: 800; border: 1px solid #d1d5db; text-align: right; width: 130px;">المشروع / المنطقة</th>
                <th style="padding: 12px 8px; font-weight: 800; border: 1px solid #d1d5db; text-align: right; width: 70px;">الحالة</th>
                <th style="padding: 12px 8px; font-weight: 800; border: 1px solid #d1d5db; text-align: right;">تفاصيل العقار (عمارة/وحدة/دور/مساحة...)</th>
                <th style="padding: 12px 8px; font-weight: 800; border: 1px solid #d1d5db; text-align: right; width: 100px;">السعر المطلوب</th>
                <th style="padding: 12px 8px; font-weight: 800; border: 1px solid #d1d5db; text-align: right; width: 70px;">نظام الدفع</th>
                <th style="padding: 12px 8px; font-weight: 800; border: 1px solid #d1d5db; text-align: right; width: 95px;">قيمة القسط</th>
                <th style="padding: 12px 8px; font-weight: 800; border: 1px solid #d1d5db; text-align: right; width: 95px;">المدة المتبقية للأقساط</th>
                <th style="padding: 12px 8px; font-weight: 800; border: 1px solid #d1d5db; text-align: right; width: 150px;">البيانات الإضافية</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map((c, idx) => {
                const unitDetails = [
                  c.buildingNumber ? `عمارة ${c.buildingNumber}` : "",
                  c.unitNumber ? `وحدة ${c.unitNumber}` : "",
                  c.floor ? `دور ${c.floor}` : "",
                  c.unitSize ? `${c.unitSize}م²` : "",
                  c.bedrooms ? `${c.bedrooms} غرف` : "",
                  c.bathrooms ? `${c.bathrooms} حمام` : "",
                  c.finishing ? `تشطيب ${c.finishing}` : ""
                ].filter(Boolean).join(" · ");

                // Payment Method
                let payMethod = "كاش";
                if (c.status === "LANDLORD" || c.status === "RENTER") {
                  const lease = c.customData?.leaseDuration || "";
                  payMethod = `إيجار ${lease ? `(${lease})` : ""}`;
                } else if (c.customData?.paymentMethod) {
                  payMethod = c.customData.paymentMethod === "INSTALLMENT" ? "تقسيط" : (c.customData.paymentMethod === "CASH" ? "كاش" : c.customData.paymentMethod);
                } else if (c.installmentAmount || c.installmentRemaining) {
                  payMethod = "تقسيط";
                }

                // Installment Amount
                const instAmt = c.installmentAmount ? `${c.installmentAmount.toLocaleString()} ج.م` : "—";
                
                // Remaining Duration
                const instRem = c.installmentRemaining ? `${c.installmentRemaining} شهر` : "—";

                const extraFieldsList = [];
                if (c.customData) {
                  Object.entries(c.customData).forEach(([key, val]) => {
                    if (val && key !== "paymentMethod" && key !== "leaseDuration") {
                      const def = customFieldDefs.find(d => d.name === key);
                      extraFieldsList.push(`${def?.label || key}: ${val}`);
                    }
                  });
                }
                const customFieldsText = extraFieldsList.join(" | ") || "—";

                const rowBg = idx % 2 === 0 ? "#ffffff" : "#f9fafb";

                return `
                  <tr style="border-bottom: 1px solid #e5e7eb; background-color: ${rowBg};">
                    <td style="padding: 10px 8px; font-weight: bold; border: 1px solid #e5e7eb;">${c.name}</td>
                    <td style="padding: 10px 8px; direction: ltr; font-size: 11px; border: 1px solid #e5e7eb;">${c.phone}</td>
                    <td style="padding: 10px 8px; border: 1px solid #e5e7eb;">
                      ${projects.find(p => p.id === c.projectId)?.name || c.projectName || "—"}<br/>
                      <span style="color: #4b5563; font-size: 10px;">${c.area || "—"}</span>
                    </td>
                    <td style="padding: 10px 8px; border: 1px solid #e5e7eb;">
                      <span style="font-size: 10px; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: bold;">
                        ${STATUS_MAP[c.status]?.label || c.status}
                      </span>
                    </td>
                    <td style="padding: 10px 8px; color: #374151; font-size: 10px; border: 1px solid #e5e7eb; line-height: 1.4;">
                      ${unitDetails || "—"}
                    </td>
                    <td style="padding: 10px 8px; color: #059669; font-weight: bold; font-size: 12px; border: 1px solid #e5e7eb;">
                      ${c.askingPrice ? `${c.askingPrice.toLocaleString()} ج.م` : "—"}
                    </td>
                    <td style="padding: 10px 8px; border: 1px solid #e5e7eb;">${payMethod}</td>
                    <td style="padding: 10px 8px; color: #b45309; font-weight: bold; border: 1px solid #e5e7eb;">${instAmt}</td>
                    <td style="padding: 10px 8px; color: #b45309; border: 1px solid #e5e7eb;">${instRem}</td>
                    <td style="padding: 10px 8px; color: #4b5563; font-size: 10px; border: 1px solid #e5e7eb; max-width: 150px; word-wrap: break-word;">
                      ${customFieldsText}
                    </td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      `;

      document.body.appendChild(printContainer);

      await new Promise(resolve => setTimeout(resolve, 800));

      const canvas = await html2canvas(printContainer, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false
      });

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = 842;
      const pageHeight = 595;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      const pdf = new jsPDF("l", "pt", "a4");
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Darek_CRM_Units_${new Date().toLocaleDateString()}.pdf`);
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء التصدير.");
    } finally {
      document.body.removeChild(printContainer);
      setLoading(false);
    }
  };

  const logContact = (c: any) => {
    localStorage.setItem("last_contact_action", Date.now().toString());
    localStorage.setItem("last_contact_customer", JSON.stringify(c));
  };

  const getCleanPhone = (p: string) => p.replace(/\D/g, "").startsWith("0") ? "2" + p.replace(/\D/g, "") : p.replace(/\D/g, "");

  const getWhatsAppLink = (c: any) => {
    const template = WHATSAPP_TEMPLATES.find(t => t.id === selectedTemplateId);
    const text = template ? encodeURIComponent(template.text) : "";
    return `https://wa.me/${getCleanPhone(c.phone)}?text=${text}`;
  };

  return (
    <div>
      <div className="page-header animate-in">
        <div>
          <div className="page-title">
            {view === "LEADS" ? "🎯 العملاء المحتملين" :              view === "BUYERS" ? "🛍️ قائمة المشترين والمستأجرين" :
              view === "OWNERS" ? "🏠 قائمة الملاك" :
              view === "AVAILABLE_FOR_SALE" ? "🏠 وحدات معروضة (بيع وإيجار)" :
              view === "NOT_INTERESTED" ? "🚫 عملاء غير مهتمين" :
              "👥 قاعدة البيانات الشاملة"}
          </div>
          <div className="page-subtitle">{filtered.length} عميل من إجمالي {customers.length}</div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {view === "LEADS" && settings?.kanbanEnabled !== false && (
            <button onClick={() => setIsKanban(!isKanban)} className="btn btn-secondary">
              {isKanban ? "📋 عرض الجدول" : "📊 عرض لوحة الكانبان"}
            </button>
          )}
          {session?.role === "GENERAL_MANAGER" && (
            <button onClick={exportToExcel} className="btn btn-ghost">📥 تصدير Excel</button>
          )}
          {view === "AVAILABLE_FOR_SALE" && (
            <button onClick={exportToPDF} className="btn btn-ghost" style={{ border: "1px solid var(--accent-green)", color: "var(--accent-green)" }}>
              📄 تصدير PDF
            </button>
          )}
          {/* Import Excel button — visible for managers on all views */}
          {isManager && (
            <>
              <button
                onClick={downloadTemplate}
                className="btn btn-ghost"
                title="تحميل نموذج Excel فارغ"
                style={{ border: "1px solid var(--accent-blue)", color: "var(--accent-blue)" }}
              >
                📄 تحميل النموذج
              </button>
              <button
                onClick={() => { setShowImportModal(true); setImportRows([]); setImportStatus(null); }}
                className="btn btn-secondary"
                style={{ border: "1px solid var(--gold-primary)", color: "var(--gold-primary)" }}
              >
                📤 استيراد Excel
              </button>
            </>
          )}
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary">➕ إضافة عميل</button>
        </div>
      </div>

      {/* View Switcher Tabs (Desktop) */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 10 }}>
        <Link href="/dashboard/customers" className={`btn btn-sm ${view === "ALL" ? "btn-primary" : "btn-ghost"}`}>👥 الكل</Link>
        <Link href="/dashboard/buyers" className={`btn btn-sm ${view === "BUYERS" ? "btn-primary" : "btn-ghost"}`}>🛍️ المشترين والمستأجرين</Link>
        <Link href="/dashboard/available-for-sale" className={`btn btn-sm ${view === "AVAILABLE_FOR_SALE" ? "btn-primary" : "btn-ghost"}`}>🏠 وحدات معروضة (بيع وإيجار)</Link>
        <Link href="/dashboard/not-interested" className={`btn btn-sm ${view === "NOT_INTERESTED" ? "btn-primary" : "btn-ghost"}`}>🚫 غير مهتم</Link>
      </div>


      {/* Sub-type tabs for LEADS view */}
      {view === "LEADS" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {(["ALL", "LEAD", "SELLER"] as const).map(t => (
            <button
              key={t}
              onClick={() => handleSubTypeChange(t)}
              className={`btn btn-sm ${subTypeFilter === t ? "btn-primary" : "btn-ghost"}`}
            >
              {t === "ALL" ? "🔵 الكل" : t === "LEAD" ? "🎯 عملاء محتملين" : "🏠 ملاك وبائعين"}
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card animate-in-1" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
          <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
            <label className="form-label">بحث عام</label>
            <input 
              type="text" value={search} onChange={(e) => setSearch(e.target.value)} 
              className="input" placeholder="اسم، هاتف، عمارة، وحدة..." 
            />
          </div>
          
          <button onClick={() => setShowAdvanced(!showAdvanced)} className="btn btn-secondary">
            {showAdvanced ? "إخفاء الفلاتر ▲" : "فلاتر متقدمة ⚙️"}
          </button>

          <button onClick={handleStartSearch} className="btn btn-primary" style={{ padding: "10px 30px" }}>
            🔍 بدء البحث
          </button>

          {isManager && selectedIds.length > 0 && (
            <div className="animate-in" style={{ 
              display: "flex", gap: 12, marginLeft: "auto", padding: 12, 
              background: "rgba(212, 175, 55, 0.1)", borderRadius: 12, border: "1px solid rgba(212, 175, 55, 0.2)" 
            }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} className="input" style={{ width: 160 }}>
                  <option value="">تعيين للموظف...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <button onClick={handleBulkAssign} disabled={loading} className="btn btn-primary btn-sm">تعيين</button>
              </div>

              <div style={{ width: 1, background: "rgba(255,255,255,0.1)", margin: "0 8px" }} />

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => handleBulkAction("UNASSIGN")} disabled={loading} className="btn btn-secondary btn-sm" title="سحب من الموظف وإعادته للقاعدة">🔙 سحب</button>
                <select onChange={(e) => handleBulkAction("STATUS", e.target.value)} className="input" style={{ width: 130, height: 36, fontSize: 12 }}>
                  <option value="">تغيير الحالة...</option>
                  {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <button onClick={() => handleBulkAction("RESET")} disabled={loading} className="btn btn-ghost btn-sm" style={{ color: "var(--color-danger)" }}>🧹 مسح البيانات</button>
              </div>
              
              <div style={{ marginRight: 8, fontWeight: 800, color: "var(--gold-primary)", alignSelf: "center" }}>({selectedIds.length} محدد)</div>
            </div>
          )}
        </div>

        {showAdvanced && (
          <div className="grid-4 animate-in" style={{ marginTop: 20, paddingTop: 20, borderTop: "1px dashed var(--border-subtle)" }}>
            <div className="form-group">
              <label className="form-label">رقم العمارة</label>
              <input type="text" value={filterBuilding} onChange={e => setFilterBuilding(e.target.value)} className="input" placeholder="رقم العمارة..." />
            </div>
            <div className="form-group">
              <label className="form-label">رقم الوحدة</label>
              <input type="text" value={filterUnit} onChange={e => setFilterUnit(e.target.value)} className="input" placeholder="رقم الوحدة..." />
            </div>
            <div className="form-group">
              <label className="form-label">المشروع</label>
              <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="input">
                <option value="">كل المشاريع</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">المنطقة</label>
              <input type="text" value={filterArea} onChange={e => setFilterArea(e.target.value)} className="input" placeholder="المنطقة..." />
            </div>
            <div className="form-group">
              <label className="form-label">نوع العقار</label>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input">
                <option value="">كل الأنواع</option>
                {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">الدور</label>
              <input type="text" value={filterFloor} onChange={e => setFilterFloor(e.target.value)} className="input" placeholder="الدور..." />
            </div>
            {isManager && (
              <div className="form-group">
                <label className="form-label">بواسطة الموظف</label>
                <select value={filterStaff} onChange={e => setFilterStaff(e.target.value)} className="input">
                  <option value="">كل الموظفين</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">حالة العميل</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input">
                <option value="">كل الحالات</option>
                {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {isFetching && (
        <div style={{
          padding: "10px 16px",
          marginBottom: 16,
          borderRadius: 12,
          background: "rgba(212, 175, 55, 0.08)",
          border: "1px solid rgba(212, 175, 55, 0.25)",
          color: "var(--gold-primary)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 13,
          fontWeight: 700,
          animation: "pulse 1.5s infinite"
        }}>
          <span>🔄</span>
          <span>جاري تحميل وتحديث البيانات من السيرفر...</span>
        </div>
      )}

      {isKanban ? (
        <div className="kanban-board animate-in">
          {["NEW", "POTENTIAL_SELLER", "BUYER", "MEETING_SCHEDULED"].map(status => (
            <div key={status} className="kanban-column">
              <div className="kanban-column-header">
                <span>{STATUS_MAP[status]?.label || status}</span>
                <span className="badge badge-gray">{filtered.filter(c => c.status === status).length}</span>
              </div>
              <div className="kanban-cards">
                {filtered.filter(c => c.status === status).map(c => (
                  <div key={c.id} className="kanban-card" onClick={() => { setSelectedCustomer(c); setIsDrawerOpen(true); }}>
                    <div style={{ fontWeight: 800, marginBottom: 4 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>📞 {c.phone}</div>
                    <div style={{ fontSize: 11, marginTop: 8 }}>{c.projectName || "بدون مشروع"}</div>
                    <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ color: "var(--gold-primary)", fontSize: 10 }}>{"★".repeat(c.leadScore || 3)}</div>
                      <span className="badge badge-sm badge-blue">{c.assignedTo?.name || "—"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card animate-in" style={{ padding: 0, overflowX: "auto" }}>
          <table className="table desktop-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}><input type="checkbox" onChange={toggleAll} checked={selectedIds.length === filtered.length && filtered.length > 0} /></th>
                <th>المنطقة</th>
                <th>المشروع</th>
                <th>رقم الشقة</th>
                <th>رقم العمارة</th>
                <th>السعر المطلوب</th>
                <th>اسم العميل</th>
                <th>رقم التليفون</th>
                <th>الحالة</th>
                <th>الموظف</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const lastAt = c.interactions?.[0]?.createdAt || c.lastInteractionAt;
                const days = lastAt ? (Date.now() - new Date(lastAt).getTime()) / (1000 * 60 * 60 * 24) : 999;
                const rowClass = days < 3 ? "row-fresh" : days < 7 ? "row-warning" : "row-danger";

                return (
                  <tr key={c.id} className={rowClass}>
                    <td><input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleOne(c.id)} /></td>
                    <td style={{ fontSize: 13 }}>{c.area || "—"}</td>
                    <td style={{ fontSize: 13 }}>{projects.find(p => p.id === c.projectId)?.name || c.projectName || "—"}</td>
                    <td style={{ fontWeight: 700 }}>{c.unitNumber || "—"}</td>
                    <td>{c.buildingNumber || "—"}</td>
                    <td style={{ fontWeight: 800, color: "var(--accent-green)" }}>{c.askingPrice ? c.askingPrice.toLocaleString() : "—"}</td>
                    <td><Link href={`/dashboard/customers/${c.id}`} style={{ fontWeight: 800, color: "var(--gold-primary)" }}>{c.name}</Link></td>
                    <td style={{ direction: "ltr", fontSize: 13 }}>{c.phone}</td>
                    <td><span className={`badge ${STATUS_MAP[c.status]?.badge || "badge-gray"}`}>{STATUS_MAP[c.status]?.label || c.status}</span></td>
                    <td style={{ fontSize: 12 }}>{c.assignedTo?.name || "—"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Link href={`/dashboard/customers/${c.id}`} className="btn btn-ghost btn-sm" style={{ color: "var(--accent-blue)" }}>👁️ عرض</Link>
                        <button onClick={() => { setSelectedCustomer(c); setIsDrawerOpen(true); }} className="btn btn-ghost btn-sm" style={{ color: "var(--gold-primary)" }}>⚡ تعديل</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Mobile Cards */}
          <div className="mobile-cards">
            {filtered.map(c => (
              <div key={c.id} className="customer-card">
                <div className="customer-card-header">
                  <Link href={`/dashboard/customers/${c.id}`} style={{ fontWeight: 800 }}>{c.name}</Link>
                  <span className={`badge ${STATUS_MAP[c.status]?.badge}`}>{STATUS_MAP[c.status]?.label}</span>
                </div>
                <div className="customer-card-body">
                  <div>📞 {c.phone}</div>
                  <div>🏢 {c.projectName || "—"}</div>
                  <div>🏠 عمارة {c.buildingNumber || "—"}</div>
                  <div>🔑 وحدة {c.unitNumber || "—"}</div>
                  {c.askingPrice && <div style={{ color: "var(--accent-green)", fontWeight: 700 }}>💰 {c.askingPrice.toLocaleString()} جنيه</div>}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button onClick={() => { setSelectedCustomer(c); setIsDrawerOpen(true); }} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>تعديل</button>
                  <button 
                    onClick={() => {
                      const url = `${window.location.origin}/share/unit/${c.id}`;
                      navigator.clipboard.writeText(url);
                      alert("تم نسخ الرابط!");
                    }} 
                    className="btn btn-ghost btn-sm"
                  >🔗 عرض</button>
                  <a href={`https://wa.me/${getCleanPhone(c.phone)}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">واتساب</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Glassmorphism Server Pagination Bar */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 22px",
        marginTop: 18,
        background: "linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(17, 24, 39, 0.9))",
        backdropFilter: "blur(20px)",
        borderRadius: 16,
        border: "1px solid rgba(212, 175, 55, 0.2)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35)",
        flexWrap: "wrap",
        gap: 14,
      }}>
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          عرض صفحة <strong style={{ color: "var(--gold-primary)" }}>{currentPage}</strong> من <strong style={{ color: "var(--gold-primary)" }}>{totalPages}</strong> — (إجمالي <strong style={{ color: "var(--text-primary)" }}>{totalCount}</strong> عميل)
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1 || isFetching}
            className="btn btn-secondary btn-sm"
            style={{ padding: "6px 14px", borderRadius: 8 }}
          >
            السابق →
          </button>

          <div style={{ display: "flex", gap: 5 }}>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pNum = i + 1;
              if (totalPages > 5 && currentPage > 3) {
                pNum = Math.min(totalPages - 4 + i, Math.max(1, currentPage - 2 + i));
              }
              return (
                <button
                  key={pNum}
                  onClick={() => handlePageChange(pNum)}
                  disabled={isFetching}
                  className={`btn btn-sm ${currentPage === pNum ? "btn-primary" : "btn-ghost"}`}
                  style={{ width: 34, height: 34, padding: 0, borderRadius: 8, fontWeight: currentPage === pNum ? 800 : 500 }}
                >
                  {pNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || isFetching}
            className="btn btn-secondary btn-sm"
            style={{ padding: "6px 14px", borderRadius: 8 }}
          >
            ← التالي
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>عناصر لكل صفحة:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              const newSize = Math.min(25, parseInt(e.target.value));
              setPageSize(newSize);
              fetchServerCustomers(1, appliedFilters, newSize);
            }}
            className="input"
            style={{ width: 80, height: 34, padding: "4px 8px", fontSize: 12, borderRadius: 8 }}
          >
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={20}>20</option>
            <option value={25}>25 (الحد الأقصى)</option>
          </select>
        </div>
      </div>

      {/* Drawer */}
      <CustomerDrawer customer={selectedCustomer} isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} onUpdated={handleCustomerUpdated} />

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-in" style={{ maxWidth: 900, width: "95%" }}>
            <div className="modal-header">
              <div style={{ fontWeight: 800, fontSize: 18 }}>🆕 إضافة عميل ووحدات جديدة</div>
              <button onClick={() => setShowAddModal(false)} className="btn-close">✕</button>
            </div>
            <form onSubmit={handleManualAdd} style={{ padding: 24, maxHeight: "80vh", overflowY: "auto" }}>
              
              {/* Section 1: Customer Personal Info */}
              <div style={{ marginBottom: 30 }}>
                <h3 style={{ fontSize: 16, fontWeight: 900, marginBottom: 16, color: "var(--gold-primary)", borderBottom: "2px solid rgba(212,175,55,0.1)", paddingBottom: 8 }}>
                  👤 البيانات الأساسية للعميل
                </h3>
                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label">الاسم بالكامل *</label>
                    <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="input" required placeholder="اسم العميل..." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">رقم الهاتف *</label>
                    <input 
                      type="text" value={newPhone} 
                      onChange={e => handlePhoneChange(e.target.value)} 
                      className="input" required placeholder="01xxxxxxxxx" 
                    />
                    {duplicateWarning && (
                      <div style={{ fontSize: 11, color: "var(--accent-red)", marginTop: 4, fontWeight: 700 }}>
                        {duplicateWarning}
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">تصنيف العميل</label>
                    <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="input">
                      <option value="BUYER">مشتري</option>
                      <option value="POTENTIAL_SELLER">بائع محتمل</option>
                      <option value="SELLER">بائع</option>
                      <option value="RENTER">مستأجر</option>
                      <option value="LANDLORD">مؤجر</option>
                    </select>
                  </div>
                </div>

                {newStatus === "CALL_LATER" && (
                  <div className="form-group animate-in" style={{ marginTop: 12, padding: 12, background: "rgba(212, 175, 55, 0.1)", borderRadius: 8 }}>
                    <label className="form-label" style={{ color: "var(--gold-primary)" }}>⏰ موعد الاتصال القادم</label>
                    <input 
                      type="datetime-local" 
                      value={newFollowUpDate} 
                      onChange={e => setNewFollowUpDate(e.target.value)} 
                      className="input"
                    />
                  </div>
                )}

                <div className="form-group" style={{ marginTop: 16 }}>
                  <label className="form-label">📝 ملاحظات عامة (أول تواصل)</label>
                  <textarea 
                    value={newGeneralNotes} 
                    onChange={e => setNewGeneralNotes(e.target.value)} 
                    className="input" 
                    rows={3} 
                    placeholder="اكتب تفاصيل التواصل الأول مع العميل هنا..."
                  />
                </div>

                {/* Preferred Activity for Buyers/Renters (Industrial) */}
                {(newStatus === "BUYER" || newStatus === "RENTER") && (newPropType.includes("مصنع") || newPropType.includes("صناعي")) && (
                  <div style={{ marginTop: 12, padding: 12, background: "rgba(37, 211, 102, 0.05)", borderRadius: 8, border: "1px solid rgba(37, 211, 102, 0.1)" }}>
                    <label className="form-label" style={{ color: "#25D366" }}>🎯 النشاط الصناعي الذي يبحث عنه المشتري</label>
                    <select className="input" value={newCustomData.preferred_factory_activity || ""} onChange={e => setNewCustomData({...newCustomData, preferred_factory_activity: e.target.value})}>
                      <option value="">كل الأنشطة...</option>
                      {FACTORY_ACTIVITIES.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Section 2: Property Preferences / Details */}
              <div style={{ marginBottom: 30, padding: 20, background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px solid var(--border)" }}>
                <h3 style={{ fontSize: 16, fontWeight: 900, marginBottom: 16, color: "var(--accent-blue)" }}>
                  {isSeeking ? "🏠 المواصفات المطلوبة" : "🏠 بيانات الوحدة / العقار"}
                </h3>
                
                {/* Generic Property Fields */}
                <div className="grid-3" style={{ marginBottom: 20 }}>
                  {isOffering && (
                    <div className="form-group">
                      <label className="form-label">المشروع</label>
                      <select value={newProject} onChange={e => setNewProject(e.target.value)} className="input">
                        <option value="">اختر المشروع...</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  )}
                  
                  <div className="form-group">
                    <label className="form-label">{isSeeking ? "المناطق المرغوبة" : "المنطقة / الحي"}</label>
                    {isSeeking ? (
                      <input type="text" value={newDesiredAreas} onChange={e => setNewDesiredAreas(e.target.value)} className="input" placeholder="مثال: التجمع، المعادي، زايد..." />
                    ) : (
                      <input type="text" value={newArea} onChange={e => setNewArea(e.target.value)} className="input" placeholder="مثال: التجمع الخامس" />
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">نوع العقار</label>
                    <select value={newPropType} onChange={e => setNewPropType(e.target.value)} className="input">
                      <option value="">اختر النوع...</option>
                      {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                {/* Offering Details (Exact Location & Size) */}
                {isOffering && (
                  <div className="grid-4" style={{ marginBottom: 20 }}>
                    <div className="form-group">
                      <label className="form-label">رقم العمارة</label>
                      <input type="text" value={newBuildingNumber} onChange={e => setNewBuildingNumber(e.target.value)} className="input" placeholder="عمارة..." />
                    </div>
                    <div className="form-group">
                      <label className="form-label">رقم الوحدة</label>
                      <input type="text" value={newUnitNumber} onChange={e => setNewUnitNumber(e.target.value)} className="input" placeholder="وحدة..." />
                    </div>
                    <div className="form-group">
                      <label className="form-label">الدور</label>
                      <input type="text" value={newFloor} onChange={e => setNewFloor(e.target.value)} className="input" placeholder="الدور..." />
                    </div>
                    <div className="form-group">
                      <label className="form-label">المساحة (م²)</label>
                      <input type="number" value={newUnitSize} onChange={e => setNewUnitSize(e.target.value)} className="input" placeholder="0" />
                    </div>
                  </div>
                )}
                
                {/* Seeking Details (Desired Size & Floor) */}
                {isSeeking && (
                  <div className="grid-2" style={{ marginBottom: 20 }}>
                    <div className="form-group">
                      <label className="form-label">المساحة المطلوبة (م²)</label>
                      <input type="number" value={newUnitSize} onChange={e => setNewUnitSize(e.target.value)} className="input" placeholder="مثال: 150" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">الدور المفضل (اختياري)</label>
                      <input type="text" value={newFloor} onChange={e => setNewFloor(e.target.value)} className="input" placeholder="مثال: أرضي، أخير..." />
                    </div>
                  </div>
                )}

                {/* Dynamic Fields: FACTORIES */}
                {(newPropType === "مصنع" || newPropType === "أرض مصنع") && (
                  <div style={{ marginTop: 20, padding: 16, background: "rgba(212, 175, 55, 0.05)", borderRadius: 12, border: "1px dashed var(--gold-primary)" }}>
                    <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12, color: "var(--gold-primary)" }}>
                      🏭 تفاصيل {isSeeking ? "المصنع المطلوب" : "المصنع المتاح"}
                    </div>
                    <div className="grid-3">
                      <div className="form-group">
                        <label className="form-label">{isSeeking ? "مساحة المباني المطلوبة (م²)" : "مساحة المباني الفعلية (م²)"}</label>
                        <input type="number" className="input" value={newCustomData.factory_build_area || ""} onChange={e => setNewCustomData({...newCustomData, factory_build_area: e.target.value})} />
                      </div>
                      {isOffering && (
                        <div className="form-group">
                          <label className="form-label">عدد الأدوار</label>
                          <input type="number" className="input" value={newCustomData.factory_floors || ""} onChange={e => setNewCustomData({...newCustomData, factory_floors: e.target.value})} />
                        </div>
                      )}
                      <div className="form-group">
                        <label className="form-label">{isSeeking ? "النشاط الصناعي المرغوب" : "رخصة النشاط الحالي"}</label>
                        <select className="input" value={newCustomData.factory_activity || ""} onChange={e => setNewCustomData({...newCustomData, factory_activity: e.target.value})}>
                          <option value="">اختر النشاط...</option>
                          {FACTORY_ACTIVITIES.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Dynamic Fields: LANDS */}
                {(newPropType.includes("أرض")) && (
                  <div style={{ marginTop: 20, padding: 16, background: "rgba(0, 123, 255, 0.05)", borderRadius: 12, border: "1px dashed var(--accent-blue)" }}>
                    <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12, color: "var(--accent-blue)" }}>
                      🌱 تفاصيل الأرض
                    </div>
                    <div className="grid-3">
                      <div className="form-group">
                        <label className="form-label">{isSeeking ? "مساحة البناء المسموحة المطلوبة" : "مساحة البناء المسموحة (م²)"}</label>
                        <input type="number" className="input" value={newCustomData.land_build_area || ""} onChange={e => setNewCustomData({...newCustomData, land_build_area: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">{isSeeking ? "عدد الأدوار المطلوبة" : "عدد الأدوار في الرخصة"}</label>
                        <input type="number" className="input" value={newCustomData.land_license_floors || ""} onChange={e => setNewCustomData({...newCustomData, land_license_floors: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">{isSeeking ? "هل يشترط وجود مرافق؟" : "حالة المرافق"}</label>
                        <select className="input" value={newCustomData.land_is_serviced || ""} onChange={e => setNewCustomData({...newCustomData, land_is_serviced: e.target.value})}>
                          <option value="">اختر...</option>
                          <option value="مرفقة بالكامل">مرفقة بالكامل</option>
                          <option value="غير مرفقة">غير مرفقة</option>
                          <option value="جزئي">مرفقة جزئياً</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Dynamic Fields: APARTMENTS & VILLAS */}
                {(!newPropType.includes("مصنع") && !newPropType.includes("أرض")) && (
                  <div className="grid-3" style={{ marginTop: 20 }}>
                    <div className="form-group">
                      <label className="form-label">{isSeeking ? "عدد الغرف المطلوبة" : "عدد الغرف"}</label>
                      <input type="number" value={newBedrooms} onChange={e => setNewBedrooms(e.target.value)} className="input" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{isSeeking ? "عدد الحمامات المطلوبة" : "عدد الحمامات"}</label>
                      <input type="number" value={newBathrooms} onChange={e => setNewBathrooms(e.target.value)} className="input" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{isSeeking ? "مستوى التشطيب المطلوب" : "حالة التشطيب"}</label>
                      <select value={newFinishing} onChange={e => setNewFinishing(e.target.value)} className="input">
                        <option value="">اختر التشطيب...</option>
                        <option value="خام">خام</option>
                        <option value="نصف تشطيب">نصف تشطيب</option>
                        <option value="تشطيب كامل">تشطيب كامل</option>
                        <option value="سوبر لوكس">سوبر لوكس</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Financials & Operations */}
              <div style={{ marginBottom: 30 }}>
                <h3 style={{ fontSize: 16, fontWeight: 900, marginBottom: 16, color: "var(--accent-green)" }}>
                  {isSeeking ? "💰 البيانات المالية والمتطلبات" : "💰 البيانات المالية والأوراق"}
                </h3>
                
                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label">{isSeeking ? "الميزانية المتاحة" : "السعر المطلوب (كاش/إجمالي)"}</label>
                    <input type="number" value={newAskingPrice} onChange={e => setNewAskingPrice(e.target.value)} className="input" placeholder="0.00" />
                  </div>
                  
                  {isSeeking && (
                    <div className="form-group">
                      <label className="form-label">نظام الدفع المفضل</label>
                      <select value={newPaymentMethod} onChange={e => setNewPaymentMethod(e.target.value)} className="input">
                        <option value="">اختر النظام...</option>
                        <option value="CASH">كاش فقط</option>
                        <option value="INSTALLMENTS">تقسيط</option>
                        <option value="ANY">لا يهم (حسب العرض)</option>
                      </select>
                    </div>
                  )}

                  {(newStatus === "RENTER" || newStatus === "LANDLORD") && (
                    <div className="form-group">
                      <label className="form-label">{isSeeking ? "مدة الإيجار المطلوبة" : "مدة الإيجار المتاحة"}</label>
                      <input type="text" value={newLeaseDuration} onChange={e => setNewLeaseDuration(e.target.value)} className="input" placeholder="مثال: سنتين، 6 أشهر..." />
                    </div>
                  )}

                  {isOffering && newStatus !== "LANDLORD" && (
                    <>
                      <div className="form-group">
                        <label className="form-label">مبلغ القسط</label>
                        <input type="number" value={newInstallmentAmt} onChange={e => setNewInstallmentAmt(e.target.value)} className="input" placeholder="0.00" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">عدد الأقساط المتبقية</label>
                        <input type="number" value={newInstallmentRem} onChange={e => setNewInstallmentRem(e.target.value)} className="input" placeholder="0" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">حالة الأوراق (القانونية)</label>
                        <select value={newPaperworkStatus} onChange={e => setNewPaperworkStatus(e.target.value)} className="input">
                          <option value="">اختر الحالة...</option>
                          <option value="جاهزة للتنازل">جاهزة للتنازل</option>
                          <option value="عليها أقساط">عليها أقساط</option>
                          <option value="مسجلة شهر عقاري">مسجلة شهر عقاري</option>
                          <option value="صحة توقيع">صحة توقيع</option>
                          <option value="توكيل بالبيع">توكيل بالبيع</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
                
                {/* Textareas for specifics */}
                {isOffering && newStatus !== "LANDLORD" && (
                  <div className="form-group" style={{ marginTop: 12 }}>
                    <label className="form-label">تفاصيل الأقساط (نظام الدفع المتاح)</label>
                    <textarea value={newInstallmentDet} onChange={e => setNewInstallmentDet(e.target.value)} className="input" rows={2} placeholder="مثال: ربع سنوي، كل 3 شهور..." />
                  </div>
                )}
                {isSeeking && (
                  <div className="form-group" style={{ marginTop: 12 }}>
                    <label className="form-label">متطلبات أخرى (نظام الدفع، تفاصيل الوحدة)</label>
                    <textarea value={newPreferencesSummary} onChange={e => setNewPreferencesSummary(e.target.value)} className="input" rows={2} placeholder="اكتب أي متطلبات إضافية يطلبها العميل هنا..." />
                  </div>
                )}
              </div>

              {/* Section 4: Custom Fields */}
              <DynamicFields 
                entityType="CUSTOMER" 
                definitions={customFieldDefs} 
                values={newCustomData} 
                onChange={(name, val) => setNewCustomData({...newCustomData, [name]: val})} 
              />

              <div style={{ display: "flex", gap: 12, marginTop: 30, flexWrap: "wrap" }}>
                <button 
                  type="button" 
                  onClick={(e) => handleManualAdd(e as any, true)} 
                  disabled={loading} 
                  className="btn btn-secondary" 
                  style={{ flex: 1, height: 48, fontSize: 14 }}
                >
                  ➕ حفظ وإضافة وحدة أخرى
                </button>
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="btn btn-primary" 
                  style={{ flex: 2, height: 48, fontSize: 16 }}
                >
                  {loading ? "جاري الحفظ..." : "💾 حفظ وإنهاء"}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)} 
                  className="btn btn-ghost" 
                  style={{ flex: 1, height: 48 }}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════ Import Excel Modal ════════════════════════════════════════ */}
      {showImportModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-in" style={{ maxWidth: 980, width: "96%" }}>
            <div className="modal-header">
              <div style={{ fontWeight: 900, fontSize: 18 }}>📤 استيراد بيانات عملاء من Excel</div>
              <button onClick={() => setShowImportModal(false)} className="btn-close">✕</button>
            </div>

            <div style={{ padding: 28 }}>

              {/* Step 1: Download template */}
              <div style={{
                display: "flex", alignItems: "center", gap: 16,
                padding: 16, marginBottom: 24,
                background: "rgba(0,123,255,0.06)",
                borderRadius: 12, border: "1px dashed var(--accent-blue)"
              }}>
                <div style={{ fontSize: 32 }}>📄</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>الخطوة الأولى: حمّل النموذج الفارغ</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    النموذج يحتوي على الأعمدة: الاسم، رقم الهاتف، الرقم القومي، رقم الوحدة، رقم العمارة، المشروع، المنطقة، الدور، تاريخ استلام الوحدة
                  </div>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="btn btn-secondary"
                  style={{ whiteSpace: "nowrap", border: "1px solid var(--accent-blue)", color: "var(--accent-blue)" }}
                >
                  ⬇️ تحميل النموذج
                </button>
              </div>

              {/* Step 2: Upload filled file */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>الخطوة الثانية: ارفع الملف بعد ملئه</div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "end" }}>
                  <div className="form-group" style={{ flex: 1, minWidth: 220 }}>
                    <label className="form-label">اختر مشروعاً (اختياري — يطغى على عمود المشروع في الملف)</label>
                    <select
                      value={importProject}
                      onChange={e => setImportProject(e.target.value)}
                      className="input"
                    >
                      <option value="">بدون مشروع محدد</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1, minWidth: 220 }}>
                    <label className="form-label">ارفع ملف Excel (.xlsx / .xls)</label>
                    <label
                      htmlFor="excel-upload-input"
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center",
                        gap: 10, height: 44, borderRadius: 10,
                        border: "2px dashed var(--gold-primary)",
                        color: "var(--gold-primary)", fontWeight: 700, fontSize: 14,
                        cursor: "pointer", background: "rgba(212,175,55,0.06)",
                        transition: "all 0.2s"
                      }}
                    >
                      📂 اختر الملف
                    </label>
                    <input
                      id="excel-upload-input"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                      style={{ display: "none" }}
                    />
                  </div>
                </div>
              </div>

              {/* Status message */}
              {importStatus && (
                <div style={{
                  padding: "10px 16px", borderRadius: 8, marginBottom: 16,
                  background: importStatus.startsWith("❌") || importStatus.startsWith("⚠️")
                    ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
                  border: importStatus.startsWith("❌") || importStatus.startsWith("⚠️")
                    ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(34,197,94,0.3)",
                  fontWeight: 700, fontSize: 13
                }}>
                  {importStatus}
                </div>
              )}

              {/* Preview table */}
              {importRows.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>
                    👁️ معاينة البيانات ({importRows.length} سجل)
                  </div>
                  <div style={{ overflowX: "auto", maxHeight: 340, overflowY: "auto", borderRadius: 10, border: "1px solid var(--border)" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: "rgba(255,255,255,0.05)", position: "sticky", top: 0 }}>
                          {["#","الاسم","الهاتف","الرقم القومي","رقم الوحدة","رقم العمارة","المشروع","المنطقة","الدور","تاريخ الاستلام"].map(h => (
                            <th key={h} style={{ padding: "10px 10px", textAlign: "right", fontWeight: 800, borderBottom: "2px solid var(--border)", whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importRows.slice(0, 100).map((row, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid var(--border-subtle)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                            <td style={{ padding: "8px 10px", color: "var(--text-muted)", fontWeight: 700 }}>{i + 1}</td>
                            <td style={{ padding: "8px 10px", fontWeight: 800, color: "var(--gold-primary)" }}>{row.name || "—"}</td>
                            <td style={{ padding: "8px 10px", direction: "ltr" }}>{row.phone || "—"}</td>
                            <td style={{ padding: "8px 10px" }}>{row.nationalId || "—"}</td>
                            <td style={{ padding: "8px 10px" }}>{row.unitNumber || "—"}</td>
                            <td style={{ padding: "8px 10px" }}>{row.buildingNumber || "—"}</td>
                            <td style={{ padding: "8px 10px" }}>{row.projectName || "—"}</td>
                            <td style={{ padding: "8px 10px" }}>{row.area || "—"}</td>
                            <td style={{ padding: "8px 10px" }}>{row.floor || "—"}</td>
                            <td style={{ padding: "8px 10px" }}>{row.deliveryDate || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importRows.length > 100 && (
                      <div style={{ padding: 10, textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
                        يتم عرض أول 100 سجل فقط. الإجمالي: {importRows.length}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="btn btn-ghost"
                  style={{ minWidth: 100 }}
                >
                  إلغاء
                </button>
                <button
                  onClick={handleImport}
                  disabled={importRows.length === 0 || importLoading}
                  className="btn btn-primary"
                  style={{ minWidth: 180, fontSize: 15 }}
                >
                  {importLoading
                    ? "جاري الاستيراد..."
                    : `📥 استيراد ${importRows.length > 0 ? importRows.length + " سجل" : ""} كبائع محتمل`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
