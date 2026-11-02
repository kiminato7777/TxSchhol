/**
 * honor-roll-poster.js
 * Pixel-Perfect Cambodian MoEYS Honor Roll (ផ្ទាំងកិត្តិយស) Poster Studio
 * Responsive 2-column A4 Studio matching standard school rankings
 */

(function () {
    'use strict';

    // Default 5 students placeholders matching the screenshot
    const defaultSamplePhotos = [
        'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&auto=format&fit=crop&q=80', // Girl 1
        'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=400&auto=format&fit=crop&q=80', // Boy 2
        'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=400&auto=format&fit=crop&q=80', // Girl 3
        'https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?w=400&auto=format&fit=crop&q=80', // Boy 4
        'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=400&auto=format&fit=crop&q=80'  // Boy 5
    ];

    const defaultConfig = {
        backgroundUrl: null,
        bgOpacity: 100,
        customStampUrl: null,
        customTeacherSignUrl: null,
        lunarDate: 'ថ្ងៃចន្ទ ៣រោច ខែស្រាពណ៍ ឆ្នាំរោង ឆស័ក ព.ស.២៥៧០',
        solarDate: 'រាជធានីភ្នំពេញ, ថ្ងៃទី២១ ខែសីហា ឆ្នាំ២០២៦',
        academicYear: '២០២៦-២០២៧',
        monthName: 'សីហា',
        monthNumber: 8,
        selectedClass: 'all',
        schoolName: 'មន្ទីរអប់រំ យុវជន និងកីឡា រាជធានីភ្នំពេញ',
        schoolOffice: 'ការិយាល័យ អ យក នៃរដ្ឋបាលស្រុក',
        schoolPhone: '+855 10 688 800',
        zoom: 85,
        activeStep: 5,
        activeLayer: 'titleYear',
        layerOffsets: {
            titleYear: { x: 0, y: 0, scale: 1.0 },
            nationalHeader: { x: 0, y: 0, scale: 1.0 },
            rank1: { x: 0, y: 0, scale: 1.0 },
            rank23: { x: 0, y: 0, scale: 1.0 },
            rank45: { x: 0, y: 0, scale: 1.0 },
            principalStamp: { x: 0, y: 0, scale: 1.0 },
            teacherSign: { x: 0, y: 0, scale: 1.0 }
        },
        fontFamily: 'default',
        textColor: '#0f172a',
        isBold: false,
        isItalic: false
    };

    let posterConfig = JSON.parse(JSON.stringify(defaultConfig));
    let rankStudents = [
        { rank: 1, name: 'សិស្សឆ្នើមលេខ ១', photoUrl: defaultSamplePhotos[0], score: '98.5', key: '' },
        { rank: 2, name: 'សិស្សឆ្នើមលេខ ២', photoUrl: defaultSamplePhotos[1], score: '96.2', key: '' },
        { rank: 3, name: 'សិស្សឆ្នើមលេខ ៣', photoUrl: defaultSamplePhotos[2], score: '94.8', key: '' },
        { rank: 4, name: 'សិស្សឆ្នើមលេខ ៤', photoUrl: defaultSamplePhotos[3], score: '93.0', key: '' },
        { rank: 5, name: 'សិស្សឆ្នើមលេខ ៥', photoUrl: defaultSamplePhotos[4], score: '91.5', key: '' }
    ];

    // Load saved settings
    try {
        const saved = localStorage.getItem('tx_honor_roll_poster_config');
        if (saved) {
            posterConfig = Object.assign(posterConfig, JSON.parse(saved));
        }
        const savedStudents = localStorage.getItem('tx_honor_roll_poster_students');
        if (savedStudents) {
            rankStudents = JSON.parse(savedStudents);
        }
    } catch (e) {
        console.warn('Poster config load error:', e);
    }

    /**
     * Switch View between Poster Studio & Score Table
     */
    window.switchScoreView = function (mode) {
        const posterContainer = document.getElementById('honorRollPosterView');
        const tableContainer = document.getElementById('monthlyScoreTableView');
        const tabPoster = document.getElementById('tabViewPoster');
        const tabTable = document.getElementById('tabViewTable');

        if (mode === 'rank' || mode === 'poster') {
            if (posterContainer) posterContainer.style.display = 'block';
            if (tableContainer) tableContainer.style.display = 'none';
            if (tabPoster) tabPoster.classList.add('active');
            if (tabTable) tabTable.classList.remove('active');

            // Update URL without reload
            try {
                const url = new URL(window.location.href);
                url.searchParams.set('view', 'rank');
                window.history.replaceState({}, '', url.toString());
            } catch (e) {}

            renderA4Poster();
        } else {
            if (posterContainer) posterContainer.style.display = 'none';
            if (tableContainer) tableContainer.style.display = 'block';
            if (tabPoster) tabPoster.classList.remove('active');
            if (tabTable) tabTable.classList.add('active');

            try {
                const url = new URL(window.location.href);
                url.searchParams.set('view', 'table');
                window.history.replaceState({}, '', url.toString());
            } catch (e) {}
        }
    };

    /**
     * Initialize Honor Roll Studio
     */
    window.initHonorRollPoster = function () {
        populatePosterFilterDropdowns();
        syncWithActiveTableFilters();
        autoPopulateTopStudentsFromData();
        renderA4Poster();
        bindPosterControlInputs();

        // Check URL view mode
        const urlParams = new URLSearchParams(window.location.search);
        const view = urlParams.get('view');
        if (view === 'rank' || view === 'poster') {
            window.switchScoreView('rank');
        } else {
            window.switchScoreView('table');
        }
    };

    function populatePosterFilterDropdowns() {
        const classSelect = document.getElementById('posterClassFilter');
        if (!classSelect) return;

        const classSet = new Set();
        if (typeof allStudents !== 'undefined' && Array.isArray(allStudents)) {
            allStudents.forEach(st => {
                const c = (st.studyLevel || st.classroom || st.class || '').trim();
                if (c) classSet.add(c);
            });
        }
        const classes = Array.from(classSet).sort();

        classSelect.innerHTML = `
            <option value="all">ថ្នាក់រៀនទាំងអស់ (All Classes)</option>
            ${classes.map(c => `<option value="${c}" ${posterConfig.selectedClass === c ? 'selected' : ''}>ថ្នាក់: ${c}</option>`).join('')}
        `;
    }

    function syncWithActiveTableFilters() {
        // Sync with Month Select
        const monthSelect = document.getElementById('scoreMonthSelect');
        if (monthSelect) {
            const m = parseInt(monthSelect.value) || 8;
            posterConfig.monthNumber = m;
            const khmerMonthNames = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];
            posterConfig.monthName = khmerMonthNames[m - 1] || 'សីហា';
        }

        const filterMonthDropdown = document.getElementById('posterMonthFilter');
        if (filterMonthDropdown) {
            filterMonthDropdown.value = posterConfig.monthNumber;
        }

        const filterYearDropdown = document.getElementById('posterYearFilter');
        if (filterYearDropdown) {
            filterYearDropdown.value = posterConfig.academicYear;
        }
    }

    /**
     * Automatically extracts Top 5 ranked students from the loaded dataset
     */
    window.autoPopulateTopStudentsFromData = function () {
        if (typeof allStudents === 'undefined' || !Array.isArray(allStudents) || allStudents.length === 0) {
            return;
        }

        let candidates = [...allStudents];

        // Filter by class if selected
        if (posterConfig.selectedClass && posterConfig.selectedClass !== 'all') {
            candidates = candidates.filter(st => {
                const c = (st.studyLevel || st.classroom || st.class || '').trim();
                return c === posterConfig.selectedClass;
            });
        }

        // Rank by academicRecords for active month or lastAverageScore
        candidates.forEach(st => {
            let score = 0;
            if (Array.isArray(st.academicRecords)) {
                const rec = st.academicRecords.find(r => r.month == posterConfig.monthNumber);
                if (rec) {
                    score = parseFloat(rec.averageScore || rec.totalScore) || 0;
                }
            }
            if (!score) {
                score = parseFloat(st.lastAverageScore || st.totalScore) || 0;
            }
            st._calcScore = score;
        });

        candidates.sort((a, b) => (b._calcScore || 0) - (a._calcScore || 0));

        // If candidates found with scores, populate top 5
        const validWithScores = candidates.filter(st => st._calcScore > 0);
        if (validWithScores.length >= 1) {
            for (let i = 0; i < 5; i++) {
                if (validWithScores[i]) {
                    const st = validWithScores[i];
                    const fullName = `${st.lastName || ''} ${st.firstName || ''}`.trim() || `សិស្សលេខ ${i + 1}`;
                    rankStudents[i] = {
                        rank: i + 1,
                        name: fullName,
                        photoUrl: st.imageUrl || defaultSamplePhotos[i],
                        score: st._calcScore ? st._calcScore.toFixed(1) : '',
                        key: st.key || st.id || ''
                    };
                }
            }
            saveStudentsConfig();
        }
    };

    /**
     * Render the whole A4 Poster Canvas DOM
     */
    window.renderA4Poster = function () {
        const sheet = document.getElementById('a4PosterSheet');
        if (!sheet) return;

        // Background styling
        if (posterConfig.backgroundUrl) {
            sheet.style.backgroundImage = `url('${posterConfig.backgroundUrl}')`;
        } else {
            sheet.style.backgroundImage = 'none';
            sheet.style.backgroundColor = '#ffffff';
        }

        // Overlay Opacity
        const overlay = document.getElementById('posterBgOverlay');
        if (overlay) {
            const op = (100 - posterConfig.bgOpacity) / 100;
            overlay.style.backgroundColor = `rgba(255, 255, 255, ${op})`;
        }

        // Update Text Elements
        const titleSpan = document.getElementById('posterMonthNameSpan');
        if (titleSpan) titleSpan.innerText = posterConfig.monthName;

        const yearText = document.getElementById('posterAcademicYearText');
        if (yearText) yearText.innerText = `ឆ្នាំសិក្សា ${posterConfig.academicYear}`;

        const lunarEl = document.getElementById('posterLunarDateText');
        if (lunarEl) lunarEl.innerText = posterConfig.lunarDate;

        const solarEl = document.getElementById('posterSolarDateText');
        if (solarEl) solarEl.innerText = posterConfig.solarDate;

        // Render Student Ranks
        for (let i = 0; i < 5; i++) {
            const st = rankStudents[i] || { name: `សិស្សឆ្នើមលេខ ${toKhmerNum(i + 1)}`, photoUrl: defaultSamplePhotos[i] };
            const imgEl = document.getElementById(`rankPhoto-${i + 1}`);
            const nameEl = document.getElementById(`rankName-${i + 1}`);
            if (imgEl) {
                imgEl.src = st.photoUrl || defaultSamplePhotos[i];
            }
            if (nameEl) {
                nameEl.innerText = st.name || `សិស្សឆ្នើមលេខ ${toKhmerNum(i + 1)}`;
            }
        }

        // Render Principal Stamp SVG
        const stampWrap = document.getElementById('posterStampContainer');
        if (stampWrap) {
            stampWrap.innerHTML = buildPrincipalStampSVG();
        }

        // Render Teacher Signature
        const teacherSignWrap = document.getElementById('posterTeacherSignContainer');
        if (teacherSignWrap) {
            teacherSignWrap.innerHTML = buildTeacherSignatureSVG();
        }

        applyAllPosterTransforms();
    };

    function buildPrincipalStampSVG() {
        if (posterConfig.customStampUrl) {
            return `
                <img src="${posterConfig.customStampUrl}" style="width: 88px; height: 88px; object-fit: contain;" alt="Stamp">
                <svg class="position-absolute" style="top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-6deg); width: 100px; pointer-events: none;" viewBox="0 0 160 60" fill="none">
                    <path d="M12 38 C 28 12, 32 52, 48 24 C 58 8, 64 42, 80 28 C 96 14, 116 32, 134 18 C 146 10, 150 36, 154 32" stroke="#1565c0" stroke-width="2.5" stroke-linecap="round"/>
                    <text x="24" y="46" font-family="'Brush Script MT', cursive" font-size="21" font-weight="bold" fill="#1565c0" font-style="italic">Makara Meas</text>
                </svg>
            `;
        }

        return `
            <svg style="width: 86px; height: 86px; opacity: 0.95;" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="47" stroke="#d32f2f" stroke-width="2.4" fill="none"/>
                <circle cx="50" cy="50" r="42" stroke="#d32f2f" stroke-width="1.2" fill="none"/>
                <circle cx="50" cy="50" r="28" stroke="#d32f2f" stroke-width="1.4" fill="none"/>
                <path id="posterStampTextTop" d="M 16,50 A 34,34 0 1,1 84,50" fill="none" />
                <path id="posterStampTextBottom" d="M 84,50 A 34,34 0 0,1 16,50" fill="none" />
                <text font-family="'Kantumruy Pro', sans-serif" font-size="6.8" font-weight="900" fill="#d32f2f" letter-spacing="0.5">
                    <textPath href="#posterStampTextTop" startOffset="50%" text-anchor="middle">
                        សាលារៀន ធាន ស៊ីន
                    </textPath>
                </text>
                <text font-family="'Kantumruy Pro', sans-serif" font-size="5.8" font-weight="900" fill="#d32f2f" letter-spacing="0.5">
                    <textPath href="#posterStampTextBottom" startOffset="50%" text-anchor="middle">
                        ★ ក្រសួងអប់រំ យុវជន និងកីឡា ★
                    </textPath>
                </text>
                <polygon points="50,33 54,43 65,43 56,49 59,60 50,53 41,60 44,49 35,43 46,43" fill="#d32f2f"/>
            </svg>
            <svg class="position-absolute" style="top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-6deg); width: 95px; pointer-events: none;" viewBox="0 0 160 60" fill="none">
                <path d="M12 38 C 28 12, 32 52, 48 24 C 58 8, 64 42, 80 28 C 96 14, 116 32, 134 18 C 146 10, 150 36, 154 32" stroke="#1565c0" stroke-width="2.5" stroke-linecap="round"/>
                <text x="24" y="46" font-family="'Brush Script MT', cursive" font-size="21" font-weight="bold" fill="#1565c0" font-style="italic">Makara Meas</text>
            </svg>
        `;
    }

    function buildTeacherSignatureSVG() {
        if (posterConfig.customTeacherSignUrl) {
            return `<img src="${posterConfig.customTeacherSignUrl}" style="max-height: 48px; object-fit: contain;" alt="Signature">`;
        }

        return `
            <svg style="width: 120px; height: 42px;" viewBox="0 0 160 50" fill="none">
                <path d="M10 32 C 30 10, 45 44, 70 20 C 90 8, 105 38, 125 18 C 140 10, 148 28, 155 22" stroke="#1565c0" stroke-width="2.4" stroke-linecap="round"/>
                <text x="35" y="38" font-family="'Brush Script MT', cursive" font-size="19" font-weight="bold" fill="#1565c0" font-style="italic">Teacher</text>
            </svg>
        `;
    }

    /**
     * D-Pad Layer Movement & Transforms
     */
    function applyAllPosterTransforms() {
        Object.keys(posterConfig.layerOffsets).forEach(layerKey => {
            const el = document.getElementById(`posterLayer-${layerKey}`);
            if (!el) return;
            const off = posterConfig.layerOffsets[layerKey] || { x: 0, y: 0, scale: 1.0 };
            el.style.transform = `translate(${off.x}px, ${off.y}px) scale(${off.scale})`;
        });

        // Update Slider inputs to active layer
        const activeOff = posterConfig.layerOffsets[posterConfig.activeLayer] || { x: 0, y: 0, scale: 1.0 };
        const sliderX = document.getElementById('posterSliderX');
        const sliderY = document.getElementById('posterSliderY');
        const textX = document.getElementById('posterValX');
        const textY = document.getElementById('posterValY');
        const sliderScale = document.getElementById('posterSliderScale');
        const textScale = document.getElementById('posterValScale');

        if (sliderX) sliderX.value = activeOff.x;
        if (sliderY) sliderY.value = activeOff.y;
        if (textX) textX.innerText = `${activeOff.x}px`;
        if (textY) textY.innerText = `${activeOff.y}px`;
        if (sliderScale) sliderScale.value = Math.round(activeOff.scale * 100);
        if (textScale) textScale.innerText = `${Math.round(activeOff.scale * 100)}%`;
    }

    window.onPosterLayerSelect = function (layerKey) {
        posterConfig.activeLayer = layerKey;
        applyAllPosterTransforms();
    };

    window.nudgePosterLayer = function (dx, dy) {
        const off = posterConfig.layerOffsets[posterConfig.activeLayer];
        if (!off) return;
        const step = posterConfig.activeStep || 5;

        if (dx === 0 && dy === 0) {
            off.x = 0;
            off.y = 0;
        } else {
            off.x += dx * step;
            off.y += dy * step;
        }
        applyAllPosterTransforms();
    };

    window.setPosterStep = function (step) {
        posterConfig.activeStep = step;
        document.querySelectorAll('.step-btn-pill').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.step) === step);
        });
    };

    window.onPosterOffsetInput = function (axis, val) {
        const off = posterConfig.layerOffsets[posterConfig.activeLayer];
        if (!off) return;
        off[axis] = parseInt(val) || 0;
        applyAllPosterTransforms();
    };

    window.setPosterLayerScale = function (pct) {
        const off = posterConfig.layerOffsets[posterConfig.activeLayer];
        if (!off) return;
        off.scale = pct / 100;
        applyAllPosterTransforms();
    };

    window.setPosterZoom = function (zoomPercent) {
        posterConfig.zoom = zoomPercent;
        const viewport = document.getElementById('a4PosterViewport');
        if (viewport) {
            viewport.className = `a4-poster-viewport zoom-${zoomPercent}`;
        }
        document.querySelectorAll('.btn-zoom').forEach(b => {
            b.classList.toggle('active', parseInt(b.dataset.zoom) === zoomPercent);
        });
    };

    /**
     * Typography & Color settings
     */
    window.setPosterFont = function (fontKey) {
        posterConfig.fontFamily = fontKey;
        document.querySelectorAll('.font-chip').forEach(c => {
            c.classList.toggle('active', c.dataset.font === fontKey);
        });

        const fontMap = {
            default: "'Kantumruy Pro', sans-serif",
            moul: "'Moul', serif",
            bali: "'Moul', 'Khmer OS Muol Light', serif",
            battambang: "'Battambang', sans-serif",
            angkor: "'Angkor', cursive",
            slanted: "'Kantumruy Pro', cursive",
            prasat: "'Preahvihear', serif"
        };

        const sheet = document.getElementById('a4PosterSheet');
        if (sheet && fontMap[fontKey]) {
            sheet.style.fontFamily = fontMap[fontKey];
        }
    };

    window.setPosterTextColor = function (colorHex) {
        posterConfig.textColor = colorHex;
        document.querySelectorAll('.color-circle').forEach(c => {
            c.classList.toggle('active', c.dataset.color === colorHex);
        });
        const sheet = document.getElementById('a4PosterSheet');
        if (sheet) {
            sheet.style.color = colorHex;
        }
    };

    /**
     * Background Upload & Opacity
     */
    window.handlePosterBgUpload = function (input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                posterConfig.backgroundUrl = e.target.result;
                renderA4Poster();
            };
            reader.readAsDataURL(input.files[0]);
        }
    };

    window.resetPosterBackground = function () {
        posterConfig.backgroundUrl = null;
        renderA4Poster();
    };

    window.setPosterBgOpacity = function (val) {
        posterConfig.bgOpacity = parseInt(val);
        const textVal = document.getElementById('posterBgOpacityVal');
        if (textVal) textVal.innerText = `${val}%`;
        renderA4Poster();
    };

    /**
     * Principal Stamp & Teacher Sign Uploads
     */
    window.handlePrincipalStampUpload = function (input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                posterConfig.customStampUrl = e.target.result;
                renderA4Poster();
            };
            reader.readAsDataURL(input.files[0]);
        }
    };

    window.resetPrincipalStamp = function () {
        posterConfig.customStampUrl = null;
        renderA4Poster();
    };

    window.handleTeacherSignUpload = function (input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                posterConfig.customTeacherSignUrl = e.target.result;
                renderA4Poster();
            };
            reader.readAsDataURL(input.files[0]);
        }
    };

    window.resetTeacherSignature = function () {
        posterConfig.customTeacherSignUrl = null;
        renderA4Poster();
    };

    window.resetPosterDates = function () {
        posterConfig.lunarDate = defaultConfig.lunarDate;
        posterConfig.solarDate = defaultConfig.solarDate;
        const lunarInp = document.getElementById('posterInputLunarDate');
        const solarInp = document.getElementById('posterInputSolarDate');
        if (lunarInp) lunarInp.value = defaultConfig.lunarDate;
        if (solarInp) solarInp.value = defaultConfig.solarDate;
        renderA4Poster();
    };

    /**
     * Filter Bar Interactions
     */
    window.onPosterClassChange = function (cls) {
        posterConfig.selectedClass = cls;
        autoPopulateTopStudentsFromData();
        renderA4Poster();
    };

    window.onPosterMonthChange = function (monthVal) {
        const m = parseInt(monthVal);
        posterConfig.monthNumber = m;
        const khmerMonthNames = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];
        posterConfig.monthName = khmerMonthNames[m - 1] || 'សីហា';

        // Sync with score table month select
        const scoreMonthSelect = document.getElementById('scoreMonthSelect');
        if (scoreMonthSelect) scoreMonthSelect.value = m;

        autoPopulateTopStudentsFromData();
        renderA4Poster();
    };

    window.onPosterYearChange = function (yearVal) {
        posterConfig.academicYear = yearVal;
        renderA4Poster();
    };

    /**
     * Click to Edit Specific Student Rank (1 to 5)
     */
    window.openEditRankStudent = function (rankNum) {
        const idx = rankNum - 1;
        const current = rankStudents[idx] || { rank: rankNum, name: '', photoUrl: '' };

        let candidateOptions = '';
        if (typeof allStudents !== 'undefined' && Array.isArray(allStudents)) {
            candidateOptions = allStudents.map(st => {
                const fullName = `${st.lastName || ''} ${st.firstName || ''}`.trim();
                const cls = st.studyLevel || st.classroom || st.class || '';
                return `<option value="${st.key || st.id}" data-photo="${st.imageUrl || ''}" data-name="${fullName}">${fullName} (${cls})</option>`;
            }).join('');
        }

        Swal.fire({
            title: `កែប្រែសិស្សឆ្នើមលេខ ${toKhmerNum(rankNum)}`,
            html: `
                <div class="text-start mb-3">
                    <label class="form-label small fw-bold text-dark">ជ្រើសរើសពីបញ្ជីសិស្ស:</label>
                    <select id="swalSelectStudent" class="form-select form-select-sm mb-2" onchange="window._onSwalStudentSelect(this)">
                        <option value="">-- ឬជ្រើសរើសសិស្សក្នុងប្រព័ន្ធ --</option>
                        ${candidateOptions}
                    </select>

                    <label class="form-label small fw-bold text-dark">ឈ្មោះសិស្ស:</label>
                    <input type="text" id="swalStudentName" class="form-control form-control-sm mb-2" value="${current.name || ''}" placeholder="បញ្ចូលឈ្មោះសិស្ស">

                    <label class="form-label small fw-bold text-dark">រូបថតសិស្ស (Photo URL ឬ Upload):</label>
                    <div class="input-group input-group-sm mb-2">
                        <input type="text" id="swalPhotoUrl" class="form-control" value="${current.photoUrl || ''}" placeholder="Link រូបថតសិស្ស">
                        <button class="btn btn-outline-primary" type="button" onclick="document.getElementById('swalFileUpload').click()">
                            <i class="fi fi-rr-upload me-1"></i>Upload
                        </button>
                    </div>
                    <input type="file" id="swalFileUpload" class="d-none" accept="image/*" onchange="window._onSwalPhotoUpload(this)">

                    <div class="text-center mt-2 p-2 bg-light rounded-3 border">
                        <img id="swalPhotoPreview" src="${current.photoUrl || defaultSamplePhotos[idx]}" class="rounded shadow-xs" style="width: 80px; height: 105px; object-fit: cover;">
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'រក្សាទុក (Save)',
            cancelButtonText: 'បោះបង់',
            didOpen: () => {
                window._onSwalStudentSelect = (sel) => {
                    const opt = sel.options[sel.selectedIndex];
                    if (opt && opt.value) {
                        const nameInp = document.getElementById('swalStudentName');
                        const urlInp = document.getElementById('swalPhotoUrl');
                        const prev = document.getElementById('swalPhotoPreview');
                        if (nameInp) nameInp.value = opt.dataset.name;
                        if (urlInp) urlInp.value = opt.dataset.photo;
                        if (prev && opt.dataset.photo) prev.src = opt.dataset.photo;
                    }
                };
                window._onSwalPhotoUpload = (inp) => {
                    if (inp.files && inp.files[0]) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            const urlInp = document.getElementById('swalPhotoUrl');
                            const prev = document.getElementById('swalPhotoPreview');
                            if (urlInp) urlInp.value = e.target.result;
                            if (prev) prev.src = e.target.result;
                        };
                        reader.readAsDataURL(inp.files[0]);
                    }
                };
            },
            preConfirm: () => {
                const name = document.getElementById('swalStudentName').value.trim();
                const photoUrl = document.getElementById('swalPhotoUrl').value.trim();
                return { name, photoUrl };
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                rankStudents[idx] = {
                    rank: rankNum,
                    name: result.value.name || `សិស្សឆ្នើមលេខ ${toKhmerNum(rankNum)}`,
                    photoUrl: result.value.photoUrl || defaultSamplePhotos[idx]
                };
                saveStudentsConfig();
                renderA4Poster();
            }
        });
    };

    /**
     * Edit All Top 5 Students Modal
     */
    window.openEditRankStudentsModal = function () {
        const rows = rankStudents.map((st, i) => `
            <tr>
                <td class="text-center fw-bold text-danger font-moul">${toKhmerNum(i + 1)}</td>
                <td>
                    <input type="text" class="form-control form-control-sm" id="batchRankName-${i}" value="${st.name || ''}" placeholder="ឈ្មោះសិស្ស">
                </td>
                <td>
                    <div class="input-group input-group-sm">
                        <input type="text" class="form-control" id="batchRankPhoto-${i}" value="${st.photoUrl || ''}" placeholder="Link រូបថត">
                    </div>
                </td>
                <td class="text-center">
                    <img src="${st.photoUrl || defaultSamplePhotos[i]}" id="batchPrev-${i}" style="width: 32px; height: 42px; object-fit: cover;" class="rounded border">
                </td>
            </tr>
        `).join('');

        Swal.fire({
            title: 'កែសម្រួលទិន្នន័យសិស្សឆ្នើមទាំង ៥ (Top 5 Students)',
            width: '750px',
            html: `
                <div class="table-responsive text-start">
                    <table class="table table-bordered table-sm align-middle">
                        <thead class="table-light">
                            <tr>
                                <th width="10%" class="text-center">លេខ</th>
                                <th width="40%">ឈ្មោះសិស្ស</th>
                                <th width="40%">Link រូបថត</th>
                                <th width="10%" class="text-center">រូប</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'រក្សាទុកទាំងអស់',
            cancelButtonText: 'បោះបង់',
            preConfirm: () => {
                const updated = [];
                for (let i = 0; i < 5; i++) {
                    const name = document.getElementById(`batchRankName-${i}`).value.trim();
                    const photo = document.getElementById(`batchRankPhoto-${i}`).value.trim();
                    updated.push({
                        rank: i + 1,
                        name: name || `សិស្សឆ្នើមលេខ ${toKhmerNum(i + 1)}`,
                        photoUrl: photo || defaultSamplePhotos[i]
                    });
                }
                return updated;
            }
        }).then((res) => {
            if (res.isConfirmed && res.value) {
                rankStudents = res.value;
                saveStudentsConfig();
                renderA4Poster();
            }
        });
    };

    /**
     * Download Poster as PNG (High-Res 300 DPI)
     */
    window.downloadPosterPNG = function () {
        const sheet = document.getElementById('a4PosterSheet');
        if (!sheet) return;

        if (typeof html2canvas === 'undefined') {
            alert('Library html2canvas កំពុងដំណើរការ សូមរង់ចាំបន្តិច...');
            return;
        }

        Swal.fire({
            title: 'កំពុងបង្កើតរូបភាព Poster...',
            text: 'សូមរង់ចាំបន្តិច ប្រព័ន្ធកំពុង Render រូបភាពកម្រិត 300 DPI High-Res',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        html2canvas(sheet, {
            scale: 3,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff'
        }).then(canvas => {
            Swal.close();
            const link = document.createElement('a');
            link.download = `Honor_Roll_Poster_${posterConfig.monthName}_${posterConfig.academicYear}.png`;
            link.href = canvas.toDataURL('image/png', 0.98);
            link.click();
        }).catch(err => {
            console.error('Download error:', err);
            Swal.fire('Error', 'បរាជ័យក្នុងការទាញយករូបភាព: ' + err.message, 'error');
        });
    };

    /**
     * Print Poster formatted for A4
     */
    window.printPosterA4 = function () {
        window.print();
    };

    /**
     * Save Configuration & Share
     */
    window.saveAndSharePoster = function () {
        try {
            localStorage.setItem('tx_honor_roll_poster_config', JSON.stringify(posterConfig));
            saveStudentsConfig();
            
            const shareUrl = `${window.location.origin}${window.location.pathname}?view=rank`;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(shareUrl);
            }

            Swal.fire({
                icon: 'success',
                title: 'រក្សាទុក និងចម្លង Link ជោគជ័យ!',
                text: 'ការរៀបចំ និងទីតាំងទាំងអស់ត្រូវបាន Save រួចរាល់។ Link បានចម្លងទៅ Clipboard របស់អ្នក។',
                timer: 2500,
                showConfirmButton: false
            });
        } catch (e) {
            console.error('Save error:', e);
            alert('រក្សាទុកបានជោគជ័យ!');
        }
    };

    function saveStudentsConfig() {
        try {
            localStorage.setItem('tx_honor_roll_poster_students', JSON.stringify(rankStudents));
        } catch (e) {}
    }

    function bindPosterControlInputs() {
        // Lunar & Solar Date Inputs
        const lunarInp = document.getElementById('posterInputLunarDate');
        if (lunarInp) {
            lunarInp.value = posterConfig.lunarDate;
            lunarInp.addEventListener('input', (e) => {
                posterConfig.lunarDate = e.target.value;
                const el = document.getElementById('posterLunarDateText');
                if (el) el.innerText = e.target.value;
            });
        }

        const solarInp = document.getElementById('posterInputSolarDate');
        if (solarInp) {
            solarInp.value = posterConfig.solarDate;
            solarInp.addEventListener('input', (e) => {
                posterConfig.solarDate = e.target.value;
                const el = document.getElementById('posterSolarDateText');
                if (el) el.innerText = e.target.value;
            });
        }
    }

    function toKhmerNum(num) {
        const khmerNums = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
        return num.toString().split('').map(d => khmerNums[d] || d).join('');
    }

    // Auto init on DOMContentLoaded or immediate if loaded
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(window.initHonorRollPoster, 200);
    });

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(window.initHonorRollPoster, 200);
    }

})();
