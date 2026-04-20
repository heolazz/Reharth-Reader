import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Check, Loader2, Star, BookOpen, Share2 } from 'lucide-react';
import { PublicBook, addPublicBookToLibrary } from '../lib/publicBooksApi';
import { useAuthStore } from '../stores/useAuthStore';
import { useToast } from './Toast';

import { Book } from '../types';

interface PublicBookDetailModalProps {
    book: PublicBook | null;
    isOpen: boolean;
    onClose: () => void;
    onBookAdded?: (book: Book) => void;
}

export const PublicBookDetailModal: React.FC<PublicBookDetailModalProps> = ({ book, isOpen, onClose, onBookAdded }) => {
    const { user } = useAuthStore();
    const { showToast } = useToast();
    const [isAdding, setIsAdding] = useState(false);
    const [isAdded, setIsAdded] = useState(false);

    // Reset state when modal opens/closes
    React.useEffect(() => {
        if (!isOpen) {
            setIsAdded(false);
            setIsAdding(false);
        }
    }, [isOpen, book]);

    if (!book) return null;

    const handleAddToLibrary = async () => {
        if (!user) {
            showToast('Please login to add books', 'error');
            return;
        }

        setIsAdding(true);
        try {
            const { error, data } = await addPublicBookToLibrary(book.id, user.id);
            if (error) {
                const errMsg = error?.message || (typeof error === 'string' ? error : 'Unknown error');
                if (errMsg.includes('already')) {
                    showToast('Book is already in your library', 'info');
                    setIsAdded(true);
                } else {
                    throw error;
                }
            } else {
                setIsAdded(true);
                showToast(`"${book.title}" added to your library`, 'success');
                if (onBookAdded && data) onBookAdded(data as Book);
            }
        } catch (error: any) {
            console.error('Failed to add book:', error);
            const errMsg = error?.message || (typeof error === 'string' ? error : 'Unknown error');
            showToast(`Failed to add book: ${errMsg}`, 'error');
        } finally {
            setIsAdding(false);
        }
    };

    const bgColor = '#EAE5DD'; // Default paper color since PublicBook doesn't have 'color' prop yet

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-8">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-[#3D3028]/40 backdrop-blur-sm"
                    />

                    {/* Modal Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full md:max-w-4xl h-full md:h-auto md:max-h-[90vh] bg-white md:rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row ring-1 ring-[#3D3028]/5"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 z-20 p-2 bg-white/80 hover:bg-white backdrop-blur-sm rounded-full transition-all text-[#3D3028]/60 hover:text-[#3D3028] shadow-sm"
                        >
                            <X size={20} />
                        </button>

                        {/* Left Side: Cover Area */}
                        <div className="w-full md:w-5/12 bg-[#F3F0EB] border-r border-[#3D3028]/5 flex items-center justify-center p-8 md:p-12 relative overflow-hidden min-h-[300px] shrink-0">
                            {/* Background Texture */}
                            <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] z-0" />

                            {/* Book Cover */}
                            <motion.div
                                layoutId={`public-book-${book.id}`}
                                className="relative shadow-2xl w-[180px] aspect-[2/3] md:w-[220px] rounded-[2px] overflow-hidden transform rotate-[-2deg]"
                            >
                                {/* Spine */}
                                <div className="absolute left-0 top-0 bottom-0 w-[8px] bg-black/20 z-20" />

                                {book.cover_url ? (
                                    <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-[#EAE5DD] flex items-center justify-center p-4 text-center">
                                        <div>
                                            <h3 className="font-serif text-[#3D3028] text-xl leading-tight mb-2">{book.title}</h3>
                                            <p className="font-sans text-xs uppercase tracking-widest text-[#3D3028]/60">{book.author}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Overlay/Shine */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent pointer-events-none" />
                            </motion.div>
                        </div>

                        {/* Right Side: Details */}
                        <div className="flex-1 p-8 md:p-12 flex flex-col overflow-y-auto custom-scrollbar bg-white">
                            <div className="flex-1">
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                >
                                    <div className="flex items-start justify-between gap-4 mb-2">
                                        <h2 className="font-serif text-3xl md:text-5xl text-[#3D3028] leading-tight">
                                            {book.title}
                                        </h2>
                                    </div>
                                    <p className="font-serif text-xl italic text-[#3D3028]/60 mb-6">
                                        by {book.author}
                                    </p>

                                    {/* Stats / Metadata */}
                                    <div className="flex flex-wrap gap-4 md:gap-8 py-6 border-t border-b border-[#3D3028]/5 mb-8">
                                        {book.rating_average && (
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#3D3028]/40 mb-1">Rating</span>
                                                <div className="flex items-center gap-1.5 text-lg font-serif text-[#3D3028]">
                                                    <Star size={16} className="fill-[#E86C46] text-[#E86C46]" />
                                                    {book.rating_average.toFixed(1)}
                                                </div>
                                            </div>
                                        )}
                                        {book.published_year && (
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#3D3028]/40 mb-1">Year</span>
                                                <span className="text-lg font-serif text-[#3D3028]">{book.published_year}</span>
                                            </div>
                                        )}
                                        {book.page_count && (
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#3D3028]/40 mb-1">Pages</span>
                                                <span className="text-lg font-serif text-[#3D3028]">{book.page_count}</span>
                                            </div>
                                        )}
                                        {book.genre && book.genre.length > 0 && (
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#3D3028]/40 mb-1">Genre</span>
                                                <span className="text-lg font-serif text-[#3D3028]">{book.genre[0]}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Description */}
                                    <div className="prose prose-stone max-w-none mb-10">
                                        <p className="text-[#3D3028]/80 text-lg leading-relaxed font-serif">
                                            {book.description || "No description available for this book."}
                                        </p>
                                    </div>
                                </motion.div>
                            </div>

                            {/* Actions */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="pt-4 flex flex-col md:flex-row gap-4"
                            >
                                <button
                                    onClick={handleAddToLibrary}
                                    disabled={isAdding || isAdded}
                                    className={`flex-1 py-4 rounded-xl font-medium tracking-wide flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] ${isAdded
                                        ? 'bg-[#6B8E6D] text-white hover:bg-[#5a7a5c]'
                                        : 'bg-[#3D3028] text-white hover:bg-[#2C1810]'
                                        }`}
                                >
                                    {isAdding ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : isAdded ? (
                                        <>
                                            <Check size={18} />
                                            <span>Added to Library</span>
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={18} />
                                            <span>Add to My Library</span>
                                        </>
                                    )}
                                </button>

                                <button className="md:w-auto w-full px-6 py-4 rounded-xl border border-[#3D3028]/10 text-[#3D3028]/60 hover:text-[#3D3028] hover:bg-[#3D3028]/5 transition-colors flex items-center justify-center gap-2 font-medium">
                                    <Share2 size={18} />
                                    <span className="md:hidden">Share</span>
                                </button>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
