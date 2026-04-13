import { useState, useRef } from "react";
import { Contact, ContactType } from "../App";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Search, Plus, Edit, Trash2, Upload, Download, X, CheckCircle, AlertTriangle, FileText } from "lucide-react";

interface ContactManagerProps {
  contacts: Contact[];
  onAddContact: () => void;
  onEditContact: (contact: Contact) => void;
  onDeleteContact: (id: string) => void;
  onBulkImportContacts?: (contacts: Partial<Contact>[]) => void;
}

const contactTypeColors: Record<ContactType, string> = {
  Broker: "bg-blue-50 text-blue-700 border-blue-200",
  "Producing Broker": "bg-cyan-50 text-cyan-700 border-cyan-200",
  Underwriter: "bg-purple-50 text-purple-700 border-purple-200",
  Insured: "bg-green-50 text-green-700 border-green-200",
  Cedent: "bg-orange-50 text-orange-700 border-orange-200",
};

// Expected CSV columns for Insured upload
const INSURED_CSV_HEADERS = [
  "Insured Name",
  "Email",
  "Phone",
  "Address",
  "City",
  "Country",
  "Postal Code",
];

const INSURED_EXAMPLE_CSV = `Insured Name,Email,Phone,Address,City,Country,Postal Code
Singapore Airlines Ltd,risk@singaporeair.com,+65 6541 5000,Airline House 25 Airline Road,Singapore,Singapore,819829
Qantas Airways,underwriting@qantas.com.au,+61 2 9691 3636,10 Bourke Road,Sydney,Australia,2020
Cathay Pacific Airways,risk.management@cathaypacific.com,+852 2747 5000,Cathay City 8 Scenic Road,Hong Kong,Hong Kong,`;

interface ParsedInsuredRow {
  insuredName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  postalCode: string;
  rowNum: number;
  error?: string;
}

export function ContactManager({
  contacts,
  onAddContact,
  onEditContact,
  onDeleteContact,
  onBulkImportContacts,
}: ContactManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<ContactType | "all">("all");
  const [confirmDeleteContact, setConfirmDeleteContact] = useState<Contact | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  // Bulk upload state
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedInsuredRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importCount, setImportCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.insuredName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.cedentName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = filterType === "all" || contact.type === filterType;

    return matchesSearch && matchesType;
  });

  const handleDeleteContact = () => {
    if (confirmDeleteContact && deleteConfirmationText === "DELETE CONTACT") {
      onDeleteContact(confirmDeleteContact.id);
      setConfirmDeleteContact(null);
      setDeleteConfirmationText("");
    }
  };

  const handleCancelDelete = () => {
    setConfirmDeleteContact(null);
    setDeleteConfirmationText("");
  };

  // ── Bulk Upload Logic ──

  const handleBulkUploadClose = () => {
    setShowBulkUpload(false);
    setCsvText("");
    setParsedRows([]);
    setParseErrors([]);
    setImportSuccess(false);
    setImportCount(0);
  };

  const parseInsuredCsv = (csv: string) => {
    const trimmed = csv.trim();
    if (!trimmed) {
      setParsedRows([]);
      setParseErrors([]);
      return;
    }

    const lines = trimmed.split("\n");
    if (lines.length < 2) {
      setParsedRows([]);
      setParseErrors(["CSV must contain a header row and at least one data row."]);
      return;
    }

    // Parse header row
    const headerLine = lines[0];
    const headers = headerLine.split(",").map((h) => h.trim().toLowerCase());

    // Map expected headers
    const colMap: Record<string, number> = {};
    const expectedMap: Record<string, string[]> = {
      insuredName: ["insured name", "insured", "name", "company", "company name"],
      email: ["email", "email address", "e-mail"],
      phone: ["phone", "telephone", "tel", "phone number"],
      address: ["address", "street address"],
      city: ["city"],
      country: ["country"],
      postalCode: ["postal code", "zip code", "zip", "postcode"],
    };

    for (const [field, aliases] of Object.entries(expectedMap)) {
      const idx = headers.findIndex((h) => aliases.includes(h));
      if (idx >= 0) colMap[field] = idx;
    }

    const errors: string[] = [];
    const parsed: ParsedInsuredRow[] = [];

    // Validate required columns found
    if (colMap.insuredName === undefined) {
      setParseErrors(["Missing required column: Insured Name"]);
      setParsedRows([]);
      return;
    }

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const vals = line.split(",").map((v) => v.trim());
      const row: ParsedInsuredRow = {
        insuredName: vals[colMap.insuredName] || "",
        email: colMap.email !== undefined ? vals[colMap.email] || "" : "",
        phone: colMap.phone !== undefined ? vals[colMap.phone] || "" : "",
        address: colMap.address !== undefined ? vals[colMap.address] || "" : "",
        city: colMap.city !== undefined ? vals[colMap.city] || "" : "",
        country: colMap.country !== undefined ? vals[colMap.country] || "" : "",
        postalCode: colMap.postalCode !== undefined ? vals[colMap.postalCode] || "" : "",
        rowNum: i + 1,
      };

      // Validation
      const rowErrors: string[] = [];
      if (!row.insuredName) rowErrors.push("Insured Name is required");
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) rowErrors.push("Invalid email format");

      // Check for duplicate insured name within existing contacts
      if (row.insuredName) {
        const existingDupe = contacts.find(
          (c) => c.insuredName?.toLowerCase() === row.insuredName.toLowerCase() && c.type === "Insured"
        );
        if (existingDupe) {
          rowErrors.push(`Duplicate: "${row.insuredName}" already exists as an Insured`);
        }
      }

      // Check for duplicate within the current batch
      const batchDupe = parsed.find(
        (p) => !p.error && p.insuredName.toLowerCase() === row.insuredName.toLowerCase()
      );
      if (batchDupe) {
        rowErrors.push(`Duplicate in CSV: "${row.insuredName}" appears on row ${batchDupe.rowNum}`);
      }

      if (rowErrors.length > 0) {
        row.error = rowErrors.join("; ");
        errors.push(`Row ${row.rowNum}: ${row.error}`);
      }

      parsed.push(row);
    }

    setParsedRows(parsed);
    setParseErrors(errors);
  };

  const handleCsvTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCsvText(val);
    setImportSuccess(false);
    parseInsuredCsv(val);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      setImportSuccess(false);
      parseInsuredCsv(text);
    };
    reader.readAsText(file);
    // Reset the input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleLoadExample = () => {
    setCsvText(INSURED_EXAMPLE_CSV);
    setImportSuccess(false);
    parseInsuredCsv(INSURED_EXAMPLE_CSV);
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([INSURED_CSV_HEADERS.join(",") + "\n"], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "insureds_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const validRows = parsedRows.filter((r) => !r.error);
  const errorRows = parsedRows.filter((r) => r.error);

  const handleImportContacts = () => {
    if (!onBulkImportContacts || validRows.length === 0) return;

    const contactsToImport: Partial<Contact>[] = validRows.map((row) => ({
      insuredName: row.insuredName,
      firstName: "",
      lastName: "",
      email: row.email,
      phone: row.phone,
      company: "",
      role: "",
      type: "Insured" as ContactType,
      address: row.address || undefined,
      city: row.city || undefined,
      country: row.country || undefined,
      postalCode: row.postalCode || undefined,
    }));

    onBulkImportContacts(contactsToImport);
    setImportCount(contactsToImport.length);
    setImportSuccess(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light text-slate-900 mb-2">Contact Manager</h1>
          <p className="text-slate-500 text-sm font-normal">Manage brokers, underwriters, insureds, and other contacts</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={onAddContact}
            className="bg-blue-500 hover:bg-blue-600 text-white font-normal px-8 py-5 text-sm rounded-xl transition-all duration-200"
          >
            <Plus className="size-4 mr-2" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-6 gap-6">
        <button
          onClick={() => setFilterType(filterType === "Broker" ? "all" : "Broker")}
          className={`bg-white border rounded-xl px-6 py-4 shadow-sm text-left transition-all duration-150 cursor-pointer ${filterType === "Broker" ? "border-blue-500 ring-2 ring-blue-200" : "border-blue-200 hover:border-blue-300"}`}
        >
          <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Brokers</div>
          <div className="text-2xl font-light text-gray-900">
            {contacts.filter((c) => c.type === "Broker").length}
          </div>
        </button>
        <button
          onClick={() => setFilterType(filterType === "Producing Broker" ? "all" : "Producing Broker")}
          className={`bg-white border rounded-xl px-6 py-4 shadow-sm text-left transition-all duration-150 cursor-pointer ${filterType === "Producing Broker" ? "border-cyan-500 ring-2 ring-cyan-200" : "border-cyan-200 hover:border-cyan-300"}`}
        >
          <div className="text-xs font-semibold text-cyan-600 uppercase tracking-wider mb-1">Producing Brokers</div>
          <div className="text-2xl font-light text-gray-900">
            {contacts.filter((c) => c.type === "Producing Broker").length}
          </div>
        </button>
        <button
          onClick={() => setFilterType(filterType === "Underwriter" ? "all" : "Underwriter")}
          className={`bg-white border rounded-xl px-6 py-4 shadow-sm text-left transition-all duration-150 cursor-pointer ${filterType === "Underwriter" ? "border-purple-500 ring-2 ring-purple-200" : "border-purple-200 hover:border-purple-300"}`}
        >
          <div className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-1">Underwriters</div>
          <div className="text-2xl font-light text-gray-900">
            {contacts.filter((c) => c.type === "Underwriter").length}
          </div>
        </button>
        <button
          onClick={() => setFilterType(filterType === "Insured" ? "all" : "Insured")}
          className={`bg-white border rounded-xl px-6 py-4 shadow-sm text-left transition-all duration-150 cursor-pointer ${filterType === "Insured" ? "border-green-500 ring-2 ring-green-200" : "border-green-200 hover:border-green-300"}`}
        >
          <div className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-1">Insureds</div>
          <div className="text-2xl font-light text-gray-900">
            {contacts.filter((c) => c.type === "Insured").length}
          </div>
        </button>
        <button
          onClick={() => setFilterType(filterType === "Cedent" ? "all" : "Cedent")}
          className={`bg-white border rounded-xl px-6 py-4 shadow-sm text-left transition-all duration-150 cursor-pointer ${filterType === "Cedent" ? "border-orange-500 ring-2 ring-orange-200" : "border-orange-200 hover:border-orange-300"}`}
        >
          <div className="text-xs font-semibold text-orange-600 uppercase tracking-wider mb-1">Cedents</div>
          <div className="text-2xl font-light text-gray-900">
            {contacts.filter((c) => c.type === "Cedent").length}
          </div>
        </button>
        <button
          onClick={() => setFilterType("all")}
          className={`bg-white border rounded-xl px-6 py-4 shadow-sm text-left transition-all duration-150 cursor-pointer ${filterType === "all" ? "border-gray-400 ring-2 ring-gray-200" : "border-gray-200 hover:border-gray-300"}`}
        >
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Total Contacts</div>
          <div className="text-2xl font-light text-gray-900">{contacts.length}</div>
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Input
            placeholder="Search by name, email, or company..."
            className="bg-white border-slate-100 text-slate-900 placeholder:text-slate-400 pl-5 pr-12 py-6 rounded-xl focus:border-slate-200 font-normal"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 size-5 text-slate-300" />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as ContactType | "all")}
          className="bg-white border border-slate-100 text-slate-900 px-5 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 text-sm font-normal"
        >
          <option value="all">All Types</option>
          <option value="Broker">Broker</option>
          <option value="Producing Broker">Producing Broker</option>
          <option value="Underwriter">Underwriter</option>
          <option value="Insured">Insured</option>
          <option value="Cedent">Cedent</option>
        </select>
      </div>

      {/* Contacts Table */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-2 text-[11px] font-medium text-slate-400 tracking-wide uppercase">
                  Company
                </th>
                <th className="text-left px-5 py-2 text-[11px] font-medium text-slate-400 tracking-wide uppercase">
                  Name
                </th>
                <th className="text-left px-5 py-2 text-[11px] font-medium text-slate-400 tracking-wide uppercase">
                  Email
                </th>
                <th className="text-left px-5 py-2 text-[11px] font-medium text-slate-400 tracking-wide uppercase">
                  Type
                </th>
                <th className="text-right px-5 py-2 text-[11px] font-medium text-slate-400 tracking-wide uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-400 font-normal">
                    No contacts found. Click "Add Contact" to create one.
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-5 py-2">
                      <div className="text-slate-900 text-sm font-normal">
                        {contact.type === "Insured" && contact.insuredName
                          ? contact.insuredName
                          : contact.type === "Cedent" && contact.cedentName
                          ? contact.cedentName
                          : contact.company || <span className="text-slate-400 italic">No company</span>
                        }
                      </div>
                    </td>
                    <td className="px-5 py-2">
                      <div className="text-slate-900 font-medium text-sm">
                        {contact.type === "Insured"
                          ? <span className="text-slate-400">N/A</span>
                          : contact.type === "Cedent"
                          ? <span className="text-slate-400">N/A</span>
                          : contact.firstName || contact.lastName 
                          ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
                          : <span className="text-slate-400 italic">No name</span>
                        }
                      </div>
                    </td>
                    <td className="px-5 py-2">
                      <div className="text-slate-500 text-sm font-normal">
                        {contact.type === "Cedent" || contact.type === "Insured"
                          ? <span className="text-slate-400">N/A</span>
                          : contact.email || <span className="text-slate-400 italic">No email</span>
                        }
                      </div>
                    </td>
                    <td className="px-5 py-2">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-lg text-[11px] font-medium border ${
                          contactTypeColors[contact.type]
                        }`}
                      >
                        {contact.type}
                      </span>
                    </td>
                    <td className="px-5 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEditContact(contact)}
                          className="p-2 text-slate-300 hover:text-orange-500 hover:bg-orange-50/50 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit className="size-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteContact(contact)}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50/50 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDeleteContact && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <Trash2 className="size-6 text-red-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900">Delete Contact</h2>
            </div>
            <p className="text-gray-700 mb-2">
              Are you sure you want to delete the following contact?
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <div className="text-gray-900 font-semibold mb-1">
                {confirmDeleteContact.type === "Cedent" && confirmDeleteContact.cedentName
                  ? confirmDeleteContact.cedentName
                  : confirmDeleteContact.type === "Insured" && confirmDeleteContact.insuredName
                  ? confirmDeleteContact.insuredName
                  : `${confirmDeleteContact.firstName} ${confirmDeleteContact.lastName}`}
              </div>
              <div className="text-sm text-gray-600">
                {confirmDeleteContact.type === "Cedent" || confirmDeleteContact.type === "Insured" ? "Name: N/A" : `Email: ${confirmDeleteContact.email}`}
              </div>
              <div className="text-sm text-gray-600">
                {confirmDeleteContact.type === "Cedent" || confirmDeleteContact.type === "Insured" ? "Email: N/A" : `Company: ${confirmDeleteContact.company}`}
              </div>
            </div>
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              This action cannot be undone. All contact information will be permanently deleted.
            </p>
            <div className="mb-6">
              <label className="block text-sm text-gray-700 mb-2">
                Type <span className="font-semibold text-gray-900">DELETE CONTACT</span> to confirm:
              </label>
              <Input
                placeholder="DELETE CONTACT"
                className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 px-4 py-3 rounded-lg shadow-sm focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                onClick={handleCancelDelete}
                className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium px-6 py-3 rounded-lg transition-all"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteContact}
                disabled={deleteConfirmationText !== "DELETE CONTACT"}
                className={`font-semibold px-6 py-3 rounded-lg shadow-lg transition-all ${
                  deleteConfirmationText === "DELETE CONTACT"
                    ? "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-red-200 hover:shadow-xl hover:shadow-red-300"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed opacity-50"
                }`}
              >
                <Trash2 className="size-4 mr-2" />
                Delete Contact
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Upload Insureds Modal ── */}
      {showBulkUpload && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 pb-0">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Upload className="size-6 text-green-700" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Bulk Upload Insureds</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Import multiple Insured contacts from CSV</p>
                </div>
              </div>
              <button
                onClick={handleBulkUploadClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Body - scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Success state */}
              {importSuccess ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
                    <CheckCircle className="size-8 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Import Complete</h3>
                  <p className="text-gray-600 mb-6">
                    Successfully imported <span className="font-semibold text-green-700">{importCount}</span> Insured{importCount !== 1 ? "s" : ""} into the system.
                  </p>
                  <Button
                    onClick={handleBulkUploadClose}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium px-8 py-3 rounded-xl transition-all"
                  >
                    Done
                  </Button>
                </div>
              ) : (
                <>
                  {/* CSV Format Help */}
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <FileText className="size-5 text-green-600 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-800 mb-1">Required CSV Format (7 columns)</p>
                        <p className="text-xs text-green-700 mb-2">
                          Columns: <span className="font-mono bg-green-100 px-1 rounded">Insured Name</span>,{" "}
                          <span className="font-mono bg-green-100 px-1 rounded">Email</span>,{" "}
                          <span className="font-mono bg-green-100 px-1 rounded">Phone</span>,{" "}
                          <span className="font-mono bg-green-100 px-1 rounded">Address</span>,{" "}
                          <span className="font-mono bg-green-100 px-1 rounded">City</span>,{" "}
                          <span className="font-mono bg-green-100 px-1 rounded">Country</span>,{" "}
                          <span className="font-mono bg-green-100 px-1 rounded">Postal Code</span>
                        </p>
                        <p className="text-xs text-green-600">
                          Insured Name is required. All other fields are optional.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 ml-8">
                      <button
                        onClick={handleDownloadTemplate}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-white border border-green-300 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-all"
                      >
                        <Download className="size-3.5" />
                        Download Template
                      </button>
                      <button
                        onClick={handleLoadExample}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-white border border-green-300 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-all"
                      >
                        <FileText className="size-3.5" />
                        Load Example Data
                      </button>
                    </div>
                  </div>

                  {/* File Upload + Paste */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Upload CSV File</label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.txt"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-green-400 hover:bg-green-50/30 transition-all group"
                      >
                        <Upload className="size-8 text-gray-300 group-hover:text-green-600 mx-auto mb-2 transition-colors" />
                        <p className="text-sm text-gray-500 group-hover:text-green-700">Click to select a CSV file</p>
                      </button>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Or Paste CSV Data
                      </label>
                      <textarea
                        placeholder={`Insured Name,Email,Phone,Address,City,Country,Postal Code\nSingapore Airlines Ltd,risk@singaporeair.com,+65 6541 5000,Airline House 25 Airline Road,Singapore,Singapore,819829`}
                        className="w-full h-[120px] bg-white border border-gray-200 text-gray-900 placeholder:text-gray-300 px-4 py-3 rounded-xl text-xs font-mono focus:border-green-400 focus:ring-2 focus:ring-green-400/20 resize-none"
                        value={csvText}
                        onChange={handleCsvTextChange}
                      />
                    </div>
                  </div>

                  {/* Parse Errors */}
                  {parseErrors.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="size-4 text-amber-600" />
                        <p className="text-sm font-medium text-amber-800">
                          {parseErrors.length} issue{parseErrors.length !== 1 ? "s" : ""} found
                        </p>
                      </div>
                      <div className="max-h-24 overflow-y-auto space-y-1">
                        {parseErrors.map((err, i) => (
                          <p key={i} className="text-xs text-amber-700">{err}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Preview Table */}
                  {parsedRows.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-gray-700">
                          Preview ({validRows.length} valid{errorRows.length > 0 ? `, ${errorRows.length} with errors` : ""})
                        </h3>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-medium border bg-green-50 text-green-700 border-green-200">
                          Insured
                        </span>
                      </div>
                      <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto max-h-60 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0">
                              <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-8">#</th>
                                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Insured Name</th>
                                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
                                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Address</th>
                                <th className="px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-16">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {parsedRows.map((row, i) => (
                                <tr
                                  key={i}
                                  className={`border-b border-gray-100 ${row.error ? "bg-red-50/50" : "hover:bg-gray-50/50"}`}
                                >
                                  <td className="px-4 py-2 text-xs text-gray-400">{i + 1}</td>
                                  <td className="px-4 py-2 text-gray-900 font-medium text-xs">{row.insuredName}</td>
                                  <td className="px-4 py-2 text-gray-500 text-xs">{row.email || <span className="text-gray-300">-</span>}</td>
                                  <td className="px-4 py-2 text-gray-500 text-xs">{row.phone || <span className="text-gray-300">-</span>}</td>
                                  <td className="px-4 py-2 text-gray-500 text-xs">
                                    {row.address || row.city || row.country
                                      ? [row.address, row.city, row.postalCode, row.country].filter(Boolean).join(", ")
                                      : <span className="text-gray-300">-</span>
                                    }
                                  </td>
                                  <td className="px-4 py-2 text-center">
                                    {row.error ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700" title={row.error}>
                                        Error
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700">
                                        OK
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            {!importSuccess && (
              <div className="flex items-center justify-between p-6 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  {parsedRows.length > 0
                    ? `${validRows.length} of ${parsedRows.length} rows ready to import`
                    : "Paste or upload CSV data to begin"}
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={handleBulkUploadClose}
                    className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium px-6 py-3 rounded-xl transition-all"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleImportContacts}
                    disabled={validRows.length === 0}
                    className={`font-semibold px-6 py-3 rounded-xl shadow-lg transition-all ${
                      validRows.length > 0
                        ? "bg-green-600 hover:bg-green-700 text-white shadow-green-200 hover:shadow-xl hover:shadow-green-300"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed opacity-50"
                    }`}
                  >
                    <Upload className="size-4 mr-2" />
                    Import {validRows.length > 0 ? `${validRows.length} ` : ""}Insured{validRows.length !== 1 ? "s" : ""}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}