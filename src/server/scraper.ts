import puppeteer from 'puppeteer';
import { ClientDataType, Results } from './../types/types.ts';
import { ScraperCache } from './cache.ts';

// Define the Scraper type here
type Scraper = Results[];

// Extend Window interface to include our helper functions
declare global {
  interface Window {
    getElementContent: (element: Element, selector: string | null, attribute: string | null) => string;
    getLinkContent: (element: Element, selector: string | null, attribute: string | null) => string;
    getImageContent: (element: Element, selector: string | null, attribute: string | null) => string;
    formatPrice: (price: string) => string;
    selectorToFieldMap: Record<string, keyof Results>;
  }
}

// Create a singleton cache instance
const cache = new ScraperCache();

// Rate limiting helper
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function defineBrowserHelpers(page: puppeteer.Page) {
  await page.evaluate(() => {
    // @ts-ignore
    window.selectorToFieldMap = {
      'listingTitle': 'title',
      'listingDescription': 'description',
      'listingPrice': 'price',
      'listingSalePrice': 'sale_price',
      'listingImage': 'image_link',
      'listingImageTag': 'image_tag',
      'listingAddress': 'address',
      'listingCity': 'city',
      'listingLatitude': 'latitude',
      'listingLongitude': 'longitude',
      'listingNeighborhood': 'neighborhood',
      'listingRegion': 'region',
      'listingLoyaltyProgram': 'loyalty_program',
      'listingMarginLevel': 'margin_level',
      'listingStarRating': 'star_rating',
      'listingAddress2': 'address2',
      'listingAddress3': 'address3',
      'listingPostalCode': 'postal_code',
      'listingUnitNumber': 'unit_number',
      'listingPriority': 'priority',
      'listingNumberOfRooms': 'number_of_rooms',
      'listingAndroidAppName': 'android_app_name',
      'listingAndroidAppPackage': 'android_package',
      'listingAndroidAppUrl': 'android_url',
      'listingIosAppName': 'ios_app_name',
      'listingIosAppStoreId': 'ios_app_store_id',
      'listingIosUrl': 'ios_url',
      'listingIpadAppName': 'ipad_app_name',
      'listingIpadAppStoreId': 'ipad_app_store_id',
      'listingIpadAppUrl': 'ipad_url',
      'listingWindowsPhoneAppId': 'windows_phone_app_id',
      'listingWindowsPhoneAppName': 'windows_phone_app_name',
      'listingWindowsPhoneUrl': 'windows_phone_url',
      'listingVideoUrl': 'video_url',
      'listingVideoTag': 'video_tag',
      'listingCategory': 'category',
      'listingDetailPageUrl': 'link'
    };

    // @ts-ignore
    window.getElementContent = function(element: Element, selector: string | null, attribute: string | null): string {
      // If no selector or attribute is provided, return empty string
      if (!selector && !attribute) return '';
      
      try {
        // Only try to querySelector if we have a valid selector
        const foundElement = selector ? element.querySelector(selector) : element;
        
        if (foundElement) {
          if (attribute) {
            return foundElement.getAttribute(attribute)?.trim() || '';
          }
          return foundElement.textContent?.trim() || '';
        }
      } catch (error) {
        console.error('Error in getElementContent:', error);
        return '';
      }
      
      return '';
    };

    // helper function to get the URL of a link
    // @ts-ignore
    window.getLinkContent = function(element: Element, selector: string | null, attribute: string | null): string {
      if (!selector && !attribute) return '';
      
      try {
        if (selector && !attribute) {
          const link = element.querySelector(selector) as HTMLAnchorElement;
          return link?.href || '';
        }
        
        if (attribute) {
          const foundElement = selector ? element.querySelector(selector) : element;
          return foundElement?.getAttribute(attribute)?.trim() || '';
        }
      } catch (error) {
        console.error('Error in getLinkContent:', error);
        return '';
      }
      
      return '';
    };

    // helper function to get the URL of an image
    // @ts-ignore
    window.getImageContent = function(element: Element, selector: string | null, attribute: string | null): string {
      if (!selector && !attribute) return '';
      
      try {
        if (selector && !attribute) {
          const img = element.querySelector(selector) as HTMLImageElement;
          // Check both src and data-src attributes
          return img?.src || img?.getAttribute('data-src') || '';
        }
        
        if (attribute) {
          const foundElement = selector ? element.querySelector(selector) : element;
          return foundElement?.getAttribute(attribute)?.trim() || '';
        }
      } catch (error) {
        console.error('Error in getImageContent:', error);
        return '';
      }
      
      return '';
    };

    // helper function to format price
    // it removes all non-numeric characters except commas and periods
    // and also only returns the first (lower) price
    // @ts-ignore
    window.formatPrice = function(price: string): string {
      if (!price) return '';
      
      // Remove all non-numeric characters except commas and periods
      const cleaned = price.replace(/[^0-9,.]/g, '');
      
      // Split by common separators (comma, space, dash, etc.)
      const prices = cleaned.split(/[, -]/);
      
      // Get the first price and remove any remaining commas
      const firstPrice = prices[0].replace(/,/g, '');
      
      // Remove decimal points and everything after them
      return firstPrice.split('.')[0];
    };
  });
}

// Function to scrape a detail page
async function scrapeDetailPage(browser: puppeteer.Browser, url: string, data: ClientDataType): Promise<Partial<Results>> {
  const page = await browser.newPage();
  const maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      // Implement rate limiting for detail pages
      await delay(1000);
      
      if (retryCount === 0) {
        console.log(`Scraping detail page: ${url}`);
      } else {
        console.log(`Scraping detail page (attempt ${retryCount + 1}/${maxRetries}): ${url}`);
      }
      
      // Set a longer timeout (60 seconds instead of 30)
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 60000 
      });
      
      await defineBrowserHelpers(page);

      const detailData = await page.evaluate((data) => {
        const result: Partial<Results> = {};

        // Get data from detail page for fields where getDataFromDetailsPage is true
        Object.entries(data.elementSelectors).forEach(([key, selector]) => {
          if (key === 'listingsPageContainer' || key === 'listingDetailPageUrl') return;
          
          if (selector.getDataFromDetailsPage) {
            let value = '';
            if (key === 'listingImage') {
              value = (window as any).getImageContent(
                document,
                selector.selector,
                selector.selectorIfAttribute
              );
            } else {
              value = (window as any).getElementContent(
                document,
                selector.selector,
                selector.selectorIfAttribute
              );
            }

            // Map the selector key to the corresponding Results field
            const field = (window as any).selectorToFieldMap[key];
            if (field) {
              if (key === 'listingPrice' || key === 'listingSalePrice') {
                (result as any)[field] = (window as any).formatPrice(value);
              } else {
                (result as any)[field] = value;
              }
            }
          }
        });

        return result;
      }, data);

      await page.close();
      return detailData;
    } catch (error) {
      retryCount++;
      
      if (error && typeof error === 'object' && 'name' in error && error.name === 'TimeoutError') {
        console.warn(`Timeout on attempt ${retryCount}/${maxRetries} for ${url}`);
        if (retryCount < maxRetries) {
          // Wait longer between retries
          await delay(5000 * retryCount);
          continue;
        }
      }
      
      console.error(`Error scraping detail page ${url}:`, error);
      await page.close();
      
      if (retryCount === maxRetries) {
        // Return empty result after all retries fail
        return {};
      }
    }
  }
  
  return {};
}

export async function scrapeListings(data: ClientDataType): Promise<Scraper> {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true
  });
  const page = await browser.newPage();

  // Listen to console events
  page.on('console', msg => {
    console.log('Browser console:', msg.text());
  });

  try {
    console.log(`Scraping listings from: ${data.listingsUrl}`);
    
    // Implement rate limiting
    await delay(1000); // 1 second delay between requests
    
    await page.goto(data.listingsUrl, { waitUntil: 'networkidle2' });
    await page.waitForSelector(data.elementSelectors.listingsPageContainer.selector, { visible: true });
    
    await defineBrowserHelpers(page);
    
    // Get initial data from listings page
    const listingsData = await page.evaluate((data) => {    
      const results: Partial<Results>[] = [];
      const listingElements = document.querySelectorAll(data.elementSelectors.listingsPageContainer.selector);

      if (listingElements.length === 0) {
        console.error(`No listing elements found for selector: ${data.elementSelectors.listingsPageContainer.selector}`);
        return results;
      }

      listingElements.forEach(el => {
        const result: Partial<Results> = {
          brand: data.name
        };

        // Get data from listings page for fields where getDataFromDetailsPage is false
        Object.entries(data.elementSelectors).forEach(([key, selector]) => {
          if (key === 'listingsPageContainer' || key === 'listingDetailContainer') return;
          
          if (!selector.getDataFromDetailsPage) {
            let value = '';
            if (key === 'listingDetailPageUrl') {
              value = (window as any).getLinkContent(
                el,
                selector.selector,
                selector.selectorIfAttribute
              );
            } else if (key === 'listingImage') {
              value = (window as any).getImageContent(
                el,
                selector.selector,
                selector.selectorIfAttribute
              );
            } else {
              value = (window as any).getElementContent(
                el,
                selector.selector,
                selector.selectorIfAttribute
              );
            }

            // Map the selector key to the corresponding Results field
            const field = (window as any).selectorToFieldMap[key];
            if (field) {
              if (key === 'listingPrice' || key === 'listingSalePrice') {
                (result as any)[field] = (window as any).formatPrice(value);
              } else {
                (result as any)[field] = value;
              }
            }
          }
        });

        results.push(result);
      });

      return results;
    }, data);

    console.log('Initial listings data scraped:', listingsData.length);
    
    // Scrape detail pages for listings that need additional data
    const listingsWithDetails = await Promise.all(
      listingsData.map(async (listing) => {
        if (listing.link) {
          try {
            const detailData = await scrapeDetailPage(browser, listing.link, data);
            return { ...listing, ...detailData };
          } catch (error) {
            console.error(`Failed to scrape detail page ${listing.link}:`, error);
            return listing;
          }
        }
        return listing;
      })
    );
    
    // Cache the results
    cache.setCachedData(data, listingsWithDetails);
    return listingsWithDetails;
  } catch (error) {
    console.error(`Error scraping ${data.name}:`, error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Function to scrape multiple clients in parallel
export async function scrapeMultipleClients(clients: ClientDataType[]): Promise<Scraper[]> {
  const results: Scraper[] = [];
  const errors: Error[] = [];
  
  // Process clients in parallel with a concurrency limit
  const concurrencyLimit = 3;
  const chunks = [];
  
  for (let i = 0; i < clients.length; i += concurrencyLimit) {
    chunks.push(clients.slice(i, i + concurrencyLimit));
  }
  
  for (const chunk of chunks) {
    const chunkResults = await Promise.all(
      chunk.map(async (client) => {
        try {
          return await scrapeListings(client);
        } catch (error) {
          console.error(`Failed to scrape ${client.name}:`, error);
          errors.push(error as Error);
          return [];
        }
      })
    );
    
    results.push(...chunkResults);
    
    // Add delay between chunks to prevent overwhelming servers
    if (chunks.indexOf(chunk) < chunks.length - 1) {
      await delay(2000); // 2 second delay between chunks
    }
  }
  
  if (errors.length > 0) {
    console.warn(`Completed with ${errors.length} errors`);
  }
  
  return results;
}
