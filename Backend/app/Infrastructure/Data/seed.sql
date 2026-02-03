-- TODO: Migrate seed data
-- Reference: db/seed.sql
-- Update for any schema changes

INSERT INTO users (email, password_hash, role, class, display_name)
VALUES ('admin@edugrade.com', '__HASH__', 'admin', NULL, 'Admin Testberg'),
       ('larare@edugrade.com', '__HASH__', 'teacher', NULL, 'Lärare Testholm'),
       ('elev@edugrade.com', '__HASH__', 'student', 'demo26', 'Elev Testlund'),
       ('andre.ponten.net25@edu.edugrade.com', '__HASH__', 'student', 'net25', 'André Pontén'),
       ('christian.gennari.net25@edu.edugrade.com', '__HASH__', 'student', 'net25', 'Christian Gennari'),
       ('marcus.loov.net25@edu.edugrade.com', '__HASH__', 'student', 'net25', 'Marcus Lööv'),
       ('viktor.johansson.net25@edu.edugrade.com', '__HASH__', 'student', 'net25', 'Viktor Johansson');

INSERT INTO room (type, capacity, name)
VALUES ( 'lab', 16, 'Lintjärn'),
       ( 'classroom', 22, 'Lillfjärden'),
       ( 'publicarea', 10, 'Personalrummet'),
       ( 'classroom', 24, 'Dellen'),
       ( 'lab', 16, 'Kopparlab'),
       ( 'lab', 20, 'Fiberlab' );

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
       (6, 5);

INSERT INTO asset_types (description)
VALUES ( 'Whiteboard'),
       ( 'TV'),
       ( 'Nätverksutrustning'),
       ( 'Projektor'),
       ( 'Fiberutrustning');