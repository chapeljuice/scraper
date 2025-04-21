import puppeteer from 'puppeteer';
import { PageData, Results } from './../types/types.ts';
import pLimit from 'p-limit';

const CONCURRENCY_LIMIT = 5;

const scrapeDetailPage = async (
  browser: puppeteer.Browser,
  url: string
): Promise<Partial<Results>> => {
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    const result = await page.evaluate(() => {
      const extraData: Partial<Results> = {};

      const getText = (selector: string) =>
        document.querySelector(selector)?.textContent?.trim() || '';

      // Customize these selectors based on actual detail page structure
      extraData.description = getText('.full-description');
      extraData.price = getText('.price span');

      return extraData;
    });

    return result;
  } catch (err) {
    console.error(`Error scraping detail page ${url}:`, err);
    return {};
  } finally {
    await page.close();
  }
};

export const scrapeListings = async (
  url: string,
  selectors: PageData
): Promise<Results[]> => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    const listings = await page.evaluate((selectors: PageData) => {
      const results: Results[] = [];

      const listingElements = document.querySelectorAll(selectors.listingSelector);

      listingElements.forEach((listingEl) => {
        const getText = (sel: string) =>
          listingEl.querySelector(sel)?.textContent?.trim() || '';
        const getAttr = (sel: string, attr: string) =>
          listingEl.querySelector(sel)?.getAttribute(attr) || '';

        results.push({
          title: selectors.titleSelector ? getText(selectors.titleSelector) : '',
          link: selectors.linkSelector
            ? getAttr(selectors.linkSelector, 'href')
            : '',
          price: selectors.priceSelector ? getText(selectors.priceSelector) : '',
          location: selectors.locationSelector
            ? getText(selectors.locationSelector)
            : '',
          date: selectors.dateSelector ? getText(selectors.dateSelector) : '',
        });
      });

      return results;
    }, selectors);

    // Scrape detail pages with concurrency
    const limit = pLimit(CONCURRENCY_LIMIT);
    const enrichedListings = await Promise.all(
      listings.map((listing) =>
        limit(async () => {
          if (listing.link) {
            const detailData = await scrapeDetailPage(browser, listing.link);
            return { ...listing, ...detailData };
          }
          return listing;
        })
      )
    );

    return enrichedListings;
  } catch (error) {
    console.error('Error during scraping:', error);
    return [];
  } finally {
    await page.close();
    await browser.close();
  }
};
