# PMS Scraping Tool

A web app that uses Vite + ReactJS + ExpressJS + Puppeteer to scrape certain pieces of data from different property management websites, format the data, and load that data into Google Sheets so the data can be utilized elsewhere.

## Description

To start, you'll need to make sure the `client-structures.json` file is up-to-date with whatever clients you want and the selectors the tool can use in order to scrape the data. You'll also need to ensure the data includes the correct Google Sheet IDs so the correct Sheets get updated.

Once running, the tool is pretty self-explanitory. Select one or more clients in the UI, click "Update Google Sheet", and in a few moments your sheet(s) will be updated with the latest data.

## Author

Ryan Chapel (hire me!)
* [ryanchapel.com](https://ryanchapel.com)
* [chapeljuice.dev](https://chapeljuice.dev)
* [LinkedIn](https://www.linkedin.com/in/ryanchapel/)
* [@chapeljuice.dev on BlueSky](https://bsky.app/profile/chapeljuice.dev)

## Version History

* 0.1.0
    * Initial Release
