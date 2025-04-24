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
  let listingsToUpdate: GenericObject[] = [];
  // loop through the array of selected clients in the JSON file and scrape each URL
  for (const [index, client] of selectedClientData.entries()) {
    onProgress?.(client.id, `Starting to scrape ${client.name}...`, (index / selectedClientData.length) * 100);
    const listings = await scrapeListings(client);
    onProgress?.(client.id, `Scraped ${listings.length} listings for ${client.name}`, ((index + 0.5) / selectedClientData.length) * 100);
    console.log(`Scraped listings for ${client.name}`);
    console.log(`Number of listings found: ${listings.length}`);
    listingsToUpdate.push(...listings);
    if (client.sheetId) {
      sheetIdToUpdate = client.sheetId;
    } else {
      sheetIdToUpdate = process?.env?.GOOGLE_SHEET_ID || '';
    }
    onProgress?.(client.id, `Processing data for ${client.name}...`, ((index + 0.75) / selectedClientData.length) * 100);
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
    // Clear the existing data in the sheet
    onProgress?.('all', 'Clearing existing data from sheet...', 90);
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetIdToUpdate,
      range: 'A2:AR'
    });
    console.log('Stale data removed...');

    const chunkSize = 1000; // Number of rows to insert at once
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const progress = 90 + ((i / rows.length) * 10);
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
    onProgress?.('all', 'Sheet updated successfully!', 100);
    console.log('Sheet(s) updated successfully!');
  } catch (err) {
    console.error('Error updating sheet:', err);
    onProgress?.('all', 'Error updating sheet: ' + (err as Error).message, 100);
  }
}
