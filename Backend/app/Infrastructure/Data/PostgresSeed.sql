-- =============================================================
--  Rumbokningsapp — Seed-data
-- =============================================================

-- -------------------------------------------------------------
--  MIGRATIONSHISTORIK
-- -------------------------------------------------------------
INSERT INTO database_versions (version, name)
VALUES (1, 'Simulation data v1.2 - Normalized tables')
ON CONFLICT (version) DO NOTHING;

-- -------------------------------------------------------------
--  SYSTEM PERMISSIONS
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
-- -------------------------------------------------------------
INSERT INTO permission_template_flags (template_id, permission_key, value)
VALUES (1, 'BookRoom', true),
       (2, 'BookRoom', true)
ON CONFLICT DO NOTHING;

-- Admin får alla behörigheter
INSERT INTO permission_template_flags (template_id, permission_key, value)
SELECT 3, key, true FROM system_permissions
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------------
--  RUMSTYPER
-- -------------------------------------------------------------
INSERT INTO room_types (id, name)
    OVERRIDING SYSTEM VALUE
VALUES (1, 'Klassrum'), (2, 'Labb'), (3, 'Grupprum'), (4, 'Datorrum')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('room_types', 'id'), (SELECT MAX(id) FROM room_types));

-- -------------------------------------------------------------
--  CAMPUS
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
-- -------------------------------------------------------------
INSERT INTO class (id, class_name)
    OVERRIDING SYSTEM VALUE
VALUES (1, 'demo26'), (2, 'net25'), (3, 'ux25'), (4, 'dev24'), (5, 'sys25')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('class', 'id'), (SELECT MAX(id) FROM class));

-- -------------------------------------------------------------
--  ANVÄNDARE (Återställer alla dina användare)
-- -------------------------------------------------------------
INSERT INTO users (id, email, password_hash, display_name, is_active, permission_level, permission_template_id)
    OVERRIDING SYSTEM VALUE
VALUES (1, 'admin@edugrade.com', '__HASH__', 'Admin Testberg', true, 10, 3),
       (2, 'campus.admin@edugrade.com', '__HASH__', 'Campus Manager', true, 10, 3),
       (3, 'sven.svensson@edugrade.com', '__HASH__', 'Sven Svensson', true, 5, 2),
       (4, 'karin.karlsson.gavle@edugrade.com', '__HASH__', 'Karin Karlsson', true, 5, 2),
       (5, 'anders.andersson@edugrade.com', '__HASH__', 'Anders Andersson', true, 5, 2),
       (10, 'andre.ponten.net25@edu.edugrade.com', '__HASH__', 'André Pontén', true, 1, 1),
       (11, 'christian.gennari.net25@edu.edugrade.com', '__HASH__', 'Christian Gennari', true, 1, 1),
       (12, 'marcus.loov.net25@edu.edugrade.com', '__HASH__', 'Marcus Lööv', true, 1, 1),
       (13, 'viktor.johansson.net25@edu.edugrade.com', '__HASH__', 'Viktor Johansson', true, 1, 1),
       (14, 'sofia.eriksson.net25@edu.edugrade.com', '__HASH__', 'Sofia Eriksson', true, 1, 1),
       (15, 'erik.nilsson.net25@edu.edugrade.com', '__HASH__', 'Erik Nilsson', true, 1, 1),
       (20, 'linda.berg.ux25@edu.edugrade.com', '__HASH__', 'Linda Berg', true, 1, 1),
       (21, 'mikael.holm.ux25@edu.edugrade.com', '__HASH__', 'Mikael Holm', true, 1, 1),
       (22, 'anna.sundstrom.ux25@edu.edugrade.com', '__HASH__', 'Anna Sundström', true, 1, 1),
       (23, 'per.ostlund.ux25@edu.edugrade.com', '__HASH__', 'Per Östlund', true, 1, 1),
       (30, 'johan.kvist.dev24@edu.edugrade.com', '__HASH__', 'Johan Kvist', true, 1, 1),
       (31, 'elena.popova.dev24@edu.edugrade.com', '__HASH__', 'Elena Popova', true, 1, 1),
       (32, 'oscar.lundin.dev24@edu.edugrade.com', '__HASH__', 'Oscar Lundin', true, 1, 1),
       (33, 'oscar.lundin.dev222@edu.edugrade.com', '__HASH__', 'Custom Guy', true, 1, NULL),
       (50, 'elev@edugrade.com', '__HASH__', 'Elev Testlund', true, 1, 1),
       (60, 'lisa.franzen.sys25@edu.edugrade.com', '__HASH__', 'Lisa Franzén', true, 1, 1),
       (61, 'david.hall.sys25@edu.edugrade.com', '__HASH__', 'David Hall', true, 1, 1),
       (62, 'emma.lindqvist.sys25@edu.edugrade.com', '__HASH__', 'Emma Lindqvist', true, 1, 1),
       (63, 'alexander.norberg.sys25@edu.edugrade.com', '__HASH__', 'Alexander Norberg', true, 1, 1),
       (64, 'maja.pettersson.sys25@edu.edugrade.com', '__HASH__', 'Maja Pettersson', true, 1, 1),
       (65, 'hugo.sandberg.sys25@edu.edugrade.com', '__HASH__', 'Hugo Sandberg', true, 1, 1),
       (66, 'wilma.ekman.net25@edu.edugrade.com', '__HASH__', 'Wilma Ekman', true, 1, 1),
       (67, 'lucas.blom.net25@edu.edugrade.com', '__HASH__', 'Lucas Blom', true, 1, 1),
       (68, 'ella.dahlgren.net25@edu.edugrade.com', '__HASH__', 'Ella Dahlgren', true, 1, 1),
       (69, 'oliver.forsberg.net25@edu.edugrade.com', '__HASH__', 'Oliver Forsberg', true, 1, 1),
       (70, 'astrid.hedlund.ux25@edu.edugrade.com', '__HASH__', 'Astrid Hedlund', true, 1, 1),
       (71, 'leo.isaksson.ux25@edu.edugrade.com', '__HASH__', 'Leo Isaksson', true, 1, 1),
       (72, 'saga.jansson.ux25@edu.edugrade.com', '__HASH__', 'Saga Jansson', true, 1, 1),
       (73, 'nils.karlberg.ux25@edu.edugrade.com', '__HASH__', 'Nils Karlberg', true, 1, 1),
       (74, 'freja.larsson.dev24@edu.edugrade.com', '__HASH__', 'Freja Larsson', true, 1, 1),
       (75, 'axel.magnusson.dev24@edu.edugrade.com', '__HASH__', 'Axel Magnusson', true, 1, 1),
       (76, 'klara.nyberg.dev24@edu.edugrade.com', '__HASH__', 'Klara Nyberg', true, 1, 1),
       (77, 'filip.olsson.dev24@edu.edugrade.com', '__HASH__', 'Filip Olsson', true, 1, 1),
       (78, 'ines.persson.dev24@edu.edugrade.com', '__HASH__', 'Ines Persson', true, 1, 1),
       (80, 'marie.wallin@edugrade.com', '__HASH__', 'Marie Wallin', true, 5, 2),
       (81, 'thomas.berggren@edugrade.com', '__HASH__', 'Thomas Berggren', true, 5, 2),
       (82, 'johanna.admin@edugrade.com', '__HASH__', 'Johanna Lindström', true, 10, 3),
       (83, 'banned.user@edu.edugrade.com', '__HASH__', 'Avstängd Testsson', true, 1, 1),
       (99, 'bookingform@system.local', '__NOLOGIN__', 'Bokningsformulär', true, 1, NULL)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT MAX(id) FROM users));
UPDATE users SET is_banned = true WHERE id = 83;

-- -------------------------------------------------------------
--  RESOURCES (Bilar & Utrustning)
-- -------------------------------------------------------------
INSERT INTO resource_categories (id, name)
VALUES (1, 'Fordon'), (2, 'Portabel IT'), (3, 'Övrigt')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('resource_categories', 'id'), (SELECT MAX(id) FROM resource_categories));

INSERT INTO bookable_resources (category_id, campus_id, name, description)
VALUES (1, 1, 'Skolbil 1 (Hudiksvall)', 'Vit Volkswagen Golf - ABC 123'),
       (1, 2, 'Skolbil 2 (Gävle)', 'Blå Volvo V60 - XYZ 789'),
       (2, 1, 'Projektor Kit A', 'Portabel projektor med duk')
ON CONFLICT DO NOTHING;

-- (Hoppar över bokningar och kopplingar för att spara utrymme, 
--  men de finns kvar i SQL-format om du kör setup)
