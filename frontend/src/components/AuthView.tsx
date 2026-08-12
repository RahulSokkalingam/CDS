import React, { useState } from "react";
import axios from "axios";
import { getApiUrl } from "../api/client";
import { User, Lock, Mail, Shield, ArrowRight, Sparkles, Camera } from "lucide-react";
import { motion } from "framer-motion";

export interface UserData {
  id?: number;
  email: string;
  name: string;
  role: "normal" | "inspector" | "drone";
  is_admin?: boolean;
  approved?: boolean;
}

interface AuthViewProps {
  onAuthSuccess: (user: UserData) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess }) => {
  const [isSignUp, setIsSignUp] = useState<boolean>(true);
  const [role, setRole] = useState<"normal" | "inspector" | "drone">("normal");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [pendingApproval, setPendingApproval] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !password || (isSignUp && !name)) {
      setErrorMsg("Please fill out all required fields.");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const response = await axios.post(getApiUrl("/api/auth/signup"), {
          email,
          password,
          name,
          role
        });
        const user = response.data.user;
        // Inspector and drone accounts need admin approval before they can use the system
        if (role === "inspector" || role === "drone") {
          setPendingApproval(true);
          return;
        }
        onAuthSuccess(user);
      } else {
        const response = await axios.post(getApiUrl("/api/auth/login"), {
          email,
          password
        });
        onAuthSuccess(response.data.user);
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.detail || "Authentication failed. Please check your network and credentials.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // ---- Pending Approval Screen ----
  if (pendingApproval) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "75vh", padding: "1rem" }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="card"
          style={{ width: "100%", maxWidth: "460px", padding: "0.5rem", textAlign: "center" }}
        >
          <div className="card-body" style={{ padding: "2.5rem 2rem" }}>
            <div style={{
              width: "60px", height: "60px", borderRadius: "50%",
              backgroundColor: "rgba(255,165,0,0.1)", border: "2px solid rgba(255,165,0,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 1.5rem", fontSize: "1.8rem"
            }}>
              ⏳
            </div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: "700", marginBottom: "0.75rem" }}>Pending Admin Approval</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: "1.5rem" }}>
              Your <strong style={{ color: "var(--foreground)" }}>{role === "inspector" ? "Manual Inspector" : "Drone Vision"}</strong> account has been created successfully.
              The admin (<strong style={{ color: "var(--primary)" }}>admin@email.com</strong>) needs to approve your account before you can sign in.
            </p>
            <div style={{
              backgroundColor: "rgba(255,165,0,0.07)",
              border: "1px solid rgba(255,165,0,0.3)",
              borderRadius: "4px",
              padding: "0.85rem 1rem",
              fontSize: "0.78rem",
              fontFamily: "var(--font-mono)",
              color: "#ffaa00",
              marginBottom: "1.5rem"
            }}>
              Account: {email}
            </div>
            <button
              onClick={() => { setPendingApproval(false); setIsSignUp(false); }}
              className="btn btn-outline"
              style={{ width: "100%" }}
            >
              Back to Sign In
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "75vh", padding: "1rem" }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="card"
        style={{ width: "100%", maxWidth: "520px", padding: "0.5rem", borderRadius: "8px", boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}
      >
        <div className="card-header" style={{ borderBottom: "1px solid var(--border)", paddingBottom: "1.25rem" }}>
          <div style={{ textAlign: "center", width: "100%" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "rgba(69, 137, 255, 0.1)", border: "1px solid rgba(69, 137, 255, 0.2)", borderRadius: "20px", padding: "4px 12px", marginBottom: "0.75rem", fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--primary)" }}>
              <Sparkles size={12} />
              <span>CDS Diagnostic Authentication</span>
            </div>
            <h2 style={{ fontSize: "1.4rem", fontWeight: "700", letterSpacing: "-0.5px" }}>
              {isSignUp ? "Create your CDS Account" : "Sign In to CDS Portal"}
            </h2>
            <p style={{ fontSize: "0.8rem", color: "var(--muted-foreground)", marginTop: "0.25rem" }}>
              {isSignUp ? "Select your account type to get started" : "Access your inspection reports and assigner dashboard"}
            </p>
          </div>
        </div>

        <div className="card-body" style={{ paddingTop: "1.5rem" }}>
          {/* Mode Switcher Tabs */}
          <div style={{ display: "flex", backgroundColor: "var(--muted)", borderRadius: "4px", padding: "3px", marginBottom: "1.5rem" }}>
            <button
              type="button"
              onClick={() => { setIsSignUp(false); setErrorMsg(null); }}
              style={{
                flex: 1,
                padding: "0.5rem",
                border: "none",
                borderRadius: "4px",
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
                fontWeight: "600",
                cursor: "pointer",
                backgroundColor: !isSignUp ? "var(--card)" : "transparent",
                color: !isSignUp ? "var(--foreground)" : "var(--muted-foreground)",
                transition: "all 0.2s ease"
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsSignUp(true); setErrorMsg(null); }}
              style={{
                flex: 1,
                padding: "0.5rem",
                border: "none",
                borderRadius: "4px",
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
                fontWeight: "600",
                cursor: "pointer",
                backgroundColor: isSignUp ? "var(--card)" : "transparent",
                color: isSignUp ? "var(--foreground)" : "var(--muted-foreground)",
                transition: "all 0.2s ease"
              }}
            >
              Sign Up
            </button>
          </div>

          {errorMsg && (
            <div style={{ backgroundColor: "var(--critical-bg)", border: "1px solid var(--critical)", color: "var(--critical)", borderRadius: "4px", padding: "0.75rem", fontSize: "0.8rem", marginBottom: "1.25rem" }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Role Selection (Only shown during Sign Up) */}
            {isSignUp && (
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--muted-foreground)", marginBottom: "0.5rem", textTransform: "uppercase" }}>
                  Select Account Role:
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.6rem" }}>
                  {/* Public Reporter */}
                  <div 
                    onClick={() => setRole("normal")}
                    style={{
                      border: `1.5px solid ${role === "normal" ? "var(--primary)" : "var(--border)"}`,
                      backgroundColor: role === "normal" ? "rgba(69, 137, 255, 0.08)" : "var(--muted)",
                      borderRadius: "6px",
                      padding: "0.75rem 0.5rem",
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <User size={18} style={{ margin: "0 auto 0.35rem", color: role === "normal" ? "var(--primary)" : "var(--muted-foreground)" }} />
                    <div style={{ fontWeight: "600", fontSize: "0.75rem", color: role === "normal" ? "var(--foreground)" : "var(--muted-foreground)" }}>
                      Public Reporter
                    </div>
                    <div style={{ fontSize: "0.6rem", color: "var(--muted-foreground)", marginTop: "0.2rem" }}>
                      Upload bridge photos
                    </div>
                  </div>

                  {/* Drone Vision */}
                  <div 
                    onClick={() => setRole("drone")}
                    style={{
                      border: `1.5px solid ${role === "drone" ? "#22d3ee" : "var(--border)"}`,
                      backgroundColor: role === "drone" ? "rgba(34, 211, 238, 0.08)" : "var(--muted)",
                      borderRadius: "6px",
                      padding: "0.75rem 0.5rem",
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <Camera size={18} style={{ margin: "0 auto 0.35rem", color: role === "drone" ? "#22d3ee" : "var(--muted-foreground)" }} />
                    <div style={{ fontWeight: "600", fontSize: "0.75rem", color: role === "drone" ? "var(--foreground)" : "var(--muted-foreground)" }}>
                      Drone Vision
                    </div>
                    <div style={{ fontSize: "0.6rem", color: "var(--muted-foreground)", marginTop: "0.2rem" }}>
                      Aerial imagery & video
                    </div>
                  </div>

                  {/* Manual Inspector */}
                  <div 
                    onClick={() => setRole("inspector")}
                    style={{
                      border: `1.5px solid ${role === "inspector" ? "var(--primary)" : "var(--border)"}`,
                      backgroundColor: role === "inspector" ? "rgba(69, 137, 255, 0.08)" : "var(--muted)",
                      borderRadius: "6px",
                      padding: "0.75rem 0.5rem",
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <Shield size={18} style={{ margin: "0 auto 0.35rem", color: role === "inspector" ? "var(--primary)" : "var(--muted-foreground)" }} />
                    <div style={{ fontWeight: "600", fontSize: "0.75rem", color: role === "inspector" ? "var(--foreground)" : "var(--muted-foreground)" }}>
                      Manual Inspector
                    </div>
                    <div style={{ fontSize: "0.6rem", color: "var(--muted-foreground)", marginTop: "0.2rem" }}>
                      Review & assign reports
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isSignUp && (
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--muted-foreground)", marginBottom: "0.35rem", textTransform: "uppercase" }}>
                  Full Name
                </label>
                <div style={{ position: "relative" }}>
                  <User size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    required={isSignUp}
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.75rem 0.65rem 2.4rem",
                      backgroundColor: "var(--muted)",
                      border: "1px solid var(--border)",
                      color: "var(--foreground)",
                      fontSize: "0.85rem",
                      outline: "none"
                    }}
                  />
                </div>
              </div>
            )}

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--muted-foreground)", marginBottom: "0.35rem", textTransform: "uppercase" }}>
                Email Address
              </label>
              <div style={{ position: "relative" }}>
                <Mail size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  style={{
                    width: "100%",
                    padding: "0.65rem 0.75rem 0.65rem 2.4rem",
                    backgroundColor: "var(--muted)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                    fontSize: "0.85rem",
                    outline: "none"
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--muted-foreground)", marginBottom: "0.35rem", textTransform: "uppercase" }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <Lock size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: "100%",
                    padding: "0.65rem 0.75rem 0.65rem 2.4rem",
                    backgroundColor: "var(--muted)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                    fontSize: "0.85rem",
                    outline: "none"
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: "100%", padding: "0.75rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}
            >
              <span>{loading ? "Authenticating..." : isSignUp ? "Create Account" : "Sign In"}</span>
              <ArrowRight size={14} />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
