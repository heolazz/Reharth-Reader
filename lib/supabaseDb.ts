import { supabase } from './supabase';
import { Book, Highlight, Bookmark, ReadingGoal, Collection } from '../types';

// Convert Supabase book record to App Book type
const mapSupabaseBookToBook = (record: any): Book => {
    return {
        id: record.id,
        title: record.title,
        author: record.author || 'Unknown Author',
        color: record.color || '#8B7355', // Default book color
        icon: 'feather', // Default icon
        tags: record.tags || [], // Tags stored as JSON array
        year: record.year || new Date().getFullYear().toString(),
        summary: record.summary || '', // Summary from DB
        content: '', // Content not stored (EPUB files are in storage)
        fileType: record.file_type || 'epub', // File type from DB
        coverImage: record.cover_url || '',
        coverUrl: record.cover_url || '',
        fileUrl: record.file_url || '',
        progressPercent: record.progress_percent || 0,
        lastLocation: record.last_location || '',
        timeRead: record.time_read_seconds || 0,
        lastReadDate: record.last_read_at ? new Date(record.last_read_at).getTime() : Date.now(),
        dateAdded: record.created_at ? new Date(record.created_at).getTime() : Date.now(),
        isFavorite: record.is_favorite || false,
        isArchived: record.is_archived || false,
        collectionIds: record.collection_ids || [],
    };
};

// Convert App Book to Supabase record
const mapBookToSupabaseRecord = (book: Book, userId: string) => {
    return {
        id: book.id,
        user_id: userId,
        title: book.title,
        author: book.author,
        color: book.color,
        tags: book.tags || [],
        year: book.year,
        summary: book.summary,
        file_type: book.fileType,
        // Only store URL-based covers in Supabase (not base64 data which is huge)
        cover_url: (book.coverUrl || book.coverImage || '').startsWith('data:') ? '' : (book.coverUrl || book.coverImage || ''),
        // Only store server URLs (not undefined for locally-stored books)
        file_url: book.fileUrl || '',
        progress_percent: book.progressPercent || 0,
        last_location: book.lastLocation || '',
        time_read_seconds: book.timeRead || 0,
        last_read_at: book.lastReadDate ? new Date(book.lastReadDate).toISOString() : new Date().toISOString(),
        is_favorite: book.isFavorite || false,
        is_archived: book.isArchived || false,
        collection_ids: book.collectionIds || [],
    };
};

// Get all books for current user
export const getAllBooksFromSupabase = async (): Promise<Book[]> => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', user.id)
        .neq('is_archived', true)
        .not('title', 'like', '[DELETED]%')
        .order('last_read_at', { ascending: false });

    if (error) {
        console.error('Error fetching books:', error);
        throw error;
    }

    return (data || []).map(mapSupabaseBookToBook);
};

// Save or update a book
export const saveBookToSupabase = async (book: Book): Promise<void> => {
    console.log('💾 saveBookToSupabase called for:', book.title);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('User not authenticated');
    }

    console.log('👤 Saving book for user:', user.id);

    const record = mapBookToSupabaseRecord(book, user.id);
    console.log('📝 Mapped record:', record);

    const { error } = await supabase
        .from('books')
        .upsert(record, { onConflict: 'id' });

    if (error) {
        console.error('❌ Error saving book to Supabase:', error);
        throw error;
    }

    console.log('✅ Book saved to Supabase successfully!');
};

// Helper: extract storage path from a Supabase URL
const extractStoragePath = (url: string, bucket: string): string | null => {
    if (!url) return null;
    try {
        const urlObj = new URL(url);
        const marker = `/${bucket}/`;
        const idx = urlObj.pathname.indexOf(marker);
        if (idx === -1) return null;
        return decodeURIComponent(urlObj.pathname.substring(idx + marker.length));
    } catch {
        return null;
    }
};

// Delete a book and its associated storage files
export const deleteBookFromSupabase = async (bookId: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('User not authenticated');
    }

    // 1. Fetch the book record first so we know what storage files to clean up
    const { data: bookRecord } = await supabase
        .from('books')
        .select('cover_url, file_url')
        .eq('id', bookId)
        .eq('user_id', user.id)
        .maybeSingle();

    // 2. Delete storage files FIRST via the Storage API (required by Supabase)
    if (bookRecord) {
        // Delete cover image from storage
        if (bookRecord.cover_url) {
            const coverPath = extractStoragePath(bookRecord.cover_url, 'book-covers');
            if (coverPath) {
                try {
                    await supabase.storage.from('book-covers').remove([coverPath]);
                } catch (e) {
                    console.warn('Could not delete cover from storage:', e);
                }
            }
        }

        // Delete epub/text file from storage
        if (bookRecord.file_url) {
            const filePath = extractStoragePath(bookRecord.file_url, 'book-files');
            if (filePath) {
                try {
                    await supabase.storage.from('book-files').remove([filePath]);
                } catch (e) {
                    console.warn('Could not delete file from storage:', e);
                }
            }
        }
    }

    // 3. Delete dependent bookmarks and highlights (ignore errors)
    try {
        await supabase.from('bookmarks').delete().eq('book_id', bookId).eq('user_id', user.id);
    } catch (e) {
        console.warn('Could not delete bookmarks:', e);
    }
    try {
        await supabase.from('highlights').delete().eq('book_id', bookId).eq('user_id', user.id);
    } catch (e) {
        console.warn('Could not delete highlights:', e);
    }

    // 4. Delete the book record from database
    const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', bookId)
        .eq('user_id', user.id);

    if (error) {
        console.warn('Direct delete failed, trying soft delete:', error.message);

        // 5. Fallback: soft-delete by marking as archived and clearing storage URLs
        const { error: softDeleteError } = await supabase
            .from('books')
            .update({
                is_archived: true,
                cover_url: null,
                file_url: null,
            })
            .eq('id', bookId)
            .eq('user_id', user.id);

        if (softDeleteError) {
            console.error('Soft delete also failed:', softDeleteError);
            throw new Error('Could not delete book. Please try again later.');
        }

        console.log('Book soft-deleted successfully (marked as archived)');
    }
};

// Get user profile
export const getUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

    if (error) {
        console.error('Error fetching profile:', error);
        return null;
    }

    return data;
};

// Update user profile
// Update user profile
export const updateUserProfile = async (updates: Partial<{
    username: string;
    full_name: string;
    website: string;
    avatar_url: string;
}>) => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('User not authenticated');
    }

    const { error } = await supabase
        .from('profiles')
        .upsert({ ...updates, id: user.id, updated_at: new Date().toISOString() })
        .eq('id', user.id);

    if (error) {
        console.error('Error updating profile:', error);
        throw error;
    }

    // Also update Auth User Metadata
    if (updates.full_name || updates.avatar_url) {
        const { error: metaError } = await supabase.auth.updateUser({
            data: {
                full_name: updates.full_name,
                avatar_url: updates.avatar_url,
            }
        });
        if (metaError) console.warn("Failed to update auth metadata", metaError);
    }
};

// --- HIGHLIGHTS ---

const mapSupabaseHighlightToApp = (record: any): Highlight => ({
    id: record.id,
    bookId: record.book_id,
    cfiRange: record.cfi_range,
    color: record.color,
    text: record.text,
    chapterLabel: record.chapter_label,
    page: record.page,
    note: record.note,
    createdAt: new Date(record.created_at).getTime(),
});

const mapAppHighlightToSupabase = (highlight: Highlight, userId: string) => ({
    id: highlight.id,
    user_id: userId,
    book_id: highlight.bookId,
    cfi_range: highlight.cfiRange,
    color: highlight.color,
    text: highlight.text,
    chapter_label: highlight.chapterLabel,
    page: highlight.page,
    note: highlight.note,
    created_at: new Date(highlight.createdAt).toISOString(),
});

export const getHighlightsFromSupabase = async (bookId: string): Promise<Highlight[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('highlights')
        .select('*')
        .eq('book_id', bookId)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error fetching highlights:', error);
        throw error;
    }

    return (data || []).map(mapSupabaseHighlightToApp);
};

export const getAllHighlightsFromSupabase = async (): Promise<Highlight[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('highlights')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching all highlights:', error);
        throw error;
    }

    return (data || []).map(mapSupabaseHighlightToApp);
};

export const saveHighlightToSupabase = async (highlight: Highlight): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    console.log('💾 Saving highlight to Supabase:', highlight);

    const record = mapAppHighlightToSupabase(highlight, user.id);
    const { error } = await supabase.from('highlights').upsert(record);

    if (error) {
        console.error('Error saving highlight:', error);
        throw error;
    }
};

export const deleteHighlightFromSupabase = async (highlightId: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
        .from('highlights')
        .delete()
        .eq('id', highlightId)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error deleting highlight:', error);
        throw error;
    }
};

// --- BOOKMARKS ---

const mapSupabaseBookmarkToApp = (record: any): Bookmark => ({
    id: record.id,
    bookId: record.book_id,
    cfi: record.cfi,
    label: record.label,
    textPreview: record.text_preview,
    page: record.page,
    note: record.note,
    createdAt: new Date(record.created_at).getTime(),
});

const mapAppBookmarkToSupabase = (bookmark: Bookmark, userId: string) => ({
    id: bookmark.id,
    user_id: userId,
    book_id: bookmark.bookId,
    cfi: bookmark.cfi,
    label: bookmark.label,
    text_preview: bookmark.textPreview,
    page: bookmark.page,
    note: bookmark.note,
    created_at: new Date(bookmark.createdAt).toISOString(),
});

export const getBookmarksFromSupabase = async (bookId: string): Promise<Bookmark[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('book_id', bookId)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error fetching bookmarks:', error);
        throw error;
    }

    return (data || []).map(mapSupabaseBookmarkToApp);
};

export const saveBookmarkToSupabase = async (bookmark: Bookmark): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    console.log('💾 Saving bookmark to Supabase:', bookmark);

    const record = mapAppBookmarkToSupabase(bookmark, user.id);
    const { error } = await supabase.from('bookmarks').upsert(record);

    if (error) {
        console.error('Error saving bookmark:', error);
        throw error;
    }
};

export const deleteBookmarkFromSupabase = async (bookmarkId: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('id', bookmarkId)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error deleting bookmark:', error);
        throw error;
    }
};

// --- READING GOALS ---

export const getReadingGoalFromSupabase = async (): Promise<ReadingGoal | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('reading_goals')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

    if (error) {
        console.error('Error fetching reading goal:', error);
        return null;
    }

    if (!data) return null;

    return {
        dailyTargetMinutes: data.daily_target_minutes,
        dailyProgressSeconds: data.daily_progress_seconds,
        lastReadDate: data.last_read_date || new Date().toDateString(),
        currentStreak: data.current_streak,
        longestStreak: data.longest_streak,
        totalMinutesRead: data.total_minutes_read,
    };
};

export const saveReadingGoalToSupabase = async (goal: ReadingGoal): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const record = {
        user_id: user.id,
        daily_target_minutes: goal.dailyTargetMinutes,
        daily_progress_seconds: goal.dailyProgressSeconds,
        last_read_date: goal.lastReadDate,
        current_streak: goal.currentStreak,
        longest_streak: goal.longestStreak,
        total_minutes_read: goal.totalMinutesRead,
    };

    const { error } = await supabase
        .from('reading_goals')
        .upsert(record, { onConflict: 'user_id' });

    if (error) {
        console.error('Error saving reading goal:', error);
        throw error;
    }
};

// =============================================
// COLLECTIONS - Supabase Sync
// =============================================

export const getAllCollectionsFromSupabase = async (): Promise<Collection[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('user_collections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.warn('Could not load collections from Supabase:', error.message);
        return [];
    }

    return (data || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        description: r.description || undefined,
        color: r.color || '#3E2723',
        icon: r.icon || undefined,
        createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
    }));
};

export const saveCollectionToSupabase = async (collection: Collection): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const record = {
        id: collection.id,
        user_id: user.id,
        name: collection.name,
        description: collection.description || null,
        color: collection.color || '#3E2723',
        icon: collection.icon || null,
    };

    const { error } = await supabase
        .from('user_collections')
        .upsert(record, { onConflict: 'id' });

    if (error) {
        console.warn('Could not save collection to Supabase:', error.message);
    }
};

export const deleteCollectionFromSupabase = async (id: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
        .from('user_collections')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        console.warn('Could not delete collection from Supabase:', error.message);
    }
};

// Sync collection_ids for a specific book to Supabase
export const syncBookCollectionIds = async (bookId: string, collectionIds: string[]): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
        .from('books')
        .update({ collection_ids: collectionIds })
        .eq('id', bookId)
        .eq('user_id', user.id);

    if (error) {
        console.warn('Could not sync collection_ids:', error.message);
    }
};
