import { useState, useRef, useEffect } from "react";
import { supabase } from "./supabase";
import Auth from "./Auth";
import { getTasks, createTask, completeTask as completeTaskApi } from "./api";

const QUADRANTS = [
  { id: "urgent-important",     label: "重要且紧急",   sub: "Do First",  color: "#8B5E3C", bg: "#FFF8F0", accent: "#D4956A" },
  { id: "important-not-urgent", label: "重要不紧急",   sub: "Schedule",  color: "#3C6B5A", bg: "#F0F9F5", accent: "#6BAF95" },
  { id: "urgent-not-important", label: "紧急不重要",   sub: "Delegate",  color: "#6B3C5A", bg: "#FAF0F7", accent: "#B07090" },
  { id: "not-urgent-important", label: "不重要不紧急", sub: "Eliminate", color: "#5A5A3C", bg: "#F9F9F0", accent: "#9E9E6B" },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 12)  return "Good Morning";
  if (hour >= 12 && hour < 17) return "Good Afternoon";
  if (hour >= 17 && hour < 21) return "Good Evening";
  return "Good Night";
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(160deg, #FEFBE8 0%, #FDF5DC 100%)",
    fontFamily: "'Noto Serif SC', 'Noto Sans SC', serif",
    padding: "24px 20px 40px",
    boxSizing: "border-box",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "14px",
    maxWidth: "480px",
    margin: "0 auto",
  },
  card: {
    background: "#FFFFFF",
    borderRadius: "20px",
    padding: "18px",
    boxShadow: "0 2px 12px rgba(180,155,90,0.10)",
    border: "1.5px solid #EDE5C8",
  },
  fullCard: {
    gridColumn: "1 / -1",
    background: "#FFFFFF",
    borderRadius: "20px",
    padding: "18px",
    boxShadow: "0 2px 12px rgba(180,155,90,0.10)",
    border: "1.5px solid #EDE5C8",
  },
};

export default function App() {
  // ✅ 所有 Hook 放最前面
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeCard, setActiveCard] = useState(0);
  const [tasks, setTasks] = useState(
    Object.fromEntries(QUADRANTS.map(q => [q.id, []]))
  );
  const [inputVal, setInputVal] = useState("");
  const [doneTasks, setDoneTasks] = useState([]);
  const [view, setView] = useState("main");
  const [showConfetti, setShowConfetti] = useState(false);
  const touchStartX = useRef(null);

  const today = new Date().toISOString().split("T")[0];

  // 监听登录状态
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthChecked(true);
    });
    supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
  }, []);

  // 登录后从后端加载今日任务
  useEffect(() => {
    if (!user) return;
    getTasks(user.id, today).then(data => {
      if (!Array.isArray(data)) return;
      const grouped = Object.fromEntries(QUADRANTS.map(q => [q.id, []]));
      data.forEach(task => {
        if (task.status === "todo" && grouped[task.quadrant]) {
          grouped[task.quadrant].push({ id: task.id, text: task.title });
        }
      });
      setTasks(grouped);
    });
  }, [user]);

  // ✅ early return 放在所有 Hook 之后
  if (!authChecked) return null;
  if (!user) return <Auth onLogin={setUser} />;

  const dateStr = new Date().toLocaleDateString("zh-CN", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });

  // 显示邮箱 @ 前面部分作为用户名
  const displayName = user.email?.split("@")[0] || "用户";

  const currentQ = QUADRANTS[activeCard];

  // 添加任务 → 调用后端
  const addTask = () => {
    const val = inputVal.trim();
    if (!val) return;
    createTask({
      title: val,
      quadrant: currentQ.id,
      user_id: user.id,
      planned_date: today,
    }).then(data => {
      if (!data || !data[0]) return;
      const newTask = data[0];
      setTasks(prev => ({
        ...prev,
        [currentQ.id]: [...prev[currentQ.id], { id: newTask.id, text: newTask.title }],
      }));
      setInputVal("");
    });
  };

  // 完成任务 → 调用后端
  const handleCompleteTask = (qId, taskId) => {
    const task = tasks[qId].find(t => t.id === taskId);
    completeTaskApi(taskId).then(() => {
      setTasks(prev => ({
        ...prev,
        [qId]: prev[qId].filter(t => t.id !== taskId),
      }));
      setDoneTasks(prev => [
        ...prev,
        {
          ...task,
          quadrantLabel: QUADRANTS.find(q => q.id === qId).label,
          doneAt: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 1800);
    });
  };

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (!touchStartX.current) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) setActiveCard(p => Math.min(p + 1, QUADRANTS.length - 1));
      else setActiveCard(p => Math.max(p - 1, 0));
    }
    touchStartX.current = null;
  };

  const allTodos = QUADRANTS.flatMap(q =>
    tasks[q.id].map(t => ({ ...t, quadrantLabel: q.label, qId: q.id, accent: q.accent }))
  );

  if (view === "todo") {
    return (
      <div style={styles.page}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <button onClick={() => setView("main")} style={backBtn}>← 返回</button>
          <h2 style={pageTitle}>今日 To-Do List</h2>
          {allTodos.length === 0 ? (
            <p style={emptyText}>还没有任务，去添加吧！</p>
          ) : (
            allTodos.map(task => (
              <div key={task.id} style={todoRow}>
                <div>
                  <span style={{ fontSize: 13, color: "#A08050", marginBottom: 2, display: "block" }}>{task.quadrantLabel}</span>
                  <span style={{ fontSize: 15, color: "#3A2E1A" }}>{task.text}</span>
                </div>
                <button onClick={() => handleCompleteTask(task.qId, task.id)} style={doneBtn}>完成 ✓</button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  if (view === "done") {
    return (
      <div style={styles.page}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <button onClick={() => setView("main")} style={backBtn}>← 返回</button>
          <h2 style={pageTitle}>你的成就 ✦</h2>
          {doneTasks.length === 0 ? (
            <p style={emptyText}>完成任务后会出现在这里 ✨</p>
          ) : (
            doneTasks.map((task, i) => (
              <div key={i} style={{ ...todoRow, background: "#F9FFF5" }}>
                <div>
                  <span style={{ fontSize: 13, color: "#6BAF80", marginBottom: 2, display: "block" }}>{task.quadrantLabel} · {task.doneAt}</span>
                  <span style={{ fontSize: 15, color: "#2A3E2A", textDecoration: "line-through", opacity: 0.7 }}>{task.text}</span>
                </div>
                <span style={{ fontSize: 20 }}>✦</span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {showConfetti && <Confetti />}

      <div style={{ maxWidth: 480, margin: "0 auto" }}>

        {/* Row 1: Greeting + Date */}
        <div style={styles.grid}>
          <div style={styles.card}>
            <div style={{ fontSize: 11, color: "#B8A070", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>{getGreeting()}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#3A2E1A", lineHeight: 1.2 }}>你好，</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#8B6B3C", lineHeight: 1.2 }}>{displayName}</div>
            <button onClick={() => supabase.auth.signOut()} style={{
              marginTop: 8, background: "none", border: "none",
              cursor: "pointer", fontSize: 11, color: "#B8A070",
              fontFamily: "inherit", padding: 0,
            }}>退出登录</button>
            <div style={{ marginTop: 10, width: 32, height: 2, background: "#D4B870", borderRadius: 2 }} />
          </div>

          <div style={styles.card}>
            <div style={{ fontSize: 11, color: "#B8A070", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>今日</div>
            <div style={{ fontSize: 13, color: "#3A2E1A", lineHeight: 1.8 }}>
              {dateStr.split(" ").slice(0, 2).join("")}<br />
              {dateStr.split(" ")[2] || ""}
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "#A08050" }}>📍 Tokyo &nbsp;|&nbsp; ☀️ 22°C</div>
          </div>
        </div>

        {/* Row 2: Quick Overview */}
        <div style={{ ...styles.fullCard, marginTop: 14 }}>
          <div style={{ fontSize: 11, color: "#B8A070", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>任务概览</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {QUADRANTS.map(q => (
              <div key={q.id} style={{ background: q.bg, borderRadius: 12, padding: "8px 12px", border: `1px solid ${q.accent}40` }}>
                <div style={{ fontSize: 11, color: q.color, fontWeight: 600, marginBottom: 4 }}>{q.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: q.color }}>{tasks[q.id].length}</div>
                <div style={{ fontSize: 10, color: q.accent }}>件待办</div>
              </div>
            ))}
          </div>
        </div>

        {/* Row 3: Card Stack */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, color: "#B8A070", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
            四象限卡片 &nbsp;
            <span style={{ fontSize: 11, color: "#C8B080" }}>← 滑动切换 →</span>
          </div>

          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 12 }}>
            {QUADRANTS.map((q, i) => (
              <button key={q.id} onClick={() => setActiveCard(i)} style={{
                width: i === activeCard ? 20 : 7, height: 7,
                borderRadius: 4, border: "none", cursor: "pointer",
                background: i === activeCard ? q.accent : "#D8CBA0",
                transition: "all 0.3s ease", padding: 0,
              }} />
            ))}
          </div>

          <div style={{ position: "relative", height: 320 }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {QUADRANTS.map((q, i) => {
              const offset = i - activeCard;
              const isActive = offset === 0;
              const isVisible = Math.abs(offset) <= 1;
              return (
                <div key={q.id} onClick={() => !isActive && setActiveCard(i)}
                  style={{
                    position: "absolute", top: 0, left: 0, right: 0,
                    background: q.bg, borderRadius: 20, padding: "20px",
                    border: `1.5px solid ${q.accent}60`,
                    transform: `translateX(${offset * 12}px) translateY(${Math.abs(offset) * 8}px) scale(${1 - Math.abs(offset) * 0.04})`,
                    zIndex: QUADRANTS.length - Math.abs(offset),
                    opacity: isVisible ? (isActive ? 1 : 0.6) : 0,
                    transition: "all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    cursor: isActive ? "default" : "pointer",
                    boxShadow: isActive ? `0 8px 24px ${q.accent}30` : "none",
                  }}
                >
                  {isActive && (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: q.color }}>{q.label}</div>
                          <div style={{ fontSize: 11, color: q.accent, marginTop: 2, letterSpacing: 1 }}>{q.sub}</div>
                        </div>
                        <div style={{ fontSize: 26, fontWeight: 700, color: q.accent, opacity: 0.5 }}>{tasks[q.id].length}</div>
                      </div>

                      <div style={{ minHeight: 140, maxHeight: 160, overflowY: "auto" }}>
                        {tasks[q.id].length === 0 ? (
                          <div style={{ fontSize: 13, color: q.accent, opacity: 0.6, padding: "20px 0", textAlign: "center" }}>
                            点击下方输入任务 ✦
                          </div>
                        ) : (
                          tasks[q.id].map(task => (
                            <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: `1px solid ${q.accent}25` }}>
                              <button onClick={() => handleCompleteTask(q.id, task.id)} style={{
                                width: 20, height: 20, borderRadius: "50%",
                                border: `1.5px solid ${q.accent}`,
                                background: "transparent", cursor: "pointer",
                                flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                                color: q.color, fontSize: 10, transition: "all 0.2s",
                              }}>○</button>
                              <span style={{ fontSize: 14, color: q.color, flex: 1 }}>{task.text}</span>
                            </div>
                          ))
                        )}
                      </div>

                      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        <input
                          value={inputVal}
                          onChange={e => setInputVal(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && addTask()}
                          placeholder="添加任务..."
                          style={{
                            flex: 1, padding: "9px 14px", borderRadius: 12,
                            border: `1.5px solid ${q.accent}60`,
                            background: "#FFFFFF", fontSize: 14,
                            color: q.color, outline: "none",
                            fontFamily: "inherit",
                          }}
                        />
                        <button onClick={addTask} style={{
                          padding: "9px 16px", borderRadius: 12,
                          background: q.accent, border: "none",
                          color: "#FFF", fontSize: 18, cursor: "pointer",
                          fontWeight: 700, lineHeight: 1,
                        }}>+</button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Row 4: Todo + Done boxes */}
        <div style={{ ...styles.grid, marginTop: 14 }}>
          <button onClick={() => setView("todo")} style={boxBtn("#FFF8EE", "#D4956A")}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#8B5E3C", marginBottom: 4 }}>To-Do List</div>
            <div style={{ fontSize: 11, color: "#C4956A", lineHeight: 1.5 }}>点击进入<br />今日待办</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#D4B070", marginTop: 8 }}>{allTodos.length}</div>
          </button>

          <button onClick={() => setView("done")} style={boxBtn("#F0FFF5", "#6BAF80")}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#3C6B4A", marginBottom: 4 }}>Done List</div>
            <div style={{ fontSize: 11, color: "#6BAF80", lineHeight: 1.5 }}>点击查看<br />你的成就</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#6BAF80", marginTop: 8 }}>✦ {doneTasks.length}</div>
          </button>
        </div>

      </div>
    </div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 18 }, (_, i) => ({
    left: `${Math.random() * 100}%`,
    color: ["#D4956A", "#6BAF95", "#D4B870", "#B07090", "#9E9E6B"][i % 5],
    delay: `${Math.random() * 0.5}s`,
    size: Math.random() * 8 + 5,
  }));
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, pointerEvents: "none", zIndex: 999 }}>
      <style>{`
        @keyframes fall { 0%{transform:translateY(-10px) rotate(0deg);opacity:1} 100%{transform:translateY(100vh) rotate(720deg);opacity:0} }
      `}</style>
      {pieces.map((p, i) => (
        <div key={i} style={{
          position: "absolute", left: p.left, top: 0,
          width: p.size, height: p.size, borderRadius: "2px",
          background: p.color, animation: `fall 1.6s ${p.delay} ease-in forwards`,
        }} />
      ))}
    </div>
  );
}

const backBtn = {
  background: "none", border: "none", cursor: "pointer",
  fontSize: 14, color: "#8B6B3C", padding: "0 0 16px",
  fontFamily: "inherit",
};
const pageTitle = {
  fontSize: 22, fontWeight: 700, color: "#3A2E1A", marginBottom: 16,
};
const emptyText = {
  fontSize: 14, color: "#B8A070", textAlign: "center", padding: "40px 0",
};
const todoRow = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  background: "#FFFDF5", borderRadius: 14, padding: "12px 16px",
  marginBottom: 10, border: "1px solid #EDE5C8",
};
const doneBtn = {
  background: "#3C6B4A", color: "#FFF", border: "none",
  borderRadius: 10, padding: "6px 12px", cursor: "pointer",
  fontSize: 12, fontFamily: "inherit", flexShrink: 0,
};
const boxBtn = (bg, accent) => ({
  background: bg, borderRadius: 20, padding: "18px",
  border: `1.5px solid ${accent}40`,
  cursor: "pointer", textAlign: "left",
  boxShadow: "0 2px 12px rgba(180,155,90,0.08)",
  transition: "transform 0.15s", fontFamily: "inherit",
});