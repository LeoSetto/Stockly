import { useState, useEffect, useCallback, useRef } from "react";

// ─── Persistence ───
const STORAGE_KEY = "lar-centro-data-v2";
const load = () => { try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; } catch { return null; } };
const save = (d) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {} };

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
  mealDays: ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"],
  mealTypes: ["Café", "Almoço", "Lanche", "Jantar"],
  expiryWarnDays: 7,
};

const DEFAULT_DATA = {
  config: { ...DEFAULT_CONFIG },
  pantry: [
    { id: 1, name: "Arroz", qty: 2, unit: "kg", location: "Despensa", expiry: "2026-08-15", category: "Grãos" },
    { id: 2, name: "Feijão Preto", qty: 1, unit: "kg", location: "Despensa", expiry: "2026-06-20", category: "Grãos" },
    { id: 3, name: "Leite", qty: 3, unit: "L", location: "Geladeira", expiry: "2026-04-05", category: "Laticínios" },
    { id: 4, name: "Ovos", qty: 12, unit: "un", location: "Geladeira", expiry: "2026-04-12", category: "Proteínas" },
    { id: 5, name: "Frango", qty: 1, unit: "kg", location: "Freezer", expiry: "2026-05-30", category: "Proteínas" },
    { id: 6, name: "Tomate", qty: 6, unit: "un", location: "Geladeira", expiry: "2026-04-01", category: "Hortifruti" },
    { id: 7, name: "Café", qty: 500, unit: "g", location: "Despensa", expiry: "2026-12-01", category: "Bebidas" },
    { id: 8, name: "Azeite", qty: 1, unit: "L", location: "Despensa", expiry: "2027-03-01", category: "Temperos" },
  ],
  grocery: [
    { id: 1, name: "Banana", qty: 6, unit: "un", checked: false, category: "Hortifruti" },
    { id: 2, name: "Pão de Forma", qty: 1, unit: "un", checked: false, category: "Padaria" },
    { id: 3, name: "Sabão em Pó", qty: 1, unit: "un", checked: true, category: "Limpeza" },
  ],
  chores: [
    { id: 1, name: "Lavar louça", room: "Cozinha", assignee: "Todos", freq: "Diário", lastDone: "2026-03-26", effort: 1 },
    { id: 2, name: "Aspirar sala", room: "Sala", assignee: "João", freq: "Semanal", lastDone: "2026-03-22", effort: 2 },
    { id: 3, name: "Limpar banheiro", room: "Banheiro", assignee: "Maria", freq: "Semanal", lastDone: "2026-03-20", effort: 3 },
    { id: 4, name: "Trocar lençóis", room: "Quarto", assignee: "João", freq: "Quinzenal", lastDone: "2026-03-15", effort: 2 },
    { id: 5, name: "Lavar roupa", room: "Lavanderia", assignee: "Maria", freq: "2x Semana", lastDone: "2026-03-25", effort: 2 },
  ],
  meals: [
    { id: 1, day: "Segunda", meal: "Almoço", recipe: "Frango grelhado com arroz e salada" },
    { id: 2, day: "Segunda", meal: "Jantar", recipe: "Sopa de legumes" },
    { id: 3, day: "Terça", meal: "Almoço", recipe: "Macarrão ao sugo" },
    { id: 4, day: "Quarta", meal: "Almoço", recipe: "Feijoada leve" },
    { id: 5, day: "Quinta", meal: "Almoço", recipe: "Strogonoff de frango" },
    { id: 6, day: "Sexta", meal: "Almoço", recipe: "Peixe assado com purê" },
  ],
  expenses: [
    { id: 1, desc: "Supermercado Pão de Açúcar", amount: 342.50, category: "Mercado", date: "2026-03-20", paid: true, card: "Cartão Crédito" },
    { id: 2, desc: "Feira livre", amount: 87.00, category: "Hortifruti", date: "2026-03-22", paid: true, card: "Pix" },
    { id: 3, desc: "Material de limpeza", amount: 65.30, category: "Limpeza", date: "2026-03-18", paid: false, card: "Cartão Crédito" },
    { id: 4, desc: "Farmácia", amount: 120.00, category: "Saúde", date: "2026-03-15", paid: true, card: "Dinheiro" },
    { id: 5, desc: "Conta de luz", amount: 185.00, category: "Contas", date: "2026-03-10", paid: false, card: "" },
    { id: 6, desc: "Gás", amount: 110.00, category: "Contas", date: "2026-03-05", paid: true, card: "Pix" },
  ],
  members: ["João", "Maria"],
  budget: 2500,
  priceHistory: [
    { id: 1, name: "Arroz", unitPrice: 4.58, totalPrice: 22.90, qty: 5, unit: "kg", date: "2026-01-15" },
    { id: 2, name: "Arroz", unitPrice: 4.90, totalPrice: 24.50, qty: 5, unit: "kg", date: "2026-02-12" },
    { id: 3, name: "Arroz", unitPrice: 5.18, totalPrice: 25.90, qty: 5, unit: "kg", date: "2026-03-10" },
    { id: 4, name: "Feijão Preto", unitPrice: 8.90, totalPrice: 8.90, qty: 1, unit: "kg", date: "2026-01-15" },
    { id: 5, name: "Feijão Preto", unitPrice: 9.50, totalPrice: 9.50, qty: 1, unit: "kg", date: "2026-02-20" },
    { id: 6, name: "Feijão Preto", unitPrice: 7.90, totalPrice: 7.90, qty: 1, unit: "kg", date: "2026-03-18" },
    { id: 7, name: "Leite", unitPrice: 5.49, totalPrice: 5.49, qty: 1, unit: "L", date: "2026-02-05" },
    { id: 8, name: "Leite", unitPrice: 5.99, totalPrice: 5.99, qty: 1, unit: "L", date: "2026-03-08" },
    { id: 9, name: "Café", unitPrice: 18.90, totalPrice: 18.90, qty: 500, unit: "g", date: "2026-01-20" },
    { id: 10, name: "Café", unitPrice: 21.50, totalPrice: 21.50, qty: 500, unit: "g", date: "2026-03-05" },
  ],
  shoppingTrips: [],
  _version: 5,
};

// ─── Data migration — upgrades old data to new format ───
const DATA_VERSION = 5;
const migrateData = (d) => {
  if (!d) return d;
  const v = d._version || 1;
  if (v >= DATA_VERSION) return d;
  let m = { ...d };
  if (!m.priceHistory) m.priceHistory = [];
  if (!m.shoppingTrips) m.shoppingTrips = [];
  m.priceHistory = (m.priceHistory || []).map(p => ({ ...p, unitPrice: p.unitPrice || p.price || 0, totalPrice: p.totalPrice || p.price || 0 }));
  m.grocery = (m.grocery || []).map(i => ({ ...i, price: i.price || 0, unitPrice: i.unitPrice || i.price || 0 }));
  // Add paid and card to expenses
  m.expenses = (m.expenses || []).map(e => ({ ...e, paid: e.paid !== undefined ? e.paid : true, card: e.card || "" }));
  // Add cards to config if missing
  if (!m.config.cards) m.config.cards = ["Dinheiro", "Pix", "Cartão Crédito", "Cartão Débito"];
  // v4→v5: Convert existing shoppingTrips to expenses (so they appear in Finanças)
  if (v < 5 && m.shoppingTrips && m.shoppingTrips.length > 0) {
    const existingDescs = (m.expenses || []).map(e => e.desc);
    m.shoppingTrips.forEach(trip => {
      const desc = "Compra " + new Date(trip.date + "T12:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
      if (trip.total > 0 && !existingDescs.includes(desc)) {
        m.expenses.push({ id: Date.now() + Math.random(), desc, amount: trip.total, category: "Mercado", date: trip.date, paid: true, card: "", fromTrip: trip.id });
      }
    });
  }
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
};

// ─── CSS ───
const getCSS = (tv, accent) => `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:wght@700;800;900&display=swap');
:root{${Object.entries(tv).map(([k,v])=>`${k}:${v}`).join(";")};--accent:${accent};--accent2:${accent}dd;--accent-glow:${accent}22;--green:#4ADE80;--green-bg:rgba(74,222,128,.1);--red:#F87171;--red-bg:rgba(248,113,113,.1);--yellow:#FBBF24;--yellow-bg:rgba(251,191,36,.1);--blue:#60A5FA;--blue-bg:rgba(96,165,250,.1);--purple:#A78BFA;--purple-bg:rgba(167,139,250,.1);--radius:14px;--radius-sm:8px;--shadow:0 4px 24px rgba(0,0,0,.3)}
*{margin:0;padding:0;box-sizing:border-box}body,#root{font-family:'Outfit',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;-webkit-font-smoothing:antialiased}
.app{display:flex;min-height:100vh}.sb{width:260px;min-height:100vh;background:var(--bg2);border-right:1px solid var(--border);display:flex;flex-direction:column;position:fixed;top:0;left:0;z-index:100;transition:transform .3s}.sb-h{padding:28px 24px 20px;border-bottom:1px solid var(--border)}.logo{font-family:'Playfair Display',serif;font-size:26px;font-weight:800;background:linear-gradient(135deg,var(--accent),#FFD700);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:-.5px}.logo-s{font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:3px;margin-top:4px;font-weight:500}
.nav{padding:16px 12px;flex:1;display:flex;flex-direction:column;gap:4px;overflow-y:auto}.ni{display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:10px;cursor:pointer;transition:all .2s;color:var(--text2);font-size:14px;font-weight:500;border:none;background:none;width:100%;text-align:left;font-family:inherit}.ni:hover{background:var(--bg3);color:var(--text)}.ni.a{background:var(--accent-glow);color:var(--accent);font-weight:600}.ni.a svg{stroke:var(--accent)}.nb{margin-left:auto;background:var(--red);color:#fff;font-size:11px;font-weight:700;padding:2px 7px;border-radius:20px;min-width:20px;text-align:center}.sb-f{padding:16px 24px;border-top:1px solid var(--border);font-size:11px;color:var(--text3)}
.mc{flex:1;margin-left:260px;padding:32px 40px;max-width:1200px}.ph{margin-bottom:32px}.pt{font-family:'Playfair Display',serif;font-size:32px;font-weight:800;color:var(--text);letter-spacing:-.5px}.ps{color:var(--text3);font-size:14px;margin-top:6px}
.card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:20px;transition:border-color .2s}.card:hover{border-color:var(--border2)}.ct{font-size:16px;font-weight:600;margin-bottom:16px;display:flex;align-items:center;gap:8px}
.sg{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:28px}.sc{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:20px;position:relative;overflow:hidden}.sc::before{content:'';position:absolute;top:0;left:0;right:0;height:3px}.sc.ac::before{background:linear-gradient(90deg,var(--accent),#FFD700)}.sc.gn::before{background:linear-gradient(90deg,var(--green),#34D399)}.sc.rd::before{background:linear-gradient(90deg,var(--red),#FB923C)}.sc.bl::before{background:linear-gradient(90deg,var(--blue),#818CF8)}.sc.pp::before{background:linear-gradient(90deg,var(--purple),#C084FC)}
.sl{font-size:12px;color:var(--text3);text-transform:uppercase;letter-spacing:1.5px;font-weight:600;margin-bottom:8px}.sv{font-size:28px;font-weight:700;letter-spacing:-1px}.sd{font-size:12px;color:var(--text2);margin-top:4px}
table{width:100%;border-collapse:collapse}th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:var(--text3);font-weight:600;padding:12px 16px;border-bottom:1px solid var(--border)}td{padding:14px 16px;border-bottom:1px solid var(--border);font-size:14px;color:var(--text2);vertical-align:middle}tr:hover td{background:var(--bg3)}.in{color:var(--text);font-weight:500}
.tg{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600}.tg-g{background:var(--green-bg);color:var(--green)}.tg-r{background:var(--red-bg);color:var(--red)}.tg-y{background:var(--yellow-bg);color:var(--yellow)}.tg-b{background:var(--blue-bg);color:var(--blue)}.tg-p{background:var(--purple-bg);color:var(--purple)}.tg-n{background:var(--bg4);color:var(--text2)}
.btn{display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border-radius:var(--radius-sm);font-size:13px;font-weight:600;font-family:'Outfit',sans-serif;cursor:pointer;border:none;transition:all .2s}.bp{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;box-shadow:0 2px 12px ${accent}44}.bp:hover{transform:translateY(-1px);box-shadow:0 4px 20px ${accent}55}.bg{background:transparent;color:var(--text2);border:1px solid var(--border)}.bg:hover{background:var(--bg3);color:var(--text)}.bd{background:var(--red-bg);color:var(--red)}.bd:hover{background:rgba(248,113,113,.2)}.bs{padding:6px 12px;font-size:12px}
.bi{padding:8px;background:transparent;border:1px solid var(--border);color:var(--text3);border-radius:var(--radius-sm);cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;justify-content:center}.bi:hover{background:var(--bg3);color:var(--text)}
.fr{display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap}.fg{display:flex;flex-direction:column;gap:4px;flex:1;min-width:140px}.fl{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--text3);font-weight:600}
input,select,textarea{background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 14px;color:var(--text);font-size:14px;font-family:'Outfit',sans-serif;outline:none;transition:border-color .2s;width:100%}input:focus,select:focus,textarea:focus{border-color:var(--accent)}select{cursor:pointer;-webkit-appearance:none}textarea{resize:vertical;min-height:60px}
.sb-i{position:relative;margin-bottom:20px}.sb-i svg{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--text3)}.sb-i input{padding-left:42px}
.tb{display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap}.tr{margin-left:auto;display:flex;gap:8px}
.cr{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .15s}.cr:hover{background:var(--bg3)}.cb{width:22px;height:22px;border:2px solid var(--border2);border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s}.cb.ck{background:var(--green);border-color:var(--green)}.cb.ck svg{stroke:#fff}.cx{flex:1;font-size:14px;color:var(--text);font-weight:500}.cx.dn{text-decoration:line-through;color:var(--text3)}.cm{font-size:12px;color:var(--text3)}
.mg{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px}.mk{background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px;min-height:80px;cursor:pointer;transition:all .2s}.mk:hover{border-color:var(--accent);transform:translateY(-2px)}.mt{font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}.mr{font-size:13px;color:var(--text);line-height:1.4}.me{color:var(--text3);font-style:italic;font-size:12px}
.pb{height:8px;background:var(--bg4);border-radius:4px;overflow:hidden;margin-top:8px}.pf{height:100%;border-radius:4px;transition:width .4s ease}
.ed{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:6px}.ef{display:flex;gap:3px}.eo{width:8px;height:8px;border-radius:50%;background:var(--border2)}.eo.ea{background:var(--accent)}
.mo{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:200;animation:fi .15s ease}.md{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:28px;width:90%;max-width:560px;box-shadow:var(--shadow);animation:su .2s ease;max-height:85vh;overflow-y:auto}.mdt{font-size:20px;font-weight:700;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between}.ma{display:flex;gap:10px;justify-content:flex-end;margin-top:20px}
@keyframes fi{from{opacity:0}to{opacity:1}}@keyframes su{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
.dg{display:grid;grid-template-columns:1fr 1fr;gap:20px}.di{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);font-size:13px}.di:last-child{border:none}
.cb-c{display:flex;align-items:flex-end;gap:8px;height:120px;padding-top:10px}.cb-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;height:100%;justify-content:flex-end}.cb-b{width:100%;max-width:48px;border-radius:6px 6px 0 0;transition:height .4s ease;min-height:4px}.cb-l{font-size:10px;color:var(--text3);text-align:center;white-space:nowrap}.cb-v{font-size:11px;color:var(--text2);font-weight:600}
.mh{display:none;position:fixed;top:0;left:0;right:0;height:56px;background:var(--bg2);border-bottom:1px solid var(--border);z-index:99;padding:0 16px;align-items:center}.hb{background:none;border:none;color:var(--text);cursor:pointer;padding:4px}
.toast{position:fixed;bottom:24px;right:24px;background:var(--bg3);border:1px solid var(--border2);border-radius:var(--radius-sm);padding:12px 20px;font-size:13px;color:var(--text);box-shadow:var(--shadow);z-index:300;animation:su .2s ease;display:flex;align-items:center;gap:8px}
.te{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;margin-bottom:4px}.tc{display:flex;align-items:center;gap:6px;background:var(--bg3);border:1px solid var(--border);padding:6px 12px;border-radius:20px;font-size:13px;color:var(--text)}.tc button{background:none;border:none;color:var(--text3);cursor:pointer;padding:0;display:flex;align-items:center}.tc button:hover{color:var(--red)}.ta{display:flex;gap:8px;margin-top:8px}.ta input{flex:1;padding:8px 12px;font-size:13px}.ta button{flex-shrink:0}
.cg{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.cd{width:32px;height:32px;border-radius:50%;cursor:pointer;border:3px solid transparent;transition:all .2s}.cd:hover{transform:scale(1.15)}.cd.sel{border-color:var(--text);box-shadow:0 0 0 2px var(--bg),0 0 0 4px var(--text)}
.thg{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:10px;margin-top:8px}.thc{border-radius:10px;padding:12px;cursor:pointer;border:2px solid transparent;transition:all .2s;text-align:center;font-size:12px;font-weight:600}.thc:hover{transform:translateY(-2px)}.thc.sel{border-color:var(--accent)}
.sst{font-size:13px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;display:flex;align-items:center;gap:8px}
@media(max-width:768px){.sb{transform:translateX(-100%)}.sb.open{transform:translateX(0)}.mc{margin-left:0;padding:72px 16px 24px}.mh{display:flex}.sg{grid-template-columns:1fr 1fr}.dg{grid-template-columns:1fr}.mg{grid-template-columns:1fr 1fr}.fr{flex-direction:column}.fg{min-width:100%}}
`;

// ─── Shared components ───
function Modal({title,onClose,children}){return(<div className="mo" onClick={onClose}><div className="md" onClick={e=>e.stopPropagation()}><div className="mdt">{title}<button className="bi" onClick={onClose}>{I.x}</button></div>{children}</div></div>);}
function Toast({message}){return message?<div className="toast">{I.check} {message}</div>:null;}
function TagEditor({items,onAdd,onRemove,placeholder="Novo item..."}){const[v,setV]=useState("");const add=()=>{const t=v.trim();if(t&&!items.includes(t)){onAdd(t);setV("");}};return(<div><div className="te">{items.map(t=><div className="tc" key={t}>{t}<button onClick={()=>onRemove(t)}><Icon d={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} size={12}/></button></div>)}</div><div className="ta"><input value={v} onChange={e=>setV(e.target.value)} placeholder={placeholder} onKeyDown={e=>e.key==="Enter"&&add()}/><button className="btn bp bs" onClick={add}>{I.plus}</button></div></div>);}

// ─── DASHBOARD ───
function Dashboard({data}){const c=data.config;const fmt=(n)=>fmtCurrency(n,c.locale,c.currency);const w=c.expiryWarnDays||7;const es=data.pantry.filter(i=>{const d=daysUntil(i.expiry);return d<=w&&d>=0;});const ex=data.pantry.filter(i=>daysUntil(i.expiry)<0);const gp=data.grocery.filter(i=>!i.checked).length;const ts=data.expenses.reduce((a,e)=>a+e.amount,0);const bp=data.budget>0?Math.min((ts/data.budget)*100,100):0;
const gcs=(ch)=>{const d=Math.abs(daysUntil(ch.lastDone));const lim={"Diário":1,"2x Semana":3,"Semanal":7,"Quinzenal":14,"Mensal":30};return d>=(lim[ch.freq]||7);};const cdc=data.chores.filter(gcs).length;
const ebc={};data.expenses.forEach(e=>{ebc[e.category]=(ebc[e.category]||0)+e.amount;});const mx=Math.max(...Object.values(ebc),1);const bcs=["#F0A050","#60A5FA","#4ADE80","#A78BFA","#FBBF24","#F87171","#34D399","#F472B6"];
return(<div><div className="ph"><div className="pt">Painel</div><div className="ps">{c.houseName} — {new Date().toLocaleDateString(c.locale||"pt-BR",{weekday:"long",day:"numeric",month:"long"})}</div></div>
<div className="sg">
<div className="sc ac"><div className="sl">Itens na Despensa</div><div className="sv">{data.pantry.length}</div><div className="sd">{c.locations.map(l=>`${data.pantry.filter(i=>i.location===l).length} ${l.toLowerCase()}`).join(" · ")}</div></div>
<div className="sc rd"><div className="sl">Atenção Validade</div><div className="sv" style={{color:(es.length+ex.length)>0?"var(--red)":"var(--green)"}}>{es.length+ex.length}</div><div className="sd">{ex.length>0?`${ex.length} vencido(s)`:"Tudo em dia!"}</div></div>
<div className="sc bl"><div className="sl">Lista de Compras</div><div className="sv">{gp}</div><div className="sd">itens pendentes</div></div>
<div className="sc pp"><div className="sl">Tarefas Pendentes</div><div className="sv" style={{color:cdc>0?"var(--yellow)":"var(--green)"}}>{cdc}</div><div className="sd">de {data.chores.length} tarefas</div></div>
<div className="sc gn"><div className="sl">Orçamento Mensal</div><div className="sv">{fmt(ts)}</div><div className="sd">de {fmt(data.budget)} ({bp.toFixed(0)}%)</div><div className="pb"><div className="pf" style={{width:`${bp}%`,background:bp>90?"var(--red)":bp>70?"var(--yellow)":"var(--green)"}}/></div></div>
</div>
<div className="dg">
<div className="card"><div className="ct" style={{color:"var(--red)"}}>⚠ Vencendo / Vencidos</div>{[...ex,...es].length===0?<div style={{color:"var(--text3)",fontSize:13,padding:"8px 0"}}>Tudo em dia!</div>:[...ex,...es].slice(0,6).map(i=>{const d=daysUntil(i.expiry);return(<div className="di" key={i.id}><span className="ed" style={{background:d<0?"var(--red)":d<=3?"var(--yellow)":"var(--blue)"}}/><span style={{flex:1,color:"var(--text)"}}>{i.name}</span><span style={{fontSize:12,color:d<0?"var(--red)":"var(--yellow)"}}>{d<0?`Venceu há ${Math.abs(d)}d`:d===0?"Hoje!":`${d}d`}</span></div>);})}</div>
<div className="card"><div className="ct">Gastos por Categoria</div><div className="cb-c">{Object.entries(ebc).map(([cat,val],idx)=>(<div className="cb-col" key={cat}><div className="cb-v">{fmt(val)}</div><div className="cb-b" style={{height:`${(val/mx)*80}%`,background:bcs[idx%bcs.length],opacity:.85}}/><div className="cb-l">{cat}</div></div>))}</div></div>
<div className="card"><div className="ct">Próximas Refeições</div>{data.meals.slice(0,4).map(m=>(<div className="di" key={m.id}><span className="tg tg-n" style={{minWidth:60,textAlign:"center"}}>{m.day.slice(0,3)}</span><span style={{fontSize:11,color:"var(--text3)",minWidth:50}}>{m.meal}</span><span style={{flex:1,color:"var(--text)"}}>{m.recipe}</span></div>))}{data.meals.length===0&&<div style={{color:"var(--text3)",fontSize:13,padding:"8px 0"}}>Nenhuma refeição planejada</div>}</div>
<div className="card"><div className="ct">Tarefas do Dia</div>{data.chores.filter(gcs).slice(0,5).map(ch=>(<div className="di" key={ch.id}><span className="tg tg-y" style={{minWidth:70,textAlign:"center"}}>{ch.room}</span><span style={{flex:1,color:"var(--text)"}}>{ch.name}</span><span style={{fontSize:12,color:"var(--text3)"}}>{ch.assignee}</span></div>))}{data.chores.filter(gcs).length===0&&<div style={{color:"var(--text3)",fontSize:13,padding:"8px 0"}}>Tudo em dia!</div>}</div>
</div></div>);}

// ─── PANTRY ───
function PantryPage({data,setData,toast}){const c=data.config;const[search,setSearch]=useState("");const[fL,setFL]=useState("Todos");const[fC,setFC]=useState("Todos");const[modal,setModal]=useState(null);const[form,setForm]=useState({});
const filtered=data.pantry.filter(i=>{if(search&&!i.name.toLowerCase().includes(search.toLowerCase()))return false;if(fL!=="Todos"&&i.location!==fL)return false;if(fC!=="Todos"&&i.category!==fC)return false;return true;}).sort((a,b)=>daysUntil(a.expiry)-daysUntil(b.expiry));
const openAdd=()=>{setForm({name:"",qty:"",unit:c.units[0]||"un",location:c.locations[0]||"",expiry:"",category:c.pantryCategories.slice(-1)[0]||""});setModal("add");};
const openEdit=(item)=>{setForm({...item});setModal("edit");};
const saveItem=()=>{if(!form.name)return;if(modal==="add"){setData(d=>({...d,pantry:[...d.pantry,{...form,id:Date.now(),qty:Number(form.qty)||1}]}));toast("Item adicionado");}else{setData(d=>({...d,pantry:d.pantry.map(i=>i.id===form.id?{...form,qty:Number(form.qty)}:i)}));toast("Item atualizado");}setModal(null);};
const del=(id)=>{setData(d=>({...d,pantry:d.pantry.filter(i=>i.id!==id)}));toast("Item removido");};
const toGrocery=(item)=>{setData(d=>({...d,grocery:[...d.grocery,{id:Date.now(),name:item.name,qty:1,unit:item.unit,checked:false,category:item.category}]}));toast(`"${item.name}" → lista`);};
const w=c.expiryWarnDays||7;
return(<div><div className="ph"><div className="pt">Despensa</div><div className="ps">Controle completo do que tem em casa</div></div>
<div className="tb"><div className="sb-i" style={{marginBottom:0,flex:1,maxWidth:320}}>{I.search}<input placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
<select value={fL} onChange={e=>setFL(e.target.value)} style={{width:140}}><option>Todos</option>{c.locations.map(l=><option key={l}>{l}</option>)}</select>
<select value={fC} onChange={e=>setFC(e.target.value)} style={{width:140}}><option>Todos</option>{c.pantryCategories.map(ct=><option key={ct}>{ct}</option>)}</select>
<div className="tr"><button className="btn bp" onClick={openAdd}>{I.plus} Adicionar</button></div></div>
<div className="card" style={{padding:0,overflow:"hidden"}}><div style={{overflowX:"auto"}}><table><thead><tr><th>Item</th><th>Qtd</th><th>Local</th><th>Categoria</th><th>Validade</th><th>Status</th><th></th></tr></thead><tbody>
{filtered.map(item=>{const d=daysUntil(item.expiry);const st=!item.expiry?"tg-n":d<0?"tg-r":d<=3?"tg-y":d<=w?"tg-b":"tg-g";const sx=!item.expiry?"—":d<0?"Vencido":d===0?"Hoje!":d<=w?`${d}d`:"OK";
return(<tr key={item.id}><td className="in">{item.name}</td><td>{item.qty} {item.unit}</td><td><span className="tg tg-n">{item.location}</span></td><td style={{color:"var(--text3)"}}>{item.category}</td><td>{item.expiry?new Date(item.expiry+"T12:00").toLocaleDateString(c.locale||"pt-BR"):"—"}</td><td><span className={`tg ${st}`}>{sx}</span></td><td><div style={{display:"flex",gap:4}}><button className="bi" title="Editar" onClick={()=>openEdit(item)}>{I.edit}</button><button className="bi" title="→ Lista" onClick={()=>toGrocery(item)}>{I.grocery}</button><button className="bi" title="Remover" onClick={()=>del(item.id)}>{I.trash}</button></div></td></tr>);})}
{filtered.length===0&&<tr><td colSpan={7} style={{textAlign:"center",padding:32,color:"var(--text3)"}}>Nenhum item</td></tr>}
</tbody></table></div></div>
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
function GroceryPage({data,setData,toast}){const c=data.config;const[modal,setModal]=useState(false);const[form,setForm]=useState({});const[priceModal,setPriceModal]=useState(null);const[unitPriceVal,setUnitPriceVal]=useState("");const[editingPrice,setEditingPrice]=useState(null);const[editUP,setEditUP]=useState("");const[finishModal,setFinishModal]=useState(false);const[finishCard,setFinishCard]=useState(c.cards?.[0]||"");const[finishPaid,setFinishPaid]=useState(false);
const fmt=(n)=>fmtCurrency(n,c.locale,c.currency);
const toggle=(id)=>{const item=data.grocery.find(i=>i.id===id);if(item&&!item.checked){setPriceModal(item);setUnitPriceVal(item.unitPrice||"");}else{setData(d=>({...d,grocery:d.grocery.map(i=>i.id===id?{...i,checked:!i.checked}:i)}));}};
const confirmCheck=()=>{if(!priceModal)return;const up=Number(unitPriceVal)||0;const tp=up*(priceModal.qty||1);setData(d=>{const newPH=up>0?[...(d.priceHistory||[]),{id:Date.now(),name:priceModal.name,unitPrice:up,totalPrice:tp,qty:priceModal.qty,unit:priceModal.unit,date:today()}]:d.priceHistory||[];return{...d,grocery:d.grocery.map(i=>i.id===priceModal.id?{...i,checked:true,unitPrice:up,price:tp}:i),priceHistory:newPH};});if(up>0)toast(`${priceModal.name}: ${fmt(up)}/un × ${priceModal.qty} = ${fmt(tp)}`);else toast("Item marcado");setPriceModal(null);setUnitPriceVal("");};
const skipPrice=()=>{setData(d=>({...d,grocery:d.grocery.map(i=>i.id===priceModal.id?{...i,checked:true}:i)}));toast("Item marcado");setPriceModal(null);setUnitPriceVal("");};
const saveEditPrice=()=>{if(!editingPrice)return;const up=Number(editUP)||0;const tp=up*(editingPrice.qty||1);setData(d=>{const newGrocery=d.grocery.map(i=>i.id===editingPrice.id?{...i,unitPrice:up,price:tp}:i);let newPH=[...(d.priceHistory||[])];const existIdx=newPH.findIndex(p=>p.name===editingPrice.name&&p.date===today());if(up>0){if(existIdx>=0){newPH[existIdx]={...newPH[existIdx],unitPrice:up,totalPrice:tp};}else{newPH.push({id:Date.now(),name:editingPrice.name,unitPrice:up,totalPrice:tp,qty:editingPrice.qty,unit:editingPrice.unit,date:today()});}}return{...d,grocery:newGrocery,priceHistory:newPH};});toast("Preço atualizado");setEditingPrice(null);};
const rem=(id)=>setData(d=>({...d,grocery:d.grocery.filter(i=>i.id!==id)}));
const add=()=>{if(!form.name)return;setData(d=>({...d,grocery:[...d.grocery,{id:Date.now(),name:form.name,qty:Number(form.qty)||1,unit:form.unit||c.units[0],checked:false,category:form.category||c.pantryCategories[0],price:0,unitPrice:0}]}));toast("Adicionado");setModal(false);};
// Open finish modal
const openFinish=()=>{setFinishCard(c.cards?.[0]||"");setFinishPaid(false);setFinishModal(true);};
// Finish shopping: save trip, create expense, move to pantry
const doFinish=()=>{const checked=data.grocery.filter(i=>i.checked);if(checked.length===0)return;const total=checked.reduce((a,i)=>a+(i.price||0),0);const trip={id:Date.now(),date:today(),items:checked.map(i=>({name:i.name,qty:i.qty,unit:i.unit,unitPrice:i.unitPrice||0,totalPrice:i.price||0})),total,card:finishCard};
const desc="Compra " + new Date().toLocaleDateString(c.locale||"pt-BR",{day:"numeric",month:"short"});
const expense={id:Date.now()+1,desc,amount:total,category:"Mercado",date:today(),paid:finishPaid,card:finishCard,fromTrip:trip.id};
setData(d=>({...d,shoppingTrips:[trip,...(d.shoppingTrips||[])],expenses:[expense,...(d.expenses||[])],pantry:[...d.pantry,...checked.map(i=>({id:Date.now()+Math.random(),name:i.name,qty:i.qty,unit:i.unit,location:c.locations[0]||"Despensa",expiry:"",category:i.category}))],grocery:d.grocery.filter(i=>!i.checked)}));
toast(`Compra finalizada! ${fmt(total)} — ${finishCard||"sem cartão"}`);setFinishModal(false);};
const pend=data.grocery.filter(i=>!i.checked);const done=data.grocery.filter(i=>i.checked);
const doneTotal=done.reduce((a,i)=>a+(i.price||0),0);
const lastUnitPrice=(name)=>{const h=(data.priceHistory||[]).filter(p=>p.name.toLowerCase()===name.toLowerCase()).sort((a,b)=>b.date.localeCompare(a.date));return h[0]?.unitPrice||h[0]?.totalPrice||null;};
return(<div><div className="ph"><div className="pt">Lista de Compras</div><div className="ps">{pend.length} pendentes · {done.length} comprados{doneTotal>0&&` · Total: ${fmt(doneTotal)}`}</div></div>
<div className="tb"><button className="btn bp" onClick={()=>{setForm({name:"",qty:"",unit:c.units[0],category:c.pantryCategories[0]});setModal(true);}}>{I.plus} Adicionar</button>
{done.length>0&&<button className="btn bg" onClick={openFinish}>Finalizar Compra ({fmt(doneTotal)})</button>}</div>
<div className="card" style={{padding:0}}>{pend.length===0&&done.length===0&&<div style={{padding:40,textAlign:"center",color:"var(--text3)"}}>Lista vazia</div>}
{pend.map(i=>{const lp=lastUnitPrice(i.name);return(<div className="cr" key={i.id}><div className="cb" onClick={()=>toggle(i.id)}/><span className="cx">{i.name}</span><span className="cm">{i.qty} {i.unit}</span>{lp&&<span style={{fontSize:11,color:"var(--text3)",background:"var(--bg4)",padding:"2px 8px",borderRadius:12}}>~{fmt(lp)}/un</span>}<span className="tg tg-n">{i.category}</span><button className="bi" onClick={()=>rem(i.id)}>{I.trash}</button></div>);})}
{done.length>0&&<div style={{padding:"12px 16px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:11,textTransform:"uppercase",letterSpacing:1.5,color:"var(--text3)",fontWeight:600}}>Comprados ({done.length})</span>{doneTotal>0&&<span style={{fontSize:14,fontWeight:700,color:"var(--accent)"}}>{fmt(doneTotal)}</span>}</div>}
{done.map(i=>(<div className="cr" key={i.id} style={{opacity:.7}}>
<div className="cb ck" onClick={()=>toggle(i.id)}><Icon d={<polyline points="20 6 9 17 4 12"/>} size={14} color="#fff"/></div>
<span className="cx dn">{i.name}</span><span className="cm">{i.qty} {i.unit}</span>
{i.price>0?<span style={{fontSize:12,color:"var(--green)",cursor:"pointer",display:"flex",alignItems:"center",gap:4}} onClick={()=>{setEditingPrice(i);setEditUP(i.unitPrice||"");}}>{fmt(i.unitPrice||0)}/un = {fmt(i.price)} {I.edit}</span>:<span style={{fontSize:11,color:"var(--text3)",cursor:"pointer"}} onClick={()=>{setEditingPrice(i);setEditUP("");}}>+ preço</span>}
<button className="bi" onClick={()=>rem(i.id)}>{I.trash}</button>
</div>))}
</div>
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
<div style={{fontSize:13,color:"var(--text2)",marginBottom:16}}>Quanto custa cada unidade? (opcional)</div>
<div className="fr"><div className="fg"><label className="fl">Preço unitário</label><input type="number" step="0.01" value={unitPriceVal} onChange={e=>setUnitPriceVal(e.target.value)} placeholder="0.00" autoFocus onKeyDown={e=>e.key==="Enter"&&confirmCheck()}/></div>
<div className="fg"><label className="fl">Qtd</label><div style={{padding:"10px 14px",background:"var(--bg4)",borderRadius:8,fontSize:14,color:"var(--text2)"}}>{priceModal.qty} {priceModal.unit}</div></div></div>
{Number(unitPriceVal)>0&&<div style={{fontSize:16,fontWeight:700,color:"var(--accent)",marginTop:8,padding:"10px 14px",background:"var(--accent-glow)",borderRadius:8,textAlign:"center"}}>Total: {fmt(Number(unitPriceVal)*(priceModal.qty||1))}</div>}
{lastUnitPrice(priceModal.name)&&<div style={{fontSize:12,color:"var(--text3)",marginTop:8}}>Último preço: {fmt(lastUnitPrice(priceModal.name))}/un</div>}
<div className="ma"><button className="btn bg" onClick={skipPrice}>Pular</button><button className="btn bp" onClick={confirmCheck}>Registrar</button></div>
</Modal>}
{editingPrice&&<Modal title={`Editar preço: ${editingPrice.name}`} onClose={()=>setEditingPrice(null)}>
<div className="fr"><div className="fg"><label className="fl">Preço unitário</label><input type="number" step="0.01" value={editUP} onChange={e=>setEditUP(e.target.value)} autoFocus onKeyDown={e=>e.key==="Enter"&&saveEditPrice()}/></div>
<div className="fg"><label className="fl">Qtd</label><div style={{padding:"10px 14px",background:"var(--bg4)",borderRadius:8,fontSize:14,color:"var(--text2)"}}>{editingPrice.qty} {editingPrice.unit}</div></div></div>
{Number(editUP)>0&&<div style={{fontSize:16,fontWeight:700,color:"var(--accent)",marginTop:8,padding:"10px 14px",background:"var(--accent-glow)",borderRadius:8,textAlign:"center"}}>Total: {fmt(Number(editUP)*(editingPrice.qty||1))}</div>}
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
function ChoresPage({data,setData,toast}){const c=data.config;const[modal,setModal]=useState(null);const[form,setForm]=useState({});
const gs=(ch)=>{const d=Math.abs(daysUntil(ch.lastDone));const l={"Diário":1,"2x Semana":3,"Semanal":7,"Quinzenal":14,"Mensal":30};const lv=l[ch.freq]||7;if(d>=lv*1.5)return"overdue";if(d>=lv)return"due";return"ok";};
const md=(id)=>{setData(d=>({...d,chores:d.chores.map(ch=>ch.id===id?{...ch,lastDone:today()}:ch)}));toast("Concluída!");};
const sv=()=>{if(!form.name)return;if(modal==="add"){setData(d=>({...d,chores:[...d.chores,{...form,id:Date.now(),effort:Number(form.effort)||1,lastDone:today()}]}));toast("Criada");}else{setData(d=>({...d,chores:d.chores.map(ch=>ch.id===form.id?{...form,effort:Number(form.effort)}:ch)}));toast("Atualizada");}setModal(null);};
const dl=(id)=>{setData(d=>({...d,chores:d.chores.filter(ch=>ch.id!==id)}));toast("Removida");};
const sorted=[...data.chores].sort((a,b)=>{const p={overdue:0,due:1,ok:2};return(p[gs(a)]||0)-(p[gs(b)]||0);});
return(<div><div className="ph"><div className="pt">Tarefas da Casa</div><div className="ps">Organize, distribua e acompanhe</div></div>
{data.members.length>1&&<div className="sg" style={{marginBottom:20}}>{data.members.map(m=><div className="sc bl" key={m}><div className="sl">{m}</div><div className="sv">{data.chores.filter(ch=>ch.assignee===m).length}</div><div className="sd">tarefas</div></div>)}</div>}
<div className="tb"><button className="btn bp" onClick={()=>{setForm({name:"",room:c.rooms[0]||"",assignee:data.members[0]||"Todos",freq:c.choreFreqs[2]||"Semanal",effort:1});setModal("add");}}>{I.plus} Nova Tarefa</button></div>
<div className="card" style={{padding:0,overflow:"hidden"}}><div style={{overflowX:"auto"}}><table><thead><tr><th>Tarefa</th><th>Cômodo</th><th>Responsável</th><th>Freq</th><th>Esforço</th><th>Última vez</th><th>Status</th><th></th></tr></thead><tbody>
{sorted.map(ch=>{const s=gs(ch);return(<tr key={ch.id}><td className="in">{ch.name}</td><td><span className="tg tg-n">{ch.room}</span></td><td>{ch.assignee}</td><td style={{color:"var(--text3)"}}>{ch.freq}</td><td><div className="ef">{[1,2,3].map(n=><div key={n} className={`eo ${n<=ch.effort?"ea":""}`}/>)}</div></td><td style={{fontSize:13}}>{ch.lastDone?new Date(ch.lastDone+"T12:00").toLocaleDateString(c.locale||"pt-BR"):"—"}</td><td><span className={`tg ${s==="overdue"?"tg-r":s==="due"?"tg-y":"tg-g"}`}>{s==="overdue"?"Atrasada":s==="due"?"Pendente":"Em dia"}</span></td><td><div style={{display:"flex",gap:4}}><button className="btn bg bs" onClick={()=>md(ch.id)}>{I.check} Feito</button><button className="bi" onClick={()=>{setForm({...ch});setModal("edit");}}>{I.edit}</button><button className="bi" onClick={()=>dl(ch.id)}>{I.trash}</button></div></td></tr>);})}
</tbody></table></div></div>
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

// ─── BUDGET ───
function BudgetPage({data,setData,toast}){const c=data.config;const fmt=(n)=>fmtCurrency(n,c.locale,c.currency);const[modal,setModal]=useState(null);const[form,setForm]=useState({});const[eb,setEb]=useState(false);const[bv,setBv]=useState(data.budget);const[filter,setFilter]=useState("all");
const expenses=data.expenses||[];
const ts=expenses.reduce((a,e)=>a+e.amount,0);
const paidTotal=expenses.filter(e=>e.paid).reduce((a,e)=>a+e.amount,0);
const pendingTotal=expenses.filter(e=>!e.paid).reduce((a,e)=>a+e.amount,0);
const rem=data.budget-ts;const pct=data.budget>0?Math.min((ts/data.budget)*100,100):0;
const togglePaid=(id)=>{setData(d=>({...d,expenses:d.expenses.map(e=>e.id===id?{...e,paid:!e.paid}:e)}));};
const ae=()=>{if(!form.desc||!form.amount)return;setData(d=>({...d,expenses:[{id:Date.now(),desc:form.desc,amount:Number(form.amount),category:form.category||c.expenseCategories[0],date:form.date||today(),paid:form.paid||false,card:form.card||""},...d.expenses]}));toast("Registrado");setModal(null);};
const de=(id)=>{setData(d=>({...d,expenses:d.expenses.filter(e=>e.id!==id)}));toast("Removido");};
const sb=()=>{setData(d=>({...d,budget:Number(bv)}));setEb(false);toast("Orçamento atualizado");};
const bc={};expenses.forEach(e=>{bc[e.category]=(bc[e.category]||0)+e.amount;});
const filtered=filter==="all"?expenses:filter==="paid"?expenses.filter(e=>e.paid):expenses.filter(e=>!e.paid);
return(<div><div className="ph"><div className="pt">Finanças da Casa</div><div className="ps">Controle gastos domésticos</div></div>
<div className="sg">
<div className="sc gn"><div className="sl">Orçamento</div><div className="sv" style={{display:"flex",alignItems:"center",gap:8}}>{fmt(data.budget)}<button className="bi" style={{padding:4}} onClick={()=>{setBv(data.budget);setEb(true);}}>{I.edit}</button></div></div>
<div className="sc ac"><div className="sl">Total Comprometido</div><div className="sv">{fmt(ts)}</div><div className="pb"><div className="pf" style={{width:`${pct}%`,background:pct>90?"var(--red)":pct>70?"var(--yellow)":"var(--green)"}}/></div></div>
<div className="sc bl"><div className="sl">Restante</div><div className="sv" style={{color:rem<0?"var(--red)":"var(--green)"}}>{fmt(rem)}</div></div>
<div className="sc gn"><div className="sl">Pago</div><div className="sv" style={{color:"var(--green)"}}>{fmt(paidTotal)}</div></div>
<div className="sc rd"><div className="sl">Pendente</div><div className="sv" style={{color:"var(--yellow)"}}>{fmt(pendingTotal)}</div><div className="sd">{expenses.filter(e=>!e.paid).length} gasto{expenses.filter(e=>!e.paid).length!==1?"s":""}</div></div>
</div>
{Object.keys(bc).length>0&&<div className="card" style={{marginBottom:20}}><div className="ct">Por Categoria</div><div style={{display:"flex",flexWrap:"wrap",gap:12}}>{Object.entries(bc).sort((a,b)=>b[1]-a[1]).map(([cat,val])=>(<div key={cat} style={{background:"var(--bg3)",borderRadius:8,padding:"10px 16px",flex:"1 1 140px"}}><div style={{fontSize:11,color:"var(--text3)",textTransform:"uppercase",letterSpacing:1}}>{cat}</div><div style={{fontSize:18,fontWeight:700,marginTop:4}}>{fmt(val)}</div><div style={{fontSize:11,color:"var(--text3)"}}>{ts>0?((val/ts)*100).toFixed(0):0}%</div></div>))}</div></div>}
<div className="tb"><button className="btn bp" onClick={()=>{setForm({desc:"",amount:"",category:c.expenseCategories[0],date:today(),paid:false,card:c.cards?.[0]||""});setModal("add");}}>{I.plus} Novo Gasto</button>
<div style={{display:"flex",gap:4}}>{[{k:"all",l:"Todos"},{k:"pending",l:"Pendentes"},{k:"paid",l:"Pagos"}].map(f=><button key={f.k} className={`btn ${filter===f.k?"bp":"bg"} bs`} onClick={()=>setFilter(f.k)}>{f.l}</button>)}</div>
</div>
<div className="card" style={{padding:0,overflow:"hidden"}}><div style={{overflowX:"auto"}}><table><thead><tr><th style={{width:40}}>Pago</th><th>Descrição</th><th>Valor</th><th>Cartão</th><th>Categoria</th><th>Data</th><th></th></tr></thead><tbody>
{filtered.sort((a,b)=>b.date.localeCompare(a.date)).map(e=>(<tr key={e.id} style={{borderLeft:e.paid?"3px solid var(--green)":"3px solid var(--yellow)"}}>
<td><div style={{width:24,height:24,borderRadius:6,border:`2px solid ${e.paid?"var(--green)":"var(--yellow)"}`,background:e.paid?"var(--green)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all .2s"}} onClick={()=>togglePaid(e.id)}>{e.paid&&<Icon d={<polyline points="20 6 9 17 4 12"/>} size={14} color="#fff"/>}</div></td>
<td className="in" style={{opacity:e.paid?0.6:1}}>{e.desc}</td>
<td style={{fontWeight:600,color:e.paid?"var(--green)":"var(--yellow)"}}>{fmt(e.amount)}</td>
<td>{e.card?<span className="tg tg-b">{e.card}</span>:<span style={{color:"var(--text3)",fontSize:12}}>—</span>}</td>
<td><span className="tg tg-n">{e.category}</span></td>
<td style={{color:"var(--text3)"}}>{new Date(e.date+"T12:00").toLocaleDateString(c.locale||"pt-BR")}</td>
<td><button className="bi" onClick={()=>de(e.id)}>{I.trash}</button></td>
</tr>))}
</tbody></table></div></div>
{modal&&<Modal title="Novo Gasto" onClose={()=>setModal(null)}>
<div className="fr"><div className="fg" style={{flex:2}}><label className="fl">Descrição</label><input value={form.desc||""} onChange={e=>setForm({...form,desc:e.target.value})} autoFocus/></div><div className="fg"><label className="fl">Valor</label><input type="number" step="0.01" value={form.amount||""} onChange={e=>setForm({...form,amount:e.target.value})}/></div></div>
<div className="fr"><div className="fg"><label className="fl">Categoria</label><select value={form.category||c.expenseCategories[0]} onChange={e=>setForm({...form,category:e.target.value})}>{c.expenseCategories.map(ct=><option key={ct}>{ct}</option>)}</select></div>
<div className="fg"><label className="fl">Cartão / Pagamento</label><select value={form.card||""} onChange={e=>setForm({...form,card:e.target.value})}><option value="">Nenhum</option>{(c.cards||[]).map(cd=><option key={cd}>{cd}</option>)}</select></div></div>
<div className="fr"><div className="fg"><label className="fl">Data</label><input type="date" value={form.date||today()} onChange={e=>setForm({...form,date:e.target.value})}/></div></div>
<div style={{display:"flex",alignItems:"center",gap:10,marginTop:4,marginBottom:8,cursor:"pointer"}} onClick={()=>setForm({...form,paid:!form.paid})}>
<div style={{width:22,height:22,borderRadius:6,border:`2px solid ${form.paid?"var(--green)":"var(--yellow)"}`,background:form.paid?"var(--green)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s"}}>{form.paid&&<Icon d={<polyline points="20 6 9 17 4 12"/>} size={14} color="#fff"/>}</div>
<span style={{fontSize:14,color:form.paid?"var(--green)":"var(--yellow)",fontWeight:500}}>{form.paid?"Já pago":"Ainda não pago (cartão, fatura, etc)"}</span>
</div>
<div className="ma"><button className="btn bg" onClick={()=>setModal(null)}>Cancelar</button><button className="btn bp" onClick={ae}>Salvar</button></div>
</Modal>}
{eb&&<Modal title="Editar Orçamento" onClose={()=>setEb(false)}><div className="fg"><label className="fl">Orçamento Mensal</label><input type="number" value={bv} onChange={e=>setBv(e.target.value)} autoFocus/></div><div className="ma"><button className="btn bg" onClick={()=>setEb(false)}>Cancelar</button><button className="btn bp" onClick={sb}>Salvar</button></div></Modal>}
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
<div className="fg"><label className="fl">Preço unitário</label><input type="number" step="0.01" value={form.price||""} onChange={e=>setForm({...form,price:e.target.value})} placeholder="0.00"/></div></div>
<div className="fr"><div className="fg"><label className="fl">Qtd</label><input type="number" value={form.qty||""} onChange={e=>setForm({...form,qty:e.target.value})}/></div>
<div className="fg"><label className="fl">Unidade</label><select value={form.unit||c.units[0]} onChange={e=>setForm({...form,unit:e.target.value})}>{c.units.map(u=><option key={u}>{u}</option>)}</select></div>
<div className="fg"><label className="fl">Data</label><input type="date" value={form.date||today()} onChange={e=>setForm({...form,date:e.target.value})}/></div></div>
{Number(form.price)>0&&Number(form.qty)>0&&<div style={{fontSize:14,fontWeight:600,color:"var(--accent)",marginTop:4}}>Total: {fmt(Number(form.price)*Number(form.qty))}</div>}
<div className="ma"><button className="btn bg" onClick={()=>setModal(null)}>Cancelar</button><button className="btn bp" onClick={addPrice}>Registrar</button></div>
</Modal>}
{editEntry&&<Modal title="Editar Preço" onClose={()=>setEditEntry(null)}>
<div style={{fontSize:13,color:"var(--text2)",marginBottom:12}}>{editEntry.name} — {new Date(editEntry.date+"T12:00").toLocaleDateString(c.locale||"pt-BR",{day:"numeric",month:"long",year:"numeric"})}</div>
<div className="fr"><div className="fg"><label className="fl">Preço unitário</label><input type="number" step="0.01" value={editVal} onChange={e=>setEditVal(e.target.value)} autoFocus onKeyDown={e=>e.key==="Enter"&&saveEditEntry()}/></div></div>
{Number(editVal)>0&&<div style={{fontSize:14,fontWeight:600,color:"var(--accent)",marginTop:4}}>Total ({editEntry.qty} {editEntry.unit}): {fmt(Number(editVal)*(editEntry.qty||1))}</div>}
<div className="ma"><button className="btn bd bs" onClick={()=>{delEntry(editEntry.id);setEditEntry(null);}}>Excluir registro</button><button className="btn bg" onClick={()=>setEditEntry(null)}>Cancelar</button><button className="btn bp" onClick={saveEditEntry}>Salvar</button></div>
</Modal>}
</div>);}

// ─── SETTINGS ───
function SettingsPage({data,setData,toast,houseCode,houseInfo,leaveHouse,refreshHouseInfo}){const c=data.config;const[nm,setNm]=useState("");const[tab,setTab]=useState("geral");
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
<div style={{display:"flex",gap:4,marginBottom:24,flexWrap:"wrap"}}>{tabs.map(t=><button key={t.id} className={`btn ${tab===t.id?"bp":"bg"} bs`} onClick={()=>setTab(t.id)} style={{gap:6}}>{t.icon} {t.label}</button>)}</div>

{tab==="geral"&&<><div className="card"><div className="sst">{I.home} Nome da Casa</div><div className="fg" style={{maxWidth:360}}><input value={c.houseName} onChange={e=>uc("houseName",e.target.value)}/></div></div>
<div className="card"><div className="sst">{I.users} Membros</div><div className="te">{data.members.map(m=><div className="tc" key={m}>{m}<button onClick={()=>rmM(m)}><Icon d={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} size={12}/></button></div>)}</div><div className="ta"><input value={nm} onChange={e=>setNm(e.target.value)} placeholder="Novo membro" onKeyDown={e=>e.key==="Enter"&&addM()}/><button className="btn bp bs" onClick={addM}>{I.plus}</button></div></div>
<div className="card"><div className="sst">{I.budget} Moeda & Formato</div><div className="fr"><div className="fg"><label className="fl">Moeda</label><select value={c.currency} onChange={e=>uc("currency",e.target.value)}>{CURRENCIES.map(cur=><option key={cur.code} value={cur.code}>{cur.label}</option>)}</select></div><div className="fg"><label className="fl">Locale</label><select value={c.locale} onChange={e=>uc("locale",e.target.value)}><option value="pt-BR">Português (BR)</option><option value="en-US">English (US)</option><option value="es-ES">Español</option><option value="fr-FR">Français</option><option value="de-DE">Deutsch</option><option value="ja-JP">日本語</option></select></div></div></div>
<div className="card"><div className="sst">⚠ Alerta de Validade</div><div className="fg" style={{maxWidth:200}}><label className="fl">Dias de antecedência</label><input type="number" value={c.expiryWarnDays} onChange={e=>uc("expiryWarnDays",Number(e.target.value)||7)} min={1} max={90}/></div><div style={{fontSize:12,color:"var(--text3)",marginTop:8}}>Itens que vencem em até {c.expiryWarnDays} dias aparecerão como alerta</div></div></>}

{tab==="casa"&&<><div className="card"><div className="sst">{I.users} Código da Casa</div>
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
</div>
</>}

{tab==="aparencia"&&<><div className="card"><div className="sst">{I.palette} Tema</div><div className="thg">{Object.entries(THEMES).map(([k,v])=>(<div key={k} className={`thc ${c.theme===k?"sel":""}`} style={{background:v["--bg2"],color:v["--text"],border:`2px solid ${c.theme===k?c.accentColor:v["--border"]}`}} onClick={()=>uc("theme",k)}><div style={{width:"100%",height:24,borderRadius:4,marginBottom:8,background:`linear-gradient(135deg,${v["--bg"]},${v["--bg3"]})`}}/>{k.charAt(0).toUpperCase()+k.slice(1)}</div>))}</div></div>
<div className="card"><div className="sst">✦ Cor de Destaque</div><div className="cg">{ACCENT_COLORS.map(col=>(<div key={col} className={`cd ${c.accentColor===col?"sel":""}`} style={{background:col}} onClick={()=>uc("accentColor",col)}/>))}</div><div style={{marginTop:12,display:"flex",alignItems:"center",gap:8}}><label className="fl" style={{margin:0}}>Personalizada:</label><input type="color" value={c.accentColor} onChange={e=>uc("accentColor",e.target.value)} style={{width:40,height:32,padding:2,cursor:"pointer"}}/><span style={{fontSize:12,color:"var(--text3)"}}>{c.accentColor}</span></div></div></>}

{tab==="categorias"&&<><div className="card"><div className="sst">{I.pantry} Categorias da Despensa</div><p style={{fontSize:12,color:"var(--text3)",marginBottom:8}}>Usadas na despensa e lista de compras</p><TagEditor items={c.pantryCategories} onAdd={v=>al("pantryCategories",v)} onRemove={v=>rl("pantryCategories",v)}/></div>
<div className="card"><div className="sst">{I.budget} Categorias de Gastos</div><TagEditor items={c.expenseCategories} onAdd={v=>al("expenseCategories",v)} onRemove={v=>rl("expenseCategories",v)}/></div></>}

{tab==="listas"&&<><div className="card"><div className="sst">{I.pantry} Locais de Armazenamento</div><p style={{fontSize:12,color:"var(--text3)",marginBottom:8}}>Geladeira, despensa, freezer...</p><TagEditor items={c.locations} onAdd={v=>al("locations",v)} onRemove={v=>rl("locations",v)}/></div>
<div className="card"><div className="sst">📐 Unidades de Medida</div><TagEditor items={c.units} onAdd={v=>al("units",v)} onRemove={v=>rl("units",v)}/></div>
<div className="card"><div className="sst">{I.chores} Cômodos da Casa</div><TagEditor items={c.rooms} onAdd={v=>al("rooms",v)} onRemove={v=>rl("rooms",v)}/></div>
<div className="card"><div className="sst">🔄 Frequências de Tarefas</div><TagEditor items={c.choreFreqs} onAdd={v=>al("choreFreqs",v)} onRemove={v=>rl("choreFreqs",v)}/></div>
<div className="card"><div className="sst">💳 Cartões / Formas de Pagamento</div><p style={{fontSize:12,color:"var(--text3)",marginBottom:8}}>Usados nas compras e finanças</p><TagEditor items={c.cards||[]} onAdd={v=>al("cards",v)} onRemove={v=>rl("cards",v)}/></div>
<div className="card"><div className="sst">{I.meals} Dias do Cardápio</div><p style={{fontSize:12,color:"var(--text3)",marginBottom:8}}>Quais dias aparecem no planejador</p><TagEditor items={c.mealDays} onAdd={v=>al("mealDays",v)} onRemove={v=>rl("mealDays",v)}/></div>
<div className="card"><div className="sst">🍽 Tipos de Refeição</div><p style={{fontSize:12,color:"var(--text3)",marginBottom:8}}>Café, almoço, jantar... ou o que quiser</p><TagEditor items={c.mealTypes} onAdd={v=>al("mealTypes",v)} onRemove={v=>rl("mealTypes",v)}/></div></>}

{tab==="dados"&&<><div className="card"><div className="sst">{I.download} Exportar & Importar</div><p style={{fontSize:13,color:"var(--text2)",marginBottom:16,lineHeight:1.6}}>Backup completo: configurações, itens, tarefas, gastos e cardápio.</p><div style={{display:"flex",gap:12,flexWrap:"wrap"}}><button className="btn bp" onClick={exp}>{I.download} Exportar (JSON)</button><button className="btn bg" onClick={imp}>{I.upload} Importar</button></div></div>
<div className="card"><div className="sst" style={{color:"var(--red)"}}>⚠ Zona de Perigo</div><p style={{fontSize:13,color:"var(--text3)",marginBottom:12}}>Resetar tudo para o padrão. Irreversível.</p><button className="btn bd" onClick={reset}>{I.trash} Resetar Tudo</button></div>
<div className="card"><div className="ct">Sobre</div><p style={{fontSize:13,color:"var(--text2)",lineHeight:1.7}}>Lar Centro — Hub completo de gestão doméstica. 100% customizável.</p><p style={{fontSize:12,color:"var(--text3)",marginTop:12}}>v2.0</p></div></>}
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
{!isIOS&&prompt&&<button onClick={()=>{doInstall();setShow(false);}} style={{padding:"8px 16px",borderRadius:8,fontSize:13,fontWeight:700,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#F0A050,#E88D3A)",color:"#fff",fontFamily:"'Outfit',sans-serif",whiteSpace:"nowrap"}}>Instalar</button>}
<button onClick={dismiss} style={{padding:"6px 12px",borderRadius:6,fontSize:11,fontWeight:500,border:"1px solid #2A3040",cursor:"pointer",background:"transparent",color:"#6B7390",fontFamily:"'Outfit',sans-serif"}}>Agora não</button>
</div></div></div>);
}

// ─── Sidebar Install Button (always visible until installed) ───
function SidebarInstallBtn({installHook}){
const{prompt,installed,isIOS,doInstall}=installHook;
const[showTip,setShowTip]=useState(false);
if(installed)return null;
const handleClick=()=>{if(prompt){doInstall();}else{setShowTip(true);setTimeout(()=>setShowTip(false),5000);}};
return(<div style={{padding:"0 12px 8px",position:"relative"}}>
<button onClick={handleClick} style={{width:"100%",padding:"10px 14px",borderRadius:10,border:"1px dashed var(--accent)",background:"var(--accent-glow)",color:"var(--accent)",fontSize:13,fontWeight:600,fontFamily:"'Outfit',sans-serif",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all .2s"}}>
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
Baixar App
</button>
{showTip&&<div style={{position:"absolute",bottom:"100%",left:12,right:12,marginBottom:8,padding:"10px 14px",background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:10,fontSize:12,color:"var(--text2)",lineHeight:1.5,boxShadow:"var(--shadow)",animation:"su .2s ease",zIndex:10}}>
{isIOS?"No Safari, toque no botão de compartilhar ↑ e depois \"Adicionar à Tela de Início\"":"Clique nos 3 pontinhos ⋮ do navegador e selecione \"Instalar app\" ou \"Adicionar à tela inicial\""}
</div>}
</div>);
}

// ─── MAIN APP ───
export default function App({ user, logout, saveUserData, loadUserData, houseCode, houseInfo, leaveHouse, refreshHouseInfo }){
const installHook=useInstallPrompt();
const[data,setDataRaw]=useState(()=>{const l=load();const base=l?{...DEFAULT_DATA,...l,config:{...DEFAULT_CONFIG,...(l.config||{})}}:DEFAULT_DATA;return migrateData(base);});
const[page,setPage]=useState("dashboard");const[so,setSo]=useState(false);const[tm,setTm]=useState("");

useEffect(()=>{if(user&&loadUserData){loadUserData(user.uid).then(cd=>{if(cd){const migrated=migrateData({...DEFAULT_DATA,...cd,config:{...DEFAULT_CONFIG,...(cd.config||{})}});setDataRaw(migrated);save(migrated);}});}},[user]);

const setData=useCallback((u)=>{setDataRaw(p=>{const n=typeof u==="function"?u(p):u;save(n);if(user&&saveUserData)saveUserData(user.uid,n);return n;});},[user]);
const toast=useCallback((m)=>{setTm(m);setTimeout(()=>setTm(""),2500);},[]);
const c=data.config;const tv=THEMES[c.theme]||THEMES.dark;const ac=c.accentColor||"#F0A050";
const w=c.expiryWarnDays||7;const ec=data.pantry.filter(i=>{const d=daysUntil(i.expiry);return(d<=w&&d>=0)||d<0;}).length;const pg=data.grocery.filter(i=>!i.checked).length;
const nav=[{id:"dashboard",label:"Painel",icon:I.home},{id:"pantry",label:"Despensa",icon:I.pantry,badge:ec>0?ec:null},{id:"grocery",label:"Compras",icon:I.grocery,badge:pg>0?pg:null},{id:"chores",label:"Tarefas",icon:I.chores},{id:"meals",label:"Cardápio",icon:I.meals},{id:"budget",label:"Finanças",icon:I.budget},{id:"prices",label:"Preços",icon:I.prices},{id:"settings",label:"Configurações",icon:I.settings}];
const go=(id)=>{setPage(id);setSo(false);};
return(<><style>{getCSS(tv,ac)}</style><div className="app">
<div className="mh"><button className="hb" onClick={()=>setSo(!so)}>{I.menu}</button><span style={{marginLeft:12,fontFamily:"'Playfair Display',serif",fontWeight:800,fontSize:20,background:`linear-gradient(135deg,${ac},#FFD700)`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{c.houseName}</span></div>
<nav className={`sb ${so?"open":""}`}><div className="sb-h"><div className="logo">{c.houseName}</div><div className="logo-s">gestão doméstica</div></div><div className="nav">{nav.map(n=><button key={n.id} className={`ni ${page===n.id?"a":""}`} onClick={()=>go(n.id)}>{n.icon}{n.label}{n.badge&&<span className="nb">{n.badge}</span>}</button>)}</div>
<SidebarInstallBtn installHook={installHook}/>
<div className="sb-f"><div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><span style={{fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:180}}>{user?user.displayName||user.email:data.members.join(", ")}</span>{logout&&<button className="bi" onClick={logout} title="Sair" style={{padding:4}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></button>}</div></div></nav>
{so&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:99}} onClick={()=>setSo(false)}/>}
<main className="mc">
{page==="dashboard"&&<Dashboard data={data}/>}
{page==="pantry"&&<PantryPage data={data} setData={setData} toast={toast}/>}
{page==="grocery"&&<GroceryPage data={data} setData={setData} toast={toast}/>}
{page==="chores"&&<ChoresPage data={data} setData={setData} toast={toast}/>}
{page==="meals"&&<MealsPage data={data} setData={setData} toast={toast}/>}
{page==="budget"&&<BudgetPage data={data} setData={setData} toast={toast}/>}
{page==="prices"&&<PricesPage data={data} setData={setData} toast={toast}/>}
{page==="settings"&&<SettingsPage data={data} setData={setData} toast={toast} houseCode={houseCode} houseInfo={houseInfo} leaveHouse={leaveHouse} refreshHouseInfo={refreshHouseInfo}/>}
</main></div><InstallBanner installHook={installHook}/><Toast message={tm}/></>);}
