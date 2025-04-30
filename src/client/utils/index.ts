import { google } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import * as data from './../data/client-structures.json' assert { type: 'json' };
import { scrapeListings } from '../../server/scraper.js';
import type { ClientDataType } from '../../types/types.js';

dotenv.config();

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const privateKey = process.env.GOOGLE_PRIVATE_KEY;
if (!privateKey) {
  throw new Error('GOOGLE_PRIVATE_KEY is not defined in .env file');
}

const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
if (!serviceAccountEmail) {
  throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL is not defined in .env file');
}

const auth = new google.auth.JWT(
  serviceAccountEmail,
  undefined,
  privateKey.replace(/\\n/g, '\n'),
  SCOPES
);

const sheets = google.sheets({ version: 'v4', auth });

interface GenericObject {
  [key: string]: any;
}

const findObjectWithValue = (
  array: GenericObject[],
  key: string,
  value: any
): GenericObject | undefined => {
  return array.find(obj => obj[key] === value);
};

export async function updateSheet(clientIds: string[], onProgress?: (clientId: string, message: string, progress?: number) => void) {
  // Check if the clientIds array is empty
  if (clientIds.length === 0) {
    console.log('No client IDs provided. Exiting...');
    return;
  }
  const allClientData = data.clients as unknown as ClientDataType[];
  const selectedClientData = allClientData.filter(obj => clientIds.includes(obj.id));
  if (selectedClientData.length === 0) {
    console.log('No matching client data found. Exiting...');
    return;
  }
  
  let sheetIdToUpdate = '';
  // Get the sheetId from the first client or fallback to env variable
  for (const client of selectedClientData) {
    if (client.sheetId) {
      sheetIdToUpdate = client.sheetId;
      break;
    }
  }
  if (!sheetIdToUpdate) {
    sheetIdToUpdate = process?.env?.GOOGLE_SHEET_ID || '';
  }
  
  // Clear the sheet at the beginning of the process
  try {
    onProgress?.('all', 'Clearing existing data from sheet...', 10);
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetIdToUpdate,
      range: 'A2:AR'
    });
    console.log('Sheet cleared successfully...');
  } catch (err) {
    console.error('Error clearing sheet:', err);
    onProgress?.('all', 'Error clearing sheet: ' + (err as Error).message, 10);
    // Continue with the process despite sheet clearing error
  }
  
  let listingsToUpdate: GenericObject[] = [];
  const failedClients: string[] = []; // Track which clients failed
  const successfulClients: string[] = []; // Track which clients succeeded
  
  // Loop through the array of selected clients in the JSON file and scrape each URL
  for (const [index, client] of selectedClientData.entries()) {
    try {
      onProgress?.(client.id, `Starting to scrape ${client.name}...`, (index / selectedClientData.length) * 80);
      const listings = await scrapeListings(client);
      
      if (listings.length === 0) {
        // Consider zero listings as an error case
        throw new Error(`No listings found for ${client.name}`);
      }
      
      onProgress?.(client.id, `Scraped ${listings.length} listings for ${client.name}`, ((index + 0.5) / selectedClientData.length) * 80);
      console.log(`Scraped listings for ${client.name}`);
      console.log(`Number of listings found: ${listings.length}`);
      listingsToUpdate.push(...listings);
      onProgress?.(client.id, `Processing data for ${client.name}...`, ((index + 0.75) / selectedClientData.length) * 80);
      successfulClients.push(client.name);
    } catch (error) {
      console.error(`Error scraping client ${client.name}:`, error);
      onProgress?.(client.id, `Error scraping ${client.name}: ${(error as Error).message}`, ((index + 0.75) / selectedClientData.length) * 80);
      failedClients.push(client.name);
      // Continue with the next client
    }
  }

  // Skip sheet update if no listings were scraped
  if (listingsToUpdate.length === 0) {
    console.log('No listings were scraped. Skipping sheet update.');
    if (failedClients.length > 0) {
      const failedClientsList = failedClients.join(', ');
      onProgress?.('all', `No data to write to sheet. All clients failed: ${failedClientsList}`, 100);
    } else {
      onProgress?.('all', 'No listings were scraped. Process complete.', 100);
    }
    return;
  }

  const rows = listingsToUpdate.map(listing => ([
    uuidv4(),
    listing.title,
    listing.brand,
    listing.address,
    listing.city,
    listing.link,
    listing.image_link,
    listing.image_tag,
    listing.description,
    listing.sale_price,
    listing.price,
    listing.latitude,
    listing.longitude,
    listing.neighborhood,
    listing.loyalty_program,
    listing.margin_level,
    listing.star_rating,
    listing.address2,
    listing.address3,
    listing.postal_code,
    listing.unit_number,
    listing.priority,
    listing.number_of_rooms,
    listing.android_app_name,
    listing.android_package,
    listing.android_url,
    listing.ios_app_name,
    listing.ios_app_store_id,
    listing.ios_url,
    listing.ipad_app_name,
    listing.ipad_app_store_id,
    listing.ipad_url,
    listing.iphone_app_name,
    listing.iphone_app_store_id,
    listing.iphone_url,
    listing.windows_phone_app_id,
    listing.windows_phone_app_name,
    listing.windows_phone_url,
    listing.video_url,
    listing.video_tag,
    listing.category,
  ]));

  // Add headers to the first row
  rows.unshift([
    'hotel_id',
    'name',
    'brand',
    'address.addr1',
    'address.city',
    'url',
    'image[0].url',
    'image[0].tag[0]',
    'description',
    'sale_price',
    'base_price',
    'latitude',
    'longitude',
    'neighborhood',
    'loyalty_program',
    'margin_level',
    'star_rating',
    'address.addr2',
    'address.addr3',
    'address.city_id',
    'address.region',
    'address.postal_code',
    'address.unit_number',
    'priority',
    'number_of_rooms',
    'applink.android_app_name',
    'applink.android_package',
    'applink.android_url',
    'applink.ios_app_name',
    'applink.ios_app_store_id',
    'applink.ios_url',
    'applink.ipad_app_name',
    'applink.ipad_app_store_id',
    'applink.ipad_url',
    'applink.iphone_app_name',
    'applink.iphone_app_store_id',
    'applink.iphone_url',
    'applink.windows_phone_app_id',
    'applink.windows_phone_app_name',
    'applink.windows_phone_url',
    'video[0].url',
    'video[0].tag[0]',
    'category',
  ]);

  try {
    const chunkSize = 1000; // Number of rows to insert at once
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const progress = 80 + ((i / rows.length) * 20);
      onProgress?.('all', `Updating sheet with new data (${i + chunk.length}/${rows.length} rows)...`, progress);
      
      // Update the sheet with new data
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetIdToUpdate,
        range: 'Sheet1!A1',
        valueInputOption: 'RAW',
        requestBody: {
          values: rows
        }
      });
    }
    
    // Generate completion message that includes success and failure information
    let completionMessage = 'Sheet updated successfully!';
    
    if (successfulClients.length > 0) {
      completionMessage += ` Data from ${successfulClients.length} client(s) was written to the sheet.`;
    }
    
    if (failedClients.length > 0) {
      completionMessage += ` ${failedClients.length} client(s) could not be scraped: ${failedClients.join(', ')}.`;
    }
    
    onProgress?.('all', completionMessage, 100);
    console.log('Sheet(s) updated successfully!');
    if (failedClients.length > 0) {
      console.log(`Failed clients: ${failedClients.join(', ')}`);
    }
  } catch (err) {
    console.error('Error updating sheet:', err);
    let errorMessage = 'Error updating sheet: ' + (err as Error).message;
    
    if (successfulClients.length > 0 || failedClients.length > 0) {
      if (successfulClients.length > 0) {
        errorMessage += ` Successfully scraped clients: ${successfulClients.join(', ')}.`;
      }
      if (failedClients.length > 0) {
        errorMessage += ` Failed clients: ${failedClients.join(', ')}.`;
      }
    }
    
    onProgress?.('all', errorMessage, 100);
  }
}
