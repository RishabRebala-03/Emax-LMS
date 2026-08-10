import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import "./StudentRegistration.css";
import { apiGet, apiPostForm } from "../services/api";

interface MasterItem {
  id: string;
  label: string;
}

interface MasterData {
  genders: MasterItem[];
  streams: MasterItem[];
  certifications: MasterItem[];
  colleges: MasterItem[];
}

interface RegistrationFormData {
  studentName: string;
  studentId: string;
  email: string;
  mobile: string;
  gender: string;
  courseStream: string;
  cgpa: string;
  sapCertification: string;
  collegeName: string;
  collegeEmail: string;
  dob: string;
}

interface StudentRegistrationProps {
  onBack: () => void;
  onSuccess?: () => void;
}

// ── Credentials Popup — rendered via React Portal into document.body ──────────

const CredentialsPopup: React.FC<{
  name: string;
  naxUnid: string;
  onClose: () => void;
}> = ({ name, naxUnid, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = `User ID: ${naxUnid}\nPassword: Welcome@123`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      prompt("Copy your credentials:", text);
    });
  };

  const popup = (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 99999, padding: "1rem",
      }}
    >
      <div
        style={{
          background: "#fff", borderRadius: "1rem",
          padding: "2rem 2.25rem", maxWidth: "440px", width: "100%",
          boxShadow: "0 25px 70px rgba(0,0,0,0.25)",
          textAlign: "center",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🎉</div>

        <h2 style={{ margin: "0 0 0.35rem", fontSize: "1.4rem", fontWeight: 700, color: "#111" }}>
          Welcome, {name.split(" ")[0]}!
        </h2>
        <p style={{ color: "#6b7280", fontSize: "0.9rem", margin: "0 0 1.5rem", lineHeight: 1.5 }}>
          Your account has been created. Save the credentials below — you'll need them to log in.
        </p>

        {/* Credentials box */}
        <div style={{
          background: "#f0f7ff", border: "1.5px solid #bfdbfe",
          borderRadius: "0.625rem", padding: "1.1rem 1.25rem",
          marginBottom: "1.1rem", textAlign: "left",
        }}>
          <div style={{ marginBottom: "0.85rem" }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.3rem" }}>
              User ID (NAX_UNID)
            </div>
            <div style={{
              fontFamily: "monospace", fontSize: "1.1rem", fontWeight: 700,
              color: "#1e40af", background: "#dbeafe", borderRadius: "0.4rem",
              padding: "0.5rem 0.85rem", letterSpacing: "0.05em",
              userSelect: "all",
            }}>
              {naxUnid}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.3rem" }}>
              Default Password
            </div>
            <div style={{
              fontFamily: "monospace", fontSize: "1.1rem", fontWeight: 700,
              color: "#065f46", background: "#d1fae5", borderRadius: "0.4rem",
              padding: "0.5rem 0.85rem",
              userSelect: "all",
            }}>
              Welcome@123
            </div>
          </div>
        </div>

        {/* Warning */}
        <div style={{
          background: "#fffbeb", border: "1px solid #fde68a",
          borderRadius: "0.5rem", padding: "0.65rem 0.9rem",
          fontSize: "0.8rem", color: "#92400e", marginBottom: "1.4rem",
          textAlign: "left", display: "flex", gap: "0.5rem", alignItems: "flex-start",
        }}>
          <span>⚠️</span>
          <span>Please note these credentials and <strong>change your password after first login</strong>.</span>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={handleCopy}
            style={{
              flex: 1, padding: "0.7rem", borderRadius: "0.5rem",
              border: "1.5px solid #d1d5db", background: "#f9fafb",
              fontSize: "0.875rem", fontWeight: 500, cursor: "pointer", color: "#374151",
            }}
          >
            {copied ? "✓ Copied!" : "📋 Copy Credentials"}
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: "0.7rem", borderRadius: "0.5rem",
              border: "none", background: "#2563eb",
              fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", color: "#fff",
            }}
          >
            Go to Login →
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(popup, document.body);
};

// ── Main Registration Component ───────────────────────────────────────────────

const StudentRegistration: React.FC<StudentRegistrationProps> = ({ onBack }) => {
  const [formData, setFormData] = useState<RegistrationFormData>({
    studentName: "",
    studentId: "",
    email: "",
    mobile: "",
    gender: "",
    courseStream: "",
    cgpa: "",
    sapCertification: "",
    collegeName: "",
    collegeEmail: "",
    dob: "",
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [masterData, setMasterData] = useState<MasterData>({
    genders: [],
    streams: [],
    certifications: [],
    colleges: [],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isMasterLoading, setIsMasterLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [registeredUnid, setRegisteredUnid] = useState("");

  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    setIsMasterLoading(true);
    try {
      const res = await apiGet<MasterData>("/public/master-data");
      setMasterData({
        genders: res.genders || [],
        streams: res.streams || [],
        certifications: res.certifications || [],
        colleges: res.colleges || [],
      });
    } catch (e) {
      console.error("Failed to load master data:", e);
    } finally {
      setIsMasterLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['jpg', 'jpeg', 'pdf'].includes(ext)) {
      alert("Invalid file format. Please upload a JPG, JPEG, or PDF file.");
      e.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("File size exceeds 10MB limit. Please upload a smaller file.");
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cgpaVal = parseFloat(formData.cgpa);
    if (isNaN(cgpaVal) || cgpaVal < 0 || cgpaVal > 10) {
      alert("CGPA must be a number between 0 and 10.");
      return;
    }
    if (!/^\d{10}$/.test(formData.mobile)) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!formData.dob) {
      alert("Please select your Date of Birth.");
      return;
    }
    if (!selectedFile) {
      alert("Please upload your document (JPG, JPEG, or PDF).");
      return;
    }

    setIsLoading(true);
    try {
      const fd = new FormData();
      fd.append("studentName", formData.studentName);
      fd.append("studentId", formData.studentId);
      fd.append("email", formData.email);
      fd.append("collegeEmail", formData.collegeEmail);
      fd.append("mobile", formData.mobile);
      fd.append("gender", formData.gender);
      fd.append("courseStream", formData.courseStream);
      fd.append("cgpa", formData.cgpa);
      fd.append("sapCertification", formData.sapCertification);
      fd.append("collegeName", formData.collegeName);
      fd.append("dob", formData.dob);
      fd.append("document", selectedFile);

      const res = await apiPostForm<{ naxUnid: string }>("/public/register", fd);

      if (!res.naxUnid) {
        alert("Registration succeeded but no User ID was returned. Please contact support.");
        return;
      }

      setRegisteredUnid(res.naxUnid);
      setShowPopup(true);
    } catch (err: any) {
      console.error("Registration error:", err);
      alert(err?.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePopupClose = () => {
    setShowPopup(false);
    onBack();
  };

  return (
    <>
      {showPopup && registeredUnid && (
        <CredentialsPopup
          name={formData.studentName}
          naxUnid={registeredUnid}
          onClose={handlePopupClose}
        />
      )}

      <div className="reg-container">
        <div className="reg-card">
          <div className="reg-logo-container">
            <img src="/assets/emax-logo.png" alt="Emax Technologies" className="reg-logo" />
          </div>

          <div className="reg-header">
            <h1 className="reg-title">Devcon Associate Registration</h1>
            <p className="reg-subtitle">Create your account to access the exam portal</p>
          </div>

          <form onSubmit={handleSubmit} className="reg-form">
            {/* Row 1 */}
            <div className="reg-form-row">
              <div className="form-group">
                <label htmlFor="studentName">Full Name *</label>
                <input id="studentName" name="studentName" type="text"
                  value={formData.studentName} onChange={handleChange}
                  placeholder="Enter your full name" required />
              </div>
              <div className="form-group">
                <label htmlFor="studentId">Student ID *</label>
                <input id="studentId" name="studentId" type="text"
                  value={formData.studentId} onChange={handleChange}
                  placeholder="Enter your college roll number" required />
              </div>
            </div>

            {/* Row 2 */}
            <div className="reg-form-row">
              <div className="form-group">
                <label htmlFor="email">Personal Email ID *</label>
                <input id="email" name="email" type="email"
                  value={formData.email} onChange={handleChange}
                  placeholder="Enter your personal email" required />
              </div>
              <div className="form-group">
                <label htmlFor="collegeEmail">College Email ID *</label>
                <input id="collegeEmail" name="collegeEmail" type="email"
                  value={formData.collegeEmail} onChange={handleChange}
                  placeholder="Enter your college email" required />
              </div>
            </div>

            {/* Row 3 */}
            <div className="reg-form-row">
              <div className="form-group">
                <label htmlFor="mobile">Mobile Number *</label>
                <input id="mobile" name="mobile" type="tel"
                  value={formData.mobile} onChange={handleChange}
                  placeholder="10-digit mobile number" maxLength={10} required />
              </div>
              <div className="form-group">
                <label htmlFor="gender">Gender *</label>
                <select id="gender" name="gender" value={formData.gender}
                  onChange={handleChange} required disabled={isMasterLoading}>
                  <option value="">{isMasterLoading ? "Loading..." : "Select gender"}</option>
                  {masterData.genders.map(g => <option key={g.id} value={g.label}>{g.label}</option>)}
                </select>
              </div>
            </div>

            {/* Row 4 */}
            <div className="reg-form-row">
              <div className="form-group">
                <label htmlFor="collegeName">College Name *</label>
                <select id="collegeName" name="collegeName" value={formData.collegeName}
                  onChange={handleChange} required disabled={isMasterLoading}>
                  <option value="">{isMasterLoading ? "Loading..." : "Select college"}</option>
                  {masterData.colleges.map(c => <option key={c.id} value={c.label}>{c.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="courseStream">Course Stream *</label>
                <select id="courseStream" name="courseStream" value={formData.courseStream}
                  onChange={handleChange} required disabled={isMasterLoading}>
                  <option value="">{isMasterLoading ? "Loading..." : "Select stream"}</option>
                  {masterData.streams.map(s => <option key={s.id} value={s.label}>{s.label}</option>)}
                </select>
              </div>
            </div>

            {/* Row 5 */}
            <div className="reg-form-row">
              <div className="form-group">
                <label htmlFor="cgpa">Last Semester CGPA *</label>
                <input id="cgpa" name="cgpa" type="number" step="0.01" min="0" max="10"
                  value={formData.cgpa} onChange={handleChange}
                  placeholder="e.g. 8.5" required />
              </div>
              <div className="form-group">
                <label htmlFor="sapCertification">SAP Certification *</label>
                <select id="sapCertification" name="sapCertification" value={formData.sapCertification}
                  onChange={handleChange} required disabled={isMasterLoading}>
                  <option value="">{isMasterLoading ? "Loading..." : "Select certification"}</option>
                  {masterData.certifications.map(c => <option key={c.id} value={c.label}>{c.label}</option>)}
                </select>
              </div>
            </div>

            {/* Row 6: DOB & Upload Document */}
            <div className="reg-form-row">
              <div className="form-group">
                <label htmlFor="dob">Date of Birth *</label>
                <input id="dob" name="dob" type="date"
                  value={formData.dob} onChange={handleChange}
                  required />
              </div>

              <div className="form-group">
                <label htmlFor="docUpload">Upload Document (JPG, JPEG, PDF) *</label>
                {!selectedFile ? (
                  <>
                    <input
                      id="docUpload"
                      type="file"
                      accept=".jpg,.jpeg,.pdf,image/jpeg,image/jpg,application/pdf"
                      onChange={handleFileChange}
                      style={{ display: "none" }}
                      required
                    />
                    <label htmlFor="docUpload" className="upload-btn-main">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      <span>Upload File</span>
                    </label>
                  </>
                ) : (
                  <div className="file-preview-card">
                    <div className="file-preview-icon">
                      {selectedFile.name.toLowerCase().endsWith(".pdf") ? "📄" : "🖼️"}
                    </div>
                    <div className="file-preview-details">
                      <span className="file-name" title={selectedFile.name}>{selectedFile.name}</span>
                      <span className="file-size">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                    <button
                      type="button"
                      className="file-remove-btn"
                      onClick={clearSelectedFile}
                      title="Remove file"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={isLoading || isMasterLoading}>
              {isLoading ? "Registering & Uploading..." : "Register"}
            </button>
          </form>

          <div className="security-badge">
            <span className="security-icon">🔒</span>
            <span>Your information is securely stored</span>
          </div>

          <div className="reg-footer">
            <p>
              Already have an account?{" "}
              <button className="reg-link-btn" onClick={onBack}>Sign In</button>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default StudentRegistration;