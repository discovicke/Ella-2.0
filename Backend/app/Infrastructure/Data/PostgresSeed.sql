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
VALUES (1, 'Simulation data v1.2 - Normalized tables');


-- -------------------------------------------------------------
--  SYSTEM PERMISSIONS
--  Måste vara först — övriga tabeller refererar till dessa nycklar.
-- -------------------------------------------------------------

INSERT INTO system_permissions (key, description)
VALUES ('BookRoom', 'Can book rooms'),
       ('MyBookings', 'Can view own bookings'),
       ('ManageUsers', 'Can manage users'),
       ('ManageClasses', 'Can manage classes'),
       ('ManageRooms', 'Can manage rooms'),
       ('ManageAssets', 'Can manage assets'),
       ('ManageBookings', 'Can manage all bookings'),
       ('ManageCampuses', 'Can manage campuses'),
       ('ManageRoles', 'Can manage roles/permissions');


-- -------------------------------------------------------------
--  PERMISSION TEMPLATES (Roller)
--  1 = Student, 2 = Educator, 3 = Admin
-- -------------------------------------------------------------

INSERT INTO permission_templates (id, name, label, css_class, sort_order)
    OVERRIDING SYSTEM VALUE
VALUES (1, 'student', 'Student', 'green', 0),
       (2, 'educator', 'Educator', 'blue', 1),
       (3, 'admin', 'Admin', 'orange', 2);

SELECT setval(pg_get_serial_sequence('permission_templates', 'id'), (SELECT MAX(id) FROM permission_templates));


-- -------------------------------------------------------------
--  PERMISSION FLAGS
--  Student (1):  BookRoom, MyBookings
--  Educator (2): BookRoom, MyBookings, ManageClasses, ManageBookings
--  Admin (3):    Alla behörigheter
-- -------------------------------------------------------------

INSERT INTO permission_template_flags (template_id, permission_key, value)
VALUES (1, 'BookRoom', TRUE),
       (1, 'MyBookings', TRUE);

INSERT INTO permission_template_flags (template_id, permission_key, value)
VALUES (2, 'BookRoom', TRUE),
       (2, 'MyBookings', TRUE),
       (2, 'ManageClasses', TRUE),
       (2, 'ManageBookings', TRUE);

-- Admin får alla behörigheter dynamiskt från system_permissions
INSERT INTO permission_template_flags (template_id, permission_key, value)
SELECT 3, key, TRUE
FROM system_permissions;


-- -------------------------------------------------------------
--  RUMSTYPER
--  1 = Klassrum, 2 = Labb, 3 = Grupprum, 4 = Datorrum
-- -------------------------------------------------------------

INSERT INTO room_types (id, name)
    OVERRIDING SYSTEM VALUE
VALUES (1, 'Klassrum'),
       (2, 'Labb'),
       (3, 'Grupprum'),
       (4, 'Datorrum');

SELECT setval(pg_get_serial_sequence('room_types', 'id'), (SELECT MAX(id) FROM room_types));


-- -------------------------------------------------------------
--  CAMPUS
--  1 = Hudiksvall, 2 = Gävle, 3 = Sundsvall
-- -------------------------------------------------------------

INSERT INTO campus (id, street, zip, city, country, contact)
    OVERRIDING SYSTEM VALUE
VALUES (1, 'Edugrade Hudiksvall', '824 30', 'Hudiksvall', 'Sweden', 'info.hudik@edugrade.com'),
       (2, 'Edugrade Gävle', '802 67', 'Gävle', 'Sweden', 'info.gavle@edugrade.com'),
       (3, 'Edugrade Sundsvall', '852 30', 'Sundsvall', 'Sweden', 'info.sund@edugrade.com');

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
       (5, 'sys25');

SELECT setval(pg_get_serial_sequence('class', 'id'), (SELECT MAX(id) FROM class));


-- -------------------------------------------------------------
--  ANVÄNDARE
--  1-5  = Admins och lärare
--  10-32 = Studenter per klass
--  33  = Användare utan roll (NULL template)
--  50  = Generisk testelev
-- -------------------------------------------------------------

INSERT INTO users (id, email, password_hash, display_name, permission_template_id)
    OVERRIDING SYSTEM VALUE
VALUES (1, 'admin@edugrade.com', '__HASH__', 'Admin Testberg', 3),
       (2, 'campus.admin@edugrade.com', '__HASH__', 'Campus Manager', 3),
       (3, 'sven.svensson@edugrade.com', '__HASH__', 'Sven Svensson', 2),
       (4, 'karin.karlsson.gavle@edugrade.com', '__HASH__', 'Karin Karlsson', 2),
       (5, 'anders.andersson@edugrade.com', '__HASH__', 'Anders Andersson', 2),
       (10, 'andre.ponten.net25@edu.edugrade.com', '__HASH__', 'André Pontén', 1),
       (11, 'christian.gennari.net25@edu.edugrade.com', '__HASH__', 'Christian Gennari', 1),
       (12, 'marcus.loov.net25@edu.edugrade.com', '__HASH__', 'Marcus Lööv', 1),
       (13, 'viktor.johansson.net25@edu.edugrade.com', '__HASH__', 'Viktor Johansson', 1),
       (14, 'sofia.eriksson.net25@edu.edugrade.com', '__HASH__', 'Sofia Eriksson', 1),
       (15, 'erik.nilsson.net25@edu.edugrade.com', '__HASH__', 'Erik Nilsson', 1),
       (20, 'linda.berg.ux25@edu.edugrade.com', '__HASH__', 'Linda Berg', 1),
       (21, 'mikael.holm.ux25@edu.edugrade.com', '__HASH__', 'Mikael Holm', 1),
       (22, 'anna.sundstrom.ux25@edu.edugrade.com', '__HASH__', 'Anna Sundström', 1),
       (23, 'per.ostlund.ux25@edu.edugrade.com', '__HASH__', 'Per Östlund', 1),
       (30, 'johan.kvist.dev24@edu.edugrade.com', '__HASH__', 'Johan Kvist', 1),
       (31, 'elena.popova.dev24@edu.edugrade.com', '__HASH__', 'Elena Popova', 1),
       (32, 'oscar.lundin.dev24@edu.edugrade.com', '__HASH__', 'Oscar Lundin', 1),
       (33, 'oscar.lundin.dev222@edu.edugrade.com', '__HASH__', 'Custom Guy', NULL),
       (50, 'elev@edugrade.com', '__HASH__', 'Elev Testlund', 1);

SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT MAX(id) FROM users));


-- -------------------------------------------------------------
--  USER ↔ CLASS
-- -------------------------------------------------------------

INSERT INTO user_class (user_id, class_id)
VALUES (50, 1),
       (10, 2),
       (11, 2),
       (12, 2),
       (13, 2),
       (14, 2),
       (15, 2),
       (20, 3),
       (21, 3),
       (22, 3),
       (23, 3),
       (30, 4),
       (31, 4),
       (32, 4);


-- -------------------------------------------------------------
--  USER ↔ CAMPUS
-- -------------------------------------------------------------

INSERT INTO user_campus (user_id, campus_id)
VALUES (1, 1),
       (2, 2),
       (3, 1),
       (4, 2),
       (5, 3),
       (50, 1),
       (10, 1),
       (11, 1),
       (12, 1),
       (13, 1),
       (14, 1),
       (15, 1),
       (20, 2),
       (21, 2),
       (22, 2),
       (23, 2),
       (30, 3),
       (31, 3),
       (32, 3);


-- -------------------------------------------------------------
--  RUM
--  Hudiksvall: 1-6, Gävle: 10-12, Sundsvall: 20-22
-- -------------------------------------------------------------

INSERT INTO rooms (id, campus_id, name, capacity, room_type_id, floor)
    OVERRIDING SYSTEM VALUE
VALUES (1, 1, 'Lintjärn', 16, 2, '1'),
       (2, 1, 'Lillfjärden', 22, 1, '1'),
       (3, 1, 'Personalrummet', 10, 3, '1'),
       (4, 1, 'Dellen', 24, 1, '2'),
       (5, 1, 'Kopparlab', 16, 2, '2'),
       (6, 1, 'Fiberlab', 20, 2, '2'),
       (10, 2, 'Gävlebukten', 30, 1, '1'),
       (11, 2, 'Bocklab', 12, 2, '1'),
       (12, 2, 'Mötesrum 1', 6, 3, '2'),
       (20, 3, 'Sundsvallsbron', 25, 1, 'Gatuplan'),
       (21, 3, 'Draken', 15, 2, '2'),
       (22, 3, 'Sälsten', 8, 3, '2');

SELECT setval(pg_get_serial_sequence('rooms', 'id'), (SELECT MAX(id) FROM rooms));


-- -------------------------------------------------------------
--  ASSET-TYPER
-- -------------------------------------------------------------

INSERT INTO asset_types (id, description)
    OVERRIDING SYSTEM VALUE
VALUES (1, 'Whiteboard'),
       (2, 'TV'),
       (3, 'Nätverksutrustning'),
       (4, 'Projektor'),
       (5, 'Fiberutrustning'),
       (6, 'Videokonferens');

SELECT setval(pg_get_serial_sequence('asset_types', 'id'), (SELECT MAX(id) FROM asset_types));


-- -------------------------------------------------------------
--  ROOM ASSETS
-- -------------------------------------------------------------

INSERT INTO room_assets (room_id, asset_type_id)
VALUES (1, 1),
       (1, 2),
       (1, 3),
       (2, 1),
       (2, 4),
       (4, 1),
       (4, 2),
       (4, 4),
       (5, 1),
       (5, 4),
       (5, 5),
       (6, 1),
       (6, 4),
       (6, 5),
       (10, 1),
       (10, 4),
       (11, 3),
       (11, 1),
       (12, 2),
       (12, 6),
       (20, 1),
       (20, 4),
       (21, 1),
       (21, 3),
       (22, 2),
       (22, 6);


-- -------------------------------------------------------------
--  BOOKINGS
--  SQLite använde INTEGER (0/1/2) för status.
--  Postgres använder booking_status ENUM: 'active'/'cancelled'/'expired'.
--  start_time/end_time är TIMESTAMPTZ — anges med tidszon.
-- -------------------------------------------------------------

INSERT INTO bookings (id, room_id, user_id, start_time, end_time, status, notes)
    OVERRIDING SYSTEM VALUE
VALUES (100, 3, 1, '2026-02-01 09:00:00+01', '2026-02-01 10:00:00+01', 'active', 'Månadsmöte administration'),
       (101, 12, 1, '2026-02-05 14:00:00+01', '2026-02-05 15:30:00+01', 'active', 'Intervju ny personal'),
       (102, 3, 1, '2026-02-10 08:30:00+01', '2026-02-10 09:30:00+01', 'cancelled', 'AVBOKAT: Ledningsgrupp'),
       (103, 1, 1, '2026-02-12 10:00:00+01', '2026-02-12 12:00:00+01', 'active', 'Genomgång av säkerhetsprocedurer'),
       (104, 6, 1, '2026-02-15 13:00:00+01', '2026-02-15 15:00:00+01', 'active', 'Inspektion av fiberlab'),
       (105, 3, 1, '2026-02-18 09:00:00+01', '2026-02-18 10:00:00+01', 'active', 'Kvartalsplanering'),
       (106, 3, 1, '2026-02-21 10:00:00+01', '2026-02-21 11:00:00+01', 'active', 'Systemunderhåll planering'),
       (107, 22, 1, '2026-02-25 13:00:00+01', '2026-02-25 14:00:00+01', 'active', 'Budgetmöte Q1'),
       (108, 12, 1, '2026-02-26 09:00:00+01', '2026-02-26 10:30:00+01', 'active', 'Möte med fastighetsskötare'),
       (109, 3, 1, '2026-02-27 15:00:00+01', '2026-02-27 16:00:00+01', 'cancelled', 'AVBOKAT: Fredagsfika special'),
       (110, 4, 1, '2026-03-01 08:00:00+01', '2026-03-01 12:00:00+01', 'active', 'Personalutbildning: HLR'),
       (111, 20, 1, '2026-03-05 10:00:00+01', '2026-03-05 15:00:00+01', 'active', 'Campus-turné: Sundsvall'),
       (112, 10, 1, '2026-03-06 10:00:00+01', '2026-03-06 15:00:00+01', 'active', 'Campus-turné: Gävle'),
       (200, 1, 50, '2026-02-10 08:30:00+01', '2026-02-10 12:00:00+01', 'active', 'Grupparbete: Databaser intro'),
       (201, 2, 50, '2026-02-11 13:00:00+01', '2026-02-11 16:00:00+01', 'active', 'Projekt: Frontend basics'),
       (202, 1, 50, '2026-02-12 09:00:00+01', '2026-02-12 12:00:00+01', 'active', 'Eget arbete: SQL Lab'),
       (203, 5, 50, '2026-02-14 10:00:00+01', '2026-02-14 12:00:00+01', 'cancelled', 'AVBOKAT: Extra matte'),
       (204, 4, 50, '2026-02-15 13:00:00+01', '2026-02-15 16:00:00+01', 'active', 'Seminarie: UX principer'),
       (205, 1, 50, '2026-02-18 08:30:00+01', '2026-02-18 12:00:00+01', 'active', 'Grupparbete: API design'),
       (206, 4, 50, '2026-02-20 14:00:00+01', '2026-02-20 16:00:00+01', 'active', 'Extra stöd: Nätverksteknik'),
       (207, 1, 50, '2026-02-22 09:00:00+01', '2026-02-22 11:30:00+01', 'active', 'Eget arbete: Inlämningsuppgift'),
       (208, 2, 50, '2026-02-23 13:00:00+01', '2026-02-23 15:00:00+01', 'cancelled', 'AVBOKAT: Tandläkartid'),
       (209, 5, 50, '2026-02-24 08:00:00+01', '2026-02-24 12:00:00+01', 'active', 'Lab: Switch-konfiguration'),
       (210, 1, 50, '2026-02-25 09:00:00+01', '2026-02-25 12:00:00+01', 'active', 'Grupparbete: Slutprojekt del 1'),
       (211, 4, 50, '2026-02-26 13:00:00+01', '2026-02-26 16:00:00+01', 'active', 'Projektpresentation övning'),
       (212, 2, 50, '2026-02-27 10:00:00+01', '2026-02-27 12:00:00+01', 'active', 'Självstudier: Molntjänster'),
       (213, 1, 50, '2026-03-02 08:30:00+01', '2026-03-02 12:00:00+01', 'active', 'Repetitionsdag inför tentamen'),
       (300, 2, 3, '2026-02-20 09:00:00+01', '2026-02-20 16:00:00+01', 'active', 'Föreläsning: C# Advanced (demo26)'),
       (301, 5, 4, '2026-02-21 08:30:00+01', '2026-02-21 15:30:00+01', 'active', 'Labbarbete: Gävle Tech Night'),
       (302, 10, 4, '2026-02-24 09:00:00+01', '2026-02-24 16:00:00+01', 'active', 'UX Workshop: Design Systems'),
       (303, 20, 5, '2026-02-28 09:00:00+01', '2026-02-28 17:00:00+01', 'active', 'Öppet hus: Sundsvall');

SELECT setval(pg_get_serial_sequence('bookings', 'id'), (SELECT MAX(id) FROM bookings));


-- -------------------------------------------------------------
--  REGISTRATIONS
-- -------------------------------------------------------------

INSERT INTO registrations (booking_id, user_id)
VALUES (300, 50),
       (300, 10),
       (300, 11),
       (300, 12),
       (302, 50),
       (302, 20),
       (302, 21),
       (302, 22),
       (302, 23),
       (110, 50),
       (110, 10),
       (110, 11),
       (110, 20);