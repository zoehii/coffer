-- 在 Supabase SQL Editor 中执行此脚本
-- https://owidmewjfgvekhpjoxgu.supabase.co → SQL Editor

-- 账户表
CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  category1 TEXT NOT NULL DEFAULT '资金账户',
  category2 TEXT DEFAULT '',
  platform TEXT DEFAULT '',
  ratio REAL DEFAULT 1.0,
  risk_cat TEXT DEFAULT 'fluid',
  type TEXT DEFAULT 'asset',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 月度快照表
CREATE TABLE IF NOT EXISTS snapshots (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  record_date TEXT DEFAULT '',
  account_balances JSONB DEFAULT '{}',
  income REAL DEFAULT 0,
  expense REAL DEFAULT 0,
  investment_pl REAL DEFAULT 0,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year, month)
);

-- 设置表（替代 IndexedDB Settings store）
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  key TEXT NOT NULL,
  value TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, key)
);

-- 开启行级安全
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- 策略：每个用户只能操作自己的数据
CREATE POLICY "accounts_policy" ON accounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "snapshots_policy" ON snapshots FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "settings_policy" ON settings FOR ALL USING (auth.uid() = user_id);

-- 让 auth.users 可以被读取（需要查看自己的 email）
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_policy" ON auth.users FOR SELECT USING (auth.uid() = id);
