import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, TrendingUp, Compass, Star, Loader2, Award, BookOpen, X, ChevronLeft, Plus, Check } from 'lucide-react';
import { fetchPublicBooks, fetchAvailableGenres, PublicBook, fetchPublicSeries, PublicSeries, addPublicBookToLibrary } from '../lib/publicBooksApi';
import { useAuthStore } from '../stores/useAuthStore';
import { useToast } from './Toast';
import { Book } from '../types';

interface ExplorePageProps {
    onOpenBook?: (book: PublicBook) => void;
    onBooksAdded?: (books: Book[]) => void;
    userBooks?: Book[];
}

// ------------------------------------------------------------------
// FEATURED BOOKS SLIDER COMPONENT
// ------------------------------------------------------------------
const FeaturedBooksSlider = ({ books, onOpenBook }: { books: PublicBook[], onOpenBook?: (book: PublicBook) => void }) => {
    const [activeIndex, setActiveIndex] = useState(0);

    // Auto-slide every 5 seconds
    useEffect(() => {
        if (!books || books.length <= 1) return;
        const interval = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % books.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [books]);

    if (!books || books.length === 0) return null;

    const book = books[activeIndex];

    return (
        <div className="relative w-full h-[240px] md:h-[400px] rounded-2xl md:rounded-[2rem] overflow-hidden shadow-2xl bg-[#3D3028]">
            {/* Background Image with heavy blur */}
            <div className="absolute inset-0">
                {book.cover_url ? (
                    <motion.img
                        key={`bg-${book.id}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.3 }}
                        transition={{ duration: 1 }}
                        src={book.cover_url}
                        className="w-full h-full object-cover blur-[40px] scale-125"
                    />
                ) : (
                    <div className="w-full h-full bg-[#3D3028]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1410] via-[#1A1410]/40 to-transparent" />
            </div>

            <div className="relative z-10 w-full h-full flex flex-row items-center p-4 md:p-12 gap-4 md:gap-12">
                {/* Book Cover */}
                <motion.div
                    key={`cover-${book.id}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-[100px] md:w-[200px] shrink-0 aspect-[2/3] rounded-md shadow-[0_12px_32px_rgba(0,0,0,0.6)] overflow-hidden cursor-pointer"
                    onClick={() => onOpenBook?.(book)}
                >
                    {book.cover_url ? (
                        <img src={book.cover_url} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-[#EAE5DD] flex items-center justify-center p-2 text-[#3D3028]/40 font-serif text-[10px] text-center">
                            No Cover
                        </div>
                    )}
                </motion.div>

                {/* Info */}
                <motion.div
                    key={`info-${book.id}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="flex-1 text-white text-left flex flex-col justify-center min-w-0"
                >
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 md:px-3 md:py-1 bg-white/10 backdrop-blur-md rounded-full text-white/80 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mb-2 md:mb-4 w-fit">
                        <Award size={10} className="text-[#E86C46] shrink-0" />
                        Featured
                    </div>
                    <h2 className="font-serif text-lg md:text-4xl lg:text-5xl leading-tight mb-1.5 md:mb-2 line-clamp-2 cursor-pointer hover:text-white/90 transition-colors" onClick={() => onOpenBook?.(book)}>
                        {book.title}
                    </h2>
                    <p className="text-[9px] md:text-sm text-white/60 mb-2 md:mb-6 uppercase tracking-widest font-bold flex items-center gap-1.5 md:gap-2 flex-wrap">
                        <span className="line-clamp-1">{book.author}</span>
                        {book.genre && book.genre.length > 0 && (
                            <>
                                <span className="w-1 h-1 rounded-full bg-white/40 shrink-0"></span>
                                <span className="text-[#E86C46] line-clamp-1">
                                    {Array.isArray(book.genre) ? book.genre.slice(0, 2).join(', ') : book.genre}
                                </span>
                            </>
                        )}
                    </p>
                    {book.description && (
                        <p className="hidden md:block text-sm text-white/70 line-clamp-3 mb-8 max-w-xl">
                            {book.description}
                        </p>
                    )}

                    <button
                        onClick={() => onOpenBook?.(book)}
                        className="bg-[#E86C46] text-white px-5 md:px-8 py-2 md:py-3 rounded-xl font-medium text-xs md:text-sm hover:bg-[#D65A34] transition-colors shadow-lg w-fit"
                    >
                        Read Now
                    </button>
                </motion.div>
            </div>

            {/* Controls */}
            {books.length > 1 && (
                <div className="absolute bottom-3 md:bottom-6 left-0 right-0 flex justify-center gap-1.5 md:gap-2 z-20">
                    {books.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActiveIndex(idx)}
                            className={`h-1 md:h-1.5 rounded-full transition-all ${idx === activeIndex ? 'w-5 md:w-6 bg-[#E86C46]' : 'w-1.5 md:w-2 bg-white/30 hover:bg-white/50'}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// ------------------------------------------------------------------
// HORIZONTAL CAROUSEL COMPONENT
// ------------------------------------------------------------------
const HorizontalBookCarousel = ({ title, icon: Icon, books, onOpenBook }: { title: string, icon?: any, books: PublicBook[], onOpenBook?: (book: PublicBook) => void }) => {
    if (!books || books.length === 0) return null;
    return (
        <div className="space-y-4 pb-4">
            <h2 className="font-serif text-2xl md:text-3xl text-[#3D3028] flex items-center gap-3">
                {Icon && <Icon size={24} className="text-[#E86C46]" />}
                {title}
            </h2>
            <div className="flex overflow-x-auto gap-6 pb-6 pt-2 scrollbar-hide snap-x -mx-4 px-4 md:mx-0 md:px-0">
                {books.map(book => (
                    <motion.div
                        key={book.id}
                        whileHover={{ y: -5 }}
                        className="group cursor-pointer w-[140px] md:w-[160px] shrink-0 snap-start flex flex-col items-center text-center"
                        onClick={() => onOpenBook?.(book)}
                    >
                        <div className="relative w-full aspect-[2/3] rounded-[2px] shadow-[0_4px_12px_rgba(0,0,0,0.08)] bg-white overflow-hidden transition-shadow group-hover:shadow-[0_12px_24px_rgba(0,0,0,0.12)] mb-4">
                            <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-black/10 z-20" />
                            <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E')] mix-blend-overlay z-10 pointer-events-none" />

                            {book.cover_url ? (
                                <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                                <div className="w-full h-full bg-[#EAE5DD] flex items-center justify-center p-2 text-[#3D3028]/40 font-serif text-xs">
                                    No Cover
                                </div>
                            )}

                            <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/20" />
                            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-10 transition-opacity" />

                            {book.rating_average !== undefined && book.rating_average > 0 && (
                                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 shadow-sm z-20">
                                    <Star size={10} className="fill-[#E86C46] text-[#E86C46]" />
                                    {book.rating_average.toFixed(1)}
                                </div>
                            )}
                        </div>
                        <h3 className="font-serif text-[15px] leading-tight text-[#3D3028] mb-1 group-hover:underline decoration-[#3D3028]/30 underline-offset-4 decoration-1 line-clamp-2 w-full px-1">
                            {book.title}
                        </h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#3D3028]/40 line-clamp-1 w-full px-1">
                            {book.author}
                        </p>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

// ------------------------------------------------------------------
// TOP BOOKS CAROUSEL COMPONENT (Ranks 1-9)
// ------------------------------------------------------------------
const TopBooksCarousel = ({ books, onOpenBook }: { books: PublicBook[], onOpenBook?: (book: PublicBook) => void }) => {
    if (!books || books.length === 0) return null;
    return (
        <div className="space-y-4 pb-4">
            <h2 className="font-serif text-2xl md:text-3xl text-[#3D3028] flex items-center gap-3">
                <TrendingUp size={24} className="text-[#E86C46]" />
                Top Books
            </h2>
            <div className="flex overflow-x-auto gap-8 pb-8 pt-4 scrollbar-hide snap-x -mx-4 px-4 md:mx-0 md:px-0">
                {books.slice(0, 9).map((book, idx) => (
                    <motion.div
                        key={book.id}
                        whileHover={{ y: -5 }}
                        className="group cursor-pointer w-[240px] md:w-[280px] shrink-0 snap-start flex items-center gap-4 relative"
                        onClick={() => onOpenBook?.(book)}
                    >
                        {/* Huge Number Background */}
                        <div className="absolute -left-4 -bottom-6 text-[100px] md:text-[120px] font-serif font-bold text-[#3D3028]/5 z-0 select-none pointer-events-none leading-none group-hover:text-[#E86C46]/5 transition-colors">
                            {idx + 1}
                        </div>

                        <div className="relative w-[80px] md:w-[100px] shrink-0 aspect-[2/3] rounded-[2px] shadow-[0_4px_12px_rgba(0,0,0,0.08)] bg-white overflow-hidden z-10 group-hover:shadow-[0_8px_20px_rgba(0,0,0,0.12)] transition-shadow">
                            <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-black/10 z-20" />
                            {book.cover_url ? (
                                <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                                <div className="w-full h-full bg-[#EAE5DD] flex items-center justify-center p-2 text-[#3D3028]/40 font-serif text-[10px] text-center">
                                    No Cover
                                </div>
                            )}
                        </div>

                        <div className="flex-1 z-10">
                            <h3 className="font-serif text-[15px] md:text-[16px] leading-tight text-[#3D3028] mb-1 group-hover:underline decoration-[#3D3028]/30 underline-offset-4 decoration-1 line-clamp-2">
                                {book.title}
                            </h3>
                            <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-[#3D3028]/40 line-clamp-1">
                                {book.author}
                            </p>
                            {book.rating_average !== undefined && book.rating_average > 0 && (
                                <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-[#3D3028]/60">
                                    <Star size={12} className="fill-[#E86C46] text-[#E86C46]" />
                                    {book.rating_average.toFixed(1)}
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

// ------------------------------------------------------------------
// HORIZONTAL SERIES CAROUSEL COMPONENT
// ------------------------------------------------------------------
const HorizontalSeriesCarousel = ({ title, icon: Icon, seriesList, onOpenSeries }: { title: string, icon?: any, seriesList: PublicSeries[], onOpenSeries?: (series: PublicSeries) => void }) => {
    if (!seriesList || seriesList.length === 0) return null;
    return (
        <div className="space-y-4 pb-4">
            <h2 className="font-serif text-2xl md:text-3xl text-[#3D3028] flex items-center gap-3">
                {Icon && <Icon size={24} className="text-[#E86C46]" />}
                {title}
            </h2>
            <div className="flex overflow-x-auto gap-6 pb-6 pt-2 scrollbar-hide snap-x -mx-4 px-4 md:mx-0 md:px-0">
                {seriesList.map(series => (
                    <motion.div
                        key={series.id}
                        whileHover={{ y: -5 }}
                        className="group cursor-pointer w-[180px] md:w-[220px] shrink-0 snap-start flex flex-col"
                        onClick={() => onOpenSeries?.(series)}
                    >
                        <div className="relative w-full aspect-[16/10] rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.08)] bg-white overflow-hidden transition-shadow group-hover:shadow-[0_12px_24px_rgba(0,0,0,0.12)] mb-4">
                            <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E')] mix-blend-overlay z-10 pointer-events-none" />

                            {series.cover_url ? (
                                <img src={series.cover_url} alt={series.title} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-[#EAE5DD] to-[#D5CEC4] flex items-center justify-center p-4 text-[#3D3028]/40 font-serif text-xs text-center">
                                    {series.title}
                                </div>
                            )}

                            {/* Overlay tag */}
                            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md z-20">
                                Series
                            </div>
                        </div>

                        <h3 className="font-serif text-[15px] md:text-[16px] leading-tight text-[#3D3028] mb-1 group-hover:underline decoration-[#3D3028]/30 underline-offset-4 decoration-1 line-clamp-2">
                            {series.title}
                        </h3>
                        {series.author && (
                            <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-[#3D3028]/40 line-clamp-1">
                                {series.author}
                            </p>
                        )}
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export const ExplorePage: React.FC<ExplorePageProps> = ({ onOpenBook, onBooksAdded, userBooks }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');

    // Data States
    const [books, setBooks] = useState<PublicBook[]>([]);

    // Home View States
    const [featuredBooks, setFeaturedBooks] = useState<PublicBook[]>([]);
    const [topBooks, setTopBooks] = useState<PublicBook[]>([]);
    const [fictionBooks, setFictionBooks] = useState<PublicBook[]>([]);
    const [nonFictionBooks, setNonFictionBooks] = useState<PublicBook[]>([]);
    const [seriesList, setSeriesList] = useState<PublicSeries[]>([]);

    // Series Detail Modal
    const [selectedSeries, setSelectedSeries] = useState<PublicSeries | null>(null);
    const [seriesBooks, setSeriesBooks] = useState<PublicBook[]>([]);
    const [isLoadingSeriesBooks, setIsLoadingSeriesBooks] = useState(false);

    const [categories, setCategories] = useState<string[]>([]); // Only genres now

    // UI States
    const [isLoading, setIsLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);

    // Initial Fetch
    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            try {
                // Fetch only genres for the pill buttons
                const { data: genresData } = await fetchAvailableGenres();
                setCategories(['All', ...(genresData || [])]);

                // 1. Fetch Featured Books
                const { data: featuredData } = await fetchPublicBooks({ featured: true, limit: 10 });
                if (featuredData) setFeaturedBooks(featuredData);

                // 2. Fetch Top Books (Trending / High Rating)
                const { data: topData } = await fetchPublicBooks({ sortBy: 'trending', limit: 9, hideSeriesContinuations: true });
                if (topData) setTopBooks(topData);

                // 3. Fetch Series
                const { data: seriesData } = await fetchPublicSeries();
                if (seriesData) setSeriesList(seriesData);

                // 4. Fetch Fiction & Literature
                const { data: allBooksData } = await fetchPublicBooks({ limit: 100, hideSeriesContinuations: true });
                if (allBooksData) {
                    setFictionBooks(allBooksData.filter(b => b.category_type === 'Fiction' || !b.category_type));
                    setNonFictionBooks(allBooksData.filter(b => b.category_type === 'Non-Fiction'));
                }

            } catch (error) {
                console.error("Failed to load explore data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadInitialData();
    }, []);

    // Fetch on Category or Search Change
    useEffect(() => {
        if (activeCategory === 'All' && !searchQuery) {
            setBooks([]); // Reset search books when returning to home view
            return;
        }

        const fetchData = async () => {
            setIsSearching(true);
            try {
                const { data } = await fetchPublicBooks({
                    genre: activeCategory === 'All' ? undefined : activeCategory,
                    search: searchQuery,
                    limit: 24
                });
                if (data) setBooks(data);
            } catch (error) {
                console.error("Failed to fetch books:", error);
            } finally {
                setIsSearching(false);
            }
        };

        // Debounce search
        const timeoutId = setTimeout(() => {
            fetchData();
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [activeCategory, searchQuery]);

    const isHomeView = activeCategory === 'All' && !searchQuery;

    return (
        <div className="min-h-screen bg-white text-[#3D3028] font-sans pb-24 md:pb-12 pt-16 md:pt-24 px-4 md:px-12 overflow-x-hidden">

            <div className="max-w-6xl mx-auto space-y-6 md:space-y-10">

                {/* 1. Hero / Header */}
                <div className="text-center space-y-3 md:space-y-4 py-2 md:py-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="hidden md:inline-flex items-center gap-2 px-3 py-1 bg-[#3D3028]/5 rounded-full text-[#3D3028]/60 text-xs font-bold uppercase tracking-widest mb-1"
                    >
                        <Compass size={12} />
                        Explore Library
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.6 }}
                        className="hidden md:block font-serif text-6xl text-[#3D3028] leading-tight"
                    >
                        Find your next <br />
                        great adventure.
                    </motion.h1>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="max-w-xl mx-auto relative group pt-0 md:pt-2"
                    >
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <Search size={18} className="text-[#3D3028]/40" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by title, author, or genre..."
                            className="w-full bg-white border border-[#3D3028]/10 rounded-2xl py-3 md:py-4 pl-12 pr-4 text-sm md:text-lg text-[#3D3028] placeholder-[#3D3028]/30 focus:outline-none focus:border-[#3D3028]/30 focus:shadow-lg transition-all shadow-sm"
                        />
                    </motion.div>
                </div>

                {/* 2. Featured Collections Slider (Hidden during text search) */}
                {!searchQuery && !isLoading && featuredBooks.length > 0 && (
                    <div className="pt-2">
                        <FeaturedBooksSlider
                            books={featuredBooks}
                            onOpenBook={onOpenBook}
                        />
                    </div>
                )}

                {/* 3. Categories (Genres Only) */}
                {categories.length > 0 && (
                    <div className="overflow-x-auto pb-3 md:pb-4 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
                        <div className="flex gap-2 md:gap-3 w-max mx-auto">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`px-3.5 md:px-5 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all ${activeCategory === cat
                                        ? 'bg-[#3D3028] text-white shadow-md'
                                        : 'bg-white text-[#3D3028]/60 hover:bg-[#3D3028]/5 border border-[#3D3028]/5'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* 4. Main Content Area */}
                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 size={40} className="animate-spin text-[#3D3028]/20" />
                    </div>
                ) : isHomeView ? (
                    /* --- HOME VIEW: TOP BOOKS & MACRO CATEGORIES --- */
                    <AnimatePresence mode="wait">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-12 pt-4"
                        >
                            {/* Top Books 1-9 */}
                            {topBooks.length > 0 && (
                                <TopBooksCarousel
                                    books={topBooks}
                                    onOpenBook={onOpenBook}
                                />
                            )}

                            {/* Epic Series & Collections */}
                            {seriesList.length > 0 && (
                                <HorizontalSeriesCarousel
                                    title="Epic Series & Collections"
                                    icon={Award}
                                    seriesList={seriesList}
                                    onOpenSeries={async (series) => {
                                        setSelectedSeries(series);
                                        setIsLoadingSeriesBooks(true);
                                        try {
                                            const { data } = await fetchPublicBooks({ series_id: series.id, limit: 50 });
                                            if (data) {
                                                setSeriesBooks(data.sort((a, b) => (a.volume_number || 0) - (b.volume_number || 0)));
                                            }
                                        } catch (e) { console.error(e); }
                                        setIsLoadingSeriesBooks(false);
                                    }}
                                />
                            )}

                            {/* Fiction & Literature */}
                            {fictionBooks.length > 0 && (
                                <HorizontalBookCarousel
                                    title="Fiction & Literature"
                                    icon={BookOpen}
                                    books={fictionBooks}
                                    onOpenBook={onOpenBook}
                                />
                            )}

                            {/* Non-Fiction & Knowledge */}
                            {nonFictionBooks.length > 0 && (
                                <HorizontalBookCarousel
                                    title="Non-Fiction & Knowledge"
                                    icon={BookOpen}
                                    books={nonFictionBooks}
                                    onOpenBook={onOpenBook}
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>
                ) : (
                    /* --- SEARCH/CATEGORY VIEW: GRID --- */
                    <AnimatePresence mode="wait">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-6"
                        >
                            <div className="flex items-end justify-between border-b border-[#3D3028]/5 pb-4">
                                <div>
                                    <h2 className="font-serif text-2xl md:text-3xl text-[#3D3028] flex items-center gap-2">
                                        <Search size={24} className="text-[#E86C46]" />
                                        {searchQuery ? `Results for "${searchQuery}"` : activeCategory}
                                    </h2>
                                    <p className="text-[#3D3028]/50 text-sm mt-1">
                                        {isSearching ? 'Searching...' : `Showing ${books.length} books`}
                                    </p>
                                </div>
                            </div>

                            {books.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
                                    {books.map((book) => (
                                        <motion.div
                                            key={book.id}
                                            whileHover={{ y: -5 }}
                                            className="group cursor-pointer w-full flex justify-center flex-col items-center text-center"
                                            onClick={() => onOpenBook?.(book)}
                                        >
                                            <div className="relative w-full max-w-[150px] aspect-[2/3] rounded-[2px] shadow-[0_4px_12px_rgba(0,0,0,0.08)] bg-white overflow-hidden transition-shadow group-hover:shadow-[0_12px_24px_rgba(0,0,0,0.12)] mb-4">
                                                <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-black/10 z-20" />
                                                <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E')] mix-blend-overlay z-10 pointer-events-none" />

                                                {book.cover_url ? (
                                                    <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" loading="lazy" />
                                                ) : (
                                                    <div className="w-full h-full bg-[#EAE5DD] flex items-center justify-center p-2 text-[#3D3028]/40 font-serif text-xs">
                                                        No Cover
                                                    </div>
                                                )}

                                                <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/20" />
                                                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-10 transition-opacity" />

                                                {book.rating_average !== undefined && book.rating_average > 0 && (
                                                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 shadow-sm z-20">
                                                        <Star size={10} className="fill-[#E86C46] text-[#E86C46]" />
                                                        {book.rating_average.toFixed(1)}
                                                    </div>
                                                )}
                                            </div>

                                            <h3 className="font-serif text-[15px] leading-tight text-[#3D3028] mb-1 group-hover:underline decoration-[#3D3028]/30 underline-offset-4 decoration-1 line-clamp-2 w-full px-1">
                                                {book.title}
                                            </h3>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#3D3028]/40 line-clamp-1 w-full px-1">
                                                {book.author}
                                            </p>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 text-[#3D3028]/40">
                                    <p className="font-serif text-lg">No books found.</p>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                )}

                {/* 5. Minimal Footer Quote */}
                <div className="text-center pt-16 pb-8 border-t border-[#3D3028]/5">
                    <p className="font-serif text-xl md:text-2xl text-[#3D3028]/40 italic">
                        "There is no friend as loyal as a book."
                    </p>
                    <p className="text-xs font-bold uppercase tracking-widest text-[#3D3028]/20 mt-3">— Ernest Hemingway</p>
                </div>

            </div>

            {/* Series Detail Modal */}
            <AnimatePresence>
                {selectedSeries && (
                    <SeriesDetailModal
                        series={selectedSeries}
                        books={seriesBooks}
                        userBooks={userBooks}
                        isLoading={isLoadingSeriesBooks}
                        onClose={() => { setSelectedSeries(null); setSeriesBooks([]); }}
                        onOpenBook={(book) => {
                            setSelectedSeries(null);
                            setSeriesBooks([]);
                            onOpenBook?.(book);
                        }}
                        onBooksAdded={onBooksAdded}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// ------------------------------------------------------------------
// SERIES DETAIL MODAL
// ------------------------------------------------------------------
const SeriesDetailModal = ({ series, books, userBooks, isLoading, onClose, onOpenBook, onBooksAdded }: {
    series: PublicSeries;
    books: PublicBook[];
    userBooks?: Book[];
    isLoading: boolean;
    onClose: () => void;
    onOpenBook: (book: PublicBook) => void;
    onBooksAdded?: (books: Book[]) => void;
}) => {
    const { user } = useAuthStore();
    const { showToast } = useToast();
    const [isAdding, setIsAdding] = useState(false);
    const [progress, setProgress] = useState(0);
    const [addingStatus, setAddingStatus] = useState<string>('');

    const handleAddSeriesToLibrary = async () => {

        if (!user) {
            showToast('Please login to add books', 'error');
            return;
        }

        if (!books || books.length === 0) {
            showToast('No books in this series to add', 'info');
            return;
        }

        setIsAdding(true);
        setProgress(0);
        setAddingStatus(`Adding ${books.length} volumes...`);

        try {
            const { saveCollection, saveBook, getAllBooks } = await import('../utils/db');
            const { generateUUID } = await import('../utils/uuid');
            const { supabase } = await import('../lib/supabase');

            const collectionId = generateUUID();
            const newCollection = {
                id: collectionId,
                name: series.title,
                description: series.author ? `${series.title} by ${series.author}` : `${series.title} collection`,
                color: '#3E2723',
                createdAt: Date.now()
            };

            let successCount = 0;
            const booksToUpdate: Book[] = [];

            for (let i = 0; i < books.length; i++) {
                const book = books[i];
                setProgress(Math.round(((i) / (books.length + 1)) * 100));
                setAddingStatus(`Processing volume ${i + 1}/${books.length}...`);

                try {
                    const { error, data } = await addPublicBookToLibrary(book.id, user.id);

                    if (!error && data) {
                        // New book added successfully
                        const appBook = data as Book;
                        booksToUpdate.push({ ...appBook, collectionIds: [...(appBook.collectionIds || []), collectionId] });
                        successCount++;
                    } else if (error && error.message && error.message.includes('already')) {
                        // Book already in library - fetch it from Supabase
                        const { data: existing } = await supabase
                            .from('books')
                            .select('*')
                            .eq('user_id', user.id)
                            .ilike('title', book.title)
                            .ilike('author', book.author)
                            .maybeSingle();

                        if (existing) {
                            const appBook: Book = {
                                id: existing.id,
                                title: existing.title,
                                author: existing.author || 'Unknown',
                                color: existing.color || '#8B7355',
                                fileType: existing.file_type || 'epub',
                                coverImage: existing.cover_url || '',
                                coverUrl: existing.cover_url || '',
                                fileUrl: existing.file_url || '',
                                tags: existing.tags || [],
                                year: existing.year || '',
                                summary: existing.summary || '',
                                progressPercent: existing.progress_percent || 0,
                                lastLocation: existing.last_location || '',
                                timeRead: existing.time_read_seconds || 0,
                                isFavorite: existing.is_favorite || false,
                                isArchived: false,
                                collectionIds: existing.collection_ids || []
                            };
                            // Merge with local collectionIds
                            const localBooks = await getAllBooks();
                            const localBook = localBooks.find(lb => lb.id === existing.id);
                            const existingCollections = localBook?.collectionIds || appBook.collectionIds || [];

                            // Check if collectionId is already there
                            const finalCollectionIds = existingCollections.includes(collectionId)
                                ? existingCollections
                                : [...existingCollections, collectionId];

                            booksToUpdate.push({ ...appBook, collectionIds: finalCollectionIds });
                        }
                        successCount++;
                    }
                } catch (e) {
                    console.warn(`Failed to process book: ${book.title}`, e);
                }
            }

            // Always create collection if we have books
            if (booksToUpdate.length > 0) {
                setProgress(90);
                setAddingStatus('Syncing collection...');
                await saveCollection(newCollection);

                // Also sync collection to Supabase
                const { saveCollectionToSupabase, syncBookCollectionIds } = await import('../lib/supabaseDb');
                await saveCollectionToSupabase(newCollection).catch(() => { });

                for (const b of booksToUpdate) {
                    await saveBook(b);
                    // Sync each book's collection_ids to Supabase
                    await syncBookCollectionIds(b.id, b.collectionIds || []).catch(() => { });
                }

                // Small delay to ensure DB operations complete
                await new Promise(resolve => setTimeout(resolve, 500));

                if (onBooksAdded) onBooksAdded(booksToUpdate);
            }

            if (successCount > 0) {
                setProgress(100);
                setAddingStatus('Completed!');
                showToast(`Saved ${successCount} volume${successCount > 1 ? 's' : ''} to "${series.title}" collection!`, 'success');
            } else {
                showToast('Could not save books. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Failed to add series:', error);
            showToast('Failed to save collection', 'error');
            setAddingStatus('Failed');
        } finally {
            setIsAdding(false);
            setTimeout(() => setAddingStatus(''), 2000);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                className="relative w-full md:max-w-2xl h-[92vh] md:h-auto md:max-h-[85vh] bg-white rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
                {/* Header with cover */}
                <div className="relative h-36 md:h-48 bg-gradient-to-br from-[#3D3028] to-[#5a4a3a] overflow-hidden shrink-0">
                    {series.cover_url && (
                        <img src={series.cover_url} alt={series.title} className="absolute inset-0 w-full h-full object-cover opacity-30" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 md:top-4 md:right-4 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-colors z-10"
                    >
                        <X size={18} />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
                        <div className="inline-flex px-2.5 py-1 bg-white/15 backdrop-blur-md rounded-md text-white text-[10px] font-bold uppercase tracking-wider mb-1.5">
                            {series.category_type || 'Series'} · {books.length} Volume{books.length !== 1 ? 's' : ''}
                        </div>
                        <h2 className="font-serif text-xl md:text-3xl text-white leading-tight line-clamp-2">{series.title}</h2>
                        {series.author && (
                            <p className="text-white/60 text-[10px] md:text-xs font-bold uppercase tracking-widest mt-1">{series.author}</p>
                        )}
                    </div>

                    {/* Progress Bar for batch add */}
                    <AnimatePresence>
                        {isAdding && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20"
                            >
                                <motion.div 
                                    className="h-full bg-[#E86C46]" 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Save Button - Always visible, sticky */}
                <div className="px-4 md:px-6 py-3 border-b border-[#3D3028]/5 bg-[#FAFAF8] shrink-0">
                    <button
                        onClick={handleAddSeriesToLibrary}
                        disabled={isAdding || books.length === 0 || isLoading}
                        className="w-full md:w-auto px-6 py-3 bg-[#E86C46] text-white text-[11px] font-bold uppercase tracking-widest rounded-xl hover:bg-[#D45A35] transition-all shadow-md active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isAdding ? (
                            <div className="flex items-center gap-2">
                                <Loader2 size={18} className="animate-spin" />
                                <span>{addingStatus || 'Saving...'}</span>
                            </div>
                        ) : (
                            <>
                                <Plus size={18} />
                                <span>Save All to My Collection</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Description */}
                {series.description && (
                    <div className="px-4 md:px-6 pt-3 pb-1 shrink-0">
                        <p className="text-xs md:text-sm text-[#3D3028]/60 leading-relaxed line-clamp-3">{series.description}</p>
                    </div>
                )}

                {/* Volume List */}
                <div className="flex-1 overflow-y-auto px-4 md:px-6 py-3">
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 size={28} className="animate-spin text-[#3D3028]/20" />
                        </div>
                    ) : books.length > 0 ? (
                        <div className="space-y-2">
                            {books.map((book, idx) => {
                                // Check if user already owns this volume
                                const normalise = (s: string) => s.trim().toLowerCase();
                                const isOwned = userBooks?.some(ub => 
                                    normalise(ub.title) === normalise(book.title) && 
                                    normalise(ub.author) === normalise(book.author)
                                );

                                return (
                                    <motion.div
                                        key={book.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                            isOwned 
                                            ? 'bg-[#6B8E6D]/5 border-[#6B8E6D]/20 opacity-80' 
                                            : 'bg-white border-[#3D3028]/5 hover:border-[#E86C46]/30'
                                        }`}
                                    >
                                        <div className="w-10 h-14 bg-[#F3F0EB] rounded-md overflow-hidden shrink-0 shadow-sm border border-[#3D3028]/5">
                                            {book.cover_url && (
                                                <img src={book.cover_url} alt="" className="w-full h-full object-cover" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <h4 className="font-serif text-sm text-[#3D3028] truncate">{book.title}</h4>
                                                {isOwned && (
                                                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#6B8E6D]/10 text-[#6B8E6D] text-[9px] font-bold uppercase">
                                                        <Check size={8} strokeWidth={3} />
                                                        <span>Owned</span>
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-[#3D3028]/40 truncate">{book.author}</p>
                                        </div>
                                        <button
                                            onClick={() => !isOwned && onOpenBook(book)}
                                            disabled={isAdding || isOwned}
                                            className={`p-2 rounded-lg transition-all ${
                                                isOwned
                                                ? 'text-[#6B8E6D] bg-[#6B8E6D]/10'
                                                : 'text-[#3D3028]/40 hover:text-[#E86C46] hover:bg-[#E86C46]/10'
                                            }`}
                                            title={isOwned ? "Already in library" : "View details"}
                                        >
                                            {isOwned ? <Check size={18} /> : <BookOpen size={18} />}
                                        </button>
                                    </motion.div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <BookOpen size={28} className="mx-auto text-[#3D3028]/15 mb-3" />
                            <p className="text-sm text-[#3D3028]/40 font-serif italic">No volumes added yet</p>
                            <p className="text-xs text-[#3D3028]/25 mt-1">Add books to this series from the Admin Panel.</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

