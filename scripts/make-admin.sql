-- Simple SQL to make admin@ecommerce.com an admin user
-- This should be run after the user is created via the API

UPDATE users 
SET role = 'admin', email_verified = true 
WHERE email = 'admin@ecommerce.com';

-- Check if the update worked
SELECT id, email, role, first_name, last_name 
FROM users 
WHERE email = 'admin@ecommerce.com';
