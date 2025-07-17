// ========= script.js =========
const API_URL = 'https://84l1zi5hjc.execute-api.ap-northeast-1.amazonaws.com/submit';

const form = document.getElementById('awsForm');
const submitBtn = document.getElementById('submitBtn');

/* ---------- 動態欄位顯示邏輯 (略，與之前相同) ---------- */
function toggleOtherSelect(selectEl, otherInputName) {
  const otherInput = form.querySelector(`[name="${otherInputName}"]`);
  if (!otherInput) return;
  const isOther = selectEl.value === 'other';
  otherInput.classList.toggle('hidden', !isOther);
  otherInput.required = isOther;
  if (!isOther) otherInput.value = '';
}

function toggleOtherCheckbox(groupName, otherInputName) {
  const otherCheckbox = form.querySelector(`input[name="${groupName}"][value="other"]`);
  const otherInput = form.querySelector(`[name="${otherInputName}"]`);
  if (!otherCheckbox || !otherInput) return;
  const isChecked = otherCheckbox.checked;
  otherInput.classList.toggle('hidden', !isChecked);
  otherInput.required = isChecked;
  if (!isChecked) otherInput.value = '';
}

form.addEventListener('change', e => {
  const { name } = e.target;
  if (name === 'deployment_location') toggleOtherSelect(e.target, 'deployment_location_other');
  if (name === 'web_server_type') toggleOtherSelect(e.target, 'web_server_type_other');
  if (name === 'db_type') toggleOtherSelect(e.target, 'db_type_other');

  if (name === 'os_types' || name === 'programming_languages') {
    toggleOtherCheckbox('os_types', 'os_types_other');
    toggleOtherCheckbox('programming_languages', 'programming_languages_other');
  }
});

/* ---------- 驗證：找出未填欄位 ---------- */

/**
 * 取得輸入欄位對應的中文標籤文字
 */
function getLabelText(element) {
  // <label>…<input>…</label> 直接取父節點
  const parentLabel = element.closest('label');
  if (parentLabel) {
    // 只取 label 開頭到第一個換行／input 之前的文字
    return parentLabel.childNodes[0].textContent.trim().replace(/[:：]$/, '');
  }
  // 若為 select/checkbox 外部 label，可用 for 屬性 (目前表單沒有此情況)
  return element.name || '(未命名欄位)';
}

/**
 * 回傳「未填欄位標籤」陣列；若為空表示通過驗證
 */
function validateForm() {
  const missing = [];
  // 所有帶 required 的欄位（含已被 JS 動態加上的）
  const requiredFields = form.querySelectorAll('[required]');

  requiredFields.forEach(el => {
    // 對於 checkbox / radio 群組，僅檢查第一個
    if (['checkbox', 'radio'].includes(el.type)) {
      // 若群組中有任一已勾選即可
      const group = form.querySelectorAll(`input[name="${el.name}"]`);
      const isChecked = Array.from(group).some(cb => cb.checked);
      if (!isChecked) missing.push(getLabelText(el));
    } else if (!el.value.trim()) {
      missing.push(getLabelText(el));
    }
  });

  // 去除重複
  return [...new Set(missing)];
}

/* ---------- 表單序列化（與先前相同） ---------- */
function serializeForm(fd) {
  const obj = {};
  for (const [k, v] of fd.entries()) {
    if (obj[k]) {
      Array.isArray(obj[k]) ? obj[k].push(v) : (obj[k] = [obj[k], v]);
    } else obj[k] = v;
  }
  Object.keys(obj).forEach(k => {
    if (k.endsWith('_other') && obj[k] === '') delete obj[k];
  });
  return obj;
}

/* ---------- Submit ---------- */
form.addEventListener('submit', async e => {
  e.preventDefault();

  const missing = validateForm();
  if (missing.length) {
    alert('以下欄位尚未填寫：\n - ' + missing.join('\n - '));
    return; // 中止送出
  }

  submitBtn.disabled = true;
  const payload = serializeForm(new FormData(form));

  try {
    const resp = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    alert(`提交成功！\nKey: ${data.key || 'n/a'}`);
    window.location.href = `confirm.html?prefix=${encodeURIComponent(data.prefix)}&executionArn=${encodeURIComponent(data.executionArn)}`;
    form.reset();
  } catch (err) {
    console.error(err);
    alert('提交失敗，請稍後再試');
  } finally {
    submitBtn.disabled = false;
  }
});
