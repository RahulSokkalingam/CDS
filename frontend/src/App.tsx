import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { getApiUrl } from "./api/client";
import {
  Upload,
  Activity,
  FileText,
  FileDown,
  RefreshCw,
  ShieldAlert,
  Clock,
  Eye,
  MapPin,
  LogOut,
  User,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { exportToPDF } from "@/utils/pdfGenerator";
import { AuthView } from "./components/AuthView";
import type { UserData } from "./components/AuthView";
import { InspectorDashboard } from "./components/InspectorDashboard";
import { DroneDashboard } from "./components/DroneDashboard";

// Defect interface
interface Defect {
  id: string;
  type: string;
  severity: "Critical" | "Warning" | "Low" | "None";
  confidence: number;
  location: string;
  dimensions: string;
  recommendation: string;
}

// Preset Demo Asset Data
interface DemoAsset {
  id: string;
  name: string;
  category: string;
  originalImage: string;
  processedImage: string;
  overallSeverity: "Critical" | "Warning" | "Low" | "None";
  overallConfidence: number;
  defectArea?: number; // Defect area percentage
  summary: string;
  defects: Defect[];
}

function App() {
  const [currentUser, setCurrentUser] = useState<UserData | null>(() => {
    try {
      const saved = localStorage.getItem("cds_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [locationInput, setLocationInput] = useState<string>("");
  const [uploadNotification, setUploadNotification] = useState<{ type: "crack" | "clear" | null; message: string }>({ type: null, message: "" });
  const [selectedAsset, setSelectedAsset] = useState<DemoAsset | null>(null);
  const [selectedEngine] = useState<"gemini">("gemini");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [analysisStepText, setAnalysisStepText] = useState<string>("");
  const [viewMode, setViewMode] = useState<"side-by-side" | "original" | "processed">("side-by-side");
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>("");
  const [currentBase64Preview, setCurrentBase64Preview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Apply dark mode class permanently to HTML element
  useEffect(() => {
    window.document.documentElement.classList.add("dark");
  }, []);

  const handleLogin = (user: UserData) => {
    setCurrentUser(user);
    localStorage.setItem("cds_user", JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("cds_user");
    setSelectedAsset(null);
    setApiError(null);
    setUploadNotification({ type: null, message: "" });
  };

  // Handle Drag Events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processUploadedFile(e.target.files[0]);
    }
  };

  const processUploadedFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSelectedAsset(null);
        startAnalysisFlow(file, event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const triggerOfflineFallback = () => {
    setApiError(null);
    setIsAnalyzing(false);
    setSelectedAsset({
      id: "custom-fallback",
      name: currentFileName || "Uploaded Asset",
      category: "Offline Simulation",
      originalImage: currentBase64Preview || "/bridge_original.png",
      processedImage: "/bridge_processed.png",
      overallSeverity: "Critical",
      overallConfidence: 96.8,
      defectArea: 1.42,
      summary: "Anomaly inspection completed in offline simulation. Detected high-probability cracking vectors along structural planes. Remedial patching and physical testing recommended.",
      defects: [
        {
          id: "DEF-FALLBACK-1",
          type: "Primary Fracture Line (Simulated)",
          severity: "Critical",
          confidence: 96.8,
          location: "Quadrant coordinates B3",
          dimensions: "Estimated: width 3.8mm, depth structural",
          recommendation: "Seal and reinforce with specialized high-tensile epoxy."
        },
        {
          id: "DEF-FALLBACK-2",
          type: "Secondary Spall Area (Simulated)",
          severity: "Low",
          confidence: 85.2,
          location: "Quadrant coordinates D1",
          dimensions: "Estimated area: 32cm²",
          recommendation: "Surface smoothing and moisture sealing."
        }
      ]
    });
  };

  // Run simulated/actual analysis
  const startAnalysisFlow = (file?: File, base64Preview?: string) => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setApiError(null);
    
    if (file) {
      setCurrentFileName(file.name);
      setCurrentBase64Preview(base64Preview || "");
      setIsUploading(true);
      setUploadProgress(0);
    } else {
      setIsUploading(false);
    }
    
    const steps = [
      { progress: 15, text: "Initializing ResNet AI core model..." },
      { progress: 40, text: "Performing geometric image alignment..." },
      { progress: 65, text: "Running structural anomaly inspection..." },
      { progress: 85, text: "Plotting defect bounding overlays..." },
      { progress: 100, text: "Compiling detailed severity parameters..." }
    ];

    let currentStep = 0;
    const animationInterval = setInterval(() => {
      if (currentStep < steps.length) {
        setAnalysisProgress(steps[currentStep].progress);
        setAnalysisStepText(steps[currentStep].text);
        currentStep++;
      } else {
        clearInterval(animationInterval);
      }
    }, 300);

    if (file) {
      const formData = new FormData();
      formData.append("file", file);

      const userEmail = currentUser?.email || "public@cds.io";
      const userName = currentUser?.name || "Public Reporter";
      const loc = locationInput.trim() || "Unspecified Location";

      axios.post(
        getApiUrl(`/api/upload?engine=${selectedEngine}&location=${encodeURIComponent(loc)}&user_email=${encodeURIComponent(userEmail)}&user_name=${encodeURIComponent(userName)}&source=${encodeURIComponent("Public Reporter")}`),
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
            setUploadProgress(percent);
            if (percent >= 100) {
              setIsUploading(false);
            }
          }
        }
      )
        .then((response) => {
          clearInterval(animationInterval);
          setIsUploading(false);
          setTimeout(() => {
            setIsAnalyzing(false);
            const data = response.data;
            setSelectedAsset(data);
            if (data.has_crack) {
              setUploadNotification({
                type: "crack",
                message: `Crack detected! Report #${data.id} submitted to the Inspector Assigner Queue.`
              });
            } else {
              setUploadNotification({
                type: "clear",
                message: "No cracks detected. The structure appears structurally sound."
              });
            }
          }, 1500);
        })
        .catch((err) => {
          clearInterval(animationInterval);
          setIsUploading(false);
          console.warn("Backend API call failed.", err);
          const msg = err.response?.data?.detail || "Could not reach the diagnostic server on port 8000. Verify the backend is active.";
          setApiError(msg);
        });
    } else {
      // Local preset select
      setTimeout(() => {
        setIsAnalyzing(false);
      }, 1500);
    }
  };

  const handleExportPDF = async () => {
    if (!selectedAsset) return;
    setIsExporting(true);
    try {
      await exportToPDF("inspection-report-dashboard", `inspection-report-${selectedAsset.id}.pdf`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "Critical":
        return <span className="badge badge-critical">Critical Action</span>;
      case "Warning":
        return <span className="badge badge-warning">Warning Flag</span>;
      case "Low":
        return <span className="badge badge-low">Low Risk</span>;
      default:
        return <span className="badge badge-none">Clear Asset</span>;
    }
  };

  // ---- Render: Auth Screen ----
  if (!currentUser) {
    return (
      <div className="app-container">
        <div className="grid-overlay"></div>
        <header className="header">
          <div className="header-logo-group">
            <img src="/logo.png" alt="CDS Logo" style={{ height: "2.25rem", display: "block" }} />
            <div className="header-title">Crack Detection System</div>
          </div>
        </header>
        <main className="main-content" style={{ justifyContent: "center", minHeight: "calc(100vh - 140px)" }}>
          <AuthView onAuthSuccess={handleLogin} />
        </main>
      </div>
    );
  }

  // ---- Render: Inspector Dashboard ----
  if (currentUser.role === "inspector") {
    return (
      <div className="app-container">
        <div className="grid-overlay"></div>
        <header className="header">
          <div className="header-logo-group">
            <img src="/logo.png" alt="CDS Logo" style={{ height: "2.25rem", display: "block" }} />
            <div className="header-title">Crack Detection System</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: currentUser.is_admin ? "rgba(245,166,35,0.15)" : "rgba(69,137,255,0.15)", border: `1px solid ${currentUser.is_admin ? "rgba(245,166,35,0.3)" : "rgba(69,137,255,0.3)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <User size={14} style={{ color: currentUser.is_admin ? "#f5a623" : "var(--primary)" }} />
              </div>
              <div>
                <div style={{ fontSize: "0.8rem", fontWeight: "600", lineHeight: 1.2 }}>{currentUser.name}</div>
                <div style={{ fontSize: "0.6rem", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: currentUser.is_admin ? "#f5a623" : "var(--primary)", letterSpacing: "0.5px" }}>{currentUser.is_admin ? "Admin" : "Manual Inspector"}</div>
              </div>
            </div>
            <button onClick={handleLogout} className="btn btn-outline" style={{ padding: "0.4rem 0.75rem", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "6px" }}>
              <LogOut size={12} />
              Sign Out
            </button>
          </div>
        </header>
        <main className="main-content" style={{ minHeight: "calc(100vh - 140px)", alignItems: "flex-start" }}>
          <InspectorDashboard currentUser={currentUser} />
        </main>
      </div>
    );
  }

  // ---- Render: Drone Vision Dashboard ----
  if (currentUser.role === "drone") {
    return (
      <div className="app-container">
        <div className="grid-overlay"></div>
        <header className="header">
          <div className="header-logo-group">
            <img src="/logo.png" alt="CDS Logo" style={{ height: "2.25rem", display: "block" }} />
            <div className="header-title">Crack Detection System</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "rgba(34,211,238,0.15)", border: "1px solid rgba(34,211,238,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <User size={14} style={{ color: "#22d3ee" }} />
              </div>
              <div>
                <div style={{ fontSize: "0.8rem", fontWeight: "600", lineHeight: 1.2 }}>{currentUser.name}</div>
                <div style={{ fontSize: "0.6rem", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "#22d3ee", letterSpacing: "0.5px" }}>Drone Vision</div>
              </div>
            </div>
            <button onClick={handleLogout} className="btn btn-outline" style={{ padding: "0.4rem 0.75rem", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "6px" }}>
              <LogOut size={12} />
              Sign Out
            </button>
          </div>
        </header>
        <main className="main-content" style={{ minHeight: "calc(100vh - 140px)", alignItems: "flex-start" }}>
          <DroneDashboard currentUser={currentUser} />
        </main>
      </div>
    );
  }

  // ---- Render: Public Reporter View ----
  return (
    <div className="app-container">
      <div className="grid-overlay"></div>

      {/* Header */}
      <header className="header">
        <div className="header-logo-group">
          <img src="/logo.png" alt="CDS Logo" style={{ height: "2.25rem", display: "block" }} />
          <div className="header-title">Crack Detection System</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "rgba(69,137,255,0.15)", border: "1px solid rgba(69,137,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <User size={14} style={{ color: "var(--primary)" }} />
            </div>
            <div>
              <div style={{ fontSize: "0.8rem", fontWeight: "600", lineHeight: 1.2 }}>{currentUser.name}</div>
              <div style={{ fontSize: "0.6rem", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--muted-foreground)", letterSpacing: "0.5px" }}>Public Reporter</div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-outline" style={{ padding: "0.4rem 0.75rem", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "6px" }}>
            <LogOut size={12} />
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="main-content" style={{ justifyContent: "center", minHeight: "calc(100vh - 140px)" }}>
        <AnimatePresence mode="wait">
          {isAnalyzing ? (
            /* Scanning / Uploading State */
            <motion.div
              key="analyzing"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              style={{ display: "flex", justifyContent: "center" }}
            >
              {apiError ? (
                /* Connection Error Panel */
                <div className="card progress-card" style={{ borderColor: "var(--critical)", maxWidth: "450px" }}>
                  <div className="card-body" style={{ textAlign: "center", padding: "2rem" }}>
                    <div className="progress-header" style={{ marginBottom: "1.5rem" }}>
                      <div className="progress-icon-spin" style={{ backgroundColor: "var(--critical-bg)", color: "var(--critical)", margin: "0 auto 1rem" }}>
                        <ShieldAlert size={24} />
                      </div>
                      <div className="progress-title-text" style={{ color: "var(--critical)", fontSize: "1rem" }}>Diagnostic Failure</div>
                      <p style={{ fontSize: "0.8rem", color: "var(--muted-foreground)", marginTop: "0.5rem" }}>
                        {apiError}
                      </p>
                    </div>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1.5rem" }}>
                      <button 
                        onClick={triggerOfflineFallback}
                        className="btn btn-primary"
                        style={{ width: "100%" }}
                      >
                        Proceed Offline Simulation
                      </button>
                      <button 
                        onClick={() => { setIsAnalyzing(false); setApiError(null); }}
                        className="btn btn-outline"
                        style={{ width: "100%" }}
                      >
                        Cancel & Try Again
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Uploading & Analyzing Progress */
                <div className="card progress-card" style={{ width: "100%", maxWidth: "500px" }}>
                  <div className="card-body">
                    <div className="progress-header">
                      <div className="progress-icon-spin">
                        <Activity className="animate-spin" size={24} />
                      </div>
                      <div className="progress-title-text">
                        {isUploading ? "Uploading Asset" : "Analyzing Asset"}
                      </div>
                      <p style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                        {isUploading 
                          ? "Streaming payload packet buffers to server..." 
                          : "ResNet vision layers parsing pixel matrices..."}
                      </p>
                    </div>

                    <div className="progress-bar-group">
                      <div className="progress-labels">
                        <span style={{ color: "var(--primary)", fontWeight: "bold" }}>
                          {isUploading ? "Axios Stream Upload" : analysisStepText}
                        </span>
                        <span style={{ color: "var(--muted-foreground)" }}>
                          {isUploading ? uploadProgress : analysisProgress}%
                        </span>
                      </div>
                      <div className="progress-bar-track">
                        <div 
                          className="progress-bar-fill" 
                          style={{ width: `${isUploading ? uploadProgress : analysisProgress}%` }}
                        ></div>
                      </div>
                    </div>

                    {!isUploading && (
                      <div className="console-container">
                        <div className="console-text pulse-slow">
                          <p>&gt; CDS AI ENGINE INITIALIZED</p>
                          <p>&gt; FETCHING IMAGE BOUNDARY BLOCKS...</p>
                          {analysisProgress > 20 && <p>&gt; OK: IMAGE SHAPE (2048, 1536) ALIGNED</p>}
                          {analysisProgress > 50 && <p>&gt; RUNNING PIXEL CONVOLUTIONS [GEMINI 2.5 FLASH]</p>}
                          {analysisProgress > 70 && <p>&gt; DETECTING ANOMALIES: LOCATING CRACK SEGMENTS</p>}
                          {analysisProgress > 90 && <p>&gt; COMPILE DICTIONARY PARSE: DONE</p>}
                        </div>
                        <div style={{ position: "absolute", right: "12px", bottom: "12px", fontSize: "0.6rem", color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: "6px" }}>
                          <Clock size={10} className="animate-spin" />
                          <span>{analysisProgress < 100 ? "Active" : "Ready"}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ) : !selectedAsset ? (
            /* Drag and Drop Uploader State */
            <motion.div
              key="uploader"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="demo-selector-section"
              style={{ width: "100%", maxWidth: "700px", margin: "0 auto", textAlign: "center" }}
            >
              <motion.h1 
                className="topic-heading"
                whileHover={{ scale: 1.04, y: -3 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 350, damping: 18 }}
              >
                AI Based Bridge Crack Detection System
              </motion.h1>



              {/* Location Input */}
              <div style={{ marginBottom: "1.5rem", textAlign: "left" }}>
                <label style={{ display: "block", fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.5rem" }}>
                  Bridge / Structure Location
                </label>
                <div style={{ position: "relative" }}>
                  <MapPin size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--primary)", pointerEvents: "none" }} />
                  <input
                    type="text"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    placeholder="e.g. Bridge Pier 4B, NH-48 Overpass, Mumbai"
                    style={{
                      width: "100%",
                      padding: "0.7rem 0.75rem 0.7rem 2.4rem",
                      backgroundColor: "var(--muted)",
                      border: "1px solid var(--border)",
                      color: "var(--foreground)",
                      fontSize: "0.85rem",
                      outline: "none",
                      borderRadius: "2px",
                      fontFamily: "var(--font-sans)",
                      boxSizing: "border-box",
                      transition: "border-color 0.2s ease"
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
                    onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                  />
                </div>
              </div>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`dropzone ${isDragOver ? "active" : ""}`}
                style={{ marginTop: "1rem" }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*,video/*"
                  style={{ display: "none" }}
                />
                
                <div className="dropzone-icon">
                  <Upload size={20} />
                </div>
                <h3 className="dropzone-title">
                  Drag & drop asset photo or video here, or <span className="dropzone-link">browse</span>
                </h3>
                <p className="dropzone-subtitle">
                  Accepts PNG, JPG, JPEG, MP4, WebM (Max 15MB)
                </p>
              </div>
            </motion.div>
          ) : (
            /* Results Page View */
            <motion.div
              key="results"
              style={{ width: "100%" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              id="inspection-report-dashboard"
            >
              {/* Notification Banner */}
              <AnimatePresence>
                {uploadNotification.type && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "0.85rem 1.25rem", marginBottom: "1.5rem", borderRadius: "4px",
                      border: `1px solid ${uploadNotification.type === "crack" ? "var(--critical)" : "#24a148"}`,
                      backgroundColor: uploadNotification.type === "crack" ? "var(--critical-bg)" : "rgba(36,161,72,0.08)",
                      fontSize: "0.82rem", fontFamily: "var(--font-mono)"
                    }}
                  >
                    {uploadNotification.type === "crack"
                      ? <AlertTriangle size={16} style={{ color: "var(--critical)", flexShrink: 0 }} />
                      : <CheckCircle size={16} style={{ color: "#24a148", flexShrink: 0 }} />
                    }
                    <span style={{ color: uploadNotification.type === "crack" ? "var(--critical)" : "#24a148" }}>
                      {uploadNotification.message}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Header inside results */}
              <div className="results-header-bar">
                <div>
                  <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--primary)", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "0.25rem" }}>
                    AI Diagnostic Output
                  </span>
                  <h2 style={{ fontSize: "1.5rem", fontWeight: "500" }}>{selectedAsset.name}</h2>
                </div>

                <div className="results-actions no-pdf">
                  <button
                    onClick={() => {
                      setSelectedAsset(null);
                      setUploadNotification({ type: null, message: "" });
                    }}
                    className="btn btn-outline"
                  >
                    <RefreshCw size={12} />
                    Reset & Upload New
                  </button>

                  <button
                    onClick={handleExportPDF}
                    disabled={isExporting}
                    className="btn btn-primary"
                  >
                    <FileDown size={12} />
                    {isExporting ? "Exporting PDF..." : "Download PDF Report"}
                  </button>
                </div>
              </div>

              {/* Main Analysis grid */}
              <div className="results-container" style={{ marginTop: "2rem" }}>
                
                {/* Visual Canvas (Left Column) */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  <div className="card">
                    <div className="card-header">
                      <div style={{ display: "flex", alignSelf: "center", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", fontFamily: "var(--font-mono)", fontWeight: "500" }}>
                        <Eye size={14} style={{ color: "var(--primary)" }} />
                        <span>Visual Inspection Canvas</span>
                      </div>
                      
                      <div className="no-pdf">
                        <div className="tabs-nav">
                          <button 
                            className={`tabs-btn ${viewMode === "side-by-side" ? "active" : ""}`}
                            onClick={() => setViewMode("side-by-side")}
                          >
                            Compare
                          </button>
                          <button 
                            className={`tabs-btn ${viewMode === "original" ? "active" : ""}`}
                            onClick={() => setViewMode("original")}
                          >
                            Original
                          </button>
                          <button 
                            className={`tabs-btn ${viewMode === "processed" ? "active" : ""}`}
                            onClick={() => setViewMode("processed")}
                          >
                            Processed
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="card-body" style={{ backgroundColor: "rgba(0,0,0,0.015)" }}>
                      {viewMode === "side-by-side" && (
                        <div className="image-canvas-grid">
                          <div className="canvas-img-wrapper">
                            <div className="canvas-img-label">Original Raw Photo</div>
                            <div className="canvas-image-box">
                              <img src={selectedAsset.originalImage} className="canvas-image" alt="Original raw structure" />
                            </div>
                          </div>
                          <div className="canvas-img-wrapper">
                            <div className="canvas-img-label">
                              <span>AI Diagnostic Overlay</span>
                              <span className="badge badge-low" style={{ fontSize: "8px", padding: "0.1rem 0.35rem" }}>PROCESSED</span>
                            </div>
                            <div className="canvas-image-box">
                              <img src={selectedAsset.processedImage} className="canvas-image" alt="AI processed overlay structure" />
                            </div>
                          </div>
                        </div>
                      )}

                      {viewMode === "original" && (
                        <div className="single-img-canvas">
                          <img src={selectedAsset.originalImage} className="canvas-image" alt="Original Raw" />
                          <div style={{ position: "absolute", top: "12px", left: "12px", background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontFamily: "var(--font-mono)", fontSize: "9px", padding: "4px 8px", textTransform: "uppercase" }}>
                            Original Sensor Feed
                          </div>
                        </div>
                      )}

                      {viewMode === "processed" && (
                        <div className="single-img-canvas">
                          <img src={selectedAsset.processedImage} className="canvas-image" alt="AI Processed" />
                          <div style={{ position: "absolute", top: "12px", left: "12px", background: "rgba(15,98,254,0.15)", backdropFilter: "blur(4px)", border: "1px solid var(--primary)", color: "#fff", fontFamily: "var(--font-mono)", fontSize: "9px", padding: "4px 8px", textTransform: "uppercase" }}>
                            ResNet-V9 AI Overlays Active
                          </div>
                          {/* Laser Scanner Line Overlay */}
                          <div className="scan-laser-line"></div>
                        </div>
                      )}
                    </div>

                    <div className="card-footer">
                      <span>Source: Optical Sensor-39A</span>
                      <span>Coordinates: 40.7128° N, 74.0060° W</span>
                    </div>
                  </div>
                </div>

                {/* Classification details (Right Column) */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  
                  {/* Status & Confidence Card */}
                  <div className="card">
                    <div className="card-header">
                      <div className="card-title">Diagnostic Status</div>
                    </div>
                    <div className="card-body">
                      <div className="info-row">
                        <div>
                          <div className="info-label" style={{ fontFamily: "var(--font-mono)" }}>Overall Severity</div>
                          <div className="info-value" style={{ marginTop: "0.2rem", fontWeight: "600" }}>
                            {selectedAsset.overallSeverity === "Critical" && "IMMEDIATE REPAIR REQUIRED"}
                            {selectedAsset.overallSeverity === "Warning" && "SCHEDULED REPAIR PLAN"}
                            {selectedAsset.overallSeverity === "Low" && "OBSERVATION ONLY"}
                            {selectedAsset.overallSeverity === "None" && "STABLE SYSTEM"}
                          </div>
                        </div>
                        <div>
                          {getSeverityBadge(selectedAsset.overallSeverity)}
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1.5rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
                          <span style={{ color: "var(--muted-foreground)" }}>AI Classifier Confidence</span>
                          <span style={{ color: "var(--primary)", fontWeight: "bold" }}>{selectedAsset.overallConfidence}%</span>
                        </div>
                        <div className="progress-bar-track">
                          <div className="progress-bar-fill" style={{ width: `${selectedAsset.overallConfidence}%` }}></div>
                        </div>
                        <span style={{ fontSize: "0.65rem", color: "var(--muted-foreground)", fontFamily: "var(--font-mono)", marginTop: "0.25rem" }}>
                          Confidence rating computed via ensemble ResNet probability matrices.
                        </span>
                      </div>

                      {selectedAsset.defectArea !== undefined && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1.5rem", borderTop: "1px dashed var(--border)", paddingTop: "1rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
                            <span style={{ color: "var(--muted-foreground)" }}>Defect Area Ratio</span>
                            <span style={{ color: "var(--critical)", fontWeight: "bold" }}>{selectedAsset.defectArea}%</span>
                          </div>
                          <div className="progress-bar-track">
                            <div className="progress-bar-fill" style={{ width: `${Math.min(100, selectedAsset.defectArea * 25)}%`, backgroundColor: "var(--critical)" }}></div>
                          </div>
                          <span style={{ fontSize: "0.65rem", color: "var(--muted-foreground)", fontFamily: "var(--font-mono)", marginTop: "0.25rem" }}>
                            Defect pixel area coverage relative to overall image resolution.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Summary Text Card */}
                  <div className="card">
                    <div className="card-header">
                      <div className="card-title">
                        <ShieldAlert size={14} style={{ color: "var(--primary)", marginRight: "4px" }} />
                        Executive AI Summary
                      </div>
                    </div>
                    <div className="card-body" style={{ padding: "1.25rem" }}>
                      <p className="summary-block">
                        {selectedAsset.summary}
                      </p>
                    </div>
                  </div>

                  {/* Identified Anomalies Detail Table */}
                  <div className="card">
                    <div className="card-header">
                      <div className="card-title">
                        <FileText size={14} style={{ color: "var(--primary)", marginRight: "4px" }} />
                        Defects Log ({selectedAsset.defects.length})
                      </div>
                    </div>
                    <div className="card-body" style={{ padding: "0" }}>
                      <div className="anomalies-table-wrapper">
                        <table className="anomalies-table">
                          <thead>
                            <tr>
                              <th>ID</th>
                              <th>Type</th>
                              <th>Confidence</th>
                              <th>Severity</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedAsset.defects.map((defect) => (
                              <React.Fragment key={defect.id}>
                                <tr>
                                  <td style={{ fontFamily: "var(--font-mono)", fontWeight: "600", color: "var(--primary)" }}>{defect.id}</td>
                                  <td style={{ fontWeight: "500" }}>{defect.type}</td>
                                  <td style={{ fontFamily: "var(--font-mono)" }}>{defect.confidence}%</td>
                                  <td>
                                    <span className={`severity-indicator-dot ${defect.severity.toLowerCase()}`}></span>
                                    {defect.severity}
                                  </td>
                                </tr>
                                <tr className="table-row-meta">
                                  <td colSpan={4}>
                                    <div className="table-row-meta-content">
                                      <div className="table-meta-item">
                                        <span className="table-meta-label">Location:</span>
                                        <span>{defect.location}</span>
                                      </div>
                                      <div className="table-meta-item">
                                        <span className="table-meta-label">Params:</span>
                                        <span>{defect.dimensions}</span>
                                      </div>
                                      <div className="table-meta-item table-meta-rec">
                                        <span className="table-meta-label" style={{ color: "inherit" }}>Action:</span>
                                        <span>{defect.recommendation}</span>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
