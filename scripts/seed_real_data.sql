-- Seed data for real mosque directory + feed posts
-- Safe to run multiple times.

-- 1) Seed baseline user profiles used by mosque admin / post authors
INSERT INTO public.profiles (id, email, full_name, username, role, is_verified, is_active)
VALUES
  ('seed-admin-ny', 'admin.ny@mosqueconnect.local', 'NY Community Admin', 'ny_admin', 'admin', true, true),
  ('seed-shura-nj', 'shura.nj@mosqueconnect.local', 'NJ Shura Member', 'nj_shura', 'shura', true, true),
  ('seed-imam-ca', 'imam.ca@mosqueconnect.local', 'Imam Abdullah Kareem', 'imam_abdullah', 'imam', true, true),
  ('seed-member-il', 'member.il@mosqueconnect.local', 'Sister Maryam Faisal', 'maryam_faisal', 'member', true, true)
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  username = EXCLUDED.username,
  role = EXCLUDED.role,
  is_verified = EXCLUDED.is_verified,
  is_active = EXCLUDED.is_active;

-- 2) Seed 4 mosques that can be managed from admin/shura panels
INSERT INTO public.mosques (
  id,
  name,
  address,
  city,
  state,
  country,
  zip_code,
  latitude,
  longitude,
  phone,
  email,
  website,
  description,
  facilities,
  capacity,
  established_year,
  is_verified,
  admin_id
)
VALUES
  (
    'a1111111-1111-4111-8111-111111111111',
    'Al-Noor Islamic Center',
    '123 Peace Ave',
    'Queens',
    'NY',
    'USA',
    '11375',
    40.7209,
    -73.8448,
    '+1-718-555-0101',
    'info@alnoor-ny.org',
    'https://alnoor-ny.org',
    'A full-service mosque focused on Quran education, youth mentorship, and family support services.',
    ARRAY['Prayer Hall', 'Wudu Area', 'Library', 'Parking', 'Sisters Section', 'Classroom'],
    850,
    1998,
    true,
    'seed-admin-ny'
  ),
  (
    'b2222222-2222-4222-8222-222222222222',
    'Masjid Ar-Rahmah',
    '450 Community Blvd',
    'Jersey City',
    'NJ',
    'USA',
    '07306',
    40.7311,
    -74.0637,
    '+1-201-555-0198',
    'office@arrhamah.org',
    'https://arrhamah.org',
    'Neighborhood masjid with active weekend school and counseling services.',
    ARRAY['Prayer Hall', 'Wudu Area', 'Wheelchair Accessible', 'Community Kitchen', 'Classroom'],
    600,
    2006,
    true,
    'seed-shura-nj'
  ),
  (
    'c3333333-3333-4333-8333-333333333333',
    'Bay Area Islamic Society',
    '900 Crescent Dr',
    'Fremont',
    'CA',
    'USA',
    '94538',
    37.5485,
    -121.9886,
    '+1-510-555-0171',
    'admin@baisca.org',
    'https://baisca.org',
    'Regional Islamic center serving Bay Area families with community and educational programs.',
    ARRAY['Prayer Hall', 'Library', 'Parking', 'Sisters Section', 'Gym', 'Playground'],
    1250,
    2010,
    true,
    'seed-imam-ca'
  ),
  (
    'd4444444-4444-4444-8444-444444444444',
    'Masjid As-Salam Chicago',
    '77 Unity Street',
    'Chicago',
    'IL',
    'USA',
    '60612',
    41.8803,
    -87.6742,
    '+1-312-555-0145',
    'contact@assalamchi.org',
    'https://assalamchi.org',
    'Community-focused masjid supporting refugees, interfaith outreach, and youth development.',
    ARRAY['Prayer Hall', 'Wudu Area', 'Food Pantry', 'Funeral Services', 'Classroom'],
    700,
    2002,
    true,
    'seed-member-il'
  )
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  state = EXCLUDED.state,
  country = EXCLUDED.country,
  zip_code = EXCLUDED.zip_code,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  website = EXCLUDED.website,
  description = EXCLUDED.description,
  facilities = EXCLUDED.facilities,
  capacity = EXCLUDED.capacity,
  established_year = EXCLUDED.established_year,
  is_verified = EXCLUDED.is_verified,
  admin_id = EXCLUDED.admin_id;

-- 3) Seed real posts linked to seeded profiles + mosques
INSERT INTO public.posts (
  id,
  author_id,
  mosque_id,
  content,
  post_type,
  category,
  is_published
)
VALUES
  (
    '11111111-aaaa-4aaa-8aaa-111111111111',
    'seed-admin-ny',
    'a1111111-1111-4111-8111-111111111111',
    'Community iftar volunteer signup is now open. Please join to help with setup, serving, and cleanup this Friday.',
    'announcement',
    'community',
    true
  ),
  (
    '22222222-bbbb-4bbb-8bbb-222222222222',
    'seed-shura-nj',
    'b2222222-2222-4222-8222-222222222222',
    'Shura update: masjid expansion planning meeting will be held after Isha this Saturday.',
    'text',
    'general',
    true
  ),
  (
    '33333333-cccc-4ccc-8ccc-333333333333',
    'seed-imam-ca',
    'c3333333-3333-4333-8333-333333333333',
    'Reminder: Weekly Tafsir class begins at 7:30 PM. Everyone is welcome.',
    'event',
    'education',
    true
  ),
  (
    '44444444-dddd-4ddd-8ddd-444444444444',
    'seed-member-il',
    'd4444444-4444-4444-8444-444444444444',
    'Please keep our elderly community members in your duas. Transportation volunteers are needed for Friday prayers.',
    'prayer-request',
    'community',
    true
  )
ON CONFLICT (id) DO UPDATE
SET
  author_id = EXCLUDED.author_id,
  mosque_id = EXCLUDED.mosque_id,
  content = EXCLUDED.content,
  post_type = EXCLUDED.post_type,
  category = EXCLUDED.category,
  is_published = EXCLUDED.is_published;
