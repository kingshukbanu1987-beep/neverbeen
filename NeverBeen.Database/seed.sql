-- ============================================================================
-- NeverBeen Community — optional reference seed (Supabase / PostgreSQL)
-- ----------------------------------------------------------------------------
-- The API also seeds lookup data at first start (Data/GeoSeedData.cs), so this
-- file is optional. Run it when you want the database usable before the API
-- starts (e.g. exploring in the Supabase SQL editor).
-- ============================================================================

-- A few countries so profile drop-downs work out of the box ------------------

INSERT INTO "Countries" ("IsoCode2", "Name", "PhoneCode") VALUES
    ('IN', 'India',       '+91'),
    ('BD', 'Bangladesh',  '+880'),
    ('PK', 'Pakistan',    '+92'),
    ('US', 'United States', '+1'),
    ('GB', 'United Kingdom', '+44'),
    ('FR', 'France',      '+33'),
    ('DE', 'Germany',     '+49'),
    ('JP', 'Japan',       '+81'),
    ('AU', 'Australia',   '+61'),
    ('MY', 'Malaysia',    '+60')
ON CONFLICT ("IsoCode2") DO NOTHING;

INSERT INTO "Cities" ("CountryId", "Name")
SELECT c."Id", v."Name"
FROM "Countries" c
JOIN (VALUES
    ('IN', 'Kolkata'), ('IN', 'Mumbai'), ('IN', 'Delhi'), ('IN', 'Bangalore'), ('IN', 'Chennai'),
    ('BD', 'Dhaka'), ('BD', 'Chittagong'),
    ('PK', 'Karachi'), ('PK', 'Lahore'),
    ('US', 'New York'), ('US', 'San Francisco'), ('US', 'Chicago'),
    ('GB', 'London'), ('GB', 'Manchester'),
    ('FR', 'Paris'), ('FR', 'Nice'),
    ('DE', 'Berlin'), ('DE', 'Frankfurt'),
    ('JP', 'Tokyo'), ('JP', 'Osaka'),
    ('AU', 'Sydney'), ('AU', 'Melbourne'),
    ('MY', 'George Town'), ('MY', 'Kuala Lumpur')
) AS v("IsoCode2", "Name") ON v."IsoCode2" = c."IsoCode2"
ON CONFLICT ("CountryId", "Name") DO NOTHING;

-- Demo member (founder profile) so the community is explorable before anyone
-- signs up. The 20-digit UniqueId is derived automatically by the trigger.

INSERT INTO "Users" ("FirstName", "LastName", "FullName", "Email", "Gender", "DateOfBirth",
                     "CountryId", "State", "Pincode", "ContactNumber", "PostalAddress",
                     "AboutMe", "Profession", "Status", "ProfilePhotoUrl", "ActiveStatus")
SELECT 'Kingshuk', '', 'Kingshuk', 'kingshuk.founder@neverbeen.example', 'Male',
       '1987-07-02 00:00:00',
       (SELECT "Id" FROM "Countries" WHERE "IsoCode2" = 'IN'), 'West Bengal', '700107',
       '+91 98300 12345', 'Salt Lake City, Kolkata, West Bengal, 700107',
       'Senior Software Engineer and founder of NeverBeen. I believe in Creativity, Future Proof Design and Strong Foundation in Programming, rest believe in me, I will deliver above your expectations.',
       'Senior Software Engineer and founder of NeverBeen', 'Active', '/author.jpeg', 'Active'
WHERE NOT EXISTS (SELECT 1 FROM "Users" WHERE "Email" = 'kingshuk.founder@neverbeen.example');

-- Default settings row for the demo member ---------------------------------

INSERT INTO "UserSettings" ("UserId")
SELECT u."Id" FROM "Users" u
WHERE u."Email" = 'kingshuk.founder@neverbeen.example'
  AND NOT EXISTS (SELECT 1 FROM "UserSettings" s WHERE s."UserId" = u."Id");
