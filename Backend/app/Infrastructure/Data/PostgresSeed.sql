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
       ('ManageUsers', 'Can manage users'),
       ('ManageClasses', 'Can manage classes'),
       ('ManageRooms', 'Can manage rooms'),
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
--  Student (1):  BookRoom
--  Educator (2): BookRoom
--  Admin (3):    Alla behörigheter
-- -------------------------------------------------------------

INSERT INTO permission_template_flags (template_id, permission_key, value)
VALUES (1, 'BookRoom', true);

INSERT INTO permission_template_flags (template_id, permission_key, value)
VALUES (2, 'BookRoom', true);

-- Admin får alla behörigheter dynamiskt från system_permissions
INSERT INTO permission_template_flags (template_id, permission_key, value)
SELECT 3, key, true
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

INSERT INTO users (id, email, password_hash, display_name, is_active, permission_template_id)
    OVERRIDING SYSTEM VALUE
VALUES (1, 'admin@edugrade.com', '__HASH__', 'Admin Testberg', true, 3),
       (2, 'campus.admin@edugrade.com', '__HASH__', 'Campus Manager', true, 3),
       (3, 'sven.svensson@edugrade.com', '__HASH__', 'Sven Svensson', true, 2),
       (4, 'karin.karlsson.gavle@edugrade.com', '__HASH__', 'Karin Karlsson', true, 2),
       (5, 'anders.andersson@edugrade.com', '__HASH__', 'Anders Andersson', true, 2),
       (10, 'andre.ponten.net25@edu.edugrade.com', '__HASH__', 'André Pontén', true, 1),
       (11, 'christian.gennari.net25@edu.edugrade.com', '__HASH__', 'Christian Gennari', true, 1),
       (12, 'marcus.loov.net25@edu.edugrade.com', '__HASH__', 'Marcus Lööv', true, 1),
       (13, 'viktor.johansson.net25@edu.edugrade.com', '__HASH__', 'Viktor Johansson', true, 1),
       (14, 'sofia.eriksson.net25@edu.edugrade.com', '__HASH__', 'Sofia Eriksson', true, 1),
       (15, 'erik.nilsson.net25@edu.edugrade.com', '__HASH__', 'Erik Nilsson', true, 1),
       (20, 'linda.berg.ux25@edu.edugrade.com', '__HASH__', 'Linda Berg', true, 1),
       (21, 'mikael.holm.ux25@edu.edugrade.com', '__HASH__', 'Mikael Holm', true, 1),
       (22, 'anna.sundstrom.ux25@edu.edugrade.com', '__HASH__', 'Anna Sundström', true, 1),
       (23, 'per.ostlund.ux25@edu.edugrade.com', '__HASH__', 'Per Östlund', true, 1),
       (30, 'johan.kvist.dev24@edu.edugrade.com', '__HASH__', 'Johan Kvist', true, 1),
       (31, 'elena.popova.dev24@edu.edugrade.com', '__HASH__', 'Elena Popova', true, 1),
       (32, 'oscar.lundin.dev24@edu.edugrade.com', '__HASH__', 'Oscar Lundin', true, 1),
       (33, 'oscar.lundin.dev222@edu.edugrade.com', '__HASH__', 'Custom Guy', true, NULL),
       (50, 'elev@edugrade.com', '__HASH__', 'Elev Testlund', true, 1),

       -- Extra students for pagination testing (sys25 - Hudiksvall)
       (60, 'lisa.franzen.sys25@edu.edugrade.com', '__HASH__', 'Lisa Franzén', true, 1),
       (61, 'david.hall.sys25@edu.edugrade.com', '__HASH__', 'David Hall', true, 1),
       (62, 'emma.lindqvist.sys25@edu.edugrade.com', '__HASH__', 'Emma Lindqvist', true, 1),
       (63, 'alexander.norberg.sys25@edu.edugrade.com', '__HASH__', 'Alexander Norberg', true, 1),
       (64, 'maja.pettersson.sys25@edu.edugrade.com', '__HASH__', 'Maja Pettersson', true, 1),
       (65, 'hugo.sandberg.sys25@edu.edugrade.com', '__HASH__', 'Hugo Sandberg', true, 1),

       -- Extra students (net25 - Hudiksvall)
       (66, 'wilma.ekman.net25@edu.edugrade.com', '__HASH__', 'Wilma Ekman', true, 1),
       (67, 'lucas.blom.net25@edu.edugrade.com', '__HASH__', 'Lucas Blom', true, 1),
       (68, 'ella.dahlgren.net25@edu.edugrade.com', '__HASH__', 'Ella Dahlgren', true, 1),
       (69, 'oliver.forsberg.net25@edu.edugrade.com', '__HASH__', 'Oliver Forsberg', true, 1),

       -- Extra students (ux25 - Gävle)
       (70, 'astrid.hedlund.ux25@edu.edugrade.com', '__HASH__', 'Astrid Hedlund', true, 1),
       (71, 'leo.isaksson.ux25@edu.edugrade.com', '__HASH__', 'Leo Isaksson', true, 1),
       (72, 'saga.jansson.ux25@edu.edugrade.com', '__HASH__', 'Saga Jansson', true, 1),
       (73, 'nils.karlberg.ux25@edu.edugrade.com', '__HASH__', 'Nils Karlberg', true, 1),

       -- Extra students (dev24 - Sundsvall)
       (74, 'freja.larsson.dev24@edu.edugrade.com', '__HASH__', 'Freja Larsson', true, 1),
       (75, 'axel.magnusson.dev24@edu.edugrade.com', '__HASH__', 'Axel Magnusson', true, 1),
       (76, 'klara.nyberg.dev24@edu.edugrade.com', '__HASH__', 'Klara Nyberg', true, 1),
       (77, 'filip.olsson.dev24@edu.edugrade.com', '__HASH__', 'Filip Olsson', true, 1),
       (78, 'ines.persson.dev24@edu.edugrade.com', '__HASH__', 'Ines Persson', true, 1),

       -- Extra educators
       (80, 'marie.wallin@edugrade.com', '__HASH__', 'Marie Wallin', true, 2),
       (81, 'thomas.berggren@edugrade.com', '__HASH__', 'Thomas Berggren', true, 2),

       -- Extra admins
       (82, 'johanna.admin@edugrade.com', '__HASH__', 'Johanna Lindström', true, 3),

       -- Banned user for filter testing
       (83, 'banned.user@edu.edugrade.com', '__HASH__', 'Avstängd Testsson', true, 1),

       -- System user for public booking form
       (99, 'bookingform@system.local', '__NOLOGIN__', 'Bokningsformulär', true, NULL);

SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT MAX(id) FROM users));

-- Ban user 83
UPDATE users SET is_banned = true WHERE id = 83;


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
       (66, 2),
       (67, 2),
       (68, 2),
       (69, 2),
       (20, 3),
       (21, 3),
       (22, 3),
       (23, 3),
       (70, 3),
       (71, 3),
       (72, 3),
       (73, 3),
       (30, 4),
       (31, 4),
       (32, 4),
       (74, 4),
       (75, 4),
       (76, 4),
       (77, 4),
       (78, 4),
       (60, 5),
       (61, 5),
       (62, 5),
       (63, 5),
       (64, 5),
       (65, 5);


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
       (66, 1),
       (67, 1),
       (68, 1),
       (69, 1),
       (20, 2),
       (21, 2),
       (22, 2),
       (23, 2),
       (70, 2),
       (71, 2),
       (72, 2),
       (73, 2),
       (30, 3),
       (31, 3),
       (32, 3),
       (74, 3),
       (75, 3),
       (76, 3),
       (77, 3),
       (78, 3),
       (60, 1),
       (61, 1),
       (62, 1),
       (63, 1),
       (64, 1),
       (65, 1),
       (80, 1),
       (81, 2),
       (82, 1),
       (83, 1);


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
VALUES
       -- ============================================================
       --  ADMIN TESTBERG (user 1) — 40 bookings total for pagination
       -- ============================================================
       -- Februari (historik)
       (100, 3, 1, '2026-02-01 09:00:00+01', '2026-02-01 10:00:00+01', 'active', 'Månadsmöte administration'),
       (101, 12, 1, '2026-02-05 14:00:00+01', '2026-02-05 15:30:00+01', 'active', 'Intervju ny personal'),
       (102, 3, 1, '2026-02-10 08:30:00+01', '2026-02-10 09:30:00+01', 'cancelled', 'AVBOKAT: Ledningsgrupp'),
       (103, 1, 1, '2026-02-12 10:00:00+01', '2026-02-12 12:00:00+01', 'active', 'Genomgång av säkerhetsprocedurer'),
       (104, 6, 1, '2026-02-15 13:00:00+01', '2026-02-15 15:00:00+01', 'active', 'Inspektion av fiberlab'),
       (105, 3, 1, '2026-02-18 09:00:00+01', '2026-02-18 10:00:00+01', 'active', 'Kvartalsplanering'),
       (106, 3, 1, '2026-02-21 10:00:00+01', '2026-02-21 11:00:00+01', 'active', 'Systemunderhåll planering'),
       (107, 22, 1, '2026-02-25 13:00:00+01', '2026-02-25 14:00:00+01', 'active', 'Budgetmöte Q1'),
       (108, 12, 1, '2026-02-26 09:00:00+01', '2026-02-26 10:30:00+01', 'active', 'Möte med fastighetsskötare'),
       (109, 3, 1, '2026-02-27 15:00:00+01', '2026-02-27 16:00:00+01', 'cancelled', 'AVBOKAT: Fredagsfika special'),
       -- Mars (kommande)
       (110, 4, 1, '2026-03-01 08:00:00+01', '2026-03-01 12:00:00+01', 'active', 'Personalutbildning: HLR'),
       (111, 20, 1, '2026-03-05 10:00:00+01', '2026-03-05 15:00:00+01', 'active', 'Campus-turné: Sundsvall'),
       (112, 10, 1, '2026-03-06 10:00:00+01', '2026-03-06 15:00:00+01', 'active', 'Campus-turné: Gävle'),
       (113, 3, 1, '2026-03-09 09:00:00+01', '2026-03-09 10:30:00+01', 'active', 'Uppföljning kursutvärdering'),
       (114, 1, 1, '2026-03-10 13:00:00+01', '2026-03-10 15:00:00+01', 'active', 'Workshop: Ny LMS-plattform'),
       (115, 12, 1, '2026-03-11 10:00:00+01', '2026-03-11 11:30:00+01', 'cancelled', 'AVBOKAT: Leverantörsmöte'),
       (116, 4, 1, '2026-03-13 08:00:00+01', '2026-03-13 12:00:00+01', 'active', 'Brandövning hela campus'),
       (117, 22, 1, '2026-03-16 14:00:00+01', '2026-03-16 16:00:00+01', 'active', 'IT-säkerhet genomgång'),
       (118, 3, 1, '2026-03-18 09:00:00+01', '2026-03-18 10:00:00+01', 'active', 'Veckomöte ledning'),
       (119, 6, 1, '2026-03-19 13:00:00+01', '2026-03-19 15:00:00+01', 'active', 'Labbinventering fiberlab'),
       (120, 10, 1, '2026-03-20 09:00:00+01', '2026-03-20 16:00:00+01', 'active', 'Rekryteringsdag Gävle'),
       (121, 3, 1, '2026-03-23 10:00:00+01', '2026-03-23 11:00:00+01', 'active', 'Schemaplanering HT2026'),
       (122, 20, 1, '2026-03-25 09:00:00+01', '2026-03-25 12:00:00+01', 'active', 'Strategimöte Sundsvall'),
       (123, 1, 1, '2026-03-26 13:00:00+01', '2026-03-26 15:00:00+01', 'cancelled', 'AVBOKAT: Nätverksmigration'),
       (124, 4, 1, '2026-03-27 08:30:00+01', '2026-03-27 11:00:00+01', 'active', 'Examinationsplanering'),
       (125, 12, 1, '2026-03-30 14:00:00+01', '2026-03-30 15:30:00+01', 'active', 'Medarbetarsamtal'),
       (126, 3, 1, '2026-03-31 09:00:00+01', '2026-03-31 10:30:00+01', 'active', 'Kvartalsavslut Q1'),
       -- April
       (127, 1, 1, '2026-04-01 08:00:00+02', '2026-04-01 10:00:00+02', 'active', 'Terminsstart uppföljning'),
       (128, 6, 1, '2026-04-03 13:00:00+02', '2026-04-03 16:00:00+02', 'active', 'Uppgradering labbutrustning'),
       (129, 22, 1, '2026-04-07 10:00:00+02', '2026-04-07 12:00:00+02', 'active', 'Samarbete med Mittuniversitetet'),
       (130, 3, 1, '2026-04-08 09:00:00+02', '2026-04-08 10:00:00+02', 'active', 'Veckomöte ledning'),
       (131, 10, 1, '2026-04-10 09:00:00+02', '2026-04-10 16:00:00+02', 'active', 'Öppet hus Gävle'),
       (132, 4, 1, '2026-04-14 08:00:00+02', '2026-04-14 12:00:00+02', 'active', 'Tentamensövervakning'),
       (133, 3, 1, '2026-04-15 14:00:00+02', '2026-04-15 15:00:00+02', 'cancelled', 'AVBOKAT: Konferens Stockholm'),
       (134, 20, 1, '2026-04-17 09:00:00+02', '2026-04-17 15:00:00+02', 'active', 'Campus-inspektion Sundsvall'),
       (135, 1, 1, '2026-04-22 10:00:00+02', '2026-04-22 12:00:00+02', 'active', 'Budget HT2026 planering'),
       (136, 12, 1, '2026-04-24 13:00:00+02', '2026-04-24 14:30:00+02', 'active', 'Intervju: Ny lärartjänst'),
       (137, 3, 1, '2026-04-28 09:00:00+02', '2026-04-28 10:00:00+02', 'active', 'Månadsmöte april'),
       (138, 6, 1, '2026-04-29 13:00:00+02', '2026-04-29 15:00:00+02', 'active', 'Felsökning nätverkslab'),
       (139, 4, 1, '2026-04-30 08:00:00+02', '2026-04-30 12:00:00+02', 'active', 'Terminsutvärdering VT2026'),

       -- ============================================================
       --  ELEV TESTLUND (user 50) — keep existing 14
       -- ============================================================
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

       -- ============================================================
       --  EDUCATORS (users 3, 4, 5, 80, 81) — richer booking data
       -- ============================================================
       (300, 2, 3, '2026-02-20 09:00:00+01', '2026-02-20 16:00:00+01', 'active', 'Föreläsning: C# Advanced (demo26)'),
       (301, 5, 4, '2026-02-21 08:30:00+01', '2026-02-21 15:30:00+01', 'active', 'Labbarbete: Gävle Tech Night'),
       (302, 10, 4, '2026-02-24 09:00:00+01', '2026-02-24 16:00:00+01', 'active', 'UX Workshop: Design Systems'),
       (303, 20, 5, '2026-02-28 09:00:00+01', '2026-02-28 17:00:00+01', 'active', 'Öppet hus: Sundsvall'),
       (304, 2, 3, '2026-03-03 09:00:00+01', '2026-03-03 12:00:00+01', 'active', 'Föreläsning: Entity Framework'),
       (305, 4, 3, '2026-03-06 13:00:00+01', '2026-03-06 16:00:00+01', 'active', 'Kodgenomgång: Studentprojekt'),
       (306, 1, 3, '2026-03-10 08:30:00+01', '2026-03-10 11:30:00+01', 'active', 'Tentamen: Databasteknik'),
       (307, 2, 3, '2026-03-17 09:00:00+01', '2026-03-17 16:00:00+01', 'cancelled', 'AVBOKAT: Konferens'),
       (308, 10, 4, '2026-03-04 09:00:00+01', '2026-03-04 16:00:00+01', 'active', 'Figma workshop dag 1'),
       (309, 10, 4, '2026-03-05 09:00:00+01', '2026-03-05 16:00:00+01', 'active', 'Figma workshop dag 2'),
       (310, 11, 4, '2026-03-11 10:00:00+01', '2026-03-11 15:00:00+01', 'active', 'Prototyp-labb: React Native'),
       (311, 20, 5, '2026-03-12 09:00:00+01', '2026-03-12 12:00:00+01', 'active', 'Gästföreläsning: AI i utbildning'),
       (312, 21, 5, '2026-03-18 13:00:00+01', '2026-03-18 16:00:00+01', 'active', 'Lab: Python maskinlärning'),
       (313, 20, 5, '2026-03-25 09:00:00+01', '2026-03-25 17:00:00+01', 'active', 'Hackathonarrangemang'),
       (314, 2, 80, '2026-03-02 09:00:00+01', '2026-03-02 12:00:00+01', 'active', 'Föreläsning: Systemdesign'),
       (315, 4, 80, '2026-03-09 13:00:00+01', '2026-03-09 16:00:00+01', 'active', 'Workshop: Docker & Kubernetes'),
       (316, 1, 80, '2026-03-16 08:30:00+01', '2026-03-16 11:30:00+01', 'active', 'Tentamen: Operativsystem'),
       (317, 10, 81, '2026-03-07 09:00:00+01', '2026-03-07 16:00:00+01', 'active', 'Kurs: Användbarhetstestning'),
       (318, 11, 81, '2026-03-14 10:00:00+01', '2026-03-14 15:00:00+01', 'active', 'Studiebesök: Sandvik UX-avd'),
       (319, 12, 81, '2026-03-21 13:00:00+01', '2026-03-21 15:00:00+01', 'active', 'Handledning: Examensarbete'),

       -- ============================================================
       --  STUDENT BOOKINGS (various students) — more volume
       -- ============================================================
       (400, 1, 10, '2026-03-03 09:00:00+01', '2026-03-03 12:00:00+01', 'active', 'Grupparbete: REST API'),
       (401, 5, 11, '2026-03-04 13:00:00+01', '2026-03-04 16:00:00+01', 'active', 'Laboration: Nätverkssäkerhet'),
       (402, 4, 12, '2026-03-05 08:00:00+01', '2026-03-05 12:00:00+01', 'active', 'Eget arbete: Slutprojekt'),
       (403, 1, 13, '2026-03-06 09:00:00+01', '2026-03-06 11:00:00+01', 'cancelled', 'AVBOKAT: Sjuk'),
       (404, 2, 14, '2026-03-09 13:00:00+01', '2026-03-09 16:00:00+01', 'active', 'Projekt: Webbshop frontend'),
       (405, 1, 15, '2026-03-10 08:30:00+01', '2026-03-10 11:30:00+01', 'active', 'Grupparbete: CI/CD pipeline'),
       (406, 10, 20, '2026-03-03 09:00:00+01', '2026-03-03 12:00:00+01', 'active', 'Skissarbete: Rebranding'),
       (407, 10, 21, '2026-03-06 13:00:00+01', '2026-03-06 16:00:00+01', 'active', 'Användartester: App v2'),
       (408, 12, 22, '2026-03-10 10:00:00+01', '2026-03-10 12:00:00+01', 'active', 'Handledning: Portfolio'),
       (409, 10, 23, '2026-03-12 09:00:00+01', '2026-03-12 11:00:00+01', 'active', 'Wireframes: Kundprojekt'),
       (410, 20, 30, '2026-03-04 09:00:00+01', '2026-03-04 16:00:00+01', 'active', 'Hackathon-förberedelse'),
       (411, 21, 31, '2026-03-09 13:00:00+01', '2026-03-09 16:00:00+01', 'active', 'Labb: Arduino IoT-sensor'),
       (412, 20, 32, '2026-03-11 08:30:00+01', '2026-03-11 12:00:00+01', 'active', 'Grupparbete: Mobilapp'),
       (413, 1, 60, '2026-03-05 09:00:00+01', '2026-03-05 12:00:00+01', 'active', 'Labb: Linux-administration'),
       (414, 5, 61, '2026-03-06 13:00:00+01', '2026-03-06 16:00:00+01', 'active', 'Nätverkslabb: VLAN-konfiguration'),
       (415, 4, 62, '2026-03-10 08:00:00+01', '2026-03-10 12:00:00+01', 'active', 'Eget arbete: Serverprojekt'),
       (416, 1, 66, '2026-03-11 09:00:00+01', '2026-03-11 12:00:00+01', 'active', 'Grupparbete: Blazor-app'),
       (417, 2, 67, '2026-03-12 13:00:00+01', '2026-03-12 16:00:00+01', 'active', 'Projekt: SignalR realtidschat'),
       (418, 10, 70, '2026-03-10 09:00:00+01', '2026-03-10 12:00:00+01', 'active', 'Designsprint: Dag 1'),
       (419, 10, 71, '2026-03-11 09:00:00+01', '2026-03-11 12:00:00+01', 'active', 'Designsprint: Dag 2'),
       (420, 20, 74, '2026-03-12 09:00:00+01', '2026-03-12 16:00:00+01', 'active', 'Kodmaraton: Game jam'),
       (421, 21, 75, '2026-03-13 13:00:00+01', '2026-03-13 16:00:00+01', 'cancelled', 'AVBOKAT: Tågförsenad');

SELECT setval(pg_get_serial_sequence('bookings', 'id'), (SELECT MAX(id) FROM bookings));


-- -------------------------------------------------------------
--  REGISTRATIONS
-- -------------------------------------------------------------

-- ═══════════════════════════════════════════════════════════════
--  CONFIRMED REGISTRATIONS (status = 'registered')
--  Users who have accepted / RSVP'd to someone else's booking.
-- ═══════════════════════════════════════════════════════════════
INSERT INTO registrations (booking_id, user_id, status)
VALUES
       -- Educators & admins cross-attending (past — visible in Historik)
       (300, 1,  'registered'),  -- Admin      → Sven's C# lecture (Feb 20)
       (303, 1,  'registered'),  -- Admin      → Anders' open house (Feb 28)
       (301, 3,  'registered'),  -- Sven       → Karin's Gävle Tech Night (Feb 21)
       (303, 3,  'registered'),  -- Sven       → Anders' open house (Feb 28)
       (300, 4,  'registered'),  -- Karin      → Sven's C# lecture (Feb 20)
       (302, 5,  'registered'),  -- Anders     → Karin's UX Workshop (Feb 24)
       (303, 80, 'registered'),  -- Marie      → Anders' open house (Feb 28)
       (314, 5,  'registered'),  -- Anders     → Marie's Systemdesign (Mar 2)

       -- Educators & admins cross-attending (upcoming — visible in Kommande)
       (308, 3,  'registered'),  -- Sven       → Karin's Figma dag 1 (Mar 4)
       (311, 80, 'registered'),  -- Marie      → Anders' AI lecture (Mar 12)
       (313, 81, 'registered'),  -- Thomas     → Anders' Hackathon (Mar 25)

       -- Students at educator/admin events (original set — past events)
       (300, 50, 'registered'),  (300, 10, 'registered'),  (300, 11, 'registered'),  (300, 12, 'registered'),
       (302, 50, 'registered'),  (302, 20, 'registered'),  (302, 21, 'registered'),  (302, 22, 'registered'),  (302, 23, 'registered'),
       (110, 50, 'registered'),  (110, 10, 'registered'),  (110, 11, 'registered'),  (110, 20, 'registered'),

       -- Students at educator events (upcoming)
       (304, 10, 'registered'),  (304, 11, 'registered'),  (304, 12, 'registered'),  (304, 66, 'registered'),  (304, 67, 'registered'),
       (305, 13, 'registered'),  (305, 14, 'registered'),  (305, 15, 'registered'),
       (306, 10, 'registered'),  (306, 11, 'registered'),  (306, 12, 'registered'),  (306, 13, 'registered'),
       (306, 14, 'registered'),  (306, 15, 'registered'),  (306, 66, 'registered'),  (306, 67, 'registered'),
       (306, 68, 'registered'),  (306, 69, 'registered'),
       (308, 20, 'registered'),  (308, 21, 'registered'),  (308, 70, 'registered'),  (308, 71, 'registered'),
       (309, 22, 'registered'),  (309, 23, 'registered'),  (309, 72, 'registered'),  (309, 73, 'registered'),
       (311, 30, 'registered'),  (311, 31, 'registered'),  (311, 74, 'registered'),
       (313, 32, 'registered'),  (313, 75, 'registered'),  (313, 76, 'registered'),
       (314, 60, 'registered'),  (314, 61, 'registered'),  (314, 62, 'registered'),
       (315, 63, 'registered'),  (315, 64, 'registered'),  (315, 65, 'registered'),
       (316, 60, 'registered'),  (316, 61, 'registered'),  (316, 62, 'registered'),
       (316, 63, 'registered'),  (316, 64, 'registered'),  (316, 65, 'registered'),
       (317, 20, 'registered'),  (317, 21, 'registered'),  (317, 22, 'registered'),
       (317, 23, 'registered'),  (317, 70, 'registered'),  (317, 71, 'registered'),
       (420, 74, 'registered'),  (420, 75, 'registered'),  (420, 76, 'registered'),
       (420, 77, 'registered'),  (420, 78, 'registered'),

       -- Additional student cross-registrations (upcoming)
       (310, 12, 'registered'),  -- Marcus  → Karin's Prototyp-labb (Mar 11)
       (318, 22, 'registered'),  -- Anna    → Thomas' Studiebesök (Mar 14)
       (312, 31, 'registered');  -- Elena   → Anders' Python lab (Mar 18)


-- ═══════════════════════════════════════════════════════════════
--  PENDING INVITATIONS (status = 'invited')
--  Each key test user gets 1–3 upcoming invitations so the
--  invitation banner is visible when logging in as any role.
-- ═══════════════════════════════════════════════════════════════
INSERT INTO registrations (booking_id, user_id, status)
VALUES
       -- Admin Testberg (1) — admin
       (308, 1,  'invited'),     -- Figma workshop Mar 4 (Karin)
       (318, 1,  'invited'),     -- Studiebesök Sandvik Mar 14 (Thomas)

       -- Sven Svensson (3) — educator
       (111, 3,  'invited'),     -- Campus-turné Sundsvall Mar 5 (Admin)
       (317, 3,  'invited'),     -- Användbarhetstestning Mar 7 (Thomas)

       -- Karin Karlsson (4) — educator
       (311, 4,  'invited'),     -- AI i utbildning Mar 12 (Anders)
       (315, 4,  'invited'),     -- Docker & Kubernetes Mar 9 (Marie)

       -- Anders Andersson (5) — educator
       (310, 5,  'invited'),     -- Prototyp-labb Mar 11 (Karin)
       (116, 5,  'invited'),     -- Brandövning Mar 13 (Admin)

       -- Elev Testlund (50) — student
       (305, 50, 'invited'),     -- Kodgenomgång Mar 6 (Sven)
       (306, 50, 'invited'),     -- Tentamen Mar 10 (Sven)
       (315, 50, 'invited'),     -- Docker & Kubernetes Mar 9 (Marie)

       -- André Pontén (10) — student
       (308, 10, 'invited'),     -- Figma dag 1 Mar 4 (Karin)
       (311, 10, 'invited'),     -- AI i utbildning Mar 12 (Anders)
       (315, 10, 'invited'),     -- Docker & Kubernetes Mar 9 (Marie)

       -- Christian Gennari (11) — student
       (305, 11, 'invited'),     -- Kodgenomgång Mar 6 (Sven)
       (317, 11, 'invited'),     -- Användbarhetstestning Mar 7 (Thomas)

       -- Marcus Lööv (12) — student
       (312, 12, 'invited'),     -- Python maskinlärning Mar 18 (Anders)

       -- Linda Berg (20) — student
       (311, 20, 'invited'),     -- AI i utbildning Mar 12 (Anders)
       (313, 20, 'invited'),     -- Hackathon Mar 25 (Anders)

       -- Johan Kvist (30) — student
       (312, 30, 'invited'),     -- Python maskinlärning Mar 18 (Anders)
       (313, 30, 'invited'),     -- Hackathon Mar 25 (Anders)

       -- Lisa Franzén (60) — student
       (315, 60, 'invited'),     -- Docker & Kubernetes Mar 9 (Marie)
       (317, 60, 'invited'),     -- Användbarhetstestning Mar 7 (Thomas)

       -- Marie Wallin (80) — educator
       (111, 80, 'invited'),     -- Campus-turné Sundsvall Mar 5 (Admin)
       (309, 80, 'invited'),     -- Figma dag 2 Mar 5 (Karin)

       -- Thomas Berggren (81) — educator
       (112, 81, 'invited'),     -- Campus-turné Gävle Mar 6 (Admin)
       (315, 81, 'invited');     -- Docker & Kubernetes Mar 9 (Marie)


-- ═══════════════════════════════════════════════════════════════
--  DECLINED INVITATIONS (status = 'declined')
--  Users who were invited but chose to decline.
-- ═══════════════════════════════════════════════════════════════
INSERT INTO registrations (booking_id, user_id, status)
VALUES
       -- Past declined (visible in Historik as read-only)
       (301, 1,  'declined'),    -- Admin      declined Karin's Gävle Tech Night (Feb 21)
       (302, 3,  'declined'),    -- Sven       declined Karin's UX Workshop (Feb 24)
       (300, 5,  'declined'),    -- Anders     declined Sven's C# lecture (Feb 20)
       (303, 4,  'declined'),    -- Karin      declined Anders' open house (Feb 28)

       -- Upcoming declined (visible in Kommande as declined)
       (304, 50, 'declined'),    -- Elev Testlund declined Sven's upcoming (Mar 3)
       (311, 11, 'declined'),    -- Christian   declined Anders' AI (Mar 12)
       (313, 10, 'declined');    -- André      declined Anders' Hackathon (Mar 25)
-- -------------------------------------------------------------
--  ADDITIONAL RESOURCES (Cars, etc.)
-- -------------------------------------------------------------
INSERT INTO resource_categories (id, name) VALUES (1, 'Fordon'), (2, 'Portabel IT'), (3, '�vrigt') ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('resource_categories', 'id'), (SELECT MAX(id) FROM resource_categories));
INSERT INTO bookable_resources (category_id, campus_id, name, description) VALUES (1, 1, 'Skolbil 1 (Hudiksvall)', 'Vit Volkswagen Golf - ABC 123'), (1, 2, 'Skolbil 2 (G�vle)', 'Bl� Volvo V60 - XYZ 789'), (2, 1, 'Projektor Kit A', 'Portabel projektor med duk') ON CONFLICT DO NOTHING;

