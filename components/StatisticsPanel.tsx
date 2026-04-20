import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Settings2, Library, Clock, CheckCircle, BookOpen, Flame, Award, Highlighter } from 'lucide-react';
import { Book as BookType, ReadingGoal, Highlight } from '../types';
import { getAllHighlights } from '../utils/db';
import { useAuthStore } from '../stores/useAuthStore';

interface StatisticsPanelProps {
    books: BookType[];
    readingGoal?: ReadingGoal;
    onEditGoal?: () => void;
    onOpenBook?: (bookId: string, location?: string) => void;
}

export const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ books, readingGoal, onEditGoal, onOpenBook }) => {

    const [highlights, setHighlights] = React.useState<Highlight[]>([]);
    const [page, setPage] = React.useState(0);
    const { isAuthenticated } = useAuthStore();

    React.useEffect(() => {
        const fetchHighlights = async () => {
            let h: Highlight[] = [];
            if (isAuthenticated) {
                try {
                    const { getAllHighlightsFromSupabase } = await import('../lib/supabaseDb');
                    h = await getAllHighlightsFromSupabase();
                } catch (err) {
                    console.error('Failed to load highlights from cloud', err);
                    h = await getAllHighlights();
                }
            } else {
                h = await getAllHighlights();
            }

            // Sort by date (newest first)
            const sorted = h.sort((a, b) => b.createdAt - a.createdAt);
            setHighlights(sorted);
        };

        fetchHighlights();
    }, [isAuthenticated]);

    // --- Data Calculation ---
    const stats = useMemo(() => {
        const totalBooks = books.length;
        const totalTimeRead = books.reduce((sum, book) => sum + (book.timeRead || 0), 0);
        const booksInProgress = books.filter(b => (b.progressPercent || 0) > 0 && (b.progressPercent || 0) < 1).length;
        const booksCompleted = books.filter(b => (b.progressPercent || 0) >= 0.99).length;
        const averageProgress = books.length > 0
            ? books.reduce((sum, b) => sum + (b.progressPercent || 0), 0) / books.length
            : 0;

        const readDates = books
            .filter(b => b.lastReadDate)
            .map(b => new Date(b.lastReadDate!).toDateString());
        const uniqueReadDays = new Set(readDates).size;

        const bookToContinue = books.length > 0
            ? books.reduce((latest, book) =>
                (book.lastReadDate || 0) > (latest.lastReadDate || 0) ? book : latest
                , books[0])
            : null;

        const mostReadBook = books.reduce((max, book) =>
            (book.timeRead || 0) > (max.timeRead || 0) ? book : max
            , books[0]); // For "Most Read" stats if needed elsewhere

        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const recentlyRead = books.filter(b => b.lastReadDate && b.lastReadDate > sevenDaysAgo).length;

        return {
            totalBooks,
            totalTimeRead,
            booksInProgress,
            booksCompleted,
            averageProgress,
            uniqueReadDays,
            bookToContinue, // Use this for "Keep Reading"
            mostReadBook: books.length > 0 ? mostReadBook : null,
            recentlyRead
        };
    }, [books]);

    const formatTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    // --- Goal Calculations ---
    const goalPercent = readingGoal
        ? Math.min(100, (readingGoal.dailyProgressSeconds / (readingGoal.dailyTargetMinutes * 60)) * 100)
        : 0;

    const currentSeconds = readingGoal ? readingGoal.dailyProgressSeconds : 0;
    const hours = Math.floor(currentSeconds / 3600);
    const minutes = Math.floor((currentSeconds % 3600) / 60);
    const seconds = Math.floor(currentSeconds % 60);
    // Format H:MM or M:SS if under an hour? Reference shows 0:02. Let's do H:MM or M:SS. 
    // Reference looks like H:MM but could be M:SS. Usually reading apps track Minutes.
    // Let's assume H:MM for now, so 0:02 means 0 hours 2 minutes? Or 0 minutes 2 seconds?
    // Given "5-minute goal", 0:02 likely means 0 hours 2 minutes.
    const timeDisplay = `${hours}:${minutes.toString().padStart(2, '0')}`;

    // --- Render ---
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute inset-0 z-10 bg-[#FAFAFA] overflow-y-auto pt-24 pb-32 md:pb-12 px-4 sm:px-6"
        >
            <div className="max-w-[1200px] mx-auto space-y-8">
                {/* 1. Header & Context */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-2">
                    <div>
                        <h1 className="font-serif text-4xl md:text-5xl text-black font-medium tracking-tight leading-tight">
                            Reading Now
                        </h1>
                        <p className="text-black/60 text-base mt-2 font-sans">
                            Welcome back. You're on a <span className="font-semibold text-[#E86C46]">{readingGoal?.currentStreak || 0} day</span> streak.
                        </p>
                    </div>
                </div>

                {/* 2. Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

                    {/* LEFT COLUMN: Main Focus (Span 8) */}
                    <div className="lg:col-span-8 flex flex-col gap-6 lg:gap-8">

                        {/* Hero: Continue Reading */}
                        {stats.bookToContinue ? (
                            <motion.div
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={() => onOpenBook?.(stats.bookToContinue!.id)}
                                className="relative rounded-[2rem] overflow-hidden cursor-pointer shadow-sm group bg-[#3E2723]"
                            >
                                {/* Blurred Background Cover */}
                                <div className="absolute inset-0 overflow-hidden bg-[#2D1B16]">
                                    {stats.bookToContinue.coverImage && (
                                        <img src={stats.bookToContinue.coverImage} className="w-full h-full object-cover blur-3xl opacity-30 scale-125 group-hover:scale-110 transition-transform duration-[1.5s] ease-out" alt="" />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#1F120F]/90 via-[#3E2723]/40 to-[#3E2723]/10" />
                                </div>

                                <div className="relative z-10 p-8 sm:p-12 flex flex-col sm:flex-row gap-8 items-center sm:items-end min-h-[340px]">
                                    {/* Cover */}
                                    <div className="w-40 sm:w-48 aspect-[2/3] rounded-xl shadow-2xl flex-shrink-0 bg-white/10 overflow-hidden ring-1 ring-white/20 sm:transform sm:translate-y-4">
                                        {stats.bookToContinue.coverImage ? (
                                            <img src={stats.bookToContinue.coverImage} className="w-full h-full object-cover" alt={stats.bookToContinue.title} />
                                        ) : (
                                            <div style={{ backgroundColor: stats.bookToContinue.color }} className="w-full h-full" />
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 flex flex-col justify-end w-full text-center sm:text-left mt-4 sm:mt-0">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-white/90 text-[10px] font-bold uppercase tracking-widest mb-4 self-center sm:self-start ring-1 ring-white/20">
                                            Current Read
                                        </div>
                                        <h3 className="font-serif text-3xl sm:text-4xl text-white mb-2 leading-tight line-clamp-2">
                                            {stats.bookToContinue.title}
                                        </h3>
                                        <p className="text-white/60 text-lg sm:text-xl font-serif italic mb-8">
                                            by {stats.bookToContinue.author}
                                        </p>

                                        {/* Progress Bar */}
                                        <div className="w-full space-y-2 mt-auto">
                                            <div className="flex justify-between text-xs font-bold text-white/80 uppercase tracking-widest">
                                                <span>{Math.round((stats.bookToContinue.progressPercent || 0) * 100)}% Completed</span>
                                                <span className="opacity-60">{formatTime(stats.bookToContinue.timeRead || 0)}</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(stats.bookToContinue.progressPercent || 0) * 100}%` }}
                                                    transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                                                    className="h-full bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="bg-white rounded-[2rem] p-12 border border-[#3E2723]/5 shadow-sm text-center flex flex-col items-center justify-center min-h-[340px]">
                                <Library size={48} strokeWidth={1} className="text-black/20 mb-4" />
                                <h3 className="font-serif text-2xl text-black mb-2">No books yet</h3>
                                <p className="text-black/50 text-sm">Add a book to your library to start building your reading habits.</p>
                            </div>
                        )}

                        {/* Highlights Grid */}
                        <div className="bg-white rounded-[2rem] p-8 border border-[#3E2723]/5 shadow-sm flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                                <h3 className="font-serif text-2xl text-black flex items-center gap-2">
                                    <Highlighter size={20} className="text-black/30" />
                                    Recent Highlights
                                </h3>
                                {highlights.length > 2 && (
                                    <div className="flex gap-2 self-end sm:self-auto">
                                        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="w-9 h-9 rounded-full border border-black/10 flex items-center justify-center text-black/50 hover:bg-[#F9F7F5] disabled:opacity-30 transition-colors">
                                            <span className="text-lg leading-none mb-1">‹</span>
                                        </button>
                                        <button onClick={() => setPage(p => (p + 1) * 2 < highlights.length ? p + 1 : p)} disabled={(page + 1) * 2 >= highlights.length} className="w-9 h-9 rounded-full border border-black/10 flex items-center justify-center text-black/50 hover:bg-[#F9F7F5] disabled:opacity-30 transition-colors">
                                            <span className="text-lg leading-none mb-1">›</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {highlights.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {highlights.slice(page * 2, (page + 1) * 2).map((h) => {
                                        const book = books.find(b => b.id === h.bookId);
                                        const hlColor = h.color === 'yellow' ? '#FCD34D' : h.color === 'green' ? '#86EFAC' : h.color === 'blue' ? '#93C5FD' : '#F9A8D4';

                                        return (
                                            <div
                                                key={h.id}
                                                onClick={() => onOpenBook?.(h.bookId, h.cfiRange)}
                                                className="group cursor-pointer flex flex-col gap-4 p-6 rounded-2xl bg-[#FAFAFA] hover:bg-white inset-ring-1 border border-[#3E2723]/5 hover:shadow-md hover:-translate-y-0.5 transition-all"
                                            >
                                                <div className="flex items-start gap-4">
                                                    <div className="w-1.5 h-1.5 rounded-full mt-2.5 flex-shrink-0" style={{ backgroundColor: hlColor, boxShadow: `0 0 8px ${hlColor}` }} />
                                                    <p className="font-serif text-lg text-black italic leading-relaxed line-clamp-4">
                                                        "{h.text}"
                                                    </p>
                                                </div>
                                                <div className="mt-auto pt-4 flex items-center gap-3">
                                                    {book?.coverImage ? (
                                                        <img src={book.coverImage} className="w-6 h-9 object-cover rounded shadow-sm" alt="" />
                                                    ) : (
                                                        <div className="w-6 h-9 rounded shadow-sm bg-[#3E2723]/10" />
                                                    )}
                                                    <span className="text-[10px] uppercase tracking-widest text-black/50 font-bold truncate">
                                                        {book?.title || "Unknown Book"}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center text-black/30 text-sm py-12 flex flex-col items-center justify-center">
                                    <div className="w-12 h-12 rounded-full bg-[#f0f0f0] flex items-center justify-center mb-4">
                                        <Highlighter size={20} className="opacity-50" />
                                    </div>
                                    No highlights found.<br />Your favorite quotes will appear here.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Stats & Goals (Span 4) */}
                    <div className="lg:col-span-4 flex flex-col gap-6 lg:gap-8">

                        {/* Daily Goal Ring */}
                        {readingGoal && (
                            <div className="bg-white rounded-[2rem] p-8 border border-black/5 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-6 right-6 cursor-pointer p-2 bg-[#F9F7F5] rounded-full text-black/40 hover:text-black hover:bg-[#F0EEEC] transition-colors" onClick={onEditGoal}>
                                    <Settings2 size={16} />
                                </div>
                                <h3 className="font-serif text-2xl text-black mb-8 text-center">Daily Goal</h3>

                                <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
                                    {/* SVG Ring */}
                                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 drop-shadow-sm">
                                        <circle cx="50" cy="50" r="42" fill="none" stroke="#F5F5F5" strokeWidth="8" />
                                        <motion.circle
                                            cx="50" cy="50" r="42"
                                            fill="none"
                                            stroke="#6B8E6D"
                                            strokeWidth={8}
                                            strokeLinecap="round"
                                            strokeDasharray={`${2 * Math.PI * 42}`}
                                            strokeDashoffset={`${2 * Math.PI * 42 * (1 - Math.min(goalPercent, 100) / 100)}`}
                                            transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="font-serif text-3xl sm:text-4xl text-black">{timeDisplay}</span>
                                        <span className="text-[10px] uppercase tracking-widest text-black/40 font-bold mt-1">/ {readingGoal.dailyTargetMinutes} MIN</span>
                                    </div>
                                </div>

                                <div className="mt-10 flex justify-center gap-2">
                                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => {
                                        const isToday = idx === new Date().getDay();
                                        const isPast = idx < new Date().getDay();
                                        return (
                                            <div key={idx} className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${isToday ? 'bg-black text-white shadow-md transform -translate-y-1' : isPast ? 'bg-[#F5F5F5] text-black/60' : 'text-black/30 bg-transparent'}`}>
                                                {day}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Quick Stats Compact */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white rounded-[2rem] p-6 border border-black/5 shadow-sm text-center flex flex-col items-center hover:bg-[#FAFAFA] transition-colors">
                                <div className="w-12 h-12 rounded-full bg-[#F5F5F5] flex items-center justify-center mb-4">
                                    <BookOpen size={18} className="text-black/20" />
                                </div>
                                <div className="font-serif text-3xl text-black mb-1">{stats.booksInProgress}</div>
                                <div className="text-[10px] uppercase tracking-widest text-black/40 font-bold">Reading</div>
                            </div>
                            <div className="bg-white rounded-[2rem] p-6 border border-black/5 shadow-sm text-center flex flex-col items-center hover:bg-[#FAFAFA] transition-colors">
                                <div className="w-12 h-12 rounded-full bg-[#F5F5F5] flex items-center justify-center mb-4">
                                    <CheckCircle size={18} className="text-black/80" />
                                </div>
                                <div className="font-serif text-3xl text-black mb-1">{stats.booksCompleted}</div>
                                <div className="text-[10px] uppercase tracking-widest text-black/40 font-bold">Finished</div>
                            </div>
                        </div>

                        {/* Top Reads List */}
                        <div className="bg-white rounded-[2rem] p-6 md:p-8 border border-black/5 shadow-sm flex-1">
                            <h3 className="font-serif text-xl text-black mb-6">Top Books</h3>
                            <div className="space-y-5">
                                {books
                                    .filter(b => b.timeRead && b.timeRead > 0)
                                    .sort((a, b) => (b.timeRead || 0) - (a.timeRead || 0))
                                    .slice(0, 4)
                                    .map((book, idx) => (
                                        <div key={book.id} onClick={() => onOpenBook?.(book.id)} className="flex items-center gap-4 cursor-pointer group">
                                            <div className="w-12 h-16 rounded overflow-hidden shadow-sm flex-shrink-0 bg-[#F5F5F5]">
                                                {book.coverImage ? <img src={book.coverImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : null}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-semibold text-black truncate group-hover:text-emerald-500 transition-colors mb-0.5">{book.title}</div>
                                                <div className="text-xs text-black/50 mt-1 flex items-center gap-1.5">
                                                    <Clock size={12} className="opacity-70" />
                                                    {formatTime(book.timeRead || 0)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </motion.div>
    );
};
