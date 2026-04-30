import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Check, ArrowRight, ArrowLeft, Layers, BookOpen } from 'lucide-react';
import { Collection, Book } from '../types';
import { generateUUID } from '../utils/uuid';
import { getAllCollections, saveCollection, deleteCollection } from '../utils/db';
import { getAllCollectionsFromSupabase, saveCollectionToSupabase, deleteCollectionFromSupabase, syncBookCollectionIds } from '../lib/supabaseDb';

interface CollectionsManagerProps {
    isOpen: boolean;
    onClose: () => void;
    books: Book[];
    onUpdateBook: (book: Book) => void;
    selectedBook?: Book | null;
    selectedCollectionId?: string | null;
    onClearCollection?: () => void;
    onSelectBook?: (id: string) => void;
    onBulkDelete?: (ids: string[]) => void;
}

export const CollectionsManager: React.FC<CollectionsManagerProps> = ({
    isOpen,
    onClose,
    books,
    onUpdateBook,
    selectedBook,
    onSelectCollection,
    selectedCollectionId,
    onClearCollection,
    onSelectBook,
    onBulkDelete
}) => {
    const [collections, setCollections] = useState<(Collection & { bookCount: number, previewBooks: Book[] })[]>([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');
    const [newCollectionDescription, setNewCollectionDescription] = useState('');
    const [selectedColor, setSelectedColor] = useState('#3E2723');

    // Selection state for Collection Detail View
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedBookIds, setSelectedBookIds] = useState<Set<string>>(new Set());

    const isModal = Boolean(selectedBook);

    const COLORS = [
        '#3E2723', // Walnut
        '#7B3F00', // Oak
        '#4A0E0E', // Mahogany
        '#0E2A4A', // Midnight
        '#2D5A27', // Forest
        '#C6A87C'  // Sand
    ];

    // Load collections
    useEffect(() => {
        if (isOpen) {
            loadCollections();
        }
    }, [isOpen, books]);

    const loadCollections = async () => {
        try {
            // Load from both sources
            const [localCols, supabaseCols] = await Promise.all([
                getAllCollections(),
                getAllCollectionsFromSupabase().catch(() => [] as Collection[])
            ]);

            // Merge: Supabase is source of truth, local fills gaps
            const merged = new Map<string, Collection>();
            supabaseCols.forEach(c => merged.set(c.id, c));
            localCols.forEach(c => {
                if (!merged.has(c.id)) {
                    merged.set(c.id, c);
                    // Sync local-only collections to Supabase
                    saveCollectionToSupabase(c).catch(() => {});
                }
            });
            // Save Supabase collections locally for offline access
            for (const c of supabaseCols) {
                saveCollection(c).catch(() => {});
            }

            const allCols = Array.from(merged.values());
            const withCounts = allCols.map(col => ({
                ...col,
                bookCount: books.filter(b => b.collectionIds?.includes(col.id)).length,
                previewBooks: books.filter(b => b.collectionIds?.includes(col.id)).slice(0, 3)
            }));
            setCollections(withCounts);
        } catch (e) {
            console.error("Failed to load collections", e);
        }
    };

    const handleCreateCollection = async () => {
        if (!newCollectionName.trim()) return;

        const newCollection: Collection = {
            id: generateUUID(),
            name: newCollectionName.trim(),
            description: newCollectionDescription.trim() || undefined,
            color: selectedColor,
            createdAt: Date.now(),
        };

        // Save to both local and Supabase
        await saveCollection(newCollection);
        saveCollectionToSupabase(newCollection).catch(e => console.warn('Supabase sync failed:', e));
        loadCollections();
        setNewCollectionName('');
        setNewCollectionDescription('');
        setShowCreateForm(false);
    };

    const handleDeleteCollection = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Delete this collection? Books will not be deleted.')) return;

        // If we're viewing the collection being deleted, go back
        if (selectedCollectionId === id) {
            onClearCollection?.();
        }

        // Delete from both local and Supabase (Await both to prevent race conditions during state reload)
        await Promise.all([
            deleteCollection(id),
            deleteCollectionFromSupabase(id).catch(e => console.warn('Supabase delete failed:', e))
        ]);
        
        setCollections(prev => prev.filter(c => c.id !== id));

        books.forEach(book => {
            if (book.collectionIds?.includes(id)) {
                const updatedIds = book.collectionIds ? book.collectionIds.filter(cid => cid !== id) : [];
                const updated = { ...book, collectionIds: updatedIds };
                onUpdateBook(updated);
                // Sync updated collection_ids to Supabase
                syncBookCollectionIds(book.id, updatedIds).catch(() => {});
            }
        });
    };

    const handleToggleBookInCollection = async (collectionId: string) => {
        if (!selectedBook) return;

        const currentCollections = selectedBook.collectionIds || [];
        const isInCollection = currentCollections.includes(collectionId);

        const newCollectionIds = isInCollection
            ? currentCollections.filter(id => id !== collectionId)
            : [...currentCollections, collectionId];

        const updatedBook: Book = {
            ...selectedBook,
            collectionIds: newCollectionIds
        };

        onUpdateBook(updatedBook);
        // Sync to Supabase
        syncBookCollectionIds(selectedBook.id, newCollectionIds).catch(() => {});
        setTimeout(loadCollections, 100);
    };

    const activeCollection = selectedCollectionId ? collections.find(c => c.id === selectedCollectionId) : null;
    const collectionBooks = selectedCollectionId ? books.filter(b => b.collectionIds?.includes(selectedCollectionId)) : [];

    const handleBookClick = (bookId: string) => {
        if (selectionMode) {
            setSelectedBookIds(prev => {
                const next = new Set(prev);
                if (next.has(bookId)) next.delete(bookId);
                else next.add(bookId);
                return next;
            });
        } else {
            onSelectBook?.(bookId);
        }
    };

    const handleBulkDelete = () => {
        if (selectedBookIds.size === 0) return;
        if (confirm(`Are you sure you want to delete ${selectedBookIds.size} books?`)) {
            onBulkDelete?.(Array.from(selectedBookIds));
            setSelectionMode(false);
            setSelectedBookIds(new Set());
        }
    };

    if (!isOpen) return null;

    // === PAGE VIEW RENDER (Main Collections Tab) ===
    if (!isModal) {
        // === COLLECTION DETAIL VIEW ===
        if (selectedCollectionId && activeCollection) {
            return (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="absolute inset-0 z-10 bg-white pt-24 pb-24 md:pb-12 px-6 lg:px-12 overflow-y-auto"
                >
                    <div className="max-w-6xl mx-auto space-y-10">
                        {/* Detail Header */}
                        <div className="flex flex-col space-y-6 border-b border-black/5 pb-8">
                            <div className="flex items-center justify-between">
                                <button
                                    onClick={() => {
                                        onClearCollection?.();
                                        setSelectionMode(false);
                                        setSelectedBookIds(new Set());
                                    }}
                                    className="group flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-black/40 hover:text-[#3E2723] transition-colors self-start"
                                >
                                    <div className="w-8 h-8 rounded-full bg-[#FAFAFA] border border-black/5 flex items-center justify-center group-hover:bg-[#3E2723] group-hover:text-white group-hover:border-transparent transition-all shadow-sm">
                                        <ArrowLeft size={14} />
                                    </div>
                                    Back to Collections
                                </button>
                                
                                {collectionBooks.length > 0 && (
                                    <button
                                        onClick={() => {
                                            setSelectionMode(!selectionMode);
                                            if (selectionMode) setSelectedBookIds(new Set());
                                        }}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${selectionMode
                                            ? 'bg-[#3E2723] text-white shadow-md'
                                            : 'bg-[#FAFAFA] border border-black/5 text-[#3E2723] hover:border-black/10'
                                            }`}
                                    >
                                        {selectionMode ? 'Cancel Selection' : 'Select Books'}
                                    </button>
                                )}
                            </div>

                            <div className="space-y-3">
                                <h1 className="text-5xl md:text-7xl font-serif text-[#3E2723] tracking-tight">{activeCollection.name}</h1>
                                <div className="flex flex-wrap items-center gap-4">
                                    <div className="bg-[#FAFAFA] text-black/50 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border border-black/5 flex items-center gap-1.5">
                                        <BookOpen size={12} />
                                        {activeCollection.bookCount} {activeCollection.bookCount === 1 ? 'Volume' : 'Volumes'}
                                    </div>
                                    {activeCollection.description && (
                                        <p className="text-black/40 text-lg font-serif italic">{activeCollection.description}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Books Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10 pb-32">
                            {collectionBooks.map((book, idx) => (
                                <motion.div
                                    key={book.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.03 }}
                                    onClick={() => handleBookClick(book.id)}
                                    className="group cursor-pointer space-y-3 relative"
                                >
                                    {selectionMode && (
                                        <div className="absolute top-2 right-2 z-30">
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedBookIds.has(book.id) ? 'bg-[#9CAF88] border-[#9CAF88]' : 'bg-white/80 border-black/20'}`}>
                                                {selectedBookIds.has(book.id) && <Check size={14} className="text-white" strokeWidth={3} />}
                                            </div>
                                        </div>
                                    )}
                                    <div className={`relative aspect-[2/3] w-full bg-[#FAFAFA] rounded-xl overflow-hidden shadow-sm group-hover:shadow-xl transition-all duration-500 border border-black/5 ${!selectionMode && 'group-hover:-translate-y-2'} ${selectionMode && selectedBookIds.has(book.id) ? 'ring-4 ring-[#9CAF88] ring-offset-2' : ''}`}>
                                        {book.coverImage || book.coverUrl ? (
                                            <img src={book.coverImage || book.coverUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={book.title} />
                                        ) : (
                                            <div
                                                className="w-full h-full flex items-center justify-center p-6 text-center"
                                                style={{ backgroundColor: book.color || '#C6A87C' }}
                                            >
                                                <span className="text-sm text-white/70 font-serif leading-tight">{book.title}</span>
                                            </div>
                                        )}
                                        {/* Progress bar at bottom of cover */}
                                        {(book.progressPercent ?? 0) > 0 && (
                                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10">
                                                <div className="h-full bg-[#9CAF88] transition-all" style={{ width: `${book.progressPercent}%` }} />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="font-serif text-base text-[#3E2723] line-clamp-2 leading-snug group-hover:text-[#9CAF88] transition-colors">{book.title}</h4>
                                        <p className="text-[10px] uppercase font-bold tracking-widest text-black/30 line-clamp-1">{book.author}</p>
                                        {(book.progressPercent ?? 0) > 0 && (
                                            <p className="text-[9px] font-bold text-[#9CAF88]">{Math.round(book.progressPercent || 0)}% read</p>
                                        )}
                                    </div>
                                </motion.div>
                            ))}

                            {collectionBooks.length === 0 && (
                                <div className="col-span-full py-32 flex flex-col items-center justify-center text-center">
                                    <div className="w-20 h-20 rounded-full bg-[#FAFAFA] border border-black/5 flex items-center justify-center mb-6">
                                        <BookOpen size={32} className="text-black/15" />
                                    </div>
                                    <h3 className="font-serif text-2xl text-[#3E2723] mb-2">This shelf is empty</h3>
                                    <p className="text-black/40 font-serif italic text-sm max-w-xs">Add books to this collection from the Library using the categorize button on any book.</p>
                                    <button
                                        onClick={onClearCollection}
                                        className="mt-8 text-[10px] font-bold uppercase tracking-widest text-[#3E2723] border-b border-black/20 pb-1 hover:border-[#3E2723] transition-colors"
                                    >
                                        ← Back to Collections
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Floating Action Bar for Selection Mode */}
                    <AnimatePresence>
                        {selectionMode && selectedBookIds.size > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 50 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 50 }}
                                className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-white px-6 py-4 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-[#3E2723]/10"
                            >
                                <span className="text-sm font-medium text-[#3E2723] whitespace-nowrap">
                                    {selectedBookIds.size} selected
                                </span>
                                <div className="w-[1px] h-6 bg-[#3E2723]/10" />
                                <button
                                    onClick={handleBulkDelete}
                                    className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-full text-xs font-bold uppercase tracking-widest transition-colors whitespace-nowrap"
                                >
                                    Delete
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                </motion.div>
            );
        }

        // === GRID VIEW (List of Collections) ===
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 bg-white pt-24 pb-24 md:pb-12 px-6 lg:px-12 overflow-y-auto selection:bg-[#3E2723]/20"
            >
                <div className="max-w-6xl mx-auto space-y-12">
                    {/* Header: Clean & Modern */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-black/5 pb-8">
                        <div className="animate-in fade-in slide-in-from-left duration-700">
                            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-black/40 mb-4 block">Digital Archive</span>
                            <h1 className="text-5xl md:text-7xl font-serif text-[#3E2723] leading-tight tracking-tight">Your Collections</h1>
                            <p className="text-black/50 text-lg font-serif italic mt-3">Curated shelves for your personal library.</p>
                        </div>
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="group flex items-center gap-3 bg-white hover:bg-[#FAFAFA] text-[#3E2723] border border-black/10 px-8 py-4 rounded-full transition-all duration-300 shadow-sm hover:shadow"
                        >
                            <span className="font-bold text-[10px] uppercase tracking-widest">Create Shelf</span>
                            <div className="w-6 h-6 rounded-full bg-[#3E2723]/5 group-hover:bg-[#3E2723] group-hover:text-white flex items-center justify-center transition-colors">
                                <Plus size={14} />
                            </div>
                        </button>
                    </div>

                    {/* Create Form: Clean Minimal Panel */}
                    <AnimatePresence>
                        {showCreateForm && (
                            <motion.div
                                initial={{ opacity: 0, y: -20, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                exit={{ opacity: 0, y: -20, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="bg-[#FAFAFA] p-8 md:p-10 rounded-3xl border border-black/5 relative mb-12 shadow-sm">
                                    <div className="absolute top-6 right-6">
                                        <button onClick={() => setShowCreateForm(false)} className="p-2 hover:bg-black/5 rounded-full transition-colors text-black/40">
                                            <X size={20} />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="space-y-6">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">Collection Name</label>
                                                <input
                                                    type="text"
                                                    value={newCollectionName}
                                                    onChange={(e) => setNewCollectionName(e.target.value)}
                                                    placeholder="e.g. Masterpieces"
                                                    className="w-full py-2 bg-transparent text-3xl font-serif text-[#3E2723] placeholder:text-black/10 focus:outline-none border-b border-black/10 focus:border-black/30 transition-all"
                                                    autoFocus
                                                />
                                            </div>

                                            <div className="space-y-3">
                                                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">Description (Optional)</label>
                                                <textarea
                                                    value={newCollectionDescription}
                                                    onChange={(e) => setNewCollectionDescription(e.target.value)}
                                                    placeholder="A short story about this collection..."
                                                    className="w-full h-20 py-2 bg-transparent text-base font-serif italic text-black/60 placeholder:text-black/20 focus:outline-none resize-none border-b border-black/10 focus:border-black/30 transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-col justify-between space-y-6">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">Visual Identity</label>
                                                <div className="flex gap-4">
                                                    {COLORS.map(color => (
                                                        <button
                                                            key={color}
                                                            onClick={() => setSelectedColor(color)}
                                                            className={`w-8 h-8 rounded-full transition-all duration-300 transform ${selectedColor === color ? 'scale-125 ring-[3px] ring-offset-2 ring-black/10 shadow-md' : 'hover:scale-110 opacity-70'}`}
                                                            style={{ backgroundColor: color }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex justify-end pt-4">
                                                <button
                                                    onClick={handleCreateCollection}
                                                    disabled={!newCollectionName.trim()}
                                                    className="px-8 py-3 bg-[#9CAF88] text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[#8A9C77] transition-all disabled:opacity-30"
                                                >
                                                    Register Shelf
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Grid: Modern Clean Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
                        {collections.map((collection, idx) => (
                            <motion.div
                                key={collection.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                onClick={() => onSelectCollection?.(collection.id)}
                                className="group relative cursor-pointer flex flex-col bg-white rounded-3xl border border-black/5 hover:border-black/10 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden"
                            >
                                {/* Preview Area */}
                                <div className="relative h-[220px] w-full bg-[#FAFAFA] flex items-center justify-center p-6 group-hover:bg-[#F3F0EB]/50 transition-colors">
                                    {(!collection.previewBooks || collection.previewBooks.length === 0) ? (
                                        <div className="opacity-20 flex flex-col items-center">
                                            <Layers size={40} className="text-[#3E2723]" />
                                            <span className="text-[10px] uppercase font-bold tracking-widest mt-3">Empty</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center -space-x-10 mt-6 relative">
                                            {collection.previewBooks.map((book: Book, i: number) => {
                                                const rotation = i === 0 ? -12 : i === 2 ? 12 : 0;
                                                const yOffset = i === 1 ? -16 : 0;
                                                const scale = i === 1 ? 1.05 : 0.9;
                                                const zIdx = i === 1 ? 20 : 10;

                                                return (
                                                    <div
                                                        key={book.id}
                                                        className="relative w-[100px] aspect-[2/3] rounded-md shadow-[0_8px_20px_rgba(0,0,0,0.15)] transition-all duration-500 ease-out border border-white/40 group-hover:-translate-y-3 origin-bottom bg-[#FAFAFA]"
                                                        style={{
                                                            zIndex: zIdx,
                                                            transform: `rotate(${rotation}deg) scale(${scale}) translateY(${yOffset}px)`
                                                        }}
                                                    >
                                                        {book.coverImage || book.coverUrl ? (
                                                            <img src={book.coverImage || book.coverUrl} className="w-full h-full object-cover rounded-md" alt="" />
                                                        ) : (
                                                            <div className="w-full h-full rounded flex items-center justify-center p-3 text-center" style={{ backgroundColor: book.color || '#C6A87C' }}>
                                                                <span className="text-[9px] text-white/80 font-serif leading-tight line-clamp-3">{book.title}</span>
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-md" />
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}

                                    {/* Action Chips */}
                                    <button
                                        onClick={(e) => handleDeleteCollection(collection.id, e)}
                                        className="absolute top-4 right-4 p-2.5 bg-white border border-black/5 hover:bg-red-500 hover:border-red-500 text-black/30 hover:text-white rounded-full transition-all opacity-0 group-hover:opacity-100 shadow-sm z-30"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>

                                {/* Info */}
                                <div className="p-6 flex flex-col items-start bg-white flex-1">
                                    <div className="flex items-center justify-between w-full mb-3">
                                        <h3 className="text-xl font-serif text-[#3E2723] pr-4 truncate">
                                            {collection.name}
                                        </h3>
                                        <div className="bg-[#FAFAFA] text-black/50 px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider border border-black/5 whitespace-nowrap">
                                            {collection.bookCount} Vol
                                        </div>
                                    </div>

                                    <p className="text-black/40 text-sm font-serif italic line-clamp-2 h-10 w-full mb-6">
                                        {collection.description || "Curated for specialized reading."}
                                    </p>

                                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#3E2723]/40 group-hover:text-[#3E2723] transition-colors mt-auto pt-4 border-t border-black/5 w-full">
                                        <span>Open Archive</span>
                                        <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </motion.div>
                        ))}

                        {/* Empty State */}
                        {collections.length === 0 && !showCreateForm && (
                            <div className="col-span-full py-24 flex flex-col items-center justify-center text-center bg-[#FAFAFA]/50 rounded-3xl border border-black/5 border-dashed">
                                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-6 shadow-sm border border-black/5">
                                    <Layers size={24} className="text-black/20" />
                                </div>
                                <h3 className="font-serif text-2xl text-[#3E2723] mb-2">Begin your Curatorial Journey</h3>
                                <p className="text-black/40 font-serif italic mb-8 max-w-sm text-sm">Your digital library is a blank canvas. Start organizing your knowledge into themed shelves.</p>
                                <button
                                    onClick={() => setShowCreateForm(true)}
                                    className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#3E2723] border-b border-[#3E2723]/20 pb-1 hover:border-[#3E2723] transition-colors"
                                >
                                    Build First Shelf
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        );
    }

    // === MODAL VIEW RENDER (For Book Detail) ===
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#3E2723]/30 backdrop-blur-md"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 20, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white w-full max-w-md overflow-hidden rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] border border-black/5"
            >
                {/* Modal Header: Clean & Modern */}
                <div className="px-8 pt-8 pb-6 flex justify-between items-start border-b border-black/5">
                    <div>
                        <h2 className="font-serif text-3xl text-[#3E2723] leading-none mb-2">Categorize</h2>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/30">Select shelves for your book</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                        <X size={20} className="text-black/40" />
                    </button>
                </div>

                {/* Modal Content: Clean List */}
                <div className="max-h-[50vh] overflow-y-auto p-4 sm:p-6 bg-[#FAFAFA]">
                    <div className="space-y-3">
                        {collections.map(collection => {
                            const isBookInCollection = selectedBook?.collectionIds?.includes(collection.id);
                            return (
                                <button
                                    key={collection.id}
                                    onClick={() => handleToggleBookInCollection(collection.id)}
                                    className={`w-full group flex items-center justify-between p-4 rounded-xl transition-all duration-300 border ${isBookInCollection
                                        ? 'bg-white border-[#3E2723]/20 shadow-[0_4px_12px_rgba(0,0,0,0.05)] ring-1 ring-[#3E2723]/5'
                                        : 'bg-white border-transparent hover:border-black/5 hover:shadow-sm'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div
                                            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${isBookInCollection ? 'bg-[#3E2723]/5 scale-105' : 'bg-[#FAFAFA] border border-black/5 group-hover:bg-[#F3F0EB]'
                                                }`}
                                        >
                                            <Layers size={18} className={isBookInCollection ? 'text-[#3E2723]' : 'text-black/30'} />
                                        </div>
                                        <div className="text-left">
                                            <div className={`font-serif text-lg leading-none transition-colors ${isBookInCollection ? 'text-[#3E2723]' : 'text-black/60 group-hover:text-black/80'}`}>
                                                {collection.name}
                                            </div>
                                            <div className="text-[9px] uppercase font-bold tracking-[0.1em] mt-1.5 text-black/30">
                                                {collection.bookCount || 0} Vol
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${isBookInCollection
                                        ? 'bg-[#3E2723] shadow-sm scale-110'
                                        : 'bg-[#FAFAFA] border border-black/10 group-hover:bg-black/5'
                                        }`}>
                                        {isBookInCollection && <Check size={12} className="text-white" strokeWidth={3} />}
                                    </div>
                                </button>
                            );
                        })}
                        {collections.length === 0 && (
                            <div className="py-12 flex flex-col items-center justify-center text-center">
                                <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center mb-4">
                                    <Layers size={20} className="text-black/20" />
                                </div>
                                <span className="text-black/40 font-serif italic">No shelves available.<br />Create one first.</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="p-6 bg-white border-t border-black/5">
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-[#9CAF88] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#8A9C77] transition-all rounded-full shadow-lg active:scale-[0.98]"
                    >
                        Save Categorization
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};
