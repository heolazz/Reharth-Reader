import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Check, Loader2, Star, BookOpen, Share2, AlertTriangle, RefreshCw } from 'lucide-react';
import { PublicBook, addPublicBookToLibrary } from '../lib/publicBooksApi';
import { useAuthStore } from '../stores/useAuthStore';
import { useToast } from './Toast';

import { Book } from '../types';

interface PublicBookDetailModalProps {
    book: PublicBook | null;
    isOpen: boolean;
    onClose: () => void;
    onBookAdded?: (book: Book) => void;
    onReadNow?: (book: Book) => void;
    userBooks?: Book[];
}

export const PublicBookDetailModal: React.FC<PublicBookDetailModalProps> = ({ book, isOpen, onClose, onBookAdded, onReadNow, userBooks }) => {
    const { user } = useAuthStore();
    const { showToast } = useToast();
    const [isAdding, setIsAdding] = useState(false);
    const [isAdded, setIsAdded] = useState(false);
    const [addedBook, setAddedBook] = useState<Book | null>(null);
    const [isPartialSave, setIsPartialSave] = useState(false);
    const [hasFailed, setHasFailed] = useState(false);

    // Reset state when modal closes
    React.useEffect(() => {
        if (!isOpen) {
            setIsAdded(false);
            setIsAdding(false);
            setAddedBook(null);
            setIsPartialSave(false);
            setHasFailed(false);
        }
    }, [isOpen, book]);

    // Auto-detect if book is already in user's library
    React.useEffect(() => {
        if (!isOpen || !book || !userBooks || userBooks.length === 0) return;

        const normalise = (s: string) => s.trim().toLowerCase();
        const match = userBooks.find(ub =>
            normalise(ub.title) === normalise(book.title) &&
            normalise(ub.author) === normalise(book.author)
        );

        if (match) {
            setIsAdded(true);
            setAddedBook(match);
        }
    }, [isOpen, book, userBooks]);

    // ESC to close modal
    React.useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const [addingStatus, setAddingStatus] = useState<string>('');

    if (!book) return null;

    const handleAddToLibrary = async () => {
        if (!user) {
            showToast('Please login to add books', 'error');
            return;
        }

        setIsAdding(true);
        setHasFailed(false);
        setIsPartialSave(false);
        setAddingStatus('Connecting to cloud...');
        
        try {
            // Step 1: Add to Supabase
            const { error, data } = await addPublicBookToLibrary(book.id, user.id);
            
            if (error) {
                const errMsg = error?.message || (typeof error === 'string' ? error : 'Unknown error');
                if (errMsg.includes('already')) {
                    showToast('Book is already in your library', 'info');
                    setIsAdded(true);
                    // Try to build a minimal Book object for Read Now
                    setAddedBook(data as Book || {
                        id: book.id,
                        title: book.title,
                        author: book.author,
                        color: '#8B7355',
                        fileType: book.epub_url ? 'epub' : 'text',
                        coverImage: book.cover_url || '',
                        coverUrl: book.cover_url || '',
                        fileUrl: book.epub_url || '',
                    } as Book);
                    return;
                } else {
                    throw error;
                }
            } 
            
            if (data) {
                // Step 2: Save to local IndexedDB
                setAddingStatus('Syncing to local library...');
                let localSaveOk = true;
                try {
                    const { saveBook } = await import('../utils/db');
                    await saveBook(data as Book);
                    
                    // Small delay to ensure DB write is finalized
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (e) {
                    console.warn('Could not save to local DB:', e);
                    localSaveOk = false;
                    setIsPartialSave(true);
                }

                setAddingStatus(localSaveOk ? 'Completed!' : 'Saved to cloud only');
                setIsAdded(true);
                setAddedBook(data as Book);

                if (localSaveOk) {
                    showToast(`"${book.title}" added to your library`, 'success');
                } else {
                    showToast(`"${book.title}" saved to cloud, but local sync failed. The book may not be available offline.`, 'info');
                }
                
                if (onBookAdded) {
                    onBookAdded(data as Book);
                }
            }
        } catch (error: any) {
            console.error('Failed to add book:', error);
            const errMsg = error?.message || (typeof error === 'string' ? error : 'Unknown error');
            showToast(`Failed to add book: ${errMsg}`, 'error');
            setAddingStatus('Failed to save');
            setHasFailed(true);
        } finally {
            setIsAdding(false);
            // Only auto-reset status if not failed/partial
            if (!hasFailed && !isPartialSave) {
                setTimeout(() => setAddingStatus(''), 2000);
            }
        }
    };

    const handleShare = async () => {
        const slugify = (text: string) =>
            text.toString().toLowerCase()
                .replace(/\s+/g, '-').replace(/[^\w\-]+/g, '')
                .replace(/\-\-+/g, '-').replace(/^-+/, '').replace(/-+$/, '');

        const shareText = `📖 "${book.title}" by ${book.author}`;
        const shareUrl = `${window.location.origin}/explore/${slugify(book.title)}`;
        const fullText = `${shareText}\n\nRead on Reharth Reader`;

        // Try native Web Share API first (mobile & supported browsers)
        if (navigator.share) {
            try {
                await navigator.share({
                    title: book.title,
                    text: fullText,
                    url: shareUrl,
                });
            } catch (err: any) {
                // User cancelled share — not an error
                if (err.name !== 'AbortError') {
                    console.error('Share failed:', err);
                }
            }
        } else {
            // Fallback: copy to clipboard
            try {
                await navigator.clipboard.writeText(`${fullText}\n${shareUrl}`);
                showToast('Link copied to clipboard!', 'success');
            } catch {
                // Final fallback for older browsers
                const textarea = document.createElement('textarea');
                textarea.value = `${fullText}\n${shareUrl}`;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                showToast('Link copied to clipboard!', 'success');
            }
        }
    };

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
                            <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E')] z-0" />

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
                                        {book.rating_average !== undefined && book.rating_average > 0 ? (
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#3D3028]/40 mb-1">Rating</span>
                                                <div className="flex items-center gap-1.5 text-lg font-serif text-[#3D3028]">
                                                    <Star size={16} className="fill-[#E86C46] text-[#E86C46]" />
                                                    {book.rating_average.toFixed(1)}
                                                </div>
                                            </div>
                                        ) : null}
                                        {book.published_year !== undefined && book.published_year > 0 ? (
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#3D3028]/40 mb-1">Year</span>
                                                <span className="text-lg font-serif text-[#3D3028]">{book.published_year}</span>
                                            </div>
                                        ) : null}
                                        {book.page_count !== undefined && book.page_count > 0 ? (
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#3D3028]/40 mb-1">Pages</span>
                                                <span className="text-lg font-serif text-[#3D3028]">{book.page_count}</span>
                                            </div>
                                        ) : null}
                                        {book.genre && book.genre.length > 0 ? (
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#3D3028]/40 mb-1">Genre</span>
                                                <span className="text-lg font-serif text-[#3D3028]">{book.genre[0]}</span>
                                            </div>
                                        ) : null}
                                    </div>

                                    {/* Description */}
                                    <div className="prose prose-stone max-w-none mb-6">
                                        <p className="text-[#3D3028]/80 text-lg leading-relaxed font-serif">
                                            {book.description || "No description available for this book."}
                                        </p>
                                    </div>

                                    {/* Tags */}
                                    {book.tags && book.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-10">
                                            {book.tags.map(tag => (
                                                <span key={tag} className="px-3 py-1 bg-[#3D3028]/5 text-[#3D3028]/60 text-[10px] font-bold uppercase tracking-widest rounded-full border border-[#3D3028]/10">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            </div>

                            {/* Actions */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="pt-4 flex flex-col gap-3"
                            >
                                {/* Primary Action Row */}
                                <div className="flex flex-col md:flex-row gap-3">
                                    {isAdded ? (
                                        /* After added: Show "Read Now" + "Added" indicator */
                                        <>
                                            <button
                                                onClick={() => {
                                                    if (addedBook && onReadNow) {
                                                        onReadNow(addedBook);
                                                    }
                                                }}
                                                className="flex-1 py-4 rounded-xl font-medium tracking-wide flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] bg-[#E86C46] text-white hover:bg-[#D45A35]"
                                            >
                                                <BookOpen size={18} />
                                                <span>Read Now</span>
                                            </button>
                                            <div className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#6B8E6D]/10 text-[#6B8E6D] text-sm font-medium">
                                                <Check size={16} />
                                                <span>In Library</span>
                                            </div>
                                        </>
                                    ) : hasFailed ? (
                                        /* Failed state: Show retry */
                                        <button
                                            onClick={handleAddToLibrary}
                                            disabled={isAdding}
                                            className="flex-1 py-4 rounded-xl font-medium tracking-wide flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] bg-red-600 text-white hover:bg-red-700"
                                        >
                                            <RefreshCw size={18} />
                                            <span>Retry — Add to Library</span>
                                        </button>
                                    ) : (
                                        /* Default: Add to Library */
                                        <button
                                            onClick={handleAddToLibrary}
                                            disabled={isAdding}
                                            className="flex-1 py-4 rounded-xl font-medium tracking-wide flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] bg-[#3D3028] text-white hover:bg-[#2C1810]"
                                        >
                                            {isAdding ? (
                                                <>
                                                    <Loader2 size={18} className="animate-spin" />
                                                    <span>{addingStatus || 'Processing...'}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Plus size={18} />
                                                    <span>Add to My Library</span>
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>

                                {/* Share button row */}
                                <button
                                    onClick={handleShare}
                                    className="w-full px-6 py-3 rounded-xl border border-[#3D3028]/10 text-[#3D3028]/60 hover:text-[#3D3028] hover:bg-[#3D3028]/5 transition-colors flex items-center justify-center gap-2 font-medium text-sm"
                                >
                                    <Share2 size={16} />
                                    <span>Share</span>
                                </button>
                            </motion.div>
                            
                            {/* Partial Save Warning */}
                            <AnimatePresence>
                                {isPartialSave && isAdded && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mt-3 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800"
                                    >
                                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-semibold">Saved to cloud only</p>
                                            <p className="text-[11px] text-amber-700 mt-0.5">Local sync failed — this book may not be available offline. Try refreshing the app later.</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Failed State Info */}
                            <AnimatePresence>
                                {hasFailed && !isAdding && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mt-3 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800"
                                    >
                                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-semibold">Could not save book</p>
                                            <p className="text-[11px] text-red-700 mt-0.5">Please check your connection and try again.</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Detailed Status Text (only when actively adding) */}
                            {isAdding && addingStatus && (
                                <motion.p 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="mt-2 text-center text-xs font-bold uppercase tracking-widest text-[#E86C46] animate-pulse"
                                >
                                    {addingStatus}
                                </motion.p>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
