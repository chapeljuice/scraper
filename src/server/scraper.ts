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

// Helper function to format price
function formatPrice(price: string): string {
  if (!price) return '';
  
  // Remove all non-numeric characters except commas and periods
  const cleaned = price.replace(/[^0-9,.]/g, '');
  
  // Split by common separators (comma, space, dash, etc.)
  const prices = cleaned.split(/[, -]/);
  
  // Get the first price and remove any remaining commas
  const firstPrice = prices[0].replace(/,/g, '');
  
  // Remove decimal points and everything after them
  return firstPrice.split('.')[0];
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
      
      console.log(`Scraping detail page (attempt ${retryCount + 1}/${maxRetries}): ${url}`);
      
      // Set a longer timeout (60 seconds instead of 30)
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 60000 
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
              console.log(`Debug - Image scraping for ${data.name}:`);
              console.log(`- Selector: ${selector.selector}`);
              console.log(`- Found value: ${value}`);
              console.log(`- Element HTML: ${document.documentElement.innerHTML}`);
            } else {
              value = (window as any).getElementContent(
                document,
                selector.selector,
                selector.selectorIfAttribute
              );
            }

            // Map the selector key to the corresponding Results field
            switch (key) {
              case 'listingTitle':
                result.title = value;
                break;
              case 'listingDescription':
                result.description = value;
                break;
              case 'listingPrice':
                result.price = (window as any).formatPrice(value);
                break;
              case 'listingSalePrice':
                result.sale_price = (window as any).formatPrice(value);
                break;
              case 'listingImage':
                result.image_link = value;
                break;
              case 'listingImageTag':
                result.image_tag = value;
                break;
              case 'listingAddress':
                result.address = value;
                break;
              case 'listingCity':
                result.city = value;
                break;
              case 'listingLatitude':
                result.latitude = value;
                break;
              case 'listingLongitude':
                result.longitude = value;
                break;
              case 'listingNeighborhood':
                result.neighborhood = value;
                break;
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
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
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
    
    // Define helper functions in the browser context
    await page.evaluate(() => {
      // @ts-ignore
      window.getElementContent = function(element: Element, selector: string | null, attribute: string | null): string {
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
              const debugInfo = {
                selector: selector.selector,
                elementHtml: el.innerHTML,
                foundElements: Array.from(el.querySelectorAll(selector.selector || '')).length
              };
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
            switch (key) {
              case 'listingTitle':
                result.title = value;
                break;
              case 'listingDescription':
                result.description = value;
                break;
              case 'listingPrice':
                result.price = (window as any).formatPrice(value);
                break;
              case 'listingSalePrice':
                result.sale_price = (window as any).formatPrice(value);
                break;
              case 'listingImage':
                result.image_link = value;
                break;
              case 'listingImageTag':
                result.image_tag = value;
                break;
              case 'listingAddress':
                result.address = value;
                break;
              case 'listingCity':
                result.city = value;
                break;
              case 'listingLatitude':
                result.latitude = value;
                break;
              case 'listingLongitude':
                result.longitude = value;
                break;
              case 'listingNeighborhood':
                result.neighborhood = value;
                break;
              case 'listingDetailPageUrl':
                result.link = value;
                break;
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
