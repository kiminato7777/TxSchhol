const usernameRef = document.getElementById("username");
const passwordRef = document.getElementById("password");
const loginForm = document.getElementById('loginForm');
const togglePassword = document.getElementById('togglePassword');
let failedAttempts = 0;

// Toggle Password Visibility
if (togglePassword && passwordRef) {
  togglePassword.addEventListener('click', function (e) {
    const isPassword = passwordRef.getAttribute('type') === 'password';
    passwordRef.setAttribute('type', isPassword ? 'text' : 'password');
    if (isPassword) {
      this.classList.remove('fi-rr-eye');
      this.classList.add('fi-rr-eye-crossed');
      this.setAttribute('title', 'លាក់ពាក្យសម្ងាត់ (Hide password)');
    } else {
      this.classList.remove('fi-rr-eye-crossed');
      this.classList.add('fi-rr-eye');
      this.setAttribute('title', 'បង្ហាញពាក្យសម្ងាត់ (Show password)');
    }
  });
}

// Prevent Khmer Input in Password
if (passwordRef) {
  passwordRef.addEventListener('input', function (e) {
    const khmerRegex = /[\u1780-\u17FF\u19E0-\u19FF]/g;
    if (khmerRegex.test(this.value)) {
      this.value = this.value.replace(khmerRegex, '');
      // Shake animation
      this.parentElement.style.animation = "shake 0.5s ease";
      setTimeout(() => { this.parentElement.style.animation = "none"; }, 500);
      showCustomAlert("ពាក្យសម្ងាត់មិនអាចប្រើអក្សរ ឬលេខខ្មែរបានទេ!");
    }
  });
}

// Login Logic
if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const email = usernameRef.value.trim();
    const password = passwordRef.value;

    if (!email || !password) {
      showCustomAlert("សូមបញ្ចូលអ៊ីមែល និងពាក្យសម្ងាត់!");
      return;
    }

    const loginBtn = document.getElementById('loginBtn');
    const originalContent = loginBtn ? loginBtn.innerHTML : '<i class="fi fi-rr-sign-in-alt"></i> <span>ចូលប្រព័ន្ធ (Login)</span>';
    if (loginBtn) {
      loginBtn.innerHTML = '<span class="btn-spinner"></span> <span>កំពុងចូល...</span>';
      loginBtn.disabled = true;
    }

    firebase.auth().signInWithEmailAndPassword(email, password)
      .then((userCredential) => {
        const uid = userCredential.user.uid;
        console.log("Logged in user:", uid);

        // Check if user still exists in Database (in case Admin deleted them from User Mgmt)
        return firebase.database().ref('users/' + uid).once('value').then(snapshot => {
          const adminEmail = window.ADMIN_EMAIL || 'admin@school.com';
          const superAdminEmails = (window.SUPER_ADMIN_EMAILS || [adminEmail]).map(e => (e || '').toLowerCase().trim());
          const cleanEmail = (email || '').toLowerCase().trim();
          const userData = snapshot.val() || {};
          const userRole = (userData.role || '').toLowerCase();
          const isItOrAdmin = (typeof window.isItOrAdminUser === 'function')
              ? window.isItOrAdminUser(cleanEmail, userRole)
              : (superAdminEmails.includes(cleanEmail) || cleanEmail.startsWith('admin') || cleanEmail.startsWith('it') || cleanEmail.includes('it@') || cleanEmail.includes('soknang') || userRole === 'it' || userRole === 'admin');

          if (!snapshot.exists()) {
            // If user doesn't exist in DB, auto-create their profile so they are not blocked
            const defaultRole = isItOrAdmin ? (cleanEmail.startsWith('it') || cleanEmail.includes('it@') ? 'it' : 'admin') : 'staff';
            const defaultPerms = {};
            (window.SYSTEM_MODULES || []).forEach(m => {
                defaultPerms[m.key] = true;
            });
            const newUserData = {
                email: email,
                name: (cleanEmail.startsWith('it') || cleanEmail.includes('it@')) ? 'IT Support' : email.split('@')[0],
                role: defaultRole,
                permissions: defaultPerms,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            };
            firebase.database().ref('users/' + uid).set(newUserData).catch(() => {}).finally(() => {
                window.location.href = "/index.html";
            });
          } else {
            // User exists -> Update Last Login & Email & Redirect
            const updates = {
              email: email,
              lastLogin: new Date().toISOString()
            };
            if (isItOrAdmin) {
              const fullPerms = userData.permissions || {};
              (window.SYSTEM_MODULES || []).forEach(m => {
                  fullPerms[m.key] = true;
              });
              updates.permissions = fullPerms;
              if (!userData.role || userData.role === 'staff') {
                  updates.role = (cleanEmail.startsWith('it') || cleanEmail.includes('it@')) ? 'it' : 'admin';
              }
            }
            firebase.database().ref('users/' + uid).update(updates).catch(() => {}).finally(() => {
                window.location.href = "/index.html";
            });
          }
        });
      })
      .catch((error) => {
        console.error("Login error:", error);
        let errorMessage = "មានបញ្ហាកក្នុងការចូលប្រើប្រាស់។";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-login-credentials') {
          errorMessage = "អ៊ីមែល ឬ ពាក្យសម្ងាត់មិនត្រឹមត្រូវ!";
        } else if (error.code === 'auth/invalid-email') {
          errorMessage = "ទម្រង់អ៊ីមែលមិនត្រឹមត្រូវ!";
        } else if (error.code === 'auth/too-many-requests') {
          errorMessage = "ការព្យាយាមចូលច្រើនដងពេក។ សូមរង់ចាំមួយសន្ទុះ!";
        } else {
          errorMessage = "មានបញ្ហាកក្នុងការចូល៖ " + error.message;
        }

        failedAttempts++;
        if (failedAttempts >= 3) {
          errorMessage = `អ្នកបានបញ្ចូលខុស ${failedAttempts} ដងហើយ! សូមទាក់ទងមកកាន់ IT Support តាមរយៈ Telegram: <a href="https://t.me/m_makara_m" target="_blank" style="color: #fff; text-decoration: underline; font-weight: bold;">https://t.me/m_makara_m</a>`;
          showCustomAlert(errorMessage, 8000);
        } else {
          showCustomAlert(errorMessage);
        }

        if (loginBtn) {
          loginBtn.innerHTML = originalContent;
          loginBtn.disabled = false;
        }
      });
  });
}

function showCustomAlert(message, duration = 3000) {
  const alertBox = document.getElementById("customAlert");
  if (!alertBox) return;
  alertBox.innerHTML = message;
  alertBox.style.display = "block";

  // Prevent multiple timers from conflicting
  if (window.alertTimeout) clearTimeout(window.alertTimeout);

  window.alertTimeout = setTimeout(() => {
    alertBox.style.display = "none";
  }, duration);
}

// Check auth state
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    // window.location.href = "index.html";
  }
});

// Dynamic UI initialization on load
window.addEventListener('load', () => {
  // Set dynamic year
  const yearEl = document.getElementById('currentYear');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Set dynamic logo from system config if available
  if (window.SYSTEM_LOGO) {
    const logoImg = document.querySelector('.logo-img');
    if (logoImg) logoImg.src = window.SYSTEM_LOGO;
  }
});

