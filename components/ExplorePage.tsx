import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, TrendingUp, Sparkles, BookOpen, Compass, ArrowRight, Star, Loader2 } from 'lucide-react';
import { fetchPublicBooks, fetchTrendingBooks, fetchAvailableGenres, PublicBook } from '../lib/publicBooksApi';

interface ExplorePageProps {
    onOpenBook?: (book: PublicBook) => void;
}

export const ExplorePage: React.FC<ExplorePageProps> = ({ onOpenBook }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');

    // Data States
    const [books, setBooks] = useState<PublicBook[]>([]);
    const [trendingBooks, setTrendingBooks] = useState<PublicBook[]>([]);
    const [genres, setGenres] = useState<string[]>([]);

    // UI States
    const [isLoading, setIsLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);

    // Initial Fetch
    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            try {
                // Fetch genres
                const { data: genresData } = await fetchAvailableGenres();
                if (genresData) setGenres(['All', ...genresData]);

                // Fetch trending books initially
                const { data: trendingData } = await fetchTrendingBooks(4);
                if (trendingData) setTrendingBooks(trendingData);

                // Fetch default books (All)
                const { data: booksData } = await fetchPublicBooks({ limit: 8 });
                if (booksData) setBooks(booksData);

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
        const fetchData = async () => {
            setIsSearching(true);
            try {
                const { data } = await fetchPublicBooks({
                    genre: activeCategory === 'All' ? undefined : activeCategory,
                    search: searchQuery,
                    limit: 12
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

    return (
        <div className="min-h-screen bg-white text-[#3D3028] font-sans pb-24 md:pb-12 pt-20 md:pt-24 px-6 md:px-12">

            <div className="max-w-6xl mx-auto space-y-12">

                {/* 1. Hero / Header */}
                <div className="text-center space-y-4 py-8">
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
                        className="max-w-xl mx-auto relative group"
                    >
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
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

                {/* 2. Categories */}
                {genres.length > 0 && (
                    <div className="overflow-x-auto pb-4 -mx-6 px-6 md:mx-0 md:px-0 scrollbar-hide">
                        <div className="flex gap-3 w-max mx-auto">
                            {genres.map((cat) => (
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

                {/* 3. Book Grid (Main Content) */}
                <div className="space-y-6">
                    <div className="flex items-end justify-between border-b border-[#3D3028]/5 pb-4">
                        <div>
                            <h2 className="font-serif text-2xl md:text-3xl text-[#3D3028] flex items-center gap-2">
                                {searchQuery ? <Search size={24} className="text-[#E86C46]" /> : <TrendingUp size={24} className="text-[#E86C46]" />}
                                {searchQuery ? `Results for "${searchQuery}"` : (activeCategory === 'All' ? 'Trending & Recent' : activeCategory)}
                            </h2>
                            <p className="text-[#3D3028]/50 text-sm mt-1">
                                {isSearching ? 'Searching...' : `Showing ${books.length} books`}
                            </p>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 size={40} className="animate-spin text-[#3D3028]/20" />
                        </div>
                    ) : books.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
                            {books.map((book) => (
                                <motion.div
                                    key={book.id}
                                    whileHover={{ y: -5 }}
                                    className="group cursor-pointer w-full flex justify-center flex-col items-center text-center"
                                    onClick={() => onOpenBook?.(book)}
                                >
                                    <div className="relative w-full max-w-[150px] aspect-[2/3] rounded-[2px] shadow-[0_4px_12px_rgba(0,0,0,0.08)] bg-white overflow-hidden transition-shadow group-hover:shadow-[0_12px_24px_rgba(0,0,0,0.12)] mb-4">
                                        {/* Spine Hinge Detail */}
                                        <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-black/10 z-20" />

                                        {/* Minimal Noise Texture */}
                                        <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay z-10 pointer-events-none" />

                                        {/* Cover Image */}
                                        {book.cover_url ? (
                                            <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" loading="lazy" />
                                        ) : (
                                            <div className="w-full h-full bg-[#EAE5DD] flex items-center justify-center p-2 text-[#3D3028]/40 font-serif text-xs">
                                                No Cover
                                            </div>
                                        )}

                                        {/* Gradient Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/20" />

                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-10 transition-opacity" />

                                        {/* Rating Badge - Only if rating exists */}
                                        {book.rating_average !== undefined && book.rating_average > 0 && (
                                            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 shadow-sm z-20">
                                                <Star size={10} className="fill-[#E86C46] text-[#E86C46]" />
                                                {book.rating_average.toFixed(1)}
                                            </div>
                                        )}
                                    </div>

                                    <h3 className="font-serif text-lg leading-tight text-[#3D3028] mb-1 group-hover:underline decoration-[#3D3028]/30 underline-offset-4 decoration-1 line-clamp-2">
                                        {book.title}
                                    </h3>
                                    <p className="text-xs font-bold uppercase tracking-widest text-[#3D3028]/40 line-clamp-1">
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
                </div>

                {/* 4. Curated Collections Banner - Only show on Home/All */}
                {activeCategory === 'All' && !searchQuery && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8">
                        <div className="bg-[#1a1c1a] rounded-2xl p-8 relative overflow-hidden text-[#F8F5F1] group cursor-pointer h-64 flex flex-col justify-center">
                            <div className="absolute inset-0">
                                <img src="https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&q=80&w=800" className="w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent" />
                            </div>
                            <div className="relative z-10 px-4">
                                <span className="inline-block px-2 py-1 bg-white/20 backdrop-blur-md rounded text-[10px] font-bold uppercase tracking-widest mb-3">Collection</span>
                                <h3 className="font-serif text-3xl md:text-4xl mb-2">Dark Academia</h3>
                                <p className="text-white/60 text-sm max-w-xs mb-6">Moody, atmospheric reads for rainy days and late nights.</p>
                                <span className="text-xs font-bold uppercase tracking-widest border-b border-white/30 pb-0.5 inline-block">Explore Collection</span>
                            </div>
                        </div>

                        <div className="bg-[#EAE5DF] rounded-2xl p-8 relative overflow-hidden text-[#3D3028] group cursor-pointer h-64 flex flex-col justify-center">
                            <div className="absolute inset-0">
                                <img src="https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&q=80&w=800" className="w-full h-full object-cover opacity-20 hover:opacity-10 transition-opacity duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-r from-[#EAE5DF]/90 to-transparent" />
                            </div>
                            <div className="relative z-10 px-4">
                                <span className="inline-block px-2 py-1 bg-[#3D3028]/10 backdrop-blur-md rounded text-[10px] font-bold uppercase tracking-widest text-[#3D3028]/60 mb-3">New Arrivals</span>
                                <h3 className="font-serif text-3xl md:text-4xl mb-2">Modern Classics</h3>
                                <p className="text-[#3D3028]/60 text-sm max-w-xs mb-6">Contemporary masterpieces that define our generation.</p>
                                <span className="text-xs font-bold uppercase tracking-widest border-b border-[#3D3028]/30 pb-0.5 inline-block">Explore Collection</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* 5. Minimal Footer Quote */}
                <div className="text-center pt-16 pb-8 border-t border-[#3D3028]/5">
                    <p className="font-serif text-xl md:text-2xl text-[#3D3028]/40 italic">
                        "There is no friend as loyal as a book."
                    </p>
                    <p className="text-xs font-bold uppercase tracking-widest text-[#3D3028]/20 mt-3">— Ernest Hemingway</p>
                </div>

            </div>
        </div>
    );
};
