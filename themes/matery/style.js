/* eslint-disable react/no-unknown-property */
import CONFIG from './config'
import { themeConsoleStyle } from '@/lib/themeConsoleStyle'
/**
 * 此处样式只对当前主题生效
 * 此处不支持tailwindCSS的 @apply 语法
 * @returns
 */
const Style = () => {
  return (
    <style jsx global>{`
        // 底色
        body {
            background-color: #f5f5f5;
        }

        .dark body {
            background-color: #020617;
        }

        .matery-home-scene {
            transform-origin: center;
            background: #020617;
        }

        .matery-home-entrance-surface {
            transform-origin: center center;
        }

        .matery-home-entrance-waiting,
        #theme-matery.matery-home-phase-waiting #header {
            transform: scale(1.14) translateZ(0);
            filter: blur(16px);
            will-change: transform, filter;
        }

        #theme-matery.matery-home-phase-waiting #sticky-nav,
        #theme-matery.matery-home-phase-waiting #wrapper,
        #theme-matery.matery-home-phase-waiting .matery-home-float-buttons,
        #theme-matery.matery-home-phase-waiting footer {
            filter: blur(16px);
            will-change: filter;
        }

        .matery-home-entrance-playing,
        #theme-matery.matery-home-phase-playing #header {
            animation: matery-home-entrance-pullback 2s cubic-bezier(0.62, 0.21, 0.25, 1) both;
            will-change: transform, filter;
        }

        #theme-matery.matery-home-phase-playing #sticky-nav,
        #theme-matery.matery-home-phase-playing #wrapper,
        #theme-matery.matery-home-phase-playing .matery-home-float-buttons,
        #theme-matery.matery-home-phase-playing footer {
            animation: matery-home-entrance-blur 2s cubic-bezier(0.62, 0.21, 0.25, 1) both;
            will-change: filter;
        }

        .matery-home-entrance-veil {
            position: fixed;
            inset: 0;
            z-index: 2147483646;
            pointer-events: none;
            background: rgba(2, 6, 23, 0.28);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
        }

        .matery-home-entrance-veil-playing {
            animation: matery-home-entrance-veil-fade 2s cubic-bezier(0.62, 0.21, 0.25, 1) both;
            will-change: opacity;
        }

        @keyframes matery-home-entrance-pullback {
            from {
                transform: scale(1.14) translateZ(0);
                filter: blur(16px);
            }
            to {
                transform: scale(1) translateZ(0);
                filter: blur(0);
            }
        }

        @keyframes matery-home-entrance-blur {
            from {
                filter: blur(16px);
            }
            to {
                filter: blur(0);
            }
        }

        @keyframes matery-home-entrance-veil-fade {
            from {
                opacity: 1;
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
            }
            to {
                opacity: 0;
                backdrop-filter: blur(0);
                -webkit-backdrop-filter: blur(0);
            }
        }

        @media (prefers-reduced-motion: reduce) {
            .matery-home-scene {
                animation: none;
                transform: none;
                filter: none;
                opacity: 1;
            }

            .matery-home-entrance-surface {
                animation: none;
                transform: none;
                filter: none;
            }

            #theme-matery #sticky-nav,
            #theme-matery #header,
            #theme-matery #wrapper,
            #theme-matery .matery-home-float-buttons,
            #theme-matery footer {
                animation: none;
                transform: none;
                filter: none;
            }

            .matery-home-entrance-veil {
                display: none;
            }
        }

        /* 移动搜索与评论区统一采用深色玻璃质感 */
        #theme-matery input[type='search']::-webkit-search-cancel-button {
            display: none;
        }

        #theme-matery .matery-comment-shell {
            border: 1px solid rgba(255, 255, 255, 0.11);
            border-radius: 1.5rem;
            background: linear-gradient(
                145deg,
                rgba(15, 23, 42, 0.54),
                rgba(2, 6, 23, 0.32)
            );
            -webkit-backdrop-filter: blur(20px) saturate(130%);
            backdrop-filter: blur(20px) saturate(130%);
            box-shadow:
                0 24px 64px rgba(0, 0, 0, 0.24),
                inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }

        #theme-matery .matery-comment-shell .comment {
            margin-top: 0;
        }

        #theme-matery [data-waline] {
            --waline-white: #f8fafc;
            --waline-color: rgba(226, 232, 240, 0.92);
            --waline-light-grey: rgba(148, 163, 184, 0.8);
            --waline-dark-grey: rgba(203, 213, 225, 0.9);
            --waline-theme-color: #818cf8;
            --waline-active-color: #a5b4fc;
            --waline-bg-color: rgba(2, 6, 23, 0.28);
            --waline-bg-color-light: rgba(255, 255, 255, 0.07);
            --waline-bg-color-hover: rgba(255, 255, 255, 0.11);
            --waline-border-color: rgba(255, 255, 255, 0.12);
            --waline-info-bg-color: rgba(255, 255, 255, 0.07);
            --waline-info-color: rgba(148, 163, 184, 0.9);
            --waline-box-shadow: 0 18px 48px rgba(0, 0, 0, 0.2);
        }

        #theme-matery [data-waline] .wl-panel {
            overflow: hidden;
            margin: 0;
            border: 1px solid rgba(255, 255, 255, 0.13);
            border-radius: 1.25rem;
            background: rgba(2, 6, 23, 0.34);
            -webkit-backdrop-filter: blur(18px) saturate(125%);
            backdrop-filter: blur(18px) saturate(125%);
            box-shadow:
                0 18px 44px rgba(0, 0, 0, 0.22),
                inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }

        #theme-matery [data-waline] .wl-header {
            gap: 0.5rem;
            padding: 0.65rem;
            border-bottom: 0;
        }

        #theme-matery [data-waline] .wl-header-item {
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 999px;
            background: rgba(15, 23, 42, 0.58);
            transition: border-color 180ms ease, background 180ms ease;
        }

        #theme-matery [data-waline] .wl-header-item:focus-within {
            border-color: rgba(129, 140, 248, 0.72);
            background: rgba(30, 41, 59, 0.72);
        }

        #theme-matery [data-waline] .wl-header label {
            color: rgba(203, 213, 225, 0.82);
        }

        #theme-matery [data-waline] .wl-header input {
            color: rgba(248, 250, 252, 0.95);
        }

        #theme-matery [data-waline] .wl-editor {
            box-sizing: border-box;
            width: calc(100% - 2rem);
            margin: 0.35rem 1rem 0.75rem;
            padding: 0.9rem 1rem;
            border: 1px solid rgba(255, 255, 255, 0.11);
            border-radius: 1rem;
            background: rgba(15, 23, 42, 0.48);
            color: rgba(248, 250, 252, 0.95);
        }

        #theme-matery [data-waline] .wl-editor:focus,
        #theme-matery [data-waline] .wl-input:focus {
            border-color: rgba(129, 140, 248, 0.72);
            background: rgba(30, 41, 59, 0.62);
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
        }

        #theme-matery [data-waline] .wl-btn {
            border-color: rgba(255, 255, 255, 0.14);
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.06);
        }

        #theme-matery [data-waline] .wl-btn.primary {
            border-color: rgba(129, 140, 248, 0.75);
            background: linear-gradient(135deg, #6366f1, #818cf8);
            box-shadow: 0 8px 24px rgba(99, 102, 241, 0.24);
        }

        #theme-matery [data-waline] .wl-card-item {
            margin-bottom: 0.75rem;
            padding: 0.85rem;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 1rem;
            background: rgba(2, 6, 23, 0.22);
            -webkit-backdrop-filter: blur(12px);
            backdrop-filter: blur(12px);
        }

        #theme-matery [data-waline] .wl-card {
            border-bottom: 0;
        }

        @media (max-width: 580px) {
            #theme-matery .matery-comment-shell {
                margin-left: 0;
                margin-right: 0;
                padding: 1rem 0.8rem;
                border-radius: 1.25rem;
            }

            #theme-matery [data-waline] .wl-header-item {
                width: 100%;
                margin-bottom: 0.5rem;
                border-bottom: 1px solid rgba(255, 255, 255, 0.12);
            }

            #theme-matery [data-waline] .wl-header-item:last-child {
                margin-bottom: 0;
            }
        }

        /* 设置了从上到下的渐变黑色 */
        #theme-matery .header-cover::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(
                    to bottom,
                    rgba(0, 0, 0, 0.5) 0%,
                    rgba(0, 0, 0, 0.2) 10%,
                    rgba(0, 0, 0, 0) 25%,
                    rgba(0, 0, 0, 0.2) 75%,
                    rgba(0, 0, 0, 0.5) 100%
            );
        }

        // 自定义滚动条
        ::-webkit-scrollbar {
            width: 12px;
            height: 6px;
        }

        ::-webkit-scrollbar-track {
            background-color: #020617;
        }

        ::-webkit-scrollbar-thumb {
            background-color: #6A6A6A;
            border-radius: 8px;
            cursor: pointer;
            border: 2px solid #020617;
        }

        ::-webkit-scrollbar-thumb:hover {
            background-color: #525168;
        }

        * {
            scrollbar-width: thin;
            scrollbar-color: #6A6A6A #020617;
        }

        /* 自定义光标 - 马里奥白手套 (内联base64，无加载延迟) */
        html, body {
            cursor: url(data:image/png;base64,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) 0 0, auto !important;
        }

        a, button, [role='button'], input, textarea, select, .cursor-pointer {
            cursor: url(data:image/png;base64,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) 0 0, pointer !important;
        }

        ${themeConsoleStyle('matery', CONFIG)}
    `}</style>
  )
}

export { Style }
