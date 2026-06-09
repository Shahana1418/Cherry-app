const fs = require('fs');
let content = fs.readFileSync('src/main.js', 'utf8');

// 1. Make DOMContentLoaded async and add Tauri invoke
content = content.replace(
  "document.addEventListener('DOMContentLoaded', () => {",
  "document.addEventListener('DOMContentLoaded', async () => {\n  const { invoke } = window.__TAURI__.core;"
);

// 2. Replace getCompanyData & fix Corrupted (since they exist at top)
const toReplace1 = `// Simple encode/decode for stored data (not encryption, but obscures from casual viewing)
  function encodeData(obj) { return btoa(JSON.stringify(obj)); }
  function decodeData(str) { try { return JSON.parse(atob(str)); } catch { return null; } }

  function getCompanyData() {
    const raw = localStorage.getItem(COMPANY_KEY);
    return raw ? decodeData(raw) : null;
  }

  // Auto-fix corrupted data (from previous double-encoding bug)
  (function repairCorruptedData() {
    const raw = localStorage.getItem(COMPANY_KEY);
    if (raw && !decodeData(raw)) {
      // Data exists but can't be decoded — try double-decode fix
      try {
        const fixed = JSON.parse(atob(JSON.parse(atob(raw))));
        if (fixed && fixed.adminName) {
          localStorage.setItem(COMPANY_KEY, encodeData(fixed));
          console.log('[AUTO-FIX] Repaired double-encoded company data');
          return;
        }
      } catch (e) { }
      // If that didn't work, data is truly corrupted — clear it
      localStorage.removeItem(COMPANY_KEY);
      localStorage.removeItem(SETUP_KEY);
      console.log('[AUTO-FIX] Cleared corrupted data — please re-register');
    }
  })();

  // Keyboard shortcut: Ctrl+Shift+F12 to reset the app completely
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'F12') {
      if (confirm('Reset app? This will clear all saved data and restart the setup.')) {
        localStorage.clear();
        location.reload();
      }
    }
  });

  function hideAllScreens() {
    [obLogin, obLicense, obUpload, obRegister, sessionLogin].forEach(el => {
      if (el) el.classList.add('hidden');
    });
  }

  function showApp() {
    hideAllScreens();
    if (appContainer) appContainer.style.display = '';
  }

  // ── Determine which screen to show ──
  const setupComplete = localStorage.getItem(SETUP_KEY) === 'true';
  const companyData = getCompanyData();`;

const newCode1 = `
  // --- Asynchronous DB Loaders ---
  const rawCompany = await invoke('load_data', { key: 'COMPANY_KEY' });
  const rawSetup = await invoke('load_data', { key: 'SETUP_KEY' });
  const rawRecovery = await invoke('load_data', { key: 'USED_RECOVERY_KEY' });
  const rawImItems = await invoke('load_data', { key: 'IM_ITEMS' });
  const rawCsConfigs = await invoke('load_data', { key: 'CS_CONFIGS' });
  const rawCmCustomers = await invoke('load_data', { key: 'CM_CUSTOMERS' });
  const rawEmOperators = await invoke('load_data', { key: 'EM_OPERATORS' });
  const rawMmMachines = await invoke('load_data', { key: 'MM_MACHINES' });
  const rawAgEntries = await invoke('load_data', { key: 'AG_ENTRIES' });

  let memory_COMPANY_DATA = rawCompany ? JSON.parse(rawCompany) : null;
  let memory_SETUP_COMPLETE = rawSetup === 'true';
  let memory_USED_RECOVERY = rawRecovery ? JSON.parse(rawRecovery) : [];

  function getCompanyData() { return memory_COMPANY_DATA; }
  async function setCompanyData(data) {
    memory_COMPANY_DATA = data;
    await invoke('save_data', { key: 'COMPANY_KEY', payload: JSON.stringify(data) });
  }

  async function setSetupComplete(val) {
    memory_SETUP_COMPLETE = val;
    await invoke('save_data', { key: 'SETUP_KEY', payload: val ? 'true' : 'false' });
  }

  function getUsedRecoveryPasswords() { return memory_USED_RECOVERY; }
  async function addUsedRecoveryPassword(pass) {
    memory_USED_RECOVERY.push(pass);
    await invoke('save_data', { key: 'USED_RECOVERY_KEY', payload: JSON.stringify(memory_USED_RECOVERY) });
  }

  // Keyboard shortcut: Ctrl+Shift+F12 to reset the app completely
  document.addEventListener('keydown', async (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'F12') {
      if (confirm('Reset app? This will clear ALL database data and restart.')) {
        let keys = ['COMPANY_KEY','SETUP_KEY','USED_RECOVERY_KEY','IM_ITEMS','CS_CONFIGS','CM_CUSTOMERS','EM_OPERATORS','MM_MACHINES','AG_ENTRIES'];
        for (let k of keys) { await invoke('save_data', { key: k, payload: '' }); }
        location.reload();
      }
    }
  });

  function hideAllScreens() {
    [obLogin, obLicense, obUpload, obRegister, sessionLogin].forEach(el => {
      if (el) el.classList.add('hidden');
    });
  }

  function showApp() {
    hideAllScreens();
    if (appContainer) appContainer.style.display = '';
  }

  // ── Determine which screen to show ──
  const setupComplete = memory_SETUP_COMPLETE;
  const companyData = memory_COMPANY_DATA;`;

content = content.replace(toReplace1, newCode1);

// 3. Fix instances of localStorage in the rest of the file
content = content.replace(/localStorage\.setItem\([\s\S]*?\);/g, '// Replaced with DB api');

// 4. Inject DB sync functions for arrays
const injectFuncs = `
  async function saveDbImItems() { await invoke('save_data', { key: 'IM_ITEMS', payload: JSON.stringify(imItems) }); }
  async function saveDbCsConfigs() { await invoke('save_data', { key: 'CS_CONFIGS', payload: JSON.stringify(csConfigs) }); }
  async function saveDbCmCustomers() { await invoke('save_data', { key: 'CM_CUSTOMERS', payload: JSON.stringify(cmCustomers) }); }
  async function saveDbEmOperators() { await invoke('save_data', { key: 'EM_OPERATORS', payload: JSON.stringify(emOperators) }); }
  async function saveDbMmMachines() { await invoke('save_data', { key: 'MM_MACHINES', payload: JSON.stringify(mmMachines) }); }
  async function saveDbAgEntries() { await invoke('save_data', { key: 'AG_ENTRIES', payload: JSON.stringify(agEntries) }); }
`;
content = content.replace("// ===== Master Data: Items =====", injectFuncs + "\n  // ===== Master Data: Items =====");


// 5. Replace declarations to use rawDB objects
content = content.replace("const imItems = [", "const imItems = rawImItems ? JSON.parse(rawImItems) : [");
content = content.replace("const csConfigs = [];", "const csConfigs = rawCsConfigs ? JSON.parse(rawCsConfigs) : [];");
content = content.replace("const cmCustomers = [", "const cmCustomers = rawCmCustomers ? JSON.parse(rawCmCustomers) : [");
content = content.replace("const emOperators = [", "const emOperators = rawEmOperators ? JSON.parse(rawEmOperators) : [");
content = content.replace("const mmMachines = [", "const mmMachines = rawMmMachines ? JSON.parse(rawMmMachines) : [");
content = content.replace("const agEntries = [];", "const agEntries = rawAgEntries ? JSON.parse(rawAgEntries) : [];");

// 6. Fix confirm reset button to use await
content = content.replace(
  "if (confirmResetBtn) confirmResetBtn.addEventListener('click', () => {",
  "if (confirmResetBtn) confirmResetBtn.addEventListener('click', async () => {"
);
content = content.replace("localStorage.setItem(COMPANY_KEY, encodeData(currentData));", "await setCompanyData(currentData);");
content = content.replace("localStorage.setItem(COMPANY_KEY, encodeData(data));", "await setCompanyData(data);");
content = content.replace("localStorage.setItem(SETUP_KEY, 'true');", "await setSetupComplete(true);");

// 7. Fix getUsedRecoveryPasswords inside recovery
content = content.replace(
  "function getUsedRecoveryPasswords() {\n      const raw = localStorage.getItem(USED_RECOVERY_KEY);\n      return raw ? JSON.parse(raw) : [];\n    }",
  "// getUsedRecoveryPasswords replaced by global"
);
content = content.replace("localStorage.setItem(USED_RECOVERY_KEY, JSON.stringify(used));", "await addUsedRecoveryPassword(password);");
content = content.replace("rcvVerifyBtn.addEventListener('click', () => {", "rcvVerifyBtn.addEventListener('click', async () => {");
content = content.replace("rcvVerifyBtn.addEventListener('click', function() {", "rcvVerifyBtn.addEventListener('click', async function() {");

// 8. Inject array saves automatically after render calls
content = content.replace(/renderItemTable\(\)/g, "renderItemTable(); saveDbImItems();");
content = content.replace(/renderCsTable\(\)/g, "renderCsTable(); saveDbCsConfigs();");
content = content.replace(/renderCmTable\(\)/g, "renderCmTable(); saveDbCmCustomers();");
content = content.replace(/renderEmTable\(\)/g, "renderEmTable(); saveDbEmOperators();");
content = content.replace(/renderMmTable\(\)/g, "renderMmTable(); saveDbMmMachines();");
content = content.replace(/renderAgTable\(\)/g, "renderAgTable(); saveDbAgEntries();");

fs.writeFileSync('src/main.js', content, 'utf8');
console.log('Script updated successfully');
