/**
 * 个人资产管理系统 - 主应用 v1.1
 */
const App = (() => {
  // ====== 状态 ======
  let _currentRoute = 'login';
  let _accounts = [];
  let _snapshots = [];
  let _charts = {};

  // ====== 路由表 ======
  const ROUTES = {
    'login':        { title: '登录', render: renderLogin, needAuth: false },
    'register':     { title: '注册', render: renderRegister, needAuth: false },
    'dashboard':    { title: '资产看板', render: renderDashboard, needAuth: true },
    'accounts':     { title: '账户管理', render: renderAccounts, needAuth: true },
    'snapshots':    { title: '月度快照', render: renderSnapshots, needAuth: true },
    'snapshot-new': { title: '新增快照', render: renderSnapshotForm, needAuth: true },
    'snapshot-edit':{ title: '编辑快照', render: renderSnapshotForm, needAuth: true },
    'settings':     { title: '设置', render: renderSettings, needAuth: true }
  };

  // ====== 初始化 ======
  async function init() {
    try {
      window.addEventListener('hashchange', handleRoute);
      // 检查 Supabase 会话
      const { data: { session } } = await supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY).auth.getSession();
      if (session) {
        navigate('dashboard');
      } else {
        navigate('login');
      }
    } catch (e) {
      console.error('初始化失败:', e);
      document.getElementById('app').innerHTML =
        `<div style="padding:40px;text-align:center;color:#F44336">
          <h2>数据初始化失败</h2><p>${e.message}</p>
          <button onclick="location.reload()" style="margin-top:16px;padding:8px 24px;background:#1976D2;color:#fff;border:none;border-radius:8px;cursor:pointer">重试</button>
        </div>`;
    }
  }

  async function _isLoggedIn() {
    const { data: { session } } = await supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY).auth.getSession();
    return !!session;
  }

  function navigate(route, params = {}) {
    const hash = '#' + route + (Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '');
    if (window.location.hash !== hash) { window.location.hash = hash; }
    else { handleRoute(); }
  }

  async function handleRoute() {
    const hash = window.location.hash.slice(1) || 'dashboard';
    const [base, qs] = hash.split('?');
    const params = Object.fromEntries(new URLSearchParams(qs));
    const route = ROUTES[base] || ROUTES['dashboard'];
    if (route.needAuth && !(await _isLoggedIn())) { navigate('login'); return; }
    _currentRoute = base;
    route.render(params);
    document.querySelectorAll('.nav-item').forEach(el => {
      const h = el.getAttribute('data-route');
      el.classList.toggle('active', h === base || (h === 'snapshots' && (base === 'snapshot-new' || base === 'snapshot-edit')));
    });
  }

  function renderLayout(title, contentFn) {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="app-layout">
        <aside class="sidebar">
          <div class="sidebar-header"><h2>💰 资产管理</h2><div class="version">v${CONFIG.VERSION}</div></div>
          <nav class="sidebar-nav">
            <div class="nav-section">概览</div>
            <a class="nav-item" data-route="dashboard" onclick="App.navigate('dashboard')"><span class="icon">📊</span><span>资产看板</span></a>
            <div class="nav-section">管理</div>
            <a class="nav-item" data-route="accounts" onclick="App.navigate('accounts')"><span class="icon">🏦</span><span>账户管理</span></a>
            <a class="nav-item" data-route="snapshots" onclick="App.navigate('snapshots')"><span class="icon">📅</span><span>月度快照</span></a>
            <a class="nav-item" data-route="investments" onclick="Utils.showToast('投资追踪模块（P2）即将推出','info')"><span class="icon">📈</span><span>投资追踪</span></a>
            <div class="nav-section">系统</div>
            <a class="nav-item" data-route="settings" onclick="App.navigate('settings')"><span class="icon">⚙️</span><span>设置</span></a>
            <a class="nav-item" onclick="App._logout()"><span class="icon">🚪</span><span>退出登录</span></a>
          </nav>
        </aside>
        <main class="main-content"><div id="pageContent"></div></main>
      </div>`;
    const pc = document.getElementById('pageContent');
    pc.innerHTML = `<div class="page-header"><div><h1>${title}</h1></div></div>`;
    contentFn(pc);
  }

  // ======================== 登录页 ========================
  // ======================== 登录/注册页 ========================
  function renderLogin() {
    document.getElementById('app').innerHTML = `
      <div class="login-page">
        <div class="login-card">
          <div class="login-lock-icon">&#x1f512;</div>
          <h1>个人资产管理</h1>
          <p>邮箱登录</p>
          <div id="loginContent"></div>
        </div>
      </div>`;
    const c = document.getElementById('loginContent');
    c.innerHTML = `<div class="input-group"><label>邮箱</label><input type="email" id="loginEmail" placeholder="your@email.com"></div>
      <div class="input-group"><label>密码</label><input type="password" id="loginPwd" placeholder="请输入密码"></div>
      <button class="btn btn-primary" id="loginBtn" style="width:100%;justify-content:center;padding:12px">&#x1f513; 登录</button>
      <p style="margin-top:12px;font-size:12px;color:#999;text-align:center" id="loginError"></p>
      <p style="text-align:center;font-size:13px;margin-top:8px">没有账号？<a href="#register" style="color:#1976D2;cursor:pointer">注册</a></p>`;
    const email = c.querySelector('#loginEmail'), pwd = c.querySelector('#loginPwd'),
          btn = c.querySelector('#loginBtn'), err = c.querySelector('#loginError');
    async function doLogin() {
      const client = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
      const { error } = await client.auth.signInWithPassword({ email: email.value, password: pwd.value });
      if (error) { err.textContent = '&#x26a0;&#xfe0f; ' + (error.message === 'Invalid login credentials' ? '邮箱或密码错误' : error.message); return; }
      Utils.showToast('&#x2705; 欢迎回来！');
      navigate('dashboard');
    }
    btn.onclick = doLogin;
    [email, pwd].forEach(el => el.onkeydown = (ev) => { if (ev.key === 'Enter') doLogin(); });
    setTimeout(() => email.focus(), 100);
  }

  function renderRegister() {
    document.getElementById('app').innerHTML = `
      <div class="login-page">
        <div class="login-card">
          <div class="login-lock-icon">&#x1f4dd;</div>
          <h1>注册账号</h1>
          <p>创建你的 Coffer 账户</p>
          <div id="regContent"></div>
        </div>
      </div>`;
    const c = document.getElementById('regContent');
    c.innerHTML = `<div class="input-group"><label>邮箱</label><input type="email" id="regEmail" placeholder="your@email.com"></div>
      <div class="input-group"><label>密码（至少6位）</label><input type="password" id="regPwd1" placeholder="请输入密码"></div>
      <div class="input-group"><label>确认密码</label><input type="password" id="regPwd2" placeholder="再次输入密码"></div>
      <button class="btn btn-primary" id="regBtn" style="width:100%;justify-content:center;padding:12px">&#x1f4dd; 注册</button>
      <p style="margin-top:12px;font-size:12px;color:#999;text-align:center" id="regError"></p>
      <p style="text-align:center;font-size:13px;margin-top:8px">已有账号？<a href="#login" style="color:#1976D2;cursor:pointer">登录</a></p>`;
    const email = c.querySelector('#regEmail'), p1 = c.querySelector('#regPwd1'),
          p2 = c.querySelector('#regPwd2'), btn = c.querySelector('#regBtn'), err = c.querySelector('#regError');
    async function doReg() {
      if (!email.value) { err.textContent = '请输入邮箱'; return; }
      if (p1.value.length < 6) { err.textContent = '密码至少6位'; return; }
      if (p1.value !== p2.value) { err.textContent = '两次密码不一致'; return; }
      const client = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
      const { error } = await client.auth.signUp({ email: email.value, password: p1.value });
      if (error) { err.textContent = '&#x26a0;&#xfe0f; ' + error.message; return; }
      Utils.showToast('&#x2705; 注册成功！首次登录将创建默认账户');
      await DB.Accounts.initDefaults();
      navigate('dashboard');
    }
    btn.onclick = doReg;
    [email, p1, p2].forEach(el => el.onkeydown = (ev) => { if (ev.key === 'Enter') doReg(); });
  }

  async function _logout() {
    const client = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    await client.auth.signOut();
    navigate('login');
  }

  // ======================== 资产看板 ========================
  async function renderDashboard() {
    _accounts = await DB.Accounts.getAll(); _normalizeAccounts(_accounts);
    _snapshots = await DB.Snapshots.getAll();
    const sorted = [..._snapshots].sort((a,b)=>(b.year-a.year)||(b.month-a.month));
    const latest = sorted[0], prev = _getPrevOf(latest);

    renderLayout('资产看板', (container) => {
      const t = latest?.summaryCalculated?.totalAssets||0, f = latest?.summaryCalculated?.fundAssets||0;
      const i = latest?.summaryCalculated?.investAssets||0, n = latest?.summaryCalculated?.insureAssets||0;
      const pv = prev?.summaryCalculated?.totalAssets||0, pc = pv?((t-pv)/pv*100):0;
      const cards = document.createElement('div'); cards.className = 'stat-cards';
      cards.innerHTML = `
        <div class="stat-card color-total"><div class="label">总资产</div><div class="value">${Utils.formatMoney(t)}</div><div class="change ${pc>=0?'up':'down'}">${Utils.formatPercent(pc)}</div></div>
        <div class="stat-card color-fund"><div class="label">账户资金结余</div><div class="value">${Utils.formatMoney(f)}</div></div>
        <div class="stat-card color-invest"><div class="label">理财资金结余</div><div class="value">${Utils.formatMoney(i)}</div></div>
        <div class="stat-card color-insure"><div class="label">保障资金结余</div><div class="value">${Utils.formatMoney(n)}</div></div>`;
      container.appendChild(cards);

      if (_snapshots.length === 0) {
        container.innerHTML += `<div class="card"><div class="empty-state"><div class="icon">📊</div><h3>还没有月度数据</h3><p>先去「月度快照」录入你的第一份资产快照吧</p><button class="btn btn-primary" onclick="App.navigate('snapshot-new')" style="margin-top:16px">+ 新增快照</button></div></div>`;
        return;
      }

      // ① 资产构成环图  + ② 按机构分布
      const g1 = document.createElement('div'); g1.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px';
      g1.innerHTML=`<div class="card"><div class="card-title">资产构成</div><div id="chartPie" class="chart-container" style="height:280px"></div></div>
        <div class="card"><div class="card-title">按机构分布</div><div id="chartPlatform" class="chart-container" style="height:280px"></div></div>`;
      container.appendChild(g1);

      // ③ 总资产趋势堆叠
      const trendCard = document.createElement('div'); trendCard.className='card';
      trendCard.innerHTML='<div class="card-title">月度总资产趋势</div><div id="chartTrend" class="chart-container" style="height:360px"></div>';
      container.appendChild(trendCard);

      // ④ 理财构成堆叠图（按月变化） + 风险分级
      const g2 = document.createElement('div'); g2.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px';
      g2.innerHTML=`<div class="card"><div class="card-title">理财资产构成 · 月度变化</div><div id="chartInvestBar" class="chart-container" style="height:300px"></div></div>
        <div class="card"><div class="card-title">理财风险分级</div><div id="chartRisk" class="chart-container" style="height:280px"></div></div>`;
      container.appendChild(g2);

      // ⑤ 月度收支汇总
      const incCard = document.createElement('div'); incCard.className='card';
      if (latest) {
        const bd = _calcBalanceForSnapshot(latest);
        const r = latest.income||0, e = latest.expense||0, net = r-e, pl = bd.investPL;
        const totalChg = net + pl; // 当月的总变动
        const absV = Math.abs(r)+Math.abs(e)+Math.abs(pl);
        const rPct = absV ? (r/absV*100).toFixed(1) : 0;
        const ePct = absV ? (e/absV*100).toFixed(1) : 0;
        const pPct = absV ? (Math.abs(pl)/absV*100).toFixed(1) : 0;
        incCard.innerHTML = `
          <div class="card-title">月度收支 · ${Utils.getYearMonthLabel(latest.year, latest.month)}</div>
          <div style="display:flex;gap:24px;margin-bottom:12px;flex-wrap:wrap">
            <div><span style="color:#999">总结余变化</span><br><strong style="font-size:22px">${Utils.formatMoney(totalChg, true)}</strong></div>
            <div><span style="color:#999">收入 (${rPct}%)</span><br><strong style="color:var(--income-color);font-size:18px">${Utils.formatMoney(r, true)}</strong></div>
            <div><span style="color:#999">支出 (${ePct}%)</span><br><strong style="color:var(--expense-color);font-size:18px">${Utils.formatMoney(e)}</strong></div>
            <div><span style="color:#999">理财盈亏 (${pPct}%)</span><br><strong style="color:var(--pl-color);font-size:18px">${Utils.formatMoney(pl, true)}</strong></div>
          </div>
          <div style="height:28px;display:flex;border-radius:6px;overflow:hidden;margin-bottom:12px">
            ${r>0?`<div style="background:var(--income-color);flex:${r};display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;min-width:0">收入</div>`:''}
            ${e>0?`<div style="background:var(--expense-color);flex:${e};display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;min-width:0">支出</div>`:''}
            ${Math.abs(pl)>0?`<div style="background:var(--pl-color);flex:${Math.abs(pl)};display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;min-width:0">理财盈亏</div>`:''}
          </div>
          ${bd.isBalanced?'':`<div class="balance-check warn">⚠️ 数据不平，差异 ${Utils.formatMoney(bd.diff)}</div>`}`;
      } else { incCard.innerHTML = '<div class="empty-state"><p>暂无月度数据</p></div>'; }
      container.appendChild(incCard);

      setTimeout(() => {
        drawPieChart(f,i,n); drawPlatformChart(latest); drawTrendChart();
        drawInvestStackedBar(); drawRiskChart(latest);
      }, 100);
    });
  }

  // ======================== 图表绘制 ========================

  function drawPieChart(fund, invest, insure) {
    const el = document.getElementById('chartPie'); if (!el) return;
    const c = echarts.init(el); _charts.pie = c;
    c.setOption({ ...Utils.getChartTheme(), tooltip:{trigger:'item',formatter:'{b}: {c} ({d}%)'},
      series:[{ type:'pie', radius:['40%','70%'], label:{show:true,formatter:'{b}\n{d}%'},
        data:[
          {value:Math.round(fund*100)/100,name:'账户资金',itemStyle:{color:CONFIG.CHART_COLORS.FUND}},
          {value:Math.round(invest*100)/100,name:'理财资金',itemStyle:{color:CONFIG.CHART_COLORS.INVEST}},
          {value:Math.round(insure*100)/100,name:'保障资金',itemStyle:{color:CONFIG.CHART_COLORS.INSURE}}]}]});
  }

  function drawPlatformChart(latest) {
    const el = document.getElementById('chartPlatform'); if (!el) return;
    const c = echarts.init(el); _charts.platform = c;
    const platforms = Utils.getPlatforms(_accounts);
    if (!latest || platforms.length===0) { c.setOption({...Utils.getChartTheme(),xAxis:{type:'category',data:[]},yAxis:{type:'value'},series:[{type:'bar',data:[]}]}); return; }
    const bal = latest.accountBalances||{}, am = {}; _accounts.forEach(a=>{am[a.id]=a;});
    const pd = {}; platforms.forEach(p=>{pd[p]=0;}); pd['其他']=0;
    Object.entries(bal).forEach(([aid,amt])=>{ const a=am[aid]; if(!a)return; const adj=amt*a.ratio; const p=a.platform||'其他'; if(pd[p]!==undefined){ if(a.type==='liability') pd[p]-=adj; else pd[p]+=adj; }});
    const sorted = Object.entries(pd).filter(([,v])=>v!==0).sort((a,b)=>b[1]-a[1]);
    c.setOption({...Utils.getChartTheme(), tooltip:{trigger:'axis',formatter:(p)=>`${p[0].name}<br/>${Utils.formatMoney(p[0].value)}`},
      xAxis:{type:'category',data:sorted.map(s=>s[0]),axisLabel:{rotate:30}},
      yAxis:{type:'value',axisLabel:{formatter:(v)=>`¥${(v/10000).toFixed(1)}w`}},
      series:[{type:'bar',data:sorted.map(s=>({value:Math.round(s[1]*100)/100,itemStyle:{color:CONFIG.CHART_COLORS.FUND}})),barMaxWidth:40}]});
  }

  function drawTrendChart() {
    const el = document.getElementById('chartTrend'); if (!el) return;
    const c = echarts.init(el); _charts.trend = c;
    const s = [..._snapshots].sort((a,b)=>(a.year-b.year)||(a.month-b.month));
    const lbs = s.map(x=>`${x.month}月`), fd = s.map(x=>x.summaryCalculated?.fundAssets||0), id = s.map(x=>x.summaryCalculated?.investAssets||0), nd = s.map(x=>x.summaryCalculated?.insureAssets||0);
    c.setOption({...Utils.getChartTheme(), tooltip:{trigger:'axis',formatter:(p)=>{let t=0;let h=`<strong>${p[0].axisValueLabel}</strong><br/>`;p.forEach(x=>{h+=`${x.marker} ${x.seriesName}: ${Utils.formatMoney(x.value)}<br/>`;t+=x.value;});h+=`<strong>合计: ${Utils.formatMoney(t)}</strong>`;return h;}},
      legend:{data:['账户资金','理财资金','保障资金']}, grid:{left:60,right:20,bottom:40,top:40},
      xAxis:{type:'category',data:lbs,boundaryGap:false},
      yAxis:{type:'value',axisLabel:{formatter:(v)=>`¥${(v/10000).toFixed(0)}w`}},
      series:[
        {name:'账户资金',type:'line',stack:'total',areaStyle:{color:'rgba(79,195,247,0.4)'},lineStyle:{color:CONFIG.CHART_COLORS.FUND,width:2},itemStyle:{color:CONFIG.CHART_COLORS.FUND},data:fd},
        {name:'理财资金',type:'line',stack:'total',areaStyle:{color:'rgba(255,167,38,0.4)'},lineStyle:{color:CONFIG.CHART_COLORS.INVEST,width:2},itemStyle:{color:CONFIG.CHART_COLORS.INVEST},data:id},
        {name:'保障资金',type:'line',stack:'total',areaStyle:{color:'rgba(102,187,106,0.4)'},lineStyle:{color:CONFIG.CHART_COLORS.INSURE,width:2},itemStyle:{color:CONFIG.CHART_COLORS.INSURE},data:nd}]});
  }

  // 理财构成 → 堆叠条形图（月度变化）
  function drawInvestStackedBar() {
    const el = document.getElementById('chartInvestBar'); if (!el) return;
    const c = echarts.init(el); _charts.investBar = c;
    const s = [..._snapshots].sort((a,b)=>(a.year-b.year)||(a.month-b.month));
    const invAccs = _accounts.filter(a=>a.category1===CONFIG.CATEGORY1.INVEST);
    // 收集所有出现的二级分类
    const allCat2 = new Set(); invAccs.forEach(a=>allCat2.add(a.category2));
    const cat2List = [...allCat2];

    const colorMap = {
      [CONFIG.CATEGORY2.FIXED_INCOME]: CONFIG.CHART_COLORS.INVEST_FIXED,
      [CONFIG.CATEGORY2.FUND]: CONFIG.CHART_COLORS.INVEST_FUND,
      [CONFIG.CATEGORY2.GOLD]: CONFIG.CHART_COLORS.INVEST_GOLD,
      [CONFIG.CATEGORY2.STOCK]: CONFIG.CHART_COLORS.INVEST_STOCK
    };

    const series = cat2List.map(cat2 => ({
      name: cat2,
      type: 'bar',
      stack: 'invest',
      barMaxWidth: 32,
      itemStyle: { color: colorMap[cat2] || '#90A4AE' },
      data: s.map(snap => {
        const bal = snap.accountBalances||{};
        let total = 0;
        invAccs.filter(a=>a.category2===cat2).forEach(a=>{ total += (bal[a.id]||0)*a.ratio; });
        return Math.round(total*100)/100;
      })
    }));

    c.setOption({...Utils.getChartTheme(), tooltip:{trigger:'axis',formatter:(p)=>{let h=`<strong>${p[0].axisValueLabel}</strong><br/>`;let t=0;p.forEach(x=>{h+=`${x.marker} ${x.seriesName}: ${Utils.formatMoney(x.value)}<br/>`;t+=x.value;});h+=`<strong>合计: ${Utils.formatMoney(t)}</strong>`;return h;}},
      legend:{data:cat2List,type:'scroll',bottom:0},
      grid:{left:60,right:20,bottom:60,top:20},
      xAxis:{type:'category',data:s.map(x=>`${x.month}月`)},
      yAxis:{type:'value',axisLabel:{formatter:(v)=>`¥${(v/10000).toFixed(1)}w`}},
      series: series.length ? series : [{name:'暂无数据',type:'bar',stack:'invest',data:[]}]
    });
  }

  function drawRiskChart(latest) {
    const el = document.getElementById('chartRisk'); if (!el) return;
    const c = echarts.init(el); _charts.risk = c;
    if (!latest) { c.setOption(Utils.getChartTheme()); return; }
    const bal = latest.accountBalances||{}, invAccs = _accounts.filter(a=>a.category1===CONFIG.CATEGORY1.INVEST);
    let fluid=0, steady=0, prog=0;
    invAccs.forEach(a=>{ const amt = (bal[a.id]||0)*a.ratio; if(amt<=0)return;
      if(a.riskCat==='fluid') fluid+=amt; else if(a.riskCat==='steady') steady+=amt; else prog+=amt; });
    c.setOption({...Utils.getChartTheme(), tooltip:{trigger:'item',formatter:'{b}: {c} ({d}%)'},
      series:[{type:'pie',radius:['40%','70%'],label:{show:true,formatter:'{b}\n{d}%'},
        data:[
          {value:Math.round(fluid*100)/100,name:'流动性(随时可取)',itemStyle:{color:'#90A4AE'}},
          {value:Math.round(steady*100)/100,name:'稳健型(低风险)',itemStyle:{color:'#26A69A'}},
          {value:Math.round(prog*100)/100,name:'进取型(高风险)',itemStyle:{color:'#EF5350'}}]}]});
  }

  // ======================== 账户管理 ========================
  async function renderAccounts() {
    _accounts = await DB.Accounts.getAll(); _normalizeAccounts(_accounts);
    renderLayout('账户管理', async (container) => {
      container.innerHTML += `<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="App.showAccountPicker()">+ 新增账户</button>
        <button class="btn btn-secondary" onclick="App.resetDefaults()" style="font-size:12px">恢复默认模板</button>
        <span style="font-size:12px;color:#999;line-height:36px;margin-left:8px">💡 可拖拽调整排序 | 点击分类名可改名</span>
      </div>`;

      const cats1 = Utils.getCategories1();
      for (const cat1 of cats1) {
        const settings = await _getCategorySettings(cat1);
        const filteredCat2 = _getActiveCategories(cat1, settings);
        const accs = _accounts.filter(a => a.category1 === cat1).sort((a,b)=>(a.sortOrder||999)-(b.sortOrder||999));
        const cat1Tag = cat1===CONFIG.CATEGORY1.FUND?'tag-fund':cat1===CONFIG.CATEGORY1.INVEST?'tag-invest':'tag-insure';
        const defaults = Utils.getCategories2(cat1);
        const hasDeletedDefaults = defaults.some(c => settings.deleted.includes(cat1 + '|' + c)) || Object.keys(settings.renamed).some(k => k.startsWith(cat1 + '|'));

        const section = document.createElement('div'); section.className='card';
        let headerHtml = '<div class="card-title" style="display:flex;align-items:center;gap:8px"><span class="tag ' + cat1Tag + '">' + cat1 + '</span> <span style="font-size:13px;color:#999;font-weight:normal">' + accs.length + '个账户</span>';
        headerHtml += '<button class="btn btn-sm btn-secondary" style="margin-left:auto;font-size:11px;padding:2px 8px" onclick="App._inlineAddCat(this, \'' + cat1 + '\')">+ 新增分类</button>';
        if (hasDeletedDefaults) headerHtml += '<button class="btn btn-sm btn-secondary" style="font-size:11px;padding:2px 8px" onclick="App._restoreCategoryDefaults(\'' + cat1 + '\').then(() => App.renderAccounts())">🔄 恢复默认</button>';
        headerHtml += '</div>';
        section.innerHTML = headerHtml;

        // 如果有账户但分类为空 → 显示未知分类
        const cat2Set = new Set(filteredCat2);

        // 分离已知分类和旧/未知分类
        const groups = {};
        const unknownGroup = [];
        accs.forEach(a => {
          const k = a.category2||'其他';
          if (cat2Set.has(k)) { if(!groups[k]) groups[k]=[]; groups[k].push(a); }
          else { unknownGroup.push(a); }
        });
        Object.keys(groups).forEach(k => groups[k].sort((a,b)=>(a.sortOrder||999)-(b.sortOrder||999)));

        // 按 active 分类顺序展示折叠页
        filteredCat2.forEach(cat2 => {
          const items = groups[cat2] || [];
          const subTotal = items.length;
          const isEmpty = items.length === 0;
          const isExpandable = items.length > 0;

          const grp = document.createElement('div');
          grp.style.cssText = 'margin-bottom:4px;border:1px solid var(--border);border-radius:8px;overflow:hidden';
          grp.innerHTML = `
            <div class="cat2-header" style="display:flex;align-items:center;gap:8px;padding:6px 12px;background:#FAFBFC;cursor:pointer;user-select:none;font-size:13px"
                 onclick="var b=this.nextElementSibling;b.style.display=b.style.display==='none'?'':'none';this.querySelector('.arrow').textContent=b.style.display==='none'?'▶':'▼'">
              <span class="arrow" style="font-size:10px;color:#999">${isExpandable?'▼':' '}</span>
              <span style="font-size:14px;font-weight:500;cursor:pointer" title="点击修改名称"
                    onclick="event.stopPropagation();App._inlineEditCat(this,'${cat1}','${cat2}')">${cat2}</span>
              <span style="flex:1"></span>
              ${isEmpty ? '<span style="color:#999;font-size:12px">（空）</span><button class="btn btn-sm btn-secondary" style="margin-left:auto;font-size:11px;padding:2px 8px" onclick="event.stopPropagation();App.showAccountForm(null,\'' + cat1 + '\',\'' + cat2 + '\')">+ 新增</button>' : ''}
              ${isExpandable ? '<span style="font-size:11px;color:#999;margin-left:auto;margin-right:8px">' + subTotal + '个</span>' : ''}
              <button class="btn btn-sm btn-danger" style="font-size:11px;padding:2px 6px"
                      onclick="event.stopPropagation();App._deleteCategory('${cat1}','${cat2}').then(r=>{if(r!==false) App.renderAccounts();})">🗑️ 删除</button>
            </div>
            <div style="${isExpandable?'':'display:none'}" class="cat2-body"></div>`;
          if (items.length > 0) {
            const tbl = _buildAccountTable(items, cat1, cat2);
            grp.querySelector('.cat2-body').appendChild(tbl);
          }
          section.appendChild(grp);
        });

        // 旧/未知分类（不匹配任何现有分类的账户）
        if (unknownGroup.length > 0) {
          const grp = document.createElement('div');
          grp.style.cssText = 'margin-bottom:4px;border:1px solid var(--border);border-radius:8px;overflow:hidden';
          grp.innerHTML = `
            <div class="cat2-header" style="display:flex;align-items:center;gap:8px;padding:6px 12px;background:#FAFBFC;font-size:13px"
                 onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'':'none';this.querySelector('.arrow').textContent=this.nextElementSibling.style.display==='none'?'▶':'▼'">
              <span class="arrow" style="font-size:10px;color:#999">▼</span>
              <span>⚠️ 旧分类（需迁移）</span><span style="font-size:11px;color:#999">' + unknownGroup.length + '个</span>
            </div>`;
          const tbl = _buildAccountTable(unknownGroup, cat1, '');
          grp.appendChild(tbl);
          section.appendChild(grp);
        }

        if (filteredCat2.length === 0 && unknownGroup.length === 0) {
          section.innerHTML += '<p style="color:#999;font-size:13px;padding:8px">暂无分类，点击上方 [+ 新增分类] 添加</p>';
        }

        container.appendChild(section);
      }

      // 按机构汇总
      const pc = document.createElement('div'); pc.className='card';
      pc.innerHTML = '<div class="card-title">按机构汇总</div>';
      const plats = Utils.getPlatforms(_accounts);
      // Add "暂无机构" section for accounts without platform
      const noPlatformAccounts = _accounts.filter(a => !a.platform);
      const allRows = [];
      // Existing platforms
      plats.forEach(p => {
        const aas = _accounts.filter(a => a.platform === p);
        const tags = aas.map(a => '<span class="tag tag-low" style="margin:2px;font-size:11px">' + a.name + '</span>').join('');
        allRows.push('<tr><td><strong>' + p + '</strong></td><td>' + aas.length + '</td><td style="font-size:12px">' + tags + '</td></tr>');
      });
      // "暂无机构" row
      if (noPlatformAccounts.length > 0) {
        const tags = noPlatformAccounts.map(a => '<span class="tag tag-low" style="margin:2px;font-size:11px">' + a.name + '</span>').join('');
        allRows.push('<tr><td><span style="color:#999">暂无机构</span></td><td>' + noPlatformAccounts.length + '</td><td style="font-size:12px">' + tags + '</td></tr>');
      }
      if (allRows.length === 0) {
        pc.innerHTML += '<p style="color:#999;font-size:13px;padding:8px">暂无账户</p>';
      } else {
        const tbl = document.createElement('table'); tbl.className='data-table';
        tbl.innerHTML = '<thead><tr><th>机构</th><th>账户数</th><th>包含账户</th></tr></thead><tbody>' + allRows.join('') + '</tbody></table>';
        pc.appendChild(tbl);
      }
      container.appendChild(pc);
    });
  }

  
  // 构建可拖拽排序的账户表格
  function _buildAccountTable(items, cat1, cat2) {
    const table = document.createElement('table'); table.className='data-table';
    table.innerHTML = `<thead><tr><th style="width:30px">⠏</th><th>名称</th><th>所属机构</th><th>计入比例</th><th>风险类型</th><th style="width:170px">操作</th></tr></thead><tbody>
      ${items.map((a, idx) => {
        const riskInfo = CONFIG.RISK_TAGS[a.riskCat] || {label:'-',cls:''};
        const typeIcon = a.type==='liability'?'<span class="tag tag-high">负债</span>':'';
        return `<tr draggable="true"
          data-accid="${a.id}"
          data-sortorder="${a.sortOrder||0}"
          style="cursor:grab"
          ondragstart="App._dragStart(event,this)"
          ondragover="App._dragOver(event)"
          ondrop="App._drop(event,this)"
          ondragend="App._dragEnd(event)">
          <td style="color:#bbb;font-size:16px;text-align:center">⠏</td>
          <td><strong>${a.name}</strong> ${typeIcon}</td>
          <td>${a.platform||'-'}</td>
          <td>${Math.round(a.ratio*100)}%</td>
          <td><span class="tag ${riskInfo.cls||'tag-low'}">${riskInfo.label}</span></td>
           <td><div style="display:flex;gap:4px;white-space:nowrap"><button class="btn btn-sm btn-secondary" style="white-space:nowrap" onclick="App.showAccountForm('${a.id}')">✏️ 修改</button>
            <button class="btn btn-sm btn-danger" style="white-space:nowrap" onclick="App.deleteAccount('${a.id}','${a.name}')">🗑️ 删除</button></div></td>
        </tr>`;
      }).join('')}</tbody></table>`;
    return table;
  }

// ======================== 月度快照列表 ========================
  async function renderSnapshots() {
    _accounts = await DB.Accounts.getAll(); _normalizeAccounts(_accounts);
    _snapshots = await DB.Snapshots.getAll();
    renderLayout('月度快照', (container) => {
      container.innerHTML += `<div style="display:flex;gap:8px;margin-bottom:16px">
        <button class="btn btn-primary" onclick="App.navigate('snapshot-new')">+ 新增月度快照</button>
        <span style="font-size:13px;color:#999;line-height:36px">已记录 ${_snapshots.length} 个月</span></div>`;
      if (_snapshots.length===0) {
        container.innerHTML += `<div class="card"><div class="empty-state"><div class="icon">📅</div><h3>还没有月度快照</h3><p>录入第一份数据，开始追踪你的资产变化</p></div></div>`; return;
      }
      const sorted = [..._snapshots].sort((a,b)=>(b.year-a.year)||(b.month-a.month));
      const tbl = document.createElement('div'); tbl.className='card';
      tbl.innerHTML = `<table class="data-table"><thead><tr><th>月份</th><th>总资产</th><th>账户</th><th>理财</th><th>保障</th><th>收支结余</th><th>理财盈亏</th><th>校核</th><th>记录日</th><th style="width:100px">操作</th></tr></thead><tbody>
        ${sorted.map(s=>{const bi=_calcBalanceForSnapshot(s);const ci=bi.isBalanced?'✅':'⚠️';const ni=(s.income||0)-(s.expense||0);const recDate=s.recordDate?Utils.formatDate(s.recordDate):'-';
          return `<tr><td><strong>${s.year}.${String(s.month).padStart(2,'0')}</strong></td>
            <td>${Utils.formatMoney(s.summaryCalculated?.totalAssets||0)}</td>
            <td>${Utils.formatMoney(s.summaryCalculated?.fundAssets||0)}</td>
            <td>${Utils.formatMoney(s.summaryCalculated?.investAssets||0)}</td>
            <td>${Utils.formatMoney(s.summaryCalculated?.insureAssets||0)}</td>
            <td>${Utils.formatMoney(ni,true)}</td>
            <td>${Utils.formatMoney(bi.investPL,true)}</td><td>${ci}</td>
            <td style="font-size:12px;color:#999">${recDate}</td>
            <td><button class="btn btn-sm btn-secondary" onclick="App.navigate('snapshot-edit',{id:${s.id}})">✏️</button>
              <button class="btn btn-sm btn-danger" onclick="App.deleteSnapshot(${s.id})">🗑️</button></td></tr>`;
        }).join('')}</tbody></table>`;
      container.appendChild(tbl);
    });
  }

  // ======================== 快照表单 ========================
  async function renderSnapshotForm(params) {
    _accounts = await DB.Accounts.getAll(); _normalizeAccounts(_accounts);
    const editId = params.id ? parseInt(params.id) : null;
    let editingSnapshot = null;
    if (editId) editingSnapshot = await DB.Snapshots.get(editId);

    const isEdit = !!editingSnapshot;
    const title = isEdit ? `编辑快照 · ${Utils.getYearMonthLabel(editingSnapshot.year, editingSnapshot.month)}` : '新增月度快照';

    // 读取草稿（仅新增模式）
    let draftData = null;
    if (!isEdit) {
      try {
        const raw = localStorage.getItem(CONFIG.DRAFT_KEY);
        if (raw) draftData = JSON.parse(raw);
      } catch(e) {}
    }

    renderLayout(title, (container) => {
      const now = new Date();
      const defaultYear = editingSnapshot?.year || draftData?.year || now.getFullYear();
      const defaultMonth = editingSnapshot?.month || draftData?.month || now.getMonth() + 1;
      const existingBalances = editingSnapshot?.accountBalances || draftData?.accountBalances || {};
      const draftIncome = draftData?.income;
      const draftExpense = draftData?.expense;
      const draftPL = draftData?.investPL;
      const draftNote = draftData?.note;
      const draftDate = draftData?.recordDate;

      const form = document.createElement('div'); form.className='card';
      form.innerHTML = `
        <form id="snapshotForm">
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
            ${!isEdit ? `<button type="button" class="btn btn-sm btn-danger" id="clearDraftBtn" style="font-size:12px">🗑️ 清空草稿</button>` : ''}
          </div>
          <div class="form-inline">
            <div class="form-group"><label>年份</label><select class="form-control" name="year" id="snapYear">${[defaultYear-1,defaultYear,defaultYear+1].map(y=>`<option value="${y}" ${y===defaultYear?'selected':''}>${y}年</option>`).join('')}</select></div>
            <div class="form-group"><label>月份</label><select class="form-control" name="month" id="snapMonth">${Array.from({length:12},(_,i)=>i+1).map(m=>`<option value="${m}" ${m===defaultMonth?'selected':''}>${m}月</option>`).join('')}</select></div>
            <div class="form-group"><label>记录日期</label><input type="date" class="form-control" name="recordDate" value="${editingSnapshot?.recordDate||draftDate||now.toISOString().slice(0,10)}"></div>
          </div>

          <div style="border-top:1px solid var(--border);padding-top:16px;margin-top:8px" id="balanceSection">
            <h3 style="font-size:15px;margin-bottom:12px">各账户余额</h3>
            <div id="balanceFields"></div>
          </div>

          <div style="border-top:1px solid var(--border);padding-top:16px;margin-top:8px">
            <h3 style="font-size:15px;margin-bottom:12px">月度汇总</h3>
            <div class="form-inline">
              <div class="form-group"><label>本月收入（¥）</label><input type="number" class="form-control" name="income" step="0.01" value="${editingSnapshot?.income??draftIncome??0}"></div>
              <div class="form-group"><label>本月支出（¥）</label><input type="number" class="form-control" name="expense" step="0.01" value="${editingSnapshot?.expense??draftExpense??0}"></div>
              <div class="form-group"><label>理财盈亏（¥）</label><input type="number" class="form-control" name="investPL" step="0.01" value="${editingSnapshot?.investmentPL?.manualOverride??editingSnapshot?.investmentPL?.autoCalculated??draftPL??0}"></div>
            </div>
            <div class="form-group"><label>备注（如该月大额收支说明）</label><textarea class="form-control" name="note" rows="2" placeholder="记录该月的特殊情况、大额收支等">${editingSnapshot?.note||draftNote||''}</textarea></div>
          </div>

          <div id="balanceCheckResult" style="margin-top:12px"></div>

          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px;border-top:1px solid var(--border);padding-top:16px">
            <button type="button" class="btn btn-secondary" id="exitBtn">返回</button>
            <button type="submit" class="btn btn-primary">${isEdit?'💾 保存修改':'💾 保存快照'}</button>
          </div>
        </form>`;
      container.appendChild(form);

      // 构建折叠式余额输入区
      const bf = document.getElementById('balanceFields');
      const cats1 = Utils.getCategories1();
      const sortedAccounts = [..._accounts].sort((a,b)=>(a.sortOrder||999)-(b.sortOrder||999));

      cats1.forEach(cat1 => {
        const accs = sortedAccounts.filter(a=>a.category1===cat1);
        if (accs.length===0) return;
        const tagCls = cat1===CONFIG.CATEGORY1.FUND?'tag-fund':cat1===CONFIG.CATEGORY1.INVEST?'tag-invest':'tag-insure';

        // 分类折叠头
        const sec = document.createElement('div');
        sec.style.cssText = 'margin-bottom:8px;border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden';
        sec.innerHTML = `
          <div class="cat1-header" style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#F5F7FA;cursor:pointer;font-size:14px;font-weight:600"
               onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'':'none';this.querySelector('.c1arrow').textContent=this.nextElementSibling.style.display==='none'?'▶':'▼'">
            <span class="c1arrow" style="font-size:10px">▼</span>
            <span class="tag ${tagCls}" style="font-size:12px">${cat1}</span>
            <span style="margin-left:auto;font-size:13px;color:#666" id="subtotal_${cat1}">合计: ¥0.00</span>
          </div>
          <div style="padding:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px">`;

        const body = sec.querySelector('div:last-child');

        accs.forEach(acc => {
          const ratioStr = acc.ratio<1 ? ` (计入${Math.round(acc.ratio*100)}%)` : '';
          const isLiab = acc.type==='liability';
          const riskInfo = CONFIG.RISK_TAGS[acc.riskCat] || {label:''};
          const grp = document.createElement('div'); grp.className='form-group'; grp.style.marginBottom=0;
          grp.innerHTML = `
            <label style="font-size:12px">${acc.name}${ratioStr}
              <span style="font-size:10px;color:#999"> · ${riskInfo.label||acc.category2}</span>
              ${isLiab?'<span class="tag tag-high" style="font-size:10px;margin-left:4px">负债</span>':''}
            </label>
            <input type="number" class="form-control balance-input" data-accid="${acc.id}" data-cat1="${cat1}"
              step="0.01" placeholder="${isLiab?'负债金额':'金额'}"
              value="${existingBalances[acc.id]||''}"
              onfocus="this.step='0.01'" onchange="this.value=parseFloat(this.value||0).toFixed(2)">
          `;
          body.appendChild(grp);
        });

        bf.appendChild(sec);
      });

      // 实时统计分类小计
      function updateSubtots() {
        cats1.forEach(cat1 => {
          const el = document.getElementById(`subtotal_${cat1}`);
          if (!el) return;
          const inputs = bf.querySelectorAll(`.balance-input[data-cat1="${cat1}"]`);
          let total = 0;
          inputs.forEach(inp => {
            const val = parseFloat(inp.value)||0;
            const acc = _accounts.find(a=>a.id===parseInt(inp.dataset.accid));
            if (!acc) return;
            const adjusted = val * acc.ratio;
            if (acc.type === 'liability') total -= adjusted;
            else total += adjusted;
          });
          el.textContent = `合计: ${Utils.formatMoney(total)}`;
        });
        _realtimeBalanceCheck(editId);
      }

      // 监听所有输入变化更新小计
      bf.querySelectorAll('.balance-input').forEach(el => {
        el.addEventListener('input', updateSubtots);
        el.addEventListener('change', updateSubtots);
      });
      form.querySelectorAll('[name="income"],[name="expense"],[name="investPL"]').forEach(el => {
        el.addEventListener('input', () => _realtimeBalanceCheck(editId));
      });

      // 表单提交 — 先清除草稿再提交
      form.querySelector('#snapshotForm').onsubmit = async (e) => {
        e.preventDefault();
        // 清除草稿
        localStorage.removeItem(CONFIG.DRAFT_KEY);
        await _saveSnapshot(editId);
      };

      // 退出时保存草稿
      function saveDraftAndGo() {
        const draft = _collectDraftData();
        if (!isEdit && draft) {
          localStorage.setItem(CONFIG.DRAFT_KEY, JSON.stringify(draft));
          Utils.showToast('📝 已保存草稿', 'info');
        }
        navigate('snapshots');
      }

      form.querySelector('#exitBtn').onclick = saveDraftAndGo;

      // 清空草稿
      const clearBtn = document.getElementById('clearDraftBtn');
      if (clearBtn) {
        clearBtn.onclick = async () => {
          const ok = await Utils.showConfirm('清空草稿', '确定要清空当前填写的所有数据吗？');
          if (ok) {
            localStorage.removeItem(CONFIG.DRAFT_KEY);
            form.querySelectorAll('.balance-input').forEach(el => el.value = '');
            form.querySelector('[name="income"]').value = '0';
            form.querySelector('[name="expense"]').value = '0';
            form.querySelector('[name="investPL"]').value = '0';
            form.querySelector('[name="note"]').value = '';
            updateSubtots();
            Utils.showToast('草稿已清空');
          }
        };
      }

      // 初始计算小计
      setTimeout(updateSubtots, 50);
    });
  }

  function _collectDraftData() {
    const year = parseInt(document.getElementById('snapYear')?.value);
    const month = parseInt(document.getElementById('snapMonth')?.value);
    const recordDate = document.querySelector('[name="recordDate"]')?.value || '';
    const accountBalances = {};
    document.querySelectorAll('.balance-input').forEach(inp => {
      const v = parseFloat(inp.value);
      if (!isNaN(v) && v !== 0) accountBalances[inp.dataset.accid] = v;
    });
    const income = parseFloat(document.querySelector('[name="income"]')?.value) || 0;
    const expense = parseFloat(document.querySelector('[name="expense"]')?.value) || 0;
    const investPL = parseFloat(document.querySelector('[name="investPL"]')?.value) || 0;
    const note = document.querySelector('[name="note"]')?.value || '';
    if (Object.keys(accountBalances).length === 0 && income === 0 && expense === 0) return null;
    return { year, month, recordDate, accountBalances, income, expense, investPL, note };
  }

  async function _saveSnapshot(editId) {
    const year = parseInt(document.getElementById('snapYear').value);
    const month = parseInt(document.getElementById('snapMonth').value);
    const recordDate = document.querySelector('[name="recordDate"]')?.value || '';

    const accountBalances = {};
    document.querySelectorAll('.balance-input').forEach(inp => {
      const v = parseFloat(inp.value);
      if (!isNaN(v) && v !== 0) accountBalances[inp.dataset.accid] = v;
    });

    const income = parseFloat(document.querySelector('[name="income"]').value) || 0;
    const expense = parseFloat(document.querySelector('[name="expense"]').value) || 0;
    const investPL = parseFloat(document.querySelector('[name="investPL"]').value) || 0;
    const note = document.querySelector('[name="note"]')?.value || '';

    const summary = await DB.Snapshots.calculateSummary({ accountBalances }, _accounts);

    const data = {
      year, month, recordDate, accountBalances, income, expense, note,
      investmentPL: { autoCalculated: investPL, manualOverride: null, note: '' },
      summaryCalculated: summary
    };

    try {
      if (editId) { await DB.Snapshots.update(editId, data); Utils.showToast('✅ 已更新！'); }
      else { await DB.Snapshots.add(data); Utils.showToast('✅ 已保存！'); }
      navigate('snapshots');
    } catch(e) { Utils.showToast(e.message, 'error'); }
  }

  function _realtimeBalanceCheck(editId) {
    const el = document.getElementById('balanceCheckResult');
    if (!el) return;
    let fundT=0, invT=0, insT=0;
    document.querySelectorAll('.balance-input').forEach(inp => {
      const v=parseFloat(inp.value)||0, aid=parseInt(inp.dataset.accid), a=_accounts.find(x=>x.id===aid);
      if(!a)return; const adj=v*a.ratio;
      if(a.type==='liability'){if(a.category1===CONFIG.CATEGORY1.FUND)fundT-=adj;else if(a.category1===CONFIG.CATEGORY1.INVEST)invT-=adj;}
      else{if(a.category1===CONFIG.CATEGORY1.FUND)fundT+=adj;else if(a.category1===CONFIG.CATEGORY1.INVEST)invT+=adj;else if(a.category1===CONFIG.CATEGORY1.INSURE)insT+=adj;}
    });
    const total=fundT+invT+insT;
    const income=parseFloat(document.querySelector('[name="income"]')?.value)||0;
    const expense=parseFloat(document.querySelector('[name="expense"]')?.value)||0;
    const pl=parseFloat(document.querySelector('[name="investPL"]')?.value)||0;
    const sorted=[..._snapshots].sort((a,b)=>(b.year-a.year)||(b.month-a.month));
    const prev=sorted.length>0&&(!editId||sorted[0].id!==editId)?(sorted[0].summaryCalculated?.totalAssets||0):0;
    const assetChange=prev>0?total-prev:0, net=income-expense, exp=net+pl;
    const diff=Math.round((assetChange-exp)*100)/100, bal=Math.abs(diff)<=CONFIG.BALANCE_THRESHOLD;
    el.innerHTML=`<div style="background:#FAFBFC;padding:12px 16px;border-radius:8px;font-size:13px">
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:4px">
        <span>总资产 <strong>${Utils.formatMoney(total)}</strong></span>
        <span>上期 <strong>${Utils.formatMoney(prev)}</strong></span>
        <span>变动 <strong>${Utils.formatMoney(assetChange,true)}</strong></span>
        <span>结余${Utils.formatMoney(net,true)} + 理财盈亏${Utils.formatMoney(pl,true)} = ${Utils.formatMoney(exp,true)}</span></div>
      <div class="balance-check ${bal?'pass':'fail'}" style="margin:0">
        ${bal?'✅ 数据平衡':`⚠️ 数据不平，差异 ${Utils.formatMoney(diff)}`}</div></div>`;
  }

  // ======================== 设置页 ========================
  async function renderSettings() {
    _accounts = await DB.Accounts.getAll(); _normalizeAccounts(_accounts);
    _snapshots = await DB.Snapshots.getAll();
    renderLayout('设置', (c) => {
      c.innerHTML = `
        <div class="card"><div class="card-title">🔐 安全设置</div>
          <form id="pwdForm"><div class="form-inline">
            <div class="form-group"><label>当前密码</label><input type="password" class="form-control" id="oldPwd"></div>
            <div class="form-group"><label>新密码</label><input type="password" class="form-control" id="newPwd"></div>
            <div class="form-group"><label>确认新密码</label><input type="password" class="form-control" id="confirmPwd"></div>
          </div><button type="submit" class="btn btn-primary">修改密码</button><span id="pwdMsg" style="margin-left:12px;font-size:13px"></span></form>
        </div>
        <div class="card"><div class="card-title">📤 数据导出</div>
          <p style="font-size:13px;color:#666;margin-bottom:12px">导出所有数据为 JSON 文件，可在其他电脑上导入恢复。</p>
          <button class="btn btn-primary" id="exportBtn">📥 导出全部数据</button>
        </div>
        <div class="card"><div class="card-title">📥 数据导入</div>
          <p style="font-size:13px;color:#666;margin-bottom:12px">从备份 JSON 文件恢复数据。<strong style="color:#F44336">覆盖导入将替换当前所有数据！</strong></p>
          <div style="display:flex;gap:12px;flex-wrap:wrap">
            <label class="btn btn-secondary" style="cursor:pointer">📂 选择备份文件<input type="file" id="importFile" accept=".json" style="display:none"></label>
            <select id="importMode" class="form-control" style="width:auto"><option value="overwrite">覆盖导入</option><option value="merge">增量合并</option></select>
          </div><div id="importResult" style="margin-top:12px"></div>
        </div>
        <div class="card"><div class="card-title">📊 数据统计</div>
          <div class="form-inline">
            <div>账户：<strong>${_accounts.length}</strong></div>
            <div>快照：<strong>${_snapshots.length}</strong></div>
            <div>最新：<strong>${_snapshots.length>0?Utils.getYearMonthLabel(_snapshots.sort((a,b)=>(b.year-a.year)||(b.month-a.month))[0].year,_snapshots[0].month):'暂无'}</strong></div>
          </div>
        </div>
        <div class="card"><div class="card-title">ℹ️ 关于</div>
          <p style="font-size:13px;color:#666"><strong>个人资产管理</strong> v${CONFIG.VERSION}<br>纯前端，本地 IndexedDB + 密码锁<br>支持数据导出/导入备份</p>
        </div>`;

      // 密码修改
      c.querySelector('#pwdForm').onsubmit = async(e)=>{
        e.preventDefault();
        const old = document.getElementById('oldPwd').value, np = document.getElementById('newPwd').value, cp = document.getElementById('confirmPwd').value, msg = document.getElementById('pwdMsg');
        const cur = await DB.Settings.get('password');
        if(old!==cur){msg.textContent='⚠️ 当前密码错误';msg.style.color='#F44336';return;}
        if(np.length<4){msg.textContent='⚠️ 至少4位';msg.style.color='#F44336';return;}
        if(np!==cp){msg.textContent='⚠️ 两次不一致';msg.style.color='#F44336';return;}
        await DB.Settings.set('password',np); msg.textContent='✅ 已更新';msg.style.color='#4CAF50';
        document.getElementById('oldPwd').value='';document.getElementById('newPwd').value='';document.getElementById('confirmPwd').value='';
      };

      // 导出
      c.querySelector('#exportBtn').onclick = async()=>{
        try{const d=await DB.DataIO.exportAll();Utils.downloadFile(JSON.stringify(d,null,2),`pa_backup_${new Date().toISOString().slice(0,10)}.json`);Utils.showToast('✅ 导出成功');}
        catch(e){Utils.showToast('导出失败: '+e.message,'error');}
      };

      // 导入
      c.querySelector('#importFile').onchange = async(e)=>{
        const file=e.target.files[0], res=document.getElementById('importResult');
        if(!file)return;
        try{
          const text=await Utils.readFileAsText(file), data=JSON.parse(text), mode=document.getElementById('importMode').value;
          const preview={accounts:data.accounts?.length||0,snapshots:data.snapshots?.length||0};
          const confirmed=await Utils.showConfirm(mode==='overwrite'?'⚠️ 确认覆盖':'确认合并',`文件:${file.name}<br>账户:${preview.accounts}个 | 快照:${preview.snapshots}个`);
          if(!confirmed){res.innerHTML='<p style="color:#999">已取消</p>';return;}
          if(mode==='overwrite') await DB.DataIO.importAll(data,'overwrite');
          else await DB.DataIO.mergeImport(data);
          res.innerHTML='<p style="color:#4CAF50;font-weight:500">✅ 导入成功！</p>';Utils.showToast('✅ 导入成功！');
        }catch(e){res.innerHTML=`<p style="color:#F44336">⚠️ 导入失败: ${e.message}</p>`;Utils.showToast('导入失败','error');}
        e.target.value='';
      };
    });
  }

  // 安全关闭弹窗
  function _closeOverlay(el) {
    if (!el) return;
    try { el.innerHTML = ""; el.style.display = "none"; el.remove(); } catch(e) {}
    try { if (el.parentNode) el.parentNode.removeChild(el); } catch(e) {}
  }
  // ======================== 二级分类管理（内联操作） ========================

  async function _getCategorySettings(cat1) {
    let custom = [], deleted = [], renamed = {};
    try { const r = await DB.Settings.get('customCategories'); if (r) custom = JSON.parse(r); } catch(e) {}
    try { const r = await DB.Settings.get('deletedCategories'); if (r) deleted = JSON.parse(r); } catch(e) {}
    try { const r = await DB.Settings.get('renamedCategories'); if (r) renamed = JSON.parse(r); } catch(e) {}
    return { custom, deleted, renamed };
  }

  function _getActiveCategories(cat1, settings) {
    const defaults = Utils.getCategories2(cat1);
    const custom = settings.custom.filter(c => c.startsWith(cat1 + '|')).map(c => c.split('|')[1]);
    const renamed = settings.renamed || {};
    const deleted = settings.deleted || [];
    // 默认分类：排除已删除，应用重命名
    const active = defaults
      .filter(c => !deleted.includes(cat1 + '|' + c))
      .map(c => renamed[cat1 + '|' + c] || c);
    return [...active, ...custom.filter(c => !active.includes(c))];
  }

  async function _addCategory(cat1, name) {
    const s = await _getCategorySettings(cat1);
    const key = cat1 + '|' + name;
    if (!s.custom.includes(key)) s.custom.push(key);
    await DB.Settings.set('customCategories', JSON.stringify(s.custom));
    // 如果之前被删除过，取消删除
    if (s.deleted.includes(key)) {
      s.deleted = s.deleted.filter(k => k !== key);
      await DB.Settings.set('deletedCategories', JSON.stringify(s.deleted));
    }
  }

  async function _renameCategory(cat1, oldName, newName) {
    const s = await _getCategorySettings(cat1);
    const defaults = Utils.getCategories2(cat1);
    const key = cat1 + '|' + oldName;
    const newKey = cat1 + '|' + newName;
    // 更新所有使用旧名称的账户
    _accounts = await DB.Accounts.getAll(); _normalizeAccounts(_accounts);
    for (const acc of _accounts.filter(a => a.category1 === cat1 && a.category2 === oldName)) {
      await DB.Accounts.update(acc.id, { category2: newName });
    }
    if (defaults.includes(oldName)) {
      // 默认分类改名 → 记录映射
      s.renamed[key] = newName;
      await DB.Settings.set('renamedCategories', JSON.stringify(s.renamed));
    } else {
      // 自定义分类改名 → 更新 custom
      s.custom = s.custom.filter(c => c !== key);
      if (!s.custom.includes(newKey)) s.custom.push(newKey);
      await DB.Settings.set('customCategories', JSON.stringify(s.custom));
    }
    // 同步更新 QUICK_ACCOUNTS 映射 (如果该分类下有账户模板)
    Utils.showToast('✅ 已重命名为 "' + newName + '"');
  }

  async function _deleteCategory(cat1, name) {
    const s = await _getCategorySettings(cat1);
    const defaults = Utils.getCategories2(cat1);
    const key = cat1 + '|' + name;
    _accounts = await DB.Accounts.getAll(); _normalizeAccounts(_accounts);
    const count = _accounts.filter(a => a.category1 === cat1 && a.category2 === name).length;
    if (count > 0) {
      if (!await Utils.showConfirm('删除分类', '「' + name + '」下有 ' + count + ' 个账户，确定删除？')) return false;
      // 清空这些账户的二级分类
      for (const acc of _accounts.filter(a => a.category1 === cat1 && a.category2 === name)) {
        await DB.Accounts.update(acc.id, { category2: '' });
      }
    }
    if (defaults.includes(name)) {
      // 默认分类 → 标记删除
      if (!s.deleted.includes(key)) s.deleted.push(key);
      // 清除重命名
      if (s.renamed[key]) delete s.renamed[key];
      await DB.Settings.set('deletedCategories', JSON.stringify(s.deleted));
      await DB.Settings.set('renamedCategories', JSON.stringify(s.renamed));
    } else {
      // 自定义分类 → 直接移除
      s.custom = s.custom.filter(c => c !== key);
      await DB.Settings.set('customCategories', JSON.stringify(s.custom));
    }
    _accounts = await DB.Accounts.getAll(); _normalizeAccounts(_accounts);
    return true;
  }

  async function _restoreCategoryDefaults(cat1) {
    const s = await _getCategorySettings(cat1);
    // 清除该大类下所有自定义改动
    s.custom = s.custom.filter(c => !c.startsWith(cat1 + '|'));
    s.deleted = s.deleted.filter(c => !c.startsWith(cat1 + '|'));
    Object.keys(s.renamed).forEach(k => { if (k.startsWith(cat1 + '|')) delete s.renamed[k]; });
    await DB.Settings.set('customCategories', JSON.stringify(s.custom));
    await DB.Settings.set('deletedCategories', JSON.stringify(s.deleted));
    await DB.Settings.set('renamedCategories', JSON.stringify(s.renamed));
    Utils.showToast('✅ 已恢复默认分类');
  }

  // 内联编辑分类名称
  function _inlineEditCat(el, cat1, cat2) {
    const oldName = el.textContent.trim();
    const input = document.createElement('input');
    input.className = 'form-control';
    input.value = oldName;
    input.style.cssText = 'font-size:13px;font-weight:500;padding:2px 6px;width:120px;border:2px solid #42A5F5';
    el.replaceWith(input);
    input.select();
    input.onblur = () => { cancelEdit(); };
    const handler = async (e) => {
      if (e.key === 'Enter') {
        const newName = input.value.trim();
        if (newName && newName !== oldName) {
          await _renameCategory(cat1, oldName, newName);
        }
        cancelEdit();
      } else if (e.key === 'Escape') {
        cancelEdit();
      }
    };
    function cancelEdit() {
      input.removeEventListener('keydown', handler);
      if (input.parentNode) {
        const span = document.createElement('span');
        span.textContent = oldName;
        span.style.cssText = 'font-size:14px;font-weight:500;cursor:pointer';
        span.title = '点击修改名称';
        const parent = input.parentNode;
        parent.replaceChild(span, input);
        // Re-bind click with new cat2 name
        span.onclick = (ev) => { ev.stopPropagation(); _inlineEditCat(span, cat1, oldName); };
      }
      // 重新渲染页面以显示新名称
      renderAccounts();
    }
    input.addEventListener('keydown', handler);
  }

  // 内联新增分类
  async function _inlineAddCat(button, cat1) {
    const grp = document.createElement('div');
    grp.style.cssText = 'margin-bottom:4px;border:2px solid #42A5F5;border-radius:8px;overflow:hidden';
    grp.innerHTML = '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#E3F2FD;font-size:13px">' +
      '<span style="font-size:10px;color:#999"> </span>' +
      '<input class="form-control" style="flex:1;font-size:13px;font-weight:500;padding:2px 6px" placeholder="输入分类名称，Enter确认" id="inlineNewCatInput">' +
      '<button class="btn btn-sm btn-primary" style="font-size:11px;padding:2px 6px" onclick="App._confirmAddCat(this.parentElement.parentElement,\'' + cat1 + '\')">确认</button>' +
      '<button class="btn btn-sm btn-danger" style="font-size:11px;padding:2px 6px" onclick="var c=this.parentElement.parentElement;c.parentNode.removeChild(c)">取消</button>' +
      '</div>';
    button.parentNode.insertBefore(grp, button);
    const input = grp.querySelector('#inlineNewCatInput');
    setTimeout(() => input.focus(), 50);
    input.onkeydown = (e) => {
      if (e.key === 'Enter') _confirmAddCat(grp, cat1);
      if (e.key === 'Escape') { grp.parentNode.removeChild(grp); }
    };
  }

  async function _confirmAddCat(grp, cat1) {
    const input = grp.querySelector('#inlineNewCatInput');
    const name = input.value.trim();
    if (!name) { Utils.showToast('请输入分类名称', 'warning'); return; }
    await _addCategory(cat1, name);
    Utils.showToast('✅ 已添加分类 "' + name + '"', 'success');
    renderAccounts();
  }

  // ======================== 辅助方法 ========================

  // 安全关闭弹窗
  function _closeOverlay(el) {
    if (!el) return;
    try {
      el.innerHTML = '';           // 先清空内容
      el.style.display = 'none';   // 隐藏
      if (el.parentNode) {
        el.parentNode.removeChild(el);  // 从 DOM 移除
      }
    } catch(e) {
      console.warn('关闭弹窗出错:', e);
    }
  }

  // 兼容旧数据：将 riskLevel 映射为 riskCat
  // 旧分类名→新分类名映射（兼容升级）
  const CATEGORY2_MAP = {
    '国内基金': '基金', '全球基金': '基金', '债券基金': '基金',
    '黄金ETF': '黄金', '积存金': '黄金',
    '稳利宝/周利宝': '固收', '银行定期': '固收',
    '待报销账户': '报销账户', '共同账户': '共享账户',
    '医疗保险': '常用', '公积金': '常用',
    '银行活期': '流动资金'
  };

  function _normalizeAccount(acc) {
    if (!acc.riskCat && acc.riskLevel) {
      acc.riskCat = acc.riskLevel === 'high' ? 'progressive' : acc.riskLevel === 'medium' ? 'steady' : 'fluid';
    }
    if (!acc.riskCat) acc.riskCat = 'fluid';
    if (acc.sortOrder === undefined || acc.sortOrder === null) acc.sortOrder = 0;
    if (!acc.category2) acc.category2 = '';
    // 旧分类名自动迁移
    if (acc.category2 in CATEGORY2_MAP) {
      acc.category2 = CATEGORY2_MAP[acc.category2];
    }
    if (!acc.platform) acc.platform = '';
    if (acc.ratio === undefined || acc.ratio === null || acc.ratio === 0) acc.ratio = 1.0;
    if (!acc.name) acc.name = '未命名';
    if (!acc.type) acc.type = 'asset';
    return acc;
  }

  function _normalizeAccounts(accts) { accts.forEach(_normalizeAccount); }

  function _getPrevOf(snap) {
    if (!snap) return null;
    const s = [..._snapshots].filter(x=>x.id!==snap.id).sort((a,b)=>(b.year-a.year)||(b.month-a.month));
    for (const x of s) { if (x.year<snap.year||(x.year===snap.year&&x.month<snap.month)) return x; }
    return null;
  }

  function _calcBalanceForSnapshot(snap) {
    if (!snap) return {assetChange:0,netIncome:0,investPL:0,expectedChange:0,diff:0,isBalanced:true};
    const cur=snap.summaryCalculated?.totalAssets||0, prev=_getPrevOf(snap), pv=prev?.summaryCalculated?.totalAssets||0;
    const ac=Math.round((cur-pv)*100)/100, ni=(snap.income||0)-(snap.expense||0);
    const pl=snap.investmentPL?.manualOverride??snap.investmentPL?.autoCalculated??0;
    const exp=ni+pl, diff=Math.round((ac-exp)*100)/100;
    return {assetChange:ac,netIncome:ni,investPL:pl,expectedChange:exp,diff,isBalanced:Math.abs(diff)<=CONFIG.BALANCE_THRESHOLD};
  }

  // ======================== 快速新增账户（选择器） ========================

  const QUICK_ACCOUNTS = {
    [CONFIG.CATEGORY1.FUND]: {
      [CONFIG.CATEGORY2.LIQUID]: [
        { name: '现金', platform: '现金', ratio: 1, riskCat: 'fluid', type: 'asset' },
        { name: '支付宝', platform: '支付宝', ratio: 1, riskCat: 'fluid', type: 'asset' },
        { name: '微信钱包', platform: '微信', ratio: 1, riskCat: 'fluid', type: 'asset' },
        { name: '银行活期', platform: '', ratio: 1, riskCat: 'fluid', type: 'asset' }
      ],
      [CONFIG.CATEGORY2.BANK_ACCOUNT]: [
        { name: '中国银行', platform: '银行', ratio: 1, riskCat: 'fluid', type: 'asset' },
        { name: '建设银行', platform: '银行', ratio: 1, riskCat: 'fluid', type: 'asset' },
        { name: '工商银行', platform: '银行', ratio: 1, riskCat: 'fluid', type: 'asset' },
        { name: '农业银行', platform: '银行', ratio: 1, riskCat: 'fluid', type: 'asset' }
      ],
      [CONFIG.CATEGORY2.CREDIT]: [
        { name: '信用卡', platform: '', ratio: 1, riskCat: 'fluid', type: 'liability' },
        { name: '花呗', platform: '支付宝', ratio: 1, riskCat: 'fluid', type: 'liability' },
        { name: '白条', platform: '京东', ratio: 1, riskCat: 'fluid', type: 'liability' }
      ],
      [CONFIG.CATEGORY2.REIMBURSE]: [
        { name: '待报销', platform: '', ratio: 1, riskCat: 'fluid', type: 'asset' }
      ],
      [CONFIG.CATEGORY2.JOINT]: [
        { name: '小荷包', platform: '支付宝', ratio: 0.5, riskCat: 'fluid', type: 'asset' }
      ]
    },
    [CONFIG.CATEGORY1.INVEST]: {
      [CONFIG.CATEGORY2.FIXED_INCOME]: [
        { name: '货币基金', platform: '', ratio: 1, riskCat: 'steady', type: 'asset' },
        { name: '定期', platform: '', ratio: 1, riskCat: 'steady', type: 'asset' }
      ],
      [CONFIG.CATEGORY2.FUND]: [
        { name: '债券基金', platform: '', ratio: 1, riskCat: 'steady', type: 'asset' },
        { name: '股票基金', platform: '', ratio: 1, riskCat: 'progressive', type: 'asset' }
      ],
      [CONFIG.CATEGORY2.GOLD]: [
        { name: '黄金ETF', platform: '', ratio: 1, riskCat: 'progressive', type: 'asset' },
        { name: '积存金', platform: '', ratio: 1, riskCat: 'progressive', type: 'asset' }
      ],
      [CONFIG.CATEGORY2.STOCK]: [
        { name: '股票账户', platform: '', ratio: 1, riskCat: 'progressive', type: 'asset' }
      ]
    },
    [CONFIG.CATEGORY1.INSURE]: {
      [CONFIG.CATEGORY2.COMMON]: [
        { name: '医保', platform: '', ratio: 1, riskCat: 'fluid', type: 'asset' },
        { name: '公积金', platform: '', ratio: 1, riskCat: 'fluid', type: 'asset' }
      ]
    }
  };

  async function showAccountPicker() {
    const cats1 = Utils.getCategories1();
    const overlay = document.createElement('div');
    overlay.id = 'pickerOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:10000;display:flex;align-items:center;justify-content:center';
    let html = '<div style="background:#fff;border-radius:12px;padding:24px;width:560px;max-width:92vw;max-height:85vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.15)">';
    html += '<div style="display:flex;align-items:center;margin-bottom:16px"><h3 style="margin:0;font-size:16px">➕ 选择要新增的账户</h3></div>';

    cats1.forEach(cat1 => {
      const tagCls = cat1 === CONFIG.CATEGORY1.FUND ? 'tag-fund' : cat1 === CONFIG.CATEGORY1.INVEST ? 'tag-invest' : 'tag-insure';
      html += '<div style="margin-bottom:12px">';
      html += '<div style="font-size:15px;font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:8px">';
      html += '<span class="tag ' + tagCls + '" style="font-size:12px">' + cat1 + '</span></div>';

      const cat2s = QUICK_ACCOUNTS[cat1];
      if (cat2s) {
        Object.entries(cat2s).forEach(([cat2, accounts]) => {
          html += '<div style="margin-bottom:6px"><span style="font-size:12px;color:#999;display:block;margin-bottom:4px">' + cat2 + '</span>';
          html += '<div style="display:flex;flex-wrap:wrap;gap:6px">';
          accounts.forEach(acc => {
            html += '<span class="quick-acc-btn" data-cat1="' + cat1 + '" data-cat2="' + cat2 + '" data-name="' + acc.name + '" data-platform="' + (acc.platform || '') + '" data-ratio="' + acc.ratio + '" data-riskcat="' + acc.riskCat + '" data-type="' + acc.type + '" style="display:inline-block;padding:6px 14px;border:1px solid var(--border);border-radius:20px;font-size:13px;cursor:pointer;transition:all 0.15s;background:#fff" onmouseover="this.style.background=\'#E3F2FD\';this.style.borderColor=\'#42A5F5\'" onmouseout="this.style.background=\'#fff\';this.style.borderColor=\'var(--border)\'" onclick="App._pickAccount(this)">' + acc.name + '</span>';
          });
          // Custom entry at end of each subcategory
          html += '<span class="quick-acc-custom" data-cat1="' + cat1 + '" data-cat2="' + cat2 + '" style="display:inline-block;padding:6px 14px;border:1px dashed #bbb;border-radius:20px;font-size:13px;cursor:pointer;color:#999;transition:all 0.15s;background:#fff" onmouseover="this.style.background=\'#F5F5F5\';this.style.borderColor=\'#999\'" onmouseout="this.style.background=\'#fff\';this.style.borderColor=\'#bbb\'" onclick="App._pickCustom(this)">+ 自定义</span>';
          html += '</div></div>';
        });
      }
      html += '</div>';
    });

    html += '<div style="display:flex;gap:8px;justify-content:flex-end;border-top:1px solid var(--border);padding-top:12px;margin-top:8px">';
    html += '<button class="btn btn-secondary" id="closePicker">取消</button></div></div>';

    overlay.innerHTML = html;
    document.body.appendChild(overlay);

    overlay.querySelector('#closePicker').onclick = () => _closeOverlay(overlay);
    overlay.onclick = (e) => { if (e.target === overlay) _closeOverlay(overlay); };
  }

  function _pickAccount(el) {
    const cat1 = el.dataset.cat1;
    const cat2 = el.dataset.cat2;
    const preset = {
      name: el.dataset.name,
      platform: el.dataset.platform,
      ratio: parseFloat(el.dataset.ratio),
      riskCat: el.dataset.riskcat,
      type: el.dataset.type
    };
    // 关闭选择器弹窗
    const pickerOverlay = document.getElementById('pickerOverlay');
    if (pickerOverlay) pickerOverlay.remove();
    showAccountForm(null, cat1, cat2, preset);
  }

  function _pickCustom(el) {
    const cat1 = el.dataset.cat1;
    const cat2 = el.dataset.cat2;
    const pickerOverlay = document.getElementById('pickerOverlay');
    if (pickerOverlay) pickerOverlay.remove();
    showAccountForm(null, cat1, cat2, null);
  }

  // ======================== 全局操作 ========================

  async function showAccountForm(editId = null, presetCat1 = null, presetCat2 = null, presetData = null) {
    let ea = null;
    if (editId) ea = _accounts.find(a=>a.id===parseInt(editId));
    const title = ea ? `编辑账户 - ${ea.name}` : '新增账户';
    const defName = (ea?.name ?? presetData?.name ?? '');
    const defPlatform = (ea?.platform ?? presetData?.platform ?? '');
    const defRatio = (ea?.ratio ?? presetData?.ratio ?? 1);
    const defRiskCat = (ea?.riskCat ?? presetData?.riskCat ?? 'fluid');
    const defType = (ea?.type ?? presetData?.type ?? 'asset');
    const overlay = document.createElement('div');
    overlay.id = 'formOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:10000;display:flex;align-items:center;justify-content:center';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:12px;padding:28px;width:520px;max-width:90vw;max-height:90vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.15)">
        <h3 style="margin:0 0 20px;font-size:18px">${title}</h3>
        <form id="accountForm">
          <div class="form-group"><label>账户名称 *</label><input class="form-control" name="name" value="${defName}" required></div>
          <div class="form-inline">
            <div class="form-group"><label>一级分类</label>
              <select class="form-control" name="category1" id="formCat1">${Utils.getCategories1().map(c=>`<option value="${c}" ${(ea?.category1||presetCat1)===c?'selected':''}>${c}</option>`).join('')}</select></div>
            <div class="form-group"><label>二级分类</label>
              <div style="display:flex;gap:4px">
                <select class="form-control" name="category2" id="formCat2" style="flex:1">
                  <option value="">-- 选择或手动输入 --</option>
                  ${_getCat2Options(ea?.category1||presetCat1||CONFIG.CATEGORY1.FUND, ea?.category2||presetCat2||'')}
                  <option value="__custom__">✏️ 手动输入...</option>
                </select>
                <input class="form-control" id="customCat2" style="display:none;flex:1" placeholder="输入二级分类名称"
                  value="${(ea?.category2||presetCat2||'') && !Utils.getCategories2(ea?.category1||presetCat1||CONFIG.CATEGORY1.FUND).includes(ea?.category2||presetCat2||'') ? (ea?.category2||presetCat2||'') : ''}">
              </div></div>
          </div>
          <div class="form-inline">
            <div class="form-group"><label>所属机构</label>
              <div style="display:flex;gap:4px"><select class="form-control" name="platform" id="formPlatform" style="flex:1">
                <option value="">-- 选择或手动输入 --</option>
                ${CONFIG.DEFAULT_PLATFORMS.map(p=>`<option value="${p}" ${defPlatform===p?'selected':''}>${p}</option>`).join('')}
                <option value="__custom__">✏️ 手动输入...</option>
              </select>
              <input class="form-control" id="customPlatform" style="display:none;flex:1" placeholder="输入机构名称" value="${defPlatform&&!CONFIG.DEFAULT_PLATFORMS.includes(defPlatform)?defPlatform:''}"></div>
            </div>
            <div class="form-group"><label>账户类型</label>
              <select class="form-control" name="type"><option value="asset" ${defType==='asset'?'selected':''}>资产</option><option value="liability" ${defType==='liability'?'selected':''}>负债</option></select></div>
          </div>
          <div class="form-group"><label>计入个人资产比例</label>
            <div style="display:flex;align-items:center;gap:8px">
              <input type="range" min="0" max="100" value="${Math.round(defRatio*100)}" id="ratioSlider" style="flex:1">
              <span id="ratioLabel" style="font-weight:600;min-width:40px">${Math.round(defRatio*100)}%</span></div>
            <div class="hint">如共同账户只计入一半，设为 50%</div>
          </div>
          <div class="form-inline">
            <div class="form-group"><label>风险/收益分类</label>
              <select class="form-control" name="riskCat">
                ${Object.values(CONFIG.RISK_CATEGORY).map(rc=>`<option value="${rc.id}" ${defRiskCat===rc.id?'selected':''}>${rc.label} — ${rc.desc}</option>`).join('')}
              </select>
            </div>

          </div>
          <input type="hidden" name="ratio" value="${defRatio}">
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px;border-top:1px solid var(--border);padding-top:16px">
            <button type="button" class="btn btn-secondary" id="cancelForm">取消</button>
            <button type="submit" class="btn btn-primary">${ea?'保存修改':'创建账户'}</button></div>
        </form>
      </div>`;
    document.body.appendChild(overlay);

    // 一级分类 → 二级分类联动
    const c1 = overlay.querySelector('#formCat1'), c2 = overlay.querySelector('#formCat2');
    c1.onchange = () => { c2.innerHTML = _getCat2Options(c1.value); };

    // 机构：下拉+手动输入
    const platSelect = overlay.querySelector('#formPlatform');
    const customPlat = overlay.querySelector('#customPlatform');
    platSelect.onchange = () => {
      if (platSelect.value === '__custom__') {
        customPlat.style.display = 'block'; platSelect.style.display = 'none'; customPlat.focus();
      }
    };
    customPlat.onblur = () => {
      if (customPlat.value) { platSelect.innerHTML += `<option value="${customPlat.value}" selected>${customPlat.value}</option>`; }
      customPlat.style.display = 'none'; platSelect.style.display = 'block'; platSelect.value = customPlat.value || '';
    };
    customPlat.onkeydown = (ev) => { if (ev.key === 'Enter') customPlat.blur(); };

    // 二级分类：下拉+手动输入
    const cat2Select = overlay.querySelector('#formCat2');
    const customCat2 = overlay.querySelector('#customCat2');
    cat2Select.onchange = () => {
      if (cat2Select.value === '__custom__') {
        customCat2.style.display = 'block'; cat2Select.style.display = 'none'; customCat2.focus();
      }
    };
    customCat2.onblur = () => {
      if (customCat2.value) {
        // 去重后添加选项
        const existing = [...cat2Select.options].map(o => o.value);
        if (!existing.includes(customCat2.value)) {
          cat2Select.innerHTML += `<option value="${customCat2.value}" selected>${customCat2.value}</option>`;
        } else {
          cat2Select.value = customCat2.value;
        }
      }
      customCat2.style.display = 'none'; cat2Select.style.display = 'block';
      if (customCat2.value) cat2Select.value = customCat2.value;
    };
    customCat2.onkeydown = (ev) => { if (ev.key === 'Enter') customCat2.blur(); };

    // 一级分类变化时更新二级分类选项（保持可输入性）
    c1.onchange = () => {
      const oldVal = cat2Select.value;
      cat2Select.innerHTML = `<option value="">-- 选择或手动输入 --</option>
        ${_getCat2Options(c1.value, '')}
        <option value="__custom__">✏️ 手动输入...</option>`;
    };

    // 比例滑块
    const sl = overlay.querySelector('#ratioSlider'), rl = overlay.querySelector('#ratioLabel'), rh = overlay.querySelector('[name="ratio"]');
    sl.oninput = () => { const v = parseInt(sl.value)/100; rl.textContent = `${Math.round(v*100)}%`; rh.value = v; };

    // 提交
    overlay.querySelector('#accountForm').onsubmit = async(e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const cat2Val = customCat2.style.display !== 'none' && customCat2.value ? customCat2.value
                    : (cat2Select.value === '__custom__' ? '' : cat2Select.value);
      const data = { name: fd.get('name'), category1: fd.get('category1'), category2: cat2Val,
        platform: customPlat.value || platSelect.value, type: fd.get('type'), riskCat: fd.get('riskCat'),
        sortOrder: parseInt(fd.get('sortOrder'))||0, ratio: parseFloat(fd.get('ratio'))||1 };
      try {
        if (ea) { await DB.Accounts.update(ea.id, data); Utils.showToast('✅ 已更新'); }
        else { await DB.Accounts.add(data); Utils.showToast('✅ 已创建'); }
      } catch(err) {
        console.error('提交失败:', err);
        Utils.showToast('操作失败: '+err.message, 'error');
      }
      _closeOverlay(overlay);
      // 兜底：通过 ID 再删除一次
      const stillThere = document.getElementById('formOverlay');
      if (stillThere) stillThere.remove();
      _accounts = await DB.Accounts.getAll(); _normalizeAccounts(_accounts);
      requestAnimationFrame(() => renderAccounts());
    };
    overlay.querySelector('#cancelForm').onclick = () => _closeOverlay(overlay);
    overlay.onclick = (ev) => { if (ev.target === overlay) _closeOverlay(overlay); };
  }

  function _getCat2Options(cat1, selected = '') {
    return Utils.getCategories2(cat1).map(c => `<option value="${c}" ${c===selected?'selected':''}>${c}</option>`).join('');
  }

  async function deleteAccount(id, name) {
    if (!await Utils.showConfirm('确认删除',`确定删除「${name}」吗？<br>快照中该账户数据将丢失。`)) return;
    await DB.Accounts.delete(parseInt(id)); Utils.showToast('已删除'); navigate('accounts');
  }

  async function deleteSnapshot(id) {
    const s = await DB.Snapshots.get(parseInt(id)); if (!s) return;
    if (!await Utils.showConfirm('确认删除',`确定删除 ${s.year}年${s.month}月 的快照吗？`)) return;
    await DB.Snapshots.delete(parseInt(id)); Utils.showToast('已删除'); navigate('snapshots');
  }

  async function resetDefaults() {
    if (!await Utils.showConfirm('⚠️ 重置账户模板',
      '此操作将删除所有已创建的账户，恢复到默认初始状态的账户列表（包括资金/理财/保障三大类下的默认账户）。<br><br><strong style="color:#F44336">此操作不可撤销！</strong><br><br>确定要继续吗？')) return;
    // 清除所有账户
    await DB.clear(CONFIG.STORES.ACCOUNTS);
    // 重建默认账户
    for (const acc of CONFIG.DEFAULT_ACCOUNTS) {
      await DB.Accounts.add(acc);
    }
    _accounts = await DB.Accounts.getAll(); _normalizeAccounts(_accounts);
    Utils.showToast('✅ 已重置为默认账户模板', 'success');
    navigate('accounts');
  }


  // ======================== 拖拽排序处理 ========================
  let _dragSrcId = null;

  function _dragStart(ev, row) {
    _dragSrcId = row.dataset.accid;
    row.style.opacity = '0.4';
    ev.dataTransfer.effectAllowed = 'move';
    ev.dataTransfer.setData('text/plain', row.dataset.accid);
  }

  function _dragOver(ev) {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'move';
  }

  async function _drop(ev, targetRow) {
    ev.preventDefault();
    const targetId = targetRow.dataset.accid;
    if (!_dragSrcId || _dragSrcId === targetId) return;

    const tbody = targetRow.parentNode;
    const rows = [...tbody.querySelectorAll('tr[data-accid]')];
    const srcIdx = rows.findIndex(r => r.dataset.accid === _dragSrcId);
    const tgtIdx = rows.findIndex(r => r.dataset.accid === targetId);
    if (srcIdx === -1 || tgtIdx === -1) return;

    // 在 DOM 中移动行
    if (srcIdx < tgtIdx) {
      targetRow.parentNode.insertBefore(rows[srcIdx], targetRow.nextSibling);
    } else {
      targetRow.parentNode.insertBefore(rows[srcIdx], targetRow);
    }

    // 重新计算排序号并保存
    const allRows = [...tbody.querySelectorAll('tr[data-accid]')];
    for (let i = 0; i < allRows.length; i++) {
      const accId = parseInt(allRows[i].dataset.accid);
      const newOrder = (i + 1) * 10;
      allRows[i].dataset.sortorder = newOrder;
      await DB.Accounts.update(accId, { sortOrder: newOrder });
    }
    Utils.showToast('排序已保存', 'success');
  }

  function _dragEnd(ev) {
    ev.target.style.opacity = '1';
    _dragSrcId = null;
  }

  // ====== 公开 API ======
  return { init, navigate, showAccountPicker, showAccountForm, deleteAccount, deleteSnapshot, resetDefaults, _dragStart, _dragOver, _drop, _dragEnd, _pickAccount, _pickCustom, _inlineEditCat, _inlineAddCat, _confirmAddCat, _deleteCategory, _restoreCategoryDefaults, renderAccounts, _logout };
})();
