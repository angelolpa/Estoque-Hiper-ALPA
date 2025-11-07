# **App Name**: StockFlow

## Core Features:

- Product Registration: Register products with name, system ID, and one or more barcode identifiers.
- Positive Scan: Scan barcodes to register the entry of products into the system. Logs number of occurrences of each barcode
- Negative Scan: Scan barcodes to register the exit of products from the system.  Logs number of occurrences of each barcode
- Data Export: Export scanned data to a CSV file, including barcode and quantity.
- Database Connectivity: Connect to a specified external MySQL database instance to persist all registered and scanned product data, Host: db-59279.dc-us-1.absamcloud.com Porta: 19479 Usuários: eletroalles senha: n9o8g21kuef9 Databases: contagemEletro

## Style Guidelines:

- Primary color: Indigo (#4B0082) for a professional and organized feel.
- Background color: Very light lavender (#F0E6EF).
- Accent color: Violet (#8F00FF) to highlight key interactive elements.
- Body font: 'Inter' (sans-serif) for clean readability.
- Headline font: 'Space Grotesk' (sans-serif) for a modern, digital aesthetic.
- Use clear, outline-style icons to represent different product categories and actions.
- Implement a simple, tabular layout for data presentation.
- Use subtle animations to provide feedback on successful scans and data updates.