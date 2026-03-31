import type { BookMetadata } from "@/types";

export async function fetchMetadataByISBN(isbn: string): Promise<BookMetadata | null> {
  try {
    const res = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
    );
    const data = await res.json();
    const book = data[`ISBN:${isbn}`];
    if (!book) return null;
    return {
      title:      book.title,
      author:     book.authors?.[0]?.name,
      publisher:  book.publishers?.[0]?.name,
      year:       book.publish_date ? parseInt(book.publish_date) : undefined,
      isbn,
      cover:      book.cover?.medium ?? book.cover?.large,
      description: book.excerpts?.[0]?.text,
    };
  } catch { return null; }
}

export async function searchBookMetadata(query: string): Promise<BookMetadata[]> {
  try {
    const [olRes, gbRes] = await Promise.allSettled([
      fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5`),
      fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5`),
    ]);

    const results: BookMetadata[] = [];

    if (olRes.status === "fulfilled" && olRes.value.ok) {
      const ol = await olRes.value.json();
      for (const doc of ol.docs?.slice(0, 5) ?? []) {
        results.push({
          title:  doc.title,
          author: doc.author_name?.[0],
          year:   doc.first_publish_year,
          isbn:   doc.isbn?.[0],
          language: doc.language?.[0],
          cover: doc.cover_i
            ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
            : undefined,
        });
      }
    }

    if (gbRes.status === "fulfilled" && gbRes.value.ok) {
      const gb = await gbRes.value.json();
      for (const item of gb.items?.slice(0, 5) ?? []) {
        const vi = item.volumeInfo ?? {};
        results.push({
          title:       vi.title,
          author:      vi.authors?.[0],
          publisher:   vi.publisher,
          year:        vi.publishedDate ? parseInt(vi.publishedDate) : undefined,
          isbn:        vi.industryIdentifiers?.find((x: { type: string }) => x.type === "ISBN_13")?.identifier,
          description: vi.description?.slice(0, 300),
          cover:       vi.imageLinks?.thumbnail?.replace("http://", "https://"),
          language:    vi.language,
        });
      }
    }

    return results;
  } catch { return []; }
}

export async function enrichMetadataFromFilename(filename: string): Promise<BookMetadata> {
  // Strip extension
  const base = filename.replace(/\.[^.]+$/, "");
  // Try "Author - Title" pattern
  const parts = base.split(" - ");
  let query = base;
  const initial: BookMetadata = {};
  if (parts.length >= 2) {
    initial.author = parts[0].trim();
    initial.title  = parts.slice(1).join(" - ").trim();
    query = `${initial.author} ${initial.title}`;
  } else {
    initial.title = base;
  }

  // Search online
  const remote = await searchBookMetadata(query);
  if (remote.length > 0) {
    return { ...initial, ...remote[0] };
  }
  return initial;
}
