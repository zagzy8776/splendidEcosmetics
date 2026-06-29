# Requirements Document

## Introduction

This feature adds a dynamic product category management system to the Splendid Empire Cosmetics admin panel. Currently, product categories (Foundation, Lipstick, Serum, Eyeliner, Moisturizer, Perfume) are hardcoded in multiple places across `App.tsx`. The admin should be able to create, rename, and delete categories from a new "Categories" tab in the admin panel, with all changes propagating automatically to the store's category filter, the product form dropdown, and the site footer. Categories will be persisted in the existing `AdminSetting` table as a JSON string (key: `categories`). This feature also fixes a horizontal scroll/overflow bug in the admin panel layout that causes the page to shift left and right.

## Glossary

- **Admin_Panel**: The authenticated management interface accessible to the store administrator.
- **Category**: A named product classification (e.g., "Foundation", "Lipstick") used to group and filter products in the store. "All" is a reserved pseudo-category used for filtering and is never stored as a real category.
- **Category_Manager**: The new "Categories" tab component within the Admin_Panel that allows CRUD operations on categories.
- **Category_Filter**: The horizontal scrollable row of category buttons on the store's product page that allows customers to filter products by category.
- **Product_Form**: The add/edit product form inside the admin "Products" tab, which contains a category dropdown.
- **Store_Footer**: The footer of the storefront that lists product categories as navigation links.
- **CategorySetting**: The single `AdminSetting` database record with key `"categories"` whose value is a JSON-encoded array of category name strings.
- **Backend_API**: The Express + Prisma server in `backend/server.js` that handles all data persistence.
- **Admin_Layout**: The outer wrapper of the Admin_Panel page that constrains content width and controls scrolling behavior.

---

## Requirements

### Requirement 1: Category Persistence via Backend

**User Story:** As an admin, I want category data to be saved to the database, so that category changes survive page refreshes and server restarts.

#### Acceptance Criteria

1. THE Backend_API SHALL expose a `GET /api/admin/categories` endpoint that returns the current list of category names as a JSON array.
2. THE Backend_API SHALL expose a `PUT /api/admin/categories` endpoint, protected by `requireAdminAuth`, that accepts a JSON array of category name strings and persists them as the `CategorySetting` record.
3. WHEN the `GET /api/admin/categories` endpoint is called and no `CategorySetting` record exists, THE Backend_API SHALL return the default category list `["Foundation", "Lipstick", "Serum", "Eyeliner", "Moisturizer", "Perfume"]`.
4. WHEN the `PUT /api/admin/categories` endpoint receives a valid non-empty array, THE Backend_API SHALL upsert the `CategorySetting` record with key `"categories"` and return the updated array with HTTP 200.
5. IF the `PUT /api/admin/categories` endpoint receives a request body that is not a non-empty array of non-empty strings, THEN THE Backend_API SHALL return HTTP 400 with a descriptive error message.

---

### Requirement 2: Frontend Category State and API Integration

**User Story:** As a developer, I want the frontend to load categories dynamically from the API, so that all store components reflect the current admin-managed category list.

#### Acceptance Criteria

1. THE App component SHALL fetch the category list from `GET /api/admin/categories` on initial mount and store it in a React state variable shared across the component tree.
2. WHEN the API fetch fails during initial load, THE App component SHALL fall back to the default hardcoded list `["Foundation", "Lipstick", "Serum", "Eyeliner", "Moisturizer", "Perfume"]` and continue functioning without error.
3. THE `api.ts` module SHALL export a `fetchCategories` function that calls `GET /api/admin/categories` and returns a `string[]`.
4. THE `api.ts` module SHALL export an `updateCategories` function that calls `PUT /api/admin/categories` with an `Authorization` header and a `string[]` payload, and returns the saved `string[]`.
5. WHEN the Category_Manager successfully saves changes, THE App component SHALL update its shared category state so all downstream components re-render with the new list.

---

### Requirement 3: Category Manager — Add Category

**User Story:** As an admin, I want to add new product categories, so that I can expand the store's product taxonomy without touching code.

#### Acceptance Criteria

1. THE Category_Manager SHALL display a text input field and an "Add" button for creating new categories.
2. WHEN an admin types a category name and clicks "Add" (or presses Enter), THE Category_Manager SHALL trim whitespace from the input, append the new category to the list, call `PUT /api/admin/categories` with the updated list, and clear the input field on success.
3. IF the admin attempts to add a category whose name, after trimming, is empty, THEN THE Category_Manager SHALL display an inline validation error and SHALL NOT call the API.
4. IF the admin attempts to add a category name that already exists in the list (case-insensitive comparison), THEN THE Category_Manager SHALL display an inline error message stating the category already exists and SHALL NOT call the API.
5. IF the `PUT /api/admin/categories` API call fails, THEN THE Category_Manager SHALL display an error message and SHALL NOT add the category to the local state.
6. WHEN a new category is successfully added, THE Category_Manager SHALL display the new category in the list immediately without requiring a page reload.

---

### Requirement 4: Category Manager — Rename Category

**User Story:** As an admin, I want to rename existing categories, so that I can correct typos or update product taxonomy without deleting and re-adding categories.

#### Acceptance Criteria

1. THE Category_Manager SHALL display an edit/rename button next to each category in the list.
2. WHEN an admin clicks the rename button for a category, THE Category_Manager SHALL replace that category's display with an inline text input pre-filled with the current category name.
3. WHEN an admin confirms a rename (by pressing Enter or clicking a confirm button), THE Category_Manager SHALL trim the new name, replace the old category name in the list, call `PUT /api/admin/categories` with the updated list, and exit inline-edit mode.
4. IF the admin confirms a rename with an empty or whitespace-only name, THEN THE Category_Manager SHALL display an inline validation error and SHALL NOT call the API.
5. IF the admin confirms a rename to a name that already exists in the list (case-insensitive, excluding the item being renamed), THEN THE Category_Manager SHALL display an inline error and SHALL NOT call the API.
6. IF the `PUT /api/admin/categories` API call fails during a rename, THEN THE Category_Manager SHALL display an error message and SHALL revert the displayed name to the original.
7. WHEN an admin presses Escape while in inline-edit mode, THE Category_Manager SHALL cancel the rename and restore the original category name without calling the API.

---

### Requirement 5: Category Manager — Delete Category

**User Story:** As an admin, I want to delete unused product categories, so that I can keep the store's category list clean and relevant.

#### Acceptance Criteria

1. THE Category_Manager SHALL display a delete button next to each category in the list.
2. WHEN an admin clicks the delete button for a category that has one or more products assigned to it, THE Category_Manager SHALL display a confirmation warning that states how many products use that category and ask the admin to confirm before proceeding.
3. WHEN an admin clicks the delete button for a category that has zero products assigned to it, THE Category_Manager SHALL delete the category immediately without a confirmation prompt.
4. WHEN an admin confirms deletion of a category, THE Category_Manager SHALL remove the category from the list, call `PUT /api/admin/categories` with the updated list, and update the local state on success.
5. IF the `PUT /api/admin/categories` API call fails during deletion, THEN THE Category_Manager SHALL display an error message and SHALL NOT remove the category from the local state.
6. THE Category_Manager SHALL prevent deletion of the last remaining category, displaying an error message if the admin attempts to do so.

---

### Requirement 6: New "Categories" Tab in Admin Panel

**User Story:** As an admin, I want a dedicated tab for managing categories, so that I can find category management tools without cluttering the Products tab.

#### Acceptance Criteria

1. THE Admin_Panel SHALL include a "CATEGORIES" tab button in its navigation tab bar, alongside the existing "ORDERS", "PRODUCTS", and "SECURITY" tabs.
2. WHEN the "CATEGORIES" tab is active, THE Admin_Panel SHALL render the Category_Manager component in the tab content area.
3. THE `AdminTab` type in `App.tsx` SHALL be updated to include `"categories"` as a valid tab value.
4. THE Admin_Panel tab bar SHALL display the Categories tab in the following order: ORDERS, PRODUCTS, CATEGORIES, SECURITY.

---

### Requirement 7: Dynamic Category Propagation to Store Components

**User Story:** As a customer, I want the store's category filter and footer to always reflect the current category list, so that I can browse products using up-to-date categories.

#### Acceptance Criteria

1. THE Category_Filter component (`CategorySection`) SHALL derive its category list from the shared App-level category state instead of a hardcoded array.
2. THE Product_Form category dropdown in `AdminProducts` SHALL derive its options from the shared App-level category state instead of a hardcoded array.
3. THE Store_Footer (`SiteFooter`) SHALL derive its "Shop Categories" link list from the shared App-level category state instead of a hardcoded array.
4. WHEN the Category_Manager adds, renames, or deletes a category, THE Category_Filter, Product_Form, and Store_Footer SHALL update to reflect the change without requiring a page reload.
5. THE `CAT_IMAGES` constant SHALL be updated to a mutable mapping pattern so that categories without a predefined image use a sensible fallback image URL instead of causing a runtime error.
6. WHEN a product's assigned category is deleted, THE Product_Form SHALL not crash; it SHALL display the product's category field with the stored (now-deleted) category name retained for reference until the admin explicitly updates the product.

---

### Requirement 8: Admin Layout Horizontal Overflow Fix

**User Story:** As an admin, I want the admin panel page to stay stable without horizontal scrolling or shifting, so that I can use the management interface comfortably without layout disruption.

#### Acceptance Criteria

1. THE Admin_Layout outer wrapper `div` SHALL have `overflowX: "hidden"` applied as an inline style.
2. THE stats bar container `div` within the Admin_Panel SHALL have `overflowX: "hidden"` applied.
3. THE tab navigation container `div` within the Admin_Panel SHALL have `overflowX: "hidden"` applied.
4. THE tab content wrapper `div` within the Admin_Panel SHALL have `overflowX: "hidden"` applied.
5. WHILE the admin is authenticated and viewing the Admin_Panel, THE Admin_Layout SHALL NOT produce a horizontal scrollbar on any viewport width of 320px or wider.
6. THE admin login screen container SHALL have `overflowX: "hidden"` applied to prevent horizontal shifting on the login page.
