import React, { useState, useEffect } from "react";
import axios from "axios";
import { getApiUrl } from "../api/client";
import { Shield, MapPin, AlertTriangle, CheckCircle, Clock, Search, Eye, UserCheck, RefreshCw, UserPlus, UserX, Users, ShieldCheck, Check, XCircle, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { UserData } from "./AuthView";

export interface DBReport {
  id: string;
  user_email: string;
  user_name: string;
  location: string;
  originalImage: string;
  processedImage: string;
  has_crack: boolean;
  overallSeverity: "Critical" | "Warning" | "Low" | "None";
  overallConfidence: number;
  summary: string;
  defects: any[];
  status: string;
  assigned_inspector: string;
  source?: string;
  created_at: string;
}

interface InspectorAccount {
  id: number;
  email: string;
  name: string;
  role: string;
  is_admin: boolean;
  approved: boolean;
  created_at: string;
}

interface InspectorDashboardProps {
  currentUser: UserData;
}

export const InspectorDashboard: React.FC<InspectorDashboardProps> = ({ currentUser }) => {
  const [reports, setReports] = useState<DBReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedReport, setSelectedReport] = useState<DBReport | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  // Admin panel state
  const isAdmin = currentUser.is_admin === true;
  const [activeTab, setActiveTab] = useState<"reports" | "inspectors">("reports");
  const [inspectors, setInspectors] = useState<InspectorAccount[]>([]);
  const [inspectorsLoading, setInspectorsLoading] = useState<boolean>(false);
  const [approvalAction, setApprovalAction] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await axios.get(getApiUrl("/api/reports?is_inspector=true"));
      setReports(response.data.reports || []);
    } catch (err) {
      console.error("Failed to fetch reports:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInspectors = async () => {
    setInspectorsLoading(true);
    try {
      const response = await axios.get(getApiUrl("/api/admin/inspectors"));
      setInspectors(response.data.inspectors || []);
    } catch (err) {
      console.error("Failed to fetch inspectors:", err);
    } finally {
      setInspectorsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    if (isAdmin) {
      fetchInspectors();
    }
  }, []);

  const handleUpdateStatus = async (reportId: string, newStatus: string, inspectorName?: string) => {
    setAssigningId(reportId);
    try {
      await axios.post(getApiUrl("/api/reports/assign"), {
        report_id: reportId,
        status: newStatus,
        assigned_inspector: inspectorName || currentUser.name
      });
      await fetchReports();
      if (selectedReport && selectedReport.id === reportId) {
        setSelectedReport(prev => prev ? { ...prev, status: newStatus, assigned_inspector: inspectorName || currentUser.name } : null);
      }
    } catch (err) {
      console.error("Failed to update report assignment:", err);
    } finally {
      setAssigningId(null);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    try {
      await axios.delete(getApiUrl(`/api/reports/${reportId}`));
      await fetchReports();
      if (selectedReport && selectedReport.id === reportId) {
        setSelectedReport(null);
      }
    } catch (err) {
      console.error("Failed to delete report:", err);
    }
  };

  const handleApproveInspector = async (email: string, approve: boolean) => {
    setApprovalAction(email);
    try {
      await axios.post(getApiUrl("/api/admin/approve-inspector"), {
        email,
        approve
      });
      await fetchInspectors();
    } catch (err) {
      console.error("Failed to approve/reject inspector:", err);
    } finally {
      setApprovalAction(null);
    }
  };

  const filteredReports = reports.filter(r => {
    const matchesStatus = statusFilter === "All" || r.status === statusFilter;
    const matchesQuery = 
      r.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesQuery;
  });

  const totalReports = reports.length;
  const pendingReports = reports.filter(r => r.status === "Pending Assignment").length;
  const inProgressReports = reports.filter(r => r.status === "In Progress").length;
  const resolvedReports = reports.filter(r => r.status === "Resolved").length;

  const pendingInspectors = inspectors.filter(i => !i.approved && !i.is_admin);

  return (
    <div style={{ width: "100%", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header Banner */}
      <div className="card" style={{ marginBottom: "1.5rem", borderRadius: "8px" }}>
        <div className="card-body" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: isAdmin ? "#f5a623" : "var(--primary)", fontFamily: "var(--font-mono)", fontSize: "0.75rem", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>
              {isAdmin ? <ShieldCheck size={16} /> : <Shield size={16} />}
              <span>{isAdmin ? "Admin Control Center" : "Inspector Assigner Portal"}</span>
            </div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginTop: "0.2rem" }}>
              {isAdmin ? "Admin Dashboard — Inspector & Report Management" : "Bridge Crack Field Dispatch & Assignment"}
            </h2>
            <p style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
              Logged in as {isAdmin ? "Admin" : "Inspector"} <strong style={{ color: "var(--foreground)" }}>{currentUser.name}</strong> ({currentUser.email})
            </p>
          </div>

          <button onClick={() => { fetchReports(); if (isAdmin) fetchInspectors(); }} className="btn btn-outline" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <RefreshCw size={13} className={loading || inspectorsLoading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Admin Tab Navigation */}
      {isAdmin && (
        <div style={{ display: "flex", backgroundColor: "var(--muted)", borderRadius: "6px", padding: "4px", marginBottom: "1.5rem" }}>
          <button
            type="button"
            onClick={() => setActiveTab("reports")}
            style={{
              flex: 1,
              padding: "0.65rem 1rem",
              border: "none",
              borderRadius: "4px",
              fontFamily: "var(--font-mono)",
              fontSize: "0.78rem",
              fontWeight: "600",
              cursor: "pointer",
              backgroundColor: activeTab === "reports" ? "var(--card)" : "transparent",
              color: activeTab === "reports" ? "var(--foreground)" : "var(--muted-foreground)",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: activeTab === "reports" ? "0 1px 4px rgba(0,0,0,0.15)" : "none"
            }}
          >
            <Eye size={14} />
            Reports Queue
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("inspectors")}
            style={{
              flex: 1,
              padding: "0.65rem 1rem",
              border: "none",
              borderRadius: "4px",
              fontFamily: "var(--font-mono)",
              fontSize: "0.78rem",
              fontWeight: "600",
              cursor: "pointer",
              backgroundColor: activeTab === "inspectors" ? "var(--card)" : "transparent",
              color: activeTab === "inspectors" ? "var(--foreground)" : "var(--muted-foreground)",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: activeTab === "inspectors" ? "0 1px 4px rgba(0,0,0,0.15)" : "none",
              position: "relative"
            }}
          >
            <Users size={14} />
            Manage Inspectors
            {pendingInspectors.length > 0 && (
              <span style={{
                backgroundColor: "#da1e28",
                color: "#fff",
                borderRadius: "10px",
                padding: "1px 7px",
                fontSize: "0.65rem",
                fontWeight: "bold",
                minWidth: "18px",
                textAlign: "center",
                lineHeight: "1.4"
              }}>
                {pendingInspectors.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* ====== INSPECTORS MANAGEMENT TAB (Admin Only) ====== */}
      {isAdmin && activeTab === "inspectors" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Pending Approval Section */}
          <div className="card" style={{ marginBottom: "1.5rem", borderRadius: "8px", borderColor: pendingInspectors.length > 0 ? "rgba(239, 138, 0, 0.4)" : "var(--border)" }}>
            <div className="card-header" style={{ borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <UserPlus size={15} style={{ color: "#ef8a00" }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", fontWeight: "600" }}>
                  Pending Approval Requests
                </span>
                <span style={{
                  backgroundColor: pendingInspectors.length > 0 ? "rgba(239, 138, 0, 0.15)" : "var(--muted)",
                  color: pendingInspectors.length > 0 ? "#ef8a00" : "var(--muted-foreground)",
                  borderRadius: "10px",
                  padding: "1px 8px",
                  fontSize: "0.7rem",
                  fontWeight: "bold",
                  fontFamily: "var(--font-mono)"
                }}>
                  {pendingInspectors.length}
                </span>
              </div>
            </div>
            <div className="card-body" style={{ padding: pendingInspectors.length === 0 ? "2rem" : "0" }}>
              {inspectorsLoading ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "var(--muted-foreground)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
                  Loading pending requests...
                </div>
              ) : pendingInspectors.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--muted-foreground)" }}>
                  <CheckCircle size={28} style={{ margin: "0 auto 0.75rem", opacity: 0.4, display: "block" }} />
                  <p style={{ fontSize: "0.85rem", fontWeight: "500" }}>No pending requests</p>
                  <p style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>All inspector sign-up requests have been processed.</p>
                </div>
              ) : (
                <div>
                  {pendingInspectors.map((inspector, idx) => (
                    <div
                      key={inspector.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "1rem 1.25rem",
                        borderBottom: idx < pendingInspectors.length - 1 ? "1px solid var(--border)" : "none",
                        gap: "1rem",
                        flexWrap: "wrap"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: "200px" }}>
                        <div style={{
                          width: "38px", height: "38px", borderRadius: "50%",
                          backgroundColor: "rgba(239, 138, 0, 0.1)",
                          border: "1.5px solid rgba(239, 138, 0, 0.35)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "0.85rem", fontWeight: "700", color: "#ef8a00",
                          flexShrink: 0
                        }}>
                          {inspector.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: "600", fontSize: "0.88rem" }}>{inspector.name}</div>
                          <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}>
                            {inspector.email}
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--muted-foreground)", minWidth: "120px", textAlign: "center" }}>
                        <Clock size={11} style={{ marginRight: "4px", verticalAlign: "middle" }} />
                        {new Date(inspector.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </div>

                      <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                        <button
                          onClick={() => handleApproveInspector(inspector.email, true)}
                          disabled={approvalAction === inspector.email}
                          className="btn btn-primary"
                          style={{
                            padding: "0.4rem 0.9rem",
                            fontSize: "0.75rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            backgroundColor: "#24a148",
                            borderColor: "#24a148"
                          }}
                        >
                          <UserCheck size={13} />
                          <span>{approvalAction === inspector.email ? "..." : "Approve"}</span>
                        </button>
                        <button
                          onClick={() => handleApproveInspector(inspector.email, false)}
                          disabled={approvalAction === inspector.email}
                          className="btn btn-outline"
                          style={{
                            padding: "0.4rem 0.9rem",
                            fontSize: "0.75rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            color: "#da1e28",
                            borderColor: "rgba(218, 30, 40, 0.4)"
                          }}
                        >
                          <UserX size={13} />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* All Inspectors List */}
          <div className="card" style={{ borderRadius: "8px" }}>
            <div className="card-header" style={{ borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Users size={15} style={{ color: "var(--primary)" }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", fontWeight: "600" }}>
                  All Inspector Accounts
                </span>
                <span style={{
                  backgroundColor: "var(--muted)",
                  color: "var(--muted-foreground)",
                  borderRadius: "10px",
                  padding: "1px 8px",
                  fontSize: "0.7rem",
                  fontWeight: "bold",
                  fontFamily: "var(--font-mono)"
                }}>
                  {inspectors.length}
                </span>
              </div>
            </div>
            <div className="card-body" style={{ padding: "0" }}>
              {inspectorsLoading ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "var(--muted-foreground)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
                  Loading inspectors...
                </div>
              ) : inspectors.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "var(--muted-foreground)" }}>
                  <p style={{ fontSize: "0.85rem" }}>No inspector accounts found.</p>
                </div>
              ) : (
                <div className="queue-table-wrapper">
                  <table className="queue-table" style={{ width: "100%" }}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Role</th>
                        <th>Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inspectors.map(insp => (
                        <tr key={insp.id}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <div style={{
                                width: "28px", height: "28px", borderRadius: "50%",
                                backgroundColor: insp.is_admin
                                  ? "rgba(245, 166, 35, 0.12)"
                                  : insp.approved
                                    ? "rgba(36, 161, 72, 0.12)"
                                    : "rgba(239, 138, 0, 0.12)",
                                border: `1.5px solid ${insp.is_admin
                                  ? "rgba(245, 166, 35, 0.4)"
                                  : insp.approved
                                    ? "rgba(36, 161, 72, 0.4)"
                                    : "rgba(239, 138, 0, 0.4)"}`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: "0.7rem", fontWeight: "700",
                                color: insp.is_admin ? "#f5a623" : insp.approved ? "#24a148" : "#ef8a00",
                                flexShrink: 0
                              }}>
                                {insp.name.charAt(0).toUpperCase()}
                              </div>
                              <span style={{ fontWeight: "600", fontSize: "0.82rem" }}>{insp.name}</span>
                            </div>
                          </td>
                          <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                            {insp.email}
                          </td>
                          <td>
                            <span style={{
                              padding: "0.2rem 0.6rem",
                              fontSize: "0.68rem",
                              fontFamily: "var(--font-mono)",
                              fontWeight: "bold",
                              borderRadius: "3px",
                              backgroundColor: insp.is_admin
                                ? "rgba(245, 166, 35, 0.12)"
                                : insp.approved
                                  ? "rgba(36, 161, 72, 0.12)"
                                  : "rgba(239, 138, 0, 0.12)",
                              color: insp.is_admin
                                ? "#f5a623"
                                : insp.approved
                                  ? "#24a148"
                                  : "#ef8a00"
                            }}>
                              {insp.is_admin ? "ADMIN" : insp.approved ? "APPROVED" : "PENDING"}
                            </span>
                          </td>
                          <td style={{ fontSize: "0.78rem", fontFamily: "var(--font-mono)" }}>
                            {insp.is_admin ? (
                              <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#f5a623" }}>
                                <ShieldCheck size={12} />
                                Admin
                              </span>
                            ) : (
                              <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--muted-foreground)" }}>
                                <Shield size={12} />
                                Inspector
                              </span>
                            )}
                          </td>
                          <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--muted-foreground)" }}>
                            {new Date(insp.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ====== REPORTS QUEUE TAB ====== */}
      {(activeTab === "reports" || !isAdmin) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Metrics Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
            <div className="card" style={{ borderRadius: "6px" }}>
              <div className="card-body" style={{ padding: "1.25rem" }}>
                <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--muted-foreground)", textTransform: "uppercase" }}>Total Reports</div>
                <div style={{ fontSize: "1.75rem", fontWeight: "800", marginTop: "0.25rem" }}>{totalReports}</div>
              </div>
            </div>

            <div className="card" style={{ borderRadius: "6px", borderColor: pendingReports > 0 ? "var(--warning)" : "var(--border)" }}>
              <div className="card-body" style={{ padding: "1.25rem" }}>
                <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--warning)", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Clock size={12} />
                  <span>Pending Assignment</span>
                </div>
                <div style={{ fontSize: "1.75rem", fontWeight: "800", color: "var(--warning)", marginTop: "0.25rem" }}>{pendingReports}</div>
              </div>
            </div>

            <div className="card" style={{ borderRadius: "6px", borderColor: "var(--primary)" }}>
              <div className="card-body" style={{ padding: "1.25rem" }}>
                <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--primary)", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "4px" }}>
                  <UserCheck size={12} />
                  <span>In Progress</span>
                </div>
                <div style={{ fontSize: "1.75rem", fontWeight: "800", color: "var(--primary)", marginTop: "0.25rem" }}>{inProgressReports}</div>
              </div>
            </div>

            <div className="card" style={{ borderRadius: "6px" }}>
              <div className="card-body" style={{ padding: "1.25rem" }}>
                <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "#24a148", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "4px" }}>
                  <CheckCircle size={12} />
                  <span>Resolved</span>
                </div>
                <div style={{ fontSize: "1.75rem", fontWeight: "800", color: "#24a148", marginTop: "0.25rem" }}>{resolvedReports}</div>
              </div>
            </div>
          </div>

          {/* Filter & Search Toolbar */}
          <div className="card" style={{ marginBottom: "1.5rem", padding: "1rem", borderRadius: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
              <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto" }}>
                {["All", "Pending Assignment", "In Progress", "Resolved"].map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`btn ${statusFilter === st ? "btn-primary" : "btn-outline"}`}
                    style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem" }}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <div style={{ position: "relative", minWidth: "240px" }}>
                <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search location or reporter..."
                  style={{
                    width: "100%",
                    padding: "0.45rem 0.75rem 0.45rem 2.2rem",
                    backgroundColor: "var(--muted)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                    fontSize: "0.8rem",
                    outline: "none"
                  }}
                />
              </div>
            </div>
          </div>

          {/* Reports Table / Grid */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}>
              Loading inspection queue from database...
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="card" style={{ padding: "3rem", textAlign: "center", color: "var(--muted-foreground)", borderRadius: "6px" }}>
              <AlertTriangle size={32} style={{ margin: "0 auto 0.75rem", opacity: 0.5 }} />
              <p>No crack reports match the selected filters.</p>
            </div>
          ) : (
            <div className="card" style={{ borderRadius: "8px", overflow: "hidden" }}>
              <div className="queue-table-wrapper">
                <table className="queue-table" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th>Report ID</th>
                      <th>Source</th>
                      <th>Location</th>
                      <th>Reporter</th>
                      <th>AI Detection</th>
                      <th>Status</th>
                      <th>Assigned To</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.map(rep => (
                      <tr key={rep.id}>
                        <td style={{ fontFamily: "var(--font-mono)", fontWeight: "bold", color: "var(--primary)" }}>
                          {rep.id}
                        </td>
                        <td>
                          <span style={{
                            padding: "0.2rem 0.5rem",
                            fontSize: "0.68rem",
                            fontFamily: "var(--font-mono)",
                            fontWeight: "bold",
                            borderRadius: "3px",
                            backgroundColor: rep.source === "Drone Vision" ? "rgba(34, 211, 238, 0.12)" : "rgba(69, 137, 255, 0.12)",
                            color: rep.source === "Drone Vision" ? "#22d3ee" : "var(--primary)"
                          }}>
                            {rep.source || "Public Reporter"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontWeight: "500" }}>
                            <MapPin size={13} style={{ color: "var(--primary)", flexShrink: 0 }} />
                            <span>{rep.location}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: "0.8rem" }}>{rep.user_name}</div>
                          <div style={{ fontSize: "0.65rem", color: "var(--muted-foreground)" }}>{rep.user_email}</div>
                        </td>
                        <td>
                          <span className={`severity-indicator-dot ${rep.overallSeverity.toLowerCase()}`}></span>
                          <strong style={{ fontSize: "0.8rem" }}>{rep.overallSeverity}</strong>
                          <span style={{ fontSize: "0.7rem", color: "var(--muted-foreground)", marginLeft: "4px" }}>
                            ({rep.overallConfidence}%)
                          </span>
                        </td>
                        <td>
                          <span style={{
                            padding: "0.2rem 0.5rem",
                            fontSize: "0.7rem",
                            fontFamily: "var(--font-mono)",
                            fontWeight: "bold",
                            borderRadius: "2px",
                            backgroundColor: 
                              rep.status === "Pending Assignment" ? "var(--warning-bg)" :
                              rep.status === "In Progress" ? "var(--low-bg)" : "rgba(36, 161, 72, 0.15)",
                            color:
                              rep.status === "Pending Assignment" ? "var(--warning)" :
                              rep.status === "In Progress" ? "var(--primary)" : "#24a148"
                          }}>
                            {rep.status}
                          </span>
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
                          {rep.assigned_inspector}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "0.4rem" }}>
                            <button
                              onClick={() => setSelectedReport(rep)}
                              className="btn btn-outline"
                              style={{ padding: "0.3rem 0.5rem", fontSize: "0.7rem", display: "flex", alignItems: "center", gap: "4px" }}
                            >
                              <Eye size={12} />
                              <span>View</span>
                            </button>

                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteReport(rep.id)}
                                className="btn btn-outline"
                                style={{ padding: "0.3rem 0.5rem", fontSize: "0.7rem", color: "var(--critical)", borderColor: "rgba(218, 30, 40, 0.4)", display: "flex", alignItems: "center", gap: "4px" }}
                              >
                                <Trash2 size={12} />
                                <span>Delete</span>
                              </button>
                            )}

                            {rep.status === "Pending Assignment" && (
                              <>
                                <button
                                  onClick={() => handleUpdateStatus(rep.id, "In Progress", currentUser.name)}
                                  disabled={assigningId === rep.id}
                                  className="btn btn-primary"
                                  style={{ padding: "0.3rem 0.5rem", fontSize: "0.7rem", backgroundColor: "#24a148", borderColor: "#24a148", display: "flex", alignItems: "center", gap: "4px" }}
                                >
                                  <Check size={12} />
                                  <span>Confirm & Take</span>
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(rep.id, "Fake Crack")}
                                  disabled={assigningId === rep.id}
                                  className="btn btn-outline"
                                  style={{ padding: "0.3rem 0.5rem", fontSize: "0.7rem", color: "var(--critical)", borderColor: "rgba(218, 30, 40, 0.4)", display: "flex", alignItems: "center", gap: "4px" }}
                                >
                                  <XCircle size={12} />
                                  <span>Mark Fake</span>
                                </button>
                              </>
                            )}

                            {rep.status === "In Progress" && (
                              <button
                                onClick={() => handleUpdateStatus(rep.id, "Resolved")}
                                disabled={assigningId === rep.id}
                                className="btn btn-primary"
                                style={{ padding: "0.3rem 0.5rem", fontSize: "0.7rem", backgroundColor: "#24a148", borderColor: "#24a148", display: "flex", alignItems: "center", gap: "4px" }}
                              >
                                <CheckCircle size={12} />
                                <span>Resolve</span>
                              </button>
                            )}
                          </div>
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

      {/* Detailed Inspection Modal / Drawer */}
      <AnimatePresence>
        {selectedReport && (
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
                  <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--primary)", fontWeight: "bold" }}>
                    INSPECTOR REVIEW - {selectedReport.id}
                  </span>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: "700" }}>{selectedReport.location}</h3>
                </div>

                <button onClick={() => setSelectedReport(null)} className="btn btn-outline" style={{ padding: "0.3rem 0.6rem" }}>
                  Close
                </button>
              </div>

              <div className="card-body">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                  <div>
                    <div className="canvas-img-label" style={{ marginBottom: "0.25rem" }}>Original Photo</div>
                    <img src={selectedReport.originalImage} alt="Original" style={{ width: "100%", borderRadius: "4px", border: "1px solid var(--border)" }} />
                  </div>
                  <div>
                    <div className="canvas-img-label" style={{ marginBottom: "0.25rem" }}>Gemini 2.5 Flash Bounding Boxes</div>
                    <img src={selectedReport.processedImage} alt="AI Processed" style={{ width: "100%", borderRadius: "4px", border: "1px solid var(--border)" }} />
                  </div>
                </div>

                <div style={{ marginBottom: "1.5rem" }}>
                  <h4 style={{ fontSize: "0.85rem", fontFamily: "var(--font-mono)", color: "var(--primary)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                    AI Summary & Findings
                  </h4>
                  <p className="summary-block" style={{ fontSize: "0.85rem", padding: "1rem" }}>
                    {selectedReport.summary}
                  </p>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                    Reported by: <strong>{selectedReport.user_name}</strong> ({selectedReport.user_email})
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={() => handleUpdateStatus(selectedReport.id, "In Progress", currentUser.name)}
                      className="btn btn-primary"
                    >
                      Assign to {currentUser.name}
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedReport.id, "Resolved")}
                      className="btn btn-primary"
                      style={{ backgroundColor: "#24a148", borderColor: "#24a148" }}
                    >
                      Mark Resolved
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteReport(selectedReport.id)}
                        className="btn btn-outline"
                        style={{ color: "var(--critical)", borderColor: "rgba(218, 30, 40, 0.4)" }}
                      >
                        Delete
                      </button>
                    )}
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
