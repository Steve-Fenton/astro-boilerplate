// Data file `navigation.ts`
import { PostQueries, PostFiltering, Cache } from 'astro-accelerator-utils';
import { menu } from 'src/data/navigation';
import { SITE } from '@config';
import { NavPage, isNavPage } from '@util/NavigationTypes';

export async function getMenu (currentUrl: URL) {
    const key = 'Navigation__getMenu';
    let pages: NavPage[] = await Cache.getItem(key);

    if (pages == null) {
        pages = [];
        for (let i = 0; i < menu.length; i++) {
            const item = menu[i];
            if (isNavPage(item)) {
                pages.push(item);
            } else {
                const p = await getNavigation(currentUrl);
                for (let j = 0; j < p.length; j++) {
                    pages.push(p[j]);
                }
            }
        }

        // Cache the result
        await Cache.setItem(key, pages);
    }

    PostQueries.setCurrentPage(pages, currentUrl);

    return pages;
}

export async function getNavigation (currentUrl: URL) {

    const key = 'Navigation__getNavigation';
    let pageHierarchy: NavPage[] = await Cache.getItem(key);

    if (pageHierarchy == null) {
        const topLevelPages = await PostQueries.getTopLevelPages(SITE, PostFiltering.showInMenu);
        const allPages = await PostQueries.getPages(PostFiltering.showInMenu);

        pageHierarchy = topLevelPages
            .map(p => PostQueries.mapNavPage(p, SITE))
            .sort((a, b) => a.order - b.order);
            
        const pageList: NavPage[] = allPages.map(p => PostQueries.mapNavPage(p, SITE));

        for (let i = 0; i < pageHierarchy.length; i++) {
            const page = pageHierarchy[i];

            if (i > 0) {
                // Don't add children to first link (Home)
                page.children = pageList
                    .filter((mp) =>
                        page.url != '/'
                        && mp.url != page.url
                        && mp.url.startsWith(page.url)
                    )
                    .sort((mp) => mp.order);
            }

            if (page.children.length > 0) {
                const ownChild = structuredClone(page);
                ownChild.order = -1;
                ownChild.children = [];
                page.children.push(ownChild);
            }
        }

        // Cache the result
        await Cache.setItem(key, pageHierarchy);
    }

    return pageHierarchy;
}
