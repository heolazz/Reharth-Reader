import { supabase } from './supabase';

// =============================================
// PUBLIC BOOKS API
// Functions untuk interact dengan global library
// =============================================

export interface PublicBook {
    id: string;
    title: string;
    author: string;
    description?: string;
    cover_url?: string;
    epub_url?: string;
    genre?: string[];
    category_type?: 'Fiction' | 'Non-Fiction';
    tags?: string[];
    language?: string;
    page_count?: number;
    published_year?: number;
    isbn?: string;
    publisher?: string;
    rating_average?: number;
    rating_count?: number;
    view_count?: number;
    download_count?: number;
    is_featured?: boolean;
    is_trending?: boolean;
    status?: 'draft' | 'published' | 'archived';
    created_at?: string;
    updated_at?: string;
    published_at?: string;

    // Series fields
    series_id?: string;
    volume_number?: number;
}

export interface PublicSeries {
    id: string;
    title: string;
    description?: string;
    author?: string;
    cover_url?: string;
    category_type?: 'Fiction' | 'Non-Fiction';
    created_at?: string;
}

export interface BookReview {
    id: string;
    book_id: string;
    user_id: string;
    rating: number;
    review_text?: string;
    is_spoiler?: boolean;
    helpful_count?: number;
    created_at?: string;
    updated_at?: string;
}

export interface FetchBooksOptions {
    genre?: string;
    search?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'rating' | 'trending' | 'recent' | 'popular';
    featured?: boolean;
    category_type?: 'Fiction' | 'Non-Fiction';
    series_id?: string;
    hideSeriesContinuations?: boolean; // If true, only fetches volume 1 or books without a series
}

/**
 * Fetch public books dari global library (PUBLISHED ONLY)
 */
export async function fetchPublicBooks(options: FetchBooksOptions = {}) {
    const {
        genre,
        search,
        limit = 20,
        offset = 0,
        sortBy = 'recent',
        featured,
        category_type,
        series_id,
        hideSeriesContinuations
    } = options;

    try {
        let query = supabase
            .from('public_books')
            .select('*')
            .eq('status', 'published');

        // Apply filters
        if (category_type) {
            query = query.eq('category_type', category_type);
        }
        
        if (series_id) {
            query = query.eq('series_id', series_id);
        }

        if (hideSeriesContinuations) {
            query = query.or('volume_number.is.null,volume_number.eq.1');
        }

        // Filter by genre or tags
        if (genre && genre !== 'All') {
            // Check if the parameter exists in genre OR tags
            // Supabase doesn't easily do OR across array columns with contains, 
            // so we'll use an OR condition with raw text search if needed, 
            // but for arrays, we can do:
            query = query.or(`genre.cs.{${genre}},tags.cs.{${genre}}`);
        }

        // Filter featured books
        if (featured) {
            query = query.eq('is_featured', true);
        }

        // Search by title or author
        if (search) {
            query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%`);
        }

        // Sorting
        switch (sortBy) {
            case 'rating':
                query = query.order('rating_average', { ascending: false });
                break;
            case 'trending':
                query = query.eq('is_trending', true).order('view_count', { ascending: false });
                break;
            case 'popular':
                query = query.order('download_count', { ascending: false });
                break;
            case 'recent':
            default:
                query = query.order('published_at', { ascending: false });
                query = query.order('created_at', { ascending: false }); // secondary sort
                break;
        }

        // Pagination
        query = query.range(offset, offset + limit - 1);

        const { data, error } = await query;

        if (error) throw error;

        return { data: data as PublicBook[], error: null };
    } catch (error) {
        console.error('Error fetching public books:', error);
        return { data: null, error };
    }
}

/**
 * Fetch ALL books for Admin (Includes Drafts)
 */
export async function fetchAdminBooks(search?: string, limit = 50, offset = 0) {
    try {
        let query = supabase
            .from('public_books')
            .select('*');

        // Search
        if (search) {
            query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%`);
        }

        // Default sort by updated_at descending
        query = query.order('updated_at', { ascending: false });

        query = query.range(offset, offset + limit - 1);

        const { data, error } = await query;

        if (error) throw error;

        return { data: data as PublicBook[], error: null };
    } catch (error) {
        console.error('Error fetching admin books:', error);
        return { data: null, error };
    }
}

/**
 * Fetch trending books
 */
export async function fetchTrendingBooks(limit = 10) {
    try {
        const { data, error } = await supabase
            .from('public_books')
            .select('*')
            .eq('status', 'published')
            .eq('is_trending', true)
            .order('view_count', { ascending: false })
            .limit(limit);

        if (error) throw error;

        return { data: data as PublicBook[], error: null };
    } catch (error) {
        console.error('Error fetching trending books:', error);
        return { data: null, error };
    }
}

/**
 * Fetch available tags (used as specific topics)
 */
export async function fetchAvailableTags() {
    try {
        const { data, error } = await supabase
            .from('public_books')
            .select('tags')
            .eq('status', 'published');

        if (error) throw error;

        // Extract unique tags
        const tagsSet = new Set<string>();
        data?.forEach(book => {
            book.tags?.forEach((t: string) => tagsSet.add(t));
        });

        return { data: Array.from(tagsSet).sort(), error: null };
    } catch (error) {
        console.error('Error fetching tags:', error);
        return { data: null, error };
    }
}

/**
 * Fetch available genres (used as main categories)
 */
export async function fetchAvailableGenres() {
    try {
        const { data, error } = await supabase
            .from('public_books')
            .select('genre')
            .eq('status', 'published');

        if (error) throw error;

        // Extract unique genres
        const genreSet = new Set<string>();
        data?.forEach(book => {
            book.genre?.forEach((g: string) => genreSet.add(g));
        });

        return { data: Array.from(genreSet).sort(), error: null };
    } catch (error) {
        console.error('Error fetching genres:', error);
        return { data: null, error };
    }
}

/**
 * Fetch single book by ID
 */
export async function fetchPublicBookById(bookId: string) {
    try {
        const { data, error } = await supabase
            .from('public_books')
            .select('*')
            .eq('id', bookId)
            .single();

        if (error) throw error;

        // Only increment view for published books? Or all?
        // Let's increment for now.
        await incrementBookViewCount(bookId);

        return { data: data as PublicBook, error: null };
    } catch (error) {
        console.error('Error fetching book:', error);
        return { data: null, error };
    }
}

/**
 * Fetch single book by slug (slugified title).
 * Used for deep-linking: /explore/the-great-gatsby
 */
export async function fetchPublicBookBySlug(slug: string) {
    try {
        // Fetch all published books and match by slugified title
        const { data, error } = await supabase
            .from('public_books')
            .select('*')
            .eq('status', 'published');

        if (error) throw error;

        const slugify = (text: string) =>
            text.toString().toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^\w\-]+/g, '')
                .replace(/\-\-+/g, '-')
                .replace(/^-+/, '')
                .replace(/-+$/, '');

        const match = (data as PublicBook[])?.find(b => slugify(b.title) === slug);

        if (match) {
            await incrementBookViewCount(match.id);
            return { data: match, error: null };
        }

        return { data: null, error: new Error('Book not found') };
    } catch (error) {
        console.error('Error fetching book by slug:', error);
        return { data: null, error };
    }
}

/**
 * Increment book view count
 */
async function incrementBookViewCount(bookId: string) {
    try {
        const { error } = await supabase.rpc('increment_view_count', {
            book_id: bookId
        });

        if (error) throw error;
    } catch (error) {
        console.error('Error incrementing view count:', error);
    }
}

import { v4 as uuidv4 } from 'uuid';

export async function addPublicBookToLibrary(publicBookId: string, userId: string) {
    try {
        // First, fetch the public book details
        const { data: publicBook, error: fetchError } = await fetchPublicBookById(publicBookId);

        if (fetchError || !publicBook) {
            throw new Error('Book not found');
        }

        // Check if already in library by checking title and author in 'books'
        const titleToSearch = publicBook.title || 'Unknown Title';
        const authorToSearch = publicBook.author || 'Unknown Author';

        const { data: existing } = await supabase
            .from('books')
            .select('id, is_archived')
            .eq('user_id', userId)
            .ilike('title', titleToSearch)
            .ilike('author', authorToSearch)
            .maybeSingle();

        if (existing) {
            // If the book was soft-deleted (archived), restore it instead of blocking
            if (existing.is_archived) {
                const { error: restoreError } = await supabase
                    .from('books')
                    .update({
                        is_archived: false,
                        file_url: publicBook.epub_url || '',
                        cover_url: publicBook.cover_url || '',
                        summary: publicBook.description || '',
                    })
                    .eq('id', existing.id);

                if (restoreError) {
                    throw new Error('Failed to restore book: ' + restoreError.message);
                }

                // Return the restored book data
                const { data: restoredData } = await supabase
                    .from('books')
                    .select('*')
                    .eq('id', existing.id)
                    .single();

                if (restoredData) {
                    const appBook = {
                        id: restoredData.id,
                        title: restoredData.title,
                        author: restoredData.author,
                        color: restoredData.color || '#8B7355',
                        icon: 'feather',
                        genre: restoredData.genre || [],
                        tags: restoredData.tags || [],
                        year: restoredData.year || new Date().getFullYear().toString(),
                        summary: restoredData.summary || '',
                        content: '',
                        fileType: restoredData.file_type || 'epub',
                        coverImage: restoredData.cover_url || '',
                        coverUrl: restoredData.cover_url || '',
                        fileUrl: restoredData.file_url || '',
                        progressPercent: restoredData.progress_percent || 0,
                        lastLocation: restoredData.last_location || '',
                        timeRead: restoredData.time_read_seconds || 0,
                        lastReadDate: restoredData.last_read_at ? new Date(restoredData.last_read_at).getTime() : Date.now(),
                        dateAdded: restoredData.created_at ? new Date(restoredData.created_at).getTime() : Date.now(),
                        isFavorite: restoredData.is_favorite || false,
                        isArchived: false,
                    };
                    return { data: appBook, error: null };
                }
            }

            return { data: null, error: new Error('Book already in library') };
        }

        const newId = uuidv4();
        // Add to user's library (using the main books table)
        const record: Record<string, any> = {
            id: newId,
            user_id: userId,
            title: publicBook.title,
            author: publicBook.author,
            color: '#8B7355',
            genre: publicBook.genre || [],
            tags: publicBook.tags || [],
            year: publicBook.published_year ? publicBook.published_year.toString() : new Date().getFullYear().toString(),
            summary: publicBook.description || '',
            file_type: publicBook.epub_url ? 'epub' : 'text',
            cover_url: publicBook.cover_url || '',
            file_url: publicBook.epub_url || '',
            progress_percent: 0,
            last_location: '',
            time_read_seconds: 0,
            last_read_at: new Date().toISOString(),
            is_favorite: false,
            is_archived: false
        };

        let data: any;
        let error: any;

        // Try insert full record
        const res = await supabase.from('books').insert(record).select().single();
        data = res.data;
        error = res.error;

        // Fallback for schema mismatches
        if (error) {
            console.warn('Full insert failed, trying minimal insert. Error:', error);
            // TRULY minimal record based on actual SQL table schema
            const minimalRecord: Record<string, any> = {
                id: newId,
                user_id: userId,
                title: publicBook.title || 'Unknown Title',
                author: publicBook.author || 'Unknown Author'
            };

            const minRes = await supabase.from('books').insert(minimalRecord).select().single();
            data = minRes.data;
            error = minRes.error;

            if (error) {
                console.error('Minimal insert also failed:', error);
                throw new Error(`DB Error: ${error.message || JSON.stringify(error)}`);
            }
        }

        // Increment download count (ignore error if fails)
        try {
            await supabase.rpc('increment_download_count', { book_id: publicBookId });
        } catch (e) {
            console.warn('Could not increment download count:', e);
        }

        // Map to App Book interface
        const appBook = {
            id: data.id,
            title: data.title,
            author: data.author,
            color: data.color || '#8B7355',
            icon: 'feather',
            genre: data.genre || [],
            tags: data.tags || [],
            year: data.year || new Date().getFullYear().toString(),
            summary: data.summary || '',
            content: '',
            fileType: data.file_type || 'epub',
            coverImage: data.cover_url || '',
            coverUrl: data.cover_url || '',
            fileUrl: data.file_url || '',
            progressPercent: data.progress_percent || 0,
            lastLocation: data.last_location || '',
            timeRead: data.time_read_seconds || 0,
            lastReadDate: data.last_read_at ? new Date(data.last_read_at).getTime() : Date.now(),
            dateAdded: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
            isFavorite: data.is_favorite || false,
            isArchived: data.is_archived || false,
        };

        return { data: appBook, error: null };
    } catch (error) {
        console.error('Error adding book to library:', error);
        return { data: null, error };
    }
}

/**
 * Fetch book reviews
 */
export async function fetchBookReviews(bookId: string, limit = 10, offset = 0) {
    try {
        const { data, error } = await supabase
            .from('book_reviews')
            .select(`
                *,
                user:user_id (
                    id,
                    email,
                    user_metadata
                )
            `)
            .eq('book_id', bookId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        return { data, error: null };
    } catch (error) {
        console.error('Error fetching reviews:', error);
        return { data: null, error };
    }
}

/**
 * Submit book review
 */
export async function submitBookReview(
    bookId: string,
    userId: string,
    rating: number,
    reviewText?: string,
    isSpoiler = false
) {
    try {
        const { data, error } = await supabase
            .from('book_reviews')
            .upsert({
                book_id: bookId,
                user_id: userId,
                rating,
                review_text: reviewText,
                is_spoiler: isSpoiler
            })
            .select()
            .single();

        if (error) throw error;

        return { data, error: null };
    } catch (error) {
        console.error('Error submitting review:', error);
        return { data: null, error };
    }
}

// =============================================
// PUBLIC SERIES API
// =============================================

export async function fetchPublicSeries() {
    try {
        const { data, error } = await supabase
            .from('public_series')
            .select('*')
            .order('title', { ascending: true });

        if (error) throw error;
        return { data: data as PublicSeries[], error: null };
    } catch (error) {
        console.error('Error fetching series:', error);
        return { data: null, error };
    }
}

export async function getPublicSeriesById(id: string) {
    try {
        const { data, error } = await supabase
            .from('public_series')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return { data: data as PublicSeries, error: null };
    } catch (error) {
        console.error('Error fetching series by id:', error);
        return { data: null, error };
    }
}

export async function createPublicSeries(series: Partial<PublicSeries>) {
    try {
        const { data, error } = await supabase
            .from('public_series')
            .insert([series])
            .select()
            .single();

        if (error) {
            console.error('Supabase create series error:', JSON.stringify(error, null, 2));
            return { data: null, error: new Error(error.message || error.details || 'Unknown database error') };
        }
        return { data: data as PublicSeries, error: null };
    } catch (error: any) {
        console.error('Error creating series:', JSON.stringify(error, null, 2));
        return { data: null, error: new Error(error?.message || 'Failed to create series') };
    }
}

export async function updatePublicSeries(id: string, updates: Partial<PublicSeries>) {
    try {
        const { data, error } = await supabase
            .from('public_series')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return { data: data as PublicSeries, error: null };
    } catch (error) {
        console.error('Error updating series:', error);
        return { data: null, error };
    }
}

export async function deletePublicSeries(id: string) {
    try {
        const { error } = await supabase
            .from('public_series')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error deleting series:', error);
        return { error };
    }
}
