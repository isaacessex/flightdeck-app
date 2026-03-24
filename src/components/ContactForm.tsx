import { useState } from "react";
import { Contact, ContactType } from "../App";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { X } from "lucide-react";

// Comprehensive list of countries
const countriesByRegion = {
  "Europe": [
    "Albania", "Andorra", "Austria", "Belgium", "Bosnia and Herzegovina", "Bulgaria", "Croatia",
    "Cyprus", "Czech Republic", "Denmark", "Estonia", "Finland", "France", "Germany", "Greece",
    "Hungary", "Iceland", "Ireland", "Italy", "Kosovo", "Latvia", "Liechtenstein", "Lithuania",
    "Luxembourg", "Malta", "Moldova", "Monaco", "Montenegro", "Netherlands", "North Macedonia",
    "Norway", "Poland", "Portugal", "Romania", "San Marino", "Serbia", "Slovakia", "Slovenia",
    "Spain", "Sweden", "Switzerland", "Ukraine", "United Kingdom", "Vatican City",
  ],
  "Middle East": [
    "Bahrain", "Iraq", "Israel", "Jordan", "Kuwait", "Lebanon", "Oman", "Palestine",
    "Qatar", "Saudi Arabia", "Turkey", "United Arab Emirates", "Yemen",
  ],
  "Africa": [
    "Algeria", "Angola", "Benin", "Botswana", "Burkina Faso", "Burundi", "Cameroon", "Cape Verde",
    "Central African Republic", "Chad", "Comoros", "Congo", "Democratic Republic of the Congo",
    "Djibouti", "Egypt", "Equatorial Guinea", "Eritrea", "Eswatini", "Ethiopia", "Gabon", "Gambia",
    "Ghana", "Guinea", "Guinea-Bissau", "Ivory Coast", "Kenya", "Lesotho", "Liberia", "Libya",
    "Madagascar", "Malawi", "Mali", "Mauritania", "Mauritius", "Morocco", "Mozambique", "Namibia",
    "Niger", "Nigeria", "Rwanda", "Sao Tome and Principe", "Senegal", "Seychelles", "Sierra Leone",
    "Somalia", "South Africa", "South Sudan", "Sudan", "Tanzania", "Togo", "Tunisia", "Uganda",
    "Zambia", "Zimbabwe",
  ],
  "Asia": [
    "Afghanistan", "Armenia", "Azerbaijan", "Bangladesh", "Bhutan", "Brunei",
    "Cambodia", "China", "Georgia", "Hong Kong", "India", "Indonesia", "Japan",
    "Kazakhstan", "Kyrgyzstan", "Laos", "Macau", "Malaysia", "Maldives", "Mongolia",
    "Nepal", "Pakistan", "Philippines", "Singapore", "South Korea", "Sri Lanka",
    "Taiwan", "Tajikistan", "Thailand", "Timor-Leste", "Turkmenistan", "Uzbekistan", "Vietnam",
  ],
  "North America": [
    "Antigua and Barbuda", "Bahamas", "Barbados", "Belize", "Canada", "Costa Rica", "Dominica",
    "Dominican Republic", "El Salvador", "Grenada", "Guatemala", "Haiti", "Honduras", "Jamaica",
    "Mexico", "Nicaragua", "Panama", "Saint Kitts and Nevis", "Saint Lucia",
    "Saint Vincent and the Grenadines", "Trinidad and Tobago", "United States",
  ],
  "South America": [
    "Argentina", "Bolivia", "Brazil", "Chile", "Colombia", "Ecuador", "Guyana", "Paraguay",
    "Peru", "Suriname", "Uruguay", "Venezuela",
  ],
  "Oceania": [
    "Australia", "Fiji", "Kiribati", "Marshall Islands", "Micronesia", "Nauru", "New Zealand",
    "Palau", "Papua New Guinea", "Samoa", "Solomon Islands", "Tonga", "Tuvalu", "Vanuatu",
  ],
};

const availableCountries = Object.values(countriesByRegion).flat().sort();

const BROKER_COMPANIES = [
  "Lockton Companies (Singapore) Pte Ltd",
  "Lockton Companies LLP",
  "Lockton Companies Australia",
  "Lockton Companies Inc",
];

interface ContactFormProps {
  contact?: Contact;
  contacts: Contact[]; // List of all contacts to populate broker contact dropdown
  onSave: (contact: Omit<Contact, "id" | "createdDate" | "lastModified">) => void;
  onCancel: () => void;
  initialInsuredName?: string; // Pre-fill insured name when adding from placement form
  initialCedentName?: string; // Pre-fill cedent name when adding from placement form
  initialType?: ContactType; // Pre-select contact type
}

export function ContactForm({ contact, contacts, onSave, onCancel, initialInsuredName, initialCedentName, initialType }: ContactFormProps) {
  const [firstName, setFirstName] = useState(contact?.firstName || "");
  const [lastName, setLastName] = useState(contact?.lastName || "");
  const [email, setEmail] = useState(contact?.email || "");
  const [company, setCompany] = useState(contact?.company || "");
  const [companySelectValue, setCompanySelectValue] = useState<string>(() => {
    if (!contact?.company) return "";
    return BROKER_COMPANIES.includes(contact.company) ? contact.company : "__other__";
  });
  const [role, setRole] = useState(contact?.role || "");
  const [type, setType] = useState<ContactType>(contact?.type || initialType || "Broker");
  const [insuredName, setInsuredName] = useState(contact?.insuredName || initialInsuredName || "");
  const [cedentName, setCedentName] = useState(contact?.cedentName || initialCedentName || "");
  const [address, setAddress] = useState(contact?.address || "");
  const [city, setCity] = useState(contact?.city || "");
  const [country, setCountry] = useState(contact?.country || "");
  const [postalCode, setPostalCode] = useState(contact?.postalCode || "");
  const [notes, setNotes] = useState(contact?.notes || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [permissions, setPermissions] = useState<string[]>(
    contact?.permissions || ["Broker"]
  );
  const [brokerContactId, setBrokerContactId] = useState(contact?.brokerContactId || "");
  const [ourCommission, setOurCommission] = useState(contact?.ourCommission?.toString() || "");
  const [producingBrokerCommission, setProducingBrokerCommission] = useState(
    contact?.producingBrokerCommission?.toString() || ""
  );
  const [passwordError, setPasswordError] = useState("");
  const [commissionError, setCommissionError] = useState("");
  const [confirmEmail, setConfirmEmail] = useState(contact?.email || "");
  const [emailError, setEmailError] = useState("");
  const [mobilePhone, setMobilePhone] = useState(contact?.mobilePhone || "");
  const [addressError, setAddressError] = useState("");
  
  // Filter broker contacts for dropdown
  const brokerContacts = contacts.filter((c) => c.type === "Broker");

  // Calculate total commission for Producing Broker
  const ourComm = parseFloat(ourCommission) || 0;
  const pbComm = parseFloat(producingBrokerCommission) || 0;
  const totalCommission = ourComm + pbComm;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email confirmation for Broker, Producing Broker, and Underwriter
    if ((type === "Broker" || type === "Producing Broker" || type === "Underwriter") && email !== confirmEmail) {
      setEmailError("Emails do not match");
      return;
    }
    
    // Validate passwords for Broker and Underwriter types
    if (type === "Broker" || type === "Underwriter") {
      if (!contact && !password) {
        setPasswordError(`Password is required for ${type} accounts`);
        return;
      }
      if (password && password !== confirmPassword) {
        setPasswordError("Passwords do not match");
        return;
      }
      if (password && password.length < 8) {
        setPasswordError("Password must be at least 8 characters");
        return;
      }
    }
    
    // Validate commissions for Producing Broker type
    if (type === "Producing Broker") {
      // Validate address fields are mandatory for Producing Broker
      const missingFields: string[] = [];
      if (!address.trim()) missingFields.push("Street Address");
      if (!city.trim()) missingFields.push("City");
      if (!country) missingFields.push("Country");
      if (!postalCode.trim()) missingFields.push("Postal Code");
      if (missingFields.length > 0) {
        setAddressError(`Required for Producing Broker: ${missingFields.join(", ")}`);
        return;
      }
      setAddressError("");

      if (!contact && !ourCommission) {
        setCommissionError("Our commission is required for Producing Broker accounts");
        return;
      }
      if (!contact && !producingBrokerCommission) {
        setCommissionError("Producing Broker commission is required for Producing Broker accounts");
        return;
      }
      if (ourCommission && parseFloat(ourCommission) < 0) {
        setCommissionError("Our commission must be a non-negative number");
        return;
      }
      if (producingBrokerCommission && parseFloat(producingBrokerCommission) < 0) {
        setCommissionError("Producing Broker commission must be a non-negative number");
        return;
      }
      // Validate that commissions add up to 100%
      if (totalCommission !== 100) {
        setCommissionError(`Commissions must add up to 100% (currently ${totalCommission.toFixed(2)}%)`);
        return;
      }
    }
    
    setPasswordError("");
    setCommissionError("");
    setEmailError("");
    
    onSave({
      firstName,
      lastName,
      email,
      phone: contact?.phone ?? "",
      company: type === "Broker"
        ? (companySelectValue === "__other__" ? company : companySelectValue) 
        : company,
      role,
      type,
      password: (type === "Broker" || type === "Underwriter") && password ? password : undefined,
      permissions: type === "Broker" ? permissions : undefined,
      address: type !== "Broker" && address ? address : undefined,
      city: type !== "Broker" && city ? city : undefined,
      country: type !== "Broker" && country ? country : undefined,
      postalCode: type !== "Broker" && postalCode ? postalCode : undefined,
      notes: type !== "Broker" && notes ? notes : undefined,
      brokerContactId: type !== "Broker" && brokerContactId ? brokerContactId : undefined,
      ourCommission: type === "Producing Broker" && ourCommission ? parseFloat(ourCommission) : undefined,
      producingBrokerCommission: type === "Producing Broker" && producingBrokerCommission ? parseFloat(producingBrokerCommission) : undefined,
      insuredName: type === "Insured" && insuredName ? insuredName : undefined,
      cedentName: type === "Cedent" && cedentName ? cedentName : undefined,
      mobilePhone: (type === "Broker" || type === "Underwriter") && mobilePhone ? mobilePhone : undefined,
    });
  };

  const togglePermission = (permission: string) => {
    if (permission === "Broker") return; // Broker is always included
    
    if (permissions.includes(permission)) {
      setPermissions(permissions.filter((p) => p !== permission));
    } else {
      setPermissions([...permissions, permission]);
    }
  };

  const inputClassName = "bg-white border-gray-300 text-gray-900 placeholder:text-gray-400";
  const labelClassName = "block text-sm font-medium text-gray-700 mb-2";
  const sectionClassName = "bg-gray-50 border border-gray-200 rounded-lg p-6";
  const headingClassName = "text-lg font-semibold text-gray-900 mb-4";

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              {contact ? "Edit Contact" : "Add New Contact"}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {contact ? "Update contact information" : "Enter contact details to add to your system"}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
          >
            <X className="size-6" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="px-8 py-6 space-y-6">
            {/* Contact Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Contact Type *
              </label>
              <div className="grid grid-cols-5 gap-3">
                {(["Broker", "Producing Broker", "Underwriter", "Insured", "Cedent"] as ContactType[]).map(
                  (contactType) => (
                    <button
                      key={contactType}
                      type="button"
                      onClick={() => setType(contactType)}
                      className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                        type === contactType
                          ? "bg-[#004225] border-[#004225] text-white"
                          : "bg-white border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                      }`}
                    >
                      {contactType}
                    </button>
                  )
                )}
              </div>
              {type === "Broker" && (
                <p className="text-xs text-gray-500 mt-2">
                  Can log in to submit risks
                </p>
              )}
              {type === "Underwriter" && (
                <p className="text-xs text-gray-500 mt-2">
                  Can log in to quote on risks and receives email notifications
                </p>
              )}
              {type === "Producing Broker" && (
                <p className="text-xs text-gray-500 mt-2">
                  Saved for Producing Broker section of submission forms
                </p>
              )}
              {type === "Insured" && (
                <p className="text-xs text-gray-500 mt-2">
                  Saved for Insured section of submission forms
                </p>
              )}
              {type === "Cedent" && (
                <p className="text-xs text-gray-500 mt-2">
                  Saved for Reinsured/Cedent section of submission forms
                </p>
              )}
            </div>

            {/* Producing Broker - Company Information */}
            {type === "Producing Broker" && (
              <div className={sectionClassName}>
                <h3 className={headingClassName}>Company Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className={labelClassName}>Company Name *</label>
                    <Input
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="e.g., ABC Aviation Brokers"
                      required
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className={labelClassName}>Street Address *</label>
                    <Input
                      value={address}
                      onChange={(e) => {
                        setAddress(e.target.value);
                        setAddressError("");
                      }}
                      placeholder="e.g., Level 23A, Menara 3 Petronas"
                      required
                      className={inputClassName}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClassName}>City *</label>
                      <Input
                        value={city}
                        onChange={(e) => {
                          setCity(e.target.value);
                          setAddressError("");
                        }}
                        placeholder="e.g., Kuala Lumpur"
                        required
                        className={inputClassName}
                      />
                    </div>
                    <div>
                      <label className={labelClassName}>Country *</label>
                      <select
                        value={country}
                        onChange={(e) => {
                          setCountry(e.target.value);
                          setAddressError("");
                        }}
                        required
                        className="w-full bg-white border border-gray-300 text-gray-900 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004225]/50"
                      >
                        <option value="">-- Select Country --</option>
                        {availableCountries.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={labelClassName}>Postal Code *</label>
                    <Input
                      value={postalCode}
                      onChange={(e) => {
                        setPostalCode(e.target.value);
                        setAddressError("");
                      }}
                      placeholder="e.g., 50088"
                      required
                      className={inputClassName}
                    />
                  </div>
                </div>
                {addressError && (
                  <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2 mt-4">
                    {addressError}
                  </div>
                )}
              </div>
            )}

            {/* Producing Broker - Contact Information */}
            {type === "Producing Broker" && (
              <div className={sectionClassName}>
                <h3 className={headingClassName}>Contact Information</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClassName}>First Name *</label>
                      <Input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="e.g., Sarah"
                        required
                        className={inputClassName}
                      />
                    </div>
                    <div>
                      <label className={labelClassName}>Last Name *</label>
                      <Input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="e.g., Thompson"
                        required
                        className={inputClassName}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClassName}>Email *</label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setEmailError("");
                        }}
                        placeholder="e.g., sarah.thompson@company.com"
                        required
                        className={inputClassName}
                      />
                    </div>
                    <div>
                      <label className={labelClassName}>Re-Confirm Email *</label>
                      <Input
                        type="email"
                        value={confirmEmail}
                        onChange={(e) => {
                          setConfirmEmail(e.target.value);
                          setEmailError("");
                        }}
                        placeholder="e.g., sarah.thompson@company.com"
                        required
                        className={inputClassName}
                      />
                    </div>
                  </div>
                </div>
                {emailError && (
                  <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                    {emailError}
                  </div>
                )}
              </div>
            )}

            {/* Basic Information (Broker/Underwriter) */}
            {type !== "Insured" && type !== "Cedent" && type !== "Producing Broker" && (
              <div className={sectionClassName}>
                <h3 className={headingClassName}>Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClassName}>First Name *</label>
                    <Input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g., Sarah"
                      required
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className={labelClassName}>Last Name *</label>
                    <Input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g., Thompson"
                      required
                      className={inputClassName}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Insured Name */}
            {type === "Insured" && (
              <div className={sectionClassName}>
                <h3 className={headingClassName}>Basic Information</h3>
                <div>
                  <label className={labelClassName}>Insured Name *</label>
                  <Input
                    value={insuredName}
                    onChange={(e) => setInsuredName(e.target.value)}
                    placeholder="e.g., Air Kaya Toast"
                    required
                    className={inputClassName}
                  />
                </div>
              </div>
            )}

            {/* Cedent Name */}
            {type === "Cedent" && (
              <div className={sectionClassName}>
                <h3 className={headingClassName}>Basic Information</h3>
                <div>
                  <label className={labelClassName}>Cedent Name *</label>
                  <Input
                    value={cedentName}
                    onChange={(e) => setCedentName(e.target.value)}
                    placeholder="e.g., Munich Re Asia"
                    required
                    className={inputClassName}
                  />
                </div>
              </div>
            )}

            {/* Contact Details (Broker/Underwriter) */}
            {type !== "Insured" && type !== "Cedent" && type !== "Producing Broker" && (
              <div className={sectionClassName}>
                <h3 className={headingClassName}>Contact Details</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClassName}>Email *</label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setEmailError("");
                        }}
                        placeholder="e.g., sarah.thompson@company.com"
                        required
                        className={inputClassName}
                      />
                    </div>
                    <div>
                      <label className={labelClassName}>Re-Confirm Email *</label>
                      <Input
                        type="email"
                        value={confirmEmail}
                        onChange={(e) => {
                          setConfirmEmail(e.target.value);
                          setEmailError("");
                        }}
                        placeholder="e.g., sarah.thompson@company.com"
                        required
                        className={inputClassName}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClassName}>Mobile Phone (inc. country code)</label>
                    <Input
                      type="tel"
                      value={mobilePhone}
                      onChange={(e) => setMobilePhone(e.target.value)}
                      placeholder="e.g., +44 7700 900123"
                      className={inputClassName}
                    />
                    <p className="text-xs text-gray-400 mt-1">Include country code, e.g. +44, +1, +60</p>
                  </div>
                </div>
                {emailError && (
                  <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                    {emailError}
                  </div>
                )}
              </div>
            )}

            {/* Company Information (Broker/Underwriter) */}
            {type !== "Insured" && type !== "Cedent" && type !== "Producing Broker" && (
              <div className={sectionClassName}>
                <h3 className={headingClassName}>Company Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className={labelClassName}>Company *</label>
                    {type === "Broker" ? (
                      <>
                        <select
                          value={companySelectValue}
                          onChange={(e) => {
                            setCompanySelectValue(e.target.value);
                            if (e.target.value === "__other__") {
                              setCompany("");
                            }
                          }}
                          required
                          className="w-full bg-white border border-gray-300 text-gray-900 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004225]/50"
                        >
                          <option value="">-- Select Company --</option>
                          {BROKER_COMPANIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                          <option value="__other__">Other</option>
                        </select>
                        {companySelectValue === "__other__" && (
                          <Input
                            value={company}
                            onChange={(e) => setCompany(e.target.value)}
                            placeholder="Enter company name"
                            required
                            className={`${inputClassName} mt-2`}
                          />
                        )}
                      </>
                    ) : (
                      <Input
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="e.g., Allianz Global Corporate & Specialty"
                        required
                        className={inputClassName}
                      />
                    )}
                  </div>
                  <div>
                    <label className={labelClassName}>Role/Title *</label>
                    <Input
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="e.g., Senior Aviation Broker"
                      required
                      className={inputClassName}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Broker Contact (Producing Broker) */}
            {type === "Producing Broker" && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-base font-semibold text-gray-900 mb-1">Broker Contact</h3>
                <p className="text-xs text-gray-500 mb-3">
                  Select a Broker who is responsible for this Producing Broker. They will receive email notifications when risks are submitted, quoted, declined, or bound.
                </p>
                <div>
                  <label className={labelClassName}>Responsible Broker (Optional)</label>
                  <select
                    value={brokerContactId}
                    onChange={(e) => setBrokerContactId(e.target.value)}
                    className="w-full bg-white border border-gray-300 text-gray-900 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004225]/50"
                  >
                    <option value="">-- Select a Broker (Optional) --</option>
                    {brokerContacts.map((broker) => (
                      <option key={broker.id} value={broker.id}>
                        {broker.firstName} {broker.lastName} - {broker.company}
                      </option>
                    ))}
                  </select>
                  {brokerContacts.length === 0 && (
                    <p className="text-xs text-amber-600 mt-2">
                      No Broker contacts available. Add a Broker contact first to assign one here.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Password Section (Broker/Underwriter) */}
            {(type === "Broker" || type === "Underwriter") && (
              <div className={sectionClassName}>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Password</h3>
                <p className="text-xs text-gray-500 mb-4">
                  {contact ? "Leave blank to keep existing password" : "Required for new broker accounts"}
                </p>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClassName}>Password {!contact && "*"}</label>
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setPasswordError("");
                        }}
                        placeholder="Enter password"
                        required={!contact}
                        className={inputClassName}
                      />
                    </div>
                    <div>
                      <label className={labelClassName}>Re-Confirm Password {!contact && "*"}</label>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setPasswordError("");
                        }}
                        placeholder="Re-enter password"
                        required={!contact}
                        className={inputClassName}
                      />
                    </div>
                  </div>
                  {passwordError && (
                    <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                      {passwordError}
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    Password must be at least 8 characters long
                  </p>
                </div>
              </div>
            )}

            {/* Special Permissions (Broker only) */}
            {type === "Broker" && (
              <div className={sectionClassName}>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Special Permissions</h3>
                <p className="text-xs text-gray-500 mb-4">
                  Broker permission is automatically granted. Select additional permissions:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {["Super-Admin", "Admin", "Senior", "Broker"].map((permission) => (
                    <button
                      key={permission}
                      type="button"
                      onClick={() => togglePermission(permission)}
                      disabled={permission === "Broker"}
                      className={`px-4 py-3 rounded-lg border-2 font-medium transition-all text-left ${
                        permissions.includes(permission)
                          ? "bg-[#004225] border-[#004225] text-white"
                          : "bg-white border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                      } ${permission === "Broker" ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{permission}</span>
                        {permissions.includes(permission) && (
                          <span className="text-xs">✓</span>
                        )}
                        {permission === "Broker" && (
                          <span className="text-xs text-gray-500">(Auto)</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Address (Insured/Cedent only) */}
            {(type === "Insured" || type === "Cedent") && (
              <div className={sectionClassName}>
                <h3 className={headingClassName}>Address (Optional)</h3>
                <div className="space-y-4">
                  <div>
                    <label className={labelClassName}>Street Address</label>
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder={
                        type === "Insured"
                          ? "e.g., Changi Business Park"
                          : "e.g., 50 Raffles Place"
                      }
                      className={inputClassName}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClassName}>City</label>
                      <Input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g., Singapore"
                        className={inputClassName}
                      />
                    </div>
                    <div>
                      <label className={labelClassName}>Country</label>
                      <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full bg-white border border-gray-300 text-gray-900 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004225]/50"
                      >
                        <option value="">-- Select Country --</option>
                        {availableCountries.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={labelClassName}>Postal Code</label>
                    <Input
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder={
                        type === "Insured"
                          ? "e.g., 486039"
                          : "e.g., 048623"
                      }
                      className={inputClassName}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Commissions (Producing Broker) */}
            {type === "Producing Broker" && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-base font-semibold text-gray-900 mb-1">Commissions</h3>
                <p className="text-xs text-gray-500 mb-3">
                  Enter commission split percentages that total 100%. This split will be applied to each lineslip's brokerage commission.
                </p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClassName}>Our Commission (%) *</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={ourCommission}
                        onChange={(e) => {
                          setOurCommission(e.target.value);
                          setCommissionError("");
                        }}
                        placeholder="Enter our commission"
                        required={!contact}
                        className={inputClassName}
                      />
                    </div>
                    <div>
                      <label className={labelClassName}>Producing Broker Commission (%) *</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={producingBrokerCommission}
                        onChange={(e) => {
                          setProducingBrokerCommission(e.target.value);
                          setCommissionError("");
                        }}
                        placeholder="Enter producing broker commission"
                        required={!contact}
                        className={inputClassName}
                      />
                    </div>
                  </div>
                  {/* Total Commission Indicator */}
                  <div className={`px-3 py-2 rounded-lg border-2 ${
                    totalCommission === 100 
                      ? "bg-green-50 border-green-500" 
                      : totalCommission > 0 
                      ? "bg-amber-50 border-amber-500" 
                      : "bg-gray-50 border-gray-300"
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Total Commission:</span>
                      <span className={`text-base font-bold ${
                        totalCommission === 100 
                          ? "text-green-700" 
                          : totalCommission > 0 
                          ? "text-amber-700" 
                          : "text-gray-700"
                      }`}>
                        {totalCommission.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  {totalCommission === 100 && (
                    <p className="text-xs text-green-700">✓ Perfect! Commissions total 100%</p>
                  )}
                  {totalCommission > 0 && totalCommission !== 100 && (
                    <p className="text-xs text-amber-700">
                      ⚠ Must total 100% (currently {totalCommission > 100 ? "over" : "under"} by {Math.abs(100 - totalCommission).toFixed(2)}%)
                    </p>
                  )}
                  {commissionError && (
                    <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {commissionError}
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    Example: If lineslip reinsurance commission is 20% and you enter 50/50 split, you get 10% and producing broker gets 10%
                  </p>
                </div>
              </div>
            )}

            {/* Notes (Producing Broker/Underwriter/Insured/Cedent) */}
            {type !== "Broker" && (
              <div className={sectionClassName}>
                <h3 className={headingClassName}>Notes (Optional)</h3>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any additional notes or comments..."
                  rows={4}
                  className="w-full bg-white border border-gray-300 text-gray-900 placeholder:text-gray-400 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004225]/50 resize-none"
                />
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="border-t border-gray-200 px-8 py-4 flex items-center justify-end gap-3 bg-gray-50">
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#004225] hover:bg-[#003319] text-white"
            >
              {contact ? "Update Contact" : "Add Contact"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}