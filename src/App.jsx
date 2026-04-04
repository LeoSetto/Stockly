import { useState, useEffect, useCallback, useRef } from "react";

// ─── Persistence (keyed per user) ───
const getKey = (uid) => `stockly-data-${uid||"anon"}`;
const load = (uid) => { try { const r = localStorage.getItem(getKey(uid)); return r ? JSON.parse(r) : null; } catch { return null; } };
const save = (d, uid) => { try { localStorage.setItem(getKey(uid), JSON.stringify(d)); } catch {} };

// ─── Default config & data ───
const DEFAULT_CONFIG = {
  houseName: "Minha Casa",
  currency: "BRL",
  locale: "pt-BR",
  theme: "dark",
  accentColor: "#F0A050",
  locations: ["Despensa", "Geladeira", "Freezer", "Armário"],
  pantryCategories: ["Grãos", "Laticínios", "Proteínas", "Hortifruti", "Bebidas", "Temperos", "Limpeza", "Higiene", "Padaria", "Enlatados", "Congelados", "Outros"],
  units: ["un", "kg", "g", "L", "mL", "pacote", "lata", "caixa", "dúzia", "fatia", "sachê"],
  rooms: ["Cozinha", "Sala", "Quarto", "Banheiro", "Lavanderia", "Área externa"],
  choreFreqs: ["Diário", "2x Semana", "Semanal", "Quinzenal", "Mensal"],
  expenseCategories: ["Mercado", "Hortifruti", "Limpeza", "Saúde", "Contas", "Lazer", "Transporte", "Outros"],
  cards: ["Dinheiro", "Pix", "Cartão Crédito", "Cartão Débito"],
  incomeCategories: ["Salário", "VR", "Flash", "Freelance", "Extras"],
  mealDays: ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"],
  mealTypes: ["Café", "Almoço", "Lanche", "Jantar"],
  expiryWarnDays: 7,
  variableWeightCategories: ["Hortifruti"],
  habitCategories: ["Saúde", "Produtividade", "Bem-estar", "Fitness"],
  todoLists: ["Pessoal", "Trabalho", "Casa"],
};

const DEFAULT_DATA = {
  config: { ...DEFAULT_CONFIG },
  pantry: [
    { id: 1, name: "📝 Exemplo: Arroz (pode apagar)", qty: 2, unit: "kg", location: "Despensa", expiry: "2026-08-15", category: "Grãos" },
    { id: 2, name: "📝 Exemplo: Leite (pode apagar)", qty: 1, unit: "L", location: "Geladeira", expiry: "2026-04-10", category: "Laticínios" },
  ],
  grocery: [
    { id: 1, name: "📝 Exemplo: Banana (pode apagar)", qty: 6, unit: "un", checked: false, category: "Hortifruti", price: 0, unitPrice: 0 },
  ],
  chores: [
    { id: 1, name: "📝 Exemplo: Lavar louça (pode apagar)", room: "Cozinha", assignee: "Todos", freq: "Diário", lastDone: "2026-03-26", effort: 1 },
  ],
  meals: [
    { id: 1, day: "Segunda", meal: "Almoço", recipe: "📝 Exemplo: Frango grelhado (pode apagar)" },
  ],
  expenses: [
    { id: 1, desc: "📝 Exemplo: Supermercado (pode apagar)", amount: 150.00, category: "Mercado", date: "2026-03-20", paid: true, card: "Pix", type: "variavel" },
    { id: 2, desc: "📝 Exemplo: Conta de luz (pode apagar)", amount: 180.00, category: "Contas", date: "2026-03-10", paid: false, card: "", type: "fixo" },
  ],
  incomes: [
    { id: 1, desc: "📝 Exemplo: Salário (pode apagar)", amount: 3000.00, category: "Salário", date: "2026-03-05", recurring: true },
  ],
  members: [],
  budget: 0,
  budgetByCategory: {},
  priceHistory: [],
  shoppingTrips: [],
  habits: [],
  habitLogs: [],
  todos: [],
  events: [],
  _version: 8,
};

// ─── Data migration — upgrades old data to new format ───
const DATA_VERSION = 8;
const migrateData = (d) => {
  if (!d) return d;
  const v = d._version || 1;
  if (v >= DATA_VERSION) return d;
  let m = { ...d };
  if (!m.priceHistory) m.priceHistory = [];
  if (!m.shoppingTrips) m.shoppingTrips = [];
  m.priceHistory = (m.priceHistory || []).map(p => ({ ...p, unitPrice: p.unitPrice || p.price || 0, totalPrice: p.totalPrice || p.price || 0 }));
  m.grocery = (m.grocery || []).map(i => ({ ...i, price: i.price || 0, unitPrice: i.unitPrice || i.price || 0 }));
  m.expenses = (m.expenses || []).map(e => ({ ...e, paid: e.paid !== undefined ? e.paid : true, card: e.card || "", type: e.type || "variavel" }));
  if (!m.config.cards) m.config.cards = ["Dinheiro", "Pix", "Cartão Crédito", "Cartão Débito"];
  if (!m.config.incomeCategories) m.config.incomeCategories = ["Salário", "VR", "Flash", "Freelance", "Extras"];
  if (!m.config.variableWeightCategories) m.config.variableWeightCategories = ["Hortifruti"];
  if (v < 5 && m.shoppingTrips && m.shoppingTrips.length > 0) {
    const existingDescs = (m.expenses || []).map(e => e.desc);
    m.shoppingTrips.forEach(trip => {
      const desc = "Compra " + new Date(trip.date + "T12:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
      if (trip.total > 0 && !existingDescs.includes(desc)) {
        m.expenses.push({ id: Date.now() + Math.random(), desc, amount: trip.total, category: "Mercado", date: trip.date, paid: true, card: "", fromTrip: trip.id, type: "variavel" });
      }
    });
  }
  if (!m.incomes) m.incomes = [];
  if (!m.budgetByCategory) m.budgetByCategory = {};
  m.expenses = (m.expenses || []).map(e => ({
    ...e, recurrence: e.recurrence || "", installments: e.installments || 0,
    currentInstallment: e.currentInstallment || 0, splitTotal: e.splitTotal || 0,
    splitMyShare: e.splitMyShare || 0, splitPayers: e.splitPayers || [],
  }));
  if (!m.habits) m.habits = [];
  if (!m.habitLogs) m.habitLogs = [];
  if (!m.todos) m.todos = [];
  if (!m.events) m.events = [];
  if (!m.config.habitCategories) m.config.habitCategories = ["Saúde", "Produtividade", "Bem-estar", "Fitness"];
  if (!m.config.todoLists) m.config.todoLists = ["Pessoal", "Trabalho", "Casa"];
  m._version = DATA_VERSION;
  return m;
};

// ─── Helpers ───
const today = () => new Date().toISOString().slice(0, 10);
const daysUntil = (d) => { if (!d) return 999; return Math.ceil((new Date(d) - new Date(today())) / 86400000); };
const fmtCurrency = (n, locale, currency) => {
  try { return n.toLocaleString(locale || "pt-BR", { style: "currency", currency: currency || "BRL" }); }
  catch { return `R$ ${n.toFixed(2)}`; }
};

// ─── Theme presets ───
const THEMES = {
  dark: { "--bg":"#0C0F14","--bg2":"#141820","--bg3":"#1A1F2B","--bg4":"#222838","--border":"#2A3040","--border2":"#343A4D","--text":"#E8EAF0","--text2":"#9CA3B8","--text3":"#6B7390" },
  midnight: { "--bg":"#0a0e1a","--bg2":"#111827","--bg3":"#1e2640","--bg4":"#283352","--border":"#2d3a5c","--border2":"#3b4a70","--text":"#e2e8f0","--text2":"#94a3b8","--text3":"#64748b" },
  light: { "--bg":"#F5F5F0","--bg2":"#FFFFFF","--bg3":"#F0EDE8","--bg4":"#E8E4DD","--border":"#D5D0C8","--border2":"#C8C2B8","--text":"#1A1A1A","--text2":"#555555","--text3":"#888888" },
  forest: { "--bg":"#0a120e","--bg2":"#0f1a14","--bg3":"#162218","--bg4":"#1e2e22","--border":"#2a3d2e","--border2":"#375a3c","--text":"#d4e8da","--text2":"#8fb89a","--text3":"#5a8a66" },
  ocean: { "--bg":"#0a0f18","--bg2":"#0f1724","--bg3":"#152030","--bg4":"#1b2a40","--border":"#243754","--border2":"#2e4768","--text":"#d4e4f0","--text2":"#7eaac8","--text3":"#4e7a9a" },
  rose: { "--bg":"#18090f","--bg2":"#200f16","--bg3":"#2e1520","--bg4":"#3d1c2c","--border":"#4e2838","--border2":"#6a3550","--text":"#f0d4de","--text2":"#c88a9e","--text3":"#9a5a72" },
};

const ACCENT_COLORS = ["#F0A050","#60A5FA","#4ADE80","#A78BFA","#F87171","#FBBF24","#34D399","#F472B6","#818CF8","#FB923C","#22D3EE","#E879F9"];
const CURRENCIES = [{code:"BRL",label:"Real (R$)"},{code:"USD",label:"Dólar ($)"},{code:"EUR",label:"Euro (€)"},{code:"GBP",label:"Libra (£)"},{code:"ARS",label:"Peso Argentino"},{code:"JPY",label:"Iene (¥)"},{code:"MXN",label:"Peso Mexicano"}];

// ─── Icons ───
const Icon = ({ d, size = 20, color = "currentColor", stroke = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);
const I = {
  pantry:<Icon d={<><path d="M3 3h18v18H3z"/><path d="M3 9h18"/><path d="M9 21V9"/></>}/>,
  grocery:<Icon d={<><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 01-8 0"/></>}/>,
  chores:<Icon d={<><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M9 12l2 2 4-4"/></>}/>,
  meals:<Icon d={<><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><path d="M6 1v3"/><path d="M10 1v3"/><path d="M14 1v3"/></>}/>,
  budget:<Icon d={<><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></>}/>,
  home:<Icon d={<><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>}/>,
  plus:<Icon d={<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>}/>,
  check:<Icon d={<><polyline points="20 6 9 17 4 12"/></>}/>,
  trash:<Icon d={<><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></>}/>,
  search:<Icon d={<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>}/>,
  edit:<Icon d={<><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>}/>,
  x:<Icon d={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}/>,
  users:<Icon d={<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>}/>,
  menu:<Icon d={<><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>}/>,
  settings:<Icon d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>}/>,
  palette:<Icon d={<><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12" r="2.5"/><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-1.5 4-3 4h-1.77a2 2 0 00-1.77 2.92A1.98 1.98 0 0114 22h-2z"/></>}/>,
  tag:<Icon d={<><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>}/>,
  download:<Icon d={<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>}/>,
  upload:<Icon d={<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>}/>,
  sliders:<Icon d={<><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></>}/>,
  prices:<Icon d={<><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>}/>,
  help:<Icon d={<><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></>}/>,
  routine:<Icon d={<><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 6v6l4 2"/></>}/>,
};

// ─── CSS ───
const getCSS = (tv, accent) => `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=Sora:wght@600;700;800&display=swap');
:root{${Object.entries(tv).map(([k,v])=>`${k}:${v}`).join(";")};--accent:${accent};--accent2:${accent}dd;--accent-glow:${accent}22;--green:#4ADE80;--green-bg:rgba(74,222,128,.1);--red:#F87171;--red-bg:rgba(248,113,113,.1);--yellow:#FBBF24;--yellow-bg:rgba(251,191,36,.1);--blue:#60A5FA;--blue-bg:rgba(96,165,250,.1);--purple:#A78BFA;--purple-bg:rgba(167,139,250,.1);--radius:14px;--radius-sm:8px;--shadow:0 4px 24px rgba(0,0,0,.3)}
*{margin:0;padding:0;box-sizing:border-box}body,#root{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;-webkit-font-smoothing:antialiased}
.app{display:flex;min-height:100vh}.sb{width:260px;min-height:100vh;background:var(--bg2);border-right:1px solid var(--border);display:flex;flex-direction:column;position:fixed;top:0;left:0;z-index:100;transition:transform .3s cubic-bezier(.4,0,.2,1);overflow-y:auto;scrollbar-width:none}.sb::-webkit-scrollbar{display:none}.sb-h{padding:28px 24px 20px;border-bottom:1px solid var(--border)}.logo{font-family:'Sora',sans-serif;font-size:26px;font-weight:800;background:linear-gradient(135deg,var(--accent),#FFD700);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:-.5px;transition:opacity .3s}.logo:hover{opacity:.85}.logo-s{font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:3px;margin-top:4px;font-weight:500}
.nav{padding:16px 12px;flex:1;display:flex;flex-direction:column;gap:4px;overflow-y:auto}.ni{display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:10px;cursor:pointer;transition:all .2s cubic-bezier(.4,0,.2,1);color:var(--text2);font-size:14px;font-weight:500;border:none;background:none;width:100%;text-align:left;font-family:inherit;position:relative}.ni:hover{background:var(--bg3);color:var(--text);transform:translateX(4px)}.ni:active{transform:translateX(2px) scale(.98)}.ni.a{background:var(--accent-glow);color:var(--accent);font-weight:600}.ni.a svg{stroke:var(--accent)}.ni.a::after{content:'';position:absolute;left:0;top:25%;bottom:25%;width:3px;background:var(--accent);border-radius:0 3px 3px 0}.nb{margin-left:auto;background:var(--red);color:#fff;font-size:11px;font-weight:700;padding:2px 7px;border-radius:20px;min-width:20px;text-align:center;animation:pulse 2s infinite}.sb-f{padding:16px 24px;border-top:1px solid var(--border);font-size:11px;color:var(--text3)}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}
.mc{flex:1;margin-left:260px;padding:32px 40px;max-width:1200px;animation:pageIn .3s ease}.ph{margin-bottom:32px}.pt{font-family:'Sora',sans-serif;font-size:32px;font-weight:800;color:var(--text);letter-spacing:-.5px}.ps{color:var(--text3);font-size:14px;margin-top:6px}
@keyframes pageIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:20px;transition:all .25s cubic-bezier(.4,0,.2,1)}.card:hover{border-color:var(--border2);box-shadow:0 2px 16px rgba(0,0,0,.15)}.ct{font-size:16px;font-weight:600;margin-bottom:16px;display:flex;align-items:center;gap:8px}
.sg{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:28px}.sc{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:20px;position:relative;overflow:hidden;cursor:pointer;transition:all .25s cubic-bezier(.4,0,.2,1)}.sc:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,.2);border-color:var(--border2)}.sc:active{transform:translateY(-1px) scale(.99)}.sc::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;transition:height .25s}.sc:hover::before{height:4px}.sc.ac::before{background:linear-gradient(90deg,var(--accent),#FFD700)}.sc.gn::before{background:linear-gradient(90deg,var(--green),#34D399)}.sc.rd::before{background:linear-gradient(90deg,var(--red),#FB923C)}.sc.bl::before{background:linear-gradient(90deg,var(--blue),#818CF8)}.sc.pp::before{background:linear-gradient(90deg,var(--purple),#C084FC)}
.sl{font-size:12px;color:var(--text3);text-transform:uppercase;letter-spacing:1.5px;font-weight:600;margin-bottom:8px}.sv{font-size:28px;font-weight:700;letter-spacing:-1px;transition:color .2s}.sd{font-size:12px;color:var(--text2);margin-top:4px}
table{width:100%;border-collapse:collapse}th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:var(--text3);font-weight:600;padding:12px 16px;border-bottom:1px solid var(--border)}td{padding:14px 16px;border-bottom:1px solid var(--border);font-size:14px;color:var(--text2);vertical-align:middle;transition:background .15s}tr{transition:all .15s}tr:hover td{background:var(--bg3)}.in{color:var(--text);font-weight:500}
.tg{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;transition:all .2s}.tg:hover{filter:brightness(1.15)}.tg-g{background:var(--green-bg);color:var(--green)}.tg-r{background:var(--red-bg);color:var(--red)}.tg-y{background:var(--yellow-bg);color:var(--yellow)}.tg-b{background:var(--blue-bg);color:var(--blue)}.tg-p{background:var(--purple-bg);color:var(--purple)}.tg-n{background:var(--bg4);color:var(--text2)}
.btn{display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border-radius:var(--radius-sm);font-size:13px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;border:none;transition:all .2s cubic-bezier(.4,0,.2,1)}.bp{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;box-shadow:0 2px 12px ${accent}44}.bp:hover{transform:translateY(-2px);box-shadow:0 6px 24px ${accent}55}.bp:active{transform:translateY(0) scale(.97)}.bg{background:transparent;color:var(--text2);border:1px solid var(--border)}.bg:hover{background:var(--bg3);color:var(--text);border-color:var(--border2)}.bg:active{transform:scale(.97)}.bd{background:var(--red-bg);color:var(--red)}.bd:hover{background:rgba(248,113,113,.2);transform:translateY(-1px)}.bs{padding:6px 12px;font-size:12px}
.bi{padding:8px;background:transparent;border:1px solid var(--border);color:var(--text3);border-radius:var(--radius-sm);cursor:pointer;transition:all .2s cubic-bezier(.4,0,.2,1);display:inline-flex;align-items:center;justify-content:center}.bi:hover{background:var(--bg3);color:var(--text);transform:scale(1.08);border-color:var(--border2)}.bi:active{transform:scale(.95)}
.fr{display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap}.fg{display:flex;flex-direction:column;gap:4px;flex:1;min-width:140px}.fl{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--text3);font-weight:600}
input,select,textarea{background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 14px;color:var(--text);font-size:14px;font-family:'DM Sans',sans-serif;outline:none;transition:all .2s cubic-bezier(.4,0,.2,1);width:100%}input:focus,select:focus,textarea:focus{border-color:var(--accent);box-shadow:0 0 0 3px ${accent}22}select{cursor:pointer;-webkit-appearance:none}textarea{resize:vertical;min-height:60px}
.sb-i{position:relative;margin-bottom:20px}.sb-i svg{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--text3);transition:color .2s}.sb-i input:focus~svg,.sb-i:focus-within svg{color:var(--accent)}.sb-i input{padding-left:42px}
.tb{display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap}.tr{margin-left:auto;display:flex;gap:8px}
.cr{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:all .2s cubic-bezier(.4,0,.2,1)}.cr:hover{background:var(--bg3);padding-left:20px}.cr:active{background:var(--bg4)}.cb{width:22px;height:22px;border:2px solid var(--border2);border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .25s cubic-bezier(.4,0,.2,1)}.cb:hover{border-color:var(--accent);transform:scale(1.1)}.cb.ck{background:var(--green);border-color:var(--green);animation:checkPop .3s cubic-bezier(.4,0,.2,1)}.cb.ck svg{stroke:#fff}.cx{flex:1;font-size:14px;color:var(--text);font-weight:500;transition:all .2s}.cx.dn{text-decoration:line-through;color:var(--text3)}.cm{font-size:12px;color:var(--text3)}
@keyframes checkPop{0%{transform:scale(1)}40%{transform:scale(1.25)}100%{transform:scale(1)}}
.mg{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px}.mk{background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px;min-height:80px;cursor:pointer;transition:all .25s cubic-bezier(.4,0,.2,1)}.mk:hover{border-color:var(--accent);transform:translateY(-3px);box-shadow:0 6px 20px rgba(0,0,0,.15)}.mk:active{transform:translateY(-1px) scale(.98)}.mt{font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}.mr{font-size:13px;color:var(--text);line-height:1.4}.me{color:var(--text3);font-style:italic;font-size:12px}
.pb{height:8px;background:var(--bg4);border-radius:4px;overflow:hidden;margin-top:8px}.pf{height:100%;border-radius:4px;transition:width .6s cubic-bezier(.4,0,.2,1)}
.ed{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:6px}.ef{display:flex;gap:3px}.eo{width:8px;height:8px;border-radius:50%;background:var(--border2);transition:all .2s}.eo.ea{background:var(--accent);box-shadow:0 0 6px ${accent}66}
.mo{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:200;animation:fi .2s ease}.md{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:28px;width:90%;max-width:560px;box-shadow:0 8px 40px rgba(0,0,0,.4);animation:su .25s cubic-bezier(.4,0,.2,1);max-height:85vh;overflow-y:auto}.mdt{font-size:20px;font-weight:700;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between}.ma{display:flex;gap:10px;justify-content:flex-end;margin-top:20px}
@keyframes fi{from{opacity:0}to{opacity:1}}@keyframes su{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
.dg{display:grid;grid-template-columns:1fr 1fr;gap:20px}.di{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);font-size:13px;transition:all .15s}.di:last-child{border:none}.di:hover{padding-left:4px}
.cb-c{display:flex;align-items:flex-end;gap:8px;height:120px;padding-top:10px}.cb-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;height:100%;justify-content:flex-end;transition:all .2s}.cb-col:hover{transform:translateY(-2px)}.cb-b{width:100%;max-width:48px;border-radius:6px 6px 0 0;transition:height .6s cubic-bezier(.4,0,.2,1);min-height:4px}.cb-l{font-size:10px;color:var(--text3);text-align:center;white-space:nowrap}.cb-v{font-size:11px;color:var(--text2);font-weight:600}
.mh{display:none;position:fixed;top:0;left:0;right:0;height:56px;background:var(--bg2);border-bottom:1px solid var(--border);z-index:99;padding:0 16px;align-items:center;backdrop-filter:blur(12px);background:rgba(from var(--bg2) r g b/.85)}.hb{background:none;border:none;color:var(--text);cursor:pointer;padding:4px;transition:transform .2s}.hb:active{transform:scale(.9)}
.toast{position:fixed;bottom:24px;right:24px;background:var(--bg3);border:1px solid var(--border2);border-radius:var(--radius-sm);padding:12px 20px;font-size:13px;color:var(--text);box-shadow:0 8px 32px rgba(0,0,0,.3);z-index:300;animation:toastIn .35s cubic-bezier(.4,0,.2,1);display:flex;align-items:center;gap:8px}
@keyframes toastIn{from{opacity:0;transform:translateY(20px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}
.te{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;margin-bottom:4px}.tc{display:flex;align-items:center;gap:6px;background:var(--bg3);border:1px solid var(--border);padding:6px 12px;border-radius:20px;font-size:13px;color:var(--text);transition:all .2s}.tc:hover{border-color:var(--border2);background:var(--bg4)}.tc button{background:none;border:none;color:var(--text3);cursor:pointer;padding:0;display:flex;align-items:center;transition:all .2s}.tc button:hover{color:var(--red);transform:scale(1.2)}.ta{display:flex;gap:8px;margin-top:8px}.ta input{flex:1;padding:8px 12px;font-size:13px}.ta button{flex-shrink:0}
.cg{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.cd{width:32px;height:32px;border-radius:50%;cursor:pointer;border:3px solid transparent;transition:all .25s cubic-bezier(.4,0,.2,1)}.cd:hover{transform:scale(1.2);box-shadow:0 4px 12px rgba(0,0,0,.3)}.cd.sel{border-color:var(--text);box-shadow:0 0 0 2px var(--bg),0 0 0 4px var(--text);transform:scale(1.1)}
.thg{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:10px;margin-top:8px}.thc{border-radius:10px;padding:12px;cursor:pointer;border:2px solid transparent;transition:all .25s cubic-bezier(.4,0,.2,1);text-align:center;font-size:12px;font-weight:600}.thc:hover{transform:translateY(-3px);box-shadow:0 4px 16px rgba(0,0,0,.2)}.thc.sel{border-color:var(--accent);transform:translateY(-2px)}
.sst{font-size:13px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;display:flex;align-items:center;gap:8px}
.m-card{transition:all .2s cubic-bezier(.4,0,.2,1)}.m-card:active{transform:scale(.98);background:var(--bg4)}
@media(max-width:768px){
/* Core layout */
.sb{transform:translateX(-100%);width:280px;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
.sb.open{transform:translateX(0)}
.mc{margin-left:0;padding:60px 16px 80px;max-width:100vw;overflow-x:hidden;box-sizing:border-box}
.mh{display:flex;height:52px}
.app{overflow-x:hidden;max-width:100vw;width:100%}
body,html,#root{overflow-x:hidden;max-width:100vw}

/* Typography */
.ph{margin-bottom:16px}
.pt{font-size:22px}
.ps{font-size:12px}

/* Stat cards - scroll horizontal */
.sg{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:10px;margin-bottom:20px;padding-bottom:4px;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.sg::-webkit-scrollbar{display:none}
.sc{min-width:150px;flex-shrink:0;scroll-snap-align:start;padding:14px}
.sv{font-size:20px}
.sl{font-size:9px;letter-spacing:1px;margin-bottom:4px}
.sd{font-size:11px}

/* Dashboard grid */
.dg{grid-template-columns:1fr;gap:0;padding:0 2px}
.dg>.card{margin-bottom:12px;border-radius:16px;border:1.5px solid var(--border2);box-shadow:0 3px 16px rgba(0,0,0,.22);background:var(--bg2)}

/* Cards */
.card{padding:14px;margin-bottom:10px;border-radius:12px;overflow:hidden}
.ct{font-size:14px;margin-bottom:10px}

/* Toolbar - stack vertically */
.tb{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}
.tb select{width:100%}
.tr{margin-left:0;width:100%;display:flex;gap:8px}
.tr .btn{flex:1}

/* Search bar */
.sb-i{margin-bottom:12px}
.sb-i input{font-size:16px;padding:10px 14px 10px 40px}

/* Buttons */
.btn{padding:8px 12px;font-size:12px;white-space:nowrap}
.bp{padding:8px 14px}
.bs{padding:5px 10px;font-size:11px}
.bi{padding:6px}

/* Filter buttons - horizontal scroll */
.filter-scroll{display:flex;overflow-x:auto;gap:6px;padding:4px 2px;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.filter-scroll::-webkit-scrollbar{display:none}
.filter-scroll .btn{flex-shrink:0}

/* Tables hidden, cards shown */
table{display:none}
.m-cards{display:flex;flex-direction:column;gap:8px}
.m-card{background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:12px}
.m-card-h{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px}
.m-card-n{font-size:13px;font-weight:600;color:var(--text);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.m-card-r{display:flex;flex-wrap:wrap;gap:4px;font-size:11px;color:var(--text2);align-items:center}
.m-card-a{display:flex;gap:6px;margin-top:6px;justify-content:flex-end}
.m-card-a .bi{padding:5px;border-radius:6px}

/* Tags smaller */
.tg{font-size:10px;padding:2px 7px}

/* Modal - bottom sheet */
.mo{align-items:flex-end;padding:0}
.md{width:100%;max-width:100%;border-radius:16px 16px 0 0;max-height:90vh;padding:20px 16px;animation:slideUp .25s cubic-bezier(.4,0,.2,1)}
@keyframes slideUp{from{transform:translateY(100%);opacity:.8}to{transform:translateY(0);opacity:1}}
.mdt{font-size:17px;margin-bottom:14px}
.ma{margin-top:14px}
.ma .btn{flex:1}

/* Inputs */
input,select,textarea{font-size:16px;padding:11px 12px}
select{font-size:14px;width:100%}

/* Toast */
.toast{bottom:14px;right:12px;left:12px;font-size:12px;padding:10px 14px;border-radius:10px}

/* Lists */
.cr{padding:10px 12px;gap:8px}
.cx{font-size:13px}
.cm{font-size:11px}

/* Chart bars */
.cb-c{height:90px}
.cb-l{font-size:9px}
.cb-v{font-size:10px}

/* Meals grid */
.mg{grid-template-columns:1fr 1fr;gap:8px}
.mk{padding:10px;min-height:60px}
.mt{font-size:10px;margin-bottom:4px}
.mr{font-size:12px}

/* Forms in modal - always stack */
.fr{flex-direction:column;gap:8px;margin-bottom:8px}
.fg{min-width:100%}
.fl{font-size:10px}

/* Settings tabs - scroll */
.sst{font-size:11px;letter-spacing:1.5px;margin-bottom:8px}

/* Progress bar */
.pb{height:6px;margin-top:6px}

/* Effort dots */
.eo{width:7px;height:7px}

/* Di rows */
.di{padding:8px 0;font-size:12px;gap:8px}

/* Tag editor */
.te{gap:6px}.tc{padding:4px 10px;font-size:12px}
.ta input{padding:8px 10px;font-size:14px}

/* Theme/color selectors */
.thg{grid-template-columns:repeat(3,1fr);gap:8px}
.thc{padding:10px;font-size:11px}
.cg{gap:6px}
.cd{width:28px;height:28px}

/* Misc inline fixes */
.logo{font-size:22px}
.logo-s{font-size:10px;letter-spacing:2px}
.ni{padding:10px 14px;font-size:13px;gap:10px}
}

/* Visibility helpers */
@media(max-width:768px){.m-only{display:flex}.d-only{display:none}}
@media(min-width:769px){.m-only{display:none}.d-only{display:block}}
`;

// ─── Shared components ───
function Modal({title,onClose,children}){return(<div className="mo" onClick={onClose}><div className="md" onClick={e=>e.stopPropagation()}><div className="mdt">{title}<button className="bi" onClick={onClose}>{I.x}</button></div>{children}</div></div>);}
function Toast({message,onUndo}){if(!message)return null;return<div className="toast">{I.check} {message}{onUndo&&<button onClick={onUndo} style={{marginLeft:8,padding:"4px 12px",borderRadius:6,fontSize:12,fontWeight:700,border:"1px solid var(--accent)",background:"transparent",color:"var(--accent)",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap",transition:"all .2s"}}>Desfazer</button>}</div>;}
function TagEditor({items,onAdd,onRemove,placeholder="Novo item..."}){const[v,setV]=useState("");const add=()=>{const t=v.trim();if(t&&!items.includes(t)){onAdd(t);setV("");}};return(<div><div className="te">{items.map(t=><div className="tc" key={t}>{t}<button onClick={()=>onRemove(t)}><Icon d={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} size={12}/></button></div>)}</div><div className="ta"><input value={v} onChange={e=>setV(e.target.value)} placeholder={placeholder} onKeyDown={e=>e.key==="Enter"&&add()}/><button className="btn bp bs" onClick={add}>{I.plus}</button></div></div>);}

// ─── Money Input (currency mask) ───
function MoneyInput({value,onChange,placeholder,autoFocus,onKeyDown,style}){
const fmt=(v)=>{const n=Math.round(Number(v)*100);if(!n)return"";const s=String(n).padStart(3,"0");return s.slice(0,-2)+","+s.slice(-2);};
const parse=(raw)=>{const digits=raw.replace(/\D/g,"");if(!digits)return 0;return Number(digits)/100;};
const[display,setDisplay]=useState(()=>fmt(value));
useEffect(()=>{const f=fmt(value);if(f!==display&&document.activeElement!==ref.current)setDisplay(f);},[value]);
const ref=useRef(null);
const handleChange=(e)=>{const raw=e.target.value;const digits=raw.replace(/\D/g,"");if(digits.length>10)return;const num=Number(digits)/100;setDisplay(digits?String(digits).padStart(3,"0").replace(/^0*(\d+)(\d{2})$/,"$1,$2").replace(/^,/,"0,"):""  );onChange(num);};
const handleFocus=()=>{if(!display&&!value)setDisplay("");};
const handleBlur=()=>{setDisplay(fmt(value));};
return(<input ref={ref} inputMode="numeric" value={display} onChange={handleChange} onFocus={handleFocus} onBlur={handleBlur} placeholder={placeholder||"0,00"} autoFocus={autoFocus} onKeyDown={onKeyDown} style={{textAlign:"right",...(style||{})}}/>);
}

// ─── Avatar ───
const AVATAR_COLORS=["#F0A050","#60A5FA","#4ADE80","#A78BFA","#F87171","#FBBF24","#34D399","#F472B6","#818CF8","#FB923C","#22D3EE","#E879F9"];
const AVATAR_EMOJIS=["😊","😎","🤓","🥳","👨","👩","👦","👧","🧑‍💻","👨‍🍳","🏃","🎯","🦊","🐱","🌟","⚡","🔥","💎","🎮","🎵"];

function UserAvatar({userPrefs,user,size,onClick}){
const av=userPrefs?.avatar||{};const sz=size||36;
const name=user?.displayName||user?.email?.split("@")[0]||"?";
const initial=name[0]?.toUpperCase()||"?";
const bgColor=av.color||AVATAR_COLORS[0];
if(av.type==="image"&&av.imageUrl){return(<div onClick={onClick} style={{width:sz,height:sz,borderRadius:"50%",overflow:"hidden",cursor:onClick?"pointer":"default",border:"2px solid var(--border2)",flexShrink:0,transition:"all .2s"}}><img src={av.imageUrl} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/></div>);}
if(av.type==="emoji"&&av.emoji){return(<div onClick={onClick} style={{width:sz,height:sz,borderRadius:"50%",background:bgColor+"22",border:`2px solid ${bgColor}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:sz*0.5,cursor:onClick?"pointer":"default",flexShrink:0,transition:"all .2s"}}>{av.emoji}</div>);}
return(<div onClick={onClick} style={{width:sz,height:sz,borderRadius:"50%",background:`linear-gradient(135deg,${bgColor},${bgColor}cc)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:sz*0.4,fontWeight:800,color:"#fff",cursor:onClick?"pointer":"default",flexShrink:0,letterSpacing:-1,fontFamily:"'Sora',sans-serif",transition:"all .2s",boxShadow:`0 2px 8px ${bgColor}44`}}>{initial}</div>);
}

function AvatarEditor({userPrefs,setUserPrefs,user,toast}){
const av=userPrefs?.avatar||{};const name=user?.displayName||user?.email?.split("@")[0]||"?";
const[tab,setTab]=useState(av.type||"initials");
const fileRef=useRef(null);
const update=(changes)=>setUserPrefs(p=>({...p,avatar:{...(p.avatar||{}),type:tab,...changes}}));
const handleImage=(e)=>{const file=e.target.files?.[0];if(!file)return;if(file.size>500000){toast("Imagem muito grande (máx 500KB)");return;}const reader=new FileReader();reader.onload=(ev)=>{update({type:"image",imageUrl:ev.target.result});toast("Foto atualizada");};reader.readAsDataURL(file);};
return(<div className="card"><div className="sst">👤 Avatar</div>
<div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20}}>
<UserAvatar userPrefs={userPrefs} user={user} size={64}/>
<div><div style={{fontSize:16,fontWeight:700}}>{name}</div><div style={{fontSize:12,color:"var(--text3)"}}>{user?.email||""}</div></div>
</div>
<div className="filter-scroll" style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
<button className={`btn ${tab==="initials"?"bp":"bg"} bs`} onClick={()=>{setTab("initials");update({type:"initials"});}}>Inicial</button>
<button className={`btn ${tab==="emoji"?"bp":"bg"} bs`} onClick={()=>{setTab("emoji");update({type:"emoji",emoji:av.emoji||"😊"});}}>Emoji</button>
<button className={`btn ${tab==="image"?"bp":"bg"} bs`} onClick={()=>setTab("image")}>Foto</button>
</div>
{tab==="initials"&&<div>
<div style={{fontSize:12,color:"var(--text3)",marginBottom:8}}>Escolha a cor do seu avatar</div>
<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{AVATAR_COLORS.map(col=>(<div key={col} style={{width:36,height:36,borderRadius:"50%",background:`linear-gradient(135deg,${col},${col}cc)`,cursor:"pointer",border:av.color===col?"3px solid var(--text)":"3px solid transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:"#fff",transition:"all .2s",fontFamily:"'Sora',sans-serif"}} onClick={()=>{update({color:col});toast("Cor atualizada");}}>{name[0]?.toUpperCase()}</div>))}</div>
</div>}
{tab==="emoji"&&<div>
<div style={{fontSize:12,color:"var(--text3)",marginBottom:8}}>Escolha um emoji</div>
<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>{AVATAR_EMOJIS.map(em=>(<div key={em} style={{width:40,height:40,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,cursor:"pointer",background:av.emoji===em?"var(--accent-glow)":"var(--bg3)",border:av.emoji===em?"2px solid var(--accent)":"2px solid transparent",transition:"all .2s"}} onClick={()=>{update({emoji:em});toast("Emoji atualizado");}}>{em}</div>))}</div>
<div style={{fontSize:12,color:"var(--text3)",marginBottom:8}}>Ou digite qualquer emoji:</div>
<input value={av.emoji||""} onChange={e=>{const v=e.target.value;update({emoji:v.slice(-2)});}} placeholder="Cole um emoji aqui" style={{maxWidth:120,fontSize:24,textAlign:"center",padding:8}}/>
<div style={{fontSize:12,color:"var(--text3)",marginTop:12,marginBottom:8}}>Cor de fundo</div>
<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{AVATAR_COLORS.map(col=>(<div key={col} style={{width:28,height:28,borderRadius:"50%",background:col,cursor:"pointer",border:av.color===col?"3px solid var(--text)":"3px solid transparent",transition:"all .2s"}} onClick={()=>{update({color:col});}}/>))}</div>
</div>}
{tab==="image"&&<div>
<div style={{fontSize:12,color:"var(--text3)",marginBottom:12}}>Envie uma foto (máx 500KB). A imagem fica salva no seu perfil.</div>
<button className="btn bp" onClick={()=>fileRef.current?.click()}>📷 Escolher foto</button>
<input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleImage}/>
{av.imageUrl&&<div style={{marginTop:12}}><button className="btn bg bs" onClick={()=>{update({type:"initials",imageUrl:""});toast("Foto removida");}}>Remover foto</button></div>}
</div>}
</div>);
}

// ─── Confirm Delete (hold to delete) ───
function ConfirmDelete({onConfirm,children,label}){
const[confirming,setConfirming]=useState(false);
const[progress,setProgress]=useState(0);
const timerRef=useRef(null);const intervalRef=useRef(null);
const startHold=()=>{setConfirming(true);setProgress(0);const start=Date.now();intervalRef.current=setInterval(()=>{const elapsed=Date.now()-start;const pct=Math.min((elapsed/800)*100,100);setProgress(pct);if(elapsed>=800){clearInterval(intervalRef.current);onConfirm();setConfirming(false);setProgress(0);}},30);};
const cancelHold=()=>{clearInterval(intervalRef.current);setConfirming(false);setProgress(0);};
const handleClick=()=>{if(!confirming){setConfirming(true);timerRef.current=setTimeout(()=>setConfirming(false),3000);}else{onConfirm();setConfirming(false);}};
useEffect(()=>()=>{clearInterval(intervalRef.current);clearTimeout(timerRef.current);},[]);
if(children)return(<div onMouseDown={startHold} onMouseUp={cancelHold} onMouseLeave={cancelHold} onTouchStart={startHold} onTouchEnd={cancelHold} style={{position:"relative",overflow:"hidden"}}>{children}{confirming&&<div style={{position:"absolute",bottom:0,left:0,height:3,background:"var(--red)",width:`${progress}%`,borderRadius:2,transition:"width 30ms linear"}}/>}</div>);
return confirming?<button className="btn bd bs" onClick={()=>{onConfirm();setConfirming(false);}} style={{animation:"su .15s ease"}}>{label||"Confirmar?"}</button>:<button className="bi" onClick={handleClick} title="Remover">{I.trash}</button>;
}

// ─── FAB (Floating Action Button) ───
function FAB({goTo,setData,toast,data}){
const[open,setOpen]=useState(false);
const c=data.config;
const actions=[
{label:"Despensa",icon:I.pantry,color:"var(--blue)",action:()=>goTo("pantry")},
{label:"Compras",icon:I.grocery,color:"var(--green)",action:()=>goTo("grocery")},
{label:"Gasto",icon:I.budget,color:"var(--red)",action:()=>goTo("budget")},
{label:"Tarefa",icon:I.chores,color:"var(--yellow)",action:()=>goTo("chores")},
];
return(<div className="m-only" style={{position:"fixed",bottom:24,right:20,zIndex:150,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:10}}>
{open&&<div style={{display:"flex",flexDirection:"column",gap:8,animation:"su .2s ease"}}>
{actions.map((a,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:10,animation:`su ${.1+i*.06}s ease`}}>
<span style={{fontSize:12,fontWeight:600,color:"var(--text)",background:"var(--bg2)",padding:"6px 12px",borderRadius:8,boxShadow:"var(--shadow)",whiteSpace:"nowrap"}}>{a.label}</span>
<button onClick={()=>{a.action();setOpen(false);}} style={{width:44,height:44,borderRadius:22,border:"none",background:a.color,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:`0 4px 16px rgba(0,0,0,.3)`,transition:"all .2s"}}>{a.icon}</button>
</div>))}
</div>}
{open&&<div style={{position:"fixed",inset:0,zIndex:-1}} onClick={()=>setOpen(false)}/>}
<button onClick={()=>setOpen(!open)} style={{width:56,height:56,borderRadius:28,border:"none",background:`linear-gradient(135deg,var(--accent),var(--accent2))`,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:`0 6px 24px rgba(0,0,0,.4)`,transition:"all .3s cubic-bezier(.4,0,.2,1)",transform:open?"rotate(45deg)":"rotate(0)"}}>
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
</button></div>);
}

// ─── Time ago helper ───
const timeAgo=(ts)=>{if(!ts)return"";const diff=Date.now()-ts;const mins=Math.floor(diff/60000);if(mins<1)return"agora";if(mins<60)return`${mins}min`;const hrs=Math.floor(mins/60);if(hrs<24)return`${hrs}h`;const days=Math.floor(hrs/24);return`${days}d`;};
const editStamp=(user)=>({editBy:user?.displayName||user?.email?.split("@")[0]||"",editAt:Date.now()});

// ─── DASHBOARD ───
function Dashboard({data,goTo,user,mode}){const c=data.config;const fmt=(n)=>fmtCurrency(n,c.locale,c.currency);const w=c.expiryWarnDays||7;
const es=data.pantry.filter(i=>{const d=daysUntil(i.expiry);return d<=w&&d>=0;});
const ex=data.pantry.filter(i=>daysUntil(i.expiry)<0);
const gp=data.grocery.filter(i=>!i.checked).length;const gd=data.grocery.filter(i=>i.checked).length;
const ts=data.expenses.reduce((a,e)=>a+e.amount,0);const bp=data.budget>0?Math.min((ts/data.budget)*100,100):0;
const pendingExp=data.expenses.filter(e=>!e.paid);const pendingTotal=pendingExp.reduce((a,e)=>a+e.amount,0);
const totalIncome=(data.incomes||[]).reduce((a,i)=>a+i.amount,0);const saldo=totalIncome-ts;
const gcs=(ch)=>{const d=Math.abs(daysUntil(ch.lastDone));const lim={"Diário":1,"2x Semana":3,"Semanal":7,"Quinzenal":14,"Mensal":30};return d>=(lim[ch.freq]||7);};const cdc=data.chores.filter(gcs).length;
const ebc={};data.expenses.forEach(e=>{ebc[e.category]=(ebc[e.category]||0)+e.amount;});const mx=Math.max(...Object.values(ebc),1);const bcs=["#F0A050","#60A5FA","#4ADE80","#A78BFA","#FBBF24","#F87171","#34D399","#F472B6"];
// Greeting based on time
const hour=new Date().getHours();const greeting=hour<12?"Bom dia":hour<18?"Boa tarde":"Boa noite";
const firstName=(user?.displayName||"").split(" ")[0]||"";
// Recent price changes
const ph=data.priceHistory||[];const recentPrices=ph.length>0?[...ph].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3):[];
const cc=e=>({cursor:"pointer",transition:"transform .15s"});
return(<div>
<div className="ph"><div className="pt">{greeting}{firstName?`, ${firstName}`:""} 👋</div><div className="ps">{c.houseName} — {new Date().toLocaleDateString(c.locale||"pt-BR",{weekday:"long",day:"numeric",month:"long"})}{mode==="personal"?" · modo pessoal":""}</div></div>
<div className="sg">
<div className="sc ac" style={cc()} onClick={()=>goTo("pantry")}><div className="sl">{I.pantry} Despensa</div><div className="sv">{data.pantry.length}</div><div className="sd">{c.locations.map(l=>{const n=data.pantry.filter(i=>i.location===l).length;return n>0?`${n} ${l.toLowerCase()}`:null;}).filter(Boolean).join(" · ")||"vazia"}</div></div>
<div className="sc rd" style={cc()} onClick={()=>goTo("pantry")}><div className="sl">⚠ Validade</div><div className="sv" style={{color:(es.length+ex.length)>0?"var(--red)":"var(--green)"}}>{es.length+ex.length}</div><div className="sd">{ex.length>0?`${ex.length} vencido(s)`:es.length>0?`${es.length} vencendo`:"Tudo em dia!"}</div></div>
<div className="sc bl" style={cc()} onClick={()=>goTo("grocery")}><div className="sl">{I.grocery} Compras</div><div className="sv">{gp}</div><div className="sd">{gp>0?`${gp} pendente${gp>1?"s":""}`:gd>0?`${gd} comprado${gd>1?"s":""}`:""}{gp===0&&gd===0?"lista vazia":""}</div></div>
<div className="sc pp" style={cc()} onClick={()=>goTo("chores")}><div className="sl">{I.chores} Tarefas</div><div className="sv" style={{color:cdc>0?"var(--yellow)":"var(--green)"}}>{cdc}</div><div className="sd">{cdc>0?`${cdc} pendente${cdc>1?"s":""}`:data.chores.length>0?"Tudo em dia!":"nenhuma tarefa"}</div></div>
<div className="sc gn" style={cc()} onClick={()=>goTo("budget")}><div className="sl">{I.budget} Finanças</div><div className="sv" style={{color:saldo>=0?"var(--green)":"var(--red)"}}>{fmt(saldo)}</div><div className="sd">Receita: {fmt(totalIncome)} · Gastos: {fmt(ts)}{pendingTotal>0?` · ${fmt(pendingTotal)} pendente`:""}</div><div className="pb"><div className="pf" style={{width:`${bp}%`,background:bp>90?"var(--red)":bp>70?"var(--yellow)":"var(--green)"}}/></div></div>
</div>
<div className="dg">
{/* Expiring items */}
<div className="card" style={cc()} onClick={()=>goTo("pantry")}><div className="ct" style={{color:"var(--red)"}}>⚠ Vencendo / Vencidos</div>{[...ex,...es].length===0?<div style={{color:"var(--text3)",fontSize:13,padding:"8px 0"}}>Nenhum item vencendo. Tudo certo! ✅</div>:[...ex,...es].slice(0,6).map(i=>{const d=daysUntil(i.expiry);return(<div className="di" key={i.id}><span className="ed" style={{background:d<0?"var(--red)":d<=3?"var(--yellow)":"var(--blue)"}}/><span style={{flex:1,color:"var(--text)"}}>{i.name}</span><span style={{fontSize:12,color:d<0?"var(--red)":"var(--yellow)"}}>{d<0?`Venceu há ${Math.abs(d)}d`:d===0?"Hoje!":`${d}d`}</span></div>);})}{[...ex,...es].length>6&&<div style={{fontSize:12,color:"var(--accent)",marginTop:8}}>+ {[...ex,...es].length-6} mais →</div>}</div>
{/* Expenses by category */}
<div className="card" style={cc()} onClick={()=>goTo("budget")}><div className="ct">{I.budget} Gastos por Categoria</div>{Object.keys(ebc).length===0?<div style={{color:"var(--text3)",fontSize:13,padding:"8px 0"}}>Nenhum gasto registrado</div>:<div className="cb-c">{Object.entries(ebc).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([cat,val],idx)=>(<div className="cb-col" key={cat}><div className="cb-v">{fmt(val)}</div><div className="cb-b" style={{height:`${(val/mx)*80}%`,background:bcs[idx%bcs.length],opacity:.85}}/><div className="cb-l">{cat}</div></div>))}</div>}{pendingExp.length>0&&<div style={{marginTop:12,padding:"8px 12px",background:"var(--yellow-bg)",borderRadius:8,fontSize:12,color:"var(--yellow)"}}>💳 {pendingExp.length} gasto{pendingExp.length>1?"s":""} pendente{pendingExp.length>1?"s":""}: {fmt(pendingTotal)}</div>}</div>
{/* Meals */}
<div className="card" style={cc()} onClick={()=>goTo("meals")}><div className="ct">{I.meals} Próximas Refeições</div>{data.meals.length===0?<div style={{color:"var(--text3)",fontSize:13,padding:"8px 0"}}>Nenhuma refeição planejada. Toque para planejar!</div>:data.meals.slice(0,4).map(m=>(<div className="di" key={m.id}><span className="tg tg-n" style={{minWidth:60,textAlign:"center"}}>{m.day.slice(0,3)}</span><span style={{fontSize:11,color:"var(--text3)",minWidth:50}}>{m.meal}</span><span style={{flex:1,color:"var(--text)"}}>{m.recipe}</span></div>))}{data.meals.length>4&&<div style={{fontSize:12,color:"var(--accent)",marginTop:8}}>+ {data.meals.length-4} mais →</div>}</div>
{/* Chores */}
<div className="card" style={cc()} onClick={()=>goTo("chores")}><div className="ct">{I.chores} Tarefas do Dia</div>{data.chores.filter(gcs).length===0?<div style={{color:"var(--text3)",fontSize:13,padding:"8px 0"}}>Tudo em dia! Nenhuma tarefa pendente. 🎉</div>:data.chores.filter(gcs).slice(0,5).map(ch=>(<div className="di" key={ch.id}><span className="tg tg-y" style={{minWidth:70,textAlign:"center"}}>{ch.room}</span><span style={{flex:1,color:"var(--text)"}}>{ch.name}</span><span style={{fontSize:12,color:"var(--text3)"}}>{ch.assignee}</span></div>))}{data.chores.filter(gcs).length>5&&<div style={{fontSize:12,color:"var(--accent)",marginTop:8}}>+ {data.chores.filter(gcs).length-5} mais →</div>}</div>
{/* Recent prices */}
{recentPrices.length>0&&<div className="card" style={cc()} onClick={()=>goTo("prices")}><div className="ct">{I.prices} Preços Recentes</div>{recentPrices.map(p=>(<div className="di" key={p.id}><span style={{flex:1,color:"var(--text)"}}>{p.name}</span><span style={{fontSize:13,fontWeight:600,color:"var(--accent)"}}>{fmt(p.unitPrice||p.totalPrice||0)}</span><span style={{fontSize:11,color:"var(--text3)"}}>{new Date(p.date+"T12:00").toLocaleDateString(c.locale||"pt-BR",{day:"numeric",month:"short"})}</span></div>))}<div style={{fontSize:12,color:"var(--accent)",marginTop:4}}>Ver histórico completo →</div></div>}
{/* Shopping trips */}
{(data.shoppingTrips||[]).length>0&&<div className="card" style={cc()} onClick={()=>goTo("grocery")}><div className="ct">{I.grocery} Última Compra</div>{(()=>{const t=(data.shoppingTrips||[])[0];return t?<div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><span style={{fontSize:13,color:"var(--text2)"}}>{new Date(t.date+"T12:00").toLocaleDateString(c.locale||"pt-BR",{day:"numeric",month:"long"})}</span><span style={{fontSize:16,fontWeight:700,color:"var(--accent)"}}>{fmt(t.total)}</span></div><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{t.items.slice(0,6).map((it,i)=>(<span key={i} style={{fontSize:11,background:"var(--bg3)",padding:"3px 8px",borderRadius:6,color:"var(--text3)"}}>{it.name}</span>))}{t.items.length>6&&<span style={{fontSize:11,color:"var(--text3)"}}>+{t.items.length-6}</span>}</div></div>:null;})()}</div>}
</div></div>);}

// ─── PANTRY ───
function PantryPage({data,setData,toast,user,mode}){const c=data.config;const[search,setSearch]=useState("");const[fL,setFL]=useState("Todos");const[fC,setFC]=useState("Todos");const[modal,setModal]=useState(null);const[form,setForm]=useState({});
const filtered=data.pantry.filter(i=>{if(search&&!i.name.toLowerCase().includes(search.toLowerCase()))return false;if(fL!=="Todos"&&i.location!==fL)return false;if(fC!=="Todos"&&i.category!==fC)return false;return true;}).sort((a,b)=>daysUntil(a.expiry)-daysUntil(b.expiry));
const openAdd=()=>{setForm({name:"",qty:"",unit:c.units[0]||"un",location:c.locations[0]||"",expiry:"",category:c.pantryCategories.slice(-1)[0]||""});setModal("add");};
const openEdit=(item)=>{setForm({...item});setModal("edit");};
const saveItem=()=>{if(!form.name)return;const stamp=editStamp(user);if(modal==="add"){setData(d=>({...d,pantry:[...d.pantry,{...form,id:Date.now(),qty:Number(form.qty)||1,...stamp}]}));toast("Item adicionado");}else{setData(d=>({...d,pantry:d.pantry.map(i=>i.id===form.id?{...form,qty:Number(form.qty),...stamp}:i)}));toast("Item atualizado");}setModal(null);};
const del=(id)=>{setData(d=>({...d,pantry:d.pantry.filter(i=>i.id!==id)}));toast("Item removido");};
const toGrocery=(item)=>{setData(d=>({...d,grocery:[...d.grocery,{id:Date.now(),name:item.name,qty:1,unit:item.unit,checked:false,category:item.category}]}));toast(`"${item.name}" → lista`);};
const w=c.expiryWarnDays||7;const shared=mode==="shared";
return(<div><div className="ph"><div className="pt">Despensa</div><div className="ps">Controle completo do que tem em casa</div></div>
<div className="tb"><div className="sb-i" style={{marginBottom:0,flex:1}}>{I.search}<input placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
<div style={{display:"flex",gap:8,flex:1}}><select value={fL} onChange={e=>setFL(e.target.value)} style={{flex:1}}><option>Todos os locais</option>{c.locations.map(l=><option key={l}>{l}</option>)}</select>
<select value={fC} onChange={e=>setFC(e.target.value)} style={{flex:1}}><option>Todas categorias</option>{c.pantryCategories.map(ct=><option key={ct}>{ct}</option>)}</select></div>
<div className="tr"><button className="btn bp" onClick={openAdd}>{I.plus} Adicionar</button></div></div>
<div className="card" style={{padding:0,overflow:"hidden"}}><div style={{overflowX:"auto"}}><table><thead><tr><th>Item</th><th>Qtd</th><th>Local</th><th>Categoria</th><th>Validade</th><th>Status</th><th></th></tr></thead><tbody>
{filtered.map(item=>{const d=daysUntil(item.expiry);const st=!item.expiry?"tg-n":d<0?"tg-r":d<=3?"tg-y":d<=w?"tg-b":"tg-g";const sx=!item.expiry?"—":d<0?"Vencido":d===0?"Hoje!":d<=w?`${d}d`:"OK";
return(<tr key={item.id}><td className="in">{item.name}{shared&&item.editBy&&<div style={{fontSize:10,color:"var(--text3)",marginTop:2}}>{item.editBy} · {timeAgo(item.editAt)}</div>}</td><td>{item.qty} {item.unit}</td><td><span className="tg tg-n">{item.location}</span></td><td style={{color:"var(--text3)"}}>{item.category}</td><td>{item.expiry?new Date(item.expiry+"T12:00").toLocaleDateString(c.locale||"pt-BR"):"—"}</td><td><span className={`tg ${st}`}>{sx}</span></td><td><div style={{display:"flex",gap:4}}><button className="bi" title="Editar" onClick={()=>openEdit(item)}>{I.edit}</button><button className="bi" title="→ Lista" onClick={()=>toGrocery(item)}>{I.grocery}</button><ConfirmDelete onConfirm={()=>del(item.id)}/></div></td></tr>);})}
{filtered.length===0&&<tr><td colSpan={7} style={{textAlign:"center",padding:32,color:"var(--text3)"}}>Nenhum item</td></tr>}
</tbody></table></div>
{/* Mobile cards */}
<div className="m-cards m-only" style={{padding:8}}>
{filtered.map(item=>{const d=daysUntil(item.expiry);const st=!item.expiry?"tg-n":d<0?"tg-r":d<=3?"tg-y":d<=w?"tg-b":"tg-g";const sx=!item.expiry?"—":d<0?"Vencido":d===0?"Hoje!":d<=w?`${d}d`:"OK";
return(<div className="m-card" key={item.id} style={{borderLeft:`3px solid ${d<0?"var(--red)":d<=w?"var(--yellow)":"var(--border)"}`}}>
<div className="m-card-h"><span className="m-card-n">{item.name}</span><span className={`tg ${st}`}>{sx}</span></div>
<div className="m-card-r"><span>{item.qty} {item.unit}</span><span>·</span><span className="tg tg-n">{item.location}</span><span>·</span><span style={{color:"var(--text3)"}}>{item.category}</span>{item.expiry&&<><span>·</span><span style={{color:"var(--text3)"}}>{new Date(item.expiry+"T12:00").toLocaleDateString(c.locale||"pt-BR")}</span></>}</div>
{shared&&item.editBy&&<div style={{fontSize:10,color:"var(--text3)",marginTop:4}}>{item.editBy} · {timeAgo(item.editAt)}</div>}
<div className="m-card-a"><button className="bi" onClick={()=>openEdit(item)}>{I.edit}</button><button className="bi" onClick={()=>toGrocery(item)}>{I.grocery}</button><ConfirmDelete onConfirm={()=>del(item.id)}/></div>
</div>);})}
{filtered.length===0&&<div style={{textAlign:"center",padding:32,color:"var(--text3)"}}>Nenhum item</div>}
</div></div>
{modal&&<Modal title={modal==="add"?"Novo Item":"Editar Item"} onClose={()=>setModal(null)}>
<div className="fr"><div className="fg" style={{flex:2}}><label className="fl">Nome</label><input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} autoFocus/></div>
<div className="fg"><label className="fl">Qtd</label><input type="number" value={form.qty||""} onChange={e=>setForm({...form,qty:e.target.value})}/></div>
<div className="fg"><label className="fl">Unidade</label><select value={form.unit||c.units[0]} onChange={e=>setForm({...form,unit:e.target.value})}>{c.units.map(u=><option key={u}>{u}</option>)}</select></div></div>
<div className="fr"><div className="fg"><label className="fl">Local</label><select value={form.location||c.locations[0]} onChange={e=>setForm({...form,location:e.target.value})}>{c.locations.map(l=><option key={l}>{l}</option>)}</select></div>
<div className="fg"><label className="fl">Categoria</label><select value={form.category||""} onChange={e=>setForm({...form,category:e.target.value})}>{c.pantryCategories.map(ct=><option key={ct}>{ct}</option>)}</select></div>
<div className="fg"><label className="fl">Validade</label><input type="date" value={form.expiry||""} onChange={e=>setForm({...form,expiry:e.target.value})}/></div></div>
<div className="ma"><button className="btn bg" onClick={()=>setModal(null)}>Cancelar</button><button className="btn bp" onClick={saveItem}>Salvar</button></div>
</Modal>}</div>);}


// ─── GROCERY ───
// Countable units: price × qty. Weight/volume units: price = total (no multiply)
const COUNTABLE_UNITS=["un","pacote","lata","caixa","dúzia","fatia","sachê"];
const isCountable=(u)=>COUNTABLE_UNITS.includes(u);

function GroceryPage({data,setData,toast,user,mode}){const c=data.config;const[modal,setModal]=useState(false);const[form,setForm]=useState({});const[priceModal,setPriceModal]=useState(null);const[unitPriceVal,setUnitPriceVal]=useState("");const[editingPrice,setEditingPrice]=useState(null);const[editUP,setEditUP]=useState("");const[finishModal,setFinishModal]=useState(false);const[finishCard,setFinishCard]=useState(c.cards?.[0]||"");const[finishPaid,setFinishPaid]=useState(false);
const[lots,setLots]=useState([]);const[lotsMode,setLotsMode]=useState(false);
const vwCats=c.variableWeightCategories||[];
const isVW=(cat)=>vwCats.includes(cat);
const fmt=(n)=>fmtCurrency(n,c.locale,c.currency);
const calcTotal=(price,qty,unit)=>{const p=Number(price)||0;return isCountable(unit)?p*(Number(qty)||1):p;};
const toggle=(id)=>{const item=data.grocery.find(i=>i.id===id);if(item&&!item.checked){setPriceModal(item);setUnitPriceVal(item.unitPrice||"");if(isVW(item.category)){setLotsMode(true);setLots([{id:1,weight:"",price:""}]);}else{setLotsMode(false);setLots([]);}}else{setData(d=>({...d,grocery:d.grocery.map(i=>i.id===id?{...i,checked:!i.checked}:i)}));}};
const addLot=()=>setLots(l=>[...l,{id:Date.now(),weight:"",price:""}]);
const removeLot=(lid)=>setLots(l=>l.filter(x=>x.id!==lid));
const updateLot=(lid,field,val)=>setLots(l=>l.map(x=>x.id===lid?{...x,[field]:val}:x));
const lotsTotal=lots.reduce((a,l)=>a+(Number(l.price)||0),0);
const lotsTotalWeight=lots.reduce((a,l)=>a+(Number(l.weight)||0),0);
const confirmCheck=()=>{if(!priceModal)return;
if(lotsMode&&lots.some(l=>Number(l.price)>0)){
// Lots mode: save each lot as a price entry, sum as total
const totalP=lotsTotal;const totalW=lotsTotalWeight;const avgPrice=totalW>0?totalP/totalW:totalP;
setData(d=>{const newPH=[...(d.priceHistory||[])];lots.forEach(l=>{if(Number(l.price)>0){newPH.push({id:Date.now()+Math.random(),name:priceModal.name,unitPrice:Number(l.price),totalPrice:Number(l.price),qty:Number(l.weight)||1,unit:priceModal.unit,date:today(),isLot:true});}});return{...d,grocery:d.grocery.map(i=>i.id===priceModal.id?{...i,checked:true,unitPrice:avgPrice,price:totalP,lots:lots.filter(l=>Number(l.price)>0).map(l=>({weight:Number(l.weight)||0,price:Number(l.price)||0}))}:i),priceHistory:newPH};});
const validLots=lots.filter(l=>Number(l.price)>0);
toast(`${priceModal.name}: ${validLots.length} lote${validLots.length>1?"s":""} = ${fmt(totalP)}`);
}else{
const up=Number(unitPriceVal)||0;const cnt=isCountable(priceModal.unit);const tp=calcTotal(up,priceModal.qty,priceModal.unit);setData(d=>{const newPH=up>0?[...(d.priceHistory||[]),{id:Date.now(),name:priceModal.name,unitPrice:up,totalPrice:tp,qty:priceModal.qty,unit:priceModal.unit,date:today()}]:d.priceHistory||[];return{...d,grocery:d.grocery.map(i=>i.id===priceModal.id?{...i,checked:true,unitPrice:up,price:tp}:i),priceHistory:newPH};});if(up>0){const label=cnt&&priceModal.qty>1?`${priceModal.name}: ${fmt(up)} × ${priceModal.qty} = ${fmt(tp)}`:`${priceModal.name}: ${fmt(up)}`;toast(label);}else toast("Item marcado");
}setPriceModal(null);setUnitPriceVal("");setLots([]);setLotsMode(false);};
const skipPrice=()=>{setData(d=>({...d,grocery:d.grocery.map(i=>i.id===priceModal.id?{...i,checked:true}:i)}));toast("Item marcado");setPriceModal(null);setUnitPriceVal("");setLots([]);setLotsMode(false);};
const saveEditPrice=()=>{if(!editingPrice)return;const up=Number(editUP)||0;const tp=calcTotal(up,editingPrice.qty,editingPrice.unit);setData(d=>{const newGrocery=d.grocery.map(i=>i.id===editingPrice.id?{...i,unitPrice:up,price:tp}:i);let newPH=[...(d.priceHistory||[])];const existIdx=newPH.findIndex(p=>p.name===editingPrice.name&&p.date===today());if(up>0){if(existIdx>=0){newPH[existIdx]={...newPH[existIdx],unitPrice:up,totalPrice:tp};}else{newPH.push({id:Date.now(),name:editingPrice.name,unitPrice:up,totalPrice:tp,qty:editingPrice.qty,unit:editingPrice.unit,date:today()});}}return{...d,grocery:newGrocery,priceHistory:newPH};});toast("Preço atualizado");setEditingPrice(null);};
const rem=(id)=>setData(d=>({...d,grocery:d.grocery.filter(i=>i.id!==id)}));
const add=()=>{if(!form.name)return;setData(d=>({...d,grocery:[...d.grocery,{id:Date.now(),name:form.name,qty:Number(form.qty)||1,unit:form.unit||c.units[0],checked:false,category:form.category||c.pantryCategories[0],price:0,unitPrice:0}]}));toast("Adicionado");setModal(false);};
const openFinish=()=>{setFinishCard(c.cards?.[0]||"");setFinishPaid(false);setFinishModal(true);};
const doFinish=()=>{const checked=data.grocery.filter(i=>i.checked);if(checked.length===0)return;const total=checked.reduce((a,i)=>a+(i.price||0),0);const trip={id:Date.now(),date:today(),items:checked.map(i=>({name:i.name,qty:i.qty,unit:i.unit,unitPrice:i.unitPrice||0,totalPrice:i.price||0})),total,card:finishCard};
const desc="Compra " + new Date().toLocaleDateString(c.locale||"pt-BR",{day:"numeric",month:"short"});
const expense={id:Date.now()+1,desc,amount:total,category:"Mercado",date:today(),paid:finishPaid,card:finishCard,fromTrip:trip.id,type:"variavel"};
setData(d=>({...d,shoppingTrips:[trip,...(d.shoppingTrips||[])],expenses:[expense,...(d.expenses||[])],pantry:[...d.pantry,...checked.map(i=>({id:Date.now()+Math.random(),name:i.name,qty:i.qty,unit:i.unit,location:c.locations[0]||"Despensa",expiry:"",category:i.category}))],grocery:d.grocery.filter(i=>!i.checked)}));
toast(`Compra finalizada! ${fmt(total)} — ${finishCard||"sem cartão"}`);setFinishModal(false);};
const pend=data.grocery.filter(i=>!i.checked).sort((a,b)=>(a.category||"").localeCompare(b.category||""));const done=data.grocery.filter(i=>i.checked);
const doneTotal=done.reduce((a,i)=>a+(i.price||0),0);
const lastUnitPrice=(name)=>{const h=(data.priceHistory||[]).filter(p=>p.name.toLowerCase()===name.toLowerCase()).sort((a,b)=>b.date.localeCompare(a.date));return h[0]?.unitPrice||h[0]?.totalPrice||null;};
// Group pending by category
const pendByCat={};pend.forEach(i=>{const cat=i.category||"Outros";if(!pendByCat[cat])pendByCat[cat]=[];pendByCat[cat].push(i);});
const catOrder=Object.keys(pendByCat).sort();
return(<div><div className="ph"><div className="pt">Lista de Compras</div><div className="ps">{pend.length} pendentes · {done.length} comprados{doneTotal>0&&` · Total: ${fmt(doneTotal)}`}</div></div>
<div className="tb"><button className="btn bp" onClick={()=>{setForm({name:"",qty:"",unit:c.units[0],category:c.pantryCategories[0]});setModal(true);}}>{I.plus} Adicionar</button>
{done.length>0&&<button className="btn bg" onClick={openFinish}>Finalizar Compra ({fmt(doneTotal)})</button>}</div>
<div className="card" style={{padding:0}}>{pend.length===0&&done.length===0&&<div style={{padding:40,textAlign:"center",color:"var(--text3)"}}>Lista vazia</div>}
{catOrder.map(cat=>(<div key={cat}>{catOrder.length>1&&<div style={{padding:"8px 16px",fontSize:11,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:1.5,background:"var(--bg3)",borderBottom:"1px solid var(--border)"}}>{cat} ({pendByCat[cat].length})</div>}
{pendByCat[cat].map(i=>{const lp=lastUnitPrice(i.name);return(<div className="cr" key={i.id}><div className="cb" onClick={()=>toggle(i.id)}/><span className="cx">{i.name}</span><span className="cm">{i.qty} {i.unit}</span>{lp&&<span style={{fontSize:11,color:"var(--text3)",background:"var(--bg4)",padding:"2px 8px",borderRadius:12}}>~{fmt(lp)}</span>}{catOrder.length<=1&&<span className="tg tg-n">{i.category}</span>}<ConfirmDelete onConfirm={()=>rem(i.id)}/></div>);})}</div>))}{done.length>0&&<div style={{padding:"12px 16px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:11,textTransform:"uppercase",letterSpacing:1.5,color:"var(--text3)",fontWeight:600}}>Comprados ({done.length})</span>{doneTotal>0&&<span style={{fontSize:14,fontWeight:700,color:"var(--accent)"}}>{fmt(doneTotal)}</span>}</div>}
{done.map(i=>{const cnt=isCountable(i.unit);const hasLots=i.lots&&i.lots.length>1;return(<div className="cr" key={i.id} style={{opacity:.7,flexWrap:"wrap"}}>
<div className="cb ck" onClick={()=>toggle(i.id)}><Icon d={<polyline points="20 6 9 17 4 12"/>} size={14} color="#fff"/></div>
<span className="cx dn">{i.name}</span><span className="cm">{i.qty} {i.unit}</span>
{i.price>0?<span style={{fontSize:12,color:"var(--green)",cursor:"pointer",display:"flex",alignItems:"center",gap:4}} onClick={()=>{setEditingPrice(i);setEditUP(i.unitPrice||"");}}>{hasLots?`${i.lots.length} lotes = `:cnt&&i.qty>1?`${fmt(i.unitPrice||0)} × ${i.qty} = `:""}{fmt(i.price)} {I.edit}</span>:<span style={{fontSize:11,color:"var(--text3)",cursor:"pointer"}} onClick={()=>{setEditingPrice(i);setEditUP("");}}>+ preço</span>}
<ConfirmDelete onConfirm={()=>rem(i.id)}/>
{hasLots&&<div style={{width:"100%",paddingLeft:34,display:"flex",gap:6,flexWrap:"wrap",marginTop:2}}>{i.lots.map((l,idx)=>(<span key={idx} style={{fontSize:10,background:"var(--bg4)",padding:"2px 8px",borderRadius:8,color:"var(--text3)"}}>{l.weight>0?`${l.weight}${i.unit} `:""}{fmt(l.price)}</span>))}</div>}
</div>);})}
</div>
<ReceiptScanner data={data} setData={setData} toast={toast} c={c}/>
{(data.shoppingTrips||[]).length>0&&<div className="card"><div className="ct">Últimas Compras</div>
{(data.shoppingTrips||[]).slice(0,5).map(trip=>(<div key={trip.id} style={{borderBottom:"1px solid var(--border)",padding:"12px 0"}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
<div><span style={{fontSize:13,color:"var(--text2)"}}>{new Date(trip.date+"T12:00").toLocaleDateString(c.locale||"pt-BR",{day:"numeric",month:"long"})}</span>{trip.card&&<span className="tg tg-n" style={{marginLeft:8}}>{trip.card}</span>}</div>
<span style={{fontSize:15,fontWeight:700,color:"var(--accent)"}}>{fmt(trip.total)}</span>
</div>
<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{trip.items.map((it,idx)=>(<span key={idx} style={{fontSize:11,background:"var(--bg3)",padding:"3px 8px",borderRadius:6,color:"var(--text3)"}}>{it.name} {it.totalPrice>0?fmt(it.totalPrice):""}</span>))}</div>
</div>))}
</div>}
{modal&&<Modal title="Novo Item" onClose={()=>setModal(false)}>
<div className="fr"><div className="fg" style={{flex:2}}><label className="fl">Nome</label><input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} autoFocus/></div><div className="fg"><label className="fl">Qtd</label><input type="number" value={form.qty||""} onChange={e=>setForm({...form,qty:e.target.value})}/></div></div>
<div className="fr"><div className="fg"><label className="fl">Unidade</label><select value={form.unit||c.units[0]} onChange={e=>setForm({...form,unit:e.target.value})}>{c.units.map(u=><option key={u}>{u}</option>)}</select></div>
<div className="fg"><label className="fl">Categoria</label><select value={form.category||c.pantryCategories[0]} onChange={e=>setForm({...form,category:e.target.value})}>{c.pantryCategories.map(ct=><option key={ct}>{ct}</option>)}</select></div></div>
<div className="ma"><button className="btn bg" onClick={()=>setModal(false)}>Cancelar</button><button className="btn bp" onClick={add}>Adicionar</button></div>
</Modal>}
{priceModal&&<Modal title={`Preço: ${priceModal.name}`} onClose={()=>{skipPrice();}}>
{/* Toggle lots mode for variable weight items */}
{isVW(priceModal.category)&&<div style={{display:"flex",gap:8,marginBottom:16}}><button className={`btn ${!lotsMode?"bp":"bg"} bs`} onClick={()=>{setLotsMode(false);setLots([]);}}>Preço único</button><button className={`btn ${lotsMode?"bp":"bg"} bs`} onClick={()=>{setLotsMode(true);if(lots.length===0)setLots([{id:1,weight:"",price:""}]);}}>Vários lotes</button></div>}
{!lotsMode&&<>
<div style={{fontSize:13,color:"var(--text2)",marginBottom:16}}>{isCountable(priceModal.unit)?`Quanto custa cada ${priceModal.unit}? (opcional)`:`Quanto custa o ${priceModal.name} de ${priceModal.qty}${priceModal.unit}? (opcional)`}</div>
<div className="fr"><div className="fg"><label className="fl">{isCountable(priceModal.unit)?"Preço por "+priceModal.unit:"Preço total"}</label><MoneyInput value={unitPriceVal} onChange={v=>setUnitPriceVal(v)} autoFocus onKeyDown={e=>e.key==="Enter"&&confirmCheck()}/></div>
<div className="fg"><label className="fl">Item</label><div style={{padding:"10px 14px",background:"var(--bg4)",borderRadius:8,fontSize:14,color:"var(--text2)"}}>{priceModal.qty} {priceModal.unit}</div></div></div>
{Number(unitPriceVal)>0&&isCountable(priceModal.unit)&&priceModal.qty>1&&<div style={{fontSize:16,fontWeight:700,color:"var(--accent)",marginTop:8,padding:"10px 14px",background:"var(--accent-glow)",borderRadius:8,textAlign:"center"}}>Total: {fmt(Number(unitPriceVal)*(priceModal.qty||1))}</div>}
{Number(unitPriceVal)>0&&!isCountable(priceModal.unit)&&<div style={{fontSize:14,fontWeight:600,color:"var(--accent)",marginTop:8,padding:"10px 14px",background:"var(--accent-glow)",borderRadius:8,textAlign:"center"}}>{priceModal.name} ({priceModal.qty}{priceModal.unit}): {fmt(Number(unitPriceVal))}</div>}
</>}
{lotsMode&&<>
<div style={{fontSize:13,color:"var(--text2)",marginBottom:12}}>Registre cada bandeja/pote com seu peso e preço individual.</div>
{lots.map((lot,idx)=>(<div key={lot.id} style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
<span style={{fontSize:12,color:"var(--text3)",fontWeight:700,minWidth:24}}>{idx+1}.</span>
<div style={{flex:1}}><input type="number" step="0.001" value={lot.weight} onChange={e=>updateLot(lot.id,"weight",e.target.value)} placeholder={`Peso (${priceModal.unit||"kg"})`} style={{fontSize:14}}/></div>
<div style={{flex:1}}><MoneyInput value={lot.price} onChange={v=>updateLot(lot.id,"price",v)} placeholder="Preço" style={{fontSize:14}} onKeyDown={e=>{if(e.key==="Enter"){if(idx===lots.length-1)addLot();}}}/></div>
{lots.length>1&&<button className="bi" onClick={()=>removeLot(lot.id)} style={{padding:4,flexShrink:0}}><Icon d={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} size={14}/></button>}
</div>))}
<button className="btn bg bs" onClick={addLot} style={{marginBottom:12}}>+ Adicionar lote</button>
{lotsTotal>0&&<div style={{padding:"12px 14px",background:"var(--accent-glow)",borderRadius:8,textAlign:"center"}}><div style={{fontSize:18,fontWeight:800,color:"var(--accent)"}}>{fmt(lotsTotal)}</div><div style={{fontSize:12,color:"var(--text3)",marginTop:4}}>{lots.filter(l=>Number(l.price)>0).length} lote{lots.filter(l=>Number(l.price)>0).length!==1?"s":""}{lotsTotalWeight>0?` · ${lotsTotalWeight.toFixed(2)}${priceModal.unit||"kg"} total`:""}</div></div>}
</>}
{lastUnitPrice(priceModal.name)&&<div style={{fontSize:12,color:"var(--text3)",marginTop:8}}>Último preço: {fmt(lastUnitPrice(priceModal.name))}</div>}
<div className="ma"><button className="btn bg" onClick={skipPrice}>Pular</button><button className="btn bp" onClick={confirmCheck}>Registrar</button></div>
</Modal>}
{editingPrice&&<Modal title={`Editar preço: ${editingPrice.name}`} onClose={()=>setEditingPrice(null)}>
<div className="fr"><div className="fg"><label className="fl">{isCountable(editingPrice.unit)?"Preço por "+editingPrice.unit:"Preço total"}</label><MoneyInput value={editUP} onChange={v=>setEditUP(v)} autoFocus onKeyDown={e=>e.key==="Enter"&&saveEditPrice()}/></div>
<div className="fg"><label className="fl">Item</label><div style={{padding:"10px 14px",background:"var(--bg4)",borderRadius:8,fontSize:14,color:"var(--text2)"}}>{editingPrice.qty} {editingPrice.unit}</div></div></div>
{Number(editUP)>0&&isCountable(editingPrice.unit)&&editingPrice.qty>1&&<div style={{fontSize:16,fontWeight:700,color:"var(--accent)",marginTop:8,padding:"10px 14px",background:"var(--accent-glow)",borderRadius:8,textAlign:"center"}}>Total: {fmt(Number(editUP)*(editingPrice.qty||1))}</div>}
<div className="ma"><button className="btn bg" onClick={()=>setEditingPrice(null)}>Cancelar</button><button className="btn bp" onClick={saveEditPrice}>Salvar</button></div>
</Modal>}
{finishModal&&<Modal title="Finalizar Compra" onClose={()=>setFinishModal(false)}>
<div style={{fontSize:24,fontWeight:800,color:"var(--accent)",textAlign:"center",marginBottom:16}}>{fmt(doneTotal)}</div>
<div style={{fontSize:13,color:"var(--text2)",marginBottom:16,textAlign:"center"}}>{done.length} ite{done.length>1?"ns":"m"} — vai para Finanças e Despensa</div>
<div className="fg" style={{marginBottom:12}}><label className="fl">Forma de pagamento</label>
<select value={finishCard} onChange={e=>setFinishCard(e.target.value)} style={{width:"100%"}}>
<option value="">Nenhum</option>{(c.cards||[]).map(cd=><option key={cd}>{cd}</option>)}</select></div>
<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,cursor:"pointer"}} onClick={()=>setFinishPaid(!finishPaid)}>
<div style={{width:22,height:22,borderRadius:6,border:`2px solid ${finishPaid?"var(--green)":"var(--yellow)"}`,background:finishPaid?"var(--green)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s"}}>{finishPaid&&<Icon d={<polyline points="20 6 9 17 4 12"/>} size={14} color="#fff"/>}</div>
<span style={{fontSize:14,color:finishPaid?"var(--green)":"var(--yellow)",fontWeight:500}}>{finishPaid?"Já pago":"Ainda não pago (cartão, fatura, etc)"}</span>
</div>
<div className="ma"><button className="btn bg" onClick={()=>setFinishModal(false)}>Cancelar</button><button className="btn bp" onClick={doFinish}>Confirmar</button></div>
</Modal>}
</div>);}

// ─── CHORES ───
function ChoresPage({data,setData,toast,user,mode}){const c=data.config;const[modal,setModal]=useState(null);const[form,setForm]=useState({});
const gs=(ch)=>{const d=Math.abs(daysUntil(ch.lastDone));const l={"Diário":1,"2x Semana":3,"Semanal":7,"Quinzenal":14,"Mensal":30};const lv=l[ch.freq]||7;if(d>=lv*1.5)return"overdue";if(d>=lv)return"due";return"ok";};
const md=(id)=>{setData(d=>({...d,chores:d.chores.map(ch=>ch.id===id?{...ch,lastDone:today(),...editStamp(user)}:ch)}));toast("Concluída!");};
const sv=()=>{if(!form.name)return;const stamp=editStamp(user);if(modal==="add"){setData(d=>({...d,chores:[...d.chores,{...form,id:Date.now(),effort:Number(form.effort)||1,lastDone:today(),...stamp}]}));toast("Criada");}else{setData(d=>({...d,chores:d.chores.map(ch=>ch.id===form.id?{...form,effort:Number(form.effort),...stamp}:ch)}));toast("Atualizada");}setModal(null);};
const dl=(id)=>{setData(d=>({...d,chores:d.chores.filter(ch=>ch.id!==id)}));toast("Removida");};
const shared=mode==="shared";
const sorted=[...data.chores].sort((a,b)=>{const p={overdue:0,due:1,ok:2};return(p[gs(a)]||0)-(p[gs(b)]||0);});
return(<div><div className="ph"><div className="pt">Tarefas da Casa</div><div className="ps">Organize, distribua e acompanhe</div></div>
{data.members.length>1&&<div className="sg" style={{marginBottom:20}}>{data.members.map(m=><div className="sc bl" key={m}><div className="sl">{m}</div><div className="sv">{data.chores.filter(ch=>ch.assignee===m).length}</div><div className="sd">tarefas</div></div>)}</div>}
<div className="tb"><button className="btn bp" onClick={()=>{setForm({name:"",room:c.rooms[0]||"",assignee:data.members[0]||"Todos",freq:c.choreFreqs[2]||"Semanal",effort:1});setModal("add");}}>{I.plus} Nova Tarefa</button></div>
<div className="card" style={{padding:0,overflow:"hidden"}}><div style={{overflowX:"auto"}}><table><thead><tr><th>Tarefa</th><th>Cômodo</th><th>Responsável</th><th>Freq</th><th>Esforço</th><th>Última vez</th><th>Status</th><th></th></tr></thead><tbody>
{sorted.map(ch=>{const s=gs(ch);return(<tr key={ch.id}><td className="in">{ch.name}{shared&&ch.editBy&&<div style={{fontSize:10,color:"var(--text3)",marginTop:2}}>{ch.editBy} · {timeAgo(ch.editAt)}</div>}</td><td><span className="tg tg-n">{ch.room}</span></td><td>{ch.assignee}</td><td style={{color:"var(--text3)"}}>{ch.freq}</td><td><div className="ef">{[1,2,3].map(n=><div key={n} className={`eo ${n<=ch.effort?"ea":""}`}/>)}</div></td><td style={{fontSize:13}}>{ch.lastDone?new Date(ch.lastDone+"T12:00").toLocaleDateString(c.locale||"pt-BR"):"—"}</td><td><span className={`tg ${s==="overdue"?"tg-r":s==="due"?"tg-y":"tg-g"}`}>{s==="overdue"?"Atrasada":s==="due"?"Pendente":"Em dia"}</span></td><td><div style={{display:"flex",gap:4}}><button className="btn bg bs" onClick={()=>md(ch.id)}>{I.check} Feito</button><button className="bi" onClick={()=>{setForm({...ch});setModal("edit");}}>{I.edit}</button><ConfirmDelete onConfirm={()=>dl(ch.id)}/></div></td></tr>);})}
</tbody></table></div>
{/* Mobile cards */}
<div className="m-cards m-only" style={{padding:8}}>
{sorted.map(ch=>{const s=gs(ch);return(<div className="m-card" key={ch.id} style={{borderLeft:`3px solid ${s==="overdue"?"var(--red)":s==="due"?"var(--yellow)":"var(--green)"}`}}>
<div className="m-card-h"><span className="m-card-n">{ch.name}</span><span className={`tg ${s==="overdue"?"tg-r":s==="due"?"tg-y":"tg-g"}`}>{s==="overdue"?"Atrasada":s==="due"?"Pendente":"Em dia"}</span></div>
<div className="m-card-r"><span className="tg tg-n">{ch.room}</span><span>{ch.assignee}</span><span>·</span><span style={{color:"var(--text3)"}}>{ch.freq}</span><span>·</span><div className="ef">{[1,2,3].map(n=><div key={n} className={`eo ${n<=ch.effort?"ea":""}`}/>)}</div></div>
{shared&&ch.editBy&&<div style={{fontSize:10,color:"var(--text3)",marginTop:4}}>{ch.editBy} · {timeAgo(ch.editAt)}</div>}
<div className="m-card-a"><button className="btn bg bs" onClick={()=>md(ch.id)}>{I.check} Feito</button><button className="bi" onClick={()=>{setForm({...ch});setModal("edit");}}>{I.edit}</button><ConfirmDelete onConfirm={()=>dl(ch.id)}/></div>
</div>);})}
</div></div>
{modal&&<Modal title={modal==="add"?"Nova Tarefa":"Editar Tarefa"} onClose={()=>setModal(null)}>
<div className="fr"><div className="fg" style={{flex:2}}><label className="fl">Nome</label><input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} autoFocus/></div></div>
<div className="fr"><div className="fg"><label className="fl">Cômodo</label><select value={form.room||c.rooms[0]} onChange={e=>setForm({...form,room:e.target.value})}>{c.rooms.map(r=><option key={r}>{r}</option>)}</select></div>
<div className="fg"><label className="fl">Responsável</label><select value={form.assignee||"Todos"} onChange={e=>setForm({...form,assignee:e.target.value})}><option>Todos</option>{data.members.map(m=><option key={m}>{m}</option>)}</select></div></div>
<div className="fr"><div className="fg"><label className="fl">Frequência</label><select value={form.freq||c.choreFreqs[0]} onChange={e=>setForm({...form,freq:e.target.value})}>{c.choreFreqs.map(f=><option key={f}>{f}</option>)}</select></div>
<div className="fg"><label className="fl">Esforço</label><select value={form.effort||1} onChange={e=>setForm({...form,effort:e.target.value})}><option value={1}>1 - Leve</option><option value={2}>2 - Médio</option><option value={3}>3 - Pesado</option></select></div></div>
<div className="ma"><button className="btn bg" onClick={()=>setModal(null)}>Cancelar</button><button className="btn bp" onClick={sv}>Salvar</button></div>
</Modal>}</div>);}

// ─── MEALS ───
function MealsPage({data,setData,toast}){const c=data.config;const[editing,setEditing]=useState(null);const[rt,setRt]=useState("");
const[showMgmt,setShowMgmt]=useState(false);const[newDay,setNewDay]=useState("");const[newMeal,setNewMeal]=useState("");
const[renaming,setRenaming]=useState(null);const[renameVal,setRenameVal]=useState("");
const gm=(day,meal)=>data.meals.find(m=>m.day===day&&m.meal===meal);
const sv=()=>{if(!editing)return;const ex=gm(editing.day,editing.meal);if(ex)setData(d=>({...d,meals:d.meals.map(m=>m.id===ex.id?{...m,recipe:rt}:m)}));else setData(d=>({...d,meals:[...d.meals,{id:Date.now(),day:editing.day,meal:editing.meal,recipe:rt}]}));toast("Cardápio atualizado");setEditing(null);};
const cl=(day,meal)=>setData(d=>({...d,meals:d.meals.filter(m=>!(m.day===day&&m.meal===meal))}));
// Day management
const addDay=()=>{const v=newDay.trim();if(!v||c.mealDays.includes(v))return;setData(d=>({...d,config:{...d.config,mealDays:[...d.config.mealDays,v]}}));setNewDay("");toast(`"${v}" adicionado`);};
const removeDay=(day)=>{setData(d=>({...d,config:{...d.config,mealDays:d.config.mealDays.filter(x=>x!==day)},meals:d.meals.filter(m=>m.day!==day)}));toast(`"${day}" removido`);};
const renameDay=(oldName)=>{const v=renameVal.trim();if(!v||v===oldName||(c.mealDays.includes(v)&&v!==oldName)){setRenaming(null);return;}setData(d=>({...d,config:{...d.config,mealDays:d.config.mealDays.map(x=>x===oldName?v:x)},meals:d.meals.map(m=>m.day===oldName?{...m,day:v}:m)}));toast(`Renomeado para "${v}"`);setRenaming(null);};
const moveDay=(idx,dir)=>{const arr=[...c.mealDays];const ni=idx+dir;if(ni<0||ni>=arr.length)return;[arr[idx],arr[ni]]=[arr[ni],arr[idx]];setData(d=>({...d,config:{...d.config,mealDays:arr}}));};
// Meal type management
const addMealType=()=>{const v=newMeal.trim();if(!v||c.mealTypes.includes(v))return;setData(d=>({...d,config:{...d.config,mealTypes:[...d.config.mealTypes,v]}}));setNewMeal("");toast(`"${v}" adicionado`);};
const removeMealType=(mt)=>{setData(d=>({...d,config:{...d.config,mealTypes:d.config.mealTypes.filter(x=>x!==mt)},meals:d.meals.filter(m=>m.meal!==mt)}));toast(`"${mt}" removido`);};
const renameMealType=(oldName)=>{const v=renameVal.trim();if(!v||v===oldName||(c.mealTypes.includes(v)&&v!==oldName)){setRenaming(null);return;}setData(d=>({...d,config:{...d.config,mealTypes:d.config.mealTypes.map(x=>x===oldName?v:x)},meals:d.meals.map(m=>m.meal===oldName?{...m,meal:v}:m)}));toast(`Renomeado para "${v}"`);setRenaming(null);};
const moveMealType=(idx,dir)=>{const arr=[...c.mealTypes];const ni=idx+dir;if(ni<0||ni>=arr.length)return;[arr[idx],arr[ni]]=[arr[ni],arr[idx]];setData(d=>({...d,config:{...d.config,mealTypes:arr}}));};
return(<div><div className="ph"><div className="pt">Cardápio Semanal</div><div className="ps">Planeje suas refeições — totalmente customizável</div></div>
<div className="tb"><button className={`btn ${showMgmt?"bp":"bg"} bs`} onClick={()=>setShowMgmt(!showMgmt)}>{I.settings} {showMgmt?"Fechar edição":"Editar dias e refeições"}</button></div>
{showMgmt&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:24}}>
{/* Days management */}
<div className="card" style={{marginBottom:0}}><div className="sst">📅 Dias</div>
<div style={{display:"flex",flexDirection:"column",gap:6}}>
{c.mealDays.map((day,idx)=>(<div key={day} style={{display:"flex",alignItems:"center",gap:6,background:"var(--bg3)",padding:"8px 12px",borderRadius:8}}>
<div style={{display:"flex",flexDirection:"column",gap:2}}>
<button className="bi" style={{padding:2,border:"none"}} onClick={()=>moveDay(idx,-1)} title="Mover para cima"><Icon d={<polyline points="18 15 12 9 6 15"/>} size={12}/></button>
<button className="bi" style={{padding:2,border:"none"}} onClick={()=>moveDay(idx,1)} title="Mover para baixo"><Icon d={<polyline points="6 9 12 15 18 9"/>} size={12}/></button>
</div>
{renaming&&renaming.type==="day"&&renaming.name===day?
<div style={{flex:1,display:"flex",gap:4}}><input value={renameVal} onChange={e=>setRenameVal(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")renameDay(day);if(e.key==="Escape")setRenaming(null);}} autoFocus style={{padding:"4px 8px",fontSize:13}}/><button className="btn bp bs" onClick={()=>renameDay(day)}>OK</button></div>:
<><span style={{flex:1,fontWeight:500,fontSize:14}}>{day}</span>
<button className="bi" style={{padding:4}} onClick={()=>{setRenaming({type:"day",name:day});setRenameVal(day);}} title="Renomear">{I.edit}</button></>}
<button className="bi" style={{padding:4}} onClick={()=>{if(confirm(`Remover "${day}" e todas as suas refeições?`))removeDay(day);}} title="Remover"><Icon d={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} size={14}/></button>
</div>))}
</div>
<div className="ta" style={{marginTop:8}}><input value={newDay} onChange={e=>setNewDay(e.target.value)} placeholder="Novo dia... (ex: Feriado)" onKeyDown={e=>e.key==="Enter"&&addDay()}/><button className="btn bp bs" onClick={addDay}>{I.plus}</button></div>
</div>
{/* Meal types management */}
<div className="card" style={{marginBottom:0}}><div className="sst">🍽 Refeições</div>
<div style={{display:"flex",flexDirection:"column",gap:6}}>
{c.mealTypes.map((mt,idx)=>(<div key={mt} style={{display:"flex",alignItems:"center",gap:6,background:"var(--bg3)",padding:"8px 12px",borderRadius:8}}>
<div style={{display:"flex",flexDirection:"column",gap:2}}>
<button className="bi" style={{padding:2,border:"none"}} onClick={()=>moveMealType(idx,-1)} title="Mover para cima"><Icon d={<polyline points="18 15 12 9 6 15"/>} size={12}/></button>
<button className="bi" style={{padding:2,border:"none"}} onClick={()=>moveMealType(idx,1)} title="Mover para baixo"><Icon d={<polyline points="6 9 12 15 18 9"/>} size={12}/></button>
</div>
{renaming&&renaming.type==="meal"&&renaming.name===mt?
<div style={{flex:1,display:"flex",gap:4}}><input value={renameVal} onChange={e=>setRenameVal(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")renameMealType(mt);if(e.key==="Escape")setRenaming(null);}} autoFocus style={{padding:"4px 8px",fontSize:13}}/><button className="btn bp bs" onClick={()=>renameMealType(mt)}>OK</button></div>:
<><span style={{flex:1,fontWeight:500,fontSize:14}}>{mt}</span>
<button className="bi" style={{padding:4}} onClick={()=>{setRenaming({type:"meal",name:mt});setRenameVal(mt);}} title="Renomear">{I.edit}</button></>}
<button className="bi" style={{padding:4}} onClick={()=>{if(confirm(`Remover "${mt}" de todos os dias?`))removeMealType(mt);}} title="Remover"><Icon d={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} size={14}/></button>
</div>))}
</div>
<div className="ta" style={{marginTop:8}}><input value={newMeal} onChange={e=>setNewMeal(e.target.value)} placeholder="Nova refeição... (ex: Ceia)" onKeyDown={e=>e.key==="Enter"&&addMealType()}/><button className="btn bp bs" onClick={addMealType}>{I.plus}</button></div>
</div>
</div>}
{c.mealDays.map(day=>(<div className="card" key={day} style={{marginBottom:16}}><div className="ct" style={{color:"var(--accent)"}}>{day}</div><div className="mg">{c.mealTypes.map(meal=>{const m=gm(day,meal);return(<div className="mk" key={meal} onClick={()=>{setEditing({day,meal});setRt(m?.recipe||"");}}><div className="mt">{meal}</div>{m?<div className="mr">{m.recipe}</div>:<div className="me">+ adicionar</div>}</div>);})}</div></div>))}
{c.mealDays.length===0&&<div className="card" style={{textAlign:"center",color:"var(--text3)",padding:40}}>Nenhum dia configurado. Clique em "Editar dias e refeições" para começar.</div>}
{editing&&<Modal title={`${editing.day} — ${editing.meal}`} onClose={()=>setEditing(null)}>
<div className="fg"><label className="fl">Receita / Prato</label><input value={rt} onChange={e=>setRt(e.target.value)} autoFocus/></div>
<div className="ma"><button className="btn bd bs" onClick={()=>{cl(editing.day,editing.meal);setEditing(null);}}>Limpar</button><button className="btn bg" onClick={()=>setEditing(null)}>Cancelar</button><button className="btn bp" onClick={sv}>Salvar</button></div>
</Modal>}</div>);}

// ─── SPLIT PANEL (extracted to avoid esbuild JSX parse issues) ───
function SplitPanel({form,setForm,fmt,myName,allMembers,toggleSplitPayer,setSplitPayerAmount}){
const payers=form.splitPayers||[];
const othTotal=payers.reduce((a,p)=>a+p.amount,0);
const diff=Math.abs((Number(form.splitMyShare)||0)+othTotal-(Number(form.splitTotal)||0));
const mismatch=diff>0.01;
const hasPayers=payers.length>0;
const[newPerson,setNewPerson]=useState("");
const addPerson=()=>{const n=newPerson.trim();if(!n||n===myName||payers.find(p=>p.name===n))return;toggleSplitPayer(n);setNewPerson("");};
return(<div style={{background:"var(--bg3)",borderRadius:10,padding:16}}>
<div className="fr"><div className="fg"><label className="fl">Valor total da conta</label><MoneyInput value={form.splitTotal||0} onChange={v=>{const ot=payers.reduce((a,p)=>a+p.amount,0);setForm({...form,splitTotal:v,splitMyShare:Math.max(0,v-ot)});}}/></div>
<div className="fg"><label className="fl">Minha parte ({myName})</label><div style={{padding:"10px 14px",background:"var(--bg4)",borderRadius:8,fontSize:16,fontWeight:700,color:"var(--accent)"}}>{fmt(Number(form.splitMyShare)||0)}</div></div></div>
<div style={{marginTop:8}}><label className="fl" style={{marginBottom:8,display:"block"}}>Quem mais paga?</label>
<div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>{allMembers.filter(m=>m!==myName&&!payers.find(p=>p.name===m)).map(m=>(<button key={m} className="btn bg bs" onClick={()=>toggleSplitPayer(m)} style={{borderRadius:20}}>{m}</button>))}</div>
<div style={{display:"flex",gap:8,marginBottom:10}}><input value={newPerson} onChange={e=>setNewPerson(e.target.value)} placeholder="Outra pessoa..." onKeyDown={e=>e.key==="Enter"&&addPerson()} style={{flex:1,padding:"8px 12px",fontSize:13}}/><button className="btn bp bs" onClick={addPerson} style={{flexShrink:0}}>+ Adicionar</button></div>
</div>
{payers.map(p=>(<div key={p.name} className="fr" style={{marginBottom:6,alignItems:"center"}}><div className="fg"><label className="fl">{p.name} paga</label><MoneyInput value={p.amount||0} onChange={v=>setSplitPayerAmount(p.name,v)}/></div><button className="bi" onClick={()=>toggleSplitPayer(p.name)} title="Remover" style={{marginTop:16,flexShrink:0}}><Icon d={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} size={14}/></button></div>))}
{hasPayers&&<div style={{fontSize:13,marginTop:8,padding:"8px 12px",borderRadius:8,background:"var(--purple-bg)",color:"var(--purple)"}}>Total: {fmt(Number(form.splitTotal)||0)} = {myName}: {fmt(Number(form.splitMyShare)||0)}{payers.map(p=>` + ${p.name}: ${fmt(p.amount)}`).join("")}{mismatch&&<span style={{color:"var(--red)",fontWeight:600}}> ⚠ Valores não batem</span>}</div>}
</div>);
}

// ─── BUDGET ───
function BudgetPage({data,setData,toast,user,mode,houseInfo}){const c=data.config;const fmt=(n)=>fmtCurrency(n,c.locale,c.currency);
const[modal,setModal]=useState(null);const[form,setForm]=useState({});const[filter,setFilter]=useState("all");
const[incModal,setIncModal]=useState(null);const[incForm,setIncForm]=useState({});
const[budgetCatModal,setBudgetCatModal]=useState(false);const[budgetCatForm,setBudgetCatForm]=useState({});
const[eb,setEb]=useState(false);const[bv,setBv]=useState(data.budget);
const[carryModal,setCarryModal]=useState(false);const[carrySelected,setCarrySelected]=useState({});const[carryMode,setCarryMode]=useState("all");
// Members for split
const allMembers=[];
if(user?.displayName)allMembers.push(user.displayName);
else if(user?.email)allMembers.push(user.email.split("@")[0]);
if(mode==="shared"&&houseInfo?.members){houseInfo.members.forEach(m=>{const n=m.name||m.email?.split("@")[0]||"";if(n&&!allMembers.includes(n))allMembers.push(n);});}
if(data.members){data.members.forEach(m=>{if(m&&!allMembers.includes(m))allMembers.push(m);});}
const myName=allMembers[0]||"Eu";
// Month filter
const allMonths=()=>{const months=new Set();(data.expenses||[]).forEach(e=>{if(e.date)months.add(e.date.slice(0,7));});(data.incomes||[]).forEach(i=>{if(i.date)months.add(i.date.slice(0,7));});const cur=today().slice(0,7);months.add(cur);const arr=[...months].sort().reverse();return arr;};
const months=allMonths();
const[selMonth,setSelMonth]=useState(()=>today().slice(0,7));
const fmtMonth=(m)=>{const[y,mo]=m.split("-");const d=new Date(Number(y),Number(mo)-1);return d.toLocaleDateString(c.locale||"pt-BR",{month:"long",year:"numeric"});};
const nextMonth=(m)=>{const[y,mo]=m.split("-").map(Number);const nm=mo===12?1:mo+1;const ny=mo===12?y+1:y;return`${ny}-${String(nm).padStart(2,"0")}`;};
// Filtered data by month
const mExpenses=(data.expenses||[]).filter(e=>e.date&&e.date.startsWith(selMonth));
const mIncomes=(data.incomes||[]).filter(i=>i.date&&i.date.startsWith(selMonth));
// Totals — use splitMyShare if split is active, otherwise amount
const getMyAmount=(e)=>(e.splitTotal>0&&e.splitMyShare>0)?e.splitMyShare:e.amount;
const totalIncome=mIncomes.reduce((a,i)=>a+i.amount,0);
const totalExpense=mExpenses.reduce((a,e)=>a+getMyAmount(e),0);
const fixedTotal=mExpenses.filter(e=>e.type==="fixo").reduce((a,e)=>a+getMyAmount(e),0);
const variableTotal=mExpenses.filter(e=>e.type==="variavel"||!e.type).reduce((a,e)=>a+getMyAmount(e),0);
const paidTotal=mExpenses.filter(e=>e.paid).reduce((a,e)=>a+getMyAmount(e),0);
const pendingTotal=mExpenses.filter(e=>!e.paid).reduce((a,e)=>a+getMyAmount(e),0);
const saldo=totalIncome-totalExpense;
const rem=data.budget-totalExpense;const pct=data.budget>0?Math.min((totalExpense/data.budget)*100,100):0;
// By category
const bc={};mExpenses.forEach(e=>{bc[e.category]=(bc[e.category]||0)+getMyAmount(e);});
const budgetByCat=data.budgetByCategory||{};
// By card
const byCard={};mExpenses.forEach(e=>{const k=e.card||"Sem cartão";byCard[k]=(byCard[k]||0)+getMyAmount(e);});
// Income by category
const incByCat={};mIncomes.forEach(i=>{const k=i.category||"Outros";incByCat[k]=(incByCat[k]||0)+i.amount;});
// Filtered expenses
const filtered=filter==="all"?mExpenses:filter==="paid"?mExpenses.filter(e=>e.paid):filter==="pending"?mExpenses.filter(e=>!e.paid):filter==="fixo"?mExpenses.filter(e=>e.type==="fixo"):filter==="variavel"?mExpenses.filter(e=>e.type==="variavel"||!e.type):filter==="parcelado"?mExpenses.filter(e=>e.installments>0):filter==="recorrente"?mExpenses.filter(e=>e.recurrence):mExpenses;
// CRUD expenses
const togglePaid=(id)=>{setData(d=>({...d,expenses:d.expenses.map(e=>e.id===id?{...e,paid:!e.paid}:e)}));};
const saveExpense=()=>{if(!form.desc||!form.amount)return;
const base={desc:form.desc,amount:Number(form.amount),category:form.category||c.expenseCategories[0],date:form.date||today(),paid:form.paid||false,card:form.card||"",type:form.type||"variavel",recurrence:form.recurrence||"",installments:Number(form.installments)||0,currentInstallment:Number(form.currentInstallment)||0,splitTotal:Number(form.splitTotal)||0,splitMyShare:Number(form.splitMyShare)||0,splitPayers:form.splitPayers||[]};
if(modal==="add"){
if(base.installments>1){const newExps=[];for(let i=1;i<=base.installments;i++){const[y,mo,dy]=(base.date||today()).split("-").map(Number);const nm=(mo-1+i-1)%12+1;const ny=y+Math.floor((mo-1+i-1)/12);const dt=`${ny}-${String(nm).padStart(2,"0")}-${String(Math.min(dy,28)).padStart(2,"0")}`;newExps.push({...base,id:Date.now()+i,currentInstallment:i,desc:`${base.desc} (${i}/${base.installments})`,date:dt,paid:false});}setData(d=>({...d,expenses:[...newExps,...d.expenses]}));toast(`${base.installments} parcelas criadas`);}
else{setData(d=>({...d,expenses:[{...base,id:Date.now()},...d.expenses]}));toast("Gasto registrado");}
}else{setData(d=>({...d,expenses:d.expenses.map(e=>e.id===form.id?{...base,id:form.id}:e)}));toast("Gasto atualizado");}setModal(null);};
const de=(id)=>{setData(d=>({...d,expenses:d.expenses.filter(e=>e.id!==id)}));toast("Removido");};
const openEdit=(e)=>{setForm({...e,splitPayers:e.splitPayers||[]});setModal("edit");};
const sb=()=>{setData(d=>({...d,budget:Number(bv)}));setEb(false);toast("Orçamento atualizado");};
// CRUD incomes
const saveIncome=()=>{if(!incForm.desc||!incForm.amount)return;if(incModal==="add"){setData(d=>({...d,incomes:[{id:Date.now(),desc:incForm.desc,amount:Number(incForm.amount),category:incForm.category||(c.incomeCategories||[])[0]||"Salário",date:incForm.date||today(),recurring:incForm.recurring||false},...(d.incomes||[])]}));toast("Receita registrada");}else{setData(d=>({...d,incomes:(d.incomes||[]).map(i=>i.id===incForm.id?{...incForm,amount:Number(incForm.amount)}:i)}));toast("Receita atualizada");}setIncModal(null);};
const delInc=(id)=>{setData(d=>({...d,incomes:(d.incomes||[]).filter(i=>i.id!==id)}));toast("Receita removida");};
// Budget by category
const saveBudgetCat=()=>{const nb={};Object.entries(budgetCatForm).forEach(([k,v])=>{const n=Number(v);if(n>0)nb[k]=n;});setData(d=>({...d,budgetByCategory:nb}));setBudgetCatModal(false);toast("Orçamento por categoria salvo");};
const openBudgetCat=()=>{const f={};c.expenseCategories.forEach(cat=>{f[cat]=budgetByCat[cat]||"";});setBudgetCatForm(f);setBudgetCatModal(true);};
// Carry forward
const openCarry=()=>{const sel={};mExpenses.forEach(e=>{if(e.recurrence||e.type==="fixo")sel[e.id]=true;});mIncomes.forEach(i=>{if(i.recurring)sel["inc_"+i.id]=true;});setCarrySelected(sel);setCarryMode("select");setCarryModal(true);};
const doCarry=(which)=>{const nm=nextMonth(selMonth);const toCarry=which==="all"?mExpenses:mExpenses.filter(e=>carrySelected[e.id]);const toCarryInc=which==="all"?mIncomes.filter(i=>i.recurring):mIncomes.filter(i=>i.recurring&&carrySelected["inc_"+i.id]);
if(toCarry.length===0&&toCarryInc.length===0){toast("Nada selecionado");return;}
const newExps=toCarry.map(e=>{const day=e.date.slice(8,10);let inst=e.installments>0?{currentInstallment:(e.currentInstallment||0)+1}:{};if(e.installments>0&&inst.currentInstallment>e.installments)return null;return{...e,id:Date.now()+Math.random(),...inst,date:`${nm}-${day}`,paid:false,desc:e.installments>0?e.desc.replace(/\(\d+\/\d+\)/,`(${inst.currentInstallment}/${e.installments})`):e.desc};}).filter(Boolean);
const newIncs=toCarryInc.map(i=>{const day=i.date.slice(8,10);return{...i,id:Date.now()+Math.random(),date:`${nm}-${day}`};});
setData(d=>({...d,expenses:[...newExps,...d.expenses],incomes:[...newIncs,...(d.incomes||[])]}));
toast(`${newExps.length} gasto(s) e ${newIncs.length} receita(s) copiados para ${fmtMonth(nm)}`);setCarryModal(false);};
// Toggle split payer
const toggleSplitPayer=(name)=>{const payers=[...(form.splitPayers||[])];const idx=payers.findIndex(p=>p.name===name);if(idx>=0)payers.splice(idx,1);else payers.push({name,amount:0});setForm({...form,splitPayers:payers});};
const setSplitPayerAmount=(name,amt)=>{const payers=(form.splitPayers||[]).map(p=>p.name===name?{...p,amount:Number(amt)||0}:p);const othersTotal=payers.reduce((a,p)=>a+p.amount,0);const myShare=Math.max(0,(Number(form.splitTotal)||Number(form.amount)||0)-othersTotal);setForm({...form,splitPayers:payers,splitMyShare:myShare});};
// Recurrence labels
const RECURRENCES=[{v:"",l:"Nenhuma"},{v:"semanal",l:"Semanal"},{v:"quinzenal",l:"Quinzenal"},{v:"mensal",l:"Mensal"},{v:"bimestral",l:"Bimestral"},{v:"trimestral",l:"Trimestral"},{v:"anual",l:"Anual"}];
const cardColors=["#60A5FA","#4ADE80","#F0A050","#A78BFA","#F87171","#FBBF24","#34D399","#F472B6"];
const expDesc=(e)=>{let d=e.desc;let tags=[];if(e.recurrence){tags.push({label:RECURRENCES.find(r=>r.v===e.recurrence)?.l||e.recurrence,cls:"tg-b"});}if(e.installments>0){tags.push({label:`${e.currentInstallment||1}/${e.installments}`,cls:"tg-p"});}if(e.splitTotal>0){tags.push({label:"Dividido",cls:"tg-y"});}return{d,tags};};
return(<div><div className="ph"><div className="pt">Finanças da Casa</div><div className="ps">Controle completo: receitas, gastos, saldo e orçamento</div></div>
{/* Month selector */}
<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20}}>
<button className="bi" onClick={()=>{const idx=months.indexOf(selMonth);if(idx<months.length-1)setSelMonth(months[idx+1]);}} style={{padding:8,flexShrink:0}}><Icon d={<polyline points="15 18 9 12 15 6"/>} size={18}/></button>
<select value={selMonth} onChange={e=>setSelMonth(e.target.value)} style={{flex:1,fontSize:15,fontWeight:700,background:"var(--bg3)",textTransform:"capitalize"}}>{months.map(m=><option key={m} value={m}>{fmtMonth(m)}</option>)}</select>
<button className="bi" onClick={()=>{const idx=months.indexOf(selMonth);if(idx>0)setSelMonth(months[idx-1]);}} style={{padding:8,flexShrink:0}}><Icon d={<polyline points="9 18 15 12 9 6"/>} size={18}/></button>
<button className="btn bg bs" onClick={openCarry} style={{flexShrink:0}} title="Copiar contas para o próximo mês">📋</button>
</div>
{/* Summary cards */}
<div className="sg">
<div className="sc gn"><div className="sl">📥 Entradas</div><div className="sv" style={{color:"var(--green)"}}>{fmt(totalIncome)}</div><div className="sd">{mIncomes.length} receita{mIncomes.length!==1?"s":""}</div></div>
<div className="sc rd"><div className="sl">📤 Gastos</div><div className="sv" style={{color:"var(--red)"}}>{fmt(totalExpense)}</div><div className="sd">{fmt(fixedTotal)} fixos · {fmt(variableTotal)} variáveis</div></div>
<div className="sc" style={{"--saldo-color":saldo>=0?"var(--green)":"var(--red)"}}><div className="sl" style={{display:"flex",alignItems:"center",gap:6}}>💰 Saldo Mensal</div><div className="sv" style={{color:saldo>=0?"var(--green)":"var(--red)"}}>{saldo>=0?"+":""}{fmt(saldo)}</div>
<div style={{marginTop:8,height:6,background:"var(--bg4)",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:totalIncome>0?`${Math.min((totalExpense/totalIncome)*100,100)}%`:"0%",background:totalIncome>0&&totalExpense/totalIncome>0.9?"var(--red)":totalExpense/totalIncome>0.7?"var(--yellow)":"var(--green)",borderRadius:3,transition:"width .4s"}}/></div>
<div className="sd" style={{marginTop:4}}>{totalIncome>0?`${((totalExpense/totalIncome)*100).toFixed(0)}% da receita comprometida`:"Sem receitas registradas"}</div></div>
<div className="sc bl"><div className="sl">Orçamento</div><div className="sv" style={{display:"flex",alignItems:"center",gap:8}}>{fmt(data.budget)}<button className="bi" style={{padding:4}} onClick={()=>{setBv(data.budget);setEb(true);}}>{I.edit}</button></div><div className="pb"><div className="pf" style={{width:`${pct}%`,background:pct>90?"var(--red)":pct>70?"var(--yellow)":"var(--green)"}}/></div><div className="sd">Restante: <span style={{color:rem<0?"var(--red)":"var(--green)",fontWeight:600}}>{fmt(rem)}</span></div></div>
<div className="sc gn"><div className="sl">✅ Pago</div><div className="sv" style={{color:"var(--green)"}}>{fmt(paidTotal)}</div></div>
<div className="sc pp"><div className="sl">⏳ Pendente</div><div className="sv" style={{color:"var(--yellow)"}}>{fmt(pendingTotal)}</div><div className="sd">{mExpenses.filter(e=>!e.paid).length} gasto{mExpenses.filter(e=>!e.paid).length!==1?"s":""}</div></div>
</div>
{/* Incomes section */}
<div className="card"><div className="ct" style={{justifyContent:"space-between"}}><span style={{display:"flex",alignItems:"center",gap:8}}>📥 Receitas / Entradas</span><button className="btn bp bs" onClick={()=>{setIncForm({desc:"",amount:"",category:(c.incomeCategories||[])[0]||"Salário",date:selMonth+"-05",recurring:false});setIncModal("add");}}>{I.plus} Nova Receita</button></div>
{Object.keys(incByCat).length>0&&<div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>{Object.entries(incByCat).sort((a,b)=>b[1]-a[1]).map(([cat,val])=>(<div key={cat} style={{background:"var(--green-bg)",borderRadius:8,padding:"8px 14px",flex:"0 1 auto"}}><div style={{fontSize:11,color:"var(--green)",textTransform:"uppercase",letterSpacing:1,fontWeight:600}}>{cat}</div><div style={{fontSize:16,fontWeight:700,color:"var(--green)"}}>{fmt(val)}</div></div>))}</div>}
{mIncomes.length===0?<div style={{color:"var(--text3)",fontSize:13,padding:"12px 0"}}>Nenhuma receita em {fmtMonth(selMonth)}</div>:
<><div style={{overflowX:"auto"}}><table><thead><tr><th>Descrição</th><th>Valor</th><th>Categoria</th><th>Data</th><th>Recorrente</th><th></th></tr></thead><tbody>
{mIncomes.sort((a,b)=>b.date.localeCompare(a.date)).map(i=>(<tr key={i.id}><td className="in">{i.desc}</td><td style={{fontWeight:600,color:"var(--green)"}}>{fmt(i.amount)}</td><td><span className="tg tg-g">{i.category}</span></td><td style={{color:"var(--text3)"}}>{new Date(i.date+"T12:00").toLocaleDateString(c.locale||"pt-BR")}</td><td>{i.recurring?<span className="tg tg-b">Sim</span>:<span style={{color:"var(--text3)"}}>—</span>}</td><td><div style={{display:"flex",gap:4}}><button className="bi" onClick={()=>{setIncForm({...i});setIncModal("edit");}} title="Editar">{I.edit}</button><ConfirmDelete onConfirm={()=>delInc(i.id)}/></div></td></tr>))}
</tbody></table></div>
<div className="m-cards m-only">{mIncomes.sort((a,b)=>b.date.localeCompare(a.date)).map(i=>(<div className="m-card" key={i.id} style={{borderLeft:"3px solid var(--green)"}}>
<div className="m-card-h"><span className="m-card-n">{i.desc}</span><span style={{fontWeight:700,color:"var(--green)",flexShrink:0}}>{fmt(i.amount)}</span></div>
<div className="m-card-r"><span className="tg tg-g">{i.category}</span>{i.recurring&&<span className="tg tg-b">Recorrente</span>}<span style={{color:"var(--text3)",fontSize:11}}>{new Date(i.date+"T12:00").toLocaleDateString(c.locale||"pt-BR",{day:"numeric",month:"short"})}</span></div>
<div className="m-card-a"><button className="bi" onClick={()=>{setIncForm({...i});setIncModal("edit");}}>{I.edit}</button><ConfirmDelete onConfirm={()=>delInc(i.id)}/></div>
</div>))}</div></>}</div>
{/* Budget by category */}
<div className="card"><div className="ct" style={{justifyContent:"space-between"}}><span style={{display:"flex",alignItems:"center",gap:8}}>📊 Orçamento por Categoria</span><button className="btn bg bs" onClick={openBudgetCat}>{I.edit} Editar Orçamentos</button></div>
{c.expenseCategories.filter(cat=>bc[cat]||budgetByCat[cat]).length===0?<div style={{color:"var(--text3)",fontSize:13}}>Defina orçamentos por categoria e acompanhe os gastos reais</div>:
<div style={{display:"flex",flexDirection:"column",gap:10}}>{c.expenseCategories.filter(cat=>bc[cat]||budgetByCat[cat]).map(cat=>{const real=bc[cat]||0;const plan=budgetByCat[cat]||0;const catPct=plan>0?Math.min((real/plan)*100,100):0;return(<div key={cat} style={{background:"var(--bg3)",borderRadius:10,padding:"12px 16px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><span style={{fontSize:14,fontWeight:600}}>{cat}</span><div style={{display:"flex",gap:12,alignItems:"center"}}><span style={{fontSize:13,color:plan>0&&real>plan?"var(--red)":"var(--text2)"}}>{fmt(real)}{plan>0&&<span style={{color:"var(--text3)"}}> / {fmt(plan)}</span>}</span>{plan>0&&<span style={{fontSize:12,fontWeight:600,color:catPct>90?"var(--red)":catPct>70?"var(--yellow)":"var(--green)"}}>{catPct.toFixed(0)}%</span>}</div></div>{plan>0&&<div className="pb" style={{marginTop:0}}><div className="pf" style={{width:`${catPct}%`,background:catPct>90?"var(--red)":catPct>70?"var(--yellow)":"var(--green)"}}/></div>}</div>);})}</div>}</div>
{/* Totals by card */}
{Object.keys(byCard).length>0&&<div className="card"><div className="ct">💳 Totais por Cartão</div><div style={{display:"flex",gap:10,flexWrap:"wrap"}}>{Object.entries(byCard).sort((a,b)=>b[1]-a[1]).map(([card,val],idx)=>(<div key={card} style={{background:"var(--bg3)",borderRadius:10,padding:"12px 14px",flex:"1 1 calc(50% - 10px)",minWidth:0,borderLeft:`4px solid ${cardColors[idx%cardColors.length]}`}}><div style={{fontSize:11,color:"var(--text3)",textTransform:"uppercase",letterSpacing:1,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{card}</div><div style={{fontSize:18,fontWeight:700,marginTop:2}}>{fmt(val)}</div><div style={{fontSize:10,color:"var(--text3)",marginTop:1}}>{totalExpense>0?((val/totalExpense)*100).toFixed(0):0}%</div></div>))}</div></div>}
{/* Expenses list */}
<div className="tb" style={{marginTop:4}}><button className="btn bp" onClick={()=>{setForm({desc:"",amount:"",category:c.expenseCategories[0],date:selMonth+"-"+new Date().toISOString().slice(8,10),paid:false,card:c.cards?.[0]||"",type:"variavel",recurrence:"",installments:"",currentInstallment:1,splitTotal:"",splitMyShare:"",splitPayers:[]});setModal("add");}}>{I.plus} Novo Gasto</button>
<div className="filter-scroll" style={{display:"flex",gap:4,flexWrap:"wrap"}}>{[{k:"all",l:"Todos"},{k:"fixo",l:"Fixos"},{k:"variavel",l:"Variáveis"},{k:"parcelado",l:"Parcelados"},{k:"recorrente",l:"Recorrentes"},{k:"pending",l:"Pendentes"},{k:"paid",l:"Pagos"}].map(f=><button key={f.k} className={`btn ${filter===f.k?"bp":"bg"} bs`} onClick={()=>setFilter(f.k)}>{f.l}</button>)}</div></div>
<div className="card" style={{padding:0,overflow:"hidden"}}><div style={{overflowX:"auto"}}><table><thead><tr><th style={{width:40}}>Pago</th><th>Descrição</th><th>Meu Valor</th><th>Tipo</th><th>Cartão</th><th>Categoria</th><th>Data</th><th></th></tr></thead><tbody>
{filtered.sort((a,b)=>b.date.localeCompare(a.date)).map(e=>{const{d:eDesc,tags}=expDesc(e);const myAmt=getMyAmount(e);return(<tr key={e.id} style={{borderLeft:e.type==="fixo"?"3px solid var(--blue)":e.installments>0?"3px solid var(--purple)":"3px solid var(--accent)"}}>
<td><div style={{width:24,height:24,borderRadius:6,border:`2px solid ${e.paid?"var(--green)":"var(--yellow)"}`,background:e.paid?"var(--green)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all .2s"}} onClick={()=>togglePaid(e.id)}>{e.paid&&<Icon d={<polyline points="20 6 9 17 4 12"/>} size={14} color="#fff"/>}</div></td>
<td style={{opacity:e.paid?0.6:1}}><div className="in">{eDesc}</div>{tags.length>0&&<div style={{display:"flex",gap:4,marginTop:4,flexWrap:"wrap"}}>{tags.map((t,i)=><span key={i} className={`tg ${t.cls}`} style={{fontSize:10}}>{t.label}</span>)}</div>}{e.splitTotal>0&&<div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>Total: {fmt(e.splitTotal)} · Eu: {fmt(e.splitMyShare||e.amount)}{e.splitPayers?.length>0&&" · "+e.splitPayers.map(p=>`${p.name}: ${fmt(p.amount)}`).join(", ")}</div>}</td>
<td style={{fontWeight:600,color:e.paid?"var(--green)":"var(--yellow)"}}>{fmt(myAmt)}</td>
<td><span className={`tg ${e.type==="fixo"?"tg-b":"tg-n"}`}>{e.type==="fixo"?"Fixo":"Var."}</span></td>
<td>{e.card?<span className="tg tg-p">{e.card}</span>:<span style={{color:"var(--text3)",fontSize:12}}>—</span>}</td>
<td><span className="tg tg-n">{e.category}</span></td>
<td style={{color:"var(--text3)",fontSize:13}}>{new Date(e.date+"T12:00").toLocaleDateString(c.locale||"pt-BR")}</td>
<td><div style={{display:"flex",gap:4}}><button className="bi" onClick={()=>openEdit(e)} title="Editar">{I.edit}</button><ConfirmDelete onConfirm={()=>de(e.id)}/></div></td>
</tr>);})}
{filtered.length===0&&<tr><td colSpan={8} style={{textAlign:"center",padding:32,color:"var(--text3)"}}>Nenhum gasto{filter!=="all"?` (${filter})`:""} neste mês</td></tr>}
</tbody></table></div>
{/* Mobile cards */}
<div className="m-cards m-only" style={{padding:8}}>
{filtered.sort((a,b)=>b.date.localeCompare(a.date)).map(e=>{const{d:eDesc,tags}=expDesc(e);const myAmt=getMyAmount(e);return(<div className="m-card" key={e.id} style={{borderLeft:e.type==="fixo"?"3px solid var(--blue)":e.installments>0?"3px solid var(--purple)":"3px solid var(--accent)"}}>
<div className="m-card-h">
<div style={{display:"flex",alignItems:"center",gap:8,flex:1,overflow:"hidden"}}><div style={{width:22,height:22,borderRadius:5,border:`2px solid ${e.paid?"var(--green)":"var(--yellow)"}`,background:e.paid?"var(--green)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}} onClick={()=>togglePaid(e.id)}>{e.paid&&<Icon d={<polyline points="20 6 9 17 4 12"/>} size={12} color="#fff"/>}</div>
<span className="m-card-n" style={{opacity:e.paid?0.6:1}}>{eDesc}</span></div>
<span style={{fontWeight:700,fontSize:15,color:e.paid?"var(--green)":"var(--yellow)",flexShrink:0}}>{fmt(myAmt)}</span></div>
<div className="m-card-r" style={{flexWrap:"wrap"}}>{tags.map((t,i)=><span key={i} className={`tg ${t.cls}`}>{t.label}</span>)}<span className={`tg ${e.type==="fixo"?"tg-b":"tg-n"}`}>{e.type==="fixo"?"Fixo":"Var."}</span>{e.card&&<span className="tg tg-p">{e.card}</span>}<span className="tg tg-n">{e.category}</span><span style={{color:"var(--text3)",fontSize:11}}>{new Date(e.date+"T12:00").toLocaleDateString(c.locale||"pt-BR",{day:"numeric",month:"short"})}</span></div>
{e.splitTotal>0&&<div style={{fontSize:11,color:"var(--text3)",marginTop:4}}>Total: {fmt(e.splitTotal)} · Eu: {fmt(e.splitMyShare||e.amount)}</div>}
<div className="m-card-a"><button className="bi" onClick={()=>openEdit(e)}>{I.edit}</button><ConfirmDelete onConfirm={()=>de(e.id)}/></div>
</div>);})}
{filtered.length===0&&<div style={{textAlign:"center",padding:32,color:"var(--text3)"}}>Nenhum gasto neste mês</div>}
</div></div>
{/* Expense modal */}
{(()=>{if(!modal)return null;
const hasSplit=Number(form.splitTotal)>0;const hasInstall=Number(form.installments)>1;const labelVal=hasSplit?"Valor (minha parte)":"Valor";
return(<Modal title={modal==="add"?"Novo Gasto":"Editar Gasto"} onClose={()=>setModal(null)}>
<div className="fr"><div className="fg" style={{flex:2}}><label className="fl">Descrição</label><input value={form.desc||""} onChange={e=>setForm({...form,desc:e.target.value})} autoFocus/></div><div className="fg"><label className="fl">{labelVal}</label><MoneyInput value={form.amount||0} onChange={v=>setForm({...form,amount:v})}/></div></div>
<div className="fr"><div className="fg"><label className="fl">Tipo</label><select value={form.type||"variavel"} onChange={e=>setForm({...form,type:e.target.value})}><option value="fixo">Fixo</option><option value="variavel">Variável</option></select></div>
<div className="fg"><label className="fl">Categoria</label><select value={form.category||c.expenseCategories[0]} onChange={e=>setForm({...form,category:e.target.value})}>{c.expenseCategories.map(ct=><option key={ct}>{ct}</option>)}</select></div></div>
<div className="fr"><div className="fg"><label className="fl">Cartão / Pagamento</label><select value={form.card||""} onChange={e=>setForm({...form,card:e.target.value})}><option value="">Nenhum</option>{(c.cards||[]).map(cd=><option key={cd}>{cd}</option>)}</select></div>
<div className="fg"><label className="fl">Data</label><input type="date" value={form.date||today()} onChange={e=>setForm({...form,date:e.target.value})}/></div></div>
{/* Recurrence + Installments */}
<div className="fr"><div className="fg"><label className="fl">🔄 Recorrência (opcional)</label><select value={form.recurrence||""} onChange={e=>setForm({...form,recurrence:e.target.value})}>{RECURRENCES.map(r=><option key={r.v} value={r.v}>{r.l}</option>)}</select></div>
<div className="fg"><label className="fl">💳 Parcelas (opcional)</label><input type="number" min="0" max="1000" value={form.installments||""} onChange={e=>setForm({...form,installments:e.target.value,currentInstallment:1})} placeholder="Ex: 12"/></div>
{hasInstall&&<div className="fg"><label className="fl">Parcela atual</label><input type="number" min="1" max={Number(form.installments)||1000} value={form.currentInstallment||1} onChange={e=>setForm({...form,currentInstallment:e.target.value})}/></div>}</div>
{hasInstall&&<div style={{fontSize:13,color:"var(--accent)",padding:"8px 12px",background:"var(--accent-glow)",borderRadius:8,marginBottom:12}}>{modal==="add"?`Serão criadas ${form.installments} parcelas de ${fmt(Number(form.amount)||0)} (uma por mês a partir da data)`:`Parcela ${form.currentInstallment||1} de ${form.installments}`}</div>}
{/* Split */}
<div style={{borderTop:"1px solid var(--border)",paddingTop:12,marginTop:4,marginBottom:12}}>
<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,cursor:"pointer"}} onClick={()=>{if(hasSplit){setForm({...form,splitTotal:0,splitMyShare:0,splitPayers:[]});}else{setForm({...form,splitTotal:Number(form.amount)||0,splitMyShare:Number(form.amount)||0});}}}>
<div style={{width:22,height:22,borderRadius:6,border:`2px solid ${hasSplit?"var(--purple)":"var(--border2)"}`,background:hasSplit?"var(--purple)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s"}}>{hasSplit&&<Icon d={<polyline points="20 6 9 17 4 12"/>} size={14} color="#fff"/>}</div>
<span style={{fontSize:14,fontWeight:600,color:hasSplit?"var(--purple)":"var(--text3)"}}>👥 Dividir conta (opcional)</span></div>
{hasSplit&&<SplitPanel form={form} setForm={setForm} fmt={fmt} myName={myName} allMembers={allMembers} toggleSplitPayer={toggleSplitPayer} setSplitPayerAmount={setSplitPayerAmount}/>}
</div>
<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,cursor:"pointer"}} onClick={()=>setForm({...form,paid:!form.paid})}>
<div style={{width:22,height:22,borderRadius:6,border:`2px solid ${form.paid?"var(--green)":"var(--yellow)"}`,background:form.paid?"var(--green)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s"}}>{form.paid&&<Icon d={<polyline points="20 6 9 17 4 12"/>} size={14} color="#fff"/>}</div>
<span style={{fontSize:14,color:form.paid?"var(--green)":"var(--yellow)",fontWeight:500}}>{form.paid?"Já pago":"Ainda não pago"}</span></div>
<div className="ma"><button className="btn bg" onClick={()=>setModal(null)}>Cancelar</button><button className="btn bp" onClick={saveExpense}>Salvar</button></div>
</Modal>);})()}
{/* Income modal */}
{incModal&&<Modal title={incModal==="add"?"Nova Receita":"Editar Receita"} onClose={()=>setIncModal(null)}>
<div className="fr"><div className="fg" style={{flex:2}}><label className="fl">Descrição</label><input value={incForm.desc||""} onChange={e=>setIncForm({...incForm,desc:e.target.value})} autoFocus/></div><div className="fg"><label className="fl">Valor</label><MoneyInput value={incForm.amount||0} onChange={v=>setIncForm({...incForm,amount:v})}/></div></div>
<div className="fr"><div className="fg"><label className="fl">Categoria</label><select value={incForm.category||(c.incomeCategories||[])[0]||""} onChange={e=>setIncForm({...incForm,category:e.target.value})}>{(c.incomeCategories||[]).map(ct=><option key={ct}>{ct}</option>)}</select></div>
<div className="fg"><label className="fl">Data</label><input type="date" value={incForm.date||today()} onChange={e=>setIncForm({...incForm,date:e.target.value})}/></div></div>
<div style={{display:"flex",alignItems:"center",gap:10,marginTop:4,marginBottom:8,cursor:"pointer"}} onClick={()=>setIncForm({...incForm,recurring:!incForm.recurring})}>
<div style={{width:22,height:22,borderRadius:6,border:`2px solid ${incForm.recurring?"var(--blue)":"var(--border2)"}`,background:incForm.recurring?"var(--blue)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s"}}>{incForm.recurring&&<Icon d={<polyline points="20 6 9 17 4 12"/>} size={14} color="#fff"/>}</div>
<span style={{fontSize:14,color:incForm.recurring?"var(--blue)":"var(--text3)",fontWeight:500}}>{incForm.recurring?"Receita recorrente (todo mês)":"Receita única"}</span></div>
<div className="ma"><button className="btn bg" onClick={()=>setIncModal(null)}>Cancelar</button><button className="btn bp" onClick={saveIncome}>Salvar</button></div></Modal>}
{/* Budget by category modal */}
{budgetCatModal&&<Modal title="Orçamento por Categoria" onClose={()=>setBudgetCatModal(false)}>
<div style={{fontSize:13,color:"var(--text2)",marginBottom:16}}>Defina quanto planeja gastar em cada categoria. Deixe em branco para não limitar.</div>
{c.expenseCategories.map(cat=>(<div className="fr" key={cat} style={{marginBottom:8}}><div className="fg"><label className="fl">{cat}</label><MoneyInput value={budgetCatForm[cat]||0} onChange={v=>setBudgetCatForm({...budgetCatForm,[cat]:v})}/></div></div>))}
<div className="ma"><button className="btn bg" onClick={()=>setBudgetCatModal(false)}>Cancelar</button><button className="btn bp" onClick={saveBudgetCat}>Salvar</button></div></Modal>}
{/* Carry forward modal */}
{carryModal&&<Modal title={`Enviar contas → ${fmtMonth(nextMonth(selMonth))}`} onClose={()=>setCarryModal(false)}>
<div style={{fontSize:13,color:"var(--text2)",marginBottom:16,lineHeight:1.7}}>Copie gastos e receitas recorrentes para o próximo mês. Escolha enviar tudo ou selecionar individualmente.</div>
<div style={{display:"flex",gap:8,marginBottom:20}}><button className={`btn ${carryMode==="all"?"bp":"bg"}`} onClick={()=>setCarryMode("all")}>Enviar tudo</button><button className={`btn ${carryMode==="select"?"bp":"bg"}`} onClick={()=>setCarryMode("select")}>Escolher quais</button></div>
{carryMode==="select"&&<div style={{maxHeight:400,overflowY:"auto"}}>
{mExpenses.length>0&&<><div style={{fontSize:12,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:1.5,marginBottom:8}}>Gastos ({mExpenses.length})</div>
{mExpenses.map(e=>(<div key={e.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid var(--border)",cursor:"pointer"}} onClick={()=>setCarrySelected(p=>({...p,[e.id]:!p[e.id]}))}>
<div style={{width:20,height:20,borderRadius:5,border:`2px solid ${carrySelected[e.id]?"var(--accent)":"var(--border2)"}`,background:carrySelected[e.id]?"var(--accent)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .2s"}}>{carrySelected[e.id]&&<Icon d={<polyline points="20 6 9 17 4 12"/>} size={12} color="#fff"/>}</div>
<div style={{flex:1}}><div style={{fontSize:13,fontWeight:500}}>{e.desc}</div><div style={{fontSize:11,color:"var(--text3)"}}>{e.category} · {e.type==="fixo"?"Fixo":"Variável"}{e.recurrence?` · ${e.recurrence}`:""}{e.installments>0?` · ${e.currentInstallment}/${e.installments}`:""}</div></div>
<span style={{fontSize:14,fontWeight:600,color:"var(--text)"}}>{fmt(e.amount)}</span></div>))}</>}
{mIncomes.filter(i=>i.recurring).length>0&&<><div style={{fontSize:12,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:1.5,marginTop:16,marginBottom:8}}>Receitas recorrentes</div>
{mIncomes.filter(i=>i.recurring).map(i=>(<div key={i.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid var(--border)",cursor:"pointer"}} onClick={()=>setCarrySelected(p=>({...p,["inc_"+i.id]:!p["inc_"+i.id]}))}>
<div style={{width:20,height:20,borderRadius:5,border:`2px solid ${carrySelected["inc_"+i.id]?"var(--green)":"var(--border2)"}`,background:carrySelected["inc_"+i.id]?"var(--green)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .2s"}}>{carrySelected["inc_"+i.id]&&<Icon d={<polyline points="20 6 9 17 4 12"/>} size={12} color="#fff"/>}</div>
<div style={{flex:1}}><div style={{fontSize:13,fontWeight:500,color:"var(--green)"}}>{i.desc}</div><div style={{fontSize:11,color:"var(--text3)"}}>{i.category}</div></div>
<span style={{fontSize:14,fontWeight:600,color:"var(--green)"}}>{fmt(i.amount)}</span></div>))}</>}
</div>}
<div style={{fontSize:12,color:"var(--text3)",marginTop:12,marginBottom:4}}>{carryMode==="all"?`${mExpenses.length} gasto(s) e ${mIncomes.filter(i=>i.recurring).length} receita(s) recorrente(s) serão copiados`:`${Object.entries(carrySelected).filter(([k,v])=>v&&!k.startsWith("inc_")).length} gasto(s) e ${Object.entries(carrySelected).filter(([k,v])=>v&&k.startsWith("inc_")).length} receita(s) selecionados`}</div>
<div className="ma"><button className="btn bg" onClick={()=>setCarryModal(false)}>Cancelar</button><button className="btn bp" onClick={()=>doCarry(carryMode)}>Enviar para {fmtMonth(nextMonth(selMonth))}</button></div></Modal>}
{eb&&<Modal title="Editar Orçamento" onClose={()=>setEb(false)}><div className="fg"><label className="fl">Orçamento Mensal</label><input type="number" value={bv} onChange={e=>setBv(e.target.value)} autoFocus/></div><div className="ma"><button className="btn bg" onClick={()=>setEb(false)}>Cancelar</button><button className="btn bp" onClick={sb}>Salvar</button></div></Modal>}
</div>);}

// ─── ROUTINE PAGE ───
function RoutinePage({data,setData,toast,user,mode}){
const c=data.config;const habits=data.habits||[];const todos=data.todos||[];const events=data.events||[];
const[tab,setTab]=useState("hoje");const[modal,setModal]=useState(null);const[form,setForm]=useState({});
const shared=mode==="shared";const myName=user?.displayName||user?.email?.split("@")[0]||"Eu";
const td=today();const dayNames=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const getDayName=(d)=>dayNames[new Date(d+"T12:00").getDay()];
const habitCats=c.habitCategories||["Saúde","Produtividade","Bem-estar","Fitness"];
// ─── HABITS LOGIC ───
const isHabitDue=(h)=>{const dow=new Date(td+"T12:00").getDay();if(h.freq==="diario")return true;if(h.freq==="dias"&&h.freqDays)return h.freqDays.includes(dow);if(h.freq==="semanal")return true;return true;};
const getLog=(hid,date)=>(h=> h?h:null)((data.habitLogs||[]).find(l=>l.habitId===hid&&l.date===date));
const toggleHabit=(hid,date)=>{const existing=getLog(hid,date);const stamp=editStamp(user);if(existing){setData(d=>({...d,habitLogs:(d.habitLogs||[]).filter(l=>!(l.habitId===hid&&l.date===date))}));}else{setData(d=>({...d,habitLogs:[...(d.habitLogs||[]),{habitId:hid,date,done:true,ts:Date.now(),...stamp}]}));toast("✓ Hábito feito!");}};
const setHabitVal=(hid,date,val,note)=>{const stamp=editStamp(user);setData(d=>{const logs=(d.habitLogs||[]).filter(l=>!(l.habitId===hid&&l.date===date));logs.push({habitId:hid,date,done:true,value:Number(val)||0,note:note||"",ts:Date.now(),...stamp});return{...d,habitLogs:logs};});};
const getStreak=(hid)=>{let s=0;let d=new Date(td+"T12:00");while(true){const ds=d.toISOString().slice(0,10);if(getLog(hid,ds))s++;else break;d.setDate(d.getDate()-1);if(s>365)break;}return s;};
const getBestStreak=(hid)=>{const logs=(data.habitLogs||[]).filter(l=>l.habitId===hid).map(l=>l.date).sort();let best=0,cur=0,prev="";for(const d of logs){if(prev){const diff=Math.round((new Date(d+"T12:00")-new Date(prev+"T12:00"))/86400000);cur=diff===1?cur+1:1;}else cur=1;if(cur>best)best=cur;prev=d;}return best;};
const saveHabit=()=>{if(!form.name)return;const stamp=editStamp(user);const base={name:form.name,icon:form.icon||"⭐",category:form.category||habitCats[0],type:form.type||"check",target:Number(form.target)||1,unit:form.unit||"",freq:form.freq||"diario",freqDays:form.freqDays||[],period:form.period||"anytime",...stamp};if(modal==="addHabit"){setData(d=>({...d,habits:[...(d.habits||[]),{...base,id:Date.now()}]}));toast("Hábito criado");}else{setData(d=>({...d,habits:(d.habits||[]).map(h=>h.id===form.id?{...base,id:form.id}:h)}));toast("Hábito atualizado");}setModal(null);};
const delHabit=(id)=>{setData(d=>({...d,habits:(d.habits||[]).filter(h=>h.id!==id),habitLogs:(d.habitLogs||[]).filter(l=>l.habitId!==id)}));toast("Hábito removido");};
// ─── TODOS LOGIC ───
const todoPriorities=[{v:"alta",l:"Alta",c:"var(--red)"},{v:"media",l:"Média",c:"var(--yellow)"},{v:"baixa",l:"Baixa",c:"var(--blue)"},{v:"",l:"Nenhuma",c:"var(--text3)"}];
const todoLists=c.todoLists||["Pessoal","Trabalho","Casa"];
const saveTodo=()=>{if(!form.name)return;const stamp=editStamp(user);const base={name:form.name,desc:form.desc||"",due:form.due||"",priority:form.priority||"",list:form.list||todoLists[0],done:form.done||false,assignee:form.assignee||"",subtasks:form.subtasks||[],recurrence:form.recurrence||"",...stamp};if(modal==="addTodo"){setData(d=>({...d,todos:[...(d.todos||[]),{...base,id:Date.now()}]}));toast("Tarefa criada");}else{setData(d=>({...d,todos:(d.todos||[]).map(t=>t.id===form.id?{...base,id:form.id}:t)}));toast("Tarefa atualizada");}setModal(null);};
const toggleTodo=(id)=>{const stamp=editStamp(user);setData(d=>({...d,todos:(d.todos||[]).map(t=>t.id===id?{...t,done:!t.done,...stamp}:t)}));};
const toggleSubtask=(todoId,stIdx)=>{setData(d=>({...d,todos:(d.todos||[]).map(t=>t.id===todoId?{...t,subtasks:(t.subtasks||[]).map((s,i)=>i===stIdx?{...s,done:!s.done}:s)}:t)}));};
const delTodo=(id)=>{setData(d=>({...d,todos:(d.todos||[]).filter(t=>t.id!==id)}));toast("Tarefa removida");};
// ─── EVENTS/AGENDA LOGIC ───
const saveEvent=()=>{if(!form.title)return;const stamp=editStamp(user);const base={title:form.title,date:form.date||td,time:form.time||"",endTime:form.endTime||"",color:form.color||"var(--accent)",notes:form.notes||"",allDay:form.allDay||false,...stamp};if(modal==="addEvent"){setData(d=>({...d,events:[...(d.events||[]),{...base,id:Date.now()}]}));toast("Evento adicionado");}else{setData(d=>({...d,events:(d.events||[]).map(e=>e.id===form.id?{...base,id:form.id}:e)}));toast("Evento atualizado");}setModal(null);};
const delEvent=(id)=>{setData(d=>({...d,events:(d.events||[]).filter(e=>e.id!==id)}));toast("Evento removido");};
// ─── COMPUTED ───
const todayHabits=habits.filter(isHabitDue);
const doneToday=todayHabits.filter(h=>getLog(h.id,td)).length;
const todayTodos=todos.filter(t=>!t.done&&(!t.due||t.due<=td));
const upcomingTodos=todos.filter(t=>!t.done&&t.due&&t.due>td).sort((a,b)=>a.due.localeCompare(b.due));
const doneTodos=todos.filter(t=>t.done);
const todayEvents=events.filter(e=>e.date===td).sort((a,b)=>(a.time||"").localeCompare(b.time||""));
const weekEvents=events.filter(e=>{const diff=Math.round((new Date(e.date+"T12:00")-new Date(td+"T12:00"))/86400000);return diff>=0&&diff<7;}).sort((a,b)=>a.date.localeCompare(b.date)||(a.time||"").localeCompare(b.time||""));
// Week dates for heatmap
const getWeekDates=()=>{const dates=[];const d=new Date(td+"T12:00");const dow=d.getDay();d.setDate(d.getDate()-dow);for(let i=0;i<7;i++){dates.push(d.toISOString().slice(0,10));d.setDate(d.getDate()+1);}return dates;};
const weekDates=getWeekDates();
const pctToday=todayHabits.length>0?Math.round((doneToday/todayHabits.length)*100):0;
// Subtask helpers
const[newST,setNewST]=useState("");
const addSubtask=()=>{const n=newST.trim();if(!n)return;setForm({...form,subtasks:[...(form.subtasks||[]),{name:n,done:false}]});setNewST("");};
const rmSubtask=(i)=>{setForm({...form,subtasks:(form.subtasks||[]).filter((_,idx)=>idx!==i)});};
// Event colors
const evColors=["var(--accent)","var(--blue)","var(--green)","var(--red)","var(--purple)","var(--yellow)"];
// ─── RENDER ───
const tabs=[{id:"hoje",l:"Hoje"},{id:"habitos",l:"Hábitos"},{id:"tarefas",l:"Tarefas"},{id:"agenda",l:"Agenda"}];
return(<div>
<div className="ph"><div className="pt">Rotina</div><div className="ps">{new Date(td+"T12:00").toLocaleDateString(c.locale||"pt-BR",{weekday:"long",day:"numeric",month:"long"})}</div></div>
{/* Tabs */}
<div className="filter-scroll" style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>{tabs.map(t=><button key={t.id} className={`btn ${tab===t.id?"bp":"bg"} bs`} onClick={()=>setTab(t.id)}>{t.l}</button>)}</div>

{/* ═══ HOJE ═══ */}
{tab==="hoje"&&<>
{/* Progress ring */}
<div className="card" style={{textAlign:"center",padding:20}}>
<div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",position:"relative",width:90,height:90,marginBottom:12}}>
<svg width="90" height="90" viewBox="0 0 90 90" style={{transform:"rotate(-90deg)"}}><circle cx="45" cy="45" r="38" fill="none" stroke="var(--bg4)" strokeWidth="7"/><circle cx="45" cy="45" r="38" fill="none" stroke="var(--accent)" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${pctToday*2.39} 239`} style={{transition:"stroke-dasharray .6s cubic-bezier(.4,0,.2,1)"}}/></svg>
<div style={{position:"absolute",fontSize:22,fontWeight:800,color:"var(--text)"}}>{pctToday}%</div>
</div>
<div style={{fontSize:14,fontWeight:600,color:"var(--text)"}}>{doneToday}/{todayHabits.length} hábitos</div>
<div style={{fontSize:12,color:"var(--text3)",marginTop:4}}>{todayTodos.length} tarefa{todayTodos.length!==1?"s":""} pendente{todayTodos.length!==1?"s":""} · {todayEvents.length} evento{todayEvents.length!==1?"s":""}</div>
</div>
{/* Today habits */}
{todayHabits.length>0&&<div className="card"><div className="ct">🔥 Hábitos de Hoje</div>
{["manha","tarde","noite","anytime"].map(period=>{const ph=todayHabits.filter(h=>(h.period||"anytime")===period);if(ph.length===0)return null;const pLabel={manha:"☀️ Manhã",tarde:"🌤 Tarde",noite:"🌙 Noite",anytime:""}[period];return(<div key={period}>{pLabel&&<div style={{fontSize:11,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:1.5,marginBottom:8,marginTop:period!=="manha"?12:0}}>{pLabel}</div>}
{ph.map(h=>{const log=getLog(h.id,td);const streak=getStreak(h.id);const done=!!log;return(<div key={h.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid var(--border)"}}>
<div style={{width:36,height:36,borderRadius:10,background:done?"var(--green-bg)":"var(--bg4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,cursor:"pointer",transition:"all .2s",border:done?"2px solid var(--green)":"2px solid transparent"}} onClick={()=>{if(h.type==="check")toggleHabit(h.id,td);else setModal("logHabit");setForm({...h,logDate:td,logVal:log?.value||"",logNote:log?.note||""});}}>{h.icon||"⭐"}</div>
<div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:600,color:done?"var(--green)":"var(--text)",textDecoration:done?"line-through":"none",transition:"all .2s"}}>{h.name}</div>
{h.type!=="check"&&<div style={{fontSize:11,color:"var(--text3)"}}>{log?.value||0}/{h.target} {h.unit}</div>}
</div>
{streak>0&&<span style={{fontSize:11,color:"var(--accent)",fontWeight:700}}>🔥{streak}</span>}
{done&&<Icon d={<polyline points="20 6 9 17 4 12"/>} size={18} color="var(--green)"/>}
</div>);})}</div>);})}
</div>}
{/* Today events */}
{todayEvents.length>0&&<div className="card"><div className="ct">📅 Agenda de Hoje</div>
{todayEvents.map(ev=>(<div key={ev.id} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:"1px solid var(--border)",alignItems:"center"}} onClick={()=>{setForm({...ev});setModal("editEvent");}}>
<div style={{width:4,height:36,borderRadius:2,background:ev.color||"var(--accent)",flexShrink:0}}/>
<div style={{flex:1}}><div style={{fontSize:14,fontWeight:600}}>{ev.title}</div><div style={{fontSize:11,color:"var(--text3)"}}>{ev.allDay?"Dia inteiro":ev.time?`${ev.time}${ev.endTime?" — "+ev.endTime:""}`:""}</div></div>
</div>))}
</div>}
{/* Today tasks */}
{todayTodos.length>0&&<div className="card"><div className="ct">✅ Tarefas para Hoje</div>
{todayTodos.slice(0,5).map(t=>{const pc=todoPriorities.find(p=>p.v===t.priority)||todoPriorities[3];return(<div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid var(--border)"}}>
<div style={{width:22,height:22,borderRadius:6,border:`2px solid ${pc.c}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all .25s"}} onClick={()=>toggleTodo(t.id)}>{t.done&&<Icon d={<polyline points="20 6 9 17 4 12"/>} size={14} color={pc.c}/>}</div>
<div style={{flex:1}}><div style={{fontSize:13,fontWeight:500}}>{t.name}</div>{t.due&&<div style={{fontSize:11,color:"var(--text3)"}}>{new Date(t.due+"T12:00").toLocaleDateString(c.locale||"pt-BR",{day:"numeric",month:"short"})}</div>}</div>
<span className="tg tg-n">{t.list}</span>
</div>);})}
{todayTodos.length>5&&<div style={{fontSize:12,color:"var(--accent)",marginTop:8,cursor:"pointer"}} onClick={()=>setTab("tarefas")}>+ {todayTodos.length-5} mais →</div>}
</div>}
{todayHabits.length===0&&todayTodos.length===0&&todayEvents.length===0&&<div className="card" style={{textAlign:"center",padding:32,color:"var(--text3)"}}>Nenhuma rotina configurada ainda. Comece criando hábitos, tarefas ou eventos!</div>}
</>}

{/* ═══ HÁBITOS ═══ */}
{tab==="habitos"&&<>
<div className="tb"><button className="btn bp" onClick={()=>{setForm({name:"",icon:"⭐",category:habitCats[0],type:"check",target:1,unit:"",freq:"diario",freqDays:[],period:"anytime"});setModal("addHabit");}}>{I.plus} Novo Hábito</button></div>
{/* Week heatmap */}
{habits.length>0&&<div className="card"><div className="ct">📊 Semana</div>
<div style={{overflowX:"auto"}}><table style={{display:"table"}}><thead><tr><th style={{minWidth:120}}>Hábito</th>{weekDates.map(d=><th key={d} style={{textAlign:"center",minWidth:36,padding:"6px 2px"}}><div style={{fontSize:10}}>{getDayName(d)}</div><div style={{fontSize:9,color:"var(--text3)"}}>{d.slice(8)}</div></th>)}<th style={{textAlign:"center",minWidth:40}}>🔥</th></tr></thead><tbody>
{habits.map(h=>(<tr key={h.id}><td style={{fontSize:13,fontWeight:500}}><span style={{marginRight:6}}>{h.icon}</span>{h.name}</td>
{weekDates.map(d=>{const log=getLog(h.id,d);const done=!!log;const isToday=d===td;return(<td key={d} style={{textAlign:"center",padding:4}}><div style={{width:28,height:28,borderRadius:8,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"center",cursor:isToday?"pointer":"default",transition:"all .2s",background:done?"var(--green)":isToday?"var(--bg4)":"transparent",border:isToday&&!done?"2px dashed var(--border2)":"2px solid transparent",color:done?"#fff":"var(--text3)",fontSize:12,fontWeight:700}} onClick={()=>{if(isToday&&h.type==="check")toggleHabit(h.id,d);}}>{done?"✓":""}</div></td>);})}
<td style={{textAlign:"center",fontWeight:700,color:"var(--accent)",fontSize:14}}>{getStreak(h.id)}</td></tr>))}
</tbody></table></div></div>}
{/* Habit list */}
{habits.length===0?<div className="card" style={{textAlign:"center",padding:32,color:"var(--text3)"}}>Nenhum hábito criado. Comece agora!</div>:
<div style={{display:"flex",flexDirection:"column",gap:8}}>
{habits.map(h=>{const streak=getStreak(h.id);const best=getBestStreak(h.id);const log=getLog(h.id,td);return(<div className="card" key={h.id} style={{padding:14,marginBottom:0}}>
<div style={{display:"flex",alignItems:"center",gap:10}}>
<span style={{fontSize:24}}>{h.icon}</span>
<div style={{flex:1}}><div style={{fontSize:15,fontWeight:700}}>{h.name}</div><div style={{fontSize:11,color:"var(--text3)"}}>{h.category} · {h.period==="manha"?"☀️ Manhã":h.period==="tarde"?"🌤 Tarde":h.period==="noite"?"🌙 Noite":"Qualquer hora"} · {h.freq==="diario"?"Diário":h.freq==="dias"?"Dias específicos":"Semanal"}</div></div>
<div style={{textAlign:"right"}}><div style={{fontSize:18,fontWeight:800,color:"var(--accent)"}}>🔥 {streak}</div><div style={{fontSize:10,color:"var(--text3)"}}>melhor: {best}</div></div>
</div>
<div style={{display:"flex",gap:6,marginTop:8,justifyContent:"flex-end"}}><button className="bi" onClick={()=>{setForm({...h});setModal("editHabit");}}>{I.edit}</button><ConfirmDelete onConfirm={()=>delHabit(h.id)}/></div>
</div>);})}
</div>}
</>}

{/* ═══ TAREFAS ═══ */}
{tab==="tarefas"&&<>
<div className="tb"><button className="btn bp" onClick={()=>{setForm({name:"",desc:"",due:"",priority:"",list:todoLists[0],assignee:"",subtasks:[],recurrence:""});setModal("addTodo");}}>{I.plus} Nova Tarefa</button></div>
{/* Pending */}
{todayTodos.length>0&&<div className="card"><div className="ct" style={{color:"var(--accent)"}}>📌 Hoje e Atrasadas ({todayTodos.length})</div>
{todayTodos.map(t=>{const pc=todoPriorities.find(p=>p.v===t.priority)||todoPriorities[3];const stDone=(t.subtasks||[]).filter(s=>s.done).length;const stTotal=(t.subtasks||[]).length;return(<div key={t.id} style={{padding:"10px 0",borderBottom:"1px solid var(--border)"}}>
<div style={{display:"flex",alignItems:"center",gap:10}}>
<div style={{width:24,height:24,borderRadius:7,border:`2px solid ${pc.c}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all .25s",flexShrink:0}} onClick={()=>toggleTodo(t.id)}>{t.done&&<Icon d={<polyline points="20 6 9 17 4 12"/>} size={14} color={pc.c}/>}</div>
<div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:600,textDecoration:t.done?"line-through":"",color:t.done?"var(--text3)":"var(--text)"}}>{t.name}</div>
{t.desc&&<div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>{t.desc}</div>}
<div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap",alignItems:"center"}}><span className="tg tg-n">{t.list}</span>{t.due&&<span style={{fontSize:11,color:t.due<td?"var(--red)":"var(--text3)"}}>{new Date(t.due+"T12:00").toLocaleDateString(c.locale||"pt-BR",{day:"numeric",month:"short"})}</span>}{t.assignee&&<span style={{fontSize:11,color:"var(--text3)"}}>→ {t.assignee}</span>}{stTotal>0&&<span style={{fontSize:11,color:"var(--text3)"}}>{stDone}/{stTotal}</span>}</div>
</div>
<div style={{display:"flex",gap:4,flexShrink:0}}><button className="bi" onClick={()=>{setForm({...t});setModal("editTodo");}}>{I.edit}</button><ConfirmDelete onConfirm={()=>delTodo(t.id)}/></div>
</div>
{stTotal>0&&<div style={{marginLeft:34,marginTop:6}}>{(t.subtasks||[]).map((s,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"3px 0",fontSize:12,color:s.done?"var(--text3)":"var(--text2)",cursor:"pointer"}} onClick={()=>toggleSubtask(t.id,i)}><div style={{width:16,height:16,borderRadius:4,border:`1.5px solid ${s.done?"var(--green)":"var(--border2)"}`,background:s.done?"var(--green)":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>{s.done&&<Icon d={<polyline points="20 6 9 17 4 12"/>} size={10} color="#fff"/>}</div><span style={{textDecoration:s.done?"line-through":""}}>{s.name}</span></div>))}</div>}
</div>);})}
</div>}
{/* Upcoming */}
{upcomingTodos.length>0&&<div className="card"><div className="ct">📅 Próximas ({upcomingTodos.length})</div>
{upcomingTodos.slice(0,8).map(t=>{const pc=todoPriorities.find(p=>p.v===t.priority)||todoPriorities[3];return(<div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid var(--border)"}}>
<div style={{width:22,height:22,borderRadius:6,border:`2px solid ${pc.c}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>toggleTodo(t.id)}/>
<div style={{flex:1}}><div style={{fontSize:13,fontWeight:500}}>{t.name}</div></div>
<span style={{fontSize:11,color:"var(--text3)"}}>{new Date(t.due+"T12:00").toLocaleDateString(c.locale||"pt-BR",{day:"numeric",month:"short"})}</span>
<span className="tg tg-n">{t.list}</span>
</div>);})}
</div>}
{/* Done */}
{doneTodos.length>0&&<div className="card"><div className="ct" style={{color:"var(--green)"}}>✅ Concluídas ({doneTodos.length})</div>
{doneTodos.slice(0,5).map(t=>(<div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:"1px solid var(--border)",opacity:.5}}>
<Icon d={<polyline points="20 6 9 17 4 12"/>} size={16} color="var(--green)"/>
<span style={{flex:1,fontSize:13,textDecoration:"line-through",color:"var(--text3)"}}>{t.name}</span>
<ConfirmDelete onConfirm={()=>delTodo(t.id)}/>
</div>))}
</div>}
{todos.length===0&&<div className="card" style={{textAlign:"center",padding:32,color:"var(--text3)"}}>Nenhuma tarefa. Crie a primeira!</div>}
</>}

{/* ═══ AGENDA ═══ */}
{tab==="agenda"&&<>
<div className="tb"><button className="btn bp" onClick={()=>{setForm({title:"",date:td,time:"",endTime:"",color:"var(--accent)",notes:"",allDay:false});setModal("addEvent");}}>{I.plus} Novo Evento</button></div>
{/* Week view */}
<div style={{display:"flex",flexDirection:"column",gap:8}}>
{weekDates.map(d=>{const dayEvs=events.filter(e=>e.date===d).sort((a,b)=>(a.time||"").localeCompare(b.time||""));const isToday=d===td;const dayLabel=new Date(d+"T12:00").toLocaleDateString(c.locale||"pt-BR",{weekday:"short",day:"numeric",month:"short"});return(<div key={d} className="card" style={{padding:12,marginBottom:0,borderLeft:isToday?`3px solid var(--accent)`:"3px solid transparent"}}>
<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:dayEvs.length>0?8:0}}><div style={{fontSize:13,fontWeight:isToday?700:500,color:isToday?"var(--accent)":"var(--text)"}}>{dayLabel}</div>{isToday&&<span className="tg tg-b">Hoje</span>}</div>
{dayEvs.length===0&&<div style={{fontSize:12,color:"var(--text3)",padding:"2px 0"}}>Sem eventos</div>}
{dayEvs.map(ev=>(<div key={ev.id} style={{display:"flex",gap:8,alignItems:"center",padding:"6px 0",borderBottom:"1px solid var(--border)",cursor:"pointer"}} onClick={()=>{setForm({...ev});setModal("editEvent");}}>
<div style={{width:4,height:28,borderRadius:2,background:ev.color||"var(--accent)",flexShrink:0}}/>
<div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{ev.title}</div>{!ev.allDay&&ev.time&&<div style={{fontSize:11,color:"var(--text3)"}}>{ev.time}{ev.endTime?" — "+ev.endTime:""}</div>}{ev.allDay&&<div style={{fontSize:11,color:"var(--text3)"}}>Dia inteiro</div>}</div>
<div style={{display:"flex",gap:4}}><button className="bi" style={{padding:4}} onClick={e=>{e.stopPropagation();setForm({...ev});setModal("editEvent");}}>{I.edit}</button><ConfirmDelete onConfirm={()=>delEvent(ev.id)}/></div>
</div>))}
</div>);})}
</div>
</>}

{/* ═══ MODALS ═══ */}
{/* Habit modal */}
{(modal==="addHabit"||modal==="editHabit")&&<Modal title={modal==="addHabit"?"Novo Hábito":"Editar Hábito"} onClose={()=>setModal(null)}>
<div className="fr"><div className="fg" style={{flex:2}}><label className="fl">Nome</label><input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} autoFocus placeholder="Ex: Beber 2L de água"/></div>
<div className="fg" style={{maxWidth:80}}><label className="fl">Ícone</label><input value={form.icon||""} onChange={e=>setForm({...form,icon:e.target.value})} placeholder="⭐" style={{fontSize:20,textAlign:"center"}}/></div></div>
<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>{"⭐💧📖🏃‍♂️🧘‍♀️💪🥗💊🎯📝🌅🚫📱😴🧹".split(/(?=[\uD800-\uDBFF])|(?=[\u2600-\u27FF])|(?=[\uFE00-\uFE0F])/).filter(e=>e.trim()).map((em,i)=><span key={i} style={{fontSize:20,cursor:"pointer",padding:2}} onClick={()=>setForm({...form,icon:em})}>{em}</span>)}</div>
<div className="fr"><div className="fg"><label className="fl">Tipo</label><select value={form.type||"check"} onChange={e=>setForm({...form,type:e.target.value})}><option value="check">Sim / Não</option><option value="qty">Quantidade</option><option value="time">Tempo (min)</option></select></div>
{form.type&&form.type!=="check"&&<div className="fg"><label className="fl">Meta diária</label><input type="number" value={form.target||""} onChange={e=>setForm({...form,target:e.target.value})} placeholder={form.type==="qty"?"Ex: 8":"Ex: 30"}/></div>}
{form.type==="qty"&&<div className="fg"><label className="fl">Unidade</label><input value={form.unit||""} onChange={e=>setForm({...form,unit:e.target.value})} placeholder="Ex: copos, páginas"/></div>}</div>
<div className="fr"><div className="fg"><label className="fl">Categoria</label><select value={form.category||habitCats[0]} onChange={e=>setForm({...form,category:e.target.value})}>{habitCats.map(c=><option key={c}>{c}</option>)}</select></div>
<div className="fg"><label className="fl">Período</label><select value={form.period||"anytime"} onChange={e=>setForm({...form,period:e.target.value})}><option value="anytime">Qualquer hora</option><option value="manha">Manhã</option><option value="tarde">Tarde</option><option value="noite">Noite</option></select></div></div>
<div className="fr"><div className="fg"><label className="fl">Frequência</label><select value={form.freq||"diario"} onChange={e=>setForm({...form,freq:e.target.value})}><option value="diario">Diário</option><option value="dias">Dias específicos</option><option value="semanal">Semanal</option></select></div></div>
{form.freq==="dias"&&<div style={{display:"flex",gap:6,marginBottom:12}}>{dayNames.map((d,i)=>{const sel=(form.freqDays||[]).includes(i);return(<button key={i} className={`btn ${sel?"bp":"bg"} bs`} onClick={()=>{const fd=[...(form.freqDays||[])];if(sel)fd.splice(fd.indexOf(i),1);else fd.push(i);setForm({...form,freqDays:fd});}} style={{borderRadius:20,minWidth:38}}>{d}</button>);})}</div>}
<div className="ma"><button className="btn bg" onClick={()=>setModal(null)}>Cancelar</button><button className="btn bp" onClick={saveHabit}>Salvar</button></div>
</Modal>}
{/* Habit log modal (for qty/time) */}
{modal==="logHabit"&&<Modal title={`${form.icon} ${form.name}`} onClose={()=>setModal(null)}>
<div className="fg" style={{marginBottom:12}}><label className="fl">{form.type==="qty"?`Quantidade (${form.unit||"un"})`:"Minutos"}</label><input type="number" value={form.logVal||""} onChange={e=>setForm({...form,logVal:e.target.value})} autoFocus placeholder={`Meta: ${form.target}`}/></div>
<div className="fg" style={{marginBottom:12}}><label className="fl">Nota (opcional)</label><input value={form.logNote||""} onChange={e=>setForm({...form,logNote:e.target.value})} placeholder="Como foi?"/></div>
<div className="ma"><button className="btn bg" onClick={()=>setModal(null)}>Cancelar</button><button className="btn bp" onClick={()=>{setHabitVal(form.id,form.logDate,form.logVal,form.logNote);toast("Registrado!");setModal(null);}}>Salvar</button></div>
</Modal>}
{/* Todo modal */}
{(modal==="addTodo"||modal==="editTodo")&&<Modal title={modal==="addTodo"?"Nova Tarefa":"Editar Tarefa"} onClose={()=>setModal(null)}>
<div className="fr"><div className="fg" style={{flex:2}}><label className="fl">Nome</label><input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} autoFocus/></div></div>
<div className="fg" style={{marginBottom:12}}><label className="fl">Descrição (opcional)</label><input value={form.desc||""} onChange={e=>setForm({...form,desc:e.target.value})} placeholder="Detalhes..."/></div>
<div className="fr"><div className="fg"><label className="fl">Data</label><input type="date" value={form.due||""} onChange={e=>setForm({...form,due:e.target.value})}/></div>
<div className="fg"><label className="fl">Prioridade</label><select value={form.priority||""} onChange={e=>setForm({...form,priority:e.target.value})}>{todoPriorities.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}</select></div></div>
<div className="fr"><div className="fg"><label className="fl">Lista</label><select value={form.list||todoLists[0]} onChange={e=>setForm({...form,list:e.target.value})}>{todoLists.map(l=><option key={l}>{l}</option>)}</select></div>
{shared&&<div className="fg"><label className="fl">Atribuir a</label><select value={form.assignee||""} onChange={e=>setForm({...form,assignee:e.target.value})}><option value="">Ninguém</option><option>{myName}</option>{(data.members||[]).filter(m=>m!==myName).map(m=><option key={m}>{m}</option>)}</select></div>}</div>
{/* Subtasks */}
<div style={{marginBottom:12}}><label className="fl">Subtarefas</label>
{(form.subtasks||[]).map((s,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0"}}><span style={{fontSize:13,flex:1,color:"var(--text2)"}}>{s.name}</span><button className="bi" style={{padding:3}} onClick={()=>rmSubtask(i)}><Icon d={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} size={12}/></button></div>))}
<div style={{display:"flex",gap:6,marginTop:6}}><input value={newST} onChange={e=>setNewST(e.target.value)} placeholder="Nova subtarefa..." onKeyDown={e=>e.key==="Enter"&&addSubtask()} style={{flex:1,padding:"8px 10px",fontSize:13}}/><button className="btn bp bs" onClick={addSubtask}>{I.plus}</button></div>
</div>
<div className="ma"><button className="btn bg" onClick={()=>setModal(null)}>Cancelar</button><button className="btn bp" onClick={saveTodo}>Salvar</button></div>
</Modal>}
{/* Event modal */}
{(modal==="addEvent"||modal==="editEvent")&&<Modal title={modal==="addEvent"?"Novo Evento":"Editar Evento"} onClose={()=>setModal(null)}>
<div className="fr"><div className="fg" style={{flex:2}}><label className="fl">Título</label><input value={form.title||""} onChange={e=>setForm({...form,title:e.target.value})} autoFocus/></div></div>
<div className="fr"><div className="fg"><label className="fl">Data</label><input type="date" value={form.date||td} onChange={e=>setForm({...form,date:e.target.value})}/></div>
<div className="fg"><label className="fl">Cor</label><div style={{display:"flex",gap:6}}>{evColors.map(col=>(<div key={col} style={{width:24,height:24,borderRadius:12,background:col,cursor:"pointer",border:form.color===col?"3px solid var(--text)":"3px solid transparent",transition:"all .2s"}} onClick={()=>setForm({...form,color:col})}/>))}</div></div></div>
<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,cursor:"pointer"}} onClick={()=>setForm({...form,allDay:!form.allDay})}>
<div style={{width:22,height:22,borderRadius:6,border:`2px solid ${form.allDay?"var(--blue)":"var(--border2)"}`,background:form.allDay?"var(--blue)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s"}}>{form.allDay&&<Icon d={<polyline points="20 6 9 17 4 12"/>} size={14} color="#fff"/>}</div>
<span style={{fontSize:14,color:form.allDay?"var(--blue)":"var(--text3)",fontWeight:500}}>Dia inteiro</span></div>
{!form.allDay&&<div className="fr"><div className="fg"><label className="fl">Início</label><input type="time" value={form.time||""} onChange={e=>setForm({...form,time:e.target.value})}/></div>
<div className="fg"><label className="fl">Fim (opcional)</label><input type="time" value={form.endTime||""} onChange={e=>setForm({...form,endTime:e.target.value})}/></div></div>}
<div className="fg" style={{marginBottom:12}}><label className="fl">Notas (opcional)</label><input value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Detalhes do evento..."/></div>
<div className="ma"><button className="btn bg" onClick={()=>setModal(null)}>Cancelar</button><button className="btn bp" onClick={saveEvent}>Salvar</button></div>
</Modal>}
</div>);}

// ─── PRICES ───
function PricesPage({data,setData,toast}){const c=data.config;const fmt=(n)=>fmtCurrency(n,c.locale,c.currency);const[search,setSearch]=useState("");const[modal,setModal]=useState(null);const[form,setForm]=useState({});const[editEntry,setEditEntry]=useState(null);const[editVal,setEditVal]=useState("");
const ph=data.priceHistory||[];
const grouped={};ph.forEach(p=>{if(!grouped[p.name])grouped[p.name]=[];grouped[p.name].push(p);});
Object.values(grouped).forEach(arr=>arr.sort((a,b)=>a.date.localeCompare(b.date)));
const products=Object.keys(grouped).filter(n=>!search||n.toLowerCase().includes(search.toLowerCase())).sort();
const getStats=(name)=>{const arr=grouped[name]||[];if(arr.length===0)return{last:0,prev:0,change:0,count:0,min:0,max:0,avg:0};const prices=arr.map(p=>p.unitPrice||p.totalPrice||0);const last=prices[prices.length-1];const prev=prices.length>1?prices[prices.length-2]:last;const change=prev>0?((last-prev)/prev)*100:0;return{last,prev,change,count:arr.length,min:Math.min(...prices),max:Math.max(...prices),avg:prices.reduce((a,b)=>a+b,0)/prices.length};};
const Spark=({data:pts,width=120,height=32})=>{if(pts.length<2)return<span style={{fontSize:11,color:"var(--text3)"}}>1 registro</span>;const prices=pts.map(p=>p.unitPrice||p.totalPrice||0);const mn=Math.min(...prices);const mx=Math.max(...prices);const range=mx-mn||1;const points=prices.map((p,i)=>`${(i/(prices.length-1))*width},${height-((p-mn)/range)*height}`).join(" ");const rising=prices[prices.length-1]>=prices[0];return(<svg width={width} height={height} style={{display:"block"}}><polyline points={points} fill="none" stroke={rising?"var(--red)":"var(--green)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>{prices.map((p,i)=>(<circle key={i} cx={(i/(prices.length-1))*width} cy={height-((p-mn)/range)*height} r="3" fill={i===prices.length-1?"var(--accent)":rising?"var(--red)":"var(--green)"} opacity={i===prices.length-1?1:0.5}/>))}</svg>);};
const addPrice=()=>{if(!form.name||!form.price)return;const up=Number(form.price);const q=Number(form.qty)||1;setData(d=>({...d,priceHistory:[...(d.priceHistory||[]),{id:Date.now(),name:form.name,unitPrice:up,totalPrice:up*q,qty:q,unit:form.unit||"un",date:form.date||today()}]}));toast("Preço registrado");setModal(null);};
const saveEditEntry=()=>{if(!editEntry)return;const up=Number(editVal)||0;setData(d=>({...d,priceHistory:(d.priceHistory||[]).map(p=>p.id===editEntry.id?{...p,unitPrice:up,totalPrice:up*(p.qty||1)}:p)}));toast("Preço atualizado");setEditEntry(null);};
const delEntry=(id)=>{setData(d=>({...d,priceHistory:(d.priceHistory||[]).filter(p=>p.id!==id)}));toast("Registro removido");};
const delProduct=(name)=>{if(!confirm(`Apagar todo o histórico de "${name}"?`))return;setData(d=>({...d,priceHistory:(d.priceHistory||[]).filter(p=>p.name!==name)}));toast("Histórico removido");};
const totalProducts=Object.keys(grouped).length;const totalEntries=ph.length;
const alerts=products.map(n=>({name:n,...getStats(n)})).filter(s=>s.count>=2&&s.change>0).sort((a,b)=>b.change-a.change).slice(0,3);
return(<div><div className="ph"><div className="pt">Preços</div><div className="ps">Histórico e evolução de preços unitários</div></div>
<div className="sg">
<div className="sc ac"><div className="sl">Produtos Rastreados</div><div className="sv">{totalProducts}</div><div className="sd">{totalEntries} registros</div></div>
{alerts.length>0&&<div className="sc rd"><div className="sl">Maior Alta</div><div className="sv" style={{color:"var(--red)",fontSize:22}}>{alerts[0].name}</div><div className="sd">+{alerts[0].change.toFixed(1)}% ({fmt(alerts[0].prev)} → {fmt(alerts[0].last)})</div></div>}
{(()=>{const drops=products.map(n=>({name:n,...getStats(n)})).filter(s=>s.count>=2&&s.change<0).sort((a,b)=>a.change-b.change);return drops.length>0?<div className="sc gn"><div className="sl">Maior Queda</div><div className="sv" style={{color:"var(--green)",fontSize:22}}>{drops[0].name}</div><div className="sd">{drops[0].change.toFixed(1)}% ({fmt(drops[0].prev)} → {fmt(drops[0].last)})</div></div>:null;})()}
</div>
<div className="tb"><div className="sb-i" style={{marginBottom:0,flex:1,maxWidth:320}}>{I.search}<input placeholder="Buscar produto..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
<div className="tr"><button className="btn bp" onClick={()=>{setForm({name:"",price:"",qty:"1",unit:c.units[0]||"un",date:today()});setModal("add");}}>{I.plus} Registrar Preço</button></div></div>
{products.length===0&&<div className="card" style={{textAlign:"center",padding:40,color:"var(--text3)"}}>{search?"Nenhum produto encontrado":"Nenhum preço registrado. Marque itens na Lista de Compras ou registre manualmente."}</div>}
{products.map(name=>{const stats=getStats(name);const arr=grouped[name];return(
<div className="card" key={name} style={{padding:20}}>
<div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
<div style={{flex:1,minWidth:150}}>
<div style={{fontSize:16,fontWeight:600,color:"var(--text)",marginBottom:4}}>{name}</div>
<div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
<span style={{fontSize:20,fontWeight:700}}>{fmt(stats.last)}<span style={{fontSize:11,color:"var(--text3)",fontWeight:400}}>/un</span></span>
{stats.count>=2&&<span style={{fontSize:13,fontWeight:600,color:stats.change>0?"var(--red)":stats.change<0?"var(--green)":"var(--text3)",background:stats.change>0?"var(--red-bg)":stats.change<0?"var(--green-bg)":"var(--bg4)",padding:"2px 10px",borderRadius:12}}>{stats.change>0?"+":""}{stats.change.toFixed(1)}%</span>}
<span style={{fontSize:11,color:"var(--text3)"}}>{stats.count} registro{stats.count>1?"s":""}</span>
</div>
{stats.count>=2&&<div style={{fontSize:11,color:"var(--text3)",marginTop:4}}>Mín: {fmt(stats.min)} · Máx: {fmt(stats.max)} · Média: {fmt(stats.avg)}</div>}
</div>
<div style={{minWidth:130}}><Spark data={arr}/></div>
<button className="bi" onClick={()=>delProduct(name)} title="Apagar histórico">{I.trash}</button>
</div>
{arr.length>=1&&<div style={{marginTop:12,display:"flex",gap:6,flexWrap:"wrap"}}>{arr.map((p)=><div key={p.id} style={{fontSize:11,color:"var(--text3)",background:"var(--bg3)",padding:"4px 10px",borderRadius:8,cursor:"pointer",display:"flex",alignItems:"center",gap:4,border:"1px solid transparent",transition:"border-color .2s"}} onClick={()=>{setEditEntry(p);setEditVal(p.unitPrice||p.totalPrice||"");}} title="Clique para editar"><span style={{color:"var(--text2)",fontWeight:600}}>{fmt(p.unitPrice||p.totalPrice||0)}</span><span>{new Date(p.date+"T12:00").toLocaleDateString(c.locale||"pt-BR",{day:"numeric",month:"short"})}</span><span style={{color:"var(--text3)",fontSize:10}}>✎</span></div>)}</div>}
</div>);})}
{modal&&<Modal title="Registrar Preço" onClose={()=>setModal(null)}>
<div className="fr"><div className="fg" style={{flex:2}}><label className="fl">Produto</label><input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ex: Arroz" autoFocus list="price-products"/><datalist id="price-products">{[...new Set(ph.map(p=>p.name))].map(n=><option key={n} value={n}/>)}</datalist></div>
<div className="fg"><label className="fl">Preço unitário</label><MoneyInput value={form.price||0} onChange={v=>setForm({...form,price:v})}/></div></div>
<div className="fr"><div className="fg"><label className="fl">Qtd</label><input type="number" value={form.qty||""} onChange={e=>setForm({...form,qty:e.target.value})}/></div>
<div className="fg"><label className="fl">Unidade</label><select value={form.unit||c.units[0]} onChange={e=>setForm({...form,unit:e.target.value})}>{c.units.map(u=><option key={u}>{u}</option>)}</select></div>
<div className="fg"><label className="fl">Data</label><input type="date" value={form.date||today()} onChange={e=>setForm({...form,date:e.target.value})}/></div></div>
{Number(form.price)>0&&Number(form.qty)>0&&<div style={{fontSize:14,fontWeight:600,color:"var(--accent)",marginTop:4}}>Total: {fmt(Number(form.price)*Number(form.qty))}</div>}
<div className="ma"><button className="btn bg" onClick={()=>setModal(null)}>Cancelar</button><button className="btn bp" onClick={addPrice}>Registrar</button></div>
</Modal>}
{editEntry&&<Modal title="Editar Preço" onClose={()=>setEditEntry(null)}>
<div style={{fontSize:13,color:"var(--text2)",marginBottom:12}}>{editEntry.name} — {new Date(editEntry.date+"T12:00").toLocaleDateString(c.locale||"pt-BR",{day:"numeric",month:"long",year:"numeric"})}</div>
<div className="fr"><div className="fg"><label className="fl">Preço unitário</label><MoneyInput value={editVal} onChange={v=>setEditVal(v)} autoFocus onKeyDown={e=>e.key==="Enter"&&saveEditEntry()}/></div></div>
{Number(editVal)>0&&<div style={{fontSize:14,fontWeight:600,color:"var(--accent)",marginTop:4}}>Total ({editEntry.qty} {editEntry.unit}): {fmt(Number(editVal)*(editEntry.qty||1))}</div>}
<div className="ma"><button className="btn bd bs" onClick={()=>{delEntry(editEntry.id);setEditEntry(null);}}>Excluir registro</button><button className="btn bg" onClick={()=>setEditEntry(null)}>Cancelar</button><button className="btn bp" onClick={saveEditEntry}>Salvar</button></div>
</Modal>}
</div>);}

// ─── SETTINGS ───
function SettingsPage({data,setData,toast,user,houseCode,houseInfo,leaveHouse,refreshHouseInfo,userPrefs,setUserPrefs,mode,toggleMode}){const c=data.config;const[nm,setNm]=useState("");const[tab,setTab]=useState("geral");
const myTheme=userPrefs?.theme||c.theme||"dark";const myAccent=userPrefs?.accentColor||c.accentColor||"#F0A050";
const uc=(k,v)=>setData(d=>({...d,config:{...d.config,[k]:v}}));
const al=(k,v)=>{if(!v.trim()||c[k].includes(v.trim()))return;uc(k,[...c[k],v.trim()]);toast("Adicionado");};
const rl=(k,v)=>{uc(k,c[k].filter(x=>x!==v));toast("Removido");};
const addM=()=>{if(!nm.trim()||data.members.includes(nm.trim()))return;setData(d=>({...d,members:[...d.members,nm.trim()]}));setNm("");toast("Membro adicionado");};
const rmM=(m)=>{setData(d=>({...d,members:d.members.filter(x=>x!==m)}));toast("Removido");};
const exp=()=>{const b=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download="lar-centro-backup.json";a.click();URL.revokeObjectURL(u);toast("Backup exportado");};
const imp=()=>{const inp=document.createElement("input");inp.type="file";inp.accept=".json";inp.onchange=(e)=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=(ev)=>{try{const d=JSON.parse(ev.target.result);if(d.config&&d.pantry){setData({...DEFAULT_DATA,...d,config:{...DEFAULT_CONFIG,...(d.config||{})}});toast("Importado!");}else toast("Arquivo inválido");}catch{toast("Erro ao ler");}};r.readAsText(f);};inp.click();};
const reset=()=>{if(confirm("Resetar tudo?")){setData(DEFAULT_DATA);toast("Resetado");}};
const tabs=[{id:"geral",label:"Geral",icon:I.home},{id:"casa",label:"Casa",icon:I.users},{id:"aparencia",label:"Aparência",icon:I.palette},{id:"categorias",label:"Categorias",icon:I.tag},{id:"listas",label:"Listas",icon:I.sliders},{id:"dados",label:"Dados",icon:I.download}];
return(<div><div className="ph"><div className="pt">Configurações</div><div className="ps">Personalize absolutamente tudo</div></div>
<div className="filter-scroll" style={{display:"flex",gap:4,marginBottom:24,flexWrap:"wrap"}}>{tabs.map(t=><button key={t.id} className={`btn ${tab===t.id?"bp":"bg"} bs`} onClick={()=>setTab(t.id)} style={{gap:6}}>{t.icon} {t.label}</button>)}</div>

{tab==="geral"&&<><div className="card"><div className="sst">{I.home} Nome da Casa</div><div className="fg" style={{maxWidth:360}}><input value={c.houseName} onChange={e=>uc("houseName",e.target.value)}/></div></div>
<div className="card"><div className="sst">{I.users} Membros</div><div className="te">{data.members.map(m=><div className="tc" key={m}>{m}<button onClick={()=>rmM(m)}><Icon d={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} size={12}/></button></div>)}</div><div className="ta"><input value={nm} onChange={e=>setNm(e.target.value)} placeholder="Novo membro" onKeyDown={e=>e.key==="Enter"&&addM()}/><button className="btn bp bs" onClick={addM}>{I.plus}</button></div></div>
<div className="card"><div className="sst">{I.budget} Moeda & Formato</div><div className="fr"><div className="fg"><label className="fl">Moeda</label><select value={c.currency} onChange={e=>uc("currency",e.target.value)}>{CURRENCIES.map(cur=><option key={cur.code} value={cur.code}>{cur.label}</option>)}</select></div><div className="fg"><label className="fl">Locale</label><select value={c.locale} onChange={e=>uc("locale",e.target.value)}><option value="pt-BR">Português (BR)</option><option value="en-US">English (US)</option><option value="es-ES">Español</option><option value="fr-FR">Français</option><option value="de-DE">Deutsch</option><option value="ja-JP">日本語</option></select></div></div></div>
<div className="card"><div className="sst">⚠ Alerta de Validade</div><div className="fg" style={{maxWidth:200}}><label className="fl">Dias de antecedência</label><input type="number" value={c.expiryWarnDays} onChange={e=>uc("expiryWarnDays",Number(e.target.value)||7)} min={1} max={90}/></div><div style={{fontSize:12,color:"var(--text3)",marginTop:8}}>Itens que vencem em até {c.expiryWarnDays} dias aparecerão como alerta</div></div></>}

{tab==="casa"&&<>
<div className="card" style={{background:mode==="shared"?"var(--accent-glow)":"var(--purple-bg)",borderColor:mode==="shared"?"var(--accent)":"var(--purple)"}}>
<div className="sst" style={{color:mode==="shared"?"var(--accent)":"var(--purple)"}}>{mode==="shared"?`${I.users} Modo Compartilhado`:"👤 Modo Pessoal"}</div>
<p style={{fontSize:13,color:"var(--text2)",lineHeight:1.6,marginBottom:16}}>{mode==="shared"?"Todos os dados (despensa, compras, tarefas, finanças...) são compartilhados com os membros da casa.":"Você está usando dados pessoais. Ninguém mais vê seus itens, compras ou finanças."}</p>
<button onClick={toggleMode} style={{width:"100%",padding:"12px",borderRadius:10,fontSize:14,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",background:mode==="shared"?"var(--purple)":"var(--accent)",color:"#fff",transition:"all .2s"}}>
{mode==="shared"?"Trocar para Modo Pessoal":"Trocar para Modo Compartilhado"}
</button>
<p style={{fontSize:11,color:"var(--text3)",marginTop:8,textAlign:"center"}}>{mode==="shared"?"No modo pessoal, seus dados ficam separados da casa":"No modo compartilhado, você volta a ver os dados da casa"}</p>
</div>

{mode==="shared"&&<><div className="card"><div className="sst">{I.users} Código da Casa</div>
<div style={{padding:"16px 24px",background:"var(--bg3)",border:"2px dashed var(--accent)",borderRadius:12,fontSize:28,fontWeight:800,letterSpacing:6,color:"var(--accent)",textAlign:"center",marginBottom:12,cursor:"pointer",userSelect:"all"}} onClick={()=>{navigator.clipboard?.writeText(houseCode||"");toast("Código copiado!");}} title="Clique para copiar">{houseCode||"—"}</div>
<p style={{fontSize:12,color:"var(--text3)",marginBottom:8,textAlign:"center"}}>Compartilhe este código para que outras pessoas entrem na sua casa</p>
</div>

<div className="card"><div className="sst">{I.users} Membros da Casa</div>
{houseInfo&&houseInfo.members&&houseInfo.members.length>0?<div style={{display:"flex",flexDirection:"column",gap:8}}>
{houseInfo.members.map((m,i)=>(<div key={m.uid||i} style={{display:"flex",alignItems:"center",gap:10,background:"var(--bg3)",padding:"10px 14px",borderRadius:10}}>
<div style={{width:32,height:32,borderRadius:"50%",background:"var(--accent-glow)",border:"2px solid var(--accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"var(--accent)"}}>{(m.name||m.email||"?")[0].toUpperCase()}</div>
<div style={{flex:1}}><div style={{fontSize:14,fontWeight:500,color:"var(--text)"}}>{m.name||m.email}</div><div style={{fontSize:11,color:"var(--text3)"}}>{m.email}</div></div>
{i===0&&<span className="tg tg-g" style={{fontSize:10}}>Criador</span>}
</div>))}
</div>:<p style={{fontSize:13,color:"var(--text3)"}}>Nenhum membro encontrado</p>}
<button className="btn bg bs" style={{marginTop:12}} onClick={refreshHouseInfo}>{I.users} Atualizar lista</button>
</div>

<div className="card"><div className="sst" style={{color:"var(--red)"}}>Sair da Casa</div>
<p style={{fontSize:13,color:"var(--text3)",marginBottom:12}}>Você pode entrar novamente com o código. Seus dados continuam salvos na casa.</p>
<button className="btn bd" onClick={leaveHouse}>{I.x} Sair desta casa</button>
</div></>}
</>}

{tab==="aparencia"&&<>
<div className="card" style={{background:"var(--accent-glow)",borderColor:"var(--accent)",marginBottom:16}}><div style={{fontSize:13,color:"var(--text2)",lineHeight:1.6}}>🎨 <strong style={{color:"var(--text)"}}>As configurações de aparência são individuais</strong> — cada pessoa da casa pode ter seu próprio tema, cor e avatar, sem afetar os outros.</div></div>
<AvatarEditor userPrefs={userPrefs} setUserPrefs={setUserPrefs} user={user} toast={toast}/>
<div className="card"><div className="sst">{I.palette} Tema</div><div className="thg">{Object.entries(THEMES).map(([k,v])=>(<div key={k} className={`thc ${myTheme===k?"sel":""}`} style={{background:v["--bg2"],color:v["--text"],border:`2px solid ${myTheme===k?myAccent:v["--border"]}`}} onClick={()=>{setUserPrefs(p=>({...p,theme:k}));toast("Tema atualizado");}}><div style={{width:"100%",height:24,borderRadius:4,marginBottom:8,background:`linear-gradient(135deg,${v["--bg"]},${v["--bg3"]})`}}/>{k.charAt(0).toUpperCase()+k.slice(1)}</div>))}</div></div>
<div className="card"><div className="sst">✦ Cor de Destaque</div><div className="cg">{ACCENT_COLORS.map(col=>(<div key={col} className={`cd ${myAccent===col?"sel":""}`} style={{background:col}} onClick={()=>{setUserPrefs(p=>({...p,accentColor:col}));toast("Cor atualizada");}}/>))}</div><div style={{marginTop:12,display:"flex",alignItems:"center",gap:8}}><label className="fl" style={{margin:0}}>Personalizada:</label><input type="color" value={myAccent} onChange={e=>{setUserPrefs(p=>({...p,accentColor:e.target.value}));}} style={{width:40,height:32,padding:2,cursor:"pointer"}}/><span style={{fontSize:12,color:"var(--text3)"}}>{myAccent}</span></div></div></>}

{tab==="categorias"&&<><div className="card"><div className="sst">{I.pantry} Categorias da Despensa</div><p style={{fontSize:12,color:"var(--text3)",marginBottom:8}}>Usadas na despensa e lista de compras</p><TagEditor items={c.pantryCategories} onAdd={v=>al("pantryCategories",v)} onRemove={v=>rl("pantryCategories",v)}/></div>
<div className="card"><div className="sst">{I.budget} Categorias de Gastos</div><TagEditor items={c.expenseCategories} onAdd={v=>al("expenseCategories",v)} onRemove={v=>rl("expenseCategories",v)}/></div></>}

{tab==="listas"&&<><div className="card"><div className="sst">{I.pantry} Locais de Armazenamento</div><p style={{fontSize:12,color:"var(--text3)",marginBottom:8}}>Geladeira, despensa, freezer...</p><TagEditor items={c.locations} onAdd={v=>al("locations",v)} onRemove={v=>rl("locations",v)}/></div>
<div className="card"><div className="sst">📐 Unidades de Medida</div><TagEditor items={c.units} onAdd={v=>al("units",v)} onRemove={v=>rl("units",v)}/></div>
<div className="card"><div className="sst">{I.chores} Cômodos da Casa</div><TagEditor items={c.rooms} onAdd={v=>al("rooms",v)} onRemove={v=>rl("rooms",v)}/></div>
<div className="card"><div className="sst">🔄 Frequências de Tarefas</div><TagEditor items={c.choreFreqs} onAdd={v=>al("choreFreqs",v)} onRemove={v=>rl("choreFreqs",v)}/></div>
<div className="card"><div className="sst">💳 Cartões / Formas de Pagamento</div><p style={{fontSize:12,color:"var(--text3)",marginBottom:8}}>Usados nas compras e finanças</p><TagEditor items={c.cards||[]} onAdd={v=>al("cards",v)} onRemove={v=>rl("cards",v)}/></div>
<div className="card"><div className="sst">📥 Categorias de Receita</div><p style={{fontSize:12,color:"var(--text3)",marginBottom:8}}>Salário, VR, freelance, extras...</p><TagEditor items={c.incomeCategories||[]} onAdd={v=>al("incomeCategories",v)} onRemove={v=>rl("incomeCategories",v)}/></div>
<div className="card"><div className="sst">⚖️ Categorias com Peso Variável</div><p style={{fontSize:12,color:"var(--text3)",marginBottom:8}}>Itens dessas categorias permitem registrar vários lotes com pesos e preços diferentes ao comprar (ex: 3 bandejas de morango)</p><TagEditor items={c.variableWeightCategories||[]} onAdd={v=>al("variableWeightCategories",v)} onRemove={v=>rl("variableWeightCategories",v)}/></div>
<div className="card"><div className="sst">🔁 Categorias de Hábitos</div><p style={{fontSize:12,color:"var(--text3)",marginBottom:8}}>Organize seus hábitos por área da vida</p><TagEditor items={c.habitCategories||[]} onAdd={v=>al("habitCategories",v)} onRemove={v=>rl("habitCategories",v)}/></div>
<div className="card"><div className="sst">📋 Listas de Tarefas</div><p style={{fontSize:12,color:"var(--text3)",marginBottom:8}}>Agrupe suas tarefas por projeto ou contexto</p><TagEditor items={c.todoLists||[]} onAdd={v=>al("todoLists",v)} onRemove={v=>rl("todoLists",v)}/></div>
<div className="card"><div className="sst">{I.meals} Dias do Cardápio</div><p style={{fontSize:12,color:"var(--text3)",marginBottom:8}}>Quais dias aparecem no planejador</p><TagEditor items={c.mealDays} onAdd={v=>al("mealDays",v)} onRemove={v=>rl("mealDays",v)}/></div>
<div className="card"><div className="sst">🍽 Tipos de Refeição</div><p style={{fontSize:12,color:"var(--text3)",marginBottom:8}}>Café, almoço, jantar... ou o que quiser</p><TagEditor items={c.mealTypes} onAdd={v=>al("mealTypes",v)} onRemove={v=>rl("mealTypes",v)}/></div></>}

{tab==="dados"&&<><PDFReport data={data} user={user}/>
<div className="card"><div className="sst">{I.download} Exportar & Importar</div><p style={{fontSize:13,color:"var(--text2)",marginBottom:16,lineHeight:1.6}}>Backup completo: configurações, itens, tarefas, gastos e cardápio.</p><div style={{display:"flex",gap:12,flexWrap:"wrap"}}><button className="btn bp" onClick={exp}>{I.download} Exportar (JSON)</button><button className="btn bg" onClick={imp}>{I.upload} Importar</button></div></div>
<div className="card"><div className="sst" style={{color:"var(--red)"}}>⚠ Zona de Perigo</div><p style={{fontSize:13,color:"var(--text3)",marginBottom:12}}>Resetar tudo para o padrão. Irreversível.</p><button className="btn bd" onClick={reset}>{I.trash} Resetar Tudo</button></div>
<div className="card"><div className="ct">Sobre</div><p style={{fontSize:13,color:"var(--text2)",lineHeight:1.7}}>Lar Centro — Hub completo de gestão doméstica. 100% customizável.</p><p style={{fontSize:12,color:"var(--text3)",marginTop:12}}>v3.0</p></div></>}
</div>);}

// ─── PDF REPORT GENERATOR ───
function PDFReport({data,user}){
const c=data.config;const fmt=(n)=>fmtCurrency(n,c.locale,c.currency);
const[month,setMonth]=useState(()=>new Date().toISOString().slice(0,7));
const[generating,setGenerating]=useState(false);
const fmtMonth=(m)=>{const[y,mo]=m.split("-");return new Date(Number(y),Number(mo)-1).toLocaleDateString(c.locale||"pt-BR",{month:"long",year:"numeric"});};
const generate=()=>{
setGenerating(true);
setTimeout(()=>{
const mExp=(data.expenses||[]).filter(e=>e.date&&e.date.startsWith(month));
const mInc=(data.incomes||[]).filter(i=>i.date&&i.date.startsWith(month));
const totalInc=mInc.reduce((a,i)=>a+i.amount,0);
const totalExp=mExp.reduce((a,e)=>a+e.amount,0);
const saldo=totalInc-totalExp;
const byCat={};mExp.forEach(e=>{byCat[e.category]=(byCat[e.category]||0)+e.amount;});
const byCard={};mExp.forEach(e=>{const k=e.card||"Sem cartão";byCard[k]=(byCard[k]||0)+e.amount;});
const fixedT=mExp.filter(e=>e.type==="fixo").reduce((a,e)=>a+e.amount,0);
const varT=mExp.filter(e=>e.type!=="fixo").reduce((a,e)=>a+e.amount,0);
const paidT=mExp.filter(e=>e.paid).reduce((a,e)=>a+e.amount,0);
const pendT=mExp.filter(e=>!e.paid).reduce((a,e)=>a+e.amount,0);
const trips=(data.shoppingTrips||[]).filter(t=>t.date&&t.date.startsWith(month));
const habits=data.habits||[];const logs=(data.habitLogs||[]).filter(l=>l.date&&l.date.startsWith(month));
const userName=user?.displayName||user?.email||"Usuário";
// Build HTML for PDF
const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Stockly — Relatório ${fmtMonth(month)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a2e;background:#fff;padding:40px;max-width:800px;margin:0 auto;font-size:14px;line-height:1.6}
.header{text-align:center;margin-bottom:40px;padding-bottom:24px;border-bottom:3px solid #F0A050}
.header h1{font-size:28px;color:#F0A050;margin-bottom:4px}
.header h2{font-size:18px;color:#333;font-weight:400;text-transform:capitalize}
.header p{font-size:12px;color:#888;margin-top:8px}
.section{margin-bottom:32px}
.section h3{font-size:16px;color:#F0A050;text-transform:uppercase;letter-spacing:2px;margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid #eee}
.grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px}
.stat{background:#f8f6f3;border-radius:10px;padding:16px;text-align:center}
.stat .label{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px}
.stat .value{font-size:24px;font-weight:700;margin-top:4px}
.stat .sub{font-size:11px;color:#888;margin-top:2px}
.green{color:#22c55e}.red{color:#ef4444}.blue{color:#3b82f6}
table{width:100%;border-collapse:collapse;margin-bottom:16px}
th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888;padding:8px 12px;border-bottom:2px solid #eee}
td{padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px}
tr:nth-child(even){background:#fafafa}
.tag{display:inline-block;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:600}
.tag-green{background:#dcfce7;color:#16a34a}.tag-red{background:#fef2f2;color:#dc2626}
.tag-blue{background:#dbeafe;color:#2563eb}.tag-gray{background:#f3f4f6;color:#6b7280}
.footer{text-align:center;margin-top:40px;padding-top:20px;border-top:1px solid #eee;font-size:11px;color:#aaa}
.bar{height:8px;background:#f0f0f0;border-radius:4px;margin-top:4px;overflow:hidden}
.bar-fill{height:100%;border-radius:4px}
.cat-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f5f5f5}
.cat-name{font-weight:500}.cat-val{font-weight:700}
@media print{body{padding:20px}@page{margin:15mm}}
</style></head><body>
<div class="header">
<h1>⚡ Stockly</h1>
<h2>${fmtMonth(month)}</h2>
<p>${c.houseName} — Relatório gerado por ${userName} em ${new Date().toLocaleDateString(c.locale||"pt-BR",{day:"numeric",month:"long",year:"numeric"})}</p>
</div>
<div class="section">
<h3>💰 Resumo Financeiro</h3>
<div class="grid">
<div class="stat"><div class="label">Receitas</div><div class="value green">${fmt(totalInc)}</div><div class="sub">${mInc.length} entrada${mInc.length!==1?"s":""}</div></div>
<div class="stat"><div class="label">Gastos</div><div class="value red">${fmt(totalExp)}</div><div class="sub">${mExp.length} gasto${mExp.length!==1?"s":""}</div></div>
<div class="stat"><div class="label">Saldo</div><div class="value ${saldo>=0?"green":"red"}">${saldo>=0?"+":""}${fmt(saldo)}</div><div class="sub">${totalInc>0?Math.round((totalExp/totalInc)*100):0}% comprometido</div></div>
</div>
<div class="grid">
<div class="stat"><div class="label">Fixos</div><div class="value">${fmt(fixedT)}</div></div>
<div class="stat"><div class="label">Variáveis</div><div class="value">${fmt(varT)}</div></div>
<div class="stat"><div class="label">Pendente</div><div class="value" style="color:#f59e0b">${fmt(pendT)}</div></div>
</div>
</div>
${Object.keys(byCat).length>0?`<div class="section">
<h3>📊 Gastos por Categoria</h3>
${Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([cat,val])=>`<div class="cat-row"><span class="cat-name">${cat}</span><span class="cat-val">${fmt(val)} <span style="color:#aaa;font-weight:400;font-size:12px">(${totalExp>0?Math.round((val/totalExp)*100):0}%)</span></span></div>`).join("")}
</div>`:""}
${Object.keys(byCard).length>0?`<div class="section">
<h3>💳 Por Forma de Pagamento</h3>
${Object.entries(byCard).sort((a,b)=>b[1]-a[1]).map(([card,val])=>`<div class="cat-row"><span class="cat-name">${card}</span><span class="cat-val">${fmt(val)}</span></div>`).join("")}
</div>`:""}
${mInc.length>0?`<div class="section">
<h3>📥 Receitas</h3>
<table><thead><tr><th>Descrição</th><th>Categoria</th><th>Data</th><th style="text-align:right">Valor</th></tr></thead><tbody>
${mInc.sort((a,b)=>a.date.localeCompare(b.date)).map(i=>`<tr><td>${i.desc}</td><td><span class="tag tag-green">${i.category}</span></td><td>${new Date(i.date+"T12:00").toLocaleDateString(c.locale||"pt-BR")}</td><td style="text-align:right;font-weight:600;color:#22c55e">${fmt(i.amount)}</td></tr>`).join("")}
</tbody></table></div>`:""}
${mExp.length>0?`<div class="section">
<h3>📤 Gastos</h3>
<table><thead><tr><th>Descrição</th><th>Tipo</th><th>Cartão</th><th>Cat.</th><th>Data</th><th style="text-align:right">Valor</th></tr></thead><tbody>
${mExp.sort((a,b)=>a.date.localeCompare(b.date)).map(e=>`<tr><td>${e.desc}</td><td><span class="tag ${e.type==="fixo"?"tag-blue":"tag-gray"}">${e.type==="fixo"?"Fixo":"Var."}</span></td><td>${e.card||"—"}</td><td><span class="tag tag-gray">${e.category}</span></td><td>${new Date(e.date+"T12:00").toLocaleDateString(c.locale||"pt-BR")}</td><td style="text-align:right;font-weight:600">${fmt(e.amount)}</td></tr>`).join("")}
</tbody></table></div>`:""}
${trips.length>0?`<div class="section">
<h3>🛒 Compras do Mês</h3>
${trips.map(t=>`<div style="margin-bottom:12px;padding:12px;background:#f8f6f3;border-radius:8px">
<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>${new Date(t.date+"T12:00").toLocaleDateString(c.locale||"pt-BR",{day:"numeric",month:"long"})}</span><strong>${fmt(t.total)}</strong></div>
<div style="font-size:12px;color:#666">${t.items.map(i=>i.name).join(", ")}</div>
</div>`).join("")}
</div>`:""}
${habits.length>0?`<div class="section">
<h3>🔁 Hábitos do Mês</h3>
<table><thead><tr><th>Hábito</th><th style="text-align:center">Dias Feitos</th><th style="text-align:center">Taxa</th></tr></thead><tbody>
${habits.map(h=>{const daysInMonth=new Date(Number(month.split("-")[0]),Number(month.split("-")[1]),0).getDate();const done=logs.filter(l=>l.habitId===h.id).length;const pct=Math.round((done/daysInMonth)*100);return`<tr><td>${h.icon} ${h.name}</td><td style="text-align:center">${done}/${daysInMonth}</td><td style="text-align:center"><span class="tag ${pct>=80?"tag-green":pct>=50?"tag-blue":"tag-red"}">${pct}%</span></td></tr>`;}).join("")}
</tbody></table></div>`:""}
<div class="footer">Gerado pelo Stockly — ${c.houseName} — ${new Date().toLocaleDateString(c.locale||"pt-BR")}</div>
</body></html>`;
// Open in new window for printing/saving as PDF
const w=window.open("","_blank");
if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);}
setGenerating(false);
},300);};
const allMonths=()=>{const months=new Set();(data.expenses||[]).forEach(e=>{if(e.date)months.add(e.date.slice(0,7));});(data.incomes||[]).forEach(i=>{if(i.date)months.add(i.date.slice(0,7));});months.add(new Date().toISOString().slice(0,7));return[...months].sort().reverse();};
return(<div className="card"><div className="sst">📄 Relatório Mensal (PDF)</div>
<p style={{fontSize:13,color:"var(--text2)",marginBottom:16,lineHeight:1.6}}>Gere um relatório completo do mês com finanças, compras, hábitos e mais. Abre em uma nova aba pronta para salvar como PDF ou imprimir.</p>
<div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
<select value={month} onChange={e=>setMonth(e.target.value)} style={{flex:1,minWidth:160,textTransform:"capitalize"}}>{allMonths().map(m=><option key={m} value={m}>{fmtMonth(m)}</option>)}</select>
<button className="btn bp" onClick={generate} disabled={generating} style={{opacity:generating?.6:1}}>{generating?"Gerando...":"📄 Gerar Relatório"}</button>
</div></div>);
}

// ─── RECEIPT SCANNER ───
function ReceiptScanner({data,setData,toast,c}){
const[scanning,setScanning]=useState(false);
const[scanResult,setScanResult]=useState(null);
const[items,setItems]=useState([]);
const[processing,setProcessing]=useState(false);
const fileRef=useRef(null);
const fmt=(n)=>fmtCurrency(n,c.locale,c.currency);
const handleFile=(e)=>{
const file=e.target.files?.[0];if(!file)return;
setProcessing(true);setScanResult(null);setItems([]);
const reader=new FileReader();
reader.onload=async(ev)=>{
try{
// Load Tesseract.js from CDN
if(!window.Tesseract){
const script=document.createElement("script");
script.src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
document.head.appendChild(script);
await new Promise((res,rej)=>{script.onload=res;script.onerror=rej;setTimeout(rej,15000);});
}
const{data:{text}}=await window.Tesseract.recognize(ev.target.result,"por",{logger:m=>{}});
setScanResult(text);
// Parse items from text
const lines=text.split("\n").map(l=>l.trim()).filter(l=>l.length>3);
const parsed=[];
for(const line of lines){
// Try to find price pattern: number with comma/dot at end
const priceMatch=line.match(/(\d+[.,]\d{2})\s*$/);
if(priceMatch){
const price=Number(priceMatch[1].replace(",","."));
const name=line.slice(0,line.lastIndexOf(priceMatch[1])).replace(/[\d.,]+\s*(un|kg|cx|pc|lt|ml|g)\b/gi,"").replace(/\s+/g," ").trim();
if(name.length>1&&price>0&&price<10000){
parsed.push({id:Date.now()+Math.random(),name:name.slice(0,50),price,qty:1,unit:"un",category:"Mercado",include:true});
}}}
setItems(parsed);
setProcessing(false);setScanning(true);
}catch(err){
console.error("OCR error:",err);
toast("Erro ao processar imagem. Tente outra foto.");
setProcessing(false);
}};
reader.readAsDataURL(file);
};
const updateItem=(id,field,val)=>{setItems(its=>its.map(i=>i.id===id?{...i,[field]:val}:i));};
const toggleItem=(id)=>{setItems(its=>its.map(i=>i.id===id?{...i,include:!i.include}:i));};
const addManual=()=>{setItems(its=>[...its,{id:Date.now(),name:"",price:0,qty:1,unit:"un",category:"Mercado",include:true}]);};
const removeItem=(id)=>{setItems(its=>its.filter(i=>i.id!==id));};
const saveItems=()=>{
const toSave=items.filter(i=>i.include&&i.name.trim());
if(toSave.length===0){toast("Nenhum item para salvar");return;}
setData(d=>{
const newGrocery=[...d.grocery,...toSave.map(i=>({id:Date.now()+Math.random(),name:i.name,qty:Number(i.qty)||1,unit:i.unit||"un",checked:true,category:i.category||"Mercado",price:Number(i.price)||0,unitPrice:Number(i.price)||0}))];
const newPH=[...(d.priceHistory||[]),...toSave.filter(i=>i.price>0).map(i=>({id:Date.now()+Math.random(),name:i.name,unitPrice:i.price,totalPrice:i.price,qty:i.qty||1,unit:i.unit||"un",date:new Date().toISOString().slice(0,10)}))];
return{...d,grocery:newGrocery,priceHistory:newPH};
});
toast(`${toSave.length} ite${toSave.length>1?"ns":"m"} adicionado${toSave.length>1?"s":""}`);
setScanning(false);setItems([]);setScanResult(null);
};
const total=items.filter(i=>i.include).reduce((a,i)=>a+(Number(i.price)||0),0);
return(<>
<div className="card">
<div className="ct">📷 Scanner de Nota Fiscal</div>
<p style={{fontSize:13,color:"var(--text2)",marginBottom:16,lineHeight:1.6}}>Tire uma foto da nota fiscal e o app extrai os itens e preços automaticamente. Revise antes de salvar.</p>
<div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
<button className="btn bp" onClick={()=>fileRef.current?.click()} disabled={processing}>{processing?"⏳ Processando...":"📷 Escanear Nota"}</button>
<input ref={fileRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={handleFile}/>
</div>
{processing&&<div style={{marginTop:16,textAlign:"center"}}><div style={{fontSize:13,color:"var(--text3)",marginBottom:8}}>Lendo nota fiscal...</div><div className="splash-dots" style={{justifyContent:"center",display:"flex",gap:6}}><span style={{width:6,height:6,borderRadius:"50%",background:"var(--accent)",animation:"dotBounce 1.2s ease-in-out infinite"}}/><span style={{width:6,height:6,borderRadius:"50%",background:"var(--accent)",animation:"dotBounce 1.2s ease-in-out infinite .15s"}}/><span style={{width:6,height:6,borderRadius:"50%",background:"var(--accent)",animation:"dotBounce 1.2s ease-in-out infinite .3s"}}/></div></div>}
</div>
{scanning&&<Modal title={`📷 Itens Encontrados (${items.filter(i=>i.include).length})`} onClose={()=>{setScanning(false);setItems([]);}}>
{items.length===0&&<div style={{textAlign:"center",padding:20,color:"var(--text3)"}}>Nenhum item identificado. Tente outra foto ou adicione manualmente.</div>}
<div style={{maxHeight:"55vh",overflowY:"auto"}}>
{items.map((item,idx)=>(<div key={item.id} style={{display:"flex",gap:8,alignItems:"center",padding:"8px 0",borderBottom:"1px solid var(--border)",opacity:item.include?1:.4}}>
<div style={{width:22,height:22,borderRadius:5,border:`2px solid ${item.include?"var(--green)":"var(--border2)"}`,background:item.include?"var(--green)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}} onClick={()=>toggleItem(item.id)}>{item.include&&<Icon d={<polyline points="20 6 9 17 4 12"/>} size={12} color="#fff"/>}</div>
<input value={item.name} onChange={e=>updateItem(item.id,"name",e.target.value)} placeholder="Nome do item" style={{flex:2,padding:"6px 8px",fontSize:13}}/>
<MoneyInput value={item.price||0} onChange={v=>updateItem(item.id,"price",v)} placeholder="Preço" style={{width:80,padding:"6px 8px",fontSize:13}}/>
<button style={{background:"none",border:"none",color:"var(--text3)",cursor:"pointer",padding:4,flexShrink:0}} onClick={()=>removeItem(item.id)}><Icon d={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} size={14}/></button>
</div>))}
</div>
<button className="btn bg bs" onClick={addManual} style={{marginTop:8}}>+ Adicionar item manualmente</button>
{items.filter(i=>i.include).length>0&&<div style={{marginTop:12,padding:"12px 16px",background:"var(--accent-glow)",borderRadius:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:14,fontWeight:600}}>Total: {fmt(total)}</span><span style={{fontSize:12,color:"var(--text3)"}}>{items.filter(i=>i.include).length} ite{items.filter(i=>i.include).length>1?"ns":"m"}</span></div>}
{scanResult&&<details style={{marginTop:12}}><summary style={{fontSize:11,color:"var(--text3)",cursor:"pointer"}}>Ver texto bruto detectado</summary><pre style={{fontSize:10,color:"var(--text3)",marginTop:8,padding:8,background:"var(--bg4)",borderRadius:6,maxHeight:120,overflow:"auto",whiteSpace:"pre-wrap"}}>{scanResult}</pre></details>}
<div className="ma"><button className="btn bg" onClick={()=>{setScanning(false);setItems([]);}}>Cancelar</button><button className="btn bp" onClick={saveItems}>Salvar {items.filter(i=>i.include).length} ite{items.filter(i=>i.include).length>1?"ns":"m"}</button></div>
</Modal>}
</>);
}

// ─── WELCOME TOUR ───
const TOUR_STEPS=[
{icon:"👋",title:"Bem-vindo ao Stockly!",text:"Seu novo hub de gestão doméstica. Vou te mostrar rapidinho como tudo funciona. Leva menos de 1 minuto!"},
{icon:"📦",title:"Despensa",text:"Aqui você cadastra tudo que tem em casa — comida, produtos de limpeza, higiene... Coloque o nome, quantidade, onde está guardado (geladeira, armário...) e a validade. O app avisa quando algo está perto de vencer!"},
{icon:"🛒",title:"Lista de Compras",text:"Monte sua lista de compras aqui. Quando estiver no mercado, marque os itens como comprados — o app pergunta o preço e calcula o total. No final, clique em 'Finalizar Compra' e tudo vai automaticamente para a Despensa e as Finanças."},
{icon:"✅",title:"Tarefas",text:"Organize a limpeza e manutenção da casa. Crie tarefas, defina quem é responsável, a frequência (diário, semanal...) e marque quando foi feita. O app mostra o que está atrasado."},
{icon:"🍽️",title:"Cardápio",text:"Planeje as refeições da semana. Clique no dia e na refeição para definir o que vai cozinhar. Você pode personalizar os dias e tipos de refeição (café, almoço, lanche, jantar...)."},
{icon:"💰",title:"Finanças",text:"Painel financeiro completo! Registre receitas (salário, VR, extras) e gastos (fixos e variáveis). Veja o saldo mensal, orçamento por categoria, totais por cartão e navegue mês a mês. Compras do mercado aparecem aqui automaticamente."},
{icon:"🔁",title:"Rotina",text:"Seu centro de organização pessoal! Crie hábitos com streak (🔥), tarefas com prioridade e subtarefas, e eventos na agenda. A aba 'Hoje' mostra tudo de uma vez com anel de progresso. Funciona no modo pessoal e compartilhado."},
{icon:"📈",title:"Preços",text:"Acompanhe a evolução dos preços dos produtos ao longo do tempo. O app registra automaticamente quando você compra algo e mostra gráficos de variação — sabe aquele arroz que subiu? Aqui você vê!"},
{icon:"⚙️",title:"Tudo é customizável!",text:"Vá em Configurações para personalizar: nome da casa, tema, cores, categorias, cômodos, cartões de pagamento, tipos de refeição... Tudo pode ser mudado do seu jeito."},
{icon:"👨‍👩‍👧‍👦",title:"Compartilhe com a família",text:"Em Configurações → Casa, você encontra o código da sua casa. Mande para sua família — cada pessoa faz login com a própria conta e digita o código. Todos compartilham os mesmos dados!"},
{icon:"🚀",title:"Pronto para começar!",text:"É isso! Comece adicionando itens à Despensa ou montando sua lista de compras. Se precisar de ajuda, acesse a seção 'Ajuda' no menu lateral a qualquer momento."},
];

function WelcomeTour({onFinish}){
const[step,setStep]=useState(0);
const s=TOUR_STEPS[step];const total=TOUR_STEPS.length;const pct=((step+1)/total)*100;
return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:16,animation:"fi .2s ease"}}>
<div style={{background:"#141820",border:"1px solid #2A3040",borderRadius:20,padding:0,width:"100%",maxWidth:440,overflow:"hidden",boxShadow:"0 8px 40px rgba(0,0,0,.5)",animation:"su .3s ease"}}>
{/* Progress bar */}
<div style={{height:4,background:"#1A1F2B"}}><div style={{height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,#F0A050,#FFD700)",borderRadius:4,transition:"width .3s ease"}}/></div>
<div style={{padding:"32px 32px 28px",textAlign:"center"}}>
{/* Icon */}
<div style={{fontSize:48,marginBottom:16,lineHeight:1}}>{s.icon}</div>
{/* Title */}
<div style={{fontSize:22,fontWeight:800,color:"#E8EAF0",marginBottom:12,fontFamily:"'DM Sans',sans-serif"}}>{s.title}</div>
{/* Text */}
<div style={{fontSize:14,color:"#9CA3B8",lineHeight:1.7,marginBottom:24,maxWidth:360,margin:"0 auto 24px"}}>{s.text}</div>
{/* Step indicator */}
<div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:20}}>
{TOUR_STEPS.map((_,i)=>(<div key={i} style={{width:i===step?24:8,height:8,borderRadius:4,background:i===step?"#F0A050":i<step?"#F0A05066":"#2A3040",transition:"all .3s",cursor:"pointer"}} onClick={()=>setStep(i)}/>))}
</div>
{/* Buttons */}
<div style={{display:"flex",gap:10,justifyContent:"center"}}>
{step>0&&<button onClick={()=>setStep(step-1)} style={{padding:"10px 20px",borderRadius:8,fontSize:14,fontWeight:600,border:"1px solid #2A3040",background:"transparent",color:"#9CA3B8",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Anterior</button>}
{step<total-1?<button onClick={()=>setStep(step+1)} style={{padding:"10px 28px",borderRadius:8,fontSize:14,fontWeight:700,border:"none",background:"linear-gradient(135deg,#F0A050,#E88D3A)",color:"#fff",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",boxShadow:"0 2px 12px rgba(240,160,80,.3)"}}>Próximo</button>:
<button onClick={onFinish} style={{padding:"10px 28px",borderRadius:8,fontSize:14,fontWeight:700,border:"none",background:"linear-gradient(135deg,#4ADE80,#22C55E)",color:"#fff",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",boxShadow:"0 2px 12px rgba(74,222,128,.3)"}}>Começar! 🎉</button>}
</div>
{step<total-1&&<button onClick={onFinish} style={{marginTop:12,background:"none",border:"none",color:"#6B7390",fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Pular tour</button>}
</div></div></div>);
}

// ─── HELP PAGE ───
function HelpPage({goTo}){
const sections=[
{id:"painel",icon:"🏠",title:"Painel",color:"#F0A050",content:[
"O Painel é sua visão geral. Mostra tudo de uma vez: quantos itens tem na despensa, o que está vencendo, tarefas pendentes, gastos do mês e próximas refeições.",
"Os cards coloridos no topo mostram os números mais importantes. Se algo precisa de atenção (itens vencendo, tarefas atrasadas), aparece em vermelho ou amarelo.",
"Use o Painel para ter uma noção rápida de como está a organização da sua casa.",
]},
{id:"despensa",icon:"📦",title:"Despensa",color:"#60A5FA",content:[
"A Despensa é o inventário de tudo que você tem em casa. Comida, limpeza, higiene — tudo entra aqui.",
"Para adicionar um item: clique no botão '+ Adicionar', preencha o nome, quantidade, unidade (kg, un, pacote...), onde está guardado (geladeira, despensa, freezer...) e a data de validade.",
"Use os filtros de Local e Categoria para encontrar itens rápido. A busca funciona por nome.",
"Quando um item está acabando, clique no ícone de sacola para mandá-lo direto para a Lista de Compras.",
"Itens perto de vencer aparecem com status amarelo/vermelho e são destacados no Painel.",
]},
{id:"compras",icon:"🛒",title:"Lista de Compras",color:"#4ADE80",content:[
"Monte sua lista antes de ir ao mercado. Clique em '+ Adicionar' e coloque o nome, quantidade e categoria.",
"No mercado, toque no item para marcá-lo como comprado. O app pergunta o preço unitário — é opcional, mas ajuda a acompanhar os preços ao longo do tempo.",
"O preço unitário é multiplicado pela quantidade automaticamente. O total da compra aparece no topo.",
"Quando terminar as compras, clique em 'Finalizar Compra'. Vai pedir a forma de pagamento (Pix, cartão...) e se já foi pago. Depois disso, os itens vão para a Despensa e o total aparece nas Finanças.",
"Na parte de baixo tem o histórico das suas últimas idas ao mercado, com data, total e itens.",
]},
{id:"tarefas",icon:"✅",title:"Tarefas da Casa",color:"#FBBF24",content:[
"Organize quem faz o quê na casa. Cada tarefa tem: nome, cômodo, responsável, frequência (diário, semanal...) e nível de esforço.",
"O app calcula automaticamente se uma tarefa está em dia, pendente ou atrasada, baseado na frequência e na última vez que foi feita.",
"Para marcar como feita, clique no botão 'Feito'. A data atualiza e o status volta para 'Em dia'.",
"Se morarem mais pessoas na casa, o app mostra quantas tarefas cada um tem atribuídas.",
]},
{id:"cardapio",icon:"🍽️",title:"Cardápio Semanal",color:"#A78BFA",content:[
"Planeje o que vai cozinhar na semana. Cada dia mostra os tipos de refeição (café, almoço, lanche, jantar).",
"Clique em qualquer slot para adicionar ou editar a receita/prato do dia.",
"Clique em 'Editar dias e refeições' para personalizar: adicionar novos dias (ex: 'Feriado'), novos tipos de refeição (ex: 'Brunch', 'Ceia'), renomear e reordenar.",
"As próximas refeições também aparecem no Painel para consulta rápida.",
]},
{id:"financas",icon:"💰",title:"Finanças",color:"#F87171",content:[
"A aba Finanças é um painel financeiro completo, inspirado em planilhas de controle pessoal.",
"Use o seletor de mês no topo para navegar entre os meses. Todos os dados (receitas, gastos, saldos) são filtrados pelo mês selecionado.",
"Receitas/Entradas: registre salário, VR, flash, freelances e extras. Marque como recorrente para identificar receitas fixas.",
"Gastos: cada gasto tem um tipo (fixo ou variável), categoria, cartão de pagamento e status pago/pendente. Use os filtros para ver só fixos, variáveis, pagos ou pendentes.",
"Saldo Mensal: o card de saldo mostra Entradas - Gastos com indicador visual. Verde = sobrando, vermelho = no negativo.",
"Orçamento por Categoria: defina um valor planejado para cada categoria e acompanhe a barra de progresso do real vs planejado.",
"Totais por Cartão: veja quanto saiu de cada forma de pagamento (Pix, crédito, débito...) no mês.",
"Compras finalizadas na Lista de Compras aparecem aqui automaticamente como gasto variável!",
]},
{id:"rotina",icon:"🔁",title:"Rotina",color:"#22D3EE",content:[
"A aba Rotina é o seu centro de organização pessoal. Ela combina três ferramentas em uma: Hábitos, Tarefas e Agenda.",
"A aba 'Hoje' mostra um resumo visual do seu dia: anel de progresso com % de hábitos feitos, eventos agendados e tarefas pendentes. Tudo de uma vez.",
"Hábitos: crie hábitos como 'Beber 2L de água', 'Ler 30min', 'Exercício'. Cada hábito tem ícone/emoji, categoria (Saúde, Produtividade...), período do dia (Manhã, Tarde, Noite) e frequência (diário, dias específicos, semanal).",
"Tipos de hábito: Sim/Não (só marcar), Quantidade (ex: 8 copos de água) ou Tempo (ex: 30 minutos). Para quantidade e tempo, defina uma meta diária.",
"Streak: cada hábito mostra quantos dias seguidos você completou (🔥). A aba Hábitos mostra um heatmap semanal com todos os seus hábitos e seus streaks.",
"Tarefas: crie to-dos com nome, descrição, data de vencimento, prioridade (Alta, Média, Baixa) e lista (Pessoal, Trabalho, Casa). Adicione subtarefas para quebrar em passos menores.",
"No modo compartilhado, você pode atribuir tarefas a outros membros da casa. Todos veem quem é responsável pelo quê.",
"As tarefas são organizadas em: 'Hoje e Atrasadas', 'Próximas' e 'Concluídas'. Marque como feita tocando no checkbox.",
"Agenda: adicione eventos com título, data, horário de início/fim, cor e notas. Marque como 'Dia inteiro' para eventos sem horário específico.",
"A aba Agenda mostra a semana inteira com os eventos de cada dia. Toque em qualquer evento para editar ou remover.",
"Todas as categorias de hábitos e listas de tarefas são customizáveis em Configurações → Listas.",
]},
{id:"precos",icon:"📈",title:"Preços",color:"#34D399",content:[
"Aqui você vê a evolução dos preços de cada produto ao longo do tempo.",
"Sempre que você registra um preço na Lista de Compras, ele aparece aqui automaticamente. Também pode registrar preços manualmente.",
"Cada produto mostra: preço atual, variação percentual (vermelho = subiu, verde = baixou), mini-gráfico e histórico completo.",
"Os cards no topo destacam o produto com maior alta e maior queda de preço.",
"Clique em qualquer registro para editar o preço ou excluir.",
]},
{id:"config",icon:"⚙️",title:"Configurações",color:"#818CF8",content:[
"Tudo no Stockly é customizável. As configurações são divididas em abas:",
"Geral — nome da casa, membros, moeda (Real, Dólar...), formato de data e dias de antecedência para alertas de validade.",
"Casa — código da casa para compartilhar com a família, lista de membros e opção de sair.",
"Aparência — 6 temas visuais e 12+ cores de destaque. Escolha a combinação que mais gosta.",
"Categorias — adicione ou remova categorias da despensa e de gastos.",
"Listas — customize locais de armazenamento, unidades de medida, cômodos, frequências de tarefas, cartões de pagamento, dias do cardápio e tipos de refeição.",
"Dados — exporte backup completo em JSON ou importe de um arquivo. Opção de resetar tudo.",
]},
];
return(<div><div className="ph"><div className="pt">Ajuda</div><div className="ps">Tudo que você precisa saber sobre o Stockly</div></div>
{/* Quick start */}
<div className="card" style={{background:"var(--accent-glow)",borderColor:"var(--accent)"}}>
<div className="ct" style={{color:"var(--accent)",fontSize:18}}>🚀 Começando do zero?</div>
<div style={{fontSize:14,color:"var(--text2)",lineHeight:1.8}}>
<strong style={{color:"var(--text)"}}>1.</strong> Vá na <span style={{color:"var(--accent)",cursor:"pointer",textDecoration:"underline"}} onClick={()=>goTo("pantry")}>Despensa</span> e cadastre o que tem em casa<br/>
<strong style={{color:"var(--text)"}}>2.</strong> Monte sua <span style={{color:"var(--accent)",cursor:"pointer",textDecoration:"underline"}} onClick={()=>goTo("grocery")}>Lista de Compras</span> com o que falta<br/>
<strong style={{color:"var(--text)"}}>3.</strong> No mercado, marque os itens e registre os preços<br/>
<strong style={{color:"var(--text)"}}>4.</strong> Clique em "Finalizar Compra" — tudo vai pra Despensa e Finanças<br/>
<strong style={{color:"var(--text)"}}>5.</strong> Crie <span style={{color:"var(--accent)",cursor:"pointer",textDecoration:"underline"}} onClick={()=>goTo("chores")}>Tarefas</span> e distribua entre a família<br/>
<strong style={{color:"var(--text)"}}>6.</strong> Planeje o <span style={{color:"var(--accent)",cursor:"pointer",textDecoration:"underline"}} onClick={()=>goTo("meals")}>Cardápio</span> da semana<br/>
<strong style={{color:"var(--text)"}}>7.</strong> Monte sua <span style={{color:"var(--accent)",cursor:"pointer",textDecoration:"underline"}} onClick={()=>goTo("routine")}>Rotina</span> — hábitos, tarefas pessoais e agenda<br/>
<strong style={{color:"var(--text)"}}>8.</strong> Personalize tudo nas <span style={{color:"var(--accent)",cursor:"pointer",textDecoration:"underline"}} onClick={()=>goTo("settings")}>Configurações</span>
</div>
</div>
{/* FAQ */}
<div className="card">
<div className="ct">❓ Perguntas Frequentes</div>
<div style={{display:"flex",flexDirection:"column",gap:16}}>
{[
{q:"Como compartilho com minha família?",a:"Vá em Configurações → Casa. Lá tem o código da casa. Mande para a pessoa — ela faz login, clica em 'Entrar com Código' e digita. Pronto, vocês compartilham tudo!"},
{q:"Posso mudar o visual do app?",a:"Sim! Configurações → Aparência. Tem 6 temas e várias cores de destaque pra escolher."},
{q:"Como instalo no celular?",a:"No Android: o app oferece instalar automaticamente, ou vá nos 3 pontinhos do navegador → 'Instalar app'. No iPhone: Safari → botão compartilhar → 'Adicionar à Tela de Início'."},
{q:"Meus dados estão seguros?",a:"Sim! Os dados ficam no Firebase (nuvem do Google). Cada casa tem seus dados separados e protegidos por login."},
{q:"Posso usar em mais de uma casa?",a:"Sim! Vá em Configurações → Casa → 'Sair desta casa'. Depois entre com outro código ou crie uma nova."},
].map((faq,i)=>(<div key={i}><div style={{fontSize:14,fontWeight:600,color:"var(--text)",marginBottom:4}}>{faq.q}</div><div style={{fontSize:13,color:"var(--text2)",lineHeight:1.6}}>{faq.a}</div></div>))}
</div>
</div>
{/* Detailed sections */}
<div style={{fontSize:18,fontWeight:700,color:"var(--text)",marginBottom:16,marginTop:8}}>📖 Guia por seção</div>
{sections.map(sec=>(<div className="card" key={sec.id}>
<div className="ct" style={{cursor:"pointer"}} onClick={()=>goTo(sec.id==="config"?"settings":sec.id==="financas"?"budget":sec.id==="compras"?"grocery":sec.id==="despensa"?"pantry":sec.id==="cardapio"?"meals":sec.id==="tarefas"?"chores":sec.id==="rotina"?"routine":sec.id)}>
<span style={{fontSize:20}}>{sec.icon}</span>
<span style={{color:sec.color}}>{sec.title}</span>
<span style={{marginLeft:"auto",fontSize:12,color:"var(--accent)"}}>Abrir →</span>
</div>
<div style={{display:"flex",flexDirection:"column",gap:10}}>
{sec.content.map((p,i)=>(<div key={i} style={{fontSize:13,color:"var(--text2)",lineHeight:1.7,paddingLeft:12,borderLeft:`2px solid ${sec.color}33`}}>{p}</div>))}
</div>
</div>))}
</div>);}

// ─── PWA Install Hook (shared between banner and sidebar) ───
function useInstallPrompt(){
const[prompt,setPrompt]=useState(null);const[installed,setInstalled]=useState(false);const[isIOS,setIsIOS]=useState(false);
useEffect(()=>{
if(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches){setInstalled(true);return;}
if(window.navigator.standalone){setInstalled(true);return;}
setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
const h=(e)=>{e.preventDefault();setPrompt(e);};
window.addEventListener("beforeinstallprompt",h);
window.addEventListener("appinstalled",()=>setInstalled(true));
return()=>window.removeEventListener("beforeinstallprompt",h);
},[]);
const doInstall=async()=>{if(prompt){prompt.prompt();const r=await prompt.userChoice;if(r.outcome==="accepted"){setInstalled(true);setPrompt(null);}}};
return{prompt,installed,isIOS,doInstall};
}

// ─── PWA Install Banner (bottom popup) ───
function InstallBanner({installHook}){
const{prompt,installed,isIOS,doInstall}=installHook;
const[show,setShow]=useState(false);const[dismissed,setDismissed]=useState(()=>{try{return localStorage.getItem("stockly-install-dismissed")==="1";}catch{return false;}});
useEffect(()=>{if(installed||dismissed)return;if(prompt){setShow(true);return;}if(isIOS){setTimeout(()=>setShow(true),2000);}},[prompt,installed,dismissed,isIOS]);
const dismiss=()=>{setShow(false);setDismissed(true);try{localStorage.setItem("stockly-install-dismissed","1");}catch{}};
if(!show||installed)return null;
return(<div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:250,padding:16,animation:"su .3s ease"}}>
<div style={{background:"linear-gradient(135deg,#1A1F2B,#141820)",border:"1px solid #2A3040",borderRadius:16,padding:20,maxWidth:480,margin:"0 auto",boxShadow:"0 -4px 32px rgba(0,0,0,.5)",display:"flex",alignItems:"center",gap:16}}>
<svg width="44" height="44" viewBox="0 0 64 64" fill="none" style={{flexShrink:0}}><path d="M20 4L36 4L20 32L28 32L12 60L20 60L4 32L12 32L20 4Z" fill="#F0A050"/><path d="M32 4L48 4L32 32L40 32L24 60L32 60L16 32L24 32L32 4Z" fill="#F0A050" opacity="0.5"/></svg>
<div style={{flex:1}}><div style={{fontSize:15,fontWeight:700,color:"#E8EAF0",marginBottom:4}}>Instalar Stockly</div><div style={{fontSize:12,color:"#9CA3B8",lineHeight:1.4}}>{isIOS?"Toque em compartilhar ↑ e \"Adicionar à Tela de Início\"":"Instale como app no seu celular!"}</div></div>
<div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
{!isIOS&&prompt&&<button onClick={()=>{doInstall();setShow(false);}} style={{padding:"8px 16px",borderRadius:8,fontSize:13,fontWeight:700,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#F0A050,#E88D3A)",color:"#fff",fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"}}>Instalar</button>}
<button onClick={dismiss} style={{padding:"6px 12px",borderRadius:6,fontSize:11,fontWeight:500,border:"1px solid #2A3040",cursor:"pointer",background:"transparent",color:"#6B7390",fontFamily:"'DM Sans',sans-serif"}}>Agora não</button>
</div></div></div>);
}

// ─── Sidebar Install Button (always visible until installed) ───
function SidebarInstallBtn({installHook}){
const{prompt,installed,isIOS,doInstall}=installHook;
const[showTip,setShowTip]=useState(false);
if(installed)return null;
const handleClick=()=>{if(prompt){doInstall();}else{setShowTip(true);setTimeout(()=>setShowTip(false),5000);}};
return(<div style={{padding:"0 12px 8px",position:"relative"}}>
<button onClick={handleClick} style={{width:"100%",padding:"10px 14px",borderRadius:10,border:"1px dashed var(--accent)",background:"var(--accent-glow)",color:"var(--accent)",fontSize:13,fontWeight:600,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all .2s"}}>
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
Baixar App
</button>
{showTip&&<div style={{position:"absolute",bottom:"100%",left:12,right:12,marginBottom:8,padding:"10px 14px",background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:10,fontSize:12,color:"var(--text2)",lineHeight:1.5,boxShadow:"var(--shadow)",animation:"su .2s ease",zIndex:10}}>
{isIOS?"No Safari, toque no botão de compartilhar ↑ e depois \"Adicionar à Tela de Início\"":"Clique nos 3 pontinhos ⋮ do navegador e selecione \"Instalar app\" ou \"Adicionar à tela inicial\""}
</div>}
</div>);
}

// ─── MAIN APP ───
export default function App({ user, logout, saveHouseData, loadHouseData, savePersonalData, loadPersonalData, houseCode, houseInfo, leaveHouse, refreshHouseInfo, saveUserPrefs, loadUserPrefs }){
const uid=user?.uid||"anon";
const installHook=useInstallPrompt();
const[showTour,setShowTour]=useState(()=>{try{return!localStorage.getItem(`stockly-tour-${uid}`);}catch{return true;}});
const[userPrefs,setUserPrefsRaw]=useState(()=>{try{const p=localStorage.getItem(`stockly-prefs-${uid}`);return p?JSON.parse(p):{};}catch{return{};}});
const mode=userPrefs.mode||"shared"; // "shared" or "personal"
const[data,setDataRaw]=useState(()=>{const l=load(uid);const base=l?{...DEFAULT_DATA,...l,config:{...DEFAULT_CONFIG,...(l.config||{})}}:DEFAULT_DATA;return migrateData(base);});
const[page,setPage]=useState("dashboard");const[so,setSo]=useState(false);const[tm,setTm]=useState("");

// Load data from Firebase based on mode
useEffect(()=>{
const loader=mode==="personal"?loadPersonalData:loadHouseData;
if(user&&loader){loader().then(cd=>{if(cd){const migrated=migrateData({...DEFAULT_DATA,...cd,config:{...DEFAULT_CONFIG,...(cd.config||{})}});setDataRaw(migrated);save(migrated,uid);}else{setDataRaw(DEFAULT_DATA);save(DEFAULT_DATA,uid);}});}
},[user,mode]);

// Load individual prefs from Firebase
useEffect(()=>{if(user&&loadUserPrefs){loadUserPrefs().then(p=>{if(p){setUserPrefsRaw(p);try{localStorage.setItem(`stockly-prefs-${uid}`,JSON.stringify(p));}catch{}}});}},[user]);

// Reset tour state when user changes
useEffect(()=>{try{setShowTour(!localStorage.getItem(`stockly-tour-${uid}`));}catch{}},[uid]);

const undoRef=useRef(null);const toastTimer=useRef(null);

const saveFn=mode==="personal"?savePersonalData:saveHouseData;
const setData=useCallback((u)=>{setDataRaw(p=>{undoRef.current=p;const n=typeof u==="function"?u(p):u;save(n,uid);if(user&&saveFn)saveFn(n);return n;});},[user,uid,saveFn]);

const setUserPrefs=useCallback((updater)=>{setUserPrefsRaw(prev=>{const n=typeof updater==="function"?updater(prev):updater;try{localStorage.setItem(`stockly-prefs-${uid}`,JSON.stringify(n));}catch{}if(user&&saveUserPrefs)saveUserPrefs(n);return n;});},[user,uid]);

const toggleMode=useCallback(()=>{const newMode=mode==="shared"?"personal":"shared";setUserPrefs(p=>({...p,mode:newMode}));toast(newMode==="personal"?"Modo pessoal ativado":"Modo compartilhado ativado");},[mode]);

const toast=useCallback((m)=>{setTm(m);if(toastTimer.current)clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>{setTm("");undoRef.current=null;},4000);},[]);
const doUndo=useCallback(()=>{if(undoRef.current){setDataRaw(undoRef.current);save(undoRef.current,uid);if(user&&saveFn)saveFn(undoRef.current);undoRef.current=null;setTm("Ação desfeita!");setTimeout(()=>setTm(""),2000);}},[user,uid,saveFn]);
const finishTour=()=>{setShowTour(false);try{localStorage.setItem(`stockly-tour-${uid}`,"1");}catch{}};
const c=data.config;
const myTheme=userPrefs.theme||c.theme||"dark";
const myAccent=userPrefs.accentColor||c.accentColor||"#F0A050";
const tv=THEMES[myTheme]||THEMES.dark;const ac=myAccent;
const w=c.expiryWarnDays||7;const ec=data.pantry.filter(i=>{const d=daysUntil(i.expiry);return(d<=w&&d>=0)||d<0;}).length;const pg=data.grocery.filter(i=>!i.checked).length;
const nav=[{id:"dashboard",label:"Painel",icon:I.home},{id:"pantry",label:"Despensa",icon:I.pantry,badge:ec>0?ec:null},{id:"grocery",label:"Compras",icon:I.grocery,badge:pg>0?pg:null},{id:"routine",label:"Rotina",icon:I.routine},{id:"chores",label:"Tarefas Casa",icon:I.chores},{id:"meals",label:"Cardápio",icon:I.meals},{id:"budget",label:"Finanças",icon:I.budget},{id:"prices",label:"Preços",icon:I.prices},{id:"help",label:"Ajuda",icon:I.help},{id:"settings",label:"Configurações",icon:I.settings}];
const go=(id)=>{setPage(id);setSo(false);};
return(<><style>{getCSS(tv,ac)}</style><div className="app">
<div className="mh"><button className="hb" onClick={()=>setSo(!so)}>{I.menu}</button><span style={{marginLeft:12,fontFamily:"'Sora',sans-serif",fontWeight:800,fontSize:20,background:`linear-gradient(135deg,${ac},#FFD700)`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",flex:1}}>{c.houseName}</span>{mode==="personal"&&<span style={{fontSize:10,background:"var(--purple-bg)",color:"var(--purple)",padding:"2px 8px",borderRadius:10,fontWeight:600,marginRight:8}}>Pessoal</span>}<UserAvatar userPrefs={userPrefs} user={user} size={30} onClick={()=>go("settings")}/></div>
<nav className={`sb ${so?"open":""}`}><div className="sb-h"><div className="logo">{c.houseName}</div><div className="logo-s">{mode==="personal"?"modo pessoal":"gestão doméstica"}</div></div>
{/* Mode toggle in sidebar */}
<div style={{padding:"0 12px 8px"}}><button onClick={toggleMode} style={{width:"100%",padding:"8px 12px",borderRadius:8,border:"1px solid var(--border)",background:mode==="shared"?"var(--accent-glow)":"var(--purple-bg)",color:mode==="shared"?"var(--accent)":"var(--purple)",fontSize:12,fontWeight:600,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,transition:"all .2s"}}>{mode==="shared"?<>{I.users} Compartilhado</>:<><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Pessoal</>}</button></div>
<div className="nav">{nav.map(n=><button key={n.id} className={`ni ${page===n.id?"a":""}`} onClick={()=>go(n.id)}>{n.icon}{n.label}{n.badge&&<span className="nb">{n.badge}</span>}</button>)}</div>
<SidebarInstallBtn installHook={installHook}/>
<div className="sb-f"><div style={{display:"flex",alignItems:"center",gap:10}}><UserAvatar userPrefs={userPrefs} user={user} size={32}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?user.displayName||user.email:data.members.join(", ")}</div><div style={{fontSize:10,color:"var(--text3)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.email||""}</div></div>{logout&&<button className="bi" onClick={logout} title="Sair" style={{padding:4}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></button>}</div></div></nav>
{so&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:99}} onClick={()=>setSo(false)}/>}
<main className="mc">
{page==="dashboard"&&<Dashboard data={data} goTo={go} user={user} mode={mode}/>}
{page==="pantry"&&<PantryPage data={data} setData={setData} toast={toast} user={user} mode={mode}/>}
{page==="grocery"&&<GroceryPage data={data} setData={setData} toast={toast} user={user} mode={mode}/>}
{page==="chores"&&<ChoresPage data={data} setData={setData} toast={toast} user={user} mode={mode}/>}
{page==="routine"&&<RoutinePage data={data} setData={setData} toast={toast} user={user} mode={mode}/>}
{page==="meals"&&<MealsPage data={data} setData={setData} toast={toast}/>}
{page==="budget"&&<BudgetPage data={data} setData={setData} toast={toast} user={user} mode={mode} houseInfo={houseInfo}/>}
{page==="prices"&&<PricesPage data={data} setData={setData} toast={toast}/>}
{page==="help"&&<HelpPage goTo={go}/>}
{page==="settings"&&<SettingsPage data={data} setData={setData} toast={toast} user={user} houseCode={houseCode} houseInfo={houseInfo} leaveHouse={leaveHouse} refreshHouseInfo={refreshHouseInfo} userPrefs={userPrefs} setUserPrefs={setUserPrefs} mode={mode} toggleMode={toggleMode}/>}
</main></div>{page==="dashboard"&&<FAB goTo={go} setData={setData} toast={toast} data={data}/>}{showTour&&<WelcomeTour onFinish={finishTour}/>}<InstallBanner installHook={installHook}/><Toast message={tm} onUndo={undoRef.current?doUndo:null}/></>);}
