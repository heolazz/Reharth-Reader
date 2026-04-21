import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Library, Users, Search, Plus, Edit2, Trash2,
    MoreVertical, Check, X, Upload, FileText, Image as ImageIcon, Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fetchAdminBooks, PublicBook } from '../lib/publicBooksApi';
import { useToast } from './Toast';

export const AdminDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'overview' | 'books' | 'users'>('books');

    return (
        <div className="min-h-screen bg-[#F9F7F2] text-[#3D3028] font-sans pt-20 pb-24 px-6 md:px-12">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Sidebar */}
                    <div className="w-full md:w-64 shrink-0 space-y-2">
                        <div className="mb-8 pl-4">
                            <h1 className="font-serif text-2xl text-[#3D3028]">Admin Panel</h1>
                            <p className="text-sm text-[#3D3028]/60">Global Library Manager</p>
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
                                icon={Users}
                                label="Users"
                                active={activeTab === 'users'}
                                onClick={() => setActiveTab('users')}
                            />
                        </nav>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 bg-white rounded-2xl shadow-sm border border-[#3D3028]/5 p-6 md:p-8 min-h-[600px]">
                        {activeTab === 'books' && <BooksManager />}
                        {activeTab === 'overview' && (
                            <div className="flex items-center justify-center h-full text-[#3D3028]/40">
                                <div className="text-center">
                                    <LayoutDashboard size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>Dashboard Overview coming soon</p>
                                </div>
                            </div>
                        )}
                        {activeTab === 'users' && (
                            <div className="flex items-center justify-center h-full text-[#3D3028]/40">
                                <div className="text-center">
                                    <Users size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>User Management coming soon</p>
                                </div>
                            </div>
                        )}
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
            ? 'bg-[#3D3028] text-[#F9F7F2] shadow-md'
            : 'text-[#3D3028]/60 hover:bg-[#3D3028]/5 hover:text-[#3D3028]'
            }`}
    >
        <Icon size={20} />
        <span className="font-medium">{label}</span>
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

    // Fetch Books
    const loadBooks = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await fetchAdminBooks(searchQuery, 50);
            if (error) throw error;
            if (data) setBooks(data);
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

const BookModal = ({ book, onClose, onSaved }: { book: PublicBook | null, onClose: () => void, onSaved: () => void }) => {
    const { showToast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [formData, setFormData] = useState<Partial<PublicBook>>({
        title: '', author: '', description: '',
        status: 'published', genre: [],
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
                    setFormData(prev => ({
                        ...prev,
                        epub_url: publicUrl,
                        title: metadata.title || prev.title || '',
                        author: metadata.creator || prev.author || '',
                        description: cleanDescription || prev.description || '',
                        publisher: metadata.publisher || prev.publisher || '',
                        language: metadata.language || prev.language || 'en',
                        isbn: metadata.identifier || prev.isbn || '',
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col"
            >
                <div className="p-6 border-b border-[#3D3028]/10 flex justify-between items-center bg-[#FAFAFA] sticky top-0 z-10">
                    <h2 className="font-serif text-xl text-[#3D3028]">
                        {book ? 'Edit Book' : 'Add New Book'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-[#3D3028]/10 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Basic Info */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-[#3D3028]/40 mb-2">Title</label>
                                <input
                                    required
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full bg-[#FAFAFA] border border-[#3D3028]/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#3D3028]/30"
                                    placeholder="Enter book title"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-[#3D3028]/40 mb-2">Author</label>
                                <input
                                    required
                                    value={formData.author}
                                    onChange={e => setFormData({ ...formData, author: e.target.value })}
                                    className="w-full bg-[#FAFAFA] border border-[#3D3028]/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#3D3028]/30"
                                    placeholder="Enter author name"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-[#3D3028]/40 mb-2">Description</label>
                                <textarea
                                    rows={4}
                                    value={formData.description || ''}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-[#FAFAFA] border border-[#3D3028]/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#3D3028]/30 resize-none"
                                    placeholder="Enter book synopsis..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-[#3D3028]/40 mb-2">Year</label>
                                    <input
                                        type="number"
                                        value={formData.published_year || ''}
                                        onChange={e => setFormData({ ...formData, published_year: parseInt(e.target.value) || undefined })}
                                        className="w-full bg-[#FAFAFA] border border-[#3D3028]/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#3D3028]/30"
                                        placeholder="e.g. 2024"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-[#3D3028]/40 mb-2">Tags</label>
                                    <input
                                        type="text"
                                        value={formData.tags?.join(', ') || ''}
                                        onChange={e => {
                                            // Split by comma, trim whitespace, and clean empty strings
                                            const tagsArray = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                                            setFormData({ ...formData, tags: tagsArray });
                                        }}
                                        className="w-full bg-[#FAFAFA] border border-[#3D3028]/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#3D3028]/30"
                                        placeholder="fantasy, magic, epic..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* URLs & Settings */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-[#3D3028]/40 mb-2">Cover Image</label>
                                <div className="flex gap-2">
                                    <input
                                        value={formData.cover_url || ''}
                                        onChange={e => setFormData({ ...formData, cover_url: e.target.value })}
                                        className="flex-1 bg-[#FAFAFA] border border-[#3D3028]/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#3D3028]/30"
                                        placeholder="https://..."
                                    />
                                    <label className={`flex items-center justify-center px-4 bg-[#3D3028]/5 hover:bg-[#3D3028]/10 rounded-xl cursor-pointer transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <Upload size={18} className="text-[#3D3028]/60" />
                                        <input type="file" onChange={e => handleFileUpload(e, 'cover')} accept="image/*" className="hidden" />
                                    </label>
                                </div>
                                {formData.cover_url && (
                                    <div className="mt-2 h-24 w-16 bg-[#EAE5DD] rounded overflow-hidden border border-[#3D3028]/10">
                                        <img src={formData.cover_url} className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-[#3D3028]/40 mb-2">EPUB File</label>
                                <div className="flex gap-2">
                                    <input
                                        value={formData.epub_url || ''}
                                        onChange={e => setFormData({ ...formData, epub_url: e.target.value })}
                                        className="flex-1 bg-[#FAFAFA] border border-[#3D3028]/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#3D3028]/30"
                                        placeholder="https://..."
                                    />
                                    <label className={`flex items-center justify-center px-4 bg-[#3D3028]/5 hover:bg-[#3D3028]/10 rounded-xl cursor-pointer transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <Upload size={18} className="text-[#3D3028]/60" />
                                        <input type="file" onChange={e => handleFileUpload(e, 'epub')} accept=".epub" className="hidden" />
                                    </label>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-[#3D3028]/5 space-y-3">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_featured || false}
                                        onChange={e => setFormData({ ...formData, is_featured: e.target.checked })}
                                        className="w-4 h-4 rounded border-[#3D3028]/20 text-[#3D3028] focus:ring-[#3D3028]"
                                    />
                                    <span className="text-sm">Feature this book</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_trending || false}
                                        onChange={e => setFormData({ ...formData, is_trending: e.target.checked })}
                                        className="w-4 h-4 rounded border-[#3D3028]/20 text-[#3D3028] focus:ring-[#3D3028]"
                                    />
                                    <span className="text-sm">Mark as Trending</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-[#3D3028]/10">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl text-sm font-medium text-[#3D3028]/60 hover:bg-[#3D3028]/5 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2.5 rounded-xl text-sm font-medium bg-[#3D3028] text-white hover:bg-[#2C1810] transition-colors shadow-md disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                            {book ? 'Save Changes' : 'Draft Book'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};
