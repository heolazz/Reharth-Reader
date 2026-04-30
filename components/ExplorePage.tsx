import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, TrendingUp, Compass, Star, Loader2, Award, BookOpen, X, ChevronLeft, Plus, Check } from 'lucide-react';
import { fetchPublicBooks, fetchAvailableGenres, PublicBook, fetchPublicSeries, PublicSeries, addPublicBookToLibrary } from '../lib/publicBooksApi';
import { useAuthStore } from '../stores/useAuthStore';
import { useToast } from './Toast';

interface ExplorePageProps {
    onOpenBook?: (book: PublicBook) => void;
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
        <div className="relative w-full h-[460px] md:h-[400px] rounded-[2rem] overflow-hidden shadow-2xl bg-[#3D3028]">
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

            <div className="relative z-10 w-full h-full flex flex-col md:flex-row items-center justify-center p-6 md:p-12 gap-6 md:gap-12">
                {/* Book Cover */}
                <motion.div 
                    key={`cover-${book.id}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-[140px] md:w-[200px] shrink-0 aspect-[2/3] rounded-md shadow-[0_12px_32px_rgba(0,0,0,0.6)] overflow-hidden cursor-pointer mt-4 md:mt-0"
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
                    className="flex-1 text-white text-center md:text-left flex flex-col justify-center items-center md:items-start"
                >
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-white/80 text-[10px] font-bold uppercase tracking-widest mb-3 md:mb-4">
                        <Award size={12} className="text-[#E86C46]" />
                        Featured Collection
                    </div>
                    <h2 className="font-serif text-2xl md:text-4xl lg:text-5xl leading-tight mb-2 line-clamp-2 cursor-pointer hover:text-white/90 transition-colors" onClick={() => onOpenBook?.(book)}>
                        {book.title}
                    </h2>
                    <p className="text-xs md:text-sm text-white/60 mb-4 md:mb-6 uppercase tracking-widest font-bold flex items-center justify-center md:justify-start gap-2">
                        <span>{book.author}</span>
                        {book.genre && book.genre.length > 0 && (
                            <>
                                <span className="w-1 h-1 rounded-full bg-white/40"></span>
                                <span className="text-[#E86C46]">
                                    {Array.isArray(book.genre) ? book.genre.join(', ') : book.genre}
                                </span>
                            </>
                        )}
                    </p>
                    {book.description && (
                        <p className="text-xs md:text-sm text-white/70 line-clamp-3 mb-6 md:mb-8 max-w-xl">
                            {book.description}
                        </p>
                    )}
                    
                    <button 
                        onClick={() => onOpenBook?.(book)}
                        className="bg-[#E86C46] text-white px-6 md:px-8 py-2.5 md:py-3 rounded-xl font-medium text-sm hover:bg-[#D65A34] transition-colors shadow-lg"
                    >
                        Read Now
                    </button>
                </motion.div>
            </div>

            {/* Controls */}
            {books.length > 1 && (
                <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-20">
                    {books.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActiveIndex(idx)}
                            className={`h-1.5 rounded-full transition-all ${idx === activeIndex ? 'w-6 bg-[#E86C46]' : 'w-2 bg-white/30 hover:bg-white/50'}`}
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
            <div className="flex overflow-x-auto gap-6 pb-6 pt-2 scrollbar-hide snap-x -mx-6 px-6 md:mx-0 md:px-0">
                {books.map(book => (
                    <motion.div
                        key={book.id}
                        whileHover={{ y: -5 }}
                        className="group cursor-pointer w-[140px] md:w-[160px] shrink-0 snap-start flex flex-col items-center text-center"
                        onClick={() => onOpenBook?.(book)}
                    >
                        <div className="relative w-full aspect-[2/3] rounded-[2px] shadow-[0_4px_12px_rgba(0,0,0,0.08)] bg-white overflow-hidden transition-shadow group-hover:shadow-[0_12px_24px_rgba(0,0,0,0.12)] mb-4">
                            <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-black/10 z-20" />
                            <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay z-10 pointer-events-none" />
                            
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
            <div className="flex overflow-x-auto gap-8 pb-8 pt-4 scrollbar-hide snap-x -mx-6 px-6 md:mx-0 md:px-0">
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
            <div className="flex overflow-x-auto gap-6 pb-6 pt-2 scrollbar-hide snap-x -mx-6 px-6 md:mx-0 md:px-0">
                {seriesList.map(series => (
                    <motion.div
                        key={series.id}
                        whileHover={{ y: -5 }}
                        className="group cursor-pointer w-[180px] md:w-[220px] shrink-0 snap-start flex flex-col"
                        onClick={() => onOpenSeries?.(series)}
                    >
                        <div className="relative w-full aspect-[16/10] rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.08)] bg-white overflow-hidden transition-shadow group-hover:shadow-[0_12px_24px_rgba(0,0,0,0.12)] mb-4">
                            <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay z-10 pointer-events-none" />
                            
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

export const ExplorePage: React.FC<ExplorePageProps> = ({ onOpenBook }) => {
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
        <div className="min-h-screen bg-white text-[#3D3028] font-sans pb-24 md:pb-12 pt-20 md:pt-24 px-6 md:px-12">

            <div className="max-w-6xl mx-auto space-y-10">

                {/* 1. Hero / Header */}
                <div className="text-center space-y-4 py-6 md:py-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-[#3D3028]/5 rounded-full text-[#3D3028]/60 text-xs font-bold uppercase tracking-widest mb-2"
                    >
                        <Compass size={14} />
                        Explore Library
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.6 }}
                        className="font-serif text-4xl md:text-6xl text-[#3D3028] leading-tight"
                    >
                        Find your next <br className="hidden md:block" />
                        great adventure.
                    </motion.h1>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="max-w-xl mx-auto relative group pt-2"
                    >
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none mt-2">
                            <Search size={20} className="text-[#3D3028]/40" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by title, author, or genre..."
                            className="w-full bg-white border border-[#3D3028]/10 rounded-2xl py-4 pl-12 pr-4 text-lg text-[#3D3028] placeholder-[#3D3028]/30 focus:outline-none focus:border-[#3D3028]/30 focus:shadow-lg transition-all shadow-sm"
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
                    <div className="overflow-x-auto pb-4 -mx-6 px-6 md:mx-0 md:px-0 scrollbar-hide">
                        <div className="flex gap-3 w-max mx-auto">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${activeCategory === cat
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
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
                                    {books.map((book) => (
                                        <motion.div
                                            key={book.id}
                                            whileHover={{ y: -5 }}
                                            className="group cursor-pointer w-full flex justify-center flex-col items-center text-center"
                                            onClick={() => onOpenBook?.(book)}
                                        >
                                            <div className="relative w-full max-w-[150px] aspect-[2/3] rounded-[2px] shadow-[0_4px_12px_rgba(0,0,0,0.08)] bg-white overflow-hidden transition-shadow group-hover:shadow-[0_12px_24px_rgba(0,0,0,0.12)] mb-4">
                                                <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-black/10 z-20" />
                                                <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay z-10 pointer-events-none" />
                                                
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
                        isLoading={isLoadingSeriesBooks}
                        onClose={() => { setSelectedSeries(null); setSeriesBooks([]); }}
                        onOpenBook={(book) => {
                            setSelectedSeries(null);
                            setSeriesBooks([]);
                            onOpenBook?.(book);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// ------------------------------------------------------------------
// SERIES DETAIL MODAL
// ------------------------------------------------------------------
const SeriesDetailModal = ({ series, books, isLoading, onClose, onOpenBook }: {
    series: PublicSeries;
    books: PublicBook[];
    isLoading: boolean;
    onClose: () => void;
    onOpenBook: (book: PublicBook) => void;
}) => {
    const { user } = useAuthStore();
    const { showToast } = useToast();
    const [isAdding, setIsAdding] = useState(false);
    
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
        try {
            let successCount = 0;
            for (const book of books) {
                const { error } = await addPublicBookToLibrary(book.id, user.id);
                // We count it as success if there's no error or if it's already in the library
                if (!error || (error.message && error.message.includes('already'))) {
                    successCount++;
                }
            }
            if (successCount === books.length) {
                showToast(`Saved ${successCount} volumes from "${series.title}" to your library`, 'success');
            } else {
                showToast(`Saved ${successCount}/${books.length} volumes to your library`, 'info');
            }
        } catch (error) {
            console.error('Failed to add series:', error);
            showToast('Failed to add some books', 'error');
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
                {/* Header with cover */}
                <div className="relative h-40 md:h-48 bg-gradient-to-br from-[#3D3028] to-[#5a4a3a] overflow-hidden shrink-0">
                    {series.cover_url && (
                        <img src={series.cover_url} alt={series.title} className="absolute inset-0 w-full h-full object-cover opacity-30" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-colors z-10"
                    >
                        <X size={18} />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                        <div className="inline-flex px-2.5 py-1 bg-white/15 backdrop-blur-md rounded-md text-white text-[10px] font-bold uppercase tracking-wider mb-2">
                            {series.category_type || 'Series'} · {books.length} Volume{books.length !== 1 ? 's' : ''}
                        </div>
                        <h2 className="font-serif text-2xl md:text-3xl text-white leading-tight">{series.title}</h2>
                        {series.author && (
                            <p className="text-white/60 text-xs font-bold uppercase tracking-widest mt-1.5">{series.author}</p>
                        )}
                    </div>
                </div>

                {/* Description & Action */}
                <div className="px-6 pt-5 pb-2 flex flex-col gap-4">
                    {series.description && (
                        <p className="text-sm text-[#3D3028]/60 leading-relaxed">{series.description}</p>
                    )}
                    <button
                        onClick={handleAddSeriesToLibrary}
                        disabled={isAdding || books.length === 0 || isLoading}
                        className="self-start px-4 py-2.5 bg-[#3D3028] text-white text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-[#2C1810] transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                    >
                        {isAdding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        {isAdding ? 'Saving...' : 'Save to My Collection'}
                    </button>
                </div>

                {/* Volume List */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 size={28} className="animate-spin text-[#3D3028]/20" />
                        </div>
                    ) : books.length > 0 ? (
                        <div className="space-y-3">
                            {books.map((book, idx) => (
                                <motion.div
                                    key={book.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    onClick={() => onOpenBook(book)}
                                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-[#FAFAFA] cursor-pointer group transition-colors border border-transparent hover:border-[#3D3028]/5"
                                >
                                    {/* Volume Number */}
                                    <div className="w-8 h-8 shrink-0 rounded-lg bg-[#3D3028]/5 flex items-center justify-center">
                                        <span className="text-sm font-bold text-[#3D3028]/40">{book.volume_number || idx + 1}</span>
                                    </div>

                                    {/* Cover */}
                                    <div className="w-10 h-14 shrink-0 rounded overflow-hidden bg-[#EAE5DD] border border-[#3D3028]/10">
                                        {book.cover_url ? (
                                            <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[8px] text-[#3D3028]/30 p-1">No Cover</div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-sm text-[#3D3028] line-clamp-1 group-hover:underline decoration-[#3D3028]/20 underline-offset-2">
                                            {book.title}
                                        </h4>
                                        <p className="text-[11px] text-[#3D3028]/40 mt-0.5">{book.author}</p>
                                    </div>

                                    {/* Rating */}
                                    {book.rating_average !== undefined && book.rating_average > 0 && (
                                        <div className="flex items-center gap-1 text-xs text-[#3D3028]/50 shrink-0">
                                            <Star size={12} className="fill-[#E86C46] text-[#E86C46]" />
                                            {book.rating_average.toFixed(1)}
                                        </div>
                                    )}
                                </motion.div>
                            ))}
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

