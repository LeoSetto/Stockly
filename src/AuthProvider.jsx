import { useState, useEffect } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
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
  div: { display:"flex",alignItems:"center",gap:12,margin:"16px 0",color:"#6B7390",fontSize:12 },
  line: { flex:1,height:1,background:"#2A3040" },
  toggle: { color:"#F0A050",cursor:"pointer",background:"none",border:"none",fontFamily:"'Outfit',sans-serif",fontSize:13,marginTop:8,display:"block" },
  err: { color:"#F87171",fontSize:13,marginBottom:12,padding:"8px 12px",background:"rgba(248,113,113,0.1)",borderRadius:8 },
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

export async function saveUserData(userId, data) {
  try { await setDoc(doc(db, "users", userId, "data", "main"), { ...data, updatedAt: new Date().toISOString() }); } catch (e) { console.error("Erro ao salvar:", e); }
}

export async function loadUserData(userId) {
  try { const s = await getDoc(doc(db, "users", userId, "data", "main")); return s.exists() ? s.data() : null; } catch (e) { console.error("Erro ao carregar:", e); return null; }
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { const u = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); }); return u; }, []);

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
    try { await signInWithPopup(auth, googleProvider); }
    catch (e) { if (e.code !== "auth/popup-closed-by-user") setError(errMsg[e.code] || "Erro com Google"); }
    setBusy(false);
  };

  const doLogout = () => signOut(auth);

  const onKey = (e) => {
    if (e.key === "Enter") { mode === "login" ? doLogin() : doRegister(); }
  };

  if (loading) return <div style={S.page}><div style={{color:"#9CA3B8",fontSize:16}}>Carregando...</div></div>;
  if (user) return children({ user, logout: doLogout, saveUserData, loadUserData });

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:wght@700;800;900&display=swap" rel="stylesheet"/>
      <div style={S.page}><div style={S.card}>
        <div style={S.logo}>Stockly</div>
        <div style={S.sub}>gestão doméstica</div>

        {error && <div style={S.err}>{error}</div>}

        {mode === "register" && <input style={S.input} type="text" placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} onKeyDown={onKey}/>}
        <input style={S.input} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={onKey}/>
        <input style={S.input} type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={onKey}/>
        <button style={{...S.btn,...S.bp,opacity:busy?0.6:1}} onClick={mode==="login"?doLogin:doRegister} disabled={busy}>
          {busy?"Aguarde...":mode==="login"?"Entrar":"Criar Conta"}
        </button>

        <button style={S.toggle} onClick={()=>{setMode(mode==="login"?"register":"login");setError("");}}>
          {mode==="login"?"Não tem conta? Criar agora":"Já tem conta? Fazer login"}
        </button>

        <div style={S.div}><div style={S.line}/><span>ou</span><div style={S.line}/></div>
        <button style={{...S.btn,...S.bg}} onClick={doGoogle} disabled={busy}>
          Entrar com Google
        </button>
      </div></div>
    </>
  );
}
