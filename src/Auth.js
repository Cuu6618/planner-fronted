import { useState } from "react";
import { supabase } from "./supabase";

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const hour = new Date().getHours();
  const greeting =
    hour >= 4 && hour < 12 ? "Good Morning" :
    hour >= 12 && hour < 17 ? "Good Afternoon" :
    hour >= 17 && hour < 21 ? "Good Evening" : "Good Night";

  const handle = async () => {
    setLoading(true);
    setMsg("");
    if (mode === "register") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setMsg(error.message);
      else setMsg("注册成功！请查收邮件验证账号，然后登录。");
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg("邮箱或密码错误");
      else onLogin(data.user);
    }
    setLoading(false);
  };

  return (
    <div style={page}>
      <div style={card}>
        <div style={greetText}>{greeting}</div>
        <div style={title}>每日计划本</div>
        <div style={sub}>{mode === "login" ? "登录你的账号" : "创建新账号"}</div>

        <input
          style={input}
          type="email"
          placeholder="邮箱"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <input
          style={input}
          type="password"
          placeholder="密码（至少6位）"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handle()}
        />

        {msg && <div style={msgBox}>{msg}</div>}

        <button style={btn} onClick={handle} disabled={loading}>
          {loading ? "处理中..." : mode === "login" ? "登录" : "注册"}
        </button>

        <button style={switchBtn} onClick={() => { setMode(mode === "login" ? "register" : "login"); setMsg(""); }}>
          {mode === "login" ? "没有账号？点击注册" : "已有账号？点击登录"}
        </button>
      </div>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  background: "linear-gradient(160deg, #FEFBE8 0%, #FDF5DC 100%)",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontFamily: "'Noto Serif SC', serif",
};
const card = {
  background: "#FFFFFF", borderRadius: 24, padding: "36px 32px",
  border: "1.5px solid #EDE5C8", width: "100%", maxWidth: 360,
  boxShadow: "0 4px 24px rgba(180,155,90,0.12)",
  display: "flex", flexDirection: "column", gap: 12,
};
const greetText = { fontSize: 11, color: "#B8A070", letterSpacing: 2, textTransform: "uppercase" };
const title = { fontSize: 26, fontWeight: 700, color: "#3A2E1A" };
const sub = { fontSize: 13, color: "#A08050", marginBottom: 8 };
const input = {
  padding: "12px 16px", borderRadius: 14, border: "1.5px solid #EDE5C8",
  fontSize: 14, color: "#3A2E1A", outline: "none",
  fontFamily: "inherit", background: "#FDFBF5",
};
const btn = {
  padding: "13px", borderRadius: 14, background: "#8B5E3C",
  border: "none", color: "#FFF", fontSize: 15, fontWeight: 700,
  cursor: "pointer", fontFamily: "inherit", marginTop: 4,
};
const switchBtn = {
  background: "none", border: "none", cursor: "pointer",
  fontSize: 13, color: "#A08050", fontFamily: "inherit", padding: 0,
};
const msgBox = {
  fontSize: 13, color: "#8B4A3C", background: "#FFF5F0",
  borderRadius: 10, padding: "10px 14px", border: "1px solid #F0C8B8",
};