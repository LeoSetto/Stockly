import { useState, useEffect } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, googleProvider, db } from "./firebase";

// Stockly symbol
export const StocklySymbol = ({ size = 80, color = "#F0A050" }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 4L36 4L20 32L28 32L12 60L20 60L4 32L12 32L20 4Z" fill={color}/>
    <path d="M32 4L48 4L32 32L40 32L24 60L32 60L16 32L24 32L32 4Z" fill={color} opacity="0.5"/>
  </svg>
);

// ─── Generate house code ───
const genCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "STK-";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

// ─── Styles ───
const S = {
  page: { minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0C0F14",fontFamily:"'Outfit',sans-serif",padding:16 },
  card: { background:"#141820",border:"1px solid #2A3040",borderRadius:16,padding:40,width:"100%",maxWidth:440,textAlign:"center" },
  logo: { fontFamily:"'Playfair Display',serif",fontSize:36,fontWeight:800,background:"linear-gradient(135deg,#F0A050,#FFD700)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:4 },
  sub: { fontSize:12,color:"#6B7390",textTransform:"uppercase",letterSpacing:3,marginBottom:32 },
  input: { width:"100%",padding:"12px 16px",background:"#1A1F2B",border:"1px solid #2A3040",borderRadius:8,color:"#E8EAF0",fontSize:14,fontFamily:"'Outfit',sans-serif",outline:"none",marginBottom:12,boxSizing:"border-box" },
  codeInput: { width:"100%",padding:"16px",background:"#1A1F2B",border:"2px solid #2A3040",borderRadius:10,color:"#F0A050",fontSize:24,fontFamily:"'Outfit',sans-serif",outline:"none",marginBottom:12,boxSizing:"border-box",textAlign:"center",letterSpacing:6,fontWeight:700 },
  btn: { width:"100%",padding:"12px 18px",borderRadius:8,fontSize:14,fontWeight:600,fontFamily:"'Outfit',sans-serif",cursor:"pointer",border:"none",marginBottom:10,transition:"all 0.2s" },
  bp: { background:"linear-gradient(135deg,#F0A050,#E88D3A)",color:"#fff",boxShadow:"0 2px 12px rgba(240,160,80,0.3)" },
  bg: { background:"#1A1F2B",color:"#E8EAF0",border:"1px solid #2A3040" },
  bgreen: { background:"linear-gradient(135deg,#4ADE80,#22C55E)",color:"#fff",boxShadow:"0 2px 12px rgba(74,222,128,0.3)" },
  div: { display:"flex",alignItems:"center",gap:12,margin:"16px 0",color:"#6B7390",fontSize:12 },
  line: { flex:1,height:1,background:"#2A3040" },
  toggle: { color:"#F0A050",cursor:"pointer",background:"none",border:"none",fontFamily:"'Outfit',sans-serif",fontSize:13,marginTop:8,display:"block" },
  err: { color:"#F87171",fontSize:13,marginBottom:12,padding:"8px 12px",background:"rgba(248,113,113,0.1)",borderRadius:8 },
  info: { color:"#60A5FA",fontSize:13,marginBottom:12,padding:"8px 12px",background:"rgba(96,165,250,0.1)",borderRadius:8 },
  success: { color:"#4ADE80",fontSize:13,marginBottom:12,padding:"8px 12px",background:"rgba(74,222,128,0.1)",borderRadius:8 },
  codeDisplay: { padding:"16px 24px",background:"#1A1F2B",border:"2px dashed #F0A050",borderRadius:12,fontSize:28,fontWeight:800,letterSpacing:6,color:"#F0A050",fontFamily:"'Outfit',sans-serif",marginBottom:16,userSelect:"all" },
  memberList: { display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center",marginBottom:16 },
  memberChip: { background:"#1A1F2B",border:"1px solid #2A3040",borderRadius:20,padding:"6px 14px",fontSize:12,color:"#9CA3B8",display:"flex",alignItems:"center",gap:6 },
  dot: { width:8,height:8,borderRadius:"50%",background:"#4ADE80" },
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
};

// ─── Firestore helpers using house code ───
export async function saveHouseData(houseCode, data) {
  try {
    await setDoc(doc(db, "houses", houseCode, "data", "main"), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  } catch (e) { console.error("Erro ao salvar:", e); }
}

export async function loadHouseData(houseCode) {
  try {
    const s = await getDoc(doc(db, "houses", houseCode, "data", "main"));
    return s.exists() ? s.data() : null;
  } catch (e) { console.error("Erro ao carregar:", e); return null; }
}

// Personal data (per user, not shared)
export async function savePersonalData(uid, data) {
  try {
    await setDoc(doc(db, "userProfiles", uid, "data", "main"), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  } catch (e) { console.error("Erro ao salvar pessoal:", e); }
}

export async function loadPersonalData(uid) {
  try {
    const s = await getDoc(doc(db, "userProfiles", uid, "data", "main"));
    return s.exists() ? s.data() : null;
  } catch (e) { console.error("Erro ao carregar pessoal:", e); return null; }
}

// ─── User profile helpers ───
async function getUserProfile(uid) {
  try {
    const s = await getDoc(doc(db, "userProfiles", uid));
    return s.exists() ? s.data() : null;
  } catch { return null; }
}

async function setUserProfile(uid, data) {
  try { await setDoc(doc(db, "userProfiles", uid), data, { merge: true }); } catch (e) { console.error(e); }
}

export async function saveUserPrefs(uid, prefs) {
  try { await setDoc(doc(db, "userProfiles", uid), { prefs }, { merge: true }); } catch (e) { console.error(e); }
}

export async function loadUserPrefs(uid) {
  try { const s = await getDoc(doc(db, "userProfiles", uid)); return s.exists() ? (s.data().prefs || null) : null; } catch { return null; }
}

async function getHouseInfo(code) {
  try {
    const s = await getDoc(doc(db, "houses", code, "info", "meta"));
    return s.exists() ? s.data() : null;
  } catch { return null; }
}

async function setHouseInfo(code, data) {
  try { await setDoc(doc(db, "houses", code, "info", "meta"), data); } catch (e) { console.error(e); }
}

// ═══════════════════════════════════════
// AUTH PROVIDER
// ═══════════════════════════════════════
export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [houseCode, setHouseCode] = useState(null);
  const [houseInfo, setHouseInfoState] = useState(null);
  const [step, setStep] = useState("login"); // login | register | house-pick | house-create | house-join
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Listen to auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Check if user has a house
        const profile = await getUserProfile(u.uid);
        if (profile && profile.houseCode) {
          const info = await getHouseInfo(profile.houseCode);
          setHouseCode(profile.houseCode);
          setHouseInfoState(info);
          setStep("ready");
        } else {
          setStep("house-pick");
        }
      } else {
        setHouseCode(null);
        setHouseInfoState(null);
        setStep("login");
      }
      setLoading(false);
    });
    getRedirectResult(auth).catch(() => {});
    return unsub;
  }, []);

  // ─── Auth actions ───
  const doLogin = async () => {
    setError(""); setBusy(true);
    try { await signInWithEmailAndPassword(auth, email, password); }
    catch (e) { setError(errMsg[e.code] || "Erro ao fazer login"); }
    setBusy(false);
  };

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

  const doGoogle = async () => {
    setError(""); setBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      if (e.code === "auth/popup-blocked" || e.code === "auth/popup-closed-by-user" || e.code === "auth/cancelled-popup-request" || e.code === "auth/internal-error" || e.code === "auth/operation-not-supported-in-this-environment") {
        try { await signInWithRedirect(auth, googleProvider); return; }
        catch (e2) { setError(errMsg[e2.code] || "Erro com Google"); }
      } else if (e.code !== "auth/popup-closed-by-user") {
        setError(errMsg[e.code] || "Erro com Google");
      }
    }
    setBusy(false);
  };

  const doLogout = async () => {
    await signOut(auth);
    setHouseCode(null);
    setHouseInfoState(null);
    setStep("login");
  };

  // ─── House actions ───
  const createHouse = async () => {
    setError(""); setBusy(true);
    try {
      const code = genCode();
      const info = {
        code,
        createdBy: user.uid,
        createdByName: user.displayName || user.email,
        createdAt: new Date().toISOString(),
        members: [{
          uid: user.uid,
          name: user.displayName || user.email,
          email: user.email,
          joinedAt: new Date().toISOString(),
        }],
      };
      await setHouseInfo(code, info);
      await setUserProfile(user.uid, { houseCode: code, name: user.displayName || user.email });
      setHouseCode(code);
      setHouseInfoState(info);
      setStep("house-created");
    } catch (e) {
      setError("Erro ao criar casa: " + e.message);
    }
    setBusy(false);
  };

  const joinHouse = async () => {
    setError("");
    const code = joinCode.trim().toUpperCase();
    if (!code) { setError("Digite o código da casa"); return; }
    setBusy(true);
    try {
      const info = await getHouseInfo(code);
      if (!info) {
        setError("Código não encontrado. Verifique e tente novamente.");
        setBusy(false);
        return;
      }
      // Add member to house
      // IMPORTANT: save houseCode to profile FIRST (Firestore rules check this)
      await setUserProfile(user.uid, { houseCode: code, name: user.displayName || user.email });
      const alreadyMember = (info.members || []).some(m => m.uid === user.uid);
      if (!alreadyMember) {
        const updatedMembers = [...(info.members || []), {
          uid: user.uid,
          name: user.displayName || user.email,
          email: user.email,
          joinedAt: new Date().toISOString(),
        }];
        await setHouseInfo(code, { ...info, members: updatedMembers });
        info.members = updatedMembers;
      }
      setHouseCode(code);
      setHouseInfoState(info);
      setStep("ready");
    } catch (e) {
      setError("Erro ao entrar: " + e.message);
    }
    setBusy(false);
  };

  const leaveHouse = async () => {
    if (!confirm("Sair desta casa? Você pode entrar novamente com o código.")) return;
    setBusy(true);
    try {
      // Remove from house members
      if (houseInfo && houseCode) {
        const updatedMembers = (houseInfo.members || []).filter(m => m.uid !== user.uid);
        await setHouseInfo(houseCode, { ...houseInfo, members: updatedMembers });
      }
      await setUserProfile(user.uid, { houseCode: null });
      setHouseCode(null);
      setHouseInfoState(null);
      setStep("house-pick");
    } catch (e) { console.error(e); }
    setBusy(false);
  };

  const onKey = (e) => {
    if (e.key !== "Enter") return;
    if (step === "login") doLogin();
    else if (step === "register") doRegister();
    else if (step === "house-join") joinHouse();
  };

  const copyCode = () => {
    navigator.clipboard?.writeText(houseCode).then(() => {}).catch(() => {});
  };

  // ─── Loading ───
  if (loading) return <div style={S.page}><div style={{color:"#9CA3B8",fontSize:16}}>Carregando...</div></div>;

  // ─── Ready — pass to app ───
  if (step === "ready" && user && houseCode) {
    return children({
      user,
      logout: doLogout,
      saveHouseData: (data) => saveHouseData(houseCode, data),
      loadHouseData: () => loadHouseData(houseCode),
      savePersonalData: (data) => savePersonalData(user.uid, data),
      loadPersonalData: () => loadPersonalData(user.uid),
      houseCode,
      houseInfo,
      leaveHouse,
      refreshHouseInfo: async () => { const info = await getHouseInfo(houseCode); setHouseInfoState(info); },
      saveUserPrefs: (prefs) => saveUserPrefs(user.uid, prefs),
      loadUserPrefs: () => loadUserPrefs(user.uid),
    });
  }

  // ─── Render screens ───
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:wght@700;800;900&display=swap" rel="stylesheet"/>
      <div style={S.page}><div style={S.card}>

        <div style={{marginBottom:20}}><StocklySymbol size={70} color="#F0A050"/></div>
        <div style={S.logo}>Stockly</div>
        <div style={S.sub}>gestão doméstica</div>

        {error && <div style={S.err}>{error}</div>}

        {/* ── LOGIN ── */}
        {step === "login" && <>
          <input style={S.input} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={onKey}/>
          <input style={S.input} type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={onKey}/>
          <button style={{...S.btn,...S.bp,opacity:busy?0.6:1}} onClick={doLogin} disabled={busy}>{busy?"Aguarde...":"Entrar"}</button>
          <button style={S.toggle} onClick={()=>{setStep("register");setError("");}}>Não tem conta? Criar agora</button>
          <div style={S.div}><div style={S.line}/><span>ou</span><div style={S.line}/></div>
          <button style={{...S.btn,...S.bg}} onClick={doGoogle} disabled={busy}>Entrar com Google</button>
        </>}

        {/* ── REGISTER ── */}
        {step === "register" && <>
          <input style={S.input} type="text" placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} onKeyDown={onKey}/>
          <input style={S.input} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={onKey}/>
          <input style={S.input} type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={onKey}/>
          <button style={{...S.btn,...S.bp,opacity:busy?0.6:1}} onClick={doRegister} disabled={busy}>{busy?"Aguarde...":"Criar Conta"}</button>
          <button style={S.toggle} onClick={()=>{setStep("login");setError("");}}>Já tem conta? Fazer login</button>
          <div style={S.div}><div style={S.line}/><span>ou</span><div style={S.line}/></div>
          <button style={{...S.btn,...S.bg}} onClick={doGoogle} disabled={busy}>Entrar com Google</button>
        </>}

        {/* ── HOUSE PICK ── */}
        {step === "house-pick" && <>
          <div style={{fontSize:15,color:"#9CA3B8",marginBottom:24,lineHeight:1.6}}>
            Olá, <span style={{color:"#E8EAF0",fontWeight:600}}>{user?.displayName || user?.email}</span>!
            <br/>Como deseja continuar?
          </div>
          <button style={{...S.btn,...S.bp}} onClick={()=>{setStep("house-create");setError("");}}>
            🏠 Criar Nova Casa
          </button>
          <div style={{fontSize:12,color:"#6B7390",marginBottom:16}}>Crie uma casa e convide sua família com um código</div>
          <button style={{...S.btn,...S.bg}} onClick={()=>{setStep("house-join");setError("");}}>
            🔑 Entrar com Código
          </button>
          <div style={{fontSize:12,color:"#6B7390",marginBottom:16}}>Alguém da sua família já criou? Digite o código</div>
          <div style={S.div}><div style={S.line}/></div>
          <button style={{...S.toggle,color:"#F87171",fontSize:12}} onClick={doLogout}>Sair da conta</button>
        </>}

        {/* ── CREATE HOUSE ── */}
        {step === "house-create" && <>
          <div style={{fontSize:14,color:"#9CA3B8",marginBottom:20,lineHeight:1.6}}>
            Ao criar, você receberá um <span style={{color:"#F0A050",fontWeight:600}}>código único</span> para compartilhar com sua família.
          </div>
          <button style={{...S.btn,...S.bgreen,opacity:busy?0.6:1}} onClick={createHouse} disabled={busy}>
            {busy?"Criando...":"Criar Minha Casa"}
          </button>
          <button style={S.toggle} onClick={()=>{setStep("house-pick");setError("");}}>← Voltar</button>
        </>}

        {/* ── HOUSE CREATED — show code ── */}
        {step === "house-created" && <>
          <div style={S.success}>Casa criada com sucesso!</div>
          <div style={{fontSize:14,color:"#9CA3B8",marginBottom:16}}>
            Compartilhe este código com sua família:
          </div>
          <div style={S.codeDisplay} onClick={copyCode} title="Clique para copiar">{houseCode}</div>
          <div style={{fontSize:12,color:"#6B7390",marginBottom:20}}>
            Cada pessoa faz login com sua própria conta e digita este código para entrar na mesma casa. Todos compartilham os mesmos dados.
          </div>
          <button style={{...S.btn,...S.bp}} onClick={()=>setStep("ready")}>Começar a usar</button>
        </>}

        {/* ── JOIN HOUSE ── */}
        {step === "house-join" && <>
          <div style={{fontSize:14,color:"#9CA3B8",marginBottom:16}}>
            Digite o código que alguém da sua família compartilhou:
          </div>
          <input style={S.codeInput} type="text" placeholder="STK-XXXX" value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={onKey} maxLength={8} autoFocus/>
          <button style={{...S.btn,...S.bp,opacity:busy?0.6:1}} onClick={joinHouse} disabled={busy}>
            {busy?"Verificando...":"Entrar na Casa"}
          </button>
          <button style={S.toggle} onClick={()=>{setStep("house-pick");setError("");setJoinCode("");}}>← Voltar</button>
        </>}

      </div></div>
    </>
  );
}
