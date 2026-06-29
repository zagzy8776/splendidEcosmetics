# Requirements Document

## Introduction

This feature integrates [Resend](https://resend.com) as the transactional email service for Splendid Empire Cosmetics. The store currently has no email system — all customer communication is done via WhatsApp. This integration adds automated, on-brand HTML email notifications at the three most important moments in the customer journey: order placement, dispatch, and delivery. It also adds email collection to the checkout flow and a new "delivered" order status so the admin can complete the full fulfilment lifecycle.

## Glossary

- **Email_Service**: The Resend API client instance used by the backend to send transactional emails.
- **Order**: A record in the PostgreSQL database (via Prisma) representing a customer purchase, identified by a CUID.
- **Order_Status**: One of the five allowed lifecycle values for an Order: `pending`, `verifying`, `confirmed`, `dispatched`, `delivered`.
- **CheckoutModal**: The React modal component in the frontend (`App.tsx`) that collects customer details during checkout; it has two steps — `info` (customer details) and `payment` (bank transfer instructions).
- **Admin_Panel**: The protected admin interface in `App.tsx` where the store owner advances order statuses.
- **Email_Template**: An HTML string rendered server-side and sent via the Email_Service; styled using inline CSS to match the Splendid Empire brand.
- **Confirmation_Email**: The transactional email sent to the customer immediately after a new order is created.
- **Dispatch_Email**: The transactional email sent to the customer when the admin advances an order to `dispatched`.
- **Delivery_Email**: The transactional email sent to the customer when the admin advances an order to `delivered`; includes a review request.
- **RESEND_API_KEY**: The environment variable holding the Resend API secret key.
- **RESEND_FROM**: The environment variable holding the sender address in the format `Name <email@domain>`.
- **RESEND_REPLY_TO**: The environment variable holding the reply-to address for customer replies.
- **Validator**: The input validation logic that checks email format on the frontend before allowing checkout to proceed.
- **Order_Router**: The Express route handlers in `server.js` that handle `POST /api/orders` and `PATCH /api/orders/:id/status`.

---

## Requirements

### Requirement 1: Email Collection at Checkout

**User Story:** As a customer, I want to provide my email address during checkout, so that I can receive order updates directly in my inbox.

#### Acceptance Criteria

1. THE CheckoutModal SHALL render an email input field in the `info` step, displayed after the WhatsApp number field.
2. WHEN a customer attempts to proceed from the `info` step, THE Validator SHALL verify the email string contains exactly one `@` symbol with at least one non-whitespace character before it and a domain part (containing a `.`) after it, and does not exceed 254 characters total.
3. IF the email field is empty or contains only whitespace when the customer attempts to proceed, THEN THE CheckoutModal SHALL disable the "CONTINUE TO PAYMENT" button and display the inline message "Please enter your email address" below the email field.
4. IF the email field contains a non-empty value that fails the format check when the customer attempts to proceed, THEN THE CheckoutModal SHALL disable the "CONTINUE TO PAYMENT" button and display the inline message "Please enter a valid email address" below the email field.
5. IF a customer has entered a name of at least 2 non-whitespace characters, a phone number of at least 10 digits, and an email address that passes the format check, THEN THE CheckoutModal SHALL enable the "CONTINUE TO PAYMENT" button.
6. THE checkout order payload sent to the backend SHALL include the customer's email address as a top-level field alongside `customerName`, `phone`, `total`, and `items`.

---

### Requirement 2: Email Persistence on the Order Record

**User Story:** As a store owner, I want every order to store the customer's email address, so that the backend can send emails at any point in the order lifecycle.

#### Acceptance Criteria

1. THE Order Prisma model SHALL include an `email` field of type `String`, making it a required column in the `orders` database table.
2. WHEN `POST /api/orders` is called with an `email` field that contains a non-empty string matching the format `local-part@domain` (where local-part is at most 64 characters and the full address is at most 254 characters), THE Order_Router SHALL persist that email value on the created Order record.
3. IF `POST /api/orders` is called with a missing `email` field, a `null` value, or an empty string (including whitespace-only strings), THEN THE Order_Router SHALL return a `400` status with the error body `{ "error": "Missing required order fields" }` without creating an Order record.
4. WHEN `PATCH /api/orders/:id/status` is called and the status update succeeds, THE Order_Router SHALL return a response body that includes the Order's `email` field alongside all other order fields.

---

### Requirement 3: Email Service Initialisation

**User Story:** As a developer, I want the Resend email client to be configured from environment variables, so that API credentials are never hardcoded and are easily changed per environment.

#### Acceptance Criteria

1. THE Email_Service SHALL be initialised using the value of the `RESEND_API_KEY` environment variable; the key SHALL NOT appear as a string literal anywhere in source code.
2. IF `RESEND_API_KEY` is not set or is an empty string at server startup, THEN THE server SHALL print a fatal error message to stderr and exit with a non-zero exit code before accepting any requests.
3. THE Email_Service SHALL use the value of `RESEND_FROM` as the `from` field for every outgoing email; `RESEND_FROM` SHALL contain a valid RFC 5321 email address (optionally in `Display Name <addr>` format).
4. THE Email_Service SHALL use the value of `RESEND_REPLY_TO` as the `reply_to` field for every outgoing email; `RESEND_REPLY_TO` SHALL contain a valid RFC 5321 email address.
5. IF `RESEND_FROM` or `RESEND_REPLY_TO` are not set or are empty strings at server startup, THEN THE server SHALL print a fatal error message to stderr and exit with a non-zero exit code before accepting any requests.
6. THE `.env.example` file SHALL include entries for `RESEND_API_KEY` (with a comment stating it is the Resend API secret key obtained from resend.com), `RESEND_FROM` (with a comment showing the expected `Display Name <email@domain>` format), and `RESEND_REPLY_TO` (with a comment stating it is the address customer replies will be routed to).

---

### Requirement 4: Order Confirmation Email

**User Story:** As a customer, I want to receive a confirmation email immediately after placing my order, so that I know my order was received and I have the bank transfer details as a reference.

#### Acceptance Criteria

1. WHEN `POST /api/orders` successfully persists an Order record to the database, THE Email_Service SHALL initiate sending a Confirmation_Email to the customer's stored email address as a fire-and-forget operation after the record is saved.
2. THE Confirmation_Email subject SHALL be `"Your Order Confirmation – [Order ID]"` where `[Order ID]` is replaced with the CUID of the newly created Order.
3. THE Confirmation_Email body SHALL include: the customer's name, the Order ID as the payment reference, a line-item table where each row contains the product name, quantity, and line total (calculated as price × quantity and displayed as `₦X,XXX.XX`), the order grand total in the same `₦X,XXX.XX` format, and the bank transfer details sourced from the server-side bank configuration constants (bank name, account name, account number).
4. IF the Email_Service call fails after the Order record has been saved, THEN THE Order_Router SHALL record the error details and still return the `201` success response with the created Order — email failure SHALL NOT cause the order creation endpoint to return an error.
5. THE Confirmation_Email SHALL be rendered using the branded HTML Email_Template defined in Requirement 7.
6. THE bank transfer details displayed in the Confirmation_Email (bank name, account name, account number) SHALL be read from server-side constants defined in the backend configuration — they SHALL NOT be passed in by the client or stored on the Order record.

---

### Requirement 5: Order Dispatched Email

**User Story:** As a customer, I want to receive an email when my order has been dispatched, so that I know my package is on the way.

#### Acceptance Criteria

1. WHEN the order status is updated to `"dispatched"` and the Order record contains a non-empty email address, THE Email_Service SHALL send a Dispatch_Email to that email address.
2. THE Dispatch_Email subject SHALL be `"Your Splendid Package is On Its Way! 🚚"`.
3. THE Dispatch_Email body SHALL include: the customer's name, the Order ID, a dispatch notification message, and a line-item summary where each row contains the product name, quantity, and unit price.
4. IF the Email_Service call fails, THEN THE Order_Router SHALL record the error details and still return the `200` success response with the updated Order — email failure SHALL NOT cause the status update endpoint to return an error.
5. THE Dispatch_Email SHALL be rendered using the branded HTML Email_Template defined in Requirement 7.
6. IF the Order record's email field is empty or absent when the status is advanced to `"dispatched"`, THEN THE Order_Router SHALL skip the email send and record the reason without returning an error.
7. IF an order whose current status is already `"dispatched"` has its status set to `"dispatched"` again, THEN THE Email_Service SHALL NOT send a second Dispatch_Email for that status transition.

---

### Requirement 6: Delivery Confirmation and Review Request Email

**User Story:** As a customer, I want to receive an email when my order has been delivered, so that I know my package arrived and I have an easy way to leave a review.

#### Acceptance Criteria

1. THE Order_Router SHALL accept `"delivered"` as a valid `status` value in the order status update endpoint, in addition to the existing allowed statuses.
2. WHEN the order status is updated to `"delivered"`, THE Email_Service SHALL send a Delivery_Email to the customer's stored email address.
3. THE Delivery_Email subject SHALL be `"Your Order Has Arrived! We'd Love Your Feedback 💛"`.
4. THE Delivery_Email body SHALL include: the customer's name, the Order ID, a statement confirming the order has been delivered, a line-item summary where each row contains the product name, quantity, and line total (price × quantity displayed as `₦X,XXX.XX`), the order grand total in the same format, and a call-to-action button whose `href` is the value of the `INSTAGRAM_URL` server-side constant.
5. IF the Email_Service call fails, THEN THE Order_Router SHALL record the error details and still return the `200` success response with the updated Order — email failure SHALL NOT cause the status update endpoint to return an error.
6. THE Delivery_Email SHALL be rendered using the branded HTML Email_Template defined in Requirement 7.

---

### Requirement 7: Branded HTML Email Templates

**User Story:** As a store owner, I want all transactional emails to look luxurious and on-brand, so that they reinforce the premium identity of Splendid Empire Cosmetics.

#### Acceptance Criteria

1. THE Email_Template SHALL use inline CSS exclusively (no `<style>` blocks or external stylesheets), and the outermost wrapper table SHALL have a maximum width of 600px centred in the email client viewport.
2. THE Email_Template SHALL apply the following brand colours via inline styles: `#B5784A` (primary bronze) for headings, buttons, and accents; `#1A0F0A` (near-black) for the header background; `#F2B8A8` (soft pink) for secondary accents; `#FFF6F3` (cream) as the page background.
3. THE Email_Template SHALL apply `font-family: 'Playfair Display', Georgia, serif` to all heading elements and `font-family: Arial, Helvetica, sans-serif` to all body text elements.
4. THE Email_Template SHALL include a header section with `text-align: center` containing a `<h1>` (or equivalent heading element) rendering the text "SPLENDID EMPIRE COSMETICS".
5. THE Email_Template SHALL render the order summary as an HTML `<table>` with `width: 100%`, a header row with cells for "Item", "Qty", and "Price" styled with background colour `#1A0F0A` and text colour `#F2B8A8`, and each data row using at least 8px of cell padding.
6. THE Email_Template SHALL include a footer section containing the `RESEND_REPLY_TO` email address and the text "Reply to this email for support".
7. WHERE the rendered email is viewed in a client with a viewport narrower than 600px, THE Email_Template SHALL wrap the order summary table in a container with `overflow-x: auto` so the table scrolls horizontally rather than overflowing the viewport.
8. WHEN an Email_Template variant requires a call-to-action button, THE Email_Template SHALL render an anchor element styled as a block button with background colour `#B5784A`, white (`#ffffff`) text, `border-radius` of at least 4px, and padding of at least 12px vertically and 24px horizontally.

---

### Requirement 8: Order Status Lifecycle Extension

**User Story:** As a store owner, I want a "delivered" status in the order management pipeline, so that I can mark orders as delivered and automatically trigger the delivery confirmation email.

#### Acceptance Criteria

1. THE Order_Router `ALLOWED_STATUSES` list SHALL include `"delivered"` as the fifth and final permitted value; a `PATCH` request with `status: "delivered"` SHALL return `200` with the updated order, and a `PATCH` request with any value not in the list SHALL return `400`.
2. THE `OrderStatus` TypeScript union type in the frontend SHALL include `"delivered"` as a valid member alongside `pending`, `verifying`, `confirmed`, and `dispatched`.
3. THE `STATUS_CFG` record in the frontend SHALL include a `"delivered"` entry with a human-readable label, a distinct background colour, a distinct text colour, and an icon — consistent with the existing entries for other statuses.
4. THE `NEXT` status-progression record SHALL map `"dispatched"` → `"delivered"` and SHALL map `"delivered"` → `null`, so that `"delivered"` is the terminal status with no further progression.
5. THE `NEXT_LABEL` record SHALL map `"dispatched"` to the button label `"Mark Delivered 📦"` and SHALL map `"delivered"` to `null`.
6. WHILE an order has status `"delivered"`, THE Admin_Panel SHALL NOT render a status-advance button for that order, and the WhatsApp customer-message button SHALL NOT be rendered for delivered orders, as `"delivered"` is the terminal status.
7. WHEN the admin advances an order to `"delivered"` via the Admin_Panel, the frontend SHALL call the order status update endpoint with `status: "delivered"`, which SHALL trigger the Delivery_Email as specified in Requirement 6.

---

### Requirement 9: Environment and Dependency Setup

**User Story:** As a developer, I want the Resend npm package installed and all required environment variables documented, so that the integration can be deployed without manual dependency discovery.

#### Acceptance Criteria

1. THE backend `package.json` SHALL list `resend` as a production dependency with an exact or patch-bounded version specifier (e.g. `"4.x.x"` or `"^4.0.0"`), not an open range (`"*"` or `"latest"`).
2. THE backend server file SHALL import the Resend client using ES module `import` syntax (e.g. `import { Resend } from 'resend'`), consistent with the project's `"type": "module"` setting in `package.json`.
3. THE `.env.example` file SHALL include `RESEND_API_KEY` with an inline comment that reads "# Resend API secret key — obtain from https://resend.com/api-keys", `RESEND_FROM` with an inline comment showing the expected format `# e.g. Brand Name <noreply@yourdomain.com>`, and `RESEND_REPLY_TO` with an inline comment stating "# Address where customer replies will be routed".
4. THE backend `.env` file SHALL be updated locally (and SHALL remain excluded from version control via `.gitignore`) to include `RESEND_FROM` set to the value `Splendid Empire Cosmetics <orders@splendidcosmetics.com.ng>` and `RESEND_REPLY_TO` set to the business Gmail address — the `RESEND_API_KEY` value SHALL be obtained from the Resend dashboard and set by the developer at deployment time.
5. THE server startup sequence SHALL validate that `RESEND_API_KEY` is a non-empty string before initialising the Resend client; IF it is absent or empty, THEN the server SHALL log `"FATAL: RESEND_API_KEY environment variable is not set."` and exit with code `1`, consistent with the existing `ADMIN_PASSWORD` guard pattern.
