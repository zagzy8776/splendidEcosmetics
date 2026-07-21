# Requirements Document

## Introduction

This feature adds rich media capabilities to the Splendid Empire Cosmetics product catalog. It has two parts:

1. **Multiple Product Images Gallery** — Each product can have up to 4 images (1 main + 3 extras). The admin can upload all images in the product form. Product cards on the store show a small dot indicator when multiple images exist. The Quick View modal shows a proper image gallery with navigation between photos.

2. **Social Video Link ("Watch on Instagram/TikTok")** — Each product can optionally have a social video URL (Instagram Reel or TikTok). A small "▶ Watch" badge appears on the product card when a video URL is set. Clicking it opens the link in a new tab.

The backend Prisma schema already has `images String?` (stored as a JSON array) and `videoUrl String?` fields on the `Product` model. The `Product` TypeScript interface in `App.tsx` already declares `images?: string[]` and `videoUrl?: string`. This feature wires those fields end-to-end across the admin form, product cards, and Quick View modal.

## Glossary

- **Product**: A cosmetic item sold in the store, represented by the `Product` interface in `App.tsx` and the `products` database table.
- **Main_Image**: The primary image of a product, stored in the `image` field. Always required.
- **Extra_Images**: Up to 3 additional product images stored as a JSON array in the `images` field. Optional.
- **Gallery**: The ordered collection of all images for a product: [Main_Image, ...Extra_Images]. Maximum 4 images total.
- **Gallery_Indicator**: Small dot(s) rendered on a product card that signal the product has multiple images in its Gallery.
- **Gallery_Viewer**: The image display area inside the Quick_View_Modal that allows navigation between all images in the Gallery.
- **Social_Video_URL**: An optional Instagram Reel or TikTok URL stored in the `videoUrl` field of a product.
- **Watch_Badge**: A small "▶ Watch" pill badge rendered on a product card when the product has a Social_Video_URL.
- **Product_Card**: The individual product tile rendered in the store's product grid by `ProductsSection`.
- **Quick_View_Modal**: The full-screen product detail overlay (`ProductQuickViewModal` in `App.tsx`) that opens when a customer clicks "Quick View".
- **Admin_Product_Form**: The add/edit product form inside the admin "Products" tab.
- **Backend_API**: The Express + Prisma server in `backend/server.js`.
- **ProductData**: The TypeScript interface in `api.ts` that defines the shape of product data sent to/from the Backend_API.

---

## Requirements

### Requirement 1: Product Data Model — Extra Images

**User Story:** As a developer, I want the product data model to fully support storing and retrieving up to 3 extra images per product, so that the rest of the feature can read and write image arrays reliably.

#### Acceptance Criteria

1. THE `ProductData` interface in `api.ts` SHALL include an optional `images` field typed as `string[]`.
2. THE `ProductData` interface in `api.ts` SHALL include an optional `videoUrl` field typed as `string`.
3. WHEN the `GET /api/products` endpoint returns products, THE Backend_API SHALL parse the `images` JSON string from the database and return it as a JSON array in the response (empty array `[]` if null or invalid JSON).
4. WHEN the `POST /api/products` or `PATCH /api/products/:id` endpoint receives a request with an `images` array, THE Backend_API SHALL validate that it contains at most 3 items, that each item is a non-empty string with a maximum length of 2000 characters, and persist the array as a JSON string.
5. IF the `POST /api/products` or `PATCH /api/products/:id` endpoint receives an `images` array with more than 3 items, THEN THE Backend_API SHALL return HTTP 400 with the error message "Extra images must not exceed 3".
6. WHEN the `POST /api/products` or `PATCH /api/products/:id` endpoint receives a `videoUrl` value, THE Backend_API SHALL validate that it is a non-empty string of at most 500 characters and that it begins with `https://`.
7. IF the `videoUrl` value does not begin with `https://`, THEN THE Backend_API SHALL return HTTP 400 with the error message "Video URL must start with https://".

---

### Requirement 2: Admin Product Form — Extra Images Input

**User Story:** As an admin, I want to add up to 3 extra image URLs to any product, so that customers can view multiple angles or shades of a product.

#### Acceptance Criteria

1. THE Admin_Product_Form SHALL display an "Extra Images" section below the main image URL input, containing up to 3 labelled URL text input fields (Image 2, Image 3, Image 4).
2. WHEN an admin enters a URL in an Extra Images field and submits the form, THE Admin_Product_Form SHALL include the non-empty extra image URLs as the `images` array in the product payload sent to the Backend_API.
3. WHEN the Admin_Product_Form is opened in edit mode for a product that already has extra images, THE Admin_Product_Form SHALL pre-populate the Extra Images fields with the existing URLs from the product's `images` array.
4. WHEN an admin clears all Extra Images fields and saves, THE Admin_Product_Form SHALL send an empty `images` array `[]` in the product payload.
5. IF an admin enters more than one identical URL across the main image and extra image fields, THE Admin_Product_Form SHALL display an inline warning message "Duplicate image URL detected" but SHALL still allow the form to be submitted.
6. THE Admin_Product_Form SHALL NOT require the Extra Images fields to be filled; the form SHALL be submittable with zero extra images.

---

### Requirement 3: Admin Product Form — Social Video URL Input

**User Story:** As an admin, I want to add an optional Instagram Reel or TikTok link to a product, so that customers can watch a video of the product in use directly from the store.

#### Acceptance Criteria

1. THE Admin_Product_Form SHALL display a "Social Video URL" text input field labelled "Instagram Reel or TikTok URL (optional)".
2. WHEN an admin enters a URL in the Social Video URL field and submits the form, THE Admin_Product_Form SHALL include the URL as the `videoUrl` field in the product payload sent to the Backend_API.
3. WHEN the Admin_Product_Form is opened in edit mode for a product that already has a Social Video URL, THE Admin_Product_Form SHALL pre-populate the Social Video URL field with the existing value.
4. IF an admin enters a value in the Social Video URL field that does not start with `https://`, THEN THE Admin_Product_Form SHALL display an inline validation error "Video URL must start with https://" and SHALL NOT submit the form.
5. WHEN an admin clears the Social Video URL field and saves, THE Admin_Product_Form SHALL send the `videoUrl` field as `null` or omit it from the payload.
6. THE Admin_Product_Form SHALL NOT require the Social Video URL field to be filled; the form SHALL be submittable without a video URL.

---

### Requirement 4: Product Card — Gallery Dot Indicator

**User Story:** As a customer browsing the store, I want to see a visual indicator on product cards that have multiple images, so that I know more photos are available before I open the Quick View.

#### Acceptance Criteria

1. WHEN a product has one or more Extra_Images (i.e., `images` array length > 0), THE Product_Card SHALL render a Gallery_Indicator consisting of small dots at the bottom of the card image area.
2. THE Gallery_Indicator SHALL display one dot per image in the Gallery (including the Main_Image), up to a maximum of 4 dots.
3. THE first dot in the Gallery_Indicator SHALL be styled as active/filled to represent the Main_Image being currently shown on the card.
4. WHEN a product has no Extra_Images (i.e., `images` array is empty or absent), THE Product_Card SHALL NOT render a Gallery_Indicator.
5. THE Gallery_Indicator dots SHALL be rendered in a row, horizontally centered at the bottom of the card image container, overlapping the image slightly.

---

### Requirement 5: Product Card — Watch Badge

**User Story:** As a customer, I want to see a "▶ Watch" badge on product cards that have a social video, so that I can discover and view the product video easily.

#### Acceptance Criteria

1. WHEN a product has a non-empty `videoUrl`, THE Product_Card SHALL render a Watch_Badge overlaid on the card image.
2. THE Watch_Badge SHALL display the text "▶ Watch" and be styled as a small pill-shaped badge.
3. WHEN a customer clicks the Watch_Badge, THE Product_Card SHALL open the product's `videoUrl` in a new browser tab.
4. WHEN a customer clicks the Watch_Badge, THE Product_Card SHALL stop the click event from propagating to the parent card (preventing the Quick View from opening simultaneously).
5. WHEN a product has no `videoUrl` or an empty `videoUrl`, THE Product_Card SHALL NOT render a Watch_Badge.

---

### Requirement 6: Quick View Modal — Image Gallery Viewer

**User Story:** As a customer, I want to browse all images of a product inside the Quick View modal, so that I can examine a product thoroughly before adding it to my cart.

#### Acceptance Criteria

1. WHEN a product has Extra_Images, THE Quick_View_Modal SHALL display a Gallery_Viewer that shows all images in the Gallery (Main_Image first, then Extra_Images in order).
2. THE Gallery_Viewer SHALL display one image at a time, with the active image shown full-size in the image container.
3. THE Gallery_Viewer SHALL provide a left and right navigation arrow that, when clicked, advances the active image to the previous or next image in the Gallery respectively.
4. WHEN the active image is the first in the Gallery and the user clicks the left arrow, THE Gallery_Viewer SHALL wrap around to display the last image.
5. WHEN the active image is the last in the Gallery and the user clicks the right arrow, THE Gallery_Viewer SHALL wrap around to display the first image.
6. THE Gallery_Viewer SHALL display dot indicators below the active image, with one dot per image. The dot corresponding to the currently active image SHALL be styled distinctly (filled/opaque) compared to inactive dots.
7. THE Gallery_Viewer SHALL support swipe gestures on touch devices: a left swipe SHALL advance to the next image, and a right swipe SHALL return to the previous image, with the same wrap-around behaviour as arrows.
8. WHEN a product has no Extra_Images (only a Main_Image), THE Quick_View_Modal SHALL display the single image without navigation arrows or dot indicators.
9. WHEN the Quick_View_Modal opens, THE Gallery_Viewer SHALL always initialise with the first image (Main_Image) active, regardless of the previously viewed product.

---

### Requirement 7: Quick View Modal — Watch Button

**User Story:** As a customer, I want to see a "Watch on Instagram/TikTok" button in the Quick View modal when a product has a social video, so that I can view the full video in context.

#### Acceptance Criteria

1. WHEN a product has a non-empty `videoUrl`, THE Quick_View_Modal SHALL render a "Watch on Instagram / TikTok" button in the product details section.
2. WHEN a customer clicks the "Watch on Instagram / TikTok" button, THE Quick_View_Modal SHALL open the `videoUrl` in a new browser tab.
3. THE "Watch on Instagram / TikTok" button SHALL be visually distinguishable from the "Add to Cart" button (different style, e.g., outlined/ghost variant).
4. WHEN a product has no `videoUrl`, THE Quick_View_Modal SHALL NOT render the "Watch on Instagram / TikTok" button.
5. THE "Watch on Instagram / TikTok" button SHALL display a TikTok or Instagram icon alongside the label text to provide visual context for the link destination.

---

### Requirement 8: API Functions in api.ts

**User Story:** As a developer, I want `api.ts` to correctly handle the new `images` and `videoUrl` fields when creating and updating products, so that admin actions persist correctly to the backend.

#### Acceptance Criteria

1. THE `createProduct` function in `api.ts` SHALL accept a `ProductData` payload that includes optional `images` and `videoUrl` fields and pass them in the request body without modification.
2. THE `updateProduct` function in `api.ts` SHALL accept a `Partial<ProductData>` payload that includes optional `images` and `videoUrl` fields and pass them in the request body without modification.
3. WHEN the Backend_API returns a product object, THE `fetchProducts` function in `api.ts` SHALL return the product with its `images` field as a `string[]` (not a raw JSON string).
4. THE `ProductData` interface in `api.ts` SHALL define `images` as `string[]` and `videoUrl` as `string | undefined`, and these types SHALL be consistent with the `Product` interface in `App.tsx`.
