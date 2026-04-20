import ePub from 'epubjs';
import { Book } from '../types';

export const parseEpub = async (file: File): Promise<Partial<Book>> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const epubData = e.target?.result as ArrayBuffer;
                const book = ePub(epubData);

                // Wait for book to be ready
                await book.ready;

                // Extract metadata
                const metadata = await book.loaded.metadata;

                // Extract Cover (Convert to Base64 for persistence)
                let coverImage = '';
                try {
                    const coverUrl = await book.coverUrl();
                    if (coverUrl) {
                        const response = await fetch(coverUrl);
                        const blob = await response.blob();
                        coverImage = await new Promise<string>((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result as string);
                            reader.onerror = reject;
                            reader.readAsDataURL(blob);
                        });
                    }
                } catch (err) {
                    console.warn('Could not load cover', err);
                }

                // Extract Summary from content if description is missing
                // First, clean up existing description if it has HTML tags
                let summary = metadata.description;
                if (summary) {
                    const temp = document.createElement('div');
                    temp.innerHTML = summary;
                    summary = temp.innerText || temp.textContent || "";
                }

                if (!summary || summary.trim().length === 0) {
                    try {
                        // Load spine to get chapters
                        // @ts-ignore - spine is available on loaded
                        const spine = book.spine;

                        // Try the first few items in the spine (skipping usually 0 which might be cover/titlepage)
                        // Iterate roughly through first 5 items to find text
                        // @ts-ignore
                        const spineItems = spine.spineItems || [];

                        for (let i = 0; i < Math.min(spineItems.length, 5); i++) {
                            const item = spineItems[i];
                            // Load the item's document
                            // @ts-ignore
                            const doc = await item.load(book.load.bind(book));

                            // Safe extract text
                            const text = doc?.body?.innerText || doc?.body?.textContent || "";

                            // Simple heuristic: if we found a decent chunk of text > 200 chars, use it.
                            if (text && text.length > 200) {
                                // Clean up the text a bit (remove excessive whitespace)
                                const foundText = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

                                // Take shorter snippet (300 chars)
                                summary = foundText.substring(0, 300) + (foundText.length > 300 ? "..." : "");
                                break; // Stop after finding the first good chunk
                            }
                        }
                    } catch (err) {
                        console.warn('Could not extract text for summary', err);
                    }
                } else if (summary.length > 350) {
                    // Limit the summary length if it came from metadata but is too long
                    summary = summary.substring(0, 350) + "...";
                }

                resolve({
                    title: metadata.title,
                    author: metadata.creator,
                    summary: summary,
                    year: metadata.pubdate ? new Date(metadata.pubdate).getFullYear().toString() : undefined,
                    epubData: epubData,
                    fileType: 'epub',
                    coverImage: coverImage || undefined
                });
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};
