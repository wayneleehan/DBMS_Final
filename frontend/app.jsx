// Main App
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "showRoleSwitcher": true
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Auth state
  const [auth, setAuth] = React.useState(null); // null | "user" | "admin"
  const [userPage, setUserPage] = React.useState("overview");
  const [adminPage, setAdminPage] = React.useState("review");
  const [openCase, setOpenCase] = React.useState(null);

  // Render Login
  if (!auth) {
    return <>
      <LoginPage onLogin={(role) => setAuth(role)} />
      <TweaksPanel title="Tweaks">
        <TweakSection label="原型導覽">
          <div style={{fontSize:12,color:"#6B7280",lineHeight:1.6}}>
            選擇身分後可進入不同後台。Demo 帳號顯示於登入卡片下方。
          </div>
        </TweakSection>
      </TweaksPanel>
    </>;
  }

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
  if (auth === "user") {
    if (userPage === "profile") body = <UserProfile/>;
    if (userPage === "report")  body = <UserReport/>;
    if (userPage === "overview")body = <WebsiteOverview/>;
  } else {
    if (adminPage === "review") body = <AdminReview onOpen={(c) => { setOpenCase(c); setAdminPage("detail"); }}/>;
    if (adminPage === "detail" && openCase) body = <ReviewDetail caseData={openCase} onBack={() => setAdminPage("review")}/>;
    if (adminPage === "alert")  body = <AdminAlert/>;
    if (adminPage === "aprofile") body = <AdminProfile/>;
  }

  const crumbs = auth === "user" ? userCrumbs[userPage] : adminCrumbs[adminPage];

  return (
    <>
      <div className="app">
        <Sidebar
          role={auth}
          page={auth === "user" ? userPage : (adminPage === "detail" ? "review" : adminPage)}
          onNav={(p) => auth === "user" ? setUserPage(p) : setAdminPage(p)}
          onLogout={() => setAuth(null)}
        />
        <main className="main">
          <Topbar crumbs={crumbs}/>
          {body}
        </main>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="角色與頁面">
          <TweakRadio label="角色" value={auth} options={[{value:"user",label:"使用者"},{value:"admin",label:"管理員"}]} onChange={setAuth}/>
          {auth === "user" && (
            <TweakSelect label="頁面" value={userPage}
              options={[
                {value:"overview",label:"網址總覽"},
                {value:"report",label:"通報"},
                {value:"profile",label:"個人頁面"},
              ]} onChange={setUserPage}/>
          )}
          {auth === "admin" && (
            <TweakSelect label="頁面" value={adminPage === "detail" ? "review" : adminPage}
              options={[
                {value:"review",label:"網址審核"},
                {value:"alert",label:"警報系統"},
                {value:"aprofile",label:"個人頁面"},
              ]} onChange={(v) => { setOpenCase(null); setAdminPage(v); }}/>
          )}
          <TweakButton label="回到登入頁" onClick={() => setAuth(null)}/>
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
