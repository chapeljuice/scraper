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

export async function updateSheet(clientIds: string[]) {
  // Check if the clientIds array is empty
  if (clientIds.length === 0) {
    console.log('No client IDs provided. Exiting...');
    return;
  }
  const allClientData = data.clients as ClientDataType[];
  const selectedClientData = allClientData.filter(obj => clientIds.includes(obj.id));
  if (selectedClientData.length === 0) {
    console.log('No matching client data found. Exiting...');
    return;
  }
  
  let sheetIdToUpdate = '';
  let listingsToUpdate: GenericObject[] = [];
  // loop through the array of selected clients in the JSON file and scrape each URL
  for (const client of selectedClientData) {
    const listings = await scrapeListings(client);
    console.log(`Scraped listings for ${client.name}`);
    console.log(`Number of listings found: ${listings.length}`);
    listingsToUpdate.push(...listings);
    if (client.sheetId) {
      sheetIdToUpdate = client.sheetId;
    } else {
      sheetIdToUpdate = process?.env?.GOOGLE_SHEET_ID || '';
    }
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
    null,
    listing.price,
    listing.latitude,
    listing.longitude,
    listing.neighborhood,
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
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetIdToUpdate,
      range: 'A2:AR'
    });
    console.log('Stale data removed...');

    const chunkSize = 1000; // Number of rows to insert at once
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      
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
    console.log('Sheet(s) updated successfully!');
  } catch (err) {
    console.error('Error updating sheet:', err);
  }
}
