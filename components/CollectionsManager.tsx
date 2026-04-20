import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Check, ArrowRight, Layers } from 'lucide-react';
import { Collection, Book } from '../types';
import { generateUUID } from '../utils/uuid';
import { getAllCollections, saveCollection, deleteCollection } from '../utils/db';

interface CollectionsManagerProps {
    isOpen: boolean;
    onClose: () => void;
    books: Book[];
    onUpdateBook: (book: Book) => void;
    selectedBook?: Book | null;
    onSelectCollection?: (id: string) => void;
}

export const CollectionsManager: React.FC<CollectionsManagerProps> = ({
    isOpen,
    onClose,
    books,
    onUpdateBook,
    selectedBook,
    onSelectCollection
}) => {
    const [collections, setCollections] = useState<(Collection & { bookCount: number, previewBooks: Book[] })[]>([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');
    const [newCollectionDescription, setNewCollectionDescription] = useState('');
    const [selectedColor, setSelectedColor] = useState('#3E2723');

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
            const cols = await getAllCollections();
            const withCounts = cols.map(col => ({
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

        await saveCollection(newCollection);
        loadCollections();
        setNewCollectionName('');
        setNewCollectionDescription('');
        setShowCreateForm(false);
    };

    const handleDeleteCollection = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Delete this collection? Books will not be deleted.')) return;

        await deleteCollection(id);
        setCollections(prev => prev.filter(c => c.id !== id));

        books.forEach(book => {
            if (book.collectionIds?.includes(id)) {
                const updated = {
                    ...book,
                    collectionIds: book.collectionIds ? book.collectionIds.filter(cid => cid !== id) : []
                };
                onUpdateBook(updated);
            }
        });
    };

    const handleToggleBookInCollection = async (collectionId: string) => {
        if (!selectedBook) return;

        const currentCollections = selectedBook.collectionIds || [];
        const isInCollection = currentCollections.includes(collectionId);

        const updatedBook: Book = {
            ...selectedBook,
            collectionIds: isInCollection
                ? currentCollections.filter(id => id !== collectionId)
                : [...currentCollections, collectionId]
        };

        onUpdateBook(updatedBook);
        setTimeout(loadCollections, 100);
    };

    if (!isOpen) return null;

    // === PAGE VIEW RENDER (Main Collections Tab) ===
    if (!isModal) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 bg-[#FAFAFA] pt-24 pb-24 md:pb-12 px-6 overflow-y-auto selection:bg-[#C6A87C]/30"
            >
                <div className="max-w-7xl mx-auto space-y-16">
                    {/* Header: More Premium Typography */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
                        <div className="animate-in fade-in slide-in-from-left duration-700">
                            <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#3E2723]/30 mb-3 block">Digital Archive</span>
                            <h1 className="text-6xl md:text-8xl font-serif text-[#3E2723] font-light leading-tight tracking-tight">Your Collections</h1>
                            <div className="flex items-center gap-4 mt-4">
                                <div className="h-[1px] w-12 bg-[#3E2723]/20" />
                                <p className="text-[#3E2723]/50 text-xl font-serif italic font-light">Curated shelves for your personal library.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="group relative flex items-center gap-4 bg-[#3E2723] text-[#F3F0EB] pl-8 pr-6 py-5 rounded-full overflow-hidden transition-all shadow-[0_10px_40px_-10px_rgba(62,39,35,0.4)] hover:shadow-[0_20px_60px_-10px_rgba(62,39,35,0.5)] active:scale-95 self-start md:self-auto"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            <span className="font-bold text-sm uppercase tracking-widest leading-none">Create Shelf</span>
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-[#C6A87C] transition-colors">
                                <Plus size={20} className="transition-transform group-hover:rotate-90 text-white" />
                            </div>
                        </button>
                    </div>

                    {/* Create Form: Glassmorphic Floating Modal/Panel */}
                    <AnimatePresence>
                        {showCreateForm && (
                            <motion.div
                                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 20, scale: 0.98 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="relative z-20"
                            >
                                <div className="bg-white/70 backdrop-blur-xl p-10 rounded-3xl border border-[#3E2723]/5 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.12)] max-w-3xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4">
                                        <button onClick={() => setShowCreateForm(false)} className="p-2 hover:bg-black/5 rounded-full transition-colors text-[#3E2723]/40">
                                            <X size={20} />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                                        <div className="md:col-span-12 space-y-8">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#3E2723]/30">Collection Name</label>
                                                <input
                                                    type="text"
                                                    value={newCollectionName}
                                                    onChange={(e) => setNewCollectionName(e.target.value)}
                                                    placeholder="e.g. Masterpieces"
                                                    className="w-full py-4 bg-transparent text-4xl font-serif text-[#3E2723] placeholder:text-[#3E2723]/10 focus:outline-none border-b border-[#3E2723]/5 focus:border-[#C6A87C] transition-all"
                                                    autoFocus
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#3E2723]/30">Description (Optional)</label>
                                                    <textarea
                                                        value={newCollectionDescription}
                                                        onChange={(e) => setNewCollectionDescription(e.target.value)}
                                                        placeholder="A short story about this collection..."
                                                        className="w-full h-24 py-3 bg-transparent text-lg font-serif italic text-[#3E2723]/70 placeholder:text-[#3E2723]/10 focus:outline-none resize-none border-b border-[#3E2723]/5 focus:border-[#C6A87C] transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-4">
                                                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#3E2723]/30">Visual Identity</label>
                                                    <div className="flex gap-4 pt-2">
                                                        {COLORS.map(color => (
                                                            <button
                                                                key={color}
                                                                onClick={() => setSelectedColor(color)}
                                                                className={`w-10 h-10 rounded-full transition-all duration-300 transform ${selectedColor === color ? 'scale-125 ring-4 ring-[#C6A87C]/20 shadow-lg' : 'hover:scale-110'}`}
                                                                style={{ backgroundColor: color }}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex justify-end pt-6">
                                                <button
                                                    onClick={handleCreateCollection}
                                                    disabled={!newCollectionName.trim()}
                                                    className="px-12 py-4 bg-[#3E2723] text-white rounded-2xl text-xs font-bold uppercase tracking-[0.2em] hover:bg-black transition-all disabled:opacity-30 shadow-xl"
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

                    {/* Grid: Modern Staggered Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-20 pb-20">
                        {collections.map((collection, idx) => (
                            <motion.div
                                key={collection.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                whileHover={{ y: -12 }}
                                onClick={() => onSelectCollection?.(collection.id)}
                                className="group relative cursor-pointer"
                            >
                                {/* Digital Shelf Visualization */}
                                <div className="relative aspect-[16/10] mb-8 bg-[#F3F0EB] rounded-[2.5rem] shadow-[0_10px_30px_rgba(0,0,0,0.03)] overflow-hidden transition-all group-hover:shadow-[0_40px_80px_rgba(62,39,35,0.12)] border border-[#3E2723]/5 flex flex-col justify-end">
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#3E2723]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                    {/* Preview Books: Realistic 3D Stack */}
                                    <div className="flex items-end justify-center px-10 relative bottom-0 translate-y-2 transition-transform duration-500 group-hover:-translate-y-4">
                                        {(!collection.previewBooks || collection.previewBooks.length === 0) ? (
                                            <div className="w-full h-full absolute inset-0 flex items-center justify-center opacity-[0.03]">
                                                <Layers size={140} className="text-[#3E2723]" />
                                            </div>
                                        ) : (
                                            <div className="flex items-end justify-center -space-x-8 pb-2">
                                                {collection.previewBooks.map((book: Book, i: number) => (
                                                    <div
                                                        key={book.id}
                                                        className="relative w-24 md:w-28 aspect-[2/3] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
                                                        style={{
                                                            zIndex: i,
                                                            transform: `
                                                                perspective(1000px) 
                                                                rotateY(${i === 0 ? '-15deg' : i === 2 ? '15deg' : '0deg'}) 
                                                                translateX(${i === 0 ? '-15px' : i === 2 ? '15px' : '0px'})
                                                                scale(${i === 1 ? '1.1' : '1'})
                                                            `
                                                        }}
                                                    >
                                                        {/* High-end shading */}
                                                        <div className="absolute inset-x-0 bottom-0 h-4 bg-black/40 blur-lg rounded-full -mb-2 scale-x-90" />
                                                        <div className="relative w-full h-full rounded-sm overflow-hidden shadow-2xl border border-white/10">
                                                            <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/10 mix-blend-overlay z-10" />
                                                            {book.coverImage || book.coverUrl ? (
                                                                <img src={book.coverImage || book.coverUrl} className="w-full h-full object-cover" alt="" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center p-4 text-center" style={{ backgroundColor: book.color || '#C6A87C' }}>
                                                                    <span className="text-[10px] text-white/50 font-serif leading-tight opacity-0 group-hover:opacity-100 transition-opacity">{book.title}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Chips */}
                                    <div className="absolute top-6 right-6 flex gap-2">
                                        <button
                                            onClick={(e) => handleDeleteCollection(collection.id, e)}
                                            className="p-3 bg-white/80 backdrop-blur-md hover:bg-[#E86C46] rounded-full text-[#3E2723] hover:text-white transition-all shadow-sm opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 duration-300"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                        <div className="bg-[#3E2723]/80 backdrop-blur-md text-white px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-2">
                                            {collection.bookCount} <span className="opacity-60">Vol</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Info: Refined Spacing */}
                                <div className="space-y-3 px-2">
                                    <h3 className="text-3xl font-serif text-[#3E2723] group-hover:text-[#C6A87C] transition-colors decoration-[#C6A87C]/0 group-hover:decoration-[#C6A87C]/30 underline underline-offset-8 duration-500">
                                        {collection.name}
                                    </h3>
                                    <p className="text-[#3E2723]/50 text-base font-serif italic leading-relaxed line-clamp-2 h-12">
                                        {collection.description || "Collection meticulously curated for specialized research and reading."}
                                    </p>
                                    <div className="pt-2">
                                        <div className="group/link flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#C6A87C] hover:text-[#3E2723] transition-colors">
                                            <span>Open Archive</span>
                                            <ArrowRight size={12} className="group-hover/link:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}

                        {/* Special Empty State Card */}
                        {collections.length === 0 && !showCreateForm && (
                            <div className="col-span-full py-40 flex flex-col items-center justify-center text-center">
                                <motion.div
                                    animate={{ y: [0, -10, 0] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                                    className="w-24 h-24 rounded-full bg-[#F3F0EB] flex items-center justify-center mb-8"
                                >
                                    <Layers size={40} className="text-[#3E2723]/20" />
                                </motion.div>
                                <h3 className="font-serif text-3xl text-[#3E2723] mb-3">Begin your Curator Journey</h3>
                                <p className="text-[#3E2723]/40 max-w-sm font-serif italic text-lg leading-relaxed">Your digital library is a blank canvas. Start organizing your knowledge into themed collections.</p>
                                <button
                                    onClick={() => setShowCreateForm(true)}
                                    className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-[#333] border-b border-[#333]/20 pb-2 hover:border-[#C6A87C] transition-colors"
                                >
                                    Build Second Shelf
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
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#3E2723]/40 backdrop-blur-xl"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white w-full max-w-md overflow-hidden rounded-[2rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] border border-white/20"
            >
                {/* Modal Header: Clean & Modern */}
                <div className="px-8 pt-8 pb-6 flex justify-between items-start">
                    <div>
                        <h2 className="font-serif text-3xl text-[#3E2723]">Categorize</h2>
                        <p className="text-xs font-bold uppercase tracking-widest text-[#3E2723]/40 mt-1">Select collections</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-[#F3F0EB] rounded-full transition-colors">
                        <X size={20} className="text-[#3E2723]/40" />
                    </button>
                </div>

                {/* Modal Content: Clean List */}
                <div className="max-h-[50vh] overflow-y-auto px-4 pb-4">
                    <div className="space-y-2">
                        {collections.map(collection => {
                            const isBookInCollection = selectedBook?.collectionIds?.includes(collection.id);
                            return (
                                <button
                                    key={collection.id}
                                    onClick={() => handleToggleBookInCollection(collection.id)}
                                    className={`w-full group flex items-center justify-between p-4 rounded-2xl transition-all duration-300 ${isBookInCollection ? 'bg-[#3E2723] text-white shadow-lg' : 'hover:bg-[#F3F0EB] text-[#3E2723]'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isBookInCollection ? 'bg-white/10' : 'bg-[#FAFAFA] border border-[#3E2723]/5'
                                            }`}>
                                            <Layers size={18} className={isBookInCollection ? 'text-white' : 'text-[#C6A87C]'} />
                                        </div>
                                        <div className="text-left">
                                            <div className="font-serif text-lg leading-none">{collection.name}</div>
                                            <div className={`text-[10px] uppercase font-bold tracking-widest mt-1 opacity-50`}>{collection.bookCount || 0} Vols</div>
                                        </div>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${isBookInCollection ? 'bg-white' : 'border border-[#3E2723]/20 group-hover:border-[#C6A87C]'
                                        }`}>
                                        {isBookInCollection && <Check size={14} className="text-[#3E2723]" />}
                                    </div>
                                </button>
                            );
                        })}
                        {collections.length === 0 && (
                            <div className="py-12 text-center text-[#3E2723]/30 font-serif italic">
                                No collection found in archive.
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="p-6 bg-[#FAFAFA] border-t border-[#3E2723]/5">
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-[#3E2723] text-white text-xs font-bold uppercase tracking-[0.2em] hover:bg-black transition-all rounded-2xl shadow-lg active:scale-[0.98]"
                    >
                        Save Organization
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};
