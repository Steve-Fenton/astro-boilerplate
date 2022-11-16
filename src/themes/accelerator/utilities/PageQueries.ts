import type { MarkdownInstance } from "astro";
import { SITE } from '@config';
import { isAuthor, getItem, setItem, PagePredicate, getPages } from 'astro-accelerator-utils';

export function fetchPages(): Record<string, any> {
    return import.meta.glob("../../../pages/**/*.md", { eager: true });
}

// export type PagePredicate = (value: MarkdownInstance<Record<string, any>>, index: number, array: MarkdownInstance<Record<string, any>>[]) => boolean;

// export async function getPages (fetchPages: () => Record<string, any>, filter?: PagePredicate | null): Promise<MarkdownInstance<Record<string,any>>[]> {
//     const key = 'PageQueries__getPages';
//     let allPages: MarkdownInstance<Record<string,any>>[] = await getItem(key);

//     if (allPages == null) {
//         const pageImportResult = fetchPages();
//         allPages = Object.values(pageImportResult) as MarkdownInstance<Record<string,any>>[];
//         await setItem(key, allPages);
//     }

//     if (filter == null) {
//         return allPages;
//     }

//     return allPages.filter(filter);
// }

export async function getTopLevelPages (filter?: PagePredicate | null): Promise<MarkdownInstance<Record<string,any>>[]> {
    const key = 'PageQueries__getTopLevelPages';
    let allPages = await getItem(key);

    if (allPages == null) {
        allPages = await getPages(fetchPages);

        const isRoot = SITE.subfolder.length == 0;
        const expectedDepth = isRoot ? 1 : 2;
        allPages = allPages.filter(p => {
            const depth = (p.url ?? '/').split('/').length - 1;
            return depth == expectedDepth
                || (depth == (expectedDepth - 1) && p.file.includes(SITE.subfolder.toLowerCase() + '.md'));
        });

        await setItem(key, allPages);
    }

    if (filter == null) {
        return allPages;
    }

    return allPages.filter(filter);
}

export async function getAuthorInfo (slug: string) {
    const cacheKey = 'Global__author_info';
    
    let authorInfo = await getItem(cacheKey);

    if (authorInfo == null) {
        const allPages = await getPages(fetchPages);

        const author = allPages
            .filter(isAuthor)
            .filter(x => x.url?.split('/')[2] == slug)[0];

        authorInfo = {
            frontmatter: author.frontmatter
        };
  
      await setItem(cacheKey, authorInfo);
    }

    return authorInfo;
}
