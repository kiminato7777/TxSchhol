/**
 * dashboard-stats.js - Enhanced Version
 * ប្រព័ន្ធគ្រប់គ្រងទិន្នន័យសម្រាប់សាលាអន្តរជាតិ ធានស៊ីន
 */

// ========================================================
// 1. GLOBAL VARIABLES & CONFIGURATION
// ========================================================
let isInitialLoad = true;
let dashboardUpdateInterval = null;
const UPDATE_INTERVAL = 300000; // 5 minutes (reduced from 30 seconds for better performance)
const MAX_RETRY_ATTEMPTS = 3;
let retryCount = 0;

// Firebase references
let database = null;
let studentsRef = null;
let staffRef = null;
let expenseRef = null;
let paymentsRef = null;
let classesRef = null;
let transactionsRef = null;

// Chart Data Cache
let cachedTransactionsData = null;

// ========================================================
// 2. UTILITY FUNCTIONS
// ========================================================

/**
 * Format amount to USD currency
 */
function formatCurrency(amount) {
    if (isNaN(amount) || amount === null || amount === undefined) {
        amount = 0;
    }

    amount = parseFloat(amount);
    if (isNaN(amount)) amount = 0;

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

/**
 * Format number with Khmer locale
 */
function formatNumber(num) {
    if (isNaN(num) || num === null || num === undefined) {
        num = 0;
    }

    num = parseFloat(num);
    if (isNaN(num)) num = 0;

    return num.toLocaleString('km-KH');
}

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
    if (!phone || phone === 'មិនមាន') return 'មិនមាន';
    const carrier = getCarrierName(phone);
    if (!carrier) return phone;
    const carrierColors = {
        'Smart': '#a4cc39',
        'Cellcard': '#f37021',
        'Metfone': '#ed1c24',
        'Seatel': '#00a0e9',
        'Cootel': '#fbb03b'
    };
    const color = carrierColors[carrier] || '#888';
    return `${phone} <span class="badge rounded-pill ms-1" style="background-color: ${color}; font-size: 0.65rem; padding: 2px 8px; vertical-align: middle; color: white;">${carrier}</span>`;
}

/**
 * Animate value changes smoothly
 */
function animateValue(elementId, start, end, duration = 1000) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.warn(`Element with ID "${elementId}" not found for animation`);
        return;
    }

    if (isNaN(start)) start = 0;
    if (isNaN(end)) end = 0;

    const startTime = performance.now();
    const isCurrency = elementId.includes('Revenue') ||
        elementId.includes('Expense') ||
        elementId.includes('revenue') ||
        elementId.includes('expense');

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(start + (end - start) * easeOut);

        if (isCurrency) {
            element.textContent = formatCurrency(current);
        } else {
            element.textContent = formatNumber(current);
        }

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            if (isCurrency) {
                element.textContent = formatCurrency(end);
            } else {
                element.textContent = formatNumber(end);
            }
        }
    }

    requestAnimationFrame(update);
}

/**
 * Show loading state on stat cards
 */
function showLoadingState(show = true, msg) {
    if (show) {
        // Use popup loader for data refresh (non-blocking)
        if (window.showPopupLoader) window.showPopupLoader(msg || 'កំពុងផ្ទុកទិន្នន័យ...');
        else if (window.showUniversalLoader) window.showUniversalLoader();
    } else {
        if (window.hidePopupLoader) window.hidePopupLoader();
        if (window.hideUniversalLoader) window.hideUniversalLoader();
    }

    const cards = document.querySelectorAll('.stat-card, .card');
    cards.forEach(card => {
        if (show) {
            card.classList.add('loading');
        } else {
            card.classList.remove('loading');
        }
    });
}

/**
 * Show error/success message
 */
function showMessage(message, type = 'warning') {
    const existingAlerts = document.querySelectorAll('.dashboard-error-alert');
    existingAlerts.forEach(alert => {
        alert.style.opacity = '0';
        setTimeout(() => alert.remove(), 300);
    });

    const alertDiv = document.createElement('div');
    alertDiv.className = `dashboard-error-alert alert alert-${type} alert-dismissible fade show mt-3`;
    alertDiv.style.cssText = 'transition: opacity 0.3s;';

    let icon = 'fa-info-circle';
    if (type === 'danger') icon = 'fa-exclamation-triangle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'warning') icon = 'fa-exclamation-circle';

    alertDiv.innerHTML = `
        <i class="fas ${icon} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.insertBefore(alertDiv, mainContent.children[1]);
    }

    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.style.opacity = '0';
            setTimeout(() => alertDiv.remove(), 300);
        }
    }, 10000);
}

// ========================================================
// 3. FIREBASE INITIALIZATION
// ========================================================

function initializeFirebaseRefs() {
    try {
        console.log('Initializing Firebase references...');

        if (typeof firebase === 'undefined') {
            throw new Error('Firebase SDK is not loaded.');
        }

        if (!firebase.apps || firebase.apps.length === 0) {
            throw new Error('Firebase app is not initialized.');
        }

        database = firebase.database();

        if (!database) {
            throw new Error('Failed to get Firebase database instance.');
        }

        studentsRef = database.ref('students');
        staffRef = database.ref('staff');
        expenseRef = database.ref('expenses/currentMonth');
        paymentsRef = database.ref('payments');
        classesRef = database.ref('classes');
        transactionsRef = database.ref('transactions');

        console.log('Firebase references initialized successfully');
        return true;

    } catch (error) {
        console.error('Failed to initialize Firebase references:', error);

        let errorMessage = 'មិនអាចភ្ជាប់ទៅ Firebase Database។ ';

        if (error.message.includes('not loaded')) {
            errorMessage += 'សូមពិនិត្យការភ្ជាប់អ៊ីនធឺណិតរបស់អ្នក។';
        } else if (error.message.includes('not initialized')) {
            errorMessage += 'សូមពិនិត្យការកំណត់ Firebase របស់អ្នក។';
        } else {
            errorMessage += error.message;
        }

        showMessage(errorMessage, 'danger');
        return false;
    }
}

// ========================================================
// 4. DATA PROCESSING FUNCTIONS
// ========================================================

function updateStudentStats(studentsData) {
    if (!studentsData) {
        console.warn('No student data available');
        return;
    }

    try {
        const students = Object.values(studentsData);

        let fulltimeTotal = 0, fulltimeMale = 0, fulltimeFemale = 0;
        let parttimeTotal = 0, parttimeMale = 0, parttimeFemale = 0;
        let genKnowledgeTotal = 0, genKnowledgeMale = 0, genKnowledgeFemale = 0;
        let paidOffTotal = 0, paidOffMale = 0, paidOffFemale = 0;

        students.forEach(student => {
            if (!student) return;

            // 1. EXCLUDE DROPOUTS (Strictly matching data-tracking logic)
            // data-tracking-script.js filters if s.enrollmentStatus === 'dropout'
            const status = student.enrollmentStatus ? student.enrollmentStatus.toString().toLowerCase() : '';
            if (status === 'dropout') return;

            // 2. DETERMINE TYPE
            const primaryType = (student.studyType || student.courseType || '').toString().toLowerCase().trim();
            const studyProgram = (student.studyProgram || '').toString().toLowerCase().trim();
            const genderType = getStudentGender(student);

            // 3. FULL-TIME LOGIC (Strict Whitelist)
            // Matches 'cFullTime', 'chinese-fulltime' (and English variants)
            // REMOVED 'ពេញម៉ោង' to ensure anything else falls to Part-time, matching reference 'else' block.
            const isFullTime = primaryType === 'cfulltime' ||
                primaryType === 'chinese-fulltime' ||
                primaryType === 'efulltime' ||
                primaryType === 'english-fulltime';

            // 4. PART-TIME LOGIC (Catch-all)
            // Matches data-tracking 'else' block: "If not ChineseFT and not EnglishFT -> PartTime"
            const isPartTime = !isFullTime;

            // 5. GENERAL KNOWLEDGE CLASS LOGIC (For specific card display only)
            const isGenKnowledge = primaryType.includes('3_languages') ||
                primaryType.includes('3 languages') ||
                primaryType.includes('៣ ភាសា') ||
                primaryType.includes('one-language') ||
                primaryType.includes('two-languages') ||
                primaryType.includes('three-languages') ||
                studyProgram === 'three-languages' ||
                studyProgram === 'one-language' ||
                studyProgram === 'two-languages' ||
                studyProgram === '3_languages';

            // Increment Counters
            if (isFullTime) {
                fulltimeTotal++;
                if (genderType === 'ប្រុស') fulltimeMale++;
                else if (genderType === 'ស្រី') fulltimeFemale++;
            }

            if (isPartTime) {
                parttimeTotal++;
                if (genderType === 'ប្រុស') parttimeMale++;
                else if (genderType === 'ស្រី') parttimeFemale++;
            }

            // General Knowledge specific counts (Subset)
            if (isGenKnowledge) {
                genKnowledgeTotal++;
                if (genderType === 'ប្រុស') genKnowledgeMale++;
                else if (genderType === 'ស្រី') genKnowledgeFemale++;
            }

            // 6. PAID OFF LOGIC (Strictly matching data-tracking-script.js)
            const isPaidOff = (parseInt(student.paymentMonths) || 0) === 48 ||
                (student.nextPaymentDate && (student.nextPaymentDate === 'Completed' || student.nextPaymentDate.includes('បង់ផ្តាច់')));

            if (isPaidOff) {
                paidOffTotal++;
                if (genderType === 'ប្រុស') paidOffMale++;
                else if (genderType === 'ស្រី') paidOffFemale++;
            }
        });

        const allTotal = fulltimeTotal + parttimeTotal;
        const allMale = fulltimeMale + parttimeMale;
        const allFemale = fulltimeFemale + parttimeFemale;

        // Get previous values for smooth animation
        const getPrevValue = (id) => {
            const element = document.getElementById(id);
            if (!element) return 0;

            const text = element.textContent || '0';
            const cleaned = text.replace(/[^0-9.-]+/g, '');
            return parseInt(cleaned) || 0;
        };

        const prevFulltime = getPrevValue('totalFulltimeStudents');
        const prevParttime = getPrevValue('totalParttimeStudents');
        const prevGenKnowledge = getPrevValue('totalKindergartenStudents');
        const prevPaidOff = getPrevValue('totalPaidOffStudents');
        const prevAll = getPrevValue('totalAllStudents');

        // Update Full-time stats
        if (document.getElementById('totalFulltimeStudents')) {
            animateValue('totalFulltimeStudents', prevFulltime, fulltimeTotal);
        }
        if (document.getElementById('totalFulltimeMale')) {
            animateValue('totalFulltimeMale', 0, fulltimeMale);
        }
        if (document.getElementById('totalFulltimeFemale')) {
            animateValue('totalFulltimeFemale', 0, fulltimeFemale);
        }

        // Update Part-time stats
        if (document.getElementById('totalParttimeStudents')) {
            animateValue('totalParttimeStudents', prevParttime, parttimeTotal);
        }
        if (document.getElementById('totalParttimeMale')) {
            animateValue('totalParttimeMale', 0, parttimeMale);
        }
        if (document.getElementById('totalParttimeFemale')) {
            animateValue('totalParttimeFemale', 0, parttimeFemale);
        }

        // Update General Knowledge stats
        if (document.getElementById('totalKindergartenStudents')) {
            animateValue('totalKindergartenStudents', prevGenKnowledge, genKnowledgeTotal);
        }
        if (document.getElementById('totalKindergartenMale')) {
            animateValue('totalKindergartenMale', 0, genKnowledgeMale);
        }
        if (document.getElementById('totalKindergartenFemale')) {
            animateValue('totalKindergartenFemale', 0, genKnowledgeFemale);
        }

        // Update Paid Off stats
        if (document.getElementById('totalPaidOffStudents')) {
            animateValue('totalPaidOffStudents', prevPaidOff, paidOffTotal);
        }
        if (document.getElementById('totalPaidOffMale')) {
            animateValue('totalPaidOffMale', 0, paidOffMale);
        }
        if (document.getElementById('totalPaidOffFemale')) {
            animateValue('totalPaidOffFemale', 0, paidOffFemale);
        }

        // Calculate All Students Total
        const allTotalCount = fulltimeTotal + parttimeTotal + genKnowledgeTotal;
        const allMaleCount = fulltimeMale + parttimeMale + genKnowledgeMale;
        const allFemaleCount = fulltimeFemale + parttimeFemale + genKnowledgeFemale;

        // Update All Students stats
        if (document.getElementById('totalAllStudents')) {
            animateValue('totalAllStudents', prevAll, allTotalCount);
        }
        localStorage.setItem('cachedTotalAllStudents', allTotalCount);
        if (document.getElementById('header-total-users')) {
            animateValue('header-total-users', prevAll, allTotalCount);
        }
        if (document.getElementById('totalAllMale')) {
            animateValue('totalAllMale', 0, allMaleCount);
        }
        if (document.getElementById('totalAllFemale')) {
            animateValue('totalAllFemale', 0, allFemaleCount);
        }

        console.log('Student stats updated:', {
            fulltime: { total: fulltimeTotal, male: fulltimeMale, female: fulltimeFemale },
            parttime: { total: parttimeTotal, male: parttimeMale, female: parttimeFemale },
            generalKnowledge: { total: genKnowledgeTotal, male: genKnowledgeMale, female: genKnowledgeFemale },
            paidOff: { total: paidOffTotal, male: paidOffMale, female: paidOffFemale },
            all: { total: allTotalCount, male: allMaleCount, female: allFemaleCount }
        });

    } catch (error) {
        console.error('Error updating student stats:', error);
    }
}

/**
 * Update staff statistics (Placeholder as no UI exists yet)
 */
function updateStaffStats(staffData) {
    if (!staffData) return;
    try {
        // Currently no UI elements for staff stats, just logging to prevent error
        const count = Object.keys(staffData).length;
        console.log(`Staff data updated: ${count} staff members`);
    } catch (e) {
        console.warn('Error in updateStaffStats:', e);
    }
}
window.updateStaffStats = updateStaffStats;

/**
 * Calculate total amount (Price) for a student
 */
function calculateTotalAmount(student) {
    if (!student) return 0;
    // Base fee
    let total = parseFloat(student.coursePrice) || parseFloat(student.tuitionFee) || parseFloat(student.netFee) || 0;

    // Add other fees if stored separately (adjust based on your data structure)
    // Assuming netFee/coursePrice is the main "Total Payable"
    return total;
}

/**
 * Calculate total paid amount for a student
 */
function calculateTotalPaid(student) {
    if (!student) return 0;
    let paid = parseFloat(student.initialPayment) || parseFloat(student.paidAmount) || 0;

    if (student.installments) {
        Object.values(student.installments).forEach(inst => {
            paid += parseFloat(inst.amount) || 0;
        });
    }
    return paid;
}

function updatePaymentStats(studentsData, paymentsData) {
    if (!studentsData) return;

    try {
        let upcomingPayment = 0;
        let latePendingTotal = 0;
        let totalIncomeCollected = 0;
        let totalOutstandingAmount = 0;

        const now = new Date();
        const tenDaysFromNow = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

        Object.values(studentsData).forEach(student => {
            if (!student) return;

            const st = (student.enrollmentStatus || '').toLowerCase().trim();
            const isInactive = st === 'dropout' || st === 'graduated' || st === 'paidoff';

            // Financial Calculations (Always count income even from inactive)
            const totalAmount = calculateTotalAmount(student);
            const totalPaid = calculateTotalPaid(student);
            const remaining = totalAmount - totalPaid;

            totalIncomeCollected += totalPaid;

            // Skip further counts if inactive
            if (isInactive) return;

            // Only add positive outstanding for active students
            if (remaining > 0) {
                totalOutstandingAmount += remaining;
            }

            // Determine Status for Late/Pending Count
            // A simple approximation for Dashboard: If unpaid > 0 or status is overdue
            // We'll rely on our standard 'daysRemaining' check to be consistent
            let daysRemaining = 999;
            if (student.nextPaymentDate) {
                // Convert 'DD/MM/YYYY' to Date object
                const parts = student.nextPaymentDate.split(/[-\/]/);
                if (parts.length === 3) {
                    // Note: parts[0]=day, parts[1]=month, parts[2]=year if format is DD/MM/YYYY
                    // OR parts[0]=month if MM/DD/YYYY? 
                    // Standard in this app seems to be DD/MM/YYYY based on other files
                    // Let's assume standard parsing function availability or do it manually safe:
                    // We will assume "DD/MM/YYYY" which is common in Cambodia/UK.
                    // But usually our data is saved as DD/MM/YYYY.
                    const day = parseInt(parts[0], 10);
                    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
                    const year = parseInt(parts[2], 10);

                    const due = new Date(year, month, day);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    const diffTime = due - today;
                    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                }
            }

            // Late/Pending: Overdue (days < 0) or simply has debt?
            // User requested "Late Pending Payments Card" usually means Overdue + Outstanding
            // Let's count Overdue (days < 0) here
            if (daysRemaining < 0) {
                latePendingTotal++;
            }

            // Upcoming Payment (Near Due): 0 <= days <= 10
            if (daysRemaining >= 0 && daysRemaining <= 10) {
                upcomingPayment++;
            }
        });

        const getPrevValue = (id) => {
            const element = document.getElementById(id);
            if (!element) return 0;
            const text = element.textContent || '0';
            const cleaned = text.replace(/[^0-9.-]+/g, '');
            return parseFloat(cleaned) || 0;
        };

        const prevUpcoming = getPrevValue('upcomingPayment');
        const prevLate = getPrevValue('latePendingTotal');
        const prevIncome = getPrevValue('totalIncomeCollected');
        const prevOutstanding = getPrevValue('totalOutstandingAmount');

        if (document.getElementById('upcomingPayment')) {
            animateValue('upcomingPayment', prevUpcoming, upcomingPayment);
        }
        if (document.getElementById('latePendingTotal')) {
            animateValue('latePendingTotal', prevLate, latePendingTotal);
        }

        const incomeElement = document.getElementById('totalIncomeCollected');
        if (incomeElement) {
            animateValue('totalIncomeCollected', prevIncome, totalIncomeCollected);
        }

        const outstandingElement = document.getElementById('totalOutstandingAmount');
        if (outstandingElement) {
            animateValue('totalOutstandingAmount', prevOutstanding, totalOutstandingAmount);
        }

    } catch (error) {
        console.error('Error updating payment stats:', error);
    }
}

function updateDropoutStats(studentsData) {
    if (!studentsData) return;

    try {
        const students = Object.values(studentsData);
        let totalDropout = 0;
        let totalDropoutMale = 0;
        let totalDropoutFemale = 0;

        students.forEach(student => {
            if (!student) return;

            // Check if student status is 'dropout' or 'ឈប់រៀន'
            const status = student.enrollmentStatus ? student.enrollmentStatus.toString().toLowerCase() : '';
            const isActive = status === 'dropout' || status === 'ឈប់រៀន';

            if (isActive) {
                totalDropout++;
                const gender = getStudentGender(student);
                if (gender === 'ប្រុស') {
                    totalDropoutMale++;
                } else if (gender === 'ស្រី') {
                    totalDropoutFemale++;
                }
            }
        });

        const getPrevValue = (id) => {
            const element = document.getElementById(id);
            if (!element) return 0;
            const text = element.textContent || '0';
            const cleaned = text.replace(/[^0-9.-]+/g, '');
            return parseInt(cleaned) || 0;
        };

        const prevTotal = getPrevValue('totalDropoutStudents');
        const prevMale = getPrevValue('totalDropoutMale');
        const prevFemale = getPrevValue('totalDropoutFemale');

        if (document.getElementById('totalDropoutStudents')) {
            animateValue('totalDropoutStudents', prevTotal, totalDropout);
        }
        if (document.getElementById('totalDropoutMale')) {
            animateValue('totalDropoutMale', prevMale, totalDropoutMale);
        }
        if (document.getElementById('totalDropoutFemale')) {
            animateValue('totalDropoutFemale', prevFemale, totalDropoutFemale);
        }

    } catch (error) {
        console.error('Error updating dropout stats:', error);
    }
}

// Deprecated or Unused
// Expense Stats
function updateExpenseStats(transactionsData) {
    if (!transactionsData) {
        animateValue('totalExpenseAmount', 0, 0);
        return;
    }

    try {
        let totalExpense = 0;

        // transactionsData can be object or array depending on firebase return
        const transactions = Object.values(transactionsData);

        transactions.forEach(t => {
            if (t.type === 'expense') {
                totalExpense += parseFloat(t.amount) || 0;
            }
        });

        const getPrevValue = (id) => {
            const element = document.getElementById(id);
            if (!element) return 0;
            const text = element.textContent || '0';
            const cleaned = text.replace(/[^0-9.-]+/g, '');
            return parseFloat(cleaned) || 0;
        };

        const prevExpense = getPrevValue('totalExpenseAmount');
        if (document.getElementById('totalExpenseAmount')) {
            animateValue('totalExpenseAmount', prevExpense, totalExpense);
        }

    } catch (error) {
        console.error('Error updating expense stats:', error);
    }
}

function updateRevenueWithClasses(studentsData, classesData) {
    if (!studentsData || !classesData) return;

    try {
        let detailedRevenue = 0;

        Object.values(studentsData).forEach(student => {
            if (!student) return;

            if (student.status === 'inactive') return;

            let studentRevenue = 0;

            if (student.classId && classesData[student.classId]) {
                const classInfo = classesData[student.classId];
                const tuitionFee = parseFloat(classInfo.tuitionFee) || 0;
                const discount = parseFloat(student.discount) || 0;
                studentRevenue = tuitionFee - discount;
            } else if (student.netFee) {
                studentRevenue = parseFloat(student.netFee) || 0;
            }

            detailedRevenue += studentRevenue;
        });

        const revenueElement = document.getElementById('monthlyRevenue');
        if (revenueElement) {
            const prevRevenue = parseFloat(
                revenueElement.textContent.replace(/[^0-9.-]+/g, "") || 0
            );
            animateValue('monthlyRevenue', prevRevenue, detailedRevenue);
        }
    } catch (error) {
        console.error('Error updating revenue with classes:', error);
    }
}

// ========================================================
// 5. ENHANCED FUNCTIONS FOR NOTIFICATION SYSTEM
// ========================================================

/**
 * Get upcoming payment students (within 7 days)
 */
function getUpcomingPaymentStudents(studentsData, daysThreshold = 7) {
    if (!studentsData) return [];

    const upcomingStudents = [];
    const now = new Date();
    const thresholdDate = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);

    Object.entries(studentsData).forEach(([studentId, student]) => {
        if (!student || !student.paymentDueDate) return;

        try {
            const dueDate = new Date(student.paymentDueDate);

            if (dueDate > now && dueDate <= thresholdDate) {
                const paymentStatus = student.paymentStatus ?
                    student.paymentStatus.toString().toLowerCase() : '';

                if (paymentStatus === 'pending' || paymentStatus === 'partial' ||
                    paymentStatus === 'មិនទាន់បង់' || paymentStatus === 'បានបង់ខ្លះ') {
                    const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

                    upcomingStudents.push({
                        id: studentId,
                        name: student.fullName || student.name || 'គ្មានឈ្មោះ',
                        studentId: student.studentCode || student.studentId || '',
                        dueDate: student.paymentDueDate,
                        daysUntilDue: daysUntilDue,
                        amountDue: student.balanceDue || student.netFee || 0,
                        className: student.className || student.course || '',
                        phone: student.phone || student.contact || '',
                        gender: getStudentGender(student)
                    });
                }
            }
        } catch (error) {
            console.warn('Invalid due date format:', student.paymentDueDate);
        }
    });

    upcomingStudents.sort((a, b) => a.daysUntilDue - b.daysUntilDue);

    return upcomingStudents;
}

/**
 * Get unpaid boarding students
 */
function getUnpaidBoardingStudents(studentsData) {
    if (!studentsData) return [];

    const unpaidBoardingStudents = [];
    const now = new Date();

    Object.entries(studentsData).forEach(([studentId, student]) => {
        if (!student) return;

        const hasBoarding = student.hasBoarding === true ||
            student.boardingStatus === 'active' ||
            student.residenceType === 'boarding' ||
            student.accommodation === 'boarding' ||
            student.residence === 'boarding' ||
            student.stayType === 'boarding' ||
            (student.notes && student.notes.toString().toLowerCase().includes('boarding')) ||
            (student.remarks && student.remarks.toString().toLowerCase().includes('ជំណាក់'));

        if (!hasBoarding) return;

        const paymentStatus = student.paymentStatus ?
            student.paymentStatus.toString().toLowerCase() : '';

        const isUnpaid = paymentStatus === 'pending' ||
            paymentStatus === 'late' ||
            paymentStatus === 'partial' ||
            paymentStatus === 'overdue' ||
            paymentStatus === 'ពន្យារ' ||
            paymentStatus === 'មិនទាន់បង់';

        let isPaymentOverdue = false;
        if (student.paymentDueDate) {
            try {
                const dueDate = new Date(student.paymentDueDate);
                isPaymentOverdue = dueDate < now;
            } catch (e) {
                console.warn('Invalid due date:', student.paymentDueDate);
            }
        }

        const balanceDue = parseFloat(student.balanceDue) || 0;
        const amountPaid = parseFloat(student.amountPaid) || 0;
        const netFee = parseFloat(student.netFee) || 0;
        const amountDue = parseFloat(student.amountDue) || 0;

        const hasUnpaidBalance = balanceDue > 0 ||
            (netFee > 0 && amountPaid < netFee) ||
            amountDue > 0;

        if (isUnpaid || isPaymentOverdue || hasUnpaidBalance) {
            unpaidBoardingStudents.push({
                id: studentId,
                name: student.fullName || student.name || student.englishName || 'គ្មានឈ្មោះ',
                studentId: student.studentCode || student.studentId || student.code || '',
                phone: student.phone || student.contact || student.phoneNumber || student.tel || '',
                paymentStatus: student.paymentStatus || 'pending',
                dueDate: student.paymentDueDate || student.dueDate || '',
                amountDue: Math.max(balanceDue, amountDue, netFee - amountPaid),
                className: student.className || student.course || student.class || '',
                boardingType: student.boardingType || student.residenceType || 'ជំណាក់ធម្មតា',
                gender: getStudentGender(student),
                registrationDate: student.registrationDate || student.createdAt || '',
                lastPaymentDate: student.lastPaymentDate || '',
                notes: student.notes || student.remarks || ''
            });
        }
    });

    return unpaidBoardingStudents;
}

/**
 * Get student gender
 */
function getStudentGender(student) {
    if (!student) return 'មិនស្គាល់';

    const genderData = student.gender || student.sex || '';
    const g = genderData.toString().toLowerCase().trim();

    // Check Female first to avoid confusion if fuzzy matching
    if (g === 'female' || g === 'f' || g === 'ស្រី' || g.includes('female') || g.includes('ស្រី')) {
        return 'ស្រី';
    }

    if (g === 'male' || g === 'm' || g === 'ប្រុស' || g.includes('male') || g.includes('ប្រុស')) {
        return 'ប្រុស';
    }

    return 'មិនស្គាល់';
}

/**
 * Calculate gender statistics
 */
function calculateGenderStatistics(students) {
    let male = 0;
    let female = 0;
    let unknown = 0;

    students.forEach(student => {
        const gender = getStudentGender(student);
        if (gender === 'ប្រុស') male++;
        else if (gender === 'ស្រី') female++;
        else unknown++;
    });

    return { male, female, unknown };
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    if (!dateString) return 'មិនមាន';

    try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString;

        const day = d.getDate();
        const month = d.getMonth() + 1;
        const year = d.getFullYear();

        return `ថ្ងៃទី ${day}/${month}/${year}`;
    } catch (error) {
        return dateString;
    }
}



// ========================================================
// 6. MAIN DASHBOARD FUNCTIONS
// ========================================================

function initializeDashboard() {
    console.log('🚀 Initializing dashboard...');

    const isDashboardPage = document.getElementById('totalFulltimeStudents') ||
        document.querySelector('.dashboard-container') ||
        document.querySelector('[data-dashboard="true"]');

    if (!isDashboardPage) {
        console.log('Not on dashboard page, skipping initialization');
        return;
    }

    showLoadingState(true);

    const firebaseInitialized = initializeFirebaseRefs();

    if (!firebaseInitialized) {
        showLoadingState(false);

        if (retryCount < MAX_RETRY_ATTEMPTS) {
            retryCount++;
            console.log(`Retrying Firebase initialization (attempt ${retryCount}/${MAX_RETRY_ATTEMPTS})...`);
            setTimeout(initializeDashboard, 3000);
        }
        return;
    }

    retryCount = 0;

    loadAllData();

    setupRealtimeListeners();

    if (dashboardUpdateInterval) {
        clearInterval(dashboardUpdateInterval);
    }
    dashboardUpdateInterval = setInterval(loadAllData, UPDATE_INTERVAL);

    addUpdateIndicator();

    // Initialize Charts
    initDashboardCharts();

    console.log('✅ Dashboard initialization complete');
}

function loadAllData() {
    showUpdateIndicator();

    if (!studentsRef || !staffRef || !expenseRef || !paymentsRef || !classesRef) {
        console.error('Firebase references not initialized');
        showMessage('ទិន្នន័យមិនត្រូវបានចាប់ផ្តើម។ កំពុងព្យាយាមម្តងទៀត...', 'warning');
        return;
    }

    Promise.all([
        studentsRef.once('value').catch(err => {
            console.error('Error fetching students:', err);
            return { val: () => null };
        }),
        staffRef.once('value').catch(err => {
            console.error('Error fetching staff:', err);
            return { val: () => null };
        }),
        expenseRef.once('value').catch(err => {
            console.error('Error fetching expenses:', err);
            return { val: () => null };
        }),
        paymentsRef.once('value').catch(err => {
            console.error('Error fetching payments:', err);
            return { val: () => null };
        }),
        classesRef.once('value').catch(err => {
            console.error('Error fetching classes:', err);
            return { val: () => null };
        }),
        transactionsRef.once('value').catch(err => {
            console.error('Error fetching transactions:', err);
            return { val: () => null };
        })
    ]).then(([studentsSnap, staffSnap, expenseSnap, paymentsSnap, classesSnap, transactionsSnap]) => {
        const studentsData = studentsSnap.val();
        const staffData = staffSnap.val();
        const expenseData = expenseSnap.val();
        const paymentsData = paymentsSnap.val();
        const classesData = classesSnap.val();
        const transactionsData = transactionsSnap.val();

        updateStudentStats(studentsData);
        updateDropoutStats(studentsData);
        updateStaffStats(staffData);
        updateExpenseStats(transactionsData);
        updatePaymentStats(studentsData, paymentsData);
        // updateRevenueWithClasses(studentsData, classesData); // Disabled

        // 🔥 UPDATE NOTIFICATION SYSTEM 🔥
        updateNotificationSystem(studentsData, paymentsData);

        // 📊 UPDATE CHARTS 📊
        updateDashboardCharts(studentsData, transactionsData);

        if (document.getElementById('unpaidBoardingList')) {
            const unpaidBoarding = getUnpaidBoardingStudents(studentsData);
            displayUnpaidBoardingStudents(unpaidBoarding);
        }

        if (document.getElementById('chineseFulltimeList')) {
            const chineseFulltime = getChineseClassStudents(studentsData, 'fulltime');
            displayChineseClassStudents(chineseFulltime, 'fulltime');
        }

        if (document.getElementById('chineseParttimeList')) {
            const chineseParttime = getChineseClassStudents(studentsData, 'parttime');
            displayChineseClassStudents(chineseParttime, 'parttime');
        }

        if (document.getElementById('upcomingPaymentList')) {
            const upcomingStudents = getUpcomingPaymentStudents(studentsData, 7);
            displayUpcomingPaymentStudents(upcomingStudents);
        }

        updateLastUpdatedTime();

        if (isInitialLoad) {
            showLoadingState(false);
            isInitialLoad = false;
            console.log('📊 Dashboard data loaded successfully!');
            showMessage('ទិន្នន័យត្រូវបានទាញយកដោយជោគជ័យ!', 'success');
        }

    }).catch(error => {
        console.error('Error loading data:', error);
        showMessage('កំហុសក្នុងការទាញយកទិន្នន័យ។ ' + error.message, 'danger');
        showLoadingState(false);
    });
}

let globalStudentsCache = null;
let globalPaymentsCache = null;

function setupRealtimeListeners() {
    if (!database) return;

    console.log('Setting up real-time listeners...');

    // 1. Listen to Payments First (so we have it ready)
    if (paymentsRef) {
        paymentsRef.on('value', (snapshot) => {
            globalPaymentsCache = snapshot.val() || {};
            if (globalStudentsCache) {
                updatePaymentStats(globalStudentsCache, globalPaymentsCache);
                updateNotificationSystem(globalStudentsCache, globalPaymentsCache);
            }
        });
    }

    // 2. Listen to Students
    if (studentsRef) {
        studentsRef.on('value', (snapshot) => {
            globalStudentsCache = snapshot.val() || {};
            updateStudentStats(globalStudentsCache);

            if (globalPaymentsCache) {
                updatePaymentStats(globalStudentsCache, globalPaymentsCache);
                updateNotificationSystem(globalStudentsCache, globalPaymentsCache);
            } else if (paymentsRef) {
                // Fallback fetch if payments haven't loaded yet
                paymentsRef.once('value').then(paymentsSnap => {
                    globalPaymentsCache = paymentsSnap.val() || {};
                    updatePaymentStats(globalStudentsCache, globalPaymentsCache);
                    updateNotificationSystem(globalStudentsCache, globalPaymentsCache);
                });
            }
        });
    }

    if (staffRef) {
        staffRef.on('value', (snapshot) => {
            updateStaffStats(snapshot.val());
        });
    }

    if (expenseRef) {
        expenseRef.on('value', (snapshot) => {
            updateExpenseStats(snapshot.val());
        });
    }
}

function addUpdateIndicator() {
    let indicator = document.getElementById('data-update-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'data-update-indicator';
        indicator.innerHTML = '<i class="fi fi-rr-refresh update-spin-icon"></i> <span>កំពុងធ្វើបច្ចុប្បន្នភាពទិន្នន័យ...</span>';
        document.body.appendChild(indicator);
    }
}

function showUpdateIndicator() {
    let indicator = document.getElementById('data-update-indicator');
    if (!indicator) {
        addUpdateIndicator();
        indicator = document.getElementById('data-update-indicator');
    }
    if (indicator) {
        indicator.innerHTML = '<i class="fi fi-rr-refresh update-spin-icon"></i> <span>កំពុងធ្វើបច្ចុប្បន្នភាពទិន្នន័យ...</span>';
        indicator.classList.add('show');

        if (indicator._hideTimer) clearTimeout(indicator._hideTimer);
        indicator._hideTimer = setTimeout(() => {
            indicator.innerHTML = '<i class="fi fi-rr-check-circle" style="color: #4ade80; font-size: 1.05rem;"></i> <span>ទិន្នន័យទាន់សម័យ</span>';
            setTimeout(() => {
                indicator.classList.remove('show');
            }, 1000);
        }, 1600);
    }
}

function updateLastUpdatedTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    const timestampElement = document.getElementById('data-timestamp');
    if (timestampElement) {
        timestampElement.innerHTML = `<i class="fas fa-clock me-1"></i>ធ្វើបច្ចុប្បន្នភាពចុងក្រោយ: ${timeString}`;
    }

    // Try both IDs for better compatibility
    const lastUpdateTime = document.getElementById('last-update-time');
    if (lastUpdateTime) {
        lastUpdateTime.textContent = timeString;
    }

    const footerTimestamp = document.getElementById('footer-timestamp');
    if (footerTimestamp) {
        footerTimestamp.textContent = timeString;
    }
}

function cleanupDashboard() {
    console.log('🧹 Cleaning up dashboard resources...');

    if (dashboardUpdateInterval) {
        clearInterval(dashboardUpdateInterval);
        dashboardUpdateInterval = null;
    }

    if (studentsRef) {
        try { studentsRef.off(); } catch (e) { console.warn('Error removing students listener:', e); }
    }
    if (staffRef) {
        try { staffRef.off(); } catch (e) { console.warn('Error removing staff listener:', e); }
    }
    if (expenseRef) {
        try { expenseRef.off(); } catch (e) { console.warn('Error removing expense listener:', e); }
    }

    const indicator = document.getElementById('data-update-indicator');
    if (indicator) {
        indicator.remove();
    }

    console.log('✅ Dashboard cleanup complete');
}

// ========================================================
// 7. UI DISPLAY FUNCTIONS
// ========================================================

function displayUnpaidBoardingStudents(students) {
    const container = document.getElementById('unpaidBoardingList');
    if (!container) return;

    if (!students || students.length === 0) {
        container.innerHTML = `
            <div class="alert alert-success">
                <i class="fi fi-rr-check-circle me-2"></i>
                គ្មានសិស្សនៅជំណាក់មិនទាន់បង់
            </div>
        `;

        const countElement = document.getElementById('unpaidBoardingCount');
        if (countElement) countElement.textContent = '0';
        return;
    }

    let html = `
        <div class="table-responsive">
            <table class="table table-hover table-sm">
                <thead class="table-light">
                    <tr>
                        <th>#</th>
                        <th>ឈ្មោះសិស្ស</th>
                        <th>លេខសិស្ស</th>
                        <th>ថ្នាក់</th>
                        <th>ទូរស័ព្ទ</th>
                        <th>ស្ថានភាព</th>
                        <th>ថ្ងៃបង់</th>
                        <th>ទឹកប្រាក់ខ្វះ</th>
                    </tr>
                </thead>
                <tbody>
    `;

    students.forEach((student, index) => {
        const dueDate = student.dueDate ?
            new Date(student.dueDate).toLocaleDateString('en-GB') : 'មិនមាន';
        const amountDue = formatCurrency(student.amountDue);

        let statusBadge = '';
        const status = student.paymentStatus ? student.paymentStatus.toLowerCase() : '';

        if (status.includes('late') || status.includes('overdue')) {
            statusBadge = '<span class="badge bg-danger">ពន្យារ</span>';
        } else if (status.includes('partial')) {
            statusBadge = '<span class="badge bg-warning text-dark">បានបង់ខ្លះ</span>';
        } else {
            statusBadge = '<span class="badge bg-secondary">មិនទាន់បង់</span>';
        }

        html += `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${student.name}</strong></td>
                <td>${student.studentId}</td>
                <td>${student.className}</td>
                <td>${formatPhoneWithCarrier(student.phone)}</td>
                <td>${statusBadge}</td>
                <td>${dueDate}</td>
                <td class="text-danger fw-bold">${amountDue}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
        <div class="mt-2 text-end">
            <small class="text-muted">
                <i class="fas fa-info-circle"></i>
                សរុប: ${students.length} នាក់
            </small>
        </div>
    `;

    container.innerHTML = html;

    const countElement = document.getElementById('unpaidBoardingCount');
    if (countElement) countElement.textContent = students.length;
}

function displayChineseClassStudents(students, classType) {
    const containerId = classType === 'fulltime'
        ? 'chineseFulltimeList'
        : 'chineseParttimeList';

    const container = document.getElementById(containerId);
    if (!container) return;

    const title = classType === 'fulltime'
        ? 'សិស្សភាសាចិនពេញម៉ោង'
        : 'សិស្សភាសាចិនក្រៅម៉ោង';

    if (!students || students.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                គ្មាន${title}
            </div>
        `;

        const countElement = document.getElementById(`chinese${classType === 'fulltime' ? 'Fulltime' : 'Parttime'}Count`);
        if (countElement) countElement.textContent = '0';
        return;
    }

    let html = `
        <h6 class="mb-3 text-primary">
            <i class="fas fa-language me-2"></i>${title} (${students.length} នាក់)
        </h6>
        <div class="table-responsive">
            <table class="table table-sm">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>ឈ្មោះសិស្ស</th>
                        <th>លេខសិស្ស</th>
                        <th>ថ្នាក់</th>
                        <th>ប្រភេទ</th>
                        <th>ស្ថានភាព</th>
                    </tr>
                </thead>
                <tbody>
    `;

    students.forEach((student, index) => {
        let statusBadge = '';
        if (student.paymentStatus) {
            if (student.paymentStatus.toLowerCase().includes('paid')) {
                statusBadge = '<span class="badge bg-success">បានបង់</span>';
            } else if (student.paymentStatus.toLowerCase().includes('partial')) {
                statusBadge = '<span class="badge bg-warning text-dark">បានបង់ខ្លះ</span>';
            } else {
                statusBadge = '<span class="badge bg-secondary">មិនទាន់បង់</span>';
            }
        }

        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${student.name}</td>
                <td>${student.studentId}</td>
                <td>${student.className}</td>
                <td>
                    <span class="badge ${classType === 'fulltime' ? 'bg-primary' : 'bg-info'}">
                        ${student.studyType}
                    </span>
                </td>
                <td>${statusBadge}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;

    container.innerHTML = html;
    const countElement = document.getElementById(`chinese${classType === 'fulltime' ? 'Fulltime' : 'Parttime'}Count`);
    if (countElement) countElement.textContent = students.length;
}

// Remove duplicate or conflicting functions if any (cleanup)

function displayUpcomingPaymentStudents(students) {
    const container = document.getElementById('upcomingPaymentList');
    if (!container) return;

    if (!students || students.length === 0) {
        container.innerHTML = `
            <div class="alert alert-success">
                <i class="fi fi-rr-check-circle me-2"></i>
                គ្មានសិស្សជិតដល់ថ្ងៃបង់ក្នុង១សប្តាហ៍ខាងមុខ
            </div>
        `;

        const countElement = document.getElementById('upcomingPaymentCount');
        if (countElement) countElement.textContent = '0';
        return;
    }

    let html = `
        <div class="table-responsive">
            <table class="table table-hover table-sm">
                <thead class="table-warning">
                    <tr>
                        <th>#</th>
                        <th>ឈ្មោះសិស្ស</th>
                        <th>លេខសិស្ស</th>
                        <th>ថ្នាក់</th>
                        <th>ថ្ងៃបង់</th>
                        <th>នៅសល់ (ថ្ងៃ)</th>
                        <th>ទឹកប្រាក់</th>
                        <th>ទូរស័ព្ទ</th>
                    </tr>
                </thead>
                <tbody>
    `;

    students.forEach((student, index) => {
        const dueDate = new Date(student.dueDate).toLocaleDateString('en-GB');
        const amountDue = formatCurrency(student.amountDue);

        let daysClass = '';
        if (student.daysUntilDue <= 1) {
            daysClass = 'danger';
        } else if (student.daysUntilDue <= 3) {
            daysClass = 'warning';
        } else {
            daysClass = 'success';
        }

        html += `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${student.name}</strong></td>
                <td>${student.studentId}</td>
                <td>${student.className}</td>
                <td>${dueDate}</td>
                <td>
                    <span class="badge bg-${daysClass}">
                        ${student.daysUntilDue} ថ្ងៃ
                    </span>
                </td>
                <td class="fw-bold">${amountDue}</td>
                <td>${formatPhoneWithCarrier(student.phone)}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
        <div class="mt-2">
            <small class="text-muted">
                <i class="fas fa-exclamation-triangle text-warning"></i>
                សរុបសិស្សជិតដល់ថ្ងៃបង់: ${students.length} នាក់
            </small>
        </div>
    `;

    container.innerHTML = html;

    const countElement = document.getElementById('upcomingPaymentCount');
    if (countElement) countElement.textContent = students.length;
}

// ========================================================
// 8. NOTIFICATION SYSTEM FUNCTIONS (INTEGRATED)
// ========================================================

let isNotificationPopoverOpen = false;
let notificationPopoverInstance = null;

/**
 * Initialize notification popover
 */
function initializeNotificationPopover() {
    const notificationBtn = document.getElementById('notification-btn');
    if (!notificationBtn) return;

    notificationPopoverInstance = new bootstrap.Popover(notificationBtn, {
        trigger: 'manual',
        html: true,
        placement: 'bottom',
        customClass: 'notification-popover',
        title: 'ការជូនដំណឹងសំខាន់ៗ',
        content: 'កំពុងទាញយកទិន្នន័យ...'
    });

    notificationBtn.addEventListener('shown.bs.popover', function () {
        isNotificationPopoverOpen = true;
    });

    notificationBtn.addEventListener('hidden.bs.popover', function () {
        isNotificationPopoverOpen = false;
    });

    notificationBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        if (isNotificationPopoverOpen) {
            notificationPopoverInstance.hide();
        } else {
            notificationPopoverInstance.show();
        }
    });

    notificationBtn.addEventListener('shown.bs.popover', function () {
        const popoverBody = document.querySelector('.popover .popover-body');
        attachNotificationTabListeners(popoverBody);
    });

    document.addEventListener('click', function (event) {
        const popoverElement = document.querySelector('.popover');
        const notificationBtn = document.getElementById('notification-btn');

        if (popoverElement &&
            !popoverElement.contains(event.target) &&
            !notificationBtn.contains(event.target)) {
            notificationPopoverInstance.hide();
        }
    });
}

/**
 * Update notification badge
 */
function updateNotificationBadge(totalNotifications) {
    const badge = document.getElementById('notif-badge');
    if (!badge) return;

    badge.textContent = totalNotifications;

    if (totalNotifications > 0) {
        badge.classList.add('notification-badge-pulse');
        badge.classList.remove('d-none');
    } else {
        badge.classList.remove('notification-badge-pulse');
        badge.classList.add('d-none');
    }
}

/**


/**
 * Update the entire notification system
 */
function updateNotificationSystem(studentsData, paymentsData) {
    if (!studentsData) {
        console.warn('No student data for notification system');
        return;
    }

    try {
        const upcomingStudents = getUpcomingPaymentStudents(studentsData, 7);
        const unpaidBoardingStudents = getUnpaidBoardingStudents(studentsData);

        const upcomingCount = upcomingStudents.length;
        const unpaidBoardingCount = unpaidBoardingStudents.length;
        const totalNotifications = upcomingCount + unpaidBoardingCount;

        let totalUpcomingAmount = 0;
        let totalUnpaidBoardingAmount = 0;

        upcomingStudents.forEach(student => {
            totalUpcomingAmount += parseFloat(student.amountDue) || 0;
        });

        unpaidBoardingStudents.forEach(student => {
            totalUnpaidBoardingAmount += parseFloat(student.amountDue) || 0;
        });

        updateNotificationBadge(totalNotifications);

        updateNotificationPopoverContent(
            upcomingStudents,
            unpaidBoardingStudents,
            totalUpcomingAmount,
            totalUnpaidBoardingAmount
        );

        updateNotificationButtonAppearance(upcomingCount, unpaidBoardingCount);

    } catch (error) {
        console.error('Error updating notification system:', error);
    }
}

/**
 * Update notification popover content
 */
function updateNotificationPopoverContent(upcomingStudents, unpaidBoardingStudents, totalUpcomingAmount, totalUnpaidBoardingAmount) {
    const notificationBtn = document.getElementById('notification-btn');
    if (!notificationBtn || !notificationPopoverInstance) return;

    const upcomingCount = upcomingStudents.length;
    const boardingCount = unpaidBoardingStudents.length;

    const boardingGenderStats = calculateGenderStatistics(unpaidBoardingStudents);

    const html = `
        <div class="notification-tabs">
            <button class="notification-tab active" data-tab="upcoming">
                <i class="fas fa-clock me-1"></i>ជិតដល់ថ្ងៃបង់ (${upcomingCount})
            </button>
            <button class="notification-tab" data-tab="boarding">
                <i class="fi fi-rr-home me-1"></i>ជំណាក់មិនទាន់បង់ (${boardingCount})
            </button>
        </div>
        
        <div class="notification-summary">
            <div class="summary-item">
                <span class="summary-label">សិស្សជិតដល់ថ្ងៃបង់:</span>
                <span class="summary-value upcoming">${upcomingCount} នាក់</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">ទឹកប្រាក់ជិតដល់:</span>
                <span class="summary-value upcoming">${formatCurrency(totalUpcomingAmount)}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">សិស្សជំណាក់មិនទាន់បង់:</span>
                <span class="summary-value late">${boardingCount} នាក់</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">ទឹកប្រាក់ជំណាក់ខ្វះ:</span>
                <span class="summary-value late">${formatCurrency(totalUnpaidBoardingAmount)}</span>
            </div>
        </div>
        
        <div id="notification-upcoming-tab" class="notification-tab-content">
    `;

    if (upcomingCount > 0) {
        html += `<ul class="notification-student-list">`;

        upcomingStudents.forEach((student, index) => {
            const daysLeft = student.daysUntilDue || 0;
            let statusClass = 'status-upcoming';
            let amountClass = 'amount-upcoming';

            if (daysLeft <= 1) {
                statusClass = 'status-late';
                amountClass = 'amount-late';
            }

            html += `
                <li class="notification-student-item">
                    <div class="student-info">
                        <div class="student-name">${student.name}</div>
                        <div class="student-details">
                            <span><i class="fas fa-user-graduate"></i> ${student.studentId}</span>
                            <span><i class="fas fa-chalkboard-teacher"></i> ${student.className}</span>
                            <span><i class="fas fa-calendar-day"></i> ${formatDate(student.dueDate)}</span>
                            <span class="${statusClass} student-status">
                                <i class="fas ${daysLeft <= 1 ? 'fa-exclamation-triangle' : 'fa-clock'}"></i>
                                ${daysLeft} ថ្ងៃទៀត
                            </span>
                        </div>
                    </div>
                    <div class="${amountClass} amount-due">
                        ${formatCurrency(student.amountDue)}
                    </div>
                </li>
            `;
        });

        html += `</ul>`;
    } else {
        html += `
            <div class="notification-empty">
                <i class="fi fi-rr-check-circle"></i>
                <p>គ្មានសិស្សដែលជិតដល់ថ្ងៃបង់ក្នុង៧ថ្ងៃខាងមុខ</p>
            </div>
        `;
    }

    html += `</div>`;

    html += `<div id="notification-boarding-tab" class="notification-tab-content" style="display: none;">`;

    if (boardingCount > 0) {
        html += `
            <div class="alert alert-info mb-3">
                <i class="fas fa-info-circle me-2"></i>
                <strong>ស្ថិតិភេទ:</strong> 
                <span class="text-primary">ប្រុស: ${boardingGenderStats.male}</span> | 
                <span class="text-danger">ស្រី: ${boardingGenderStats.female}</span>
            </div>
            
            <ul class="notification-student-list">
        `;

        unpaidBoardingStudents.forEach((student, index) => {
            const gender = student.gender || 'មិនស្គាល់';
            const genderIcon = gender === 'ប្រុស' ? 'fa-mars' : (gender === 'ស្រី' ? 'fa-venus' : 'fa-question');
            const genderColor = gender === 'ប្រុស' ? 'text-primary' : (gender === 'ស្រី' ? 'text-danger' : 'text-secondary');

            html += `
                <li class="notification-student-item">
                    <div class="student-info">
                        <div class="student-name">
                            ${student.name}
                            <small class="${genderColor} ms-2">
                                <i class="fas ${genderIcon}"></i>
                            </small>
                        </div>
                        <div class="student-details">
                            <span><i class="fi fi-rr-id-badge"></i> ${student.studentId}</span>
                            <span><i class="fi fi-rr-phone-call"></i> ${student.phone || 'មិនមាន'}</span>
                            <span><i class="fi fi-rr-home"></i> ${student.boardingType}</span>
                            <span class="status-late student-status">
                                <i class="fi fi-rr-exclamation-circle"></i>
                                ${student.paymentStatus || 'មិនទាន់បង់'}
                            </span>
                        </div>
                    </div>
                    <div class="amount-late amount-due">
                        ${formatCurrency(student.amountDue)}
                    </div>
                </li>
            `;
        });

        html += `</ul>`;
    } else {
        html += `
            <div class="notification-empty">
                <i class="fi fi-rr-check-circle"></i>
                <p>គ្មានសិស្សនៅជំណាក់មិនទាន់បង់</p>
            </div>
        `;
    }

    html += `</div>`;

    // Use a small delay to ensure DOM is updated before attaching event listeners
    if (isNotificationPopoverOpen) {
        const popoverBody = document.querySelector('.popover .popover-body');
        if (popoverBody) {
            popoverBody.innerHTML = html;
            attachNotificationTabListeners(popoverBody);
        }
    } else {
        notificationPopoverInstance.setContent({ '.popover-body': html });
        // We can't attach listeners yet because content isn't in DOM until shown.
        // The 'shown.bs.popover' event handles attachment.
    }
}

function attachNotificationTabListeners(container) {
    if (!container) return;
    const tabs = container.querySelectorAll('.notification-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            const tabName = this.getAttribute('data-tab');
            switchNotificationTab(tabName, container);
        });
    });
}

function switchNotificationTab(tabName, container) {
    if (!container) container = document.querySelector('.popover .popover-body');
    if (!container) return;

    container.querySelectorAll('.notification-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-tab') === tabName) {
            tab.classList.add('active');
        }
    });

    container.querySelectorAll('.notification-tab-content').forEach(content => {
        content.style.display = 'none';
    });

    const selectedContent = container.querySelector(`#notification-${tabName}-tab`);
    if (selectedContent) {
        selectedContent.style.display = 'block';
    }
}

/**
 * Update notification button appearance
 */
function updateNotificationButtonAppearance(upcomingCount, boardingCount) {
    const btn = document.getElementById('notification-btn');
    if (!btn) return;

    btn.classList.remove('btn-danger', 'btn-warning', 'btn-success');

    if (boardingCount > 0 || upcomingCount > 5) {
        btn.classList.add('btn-danger');
        btn.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            btn.style.animation = '';
        }, 500);
    } else if (upcomingCount > 0) {
        btn.classList.add('btn-warning');
    } else {
        btn.classList.add('btn-success');
    }
}

// ========================================================
// 8. DATA ANALYSIS & CHARTS
// ========================================================

let financialChartInstance = null;
let studentDistributionChartInstance = null;
let enrollmentChartInstance = null;

function initDashboardCharts() {
    if (typeof window.initStudentLevelChart === 'function') {
        window.initStudentLevelChart();
    }

    // Financial Chart
    const ctxFinancial = document.getElementById('financialChart');
    if (ctxFinancial) {
        // Create Gradient
        const ctx = ctxFinancial.getContext('2d');
        const incomeGradient = ctx.createLinearGradient(0, 0, 0, 400);
        incomeGradient.addColorStop(0, 'rgba(25, 135, 84, 0.8)');
        incomeGradient.addColorStop(1, 'rgba(25, 135, 84, 0.1)');

        const expenseGradient = ctx.createLinearGradient(0, 0, 0, 400);
        expenseGradient.addColorStop(0, 'rgba(220, 53, 69, 0.8)');
        expenseGradient.addColorStop(1, 'rgba(220, 53, 69, 0.1)');

        financialChartInstance = new Chart(ctxFinancial, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'ចំណូល (Income)',
                        data: [],
                        backgroundColor: incomeGradient,
                        borderColor: '#198754',
                        borderWidth: 0,
                        borderRadius: 6,
                        barPercentage: 0.6,
                        categoryPercentage: 0.8
                    },
                    {
                        label: 'ចំណាយ (Expense)',
                        data: [],
                        backgroundColor: expenseGradient,
                        borderColor: '#dc3545',
                        borderWidth: 0,
                        borderRadius: 6,
                        barPercentage: 0.6,
                        categoryPercentage: 0.8
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: { family: "'Kantumruy Pro', sans-serif", size: 12 },
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#333',
                        bodyColor: '#666',
                        titleFont: { family: "'Kantumruy Pro', sans-serif", size: 13, weight: 'bold' },
                        bodyFont: { family: "'Kantumruy Pro', sans-serif", size: 12 },
                        borderColor: '#f0f0f0',
                        borderWidth: 1,
                        padding: 10,
                        boxPadding: 4,
                        callbacks: {
                            label: function (context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += formatCurrency(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            font: { family: "'Kantumruy Pro', sans-serif", size: 11 },
                            color: '#888'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        border: { display: false },
                        grid: { color: '#f0f0f0', drawBorder: false },
                        ticks: {
                            font: { family: "sans-serif", size: 10 },
                            color: '#aaa',
                            callback: function (value) {
                                if (value >= 1000) return '$' + (value / 1000) + 'k';
                                return '$' + value;
                            }
                        }
                    }
                }
            }
        });
    }


    // Student Distribution Chart
    const ctxDistribution = document.getElementById('studentDistributionChart');
    if (ctxDistribution) {
        studentDistributionChartInstance = new Chart(ctxDistribution, {
            type: 'doughnut',
            data: {
                labels: ['ពេញម៉ោង (Full-time)', 'ក្រៅម៉ោង (Part-time)', 'ផ្សេងៗ (Other)'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: [
                        '#0d6efd', // Primary Blue
                        '#20c997', // Teal
                        '#6f42c1'  // Purple
                    ],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: { family: "'Kantumruy Pro', sans-serif", size: 11 },
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        bodyColor: '#333',
                        titleColor: '#333',
                        borderColor: '#e9ecef',
                        borderWidth: 1,
                        callbacks: {
                            label: function (context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.chart._metasets[context.datasetIndex].total;
                                const percentage = Math.round((value / total) * 100) + '%';
                                return `${label}: ${value} នាក់ (${percentage})`;
                            }
                        }
                    }
                }
            }
        });
    }


    // Enrollment Chart
    const ctxEnrollment = document.getElementById('enrollmentChart');
    if (ctxEnrollment) {
        enrollmentChartInstance = new Chart(ctxEnrollment, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'សិស្សចុះឈ្មោះថ្មី (New Enrolments)',
                    data: [],
                    borderColor: 'rgba(255, 105, 180, 1)', // Pink
                    backgroundColor: 'rgba(255, 105, 180, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: 'rgba(255, 105, 180, 1)',
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { precision: 0 }
                    }
                }
            }
        });
    }
}

function updateDashboardCharts(studentsData, transactionsData) {
    if (!studentsData && !transactionsData) return;

    // Hook: Student Level Breakdown Chart
    if (typeof window.updateStudentLevelChart === 'function' && studentsData) {
        window.updateStudentLevelChart(studentsData);
    }

    // Cache data for filtering
    if (transactionsData) {
        cachedTransactionsData = transactionsData;
    }

    // 1. Process Student Distribution
    if (studentsData) {
        let fulltime = 0, parttime = 0, kindergarten = 0;
        Object.values(studentsData).forEach(s => {
            if (!s || (s.enrollmentStatus && s.enrollmentStatus === 'dropout')) return;
            const type = (s.studyType || s.courseType || '').toLowerCase();
            const program = (s.studyProgram || '').toLowerCase();

            if (type.includes('3_languages') || type.includes('three-languages') || program.includes('three-languages') || type.includes('one-language') || type.includes('two-languages')) {
                kindergarten++;
            } else if (type === 'cfulltime' || type === 'chinese-fulltime' || type === 'efulltime' || type === 'english-fulltime') {
                fulltime++;
            } else {
                parttime++;
            }
        });

        if (studentDistributionChartInstance) {
            studentDistributionChartInstance.data.datasets[0].data = [fulltime, parttime, kindergarten];
            studentDistributionChartInstance.update();
        }
    }

    // Prepare helper for months
    const monthCounts = {};
    const months = [];
    const today = new Date();

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('en-US', { month: 'short' });
        monthCounts[key] = 0;
        months.push({ key, label });
    }

    // 2. Process Enrollment Trends (Last 6 Months)
    if (studentsData) {
        Object.values(studentsData).forEach(s => {
            if (!s || !s.registrationDate) return;
            try {
                const regDate = new Date(s.registrationDate);
                const key = `${regDate.getFullYear()}-${String(regDate.getMonth() + 1).padStart(2, '0')}`;
                if (monthCounts[key] !== undefined) {
                    monthCounts[key]++;
                }
            } catch (e) { }
        });

        if (enrollmentChartInstance) {
            enrollmentChartInstance.data.labels = months.map(m => m.label);
            enrollmentChartInstance.data.datasets[0].data = months.map(m => monthCounts[m.key]);
            enrollmentChartInstance.update();
        }
    }

    // 3. Process Financial Overview (Default Filter)
    updateFinancialChartFilter();
}

function updateFinancialChartFilter() {
    if (!cachedTransactionsData) return;

    const filter = document.getElementById('financialChartFilter') ? document.getElementById('financialChartFilter').value : '6_months';
    const transactionsData = cachedTransactionsData;

    let months = [];
    const financialData = {};
    const today = new Date();
    const khmerMonths = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];

    if (filter === 'year') {
        // Show all months of current year
        for (let i = 0; i < 12; i++) {
            const d = new Date(today.getFullYear(), i, 1);
            // Skip future months? No, show full year for comparison
            if (d > today && d.getMonth() > today.getMonth()) continue;

            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const label = month;
            months.push({ key, label });
            financialData[key] = { income: 0, expense: 0 };
        }
    } else {
        // Default: Last 6 Months
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const label = month;
            months.push({ key, label });
            financialData[key] = { income: 0, expense: 0 };
        }
    }

    // Populate Data
    Object.values(transactionsData).forEach(t => {
        if (!t || !t.date) return;
        try {
            const date = new Date(t.date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (financialData[key]) {
                const amount = parseFloat(t.amount) || 0;
                if (t.type === 'income') {
                    financialData[key].income += amount;
                } else if (t.type === 'expense') {
                    financialData[key].expense += amount;
                }
            }
        } catch (e) { }
    });

    if (financialChartInstance) {
        financialChartInstance.data.labels = months.map(m => m.label);
        financialChartInstance.data.datasets[0].data = months.map(m => financialData[m.key].income);
        financialChartInstance.data.datasets[1].data = months.map(m => financialData[m.key].expense);
        financialChartInstance.update();
    }
}

// ========================================================
// 9. GLOBAL EXPORTS & EVENT HANDLERS
// ========================================================

window.initializeDashboard = initializeDashboard;
window.loadAllData = loadAllData;
window.cleanupDashboard = cleanupDashboard;
window.updateFinancialChartFilter = updateFinancialChartFilter; // Expose for HTML onchange
// window.switchNotificationTab = switchNotificationTab; // Handled internally via event listeners now

window.dashboard = {
    initialize: initializeDashboard,
    loadData: loadAllData,
    cleanup: cleanupDashboard,
    refresh: () => {
        console.log('Manual refresh requested');
        loadAllData();
    },
    utils: {
        formatCurrency,
        formatNumber,
        getStudentGender,
        formatDate
    }
};

document.addEventListener('DOMContentLoaded', function () {
    console.log('📄 DOM fully loaded');

    initializeNotificationPopover();

    const shouldInitialize = document.getElementById('totalFulltimeStudents') ||
        document.querySelector('[data-dashboard="true"]');

    if (shouldInitialize) {
        console.log('⏳ Waiting for Firebase Authentication...');
        
        // Rely on Firebase Auth state to trigger initialization
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                if (!window.dashboardInitialized) {
                    console.log('✅ Auth confirmed (' + user.email + '). Initializing dashboard...');
                    try {
                        initializeDashboard();
                        updateLastUpdatedTime();
                        window.dashboardInitialized = true;
                        
                        // Start the time update interval if not already started
                        if (!window.timeUpdateInterval) {
                            window.timeUpdateInterval = setInterval(updateLastUpdatedTime, 1000);
                        }
                    } catch (error) {
                        console.error('Failed to initialize dashboard:', error);
                        showMessage(`កំហុសក្នុងការចាប់ផ្តើមផ្ទាំងគ្រប់គ្រង: ${error.message}`, 'danger');
                    }
                }
            } else {
                // Not authenticated. Redirect is handled by auth-check.js
                // We just log it here for debugging purposes without warning
                console.log('Dashboard: No authenticated user found.');
            }
        });
    }
});

window.addEventListener('beforeunload', cleanupDashboard);

document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
        cleanupDashboard();
    }
});

document.addEventListener('click', function (event) {
    if (event.target.matches('[data-refresh-dashboard]')) {
        event.preventDefault();
        loadAllData();
        showMessage('កំពុងធ្វើបច្ចុប្បន្នភាពទិន្នន័យ...', 'info');
    }
});

window.addEventListener('error', function (event) {
    if (event.message.includes('initializeDashboard')) {
        console.error('Dashboard initialization error:', event.error);
        showMessage('កំហុសក្នុងការចាប់ផ្តើមផ្ទាំងគ្រប់គ្រង។ សូមផ្ទុកទំព័រម្តងទៀត។', 'danger');
    }
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeDashboard,
        loadAllData,
        cleanupDashboard,
        updateStudentStats,
        updatePaymentStats,
        updateStaffStats,
        updateExpenseStats,
        formatCurrency,
        formatNumber,
        getUpcomingPaymentStudents,
        getUnpaidBoardingStudents,
        getStudentGender,
        updateNotificationSystem,
        updateFinancialChartFilter
    };
}

console.log('✅ dashboard-stats.js loaded successfully');

