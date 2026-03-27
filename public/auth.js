const AUTH_API_BASE = '/api/auth';
const TOKEN_KEY = 'expense_tracker_token';
const USER_KEY = 'expense_tracker_user';

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authError = document.getElementById('authError');

if (localStorage.getItem(TOKEN_KEY) && (window.location.pathname.includes('login') || window.location.pathname.includes('register'))) {
  window.location.href = '/index.html';
}

if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setAuthError('');

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    if (!email || !password) {
      setAuthError('Email and password are required.');
      return;
    }

    const loginBtn = document.getElementById('loginBtn');
    setLoading(loginBtn, true, 'Logging in...');

    try {
      const res = await fetch(`${AUTH_API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed.');
      }

      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      if (rememberMe) {
        localStorage.setItem('expense_tracker_remember', 'true');
      } else {
        localStorage.removeItem('expense_tracker_remember');
      }
      window.location.href = '/index.html';
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setLoading(loginBtn, false, 'Login');
    }
  });
}

if (registerForm) {
  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setAuthError('');

    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (username.length < 3) {
      setAuthError('Username must be at least 3 characters.');
      return;
    }
    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }

    const registerBtn = document.getElementById('registerBtn');
    setLoading(registerBtn, true, 'Creating account...');

    try {
      const res = await fetch(`${AUTH_API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      window.location.href = '/index.html';
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setLoading(registerBtn, false, 'Register');
    }
  });
}

function setAuthError(message) {
  if (authError) {
    authError.textContent = message;
  }
}

function setLoading(button, isLoading, loadingText) {
  if (!button) return;
  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : button.id === 'registerBtn' ? 'Register' : 'Login';
}
