import puppeteer from 'puppeteer';
import { ClientDataType, Results } from './../types/types.ts';
import { ScraperCache } from './cache.ts';

// Define the Scraper type here
type Scraper = Results[];

// Create a singleton cache instance
const cache = new ScraperCache();

// Helper function to get element content based on selector and attribute
function getElementContent(
  element: Element,
  selector: string | null,
  attribute: string | null
): string {
  if (!selector && !attribute) return '';
  
  if (selector && !attribute) {
    return element.querySelector(selector)?.textContent?.trim() || '';
  }
  
  if (attribute) {
    if (selector) {
      return element.querySelector(selector)?.getAttribute(attribute)?.trim() || '';
    }
    return element.getAttribute(attribute)?.trim() || '';
  }
  
  return '';
}

// Helper function to get link content
function getLinkContent(
  element: Element,
  selector: string | null,
  attribute: string | null
): string {
  if (!selector && !attribute) return '';
  
  if (selector && !attribute) {
    return (element.querySelector(selector) as HTMLAnchorElement)?.href || '';
  }
  
  if (attribute) {
    if (selector) {
      return element.querySelector(selector)?.getAttribute(attribute)?.trim() || '';
    }
    return element.getAttribute(attribute)?.trim() || '';
  }
  
  return '';
}

// Helper function to get image content
function getImageContent(
  element: Element,
  selector: string | null,
  attribute: string | null
): string {
  if (!selector && !attribute) return '';
  
  if (selector && !attribute) {
    return (element.querySelector(selector) as HTMLImageElement)?.src || '';
  }
  
  if (attribute) {
    if (selector) {
      return element.querySelector(selector)?.getAttribute(attribute)?.trim() || '';
    }
    return element.getAttribute(attribute)?.trim() || '';
  }
  
  return '';
}

// Rate limiting helper
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to scrape a detail page
async function scrapeDetailPage(browser: puppeteer.Browser, url: string, data: ClientDataType): Promise<Partial<Results>> {
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log('Browser console:', msg.text());
  });
  
  try {
    // Implement rate limiting for detail pages
    await delay(1000);
    
    console.log(`Scraping detail page: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    // Define helper functions in the browser context
    await page.evaluate(() => {
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

      // @ts-ignore
      window.getImageContent = function(element: Element, selector: string | null, attribute: string | null): string {
        if (!selector && !attribute) return '';
        
        try {
          if (selector && !attribute) {
            const img = element.querySelector(selector) as HTMLImageElement;
            return img?.src || '';
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
    });

    const detailData = await page.evaluate((data) => {
      const result: Partial<Results> = {};
      // Check if any selectors are marked to get data from details page
      Object.entries(data.elementSelectors).forEach(([key, selector]) => {
        
        if (selector.getDataFromDetailsPage) {
          
          const value = (window as any).getElementContent(
            document,
            selector.selector || null,
            selector.selectorIfAttribute || null
          );
          
          // Map the selector key to the corresponding Results field
          switch (key) {
            case 'listingDescription':
              result.description = value;
              break;
            case 'listingPrice':
              result.price = value;
              break;
            case 'listingSalePrice':
              result.sale_price = value;
              break;
            case 'listingImage':
              result.image_link = value;
              break;
            case 'listingImageTag':
              result.image_tag = value;
              break;
            // Add more cases as needed
          }
        }
      });

      return result;
    }, data);

    return detailData;
  } catch (error) {
    console.error(`Error scraping detail page ${url}:`, error);
    return {};
  } finally {
    await page.close();
  }
}

export async function scrapeListings(data: ClientDataType): Promise<Scraper> {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  try {
    console.log(`Scraping listings from: ${data.listingUrl}`);
    
    // Implement rate limiting
    await delay(1000); // 1 second delay between requests
    
    await page.goto(data.listingUrl, { waitUntil: 'networkidle2' });
    await page.waitForSelector(data.elementSelectors.listingContainer.selector, { visible: true });
    
    page.on('console', async (msg) => {
      const msgArgs = msg.args();
      for (let i = 0; i < msgArgs.length; ++i) {
        console.log(await msgArgs[i].jsonValue());
      }
    });
    
    // Define helper functions in the browser context
    await page.evaluate(() => {
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

      // @ts-ignore
      window.getImageContent = function(element: Element, selector: string | null, attribute: string | null): string {
        if (!selector && !attribute) return '';
        
        try {
          if (selector && !attribute) {
            const img = element.querySelector(selector) as HTMLImageElement;
            return img?.src || '';
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
    });
    
    const listings = await page.evaluate((data) => {    
      const results: Results[] = [];
      const listingElements = document.querySelectorAll(data.elementSelectors.listingContainer.selector);

      if (listingElements.length === 0) {
        console.error(`No listing elements found for selector: ${data.elementSelectors.listingContainer.selector}`);
        return results;
      }

      listingElements.forEach(el => {
        const {
          listingTitle,
          listingLink,
          listingDescription,
          listingImage,
          listingPrice,
          listingAddress,
          listingCity,
          listingImageTag,
          listingSalePrice,
          listingLatitude,
          listingLongitude,
          listingNeighborhood
        } = data.elementSelectors;

        // Only get data that isn't marked for detail page
        const result: Results = {
          title: (window as any).getElementContent(el, listingTitle?.selector || null, listingTitle?.selectorIfAttribute || null),
          brand: data.name,
          address: (window as any).getElementContent(el, listingAddress?.selector || null, listingAddress?.selectorIfAttribute || null),
          city: (window as any).getElementContent(el, listingCity?.selector || null, listingCity?.selectorIfAttribute || null),
          link: (window as any).getLinkContent(el, listingLink?.selector || null, listingLink?.selectorIfAttribute || null),
          image_link: (window as any).getImageContent(el, listingImage?.selector || null, listingImage?.selectorIfAttribute || null),
          // Only get these fields if they're not marked for detail page
          image_tag: (window as any).getElementContent(el, listingImageTag?.selector || null, listingImageTag?.selectorIfAttribute || null),
          description: (window as any).getElementContent(el, listingDescription?.selector || null, listingDescription?.selectorIfAttribute || null),
          sale_price: (window as any).getElementContent(el, listingSalePrice?.selector || null, listingSalePrice?.selectorIfAttribute || null),
          price: (window as any).getElementContent(el, listingPrice?.selector || null, listingPrice?.selectorIfAttribute || null),
          latitude: (window as any).getElementContent(el, listingLatitude?.selector || null, listingLatitude?.selectorIfAttribute || null),
          longitude: (window as any).getElementContent(el, listingLongitude?.selector || null, listingLongitude?.selectorIfAttribute || null),
          neighborhood: (window as any).getElementContent(el, listingNeighborhood?.selector || null, listingNeighborhood?.selectorIfAttribute || null),
          // Initialize other fields as empty strings
          loyalty_program: '',
          margin_level: '',
          star_rating: '',
          address2: '',
          address3: '',
          city_id: '',
          region: '',
          postal_code: '',
          unit_number: '',
          priority: '',
          number_of_rooms: '',
          android_app_name: '',
          android_package: '',
          android_url: '',
          ios_app_name: '',
          ios_app_store_id: '',
          ios_url: '',
          ipad_app_name: '',
          ipad_app_store_id: '',
          ipad_url: '',
          iphone_app_name: '',
          iphone_app_store_id: '',
          iphone_url: '',
          windows_phone_app_id: '',
          windows_phone_app_name: '',
          windows_phone_url: '',
          video_url: '',
          video_tag: '',
          category: ''
        };

        results.push(result);
      });

      return results;
    }, data);

    console.log('Initial listings scraped:', listings.length);
    
    // Scrape detail pages for listings that need additional data
    const listingsWithDetails = await Promise.all(
      listings.map(async (listing) => {
        if (listing.link) {
          const detailData = await scrapeDetailPage(browser, listing.link, data);
          return { ...listing, ...detailData };
        }
        return listing;
      })
    );

    console.log('Final listings with detail data:', listingsWithDetails.length);
    
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
