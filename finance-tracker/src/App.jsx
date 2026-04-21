// ✅ FIX 1: imports MUST come first — moved API_URL below imports
import { useState, useEffect, useRef } from "react";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const API_URL = "https://smartfinance-backend.onrender.com";// ← your Crow backend

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const CATEGORIES = ["Food","Rent","Transport","Entertainment","Health","Shopping","Utilities","Education","Travel","Other"];
const CAT_COLORS  = ["#FFE600","#FF6B35","#4ECDC4","#A78BFA","#F472B6","#34D399","#60A5FA","#FBBF24","#F87171","#94A3B8"];
const MONTHS      = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ── HELPERS ────────────────────────────────────────────────────────────────────
function buildMonthlyData(txns) {
  const map = {};
  txns.forEach(t => {
    const d   = new Date(t.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!map[key]) map[key] = { name: MONTHS[d.getMonth()], income: 0, expense: 0, year: d.getFullYear(), month: d.getMonth() };
    if (t.type === "income") map[key].income += t.amount;
    else                     map[key].expense += t.amount;
  });
  return Object.values(map).sort((a, b) => a.year - b.year || a.month - b.month);
}

function buildCategoryData(txns) {
  const map = {};
  txns.filter(t => t.type === "expense").forEach(t => {
    map[t.category] = (map[t.category] || 0) + t.amount;
  });
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

function generateInsights(txns) {
  const insights    = [];
  const totalIncome  = txns.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = txns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const ratio        = totalIncome > 0 ? totalExpense / totalIncome : 0;

  if      (ratio > 0.8) insights.push({ type: "alert", icon: "⚠️", text: "Expenses exceed 80% of income — consider cutting discretionary spend." });
  else if (ratio > 0.6) insights.push({ type: "warn",  icon: "📊", text: "You're spending 60–80% of income. Building a buffer is advised." });
  else                  insights.push({ type: "good",  icon: "✅", text: "Great discipline! You're saving over 40% of your income." });

  const catMap = {};
  txns.filter(t => t.type === "expense").forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
  const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];
  if (topCat) insights.push({ type: "info", icon: "🏷️", text: `Highest spend category: ${topCat[0]} (₹${topCat[1].toLocaleString()}).` });

  if (totalIncome > 0) {
    const rate = ((totalIncome - totalExpense) / totalIncome * 100).toFixed(1);
    insights.push({ type: "info", icon: "💰", text: `Your savings rate is ${rate}%. Aim for 20%+ for long-term wealth.` });
  }
  insights.push({ type: "tip", icon: "💡", text: "Automate a fixed transfer to savings on payday to avoid overspending." });
  return insights;
}

// ── SMALL COMPONENTS ──────────────────────────────────────────────────────────
function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start      = 0;
    const end      = Math.abs(value);
    const step     = end / (800 / 16);
    const timer    = setInterval(() => {
      start += step;
      if (start >= end) { setDisplay(end); clearInterval(timer); }
      else setDisplay(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{value < 0 ? "-" : ""}₹{display.toLocaleString()}</span>;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0d0d0d", border: "1px solid #FFE600", borderRadius: 8, padding: "10px 16px", fontSize: 13 }}>
      <p style={{ color: "#FFE600", marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color, margin: "2px 0" }}>{p.name}: ₹{p.value?.toLocaleString()}</p>)}
    </div>
  );
};

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0d0d0d", border: "1px solid #FFE600", borderRadius: 8, padding: "10px 16px", fontSize: 13 }}>
      <p style={{ color: "#FFE600" }}>{payload[0].name}</p>
      <p style={{ color: "#fff" }}>₹{payload[0].value?.toLocaleString()}</p>
    </div>
  );
};

// ── TRANSACTION TABLE ─────────────────────────────────────────────────────────
function TransactionTable({ rows, onDelete, isDark, textSecondary, textPrimary }) {
  const border = isDark ? "#1e1e1e" : "#eee";
  if (!rows.length) return (
    <div style={{ textAlign: "center", padding: 40, color: textSecondary, fontSize: 13 }}>No transactions found.</div>
  );
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr style={{ borderBottom: `1px solid ${border}` }}>
          {["Date", "Type", "Category", "Note", "Amount", ""].map(h => (
            <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: textSecondary, fontWeight: 500 }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(t => {
          const catColor = CAT_COLORS[CATEGORIES.indexOf(t.category) % CAT_COLORS.length];
          return (
            <tr key={t.id} className="txn-row" style={{ borderBottom: `1px solid ${border}`, transition: "background 0.15s" }}>
              <td style={{ padding: "12px", color: textSecondary }}>{t.date}</td>
              <td style={{ padding: "12px" }}>
                <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: 1, background: t.type === "income" ? "rgba(96,165,250,0.12)" : "rgba(255,107,53,0.12)", color: t.type === "income" ? "#60A5FA" : "#FF6B35" }}>
                  {t.type.toUpperCase()}
                </span>
              </td>
              <td style={{ padding: "12px" }}>
                <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, background: `${catColor}18`, color: catColor }}>{t.category}</span>
              </td>
              {/* ✅ FIX 5: safe guard t.note with || "" to avoid crash when note is null/undefined */}
              <td style={{ padding: "12px", color: textPrimary }}>{t.note || "—"}</td>
              <td style={{ padding: "12px", fontWeight: 700, color: t.type === "income" ? "#60A5FA" : "#FF6B35" }}>
                {t.type === "income" ? "+" : "−"}₹{t.amount.toLocaleString()}
              </td>
              <td style={{ padding: "12px" }}>
                <button className="del-btn" onClick={() => onDelete(t.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#555", fontSize: 16, transition: "color 0.2s" }}>✕</button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [txns,         setTxns]         = useState([]);
  const [activeTab,    setActiveTab]    = useState("dashboard");
  const [filter,       setFilter]       = useState("all");
  const [search,       setSearch]       = useState("");
  const [theme,        setTheme]        = useState("dark");
  const [notification, setNotification] = useState(null);
  const [animKey,      setAnimKey]      = useState(0);
  const [backendOk,    setBackendOk]    = useState(null); // null=loading, true=ok, false=error
  const [form, setForm] = useState({
    type: "expense", amount: "", category: "Food", note: "",
    date: new Date().toISOString().slice(0, 10)
  });

  // ✅ FIX 2: useRef starts at 1; will be updated after fetch
  const nextId = useRef(1);

  const isDark = theme === "dark";

  // ── FETCH ALL TRANSACTIONS ON MOUNT ────────────────────────────────────────
  // ✅ FIX 3: corrected URL to match backend route /api/transactions
  useEffect(() => {
  fetch(`${API_URL}/api/transactions`)
    .then(async (res) => {
      const contentType = res.headers.get("content-type") || "";

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      if (!contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Expected JSON but got:", text.slice(0, 200));
        throw new Error("Server did not return JSON");
      }

      return res.json();
    })
    .then((data) => {
      const list = Array.isArray(data) ? data : (data.transactions || []);
      setTxns(list);

      const maxId = list.reduce((m, t) => Math.max(m, t.id || 0), 0);
      nextId.current = maxId + 1;

      setBackendOk(true);
    })
    .catch((err) => {
      console.error("Fetch error:", err);
      setBackendOk(false);
    });
}, []);

  // ── COMPUTED ───────────────────────────────────────────────────────────────
  const totalIncome  = txns.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = txns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance      = totalIncome - totalExpense;
  const monthlyData  = buildMonthlyData(txns);
  const categoryData = buildCategoryData(txns);
  const insights     = generateInsights(txns);

  // ✅ FIX 4: safe guard note with || "" before calling .toLowerCase()
  const filteredTxns = txns
    .filter(t => filter === "all" || t.type === filter)
    .filter(t => (t.note || "").toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  // ── ADD TRANSACTION ────────────────────────────────────────────────────────
  // ✅ FIX 5: removed duplicate code block — one clean addTransaction function
  // ✅ FIX 6: corrected URL to match backend route /api/transactions (POST)
  function addTransaction() {
    if (!form.amount || isNaN(form.amount) || +form.amount <= 0) {
      showNotif("Please enter a valid amount.", "error");
      return;
    }
    const newT = { ...form, amount: +form.amount };

    fetch(`${API_URL}/api/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newT),
    })
      .then(res => res.json())
      .then(saved => {
        // backend returns the saved object with its assigned id
        setTxns(prev => [...prev, saved]);
        setForm({ type: "expense", amount: "", category: "Food", note: "", date: new Date().toISOString().slice(0, 10) });
        setAnimKey(k => k + 1);
        showNotif("Transaction added successfully!", "success");
      })
      .catch(err => {
        console.error("Add error:", err);
        showNotif("Could not reach backend. Is it running?", "error");
      });
  }

  // ── DELETE TRANSACTION ─────────────────────────────────────────────────────
  // ✅ FIX 7: deleteTransaction was placed OUTSIDE the component — moved inside
  // ✅ FIX 8: corrected URL to match backend route /api/transactions/:id (DELETE)
  function deleteTransaction(id) {
    fetch(`${API_URL}/api/transactions/${id}`, { method: "DELETE" })
      .then(res => res.json())
      .then(() => {
        setTxns(prev => prev.filter(t => t.id !== id));
        showNotif("Transaction removed.", "info");
      })
      .catch(err => {
        console.error("Delete error:", err);
        showNotif("Could not delete transaction.", "error");
      });
  }

  function showNotif(msg, type) {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  }

  // ── STYLES ─────────────────────────────────────────────────────────────────
  const bg           = isDark ? "#080808" : "#f5f5f0";
  const card         = isDark ? "#111111" : "#ffffff";
  const cardBorder   = isDark ? "#1e1e1e" : "#e5e5e0";
  const textPrimary  = isDark ? "#f0f0f0" : "#111111";
  const textSecondary= isDark ? "#888"    : "#666";
  const accent       = "#FFE600";
  const inputBg      = isDark ? "#0d0d0d"  : "#fafaf8";
  const inputBorder  = isDark ? "#333"    : "#ddd";

  const styles = {
    app:       { minHeight: "100vh", background: bg, color: textPrimary, fontFamily: "'DM Mono','Fira Code',monospace", transition: "all 0.3s" },
    header:    { borderBottom: `1px solid ${isDark?"#1a1a1a":"#e0e0da"}`, padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, position: "sticky", top: 0, background: isDark?"rgba(8,8,8,0.95)":"rgba(245,245,240,0.95)", backdropFilter: "blur(12px)", zIndex: 100 },
    logo:      { fontSize: 18, fontWeight: 700, letterSpacing: -0.5, color: textPrimary },
    logoAccent:{ color: accent },
    nav:       { display: "flex", gap: 4 },
    navBtn:    (active) => ({ padding: "8px 16px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontFamily: "inherit", letterSpacing: 1, textTransform: "uppercase", transition: "all 0.2s", background: active ? accent : "transparent", color: active ? "#000" : textSecondary, fontWeight: active ? 700 : 400 }),
    themeBtn:  { background: "transparent", border: `1px solid ${isDark?"#333":"#ccc"}`, borderRadius: 6, padding: "6px 12px", cursor: "pointer", color: textSecondary, fontSize: 14, fontFamily: "inherit" },
    main:      { maxWidth: 1200, margin: "0 auto", padding: "32px 24px" },
    statGrid:  { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 32 },
    statCard:  () => ({ background: card, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: "24px 28px", position: "relative", overflow: "hidden" }),
    statAccent:(color) => ({ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: color }),
    statLabel: { fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: textSecondary, marginBottom: 8 },
    statValue: { fontSize: 28, fontWeight: 700, letterSpacing: -1 },
    chartGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 },
    chartCard: { background: card, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: "24px 28px" },
    chartTitle:{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: textSecondary, marginBottom: 20 },
    tableCard: { background: card, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: "24px 28px", marginBottom: 32 },
    formGrid:  { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr auto", gap: 12, alignItems: "end" },
    input:     { background: inputBg, border: `1px solid ${inputBorder}`, borderRadius: 8, padding: "10px 14px", color: textPrimary, fontSize: 13, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" },
    label:     { fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: textSecondary, marginBottom: 6, display: "block" },
    addBtn:    { background: accent, border: "none", borderRadius: 8, padding: "10px 20px", color: "#000", fontWeight: 700, fontSize: 13, fontFamily: "inherit", cursor: "pointer", letterSpacing: 1, whiteSpace: "nowrap" },
    insightCard:(type) => {
      const colors = { alert:"#FF4444", warn:"#FF9500", good:"#34D399", info:"#60A5FA", tip:"#A78BFA" };
      return { background: card, border: `1px solid ${cardBorder}`, borderLeft: `3px solid ${colors[type]}`, borderRadius: 12, padding: "16px 20px", marginBottom: 12, display: "flex", alignItems: "flex-start", gap: 12 };
    },
    notif:(type) => {
      const colors = { success:"#34D399", error:"#FF4444", info: accent };
      return { position: "fixed", bottom: 24, right: 24, background: isDark?"#111":"#fff", border: `1px solid ${colors[type]}`, borderRadius: 10, padding: "14px 20px", fontSize: 13, color: textPrimary, zIndex: 9999, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", animation: "slideUp 0.3s ease" };
    },
  };

  const tabs = [
    { id: "dashboard",    label: "Dashboard" },
    { id: "transactions", label: "Transactions" },
    { id: "analytics",   label: "Analytics" },
    { id: "insights",    label: "AI Insights" },
  ];

  // Reusable add-form block
  const AddForm = () => (
    <div style={styles.tableCard}>
      <div style={styles.chartTitle}>Add Transaction</div>
      <div style={styles.formGrid}>
        <div>
          <label style={styles.label}>Type</label>
          <select style={styles.input} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>
        <div>
          <label style={styles.label}>Amount ₹</label>
          <input style={styles.input} type="number" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
        </div>
        <div>
          <label style={styles.label}>Category</label>
          <select style={styles.input} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={styles.label}>Note</label>
          <input style={styles.input} type="text" placeholder="Description..." value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
        </div>
        <div>
          <label style={styles.label}>Date</label>
          <input style={styles.input} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        </div>
        <div style={{ paddingTop: 22 }}>
          <button style={styles.addBtn} onClick={addTransaction}>+ ADD</button>
        </div>
      </div>
    </div>
  );

  // Backend status banner
  const Banner = () => {
    if (backendOk === true)  return null;
    if (backendOk === null)  return (
      <div style={{ background:"#1a1a00", border:"1px solid #FFE600", borderRadius:10, padding:"14px 20px", marginBottom:24, fontSize:13, color:"#FFE600" }}>
        ⏳ Connecting to C++ backend at <code style={{ color:"#fff" }}>localhost:18080</code>…
      </div>
    );
    return (
      <div style={{ background:"#1a0000", border:"1px solid #FF4444", borderRadius:10, padding:"16px 20px", marginBottom:24, fontSize:13, color:"#FF4444", lineHeight:1.9 }}>
        <strong>⚠ Backend not reachable</strong> — compile and start your server:<br/>
        <code style={{ color:"#fff", background:"#0d0d0d", padding:"4px 12px", borderRadius:4, display:"inline-block", marginTop:6 }}>
          g++ -std=c++17 main.cpp -lpthread -o server &amp;&amp; ./server
        </code><br/>
        <span style={{ color:"#888", fontSize:12 }}>Then refresh — the app reconnects automatically.</span>
      </div>
    );
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div style={styles.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        ::-webkit-scrollbar { width:6px; }
        ::-webkit-scrollbar-thumb { background:#333; border-radius:3px; }
        input:focus, select:focus { border-color:#FFE600 !important; }
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        .txn-row:hover  { background:rgba(255,230,0,0.04) !important; }
        .del-btn:hover  { color:#FF4444 !important; }
      `}</style>

      {/* HEADER */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoAccent}>◆</span> Smart<span style={styles.logoAccent}>Finance</span>
        </div>
        <nav style={styles.nav}>
          {tabs.map(t => (
            <button key={t.id} style={styles.navBtn(activeTab === t.id)} onClick={() => setActiveTab(t.id)}>{t.label}</button>
          ))}
        </nav>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          {/* live backend status dot */}
          <div
            title={backendOk === true ? "Backend connected ✓" : backendOk === false ? "Backend offline" : "Connecting…"}
            style={{ width:8, height:8, borderRadius:"50%", background: backendOk===true?"#34D399": backendOk===false?"#FF4444":"#FFE600" }}
          />
          <button style={styles.themeBtn} onClick={() => setTheme(isDark ? "light" : "dark")}>
            {isDark ? "☀ Light" : "◑ Dark"}
          </button>
        </div>
      </header>

      <main style={styles.main}>
        <Banner />

        {/* ── DASHBOARD ──────────────────────────────────────────────────── */}
        {activeTab === "dashboard" && (
          <div style={{ animation:"fadeIn 0.4s ease" }}>
            <div style={{ marginBottom:28 }}>
              <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:32, fontWeight:800, letterSpacing:-1, marginBottom:4 }}>Financial Overview</h1>
              <p style={{ color:textSecondary, fontSize:13 }}>Live data from your C++ Crow backend.</p>
            </div>

            {/* STAT CARDS */}
            <div style={styles.statGrid} key={animKey}>
              {[
                { label:"Total Balance",  value:balance,      color: balance >= 0 ? "#34D399" : "#FF4444" },
                { label:"Total Income",   value:totalIncome,  color:"#60A5FA" },
                { label:"Total Expenses", value:totalExpense, color:"#FF6B35" },
              ].map(s => (
                <div key={s.label} style={styles.statCard()}>
                  <div style={styles.statAccent(s.color)} />
                  <div style={{ paddingLeft:8 }}>
                    <div style={styles.statLabel}>{s.label}</div>
                    <div style={{ ...styles.statValue, color:s.color }}><AnimatedNumber value={s.value} /></div>
                  </div>
                </div>
              ))}
            </div>

            {/* CHARTS */}
            <div style={styles.chartGrid}>
              <div style={styles.chartCard}>
                <div style={styles.chartTitle}>Monthly Trend</div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={monthlyData} margin={{ top:4, right:16, left:-20, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark?"#1e1e1e":"#eee"} />
                    <XAxis dataKey="name" tick={{ fill:textSecondary, fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:textSecondary, fontSize:11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize:12, color:textSecondary }} />
                    <Line type="monotone" dataKey="income"  stroke="#60A5FA" strokeWidth={2} dot={{ r:4, fill:"#60A5FA" }} name="Income" />
                    <Line type="monotone" dataKey="expense" stroke="#FF6B35" strokeWidth={2} dot={{ r:4, fill:"#FF6B35" }} name="Expense" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={styles.chartCard}>
                <div style={styles.chartTitle}>Spending by Category</div>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                      {categoryData.map((_, i) => <Cell key={i} fill={CAT_COLORS[CATEGORIES.indexOf(_.name) % CAT_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                    <Legend wrapperStyle={{ fontSize:11, color:textSecondary }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <AddForm />

            <div style={styles.tableCard}>
              <div style={styles.chartTitle}>Recent Transactions</div>
              <TransactionTable rows={filteredTxns.slice(0, 5)} onDelete={deleteTransaction} isDark={isDark} textSecondary={textSecondary} textPrimary={textPrimary} />
            </div>
          </div>
        )}

        {/* ── TRANSACTIONS ───────────────────────────────────────────────── */}
        {activeTab === "transactions" && (
          <div style={{ animation:"fadeIn 0.4s ease" }}>
            <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:32, fontWeight:800, letterSpacing:-1, marginBottom:24 }}>All Transactions</h1>
            <AddForm />
            <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
              <input style={{ ...styles.input, width:240 }} type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
              {["all","income","expense"].map(f => (
                <button key={f} style={{ ...styles.navBtn(filter===f), border:`1px solid ${filter===f?accent:inputBorder}` }} onClick={() => setFilter(f)}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
              <span style={{ marginLeft:"auto", color:textSecondary, fontSize:12 }}>{filteredTxns.length} records</span>
            </div>
            <div style={styles.tableCard}>
              <TransactionTable rows={filteredTxns} onDelete={deleteTransaction} isDark={isDark} textSecondary={textSecondary} textPrimary={textPrimary} />
            </div>
          </div>
        )}

        {/* ── ANALYTICS ──────────────────────────────────────────────────── */}
        {activeTab === "analytics" && (
          <div style={{ animation:"fadeIn 0.4s ease" }}>
            <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:32, fontWeight:800, letterSpacing:-1, marginBottom:24 }}>Analytics</h1>
            <div style={styles.chartGrid}>
              <div style={{ ...styles.chartCard, gridColumn:"1 / -1" }}>
                <div style={styles.chartTitle}>Income vs Expense — Monthly</div>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={monthlyData} margin={{ top:4, right:24, left:-10, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark?"#1e1e1e":"#eee"} />
                    <XAxis dataKey="name" tick={{ fill:textSecondary, fontSize:12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:textSecondary, fontSize:12 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize:13, color:textSecondary }} />
                    <Line type="monotone" dataKey="income"  stroke="#60A5FA" strokeWidth={2.5} dot={{ r:5, fill:"#60A5FA" }} name="Income" />
                    <Line type="monotone" dataKey="expense" stroke="#FF6B35" strokeWidth={2.5} dot={{ r:5, fill:"#FF6B35" }} name="Expense" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={styles.chartCard}>
                <div style={styles.chartTitle}>Spend Distribution</div>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" outerRadius={100} paddingAngle={2} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                      {categoryData.map((_, i) => <Cell key={i} fill={CAT_COLORS[CATEGORIES.indexOf(_.name) % CAT_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={styles.chartCard}>
                <div style={styles.chartTitle}>Category Breakdown</div>
                {categoryData.sort((a,b) => b.value - a.value).map(c => {
                  const pct = totalExpense > 0 ? (c.value / totalExpense * 100).toFixed(1) : 0;
                  const col = CAT_COLORS[CATEGORIES.indexOf(c.name) % CAT_COLORS.length];
                  return (
                    <div key={c.name} style={{ marginBottom:14 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5, fontSize:12 }}>
                        <span style={{ color:col, fontWeight:600 }}>{c.name}</span>
                        <span style={{ color:textSecondary }}>₹{c.value.toLocaleString()} · {pct}%</span>
                      </div>
                      <div style={{ height:5, background:isDark?"#1e1e1e":"#eee", borderRadius:3, overflow:"hidden" }}>
                        <div style={{ width:`${pct}%`, height:"100%", background:col, borderRadius:3, transition:"width 0.8s ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── AI INSIGHTS ────────────────────────────────────────────────── */}
        {activeTab === "insights" && (
          <div style={{ animation:"fadeIn 0.4s ease" }}>
            <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:32, fontWeight:800, letterSpacing:-1, marginBottom:8 }}>AI Insights</h1>
            <p style={{ color:textSecondary, fontSize:13, marginBottom:28 }}>Smart suggestions based on your spending patterns.</p>

            <div style={{ ...styles.tableCard, display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:20, marginBottom:24 }}>
              {[
                { label:"Savings Rate",    value:`${totalIncome>0?((balance/totalIncome)*100).toFixed(1):0}%`, color: balance>0?"#34D399":"#FF4444" },
                { label:"Expense Ratio",  value:`${totalIncome>0?((totalExpense/totalIncome)*100).toFixed(1):0}%`, color: totalExpense/totalIncome>0.8?"#FF4444":"#FFE600" },
                { label:"Categories Used",value: categoryData.length, color:"#60A5FA" },
              ].map(s => (
                <div key={s.label} style={{ textAlign:"center", padding:"16px 0" }}>
                  <div style={{ fontSize:36, fontWeight:800, color:s.color, fontFamily:"'Syne',sans-serif" }}>{s.value}</div>
                  <div style={{ fontSize:11, letterSpacing:2, textTransform:"uppercase", color:textSecondary, marginTop:6 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {insights.map((ins, i) => (
              <div key={i} style={styles.insightCard(ins.type)}>
                <span style={{ fontSize:20, flexShrink:0, marginTop:1 }}>{ins.icon}</span>
                <p style={{ fontSize:14, lineHeight:1.6, color:textPrimary }}>{ins.text}</p>
              </div>
            ))}

            <div style={{ ...styles.tableCard, marginTop:24 }}>
              <div style={styles.chartTitle}>Budget Recommendations</div>
              {[
                { label:"50% → Needs",   desc:"Rent, Food, Utilities, Transport",  target: totalIncome * 0.5 },
                { label:"30% → Wants",   desc:"Entertainment, Shopping, Travel",   target: totalIncome * 0.3 },
                { label:"20% → Savings", desc:"Emergency fund, Investments",       target: totalIncome * 0.2 },
              ].map(r => (
                <div key={r.label} style={{ marginBottom:20 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                    <span style={{ fontSize:13, fontWeight:600, color:textPrimary }}>{r.label}</span>
                    <span style={{ fontSize:12, color:textSecondary }}>{r.desc} · ₹{r.target.toLocaleString()}/mo</span>
                  </div>
                  <div style={{ height:6, background:isDark?"#1e1e1e":"#eee", borderRadius:3 }}>
                    <div style={{ width:"100%", height:"100%", background:"linear-gradient(90deg,#FFE600,#FF6B35)", borderRadius:3 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* NOTIFICATION TOAST */}
      {notification && (
        <div style={styles.notif(notification.type)}>
          {notification.type === "success" ? "✓" : notification.type === "error" ? "✕" : "◆"} {notification.msg}
        </div>
      )}
    </div>
  );
}