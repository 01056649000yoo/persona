import { Link, NavLink, Route, Routes } from "react-router-dom";
import { appConfig } from "./lib/config";
import DashboardPage from "./pages/DashboardPage";
import PersonaSetupPage from "./pages/PersonaSetupPage";
import ConversationPage from "./pages/ConversationPage";

const navItems = [
  { to: "/", label: "대시보드", end: true },
  { to: "/persona/setup", label: "페르소나 설정" },
  { to: "/conversation", label: "대화 모드" },
];

export default function App() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">PERSONA CLASSROOM</p>
          <Link to="/" className="brand">
            {appConfig.appName}
          </Link>
          <p className="sidebar-copy">
            작가의 말투와 작품 세계를 수업용 대화 경험으로 구성하는 프론트엔드 기본 셋업입니다.
          </p>
        </div>

        <nav className="nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-card">
          <div className="sidebar-card-label">API Endpoint</div>
          <div className="sidebar-card-value">{appConfig.apiBaseUrl}</div>
          <p className="sidebar-card-copy">
            맥미니에 올린 인증, OpenAI, DB 서버를 이 주소로 연결하면 됩니다.
          </p>
        </div>
      </aside>

      <main className="content">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/persona/setup" element={<PersonaSetupPage />} />
          <Route path="/conversation" element={<ConversationPage />} />
        </Routes>
      </main>
    </div>
  );
}
