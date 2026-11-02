/**
 * sidebar.js
 * 2026 Ultra-Dynamic & Modern ERP Sidebar System
 * Features:
 * - Live Instant Search Filter (Ctrl+K / ⌘K)
 * - Interactive Collapsible Category Accordions with LocalStorage Persistence
 * - Vibrant 3D Squircle Gradient Icons
 * - Real-Time Live Badges & Database Synchronization
 * - Active Link Glowing Indicator & Glassmorphic Highlights
 * - Live Status Beacon & Frosted Glass User Profile
 * - Full backward & forward compatibility with auth-check permissions
 */

// 1. Inject Comprehensive Dynamic Styles
(function initSidebarStyles() {
    const existingStyle = document.getElementById('sidebar-dynamic-styles');
    if (existingStyle) existingStyle.remove();

    document.head.insertAdjacentHTML('beforeend', `
    <style id="sidebar-dynamic-styles">
        /* Base Sidebar Container */
        #sidebar {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            bottom: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            width: 260px !important;
            min-width: 260px !important;
            max-width: 260px !important;
            height: 100vh !important;
            background: linear-gradient(180deg, #0d1527 0%, #0a0f1d 100%) !important;
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
            box-shadow: 4px 0 30px rgba(0, 0, 0, 0.4), inset -1px 0 0 rgba(255, 255, 255, 0.05) !important;
            z-index: 1040 !important;
            user-select: none;
            overflow: hidden !important;
        }

        /* Unified Main Content Offset Across All Pages */
        #main-content, .main-content {
            margin-left: 260px !important;
            width: calc(100% - 260px) !important;
            min-height: 100vh !important;
            box-sizing: border-box !important;
            transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1) !important;
        }

        /* Collapsed Sidebar State */
        body.sidebar-collapsed #sidebar {
            width: 70px !important;
            min-width: 70px !important;
            max-width: 70px !important;
        }
        body.sidebar-collapsed #main-content,
        body.sidebar-collapsed .main-content {
            margin-left: 70px !important;
            width: calc(100% - 70px) !important;
        }

        /* Responsive Mobile Behavior */
        @media (max-width: 991.98px) {
            #sidebar {
                transform: translateX(-100%);
                transition: transform 0.3s ease;
            }
            #sidebar.show {
                transform: translateX(0);
            }
            #main-content, .main-content {
                margin-left: 0 !important;
                width: 100% !important;
            }
        }

        /* ------------------------------------
           BRAND HEADER
        ------------------------------------ */
        .sidebar-header {
            padding: 16px 14px 12px 14px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            position: relative;
            flex-shrink: 0;
            background: rgba(0, 0, 0, 0.12);
        }
        .sidebar-brand-wrapper {
            display: flex;
            align-items: center;
            gap: 12px;
            text-decoration: none !important;
            transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .sidebar-brand-wrapper:hover {
            transform: translateY(-1px) scale(1.01);
        }
        .sidebar-brand-logo-ring {
            width: 44px;
            height: 44px;
            border-radius: 12px;
            background: #ffffff;
            padding: 2px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35), 0 0 0 2px rgba(255, 255, 255, 0.25);
            flex-shrink: 0;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.3s ease;
        }
        .sidebar-brand-wrapper:hover .sidebar-brand-logo-ring {
            transform: rotate(-4deg) scale(1.05);
        }
        #sidebar-logo {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 10px;
        }
        .sidebar-brand-details {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            text-align: left;
            min-width: 0;
        }
        .sidebar-brand-title {
            font-size: 0.96rem;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: 0.8px;
            line-height: 1.2;
            white-space: nowrap;
            text-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }
        .sidebar-brand-status-chip {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            font-size: 0.64rem;
            font-weight: 700;
            color: #ffd166;
            background: rgba(255, 209, 102, 0.14);
            border: 1px solid rgba(255, 209, 102, 0.28);
            border-radius: 12px;
            padding: 1px 7px;
            margin-top: 3px;
            letter-spacing: 0.4px;
        }
        .brand-pulse-dot {
            width: 6px;
            height: 6px;
            background-color: #10b981;
            border-radius: 50%;
            box-shadow: 0 0 6px #10b981;
            animation: pulseBeacon 1.8s infinite cubic-bezier(0.4, 0, 0.6, 1);
        }
        @keyframes pulseBeacon {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(0.8); }
        }

        /* ------------------------------------
           QUICK LIVE SEARCH (CTRL+K)
        ------------------------------------ */
        .sidebar-search-container {
            padding: 10px 12px 6px 12px;
            flex-shrink: 0;
        }
        .sidebar-search-box {
            position: relative;
            display: flex;
            align-items: center;
            background: rgba(0, 0, 0, 0.22);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 11px;
            padding: 6px 10px;
            transition: all 0.22s ease;
        }
        .sidebar-search-box:focus-within {
            background: rgba(0, 0, 0, 0.35);
            border-color: rgba(255, 209, 102, 0.5);
            box-shadow: 0 0 0 3px rgba(255, 209, 102, 0.15);
        }
        .sidebar-search-box i.search-icon {
            font-size: 0.88rem;
            color: rgba(255, 255, 255, 0.5);
            margin-right: 8px;
            flex-shrink: 0;
            transition: color 0.2s ease;
        }
        .sidebar-search-box:focus-within i.search-icon {
            color: #ffd166;
        }
        .sidebar-search-input {
            background: transparent !important;
            border: none !important;
            outline: none !important;
            color: #ffffff !important;
            font-size: 0.8rem !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
        }
        .sidebar-search-input::placeholder {
            color: rgba(255, 255, 255, 0.45);
            font-size: 0.78rem;
        }
        .search-kbd-badge {
            font-size: 0.65rem;
            font-family: inherit;
            color: rgba(255, 255, 255, 0.5);
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 5px;
            padding: 1px 5px;
            cursor: pointer;
            user-select: none;
            white-space: nowrap;
            transition: all 0.2s ease;
        }
        .search-kbd-badge:hover {
            background: rgba(255, 255, 255, 0.2);
            color: #ffffff;
            border-color: rgba(255, 255, 255, 0.35);
        }
        .search-clear-btn {
            background: transparent;
            border: none;
            color: rgba(255, 255, 255, 0.6);
            font-size: 1rem;
            line-height: 1;
            padding: 0 2px;
            margin-left: 4px;
            cursor: pointer;
            outline: none;
            transition: color 0.2s ease;
        }
        .search-clear-btn:hover {
            color: #ffffff;
        }

        /* Search Empty State */
        .sidebar-search-empty {
            padding: 16px 12px;
            text-align: center;
            color: rgba(255, 255, 255, 0.5);
            font-size: 0.8rem;
            font-weight: 600;
            display: none;
        }
        .sidebar-search-empty i {
            display: block;
            font-size: 1.4rem;
            margin-bottom: 6px;
            opacity: 0.6;
        }

        /* ------------------------------------
           NAVIGATION CONTAINER
        ------------------------------------ */
        .sidebar-nav-container {
            flex-grow: 1;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 4px 6px 12px 6px;
            scroll-behavior: smooth;
        }
        .sidebar-nav-container::-webkit-scrollbar {
            width: 4px;
        }
        .sidebar-nav-container::-webkit-scrollbar-track {
            background: transparent;
        }
        .sidebar-nav-container::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.15);
            border-radius: 4px;
        }
        .sidebar-nav-container::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.28);
        }

        /* ------------------------------------
           COLLAPSIBLE SECTION HEADERS
        ------------------------------------ */
        .sidebar-section-title {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding: 10px 10px 6px 10px !important;
            margin-top: 6px !important;
            font-size: 0.67rem !important;
            font-weight: 800 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.8px !important;
            color: rgba(255, 255, 255, 0.5) !important;
            cursor: pointer;
            border-radius: 8px;
            transition: all 0.2s ease;
        }
        .sidebar-section-title:hover {
            color: #ffd166 !important;
            background: rgba(255, 255, 255, 0.05);
        }
        .section-title-left {
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .section-title-icon-box {
            width: 22px;
            height: 22px;
            border-radius: 7px;
            background: rgba(255, 209, 102, 0.16);
            border: 1px solid rgba(255, 209, 102, 0.35);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
            transition: all 0.25s ease;
        }
        .section-title-icon-box i {
            font-size: 0.78rem !important;
            color: #ffd166 !important;
            opacity: 1 !important;
            line-height: 1;
        }
        .sidebar-section-title:hover .section-title-icon-box {
            background: rgba(255, 209, 102, 0.32);
            transform: scale(1.12);
            box-shadow: 0 0 10px rgba(255, 209, 102, 0.4);
        }
        .section-title-right {
            display: flex;
            align-items: center;
            gap: 6px;
            flex-shrink: 0;
            margin-left: 6px;
        }
        .section-count-badge {
            font-size: 0.62rem;
            font-weight: 800;
            padding: 1px 6px;
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.08);
            color: rgba(255, 255, 255, 0.65);
            border: 1px solid rgba(255, 255, 255, 0.08);
            transition: all 0.2s ease;
        }
        .sidebar-section-title:hover .section-count-badge {
            background: rgba(255, 209, 102, 0.15);
            color: #ffd166;
            border-color: rgba(255, 209, 102, 0.3);
        }
        .section-chevron {
            font-size: 0.8rem;
            transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            opacity: 0.7;
        }
        .sidebar-section-title.collapsed .section-chevron {
            transform: rotate(-90deg);
        }
        .sidebar-section-body {
            display: flex;
            flex-direction: column;
            gap: 2px;
            transition: all 0.25s ease;
        }
        .sidebar-section-body.collapsed {
            display: none !important;
        }

        /* ------------------------------------
           NAV LINKS & SQUIRCLE ICONS
        ------------------------------------ */
        #sidebar .nav-link {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding: 7px 10px !important;
            margin: 2px 4px !important;
            border-radius: 12px !important;
            color: rgba(255, 255, 255, 0.86) !important;
            font-size: 0.86rem !important;
            font-weight: 600 !important;
            text-decoration: none !important;
            transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1) !important;
            border: 1px solid transparent !important;
            position: relative;
        }
        .nav-link-main {
            display: flex;
            align-items: center;
            min-width: 0;
            flex-grow: 1;
        }
        .nav-link-label {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1.25;
            transition: color 0.2s ease;
        }

        /* Squircle 3D Icon Chip */
        .nav-icon-squircle {
            width: 32px;
            height: 32px;
            border-radius: 10px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-right: 11px;
            flex-shrink: 0;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.22);
            transition: all 0.24s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .nav-icon-squircle i {
            font-size: 1rem !important;
            color: #ffffff !important;
            margin: 0 !important;
            width: auto !important;
            filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
            transition: transform 0.2s ease;
        }

        /* Nav Link Hover */
        #sidebar .nav-link:hover {
            background: rgba(255, 255, 255, 0.1) !important;
            color: #ffffff !important;
            transform: translateX(4px);
            border-color: rgba(255, 255, 255, 0.12) !important;
        }
        #sidebar .nav-link:hover .nav-icon-squircle {
            transform: scale(1.1) rotate(-3deg);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.6);
        }

        /* Nav Link Active State */
        #sidebar .nav-link.active {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.24) 0%, rgba(255, 255, 255, 0.12) 100%) !important;
            color: #ffffff !important;
            font-weight: 700 !important;
            border: 1px solid rgba(255, 255, 255, 0.3) !important;
            box-shadow: 0 4px 18px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.25) !important;
        }
        #sidebar .nav-link.active .nav-icon-squircle {
            box-shadow: 0 0 16px rgba(255, 209, 102, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.8);
            border-color: rgba(255, 209, 102, 0.6);
            transform: scale(1.05);
        }
        #sidebar .nav-link.active::before {
            content: '';
            position: absolute;
            left: -4px;
            top: 50%;
            transform: translateY(-50%);
            height: 60%;
            width: 4px;
            background: #ffd166;
            border-radius: 0 4px 4px 0;
            box-shadow: 0 0 10px #ffd166;
        }

        /* Live Badge Counters */
        .sidebar-live-badge {
            font-size: 0.68rem;
            font-weight: 800;
            padding: 2px 7px;
            border-radius: 12px;
            color: #ffffff;
            background: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
            flex-shrink: 0;
            margin-left: 6px;
            transition: all 0.2s ease;
        }
        .sidebar-live-badge.has-data {
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: #ffffff;
            border-color: rgba(255, 209, 102, 0.4);
        }

        /* ------------------------------------
           SUBMENUS & DROPDOWNS
        ------------------------------------ */
        .sidebar-dropdown-group {
            margin: 2px 4px;
            border-radius: 14px;
            transition: background 0.25s ease;
        }
        .sidebar-dropdown-group.expanded {
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.08);
            padding-bottom: 4px;
        }
        .sidebar-dropdown-group .nav-link-parent {
            margin: 0 !important;
            cursor: pointer;
            user-select: none;
        }
        .sidebar-dropdown-group .dropdown-arrow {
            font-size: 0.85rem !important;
            opacity: 0.75;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            margin-left: 6px;
        }
        .sidebar-dropdown-group.expanded .dropdown-arrow,
        .sidebar-dropdown-group .nav-link-parent[aria-expanded="true"] .dropdown-arrow {
            transform: rotate(180deg);
            opacity: 1;
            color: #ffd166;
        }
        .sidebar-submenu {
            padding: 4px 6px 6px 14px;
            margin-left: 18px;
            border-left: 2px solid rgba(255, 255, 255, 0.16);
            display: flex;
            flex-direction: column;
            gap: 2px;
            transition: all 0.25s ease;
        }
        .sidebar-submenu:not(.show) {
            display: none !important;
        }
        .sidebar-submenu.show {
            display: flex !important;
            animation: submenuSlideDown 0.22s ease-out;
        }
        @keyframes submenuSlideDown {
            from { opacity: 0; transform: translateY(-6px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .sidebar-submenu .sub-nav-link {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding: 7px 10px !important;
            border-radius: 10px !important;
            font-size: 0.83rem !important;
            color: rgba(255, 255, 255, 0.82) !important;
            text-decoration: none !important;
            transition: all 0.2s ease !important;
            font-weight: 600 !important;
        }
        .sidebar-submenu .sub-nav-link .sub-link-left {
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 0;
            flex-grow: 1;
        }
        .sidebar-submenu .sub-icon-chip {
            width: 26px;
            height: 26px;
            border-radius: 8px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            box-shadow: 0 2px 7px rgba(0, 0, 0, 0.28), inset 0 1px 1px rgba(255, 255, 255, 0.35);
            border: 1px solid rgba(255, 255, 255, 0.2);
            transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .sidebar-submenu .sub-icon-chip i {
            font-size: 0.82rem !important;
            width: auto !important;
            color: #ffffff !important;
            opacity: 1 !important;
            line-height: 1;
            filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.35));
        }
        .sidebar-submenu .sub-nav-link:hover .sub-icon-chip {
            transform: scale(1.15) rotate(-4deg);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.5);
        }
        .sidebar-submenu .sub-nav-link.active .sub-icon-chip {
            transform: scale(1.08);
            box-shadow: 0 0 12px rgba(255, 209, 102, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.6);
            border-color: rgba(255, 209, 102, 0.6);
        }
        .sidebar-submenu .sub-nav-link .sub-label-main {
            font-size: 0.83rem !important;
            font-weight: 600;
            color: #ffffff !important;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .sidebar-submenu .sub-nav-link .sub-label-sub {
            font-size: 0.7rem !important;
            font-weight: 600;
            opacity: 0.85;
            color: rgba(255, 255, 255, 0.7) !important;
            margin-left: 4px;
        }
        .sidebar-submenu .sub-nav-link .sub-badge {
            font-size: 0.7rem !important;
            font-weight: 800 !important;
            color: rgba(255, 255, 255, 0.65) !important;
            background: rgba(255, 255, 255, 0.08) !important;
            padding: 2px 7px !important;
            border-radius: 12px;
            min-width: 20px !important;
            text-align: center;
            transition: all 0.2s ease;
            flex-shrink: 0;
        }
        .sidebar-submenu .sub-nav-link:hover {
            color: #ffffff !important;
            background: rgba(255, 255, 255, 0.12) !important;
            transform: translateX(3px);
        }
        .sidebar-submenu .sub-nav-link.active {
            color: #ffffff !important;
            background: #4f46e5 !important;
            border-radius: 10px !important;
            box-shadow: 0 4px 14px rgba(79, 70, 229, 0.45) !important;
        }
        .sidebar-submenu .sub-nav-link.active .sub-badge {
            background: rgba(255, 255, 255, 0.25) !important;
            color: #ffffff !important;
        }
        .badge-count-dark {
            background: rgba(255, 255, 255, 0.12) !important;
            color: #e2e8f0 !important;
            font-size: 0.72rem !important;
            font-weight: 700 !important;
            padding: 2px 7px !important;
            border-radius: 6px !important;
        }
        .sidebar-submenu .sub-nav-link .sub-badge.badge-percent {
            background: transparent !important;
            color: #10b981 !important;
            font-size: 0.76rem !important;
            font-weight: 800 !important;
        }
        .sidebar-submenu .sub-nav-link .sub-badge.badge-green {
            background: rgba(16, 185, 129, 0.22) !important;
            color: #34d399 !important;
            border-radius: 6px !important;
        }
        .sidebar-submenu .sub-nav-link .sub-badge.badge-blue {
            background: rgba(59, 130, 246, 0.25) !important;
            color: #60a5fa !important;
            border-radius: 6px !important;
        }
        .sidebar-submenu .sub-nav-link .sub-badge.badge-orange {
            background: rgba(245, 158, 11, 0.25) !important;
            color: #fbbf24 !important;
            border-radius: 6px !important;
        }
        .sidebar-submenu .sub-nav-link .sub-badge.badge-gold {
            background: rgba(217, 119, 6, 0.25) !important;
            color: #fcd34d !important;
            border-radius: 6px !important;
        }
        .sidebar-submenu .sub-nav-link .sub-badge.badge-blue-subtle {
            background: rgba(255, 255, 255, 0.22) !important;
            color: #ffffff !important;
            border-radius: 6px !important;
        }

        /* ------------------------------------
           FOOTER USER PROFILE
        ------------------------------------ */
        .sidebar-footer {
            padding: 12px 14px;
            background: rgba(0, 0, 0, 0.25);
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            position: relative;
            flex-shrink: 0;
            margin-top: auto;
            backdrop-filter: blur(10px);
        }
        .sidebar-user-trigger {
            outline: none !important;
            cursor: pointer;
            transition: all 0.2s ease;
            border-radius: 12px;
            padding: 4px 6px !important;
        }
        .sidebar-user-trigger:hover {
            background: rgba(255, 255, 255, 0.08);
        }
        .sidebar-user-info {
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 0;
            flex-grow: 1;
        }
        .sidebar-user-avatar {
            position: relative;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 2px solid rgba(255, 255, 255, 0.4);
            flex-shrink: 0;
            background: #ffffff;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        }
        .sidebar-user-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 50%;
        }
        .user-status-online {
            position: absolute;
            bottom: -1px;
            right: -1px;
            width: 11px;
            height: 11px;
            background: #10b981;
            border: 2px solid #3d0629;
            border-radius: 50%;
            box-shadow: 0 0 6px #10b981;
        }
        .sidebar-user-details {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            min-width: 0;
            gap: 2px;
        }
        .sidebar-user-name {
            font-size: 0.88rem;
            font-weight: 700;
            color: #ffffff;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            letter-spacing: 0.3px;
        }
        .sidebar-user-role {
            font-size: 0.65rem;
            font-weight: 800;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }
        .profile-caret {
            font-size: 1.1rem;
            transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .sidebar-footer.show .profile-caret {
            transform: rotate(180deg);
        }
        .custom-sidebar-profile-menu {
            position: absolute !important;
            bottom: calc(100% + 10px) !important;
            left: 10px !important;
            width: calc(100% - 20px) !important;
            min-width: 210px !important;
            background: rgba(45, 5, 33, 0.97) !important; 
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.15) !important;
            border-radius: 16px !important;
            padding: 8px !important;
            margin: 0 !important;
            box-shadow: 0 15px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.08) inset !important;
            z-index: 1050 !important;
            transform-origin: bottom center;
            animation: profileMenuPop 0.22s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes profileMenuPop {
            0% { opacity: 0; transform: translateY(8px) scale(0.96); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .custom-sidebar-profile-menu .dropdown-item {
            color: rgba(255, 255, 255, 0.85) !important;
            border-radius: 10px !important;
            margin: 2px 0 !important;
            font-size: 0.85rem !important;
            font-weight: 600 !important;
            padding: 8px 12px !important;
            transition: all 0.2s ease !important;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .custom-sidebar-profile-menu .dropdown-item i {
            font-size: 1rem;
            color: rgba(255, 255, 255, 0.6) !important;
        }
        .custom-sidebar-profile-menu .dropdown-item:hover {
            background: rgba(255, 255, 255, 0.12) !important;
            color: #ffffff !important;
        }
        .custom-sidebar-profile-menu .dropdown-item:hover i {
            color: #ffffff !important;
        }
        .custom-sidebar-profile-menu .dropdown-item.text-danger:hover {
            background: #dc3545 !important;
            color: #ffffff !important;
        }
        .custom-sidebar-profile-menu .dropdown-item.text-danger:hover i {
            color: #ffffff !important;
        }

        /* Responsive / Collapsed sidebar compatibility */
        body.sidebar-collapsed .sidebar-brand-details,
        body.sidebar-collapsed .sidebar-search-container,
        body.sidebar-collapsed .sidebar-user-details,
        body.sidebar-collapsed .profile-caret,
        body.sidebar-collapsed .dropdown-arrow,
        body.sidebar-collapsed .sidebar-submenu,
        body.sidebar-collapsed .sidebar-section-title,
        body.sidebar-collapsed .nav-link-label,
        body.sidebar-collapsed .sidebar-live-badge {
            display: none !important;
        }
        body.sidebar-collapsed #sidebar .nav-link {
            justify-content: center !important;
            padding: 10px !important;
        }
        body.sidebar-collapsed .nav-icon-squircle {
            margin-right: 0 !important;
        }
    </style>
    `);
})();

// 2. Global Dropdown & Sublink Handlers
window.handleSidebarParentClick = function(event, itemKey, href) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const group = document.getElementById(`group-${itemKey}`);
    const submenu = document.getElementById(`submenu-${itemKey}`);
    const parentLink = document.getElementById(`nav-${itemKey}`);
    if (submenu) {
        submenu.classList.toggle('show');
        const isShown = submenu.classList.contains('show');
        if (group) group.classList.toggle('expanded', isShown);
        if (parentLink) parentLink.setAttribute('aria-expanded', isShown ? 'true' : 'false');
        try {
            localStorage.setItem(`sidebar_grp_${itemKey}`, isShown ? 'expanded' : 'collapsed');
        } catch(e) {}
    }
};

window.handleSidebarSublinkClick = function(event, viewKey, href) {
    const currentFileName = window.location.pathname.split('/').pop() || 'index.html';

    // 1. Staff Management internal sub-views
    if (currentFileName === 'staff-management.html' && typeof window.switchStaffModuleView === 'function') {
        event.preventDefault();
        window.switchStaffModuleView(viewKey);
        document.querySelectorAll('.sidebar-submenu .sub-nav-link').forEach(link => {
            link.classList.toggle('active', link.getAttribute('data-sub-key') === viewKey);
        });
        window.history.pushState(null, '', href);
        return;
    }

    // 2. Data Tracking internal tabs (Cards, Certificates, Trackers)
    if (currentFileName === 'data-tracking.html') {
        const query = href.includes('?') ? new URLSearchParams(href.split('?')[1]) : null;
        const tab = query ? query.get('tab') : '';

        if (tab === 'card') {
            event.preventDefault();
            if (typeof window.openStudentCardTab === 'function') {
                window.openStudentCardTab();
            } else {
                const cardTabBtn = document.getElementById('card-tab') || document.querySelector('[data-bs-target="#card"]') || document.querySelector('[data-bs-target="#card-pane"]');
                if (cardTabBtn) {
                    if (typeof bootstrap !== 'undefined' && bootstrap.Tab) {
                        new bootstrap.Tab(cardTabBtn).show();
                    } else {
                        cardTabBtn.click();
                    }
                }
            }
            // Update active state in sidebar
            document.querySelectorAll('#sidebar .nav-link, #sidebar .sub-nav-link').forEach(link => {
                link.classList.remove('active', 'highlighted');
            });
            const cardLink = document.getElementById('nav-sub-studentCard');
            if (cardLink) cardLink.classList.add('active', 'highlighted');
            window.history.pushState(null, '', href);
            return;
        }

        if (tab === 'certificate') {
            event.preventDefault();
            const certBtn = document.getElementById('certificate-tab') || document.querySelector('[data-bs-target="#certificate"]');
            if (certBtn) {
                if (typeof bootstrap !== 'undefined' && bootstrap.Tab) {
                    new bootstrap.Tab(certBtn).show();
                } else {
                    certBtn.click();
                }
            }
            document.querySelectorAll('#sidebar .nav-link, #sidebar .sub-nav-link').forEach(link => {
                link.classList.remove('active', 'highlighted');
            });
            const certLink = document.getElementById('nav-sub-certificates');
            if (certLink) certLink.classList.add('active');
            window.history.pushState(null, '', href);
            return;
        }
    }
};

// 3. Section Accordion Toggle with LocalStorage
window.toggleSidebarSection = function(sectionId) {
    const titleEl = document.querySelector(`.sidebar-section-title[data-section-target="${sectionId}"]`);
    const bodyEl = document.getElementById(sectionId);
    if (!bodyEl) return;

    const isCollapsed = bodyEl.classList.toggle('collapsed');
    if (titleEl) titleEl.classList.toggle('collapsed', isCollapsed);

    try {
        localStorage.setItem(`sidebar_sec_${sectionId}`, isCollapsed ? 'collapsed' : 'open');
    } catch (e) {}
};

// 4. Live Search Filter Logic
window.filterSidebarModules = function(query) {
    const q = (query || '').trim().toLowerCase();
    const clearBtn = document.getElementById('sidebar-search-clear');
    const emptyNotice = document.getElementById('sidebar-search-empty');
    if (clearBtn) clearBtn.style.display = q ? 'inline-block' : 'none';

    const allLinks = document.querySelectorAll('#sidebar .nav-link:not(.nav-link-parent), #sidebar .sub-nav-link');
    const allParentGroups = document.querySelectorAll('#sidebar .sidebar-dropdown-group');
    const allSections = document.querySelectorAll('#sidebar .sidebar-section-body');
    const allSectionTitles = document.querySelectorAll('#sidebar .sidebar-section-title');

    if (!q) {
        // Reset everything back to normal
        if (emptyNotice) emptyNotice.style.display = 'none';
        allLinks.forEach(link => {
            link.style.display = '';
            link.classList.remove('search-matched');
        });
        allParentGroups.forEach(grp => grp.style.display = '');
        allSectionTitles.forEach(st => st.style.display = '');
        allSections.forEach(sec => {
            sec.style.display = '';
            // Restore previous user collapse state
            const secId = sec.id;
            const savedState = localStorage.getItem(`sidebar_sec_${secId}`);
            if (savedState === 'collapsed') {
                sec.classList.add('collapsed');
                const t = document.querySelector(`.sidebar-section-title[data-section-target="${secId}"]`);
                if (t) t.classList.add('collapsed');
            } else {
                sec.classList.remove('collapsed');
                const t = document.querySelector(`.sidebar-section-title[data-section-target="${secId}"]`);
                if (t) t.classList.remove('collapsed');
            }
        });
        // Re-run permission check if available
        if (typeof window.refreshSidebarPermissions === 'function') {
            window.refreshSidebarPermissions();
        }
        return;
    }

    let matchCount = 0;

    // Expand all sections during search
    allSections.forEach(sec => {
        sec.classList.remove('collapsed');
        sec.style.display = 'flex';
    });
    allSectionTitles.forEach(t => {
        t.classList.remove('collapsed');
        t.style.display = 'flex';
    });

    allLinks.forEach(link => {
        const text = (link.textContent || '').toLowerCase();
        const href = (link.getAttribute('href') || '').toLowerCase();
        const match = text.includes(q) || href.includes(q);

        if (match) {
            link.style.setProperty('display', 'flex', 'important');
            link.classList.add('search-matched');
            matchCount++;

            // If it's inside a submenu, auto-expand parent
            const submenu = link.closest('.sidebar-submenu');
            if (submenu) {
                submenu.classList.add('show');
                const group = submenu.closest('.sidebar-dropdown-group');
                if (group) {
                    group.classList.add('expanded');
                    group.style.setProperty('display', 'block', 'important');
                }
            }
        } else {
            link.style.setProperty('display', 'none', 'important');
            link.classList.remove('search-matched');
        }
    });

    // Check parent groups
    allParentGroups.forEach(group => {
        const visibleSub = group.querySelector('.sub-nav-link:not([style*="display: none"])');
        const parentLink = group.querySelector('.nav-link-parent');
        const parentText = parentLink ? parentLink.textContent.toLowerCase() : '';
        if (visibleSub || parentText.includes(q)) {
            group.style.setProperty('display', 'block', 'important');
            if (visibleSub) {
                const sub = group.querySelector('.sidebar-submenu');
                if (sub) sub.classList.add('show');
                group.classList.add('expanded');
            }
        } else {
            group.style.setProperty('display', 'none', 'important');
        }
    });

    // Hide empty sections during search
    allSections.forEach(sec => {
        const hasVisible = sec.querySelector('.nav-link:not([style*="display: none"]), .sidebar-dropdown-group:not([style*="display: none"])');
        const title = document.querySelector(`.sidebar-section-title[data-section-target="${sec.id}"]`);
        if (hasVisible) {
            sec.style.display = 'flex';
            if (title) title.style.display = 'flex';
        } else {
            sec.style.display = 'none';
            if (title) title.style.display = 'none';
        }
    });

    if (emptyNotice) {
        emptyNotice.style.display = (matchCount === 0) ? 'block' : 'none';
    }
};

window.clearSidebarModuleSearch = function() {
    const input = document.getElementById('sidebar-module-search');
    if (input) {
        input.value = '';
        window.filterSidebarModules('');
        input.focus();
    }
};

// Global Shortcut: Ctrl+K / Cmd+K
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        const searchInput = document.getElementById('sidebar-module-search');
        if (searchInput) {
            e.preventDefault();
            searchInput.focus();
            searchInput.select();
        }
    } else if (e.key === 'Escape') {
        const searchInput = document.getElementById('sidebar-module-search');
        if (searchInput && document.activeElement === searchInput) {
            window.clearSidebarModuleSearch();
            searchInput.blur();
        }
    }
});

// 5. Main Inject Function
function injectSidebar() {
    const sidebarContainer = document.getElementById('sidebar');
    if (!sidebarContainer) return;

    // Centralized Modern Modules Definition (Categorized ERP Structure)
    const defaultFallbackModules = [
        // 1. មេ / ទូទៅ (Main / Core)
        { key: 'dashboard', label: 'ផ្ទាំងគ្រប់គ្រង', icon: 'fi-rr-apps', href: 'index.html', badgeColor: 'bg-primary', iconGradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)' },

        // 2. ការងារសិស្ស & សិក្សា (Students & Academics)
        { key: 'registration', label: 'ការចុះឈ្មោះសិស្ស', icon: 'fi-rr-user-add', href: 'registration.html', badgeColor: 'bg-success', defaultChecked: true, sectionBefore: 'ការងារសិស្ស & សិក្សា (Students & Academics)', sectionIcon: 'fi-rr-graduation-cap', iconGradient: 'linear-gradient(135deg, #10b981, #059669)' },
        { key: 'data', label: 'បញ្ជីទិន្នន័យសិស្ស', icon: 'fi-rr-users-alt', href: 'data-tracking.html', badgeColor: 'bg-info text-dark', defaultChecked: true, iconGradient: 'linear-gradient(135deg, #06b6d4, #0284c7)' },

        // 3. កិច្ចការប្រចាំថ្ងៃ (Daily Tasks) - Collapsible Dropdowns
        { 
            key: 'teachingSchedule', 
            label: 'ការបង្រៀន & កាលវិភាគ', 
            icon: 'fi-rr-calendar', 
            href: 'teacher-portal.html',
            countBadge: '៣',
            defaultExpanded: true,
            sectionBefore: 'កិច្ចការប្រចាំថ្ងៃ (Daily Tasks)',
            sectionIcon: 'fi-rr-calendar-check',
            iconGradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            subItems: [
                { key: 'studentAttendance', label: 'វត្តមានប្រចាំថ្ងៃ', icon: 'fi-rr-calendar-check', iconGradient: 'linear-gradient(135deg, #10b981, #059669)', href: 'student-attendance.html', badge: '0%', badgeClass: 'badge-percent' },
                { key: 'eventsSchedule', label: 'ព្រឹត្តិការណ៍ & កាលវិភាគ', icon: 'fi-rr-calendar-lines', iconGradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', href: 'teacher-portal.html', badge: 'ថ្មី', badgeClass: 'badge-green' },
                { key: 'academicYear', label: 'ឆ្នាំសិក្សា & ឡើងថ្នាក់', icon: 'fi-rr-graduation-cap', iconGradient: 'linear-gradient(135deg, #f59e0b, #d97706)', href: 'settings.html', badge: 'ប្រព័ន្ធ', badgeClass: 'badge-blue' }
            ]
        },
        { 
            key: 'academicDocs', 
            label: 'លទ្ធផល & ឯកសារសិក្សា •', 
            icon: 'fi-rr-document', 
            href: 'monthly-score.html',
            countBadge: '៧',
            defaultExpanded: true,
            iconGradient: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
            subItems: [
                { key: 'monthlyScore', label: 'គ្រប់គ្រងពិន្ទុសិស្ស', icon: 'fi-rr-chart-histogram', iconGradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', href: 'monthly-score.html', badge: 'ថ្មី', badgeClass: 'badge-green' },
                { key: 'honorLeaderboard', label: 'តារាងកិត្តិយស', icon: 'fi-rr-trophy', iconGradient: 'linear-gradient(135deg, #f59e0b, #b45309)', href: 'monthly-score.html?view=rank', badge: 'ផ្ដើម', badgeClass: 'badge-orange' },
                { key: 'certificates', label: 'រៀបចំប័ណ្ណសរសើរ', icon: 'fi-rr-diploma', iconGradient: 'linear-gradient(135deg, #ec4899, #be185d)', href: 'data-tracking.html?tab=certificate', badge: 'រចនា', badgeClass: 'badge-gold' },
                { key: 'studentCard', label: 'ធ្វើកាតសិស្ស (ID Cards)', icon: 'fi-rr-id-badge', iconGradient: 'linear-gradient(135deg, #6366f1, #4338ca)', href: 'data-tracking.html?tab=card', badge: 'ថ្មី', badgeClass: 'badge-blue-subtle', isHighlighted: true },
                { key: 'studyTrackerBook', label: 'សៀវភៅតាមដានការសិក្សាសិស្ស', icon: 'fi-rr-book-bookmark', iconGradient: 'linear-gradient(135deg, #14b8a6, #0f766e)', href: 'data-tracking.html?view=tracker', badge: 'ថ្មី', badgeClass: 'badge-green' },
                { key: 'internBook', label: 'សៀវភៅសិក្ខាករិក', icon: 'fi-rr-book-alt', iconGradient: 'linear-gradient(135deg, #a855f7, #7e22ce)', href: 'data-tracking.html?view=intern', badge: 'ថ្មី', badgeClass: 'badge-gold' },
                { key: 'officialLetters', label: 'ចេញលិខិតរដ្ឋបាលផ្សេងៗ (Letters)', icon: 'fi-rr-document-signed', iconGradient: 'linear-gradient(135deg, #0284c7, #0369a1)', href: 'leave-request-a4.html', badge: 'ថ្មី', badgeClass: 'badge-blue' }
            ]
        },

        // 4. កំណត់ត្រាសិស្ស (Student Status & Records)
        { key: 'paidStudents', label: 'សិស្សបង់ផ្ដាច់', icon: 'fi-rr-badge-check', href: 'paid-students.html', badgeColor: 'bg-success', sectionBefore: 'កំណត់ត្រាសិស្ស (Student Records)', sectionIcon: 'fi-rr-folder-open', iconGradient: 'linear-gradient(135deg, #22c55e, #16a34a)' },
        { key: 'dropoutStudents', label: 'សិស្សបោះបង់ & ពន្យារ', icon: 'fi-rr-user-remove', href: 'dropout-students.html', badgeColor: 'bg-danger', iconGradient: 'linear-gradient(135deg, #ef4444, #dc2626)' },
        { key: 'graduatedStudents', label: 'សិស្សបញ្ចប់ការសិក្សា', icon: 'fi-rr-graduation-cap', href: 'graduated-students.html', badgeColor: 'bg-info text-dark', iconGradient: 'linear-gradient(135deg, #38bdf8, #2563eb)' },

        // 5. គ្រប់គ្រងបុគ្គលិក & ថ្នាក់រៀន (Staff & Classes Hub)
        { 
            key: 'staffManagement', 
            label: 'គ្រប់គ្រងបុគ្គលិក', 
            icon: 'fi-rr-briefcase', 
            href: 'staff-management.html', 
            badgeColor: 'bg-secondary',
            sectionBefore: 'បុគ្គលិក & ថ្នាក់រៀន (Staff & Classes)',
            sectionIcon: 'fi-rr-users',
            iconGradient: 'linear-gradient(135deg, #db2777, #9333ea)',
            subItems: [
                { key: 'classrooms', label: 'ថ្នាក់រៀន & បន្ទប់', icon: 'fi-rr-door-open', iconGradient: 'linear-gradient(135deg, #06b6d4, #0891b2)', href: 'staff-management.html?view=classrooms' },
                { key: 'teachers', label: 'គ្រូបង្រៀន & បុគ្គលិក', icon: 'fi-rr-chalkboard-user', iconGradient: 'linear-gradient(135deg, #db2777, #be185d)', href: 'staff-management.html?view=teachers' },
                { key: 'hr', label: 'គ្រប់គ្រងធនធានមនុស្ស', subtitle: '(HR)', icon: 'fi-rr-users-alt', iconGradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', href: 'staff-management.html?view=hr' },
                { key: 'activities', label: 'សកម្មភាពបុគ្គលិក', subtitle: '(Logs)', icon: 'fi-rr-time-past', iconGradient: 'linear-gradient(135deg, #f59e0b, #d97706)', href: 'staff-management.html?view=activities' }
            ]
        },

        // 6. ហិរញ្ញវត្ថុ & សម្ភារៈ (Finance & Assets)
        { key: 'incomeExpense', label: 'ចំណូលចំណាយ', icon: 'fi-rr-receipt', href: 'income-expense.html', badgeColor: 'bg-danger', sectionBefore: 'ហិរញ្ញវត្ថុ & ឃ្លាំង (Finance & Assets)', sectionIcon: 'fi-rr-wallet', iconGradient: 'linear-gradient(135deg, #f97316, #ea580c)' },
        { key: 'inventory', label: 'ស្តុកសម្ភារៈ', icon: 'fi-rr-box-alt', href: 'inventory.html', badgeColor: 'bg-warning text-dark', iconGradient: 'linear-gradient(135deg, #eab308, #ca8a04)' },

        // 7. ការគ្រប់គ្រងប្រព័ន្ធ (Administration & Settings)
        { key: 'userManagement', label: 'គ្រប់គ្រងអ្នកប្រើប្រាស់', icon: 'fi-rr-shield-check', href: 'user-management.html', badgeColor: 'bg-dark', sectionBefore: 'ការគ្រប់គ្រងប្រព័ន្ធ (Administration)', sectionIcon: 'fi-rr-settings-sliders', iconGradient: 'linear-gradient(135deg, #64748b, #475569)' },
        { key: 'settings', label: 'ការកំណត់ប្រព័ន្ធ', icon: 'fi-rr-settings', href: 'settings.html', badgeColor: 'bg-secondary', iconGradient: 'linear-gradient(135deg, #6b7280, #4b5563)' }
    ];

    const items = (window.SYSTEM_MODULES && window.SYSTEM_MODULES.length > 0) ? window.SYSTEM_MODULES : defaultFallbackModules;
    const currentFileName = window.location.pathname.split('/').pop() || 'index.html';
    const logo = window.SYSTEM_LOGO || "/img/1.jpg";
    const currentView = (new URLSearchParams(window.location.search).get('view')) || (currentFileName === 'staff-management.html' ? 'teachers' : '');
    const currentTab = (new URLSearchParams(window.location.search).get('tab')) || '';

    // Group items into sections
    const sections = [];
    let currentSection = {
        id: 'sec-core',
        title: '',
        icon: 'fi-rr-apps',
        items: []
    };

    let sectionIndex = 1;
    items.forEach(item => {
        if (item.sectionBefore) {
            if (currentSection.items.length > 0) {
                sections.push(currentSection);
            }
            currentSection = {
                id: `sec-${sectionIndex++}`,
                title: item.sectionBefore,
                icon: item.sectionIcon || 'fi-rr-folder',
                items: [item]
            };
        } else {
            currentSection.items.push(item);
        }
    });
    if (currentSection.items.length > 0) {
        sections.push(currentSection);
    }

    // Render HTML for each section
    let navSectionsHtml = '';

    sections.forEach(sec => {
        const containsActive = sec.items.some(item => {
            const itemCleanHref = item.href ? item.href.split('?')[0] : '';
            if (item.subItems && Array.isArray(item.subItems)) {
                return item.subItems.some(sub => {
                    const subClean = sub.href ? sub.href.split('?')[0] : '';
                    return currentFileName === subClean;
                });
            }
            return currentFileName === itemCleanHref;
        });

        // Determine initial collapsed state
        let isCollapsed = false;
        try {
            const savedState = localStorage.getItem(`sidebar_sec_${sec.id}`);
            if (sec.id === 'sec-2' || (sec.title && sec.title.includes('កិច្ចការប្រចាំថ្ងៃ'))) {
                isCollapsed = (savedState === 'collapsed');
            } else if (savedState === 'collapsed' && !containsActive) {
                isCollapsed = true;
            }
        } catch (e) {}

        const itemsHtml = sec.items.map(item => {
            const itemCleanHref = item.href ? item.href.split('?')[0] : '';
            const gradient = item.iconGradient || 'linear-gradient(135deg, #6366f1, #8b5cf6)';

            if (item.subItems && Array.isArray(item.subItems) && item.subItems.length > 0) {
                let hasActiveChild = false;
                const subItemsHtml = item.subItems.map(sub => {
                    const subCleanHref = sub.href ? sub.href.split('?')[0] : '';
                    const subQuery = sub.href && sub.href.includes('?') ? new URLSearchParams(sub.href.split('?')[1]) : null;
                    const subTab = subQuery ? subQuery.get('tab') : '';
                    const subView = subQuery ? subQuery.get('view') : '';

                    let isSubActive = false;
                    if (subTab && currentTab) {
                        isSubActive = (currentFileName === subCleanHref) && (subTab === currentTab);
                    } else if (subView && currentView) {
                        isSubActive = (currentFileName === subCleanHref) && (subView === currentView);
                    } else if (!subTab && !subView && !currentTab && !currentView && sub.href !== '#') {
                        isSubActive = (currentFileName === subCleanHref);
                    }

                    if (isSubActive) hasActiveChild = true;

                    let mainLabel = sub.label || '';
                    let subSubtitle = sub.subtitle || '';
                    if (!subSubtitle && mainLabel.includes('(HR)')) {
                        mainLabel = mainLabel.replace('(HR)', '').trim();
                        subSubtitle = '(HR)';
                    }
                    const subGradient = sub.iconGradient || 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.08))';
                    const iconInner = (sub.icon && sub.icon.startsWith('fi-')) 
                        ? `<i class="fi ${sub.icon}"></i>` 
                        : `<i class="fi fi-rr-bookmark"></i>`;
                    const iconHtml = `<span class="sub-icon-chip" style="background: ${subGradient};">${iconInner}</span>`;

                    const badgeText = sub.badge !== undefined ? sub.badge : '';
                    const badgeClass = sub.badgeClass || '';

                    return `
                    <a class="sub-nav-link ${isSubActive ? 'active' : ''} ${sub.isHighlighted && isSubActive ? 'highlighted' : ''}" 
                       href="/${sub.href}" 
                       id="nav-sub-${sub.key}" 
                       data-sub-key="${sub.key}"
                       onclick="handleSidebarSublinkClick(event, '${sub.key}', '/${sub.href}')">
                        <div class="sub-link-left">
                            ${iconHtml}
                            <div class="sub-label-wrap">
                                <span class="sub-label-main">${mainLabel}</span>
                                ${subSubtitle ? `<span class="sub-label-sub">${subSubtitle}</span>` : ''}
                            </div>
                        </div>
                        ${badgeText ? `<span class="sub-badge ${badgeClass}" id="sub-badge-${sub.key}">${badgeText}</span>` : `<span class="sub-badge" id="sub-badge-${sub.key}" style="display:none;">0</span>`}
                    </a>`;
                }).join('');

                const isDailyTasksDropdown = (item.key === 'teachingSchedule' || item.key === 'academicDocs');
                let isParentExpanded = isDailyTasksDropdown || (item.defaultExpanded === true) || hasActiveChild || (currentFileName === itemCleanHref && item.href !== '#');
                try {
                    const savedGrp = localStorage.getItem(`sidebar_grp_${item.key}`);
                    if (savedGrp === 'collapsed' && !hasActiveChild) {
                        isParentExpanded = false;
                    } else if (savedGrp === 'expanded') {
                        isParentExpanded = true;
                    }
                } catch(e) {}

                const isParentActive = (currentFileName === itemCleanHref && !hasActiveChild);

                return `
                <div class="sidebar-dropdown-group ${isParentExpanded ? 'expanded' : ''}" id="group-${item.key}">
                    <a class="nav-link nav-link-parent ${isParentActive ? 'active' : ''}" 
                       href="/${item.href}" 
                       id="nav-${item.key}"
                       data-module-key="${item.key}"
                       onclick="handleSidebarParentClick(event, '${item.key}', '/${item.href}')"
                       aria-expanded="${isParentExpanded ? 'true' : 'false'}">
                        <div class="nav-link-main">
                            <span class="nav-icon-squircle" style="background: ${gradient};">
                                <i class="fi ${item.icon}"></i>
                            </span>
                            <span class="nav-link-label">${item.label}</span>
                        </div>
                        <div class="d-flex align-items-center gap-2">
                            ${item.countBadge ? `<span class="badge-count-dark me-1">${item.countBadge}</span>` : ''}
                            <i class="fi fi-rr-angle-small-down dropdown-arrow"></i>
                        </div>
                    </a>
                    <div class="sidebar-submenu ${isParentExpanded ? 'show' : ''}" id="submenu-${item.key}">
                        ${subItemsHtml}
                    </div>
                </div>`;
            }

            const isActive = (currentFileName === itemCleanHref) && (!currentTab && !currentView);
            return `
            <a class="nav-link ${isActive ? 'active' : ''}" href="/${item.href}" id="nav-${item.key}" data-module-key="${item.key}">
                <div class="nav-link-main">
                    <span class="nav-icon-squircle" style="background: ${gradient};">
                        <i class="fi ${item.icon}"></i>
                    </span>
                    <span class="nav-link-label">${item.label}</span>
                </div>
                <span class="sidebar-live-badge" id="badge-${item.key}" style="display: none;"></span>
            </a>`;
        }).join('');

        if (sec.title) {
            navSectionsHtml += `
            <div class="sidebar-section-title ${isCollapsed ? 'collapsed' : ''}" 
                 data-section-target="${sec.id}" 
                 onclick="toggleSidebarSection('${sec.id}')"
                 title="ចុចដើម្បីបង្រួម/ពង្រីក">
                <div class="section-title-left">
                    <span class="section-title-icon-box"><i class="fi ${sec.icon}"></i></span>
                    <span>${sec.title}</span>
                </div>
                <div class="section-title-right">
                    <span class="section-count-badge">${sec.items.length}</span>
                    <i class="fi fi-rr-angle-small-down section-chevron"></i>
                </div>
            </div>
            <div class="sidebar-section-body ${isCollapsed ? 'collapsed' : ''}" id="${sec.id}">
                ${itemsHtml}
            </div>`;
        } else {
            // Core items (without category header)
            navSectionsHtml += `
            <div class="sidebar-section-body" id="${sec.id}">
                ${itemsHtml}
            </div>`;
        }
    });

    // Dynamic OS-aware shortcut badge (Windows -> Ctrl+K, Mac -> ⌘K)
    const isMac = (typeof navigator !== 'undefined' && navigator.userAgent) 
        ? (/Mac|iPhone|iPod|iPad/i.test(navigator.userAgent)) 
        : false;
    const shortcutKbd = isMac ? '⌘K' : 'Ctrl+K';
    const dynamicSchoolName = window.SYSTEM_SCHOOL_NAME || localStorage.getItem('system_school_name') || 'TIANXIN SCHOOL';

    sidebarContainer.innerHTML = `
        <div class="sidebar-header" id="sidebar-logo-container">
            <a href="/index.html" class="sidebar-brand-wrapper">
                <div class="sidebar-brand-logo-ring">
                    <img src="${logo}" alt="Logo" id="sidebar-logo" onerror="this.src='/img/1.jpg';">
                </div>
                <div class="sidebar-brand-details">
                    <span class="sidebar-brand-title" id="sidebar-brand-title">${dynamicSchoolName}</span>
                    <span class="sidebar-brand-status-chip" id="sidebar-connection-status" title="ស្ថានភាពប្រព័ន្ធ (System Connection)">
                        <span class="brand-pulse-dot" id="sidebar-pulse-dot"></span> 
                        <span id="sidebar-connection-text">ERP ONLINE</span>
                    </span>
                </div>
            </a>
        </div>

        <div class="sidebar-search-container">
            <div class="sidebar-search-box">
                <i class="fi fi-rr-search search-icon"></i>
                <input type="text" 
                       id="sidebar-module-search" 
                       class="sidebar-search-input" 
                       placeholder="ស្វែងរកម៉ូឌុល..." 
                       autocomplete="off" 
                       spellcheck="false"
                       oninput="filterSidebarModules(this.value)">
                <span class="search-kbd-badge" id="search-kbd-hint" title="ចុច ${shortcutKbd} ដើម្បីស្វែងរក" onclick="document.getElementById('sidebar-module-search')?.focus()">${shortcutKbd}</span>
                <button type="button" class="search-clear-btn" id="sidebar-search-clear" onclick="clearSidebarModuleSearch()" style="display: none;" title="សម្អាត">&times;</button>
            </div>
        </div>

        <div class="sidebar-nav-container">
            <div id="sidebar-search-empty" class="sidebar-search-empty">
                <i class="fi fi-rr-search-alt"></i>
                <span>រកមិនឃើញម៉ូឌុលទេ</span>
            </div>
            <nav class="nav flex-column" id="sidebar-main-nav">
                ${navSectionsHtml}
            </nav>
        </div>

        <div class="sidebar-footer dropdown">
            <button class="sidebar-user-trigger w-100 border-0 bg-transparent text-start p-0 m-0 d-flex align-items-center justify-content-between" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                <div class="sidebar-user-info">
                    <div class="sidebar-user-avatar">
                        <img id="sidebar-user-avatar" src="https://ui-avatars.com/api/?name=User&background=63083f&color=ffd166&bold=true" alt="Profile">
                        <span class="user-status-online"></span>
                    </div>
                    <div class="sidebar-user-details">
                        <span class="sidebar-user-name" id="sidebar-user-name">User</span>
                        <span class="sidebar-user-role badge bg-warning text-dark fw-bold rounded-pill" id="sidebar-user-role" style="font-size: 0.65rem; padding: 2px 7px;">Admin</span>
                    </div>
                </div>
                <i class="fi fi-rr-angle-small-down profile-caret text-white-50"></i>
            </button>
            <div class="dropdown-menu custom-sidebar-profile-menu shadow-lg">
                <a class="dropdown-item py-2 d-flex align-items-center gap-2" href="/profile.html">
                    <i class="fi fi-rr-user text-warning"></i> My Profile
                </a>
                <a class="dropdown-item py-2 d-flex align-items-center gap-2" href="/settings.html">
                    <i class="fi fi-rr-settings text-info"></i> Account Settings
                </a>
                <div class="dropdown-divider border-secondary" style="opacity: 0.15;"></div>
                <a class="dropdown-item py-2 d-flex align-items-center gap-2 text-danger fw-bold" href="#" onclick="handleLogout(event)">
                    <i class="fi fi-rr-sign-out-alt"></i> Log Out
                </a>
            </div>
        </div>
    `;

    // Live Dynamic Online / Offline status synchronization
    function syncSidebarConnectionStatus() {
        const isOnline = navigator.onLine !== false;
        const dot = document.getElementById('sidebar-pulse-dot');
        const text = document.getElementById('sidebar-connection-text');
        const chip = document.getElementById('sidebar-connection-status');
        if (dot && text && chip) {
            if (isOnline) {
                dot.style.backgroundColor = '#10b981';
                dot.style.boxShadow = '0 0 8px #10b981';
                text.textContent = 'ERP ONLINE';
                chip.style.borderColor = 'rgba(255, 209, 102, 0.28)';
                chip.style.color = '#ffd166';
                chip.style.background = 'rgba(255, 209, 102, 0.14)';
            } else {
                dot.style.backgroundColor = '#ef4444';
                dot.style.boxShadow = '0 0 8px #ef4444';
                text.textContent = 'OFFLINE';
                chip.style.borderColor = 'rgba(239, 68, 68, 0.35)';
                chip.style.color = '#fca5a5';
                chip.style.background = 'rgba(239, 68, 68, 0.18)';
            }
        }
    }
    if (typeof window.addEventListener === 'function') {
        window.addEventListener('online', syncSidebarConnectionStatus);
        window.addEventListener('offline', syncSidebarConnectionStatus);
    }
    syncSidebarConnectionStatus();

    if (typeof window.refreshSidebarPermissions === 'function') window.refreshSidebarPermissions();
    if (typeof window.refreshSidebarProfile === 'function') window.refreshSidebarProfile();

    // Initialize real-time counters
    initSidebarRealtimeCounters();
}

// 6. Real-Time Badge Synchronizer
function initSidebarRealtimeCounters() {
    // 1. Synchronize sub-badges on staff-management.html
    const syncStaffSubBadges = () => {
        ['classrooms', 'teachers', 'hr', 'activities'].forEach(k => {
            const pageBadge = document.getElementById(`tab-badge-${k}`);
            const subBadge = document.getElementById(`sub-badge-${k}`);
            if (pageBadge && subBadge && pageBadge.textContent) {
                subBadge.textContent = pageBadge.textContent;
            }
        });
    };
    syncStaffSubBadges();
    setTimeout(syncStaffSubBadges, 600);
    setTimeout(syncStaffSubBadges, 1500);

    // 2. Fetch live counts from Firebase if available
    try {
        if (typeof firebase !== 'undefined' && firebase.database && typeof firebase.database === 'function') {
            const db = firebase.database();

            // Students Count (for data-tracking / registration)
            db.ref('students').once('value').then(snap => {
                if (snap.exists()) {
                    const data = snap.val() || {};
                    let totalActive = 0;
                    let totalPaid = 0;
                    let totalDropout = 0;
                    let totalGrad = 0;

                    Object.values(data).forEach(s => {
                        if (!s) return;
                        const status = (s.status || '').toLowerCase();
                        if (status.includes('drop') || status.includes('pause') || status.includes('ពន្យារ') || status.includes('បោះបង់')) {
                            totalDropout++;
                        } else if (status.includes('grad') || status.includes('បញ្ចប់')) {
                            totalGrad++;
                        } else if (status.includes('paid') || status.includes('ផ្ដាច់')) {
                            totalPaid++;
                        } else {
                            totalActive++;
                        }
                    });

                    const updateBadge = (id, count) => {
                        const b = document.getElementById(id);
                        if (b && count > 0) {
                            b.textContent = count > 999 ? '999+' : count;
                            b.classList.add('has-data');
                            b.style.display = 'inline-block';
                        }
                    };

                    updateBadge('badge-data', totalActive + totalPaid);
                    updateBadge('badge-paidStudents', totalPaid);
                    updateBadge('badge-dropoutStudents', totalDropout);
                    updateBadge('badge-graduatedStudents', totalGrad);
                }
            }).catch(() => {});

            // Staff Count
            db.ref('staff').once('value').then(snap => {
                if (snap.exists()) {
                    const staffData = snap.val() || {};
                    const count = Object.keys(staffData).length;
                    const staffBadge = document.getElementById('sub-badge-teachers');
                    if (staffBadge && count > 0) {
                        staffBadge.textContent = count;
                    }
                }
            }).catch(() => {});
        }
    } catch (e) {
        // Silent catch: in case Firebase is not logged in or offline
    }
}

// Run injection on DOM readiness
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectSidebar);
} else {
    injectSidebar();
}

// 7. Global Image Hover Preview Setup
(function initImagePreview() {
    if (window.location.pathname.includes('teacher-portal.html')) return;

    document.head.insertAdjacentHTML('beforeend', `<style>
        .img-hover-preview-container {
            position: fixed; z-index: 999999; pointer-events: none; display: none;
            background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(12px) saturate(180%);
            -webkit-backdrop-filter: blur(12px) saturate(180%);
            border: 2px solid rgba(138, 14, 91, 0.4); border-radius: 24px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.5) inset;
            padding: 8px; max-width: 400px; max-height: 500px; overflow: hidden;
            animation: previewPopOut 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            transition: opacity 0.2s ease;
        }
        .img-hover-preview-container.loading::after {
            content: ""; position: absolute; top: 50%; left: 50%; width: 30px; height: 30px;
            margin: -15px 0 0 -15px; border: 3px solid rgba(138, 14, 91, 0.1); border-top-color: #8a0e5b;
            border-radius: 50%; animation: previewSpinner 0.8s linear infinite;
        }
        .img-hover-preview-container img {
            width: 100%; height: auto; max-height: 480px; display: block; border-radius: 16px;
            object-fit: contain; opacity: 0; transition: opacity 0.3s ease;
        }
        .img-hover-preview-container img.loaded { opacity: 1; }
        @keyframes previewPopOut { from { opacity: 0; transform: scale(0.8) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes previewSpinner { to { transform: rotate(360deg); } }
    </style>`);

    const container = document.createElement('div');
    container.className = 'img-hover-preview-container';

    const appendContainer = () => document.body.appendChild(container);
    if (document.body) {
        appendContainer();
    } else {
        document.addEventListener('DOMContentLoaded', appendContainer);
    }

    let currentSrc = '';

    const position = (e) => {
        if (!currentSrc) return;
        const rect = container.getBoundingClientRect();
        const offset = 25;
        let x = e.clientX + offset;
        let y = e.clientY + offset;

        if (x + rect.width > window.innerWidth) x = e.clientX - rect.width - offset;
        if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 15;

        x = Math.max(15, Math.min(x, window.innerWidth - rect.width - 15));
        y = Math.max(15, Math.min(y, window.innerHeight - rect.height - 15));

        container.style.left = `${x}px`;
        container.style.top = `${y}px`;
    };

    document.addEventListener('mouseover', e => {
        const img = e.target.closest('img');
        if (!img || !img.src || img.src === currentSrc) return;

        const rect = img.getBoundingClientRect();
        if (rect.width < 25 || rect.height < 25) return;

        const isExcluded = ['sidebar-logo', 'login-logo', 'loader-logo'].some(c => img.classList.contains(c)) || 
                           img.src.includes('favicon') || img.closest('.nav-link') || img.closest('button.btn-close');
        
        if (isExcluded) return;

        currentSrc = img.src;
        container.innerHTML = '';
        container.className = 'img-hover-preview-container loading';
        container.style.display = 'block';

        const previewImg = new Image();
        previewImg.onload = () => {
            container.classList.remove('loading');
            previewImg.classList.add('loaded');
            position(e);
        };
        previewImg.onerror = hide;
        previewImg.src = currentSrc;
        container.appendChild(previewImg);
        position(e);
    });

    document.addEventListener('mousemove', position);

    const hide = () => {
        container.style.display = 'none';
        container.innerHTML = '';
        currentSrc = '';
    };

    document.addEventListener('mouseout', e => {
        if (e.target.closest('img')) hide();
    });
})();
