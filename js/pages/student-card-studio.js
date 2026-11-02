/**
 * ==========================================================================
 * Official Cambodian MoEYS Student ID Card Studio (js/pages/student-card-studio.js)
 * High-Precision Replica of the Official Ministry of Education Student ID Card Studio
 * ==========================================================================
 */

(function () {
    'use strict';

    // Studio Configuration & State
    const defaultConfig = {
        selectedTheme: 'tianxin',
        cardTemplate: 'tianxin', // 'tianxin' (stunden-card.png) | 'moeys'
        showOuterBorder: false,
        showStampAndSign: false,
        customStampUrl: null,
        customBgUrl: 'img/stunden-card.png',
        schoolName: '+855 10 688 800',
        lunarDate: 'ថ្ងៃ ពុធ ទី ២១ ខែ តុលា ព.ស ២៥៧០',
        solarDate: 'ថ្ងៃទី ២១ ខែ តុលា ឆ្នាំ ២០២៦',
        academicYear: '២០២៦-២០២៧',
        
        fieldStyles: {
            studentId: { color: '#0f172a', font: "'Poppins', sans-serif", size: 14.5, bold: true, italic: false },
            nameKh: { color: '#0f172a', font: "'Kantumruy Pro', sans-serif", size: 15.5, bold: true, italic: false },
            nameCh: { color: '#0f172a', font: "'Noto Sans SC', sans-serif", size: 15.5, bold: true, italic: false },
            genderKh: { color: '#1e293b', font: "'Kantumruy Pro', sans-serif", size: 14.5, bold: true, italic: false },
            genderZh: { color: '#1e293b', font: "'Noto Sans SC', sans-serif", size: 14.5, bold: true, italic: false },
            phone: { color: '#0f172a', font: "'Poppins', sans-serif", size: 14.0, bold: true, italic: false },
            date: { color: '#0f172a', font: "'Poppins', sans-serif", size: 13.5, bold: true, italic: false }
        },
        layerOffsets: {
            photoFrame: { x: 0, y: 0, scale: 1.0 },
            nameKh: { x: 0, y: 0, scale: 1.0 },
            nameCh: { x: 0, y: 0, scale: 1.0 },
            genderKh: { x: 0, y: 0, scale: 1.0 },
            genderZh: { x: 0, y: 0, scale: 1.0 },
            phone: { x: 0, y: 0, scale: 1.0 },
            date: { x: 0, y: 0, scale: 1.0 },
            studentId: { x: 0, y: 0, scale: 1.0 },
            stampSignature: { x: 0, y: 0, scale: 1.0 },
            cardTitle: { x: 0, y: 0, scale: 1.0 },
            nationalHeader: { x: 0, y: 0, scale: 1.0 },
            studentInfo: { x: 0, y: 0, scale: 1.0 },
            academicYear: { x: 0, y: 0, scale: 1.0 },
            schoolLogo: { x: 0, y: 0, scale: 1.0 },
            datesAuthority: { x: 0, y: 0, scale: 1.0 }
        }
    };

    // Load persisted state or use default
    let studioConfig = { ...defaultConfig };
    try {
        const saved = localStorage.getItem('tx_official_card_studio_config');
        if (saved) {
            const parsed = JSON.parse(saved);
            studioConfig = { 
                ...defaultConfig, 
                ...parsed, 
                fieldStyles: { ...defaultConfig.fieldStyles, ...(parsed.fieldStyles || {}) },
                layerOffsets: { ...defaultConfig.layerOffsets, ...(parsed.layerOffsets || {}) } 
            };
            // Ensure stunden-card is default template if not explicitly set
            if (!parsed.cardTemplate) {
                studioConfig.cardTemplate = 'tianxin';
                studioConfig.selectedTheme = 'tianxin';
                studioConfig.customBgUrl = 'img/stunden-card.png';
            }
        }
    } catch (e) {
        console.warn('Could not load card studio configuration', e);
    }

    // Interactive Drag & Controller State
    let currentStudentKey = null;
    let selectedClass = 'all';
    let searchQuery = '';
    let filteredStudents = [];
    let currentAdjustLayer = 'photoFrame';
    let adjustStep = 5; // 1, 5, 15px
    let dragModeActive = false;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartOffsetX = 0;
    let dragStartOffsetY = 0;

    // Current Category State: 'chinese' | 'parttime' | 'trilingual'
    let currentCategory = 'chinese';

    // 3D Flip & Card Face State ('front' | 'back')
    let isCardFlipped = false;
    let currentCardSide = 'front';
    let activeStudioDockTab = 'info';
    let studioViewMode = 'flip';
    let currentTypoField = 'nameKh';

    /**
     * Category Classification Helpers (matches data-tracking.js)
     */
    function isStudentChineseFullTime(s) {
        if (!s) return false;
        const type = (s.studyType || s.courseType || '').toLowerCase().trim();
        return type === 'cfulltime' ||
            type === 'chinese-fulltime' ||
            type === 'chinese fulltime' ||
            type === 'chinese full-time' ||
            (type.includes('chinese') && (type.includes('fulltime') || type.includes('full-time'))) ||
            type.includes('ភាសាចិនពេញម៉ោង');
    }

    function isStudentTrilingual(s) {
        if (!s) return false;
        const type = (s.studyType || s.courseType || '').toLowerCase().trim();
        const program = (s.studyProgram || '').toLowerCase().trim();
        return type.includes('3_languages') ||
            type.includes('3 languages') ||
            type.includes('៣ ភាសា') ||
            type.includes('៣ភាសា') ||
            type.includes('one-language') ||
            type.includes('two-languages') ||
            type.includes('three-languages') ||
            type.includes('១ភាសា') ||
            type.includes('២ភាសា') ||
            program === 'three-languages' ||
            program === 'one-language' ||
            program === 'two-languages' ||
            program === '3_languages' ||
            type.includes('trilingual');
    }

    function isStudentPartTime(s) {
        return !isStudentChineseFullTime(s) && !isStudentTrilingual(s);
    }

    function getStudentCategoryKey(s) {
        if (!s) return 'chinese';
        if (isStudentChineseFullTime(s)) return 'chinese';
        if (isStudentTrilingual(s)) return 'trilingual';
        return 'parttime';
    }

    function matchesCategory(s, cat) {
        if (cat === 'chinese') return isStudentChineseFullTime(s);
        if (cat === 'parttime') return isStudentPartTime(s);
        if (cat === 'trilingual') return isStudentTrilingual(s);
        return true;
    }

    function getCategoryKhmerName(cat) {
        if (cat === 'chinese') return 'សិស្សចិនពេញម៉ោង';
        if (cat === 'parttime') return 'សិស្សក្រៅម៉ោង';
        if (cat === 'trilingual') return 'ចំណេះទូទៅ';
        return 'គ្រប់ប្រភេទ';
    }

    /**
     * Get list of all students from global cache
     */
    function getAllStudents() {
        if (window.rawStudentsArray && Array.isArray(window.rawStudentsArray) && window.rawStudentsArray.length > 0) {
            return window.rawStudentsArray;
        }
        if (window.allStudentsData && typeof window.allStudentsData === 'object') {
            const arr = Object.keys(window.allStudentsData).map(k => {
                const st = window.allStudentsData[k];
                if (st && !st.key) st.key = k;
                return st;
            }).filter(Boolean);
            if (arr.length > 0) return arr;
        }
        return [];
    }

    function getStudent(key) {
        if (!key) return null;
        let s = null;
        if (window.allStudentsData && window.allStudentsData[key]) {
            s = window.allStudentsData[key];
            if (s && !s.key) s.key = key;
        } else {
            const list = getAllStudents();
            s = list.find(item => item.key === key || item.id === key) || null;
        }
        if (s && (s.key || s.id)) {
            const k = s.key || s.id;
            try {
                const savedOverrides = localStorage.getItem(`tx_student_card_overrides_${k}`);
                if (savedOverrides) {
                    const parsed = JSON.parse(savedOverrides);
                    if (parsed.nameKh !== undefined && s._overrideNameKh === undefined) s._overrideNameKh = parsed.nameKh;
                    if (parsed.nameCh !== undefined && s._overrideNameCh === undefined) s._overrideNameCh = parsed.nameCh;
                    if (parsed.genderKh !== undefined && s._overrideGenderKh === undefined) s._overrideGenderKh = parsed.genderKh;
                    if (parsed.genderZh !== undefined && s._overrideGenderZh === undefined) s._overrideGenderZh = parsed.genderZh;
                    if (parsed.phone !== undefined && s._overridePhone === undefined) s._overridePhone = parsed.phone;
                    if (parsed.joinDate !== undefined && s._overrideDate === undefined) s._overrideDate = parsed.joinDate;
                    if (parsed.studentId !== undefined && s._overrideId === undefined) s._overrideId = parsed.studentId;
                }
                const savedPhoto = localStorage.getItem(`tx_student_card_photo_${k}`);
                if (savedPhoto && s._overridePhotoUrl === undefined) {
                    s._overridePhotoUrl = savedPhoto;
                }
            } catch (e) {}
        }
        return s;
    }

    /**
     * Helper to extract & format full student card information
     */
    function getStudentCardData(s) {
        if (!s) s = {};
        const nameKh = (s._overrideNameKh || `${s.lastName || ''} ${s.firstName || ''}`).trim() || (s.fullName || s.name || '-');
        const nameCh = s._overrideNameCh !== undefined ? s._overrideNameCh : (s.chineseName || `${s.chineseLastName || ''} ${s.chineseFirstName || ''}`.trim() || s.nameChinese || '');
        
        // Gender Khmer & Chinese
        let rawGender = (s._overrideGenderKh !== undefined ? s._overrideGenderKh : (s._overrideGender || s.gender || s.sex || '')).toString().trim();
        let genderKh = 'ប្រុស';
        let genderZh = '男';
        if (rawGender.toLowerCase() === 'female' || rawGender === 'ស្រី' || rawGender === '女' || rawGender.toLowerCase() === 'f') {
            genderKh = 'ស្រី';
            genderZh = '女';
        } else if (rawGender.toLowerCase() === 'male' || rawGender === 'ប្រុស' || rawGender === '男' || rawGender.toLowerCase() === 'm') {
            genderKh = 'ប្រុស';
            genderZh = '男';
        } else if (rawGender) {
            genderKh = rawGender;
            genderZh = '';
        }
        if (s._overrideGenderZh !== undefined) {
            genderZh = s._overrideGenderZh;
        }

        // Guardian Phone
        const phone = s._overridePhone !== undefined ? s._overridePhone : (s.parentPhone || s.guardianPhone || s.phone || s.emergencyPhone || '');

        // Join / Enrollment Date
        let joinDate = s._overrideDate !== undefined ? s._overrideDate : (s.startDate || s.enrollmentDate || s.registerDate || s.joinDate || '');
        if (joinDate && typeof joinDate === 'string' && joinDate.includes('T')) {
            try {
                const d = new Date(joinDate);
                if (!isNaN(d.getTime())) {
                    const day = String(d.getDate()).padStart(2, '0');
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const year = d.getFullYear();
                    joinDate = `${day}/${month}/${year}`;
                }
            } catch (e) {}
        }

        const id = s._overrideId !== undefined ? s._overrideId : (s.displayId || s.id || s.studentId || 'STD-1001');
        const photoUrl = s._overridePhotoUrl || 
                         s.imageUrl || 
                         s.photo || 
                         s.photoUrl || 
                         s.profileImg || 
                         s.ProfileImg || 
                         s.avatar || 
                         s.Photo || 
                         '';
        const cls = s.studyLevel || s.classroom || s.class || '';

        return {
            nameKh,
            nameCh,
            genderKh,
            genderZh,
            phone,
            joinDate,
            id,
            photoUrl,
            class: cls
        };
    }

    /**
     * Entry point: Called when card tab is activated or deep-linked
     */
    window.onStudentCardTabActivated = function (targetKey) {
        const newUrl = 'data-tracking.html?tab=card' + (targetKey ? '&studentKey=' + encodeURIComponent(targetKey) : '');
        if (window.location.search !== (targetKey ? `?tab=card&studentKey=${targetKey}` : '?tab=card')) {
            window.history.replaceState(null, '', newUrl);
        }

        // Highlight sidebar menu
        document.querySelectorAll('#sidebar .nav-link, #sidebar .sub-nav-link').forEach(link => {
            link.classList.remove('active', 'highlighted');
        });
        const cardLink = document.getElementById('nav-sub-studentCard');
        if (cardLink) cardLink.classList.add('active', 'highlighted');

        // Toggle visibility between Card Studio and Main Tracking Table
        const mount = document.getElementById('cardStudioMountPoint');
        const mainSection = document.getElementById('trackingMainSection');
        if (mount) mount.style.display = 'block';
        if (mainSection) mainSection.style.display = 'none';

        window.renderStudentCardStudio(targetKey);
    };

    window.openStudentCardTab = function (targetKey) {
        window.onStudentCardTabActivated(targetKey);
    };

    window.openStudentCardStudio = function (targetKey) {
        window.onStudentCardTabActivated(targetKey);
    };

    window.closeStudentCardStudio = function () {
        const mount = document.getElementById('cardStudioMountPoint');
        const mainSection = document.getElementById('trackingMainSection');
        if (mount) mount.style.display = 'none';
        if (mainSection) mainSection.style.display = 'block';
        window.history.replaceState(null, '', 'data-tracking.html');
        document.querySelectorAll('#sidebar .nav-link, #sidebar .sub-nav-link').forEach(link => {
            link.classList.remove('active', 'highlighted');
        });
        const trackingLink = document.getElementById('nav-tracking') || document.querySelector('a[href="/data-tracking.html"]') || document.querySelector('a[href="data-tracking.html"]');
        if (trackingLink) trackingLink.classList.add('active');
        if (typeof adjustTableColumns === 'function') adjustTableColumns('fullTime');
    };

    /**
     * Render the Official Cambodian MoEYS Card Studio Interface
     */
    window.renderStudentCardStudio = function (targetKey) {
        const mount = document.getElementById('cardStudioMountPoint');
        if (!mount) return;

        const students = getAllStudents();
        if (students.length === 0) {
            mount.innerHTML = `
                <div class="card border-0 shadow-sm rounded-4 p-5 text-center bg-white my-4">
                    <div class="spinner-border text-primary mx-auto mb-3" style="width: 3rem; height: 3rem;"></div>
                    <h5 class="fw-bold text-dark font-moul">កំពុងផ្ទុកទិន្នន័យសិស្ស...</h5>
                    <p class="text-muted small mb-0">សូមរង់ចាំបន្តិច ប្រព័ន្ធកំពុងទាញទិន្នន័យពី Database</p>
                </div>
            `;
            setTimeout(() => {
                if (getAllStudents().length > 0) window.renderStudentCardStudio(targetKey);
            }, 500);
            return;
        }

        // Count students per category
        const chineseCount = students.filter(isStudentChineseFullTime).length;
        const parttimeCount = students.filter(isStudentPartTime).length;
        const trilingualCount = students.filter(isStudentTrilingual).length;
        const savedApiKey = localStorage.getItem('tx_ai_image_api_key') || (window.AI_CONFIG && window.AI_CONFIG.apiKey ? window.AI_CONFIG.apiKey : '');

        // Determine active category & active student
        if (targetKey && getStudent(targetKey)) {
            currentStudentKey = targetKey;
            currentCategory = getStudentCategoryKey(getStudent(targetKey));
        } else if (currentStudentKey && getStudent(currentStudentKey)) {
            currentCategory = getStudentCategoryKey(getStudent(currentStudentKey));
        } else {
            if (chineseCount > 0) currentCategory = 'chinese';
            else if (parttimeCount > 0) currentCategory = 'parttime';
            else currentCategory = 'trilingual';

            const firstCatStudent = students.find(st => matchesCategory(st, currentCategory)) || students[0];
            currentStudentKey = firstCatStudent.key || firstCatStudent.id;
        }

        // Filter students for active category and initial filters
        filteredStudents = students.filter(st => {
            if (!matchesCategory(st, currentCategory)) return false;
            if (selectedClass !== 'all') {
                const c = (st.studyLevel || st.classroom || st.class || '').trim();
                if (c !== selectedClass) return false;
            }
            if (searchQuery) {
                const name = `${st.lastName || ''} ${st.firstName || ''}`.toLowerCase();
                const id = (st.displayId || st.id || '').toLowerCase();
                const phone = (st.parentPhone || st.phone || '').toLowerCase();
                const cls = (st.studyLevel || st.classroom || st.class || '').toLowerCase();
                if (!name.includes(searchQuery) && !id.includes(searchQuery) && !phone.includes(searchQuery) && !cls.includes(searchQuery)) return false;
            }
            return true;
        });

        // Ensure active student exists in category or pick first
        let s = getStudent(currentStudentKey);
        if (!s || !matchesCategory(s, currentCategory)) {
            if (filteredStudents.length > 0) {
                s = filteredStudents[0];
                currentStudentKey = s.key || s.id;
            } else {
                const catOnly = students.filter(st => matchesCategory(st, currentCategory));
                if (catOnly.length > 0) {
                    s = catOnly[0];
                    currentStudentKey = s.key || s.id;
                } else {
                    s = students[0];
                    currentStudentKey = s.key || s.id;
                }
            }
        }

        // Collect class list for ONLY the students in the selected category
        const catStudents = students.filter(st => matchesCategory(st, currentCategory));
        const classSet = new Set();
        catStudents.forEach(st => {
            const c = (st.studyLevel || st.classroom || st.class || '').trim();
            if (c) classSet.add(c);
        });
        const classes = Array.from(classSet).sort();
        const categoryLabel = getCategoryKhmerName(currentCategory);
        const cardData = getStudentCardData(s);

        // Build Studio HTML (Standard Modern Layout 2.0)
        mount.innerHTML = `
            <div class="official-card-studio-wrapper">
                <!-- 1. Modern Header Banner -->
                <div class="studio-header-banner">
                    <div class="studio-header-title-box">
                        <div class="studio-header-icon">
                            <i class="fi fi-rr-id-badge"></i>
                        </div>
                        <div>
                            <h1 class="studio-header-h1">ស្ទូឌីយោកាតសិស្សផ្លូវការ - សាលាអន្តរជាតិធានស៊ីន</h1>
                            <p class="studio-header-p">ប្រព័ន្ធគ្រប់គ្រង និងបោះពុម្ពកាតសិស្សស្តង់ដារ 54 × 83.4 mm (CR80) - ទិដ្ឋភាព 3D Flip & មុខ-ក្រោយ</p>
                        </div>
                    </div>

                    <div class="studio-header-actions">
                        <button class="btn btn-studio-back" onclick="window.closeStudentCardStudio()" title="ត្រឡប់ទៅតារាងសិស្ស">
                            <i class="fi fi-rr-arrow-left me-1"></i>ត្រឡប់ទៅតារាង
                        </button>

                        <!-- Dropdown 1: ទាញយករូបភាព -->
                        <div class="dropdown">
                            <button class="btn btn-export-img dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                <i class="fi fi-rr-picture"></i>
                                <span>ទាញយករូបភាព</span>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end shadow border-0 rounded-3">
                                <li>
                                    <a class="dropdown-item py-2 fw-bold" href="javascript:void(0)" onclick="window.downloadCardAsImage('png')">
                                        <i class="fi fi-rr-download text-success me-2"></i>ទាញយកកាតនេះ (បច្ចុប្បន្ន HD PNG)
                                    </a>
                                </li>
                                <li>
                                    <a class="dropdown-item py-2 fw-bold" href="javascript:void(0)" onclick="window.downloadCardAsImage('png', 'front')">
                                        <i class="fi fi-rr-id-badge text-primary me-2"></i>ទាញយកផ្ទៃខាងមុខ (Front HD PNG)
                                    </a>
                                </li>
                                <li>
                                    <a class="dropdown-item py-2 fw-bold" href="javascript:void(0)" onclick="window.downloadCardAsImage('png', 'back')">
                                        <i class="fi fi-rr-memo text-info me-2"></i>ទាញយកផ្ទៃខាងក្រោយ (Back HD PNG)
                                    </a>
                                </li>
                                <li>
                                    <a class="dropdown-item py-2 fw-bold" href="javascript:void(0)" onclick="window.downloadCardAsImage('png', 'both')">
                                        <i class="fi fi-rr-copy text-danger me-2"></i>ទាញយកទាំងមុខ-ក្រោយ (Front & Back)
                                    </a>
                                </li>
                                <li><hr class="dropdown-divider"></li>
                                <li>
                                    <a class="dropdown-item py-2 fw-bold" href="javascript:void(0)" onclick="window.downloadCardAsImage('jpeg')">
                                        <i class="fi fi-rr-file-image text-secondary me-2"></i>ទាញយកជា JPG
                                    </a>
                                </li>
                            </ul>
                        </div>

                        <!-- Dropdown 2: ទាញយកជា PDF -->
                        <div class="dropdown">
                            <button class="btn btn-export-pdf dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                <i class="fi fi-rr-file-pdf"></i>
                                <span>ទាញយកជា PDF</span>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end shadow border-0 rounded-3">
                                <li>
                                    <a class="dropdown-item py-2 fw-bold" href="javascript:void(0)" onclick="window.downloadCardAsPDF()">
                                        <i class="fi fi-rr-document text-danger me-2"></i>ទាញយកកាតនេះជា PDF (ទំហំកាត 54x83.4mm)
                                    </a>
                                </li>
                                <li>
                                    <a class="dropdown-item py-2 fw-bold" href="javascript:void(0)" onclick="window.downloadCardAsPDF('front')">
                                        <i class="fi fi-rr-id-badge text-primary me-2"></i>ទាញយកផ្ទៃខាងមុខជា PDF
                                    </a>
                                </li>
                                <li>
                                    <a class="dropdown-item py-2 fw-bold" href="javascript:void(0)" onclick="window.downloadCardAsPDF('back')">
                                        <i class="fi fi-rr-memo text-info me-2"></i>ទាញយកផ្ទៃខាងក្រោយជា PDF
                                    </a>
                                </li>
                                <li>
                                    <a class="dropdown-item py-2 fw-bold" href="javascript:void(0)" onclick="window.downloadCardAsPDF('both')">
                                        <i class="fi fi-rr-copy text-danger me-2"></i>ទាញយកទាំងមុខ-ក្រោយ (PDF Duplex 2 ទំព័រ)
                                    </a>
                                </li>
                                <li><hr class="dropdown-divider"></li>
                                <li>
                                    <a class="dropdown-item py-2 fw-bold" href="javascript:void(0)" onclick="window.openBatchPrintCardModal('both')">
                                        <i class="fi fi-rr-layers text-primary me-2"></i>ទាញយកជាក្រដាស A4 (8 កាតក្នុង ១ សន្លឹក)
                                    </a>
                                </li>
                            </ul>
                        </div>

                        <!-- Dropdown 3: បោះពុម្ពកាតសិស្ស -->
                        <div class="dropdown">
                            <button class="btn btn-export-print dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                <i class="fi fi-rr-print"></i>
                                <span>បោះពុម្ពកាតសិស្ស</span>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end shadow border-0 rounded-3">
                                <li>
                                    <a class="dropdown-item py-2 fw-bold" href="javascript:void(0)" onclick="window.printSingleCard()">
                                        <i class="fi fi-rr-print text-primary me-2"></i>បោះពុម្ពកាតនេះ (បច្ចុប្បន្ន)
                                    </a>
                                </li>
                                <li>
                                    <a class="dropdown-item py-2 fw-bold" href="javascript:void(0)" onclick="window.printSingleCard('front')">
                                        <i class="fi fi-rr-id-badge text-success me-2"></i>បោះពុម្ពខាងមុខ (Front Side)
                                    </a>
                                </li>
                                <li>
                                    <a class="dropdown-item py-2 fw-bold" href="javascript:void(0)" onclick="window.printSingleCard('back')">
                                        <i class="fi fi-rr-memo text-info me-2"></i>បោះពុម្ពខាងក្រោយ (Back Side)
                                    </a>
                                </li>
                                <li>
                                    <a class="dropdown-item py-2 fw-bold" href="javascript:void(0)" onclick="window.printSingleCard('both')">
                                        <i class="fi fi-rr-copy text-danger me-2"></i>បោះពុម្ពទាំងមុខក្រោយ (Duplex 2 សន្លឹក)
                                    </a>
                                </li>
                                <li><hr class="dropdown-divider"></li>
                                <li>
                                    <a class="dropdown-item py-2 fw-bold" href="javascript:void(0)" onclick="window.openBatchPrintCardModal('both')">
                                        <i class="fi fi-rr-layers text-primary me-2"></i>បោះពុម្ពជាក្រុម A4 (Batch Print)
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- 2. Category Quick Segmented Bar (Full Width) -->
                <div class="studio-category-bar">
                    <button type="button" class="studio-cat-tab-btn ${currentCategory === 'chinese' ? 'active' : ''}" 
                            id="studioCatBtn-chinese" onclick="window.setStudioCategory('chinese')" title="សិស្សចិនពេញម៉ោង">
                        <span class="fs-5">🇨🇳</span>
                        <span>សិស្សចិនពេញម៉ោង</span>
                        <span class="studio-cat-badge-counter" id="studioCount-chinese">${chineseCount}</span>
                    </button>
                    <button type="button" class="studio-cat-tab-btn ${currentCategory === 'parttime' ? 'active' : ''}" 
                            id="studioCatBtn-parttime" onclick="window.setStudioCategory('parttime')" title="សិស្សក្រៅម៉ោង">
                        <span class="fs-5">⏰</span>
                        <span>សិស្សក្រៅម៉ោង</span>
                        <span class="studio-cat-badge-counter" id="studioCount-parttime">${parttimeCount}</span>
                    </button>
                    <button type="button" class="studio-cat-tab-btn ${currentCategory === 'trilingual' ? 'active' : ''}" 
                            id="studioCatBtn-trilingual" onclick="window.setStudioCategory('trilingual')" title="ចំណេះទូទៅ">
                        <span class="fs-5">🇰🇭</span>
                        <span>ចំណេះទូទៅ</span>
                        <span class="studio-cat-badge-counter" id="studioCount-trilingual">${trilingualCount}</span>
                    </button>
                </div>

                <!-- 3. Studio 2-Column Responsive Workspace Grid -->
                <div class="row g-4 align-items-start">
                    <!-- Left Column: Modern Studio Control Dock (4 Tabs) -->
                    <div class="col-xl-5 col-lg-5">
                        <!-- Modern Studio Dock Tabs Navigation -->
                        <div class="studio-dock-tabs-nav">
                            <button type="button" class="studio-dock-nav-btn ${activeStudioDockTab === 'info' ? 'active' : ''}" data-tab="info" onclick="window.setStudioDockTab('info')">
                                <i class="fi fi-rr-user"></i>
                                <span>ទិន្នន័យសិស្ស</span>
                            </button>
                            <button type="button" class="studio-dock-nav-btn ${activeStudioDockTab === 'typography' ? 'active' : ''}" data-tab="typography" onclick="window.setStudioDockTab('typography')">
                                <i class="fi fi-rr-text"></i>
                                <span>ម៉ូតអក្សរ & ពណ៌</span>
                            </button>
                            <button type="button" class="studio-dock-nav-btn ${activeStudioDockTab === 'theme' ? 'active' : ''}" data-tab="theme" onclick="window.setStudioDockTab('theme')">
                                <i class="fi fi-rr-palette"></i>
                                <span>ស្ទាយ៍ & Theme</span>
                            </button>
                            <button type="button" class="studio-dock-nav-btn ${activeStudioDockTab === 'position' ? 'active' : ''}" data-tab="position" onclick="window.setStudioDockTab('position')">
                                <i class="fi fi-rr-crosshairs"></i>
                                <span>កែទីតាំង D-Pad</span>
                            </button>
                            <button type="button" class="studio-dock-nav-btn ${activeStudioDockTab === 'ai' ? 'active' : ''}" data-tab="ai" onclick="window.setStudioDockTab('ai')">
                                <i class="fi fi-rr-sparkles text-warning"></i>
                                <span>AI Studio</span>
                            </button>
                        </div>

                        <!-- TAB PANE 1: ទិន្នន័យសិស្ស (Student Info & Selection) -->
                        <div class="studio-tab-pane" id="studioTabPane-info" style="${activeStudioDockTab === 'info' ? 'display:block;' : 'display:none;'}">
                            <!-- Select Student Card -->
                            <div class="studio-control-card">
                                <div class="studio-card-title">
                                    <span><i class="fi fi-rr-id-badge me-2 text-primary"></i>ជ្រើសរើសសិស្ស (Select Student)</span>
                                    <span class="studio-count-badge" id="studioBadgeStudentCount">${filteredStudents.length} នាក់</span>
                                </div>

                                <div class="mb-2">
                                    <select class="form-select border-0 bg-light rounded-3 fw-bold text-dark" id="studioClassFilter" onchange="window.onStudioClassFilterChange(this.value)">
                                        <option value="all">🏫 គ្រប់ថ្នាក់ទាំងអស់ (${categoryLabel})</option>
                                        ${classes.map(c => `<option value="${c}" ${c === selectedClass ? 'selected' : ''}>ថ្នាក់: ${c}</option>`).join('')}
                                    </select>
                                </div>

                                <div class="d-flex justify-content-between align-items-center mb-2 px-1">
                                    <span class="small text-muted fw-bold">សកម្មភាពថ្នាក់រៀន:</span>
                                    <span class="class-action-link" onclick="window.downloadClassCards()"><i class="fi fi-rr-bolt me-1"></i>ទាញយកកាតថ្នាក់នេះ</span>
                                </div>

                                <div class="input-group mb-2">
                                    <span class="input-group-text bg-light border-0 text-muted"><i class="fi fi-rr-search"></i></span>
                                    <input type="text" class="form-control border-0 bg-light fw-bold" id="studioSearchStudentInput" 
                                           placeholder="🔍 ស្វែងរកតាមឈ្មោះ, អត្តលេខ (ID)..." oninput="window.onStudioStudentSearch(this.value)">
                                </div>

                                <div class="mb-3">
                                    <select class="form-select border-0 bg-light rounded-3 fw-bold text-primary" id="studioStudentDropdown" onchange="window.selectStudioStudent(this.value)">
                                        ${buildStudentSelectOptions(filteredStudents, currentStudentKey)}
                                    </select>
                                </div>

                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <button class="btn btn-sm btn-outline-secondary rounded-pill px-3 fw-bold" onclick="window.navigateStudioStudent(-1)">
                                        ← សិស្សមុន
                                    </button>
                                    <button class="btn btn-sm btn-outline-secondary rounded-pill px-3 fw-bold" onclick="window.navigateStudioStudent(1)">
                                        សិស្សបន្ទាប់ →
                                    </button>
                                </div>

                                <!-- ជម្រើសទិដ្ឋភាពកាត (Card Side Switcher: ខាងមុខ / ខាងក្រោយ) -->
                                <div class="pt-2 border-top">
                                    <div class="d-flex justify-content-between align-items-center mb-1">
                                        <label class="form-label small fw-bold text-dark mb-0">
                                            <i class="fi fi-rr-exchange me-1 text-primary"></i>ជ្រើសរើសទិដ្ឋភាព (Card Face):
                                        </label>
                                        <span class="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 rounded-pill px-2" style="font-size: 10px;">3D Flip Active</span>
                                    </div>
                                    <div class="btn-group w-100 rounded-3 shadow-xs" role="group">
                                        <button type="button" class="btn btn-sm ${!isCardFlipped ? 'btn-primary' : 'btn-outline-primary'} fw-bold btn-card-side-toggle" data-side="front" onclick="window.setCardSide('front')">
                                            🪪 ផ្ទៃខាងមុខ (Front)
                                        </button>
                                        <button type="button" class="btn btn-sm ${isCardFlipped ? 'btn-primary' : 'btn-outline-primary'} fw-bold btn-card-side-toggle" data-side="back" onclick="window.setCardSide('back')">
                                            🔄 ផ្ទៃខាងក្រោយ (Back)
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Student Info on Card Input Card -->
                            <div class="studio-control-card">
                                <div class="studio-card-title mb-2">
                                    <span><i class="fi fi-rr-edit me-2 text-primary"></i>ព័ត៌មានលើកាតសិស្ស (Student Info on Card)</span>
                                </div>

                                <!-- 1. Khmer Name -->
                                <div class="mb-2">
                                    <label class="form-label small fw-bold text-muted mb-1">
                                        <i class="fi fi-rr-user me-1 text-primary"></i>ឈ្មោះសិស្សជាភាសាខ្មែរ (ឈ្មោះ / Khmer Name)
                                    </label>
                                    <input type="text" class="form-control border bg-light fw-bold text-dark font-battambang" 
                                           id="inputNameKh" value="${cardData.nameKh}" oninput="window.onCardDataInput('nameKh', this.value)">
                                </div>

                                <!-- 2. Chinese Name -->
                                <div class="mb-2">
                                    <label class="form-label small fw-bold text-muted mb-1">
                                        <i class="fi fi-rr-language me-1 text-primary"></i>ឈ្មោះសិស្សជាភាសាចិន (姓名 / Chinese Name)
                                    </label>
                                    <input type="text" class="form-control border bg-light fw-bold text-dark font-poppins" 
                                           id="inputNameCh" value="${cardData.nameCh}" placeholder="ឧ. 苏金华 / មិនមាន" oninput="window.onCardDataInput('nameCh', this.value)">
                                </div>

                                <!-- 3. Gender Khmer & Chinese -->
                                <div class="row g-2 mb-2">
                                    <div class="col-6">
                                        <label class="form-label small fw-bold text-muted mb-1">ភេទ (Khmer)</label>
                                        <input type="text" class="form-control border bg-light fw-bold" 
                                               id="inputGenderKh" value="${cardData.genderKh}" oninput="window.onCardDataInput('genderKh', this.value)">
                                    </div>
                                    <div class="col-6">
                                        <label class="form-label small fw-bold text-muted mb-1">性别 (Chinese)</label>
                                        <input type="text" class="form-control border bg-light fw-bold font-poppins" 
                                               id="inputGenderZh" value="${cardData.genderZh}" oninput="window.onCardDataInput('genderZh', this.value)">
                                    </div>
                                </div>

                                <!-- 4. Guardian Phone -->
                                <div class="mb-2">
                                    <label class="form-label small fw-bold text-muted mb-1">
                                        <i class="fi fi-rr-phone-call me-1 text-primary"></i>លេខអាណាព្យាបាល (Guardian Phone)
                                    </label>
                                    <input type="text" class="form-control border bg-light fw-bold text-primary font-poppins" 
                                           id="inputPhone" value="${cardData.phone}" oninput="window.onCardDataInput('phone', this.value)">
                                </div>

                                <!-- 5. Join Date & Student ID -->
                                <div class="row g-2 mb-3">
                                    <div class="col-6">
                                        <label class="form-label small fw-bold text-muted mb-1">ថ្ងៃខែចូលរៀន</label>
                                        <input type="text" class="form-control border bg-light fw-bold font-poppins" 
                                               id="inputJoinDate" value="${cardData.joinDate}" oninput="window.onCardDataInput('joinDate', this.value)">
                                    </div>
                                    <div class="col-6">
                                        <label class="form-label small fw-bold text-muted mb-1">អត្តលេខ ID</label>
                                        <input type="text" class="form-control border bg-light fw-bold text-danger font-poppins" 
                                               id="inputStudentId" value="${cardData.id}" oninput="window.onCardDataInput('studentId', this.value)">
                                    </div>
                                </div>

                                <div class="d-flex gap-2">
                                    <button type="button" class="btn btn-success flex-fill fw-bold rounded-pill" onclick="window.saveStudioStudentChanges()">
                                        <i class="fi fi-rr-disk me-1"></i>រក្សាទុកការកែប្រែ
                                    </button>
                                    <button type="button" class="btn btn-outline-secondary rounded-pill fw-bold" onclick="window.resetStudentCardToOriginal()" title="កំណត់ដើមវិញ">
                                        <i class="fi fi-rr-refresh"></i>
                                    </button>
                                </div>
                            </div>
                        </div>


                        <!-- TAB PANE: ម៉ូតអក្សរ & ពណ៌ (Typography & Color Customizer) -->
                        <div class="studio-tab-pane" id="studioTabPane-typography" style="${activeStudioDockTab === 'typography' ? 'display:block;' : 'display:none;'}">
                            <div class="studio-control-card">
                                <div class="studio-card-title d-flex justify-content-between align-items-center mb-3">
                                    <span><i class="fi fi-rr-text me-2 text-primary"></i>កែម៉ូតអក្សរ & ពណ៌ (Font & Color)</span>
                                    <button type="button" class="btn btn-sm btn-outline-secondary rounded-pill px-2 fw-bold" onclick="window.resetFieldStylesToDefault()" title="កំណត់ពុម្ពអក្សរដើម">
                                        <i class="fi fi-rr-refresh me-1"></i>កំណត់ដើម
                                    </button>
                                </div>

                                <!-- 1. Field Selector Dropdown -->
                                <div class="mb-3">
                                    <label class="form-label small fw-bold text-muted mb-1">ជ្រើសរើសផ្នែកដែលត្រូវកែម៉ូត (Select Field):</label>
                                    <select class="form-select border-0 bg-light rounded-3 fw-bold text-primary" id="selectTypoField" onchange="window.onTypoFieldChange(this.value)">
                                        <option value="studentId">🆔 អត្តលេខកាត (ID: ...)</option>
                                        <option value="nameKh" selected>👤 ឈ្មោះសិស្សខ្មែរ (Khmer Name)</option>
                                        <option value="nameCh">🀄 ឈ្មោះសិស្សចិន (姓名 / Chinese Name)</option>
                                        <option value="genderKh">⚧ ភេទខ្មែរ (Gender Khmer)</option>
                                        <option value="genderZh">🈳 ភេទចិន (性别 / Gender Chinese)</option>
                                        <option value="phone">📞 លេខអាណាព្យាបាល (Guardian Phone)</option>
                                        <option value="date">📅 ថ្ងៃខែចូលរៀន (Enrollment Date)</option>
                                    </select>
                                </div>

                                <!-- 2. Color Picker & Palette -->
                                <div class="mb-3 p-3 bg-light rounded-3 border">
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <span class="small fw-bold text-dark"><i class="fi fi-rr-palette me-1 text-primary"></i>ពណ៌អក្សរ (Text Color):</span>
                                        <span class="font-poppins fw-bold text-primary small" id="lblTypoColorHex">#0f172a</span>
                                    </div>
                                    <div class="d-flex align-items-center gap-2">
                                        <input type="color" class="form-control form-control-color border-0 rounded-circle" id="inputTypoColor" value="#0f172a" oninput="window.onTypoColorChange(this.value)" style="width: 38px; height: 38px; cursor: pointer;">
                                        <div class="d-flex flex-wrap gap-1 flex-grow-1">
                                            <button type="button" class="color-preset-dot" style="background: #0f172a;" onclick="window.onTypoColorChange('#0f172a')" title="ខ្មៅដិត"></button>
                                            <button type="button" class="color-preset-dot" style="background: #dc2626;" onclick="window.onTypoColorChange('#dc2626')" title="ក្រហម"></button>
                                            <button type="button" class="color-preset-dot" style="background: #2563eb;" onclick="window.onTypoColorChange('#2563eb')" title="ខៀវ"></button>
                                            <button type="button" class="color-preset-dot" style="background: #059669;" onclick="window.onTypoColorChange('#059669')" title="បៃតង"></button>
                                            <button type="button" class="color-preset-dot" style="background: #7c3aed;" onclick="window.onTypoColorChange('#7c3aed')" title="ស្វាយ"></button>
                                            <button type="button" class="color-preset-dot" style="background: #d97706;" onclick="window.onTypoColorChange('#d97706')" title="មាស"></button>
                                            <button type="button" class="color-preset-dot" style="background: #db2777;" onclick="window.onTypoColorChange('#db2777')" title="ស៊ីជម្ពូ"></button>
                                            <button type="button" class="color-preset-dot" style="background: #ffffff; border: 1px solid #cbd5e1;" onclick="window.onTypoColorChange('#ffffff')" title="ស"></button>
                                        </div>
                                    </div>
                                </div>

                                <!-- 3. Font Family Selector -->
                                <div class="mb-3">
                                    <label class="form-label small fw-bold text-muted mb-1"><i class="fi fi-rr-font me-1 text-primary"></i>ពុម្ពអក្សរ (Font Family):</label>
                                    <select class="form-select border rounded-3 fw-bold" id="selectTypoFont" onchange="window.onTypoFontChange(this.value)">
                                        <optgroup label="🇰🇭 ពុម្ពអក្សរខ្មែរ (Khmer Fonts)">
                                            <option value="'Kantumruy Pro', sans-serif">Kantumruy Pro (ស្តង់ដារទំនើប)</option>
                                            <option value="'Moul', serif">Moul (អក្សរមូលផ្លូវការ)</option>
                                            <option value="'Battambang', sans-serif">Battambang (បាត់ដំបង)</option>
                                            <option value="'Siemreap', sans-serif">Siemreap (សៀមរាប)</option>
                                        </optgroup>
                                        <optgroup label="🇨🇳 ពុម្ពអក្សរចិន (Chinese Fonts)">
                                            <option value="'Noto Sans SC', sans-serif">Noto Sans SC (ចិនស្តង់ដារ)</option>
                                            <option value="'Ma Shan Zheng', cursive">Ma Shan Zheng (ចិនអក្សរផ្ចង់ Brush)</option>
                                            <option value="'ZCOOL QingKe HuangYou', cursive">ZCOOL QingKe (ចិនដិត Art)</option>
                                        </optgroup>
                                        <optgroup label="🔤 ពុម្ពអក្សរឡាតាំង & លេខ (English / Numbers)">
                                            <option value="'Poppins', sans-serif">Poppins (លេខ & អក្សរទំនើប)</option>
                                            <option value="'Inter', sans-serif">Inter (Clear Standard)</option>
                                            <option value="monospace">Monospace (ម៉ាស៊ីនអង្គុលីលេខ)</option>
                                        </optgroup>
                                    </select>
                                </div>

                                <!-- 4. Font Size Slider & Presets -->
                                <div class="mb-3 p-3 bg-light rounded-3 border">
                                    <div class="d-flex justify-content-between align-items-center mb-1">
                                        <span class="small fw-bold text-dark"><i class="fi fi-rr-text-size me-1 text-primary"></i>ទំហំអក្សរ (Font Size):</span>
                                        <span class="badge bg-primary text-white fw-bold font-poppins" id="lblTypoSize">15.5 px</span>
                                    </div>
                                    <input type="range" class="form-range" min="10" max="32" step="0.5" value="15.5" id="sliderTypoSize" oninput="window.onTypoSizeChange(this.value)">
                                    <div class="d-flex justify-content-between small text-muted font-poppins mt-1" style="font-size: 11px;">
                                        <span>10px</span>
                                        <div class="d-flex gap-1">
                                            <button type="button" class="btn btn-xs btn-outline-secondary py-0 px-2 rounded" onclick="window.onTypoSizeChange(13)">13</button>
                                            <button type="button" class="btn btn-xs btn-outline-secondary py-0 px-2 rounded" onclick="window.onTypoSizeChange(15)">15</button>
                                            <button type="button" class="btn btn-xs btn-outline-secondary py-0 px-2 rounded" onclick="window.onTypoSizeChange(18)">18</button>
                                            <button type="button" class="btn btn-xs btn-outline-secondary py-0 px-2 rounded" onclick="window.onTypoSizeChange(22)">22</button>
                                        </div>
                                        <span>32px</span>
                                    </div>
                                </div>

                                <!-- 5. Bold & Italic Toggles -->
                                <div class="d-flex gap-2 mb-3">
                                    <button type="button" class="btn btn-sm btn-outline-primary flex-fill rounded-pill fw-bold active" id="btnTypoBold" onclick="window.toggleTypoBold()">
                                        <b>B</b> អក្សរដិត (Bold)
                                    </button>
                                    <button type="button" class="btn btn-sm btn-outline-secondary flex-fill rounded-pill fw-bold" id="btnTypoItalic" onclick="window.toggleTypoItalic()">
                                        <i>I</i> អក្សរទ្រេត (Italic)
                                    </button>
                                </div>

                                <button type="button" class="btn btn-primary w-100 rounded-pill fw-bold" onclick="window.saveStudioTheme()">
                                    <i class="fi fi-rr-disk me-1"></i>រក្សាទុកម៉ូតអក្សរ (Save Styles)
                                </button>
                            </div>
                        </div>

                        <!-- TAB PANE 2: ស្ទាយ៍ & THEME -->
                        <div class="studio-tab-pane" id="studioTabPane-theme" style="${activeStudioDockTab === 'theme' ? 'display:block;' : 'display:none;'}">
                            <!-- Theme Options -->
                            <div class="studio-control-card">
                                <div class="studio-card-title">
                                    <span><i class="fi fi-rr-palette me-2 text-primary"></i>តម្រូវ Theme & រចនាបថ (Themes)</span>
                                    <button class="btn btn-sm text-white rounded-pill px-3 fw-bold" style="background-color: #6366f1;" onclick="window.saveStudioTheme()">
                                        <i class="fi fi-rr-disk me-1"></i>រក្សាទុក Theme
                                    </button>
                                </div>

                                <div class="theme-grid">
                                    <!-- Theme 1: Tian Xin Official (stunden-card.png) -->
                                    <div class="theme-card-option ${studioConfig.selectedTheme === 'tianxin' ? 'active' : ''}" onclick="window.setCardTheme('tianxin')">
                                        <div class="theme-option-header">
                                            <span class="badge bg-danger px-1">TIS</span>
                                            <span class="text-truncate">កាតផ្លូវការធានស៊ីន</span>
                                        </div>
                                        <div class="theme-option-footer d-flex justify-content-between align-items-center">
                                            <span class="small text-muted" style="font-size: 10.5px;">🌸 គំរូសាលា</span>
                                            <span class="theme-option-status" id="themeStatus-tianxin">
                                                ${studioConfig.selectedTheme === 'tianxin' ? '✓ កំពុងប្រើ' : ''}
                                            </span>
                                        </div>
                                    </div>

                                    <!-- Theme 2: MoEYS Standard -->
                                    <div class="theme-card-option ${studioConfig.selectedTheme === 'moeys' ? 'active' : ''}" onclick="window.setCardTheme('moeys')">
                                        <div class="theme-option-header">
                                            <span>🏛️</span>
                                            <span class="text-truncate">ស្តង់ដារក្រសួង MoEYS</span>
                                        </div>
                                        <div class="theme-option-footer d-flex justify-content-between align-items-center">
                                            <span class="small text-muted" style="font-size: 10.5px;">🇰🇭 ស្តង់ដាររដ្ឋ</span>
                                            <span class="theme-option-status" id="themeStatus-moeys">
                                                ${studioConfig.selectedTheme === 'moeys' ? '✓ កំពុងប្រើ' : ''}
                                            </span>
                                        </div>
                                    </div>

                                    <!-- Theme 3: Modern Navy -->
                                    <div class="theme-card-option ${studioConfig.selectedTheme === 'navy' ? 'active' : ''}" onclick="window.setCardTheme('navy')">
                                        <div class="theme-option-header">
                                            <span>🏛️</span>
                                            <span class="text-truncate">ខៀវទំនើប (Navy)</span>
                                        </div>
                                        <div class="theme-option-footer d-flex justify-content-between align-items-center">
                                            <span class="small text-muted" style="font-size: 10.5px;">🏛️ គំរូកាត</span>
                                            <span class="theme-option-status" id="themeStatus-navy">
                                                ${studioConfig.selectedTheme === 'navy' ? '✓ កំពុងប្រើ' : ''}
                                            </span>
                                        </div>
                                    </div>

                                    <!-- Theme 4: Emerald Green -->
                                    <div class="theme-card-option ${studioConfig.selectedTheme === 'emerald' ? 'active' : ''}" onclick="window.setCardTheme('emerald')">
                                        <div class="theme-option-header">
                                            <span>🌿</span>
                                            <span class="text-truncate">បៃតងធម្មជាតិ</span>
                                        </div>
                                        <div class="theme-option-footer d-flex justify-content-between align-items-center">
                                            <span class="small text-muted" style="font-size: 10.5px;">🌿 គំរូកាត</span>
                                            <span class="theme-option-status" id="themeStatus-emerald">
                                                ${studioConfig.selectedTheme === 'emerald' ? '✓ កំពុងប្រើ' : ''}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Background Upload -->
                            <div class="studio-control-card">
                                <div class="studio-card-title">
                                    <span><i class="fi fi-rr-picture me-2 text-primary"></i>រូបភាពផ្ទៃខាងក្រោយ (Card Background)</span>
                                    <a href="javascript:void(0)" class="small text-primary fw-bold text-decoration-none" onclick="window.resetCardBackground()">ពណ៌ផ្ទៃស្ដង់ដារ</a>
                                </div>

                                <div class="studio-upload-box" onclick="document.getElementById('fileUploadCardBg').click()">
                                    <input type="file" id="fileUploadCardBg" class="d-none" accept="image/*" onchange="window.handleCardBgUpload(this)">
                                    <div class="studio-upload-icon"><i class="fi fi-rr-cloud-upload"></i></div>
                                    <div class="studio-upload-title">ចុចនូវទីនេះដើម្បីប្ដូររូបភាព Background កាត</div>
                                    <div class="studio-upload-hint">គាំទ្រ JPG, PNG, WebP (ទំហំអតិបរមា 5MB)</div>
                                </div>
                            </div>

                            <!-- Display Options & Stamp -->
                            <div class="studio-control-card">
                                <div class="studio-card-title mb-2">
                                    <span><i class="fi fi-rr-settings me-2 text-primary"></i>ជម្រើសបង្ហាញលើកាត (Display Options)</span>
                                </div>

                                <div class="form-check mb-2">
                                    <input class="form-check-input" type="checkbox" id="chkOuterBorder" ${studioConfig.showOuterBorder ? 'checked' : ''} onchange="window.toggleCardBorder(this.checked)">
                                    <label class="form-check-label small fw-bold text-dark" for="chkOuterBorder">
                                        បង្ហាញស៊ុមខាងក្រៅកាត (Outer Border)
                                    </label>
                                    <div class="small text-muted" style="font-size: 11px;">ដោះធីក ប្រសិនបើប្រើក្រដាស Background មានស៊ុមស្រាប់</div>
                                </div>

                                <div class="form-check mb-3">
                                    <input class="form-check-input" type="checkbox" id="chkStampAndSign" ${studioConfig.showStampAndSign ? 'checked' : ''} onchange="window.toggleStampAndSign(this.checked)">
                                    <label class="form-check-label small fw-bold text-dark" for="chkStampAndSign">
                                        បង្ហាញត្រាសាលាក្រហម & ហត្ថលេខានាយក
                                    </label>
                                </div>

                                <div class="p-3 bg-light rounded-4">
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <span class="small fw-bold text-muted"><i class="fi fi-rr-lock me-1"></i>រូបភាពត្រានាយក (Principal Stamp)</span>
                                        <a href="javascript:void(0)" class="small text-primary fw-bold text-decoration-none" onclick="window.resetPrincipalStamp()">ផ្លាស់ប្តូរត្រាប្រព័ន្ធ</a>
                                    </div>
                                    <div class="studio-upload-box py-2" onclick="document.getElementById('fileUploadStamp').click()">
                                        <input type="file" id="fileUploadStamp" class="d-none" accept="image/*" onchange="window.handleStampUpload(this)">
                                        <div class="studio-upload-title" style="font-size: 11.5px;">ចុចនូវទីនេះដើម្បីបញ្ចូលរូបភាពត្រានាយក (Upload Stamp)</div>
                                        <div class="studio-upload-hint" style="font-size: 10px;">PNG (ផ្ទៃថ្លា), SVG, WebP, JPG (ទំហំតិចជាង 5MB)</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- TAB PANE 3: កែសម្រួលទីតាំង D-PAD & TRANSFORM -->
                        <div class="studio-tab-pane" id="studioTabPane-position" style="${activeStudioDockTab === 'position' ? 'display:block;' : 'display:none;'}">
                            <div class="adjust-position-panel m-0">
                                <div class="adjust-panel-header">
                                    <div class="fw-bold text-dark d-flex align-items-center gap-2">
                                        <span class="fs-5">🎯</span>
                                        <span>កែសម្រួលទីតាំង (Adjust Position)</span>
                                    </div>
                                    <button class="drag-toggle-btn ${dragModeActive ? 'active' : ''}" id="btnToggleDragMode" onclick="window.toggleDragMode()">
                                        🔘 របៀបអូស (Drag)
                                    </button>
                                </div>

                                <!-- Layer Dropdown -->
                                <div class="mb-3">
                                    <label class="form-label small fw-bold text-muted mb-1">ជ្រើសរើសផ្នែកដែលត្រូវកែសម្រួលទីតាំង:</label>
                                    <select class="form-select border rounded-3 fw-bold text-dark" id="selectAdjustLayer" onchange="window.onLayerSelectChange(this.value)">
                                        <option value="photoFrame">🖼️ រូបថតសិស្ស (Photo Frame)</option>
                                        <option value="studentId">🆔 អត្តលេខកាត (Student ID)</option>
                                        <option value="nameKh">👤 ឈ្មោះសិស្សខ្មែរ (Khmer Name)</option>
                                        <option value="nameCh">🀄 ឈ្មោះសិស្សចិន (姓名 / Chinese Name)</option>
                                        <option value="genderKh">⚧ ភេទខ្មែរ (Gender Khmer)</option>
                                        <option value="genderZh">🈳 ភេទចិន (性别 / Gender Chinese)</option>
                                        <option value="phone">📞 លេខអាណាព្យាបាល (Guardian Phone)</option>
                                        <option value="date">📅 ថ្ងៃចូលរៀន (Enrollment Date)</option>
                                        <option value="stampSignature">🔴 ត្រានាយក & ហត្ថលេខា (Stamp)</option>
                                        <option value="cardTitle">🏷️ ចំណងជើងកាត (Card Title)</option>
                                        <option value="nationalHeader">🏛️ ស្លាកព្រះរាជាណាចក្រកម្ពុជា</option>
                                        <option value="academicYear">📅 ឆ្នាំសិក្សា (Academic Year)</option>
                                        <option value="schoolLogo">🏫 រូបសញ្ញាសាលា (School Logo)</option>
                                        <option value="datesAuthority">📅 កាលបរិច្ឆេទ & នាយកសាលា</option>
                                    </select>
                                </div>

                                <!-- D-Pad and Offset Sliders Layout -->
                                <div class="d-flex align-items-center justify-content-between mb-2">
                                    <span class="small fw-bold text-muted">ជំហានរំកិល (Step):</span>
                                    <div class="step-btn-group">
                                        <button class="step-btn ${adjustStep === 1 ? 'active' : ''}" onclick="window.setAdjustStep(1)">1px</button>
                                        <button class="step-btn ${adjustStep === 5 ? 'active' : ''}" onclick="window.setAdjustStep(5)">5px</button>
                                        <button class="step-btn ${adjustStep === 15 ? 'active' : ''}" onclick="window.setAdjustStep(15)">15px</button>
                                    </div>
                                </div>

                                <div class="row g-3 align-items-center mb-3">
                                    <!-- Virtual D-Pad -->
                                    <div class="col-sm-4 d-flex justify-content-center">
                                        <div class="dpad-container">
                                            <button class="dpad-btn dpad-btn-up" onclick="window.moveLayer(0, -adjustStep)" title="ឡើងលើ">▲</button>
                                            <button class="dpad-btn dpad-btn-left" onclick="window.moveLayer(-adjustStep, 0)" title="ទៅឆ្វេង">◄</button>
                                            <button class="dpad-btn dpad-btn-center" onclick="window.resetSelectedLayerPos()" title="កំណត់ដើម 0,0">0,0</button>
                                            <button class="dpad-btn dpad-btn-right" onclick="window.moveLayer(adjustStep, 0)" title="ទៅស្ដាំ">►</button>
                                            <button class="dpad-btn dpad-btn-down" onclick="window.moveLayer(0, adjustStep)" title="ចុះក្រោម">▼</button>
                                        </div>
                                    </div>

                                    <!-- X and Y Sliders -->
                                    <div class="col-sm-8">
                                        <!-- X Slider -->
                                        <div class="mb-2">
                                            <div class="d-flex justify-content-between small fw-bold text-muted mb-1">
                                                <span>រំកិលផ្ដេក (X):</span>
                                                <span class="text-primary font-poppins" id="lblOffsetX">0px</span>
                                            </div>
                                            <input type="range" class="form-range" min="-80" max="80" value="0" id="sliderOffsetX" oninput="window.onSliderOffsetChange('x', this.value)">
                                        </div>

                                        <!-- Y Slider -->
                                        <div class="mb-2">
                                            <div class="d-flex justify-content-between small fw-bold text-muted mb-1">
                                                <span>រំកិលបញ្ឈរ (Y):</span>
                                                <span class="text-primary font-poppins" id="lblOffsetY">0px</span>
                                            </div>
                                            <input type="range" class="form-range" min="-80" max="80" value="0" id="sliderOffsetY" oninput="window.onSliderOffsetChange('y', this.value)">
                                        </div>

                                        <div class="small text-muted" style="font-size: 11px;">* ចុចលើ D-Pad ឬ Slider ដើម្បីកែសម្រួលទីតាំង។</div>
                                    </div>
                                </div>

                                <!-- Scale Slider & Presets -->
                                <div class="border-top pt-3 mb-3">
                                    <div class="d-flex justify-content-between align-items-center mb-1">
                                        <div class="d-flex align-items-center gap-2">
                                            <span class="small fw-bold text-muted">🔍 ទំហំពង្រីក/បង្រួម (Scale):</span>
                                            <span class="badge bg-light text-primary border fw-bold" id="lblScaleDisplay">100%</span>
                                        </div>
                                        <div class="scale-presets">
                                            <button class="scale-preset-btn" onclick="window.setLayerScale(0.75)">75%</button>
                                            <button class="scale-preset-btn active" onclick="window.setLayerScale(1.0)">100%</button>
                                            <button class="scale-preset-btn" onclick="window.setLayerScale(1.25)">125%</button>
                                            <button class="scale-preset-btn" onclick="window.setLayerScale(1.5)">150%</button>
                                        </div>
                                    </div>
                                    <input type="range" class="form-range" min="0.5" max="2.0" step="0.05" value="1.0" id="sliderScale" oninput="window.setLayerScale(this.value)">
                                </div>

                                <!-- Tip Box -->
                                <div class="adjust-hint-box">
                                    <span class="fs-5">💡</span>
                                    <span>ផ្នែកនីមួយៗអាចរំកិល/ពង្រីកបាន។ អ្នកអាចកែសម្រួលទីតាំង និងទំហំរូបថត/ ត្រា/អត្ថបទ (Scale) បាន។</span>
                                </div>

                                <!-- Save / Reset Actions -->
                                <div class="d-flex justify-content-between align-items-center mt-3 pt-2">
                                    <button class="btn-save-layout" onclick="window.saveStudioLayoutAndTheme()">
                                        <i class="fi fi-rr-check"></i>
                                        <span>រក្សាទុកទម្រង់ & ទីតាំងកាត</span>
                                    </button>
                                    <button class="btn-reset-layout" onclick="window.resetStudioAllLayout()">
                                        កំណត់ឡើងវិញ
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- TAB PANE 4: ជំនួយការ AI STUDIO -->
                        <div class="studio-tab-pane" id="studioTabPane-ai" style="${activeStudioDockTab === 'ai' ? 'display:block;' : 'display:none;'}">
                            <div class="studio-control-card studio-ai-card m-0">
                                <div class="studio-card-title d-flex justify-content-between align-items-center mb-2">
                                    <span class="d-flex align-items-center">
                                        <i class="fi fi-rr-magic-wand me-2 text-warning fs-5"></i>
                                        <span>ជំនួយការ AI បង្កើតរូបភាព (AI Image Studio)</span>
                                    </span>
                                    <span class="ai-badge-pill">
                                        <i class="fi fi-rr-sparkles me-1"></i>AI Powered
                                    </span>
                                </div>
                                <div class="small text-muted mb-2" style="font-size: 11.5px;">
                                    បង្កើតរូបថតសិស្សផ្លូវការ ឬផ្ទៃខាងក្រោយកាតសាលាដោយប្រើ AI តាមរយៈ Prompt & API Key
                                </div>

                                <!-- Active Student Dynamic Context Banner -->
                                <div class="ai-student-context-pill d-flex justify-content-between align-items-center mb-3 p-2 rounded-3">
                                    <div class="d-flex align-items-center gap-2 overflow-hidden">
                                        <div class="rounded-circle d-flex align-items-center justify-content-center bg-primary text-white fw-bold shadow-xs overflow-hidden" 
                                             id="aiActiveStudentAvatar" style="width: 38px; height: 38px; font-size: 14px; flex-shrink: 0;">
                                            ${s && s.imageUrl ? `<img src="${s.imageUrl}" class="w-100 h-100" style="object-fit:cover;" alt="Avatar">` : (s && (s.gender === 'Female' || s.gender === 'ស្រី') ? '👧' : '👦')}
                                        </div>
                                        <div class="text-truncate">
                                            <div class="fw-bold text-dark small text-truncate" id="aiActiveStudentName">
                                                ${s ? `${s.lastName || ''} ${s.firstName || ''}` : 'ជ្រើសរើសសិស្ស'}
                                            </div>
                                            <div class="text-muted" style="font-size: 10.5px;" id="aiActiveStudentMeta">
                                                ID: ${s ? (s.displayId || s.id || 'STD-1001') : '-'} • ថ្នាក់: ${s ? (s.studyLevel || s.classroom || s.class || '-') : '-'}
                                            </div>
                                        </div>
                                    </div>
                                    <span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 rounded-pill px-2 py-1" style="font-size: 10.5px;">
                                        សិស្សកំពុងកែ
                                    </span>
                                </div>

                                <!-- Fast Presets Chips -->
                                <div class="mb-3">
                                    <div class="small fw-bold text-muted mb-1" style="font-size: 11px;">
                                        <i class="fi fi-rr-bolt me-1 text-warning"></i>គំរូ Prompt រហ័ស (Quick Presets):
                                    </div>
                                    <div class="d-flex flex-wrap gap-1">
                                        <button type="button" class="ai-preset-chip" onclick="window.applyAIPromptPreset('boy')">
                                            👨‍🎓 រូបថតសិស្សប្រុស (4x6)
                                        </button>
                                        <button type="button" class="ai-preset-chip" onclick="window.applyAIPromptPreset('girl')">
                                            👩‍🎓 រូបថតសិស្សស្រី (4x6)
                                        </button>
                                        <button type="button" class="ai-preset-chip" onclick="window.applyAIPromptPreset('cardBg')">
                                            🎨 ផ្ទៃខាងក្រោយកាត
                                        </button>
                                        <button type="button" class="ai-preset-chip" onclick="window.applyAIPromptPreset('emblem')">
                                            🏫 និមិត្តសញ្ញាសាលា
                                        </button>
                                    </div>
                                </div>

                                <!-- Prompt Textarea & Auto-Enhancer -->
                                <div class="mb-2">
                                    <div class="d-flex justify-content-between align-items-center mb-1">
                                        <label class="form-label small fw-bold text-dark mb-0">
                                            <i class="fi fi-rr-pencil me-1 text-primary"></i>សរសេរ Prompt:
                                        </label>
                                        <button type="button" class="btn btn-sm btn-link text-decoration-none p-0 fw-bold text-primary" 
                                                style="font-size: 11px;" onclick="window.enhancePromptWithAI()">
                                            <i class="fi fi-rr-sparkles me-1 text-warning"></i>ជំនួយការ AI ពង្រីក Prompt
                                        </button>
                                    </div>
                                    <textarea class="form-control border bg-light font-poppins" id="aiImagePrompt" rows="3" 
                                              style="font-size: 12px; resize: vertical;" 
                                              placeholder="ឧ. រូបថតសិស្សប្រុសផ្លូវការ អាវស ផ្ទៃខៀវ 4x6, ឬ ផ្ទៃខាងក្រោយកាតសាលាប្រណិត Royal Blue & Gold..."></textarea>
                                </div>

                                <!-- Generate Button -->
                                <button type="button" class="btn-generate-ai w-100" id="btnGenerateAIImage" onclick="window.generateCardStudioAIImage()">
                                    <i class="fi fi-rr-sparkles"></i>
                                    <span id="btnGenerateAIImageText">បង្កើតរូបភាពដោយ AI (Generate with AI)</span>
                                </button>

                                <!-- Generated Result Container (Dynamic) -->
                                <div id="aiImageResultBox" class="mt-3 p-3 bg-light rounded-3 border" style="display: none;">
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <span class="small fw-bold text-success"><i class="fi fi-rr-check-circle me-1"></i>រូបភាពដែលបានបង្កើតដោយ AI:</span>
                                        <button type="button" class="btn-close btn-sm" onclick="window.closeAIImageResultBox()"></button>
                                    </div>
                                    <div class="ai-result-preview-frame mb-2 text-center position-relative">
                                        <img id="aiResultImgPreview" src="" alt="AI Generated" class="img-fluid rounded-3 shadow-sm" style="max-height: 220px; object-fit: contain;">
                                    </div>

                                    <!-- Action Buttons -->
                                    <div class="d-flex gap-2 flex-wrap mb-2">
                                        <button type="button" class="btn btn-sm btn-success flex-fill fw-bold rounded-pill" onclick="window.applyAIGeneratedImageToStudent()">
                                            <i class="fi fi-rr-user-check me-1"></i>ដាក់ជារូបថតសិស្ស & Save
                                        </button>
                                        <button type="button" class="btn btn-sm btn-info text-white flex-fill fw-bold rounded-pill" onclick="window.applyAIGeneratedImageToBackground()">
                                            <i class="fi fi-rr-picture me-1"></i>ដាក់ជា Background កាត
                                        </button>
                                        <button type="button" class="btn btn-sm btn-outline-secondary fw-bold rounded-pill" onclick="window.downloadAIGeneratedImage()" title="ទាញយករូបភាព">
                                            <i class="fi fi-rr-download"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Right Column: Official Card Canvas Stage (Sticky & Centered) -->
                    <div class="col-xl-7 col-lg-7 studio-stage-column">
                        <div class="card-canvas-stage w-100 d-flex flex-column align-items-center" id="cardCanvasStage">
                            ${buildStudioCanvasHTML(s)}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Apply theme variables and layer transforms
        applyThemeStyles(studioConfig.selectedTheme);
        applyAllLayerTransforms();
        setupDragEvents();
    };

    /**
     * Build HTML for the student dropdown selector
     */
    function buildStudentSelectOptions(students, activeKey) {
        if (!students || students.length === 0) return `<option value="">គ្មានទិន្នន័យសិស្ស</option>`;
        return students.map(st => {
            const k = st.key || st.id;
            const sel = k === activeKey ? 'selected' : '';
            const id = st.displayId || st.id || 'STD-1001';
            const name = `${st.lastName || ''} ${st.firstName || ''}`.trim() || '-';
            const cls = st.studyLevel || st.classroom || st.class ? ` • ថ្នាក់: ${st.studyLevel || st.classroom || st.class}` : '';
            return `<option value="${k}" ${sel}>${id} - ${name} ${cls}</option>`;
        }).join('');
    }

    /**
     * Generate HTML of the Official Student ID Card
     */
    /**
     * Generate Barcode SVG (Code 128 replica for Tian Xin Student Card Back)
     */
    function buildBarcodeSVG(text) {
        text = (text || 'TX475').toString().toUpperCase().trim();
        let bars = '';
        let x = 10;
        for (let i = 0; i < 44; i++) {
            const w = (i % 3 === 0) ? 3 : (i % 5 === 0 ? 1.5 : 2.2);
            bars += `<rect x="${x}" y="0" width="${w}" height="38" fill="#0f172a" />`;
            x += w + ((i % 4 === 0) ? 3.2 : (i % 2 === 0 ? 2 : 1.5));
        }
        return `
            <svg viewBox="0 0 ${x + 10} 54" xmlns="http://www.w3.org/2000/svg" style="max-width: 100%; height: 38px;">
                ${bars}
                <text x="${(x + 10) / 2}" y="50" font-family="'Poppins', monospace" font-size="10" font-weight="700" fill="#0f172a" text-anchor="middle" letter-spacing="2">* ${text} *</text>
            </svg>
        `;
    }


    /**
     * Convert remote image URL to CORS-safe proxy URL
     */
    function getSafeImageURL(url) {
        if (!url || typeof url !== 'string') return '';
        const trimmed = url.trim();
        if (!trimmed) return '';
        if (trimmed.startsWith('data:') || trimmed.startsWith('blob:') || !trimmed.startsWith('http')) {
            return trimmed;
        }
        return 'https://images.weserv.nl/?url=' + encodeURIComponent(trimmed);
    }

    /**
     * Fallback handler if image fails to load
     */
    window.handleCardPhotoError = function (img, encodedOriginalUrl) {
        if (!img) return;
        const origUrl = decodeURIComponent(encodedOriginalUrl || '');
        if (origUrl && !img.dataset.hasRetriedProxy) {
            img.dataset.hasRetriedProxy = 'true';
            img.src = 'https://images.weserv.nl/?url=' + encodeURIComponent(origUrl);
            return;
        }
        // Fallback placeholder
        const parent = img.parentElement;
        if (parent) {
            parent.innerHTML = `
                <svg viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg" class="card-student-photo" id="cardPhotoImg">
                    <rect width="100" height="130" fill="#2563eb"/>
                    <path d="M12,130 Q16,95 38,90 L50,105 L62,90 Q84,95 88,130 Z" fill="#ffffff"/>
                    <path d="M42,92 L50,105 L58,92 Z" fill="#cbd5e1"/>
                    <rect x="43" y="72" width="14" height="22" fill="#fde68a" rx="2"/>
                    <circle cx="50" cy="55" r="22" fill="#fed7aa"/>
                    <path d="M28,52 C28,32 35,26 50,26 C65,26 72,32 72,52 C70,42 63,36 50,36 C37,36 30,42 28,52 Z" fill="#1e293b"/>
                    <circle cx="43" cy="54" r="2.2" fill="#0f172a"/>
                    <circle cx="57" cy="54" r="2.2" fill="#0f172a"/>
                    <path d="M46,65 Q50,68 54,65" stroke="#9a3412" stroke-width="1.6" fill="none" stroke-linecap="round"/>
                </svg>
            `;
        }
    };

    /**
     * Pre-convert all images in container to Base64 to bypass CORS in html2canvas
     */
    async function inlineAllCardImages(container) {
        if (!container) return;

        // 1. Inline all <img> tags
        const imgs = Array.from(container.querySelectorAll('img'));
        await Promise.all(imgs.map(async (img) => {
            const src = img.getAttribute('src');
            if (!src || src.startsWith('data:')) return;
            try {
                let fetchUrl = src;
                if (src.startsWith('http://') || src.startsWith('https://')) {
                    fetchUrl = 'https://images.weserv.nl/?url=' + encodeURIComponent(src);
                }
                const res = await fetch(fetchUrl);
                if (res.ok) {
                    const blob = await res.blob();
                    const dataUri = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.onerror = () => resolve(null);
                        reader.readAsDataURL(blob);
                    });
                    if (dataUri) {
                        img.src = dataUri;
                        img.removeAttribute('crossorigin');
                    }
                }
            } catch (e) {
                console.warn('Failed to inline img:', src, e);
            }
        }));

        // 2. Inline background images
        const allEls = [container, ...Array.from(container.querySelectorAll('*'))];
        await Promise.all(allEls.map(async (el) => {
            const style = el.getAttribute('style') || '';
            const match = style.match(/background(?:-image)?:s*url\((['"]?)(.*?)\1\)/i);
            if (match && match[2] && !match[2].startsWith('data:')) {
                const rawBgUrl = match[2];
                try {
                    let fetchUrl = rawBgUrl;
                    if (rawBgUrl.startsWith('http://') || rawBgUrl.startsWith('https://')) {
                        fetchUrl = 'https://images.weserv.nl/?url=' + encodeURIComponent(rawBgUrl);
                    }
                    const res = await fetch(fetchUrl);
                    if (res.ok) {
                        const blob = await res.blob();
                        const dataUri = await new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result);
                            reader.onerror = () => resolve(null);
                            reader.readAsDataURL(blob);
                        });
                        if (dataUri) {
                            el.style.backgroundImage = 'url("' + dataUri + '")';
                        }
                    }
                } catch (e) {
                    console.warn('Failed to inline bg:', rawBgUrl, e);
                }
            }
        }));
    }



    /**
     * Compute inline CSS styles (color, font, size, weight) for card fields
     */
    function getFieldInlineStyle(fieldKey) {
        if (!studioConfig.fieldStyles) studioConfig.fieldStyles = JSON.parse(JSON.stringify(defaultConfig.fieldStyles));
        const s = studioConfig.fieldStyles[fieldKey] || defaultConfig.fieldStyles[fieldKey];
        if (!s) return '';
        const color = s.color || '#0f172a';
        const font = s.font || "'Poppins', sans-serif";
        const size = s.size || 14;
        const weight = s.bold ? '800' : '500';
        const style = s.italic ? 'italic' : 'normal';
        return `color: ${color} !important; font-family: ${font} !important; font-size: ${size}px !important; font-weight: ${weight} !important; font-style: ${style} !important;`;
    }


    /**
     * Build Front Face of Tian Xin Student Card (stunden-card.png)
     */
    function buildCardFrontHTML(s) {
        if (!s) s = {};
        const data = getStudentCardData(s);

        const rawPhotoUrl = (data.photoUrl || '').trim();
        const safePhotoUrl = getSafeImageURL(rawPhotoUrl);
        const studentPhotoHTML = (rawPhotoUrl && rawPhotoUrl !== 'img/1.jpg') 
            ? `<img src="${safePhotoUrl}" class="card-student-photo" id="cardPhotoImg" alt="Photo" onerror="window.handleCardPhotoError(this, '${encodeURIComponent(rawPhotoUrl)}')">`
            : `
            <svg viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg" class="card-student-photo" id="cardPhotoImg">
                <rect width="100" height="130" fill="#2563eb"/>
                <path d="M12,130 Q16,95 38,90 L50,105 L62,90 Q84,95 88,130 Z" fill="#ffffff"/>
                <path d="M42,92 L50,105 L58,92 Z" fill="#cbd5e1"/>
                <rect x="43" y="72" width="14" height="22" fill="#fde68a" rx="2"/>
                <circle cx="50" cy="55" r="22" fill="#fed7aa"/>
                <path d="M28,52 C28,32 35,26 50,26 C65,26 72,32 72,52 C70,42 63,36 50,36 C37,36 30,42 28,52 Z" fill="#1e293b"/>
                <circle cx="43" cy="54" r="2.2" fill="#0f172a"/>
                <circle cx="57" cy="54" r="2.2" fill="#0f172a"/>
                <path d="M46,65 Q50,68 54,65" stroke="#9a3412" stroke-width="1.6" fill="none" stroke-linecap="round"/>
            </svg>
            `;

        const bgUrl = studioConfig.customBgUrl || 'img/stunden-card.png';
        const bgStyle = `background: url('${bgUrl}') no-repeat center center; background-size: 100% 100%;`;

        return `
            <div class="moeys-id-card tianxin-official-card" id="officialCardElement" style="${bgStyle}">
                <!-- 1. Student Photo Frame (Placed in cutout of stunden-card.png) -->
                <div class="movable-layer" id="layer-photoFrame" data-layer-key="photoFrame">
                    <div class="card-tianxin-photo-box">
                        ${studentPhotoHTML}
                    </div>
                </div>

                <!-- 2. Student ID (Centered directly beneath the photo, matching reference image) -->
                <div class="movable-layer card-tianxin-id-center" id="layer-studentId" data-layer-key="studentId" style="${getFieldInlineStyle('studentId')}">
                    ID: <span id="cardStudentIdText">${data.id}</span>
                </div>

                <!-- 3. ឈ្មោះ (Khmer Name) -->
                <div class="movable-layer card-tianxin-field card-field-name-kh" id="layer-nameKh" data-layer-key="nameKh" style="${getFieldInlineStyle('nameKh')}">
                    <span id="cardNameKhText">${data.nameKh}</span>
                </div>

                <!-- 4. 姓名 (Chinese Name) -->
                <div class="movable-layer card-tianxin-field card-field-name-ch" id="layer-nameCh" data-layer-key="nameCh" style="${getFieldInlineStyle('nameCh')}">
                    <span id="cardNameChText">${data.nameCh || '-'}</span>
                </div>

                <!-- 5. ភេទ (Gender Khmer) -->
                <div class="movable-layer card-tianxin-field card-field-gender-kh" id="layer-genderKh" data-layer-key="genderKh" style="${getFieldInlineStyle('genderKh')}">
                    <span id="cardGenderKhText">${data.genderKh}</span>
                </div>

                <!-- 6. 性别 (Gender Chinese) -->
                <div class="movable-layer card-tianxin-field card-field-gender-ch" id="layer-genderZh" data-layer-key="genderZh" style="${getFieldInlineStyle('genderZh')}">
                    <span id="cardGenderZhText">${data.genderZh}</span>
                </div>

                <!-- 7. លេខអាណាព្យាបាល (Guardian Phone) -->
                <div class="movable-layer card-tianxin-field card-field-phone" id="layer-phone" data-layer-key="phone" style="${getFieldInlineStyle('phone')}">
                    <span id="cardPhoneText">${data.phone || '-'}</span>
                </div>

                <!-- 8. ថ្ងៃខែឆ្នាំចូលរៀន (Enrollment Date) -->
                <div class="movable-layer card-tianxin-field card-field-date" id="layer-date" data-layer-key="date" style="${getFieldInlineStyle('date')}">
                    <span id="cardDateText">${data.joinDate || '-'}</span>
                </div>
            </div>
        `;
    }

    /**
     * Build Back Face of Tian Xin Student Card
     */
    function buildCardBackHTML(s) {
        if (!s) s = {};
        const data = getStudentCardData(s);
        const customBackBg = studioConfig.customBackBgUrl;
        const bgStyle = customBackBg 
            ? `background: url('${customBackBg}') no-repeat center center; background-size: 100% 100%;` 
            : `background: #ffffff;`;

        return `
            <div class="moeys-id-card tianxin-official-card-back" id="officialCardBackElement" style="${bgStyle}">
                <!-- 1. Header with Tian Xin Logo & School Title -->
                <div class="card-back-header">
                    <div class="card-back-logo-row">
                        <img src="img/logo.jpg" class="card-back-logo-img" alt="Tian Xin Logo" onerror="this.style.display='none'">
                        <div>
                            <div class="card-back-title-kh">សាលាអន្តរជាតិ ធានស៊ីន</div>
                            <div class="card-back-title-ch">天心国际学校</div>
                            <div class="card-back-title-en">TIAN XIN INTERNATIONAL SCHOOL</div>
                        </div>
                    </div>
                </div>

                <!-- 2. Body with Terms & Conditions -->
                <div class="card-back-body">
                    <div>
                        <div class="card-back-rules-title">
                            <i class="fi fi-rr-shield-check text-danger"></i>
                            <span>លក្ខខណ្ឌនៃការប្រើប្រាស់ប័ណ្ណ • TERMS</span>
                        </div>
                        <ul class="card-back-rules-list">
                            <li>ប័ណ្ណនេះត្រូវប្រើប្រាស់សម្រាប់តែសិស្សសាលាអន្តរជាតិធានស៊ីនប៉ុណ្ណោះ។</li>
                            <li>សិស្សត្រូវពាក់ប័ណ្ណនេះជាប់ជានិច្ចនៅពេលចូលរៀនក្នុងបរិវេណសាលា។</li>
                            <li>ក្នុងករណីបាត់បង់ ឬខូចខាតត្រូវរាយការណ៍មកការិយាល័យជាបន្ទាន់។</li>
                            <li>អ្នករើសបានសូមមេត្តាប្រគល់ជូនសាលា ឬទាក់ទងមកទូរស័ព្ទខាងក្រោម។</li>
                        </ul>
                    </div>

                    <!-- 3. Barcode & Principal Stamp Section -->
                    <div class="card-back-mid-section">
                        <div class="card-back-barcode-box">
                            ${buildBarcodeSVG(data.id)}
                            <div class="small fw-bold text-muted mt-1" style="font-size: 9px;">ឆ្នាំសិក្សា: ${studioConfig.academicYear || '២០២៦-២០២៧'}</div>
                        </div>
                        <div class="card-back-stamp-box">
                            <div class="card-stamp-wrapper" style="width: 75px; height: 75px; margin: 0;">
                                ${buildStampAndSignatureSVG()}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 4. Footer with Address, Phones, and QR Code -->
                <div class="card-back-footer">
                    <div class="card-back-footer-text">
                        <div class="fw-bold mb-1">📍 ភូមិថ្មីខាងត្បូង សង្កាត់អណ្តូងខ្មែរ ក្រុងកំពត ខេត្តកំពត</div>
                        <div class="fw-bold">📞 093-835678 • 067-835678 • 085 38 66 10</div>
                    </div>
                    <div class="card-back-footer-qr text-center">
                        <img src="img/stunden-card.png" style="width: 100%; height: 100%; object-fit: cover; object-position: right bottom; border-radius: 4px;" alt="QR">
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Fallback MoEYS Card Generator
     */
    function buildMoeysCardHTML(s) {
        if (!s) s = {};
        const data = getStudentCardData(s);
        const name = data.nameKh;
        const gender = data.genderKh;
        const dob = s.dob || s.birthDate || '-';
        const cls = data.class || '-';
        const father = s.fatherName || '-';
        const mother = s.motherName || '-';
        const addr = s.address || s.currentAddress || '-';
        const id = data.id;

        const schoolLogoHTML = studioConfig.customLogoUrl 
            ? `<img src="${studioConfig.customLogoUrl}" class="card-school-logo" alt="Logo">`
            : `
            <svg class="card-school-logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="48" fill="#153e75" stroke="#f59e0b" stroke-width="4"/>
                <circle cx="50" cy="50" r="42" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="2,2"/>
                <polygon points="50,22 28,34 72,34" fill="#f59e0b"/>
                <rect x="30" y="34" width="40" height="3" fill="#f59e0b"/>
                <rect x="34" y="39" width="5" height="25" fill="#f59e0b" rx="1"/>
                <rect x="43" y="39" width="5" height="25" fill="#f59e0b" rx="1"/>
                <rect x="52" y="39" width="5" height="25" fill="#f59e0b" rx="1"/>
                <rect x="61" y="39" width="5" height="25" fill="#f59e0b" rx="1"/>
                <rect x="28" y="66" width="44" height="4" fill="#f59e0b" rx="1"/>
                <rect x="25" y="71" width="50" height="4" fill="#f59e0b" rx="1"/>
            </svg>
            `;

        const studentPhotoHTML = (data.photoUrl && data.photoUrl.trim() !== '' && data.photoUrl !== 'img/1.jpg') 
            ? `<img src="${data.photoUrl}" class="card-student-photo" id="cardPhotoImg" alt="Photo">`
            : `
            <svg viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg" class="card-student-photo" id="cardPhotoImg">
                <rect width="100" height="130" fill="#2563eb"/>
                <path d="M12,130 Q16,95 38,90 L50,105 L62,90 Q84,95 88,130 Z" fill="#ffffff"/>
                <path d="M42,92 L50,105 L58,92 Z" fill="#cbd5e1"/>
                <rect x="43" y="72" width="14" height="22" fill="#fde68a" rx="2"/>
                <circle cx="50" cy="55" r="22" fill="#fed7aa"/>
                <path d="M28,52 C28,32 35,26 50,26 C65,26 72,32 72,52 C70,42 63,36 50,36 C37,36 30,42 28,52 Z" fill="#1e293b"/>
                <circle cx="43" cy="54" r="2.2" fill="#0f172a"/>
                <circle cx="57" cy="54" r="2.2" fill="#0f172a"/>
                <path d="M46,65 Q50,68 54,65" stroke="#9a3412" stroke-width="1.6" fill="none" stroke-linecap="round"/>
            </svg>
            `;

        const bgStyle = studioConfig.customBgUrl ? `background-image: url('${studioConfig.customBgUrl}'); background-size: cover;` : '';
        const borderClass = studioConfig.showOuterBorder ? '' : 'no-border';

        return `
            <div class="moeys-id-card ${borderClass}" id="officialCardElement" style="${bgStyle}">
                <div>
                    <div class="card-top-header">
                        <div class="movable-layer" id="layer-schoolLogo" data-layer-key="schoolLogo">
                            ${schoolLogoHTML}
                        </div>
                        <div class="card-national-header movable-layer" id="layer-nationalHeader" data-layer-key="nationalHeader">
                            <div class="card-national-title">ព្រះរាជាណាចក្រកម្ពុជា</div>
                            <div class="card-national-title">ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
                            <div class="card-national-divider">
                                <span>❖</span>
                            </div>
                        </div>
                    </div>

                    <div class="movable-layer" id="layer-cardTitle" data-layer-key="cardTitle">
                        <div class="card-main-title">ប័ណ្ណសម្គាល់ខ្លួនសិស្ស</div>
                        <div class="card-phone-school" id="cardSchoolPhoneText">${studioConfig.schoolName}</div>
                    </div>

                    <div class="movable-layer" id="layer-studentId" data-layer-key="studentId">
                        <div class="card-student-id-badge" id="cardStudentIdText">ID: ${id}</div>
                    </div>

                    <div class="movable-layer" id="layer-studentInfo" data-layer-key="studentInfo">
                        <table class="card-details-table">
                            <tr>
                                <td width="72%"><span class="card-detail-label">គោត្តនាម នាម :</span> <span class="card-detail-val" id="cardNameKhText">${name}</span></td>
                                <td width="28%" class="text-end"><span class="card-detail-label">ភេទ:</span> <span class="card-detail-val" id="cardGenderText">${gender}</span></td>
                            </tr>
                            <tr>
                                <td colspan="2"><span class="card-detail-label">ថ្ងៃខែឆ្នាំកំណើត :</span> <span class="card-detail-val" id="cardDobText">${dob}</span></td>
                            </tr>
                            <tr>
                                <td colspan="2"><span class="card-detail-label">ថ្នាក់ទី :</span> <span class="card-detail-val" id="cardClassText">${cls}</span></td>
                            </tr>
                            <tr>
                                <td width="55%"><span class="card-detail-label">ឪពុកឈ្មោះ :</span> <span class="card-detail-val" id="cardFatherText">${father}</span></td>
                                <td width="45%"><span class="card-detail-label">ម្តាយឈ្មោះ :</span> <span class="card-detail-val" id="cardMotherText">${mother}</span></td>
                            </tr>
                            <tr>
                                <td colspan="2"><span class="card-detail-label">អាសយដ្ឋាន :</span> <span class="card-detail-val" id="cardAddressText">${addr}</span></td>
                            </tr>
                        </table>
                    </div>

                    <div class="movable-layer" id="layer-academicYear" data-layer-key="academicYear">
                        <div class="card-academic-year" id="cardAcademicYearText">ឆ្នាំសិក្សា: ${studioConfig.academicYear}</div>
                    </div>
                </div>

                <div class="card-bottom-split">
                    <div class="movable-layer" id="layer-photoFrame" data-layer-key="photoFrame">
                        <div class="card-photo-frame">
                            ${studentPhotoHTML}
                        </div>
                    </div>

                    <div class="card-authority-box">
                        <div class="movable-layer w-100" id="layer-datesAuthority" data-layer-key="datesAuthority">
                            <div class="card-lunar-date" id="cardLunarDateText">${studioConfig.lunarDate}</div>
                            <div class="card-solar-date" id="cardSolarDateText">${studioConfig.solarDate}</div>
                            <div class="card-authority-title">នាយកសាលា</div>
                        </div>

                        <div class="movable-layer" id="layer-stampSignature" data-layer-key="stampSignature" style="${studioConfig.showStampAndSign ? '' : 'display: none;'}">
                            <div class="card-stamp-wrapper">
                                ${buildStampAndSignatureSVG()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Build Studio Canvas Stage HTML (Toolbar + View Toggle + 3D Flip / Dual Mode + Quick Stats)
     */
    function buildStudioCanvasHTML(s) {
        if (!s) return '';
        const cardData = getStudentCardData(s);
        const isDual = (studioViewMode === 'dual');

        let cardBodyHTML = '';
        if (isDual) {
            cardBodyHTML = `
                <div class="studio-dual-container">
                    <div class="studio-dual-card-wrap">
                        <span class="studio-dual-card-label"><i class="fi fi-rr-id-badge me-1"></i>ផ្ទៃខាងមុខ (Front Face)</span>
                        ${buildCardFrontHTML(s)}
                    </div>
                    <div class="studio-dual-card-wrap">
                        <span class="studio-dual-card-label"><i class="fi fi-rr-memo me-1"></i>ផ្ទៃខាងក្រោយ (Back Face)</span>
                        ${buildCardBackHTML(s)}
                    </div>
                </div>
            `;
        } else {
            cardBodyHTML = `
                <!-- 3D Flip Action Button -->
                <div class="text-center mb-3">
                    <button type="button" class="btn-flip-card-3d ${isCardFlipped ? 'active' : ''}" id="btnFlipCard3D" onclick="window.toggleCardFlip3D()">
                        <i class="fi fi-rr-refresh"></i>
                        <span>${isCardFlipped ? 'បង្វិលទៅខាងមុខ (Flip Front)' : 'បង្វិលកាត 3D (Flip)'}</span>
                    </button>
                </div>

                <!-- 3D Flip Card Container -->
                <div class="card-flip-3d-wrapper ${isCardFlipped ? 'is-flipped' : ''}" id="cardFlipWrapper">
                    <div class="card-flip-3d-inner" id="cardFlipInner">
                        <!-- Front Face (ផ្ទៃខាងមុខ) -->
                        <div class="card-flip-face card-flip-front">
                            ${buildCardFrontHTML(s)}
                        </div>

                        <!-- Back Face (ផ្ទៃខាងក្រោយ) -->
                        <div class="card-flip-face card-flip-back">
                            ${buildCardBackHTML(s)}
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            <!-- Top Action Toolbar (ដូចក្នុងរូប: រក្សាទុកការកែប្រែ, ប្តូររូបថត, ដករូបចេញ, កំណត់ដើមវិញ) -->
            <div class="studio-card-toolbar">
                <button type="button" class="btn-studio-save" onclick="window.saveStudioStudentChanges()">
                    <i class="fi fi-rr-disk"></i>
                    <span>រក្សាទុកការកែប្រែ</span>
                </button>
                <button type="button" class="btn-studio-tool text-dark" onclick="document.getElementById('fileStudentPhotoDirect').click()">
                    <i class="fi fi-rr-camera text-primary"></i>
                    <span>ប្តូររូបថត</span>
                </button>
                <button type="button" class="btn-studio-tool text-danger" onclick="window.removeStudentPhoto()">
                    <i class="fi fi-rr-trash text-danger"></i>
                    <span>ដករូបចេញ</span>
                </button>
                <button type="button" class="btn-studio-tool text-secondary" onclick="window.resetStudentCardToOriginal()">
                    <i class="fi fi-rr-refresh"></i>
                    <span>កំណត់ដើមវិញ</span>
                </button>
                <!-- Hidden file input for direct photo upload -->
                <input type="file" id="fileStudentPhotoDirect" class="d-none" accept="image/*" onchange="window.handleDirectPhotoUpload(this)">
            </div>

            <!-- View Mode Switcher Pills (3D Flip vs Dual Side-by-Side) -->
            <div class="studio-view-toggle-bar">
                <button type="button" class="btn-view-toggle ${!isDual ? 'active' : ''}" data-mode="flip" onclick="window.setStudioViewMode('flip')">
                    <i class="fi fi-rr-refresh"></i> <span>🔄 ទិដ្ឋភាព 3D Flip</span>
                </button>
                <button type="button" class="btn-view-toggle ${isDual ? 'active' : ''}" data-mode="dual" onclick="window.setStudioViewMode('dual')">
                    <i class="fi fi-rr-apps"></i> <span>🪪🪪 មើលទាំងមុខក្រោយ (Dual View)</span>
                </button>
            </div>

            <!-- Card View Body -->
            ${cardBodyHTML}

            <!-- Quick Info & Stats Bar -->
            <div class="studio-card-quick-stats">
                <div class="studio-stat-item">
                    <span class="studio-stat-label">អត្តលេខ ID</span>
                    <span class="studio-stat-val text-danger font-poppins">${cardData.id || '-'}</span>
                </div>
                <div class="studio-stat-item">
                    <span class="studio-stat-label">ថ្នាក់រៀន</span>
                    <span class="studio-stat-val text-primary">${s.studyLevel || s.classroom || s.class || '-'}</span>
                </div>
                <div class="studio-stat-item">
                    <span class="studio-stat-label">ទំហំស្តង់ដារ</span>
                    <span class="studio-stat-val font-poppins">54 × 83.4 mm</span>
                </div>
                <div class="d-flex gap-2 align-items-center flex-wrap">
                    <button class="btn btn-sm btn-success rounded-pill px-3 fw-bold shadow-xs" onclick="window.downloadCardAsImage('png')" title="ទាញយករូបភាពកាតជា HD PNG (300 DPI)">
                        <i class="fi fi-rr-download me-1"></i>ទាញយករូបភាព HD
                    </button>
                    <button class="btn btn-sm btn-outline-primary rounded-pill px-2 fw-bold" onclick="window.printSingleCard('front')" title="បោះពុម្ពខាងមុខ">
                        🖨️ មុខ
                    </button>
                    <button class="btn btn-sm btn-outline-info rounded-pill px-2 fw-bold" onclick="window.printSingleCard('back')" title="បោះពុម្ពខាងក្រោយ">
                        🖨️ ក្រោយ
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Generate HTML of Card (Front or Back or MoEYS)
     */
    function buildCardHTML(s, side = 'front') {
        if (!s) s = {};
        if (side === 'back') {
            return buildCardBackHTML(s);
        }
        if (studioConfig.cardTemplate === 'moeys') {
            return buildMoeysCardHTML(s);
        }
        return buildCardFrontHTML(s);
    }

    /**
     * Build Authentic Cambodian Official School Stamp + Signature SVG
     */
    function buildStampAndSignatureSVG() {
        if (studioConfig.customStampUrl) {
            return `
                <img src="${studioConfig.customStampUrl}" class="official-red-stamp" alt="Stamp">
                <svg class="official-blue-signature" viewBox="0 0 160 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 40 C 25 15, 30 50, 45 25 C 55 10, 60 45, 75 30 C 90 15, 110 35, 130 20 C 145 10, 150 40, 155 35" stroke="#1565c0" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
                    <text x="25" y="48" font-family="'Brush Script MT', cursive, sans-serif" font-size="22" font-weight="bold" fill="#1565c0" font-style="italic">Makara Meas</text>
                </svg>
            `;
        }

        return `
            <!-- Authentic Circular Red Seal Stamp -->
            <svg class="official-red-stamp" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <!-- Outer double rings -->
                <circle cx="50" cy="50" r="47" stroke="#d32f2f" stroke-width="2.5" fill="none" opacity="0.95"/>
                <circle cx="50" cy="50" r="42" stroke="#d32f2f" stroke-width="1.2" fill="none" opacity="0.95"/>
                <circle cx="50" cy="50" r="28" stroke="#d32f2f" stroke-width="1.5" fill="none" opacity="0.95"/>
                
                <!-- Circular Text -->
                <path id="stampTextPathTop" d="M 16,50 A 34,34 0 1,1 84,50" fill="none" />
                <path id="stampTextPathBottom" d="M 84,50 A 34,34 0 0,1 16,50" fill="none" />
                
                <text font-family="'Kantumruy Pro', sans-serif" font-size="6.8" font-weight="900" fill="#d32f2f" letter-spacing="0.5">
                    <textPath href="#stampTextPathTop" startOffset="50%" text-anchor="middle">
                        សាលារៀន ធាន ស៊ីន
                    </textPath>
                </text>
                <text font-family="'Kantumruy Pro', sans-serif" font-size="5.8" font-weight="900" fill="#d32f2f" letter-spacing="0.5">
                    <textPath href="#stampTextPathBottom" startOffset="50%" text-anchor="middle">
                        ★ ក្រសួងអប់រំ យុវជន និងកីឡា ★
                    </textPath>
                </text>
                
                <!-- Center 5-pointed Star and Emblem -->
                <polygon points="50,33 54,43 65,43 56,49 59,60 50,53 41,60 44,49 35,43 46,43" fill="#d32f2f" opacity="0.9" />
            </svg>

            <!-- Authentic Blue Handwriting Signature Overlay -->
            <svg class="official-blue-signature" viewBox="0 0 160 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 38 C 28 12, 32 52, 48 24 C 58 8, 64 42, 80 28 C 96 14, 116 32, 134 18 C 146 10, 150 36, 154 32" stroke="#1565c0" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                <text x="24" y="46" font-family="'Brush Script MT', 'Segoe Script', cursive, sans-serif" font-size="21" font-weight="bold" fill="#1565c0" font-style="italic">Makara Meas</text>
            </svg>
        `;
    }

    /**
     * Apply Selected Theme CSS variables to the card
     */
    function applyThemeStyles(theme) {
        const card = document.getElementById('officialCardElement');
        if (!card) return;

        const themes = {
            tianxin: {
                border: '#153e75',
                title: '#1b5e20',
                phone: '#c62828',
                id: '#c62828',
                year: '#c62828',
                accent: '#153e75'
            },
            moeys: {
                border: '#153e75',
                title: '#1b5e20',
                phone: '#c62828',
                id: '#c62828',
                year: '#c62828',
                accent: '#153e75'
            },
            navy: {
                border: '#1e3a8a',
                title: '#1d4ed8',
                phone: '#f59e0b',
                id: '#1e3a8a',
                year: '#1e3a8a',
                accent: '#1e3a8a'
            },
            emerald: {
                border: '#065f46',
                title: '#059669',
                phone: '#d97706',
                id: '#065f46',
                year: '#065f46',
                accent: '#065f46'
            },
            gold: {
                border: '#b45309',
                title: '#78350f',
                phone: '#dc2626',
                id: '#b45309',
                year: '#b45309',
                accent: '#b45309'
            }
        };

        const t = themes[theme] || themes.tianxin || themes.moeys;
        card.style.setProperty('--card-border-color', t.border);
        card.style.setProperty('--card-title-color', t.title);
        card.style.setProperty('--card-phone-color', t.phone);
        card.style.setProperty('--card-id-color', t.id);
        card.style.setProperty('--card-year-color', t.year);
        card.style.setProperty('--card-accent-color', t.accent);

        // Update Theme Cards UI status
        const themeCardOptions = document.querySelectorAll('.theme-card-option');
        themeCardOptions.forEach(el => el.classList.remove('active'));
        const themeOptionIndex = { tianxin: 0, moeys: 1, navy: 2, emerald: 3, gold: 4 }[theme];
        if (themeCardOptions && themeCardOptions[themeOptionIndex] !== undefined) {
            themeCardOptions[themeOptionIndex]?.classList.add('active');
        }
        ['tianxin', 'moeys', 'navy', 'emerald', 'gold'].forEach(k => {
            const st = document.getElementById(`themeStatus-${k}`);
            if (st) st.innerText = k === theme ? '✓ កំពុងប្រើ' : '';
        });
    }

    /**
     * Apply Layer Transforms (Offset X, Y and Scale)
     */
    function applyAllLayerTransforms() {
        Object.keys(studioConfig.layerOffsets).forEach(layerKey => {
            const el = document.getElementById(`layer-${layerKey}`);
            if (!el) return;
            const off = studioConfig.layerOffsets[layerKey];
            const x = off.x || 0;
            const y = off.y || 0;
            const scale = off.scale || 1.0;
            el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
        });

        // Update Controller UI for currently selected layer
        updateControllerSliders();
    }

    function updateControllerSliders() {
        const off = studioConfig.layerOffsets[currentAdjustLayer] || { x: 0, y: 0, scale: 1.0 };
        const slX = document.getElementById('sliderOffsetX');
        const slY = document.getElementById('sliderOffsetY');
        const slSc = document.getElementById('sliderScale');
        const lblX = document.getElementById('lblOffsetX');
        const lblY = document.getElementById('lblOffsetY');
        const lblSc = document.getElementById('lblScaleDisplay');

        if (slX) slX.value = off.x;
        if (slY) slY.value = off.y;
        if (slSc) slSc.value = off.scale;
        if (lblX) lblX.innerText = `${off.x}px`;
        if (lblY) lblY.innerText = `${off.y}px`;
        if (lblSc) lblSc.innerText = `${Math.round(off.scale * 100)}%`;

        document.querySelectorAll('.scale-preset-btn').forEach(btn => {
            const presetVal = parseFloat(btn.innerText) / 100;
            btn.classList.toggle('active', Math.abs(presetVal - off.scale) < 0.01);
        });
    }

    /**
     * Interactive Position Actions
     */
    window.onLayerSelectChange = function (layerKey) {
        currentAdjustLayer = layerKey;
        updateControllerSliders();
    };

    window.setAdjustStep = function (step) {
        adjustStep = parseInt(step) || 5;
        document.querySelectorAll('.step-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.innerText) === adjustStep);
        });
    };

    window.moveLayer = function (dx, dy) {
        if (!studioConfig.layerOffsets[currentAdjustLayer]) {
            studioConfig.layerOffsets[currentAdjustLayer] = { x: 0, y: 0, scale: 1.0 };
        }
        const off = studioConfig.layerOffsets[currentAdjustLayer];
        off.x += dx;
        off.y += dy;
        applyAllLayerTransforms();
    };

    window.resetSelectedLayerPos = function () {
        if (!studioConfig.layerOffsets[currentAdjustLayer]) return;
        studioConfig.layerOffsets[currentAdjustLayer].x = 0;
        studioConfig.layerOffsets[currentAdjustLayer].y = 0;
        applyAllLayerTransforms();
    };

    window.onSliderOffsetChange = function (axis, val) {
        if (!studioConfig.layerOffsets[currentAdjustLayer]) {
            studioConfig.layerOffsets[currentAdjustLayer] = { x: 0, y: 0, scale: 1.0 };
        }
        studioConfig.layerOffsets[currentAdjustLayer][axis] = parseInt(val) || 0;
        applyAllLayerTransforms();
    };

    window.setLayerScale = function (scale) {
        scale = parseFloat(scale) || 1.0;
        if (!studioConfig.layerOffsets[currentAdjustLayer]) {
            studioConfig.layerOffsets[currentAdjustLayer] = { x: 0, y: 0, scale: 1.0 };
        }
        studioConfig.layerOffsets[currentAdjustLayer].scale = scale;
        applyAllLayerTransforms();
    };

    window.toggleDragMode = function () {
        dragModeActive = !dragModeActive;
        const btn = document.getElementById('btnToggleDragMode');
        const stage = document.getElementById('cardCanvasStage');
        if (btn) btn.classList.toggle('active', dragModeActive);
        if (stage) stage.classList.toggle('drag-mode-active', dragModeActive);
    };

    /**
     * Setup Mouse Dragging on Card Layers & Direct Photo Repositioning
     */
    function setupDragEvents() {
        const card = document.getElementById('officialCardElement');
        if (!card) return;

        card.querySelectorAll('.movable-layer').forEach(layer => {
            const key = layer.dataset.layerKey;

            // Direct mouse wheel scaling for photo
            if (key === 'photoFrame') {
                layer.addEventListener('wheel', (e) => {
                    e.preventDefault();
                    if (!studioConfig.layerOffsets[key]) {
                        studioConfig.layerOffsets[key] = { x: 0, y: 0, scale: 1.0 };
                    }
                    const off = studioConfig.layerOffsets[key];
                    const delta = e.deltaY < 0 ? 0.05 : -0.05;
                    off.scale = Math.max(0.5, Math.min(2.5, Math.round((off.scale + delta) * 100) / 100));
                    applyAllLayerTransforms();
                }, { passive: false });
            }

            layer.addEventListener('mousedown', (e) => {
                // Allow direct dragging for photoFrame anytime, or for all layers if dragModeActive
                if (!dragModeActive && key !== 'photoFrame') return;
                e.preventDefault();
                if (!key) return;

                currentAdjustLayer = key;
                const sel = document.getElementById('selectAdjustLayer');
                if (sel) sel.value = key;

                isDragging = true;
                dragStartX = e.clientX;
                dragStartY = e.clientY;

                const off = studioConfig.layerOffsets[key] || { x: 0, y: 0, scale: 1.0 };
                dragStartOffsetX = off.x;
                dragStartOffsetY = off.y;

                layer.classList.add('is-dragging');

                const onMouseMove = (ev) => {
                    if (!isDragging) return;
                    const dx = ev.clientX - dragStartX;
                    const dy = ev.clientY - dragStartY;
                    studioConfig.layerOffsets[key].x = Math.round(dragStartOffsetX + dx);
                    studioConfig.layerOffsets[key].y = Math.round(dragStartOffsetY + dy);
                    applyAllLayerTransforms();
                };

                const onMouseUp = () => {
                    isDragging = false;
                    layer.classList.remove('is-dragging');
                    window.removeEventListener('mousemove', onMouseMove);
                    window.removeEventListener('mouseup', onMouseUp);
                };

                window.addEventListener('mousemove', onMouseMove);
                window.addEventListener('mouseup', onMouseUp);
            });
        });
    }

    /**
     * Card Form Input Handlers
     */
    window.onCardDataInput = function (field, val) {
        studioConfig[field] = val;
        const s = getStudent(currentStudentKey);

        if (field === 'nameKh') {
            if (s) s._overrideNameKh = val;
            const el = document.getElementById('cardNameKhText');
            if (el) el.innerText = val || '-';
        } else if (field === 'nameCh') {
            if (s) s._overrideNameCh = val;
            const el = document.getElementById('cardNameChText');
            if (el) el.innerText = val || '-';
        } else if (field === 'genderKh') {
            if (s) s._overrideGenderKh = val;
            const el = document.getElementById('cardGenderKhText');
            if (el) el.innerText = val || '-';
            const elOld = document.getElementById('cardGenderText');
            if (elOld) elOld.innerText = val || '-';
        } else if (field === 'genderZh') {
            if (s) s._overrideGenderZh = val;
            const el = document.getElementById('cardGenderZhText');
            if (el) el.innerText = val || '-';
        } else if (field === 'phone') {
            if (s) s._overridePhone = val;
            const el = document.getElementById('cardPhoneText');
            if (el) el.innerText = val || '-';
        } else if (field === 'joinDate') {
            if (s) s._overrideDate = val;
            const el = document.getElementById('cardDateText');
            if (el) el.innerText = val || '-';
        } else if (field === 'studentId') {
            if (s) s._overrideId = val;
            const el = document.getElementById('cardStudentIdText');
            if (el) el.innerText = `ID: ${val}`;
        } else if (field === 'schoolName') {
            const el = document.getElementById('cardSchoolPhoneText');
            if (el) el.innerText = val;
        } else if (field === 'academicYear') {
            const el = document.getElementById('cardAcademicYearText');
            if (el) el.innerText = `ឆ្នាំសិក្សា: ${val}`;
        } else if (field === 'lunarDate') {
            const el = document.getElementById('cardLunarDateText');
            if (el) el.innerText = val;
        } else if (field === 'solarDate') {
            const el = document.getElementById('cardSolarDateText');
            if (el) el.innerText = val;
        } else if (field === 'fatherName') {
            const el = document.getElementById('cardFatherText');
            if (el) el.innerText = val || '-';
        } else if (field === 'motherName') {
            const el = document.getElementById('cardMotherText');
            if (el) el.innerText = val || '-';
        } else if (field === 'address') {
            const el = document.getElementById('cardAddressText');
            if (el) el.innerText = val || '-';
        }
    };

    window.toggleCardBorder = function (checked) {
        studioConfig.showOuterBorder = checked;
        const card = document.getElementById('officialCardElement');
        if (card) card.classList.toggle('no-border', !checked);
    };

    window.toggleStampAndSign = function (checked) {
        studioConfig.showStampAndSign = checked;
        const stampLayer = document.getElementById('layer-stampSignature');
        if (stampLayer) stampLayer.style.display = checked ? '' : 'none';
    };

    window.handleCardBgUpload = function (input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                studioConfig.customBgUrl = e.target.result;
                const card = document.getElementById('officialCardElement');
                if (card) {
                    card.style.backgroundImage = `url('${e.target.result}')`;
                    card.style.backgroundSize = '100% 100%';
                }
            };
            reader.readAsDataURL(input.files[0]);
        }
    };

    window.resetCardBackground = function () {
        studioConfig.customBgUrl = 'img/stunden-card.png';
        const card = document.getElementById('officialCardElement');
        if (card) {
            card.style.backgroundImage = "url('img/stunden-card.png')";
            card.style.backgroundSize = "100% 100%";
        }
    };

    window.handleStampUpload = function (input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                studioConfig.customStampUrl = e.target.result;
                const wrapper = document.querySelector('.card-stamp-wrapper');
                if (wrapper) wrapper.innerHTML = buildStampAndSignatureSVG();
            };
            reader.readAsDataURL(input.files[0]);
        }
    };

    window.resetPrincipalStamp = function () {
        studioConfig.customStampUrl = null;
        const wrapper = document.querySelector('.card-stamp-wrapper');
        if (wrapper) wrapper.innerHTML = buildStampAndSignatureSVG();
    };

    window.setCardTheme = function (theme) {
        studioConfig.selectedTheme = theme;
        if (theme === 'tianxin') {
            studioConfig.cardTemplate = 'tianxin';
            studioConfig.customBgUrl = 'img/stunden-card.png';
        } else {
            studioConfig.cardTemplate = 'moeys';
        }
        const s = getStudent(currentStudentKey);
        const stage = document.getElementById('cardCanvasStage');
        if (stage && s) stage.innerHTML = buildStudioCanvasHTML(s);
        applyThemeStyles(theme);
        applyAllLayerTransforms();
        setupDragEvents();
    };

    window.saveStudioTheme = function () {
        try {
            localStorage.setItem('tx_official_card_studio_config', JSON.stringify(studioConfig));
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'success', title: 'បានរក្សាទុក Theme រួចរាល់!', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
            } else {
                alert('បានរក្សាទុក Theme រួចរាល់!');
            }
        } catch (e) {
            console.error('Failed to save config', e);
        }
    };

    window.saveStudioLayoutAndTheme = function () {
        window.saveStudioTheme();
    };

    window.resetStudioAllLayout = function () {
        studioConfig.layerOffsets = JSON.parse(JSON.stringify(defaultConfig.layerOffsets));
        applyAllLayerTransforms();
    };

    /**
     * 3D Flip Card Action: Toggles Front and Back Face with 3D perspective
     */
    window.toggleCardFlip3D = function () {
        isCardFlipped = !isCardFlipped;
        currentCardSide = isCardFlipped ? 'back' : 'front';
        const wrapper = document.getElementById('cardFlipWrapper');
        const btn = document.getElementById('btnFlipCard3D');
        if (wrapper) wrapper.classList.toggle('is-flipped', isCardFlipped);
        if (btn) {
            btn.classList.toggle('active', isCardFlipped);
            btn.innerHTML = `<i class="fi fi-rr-refresh"></i> <span>${isCardFlipped ? 'បង្វិលទៅខាងមុខ (Flip Front)' : 'បង្វិលកាត 3D (Flip)'}</span>`;
        }
        document.querySelectorAll('.btn-card-side-toggle').forEach(b => {
            const side = b.dataset.side;
            const active = (side === currentCardSide);
            b.classList.toggle('btn-primary', active);
            b.classList.toggle('btn-outline-primary', !active);
        });
    };

    /**
     * Switch directly to Front or Back face
     */
    window.setCardSide = function (side) {
        if (side === 'front') {
            isCardFlipped = false;
            currentCardSide = 'front';
        } else {
            isCardFlipped = true;
            currentCardSide = 'back';
        }
        const wrapper = document.getElementById('cardFlipWrapper');
        const btn = document.getElementById('btnFlipCard3D');
        if (wrapper) wrapper.classList.toggle('is-flipped', isCardFlipped);
        if (btn) {
            btn.classList.toggle('active', isCardFlipped);
            btn.innerHTML = `<i class="fi fi-rr-refresh"></i> <span>${isCardFlipped ? 'បង្វិលទៅខាងមុខ (Flip Front)' : 'បង្វិលកាត 3D (Flip)'}</span>`;
        }
        document.querySelectorAll('.btn-card-side-toggle').forEach(b => {
            const bSide = b.dataset.side;
            const active = (bSide === currentCardSide);
            b.classList.toggle('btn-primary', active);
            b.classList.toggle('btn-outline-primary', !active);
        });
    };

    /**
     * Save Student Changes from Card 2 and Toolbar
     */
    window.saveStudioStudentChanges = function () {
        const s = getStudent(currentStudentKey);
        if (!s) return;

        const nameKh = document.getElementById('inputNameKh')?.value;
        const nameCh = document.getElementById('inputNameCh')?.value;
        const genderKh = document.getElementById('inputGenderKh')?.value;
        const genderZh = document.getElementById('inputGenderZh')?.value;
        const phone = document.getElementById('inputPhone')?.value;
        const joinDate = document.getElementById('inputJoinDate')?.value;
        const studentId = document.getElementById('inputStudentId')?.value;

        if (nameKh !== undefined) s._overrideNameKh = nameKh;
        if (nameCh !== undefined) s._overrideNameCh = nameCh;
        if (genderKh !== undefined) s._overrideGenderKh = genderKh;
        if (genderZh !== undefined) s._overrideGenderZh = genderZh;
        if (phone !== undefined) s._overridePhone = phone;
        if (joinDate !== undefined) s._overrideDate = joinDate;
        if (studentId !== undefined) s._overrideId = studentId;

        const overrides = {
            nameKh: s._overrideNameKh,
            nameCh: s._overrideNameCh,
            genderKh: s._overrideGenderKh,
            genderZh: s._overrideGenderZh,
            phone: s._overridePhone,
            joinDate: s._overrideDate,
            studentId: s._overrideId
        };

        const key = currentStudentKey;
        try {
            localStorage.setItem(`tx_student_card_overrides_${key}`, JSON.stringify(overrides));
        } catch (e) {}

        // Persist studio theme/layout
        window.saveStudioTheme();

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'បានរក្សាទុកការកែប្រែទិន្នន័យសិស្សជោគជ័យ!',
                timer: 1600,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
            });
        } else {
            alert('បានរក្សាទុកការកែប្រែទិន្នន័យសិស្សជោគជ័យ!');
        }
    };

    /**
     * Upload photo directly from the toolbar button
     */
    window.handleDirectPhotoUpload = function (input) {
        if (input.files && input.files[0]) {
            const file = input.files[0];
            const reader = new FileReader();
            reader.onload = function (e) {
                const dataUrl = e.target.result;
                const s = getStudent(currentStudentKey);
                if (s) {
                    s.imageUrl = dataUrl;
                    s._overridePhotoUrl = dataUrl;
                    try {
                        localStorage.setItem(`tx_student_card_photo_${currentStudentKey}`, dataUrl);
                    } catch (err) {}
                }
                // Refresh photo element
                const box = document.querySelector('.card-tianxin-photo-box');
                if (box) {
                    box.innerHTML = `<img src="${dataUrl}" class="card-student-photo" id="cardPhotoImg" alt="Photo">`;
                }
                const aiAvatar = document.getElementById('aiActiveStudentAvatar');
                if (aiAvatar) {
                    aiAvatar.innerHTML = `<img src="${dataUrl}" class="w-100 h-100" style="object-fit:cover;" alt="Avatar">`;
                }
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'success',
                        title: 'បានប្តូររូបថតសិស្សជោគជ័យ!',
                        timer: 1500,
                        showConfirmButton: false,
                        toast: true,
                        position: 'top-end'
                    });
                }
            };
            reader.readAsDataURL(file);
        }
    };

    /**
     * Remove student photo and reset to default avatar
     */
    window.removeStudentPhoto = function () {
        const s = getStudent(currentStudentKey);
        if (s) {
            s.imageUrl = '';
            s._overridePhotoUrl = '';
            try {
                localStorage.removeItem(`tx_student_card_photo_${currentStudentKey}`);
            } catch (err) {}
        }
        const isFemale = (s && (s.gender === 'Female' || s.gender === 'ស្រី'));
        const placeholderHTML = `
            <svg viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg" class="card-student-photo" id="cardPhotoImg">
                <rect width="100" height="130" fill="#2563eb"/>
                <path d="M12,130 Q16,95 38,90 L50,105 L62,90 Q84,95 88,130 Z" fill="#ffffff"/>
                <path d="M42,92 L50,105 L58,92 Z" fill="#cbd5e1"/>
                <rect x="43" y="72" width="14" height="22" fill="#fde68a" rx="2"/>
                <circle cx="50" cy="55" r="22" fill="#fed7aa"/>
                <path d="M28,52 C28,32 35,26 50,26 C65,26 72,32 72,52 C70,42 63,36 50,36 C37,36 30,42 28,52 Z" fill="#1e293b"/>
                <circle cx="43" cy="54" r="2.2" fill="#0f172a"/>
                <circle cx="57" cy="54" r="2.2" fill="#0f172a"/>
                <path d="M46,65 Q50,68 54,65" stroke="#9a3412" stroke-width="1.6" fill="none" stroke-linecap="round"/>
            </svg>
        `;
        const box = document.querySelector('.card-tianxin-photo-box');
        if (box) box.innerHTML = placeholderHTML;
        const aiAvatar = document.getElementById('aiActiveStudentAvatar');
        if (aiAvatar) aiAvatar.innerText = isFemale ? '👧' : '👦';

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'info',
                title: 'បានដករូបថតចេញរួចរាល់',
                timer: 1500,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
            });
        }
    };

    /**
     * Reset student card values to database original
     */
    
    /**
     * Switch between Studio Dock Tabs (info | theme | position | ai)
     */
    
    const TYPO_FIELD_ELEMENTS = {
        studentId: '#layer-studentId',
        nameKh: '#layer-nameKh',
        nameCh: '#layer-nameCh',
        genderKh: '#layer-genderKh',
        genderZh: '#layer-genderZh',
        phone: '#layer-phone',
        date: '#layer-date'
    };

    /**
     * Switch currently selected field in Typography Customizer
     */
    window.onTypoFieldChange = function (fieldKey) {
        currentTypoField = fieldKey;
        if (!studioConfig.fieldStyles) studioConfig.fieldStyles = JSON.parse(JSON.stringify(defaultConfig.fieldStyles));
        const s = studioConfig.fieldStyles[fieldKey] || defaultConfig.fieldStyles[fieldKey];
        if (!s) return;

        // Update color
        const colorInput = document.getElementById('inputTypoColor');
        const colorLabel = document.getElementById('lblTypoColorHex');
        if (colorInput) colorInput.value = s.color || '#0f172a';
        if (colorLabel) colorLabel.innerText = s.color || '#0f172a';

        // Update font
        const fontSelect = document.getElementById('selectTypoFont');
        if (fontSelect) fontSelect.value = s.font || "'Poppins', sans-serif";

        // Update size
        const sizeSlider = document.getElementById('sliderTypoSize');
        const sizeLabel = document.getElementById('lblTypoSize');
        if (sizeSlider) sizeSlider.value = s.size || 15;
        if (sizeLabel) sizeLabel.innerText = (s.size || 15) + ' px';

        // Update bold / italic buttons
        const btnBold = document.getElementById('btnTypoBold');
        const btnItalic = document.getElementById('btnTypoItalic');
        if (btnBold) btnBold.classList.toggle('active', !!s.bold);
        if (btnItalic) btnItalic.classList.toggle('active', !!s.italic);
    };

    /**
     * Change Color of currently selected field
     */
    window.onTypoColorChange = function (color) {
        if (!studioConfig.fieldStyles) studioConfig.fieldStyles = JSON.parse(JSON.stringify(defaultConfig.fieldStyles));
        if (!studioConfig.fieldStyles[currentTypoField]) {
            studioConfig.fieldStyles[currentTypoField] = { ...defaultConfig.fieldStyles[currentTypoField] };
        }
        studioConfig.fieldStyles[currentTypoField].color = color;

        const colorInput = document.getElementById('inputTypoColor');
        const colorLabel = document.getElementById('lblTypoColorHex');
        if (colorInput) colorInput.value = color;
        if (colorLabel) colorLabel.innerText = color;

        // Apply immediately to card DOM
        const sel = TYPO_FIELD_ELEMENTS[currentTypoField];
        const el = document.querySelector(sel);
        if (el) el.style.setProperty('color', color, 'important');
        window.saveStudioThemeSilently();
    };

    /**
     * Change Font Family of currently selected field
     */
    window.onTypoFontChange = function (font) {
        if (!studioConfig.fieldStyles) studioConfig.fieldStyles = JSON.parse(JSON.stringify(defaultConfig.fieldStyles));
        if (!studioConfig.fieldStyles[currentTypoField]) {
            studioConfig.fieldStyles[currentTypoField] = { ...defaultConfig.fieldStyles[currentTypoField] };
        }
        studioConfig.fieldStyles[currentTypoField].font = font;

        // Apply immediately to card DOM
        const sel = TYPO_FIELD_ELEMENTS[currentTypoField];
        const el = document.querySelector(sel);
        if (el) el.style.setProperty('font-family', font, 'important');
        window.saveStudioThemeSilently();
    };

    /**
     * Change Font Size of currently selected field
     */
    window.onTypoSizeChange = function (size) {
        size = parseFloat(size) || 14;
        if (!studioConfig.fieldStyles) studioConfig.fieldStyles = JSON.parse(JSON.stringify(defaultConfig.fieldStyles));
        if (!studioConfig.fieldStyles[currentTypoField]) {
            studioConfig.fieldStyles[currentTypoField] = { ...defaultConfig.fieldStyles[currentTypoField] };
        }
        studioConfig.fieldStyles[currentTypoField].size = size;

        const sizeSlider = document.getElementById('sliderTypoSize');
        const sizeLabel = document.getElementById('lblTypoSize');
        if (sizeSlider) sizeSlider.value = size;
        if (sizeLabel) sizeLabel.innerText = size + ' px';

        // Apply immediately to card DOM
        const sel = TYPO_FIELD_ELEMENTS[currentTypoField];
        const el = document.querySelector(sel);
        if (el) el.style.setProperty('font-size', size + 'px', 'important');
        window.saveStudioThemeSilently();
    };

    /**
     * Toggle Bold Style
     */
    window.toggleTypoBold = function () {
        if (!studioConfig.fieldStyles) studioConfig.fieldStyles = JSON.parse(JSON.stringify(defaultConfig.fieldStyles));
        if (!studioConfig.fieldStyles[currentTypoField]) {
            studioConfig.fieldStyles[currentTypoField] = { ...defaultConfig.fieldStyles[currentTypoField] };
        }
        const isBold = !studioConfig.fieldStyles[currentTypoField].bold;
        studioConfig.fieldStyles[currentTypoField].bold = isBold;

        const btnBold = document.getElementById('btnTypoBold');
        if (btnBold) btnBold.classList.toggle('active', isBold);

        const sel = TYPO_FIELD_ELEMENTS[currentTypoField];
        const el = document.querySelector(sel);
        if (el) el.style.setProperty('font-weight', isBold ? '800' : '400', 'important');
        window.saveStudioThemeSilently();
    };

    /**
     * Toggle Italic Style
     */
    window.toggleTypoItalic = function () {
        if (!studioConfig.fieldStyles) studioConfig.fieldStyles = JSON.parse(JSON.stringify(defaultConfig.fieldStyles));
        if (!studioConfig.fieldStyles[currentTypoField]) {
            studioConfig.fieldStyles[currentTypoField] = { ...defaultConfig.fieldStyles[currentTypoField] };
        }
        const isItalic = !studioConfig.fieldStyles[currentTypoField].italic;
        studioConfig.fieldStyles[currentTypoField].italic = isItalic;

        const btnItalic = document.getElementById('btnTypoItalic');
        if (btnItalic) btnItalic.classList.toggle('active', isItalic);

        const sel = TYPO_FIELD_ELEMENTS[currentTypoField];
        const el = document.querySelector(sel);
        if (el) el.style.setProperty('font-style', isItalic ? 'italic' : 'normal', 'important');
        window.saveStudioThemeSilently();
    };

    /**
     * Reset Field Typography Styles to Default
     */
    window.resetFieldStylesToDefault = function () {
        studioConfig.fieldStyles = JSON.parse(JSON.stringify(defaultConfig.fieldStyles));
        const s = getStudent(currentStudentKey);
        const stage = document.getElementById('cardCanvasStage');
        if (stage && s) {
            stage.innerHTML = buildStudioCanvasHTML(s);
            applyAllLayerTransforms();
            setupDragEvents();
        }
        window.onTypoFieldChange(currentTypoField);
        window.saveStudioThemeSilently();
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'success', title: 'បានកំណត់ពុម្ពអក្សរដើមវិញ!', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
        }
    };

    /**
     * Silently persist studio configuration
     */
    window.saveStudioThemeSilently = function () {
        try {
            localStorage.setItem('tx_official_card_studio_config', JSON.stringify(studioConfig));
        } catch (e) {}
    };


    window.setStudioDockTab = function (tabName) {
        activeStudioDockTab = tabName;
        document.querySelectorAll('.studio-dock-nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        document.querySelectorAll('.studio-tab-pane').forEach(pane => {
            pane.style.display = (pane.id === 'studioTabPane-' + tabName) ? 'block' : 'none';
        });
    };

    /**
     * Switch between 3D Flip mode and Side-by-Side Dual View mode
     */
    window.setStudioViewMode = function (mode) {
        studioViewMode = mode;
        const s = getStudent(currentStudentKey);
        const stage = document.getElementById('cardCanvasStage');
        if (stage && s) {
            stage.innerHTML = buildStudioCanvasHTML(s);
            applyAllLayerTransforms();
            setupDragEvents();
        }
    };


    window.resetStudentCardToOriginal = function () {
        const s = getStudent(currentStudentKey);
        if (!s) return;
        delete s._overrideNameKh;
        delete s._overrideNameCh;
        delete s._overrideGenderKh;
        delete s._overrideGenderZh;
        delete s._overridePhone;
        delete s._overrideDate;
        delete s._overrideId;
        delete s._overridePhotoUrl;
        try {
            localStorage.removeItem(`tx_student_card_overrides_${currentStudentKey}`);
            localStorage.removeItem(`tx_student_card_photo_${currentStudentKey}`);
        } catch (e) {}

        window.selectStudioStudent(currentStudentKey);
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'បានកំណត់ទិន្នន័យដើមវិញជោគជ័យ!',
                timer: 1500,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
            });
        }
    };

    /**
     * Category Switcher & Class Updater
     */
    window.setStudioCategory = function (cat) {
        currentCategory = cat;
        selectedClass = 'all';
        searchQuery = '';

        const searchInput = document.getElementById('studioSearchStudentInput');
        if (searchInput) searchInput.value = '';

        // Update category buttons active state
        ['chinese', 'parttime', 'trilingual'].forEach(k => {
            const btn = document.getElementById(`studioCatBtn-${k}`);
            if (btn) btn.classList.toggle('active', k === cat);
        });

        // Update class options for this category
        updateStudioClassDropdown();

        // Apply filtering and update student list and card preview
        applyStudentFilters(true);
    };

    function updateStudioClassDropdown() {
        const all = getAllStudents();
        const catStudents = all.filter(st => matchesCategory(st, currentCategory));
        const classSet = new Set();
        catStudents.forEach(st => {
            const c = (st.studyLevel || st.classroom || st.class || '').trim();
            if (c) classSet.add(c);
        });
        const classes = Array.from(classSet).sort();

        const classSelect = document.getElementById('studioClassFilter');
        if (classSelect) {
            const catName = getCategoryKhmerName(currentCategory);
            classSelect.innerHTML = `
                <option value="all">🏫 គ្រប់ថ្នាក់ទាំងអស់ (${catName})</option>
                ${classes.map(c => `<option value="${c}">ថ្នាក់: ${c}</option>`).join('')}
            `;
            classSelect.value = 'all';
        }
    }

    /**
     * Student Selection & Filtering
     */
    window.onStudioClassFilterChange = function (cls) {
        selectedClass = cls;
        applyStudentFilters(true);
    };

    window.onStudioStudentSearch = function (q) {
        searchQuery = q.toLowerCase().trim();
        applyStudentFilters(true);
    };

    function applyStudentFilters(autoSelectFirstIfMissing = true) {
        const all = getAllStudents();
        filteredStudents = all.filter(st => {
            // Category filter
            if (!matchesCategory(st, currentCategory)) return false;

            // Class filter
            if (selectedClass !== 'all') {
                const c = (st.studyLevel || st.classroom || st.class || '').trim();
                if (c !== selectedClass) return false;
            }

            // Search query filter
            if (searchQuery) {
                const name = `${st.lastName || ''} ${st.firstName || ''}`.toLowerCase();
                const id = (st.displayId || st.id || '').toLowerCase();
                const phone = (st.parentPhone || st.phone || '').toLowerCase();
                const cls = (st.studyLevel || st.classroom || st.class || '').toLowerCase();
                if (!name.includes(searchQuery) && !id.includes(searchQuery) && !phone.includes(searchQuery) && !cls.includes(searchQuery)) {
                    return false;
                }
            }
            return true;
        });

        // Update badge count
        const badge = document.getElementById('studioBadgeStudentCount');
        if (badge) badge.innerText = `${filteredStudents.length} នាក់`;

        // Update category counts
        const chCount = all.filter(isStudentChineseFullTime).length;
        const ptCount = all.filter(isStudentPartTime).length;
        const trCount = all.filter(isStudentTrilingual).length;
        const cCh = document.getElementById('studioCount-chinese');
        if (cCh) cCh.innerText = chCount;
        const cPt = document.getElementById('studioCount-parttime');
        if (cPt) cPt.innerText = ptCount;
        const cTr = document.getElementById('studioCount-trilingual');
        if (cTr) cTr.innerText = trCount;

        // Update student select dropdown
        const sel = document.getElementById('studioStudentDropdown');
        if (sel) {
            sel.innerHTML = buildStudentSelectOptions(filteredStudents, currentStudentKey);
            if (filteredStudents.length > 0) {
                const exists = filteredStudents.some(st => (st.key || st.id) === currentStudentKey);
                if (!exists && autoSelectFirstIfMissing) {
                    const firstKey = filteredStudents[0].key || filteredStudents[0].id;
                    sel.value = firstKey;
                    window.selectStudioStudent(firstKey);
                } else if (exists) {
                    sel.value = currentStudentKey;
                }
            } else {
                // Empty list
                const stage = document.getElementById('cardCanvasStage');
                if (stage) {
                    stage.innerHTML = `
                        <div class="card border-0 shadow-sm rounded-4 p-5 text-center bg-white my-4">
                            <div class="fs-1 mb-2">🔍</div>
                            <h5 class="fw-bold text-dark font-moul">រកមិនឃើញសិស្សក្នុងប្រភេទនេះទេ</h5>
                            <p class="text-muted small mb-0">សូមជ្រើសរើសប្រភេទសិស្ស ឬថ្នាក់រៀនផ្សេងទៀត</p>
                        </div>
                    `;
                }
            }
        }
    }

    window.selectStudioStudent = function (key) {
        if (!key) return;
        currentStudentKey = key;
        const s = getStudent(key);
        if (!s) return;

        const cardData = getStudentCardData(s);

        // Update form fields for Tian Xin Official card
        const fNameKh = document.getElementById('inputNameKh');
        if (fNameKh) fNameKh.value = cardData.nameKh || '';
        const fNameCh = document.getElementById('inputNameCh');
        if (fNameCh) fNameCh.value = cardData.nameCh || '';
        const fGenderKh = document.getElementById('inputGenderKh');
        if (fGenderKh) fGenderKh.value = cardData.genderKh || 'ប្រុស';
        const fGenderZh = document.getElementById('inputGenderZh');
        if (fGenderZh) fGenderZh.value = cardData.genderZh || '男';
        const fPhone = document.getElementById('inputPhone');
        if (fPhone) fPhone.value = cardData.phone || '';
        const fJoinDate = document.getElementById('inputJoinDate');
        if (fJoinDate) fJoinDate.value = cardData.joinDate || '';
        const fId = document.getElementById('inputStudentId');
        if (fId) fId.value = cardData.id || '';

        // Legacy fields if present
        const fFather = document.getElementById('inputFatherName');
        if (fFather) fFather.value = s.fatherName || '';
        const fMother = document.getElementById('inputMotherName');
        if (fMother) fMother.value = s.motherName || '';
        const fAddr = document.getElementById('inputAddress');
        if (fAddr) fAddr.value = s.address || s.currentAddress || '';

        // Dynamic update active student context in AI Studio Card
        const aiName = document.getElementById('aiActiveStudentName');
        const aiMeta = document.getElementById('aiActiveStudentMeta');
        const aiAvatar = document.getElementById('aiActiveStudentAvatar');
        const isFemale = (s.gender === 'Female' || s.gender === 'ស្រី' || cardData.genderKh === 'ស្រី');
        if (aiName) aiName.innerText = `${cardData.nameKh} (${cardData.id})`;
        if (aiMeta) aiMeta.innerText = `ភេទ: ${cardData.genderKh} • ថ្នាក់: ${s.studyLevel || s.classroom || s.class || '-'}`;
        if (aiAvatar) {
            if (cardData.photoUrl) {
                aiAvatar.innerHTML = `<img src="${cardData.photoUrl}" class="w-100 h-100" style="object-fit:cover;" alt="Avatar">`;
            } else {
                aiAvatar.innerText = isFemale ? '👧' : '👦';
            }
        }

        // Re-render card preview
        const stage = document.getElementById('cardCanvasStage');
        if (stage) stage.innerHTML = buildStudioCanvasHTML(s);

        applyThemeStyles(studioConfig.selectedTheme);
        applyAllLayerTransforms();
        setupDragEvents();
    };

    window.navigateStudioStudent = function (dir) {
        if (!filteredStudents || filteredStudents.length === 0) return;
        let idx = filteredStudents.findIndex(st => (st.key || st.id) === currentStudentKey);
        if (idx === -1) idx = 0;
        let newIdx = idx + dir;
        if (newIdx < 0) newIdx = filteredStudents.length - 1;
        if (newIdx >= filteredStudents.length) newIdx = 0;

        const nextKey = filteredStudents[newIdx].key || filteredStudents[newIdx].id;
        const sel = document.getElementById('studioStudentDropdown');
        if (sel) sel.value = nextKey;
        window.selectStudioStudent(nextKey);
    };

    /**
     * Download Card as PNG or JPG (High DPI via html2canvas with Clean Clone & Multi-Side Support)
     */
    window.downloadCardAsImage = function (format = 'png', targetSide = null) {
        if (!targetSide) {
            targetSide = (studioViewMode === 'dual') ? 'front' : (isCardFlipped ? 'back' : 'front');
        }

        if (typeof html2canvas === 'undefined') {
            alert('កំពុងទាញយក Library html2canvas សូមរង់ចាំបន្តិច...');
            return;
        }

        const s = getStudent(currentStudentKey) || {};
        const id = s.displayId || s.id || 'STD-1001';
        const name = `${s.lastName || ''} ${s.firstName || ''}`.trim() || 'Student';

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'កំពុងទាញយករូបភាពកាត...',
                html: 'សូមរង់ចាំបន្តិច ប្រព័ន្ធកំពុងដំណើរការបង្កើតរូបភាព HD 300 DPI',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
        }

        const captureAndSave = (side) => {
            return new Promise((resolve, reject) => {
                const cloneWrapper = document.createElement('div');
                cloneWrapper.style.position = 'fixed';
                cloneWrapper.style.left = '-99999px';
                cloneWrapper.style.top = '0';
                cloneWrapper.style.zIndex = '-99999';
                cloneWrapper.style.opacity = '1';
                cloneWrapper.style.transform = 'none';

                const cardHTML = (side === 'back') ? buildCardBackHTML(s) : buildCardFrontHTML(s);
                cloneWrapper.innerHTML = cardHTML;
                document.body.appendChild(cloneWrapper);

                const cardEl = cloneWrapper.firstElementChild;
                if (!cardEl) {
                    if (cloneWrapper.parentNode) document.body.removeChild(cloneWrapper);
                    reject(new Error('Card element not found'));
                    return;
                }

                // Apply transforms if front
                if (side === 'front') {
                    Object.keys(studioConfig.layerOffsets).forEach(layerKey => {
                        const el = cardEl.querySelector(`#layer-${layerKey}`);
                        if (!el) return;
                        const off = studioConfig.layerOffsets[layerKey];
                        const x = off.x || 0;
                        const y = off.y || 0;
                        const scale = off.scale || 1.0;
                        el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
                    });
                }

                inlineAllCardImages(cloneWrapper).then(() => {
                    html2canvas(cardEl, {
                        scale: 3,
                        useCORS: true,
                        allowTaint: true,
                        backgroundColor: null,
                        logging: false
                    }).then(canvas => {
                        const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
                        const ext = format === 'jpeg' ? 'jpg' : 'png';
                        const sideName = side === 'back' ? 'Back' : 'Front';
                        const link = document.createElement('a');
                        link.download = `Student_Card_${id}_${name}_${sideName}.${ext}`;
                        link.href = canvas.toDataURL(mimeType, 0.95);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        if (cloneWrapper.parentNode) document.body.removeChild(cloneWrapper);
                        resolve();
                    }).catch(err => {
                        if (cloneWrapper.parentNode) document.body.removeChild(cloneWrapper);
                        reject(err);
                    });
                }).catch(err => {
                    if (cloneWrapper.parentNode) document.body.removeChild(cloneWrapper);
                    reject(err);
                });
                return;
            });
        };

        if (targetSide === 'both') {
            captureAndSave('front').then(() => {
                setTimeout(() => {
                    captureAndSave('back').then(() => {
                        if (typeof Swal !== 'undefined') {
                            Swal.fire({
                                icon: 'success',
                                title: 'បានទាញយករូបភាពទាំងមុខ-ក្រោយជោគជ័យ!',
                                timer: 1800,
                                showConfirmButton: false,
                                toast: true,
                                position: 'top-end'
                            });
                        }
                    });
                }, 400);
            }).catch(err => {
                console.error('Download card error', err);
                if (typeof Swal !== 'undefined') Swal.close();
                alert('បរាជ័យក្នុងការទាញយករូបភាព: ' + err.message);
            });
        } else {
            captureAndSave(targetSide).then(() => {
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'success',
                        title: 'បានទាញយករូបភាពកាតជោគជ័យ!',
                        timer: 1600,
                        showConfirmButton: false,
                        toast: true,
                        position: 'top-end'
                    });
                }
            }).catch(err => {
                console.error('Download card error', err);
                if (typeof Swal !== 'undefined') Swal.close();
                alert('បរាជ័យក្នុងការទាញយករូបភាព: ' + err.message);
            });
        }
    };

    /**
     * Download Card as PDF (Single CR80 Card Size)
     */
    window.downloadCardAsPDF = function (targetSide = null) {
        if (!targetSide) {
            targetSide = (studioViewMode === 'dual') ? 'front' : (isCardFlipped ? 'back' : 'front');
        }

        if (typeof html2canvas === 'undefined' || (typeof jspdf === 'undefined' && typeof window.jspdf === 'undefined')) {
            alert('PDF Library មិនទាន់ផ្ទុកពេញលេញទេ! សូមប្រើមុខងារបោះពុម្ព (Print)');
            window.printSingleCard(targetSide);
            return;
        }

        const jsPDF = window.jspdf ? window.jspdf.jsPDF : window.jsPDF;
        if (!jsPDF) {
            window.printSingleCard(targetSide);
            return;
        }

        const s = getStudent(currentStudentKey) || {};
        const id = s.displayId || s.id || 'STD-1001';
        const name = `${s.lastName || ''} ${s.firstName || ''}`.trim() || 'Student';

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'កំពុងបង្កើតឯកសារ PDF...',
                html: 'សូមរង់ចាំបន្តិច កំពុងទាញយកទំហំ 54 × 83.4 mm',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
        }

        const renderCanvas = (side) => {
            return new Promise((resolve, reject) => {
                const cloneWrapper = document.createElement('div');
                cloneWrapper.style.position = 'fixed';
                cloneWrapper.style.left = '-99999px';
                cloneWrapper.style.top = '0';
                cloneWrapper.style.zIndex = '-99999';
                cloneWrapper.style.transform = 'none';

                const cardHTML = (side === 'back') ? buildCardBackHTML(s) : buildCardFrontHTML(s);
                cloneWrapper.innerHTML = cardHTML;
                document.body.appendChild(cloneWrapper);

                const cardEl = cloneWrapper.firstElementChild;
                if (!cardEl) {
                    if (cloneWrapper.parentNode) document.body.removeChild(cloneWrapper);
                    reject(new Error('Card not found'));
                    return;
                }

                if (side === 'front') {
                    Object.keys(studioConfig.layerOffsets).forEach(layerKey => {
                        const el = cardEl.querySelector(`#layer-${layerKey}`);
                        if (!el) return;
                        const off = studioConfig.layerOffsets[layerKey];
                        el.style.transform = `translate(${off.x || 0}px, ${off.y || 0}px) scale(${off.scale || 1.0})`;
                    });
                }

                inlineAllCardImages(cloneWrapper).then(() => {
                    html2canvas(cardEl, { scale: 3, useCORS: true, allowTaint: true, backgroundColor: null }).then(canvas => {
                        if (cloneWrapper.parentNode) document.body.removeChild(cloneWrapper);
                        resolve(canvas.toDataURL('image/png'));
                    }).catch(err => {
                        if (cloneWrapper.parentNode) document.body.removeChild(cloneWrapper);
                        reject(err);
                    });
                }).catch(err => {
                    if (cloneWrapper.parentNode) document.body.removeChild(cloneWrapper);
                    reject(err);
                });
                return;
            });
        };

        if (targetSide === 'both') {
            Promise.all([renderCanvas('front'), renderCanvas('back')]).then(([frontImg, backImg]) => {
                const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [54, 83.4] });
                pdf.addImage(frontImg, 'PNG', 0, 0, 54, 83.4);
                pdf.addPage([54, 83.4], 'portrait');
                pdf.addImage(backImg, 'PNG', 0, 0, 54, 83.4);
                pdf.save(`Student_Card_${id}_${name}_Duplex.pdf`);
                if (typeof Swal !== 'undefined') Swal.close();
            }).catch(err => {
                if (typeof Swal !== 'undefined') Swal.close();
                alert('បរាជ័យក្នុងការទាញយក PDF: ' + err.message);
            });
        } else {
            renderCanvas(targetSide).then(imgData => {
                const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [54, 83.4] });
                pdf.addImage(imgData, 'PNG', 0, 0, 54, 83.4);
                pdf.save(`Student_Card_${id}_${name}_${targetSide}.pdf`);
                if (typeof Swal !== 'undefined') Swal.close();
            }).catch(err => {
                if (typeof Swal !== 'undefined') Swal.close();
                alert('បរាជ័យក្នុងការទាញយក PDF: ' + err.message);
            });
        }
    };

    /**
     * Single Card Print
     */
    window.printSingleCard = function (targetSide = null) {
        if (!targetSide) {
            targetSide = isCardFlipped ? 'back' : 'front';
        }

        const s = getStudent(currentStudentKey) || {};
        let printCardsHtml = '';
        if (targetSide === 'front') {
            printCardsHtml = buildCardFrontHTML(s);
        } else if (targetSide === 'back') {
            printCardsHtml = buildCardBackHTML(s);
        } else {
            // Both sides (Duplex print)
            printCardsHtml = `
                <div class="print-single-card-page">${buildCardFrontHTML(s)}</div>
                <div class="print-single-card-page" style="page-break-before: always; break-before: page;">${buildCardBackHTML(s)}</div>
            `;
        }

        // Capture all studio styles
        let styles = '';
        document.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => {
            if (el.tagName.toLowerCase() === 'style') {
                styles += el.innerHTML;
            }
        });

        const win = window.open('', '_blank', 'width=800,height=900');
        if (!win) {
            alert('សូមអនុញ្ញាត Popups សម្រាប់គេហទំព័រនេះ!');
            return;
        }

        const baseHref = window.location.href.split('?')[0].split('#')[0].replace(/\/[^\/]*$/, '/');
        win.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <base href="${baseHref}">
                <title>Student ID Card - ${s.lastName || ''} ${s.firstName || ''} (${targetSide.toUpperCase()})</title>
                <link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;700&family=Moul&family=Noto+Sans+SC:wght@400;700;900&family=Poppins:wght@400;600;700;900&display=swap" rel="stylesheet">
                <link rel="stylesheet" href="css/student-card-studio.css?v=20261021">
                <style>
                    ${styles}
                    body {
                        margin: 0;
                        padding: 0;
                        background: #f1f5f9;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        font-family: 'Kantumruy Pro', 'Noto Sans SC', sans-serif;
                    }
                    .moeys-id-card, .tianxin-official-card, .tianxin-official-card-back {
                        width: 54mm !important;
                        height: 83.4mm !important;
                        box-shadow: none !important;
                        margin: 0 auto;
                        position: relative !important;
                    }
                    @media print {
                        @page {
                            size: 54mm 83.4mm;
                            margin: 0;
                        }
                        body {
                            background: white !important;
                            display: block !important;
                        }
                        .print-single-card-page {
                            width: 54mm !important;
                            height: 83.4mm !important;
                            page-break-after: always;
                            break-after: page;
                        }
                        .moeys-id-card, .tianxin-official-card, .tianxin-official-card-back {
                            box-shadow: none !important;
                            position: relative !important;
                            top: 0 !important;
                            left: 0 !important;
                        }
                    }
                </style>
            </head>
            <body onload="setTimeout(() => { window.print(); }, 600);">
                ${printCardsHtml}
            </body>
            </html>
        `);
        win.document.close();
    };

    /**
     * Quick download whole selected class
     */
    window.downloadClassCards = function () {
        window.openBatchPrintCardModal('both');
    };

    /**
     * Batch Print Modal (8 cards per A4 sheet with cutting guides)
     */
    window.openBatchPrintCardModal = function (targetSide = 'both') {
        const students = filteredStudents.length > 0 ? filteredStudents : getAllStudents();
        const win = window.open('', '_blank', 'width=1000,height=900');
        if (!win) {
            alert('សូមអនុញ្ញាត Popups សម្រាប់គេហទំព័រនេះ!');
            return;
        }

        // Render cards 8 per A4 sheet
        const cardsPerPage = 8;
        let allPages = [];

        if (targetSide === 'both') {
            for (let i = 0; i < students.length; i += cardsPerPage) {
                const chunk = students.slice(i, i + cardsPerPage);
                // Front sheet
                const frontCards = chunk.map(st => buildCardFrontHTML(st)).join('');
                allPages.push(`<div class="a4-batch-page">${frontCards}</div>`);
                // Back sheet
                const backCards = chunk.map(st => buildCardBackHTML(st)).join('');
                allPages.push(`<div class="a4-batch-page">${backCards}</div>`);
            }
        } else {
            const sideFn = targetSide === 'back' ? buildCardBackHTML : buildCardFrontHTML;
            for (let i = 0; i < students.length; i += cardsPerPage) {
                const chunk = students.slice(i, i + cardsPerPage);
                const cards = chunk.map(st => sideFn(st)).join('');
                allPages.push(`<div class="a4-batch-page">${cards}</div>`);
            }
        }

        const pagesHTML = allPages.join('');

        const baseHref = window.location.href.split('?')[0].split('#')[0].replace(/\/[^\/]*$/, '/');
        win.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <base href="${baseHref}">
                <title>Batch Student Cards (${students.length} Students - ${targetSide.toUpperCase()})</title>
                <link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;700&family=Moul&family=Noto+Sans+SC:wght@400;700;900&family=Poppins:wght@400;600;700;900&display=swap" rel="stylesheet">
                <link rel="stylesheet" href="css/student-card-studio.css?v=20261021">
                <style>
                    * { box-sizing: border-box; }
                    body {
                        margin: 0;
                        padding: 0;
                        background: #f8fafc;
                        font-family: 'Kantumruy Pro', 'Noto Sans SC', sans-serif;
                    }
                    .a4-batch-page {
                        width: 210mm;
                        min-height: 297mm;
                        padding: 8mm 6mm;
                        margin: 12px auto;
                        background: white;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                        display: grid;
                        grid-template-columns: repeat(2, 54mm);
                        grid-auto-rows: 83.4mm;
                        gap: 6mm 10mm;
                        justify-content: center;
                        align-content: start;
                        page-break-after: always;
                        break-after: page;
                    }
                    .moeys-id-card, .tianxin-official-card, .tianxin-official-card-back {
                        width: 54mm !important;
                        height: 83.4mm !important;
                        box-shadow: none !important;
                        outline: 1px dashed #bbb;
                        outline-offset: 1mm;
                        position: relative !important;
                    }
                    @media print {
                        @page {
                            size: A4 portrait;
                            margin: 6mm 4mm;
                        }
                        body {
                            background: white !important;
                        }
                        .a4-batch-page {
                            width: 100% !important;
                            min-height: 100% !important;
                            margin: 0 !important;
                            box-shadow: none !important;
                        }
                        .moeys-id-card, .tianxin-official-card, .tianxin-official-card-back {
                            outline: 1px dashed #ccc !important;
                        }
                    }
                </style>
            </head>
            <body onload="setTimeout(() => { window.print(); }, 800);">
                ${pagesHTML}
            </body>
            </html>
        `);
        win.document.close();
    };

    /**
     * ==========================================================================
     * AI IMAGE STUDIO ASSISTANT FUNCTIONS
     * ==========================================================================
     */
    let currentAIGeneratedUrl = null;
    let currentAITarget = 'photo'; // 'photo' | 'background'
    let currentAIHistory = [];
    let currentAIStyle = 'uniform';

    window.toggleAIApiKeyVisibility = function () {
        const inp = document.getElementById('aiApiKeyInput');
        const icon = document.getElementById('aiKeyVisibilityIcon');
        if (!inp) return;
        if (inp.type === 'password') {
            inp.type = 'text';
            if (icon) icon.className = 'fi fi-rr-eye-crossed';
        } else {
            inp.type = 'password';
            if (icon) icon.className = 'fi fi-rr-eye';
        }
    };

    window.saveAIApiKey = function () {
        const inp = document.getElementById('aiApiKeyInput');
        if (!inp) return;
        const val = inp.value.trim();
        localStorage.setItem('tx_ai_image_api_key', val);
        if (window.AI_CONFIG) window.AI_CONFIG.apiKey = val;
        const badge = document.getElementById('aiKeyStatusBadge');
        if (badge) badge.innerText = val ? '✓ បានរក្សាទុក Key' : '✨ គាំទ្រ Free Engine';
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'បានរក្សាទុក AI API Key!',
                text: val ? 'Key ត្រូវបានរក្សាទុកក្នុង Browser រួចរាល់។' : 'បានលុប Key ហើយនឹងប្រើ Free Engine ជំនួសវិញ។',
                timer: 1500,
                showConfirmButton: false
            });
        } else {
            alert('បានរក្សាទុក AI API Key រួចរាល់!');
        }
    };

    window.onAIProviderChange = function (provider) {
        const keyInp = document.getElementById('aiApiKeyInput');
        if (!keyInp) return;
        if (provider === 'free') {
            keyInp.placeholder = 'មិនចាំបាច់មាន Key (Free Engine)';
        } else if (provider === 'gemini') {
            keyInp.placeholder = 'បញ្ចូល Google AI Key (AIzaSy...)';
        } else if (provider === 'openai') {
            keyInp.placeholder = 'បញ្ចូល OpenAI Key (sk-...)';
        }
    };

    window.setAIImageTarget = function (target) {
        currentAITarget = target;
        const btnPhoto = document.getElementById('btnTargetPhoto');
        const btnBg = document.getElementById('btnTargetBg');
        if (btnPhoto) btnPhoto.classList.toggle('active', target === 'photo');
        if (btnBg) btnBg.classList.toggle('active', target === 'background');

        const ratioSelect = document.getElementById('aiAspectRatio');
        if (ratioSelect) {
            ratioSelect.value = target === 'photo' ? '3:4' : '16:9';
        }
    };

    /**
     * 100% Dynamic Auto-Generate Prompt for Currently Selected Student
     */
    window.autoGeneratePromptForActiveStudent = function () {
        const s = getStudent(currentStudentKey);
        if (!s) return;

        const isFemale = (s.gender === 'Female' || s.gender === 'ស្រី');
        const name = `${s.lastName || ''} ${s.firstName || ''}`.trim() || 'Student';
        const rawLevel = (s.studyLevel || s.classroom || s.class || '').toLowerCase();

        let ageStr = '15 years old, Cambodian high school student';
        if (rawLevel.includes('មត្តេយ្យ') || rawLevel.includes('kinder') || rawLevel.includes('kg')) {
            ageStr = '5 years old, cute Cambodian kindergarten pupil';
        } else if (rawLevel.includes('បឋម') || rawLevel.includes('primary') || rawLevel.includes('grade 1') || rawLevel.includes('grade 2') || rawLevel.includes('grade 3') || rawLevel.includes('ថ្នាក់ទី១') || rawLevel.includes('ថ្នាក់ទី២') || rawLevel.includes('ថ្នាក់ទី៣')) {
            ageStr = '8 years old, Cambodian primary school pupil';
        } else if (rawLevel.includes('ថ្នាក់ទី៤') || rawLevel.includes('ថ្នាក់ទី៥') || rawLevel.includes('ថ្នាក់ទី៦') || rawLevel.includes('grade 4') || rawLevel.includes('grade 5') || rawLevel.includes('grade 6')) {
            ageStr = '11 years old, Cambodian school student';
        }

        const isChinese = currentCategory === 'chinese' || rawLevel.includes('ចិន') || rawLevel.includes('chinese');
        const schoolContext = isChinese ? 'Cambodian-Chinese bilingual school academy student' : 'Cambodian MoEYS student';

        const uniformDesc = isFemale
            ? 'wearing clean crisp white short-sleeved school uniform shirt, dark navy blue ribbon collar tie, neat natural black hair neatly tied in a tidy ponytail, polite gentle pleasant smile'
            : 'wearing clean crisp white short-sleeved school uniform shirt, dark navy blue necktie, neat well-groomed short black hair, confident friendly pleasant smile';

        const dynamicPrompt = `Official portrait photography of a ${ageStr}, ${schoolContext}, ${uniformDesc}, looking straight into the camera, professional photography studio lighting, solid soft clean studio blue passport photo backdrop, standard 4x6 Cambodian student ID card portrait, ultra-realistic human skin texture, shot on 85mm portrait lens, f/2.8 aperture, 8k resolution, crisp sharp detail, photorealistic masterpiece`;

        const txt = document.getElementById('aiImagePrompt');
        if (txt) {
            txt.value = dynamicPrompt;
            txt.focus();
        }

        window.setAIImageTarget('photo');

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'info',
                title: 'បានរៀបចំ Prompt សិស្សនេះរួចរាល់!',
                text: `Prompt ត្រូវបានបង្កើតដោយស្វ័យប្រវត្តសម្រាប់សិស្ស: ${name} (ភេទ: ${isFemale ? 'ស្រី' : 'ប្រុស'})`,
                timer: 1600,
                showConfirmButton: false
            });
        }
    };

    window.selectAIStylePreset = function (btnEl, styleKey) {
        currentAIStyle = styleKey;
        document.querySelectorAll('.ai-style-pill').forEach(b => b.classList.remove('active'));
        if (btnEl) btnEl.classList.add('active');

        const txt = document.getElementById('aiImagePrompt');
        if (!txt) return;

        const styleAddons = {
            uniform: ', wearing clean official white school uniform with blue tie, formal ID photo',
            graduation: ', wearing academic graduation gown, black mortarboard cap with golden tassel, celebration',
            studioBlue: ', solid soft plain studio blue passport backdrop, professional softbox lighting',
            luxuryBg: 'Prestigious modern school student ID card background graphic, royal blue and gold luxury geometric patterns, subtle clean empty space, 8k resolution graphic design'
        };

        if (styleKey === 'luxuryBg') {
            txt.value = styleAddons.luxuryBg;
            window.setAIImageTarget('background');
        } else {
            if (!txt.value.includes(styleAddons[styleKey])) {
                txt.value = txt.value.trim() + styleAddons[styleKey];
            }
        }
    };

    /**
     * Dynamic Prompt Auto-Enhancer (Converts simple text to photorealistic studio prompt)
     */
    window.enhancePromptWithAI = function () {
        const txt = document.getElementById('aiImagePrompt');
        if (!txt) return;
        const current = txt.value.trim();

        if (!current) {
            window.autoGeneratePromptForActiveStudent();
            return;
        }

        // Professional prompt enhancer keywords
        const enhanced = `${current}, professional photography, 4x6 student ID studio portrait, sharp focus, 85mm lens f/2.8, studio lighting, hyperrealistic, 8k resolution, detailed texture, official passport style`;
        txt.value = enhanced;

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'បានពង្រីក Prompt រួចរាល់!',
                text: 'បន្ថែមគុណភាពរូបភាព 8k Studio Lighting និង Sharp Focus ដោយស្វ័យប្រវត្តិ។',
                timer: 1500,
                showConfirmButton: false
            });
        }
    };

    window.applyAIPromptPreset = function (type) {
        const txt = document.getElementById('aiImagePrompt');
        if (!txt) return;

        const presets = {
            boy: 'Official Cambodian male student portrait, Cambodian high school boy wearing clean white short-sleeved school uniform shirt, dark blue tie, neat black hair, gentle smile, professional photo studio lighting, solid soft light blue background, official 4x6 passport ID photo style, sharp focus, 8k resolution',
            girl: 'Official Cambodian female student portrait, Cambodian high school girl wearing clean white school uniform shirt, dark blue tie, neat hair tied back, pleasant gentle smile, professional studio lighting, solid soft light blue background, official 4x6 passport ID photo style, sharp focus, 8k resolution',
            cardBg: 'Prestigious modern school student ID card background graphic, elegant royal blue and gold subtle geometric patterns, luxury texture, clean empty center for student details, professional graphic design, 8k resolution',
            emblem: 'Official academic school emblem logo, open book with rays of light, torch of wisdom, golden laurel wreath, royal blue and gold accents, crisp vector emblem, white background'
        };

        txt.value = presets[type] || '';
        if (type === 'cardBg') {
            window.setAIImageTarget('background');
        } else if (type === 'boy' || type === 'girl') {
            window.setAIImageTarget('photo');
        }
    };

    /**
     * 100% Dynamic Image Generator Engine
     */
    window.generateCardStudioAIImage = async function () {
        const promptInput = document.getElementById('aiImagePrompt');
        const prompt = promptInput ? promptInput.value.trim() : '';
        if (!prompt) {
            window.autoGeneratePromptForActiveStudent();
            return;
        }

        const btn = document.getElementById('btnGenerateAIImage');
        const btnText = document.getElementById('btnGenerateAIImageText');
        const resultBox = document.getElementById('aiImageResultBox');
        const resultImg = document.getElementById('aiResultImgPreview');

        const originalText = 'បង្កើតរូបភាពដោយ AI (Generate with AI)';
        if (btn) btn.disabled = true;

        const apiKeyInput = document.getElementById('aiApiKeyInput');
        const apiKey = (apiKeyInput ? apiKeyInput.value.trim() : '') || localStorage.getItem('tx_ai_image_api_key') || (window.AI_CONFIG && window.AI_CONFIG.apiKey ? window.AI_CONFIG.apiKey : '');
        const provider = document.getElementById('aiModelProvider') ? document.getElementById('aiModelProvider').value : 'free';
        const aspectRatio = document.getElementById('aiAspectRatio') ? document.getElementById('aiAspectRatio').value : '3:4';

        try {
            if (btnText) btnText.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>កំពុងទាក់ទង AI Server...';

            let finalImageUrl = null;

            // 1. Google Gemini / Imagen Provider
            if ((provider === 'gemini' || (!provider && apiKey.startsWith('AIzaSy'))) && apiKey) {
                try {
                    const aspect = aspectRatio === '16:9' ? '16:9' : (aspectRatio === '1:1' ? '1:1' : '3:4');
                    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
                    const res = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            instances: [{ prompt: prompt }],
                            parameters: { sampleCount: 1, aspectRatio: aspect }
                        })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        if (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
                            finalImageUrl = `data:image/png;base64,${data.predictions[0].bytesBase64Encoded}`;
                        }
                    }
                } catch (geminiErr) {
                    console.warn('Google Imagen API call failed, falling back to Pollinations AI', geminiErr);
                }
            }

            // 2. OpenAI Provider
            if (!finalImageUrl && (provider === 'openai' || apiKey.startsWith('sk-')) && apiKey) {
                try {
                    const res = await fetch('https://api.openai.com/v1/images/generations', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        },
                        body: JSON.stringify({
                            prompt: prompt,
                            n: 1,
                            size: aspectRatio === '16:9' ? '1792x1024' : (aspectRatio === '1:1' ? '1024x1024' : '1024x1792')
                        })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        if (data.data && data.data[0] && data.data[0].url) {
                            finalImageUrl = data.data[0].url;
                        }
                    }
                } catch (openaiErr) {
                    console.warn('OpenAI API call failed, falling back to Pollinations AI', openaiErr);
                }
            }

            // 3. High-Speed Fallback / Free AI Server (Always Works 100%)
            if (!finalImageUrl) {
                if (btnText) btnText.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>កំពុងទាញយករូបភាព...';
                let w = 600, h = 800;
                if (aspectRatio === '1:1') { w = 800; h = 800; }
                else if (aspectRatio === '16:9') { w = 960; h = 540; }
                const seed = Math.floor(Math.random() * 9999999);
                finalImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&nologo=true&seed=${seed}`;
            }

            // Preload the image before displaying (with 12s timeout)
            await new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                const timer = setTimeout(() => resolve(img), 12000);
                img.onload = () => { clearTimeout(timer); resolve(img); };
                img.onerror = () => { clearTimeout(timer); resolve(img); };
                img.src = finalImageUrl;
            });

            currentAIGeneratedUrl = finalImageUrl;
            if (resultImg) resultImg.src = finalImageUrl;

            // Add to multi-image history
            currentAIHistory.unshift({ url: finalImageUrl, target: currentAITarget, time: new Date() });
            if (currentAIHistory.length > 6) currentAIHistory.pop();
            renderAIHistoryReel();

            if (resultBox) {
                resultBox.style.display = 'block';
                resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'success',
                    title: 'បង្កើតរូបភាពដោយ AI ជោគជ័យ!',
                    text: 'អ្នកអាចចុច "ដាក់ជារូបថតសិស្ស & Save" ឬ "ដាក់ជា Background កាត" បានភ្លាមៗ។',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
        } catch (err) {
            console.error('AI Image Generation error:', err);
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'error',
                    title: 'បរាជ័យក្នុងការបង្កើតរូបភាព',
                    text: err.message || 'សូមពិនិត្យមើលការតភ្ជាប់អ៊ីនធឺណិត ឬ API Key របស់អ្នក។'
                });
            } else {
                alert('បរាជ័យក្នុងការបង្កើតរូបភាព: ' + err.message);
            }
        } finally {
            if (btn) btn.disabled = false;
            if (btnText) btnText.innerText = originalText;
        }
    };

    function renderAIHistoryReel() {
        const reel = document.getElementById('aiHistoryReel');
        const reelSection = document.getElementById('aiHistoryReelSection');
        if (!reel || !reelSection) return;

        if (currentAIHistory.length <= 1) {
            reelSection.style.display = 'none';
            return;
        }

        reelSection.style.display = 'block';
        reel.innerHTML = currentAIHistory.map((item, idx) => `
            <img src="${item.url}" class="ai-history-thumb ${item.url === currentAIGeneratedUrl ? 'active' : ''}" 
                 onclick="window.selectFromHistory('${item.url}')" title="រូបភាពវ៉ារ្យ៉ង់ #${idx + 1}" alt="Thumb">
        `).join('');
    }

    window.selectFromHistory = function (url) {
        currentAIGeneratedUrl = url;
        const resultImg = document.getElementById('aiResultImgPreview');
        if (resultImg) resultImg.src = url;
        renderAIHistoryReel();
    };

    window.closeAIImageResultBox = function () {
        const resultBox = document.getElementById('aiImageResultBox');
        if (resultBox) resultBox.style.display = 'none';
    };

    /**
     * 100% Dynamic Apply & Save directly to Memory + Firebase Realtime Database + IndexedDB
     */
    window.applyAIGeneratedImageToStudent = function () {
        if (!currentAIGeneratedUrl) return;
        const s = getStudent(currentStudentKey);
        if (!s) return;

        const studentName = `${s.lastName || ''} ${s.firstName || ''}`.trim() || 'សិស្ស';

        // 1. Update in-memory objects
        s.imageUrl = currentAIGeneratedUrl;
        if (window.allStudentsData && window.allStudentsData[currentStudentKey]) {
            window.allStudentsData[currentStudentKey].imageUrl = currentAIGeneratedUrl;
        }
        if (typeof allStudentsData !== 'undefined' && allStudentsData && allStudentsData[currentStudentKey]) {
            allStudentsData[currentStudentKey].imageUrl = currentAIGeneratedUrl;
        }

        // 2. Update live preview card & AI Studio context banner
        const photoFrame = document.querySelector('.card-photo-frame');
        if (photoFrame) {
            photoFrame.innerHTML = `<img src="${currentAIGeneratedUrl}" class="card-student-photo" id="cardPhotoImg" alt="Photo">`;
        }
        const aiAvatar = document.getElementById('aiActiveStudentAvatar');
        if (aiAvatar) {
            aiAvatar.innerHTML = `<img src="${currentAIGeneratedUrl}" class="w-100 h-100" style="object-fit:cover;" alt="Avatar">`;
        }

        // 3. Real-time Firebase Database Persistence
        let firebaseSynced = false;
        if (typeof firebase !== 'undefined' && firebase.database) {
            try {
                const targetRef = firebase.database().ref('students').child(currentStudentKey);
                targetRef.update({
                    imageUrl: currentAIGeneratedUrl,
                    updatedAt: new Date().toISOString()
                }).then(() => {
                    console.log(`[Card Studio AI] Student photo synced to Firebase Database for ${currentStudentKey}`);
                }).catch((dbErr) => {
                    console.warn('[Card Studio AI] Firebase update note:', dbErr);
                });
                firebaseSynced = true;
            } catch (fbErr) {
                console.warn('[Card Studio AI] Firebase call note:', fbErr);
            }
        }

        // 4. Update IndexedDB Cache
        try {
            if (typeof setIndexedDBCache === 'function' && window.allStudentsData) {
                setIndexedDBCache('tx_cachedAllStudentsData', window.allStudentsData);
            }
        } catch (idbErr) {
            console.warn('[Card Studio AI] IndexedDB cache note:', idbErr);
        }

        // 5. Success Notification
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'បានរក្សាទុករូបថតសិស្សជោគជ័យ!',
                html: `រូបថត AI ថ្មីត្រូវបានដាក់ជូនសិស្ស <b>${studentName}</b> និងរក្សាទុកក្នុងប្រព័ន្ធ Database រួចរាល់។`,
                imageUrl: currentAIGeneratedUrl,
                imageWidth: 100,
                imageHeight: 130,
                imageAlt: 'Student Photo',
                timer: 2500,
                showConfirmButton: false
            });
        } else {
            alert(`បានរក្សាទុករូបថតសិស្ស ${studentName} រួចរាល់!`);
        }
    };

    /**
     * 100% Dynamic Apply & Save as Card Background
     */
    window.applyAIGeneratedImageToBackground = function () {
        if (!currentAIGeneratedUrl) return;
        studioConfig.customBgUrl = currentAIGeneratedUrl;
        try {
            localStorage.setItem('tx_official_card_studio_config', JSON.stringify(studioConfig));
        } catch (e) {
            console.warn('LocalStorage save note:', e);
        }

        const card = document.getElementById('officialCardElement');
        if (card) {
            card.style.backgroundImage = `url('${currentAIGeneratedUrl}')`;
            card.style.backgroundSize = 'cover';
        }

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'បានដាក់ជា Background កាតជោគជ័យ!',
                text: 'ផ្ទៃខាងក្រោយកាតត្រូវបានផ្លាស់ប្តូរ និងរក្សាទុករួចរាល់។',
                imageUrl: currentAIGeneratedUrl,
                imageWidth: 140,
                imageHeight: 90,
                timer: 2000,
                showConfirmButton: false
            });
        } else {
            alert('បានដាក់ជា Background កាតជោគជ័យ!');
        }
    };

    window.downloadAIGeneratedImage = function () {
        if (!currentAIGeneratedUrl) return;
        const a = document.createElement('a');
        a.href = currentAIGeneratedUrl;
        a.download = `AI-Generated-${currentAITarget}-${Date.now()}.jpg`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    // Auto-init on page load if tab=card
    document.addEventListener('DOMContentLoaded', () => {
        const urlParams = new URLSearchParams(window.location.search);
        const tab = urlParams.get('tab');
        if (tab === 'card' || tab === 'idcard') {
            window.openStudentCardTab(urlParams.get('studentKey'));
        }
        const cardTabBtn = document.getElementById('card-tab');
        if (cardTabBtn) {
            cardTabBtn.addEventListener('shown.bs.tab', () => {
                window.onStudentCardTabActivated();
            });
        }
    });

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        const urlParams = new URLSearchParams(window.location.search);
        const tab = urlParams.get('tab');
        if (tab === 'card' || tab === 'idcard') {
            setTimeout(() => {
                window.openStudentCardTab(urlParams.get('studentKey'));
            }, 150);
        }
    }

})();
