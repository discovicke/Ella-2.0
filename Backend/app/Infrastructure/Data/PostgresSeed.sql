-- =============================================================
--  Rumbokningsapp — Seed-data
--  Manuella ID:n används för läsbarhet och tydliga FK-kopplingar.
--  setval återställer sekvenserna efter manuell insättning så att
--  applikationen kan fortsätta auto-incrementa från rätt värde.
--  OBS: Lösenord är platshållare (__HASH__) och ersätts av
--       applikationens initialiserare vid första körning.
-- =============================================================


-- -------------------------------------------------------------
--  MIGRATIONSHISTORIK
-- -------------------------------------------------------------

INSERT INTO database_versions (version, name)
VALUES (1, 'Simulation data v1.2 - Normalized tables')
ON CONFLICT (version) DO NOTHING;


-- -------------------------------------------------------------
--  SYSTEM PERMISSIONS
--  Måste vara först — övriga tabeller refererar till dessa nycklar.
-- -------------------------------------------------------------

INSERT INTO system_permissions (key, description)
VALUES ('BookRoom', 'Can book rooms'),
       ('ManageUsers', 'Can manage users'),
       ('ManageClasses', 'Can manage classes'),
       ('ManageRooms', 'Can manage rooms'),
       ('ManageBookings', 'Can manage all bookings'),
       ('ManageCampuses', 'Can manage campuses'),
       ('ManageRoles', 'Can manage roles/permissions'),
       ('manageResources', 'Manage and book movable resources like vehicles')
ON CONFLICT (key) DO NOTHING;


-- -------------------------------------------------------------
--  PERMISSION TEMPLATES (Roller)
--  1 = Student, 2 = Educator, 3 = Admin
-- -------------------------------------------------------------

INSERT INTO permission_templates (id, name, label, css_class, sort_order)
    OVERRIDING SYSTEM VALUE
VALUES (1, 'student', 'Student', 'green', 0),
       (2, 'educator', 'Educator', 'blue', 1),
       (3, 'admin', 'Admin', 'orange', 2)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('permission_templates', 'id'), (SELECT MAX(id) FROM permission_templates));


-- -------------------------------------------------------------
--  PERMISSION FLAGS
--  Student (1):  BookRoom
--  Educator (2): BookRoom
--  Admin (3):    Alla behörigheter
-- -------------------------------------------------------------

INSERT INTO permission_template_flags (template_id, permission_key, value)
VALUES (1, 'BookRoom', true),
       (2, 'BookRoom', true)
ON CONFLICT DO NOTHING;

-- Admin får alla behörigheter dynamiskt från system_permissions
INSERT INTO permission_template_flags (template_id, permission_key, value)
SELECT 3, key, true
FROM system_permissions
ON CONFLICT DO NOTHING;


-- -------------------------------------------------------------
--  RUMSTYPER
--  1 = Klassrum, 2 = Labb, 3 = Grupprum, 4 = Datorrum
-- -------------------------------------------------------------

INSERT INTO room_types (id, name)
    OVERRIDING SYSTEM VALUE
VALUES (1, 'Klassrum'),
       (2, 'Labb'),
       (3, 'Grupprum'),
       (4, 'Datorrum')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('room_types', 'id'), (SELECT MAX(id) FROM room_types));


-- -------------------------------------------------------------
--  CAMPUS
--  1 = Hudiksvall, 2 = Gävle, 3 = Sundsvall
-- -------------------------------------------------------------

INSERT INTO campus (id, street, zip, city, country, contact)
    OVERRIDING SYSTEM VALUE
VALUES (1, 'Edugrade Hudiksvall', '824 30', 'Hudiksvall', 'Sweden', 'info.hudik@edugrade.com'),
       (2, 'Edugrade Gävle', '802 67', 'Gävle', 'Sweden', 'info.gavle@edugrade.com'),
       (3, 'Edugrade Sundsvall', '852 30', 'Sundsvall', 'Sweden', 'info.sund@edugrade.com')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('campus', 'id'), (SELECT MAX(id) FROM campus));


-- -------------------------------------------------------------
--  KLASSER
--  1 = demo26, 2 = net25, 3 = ux25, 4 = dev24, 5 = sys25
-- -------------------------------------------------------------

INSERT INTO class (id, class_name)
    OVERRIDING SYSTEM VALUE
VALUES (1, 'demo26'),
       (2, 'net25'),
       (3, 'ux25'),
       (4, 'dev24'),
       (5, 'sys25')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('class', 'id'), (SELECT MAX(id) FROM class));


-- -------------------------------------------------------------
--  ANVÄNDARE
-- -------------------------------------------------------------

INSERT INTO users (id, email, password_hash, display_name, is_active, permission_level, permission_template_id)
    OVERRIDING SYSTEM VALUE
VALUES (1, 'admin@edugrade.com', '__HASH__', 'Admin Testberg', true, 10, 3),
       (2, 'campus.admin@edugrade.com', '__HASH__', 'Campus Manager', true, 10, 3),
       (3, 'sven.svensson@edugrade.com', '__HASH__', 'Sven Svensson', true, 5, 2),
       (4, 'karin.karlsson.gavle@edugrade.com', '__HASH__', 'Karin Karlsson', true, 5, 2),
       (5, 'anders.andersson@edugrade.com', '__HASH__', 'Anders Andersson', true, 5, 2),
       (10, 'andre.ponten.net25@edu.edugrade.com', '__HASH__', 'André Pontén', true, 1, 1),
       (50, 'elev@edugrade.com', '__HASH__', 'Elev Testlund', true, 1, 1)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT MAX(id) FROM users));


-- -------------------------------------------------------------
--  RESOURCE CATEGORIES
-- -------------------------------------------------------------

INSERT INTO resource_categories (id, name)
    OVERRIDING SYSTEM VALUE
VALUES (1, 'Fordon'),
       (2, 'Portabel IT'),
       (3, 'Övrig utrustning')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('resource_categories', 'id'), (SELECT MAX(id) FROM resource_categories));


-- -------------------------------------------------------------
--  BOOKABLE RESOURCES
-- -------------------------------------------------------------

INSERT INTO bookable_resources (category_id, campus_id, name, description)
VALUES (1, 1, 'Skolbil 1 (Hudiksvall)', 'Vit Volkswagen Golf - ABC 123'),
       (1, 2, 'Skolbil 2 (Gävle)', 'Blå Volvo V60 - XYZ 789'),
       (1, 3, 'Skolbil 3 (Sundsvall)', 'Grå Tesla Model 3 - ELA 200'),
       (2, 1, 'Projektor Kit A', 'Portabel Epson projektor'),
       (2, 2, 'Laptops (Vagn 1)', 'Vagn med 15st MacBook Air'),
       (3, 1, 'Släpvagn', 'Öppen släpvagn för transport')
ON CONFLICT DO NOTHING;
