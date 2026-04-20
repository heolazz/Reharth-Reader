import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, FileText, LayoutTemplate, ScrollText, Settings2 } from 'lucide-react';
import { ReaderTheme, FontFamily, ReadingMode, PageLayout } from '../types';

interface ReaderSettingsProps {
    isOpen: boolean;
    onClose: () => void;
    // Theme
    theme: ReaderTheme;
    setTheme: (t: ReaderTheme) => void;
    // Font
    fontFamily: FontFamily;
    setFontFamily: (f: FontFamily) => void;
    fontSize: number;
    setFontSize: (s: number) => void;
    lineHeight: number;
    setLineHeight: (l: number) => void;
    letterSpacing: number;
    setLetterSpacing: (s: number) => void;
    // View
    readingMode: ReadingMode;
    setReadingMode: (m: ReadingMode) => void;
    pageLayout: PageLayout;
    setPageLayout: (l: PageLayout) => void;
    // Context
    isPdf?: boolean; // If we ever support PDF or Text-only modes differently
    getTabStyle: (isActive: boolean) => string;
}

export const ReaderSettings: React.FC<ReaderSettingsProps> = ({
    isOpen,
    onClose,
    theme,
    setTheme,
    fontFamily,
    setFontFamily,
    fontSize,
    setFontSize,
    lineHeight,
    setLineHeight,
    letterSpacing,
    setLetterSpacing,
    readingMode,
    setReadingMode,
    pageLayout,
    setPageLayout,
    getTabStyle
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ scale: 0.95, y: -10 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: -10 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute top-16 right-6 w-80 rounded-2xl shadow-xl overflow-hidden z-[60] border ${theme === 'dark' ? 'bg-[#181818] border-white/10 text-[#d4d4d4]' : 'bg-white border-black/5 text-[#4a4a4a]'}`}
                >
                    <div className="p-6 space-y-7">

                        {/* 1. Theme Selection */}
                        <div className="space-y-3">
                            <span className="text-[10px] uppercase font-bold tracking-widest opacity-30">Theme</span>
                            <div className="flex gap-4">
                                {[
                                    { t: 'paper', label: 'Paper', bg: '#F2EFED', border: '#e0dedc' },
                                    { t: 'clean', label: 'Clean', bg: '#FFFFFF', border: '#f0f0f0' },
                                    { t: 'dark', label: 'Dark', bg: '#1A1A1A', border: '#333333' }
                                ].map((opt) => (
                                    <button
                                        key={opt.t}
                                        onClick={() => setTheme(opt.t as ReaderTheme)}
                                        className={`group flex-1 h-10 rounded-full border flex items-center justify-center transition-all duration-300 relative overflow-hidden ${theme === opt.t ? 'ring-1 ring-offset-1 ring-current' : 'opacity-100 hover:scale-105'}`}
                                        style={{ backgroundColor: opt.bg, borderColor: 'transparent' }}
                                        title={opt.label}
                                    >
                                        <span className={`font-serif text-lg ${opt.t === 'dark' ? 'text-white/80' : 'text-black/70'}`}>Aa</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="h-px bg-current opacity-[0.03]" />

                        {/* 2. Typography */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase font-bold tracking-widest opacity-30">Typography</span>
                            </div>

                            {/* Font Family */}
                            <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-lg">
                                {[
                                    { id: 'serif', label: 'Serif', font: 'font-serif' },
                                    { id: 'sans', label: 'Sans', font: 'font-sans' },
                                    { id: 'mono', label: 'Mono', font: 'font-mono' }
                                ].map((font) => (
                                    <button
                                        key={font.id}
                                        onClick={() => setFontFamily(font.id as FontFamily)}
                                        className={`flex-1 py-1.5 rounded-md text-xs transition-all ${font.font} ${fontFamily === font.id ? 'bg-white dark:bg-white/10 text-current shadow-sm' : 'opacity-50 hover:opacity-100'}`}
                                    >
                                        {font.label}
                                    </button>
                                ))}
                            </div>

                            {/* Font Size */}
                            <div className="flex items-center gap-4 pt-1">
                                <button onClick={() => setFontSize(Math.max(12, fontSize - 1))} className="opacity-30 hover:opacity-100 transition-opacity"><span className="text-xs font-serif">A</span></button>
                                <div className="flex-1 h-px bg-current opacity-10 relative">
                                    <div className="absolute top-1/2 -translate-y-1/2 w-full h-6 flex items-center cursor-pointer"> {/* Hit area */}
                                        <input
                                            type="range"
                                            min="12" max="32" step="1"
                                            value={fontSize}
                                            onChange={(e) => setFontSize(parseInt(e.target.value))}
                                            className="w-full h-full opacity-0 cursor-pointer absolute z-10"
                                        />
                                        <div
                                            className="h-full bg-current opacity-40 rounded-full absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none transition-all"
                                            style={{ height: '2px', width: `${((fontSize - 12) / 20) * 100}%` }}
                                        />
                                        <div
                                            className="w-2.5 h-2.5 bg-current rounded-full absolute top-1/2 -translate-y-1/2 shadow-sm pointer-events-none transition-all opacity-80"
                                            style={{ left: `${((fontSize - 12) / 20) * 100}%`, marginLeft: '-5px' }}
                                        />
                                    </div>
                                </div>
                                <button onClick={() => setFontSize(Math.min(32, fontSize + 1))} className="opacity-30 hover:opacity-100 transition-opacity"><span className="text-lg font-serif">A</span></button>
                            </div>

                            {/* Line Height */}
                            <div className="space-y-1 pt-2">
                                <div className="flex justify-between items-center text-xs opacity-60 font-serif">
                                    <span>Line Spacing</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-3 h-3 flex flex-col justify-between opacity-30"><div className="w-full h-px bg-current"></div><div className="w-full h-px bg-current"></div><div className="w-full h-px bg-current"></div></div>
                                    <div className="flex-1 h-px bg-current opacity-10 relative">
                                        <div className="absolute top-1/2 -translate-y-1/2 w-full h-6 flex items-center cursor-pointer">
                                            <input type="range" min="1.0" max="2.5" step="0.1" value={lineHeight} onChange={(e) => setLineHeight(parseFloat(e.target.value))} className="w-full h-full opacity-0 cursor-pointer absolute z-10" />
                                            <div className="h-full bg-current opacity-40 rounded-full absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none transition-all" style={{ height: '2px', width: `${((lineHeight - 1.0) / 1.5) * 100}%` }} />
                                            <div className="w-2.5 h-2.5 bg-current rounded-full absolute top-1/2 -translate-y-1/2 shadow-sm pointer-events-none transition-all opacity-80" style={{ left: `${((lineHeight - 1.0) / 1.5) * 100}%`, marginLeft: '-5px' }} />
                                        </div>
                                    </div>
                                    <div className="w-3 h-4 flex flex-col justify-between opacity-30"><div className="w-full h-px bg-current"></div><div className="w-full h-px bg-current"></div><div className="w-full h-px bg-current"></div></div>
                                </div>
                            </div>

                            {/* Letter Spacing */}
                            <div className="space-y-1 pt-2">
                                <div className="flex justify-between items-center text-xs opacity-60 font-serif">
                                    <span>Letter Spacing</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-[10px] opacity-30 tracking-tighter">ABC</div>
                                    <div className="flex-1 h-px bg-current opacity-10 relative">
                                        <div className="absolute top-1/2 -translate-y-1/2 w-full h-6 flex items-center cursor-pointer">
                                            <input type="range" min="0" max="0.3" step="0.05" value={letterSpacing} onChange={(e) => setLetterSpacing(parseFloat(e.target.value))} className="w-full h-full opacity-0 cursor-pointer absolute z-10" />
                                            <div className="h-full bg-current opacity-40 rounded-full absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none transition-all" style={{ height: '2px', width: `${(letterSpacing / 0.3) * 100}%` }} />
                                            <div className="w-2.5 h-2.5 bg-current rounded-full absolute top-1/2 -translate-y-1/2 shadow-sm pointer-events-none transition-all opacity-80" style={{ left: `${(letterSpacing / 0.3) * 100}%`, marginLeft: '-5px' }} />
                                        </div>
                                    </div>
                                    <div className="text-[10px] opacity-30 tracking-widest">A B C</div>
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-current opacity-[0.03]" />

                        {/* 3. View Settings */}
                        <div className="space-y-4">
                            <span className="text-[10px] uppercase font-bold tracking-widest opacity-30">View</span>

                            {/* Mode Toggle */}
                            <div className="flex items-center justify-between">
                                <span className="text-xs opacity-60 font-serif">Mode</span>
                                <div className="flex bg-black/5 dark:bg-white/5 rounded-lg p-1 gap-1">
                                    <button
                                        onClick={() => setReadingMode('paged')}
                                        className={`p-1.5 px-3 rounded-md transition-all flex items-center gap-2 ${readingMode === 'paged' ? 'bg-white dark:bg-white/10 text-current shadow-sm' : 'opacity-40 hover:opacity-80'}`}
                                        title="Paged Mode"
                                    >
                                        <BookOpen size={14} /> <span className="text-[10px] font-medium tracking-wide uppercase">Pages</span>
                                    </button>
                                    <button
                                        onClick={() => setReadingMode('scroll')}
                                        className={`p-1.5 px-3 rounded-md transition-all flex items-center gap-2 ${readingMode === 'scroll' ? 'bg-white dark:bg-white/10 text-current shadow-sm' : 'opacity-40 hover:opacity-80'}`}
                                        title="Scroll Mode"
                                    >
                                        <ScrollText size={14} /> <span className="text-[10px] font-medium tracking-wide uppercase">Scroll</span>
                                    </button>
                                </div>
                            </div>

                            {/* Layout Toggle (Conditional) */}
                            {readingMode === 'paged' && (
                                <div className="flex items-center justify-between">
                                    <span className="text-xs opacity-60 font-serif">Columns</span>
                                    <div className="flex bg-black/5 dark:bg-white/5 rounded-lg p-1 gap-1">
                                        <button
                                            onClick={() => setPageLayout('single')}
                                            className={`p-1.5 px-3 rounded-md transition-all ${pageLayout === 'single' ? 'bg-white dark:bg-white/10 text-current shadow-sm' : 'opacity-40 hover:opacity-80'}`}
                                            title="Single Page"
                                        >
                                            <FileText size={14} />
                                        </button>
                                        <button
                                            onClick={() => setPageLayout('double')}
                                            className={`p-1.5 px-3 rounded-md transition-all ${pageLayout === 'double' ? 'bg-white dark:bg-white/10 text-current shadow-sm' : 'opacity-40 hover:opacity-80'}`}
                                            title="Double Page Spread"
                                        >
                                            <LayoutTemplate size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
