import puppeteer from 'puppeteer';

interface Results {
  title: string;
  brand: string;
  address: string;
  city: string;
  link: string;
  image_link: string;
  image_tag: string;
  description: string;
  sale_price: string;
  price: string;
  latitude: string;
  longitude: string;
  neighborhood: string;
  // loyalty_program: string;
  // margin_level: string;
  // star_rating: string;
  // address2: string;
  // address3: string;
  // city_id: string;
  region: string;
  // postal_code: string;
  // unit_number: string;
  // priority: string;
  // number_of_rooms: string;
  // android_app_name: string;
  // android_package: string;
  // android_url: string;
  // ios_app_name: string;
  // ios_app_store_id: string;
  // ios_url: string;
  // ipad_app_name: string;
  // ipad_app_store_id: string;
  // ipad_url: string;
  // iphone_app_name: string;
  // iphone_app_store_id: string;
  // iphone_url: string;
  // windows_phone_app_id: string;
  // windows_phone_app_name: string;
  // windows_phone_url: string;
  // video_url: string;
  // video_tag: string;
  // category: string;
}

export interface ClientDataType {
  id: string;
  name: string;
  status: string;
  listingUrl: string;
  sheetId?: string;
  elementSelectors: {
    listingContainer: {
      selector: string;
      selectorIfAttribute: string | null;
    }
    listingTitle: {
      selector: string | null;
      selectorIfAttribute: string | null;
    }
    listingLink: {
      selector: string | null;
      selectorIfAttribute: string | null;
    }
    listingDescription?: {
      selector: string | null;
      selectorIfAttribute: string | null;
    }
    listingImage: {
      selector: string | null;
      selectorIfAttribute: string | null;
    }
    listingPrice: {
      selector: string | null;
      selectorIfAttribute: string | null;
    }
    listingAddress: {
      selector: string | null;
      selectorIfAttribute: string | null;
    }
    listingCity: {
      selector: string | null;
      selectorIfAttribute: string | null;
    }
    listingImageTag: {
      selector: string | null;
      selectorIfAttribute: string | null;
    }
    listingSalePrice: {
      selector: string | null;
      selectorIfAttribute: string | null;
    }
    listingLatitude: {
      selector: string | null;
      selectorIfAttribute: string | null;
    }
    listingLongitude: {
      selector: string | null;
      selectorIfAttribute: string | null;
    }
    listingNeighborhood: {
      selector: string | null;
      selectorIfAttribute: string | null;
    }
  }
}

// Define the Scraper type here
type Scraper = Results[];

export async function scrapeListings(data: ClientDataType): Promise<Scraper> {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  console.log(`Scraping listings from: ${data.listingUrl}`);
  await page.goto(data.listingUrl, { waitUntil: 'networkidle2' });
  await page.waitForSelector(data.elementSelectors.listingContainer.selector, { visible: true });
  page.on('console', async (msg) => {
    const msgArgs = msg.args();
    for (let i = 0; i < msgArgs.length; ++i) {
      console.log(await msgArgs[i].jsonValue());
    }
  });
  
  // Adjust these selectors based on the target site
  const listings = await page.evaluate(data => {    
    const results: Results[] = [];
    let listingElements = document.querySelectorAll(data.elementSelectors.listingContainer.selector);
    console.log(`Listing elements found: ${listingElements.length}`);

    if (listingElements.length === 0) {
      console.error(`No listing elements found for selector: ${data.elementSelectors.listingContainer.selector}`);
      return results;
    }

    listingElements.forEach(el => {
      let title = '',
          brand = '',
          address = '',
          city = '',
          link = '',
          image_link = '',
          image_tag = '',
          description = '',
          sale_price = '',
          price = '',
          latitude = '',
          longitude = '',
          neighborhood = '',
          // loyalty_program = '',
          // margin_level = '',
          // star_rating = '',
          // address2 = '',
          // address3 = '',
          // city_id = '',
          region = '';
          // postal_code = '',
          // unit_number = '',
          // priority = '',
          // number_of_rooms = '',
          // android_app_name = '',
          // android_package = '',
          // android_url = '',
          // ios_app_name = '',
          // ios_app_store_id = '',
          // ios_url = '',
          // ipad_app_name = '',
          // ipad_app_store_id = '',
          // ipad_url = '',
          // iphone_app_name = '',
          // iphone_app_store_id = '',
          // iphone_url = '',
          // windows_phone_app_id = '',
          // windows_phone_app_name = '',
          // windows_phone_url = '',
          // video_url = '',
          // video_tag = '',
          // category = '';

      const { listingTitle, listingLink, listingDescription, listingImage, listingPrice, listingAddress, listingCity, listingImageTag, listingSalePrice, listingLatitude, listingLongitude, listingNeighborhood } = data.elementSelectors;

      // COLUMN B - TITLE / NAME
      if (listingTitle) {
          if (listingTitle.selector && !listingTitle.selectorIfAttribute) {
          // Get the text content of the title
          title = el.querySelector(listingTitle.selector)?.textContent?.trim() || '';
        } else if (listingTitle.selectorIfAttribute != null) {
          if (listingTitle.selector && listingTitle.selectorIfAttribute) {
            // Get the attribute value of the title
            title = el.querySelector(listingTitle.selector)?.getAttribute(listingTitle.selectorIfAttribute)?.trim() || '';
          } else if (listingTitle.selectorIfAttribute) {
            title = el.getAttribute(listingTitle.selectorIfAttribute)?.trim() || '';
          }
        }
      }

      // COLUMN C - BRAND
      brand = data.name;

      // COLUMN D - ADDRESS
      if (listingAddress) {
        if (listingAddress.selector && !listingAddress.selectorIfAttribute) {
          // Get the text content of the address
          address = el.querySelector(listingAddress.selector)?.textContent?.trim() || '';
        } else if (listingAddress.selectorIfAttribute != null) {
          if (listingAddress.selector && listingAddress.selectorIfAttribute) {
            // Get the attribute value of the address
            address = el.querySelector(listingAddress.selector)?.getAttribute(listingAddress.selectorIfAttribute)?.trim() || '';
          } else if (!listingAddress.selector && listingAddress.selectorIfAttribute) {
            address = el.getAttribute(listingAddress.selectorIfAttribute)?.trim() || '';
          }
        }
      }

      // COLUMN E - CITY
      if (listingCity) {
        if (listingCity.selector && !listingCity.selectorIfAttribute) {
          // Get the text content of the city
          city = el.querySelector(listingCity.selector)?.textContent?.trim() || '';
        } else if (listingCity.selectorIfAttribute != null) {
          if (listingCity.selector && listingCity.selectorIfAttribute) {
            // Get the attribute value of the city
            city = el.querySelector(listingCity.selector)?.getAttribute(listingCity.selectorIfAttribute)?.trim() || '';
          } else if (!listingCity.selector && listingCity.selectorIfAttribute) {
            city = el.getAttribute(listingCity.selectorIfAttribute)?.trim() || '';
          }
        }
      }

      // COLUMN F - URL / LINK
      if (listingLink) {
        if (listingLink.selector && !listingLink.selectorIfAttribute) {
          // Get the text content of the link
          link = (el.querySelector(listingLink.selector) as HTMLAnchorElement)?.href || '';
        } else if (listingLink.selectorIfAttribute != null) {
          if (listingLink.selector && listingLink.selectorIfAttribute) {
            // Get the attribute value of the link
            link = el.querySelector(listingLink.selector)?.getAttribute(listingLink.selectorIfAttribute)?.trim() || '';
          } else {
            link = el.getAttribute(listingLink.selectorIfAttribute)?.trim() || '';
          }
        }
      }
      
      // COLUMN G - IMAGE URL
      if (listingImage) {
        if (listingImage.selector && !listingImage.selectorIfAttribute) {
          // Get the text content of the image link
          image_link = (el.querySelector(listingImage.selector) as HTMLImageElement)?.src || '';
        } else if (listingImage.selectorIfAttribute != null) {
          if (listingImage.selector && listingImage.selectorIfAttribute) {
            // Get the attribute value of the image link
            image_link = el.querySelector(listingImage.selector)?.getAttribute(listingImage.selectorIfAttribute)?.trim() || '';
          } else {
            image_link = el.getAttribute(listingImage.selectorIfAttribute)?.trim() || '';
          }
        }
      }
      
      // COLUMN H - IMAGE TAG
      if (listingImageTag) {
        if (listingImageTag.selector && !listingImageTag.selectorIfAttribute) {
          // Get the text content of the image tag
          image_tag = el.querySelector(listingImageTag.selector)?.textContent?.trim() || '';
        } else if (listingImageTag.selectorIfAttribute != null) {
          if (listingImageTag.selector && listingImageTag.selectorIfAttribute) {
            // Get the attribute value of the image tag
            image_tag = el.querySelector(listingImageTag.selector)?.getAttribute(listingImageTag.selectorIfAttribute)?.trim() || '';
          } else if (!listingImageTag.selector && listingImageTag.selectorIfAttribute) {
            image_tag = el.getAttribute(listingImageTag.selectorIfAttribute)?.trim() || '';
          }
        }
      }

      // COLUMN I - DESCRIPTION
      if (listingDescription) {
        const descriptionSelector = listingDescription?.selector;
        if (descriptionSelector && listingDescription?.selectorIfAttribute === null) {
          // Get the text content of the description
          description = el.querySelector(descriptionSelector)?.textContent?.trim() || '';
        } else if (listingDescription?.selectorIfAttribute != null) {
          if (descriptionSelector && listingDescription?.selectorIfAttribute) {
            // Get the attribute value of the description
            description = el.querySelector(descriptionSelector)?.getAttribute(listingDescription.selectorIfAttribute)?.trim() || '';
          } else if (!descriptionSelector && listingDescription?.selectorIfAttribute) {
            description = el.getAttribute(listingDescription.selectorIfAttribute)?.trim() || '';
          }
        }
      }

      // COLUMN J - SALE PRICE
      if (listingSalePrice) {
        if (listingSalePrice.selector && !listingSalePrice.selectorIfAttribute) {
          // Get the text content of the sale price
          sale_price = el.querySelector(listingSalePrice.selector)?.textContent?.trim() || '';
        } else if (listingSalePrice.selectorIfAttribute != null) {
          if (listingSalePrice.selector && listingSalePrice.selectorIfAttribute) {
            // Get the attribute value of the sale price
            sale_price = el.querySelector(listingSalePrice.selector)?.getAttribute(listingSalePrice.selectorIfAttribute)?.trim() || '';
          } else {
            sale_price = el.getAttribute(listingSalePrice.selectorIfAttribute)?.trim() || '';
          }
        }
      }

      // COLUMN K - PRICE / BASE PRICE
      if (listingPrice) {
        if (listingPrice.selector && !listingPrice.selectorIfAttribute) {
          // Get the text content of the price
          price = el.querySelector(listingPrice.selector)?.textContent?.trim() || '';
        } else if (listingPrice.selectorIfAttribute != null) {
          if (listingPrice.selector && listingPrice.selectorIfAttribute) {
            // Get the attribute value of the price
            price = el.querySelector(listingPrice.selector)?.getAttribute(listingPrice.selectorIfAttribute)?.trim() || '';
          } else {
            price = el.getAttribute(listingPrice.selectorIfAttribute)?.trim() || '';
          }
        }
      }

      // COLUMN L - LATITUDE
      if (listingLatitude) {
        if (listingLatitude.selector && !listingLatitude.selectorIfAttribute) {
          // Get the text content of the latitude
          latitude = el.querySelector(listingLatitude.selector)?.textContent?.trim() || '';
        } else if (listingLatitude.selectorIfAttribute != null) {
          if (listingLatitude.selector && listingLatitude.selectorIfAttribute) {
            // Get the attribute value of the latitude
            latitude = el.querySelector(listingLatitude.selector)?.getAttribute(listingLatitude.selectorIfAttribute)?.trim() || '';
          } else {
            latitude = el.getAttribute(listingLatitude.selectorIfAttribute)?.trim() || '';
          }
        }
      }

      // COLUMN M - LONGITUDE
      if (listingLongitude) {
        if (listingLongitude.selector && !listingLongitude.selectorIfAttribute) {
          // Get the text content of the longitude
          longitude = el.querySelector(listingLongitude.selector)?.textContent?.trim() || '';
        } else if (listingLongitude.selectorIfAttribute != null) {
          if (listingLongitude.selector && listingLongitude.selectorIfAttribute) {
            // Get the attribute value of the longitude
            longitude = el.querySelector(listingLongitude.selector)?.getAttribute(listingLongitude.selectorIfAttribute)?.trim() || '';
          } else {
            longitude = el.getAttribute(listingLongitude.selectorIfAttribute)?.trim() || '';
          }
        }
      }

      // COLUMN N - NEIGHBORHOOD
      if (listingNeighborhood) {
        if (listingNeighborhood.selector && !listingNeighborhood.selectorIfAttribute) {
          // Get the text content of the neighborhood
          neighborhood = el.querySelector(listingNeighborhood.selector)?.textContent?.trim() || '';
        } else if (listingNeighborhood.selectorIfAttribute != null) {
          if (listingNeighborhood.selector && listingNeighborhood.selectorIfAttribute) {
            // Get the attribute value of the neighborhood
            neighborhood = el.querySelector(listingNeighborhood.selector)?.getAttribute(listingNeighborhood.selectorIfAttribute)?.trim() || '';
          } else {
            neighborhood = el.getAttribute(listingNeighborhood.selectorIfAttribute)?.trim() || '';
          }
        }
      }
      
      // COLUMN O - LOYALTY PROGRAM

      // COLUMN P - MARGIN LEVEL

      // COLUMN Q - STAR RATING

      // COLUMN R - ADDRESS 2

      // COLUMN S - ADDRESS 3

      // COLUMN T - CITY ID

      // COLUMN U - REGION

      // COLUMN V - POSTAL CODE

      // COLUMN W - UNIT NUMBER

      // COLUMN X - PRIORITY

      // COLUMN Y - NUMBER OF ROOMS

      // COLUMN Z - ANDROID APP NAME

      // COLUMN AA - ANDROID PACKAGE

      // COLUMN AB - ANDROID URL

      // COLUMN AC - IOS APP NAME

      // COLUMN AD - IOS APP STORE ID

      // COLUMN AE - IOS URL

      // COLUMN AF - IPAD APP NAME

      // COLUMN AG - IPAD APP STORE ID

      // COLUMN AH - IPAD URL

      // COLUMN AI - IPHONE APP NAME

      // COLUMN AJ - IPHONE APP STORE ID

      // COLUMN AK - IPHONE URL

      // COLUMN AL - WINDOWS PHONE APP ID

      // COLUMN AM - WINDOWS PHONE APP NAME

      // COLUMN AN - WINDOWS PHONE URL

      // COLUMN AO - VIDEO URL

      // COLUMN AP - VIDEO TAG

      // COLUMN AQ - CATEGORY

      results.push({
        title,
        brand,
        address,
        city,
        link,
        image_link,
        image_tag,
        description,
        sale_price,
        price,
        latitude,
        longitude,
        neighborhood,
        // loyalty_program,
        // margin_level,
        // star_rating,
        // address2,
        // address3,
        // city_id,
        region,
        // postal_code,
        // unit_number,
        // priority,
        // number_of_rooms,
        // android_app_name,
        // android_package,
        // android_url,
        // ios_app_name,
        // ios_app_store_id,
        // ios_url,
        // ipad_app_name,
        // ipad_app_store_id,
        // ipad_url,
        // iphone_app_name,
        // iphone_app_store_id,
        // iphone_url,
        // windows_phone_app_id,
        // windows_phone_app_name,
        // windows_phone_url,
        // video_url,
        // video_tag,
        // neighborhood,
        // latitude,
        // longitude,
        // category,
      });
    });

    return results;
  }, data);

  await browser.close();
  return listings;
}
