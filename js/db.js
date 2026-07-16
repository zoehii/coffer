/**
 * 个人资产管理系统 - Supabase 数据层
 * 保持与旧 IndexedDB 相同的 API，内部改用 Supabase
 */
const DB = (() => {
  let _client = null;

  function _getClient() {
    if (!_client) {
      _client = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    }
    return _client;
  }

  async function _getUserId() {
    const { data: { user } } = await _getClient().auth.getUser();
    if (!user) throw new Error('用户未登录');
    return user.id;
  }

  // 兼容旧代码：模拟 getAll 方法
  async function getAll(store) {
    const userId = await _getUserId();
    const client = _getClient();
    try {
      const { data, error } = await client
        .from(store)
        .select('*')
        .eq('user_id', userId)
        .order('id', { ascending: true });
      if (error) throw error;
      return (data || []).map(_fromSnakeCase);
    } catch(e) { console.error('getAll error:', e); return []; }
  }

  async function add(store, item) {
    const userId = await _getUserId();
    const client = _getClient();
    const row = _toSnakeCase({ ...item, user_id: userId });
    delete row.id; // 让 Supabase 自增
    try {
      const { data, error } = await client.from(store).insert(row).select().single();
      if (error) throw error;
      return _fromSnakeCase(data);
    } catch(e) { console.error('add error:', e); throw e; }
  }

  async function put(store, id, updates) {
    const userId = await _getUserId();
    const client = _getClient();
    const row = _toSnakeCase({ ...updates, updated_at: new Date().toISOString() });
    delete row.id;
    try {
      const { data, error } = await client
        .from(store)
        .update(row)
        .eq('id', id)
        .eq('user_id', userId)
        .select().single();
      if (error) throw error;
      return _fromSnakeCase(data);
    } catch(e) { console.error('put error:', e); throw e; }
  }

  async function get(store, id) {
    const userId = await _getUserId();
    const client = _getClient();
    try {
      const { data, error } = await client
        .from(store)
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      return _fromSnakeCase(data);
    } catch(e) { console.error('get error:', e); return null; }
  }

  async function del(store, id) {
    const userId = await _getUserId();
    const client = _getClient();
    try {
      const { error } = await client.from(store).delete().eq('id', id).eq('user_id', userId);
      if (error) throw error;
    } catch(e) { console.error('del error:', e); throw e; }
  }

  async function clear(store) {
    const userId = await _getUserId();
    const client = _getClient();
    try {
      const { error } = await client.from(store).delete().neq('id', 0).eq('user_id', userId);
      if (error) throw error;
    } catch(e) { console.error('clear error:', e); throw e; }
  }

  // 兼容旧 API 的对象
  const Accounts = {
    async getAll() { return getAll('accounts'); },
    async add(acc) { return add('accounts', { ...acc, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); },
    async update(id, data) { return put('accounts', id, data); },
    async get(id) { return get('accounts', id); },
    async delete(id) { return del('accounts', id); },
    async clear() { return clear('accounts'); },
    async initDefaults() {
      const existing = await getAll('accounts');
      for (const a of CONFIG.DEFAULT_ACCOUNTS) {
        if (!existing.find(e => e.name === a.name && e.category1 === a.category1)) {
          await add('accounts', a);
        }
      }
    }
  };

  const Snapshots = {
    async getAll() { return getAll('snapshots'); },
    async add(snap) { return add('snapshots', snap); },
    async update(id, data) { return put('snapshots', id, data); },
    async get(id) { return get('snapshots', id); },
    async delete(id) { return del('snapshots', id); },
    async getByYearMonth(year, month) {
      const userId = await _getUserId();
      const client = _getClient();
      const { data, error } = await client.from('snapshots').select('*')
        .eq('user_id', userId).eq('year', year).eq('month', month).single();
      if (error && error.code !== 'PGRST116') { console.error('getByYearMonth error:', error); return null; }
      return data ? _fromSnakeCase(data) : null;
    }
  };

  const Settings = {
    async get(key) {
      const userId = await _getUserId();
      const client = _getClient();
      const { data, error } = await client.from('settings').select('value')
        .eq('user_id', userId).eq('key', key).single();
      if (error && error.code !== 'PGRST116') { console.error('Settings.get error:', error); return null; }
      return data ? data.value : null;
    },
    async set(key, value) {
      const userId = await _getUserId();
      const client = _getClient();
      const { data: existing } = await client.from('settings').select('id')
        .eq('user_id', userId).eq('key', key).single();
      try {
        if (existing) {
          await client.from('settings').update({ value }).eq('id', existing.id).eq('user_id', userId);
        } else {
          await client.from('settings').insert({ user_id: userId, key, value });
        }
      } catch(e) { console.error('Settings.set error:', e); }
    },
    async remove(key) {
      const userId = await _getUserId();
      const client = _getClient();
      try {
        await client.from('settings').delete().eq('user_id', userId).eq('key', key);
      } catch(e) { console.error('Settings.remove error:', e); }
    }
  };

  // 数据导出（兼容旧格式，用于导出/导入和迁移）
  const DataIO = {
    async exportAll() {
      try {
        const [accounts, snapshots] = await Promise.all([getAll('accounts'), getAll('snapshots')]);
        return { version: CONFIG.VERSION, exportedAt: new Date().toISOString(), accounts, snapshots };
      } catch(e) { console.error('exportAll error:', e); return { version: CONFIG.VERSION, accounts: [], snapshots: [] }; }
    },
    async importAll(data, mode = 'overwrite') {
      if (mode === 'overwrite') {
        await clear('accounts');
        await clear('snapshots');
      }
      for (const acc of (data.accounts || [])) {
        const { id, ...rest } = acc;
        try { await Accounts.add(rest); } catch(e) {}
      }
      for (const snap of (data.snapshots || [])) {
        const { id, ...rest } = snap;
        try { await Snapshots.add(rest); } catch(e) {}
      }
    },
    async mergeImport(data) {
      return importAll(data, 'merge');
    }
  };

  // 兼容旧 IndexedDB 的快捷方法
  async function _getDB() { return _getClient(); }

  // snake_case → camelCase 转换
  function _fromSnakeCase(obj) {
    if (!obj) return obj;
    const result = {};
    for (const key of Object.keys(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      result[camelKey] = obj[key];
    }
    return result;
  }

  function _toSnakeCase(obj) {
    if (!obj) return obj;
    const result = {};
    for (const key of Object.keys(obj)) {
      const snakeKey = key.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
      result[snakeKey] = obj[key];
    }
    return result;
  }

  return { _getDB, Accounts, Snapshots, Settings, DataIO, getAll, add, put, get, del, clear };
})();
