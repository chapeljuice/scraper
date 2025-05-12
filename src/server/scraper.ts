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
  let page: puppeteer.Page | null = null;
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
      
      // Create a new page for each attempt
      page = await browser.newPage();
      
      // Block unnecessary resources
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        const resourceType = request.resourceType();
        const url = request.url();
        
        // Block analytics, ads, and other unnecessary resources
        if (
          resourceType === 'image' ||
          resourceType === 'media' ||
          resourceType === 'font' ||
          resourceType === 'other' ||
          url.includes('analytics') ||
          url.includes('analytics') ||
          url.includes('fonts.gstatic') ||
          url.includes('google-analytics') ||
          url.includes('googletagmanager') ||
          url.includes('maps.gstatic') ||
          url.includes('doubleclick') ||
          url.includes('facebook') ||
          url.includes('twitter') ||
          url.includes('linkedin')
        ) {
          request.abort();
        } else {
          request.continue();
        }
      });
      
      // Set a longer timeout (120 seconds instead of 30)
      await page.goto(url, { 
        waitUntil: 'networkidle0', // Changed to networkidle0 for better stability
        timeout: 120000 
      });

      // Wait for the main content to be visible with a longer timeout
      await page.waitForSelector(data.elementSelectors.listingDetailContainer.selector, { 
        visible: true,
        timeout: 60000 // Increased from 30s to 60s
      });
      
      // Small delay to ensure page is fully loaded
      await delay(1000);
      
      await defineBrowserHelpers(page);

      // First, verify if our selector actually exists on the page
      const containerExists = await page.evaluate((selector) => {
        return !!document.querySelector(selector);
      }, data.elementSelectors.listingDetailContainer.selector);
      
      if (!containerExists) {
        console.error(`Listing detail container selector not found on page: ${url}`);
        throw new Error(`Listing container not found on detail page`);
      }

      const detailData = await page.evaluate((data) => {
        const result: Partial<Results> = {};

        // Debug helper to log selector status
        const debugSelectors = {};

        // Get data from detail page for fields where getDataFromDetailsPage is true
        Object.entries(data.elementSelectors).forEach(([key, selector]) => {
          if (key === 'listingsPageContainer' || key === 'listingDetailPageUrl') return;
          
          if (selector.getDataFromDetailsPage) {
            let value = '';
            if (selector.selector === null) {
              // Skip null selectors
              return;
            }
            
            // Verify selector exists
            const selectorExists = !!document.querySelector(selector.selector);
            (debugSelectors as any)[key] = selectorExists ? 'found' : 'not found';
            
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

        // Add debug information
        console.table(debugSelectors);
        
        return result;
      }, data);

      // Validate that critical fields are present
      if (data.elementSelectors.listingTitle.getDataFromDetailsPage && !detailData.title) {
        console.warn(`Title not found in detail page: ${url}, will retry...`);
        await delay(2000); // Wait a bit before retry
        retryCount++;
        continue;
      }
      
      if (data.elementSelectors.listingImage.getDataFromDetailsPage && !detailData.image_link) {
        console.warn(`Image not found in detail page: ${url}, will retry...`);
        await delay(2000); // Wait a bit before retry
        retryCount++;
        continue;
      }

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
      
      if (retryCount === maxRetries) {
        // Return empty result after all retries fail
        return {};
      }
    } finally {
      // Safely close the page if it exists
      if (page) {
        try {
          await page.close();
        } catch (error) {
          console.warn('Error closing page:', error);
        }
        page = null;
      }
    }
  }
  
  return {};
}

export async function scrapeListings(data: ClientDataType): Promise<Scraper> {
  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-extensions',
      '--disable-notifications',
      '--disable-popup-blocking',
      '--disable-infobars',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--js-flags=--expose-gc',
      '--single-process',
      '--no-zygote',
      '--no-first-run',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
    ],
    headless: true,
    timeout: 30000
  });
  
  try {
    console.log(`Scraping listings from: ${data.listingsUrl}`);
    
    const page = await browser.newPage();
    
    // Block unnecessary resources
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      const url = request.url();
      
      // Block analytics, ads, and other unnecessary resources
      if (
        resourceType === 'image' ||
        resourceType === 'media' ||
        resourceType === 'font' ||
        resourceType === 'other' ||
        url.includes('analytics') ||
        url.includes('analytics') ||
        url.includes('fonts.gstatic') ||
        url.includes('google-analytics') ||
        url.includes('googletagmanager') ||
        url.includes('maps.gstatic') ||
        url.includes('doubleclick') ||
        url.includes('facebook') ||
        url.includes('twitter') ||
        url.includes('linkedin')
      ) {
        request.abort();
      } else {
        request.continue();
      }
    });
    
    // Set default timeout for page operations
    page.setDefaultTimeout(120000);
    
    // Set viewport to a reasonable size
    await page.setViewport({ width: 1280, height: 800 });
    
    // Listen to page errors
    page.on('error', err => {
      console.error('Page error:', err);
    });
    
    // Listen to request failures
    page.on('requestfailed', request => {
      console.error('Request failed:', request.url(), request.failure()?.errorText);
    });
    
    // Listen to page crashes
    page.on('close', () => {
      console.warn('Page was closed unexpectedly');
    });

    // Implement rate limiting
    await delay(1000); // 1 second delay between requests
    
    // Set a longer timeout (120 seconds instead of 30)
    await page.goto(data.listingsUrl, {
      waitUntil: 'networkidle0',
      timeout: 120000
    });
    
    // Ensure the listings container exists before proceeding
    await page.waitForSelector(data.elementSelectors.listingsPageContainer.selector, { 
      visible: true,
      timeout: 60000
    });
    
    // Small delay to ensure all dynamic content is loaded
    await delay(2000);
    
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
            if (!selector.selector) {
              return; // Skip null selectors
            }
            
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
        
        // Ensure we have a link to scrape details, otherwise skip
        if (!result.link || result.link === '') {
          console.warn('Skipping listing - no valid detail page URL found');
          return;
        }

        results.push(result);
      });

      return results;
    }, data);

    console.log('Initial listings data scraped:', listingsData.length);
    
    // Process detail pages sequentially
    const listingsWithDetails: Scraper = [];
    for (const listing of listingsData) {
      if (!listing.link) {
        console.warn('Skipping listing - no detail page URL found');
        continue;
      }
      
      try {
        // Make the URL absolute if it's relative
        let detailUrl = listing.link;
        if (!/^https?:\/\//i.test(detailUrl)) {
          const baseURL = new URL(data.listingsUrl);
          detailUrl = new URL(detailUrl, baseURL.origin).href;
          listing.link = detailUrl; // Update the link with absolute URL
        }
        
        const detailData = await scrapeDetailPage(browser, detailUrl, data);
        
        // Verify that we have minimum required data
        const combinedListing = { ...listing, ...detailData };
        
        // Ensure we have at least the minimum data (title and link)
        if (!combinedListing.title) {
          console.warn(`Skipping listing with missing title: ${detailUrl}`);
          // If title is expected from detail page but not found, log it
          if (data.elementSelectors.listingTitle.getDataFromDetailsPage) {
            console.error(`Failed to get title from detail page: ${detailUrl}`);
          }
        }
        
        // Add the listing even if some data is missing
        listingsWithDetails.push(combinedListing);
        
        // Add delay between detail page requests
        await delay(2000);
      } catch (error) {
        console.error(`Failed to scrape detail page ${listing.link}:`, error);
        // Add the listing without detail data if we have at least the basic info
        if (listing.title || (data.elementSelectors.listingTitle && !data.elementSelectors.listingTitle.getDataFromDetailsPage)) {
          listingsWithDetails.push(listing);
        } else {
          console.warn(`Skipping listing with insufficient data: ${listing.link}`);
        }
      }
    }
    
    // Cache the results
    if (listingsWithDetails.length > 0) {
      cache.setCachedData(data, listingsWithDetails);
      console.log(`Successfully scraped ${listingsWithDetails.length} listings for ${data.name}`);
    } else {
      console.error(`No valid listings found for ${data.name}`);
    }
    
    return listingsWithDetails;
  } catch (error) {
    console.error(`Error scraping ${data.name}:`, error);
    // Return empty array instead of throwing the error
    return [];
  } finally {
    try {
      // Close all pages first
      const pages = await browser.pages();
      await Promise.all(pages.map(page => page.close().catch(e => console.warn('Error closing page:', e))));
      // Then close the browser
      await browser.close();
    } catch (error) {
      console.error('Error during browser cleanup:', error);
    }
  }
}

// Function to scrape multiple clients in parallel
export async function scrapeMultipleClients(clients: ClientDataType[]): Promise<Scraper[]> {
  const results: Scraper[] = [];
  const errors: Error[] = [];
  
  // Reduce concurrency for production
  const concurrencyLimit = process.env.NODE_ENV === 'production' ? 1 : 3;
  const chunks = [];
  
  for (let i = 0; i < clients.length; i += concurrencyLimit) {
    chunks.push(clients.slice(i, i + concurrencyLimit));
  }
  
  for (const chunk of chunks) {
    const chunkResults = await Promise.all(
      chunk.map(async (client) => {
        try {
          // Add a timeout for the entire scraping process
          return await Promise.race<Scraper>([
            scrapeListings(client),
            new Promise<Scraper>((_, reject) => 
              setTimeout(() => reject(new Error('Scraping timeout')), 300000) // 5 minutes timeout
            )
          ]);
        } catch (error) {
          console.error(`Failed to scrape ${client.name}:`, error);
          errors.push(error as Error);
          return [];
        }
      })
    );
    
    results.push(...chunkResults);
    
    // Increase delay between chunks in production
    const delayTime = process.env.NODE_ENV === 'production' ? 5000 : 2000;
    if (chunks.indexOf(chunk) < chunks.length - 1) {
      await delay(delayTime);
    }
  }
  
  if (errors.length > 0) {
    console.warn(`Completed with ${errors.length} errors`);
  }
  
  return results;
}
