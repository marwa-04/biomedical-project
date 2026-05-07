import { useState, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";

// Clinical classification logic (from Lec 9)

function calcMAP(sbp, dbp) {
  return Math.round(dbp + (sbp - dbp) / 3);
}

function classifyBP(sbp, dbp) {
  if (sbp < 90 || dbp < 60)
    return { level: "danger", label: "Hypotension", color: "#3B82F6", bg: "#EFF6FF", border: "#93C5FD" };
  if (sbp < 120 && dbp < 80)
    return { level: "normal", label: "Normal", color: "#16A34A", bg: "#F0FDF4", border: "#86EFAC" };
  if (sbp < 130 && dbp < 80)
    return { level: "elevated", label: "Elevated", color: "#D97706", bg: "#FFFBEB", border: "#FCD34D" };
  if (sbp < 140 || dbp < 90)
    return { level: "warning", label: "Stage 1 Hypertension", color: "#EA580C", bg: "#FFF7ED", border: "#FDBA74" };
  return { level: "danger", label: "Stage 2 Hypertension", color: "#DC2626", bg: "#FEF2F2", border: "#FCA5A5" };
}

function classifyHR(hr) {
  if (hr < 60) return { level: "warning", label: "Bradycardia", color: "#D97706" };
  if (hr <= 100) return { level: "normal", label: "Normal", color: "#16A34A" };
  return { level: "warning", label: "Tachycardia", color: "#EA580C" };
}

function classifyTemp(t) {
  if (t < 35) return { level: "danger", label: "Hypothermia", color: "#3B82F6" };
  if (t < 36.1) return { level: "warning", label: "Below normal", color: "#D97706" };
  if (t <= 37.2) return { level: "normal", label: "Normal", color: "#16A34A" };
  if (t <= 38) return { level: "elevated", label: "Low-grade fever", color: "#EA580C" };
  return { level: "danger", label: "Fever", color: "#DC2626" };
}

function getBPRisks(sbp, dbp) {
  const risks = [];
  if (sbp < 90 || dbp < 60) {
    risks.push("Reduced blood flow to brain and vital organs");
    risks.push("Risk of dizziness, fainting, and loss of consciousness");
    risks.push("Blurred vision and lack of concentration");
    risks.push("Cold, clammy skin and rapid shallow breathing");
  } else if (sbp >= 140 || dbp >= 90) {
    risks.push("Cerebrovascular accident (stroke) risk");
    risks.push("Hypertensive cardiomyopathy — heart muscle failure");
    risks.push("Hypertensive nephropathy — chronic renal failure");
    if (sbp >= 160) risks.push("Hypertensive encephalopathy — confusion, headache, convulsion");
    risks.push("Hypertensive retinopathy — vision damage");
  } else if (sbp >= 130 || dbp >= 80) {
    risks.push("Increased risk of cardiovascular complications over time");
    risks.push("Monitor regularly and consider lifestyle modifications");
  } else if (sbp >= 120) {
    risks.push("Elevated BP — lifestyle changes recommended");
    risks.push("Reduce sodium intake and increase physical activity");
  }
  return risks;
}

// Gauge Component

function Gauge({ value, min, max, label, unit, color, thresholds }) {
  const pct = Math.min(1, Math.max(0, (value - min) / (max - min)));
  const angle = -135 + pct * 270;
  const r = 44;
  const cx = 60, cy = 60;
  const toXY = (deg) => {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const arcPath = (startDeg, endDeg, radius, col) => {
    const s = toXY(startDeg); const e = toXY(endDeg);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return <path d={`M${s.x},${s.y} A${radius},${radius} 0 ${large},1 ${e.x},${e.y}`}
      fill="none" stroke={col} strokeWidth="7" strokeLinecap="round" />;
  };
  const needle = toXY(angle);
  return (
    <div style={{ textAlign: "center" }}>
      <svg viewBox="0 0 120 80" width="110" height="75">
        {arcPath(-135, 45, r, "#E5E7EB")}
        {arcPath(-135, -135 + pct * 270, r, color)}
        <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke="#374151" strokeWidth="2" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="3" fill="#374151" />
        <text x={cx} y={cy + 18} textAnchor="middle" fontSize="13" fontWeight="600" fill="#111827">{value}</text>
        <text x={cx} y={cy + 27} textAnchor="middle" fontSize="7" fill="#6B7280">{unit}</text>
      </svg>
      <p style={{ margin: "0", fontSize: "11px", fontWeight: 500, color: "#6B7280", letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</p>
    </div>
  );
}

// Slider Input

function VitalSlider({ label, value, min, max, step, unit, onChange, color }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
        <label style={{ fontSize: "12px", fontWeight: 500, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</label>
        <span style={{ fontSize: "20px", fontWeight: 600, color: "#111827", fontFamily: "'Courier New', monospace" }}>
          {value}<span style={{ fontSize: "11px", color: "#9CA3AF", marginLeft: "2px" }}>{unit}</span>
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: color, height: "4px", cursor: "pointer" }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#D1D5DB", marginTop: "2px" }}>
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  );
}

// Status Badge

function Badge({ label, color, bg, border }) {
  return (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: 600, background: bg, color, border: `1px solid ${border}`, letterSpacing: "0.04em" }}>
      {label}
    </span>
  );
}

// Custom Tooltip for chart

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
      <p style={{ margin: "0 0 6px", fontWeight: 600, color: "#374151" }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ margin: "2px 0", color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

// Main App
export default function PatientVitalsMonitor() {
  const [sbp, setSbp] = useState(120);
  const [dbp, setDbp] = useState(80);
  const [hr, setHr] = useState(72);
  const [temp, setTemp] = useState(36.8);
  const [patientName, setPatientName] = useState("");
  const [readings, setReadings] = useState([]);
  const [view, setView] = useState("input"); // "input" | "result" | "history"
  const [lastResult, setLastResult] = useState(null);

  const handleMeasure = useCallback(() => {
    const map = calcMAP(sbp, dbp);
    const bpClass = classifyBP(sbp, dbp);
    const hrClass = classifyHR(hr);
    const tempClass = classifyTemp(temp);
    const risks = getBPRisks(sbp, dbp);
    const now = new Date();
    const ts = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const result = { sbp, dbp, hr, temp, map, bpClass, hrClass, tempClass, risks, ts, id: Date.now() };
    setLastResult(result);
    setReadings(prev => [...prev.slice(-19), result]);
    setView("result");
  }, [sbp, dbp, hr, temp]);

  const bpClass = classifyBP(sbp, dbp);

  const chartData = readings.map((r, i) => ({
    name: r.ts,
    SBP: r.sbp,
    DBP: r.dbp,
    HR: r.hr,
    MAP: r.map,
  }));

  return (
    <div style={{ fontFamily: "'Georgia', serif", minHeight: "100vh", background: "#F9FAFB", padding: "0" }}>

      {/* Header */}
      <div style={{ background: "#0F172A", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#DC2626", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#F8FAFC", letterSpacing: "-0.01em", fontFamily: "'Georgia', serif" }}>Patient Vitals Monitor</h1>
          </div>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {["input", "result", "history"].map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{ padding: "5px 12px", borderRadius: "6px", border: "none", fontSize: "11px", fontWeight: 500, cursor: "pointer", background: view === v ? "#DC2626" : "#1E293B", color: view === v ? "#fff" : "#94A3B8", letterSpacing: "0.04em", textTransform: "capitalize" }}>
              {v === "input" ? "Measure" : v === "result" ? "Result" : "History"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: "780px", margin: "0 auto", padding: "24px 20px" }}>

        {/* ── INPUT VIEW ── */}
        {view === "input" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>

            {/* Left: sliders */}
            <div style={{ background: "#fff", borderRadius: "12px", padding: "22px", border: "1px solid #E5E7EB" }}>
              <h2 style={{ margin: "0 0 18px", fontSize: "13px", fontWeight: 600, color: "#374151", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "sans-serif" }}>Vital Signs Input</h2>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "11px", fontWeight: 500, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "sans-serif" }}>Patient name (optional)</label>
                <input value={patientName} onChange={e => setPatientName(e.target.value)}
                  placeholder="e.g. Marwa Ahmed"
                  style={{ width: "100%", marginTop: "6px", padding: "8px 10px", borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "14px", fontFamily: "'Georgia', serif", boxSizing: "border-box", outline: "none", color: "#111827" }} />
              </div>

              <div style={{ height: "1px", background: "#F3F4F6", margin: "16px 0" }} />
              <p style={{ margin: "0 0 14px", fontSize: "11px", color: "#9CA3AF", fontFamily: "sans-serif", letterSpacing: "0.04em" }}>BLOOD PRESSURE (mmHg)</p>

              <VitalSlider label="Systolic (SBP)" value={sbp} min={60} max={200} step={1} unit="mmHg" onChange={setSbp} color="#DC2626" />
              <VitalSlider label="Diastolic (DBP)" value={dbp} min={40} max={130} step={1} unit="mmHg" onChange={v => setDbp(Math.min(v, sbp - 5))} color="#F97316" />

              <div style={{ height: "1px", background: "#F3F4F6", margin: "16px 0" }} />
              <VitalSlider label="Heart Rate" value={hr} min={30} max={180} step={1} unit="bpm" onChange={setHr} color="#8B5CF6" />
              <VitalSlider label="Body Temperature" value={temp} min={34} max={42} step={0.1} unit="°C" onChange={setTemp} color="#0891B2" />

              <button onClick={handleMeasure}
                style={{ width: "100%", marginTop: "8px", padding: "12px", background: "#0F172A", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer", letterSpacing: "0.02em", fontFamily: "sans-serif" }}>
                Record Measurement →
              </button>
            </div>

            {/* Right: live preview */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ background: "#fff", borderRadius: "12px", padding: "22px", border: "1px solid #E5E7EB" }}>
                <h2 style={{ margin: "0 0 18px", fontSize: "13px", fontWeight: 600, color: "#374151", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "sans-serif" }}>Live Preview</h2>
                <div style={{ display: "flex", justifyContent: "space-around", marginBottom: "16px" }}>
                  <Gauge value={sbp} min={60} max={200} label="Systolic" unit="mmHg" color="#DC2626" />
                  <Gauge value={dbp} min={40} max={130} label="Diastolic" unit="mmHg" color="#F97316" />
                </div>
                <div style={{ display: "flex", justifyContent: "space-around" }}>
                  <Gauge value={hr} min={30} max={180} label="Heart Rate" unit="bpm" color="#8B5CF6" />
                  <Gauge value={parseFloat(temp.toFixed(1))} min={34} max={42} label="Temperature" unit="°C" color="#0891B2" />
                </div>
              </div>

              {/* Live BP status */}
              <div style={{ background: bpClass.bg, borderRadius: "12px", padding: "18px", border: `1px solid ${bpClass.border}` }}>
                <p style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: 500, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "sans-serif" }}>BP Classification</p>
                <p style={{ margin: "0 0 8px", fontSize: "20px", fontWeight: 700, color: bpClass.color, fontFamily: "'Georgia', serif" }}>{bpClass.label}</p>
                <p style={{ margin: "0", fontSize: "13px", color: "#6B7280", fontFamily: "sans-serif" }}>
                  MAP = <strong style={{ color: "#111827" }}>{calcMAP(sbp, dbp)} mmHg</strong>
                  <span style={{ fontSize: "11px", marginLeft: "6px", color: "#9CA3AF" }}>(DBP + ⅓(SBP−DBP))</span>
                </p>
              </div>

              <div style={{ background: "#F8FAFC", borderRadius: "12px", padding: "16px", border: "1px solid #E2E8F0" }}>
                <p style={{ margin: "0 0 8px", fontSize: "11px", color: "#64748B", fontFamily: "sans-serif", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>Readings logged</p>
                <p style={{ margin: 0, fontSize: "28px", fontWeight: 700, color: "#0F172A", fontFamily: "'Courier New', monospace" }}>{readings.length}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── RESULT VIEW ── */}
        {view === "result" && lastResult && (() => {
          const r = lastResult;
          return (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              {/* Left: summary */}
              <div>
                <div style={{ background: r.bpClass.bg, borderRadius: "12px", padding: "22px", border: `1px solid ${r.bpClass.border}`, marginBottom: "16px" }}>
                  {patientName && <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#6B7280", fontFamily: "sans-serif" }}>Patient: <strong style={{ color: "#374151" }}>{patientName}</strong></p>}
                  <p style={{ margin: "0 0 2px", fontSize: "11px", color: "#9CA3AF", fontFamily: "sans-serif", letterSpacing: "0.06em" }}>BLOOD PRESSURE STATUS</p>
                  <h2 style={{ margin: "0 0 10px", fontSize: "26px", fontWeight: 700, color: r.bpClass.color }}>{r.bpClass.label}</h2>
                  <div style={{ display: "flex", gap: "16px", fontFamily: "sans-serif" }}>
                    <div>
                      <p style={{ margin: "0", fontSize: "11px", color: "#9CA3AF" }}>SBP / DBP</p>
                      <p style={{ margin: "0", fontSize: "22px", fontWeight: 700, color: "#111827", fontFamily: "'Courier New', monospace" }}>{r.sbp}/{r.dbp}</p>
                      <p style={{ margin: "0", fontSize: "10px", color: "#9CA3AF" }}>mmHg</p>
                    </div>
                    <div style={{ width: "1px", background: "#E5E7EB" }} />
                    <div>
                      <p style={{ margin: "0", fontSize: "11px", color: "#9CA3AF" }}>Mean Arterial</p>
                      <p style={{ margin: "0", fontSize: "22px", fontWeight: 700, color: "#111827", fontFamily: "'Courier New', monospace" }}>{r.map}</p>
                      <p style={{ margin: "0", fontSize: "10px", color: "#9CA3AF" }}>mmHg MAP</p>
                    </div>
                  </div>
                </div>

                <div style={{ background: "#fff", borderRadius: "12px", padding: "18px", border: "1px solid #E5E7EB" }}>
                  <h3 style={{ margin: "0 0 12px", fontSize: "12px", fontWeight: 600, color: "#374151", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "sans-serif" }}>Other Vitals</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {[
                      { label: "Heart Rate", value: `${r.hr} bpm`, cls: r.hrClass },
                      { label: "Temperature", value: `${r.temp.toFixed(1)} °C`, cls: r.tempClass },
                    ].map(item => (
                      <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#F9FAFB", borderRadius: "8px", fontFamily: "sans-serif" }}>
                        <span style={{ fontSize: "13px", color: "#374151" }}>{item.label}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827", fontFamily: "'Courier New', monospace" }}>{item.value}</span>
                          <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 7px", borderRadius: "999px", background: item.cls.color + "18", color: item.cls.color }}>{item.cls.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: risks & guidance */}
              <div style={{ background: "#fff", borderRadius: "12px", padding: "22px", border: "1px solid #E5E7EB" }}>
                <h3 style={{ margin: "0 0 14px", fontSize: "12px", fontWeight: 600, color: "#374151", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "sans-serif" }}>Clinical Risk Assessment</h3>
                <p style={{ margin: "0 0 14px", fontSize: "11px", color: "#9CA3AF", fontFamily: "sans-serif" }}>Based on Lec 9 — Blood Pressure Measurement</p>

                {r.risks.length === 0 ? (
                  <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: "8px", padding: "14px" }}>
                    <p style={{ margin: 0, fontSize: "14px", color: "#16A34A", fontFamily: "sans-serif" }}>✓ All vitals within normal range. No immediate risk factors identified.</p>
                  </div>
                ) : (
                  <ul style={{ margin: "0", padding: "0", listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" }}>
                    {r.risks.map((risk, i) => (
                      <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px", padding: "10px 12px", background: "#FEF2F2", borderRadius: "8px", border: "1px solid #FECACA" }}>
                        <span style={{ color: "#DC2626", fontSize: "12px", marginTop: "1px", flexShrink: 0 }}>⚠</span>
                        <span style={{ fontSize: "13px", color: "#374151", fontFamily: "sans-serif", lineHeight: "1.5" }}>{risk}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div style={{ marginTop: "16px", padding: "12px", background: "#F8FAFC", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                  <p style={{ margin: "0", fontSize: "11px", color: "#64748B", fontFamily: "sans-serif", lineHeight: "1.6" }}>
                    <strong style={{ color: "#374151" }}>MAP = {r.map} mmHg</strong> — Normal MAP is 70–100 mmHg. Values below 70 indicate inadequate organ perfusion.
                  </p>
                </div>

                <button onClick={() => setView("input")}
                  style={{ width: "100%", marginTop: "14px", padding: "10px", background: "#0F172A", color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif" }}>
                  ← Take Another Measurement
                </button>
              </div>
            </div>
          );
        })()}

        {view === "result" && !lastResult && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#9CA3AF", fontFamily: "sans-serif" }}>
            <p style={{ fontSize: "16px" }}>No measurement recorded yet.</p>
            <button onClick={() => setView("input")} style={{ marginTop: "12px", padding: "10px 20px", background: "#0F172A", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}>Go to Measure</button>
          </div>
        )}

        {/* HISTORY VIEW */}
        {view === "history" && (
          <div>
            {readings.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#9CA3AF", fontFamily: "sans-serif" }}>
                <p>No readings yet. Take a measurement first.</p>
                <button onClick={() => setView("input")} style={{ marginTop: "12px", padding: "10px 20px", background: "#0F172A", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}>Go to Measure</button>
              </div>
            ) : (
              <>
                {/* Chart */}
                <div style={{ background: "#fff", borderRadius: "12px", padding: "22px", border: "1px solid #E5E7EB", marginBottom: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <h2 style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#374151", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "sans-serif" }}>Blood Pressure Trend</h2>
                    <button onClick={() => setReadings([])} style={{ padding: "4px 10px", background: "transparent", border: "1px solid #E5E7EB", borderRadius: "6px", fontSize: "11px", color: "#9CA3AF", cursor: "pointer", fontFamily: "sans-serif" }}>Clear</button>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} domain={[40, 200]} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                      <ReferenceLine y={120} stroke="#FCD34D" strokeDasharray="4 2" label={{ value: "120", position: "right", fontSize: 9, fill: "#D97706" }} />
                      <ReferenceLine y={90} stroke="#FCA5A5" strokeDasharray="4 2" label={{ value: "90", position: "right", fontSize: 9, fill: "#DC2626" }} />
                      <Line type="monotone" dataKey="SBP" stroke="#DC2626" strokeWidth={2} dot={{ r: 3 }} name="SBP" />
                      <Line type="monotone" dataKey="DBP" stroke="#F97316" strokeWidth={2} dot={{ r: 3 }} name="DBP" />
                      <Line type="monotone" dataKey="MAP" stroke="#8B5CF6" strokeWidth={1.5} strokeDasharray="5 3" dot={false} name="MAP" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* HR chart */}
                <div style={{ background: "#fff", borderRadius: "12px", padding: "22px", border: "1px solid #E5E7EB", marginBottom: "20px" }}>
                  <h2 style={{ margin: "0 0 16px", fontSize: "13px", fontWeight: 600, color: "#374151", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "sans-serif" }}>Heart Rate Trend</h2>
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} domain={[30, 180]} />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine y={60} stroke="#C4B5FD" strokeDasharray="4 2" />
                      <ReferenceLine y={100} stroke="#C4B5FD" strokeDasharray="4 2" />
                      <Line type="monotone" dataKey="HR" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3 }} name="HR (bpm)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Log table */}
                <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #E5E7EB", overflow: "hidden" }}>
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid #F3F4F6" }}>
                    <h2 style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#374151", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "sans-serif" }}>Reading Log ({readings.length})</h2>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", fontFamily: "sans-serif" }}>
                      <thead>
                        <tr style={{ background: "#F9FAFB" }}>
                          {["Time", "SBP", "DBP", "MAP", "HR", "Temp", "BP Status"].map(h => (
                            <th key={h} style={{ padding: "8px 14px", textAlign: "left", fontWeight: 500, color: "#6B7280", fontSize: "11px", letterSpacing: "0.04em", borderBottom: "1px solid #E5E7EB" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...readings].reverse().map((r, i) => (
                          <tr key={r.id} style={{ borderBottom: "1px solid #F3F4F6", background: i % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                            <td style={{ padding: "8px 14px", color: "#6B7280", fontFamily: "'Courier New', monospace" }}>{r.ts}</td>
                            <td style={{ padding: "8px 14px", fontWeight: 600, color: "#DC2626", fontFamily: "'Courier New', monospace" }}>{r.sbp}</td>
                            <td style={{ padding: "8px 14px", fontWeight: 600, color: "#F97316", fontFamily: "'Courier New', monospace" }}>{r.dbp}</td>
                            <td style={{ padding: "8px 14px", color: "#8B5CF6", fontFamily: "'Courier New', monospace" }}>{r.map}</td>
                            <td style={{ padding: "8px 14px", color: "#374151", fontFamily: "'Courier New', monospace" }}>{r.hr}</td>
                            <td style={{ padding: "8px 14px", color: "#0891B2", fontFamily: "'Courier New', monospace" }}>{r.temp.toFixed(1)}</td>
                            <td style={{ padding: "8px 14px" }}>
                              <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 7px", borderRadius: "999px", background: r.bpClass.bg, color: r.bpClass.color, border: `1px solid ${r.bpClass.border}` }}>
                                {r.bpClass.label}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}