/**
 * auth-check.js
 * Protects pages from unauthorized access.
 */
document.addEventListener("DOMContentLoaded", () => {
    // Bypass authentication check for teacher portal
    if (window.location.pathname.includes('teacher-portal.html')) {
        return;
    }

    // Determine if we are on the login page
    const isLoginPage = window.location.pathname.endsWith("/login.html") || window.location.pathname.endsWith("/login") || window.location.pathname === "/";

    // Check for local file execution
    if (window.location.protocol === 'file:') {
        const warning = document.createElement('div');
        warning.style.cssText = 'position:fixed;top:0;left:0;width:100%;background:#dc3545;color:white;text-align:center;padding:15px;z-index:99999;font-weight:bold;font-size:16px;box-shadow:0 2px 10px rgba(0,0,0,0.2);';
        warning.innerHTML = `
            ⛔ សូមកុំបើកឯកសារដោយផ្ទាល់ (Do not open files directly)!<br>
            ប្រព័ន្ធនេះត្រូវការដំណើរការលើ Server។ សូមដំណើរការ <code>start_server.cmd</code> ជាមុនសិន។<br>
            System requires a local server. Please run <code>start_server.cmd</code> first.
        `;
        document.body.appendChild(warning);
        return; // Stop execution
    }

    // Auto-redirect 127.0.0.1 to localhost to avoid Firebase OAuth errors
    if (window.location.hostname === '127.0.0.1') {
        window.location.hostname = 'localhost';
        return;
    }

    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            if (isLoginPage) {
                console.log("Logged in user found on login page. Redirecting to dashboard...");
                window.location.href = "/index.html";
                return;
            }

            // UI Elements
            const nameEl = document.getElementById('user-display-name');
            const emailEl = document.getElementById('user-display-email');
            const roleEl = document.getElementById('user-role-badge');
            const imgContainer = document.getElementById('user-display-image-container');

            const adminEmail = window.ADMIN_EMAIL || 'admin@school.com';
            // Support multiple super admin emails (centralized in firebase-config.js)
            const superAdminEmails = (window.SUPER_ADMIN_EMAILS || [adminEmail]).map(e => (e || '').toLowerCase().trim());
            const userEmail = (user.email || '').toLowerCase().trim();
            const isItOrAdmin = (typeof window.isItOrAdminUser === 'function')
                ? window.isItOrAdminUser(userEmail, '')
                : (superAdminEmails.includes(userEmail) || userEmail.startsWith('admin') || userEmail.startsWith('it') || userEmail.includes('it@') || userEmail.includes('soknang') || userEmail.includes('makara'));
            const isSuperAdmin = isItOrAdmin;

            /**
             * applyPermissions
             * Hides sidebar links and redirects if user doesn't have access to the current page.
             */
            const applyPermissions = (perms, role) => {
                const cleanRole = (role || '').toLowerCase().trim();
                const isUserIt = cleanRole === 'it' || cleanRole === 'it-admin' || cleanRole === 'it-support' || cleanRole === 'developer' || userEmail.startsWith('it') || userEmail.includes('it@');
                const isAdmin = isSuperAdmin || isUserIt || cleanRole === 'admin' || cleanRole === 'administrator' || cleanRole === 'superadmin';
                const modules = window.SYSTEM_MODULES || [];

                // 1. Build the permission object (p)
                let p = perms || {};
                // If user is IT or Admin, always grant 100% full access to all modules!
                if (isAdmin || isUserIt) {
                    p = {};
                    modules.forEach(m => {
                        p[m.key] = true;
                    });
                } else {
                    const hasAnyExplicitPerm = Object.keys(p).some(k => p[k] === true || p[k] === "true");
                    // If user has no permissions configured or empty, give default access so they aren't locked out
                    if (!hasAnyExplicitPerm) {
                        p = {};
                        modules.forEach(m => {
                            p[m.key] = true;
                        });
                    }
                }
                
                // 2. Build the links mapping and page mapping
                const links = {};
                const pagePermissionMap = {};

                modules.forEach(m => {
                    let hasAccess = isAdmin;
                    if (!isAdmin) {
                        if (p[m.key] === true || p[m.key] === "true") {
                            hasAccess = true;
                        } else if (p[m.key] === false || p[m.key] === "false") {
                            hasAccess = false;
                        } else {
                            // Key not explicitly configured in user profile: default to true so new modules are visible
                            if (m.subItems && Array.isArray(m.subItems)) {
                                hasAccess = m.subItems.some(sub => p[sub.key] !== false && p[sub.key] !== "false");
                            } else {
                                hasAccess = true;
                            }
                        }
                    }

                    links[m.href] = hasAccess;
                    links['/' + m.href] = hasAccess;
                    pagePermissionMap[m.href] = m.key;
                    pagePermissionMap['/' + m.href] = m.key;

                    // Support subItems
                    if (m.subItems && Array.isArray(m.subItems)) {
                        m.subItems.forEach(sub => {
                            let subAccess = isAdmin;
                            if (!isAdmin) {
                                if (p[sub.key] === true || p[sub.key] === "true") {
                                    subAccess = true;
                                } else if (p[sub.key] === false || p[sub.key] === "false") {
                                    subAccess = false;
                                } else {
                                    subAccess = hasAccess;
                                }
                            }
                            links[sub.href] = subAccess;
                            links['/' + sub.href] = subAccess;
                            const subClean = sub.href ? sub.href.split('?')[0] : '';
                            if (subClean) {
                                pagePermissionMap[subClean] = sub.key || m.key;
                                pagePermissionMap['/' + subClean] = sub.key || m.key;
                            }
                        });
                    }

                    // Handle sub-pages
                    if (m.key === 'data') {
                        const canDropout = isAdmin || p.dropoutStudents === true || p.dropoutStudents === "true";
                        const canPaid = isAdmin || p.paidStudents === true || p.paidStudents === "true";
                        const canGrad = isAdmin || p.graduatedStudents === true || p.graduatedStudents === "true";
                        links['dropout-students.html'] = canDropout;
                        links['/dropout-students.html'] = canDropout;
                        links['paid-students.html'] = canPaid;
                        links['/paid-students.html'] = canPaid;
                        links['graduated-students.html'] = canGrad;
                        links['/graduated-students.html'] = canGrad;
                    }
                });

                // 3. Apply Visibility to sidebar links
                // Support both standard nav-links and sub-nav-links with query parameters
                document.querySelectorAll('.nav-link, .sub-nav-link').forEach(link => {
                    const href = link.getAttribute('href');
                    const cleanHref = href ? href.split('?')[0].replace(/^\//, '') : '';
                    const hasRule = href && (
                        links.hasOwnProperty(href) || 
                        links.hasOwnProperty('/' + href) || 
                        links.hasOwnProperty(cleanHref) || 
                        links.hasOwnProperty('/' + cleanHref)
                    );

                    if (hasRule) {
                        const isAllowed = links[href] ?? links['/' + href] ?? links[cleanHref] ?? links['/' + cleanHref];
                        link.style.setProperty('display', isAllowed ? 'flex' : 'none', 'important');
                        
                        // If parent group exists, sync its visibility
                        const parentGroup = link.closest('.sidebar-dropdown-group');
                        if (parentGroup && link.classList.contains('nav-link-parent')) {
                            const anySubAllowed = parentGroup.querySelectorAll('.sub-nav-link:not([style*="display: none"])').length > 0;
                            parentGroup.style.setProperty('display', (isAllowed || anySubAllowed) ? 'block' : 'none', 'important');
                        }
                    } else if (isAdmin) {
                        link.style.setProperty('display', 'flex', 'important');
                    }
                });

                // Clean up empty sidebar section titles
                document.querySelectorAll('.sidebar-section-title').forEach(title => {
                    const targetId = title.getAttribute('data-section-target');
                    const targetBody = targetId ? document.getElementById(targetId) : null;
                    let hasVisible = false;

                    if (targetBody) {
                        const links = targetBody.querySelectorAll('.nav-link, .sidebar-dropdown-group');
                        for (const el of links) {
                            if (el.style.display !== 'none' && !el.classList.contains('d-none')) {
                                hasVisible = true;
                                break;
                            }
                        }
                        if (!hasVisible) {
                            targetBody.style.setProperty('display', 'none', 'important');
                        }
                    } else {
                        let next = title.nextElementSibling;
                        while (next && !next.classList.contains('sidebar-section-title')) {
                            if (next.style.display !== 'none' && !next.classList.contains('d-none')) {
                                hasVisible = true;
                                break;
                            }
                            next = next.nextElementSibling;
                        }
                    }
                    title.style.setProperty('display', hasVisible ? 'flex' : 'none', 'important');
                });

                // 4. Redirect if unauthorized
                const path = window.location.pathname;
                const currentPage = path.split('/').pop() || 'index.html';
                
                // Bypass redirect for admins
                if (isAdmin) return;

                // Check for sub-pages first
                const subpageKey = getSubpageKey(currentPage);
                if (subpageKey) {
                    if (!p[subpageKey]) {
                        window.location.href = "/index.html";
                    }
                    return;
                }

                const requiredPerm = pagePermissionMap['/' + currentPage] || pagePermissionMap[currentPage];
                if (requiredPerm && !p[requiredPerm]) {
                    const fallback = modules.find(m => p[m.key]);
                    if (fallback && fallback.href !== currentPage && ('/' + fallback.href) !== path) {
                        window.location.href = fallback.href;
                    } else if (currentPage !== 'index.html') {
                        window.location.href = "/index.html";
                    }
                }
            };

            const getSubpageKey = (page) => {
                if (page === 'dropout-students.html') return 'dropoutStudents';
                if (page === 'paid-students.html') return 'paidStudents';
                if (page === 'graduated-students.html') return 'graduatedStudents';
                return null;
            };

            // Function to set profile UI dynamically
            window.refreshSidebarProfile = () => {
                const data = window.currentUserProfileData;
                if (!data) return;

                const nameEl = document.getElementById('user-display-name');
                const emailEl = document.getElementById('user-display-email');
                const roleEl = document.getElementById('user-role-badge');
                const imgContainer = document.getElementById('user-display-image-container');
                const imgEl = document.getElementById('user-display-image');

                if (nameEl) nameEl.textContent = data.displayName;
                if (emailEl) {
                    emailEl.textContent = data.email;
                    emailEl.title = data.email;
                }
                
                // Update welcome message if it exists on the page
                const welcomeNameElem = document.getElementById('welcome-user-name');
                if (welcomeNameElem) welcomeNameElem.textContent = data.displayName;
                
                if (imgEl) {
                    imgEl.src = (data.imageUrl && data.imageUrl !== 'undefined' && data.imageUrl !== 'null') ? data.imageUrl : 'https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff';
                } else if (imgContainer) {
                    if (data.imageUrl && data.imageUrl !== 'undefined' && data.imageUrl !== 'null') {
                        imgContainer.innerHTML = `<img src="${data.imageUrl}" class="w-100 h-100" style="object-fit: cover;" onerror="this.src='/img/1.jpg'">`;
                    } else {
                        imgContainer.innerHTML = `<i class="fi fi-rr-user-circle text-primary fa-2x" id="user-display-placeholder"></i>`;
                    }
                }

                if (roleEl) {
                    if (data.isIt || data.role === 'it') {
                        roleEl.textContent = 'IT Developer (ព័ត៌មានវិទ្យា)';
                        roleEl.className = 'badge bg-danger text-white fw-bold rounded-pill px-3 py-2 shadow-sm';
                    } else if (data.isAdmin) {
                        roleEl.textContent = 'Admin (អ្នកគ្រប់គ្រង)';
                        roleEl.className = 'badge bg-warning text-dark fw-bold rounded-pill px-3 py-2 shadow-sm';
                    } else {
                        roleEl.textContent = 'Staff (បុគ្គលិក)';
                        roleEl.className = 'badge bg-info text-white fw-bold rounded-pill px-3 py-2 shadow-sm';
                    }
                }

                // Update new sidebar footer elements dynamically
                const sidebarNameEl = document.getElementById('sidebar-user-name');
                const sidebarRoleEl = document.getElementById('sidebar-user-role');
                const sidebarAvatarEl = document.getElementById('sidebar-user-avatar');

                if (sidebarNameEl) sidebarNameEl.textContent = data.displayName;
                if (sidebarRoleEl) {
                    if (data.isIt || data.role === 'it') {
                        sidebarRoleEl.textContent = 'IT Developer';
                        sidebarRoleEl.className = 'sidebar-user-role badge bg-danger text-white fw-bold rounded-pill';
                    } else if (data.isAdmin) {
                        sidebarRoleEl.textContent = 'Admin (អ្នកគ្រប់គ្រង)';
                        sidebarRoleEl.className = 'sidebar-user-role badge bg-warning text-dark fw-bold rounded-pill';
                    } else {
                        sidebarRoleEl.textContent = 'Staff (បុគ្គលិក)';
                        sidebarRoleEl.className = 'sidebar-user-role badge bg-info text-white fw-bold rounded-pill';
                    }
                }
                if (sidebarAvatarEl) {
                    sidebarAvatarEl.src = (data.imageUrl && data.imageUrl !== 'undefined' && data.imageUrl !== 'null') ? data.imageUrl : `https://ui-avatars.com/api/?name=${encodeURIComponent(data.displayName)}&background=ff69b4&color=fff`;
                }
            };

            // Store globally for refresh
            window.refreshSidebarPermissions = () => {
                if (isSuperAdmin) {
                    applyPermissions({}, 'admin');
                } else {
                    // Fetch from local state if available to avoid DB hit
                    const cached = localStorage.getItem('userPermissionsCache');
                    if (cached) {
                        try {
                            const { permissions, role } = JSON.parse(cached);
                            applyPermissions(permissions, role);
                        } catch(e) {}
                    }
                }
            };

            // Logic Flow
            // Logic Flow: Always fetch from database to sync profile info (name, image)
            // But permissions are still determined by isSuperAdmin
            firebase.database().ref('users/' + user.uid).on('value', snapshot => {
                const userData = snapshot.val() || {};

                // Auto-create user in DB if it doesn't exist yet so they are never blocked
                if (!snapshot.exists()) {
                    const autoRole = isSuperAdmin ? (userEmail.startsWith('it') || userEmail.includes('it@') ? 'it' : 'admin') : 'staff';
                    const autoPerms = {};
                    (window.SYSTEM_MODULES || []).forEach(m => {
                        autoPerms[m.key] = true;
                    });
                    firebase.database().ref('users/' + user.uid).set({
                        email: user.email,
                        name: (userEmail.startsWith('it') || userEmail.includes('it@')) ? 'IT Support' : (user.displayName || user.email.split('@')[0]),
                        role: autoRole,
                        permissions: autoPerms,
                        createdAt: new Date().toISOString(),
                        lastLogin: new Date().toISOString()
                    }).catch(e => console.warn("Auto-create user DB entry:", e));
                }

                // 1. Sync Profile UI
                const rawRole = (userData.role || (isSuperAdmin ? (userEmail.startsWith('it') || userEmail.includes('it@') ? 'it' : 'admin') : 'staff')).toLowerCase();
                const isUserIt = rawRole === 'it' || rawRole === 'it-admin' || rawRole === 'it-support' || rawRole === 'developer' || userEmail.startsWith('it') || userEmail.includes('it@');
                const isAdmin = isSuperAdmin || isUserIt || rawRole === 'admin' || rawRole === 'administrator' || rawRole === 'superadmin' || userData.isAdmin === true || userData.isAdmin === "true";
                const userRole = isUserIt ? 'it' : (isAdmin ? 'admin' : rawRole);
                
                // Name Priority: DB Name > DB displayName > isSuperAdmin Hardcoded > Email Prefix
                let defaultName = user.email.split('@')[0];
                if (isUserIt) defaultName = 'IT Support';
                else if (isAdmin) defaultName = 'Admin (អ្នកគ្រប់គ្រង)';
                const displayName = userData.name || userData.displayName || defaultName;
                
                window.currentUserProfileData = {
                    displayName: displayName,
                    name: displayName,
                    email: user.email,
                    imageUrl: userData.imageUrl,
                    isAdmin: isAdmin,
                    isIt: isUserIt,
                    role: userRole,
                    phone: userData.phone || '',
                    username: userData.username || '',
                    dob: userData.dob || '',
                    bio: userData.bio || ''
                };

                window.refreshSidebarProfile();

                // 3. Cache and Apply Permissions
                let permissions = userData.permissions || {};
                if (isAdmin || isUserIt) {
                    permissions = {};
                    (window.SYSTEM_MODULES || []).forEach(m => {
                        permissions[m.key] = true;
                    });
                } else {
                    const hasPerms = Object.keys(permissions).some(k => permissions[k] === true || permissions[k] === "true");
                    if (!hasPerms) {
                        permissions = {};
                        (window.SYSTEM_MODULES || []).forEach(m => {
                            permissions[m.key] = true;
                        });
                    }
                }

                localStorage.setItem('userPermissionsCache', JSON.stringify({
                    permissions: permissions,
                    role: userRole
                }));

                applyPermissions(permissions, userRole);

            }, err => {
                console.warn("Firebase users node permission restricted (using auth profile fallback):", err.message || err);
                // Fallback on error - do NOT lock user out!
                const isUserIt = userEmail.startsWith('it') || userEmail.includes('it@');
                const isUserAdmin = isSuperAdmin || isUserIt || userEmail.startsWith('admin') || userEmail.includes('soknang') || userEmail.includes('makara');
                const defaultPerms = {};
                (window.SYSTEM_MODULES || []).forEach(m => {
                    defaultPerms[m.key] = true;
                });
                const fallbackName = isUserIt ? 'IT Support' : (user.displayName || (user.email ? user.email.split('@')[0] : 'Admin'));
                window.currentUserProfileData = { 
                    displayName: fallbackName, 
                    email: user.email, 
                    isAdmin: isUserAdmin, 
                    isIt: isUserIt,
                    role: isUserIt ? 'it' : (isUserAdmin ? 'admin' : 'staff') 
                };
                applyPermissions(defaultPerms, isUserIt ? 'it' : (isUserAdmin ? 'admin' : 'staff'));
                if (typeof window.refreshSidebarProfile === 'function') {
                    window.refreshSidebarProfile();
                }
            });
        } else {
            console.log("Auth state initialized: No user found.");
            if (!isLoginPage) {
                console.log("Redirecting to login page...");
                window.location.href = "/login.html";
            }
        }
    });
});

/**
 * Handle Logout
 * Signs out the updated user and redirects to login page.
 */
function handleLogout(event) {
    if (event) event.preventDefault();

    const performSignOut = () => {
        Swal.fire({
            title: 'ចាកចេញពីប្រព័ន្ធ? (Logout)',
            text: 'តើអ្នកពិតជាចង់ចាកចេញមែនទេ? (Are you sure you want to log out?)',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'ចាកចេញ (Logout)',
            cancelButtonText: 'បោះបង់ (Cancel)',
            customClass: {
                popup: 'rounded-4'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                firebase.auth().signOut().then(() => {
                    console.log("User signed out.");
                    window.location.href = "/login.html";
                }).catch((error) => {
                    console.error("Logout Error:", error);
                    Swal.fire({
                        title: 'កំហុស! (Error)',
                        text: 'មានបញ្ហាក្នុងការចាកចេញ៖ ' + error.message,
                        icon: 'error',
                        confirmButtonColor: '#8a0e5b'
                    });
                });
            }
        });
    };

    if (typeof Swal !== 'undefined') {
        performSignOut();
    } else {
        // Dynamically load SweetAlert2 if not loaded on the page
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        script.onload = performSignOut;
        script.onerror = () => {
            // Fallback to native confirm if CDN loading fails
            if (confirm("តើអ្នកពិតជាចង់ចាកចេញមែនទេ?")) {
                firebase.auth().signOut().then(() => {
                    window.location.href = "/login.html";
                }).catch((error) => {
                    console.error("Logout Error:", error);
                    alert("មានបញ្ហាក្នុងការចាកចេញ។");
                });
            }
        };
        document.head.appendChild(script);
    }
}
