import React from "react";
import "./styles.css";
import { API } from "./api/index.js";
import { Sidebar, Topbar } from "./components.jsx";
import { LoginPage, UserProfile, UserReport, WebsiteOverview } from "./user-pages.jsx";
import { AdminReview, ReviewDetail, AdminAlert, AdminProfile } from "./admin-pages.jsx";
import { useTweaks, TweaksPanel, TweakSection, TweakSelect, TweakButton } from "./tweaks-panel.jsx";

const TWEAK_DEFAULTS = { showRoleSwitcher: true };

function App() {
  useTweaks(TWEAK_DEFAULTS);
  const [currentUser, setCurrentUser] = React.useState(null);
  const [authChecking, setAuthChecking] = React.useState(true);
  const [userPage, setUserPage] = React.useState("overview");
  const [adminPage, setAdminPage] = React.useState("review");
  const [openCase, setOpenCase] = React.useState(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  React.useEffect(() => {
    API.me()
      .then((user) => setCurrentUser(user))
      .catch(() => setCurrentUser(null))
      .finally(() => setAuthChecking(false));
  }, []);

  async function handleLogout() {
    try { await API.logout(); } catch { }
    setCurrentUser(null);
  }

  if (authChecking) {
    return <div style={{ display: "grid", placeItems: "center", height: "100vh", color: "#6B7280" }}>載入中…</div>;
  }

  if (!currentUser) {
    return (
      <>
        <LoginPage onLogin={setCurrentUser} />
        <TweaksPanel title="Tweaks">
          <TweakSection label="原型導覽">
            <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.6 }}>
              選擇身分後可進入不同後台。Demo 帳號顯示於登入卡片下方。
            </div>
          </TweakSection>
        </TweaksPanel>
      </>
    );
  }

  const role = currentUser.role;

  const userCrumbs = {
    profile: ["AntiFraud", "使用者", "個人頁面"],
    report: ["AntiFraud", "使用者", "通報"],
    overview: ["AntiFraud", "使用者", "網址總覽"],
  };
  const adminCrumbs = {
    review: ["AntiFraud", "管理員", "網址審核"],
    detail: ["AntiFraud", "管理員", "網址審核", openCase?.id || ""],
    alert: ["AntiFraud", "管理員", "警報系統"],
    aprofile: ["AntiFraud", "管理員", "個人頁面"],
  };

  let body = null;
  if (role === "user") {
    if (userPage === "profile") body = <UserProfile user={currentUser} />;
    if (userPage === "report") body = <UserReport onGoToProfile={() => setUserPage("profile")} />;
    if (userPage === "overview") body = <WebsiteOverview />;
  } else {
    if (adminPage === "review") body = <AdminReview key={refreshKey} onOpen={(c) => { setOpenCase(c); setAdminPage("detail"); }} />;
    if (adminPage === "detail" && openCase) body = <ReviewDetail caseData={openCase} onBack={() => { setRefreshKey(k => k + 1); setAdminPage("review"); }} />;
    if (adminPage === "alert") body = <AdminAlert />;
    if (adminPage === "aprofile") body = <AdminProfile user={currentUser} />;
  }

  const crumbs = role === "user" ? userCrumbs[userPage] : adminCrumbs[adminPage];

  return (
    <>
      <div className="app">
        <Sidebar
          role={role}
          user={currentUser}
          page={role === "user" ? userPage : (adminPage === "detail" ? "review" : adminPage)}
          onNav={(p) => role === "user" ? setUserPage(p) : setAdminPage(p)}
          onLogout={handleLogout}
        />
        <main className="main">
          <Topbar crumbs={crumbs} />
          {body}
        </main>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="頁面切換">
          {role === "user" && (
            <TweakSelect label="頁面" value={userPage}
              options={[
                { value: "overview", label: "網址總覽" },
                { value: "report", label: "通報" },
                { value: "profile", label: "個人頁面" },
              ]} onChange={setUserPage} />
          )}
          {role === "admin" && (
            <TweakSelect label="頁面" value={adminPage === "detail" ? "review" : adminPage}
              options={[
                { value: "review", label: "網址審核" },
                { value: "alert", label: "警報系統" },
                { value: "aprofile", label: "個人頁面" },
              ]} onChange={(v) => { setOpenCase(null); setAdminPage(v); }} />
          )}
          <TweakButton label="登出" onClick={handleLogout} />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

export default App;
