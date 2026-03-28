import { useState, useEffect, useRef } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, googleProvider, db } from "./firebase";

const S = {
  page: { minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0C0F14",fontFamily:"'Outfit',sans-serif",padding:16 },
  card: { background:"#141820",border:"1px solid #2A3040",borderRadius:16,padding:40,width:"100%",maxWidth:420,textAlign:"center" },
  logo: { fontFamily:"'Playfair Display',serif",fontSize:36,fontWeight:800,background:"linear-gradient(135deg,#F0A050,#FFD700)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:4 },
  sub: { fontSize:12,color:"#6B7390",textTransform:"uppercase",letterSpacing:3,marginBottom:32 },
  input: { width:"100%",padding:"12px 16px",background:"#1A1F2B",border:"1px solid #2A3040",borderRadius:8,color:"#E8EAF0",fontSize:14,fontFamily:"'Outfit',sans-serif",outline:"none",marginBottom:12,boxSizing:"border-box" },
  btn: { width:"100%",padding:"12px 18px",borderRadius:8,fontSize:14,fontWeight:600,fontFamily:"'Outfit',sans-serif",cursor:"pointer",border:"none",marginBottom:10,transition:"all 0.2s" },
  bp: { background:"linear-gradient(135deg,#F0A050,#E88D3A)",color:"#fff",boxShadow:"0 2px 12px rgba(240,160,80,0.3)" },
  bg: { background:"#1A1F2B",color:"#E8EAF0",border:"1px solid #2A3040" },
  bphone: { background:"#1A1F2B",color:"#4ADE80",border:"1px solid #2A3040" },
  div: { display:"flex",alignItems:"center",gap:12,margin:"16px 0",color:"#6B7390",fontSize:12 },
  line: { flex:1,height:1,background:"#2A3040" },
  toggle: { color:"#F0A050",cursor:"pointer",background:"none",border:"none",fontFamily:"'Outfit',sans-serif",fontSize:13,marginTop:8,display:"block" },
  err: { color:"#F87171",fontSize:13,marginBottom:12,padding:"8px 12px",background:"rgba(248,113,113,0.1)",borderRadius:8 },
  info: { color:"#60A5FA",fontSize:13,marginBottom:12,padding:"8px 12px",background:"rgba(96,165,250,0.1)",borderRadius:8 },
  tabs: { display:"flex",gap:0,marginBottom:24,borderRadius:8,overflow:"hidden",border:"1px solid #2A3040" },
  tab: { flex:1,padding:"10px 0",fontSize:13,fontWeight:600,fontFamily:"'Outfit',sans-serif",cursor:"pointer",border:"none",transition:"all 0.2s",background:"#1A1F2B",color:"#6B7390" },
  tabActive: { background:"#F0A050",color:"#fff" },
};

const errMsg = {
  "auth/email-already-in-use":"Este email já está em uso",
  "auth/invalid-email":"Email inválido",
  "auth/weak-password":"Senha fraca (mínimo 6 caracteres)",
  "auth/user-not-found":"Usuário não encontrado",
  "auth/wrong-password":"Senha incorreta",
  "auth/invalid-credential":"Email ou senha incorretos",
  "auth/too-many-requests":"Muitas tentativas. Aguarde",
  "auth/popup-closed-by-user":"Login cancelado",
  "auth/invalid-phone-number":"Número de telefone inválido",
  "auth/invalid-verification-code":"Código incorreto",
  "auth/code-expired":"Código expirado. Tente novamente",
  "auth/missing-phone-number":"Digite o número de telefone",
};

export async function saveUserData(userId, data) {
  try { await setDoc(doc(db, "users", userId, "data", "main"), { ...data, updatedAt: new Date().toISOString() }); } catch (e) { console.error("Erro ao salvar:", e); }
}

export async function loadUserData(userId) {
  try { const s = await getDoc(doc(db, "users", userId, "data", "main")); return s.exists() ? s.data() : null; } catch (e) { console.error("Erro ao carregar:", e); return null; }
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authTab, setAuthTab] = useState("email"); // email | phone
  const [mode, setMode] = useState("login"); // login | register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const confirmRef = useRef(null);
  const recaptchaRef = useRef(null);

  useEffect(() => { const u = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); }); return u; }, []);

  // Setup recaptcha
  const setupRecaptcha = () => {
    if (recaptchaRef.current) return;
    try {
      recaptchaRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: () => {},
      });
    } catch (e) {
      console.error("Recaptcha error:", e);
    }
  };

  // Email login
  const doLogin = async () => {
    setError(""); setBusy(true);
    try { await signInWithEmailAndPassword(auth, email, password); }
    catch (e) { setError(errMsg[e.code] || "Erro ao fazer login"); }
    setBusy(false);
  };

  // Email register
  const doRegister = async () => {
    setError("");
    if (!name.trim()) { setError("Digite seu nome"); return; }
    setBusy(true);
    try {
      const r = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(r.user, { displayName: name.trim() });
    } catch (e) { setError(errMsg[e.code] || "Erro ao criar conta"); }
    setBusy(false);
  };

  // Google login
  const doGoogle = async () => {
    setError(""); setBusy(true);
    try { await signInWithPopup(auth, googleProvider); }
    catch (e) { if (e.code !== "auth/popup-closed-by-user") setError(errMsg[e.code] || "Erro com Google"); }
    setBusy(false);
  };

  // Phone - send code
  const doSendCode = async () => {
    setError(""); setInfo("");
    let phoneNum = phone.trim();
    if (!phoneNum) { setError("Digite o número de telefone"); return; }
    // Auto add Brazil code if not present
    if (!phoneNum.startsWith("+")) {
      phoneNum = "+55" + phoneNum.replace(/\D/g, "");
    }
    setBusy(true);
    try {
      setupRecaptcha();
      const confirmation = await signInWithPhoneNumber(auth, phoneNum, recaptchaRef.current);
      confirmRef.current = confirmation;
      setShowOtp(true);
      setInfo("Código enviado para " + phoneNum);
    } catch (e) {
      setError(errMsg[e.code] || "Erro ao enviar código: " + (e.message || ""));
      // Reset recaptcha on error
      if (recaptchaRef.current) {
        try { recaptchaRef.current.clear(); } catch {}
        recaptchaRef.current = null;
      }
    }
    setBusy(false);
  };

  // Phone - verify code
  const doVerifyCode = async () => {
    setError("");
    if (!otp.trim()) { setError("Digite o código"); return; }
    setBusy(true);
    try {
      await confirmRef.current.confirm(otp.trim());
    } catch (e) {
      setError(errMsg[e.code] || "Código inválido");
    }
    setBusy(false);
  };

  const doLogout = () => signOut(auth);

  const onKey = (e) => {
    if (e.key !== "Enter") return;
    if (authTab === "phone") {
      showOtp ? doVerifyCode() : doSendCode();
    } else {
      mode === "login" ? doLogin() : doRegister();
    }
  };

  if (loading) return <div style={S.page}><div style={{color:"#9CA3B8",fontSize:16}}>Carregando...</div></div>;
  if (user) return children({ user, logout: doLogout, saveUserData, loadUserData });

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:wght@700;800;900&display=swap" rel="stylesheet"/>
      <div style={S.page}><div style={S.card}>
        <div style={S.logo}>Stockly</div>
        <div style={S.sub}>gestão doméstica</div>

        {/* Tabs */}
        <div style={S.tabs}>
          <button style={{...S.tab,...(authTab==="email"?S.tabActive:{})}} onClick={()=>{setAuthTab("email");setError("");setInfo("");}}>Email</button>
          <button style={{...S.tab,...(authTab==="phone"?S.tabActive:{})}} onClick={()=>{setAuthTab("phone");setError("");setInfo("");}}>Celular</button>
        </div>

        {error && <div style={S.err}>{error}</div>}
        {info && <div style={S.info}>{info}</div>}

        {/* ── EMAIL TAB ── */}
        {authTab === "email" && <>
          {mode === "register" && <input style={S.input} type="text" placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} onKeyDown={onKey}/>}
          <input style={S.input} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={onKey}/>
          <input style={S.input} type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={onKey}/>
          <button style={{...S.btn,...S.bp,opacity:busy?0.6:1}} onClick={mode==="login"?doLogin:doRegister} disabled={busy}>
            {busy?"Aguarde...":mode==="login"?"Entrar":"Criar Conta"}
          </button>
          <button style={S.toggle} onClick={()=>{setMode(mode==="login"?"register":"login");setError("");}}>
            {mode==="login"?"Não tem conta? Criar agora":"Já tem conta? Fazer login"}
          </button>
        </>}

        {/* ── PHONE TAB ── */}
        {authTab === "phone" && <>
          {!showOtp ? <>
            <div style={{fontSize:12,color:"#6B7390",marginBottom:12,textAlign:"left"}}>
              Digite seu número com DDD (ex: 15991234567)
            </div>
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              <div style={{...S.input,width:60,flex:"none",textAlign:"center",marginBottom:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#9CA3B8"}}>+55</div>
              <input style={{...S.input,marginBottom:0}} type="tel" placeholder="DDD + Número" value={phone} onChange={e => setPhone(e.target.value)} onKeyDown={onKey}/>
            </div>
            <button style={{...S.btn,...S.bphone,opacity:busy?0.6:1}} onClick={doSendCode} disabled={busy}>
              {busy?"Enviando...":"Enviar código por SMS"}
            </button>
          </> : <>
            <div style={{fontSize:13,color:"#9CA3B8",marginBottom:12}}>
              Digite o código de 6 dígitos enviado para seu celular
            </div>
            <input style={{...S.input,textAlign:"center",fontSize:24,letterSpacing:8}} type="text" placeholder="000000" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,"").slice(0,6))} onKeyDown={onKey} maxLength={6}/>
            <button style={{...S.btn,...S.bp,opacity:busy?0.6:1}} onClick={doVerifyCode} disabled={busy}>
              {busy?"Verificando...":"Verificar código"}
            </button>
            <button style={S.toggle} onClick={()=>{setShowOtp(false);setOtp("");setError("");setInfo("");}}>
              Enviar novo código
            </button>
          </>}
        </>}

        {/* Google button (always visible) */}
        <div style={S.div}><div style={S.line}/><span>ou</span><div style={S.line}/></div>
        <button style={{...S.btn,...S.bg}} onClick={doGoogle} disabled={busy}>
          Entrar com Google
        </button>

        {/* Recaptcha container (invisible) */}
        <div id="recaptcha-container"></div>
      </div></div>
    </>
  );
}
