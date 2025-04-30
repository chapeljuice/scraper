# PMS Scraping Tool

A web app that uses Vite + ReactJS + ExpressJS + Puppeteer to scrape certain pieces of data from different property management websites, format the data, and load that data into Google Sheets so the data can be utilized elsewhere.

## Description

To start, you'll need to make sure the `client-structures.json` file is up-to-date with whatever clients you want and the selectors the tool can use in order to scrape the data. You'll also need to ensure the data includes the correct Google Sheet IDs so the correct Sheets get updated.

Once running, the tool is pretty self-explanitory. Select one or more clients in the UI, click "Update Google Sheet", and in a few moments your sheet(s) will be updated with the latest data.

## How to Edit `client-structures.json`

The `client-structures.json` file contains all the configuration needed for the scraper to work with different property management websites. Here's how to add or edit clients:

### File Location
The file is located at: `src/client/data/client-structures.json`

### Basic Structure
Each client has the following main properties:
- `id`: A unique identifier (for now it's just use sequential numbers)
- `name`: The client's name (displayed in the UI dropdown)
- `status`: Set to "active" to enable the client
- `listingsUrl`: The URL of the page that shows all listings
- `sheetId`: The Google Sheet ID where data will be stored for that client
    - Note: Multiple clients can use the same sheetId if desired
- `elementSelectors`: Contains all the CSS selectors that the JavaScript uses for scraping data off of the client pages.

### Adding a New Client

1. **Open the File**: Open `client-structures.json` in a text editor (like Notepad++, VS Code, or even regular Notepad)

2. **Copy an Existing Client**: Find the section between `{` and `}` for an existing client similar to the new one you want to add

3. **Paste at the End**: Add a comma after the closing `}` of the last client, then paste the copied client

4. **Update Basic Information**:
   - Change the `id` to a unique number
   - Update the `name` to the new client's name
   - Set the `listingsUrl` to the URL of the client's listings page (if there's an "All Listings" url, use that one)
   - Change the `sheetId` to the ID of the Google Sheet for this client
     (The Sheet ID is the long string in the URL: `https://docs.google.com/spreadsheets/d/SHEET_ID_IS_HERE/edit`)

5. **Update Element Selectors**: This is the most technical part, requiring some knowledge of CSS selectors:

   - **Essential Selectors to Update**:
     - `listingsPageContainer`: The element that contains each individual listing on the listings page. For instance, if the listings are in a `<ul>` element, then this container selector would be the children, aka `li`.
     - `listingDetailPageUrl`: The link to the detailed page for each listing. This is found on the main listings page and is usually the href from the `<a>` element.
     - `listingDetailContainer`: The main container on the detail page.
     - `listingTitle`: Where to find the property title. You can choose to point to the one on the main listings page or the detail page. Up to you.
     - `listingDescription`: Where to find the property description.
     - `listingImage`: The main/first property image.

   For each selector, you need to set:
   - `selector`: The CSS selector to find the element (e.g., `.property-title` or `#main-image`)
   - `selectorIfAttribute`: If the data is in an attribute, specify which one (or `null` if getting text content)
   - `getDataFromDetailsPage`: `true` if this data is on the detail page, `false` if it's on the listings page

### Example Client Entry

```json
{
  "id": "5",
  "name": "New Vacation Rentals",
  "status": "active",
  "listingsUrl": "https://www.newvacationrentals.com/properties",
  "sheetId": "1AbCdEfGhIjKlMnOpQrStUvWxYz12345678901234",
  "elementSelectors": {
    "listingsPageContainer": {
      "selector": ".property-card",
      "selectorIfAttribute": null,
      "getDataFromDetailsPage": false
    },
    "listingDetailPageUrl": {
      "selector": "a.property-link",
      "selectorIfAttribute": null,
      "getDataFromDetailsPage": false
    },
    "listingDetailContainer": {
      "selector": "#property-details",
      "selectorIfAttribute": null,
      "getDataFromDetailsPage": true
    },
    "listingTitle": {
      "selector": ".property-title h1",
      "selectorIfAttribute": null,
      "getDataFromDetailsPage": true
    },
    "listingDescription": {
      "selector": ".property-description",
      "selectorIfAttribute": null,
      "getDataFromDetailsPage": true
    },
    "listingPrice": {
      "selector": ".property-price",
      "selectorIfAttribute": null,
      "getDataFromDetailsPage": true
    },
    // ... other selectors
  }
}
```

### Tips for Finding CSS Selectors

1. **Use Browser Developer Tools**:
   - Right-click on an element you want to select and choose "Inspect" or "Inspect Element"
   - Look at the highlighted HTML in the developer tools
   - Right-click on the HTML element, choose "Copy" → "Copy selector"

2. **Keep Selectors Simple**: Use simple class or ID selectors when possible:
   - Classes start with `.` (e.g., `.property-title`)
   - IDs start with `#` (e.g., `#property-image`)

3. **Test Your Selectors**: In browser developer tools, press F12, go to Console tab, and type:
   ```javascript
   document.querySelector('your-selector-here')
   ```
   It should highlight the correct element if your selector works.

### Additional Notes

- For elements not present or not needed, use `null` for the selector
- Make sure to maintain proper JSON syntax (commas between entries, quotes around strings)
- Don't forget to save the file after making changes
- Test new clients with a small number of listings first

## Author

Ryan Chapel (hire me!)
* [ryanchapel.com](https://ryanchapel.com)
* [chapeljuice.dev](https://chapeljuice.dev)
* [LinkedIn](https://www.linkedin.com/in/ryanchapel/)
* [@chapeljuice.dev on BlueSky](https://bsky.app/profile/chapeljuice.dev)

## Version History

* 0.1.0
    * Initial Release
