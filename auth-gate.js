(function () {
  var config = window.AUTH_CONFIG || {};
  var requiredUsername = config.username || 'user';
  var requiredPassword = config.password || 'password';
  var sessionKey = 'site-authenticated';

  if (sessionStorage.getItem(sessionKey) === 'true') {
    return;
  }

  var style = document.createElement('style');
  style.textContent = [
    '.auth-overlay{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(6,18,32,0.92);z-index:10000;padding:20px;}',
    '.auth-card{width:min(100%,380px);background:#ffffff;border-radius:14px;padding:24px;box-shadow:0 16px 40px rgba(0,0,0,.35);font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;}',
    '.auth-card h2{margin:0 0 12px;font-size:1.4rem;color:#0f172a;}',
    '.auth-card p{margin:0 0 16px;color:#334155;font-size:.95rem;}',
    '.auth-card label{display:block;margin:0 0 8px;color:#0f172a;font-weight:600;font-size:.9rem;}',
    '.auth-card input{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;margin-bottom:12px;font-size:1rem;}',
    '.auth-card button{width:100%;border:0;border-radius:8px;padding:11px 12px;background:#0ea5e9;color:#fff;font-weight:700;cursor:pointer;font-size:1rem;}',
    '.auth-card button:hover{background:#0284c7;}',
    '.auth-error{min-height:20px;color:#dc2626;font-size:.88rem;margin-bottom:8px;}'
  ].join('');
  document.head.appendChild(style);

  var overlay = document.createElement('div');
  overlay.className = 'auth-overlay';
  overlay.innerHTML = [
    '<form class="auth-card" autocomplete="off">',
    '  <h2>Sign in required</h2>',
    '  <p>Enter your username and password to access this site.</p>',
    '  <div class="auth-error" aria-live="polite"></div>',
    '  <label for="auth-user">Username</label>',
    '  <input id="auth-user" name="username" type="text" required />',
    '  <label for="auth-pass">Password</label>',
    '  <input id="auth-pass" name="password" type="password" required />',
    '  <button type="submit">Login</button>',
    '</form>'
  ].join('');

  document.body.appendChild(overlay);

  var form = overlay.querySelector('form');
  var userInput = overlay.querySelector('#auth-user');
  var passwordInput = overlay.querySelector('#auth-pass');
  var errorEl = overlay.querySelector('.auth-error');

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var username = userInput.value;
    var password = passwordInput.value;

    if (username === requiredUsername && password === requiredPassword) {
      sessionStorage.setItem(sessionKey, 'true');
      overlay.remove();
      return;
    }

    errorEl.textContent = 'Invalid username or password.';
    passwordInput.value = '';
    passwordInput.focus();
  });

  userInput.focus();
})();
