import { supabase } from './supabase';

/**
 * Upload a book cover image to Supabase Storage
 * @param file - The image file to upload
 * @param userId - The user ID (for folder organization)
 * @param bookId - The book ID (for unique naming)
 * @returns The public URL of the uploaded cover
 */
export const uploadBookCover = async (
    file: File,
    userId: string,
    bookId: string
): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${bookId}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
        .from('book-covers')
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true, // Replace if exists
        });

    if (uploadError) {
        console.error('Error uploading cover:', uploadError);
        throw uploadError;
    }

    // Get public URL
    const { data } = supabase.storage
        .from('book-covers')
        .getPublicUrl(fileName);

    return data.publicUrl;
};

/**
 * Upload a book file (EPUB) to Supabase Storage
 * @param file - The EPUB file to upload
 * @param userId - The user ID (for folder organization)
 * @param bookId - The book ID (for unique naming)
 * @returns The URL of the uploaded file
 */
export const uploadBookFile = async (
    file: File,
    userId: string,
    bookId: string
): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${bookId}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
        .from('book-files')
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true,
        });

    if (uploadError) {
        console.error('Error uploading book file:', uploadError);
        throw uploadError;
    }

    // Get signed URL (private file) - valid for 1 year
    const { data, error } = await supabase.storage
        .from('book-files')
        .createSignedUrl(fileName, 31536000); // 1 year in seconds

    if (error) {
        console.error('Error creating signed URL:', error);
        throw error;
    }

    return data.signedUrl;
};

/**
 * Upload text content as a file to Supabase Storage
 * @param content - The text content to upload
 * @param userId - The user ID (for folder organization)
 * @param bookId - The book ID (for unique naming)
 * @returns The URL of the uploaded file
 */
export const uploadTextContent = async (
    content: string,
    userId: string,
    bookId: string
): Promise<string> => {
    const fileName = `${userId}/${bookId}.txt`;
    const blob = new Blob([content], { type: 'text/plain' });
    const file = new File([blob], fileName, { type: 'text/plain' });

    const { error: uploadError } = await supabase.storage
        .from('book-files')
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true,
        });

    if (uploadError) {
        console.error('Error uploading text content:', uploadError);
        throw uploadError;
    }

    // Get signed URL (private file) - valid for 1 year
    const { data, error } = await supabase.storage
        .from('book-files')
        .createSignedUrl(fileName, 31536000);

    if (error) {
        console.error('Error creating signed URL:', error);
        throw error;
    }

    return data.signedUrl;
};

/**
 * Delete a book cover from storage
 */
export const deleteBookCover = async (coverUrl: string): Promise<void> => {
    if (!coverUrl) return;

    try {
        // Extract file path from URL
        const url = new URL(coverUrl);
        const pathParts = url.pathname.split('/book-covers/');
        if (pathParts.length < 2) return;

        const filePath = pathParts[1];

        const { error } = await supabase.storage
            .from('book-covers')
            .remove([filePath]);

        if (error) {
            console.error('Error deleting cover:', error);
        }
    } catch (error) {
        console.error('Error parsing cover URL:', error);
    }
};

/**
 * Delete a book file from storage
 */
export const deleteBookFile = async (fileUrl: string): Promise<void> => {
    if (!fileUrl) return;

    try {
        const url = new URL(fileUrl);
        const pathParts = url.pathname.split('/book-files/');
        if (pathParts.length < 2) return;

        const filePath = pathParts[1];

        const { error } = await supabase.storage
            .from('book-files')
            .remove([filePath]);

        if (error) {
            console.error('Error deleting book file:', error);
        }
    } catch (error) {
        console.error('Error parsing file URL:', error);
    }
};

/**
 * Convert a base64 image to a File object
 */
export const base64ToFile = (base64: string, filename: string): File => {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
};

/**
 * Download a book file from Supabase Storage and convert to ArrayBuffer
 */
export const downloadBookFile = async (fileUrl: string): Promise<ArrayBuffer> => {
    const response = await fetch(fileUrl);
    if (!response.ok) {
        throw new Error('Failed to download book file');
    }
    return await response.arrayBuffer();
};

/**
 * Download text content from Supabase Storage
 */
export const downloadTextContent = async (fileUrl: string): Promise<string> => {
    const response = await fetch(fileUrl);
    if (!response.ok) {
        throw new Error('Failed to download text content');
    }
    return await response.text();
};
