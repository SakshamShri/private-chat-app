import React, { useState } from "react";
import { Text } from "@chakra-ui/react";
import LoginPage from "../components/component/LoginPage";
import SignupPage from "../components/component/SignupPage";
import { useNavigate } from "react-router-dom";

const Homepage = () => {
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  const handleLoginSuccess = (userData) => {
    console.log("Login successful:", userData);
    setShowLogin(false);
    navigate('/chats');
  };

  const handleSignupSuccess = (userData) => {
    console.log("Signup successful:", userData);
    setShowSignup(false);
    navigate('/chats');
  };

  return (
    <div style={{ position: "relative", overflow: "hidden", minHeight: "100vh", width: "100%", background: "radial-gradient(80% 60% at 50% 0%, rgba(29,78,216,0.12) 0%, rgba(17,24,39,0.0) 60%), linear-gradient(135deg, #0b1220 0%, #0f172a 40%, #111827 100%)", color: "#e5e7eb" }}>
      <style>{`
        @keyframes floatSlow { 0% { transform: translateY(0px) translateX(0px); } 50% { transform: translateY(-12px) translateX(6px); } 100% { transform: translateY(0px) translateX(0px); } }
        @keyframes glowPulse { 0% { box-shadow: 0 0 0 rgba(29,78,216,0.0); } 50% { box-shadow: 0 10px 28px rgba(29,78,216,0.35); } 100% { box-shadow: 0 0 0 rgba(29,78,216,0.0); } }
        @keyframes fadeInUp { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes bgShift { 0% { filter: hue-rotate(0deg); } 100% { filter: hue-rotate(20deg); } }
        
        /* Responsive Design */
        @media (max-width: 1200px) {
          .container-responsive { max-width: 960px !important; }
        }
        
        @media (max-width: 992px) {
          .container-responsive { max-width: 720px !important; }
          .grid-responsive { grid-template-columns: 1fr !important; }
          .text-responsive-lg { font-size: 36px !important; }
          .padding-responsive { padding: 20px !important; }
        }
        
        @media (max-width: 768px) {
          .container-responsive { 
            max-width: 100% !important;
            padding: 16px 12px !important;
          }
          .header-responsive {
            flex-direction: column !important;
            gap: 16px !important;
            align-items: center !important;
            text-align: center !important;
          }
          .buttons-responsive {
            flex-direction: column !important;
            width: 100% !important;
          }
          .buttons-responsive button {
            width: 100% !important;
            justify-content: center !important;
          }
          .text-responsive-lg { font-size: 28px !important; }
          .text-responsive-md { font-size: 16px !important; }
          .text-responsive-sm { font-size: 12px !important; }
          .padding-responsive { padding: 16px !important; }
          .gap-responsive { gap: 16px !important; }
          .margin-responsive { margin-top: 16px !important; }
          .badges-responsive {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 8px !important;
          }
          .orb-hide { display: none !important; }
        }
        
        @media (max-width: 480px) {
          .text-responsive-lg { font-size: 24px !important; }
          .text-responsive-md { font-size: 14px !important; }
          .text-responsive-sm { font-size: 11px !important; }
          .padding-responsive { padding: 12px !important; }
          .modal-responsive {
            width: 95% !important;
            margin: 8px !important;
          }
        }
      `}</style>

      {/* Decorative animated orbs */}
      <div className="orb-hide" style={{ position: "absolute", top: -120, left: -80, width: 260, height: 260, background: "radial-gradient(circle at 30% 30%, rgba(59,130,246,0.35), rgba(59,130,246,0) 60%)", filter: "blur(30px)", animation: "floatSlow 9s ease-in-out infinite" }}></div>
      <div className="orb-hide" style={{ position: "absolute", bottom: -120, right: -80, width: 300, height: 300, background: "radial-gradient(circle at 60% 60%, rgba(168,85,247,0.28), rgba(168,85,247,0) 60%)", filter: "blur(36px)", animation: "floatSlow 10s ease-in-out infinite reverse" }}></div>
      <div className="orb-hide" style={{ position: "absolute", top: 180, right: 120, width: 180, height: 180, background: "radial-gradient(circle at 50% 50%, rgba(34,197,94,0.22), rgba(34,197,94,0) 60%)", filter: "blur(28px)", animation: "floatSlow 8s ease-in-out infinite" }}></div>

      <div className="container-responsive" style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 16px", animation: "fadeInUp 600ms ease-out" }}>
        <div className="header-responsive" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", letterSpacing: 0.5 }}>PC</div>
            <div>
              <Text fontSize="2xl" fontFamily="Work sans" fontWeight="bold" color="#f3f4f6">Private-Chat-App</Text>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Real-time messaging simplified</div>
            </div>
          </div>
          <div className="buttons-responsive" style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { setShowLogin(true); setShowSignup(false); }}
              style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid #1d4ed8", background: "linear-gradient(180deg,#1d4ed8,#1e40af)", color: "#fff", cursor: "pointer", animation: "glowPulse 3.5s ease-in-out infinite" }}>Login</button>
            <button onClick={() => { setShowSignup(true); setShowLogin(false); }}
              style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid #334155", background: "rgba(2,6,23,0.4)", color: "#e5e7eb", cursor: "pointer", transition: "transform 160ms ease" }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >Sign Up</button>
          </div>
        </div>

        <div className="grid-responsive" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 18, alignItems: "stretch" }}>
          <div className="padding-responsive" style={{ background: "rgba(17,24,39,0.65)", border: "1px solid #1f2937", borderRadius: 16, padding: 24, backdropFilter: "blur(8px)" }}>
            <div className="badges-responsive" style={{ display: "inline-flex", gap: 8, marginBottom: 10 }}>
              <span className="text-responsive-sm" style={{ fontSize: 12, color: "#9ca3af", padding: "4px 8px", border: "1px solid #374151", borderRadius: 999 }}>JECRC University • Final Year</span>
              <span className="text-responsive-sm" style={{ fontSize: 12, color: "#9ca3af", padding: "4px 8px", border: "1px solid #374151", borderRadius: 999 }}>By Saksham Shrivastava</span>
            </div>
            <h1 className="text-responsive-lg" style={{ margin: 0, fontSize: 42, lineHeight: 1.2, fontWeight: 900, background: "linear-gradient(90deg,#e2e8f0,#93c5fd,#e9d5ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 2px 10px rgba(0,0,0,0.25))" }}>Chat faster. Collaborate better.</h1>
            <p className="text-responsive-md" style={{ marginTop: 10, color: "#cbd5e1", maxWidth: 720, fontSize: 16 }}>
              A modern chat experience with 1:1 and group messaging, unified search, thoughtful keyboard controls, and elegant dark design.
            </p>
            <div className="buttons-responsive margin-responsive" style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button onClick={() => { setShowSignup(true); setShowLogin(false); }}
                style={{ padding: "12px 18px", borderRadius: 12, border: "1px solid #16a34a", background: "linear-gradient(180deg,#16a34a,#15803d)", color: "#fff", cursor: "pointer", fontWeight: 700, animation: "glowPulse 4s ease-in-out infinite" }}>Get Started</button>
              <button onClick={() => { setShowLogin(true); setShowSignup(false); }}
                style={{ padding: "12px 18px", borderRadius: 12, border: "1px solid #334155", background: "transparent", color: "#e5e7eb", cursor: "pointer" }}>I already have an account</button>
            </div>

            <div style={{ marginTop: 18, padding: 12, borderRadius: 12, background: "#0b1220", border: "1px solid #1f2937", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)" }}>
              <div style={{ fontWeight: 700, color: "#f3f4f6", marginBottom: 6 }}>Caution / Responsible Use</div>
              <div style={{ color: "#cbd5e1", fontSize: 14 }}>
                Please use this web app responsibly. Do not use it for any illegal, harmful, or abusive activities. The author and institution are not responsible for misuse.
              </div>
            </div>
          </div>

          <div className="padding-responsive" style={{ background: "rgba(17,24,39,0.65)", border: "1px solid #1f2937", borderRadius: 16, padding: 24, backdropFilter: "blur(8px)", transition: "transform 200ms ease, box-shadow 200ms ease" }}>
            <div style={{ fontWeight: 800, color: "#f3f4f6", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ display: "inline-flex", width: 8, height: 8, borderRadius: 99, background: "#22c55e" }}></span>
              Features
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: 14, border: "1px solid #1f2937", borderRadius: 14, background: "#0b1220", transition: "transform 160ms ease, background 160ms ease" }}
                   onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = '#0d1527'; }}
                   onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = '#0b1220'; }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: "#1d4ed8", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>1:1</div>
                <div>
                  <div style={{ fontWeight: 700, color: "#f3f4f6" }}>Direct Messages</div>
                  <div style={{ color: "#9ca3af", fontSize: 13 }}>Start chats with just an email. No complex authentication.</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: 14, border: "1px solid #1f2937", borderRadius: 14, background: "#0b1220", transition: "transform 160ms ease, background 160ms ease" }}
                   onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = '#0d1527'; }}
                   onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = '#0b1220'; }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: "#16a34a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>Grp</div>
                <div>
                  <div style={{ fontWeight: 700, color: "#f3f4f6" }}>Groups</div>
                  <div style={{ color: "#9ca3af", fontSize: 13 }}>Create groups, manage members, rename, and set custom photos.</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: 14, border: "1px solid #1f2937", borderRadius: 14, background: "#0b1220", transition: "transform 160ms ease, background 160ms ease" }}
                   onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = '#0d1527'; }}
                   onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = '#0b1220'; }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: "#9333ea", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>🔎</div>
                <div>
                  <div style={{ fontWeight: 700, color: "#f3f4f6" }}>Unified Search</div>
                  <div style={{ color: "#9ca3af", fontSize: 13 }}>Find users, direct chats, and groups with keyboard navigation.</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: 14, border: "1px solid #1f2937", borderRadius: 14, background: "#0b1220", transition: "transform 160ms ease, background 160ms ease" }}
                   onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = '#0d1527'; }}
                   onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = '#0b1220'; }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: "#f59e0b", color: "#111827", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>🖼</div>
                <div>
                  <div style={{ fontWeight: 700, color: "#f3f4f6" }}>Avatars & Preview</div>
                  <div style={{ color: "#9ca3af", fontSize: 13 }}>Click avatars to preview photos and details; change your photo easily.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid-responsive gap-responsive" style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div className="padding-responsive" style={{ background: "rgba(17,24,39,0.65)", border: "1px solid #1f2937", borderRadius: 16, padding: 20 }}>
            <div style={{ fontWeight: 800, color: "#f3f4f6", marginBottom: 8 }}>Technical Details</div>
            <ul style={{ color: "#cbd5e1", fontSize: 14, lineHeight: 1.7, marginLeft: 18 }}>
              <li><b style={{ color: "#f1f5f9" }}>Frontend</b>: React (Hooks), React Router, Axios; custom dark UI.</li>
              <li><b style={{ color: "#f1f5f9" }}>Backend</b>: Node.js + Express with modular routes/controllers and error middleware.</li>
              <li><b style={{ color: "#f1f5f9" }}>Database</b>: MongoDB with Mongoose schemas for Users and Chats.</li>
              <li><b style={{ color: "#f1f5f9" }}>Authentication</b>: JWT tokens; Authorization: Bearer token header on protected routes.</li>
              <li><b style={{ color: "#f1f5f9" }}>Password Security</b>: bcrypt hashing for user passwords; compare via secure hash.</li>
              <li><b style={{ color: "#f1f5f9" }}>Access Control</b>: protect middleware extracts/validates JWT and sets req.user.</li>
              <li><b style={{ color: "#f1f5f9" }}>Chat APIs</b>: access 1:1 chat, fetch chats, create/rename groups, add/remove members.</li>
              <li><b style={{ color: "#f1f5f9" }}>Search</b>: Users via `/api/user?search=`; groups/chats filtered client-side.</li>
              <li><b style={{ color: "#f1f5f9" }}>State</b>: Session info and photo overrides in localStorage; React Context provider.</li>
              <li><b style={{ color: "#f1f5f9" }}>UX</b>: Debounced search, keyboard navigation, overlay dialogs, outside-click close.</li>
            </ul>
          </div>
          <div className="padding-responsive" style={{ background: "rgba(17,24,39,0.65)", border: "1px solid #1f2937", borderRadius: 16, padding: 20 }}>
            <div style={{ fontWeight: 800, color: "#f3f4f6", marginBottom: 8 }}>API & Flow</div>
            <div style={{ color: "#cbd5e1", fontSize: 14, lineHeight: 1.7 }}>
              <div style={{ marginBottom: 8 }}>
                <b style={{ color: "#f1f5f9" }}>Auth flow</b>: Login/Signup returns a JWT. Frontend stores it in localStorage (`userInfo`). Subsequent requests include `Authorization: Bearer \u003ctoken\u003e`.
              </div>
              <div style={{ marginBottom: 8 }}>
                <b style={{ color: "#f1f5f9" }}>Direct chat</b>: When starting a DM by email, the app searches users, then calls access chat to create or return an existing 1:1 chat.
              </div>
              <div style={{ marginBottom: 8 }}>
                <b style={{ color: "#f1f5f9" }}>Groups</b>: Create with a name and members; later rename or manage members via add/remove endpoints.
              </div>
              <div>
                <b style={{ color: "#f1f5f9" }}>Security</b>: JWT validation on protected endpoints prevents unauthorized access; passwords never stored in plain text due to bcrypt.
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 28, padding: 16, textAlign: "center", color: "#94a3b8", borderTop: "1px solid #1f2937" }}>
          Made by <b style={{ color: "#f1f5f9" }}>Saksham Shrivastava</b> — JECRC University, Final Year
        </div>
      </div>

      {showLogin && (
        <div onMouseDown={() => setShowLogin(false)} style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,0.6)", zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="modal-responsive" onMouseDown={(e) => e.stopPropagation()} style={{ width: 520, maxWidth: "90%", background: "#0b1220", color: "#e5e7eb", border: "1px solid #1f2937", borderRadius: 16, padding: 18, boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontWeight: 800, color: "#f3f4f6" }}>Login</div>
              <button onClick={() => setShowLogin(false)} style={{ border: "1px solid #334155", background: "transparent", color: "#e5e7eb", borderRadius: 10, padding: "6px 10px" }}>Close</button>
            </div>
            <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: 12 }}>
              <LoginPage onLoginSuccess={handleLoginSuccess} />
            </div>
          </div>
        </div>
      )}

      {showSignup && (
        <div onMouseDown={() => setShowSignup(false)} style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,0.6)", zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="modal-responsive" onMouseDown={(e) => e.stopPropagation()} style={{ width: 560, maxWidth: "90%", background: "linear-gradient(180deg, #0b1220 0%, #0f172a 100%)", color: "#e5e7eb", border: "1px solid #334155", borderRadius: 16, padding: 18, boxShadow: "0 16px 50px rgba(29,78,216,0.25), 0 10px 40px rgba(0,0,0,0.45)", transform: "translateY(-40px)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontWeight: 800, color: "#f3f4f6", background: "linear-gradient(90deg,#60a5fa,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Sign Up</div>
              <button onClick={() => setShowSignup(false)} style={{ border: "1px solid #3b82f6", background: "transparent", color: "#bfdbfe", borderRadius: 10, padding: "6px 10px" }}>Close</button>
            </div>
            <div style={{ background: "#0b1220", border: "1px solid #1f2937", borderRadius: 12, padding: 12, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}>
              <SignupPage onSignupSuccess={handleSignupSuccess} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Homepage;
