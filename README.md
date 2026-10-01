# TOP 1 — self-manageable e-commerce store

TOP 1 is a free-hosting-friendly storefront connected to Supabase.

## Customer website
- Live products and categories from the database
- Search and filters
- Shopping cart
- DZD prices
- Cash on delivery
- Checkout form
- Orders stored in Supabase
- WhatsApp confirmation
- Responsive mobile design

## Private admin dashboard
Open `/admin.html`.

After your admin account is activated, you can manage the store without editing code:
- Add products
- Edit product names, descriptions, prices, SKU and stock
- Upload product photos
- Publish or hide products
- Mark products as featured
- Delete products
- Add or hide categories
- View orders
- Change order status
- Change store name, WhatsApp number and payment text

## One-time admin activation
Create your account on `/admin.html`. The profile starts with administrator access disabled. The first account must be activated once as the store owner.

## Architecture
GitHub hosts the static frontend. Supabase provides PostgreSQL, Auth, Storage and the order RPC. The browser uses only the Supabase publishable key; no service-role/secret key is stored in the frontend.

## Database security
Row Level Security is enabled. Customers can read active catalog data and place orders. Only administrator accounts can modify products, categories, images, settings and orders.

## Current categories
- Vêtements
- Jouets
- Décoration
- Workwear
- Maison & cuisine
