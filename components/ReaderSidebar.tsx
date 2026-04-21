import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowLeft, Trash2 } from 'lucide-react';
import { Bookmark, Highlight, ReaderTheme, HighlightColor } from '../types';
import { HIGHLIGHT_COLORS } from '../constants';

interface ReaderSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    theme: ReaderTheme;
    // State
    activeTab: 'chapters' | 'bookmarks' | 'highlights';
    setActiveTab: (tab: 'chapters' | 'bookmarks' | 'highlights') => void;
    showSearch: boolean;
    setShowSearch: (show: boolean) => void;
    // Search
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    isSearching: boolean;
    searchResults: { cfi: string; excerpt: string }[];
    handleSearch: (q: string) => void;
    // Data
    toc: any[];
    bookmarks: Bookmark[];
    highlights: Highlight[];
    activeChapterHref: string;
    // Actions
    onNavigate: (cfi: string) => void;
    onSearchResultClick: (cfi: string) => void;
    onRemoveBookmark: (id: string) => void;
    onRemoveHighlight: (id: string) => void;
    // Styling Helpers
    getTabStyle: (active: boolean) => string;
    menuItemClass: string;
    bookmarkItemClass: string;
}

export const ReaderSidebar: React.FC<ReaderSidebarProps> = ({
    isOpen,
    onClose,
    theme,
    activeTab,
    setActiveTab,
    showSearch,
    setShowSearch,
    searchQuery,
    setSearchQuery,
    isSearching,
    searchResults,
    handleSearch,
    toc,
    bookmarks,
    highlights,
    activeChapterHref,
    onNavigate,
    onSearchResultClick,
    onRemoveBookmark,
    onRemoveHighlight,
    getTabStyle,
    menuItemClass,
    bookmarkItemClass
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 z-[80] backdrop-blur-sm"
                    />
                    {/* Sidebar Panel */}
                    <motion.div
                        initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className={`fixed top-0 bottom-0 left-0 w-80 z-[90] shadow-2xl flex flex-col ${theme === 'dark' ? 'bg-[#1a1a1a] text-[#e5e5e5]' : 'bg-white text-[#3D3028]'}`}
                    >
                        {/* Header */}
                        <div className="p-6 pb-2">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <h3 className="font-serif text-xl font-bold">{showSearch ? 'Search' : 'Menu'}</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => { setShowSearch(!showSearch); if (!showSearch) setActiveTab('chapters'); }}
                                        className={`p-2 rounded-full transition-all active:scale-90 ${showSearch ? 'bg-black/10 dark:bg-white/10' : 'opacity-50 hover:opacity-100'}`}
                                    >
                                        <Search size={18} />
                                    </button>
                                    <button onClick={onClose} className="opacity-50 hover:opacity-100 transition-all active:scale-90"><ArrowLeft size={20} /></button>
                                </div>
                            </div>

                            {/* Tabs */}
                            {!showSearch && (
                                <div className={`flex items-center gap-1 p-1 rounded-lg ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'}`}>
                                    <button
                                        onClick={() => setActiveTab('chapters')}
                                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${getTabStyle(activeTab === 'chapters')}`}
                                    >
                                        Chapters
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('bookmarks')}
                                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${getTabStyle(activeTab === 'bookmarks')}`}
                                    >
                                        Bookmarks
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('highlights')}
                                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${getTabStyle(activeTab === 'highlights')}`}
                                    >
                                        Highlights
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-6 pt-2">

                            {/* CHAPTERS */}
                            {!showSearch && activeTab === 'chapters' && (
                                <div className="space-y-1">
                                    {toc.length === 0 && <div className="opacity-50 text-sm italic text-center py-4">No chapters found</div>}
                                    {toc.map((chapter, i) => (
                                        <button
                                            key={i}
                                            onClick={() => { onNavigate(chapter.href); onClose(); }}
                                            className={`w-full text-left py-3 px-4 rounded-lg text-sm font-medium transition-colors ${menuItemClass} ${activeChapterHref === chapter.href ? 'bg-black/5 dark:bg-white/10 font-bold border-l-4 border-current' : ''}`}
                                        >
                                            {chapter.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* BOOKMARKS */}
                            {!showSearch && activeTab === 'bookmarks' && (
                                <div className="space-y-3">
                                    {bookmarks.length === 0 && <div className="opacity-50 text-sm italic text-center py-4">No bookmarks yet</div>}
                                    {bookmarks.map((b) => (
                                        <div key={b.id} className={`group flex items-start gap-3 p-3 rounded-lg transition-colors ${bookmarkItemClass}`}>
                                            <button
                                                onClick={() => { onNavigate(b.cfi); onClose(); }}
                                                className="flex-1 text-left"
                                            >
                                                <div className="text-sm font-medium line-clamp-2">{b.label}</div>
                                                {b.note && <div className="text-xs font-medium text-blue-500/80 mt-1 italic">Note: "{b.note}"</div>}
                                                {b.textPreview && <div className="text-xs italic opacity-70 mt-1 line-clamp-2 font-serif">"{b.textPreview}"</div>}
                                                <div className="flex items-center gap-2 mt-2 opacity-50">
                                                    <div className="text-[10px] uppercase font-bold tracking-wider">{new Date(b.createdAt).toLocaleDateString()}</div>
                                                    {b.page && <div className="text-[10px]">• Page {b.page}</div>}
                                                </div>
                                            </button>
                                            <button onClick={() => onRemoveBookmark(b.id)} className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-500/10 rounded transition-opacity">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* HIGHLIGHTS */}
                            {!showSearch && activeTab === 'highlights' && (
                                <div className="space-y-3">
                                    {highlights.length === 0 && <div className="opacity-50 text-sm italic text-center py-4">No highlights yet</div>}
                                    {highlights.map((h) => (
                                        <div key={h.id} className={`group flex items-start gap-3 p-3 rounded-lg transition-colors ${bookmarkItemClass}`}>
                                            <div className={`w-1 self-stretch rounded-full shrink-0 mt-1`} style={{ backgroundColor: HIGHLIGHT_COLORS[h.color as HighlightColor] || h.color }} />
                                            <div className="flex-1 min-w-0">
                                                <button
                                                    onClick={() => { onNavigate(h.cfiRange); onClose(); }}
                                                    className="text-left w-full"
                                                >
                                                    <div className="flex items-center gap-2 mb-1.5 opacity-50">
                                                        <div className="text-[10px] uppercase font-bold tracking-wider">Highlight</div>
                                                        {h.chapterLabel && <div className="text-[10px] line-clamp-1 flex-1 truncate max-w-[120px]">• {h.chapterLabel}</div>}
                                                    </div>
                                                    <div className="text-sm italic opacity-90 mb-2 font-serif leading-relaxed">
                                                        "{h.text ? (h.text.length > 120 ? h.text.substring(0, 120) + "..." : h.text) : 'Selected text...'}"
                                                    </div>
                                                    <div className="flex items-center gap-2 opacity-40">
                                                        <div className="text-[10px]">{new Date(h.createdAt).toLocaleDateString()}</div>
                                                        {h.page && <div className="text-[10px]">• Page {h.page}</div>}
                                                    </div>
                                                </button>
                                            </div>
                                            <button onClick={() => onRemoveHighlight(h.id)} className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-500/10 rounded self-center transition-opacity">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* SEARCH */}
                            {showSearch && (
                                <div className="space-y-4">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
                                            placeholder="Type and press Enter..."
                                            autoFocus
                                            className={`w-full py-2 pl-9 pr-3 text-sm rounded-lg border focus:outline-none focus:ring-1 focus:ring-current ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/5'}`}
                                        />
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                                    </div>
                                    {isSearching && <div className="text-xs text-center opacity-50 py-4 animate-pulse">Searching book...</div>}

                                    {!isSearching && searchResults.length === 0 && searchQuery.length > 2 && (
                                        <div className="text-xs text-center opacity-50 py-4">No results found</div>
                                    )}

                                    <div className="space-y-3">
                                        {searchResults.map((result, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    onSearchResultClick(result.cfi);
                                                    onClose();
                                                }}
                                                className={`w-full text-left p-3 rounded-lg transition-colors ${bookmarkItemClass}`}
                                            >
                                                <div
                                                    className="text-sm font-serif leading-relaxed opacity-90 line-clamp-3"
                                                    dangerouslySetInnerHTML={{ __html: `"...${result.excerpt}..."` }}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
