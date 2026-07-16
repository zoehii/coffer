/**
 * 个人资产管理系统 - 配置常量
 */
const CONFIG = {
  APP_NAME: '个人资产管理',
  VERSION: '1.1.0',
  DB_NAME: 'PersonalAssetsDB',
  DB_VERSION: 2,

  // 一级分类
  CATEGORY1: {
    FUND: '资金账户',
    INVEST: '理财账户',
    INSURE: '保障账户'
  },

  // 二级分类
  CATEGORY2: {
    // 资金账户
    LIQUID: '流动资金',
    BANK_ACCOUNT: '银行账户',
    CREDIT: '信贷账户',
    REIMBURSE: '报销账户',
    JOINT: '共享账户',
    // 理财账户
    FIXED_INCOME: '固收',
    FUND: '基金',
    GOLD: '黄金',
    STOCK: '股票',
    // 保障账户
    COMMON: '常用'
  },

  // 风险/收益三级分类
  RISK_CATEGORY: {
    FLUID:  { id: 'fluid', label: '流动型', desc: '流动型（如现金/活期）' },
    STEADY: { id: 'steady', label: '稳健型', desc: '稳健型（如定期/稳利宝）' },
    PROGRESSIVE: { id: 'progressive', label: '进取型', desc: '进取型（如基金/黄金）' }
  },

  // 账户类型（资产/负债）
  ACC_TYPE: {
    ASSET: 'asset',
    LIABILITY: 'liability'
  },

  // 数据校核阈值（元）
  BALANCE_THRESHOLD: 10,

  // 默认所属机构选项
  DEFAULT_PLATFORMS: ['支付宝', '微信', '银行'],

  // IndexedDB 存储表
  STORES: {
    ACCOUNTS: 'accounts',
    SNAPSHOTS: 'snapshots',
    INVESTMENTS: 'investments',
    TRANSACTIONS: 'transactions',
    MARKET_DATA: 'marketData',
    SETTINGS: 'settings'
  },

  // 默认账户模板
  DEFAULT_ACCOUNTS: [
    // ===== 资金账户 =====
    { name: '现金', category1: '资金账户', category2: '流动资金', platform: '现金', ratio: 1.0, riskCat: 'fluid', type: 'asset', sortOrder: 1 },
    { name: '支付宝', category1: '资金账户', category2: '流动资金', platform: '支付宝', ratio: 1.0, riskCat: 'fluid', type: 'asset', sortOrder: 2 },
    { name: '微信', category1: '资金账户', category2: '流动资金', platform: '微信', ratio: 1.0, riskCat: 'fluid', type: 'asset', sortOrder: 3 },
    { name: '花呗', category1: '资金账户', category2: '信贷账户', platform: '支付宝', ratio: 1.0, riskCat: 'fluid', type: 'liability', sortOrder: 5 },
    // ===== 理财账户 =====（默认不创建具体账户，仅显示空置的二级分类）
    // ===== 保障账户 =====
    { name: '医保', category1: '保障账户', category2: '常用', platform: '', ratio: 1.0, riskCat: 'fluid', type: 'asset', sortOrder: 18 },
    { name: '公积金', category1: '保障账户', category2: '常用', platform: '', ratio: 1.0, riskCat: 'fluid', type: 'asset', sortOrder: 19 }
  ],

  // 风险级别对应的前端显示标签
  RISK_TAGS: {
    fluid:     { label: '流动型', cls: 'tag-low' },
    steady:    { label: '稳健型', cls: 'tag-steady' },
    progressive: { label: '进取型', cls: 'tag-high' }
  },

  // 页面路由
  ROUTES: {
    LOGIN: 'login',
    DASHBOARD: 'dashboard',
    ACCOUNTS: 'accounts',
    SNAPSHOTS: 'snapshots',
    SNAPSHOT_NEW: 'snapshot-new',
    SNAPSHOT_EDIT: 'snapshot-edit',
    INVESTMENTS: 'investments',
    SETTINGS: 'settings'
  },

  // 图表颜色
  CHART_COLORS: {
    FUND: '#4FC3F7',
    INVEST: '#FFA726',
    INSURE: '#66BB6A',
    INVEST_FIXED: '#26A69A',
    INVEST_FUND: '#EF5350',
    INVEST_GOLD: '#FFD54F',
    INVEST_STOCK: '#AB47BC',
    INCOME: '#66BB6A',
    EXPENSE: '#EF5350',
    PL: '#42A5F5'
  },

  // 草稿 localStorage key
  DRAFT_KEY: 'pa_draft_snapshot'
};
