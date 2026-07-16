/**
 * 个人资产管理系统 - IndexedDB 数据层
 */
const DB = (() => {
  let _db = null;

  function _openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(CONFIG.DB_NAME, CONFIG.DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        // 账户表
        if (!db.objectStoreNames.contains(CONFIG.STORES.ACCOUNTS)) {
          const store = db.createObjectStore(CONFIG.STORES.ACCOUNTS, { keyPath: 'id', autoIncrement: true });
          store.createIndex('category1', 'category1', { unique: false });
          store.createIndex('category2', 'category2', { unique: false });
          store.createIndex('platform', 'platform', { unique: false });
        }
        // 月度快照表
        if (!db.objectStoreNames.contains(CONFIG.STORES.SNAPSHOTS)) {
          const store = db.createObjectStore(CONFIG.STORES.SNAPSHOTS, { keyPath: 'id', autoIncrement: true });
          store.createIndex('yearMonth', ['year', 'month'], { unique: true });
        }
        // 投资品种表
        if (!db.objectStoreNames.contains(CONFIG.STORES.INVESTMENTS)) {
          const store = db.createObjectStore(CONFIG.STORES.INVESTMENTS, { keyPath: 'id', autoIncrement: true });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('code', 'code', { unique: false });
        }
        // 交易记录表
        if (!db.objectStoreNames.contains(CONFIG.STORES.TRANSACTIONS)) {
          const store = db.createObjectStore(CONFIG.STORES.TRANSACTIONS, { keyPath: 'id', autoIncrement: true });
          store.createIndex('investmentId', 'investmentId', { unique: false });
          store.createIndex('date', 'date', { unique: false });
        }
        // 行情缓存表
        if (!db.objectStoreNames.contains(CONFIG.STORES.MARKET_DATA)) {
          const store = db.createObjectStore(CONFIG.STORES.MARKET_DATA, { keyPath: 'id', autoIncrement: true });
          store.createIndex('code', 'code', { unique: false });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('codeDate', ['code', 'date'], { unique: true });
        }
        // 设置表
        if (!db.objectStoreNames.contains(CONFIG.STORES.SETTINGS)) {
          db.createObjectStore(CONFIG.STORES.SETTINGS, { keyPath: 'key' });
        }
      };
      req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
      req.onerror = (e) => { reject(e.target.error); };
    });
  }

  async function _getDB() {
    if (_db) return _db;
    return await _openDB();
  }

  // ====== 通用 CRUD ======
  async function add(storeName, data) {
    const db = await _getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.add(data);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async function put(storeName, data) {
    const db = await _getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(data);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async function get(storeName, id) {
    const db = await _getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async function getAll(storeName) {
    const db = await _getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async function del(storeName, id) {
    const db = await _getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async function clear(storeName) {
    const db = await _getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  }

  // ====== 账户操作 ======
  const Accounts = {
    async add(account) { return await add(CONFIG.STORES.ACCOUNTS, { ...account, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); },
    async update(id, data) {
      const existing = await get(CONFIG.STORES.ACCOUNTS, id);
      if (!existing) throw new Error('账户不存在');
      return await put(CONFIG.STORES.ACCOUNTS, { ...existing, ...data, id, updatedAt: new Date().toISOString() });
    },
    async delete(id) { return await del(CONFIG.STORES.ACCOUNTS, id); },
    async get(id) { return await get(CONFIG.STORES.ACCOUNTS, id); },
    async getAll() { return await getAll(CONFIG.STORES.ACCOUNTS); },
    async getByCategory1(cat1) {
      const all = await getAll(CONFIG.STORES.ACCOUNTS);
      return all.filter(a => a.category1 === cat1);
    },
    async initDefaults() {
      const existing = await getAll(CONFIG.STORES.ACCOUNTS);
      if (existing.length > 0) return;
      for (const acc of CONFIG.DEFAULT_ACCOUNTS) {
        await Accounts.add(acc);
      }
    }
  };

  // ====== 月度快照操作 ======
  const Snapshots = {
    async add(snapshot) {
      // 检查是否已存在同年月数据
      const all = await getAll(CONFIG.STORES.SNAPSHOTS);
      const dup = all.find(s => s.year === snapshot.year && s.month === snapshot.month);
      if (dup) throw new Error(`⚠️ ${snapshot.year}年${snapshot.month}月的数据已存在，请使用编辑功能`);
      return await add(CONFIG.STORES.SNAPSHOTS, { ...snapshot, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    },
    async update(id, data) {
      const existing = await get(CONFIG.STORES.SNAPSHOTS, id);
      if (!existing) throw new Error('快照不存在');
      return await put(CONFIG.STORES.SNAPSHOTS, { ...existing, ...data, id, updatedAt: new Date().toISOString() });
    },
    async delete(id) { return await del(CONFIG.STORES.SNAPSHOTS, id); },
    async get(id) { return await get(CONFIG.STORES.SNAPSHOTS, id); },
    async getAll() { return await getAll(CONFIG.STORES.SNAPSHOTS); },
    async getByYearMonth(year, month) {
      const all = await getAll(CONFIG.STORES.SNAPSHOTS);
      return all.find(s => s.year === year && s.month === month) || null;
    },
    async calculateSummary(snapshot, accounts) {
      const acctMap = {};
      accounts.forEach(a => { acctMap[a.id] = a; });

      let fundTotal = 0, investTotal = 0, insureTotal = 0;
      const balances = snapshot.accountBalances || {};

      Object.entries(balances).forEach(([accId, amount]) => {
        const acc = acctMap[accId];
        if (!acc) return;
        const adjusted = Math.round(amount * acc.ratio * 100) / 100;
        if (acc.type === 'liability') {
          // 负债用负值
          if (acc.category1 === CONFIG.CATEGORY1.FUND) fundTotal -= adjusted;
          else if (acc.category1 === CONFIG.CATEGORY1.INVEST) investTotal -= adjusted;
        } else {
          if (acc.category1 === CONFIG.CATEGORY1.FUND) fundTotal += adjusted;
          else if (acc.category1 === CONFIG.CATEGORY1.INVEST) investTotal += adjusted;
          else if (acc.category1 === CONFIG.CATEGORY1.INSURE) insureTotal += adjusted;
        }
      });

      return {
        fundAssets: Math.round(fundTotal * 100) / 100,
        investAssets: Math.round(investTotal * 100) / 100,
        insureAssets: Math.round(insureTotal * 100) / 100,
        totalAssets: Math.round((fundTotal + investTotal + insureTotal) * 100) / 100
      };
    },

    async calculateBalance(snapshot) {
      const summary = snapshot.summaryCalculated;
      const prevSnapshot = await _getPreviousSnapshot(snapshot.year, snapshot.month);

      let assetChange = 0;
      if (prevSnapshot) {
        assetChange = summary.totalAssets - (prevSnapshot.summaryCalculated?.totalAssets || 0);
      }

      const netIncome = (snapshot.income || 0) - (snapshot.expense || 0);
      const investPL = snapshot.investmentPL?.manualOverride ?? snapshot.investmentPL?.autoCalculated ?? 0;
      const expectedChange = netIncome + investPL;
      const diff = Math.round((assetChange - expectedChange) * 100) / 100;

      return {
        assetChange,
        netIncome,
        investPL,
        expectedChange,
        diff,
        isBalanced: Math.abs(diff) <= CONFIG.BALANCE_THRESHOLD
      };
    }
  };

  async function _getPreviousSnapshot(year, month) {
    const all = await getAll(CONFIG.STORES.SNAPSHOTS);
    const sorted = all.sort((a, b) => (b.year - a.year) || (b.month - a.month));
    for (const s of sorted) {
      if (s.year < year || (s.year === year && s.month < month)) {
        return s;
      }
    }
    return null;
  }

  // ====== 设置操作 ======
  const Settings = {
    async set(key, value) { return await put(CONFIG.STORES.SETTINGS, { key, value }); },
    async get(key) {
      const result = await get(CONFIG.STORES.SETTINGS, key);
      return result ? result.value : null;
    },
    async remove(key) { return await del(CONFIG.STORES.SETTINGS, key); }
  };

  // ====== 数据导入导出 ======
  const DataIO = {
    async exportAll() {
      const data = {
        version: CONFIG.VERSION,
        exportedAt: new Date().toISOString(),
        accounts: await getAll(CONFIG.STORES.ACCOUNTS),
        snapshots: await getAll(CONFIG.STORES.SNAPSHOTS),
        investments: await getAll(CONFIG.STORES.INVESTMENTS),
        transactions: await getAll(CONFIG.STORES.TRANSACTIONS),
        marketData: await getAll(CONFIG.STORES.MARKET_DATA),
        settings: await getAll(CONFIG.STORES.SETTINGS)
      };
      return data;
    },

    async importAll(data, mode = 'overwrite') {
      // 校验数据格式
      if (!data || !data.version || !data.accounts) {
        throw new Error('数据格式无效，请检查导入文件');
      }

      if (mode === 'overwrite') {
        // 清空所有表
        for (const store of Object.values(CONFIG.STORES)) {
          await clear(store);
        }
      }

      // 导入账户
      for (const item of (data.accounts || [])) {
        await add(CONFIG.STORES.ACCOUNTS, item);
      }
      // 导入快照
      for (const item of (data.snapshots || [])) {
        await add(CONFIG.STORES.SNAPSHOTS, item);
      }
      // 导入投资
      for (const item of (data.investments || [])) {
        await add(CONFIG.STORES.INVESTMENTS, item);
      }
      // 导入交易
      for (const item of (data.transactions || [])) {
        await add(CONFIG.STORES.TRANSACTIONS, item);
      }
      // 导入行情
      for (const item of (data.marketData || [])) {
        await add(CONFIG.STORES.MARKET_DATA, item);
      }
      // 导入设置
      for (const item of (data.settings || [])) {
        await add(CONFIG.STORES.SETTINGS, item);
      }
    },

    async mergeImport(data) {
      if (!data || !data.version) throw new Error('数据格式无效');

      // 账户：跳过已存在的（同ID），新增不存在的
      const existingAccounts = await getAll(CONFIG.STORES.ACCOUNTS);
      const existingIds = new Set(existingAccounts.map(a => a.id));
      for (const item of (data.accounts || [])) {
        if (!existingIds.has(item.id)) {
          await add(CONFIG.STORES.ACCOUNTS, item);
        }
      }

      // 快照：按年月判断，不存在的才新增
      const existingSnaps = await getAll(CONFIG.STORES.SNAPSHOTS);
      const snapKeySet = new Set(existingSnaps.map(s => `${s.year}-${s.month}`));
      for (const item of (data.snapshots || [])) {
        if (!snapKeySet.has(`${item.year}-${item.month}`)) {
          await add(CONFIG.STORES.SNAPSHOTS, item);
        }
      }

      // 投资品种：按ID去重
      const existingInv = await getAll(CONFIG.STORES.INVESTMENTS);
      const invIds = new Set(existingInv.map(i => i.id));
      for (const item of (data.investments || [])) {
        if (!invIds.has(item.id)) {
          await add(CONFIG.STORES.INVESTMENTS, item);
        }
      }

      // 交易记录：按ID去重
      const existingTxn = await getAll(CONFIG.STORES.TRANSACTIONS);
      const txnIds = new Set(existingTxn.map(t => t.id));
      for (const item of (data.transactions || [])) {
        if (!txnIds.has(item.id)) {
          await add(CONFIG.STORES.TRANSACTIONS, item);
        }
      }
    }
  };

  return { _getDB, Accounts, Snapshots, Settings, DataIO, getAll, add, put, get, del, clear };
})();
