document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('loginForm');
  const verificationForm = document.getElementById('verificationForm');
  const backToLogin = document.getElementById('backToLogin');
  const errorMessage = document.getElementById('errorMessage');
  const verifyErrorMessage = document.getElementById('verifyErrorMessage');
  let pendingEmail = null;

  // Helpers
  function show(el) { el.style.display = 'block'; }
  function hide(el) { el.style.display = 'none'; }
  function showError(el, message) {
    el.textContent = message;
    el.style.display = 'block';
    el.classList.add('fade-in');
    setTimeout(() => { el.style.display = 'none'; }, 3000);
  }

  backToLogin?.addEventListener('click', (e) => {
    e.preventDefault();
    show(loginForm); hide(verificationForm);
    pendingEmail = null;
  });

  // Login submit
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginBtn = loginForm.querySelector('.login-btn');
    const originalBtnText = loginBtn.innerText;
    loginBtn.innerText = 'Logging in...';
    loginBtn.disabled = true;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (data.success && data.requiresVerification) {
        // Move to verification step
        pendingEmail = email;
        hide(loginForm); show(verificationForm);
      } else if (data.success && data.token) {
        // Direct login (if server returns token)
        localStorage.setItem('authToken', data.token);
        window.location.href = 'dashboard.html';
      } else {
        showError(errorMessage, data.error || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      showError(errorMessage, 'Login failed');
    } finally {
      loginBtn.innerText = originalBtnText;
      loginBtn.disabled = false;
    }
  });

  // Registration removed

  // Verify submit
  verificationForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = document.getElementById('verificationCode').value;
    if (!pendingEmail) return showError(verifyErrorMessage, 'Missing email context');
    const verifyBtn = verificationForm.querySelector('.login-btn');
    const originalBtnText = verifyBtn.innerText;
    verifyBtn.innerText = 'Verifying...';
    verifyBtn.disabled = true;

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail, code })
      });
      const data = await res.json();
      if (data.success && data.token) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('username', pendingEmail);
        window.location.href = 'dashboard.html';
      } else {
        showError(verifyErrorMessage, data.error || 'Verification failed');
      }
    } catch (err) {
      console.error('Verify error:', err);
      showError(verifyErrorMessage, 'Verification failed');
    } finally {
      verifyBtn.innerText = originalBtnText;
      verifyBtn.disabled = false;
    }
  });
});
