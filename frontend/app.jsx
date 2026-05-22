// Main App
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "showRoleSwitcher": true
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Auth state:currentUser = null(未登入) | UserInfo(後端 /auth/me 或 /auth/login 回傳的物件)
  const [currentUser, setCurrentUser] = React.useState(null);
  const [authChecking, setAuthChecking] = React.useState(true);  // 第一次 mount 還在問後端

  const [userPage, setUserPage] = React.useState("overview");
  const [adminPage, setAdminPage] = React.useState("review");
  const [openCase, setOpenCase] = React.useState(null);

  // 頁面載入時跟後端問「我還記得我是誰嗎」(看 session cookie 還在不在)
  React.useEffect(() => {
    API.me()
      .then((user) => setCurrentUser(user))
      .catch(() => setCurrentUser(null))  // 401 → 未登入,正常
      .finally(() => setAuthChecking(false));
  }, []);

  async function handleLogout() {
    try { await API.logout(); } catch (_) { /* 不阻擋 UI;就算後端失聯也清本地 state */ }
    setCurrentUser(null);
  }

  if (authChecking) {
    return <div style={{display:"grid",placeItems:"center",height:"100vh",color:"#6B7280"}}>載入中…</div>;
  }

  // Render Login
  if (!currentUser) {
    return <>
      <LoginPage onLogin={setCurrentUser} />
      <TweaksPanel title="Tweaks">
        <TweakSection label="原型導覽">
          <div style={{fontSize:12,color:"#6B7280",lineHeight:1.6}}>
            選擇身分後可進入不同後台。Demo 帳號顯示於登入卡片下方。
          </div>
        </TweakSection>
      </TweaksPanel>
    </>;
  }

  const role = currentUser.role;

  // Crumbs
  const userCrumbs = {
    profile: ["AntiFraud", "使用者", "個人頁面"],
    report:  ["AntiFraud", "使用者", "通報"],
    overview:["AntiFraud", "使用者", "網址總覽"],
  };
  const adminCrumbs = {
    review:  ["AntiFraud", "管理員", "網址審核"],
    detail:  ["AntiFraud", "管理員", "網址審核", openCase?.id || ""],
    alert:   ["AntiFraud", "管理員", "警報系統"],
    aprofile:["AntiFraud", "管理員", "個人頁面"],
  };

  // Page content
  let body = null;
  if (role === "user") {
    if (userPage === "profile") body = <UserProfile user={currentUser}/>;
    if (userPage === "report")  body = <UserReport/>;
    if (userPage === "overview")body = <WebsiteOverview/>;
  } else {
    if (adminPage === "review") body = <AdminReview onOpen={(c) => { setOpenCase(c); setAdminPage("detail"); }}/>;
    if (adminPage === "detail" && openCase) body = <ReviewDetail caseData={openCase} onBack={() => setAdminPage("review")}/>;
    if (adminPage === "alert")  body = <AdminAlert/>;
    if (adminPage === "aprofile") body = <AdminProfile user={currentUser}/>;
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
          <Topbar crumbs={crumbs}/>
          {body}
        </main>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="頁面切換">
          {role === "user" && (
            <TweakSelect label="頁面" value={userPage}
              options={[
                {value:"overview",label:"網址總覽"},
                {value:"report",label:"通報"},
                {value:"profile",label:"個人頁面"},
              ]} onChange={setUserPage}/>
          )}
          {role === "admin" && (
            <TweakSelect label="頁面" value={adminPage === "detail" ? "review" : adminPage}
              options={[
                {value:"review",label:"網址審核"},
                {value:"alert",label:"警報系統"},
                {value:"aprofile",label:"個人頁面"},
              ]} onChange={(v) => { setOpenCase(null); setAdminPage(v); }}/>
          )}
          <TweakButton label="登出" onClick={handleLogout}/>
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
