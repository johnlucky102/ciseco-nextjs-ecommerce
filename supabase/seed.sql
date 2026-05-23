-- Seed Data for Furniture E-commerce
-- Currency: VND
-- Dimensions: cm

-- Insert Categories
INSERT INTO categories (name, slug, description, sort_order, is_active) VALUES
('Sofas', 'sofas', 'Comfortable sofas for your living room', 1, true),
('Tables', 'tables', 'Dining tables, coffee tables, and desks', 2, true),
('Chairs', 'chairs', 'Dining chairs, office chairs, and armchairs', 3, true),
('Beds', 'beds', 'Bed frames and mattresses', 4, true),
('Wardrobes', 'wardrobes', 'Storage solutions for your bedroom', 5, true),
('Shelves', 'shelves', 'Bookshelves and display units', 6, true),
('Cabinets', 'cabinets', 'Storage cabinets and sideboards', 7, true),
('Desks', 'desks', 'Office desks and study tables', 8, true);

-- Insert Rooms
INSERT INTO rooms (name, slug, description, sort_order, is_active) VALUES
('Living Room', 'living-room', 'Furniture for your living space', 1, true),
('Bedroom', 'bedroom', 'Comfortable bedroom furniture', 2, true),
('Kitchen', 'kitchen', 'Kitchen and dining furniture', 3, true),
('Office', 'office', 'Home office furniture', 4, true),
('Dining Room', 'dining-room', 'Dining room furniture', 5, true);

-- Insert Materials
INSERT INTO materials (name, slug, description, material_type, is_active) VALUES
('Oak Wood', 'oak-wood', 'Solid oak wood with natural grain', 'wood', true),
('Pine Wood', 'pine-wood', 'Lightweight pine wood', 'wood', true),
('Walnut Wood', 'walnut-wood', 'Premium walnut wood', 'wood', true),
('Metal Frame', 'metal-frame', 'Powder-coated metal frame', 'metal', true),
('Fabric Upholstery', 'fabric-upholstery', 'Premium fabric upholstery', 'fabric', true),
('Leather', 'leather', 'Genuine leather upholstery', 'leather', true),
('Velvet', 'velvet', 'Soft velvet fabric', 'fabric', true),
('Glass Top', 'glass-top', 'Tempered glass table top', 'glass', true),
('Marble Top', 'marble-top', 'Natural marble surface', 'marble', true);

-- Insert Products (Sample Furniture)
INSERT INTO products (name, slug, description, short_description, category_id, room_id, base_price, compare_at_price, sku, weight, status, is_featured, is_new) VALUES
('Modern 3-Seater Sofa', 'modern-3-seater-sofa', 'A contemporary 3-seater sofa with premium fabric upholstery and solid wood legs. Perfect for modern living rooms.', 'Contemporary 3-seater sofa with premium fabric', 
 (SELECT id FROM categories WHERE slug = 'sofas'), 
 (SELECT id FROM rooms WHERE slug = 'living-room'),
 8500000, 9500000, 'SOFA-001', 45.0, 'active', true, true),

('Oak Dining Table', 'oak-dining-table', 'Solid oak dining table that seats 6 people. Features a natural wood finish and sturdy construction.', '6-seater solid oak dining table',
 (SELECT id FROM categories WHERE slug = 'tables'),
 (SELECT id FROM rooms WHERE slug = 'dining-room'),
 12500000, 14000000, 'TABLE-001', 35.0, 'active', true, false),

('Ergonomic Office Chair', 'ergonomic-office-chair', 'Ergonomic office chair with lumbar support, adjustable height, and breathable mesh back.', 'Ergonomic chair with lumbar support',
 (SELECT id FROM categories WHERE slug = 'chairs'),
 (SELECT id FROM rooms WHERE slug = 'office'),
 3200000, 3800000, 'CHAIR-001', 15.0, 'active', false, true),

('King Size Bed Frame', 'king-size-bed-frame', 'Upholstered king size bed frame with storage drawers. Features a sturdy wooden slat base.', 'King size bed with storage drawers',
 (SELECT id FROM categories WHERE slug = 'beds'),
 (SELECT id FROM rooms WHERE slug = 'bedroom'),
 15000000, 17000000, 'BED-001', 60.0, 'active', true, false),

('3-Door Wardrobe', '3-door-wardrobe', 'Spacious 3-door wardrobe with full-length mirror and internal shelving.', '3-door wardrobe with mirror',
 (SELECT id FROM categories WHERE slug = 'wardrobes'),
 (SELECT id FROM rooms WHERE slug = 'bedroom'),
 7800000, 8500000, 'WARD-001', 55.0, 'active', false, false),

('Coffee Table', 'coffee-table', 'Modern coffee table with tempered glass top and metal frame. Perfect centerpiece for living rooms.', 'Glass-top coffee table with metal frame',
 (SELECT id FROM categories WHERE slug = 'tables'),
 (SELECT id FROM rooms WHERE slug = 'living-room'),
 2800000, 3200000, 'TABLE-002', 20.0, 'active', true, true);

-- Insert Product Images
INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_primary) VALUES
-- Modern 3-Seater Sofa
((SELECT id FROM products WHERE slug = 'modern-3-seater-sofa'), 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800', 'Modern 3-seater sofa in living room', 1, true),
((SELECT id FROM products WHERE slug = 'modern-3-seater-sofa'), 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=800', 'Sofa detail view', 2, false),

-- Oak Dining Table
((SELECT id FROM products WHERE slug = 'oak-dining-table'), 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800', 'Oak dining table with chairs', 1, true),
((SELECT id FROM products WHERE slug = 'oak-dining-table'), 'https://images.unsplash.com/photo-1578681994506-b8f463449011?w=800', 'Dining table close-up', 2, false),

-- Ergonomic Office Chair
((SELECT id FROM products WHERE slug = 'ergonomic-office-chair'), 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?w=800', 'Ergonomic office chair', 1, true),

-- King Size Bed Frame
((SELECT id FROM products WHERE slug = 'king-size-bed-frame'), 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800', 'King size bed frame', 1, true),

-- 3-Door Wardrobe
((SELECT id FROM products WHERE slug = '3-door-wardrobe'), 'https://images.unsplash.com/photo-1558997519-83ea9252edf8?w=800', '3-door wardrobe with mirror', 1, true),

-- Coffee Table
((SELECT id FROM products WHERE slug = 'coffee-table'), 'https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?w=800', 'Glass coffee table', 1, true);

-- Insert Product Variants
INSERT INTO product_variants (product_id, name, sku, price, compare_at_price, weight, height, width, depth, color, is_default, is_active) VALUES
-- Modern 3-Seater Sofa variants
((SELECT id FROM products WHERE slug = 'modern-3-seater-sofa'), 'Gray Fabric', 'SOFA-001-GRAY', 8500000, 9500000, 45.0, 85.0, 220.0, 95.0, 'Gray', true, true),
((SELECT id FROM products WHERE slug = 'modern-3-seater-sofa'), 'Beige Fabric', 'SOFA-001-BEIGE', 8500000, 9500000, 45.0, 85.0, 220.0, 95.0, 'Beige', false, true),

-- Oak Dining Table variants
((SELECT id FROM products WHERE slug = 'oak-dining-table'), 'Natural Oak', 'TABLE-001-NATURAL', 12500000, 14000000, 35.0, 75.0, 180.0, 90.0, 'Natural', true, true),

-- Ergonomic Office Chair variants
((SELECT id FROM products WHERE slug = 'ergonomic-office-chair'), 'Black Mesh', 'CHAIR-001-BLACK', 3200000, 3800000, 15.0, 120.0, 65.0, 65.0, 'Black', true, true),
((SELECT id FROM products WHERE slug = 'ergonomic-office-chair'), 'Gray Mesh', 'CHAIR-001-GRAY', 3200000, 3800000, 15.0, 120.0, 65.0, 65.0, 'Gray', false, true),

-- King Size Bed Frame variants
((SELECT id FROM products WHERE slug = 'king-size-bed-frame'), 'Gray Upholstery', 'BED-001-GRAY', 15000000, 17000000, 60.0, 110.0, 200.0, 210.0, 'Gray', true, true),

-- 3-Door Wardrobe variants
((SELECT id FROM products WHERE slug = '3-door-wardrobe'), 'White Oak', 'WARD-001-WHITE', 7800000, 8500000, 55.0, 200.0, 120.0, 60.0, 'White', true, true),

-- Coffee Table variants
((SELECT id FROM products WHERE slug = 'coffee-table'), 'Black Frame', 'TABLE-002-BLACK', 2800000, 3200000, 20.0, 45.0, 100.0, 55.0, 'Black', true, true),
((SELECT id FROM products WHERE slug = 'coffee-table'), 'Gold Frame', 'TABLE-002-GOLD', 2800000, 3200000, 20.0, 45.0, 100.0, 55.0, 'Gold', false, true);

-- Insert Product Variant Materials
INSERT INTO product_variant_materials (variant_id, material_id, material_part) VALUES
-- Modern 3-Seater Sofa
((SELECT id FROM product_variants WHERE sku = 'SOFA-001-GRAY'), (SELECT id FROM materials WHERE slug = 'oak-wood'), 'legs'),
((SELECT id FROM product_variants WHERE sku = 'SOFA-001-GRAY'), (SELECT id FROM materials WHERE slug = 'fabric-upholstery'), 'upholstery'),
((SELECT id FROM product_variants WHERE sku = 'SOFA-001-BEIGE'), (SELECT id FROM materials WHERE slug = 'pine-wood'), 'legs'),
((SELECT id FROM product_variants WHERE sku = 'SOFA-001-BEIGE'), (SELECT id FROM materials WHERE slug = 'velvet'), 'upholstery'),

-- Oak Dining Table
((SELECT id FROM product_variants WHERE sku = 'TABLE-001-NATURAL'), (SELECT id FROM materials WHERE slug = 'oak-wood'), 'tabletop'),
((SELECT id FROM product_variants WHERE sku = 'TABLE-001-NATURAL'), (SELECT id FROM materials WHERE slug = 'oak-wood'), 'legs'),

-- Ergonomic Office Chair
((SELECT id FROM product_variants WHERE sku = 'CHAIR-001-BLACK'), (SELECT id FROM materials WHERE slug = 'metal-frame'), 'frame'),
((SELECT id FROM product_variants WHERE sku = 'CHAIR-001-BLACK'), (SELECT id FROM materials WHERE slug = 'fabric-upholstery'), 'seat'),
((SELECT id FROM product_variants WHERE sku = 'CHAIR-001-GRAY'), (SELECT id FROM materials WHERE slug = 'metal-frame'), 'frame'),
((SELECT id FROM product_variants WHERE sku = 'CHAIR-001-GRAY'), (SELECT id FROM materials WHERE slug = 'fabric-upholstery'), 'seat'),

-- King Size Bed Frame
((SELECT id FROM product_variants WHERE sku = 'BED-001-GRAY'), (SELECT id FROM materials WHERE slug = 'pine-wood'), 'frame'),
((SELECT id FROM product_variants WHERE sku = 'BED-001-GRAY'), (SELECT id FROM materials WHERE slug = 'fabric-upholstery'), 'headboard'),

-- 3-Door Wardrobe
((SELECT id FROM product_variants WHERE sku = 'WARD-001-WHITE'), (SELECT id FROM materials WHERE slug = 'pine-wood'), 'frame'),
((SELECT id FROM product_variants WHERE sku = 'WARD-001-WHITE'), (SELECT id FROM materials WHERE slug = 'glass-top'), 'door'),

-- Coffee Table
((SELECT id FROM product_variants WHERE sku = 'TABLE-002-BLACK'), (SELECT id FROM materials WHERE slug = 'metal-frame'), 'frame'),
((SELECT id FROM product_variants WHERE sku = 'TABLE-002-BLACK'), (SELECT id FROM materials WHERE slug = 'glass-top'), 'tabletop'),
((SELECT id FROM product_variants WHERE sku = 'TABLE-002-GOLD'), (SELECT id FROM materials WHERE slug = 'metal-frame'), 'frame'),
((SELECT id FROM product_variants WHERE sku = 'TABLE-002-GOLD'), (SELECT id FROM materials WHERE slug = 'glass-top'), 'tabletop');

-- Insert Inventory
INSERT INTO inventory (variant_id, quantity, reserved_quantity, low_stock_threshold) VALUES
((SELECT id FROM product_variants WHERE sku = 'SOFA-001-GRAY'), 15, 0, 5),
((SELECT id FROM product_variants WHERE sku = 'SOFA-001-BEIGE'), 12, 0, 5),
((SELECT id FROM product_variants WHERE sku = 'TABLE-001-NATURAL'), 8, 0, 3),
((SELECT id FROM product_variants WHERE sku = 'CHAIR-001-BLACK'), 25, 0, 10),
((SELECT id FROM product_variants WHERE sku = 'CHAIR-001-GRAY'), 20, 0, 10),
((SELECT id FROM product_variants WHERE sku = 'BED-001-GRAY'), 5, 0, 2),
((SELECT id FROM product_variants WHERE sku = 'WARD-001-WHITE'), 10, 0, 3),
((SELECT id FROM product_variants WHERE sku = 'TABLE-002-BLACK'), 18, 0, 8),
((SELECT id FROM product_variants WHERE sku = 'TABLE-002-GOLD'), 15, 0, 8);
