/**
 * dashboard-calendar-chart.js
 * Component for Student Level Breakdown Column Chart and School Calendar & Events
 */

(function () {
    // ========================================================
    // 1. KHMER CONSTANTS & LOCALIZATION HELPERS
    // ========================================================
    const KHMER_MONTHS = [
        'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
        'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
    ];

    const KHMER_DAYS_OF_WEEK = [
        'អាទិត្យ', 'ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'
    ];

    function toKhmerNum(num) {
        if (num === null || num === undefined) return '';
        const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
        return num.toString().replace(/[0-9]/g, d => khmerDigits[d]);
    }

    function formatKhmerFullDate(date) {
        if (!(date instanceof Date) || isNaN(date.getTime())) date = new Date();
        const dayOfWeek = KHMER_DAYS_OF_WEEK[date.getDay()];
        const day = toKhmerNum(date.getDate());
        const month = KHMER_MONTHS[date.getMonth()];
        const year = toKhmerNum(date.getFullYear());
        return `ថ្ងៃ${dayOfWeek} ទី${day} ខែ${month} ឆ្នាំ${year}`;
    }

    function toISODate(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    // ========================================================
    // 2. STUDENT LEVEL COLUMN CHART
    // ========================================================
    let studentLevelBarChartInstance = null;
    let currentLevelChartMode = 'grouped'; // 'grouped' | 'stacked' | 'total'
    let cachedStudentsData = null;

    window.setLevelChartMode = function (mode) {
        currentLevelChartMode = mode;
        document.querySelectorAll('.level-chart-mode-btn').forEach(btn => {
            if (btn.getAttribute('data-mode') === mode) {
                btn.classList.add('active');
                btn.classList.remove('text-muted');
            } else {
                btn.classList.remove('active');
                btn.classList.add('text-muted');
            }
        });

        if (cachedStudentsData) {
            renderStudentLevelChart(cachedStudentsData);
        }
    };

    function initStudentLevelChart() {
        const canvas = document.getElementById('studentLevelBarChart');
        if (!canvas) return;

        // If instance already exists, do not recreate
        if (studentLevelBarChartInstance) {
            return studentLevelBarChartInstance;
        }

        // If Chart.js already tracks a chart on this canvas, destroy it cleanly first
        if (typeof Chart !== 'undefined' && typeof Chart.getChart === 'function') {
            const existingChart = Chart.getChart(canvas);
            if (existingChart) {
                existingChart.destroy();
            }
        }

        const ctx = canvas.getContext('2d');
        studentLevelBarChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                        titleColor: '#1e293b',
                        bodyColor: '#475569',
                        titleFont: { family: "'Kantumruy Pro', sans-serif", size: 13, weight: 'bold' },
                        bodyFont: { family: "'Kantumruy Pro', sans-serif", size: 12 },
                        borderColor: '#e2e8f0',
                        borderWidth: 1,
                        padding: 12,
                        boxPadding: 6,
                        usePointStyle: true,
                        callbacks: {
                            label: function (context) {
                                const datasetLabel = context.dataset.label || '';
                                const value = context.parsed.y || 0;
                                return ` ${datasetLabel}: ${value} នាក់`;
                            },
                            footer: function (tooltipItems) {
                                let total = 0;
                                tooltipItems.forEach(item => {
                                    total += item.parsed.y || 0;
                                });
                                return `សរុបទាំងអស់: ${total} នាក់`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            font: { family: "'Kantumruy Pro', sans-serif", size: 11, weight: '600' },
                            color: '#475569'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        suggestedMax: 100,
                        border: { display: false },
                        grid: {
                            color: 'rgba(226, 232, 240, 0.7)',
                            drawBorder: false,
                            borderDash: [4, 4]
                        },
                        ticks: {
                            font: { family: "sans-serif", size: 11 },
                            color: '#94a3b8',
                            stepSize: 25
                        }
                    }
                }
            }
        });

        // Initial render if cache is available
        if (cachedStudentsData) {
            renderStudentLevelChart(cachedStudentsData);
        }
    }

    function renderStudentLevelChart(studentsData) {
        if (!studentLevelBarChartInstance) {
            initStudentLevelChart();
            if (!studentLevelBarChartInstance) return;
        }

        cachedStudentsData = studentsData;

        // Group by Study Level
        const levelMap = {};
        let totalBoys = 0;
        let totalGirls = 0;
        let totalStudents = 0;

        if (studentsData && typeof studentsData === 'object') {
            Object.values(studentsData).forEach(student => {
                if (!student) return;
                // Exclude dropouts
                const status = (student.enrollmentStatus || '').toString().toLowerCase();
                if (status === 'dropout') return;

                const level = (student.studyLevel || student.level || student.className || 'ថ្នាក់ក្រៅ').toString().trim() || 'ថ្នាក់ក្រៅ';
                const gender = (student.gender || student.sex || '').toString().trim();

                const isGirl = gender === 'ស្រី' || gender.toLowerCase() === 'female' || gender.toLowerCase() === 'f';
                const isBoy = !isGirl; // default to boy if not girl

                if (!levelMap[level]) {
                    levelMap[level] = { boys: 0, girls: 0, total: 0 };
                }

                if (isGirl) {
                    levelMap[level].girls++;
                    totalGirls++;
                } else {
                    levelMap[level].boys++;
                    totalBoys++;
                }
                levelMap[level].total++;
                totalStudents++;
            });
        }

        // If no data or 0 students, provide standard placeholder categories
        if (Object.keys(levelMap).length === 0) {
            levelMap['ថ្នាក់ក្រៅ'] = { boys: 0, girls: 0, total: 0 };
        }

        const labels = Object.keys(levelMap);
        const boysData = labels.map(l => levelMap[l].boys);
        const girlsData = labels.map(l => levelMap[l].girls);
        const totalsData = labels.map(l => levelMap[l].total);

        // Update header badges & legends
        const boysEl = document.getElementById('levelBoysTotal');
        const girlsEl = document.getElementById('levelGirlsTotal');
        const totalPillEl = document.getElementById('levelChartTotalPill');

        const girlsPercentage = totalStudents > 0 ? Math.round((totalGirls / totalStudents) * 100) : 0;

        if (boysEl) boysEl.textContent = `${totalBoys} នាក់`;
        if (girlsEl) girlsEl.textContent = `${totalGirls} នាក់ (${girlsPercentage}%)`;
        if (totalPillEl) totalPillEl.textContent = `សរុប ${totalStudents} នាក់`;

        // Update Chart Datasets according to mode
        const isStacked = currentLevelChartMode === 'stacked';
        studentLevelBarChartInstance.options.scales.x.stacked = isStacked;
        studentLevelBarChartInstance.options.scales.y.stacked = isStacked;

        if (currentLevelChartMode === 'total') {
            studentLevelBarChartInstance.data.datasets = [{
                label: 'សិស្សសរុប (Total)',
                data: totalsData,
                backgroundColor: '#3b82f6',
                borderRadius: 8,
                barPercentage: 0.5,
                categoryPercentage: 0.7
            }];
        } else {
            studentLevelBarChartInstance.data.datasets = [
                {
                    label: 'សិស្សប្រុស (Boys)',
                    data: boysData,
                    backgroundColor: '#0284c7',
                    borderRadius: isStacked ? { topLeft: 0, topRight: 0, bottomLeft: 4, bottomRight: 4 } : 8,
                    barPercentage: isStacked ? 0.5 : 0.6,
                    categoryPercentage: 0.7
                },
                {
                    label: 'សិស្សស្រី (Girls)',
                    data: girlsData,
                    backgroundColor: '#f43f5e',
                    borderRadius: 8,
                    barPercentage: isStacked ? 0.5 : 0.6,
                    categoryPercentage: 0.7
                }
            ];
        }

        // Generate multi-line label showing Level name and count
        studentLevelBarChartInstance.data.labels = labels.map(l => [
            `⏰ ${l}`,
            levelMap[l].total > 0 ? `${levelMap[l].total} នាក់` : '0 នាក់'
        ]);

        // Adjust suggested max
        const maxVal = Math.max(...totalsData, 0);
        studentLevelBarChartInstance.options.scales.y.suggestedMax = maxVal > 100 ? Math.ceil(maxVal * 1.2) : 100;

        studentLevelBarChartInstance.update();
    }

    // Expose update hook for dashboard.js
    window.updateStudentLevelChart = function (studentsData) {
        renderStudentLevelChart(studentsData);
    };

    window.initStudentLevelChart = initStudentLevelChart;

    // ========================================================
    // 3. SCHOOL CALENDAR & EVENTS COMPONENT
    // ========================================================
    const now = new Date();
    let calCurrentYear = now.getFullYear();
    let calCurrentMonth = now.getMonth(); // 0 to 11
    let calSelectedDate = toISODate(now); // YYYY-MM-DD
    let cachedCalendarEvents = {};

    function initCalendarEventsFirebase() {
        if (typeof firebase === 'undefined' || !firebase.database) return;
        const eventsRef = firebase.database().ref('calendarEvents');
        eventsRef.on('value', snapshot => {
            cachedCalendarEvents = snapshot.val() || {};
            renderCalendar();
            renderSelectedDayEvents();
        });
    }

    window.navigateCalendarMonth = function (offset) {
        calCurrentMonth += offset;
        if (calCurrentMonth < 0) {
            calCurrentMonth = 11;
            calCurrentYear--;
        } else if (calCurrentMonth > 11) {
            calCurrentMonth = 0;
            calCurrentYear++;
        }
        renderCalendar();
    };

    window.jumpCalendarToToday = function () {
        const today = new Date();
        calCurrentYear = today.getFullYear();
        calCurrentMonth = today.getMonth();
        calSelectedDate = toISODate(today);
        renderCalendar();
        renderSelectedDayEvents();
    };

    window.selectCalendarDate = function (isoDate) {
        calSelectedDate = isoDate;
        renderCalendar();
        renderSelectedDayEvents();
    };

    function renderCalendar() {
        const titleEl = document.getElementById('calendarMonthYearTitle');
        const gridBody = document.getElementById('calendarGridBody');
        if (!gridBody) return;

        // Title: e.g. "ខែតុលា ឆ្នាំ២០២៦"
        if (titleEl) {
            titleEl.textContent = `ខែ${KHMER_MONTHS[calCurrentMonth]} ឆ្នាំ${toKhmerNum(calCurrentYear)}`;
        }

        gridBody.innerHTML = '';

        const todayISO = toISODate(new Date());

        // First day of month & Total days in current month
        const firstDayOfMonth = new Date(calCurrentYear, calCurrentMonth, 1).getDay(); // 0=Sun, 1=Mon...
        const totalDaysInMonth = new Date(calCurrentYear, calCurrentMonth + 1, 0).getDate();

        // Days in previous month
        const totalDaysInPrevMonth = new Date(calCurrentYear, calCurrentMonth, 0).getDate();

        // Total grid cells: 5 rows (35) or 6 rows (42)
        const totalCells = (firstDayOfMonth + totalDaysInMonth) > 35 ? 42 : 35;

        for (let i = 0; i < totalCells; i++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-day-cell';

            let cellDate;
            let isCurrentMonth = true;

            if (i < firstDayOfMonth) {
                // Previous month padding
                const prevDayNum = totalDaysInPrevMonth - (firstDayOfMonth - 1 - i);
                cellDate = new Date(calCurrentYear, calCurrentMonth - 1, prevDayNum);
                isCurrentMonth = false;
                cell.classList.add('is-other-month');
            } else if (i >= firstDayOfMonth + totalDaysInMonth) {
                // Next month padding
                const nextDayNum = i - (firstDayOfMonth + totalDaysInMonth) + 1;
                cellDate = new Date(calCurrentYear, calCurrentMonth + 1, nextDayNum);
                isCurrentMonth = false;
                cell.classList.add('is-other-month');
            } else {
                // Current month day
                const dayNum = i - firstDayOfMonth + 1;
                cellDate = new Date(calCurrentYear, calCurrentMonth, dayNum);
            }

            const isoDate = toISODate(cellDate);
            const isSunday = (i % 7 === 0);

            if (isSunday) cell.classList.add('is-sunday');
            if (isoDate === todayISO) cell.classList.add('is-today');
            if (isoDate === calSelectedDate) cell.classList.add('is-selected');

            // Day number in Khmer numeral
            const numberSpan = document.createElement('span');
            numberSpan.textContent = toKhmerNum(cellDate.getDate());
            cell.appendChild(numberSpan);

            // Check events on this date
            const dayEvents = getEventsForDate(isoDate);
            if (dayEvents.length > 0) {
                const dotsContainer = document.createElement('div');
                dotsContainer.className = 'event-dots-container';

                // Up to 3 dots
                dayEvents.slice(0, 3).forEach(ev => {
                    const dot = document.createElement('span');
                    dot.className = `event-dot event-dot-${ev.type || 'event'}`;
                    dotsContainer.appendChild(dot);
                });

                cell.appendChild(dotsContainer);
            }

            // Click listener
            cell.addEventListener('click', () => {
                selectCalendarDate(isoDate);
            });

            gridBody.appendChild(cell);
        }
    }

    function getEventsForDate(isoDate) {
        const events = [];
        Object.entries(cachedCalendarEvents).forEach(([id, ev]) => {
            if (ev && ev.date === isoDate) {
                events.push({ id, ...ev });
            }
        });
        return events;
    }

    function renderSelectedDayEvents() {
        const headerEl = document.getElementById('selectedDateHeader');
        const listEl = document.getElementById('selectedDateEventsList');
        if (!listEl) return;

        const selectedDateObj = new Date(calSelectedDate + 'T00:00:00');
        if (headerEl) {
            headerEl.textContent = formatKhmerFullDate(selectedDateObj);
        }

        const events = getEventsForDate(calSelectedDate);

        if (events.length === 0) {
            listEl.innerHTML = `
                <div class="text-center py-3">
                    <p class="text-muted small mb-2">
                        ✨ មិនទាន់មានព្រឹត្តិការណ៍ក្នុងថ្ងៃនេះទេ
                    </p>
                    <button type="button" class="btn btn-sm btn-outline-primary rounded-pill px-3 fw-bold" onclick="openCreateEventModal('${calSelectedDate}')">
                        <i class="fi fi-rr-plus me-1"></i>បង្កើតព្រឹត្តិការណ៍សម្រាប់ថ្ងៃនេះ
                    </button>
                </div>
            `;
        } else {
            const typeLabels = {
                'holiday': 'ថ្ងៃឈប់សម្រាក',
                'event': 'ព្រឹត្តិការណ៍សាលា',
                'exam': 'ការប្រឡង',
                'meeting': 'កិច្ចប្រជុំ'
            };

            let html = '';
            events.forEach(ev => {
                const badgeLabel = typeLabels[ev.type] || 'ព្រឹត្តិការណ៍';
                html += `
                    <div class="calendar-event-item">
                        <div class="me-2">
                            <div class="d-flex align-items-center gap-2 mb-1">
                                <span class="calendar-event-badge ${ev.type || 'event'}">${badgeLabel}</span>
                                <h6 class="fw-bold mb-0 text-dark" style="font-size: 0.9rem;">${escapeHtml(ev.title)}</h6>
                            </div>
                            ${ev.description ? `<p class="text-muted small mb-0">${escapeHtml(ev.description)}</p>` : ''}
                        </div>
                        <button type="button" class="btn btn-sm btn-light text-danger rounded-circle p-1" title="លុបព្រឹត្តិការណ៍" onclick="deleteCalendarEvent('${ev.id}')">
                            <i class="fi fi-rr-trash"></i>
                        </button>
                    </div>
                `;
            });
            listEl.innerHTML = html;
        }
    }

    function escapeHtml(text) {
        if (!text) return '';
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.toString().replace(/[&<>"']/g, m => map[m]);
    }

    // ========================================================
    // 4. EVENT MODAL OPERATIONS (CREATE / DELETE / YEAR VIEW)
    // ========================================================
    window.openCreateEventModal = function (prefilledDate) {
        const targetDate = prefilledDate || calSelectedDate || toISODate(new Date());
        const dateInput = document.getElementById('calEventDate');
        const titleInput = document.getElementById('calEventTitle');
        const descInput = document.getElementById('calEventDesc');

        if (dateInput) dateInput.value = targetDate;
        if (titleInput) titleInput.value = '';
        if (descInput) descInput.value = '';

        const modalEl = document.getElementById('calendarEventModal');
        if (modalEl && window.bootstrap) {
            const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
            modal.show();
        }
    };

    window.saveCalendarEvent = async function (e) {
        if (e) e.preventDefault();

        const date = document.getElementById('calEventDate')?.value;
        const title = document.getElementById('calEventTitle')?.value?.trim();
        const type = document.getElementById('calEventType')?.value || 'event';
        const description = document.getElementById('calEventDesc')?.value?.trim() || '';

        if (!date || !title) {
            if (window.Swal) {
                Swal.fire({
                    icon: 'warning',
                    title: 'ព័ត៌មានមិនពេញលេញ',
                    text: 'សូមបញ្ចូលកាលបរិច្ឆេទ និងចំណងជើងព្រឹត្តិការណ៍!'
                });
            } else {
                alert('សូមបញ្ចូលកាលបរិច្ឆេទ និងចំណងជើងព្រឹត្តិការណ៍!');
            }
            return;
        }

        const saveBtn = document.getElementById('calEventSaveBtn');
        if (window.setButtonLoading) setButtonLoading(saveBtn, true, 'កំពុងរក្សាទុក...');

        try {
            const user = firebase.auth().currentUser;
            const eventPayload = {
                date,
                title,
                type,
                description,
                createdAt: new Date().toISOString(),
                createdBy: user ? user.email : 'system'
            };

            await firebase.database().ref('calendarEvents').push(eventPayload);

            const modalEl = document.getElementById('calendarEventModal');
            if (modalEl && window.bootstrap) {
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
            }

            // Update selected date to the newly created event date
            calSelectedDate = date;
            const newDateObj = new Date(date + 'T00:00:00');
            calCurrentMonth = newDateObj.getMonth();
            calCurrentYear = newDateObj.getFullYear();
            renderCalendar();
            renderSelectedDayEvents();

            if (window.Swal) {
                Swal.fire({
                    icon: 'success',
                    title: 'ជោគជ័យ!',
                    text: 'ព្រឹត្តិការណ៍ត្រូវបានរក្សាទុកដោយជោគជ័យ។',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
        } catch (error) {
            console.error('Failed to save event:', error);
            if (window.Swal) {
                Swal.fire({
                    icon: 'error',
                    title: 'មានបញ្ហា!',
                    text: 'មិនអាចរក្សាទុកព្រឹត្តិការណ៍បានទេ៖ ' + error.message
                });
            } else {
                alert('មានបញ្ហា៖ ' + error.message);
            }
        } finally {
            if (window.setButtonLoading) setButtonLoading(saveBtn, false);
        }
    };

    window.deleteCalendarEvent = async function (id) {
        if (!id) return;

        const confirmDelete = window.Swal ? (await Swal.fire({
            title: 'លុបព្រឹត្តិការណ៍?',
            text: 'តើអ្នកប្រាកដជាចង់លុបព្រឹត្តិការណ៍នេះមែនទេ?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'បាទ/ចាស លុប',
            cancelButtonText: 'បោះបង់'
        })).isConfirmed : confirm('តើអ្នកប្រាកដជាចង់លុបព្រឹត្តិការណ៍នេះមែនទេ?');

        if (confirmDelete) {
            try {
                await firebase.database().ref(`calendarEvents/${id}`).remove();
                if (window.Swal) {
                    Swal.fire({
                        icon: 'success',
                        title: 'បានលុប!',
                        text: 'ព្រឹត្តិការណ៍ត្រូវបានលុបរួចរាល់។',
                        timer: 1500,
                        showConfirmButton: false
                    });
                }
            } catch (err) {
                console.error(err);
                alert('កំហុសក្នុងការលុប៖ ' + err.message);
            }
        }
    };

    window.openFullYearSchedule = function (e) {
        if (e) e.preventDefault();

        const container = document.getElementById('fullYearScheduleBody');
        const yearTitle = document.getElementById('fullYearScheduleTitle');
        if (yearTitle) yearTitle.textContent = `កាលវិភាគពេញមួយឆ្នាំ ${toKhmerNum(calCurrentYear)}`;

        if (container) {
            const allEvents = Object.entries(cachedCalendarEvents)
                .map(([id, ev]) => ({ id, ...ev }))
                .filter(ev => ev.date && ev.date.startsWith(`${calCurrentYear}-`))
                .sort((a, b) => a.date.localeCompare(b.date));

            if (allEvents.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-5 text-muted">
                        <i class="fi fi-rr-calendar-xmark fs-2 mb-2 d-block opacity-50"></i>
                        មិនទាន់មានព្រឹត្តិការណ៍ណាមួយក្នុងឆ្នាំ ${toKhmerNum(calCurrentYear)} នេះនៅឡើយទេ។
                    </div>
                `;
            } else {
                const typeLabels = {
                    'holiday': 'ថ្ងៃឈប់សម្រាក',
                    'event': 'ព្រឹត្តិការណ៍សាលា',
                    'exam': 'ការប្រឡង',
                    'meeting': 'កិច្ចប្រជុំ'
                };

                let html = `
                    <div class="table-responsive">
                        <table class="table table-hover align-middle">
                            <thead class="table-light">
                                <tr>
                                    <th>កាលបរិច្ឆេទ</th>
                                    <th>ប្រភេទ</th>
                                    <th>ចំណងជើងព្រឹត្តិការណ៍</th>
                                    <th>ការពិពណ៌នា</th>
                                </tr>
                            </thead>
                            <tbody>
                `;

                allEvents.forEach(ev => {
                    const dateObj = new Date(ev.date + 'T00:00:00');
                    const formatted = formatKhmerFullDate(dateObj);
                    const badgeLabel = typeLabels[ev.type] || 'ព្រឹត្តិការណ៍';
                    html += `
                        <tr>
                            <td class="fw-bold text-nowrap">${formatted}</td>
                            <td><span class="calendar-event-badge ${ev.type || 'event'}">${badgeLabel}</span></td>
                            <td class="fw-bold text-dark">${escapeHtml(ev.title)}</td>
                            <td class="text-muted small">${escapeHtml(ev.description || '-')}</td>
                        </tr>
                    `;
                });

                html += `</tbody></table></div>`;
                container.innerHTML = html;
            }
        }

        const modalEl = document.getElementById('yearScheduleModal');
        if (modalEl && window.bootstrap) {
            const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
            modal.show();
        }
    };

    // ========================================================
    // 5. INITIALIZATION
    // ========================================================
    function initialize() {
        initStudentLevelChart();
        renderCalendar();
        renderSelectedDayEvents();
        initCalendarEventsFirebase();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
