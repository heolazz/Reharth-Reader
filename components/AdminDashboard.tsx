import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Library, Users, Search, Plus, Edit2, Trash2,
    MoreVertical, Check, X, Upload, FileText, Image as ImageIcon, Loader2,
    Calendar, Eye, TrendingUp, BookOpen, Shield, Mail
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fetchAdminBooks, PublicBook, PublicSeries, fetchPublicSeries, createPublicSeries, updatePublicSeries, deletePublicSeries } from '../lib/publicBooksApi';
import { useToast } from './Toast';

export const AdminDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'overview' | 'books' | 'series' | 'users'>('books');

    return (
        <div className="min-h-screen bg-white text-[#3D3028] font-sans pt-20 pb-24 px-6 md:px-12">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Sidebar */}
                    <div className="w-full md:w-64 shrink-0 space-y-2">
                        <div className="mb-8 pl-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Shield size={18} className="text-[#9CAF88]" />
                                <h1 className="font-serif text-2xl text-[#3D3028]">Admin</h1>
                            </div>
                            <p className="text-xs font-bold uppercase tracking-widest text-black/30 pl-0.5">System Manager</p>
                        </div>

                        <nav className="space-y-1">
                            <SidebarItem
                                icon={LayoutDashboard}
                                label="Overview"
                                active={activeTab === 'overview'}
                                onClick={() => setActiveTab('overview')}
                            />
                            <SidebarItem
                                icon={Library}
                                label="Global Library"
                                active={activeTab === 'books'}
                                onClick={() => setActiveTab('books')}
                            />
                            <SidebarItem
                                icon={BookOpen}
                                label="Series & Collections"
                                active={activeTab === 'series'}
                                onClick={() => setActiveTab('series')}
                            />
                            <SidebarItem
                                icon={Users}
                                label="Users"
                                active={activeTab === 'users'}
                                onClick={() => setActiveTab('users')}
                            />
                        </nav>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 bg-[#FAFAFA] rounded-2xl shadow-sm border border-black/5 p-6 md:p-8 min-h-[600px] overflow-hidden">
                        {activeTab === 'books' && <BooksManager />}
                        {activeTab === 'series' && <SeriesManager />}
                        {activeTab === 'overview' && <OverviewManager />}
                        {activeTab === 'users' && <UsersManager />}
                    </div>
                </div>
            </div>
        </div>
    );
};

const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active
            ? 'bg-[#3D3028] text-white shadow-md'
            : 'text-black/40 hover:bg-black/5 hover:text-[#3D3028]'
            }`}
    >
        <Icon size={18} />
        <span className="text-sm font-medium">{label}</span>
    </button>
);

// ------------------------------------------------------------------
// BOOKS MANAGER COMPONENT
// ------------------------------------------------------------------

const BooksManager = () => {
    const { showToast } = useToast();
    const [books, setBooks] = useState<PublicBook[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingBook, setEditingBook] = useState<PublicBook | null>(null);
    const [seriesList, setSeriesList] = useState<PublicSeries[]>([]);

    // Fetch Books
    const loadBooks = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await fetchAdminBooks(searchQuery, 50);
            if (error) throw error;
            if (data) setBooks(data);

            const { data: sData } = await fetchPublicSeries();
            if (sData) setSeriesList(sData);
        } catch (error) {
            console.error('Error loading books:', error);
            showToast('Failed to load books', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Debounce search
        const timeoutId = setTimeout(() => {
            loadBooks();
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this book? This action cannot be undone.')) return;

        try {
            const bookToDelete = books.find(b => b.id === id);

            // Try to delete associated storage files (best-effort, don't block on failure)
            if (bookToDelete) {
                // Helper to extract storage path from URL
                const extractStoragePath = (url: string, bucketNames: string[]): { bucket: string, path: string } | null => {
                    // Skip relative paths like /books/sample.epub (local files, not in Supabase storage)
                    if (!url || url.startsWith('/') || !url.startsWith('http')) return null;
                    try {
                        const parsed = new URL(url);
                        for (const bucket of bucketNames) {
                            const marker = `/${bucket}/`;
                            const idx = parsed.pathname.indexOf(marker);
                            if (idx !== -1) {
                                return { bucket, path: decodeURIComponent(parsed.pathname.substring(idx + marker.length)) };
                            }
                        }
                    } catch (e) {
                        // Invalid URL, skip
                    }
                    return null;
                };

                // Delete cover from storage
                if (bookToDelete.cover_url) {
                    const coverInfo = extractStoragePath(bookToDelete.cover_url, ['covers', 'book-covers']);
                    if (coverInfo) {
                        try {
                            await supabase.storage.from(coverInfo.bucket).remove([coverInfo.path]);
                        } catch (e) {
                            console.warn('Could not delete cover file:', e);
                        }
                    }
                }

                // Delete epub from storage
                if (bookToDelete.epub_url) {
                    const epubInfo = extractStoragePath(bookToDelete.epub_url, ['books', 'book-files']);
                    if (epubInfo) {
                        try {
                            await supabase.storage.from(epubInfo.bucket).remove([epubInfo.path]);
                        } catch (e) {
                            console.warn('Could not delete epub file:', e);
                        }
                    }
                }
            }

            // Delete from database
            const { data, error } = await supabase.from('public_books').delete().eq('id', id).select();

            if (error) {
                console.warn('Direct delete failed:', error.message);

                // Fallback: archive the book instead
                const { data: archiveData, error: archiveError } = await supabase
                    .from('public_books')
                    .update({ status: 'archived' })
                    .eq('id', id)
                    .select();

                if (archiveError) {
                    throw new Error(`Delete gagal: ${error.message}. Archive juga gagal: ${archiveError.message}. Pastikan RLS policy DELETE diaktifkan untuk admin di tabel public_books.`);
                }

                if (!archiveData || archiveData.length === 0) {
                    throw new Error('Gagal menghapus/archive. Pastikan kamu memiliki akses Admin dan RLS policy sudah benar di tabel public_books.');
                }

                showToast('Book archived (delete blocked by DB policy)', 'info');
            } else {
                if (!data || data.length === 0) {
                    throw new Error('Delete tidak berpengaruh. Kemungkinan RLS policy DELETE belum diaktifkan untuk tabel public_books.');
                }
                showToast('Book deleted successfully', 'success');
            }

            setBooks(books.filter(b => b.id !== id));
        } catch (error: any) {
            console.error('Error deleting book:', error);
            showToast(error?.message || 'Failed to delete book', 'error');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="relative w-full md:w-96 group">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[#3D3028]/40 group-focus-within:text-[#3D3028]">
                        <Search size={18} />
                    </div>
                    <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search system library..."
                        className="w-full bg-[#FAFAFA] border border-[#3D3028]/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-[#3D3028]/30 transition-all"
                    />
                </div>

                <button
                    onClick={() => { setEditingBook(null); setShowModal(true); }}
                    className="flex items-center gap-2 bg-[#3D3028] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#2C1810] transition-colors shadow-sm hover:shadow-md"
                >
                    <Plus size={18} />
                    Add New Book
                </button>
            </div>

            {/* Content Table */}
            {isLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 size={32} className="animate-spin text-[#3D3028]/20" />
                </div>
            ) : books.length > 0 ? (
                <div className="border border-[#3D3028]/10 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#FAFAFA] text-[#3D3028]/60 border-b border-[#3D3028]/10">
                            <tr>
                                <th className="px-6 py-4 font-medium">Book</th>
                                <th className="px-6 py-4 font-medium">Author</th>
                                <th className="px-6 py-4 font-medium">Genre</th>
                                <th className="px-6 py-4 font-medium text-center">Stats</th>
                                <th className="px-6 py-4 font-medium text-center">Status</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#3D3028]/5">
                            {books.map((book) => (
                                <tr key={book.id} className="hover:bg-[#FAFAFA]/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-14 bg-[#EAE5DD] rounded overflow-hidden shrink-0 border border-[#3D3028]/10">
                                                {book.cover_url && (
                                                    <img src={book.cover_url} className="w-full h-full object-cover" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium text-[#3D3028]">{book.title}</p>
                                                <p className="text-xs text-[#3D3028]/40 mt-0.5 max-w-[200px] truncate">{book.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-[#3D3028]/80">{book.author}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                                            {book.genre && book.genre.length > 0 ? (
                                                book.genre.map((g, idx) => (
                                                    <span key={idx} className="text-[10px] bg-[#3D3028]/5 px-1.5 py-0.5 rounded text-[#3D3028]/60 whitespace-nowrap">
                                                        {g}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-[10px] text-[#3D3028]/30">-</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="text-xs font-medium bg-[#3D3028]/5 px-2 py-0.5 rounded-full text-[#3D3028]/60">
                                                ★ {book.rating_average?.toFixed(1) || '0.0'}
                                            </span>
                                            <span className="text-[10px] text-[#3D3028]/40">
                                                {book.view_count || 0} views
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${book.status === 'published'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {book.status}
                                        </span>
                                        {book.is_trending && (
                                            <span className="ml-2 text-xs text-[#E86C46] font-bold" title="Trending">🔥</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => { setEditingBook(book); setShowModal(true); }}
                                                className="p-2 hover:bg-[#3D3028]/5 rounded-lg text-[#3D3028]/60 hover:text-[#3D3028] transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(book.id)}
                                                className="p-2 hover:bg-red-50 rounded-lg text-[#3D3028]/40 hover:text-red-600 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-20 border-2 border-dashed border-[#3D3028]/10 rounded-xl">
                    <p className="text-[#3D3028]/40 mb-4">No books found in system library</p>
                    <button
                        onClick={() => { setEditingBook(null); setShowModal(true); }}
                        className="text-[#3D3028] font-medium hover:underline"
                    >
                        Add your first book
                    </button>
                </div>
            )}

            {/* Book Modal */}
            <AnimatePresence>
                {showModal && (
                    <BookModal
                        book={editingBook}
                        seriesList={seriesList}
                        onClose={() => setShowModal(false)}
                        onSaved={() => {
                            setShowModal(false);
                            loadBooks();
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// ------------------------------------------------------------------
// BOOK MODAL COMPONENT (Add/Edit)
// ------------------------------------------------------------------

const BookModal = ({
    book,
    seriesList,
    onClose,
    onSaved
}: {
    book: PublicBook | null,
    seriesList: PublicSeries[],
    onClose: () => void,
    onSaved: () => void
}) => {
    const { showToast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [formData, setFormData] = useState<Partial<PublicBook>>({
        title: '', author: '', description: '',
        status: 'published', genre: [], category_type: 'Fiction',
        cover_url: '', epub_url: '',
        is_featured: false, is_trending: false
    });

    // File Upload Handlers with EPUB Metadata Extraction
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'epub') => {
        if (!event.target.files || event.target.files.length === 0) return;

        setIsUploading(true);
        try {
            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
            const bucket = type === 'cover' ? 'covers' : 'books';
            const filePath = `${fileName}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                console.error(`Supabase Storage Error (${bucket}):`, uploadError);
                throw new Error(uploadError.message || `Failed to upload to ${bucket} bucket. Make sure the bucket exists and is public.`);
            }

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath);

            // If EPUB file, extract metadata
            if (type === 'epub' && fileExt?.toLowerCase() === 'epub') {
                try {
                    showToast('Extracting book metadata...', 'info');

                    // Import ePub.js dynamically
                    const ePub = (await import('epubjs')).default;

                    // Create ArrayBuffer from file
                    const arrayBuffer = await file.arrayBuffer();

                    // Load EPUB
                    const book = ePub(arrayBuffer);
                    await book.ready;

                    // Extract metadata
                    const metadata = await book.loaded.metadata;
                    const coverBlobUrl = await book.coverUrl();

                    console.log('📚 EPUB Metadata extracted:', metadata);

                    let publicCoverUrl = '';
                    if (coverBlobUrl) {
                        try {
                            const response = await fetch(coverBlobUrl);
                            const blob = await response.blob();
                            const coverFile = new File([blob], `${fileName}-cover.jpg`, { type: blob.type || 'image/jpeg' });

                            const { error: coverUploadError } = await supabase.storage
                                .from('covers')
                                .upload(`${fileName}-cover.jpg`, coverFile, {
                                    cacheControl: '3600',
                                    upsert: false
                                });

                            if (!coverUploadError) {
                                const { data: { publicUrl: coverPublicUrl } } = supabase.storage
                                    .from('covers')
                                    .getPublicUrl(`${fileName}-cover.jpg`);
                                publicCoverUrl = coverPublicUrl;
                                showToast('Cover uploaded automatically', 'success');
                            }
                        } catch (e) {
                            console.error('Failed to upload extracted cover', e);
                        }
                    }

                    // Clean up description HTML tags
                    let cleanDescription = metadata.description || '';
                    if (cleanDescription) {
                        try {
                            const temp = document.createElement('div');
                            temp.innerHTML = cleanDescription;
                            cleanDescription = temp.innerText || temp.textContent || "";
                        } catch (e) {
                            // Fallback regex if DOM parsing fails
                            cleanDescription = cleanDescription.replace(/<[^>]*>?/gm, '');
                        }
                    }

                    // Auto-fill form with extracted data
                    // Parse year from metadata.date (e.g. "2024-01-15" or "2024")
                    // Note: ePub.js types don't expose 'date' but it exists at runtime
                    let extractedYear: number | undefined;
                    const metaDate = (metadata as any).date || (metadata as any).pubdate;
                    if (metaDate) {
                        const yearMatch = String(metaDate).match(/(\d{4})/);
                        if (yearMatch) {
                            extractedYear = parseInt(yearMatch[1]);
                        }
                    }

                    setFormData(prev => ({
                        ...prev,
                        epub_url: publicUrl,
                        title: metadata.title || prev.title || '',
                        author: metadata.creator || prev.author || '',
                        description: cleanDescription || prev.description || '',
                        publisher: metadata.publisher || prev.publisher || '',
                        language: metadata.language || prev.language || 'en',
                        isbn: metadata.identifier || prev.isbn || '',
                        published_year: extractedYear || prev.published_year,
                        // If cover exists in EPUB and no cover_url set yet
                        cover_url: (!prev.cover_url && publicCoverUrl) ? publicCoverUrl : prev.cover_url
                    }));

                    showToast('Metadata extracted successfully!', 'success');
                } catch (epubError) {
                    console.error('Failed to extract EPUB metadata:', epubError);
                    showToast('EPUB uploaded but metadata extraction failed', 'info');
                    // Still set the URL even if metadata extraction fails
                    setFormData(prev => ({
                        ...prev,
                        epub_url: publicUrl
                    }));
                }
            } else {
                // For cover images, just set the URL
                setFormData(prev => ({
                    ...prev,
                    [type === 'cover' ? 'cover_url' : 'epub_url']: publicUrl
                }));
                showToast(`${type === 'cover' ? 'Cover' : 'Book'} uploaded successfully`, 'success');
            }
        } catch (error: any) {
            console.error('Upload process failed:', error);
            showToast(error.message || 'Upload failed', 'error');
        } finally {
            setIsUploading(false);
        }
    };

    useEffect(() => {
        if (book) {
            setFormData(book);
        }
    }, [book]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const dataToSave = {
                ...formData,
                updated_at: new Date().toISOString(),
                // Set published_at if status is published and not already set
                published_at: formData.status === 'published'
                    ? (formData.published_at || new Date().toISOString())
                    : formData.published_at
            };

            let error;
            if (book?.id) {
                // Update
                const res = await supabase.from('public_books').update(dataToSave).eq('id', book.id);
                error = res.error;
            } else {
                // Create
                const res = await supabase.from('public_books').insert([dataToSave]);
                error = res.error;
            }

            if (error) throw error;

            showToast(book ? 'Book updated successfully' : 'Book added successfully', 'success');
            onSaved();
        } catch (error: any) {
            console.error('Error saving book:', error);
            showToast(error.message || 'Failed to save book', 'error');
        } finally {
            setIsSubmitting(false);
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
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative bg-[#FDFBF7] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col border border-black/5"
            >
                <div className="p-6 border-b border-[#3D3028]/10 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="font-serif text-2xl text-[#3D3028]">
                            {book ? 'Edit Book Details' : 'Add New Book'}
                        </h2>
                        <p className="text-xs text-[#3D3028]/50 mt-1">
                            {book ? 'Update information and settings' : 'Fill in the details for the new book'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2.5 bg-black/5 hover:bg-black/10 rounded-full transition-colors text-[#3D3028]">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
                    {/* SECTION 1: Essential Info */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-[#3D3028]/40 border-b border-[#3D3028]/10 pb-2">Essential Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-[#3D3028]/60 mb-2 ml-1">Title *</label>
                                <input
                                    required
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full bg-white border border-[#3D3028]/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#3D3028]/40 focus:ring-1 focus:ring-[#3D3028]/40 transition-all text-sm"
                                    placeholder="Enter book title"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-[#3D3028]/60 mb-2 ml-1">Author *</label>
                                <input
                                    required
                                    value={formData.author}
                                    onChange={e => setFormData({ ...formData, author: e.target.value })}
                                    className="w-full bg-white border border-[#3D3028]/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#3D3028]/40 focus:ring-1 focus:ring-[#3D3028]/40 transition-all text-sm"
                                    placeholder="Enter author name"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold uppercase tracking-widest text-[#3D3028]/60 mb-2 ml-1">Description / Synopsis</label>
                                <textarea
                                    rows={4}
                                    value={formData.description || ''}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-white border border-[#3D3028]/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#3D3028]/40 focus:ring-1 focus:ring-[#3D3028]/40 transition-all text-sm resize-none"
                                    placeholder="Enter book synopsis..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: Categorization */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-[#3D3028]/40 border-b border-[#3D3028]/10 pb-2">Categorization</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-[#3D3028]/60 mb-2 ml-1">Category Type</label>
                                <select
                                    value={formData.category_type || 'Fiction'}
                                    onChange={e => setFormData({ ...formData, category_type: e.target.value as any })}
                                    className="w-full bg-white border border-[#3D3028]/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#3D3028]/40 focus:ring-1 focus:ring-[#3D3028]/40 transition-all text-sm"
                                >
                                    <option value="Fiction">Fiction & Literature</option>
                                    <option value="Non-Fiction">Non-Fiction & Knowledge</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-[#3D3028]/60 mb-2 ml-1">Published Year</label>
                                <input
                                    type="number"
                                    value={formData.published_year || ''}
                                    onChange={e => setFormData({ ...formData, published_year: parseInt(e.target.value) || undefined })}
                                    className="w-full bg-white border border-[#3D3028]/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#3D3028]/40 focus:ring-1 focus:ring-[#3D3028]/40 transition-all text-sm"
                                    placeholder="e.g. 2024"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-[#3D3028]/60 mb-2 ml-1">Series / Collection</label>
                                <select
                                    value={formData.series_id || ''}
                                    onChange={e => setFormData({ ...formData, series_id: e.target.value || undefined })}
                                    className="w-full bg-white border border-[#3D3028]/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#3D3028]/40 focus:ring-1 focus:ring-[#3D3028]/40 transition-all text-sm"
                                >
                                    <option value="">-- No Series --</option>
                                    {seriesList.map(s => (
                                        <option key={s.id} value={s.id}>{s.title}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-[#3D3028]/60 mb-2 ml-1">Volume Number</label>
                                <input
                                    type="number"
                                    value={formData.volume_number || ''}
                                    onChange={e => setFormData({ ...formData, volume_number: parseInt(e.target.value) || undefined })}
                                    className="w-full bg-white border border-[#3D3028]/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#3D3028]/40 focus:ring-1 focus:ring-[#3D3028]/40 transition-all text-sm disabled:opacity-50 disabled:bg-[#FAFAFA]"
                                    placeholder="e.g. 1"
                                    disabled={!formData.series_id}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-[#3D3028]/60 mb-2 ml-1">Genres (Comma separated)</label>
                                <input
                                    type="text"
                                    value={formData.genre?.join(', ') || ''}
                                    onChange={e => {
                                        const genreArray = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                                        setFormData({ ...formData, genre: genreArray });
                                    }}
                                    className="w-full bg-white border border-[#3D3028]/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#3D3028]/40 focus:ring-1 focus:ring-[#3D3028]/40 transition-all text-sm"
                                    placeholder="Fantasy, Romance..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-[#3D3028]/60 mb-2 ml-1">Tags (Comma separated)</label>
                                <input
                                    type="text"
                                    value={formData.tags?.join(', ') || ''}
                                    onChange={e => {
                                        const tagsArray = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                                        setFormData({ ...formData, tags: tagsArray });
                                    }}
                                    className="w-full bg-white border border-[#3D3028]/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#3D3028]/40 focus:ring-1 focus:ring-[#3D3028]/40 transition-all text-sm"
                                    placeholder="magic, epic, dark..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: Media & Files */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-[#3D3028]/40 border-b border-[#3D3028]/10 pb-2">Media & Assets</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-5 rounded-2xl border border-[#3D3028]/10 flex flex-col gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-[#3D3028]/60 mb-2 ml-1">Cover Image URL</label>
                                    <div className="flex gap-2">
                                        <input
                                            value={formData.cover_url || ''}
                                            onChange={e => setFormData({ ...formData, cover_url: e.target.value })}
                                            className="flex-1 bg-[#FAFAFA] border border-[#3D3028]/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#3D3028]/40 focus:ring-1 focus:ring-[#3D3028]/40 transition-all text-sm"
                                            placeholder="https://..."
                                        />
                                        <label className={`flex items-center justify-center px-4 bg-[#3D3028]/5 hover:bg-[#3D3028]/10 rounded-xl cursor-pointer transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                            <Upload size={18} className="text-[#3D3028]/60" />
                                            <input type="file" onChange={e => handleFileUpload(e, 'cover')} accept="image/*" className="hidden" />
                                        </label>
                                    </div>
                                </div>
                                {formData.cover_url && (
                                    <div className="mt-2 h-32 w-24 bg-[#EAE5DD] rounded-lg overflow-hidden border border-[#3D3028]/10 mx-auto shadow-sm">
                                        <img src={formData.cover_url} className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>

                            <div className="bg-white p-5 rounded-2xl border border-[#3D3028]/10 flex flex-col gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-[#3D3028]/60 mb-2 ml-1">EPUB File URL</label>
                                    <div className="flex gap-2">
                                        <input
                                            value={formData.epub_url || ''}
                                            onChange={e => setFormData({ ...formData, epub_url: e.target.value })}
                                            className="flex-1 bg-[#FAFAFA] border border-[#3D3028]/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#3D3028]/40 focus:ring-1 focus:ring-[#3D3028]/40 transition-all text-sm"
                                            placeholder="https://..."
                                        />
                                        <label className={`flex items-center justify-center px-4 bg-[#3D3028]/5 hover:bg-[#3D3028]/10 rounded-xl cursor-pointer transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                            <Upload size={18} className="text-[#3D3028]/60" />
                                            <input type="file" onChange={e => handleFileUpload(e, 'epub')} accept=".epub" className="hidden" />
                                        </label>
                                    </div>
                                </div>
                                <div className="mt-2 bg-[#FAFAFA] p-3 rounded-xl border border-[#3D3028]/5">
                                    <p className="text-xs text-[#3D3028]/50 leading-relaxed">
                                        You can upload an EPUB file directly. The system will attempt to automatically extract the cover, title, author, and description from the file metadata.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 4: Settings */}
                    <div className="bg-[#3D3028]/5 p-5 rounded-2xl border border-[#3D3028]/10">
                        <div className="flex flex-wrap gap-6">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative flex items-center justify-center w-5 h-5">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_featured || false}
                                        onChange={e => setFormData({ ...formData, is_featured: e.target.checked })}
                                        className="peer appearance-none w-5 h-5 border-2 border-[#3D3028]/20 rounded transition-colors checked:bg-[#3D3028] checked:border-[#3D3028] cursor-pointer"
                                    />
                                    <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                <span className="text-sm font-medium text-[#3D3028]/70 group-hover:text-[#3D3028] transition-colors">Feature this book</span>
                            </label>
                            
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative flex items-center justify-center w-5 h-5">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_trending || false}
                                        onChange={e => setFormData({ ...formData, is_trending: e.target.checked })}
                                        className="peer appearance-none w-5 h-5 border-2 border-[#3D3028]/20 rounded transition-colors checked:bg-[#E86C46] checked:border-[#E86C46] cursor-pointer"
                                    />
                                    <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                <span className="text-sm font-medium text-[#3D3028]/70 group-hover:text-[#3D3028] transition-colors">Mark as Trending</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-6 border-t border-[#3D3028]/10 sticky bottom-0 bg-[#FDFBF7] pb-2 -mb-2 mt-4 z-10">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl text-sm font-bold tracking-wide text-[#3D3028]/60 hover:bg-[#3D3028]/5 transition-colors"
                        >
                            CANCEL
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-8 py-3 rounded-xl text-sm font-bold tracking-wide bg-[#3D3028] text-white hover:bg-[#2C1810] transition-colors shadow-md disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                            {book ? 'SAVE CHANGES' : 'CREATE BOOK'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};
// ------------------------------------------------------------------
// OVERVIEW MANAGER COMPONENT
// ------------------------------------------------------------------

const OverviewManager = () => {
    const [stats, setStats] = useState({
        totalBooks: 0,
        totalUsers: 0,
        totalLibraryBooks: 0,
        totalViews: 0,
        recentBooks: [] as PublicBook[]
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setIsLoading(true);
            try {
                // 1. Total Public Books
                const { count: booksCount } = await supabase
                    .from('public_books')
                    .select('*', { count: 'exact', head: true });

                // 2. Total Users (from profiles)
                const { count: usersCount } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true });

                // 3. Total User-saved Books
                const { count: libCount } = await supabase
                    .from('books')
                    .select('*', { count: 'exact', head: true });

                // 4. Sum of Views
                const { data: viewsData } = await supabase
                    .from('public_books')
                    .select('view_count');

                const totalViews = viewsData?.reduce((acc, curr) => acc + (curr.view_count || 0), 0) || 0;

                // 5. Recent Activity
                const { data: recent } = await supabase
                    .from('public_books')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(5);

                setStats({
                    totalBooks: booksCount || 0,
                    totalUsers: usersCount || 0,
                    totalLibraryBooks: libCount || 0,
                    totalViews,
                    recentBooks: (recent || []) as PublicBook[]
                });
            } catch (err) {
                console.error("Failed to load overview stats:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-[400px]">
                <Loader2 size={32} className="animate-spin text-[#3D3028]/20" />
            </div>
        );
    }

    return (
        <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Library} label="Global Library" value={stats.totalBooks} color="#3D3028" />
                <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="#6B8E6D" />
                <StatCard icon={FileText} label="Active Collections" value={stats.totalLibraryBooks} color="#8B7355" />
                <StatCard icon={ImageIcon} label="Total Reach" value={`${stats.totalViews.toLocaleString()}`} color="#E86C46" />
            </div>

            {/* Recent Books */}
            <div>
                <h3 className="font-serif text-lg mb-4 flex items-center gap-2">
                    <Plus size={18} className="text-[#3D3028]/40" />
                    Recently Added
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {stats.recentBooks.map((book) => (
                        <div key={book.id} className="bg-[#FAFAFA] border border-[#3D3028]/5 rounded-xl p-3 flex flex-col gap-3">
                            <div className="aspect-[2/3] bg-white rounded-lg overflow-hidden shadow-sm border border-[#3D3028]/5">
                                {book.cover_url ? (
                                    <img src={book.cover_url} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[#3D3028]/10"><ImageIcon size={24} /></div>
                                )}
                            </div>
                            <div>
                                <p className="text-xs font-bold truncate">{book.title}</p>
                                <p className="text-[10px] opacity-40 truncate">{book.author}</p>
                            </div>
                        </div>
                    ))}
                    {stats.recentBooks.length === 0 && (
                        <div className="col-span-full py-12 text-center text-sm opacity-30 border-2 border-dashed border-[#3D3028]/5 rounded-2xl">
                            No recent activity found
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ icon: Icon, label, value, color }: any) => (
    <div className="bg-white border border-black/5 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
            <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-black/30 mb-2">{label}</p>
                <p className="text-3xl font-serif text-[#3D3028]">{value}</p>
            </div>
            <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${color}10` }}>
                <Icon size={20} style={{ color }} />
            </div>
        </div>
    </div>
);

// ------------------------------------------------------------------
// USERS MANAGER COMPONENT
// ------------------------------------------------------------------

const UsersManager = () => {
    const { showToast } = useToast();
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            // Fetch from profiles table
            let query = supabase
                .from('profiles')
                .select('*')
                .order('updated_at', { ascending: false });

            if (searchQuery) {
                // Only filter by full_name to avoid errors if username column doesn't exist
                query = query.ilike('full_name', `%${searchQuery}%`);
            }

            const { data, error } = await query;
            if (error) {
                console.error('Profile query error:', error);
                // If the query fails (e.g. table doesn't exist), show helpful message
                if (error.message?.includes('does not exist') || error.code === '42P01') {
                    showToast('Profiles table not found. Make sure it exists in Supabase.', 'error');
                } else {
                    throw error;
                }
            }
            setUsers(data || []);
        } catch (error: any) {
            console.error('Error loading users:', error);
            showToast(`Failed to load users: ${error?.message || 'Unknown error'}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchUsers();
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const handleToggleRole = async (userId: string, currentRole: string) => {
        const newRole = currentRole === 'admin' ? 'user' : 'admin';
        if (!window.confirm(`Set user as ${newRole}?`)) return;

        try {
            // Call RPC function that updates BOTH profiles AND auth.users metadata
            const { error } = await supabase.rpc('set_user_role', {
                target_user_id: userId,
                new_role: newRole
            });

            if (error) throw error;

            // Update local state
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
            showToast(`User role updated to ${newRole}`, 'success');
            showToast("Role change will take full effect on user's next login.", "info");
        } catch (error: any) {
            console.error('Error updating user role:', error);
            showToast(`Failed to update role: ${error?.message || 'Unknown error'}`, 'error');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="relative w-full md:w-96 group">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-black/30 group-focus-within:text-[#3D3028]">
                        <Search size={18} />
                    </div>
                    <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search users by name..."
                        className="w-full bg-white border border-black/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-black/20 transition-all"
                    />
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-black/30">
                    {users.length} {users.length === 1 ? 'user' : 'users'} registered
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 size={32} className="animate-spin text-black/10" />
                </div>
            ) : users.length > 0 ? (
                <div className="border border-black/5 rounded-xl overflow-hidden overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[700px]">
                        <thead className="bg-white text-black/40 border-b border-black/5">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">User</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">Email / ID</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">Joined</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-center">Role</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5">
                            {users.map((profile) => (
                                <tr key={profile.id} className="hover:bg-[#FAFAFA] transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-[#FAFAFA] border border-black/5 flex items-center justify-center overflow-hidden shadow-sm">
                                                {profile.avatar_url ? (
                                                    <img src={profile.avatar_url} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-xs font-bold text-black/20">{(profile.full_name || profile.username || '?').charAt(0).toUpperCase()}</span>
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium text-[#3D3028]">{profile.full_name || profile.username || 'Anonymous'}</p>
                                                {profile.username && profile.full_name && (
                                                    <p className="text-[10px] text-black/30">@{profile.username}</p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-black/40">
                                            <Mail size={12} />
                                            <span className="text-xs truncate max-w-[180px]">{profile.email || profile.id?.substring(0, 12) + '...'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-black/40">
                                            <Calendar size={12} />
                                            <span className="text-xs">
                                                {profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${profile.role === 'admin'
                                            ? 'bg-[#9CAF88]/15 text-[#6B8E6D]'
                                            : 'bg-black/5 text-black/40'
                                            }`}>
                                            {profile.role === 'admin' && <Shield size={10} />}
                                            {profile.role || 'user'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleToggleRole(profile.id, profile.role || 'user')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${profile.role === 'admin'
                                                ? 'border border-red-200 text-red-500 hover:bg-red-50'
                                                : 'border border-[#9CAF88]/30 text-[#6B8E6D] hover:bg-[#9CAF88]/10'
                                                }`}
                                        >
                                            {profile.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-20 border-2 border-dashed border-black/5 rounded-xl">
                    <div className="w-16 h-16 rounded-full bg-[#FAFAFA] border border-black/5 flex items-center justify-center mx-auto mb-4">
                        <Users size={24} className="text-black/15" />
                    </div>
                    <p className="text-black/40 font-serif italic">No users found</p>
                    <p className="text-[10px] text-black/30 mt-2">Users will appear here after they register.</p>
                </div>
            )}
        </div>
    );
};

// ------------------------------------------------------------------
// SERIES MANAGER COMPONENT
// ------------------------------------------------------------------

const SeriesManager = () => {
    const { showToast } = useToast();
    const [seriesList, setSeriesList] = useState<PublicSeries[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSeries, setEditingSeries] = useState<PublicSeries | null>(null);

    const loadSeries = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await fetchPublicSeries();
            if (error) throw error;
            if (data) setSeriesList(data);
        } catch (error: any) {
            console.error('Error loading series:', error);
            showToast(error?.message || 'Failed to load series', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadSeries();
    }, []);

    const handleSaveSeries = async (seriesData: Partial<PublicSeries>) => {
        try {
            if (editingSeries?.id) {
                const { error } = await updatePublicSeries(editingSeries.id, seriesData);
                if (error) throw error;
                showToast('Series updated successfully', 'success');
            } else {
                const { error } = await createPublicSeries(seriesData);
                if (error) throw error;
                showToast('Series created successfully', 'success');
            }
            setShowModal(false);
            setEditingSeries(null);
            loadSeries();
        } catch (error: any) {
            console.error('Error saving series:', error);
            showToast(error?.message || 'Failed to save series', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this series? Books in this series will be unlinked.')) return;
        try {
            const { error } = await deletePublicSeries(id);
            if (error) throw error;
            showToast('Series deleted', 'success');
            loadSeries();
        } catch (error: any) {
            console.error('Error deleting series:', error);
            showToast(error?.message || 'Failed to delete series', 'error');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="font-serif text-2xl text-[#3D3028]">Series Management</h2>
                    <p className="text-sm text-black/40 mt-1">Manage epic collections and universes</p>
                </div>
                <button
                    onClick={() => { setEditingSeries(null); setShowModal(true); }}
                    className="bg-[#3D3028] text-white px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 hover:bg-[#3D3028]/90 transition-colors shadow-sm"
                >
                    <Plus size={16} />
                    New Series
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 size={32} className="animate-spin text-black/20" />
                </div>
            ) : seriesList.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {seriesList.map(series => (
                        <div key={series.id} className="bg-white p-5 rounded-2xl border border-black/5 shadow-sm flex flex-col">
                            <div className="flex gap-4">
                                <div className="w-16 h-24 shrink-0 bg-[#FAFAFA] rounded-md overflow-hidden border border-black/5 flex items-center justify-center">
                                    {series.cover_url ? (
                                        <img src={series.cover_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <BookOpen size={20} className="text-black/15" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-serif text-lg font-bold text-[#3D3028] line-clamp-2 leading-tight mb-1">{series.title}</h3>
                                    <p className="text-xs uppercase tracking-widest text-black/40 font-bold mb-2">{series.author || 'Unknown'}</p>
                                    <div className="inline-flex px-2 py-0.5 bg-black/5 rounded text-[10px] text-black/60 font-medium">
                                        {series.category_type || 'Unknown'}
                                    </div>
                                </div>
                            </div>
                            {series.description && (
                                <p className="text-xs text-black/40 mt-3 line-clamp-2">{series.description}</p>
                            )}
                            <div className="mt-4 pt-4 border-t border-black/5 flex justify-end gap-2">
                                <button
                                    onClick={() => { setEditingSeries(series); setShowModal(true); }}
                                    className="p-2 text-black/40 hover:text-[#3D3028] hover:bg-black/5 rounded-lg transition-colors"
                                    title="Edit"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(series.id)}
                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 border-2 border-dashed border-black/5 rounded-2xl">
                    <BookOpen size={32} className="mx-auto text-black/15 mb-3" />
                    <p className="text-black/40 font-serif italic mb-1">No series found</p>
                    <p className="text-xs text-black/30">Create your first collection to group related books.</p>
                </div>
            )}

            <AnimatePresence>
                {showModal && (
                    <SeriesModal
                        series={editingSeries}
                        onClose={() => { setShowModal(false); setEditingSeries(null); }}
                        onSave={handleSaveSeries}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// ------------------------------------------------------------------
// SERIES MODAL COMPONENT (Add/Edit)
// ------------------------------------------------------------------

const SeriesModal = ({
    series,
    onClose,
    onSave
}: {
    series: PublicSeries | null;
    onClose: () => void;
    onSave: (data: Partial<PublicSeries>) => void;
}) => {
    const [formData, setFormData] = useState<Partial<PublicSeries>>({
        title: series?.title || '',
        description: series?.description || '',
        author: series?.author || '',
        cover_url: series?.cover_url || '',
        category_type: series?.category_type || 'Fiction'
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async () => {
        if (!formData.title?.trim()) return;
        setIsSaving(true);
        await onSave(formData);
        setIsSaving(false);
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
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative w-full max-w-2xl bg-[#FDFBF7] rounded-2xl shadow-2xl overflow-hidden border border-black/5"
            >
                <div className="p-6 border-b border-[#3D3028]/10 flex justify-between items-center bg-white">
                    <div>
                        <h2 className="font-serif text-2xl text-[#3D3028]">
                            {series ? 'Edit Series Details' : 'Create New Series'}
                        </h2>
                        <p className="text-xs text-[#3D3028]/50 mt-1">
                            {series ? 'Update collection information' : 'Start a new epic collection'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2.5 bg-black/5 hover:bg-black/10 rounded-full transition-colors text-[#3D3028]">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 md:p-8 space-y-6 flex flex-col md:flex-row gap-8">
                    {/* Cover Preview Side */}
                    <div className="w-full md:w-48 shrink-0 flex flex-col gap-3">
                        <label className="block text-xs font-bold uppercase tracking-widest text-[#3D3028]/60 ml-1">Series Cover</label>
                        <div className="w-full aspect-[2/3] bg-white rounded-xl overflow-hidden border border-[#3D3028]/10 shadow-sm flex flex-col items-center justify-center relative">
                            {formData.cover_url ? (
                                <img src={formData.cover_url} className="w-full h-full object-cover" />
                            ) : (
                                <>
                                    <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E')] opacity-20 mix-blend-overlay"></div>
                                    <div className="text-[#3D3028]/20 flex flex-col items-center gap-2">
                                        <BookOpen size={32} />
                                        <span className="text-xs font-serif italic">No Cover</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    
                    {/* Form Fields Side */}
                    <div className="flex-1 space-y-5">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-[#3D3028]/60 mb-2 ml-1">Title *</label>
                            <input
                                type="text"
                                value={formData.title || ''}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="w-full bg-white border border-[#3D3028]/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3D3028]/40 focus:ring-1 focus:ring-[#3D3028]/40 transition-all"
                                placeholder="e.g. Lord of the Mysteries"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-[#3D3028]/60 mb-2 ml-1">Author</label>
                                <input
                                    type="text"
                                    value={formData.author || ''}
                                    onChange={e => setFormData({ ...formData, author: e.target.value })}
                                    className="w-full bg-white border border-[#3D3028]/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3D3028]/40 focus:ring-1 focus:ring-[#3D3028]/40 transition-all"
                                    placeholder="e.g. Cuttlefish That Loves Diving"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-[#3D3028]/60 mb-2 ml-1">Category Type</label>
                                <select
                                    value={formData.category_type || 'Fiction'}
                                    onChange={e => setFormData({ ...formData, category_type: e.target.value as any })}
                                    className="w-full bg-white border border-[#3D3028]/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3D3028]/40 focus:ring-1 focus:ring-[#3D3028]/40 transition-all"
                                >
                                    <option value="Fiction">Fiction</option>
                                    <option value="Non-Fiction">Non-Fiction</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-[#3D3028]/60 mb-2 ml-1">Cover URL</label>
                            <input
                                type="text"
                                value={formData.cover_url || ''}
                                onChange={e => setFormData({ ...formData, cover_url: e.target.value })}
                                className="w-full bg-white border border-[#3D3028]/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3D3028]/40 focus:ring-1 focus:ring-[#3D3028]/40 transition-all"
                                placeholder="https://..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-[#3D3028]/60 mb-2 ml-1">Description</label>
                            <textarea
                                value={formData.description || ''}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full bg-white border border-[#3D3028]/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3D3028]/40 focus:ring-1 focus:ring-[#3D3028]/40 transition-all h-28 resize-none"
                                placeholder="Brief description of the series..."
                            />
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-black/10 bg-white flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 text-sm font-bold tracking-wide text-[#3D3028]/60 hover:bg-[#3D3028]/5 rounded-xl transition-colors"
                    >
                        CANCEL
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSaving || !formData.title?.trim()}
                        className="px-8 py-3 text-sm font-bold tracking-wide text-white bg-[#3D3028] rounded-xl hover:bg-[#2C1810] transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isSaving && <Loader2 size={16} className="animate-spin" />}
                        {series ? 'SAVE CHANGES' : 'CREATE SERIES'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
