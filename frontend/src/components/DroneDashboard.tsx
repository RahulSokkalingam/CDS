import React, { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import { getApiUrl } from "../api/client";
import {
  Camera,
  Upload,
  MapPin,
  Activity,
  Clock,
  ShieldAlert,
  RefreshCw,
  FileDown,
  Eye,
  CheckCircle,
  AlertTriangle,
  FileText,
  Image,
  Video,
  Crosshair,
  Layers,
  Radio
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { exportToPDF } from "@/utils/pdfGenerator";
import type { UserData } from "./AuthView";

interface Defect {
  id: string;
  type: string;
  severity: "Critical" | "Warning" | "Low" | "None";
  confidence: number;
  location: string;
  dimensions: string;
  recommendation: string;
}

interface ScanResult {
  id: string;
  name: string;
  category: string;
  originalImage: string;
  processedImage: string;
  overallSeverity: "Critical" | "Warning" | "Low" | "None";
  overallConfidence: number;
  defectArea?: number;
  summary: string;
  defects: Defect[];
  has_crack?: boolean;
  status?: string;
  assigned_inspector?: string;
  location?: string;
}

interface DBReport {
  id: string;
  user_email: string;
  user_name: string;
  location: string;
  originalImage: string;
  processedImage: string;
  has_crack: boolean;
  overallSeverity: string;
  overallConfidence: number;
  summary: string;
  defects: any[];
  status: string;
  assigned_inspector: string;
  source: string;
  created_at: string;
}

interface DroneDashboardProps {
  currentUser: UserData;
}

export const DroneDashboard: React.FC<DroneDashboardProps> = ({ currentUser }) => {
  const [activeView, setActiveView] = useState<"upload" | "results" | "history" | "live">("upload");
  const [locationInput, setLocationInput] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [analysisStepText, setAnalysisStepText] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [apiError, setApiError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [uploadNotification, setUploadNotification] = useState<{ type: "crack" | "clear" | null; message: string }>({ type: null, message: "" });
  const [viewMode, setViewMode] = useState<"side-by-side" | "original" | "processed">("side-by-side");
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [pastScans, setPastScans] = useState<DBReport[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [selectedHistoryReport, setSelectedHistoryReport] = useState<DBReport | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live camera state
  const [liveActive, setLiveActive] = useState<boolean>(false);
  const [liveDetections, setLiveDetections] = useState<any[]>([]);
  const [liveFps, setLiveFps] = useState<number>(0);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveCrackCount, setLiveCrackCount] = useState<number>(0);
  const [liveEvalStatus, setLiveEvalStatus] = useState<string>("SURFACE CLEAR — NO CRACKS DETECTED");
  const [liveEvalProgress, setLiveEvalProgress] = useState<number>(0);
  const [liveCaptureNotification, setLiveCaptureNotification] = useState<{ message: string; type: "success" | "info" } | null>(null);
  const [liveLastCapture, setLiveLastCapture] = useState<{ imageData: string; reportId: string; severity: string; timestamp: Date } | null>(null);
  const [liveCaptureSubmitting, setLiveCaptureSubmitting] = useState<boolean>(false);

  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement>(null);
  const liveStreamRef = useRef<MediaStream | null>(null);
  const liveIntervalRef = useRef<number | null>(null);
  const liveProcessingRef = useRef<boolean>(false);
  const liveCooldownRef = useRef<number>(0); // timestamp of last capture
  const liveSamplesRef = useRef<Array<{ blob: Blob; dataUrl: string; confidence: number; severity: string }>>([]);
  const liveSamplesCountRef = useRef<number>(0);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await axios.get(getApiUrl(`/api/reports?user_email=${encodeURIComponent(currentUser.email)}`));
      setPastScans(response.data.reports || []);
    } catch (err) {
      console.error("Failed to fetch drone scan history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);
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
    startAnalysisFlow(file);
  };

  const startAnalysisFlow = (file: File) => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setApiError(null);
    setUploadNotification({ type: null, message: "" });
    setIsUploading(true);
    setUploadProgress(0);

    const steps = [
      { progress: 12, text: "Initializing drone imagery parser..." },
      { progress: 30, text: "Decoding aerial sensor payload..." },
      { progress: 50, text: "Gemini 2.5 Flash — structural scan active..." },
      { progress: 70, text: "Mapping crack vectors from aerial angle..." },
      { progress: 88, text: "Plotting defect bounding overlays..." },
      { progress: 100, text: "Compiling drone inspection report..." }
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
    }, 350);

    const formData = new FormData();
    formData.append("file", file);

    const loc = locationInput.trim() || "Unspecified Location";

    axios.post(
      getApiUrl(`/api/upload?engine=gemini&location=${encodeURIComponent(loc)}&user_email=${encodeURIComponent(currentUser.email)}&user_name=${encodeURIComponent(currentUser.name)}&source=${encodeURIComponent("Drone Vision")}`),
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setUploadProgress(percent);
          if (percent >= 100) setIsUploading(false);
        }
      }
    )
      .then((response) => {
        clearInterval(animationInterval);
        setIsUploading(false);
        setTimeout(() => {
          setIsAnalyzing(false);
          const data = response.data;
          setScanResult(data);
          setActiveView("results");
          if (data.has_crack) {
            setUploadNotification({
              type: "crack",
              message: `Crack detected! Drone report #${data.id} dispatched to Inspector Queue.`
            });
          } else {
            setUploadNotification({
              type: "clear",
              message: "No structural defects detected in drone imagery. Surface appears sound."
            });
          }
          fetchHistory();
        }, 1200);
      })
      .catch((err) => {
        clearInterval(animationInterval);
        setIsUploading(false);
        setIsAnalyzing(false);
        const msg = err.response?.data?.detail || "Could not reach the diagnostic server. Verify the backend is active on port 8000.";
        setApiError(msg);
      });
  };

  const handleExportPDF = async () => {
    if (!scanResult) return;
    setIsExporting(true);
    try {
      await exportToPDF("drone-report-dashboard", `drone-inspection-${scanResult.id}.pdf`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "Critical": return <span className="badge badge-critical">Critical Action</span>;
      case "Warning": return <span className="badge badge-warning">Warning Flag</span>;
      case "Low": return <span className="badge badge-low">Low Risk</span>;
      default: return <span className="badge badge-none">Clear Asset</span>;
    }
  };

  const accentColor = "#22d3ee";

  // ===== Live Camera Logic =====
  const startLiveCamera = useCallback(async () => {
    setLiveError(null);
    setLiveDetections([]);
    setLiveCrackCount(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } }
      });
      liveStreamRef.current = stream;
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        await liveVideoRef.current.play();
      }
      setLiveActive(true);

      // Start frame capture loop
      let lastTime = performance.now();
      const captureLoop = () => {
        liveIntervalRef.current = window.setInterval(async () => {
          if (liveProcessingRef.current) return;
          const video = liveVideoRef.current;
          const canvas = liveCanvasRef.current;
          if (!video || !canvas || video.readyState < 2) return;

          liveProcessingRef.current = true;
          const now = performance.now();
          const elapsed = now - lastTime;
          lastTime = now;
          setLiveFps(Math.round(1000 / elapsed));

          // Capture frame to a temporary off-screen canvas
          const offscreen = document.createElement("canvas");
          offscreen.width = video.videoWidth;
          offscreen.height = video.videoHeight;
          const offCtx = offscreen.getContext("2d");
          if (!offCtx) { liveProcessingRef.current = false; return; }
          offCtx.drawImage(video, 0, 0);

          // Convert to blob and send to API
          offscreen.toBlob(async (blob) => {
            if (!blob) { liveProcessingRef.current = false; return; }
            try {
              const formData = new FormData();
              formData.append("file", blob, "frame.jpg");
              const resp = await axios.post(getApiUrl("/api/live-detect"), formData, {
                timeout: 5000
              });
              const dets = resp.data.detections || [];
              setLiveDetections(dets);

              if (dets.length === 0) {
                // Surface clear -> reset sample buffer
                liveSamplesCountRef.current = 0;
                liveSamplesRef.current = [];
                setLiveEvalProgress(0);
                setLiveEvalStatus("SURFACE CLEAR — NO CRACKS DETECTED");
              } else {
                setLiveCrackCount(prev => prev + dets.length);
                const now = Date.now();

                // Check if clear of 15s cooldown
                if (now - liveCooldownRef.current > 15000) {
                  liveSamplesCountRef.current += 1;
                  const currentCount = liveSamplesCountRef.current;
                  setLiveEvalProgress(Math.min(100, Math.round((currentCount / 5) * 100)));
                  setLiveEvalStatus(`Evaluating surface... (Sample ${currentCount}/5 — Hold steady)`);

                  // Create snapshot candidate
                  const sampleCanvas = document.createElement("canvas");
                  sampleCanvas.width = video.videoWidth;
                  sampleCanvas.height = video.videoHeight;
                  const sCtx = sampleCanvas.getContext("2d");
                  if (sCtx) {
                    sCtx.drawImage(video, 0, 0);
                    sampleCanvas.toBlob((sampleBlob) => {
                      if (sampleBlob) {
                        const topDet = dets[0];
                        liveSamplesRef.current.push({
                          blob: sampleBlob,
                          dataUrl: sampleCanvas.toDataURL("image/jpeg", 0.8),
                          confidence: topDet.confidence || 90.0,
                          severity: topDet.severity || "Warning"
                        });
                      }
                    }, "image/jpeg", 0.85);
                  }

                  // Once 5 samples (2.5 seconds) are collected, pick the BEST frame
                  if (currentCount >= 5) {
                    liveCooldownRef.current = now; // set cooldown
                    const samples = [...liveSamplesRef.current];
                    liveSamplesCountRef.current = 0;
                    liveSamplesRef.current = [];

                    if (samples.length > 0) {
                      // Sort samples by confidence descending to pick the best crack snapshot
                      samples.sort((a, b) => b.confidence - a.confidence);
                      const bestSample = samples[0];

                      setLiveCaptureSubmitting(true);
                      setLiveEvalStatus("Selecting best crack snapshot & dispatching...");

                      const reportForm = new FormData();
                      reportForm.append("file", bestSample.blob, "live-capture.jpg");
                      axios.post(
                        getApiUrl("/api/live-report?location=Live%20Camera%20Scan&user_email=live@cds.io&user_name=Live%20Vision"),
                        reportForm,
                        { timeout: 10000 }
                      )
                        .then((reportResp) => {
                          if (reportResp.data.saved) {
                            setLiveCaptureNotification({
                              message: `Best crack frame (${bestSample.confidence}% conf) captured & sent to Inspector Queue!`,
                              type: "success"
                            });
                            setLiveLastCapture({
                              imageData: bestSample.dataUrl,
                              reportId: reportResp.data.report_id,
                              severity: reportResp.data.severity,
                              timestamp: new Date()
                            });
                            setLiveEvalStatus(`Report ${reportResp.data.report_id} dispatched to Inspector`);
                            setTimeout(() => setLiveCaptureNotification(null), 7000);
                          }
                        })
                        .catch((err) => {
                          console.error("Failed to save live report:", err);
                          setLiveEvalStatus("Failed to dispatch report");
                        })
                        .finally(() => {
                          setLiveCaptureSubmitting(false);
                          setLiveEvalProgress(0);
                        });
                    }
                  }
                } else {
                  setLiveEvalStatus("Crack reported — Cooldown active");
                }
              }

              // Draw bounding boxes on the overlay canvas
              const ctx = canvas.getContext("2d");
              if (ctx) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                for (const d of dets) {
                  const color = d.severity === "Critical" ? "#da1e28" : d.severity === "Warning" ? "#ff832b" : "#22d3ee";
                  ctx.strokeStyle = color;
                  ctx.lineWidth = 3;
                  ctx.strokeRect(d.x1, d.y1, d.x2 - d.x1, d.y2 - d.y1);
                  // Label background
                  const label = `${d.type || "Crack"} (${d.severity})`;
                  ctx.font = "bold 13px monospace";
                  const textWidth = ctx.measureText(label).width;
                  ctx.fillStyle = color;
                  ctx.fillRect(d.x1, d.y1 - 20, textWidth + 10, 20);
                  ctx.fillStyle = "#fff";
                  ctx.fillText(label, d.x1 + 5, d.y1 - 5);
                }
              }
            } catch {
              // Silently skip failed frames
            } finally {
              liveProcessingRef.current = false;
            }
          }, "image/jpeg", 0.7);
        }, 500); // Send a frame every 500ms
      };
      captureLoop();
    } catch (err: any) {
      setLiveError(err.message || "Camera access denied. Please allow camera permissions.");
    }
  }, []);

  const stopLiveCamera = useCallback(() => {
    if (liveIntervalRef.current) {
      clearInterval(liveIntervalRef.current);
      liveIntervalRef.current = null;
    }
    if (liveStreamRef.current) {
      liveStreamRef.current.getTracks().forEach(t => t.stop());
      liveStreamRef.current = null;
    }
    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = null;
    }
    if (liveCanvasRef.current) {
      const ctx = liveCanvasRef.current.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, liveCanvasRef.current.width, liveCanvasRef.current.height);
    }
    setLiveActive(false);
    setLiveDetections([]);
    liveProcessingRef.current = false;
  }, []);

  // Cleanup camera when switching away from live tab
  useEffect(() => {
    if (activeView !== "live" && liveActive) {
      stopLiveCamera();
    }
  }, [activeView, liveActive, stopLiveCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopLiveCamera(); };
  }, [stopLiveCamera]);

  return (
    <div style={{ width: "100%", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header Banner */}
      <div className="card" style={{ marginBottom: "1.5rem", borderRadius: "8px", borderColor: "rgba(34, 211, 238, 0.2)" }}>
        <div className="card-body" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: accentColor, fontFamily: "var(--font-mono)", fontSize: "0.75rem", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>
              <Camera size={16} />
              <span>Drone Vision Portal</span>
            </div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginTop: "0.2rem" }}>
              Aerial Structural Inspection System
            </h2>
            <p style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
              Upload drone photos & videos for AI-powered crack detection. Detected cracks are dispatched to inspectors.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={fetchHistory} className="btn btn-outline" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <RefreshCw size={13} className={historyLoading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: "flex", backgroundColor: "var(--muted)", borderRadius: "6px", padding: "4px", marginBottom: "1.5rem" }}>
        {([
          { key: "upload" as const, label: "New Scan", icon: <Upload size={14} /> },
          { key: "live" as const, label: "Live Scan", icon: <Radio size={14} /> },
          { key: "results" as const, label: "Latest Result", icon: <Eye size={14} /> },
          { key: "history" as const, label: "Scan History", icon: <Layers size={14} /> },
        ]).map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveView(tab.key)}
            style={{
              flex: 1,
              padding: "0.6rem 1rem",
              border: "none",
              borderRadius: "4px",
              fontFamily: "var(--font-mono)",
              fontSize: "0.78rem",
              fontWeight: "600",
              cursor: "pointer",
              backgroundColor: activeView === tab.key ? "var(--card)" : "transparent",
              color: activeView === tab.key ? "var(--foreground)" : "var(--muted-foreground)",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: activeView === tab.key ? "0 1px 4px rgba(0,0,0,0.15)" : "none"
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ======= UPLOAD TAB ======= */}
      {activeView === "upload" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <AnimatePresence mode="wait">
            {isAnalyzing ? (
              <motion.div
                key="analyzing"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                style={{ display: "flex", justifyContent: "center" }}
              >
                {apiError ? (
                  <div className="card progress-card" style={{ borderColor: "var(--critical)", maxWidth: "450px" }}>
                    <div className="card-body" style={{ textAlign: "center", padding: "2rem" }}>
                      <div className="progress-header" style={{ marginBottom: "1.5rem" }}>
                        <div className="progress-icon-spin" style={{ backgroundColor: "var(--critical-bg)", color: "var(--critical)", margin: "0 auto 1rem" }}>
                          <ShieldAlert size={24} />
                        </div>
                        <div className="progress-title-text" style={{ color: "var(--critical)", fontSize: "1rem" }}>Drone Diagnostic Failure</div>
                        <p style={{ fontSize: "0.8rem", color: "var(--muted-foreground)", marginTop: "0.5rem" }}>
                          {apiError}
                        </p>
                      </div>
                      <button
                        onClick={() => { setIsAnalyzing(false); setApiError(null); }}
                        className="btn btn-outline"
                        style={{ width: "100%" }}
                      >
                        Cancel & Try Again
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="card progress-card" style={{ width: "100%", maxWidth: "500px" }}>
                    <div className="card-body">
                      <div className="progress-header">
                        <div className="progress-icon-spin" style={{ backgroundColor: "rgba(34,211,238,0.1)", color: accentColor }}>
                          <Activity className="animate-spin" size={24} />
                        </div>
                        <div className="progress-title-text" style={{ color: accentColor }}>
                          {isUploading ? "Uploading Drone Imagery" : "Analyzing Aerial Capture"}
                        </div>
                        <p style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                          {isUploading
                            ? "Streaming drone payload to diagnostic server..."
                            : "Gemini vision model parsing aerial pixel data..."}
                        </p>
                      </div>

                      <div className="progress-bar-group">
                        <div className="progress-labels">
                          <span style={{ color: accentColor, fontWeight: "bold" }}>
                            {isUploading ? "Upload Stream" : analysisStepText}
                          </span>
                          <span style={{ color: "var(--muted-foreground)" }}>
                            {isUploading ? uploadProgress : analysisProgress}%
                          </span>
                        </div>
                        <div className="progress-bar-track">
                          <div
                            className="progress-bar-fill"
                            style={{ width: `${isUploading ? uploadProgress : analysisProgress}%`, background: `linear-gradient(90deg, ${accentColor}, #4589ff)` }}
                          ></div>
                        </div>
                      </div>

                      {!isUploading && (
                        <div className="console-container">
                          <div className="console-text pulse-slow">
                            <p>&gt; DRONE VISION ENGINE INITIALIZED</p>
                            <p>&gt; DECODING AERIAL SENSOR FRAME...</p>
                            {analysisProgress > 25 && <p>&gt; OK: IMAGE DECODED — RUNNING GEMINI 2.5 FLASH</p>}
                            {analysisProgress > 50 && <p>&gt; SCANNING FOR STRUCTURAL ANOMALIES...</p>}
                            {analysisProgress > 75 && <p>&gt; MAPPING CRACK VECTORS FROM AERIAL ANGLE</p>}
                            {analysisProgress > 95 && <p>&gt; REPORT COMPILED — DISPATCHING TO INSPECTOR QUEUE</p>}
                          </div>
                          <div style={{ position: "absolute", right: "12px", bottom: "12px", fontSize: "0.6rem", color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: "6px" }}>
                            <Clock size={10} className="animate-spin" />
                            <span>{analysisProgress < 100 ? "Processing" : "Ready"}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="uploader"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{ maxWidth: "700px", margin: "0 auto", textAlign: "center" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "0.5rem" }}>
                  <Crosshair size={22} style={{ color: accentColor }} />
                  <h1 style={{ fontSize: "1.6rem", fontWeight: "700", letterSpacing: "-0.5px" }}>
                    Drone Aerial Crack Scanner
                  </h1>
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--muted-foreground)", marginBottom: "1.75rem" }}>
                  Upload drone-captured photos or videos of bridges and infrastructure for automated crack detection.
                </p>



                {/* Location Input */}
                <div style={{ marginBottom: "1.5rem", textAlign: "left" }}>
                  <label style={{ display: "block", fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.5rem" }}>
                    Structure / GPS Location
                  </label>
                  <div style={{ position: "relative" }}>
                    <MapPin size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: accentColor, pointerEvents: "none" }} />
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
                      onFocus={(e) => (e.target.style.borderColor = accentColor)}
                      onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                    />
                  </div>
                </div>

                {/* Dropzone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`dropzone ${isDragOver ? "active" : ""}`}
                  style={{ marginTop: "1rem", borderColor: isDragOver ? accentColor : undefined }}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*,video/*"
                    style={{ display: "none" }}
                  />

                  <div className="dropzone-icon" style={{ backgroundColor: "rgba(34,211,238,0.1)", color: accentColor }}>
                    <Upload size={20} />
                  </div>
                  <h3 className="dropzone-title">
                    Drag & drop drone photo or video, or <span className="dropzone-link" style={{ color: accentColor }}>browse</span>
                  </h3>
                  <p className="dropzone-subtitle">
                    Accepts PNG, JPG, MP4, WebM — Aerial & drone imagery (Max 15MB)
                  </p>

                  <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", marginTop: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}>
                      <Image size={13} style={{ color: accentColor }} />
                      <span>Photos</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}>
                      <Video size={13} style={{ color: accentColor }} />
                      <span>Videos</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ======= RESULTS TAB ======= */}
      {activeView === "results" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          id="drone-report-dashboard"
        >
          {!scanResult ? (
            <div className="card" style={{ padding: "3rem", textAlign: "center", color: "var(--muted-foreground)", borderRadius: "6px" }}>
              <Camera size={36} style={{ margin: "0 auto 1rem", opacity: 0.35 }} />
              <p style={{ fontSize: "0.9rem", fontWeight: "500" }}>No scan results yet</p>
              <p style={{ fontSize: "0.78rem", marginTop: "0.25rem" }}>Upload a drone photo or video from the "New Scan" tab to get started.</p>
              <button onClick={() => setActiveView("upload")} className="btn btn-primary" style={{ marginTop: "1.25rem" }}>
                Go to New Scan
              </button>
            </div>
          ) : (
            <>
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

              {/* Results Header */}
              <div className="results-header-bar">
                <div>
                  <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: accentColor, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "0.25rem" }}>
                    Drone Scan Output
                  </span>
                  <h2 style={{ fontSize: "1.5rem", fontWeight: "500" }}>{scanResult.name}</h2>
                </div>
                <div className="results-actions no-pdf">
                  <button onClick={() => { setScanResult(null); setUploadNotification({ type: null, message: "" }); setActiveView("upload"); }} className="btn btn-outline">
                    <RefreshCw size={12} /> New Scan
                  </button>
                  <button onClick={handleExportPDF} disabled={isExporting} className="btn btn-primary">
                    <FileDown size={12} />
                    {isExporting ? "Exporting..." : "Download PDF"}
                  </button>
                </div>
              </div>

              {/* Results Grid */}
              <div className="results-container" style={{ marginTop: "2rem" }}>
                {/* Visual Canvas */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  <div className="card">
                    <div className="card-header">
                      <div style={{ display: "flex", alignSelf: "center", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", fontFamily: "var(--font-mono)", fontWeight: "500" }}>
                        <Eye size={14} style={{ color: accentColor }} />
                        <span>Drone Visual Canvas</span>
                      </div>
                      <div className="no-pdf">
                        <div className="tabs-nav">
                          <button className={`tabs-btn ${viewMode === "side-by-side" ? "active" : ""}`} onClick={() => setViewMode("side-by-side")}>Compare</button>
                          <button className={`tabs-btn ${viewMode === "original" ? "active" : ""}`} onClick={() => setViewMode("original")}>Original</button>
                          <button className={`tabs-btn ${viewMode === "processed" ? "active" : ""}`} onClick={() => setViewMode("processed")}>Processed</button>
                        </div>
                      </div>
                    </div>
                    <div className="card-body" style={{ backgroundColor: "rgba(0,0,0,0.015)" }}>
                      {viewMode === "side-by-side" && (
                        <div className="image-canvas-grid">
                          <div className="canvas-img-wrapper">
                            <div className="canvas-img-label">Original Drone Capture</div>
                            <div className="canvas-image-box">
                              <img src={scanResult.originalImage} className="canvas-image" alt="Original drone capture" />
                            </div>
                          </div>
                          <div className="canvas-img-wrapper">
                            <div className="canvas-img-label">
                              <span>AI Diagnostic Overlay</span>
                              <span className="badge badge-low" style={{ fontSize: "8px", padding: "0.1rem 0.35rem" }}>PROCESSED</span>
                            </div>
                            <div className="canvas-image-box">
                              <img src={scanResult.processedImage} className="canvas-image" alt="AI processed drone capture" />
                            </div>
                          </div>
                        </div>
                      )}
                      {viewMode === "original" && (
                        <div className="single-img-canvas">
                          <img src={scanResult.originalImage} className="canvas-image" alt="Original" />
                          <div style={{ position: "absolute", top: "12px", left: "12px", background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontFamily: "var(--font-mono)", fontSize: "9px", padding: "4px 8px", textTransform: "uppercase" }}>
                            Drone Raw Feed
                          </div>
                        </div>
                      )}
                      {viewMode === "processed" && (
                        <div className="single-img-canvas">
                          <img src={scanResult.processedImage} className="canvas-image" alt="Processed" />
                          <div style={{ position: "absolute", top: "12px", left: "12px", background: "rgba(34,211,238,0.15)", backdropFilter: "blur(4px)", border: `1px solid ${accentColor}`, color: "#fff", fontFamily: "var(--font-mono)", fontSize: "9px", padding: "4px 8px", textTransform: "uppercase" }}>
                            AI Overlays Active
                          </div>
                          <div className="scan-laser-line"></div>
                        </div>
                      )}
                    </div>
                    <div className="card-footer">
                      <span>Source: Drone Aerial Sensor</span>
                      <span>Location: {scanResult.location || "Unspecified"}</span>
                    </div>
                  </div>
                </div>

                {/* Classification Details */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  {/* Status Card */}
                  <div className="card">
                    <div className="card-header">
                      <div className="card-title">Diagnostic Status</div>
                    </div>
                    <div className="card-body">
                      <div className="info-row">
                        <div>
                          <div className="info-label" style={{ fontFamily: "var(--font-mono)" }}>Overall Severity</div>
                          <div className="info-value" style={{ marginTop: "0.2rem", fontWeight: "600" }}>
                            {scanResult.overallSeverity === "Critical" && "IMMEDIATE REPAIR REQUIRED"}
                            {scanResult.overallSeverity === "Warning" && "SCHEDULED REPAIR PLAN"}
                            {scanResult.overallSeverity === "Low" && "OBSERVATION ONLY"}
                            {scanResult.overallSeverity === "None" && "STABLE SYSTEM"}
                          </div>
                        </div>
                        <div>{getSeverityBadge(scanResult.overallSeverity)}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1.5rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
                          <span style={{ color: "var(--muted-foreground)" }}>AI Confidence</span>
                          <span style={{ color: accentColor, fontWeight: "bold" }}>{scanResult.overallConfidence}%</span>
                        </div>
                        <div className="progress-bar-track">
                          <div className="progress-bar-fill" style={{ width: `${scanResult.overallConfidence}%`, background: `linear-gradient(90deg, ${accentColor}, #4589ff)` }}></div>
                        </div>
                      </div>
                      {scanResult.defectArea !== undefined && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1.5rem", borderTop: "1px dashed var(--border)", paddingTop: "1rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
                            <span style={{ color: "var(--muted-foreground)" }}>Defect Area Ratio</span>
                            <span style={{ color: "var(--critical)", fontWeight: "bold" }}>{scanResult.defectArea}%</span>
                          </div>
                          <div className="progress-bar-track">
                            <div className="progress-bar-fill" style={{ width: `${Math.min(100, scanResult.defectArea * 25)}%`, backgroundColor: "var(--critical)" }}></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="card">
                    <div className="card-header">
                      <div className="card-title">
                        <ShieldAlert size={14} style={{ color: accentColor, marginRight: "4px" }} />
                        Summary Generated using IBM Granite
                      </div>
                    </div>
                    <div className="card-body" style={{ padding: "1.25rem" }}>
                      <p className="summary-block">{scanResult.summary}</p>
                    </div>
                  </div>

                  {/* Defects Table */}
                  <div className="card">
                    <div className="card-header">
                      <div className="card-title">
                        <FileText size={14} style={{ color: accentColor, marginRight: "4px" }} />
                        Defects Log ({scanResult.defects.length})
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
                            {scanResult.defects.map((defect) => (
                              <React.Fragment key={defect.id}>
                                <tr>
                                  <td style={{ fontFamily: "var(--font-mono)", fontWeight: "600", color: accentColor }}>{defect.id}</td>
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
            </>
          )}
        </motion.div>
      )}

      {/* ======= HISTORY TAB ======= */}
      {activeView === "history" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {historyLoading ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}>
              Loading scan history...
            </div>
          ) : pastScans.length === 0 ? (
            <div className="card" style={{ padding: "3rem", textAlign: "center", color: "var(--muted-foreground)", borderRadius: "6px" }}>
              <Camera size={32} style={{ margin: "0 auto 0.75rem", opacity: 0.35 }} />
              <p style={{ fontSize: "0.9rem", fontWeight: "500" }}>No drone scans yet</p>
              <p style={{ fontSize: "0.78rem", marginTop: "0.25rem" }}>Your uploaded drone scans will appear here.</p>
            </div>
          ) : (
            <div className="card" style={{ borderRadius: "8px", overflow: "hidden" }}>
              <div className="anomalies-table-wrapper">
                <table className="anomalies-table" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th>Report ID</th>
                      <th>Location</th>
                      <th>Severity</th>
                      <th>Status</th>
                      <th>Inspector</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastScans.map(scan => (
                      <tr key={scan.id}>
                        <td style={{ fontFamily: "var(--font-mono)", fontWeight: "bold", color: accentColor }}>{scan.id}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontWeight: "500" }}>
                            <MapPin size={12} style={{ color: accentColor, flexShrink: 0 }} />
                            <span>{scan.location}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`severity-indicator-dot ${scan.overallSeverity.toLowerCase()}`}></span>
                          <strong style={{ fontSize: "0.8rem" }}>{scan.overallSeverity}</strong>
                        </td>
                        <td>
                          <span style={{
                            padding: "0.2rem 0.5rem",
                            fontSize: "0.7rem",
                            fontFamily: "var(--font-mono)",
                            fontWeight: "bold",
                            borderRadius: "2px",
                            backgroundColor:
                              scan.status === "Pending Assignment" ? "var(--warning-bg)" :
                                scan.status === "In Progress" ? "var(--low-bg)" : "rgba(36, 161, 72, 0.15)",
                            color:
                              scan.status === "Pending Assignment" ? "var(--warning)" :
                                scan.status === "In Progress" ? "var(--primary)" : "#24a148"
                          }}>
                            {scan.status}
                          </span>
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>{scan.assigned_inspector}</td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--muted-foreground)" }}>
                          {new Date(scan.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </td>
                        <td>
                          <button
                            onClick={() => setSelectedHistoryReport(scan)}
                            className="btn btn-outline"
                            style={{ padding: "0.3rem 0.5rem", fontSize: "0.7rem", display: "flex", alignItems: "center", gap: "4px" }}
                          >
                            <Eye size={12} />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ======= LIVE SCAN TAB ======= */}
      {activeView === "live" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "0.5rem" }}>
              <Radio size={22} style={{ color: liveActive ? "#da1e28" : accentColor }} className={liveActive ? "animate-pulse" : ""} />
              <h1 style={{ fontSize: "1.6rem", fontWeight: "700", letterSpacing: "-0.5px" }}>
                Live Crack Detection
              </h1>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--muted-foreground)", marginBottom: "1.5rem" }}>
              Point your camera at a surface to detect cracks in real time using computer vision.
            </p>

            {/* Controls */}
            <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
              {!liveActive ? (
                <button onClick={startLiveCamera} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0.6rem 1.5rem", fontSize: "0.85rem", background: `linear-gradient(135deg, ${accentColor}, #4589ff)` }}>
                  <Camera size={16} />
                  Start Camera
                </button>
              ) : (
                <button onClick={stopLiveCamera} className="btn btn-outline" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0.6rem 1.5rem", fontSize: "0.85rem", color: "var(--critical)", borderColor: "rgba(218,30,40,0.5)" }}>
                  <Camera size={16} />
                  Stop Camera
                </button>
              )}
            </div>

            {liveError && (
              <div className="card" style={{ borderColor: "var(--critical)", marginBottom: "1.5rem" }}>
                <div className="card-body" style={{ padding: "1.25rem", textAlign: "center" }}>
                  <ShieldAlert size={20} style={{ color: "var(--critical)", margin: "0 auto 0.5rem" }} />
                  <p style={{ fontSize: "0.85rem", color: "var(--critical)" }}>{liveError}</p>
                  <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginTop: "0.5rem" }}>Make sure your browser has camera permissions enabled.</p>
                </div>
              </div>
            )}

            {/* Video Feed + Canvas Overlay */}
            <div className="card" style={{ overflow: "hidden", borderRadius: "8px", borderColor: liveActive ? (liveDetections.length > 0 ? "var(--critical)" : "rgba(34,211,238,0.4)") : "var(--border)", transition: "border-color 0.3s ease" }}>
              <div style={{ position: "relative", width: "100%", backgroundColor: "#0a0a0a", minHeight: "360px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {!liveActive && !liveError && (
                  <div style={{ textAlign: "center", padding: "3rem", color: "var(--muted-foreground)" }}>
                    <Camera size={48} style={{ opacity: 0.25, margin: "0 auto 1rem" }} />
                    <p style={{ fontSize: "0.9rem", fontWeight: 500 }}>Camera Offline</p>
                    <p style={{ fontSize: "0.78rem", marginTop: "0.25rem" }}>Click "Start Camera" to begin real-time crack detection.</p>
                  </div>
                )}
                <video
                  ref={liveVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: "100%",
                    display: liveActive ? "block" : "none",
                    objectFit: "contain",
                    maxHeight: "480px"
                  }}
                />
                <canvas
                  ref={liveCanvasRef}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                    display: liveActive ? "block" : "none"
                  }}
                />
                {/* Live badge */}
                {liveActive && (
                  <div style={{ position: "absolute", top: "12px", left: "12px", display: "flex", alignItems: "center", gap: "6px", backgroundColor: "rgba(0,0,0,0.7)", padding: "4px 10px", borderRadius: "4px", fontSize: "0.7rem", fontFamily: "var(--font-mono)" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#da1e28", display: "inline-block", animation: "pulse 1.5s infinite" }}></span>
                    <span style={{ color: "#fff", fontWeight: 600 }}>LIVE</span>
                    <span style={{ color: "var(--muted-foreground)" }}>~{liveFps} FPS</span>
                  </div>
                )}
              </div>
            </div>

            {/* Detection Stats & Surface Status Panel */}
            {liveActive && (
              <>
                <div className="card" style={{ marginTop: "1rem", borderRadius: "6px", border: `1px solid ${liveDetections.length > 0 ? "var(--warning)" : "#24a148"}` }}>
                  <div className="card-body" style={{ padding: "0.85rem 1rem", textAlign: "left" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {liveDetections.length > 0 ? (
                          <AlertTriangle size={18} style={{ color: "var(--warning)" }} />
                        ) : (
                          <CheckCircle size={18} style={{ color: "#24a148" }} />
                        )}
                        <span style={{ fontSize: "0.85rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: liveDetections.length > 0 ? "var(--warning)" : "#24a148" }}>
                          {liveEvalStatus}
                        </span>
                      </div>
                      {liveEvalProgress > 0 && (
                        <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: accentColor, fontWeight: "bold" }}>
                          {liveEvalProgress}%
                        </span>
                      )}
                    </div>
                    {liveEvalProgress > 0 && (
                      <div style={{ width: "100%", height: "4px", backgroundColor: "var(--muted)", borderRadius: "2px", marginTop: "8px", overflow: "hidden" }}>
                        <div style={{ width: `${liveEvalProgress}%`, height: "100%", backgroundColor: accentColor, transition: "width 0.3s ease" }}></div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginTop: "0.75rem" }}>
                  <div className="card" style={{ borderRadius: "6px" }}>
                    <div className="card-body" style={{ padding: "0.75rem", textAlign: "center" }}>
                      <div style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono)", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.25rem" }}>Surface State</div>
                      <div style={{ fontSize: "0.9rem", fontWeight: 700, color: liveDetections.length > 0 ? "var(--warning)" : "#24a148" }}>
                        {liveDetections.length > 0 ? "SUSPECT CRACK" : "SURFACE CLEAR"}
                      </div>
                    </div>
                  </div>
                  <div className="card" style={{ borderRadius: "6px" }}>
                    <div className="card-body" style={{ padding: "0.75rem", textAlign: "center" }}>
                      <div style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono)", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.25rem" }}>Live Defects</div>
                      <div style={{ fontSize: "1.25rem", fontWeight: 700, color: accentColor }}>
                        {liveDetections.length}
                      </div>
                    </div>
                  </div>
                  <div className="card" style={{ borderRadius: "6px" }}>
                    <div className="card-body" style={{ padding: "0.75rem", textAlign: "center" }}>
                      <div style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono)", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.25rem" }}>Total Dispatched</div>
                      <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#24a148" }}>
                        {liveCrackCount}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Detection List */}
            {liveActive && liveDetections.length > 0 && (
              <div className="card" style={{ marginTop: "0.75rem", borderRadius: "6px", textAlign: "left" }}>
                <div className="card-body" style={{ padding: "0.75rem" }}>
                  <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: accentColor, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.5rem" }}>Current Frame Detections</div>
                  {liveDetections.map((d: any, i: number) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.35rem 0", borderBottom: i < liveDetections.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <AlertTriangle size={12} style={{ color: d.severity === "Critical" ? "var(--critical)" : d.severity === "Warning" ? "var(--warning)" : accentColor }} />
                        <span style={{ fontSize: "0.78rem", fontFamily: "var(--font-mono)" }}>{d.type || "Crack"}</span>
                      </div>
                      <span className={`badge badge-${d.severity?.toLowerCase() || "low"}`} style={{ fontSize: "0.65rem" }}>
                        {d.severity} — {Math.round((d.confidence || 0) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Auto-Capture Notification Toast */}
            <AnimatePresence>
              {liveCaptureNotification && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    marginTop: "1rem",
                    padding: "0.85rem 1.25rem",
                    borderRadius: "8px",
                    backgroundColor: "rgba(36, 161, 72, 0.12)",
                    border: "1px solid rgba(36, 161, 72, 0.4)",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    textAlign: "left"
                  }}
                >
                  <CheckCircle size={18} style={{ color: "#24a148", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#24a148" }}>Frame Sent to Inspector</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginTop: "2px" }}>{liveCaptureNotification.message}</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submitting indicator */}
            {liveCaptureSubmitting && (
              <div style={{ marginTop: "0.75rem", textAlign: "center", fontSize: "0.78rem", color: accentColor, fontFamily: "var(--font-mono)" }}>
                <RefreshCw size={14} className="animate-spin" style={{ display: "inline-block", marginRight: "6px", verticalAlign: "middle" }} />
                Capturing frame and sending to Inspector Queue...
              </div>
            )}

            {/* Last Capture Thumbnail */}
            {liveLastCapture && (
              <div className="card" style={{ marginTop: "1rem", borderRadius: "6px", borderColor: "rgba(36, 161, 72, 0.3)" }}>
                <div className="card-body" style={{ padding: "0.75rem" }}>
                  <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "#24a148", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "6px" }}>
                    <CheckCircle size={12} />
                    Last Captured Frame — Sent to Inspector
                  </div>
                  <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                    <img
                      src={liveLastCapture.imageData}
                      alt="Last captured frame"
                      style={{ width: "160px", height: "100px", objectFit: "cover", borderRadius: "4px", border: "1px solid var(--border)" }}
                    />
                    <div style={{ textAlign: "left", flex: 1 }}>
                      <div style={{ fontSize: "0.82rem", fontWeight: 600, fontFamily: "var(--font-mono)", color: "var(--primary)" }}>
                        {liveLastCapture.reportId}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginTop: "2px" }}>
                        Severity: <strong style={{ color: liveLastCapture.severity === "Critical" ? "var(--critical)" : liveLastCapture.severity === "Warning" ? "var(--warning)" : accentColor }}>{liveLastCapture.severity}</strong>
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", marginTop: "2px" }}>
                        {liveLastCapture.timestamp.toLocaleTimeString()}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", marginTop: "4px", fontStyle: "italic" }}>
                        Awaiting inspector approval
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* History Detail Modal */}
      <AnimatePresence>
        {selectedHistoryReport && (
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.8)", zIndex: 100, display: "flex", justifyContent: "center", alignItems: "center", padding: "1rem" }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card"
              style={{ width: "100%", maxWidth: "800px", maxHeight: "90vh", overflowY: "auto", borderRadius: "8px" }}
            >
              <div className="card-header" style={{ position: "sticky", top: 0, backgroundColor: "var(--card)", zIndex: 10 }}>
                <div>
                  <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: accentColor, fontWeight: "bold" }}>
                    DRONE SCAN — {selectedHistoryReport.id}
                  </span>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: "700" }}>{selectedHistoryReport.location}</h3>
                </div>
                <button onClick={() => setSelectedHistoryReport(null)} className="btn btn-outline" style={{ padding: "0.3rem 0.6rem" }}>Close</button>
              </div>
              <div className="card-body">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                  <div>
                    <div className="canvas-img-label" style={{ marginBottom: "0.25rem" }}>Original Drone Photo</div>
                    <img src={selectedHistoryReport.originalImage} alt="Original" style={{ width: "100%", borderRadius: "4px", border: "1px solid var(--border)" }} />
                  </div>
                  <div>
                    <div className="canvas-img-label" style={{ marginBottom: "0.25rem" }}>AI Processed</div>
                    <img src={selectedHistoryReport.processedImage} alt="Processed" style={{ width: "100%", borderRadius: "4px", border: "1px solid var(--border)" }} />
                  </div>
                </div>
                <div>
                  <h4 style={{ fontSize: "0.85rem", fontFamily: "var(--font-mono)", color: accentColor, textTransform: "uppercase", marginBottom: "0.5rem" }}>
                    AI Summary
                  </h4>
                  <p className="summary-block" style={{ fontSize: "0.85rem", padding: "1rem" }}>{selectedHistoryReport.summary}</p>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: "1rem", marginTop: "1rem" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                    Status: <strong>{selectedHistoryReport.status}</strong> — Inspector: <strong>{selectedHistoryReport.assigned_inspector}</strong>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
