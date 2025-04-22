export interface Results {
  title?: string;
  brand?: string;
  address?: string;
  city?: string;
  link?: string;
  image_link?: string;
  image_tag?: string;
  description?: string;
  sale_price?: string;
  price?: string;
  latitude?: string;
  longitude?: string;
  neighborhood?: string;
  loyalty_program?: string;
  margin_level?: string;
  star_rating?: string;
  address2?: string;
  address3?: string;
  city_id?: string;
  region?: string;
  postal_code?: string;
  unit_number?: string;
  priority?: string;
  number_of_rooms?: string;
  android_app_name?: string;
  android_package?: string;
  android_url?: string;
  ios_app_name?: string;
  ios_app_store_id?: string;
  ios_url?: string;
  ipad_app_name?: string;
  ipad_app_store_id?: string;
  ipad_url?: string;
  iphone_app_name?: string;
  iphone_app_store_id?: string;
  iphone_url?: string;
  windows_phone_app_id?: string;
  windows_phone_app_name?: string;
  windows_phone_url?: string;
  video_url?: string;
  video_tag?: string;
  category?: string;
}

export interface ClientDataType {
  id: string;
  name: string;
  status: string;
  listingsUrl: string;
  sheetId: string;
  elementSelectors: ElementSelectors;
}

export interface PageData {
  listingSelector: string;
  titleSelector?: string;
  linkSelector?: string;
  priceSelector?: string;
  locationSelector?: string;
  dateSelector?: string;
}

export interface ElementSelector {
  selector: string;
  selectorIfAttribute: string | null;
  getDataFromDetailsPage?: boolean;
}

export interface ElementSelectors {
  listingsPageContainer: ElementSelector;
  listingDetailPageUrl: ElementSelector;
  listingDetailContainer: ElementSelector;
  listingTitle: ElementSelector;
  listingDescription: ElementSelector;
  listingPrice: ElementSelector;
  listingImage: ElementSelector;
  listingAddress: ElementSelector;
  listingCity: ElementSelector;
  listingImageTag: ElementSelector;
  listingSalePrice: ElementSelector;
  listingLatitude: ElementSelector;
  listingLongitude: ElementSelector;
  listingNeighborhood: ElementSelector;
}