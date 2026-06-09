// Cherry Precision — Navigation Controller v2

document.addEventListener('DOMContentLoaded', async () => {
  const { invoke } = window.__TAURI__.core;

  // ===== FIRST-LAUNCH ONBOARDING + SESSION LOGIN =====
  const SETUP_KEY = 'cherry_setup_complete';
  const COMPANY_KEY = 'cherry_company_data';
  const VALID_USER = 'cherry';
  const VALID_PASS = 'cherry123';
  const LICENSE_KEYWORD = 'CHERRY-PRECISION-LICENSED-PRODUCT-KEY-2026';

  const obLogin = document.getElementById('onboarding-login');
  const obLicense = document.getElementById('onboarding-license');
  const obUpload = document.getElementById('onboarding-upload');
  const obRegister = document.getElementById('onboarding-register');
  const sessionLogin = document.getElementById('session-login');
  const appContainer = document.getElementById('app-container');


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

  async function saveDbImItems() { await invoke('save_data', { key: 'IM_ITEMS', payload: JSON.stringify(imItems) }); }
  async function saveDbCsConfigs() { await invoke('save_data', { key: 'CS_CONFIGS', payload: JSON.stringify(csConfigs) }); }
  async function saveDbCmCustomers() { await invoke('save_data', { key: 'CM_CUSTOMERS', payload: JSON.stringify(cmCustomers) }); }
  async function saveDbEmOperators() { await invoke('save_data', { key: 'EM_OPERATORS', payload: JSON.stringify(emOperators) }); }
  async function saveDbMmMachines() { await invoke('save_data', { key: 'MM_MACHINES', payload: JSON.stringify(mmMachines) }); }
  async function saveDbAgEntries() { await invoke('save_data', { key: 'AG_ENTRIES', payload: JSON.stringify(agEntries) }); }

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
        let keys = ['COMPANY_KEY', 'SETUP_KEY', 'USED_RECOVERY_KEY', 'IM_ITEMS', 'CS_CONFIGS', 'CM_CUSTOMERS', 'EM_OPERATORS', 'MM_MACHINES', 'AG_ENTRIES'];
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
  const companyData = memory_COMPANY_DATA;

  // ── Password visibility toggle — works for ALL eye toggles on all screens ──
  document.querySelectorAll('.ob-eye-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wrap = btn.closest('.onboarding-input-wrap');
      if (!wrap) return;
      const inp = wrap.querySelector('input[type="password"], input.ob-password-visible');
      if (!inp) return;
      const isPassword = inp.type === 'password';
      inp.type = isPassword ? 'text' : 'password';
      inp.classList.toggle('ob-password-visible', isPassword);
      btn.querySelector('.eye-open').style.display = isPassword ? 'none' : '';
      btn.querySelector('.eye-closed').style.display = isPassword ? '' : 'none';
    });
  });

  if (setupComplete && companyData) {
    // Setup done → show session login every time
    hideAllScreens();
    sessionLogin.classList.remove('hidden');
    // Show company name
    const compNameEl = document.getElementById('session-company-name');
    if (compNameEl) compNameEl.textContent = companyData.companyName;

    // Session login handler
    const sessNameInput = document.getElementById('session-admin-name');
    const sessPassInput = document.getElementById('session-password');
    const sessLoginBtn = document.getElementById('session-login-btn');
    const sessError = document.getElementById('session-login-error');

    function attemptSessionLogin() {
      const currentData = getCompanyData(); // Re-read in case password was changed
      const name = sessNameInput.value.trim();
      const pass = sessPassInput.value;
      // Debug: log what's being compared
      console.log('[LOGIN DEBUG] entered name:', JSON.stringify(name));
      console.log('[LOGIN DEBUG] entered pass:', JSON.stringify(pass));
      console.log('[LOGIN DEBUG] stored adminName:', currentData ? JSON.stringify(currentData.adminName) : 'NO DATA');
      console.log('[LOGIN DEBUG] stored adminPassword:', currentData ? JSON.stringify(currentData.adminPassword) : 'NO DATA');
      console.log('[LOGIN DEBUG] name match:', currentData ? name === currentData.adminName : false);
      console.log('[LOGIN DEBUG] pass match:', currentData ? pass === currentData.adminPassword : false);
      if (currentData && name === currentData.adminName && pass === currentData.adminPassword) {
        sessionLogin.classList.add('ob-fade-out');
        setTimeout(() => { showApp(); }, 400);
      } else {
        // Reset error styling in case it was changed by password reset success
        sessError.textContent = 'Invalid admin name or password';
        sessError.style.color = '';
        sessError.style.borderColor = '';
        sessError.style.background = '';
        sessError.classList.remove('visible');
        void sessError.offsetWidth;
        sessError.classList.add('visible');
      }
    }

    if (sessLoginBtn) sessLoginBtn.addEventListener('click', attemptSessionLogin);
    [sessNameInput, sessPassInput].forEach(input => {
      if (input) input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') attemptSessionLogin();
      });
    });

    // ── Forgot Password / Recovery System ──
    const MASTER_RECOVERY_PASSWORDS = [
      'CHRRY-R3C0V-XK9P2-2026A',
      'CHRRY-R3C0V-BM7W4-2026B',
      'CHRRY-R3C0V-QN5L8-2026C',
      'CHRRY-R3C0V-HT2J6-2026D',
      'CHRRY-R3C0V-YF4R1-2026E',
      'CHRRY-R3C0V-ZD8V3-2026F'
    ];
    const USED_RECOVERY_KEY = 'cherry_used_recovery';

    // getUsedRecoveryPasswords replaced by global

    async function markRecoveryUsed(password) {
      await addUsedRecoveryPassword(password);
    }

    const forgotLink = document.getElementById('session-forgot-link');
    const recoveryModal = document.getElementById('recovery-modal');
    const recoveryInput = document.getElementById('recovery-password-input');
    const recoveryError = document.getElementById('recovery-error');
    const recoverySubmit = document.getElementById('recovery-submit-btn');
    const recoveryBack = document.getElementById('recovery-back-btn');
    const resetScreen = document.getElementById('password-reset-screen');

    // Open recovery modal
    if (forgotLink) {
      forgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        sessionLogin.classList.add('hidden');
        recoveryModal.classList.remove('hidden');
        if (recoveryInput) recoveryInput.value = '';
        if (recoveryError) recoveryError.classList.remove('visible');
      });
    }

    // Back to login
    if (recoveryBack) {
      recoveryBack.addEventListener('click', () => {
        recoveryModal.classList.add('hidden');
        sessionLogin.classList.remove('hidden');
      });
    }

    // Submit recovery password
    if (recoverySubmit) {
      recoverySubmit.addEventListener('click', () => {
        const enteredPass = recoveryInput.value.trim();
        const usedPasswords = getUsedRecoveryPasswords();

        if (MASTER_RECOVERY_PASSWORDS.includes(enteredPass) && !usedPasswords.includes(enteredPass)) {
          // Valid and unused → mark as used and go to reset screen
          markRecoveryUsed(enteredPass);
          recoveryModal.classList.add('hidden');
          resetScreen.classList.remove('hidden');
        } else {
          // Invalid or already used
          recoveryError.classList.remove('visible');
          void recoveryError.offsetWidth;
          recoveryError.classList.add('visible');
        }
      });
    }

    // ── Password Reset Screen (after recovery) ──
    const resetNewPass = document.getElementById('reset-new-password');
    const resetConfirmPass = document.getElementById('reset-confirm-password');
    const resetSubmit = document.getElementById('reset-submit-btn');
    const resetError = document.getElementById('reset-error');

    function validateResetPassword() {
      if (!resetNewPass || !resetConfirmPass) return;
      const pw = resetNewPass.value;
      const cpw = resetConfirmPass.value;
      const hasLength = pw.length >= 8;
      const hasNumber = /\d/.test(pw);
      const hasSpecial = /[!@#$%^&*]/.test(pw);
      const match = pw === cpw && pw.length > 0;

      updatePwdRule('reset-rule-length', hasLength);
      updatePwdRule('reset-rule-number', hasNumber);
      updatePwdRule('reset-rule-special', hasSpecial);
      updatePwdRule('reset-rule-match', match);

      const allValid = hasLength && hasNumber && hasSpecial && match;
      if (resetSubmit) {
        resetSubmit.disabled = !allValid;
        resetSubmit.classList.toggle('onboarding-btn--disabled', !allValid);
      }
    }

    function updatePwdRule(id, passed) {
      const el = document.getElementById(id);
      if (!el) return;
      const icon = el.querySelector('.pwd-rule-icon');
      if (passed) {
        el.style.color = '#22c55e';
        if (icon) icon.textContent = '●';
      } else {
        el.style.color = '';
        if (icon) icon.textContent = '○';
      }
    }

    if (resetNewPass) resetNewPass.addEventListener('input', validateResetPassword);
    if (resetConfirmPass) resetConfirmPass.addEventListener('input', validateResetPassword);

    if (resetSubmit) {
      resetSubmit.addEventListener('click', async () => {
        const currentData = getCompanyData();
        if (!currentData) return;
        currentData.adminPassword = resetNewPass.value;
        await setCompanyData(currentData); // persist to SQLite
        // Go to session login with success
        resetScreen.classList.add('hidden');
        sessionLogin.classList.remove('hidden');
        sessPassInput.value = '';
        sessNameInput.value = '';
        sessError.textContent = '✅ Password reset successfully! Please sign in with your new password.';
        sessError.style.color = '#22c55e';
        sessError.style.borderColor = '#22c55e';
        sessError.style.background = 'rgba(34,197,94,.08)';
        sessError.classList.add('visible');
      });
    }

  } else {
    // First-time setup flow
    if (obLogin) obLogin.classList.remove('hidden');

    // ── Screen 1: Cherry Login ──
    const obLoginBtn = document.getElementById('ob-login-btn');
    const obUserInput = document.getElementById('ob-user-id');
    const obPassInput = document.getElementById('ob-password');
    const obLoginError = document.getElementById('ob-login-error');

    function attemptLogin() {
      const userId = obUserInput.value.trim();
      const password = obPassInput.value.trim();
      if (userId === VALID_USER && password === VALID_PASS) {
        obLogin.classList.add('ob-fade-out');
        setTimeout(() => {
          obLogin.classList.add('hidden');
          obLogin.classList.remove('ob-fade-out');
          obLicense.classList.remove('hidden');
        }, 400);
      } else {
        obLoginError.classList.remove('visible');
        void obLoginError.offsetWidth;
        obLoginError.classList.add('visible');
      }
    }

    if (obLoginBtn) obLoginBtn.addEventListener('click', attemptLogin);
    [obUserInput, obPassInput].forEach(input => {
      if (input) input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') attemptLogin();
      });
    });


    // ── Screen 2: License Agreement ──
    const obAcceptCheck = document.getElementById('ob-accept-check');
    const obAcceptBtn = document.getElementById('ob-accept-btn');

    if (obAcceptCheck && obAcceptBtn) {
      obAcceptCheck.addEventListener('change', () => {
        obAcceptBtn.disabled = !obAcceptCheck.checked;
        obAcceptBtn.classList.toggle('onboarding-btn--disabled', !obAcceptCheck.checked);
      });

      obAcceptBtn.addEventListener('click', () => {
        if (!obAcceptCheck.checked) return;
        obLicense.classList.add('ob-fade-out');
        setTimeout(() => {
          obLicense.classList.add('hidden');
          obLicense.classList.remove('ob-fade-out');
          obUpload.classList.remove('hidden');
        }, 400);
      });
    }

    // ── Screen 3: License File Upload ──
    const uploadZone = document.getElementById('ob-upload-zone');
    const fileInput = document.getElementById('ob-license-file');
    const uploadStatus = document.getElementById('ob-upload-status');
    const uploadError = document.getElementById('ob-upload-error');
    const uploadSuccess = document.getElementById('ob-upload-success');
    const verifyBtn = document.getElementById('ob-verify-btn');
    let licenseValid = false;

    if (uploadZone) {
      uploadZone.addEventListener('click', () => fileInput.click());
      uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
      uploadZone.addEventListener('dragleave', () => { uploadZone.classList.remove('drag-over'); });
      uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) processFile(e.dataTransfer.files[0]);
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) processFile(fileInput.files[0]);
      });
    }

    function processFile(file) {
      uploadError.classList.remove('visible');
      uploadSuccess.classList.remove('visible');
      licenseValid = false;
      verifyBtn.disabled = true;
      verifyBtn.classList.add('onboarding-btn--disabled');

      uploadStatus.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="file-icon"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
        '<span>' + file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)</span>';
      uploadStatus.classList.add('visible');
      uploadZone.querySelector('.license-upload-text').textContent = 'Verifying license...';
      uploadZone.querySelector('.license-upload-hint').textContent = 'Please wait';

      const reader = new FileReader();
      reader.onload = function (e) {
        const content = e.target.result;
        setTimeout(() => {
          if (content.includes(LICENSE_KEYWORD)) {
            licenseValid = true;
            uploadZone.classList.add('file-loaded');
            uploadZone.querySelector('.license-upload-text').textContent = file.name;
            uploadZone.querySelector('.license-upload-hint').textContent = 'License file loaded';
            uploadSuccess.classList.remove('visible'); void uploadSuccess.offsetWidth; uploadSuccess.classList.add('visible');
            uploadError.classList.remove('visible');
            verifyBtn.disabled = false;
            verifyBtn.classList.remove('onboarding-btn--disabled');
          } else {
            uploadZone.classList.remove('file-loaded');
            uploadZone.querySelector('.license-upload-text').textContent = 'Drag & drop your license file here';
            uploadZone.querySelector('.license-upload-hint').textContent = 'or click to browse';
            uploadError.classList.remove('visible'); void uploadError.offsetWidth; uploadError.classList.add('visible');
            uploadSuccess.classList.remove('visible');
            verifyBtn.disabled = true;
            verifyBtn.classList.add('onboarding-btn--disabled');
          }
        }, 800);
      };
      reader.readAsText(file);
    }

    if (verifyBtn) {
      verifyBtn.addEventListener('click', () => {
        if (!licenseValid) return;
        // Go to registration screen
        obUpload.classList.add('ob-fade-out');
        setTimeout(() => {
          obUpload.classList.add('hidden');
          obUpload.classList.remove('ob-fade-out');
          obRegister.classList.remove('hidden');
        }, 400);
      });
    }

    // ── Screen 4: Company Registration ──
    const regCompanyName = document.getElementById('reg-company-name');
    const regAddress = document.getElementById('reg-address');
    const regAdminName = document.getElementById('reg-admin-name');
    const regPassword = document.getElementById('reg-password');
    const regConfirmPassword = document.getElementById('reg-confirm-password');
    const regSubmitBtn = document.getElementById('reg-submit-btn');
    const regError = document.getElementById('reg-error');

    const ruleLength = document.getElementById('rule-length');
    const ruleNumber = document.getElementById('rule-number');
    const ruleSpecial = document.getElementById('rule-special');
    const ruleMatch = document.getElementById('rule-match');

    function validatePassword() {
      const pw = regPassword.value;
      const cpw = regConfirmPassword.value;

      const hasLength = pw.length >= 8;
      const hasNumber = /\d/.test(pw);
      const hasSpecial = /[!@#$%^&*]/.test(pw);
      const matches = pw.length > 0 && pw === cpw;

      // Update rule indicators
      ruleLength.className = 'pwd-rule ' + (pw.length > 0 ? (hasLength ? 'pass' : 'fail') : '');
      ruleLength.querySelector('.pwd-rule-icon').textContent = hasLength ? '✓' : (pw.length > 0 ? '✗' : '○');

      ruleNumber.className = 'pwd-rule ' + (pw.length > 0 ? (hasNumber ? 'pass' : 'fail') : '');
      ruleNumber.querySelector('.pwd-rule-icon').textContent = hasNumber ? '✓' : (pw.length > 0 ? '✗' : '○');

      ruleSpecial.className = 'pwd-rule ' + (pw.length > 0 ? (hasSpecial ? 'pass' : 'fail') : '');
      ruleSpecial.querySelector('.pwd-rule-icon').textContent = hasSpecial ? '✓' : (pw.length > 0 ? '✗' : '○');

      ruleMatch.className = 'pwd-rule ' + (cpw.length > 0 ? (matches ? 'pass' : 'fail') : '');
      ruleMatch.querySelector('.pwd-rule-icon').textContent = matches ? '✓' : (cpw.length > 0 ? '✗' : '○');

      // Check all fields filled
      const allFilled = regCompanyName.value.trim() && regAddress.value.trim() && regAdminName.value.trim();
      const allValid = hasLength && hasNumber && hasSpecial && matches && allFilled;

      regSubmitBtn.disabled = !allValid;
      regSubmitBtn.classList.toggle('onboarding-btn--disabled', !allValid);

      return allValid;
    }

    // Live validation
    [regPassword, regConfirmPassword].forEach(input => {
      if (input) input.addEventListener('input', validatePassword);
    });
    [regCompanyName, regAddress, regAdminName].forEach(input => {
      if (input) input.addEventListener('input', validatePassword);
    });

    if (regSubmitBtn) {
      regSubmitBtn.addEventListener('click', async () => {
        if (!validatePassword()) return;

        // Store company data
        const data = {
          companyName: regCompanyName.value.trim(),
          address: regAddress.value.trim(),
          adminName: regAdminName.value.trim(),
          adminPassword: regPassword.value,
          createdAt: new Date().toISOString()
        };

        // Save native SQLite payload
        await setCompanyData(data);
        await setSetupComplete(true);

        // Fade out and show app
        obRegister.classList.add('ob-fade-out');
        setTimeout(() => { showApp(); }, 400);
      });
    }
  }

  // ===== MAIN APP CODE =====

  const navButtons = document.querySelectorAll('.nav-btn');
  const pages = document.querySelectorAll('.page');

  // Password config — Settings uses admin password (dynamic), AirGauge has separate
  function getAdminPassword() {
    const d = getCompanyData();
    return d ? d.adminPassword : 'cherry123';
  }
  const AIRGAUGE_PASSWORD = 'airgauge123';
  let settingsUnlocked = false;
  let airgaugeUnlocked = false;

  // Modal elements — Settings
  const modal = document.getElementById('password-modal');
  const passwordInput = document.getElementById('password-input');
  const passwordError = document.getElementById('password-error');
  const passwordSubmit = document.getElementById('password-submit');
  const passwordCancel = document.getElementById('password-cancel');

  // Modal elements — Airgauge
  const agModal = document.getElementById('airgauge-password-modal');
  const agPasswordInput = document.getElementById('ag-password-input');
  const agPasswordError = document.getElementById('ag-password-error');
  const agPasswordSubmit = document.getElementById('ag-password-submit');
  const agPasswordCancel = document.getElementById('ag-password-cancel');

  // Header elements
  const breadcrumbPage = document.getElementById('breadcrumb-page');
  const headerClock = document.getElementById('header-clock');

  // Page name mapping for breadcrumb
  const pageNames = {
    'home': 'Home',
    'live-data': 'Live Data',
    'runchat': 'Runchat',
    'report': 'Report',
    'status': 'Status',
    'settings': 'Settings',
    'airgauge-setup': 'Airgauge Setup',
    'item-master': 'Item Master',
    'component-setup': 'Component Setup',
    'customer-master': 'Customer Master',
    'employee-master': 'Employee Master',
    'machine-master': 'Machine Master',
  };

  // ── Live Clock ──
  function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    if (headerClock) headerClock.textContent = `${h}:${m}:${s}`;
  }
  updateClock();
  setInterval(updateClock, 1000);

  // ── Update Breadcrumb ──
  function updateBreadcrumb(pageId) {
    const name = pageId.replace('page-', '');
    if (breadcrumbPage) {
      breadcrumbPage.textContent = pageNames[name] || name;
    }
  }

  // Show a specific page (hides all others)
  function showPage(pageId) {
    pages.forEach(page => {
      const isActive = page.id === pageId;
      if (isActive && !page.classList.contains('active')) {
        page.classList.add('active');
        page.style.animation = 'none';
        page.offsetHeight;
        page.style.animation = '';
      } else if (!isActive) {
        page.classList.remove('active');
      }
    });
    updateBreadcrumb(pageId);
  }

  // Navigate to a main page
  function navigateTo(pageName) {
    // If going to settings and not unlocked, show password modal
    if (pageName === 'settings' && !settingsUnlocked) {
      showPasswordModal();
      return;
    }

    // Update sidebar buttons
    navButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === pageName);
    });

    // Refresh Run Chart graphs when visiting runchat page
    if (pageName === 'runchat') {
      setTimeout(renderRunChatGraphs, 50);
    }

    // Refresh Report Filter arrays dynamically when visiting report page
    if (pageName === 'report' && typeof populateReportDropdowns === 'function') {
      populateReportDropdowns();
    }

    // Show the page
    showPage(`page-${pageName}`);
  }

  // Navigate to a settings sub-page
  function navigateToSubpage(subpageName) {
    // Airgauge requires its own password
    if (subpageName === 'airgauge-setup' && !airgaugeUnlocked) {
      showAirgaugePasswordModal();
      return;
    }

    // Keep settings button active in sidebar
    navButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === 'settings');
    });

    showPage(`page-${subpageName}`);
  }

  // --- Password Modal ---
  function showPasswordModal() {
    passwordInput.value = '';
    passwordError.classList.remove('visible');
    modal.classList.add('visible');
    setTimeout(() => passwordInput.focus(), 100);
  }

  function hidePasswordModal() {
    modal.classList.remove('visible');
    passwordInput.value = '';
    passwordError.classList.remove('visible');
  }

  function attemptUnlock() {
    const password = passwordInput.value;
    if (password === getAdminPassword()) {
      settingsUnlocked = true;
      hidePasswordModal();
      navigateTo('settings');
    } else {
      passwordError.classList.remove('visible');
      void passwordError.offsetHeight;
      passwordError.classList.add('visible');
      passwordInput.value = '';
      passwordInput.focus();
    }
  }

  passwordSubmit.addEventListener('click', attemptUnlock);
  passwordCancel.addEventListener('click', () => {
    hidePasswordModal();
    // Stay on current page
  });

  // Enter key in password input
  passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') attemptUnlock();
    if (e.key === 'Escape') hidePasswordModal();
  });

  // Close modal on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) hidePasswordModal();
  });

  // --- Airgauge Password Modal ---
  function showAirgaugePasswordModal() {
    agPasswordInput.value = '';
    agPasswordError.classList.remove('visible');
    agModal.classList.add('visible');
    setTimeout(() => agPasswordInput.focus(), 100);
  }

  function hideAirgaugePasswordModal() {
    agModal.classList.remove('visible');
    agPasswordInput.value = '';
    agPasswordError.classList.remove('visible');
  }

  function attemptAirgaugeUnlock() {
    const pw = agPasswordInput.value;
    if (pw === getAdminPassword()) {
      // Reject admin password for AirGauge
      agPasswordError.textContent = 'Cannot use Admin Password for AirGauge access';
      agPasswordError.classList.remove('visible');
      void agPasswordError.offsetHeight;
      agPasswordError.classList.add('visible');
      agPasswordInput.value = '';
      agPasswordInput.focus();
    } else if (pw === AIRGAUGE_PASSWORD) {
      airgaugeUnlocked = true;
      hideAirgaugePasswordModal();
      navigateToSubpage('airgauge-setup');
    } else {
      agPasswordError.textContent = 'Incorrect password';
      agPasswordError.classList.remove('visible');
      void agPasswordError.offsetHeight;
      agPasswordError.classList.add('visible');
      agPasswordInput.value = '';
      agPasswordInput.focus();
    }
  }

  agPasswordSubmit.addEventListener('click', attemptAirgaugeUnlock);
  agPasswordCancel.addEventListener('click', hideAirgaugePasswordModal);

  agPasswordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') attemptAirgaugeUnlock();
    if (e.key === 'Escape') hideAirgaugePasswordModal();
  });

  agModal.addEventListener('click', (e) => {
    if (e.target === agModal) hideAirgaugePasswordModal();
  });

  // --- Sidebar Nav ---
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      navigateTo(btn.dataset.page);
    });
  });

  // --- Settings Cards → Sub-pages ---
  document.querySelectorAll('.settings-card').forEach(card => {
    card.addEventListener('click', () => {
      const subpage = card.dataset.subpage;
      if (subpage) {
        // Populate Factory Settings data before navigating
        if (subpage === 'factory-settings') {
          populateFactorySettings();
        }
        navigateToSubpage(subpage);
      }
    });
  });

  // ── Factory Settings — display registered company data ──
  function populateFactorySettings() {
    const data = getCompanyData();
    if (!data) return;
    const setEl = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value || '—';
    };
    setEl('factory-company-name', data.companyName);
    setEl('factory-company-address', data.address);
    setEl('factory-admin-name', data.adminName);
    setEl('factory-reg-date', data.createdAt
      ? new Date(data.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '—');
  }

  // --- Back Buttons ---
  document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.back;
      if (target) navigateTo(target);
    });
  });

  // --- Dashboard Cards ---
  document.querySelectorAll('.dash-card').forEach(card => {
    card.addEventListener('click', () => {
      const title = card.querySelector('.card-title')?.textContent.trim().toLowerCase();
      const mapping = {
        'live data': 'live-data',
        'run chat': 'runchat',
        'reports': 'report',
        'status': 'status',
      };
      const page = mapping[title];
      if (page) navigateTo(page);
    });
  });

  // --- Keyboard Navigation (1-6) ---
  document.addEventListener('keydown', (e) => {
    // Don't trigger if typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const keyMap = {
      '1': 'home',
      '2': 'live-data',
      '3': 'runchat',
      '4': 'report',
      '5': 'status',
      '6': 'settings',
    };
    if (keyMap[e.key] && !e.ctrlKey && !e.altKey && !e.metaKey) {
      navigateTo(keyMap[e.key]);
    }
  });

  // Initialize breadcrumb
  updateBreadcrumb('page-home');

  // ===== Item Master CRUD =====
  const imItems = rawImItems ? JSON.parse(rawImItems) : [
    { code: '123', name: 'gauge', drawing: '', revision: '' },
    { code: '135', name: 'screw', drawing: '', revision: '' },
  ];
  const imTableBody = document.getElementById('im-table-body');
  const imTable = document.getElementById('im-table');
  const imEmptyMsg = document.getElementById('im-empty-msg');
  const imSelectAll = document.getElementById('im-select-all');
  const imAddBtn = document.getElementById('im-add-btn');
  const imDeleteBtn = document.getElementById('im-delete-btn');

  function renderItemTable(filter) {
    imTableBody.innerHTML = '';
    const term = (filter || '').toLowerCase();
    const filtered = imItems
      .map((item, i) => ({ ...item, _idx: i }))
      .filter(item => {
        if (!term) return true;
        return item.code.toLowerCase().includes(term)
          || item.name.toLowerCase().includes(term)
          || item.drawing.toLowerCase().includes(term)
          || item.revision.toLowerCase().includes(term);
      });

    // Update count badge
    const imCountBadge = document.getElementById('im-count-badge');
    if (imCountBadge) imCountBadge.textContent = `${imItems.length} item${imItems.length !== 1 ? 's' : ''}`;

    if (filtered.length === 0) {
      imTable.classList.add('hidden');
      imEmptyMsg.classList.remove('hidden');
      return;
    }
    imTable.classList.remove('hidden');
    imEmptyMsg.classList.add('hidden');

    filtered.forEach((item, dispIdx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${dispIdx + 1}</td>
        <td><input type="checkbox" class="im-row-chk" data-idx="${item._idx}" /></td>
        <td>${escapeHtml(item.code)}</td>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.drawing)}</td>
        <td>${escapeHtml(item.revision)}</td>
      `;
      const chk = tr.querySelector('.im-row-chk');
      chk.addEventListener('change', () => {
        tr.classList.toggle('im-row-selected', chk.checked);
        updateSelectAll();
      });
      imTableBody.appendChild(tr);
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function updateSelectAll() {
    const boxes = imTableBody.querySelectorAll('.im-row-chk');
    const allChecked = boxes.length > 0 && [...boxes].every(b => b.checked);
    imSelectAll.checked = allChecked;
  }

  // Add Item
  imAddBtn.addEventListener('click', () => {
    const code = document.getElementById('im-item-code').value.trim();
    const name = document.getElementById('im-item-name').value.trim();
    const drawing = document.getElementById('im-drawing-no').value.trim();
    const revision = document.getElementById('im-revision-no').value.trim();

    if (!code && !name) return; // require at least code or name

    imItems.push({ code, name, drawing, revision });
    const imSearchInput = document.getElementById('im-search');
    renderItemTable(imSearchInput ? imSearchInput.value : '');

    // Clear form
    document.getElementById('im-item-code').value = '';
    document.getElementById('im-item-name').value = '';
    document.getElementById('im-drawing-no').value = '';
    document.getElementById('im-revision-no').value = '';
    document.getElementById('im-item-code').focus();
  });

  // Edit Selected
  const imEditBtn = document.getElementById('im-edit-btn');
  if (imEditBtn) imEditBtn.addEventListener('click', () => {
    const boxes = imTableBody.querySelectorAll('.im-row-chk:checked');
    if (boxes.length !== 1) {
      alert('Please select exactly ONE item to edit.');
      return;
    }
    const idx = parseInt(boxes[0].dataset.idx);
    const item = imItems[idx];
    document.getElementById('im-item-code').value = item.code || '';
    document.getElementById('im-item-name').value = item.name || '';
    document.getElementById('im-drawing-no').value = item.drawing || '';
    document.getElementById('im-revision-no').value = item.revision || '';
    imItems.splice(idx, 1);
    imSelectAll.checked = false;
    renderItemTable(imSearchInput ? imSearchInput.value : '');
    document.getElementById('im-item-code').focus();
  });

  // Delete Selected
  imDeleteBtn.addEventListener('click', () => {
    const boxes = imTableBody.querySelectorAll('.im-row-chk:checked');
    if (boxes.length === 0) return;
    const indices = [...boxes].map(b => parseInt(b.dataset.idx)).sort((a, b) => b - a);
    indices.forEach(i => imItems.splice(i, 1));
    imSelectAll.checked = false;
    const imSearchInput = document.getElementById('im-search');
    renderItemTable(imSearchInput ? imSearchInput.value : '');
  });

  // Select All
  imSelectAll.addEventListener('change', () => {
    const boxes = imTableBody.querySelectorAll('.im-row-chk');
    boxes.forEach(b => {
      b.checked = imSelectAll.checked;
      b.closest('tr').classList.toggle('im-row-selected', imSelectAll.checked);
    });
  });

  // Item Search
  const imSearchInput = document.getElementById('im-search');
  if (imSearchInput) {
    imSearchInput.addEventListener('input', () => {
      renderItemTable(imSearchInput.value);
    });
  }

  // Initial render
  renderItemTable(); saveDbImItems();;

  // ===== Component Setup CRUD =====
  const csConfigs = rawCsConfigs ? JSON.parse(rawCsConfigs) : [];
  const csTableBody = document.getElementById('cs-table-body');
  const csTable = document.getElementById('cs-table');
  const csEmptyMsg = document.getElementById('cs-empty-msg');
  const csSelectAll = document.getElementById('cs-select-all');
  const csSaveBtn = document.getElementById('cs-save-btn');
  const csDeleteBtn = document.getElementById('cs-delete-btn');
  const csItemSelect = document.getElementById('cs-item');
  const csCustomerSelect = document.getElementById('cs-customer');

  // Populate Item dropdown from Item Master data
  function refreshItemDropdown() {
    const currentVal = csItemSelect.value;
    csItemSelect.innerHTML = '<option value="">— Select Item —</option>';
    imItems.forEach(item => {
      const opt = document.createElement('option');
      const label = item.name + (item.code ? ` (${item.code})` : '');
      opt.value = label;
      opt.textContent = label;
      csItemSelect.appendChild(opt);
    });
    // Restore previous selection if still valid
    csItemSelect.value = currentVal;
  }

  // Patch renderItemTable to also refresh dropdown
  const _origRenderItemTable = renderItemTable;
  renderItemTable = function () {
    _origRenderItemTable();
    refreshItemDropdown();
  };

  function renderCSTable() {
    csTableBody.innerHTML = '';

    // Update count badge
    const csCountBadge = document.getElementById('cs-count-badge');
    if (csCountBadge) csCountBadge.textContent = `${csConfigs.length} config${csConfigs.length !== 1 ? 's' : ''}`;

    if (csConfigs.length === 0) {
      csTable.classList.add('hidden');
      csEmptyMsg.classList.remove('hidden');
      return;
    }
    csTable.classList.remove('hidden');
    csEmptyMsg.classList.add('hidden');

    csConfigs.forEach((cfg, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="checkbox" class="cs-row-chk" data-idx="${idx}" /></td>
        <td>${escapeHtml(cfg.airgaugeId)}</td>
        <td>${escapeHtml(cfg.type || '')}</td>
        <td>${escapeHtml(cfg.channel)}</td>
        <td>${escapeHtml(cfg.item)}</td>
        <td>${escapeHtml(cfg.drawing)}</td>
        <td>${escapeHtml(cfg.lowTol)}</td>
        <td>${escapeHtml(cfg.highTol)}</td>
        <td>${escapeHtml(cfg.customer)}</td>
      `;
      const chk = tr.querySelector('.cs-row-chk');
      chk.addEventListener('change', () => {
        tr.classList.toggle('im-row-selected', chk.checked);
        updateCSSelectAll();
      });
      csTableBody.appendChild(tr);
    });
  }

  function updateCSSelectAll() {
    const boxes = csTableBody.querySelectorAll('.cs-row-chk');
    const allChecked = boxes.length > 0 && [...boxes].every(b => b.checked);
    csSelectAll.checked = allChecked;
  }

  // Save Setup
  csSaveBtn.addEventListener('click', () => {
    const airgaugeId = document.getElementById('cs-airgauge-id').value.trim();
    const type = document.getElementById('cs-type').value;
    const item = csItemSelect.value;
    const customer = csCustomerSelect.value;
    const channel = document.querySelector('input[name="cs-channel"]:checked')?.value || 'CH1';
    const drawing = document.getElementById('cs-drawing').value.trim();
    const lowTol = document.getElementById('cs-low-tol').value.trim();
    const highTol = document.getElementById('cs-high-tol').value.trim();

    if (!airgaugeId) return; // require at least AirGauge ID
    if (!type) {
      alert('Please select a Type (Shaft or Hole).');
      return;
    }

    csConfigs.push({ airgaugeId, type, channel, item, drawing, lowTol, highTol, customer });
    renderCSTable();

    // Clear form (keep channel selection)
    document.getElementById('cs-drawing').value = '';
    document.getElementById('cs-low-tol').value = '';
    document.getElementById('cs-high-tol').value = '';
    document.getElementById('cs-type').value = '';
  });

  // Edit Selected
  const csEditBtn = document.getElementById('cs-edit-btn');
  if (csEditBtn) csEditBtn.addEventListener('click', () => {
    const boxes = csTableBody.querySelectorAll('.cs-row-chk:checked');
    if (boxes.length !== 1) {
      alert('Please select exactly ONE component to edit.');
      return;
    }
    const idx = parseInt(boxes[0].dataset.idx);
    const cfg = csConfigs[idx];
    document.getElementById('cs-airgauge-id').value = cfg.airgaugeId || '';
    document.getElementById('cs-type').value = cfg.type || '';
    csItemSelect.value = cfg.item || '';
    csCustomerSelect.value = cfg.customer || '';
    const radio = document.querySelector(`input[name="cs-channel"][value="${cfg.channel}"]`);
    if (radio) radio.checked = true;
    document.getElementById('cs-drawing').value = cfg.drawing || '';
    document.getElementById('cs-low-tol').value = cfg.lowTol || '';
    document.getElementById('cs-high-tol').value = cfg.highTol || '';
    csConfigs.splice(idx, 1);
    csSelectAll.checked = false;
    renderCSTable();
    document.getElementById('cs-airgauge-id').focus();
  });

  // Delete Selected
  csDeleteBtn.addEventListener('click', () => {
    const boxes = csTableBody.querySelectorAll('.cs-row-chk:checked');
    if (boxes.length === 0) return;
    const indices = [...boxes].map(b => parseInt(b.dataset.idx)).sort((a, b) => b - a);
    indices.forEach(i => csConfigs.splice(i, 1));
    csSelectAll.checked = false;
    renderCSTable();
  });

  // Select All
  csSelectAll.addEventListener('change', () => {
    const boxes = csTableBody.querySelectorAll('.cs-row-chk');
    boxes.forEach(b => {
      b.checked = csSelectAll.checked;
      b.closest('tr').classList.toggle('im-row-selected', csSelectAll.checked);
    });
  });

  // Refresh dropdowns when Component Setup page is shown
  document.querySelectorAll('.settings-card').forEach(card => {
    if (card.dataset.subpage === 'component-setup') {
      card.addEventListener('click', () => {
        setTimeout(() => {
          refreshItemDropdown();
          refreshCustomerDropdown();
        }, 50);
      });
    }
  });

  // Initial renders
  renderCSTable();
  refreshItemDropdown();

  // ===== Customer Master CRUD =====
  const cmCustomers = rawCmCustomers ? JSON.parse(rawCmCustomers) : [
    { code: '456', name: 'cherry', description: '', email: 'hari@gamil.com', phone: '567' },
    { code: '166', name: 'v3', description: 'ejpifupviwuebdiuvfbegpiweur', email: 'cherry@gamil.com', phone: '1234567890' },
    { code: '555', name: 'robert bosch cherry precision', description: 'ljhiu', email: '', phone: '' },
    { code: '7777', name: 'intel', description: '', email: '', phone: '' },
    { code: '666', name: 'amd', description: '', email: '', phone: '' },
    { code: '888', name: 'qualcom', description: '', email: '', phone: '' },
    { code: '444', name: 'awerg', description: '', email: '', phone: '' },
    { code: '2222', name: 'dvfvsef', description: '', email: '', phone: '' },
    { code: '222r', name: 'dfefe', description: '', email: '', phone: '' },
    { code: '777777', name: 'jvljhvjv', description: '', email: '', phone: '' },
  ];
  const cmTableBody = document.getElementById('cm-table-body');
  const cmTable = document.getElementById('cm-table');
  const cmEmptyMsg = document.getElementById('cm-empty-msg');
  const cmSelectAll = document.getElementById('cm-select-all');
  const cmAddBtn = document.getElementById('cm-add-btn');
  const cmDeleteBtn = document.getElementById('cm-delete-btn');
  const cmSearchInput = document.getElementById('cm-search');
  const cmSaveAllBtn = document.getElementById('cm-save-all-btn');

  function renderCustomerTable(filter) {
    cmTableBody.innerHTML = '';
    const term = (filter || '').toLowerCase();
    const filtered = cmCustomers
      .map((c, i) => ({ ...c, _idx: i }))
      .filter(c => {
        if (!term) return true;
        return c.code.toLowerCase().includes(term)
          || c.name.toLowerCase().includes(term)
          || c.description.toLowerCase().includes(term)
          || c.email.toLowerCase().includes(term)
          || c.phone.toLowerCase().includes(term);
      });

    if (filtered.length === 0) {
      cmTable.classList.add('hidden');
      cmEmptyMsg.classList.remove('hidden');
      return;
    }
    cmTable.classList.remove('hidden');
    cmEmptyMsg.classList.add('hidden');

    filtered.forEach((cust, dispIdx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${dispIdx + 1}</td>
        <td><input type="checkbox" class="cm-row-chk" data-idx="${cust._idx}" /></td>
        <td>${escapeHtml(cust.code)}</td>
        <td>${escapeHtml(cust.name)}</td>
        <td>${escapeHtml(cust.description)}</td>
        <td>${escapeHtml(cust.email)}</td>
        <td>${escapeHtml(cust.phone)}</td>
      `;
      const chk = tr.querySelector('.cm-row-chk');
      chk.addEventListener('change', () => {
        tr.classList.toggle('im-row-selected', chk.checked);
        updateCMSelectAll();
      });
      cmTableBody.appendChild(tr);
    });

    // Update count badge
    const cmCountBadge = document.getElementById('cm-count-badge');
    if (cmCountBadge) cmCountBadge.textContent = `${cmCustomers.length} customer${cmCustomers.length !== 1 ? 's' : ''}`;

    refreshCustomerDropdown();
  }

  function updateCMSelectAll() {
    const boxes = cmTableBody.querySelectorAll('.cm-row-chk');
    const allChecked = boxes.length > 0 && [...boxes].every(b => b.checked);
    cmSelectAll.checked = allChecked;
  }

  // Populate Customer dropdown from Customer Master data
  function refreshCustomerDropdown() {
    const currentVal = csCustomerSelect.value;
    csCustomerSelect.innerHTML = '<option value="">\u2014 Select Customer \u2014</option>';
    cmCustomers.forEach(cust => {
      const opt = document.createElement('option');
      const label = cust.name + (cust.code ? ` (${cust.code})` : '');
      opt.value = label;
      opt.textContent = label;
      csCustomerSelect.appendChild(opt);
    });
    csCustomerSelect.value = currentVal;
  }

  // Add Customer
  cmAddBtn.addEventListener('click', () => {
    const code = document.getElementById('cm-cust-code').value.trim();
    const name = document.getElementById('cm-cust-name').value.trim();
    const description = document.getElementById('cm-description').value.trim();
    const email = document.getElementById('cm-email').value.trim();
    const phone = document.getElementById('cm-phone').value.trim();

    if (!name && !code) return;

    cmCustomers.push({ code, name, description, email, phone });
    renderCustomerTable(cmSearchInput.value);

    document.getElementById('cm-cust-code').value = '';
    document.getElementById('cm-cust-name').value = '';
    document.getElementById('cm-description').value = '';
    document.getElementById('cm-email').value = '';
    document.getElementById('cm-phone').value = '';
    document.getElementById('cm-cust-code').focus();
  });

  // Edit Selected
  const cmEditBtn = document.getElementById('cm-edit-btn');
  if (cmEditBtn) cmEditBtn.addEventListener('click', () => {
    const boxes = cmTableBody.querySelectorAll('.cm-row-chk:checked');
    if (boxes.length !== 1) {
      alert('Please select exactly ONE customer to edit.');
      return;
    }
    const idx = parseInt(boxes[0].dataset.idx);
    const cust = cmCustomers[idx];
    document.getElementById('cm-cust-code').value = cust.code || '';
    document.getElementById('cm-cust-name').value = cust.name || '';
    document.getElementById('cm-description').value = cust.description || '';
    document.getElementById('cm-email').value = cust.email || '';
    document.getElementById('cm-phone').value = cust.phone || '';
    cmCustomers.splice(idx, 1);
    cmSelectAll.checked = false;
    renderCustomerTable(cmSearchInput ? cmSearchInput.value : '');
    document.getElementById('cm-cust-code').focus();
  });

  // Delete Selected
  cmDeleteBtn.addEventListener('click', () => {
    const boxes = cmTableBody.querySelectorAll('.cm-row-chk:checked');
    if (boxes.length === 0) return;
    const indices = [...boxes].map(b => parseInt(b.dataset.idx)).sort((a, b) => b - a);
    indices.forEach(i => cmCustomers.splice(i, 1));
    cmSelectAll.checked = false;
    renderCustomerTable(cmSearchInput.value);
  });

  // Select All
  cmSelectAll.addEventListener('change', () => {
    const boxes = cmTableBody.querySelectorAll('.cm-row-chk');
    boxes.forEach(b => {
      b.checked = cmSelectAll.checked;
      b.closest('tr').classList.toggle('im-row-selected', cmSelectAll.checked);
    });
  });

  // Search / Filter
  cmSearchInput.addEventListener('input', () => {
    renderCustomerTable(cmSearchInput.value);
  });

  // Save All (visual confirmation)
  cmSaveAllBtn.addEventListener('click', () => {
    cmSaveAllBtn.textContent = '✓ Saved!';
    cmSaveAllBtn.style.pointerEvents = 'none';
    setTimeout(() => {
      cmSaveAllBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save All';
      cmSaveAllBtn.style.pointerEvents = '';
    }, 1500);
  });

  // Initial render
  renderCustomerTable();
  refreshCustomerDropdown();

  // ===== Employee Master CRUD =====
  const emOperators = rawEmOperators ? JSON.parse(rawEmOperators) : [
    { operatorId: '034', name: 'harikumar', description: '', phone: '24578' },
    { operatorId: '012', name: 'kavin', description: 'dedicated', phone: '987654321' },
    { operatorId: '567', name: 'Harikumar', description: '', phone: '8428541082' },
    { operatorId: '123', name: 'sanjeev', description: '', phone: '' },
  ];
  const emTableBody = document.getElementById('em-table-body');
  const emTable = document.getElementById('em-table');
  const emEmptyMsg = document.getElementById('em-empty-msg');
  const emSelectAll = document.getElementById('em-select-all');
  const emAddBtn = document.getElementById('em-add-btn');
  const emDeleteBtn = document.getElementById('em-delete-btn');

  function renderEmployeeTable(filter) {
    emTableBody.innerHTML = '';
    const term = (filter || '').toLowerCase();
    const filtered = emOperators
      .map((op, i) => ({ ...op, _idx: i }))
      .filter(op => {
        if (!term) return true;
        return op.operatorId.toLowerCase().includes(term)
          || op.name.toLowerCase().includes(term)
          || op.description.toLowerCase().includes(term)
          || op.phone.toLowerCase().includes(term);
      });

    // Update count badge
    const emCountBadge = document.getElementById('em-count-badge');
    if (emCountBadge) emCountBadge.textContent = `${emOperators.length} operator${emOperators.length !== 1 ? 's' : ''}`;

    if (filtered.length === 0) {
      emTable.classList.add('hidden');
      emEmptyMsg.classList.remove('hidden');
      return;
    }
    emTable.classList.remove('hidden');
    emEmptyMsg.classList.add('hidden');

    filtered.forEach((op, dispIdx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${dispIdx + 1}</td>
        <td><input type="checkbox" class="em-row-chk" data-idx="${op._idx}" /></td>
        <td>${escapeHtml(op.operatorId)}</td>
        <td>${escapeHtml(op.name)}</td>
        <td>${escapeHtml(op.description)}</td>
        <td>${escapeHtml(op.phone)}</td>
      `;
      const chk = tr.querySelector('.em-row-chk');
      chk.addEventListener('change', () => {
        tr.classList.toggle('im-row-selected', chk.checked);
        updateEMSelectAll();
      });
      emTableBody.appendChild(tr);
    });
  }

  function updateEMSelectAll() {
    const boxes = emTableBody.querySelectorAll('.em-row-chk');
    const allChecked = boxes.length > 0 && [...boxes].every(b => b.checked);
    emSelectAll.checked = allChecked;
  }

  // Add Operator
  emAddBtn.addEventListener('click', () => {
    const operatorId = document.getElementById('em-operator-id').value.trim();
    const name = document.getElementById('em-name').value.trim();
    const description = document.getElementById('em-description').value.trim();
    const phone = document.getElementById('em-phone').value.trim();

    if (!operatorId && !name) return;

    // Validate: Operator ID must be exactly 3 digits
    if (!/^\d{3}$/.test(operatorId)) {
      alert('Operator ID must be exactly 3 digits (e.g. 034, 567).');
      return;
    }

    emOperators.push({ operatorId, name, description, phone });
    const emSearchInput = document.getElementById('em-search');
    renderEmployeeTable(emSearchInput ? emSearchInput.value : '');

    document.getElementById('em-operator-id').value = '';
    document.getElementById('em-name').value = '';
    document.getElementById('em-description').value = '';
    document.getElementById('em-phone').value = '';
    document.getElementById('em-operator-id').focus();
  });

  // Edit Selected
  const emEditBtn = document.getElementById('em-edit-btn');
  if (emEditBtn) emEditBtn.addEventListener('click', () => {
    const boxes = emTableBody.querySelectorAll('.em-row-chk:checked');
    if (boxes.length !== 1) {
      alert('Please select exactly ONE operator to edit.');
      return;
    }
    const idx = parseInt(boxes[0].dataset.idx);
    const op = emOperators[idx];
    document.getElementById('em-operator-id').value = op.operatorId || '';
    document.getElementById('em-name').value = op.name || '';
    document.getElementById('em-description').value = op.description || '';
    document.getElementById('em-phone').value = op.phone || '';
    emOperators.splice(idx, 1);
    emSelectAll.checked = false;
    renderEmployeeTable(emSearchInput ? emSearchInput.value : '');
    document.getElementById('em-operator-id').focus();
  });

  // Delete Selected
  emDeleteBtn.addEventListener('click', () => {
    const boxes = emTableBody.querySelectorAll('.em-row-chk:checked');
    if (boxes.length === 0) return;
    const indices = [...boxes].map(b => parseInt(b.dataset.idx)).sort((a, b) => b - a);
    indices.forEach(i => emOperators.splice(i, 1));
    emSelectAll.checked = false;
    const emSearchInput = document.getElementById('em-search');
    renderEmployeeTable(emSearchInput ? emSearchInput.value : '');
  });

  // Select All
  emSelectAll.addEventListener('change', () => {
    const boxes = emTableBody.querySelectorAll('.em-row-chk');
    boxes.forEach(b => {
      b.checked = emSelectAll.checked;
      b.closest('tr').classList.toggle('im-row-selected', emSelectAll.checked);
    });
  });

  // Employee Search
  const emSearchInput = document.getElementById('em-search');
  if (emSearchInput) {
    emSearchInput.addEventListener('input', () => {
      renderEmployeeTable(emSearchInput.value);
    });
  }

  // Initial render
  renderEmployeeTable();

  // ===== Machine Master CRUD =====
  const mmMachines = rawMmMachines ? JSON.parse(rawMmMachines) : [
    { code: '12', name: 'CNC Lathe', description: 'Main CNC machine' },
    { code: '15', name: 'Grinding Unit', description: 'Surface grinder' },
    { code: '20', name: 'Milling Center', description: 'Vertical mill' },
    { code: '25', name: 'Drill Press', description: 'Precision drill' },
  ];
  const mmTableBody = document.getElementById('mm-table-body');
  const mmTable = document.getElementById('mm-table');
  const mmEmptyMsg = document.getElementById('mm-empty-msg');
  const mmSelectAll = document.getElementById('mm-select-all');
  const mmAddBtn = document.getElementById('mm-add-btn');
  const mmDeleteBtn = document.getElementById('mm-delete-btn');
  const mmSearchInput = document.getElementById('mm-search');

  function renderMachineTable(filter) {
    mmTableBody.innerHTML = '';
    const term = (filter || '').toLowerCase();
    const filtered = mmMachines
      .map((m, i) => ({ ...m, _idx: i }))
      .filter(m => {
        if (!term) return true;
        return m.code.toLowerCase().includes(term)
          || m.name.toLowerCase().includes(term)
          || m.description.toLowerCase().includes(term);
      });

    // Update count badge
    const mmCountBadge = document.getElementById('mm-count-badge');
    if (mmCountBadge) mmCountBadge.textContent = `${mmMachines.length} machine${mmMachines.length !== 1 ? 's' : ''}`;

    if (filtered.length === 0) {
      mmTable.classList.add('hidden');
      mmEmptyMsg.classList.remove('hidden');
      return;
    }
    mmTable.classList.remove('hidden');
    mmEmptyMsg.classList.add('hidden');

    filtered.forEach((m, dispIdx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${dispIdx + 1}</td>
        <td><input type="checkbox" class="mm-row-chk" data-idx="${m._idx}" /></td>
        <td>${escapeHtml(m.code)}</td>
        <td>${escapeHtml(m.name)}</td>
        <td>${escapeHtml(m.description)}</td>
      `;
      const chk = tr.querySelector('.mm-row-chk');
      chk.addEventListener('change', () => {
        tr.classList.toggle('im-row-selected', chk.checked);
        updateMMSelectAll();
      });
      mmTableBody.appendChild(tr);
    });
  }

  function updateMMSelectAll() {
    const boxes = mmTableBody.querySelectorAll('.mm-row-chk');
    const allChecked = boxes.length > 0 && [...boxes].every(b => b.checked);
    mmSelectAll.checked = allChecked;
  }

  // Add Machine
  mmAddBtn.addEventListener('click', () => {
    const code = document.getElementById('mm-code').value.trim();
    const name = document.getElementById('mm-machine-name').value.trim();
    const description = document.getElementById('mm-description').value.trim();

    if (!code && !name) return;

    // Validate: Machine code must be exactly 2 digits
    if (!/^\d{2}$/.test(code)) {
      alert('Machine Code must be exactly 2 digits (e.g. 01, 12, 30).');
      return;
    }

    mmMachines.push({ code, name, description });
    renderMachineTable(mmSearchInput ? mmSearchInput.value : '');

    // Clear form
    document.getElementById('mm-code').value = '';
    document.getElementById('mm-machine-name').value = '';
    document.getElementById('mm-description').value = '';
    document.getElementById('mm-code').focus();
  });

  // Edit Selected
  const mmEditBtn = document.getElementById('mm-edit-btn');
  if (mmEditBtn) mmEditBtn.addEventListener('click', () => {
    const boxes = mmTableBody.querySelectorAll('.mm-row-chk:checked');
    if (boxes.length !== 1) {
      alert('Please select exactly ONE machine to edit.');
      return;
    }
    const idx = parseInt(boxes[0].dataset.idx);
    const m = mmMachines[idx];
    document.getElementById('mm-code').value = m.code || '';
    document.getElementById('mm-machine-name').value = m.name || '';
    document.getElementById('mm-description').value = m.description || '';
    mmMachines.splice(idx, 1);
    mmSelectAll.checked = false;
    renderMachineTable(mmSearchInput ? mmSearchInput.value : '');
    document.getElementById('mm-code').focus();
  });

  // Delete Selected
  mmDeleteBtn.addEventListener('click', () => {
    const boxes = mmTableBody.querySelectorAll('.mm-row-chk:checked');
    if (boxes.length === 0) return;
    const indices = [...boxes].map(b => parseInt(b.dataset.idx)).sort((a, b) => b - a);
    indices.forEach(i => mmMachines.splice(i, 1));
    mmSelectAll.checked = false;
    renderMachineTable(mmSearchInput ? mmSearchInput.value : '');
  });

  // Select All
  mmSelectAll.addEventListener('change', () => {
    const boxes = mmTableBody.querySelectorAll('.mm-row-chk');
    boxes.forEach(b => {
      b.checked = mmSelectAll.checked;
      b.closest('tr').classList.toggle('im-row-selected', mmSelectAll.checked);
    });
  });

  // Machine Search
  if (mmSearchInput) {
    mmSearchInput.addEventListener('input', () => {
      renderMachineTable(mmSearchInput.value);
    });
  }

  // Initial render
  renderMachineTable();

  // ===== Airgauge Setup CRUD =====
  const agEntries = rawAgEntries ? JSON.parse(rawAgEntries) : [];
  const agTableBody = document.getElementById('ag-table-body');
  const agTable = document.getElementById('ag-table');
  const agEmptyMsg = document.getElementById('ag-empty-msg');
  const agSelectAll = document.getElementById('ag-select-all');
  const agAddBtn = document.getElementById('ag-add-btn');
  const agDeleteBtn = document.getElementById('ag-delete-btn');
  const agSearchInput = document.getElementById('ag-search');

  function renderAirgaugeTable(filter) {
    agTableBody.innerHTML = '';
    const term = (filter || '').toLowerCase();
    const filtered = agEntries
      .map((e, i) => ({ ...e, _idx: i }))
      .filter(e => {
        if (!term) return true;
        return e.macAddress.toLowerCase().includes(term)
          || e.airgaugeId.toLowerCase().includes(term);
      });

    // Update count badge
    const agCountBadge = document.getElementById('ag-count-badge');
    if (agCountBadge) agCountBadge.textContent = `${agEntries.length} entr${agEntries.length !== 1 ? 'ies' : 'y'}`;

    if (filtered.length === 0) {
      agTable.classList.add('hidden');
      agEmptyMsg.classList.remove('hidden');
      return;
    }
    agTable.classList.remove('hidden');
    agEmptyMsg.classList.add('hidden');

    filtered.forEach((e, dispIdx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${dispIdx + 1}</td>
        <td><input type="checkbox" class="ag-row-chk" data-idx="${e._idx}" /></td>
        <td>${escapeHtml(e.macAddress)}</td>
        <td>${escapeHtml(e.airgaugeId)}</td>
      `;
      const chk = tr.querySelector('.ag-row-chk');
      chk.addEventListener('change', () => {
        tr.classList.toggle('im-row-selected', chk.checked);
        updateAGSelectAll();
      });
      agTableBody.appendChild(tr);
    });
  }

  function updateAGSelectAll() {
    const boxes = agTableBody.querySelectorAll('.ag-row-chk');
    const allChecked = boxes.length > 0 && [...boxes].every(b => b.checked);
    agSelectAll.checked = allChecked;
  }

  // Add Entry
  agAddBtn.addEventListener('click', () => {
    const macAddress = document.getElementById('ag-mac-address').value.trim();
    const airgaugeId = document.getElementById('ag-airgauge-id').value.trim();

    if (!macAddress && !airgaugeId) return;

    agEntries.push({ macAddress, airgaugeId });
    renderAirgaugeTable(agSearchInput ? agSearchInput.value : '');

    // Clear form
    document.getElementById('ag-mac-address').value = '';
    document.getElementById('ag-airgauge-id').value = '';
    document.getElementById('ag-mac-address').focus();
  });

  // Edit Selected
  const agEditBtn = document.getElementById('ag-edit-btn');
  if (agEditBtn) agEditBtn.addEventListener('click', () => {
    const boxes = agTableBody.querySelectorAll('.ag-row-chk:checked');
    if (boxes.length !== 1) {
      alert('Please select exactly ONE entry to edit.');
      return;
    }
    const idx = parseInt(boxes[0].dataset.idx);
    const m = agEntries[idx];
    document.getElementById('ag-mac-address').value = m.macAddress || '';
    document.getElementById('ag-airgauge-id').value = m.airgaugeId || '';
    agEntries.splice(idx, 1);
    agSelectAll.checked = false;
    renderAirgaugeTable(agSearchInput ? agSearchInput.value : '');
    document.getElementById('ag-mac-address').focus();
  });

  // Delete Selected
  agDeleteBtn.addEventListener('click', () => {
    const boxes = agTableBody.querySelectorAll('.ag-row-chk:checked');
    if (boxes.length === 0) return;
    const indices = [...boxes].map(b => parseInt(b.dataset.idx)).sort((a, b) => b - a);
    indices.forEach(i => agEntries.splice(i, 1));
    agSelectAll.checked = false;
    renderAirgaugeTable(agSearchInput ? agSearchInput.value : '');
  });

  // Select All
  agSelectAll.addEventListener('change', () => {
    const boxes = agTableBody.querySelectorAll('.ag-row-chk');
    boxes.forEach(b => {
      b.checked = agSelectAll.checked;
      b.closest('tr').classList.toggle('im-row-selected', agSelectAll.checked);
    });
  });

  // Airgauge Search
  if (agSearchInput) {
    agSearchInput.addEventListener('input', () => {
      renderAirgaugeTable(agSearchInput.value);
    });
  }

  // Initial render
  renderAirgaugeTable();

  // ===== LIVE DATA — Serial Port Communication =====
  const serialPortSelect = document.getElementById('serial-port-select');
  const serialBaudRate = document.getElementById('serial-baud-rate');
  const serialRefreshBtn = document.getElementById('serial-refresh-btn');
  const serialConnectBtn = document.getElementById('serial-connect-btn');
  const serialDisconnectBtn = document.getElementById('serial-disconnect-btn');
  const serialStatusIndicator = document.getElementById('serial-status-indicator');
  const serialPacketCount = document.getElementById('serial-packet-count');
  const serialDataBody = document.getElementById('serial-data-body');
  const serialDataTable = document.getElementById('serial-data-table');
  const serialEmptyMsg = document.getElementById('serial-empty-msg');
  const serialCountBadge = document.getElementById('serial-count-badge');
  const serialClearBtn = document.getElementById('serial-clear-btn');

  // Report Page Table mapping
  const reportDataBody = document.getElementById('report-data-body');
  const reportDataTable = document.getElementById('report-data-table');
  const reportEmptyMsg = document.getElementById('report-empty-msg');
  const reportCountBadge = document.getElementById('report-count-badge');
  const reportClearBtn = document.getElementById('report-clear-btn');

  let serialRowCount = 0;
  let serialUnlisten = null;
  let serialErrorUnlisten = null;
  let serialDisconnectedUnlisten = null;

  // Helper: update connection status indicator
  function setSerialStatus(connected) {
    if (connected) {
      serialStatusIndicator.innerHTML = '<span style="width:8px;height:8px;border-radius:50%;background:currentColor;display:inline-block;"></span> Connected';
      serialStatusIndicator.style.background = 'rgba(34,197,94,0.1)';
      serialStatusIndicator.style.color = '#22c55e';
      serialConnectBtn.disabled = true;
      serialConnectBtn.style.opacity = '0.5';
      serialDisconnectBtn.disabled = false;
      serialDisconnectBtn.style.opacity = '1';
      serialPortSelect.disabled = true;
      serialBaudRate.disabled = true;
    } else {
      serialStatusIndicator.innerHTML = '<span style="width:8px;height:8px;border-radius:50%;background:currentColor;display:inline-block;"></span> Disconnected';
      serialStatusIndicator.style.background = 'rgba(239,68,68,0.1)';
      serialStatusIndicator.style.color = '#ef4444';
      serialConnectBtn.disabled = false;
      serialConnectBtn.style.opacity = '1';
      serialDisconnectBtn.disabled = true;
      serialDisconnectBtn.style.opacity = '0.5';
      serialPortSelect.disabled = false;
      serialBaudRate.disabled = false;
    }
  }

  // Refresh available serial ports
  async function refreshSerialPorts() {
    try {
      const datalist = document.getElementById('serial-ports-list');
      if (!datalist) return;

      const ports = await window.__TAURI__.core.invoke('list_serial_ports');
      datalist.innerHTML = '';
      ports.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.name;
        opt.textContent = `${p.name} (${p.port_type})`;
        datalist.appendChild(opt);
      });
    } catch (e) {
      console.error('Failed to list serial ports:', e);
    }
  }

  // Refresh button
  if (serialRefreshBtn) {
    serialRefreshBtn.addEventListener('click', refreshSerialPorts);
  }

  // Auto-refresh ports when navigating to Live Data page
  const origNavigateTo = navigateTo;
  navigateTo = function (page) {
    origNavigateTo(page);
    if (page === 'live-data') {
      refreshSerialPorts();
    }
  };

  // Connect
  if (serialConnectBtn) {
    serialConnectBtn.addEventListener('click', async () => {
      const portName = serialPortSelect.value;
      const baudRate = parseInt(serialBaudRate.value);

      if (!portName) {
        alert('Please select a COM port first.');
        return;
      }

      try {
        const result = await window.__TAURI__.core.invoke('start_serial_reading', {
          portName: portName,
          baudRate: baudRate,
        });
        console.log('Serial connected:', result);
        setSerialStatus(true);

        // Listen for serial-data events
        serialUnlisten = await window.__TAURI__.event.listen('serial-data', (event) => {
          const data = event.payload;
          addSerialRow(data);
        });

        // Listen for serial-error events
        serialErrorUnlisten = await window.__TAURI__.event.listen('serial-error', (event) => {
          console.error('Serial error:', event.payload);
          setSerialStatus(false);
          cleanupListeners();
        });

        // Listen for serial-disconnected events
        serialDisconnectedUnlisten = await window.__TAURI__.event.listen('serial-disconnected', () => {
          setSerialStatus(false);
          cleanupListeners();
        });
      } catch (e) {
        alert('Connection failed: ' + e);
        console.error('Serial connect error:', e);
      }
    });
  }

  // Auto-Connect (USB / ESP32)
  async function performAutoConnect(btn) {
    if (!btn) return;
    try {
      btn.disabled = true;
      btn.innerHTML = 'Scanning...';

      const detectedPort = await window.__TAURI__.core.invoke('auto_detect_esp_port');

      // Select it in dropdown if it exists
      const options = Array.from(serialPortSelect.options);
      if (!options.find(opt => opt.value === detectedPort)) {
        const newOpt = document.createElement('option');
        newOpt.value = detectedPort;
        newOpt.textContent = `${detectedPort} (USB Auto)`;
        serialPortSelect.appendChild(newOpt);
      }
      serialPortSelect.value = detectedPort;

      // Start connection
      const baudRate = parseInt(serialBaudRate.value);
      const result = await window.__TAURI__.core.invoke('start_serial_reading', {
        portName: detectedPort,
        baudRate: baudRate,
      });

      console.log('USB Auto-Connected:', result);
      setSerialStatus(true);

      serialUnlisten = await window.__TAURI__.event.listen('serial-data', (event) => addSerialRow(event.payload));
      serialErrorUnlisten = await window.__TAURI__.event.listen('serial-error', (event) => {
        console.error('Serial error:', event.payload);
        setSerialStatus(false);
        cleanupListeners();
      });
      serialDisconnectedUnlisten = await window.__TAURI__.event.listen('serial-disconnected', () => {
        setSerialStatus(false);
        cleanupListeners();
      });

      // Navigate to live data view to see incoming stream
      navigateTo('live-data');

    } catch (e) {
      alert('Auto Connect failed: No ESP USB hardware found or port busy. \n\n' + e);
      console.warn('Auto Connect warning:', e);
    } finally {
      btn.disabled = false;
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg> Auto Connect (USB)`;
    }
  }

  const usbAutoConnectBtn = document.getElementById('usb-auto-connect-btn');
  if (usbAutoConnectBtn) {
    usbAutoConnectBtn.addEventListener('click', () => performAutoConnect(usbAutoConnectBtn));
  }

  // USB Dashboard Card — navigate to dedicated USB page
  const dashCardUsb = document.getElementById('dash-card-usb');
  if (dashCardUsb) {
    dashCardUsb.addEventListener('click', () => {
      if (typeof navigateTo === 'function') {
        navigateTo('usb');
      }
    });
  }

  // Disconnect
  if (serialDisconnectBtn) {
    serialDisconnectBtn.addEventListener('click', async () => {
      try {
        await window.__TAURI__.core.invoke('stop_serial_reading');
        setSerialStatus(false);
        cleanupListeners();
      } catch (e) {
        console.error('Disconnect error:', e);
      }
    });
  }

  // Cleanup event listeners
  function cleanupListeners() {
    if (serialUnlisten) { serialUnlisten(); serialUnlisten = null; }
    if (serialErrorUnlisten) { serialErrorUnlisten(); serialErrorUnlisten = null; }
    if (serialDisconnectedUnlisten) { serialDisconnectedUnlisten(); serialDisconnectedUnlisten = null; }
  }

  // Add a row to the live data table
  function addSerialRow(data) {
    serialRowCount++;

    // -- Live Chart Capture Logic --
    if (document.getElementById('page-runchat') && document.getElementById('page-runchat').classList.contains('active')) {
      if (data.airgauge_id && data.channel && data.reading !== undefined) {

        activeRunCharts.forEach(chart => {
          if (
            chart.ag && chart.ch &&
            String(parseInt(data.airgauge_id, 10)) === String(parseInt(chart.ag, 10)) &&
            String(parseInt(String(data.channel).toUpperCase().replace('CH', ''), 10)) === String(parseInt(String(chart.ch).toUpperCase().replace('CH', ''), 10))
          ) {
            chart.sampleCount++;
            chart.readings.push({ count: chart.sampleCount, reading: parseFloat(data.reading) });
            // keep buffer to 100 max
            if (chart.readings.length > 100) chart.readings.shift();
            updateChartInstance(chart);
          }
        });
      }
    }

    // Hide empty message, show table
    if (serialEmptyMsg) serialEmptyMsg.classList.add('hidden');
    if (serialDataTable) serialDataTable.classList.remove('hidden');
    if (reportEmptyMsg) reportEmptyMsg.classList.add('hidden');
    if (reportDataTable) reportDataTable.classList.remove('hidden');

    // ── Lookup: User ID → Employee Master
    // employee_id from string is 3-digit code, find matching operator
    const empMatch = emOperators.find(op => op.operatorId === (data.employee_id || '').trim());
    const userIdDisplay = empMatch
      ? escapeHtml(empMatch.operatorId + ' - ' + empMatch.name)
      : escapeHtml(data.employee_id || '—');

    // ── Lookup: Machine ID → Machine Master
    // machine_id from string is 2-digit code
    const machMatch = mmMachines.find(m => m.code === (data.machine_id || '').trim());
    const machineDisplay = machMatch
      ? escapeHtml(machMatch.code + ' - ' + machMatch.name)
      : escapeHtml(data.machine_id || '—');

    // ── Lookup: AirGauge ID + Channel → Component Setup
    // airgauge_id and channel are already stripped of leading zeros
    const csMatch = csConfigs.find(cfg =>
      String(parseInt(cfg.airgaugeId, 10)) === String(parseInt(data.airgauge_id || '0', 10)) &&
      String(parseInt(cfg.channel.replace('CH', ''), 10)) === String(parseInt(data.channel || '0', 10))
    );
    const itemDisplay = csMatch ? escapeHtml(csMatch.item || '—') : '—';
    const customerDisplay = csMatch ? escapeHtml(csMatch.customer || '—') : '—';

    // ── Drawing value mismatch check
    // Incoming drawing value from string (e.g. "100.0000")
    // Component setup drawing is stored as a plain string (user's input)
    let drawingCellStyle = '';
    let drawingMismatchTitle = '';
    if (csMatch) {
      const incomingDrawing = (data.drawing_value || '').trim();
      const setupDrawing = (csMatch.drawing || '').trim();
      if (setupDrawing && incomingDrawing !== setupDrawing) {
        drawingCellStyle = 'background:rgba(239,68,68,0.15);color:#dc2626;font-weight:700;';
        drawingMismatchTitle = ` title="MISMATCH: expected ${setupDrawing}"`;
      }
    }

    // ── Status badge
    let statusBadge;
    if (data.status === 'ACCEPTED') {
      statusBadge = '<span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;background:rgba(34,197,94,0.12);color:#16a34a;">ACCEPTED</span>';
    } else if (data.status === 'REJECTED') {
      statusBadge = '<span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;background:rgba(239,68,68,0.12);color:#dc2626;">REJECTED</span>';
    } else if (data.status === 'REWORK') {
      statusBadge = '<span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;background:rgba(245,158,11,0.12);color:#d97706;">REWORK</span>';
    } else {
      statusBadge = `<span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;background:rgba(100,116,139,0.12);color:#64748b;">${escapeHtml(data.status)}</span>`;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${serialRowCount}</td>
      <td>${escapeHtml(data.date || '—')}</td>
      <td>${escapeHtml(data.time || '—')}</td>
      <td><strong>${escapeHtml(data.reading || '—')}</strong></td>
      <td>${escapeHtml(data.offset || '—')}</td>
      <td>${statusBadge}</td>
      <td>${escapeHtml(data.airgauge_id || '—')}</td>
      <td>${escapeHtml(data.channel || '—')}</td>
      <td style="${drawingCellStyle}"${drawingMismatchTitle}>${escapeHtml(data.drawing_value || '—')}</td>
      <td>${userIdDisplay}</td>
      <td>${escapeHtml(data.comp_id || '—')}</td>
      <td>${itemDisplay}</td>
      <td>${machineDisplay}</td>
      <td>${customerDisplay}</td>
    `;

    // Add subtle flash animation
    tr.style.animation = 'fadeInRow 0.3s ease-out';

    // Prepend (newest at top)
    if (serialDataBody) {
      if (serialDataBody.firstChild) serialDataBody.insertBefore(tr, serialDataBody.firstChild);
      else serialDataBody.appendChild(tr);
    }

    // Update counters
    if (serialPacketCount) serialPacketCount.textContent = `${serialRowCount} packets received`;
    if (serialCountBadge) serialCountBadge.textContent = `${serialRowCount} reading${serialRowCount !== 1 ? 's' : ''}`;

    // Limit table to 500 rows for performance
    if (serialDataBody) {
      while (serialDataBody.children.length > 500) serialDataBody.removeChild(serialDataBody.lastChild);
    }
  }

  // Clear all data
  function clearSerialData() {
    if (serialDataBody) serialDataBody.innerHTML = '';
    if (reportDataBody) reportDataBody.innerHTML = '';
    serialRowCount = 0;
    if (serialPacketCount) serialPacketCount.textContent = '0 packets received';
    if (serialCountBadge) serialCountBadge.textContent = '0 readings';
    if (reportCountBadge) reportCountBadge.textContent = '0 readings';
    if (serialDataTable) serialDataTable.classList.add('hidden');
    if (serialEmptyMsg) serialEmptyMsg.classList.remove('hidden');
    if (reportDataTable) reportDataTable.classList.add('hidden');
    if (reportEmptyMsg) reportEmptyMsg.classList.remove('hidden');
  }

  if (serialClearBtn) serialClearBtn.addEventListener('click', clearSerialData);
  if (reportClearBtn) reportClearBtn.addEventListener('click', clearSerialData);

  // Initial port refresh
  refreshSerialPorts();

  // ===== USB OFFLINE DATA UPLOAD =====
  const usbUploadBtn = document.getElementById('usb-upload-btn');
  const usbFileInput = document.getElementById('usb-file-input');
  const usbClearBtn = document.getElementById('usb-clear-btn');
  const usbSaveBtn = document.getElementById('usb-save-db-btn');
  const usbRefreshBtn2 = document.getElementById('usb-refresh-btn');
  const usbEditBtn = document.getElementById('usb-edit-btn');
  const usbTableBody = document.getElementById('usb-table-body');
  let usbParsedRows = []; // Holds parsed data for save-to-DB

  // Helper: parse a single *...# packet (same logic as serial)
  function parsePacketString(raw) {
    const trimmed = raw.trim();
    if (!trimmed.startsWith('*') || !trimmed.endsWith('#')) return null;
    const inner = trimmed.slice(1, -1);
    if (inner.length < 53) return null;

    const hh = inner.substring(0, 2);
    const mm = inner.substring(2, 4);
    const ss = inner.substring(4, 6);
    const time = `${hh}:${mm}:${ss}`;

    const dd = inner.substring(7, 9);
    const month = inner.substring(9, 11);
    const yy = inner.substring(11, 13);
    const date = `${dd}/${month}/${yy}`;

    const airgauge_id = inner.substring(13, 16).replace(/^0+/, '') || '0';
    const channel = inner.substring(16, 18).replace(/^0+/, '') || '0';
    const offset = inner.substring(18, 20).replace(/^0+/, '') || '0';

    const drawRaw = inner.substring(21, 28);
    const drawing = drawRaw.substring(0, 3) + '.' + drawRaw.substring(3, 7);

    const readRaw = inner.substring(30, 37);
    const reading = readRaw.substring(0, 3) + '.' + readRaw.substring(3, 7);

    const statusChar = inner.charAt(37);
    const status = statusChar === 'A' ? 'ACCEPTED' : statusChar === 'B' ? 'REJECTED' : statusChar === 'C' ? 'REWORK' : statusChar;

    const comp_id = inner.substring(38, 48).trim();
    const employee_id = inner.substring(48, 51).trim();
    const machine_id = inner.substring(51, 53).trim();

    return { date, time, reading, offset, status, airgauge_id, channel, drawing, comp_id, employee_id, machine_id, raw: trimmed };
  }

  function renderUsbTable() {
    if (!usbTableBody) return;

    // Toggle empty state
    const usbTable = document.getElementById('usb-data-table');
    const usbEmptyMsg = document.getElementById('usb-empty-msg');

    if (usbParsedRows.length > 0) {
      if (usbEmptyMsg) usbEmptyMsg.style.display = 'none';

      usbTableBody.innerHTML = '';
      usbParsedRows.forEach((r, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${i + 1}</td>
          <td>${r.date}</td>
          <td>${r.time}</td>
          <td>${r.reading}</td>
          <td>${r.offset}</td>
          <td>${r.status}</td>
          <td>${r.airgauge_id}</td>
          <td>${r.channel}</td>
          <td>${r.drawing}</td>
          <td>${r.employee_id}</td>
          <td>${r.comp_id}</td>
          <td>-</td>
          <td>${r.machine_id}</td>
          <td>-</td>
          <td>-</td>
          <td>-</td>
        `;
        usbTableBody.appendChild(tr);
      });
    } else {
      if (usbEmptyMsg) usbEmptyMsg.style.display = 'flex';
      usbTableBody.innerHTML = '';
    }
  }

  // Upload USB Files button
  if (usbUploadBtn && usbFileInput) {
    usbUploadBtn.addEventListener('click', () => usbFileInput.click());
    usbFileInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      if (!files.length) return;

      for (const file of files) {
        const text = await file.text();
        // Try to detect format: packet-based (*...#) or CSV
        if (text.includes('*') && text.includes('#')) {
          // Extract all *...# packets
          const regex = /\*[^#]+#/g;
          let match;
          while ((match = regex.exec(text)) !== null) {
            const parsed = parsePacketString(match[0]);
            if (parsed) usbParsedRows.push(parsed);
          }
        } else {
          // Try CSV: skip header, split by comma
          const lines = text.split('\n').filter(l => l.trim());
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map(c => c.trim());
            if (cols.length >= 11) {
              usbParsedRows.push({
                date: cols[0] || '-', time: cols[1] || '-', reading: cols[2] || '-',
                offset: cols[3] || '0', status: cols[4] || '-', airgauge_id: cols[5] || '0',
                channel: cols[6] || '0', drawing: cols[7] || '-', comp_id: cols[8] || '-',
                employee_id: cols[9] || '-', machine_id: cols[10] || '-', raw: lines[i]
              });
            }
          }
        }
      }

      renderUsbTable();
      usbFileInput.value = ''; // reset for next upload
      alert(`Successfully loaded ${usbParsedRows.length} records from ${files.length} file(s).`);
    });
  }

  // Clear Data
  if (usbClearBtn) {
    usbClearBtn.addEventListener('click', () => {
      usbParsedRows = [];
      renderUsbTable();
    });
  }

  // Refresh (re-render)
  if (usbRefreshBtn2) {
    usbRefreshBtn2.addEventListener('click', () => renderUsbTable());
  }

  // Save to DB
  if (usbSaveBtn) {
    usbSaveBtn.addEventListener('click', async () => {
      if (!usbParsedRows.length) {
        alert('No data to save. Please upload USB files first.');
        return;
      }

      try {
        const payload = JSON.stringify(usbParsedRows);
        await window.__TAURI__.core.invoke('bulk_insert_readings', { jsonPayload: payload });
        alert(`Successfully saved ${usbParsedRows.length} records to the database!`);
      } catch (e) {
        alert('Failed to save to DB: ' + e);
        console.error('USB Save Error:', e);
      }
    });
  }

  // Edit Assignments (toggle contentEditable on table cells)
  if (usbEditBtn) {
    let editMode = false;
    usbEditBtn.addEventListener('click', () => {
      editMode = !editMode;
      const cells = document.querySelectorAll('#usb-table-body td');
      cells.forEach(td => {
        td.contentEditable = editMode ? 'true' : 'false';
        td.style.outline = editMode ? '1px dashed #8b5cf6' : 'none';
      });
      usbEditBtn.style.background = editMode ? '#6d28d9' : '#8b5cf6';
      usbEditBtn.innerHTML = editMode
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Done Editing'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit Assignments';
    });
  }

  // ===== Run Chart — Multi-Graph Dashboard =====
  const rcGraphsContainer = document.getElementById('rc-graphs-container');
  const rcAddGraphBtn = document.getElementById('rc-add-graph-btn');
  const rcGraphTemplate = document.getElementById('rc-graph-template');

  let activeRunCharts = []; // Array of chart instances
  let rcGraphCounter = 0;

  if (rcAddGraphBtn) {
    rcAddGraphBtn.addEventListener('click', addRunChartGraph);
  }

  function addRunChartGraph() {
    if (!rcGraphTemplate || !rcGraphsContainer) return;
    rcGraphCounter++;

    // Clone template
    const clone = rcGraphTemplate.content.cloneNode(true);
    const panel = clone.querySelector('.rc-panel');
    panel.id = `rc-graph-${rcGraphCounter}`;

    // Elements inside clone
    const agSelect = panel.querySelector('.rc-ag-select');
    const chSelect = panel.querySelector('.rc-ch-select');
    const typeBadge = panel.querySelector('.rc-live-type-badge');
    const removeBtn = panel.querySelector('.rc-remove-btn');
    const canvas = panel.querySelector('.rc-live-canvas');
    const emptyMsg = panel.querySelector('.rc-empty-msg');

    const chartInstance = {
      id: panel.id,
      ag: '',
      ch: '',
      readings: [],
      sampleCount: 0,
      panel: panel,
      canvas: canvas,
      typeBadge: typeBadge,
      emptyMsg: emptyMsg
    };


    const canvasWrap = panel.querySelector('.rc-canvas-wrap');
    if (canvasWrap) {
      let isDown = false;
      let startX;
      let scrollLeft;

      canvasWrap.addEventListener('mousedown', (e) => {
        isDown = true;
        canvasWrap.style.cursor = 'grabbing';
        startX = e.pageX;
        scrollLeft = canvasWrap.scrollLeft;
        e.preventDefault(); // Prevents accidental text bounding/selection while dragging
      });

      window.addEventListener('mouseup', () => {
        if (!isDown) return;
        isDown = false;
        canvasWrap.style.cursor = 'grab';
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX;
        const walk = (x - startX) * 1.5; // Drag speed multiplier
        canvasWrap.scrollLeft = scrollLeft - walk;
      });
    }
    activeRunCharts.push(chartInstance);

    // Listeners
    agSelect.addEventListener('change', (e) => {
      chartInstance.ag = e.target.value;
      chartInstance.readings = [];
      chartInstance.sampleCount = 0;
      updateChartInstance(chartInstance);
    });

    chSelect.addEventListener('change', (e) => {
      chartInstance.ch = e.target.value;
      chartInstance.readings = [];
      chartInstance.sampleCount = 0;
      updateChartInstance(chartInstance);
    });

    removeBtn.addEventListener('click', () => {
      // Fade out and remove
      panel.style.opacity = '0';
      panel.style.transform = 'scale(0.98)';
      panel.style.transition = 'all 0.2s ease-out';
      setTimeout(() => {
        panel.remove();
        activeRunCharts = activeRunCharts.filter(c => c.id !== chartInstance.id);
      }, 200);
    });

    // Animate in
    panel.style.opacity = '0';
    panel.style.transform = 'translateY(-10px)';

    rcGraphsContainer.appendChild(panel);

    // Trigger reflow & animation
    setTimeout(() => {
      panel.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
      panel.style.opacity = '1';
      panel.style.transform = 'translateY(0)';
    }, 10);
  }

  function updateChartInstance(chart) {
    if (!chart.ag || !chart.ch) {
      chart.canvas.style.display = 'none';
      chart.emptyMsg.style.display = '';
      chart.typeBadge.style.display = 'none';
      return;
    }

    const csMatch = csConfigs.find(cfg =>
      String(parseInt(cfg.airgaugeId, 10)) === String(parseInt(chart.ag, 10)) &&
      String(cfg.channel).toUpperCase() === String(chart.ch).toUpperCase()
    );

    if (!csMatch) {
      chart.canvas.style.display = 'none';
      chart.emptyMsg.style.display = '';
      chart.typeBadge.style.display = 'none';
      return;
    }

    chart.canvas.style.display = '';
    chart.emptyMsg.style.display = 'none';

    const typeLabel = csMatch.type || 'N/A';
    chart.typeBadge.textContent = escapeHtml(typeLabel);
    chart.typeBadge.style.display = '';
    chart.typeBadge.className = 'rc-type-badge rc-live-type-badge ' + ((typeLabel.toLowerCase() === 'shaft') ? 'rc-type-shaft' : 'rc-type-hole');

    drawToleranceChart(chart, csMatch);
  }

  function renderRunChatGraphs() {
    if (activeRunCharts.length === 0) {
      // Spawn empty initial chart if user navigates to RunChat blank
      addRunChartGraph();
    } else {
      activeRunCharts.forEach(chart => updateChartInstance(chart));
    }
  }

  function drawToleranceChart(chart, cfg) {
    const canvas = chart.canvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // Read data to calculate dynamic width
    const pts = chart.readings || [];
    const pxPerStep = 60; // 60 pixels width per data point

    // Size canvas properly
    const rect = canvas.parentElement.getBoundingClientRect();
    const minW = rect.width - 48; // padding (24 left + 24 right)
    const requiredDataWidth = 65 + 20 + (pts.length * pxPerStep); // margin.left + margin.right + data space
    const w = Math.max(minW, requiredDataWidth);

    // Auto-scroll to the right so new data is instantly visible
    const wrap = canvas.closest('.rc-canvas-wrap');
    if (wrap && canvas.width !== (w * (window.devicePixelRatio || 1))) {
      // Only snap scroll if the canvas actually grew larger to fit new data
      setTimeout(() => wrap.scrollLeft = wrap.scrollWidth, 0);
    }

    const h = 220;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);

    // Parse values
    const highTol = parseFloat(cfg.highTol) || 0;
    const drawing = parseFloat(cfg.drawing) || 0;
    const lowTol = parseFloat(cfg.lowTol) || 0;
    const isShaft = (cfg.type || '').toLowerCase() === 'shaft';

    // Colors based on type
    // Hole: High=Red, Drawing=Green, Low=Orange
    // Shaft: High=Orange, Drawing=Green, Low=Red
    const COLOR_RED = '#ef4444';      // Red
    const COLOR_GREEN = '#22c55e';    // Green
    const COLOR_ORANGE = '#f59e0b';   // Orange (using amber/orange to be visible)

    let colorHigh, colorDraw, colorLow;
    if (isShaft) {
      colorHigh = COLOR_ORANGE;
      colorDraw = COLOR_GREEN;
      colorLow = COLOR_RED;
    } else {
      colorHigh = COLOR_RED;
      colorDraw = COLOR_GREEN;
      colorLow = COLOR_ORANGE;
    }

    // Chart area with margins
    const margin = { top: 20, right: 20, bottom: 35, left: 65 };
    const cw = w - margin.left - margin.right;
    const ch = h - margin.top - margin.bottom;

    // Compute Y range
    let vals = [highTol, drawing, lowTol].filter(v => v !== 0);

    if (pts.length > 0) {
      vals = vals.concat(pts.map(p => p.reading));
    }

    if (vals.length === 0) {
      // No data — draw placeholder
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.font = '13px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No tolerance values configured', w / 2, h / 2);
      return;
    }

    const yMin = Math.min(...vals);
    const yMax = Math.max(...vals);
    const yPadding = (yMax - yMin) * 0.35 || 1;
    const yStart = yMin - yPadding;
    const yEnd = yMax + yPadding;

    // Map Y value to pixel
    const yToPixel = (val) => margin.top + ch - ((val - yStart) / (yEnd - yStart)) * ch;

    // Display ALL points extending infinitely
    const visiblePts = pts;

    // Map X value (index) to pixel using absolute pixels per step
    const xToPixel = (i) => {
      // If pts.length < 10, we span across the minimum width. 
      // Otherwise we use absolute pxPerStep.
      const intervals = Math.max(10, pts.length);
      return margin.left + (i / intervals) * cw;
    };

    const maxVal = Math.max(10, pts.length);
    const xSteps = Math.floor(maxVal / 2); // Steps for 0, 2, 4, 6, 8...

    // ── Background ──
    ctx.fillStyle = '#111827'; // Darker gray-blue to match new app theme
    ctx.fillRect(0, 0, w, h);

    // ── Shaded bands ──
    const yHigh = yToPixel(Math.max(highTol, lowTol));
    const yLow = yToPixel(Math.min(highTol, lowTol));

    // Top Band (Above High Tolerance)
    ctx.fillStyle = isShaft
      ? 'rgba(245, 158, 11, 0.25)'   // Orange for Shaft high side
      : 'rgba(239, 68, 68, 0.25)';   // Red for Hole high side
    ctx.fillRect(margin.left, margin.top, cw, yHigh - margin.top);

    // Middle Band (Between High and Low Tolerance)
    ctx.fillStyle = 'rgba(34, 197, 94, 0.25)'; // Green
    ctx.fillRect(margin.left, yHigh, cw, yLow - yHigh);

    // Bottom Band (Below Low Tolerance)
    ctx.fillStyle = isShaft
      ? 'rgba(239, 68, 68, 0.25)'    // Red for Shaft low side
      : 'rgba(245, 158, 11, 0.25)';  // Orange for Hole low side
    ctx.fillRect(margin.left, yLow, cw, (margin.top + ch) - yLow);

    // ── Grid lines ──
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let j = 0; j <= xSteps; j++) {
      const val = 2 * j; // 0, 2, 4, 6, 8, 10
      const x = xToPixel(val);
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, margin.top + ch);
      ctx.stroke();
    }

    // ── Axes ──
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    // Y axis
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + ch);
    ctx.stroke();
    // X axis
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top + ch);
    ctx.lineTo(margin.left + cw, margin.top + ch);
    ctx.stroke();

    // X axis labels
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '11px Outfit, sans-serif';
    ctx.textAlign = 'center';
    for (let j = 0; j <= xSteps; j++) {
      const val = 2 * j; // 0, 2, 4, 6, 8, 10
      const x = xToPixel(val);
      ctx.fillText(val.toString(), x, margin.top + ch + 16);
    }

    // ── Tolerance lines (dashed) ──
    function drawDashedLine(yVal, color) {
      const y = yToPixel(yVal);
      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + cw, y);
      ctx.stroke();
      ctx.restore();

      // Y-axis label
      ctx.fillStyle = color;
      ctx.font = 'bold 11px Outfit, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(yVal.toFixed(3), margin.left - 8, y + 4);
    }

    drawDashedLine(highTol, colorHigh);
    drawDashedLine(drawing, colorDraw);
    drawDashedLine(lowTol, colorLow);

    // ── Live Readings (Line plot) ──
    if (visiblePts.length > 0) {
      // Clip rendering exclusively inside the box bands so outliers don't visually bleed
      ctx.save();
      ctx.beginPath();
      ctx.rect(margin.left, margin.top, cw, ch);
      ctx.clip();

      ctx.beginPath();
      ctx.strokeStyle = '#38bdf8'; // bright blue
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';

      visiblePts.forEach((pt, i) => {
        const trueXIndex = (pt.count - 1); // Real index from 0 to N
        const x = xToPixel(trueXIndex);
        const y = yToPixel(pt.reading);
        // Only start drawing on the first visible point
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Draw circular dots over each data point
      ctx.fillStyle = '#ffffff';
      visiblePts.forEach((pt, i) => {
        const trueXIndex = (pt.count - 1); // Real index from 0 to N
        const x = xToPixel(trueXIndex);
        const y = yToPixel(pt.reading);
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
    }
  }

  // ===== Report Page Filtering Logic =====
  const reportDateFrom = document.getElementById('report-date-from');
  const reportTimeFrom = document.getElementById('report-time-from');
  const reportDateTo = document.getElementById('report-date-to');
  const reportTimeTo = document.getElementById('report-time-to');

  const reportItemSelect = document.getElementById('report-item-select');
  const reportAgSelect = document.getElementById('report-ag-select');
  const reportChSelect = document.getElementById('report-ch-select');
  const reportOperatorSelect = document.getElementById('report-operator-select');
  const reportMachineSelect = document.getElementById('report-machine-select');
  const reportCustomerSelect = document.getElementById('report-customer-select');
  const reportDrawingSelect = document.getElementById('report-drawing-select');

  // Populate Dropdowns
  function populateReportDropdowns() {

    // Items — populate datalist
    const itemDatalist = document.getElementById('report-item-datalist');
    if (itemDatalist) {
      itemDatalist.innerHTML = '';
      const allOpt = document.createElement('option');
      allOpt.value = 'All';
      itemDatalist.appendChild(allOpt);
      imItems.forEach(it => {
        const opt = document.createElement('option');
        opt.value = `${it.code} - ${it.name}`;
        itemDatalist.appendChild(opt);
      });
    }

    // Operators
    reportOperatorSelect.innerHTML = '<option value="All">All</option>';
    emOperators.forEach(op => {
      const opt = document.createElement('option');
      opt.value = op.operatorId;
      opt.textContent = `${op.operatorId} - ${op.name}`;
      reportOperatorSelect.appendChild(opt);
    });

    // Machines
    reportMachineSelect.innerHTML = '<option value="All">All</option>';
    mmMachines.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.code;
      opt.textContent = `${m.code} - ${m.name}`;
      reportMachineSelect.appendChild(opt);
    });

    // AirGauge IDs
    reportAgSelect.innerHTML = '<option value="All">All</option>';
    const ags = new Set(csConfigs.map(c => String(parseInt(c.airgaugeId, 10))));
    ags.forEach(ag => {
      const opt = document.createElement('option');
      opt.value = ag;
      opt.textContent = ag;
      reportAgSelect.appendChild(opt);
    });

    // Channels
    reportChSelect.innerHTML = '<option value="All">All</option>';
    const chs = new Set(csConfigs.map(c => String(parseInt(c.channel.replace('CH', ''), 10))));
    chs.forEach(ch => {
      const opt = document.createElement('option');
      opt.value = `CH${ch}`;
      opt.textContent = `CH${ch}`;
      reportChSelect.appendChild(opt);
    });

    // Customers
    reportCustomerSelect.innerHTML = '<option value="All">All</option>';
    cmCustomers.forEach(cust => {
      const opt = document.createElement('option');
      const label = cust.name + (cust.code ? ` (${cust.code})` : '');
      opt.value = label;
      opt.textContent = label;
      reportCustomerSelect.appendChild(opt);
    });

    // Drawings
    reportDrawingSelect.innerHTML = '<option value="All">All</option>';
  }

  // Initial population
  populateReportDropdowns();

  // Initialize Flatpickr for Date and Time inputs
  const todayStr = new Date().toISOString().split('T')[0];

  if (reportDateFrom) {
    flatpickr(reportDateFrom, {
      defaultDate: todayStr,
      dateFormat: "Y-m-d",
      altInput: true,
      altFormat: "F j, Y",
      onChange: filterReportData
    });
  }

  if (reportDateTo) {
    flatpickr(reportDateTo, {
      defaultDate: todayStr,
      dateFormat: "Y-m-d",
      altInput: true,
      altFormat: "F j, Y",
      onChange: filterReportData
    });
  }

  if (reportTimeFrom) {
    flatpickr(reportTimeFrom, {
      enableTime: true,
      noCalendar: true,
      dateFormat: "H:i:S",
      altInput: true,
      altFormat: "h:i:S K",
      enableSeconds: true,
      time_24hr: false,
      defaultDate: "00:00:00",
      onChange: filterReportData
    });
  }

  if (reportTimeTo) {
    flatpickr(reportTimeTo, {
      enableTime: true,
      noCalendar: true,
      dateFormat: "H:i:S",
      altInput: true,
      altFormat: "h:i:S K",
      enableSeconds: true,
      time_24hr: false,
      defaultDate: "23:59:59",
      onChange: filterReportData
    });
  }

  // Filter Algorithm via SQLite backend
  async function filterReportData() {
    if (!reportDataBody) return;
    if (reportDataTable) reportDataTable.classList.add('hidden');
    if (reportEmptyMsg) reportEmptyMsg.classList.remove('hidden');

    // Parse Dates to Unix Timestamps
    let fromTs = 0;
    // Default end timestamp to way in the future (2100) if blank
    let toTs = 4102444800;

    if (reportDateFrom.value) {
      const d = new Date(reportDateFrom.value + 'T' + (reportTimeFrom.value || '00:00:00'));
      if (!isNaN(d)) fromTs = Math.floor(d.getTime() / 1000);

      // If ONLY Date From is selected, and Date To is empty, treat as single day
      if (!reportDateTo.value) {
        const dEnd = new Date(reportDateFrom.value + 'T23:59:59');
        if (!isNaN(dEnd)) toTs = Math.floor(dEnd.getTime() / 1000);
      }
    }

    if (reportDateTo.value) {
      const d = new Date(reportDateTo.value + 'T' + (reportTimeTo.value || '23:59:59'));
      if (!isNaN(d)) toTs = Math.floor(d.getTime() / 1000);
    }

    const filters = {
      ag: reportAgSelect.value,
      ch: reportChSelect.value,
      item: (reportItemSelect.value && reportItemSelect.value !== 'All') ? reportItemSelect.value.split(' - ')[0].trim() : 'All',
      op: reportOperatorSelect.value,
      mach: reportMachineSelect.value,
      cust: reportCustomerSelect.value,
      draw: reportDrawingSelect.value
    };

    try {
      // Ask Rust for the permanent SQLite rows matching this timestamp range
      const packets = await invoke('fetch_readings', { startTs: fromTs, endTs: toTs });

      // Dynamically populate dropdowns based on exactly what exists in the fetched packets
      const uniqueAgs = new Set();
      const uniqueChs = new Set();
      const uniqueMachs = new Set();
      const uniqueDraws = new Set();

      packets.forEach(p => {
        if (p.airgauge_id) uniqueAgs.add(String(parseInt(p.airgauge_id, 10)));
        if (p.channel) {
          const chNum = parseInt(p.channel.replace('CH', ''), 10);
          if (!isNaN(chNum)) uniqueChs.add(`CH${chNum}`);
        }
        if (p.machine_id) uniqueMachs.add(p.machine_id);
        if (p.drawing_value) uniqueDraws.add(p.drawing_value);
      });

      // AirGauge IDs (preserve current selection if valid)
      reportAgSelect.innerHTML = '<option value="All">All</option>';
      Array.from(uniqueAgs).sort((a, b) => parseInt(a) - parseInt(b)).forEach(ag => {
        const opt = document.createElement('option');
        opt.value = ag;
        opt.textContent = ag;
        reportAgSelect.appendChild(opt);
      });
      if (uniqueAgs.has(filters.ag)) reportAgSelect.value = filters.ag;

      // Channels
      reportChSelect.innerHTML = '<option value="All">All</option>';
      Array.from(uniqueChs).sort((a, b) => parseInt(a.replace('CH', '')) - parseInt(b.replace('CH', ''))).forEach(ch => {
        const opt = document.createElement('option');
        opt.value = ch;
        opt.textContent = ch;
        reportChSelect.appendChild(opt);
      });
      if (uniqueChs.has(filters.ch)) reportChSelect.value = filters.ch;

      // Machines
      reportMachineSelect.innerHTML = '<option value="All">All</option>';
      Array.from(uniqueMachs).sort().forEach(mach => {
        const machData = mmMachines.find(m => m.code === mach);
        const opt = document.createElement('option');
        opt.value = mach;
        opt.textContent = machData ? `${mach} - ${machData.name}` : mach;
        reportMachineSelect.appendChild(opt);
      });
      if (uniqueMachs.has(filters.mach)) reportMachineSelect.value = filters.mach;

      // Drawings
      reportDrawingSelect.innerHTML = '<option value="All">All</option>';
      Array.from(uniqueDraws).sort((a, b) => parseFloat(a) - parseFloat(b)).forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        reportDrawingSelect.appendChild(opt);
      });
      if (uniqueDraws.has(filters.draw)) reportDrawingSelect.value = filters.draw;

      reportDataBody.innerHTML = '';
      let visibleCount = 0;

      // Reverse array to display LIFO (newest first) in the UI
      packets.reverse().forEach(data => {
        // Do Dictionary Mappings
        const opData = emOperators.find(o => o.operatorId === data.employee_id);
        const userIdDisplay = opData ? escapeHtml(`${data.employee_id} - ${opData.name}`) : escapeHtml(data.employee_id || '—');

        const machData = mmMachines.find(m => m.code === data.machine_id);
        const machineDisplay = machData ? escapeHtml(`${data.machine_id} - ${machData.name}`) : escapeHtml(data.machine_id || '—');

        let drawObj = null;
        if (data.airgauge_id && data.channel) {
          drawObj = csConfigs.find(c =>
            String(parseInt(c.airgaugeId, 10)) === String(parseInt(data.airgauge_id, 10)) &&
            `CH${parseInt(c.channel.replace('CH', ''), 10)}` === `CH${parseInt(data.channel.replace('CH', ''), 10)}`
          );
        }

        const itemData = drawObj ? imItems.find(i => i.code === drawObj.itemCode) : null;
        let itemDisplay = '—';
        if (drawObj && itemData) itemDisplay = escapeHtml(`${itemData.code} - ${itemData.name}`);

        let customerDisplay = '—';
        if (drawObj && drawObj.customer) customerDisplay = escapeHtml(drawObj.customer);

        // Dropdown Filtering Checks
        let show = true;
        if (show && filters.ag !== 'All' && String(parseInt(data.airgauge_id, 10)) !== filters.ag) show = false;
        if (show && filters.ch !== 'All' && `CH${parseInt(data.channel.replace('CH', ''), 10)}` !== filters.ch) show = false;
        if (show && filters.item !== 'All' && (!drawObj || drawObj.itemCode !== filters.item)) show = false;
        if (show && filters.op !== 'All' && data.employee_id !== filters.op) show = false;
        if (show && filters.mach !== 'All' && data.machine_id !== filters.mach) show = false;
        if (show && filters.cust !== 'All' && (!drawObj || drawObj.customer !== filters.cust)) show = false;
        if (show && filters.draw !== 'All' && data.drawing_value !== filters.draw) show = false;

        if (show) {
          visibleCount++;

          let statusBadge = '<span class="status-badge">UNKNOWN</span>';
          if (data.status === 'ACCEPTED') {
            statusBadge = '<span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;background:rgba(34,197,94,0.12);color:#16a34a;">ACCEPTED</span>';
          } else if (data.status === 'REJECTED') {
            statusBadge = '<span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;background:rgba(239,68,68,0.12);color:#dc2626;">REJECTED</span>';
          } else if (data.status === 'REWORK') {
            statusBadge = '<span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;background:rgba(245,158,11,0.12);color:#d97706;">REWORK</span>';
          }

          const setupDrawVal = drawObj ? parseFloat(drawObj.drawingValue) : null;
          const readDrawVal = parseFloat(data.drawing_value);
          let drawingMismatchTitle = '';
          let drawingCellStyle = '';
          if (setupDrawVal !== null && !isNaN(readDrawVal) && Math.abs(setupDrawVal - readDrawVal) > 0.0001) {
            drawingCellStyle = 'background:rgba(239,68,68,0.15);color:#dc2626;font-weight:700;';
            drawingMismatchTitle = ` title="MISMATCH: expected ${setupDrawVal}"`;
          }

          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${visibleCount}</td>
            <td>${escapeHtml(data.date || '—')}</td>
            <td>${escapeHtml(data.time || '—')}</td>
            <td><strong>${escapeHtml(data.reading || '—')}</strong></td>
            <td>${escapeHtml(data.offset || '—')}</td>
            <td>${statusBadge}</td>
            <td>${escapeHtml(data.airgauge_id || '—')}</td>
            <td>${escapeHtml(data.channel || '—')}</td>
            <td style="${drawingCellStyle}"${drawingMismatchTitle}>${escapeHtml(data.drawing_value || '—')}</td>
            <td>${userIdDisplay}</td>
            <td>${escapeHtml(data.comp_id || '—')}</td>
            <td>${itemDisplay}</td>
            <td>${machineDisplay}</td>
            <td>${customerDisplay}</td>
          `;
          reportDataBody.appendChild(tr);
        }
      });

      if (reportCountBadge) {
        reportCountBadge.textContent = `${visibleCount} reading${visibleCount !== 1 ? 's' : ''}`;
      }

      if (visibleCount > 0) {
        if (reportDataTable) reportDataTable.classList.remove('hidden');
        if (reportEmptyMsg) reportEmptyMsg.classList.add('hidden');
      } else {
        if (reportDataTable) reportDataTable.classList.add('hidden');
        if (reportEmptyMsg) reportEmptyMsg.classList.remove('hidden');
      }

    } catch (err) {
      console.error("Failed to fetch SQLite readings:", err);
    }
  }

  // Attach event listeners
  const filterInputs = [
    reportDateFrom, reportTimeFrom, reportDateTo, reportTimeTo,
    reportItemSelect, reportAgSelect, reportChSelect, reportOperatorSelect,
    reportMachineSelect, reportCustomerSelect, reportDrawingSelect
  ];
  filterInputs.forEach(inp => {
    if (inp) inp.addEventListener('change', filterReportData);
  });
  // Also filter live as user types in the Item datalist input
  if (reportItemSelect) reportItemSelect.addEventListener('input', filterReportData);

  // Add event listener for Analyze Page Print button
  const analyzePrintBtn = document.getElementById('analyze-print-btn');
  if (analyzePrintBtn) {
    let imgBackups = [];

    const performCanvasSwap = () => {
      if (imgBackups.length > 0) return; // already swapped
      const analyzeSection = document.getElementById('page-analyze');
      if (!analyzeSection || !analyzeSection.classList.contains('active')) return;

      const canvases = analyzeSection.querySelectorAll('canvas');
      canvases.forEach(canvas => {
        try {
          const imgUrl = canvas.toDataURL('image/png', 1.0);
          const img = document.createElement('img');
          img.src = imgUrl;
          img.className = 'print-chart-img';
          img.style.width = '100%';
          img.style.height = 'auto'; // retain aspect ratio
          canvas.style.display = 'none';
          canvas.parentNode.insertBefore(img, canvas);
          imgBackups.push({ canvas, img });
        } catch (e) {
          console.warn('Could not convert canvas to image:', e);
        }
      });
    };

    const restoreCanvas = () => {
      imgBackups.forEach(({ canvas, img }) => {
        canvas.style.display = '';
        if (img.parentNode) img.parentNode.removeChild(img);
      });
      imgBackups = [];
    };

    window.addEventListener('beforeprint', performCanvasSwap);
    window.addEventListener('afterprint', restoreCanvas);

    analyzePrintBtn.addEventListener('click', () => {
      // Manually trigger swap in case webview 'beforeprint' fails
      performCanvasSwap();
      setTimeout(() => {
        window.print();
        // We rely on 'afterprint' to restore. In case 'afterprint' doesn't fire natively in Tauri, 
        // we add a generous timeout fallback to restore interactivity after a minute.
        setTimeout(restoreCanvas, 60000);
      }, 300); // 300ms delay gives DOM time to paint images
    });
  }


  // --- ANALYZE PAGE LOGIC ---
  const pageAnalyze = document.getElementById('page-analyze');
  const analyzeBackBtn = document.getElementById('analyze-back-btn');
  const analyzeBtn = document.querySelector('.im-btn-analyze');

  // SPC Constants (from spc constants.xlsx)
  const SPC_CONSTANTS = {
    2: { a2: 1.880, d2: 1.128, d3: 0, d4: 3.268 },
    3: { a2: 1.023, d2: 1.693, d3: 0, d4: 2.574 },
    4: { a2: 0.729, d2: 2.059, d3: 0, d4: 2.282 },
    5: { a2: 0.577, d2: 2.326, d3: 0, d4: 2.114 },
    6: { a2: 0.483, d2: 2.534, d3: 0, d4: 2.004 },
    7: { a2: 0.419, d2: 2.704, d3: 0.076, d4: 1.924 },
    8: { a2: 0.373, d2: 2.847, d3: 0.136, d4: 1.864 },
    9: { a2: 0.337, d2: 2.970, d3: 0.184, d4: 1.816 },
    10: { a2: 0.308, d2: 3.078, d3: 0.223, d4: 1.777 },
    15: { a2: 0.223, d2: 3.472, d3: 0.347, d4: 1.653 },
    20: { a2: 0.180, d2: 3.735, d3: 0.415, d4: 1.585 },
    25: { a2: 0.153, d2: 3.931, d3: 0.459, d4: 1.541 }
  };

  let xbarChartInstance = null;
  let rChartInstance = null;
  let histChartInstance = null;

  async function openAnalyzePage() {
    // 1. Switch View
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    if (pageAnalyze) pageAnalyze.classList.add('active');

    // Update subtitle with current filters
    const subtitle = document.getElementById('analyze-subtitle');
    if (subtitle) {
      subtitle.textContent = `ANALYSIS FOR ${reportItemSelect.value} - AG: ${reportAgSelect.value} - CH: ${reportChSelect.value}`;
    }

    // 2. Fetch Fresh Data (Same as FilterReportData logic)
    let fromTs = 0;
    let toTs = 4102444800;
    if (reportDateFrom.value) {
      const d = new Date(reportDateFrom.value + 'T' + (reportTimeFrom.value || '00:00:00'));
      if (!isNaN(d)) fromTs = Math.floor(d.getTime() / 1000);
      if (!reportDateTo.value) {
        const dEnd = new Date(reportDateFrom.value + 'T23:59:59');
        if (!isNaN(dEnd)) toTs = Math.floor(dEnd.getTime() / 1000);
      }
    }
    if (reportDateTo.value) {
      const d = new Date(reportDateTo.value + 'T' + (reportTimeTo.value || '23:59:59'));
      if (!isNaN(d)) toTs = Math.floor(d.getTime() / 1000);
    }

    try {
      const allPackets = await invoke('fetch_readings', { startTs: fromTs, endTs: toTs });

      // Filter based on Report page selections
      const filters = {
        ag: reportAgSelect.value,
        ch: reportChSelect.value,
        item: (reportItemSelect.value && reportItemSelect.value !== 'All') ? reportItemSelect.value.split(' - ')[0].trim() : 'All'
      };

      const filteredPackets = allPackets.filter(p => {
        if (!p.airgauge_id || !p.channel) return false;
        const packetAg = String(parseInt(p.airgauge_id, 10));
        const packetCh = `CH${parseInt(String(p.channel).replace('CH', ''), 10)}`;
        if (filters.ag !== 'All' && packetAg !== filters.ag) return false;
        if (filters.ch !== 'All' && packetCh !== filters.ch) return false;
        let drawObj = csConfigs.find(c =>
          String(parseInt(c.airgaugeId, 10)) === packetAg &&
          `CH${parseInt(String(c.channel).replace('CH', ''), 10)}` === packetCh
        );
        if (filters.item !== 'All' && (!drawObj || drawObj.itemCode !== filters.item)) return false;
        return true;
      });

      // Extract numeric readings
      const subgroupSize = 10;
      const readings = filteredPackets.map(p => parseFloat(p.reading)).filter(v => !isNaN(v));

      if (readings.length === 0) {
        alert("No valid numerical readings found in current view.");
        return;
      }

      const numCompleteSubgroups = Math.floor(readings.length / subgroupSize);
      if (numCompleteSubgroups === 0) {
        alert("Not enough data to perform SPC analysis (need at least 10 readings).");
        return;
      }

      const usableReadings = readings.slice(0, numCompleteSubgroups * subgroupSize);

      // Build rows (subgroups of 10)
      const rows = [];
      for (let i = 0; i < usableReadings.length; i += subgroupSize) {
        rows.push(usableReadings.slice(i, i + subgroupSize));
      }

      // --- TRANSPOSE TO COLUMNS (like hh.py) ---
      const cols = [];
      for (let i = 0; i < subgroupSize; i++) {
        const columnData = [];
        for (let j = 0; j < rows.length; j++) {
          columnData.push(rows[j][i]);
        }
        cols.push(columnData);
      }

      // Columnar stats
      const colMeans = cols.map(c => c.reduce((a, b) => a + b, 0) / c.length);
      const colRanges = cols.map(c => Math.max(...c) - Math.min(...c));
      const colMaxs = cols.map(c => Math.max(...c));
      const colMins = cols.map(c => Math.min(...c));

      const xBarBar = colMeans.reduce((a, b) => a + b, 0) / colMeans.length;
      const rBar = colRanges.reduce((a, b) => a + b, 0) / colRanges.length;

      const Xmax = Math.max(...usableReadings);
      const Xmin = Math.min(...usableReadings);

      const constants = SPC_CONSTANTS[subgroupSize] || SPC_CONSTANTS[10];
      const sigma = rBar / constants.d2;

      // Control Limits
      const uclX = xBarBar + (constants.a2 * rBar);
      const lclX = xBarBar - (constants.a2 * rBar);
      const uclR = constants.d4 * rBar;
      const lclR = constants.d3 * rBar;

      // Overall Sample Std Dev (for Pp/Ppk) — uses n-1  
      const meanOverall = usableReadings.reduce((a, b) => a + b, 0) / usableReadings.length;
      const squaredDiffs = usableReadings.map(v => Math.pow(v - meanOverall, 2));
      const sampleStdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / (usableReadings.length - 1));

      // Get Tolerance from Configuration
      let LTL = null, UTL = null;
      if (filteredPackets.length > 0) {
        const firstP = filteredPackets[0];
        const config = csConfigs.find(c =>
          String(parseInt(c.airgaugeId, 10)) === String(parseInt(firstP.airgauge_id, 10)) &&
          `CH${parseInt(c.channel.replace('CH', ''), 10)}` === `CH${parseInt(firstP.channel.replace('CH', ''), 10)}`
        );
        if (config) {
          LTL = parseFloat(config.lowTol);
          UTL = parseFloat(config.highTol);
        }
      }

      const tolValid = (LTL !== null && UTL !== null && !isNaN(LTL) && !isNaN(UTL) && UTL > LTL);
      const fmt = v => (v === null || v === undefined || v === '--') ? '–' : (typeof v === 'number' ? v.toFixed(4) : v);

      // Capability (Cp, Cpk, CPKl, CPKu)
      let cp = null, cpk = null, cpkL = null, cpkU = null;
      if (tolValid && sigma > 0) {
        cp = (UTL - LTL) / (6 * sigma);
        cpkL = (xBarBar - LTL) / (3 * sigma);
        cpkU = (UTL - xBarBar) / (3 * sigma);
        cpk = Math.min(cpkL, cpkU);
      }

      // Performance (Pp, Ppk, PPKl, PPKu)
      let pp = null, ppk = null, ppkL = null, ppkU = null;
      if (tolValid && sampleStdDev > 0) {
        pp = (UTL - LTL) / (6 * sampleStdDev);
        ppkL = (xBarBar - LTL) / (3 * sampleStdDev);
        ppkU = (UTL - xBarBar) / (3 * sampleStdDev);
        ppk = Math.min(ppkL, ppkU);
      }

      // --- UPDATE DOM: Control Limits & KPIs ---
      document.getElementById('chart-ucl-x').textContent = fmt(uclX);
      document.getElementById('chart-lcl-x').textContent = fmt(lclX);
      document.getElementById('chart-ucl-r').textContent = fmt(uclR);
      document.getElementById('chart-lcl-r').textContent = fmt(lclR);

      document.getElementById('kpi-sigma').textContent = fmt(sigma);
      document.getElementById('kpi-cpk-l').textContent = fmt(cpkL);
      document.getElementById('kpi-cpk-u').textContent = fmt(cpkU);
      document.getElementById('kpi-cpk').textContent = fmt(cpk);
      document.getElementById('kpi-cp').textContent = fmt(cp);

      document.getElementById('kpi-stddev').textContent = fmt(sampleStdDev);
      document.getElementById('kpi-ppk-l').textContent = fmt(ppkL);
      document.getElementById('kpi-ppk-u').textContent = fmt(ppkU);
      document.getElementById('kpi-ppk').textContent = fmt(ppk);
      document.getElementById('kpi-pp').textContent = fmt(pp);

      document.getElementById('analyze-ltl').textContent = tolValid ? fmt(LTL) : '–';
      document.getElementById('analyze-utl').textContent = tolValid ? fmt(UTL) : '–';

      // --- RENDER SPC DATA MATRIX ---
      const matrixHeader = document.getElementById('matrix-header-row');
      const matrixBody = document.getElementById('matrix-body');

      matrixHeader.innerHTML = '<th>S.No</th>';
      for (let i = 1; i <= subgroupSize; i++) {
        matrixHeader.innerHTML += `<th>C${i}</th>`;
      }

      matrixBody.innerHTML = '';
      rows.forEach((sg, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="sno-cell">${idx + 1}</td>` + sg.map(v => `<td>${v.toFixed(4)}</td>`).join('');
        matrixBody.appendChild(tr);
      });

      // --- RENDER HISTOGRAM CALCULATIONS TABLE ---
      const histCalcBody = document.getElementById('hist-calc-body');
      histCalcBody.innerHTML = '';

      const histRows = [
        { label: 'Xlarge', data: colMaxs, sumLabel: 'X Max=', sumVal: fmt(Xmax) },
        { label: 'Xsmall', data: colMins, sumLabel: 'X Min=', sumVal: fmt(Xmin) },
        { label: 'Range', data: colRanges, sumLabel: 'R-Bar=', sumVal: fmt(rBar) },
        { label: 'Avg', data: colMeans, sumLabel: 'X-Bar=', sumVal: fmt(xBarBar) },
      ];

      histRows.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="hist-label-cell">${row.label}</td>`
          + row.data.map(v => `<td class="hist-data-cell">${v.toFixed(4)}</td>`).join('')
          + `<td class="hist-label-cell">${row.sumLabel}</td>`
          + `<td class="hist-summary-cell">${row.sumVal}</td>`;
        histCalcBody.appendChild(tr);
      });

      // --- RENDER HISTOGRAM SMALL TABLE ---
      const histSmallBody = document.getElementById('hist-small-body');
      histSmallBody.innerHTML = '';

      const processWidth = Xmax - Xmin;
      const totalRange = processWidth;
      const N = usableReadings.length;
      const k = N > 1 ? Math.round(1 + 3.322 * Math.log10(N)) : 1;
      const interval = k > 0 ? totalRange / k : null;

      let designCenter = null, specWidth = null, shiftXbar = null;
      if (tolValid) {
        designCenter = (LTL + UTL) / 2;
        specWidth = UTL - LTL;
        shiftXbar = xBarBar - designCenter;
      }

      const smallRows = [
        ['Process width (P)', fmt(processWidth), 'Specification Width (S)', fmt(specWidth), 'Total Range (R)', fmt(totalRange)],
        ['Design center (D)', fmt(designCenter), 'Interval', fmt(interval), 'Selecting No. of Classes', String(k)],
        ['-', '–', 'No. of Readings', String(N), "Shift of X̄ from 'D'", fmt(shiftXbar)],
      ];

      smallRows.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = row.map((cell, ci) => {
          const cls = ci % 2 === 0 ? 'hist-label-cell' : 'hist-data-cell';
          return `<td class="${cls}">${cell}</td>`;
        }).join('');
        histSmallBody.appendChild(tr);
      });

      // --- COMPUTE FREQUENCY DISTRIBUTION ---
      const freqBody = document.getElementById('freq-body');
      freqBody.innerHTML = '';
      const freqRows = [];

      if (interval && interval > 0) {
        const sorted = [...usableReadings].sort((a, b) => a - b);
        let lower = Xmin - interval;
        let prevCum = 0;

        while (true) {
          const upper = lower + interval;
          // CUM FREQ: count of values <= upper
          let cum = 0;
          for (let i = 0; i < sorted.length; i++) {
            if (sorted[i] <= upper) cum++;
            else break;
          }
          const freq = cum - prevCum;
          freqRows.push({ from: lower, to: upper, cumFreq: cum, freq: freq });

          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${lower.toFixed(4)}</td><td>${upper.toFixed(4)}</td><td>${cum}</td><td>${freq}</td>`;
          freqBody.appendChild(tr);

          if (upper >= Xmax) break;
          prevCum = cum;
          lower = upper;
        }
      }

      // --- RENDER CHARTS ---
      renderSPCCharts(colMeans, uclX, lclX, xBarBar, colRanges, uclR, lclR, rBar, freqRows);

    } catch (err) {
      console.error("OpenAnalyzePage failed:", err);
      alert(`Error loading analysis data: ${err.message || err}`);
    }
  }

  function renderSPCCharts(xMeans, uclX, lclX, xBarBar, rRanges, uclR, lclR, rBar, freqRows) {
    const labels = xMeans.map((_, i) => `C${i + 1}`);

    // DESTROY EXISTING
    if (xbarChartInstance) xbarChartInstance.destroy();
    if (rChartInstance) rChartInstance.destroy();
    if (histChartInstance) histChartInstance.destroy();

    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'top', labels: { color: '#94a3b8', font: { size: 11 } } }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
      }
    };

    // X-BAR CHART
    const ctxX = document.getElementById('xbar-chart').getContext('2d');
    xbarChartInstance = new Chart(ctxX, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          { label: 'AVG', data: xMeans, borderColor: '#3b82f6', backgroundColor: '#3b82f6', pointRadius: 4, tension: 0.1, borderWidth: 2 },
          { label: 'X-BAR', data: Array(labels.length).fill(xBarBar), borderColor: '#22c55e', borderWidth: 1, borderDash: [4, 4], pointRadius: 0 },
          { label: 'UCL', data: Array(labels.length).fill(uclX), borderColor: '#ef4444', borderWidth: 2, borderDash: [6, 6], pointRadius: 0 },
          { label: 'LCL', data: Array(labels.length).fill(lclX), borderColor: '#f97316', borderWidth: 2, borderDash: [6, 6], pointRadius: 0 },
        ]
      },
      options: commonOptions
    });

    // R CHART
    const ctxR = document.getElementById('r-chart').getContext('2d');
    rChartInstance = new Chart(ctxR, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          { label: 'RANGE', data: rRanges, borderColor: '#f59e0b', backgroundColor: '#f59e0b', pointRadius: 4, tension: 0.1, borderWidth: 2 },
          { label: 'R-BAR', data: Array(labels.length).fill(rBar), borderColor: '#f59e0b', borderWidth: 1, borderDash: [4, 4], pointRadius: 0 },
          { label: 'UCL', data: Array(labels.length).fill(uclR), borderColor: '#ef4444', borderWidth: 2, borderDash: [6, 6], pointRadius: 0 },
          { label: 'LCL', data: Array(labels.length).fill(lclR), borderColor: '#f97316', borderWidth: 1, borderDash: [6, 6], pointRadius: 0 },
        ]
      },
      options: commonOptions
    });

    // HISTOGRAM CHART
    if (freqRows && freqRows.length > 0) {
      const histLabels = freqRows.map(r => r.to.toFixed(2));
      const histFreqs = freqRows.map(r => r.freq);
      const ctxH = document.getElementById('hist-chart').getContext('2d');
      histChartInstance = new Chart(ctxH, {
        type: 'bar',
        data: {
          labels: histLabels,
          datasets: [{
            label: 'Frequency',
            data: histFreqs,
            backgroundColor: 'rgba(66, 165, 245, 0.7)',
            borderColor: '#1e88e5',
            borderWidth: 1
          }]
        },
        options: {
          ...commonOptions,
          plugins: { ...commonOptions.plugins, legend: { display: false } },
          scales: {
            ...commonOptions.scales,
            x: { ...commonOptions.scales.x, title: { display: true, text: 'Interval', color: '#94a3b8' } },
            y: { ...commonOptions.scales.y, title: { display: true, text: 'Frequency', color: '#94a3b8' }, beginAtZero: true }
          }
        }
      });
    }
  }


  function goBackToReport() {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-report').classList.add('active');
  }

  // EVENT LISTENERS
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', openAnalyzePage);
  }

  if (analyzeBackBtn) {
    analyzeBackBtn.addEventListener('click', goBackToReport);
  }

  // ===== Print Button =====
  const reportPrintBtn = document.getElementById('report-print-btn');
  if (reportPrintBtn) {
    reportPrintBtn.addEventListener('click', () => {
      // Only print if there is data in the table
      if (!reportDataBody || reportDataBody.children.length === 0) {
        alert('No data to print. Please select a date range first.');
        return;
      }

      // Build a date range string for the header
      let dateRangeText = '';
      if (reportDateFrom && reportDateFrom.value) {
        dateRangeText += 'From: ' + reportDateFrom.value;
        if (reportTimeFrom && reportTimeFrom.value) dateRangeText += ' ' + reportTimeFrom.value;
      }
      if (reportDateTo && reportDateTo.value) {
        dateRangeText += (dateRangeText ? '  |  ' : '') + 'To: ' + reportDateTo.value;
        if (reportTimeTo && reportTimeTo.value) dateRangeText += ' ' + reportTimeTo.value;
      }
      if (!dateRangeText) dateRangeText = 'All dates';

      const readingCount = reportCountBadge ? reportCountBadge.textContent : '';

      // Inject a temporary print header
      const printHeader = document.createElement('div');
      printHeader.className = 'print-header';
      printHeader.innerHTML = `
        <h2>Cherry Precision Products — Report</h2>
        <p>${dateRangeText}  •  ${readingCount}</p>
      `;
      const tableWrap = reportDataTable ? reportDataTable.closest('.im-table-wrap') : null;
      if (tableWrap) {
        tableWrap.insertBefore(printHeader, tableWrap.firstChild);
      }

      window.print();

      // Remove the temporary header after printing
      if (printHeader.parentNode) {
        printHeader.parentNode.removeChild(printHeader);
      }
    });
  }

  // Placeholder listener removed as Analyze page is now implemented.

});
