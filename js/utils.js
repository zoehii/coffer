/**
 * 个人资产管理系统 - 工具函数
 */
const Utils = {
  // ====== 格式化 ======
  formatMoney(amount, showSign = false) {
    if (amount === null || amount === undefined) return '¥0.00';
    const sign = showSign && amount > 0 ? '+' : '';
    return `${sign}¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  },

  formatPercent(value) {
    if (value === null || value === undefined) return '0.00%';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  getYearMonthLabel(year, month) {
    return `${year}年${month}月`;
  },

  // ====== 分类获取 ======
  getCategories1() {
    return Object.values(CONFIG.CATEGORY1);
  },

  getCategories2(cat1) {
    const map = {
      [CONFIG.CATEGORY1.FUND]: [
        CONFIG.CATEGORY2.LIQUID,
        CONFIG.CATEGORY2.BANK_ACCOUNT,
        CONFIG.CATEGORY2.CREDIT,
        CONFIG.CATEGORY2.REIMBURSE,
        CONFIG.CATEGORY2.JOINT
      ],
      [CONFIG.CATEGORY1.INVEST]: [
        CONFIG.CATEGORY2.FIXED_INCOME,
        CONFIG.CATEGORY2.FUND,
        CONFIG.CATEGORY2.GOLD,
        CONFIG.CATEGORY2.STOCK
      ],
      [CONFIG.CATEGORY1.INSURE]: [
        CONFIG.CATEGORY2.COMMON
      ]
    };
    return map[cat1] || [];
  },

  getPlatforms(accounts) {
    const platforms = new Set();
    accounts.forEach(a => { if (a.platform) platforms.add(a.platform); });
    return [...platforms].sort();
  },

  getMonthOptions() {
    const now = new Date();
    const options = [];
    // 往前推 24 个月
    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      options.push({ year: d.getFullYear(), month: d.getMonth() + 1, label: `${d.getFullYear()}年${d.getMonth() + 1}月` });
    }
    return options;
  },

  // ====== ECharts 主题 ======
  getChartTheme() {
    return {
      color: ['#4FC3F7', '#FFA726', '#66BB6A', '#EF5350', '#AB47BC', '#FFD54F', '#26A69A', '#8D6E63', '#42A5F5', '#EC407A'],
      backgroundColor: 'transparent',
      textStyle: { color: '#37474F' },
      title: { textStyle: { color: '#37474F', fontSize: 14, fontWeight: 'normal' } },
      legend: { textStyle: { color: '#546E7A' } },
      tooltip: { backgroundColor: 'rgba(255,255,255,0.9)', borderColor: '#ddd', textStyle: { color: '#333' } },
      grid: { borderColor: '#eee', containLabel: true }
    };
  },

  // ====== 数据校验 ======
  validateAmount(val, label = '金额') {
    const num = parseFloat(val);
    if (isNaN(num)) return `${label}必须为有效数字`;
    return null;
  },

  // ====== DOM 辅助 ======
  $(sel, parent = document) {
    return parent.querySelector(sel);
  },

  $$(sel, parent = document) {
    return [...parent.querySelectorAll(sel)];
  },

  createElement(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'className') el.className = v;
      else if (k === 'style') Object.assign(el.style, v);
      else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else el.setAttribute(k, v);
    });
    children.forEach(c => {
      if (typeof c === 'string') el.appendChild(document.createTextNode(c));
      else if (c instanceof HTMLElement) el.appendChild(c);
    });
    return el;
  },

  // ====== 弹窗 ======
  showToast(msg, type = 'info') {
    const colors = { info: '#2196F3', success: '#4CAF50', warning: '#FF9800', error: '#F44336' };
    const toast = document.getElementById('toast') || (() => {
      const t = document.createElement('div');
      t.id = 'toast';
      t.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:9999;padding:12px 24px;border-radius:8px;color:#fff;font-size:14px;transition:opacity 0.3s;max-width:80vw;text-align:center';
      document.body.appendChild(t);
      return t;
    })();
    toast.style.background = colors[type] || colors.info;
    toast.textContent = msg;
    toast.style.opacity = '1';
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
  },

  showConfirm(title, message) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:10000;display:flex;align-items:center;justify-content:center';
      const box = document.createElement('div');
      box.style.cssText = 'background:#fff;border-radius:12px;padding:24px;min-width:320px;max-width:440px;box-shadow:0 8px 32px rgba(0,0,0,0.15)';
      box.innerHTML = `
        <h3 style="margin:0 0 8px;font-size:16px;color:#333">${title}</h3>
        <p style="margin:0 0 20px;font-size:14px;color:#666">${message}</p>
        <div style="display:flex;gap:12px;justify-content:flex-end">
          <button class="btn btn-secondary" id="confirmNo">取消</button>
          <button class="btn btn-primary" id="confirmYes">确定</button>
        </div>
      `;
      overlay.appendChild(box);
      document.body.appendChild(overlay);
      box.querySelector('#confirmYes').onclick = () => { document.body.removeChild(overlay); resolve(true); };
      box.querySelector('#confirmNo').onclick = () => { document.body.removeChild(overlay); resolve(false); };
      overlay.onclick = (e) => { if (e.target === overlay) { document.body.removeChild(overlay); resolve(false); } };
    });
  },

  // ====== 通用表单 ======
  getFormData(formEl, fields) {
    const data = {};
    fields.forEach(f => {
      const input = formEl.querySelector(`[name="${f}"]`);
      if (input) {
        const val = input.type === 'number' ? parseFloat(input.value) || 0 : input.value;
        data[f] = val;
      }
    });
    return data;
  },

  setFormData(formEl, data) {
    Object.entries(data).forEach(([key, val]) => {
      const input = formEl.querySelector(`[name="${key}"]`);
      if (input) {
        if (typeof val === 'number') input.value = val;
        else input.value = val || '';
      }
    });
  },

  // ====== 文件操作 ======
  downloadFile(content, filename, type = 'application/json') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e.target.error);
      reader.readAsText(file);
    });
  }
};
