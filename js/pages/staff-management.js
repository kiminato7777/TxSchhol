/**
 * Staff Management System
 * Handles CRUD operations for staff members
 */

let staffData = {};
let currentStaffId = null;
let masterStudyTimes = [];
let masterLevels = [];
let masterClasses = []; // Homeroom Classes
let masterClassrooms = []; // Study Rooms
let masterStudyTypes = []; // Course / Study Types
let masterClassDetails = {}; // Detailed Academic Configurations per class (room, hours, level, type, teacher)

/**
 * Cambodian Mobile Network Prefix Detection
 */
function getCarrierName(phone) {
    if (!phone || phone === 'មិនមាន') return '';
    const cleanPhone = phone.toString().replace(/\D/g, '');
    if (!cleanPhone) return '';
    let p = cleanPhone;
    if (p.startsWith('855')) p = '0' + p.substring(3);
    if (!p.startsWith('0')) p = '0' + p;
    const prefix = p.substring(0, 3);
    const carrierMapping = {
        'Smart': ['010', '015', '016', '069', '070', '081', '086', '087', '093', '096', '098'],
        'Cellcard': ['011', '012', '014', '017', '061', '076', '077', '078', '079', '085', '089', '092', '095', '099'],
        'Metfone': ['031', '038', '060', '066', '067', '068', '071', '088', '090', '097'],
        'Seatel': ['018'],
        'Cootel': ['038']
    };
    for (const [name, prefixes] of Object.entries(carrierMapping)) {
        if (prefixes.includes(prefix)) return name;
    }
    return '';
}

function formatPhoneWithCarrier(phone) {
    if (!phone || phone === 'មិនមាន' || phone === 'null' || phone === 'undefined') {
        return '<span class="text-muted small"><i class="fi fi-rr-cross-circle me-1 opacity-50"></i>មិនមាន</span>';
    }
    const cleanPhone = phone.toString().replace(/[^\d+]/g, '');
    const carrier = getCarrierName(phone);
    const carrierColors = {
        'Smart': '#a4cc39',
        'Cellcard': '#f37021',
        'Metfone': '#ed1c24',
        'Seatel': '#00a0e9',
        'Cootel': '#fbb03b'
    };
    const color = carrierColors[carrier] || '#888';
    const carrierBadge = carrier 
        ? `<span class="badge rounded-pill ms-1" style="background-color: ${color}; font-size: 0.65rem; padding: 2px 7px; vertical-align: middle; color: white;">${carrier}</span>` 
        : '';
    return `<div class="d-inline-flex align-items-center gap-1">
        <a href="tel:${cleanPhone}" class="text-decoration-none text-dark fw-bold text-nowrap hover-primary" onclick="event.stopPropagation()" title="ចុចដើម្បីហៅទូរស័ព្ទ">
            <i class="fi fi-rr-phone-call me-1 text-primary opacity-75" style="font-size: 0.8rem;"></i>${phone}
        </a>
        ${carrierBadge}
        <button type="button" class="btn btn-xs btn-outline-secondary border-0 p-0 ms-1 text-muted hover-dark" style="width: 20px; height: 20px; line-height: 1;" onclick="copyStaffPhone('${cleanPhone}', event)" title="ចម្លងលេខទូរស័ព្ទ">
            <i class="fi fi-rr-copy" style="font-size: 0.72rem;"></i>
        </button>
    </div>`;
}

function calculateTenure(hireDateStr) {
    if (!hireDateStr || ['N/A', '', 'មិនមាន', 'null', 'undefined'].includes(hireDateStr)) return '';
    let d = new Date(hireDateStr);
    if (isNaN(d.getTime())) {
        const eng = typeof convertToEnglishDate === 'function' ? convertToEnglishDate(hireDateStr) : null;
        if (eng) d = new Date(eng);
    }
    if (isNaN(d.getTime())) return '';

    const now = new Date();
    if (d > now) return 'ចូលថ្មីៗ';

    let years = now.getFullYear() - d.getFullYear();
    let months = now.getMonth() - d.getMonth();
    let days = now.getDate() - d.getDate();

    if (days < 0) {
        months -= 1;
    }
    if (months < 0) {
        years -= 1;
        months += 12;
    }

    if (years > 0 && months > 0) {
        return `${years} ឆ្នាំ ${months} ខែ`;
    } else if (years > 0) {
        return `${years} ឆ្នាំ`;
    } else if (months > 0) {
        return `${months} ខែ`;
    } else {
        const diffDays = Math.max(1, Math.floor((now - d) / (1000 * 60 * 60 * 24)));
        return `${diffDays} ថ្ងៃ`;
    }
}

window.copyStaffPhone = function(phone, event) {
    if (event) event.stopPropagation();
    if (!phone) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(phone).then(() => {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: `បានចម្លងលេខ៖ ${phone}`,
                showConfirmButton: false,
                timer: 1500
            });
        }).catch(() => {
            prompt('ចម្លងលេខទូរស័ព្ទ៖', phone);
        });
    } else {
        prompt('ចម្លងលេខទូរស័ព្ទ៖', phone);
    }
};
// currentMgmtType and mgmtData are declared later in the Standard Universal Management Section

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    loadUserProfile();
    loadAllStaff();
    loadMasterStudyTimes();
    populateStaffSelects(); // Load Levels & Classes for form
    initStudentsRealtimeListener(); // Real-time student sync for classrooms hub
    setupSearchFunctionality();
    setupFormSubmit();
    setupImageHelper(); // New: setup image preview logic
    loadStaffActivities(); // Initialize staff activity logs & listeners

    // Initialize sub-module view from URL (?view=classrooms | teachers | hr)
    const initialView = new URLSearchParams(window.location.search).get('view') || 'teachers';
    if (typeof switchStaffModuleView === 'function') {
        switchStaffModuleView(initialView, false);
    }

    // Dynamic browser back/forward history navigation
    window.addEventListener('popstate', function () {
        const currentView = new URLSearchParams(window.location.search).get('view') || 'teachers';
        if (typeof switchStaffModuleView === 'function') {
            switchStaffModuleView(currentView, false);
        }
    });

    const staffPhone = document.getElementById('staff-phone');
    if (staffPhone) {
        staffPhone.addEventListener('input', function () {
            updateStaffCarrierDisplay(this);
        });
    }
});

/**
 * Switch Sub-Module View
 * view: 'classrooms' | 'teachers' | 'hr' | 'activities'
 */
window.switchStaffModuleView = function (view, pushHistory = true) {
    const validViews = ['classrooms', 'teachers', 'hr', 'activities'];
    if (!validViews.includes(view)) view = 'teachers';

    // 1. Update In-page Switcher Buttons
    document.querySelectorAll('.module-switcher-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.getElementById(`module-tab-${view}`);
    if (activeBtn) activeBtn.classList.add('active');

    // 2. Update Header Dropdown Button & Items
    const activeIcon = document.getElementById('active-module-icon');
    const activeLabel = document.getElementById('active-module-label');
    const moduleMeta = {
        classrooms: { label: 'ថ្នាក់រៀន & បន្ទប់សិក្សា', icon: 'fi-rr-door-open', color: 'text-primary' },
        teachers: { label: 'គ្រូបង្រៀន & បុគ្គលិកអប់រំ', icon: 'fi-rr-chalkboard-user', color: 'text-warning' },
        hr: { label: 'គ្រប់គ្រងធនធានមនុស្ស & បុគ្គលិក', icon: 'fi-rr-users-alt', color: 'text-success' },
        activities: { label: 'កំណត់ត្រាសកម្មភាពបុគ្គលិក & ប្រព័ន្ធ', icon: 'fi-rr-time-past', color: 'text-danger' }
    }[view] || { label: 'គ្រូបង្រៀន & បុគ្គលិកអប់រំ', icon: 'fi-rr-chalkboard-user', color: 'text-warning' };

    if (activeIcon) {
        activeIcon.className = `fi ${moduleMeta.icon} ${moduleMeta.color}`;
    }
    if (activeLabel) {
        activeLabel.textContent = moduleMeta.label;
    }

    ['classrooms', 'teachers', 'hr', 'activities'].forEach(v => {
        const itemEl = document.getElementById(`dropdown-item-${v}`);
        if (itemEl) {
            const isSelected = v === view;
            itemEl.classList.toggle('active', isSelected);
            const check = itemEl.querySelector('.check-indicator');
            if (check) check.classList.toggle('d-none', !isSelected);
        }
    });

    // 3. Update Sidebar Sub-links
    document.querySelectorAll('.sidebar-submenu .sub-nav-link').forEach(link => {
        const subKey = link.getAttribute('data-sub-key');
        link.classList.toggle('active', subKey === view);
    });

    // 4. Elements to adjust
    const classroomsHub = document.getElementById('view-classrooms-hub');
    const activitiesHub = document.getElementById('view-activities-hub');
    const hrHub = document.getElementById('view-hr-hub');
    const statsGrid = document.getElementById('staff-stats-grid-container');
    const staffTableCard = document.getElementById('staff-table-card');
    const dashboardView = document.getElementById('dashboard-view');
    const staffDetailsView = document.getElementById('staff-details-view');
    const headerTitleText = document.querySelector('.staff-header-title .header-shimmer-text');
    const headerSubtitle = document.querySelector('.staff-header-subtitle');
    const headerBrandChip = document.querySelector('.staff-brand-chip i');

    // Ensure dashboard main view is visible and detail view is hidden
    if (dashboardView) dashboardView.classList.remove('d-none');
    if (staffDetailsView) staffDetailsView.classList.add('d-none');

    if (view === 'classrooms') {
        if (headerTitleText) headerTitleText.textContent = 'គ្រប់គ្រងថ្នាក់រៀន & បន្ទប់សិក្សា';
        if (headerBrandChip) headerBrandChip.className = 'fi fi-rr-door-open';
        if (classroomsHub) classroomsHub.classList.remove('d-none');
        if (activitiesHub) activitiesHub.classList.add('d-none');
        if (hrHub) hrHub.classList.add('d-none');
        if (statsGrid) statsGrid.classList.add('d-none');
        if (staffTableCard) staffTableCard.classList.add('d-none');
        if (headerSubtitle) headerSubtitle.textContent = 'គ្រប់គ្រងថ្នាក់រៀន បន្ទប់សិក្សា ម៉ោងបង្រៀន កម្រិតសិក្សា និងសិស្សក្នុងថ្នាក់';
        if (typeof renderClassroomHub === 'function') {
            renderClassroomHub().then(() => {
                if (typeof switchClassroomHubDisplayMode === 'function') {
                    switchClassroomHubDisplayMode(currentClassroomHubDisplayMode);
                }
            });
        }
    } else if (view === 'activities') {
        if (headerTitleText) headerTitleText.textContent = 'កំណត់ត្រាសកម្មភាពបុគ្គលិក & ប្រព័ន្ធ';
        if (headerBrandChip) headerBrandChip.className = 'fi fi-rr-time-past';
        if (classroomsHub) classroomsHub.classList.add('d-none');
        if (activitiesHub) activitiesHub.classList.remove('d-none');
        if (hrHub) hrHub.classList.add('d-none');
        if (statsGrid) statsGrid.classList.add('d-none');
        if (staffTableCard) staffTableCard.classList.add('d-none');
        if (headerSubtitle) headerSubtitle.textContent = 'តាមដានរាល់សកម្មភាពបន្ថែម កែប្រែ លុប និងផ្ទេរសិស្សរបស់បុគ្គលិកក្នុងប្រព័ន្ធ';
        if (typeof renderStaffActivitiesView === 'function') renderStaffActivitiesView();
    } else if (view === 'teachers') {
        if (headerTitleText) headerTitleText.textContent = 'គ្រប់គ្រងគ្រូបង្រៀន & បុគ្គលិកអប់រំ';
        if (headerBrandChip) headerBrandChip.className = 'fi fi-rr-chalkboard-user';
        if (classroomsHub) classroomsHub.classList.add('d-none');
        if (activitiesHub) activitiesHub.classList.add('d-none');
        if (hrHub) hrHub.classList.add('d-none');
        if (statsGrid) statsGrid.classList.remove('d-none');
        if (staffTableCard) staffTableCard.classList.remove('d-none');
        if (headerSubtitle) headerSubtitle.textContent = 'ព័ត៌មានលោកគ្រូ-អ្នកគ្រូ កាលវិភាគបង្រៀន និងថ្នាក់បន្ទុក';
        updateDashboardTableHeader('teachers');
        const allTab = document.getElementById('all-staff-tab');
        if (allTab && typeof filterDashboardList === 'function') {
            filterDashboardList('all');
            try {
                const tabTrigger = new bootstrap.Tab(allTab);
                tabTrigger.show();
            } catch (e) {}
        }
    } else if (view === 'hr') {
        if (headerTitleText) headerTitleText.textContent = 'គ្រប់គ្រងធនធានមនុស្ស & បុគ្គលិក (HR Hub)';
        if (headerBrandChip) headerBrandChip.className = 'fi fi-rr-users-alt';
        if (classroomsHub) classroomsHub.classList.add('d-none');
        if (activitiesHub) activitiesHub.classList.add('d-none');
        if (statsGrid) statsGrid.classList.add('d-none');
        if (staffTableCard) staffTableCard.classList.add('d-none');
        if (hrHub) hrHub.classList.remove('d-none');
        if (headerSubtitle) headerSubtitle.textContent = 'គ្រប់គ្រងធនធានមនុស្ស បុគ្គលិកការិយាល័យ កិច្ចសន្យាការងារ និងការសុំច្បាប់សម្រាក';
        if (typeof renderHrHub === 'function') {
            renderHrHub();
        }
    }

    // 5. Update Dynamic Action Button in Header
    window.currentStaffModuleView = view;
    const mainAddBtn = document.getElementById('btn-add-staff-main');
    const mainAddBtnText = document.getElementById('btn-add-staff-text');
    const mainAddBtnIcon = document.getElementById('btn-add-staff-icon');

    if (mainAddBtnText && mainAddBtnIcon) {
        if (view === 'classrooms') {
            mainAddBtnText.textContent = 'បន្ថែមថ្នាក់ ឬបន្ទប់រៀន';
            mainAddBtnIcon.className = 'fi fi-rr-door-open';
            if (mainAddBtn) {
                mainAddBtn.classList.remove('bg-gradient-success', 'bg-gradient-danger');
                mainAddBtn.classList.add('bg-gradient-teal');
            }
        } else if (view === 'activities') {
            mainAddBtnText.textContent = 'នាំចេញកំណត់ត្រា CSV';
            mainAddBtnIcon.className = 'fi fi-rr-file-download';
            if (mainAddBtn) {
                mainAddBtn.classList.remove('bg-gradient-teal', 'bg-gradient-success');
                mainAddBtn.classList.add('bg-gradient-danger');
            }
        } else if (view === 'hr') {
            mainAddBtnText.textContent = 'បន្ថែមបុគ្គលិក HR/រដ្ឋបាល';
            mainAddBtnIcon.className = 'fi fi-rr-users-alt';
            if (mainAddBtn) {
                mainAddBtn.classList.remove('bg-gradient-teal', 'bg-gradient-danger');
                mainAddBtn.classList.add('bg-gradient-success');
            }
        } else {
            mainAddBtnText.textContent = 'បន្ថែមគ្រូបង្រៀនថ្មី';
            mainAddBtnIcon.className = 'fi fi-rr-chalkboard-user';
            if (mainAddBtn) {
                mainAddBtn.classList.remove('bg-gradient-teal', 'bg-gradient-success', 'bg-gradient-danger');
            }
        }
    }

    // 6. Update URL
    const newUrl = `${window.location.pathname}?view=${view}`;
    if (pushHistory && window.location.search !== `?view=${view}`) {
        window.history.pushState({ view: view }, '', newUrl);
    } else if (!pushHistory) {
        window.history.replaceState({ view: view }, '', newUrl);
    }
};

/**
 * Dynamic Add Action Triggered from Header Button
 */
window.handleDynamicAddAction = function () {
    const view = window.currentStaffModuleView || 'teachers';
    if (view === 'classrooms') {
        const quickModalEl = document.getElementById('classroomQuickAddModal');
        if (quickModalEl) {
            const modal = bootstrap.Modal.getOrCreateInstance(quickModalEl);
            modal.show();
        } else if (typeof openClassroomAssignModal === 'function') {
            openClassroomAssignModal('', '', '', '', '', '');
        } else if (typeof openClassModal === 'function') {
            openClassModal();
        }
    } else if (view === 'activities') {
        if (typeof exportActivitiesCsv === 'function') {
            exportActivitiesCsv();
        }
    } else if (view === 'hr') {
        openAddStaffModal('hr');
    } else {
        openAddStaffModal('teachers');
    }
};

/**
 * Close quick selector and open target classroom modal
 */
window.closeQuickAddAndOpen = function (targetModal) {
    const quickModalEl = document.getElementById('classroomQuickAddModal');
    if (quickModalEl) {
        const modal = bootstrap.Modal.getInstance(quickModalEl);
        if (modal) modal.hide();
    }
    setTimeout(() => {
        if (targetModal === 'assign' && typeof openClassroomAssignModal === 'function') openClassroomAssignModal('', '', '', '', '', '');
        else if (targetModal === 'classes' && typeof openClassModal === 'function') openClassModal();
        else if (targetModal === 'rooms' && typeof openRoomModal === 'function') openRoomModal();
        else if (targetModal === 'levels' && typeof openLevelModal === 'function') openLevelModal();
        else if (targetModal === 'studyTimes' && typeof openStudyTimeModal === 'function') openStudyTimeModal();
        else if (targetModal === 'studyTypes' && typeof openStudyTypeModal === 'function') openStudyTypeModal();
    }, 250);
};

// Global Students Cache & Realtime Sync
let cachedStudentsList = [];
let studentsRealtimeListenerAttached = false;
let studentsPermissionDeniedLogged = false;

function initStudentsRealtimeListener() {
    if (!window.firebase || !firebase.auth) return;

    firebase.auth().onAuthStateChanged((user) => {
        if (!user) return;
        if (studentsRealtimeListenerAttached) return;
        studentsRealtimeListenerAttached = true;

        try {
            firebase.database().ref('students').on('value', (snapshot) => {
                const val = snapshot.val() || {};
                cachedStudentsList = Object.entries(val).map(([id, data]) => ({ id, ...data }));
                try {
                    localStorage.setItem('cached_students_backup', JSON.stringify(cachedStudentsList));
                } catch (storageErr) {}
                if (typeof renderClassroomHub === 'function' && window.currentStaffModuleView === 'classrooms') {
                    renderClassroomHub();
                }
            }, (err) => {
                if (!studentsPermissionDeniedLogged) {
                    console.info('ℹ️ Students node read permission restricted in Firebase Rules. Classroom Hub will use cached/local student data.');
                    studentsPermissionDeniedLogged = true;
                }
            });
        } catch (e) {
            studentsRealtimeListenerAttached = false;
        }
    });
}

async function fetchAllStudentsOnce() {
    if (cachedStudentsList && cachedStudentsList.length > 0) return cachedStudentsList;

    // 1. Immediately check local backup cache
    try {
        const localBackup = JSON.parse(localStorage.getItem('cached_students_backup') || '[]');
        if (localBackup && localBackup.length > 0) {
            cachedStudentsList = localBackup;
        }
    } catch (backupErr) {}

    // 2. Wait for Firebase Auth session to finish restoring if currentUser is still null
    if (window.firebase && firebase.auth && !firebase.auth().currentUser) {
        await new Promise((resolve) => {
            const unsub = firebase.auth().onAuthStateChanged((user) => {
                if (typeof unsub === 'function') unsub();
                resolve(user);
            });
            setTimeout(resolve, 800);
        });
    }

    try {
        const snap = await firebase.database().ref('students').once('value');
        const val = snap.val() || {};
        cachedStudentsList = Object.entries(val).map(([id, data]) => ({ id, ...data }));
        try {
            localStorage.setItem('cached_students_backup', JSON.stringify(cachedStudentsList));
        } catch (storageErr) {}
        return cachedStudentsList;
    } catch (e) {
        if (cachedStudentsList && cachedStudentsList.length > 0) {
            return cachedStudentsList;
        }
        if (!studentsPermissionDeniedLogged) {
            console.info('ℹ️ Students node read permission restricted in Firebase Rules. Using local data fallback.');
            studentsPermissionDeniedLogged = true;
        }
        return [];
    }
}

function escapeStaffHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeStaffJs(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '&quot;');
}

// --------------------------------------------------------------------------
// Classrooms & Study Rooms Hub Standard Management
// --------------------------------------------------------------------------
let currentClassroomHubStatus = 'all';
let cachedClassroomHubList = [];
let currentModalClassStudents = [];
let currentViewedClassMeta = {};

function renderClassRoomCell(item) {
    let iconClass = 'type-class';
    let icon = 'fi-rr-book-open-reader';
    let title = (item.className || item.name || '').trim();
    let room = (item.room || '').trim();
    let roomBadge = '';

    const isVacantRoom = title === '(បន្ទប់ទំនេរ)' || title.startsWith('បន្ទប់');
    const hasDistinctRoom = room && room !== '-' && room.toLowerCase() !== title.toLowerCase();

    if (isVacantRoom) {
        iconClass = 'type-room';
        icon = 'fi-rr-door-open';
        roomBadge = `<span class="room-pill-chip room-only"><i class="fi fi-rr-door-open"></i>បន្ទប់សិក្សា</span>`;
    } else if (hasDistinctRoom) {
        iconClass = 'type-class';
        icon = 'fi-rr-book-open-reader';
        roomBadge = `<span class="room-pill-chip room-assigned" title="ទីតាំងបន្ទប់"><i class="fi fi-rr-door-open text-info"></i>បន្ទប់៖ <strong>${escapeStaffHtml(room)}</strong></span>`;
    } else if (room && room !== '-') {
        iconClass = 'type-class';
        icon = 'fi-rr-book-open-reader';
        roomBadge = `<span class="room-pill-chip room-assigned"><i class="fi fi-rr-door-open text-info"></i>បន្ទប់៖ <strong>${escapeStaffHtml(room)}</strong></span>`;
    } else {
        iconClass = 'type-class';
        icon = 'fi-rr-book-open-reader';
        roomBadge = `<span class="room-pill-chip room-unassigned"><i class="fi fi-rr-door-closed text-muted"></i>មិនទាន់កំណត់បន្ទប់</span>`;
    }

    return `
        <div class="class-room-cell">
            <div class="class-room-icon ${iconClass}">
                <i class="fi ${icon}"></i>
            </div>
            <div class="class-room-info">
                <span class="class-room-title">${escapeStaffHtml(title)}</span>
                <div class="d-flex align-items-center gap-1 mt-1">
                    ${roomBadge}
                </div>
            </div>
        </div>
    `;
}

function renderLevelBadge(lvl) {
    if (!lvl || lvl === '-' || lvl === 'N/A' || lvl === 'undefined' || lvl === 'null') {
        return `<span class="level-pill-badge level-pill-unspecified"><i class="fi fi-rr-minus-small"></i>មិនទាន់កំណត់</span>`;
    }
    const cleanLvl = String(lvl).trim();
    const l = cleanLvl.toLowerCase();

    if (l.includes('មត្តេយ្យ') || l.includes('kindergarten') || l.includes('preschool') || l.includes('កុមារ')) {
        return `<span class="level-pill-badge level-pill-kindergarten"><i class="fi fi-rr-baby"></i>${escapeStaffHtml(cleanLvl)}</span>`;
    }
    if (l.includes('បឋម') || l.includes('primary') || l.includes('elementary')) {
        return `<span class="level-pill-badge level-pill-primary"><i class="fi fi-rr-backpack"></i>${escapeStaffHtml(cleanLvl)}</span>`;
    }
    if (l.includes('អនុវិទ្យាល័យ') || l.includes('secondary') || l.includes('junior')) {
        return `<span class="level-pill-badge level-pill-secondary"><i class="fi fi-rr-book-alt"></i>${escapeStaffHtml(cleanLvl)}</span>`;
    }
    if (l.includes('វិទ្យាល័យ') || l.includes('high school') || l.includes('senior')) {
        return `<span class="level-pill-badge level-pill-high"><i class="fi fi-rr-diploma"></i>${escapeStaffHtml(cleanLvl)}</span>`;
    }
    if (l.includes('ចិន') || l.includes('chinese') || l.includes('hsk')) {
        return `<span class="level-pill-badge level-pill-chinese"><i class="fi fi-rr-text"></i>${escapeStaffHtml(cleanLvl)}</span>`;
    }
    if (l.includes('អង់គ្លេស') || l.includes('english') || l.includes('oxford') || l.includes('starter') || l.includes('cambridge')) {
        return `<span class="level-pill-badge level-pill-english"><i class="fi fi-rr-world"></i>${escapeStaffHtml(cleanLvl)}</span>`;
    }
    return `<span class="level-pill-badge level-pill-default"><i class="fi fi-rr-layers"></i>${escapeStaffHtml(cleanLvl)}</span>`;
}

function renderStudyTypeBadge(type) {
    if (!type || type === '-' || type === 'N/A') {
        return `<span class="badge bg-light text-muted border border-dashed"><i class="fi fi-rr-minus-small me-1"></i>មិនទាន់បញ្ជាក់</span>`;
    }
    const map = {
        'chinese-fulltime': 'ថ្នាក់ភាសាចិនពេញម៉ោង',
        'chinese-parttime': 'ថ្នាក់ភាសាចិនក្រៅម៉ោង',
        'three-languages': 'ថ្នាក់ចំណះដឹងទូទៅ',
        'one-language': 'ថ្នាក់ភាសា (១ភាសា)',
        'two-languages': 'ថ្នាក់ភាសា (២ភាសា)',
        'cFullTime': 'ថ្នាក់ភាសាចិនពេញម៉ោង',
        'cPartTime': 'ថ្នាក់ភាសាចិនក្រៅម៉ោង'
    };
    const label = map[type] || type;
    return `<span class="badge rounded-pill text-white px-2.5 py-1.5 fw-semibold" style="background: #8b5cf6;"><i class="fi fi-rr-apps me-1"></i>${escapeStaffHtml(label)}</span>`;
}

function renderTeacherCell(item) {
    const teacher = item.teacher;
    const phone = item.teacherPhone;
    if (!teacher || teacher === 'មិនទាន់មាន' || teacher === '-') {
        return `
            <div>
                <button type="button" class="btn btn-sm btn-outline-warning rounded-pill px-2.5 py-1 fw-bold shadow-2xs" onclick="openClassroomAssignModal('${escapeStaffJs(item.name)}', '${escapeStaffJs(item.room)}', '', '${escapeStaffJs(item.hours)}', '${escapeStaffJs(item.level)}', '${escapeStaffJs(item.studyType)}')">
                    <i class="fi fi-rr-user-add me-1"></i>ចាត់តាំងគ្រូ
                </button>
            </div>
        `;
    }
    const teacherClassCount = (cachedClassroomHubList || []).filter(c => c.teacher && c.teacher === teacher).length;
    return `
        <div>
            <div class="fw-bold text-dark staff-row-name d-flex align-items-center gap-1.5 flex-wrap">
                <i class="fi fi-rr-chalkboard-user text-success small"></i>
                <span class="cursor-pointer text-primary-hover" onclick="openTeacherScheduleModal('${escapeStaffJs(teacher)}')" title="ចុចមើលកាលវិភាគបង្រៀនទាំងអស់របស់ ${escapeStaffHtml(teacher)}">${escapeStaffHtml(teacher)}</span>
                ${teacherClassCount > 1 ? `
                    <button type="button" class="btn btn-xs badge rounded-pill bg-primary-subtle text-primary border border-primary-subtle py-0.5 px-2 fw-bold" onclick="openTeacherScheduleModal('${escapeStaffJs(teacher)}')" title="គ្រូនេះបង្រៀន ${teacherClassCount} ថ្នាក់ (ចុចមើលកាលវិភាគ)">
                        <i class="fi fi-rr-calendar-clock me-0.5"></i>${teacherClassCount} ថ្នាក់
                    </button>
                ` : ''}
            </div>
            ${phone && phone !== '-' ? `<small class="text-muted d-block mt-0.5"><i class="fi fi-rr-phone-call me-1 text-primary"></i>${escapeStaffHtml(phone)}</small>` : ''}
        </div>
    `;
}

window.renderClassroomHub = async function (filterQuery = '') {
    const tbody = document.getElementById('classroom-hub-table-body');
    if (!tbody) return;

    await fetchAllStudentsOnce();

    const classMap = {};

    function ensureClassEntry(className, defaultRoom = '', defaultTime = '', defaultLevel = '', defaultType = '') {
        const cleanName = (className || '').trim();
        if (!cleanName || cleanName === '-' || cleanName === 'N/A' || cleanName === 'មិនមាន') return null;
        
        const lowerKey = cleanName.toLowerCase();
        if (!classMap[lowerKey]) {
            classMap[lowerKey] = {
                key: lowerKey,
                name: cleanName,
                className: cleanName,
                room: (defaultRoom || '').trim(),
                teacher: 'មិនទាន់មាន',
                teacherId: null,
                teacherPhone: '',
                level: (defaultLevel || '').trim() || '-',
                studyType: (defaultType || '').trim() || '-',
                hours: (defaultTime || '').trim() || '-',
                studentCount: 0,
                maleCount: 0,
                femaleCount: 0,
                students: []
            };
        } else {
            if ((!classMap[lowerKey].room || classMap[lowerKey].room === '-') && defaultRoom) {
                classMap[lowerKey].room = defaultRoom.trim();
            }
            if ((!classMap[lowerKey].level || classMap[lowerKey].level === '-') && defaultLevel) {
                classMap[lowerKey].level = defaultLevel.trim();
            }
            if ((!classMap[lowerKey].studyType || classMap[lowerKey].studyType === '-') && defaultType) {
                classMap[lowerKey].studyType = defaultType.trim();
            }
            if ((!classMap[lowerKey].hours || classMap[lowerKey].hours === '-') && defaultTime) {
                classMap[lowerKey].hours = defaultTime.trim();
            }
        }
        return classMap[lowerKey];
    }

    // 1. Gather masterClasses (Strictly configured academic classes from settings/classes)
    (masterClasses || []).forEach(c => {
        const cName = typeof c === 'string' ? c : (c.name || '');
        if (cName && cName.trim()) ensureClassEntry(cName.trim());
    });

    // 2. Gather detailed academic configurations from settings/classDetails (Room, Hours, Teacher, Level, Type)
    Object.values(masterClassDetails || {}).forEach(cd => {
        if (!cd || !cd.className) return;
        const entry = ensureClassEntry(cd.className, cd.room, cd.hours, cd.level, cd.studyType);
        if (entry) {
            if (cd.room && cd.room.trim() && cd.room !== '-') entry.room = cd.room.trim();
            if (cd.hours && cd.hours.trim() && cd.hours !== '-') entry.hours = cd.hours.trim();
            if (cd.level && cd.level.trim() && cd.level !== '-') entry.level = cd.level.trim();
            if (cd.studyType && cd.studyType.trim() && cd.studyType !== '-') entry.studyType = cd.studyType.trim();
            if (cd.teacher && cd.teacher.trim() && cd.teacher !== 'មិនទាន់មាន' && cd.teacher !== '-') {
                entry.teacher = cd.teacher.trim();
                const matchedStaff = Object.values(staffData || {}).find(s => (s.nameKhmer || '').trim().toLowerCase() === cd.teacher.trim().toLowerCase());
                if (matchedStaff) {
                    entry.teacherPhone = matchedStaff.phone || '';
                    entry.teacherId = matchedStaff.id || null;
                }
            }
        }
    });

    // 3. Gather teacher assignments from staffData (homeroomClass, classroom, teachingHours, level, studyType)
    Object.entries(staffData || {}).forEach(([staffId, s]) => {
        if (!s) return;
        const teacherName = (s.nameKhmer || '').trim();
        const phone = s.phone || '';
        const tHours = (s.teachingHours || '').trim();
        const tLevel = (s.level || '').trim();
        const tType = (s.studyType || '').trim();
        const tRoom = (s.classroom || '').trim();

        if (s.homeroomClass) {
            const classes = s.homeroomClass.split(/[,;|]/).map(x => x.trim()).filter(Boolean);
            classes.forEach(c => {
                const entry = ensureClassEntry(c, tRoom, tHours, tLevel, tType);
                if (entry) {
                    if (teacherName) {
                        entry.teacher = teacherName;
                        entry.teacherId = staffId;
                        entry.teacherPhone = phone;
                    }
                    if (tRoom && (!entry.room || entry.room === '-')) entry.room = tRoom;
                    if (tHours && (!entry.hours || entry.hours === '-')) entry.hours = tHours;
                    if (tLevel && (!entry.level || entry.level === '-')) entry.level = tLevel;
                    if (tType && (!entry.studyType || entry.studyType === '-')) entry.studyType = tType;
                }
            });
        } else if (s.classroom) {
            const classCandidates = s.classroom.split(/[,;|]/).map(x => x.trim()).filter(Boolean);
            classCandidates.forEach(c => {
                if (!c.toLowerCase().startsWith('បន្ទប់') && !c.toLowerCase().startsWith('room')) {
                    const entry = ensureClassEntry(c, tRoom, tHours, tLevel, tType);
                    if (entry && teacherName) {
                        entry.teacher = teacherName;
                        entry.teacherId = staffId;
                        entry.teacherPhone = phone;
                    }
                }
            });
        }
    });

    // 3.5. Also gather any registered classes from cachedStudentsList to guarantee all active student classes are visible
    (cachedStudentsList || []).forEach(st => {
        if (!st) return;
        const sGrade = (st.grade || '').trim();
        const sClass = (st.class || '').trim();
        const sClassName = (st.className || '').trim();
        const sRoom = (st.classroom || '').trim();
        const sTime = (st.studyTime || st.shift || '').trim();
        const sLevel = (st.studyLevel || st.level || '').trim();
        const sType = (st.courseType || st.studyType || '').trim();

        [sGrade, sClass, sClassName].forEach(clsName => {
            if (clsName && clsName !== '-' && clsName !== 'N/A' && !clsName.toLowerCase().startsWith('បន្ទប់') && !clsName.toLowerCase().startsWith('room')) {
                const entry = ensureClassEntry(clsName, sRoom, sTime, sLevel, sType);
                if (entry) {
                    if (sRoom && (!entry.room || entry.room === '-')) entry.room = sRoom;
                    if (sTime && (!entry.hours || entry.hours === '-')) entry.hours = sTime;
                    if (sLevel && (!entry.level || entry.level === '-')) entry.level = sLevel;
                    if (sType && (!entry.studyType || entry.studyType === '-')) entry.studyType = sType;
                }
            }
        });
    });

    // 4. Gather masterClassrooms (Physical Study Rooms)
    (masterClassrooms || []).forEach(r => {
        const rName = typeof r === 'string' ? r : (r.name || '');
        if (!rName) return;
        const cleanR = rName.trim();
        const hasClassInRoom = Object.values(classMap).some(c => (c.room || '').toLowerCase() === cleanR.toLowerCase());
        if (!hasClassInRoom) {
            const lowerR = cleanR.toLowerCase();
            if (!classMap[lowerR]) {
                classMap[lowerR] = {
                    key: lowerR,
                    name: cleanR,
                    className: '(បន្ទប់ទំនេរ)',
                    room: cleanR,
                    teacher: 'មិនទាន់មាន',
                    teacherId: null,
                    teacherPhone: '',
                    level: '-',
                    studyType: '-',
                    hours: '-',
                    studentCount: 0,
                    maleCount: 0,
                    femaleCount: 0,
                    students: []
                };
            }
        }
    });

    // 5. Compute student counts and gender breakdown per class
    let totalEnrolledStudents = 0;
    const uniqueRooms = new Set();
    const uniqueTimes = new Set();
    const assignedTeachers = new Set();

    Object.values(classMap).forEach(item => {
        const lowerName = item.name.toLowerCase();
        const lowerClass = (item.className || '').toLowerCase();
        const lowerRoom = (item.room || '').toLowerCase();

        const matching = (cachedStudentsList || []).filter(st => {
            const sc = (st.classroom || '').trim().toLowerCase();
            const sg = (st.grade || '').trim().toLowerCase();
            const sclass = (st.class || '').trim().toLowerCase();
            const scname = (st.className || '').trim().toLowerCase();

            if (item.className === '(បន្ទប់ទំនេរ)') {
                return sc === lowerRoom || sclass === lowerRoom || scname === lowerRoom;
            }

            return (
                (sg && (sg === lowerName || sg === lowerClass)) ||
                (sc && (sc === lowerName || sc === lowerClass)) ||
                (sclass && (sclass === lowerName || sclass === lowerClass)) ||
                (scname && (scname === lowerName || scname === lowerClass))
            );
        });

        item.students = matching;
        item.studentCount = matching.length;
        totalEnrolledStudents += matching.length;

        item.maleCount = matching.filter(s => {
            const g = (s.gender || '').trim().toLowerCase();
            return g === 'ប្រុស' || g === 'male' || g === 'm';
        }).length;

        item.femaleCount = matching.filter(s => {
            const g = (s.gender || '').trim().toLowerCase();
            return g === 'ស្រី' || g === 'female' || g === 'f';
        }).length;

        if (item.room && item.room !== '-' && !item.room.includes('ទំនេរ')) uniqueRooms.add(item.room);
        if (item.hours && item.hours !== '-') uniqueTimes.add(item.hours);
        if (item.teacher && item.teacher !== 'មិនទាន់មាន') assignedTeachers.add(item.teacher);
    });

    cachedClassroomHubList = Object.values(classMap);

    // 6. Update KPI Counters (Strict reflection of master data)
    const statTotal = document.getElementById('class-stat-total');
    const statRooms = document.getElementById('class-stat-rooms');
    const statTimes = document.getElementById('class-stat-times');
    const statTeachers = document.getElementById('class-stat-teachers');
    const statStudents = document.getElementById('class-stat-students');

    const activeClassesList = cachedClassroomHubList.filter(c => c.className !== '(បន្ទប់ទំនេរ)');

    if (statTotal) statTotal.textContent = activeClassesList.length;
    if (statRooms) statRooms.textContent = (masterClassrooms || []).length;
    if (statTimes) statTimes.textContent = (masterStudyTimes || []).length;
    if (statTeachers) statTeachers.textContent = assignedTeachers.size;
    if (statStudents) statStudents.textContent = totalEnrolledStudents;

    // Synchronize top tab badges & sidebar sub-badges
    const tabClassrooms = document.getElementById('tab-badge-classrooms');
    if (tabClassrooms) tabClassrooms.textContent = activeClassesList.length;
    const badgeClassrooms = document.getElementById('sub-badge-classrooms');
    if (badgeClassrooms) badgeClassrooms.textContent = activeClassesList.length;

    // 7. Auto-populate Filter Dropdowns dynamically
    const levelSelect = document.getElementById('class-hub-level-filter');
    if (levelSelect) {
        const curLevel = levelSelect.value;
        levelSelect.innerHTML = '<option value="">🎯 កម្រិតសិក្សាទាំងអស់</option>';
        (masterLevels || []).forEach(lvl => {
            const opt = document.createElement('option');
            opt.value = lvl;
            opt.textContent = `🎯 ${lvl}`;
            levelSelect.appendChild(opt);
        });
        if (curLevel && (masterLevels || []).includes(curLevel)) {
            levelSelect.value = curLevel;
        }
    }

    const timeSelect = document.getElementById('class-hub-time-filter');
    if (timeSelect) {
        const curTime = timeSelect.value;
        timeSelect.innerHTML = '<option value="">⏰ ម៉ោងសិក្សាទាំងអស់</option>';
        (masterStudyTimes || []).forEach(item => {
            const timeStr = typeof item === 'object' && item !== null ? item.time : item;
            if (timeStr) {
                const opt = document.createElement('option');
                opt.value = timeStr;
                opt.textContent = `⏰ ${timeStr}`;
                timeSelect.appendChild(opt);
            }
        });
        const currentTimes = (masterStudyTimes || []).map(t => typeof t === 'object' && t !== null ? t.time : t);
        if (curTime && currentTimes.includes(curTime)) {
            timeSelect.value = curTime;
        }
    }

    const teacherFilterSelect = document.getElementById('class-hub-teacher-filter');
    if (teacherFilterSelect) {
        const curTeacher = teacherFilterSelect.value;
        teacherFilterSelect.innerHTML = '<option value="">👨‍🏫 គ្រប់គ្រូបង្រៀន</option><option value="__unassigned__">⚠️ មិនទាន់មានគ្រូ</option>';
        
        const teacherMap = new Map();
        activeClassesList.forEach(c => {
            if (c.teacher && c.teacher !== 'មិនទាន់មាន' && c.teacher !== '-') {
                const count = (teacherMap.get(c.teacher) || 0) + 1;
                teacherMap.set(c.teacher, count);
            }
        });

        Array.from(teacherMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0], 'km'))
            .forEach(([tName, count]) => {
                const opt = document.createElement('option');
                opt.value = tName;
                opt.textContent = `👨‍🏫 ${tName} (${count} ថ្នាក់)`;
                teacherFilterSelect.appendChild(opt);
            });

        if (curTeacher) {
            teacherFilterSelect.value = curTeacher;
        }
    }

    applyClassroomHubFilters();
};

let currentClassroomHubDisplayMode = localStorage.getItem('classroom_hub_display_mode') || 'grid';

window.switchClassroomHubDisplayMode = function(mode) {
    currentClassroomHubDisplayMode = mode;
    localStorage.setItem('classroom_hub_display_mode', mode);

    const btnGrid = document.getElementById('btn-class-view-grid');
    const btnTable = document.getElementById('btn-class-view-table');
    const cardsContainer = document.getElementById('classroom-hub-cards-container');
    const tableContainer = document.getElementById('classroom-hub-table-container');

    if (btnGrid) btnGrid.classList.toggle('active', mode === 'grid');
    if (btnTable) btnTable.classList.toggle('active', mode === 'table');

    if (cardsContainer) cardsContainer.classList.toggle('d-none', mode !== 'grid');
    if (tableContainer) tableContainer.classList.toggle('d-none', mode !== 'table');

    applyClassroomHubFilters();
};

window.filterClassroomHubByStatus = function(status) {
    currentClassroomHubStatus = status;

    ['all', 'assigned', 'unassigned', 'vacant'].forEach(st => {
        const btn = document.getElementById(`class-filter-${st}`);
        if (btn) {
            const isActive = st === status;
            btn.classList.toggle('active', isActive);
            btn.classList.toggle('btn-white', isActive);
            btn.classList.toggle('shadow-xs', isActive);
            btn.classList.toggle('text-muted', !isActive);
        }
    });

    // Update active highlight on KPI cards
    document.querySelectorAll('.classroom-stats-grid .stat-luxury-card').forEach(card => card.classList.remove('active-kpi-filter'));
    if (status === 'all') document.querySelector('.stat-card-total')?.classList.add('active-kpi-filter');
    else if (status === 'vacant') document.querySelector('.stat-card-khmer')?.classList.add('active-kpi-filter');
    else if (status === 'assigned') document.querySelector('.stat-card-parttime')?.classList.add('active-kpi-filter');

    applyClassroomHubFilters();
};

window.filterClassroomHubWithStudents = function() {
    currentClassroomHubStatus = 'with_students';
    ['all', 'assigned', 'unassigned', 'vacant'].forEach(st => {
        const btn = document.getElementById(`class-filter-${st}`);
        if (btn) {
            btn.classList.remove('active', 'btn-white', 'shadow-xs');
            btn.classList.add('text-muted');
        }
    });
    document.querySelectorAll('.classroom-stats-grid .stat-luxury-card').forEach(card => card.classList.remove('active-kpi-filter'));
    document.querySelector('.stat-card-office')?.classList.add('active-kpi-filter');
    applyClassroomHubFilters();
};

window.focusClassroomHubTimeFilter = function() {
    const timeSelect = document.getElementById('class-hub-time-filter');
    if (timeSelect) {
        timeSelect.focus();
        timeSelect.classList.add('ring-2', 'ring-primary');
        setTimeout(() => timeSelect.classList.remove('ring-2', 'ring-primary'), 1500);
    }
};

window.clearClassroomSearch = function() {
    const input = document.getElementById('classroom-hub-search');
    if (input) {
        input.value = '';
        input.focus();
    }
    const clearBtn = document.getElementById('btn-clear-class-search');
    if (clearBtn) clearBtn.classList.add('d-none');
    applyClassroomHubFilters();
};

window.applyClassroomHubFilters = function() {
    const tbody = document.getElementById('classroom-hub-table-body');
    const cardsContainer = document.getElementById('classroom-hub-cards-container');
    if (!tbody && !cardsContainer) return;

    const searchInput = document.getElementById('classroom-hub-search');
    const searchVal = (searchInput?.value || '').trim().toLowerCase();
    const clearBtn = document.getElementById('btn-clear-class-search');
    if (clearBtn) clearBtn.classList.toggle('d-none', !searchVal);

    const levelVal = document.getElementById('class-hub-level-filter')?.value || '';
    const timeVal = document.getElementById('class-hub-time-filter')?.value || '';
    const teacherVal = document.getElementById('class-hub-teacher-filter')?.value || '';
    const sortVal = document.getElementById('class-hub-sort-select')?.value || 'name-asc';

    const fullList = cachedClassroomHubList || [];

    // Update Counter Badges on Status Filter Pills
    const countAll = fullList.length;
    const countAssigned = fullList.filter(c => c.teacher && c.teacher !== 'មិនទាន់មាន').length;
    const countUnassigned = fullList.filter(c => (!c.teacher || c.teacher === 'មិនទាន់មាន') && c.className !== '(បន្ទប់ទំនេរ)').length;
    const countVacant = fullList.filter(c => c.className === '(បន្ទប់ទំនេរ)' || c.studentCount === 0).length;

    const pillAll = document.getElementById('class-pill-all');
    const pillAssigned = document.getElementById('class-pill-assigned');
    const pillUnassigned = document.getElementById('class-pill-unassigned');
    const pillVacant = document.getElementById('class-pill-vacant');

    if (pillAll) pillAll.textContent = countAll;
    if (pillAssigned) pillAssigned.textContent = countAssigned;
    if (pillUnassigned) pillUnassigned.textContent = countUnassigned;
    if (pillVacant) pillVacant.textContent = countVacant;

    let list = [...fullList];

    // Status filter
    if (currentClassroomHubStatus === 'assigned') {
        list = list.filter(c => c.teacher && c.teacher !== 'មិនទាន់មាន');
    } else if (currentClassroomHubStatus === 'unassigned') {
        list = list.filter(c => (!c.teacher || c.teacher === 'មិនទាន់មាន') && c.className !== '(បន្ទប់ទំនេរ)');
    } else if (currentClassroomHubStatus === 'vacant') {
        list = list.filter(c => c.className === '(បន្ទប់ទំនេរ)' || c.studentCount === 0);
    } else if (currentClassroomHubStatus === 'with_students') {
        list = list.filter(c => c.studentCount > 0);
    }

    // Level filter
    if (levelVal) {
        list = list.filter(c => c.level === levelVal);
    }

    // Time filter
    if (timeVal) {
        list = list.filter(c => c.hours === timeVal);
    }

    // Teacher filter
    if (teacherVal) {
        if (teacherVal === '__unassigned__') {
            list = list.filter(c => (!c.teacher || c.teacher === 'មិនទាន់មាន' || c.teacher === '-') && c.className !== '(បន្ទប់ទំនេរ)');
        } else {
            list = list.filter(c => (c.teacher || '').trim().toLowerCase() === teacherVal.trim().toLowerCase());
        }
    }

    // Search filter
    if (searchVal) {
        list = list.filter(c =>
            (c.name || '').toLowerCase().includes(searchVal) ||
            (c.className || '').toLowerCase().includes(searchVal) ||
            (c.room || '').toLowerCase().includes(searchVal) ||
            (c.teacher || '').toLowerCase().includes(searchVal) ||
            (c.level || '').toLowerCase().includes(searchVal) ||
            (c.hours || '').toLowerCase().includes(searchVal)
        );
    }

    // Sorting Logic
    list.sort((a, b) => {
        if (sortVal === 'name-asc') {
            return (a.className || a.name || '').localeCompare(b.className || b.name || '', 'km');
        } else if (sortVal === 'room-asc') {
            return (a.room || '').localeCompare(b.room || '', undefined, { numeric: true });
        } else if (sortVal === 'students-desc') {
            return (b.studentCount || 0) - (a.studentCount || 0);
        } else if (sortVal === 'students-asc') {
            return (a.studentCount || 0) - (b.studentCount || 0);
        } else if (sortVal === 'teacher-asc') {
            return (a.teacher || '').localeCompare(b.teacher || '', 'km');
        }
        return 0;
    });

    // Empty State Message
    const emptyHtml = `
        <div class="col-12 py-5 text-center text-muted">
            <div class="py-4">
                <i class="fi fi-rr-search-alt fs-1 d-block mb-2 text-primary opacity-50"></i>
                <h6 class="fw-bold mb-1">រកមិនឃើញទិន្នន័យថ្នាក់រៀន ឬបន្ទប់សិក្សាត្រូវនឹងលក្ខខណ្ឌឡើយ</h6>
                <small class="text-muted">សូមសាកល្បងផ្លាស់ប្តូរលក្ខខណ្ឌតម្រង ឬបន្ថែមទិន្នន័យថ្មី</small>
            </div>
        </div>
    `;

    const emptyTableHtml = `
        <tr>
            <td colspan="7" class="text-center py-5 text-muted">
                <div class="py-4">
                    <i class="fi fi-rr-search-alt fs-1 d-block mb-2 text-primary opacity-50"></i>
                    <h6 class="fw-bold mb-1">រកមិនឃើញទិន្នន័យថ្នាក់រៀន ឬបន្ទប់សិក្សាត្រូវនឹងលក្ខខណ្ឌឡើយ</h6>
                    <small class="text-muted">សូមសាកល្បងផ្លាស់ប្តូរលក្ខខណ្ឌតម្រង ឬបន្ថែមទិន្នន័យថ្មី</small>
                </div>
            </td>
        </tr>
    `;

    // Render Cards View
    if (cardsContainer) {
        if (list.length === 0) {
            cardsContainer.innerHTML = emptyHtml;
        } else {
            cardsContainer.innerHTML = list.map(item => renderClassroomModernCard(item)).join('');
        }
    }

    // Render Table View
    if (tbody) {
        if (list.length === 0) {
            tbody.innerHTML = emptyTableHtml;
        } else {
            tbody.innerHTML = list.map(item => `
                <tr class="align-middle">
                    <td class="ps-4">
                        ${renderClassRoomCell(item)}
                    </td>
                    <td>
                        ${renderLevelBadge(item.level)}
                    </td>
                    <td>
                        ${renderStudyTypeBadge(item.studyType)}
                    </td>
                    <td>
                        ${renderTeacherCell(item)}
                    </td>
                    <td>
                        <span class="badge rounded-pill bg-light text-dark border px-2.5 py-1.5 fw-semibold">
                            <i class="fi fi-rr-clock me-1 text-warning"></i>${escapeStaffHtml(item.hours)}
                        </span>
                    </td>
                    <td>
                        <span class="badge rounded-pill ${item.studentCount > 0 ? 'bg-primary-subtle text-primary border border-primary-subtle' : 'bg-light text-muted border'} px-3 py-1.5 fw-bold">
                            <i class="fi fi-rr-users me-1"></i>${item.studentCount} នាក់
                        </span>
                        ${item.studentCount > 0 ? `
                            <div class="small text-muted mt-1 d-flex align-items-center gap-2" style="font-size: 0.73rem;">
                                <span><i class="fi fi-rr-mars text-primary"></i> ${item.maleCount}</span>
                                <span><i class="fi fi-rr-venus text-pink"></i> ${item.femaleCount}</span>
                            </div>
                        ` : ''}
                    </td>
                    <td class="text-end pe-4">
                        <div class="d-flex justify-content-end align-items-center gap-1.5">
                            <button type="button" class="btn btn-sm btn-action-soft text-primary px-3 py-1 fw-bold rounded-pill" onclick="viewClassStudents('${escapeStaffJs(item.className || item.name)}', '${escapeStaffJs(item.room || '-')}', '${escapeStaffJs(item.teacher || '-')}', '${escapeStaffJs(item.hours || '-')}', '${escapeStaffJs(item.level || '-')}', '${escapeStaffJs(item.teacherPhone || '')}')" title="មើលសិស្សក្នុងថ្នាក់នេះ">
                                <i class="fi fi-rr-eye me-1"></i>បញ្ជីសិស្ស
                            </button>
                            <button type="button" class="btn-row-action btn-row-action-edit" onclick="openClassroomAssignModal('${escapeStaffJs(item.className || item.name)}', '${escapeStaffJs(item.room || '')}', '${escapeStaffJs(item.teacher || '')}', '${escapeStaffJs(item.hours || '')}', '${escapeStaffJs(item.level || '')}', '${escapeStaffJs(item.studyType || '')}')" title="ចាត់តាំង &amp; កែសម្រួលព័ត៌មានថ្នាក់">
                                <i class="fi fi-rr-settings-sliders"></i>
                            </button>
                            ${item.className !== '(បន្ទប់ទំនេរ)' ? `
                            <button type="button" class="btn-row-action btn-row-action-delete" onclick="deleteClassFromHub('${escapeStaffJs(item.className || item.name)}')" title="លុបថ្នាក់នេះ">
                                <i class="fi fi-rr-trash"></i>
                            </button>` : ''}
                        </div>
                    </td>
                </tr>
            `).join('');
        }
    }
};

function renderClassroomModernCard(item) {
    const isVacant = item.className === '(បន្ទប់ទំនេរ)' || item.studentCount === 0;
    const hasTeacher = item.teacher && item.teacher !== 'មិនទាន់មាន' && item.teacher !== '-';
    
    let statusDotClass = 'active-assigned';
    let statusText = 'មានគ្រូទទួលបន្ទុក';
    if (isVacant) {
        statusDotClass = 'vacant-room';
        statusText = 'បន្ទប់ទំនេរ';
    } else if (!hasTeacher) {
        statusDotClass = 'needs-teacher';
        statusText = 'ខ្វះគ្រូទទួលបន្ទុក';
    }

    const maxCapacity = 35; // standard class capacity
    const capacityPct = Math.min(Math.round((item.studentCount / maxCapacity) * 100), 100);
    let fillClass = '';
    if (capacityPct >= 90) fillClass = 'capacity-full';
    else if (capacityPct >= 70) fillClass = 'capacity-high';

    const safeTitle = escapeStaffHtml(item.className || item.name || '-');
    const safeRoom = escapeStaffHtml(item.room && item.room !== '-' ? item.room : 'មិនទាន់កំណត់');
    const safeTeacher = escapeStaffHtml(hasTeacher ? item.teacher : 'មិនទាន់មាន');
    const safePhone = escapeStaffHtml(item.teacherPhone || '');
    const safeHours = escapeStaffHtml(item.hours && item.hours !== '-' ? item.hours : 'មិនទាន់កំណត់');
    const teacherClassesCount = hasTeacher ? (cachedClassroomHubList || []).filter(c => c.teacher && c.teacher === item.teacher).length : 0;

    return `
        <div class="classroom-modern-card animate__animated animate__fadeIn">
            <!-- Header Accent Bar -->
            <div class="classroom-card-header">
                <div class="d-flex align-items-center gap-2">
                    <span class="card-room-badge" title="បន្ទប់រៀន">
                        <span class="room-status-dot ${statusDotClass}"></span>
                        <i class="fi fi-rr-door-open me-1"></i>${safeRoom}
                    </span>
                    <span class="badge rounded-pill bg-light text-muted border" style="font-size: 0.72rem;">
                        ${statusText}
                    </span>
                </div>
                <div class="d-flex align-items-center gap-1">
                    <button type="button" class="btn btn-sm btn-icon-only text-muted rounded-circle" onclick="openClassroomAssignModal('${escapeStaffJs(item.className || item.name)}', '${escapeStaffJs(item.room || '')}', '${escapeStaffJs(item.teacher || '')}', '${escapeStaffJs(item.hours || '')}', '${escapeStaffJs(item.level || '')}', '${escapeStaffJs(item.studyType || '')}')" title="កែសម្រួលព័ត៌មានថ្នាក់">
                        <i class="fi fi-rr-settings-sliders"></i>
                    </button>
                    ${item.className !== '(បន្ទប់ទំនេរ)' ? `
                    <button type="button" class="btn btn-sm btn-icon-only text-danger rounded-circle" onclick="deleteClassFromHub('${escapeStaffJs(item.className || item.name)}')" title="លុបថ្នាក់នេះ">
                        <i class="fi fi-rr-trash"></i>
                    </button>` : ''}
                </div>
            </div>

            <!-- Body -->
            <div class="classroom-card-body">
                <div>
                    <h5 class="classroom-card-title">
                        <span class="staff-brand-chip" style="width: 28px; height: 28px; font-size: 0.85rem; background: linear-gradient(135deg, #4f46e5, #7c3aed); flex-shrink: 0;">
                            <i class="fi fi-rr-book-open-reader"></i>
                        </span>
                        <span>${safeTitle}</span>
                    </h5>
                    <div class="d-flex align-items-center gap-1.5 mt-2 flex-wrap">
                        ${renderLevelBadge(item.level)}
                        ${renderStudyTypeBadge(item.studyType)}
                    </div>
                </div>

                <!-- Teacher Snippet -->
                <div class="card-teacher-snippet">
                    <div class="d-flex align-items-center gap-2">
                        <div class="card-teacher-avatar" style="${!hasTeacher ? 'background: #94a3b8;' : ''}">
                            <i class="fi fi-rr-chalkboard-user"></i>
                        </div>
                        <div>
                            <div class="fw-bold text-dark small d-flex align-items-center gap-1.5 flex-wrap" style="line-height: 1.2;">
                                <span class="cursor-pointer text-primary-hover" onclick="${hasTeacher ? `openTeacherScheduleModal('${escapeStaffJs(item.teacher)}')` : ''}" title="${hasTeacher ? `ចុចមើលកាលវិភាគបង្រៀនទាំងអស់របស់ ${safeTeacher}` : ''}">${safeTeacher}</span>
                                ${teacherClassesCount > 1 ? `
                                    <span class="badge rounded-pill bg-primary-subtle text-primary border border-primary-subtle cursor-pointer" style="font-size: 0.68rem;" onclick="openTeacherScheduleModal('${escapeStaffJs(item.teacher)}')" title="គ្រូនេះបង្រៀន ${teacherClassesCount} ថ្នាក់">
                                        <i class="fi fi-rr-calendar-clock me-0.5"></i>${teacherClassesCount} ថ្នាក់
                                    </span>
                                ` : ''}
                            </div>
                            <small class="text-muted" style="font-size: 0.73rem;">គ្រូទទួលបន្ទុកថ្នាក់</small>
                        </div>
                    </div>
                    <div>
                        ${hasTeacher ? `
                            <div class="d-flex align-items-center gap-1">
                                ${safePhone ? `
                                    <a href="tel:${safePhone}" class="btn btn-sm btn-light border rounded-pill px-2.5 py-1 text-primary fw-bold" style="font-size: 0.75rem;" title="ចុចទូរស័ព្ទទៅគ្រូ">
                                        <i class="fi fi-rr-phone-call"></i>
                                    </a>
                                ` : ''}
                                <button type="button" class="btn btn-sm btn-light border rounded-pill px-2 py-1 text-success fw-bold" style="font-size: 0.75rem;" onclick="openTeacherScheduleModal('${escapeStaffJs(item.teacher)}')" title="មើលកាលវិភាគបង្រៀនទាំងអស់របស់ ${safeTeacher}">
                                    <i class="fi fi-rr-calendar-clock"></i>
                                </button>
                            </div>
                        ` : `
                            <button type="button" class="btn btn-sm btn-outline-warning rounded-pill px-2 py-0.5 fw-bold" style="font-size: 0.72rem;" onclick="openClassroomAssignModal('${escapeStaffJs(item.name)}', '${escapeStaffJs(item.room)}', '', '${escapeStaffJs(item.hours)}', '${escapeStaffJs(item.level)}', '${escapeStaffJs(item.studyType)}')">
                                + ចាត់តាំង
                            </button>
                        `}
                    </div>
                </div>

                <!-- Shift & Schedule -->
                <div class="d-flex align-items-center justify-content-between p-2 rounded-3 bg-light border small">
                    <span class="text-muted"><i class="fi fi-rr-clock me-1 text-warning"></i>ម៉ោងសិក្សា៖</span>
                    <strong class="text-dark">${safeHours}</strong>
                </div>

                <!-- Student Capacity & Gender Meter -->
                <div class="classroom-capacity-wrap">
                    <div class="d-flex justify-content-between align-items-center small">
                        <span class="fw-bold text-dark d-flex align-items-center gap-1">
                            <i class="fi fi-rr-users text-primary"></i> សិស្សក្នុងថ្នាក់
                        </span>
                        <span class="fw-extrabold text-primary">${item.studentCount} នាក់ (${capacityPct}%)</span>
                    </div>
                    <div class="capacity-meter-bar">
                        <div class="capacity-meter-fill ${fillClass}" style="width: ${capacityPct}%;"></div>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mt-1" style="font-size: 0.74rem;">
                        <span class="text-primary fw-semibold"><i class="fi fi-rr-mars me-0.5"></i>ប្រុស៖ ${item.maleCount}</span>
                        <span class="text-pink fw-semibold" style="color: #ec4899;"><i class="fi fi-rr-venus me-0.5"></i>ស្រី៖ ${item.femaleCount}</span>
                        <span class="text-muted">ចំណុះ៖ ${maxCapacity}នាក់</span>
                    </div>
                </div>
            </div>

            <!-- Footer Actions -->
            <div class="classroom-card-footer">
                <button type="button" class="btn btn-sm btn-primary rounded-pill px-3 py-1.5 flex-grow-1 fw-bold shadow-2xs d-flex align-items-center justify-content-center gap-1.5" onclick="viewClassStudents('${escapeStaffJs(item.className || item.name)}', '${escapeStaffJs(item.room || '-')}', '${escapeStaffJs(item.teacher || '-')}', '${escapeStaffJs(item.hours || '-')}', '${escapeStaffJs(item.level || '-')}', '${escapeStaffJs(item.teacherPhone || '')}')">
                    <i class="fi fi-rr-users"></i>
                    <span>បញ្ជីសិស្ស (${item.studentCount})</span>
                </button>
                <button type="button" class="btn btn-sm btn-light border rounded-pill px-3 py-1.5 fw-bold text-secondary" onclick="openClassroomAssignModal('${escapeStaffJs(item.className || item.name)}', '${escapeStaffJs(item.room || '')}', '${escapeStaffJs(item.teacher || '')}', '${escapeStaffJs(item.hours || '')}', '${escapeStaffJs(item.level || '')}', '${escapeStaffJs(item.studyType || '')}')" title="ចាត់តាំង &amp; កែសម្រួលព័ត៌មាន">
                    <i class="fi fi-rr-settings-sliders"></i>
                </button>
            </div>
        </div>
    `;
}

window.exportClassroomsHubCsv = function() {
    if (!cachedClassroomHubList || cachedClassroomHubList.length === 0) {
        Swal.fire({ icon: 'info', title: 'មិនមានទិន្នន័យ', text: 'មិនមានបញ្ជីថ្នាក់រៀនសម្រាប់នាំចេញឡើយ' });
        return;
    }

    const headers = ["ថ្នាក់រៀន", "បន្ទប់សិក្សា", "កម្រិតសិក្សា", "ប្រភេទវគ្គ", "គ្រូទទួលបន្ទុក", "លេខទូរស័ព្ទគ្រូ", "ម៉ោងសិក្សា", "សិស្សសរុប", "សិស្សប្រុស", "សិស្សស្រី"];
    const rows = cachedClassroomHubList.map(c => [
        `"${(c.className || c.name || '').replace(/"/g, '""')}"`,
        `"${(c.room || '').replace(/"/g, '""')}"`,
        `"${(c.level || '').replace(/"/g, '""')}"`,
        `"${(c.studyType || '').replace(/"/g, '""')}"`,
        `"${(c.teacher || '').replace(/"/g, '""')}"`,
        `"${(c.teacherPhone || '').replace(/"/g, '""')}"`,
        `"${(c.hours || '').replace(/"/g, '""')}"`,
        c.studentCount || 0,
        c.maleCount || 0,
        c.femaleCount || 0
    ].join(','));

    const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Classrooms_Hub_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// Interactive Table Column Sort for Classroom Hub
window.sortClassroomHubTable = function(colKey) {
    const sortSelect = document.getElementById('class-hub-sort-select');
    if (!sortSelect) return;
    if (colKey === 'name') {
        sortSelect.value = sortSelect.value === 'name-asc' ? 'room-asc' : 'name-asc';
    } else if (colKey === 'room') {
        sortSelect.value = 'room-asc';
    } else if (colKey === 'teacher') {
        sortSelect.value = 'teacher-asc';
    } else if (colKey === 'students') {
        sortSelect.value = sortSelect.value === 'students-desc' ? 'students-asc' : 'students-desc';
    }
    applyClassroomHubFilters();
};

// Delete Class from Hub with Cascading Cleanup
window.deleteClassFromHub = async function(className) {
    if (!className || className === '(បន្ទប់ទំនេរ)') return;

    const result = await Swal.fire({
        title: 'តើអ្នកប្រាកដទេ?',
        html: `តើអ្នកពិតជាចង់លុបថ្នាក់ <strong>"${escapeStaffHtml(className)}"</strong> នេះចេញពីប្រព័ន្ធមែនទេ?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: '<i class="fi fi-rr-trash me-1"></i> បាទ/ចាស លុបចេញ',
        cancelButtonText: 'បោះបង់',
        reverseButtons: true
    });

    if (!result.isConfirmed) return;

    Swal.fire({
        title: 'កំពុងលុប...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        const rootUpdates = {};

        // 1. Remove from settings/classDetails
        const classKey = encodeURIComponent(className).replace(/\./g, '_');
        rootUpdates[`settings/classDetails/${classKey}`] = null;

        // 2. Remove from settings/classes
        const classesSnap = await firebase.database().ref('settings/classes').once('value');
        const classesData = classesSnap.val();
        if (classesData) {
            Object.entries(classesData).forEach(([key, val]) => {
                const name = typeof val === 'string' ? val : (val?.name || '');
                if (name && name.trim().toLowerCase() === className.trim().toLowerCase()) {
                    rootUpdates[`settings/classes/${key}`] = null;
                }
            });
        }

        // 3. Unassign from staff homeroomClass if assigned
        Object.entries(staffData || {}).forEach(([id, s]) => {
            if (s && s.homeroomClass) {
                const classList = s.homeroomClass.split(/[,;|]/).map(x => x.trim()).filter(Boolean);
                if (classList.some(c => c.toLowerCase() === className.toLowerCase())) {
                    const remaining = classList.filter(c => c.toLowerCase() !== className.toLowerCase());
                    rootUpdates[`staff/${id}/homeroomClass`] = remaining.join(', ');
                }
            }
        });

        await firebase.database().ref().update(rootUpdates);

        // Update local caches
        masterClasses = (masterClasses || []).filter(c => {
            const name = typeof c === 'string' ? c : (c.name || '');
            return name.toLowerCase() !== className.toLowerCase();
        });
        if (masterClassDetails && masterClassDetails[classKey]) {
            delete masterClassDetails[classKey];
        }

        Swal.fire({
            icon: 'success',
            title: 'បានលុបដោយជោគជ័យ',
            text: `ថ្នាក់ "${className}" ត្រូវបានលុបចេញពីប្រព័ន្ធរួចរាល់`,
            timer: 1600,
            showConfirmButton: false
        });

        if (typeof renderClassroomHub === 'function') {
            await renderClassroomHub();
        }
    } catch (e) {
        console.error('Error deleting class:', e);
        Swal.fire({ icon: 'error', title: 'បរាជ័យក្នុងការលុប', text: e.message || 'សូមព្យាយាមម្តងទៀត' });
    }
};

// View Students in Class Modal Handlers
let currentRosterGenderFilter = 'all';
let currentRosterPaymentFilter = 'all';
let currentRosterSearchQuery = '';
let currentRosterViewMode = 'table';

window.viewClassStudents = async function(className, roomName = '-', teacherName = '-', shiftTime = '-', studyLevel = '-', teacherPhone = '') {
    await fetchAllStudentsOnce();

    currentViewedClassMeta = {
        className: className,
        roomName: roomName,
        teacherName: teacherName,
        shiftTime: shiftTime,
        studyLevel: studyLevel,
        teacherPhone: teacherPhone
    };

    const matchingStudents = (cachedStudentsList || []).filter(st => {
        const sc = (st.classroom || '').trim().toLowerCase();
        const sg = (st.grade || '').trim().toLowerCase();
        const sclass = (st.class || '').trim().toLowerCase();
        const scname = (st.className || '').trim().toLowerCase();
        const cn = (className || '').toLowerCase();
        const rm = (roomName || '').toLowerCase();
        return (
            (sc && (sc === cn || sc === rm)) ||
            (sg && (sg === cn || sg === rm)) ||
            (sclass && (sclass === cn || sclass === rm)) ||
            (scname && (scname === cn || scname === rm))
        );
    });

    currentModalClassStudents = matchingStudents;

    const totalCount = matchingStudents.length;
    const maleCount = matchingStudents.filter(s => {
        const g = (s.gender || '').trim().toLowerCase();
        return g === 'ប្រុស' || g === 'male' || g === 'm';
    }).length;
    const femaleCount = matchingStudents.filter(s => {
        const g = (s.gender || '').trim().toLowerCase();
        return g === 'ស្រី' || g === 'female' || g === 'f';
    }).length;
    const paidCount = matchingStudents.filter(s => {
        const pStatus = getPaymentStatus(s);
        return pStatus.status === 'paid';
    }).length;
    const unpaidCount = totalCount - paidCount;

    const malePct = totalCount > 0 ? Math.round((maleCount / totalCount) * 100) : 50;
    const femalePct = totalCount > 0 ? (100 - malePct) : 50;
    const paidPct = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;
    const unpaidPct = totalCount > 0 ? (100 - paidPct) : 0;

    // Header & Hero info
    if (document.getElementById('modal-class-name')) document.getElementById('modal-class-name').textContent = className;
    if (document.getElementById('modal-class-display-name')) document.getElementById('modal-class-display-name').textContent = className;
    if (document.getElementById('modal-class-header-badge')) document.getElementById('modal-class-header-badge').textContent = `${totalCount} នាក់`;
    if (document.getElementById('modal-class-level-badge')) document.getElementById('modal-class-level-badge').textContent = `កម្រិត៖ ${studyLevel && studyLevel !== '-' ? studyLevel : 'ទូទៅ'}`;
    if (document.getElementById('modal-class-teacher')) document.getElementById('modal-class-teacher').textContent = teacherName || '-';
    if (document.getElementById('modal-class-room')) document.getElementById('modal-class-room').textContent = roomName || '-';
    if (document.getElementById('modal-class-time')) document.getElementById('modal-class-time').textContent = shiftTime || '-';

    const phoneWrap = document.getElementById('modal-class-teacher-phone-wrap');
    const phoneEl = document.getElementById('modal-class-teacher-phone');
    if (phoneWrap && phoneEl) {
        if (teacherPhone && teacherPhone !== '-') {
            phoneEl.textContent = `📞 ${teacherPhone}`;
            phoneEl.href = `tel:${teacherPhone}`;
            phoneWrap.classList.remove('d-none');
        } else {
            phoneWrap.classList.add('d-none');
        }
    }

    // 4 KPI Chips
    if (document.getElementById('modal-stat-total')) document.getElementById('modal-stat-total').textContent = totalCount;
    if (document.getElementById('modal-stat-male')) document.getElementById('modal-stat-male').textContent = maleCount;
    if (document.getElementById('modal-stat-female')) document.getElementById('modal-stat-female').textContent = femaleCount;
    if (document.getElementById('modal-stat-paid')) document.getElementById('modal-stat-paid').textContent = paidCount;

    // Dual Progress Bars
    if (document.getElementById('modal-pct-male')) document.getElementById('modal-pct-male').textContent = `${totalCount > 0 ? malePct : 0}%`;
    if (document.getElementById('modal-pct-female')) document.getElementById('modal-pct-female').textContent = `${totalCount > 0 ? femalePct : 0}%`;
    const barMale = document.getElementById('modal-bar-male');
    const barFemale = document.getElementById('modal-bar-female');
    if (barMale) barMale.style.width = `${totalCount > 0 ? malePct : 0}%`;
    if (barFemale) barFemale.style.width = `${totalCount > 0 ? femalePct : 0}%`;

    if (document.getElementById('modal-pct-paid')) document.getElementById('modal-pct-paid').textContent = `${totalCount > 0 ? paidPct : 0}%`;
    if (document.getElementById('modal-pct-unpaid')) document.getElementById('modal-pct-unpaid').textContent = `${totalCount > 0 ? unpaidPct : 0}%`;
    const barPaid = document.getElementById('modal-bar-paid');
    const barUnpaid = document.getElementById('modal-bar-unpaid');
    if (barPaid) barPaid.style.width = `${totalCount > 0 ? paidPct : 0}%`;
    if (barUnpaid) barUnpaid.style.width = `${totalCount > 0 ? unpaidPct : 0}%`;

    // Filter Buttons Counters
    if (document.getElementById('roster-count-gender-all')) document.getElementById('roster-count-gender-all').textContent = totalCount;
    if (document.getElementById('roster-count-gender-male')) document.getElementById('roster-count-gender-male').textContent = maleCount;
    if (document.getElementById('roster-count-gender-female')) document.getElementById('roster-count-gender-female').textContent = femaleCount;
    if (document.getElementById('roster-count-pay-paid')) document.getElementById('roster-count-pay-paid').textContent = paidCount;
    if (document.getElementById('roster-count-pay-debt')) document.getElementById('roster-count-pay-debt').textContent = unpaidCount;

    // Reset Filters
    currentRosterGenderFilter = 'all';
    currentRosterPaymentFilter = 'all';
    currentRosterSearchQuery = '';
    const searchInput = document.getElementById('modal-class-student-search');
    if (searchInput) searchInput.value = '';

    ['all', 'male', 'female'].forEach(g => {
        const btn = document.getElementById(`roster-filter-gender-${g}`);
        if (btn) {
            btn.classList.toggle('active', g === 'all');
            btn.classList.toggle('btn-primary', g === 'all');
            btn.classList.toggle('btn-light', g !== 'all');
        }
    });

    ['all', 'paid', 'debt'].forEach(p => {
        const btn = document.getElementById(`roster-filter-pay-${p}`);
        if (btn) {
            btn.classList.toggle('active', p === 'all');
            btn.classList.toggle('btn-primary', p === 'all');
            btn.classList.toggle('btn-light', p !== 'all');
        }
    });

    // Render Content
    renderClassRosterDynamicContent();
    switchClassRosterViewMode(currentRosterViewMode || 'table');

    try {
        const modalEl = document.getElementById('classStudentsModal');
        if (modalEl) {
            const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
            modal.show();
        }
    } catch (e) {
        console.error('Error showing classStudentsModal:', e);
    }
};

window.exportClassRosterCsv = function() {
    if (!currentModalClassStudents || currentModalClassStudents.length === 0) {
        Swal.fire({ icon: 'info', title: 'គ្មានសិស្ស', text: 'ថ្នាក់នេះមិនទាន់មានទិន្នន័យសិស្សសម្រាប់នាំចេញឡើយ' });
        return;
    }

    const className = currentViewedClassMeta.className || 'Class';
    const headers = ["អត្តលេខ", "ឈ្មោះខ្មែរ", "ឈ្មោះឡាតាំង/ចិន", "ភេទ", "ទូរស័ព្ទ", "ថ្នាក់", "បន្ទប់", "គ្រូ", "ស្ថានភាពបង់ប្រាក់"];
    const rows = currentModalClassStudents.map(s => [
        `"${s.displayId || s.id || ''}"`,
        `"${`${s.lastName || ''} ${s.firstName || ''}`.trim()}"`,
        `"${s.nameChinese || s.nameLatin || ''}"`,
        `"${s.gender || ''}"`,
        `"${s.phone || s.telegramPhone || ''}"`,
        `"${s.grade || s.classroom || ''}"`,
        `"${s.classroom || ''}"`,
        `"${s.teacherName || s.homeroomTeacher || ''}"`,
        `"${(getPaymentStatus(s) || {}).text || ''}"`
    ].join(','));

    const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Students_${className.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

window.printClassRoster = function() {
    if (!currentModalClassStudents || currentModalClassStudents.length === 0) {
        Swal.fire({ icon: 'info', title: 'គ្មានសិស្ស', text: 'ថ្នាក់នេះមិនទាន់មានទិន្នន័យសិស្សសម្រាប់បោះពុម្ពឡើយ' });
        return;
    }

    const meta = currentViewedClassMeta || {};
    const className = meta.className || '-';
    const room = meta.roomName || '-';
    const teacher = meta.teacherName || '-';
    const shift = meta.shiftTime || '-';
    const level = meta.studyLevel || '-';
    const total = currentModalClassStudents.length;
    const male = currentModalClassStudents.filter(s => {
        const g = (s.gender || '').trim().toLowerCase();
        return g === 'ប្រុស' || g === 'male' || g === 'm';
    }).length;
    const female = total - male;
    const paid = currentModalClassStudents.filter(s => getPaymentStatus(s).status === 'paid').length;

    let existingPrintArea = document.getElementById('print-roster-area');
    if (existingPrintArea) existingPrintArea.remove();

    const printArea = document.createElement('div');
    printArea.id = 'print-roster-area';

    const tableRows = currentModalClassStudents.map((st, idx) => `
        <tr style="text-align: center;">
            <td style="padding: 7px 4px; border: 1px solid #333;">${idx + 1}</td>
            <td style="padding: 7px 4px; font-weight: bold; border: 1px solid #333;">${escapeStaffHtml(st.displayId || st.id || '-')}</td>
            <td style="padding: 7px 4px; text-align: left; font-weight: bold; border: 1px solid #333;">${escapeStaffHtml(`${st.lastName || ''} ${st.firstName || ''}`.trim() || '-')}</td>
            <td style="padding: 7px 4px; text-align: left; border: 1px solid #333;">${escapeStaffHtml(st.chineseName || st.nameChinese || st.nameLatin || '-')}</td>
            <td style="padding: 7px 4px; border: 1px solid #333;">${escapeStaffHtml(st.gender || '-')}</td>
            <td style="padding: 7px 4px; border: 1px solid #333;">${escapeStaffHtml(st.phone || st.telegramPhone || '-')}</td>
            <td style="padding: 7px 4px; border: 1px solid #333; font-weight: bold;">${escapeStaffHtml((getPaymentStatus(st) || {}).text || 'មិនទាន់បង់')}</td>
            <td style="padding: 7px 4px; border: 1px solid #333; width: 110px;"></td>
        </tr>
    `).join('');

    printArea.innerHTML = `
        <div style="font-family: 'Kantumruy Pro', 'Hanuman', 'Siemreap', sans-serif; padding: 25px; color: #000; background: #fff;">
            <div style="text-align: center; margin-bottom: 25px;">
                <h2 style="margin: 0 0 5px 0; font-size: 1.4rem; font-weight: bold;">សាលារៀន ទៀនស៊ីន (TIANXIN SCHOOL)</h2>
                <h3 style="margin: 0 0 6px 0; font-size: 1.2rem; color: #1e3a8a; font-weight: bold;">បញ្ជីវត្តមាន និងឈ្មោះសិស្សក្នុងថ្នាក់</h3>
                <p style="margin: 0; font-size: 0.88rem; color: #555;">កាលបរិច្ឆេទបោះពុម្ព៖ ${new Date().toLocaleDateString('km-KH')} ${new Date().toLocaleTimeString('km-KH')}</p>
            </div>

            <div style="display: flex; justify-content: space-between; border: 1px solid #333; padding: 12px 16px; margin-bottom: 20px; border-radius: 8px; font-size: 0.92rem; background: #f8fafc; flex-wrap: wrap; gap: 10px;">
                <div><strong>ថ្នាក់រៀន៖</strong> ${escapeStaffHtml(className)}</div>
                <div><strong>បន្ទប់សិក្សា៖</strong> ${escapeStaffHtml(room)}</div>
                <div><strong>កម្រិតសិក្សា៖</strong> ${escapeStaffHtml(level)}</div>
                <div><strong>ម៉ោងសិក្សា៖</strong> ${escapeStaffHtml(shift)}</div>
                <div><strong>គ្រូទទួលបន្ទុក៖</strong> ${escapeStaffHtml(teacher)}</div>
                <div><strong>សរុប៖</strong> ${total} នាក់ (ប្រុស: ${male}, ស្រី: ${female} | បានបង់: ${paid})</div>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 0.88rem; margin-bottom: 30px;" border="1">
                <thead>
                    <tr style="background: #e2e8f0; text-align: center;">
                        <th style="padding: 8px 4px; width: 45px; border: 1px solid #333;">ល.រ</th>
                        <th style="padding: 8px 4px; width: 85px; border: 1px solid #333;">អត្តលេខ</th>
                        <th style="padding: 8px 4px; border: 1px solid #333; text-align: left;">ឈ្មោះខ្មែរ</th>
                        <th style="padding: 8px 4px; border: 1px solid #333; text-align: left;">ឈ្មោះឡាតាំង/ចិន</th>
                        <th style="padding: 8px 4px; width: 55px; border: 1px solid #333;">ភេទ</th>
                        <th style="padding: 8px 4px; width: 110px; border: 1px solid #333;">ទូរស័ព្ទ</th>
                        <th style="padding: 8px 4px; width: 100px; border: 1px solid #333;">ស្ថានភាពបង់ប្រាក់</th>
                        <th style="padding: 8px 4px; width: 110px; border: 1px solid #333;">វត្តមាន / ហត្ថលេខា</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>

            <div style="display: flex; justify-content: space-between; margin-top: 40px; font-size: 0.95rem;">
                <div style="text-align: center; width: 240px;">
                    <p style="margin-bottom: 60px;">បានឃើញ និងឯកភាព<br><strong>នាយកសាលា</strong></p>
                    <p>.......................................</p>
                </div>
                <div style="text-align: center; width: 240px;">
                    <p style="margin-bottom: 60px;">ថ្ងៃទី....... ខែ....... ឆ្នាំ២០...<br><strong>ហត្ថលេខាគ្រូទទួលបន្ទុក</strong></p>
                    <p>.......................................</p>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(printArea);
    window.print();
    setTimeout(() => {
        if (printArea.parentNode) printArea.parentNode.removeChild(printArea);
    }, 1500);
};

// --------------------------------------------------------------------------
// Quick Classroom & Class Assign/Edit Logic
// --------------------------------------------------------------------------
window.openClassroomAssignModal = function(className = '', room = '', teacher = '', time = '', level = '', type = '') {
    const modalEl = document.getElementById('quickClassroomAssignModal');
    if (!modalEl) return;

    // If className is provided, but other fields are empty, lookup in masterClassDetails
    if (className && className !== '(បន្ទប់ទំនេរ)') {
        const classKey = encodeURIComponent(className).replace(/\./g, '_');
        const savedDetails = (masterClassDetails && masterClassDetails[classKey]) || {};
        if (!room && savedDetails.room) room = savedDetails.room;
        if (!teacher && savedDetails.teacher) teacher = savedDetails.teacher;
        if (!time && savedDetails.hours) time = savedDetails.hours;
        if (!level && savedDetails.level) level = savedDetails.level;
        if (!type && savedDetails.studyType) type = savedDetails.studyType;
    }

    document.getElementById('quick-assign-orig-class').value = className || '';
    document.getElementById('quick-assign-orig-room').value = room || '';

    const modalTitleEl = modalEl.querySelector('.modal-title span');
    if (modalTitleEl) {
        modalTitleEl.textContent = (!className || className === '(បន្ទប់ទំនេរ)')
            ? 'បង្កើត & ចាត់តាំងថ្នាក់រៀនថ្មី'
            : `ចាត់តាំង & កែសម្រួលព័ត៌មានថ្នាក់ (${className})`;
    }

    const nameInput = document.getElementById('quick-assign-class-name');
    if (nameInput) nameInput.value = (className === '(បន្ទប់ទំនេរ)') ? '' : className;

    // Populate Room Select
    const roomSelect = document.getElementById('quick-assign-room-select');
    if (roomSelect) {
        roomSelect.innerHTML = '<option value="">-- ជ្រើសរើសបន្ទប់ --</option>';
        (masterClassrooms || []).forEach(r => {
            const opt = document.createElement('option');
            opt.value = r;
            opt.textContent = `🚪 ${r}`;
            roomSelect.appendChild(opt);
        });
        roomSelect.value = (room && room !== '-') ? room : '';
    }

    // Populate Teacher Select
    const teacherSelect = document.getElementById('quick-assign-teacher-select');
    if (teacherSelect) {
        teacherSelect.innerHTML = '<option value="">-- ជ្រើសរើសគ្រូទទួលបន្ទុក --</option>';
        Object.entries(staffData || {}).forEach(([id, s]) => {
            const tName = s.nameKhmer || '';
            if (tName) {
                const opt = document.createElement('option');
                opt.value = tName;
                opt.textContent = `👨‍🏫 ${tName} (${s.position || 'គ្រូបង្រៀន'})`;
                teacherSelect.appendChild(opt);
            }
        });
        teacherSelect.value = (teacher && teacher !== 'មិនទាន់មាន' && teacher !== '-') ? teacher : '';
    }

    // Populate Time Select
    const timeSelect = document.getElementById('quick-assign-time-select');
    if (timeSelect) {
        timeSelect.innerHTML = '<option value="">-- ជ្រើសរើសម៉ោងសិក្សា --</option>';
        (masterStudyTimes || []).forEach(t => {
            const timeStr = typeof t === 'object' && t !== null ? (t.time || '') : t;
            if (!timeStr) return;
            const opt = document.createElement('option');
            opt.value = timeStr;
            opt.textContent = `⏰ ${timeStr}`;
            timeSelect.appendChild(opt);
        });
        timeSelect.value = (time && time !== '-') ? time : '';
    }

    // Populate Level Select
    const levelSelect = document.getElementById('quick-assign-level-select');
    if (levelSelect) {
        levelSelect.innerHTML = '<option value="">-- ជ្រើសរើសកម្រិតសិក្សា --</option>';
        (masterLevels || []).forEach(l => {
            const opt = document.createElement('option');
            opt.value = l;
            opt.textContent = `🎯 ${l}`;
            levelSelect.appendChild(opt);
        });
        levelSelect.value = (level && level !== '-') ? level : '';
    }

    // Populate Type Select
    const typeSelect = document.getElementById('quick-assign-type-select');
    if (typeSelect) {
        const types = [
            { key: 'chinese-fulltime', label: 'ថ្នាក់ភាសាចិនពេញម៉ោង' },
            { key: 'chinese-parttime', label: 'ថ្នាក់ភាសាចិនក្រៅម៉ោង' },
            { key: 'three-languages', label: 'ថ្នាក់ចំណះដឹងទូទៅ' },
            { key: 'one-language', label: 'ថ្នាក់ភាសា (១ភាសា)' },
            { key: 'two-languages', label: 'ថ្នាក់ភាសា (២ភាសា)' }
        ];
        (masterStudyTypes || []).forEach(mst => {
            if (!types.some(t => t.key === mst)) {
                types.push({ key: mst, label: mst });
            }
        });
        typeSelect.innerHTML = '<option value="">-- ជ្រើសរើសប្រភេទវគ្គ --</option>';
        types.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.key;
            opt.textContent = `📚 ${t.label}`;
            typeSelect.appendChild(opt);
        });
        typeSelect.value = (type && type !== '-') ? type : '';
    }

    // Attach dynamic live conflict checkers
    ['quick-assign-teacher-select', 'quick-assign-room-select', 'quick-assign-time-select'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.onchange = checkQuickAssignConflict;
    });
    const classNameEl = document.getElementById('quick-assign-class-name');
    if (classNameEl) classNameEl.oninput = checkQuickAssignConflict;

    checkQuickAssignConflict();

    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
};

window.checkQuickAssignConflict = function() {
    const origClass = document.getElementById('quick-assign-orig-class')?.value || '';
    const currentClassName = (document.getElementById('quick-assign-class-name')?.value || '').trim();
    const teacher = document.getElementById('quick-assign-teacher-select')?.value || '';
    const room = document.getElementById('quick-assign-room-select')?.value || '';
    const time = document.getElementById('quick-assign-time-select')?.value || '';

    const alertBox = document.getElementById('quick-assign-conflict-alert');
    const msgBox = document.getElementById('quick-assign-conflict-msg');
    if (!alertBox || !msgBox) return { hasConflict: false, messages: [] };

    alertBox.classList.add('d-none');
    msgBox.innerHTML = '';

    if (!time || time === '-') return { hasConflict: false, messages: [] };

    const conflicts = [];

    // 1. Check teacher conflict (same teacher, same hours, different class)
    if (teacher && teacher !== 'មិនទាន់មាន' && teacher !== '-') {
        const teacherConflict = (cachedClassroomHubList || []).find(c => {
            const isDifferent = c.className !== currentClassName && (!origClass || c.className !== origClass);
            return isDifferent && c.teacher && c.teacher.trim().toLowerCase() === teacher.trim().toLowerCase() && c.hours === time && c.className !== '(បន្ទប់ទំនេរ)';
        });
        if (teacherConflict) {
            conflicts.push(`• <strong>គ្រូជាន់ម៉ោងបង្រៀន៖</strong> លោកគ្រូ/អ្នកគ្រូ <strong>${escapeStaffHtml(teacher)}</strong> កំពុងមានម៉ោងបង្រៀននៅថ្នាក់ <strong>"${escapeStaffHtml(teacherConflict.className)}"</strong> (បន្ទប់ ${escapeStaffHtml(teacherConflict.room || '-')}) ក្នុងម៉ោង <strong>${escapeStaffHtml(time)}</strong> នេះរួចហើយ!`);
        }
    }

    // 2. Check room conflict (same room, same hours, different class)
    if (room && room !== '-') {
        const roomConflict = (cachedClassroomHubList || []).find(c => {
            const isDifferent = c.className !== currentClassName && (!origClass || c.className !== origClass);
            return isDifferent && c.room && c.room.trim().toLowerCase() === room.trim().toLowerCase() && c.hours === time && c.className !== '(បន្ទប់ទំនេរ)';
        });
        if (roomConflict) {
            conflicts.push(`• <strong>បន្ទប់រៀនជាន់គ្នា៖</strong> បន្ទប់សិក្សា <strong>${escapeStaffHtml(room)}</strong> ត្រូវបានប្រើប្រាស់ដោយថ្នាក់ <strong>"${escapeStaffHtml(roomConflict.className)}"</strong> (គ្រូ ${escapeStaffHtml(roomConflict.teacher || '-')}) ក្នុងម៉ោង <strong>${escapeStaffHtml(time)}</strong> នេះរួចហើយ!`);
        }
    }

    if (conflicts.length > 0) {
        msgBox.innerHTML = conflicts.join('<br>');
        alertBox.classList.remove('d-none');
        return { hasConflict: true, messages: conflicts };
    }

    return { hasConflict: false, messages: [] };
};

window.saveQuickClassAssign = async function(event) {
    if (event) event.preventDefault();

    const origClass = document.getElementById('quick-assign-orig-class').value;
    const origRoom = document.getElementById('quick-assign-orig-room').value;
    const newClass = document.getElementById('quick-assign-class-name').value.trim();
    const newRoom = document.getElementById('quick-assign-room-select').value;
    const newTeacher = document.getElementById('quick-assign-teacher-select').value;
    const newTime = document.getElementById('quick-assign-time-select').value;
    const newLevel = document.getElementById('quick-assign-level-select').value;
    const newType = document.getElementById('quick-assign-type-select').value;

    if (!newClass) {
        Swal.fire({ icon: 'warning', title: 'សូមបញ្ចូលឈ្មោះថ្នាក់រៀន!' });
        return;
    }

    // Live conflict validation before proceed
    const conflictResult = checkQuickAssignConflict();
    if (conflictResult.hasConflict) {
        const confirmResult = await Swal.fire({
            title: '⚠️ ពិនិត្យឃើញការជាន់កាលវិភាគ!',
            html: `
                <div class="text-start small p-3 bg-light rounded-3 border">
                    ${conflictResult.messages.join('<br><br>')}
                </div>
                <p class="mt-3 mb-0 text-danger fw-bold">តើអ្នកពិតជាចង់បន្តរក្សាទុកដោយអនុញ្ញាតឱ្យជាន់គ្នាមែនទេ?</p>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'បាទ/ចាស បន្តរក្សាទុក',
            cancelButtonText: 'ត្រឡប់ទៅកែសម្រួលវិញ',
            reverseButtons: true
        });
        if (!confirmResult.isConfirmed) return;
    }

    Swal.fire({
        title: 'កំពុងរក្សាទុក...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        const rootUpdates = {};

        // 1. Persist class academic details to settings/classDetails
        const classKey = encodeURIComponent(newClass).replace(/\./g, '_');
        rootUpdates[`settings/classDetails/${classKey}`] = {
            className: newClass,
            room: newRoom || '',
            teacher: newTeacher || '',
            hours: newTime || '',
            level: newLevel || '',
            studyType: newType || '',
            updatedAt: new Date().toISOString()
        };

        if (origClass && origClass !== newClass && origClass !== '(បន្ទប់ទំនេរ)') {
            const oldKey = encodeURIComponent(origClass).replace(/\./g, '_');
            rootUpdates[`settings/classDetails/${oldKey}`] = null;
        }

        // 2. Manage teacher assignments in staffData
        Object.entries(staffData || {}).forEach(([id, s]) => {
            if (!s || !s.homeroomClass) return;
            const tName = (s.nameKhmer || '').trim().toLowerCase();
            const classes = s.homeroomClass.split(/[,;|]/).map(x => x.trim()).filter(Boolean);
            const classMatches = (c) => c.toLowerCase() === newClass.toLowerCase() || (origClass && c.toLowerCase() === origClass.toLowerCase());

            if (classes.some(classMatches)) {
                if (!newTeacher || tName !== newTeacher.trim().toLowerCase()) {
                    const remaining = classes.filter(c => !classMatches(c));
                    rootUpdates[`staff/${id}/homeroomClass`] = remaining.join(', ');
                }
            }
        });

        if (newTeacher) {
            const staffEntry = Object.entries(staffData || {}).find(([id, s]) => (s.nameKhmer || '').trim().toLowerCase() === newTeacher.trim().toLowerCase());
            if (staffEntry) {
                const staffId = staffEntry[0];
                const s = staffEntry[1];
                const currentClasses = (s.homeroomClass || '').split(/[,;|]/).map(x => x.trim()).filter(Boolean);
                const updatedClasses = currentClasses.filter(c => !origClass || c.toLowerCase() !== origClass.toLowerCase());
                if (!updatedClasses.some(c => c.toLowerCase() === newClass.toLowerCase())) {
                    updatedClasses.push(newClass);
                }
                rootUpdates[`staff/${staffId}/homeroomClass`] = updatedClasses.join(', ');

                // Collect all unique rooms & teaching hours for this teacher across all their classes
                const teacherRooms = new Set();
                const teacherTimes = new Set();
                updatedClasses.forEach(cName => {
                    if (cName.toLowerCase() === newClass.toLowerCase()) {
                        if (newRoom && newRoom !== '-') teacherRooms.add(newRoom);
                        if (newTime && newTime !== '-') teacherTimes.add(newTime);
                    } else {
                        const cKey = encodeURIComponent(cName).replace(/\./g, '_');
                        const details = masterClassDetails && masterClassDetails[cKey];
                        if (details?.room && details.room !== '-') teacherRooms.add(details.room);
                        if (details?.hours && details.hours !== '-') teacherTimes.add(details.hours);
                    }
                });

                rootUpdates[`staff/${staffId}/classroom`] = Array.from(teacherRooms).join(', ') || newRoom || '';
                rootUpdates[`staff/${staffId}/teachingHours`] = Array.from(teacherTimes).join(', ') || newTime || '';
                if (newLevel) rootUpdates[`staff/${staffId}/level`] = newLevel;
                if (newType) rootUpdates[`staff/${staffId}/studyType`] = newType;
            }
        }

        // 3. Ensure master class, room, and time exist in settings
        if (newClass && (!masterClasses || !masterClasses.includes(newClass))) {
            await firebase.database().ref('settings/classes').push(newClass);
            if (!masterClasses.includes(newClass)) masterClasses.push(newClass);
        }
        if (newRoom && (!masterClassrooms || !masterClassrooms.includes(newRoom))) {
            await firebase.database().ref('settings/classrooms').push(newRoom);
            if (!masterClassrooms.includes(newRoom)) masterClassrooms.push(newRoom);
        }
        if (newTime) {
            const existsTime = (masterStudyTimes || []).some(t => {
                const timeStr = typeof t === 'object' && t !== null ? (t.time || '') : t;
                return timeStr === newTime;
            });
            if (!existsTime) {
                await firebase.database().ref('settings/studyTimes').push(newTime);
            }
        }

        // Perform updates
        if (Object.keys(rootUpdates).length > 0) {
            await firebase.database().ref().update(rootUpdates);
        }

        // Update local masterClassDetails cache
        if (!masterClassDetails) masterClassDetails = {};
        masterClassDetails[classKey] = {
            className: newClass,
            room: newRoom || '',
            teacher: newTeacher || '',
            hours: newTime || '',
            level: newLevel || '',
            studyType: newType || ''
        };
        if (origClass && origClass !== newClass && origClass !== '(បន្ទប់ទំនេរ)') {
            const oldKey = encodeURIComponent(origClass).replace(/\./g, '_');
            delete masterClassDetails[oldKey];
        }

        // Log Activity
        if (typeof window.logStaffActivity === 'function') {
            window.logStaffActivity('config', newClass, `បានកែសម្រួល & ចាត់តាំងថ្នាក់ "${newClass}" (បន្ទប់៖ ${newRoom || '-'}, គ្រូ៖ ${newTeacher || '-'}, ម៉ោង៖ ${newTime || '-'})`);
        }

        // Close modal
        const modalEl = document.getElementById('quickClassroomAssignModal');
        if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }

        await Swal.fire({
            icon: 'success',
            title: 'ជោគជ័យ!',
            html: `ព័ត៌មានថ្នាក់ <strong>"${newClass}"</strong> ត្រូវបានរក្សាទុកដោយជោគជ័យ!`,
            confirmButtonColor: '#8a0e5b'
        });

        // Re-render classrooms hub
        if (typeof renderClassroomHub === 'function') {
            await renderClassroomHub();
        }

    } catch (err) {
        console.error('Error saving quick class assign:', err);
        Swal.fire({
            icon: 'error',
            title: 'មានបញ្ហា!',
            text: err.message || 'មិនអាចរក្សាទុកទិន្នន័យបានឡើយ',
            confirmButtonColor: '#dc3545'
        });
    }
};

let currentModalTeacherSchedule = null;
let currentTeacherScheduleView = 'timeline';
let currentTeacherScheduleFilterQuery = '';
let currentTeacherScheduleShiftFilter = 'all';

function getShiftPeriodCategory(hoursStr) {
    if (!hoursStr || hoursStr === '-') return 'morning';
    const s = hoursStr.toLowerCase();
    if (s.includes('ព្រឹក') || s.includes('morning') || s.includes('am')) return 'morning';
    if (s.includes('រសៀល') || s.includes('afternoon')) return 'afternoon';
    if (s.includes('យប់') || s.includes('ល្ងាច') || s.includes('night') || s.includes('evening') || s.includes('pm')) return 'evening';
    
    const match = hoursStr.match(/(\d{1,2})[:.]?(\d{2})?/);
    if (match) {
        const hr = parseInt(match[1], 10);
        if (hr < 12 && hr >= 6) return 'morning';
        if (hr >= 12 && hr < 17) return 'afternoon';
        if (hr >= 17 || hr < 6) return 'evening';
    }
    return 'morning';
}

function renderShiftPeriodBadge(period) {
    if (period === 'morning') {
        return `<span class="badge rounded-pill bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-0.5 fw-semibold" style="font-size: 0.72rem;"><i class="fi fi-rr-sun me-1"></i>ព្រឹក</span>`;
    } else if (period === 'afternoon') {
        return `<span class="badge rounded-pill bg-info-subtle text-info-emphasis border border-info-subtle px-2 py-0.5 fw-semibold" style="font-size: 0.72rem;"><i class="fi fi-rr-cloud-sun me-1"></i>រសៀល</span>`;
    } else if (period === 'evening') {
        return `<span class="badge rounded-pill bg-purple-subtle text-purple-emphasis border border-purple-subtle px-2 py-0.5 fw-semibold" style="font-size: 0.72rem;"><i class="fi fi-rr-moon me-1"></i>ល្ងាច/យប់</span>`;
    }
    return '';
}

window.switchTeacherScheduleViewMode = function(mode) {
    currentTeacherScheduleView = mode || 'timeline';
    const btnTimeline = document.getElementById('btn-sched-view-timeline');
    const btnTable = document.getElementById('btn-sched-view-table');
    const timelineContainer = document.getElementById('teacher-schedule-timeline-container');
    const tableContainer = document.getElementById('teacher-schedule-table-container');

    if (btnTimeline) btnTimeline.classList.toggle('active', currentTeacherScheduleView === 'timeline');
    if (btnTable) btnTable.classList.toggle('active', currentTeacherScheduleView === 'table');

    if (timelineContainer) timelineContainer.classList.toggle('d-none', currentTeacherScheduleView !== 'timeline');
    if (tableContainer) tableContainer.classList.toggle('d-none', currentTeacherScheduleView !== 'table');
};

window.exportTeacherScheduleCsv = function() {
    if (!currentModalTeacherSchedule || !currentModalTeacherSchedule.teacherClasses || currentModalTeacherSchedule.teacherClasses.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'មិនមានទិន្នន័យ',
            text: 'មិនមានបញ្ជីកាលវិភាគបង្រៀនសម្រាប់នាំចេញឡើយ',
            confirmButtonColor: '#8a0e5b'
        });
        return;
    }

    const data = currentModalTeacherSchedule;
    const teacherName = data.teacherName || 'Teacher';
    const headers = ["ល.រ", "ម៉ោងសិក្សា", "ឈ្មោះថ្នាក់រៀន", "បន្ទប់សិក្សា", "កម្រិតសិក្សា", "ប្រភេទវគ្គ", "សិស្សសរុប", "ប្រុស", "ស្រី", "គ្រូទទួលបន្ទុក"];
    const rows = data.teacherClasses.map((item, idx) => [
        idx + 1,
        `"${(item.hours && item.hours !== '-' ? item.hours : 'មិនទាន់កំណត់').replace(/"/g, '""')}"`,
        `"${(item.className || item.name || '').replace(/"/g, '""')}"`,
        `"${(item.room && item.room !== '-' ? item.room : 'មិនទាន់កំណត់').replace(/"/g, '""')}"`,
        `"${(item.level && item.level !== '-' ? item.level : 'មិនទាន់កំណត់').replace(/"/g, '""')}"`,
        `"${(item.studyType && item.studyType !== '-' ? item.studyType : 'មិនទាន់កំណត់').replace(/"/g, '""')}"`,
        item.studentCount || 0,
        item.maleCount || 0,
        item.femaleCount || 0,
        `"${teacherName.replace(/"/g, '""')}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeTeacherName = teacherName.replace(/[\\/:*?"<>| ]+/g, '_');
    link.download = `កាលវិភាគ_${safeTeacherName}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

window.filterTeacherScheduleList = function(query) {
    currentTeacherScheduleFilterQuery = (query || '').trim().toLowerCase();
    renderTeacherScheduleDynamicContent();
};

window.filterTeacherScheduleByShift = function(shift) {
    currentTeacherScheduleShiftFilter = shift || 'all';
    ['all', 'morning', 'afternoon', 'evening'].forEach(s => {
        const btn = document.getElementById(`sched-filter-${s}`);
        if (btn) {
            const isActive = s === currentTeacherScheduleShiftFilter;
            btn.classList.toggle('active', isActive);
            btn.classList.toggle('btn-primary', isActive);
            btn.classList.toggle('btn-light', !isActive);
        }
    });
    renderTeacherScheduleDynamicContent();
};

window.assignNewClassForCurrentTeacher = function() {
    if (!currentModalTeacherSchedule || !currentModalTeacherSchedule.teacherName) return;
    const teacherName = currentModalTeacherSchedule.teacherName;
    const modalEl = document.getElementById('teacherScheduleModal');
    if (modalEl) {
        bootstrap.Modal.getInstance(modalEl)?.hide();
    }
    if (typeof openClassroomAssignModal === 'function') {
        openClassroomAssignModal('', '', teacherName, '', '', '');
    }
};

window.resolveFirstConflictClass = function() {
    if (!currentModalTeacherSchedule || !currentModalTeacherSchedule.conflictClasses || currentModalTeacherSchedule.conflictClasses.length === 0) return;
    const firstConflict = currentModalTeacherSchedule.conflictClasses[0];
    const modalEl = document.getElementById('teacherScheduleModal');
    if (modalEl) {
        bootstrap.Modal.getInstance(modalEl)?.hide();
    }
    if (typeof openClassroomAssignModal === 'function') {
        openClassroomAssignModal(
            firstConflict.className || firstConflict.name,
            firstConflict.room || '',
            firstConflict.teacher || '',
            firstConflict.hours || '',
            firstConflict.level || '',
            firstConflict.studyType || ''
        );
    }
};

function renderTeacherScheduleDynamicContent() {
    if (!currentModalTeacherSchedule) return;

    const allClasses = currentModalTeacherSchedule.teacherClasses || [];
    const timeCount = currentModalTeacherSchedule.timeCount || {};
    const query = currentTeacherScheduleFilterQuery;
    const shift = currentTeacherScheduleShiftFilter;

    // Apply filters
    const filteredClasses = allClasses.filter(item => {
        const nameMatch = (item.className || item.name || '').toLowerCase().includes(query) ||
                          (item.room || '').toLowerCase().includes(query) ||
                          (item.hours || '').toLowerCase().includes(query);
        if (!nameMatch) return false;

        if (shift !== 'all') {
            const period = getShiftPeriodCategory(item.hours);
            if (period !== shift) return false;
        }
        return true;
    });

    // 1. Render Timeline Container
    const timelineContainer = document.getElementById('teacher-schedule-timeline-container');
    if (timelineContainer) {
        if (allClasses.length === 0) {
            timelineContainer.innerHTML = `
                <div class="text-center py-5 text-muted bg-white rounded-4 border">
                    <div class="staff-brand-chip mx-auto mb-3" style="width: 52px; height: 52px; font-size: 1.4rem; background: #f1f5f9; color: #94a3b8;">
                        <i class="fi fi-rr-calendar-lines"></i>
                    </div>
                    <h6 class="fw-bold mb-1 fs-6">មិនទាន់មានថ្នាក់រៀនត្រូវបានចាត់តាំង</h6>
                    <p class="text-muted small mb-3">មិនទាន់មានថ្នាក់រៀនណាមួយត្រូវបានចាត់តាំងឱ្យគ្រូនេះនៅឡើយទេ</p>
                    <button type="button" class="btn btn-sm btn-primary rounded-pill px-3.5 py-1.5 fw-bold shadow-2xs" onclick="assignNewClassForCurrentTeacher()">
                        <i class="fi fi-rr-plus me-1"></i> ចាត់តាំងថ្នាក់រៀនដំបូង
                    </button>
                </div>
            `;
        } else if (filteredClasses.length === 0) {
            timelineContainer.innerHTML = `
                <div class="text-center py-4 text-muted bg-white rounded-4 border">
                    <i class="fi fi-rr-search-alt fs-2 d-block mb-1 text-primary opacity-50"></i>
                    <div class="fw-bold small mb-1">រកមិនឃើញថ្នាក់ត្រូវនឹងលក្ខខណ្ឌស្វែងរកឡើយ</div>
                    <small class="text-muted d-block mb-2">សូមសាកល្បងផ្លាស់ប្តូរពាក្យស្វែងរក ឬចុចមើលទាំងអស់</small>
                    <button type="button" class="btn btn-sm btn-light border rounded-pill px-3 py-1" onclick="document.getElementById('sched-search-input').value = ''; filterTeacherScheduleList(''); filterTeacherScheduleByShift('all');">
                        បង្ហាញថ្នាក់ទាំងអស់
                    </button>
                </div>
            `;
        } else {
            timelineContainer.innerHTML = filteredClasses.map((item, idx) => {
                const isConflictTime = item.hours && item.hours !== '-' && timeCount[item.hours] > 1;
                const safeClass = escapeStaffHtml(item.className || item.name || '-');
                const safeRoom = escapeStaffHtml(item.room && item.room !== '-' ? item.room : 'មិនទាន់មានបន្ទប់');
                const safeHours = escapeStaffHtml(item.hours && item.hours !== '-' ? item.hours : 'មិនទាន់កំណត់ម៉ោង');
                const period = getShiftPeriodCategory(item.hours);
                const periodBadge = renderShiftPeriodBadge(period);

                const maxCapacity = 35;
                const studentCount = item.studentCount || 0;
                const capacityPct = Math.min(Math.round((studentCount / maxCapacity) * 100), 100);
                let fillMeterClass = '';
                if (capacityPct >= 90) fillMeterClass = 'is-full';
                else if (capacityPct >= 70) fillMeterClass = 'is-high';

                return `
                    <div class="timeline-schedule-node">
                        <div class="timeline-marker ${isConflictTime ? 'is-conflict' : ''}" title="${isConflictTime ? 'ជាន់ម៉ោងបង្រៀន!' : `វេនទី ${idx + 1}`}">
                            <i class="fi ${isConflictTime ? 'fi-rr-triangle-warning' : 'fi-rr-clock'}"></i>
                        </div>
                        <div class="timeline-card p-3 p-md-3.5 rounded-4 border ${isConflictTime ? 'is-conflict-card' : 'border-light-subtle bg-white'} shadow-2xs hover-translate-y">
                            <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
                                <div class="d-flex align-items-center gap-2 flex-wrap">
                                    <span class="badge ${isConflictTime ? 'bg-danger text-white' : 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'} rounded-pill px-3 py-1.5 fw-bold" style="font-size: 0.8rem;">
                                        <i class="fi fi-rr-clock me-1"></i>${safeHours}
                                        ${isConflictTime ? ' <i class="fi fi-rr-triangle-warning ms-1" title="ជាន់ម៉ោងជាមួយថ្នាក់ផ្សេង!"></i>' : ''}
                                    </span>
                                    ${periodBadge}
                                    <span class="badge bg-info-subtle text-info-emphasis border border-info-subtle rounded-pill px-2.5 py-1.5 fw-bold" style="font-size: 0.8rem;">
                                        <i class="fi fi-rr-door-open me-1"></i>${safeRoom}
                                    </span>
                                </div>
                                <div class="d-flex align-items-center gap-1.5">
                                    <button type="button" class="btn btn-sm btn-primary-soft rounded-pill px-3 py-1 fw-bold" onclick="bootstrap.Modal.getInstance(document.getElementById('teacherScheduleModal'))?.hide(); viewClassStudents('${escapeStaffJs(item.className || item.name)}', '${escapeStaffJs(item.room || '-')}', '${escapeStaffJs(item.teacher || '-')}', '${escapeStaffJs(item.hours || '-')}', '${escapeStaffJs(item.level || '-')}', '${escapeStaffJs(item.teacherPhone || '')}')" title="មើលបញ្ជីសិស្សក្នុងថ្នាក់">
                                        <i class="fi fi-rr-users me-1"></i>សិស្ស (${studentCount})
                                    </button>
                                    <button type="button" class="btn btn-sm btn-light border rounded-pill px-2.5 py-1 text-secondary" onclick="bootstrap.Modal.getInstance(document.getElementById('teacherScheduleModal'))?.hide(); openClassroomAssignModal('${escapeStaffJs(item.className || item.name)}', '${escapeStaffJs(item.room || '')}', '${escapeStaffJs(item.teacher || '')}', '${escapeStaffJs(item.hours || '')}', '${escapeStaffJs(item.level || '')}', '${escapeStaffJs(item.studyType || '')}')" title="កែសម្រួលព័ត៌មានថ្នាក់នេះ">
                                        <i class="fi fi-rr-settings-sliders"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="mt-2.5 d-flex align-items-center justify-content-between flex-wrap gap-2">
                                <div>
                                    <h6 class="fw-extrabold text-dark mb-0 d-flex align-items-center gap-2">
                                        <span class="staff-brand-chip" style="width: 26px; height: 26px; font-size: 0.8rem; background: linear-gradient(135deg, #4f46e5, #7c3aed); flex-shrink: 0;">
                                           <i class="fi fi-rr-book-open-reader"></i>
                                        </span>
                                        <span>${safeClass}</span>
                                    </h6>
                                    <div class="d-flex align-items-center gap-1.5 mt-2 flex-wrap">
                                        ${renderLevelBadge(item.level)}
                                        ${renderStudyTypeBadge(item.studyType)}
                                    </div>
                                </div>
                                <div class="text-end small" style="min-width: 140px;">
                                    <div class="fw-bold text-dark"><i class="fi fi-rr-users text-primary me-1"></i>${studentCount} នាក់ (${capacityPct}%)</div>
                                    <div class="timeline-card-meter mt-1">
                                        <div class="timeline-card-meter-fill ${fillMeterClass}" style="width: ${capacityPct}%;"></div>
                                    </div>
                                    <div class="text-muted mt-0.5" style="font-size: 0.72rem;">ប្រុស៖ ${item.maleCount || 0} | ស្រី៖ ${item.femaleCount || 0}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // 2. Render Timetable Table Container
    const tableBody = document.getElementById('teacher-schedule-table-body');
    if (tableBody) {
        if (allClasses.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-5 text-muted">
                        <i class="fi fi-rr-calendar-lines fs-1 d-block mb-2 text-primary opacity-50"></i>
                        <div>មិនទាន់មានថ្នាក់រៀនត្រូវបានចាត់តាំងឱ្យគ្រូនេះនៅឡើយទេ</div>
                    </td>
                </tr>
            `;
        } else if (filteredClasses.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-4 text-muted">
                        <i class="fi fi-rr-search-alt fs-2 d-block mb-1 text-primary opacity-50"></i>
                        <div>រកមិនឃើញថ្នាក់ត្រូវនឹងលក្ខខណ្ឌស្វែងរកឡើយ</div>
                    </td>
                </tr>
            `;
        } else {
            tableBody.innerHTML = filteredClasses.map((item, idx) => {
                const isConflictTime = item.hours && item.hours !== '-' && timeCount[item.hours] > 1;
                const safeClass = escapeStaffHtml(item.className || item.name || '-');
                const safeRoom = escapeStaffHtml(item.room && item.room !== '-' ? item.room : '-');
                const safeHours = escapeStaffHtml(item.hours && item.hours !== '-' ? item.hours : 'មិនទាន់កំណត់');
                const period = getShiftPeriodCategory(item.hours);
                const periodBadge = renderShiftPeriodBadge(period);

                return `
                    <tr class="${isConflictTime ? 'table-danger-subtle' : ''}">
                        <td class="ps-4 fw-bold text-muted">${idx + 1}</td>
                        <td>
                            <div class="d-flex align-items-center gap-1.5 flex-wrap">
                                <span class="badge ${isConflictTime ? 'bg-danger text-white' : 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'} rounded-pill px-2.5 py-1 fw-bold" style="font-size: 0.8rem;">
                                    <i class="fi fi-rr-clock me-1"></i>${safeHours}
                                    ${isConflictTime ? ' <i class="fi fi-rr-triangle-warning ms-1" title="ជាន់ម៉ោង!"></i>' : ''}
                                </span>
                                ${periodBadge}
                            </div>
                        </td>
                        <td>
                            <div class="d-flex align-items-center gap-2">
                                <span class="staff-brand-chip" style="width: 24px; height: 24px; font-size: 0.75rem; background: linear-gradient(135deg, #4f46e5, #7c3aed); flex-shrink: 0;">
                                    <i class="fi fi-rr-book-open-reader"></i>
                                </span>
                                <span class="fw-bold text-dark">${safeClass}</span>
                            </div>
                        </td>
                        <td>
                            <span class="badge bg-info-subtle text-info-emphasis border border-info-subtle rounded-pill px-2.5 py-1 fw-bold">
                                <i class="fi fi-rr-door-open me-1"></i>${safeRoom}
                            </span>
                        </td>
                        <td>${renderLevelBadge(item.level)}</td>
                        <td>${renderStudyTypeBadge(item.studyType)}</td>
                        <td>
                            <span class="badge rounded-pill ${item.studentCount > 0 ? 'bg-primary-subtle text-primary border border-primary-subtle' : 'bg-light text-muted border'} px-2.5 py-1 fw-bold">
                                <i class="fi fi-rr-users me-1"></i>${item.studentCount || 0}
                            </span>
                            <span class="small text-muted ms-1" style="font-size: 0.72rem;">(ប:${item.maleCount || 0} / ស:${item.femaleCount || 0})</span>
                        </td>
                        <td class="text-end pe-4">
                            <div class="d-flex justify-content-end align-items-center gap-1.5">
                                <button type="button" class="btn btn-sm btn-primary-soft rounded-pill px-2.5 py-1 fw-bold" onclick="bootstrap.Modal.getInstance(document.getElementById('teacherScheduleModal'))?.hide(); viewClassStudents('${escapeStaffJs(item.className || item.name)}', '${escapeStaffJs(item.room || '-')}', '${escapeStaffJs(item.teacher || '-')}', '${escapeStaffJs(item.hours || '-')}', '${escapeStaffJs(item.level || '-')}', '${escapeStaffJs(item.teacherPhone || '')}')" title="មើលបញ្ជីសិស្ស">
                                    <i class="fi fi-rr-users me-1"></i>សិស្ស
                                </button>
                                <button type="button" class="btn btn-sm btn-light border rounded-pill px-2 py-1 text-secondary" onclick="bootstrap.Modal.getInstance(document.getElementById('teacherScheduleModal'))?.hide(); openClassroomAssignModal('${escapeStaffJs(item.className || item.name)}', '${escapeStaffJs(item.room || '')}', '${escapeStaffJs(item.teacher || '')}', '${escapeStaffJs(item.hours || '')}', '${escapeStaffJs(item.level || '')}', '${escapeStaffJs(item.studyType || '')}')" title="កែសម្រួល">
                                    <i class="fi fi-rr-settings-sliders"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }
}

window.openTeacherScheduleModal = function(teacherName) {
    if (!teacherName || teacherName === 'មិនទាន់មាន' || teacherName === '-') return;

    const modalEl = document.getElementById('teacherScheduleModal');
    if (!modalEl) return;

    // 1. Find teacher in staffData
    const matchedStaff = Object.values(staffData || {}).find(s => (s.nameKhmer || '').trim().toLowerCase() === teacherName.trim().toLowerCase());

    // 2. Find all classes assigned to this teacher
    const teacherClasses = (cachedClassroomHubList || []).filter(c => c.teacher && c.teacher.trim().toLowerCase() === teacherName.trim().toLowerCase());

    // 3. Compute stats
    const totalClasses = teacherClasses.length;
    const totalStudents = teacherClasses.reduce((sum, c) => sum + (c.studentCount || 0), 0);
    const totalMale = teacherClasses.reduce((sum, c) => sum + (c.maleCount || 0), 0);
    const totalFemale = teacherClasses.reduce((sum, c) => sum + (c.femaleCount || 0), 0);
    const uniqueRooms = Array.from(new Set(teacherClasses.map(c => c.room).filter(r => r && r !== '-')));
    const uniqueShifts = Array.from(new Set(teacherClasses.map(c => c.hours).filter(h => h && h !== '-')));
    const estimatedHours = (uniqueShifts.length * 1.5).toFixed(1);

    // 4. Check internal schedule conflicts
    const timeCount = {};
    teacherClasses.forEach(c => {
        if (c.hours && c.hours !== '-') {
            timeCount[c.hours] = (timeCount[c.hours] || 0) + 1;
        }
    });
    const conflictTimes = Object.entries(timeCount).filter(([_, count]) => count > 1).map(([t]) => t);
    const hasInternalConflict = conflictTimes.length > 0;
    const conflictClasses = teacherClasses.filter(c => c.hours && conflictTimes.includes(c.hours));

    // 5. Sort classes chronologically by hours
    const sortedClasses = [...teacherClasses].sort((a, b) => (a.hours || '').localeCompare(b.hours || '', undefined, { numeric: true }));

    currentModalTeacherSchedule = {
        teacherName: teacherName,
        teacherClasses: sortedClasses,
        staff: matchedStaff,
        totalClasses: totalClasses,
        totalStudents: totalStudents,
        totalMale: totalMale,
        totalFemale: totalFemale,
        uniqueRooms: uniqueRooms,
        uniqueShifts: uniqueShifts,
        estimatedHours: estimatedHours,
        timeCount: timeCount,
        hasInternalConflict: hasInternalConflict,
        conflictTimes: conflictTimes,
        conflictClasses: conflictClasses
    };

    // Update Profile Header
    const nameEl = document.getElementById('sched-teacher-name');
    if (nameEl) nameEl.textContent = teacherName;

    const countBadge = document.getElementById('sched-header-count-badge');
    if (countBadge) countBadge.textContent = `${totalClasses} ថ្នាក់`;

    const posEl = document.getElementById('sched-teacher-position');
    if (posEl) posEl.innerHTML = `<i class="fi fi-rr-briefcase me-1 text-primary"></i>${matchedStaff?.position || 'គ្រូបង្រៀន'}`;

    const phoneWrap = document.getElementById('sched-teacher-phone-wrap');
    const phoneEl = document.getElementById('sched-teacher-phone');
    const phone = matchedStaff?.phone || teacherClasses.find(c => c.teacherPhone)?.teacherPhone || '';
    if (phoneWrap && phoneEl) {
        if (phone) {
            phoneEl.textContent = `📞 ${phone}`;
            phoneEl.href = `tel:${phone}`;
            phoneWrap.classList.remove('d-none');
        } else {
            phoneWrap.classList.add('d-none');
        }
    }

    const avatarEl = document.getElementById('sched-teacher-avatar');
    if (avatarEl) {
        if (matchedStaff?.photo) {
            avatarEl.innerHTML = `<img src="${matchedStaff.photo}" alt="${escapeStaffHtml(teacherName)}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        } else {
            avatarEl.innerHTML = `<i class="fi fi-rr-chalkboard-user"></i>`;
        }
    }

    // Update KPI counters
    if (document.getElementById('sched-stat-classes')) document.getElementById('sched-stat-classes').textContent = totalClasses;
    if (document.getElementById('sched-stat-students')) document.getElementById('sched-stat-students').textContent = totalStudents;
    if (document.getElementById('sched-stat-rooms')) document.getElementById('sched-stat-rooms').textContent = uniqueRooms.length;
    if (document.getElementById('sched-stat-shifts')) document.getElementById('sched-stat-shifts').textContent = uniqueShifts.length;
    if (document.getElementById('sched-stat-male')) document.getElementById('sched-stat-male').textContent = totalMale;
    if (document.getElementById('sched-stat-female')) document.getElementById('sched-stat-female').textContent = totalFemale;
    if (document.getElementById('sched-stat-hours')) document.getElementById('sched-stat-hours').textContent = estimatedHours;

    // Gender Ratio Calculation & Segmented Progress Bar
    const totalGenderCount = totalMale + totalFemale;
    const malePct = totalGenderCount > 0 ? Math.round((totalMale / totalGenderCount) * 100) : 50;
    const femalePct = totalGenderCount > 0 ? (100 - malePct) : 50;
    if (document.getElementById('sched-stat-pct-male')) document.getElementById('sched-stat-pct-male').textContent = `${totalGenderCount > 0 ? malePct : 0}%`;
    if (document.getElementById('sched-stat-pct-female')) document.getElementById('sched-stat-pct-female').textContent = `${totalGenderCount > 0 ? femalePct : 0}%`;
    const barMale = document.getElementById('sched-stat-bar-male');
    const barFemale = document.getElementById('sched-stat-bar-female');
    if (barMale) barMale.style.width = `${totalGenderCount > 0 ? malePct : 0}%`;
    if (barFemale) barFemale.style.width = `${totalGenderCount > 0 ? femalePct : 0}%`;

    // Shift Counters for filter pills
    const morningCount = teacherClasses.filter(c => getShiftPeriodCategory(c.hours) === 'morning').length;
    const afternoonCount = teacherClasses.filter(c => getShiftPeriodCategory(c.hours) === 'afternoon').length;
    const eveningCount = teacherClasses.filter(c => getShiftPeriodCategory(c.hours) === 'evening').length;
    if (document.getElementById('sched-count-all')) document.getElementById('sched-count-all').textContent = totalClasses;
    if (document.getElementById('sched-count-morning')) document.getElementById('sched-count-morning').textContent = morningCount;
    if (document.getElementById('sched-count-afternoon')) document.getElementById('sched-count-afternoon').textContent = afternoonCount;
    if (document.getElementById('sched-count-evening')) document.getElementById('sched-count-evening').textContent = eveningCount;

    // Workload Intensity Badge
    const intensityBadge = document.getElementById('sched-workload-intensity');
    if (intensityBadge) {
        if (totalClasses === 0) {
            intensityBadge.className = 'badge rounded-pill bg-light text-muted border px-2.5 py-1';
            intensityBadge.textContent = 'បន្ទុក៖ គ្មានថ្នាក់';
        } else if (totalClasses <= 2) {
            intensityBadge.className = 'badge rounded-pill bg-info-subtle text-info border border-info-subtle px-2.5 py-1';
            intensityBadge.textContent = `បន្ទុកបង្រៀន៖ ស្រាល (${totalClasses} ថ្នាក់)`;
        } else if (totalClasses <= 4) {
            intensityBadge.className = 'badge rounded-pill bg-success-subtle text-success border border-success-subtle px-2.5 py-1';
            intensityBadge.textContent = `បន្ទុកបង្រៀន៖ មធ្យម (${totalClasses} ថ្នាក់)`;
        } else {
            intensityBadge.className = 'badge rounded-pill bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2.5 py-1';
            intensityBadge.textContent = `បន្ទុកបង្រៀន៖ ពេញលេញ (${totalClasses} ថ្នាក់)`;
        }
    }

    // Status Conflict Badge & Banner
    const statusBadge = document.getElementById('sched-status-badge');
    const conflictBanner = document.getElementById('sched-conflict-banner');
    const conflictDetails = document.getElementById('sched-conflict-details');

    if (hasInternalConflict) {
        if (statusBadge) {
            statusBadge.className = 'badge rounded-pill bg-danger text-white fw-bold px-2.5 py-0.5';
            statusBadge.innerHTML = `<i class="fi fi-rr-triangle-warning me-1"></i>ជាន់ម៉ោង (${conflictTimes.length} វេន)`;
        }
        if (conflictBanner && conflictDetails) {
            const conflictSummary = conflictTimes.map(t => {
                const conflictingInTime = teacherClasses.filter(c => c.hours === t).map(c => `"${c.className || c.name}" (បន្ទប់ ${c.room || '-'})`).join(' និង ');
                return `• ម៉ោង <strong>${escapeStaffHtml(t)}</strong> ជាន់គ្នាលើថ្នាក់៖ ${escapeStaffHtml(conflictingInTime)}`;
            }).join('<br>');
            conflictDetails.innerHTML = conflictSummary;
            conflictBanner.classList.remove('d-none');
        }
    } else {
        if (statusBadge) {
            statusBadge.className = 'badge rounded-pill bg-success-subtle text-success border border-success-subtle px-2.5 py-0.5 fw-bold';
            statusBadge.innerHTML = `<i class="fi fi-rr-check me-1"></i>កាលវិភាគធម្មតា`;
        }
        if (conflictBanner) {
            conflictBanner.classList.add('d-none');
        }
    }

    // Reset Filter State
    currentTeacherScheduleFilterQuery = '';
    currentTeacherScheduleShiftFilter = 'all';
    const searchInput = document.getElementById('sched-search-input');
    if (searchInput) searchInput.value = '';
    ['all', 'morning', 'afternoon', 'evening'].forEach(s => {
        const btn = document.getElementById(`sched-filter-${s}`);
        if (btn) {
            btn.classList.toggle('active', s === 'all');
            btn.classList.toggle('btn-primary', s === 'all');
            btn.classList.toggle('btn-light', s !== 'all');
        }
    });

    // Render Dynamic Content
    renderTeacherScheduleDynamicContent();

    // Ensure active view mode is synced
    switchTeacherScheduleViewMode(currentTeacherScheduleView || 'timeline');

    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
};

window.printTeacherSchedule = function() {
    if (!currentModalTeacherSchedule || !currentModalTeacherSchedule.teacherClasses) {
        Swal.fire({ icon: 'warning', title: 'មិនមានទិន្នន័យកាលវិភាគសម្រាប់បោះពុម្ពឡើយ' });
        return;
    }

    const data = currentModalTeacherSchedule;
    const printArea = document.getElementById('teacher-schedule-print-area');
    if (!printArea) return;

    const rowsHtml = (data.teacherClasses || []).map((c, idx) => `
        <tr style="text-align: center;">
            <td style="padding: 8px 4px; border: 1px solid #333;">${idx + 1}</td>
            <td style="padding: 8px 4px; border: 1px solid #333; font-weight: bold; text-align: left;">${escapeStaffHtml(c.className || c.name)}</td>
            <td style="padding: 8px 4px; border: 1px solid #333;">${escapeStaffHtml(c.room || '-')}</td>
            <td style="padding: 8px 4px; border: 1px solid #333; font-weight: bold;">${escapeStaffHtml(c.hours || '-')}</td>
            <td style="padding: 8px 4px; border: 1px solid #333;">${escapeStaffHtml(c.level || '-')}</td>
            <td style="padding: 8px 4px; border: 1px solid #333;">${c.studentCount || 0}</td>
            <td style="padding: 8px 4px; border: 1px solid #333;">${c.maleCount || 0} / ${c.femaleCount || 0}</td>
        </tr>
    `).join('');

    printArea.innerHTML = `
        <div style="font-family: 'Kantumruy Pro', 'Hanuman', 'Siemreap', sans-serif; padding: 25px; color: #000; background: #fff;">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 25px;">
                <h3 style="font-size: 1.4rem; font-weight: bold; margin: 0 0 5px 0;">កាលវិភាគបង្រៀនប្រចាំថ្ងៃរបស់គ្រូបង្រៀន</h3>
                <h4 style="font-size: 1.15rem; font-weight: bold; color: #1e3a8a; margin: 0 0 5px 0;">លោកគ្រូ/អ្នកគ្រូ៖ ${escapeStaffHtml(data.teacherName)}</h4>
                <p style="margin: 0; font-size: 0.9rem; color: #555;">
                    មុខតំណែង៖ ${escapeStaffHtml(data.staff?.position || 'គ្រូបង្រៀន')} | លេខទូរស័ព្ទ៖ ${escapeStaffHtml(data.staff?.phone || '-')} | កាលបរិច្ឆេទបោះពុម្ព៖ ${new Date().toLocaleDateString('km-KH')}
                </p>
            </div>

            <!-- Stats Summary -->
            <div style="display: flex; justify-content: space-around; margin-bottom: 20px; padding: 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px;">
                <div><strong>ថ្នាក់ទទួលបន្ទុក៖</strong> ${data.totalClasses} ថ្នាក់</div>
                <div><strong>បន្ទប់សិក្សា៖</strong> ${data.uniqueRooms.length} បន្ទប់</div>
                <div><strong>វេនម៉ោងបង្រៀន៖</strong> ${(data.uniqueShifts || []).length} វេន</div>
                <div><strong>ចំនួនសិស្សសរុប៖</strong> ${data.totalStudents} នាក់</div>
            </div>

            <!-- Schedule Table -->
            <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem; margin-bottom: 30px;">
                <thead>
                    <tr style="background: #e2e8f0; text-align: center;">
                        <th style="padding: 8px 4px; border: 1px solid #333; width: 45px;">ល.រ</th>
                        <th style="padding: 8px 4px; border: 1px solid #333; text-align: left;">ឈ្មោះថ្នាក់រៀន</th>
                        <th style="padding: 8px 4px; border: 1px solid #333; width: 110px;">បន្ទប់សិក្សា</th>
                        <th style="padding: 8px 4px; border: 1px solid #333; width: 130px;">ម៉ោងសិក្សា</th>
                        <th style="padding: 8px 4px; border: 1px solid #333; width: 120px;">កម្រិតសិក្សា</th>
                        <th style="padding: 8px 4px; border: 1px solid #333; width: 85px;">សិស្សសរុប</th>
                        <th style="padding: 8px 4px; border: 1px solid #333; width: 95px;">ប្រុស / ស្រី</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>

            <!-- Signatures -->
            <div style="display: flex; justify-content: space-between; margin-top: 40px; font-size: 0.95rem;">
                <div style="text-align: center; width: 220px;">
                    <p style="margin-bottom: 60px;">បានឃើញ និងឯកភាព<br><strong>នាយកសាលា</strong></p>
                    <p>.......................................</p>
                </div>
                <div style="text-align: center; width: 220px;">
                    <p style="margin-bottom: 60px;">ថ្ងៃទី....... ខែ....... ឆ្នាំ២០...<br><strong>ហត្ថលេខាគ្រូទទួលបន្ទុក</strong></p>
                    <p>.......................................</p>
                </div>
            </div>
        </div>
    `;

    printArea.classList.remove('d-none');
    window.print();
    setTimeout(() => {
        printArea.classList.add('d-none');
        printArea.innerHTML = '';
    }, 1500);
};

window.switchClassRosterViewMode = function(mode) {
    currentRosterViewMode = mode || 'table';
    const btnTable = document.getElementById('btn-roster-view-table');
    const btnGrid = document.getElementById('btn-roster-view-grid');
    const tableContainer = document.getElementById('class-students-table-container');
    const gridContainer = document.getElementById('class-students-grid-container');

    if (btnTable) btnTable.classList.toggle('active', currentRosterViewMode === 'table');
    if (btnGrid) btnGrid.classList.toggle('active', currentRosterViewMode === 'grid');

    if (tableContainer) tableContainer.classList.toggle('d-none', currentRosterViewMode !== 'table');
    if (gridContainer) gridContainer.classList.toggle('d-none', currentRosterViewMode !== 'grid');
};

window.filterClassStudentsByGender = function(gender) {
    currentRosterGenderFilter = gender || 'all';
    ['all', 'male', 'female'].forEach(g => {
        const btn = document.getElementById(`roster-filter-gender-${g}`);
        if (btn) {
            btn.classList.toggle('active', g === currentRosterGenderFilter);
            btn.classList.toggle('btn-primary', g === currentRosterGenderFilter);
            btn.classList.toggle('btn-light', g !== currentRosterGenderFilter);
        }
    });
    renderClassRosterDynamicContent();
};

window.filterClassStudentsByPayment = function(payStatus) {
    currentRosterPaymentFilter = payStatus || 'all';
    ['all', 'paid', 'debt'].forEach(p => {
        const btn = document.getElementById(`roster-filter-pay-${p}`);
        if (btn) {
            btn.classList.toggle('active', p === currentRosterPaymentFilter);
            btn.classList.toggle('btn-primary', p === currentRosterPaymentFilter);
            btn.classList.toggle('btn-light', p !== currentRosterPaymentFilter);
        }
    });
    renderClassRosterDynamicContent();
};

window.filterClassStudentsList = function(query) {
    currentRosterSearchQuery = (query || '').toLowerCase().trim();
    renderClassRosterDynamicContent();
};

window.resetClassRosterFilters = function() {
    currentRosterGenderFilter = 'all';
    currentRosterPaymentFilter = 'all';
    currentRosterSearchQuery = '';
    const searchInput = document.getElementById('modal-class-student-search');
    if (searchInput) searchInput.value = '';

    ['all', 'male', 'female'].forEach(g => {
        const btn = document.getElementById(`roster-filter-gender-${g}`);
        if (btn) {
            btn.classList.toggle('active', g === 'all');
            btn.classList.toggle('btn-primary', g === 'all');
            btn.classList.toggle('btn-light', g !== 'all');
        }
    });

    ['all', 'paid', 'debt'].forEach(p => {
        const btn = document.getElementById(`roster-filter-pay-${p}`);
        if (btn) {
            btn.classList.toggle('active', p === 'all');
            btn.classList.toggle('btn-primary', p === 'all');
            btn.classList.toggle('btn-light', p !== 'all');
        }
    });

    renderClassRosterDynamicContent();
};

window.renderClassRosterDynamicContent = function() {
    const allStudents = currentModalClassStudents || [];

    const filtered = allStudents.filter(s => {
        // 1. Search Query
        if (currentRosterSearchQuery) {
            const fullName = `${s.lastName || ''} ${s.firstName || ''}`.toLowerCase();
            const id = (s.displayId || s.id || '').toLowerCase();
            const phone = (s.phone || s.telegramPhone || '').toLowerCase();
            const chinese = (s.chineseName || s.nameChinese || s.nameLatin || '').toLowerCase();
            const match = fullName.includes(currentRosterSearchQuery) || id.includes(currentRosterSearchQuery) || phone.includes(currentRosterSearchQuery) || chinese.includes(currentRosterSearchQuery);
            if (!match) return false;
        }
        // 2. Gender Filter
        if (currentRosterGenderFilter !== 'all') {
            const g = (s.gender || '').trim().toLowerCase();
            const isMale = g === 'ប្រុស' || g === 'male' || g === 'm';
            const isFemale = g === 'ស្រី' || g === 'female' || g === 'f';
            if (currentRosterGenderFilter === 'male' && !isMale) return false;
            if (currentRosterGenderFilter === 'female' && !isFemale) return false;
        }
        // 3. Payment Filter
        if (currentRosterPaymentFilter !== 'all') {
            const pStatus = getPaymentStatus(s);
            if (currentRosterPaymentFilter === 'paid' && pStatus.status !== 'paid') return false;
            if (currentRosterPaymentFilter === 'debt' && pStatus.status === 'paid') return false;
        }
        return true;
    });

    // 1. Render Table View
    const tbody = document.getElementById('class-students-modal-table-body');
    if (tbody) {
        if (allStudents.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-5 text-muted">
                        <div class="staff-brand-chip mx-auto mb-3" style="width: 52px; height: 52px; font-size: 1.4rem; background: #f1f5f9; color: #94a3b8;">
                            <i class="fi fi-rr-users"></i>
                        </div>
                        <h6 class="fw-bold mb-1 fs-6">មិនមានទិន្នន័យសិស្សក្នុងថ្នាក់នេះទេ</h6>
                        <p class="text-muted small mb-0">មិនទាន់មានសិស្សណាម្នាក់ត្រូវបានបញ្ចូលក្នុងថ្នាក់ ${escapeStaffHtml(currentViewedClassMeta?.className || '')} នៅឡើយទេ</p>
                    </td>
                </tr>
            `;
        } else if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4 text-muted">
                        <i class="fi fi-rr-search-alt fs-2 d-block mb-1 text-primary opacity-50"></i>
                        <div class="fw-bold small mb-1">រកមិនឃើញសិស្សត្រូវនឹងលក្ខខណ្ឌស្វែងរកឡើយ</div>
                        <button type="button" class="btn btn-sm btn-light border rounded-pill px-3 py-1 mt-1" onclick="resetClassRosterFilters()">
                            បង្ហាញសិស្សទាំងអស់
                        </button>
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = filtered.map((s, idx) => {
                const fullName = `${s.lastName || ''} ${s.firstName || ''}`.trim() || 'N/A';
                const initials = getInitials(fullName);
                const pStatus = getPaymentStatus(s);
                const tuition = parseFloat(s.courseFee || s.tuitionFee || 0) || 0;
                const services = parseFloat(s.services || 0) || 0;
                const phone = s.phone || s.telegramPhone || '';
                const g = (s.gender || '').trim().toLowerCase();
                const isMale = g === 'ប្រុស' || g === 'male' || g === 'm';
                const genderBadge = isMale ?
                    `<span class="badge rounded-pill px-2.5 py-1 fw-bold" style="background: rgba(59, 130, 246, 0.12); color: #2563eb; border: 1px solid rgba(59, 130, 246, 0.25);"><i class="fi fi-rr-mars me-1"></i>ប្រុស</span>` :
                    `<span class="badge rounded-pill bg-pink-subtle px-2.5 py-1 fw-bold"><i class="fi fi-rr-venus me-1"></i>ស្រី</span>`;

                const avatar = s.photoUrl || s.imageUrl ?
                    `<div class="staff-avatar-ring me-2.5 shadow-2xs overflow-hidden" style="width: 38px; height: 38px; flex-shrink: 0;"><img src="${s.photoUrl || s.imageUrl}" class="w-100 h-100" style="object-fit: cover;"></div>` :
                    `<div class="staff-avatar-ring me-2.5 shadow-2xs d-flex align-items-center justify-content-center fw-bold" style="width: 38px; height: 38px; flex-shrink: 0; background: linear-gradient(135deg, ${isMale ? '#3b82f6, #1d4ed8' : '#ec4899, #be185d'}); color: #fff; font-size: 0.85rem;">${initials}</div>`;

                return `
                    <tr class="align-middle">
                        <td class="ps-4 fw-bold text-muted" style="width: 45px;">${idx + 1}</td>
                        <td>
                            <div class="d-flex align-items-center">
                                ${avatar}
                                <div>
                                    <div class="fw-bold staff-row-name text-dark">${escapeStaffHtml(fullName)}</div>
                                    <div class="d-flex align-items-center gap-1.5 flex-wrap mt-0.5">
                                        <span class="badge bg-light text-dark border px-2 py-0.5" style="font-size: 0.7rem;"><i class="fi fi-rr-id-badge me-0.5"></i>${escapeStaffHtml(s.displayId || s.id || '')}</span>
                                        ${(s.chineseName || s.nameChinese || s.nameLatin) ? `<small class="text-muted" style="font-size: 0.75rem;">${escapeStaffHtml(s.chineseName || s.nameChinese || s.nameLatin)}</small>` : ''}
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td>${genderBadge}</td>
                        <td>
                            ${phone ? `
                                <a href="tel:${escapeStaffHtml(phone)}" class="text-decoration-none fw-semibold text-dark d-inline-flex align-items-center gap-1.5 small">
                                    <span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2.5 py-1">
                                        <i class="fi fi-rr-phone-call me-1"></i>${escapeStaffHtml(phone)}
                                    </span>
                                </a>
                            ` : `<span class="text-muted small">-</span>`}
                        </td>
                        <td>
                            <div class="d-flex flex-column gap-1">
                                <span class="badge bg-light text-dark border px-2.5 py-1 fw-bold" style="font-size: 0.75rem;">
                                    ថ្លៃសិក្សា៖ $${tuition.toFixed(2)}
                                </span>
                                ${services > 0 ? `
                                    <span class="badge text-white px-2 py-0.5" style="background: #8b5cf6; font-size: 0.7rem;">
                                        + សេវា៖ $${services.toFixed(2)}
                                    </span>
                                ` : ''}
                            </div>
                        </td>
                        <td>
                            <span class="badge ${pStatus.badge} px-2.5 py-1.5 rounded-pill fw-bold shadow-2xs" style="font-size: 0.75rem;">
                                ${pStatus.text}
                            </span>
                        </td>
                        <td class="text-end pe-4">
                            <button type="button" class="btn btn-sm btn-action-primary rounded-pill px-3 py-1 fw-bold shadow-2xs d-inline-flex align-items-center gap-1" onclick="openStudentPaymentModal('${escapeStaffJs(s.id)}')">
                                <i class="fi fi-rr-wallet"></i> បង់ប្រាក់
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }

    // 2. Render Cards Grid View
    const gridCards = document.getElementById('class-students-grid-cards');
    if (gridCards) {
        if (allStudents.length === 0) {
            gridCards.innerHTML = `
                <div class="col-12 text-center py-5 text-muted bg-white rounded-4 border">
                    <i class="fi fi-rr-users fs-2 d-block mb-1 text-primary opacity-50"></i>
                    <div class="fw-bold small">មិនមានទិន្នន័យសិស្សក្នុងថ្នាក់នេះទេ</div>
                </div>
            `;
        } else if (filtered.length === 0) {
            gridCards.innerHTML = `
                <div class="col-12 text-center py-4 text-muted bg-white rounded-4 border">
                    <i class="fi fi-rr-search-alt fs-2 d-block mb-1 text-primary opacity-50"></i>
                    <div class="fw-bold small mb-1">រកមិនឃើញសិស្សត្រូវនឹងលក្ខខណ្ឌស្វែងរកឡើយ</div>
                    <button type="button" class="btn btn-sm btn-light border rounded-pill px-3 py-1" onclick="resetClassRosterFilters()">
                        បង្ហាញសិស្សទាំងអស់
                    </button>
                </div>
            `;
        } else {
            gridCards.innerHTML = filtered.map((s, idx) => {
                const fullName = `${s.lastName || ''} ${s.firstName || ''}`.trim() || 'N/A';
                const initials = getInitials(fullName);
                const pStatus = getPaymentStatus(s);
                const tuition = parseFloat(s.courseFee || s.tuitionFee || 0) || 0;
                const services = parseFloat(s.services || 0) || 0;
                const phone = s.phone || s.telegramPhone || '';
                const g = (s.gender || '').trim().toLowerCase();
                const isMale = g === 'ប្រុស' || g === 'male' || g === 'm';

                const avatar = s.photoUrl || s.imageUrl ?
                    `<div class="student-card-avatar shadow-2xs"><img src="${s.photoUrl || s.imageUrl}"></div>` :
                    `<div class="student-card-avatar shadow-2xs" style="background: linear-gradient(135deg, ${isMale ? '#3b82f6, #1d4ed8' : '#ec4899, #be185d'}); color: #fff;">${initials}</div>`;

                return `
                    <div class="col-12 col-sm-6 col-lg-4 col-xl-3">
                        <div class="student-grid-card shadow-2xs">
                            <div class="d-flex align-items-center justify-content-between mb-2.5">
                                <span class="badge bg-light text-dark border px-2 py-0.5" style="font-size: 0.72rem;">
                                    #${idx + 1} | ${escapeStaffHtml(s.displayId || s.id || '')}
                                </span>
                                ${isMale ?
                                    `<span class="badge rounded-pill px-2 py-0.5" style="background: rgba(59, 130, 246, 0.12); color: #2563eb; font-size: 0.72rem;"><i class="fi fi-rr-mars me-0.5"></i>ប្រុស</span>` :
                                    `<span class="badge rounded-pill bg-pink-subtle px-2 py-0.5" style="font-size: 0.72rem;"><i class="fi fi-rr-venus me-0.5"></i>ស្រី</span>`
                                }
                            </div>
                            <div class="d-flex align-items-center gap-2.5 mb-2">
                                ${avatar}
                                <div class="overflow-hidden">
                                    <h6 class="fw-bold text-dark mb-0 text-truncate fs-6" title="${escapeStaffHtml(fullName)}">${escapeStaffHtml(fullName)}</h6>
                                    ${(s.chineseName || s.nameChinese || s.nameLatin) ? `<small class="text-muted text-truncate d-block" style="font-size: 0.75rem;">${escapeStaffHtml(s.chineseName || s.nameChinese || s.nameLatin)}</small>` : ''}
                                </div>
                            </div>
                            <div class="small text-muted mb-2">
                                ${phone ? `
                                    <a href="tel:${escapeStaffHtml(phone)}" class="text-decoration-none text-dark d-inline-flex align-items-center gap-1">
                                        <i class="fi fi-rr-phone-call text-success"></i> ${escapeStaffHtml(phone)}
                                    </a>
                                ` : `<span class="text-muted">គ្មានលេខទូរស័ព្ទ</span>`}
                            </div>
                            <div class="student-card-divider"></div>
                            <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
                                <div>
                                    <div class="text-muted" style="font-size: 0.7rem;">ថ្លៃសិក្សា</div>
                                    <strong class="text-dark" style="font-size: 0.85rem;">$${tuition.toFixed(2)}</strong>
                                    ${services > 0 ? `<span class="badge text-white ms-1" style="background: #8b5cf6; font-size: 0.65rem;">+សេវា $${services.toFixed(2)}</span>` : ''}
                                </div>
                                <span class="badge ${pStatus.badge} rounded-pill px-2.5 py-1" style="font-size: 0.72rem;">
                                    ${pStatus.text}
                                </span>
                            </div>
                            <div class="mt-2.5">
                                <button type="button" class="btn btn-sm btn-action-primary w-100 rounded-pill py-1 fw-bold shadow-2xs" onclick="openStudentPaymentModal('${escapeStaffJs(s.id)}')">
                                    <i class="fi fi-rr-wallet me-1"></i> កត់ត្រាបង់ប្រាក់
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
};

function renderClassStudentsTable(students) {
    renderClassRosterDynamicContent();
}

// --------------------------------------------------------------------------
// TUITION & SERVICES MANAGEMENT LOGIC
// --------------------------------------------------------------------------
let tuitionStudentsList = [];
let currentTuitionFilter = 'all';
let currentTuitionClassFilter = '';
let currentTuitionSearch = '';

window.loadTuitionStudents = async function() {
    const tbody = document.getElementById('tuition-table-body');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-2 text-muted small">កំពុងទាញយកទិន្នន័យការបង់ប្រាក់...</p></td></tr>`;
    }

    try {
        const snap = await firebase.database().ref('students').once('value');
        const val = snap.val() || {};
        cachedStudentsList = Object.entries(val).map(([id, data]) => ({ id, ...data }));
        tuitionStudentsList = cachedStudentsList;

        // Populate class filter dropdown
        const classFilter = document.getElementById('tuition-class-filter');
        if (classFilter) {
            const classSet = new Set();
            cachedStudentsList.forEach(s => {
                const c = s.classroom || s.grade;
                if (c && c.trim()) classSet.add(c.trim());
            });
            const options = Array.from(classSet).sort().map(c => `<option value="${c}">${c}</option>`).join('');
            classFilter.innerHTML = `<option value="">-- គ្រប់ថ្នាក់រៀន --</option>${options}`;
        }

        // Populate student dropdown in payment modal
        const studentDropdown = document.getElementById('pay-select-student-dropdown');
        if (studentDropdown) {
            const opts = cachedStudentsList.map(s => {
                const name = `${s.lastName || ''} ${s.firstName || ''}`.trim();
                const id = s.displayId || s.id || '';
                const cls = s.classroom || s.grade || '';
                return `<option value="${s.id}">${name} (${id}) - ${cls}</option>`;
            }).join('');
            studentDropdown.innerHTML = `<option value="">-- ជ្រើសរើសសិស្ស --</option>${opts}`;
        }

        updateTuitionDashboardStats();
        renderTuitionTable();
    } catch (e) {
        console.error('Error loading tuition students:', e);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-danger">មានបញ្ហាក្នុងការទាញយកទិន្នន័យ៖ ${e.message}</td></tr>`;
        }
    }
};

function updateTuitionDashboardStats() {
    let total = tuitionStudentsList.length;
    let paid = 0;
    let debt = 0;
    let delay = 0;
    let overdue = 0;

    tuitionStudentsList.forEach(s => {
        const st = getPaymentStatus(s);
        if (st.status === 'paid') paid++;
        else if (st.status === 'delay') delay++;
        else if (st.status === 'overdue') overdue++;
        else debt++; // installment, pending, etc.
    });

    if (document.getElementById('tuition-stat-total')) document.getElementById('tuition-stat-total').textContent = total;
    if (document.getElementById('tuition-stat-paid')) document.getElementById('tuition-stat-paid').textContent = paid;
    if (document.getElementById('tuition-stat-debt')) document.getElementById('tuition-stat-debt').textContent = debt;
    if (document.getElementById('tuition-stat-delay')) document.getElementById('tuition-stat-delay').textContent = delay;
    if (document.getElementById('tuition-stat-overdue')) document.getElementById('tuition-stat-overdue').textContent = overdue;

    if (document.getElementById('tuition-tab-all')) document.getElementById('tuition-tab-all').textContent = total;
    if (document.getElementById('tuition-tab-paid')) document.getElementById('tuition-tab-paid').textContent = paid;
    if (document.getElementById('tuition-tab-debt')) document.getElementById('tuition-tab-debt').textContent = debt;
    if (document.getElementById('tuition-tab-delay')) document.getElementById('tuition-tab-delay').textContent = delay;
    if (document.getElementById('tuition-tab-overdue')) document.getElementById('tuition-tab-overdue').textContent = overdue;

    // Progress Bars
    if (total > 0) {
        if (document.getElementById('tuition-bar-paid')) document.getElementById('tuition-bar-paid').style.width = (paid / total * 100) + '%';
        if (document.getElementById('tuition-bar-debt')) document.getElementById('tuition-bar-debt').style.width = (debt / total * 100) + '%';
        if (document.getElementById('tuition-bar-delay')) document.getElementById('tuition-bar-delay').style.width = (delay / total * 100) + '%';
        if (document.getElementById('tuition-bar-overdue')) document.getElementById('tuition-bar-overdue').style.width = (overdue / total * 100) + '%';
    }

    // Sidebar & Tab Badge for Tuition
    const subBadgeTuition = document.getElementById('sub-badge-tuition');
    const tabBadgeTuition = document.getElementById('tab-badge-tuition');
    const tuitionBadgeVal = overdue > 0 ? overdue : (debt > 0 ? debt : total);
    if (subBadgeTuition) {
        subBadgeTuition.textContent = tuitionBadgeVal;
        if (overdue > 0) {
            subBadgeTuition.style.background = '#e11d48';
            subBadgeTuition.style.color = '#ffffff';
        }
    }
    if (tabBadgeTuition) {
        tabBadgeTuition.textContent = tuitionBadgeVal;
        if (overdue > 0) {
            tabBadgeTuition.className = 'badge rounded-pill bg-danger text-white ms-1';
        }
    }
}

window.filterTuitionList = function(status, buttonEl) {
    currentTuitionFilter = status;
    if (buttonEl) {
        const toolbar = buttonEl.closest('.nav-pills-staff');
        if (toolbar) {
            toolbar.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));
            buttonEl.classList.add('active');
        }
    }
    renderTuitionTable();
};

window.handleTuitionClassFilter = function(className) {
    currentTuitionClassFilter = className;
    renderTuitionTable();
};

window.handleTuitionSearch = function(query) {
    currentTuitionSearch = (query || '').toLowerCase().trim();
    renderTuitionTable();
};

function renderTuitionTable() {
    const tbody = document.getElementById('tuition-table-body');
    if (!tbody) return;

    let displayList = [...tuitionStudentsList];

    // Filter by Class
    if (currentTuitionClassFilter) {
        displayList = displayList.filter(s => (s.classroom || s.grade || '') === currentTuitionClassFilter);
    }

    // Filter by Status
    if (currentTuitionFilter && currentTuitionFilter !== 'all') {
        displayList = displayList.filter(s => {
            const st = getPaymentStatus(s);
            if (currentTuitionFilter === 'paid') return st.status === 'paid';
            if (currentTuitionFilter === 'delay') return st.status === 'delay';
            if (currentTuitionFilter === 'overdue') return st.status === 'overdue';
            if (currentTuitionFilter === 'debt') return st.status !== 'paid' && st.status !== 'delay' && st.status !== 'overdue';
            return true;
        });
    }

    // Filter by Search Query
    if (currentTuitionSearch) {
        displayList = displayList.filter(s => {
            const name = `${s.lastName || ''} ${s.firstName || ''} ${s.nameInLatin || ''} ${s.chineseName || ''}`.toLowerCase();
            const id = (s.displayId || s.id || '').toLowerCase();
            const phone = (s.phone || '').toLowerCase();
            const teacher = (s.teacherName || s.homeroomTeacher || '').toLowerCase();
            return name.includes(currentTuitionSearch) || id.includes(currentTuitionSearch) || phone.includes(currentTuitionSearch) || teacher.includes(currentTuitionSearch);
        });
    }

    if (displayList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-5">
                    <div class="py-4">
                        <div class="stat-card-icon-bubble mx-auto mb-3" style="width: 56px; height: 56px; font-size: 1.6rem; background: rgba(80, 70, 229, 0.1); color: #5046e5;">
                            <i class="fi fi-rr-wallet"></i>
                        </div>
                        <h6 class="fw-bold mb-1" style="color: var(--staff-text-main);">រកមិនឃើញទិន្នន័យការបង់ប្រាក់ឡើយ</h6>
                        <p class="text-muted small mb-0">សូមសាកល្បងជ្រើសរើសចម្រាញ់ផ្សេង ឬស្វែងរកឈ្មោះសិស្សម្តងទៀត</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = displayList.map(s => {
        const fullName = `${s.lastName || ''} ${s.firstName || ''}`.trim() || 'N/A';
        const initials = getInitials(fullName);
        const pStatus = getPaymentStatus(s);

        const tuition = parseFloat(s.courseFee || s.tuitionFee || 0) || 0;
        const services = parseFloat(s.services || 0) || 0;
        const totalOwed = tuition + services;
        const paidAmount = parseFloat(s.paidAmount || s.totalPaid || (pStatus.status === 'paid' ? totalOwed : 0)) || 0;
        const remainingDebt = Math.max(0, totalOwed - paidAmount);

        const avatar = s.photoUrl || s.imageUrl ?
            `<div class="staff-avatar-ring me-3 overflow-hidden d-flex align-items-center justify-content-center"><img src="${s.photoUrl || s.imageUrl}" class="w-100 h-100" style="object-fit: cover;"></div>` :
            `<div class="staff-avatar-ring me-3 d-flex align-items-center justify-content-center bg-primary text-white fw-bold">${initials}</div>`;

        const dueDateText = s.nextPaymentDate && s.nextPaymentDate !== '01-01-100' ? s.nextPaymentDate : '-';

        return `
            <tr class="align-middle animate__animated animate__fadeIn">
                <td class="ps-4">
                    <div class="d-flex align-items-center">
                        ${avatar}
                        <div>
                            <div class="fw-bold staff-row-name">${fullName}</div>
                            <small class="text-muted"><span class="badge bg-light text-dark border me-1">${s.displayId || s.id || ''}</span>${s.chineseName || ''}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="fw-semibold text-dark">${s.classroom || s.grade || '-'}</div>
                    <small class="text-muted"><i class="fi fi-rr-clock me-1 text-primary"></i>${s.studyTime || '-'}</small>
                </td>
                <td>
                    <div class="fw-semibold text-dark">${s.teacherName || s.homeroomTeacher || '-'}</div>
                </td>
                <td>
                    <span class="fw-bold text-dark">$${tuition.toFixed(2)}</span>
                </td>
                <td>
                    <span class="fw-bold ${services > 0 ? 'text-primary' : 'text-muted'}">$${services.toFixed(2)}</span>
                </td>
                <td>
                    <div class="d-flex flex-column gap-1">
                        <small class="text-muted">សរុប៖ <strong class="text-dark">$${totalOwed.toFixed(2)}</strong></small>
                        <small class="text-success">បានបង់៖ <strong>$${paidAmount.toFixed(2)}</strong></small>
                        ${remainingDebt > 0 ? `<small class="text-danger">នៅខ្វះ៖ <strong>$${remainingDebt.toFixed(2)}</strong></small>` : ''}
                    </div>
                </td>
                <td>
                    <span class="small fw-semibold ${pStatus.status === 'overdue' ? 'text-danger' : 'text-dark'}">
                        <i class="fi fi-rr-calendar me-1 ${pStatus.status === 'overdue' ? 'text-danger' : 'text-primary'}"></i>${dueDateText}
                    </span>
                </td>
                <td>
                    <span class="badge ${pStatus.badge} px-2.5 py-1.5 rounded-pill shadow-xs">${pStatus.text}</span>
                </td>
                <td class="text-end pe-4">
                    <div class="d-flex justify-content-end gap-1.5">
                        <button class="btn btn-sm btn-action-primary" onclick="openStudentPaymentModal('${s.id}')" title="កត់ត្រាការបង់ប្រាក់">
                            <i class="fi fi-rr-wallet me-1"></i>បង់ប្រាក់
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

window.openNewPaymentModal = function() {
    document.getElementById('tuitionPaymentForm').reset();
    document.getElementById('pay-student-id').value = '';
    document.getElementById('pay-student-select-group').classList.remove('d-none');
    document.getElementById('pay-student-name').textContent = 'ជ្រើសរើសសិស្ស';
    document.getElementById('pay-student-details').textContent = 'សូមជ្រើសរើសសិស្សពីបញ្ជីខាងក្រោម';
    document.getElementById('pay-current-status').textContent = 'មិនទាន់ជ្រើសរើស';
    document.getElementById('pay-current-status').className = 'badge bg-secondary rounded-pill px-3';
    
    // Default today date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('pay-payment-date').value = today;

    const modalEl = document.getElementById('tuitionPaymentModal');
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
};

window.onSelectStudentForPayment = function(studentId) {
    if (!studentId) return;
    openStudentPaymentModal(studentId, true);
};

window.openStudentPaymentModal = function(studentId, keepModalOpen = false) {
    const student = cachedStudentsList.find(s => s.id === studentId);
    if (!student) return;

    document.getElementById('pay-student-id').value = student.id;
    document.getElementById('pay-student-select-group').classList.add('d-none');

    const fullName = `${student.lastName || ''} ${student.firstName || ''}`.trim() || 'N/A';
    document.getElementById('pay-student-name').textContent = `${fullName} (${student.displayId || student.id || ''})`;
    document.getElementById('pay-student-details').textContent = `ថ្នាក់៖ ${student.classroom || student.grade || '-'} | ម៉ោង៖ ${student.studyTime || '-'}`;

    const pStatus = getPaymentStatus(student);
    const statusEl = document.getElementById('pay-current-status');
    statusEl.textContent = pStatus.text;
    statusEl.className = `badge ${pStatus.badge} rounded-pill px-3`;

    const tuition = parseFloat(student.courseFee || student.tuitionFee || 0) || 0;
    const services = parseFloat(student.services || 0) || 0;
    const paid = parseFloat(student.paidAmount || student.totalPaid || 0) || 0;

    document.getElementById('pay-course-fee').value = tuition > 0 ? tuition : '';
    document.getElementById('pay-services-fee').value = services > 0 ? services : '';
    document.getElementById('pay-amount-paid').value = paid > 0 ? paid : '';

    calculateTuitionTotals();

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('pay-payment-date').value = student.paymentDate || today;
    document.getElementById('pay-next-due-date').value = student.nextPaymentDate || '';
    document.getElementById('pay-payment-method').value = student.paymentMethod || 'Cash';
    document.getElementById('pay-status-select').value = student.paymentStatus || (pStatus.status === 'paid' ? 'Paid' : 'Debt');
    document.getElementById('pay-notes').value = student.paymentNotes || '';

    if (!keepModalOpen) {
        const modalEl = document.getElementById('tuitionPaymentModal');
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    }
};

window.calculateTuitionTotals = function() {
    const courseFee = parseFloat(document.getElementById('pay-course-fee').value) || 0;
    const servicesFee = parseFloat(document.getElementById('pay-services-fee').value) || 0;
    const amountPaid = parseFloat(document.getElementById('pay-amount-paid').value) || 0;

    const totalOwed = courseFee + servicesFee;
    const remainingDebt = Math.max(0, totalOwed - amountPaid);

    document.getElementById('pay-total-owed').value = totalOwed.toFixed(2);
    document.getElementById('pay-remaining-debt').value = remainingDebt.toFixed(2);

    // Auto set status if fully paid
    const statusSelect = document.getElementById('pay-status-select');
    if (totalOwed > 0 && amountPaid >= totalOwed) {
        statusSelect.value = 'Paid';
    } else if (amountPaid > 0 && remainingDebt > 0) {
        statusSelect.value = 'Debt';
    }
};

window.handleSaveTuitionPayment = async function(event) {
    if (event) event.preventDefault();
    const studentId = document.getElementById('pay-student-id').value;
    if (!studentId) {
        if (typeof showAlertPremium === 'function') {
            showAlertPremium('សូមជ្រើសរើសសិស្សជាមុនសិន!', 'error');
        } else {
            alert('សូមជ្រើសរើសសិស្សជាមុនសិន!');
        }
        return;
    }

    const courseFee = parseFloat(document.getElementById('pay-course-fee').value) || 0;
    const services = parseFloat(document.getElementById('pay-services-fee').value) || 0;
    const paidAmount = parseFloat(document.getElementById('pay-amount-paid').value) || 0;
    const totalOwed = courseFee + services;
    const remainingAmount = Math.max(0, totalOwed - paidAmount);

    const paymentDate = document.getElementById('pay-payment-date').value;
    const nextPaymentDate = document.getElementById('pay-next-due-date').value;
    const paymentMethod = document.getElementById('pay-payment-method').value;
    const paymentStatus = document.getElementById('pay-status-select').value;
    const paymentNotes = document.getElementById('pay-notes').value.trim();

    const updateData = {
        courseFee: courseFee,
        services: services,
        paidAmount: paidAmount,
        totalPaid: paidAmount,
        remainingAmount: remainingAmount,
        paymentDate: paymentDate,
        nextPaymentDate: nextPaymentDate,
        paymentMethod: paymentMethod,
        paymentStatus: paymentStatus,
        paymentNotes: paymentNotes,
        lastPaymentUpdated: new Date().toISOString()
    };

    try {
        await firebase.database().ref(`students/${studentId}`).update(updateData);

        // Update local cache
        const idx = cachedStudentsList.findIndex(s => s.id === studentId);
        if (idx !== -1) {
            cachedStudentsList[idx] = { ...cachedStudentsList[idx], ...updateData };
        }

        if (typeof showAlertPremium === 'function') {
            showAlertPremium('កត់ត្រាការបង់ថ្លៃសិក្សា & សេវាកម្មបានជោគជ័យ!', 'success');
        }

        // Close modal
        const modalEl = document.getElementById('tuitionPaymentModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        updateTuitionDashboardStats();
        renderTuitionTable();
    } catch (e) {
        console.error('Error saving payment:', e);
        if (typeof showAlertPremium === 'function') {
            showAlertPremium('មានបញ្ហាក្នុងការរក្សាទុក៖ ' + e.message, 'error');
        } else {
            alert('មានបញ្ហាក្នុងការរក្សាទុក៖ ' + e.message);
        }
    }
};

function updateStaffCarrierDisplay(input) {
    if (!input) return;
    const inputId = input.id;
    const label = document.querySelector(`label[for="${inputId}"]`);
    if (!label) return;

    let carrierDisplay = label.querySelector('.carrier-badge');
    if (!carrierDisplay) {
        carrierDisplay = document.createElement('span');
        carrierDisplay.className = 'carrier-badge badge rounded-pill ms-2';
        carrierDisplay.style.fontSize = '0.7rem';
        carrierDisplay.style.padding = '2px 8px';
        carrierDisplay.style.display = 'none';
        label.appendChild(carrierDisplay);
    }

    const carrier = getCarrierName(input.value);
    if (carrier) {
        const carrierColors = {
            'Smart': '#a4cc39',
            'Cellcard': '#f37021',
            'Metfone': '#ed1c24',
            'Seatel': '#00a0e9',
            'Cootel': '#fbb03b'
        };
        carrierDisplay.textContent = carrier;
        carrierDisplay.style.backgroundColor = carrierColors[carrier] || '#888';
        carrierDisplay.style.color = 'white';
        carrierDisplay.style.display = 'inline-block';
    } else {
        carrierDisplay.style.display = 'none';
    }
}

/**
 * Toggle custom position input field & auto-adjust modal view mode dynamically
 */
function toggleCustomPosition(value) {
    const container = document.getElementById('custom-position-container');
    const customInput = document.getElementById('staff-position-custom');
    if (value === 'ផ្សេងៗ') {
        if (container) container.classList.remove('d-none');
        if (customInput) customInput.setAttribute('required', 'true');
    } else {
        if (container) container.classList.add('d-none');
        if (customInput) {
            customInput.removeAttribute('required');
            customInput.value = '';
        }
    }

    // Auto-detect dynamic view mode for staff modal based on position!
    const hrPositions = ['នាយក', 'អនុនាយក', 'បុគ្គលិកការិយាល័យ', 'បណ្ណារក្ស', 'គណនេយ្យករ', 'អ្នកសំអាត', 'សន្តិសុខ'];
    const teacherPositions = ['គ្រូភាសាខ្មែរ', 'គ្រូភាសាចិនពេញម៉ោង', 'គ្រូភាសាចិនក្រៅម៉ោង', 'គ្រូភាសាអង់គ្លេស'];
    if (hrPositions.includes(value)) {
        if (typeof applyStaffModalViewMode === 'function') {
            applyStaffModalViewMode('hr');
        }
    } else if (teacherPositions.includes(value) || (value && value.includes('គ្រូ'))) {
        if (typeof applyStaffModalViewMode === 'function') {
            applyStaffModalViewMode('teachers');
        }
    }
}
window.toggleCustomPosition = toggleCustomPosition;

/**
 * Load user profile information
 */
function loadUserProfile() {
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            const updateUi = (data) => {
                const nameEl = document.getElementById('user-display-name');
                const emailEl = document.getElementById('user-display-email');
                const roleEl = document.getElementById('user-role-badge');
                if (nameEl) nameEl.textContent = (data && (data.name || data.displayName)) || user.displayName || (user.email ? user.email.split('@')[0] : 'User');
                if (emailEl) emailEl.textContent = user.email || '';
                if (roleEl) roleEl.textContent = (data && data.role) || 'Admin';
            };

            // Use auth session or cached profile
            if (window.currentUserProfileData) {
                updateUi(window.currentUserProfileData);
            } else {
                updateUi({ displayName: user.displayName, role: 'Staff' });
            }
        }
    });
}

/**
 * Handle logout
 */
function handleLogout(event) {
    event.preventDefault();
    firebase.auth().signOut().then(() => {
        window.location.href = 'login.html';
    }).catch((error) => {
        console.error('Logout error:', error);
    });
}

/**
 * Load all staff from Firebase
 */
function loadAllStaff() {
    const staffRef = firebase.database().ref('staff');

    staffRef.on('value', (snapshot) => {
        staffData = snapshot.val() || {};
        // renderStaffList(); // Removed right panel
        // updateStaffCount(); // Removed right panel
        renderDashboard(); // Update Dashboard
        if (typeof renderClassroomHub === 'function' && window.currentStaffModuleView === 'classrooms') {
            renderClassroomHub();
        }
        if (typeof renderHrHub === 'function' && window.currentStaffModuleView === 'hr') {
            renderHrHub();
        }
    });
}

/**
 * Render staff list in sidebar
 */
/**
 * Render staff list (Disabled as Right Panel was removed)
 */
function renderStaffList(filterText = '') {
    // Function disabled as Right Panel was removed
    return;
}

/**
 * Get initials from name
 */
function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

/**
 * Get status class
 */
function getStatusClass(status) {
    const statusMap = {
        'active': 'status-active',
        'inactive': 'status-inactive',
        'on-leave': 'status-on-leave'
    };
    return statusMap[status] || 'status-inactive';
}

/**
 * Get status text in Khmer
 */
function getStatusText(status) {
    const statusMap = {
        'active': 'កំពុងធ្វើការ',
        'inactive': 'ឈប់ធ្វើការ',
        'on-leave': 'សម្រាក'
    };
    return statusMap[status] || 'មិនដឹង';
}

/**
 * Update staff count
 */
/**
 * Update staff count
 */
function updateStaffCount() {
    // Function disabled as Right Panel was removed
}

/**
 * Setup search functionality
 */
function setupSearchFunctionality() {
    // Function disabled as Right Panel search was removed
}

/**
 * Select a staff member to view details
 */
function selectStaff(staffId) {
    currentStaffId = staffId;
    const staff = staffData[staffId];

    if (!staff) return;

    // Display staff details
    displayStaffDetails(staff, staffId);
}

/**
 * Render Dashboard with Stats and Lists
 */
/**
 * Render Dashboard with Stats and Lists
 */
let compositionChart = null;
let currentDashboardFilter = 'all'; // all, teacher, admin
let currentDashboardSearch = '';

function renderDashboard() {
    const staffArray = Object.entries(staffData).map(([id, data]) => ({ id, ...data }));

    // 1. Calculate Stats
    const totalStaff = staffArray.length;
    // Filter generic teachers and explicitly "homeroom" or "class" teachers if identified
    const teachers = staffArray.filter(s => {
        const pos = (s.position || '').toLowerCase();
        return pos.includes('គ្រូ') || pos.includes('teacher');
    });

    const femaleStaff = staffArray.filter(s => (s.gender || '').toLowerCase() === 'female' || (s.gender || '') === 'ស្រី' || (s.gender || '') === 'female');
    const maleStaff = staffArray.filter(s => (s.gender || '').toLowerCase() === 'male' || (s.gender || '') === 'ប្រុស' || (s.gender || '') === 'male');
    const inactiveStaff = staffArray.filter(s => s.status !== 'active');

    // Count for specific categories based on Position OR Study Type
    const khmerTeachers = staffArray.filter(s =>
        (s.position || '') === 'គ្រូភាសាខ្មែរ' ||
        (s.studyType || '') === 'ភាសាខ្មែរ'
    );
    const chineseTeachers = staffArray.filter(s =>
        (s.position || '') === 'គ្រូភាសាចិនពេញម៉ោង' ||
        (s.position || '') === 'គ្រូភាសាចិន' ||
        (s.studyType || '') === 'ថ្នាក់ភាសាចិនពេញម៉ោង'
    );
    const chineseParttimeTeachers = staffArray.filter(s =>
        (s.position || '') === 'គ្រូភាសាចិនក្រៅម៉ោង' ||
        (s.studyType || '') === 'ថ្នាក់ភាសាចិនក្រៅម៉ោង'
    );

    const khmerTeacherIds = new Set(khmerTeachers.map(t => t.id));
    const chineseTeacherIds = new Set(chineseTeachers.map(t => t.id));
    const chineseParttimeTeacherIds = new Set(chineseParttimeTeachers.map(t => t.id));

    const officeStaff = staffArray.filter(s =>
        !khmerTeacherIds.has(s.id) &&
        !chineseTeacherIds.has(s.id) &&
        !chineseParttimeTeacherIds.has(s.id)
    );

    // 2. Update Cards
    if (document.getElementById('dash-total-staff')) document.getElementById('dash-total-staff').textContent = totalStaff;
    if (document.getElementById('dash-khmer-teachers')) document.getElementById('dash-khmer-teachers').textContent = khmerTeachers.length;
    if (document.getElementById('dash-chinese-teachers')) document.getElementById('dash-chinese-teachers').textContent = chineseTeachers.length;
    if (document.getElementById('dash-chinese-parttime-teachers')) document.getElementById('dash-chinese-parttime-teachers').textContent = chineseParttimeTeachers.length;
    if (document.getElementById('dash-office-staff')) document.getElementById('dash-office-staff').textContent = officeStaff.length;

    // Update Progress Bars
    if (totalStaff > 0) {
        const khmerBar = document.getElementById('khmer-bar');
        const chineseBar = document.getElementById('chinese-bar');
        const chineseParttimeBar = document.getElementById('chinese-parttime-bar');
        const officeBar = document.getElementById('office-bar');
        if (khmerBar) khmerBar.style.width = (khmerTeachers.length / totalStaff * 100) + '%';
        if (chineseBar) chineseBar.style.width = (chineseTeachers.length / totalStaff * 100) + '%';
        if (chineseParttimeBar) chineseParttimeBar.style.width = (chineseParttimeTeachers.length / totalStaff * 100) + '%';
        if (officeBar) officeBar.style.width = (officeStaff.length / totalStaff * 100) + '%';
    }

    // Update Tab Counts
    if (document.getElementById('count-all')) document.getElementById('count-all').textContent = totalStaff;
    if (document.getElementById('count-khmer-teachers')) document.getElementById('count-khmer-teachers').textContent = khmerTeachers.length;
    if (document.getElementById('count-chinese-teachers')) document.getElementById('count-chinese-teachers').textContent = chineseTeachers.length;
    if (document.getElementById('count-chinese-parttime-teachers')) document.getElementById('count-chinese-parttime-teachers').textContent = chineseParttimeTeachers.length;
    if (document.getElementById('count-office-staff')) document.getElementById('count-office-staff').textContent = officeStaff.length;

    // Update Sidebar & Tab Sub-badges
    const classCount = (typeof masterClasses !== 'undefined' && masterClasses.length > 0)
        ? masterClasses.length
        : ((typeof masterClassrooms !== 'undefined' && masterClassrooms.length > 0) ? masterClassrooms.length : 0);
    const teachersCount = (khmerTeachers.length + chineseTeachers.length + chineseParttimeTeachers.length) || teachers.length || 0;
    const hrCount = officeStaff.length || 0;

    const badgeClassrooms = document.getElementById('sub-badge-classrooms');
    const badgeTeachers = document.getElementById('sub-badge-teachers');
    const badgeHr = document.getElementById('sub-badge-hr');
    const tabClassrooms = document.getElementById('tab-badge-classrooms');
    const tabTeachers = document.getElementById('tab-badge-teachers');
    const tabHr = document.getElementById('tab-badge-hr');

    if (badgeClassrooms) badgeClassrooms.textContent = classCount;
    if (tabClassrooms) tabClassrooms.textContent = classCount;
    if (badgeTeachers) badgeTeachers.textContent = teachersCount;
    if (tabTeachers) tabTeachers.textContent = teachersCount;
    if (badgeHr) badgeHr.textContent = hrCount;
    if (tabHr) tabHr.textContent = hrCount;

    // 4. Render Staff List Table based on Filter
    filterDashboardList(currentDashboardFilter);
}

let currentDashboardSort = { column: 'name', dir: 'asc' };

window.sortDashboardStaff = function(colKey) {
    if (currentDashboardSort.column === colKey) {
        currentDashboardSort.dir = currentDashboardSort.dir === 'asc' ? 'desc' : 'asc';
    } else {
        currentDashboardSort.column = colKey;
        currentDashboardSort.dir = 'asc';
    }
    updateDashboardSortIcons();
    filterDashboardList(currentDashboardFilter);
};

function updateDashboardSortIcons() {
    ['name', 'gender', 'position', 'phone', 'hireDate', 'status'].forEach(k => {
        const icon = document.getElementById(`sort-icon-${k}`);
        if (!icon) return;
        if (currentDashboardSort.column === k) {
            icon.className = `fi fi-rr-arrow-${currentDashboardSort.dir === 'asc' ? 'up' : 'down'} ms-1 text-primary fw-bold`;
            icon.style.opacity = '1';
        } else {
            icon.className = 'fi fi-rr-sort ms-1 opacity-50 sort-icon';
            icon.style.opacity = '0.4';
        }
    });
}

window.updateDashboardTableHeader = function(mode) {
    const colName = document.getElementById('col-header-name');
    const colPos = document.getElementById('col-header-position');
    if (mode === 'teachers') {
        if (colName) colName.textContent = 'ឈ្មោះគ្រូបង្រៀន';
        if (colPos) colPos.innerHTML = 'មុខតំណែង &amp; ថ្នាក់បង្រៀន';
    } else if (mode === 'hr') {
        if (colName) colName.textContent = 'ឈ្មោះបុគ្គលិក HR/រដ្ឋបាល';
        if (colPos) colPos.innerHTML = 'មុខតំណែង &amp; ដេប៉ាតឺម៉ង់';
    } else {
        if (colName) colName.textContent = 'ឈ្មោះបុគ្គលិក';
        if (colPos) colPos.innerHTML = 'មុខតំណែង';
    }
    updateDashboardSortIcons();
};

window.handleDashboardSearch = (val) => {
    currentDashboardSearch = val.trim().toLowerCase();
    filterDashboardList(currentDashboardFilter);
};

window.filterDashboardList = (filterType) => {
    currentDashboardFilter = filterType;
    const tbody = document.getElementById('dashboard-staff-table-body');
    if (!tbody) return;

    // Update dynamic headers
    const currentMode = window.currentStaffModuleView || 'teachers';
    updateDashboardTableHeader(currentMode);

    let displayStaff = Object.entries(staffData).map(([id, data]) => ({ id, ...data }));

    // Type Filtering
    if (filterType === 'khmer_teacher') {
        displayStaff = displayStaff.filter(s => (s.position || '') === 'គ្រូភាសាខ្មែរ' || (s.studyType || '') === 'ភាសាខ្មែរ');
    } else if (filterType === 'chinese_teacher') {
        displayStaff = displayStaff.filter(s => (s.position || '') === 'គ្រូភាសាចិនពេញម៉ោង' || (s.position || '') === 'គ្រូភាសាចិន' || (s.studyType || '') === 'ថ្នាក់ភាសាចិនពេញម៉ោង');
    } else if (filterType === 'chinese_parttime_teacher') {
        displayStaff = displayStaff.filter(s => (s.position || '') === 'គ្រូភាសាចិនក្រៅម៉ោង' || (s.studyType || '') === 'ថ្នាក់ភាសាចិនក្រៅម៉ោង');
    } else if (filterType === 'office_staff') {
        displayStaff = displayStaff.filter(s =>
            (s.position || '') !== 'គ្រូភាសាខ្មែរ' &&
            (s.position || '') !== 'គ្រូភាសាចិនពេញម៉ោង' &&
            (s.position || '') !== 'គ្រូភាសាចិន' &&
            (s.position || '') !== 'គ្រូភាសាចិនក្រៅម៉ោង'
        );
    }

    // Search Filtering
    if (currentDashboardSearch) {
        displayStaff = displayStaff.filter(s =>
            (s.nameKhmer || '').toLowerCase().includes(currentDashboardSearch) ||
            (s.name || '').toLowerCase().includes(currentDashboardSearch) ||
            (s.nameEnglish || '').toLowerCase().includes(currentDashboardSearch) ||
            (s.nameChinese || '').toLowerCase().includes(currentDashboardSearch) ||
            (s.position || '').toLowerCase().includes(currentDashboardSearch) ||
            (s.phone || '').includes(currentDashboardSearch) ||
            (s.homeroomClass || '').toLowerCase().includes(currentDashboardSearch) ||
            (s.classroom || '').toLowerCase().includes(currentDashboardSearch) ||
            (s.department || '').toLowerCase().includes(currentDashboardSearch) ||
            (s.level || '').toLowerCase().includes(currentDashboardSearch)
        );
    }

    if (displayStaff.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-5">
                    <div class="py-4">
                        <div class="stat-card-icon-bubble mx-auto mb-3" style="width: 56px; height: 56px; font-size: 1.6rem; background: rgba(138, 14, 91, 0.1); color: var(--staff-primary);">
                            <i class="fi fi-rr-search-alt"></i>
                        </div>
                        <h6 class="fw-bold mb-1" style="color: var(--staff-text-main);">រកមិនឃើញទិន្នន័យបុគ្គលិក ឬគ្រូបង្រៀនឡើយ</h6>
                        <p class="text-muted small mb-0">សូមសាកល្បងស្វែងរកពាក្យផ្សេង ឬចុចប៊ូតុងបន្ថែមថ្មី</p>
                    </div>
                </td>
            </tr>`;
        window.currentFilteredStaffList = [];
        updateStaffBulkActionBar();
        return;
    }

    // Dynamic Multi-Column Sorting
    displayStaff.sort((a, b) => {
        const dir = currentDashboardSort.dir === 'asc' ? 1 : -1;
        const col = currentDashboardSort.column;
        if (col === 'name') {
            const nameA = (a.nameKhmer || a.name || a.nameEnglish || '').trim();
            const nameB = (b.nameKhmer || b.name || b.nameEnglish || '').trim();
            return dir * nameA.localeCompare(nameB, 'km');
        } else if (col === 'gender') {
            const gA = (a.gender || '').trim();
            const gB = (b.gender || '').trim();
            return dir * gA.localeCompare(gB, 'km');
        } else if (col === 'position') {
            const pA = (a.position || '').trim();
            const pB = (b.position || '').trim();
            return dir * pA.localeCompare(pB, 'km');
        } else if (col === 'phone') {
            const phA = (a.phone || '').toString().replace(/\D/g, '');
            const phB = (b.phone || '').toString().replace(/\D/g, '');
            return dir * phA.localeCompare(phB);
        } else if (col === 'hireDate') {
            const timeA = a.hireDate ? new Date(a.hireDate).getTime() : 0;
            const timeB = b.hireDate ? new Date(b.hireDate).getTime() : 0;
            return dir * (timeA - timeB);
        } else if (col === 'status') {
            const sA = (a.status || 'active').trim();
            const sB = (b.status || 'active').trim();
            return dir * sA.localeCompare(sB);
        }
        return 0;
    });

    window.currentFilteredStaffList = displayStaff;
    if (!window.selectedStaffIds) window.selectedStaffIds = new Set();

    tbody.innerHTML = displayStaff.map(t => {
        const safeName = t.nameKhmer || t.name || t.nameEnglish || 'មិនមានឈ្មោះ';
        const safeSubName = t.nameChinese || (t.nameKhmer ? (t.nameEnglish || '') : '') || '';
        const initials = getInitials(safeName);
        const hasHomeroom = t.homeroomClass && t.homeroomClass.trim().length > 0;
        const isSelected = window.selectedStaffIds.has(t.id);

        const avatarHtml = t.imageUrl ? 
            `<div class="staff-avatar-ring me-3 overflow-hidden d-flex align-items-center justify-content-center">
                 <img src="${t.imageUrl}" class="w-100 h-100" style="object-fit: cover;" alt="${escapeStaffHtml(safeName)}" onerror="this.parentElement.innerHTML='<span class=\'text-white fw-bold\'>${initials}</span>'">
             </div>` : 
            `<div class="staff-avatar-ring me-3 d-flex align-items-center justify-content-center text-white fw-bold" 
                  style="background: ${hasHomeroom ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #6366f1, #4f46e5)'}; font-size: 0.88rem;">
                 ${initials}
             </div>`;

        // 1. Gender Column (Dynamic luxury badge)
        const rawGender = (t.gender || '').trim().toLowerCase();
        const isFemale = rawGender === 'ស្រី' || rawGender === 'female' || rawGender === 'f';
        const isMale = rawGender === 'ប្រុស' || rawGender === 'male' || rawGender === 'm';
        const genderBadge = isFemale
            ? `<span class="badge rounded-pill" style="background: rgba(244, 114, 182, 0.15); color: #db2777; border: 1px solid rgba(244, 114, 182, 0.3); font-weight: 700; padding: 4px 10px; font-size: 0.78rem;"><i class="fi fi-rr-venus me-1"></i>ស្រី</span>`
            : isMale
            ? `<span class="badge rounded-pill" style="background: rgba(59, 130, 246, 0.15); color: #2563eb; border: 1px solid rgba(59, 130, 246, 0.3); font-weight: 700; padding: 4px 10px; font-size: 0.78rem;"><i class="fi fi-rr-mars me-1"></i>ប្រុស</span>`
            : `<span class="badge rounded-pill bg-light text-muted border px-2 py-0.5 small">-</span>`;

        // 2. Status Column (Active, On-Leave, Inactive)
        const rawStatus = (t.status || 'active').toLowerCase();
        let statusClass = 'active';
        let statusText = 'កំពុងធ្វើការ';
        if (rawStatus === 'on-leave' || rawStatus === 'leave' || rawStatus === 'សម្រាក' || rawStatus === 'សុំច្បាប់') {
            statusClass = 'on-leave';
            statusText = 'សុំច្បាប់';
        } else if (rawStatus === 'inactive' || rawStatus === 'resigned' || rawStatus === 'ឈប់ធ្វើការ' || rawStatus === 'ឈប់បម្រើការ') {
            statusClass = 'inactive';
            statusText = 'ឈប់បម្រើការ';
        }

        // 3. Hire Date & Tenure Duration
        const hireDateFormatted = t.hireDate ? formatDate(t.hireDate) : '';
        const tenureText = calculateTenure(t.hireDate);

        return `
        <tr class="align-middle animate__animated animate__fadeIn ${isSelected ? 'staff-row-selected' : ''}" id="staff-row-${t.id}">
            <td class="ps-3 pe-2 text-center" onclick="event.stopPropagation()">
                <input class="form-check-input custom-staff-checkbox staff-row-checkbox" type="checkbox" value="${t.id}" data-name="${escapeStaffHtml(safeName)}" onchange="handleStaffRowCheckboxChange('${t.id}', this.checked)" ${isSelected ? 'checked' : ''}>
            </td>
            <td class="ps-2">
                <div class="d-flex align-items-center" onclick="selectStaff('${t.id}')" style="cursor: pointer;">
                    ${avatarHtml}
                    <div>
                        <div class="fw-bold staff-row-name text-nowrap">${escapeStaffHtml(safeName)}</div>
                        ${safeSubName ? `<div class="small text-muted" style="font-size: 0.8rem;">${escapeStaffHtml(safeSubName)}</div>` : ''}
                    </div>
                </div>
            </td>
            <td>${genderBadge}</td>
            <td>
                <span class="badge rounded-pill bg-light text-dark border shadow-2xs" style="font-size: 0.82rem; padding: 5px 12px; font-weight: 600;">
                    <i class="fi fi-rr-briefcase me-1 text-primary opacity-75"></i>${escapeStaffHtml(t.position || (window.currentStaffModuleView === 'hr' ? 'បុគ្គលិកទូទៅ' : 'គ្រូបង្រៀន'))}
                </span>
            </td>
            <td>${formatPhoneWithCarrier(t.phone)}</td>
            <td>
                ${hireDateFormatted && hireDateFormatted !== 'មិនមាន' ? `
                    <div>
                        <span class="small text-dark fw-semibold d-inline-flex align-items-center gap-1">
                            <i class="fi fi-rr-calendar text-primary" style="font-size: 0.8rem;"></i>${hireDateFormatted}
                        </span>
                        ${tenureText ? `<div class="text-muted mt-0.5" style="font-size: 0.72rem;"><i class="fi fi-rr-time-forward me-1 opacity-75"></i>${tenureText}</div>` : ''}
                    </div>
                ` : `<span class="text-muted small">-</span>`}
            </td>
            <td>
                <span class="status-pill ${statusClass}">
                    <span class="pulse-dot"></span>
                    ${statusText}
                </span>
            </td>
            <td class="text-end pe-4">
                <div class="d-flex justify-content-end gap-1.5">
                    <button class="btn-row-action btn-row-action-edit" onclick="editStaff('${t.id}')" title="កែសម្រួលព័ត៌មាន (Edit)">
                        <i class="fi fi-rr-edit"></i>
                    </button>
                    <button class="btn-row-action btn-row-action-delete" onclick="deleteStaff('${t.id}', '${escapeStaffHtml(safeName)}')" title="លុបទិន្នន័យ (Delete)">
                        <i class="fi fi-rr-trash"></i>
                    </button>
                    <button class="btn-row-action btn-row-action-view" onclick="selectStaff('${t.id}')" title="មើលព័ត៌មានលម្អិត (View Profile)">
                        <i class="fi fi-rr-eye"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');

    updateStaffBulkActionBar();
};

// --------------------------------------------------------------------------
// Staff Batch / Bulk Selection & Action Logic
// --------------------------------------------------------------------------
window.selectedStaffIds = new Set();
window.currentFilteredStaffList = [];

window.updateStaffBulkActionBar = function() {
    const bar = document.getElementById('staff-bulk-action-bar');
    const countEl = document.getElementById('selected-staff-count');
    const headerCheck = document.getElementById('staff-select-all-header');
    const deleteBtn = document.getElementById('btn-bulk-delete-staff');
    const size = window.selectedStaffIds ? window.selectedStaffIds.size : 0;

    if (countEl) countEl.textContent = size;

    if (bar) {
        if (size > 0) {
            bar.classList.remove('d-none');
        } else {
            bar.classList.add('d-none');
        }
    }

    if (deleteBtn) {
        deleteBtn.disabled = size === 0;
    }

    if (headerCheck) {
        const visibleList = window.currentFilteredStaffList || [];
        if (visibleList.length === 0 || size === 0) {
            headerCheck.checked = false;
            headerCheck.indeterminate = false;
        } else {
            const visibleSelectedCount = visibleList.filter(s => window.selectedStaffIds.has(s.id)).length;
            if (visibleSelectedCount === 0) {
                headerCheck.checked = false;
                headerCheck.indeterminate = false;
            } else if (visibleSelectedCount === visibleList.length) {
                headerCheck.checked = true;
                headerCheck.indeterminate = false;
            } else {
                headerCheck.checked = false;
                headerCheck.indeterminate = true;
            }
        }
    }
};

window.toggleSelectAllStaff = function(isChecked) {
    if (!window.selectedStaffIds) window.selectedStaffIds = new Set();

    const listToSelect = (window.currentFilteredStaffList && window.currentFilteredStaffList.length > 0)
        ? window.currentFilteredStaffList 
        : Object.entries(staffData).map(([id, d]) => ({ id, ...d }));

    if (isChecked) {
        listToSelect.forEach(s => window.selectedStaffIds.add(s.id));
    } else {
        listToSelect.forEach(s => window.selectedStaffIds.delete(s.id));
    }

    // Update row checkboxes and row highlights in DOM
    document.querySelectorAll('.staff-row-checkbox').forEach(cb => {
        const id = cb.value;
        const selected = window.selectedStaffIds.has(id);
        cb.checked = selected;
        const tr = document.getElementById(`staff-row-${id}`);
        if (tr) tr.classList.toggle('staff-row-selected', selected);
    });

    updateStaffBulkActionBar();
};

window.handleStaffRowCheckboxChange = function(staffId, isChecked) {
    if (!window.selectedStaffIds) window.selectedStaffIds = new Set();

    if (isChecked) {
        window.selectedStaffIds.add(staffId);
    } else {
        window.selectedStaffIds.delete(staffId);
    }

    const tr = document.getElementById(`staff-row-${staffId}`);
    if (tr) tr.classList.toggle('staff-row-selected', isChecked);

    updateStaffBulkActionBar();
};

window.clearSelectedStaff = function() {
    if (window.selectedStaffIds) window.selectedStaffIds.clear();
    document.querySelectorAll('.staff-row-checkbox').forEach(cb => {
        cb.checked = false;
    });
    document.querySelectorAll('tr.staff-row-selected').forEach(tr => {
        tr.classList.remove('staff-row-selected');
    });
    const headerCheck = document.getElementById('staff-select-all-header');
    if (headerCheck) {
        headerCheck.checked = false;
        headerCheck.indeterminate = false;
    }
    updateStaffBulkActionBar();
};

window.bulkDeleteSelectedStaff = async function() {
    if (!window.selectedStaffIds || window.selectedStaffIds.size === 0) {
        Swal.fire({
            icon: 'info',
            title: 'សូមជ្រើសរើសបុគ្គលិក',
            text: 'សូមជ្រើសរើសបុគ្គលិកយ៉ាងហោចណាស់ម្នាក់ដើម្បីលុប',
            confirmButtonColor: '#8a0e5b'
        });
        return;
    }

    const selectedIds = Array.from(window.selectedStaffIds);
    const count = selectedIds.length;
    const staffNames = selectedIds.map(id => staffData[id]?.nameKhmer || 'បុគ្គលិក').filter(Boolean);

    // 1. Check if any selected staff are teachers with assigned students
    Swal.fire({
        title: 'កំពុងពិនិត្យទិន្នន័យ...',
        html: `កំពុងពិនិត្យសិស្សក្នុងបន្ទុករបស់បុគ្គលិកដែលបានជ្រើស <strong>${count}</strong> នាក់...`,
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    let allStudentsList = [];
    if (cachedStudentsList && cachedStudentsList.length > 0) {
        allStudentsList = cachedStudentsList;
    } else {
        try {
            const studentsSnapshot = await firebase.database().ref('students').once('value');
            const val = studentsSnapshot.val() || {};
            allStudentsList = Object.entries(val).map(([k, v]) => ({ key: k, id: k, ...v }));
            cachedStudentsList = allStudentsList;
        } catch (e) {
            console.warn('Failed to query students:', e);
        }
    }

    const affectedTeachers = [];
    let totalAffectedStudents = 0;

    selectedIds.forEach(id => {
        const staff = staffData[id];
        if (!staff) return;
        const sName = (staff.nameKhmer || '').trim().toLowerCase();
        let studentCount = 0;
        allStudentsList.forEach(s => {
            if (!s) return;
            const tName = (s.teacherName || '').trim().toLowerCase();
            const hName = (s.homeroomTeacher || '').trim().toLowerCase();
            if (tName === sName || hName === sName) {
                studentCount++;
            }
        });
        if (studentCount > 0) {
            affectedTeachers.push({ name: staff.nameKhmer, count: studentCount });
            totalAffectedStudents += studentCount;
        }
    });

    Swal.close();

    // 2. Confirmation Dialog
    let warningHtml = `
        <div class="text-start p-2">
            <p class="mb-2">តើអ្នកពិតជាចង់លុបបុគ្គលិកដែលបានជ្រើសរើសចំនួន <strong>${count} នាក់</strong> នេះចេញពីប្រព័ន្ធមែនទេ?</p>
            <div class="p-2.5 rounded-3 bg-light border mb-3" style="max-height: 120px; overflow-y: auto; font-size: 0.85rem;">
                ${staffNames.slice(0, 10).map(n => `<span class="badge bg-secondary-subtle text-dark border me-1 mb-1">${n}</span>`).join('')}
                ${staffNames.length > 10 ? `<span class="badge bg-secondary text-white">+${staffNames.length - 10} នាក់ទៀត</span>` : ''}
            </div>
    `;

    if (affectedTeachers.length > 0) {
        warningHtml += `
            <div class="alert alert-warning p-2.5 mb-2 d-flex align-items-start gap-2" style="font-size: 0.82rem;">
                <i class="fi fi-rr-exclamation text-warning fs-5 mt-0.5"></i>
                <div>
                    <strong>សូមប្រុងប្រយ័ត្ន៖</strong> ក្នុងចំណោមបុគ្គលិកដែលត្រូវលុប មានគ្រូ <strong>${affectedTeachers.length} នាក់</strong> កំពុងមានសិស្សទទួលបន្ទុកសរុប <strong>${totalAffectedStudents} នាក់</strong>៖<br>
                    ${affectedTeachers.map(t => `• ${t.name} (${t.count} សិស្ស)`).join('<br>')}
                    <div class="text-danger mt-1 fw-bold">ប្រសិនបើលុប ព័ត៌មានគ្រូរបស់សិស្សទាំងនេះនឹងត្រូវបានទុកទំនេរ!</div>
                </div>
            </div>
        `;
    }

    warningHtml += `
            <p class="text-danger small mb-0 fw-semibold"><i class="fi fi-rr-info me-1"></i>សកម្មភាពនេះមិនអាចត្រឡប់ក្រោយវិញបានឡើយ!</p>
        </div>
    `;

    const confirmRes = await Swal.fire({
        title: 'បញ្ជាក់ការលុបបុគ្គលិកទាំងអស់ដែលបានជ្រើស',
        html: warningHtml,
        icon: affectedTeachers.length > 0 ? 'warning' : 'question',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6c757d',
        confirmButtonText: `<i class="fi fi-rr-trash me-1"></i> បាទ/ចាស លុបទាំង ${count} នាក់`,
        cancelButtonText: 'បោះបង់'
    });

    if (!confirmRes.isConfirmed) return;

    // 3. Batch delete from Firebase
    Swal.fire({
        title: 'កំពុងលុបទិន្នន័យ...',
        html: `កំពុងលុបបុគ្គលិកចំនួន <strong>${count}</strong> នាក់...`,
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        const staffRef = firebase.database().ref('staff');
        const updates = {};
        selectedIds.forEach(id => {
            updates[id] = null;
        });

        await staffRef.update(updates);

        // Also clean up local staffData
        selectedIds.forEach(id => {
            delete staffData[id];
        });

        // Log bulk deletion activity
        if (typeof window.logStaffActivity === 'function') {
            window.logStaffActivity(
                'delete',
                `លុបបុគ្គលិកជាក្រុម (${count} នាក់)`,
                `បានលុបបុគ្គលិកចំនួន ${count} នាក់ចេញពីប្រព័ន្ធ៖ ${staffNames.slice(0, 5).join(', ')}${staffNames.length > 5 ? '...' : ''}`,
                { count, deletedIds: selectedIds }
            );
        }

        // Clear selection
        clearSelectedStaff();

        // Refresh UI
        renderDashboard();

        Swal.fire({
            icon: 'success',
            title: 'លុបបានជោគជ័យ!',
            text: `បុគ្គលិកចំនួន ${count} នាក់ត្រូវបានលុបចេញពីប្រព័ន្ធដោយជោគជ័យ`,
            confirmButtonColor: '#8a0e5b',
            timer: 2000
        });

    } catch (err) {
        console.error('Error in bulkDeleteSelectedStaff:', err);
        Swal.fire({
            icon: 'error',
            title: 'កំហុស!',
            text: 'មានបញ្ហាក្នុងការលុបទិន្នន័យ៖ ' + (err.message || err),
            confirmButtonColor: '#8a0e5b'
        });
    }
};

/**
 * Show Dashboard View
 */
function showDashboard() {
    document.getElementById('dashboard-view').classList.remove('d-none');
    document.getElementById('staff-details-view').classList.add('d-none');
    currentStaffId = null;

    // Update sidebar active state skipped as Right Panel was removed
}

/**
 * Display staff details in main content area
 */
/**
 * Display staff details in main content area
 */
async function displayStaffDetails(staff, staffId) {
    // Hide Dashboard, Show Details
    document.getElementById('dashboard-view').classList.add('d-none');
    document.getElementById('staff-details-view').classList.remove('d-none');



    const detailsContent = document.getElementById('staff-details-content');
    const initials = getInitials(staff.nameKhmer);
    const statusClass = getStatusClass(staff.status);
    const statusText = getStatusText(staff.status);

    detailsContent.innerHTML = `
        <div class="staff-details-card animate__animated animate__fadeIn">
            <div class="staff-details-header">
                ${staff.imageUrl ? 
                    `<div class="staff-details-avatar overflow-hidden border">
                        <img src="${staff.imageUrl}" class="w-100 h-100" style="object-fit: cover;">
                     </div>` : 
                    `<div class="staff-details-avatar">${initials}</div>`
                }
                <div class="staff-details-info flex-grow-1">
                    <h3 class="mb-1">${staff.nameKhmer || 'មិនមាន'}</h3>
                    <p class="mb-1"><strong>${staff.position || 'មិនមាន'}</strong></p>
                    ${staff.nameChinese ? `<p class="text-muted small mb-2">${staff.nameChinese}</p>` : ''}
                    <span class="badge ${staff.status === 'active' ? 'bg-success' : 'bg-secondary'} rounded-pill px-3">${statusText}</span>
                </div>
                <div class="d-flex gap-2 flex-wrap">
                    <button class="btn btn-outline-success shadow-sm rounded-pill" onclick="openTeacherScheduleModal('${escapeStaffJs(staff.nameKhmer)}')">
                        <i class="fi fi-rr-calendar-clock me-1"></i> កាលវិភាគបង្រៀន
                    </button>
                    <button class="btn btn-outline-primary shadow-sm rounded-pill" onclick="editStaff('${staffId}')">
                        <i class="fi fi-rr-edit me-1"></i> កែប្រែ
                    </button>
                    <button class="btn btn-outline-danger shadow-sm rounded-pill" onclick="deleteStaff('${staffId}', '${escapeStaffJs(staff.nameKhmer)}')">
                        <i class="fi fi-rr-trash me-1"></i> លុប
                    </button>
                </div>
            </div>

            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label"><i class="fi fi-rr-user"></i> ឈ្មោះភាសាខ្មែរ</div>
                    <div class="info-value text-pink-dark fw-bold">${staff.nameKhmer || 'មិនមាន'}</div>
                </div>

                <div class="info-item">
                    <div class="info-label"><i class="fi fi-rr-user"></i> ឈ្មោះចិន</div>
                    <div class="info-value">${staff.nameChinese || 'មិនមាន'}</div>
                </div>

                <div class="info-item">
                    <div class="info-label"><i class="fi fi-rr-briefcase"></i> មុខតំណែង</div>
                    <div class="info-value"><span class="badge bg-light text-dark border">${staff.position || 'មិនមាន'}</span></div>
                </div>

                <div class="info-item">
                    <div class="info-label"><i class="fi fi-rr-venus-mars"></i> ភេទ</div>
                    <div class="info-value">${staff.gender || 'មិនមាន'}</div>
                </div>

                <div class="info-item">
                    <div class="info-label"><i class="fi fi-rr-calendar"></i> ថ្ងៃខែឆ្នាំកំណើត</div>
                    <div class="info-value">${staff.dob ? formatDate(staff.dob) : 'មិនមាន'}</div>
                </div>

                <div class="info-item">
                    <div class="info-label"><i class="fi fi-rr-calendar-check"></i> ថ្ងៃចូលធ្វើការ</div>
                    <div class="info-value">${staff.hireDate ? formatDate(staff.hireDate) : 'មិនមាន'}</div>
                </div>

                <div class="info-item">
                    <div class="info-label"><i class="fi fi-rr-phone-call"></i> លេខទូរស័ព្ទ</div>
                    <div class="info-value">${formatPhoneWithCarrier(staff.phone)}</div>
                </div>

                ${staff.emergencyContact ? `
                    <div class="info-item">
                        <div class="info-label"><i class="fi fi-rr-phone-call text-danger"></i> លេខទាក់ទងបន្ទាន់</div>
                        <div class="info-value text-danger fw-semibold">${formatPhoneWithCarrier(staff.emergencyContact)}</div>
                    </div>
                ` : ''}

                ${staff.nationalId ? `
                    <div class="info-item">
                        <div class="info-label"><i class="fi fi-rr-id-badge text-secondary"></i> អត្តសញ្ញាណប័ណ្ណ</div>
                        <div class="info-value fw-medium">${staff.nationalId}</div>
                    </div>
                ` : ''}

                ${staff.department ? `
                    <div class="info-item">
                        <div class="info-label"><i class="fi fi-rr-network-cloud text-success"></i> ផ្នែក / ដេប៉ាតឺម៉ង់</div>
                        <div class="info-value"><span class="badge bg-success-subtle text-success border border-success-subtle px-3 py-1 rounded-pill">${staff.department}</span></div>
                    </div>
                ` : ''}

                ${staff.employmentType ? `
                    <div class="info-item">
                        <div class="info-label"><i class="fi fi-rr-user-time text-primary"></i> ប្រភេទការងារ</div>
                        <div class="info-value"><span class="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 rounded-pill">${staff.employmentType}</span></div>
                    </div>
                ` : ''}

                ${staff.workShift ? `
                    <div class="info-item">
                        <div class="info-label"><i class="fi fi-rr-clock-three text-info"></i> វេនបំពេញការងារ</div>
                        <div class="info-value"><span class="badge bg-info-subtle text-info-emphasis border border-info-subtle px-3 py-1 rounded-pill">${staff.workShift}</span></div>
                    </div>
                ` : ''}

                <div class="info-item">
                    <div class="info-label"><i class="fi fi-rr-marker"></i> អាសយដ្ឋាន</div>
                    <div class="info-value">${staff.address || 'មិនមាន'}</div>
                </div>

                ${staff.studyProgram ? `
                    <div class="info-item">
                        <div class="info-label"><i class="fi fi-rr-book-alt text-primary"></i> វគ្គសិក្សា</div>
                        <div class="info-value"><span class="badge bg-primary text-white">${staff.studyProgram}</span></div>
                    </div>
                ` : ''}

                ${staff.level ? `
                    <div class="info-item">
                        <div class="info-label"><i class="fi fi-rr-layers"></i> កម្រិតបង្រៀន</div>
                        <div class="info-value"><span class="badge bg-info text-dark">${staff.level}</span></div>
                    </div>
                ` : ''}

                ${staff.studyType ? `
                    <div class="info-item">
                        <div class="info-label"><i class="fi fi-rr-apps text-danger"></i> ប្រភេទវគ្គសិក្សា</div>
                        <div class="info-value"><span class="badge bg-danger text-white">${staff.studyType}</span></div>
                    </div>
                ` : ''}

                ${staff.classroom ? `
                    <div class="info-item">
                        <div class="info-label"><i class="fi fi-rr-door-open text-warning"></i> បន្ទប់សិក្សា (Classroom)</div>
                        <div class="info-value"><span class="badge bg-warning text-dark px-3 py-1 rounded-pill"><i class="fi fi-rr-marker me-1"></i> ${staff.classroom}</span></div>
                    </div>
                ` : ''}

                ${staff.scheduleDays ? `
                    <div class="info-item">
                        <div class="info-label"><i class="fi fi-rr-calendar-lines text-primary"></i> ថ្ងៃបង្រៀន (Schedule Days)</div>
                        <div class="info-value"><span class="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 rounded-pill"><i class="fi fi-rr-calendar-check me-1"></i> ${(() => {
                            const map = {
                                'mon': 'ច័ន្ទ', 'tue': 'អង្គារ', 'wed': 'ពុធ', 'thu': 'ព្រហស្បតិ៍', 'fri': 'សុក្រ', 'sat': 'សៅរ៍', 'sun': 'អាទិត្យ',
                                'mon-fri': 'ច័ន្ទ ដល់ សុក្រ (Mon-Fri)', 'mon-sat': 'ច័ន្ទ ដល់ សៅរ៍ (Mon-Sat)', 'weekend': 'ចុងសប្តាហ៍ (Sat-Sun)'
                            };
                            return staff.scheduleDays.split(',').map(d => map[d.trim().toLowerCase()] || d.trim()).join(', ');
                        })()}</span></div>
                    </div>
                ` : ''}

                ${staff.homeroomClass ? `
                    <div class="info-item" style="grid-column: 1 / -1;">
                        <div class="info-label"><i class="fi fi-rr-diploma text-success"></i> ថ្នាក់បន្ទុក (Homeroom Classes)</div>
                        <div class="info-value d-flex flex-wrap gap-2 pt-1">
                            ${staff.homeroomClass.split(',').map(c => c.trim()).filter(Boolean).map(c => `
                                <span class="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 rounded-pill font-weight-bold shadow-sm">
                                    <i class="fi fi-rr-graduation-cap me-1"></i> ${c}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                ${staff.teachingHours ? `
                    <div class="info-item" style="grid-column: 1 / -1;">
                        <div class="info-label"><i class="fi fi-rr-clock text-info"></i> ម៉ោងបង្រៀន (Teaching Hours)</div>
                        <div class="info-value d-flex flex-wrap gap-2 pt-1">
                            ${staff.teachingHours.split(',').map(h => h.trim()).filter(Boolean).map(h => `
                                <span class="badge bg-info-subtle text-info-emphasis border border-info-subtle px-3 py-1 rounded-pill">
                                    <i class="fi fi-rr-time-forward me-1"></i> ${h}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <div class="info-item">
                    <div class="info-label"><i class="fi fi-rr-key"></i> លេខកូដសម្ងាត់ (PIN)</div>
                    <div class="info-value"><span class="badge bg-warning text-dark fw-bold">${staff.pin || '2024'}</span></div>
                </div>

                ${staff.contract ? `
                    <div class="info-item" style="grid-column: 1 / -1;">
                        <div class="info-label"><i class="fi fi-rr-document"></i> កុងត្រា</div>
                        <div class="info-value">${staff.contract}</div>
                    </div>
                ` : ''}

                ${staff.notes ? `
                    <div class="info-item" style="grid-column: 1 / -1;">
                        <div class="info-label"><i class="fi fi-rr-document"></i> កំណត់ចំណាំ</div>
                        <div class="info-value">${staff.notes}</div>
                    </div>
                ` : ''}
            </div>

            <!-- Assigned Students Section -->
            <div id="assigned-students-container" class="assigned-students-section">
                <div class="assigned-students-title">
                    <i class="fi fi-rr-users"></i> សិស្សទទួលបន្ទុក
                </div>
                <div class="text-center py-5">
                    <div class="spinner-border text-primary" role="status"></div>
                    <p class="mt-2 text-muted">កំពុងទាញយកទិន្នន័យសិស្ស...</p>
                </div>
            </div>
        </div>
    `;

    // Fetch assigned students asynchronously
    try {
        const snapshot = await firebase.database().ref('students').once('value');
        const students = snapshot.val() || {};
        const staffName = (staff.nameKhmer || '').trim().toLowerCase();

        const assignedStudents = Object.values(students).filter(s => {
            const sTeacher = (s.teacherName || '').trim().toLowerCase();
            const sHomeroom = (s.homeroomTeacher || '').trim().toLowerCase();
            return sTeacher === staffName || sHomeroom === staffName;
        });

        const container = document.getElementById('assigned-students-container');
        if (!container) return;

        if (assignedStudents.length > 0) {
            container.innerHTML = `
                <div class="assigned-students-title justify-content-between">
                    <div class="d-flex align-items-center">
                        <i class="fi fi-rr-users"></i> សិស្សទទួលបន្ទុក
                        <span class="badge bg-pink-primary rounded-pill ms-2" style="background-color: #8a0e5b !important;">${assignedStudents.length} នាក់</span>
                    </div>
                    <button class="btn btn-sm btn-warning rounded-pill text-white px-3 fw-bold shadow-sm" onclick="transferStudents('${staff.nameKhmer}')">
                        <i class="fi fi-rr-shuffle me-1"></i> ផ្ទេរសិស្ស
                    </button>
                </div>
                <div class="student-chip-grid">
                    ${assignedStudents.map(s => {
                const sName = `${s.lastName || ''} ${s.firstName || ''}`.trim();
                const sInitials = getInitials(sName);
                const sClass = s.classroom || s.grade || 'N/A';
                const sId = s.displayId || 'ID-?';
                const isDropout = s.enrollmentStatus === 'dropout' || s.status === 'dropout' || s.isDropout === true;

                const pStatus = getPaymentStatus(s);

                return `
                            <div class="student-chip ${isDropout ? 'opacity-75 grayscale' : ''}">
                                <div class="student-chip-avatar" style="background: ${isDropout ? '#f1f1f1' : 'linear-gradient(135deg, #fff, #f8f9fa)'}">
                                    ${sInitials}
                                </div>
                                <div class="student-chip-info">
                                    <div class="student-chip-name text-nowrap" title="${sName}">${sName}</div>
                                    <div class="student-chip-class">
                                        <span class="badge bg-light text-dark border-0 p-0 me-1" style="font-size: 0.7rem;">${sId}</span>
                                        <i class="fi fi-rr-graduation-cap small"></i> ${sClass}
                                        ${s.studyTime ? `<span class="badge bg-info text-dark ms-1" style="font-size: 0.65rem; padding: 2px 6px;"><i class="fi fi-rr-clock small me-1"></i>${s.studyTime}</span>` : ''}
                                        <span class="ms-1 badge ${pStatus.badge}" style="font-size: 0.65rem; padding: 2px 6px;">${pStatus.text}</span>
                                    </div>
                                </div>
                                ${isDropout ? '<span class="badge bg-danger p-1 rounded-circle ms-auto" title="Dropout" style="width:8px; height:8px; display:inline-block;"></span>' : ''}
                            </div>
                        `;
            }).join('')}
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="assigned-students-title">
                    <i class="fi fi-rr-users"></i> សិស្សទទួលបន្ទុក
                </div>
                <div class="text-center py-5 bg-light rounded-4 border border-dashed">
                    <i class="fi fi-rr-info text-muted fa-2x mb-2 opacity-50"></i>
                    <p class="text-muted mb-0">មិនមានសិស្សទទួលបន្ទុកទេសម្រាប់គ្រូនេះ</p>
                </div>
            `;
        }
    } catch (error) {
        console.error("Error loading assigned students:", error);
        container.innerHTML = `<div class="alert alert-danger">មានកំហុសក្នុងការទាញយកទិន្នន័យសិស្ស</div>`;
    }
}

/**
 * Convert numbers to Khmer numerals
 */
function toKhmerNum(num) {
    const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
    return String(num).split('').map(d => khmerDigits[d] || d).join('');
}

/**
 * Format date to readable format with Khmer months and numerals
 * Format: ថ្ងៃ[ឈ្មោះថ្ងៃ] ទី[លេខថ្ងៃ] ខែ[ឈ្មោះខែ] ឆ្នាំ[លេខឆ្នាំ]
 */
const khmerDays = ["អាទិត្យ", "ចន្ទ", "អង្គារ", "ពុធ", "ព្រហស្បតិ៍", "សុក្រ", "សៅរ៍"];

function formatDate(dateString) {
    if (!dateString || ['N/A', '', 'មិនមាន', 'null', 'undefined'].includes(dateString)) return 'មិនមាន';
    
    let d = new Date(dateString);
    
    // If not a standard machine date, try to parse it
    if (isNaN(d.getTime())) {
        const engDate = convertToEnglishDate(dateString);
        if (engDate) d = new Date(engDate);
    }
    
    if (isNaN(d.getTime())) return dateString;

    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
}



// ----------------------------------------------------
// Student Payment Status Helper Functions
// ----------------------------------------------------

const parseCurrency = (val) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    const str = val.toString().replace(/[^0-9.-]/g, '');
    return parseFloat(str) || 0;
};

const calculateTotalAmount = (student) => {
    if (!student) return 0;
    const tuitionFee = parseCurrency(student.tuitionFee);
    const materialFee = parseCurrency(student.materialFee);
    const adminFee = parseCurrency(student.adminFee);
    const discount = parseCurrency(student.discount);
    const totalAmount = tuitionFee + materialFee + adminFee - discount;
    return totalAmount > 0 ? totalAmount : 0;
};

const calculateTotalPaid = (student) => {
    if (!student) return 0;
    let totalPaid = parseCurrency(student.initialPayment);
    if (student.installments) {
        const installments = Array.isArray(student.installments) ? student.installments : Object.values(student.installments);
        installments.forEach(inst => {
            if (inst.paid === true || inst.status === 'paid') {
                totalPaid += parseCurrency(inst.paidAmount || inst.amount);
            } else if (inst.status === 'partial' && inst.paidAmount) {
                totalPaid += parseCurrency(inst.paidAmount);
            }
        });
    }
    return totalPaid;
};

const calculateRemainingAmount = (student) => {
    if (!student) return 0;
    if ((parseInt(student.paymentMonths) || 0) === 48) return 0;
    return Math.max(0, calculateTotalAmount(student) - calculateTotalPaid(student));
};

const convertToEnglishDate = (dateStr) => {
    if (!dateStr || ['មិនមាន', 'N/A', '', 'undefined', 'null'].includes(dateStr)) return null;

    if (typeof dateStr !== 'string') return null;

    // Standardize input
    let cleanStr = dateStr.replace(/ថ្ងៃទី|កាលបរិច្ឆេទ|ថ្ងៃ|ខែ|ឆ្នាំ/g, ' ').replace(/\s+/g, ' ').trim();

    // A. Check for standard ISO or YYYY-MM-DD
    if (cleanStr.match(/^\d{4}-\d{2}-\d{2}/)) {
        const d = new Date(cleanStr);
        if (!isNaN(d.getTime())) {
            return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
        }
    }

    // B. Split and analyze parts
    const parts = cleanStr.split(/[-\/.\s]/).filter(p => p.trim() !== '');
    if (parts.length < 3) return null;

    let day = NaN, month = NaN, year = NaN;

    // Detect month (Khmer or English)
    const KHMER_MONTHS_LOCAL = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];
    const ENG_MONTHS_LOCAL = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Try finding month in parts[1] (Standard DD-MM-YYYY or DD-MMM-YYYY)
    let mIdx = -1;
    
    // Check Part 1 (Middle)
    mIdx = KHMER_MONTHS_LOCAL.findIndex(m => parts[1].includes(m));
    if (mIdx === -1) {
        mIdx = ENG_MONTHS_LOCAL.findIndex(m => parts[1].toLowerCase().includes(m.toLowerCase()));
    }
    
    if (mIdx !== -1) {
        day = parseInt(parts[0]);
        month = mIdx + 1;
        year = parseInt(parts[2]);
    } else {
        // Try finding month in parts[0] (Standard MM-DD-YYYY)
        mIdx = KHMER_MONTHS_LOCAL.findIndex(m => parts[0].includes(m));
        if (mIdx === -1) {
            mIdx = ENG_MONTHS_LOCAL.findIndex(m => parts[0].toLowerCase().includes(m.toLowerCase()));
        }
        
        if (mIdx !== -1) {
            month = mIdx + 1;
            day = parseInt(parts[1]);
            year = parseInt(parts[2]);
        } else {
            // Numeric fallback (DD-MM-YYYY)
            day = parseInt(parts[0]);
            month = parseInt(parts[1]);
            year = parseInt(parts[2]);
        }
    }

    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

    return `${month}/${day}/${year}`;
};

/**
 * Global Payment Status Evaluator for Students
 */
function getPaymentStatus(student) {
    if (!student) return { text: 'មិនមាន', badge: 'status-pending', status: 'pending', daysRemaining: 0 };

    // ១. ឆែកករណីបង់ផ្តាច់ (៤៨ ខែ ឬ ស្ថានភាពបង់ផ្ដាច់)
    const isFullPaid = (parseInt(student.paymentMonths) || 0) === 48 ||
        (student.nextPaymentDate && (student.nextPaymentDate === 'Completed' || student.nextPaymentDate === '01-01-100' || String(student.nextPaymentDate).includes('បង់ផ្តាច់'))) ||
        (student.enrollmentStatus === 'paidOff' || student.enrollmentStatus === 'graduated');

    if (isFullPaid) {
        return { text: '✅ បង់រួច', badge: 'status-paid', status: 'paid', daysRemaining: 0 };
    }

    let daysDiff = 0;
    const nextDate = student.nextPaymentDate;
    let hasValidDate = false;

    if (nextDate && !['មិនមាន', '', 'N/A', 'undefined', 'null'].includes(nextDate)) {
        const engDate = typeof convertToEnglishDate === 'function' ? convertToEnglishDate(nextDate) : null;
        if (engDate) {
            const parts = engDate.split('/');
            const nextDueDate = new Date(parts[2], parts[0] - 1, parts[1]);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (!isNaN(nextDueDate.getTime())) {
                hasValidDate = true;
                daysDiff = Math.ceil((nextDueDate - today) / (1000 * 60 * 60 * 24));

                if (nextDueDate.getDate() === today.getDate() &&
                    nextDueDate.getMonth() === today.getMonth() &&
                    nextDueDate.getFullYear() === today.getFullYear()) {
                    daysDiff = 0;
                }
            }
        }
    }

    // ២. ឆែកមើល "ពន្យារពេល" (Delay) ជាអាទិភាព
    if (student.paymentStatus === 'Delay' || student.paymentStatus === 'Postponed' || student.paymentStatus === 'ពន្យា' || student.paymentStatus === 'ពន្យារពេល') {
        return { text: '⏳ ពន្យារពេលបង់', badge: 'status-warning', status: 'delay', daysRemaining: daysDiff };
    }

    // ៣. ឆែកការជំពាក់ (Debt / Installment / Pending) ជាអាទិភាពមុននឹងឆែកថ្ងៃកំណត់
    const remaining = typeof calculateRemainingAmount === 'function' ? calculateRemainingAmount(student) : 0;
    if (remaining > 0.01) {
        const totalPaid = typeof calculateTotalPaid === 'function' ? calculateTotalPaid(student) : 0;
        if (totalPaid > 0) {
            return { text: '⚠️ នៅជំពាក់ (Debt)', badge: 'status-warning', status: 'installment', daysRemaining: daysDiff };
        }
        return { text: '❌ មិនទាន់បង់', badge: 'status-pending', status: 'pending', daysRemaining: daysDiff };
    }

    // ៤. ឆែកថ្ងៃកំណត់បង់ (សម្រាប់អ្នកដែលបង់រួចរាល់តាមដំណើរកាល ប៉ុន្តែដល់ពេលត្រូវបង់បន្ត)
    if (hasValidDate) {
        if (daysDiff === 0) return { text: '📅 ត្រូវបង់ថ្ងៃនេះ', badge: 'status-today', status: 'today', daysRemaining: 0 };
        if (daysDiff < 0) return { text: `❌ ហួសកំណត់ (${Math.abs(daysDiff)} ថ្ងៃ)`, badge: 'status-overdue', status: 'overdue', daysRemaining: daysDiff };
        if (daysDiff > 0 && daysDiff <= 10) return { text: `⏳ ជិតដល់ថ្ងៃ (${daysDiff} ថ្ងៃ)`, badge: 'status-warning', status: 'warning', daysRemaining: daysDiff };
    }

    // ៥. ករណីបង់រួចរាល់ (គ្មានទឹកប្រាក់ជំពាក់)
    return { text: '✅ បង់រួច', badge: 'status-paid', status: 'paid', daysRemaining: daysDiff };
}
window.getPaymentStatus = getPaymentStatus;


/**
 * Switch teacher wizard step (Step-num 1, 2, or 3)
 */
function switchTeacherWizardStep(stepNum) {
    const isHrMode = window.currentStaffModalMode === 'hr';
    const totalSteps = isHrMode ? 2 : 3;

    // Enforce valid step range
    let targetStep = parseInt(stepNum) || 1;
    if (targetStep < 1) targetStep = 1;
    if (targetStep > totalSteps) targetStep = totalSteps;
    window.currentTeacherWizardStep = targetStep;

    // Toggle Panels
    for (let i = 1; i <= 3; i++) {
        const panel = document.getElementById(`staff-wizard-panel-${i}`);
        if (panel) {
            if (i === targetStep) {
                panel.classList.add('active');
                panel.style.display = 'block';
            } else {
                panel.classList.remove('active');
                panel.style.display = 'none';
            }
        }
    }

    // Update Step Number Buttons
    const khmerDigits = ['១', '២', '៣'];
    for (let i = 1; i <= 3; i++) {
        const navBtn = document.getElementById(`staff-step-nav-${i}`);
        if (!navBtn) continue;

        if (isHrMode && i === 3) {
            navBtn.style.display = 'none';
            continue;
        } else {
            navBtn.style.display = 'flex';
        }

        const numText = navBtn.querySelector('.staff-step-num-text') || navBtn.querySelector('.staff-step-num');
        if (i < targetStep) {
            navBtn.classList.add('completed');
            navBtn.classList.remove('active');
            if (numText) numText.innerHTML = '<i class="fi fi-rr-check"></i>';
        } else if (i === targetStep) {
            navBtn.classList.add('active');
            navBtn.classList.remove('completed');
            if (numText) numText.textContent = khmerDigits[i - 1];
        } else {
            navBtn.classList.remove('active', 'completed');
            if (numText) numText.textContent = khmerDigits[i - 1];
        }
    }

    // Update Progress Bar Line
    const progressBar = document.getElementById('staff-wizard-progress');
    if (progressBar) {
        const progressPercentage = totalSteps > 1 ? ((targetStep - 1) / (totalSteps - 1)) * 100 : 0;
        progressBar.style.width = `${progressPercentage}%`;
    }

    // Update Footer Indicator
    const curStepEl = document.getElementById('staff-wizard-current-step');
    const totStepsEl = document.getElementById('staff-wizard-total-steps');
    const stepHintEl = document.getElementById('staff-wizard-step-hint');
    if (curStepEl) curStepEl.textContent = khmerDigits[targetStep - 1];
    if (totStepsEl) totStepsEl.textContent = khmerDigits[totalSteps - 1];

    if (stepHintEl) {
        if (targetStep === 1) {
            stepHintEl.textContent = 'បំពេញព័ត៌មានផ្ទាល់ខ្លួនគ្រូបង្រៀន & រូបថត';
        } else if (targetStep === 2) {
            stepHintEl.textContent = isHrMode ? 'ព័ត៌មានផ្នែកការងារ និងកិច្ចសន្យា' : 'មុខតំណែង និងកិច្ចសន្យាការងារ';
        } else {
            stepHintEl.textContent = 'ចាត់តាំងថ្នាក់បន្ទុក មុខវិជ្ជា និងម៉ោងបង្រៀន';
        }
    }

    // Update Footer Buttons
    const btnPrev = document.getElementById('btn-staff-wizard-prev');
    const btnNext = document.getElementById('btn-staff-wizard-next');
    const btnSave = document.getElementById('btn-save-staff-form');
    const staffIdInput = document.getElementById('staff-id');
    const isEdit = !!(staffIdInput && staffIdInput.value.trim());

    if (btnPrev) {
        btnPrev.style.display = targetStep > 1 ? 'inline-flex' : 'none';
    }

    const isLastStep = targetStep === totalSteps;
    if (btnNext) {
        btnNext.style.display = isLastStep ? 'none' : 'inline-flex';
    }

    if (btnSave) {
        // If editing, always allow saving from any step, or on final step
        if (isLastStep || isEdit) {
            btnSave.style.display = 'inline-flex';
            if (isEdit) {
                btnSave.innerHTML = '<i class="fi fi-rr-refresh me-1"></i> ធ្វើបច្ចុប្បន្នភាពទិន្នន័យ';
            } else {
                btnSave.innerHTML = '<i class="fi fi-rr-disk me-1"></i> រក្សាទុកទិន្នន័យ';
            }
        } else {
            btnSave.style.display = 'none';
        }
    }

    // Scroll modal smoothly to top
    const modalBody = document.querySelector('#staffModal .modal-body');
    if (modalBody) {
        modalBody.scrollTo({ top: 0, behavior: 'smooth' });
    }
}
window.switchTeacherWizardStep = switchTeacherWizardStep;

/**
 * Navigate teacher wizard by delta (+1 forward, -1 backward) with validation
 */
function navigateTeacherWizard(delta) {
    const current = window.currentTeacherWizardStep || 1;
    const target = current + delta;

    // Validate Step 1 when advancing forward
    if (delta > 0 && current === 1) {
        const nameKhmer = document.getElementById('staff-name-khmer');
        if (nameKhmer && !nameKhmer.value.trim()) {
            nameKhmer.focus();
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'warning',
                    title: 'សូមបញ្ចូលឈ្មោះភាសាខ្មែរ',
                    text: 'ឈ្មោះជាភាសាខ្មែរគឺជាព័ត៌មានចាំបាច់!',
                    confirmButtonText: 'យល់ព្រម'
                });
            } else {
                alert('សូមបញ្ចូលឈ្មោះភាសាខ្មែរ');
            }
            return false;
        }

        const gender = document.getElementById('staff-gender');
        if (gender && !gender.value) {
            gender.focus();
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'warning',
                    title: 'សូមជ្រើសរើសភេទ',
                    text: 'ភេទគឺជាព័ត៌មានចាំបាច់!',
                    confirmButtonText: 'យល់ព្រម'
                });
            } else {
                alert('សូមជ្រើសរើសភេទ');
            }
            return false;
        }
    }

    // Validate Step 2 when advancing forward
    if (delta > 0 && current === 2) {
        const position = document.getElementById('staff-position');
        if (position && !position.value) {
            position.focus();
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'warning',
                    title: 'សូមជ្រើសរើសមុខតំណែង',
                    text: 'មុខតំណែងគឺជាព័ត៌មានចាំបាច់!',
                    confirmButtonText: 'យល់ព្រម'
                });
            } else {
                alert('សូមជ្រើសរើសមុខតំណែង');
            }
            return false;
        }
    }

    switchTeacherWizardStep(target);
    return true;
}
window.navigateTeacherWizard = navigateTeacherWizard;

/**
 * Dynamic View Mode Application for Staff Modal (Teacher vs HR Mode)
 */
function applyStaffModalViewMode(mode) {
    window.currentStaffModalMode = mode;
    const badge = document.getElementById('staff-modal-mode-badge');
    const desc = document.getElementById('staff-modal-mode-desc');
    const btnTeachers = document.getElementById('btn-modal-mode-teachers');
    const btnHr = document.getElementById('btn-modal-mode-hr');
    const hrChips = document.getElementById('hr-quick-position-chips');
    const hrCardTitle = document.getElementById('hr-card-title');
    const hrCardBadge = document.getElementById('hr-card-badge');
    const stepNav3 = document.getElementById('staff-step-nav-3');
    const stepLabel2 = document.getElementById('staff-step-label-2');

    if (mode === 'hr') {
        if (badge) {
            badge.className = 'badge rounded-pill bg-success px-3 py-2 shadow-xs';
            badge.innerHTML = '<i class="fi fi-rr-users-alt me-1"></i> ទម្រង់បុគ្គលិកធនធានមនុស្ស &amp; រដ្ឋបាល (HR Mode)';
        }
        if (desc) desc.textContent = 'បញ្ចូលទិន្នន័យបុគ្គលិកការិយាល័យ ផ្នែកការងារ កិច្ចសន្យា និងវេនធ្វើការ';
        if (btnTeachers) btnTeachers.classList.remove('active');
        if (btnHr) btnHr.classList.add('active');

        if (hrChips) hrChips.classList.remove('d-none');
        if (hrCardTitle) hrCardTitle.textContent = 'ជំហានទី ២៖ ផ្នែកការងារ & កិច្ចសន្យា (HR Details)';
        if (hrCardBadge) hrCardBadge.textContent = 'ធនធានមនុស្ស & រដ្ឋបាល';
        if (stepLabel2) stepLabel2.textContent = 'មុខតំណែង & កិច្ចសន្យា';
        if (stepNav3) stepNav3.style.display = 'none';

        // In HR mode, total steps is 2
        const currentStep = window.currentTeacherWizardStep || 1;
        switchTeacherWizardStep(Math.min(currentStep, 2));
    } else {
        // Teacher mode
        if (badge) {
            badge.className = 'badge rounded-pill bg-primary px-3 py-2 shadow-xs';
            badge.innerHTML = '<i class="fi fi-rr-chalkboard-user me-1"></i> ទម្រង់គ្រូបង្រៀន (Teacher Mode)';
        }
        if (desc) desc.textContent = 'បញ្ចូលទិន្នន័យគ្រូបង្រៀន ម៉ោងបង្រៀន និងថ្នាក់បន្ទុក';
        if (btnTeachers) btnTeachers.classList.add('active');
        if (btnHr) btnHr.classList.remove('active');

        if (hrChips) hrChips.classList.add('d-none');
        if (hrCardTitle) hrCardTitle.textContent = 'ជំហានទី ២៖ មុខតំណែង & ការងារ';
        if (hrCardBadge) hrCardBadge.textContent = 'កិច្ចសន្យា & ផ្នែក';
        if (stepLabel2) stepLabel2.textContent = 'មុខតំណែង & ការងារ';
        if (stepNav3) stepNav3.style.display = 'flex';

        // In Teacher mode, total steps is 3
        const currentStep = window.currentTeacherWizardStep || 1;
        switchTeacherWizardStep(currentStep);
    }
}
window.applyStaffModalViewMode = applyStaffModalViewMode;

/**
 * HR Preset Quick Position Selector
 */
window.selectHrPositionPreset = function(position) {
    const posSelect = document.getElementById('staff-position');
    if (!posSelect) return;
    
    // Check if position option exists
    let exists = false;
    for (let i = 0; i < posSelect.options.length; i++) {
        if (posSelect.options[i].value === position) {
            posSelect.selectedIndex = i;
            exists = true;
            break;
        }
    }
    if (!exists) {
        posSelect.value = 'ផ្សេងៗ';
        toggleCustomPosition('ផ្សេងៗ');
        const customInput = document.getElementById('staff-position-custom');
        if (customInput) customInput.value = position;
    } else {
        toggleCustomPosition(position);
    }
    
    // Auto suggest department based on position
    const deptSelect = document.getElementById('staff-department');
    if (deptSelect) {
        if (['នាយក', 'អនុនាយក', 'បុគ្គលិកការិយាល័យ', 'ធនធានមនុស្ស'].includes(position)) {
            deptSelect.value = 'រដ្ឋបាល & ធនធានមនុស្ស';
        } else if (position === 'គណនេយ្យករ') {
            deptSelect.value = 'ហិរញ្ញវត្ថុ & គណនេយ្យ';
        } else if (position === 'បណ្ណារក្ស') {
            deptSelect.value = 'សិក្សាធិការ & បណ្ណាល័យ';
        } else if (position.includes('IT') || position.includes('ព័ត៌មានវិទ្យា')) {
            deptSelect.value = 'ព័ត៌មានវិទ្យា & IT';
        } else if (['សន្តិសុខ', 'អ្នកសំអាត'].includes(position)) {
            deptSelect.value = 'សន្តិសុខ & អនាម័យ';
        }
    }

    // Highlight clicked chip
    document.querySelectorAll('#hr-quick-position-chips .hr-preset-chip').forEach(btn => {
        if (btn.textContent.includes(position)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
};

// --------------------------------------------------------------------------
// Teacher Dynamic Registration & Academic Timetable Helpers
// --------------------------------------------------------------------------
let currentTeacherClassTags = [];

function renderTeacherClassTags() {
    const box = document.getElementById('staff-homeroom-tags-box');
    const hiddenInput = document.getElementById('staff-homeroom');
    if (!box) return;

    if (!currentTeacherClassTags || currentTeacherClassTags.length === 0) {
        box.innerHTML = '<span class="text-muted small opacity-75 fst-italic" id="staff-homeroom-empty-hint">មិនទាន់បានចាត់តាំងថ្នាក់...</span>';
        if (hiddenInput) hiddenInput.value = '';
        return;
    }

    if (hiddenInput) hiddenInput.value = currentTeacherClassTags.join(', ');

    box.innerHTML = currentTeacherClassTags.map((cls, idx) => `
        <span class="teaching-tag-item">
            <i class="fi fi-rr-book-open-reader me-1 text-primary"></i>
            <span>${escapeStaffHtml(cls)}</span>
            <button type="button" class="tag-remove-btn" onclick="removeTeacherClassTag(${idx})" title="លុបថ្នាក់នេះ">
                <i class="fi fi-rr-cross-small"></i>
            </button>
        </span>
    `).join('');
}

window.onSelectHomeroomClass = function(val) {
    if (!val) return;
    const clean = val.trim();
    if (!clean) return;

    if (!currentTeacherClassTags.includes(clean)) {
        currentTeacherClassTags.push(clean);
        renderTeacherClassTags();
    }

    const select = document.getElementById('staff-homeroom-select');
    if (select) select.value = '';

    // Auto-fill Level and Course Type if found from student records
    if (cachedStudentsList && cachedStudentsList.length > 0) {
        const found = cachedStudentsList.find(s => (s.classroom || s.grade || '') === clean);
        if (found) {
            if (found.studyLevel && document.getElementById('staff-level') && !document.getElementById('staff-level').value) {
                document.getElementById('staff-level').value = found.studyLevel;
            }
            if ((found.studyType || found.courseType) && document.getElementById('staff-study-type') && !document.getElementById('staff-study-type').value) {
                document.getElementById('staff-study-type').value = found.studyType || found.courseType;
            }
            if (found.classroom && document.getElementById('staff-classroom') && !document.getElementById('staff-classroom').value) {
                document.getElementById('staff-classroom').value = found.classroom;
                if (document.getElementById('staff-classroom-select')) document.getElementById('staff-classroom-select').value = found.classroom;
            }
        }
    }
};

window.quickAddTeacherClassTag = function() {
    const input = document.getElementById('staff-homeroom-quick-add');
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;

    if (!currentTeacherClassTags.includes(val)) {
        currentTeacherClassTags.push(val);
        renderTeacherClassTags();
    }
    input.value = '';
};

window.removeTeacherClassTag = function(idx) {
    if (idx >= 0 && idx < currentTeacherClassTags.length) {
        currentTeacherClassTags.splice(idx, 1);
        renderTeacherClassTags();
    }
};

window.selectTeacherSubjectPreset = function(subject) {
    document.querySelectorAll('.subject-preset-chip').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.includes(subject));
    });

    const posSelect = document.getElementById('staff-position');
    const customContainer = document.getElementById('custom-position-container');
    const customInput = document.getElementById('staff-position-custom');
    const levelSelect = document.getElementById('staff-level');
    const typeSelect = document.getElementById('staff-study-type');

    if (subject === 'ភាសាខ្មែរ') {
        if (posSelect) posSelect.value = 'គ្រូភាសាខ្មែរ';
        if (customContainer) customContainer.classList.add('d-none');
        if (levelSelect && !levelSelect.value) levelSelect.value = 'បឋមសិក្សា';
        if (typeSelect && !typeSelect.value) typeSelect.value = 'three-languages';
    } else if (subject === 'ភាសាចិន') {
        if (posSelect) posSelect.value = 'គ្រូភាសាចិនពេញម៉ោង';
        if (customContainer) customContainer.classList.add('d-none');
        if (levelSelect && !levelSelect.value) levelSelect.value = 'ភាសាចិន';
        if (typeSelect && !typeSelect.value) typeSelect.value = 'chinese-fulltime';
    } else if (subject === 'ភាសាអង់គ្លេស') {
        if (posSelect) posSelect.value = 'គ្រូភាសាអង់គ្លេស';
        if (customContainer) customContainer.classList.add('d-none');
        if (levelSelect && !levelSelect.value) levelSelect.value = 'ភាសាអង់គ្លេស';
        if (typeSelect && !typeSelect.value) typeSelect.value = 'one-language';
    } else if (subject === 'គណិតវិទ្យា') {
        if (posSelect) posSelect.value = 'ផ្សេងៗ';
        if (customContainer) customContainer.classList.remove('d-none');
        if (customInput) customInput.value = 'គ្រូគណិតវិទ្យា';
    } else {
        if (posSelect) posSelect.value = 'ផ្សេងៗ';
        if (customContainer) customContainer.classList.remove('d-none');
        if (customInput) customInput.value = 'គ្រូបង្រៀន';
    }
};

window.setTeacherDayPreset = function(preset) {
    ['mon-fri', 'mon-sat', 'weekend'].forEach(p => {
        const btn = document.getElementById(`btn-preset-${p}`);
        if (btn) btn.classList.toggle('active', p === preset);
    });

    const targetDays = {
        'mon-fri': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        'mon-sat': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        'weekend': ['Sat', 'Sun']
    }[preset] || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

    document.querySelectorAll('.day-toggle-btn').forEach(btn => {
        const d = btn.getAttribute('data-day');
        btn.classList.toggle('active', targetDays.includes(d));
    });

    const hiddenDays = document.getElementById('staff-schedule-days');
    if (hiddenDays) hiddenDays.value = targetDays.join(', ');
};

window.toggleTeacherDay = function(el) {
    el.classList.toggle('active');
    const activeDays = [];
    document.querySelectorAll('.day-toggle-btn.active').forEach(b => {
        const d = b.getAttribute('data-day');
        if (d) activeDays.push(d);
    });
    const hiddenDays = document.getElementById('staff-schedule-days');
    if (hiddenDays) hiddenDays.value = activeDays.join(', ');
};

function populateTeacherModalDropdowns() {
    // 1. Homeroom Classes dropdown (Strictly from masterClasses, NO ghost entries from students)
    const classSelect = document.getElementById('staff-homeroom-select');
    if (classSelect) {
        const curVal = classSelect.value;
        classSelect.innerHTML = (masterClasses && masterClasses.length > 0)
            ? '<option value="">+ ជ្រើសរើសថ្នាក់រៀន...</option>'
            : '<option value="">-- មិនទាន់មានថ្នាក់រៀន --</option>';
        (masterClasses || []).forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = `📚 ${c}`;
            classSelect.appendChild(opt);
        });
        if (curVal && (masterClasses || []).includes(curVal)) {
            classSelect.value = curVal;
        }
    }

    // 2. Classrooms dropdown (Strictly from masterClassrooms, NO ghost entries or grades)
    const roomSelect = document.getElementById('staff-classroom-select');
    if (roomSelect) {
        const curVal = roomSelect.value;
        roomSelect.innerHTML = (masterClassrooms && masterClassrooms.length > 0)
            ? '<option value="">-- ជ្រើសរើសបន្ទប់ --</option>'
            : '<option value="">-- មិនទាន់មានបន្ទប់រៀន --</option>';
        (masterClassrooms || []).forEach(r => {
            const opt = document.createElement('option');
            opt.value = r;
            opt.textContent = `🚪 បន្ទប់ ${r}`;
            roomSelect.appendChild(opt);
        });
        if (curVal && (masterClassrooms || []).includes(curVal)) {
            roomSelect.value = curVal;
        }
    }
}

/**
 * Open modal to add new staff (Dynamic based on active module: teachers or hr)
 */
function openAddStaffModal(context = null) {
    const activeContext = context || window.currentStaffModuleView || 'teachers';
    const form = document.getElementById('staffForm');
    if (form) form.reset();
    
    const staffIdEl = document.getElementById('staff-id');
    if (staffIdEl) staffIdEl.value = '';

    // Set default hire date to today
    const hireDateEl = document.getElementById('staff-hire-date');
    if (hireDateEl) hireDateEl.valueAsDate = new Date();
    
    const statusEl = document.getElementById('staff-status');
    if (statusEl) statusEl.value = 'active';

    if (document.getElementById('staff-level')) document.getElementById('staff-level').value = '';
    if (document.getElementById('staff-study-type')) document.getElementById('staff-study-type').value = '';
    if (document.getElementById('staff-homeroom')) document.getElementById('staff-homeroom').value = '';
    if (document.getElementById('staff-classroom')) document.getElementById('staff-classroom').value = '';
    if (document.getElementById('staff-classroom-select')) document.getElementById('staff-classroom-select').value = '';
    if (document.getElementById('staff-study-program')) document.getElementById('staff-study-program').value = '';
    if (document.getElementById('staff-study-program-select')) document.getElementById('staff-study-program-select').value = '';
    if (document.getElementById('staff-notes')) document.getElementById('staff-notes').value = '';
    if (document.getElementById('staff-pin')) document.getElementById('staff-pin').value = '2024';

    // Reset HR specific fields
    if (document.getElementById('staff-emergency-contact')) document.getElementById('staff-emergency-contact').value = '';
    if (document.getElementById('staff-national-id')) document.getElementById('staff-national-id').value = '';
    if (document.getElementById('staff-department')) document.getElementById('staff-department').value = 'រដ្ឋបាល & ធនធានមនុស្ស';
    if (document.getElementById('staff-employment-type')) document.getElementById('staff-employment-type').value = 'ពេញម៉ោង (Full-Time)';
    if (document.getElementById('staff-work-shift')) document.getElementById('staff-work-shift').value = '8:00 AM - 5:00 PM';
    if (document.getElementById('staff-contract-end')) document.getElementById('staff-contract-end').value = '';
    document.querySelectorAll('#hr-quick-position-chips .hr-preset-chip').forEach(btn => btn.classList.remove('active'));

    // Populate dropdowns & reset tags
    populateTeacherModalDropdowns();
    currentTeacherClassTags = [];
    renderTeacherClassTags();
    setTeacherDayPreset('mon-fri');

    // Reset custom position
    const customContainer = document.getElementById('custom-position-container');
    if (customContainer) customContainer.classList.add('d-none');
    const customInput = document.getElementById('staff-position-custom');
    if (customInput) {
        customInput.value = '';
        customInput.removeAttribute('required');
    }

    // Reset Image Preview
    if (typeof resetStaffImagePreview === 'function') {
        resetStaffImagePreview();
    } else {
        const previewContainer = document.getElementById('staffImagePreviewContainer');
        if (previewContainer) {
            previewContainer.innerHTML = '<i class="fi fi-rr-user text-muted" style="font-size: 2.2rem;"></i>';
        }
    }

    // Reset teaching hours checkboxes
    if (typeof renderTeachingHoursCheckboxes === 'function') {
        renderTeachingHoursCheckboxes();
    }

    // Dynamic Title & Position initialization
    const modalTitle = document.getElementById('staffModalTitle');
    const modalSubtitle = document.getElementById('staffModalSubtitle');
    const modalIcon = document.getElementById('staffModalHeaderIcon');
    const positionSelect = document.getElementById('staff-position');

    if (activeContext === 'hr') {
        if (modalTitle) {
            modalTitle.innerHTML = 'បន្ថែមបុគ្គលិកធនធានមនុស្ស &amp; រដ្ឋបាល (HR)';
        }
        if (modalSubtitle) {
            modalSubtitle.innerHTML = '<i class="fi fi-rr-shield-check text-warning"></i><span>បញ្ចូលទិន្នន័យបុគ្គលិកការិយាល័យ និងកិច្ចសន្យាការងារ</span>';
        }
        if (modalIcon) {
            modalIcon.innerHTML = '<i class="fi fi-rr-users-alt"></i>';
        }
        if (positionSelect) positionSelect.value = 'បុគ្គលិកការិយាល័យ';
        applyStaffModalViewMode('hr');
    } else {
        if (modalTitle) {
            modalTitle.innerHTML = 'បន្ថែមគ្រូបង្រៀនថ្មី (Teacher Registration)';
        }
        if (modalSubtitle) {
            modalSubtitle.innerHTML = '<i class="fi fi-rr-shield-check text-warning"></i><span>បញ្ចូលទិន្នន័យគ្រូបង្រៀន ថ្នាក់បន្ទុក និងកាលវិភាគបង្រៀន</span>';
        }
        if (modalIcon) {
            modalIcon.innerHTML = '<i class="fi fi-rr-chalkboard-user"></i>';
        }
        if (positionSelect) positionSelect.value = 'គ្រូភាសាខ្មែរ';
        applyStaffModalViewMode('teachers');
    }

    if (typeof switchTeacherWizardStep === 'function') {
        switchTeacherWizardStep(1);
    }

    const modalElement = document.getElementById('staffModal');
    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
    if (typeof updateStaffCarrierDisplay === 'function') {
        updateStaffCarrierDisplay(document.getElementById('staff-phone'));
    }
    modal.show();
}
window.openAddStaffModal = openAddStaffModal;

/**
 * Edit existing staff
 */
function editStaff(staffId) {
    const staff = staffData[staffId];
    if (!staff) return;

    const modalTitle = document.getElementById('staffModalTitle');
    if (modalTitle) {
        modalTitle.innerHTML = 'កែប្រែព័ត៌មានបុគ្គលិក';
    }
    const modalSubtitle = document.getElementById('staffModalSubtitle');
    if (modalSubtitle) {
        modalSubtitle.innerHTML = `<i class="fi fi-rr-edit text-warning"></i><span>កំពុងកែប្រែទិន្នន័យ៖ <strong class="text-white">${staff.nameKhmer || ''}</strong> (${staff.position || 'បុគ្គលិក'})</span>`;
    }
    const modalIcon = document.getElementById('staffModalHeaderIcon');
    if (modalIcon) {
        modalIcon.innerHTML = '<i class="fi fi-rr-user-pen"></i>';
    }

    document.getElementById('staff-id').value = staffId;
    document.getElementById('staff-name-khmer').value = staff.nameKhmer || '';
    document.getElementById('staff-name-chinese').value = staff.nameChinese || '';

    // Handle Position selection
    const positionSelect = document.getElementById('staff-position');
    const customContainer = document.getElementById('custom-position-container');
    const customInput = document.getElementById('staff-position-custom');

    const standardPositions = ['នាយក', 'អនុនាយក', 'គ្រូភាសាខ្មែរ', 'គ្រូភាសាចិន', 'គ្រូភាសាអង់គ្លេស', 'បុគ្គលិកការិយាល័យ', 'បណ្ណារក្ស', 'គណនេយ្យករ', 'អ្នកសំអាត', 'សន្តិសុខ'];

    if (staff.position && standardPositions.includes(staff.position)) {
        positionSelect.value = staff.position;
        customContainer.classList.add('d-none');
        customInput.value = '';
        customInput.removeAttribute('required');
    } else if (staff.position) {
        positionSelect.value = 'ផ្សេងៗ';
        customContainer.classList.remove('d-none');
        customInput.value = staff.position;
        customInput.setAttribute('required', 'true');
    } else {
        positionSelect.value = '';
        customContainer.classList.add('d-none');
        customInput.value = '';
        customInput.removeAttribute('required');
    }

    document.getElementById('staff-gender').value = staff.gender || '';
    document.getElementById('staff-dob').value = staff.dob || '';
    document.getElementById('staff-hire-date').value = staff.hireDate || '';
    document.getElementById('staff-contract').value = staff.contract || '';
    document.getElementById('staff-address').value = staff.address || '';
    document.getElementById('staff-status').value = staff.status || 'active';
    document.getElementById('staff-phone').value = staff.phone || '';
    if (document.getElementById('staff-emergency-contact')) document.getElementById('staff-emergency-contact').value = staff.emergencyContact || '';
    if (document.getElementById('staff-national-id')) document.getElementById('staff-national-id').value = staff.nationalId || '';
    if (document.getElementById('staff-department')) document.getElementById('staff-department').value = staff.department || 'រដ្ឋបាល & ធនធានមនុស្ស';
    if (document.getElementById('staff-employment-type')) document.getElementById('staff-employment-type').value = staff.employmentType || 'ពេញម៉ោង (Full-Time)';
    if (document.getElementById('staff-work-shift')) document.getElementById('staff-work-shift').value = staff.workShift || '8:00 AM - 5:00 PM';
    if (document.getElementById('staff-contract-end')) document.getElementById('staff-contract-end').value = staff.contractEndDate || '';
    document.getElementById('staff-level').value = staff.level || '';
    document.getElementById('staff-study-type').value = staff.studyType || '';
    
    // Homeroom class tags & dropdowns
    populateTeacherModalDropdowns();
    if (staff.homeroomClass) {
        currentTeacherClassTags = staff.homeroomClass.split(/[,;|]/).map(c => c.trim()).filter(Boolean);
    } else {
        currentTeacherClassTags = [];
    }
    renderTeacherClassTags();

    // Teaching schedule days
    const savedDays = (staff.scheduleDays || 'Mon, Tue, Wed, Thu, Fri').split(',').map(d => d.trim());
    document.querySelectorAll('.day-toggle-btn').forEach(btn => {
        const d = btn.getAttribute('data-day');
        btn.classList.toggle('active', savedDays.includes(d));
    });
    const hiddenDays = document.getElementById('staff-schedule-days');
    if (hiddenDays) hiddenDays.value = savedDays.join(', ');

    const roomVal = staff.classroom || staff.homeroomClass || '';
    if (document.getElementById('staff-classroom')) document.getElementById('staff-classroom').value = roomVal;
    if (document.getElementById('staff-classroom-select')) document.getElementById('staff-classroom-select').value = roomVal;
    const progVal = staff.studyProgram || '';
    if (document.getElementById('staff-study-program')) document.getElementById('staff-study-program').value = progVal;
    if (document.getElementById('staff-study-program-select')) document.getElementById('staff-study-program-select').value = progVal;

    document.getElementById('staff-notes').value = staff.notes || '';
    document.getElementById('staff-pin').value = staff.pin || '2024';
    
    // Load image preview
    const imgContainer = document.getElementById('staffImagePreviewContainer');
    if (staff.imageUrl) {
        imgContainer.innerHTML = `<img src="${staff.imageUrl}" class="w-100 h-100" style="object-fit: cover;">`;
    } else {
        imgContainer.innerHTML = `<i class="fi fi-rr-user text-muted" style="font-size: 2.2rem;"></i>`;
    }
    // Clear the file input
    document.getElementById('staff-image-input').value = '';

    // Handle teaching hours checkboxes
    renderTeachingHoursCheckboxes(staff.teachingHours || '');

    // Determine whether to show teacher mode or hr mode
    const teacherPositions = ['គ្រូភាសាខ្មែរ', 'គ្រូភាសាចិន', 'គ្រូភាសាចិនពេញម៉ោង', 'គ្រូភាសាចិនក្រៅម៉ោង', 'គ្រូភាសាអង់គ្លេស'];
    const isTeacher = (staff.position && (teacherPositions.includes(staff.position) || staff.position.includes('គ្រូ'))) || staff.teachingHours || staff.homeroomClass || staff.level;

    if (isTeacher) {
        if (modalTitle) modalTitle.innerHTML = 'កែប្រែព័ត៌មានគ្រូបង្រៀន (Update Teacher)';
        if (modalSubtitle) modalSubtitle.innerHTML = `<i class="fi fi-rr-edit text-warning"></i><span>កំពុងកែប្រែទិន្នន័យគ្រូបង្រៀន៖ <strong class="text-white">${staff.nameKhmer || ''}</strong> (${staff.position || 'គ្រូបង្រៀន'})</span>`;
        if (modalIcon) modalIcon.innerHTML = '<i class="fi fi-rr-chalkboard-user"></i>';
        applyStaffModalViewMode('teachers');
    } else {
        if (modalTitle) modalTitle.innerHTML = 'កែប្រែព័ត៌មានបុគ្គលិក HR/រដ្ឋបាល (Update HR)';
        if (modalSubtitle) modalSubtitle.innerHTML = `<i class="fi fi-rr-edit text-warning"></i><span>កំពុងកែប្រែទិន្នន័យបុគ្គលិក៖ <strong class="text-white">${staff.nameKhmer || ''}</strong> (${staff.position || 'បុគ្គលិក'})</span>`;
        if (modalIcon) modalIcon.innerHTML = '<i class="fi fi-rr-users-alt"></i>';
        applyStaffModalViewMode('hr');
    }

    if (typeof switchTeacherWizardStep === 'function') {
        switchTeacherWizardStep(1);
    }

    const modalElement = document.getElementById('staffModal');
    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
    if (typeof updateStaffCarrierDisplay === 'function') {
        updateStaffCarrierDisplay(document.getElementById('staff-phone'));
    }
    modal.show();
}

/**
 * Setup form submit handler
 */
function setupFormSubmit() {
    const form = document.getElementById('staffForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveStaff();
    });
}

/**
 * Save staff data to Firebase
 */
async function saveStaff() {
    const staffId = document.getElementById('staff-id').value;
    const isEdit = staffId !== '';

    let finalPosition = document.getElementById('staff-position').value;
    if (finalPosition === 'ផ្សេងៗ') {
        finalPosition = document.getElementById('staff-position-custom').value.trim();
    }

    const nameKhmer = document.getElementById('staff-name-khmer').value.trim();
    if (!nameKhmer) {
        if (typeof switchTeacherWizardStep === 'function') switchTeacherWizardStep(1);
        const nameEl = document.getElementById('staff-name-khmer');
        if (nameEl) nameEl.focus();
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'warning',
                title: 'សូមបញ្ចូលឈ្មោះភាសាខ្មែរ',
                text: 'ឈ្មោះជាភាសាខ្មែរគឺជាព័ត៌មានចាំបាច់!',
                confirmButtonText: 'យល់ព្រម'
            });
        } else {
            alert('សូមបញ្ចូលឈ្មោះភាសាខ្មែរ');
        }
        return;
    }

    const genderVal = document.getElementById('staff-gender').value;
    if (!genderVal) {
        if (typeof switchTeacherWizardStep === 'function') switchTeacherWizardStep(1);
        const genEl = document.getElementById('staff-gender');
        if (genEl) genEl.focus();
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'warning',
                title: 'សូមជ្រើសរើសភេទ',
                text: 'ភេទគឺជាព័ត៌មានចាំបាច់!',
                confirmButtonText: 'យល់ព្រម'
            });
        } else {
            alert('សូមជ្រើសរើសភេទ');
        }
        return;
    }

    if (!finalPosition) {
        if (typeof switchTeacherWizardStep === 'function') switchTeacherWizardStep(2);
        const posEl = document.getElementById('staff-position');
        if (posEl) posEl.focus();
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'warning',
                title: 'សូមជ្រើសរើសមុខតំណែង',
                text: 'មុខតំណែងគឺជាព័ត៌មានចាំបាច់!',
                confirmButtonText: 'យល់ព្រម'
            });
        } else {
            alert('សូមជ្រើសរើសមុខតំណែង');
        }
        return;
    }

    // Collect selected teaching hours
    const selectedHours = [];
    document.querySelectorAll('.teaching-hour-checkbox:checked').forEach(cb => {
        selectedHours.push(cb.value);
    });

    const customHours = document.getElementById('staff-custom-hours').value.trim();
    if (customHours) {
        customHours.split(',').forEach(h => {
            const trimmed = h.trim();
            if (trimmed && !selectedHours.includes(trimmed)) {
                selectedHours.push(trimmed);
            }
        });
    }

    const scheduleDays = document.getElementById('staff-schedule-days') ? document.getElementById('staff-schedule-days').value.trim() : '';

    const dataToSave = {
        nameKhmer: nameKhmer,
        nameChinese: document.getElementById('staff-name-chinese').value.trim(),
        position: finalPosition,
        gender: genderVal,
        dob: document.getElementById('staff-dob').value,
        hireDate: document.getElementById('staff-hire-date').value,
        contract: document.getElementById('staff-contract').value.trim(),
        contractEndDate: document.getElementById('staff-contract-end') ? document.getElementById('staff-contract-end').value : '',
        address: document.getElementById('staff-address').value.trim(),
        status: document.getElementById('staff-status').value,
        phone: document.getElementById('staff-phone').value.trim(),
        emergencyContact: document.getElementById('staff-emergency-contact') ? document.getElementById('staff-emergency-contact').value.trim() : '',
        nationalId: document.getElementById('staff-national-id') ? document.getElementById('staff-national-id').value.trim() : '',
        department: document.getElementById('staff-department') ? document.getElementById('staff-department').value.trim() : '',
        employmentType: document.getElementById('staff-employment-type') ? document.getElementById('staff-employment-type').value.trim() : '',
        workShift: document.getElementById('staff-work-shift') ? document.getElementById('staff-work-shift').value.trim() : '',
        level: document.getElementById('staff-level').value,
        studyType: document.getElementById('staff-study-type').value,
        homeroomClass: document.getElementById('staff-homeroom') ? document.getElementById('staff-homeroom').value.trim() : '',
        scheduleDays: scheduleDays,
        classroom: document.getElementById('staff-classroom') ? document.getElementById('staff-classroom').value.trim() : '',
        studyProgram: document.getElementById('staff-study-program') ? document.getElementById('staff-study-program').value.trim() : '',
        teachingHours: selectedHours.join(', '),
        notes: document.getElementById('staff-notes').value.trim(),
        pin: document.getElementById('staff-pin').value.trim() || '2024',
        updatedAt: new Date().toISOString()
    };

    // Auto sync classes and classroom to settings if new
    try {
        if (dataToSave.homeroomClass) {
            const hClasses = dataToSave.homeroomClass.split(',').map(c => c.trim()).filter(Boolean);
            const classesRef = firebase.database().ref('settings/classes');
            hClasses.forEach(cls => {
                if (typeof masterClasses !== 'undefined' && Array.isArray(masterClasses) && !masterClasses.includes(cls)) {
                    classesRef.push(cls);
                    masterClasses.push(cls);
                }
            });
        }
        if (dataToSave.classroom && typeof masterClassrooms !== 'undefined' && Array.isArray(masterClassrooms) && !masterClassrooms.includes(dataToSave.classroom)) {
            firebase.database().ref('settings/classrooms').push(dataToSave.classroom);
            masterClassrooms.push(dataToSave.classroom);
        }
    } catch (e) {
        console.warn('Auto-sync settings failed:', e);
    }

    // Handle Image Upload
    const imageInput = document.getElementById('staff-image-input');
    if (imageInput.files && imageInput.files[0]) {
        try {
            // Show loading status for R2
            const staffName = dataToSave.nameKhmer || "staff";
            const uploadedUrl = await uploadImageToFirebase(imageInput.files[0], staffName, "Teacher");
            if (uploadedUrl) {
                dataToSave.imageUrl = uploadedUrl;
            }
        } catch (uploadErr) {
            console.error("R2 Teacher Upload Error:", uploadErr);
        }
    } else if (isEdit) {
        // Keep old image if no new file is selected
        const existingStaff = staffData[staffId] || {};
        if (existingStaff.imageUrl) {
            dataToSave.imageUrl = existingStaff.imageUrl;
        }
    }

    if (isEdit) {
        // Preserve fields that are not in the form but exist in DB
        const existingStaff = staffData[staffId] || {};
        if (existingStaff.createdAt) {
            dataToSave.createdAt = existingStaff.createdAt;
        }
        if (existingStaff.createdAt) {
            dataToSave.createdAt = existingStaff.createdAt;
        }
        // Removed preserve teachingHours since it's now in the form
    } else {
        dataToSave.createdAt = new Date().toISOString();
    }

    try {
        const ref = firebase.database().ref('staff');
        const key = isEdit ? staffId : ref.push().key;

        await ref.child(key).set(dataToSave);

        if (typeof window.logStaffActivity === 'function') {
            const actType = isEdit ? 'update' : 'create';
            const actionDesc = isEdit 
                ? `បានកែប្រែព័ត៌មានបុគ្គលិក "${dataToSave.nameKhmer}" (មុខតំណែង: ${dataToSave.position || 'គ្រូបង្រៀន'})`
                : `បានបន្ថែមបុគ្គលិកថ្មី "${dataToSave.nameKhmer}" ចូលក្នុងប្រព័ន្ធ (មុខតំណែង: ${dataToSave.position || 'គ្រូបង្រៀន'})`;
            window.logStaffActivity(actType, dataToSave.nameKhmer, actionDesc, { targetStaffId: key });
        }

        Swal.fire({
            icon: 'success',
            title: isEdit ? 'កែប្រែបានជោគជ័យ!' : 'បន្ថែមបានជោគជ័យ!',
            text: `ព័ត៌មានបុគ្គលិក ${dataToSave.nameKhmer} ត្រូវបានរក្សាទុក`,
            confirmButtonColor: '#8a0e5b',
            timer: 2000
        });

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('staffModal'));
        modal.hide();

        // Select the newly added/edited staff
        if (!isEdit) {
            setTimeout(() => selectStaff(key), 500);
        } else {
            selectStaff(key);
        }

    } catch (error) {
        console.error('Error saving staff:', error);
        Swal.fire({
            icon: 'error',
            title: 'កំហុស!',
            text: 'មានបញ្ហាក្នុងការរក្សាទុកទិន្នន័យ',
            confirmButtonColor: '#8a0e5b'
        });
    }
}

/**
 * Delete staff member with safe check for assigned students and transfer capability
 */
async function deleteStaff(staffId, staffName) {
    if (!staffId) return;

    // Fallback staffName if missing
    if (!staffName && staffData[staffId]) {
        staffName = staffData[staffId].nameKhmer || 'បុគ្គលិក';
    }

    try {
        // 1. Show checking status loader
        Swal.fire({
            title: 'កំពុងពិនិត្យទិន្នន័យ...',
            html: `កំពុងពិនិត្យមើលថាតើ <strong>${staffName}</strong> មានសិស្សក្នុងបន្ទុកដែរឬទេ...`,
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        // 2. Query students to check if any are assigned to this teacher (Fast In-Memory Cache)
        let allStudentsList = [];
        if (cachedStudentsList && cachedStudentsList.length > 0) {
            allStudentsList = cachedStudentsList;
        } else {
            const studentsSnapshot = await firebase.database().ref('students').once('value');
            const val = studentsSnapshot.val() || {};
            allStudentsList = Object.entries(val).map(([k, v]) => ({ key: k, id: k, ...v }));
            cachedStudentsList = allStudentsList;
        }
        const cleanStaffName = (staffName || '').trim().toLowerCase();

        const assignedStudents = [];
        allStudentsList.forEach(s => {
            if (!s) return;
            const sKey = s.key || s.id;
            const tName = (s.teacherName || '').trim().toLowerCase();
            const hName = (s.homeroomTeacher || '').trim().toLowerCase();
            if (tName === cleanStaffName || hName === cleanStaffName) {
                assignedStudents.push({
                    key: sKey,
                    id: sKey,
                    ...s,
                    isTeacher: tName === cleanStaffName,
                    isHomeroom: hName === cleanStaffName
                });
            }
        });

        Swal.close();

        // ---------------------------------------------------------------
        // CASE A: Teacher has NO assigned students -> Normal delete
        // ---------------------------------------------------------------
        if (assignedStudents.length === 0) {
            const result = await Swal.fire({
                title: 'តើអ្នកប្រាកដទេ?',
                text: `តើអ្នកពិតជាចង់លុបបុគ្គលិក "${staffName}" ចេញពីប្រព័ន្ធមែនទេ?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                cancelButtonColor: '#6c757d',
                confirmButtonText: '<i class="fi fi-rr-trash me-1"></i> បាទ/ចាស លុប',
                cancelButtonText: 'បោះបង់'
            });

            if (result.isConfirmed) {
                await firebase.database().ref('staff').child(staffId).remove();
                if (typeof window.logStaffActivity === 'function') {
                    window.logStaffActivity('delete', staffName, `បានលុបបុគ្គលិក "${staffName}" ចេញពីប្រព័ន្ធ`);
                }

                Swal.fire({
                    icon: 'success',
                    title: 'លុបបានជោគជ័យ!',
                    text: `បុគ្គលិក "${staffName}" ត្រូវបានលុបចេញពីប្រព័ន្ធរួចរាល់`,
                    confirmButtonColor: '#8a0e5b',
                    timer: 2000
                });

                currentStaffId = null;
                const detailsContainer = document.getElementById('staff-details-content');
                if (detailsContainer) detailsContainer.innerHTML = '';
                showDashboard();
            }
            return;
        }

        // ---------------------------------------------------------------
        // CASE B: Teacher HAS assigned students -> Must prompt to transfer!
        // ---------------------------------------------------------------
        // Get list of other available teachers (excluding the one being deleted)
        const otherTeachers = Object.entries(staffData)
            .filter(([id, s]) => {
                const name = (s.nameKhmer || '').trim();
                return id !== staffId && name !== '' && name.toLowerCase() !== cleanStaffName;
            })
            .map(([id, s]) => ({ id, ...s }))
            .sort((a, b) => (a.nameKhmer || '').localeCompare(b.nameKhmer || ''));

        // If no other teachers exist in the system to take over
        if (otherTeachers.length === 0) {
            await Swal.fire({
                icon: 'error',
                title: 'មិនអាចលុបបានទេ!',
                html: `
                    <div class="text-start" style="font-size: 0.92rem;">
                        <div class="alert alert-danger d-flex align-items-center gap-2 mb-3">
                            <i class="fi fi-rr-cross-circle fs-4 text-danger flex-shrink-0"></i>
                            <div>
                                លោកគ្រូ/អ្នកគ្រូ <strong>${staffName}</strong> បច្ចុប្បន្នមានសិស្សទទួលបន្ទុកចំនួន 
                                <span class="badge bg-danger text-white rounded-pill px-2.5 py-1 fs-6">${assignedStudents.length} នាក់</span>
                            </div>
                        </div>
                        <p class="mb-0 text-muted">
                            <i class="fi fi-rr-info text-primary me-1"></i>
                            ប្រព័ន្ធមិនទាន់មានគ្រូបង្រៀនផ្សេងទៀតដើម្បីផ្ទេរសិស្សទៅឱ្យឡើយ។ សូមបង្កើតគ្រូថ្មីជាមុនសិន មុនពេលលុបគ្រូនេះចេញពីប្រព័ន្ធ។
                        </p>
                    </div>
                `,
                confirmButtonColor: '#8a0e5b',
                confirmButtonText: 'យល់ព្រម'
            });
            return;
        }

        // Generate teacher options HTML for the dropdown
        const teacherOptionsHtml = otherTeachers.map(t => {
            const pos = t.position ? ` (${t.position})` : '';
            const cn = t.nameChinese ? ` - ${t.nameChinese}` : '';
            return `<option value="${t.nameKhmer}">${t.nameKhmer}${cn}${pos}</option>`;
        }).join('');

        // Sample student names preview chip list
        const sampleStudents = assignedStudents.slice(0, 6).map(s => {
            const sName = `${s.lastName || ''} ${s.firstName || ''}`.trim() || s.nameKhmer || 'សិស្ស';
            return `<span class="badge bg-light text-dark border p-1 px-2 me-1 mb-1" style="font-size: 0.75rem;"><i class="fi fi-rr-user text-primary me-1"></i>${sName}</span>`;
        }).join('');
        const moreCount = assignedStudents.length > 6 
            ? `<span class="badge bg-secondary-subtle text-secondary border p-1 px-2" style="font-size: 0.75rem;">+${assignedStudents.length - 6} នាក់ទៀត</span>` 
            : '';

        // Show Modern Reassignment Transfer & Delete Modal
        const { value: transferData } = await Swal.fire({
            title: '<span class="text-danger fw-bold"><i class="fi fi-rr-triangle-warning me-2"></i>គ្រូនេះមានសិស្សក្នុងបន្ទុក!</span>',
            html: `
                <div class="text-start" style="font-size: 0.92rem;">
                    <div class="alert alert-danger d-flex align-items-center gap-2 p-2.5 mb-3 rounded-3 border-danger-subtle bg-danger-subtle text-danger-emphasis">
                        <i class="fi fi-rr-users-alt fs-4 flex-shrink-0 text-danger"></i>
                        <div>
                            លោកគ្រូ/អ្នកគ្រូ <strong>${staffName}</strong> កំពុងកាន់កាប់សិស្សសរុប 
                            <span class="badge bg-danger text-white rounded-pill px-2.5 py-1 fw-bold">${assignedStudents.length} នាក់</span>
                        </div>
                    </div>

                    <p class="text-muted small mb-2">
                        ដើម្បីធានាថាសិស្សមិនបាត់បង់គ្រូបង្រៀន សូមជ្រើសរើស <strong>គ្រូថ្មី</strong> សម្រាប់ទទួលបន្ទុកសិស្សទាំងនេះបន្ត មុនពេលលុបគ្រូចាស់ចេញពីប្រព័ន្ធ៖
                    </p>

                    <div class="mb-3">
                        <label for="swal-select-new-teacher" class="form-label fw-bold small text-dark mb-1">
                            <i class="fi fi-rr-user-add text-primary me-1"></i>ជ្រើសរើសគ្រូថ្មីដែលត្រូវទទួលបន្ទុកបន្ត៖ <span class="text-danger">*</span>
                        </label>
                        <select id="swal-select-new-teacher" class="form-select form-select-lg border-primary shadow-xs" style="font-size: 0.95rem; border-radius: 12px;">
                            <option value="">-- សូមជ្រើសរើសគ្រូថ្មី --</option>
                            ${teacherOptionsHtml}
                        </select>
                    </div>

                    <div class="bg-light p-2.5 rounded-3 border mb-2">
                        <div class="text-muted small fw-bold mb-1.5">
                            <i class="fi fi-rr-graduation-cap me-1"></i>សិស្សមួយចំនួនដែលនឹងត្រូវផ្ទេរ៖
                        </div>
                        <div class="d-flex flex-wrap align-items-center">
                            ${sampleStudents} ${moreCount}
                        </div>
                    </div>

                    <div class="text-danger small mt-2">
                        <i class="fi fi-rr-exclamation me-1"></i>
                        ចំណាំ៖ នៅពេលអ្នកចុច <strong>"ផ្ទេរសិស្ស &amp; លុបគ្រូ"</strong> សិស្សទាំង ${assignedStudents.length} នាក់ នឹងត្រូវប្តូរទៅគ្រូថ្មីភ្លាមៗ ហើយបុគ្គលិក "${staffName}" នឹងត្រូវលុបជាស្ថាពរ។
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#64748b',
            confirmButtonText: '<i class="fi fi-rr-shuffle me-1"></i> ផ្ទេរសិស្ស &amp; លុបគ្រូចាស់',
            cancelButtonText: 'បោះបង់ (មិនលុប)',
            focusConfirm: false,
            preConfirm: () => {
                const selectedTeacher = document.getElementById('swal-select-new-teacher').value;
                if (!selectedTeacher) {
                    Swal.showValidationMessage('សូមជ្រើសរើសគ្រូថ្មីម្នាក់ជាមុនសិន!');
                    return false;
                }
                return { newTeacherName: selectedTeacher };
            }
        });

        // ---------------------------------------------------------------
        // Perform Batch Transfer & Staff Deletion
        // ---------------------------------------------------------------
        if (transferData && transferData.newTeacherName) {
            const newTeacherName = transferData.newTeacherName;

            Swal.fire({
                title: 'កំពុងផ្ទេរសិស្ស & លុបគ្រូចាស់...',
                html: `កំពុងផ្ទេរសិស្ស <strong>${assignedStudents.length} នាក់</strong> ទៅកាន់ <strong>${newTeacherName}</strong>...`,
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            // 1. Prepare atomic multi-path update for both students AND old staff deletion
            const rootUpdates = {};
            assignedStudents.forEach(s => {
                const sKey = s.key || s.id;
                if (s.isTeacher) {
                    rootUpdates[`students/${sKey}/teacherName`] = newTeacherName;
                }
                if (s.isHomeroom) {
                    rootUpdates[`students/${sKey}/homeroomTeacher`] = newTeacherName;
                }
            });

            // 2. Atomic deletion of the old staff in the SAME request (Instant on server)
            rootUpdates[`staff/${staffId}`] = null;

            // Execute single fast atomic roundtrip
            await firebase.database().ref().update(rootUpdates);

            // 3. Immediately update in-memory caches
            delete staffData[staffId];
            if (cachedStudentsList && cachedStudentsList.length > 0) {
                assignedStudents.forEach(s => {
                    const sKey = s.key || s.id;
                    const cached = cachedStudentsList.find(c => (c.id === sKey || c.key === sKey));
                    if (cached) {
                        if (s.isTeacher) cached.teacherName = newTeacherName;
                        if (s.isHomeroom) cached.homeroomTeacher = newTeacherName;
                    }
                });
            }

            // 4. Background non-blocking activity logging
            if (typeof window.logStaffActivity === 'function') {
                try {
                    window.logStaffActivity('transfer', staffName, `បានផ្ទេរសិស្ស ${assignedStudents.length} នាក់ពីគ្រូ "${staffName}" ទៅគ្រូថ្មី "${newTeacherName}"`);
                    window.logStaffActivity('delete', staffName, `បានលុបបុគ្គលិក "${staffName}" ចេញពីប្រព័ន្ធបន្ទាប់ពីផ្ទេរសិស្ស`);
                } catch (e) {
                    console.warn('Logging activity failed:', e);
                }
            }

            // 5. Success message
            await Swal.fire({
                icon: 'success',
                title: 'ជោគជ័យ!',
                html: `
                    <div class="text-start" style="font-size: 0.95rem;">
                        <p class="mb-2 text-success fw-bold">
                            <i class="fi fi-rr-check-circle me-1"></i>បានផ្ទេរសិស្សចំនួន ${assignedStudents.length} នាក់ ទៅឱ្យគ្រូថ្មី "${newTeacherName}" រួចរាល់!
                        </p>
                        <p class="mb-0 text-muted small">
                            <i class="fi fi-rr-trash me-1"></i>បុគ្គលិក "${staffName}" ត្រូវបានលុបចេញពីប្រព័ន្ធដោយជោគជ័យ។
                        </p>
                    </div>
                `,
                confirmButtonColor: '#8a0e5b',
                confirmButtonText: 'យល់ព្រម'
            });

            // 6. Clear details view and update dashboard
            currentStaffId = null;
            const detailsContainer = document.getElementById('staff-details-content');
            if (detailsContainer) detailsContainer.innerHTML = '';
            showDashboard();
        }

    } catch (error) {
        console.error('Error in safe deleteStaff:', error);
        Swal.fire({
            icon: 'error',
            title: 'មានបញ្ហា!',
            text: 'កំហុសក្នុងការត្រួតពិនិត្យ ឬលុបបុគ្គលិក: ' + (error.message || error),
            confirmButtonColor: '#dc3545'
        });
    }
}

/**
 * Export staff data to Excel
 */
function exportStaffData() {
    const staffArray = Object.entries(staffData).map(([id, data]) => ({
        'ឈ្មោះភាសាខ្មែរ': data.nameKhmer || '',
        'ឈ្មោះចិន': data.nameChinese || '',
        'មុខតំណែង': data.position || '',
        'ភេទ': data.gender || '',
        'លេខទូរស័ព្ទ': data.phone || '',
        'ថ្ងៃចូលធ្វើការ': data.hireDate ? formatDate(data.hireDate) : '',
        'ថ្ងៃខែឆ្នាំកំណើត': data.dob ? formatDate(data.dob) : '',
        'ស្ថានភាព': getStatusText(data.status),
        'ថ្នាក់បន្ទុក': data.homeroomClass || '',
        'ម៉ោងបង្រៀន': data.teachingHours || '',
        'អាសយដ្ឋាន': data.address || '',
        'កុងត្រា': data.contract || ''
    }));

    if (staffArray.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'មិនមានទិន្នន័យ',
            text: 'មិនមានបុគ្គលិកដើម្បីនាំចេញ',
            confirmButtonColor: '#8a0e5b'
        });
        return;
    }

    // Convert to CSV
    const headers = Object.keys(staffArray[0]);
    const csvContent = [
        headers.join(','),
        ...staffArray.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');

    // Download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `staff_data_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    Swal.fire({
        icon: 'success',
        title: 'នាំចេញបានជោគជ័យ!',
        text: 'ទិន្នន័យបុគ្គលិកត្រូវបាននាំចេញជា CSV',
        confirmButtonColor: '#8a0e5b',
        timer: 2000
    });
}

/**
 * Toggle navigation sidebar on desktop
 */
function toggleDesktopSidebar() {
    document.body.classList.toggle('sidebar-collapsed');
}

/**
 * Toggle browser full screen
 */
function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

/**
 * Toggle navigation sidebar on mobile
 */
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('show');
}

// Close sidebars when clicking outside on mobile
document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.querySelector('.sidebar-toggle');

    // Close navigation sidebar
    if (sidebar && window.innerWidth <= 1200 &&
        sidebar.classList.contains('show') &&
        !sidebar.contains(e.target) &&
        sidebarToggle && !sidebarToggle.contains(e.target)) {
        sidebar.classList.remove('show');
    }
});

/**
 * Sync teachers from student data records
 */
async function syncTeachersFromStudents() {
    const result = await Swal.fire({
        title: 'ទាញយកឈ្មោះគ្រូ?',
        text: "ប្រព័ន្ធនឹងស្វែងរកឈ្មោះគ្រូបន្ទុកថ្នាក់ពីបញ្ជីសិស្ស ហើយបន្ថែមចូលក្នុងបញ្ជីបុគ្គលិក។",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#ffc107',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'បាទ/ចាស ទាញយក',
        cancelButtonText: 'បោះបង់'
    });

    if (!result.isConfirmed) return;

    Swal.fire({
        title: 'កំពុងដំណើរការ...',
        text: 'កំពុងវិភាគទិន្នន័យសិស្ស...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        // 1. Fetch all students
        const snapshot = await firebase.database().ref('students').once('value');
        const students = snapshot.val() || {};

        // Translation mapping for common English course types
        const translationMap = {
            'chinese-fulltime': 'ថ្នាក់ភាសាចិនពេញម៉ោង',
            'chinese-parttime': 'ថ្នាក់ភាសាចិនក្រៅម៉ោង',
            'three-languages': 'ថ្នាក់ចំណះដឹងទូទៅ',
            'one-language': 'ថ្នាក់ភាសា (១ភាសា)',
            'two-languages': 'ថ្នាក់ភាសា (២ភាសា)',
            'cFullTime': 'ថ្នាក់ភាសាចិនពេញម៉ោង',
            'cPartTime': 'ថ្នាក់ភាសាចិនក្រៅម៉ោង',
            'Full-time': 'ពេញម៉ោង',
            'Part-time': 'ក្រៅម៉ោង'
        };

        // 2. Identify Teachers and their Complete Study Information
        // teacherMap: lowerName -> { name, phones, classrooms, classes, programs, studyTimes, levels, studyTypes }
        const teacherMap = {};

        Object.values(students).forEach(s => {
            const addTeacherData = (rawName) => {
                if (!rawName || typeof rawName !== 'string' || !rawName.trim()) return;
                const name = rawName.trim();
                const lowerName = name.toLowerCase();

                if (!teacherMap[lowerName]) {
                    teacherMap[lowerName] = {
                        name: name,
                        phones: new Set(),
                        classrooms: new Set(),
                        classes: new Set(),
                        programs: new Set(),
                        studyTimes: new Set(),
                        levels: new Set(),
                        studyTypes: new Set()
                    };
                }

                // 1. លេខទូរស័ព្ទគ្រូ (Teacher Phone)
                const phone = s.teacherPhone || '';
                if (phone && phone.trim() && !['N/A', 'មិនមាន', '-'].includes(phone.trim())) {
                    teacherMap[lowerName].phones.add(phone.trim());
                }

                // 2. បន្ទប់រៀន (Classroom) & ថ្នាក់ (Classes)
                if (s.classroom && s.classroom.trim() && !['N/A', 'មិនមាន', '-'].includes(s.classroom.trim())) {
                    teacherMap[lowerName].classrooms.add(s.classroom.trim());
                    teacherMap[lowerName].classes.add(s.classroom.trim());
                }
                if (s.grade && s.grade.trim() && !['N/A', 'មិនមាន', '-'].includes(s.grade.trim())) {
                    teacherMap[lowerName].classes.add(s.grade.trim());
                }

                // 3. វគ្គសិក្សា (Study Program / Subject)
                const program = s.studyProgram || s.subject || '';
                if (program && program.trim() && !['N/A', 'មិនមាន', '-'].includes(program.trim())) {
                    teacherMap[lowerName].programs.add(program.trim());
                }

                // 4. ម៉ោងសិក្សា (Study Time)
                if (s.studyTime && s.studyTime.trim() && !['N/A', 'មិនមាន', '-'].includes(s.studyTime.trim())) {
                    teacherMap[lowerName].studyTimes.add(s.studyTime.trim());
                }

                // 5. កម្រិតសិក្សា (Study Level)
                if (s.studyLevel && s.studyLevel.trim() && !['N/A', 'មិនមាន', '-'].includes(s.studyLevel.trim())) {
                    teacherMap[lowerName].levels.add(s.studyLevel.trim());
                }

                // 6. ប្រភេទការសិក្សា (Study Type / Course Type)
                const rawType = s.studyType || s.courseType || '';
                if (rawType && rawType.trim() && !['N/A', 'មិនមាន', '-'].includes(rawType.trim())) {
                    const mappedType = translationMap[rawType.trim()] || rawType.trim();
                    teacherMap[lowerName].studyTypes.add(mappedType);
                }
            };

            // Check teacherName (primary) and homeroomTeacher
            addTeacherData(s.teacherName);
            addTeacherData(s.homeroomTeacher);
        });

        // 3. Process Updates to Firebase 'staff'
        const staffRef = firebase.database().ref('staff');
        const staffSnapshot = await staffRef.once('value');
        const currentStaff = staffSnapshot.val() || {};

        const findStaffKey = (name) => {
            return Object.keys(currentStaff).find(key =>
                (currentStaff[key].nameKhmer || '').toLowerCase() === name.toLowerCase()
            );
        };

        let newCount = 0;
        let updatedCount = 0;
        const updates = {};

        for (const item of Object.values(teacherMap)) {
            const tName = item.name;
            const phoneList = Array.from(item.phones).filter(Boolean).join(', ');
            const classroomsList = Array.from(item.classrooms).filter(Boolean).join(', ');
            const classesList = Array.from(item.classes).filter(Boolean).join(', ');
            const programsList = Array.from(item.programs).filter(Boolean).join(', ');
            const studyTimesList = Array.from(item.studyTimes).filter(Boolean).join(', ');
            const levelsList = Array.from(item.levels).filter(Boolean).join(', ');
            const studyTypesList = Array.from(item.studyTypes).filter(Boolean).join(', ');

            const existingKey = findStaffKey(tName);

            if (existingKey) {
                let needsUpdate = false;
                const existing = currentStaff[existingKey] || {};

                // Update Teacher Phone
                if (phoneList && existing.phone !== phoneList) {
                    updates[`${existingKey}/phone`] = phoneList;
                    needsUpdate = true;
                }

                // Update Classroom
                if (classroomsList && existing.classroom !== classroomsList) {
                    updates[`${existingKey}/classroom`] = classroomsList;
                    needsUpdate = true;
                }

                // Update Homeroom Class
                if (classesList && existing.homeroomClass !== classesList) {
                    updates[`${existingKey}/homeroomClass`] = classesList;
                    needsUpdate = true;
                }

                // Update Study Program
                if (programsList && existing.studyProgram !== programsList) {
                    updates[`${existingKey}/studyProgram`] = programsList;
                    needsUpdate = true;
                }

                // Update Study Level
                if (levelsList && existing.level !== levelsList) {
                    updates[`${existingKey}/level`] = levelsList;
                    needsUpdate = true;
                }

                // Update Study Time / Teaching Hours
                if (studyTimesList && existing.teachingHours !== studyTimesList) {
                    updates[`${existingKey}/teachingHours`] = studyTimesList;
                    needsUpdate = true;
                }

                // Update Study Type
                if (studyTypesList && existing.studyType !== studyTypesList) {
                    updates[`${existingKey}/studyType`] = studyTypesList;
                    needsUpdate = true;
                }

                // Ensure position is Teacher
                if (!existing.position || existing.position === 'ផ្សេងៗ') {
                    updates[`${existingKey}/position`] = 'គ្រូបង្រៀន';
                    needsUpdate = true;
                }

                if (needsUpdate) updatedCount++;
            } else {
                // Create New Teacher
                const newKey = staffRef.push().key;
                updates[newKey] = {
                    nameKhmer: tName,
                    nameChinese: '',
                    position: 'គ្រូបង្រៀន',
                    phone: phoneList,
                    classroom: classroomsList,
                    homeroomClass: classesList,
                    studyProgram: programsList,
                    level: levelsList,
                    teachingHours: studyTimesList,
                    studyType: studyTypesList,
                    gender: '',
                    status: 'active',
                    hireDate: new Date().toISOString().split('T')[0],
                    createdAt: new Date().toISOString(),
                    pin: '2024',
                    notes: 'ទាញយកស្វ័យប្រវត្តិពីទិន្នន័យសិស្ស'
                };
                newCount++;
            }
        }

        if (Object.keys(updates).length > 0) {
            await staffRef.update(updates);

            Swal.fire({
                icon: 'success',
                title: 'ជោគជ័យ!',
                html: `
                    បានបន្ថែមគ្រូថ្មី: <b>${newCount}</b> នាក់<br>
                    បានកែប្រែព័ត៌មានគ្រូ: <b>${updatedCount}</b> នាក់<br>
                    <small class="text-muted">ឈ្មោះគ្រូ, លេខទូរស័ព្ទ, បន្ទប់រៀន, វគ្គសិក្សា, ម៉ោងសិក្សា, កម្រិតសិក្សា និងប្រភេទការសិក្សា ត្រូវបានធ្វើបច្ចុប្បន្នភាពរួចរាល់</small>
                `,
                confirmButtonColor: '#8a0e5b'
            });
        } else {
            Swal.fire({
                icon: 'info',
                title: 'រួចរាល់',
                text: 'ព័ត៌មានគ្រូ និងការសិក្សាទាំងអស់មានបច្ចុប្បន្នភាពល្អហើយ។',
                confirmButtonColor: '#8a0e5b'
            });
        }

    } catch (error) {
        console.error('Sync error:', error);
        Swal.fire({
            icon: 'error',
            title: 'បរាជ័យ',
            text: 'មានបញ្ហាក្នុងការទាញយកទិន្នន័យ: ' + error.message,
            confirmButtonColor: '#dc3545'
        });
    }
}

/**
 * Sync ONLY study hours (teaching hours) from student data for existing staff
 */
async function syncStudentStudyHours() {
    const result = await Swal.fire({
        title: 'ទាញយកម៉ោងសិក្សាសិស្ស?',
        text: "ប្រព័ន្ធនឹងធ្វើបច្ចុប្បន្នភាពម៉ោងបង្រៀនរបស់គ្រូ ដោយផ្អែកលើម៉ោងសិក្សារបស់សិស្ស។",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#0dcaf0',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'បាទ/ចាស ទាញយក',
        cancelButtonText: 'បោះបង់'
    });

    if (!result.isConfirmed) return;

    Swal.fire({
        title: 'កំពុងដំណើរការ...',
        text: 'កំពុងគណនាម៉ោងសិក្សារបស់សិស្ស...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        // 1. Fetch all students
        const snapshot = await firebase.database().ref('students').once('value');
        const students = snapshot.val() || {};

        // 2. Map Teachers to Data
        const teacherDataMap = {}; // LowerName -> { levels: Set, classes: Set, times: Set }

        Object.values(students).forEach(s => {
            const collectData = (rawName) => {
                if (!rawName || typeof rawName !== 'string' || !rawName.trim()) return;
                const lowerName = rawName.trim().toLowerCase();

                if (!teacherDataMap[lowerName]) {
                    teacherDataMap[lowerName] = {
                        levels: new Set(),
                        classes: new Set(),
                        times: new Set()
                    };
                }
                if (s.studyLevel) teacherDataMap[lowerName].levels.add(s.studyLevel);
                if (s.classroom) teacherDataMap[lowerName].classes.add(s.classroom);
                if (s.grade) teacherDataMap[lowerName].classes.add(s.grade);
                if (s.studyTime) teacherDataMap[lowerName].times.add(s.studyTime);
            };

            collectData(s.teacherName);
            collectData(s.homeroomTeacher);
        });

        // 2b. Add missing times to master list (settings/studyTimes)
        const allUniqueStudyTimes = new Set();
        Object.values(students).forEach(s => {
            if (s.studyTime && s.studyTime.trim()) allUniqueStudyTimes.add(s.studyTime.trim());
        });

        const existingTimes = masterStudyTimes.map(t => t.time);
        for (const time of allUniqueStudyTimes) {
            if (!existingTimes.includes(time)) {
                await firebase.database().ref('settings/studyTimes').push(time);
            }
        }

        // 3. Update Existing Staff Only
        const staffRef = firebase.database().ref('staff');
        const staffSnapshot = await staffRef.once('value');
        const currentStaff = staffSnapshot.val() || {};

        let updatedCount = 0;
        const updates = {};
        const staffKeys = Object.keys(currentStaff);

        staffKeys.forEach(key => {
            const staff = currentStaff[key];
            const nameKhmer = (staff.nameKhmer || '').trim();
            const lowerName = nameKhmer.toLowerCase();

            if (teacherDataMap[lowerName]) {
                const { levels, classes, times } = teacherDataMap[lowerName];
                const levelsList = Array.from(levels).filter(l => l && l.trim()).join(', ');
                const classesList = Array.from(classes).filter(c => c && c.trim()).join(', ');
                const studyTimesList = Array.from(times).filter(t => t && t.trim()).join(', ');

                let needsUpdate = false;

                // Update if different
                if (levelsList && staff.level !== levelsList) {
                    updates[`${key}/level`] = levelsList;
                    needsUpdate = true;
                }
                if (classesList && staff.homeroomClass !== classesList) {
                    updates[`${key}/homeroomClass`] = classesList;
                    needsUpdate = true;
                }
                if (studyTimesList && staff.teachingHours !== studyTimesList) {
                    updates[`${key}/teachingHours`] = studyTimesList;
                    needsUpdate = true;
                }

                if (needsUpdate) updatedCount++;
            }
        });

        if (Object.keys(updates).length > 0) {
            await staffRef.update(updates);

            // Refund dashboard/list (if necessary, though real-time listener should handle it)
            // But we reload logic mostly relies on listener "on value" in loadAllStaff

            Swal.fire({
                icon: 'success',
                title: 'ជោគជ័យ!',
                text: `បានធ្វើបច្ចុប្បន្នភាពម៉ោងបង្រៀនសម្រាប់គ្រូចំនួន ${updatedCount} នាក់។`,
                confirmButtonColor: '#8a0e5b'
            });
        } else {
            Swal.fire({
                icon: 'info',
                title: 'រួចរាល់',
                text: 'ម៉ោងបង្រៀនរបស់គ្រូទាំងអស់គឺត្រឹមត្រូវហើយ។',
                confirmButtonColor: '#8a0e5b'
            });
        }

    } catch (error) {
        console.error('Study Hours Sync error:', error);
        Swal.fire({
            icon: 'error',
            title: 'បរាជ័យ',
            text: 'មានបញ្ហាក្នុងការទាញយកទិន្នន័យ: ' + error.message,
            confirmButtonColor: '#dc3545'
        });
    }
}

/**
 * Transfer all assigned students from one teacher to another
 */
async function transferStudents(fromTeacherName) {
    if (!fromTeacherName) return;

    // Get list of other teachers for the dropdown
    const teachers = Object.values(staffData)
        .filter(s => {
            const name = (s.nameKhmer || '').trim();
            const pos = (s.position || '').toLowerCase();
            return name !== '' && name !== fromTeacherName &&
                (pos.includes('គ្រូ') || pos.includes('teacher') || pos === '' || pos === 'ផ្សេងៗ');
        })
        .sort((a, b) => (a.nameKhmer || '').localeCompare(b.nameKhmer || ''));

    if (teachers.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'មិនអាចផ្ទេរបាន',
            text: 'មិនមានគ្រូផ្សេងទៀតដើម្បីផ្ទេរសិស្សទៅឱ្យឡើយ។',
            confirmButtonColor: '#8a0e5b'
        });
        return;
    }

    const teacherOptions = {};
    teachers.forEach(t => {
        teacherOptions[t.nameKhmer] = t.nameKhmer + (t.nameChinese ? ` (${t.nameChinese})` : '');
    });

    const { value: toTeacherName } = await Swal.fire({
        title: 'ផ្ទេរសិស្សទៅគ្រូថ្មី',
        text: `ជ្រើសរើសគ្រូដែលត្រូវទទួលបន្ទុកបន្តពី ${fromTeacherName}៖`,
        input: 'select',
        inputOptions: teacherOptions,
        inputPlaceholder: 'ជ្រើសរើសគ្រូទទួលបន្ទុក...',
        showCancelButton: true,
        confirmButtonColor: '#8a0e5b',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'បន្តការផ្ទេរ',
        cancelButtonText: 'បោះបង់',
        inputValidator: (value) => {
            return new Promise((resolve) => {
                if (value) resolve();
                else resolve('សូមជ្រើសរើសគ្រូម្នាក់');
            });
        }
    });

    if (toTeacherName) {
        try {
            Swal.fire({
                title: 'កំពុងផ្ទេរ...',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            const snapshot = await firebase.database().ref('students').once('value');
            const students = snapshot.val() || {};
            const sourceName = fromTeacherName.trim().toLowerCase();
            const updates = {};
            let count = 0;

            Object.entries(students).forEach(([key, s]) => {
                let updated = false;
                const sTeacher = (s.teacherName || '').trim().toLowerCase();
                const sHomeroom = (s.homeroomTeacher || '').trim().toLowerCase();

                if (sTeacher === sourceName) {
                    updates[`${key}/teacherName`] = toTeacherName;
                    updated = true;
                }
                if (sHomeroom === sourceName) {
                    updates[`${key}/homeroomTeacher`] = toTeacherName;
                    updated = true;
                }

                if (updated) count++;
            });

            if (count > 0) {
                await firebase.database().ref('students').update(updates);

                await Swal.fire({
                    icon: 'success',
                    title: 'ផ្ទេរបានជោគជ័យ!',
                    text: `បានផ្ទេរសិស្សចំនួន ${count} នាក់ ពី ${fromTeacherName} ទៅឱ្យ ${toTeacherName}។`,
                    confirmButtonColor: '#8a0e5b'
                });

                // Refresh details view if still on the same staff
                if (currentStaffId) {
                    selectStaff(currentStaffId);
                }
            } else {
                Swal.fire({
                    icon: 'info',
                    title: 'គ្មានទិន្នន័យ',
                    text: 'មិនមានសិស្សដែលត្រូវផ្ទេរឡើយ។',
                    confirmButtonColor: '#8a0e5b'
                });
            }
        } catch (error) {
            console.error("Error transferring students:", error);
            Swal.fire({
                icon: 'error',
                title: 'កំហុស!',
                text: 'មានបញ្ហាក្នុងការផ្ទេរទិន្នន័យ',
                confirmButtonColor: '#d33'
            });
        }
    }
}
/**
 * Load Master Study Times from Firebase
 */
function loadMasterStudyTimes() {
    const studyTimesRef = firebase.database().ref('settings/studyTimes');
    studyTimesRef.on('value', (snapshot) => {
        const data = snapshot.val() || {};
        const timesMap = new Map();
        Object.entries(data).forEach(([id, val]) => {
            const timeStr = typeof val === 'object' && val !== null ? (val.time || '') : val;
            if (timeStr && typeof timeStr === 'string' && timeStr.trim()) {
                const trimmed = timeStr.trim();
                if (!timesMap.has(trimmed.toLowerCase())) {
                    timesMap.set(trimmed.toLowerCase(), { id, time: trimmed });
                }
            }
        });
        masterStudyTimes = Array.from(timesMap.values()).sort((a, b) => a.time.localeCompare(b.time));

        // Dynamic updates across the UI
        if (typeof renderTeachingHoursCheckboxes === 'function') {
            const currentSelected = Array.from(document.querySelectorAll('.teaching-hour-checkbox:checked')).map(cb => cb.value).join(', ');
            renderTeachingHoursCheckboxes(currentSelected);
        }
        const timeFilterEl = document.getElementById('class-hub-time-filter');
        if (timeFilterEl) {
            const curVal = timeFilterEl.value;
            timeFilterEl.innerHTML = '<option value="">⏰ ម៉ោងសិក្សាទាំងអស់</option>';
            masterStudyTimes.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item.time;
                opt.textContent = `⏰ ${item.time}`;
                timeFilterEl.appendChild(opt);
            });
            if (curVal && masterStudyTimes.some(t => t.time === curVal)) {
                timeFilterEl.value = curVal;
            }
        }
        const modalEl = document.getElementById('studyTimeModal');
        if (modalEl && modalEl.classList.contains('show') && typeof renderStudyTimeList === 'function') {
            renderStudyTimeList();
        }
        if (typeof renderClassroomHub === 'function') {
            renderClassroomHub();
        }
    });
}

/**
 * Open Study Time Management Modal
 */
function openStudyTimeModal() {
    renderStudyTimeList();
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('studyTimeModal'));
    modal.show();
}

/**
 * Render Study Time List in Settings Modal
 */
function renderStudyTimeList() {
    const container = document.getElementById('study-time-list');
    if (!container) return;

    if (masterStudyTimes.length === 0) {
        container.innerHTML = '<div class="text-center py-4 text-muted"><i class="fi fi-rr-box-open d-block mb-2 fa-2x"></i>មិនទាន់មានទិន្នន័យ</div>';
        return;
    }

    container.innerHTML = masterStudyTimes.map(item => `
        <div class="list-group-item d-flex justify-content-between align-items-center py-3">
            <div class="d-flex align-items-center">
                <div class="rounded-circle bg-light d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px; color: #6f42c1;">
                    <i class="fi fi-rr-clock"></i>
                </div>
                <div>
                    <span class="fw-bold d-block text-dark">${item.time}</span>
                </div>
            </div>
            <div class="btn-group shadow-sm rounded">
                <button class="btn btn-sm btn-white text-info" title="មើលសិស្ស" onclick="viewStudentsInTime('${item.time}')">
                    <i class="fi fi-rr-users"></i>
                </button>
                <button class="btn btn-sm btn-white text-warning" title="កែប្រែ" onclick="editStudyTime('${item.id}', '${item.time}')">
                    <i class="fi fi-rr-edit"></i>
                </button>
                <button class="btn btn-sm btn-white text-danger" title="លុប" onclick="deleteStudyTime('${item.id}', '${item.time}')">
                    <i class="fi fi-rr-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * Add New Study Time
 */
async function addStudyTime() {
    const input = document.getElementById('new-study-time');
    const time = input.value.trim();

    if (!time) {
        Swal.fire({ icon: 'warning', title: 'សូមបញ្ចូលម៉ោងសិក្សា' });
        return;
    }

    // Check if duplicate
    if (masterStudyTimes.some(t => t.time === time)) {
        Swal.fire({ icon: 'warning', title: 'ម៉ោងសិក្សានេះមានរួចហើយ' });
        return;
    }

    try {
        await firebase.database().ref('settings/studyTimes').push(time);
        input.value = '';
        renderStudyTimeList();
        Swal.fire({ icon: 'success', title: 'បានបន្ថែមដោយជោគជ័យ', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
    } catch (error) {
        console.error('Error adding study time:', error);
    }
}

/**
 * Edit Study Time (Updates settings, staff, and students)
 */
async function editStudyTime(id, oldTime) {
    const { value: newTime } = await Swal.fire({
        title: 'កែប្រែម៉ោងសិក្សា',
        input: 'text',
        inputValue: oldTime,
        inputLabel: 'បញ្ចូលម៉ោងថ្មី',
        showCancelButton: true,
        confirmButtonText: 'រក្សាទុក',
        cancelButtonText: 'បោះបង់',
        inputValidator: (value) => {
            if (!value) return 'សូមបញ្ចូលម៉ោងសិក្សា';
            if (value === oldTime) return 'ម៉ោងសិក្សាមិនមានការផ្លាស់ប្តូរឡើយ';
            if (masterStudyTimes.some(t => t.time === value)) return 'ម៉ោងសិក្សានេះមានរួចហើយ';
        }
    });

    if (newTime) {
        Swal.fire({ title: 'កំពុងធ្វើបច្ចុប្បន្នភាព...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        try {
            const updates = {};
            // 1. Update Master List
            updates[`settings/studyTimes/${id}`] = newTime;

            // 2. Prepare Staff Updates
            const staffSnapshot = await firebase.database().ref('staff').once('value');
            const staffs = staffSnapshot.val() || {};
            Object.entries(staffs).forEach(([sKey, sData]) => {
                if (sData.teachingHours && sData.teachingHours.includes(oldTime)) {
                    const updatedHours = sData.teachingHours.split(', ').map(h => h.trim() === oldTime ? newTime : h).join(', ');
                    updates[`staff/${sKey}/teachingHours`] = updatedHours;
                }
            });

            // 3. Prepare Student Updates
            const studentSnapshot = await firebase.database().ref('students').once('value');
            const students = studentSnapshot.val() || {};
            Object.entries(students).forEach(([stKey, stData]) => {
                if (stData.studyTime === oldTime) {
                    updates[`students/${stKey}/studyTime`] = newTime;
                }
            });

            await firebase.database().ref().update(updates);

            Swal.fire({ icon: 'success', title: 'បានកែប្រែជោគជ័យ', text: 'បានធ្វើបច្ចុប្បន្នភាពម៉ោងក្នុងបញ្ជី បុគ្គលិក និងសិស្សរួចរាល់។' });
            renderStudyTimeList();
        } catch (error) {
            console.error('Error editing study time:', error);
            Swal.fire({ icon: 'error', title: 'បរាជ័យ', text: 'មិនអាចកែប្រែទិន្នន័យបាន។' });
        }
    }
}

/**
 * Delete Study Time
 */
async function deleteStudyTime(id, time) {
    const result = await Swal.fire({
        title: 'លុបម៉ោងសិក្សា?',
        text: `តើអ្នកចង់លុបម៉ោង ${time} មែនទេ?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'លុប',
        cancelButtonText: 'បោះបង់'
    });

    if (result.isConfirmed) {
        try {
            await firebase.database().ref('settings/studyTimes').child(id).remove();
            renderStudyTimeList();
        } catch (error) {
            console.error('Error deleting study time:', error);
        }
    }
}

/**
 * Render Checkboxes for Teaching Hours in Staff Form
 */
function renderTeachingHoursCheckboxes(selectedHoursStr = '') {
    const container = document.getElementById('staff-teaching-hours-container');
    const customInput = document.getElementById('staff-custom-hours');
    if (!container) return;

    if (customInput) customInput.value = '';

    const selectedHours = selectedHoursStr.split(',').map(h => h.trim()).filter(h => h !== '');
    const masterTimes = masterStudyTimes.map(t => t.time);

    // Populate custom input with hours not in master list
    const customOnes = selectedHours.filter(h => !masterTimes.includes(h));
    if (customInput && customOnes.length > 0) {
        customInput.value = customOnes.join(', ');
    }

    if (masterStudyTimes.length === 0) {
        container.innerHTML = '<div class="p-3 bg-light rounded-3 text-muted text-center w-100"><i class="fi fi-rr-clock me-1"></i> មិនទាន់មានម៉ោងសិក្សា (សូមបន្ថែមក្នុង "គ្រប់គ្រងម៉ោងសិក្សា")</div>';
        return;
    }

    container.innerHTML = masterStudyTimes.map(item => {
        const isChecked = selectedHours.includes(item.time);
        return `
        <label class="teaching-hour-chip ${isChecked ? 'active' : ''}" for="hour-${item.id}">
            <input class="teaching-hour-checkbox" type="checkbox" value="${item.time}" id="hour-${item.id}" 
                ${isChecked ? 'checked' : ''} onchange="this.closest('.teaching-hour-chip').classList.toggle('active', this.checked)">
            <span class="teaching-hour-chip-label">
                <i class="fi fi-rr-clock me-1"></i>${item.time}
            </span>
        </label>
        `;
    }).join('');
}

// Ensure masterStudyTimes load triggers re-render of list if modal is open
firebase.database().ref('settings/studyTimes').on('value', () => {
    const modalEl = document.getElementById('studyTimeModal');
    if (modalEl && modalEl.classList.contains('show') && typeof renderStudyTimeList === 'function') {
        renderStudyTimeList();
    }
});

/**
 * Global Variable to hold students belonging to active view
 */
let studentsInView = [];
let currentStudyTimeFilter = '';

/**
 * View Students in specific target time
 */
async function viewStudentsInTime(time) {
    currentStudyTimeFilter = time;
    const label = document.getElementById('view-time-label');
    if (label) label.textContent = time;

    const listContainer = document.getElementById('students-in-time-list');
    const badge = document.getElementById('student-count-badge');
    const moveSelect = document.getElementById('move-to-time-select');

    if (listContainer) listContainer.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">កំពុងទាញយក...</td></tr>';
    if (badge) badge.textContent = '0 នាក់';

    try {
        // Hide parent modal
        bootstrap.Modal.getOrCreateInstance(document.getElementById('studyTimeModal')).hide();

        // Show target modal
        const _staffStudentsEl = document.getElementById('studentsInTimeModal');
        if (_staffStudentsEl) bootstrap.Modal.getOrCreateInstance(_staffStudentsEl).show();

        const snapshot = await firebase.database().ref('students').once('value');
        const students = snapshot.val() || {};

        studentsInView = Object.entries(students)
            .map(([id, data]) => ({ id, ...data }))
            .filter(s => s.studyTime === time);

        if (badge) badge.textContent = `${studentsInView.length} នាក់`;

        if (studentsInView.length === 0) {
            listContainer.innerHTML = '<tr><td colspan="7" class="text-center py-5 text-muted"><i class="fi fi-rr-info d-block mb-2 fa-2x"></i>មិនមានសិស្សក្នុងម៉ោងនេះទេ</td></tr>';
        } else {
            listContainer.innerHTML = studentsInView.map(s => `
                <tr>
                    <td><input type="checkbox" class="student-select-check" value="${s.id}"></td>
                    <td>
                        <div class="fw-bold text-dark">${s.lastName} ${s.firstName}</div>
                        <small class="text-muted">${s.englishName || ''}</small>
                    </td>
                    <td class="text-center">${s.gender === 'Female' ? 'ស្រី' : 'ប្រុស'}</td>
                    <td><span class="badge bg-light text-dark border">${s.studyLevel || '-'}</span></td>
                    <td><span class="badge bg-light text-primary border">${s.classroom || '-'}</span></td>
                    <td><span class="badge bg-light text-success border">${s.studyType === 'chinese-fulltime' ? 'ពេញម៉ោង' : 'ក្រៅម៉ោង'}</span></td>
                    <td class="small">${s.teacherName || '-'}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-success rounded-pill px-3" onclick="markAsGraduated('${s.id}')" title="បញ្ចប់ការសិក្សាសិស្សនេះ">
                            <i class="fi fi-rr-graduation-cap me-1"></i> បញ្ចប់
                        </button>
                    </td>
                </tr>
            `).join('');
        }

        // Populate move selections
        const selects = {
            time: document.getElementById('move-to-time-select'),
            room: document.getElementById('move-to-room-select'),
            level: document.getElementById('move-to-level-select'),
            teacher: document.getElementById('move-to-teacher-select')
        };

        if (selects.time) {
            selects.time.innerHTML = '<option value="">(មិនប្តូរ)</option>';
            masterStudyTimes.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.time;
                opt.textContent = t.time;
                selects.time.appendChild(opt);
            });
        }

        if (selects.room) {
            selects.room.innerHTML = '<option value="">(មិនប្តូរ)</option>';
            masterClassrooms.forEach(r => {
                const opt = document.createElement('option');
                opt.value = r;
                opt.textContent = r;
                selects.room.appendChild(opt);
            });
        }

        if (selects.level) {
            selects.level.innerHTML = '<option value="">(មិនប្តូរ)</option>';
            masterLevels.forEach(l => {
                const opt = document.createElement('option');
                opt.value = l;
                opt.textContent = l;
                selects.level.appendChild(opt);
            });
        }

        if (selects.teacher) {
            selects.teacher.innerHTML = '<option value="">(មិនប្តូរ)</option>';
            // Get teachers from staffData
            const teachers = Object.values(staffData)
                .filter(s => {
                    const name = (s.nameKhmer || '').trim();
                    const pos = (s.position || '').toLowerCase();
                    return name !== '' && (pos.includes('គ្រូ') || pos.includes('teacher') || pos === '' || pos === 'ផ្សេងៗ');
                })
                .sort((a, b) => (a.nameKhmer || '').localeCompare(b.nameKhmer || ''));

            teachers.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.nameKhmer;
                opt.textContent = t.nameKhmer;
                selects.teacher.appendChild(opt);
            });
        }

    } catch (error) {
        console.error('Error viewing students in time:', error);
    }
}

function closeStudentsInTimeModal() {
    bootstrap.Modal.getOrCreateInstance(document.getElementById('studentsInTimeModal')).hide();
    bootstrap.Modal.getOrCreateInstance(document.getElementById('studyTimeModal')).show();
}

/**
 * Toggle Select All Students
 */
function toggleSelectAllStudentsInTime(parent) {
    document.querySelectorAll('.student-select-check').forEach(cb => {
        cb.checked = parent.checked;
    });
}

/**
 * Move Selected Students to New Time Slot
 */
async function moveStudentsBulk() {
    const targetTime = document.getElementById('move-to-time-select').value;
    const targetRoom = document.getElementById('move-to-room-select').value;
    const targetLevel = document.getElementById('move-to-level-select').value;
    const targetTeacher = document.getElementById('move-to-teacher-select').value;

    if (!targetTime && !targetRoom && !targetLevel && !targetTeacher) {
        Swal.fire({ icon: 'warning', title: 'សូមជ្រើសរើសព័ត៌មានយ៉ាងតិចមួយដើម្បីប្តូរ' });
        return;
    }

    const selectedIds = [];
    document.querySelectorAll('.student-select-check:checked').forEach(cb => selectedIds.push(cb.value));

    if (selectedIds.length === 0) {
        Swal.fire({ icon: 'warning', title: 'សូមជ្រើសរើសសិស្សយ៉ាងតិចម្នាក់' });
        return;
    }

    const result = await Swal.fire({
        title: 'ផ្ទេរព័ត៌មានសិស្ស?',
        text: `តើអ្នកចង់ប្តូរព័ត៌មានសិស្សចំនួន ${selectedIds.length} នាក់ មែនទេ?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'បាទ/ចាស ប្តូរ',
        cancelButtonText: 'បោះបង់',
        confirmButtonColor: '#ffc107'
    });

    if (result.isConfirmed) {
        Swal.fire({ title: 'កំពុងផ្លាស់ប្តូរ...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        try {
            const updates = {};
            selectedIds.forEach(id => {
                if (targetTime) updates[`students/${id}/studyTime`] = targetTime;
                if (targetRoom) updates[`students/${id}/classroom`] = targetRoom;
                if (targetLevel) updates[`students/${id}/studyLevel`] = targetLevel;
                if (targetTeacher) updates[`students/${id}/teacherName`] = targetTeacher;

                updates[`students/${id}/updatedAt`] = new Date().toISOString();
            });

            await firebase.database().ref().update(updates);

            await Swal.fire({ icon: 'success', title: 'ជោគជ័យ', text: 'បានផ្លាស់ប្តូរទិន្នន័យសិស្សរួចរាល់។' });

            // Refresh current view
            viewStudentsInTime(currentStudyTimeFilter);

        } catch (error) {
            console.error('Error moving students bulk:', error);
            Swal.fire({ icon: 'error', title: 'បរាជ័យ', text: 'មានបញ្ហាក្នុងការផ្លាស់ប្តូរទិន្នន័យ។' });
        }
    }
}

/**
 * Standard Universal Management System
 * Handles Levels, Classes, and Classrooms
 */
/**
 * Standard Universal Management System
 * Handles Levels, Classes, and Classrooms
 */
let currentMgmtType = ''; // 'levels', 'classes', 'classrooms'
let mgmtData = [];
let mgmtSearchQuery = '';

const mgmtConfigs = {
    levels: {
        title: 'គ្រប់គ្រងកម្រិតសិក្សា',
        icon: 'fi-rr-layers',
        ref: 'settings/levels',
        bg: 'linear-gradient(135deg, #28a745, #1e7e34)',
        inputLabel: 'បន្ថែមនាំកម្រិតថ្មី',
        inputIcon: 'fi-rr-layer-plus',
        syncFunction: syncLevelsFromStudents
    },
    classes: {
        title: 'គ្រប់គ្រងថ្នាក់រៀន',
        icon: 'fi-rr-book-open-reader',
        ref: 'settings/classes',
        bg: 'linear-gradient(135deg, #17a2b8, #117a8b)',
        inputLabel: 'បន្ថែមថ្នាក់ថ្មី',
        inputIcon: 'fi-rr-book-medical',
        syncFunction: syncClassesFromStudents
    },
    classrooms: {
        title: 'គ្រប់គ្រងបន្ទប់រៀន',
        icon: 'fi-rr-door-open',
        ref: 'settings/classrooms',
        bg: 'linear-gradient(135deg, #fd7e14, #d96d00)',
        inputLabel: 'បន្ថែមបន្ទប់ថ្មី',
        inputIcon: 'fi-rr-door-closed',
        syncFunction: syncRoomsFromStudents
    },
    studyTypes: {
        title: 'គ្រប់គ្រងប្រភេទវគ្គសិក្សា',
        icon: 'fi-rr-apps',
        ref: 'settings/studyTypes',
        bg: 'linear-gradient(135deg, #dc3545, #b02a37)',
        inputLabel: 'បន្ថែមប្រភេទវគ្គថ្មី',
        inputIcon: 'fi-rr-add',
        syncFunction: syncStudyTypesFromStudents
    }
};

window.openLevelModal = function() { openManagementModal('levels'); };
window.openClassModal = function() { openManagementModal('classes'); };
window.openRoomModal = function() { openManagementModal('classrooms'); };
window.openStudyTypeModal = function() { openManagementModal('studyTypes'); };
window.openStudyTimeModal = typeof openStudyTimeModal === 'function' ? openStudyTimeModal : function() {
    renderStudyTimeList();
    const modalEl = document.getElementById('studyTimeModal');
    if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
};

window.openManagementModal = function(type) {
    currentMgmtType = type;
    const config = mgmtConfigs[type];
    if (!config) return;

    // Update UI
    const titleEl = document.getElementById('mgmt-title');
    const iconEl = document.getElementById('mgmt-icon');
    const headerEl = document.getElementById('mgmt-header');
    const labelEl = document.getElementById('mgmt-input-label');
    const inputIconEl = document.getElementById('mgmt-input-icon');
    const inputEl = document.getElementById('mgmt-input');
    const searchEl = document.getElementById('mgmt-search');

    if (titleEl) titleEl.textContent = config.title;
    if (iconEl) iconEl.className = `fi ${config.icon} me-2`;
    if (headerEl) headerEl.style.background = config.bg;
    if (labelEl) labelEl.textContent = config.inputLabel;
    if (inputIconEl) inputIconEl.className = `fi ${config.inputIcon}`;
    if (inputEl) inputEl.value = '';
    if (searchEl) searchEl.value = '';
    mgmtSearchQuery = '';

    const addBtn = document.getElementById('mgmt-add-btn');
    if (addBtn) {
        addBtn.onclick = () => addToManagement();
        addBtn.style.background = config.bg;
        addBtn.style.borderColor = 'transparent';
    }

    // Set sync button action
    const syncBtn = document.getElementById('mgmt-sync-btn');
    if (syncBtn) {
        if (config.syncFunction) {
            syncBtn.style.display = 'block';
            syncBtn.onclick = async () => {
                await config.syncFunction();
            };
        } else {
            syncBtn.style.display = 'none';
        }
    }

    // Load Data
    loadManagementData(type);

    const _staffMgmtEl = document.getElementById('managementModal');
    if (_staffMgmtEl) bootstrap.Modal.getOrCreateInstance(_staffMgmtEl).show();
};

window.filterManagementList = function(query) {
    mgmtSearchQuery = (query || '').toLowerCase();
    renderManagementList();
};

function loadManagementData(type) {
    const config = mgmtConfigs[type];
    if (!config) return;
    const mgmtRef = firebase.database().ref(config.ref);

    mgmtRef.off(); // Prevent multiple listeners
    mgmtRef.on('value', (snapshot) => {
        const data = snapshot.val() || {};
        mgmtData = Object.entries(data).map(([id, val]) => {
            const strVal = typeof val === 'object' && val !== null ? (val.name || val.time || val.value || '') : String(val || '');
            return { id, value: strVal };
        }).filter(item => item.value && item.value.trim() !== '');
        mgmtData.sort((a, b) => a.value.localeCompare(b.value, 'km'));
        renderManagementList();
    });
}

function filterManagementList(query) {
    mgmtSearchQuery = query.toLowerCase();
    renderManagementList();
}

function renderManagementList() {
    const list = document.getElementById('mgmt-list');
    if (!list) return;

    let filteredData = mgmtData;
    if (mgmtSearchQuery) {
        filteredData = mgmtData.filter(item => item.value.toLowerCase().includes(mgmtSearchQuery));
    }

    if (filteredData.length === 0) {
        list.innerHTML = `<div class="text-center py-5 text-muted">
            <i class="fi fi-rr-box-open d-block mb-2 fa-2x"></i>
            ${mgmtSearchQuery ? 'មិនមានលទ្ធផលស្វែងរក' : 'មិនទាន់មានទិន្នន័យ'}
        </div>`;
        return;
    }

    list.innerHTML = filteredData.map(item => `
        <div class="list-group-item d-flex justify-content-between align-items-center py-3">
            <span class="fw-bold text-dark">${item.value}</span>
            <div class="btn-group">
                <button class="btn btn-sm btn-outline-warning border-0" onclick="editManagementItem('${item.id}', '${item.value}')">
                    <i class="fi fi-rr-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger border-0" onclick="deleteManagementItem('${item.id}', '${item.value}')">
                    <i class="fi fi-rr-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

async function addToManagement() {
    const input = document.getElementById('mgmt-input');
    const value = input.value.trim();

    if (!value) {
        Swal.fire({ icon: 'warning', title: 'សូមបញ្ចូលព័ត៌មាន' });
        return;
    }

    if (mgmtData.some(d => d.value === value)) {
        Swal.fire({ icon: 'warning', title: 'ទិន្នន័យនេះមានរួចហើយ' });
        return;
    }

    try {
        const config = mgmtConfigs[currentMgmtType];
        await firebase.database().ref(config.ref).push(value);
        input.value = '';
        Swal.fire({ icon: 'success', title: 'បន្ថែមបានជោគជ័យ', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
    } catch (error) {
        console.error('Error adding to management:', error);
    }
}

async function editManagementItem(id, oldValue) {
    const { value: newValue } = await Swal.fire({
        title: 'កែប្រែទិន្នន័យ',
        input: 'text',
        inputValue: oldValue,
        showCancelButton: true,
        confirmButtonText: 'រក្សាទុក',
        cancelButtonText: 'បោះបង់'
    });

    if (newValue && newValue !== oldValue) {
        try {
            const config = mgmtConfigs[currentMgmtType];
            await firebase.database().ref(config.ref).child(id).set(newValue);

            // Sync settings/classDetails if renamed class
            if (currentMgmtType === 'classes' && oldValue) {
                const oldKey = encodeURIComponent(oldValue).replace(/\./g, '_');
                const newKey = encodeURIComponent(newValue).replace(/\./g, '_');
                const snap = await firebase.database().ref(`settings/classDetails/${oldKey}`).once('value');
                if (snap.exists()) {
                    const val = snap.val();
                    val.className = newValue;
                    await firebase.database().ref(`settings/classDetails/${newKey}`).set(val);
                    await firebase.database().ref(`settings/classDetails/${oldKey}`).remove();
                }
            }

            Swal.fire({ icon: 'success', title: 'កែប្រែជោគជ័យ', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        } catch (error) {
            console.error('Error editing item:', error);
        }
    }
}

async function deleteManagementItem(id, value) {
    const result = await Swal.fire({
        title: 'លុបទិន្នន័យ?',
        text: `តើអ្នកចង់លុប "${value}" មែនទេ?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'លុប',
        cancelButtonText: 'បោះបង់'
    });

    if (result.isConfirmed) {
        try {
            const config = mgmtConfigs[currentMgmtType];
            await firebase.database().ref(config.ref).child(id).remove();

            // Also clean up settings/classDetails if deleted class
            if (currentMgmtType === 'classes' && value) {
                const classKey = encodeURIComponent(value).replace(/\./g, '_');
                await firebase.database().ref(`settings/classDetails/${classKey}`).remove();
            }

            Swal.fire({ icon: 'success', title: 'លុបបានជោគជ័យ', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        } catch (error) {
            console.error('Error deleting item:', error);
        }
    }
}

/**
 * Populate Level and Homeroom Class selects from Master Settings
 */
function populateStaffSelects() {
    const levelSelect = document.getElementById('staff-level');
    const classSelect = document.getElementById('staff-homeroom');
    const classSelectTeacher = document.getElementById('staff-homeroom-select');
    const classroomSelect = document.getElementById('staff-classroom-select');
    const studyTypeSelect = document.getElementById('staff-study-type');
    const studyProgramSelect = document.getElementById('staff-study-program-select');

    // 1. Load Levels (កម្រិតសិក្សា)
    firebase.database().ref('settings/levels').on('value', (snapshot) => {
        const data = snapshot.val() || {};
        masterLevels = Array.from(new Set(
            Object.values(data).map(v => typeof v === 'string' ? v.trim() : (v.name || '').trim()).filter(Boolean)
        )).sort();

        if (levelSelect) {
            const currentVal = levelSelect.value;
            levelSelect.innerHTML = masterLevels.length > 0
                ? '<option value="">ជ្រើសរើសកម្រិត...</option>'
                : '<option value="">-- មិនទាន់មានកម្រិត --</option>';
            masterLevels.forEach(lvl => {
                const opt = document.createElement('option');
                opt.value = lvl;
                opt.textContent = lvl;
                levelSelect.appendChild(opt);
            });
            levelSelect.value = currentVal;
        }

        const hubLevelFilter = document.getElementById('class-hub-level-filter');
        if (hubLevelFilter) {
            const curHubVal = hubLevelFilter.value;
            hubLevelFilter.innerHTML = '<option value="">🎯 កម្រិតសិក្សាទាំងអស់</option>';
            masterLevels.forEach(lvl => {
                const opt = document.createElement('option');
                opt.value = lvl;
                opt.textContent = `🎯 ${lvl}`;
                hubLevelFilter.appendChild(opt);
            });
            hubLevelFilter.value = curHubVal;
        }

        if (typeof renderClassroomHub === 'function') renderClassroomHub();
    });

    // 2. Load Classes (ថ្នាក់រៀន - Homeroom Classes)
    firebase.database().ref('settings/classes').on('value', (snapshot) => {
        const data = snapshot.val() || {};
        masterClasses = Array.from(new Set(
            Object.values(data).map(v => typeof v === 'string' ? v.trim() : (v.name || '').trim()).filter(Boolean)
        )).sort();

        if (classSelect) {
            const currentVal = classSelect.value;
            classSelect.innerHTML = masterClasses.length > 0
                ? '<option value="">ជ្រើសរើសថ្នាក់...</option>'
                : '<option value="">-- មិនទាន់មានថ្នាក់រៀន --</option>';
            masterClasses.forEach(cls => {
                const opt = document.createElement('option');
                opt.value = cls;
                opt.textContent = cls;
                classSelect.appendChild(opt);
            });
            classSelect.value = currentVal;
        }

        if (classSelectTeacher) {
            const currentVal = classSelectTeacher.value;
            classSelectTeacher.innerHTML = masterClasses.length > 0
                ? '<option value="">+ ជ្រើសរើសថ្នាក់រៀន...</option>'
                : '<option value="">-- មិនទាន់មានថ្នាក់រៀន --</option>';
            masterClasses.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c;
                opt.textContent = `📚 ${c}`;
                classSelectTeacher.appendChild(opt);
            });
            classSelectTeacher.value = currentVal;
        }

        if (typeof renderClassroomHub === 'function') renderClassroomHub();
    });

    // 3. Load Classrooms (បន្ទប់រៀន - Physical Rooms)
    firebase.database().ref('settings/classrooms').on('value', (snapshot) => {
        const data = snapshot.val() || {};
        masterClassrooms = Array.from(new Set(
            Object.values(data).map(v => typeof v === 'string' ? v.trim() : (v.name || '').trim()).filter(Boolean)
        )).sort();

        if (classroomSelect) {
            const currentVal = classroomSelect.value;
            classroomSelect.innerHTML = masterClassrooms.length > 0
                ? '<option value="">-- ជ្រើសរើសបន្ទប់ --</option>'
                : '<option value="">-- មិនទាន់មានបន្ទប់រៀន --</option>';
            masterClassrooms.forEach(rm => {
                const opt = document.createElement('option');
                opt.value = rm;
                opt.textContent = `🚪 បន្ទប់ ${rm}`;
                classroomSelect.appendChild(opt);
            });
            classroomSelect.value = currentVal;
        }

        if (typeof renderClassroomHub === 'function') renderClassroomHub();
    });

    // 4. Load Study Types (ប្រភេទវគ្គ)
    firebase.database().ref('settings/studyTypes').on('value', (snapshot) => {
        const data = snapshot.val() || {};
        masterStudyTypes = Array.from(new Set(
            Object.values(data).map(v => typeof v === 'string' ? v.trim() : (v.name || '').trim()).filter(Boolean)
        )).sort();

        if (studyTypeSelect) {
            const currentVal = studyTypeSelect.value;
            studyTypeSelect.innerHTML = masterStudyTypes.length > 0
                ? '<option value="">ជ្រើសរើសប្រភេទវគ្គ...</option>'
                : '<option value="">-- មិនទាន់មានប្រភេទវគ្គ --</option>';

            const translationMap = {
                'chinese-fulltime': 'ថ្នាក់ភាសាចិនពេញម៉ោង',
                'chinese-parttime': 'ថ្នាក់ភាសាចិនក្រៅម៉ោង',
                'three-languages': 'ថ្នាក់ចំណះដឹងទូទៅ',
                'one-language': 'ថ្នាក់ភាសា (១ភាសា)',
                'two-languages': 'ថ្នាក់ភាសា (២ភាសា)',
                'cFullTime': 'ថ្នាក់ភាសាចិនពេញម៉ោង',
                'cPartTime': 'ថ្នាក់ភាសាចិនក្រៅម៉ោង'
            };

            masterStudyTypes.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t;
                opt.textContent = translationMap[t] || t;
                studyTypeSelect.appendChild(opt);
            });
            studyTypeSelect.value = currentVal;
        }

        if (typeof renderClassroomHub === 'function') renderClassroomHub();
    });

    // 5. Load Study Programs (វគ្គសិក្សា)
    if (studyProgramSelect) {
        firebase.database().ref('settings/studyPrograms').on('value', (snapshot) => {
            const data = snapshot.val() || {};
            const progs = Array.from(new Set(
                Object.values(data).map(v => typeof v === 'string' ? v.trim() : (v.name || '').trim()).filter(Boolean)
            )).sort();
            const currentVal = studyProgramSelect.value;
            studyProgramSelect.innerHTML = progs.length > 0
                ? '<option value="">ជ្រើសរើសវគ្គសិក្សា...</option>'
                : '<option value="">-- មិនទាន់មានវគ្គសិក្សា --</option>';
            progs.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p;
                opt.textContent = p;
                studyProgramSelect.appendChild(opt);
            });
            studyProgramSelect.value = currentVal;
        });
    }

    // 6. Load Master Class Details (settings/classDetails - Room, Hours, Level, Type, Teacher)
    firebase.database().ref('settings/classDetails').on('value', (snapshot) => {
        masterClassDetails = snapshot.val() || {};
        if (typeof renderClassroomHub === 'function') renderClassroomHub();
    });
}
/**
 * Sync Study Types from Students data (data-tracking.html source)
 */
async function syncStudyTypesFromStudents() {
    return syncSystemSettingFromStudents('studyTypes', ['studyType', 'courseType'], 'ប្រភេទវគ្គសិក្សា');
}

/**
 * Sync Levels from Students data
 */
async function syncLevelsFromStudents() {
    return syncSystemSettingFromStudents('levels', ['studyLevel'], 'កម្រិតសិក្សា');
}

/**
 * Sync Classes from Students data
 */
async function syncClassesFromStudents() {
    return syncSystemSettingFromStudents('classes', ['grade'], 'ថ្នាក់រៀន');
}

/**
 * Sync Classrooms from Students data
 */
async function syncRoomsFromStudents() {
    return syncSystemSettingFromStudents('classrooms', ['classroom'], 'បន្ទប់រៀន');
}

/**
 * Sync Study Hours (Times) from Students data
 */
async function syncStudentStudyHours() {
    return syncSystemSettingFromStudents('studyTimes', ['studyTime'], 'ម៉ោងសិក្សា');
}

/**
 * Generic Helper to sync any system setting from student data fields
 * @param {string} settingsPath - The subpath in settings/ (e.g., 'levels')
 * @param {string[]} studentFields - Array of field names to check in student object
 * @param {string} label - Display label for the alert
 */
async function syncSystemSettingFromStudents(settingsPath, studentFields, label) {
    Swal.fire({
        title: `កំពុងទាញយក${label}...`,
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        const snapshot = await firebase.database().ref('students').once('value');
        const students = snapshot.val() || {};

        const uniqueValues = new Set();
        Object.values(students).forEach(s => {
            studentFields.forEach(field => {
                const val = s[field];
                if (val && !['all', 'N/A', '', 'មិនមាន', '-'].includes(val)) {
                    // Prevent overlap: Rooms shouldn't take classes, and classes shouldn't take rooms
                    if (settingsPath === 'classrooms' && typeof val === 'string' && val.trim().startsWith('ថ្នាក់')) {
                        return;
                    }
                    if (settingsPath === 'classes' && typeof val === 'string' && (val.trim().startsWith('បន្ទប់') || val.trim().toLowerCase().startsWith('room'))) {
                        return;
                    }

                    // If it's a comma-separated list, split it
                    if (typeof val === 'string' && val.includes(',')) {
                        val.split(',').forEach(v => {
                            const trimmed = v.trim();
                            if (trimmed) uniqueValues.add(trimmed);
                        });
                    } else {
                        uniqueValues.add(val.toString().trim());
                    }
                }
            });
        });

        // Get current master data
        const masterSnap = await firebase.database().ref(`settings/${settingsPath}`).once('value');
        const masterData = masterSnap.val() || {};

        // Handle both simple array-like objects and objects with {id: time}
        const masterValues = Object.values(masterData).map(v =>
            (typeof v === 'object' && v !== null && v.time) ? v.time : v
        );

        const newValues = Array.from(uniqueValues).filter(v => !masterValues.includes(v));

        // Translation mapping for common English values from students data
        const translationMap = {
            'chinese-fulltime': 'ថ្នាក់ភាសាចិនពេញម៉ោង',
            'chinese-parttime': 'ថ្នាក់ភាសាចិនក្រៅម៉ោង',
            'three-languages': 'ថ្នាក់ចំណះដឹងទូទៅ',
            'one-language': 'ថ្នាក់ភាសា (១ភាសា)',
            'two-languages': 'ថ្នាក់ភាសា (២ភាសា)',
            'cFullTime': 'ថ្នាក់ភាសាចិនពេញម៉ោង',
            'cPartTime': 'ថ្នាក់ភាសាចិនក្រៅម៉ោង',
            'Full-time': 'ពេញម៉ោង',
            'Part-time': 'ក្រៅម៉ោង'
        };

        const finalNewValues = newValues.map(v => translationMap[v] || v);
        // Deduplicate again after translation
        const uniqueFinalValues = Array.from(new Set(finalNewValues)).filter(v => !masterValues.includes(v));

        if (uniqueFinalValues.length === 0) {
            Swal.fire({
                icon: 'info',
                title: `គ្មាន${label}ថ្មីទេ`,
                text: `ទិន្នន័យ${label}បានបច្ចុប្បន្នភាពជាមួយទិន្នន័យសិស្សរួចរាល់ហើយ។`
            });
            return 0;
        }

        const promises = uniqueFinalValues.map(v => firebase.database().ref(`settings/${settingsPath}`).push(v));
        await Promise.all(promises);

        Swal.fire({
            icon: 'success',
            title: `ទាញយក${label}បានជោគជ័យ`,
            text: `បានបន្ថែម${label}ថ្មីចំនួន ${uniqueFinalValues.length} ចូលក្នុងប្រព័ន្ធ។`
        });

        return uniqueFinalValues.length;
    } catch (err) {
        console.error(`Error syncing ${settingsPath}:`, err);
        Swal.fire({ icon: 'error', title: 'បរាជ័យ', text: `មិនអាចទាញយកទិន្នន័យ${label}បានទេ` });
        return 0;
    }
}

/**
 * Sync All System Settings and Teachers from Students
 */
async function syncAllFromStudents() {
    const result = await Swal.fire({
        title: 'ធ្វើបច្ចុប្បន្នភាពទិន្នន័យពីសិស្ស?',
        text: "ប្រព័ន្ធនឹងទាញយក ឈ្មោះគ្រូ ម៉ោងសិក្សា កម្រិត ថ្នាក់ និងបន្ទប់ ពីទិន្នន័យសិស្សទាំងអស់។",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#8a0e5b',
        confirmButtonText: 'បាទ/ចាស ទាញយកទាំងអស់',
        cancelButtonText: 'បោះបង់'
    });

    if (!result.isConfirmed) return;

    Swal.fire({
        title: 'កំពុងទាញយកទិន្នន័យសរុប...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        // Sync Teachers first (as it has a more complex logic)
        await syncTeachersFromStudentsInner();

        // Sync other settings
        const results = await Promise.all([
            syncSystemSettingFromStudentsSilent('studyTimes', ['studyTime']),
            syncSystemSettingFromStudentsSilent('levels', ['studyLevel']),
            syncSystemSettingFromStudentsSilent('classes', ['classroom', 'grade']),
            syncSystemSettingFromStudentsSilent('classrooms', ['classroom']),
            syncSystemSettingFromStudentsSilent('studyTypes', ['studyType', 'courseType'])
        ]);

        const totalAdded = results.reduce((a, b) => a + b, 0);

        Swal.fire({
            icon: 'success',
            title: 'បច្ចុប្បន្នភាពជោគជ័យ',
            text: `រាល់ទិន្នន័យការកំណត់ប្រព័ន្ធត្រូវបានទាញយក និងធ្វើបច្ចុប្បន្នភាពរួចរាល់។ បានបន្ថែមសរុប ${totalAdded} ទិន្នន័យថ្មី។`,
            confirmButtonColor: '#8a0e5b'
        });
    } catch (error) {
        console.error("Error in syncAll:", error);
        Swal.fire({ icon: 'error', title: 'កំហុស', text: 'មានបញ្ហាក្នុងការទាញយកទិន្នន័យមួយចំនួន' });
    }
}

/**
 * Silent version for bulk sync
 */
async function syncSystemSettingFromStudentsSilent(settingsPath, studentFields) {
    try {
        const snapshot = await firebase.database().ref('students').once('value');
        const students = snapshot.val() || {};
        const uniqueValues = new Set();
        Object.values(students).forEach(s => {
            studentFields.forEach(field => {
                const val = s[field];
                if (val && !['all', 'N/A', '', 'មិនមាន', '-'].includes(val)) {
                    if (typeof val === 'string' && val.includes(',')) {
                        val.split(',').forEach(v => { const trimmed = v.trim(); if (trimmed) uniqueValues.add(trimmed); });
                    } else { uniqueValues.add(val.toString().trim()); }
                }
            });
        });
        const masterSnap = await firebase.database().ref(`settings/${settingsPath}`).once('value');
        const masterData = masterSnap.val() || {};
        const masterValues = Object.values(masterData).map(v => (typeof v === 'object' && v !== null && v.time) ? v.time : v);
        const newValues = Array.from(uniqueValues).filter(v => !masterValues.includes(v));
        if (newValues.length > 0) {
            const promises = newValues.map(v => firebase.database().ref(`settings/${settingsPath}`).push(v));
            await Promise.all(promises);
        }
        return newValues.length;
    } catch (e) { return 0; }
}

/**
 * Internal version of syncTeachersFromStudents without UI blockers
 */
async function syncTeachersFromStudentsInner() {
    try {
        const snapshot = await firebase.database().ref('students').once('value');
        const students = snapshot.val() || {};

        const translationMap = {
            'chinese-fulltime': 'ថ្នាក់ភាសាចិនពេញម៉ោង',
            'chinese-parttime': 'ថ្នាក់ភាសាចិនក្រៅម៉ោង',
            'three-languages': 'ថ្នាក់ចំណះដឹងទូទៅ',
            'one-language': 'ថ្នាក់ភាសា (១ភាសា)',
            'two-languages': 'ថ្នាក់ភាសា (២ភាសា)',
            'cFullTime': 'ថ្នាក់ភាសាចិនពេញម៉ោង',
            'cPartTime': 'ថ្នាក់ភាសាចិនក្រៅម៉ោង',
            'Full-time': 'ពេញម៉ោង',
            'Part-time': 'ក្រៅម៉ោង'
        };

        const teacherMap = {};

        Object.values(students).forEach(s => {
            const addTeacherData = (rawName) => {
                if (!rawName || typeof rawName !== 'string' || !rawName.trim()) return;
                const name = rawName.trim();
                const lowerName = name.toLowerCase();

                if (!teacherMap[lowerName]) {
                    teacherMap[lowerName] = {
                        name: name,
                        phones: new Set(),
                        classrooms: new Set(),
                        classes: new Set(),
                        programs: new Set(),
                        studyTimes: new Set(),
                        levels: new Set(),
                        studyTypes: new Set()
                    };
                }

                // 1. Phone
                const phone = s.teacherPhone || '';
                if (phone && phone.trim() && !['N/A', 'មិនមាន', '-'].includes(phone.trim())) {
                    teacherMap[lowerName].phones.add(phone.trim());
                }

                // 2. Classroom & Classes
                if (s.classroom && s.classroom.trim() && !['N/A', 'មិនមាន', '-'].includes(s.classroom.trim())) {
                    teacherMap[lowerName].classrooms.add(s.classroom.trim());
                    teacherMap[lowerName].classes.add(s.classroom.trim());
                }
                if (s.grade && s.grade.trim() && !['N/A', 'មិនមាន', '-'].includes(s.grade.trim())) {
                    teacherMap[lowerName].classes.add(s.grade.trim());
                }

                // 3. Study Program
                const program = s.studyProgram || s.subject || '';
                if (program && program.trim() && !['N/A', 'មិនមាន', '-'].includes(program.trim())) {
                    teacherMap[lowerName].programs.add(program.trim());
                }

                // 4. Study Time
                if (s.studyTime && s.studyTime.trim() && !['N/A', 'មិនមាន', '-'].includes(s.studyTime.trim())) {
                    teacherMap[lowerName].studyTimes.add(s.studyTime.trim());
                }

                // 5. Study Level
                if (s.studyLevel && s.studyLevel.trim() && !['N/A', 'មិនមាន', '-'].includes(s.studyLevel.trim())) {
                    teacherMap[lowerName].levels.add(s.studyLevel.trim());
                }

                // 6. Study Type
                const rawType = s.studyType || s.courseType || '';
                if (rawType && rawType.trim() && !['N/A', 'មិនមាន', '-'].includes(rawType.trim())) {
                    const mappedType = translationMap[rawType.trim()] || rawType.trim();
                    teacherMap[lowerName].studyTypes.add(mappedType);
                }
            };

            addTeacherData(s.teacherName);
            addTeacherData(s.homeroomTeacher);
        });

        const staffRef = firebase.database().ref('staff');
        const staffSnapshot = await staffRef.once('value');
        const currentStaff = staffSnapshot.val() || {};

        const findStaffKey = (name) => {
            return Object.keys(currentStaff).find(key =>
                (currentStaff[key].nameKhmer || '').toLowerCase() === name.toLowerCase()
            );
        };

        const updates = {};
        for (const item of Object.values(teacherMap)) {
            const tName = item.name;
            const phoneList = Array.from(item.phones).filter(Boolean).join(', ');
            const classroomsList = Array.from(item.classrooms).filter(Boolean).join(', ');
            const classesList = Array.from(item.classes).filter(Boolean).join(', ');
            const programsList = Array.from(item.programs).filter(Boolean).join(', ');
            const studyTimesList = Array.from(item.studyTimes).filter(Boolean).join(', ');
            const levelsList = Array.from(item.levels).filter(Boolean).join(', ');
            const studyTypesList = Array.from(item.studyTypes).filter(Boolean).join(', ');

            const existingKey = findStaffKey(tName);
            if (existingKey) {
                const existing = currentStaff[existingKey] || {};
                if (phoneList && existing.phone !== phoneList) updates[`${existingKey}/phone`] = phoneList;
                if (classroomsList && existing.classroom !== classroomsList) updates[`${existingKey}/classroom`] = classroomsList;
                if (classesList && existing.homeroomClass !== classesList) updates[`${existingKey}/homeroomClass`] = classesList;
                if (programsList && existing.studyProgram !== programsList) updates[`${existingKey}/studyProgram`] = programsList;
                if (levelsList && existing.level !== levelsList) updates[`${existingKey}/level`] = levelsList;
                if (studyTimesList && existing.teachingHours !== studyTimesList) updates[`${existingKey}/teachingHours`] = studyTimesList;
                if (studyTypesList && existing.studyType !== studyTypesList) updates[`${existingKey}/studyType`] = studyTypesList;
                if (!existing.position || existing.position === 'ផ្សេងៗ') updates[`${existingKey}/position`] = 'គ្រូបង្រៀន';
            } else {
                const newKey = staffRef.push().key;
                updates[newKey] = {
                    nameKhmer: tName,
                    nameChinese: '',
                    position: 'គ្រូបង្រៀន',
                    phone: phoneList,
                    classroom: classroomsList,
                    homeroomClass: classesList,
                    studyProgram: programsList,
                    level: levelsList,
                    teachingHours: studyTimesList,
                    studyType: studyTypesList,
                    gender: '',
                    status: 'active',
                    hireDate: new Date().toISOString().split('T')[0],
                    createdAt: new Date().toISOString(),
                    pin: '2024',
                    notes: 'ទាញយកស្វ័យប្រវត្តិពីទិន្នន័យសិស្ស'
                };
            }
        }
        if (Object.keys(updates).length > 0) await staffRef.update(updates);
    } catch (e) { console.error('Error in syncTeachersFromStudentsInner:', e); }
}

/**
 * Mark Student as Graduated (Copied from Data Tracking logic for consistency)
 */
window.markAsGraduated = async (key) => {
    // We need to fetch the student name for the modal
    try {
        const snap = await firebase.database().ref(`students/${key}`).once('value');
        const s = snap.val();
        if (!s) return;

        Swal.fire({
            title: '<h3 class="fw-bold mb-0">បញ្ចប់ការសិក្សា (Graduation)</h3>',
            html: `
                <div class="text-start p-2">
                    <p class="text-muted small mb-3">សូមបញ្ជាក់ព័ត៌មានលម្អិតសម្រាប់ការបញ្ចប់ការសិក្សារបស់សិស្ស <b>${s.lastName} ${s.firstName}</b></p>
                    <div class="mb-3">
                        <label class="form-label fw-bold small"><i class="fi fi-rr-calendar me-1"></i>កាលបរិច្ឆេទបញ្ចប់ (Graduation Date)</label>
                        <input type="date" id="gradDate" class="form-control form-control-lg rounded-3" value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="mb-0">
                        <label class="form-label fw-bold small"><i class="fi fi-rr-comment-alt me-1"></i>កំណត់សម្គាល់ (Note/Remark)</label>
                        <textarea id="gradNote" class="form-control rounded-3" rows="3" placeholder="បញ្ចូលព័ត៌មានបន្ថែម ប្រសិនបើមាន..."></textarea>
                    </div>
                </div>
            `,
            icon: 'info',
            showCancelButton: true,
            confirmButtonColor: '#198754',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '<i class="fi fi-rr-check-circle me-2"></i>យល់ព្រមបញ្ចប់',
            cancelButtonText: 'បោះបង់',
            customClass: {
                popup: 'rounded-4 border-0 shadow-lg',
                title: 'text-success'
            },
            focusConfirm: false,
            preConfirm: () => {
                const date = document.getElementById('gradDate').value;
                const note = document.getElementById('gradNote').value;
                if (!date) {
                    Swal.showValidationMessage('សូមជ្រើសរើសកាលបរិច្ឆេទ!');
                    return false;
                }
                return { date, note };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'កំពុងរក្សាទុក...',
                    allowOutsideClick: false,
                    didOpen: () => { Swal.showLoading(); }
                });

                const { date, note } = result.value;
                const updates = {
                    enrollmentStatus: 'graduated',
                    graduatedDate: date,
                    graduationNote: note || '',
                    lastUpdated: new Date().toISOString()
                };

                // Also update remark if note is provided
                if (note) {
                    const oldRemark = s.remark || '';
                    updates.remark = (oldRemark ? oldRemark + '\n' : '') + `[បញ្ចប់ការសិក្សា ${date}]: ` + note;
                }

                firebase.database().ref(`students/${key}`).update(updates).then(() => {
                    Swal.fire({
                        icon: 'success',
                        title: 'ជោគជ័យ',
                        text: 'សិស្សត្រូវបានកំណត់ថាបានបញ្ចប់ការសិក្សារួចរាល់!',
                        timer: 2000,
                        showConfirmButton: false,
                        customClass: { popup: 'rounded-4' }
                    });

                    // Refresh current view if we're in the modal
                    if (typeof currentStudyTimeFilter !== 'undefined') {
                        viewStudentsInTime(currentStudyTimeFilter);
                    }
                }).catch((error) => {
                    Swal.fire('Error', error.message, 'error');
                });
            }
        });
    } catch (e) {
        console.error(e);
    }
};

/**
 * Setup image preview logic for staff modal
 */
function setupImageHelper() {
    const input = document.getElementById('staff-image-input');
    if (!input) return;
}

window.previewStaffImage = function(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const container = document.getElementById('staffImagePreviewContainer');
            if (container) {
                container.innerHTML = `<img src="${e.target.result}" class="w-100 h-100" style="object-fit: cover;">`;
            }
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function resetStaffImagePreview() {
    const container = document.getElementById('staffImagePreviewContainer');
    if (container) {
        container.innerHTML = `<i class="fi fi-rr-user text-muted" style="font-size: 2.2rem;"></i>`;
    }
    const input = document.getElementById('staff-image-input');
    if (input) input.value = '';
}
window.resetStaffImagePreview = resetStaffImagePreview;

// Copy PIN to clipboard
function copyStaffPin() {
    const pinInput = document.getElementById('staff-pin');
    const pin = pinInput ? pinInput.value : '';
    if (!pin) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'info',
                title: 'មិនទាន់មាន PIN',
                text: 'សូមចុចប៊ូតុង Refresh ដើម្បីបង្កើត PIN ថ្មី',
                timer: 1500,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
            });
        }
        return;
    }
    navigator.clipboard.writeText(pin).then(() => {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'ចម្លង PIN បានជោគជ័យ!',
                text: `PIN: ${pin}`,
                timer: 1500,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
            });
        }
    }).catch(() => {
        alert('PIN: ' + pin);
    });
}
window.copyStaffPin = copyStaffPin;

// Generate a random 4-digit PIN for staff portal
function generateStaffPin() {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const pinInput = document.getElementById('staff-pin');
    if (pinInput) {
        pinInput.value = pin;
    }
}
window.generateStaffPin = generateStaffPin;

// Export openAddStaffModal to window
window.openAddStaffModal = openAddStaffModal;

// ==========================================================================
// Staff Activities & System Audit Sub-Module
// ==========================================
let cachedStaffActivities = [];
let currentActivityViewMode = 'table'; // 'table' | 'timeline'

function getLocalStaffActivities() {
    try {
        return JSON.parse(localStorage.getItem('cached_staff_activities') || '[]');
    } catch (e) {
        return [];
    }
}

function saveLocalStaffActivity(actRecord) {
    try {
        const list = getLocalStaffActivities();
        list.unshift({ id: 'loc_' + Date.now(), ...actRecord });
        if (list.length > 100) list.length = 100;
        localStorage.setItem('cached_staff_activities', JSON.stringify(list));
    } catch (e) {}
}

/**
 * Log a staff activity to Firebase
 */
window.logStaffActivity = function(actionType, targetName, details, extraData = {}) {
    try {
        const currentUser = window.currentUserProfileData || {};
        let actorName = currentUser.displayName || currentUser.name;
        if (!actorName && firebase.auth().currentUser) {
            actorName = firebase.auth().currentUser.displayName || firebase.auth().currentUser.email.split('@')[0];
        }
        if (!actorName) actorName = 'Admin (អ្នកគ្រប់គ្រង)';

        const actorEmail = firebase.auth().currentUser ? firebase.auth().currentUser.email : '';
        const actorImage = currentUser.imageUrl || '';

        const actRecord = {
            actionType: actionType, // 'create' | 'update' | 'delete' | 'transfer' | 'config'
            targetName: targetName || 'បុគ្គលិកទូទៅ',
            details: details || '',
            actorName: actorName,
            actorEmail: actorEmail,
            actorImage: actorImage,
            timestamp: Date.now(),
            createdAt: new Date().toISOString(),
            ...extraData
        };

        // Cache locally so activities are never lost if Firebase rules restrict writes
        saveLocalStaffActivity(actRecord);

        // Push to Firebase with completion callback to avoid unhandled PERMISSION_DENIED promise rejections
        if (typeof firebase !== 'undefined' && firebase.database) {
            try {
                const pushRef = firebase.database().ref('staff_activities').push();
                pushRef.set({
                    ...actRecord,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                }, function(err) {
                    if (err) {
                        // Suppress permission_denied silently since already preserved in local activity log
                    }
                });
            } catch (netErr) {
                // Ignore network errors
            }
        }
    } catch (err) {
        // Suppress logging errors
    }
};

/**
 * Initialize / Refresh Activities listener
 */
window.refreshStaffActivities = function() {
    const tbody = document.getElementById('activity-log-table-body');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-5 text-muted">
                    <div class="spinner-border spinner-border-sm text-primary me-2"></div>
                    កំពុងទាញយកទិន្នន័យសកម្មភាព...
                </td>
            </tr>
        `;
    }
    loadStaffActivities();
};

function loadStaffActivities() {
    try {
        const localActs = getLocalStaffActivities();
        const fallbackFallback = () => {
            let list = [...localActs];
            if (list.length === 0 && staffData && Object.keys(staffData).length > 0) {
                Object.entries(staffData).slice(0, 15).forEach(([id, s]) => {
                    list.push({
                        id: 'syn_' + id,
                        actionType: 'create',
                        targetName: s.nameKhmer || s.name || s.nameEnglish || 'បុគ្គលិក',
                        details: `បានបញ្ចូលទិន្នន័យបុគ្គលិក ${s.nameKhmer || s.name || ''} ចូលក្នុងប្រព័ន្ធ (តួនាទី: ${s.position || s.role || 'គ្រូបង្រៀន'})`,
                        actorName: 'Admin System',
                        actorEmail: 'admin@tianxin.edu',
                        actorImage: s.imageUrl || '',
                        timestamp: s.createdAt ? new Date(s.createdAt).getTime() : (Date.now() - 3600000),
                        createdAt: s.createdAt || new Date().toISOString()
                    });
                });
            }
            cachedStaffActivities = list;
            const actBadge = document.getElementById('tab-badge-activities');
            if (actBadge) actBadge.textContent = list.length;
            renderStaffActivitiesView();
        };

        if (typeof firebase === 'undefined' || !firebase.database) {
            fallbackFallback();
            return;
        }

        firebase.database().ref('staff_activities').limitToLast(200).on('value', snapshot => {
            let list = [];
            if (snapshot.exists()) {
                snapshot.forEach(child => {
                    list.unshift({ id: child.key, ...child.val() });
                });
            }

            // Merge recent local activities
            if (localActs.length > 0) {
                localActs.forEach(la => {
                    if (!list.some(item => item.id === la.id || (item.details === la.details && Math.abs((item.timestamp || 0) - (la.timestamp || 0)) < 3000))) {
                        list.unshift(la);
                    }
                });
            }

            // If no records in Firebase yet, synthesize friendly initial activities from existing staff data
            if (list.length === 0 && staffData && Object.keys(staffData).length > 0) {
                Object.entries(staffData).slice(0, 15).forEach(([id, s]) => {
                    list.push({
                        id: 'syn_' + id,
                        actionType: 'create',
                        targetName: s.nameKhmer || s.name || s.nameEnglish || 'បុគ្គលិក',
                        details: `បានបញ្ចូលទិន្នន័យបុគ្គលិក ${s.nameKhmer || s.name || ''} ចូលក្នុងប្រព័ន្ធ (តួនាទី: ${s.position || s.role || 'គ្រូបង្រៀន'})`,
                        actorName: 'Admin System',
                        actorEmail: 'admin@tianxin.edu',
                        actorImage: s.imageUrl || '',
                        timestamp: s.createdAt ? new Date(s.createdAt).getTime() : (Date.now() - 3600000),
                        createdAt: s.createdAt || new Date().toISOString()
                    });
                });
            }

            cachedStaffActivities = list;

            // Update Tab Badges
            const actBadge = document.getElementById('tab-badge-activities');
            if (actBadge) actBadge.textContent = list.length;

            // Render current view
            renderStaffActivitiesView();
        }, (error) => {
            // Permission denied or network error on read -> graceful fallback
            fallbackFallback();
        });
    } catch (e) {
        console.warn("loadStaffActivities error:", e);
    }
}
window.loadStaffActivities = loadStaffActivities;

/**
 * Render Activities KPI Cards and List/Timeline
 */
window.renderStaffActivitiesView = function() {
    if (!cachedStaffActivities || cachedStaffActivities.length === 0) {
        loadStaffActivities();
        return;
    }

    const now = new Date();
    const isToday = (d) => {
        const itemDate = new Date(d);
        return itemDate.getDate() === now.getDate() &&
               itemDate.getMonth() === now.getMonth() &&
               itemDate.getFullYear() === now.getFullYear();
    };

    const totalCount = cachedStaffActivities.length;
    const todayCount = cachedStaffActivities.filter(a => isToday(a.createdAt || a.timestamp)).length;
    const updatesCount = cachedStaffActivities.filter(a => a.actionType === 'create' || a.actionType === 'update').length;
    const transfersCount = cachedStaffActivities.filter(a => a.actionType === 'transfer' || a.actionType === 'delete').length;

    // KPI Badges
    const statTotal = document.getElementById('act-stat-total');
    const statToday = document.getElementById('act-stat-today');
    const statUpdates = document.getElementById('act-stat-updates');
    const statTransfers = document.getElementById('act-stat-transfers');

    if (statTotal) statTotal.textContent = totalCount;
    if (statToday) statToday.textContent = todayCount;
    if (statUpdates) statUpdates.textContent = updatesCount;
    if (statTransfers) statTransfers.textContent = transfersCount;

    filterActivitiesList();
};

/**
 * Filter activities by type, date, search
 */
window.filterActivitiesList = function() {
    const typeFilter = document.getElementById('activity-type-filter')?.value || 'all';
    const dateFilter = document.getElementById('activity-date-filter')?.value || 'all';
    const searchVal = (document.getElementById('activity-search-input')?.value || '').trim().toLowerCase();

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const sevenDays = 7 * oneDay;
    const thirtyDays = 30 * oneDay;

    let filtered = cachedStaffActivities.filter(act => {
        // Type filter
        if (typeFilter !== 'all' && act.actionType !== typeFilter) return false;

        // Date filter
        const time = act.timestamp || (act.createdAt ? new Date(act.createdAt).getTime() : now);
        if (dateFilter === 'today' && (now - time > oneDay)) return false;
        if (dateFilter === 'week' && (now - time > sevenDays)) return false;
        if (dateFilter === 'month' && (now - time > thirtyDays)) return false;

        // Search keyword
        if (searchVal) {
            const matchName = (act.targetName || '').toLowerCase().includes(searchVal);
            const matchActor = (act.actorName || '').toLowerCase().includes(searchVal);
            const matchDetails = (act.details || '').toLowerCase().includes(searchVal);
            if (!matchName && !matchActor && !matchDetails) return false;
        }

        return true;
    });

    renderActivitiesTable(filtered);
    renderActivitiesTimeline(filtered);
};

function getActivityBadgeHtml(type) {
    const meta = {
        create: { label: 'បន្ថែមបុគ្គលិកថ្មី', icon: 'fi-rr-user-add', class: 'activity-badge-create' },
        update: { label: 'កែប្រែព័ត៌មាន', icon: 'fi-rr-user-pen', class: 'activity-badge-update' },
        transfer: { label: 'ផ្ទេរសិស្សទៅគ្រូថ្មី', icon: 'fi-rr-exchange', class: 'activity-badge-transfer' },
        delete: { label: 'លុបចេញពីប្រព័ន្ធ', icon: 'fi-rr-trash', class: 'activity-badge-delete' },
        config: { label: 'កែប្រែទិន្នន័យសិក្សា', icon: 'fi-rr-settings', class: 'activity-badge-config' }
    }[type] || { label: 'សកម្មភាពទូទៅ', icon: 'fi-rr-time-past', class: 'activity-badge-config' };

    return `<span class="activity-badge-pill ${meta.class}"><i class="fi ${meta.icon}"></i> ${meta.label}</span>`;
}

function formatRelativeTime(timestamp) {
    if (!timestamp) return 'ថ្មីៗនេះ';
    const now = Date.now();
    const diff = Math.floor((now - timestamp) / 1000);
    if (diff < 60) return 'មុននេះបន្តិច';
    if (diff < 3600) return `មុននេះ ${Math.floor(diff / 60)} នាទី`;
    if (diff < 86400) return `មុននេះ ${Math.floor(diff / 3600)} ម៉ោង`;
    const d = new Date(timestamp);
    return `${d.toLocaleDateString('km-KH')} ${d.toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit' })}`;
}

function renderActivitiesTable(list) {
    const tbody = document.getElementById('activity-log-table-body');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-5 text-muted">
                    <i class="fi fi-rr-inbox d-block fs-1 mb-2 opacity-50"></i>
                    គ្មានកំណត់ត្រាសកម្មភាពត្រូវនឹងលក្ខខណ្ឌស្វែងរកនេះឡើយ
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = list.map(item => {
        const timeStr = formatRelativeTime(item.timestamp || (item.createdAt ? new Date(item.createdAt).getTime() : Date.now()));
        const fullDate = item.createdAt ? new Date(item.createdAt).toLocaleString('km-KH') : '';
        const actorImg = item.actorImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.actorName || 'User')}&background=8a0e5b&color=fff`;

        return `
            <tr>
                <td class="ps-4">
                    <div class="fw-bold text-dark font-size-sm">${timeStr}</div>
                    <small class="text-muted" style="font-size: 0.72rem;">${fullDate}</small>
                </td>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <img src="${actorImg}" class="activity-actor-avatar" alt="Avatar">
                        <div>
                            <div class="fw-bold text-dark font-size-sm">${item.actorName || 'Admin'}</div>
                            <small class="text-muted" style="font-size: 0.72rem;">${item.actorEmail || 'System'}</small>
                        </div>
                    </div>
                </td>
                <td>${getActivityBadgeHtml(item.actionType)}</td>
                <td>
                    <div class="fw-bold text-primary font-size-sm">
                        <i class="fi fi-rr-chalkboard-user me-1 text-muted"></i>${item.targetName || 'បុគ្គលិក'}
                    </div>
                </td>
                <td>
                    <div class="text-secondary font-size-sm text-truncate" style="max-width: 380px;" title="${item.details || ''}">
                        ${item.details || 'គ្មានព័ត៌មានពិពណ៌នា'}
                    </div>
                </td>
                <td class="text-end pe-4">
                    <button class="btn btn-sm btn-light rounded-pill px-3 shadow-2xs" onclick="viewActivityDetails('${encodeURIComponent(JSON.stringify(item))}')">
                        <i class="fi fi-rr-eye text-primary me-1"></i> លម្អិត
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function renderActivitiesTimeline(list) {
    const stream = document.getElementById('activity-timeline-stream');
    if (!stream) return;

    if (list.length === 0) {
        stream.innerHTML = `<div class="text-center py-5 text-muted">គ្មានកំណត់ត្រាសកម្មភាពឡើយ</div>`;
        return;
    }

    stream.innerHTML = list.slice(0, 30).map(item => {
        const timeStr = formatRelativeTime(item.timestamp || (item.createdAt ? new Date(item.createdAt).getTime() : Date.now()));
        const fullDate = item.createdAt ? new Date(item.createdAt).toLocaleString('km-KH') : '';
        const actorImg = item.actorImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.actorName || 'User')}&background=8a0e5b&color=fff`;

        return `
            <div class="activity-timeline-item">
                <div class="activity-timeline-node">
                    <i class="fi fi-rr-check"></i>
                </div>
                <div class="activity-timeline-card">
                    <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                        <div class="d-flex align-items-center gap-2">
                            <img src="${actorImg}" class="activity-actor-avatar" alt="Avatar">
                            <div>
                                <span class="fw-bold text-dark font-size-sm">${item.actorName || 'Admin'}</span>
                                <span class="text-muted ms-1" style="font-size: 0.75rem;">• ${timeStr}</span>
                            </div>
                        </div>
                        <div>${getActivityBadgeHtml(item.actionType)}</div>
                    </div>
                    <div class="fw-bold text-primary mb-1">
                        <i class="fi fi-rr-chalkboard-user me-1 text-muted"></i>${item.targetName || ''}
                    </div>
                    <p class="mb-0 text-secondary font-size-sm">${item.details || ''}</p>
                    <small class="text-muted d-block mt-2" style="font-size: 0.72rem;">${fullDate}</small>
                </div>
            </div>
        `;
    }).join('');
}

window.toggleActivityViewMode = function(mode) {
    currentActivityViewMode = mode;
    const tableCont = document.getElementById('activity-table-container');
    const timeCont = document.getElementById('activity-timeline-container');
    const btnTable = document.getElementById('btn-act-view-table');
    const btnTimeline = document.getElementById('btn-act-view-timeline');

    if (mode === 'timeline') {
        if (tableCont) tableCont.classList.add('d-none');
        if (timeCont) timeCont.classList.remove('d-none');
        if (btnTable) { btnTable.classList.remove('active', 'btn-white', 'shadow-xs'); btnTable.classList.add('text-muted'); }
        if (btnTimeline) { btnTimeline.classList.add('active', 'btn-white', 'shadow-xs'); btnTimeline.classList.remove('text-muted'); }
    } else {
        if (tableCont) tableCont.classList.remove('d-none');
        if (timeCont) timeCont.classList.add('d-none');
        if (btnTable) { btnTable.classList.add('active', 'btn-white', 'shadow-xs'); btnTable.classList.remove('text-muted'); }
        if (btnTimeline) { btnTimeline.classList.remove('active', 'btn-white', 'shadow-xs'); btnTimeline.classList.add('text-muted'); }
    }
};

window.viewActivityDetails = function(encodedItem) {
    try {
        const item = JSON.parse(decodeURIComponent(encodedItem));
        const fullDate = item.createdAt ? new Date(item.createdAt).toLocaleString('km-KH') : 'មិនមាន';
        
        Swal.fire({
            title: `<div class="fw-bold text-dark fs-5"><i class="fi fi-rr-time-past text-primary me-2"></i>ព័ត៌មានលម្អិតនៃសកម្មភាព</div>`,
            html: `
                <div class="text-start p-2 font-size-sm">
                    <div class="mb-3 p-3 rounded-3 bg-light border">
                        <div class="d-flex align-items-center justify-content-between mb-2">
                            <span class="text-muted">ប្រភេទសកម្មភាព៖</span>
                            <span>${getActivityBadgeHtml(item.actionType)}</span>
                        </div>
                        <div class="d-flex align-items-center justify-content-between mb-2">
                            <span class="text-muted">បុគ្គលិកគោលដៅ៖</span>
                            <span class="fw-bold text-primary">${item.targetName || 'បុគ្គលិក'}</span>
                        </div>
                        <div class="d-flex align-items-center justify-content-between mb-2">
                            <span class="text-muted">ប្រតិបត្តិករ (Actor)៖</span>
                            <span class="fw-bold text-dark">${item.actorName || 'Admin'} (${item.actorEmail || 'System'})</span>
                        </div>
                        <div class="d-flex align-items-center justify-content-between">
                            <span class="text-muted">កាលបរិច្ឆេទ & ម៉ោង៖</span>
                            <span class="fw-bold text-secondary">${fullDate}</span>
                        </div>
                    </div>
                    <div class="p-3 rounded-3 bg-white border">
                        <div class="fw-bold text-dark mb-1">📝 ពិពណ៌នាអំពីការផ្លាស់ប្តូរ៖</div>
                        <div class="text-secondary" style="line-height: 1.6;">${item.details || 'គ្មានព័ត៌មានពិពណ៌នា'}</div>
                    </div>
                </div>
            `,
            confirmButtonText: 'យល់ព្រម',
            confirmButtonColor: '#8a0e5b',
            customClass: {
                popup: 'rounded-4 shadow-lg border-0'
            }
        });
    } catch (e) {
        console.error(e);
    }
};

window.exportActivitiesCsv = function() {
    if (!cachedStaffActivities || cachedStaffActivities.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'មិនមានទិន្នន័យ',
            text: 'មិនមានកំណត់ត្រាសកម្មភាពសម្រាប់នាំចេញឡើយ។',
            confirmButtonColor: '#8a0e5b'
        });
        return;
    }

    const headers = ["កាលបរិច្ឆេទ", "ម៉ោង", "ប្រតិបត្តិករ", "Email", "ប្រភេទសកម្មភាព", "បុគ្គលិកគោលដៅ", "ព័ត៌មានលម្អិត"];
    const rows = cachedStaffActivities.map(a => {
        const d = a.createdAt ? new Date(a.createdAt) : new Date();
        return [
            `"${d.toLocaleDateString('km-KH')}"`,
            `"${d.toLocaleTimeString('km-KH')}"`,
            `"${(a.actorName || '').replace(/"/g, '""')}"`,
            `"${(a.actorEmail || '').replace(/"/g, '""')}"`,
            `"${(a.actionType || '').replace(/"/g, '""')}"`,
            `"${(a.targetName || '').replace(/"/g, '""')}"`,
            `"${(a.details || '').replace(/"/g, '""')}"`
        ].join(',');
    });

    const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Staff_Activities_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// ==========================================================================
// Standard Universal HR Management Hub (Modern Executive HR Module)
// ==========================================================================
window.currentHrDisplayMode = 'table'; // 'table' | 'grid'
window.currentHrStatusFilter = 'all'; // 'all' | 'active' | 'fulltime' | 'parttime' | 'leave' | 'expiring' | 'inactive'
window.currentHrScope = 'hr_only'; // 'hr_only' | 'all_school'
window.currentHrDepartmentFilter = '';
window.currentHrShiftFilter = '';
window.currentHrSearch = '';
window.currentHrSort = { column: 'name', dir: 'asc' };
window.selectedHrStaffIds = new Set();
window.currentFilteredHrList = [];
window.hrBannerDismissed = false;

/**
 * Determine if a staff member belongs to HR / Office category
 */
function isOfficeHrStaff(s) {
    if (!s) return false;
    const pos = (s.position || '').toLowerCase();
    const dept = (s.department || '').toLowerCase();
    // Primary teacher check
    if (pos.includes('គ្រូ') || pos.includes('teacher') || dept.includes('គរុកោសល្យ') || dept.includes('បង្រៀន')) {
        return false;
    }
    return true;
}

/**
 * Calculate contract expiry status
 */
function getContractStatus(contractEnd) {
    if (!contractEnd || contractEnd === 'N/A' || contractEnd === 'មិនមាន') {
        return { status: 'none', text: 'មិនទាន់កំណត់', daysLeft: null, badgeHtml: '<span class="badge bg-light text-muted border">-</span>' };
    }
    const end = new Date(contractEnd);
    if (isNaN(end.getTime())) {
        return { status: 'none', text: contractEnd, daysLeft: null, badgeHtml: `<span class="badge bg-light text-muted border">${escapeStaffHtml(contractEnd)}</span>` };
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const formattedDate = formatDate(contractEnd);

    if (diffDays < 0) {
        return {
            status: 'expired',
            text: `ផុតកំណត់ (${Math.abs(diffDays)} ថ្ងៃមុន)`,
            daysLeft: diffDays,
            badgeHtml: `<span class="contract-badge-danger" title="កិច្ចសន្យាបានផុតកំណត់នៅ ${formattedDate}"><i class="fi fi-rr-cross-circle"></i> ផុតកំណត់ (${Math.abs(diffDays)} ថ្ងៃ)</span>`
        };
    } else if (diffDays <= 30) {
        return {
            status: 'expiring',
            text: `នៅសល់ ${diffDays} ថ្ងៃ`,
            daysLeft: diffDays,
            badgeHtml: `<span class="contract-badge-warning" title="ផុតកំណត់នៅ ${formattedDate}"><i class="fi fi-rr-time-forward"></i> នៅសល់ ${diffDays} ថ្ងៃ</span>`
        };
    } else {
        const monthsLeft = Math.floor(diffDays / 30);
        const durationText = monthsLeft > 0 ? `នៅសល់ ~${monthsLeft} ខែ` : `នៅសល់ ${diffDays} ថ្ងៃ`;
        return {
            status: 'active',
            text: durationText,
            daysLeft: diffDays,
            badgeHtml: `<span class="contract-badge-ok" title="ផុតកំណត់នៅ ${formattedDate}"><i class="fi fi-rr-calendar-check"></i> ${durationText}</span>`
        };
    }
}

/**
 * Smooth number count-up animation for HR Hub
 */
function animateHrValue(elementId, targetValue, duration = 400) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const target = parseInt(targetValue, 10) || 0;
    const current = parseInt(el.textContent.replace(/,/g, ''), 10) || 0;
    if (current === target) {
        el.textContent = target;
        return;
    }
    const startTime = performance.now();
    function update(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const val = Math.round(current + (target - current) * easeOut);
        el.textContent = val;
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            el.textContent = target;
        }
    }
    requestAnimationFrame(update);
}

/**
 * Highlight search keyword in text
 */
function highlightHrText(text, query) {
    if (!text) return '';
    const safe = escapeStaffHtml(String(text));
    if (!query) return safe;
    const cleanQ = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!cleanQ) return safe;
    const regex = new RegExp(`(${cleanQ})`, 'gi');
    return safe.replace(regex, '<mark class="hr-search-highlight">$1</mark>');
}

/**
 * Toggle HR Analytics Dashboard
 */
window.toggleHrAnalytics = function() {
    const section = document.getElementById('hr-analytics-section');
    const btnText = document.getElementById('hr-analytics-btn-text');
    const labelToggle = document.getElementById('hr-analytics-toggle-label');
    if (!section) return;

    const isHidden = section.classList.contains('d-none');
    if (isHidden) {
        section.classList.remove('d-none');
        if (btnText) btnText.textContent = 'លាក់ផ្ទាំងវិភាគ';
        if (labelToggle) labelToggle.textContent = 'លាក់ក្រាហ្វវិភាគ';
        const list = window.currentFilteredHrList || [];
        window.initOrUpdateHrCharts(list);
    } else {
        section.classList.add('d-none');
        if (btnText) btnText.textContent = 'វិភាគទិន្នន័យ (Analytics)';
        if (labelToggle) labelToggle.textContent = 'បង្ហាញក្រាហ្វវិភាគ';
    }
};

/**
 * Initialize or Update Dynamic HR Charts (Chart.js)
 */
window.initOrUpdateHrCharts = function(list) {
    if (typeof Chart === 'undefined') return;

    const allStaff = Object.entries(staffData || {}).map(([id, d]) => ({ id, ...d }));
    const baseList = (window.currentHrScope === 'all_school') ? allStaff : allStaff.filter(isOfficeHrStaff);

    // 1. Department Breakdown Data
    const deptLabels = [
        'រដ្ឋបាល & ធនធានមនុស្ស',
        'ហិរញ្ញវត្ថុ & គណនេយ្យ',
        'ព័ត៌មានវិទ្យា & IT',
        'សិក្សាធិការ & បណ្ណាល័យ',
        'សន្តិសុខ & អនាម័យ',
        'ផ្នែកគរុកោសល្យ & បង្រៀន',
        'ផ្សេងៗ'
    ];
    const deptCounts = deptLabels.map(dept => {
        return baseList.filter(s => {
            const d = (s.department || '').trim();
            if (dept === 'ផ្សេងៗ') {
                return !deptLabels.slice(0, 6).some(k => d.includes(k.split(' ')[0]));
            }
            return d.includes(dept.split(' ')[0]);
        }).length;
    });

    const deptColors = [
        '#059669', // Admin/HR: Emerald
        '#f59e0b', // Finance: Amber
        '#3b82f6', // IT: Blue
        '#8b5cf6', // Academic: Purple
        '#64748b', // Security: Slate
        '#ec4899', // Teaching: Pink
        '#cbd5e1'  // Other: Gray
    ];

    // Render Doughnut Chart
    const deptCanvas = document.getElementById('hr-dept-donut-chart');
    if (deptCanvas) {
        if (window.hrDeptDonutChartInstance) {
            window.hrDeptDonutChartInstance.destroy();
        }
        const ctx = deptCanvas.getContext('2d');
        window.hrDeptDonutChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['រដ្ឋបាល & HR', 'ហិរញ្ញវត្ថុ', 'IT', 'សិក្សាធិការ', 'សន្តិសុខ/អនាម័យ', 'បង្រៀន', 'ផ្សេងៗ'],
                datasets: [{
                    data: deptCounts,
                    backgroundColor: deptColors,
                    hoverOffset: 6,
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 12,
                            font: { family: "'Kantumruy Pro', sans-serif", size: 10 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const val = context.raw || 0;
                                const total = deptCounts.reduce((a, b) => a + b, 0);
                                const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                                return ` ${context.label}: ${val} នាក់ (${pct}%)`;
                            }
                        }
                    }
                },
                onClick: (evt, elements) => {
                    if (elements && elements.length > 0) {
                        const idx = elements[0].index;
                        const targetDept = deptLabels[idx];
                        if (targetDept) {
                            selectHrDeptChip(targetDept);
                        }
                    }
                }
            }
        });
    }

    // 2. Contract Health Data
    let okCount = 0;
    let expCount = 0;
    let expiredCount = 0;
    let noContractCount = 0;

    baseList.forEach(s => {
        const c = getContractStatus(s.contractEnd);
        if (c.status === 'active') okCount++;
        else if (c.status === 'expiring') expCount++;
        else if (c.status === 'expired') expiredCount++;
        else noContractCount++;
    });

    const contractCanvas = document.getElementById('hr-contract-bar-chart');
    if (contractCanvas) {
        if (window.hrContractBarChartInstance) {
            window.hrContractBarChartInstance.destroy();
        }
        const ctx = contractCanvas.getContext('2d');
        window.hrContractBarChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['សុពលភាពល្អ', 'ជិតផុត (≤30d)', 'ផុតកំណត់', 'គ្មានកាលបរិច្ឆេទ'],
                datasets: [{
                    label: 'ចំនួនបុគ្គលិក',
                    data: [okCount, expCount, expiredCount, noContractCount],
                    backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#94a3b8'],
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` ${ctx.raw} នាក់`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1, font: { family: "'Kantumruy Pro', sans-serif" } },
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    },
                    x: {
                        ticks: { font: { family: "'Kantumruy Pro', sans-serif", size: 10 } },
                        grid: { display: false }
                    }
                },
                onClick: (evt, elements) => {
                    if (elements && elements.length > 0) {
                        const idx = elements[0].index;
                        if (idx === 1) filterHrHubByStatus('expiring');
                        else if (idx === 0) filterHrHubByStatus('active');
                        else if (idx === 2) filterHrHubByStatus('inactive');
                    }
                }
            }
        });
    }

    // 3. Update Key Metrics Summary
    const totalStaff = baseList.length;
    const contractCompliantRate = totalStaff > 0 ? Math.round((okCount / totalStaff) * 100) : 0;
    const fulltimeTotal = baseList.filter(s => (s.employmentType || '').includes('ពេញម៉ោង') || (s.employmentType || '').toLowerCase().includes('full')).length;
    const fulltimeRate = totalStaff > 0 ? Math.round((fulltimeTotal / totalStaff) * 100) : 0;

    const femaleCount = baseList.filter(s => {
        const g = (s.gender || '').toLowerCase();
        return g === 'ស្រី' || g === 'female' || g === 'f';
    }).length;
    const maleCount = totalStaff - femaleCount;
    const femalePct = totalStaff > 0 ? Math.round((femaleCount / totalStaff) * 100) : 0;
    const malePct = 100 - femalePct;

    const elContractRate = document.getElementById('hr-metric-contract-rate');
    const elContractBar = document.getElementById('hr-metric-contract-bar');
    const elFulltimeRate = document.getElementById('hr-metric-fulltime-rate');
    const elFulltimeBar = document.getElementById('hr-metric-fulltime-bar');
    const elGenderRatio = document.getElementById('hr-metric-gender-ratio');
    const elGenderText = document.getElementById('hr-metric-gender-text');
    const elTopDept = document.getElementById('hr-metric-top-dept');

    if (elContractRate) elContractRate.textContent = `${contractCompliantRate}%`;
    if (elContractBar) elContractBar.style.width = `${contractCompliantRate}%`;
    if (elFulltimeRate) elFulltimeRate.textContent = `${fulltimeRate}%`;
    if (elFulltimeBar) elFulltimeBar.style.width = `${fulltimeRate}%`;
    if (elGenderRatio) elGenderRatio.textContent = `${femaleCount} នាក់ / ${maleCount} នាក់`;
    if (elGenderText) elGenderText.textContent = `ស្រី ${femalePct}% | ប្រុស ${malePct}%`;

    if (elTopDept) {
        let maxVal = -1;
        let topName = '-';
        deptLabels.forEach((d, i) => {
            if (deptCounts[i] > maxVal && deptCounts[i] > 0) {
                maxVal = deptCounts[i];
                topName = d.split('&')[0].trim();
            }
        });
        elTopDept.textContent = `${topName} (${maxVal > 0 ? maxVal : 0})`;
    }
};

/**
 * Handle Department Filter Chip Click
 */
window.selectHrDeptChip = function(dept) {
    window.currentHrDepartmentFilter = dept;
    const deptSel = document.getElementById('hr-department-filter');
    if (deptSel) deptSel.value = dept;

    // Update chip active classes
    const container = document.getElementById('hr-dept-chips-container');
    if (container) {
        const chips = container.querySelectorAll('.hr-dept-chip');
        chips.forEach(c => {
            const targetId = c.id;
            let isMatch = false;
            if (!dept && targetId === 'hr-chip-all') isMatch = true;
            else if (dept.includes('រដ្ឋបាល') && targetId === 'hr-chip-admin') isMatch = true;
            else if (dept.includes('ហិរញ្ញវត្ថុ') && targetId === 'hr-chip-finance') isMatch = true;
            else if (dept.includes('ព័ត៌មានវិទ្យា') && targetId === 'hr-chip-it') isMatch = true;
            else if (dept.includes('សិក្សាធិការ') && targetId === 'hr-chip-academic') isMatch = true;
            else if (dept.includes('សន្តិសុខ') && targetId === 'hr-chip-security') isMatch = true;
            else if (dept.includes('គរុកោសល្យ') && targetId === 'hr-chip-teaching') isMatch = true;
            else if (dept.includes('ផ្សេងៗ') && targetId === 'hr-chip-other') isMatch = true;

            c.classList.toggle('active', isMatch);
        });
    }

    renderHrHub();
};

/**
 * Filter HR Hub by Special Filter (Birthday Month, etc.)
 */
window.filterHrHubBySpecial = function(specialKey) {
    if (specialKey === 'birthday') {
        window.currentHrStatusFilter = 'birthday';
        const validPills = ['all', 'active', 'fulltime', 'parttime', 'leave', 'expiring', 'inactive'];
        validPills.forEach(p => {
            const btn = document.getElementById(`hr-filter-${p}`);
            if (btn) {
                btn.classList.remove('active', 'btn-white', 'shadow-xs');
                btn.classList.add('text-muted');
            }
        });
        applyHrHubFilters();
    }
};

/**
 * Reset all HR Filters to default
 */
window.resetAllHrFilters = function() {
    window.currentHrStatusFilter = 'all';
    window.currentHrDepartmentFilter = '';
    window.currentHrShiftFilter = '';
    window.currentHrSearch = '';
    window.currentHrScope = 'hr_only';

    const searchInp = document.getElementById('hr-hub-search');
    const scopeSel = document.getElementById('hr-scope-select');
    const deptSel = document.getElementById('hr-department-filter');
    const shiftSel = document.getElementById('hr-shift-filter');
    const clearBtn = document.getElementById('btn-clear-hr-search');

    if (searchInp) searchInp.value = '';
    if (scopeSel) scopeSel.value = 'hr_only';
    if (deptSel) deptSel.value = '';
    if (shiftSel) shiftSel.value = '';
    if (clearBtn) clearBtn.classList.add('d-none');

    filterHrHubByStatus('all');
    selectHrDeptChip('');
};

/**
 * Quick In-Row / In-Card 1-Click Status Update
 */
window.quickUpdateHrStaffStatus = async function(staffId, newStatus, staffName) {
    if (!staffId || !staffData[staffId]) return;

    const statusMap = {
        'active': 'កំពុងធ្វើការ',
        'on-leave': 'សុំច្បាប់សម្រាក',
        'inactive': 'ឈប់បម្រើការ'
    };
    const statusText = statusMap[newStatus] || newStatus;

    // Optimistic local update
    staffData[staffId].status = newStatus;
    renderHrHub();

    // Persist to Firebase
    try {
        await firebase.database().ref(`staff/${staffId}/status`).set(newStatus);
        if (typeof window.logStaffActivity === 'function') {
            window.logStaffActivity('update', staffName || 'បុគ្គលិក', `បានប្តូរស្ថានភាពទៅជា "${statusText}"`);
        }
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true
        });
        Toast.fire({
            icon: 'success',
            title: `បានប្តូរស្ថានភាព ${staffName || ''} ជា "${statusText}"`
        });
    } catch (err) {
        console.error('Failed to quick update status:', err);
        Swal.fire('កំហុស', 'មិនអាចរក្សាទុកស្ថានភាពបានទេ: ' + err.message, 'error');
        renderHrHub();
    }
};

/**
 * Quick In-Row Contract Renewal (+1 Year)
 */
window.quickRenewContractOneYear = async function(staffId) {
    const s = staffData[staffId];
    if (!s) return;

    const safeName = s.nameKhmer || s.name || s.nameEnglish || 'បុគ្គលិក';
    const currentEnd = s.contractEnd;
    let baseDate = new Date();
    if (currentEnd && currentEnd !== 'N/A' && currentEnd !== 'មិនមាន') {
        const parsed = new Date(currentEnd);
        if (!isNaN(parsed.getTime()) && parsed > baseDate) {
            baseDate = parsed;
        }
    }
    const newEnd = new Date(baseDate);
    newEnd.setFullYear(newEnd.getFullYear() + 1);
    const newEndStr = newEnd.toISOString().slice(0, 10);

    const result = await Swal.fire({
        title: 'បន្តកិច្ចសន្យា +១ ឆ្នាំភ្លាមៗ?',
        html: `តើអ្នកចង់បន្តកិច្ចសន្យាការងារសម្រាប់ <strong>${escapeStaffHtml(safeName)}</strong> រហូតដល់ថ្ងៃ <strong>${formatDate(newEndStr)}</strong> មែនទេ?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#059669',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'យល់ព្រមបន្ត',
        cancelButtonText: 'បោះបង់'
    });

    if (result.isConfirmed) {
        try {
            await firebase.database().ref(`staff/${staffId}/contractEnd`).set(newEndStr);
            staffData[staffId].contractEnd = newEndStr;
            if (typeof window.logStaffActivity === 'function') {
                window.logStaffActivity('update', safeName, `បានបន្តកិច្ចសន្យា +១ ឆ្នាំ រហូតដល់ ${newEndStr}`);
            }
            renderHrHub();
            Swal.fire({
                icon: 'success',
                title: 'ជោគជ័យ!',
                text: `បានបន្តកិច្ចសន្យារបស់ ${safeName} ដល់ ${formatDate(newEndStr)} ដោយជោគជ័យ`,
                timer: 1800,
                showConfirmButton: false
            });
        } catch (err) {
            Swal.fire('កំហុស', 'មិនអាចបន្តកិច្ចសន្យាបានទេ: ' + err.message, 'error');
        }
    }
};

/**
 * Render the dedicated HR Hub Dashboard
 */
window.renderHrHub = function () {
    const tableBody = document.getElementById('hr-hub-table-body');
    const cardsContainer = document.getElementById('hr-hub-cards-container');
    if (!tableBody && !cardsContainer) return;

    const allStaff = Object.entries(staffData || {}).map(([id, d]) => ({ id, ...d }));
    const hrStaff = allStaff.filter(isOfficeHrStaff);

    // 1. Calculate HR KPIs
    const totalHrCount = hrStaff.length;
    const fulltimeCount = hrStaff.filter(s => (s.employmentType || '').includes('ពេញម៉ោង') || (s.employmentType || '').toLowerCase().includes('full')).length;
    const parttimeCount = hrStaff.filter(s => (s.employmentType || '').includes('ក្រៅម៉ោង') || (s.employmentType || '').includes('កិច្ចសន្យា') || (s.employmentType || '').toLowerCase().includes('part')).length;
    const leaveCount = hrStaff.filter(s => (s.status || '').toLowerCase() === 'on-leave' || (s.status || '').includes('សម្រាក') || (s.status || '').includes('ច្បាប់')).length;
    const inactiveCount = hrStaff.filter(s => (s.status || '').toLowerCase() === 'inactive' || (s.status || '').includes('ឈប់')).length;
    const activeCount = hrStaff.filter(s => (s.status || 'active').toLowerCase() === 'active').length;

    const expiringStaff = hrStaff.filter(s => {
        const c = getContractStatus(s.contractEnd);
        return c.daysLeft !== null && c.daysLeft <= 30;
    });
    const expiringCount = expiringStaff.length;

    // Birthday in current month calculation
    const currentMonth = new Date().getMonth() + 1;
    const birthdayStaff = hrStaff.filter(s => {
        const rawDate = s.birthDate || s.dob;
        if (!rawDate) return false;
        const d = new Date(rawDate);
        return !isNaN(d.getTime()) && (d.getMonth() + 1) === currentMonth;
    });
    const birthdayCount = birthdayStaff.length;

    // 2. Animate KPI numbers
    animateHrValue('hr-stat-total', totalHrCount);
    animateHrValue('hr-stat-fulltime', fulltimeCount);
    animateHrValue('hr-stat-parttime', parttimeCount);
    animateHrValue('hr-stat-expiring', expiringCount);
    animateHrValue('hr-stat-leave', leaveCount);

    // 3. Update Workplace Pulse Chips
    animateHrValue('hr-pulse-active-count', activeCount);
    animateHrValue('hr-pulse-leave-count', leaveCount);
    animateHrValue('hr-pulse-expiring-count', expiringCount);
    animateHrValue('hr-pulse-birthday-count', birthdayCount);

    // 4. Update Status Badges in Pills
    const pillAll = document.getElementById('hr-pill-all');
    const pillActive = document.getElementById('hr-pill-active');
    const pillFulltime = document.getElementById('hr-pill-fulltime');
    const pillParttime = document.getElementById('hr-pill-parttime');
    const pillLeave = document.getElementById('hr-pill-leave');
    const pillExpiring = document.getElementById('hr-pill-expiring');
    const pillInactive = document.getElementById('hr-pill-inactive');

    if (pillAll) pillAll.textContent = totalHrCount;
    if (pillActive) pillActive.textContent = activeCount;
    if (pillFulltime) pillFulltime.textContent = fulltimeCount;
    if (pillParttime) pillParttime.textContent = parttimeCount;
    if (pillLeave) pillLeave.textContent = leaveCount;
    if (pillExpiring) pillExpiring.textContent = expiringCount;
    if (pillInactive) pillInactive.textContent = inactiveCount;

    // Update Header Badges
    const tabHr = document.getElementById('tab-badge-hr');
    const subHr = document.getElementById('sub-badge-hr');
    if (tabHr) tabHr.textContent = totalHrCount;
    if (subHr) subHr.textContent = totalHrCount;

    // 5. Update Department Chips Counts
    const baseForChips = (window.currentHrScope === 'all_school') ? allStaff : hrStaff;
    const chipAll = document.getElementById('hr-chip-count-all');
    const chipAdmin = document.getElementById('hr-chip-count-admin');
    const chipFinance = document.getElementById('hr-chip-count-finance');
    const chipIt = document.getElementById('hr-chip-count-it');
    const chipAcademic = document.getElementById('hr-chip-count-academic');
    const chipSecurity = document.getElementById('hr-chip-count-security');
    const chipTeaching = document.getElementById('hr-chip-count-teaching');
    const chipOther = document.getElementById('hr-chip-count-other');

    if (chipAll) chipAll.textContent = baseForChips.length;
    if (chipAdmin) chipAdmin.textContent = baseForChips.filter(s => (s.department || '').includes('រដ្ឋបាល') || (s.department || '').includes('ធនធានមនុស្ស')).length;
    if (chipFinance) chipFinance.textContent = baseForChips.filter(s => (s.department || '').includes('ហិរញ្ញវត្ថុ') || (s.department || '').includes('គណនេយ្យ')).length;
    if (chipIt) chipIt.textContent = baseForChips.filter(s => (s.department || '').includes('ព័ត៌មានវិទ្យា') || (s.department || '').includes('IT')).length;
    if (chipAcademic) chipAcademic.textContent = baseForChips.filter(s => (s.department || '').includes('សិក្សាធិការ') || (s.department || '').includes('បណ្ណាល័យ')).length;
    if (chipSecurity) chipSecurity.textContent = baseForChips.filter(s => (s.department || '').includes('សន្តិសុខ') || (s.department || '').includes('អនាម័យ')).length;
    if (chipTeaching) chipTeaching.textContent = baseForChips.filter(s => (s.department || '').includes('គរុកោសល្យ') || (s.department || '').includes('បង្រៀន')).length;
    if (chipOther) chipOther.textContent = baseForChips.filter(s => (s.department || '').includes('ផ្សេងៗ')).length;

    // 6. Update Contract Expiry Alert Banner
    const banner = document.getElementById('hr-contract-expiry-banner');
    const bannerCount = document.getElementById('hr-banner-expiring-count');
    const quickExpCount = document.getElementById('hr-quick-expiring-count');
    if (quickExpCount) quickExpCount.textContent = expiringCount;

    if (banner && bannerCount) {
        if (expiringCount > 0 && !window.hrBannerDismissed) {
            banner.classList.remove('d-none');
            bannerCount.textContent = expiringCount;
        } else {
            banner.classList.add('d-none');
        }
    }

    // 7. Filter List
    let displayList = (window.currentHrScope === 'all_school') ? allStaff : hrStaff;

    if (window.currentHrStatusFilter === 'active') {
        displayList = displayList.filter(s => (s.status || 'active').toLowerCase() === 'active');
    } else if (window.currentHrStatusFilter === 'fulltime') {
        displayList = displayList.filter(s => (s.employmentType || '').includes('ពេញម៉ោង') || (s.employmentType || '').toLowerCase().includes('full'));
    } else if (window.currentHrStatusFilter === 'parttime') {
        displayList = displayList.filter(s => (s.employmentType || '').includes('ក្រៅម៉ោង') || (s.employmentType || '').includes('កិច្ចសន្យា') || (s.employmentType || '').toLowerCase().includes('part'));
    } else if (window.currentHrStatusFilter === 'leave') {
        displayList = displayList.filter(s => (s.status || '').toLowerCase() === 'on-leave' || (s.status || '').includes('សម្រាក') || (s.status || '').includes('ច្បាប់'));
    } else if (window.currentHrStatusFilter === 'expiring') {
        displayList = displayList.filter(s => {
            const c = getContractStatus(s.contractEnd);
            return c.daysLeft !== null && c.daysLeft <= 30;
        });
    } else if (window.currentHrStatusFilter === 'inactive') {
        displayList = displayList.filter(s => (s.status || '').toLowerCase() === 'inactive' || (s.status || '').includes('ឈប់'));
    } else if (window.currentHrStatusFilter === 'birthday') {
        displayList = displayList.filter(s => {
            const rawDate = s.birthDate || s.dob;
            if (!rawDate) return false;
            const d = new Date(rawDate);
            return !isNaN(d.getTime()) && (d.getMonth() + 1) === currentMonth;
        });
    }

    if (window.currentHrDepartmentFilter) {
        displayList = displayList.filter(s => (s.department || '').trim() === window.currentHrDepartmentFilter.trim());
    }

    if (window.currentHrShiftFilter) {
        displayList = displayList.filter(s => (s.workShift || '').trim() === window.currentHrShiftFilter.trim());
    }

    const searchQuery = window.currentHrSearch || '';
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        displayList = displayList.filter(s =>
            (s.nameKhmer || '').toLowerCase().includes(q) ||
            (s.nameEnglish || '').toLowerCase().includes(q) ||
            (s.nameChinese || '').toLowerCase().includes(q) ||
            (s.name || '').toLowerCase().includes(q) ||
            (s.position || '').toLowerCase().includes(q) ||
            (s.department || '').toLowerCase().includes(q) ||
            (s.phone || '').includes(q) ||
            (s.emergencyContact || '').includes(q) ||
            (s.nationalId || '').toLowerCase().includes(q) ||
            (s.contract || '').toLowerCase().includes(q)
        );
    }

    // 8. Dynamic Sorting
    displayList.sort((a, b) => {
        const dir = window.currentHrSort.dir === 'asc' ? 1 : -1;
        const col = window.currentHrSort.column;
        if (col === 'name') {
            const nameA = (a.nameKhmer || a.name || a.nameEnglish || '').trim();
            const nameB = (b.nameKhmer || b.name || b.nameEnglish || '').trim();
            return dir * nameA.localeCompare(nameB, 'km');
        } else if (col === 'hireDate') {
            const timeA = a.hireDate ? new Date(a.hireDate).getTime() : 0;
            const timeB = b.hireDate ? new Date(b.hireDate).getTime() : 0;
            return dir * (timeA - timeB);
        } else if (col === 'contractEnd') {
            const timeA = a.contractEnd ? new Date(a.contractEnd).getTime() : 9999999999999;
            const timeB = b.contractEnd ? new Date(b.contractEnd).getTime() : 9999999999999;
            return dir * (timeA - timeB);
        } else if (col === 'position') {
            const posA = (a.position || '').trim();
            const posB = (b.position || '').trim();
            return dir * posA.localeCompare(posB, 'km');
        } else if (col === 'status') {
            const sA = (a.status || 'active').trim();
            const sB = (b.status || 'active').trim();
            return dir * sA.localeCompare(sB);
        }
        return 0;
    });

    window.currentFilteredHrList = displayList;

    // Helper for department badge styling
    function getDeptBadge(dept) {
        if (!dept) return '<span class="badge bg-light text-muted border">-</span>';
        let bg = 'bg-primary-subtle text-primary border-primary-subtle';
        let icon = 'fi-rr-building';
        if (dept.includes('រដ្ឋបាល') || dept.includes('ធនធានមនុស្ស')) {
            bg = 'bg-success-subtle text-success border-success-subtle';
            icon = 'fi-rr-users-alt';
        } else if (dept.includes('ហិរញ្ញវត្ថុ') || dept.includes('គណនេយ្យ')) {
            bg = 'bg-amber-subtle text-amber-emphasis border-amber-subtle';
            icon = 'fi-rr-money-bill-wave';
        } else if (dept.includes('ព័ត៌មានវិទ្យា') || dept.includes('IT')) {
            bg = 'bg-info-subtle text-info-emphasis border-info-subtle';
            icon = 'fi-rr-computer';
        } else if (dept.includes('សន្តិសុខ') || dept.includes('អនាម័យ')) {
            bg = 'bg-secondary-subtle text-secondary border-secondary-subtle';
            icon = 'fi-rr-shield-check';
        } else if (dept.includes('សិក្សាធិការ') || dept.includes('បណ្ណាល័យ')) {
            bg = 'bg-purple-subtle text-purple border-purple-subtle';
            icon = 'fi-rr-book-alt';
        }
        const highlightedDept = highlightHrText(dept, searchQuery);
        return `<span class="badge ${bg} border px-2.5 py-1 rounded-pill small font-weight-bold"><i class="fi ${icon} me-1"></i>${highlightedDept}</span>`;
    }

    // 9. Render Table Body
    if (tableBody) {
        if (displayList.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center py-5">
                        <div class="py-4">
                            <div class="stat-card-icon-bubble mx-auto mb-3" style="width: 56px; height: 56px; font-size: 1.6rem; background: rgba(5, 150, 105, 0.1); color: #059669;">
                                <i class="fi fi-rr-search-alt"></i>
                            </div>
                            <h6 class="fw-bold mb-1" style="color: var(--staff-text-main);">រកមិនឃើញទិន្នន័យបុគ្គលិក HR/រដ្ឋបាលឡើយ</h6>
                            <p class="text-muted small mb-0">សូមសាកល្បងជ្រើសរើសតម្រងផ្សេង ឬចុចប៊ូតុង "បន្ថែមបុគ្គលិក HR" ថ្មី</p>
                        </div>
                    </td>
                </tr>`;
        } else {
            tableBody.innerHTML = displayList.map(s => {
                const safeName = s.nameKhmer || s.name || s.nameEnglish || 'មិនមានឈ្មោះ';
                const safeSubName = s.nameEnglish || s.nameChinese || '';
                const initials = getInitials(safeName);
                const isSelected = window.selectedHrStaffIds && window.selectedHrStaffIds.has(s.id);
                const contractStatus = getContractStatus(s.contractEnd);
                const tenure = calculateTenure(s.hireDate);
                const hireFormatted = s.hireDate ? formatDate(s.hireDate) : '-';

                // Highlighting
                const highlightedName = highlightHrText(safeName, searchQuery);
                const highlightedSubName = highlightHrText(safeSubName, searchQuery);
                const highlightedId = s.nationalId ? highlightHrText(s.nationalId, searchQuery) : '';
                const highlightedPos = highlightHrText(s.position || 'បុគ្គលិកការិយាល័យ', searchQuery);
                const highlightedPhone = highlightHrText(s.phone || '-', searchQuery);
                const highlightedContract = highlightHrText(s.contract || 'TX-STAFF', searchQuery);

                // Gender badge
                const rawGender = (s.gender || '').trim().toLowerCase();
                const isFemale = rawGender === 'ស្រី' || rawGender === 'female' || rawGender === 'f';
                const isMale = rawGender === 'ប្រុស' || rawGender === 'male' || rawGender === 'm';
                const genderBadge = isFemale
                    ? `<span class="badge rounded-pill" style="background: rgba(244, 114, 182, 0.15); color: #db2777; border: 1px solid rgba(244, 114, 182, 0.3); font-weight: 700; padding: 4px 10px; font-size: 0.76rem;"><i class="fi fi-rr-venus me-1"></i>ស្រី</span>`
                    : isMale
                    ? `<span class="badge rounded-pill" style="background: rgba(59, 130, 246, 0.15); color: #2563eb; border: 1px solid rgba(59, 130, 246, 0.3); font-weight: 700; padding: 4px 10px; font-size: 0.76rem;"><i class="fi fi-rr-mars me-1"></i>ប្រុស</span>`
                    : `<span class="badge rounded-pill bg-light text-muted border px-2 py-0.5 small">-</span>`;

                // Status pill
                const rawStatus = (s.status || 'active').toLowerCase();
                let statusClass = 'active';
                let statusText = 'កំពុងធ្វើការ';
                if (rawStatus === 'on-leave' || rawStatus.includes('សម្រាក') || rawStatus.includes('ច្បាប់')) {
                    statusClass = 'on-leave';
                    statusText = 'សុំច្បាប់';
                } else if (rawStatus === 'inactive' || rawStatus.includes('ឈប់')) {
                    statusClass = 'inactive';
                    statusText = 'ឈប់បម្រើការ';
                }

                const avatarHtml = s.imageUrl ?
                    `<div class="staff-avatar-ring me-2.5 overflow-hidden d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                         <img src="${s.imageUrl}" class="w-100 h-100" style="object-fit: cover;" alt="${escapeStaffHtml(safeName)}" onerror="this.parentElement.innerHTML='<span class=\\'text-white fw-bold\\'>${initials}</span>'">
                     </div>` :
                    `<div class="staff-avatar-ring me-2.5 d-flex align-items-center justify-content-center text-white fw-bold" style="width: 40px; height: 40px; background: linear-gradient(135deg, #059669, #10b981); font-size: 0.85rem;">
                         ${initials}
                     </div>`;

                const quickRenewBtn = (contractStatus.status === 'expiring' || contractStatus.status === 'expired') ?
                    `<button class="hr-quick-renew-btn ms-1" onclick="quickRenewContractOneYear('${s.id}')" title="បន្តកិច្ចសន្យា +១ ឆ្នាំភ្លាមៗ"><i class="fi fi-rr-refresh me-1"></i>+១ ឆ្នាំ</button>` : '';

                return `
                <tr class="align-middle animate__animated animate__fadeIn ${isSelected ? 'staff-row-selected' : ''}" id="hr-row-${s.id}">
                    <td class="ps-3 pe-2 text-center" onclick="event.stopPropagation()">
                        <input class="form-check-input custom-staff-checkbox hr-row-checkbox" type="checkbox" value="${s.id}" data-name="${escapeStaffHtml(safeName)}" onchange="handleHrRowCheckboxChange('${s.id}', this.checked)" ${isSelected ? 'checked' : ''}>
                    </td>
                    <td class="ps-2">
                        <div class="d-flex align-items-center" onclick="selectStaff('${s.id}')" style="cursor: pointer;">
                            ${avatarHtml}
                            <div>
                                <div class="fw-bold staff-row-name text-nowrap">${highlightedName}</div>
                                <div class="d-flex align-items-center gap-1.5 flex-wrap">
                                    ${safeSubName ? `<small class="text-muted" style="font-size: 0.75rem;">${highlightedSubName}</small>` : ''}
                                    ${s.nationalId ? `<span class="badge bg-light text-secondary border px-1.5 py-0" style="font-size: 0.68rem;">ID: ${highlightedId}</span>` : ''}
                                </div>
                            </div>
                        </div>
                    </td>
                    <td>${genderBadge}</td>
                    <td>
                        <div>
                            <div class="fw-semibold text-dark small mb-1">${highlightedPos}</div>
                            ${getDeptBadge(s.department || 'រដ្ឋបាល & ធនធានមនុស្ស')}
                        </div>
                    </td>
                    <td>
                        <div>
                            <span class="badge bg-light text-dark border px-2 py-0.5 small fw-semibold">${escapeStaffHtml(s.employmentType || 'ពេញម៉ោង (Full-Time)')}</span>
                            ${s.workShift ? `<div class="small text-muted mt-1" style="font-size: 0.72rem;"><i class="fi fi-rr-clock-three me-1 text-info"></i>${escapeStaffHtml(s.workShift)}</div>` : ''}
                        </div>
                    </td>
                    <td>
                        <div>
                            <div>${highlightedPhone}</div>
                            ${s.emergencyContact ? `<div class="small text-danger mt-0.5" style="font-size: 0.72rem;" title="លេខទាក់ទងបន្ទាន់"><i class="fi fi-rr-phone-call me-1"></i>${highlightHrText(s.emergencyContact, searchQuery)}</div>` : ''}
                        </div>
                    </td>
                    <td>
                        <div>
                            <span class="small text-dark fw-semibold d-inline-flex align-items-center gap-1">
                                <i class="fi fi-rr-calendar text-teal" style="font-size: 0.78rem;"></i>${hireFormatted}
                            </span>
                            ${tenure ? `<div class="text-muted mt-0.5" style="font-size: 0.7rem;"><i class="fi fi-rr-time-forward me-1 opacity-75"></i>${tenure}</div>` : ''}
                        </div>
                    </td>
                    <td>
                        <div>
                            <div class="small fw-semibold text-dark mb-1 d-flex align-items-center">${highlightedContract} ${quickRenewBtn}</div>
                            ${contractStatus.badgeHtml}
                        </div>
                    </td>
                    <td>
                        <div class="dropdown" onclick="event.stopPropagation()">
                            <button class="hr-quick-status-btn dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="ចុចដើម្បីប្តូរស្ថានភាពការងារ">
                                <span class="status-pill ${statusClass}">
                                    <span class="pulse-dot"></span>
                                    ${statusText}
                                    <i class="fi fi-rr-angle-small-down ms-1 opacity-75"></i>
                                </span>
                            </button>
                            <ul class="dropdown-menu shadow-sm border-0 rounded-3 py-1" style="font-size: 0.8rem; min-width: 155px; z-index: 1050;">
                                <li><a class="dropdown-item py-1.5 d-flex align-items-center gap-2 ${rawStatus === 'active' ? 'active fw-bold' : ''}" href="javascript:void(0)" onclick="quickUpdateHrStaffStatus('${s.id}', 'active', '${escapeStaffHtml(safeName)}')"><span class="badge rounded-circle p-1 bg-success me-1"></span> កំពុងធ្វើការ</a></li>
                                <li><a class="dropdown-item py-1.5 d-flex align-items-center gap-2 ${rawStatus === 'on-leave' ? 'active fw-bold' : ''}" href="javascript:void(0)" onclick="quickUpdateHrStaffStatus('${s.id}', 'on-leave', '${escapeStaffHtml(safeName)}')"><span class="badge rounded-circle p-1 bg-warning me-1"></span> សុំច្បាប់ (Leave)</a></li>
                                <li><a class="dropdown-item py-1.5 d-flex align-items-center gap-2 ${rawStatus === 'inactive' ? 'active fw-bold' : ''}" href="javascript:void(0)" onclick="quickUpdateHrStaffStatus('${s.id}', 'inactive', '${escapeStaffHtml(safeName)}')"><span class="badge rounded-circle p-1 bg-secondary me-1"></span> ឈប់បម្រើការ</a></li>
                            </ul>
                        </div>
                    </td>
                    <td class="text-end pe-4">
                        <div class="d-flex justify-content-end gap-1.5 flex-nowrap">
                            <button class="btn-row-action btn-row-action-view" onclick="selectStaff('${s.id}')" title="មើលព័ត៌មានលម្អិត (View Profile)">
                                <i class="fi fi-rr-eye"></i>
                            </button>
                            <button class="btn-row-action btn-row-action-edit" onclick="editStaff('${s.id}')" title="កែប្រែព័ត៌មាន (Edit)">
                                <i class="fi fi-rr-edit"></i>
                            </button>
                            <button class="btn-row-action" style="background: rgba(138, 14, 91, 0.08); color: #8a0e5b;" onclick="openStaffIdCardModal('${s.id}')" title="បោះពុម្ពកាតបុគ្គលិក (Staff ID Card)">
                                <i class="fi fi-rr-id-badge"></i>
                            </button>
                            <button class="btn-row-action" style="background: rgba(245, 158, 11, 0.1); color: #d97706;" onclick="openStaffLeaveModal('${s.id}')" title="កត់ត្រាសុំច្បាប់ (Leave Request)">
                                <i class="fi fi-rr-calendar-minus"></i>
                            </button>
                            <button class="btn-row-action" style="background: rgba(225, 29, 72, 0.08); color: #e11d48;" onclick="openContractRenewModal('${s.id}')" title="បន្តកិច្ចសន្យា (Contract Renew)">
                                <i class="fi fi-rr-document-signed"></i>
                            </button>
                            <button class="btn-row-action btn-row-action-delete" onclick="deleteStaff('${s.id}', '${escapeStaffHtml(safeName)}')" title="លុបទិន្នន័យ (Delete)">
                                <i class="fi fi-rr-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
            }).join('');
        }
    }

    // 10. Render Grid Cards View
    if (cardsContainer) {
        if (displayList.length === 0) {
            cardsContainer.innerHTML = `
                <div class="text-center py-5 col-12 text-muted">
                    <i class="fi fi-rr-search-alt fa-2x mb-2 opacity-50"></i>
                    <div>មិនមានទិន្នន័យបុគ្គលិកនៅក្នុងប្រភេទនេះឡើយ</div>
                </div>`;
        } else {
            cardsContainer.innerHTML = displayList.map(s => {
                const safeName = s.nameKhmer || s.name || s.nameEnglish || 'មិនមានឈ្មោះ';
                const safeSubName = s.nameEnglish || s.nameChinese || '';
                const initials = getInitials(safeName);
                const contractStatus = getContractStatus(s.contractEnd);
                const hireFormatted = s.hireDate ? formatDate(s.hireDate) : '-';

                const highlightedName = highlightHrText(safeName, searchQuery);
                const highlightedSubName = highlightHrText(safeSubName, searchQuery);
                const highlightedPos = highlightHrText(s.position || 'បុគ្គលិក', searchQuery);
                const highlightedPhone = highlightHrText(s.phone || '-', searchQuery);

                const rawStatus = (s.status || 'active').toLowerCase();
                let statusClass = 'active';
                let statusText = 'កំពុងធ្វើការ';
                if (rawStatus === 'on-leave' || rawStatus.includes('សម្រាក')) {
                    statusClass = 'on-leave';
                    statusText = 'សុំច្បាប់';
                } else if (rawStatus === 'inactive' || rawStatus.includes('ឈប់')) {
                    statusClass = 'inactive';
                    statusText = 'ឈប់បម្រើការ';
                }

                const avatarHtml = s.imageUrl ?
                    `<div class="staff-avatar-ring me-3 overflow-hidden d-flex align-items-center justify-content-center" style="width: 52px; height: 52px;">
                         <img src="${s.imageUrl}" class="w-100 h-100" style="object-fit: cover;" alt="${escapeStaffHtml(safeName)}" onerror="this.parentElement.innerHTML='<span class=\\'text-white fw-bold\\'>${initials}</span>'">
                     </div>` :
                    `<div class="staff-avatar-ring me-3 d-flex align-items-center justify-content-center text-white fw-bold" style="width: 52px; height: 52px; background: linear-gradient(135deg, #059669, #10b981); font-size: 1.1rem;">
                         ${initials}
                     </div>`;

                const quickRenewBtn = (contractStatus.status === 'expiring' || contractStatus.status === 'expired') ?
                    `<button class="hr-quick-renew-btn ms-1" onclick="quickRenewContractOneYear('${s.id}')" title="បន្តកិច្ចសន្យា +១ ឆ្នាំភ្លាមៗ"><i class="fi fi-rr-refresh me-1"></i>+១ ឆ្នាំ</button>` : '';

                return `
                <div class="hr-staff-card animate__animated animate__fadeIn">
                    <div class="hr-staff-card-top">
                        ${avatarHtml}
                        <div class="flex-grow-1 overflow-hidden">
                            <div class="d-flex align-items-center justify-content-between mb-1">
                                <h6 class="fw-bold mb-0 text-truncate" title="${escapeStaffHtml(safeName)}">${highlightedName}</h6>
                                <div class="dropdown" onclick="event.stopPropagation()">
                                    <button class="hr-quick-status-btn dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="ចុចដើម្បីប្តូរស្ថានភាព">
                                        <span class="status-pill ${statusClass}" style="transform: scale(0.9);">
                                            <span class="pulse-dot"></span>${statusText}
                                        </span>
                                    </button>
                                    <ul class="dropdown-menu shadow-sm border-0 rounded-3 py-1" style="font-size: 0.8rem; min-width: 155px; z-index: 1050;">
                                        <li><a class="dropdown-item py-1.5 d-flex align-items-center gap-2 ${rawStatus === 'active' ? 'active fw-bold' : ''}" href="javascript:void(0)" onclick="quickUpdateHrStaffStatus('${s.id}', 'active', '${escapeStaffHtml(safeName)}')"><span class="badge rounded-circle p-1 bg-success me-1"></span> កំពុងធ្វើការ</a></li>
                                        <li><a class="dropdown-item py-1.5 d-flex align-items-center gap-2 ${rawStatus === 'on-leave' ? 'active fw-bold' : ''}" href="javascript:void(0)" onclick="quickUpdateHrStaffStatus('${s.id}', 'on-leave', '${escapeStaffHtml(safeName)}')"><span class="badge rounded-circle p-1 bg-warning me-1"></span> សុំច្បាប់ (Leave)</a></li>
                                        <li><a class="dropdown-item py-1.5 d-flex align-items-center gap-2 ${rawStatus === 'inactive' ? 'active fw-bold' : ''}" href="javascript:void(0)" onclick="quickUpdateHrStaffStatus('${s.id}', 'inactive', '${escapeStaffHtml(safeName)}')"><span class="badge rounded-circle p-1 bg-secondary me-1"></span> ឈប់បម្រើការ</a></li>
                                    </ul>
                                </div>
                            </div>
                            <div class="small text-muted text-truncate mb-1">${highlightedSubName || highlightedPos}</div>
                            ${getDeptBadge(s.department || 'រដ្ឋបាល')}
                        </div>
                    </div>

                    <div class="hr-staff-card-details">
                        <div class="hr-detail-row">
                            <span class="hr-detail-label"><i class="fi fi-rr-briefcase"></i>មុខតំណែង</span>
                            <span class="hr-detail-val">${highlightedPos}</span>
                        </div>
                        <div class="hr-detail-row">
                            <span class="hr-detail-label"><i class="fi fi-rr-clock"></i>ប្រភេទ &amp; វេន</span>
                            <span class="hr-detail-val">${escapeStaffHtml(s.employmentType || 'ពេញម៉ោង')}</span>
                        </div>
                        <div class="hr-detail-row">
                            <span class="hr-detail-label"><i class="fi fi-rr-phone-call"></i>ទូរស័ព្ទ</span>
                            <span class="hr-detail-val">${highlightedPhone}</span>
                        </div>
                        <div class="hr-detail-row">
                            <span class="hr-detail-label"><i class="fi fi-rr-calendar"></i>ថ្ងៃចូលធ្វើការ</span>
                            <span class="hr-detail-val">${hireFormatted}</span>
                        </div>
                        <div class="hr-detail-row">
                            <span class="hr-detail-label"><i class="fi fi-rr-document-signed"></i>កិច្ចសន្យា</span>
                            <span class="hr-detail-val d-flex align-items-center">${contractStatus.badgeHtml} ${quickRenewBtn}</span>
                        </div>
                    </div>

                    <div class="d-flex align-items-center justify-content-between pt-2 border-top gap-1 flex-wrap">
                        <div class="d-flex align-items-center gap-1">
                            <button class="btn btn-sm btn-outline-primary rounded-pill px-2.5 py-1" onclick="selectStaff('${s.id}')" title="មើលលម្អិត">
                                <i class="fi fi-rr-eye me-1"></i>លម្អិត
                            </button>
                            <button class="btn btn-sm btn-outline-secondary rounded-pill px-2.5 py-1" onclick="editStaff('${s.id}')" title="កែប្រែ">
                                <i class="fi fi-rr-edit"></i>
                            </button>
                        </div>
                        <div class="d-flex align-items-center gap-1">
                            <button class="btn btn-sm btn-light border rounded-pill px-2 py-1" onclick="openStaffIdCardModal('${s.id}')" title="កាតសម្គាល់">
                                <i class="fi fi-rr-id-badge text-primary"></i>
                            </button>
                            <button class="btn btn-sm btn-light border rounded-pill px-2 py-1" onclick="openStaffLeaveModal('${s.id}')" title="សុំច្បាប់">
                                <i class="fi fi-rr-calendar-minus text-warning"></i>
                            </button>
                            <button class="btn btn-sm btn-light border rounded-pill px-2 py-1" onclick="openContractRenewModal('${s.id}')" title="បន្តកិច្ចសន្យា">
                                <i class="fi fi-rr-document-signed text-danger"></i>
                            </button>
                        </div>
                    </div>
                </div>`;
            }).join('');
        }
    }

    // 11. Refresh Analytics Charts if panel is visible
    const analyticsSection = document.getElementById('hr-analytics-section');
    if (analyticsSection && !analyticsSection.classList.contains('d-none')) {
        window.initOrUpdateHrCharts(displayList);
    }

    updateHrBulkActionBar();
};

/**
 * Toggle Display Mode: Table vs Grid Cards
 */
window.switchHrHubDisplayMode = function(mode) {
    window.currentHrDisplayMode = mode;
    const btnTable = document.getElementById('btn-hr-view-table');
    const btnGrid = document.getElementById('btn-hr-view-grid');
    const tableContainer = document.getElementById('hr-hub-table-container');
    const cardsContainer = document.getElementById('hr-hub-cards-container');

    if (mode === 'grid') {
        if (btnGrid) btnGrid.classList.add('active');
        if (btnTable) btnTable.classList.remove('active');
        if (cardsContainer) cardsContainer.classList.remove('d-none');
        if (tableContainer) tableContainer.classList.add('d-none');
    } else {
        if (btnTable) btnTable.classList.add('active');
        if (btnGrid) btnGrid.classList.remove('active');
        if (tableContainer) tableContainer.classList.remove('d-none');
        if (cardsContainer) cardsContainer.classList.add('d-none');
    }
};

/**
 * Filter HR Hub by Status Pill
 */
window.filterHrHubByStatus = function(status) {
    window.currentHrStatusFilter = status;
    const validPills = ['all', 'active', 'fulltime', 'parttime', 'leave', 'expiring', 'inactive'];
    validPills.forEach(p => {
        const btn = document.getElementById(`hr-filter-${p}`);
        if (btn) {
            btn.classList.toggle('active', p === status);
            btn.classList.toggle('btn-white', p === status);
            btn.classList.toggle('shadow-xs', p === status);
            btn.classList.toggle('text-muted', p !== status);
        }
    });
    applyHrHubFilters();
};

/**
 * Apply filters from Dropdowns & Search
 */
window.applyHrHubFilters = function() {
    const scopeSel = document.getElementById('hr-scope-select');
    const deptSel = document.getElementById('hr-department-filter');
    const shiftSel = document.getElementById('hr-shift-filter');
    const sortSel = document.getElementById('hr-sort-select');
    const searchInp = document.getElementById('hr-hub-search');
    const clearBtn = document.getElementById('btn-clear-hr-search');

    if (scopeSel) window.currentHrScope = scopeSel.value;
    if (deptSel) window.currentHrDepartmentFilter = deptSel.value;
    if (shiftSel) window.currentHrShiftFilter = shiftSel.value;
    if (searchInp) {
        window.currentHrSearch = searchInp.value.trim();
        if (clearBtn) clearBtn.classList.toggle('d-none', !window.currentHrSearch);
    }
    if (sortSel) {
        const [col, dir] = sortSel.value.split('-');
        window.currentHrSort = { column: col, dir: dir || 'asc' };
    }

    renderHrHub();
};

/**
 * Clear search input
 */
window.clearHrSearch = function() {
    const searchInp = document.getElementById('hr-hub-search');
    if (searchInp) searchInp.value = '';
    applyHrHubFilters();
};

/**
 * Sort table column
 */
window.sortHrHubTable = function(col) {
    if (window.currentHrSort.column === col) {
        window.currentHrSort.dir = window.currentHrSort.dir === 'asc' ? 'desc' : 'asc';
    } else {
        window.currentHrSort.column = col;
        window.currentHrSort.dir = 'asc';
    }
    const sortSel = document.getElementById('hr-sort-select');
    if (sortSel) sortSel.value = `${col}-${window.currentHrSort.dir}`;
    renderHrHub();
};

/**
 * Dismiss Expiring Contract Alert Banner
 */
window.dismissHrContractBanner = function() {
    window.hrBannerDismissed = true;
    const banner = document.getElementById('hr-contract-expiry-banner');
    if (banner) banner.classList.add('d-none');
};

/**
 * Bulk Selection Logic for HR Hub
 */
window.updateHrBulkActionBar = function() {
    const bar = document.getElementById('hr-bulk-action-bar');
    const countEl = document.getElementById('hr-selected-staff-count');
    const headerCheck = document.getElementById('hr-select-all-header');
    const size = window.selectedHrStaffIds ? window.selectedHrStaffIds.size : 0;

    if (countEl) countEl.textContent = size;
    if (bar) bar.classList.toggle('d-none', size === 0);

    if (headerCheck) {
        const list = window.currentFilteredHrList || [];
        if (list.length === 0 || size === 0) {
            headerCheck.checked = false;
            headerCheck.indeterminate = false;
        } else {
            const count = list.filter(s => window.selectedHrStaffIds.has(s.id)).length;
            if (count === 0) {
                headerCheck.checked = false;
                headerCheck.indeterminate = false;
            } else if (count === list.length) {
                headerCheck.checked = true;
                headerCheck.indeterminate = false;
            } else {
                headerCheck.checked = false;
                headerCheck.indeterminate = true;
            }
        }
    }
};

window.toggleSelectAllHrStaff = function(isChecked) {
    if (!window.selectedHrStaffIds) window.selectedHrStaffIds = new Set();
    const list = window.currentFilteredHrList || [];
    if (isChecked) {
        list.forEach(s => window.selectedHrStaffIds.add(s.id));
    } else {
        list.forEach(s => window.selectedHrStaffIds.delete(s.id));
    }
    renderHrHub();
};

window.handleHrRowCheckboxChange = function(id, isChecked) {
    if (!window.selectedHrStaffIds) window.selectedHrStaffIds = new Set();
    if (isChecked) {
        window.selectedHrStaffIds.add(id);
    } else {
        window.selectedHrStaffIds.delete(id);
    }
    updateHrBulkActionBar();
    const row = document.getElementById(`hr-row-${id}`);
    if (row) row.classList.toggle('staff-row-selected', isChecked);
};

window.clearSelectedHrStaff = function() {
    if (window.selectedHrStaffIds) window.selectedHrStaffIds.clear();
    renderHrHub();
};

window.bulkSetHrStatus = async function(newStatus) {
    const ids = Array.from(window.selectedHrStaffIds || []);
    if (ids.length === 0) return;

    const statusText = newStatus === 'active' ? 'កំពុងធ្វើការ' : 'សម្រាក / សុំច្បាប់';
    const result = await Swal.fire({
        title: 'បញ្ជាក់ការផ្លាស់ប្តូរស្ថានភាព',
        text: `តើអ្នកចង់កំណត់ស្ថានភាពបុគ្គលិកដែលបានជ្រើសចំនួន ${ids.length} នាក់ជា "${statusText}" មែនទេ?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#059669',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'យល់ព្រម',
        cancelButtonText: 'បោះបង់'
    });

    if (result.isConfirmed) {
        try {
            const updates = {};
            ids.forEach(id => {
                updates[`staff/${id}/status`] = newStatus;
            });
            await firebase.database().ref().update(updates);
            if (typeof window.logStaffActivity === 'function') {
                window.logStaffActivity('update', 'បុគ្គលិកច្រើននាក់', `បានប្តូរស្ថានភាពបុគ្គលិក ${ids.length} នាក់ជា ${statusText}`);
            }
            window.selectedHrStaffIds.clear();
            Swal.fire({
                icon: 'success',
                title: 'ជោគជ័យ!',
                text: 'បានផ្លាស់ប្តូរស្ថានភាពដោយជោគជ័យ',
                timer: 1500,
                showConfirmButton: false
            });
            renderHrHub();
        } catch (error) {
            console.error('Error in bulkSetHrStatus:', error);
            Swal.fire('កំហុស!', 'មិនអាចផ្លាស់ប្តូរស្ថានភាពបានទេ: ' + error.message, 'error');
        }
    }
};

window.bulkDeleteSelectedHrStaff = async function() {
    const ids = Array.from(window.selectedHrStaffIds || []);
    if (ids.length === 0) return;

    const result = await Swal.fire({
        title: 'លុបបុគ្គលិកដែលបានជ្រើស?',
        text: `តើអ្នកពិតជាចង់លុបបុគ្គលិកចំនួន ${ids.length} នាក់ចេញពីប្រព័ន្ធមែនទេ? សកម្មភាពនេះមិនអាចត្រឡប់ក្រោយវិញបានឡើយ!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'បាទ/ចាស លុបចេញ',
        cancelButtonText: 'បោះបង់'
    });

    if (result.isConfirmed) {
        try {
            const updates = {};
            ids.forEach(id => {
                updates[`staff/${id}`] = null;
            });
            await firebase.database().ref().update(updates);
            if (typeof window.logStaffActivity === 'function') {
                window.logStaffActivity('delete', 'បុគ្គលិកច្រើននាក់', `បានលុបបុគ្គលិកចំនួន ${ids.length} នាក់ចេញពីប្រព័ន្ធ`);
            }
            window.selectedHrStaffIds.clear();
            Swal.fire({
                icon: 'success',
                title: 'បានលុបរួចរាល់!',
                text: 'បុគ្គលិកដែលបានជ្រើសត្រូវបានលុបចេញពីប្រព័ន្ធ',
                timer: 1500,
                showConfirmButton: false
            });
            renderHrHub();
        } catch (error) {
            console.error('Error deleting staff:', error);
            Swal.fire('កំហុស!', 'មិនអាចលុបទិន្នន័យបានឡើយ: ' + error.message, 'error');
        }
    }
};

/**
 * Staff ID Card Modal Logic
 */
window.openStaffIdCardModal = function(staffId) {
    const staff = staffData[staffId];
    if (!staff) return;

    const safeName = staff.nameKhmer || staff.name || 'បុគ្គលិក';
    const safeSub = staff.nameEnglish || staff.nameChinese || '';
    const pos = staff.position || 'បុគ្គលិកទូទៅ';
    const dept = staff.department || 'រដ្ឋបាល & ធនធានមនុស្ស';
    const phone = staff.phone || '-';
    const nationalId = staff.nationalId || staffId.slice(-6).toUpperCase();
    const photo = staff.imageUrl || '/img/1.jpg';
    const validThru = staff.contractEnd ? formatDate(staff.contractEnd) : '31/12/2026';

    const cardPhoto = document.getElementById('card-staff-photo');
    const cardKhmer = document.getElementById('card-staff-name-khmer');
    const cardSub = document.getElementById('card-staff-name-sub');
    const cardPos = document.getElementById('card-staff-pos');
    const cardDept = document.getElementById('card-staff-dept');
    const cardId = document.getElementById('card-staff-id');
    const cardPhone = document.getElementById('card-staff-phone');
    const cardValid = document.getElementById('card-staff-valid');
    const cardQr = document.getElementById('card-staff-qr');

    if (cardPhoto) cardPhoto.src = photo;
    if (cardKhmer) cardKhmer.textContent = safeName;
    if (cardSub) cardSub.textContent = safeSub;
    if (cardPos) cardPos.textContent = pos;
    if (cardDept) cardDept.textContent = dept;
    if (cardId) cardId.textContent = `TX-EMP-${nationalId}`;
    if (cardPhone) cardPhone.textContent = phone;
    if (cardValid) cardValid.textContent = validThru;

    if (cardQr) {
        const qrData = `TIANXIN-STAFF:${nationalId}:${safeName}:${pos}:${phone}`;
        cardQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;
    }

    const modalEl = document.getElementById('staffIdCardModal');
    if (modalEl) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    }
};

window.printStaffIdCardNow = function() {
    window.print();
};

/**
 * Staff Leave Registration Modal
 */
window.openStaffLeaveModal = function(staffId = null) {
    const selectEl = document.getElementById('leave-staff-select');
    if (selectEl) {
        selectEl.innerHTML = '<option value="">-- ជ្រើសរើសបុគ្គលិក --</option>' +
            Object.entries(staffData || {}).map(([id, s]) => {
                const name = s.nameKhmer || s.name || s.nameEnglish || 'Staff';
                const pos = s.position || '';
                return `<option value="${id}" ${staffId === id ? 'selected' : ''}>${name} (${pos})</option>`;
            }).join('');
    }

    const leaveStaffIdInput = document.getElementById('leave-staff-id');
    if (leaveStaffIdInput) leaveStaffIdInput.value = staffId || '';

    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const startDateInp = document.getElementById('leave-start-date');
    const endDateInp = document.getElementById('leave-end-date');
    if (startDateInp) startDateInp.value = today;
    if (endDateInp) endDateInp.value = tomorrow;

    const modalEl = document.getElementById('staffLeaveModal');
    if (modalEl) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    }
};

window.onSelectLeaveStaff = function(staffId) {
    const hiddenId = document.getElementById('leave-staff-id');
    if (hiddenId) hiddenId.value = staffId;
};

window.submitStaffLeaveForm = async function(event) {
    event.preventDefault();
    const staffId = document.getElementById('leave-staff-id').value || document.getElementById('leave-staff-select').value;
    if (!staffId) {
        Swal.fire('សូមជ្រើសរើសបុគ្គលិក', 'សូមជ្រើសរើសបុគ្គលិកដែលត្រូវកត់ត្រាច្បាប់សម្រាក', 'warning');
        return;
    }

    const staff = staffData[staffId];
    const staffName = staff ? (staff.nameKhmer || staff.name || 'Staff') : 'Staff';
    const leaveType = document.getElementById('leave-type').value;
    const substitute = document.getElementById('leave-substitute').value;
    const startDate = document.getElementById('leave-start-date').value;
    const endDate = document.getElementById('leave-end-date').value;
    const reason = document.getElementById('leave-reason').value;
    const autoStatus = document.getElementById('leave-auto-status').checked;

    try {
        const updates = {
            'leaveInfo': {
                leaveType: leaveType,
                startDate: startDate,
                endDate: endDate,
                substitute: substitute || '',
                reason: reason || '',
                recordedAt: new Date().toISOString()
            }
        };

        if (autoStatus) {
            updates['status'] = 'on-leave';
        }

        await firebase.database().ref(`staff/${staffId}`).update(updates);

        if (typeof window.logStaffActivity === 'function') {
            window.logStaffActivity('update', staffName, `បានកត់ត្រាច្បាប់សម្រាក \"${leaveType}\" (${formatDate(startDate)} ដល់ ${formatDate(endDate)})`);
        }

        const modalEl = document.getElementById('staffLeaveModal');
        if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }

        Swal.fire({
            icon: 'success',
            title: 'កត់ត្រារួចរាល់!',
            text: `បានកត់ត្រាច្បាប់សម្រាកសម្រាប់លោក/អ្នកស្រី ${staffName} ដោយជោគជ័យ`,
            timer: 1800,
            showConfirmButton: false
        });

        renderHrHub();
    } catch (error) {
        console.error('Error submitting leave form:', error);
        Swal.fire('កំហុស!', 'មិនអាចកត់ត្រាច្បាប់សម្រាកបានទេ: ' + error.message, 'error');
    }
};

/**
 * Contract Renewal Modal Logic
 */
window.openContractRenewModal = function(staffId) {
    const staff = staffData[staffId];
    if (!staff) return;

    const safeName = staff.nameKhmer || staff.name || 'Staff';
    const initials = getInitials(safeName);

    const hiddenId = document.getElementById('renew-staff-id');
    const nameEl = document.getElementById('renew-staff-name');
    const posDeptEl = document.getElementById('renew-staff-pos-dept');
    const avatarBox = document.getElementById('renew-avatar-box');
    const contractNoInp = document.getElementById('renew-contract-no');
    const empTypeSel = document.getElementById('renew-employment-type');
    const startInp = document.getElementById('renew-start-date');
    const endInp = document.getElementById('renew-end-date');

    if (hiddenId) hiddenId.value = staffId;
    if (nameEl) nameEl.textContent = safeName;
    if (posDeptEl) posDeptEl.textContent = `${staff.position || 'បុគ្គលិក'} • ${staff.department || 'រដ្ឋបាល'}`;
    if (avatarBox) {
        if (staff.imageUrl) {
            avatarBox.innerHTML = `<img src="${staff.imageUrl}" class="w-100 h-100 rounded-circle" style="object-fit:cover;">`;
        } else {
            avatarBox.textContent = initials;
        }
    }

    // Auto-generate suggestion
    const year = new Date().getFullYear();
    const rand = Math.floor(100 + Math.random() * 900);
    if (contractNoInp) contractNoInp.value = `TX-${year}-${rand}`;
    if (empTypeSel && staff.employmentType) empTypeSel.value = staff.employmentType;

    const today = new Date().toISOString().slice(0, 10);
    const oneYearLater = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
    if (startInp) startInp.value = staff.contractEnd || today;
    if (endInp) endInp.value = oneYearLater;

    const modalEl = document.getElementById('staffContractRenewModal');
    if (modalEl) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    }
};

window.submitStaffContractRenew = async function(event) {
    event.preventDefault();
    const staffId = document.getElementById('renew-staff-id').value;
    if (!staffId) return;

    const staff = staffData[staffId];
    const staffName = staff ? (staff.nameKhmer || staff.name || 'Staff') : 'Staff';
    const contractNo = document.getElementById('renew-contract-no').value;
    const empType = document.getElementById('renew-employment-type').value;
    const startDate = document.getElementById('renew-start-date').value;
    const endDate = document.getElementById('renew-end-date').value;
    const notes = document.getElementById('renew-notes').value;

    try {
        const updates = {
            contract: contractNo,
            employmentType: empType,
            contractEnd: endDate,
            status: 'active'
        };
        if (notes) updates['notes'] = notes;

        await firebase.database().ref(`staff/${staffId}`).update(updates);

        if (typeof window.logStaffActivity === 'function') {
            window.logStaffActivity('update', staffName, `បានបន្តកិច្ចសន្យាការងារលេខ \"${contractNo}\" រហូតដល់ ${formatDate(endDate)}`);
        }

        const modalEl = document.getElementById('staffContractRenewModal');
        if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }

        Swal.fire({
            icon: 'success',
            title: 'បន្តកិច្ចសន្យាជោគជ័យ!',
            text: `បានបន្តកិច្ចសន្យាសម្រាប់ ${staffName} រហូតដល់ ${formatDate(endDate)}`,
            timer: 1800,
            showConfirmButton: false
        });

        renderHrHub();
    } catch (error) {
        console.error('Error renewing contract:', error);
        Swal.fire('កំហុស!', 'មិនអាចបន្តកិច្ចសន្យាបានទេ: ' + error.message, 'error');
    }
};

/**
 * Export HR Staff List as CSV
 */
window.exportHrStaffCsv = function() {
    const list = window.currentFilteredHrList || [];
    if (list.length === 0) {
        Swal.fire('មិនមានទិន្នន័យ', 'មិនមានទិន្នន័យបុគ្គលិក HR សម្រាប់នាំចេញឡើយ', 'info');
        return;
    }

    const headers = [
        "អត្តលេខ/ID", "ឈ្មោះខ្មែរ", "ឈ្មោះអង់គ្លេស/ចិន", "ភេទ", "មុខតំណែង",
        "ដេប៉ាតឺម៉ង់", "ប្រភេទការងារ", "វេនការងារ", "លេខទូរស័ព្ទ", "លេខបន្ទាន់",
        "អត្តសញ្ញាណប័ណ្ណ", "ថ្ងៃចូលធ្វើការ", "កិច្ចសន្យា", "ថ្ងៃផុតកិច្ចសន្យា", "ស្ថានភាព", "អាសយដ្ឋាន"
    ];

    const rows = list.map(s => [
        `"${(s.nationalId || s.id || '').replace(/"/g, '""')}"`,
        `"${(s.nameKhmer || s.name || '').replace(/"/g, '""')}"`,
        `"${(s.nameEnglish || s.nameChinese || '').replace(/"/g, '""')}"`,
        `"${(s.gender || '').replace(/"/g, '""')}"`,
        `"${(s.position || '').replace(/"/g, '""')}"`,
        `"${(s.department || '').replace(/"/g, '""')}"`,
        `"${(s.employmentType || '').replace(/"/g, '""')}"`,
        `"${(s.workShift || '').replace(/"/g, '""')}"`,
        `"${(s.phone || '').toString().replace(/"/g, '""')}"`,
        `"${(s.emergencyContact || '').toString().replace(/"/g, '""')}"`,
        `"${(s.nationalId || '').replace(/"/g, '""')}"`,
        `"${(s.hireDate || '').replace(/"/g, '""')}"`,
        `"${(s.contract || '').replace(/"/g, '""')}"`,
        `"${(s.contractEnd || '').replace(/"/g, '""')}"`,
        `"${(s.status || 'active').replace(/"/g, '""')}"`,
        `"${(s.address || '').replace(/"/g, '""')}"`
    ].join(','));

    const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Tianxin_HR_Staff_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Print HR Staff Report
 */
window.printHrStaffReport = function() {
    const list = window.currentFilteredHrList || [];
    if (list.length === 0) {
        Swal.fire('មិនមានទិន្នន័យ', 'មិនមានទិន្នន័យបុគ្គលិកសម្រាប់បោះពុម្ពឡើយ', 'info');
        return;
    }

    const printWin = window.open('', '_blank');
    if (!printWin) {
        Swal.fire('Popup Blocked', 'សូមអនុញ្ញាតបើកផ្ទាំង Popup ដើម្បីបោះពុម្ព', 'warning');
        return;
    }

    const rowsHtml = list.map((s, idx) => `
        <tr>
            <td style="text-align: center;">${idx + 1}</td>
            <td><strong>${escapeStaffHtml(s.nameKhmer || s.name || '-')}</strong></td>
            <td>${escapeStaffHtml(s.nameEnglish || s.nameChinese || '-')}</td>
            <td style="text-align: center;">${escapeStaffHtml(s.gender || '-')}</td>
            <td>${escapeStaffHtml(s.position || '-')}</td>
            <td>${escapeStaffHtml(s.department || '-')}</td>
            <td>${escapeStaffHtml(s.employmentType || '-')}</td>
            <td>${escapeStaffHtml(s.phone || '-')}</td>
            <td style="text-align: center;">${s.hireDate ? formatDate(s.hireDate) : '-'}</td>
            <td style="text-align: center;">${s.contractEnd ? formatDate(s.contractEnd) : '-'}</td>
            <td style="text-align: center;">${s.status === 'active' ? 'កំពុងធ្វើការ' : (s.status === 'on-leave' ? 'សុំច្បាប់' : 'ឈប់បម្រើការ')}</td>
        </tr>
    `).join('');

    printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>របាយការណ៍បុគ្គលិក HR & រដ្ឋបាល - សាលាអន្តរជាតិធានស៊ីន</title>
            <style>
                body { font-family: 'Kantumruy Pro', 'Khmer OS Battambang', Arial, sans-serif; padding: 25px; color: #1e293b; font-size: 12px; }
                .report-header { text-align: center; margin-bottom: 25px; border-bottom: 2px solid #8a0e5b; padding-bottom: 15px; }
                .report-title { font-size: 18px; font-weight: bold; color: #8a0e5b; margin: 0; }
                .report-subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
                .report-meta { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 11px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th { background-color: #f1f5f9; color: #0f172a; padding: 8px 6px; border: 1px solid #cbd5e1; font-size: 11px; text-align: left; }
                td { padding: 6px; border: 1px solid #cbd5e1; font-size: 11px; }
                tr:nth-child(even) { background-color: #f8fafc; }
                .footer { margin-top: 30px; display: flex; justify-content: space-between; text-align: center; }
                @media print {
                    @page { size: landscape; margin: 12mm; }
                }
            </style>
        </head>
        <body onload="setTimeout(() => { window.print(); }, 400)">
            <div class="report-header">
                <div class="report-title">សាលាអន្តរជាតិ ធាន ស៊ីន (TIANXIN INTERNATIONAL SCHOOL)</div>
                <div class="report-subtitle">បញ្ជីឈ្មោះ និងស្ថានភាពបុគ្គលិកធនធានមនុស្ស & រដ្ឋបាល (HR & Administrative Staff Report)</div>
            </div>
            <div class="report-meta">
                <div><strong>កាលបរិច្ឆេទចេញរបាយការណ៍៖</strong> ${new Date().toLocaleDateString('km-KH')} ${new Date().toLocaleTimeString('km-KH')}</div>
                <div><strong>ចំនួនបុគ្គលិកសរុប៖</strong> ${list.length} នាក់</div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 35px; text-align: center;">ល.រ</th>
                        <th>ឈ្មោះភាសាខ្មែរ</th>
                        <th>ឈ្មោះឡាតាំង/ចិន</th>
                        <th style="width: 50px; text-align: center;">ភេទ</th>
                        <th>មុខតំណែង</th>
                        <th>ដេប៉ាតឺម៉ង់</th>
                        <th>ប្រភេទការងារ</th>
                        <th>លេខទូរស័ព្ទ</th>
                        <th style="text-align: center;">ថ្ងៃចូលធ្វើការ</th>
                        <th style="text-align: center;">ថ្ងៃផុតកិច្ចសន្យា</th>
                        <th style="text-align: center;">ស្ថានភាព</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
            <div class="footer">
                <div>
                    <div>អ្នករៀបចំរបាយការណ៍</div>
                    <div style="margin-top: 45px; font-weight: bold;">................................................</div>
                </div>
                <div>
                    <div>ប្រធានផ្នែកធនធានមនុស្ស / HR</div>
                    <div style="margin-top: 45px; font-weight: bold;">................................................</div>
                </div>
                <div>
                    <div>នាយកសាលាអនុម័ត</div>
                    <div style="margin-top: 45px; font-weight: bold;">................................................</div>
                </div>
            </div>
        </body>
        </html>
    `);
    printWin.document.close();
};




