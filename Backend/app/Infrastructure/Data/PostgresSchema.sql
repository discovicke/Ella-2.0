-- =============================================================
--  Rumbokningsapp — Databasschema
--  Databas:     PostgreSQL
--  Konvention:  snake_case, TIMESTAMPTZ för tidsstämplar,
--               ENUM-typer för statusvärden med begränsad domän
--  Triggers:    set_timestamps() hanterar created_at / updated_at
--  Index:       Längst ner, enbart det nödvändigaste
-- =============================================================


-- -------------------------------------------------------------
--  ENUM-TYPER
--  Postgres-native enums avvisar ogiltiga värden automatiskt.
--  Namnges med domän som prefix för att undvika kollisioner.
-- -------------------------------------------------------------

DO $$
BEGIN
CREATE
TYPE booking_status AS ENUM ('active', 'cancelled', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- =============================================================
--  MIGRATIONSHISTORIK
-- =============================================================

-- Spårar vilka migrationsskript som körts och när.
-- version är manuellt satt (inte IDENTITY) för att migreringsverktyget
-- ska kunna styra numreringen explicit.
CREATE TABLE IF NOT EXISTS database_versions
(
    version    INTEGER PRIMARY KEY,
    name       TEXT        NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================
--  FACILITIES
-- =============================================================

-- Campus är den fysiska platsen (byggnad/adress).
-- contact är fritext — kan vara namn, telefon eller e-post.
CREATE TABLE IF NOT EXISTS campus
(
    id      BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    street  TEXT NOT NULL,
    zip     TEXT,
    city    TEXT NOT NULL,
    country TEXT NOT NULL,
    contact TEXT -- Fritext: namn, telefon eller e-post
);


-- Rumstyper som en separat tabell (i stället för Postgres ENUM)
-- vilket gör det enkelt att lägga till nya typer utan migration.
CREATE TABLE IF NOT EXISTS room_types
(
    id   BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL UNIQUE
);


-- Rum tillhör ett campus och en rumstyp.
-- ON DELETE RESTRICT förhindrar att ett campus eller rumstyp
-- raderas om det finns rum kopplade till det.
CREATE TABLE IF NOT EXISTS rooms
(
    id           BIGINT  NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    campus_id    BIGINT  NOT NULL REFERENCES campus (id) ON DELETE RESTRICT,
    name         TEXT    NOT NULL,
    capacity     INTEGER, -- NULL = okänd/ej relevant
    room_type_id BIGINT  NOT NULL REFERENCES room_types (id) ON DELETE RESTRICT,
    floor        TEXT,
    notes        TEXT
);


-- Typer av assets (projektor, whiteboard, TV, etc.)
CREATE TABLE IF NOT EXISTS asset_types
(
    id          BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    description TEXT NOT NULL UNIQUE
);


-- Kopplingstabell rum ↔ asset-typ.
-- En rad = en fysisk enhet i ett rum. Kvantitet hanteras genom
-- antal rader, vilket gör det enkelt att ta bort enskilda enheter.
CREATE TABLE IF NOT EXISTS room_assets
(
    id            BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    room_id       BIGINT NOT NULL REFERENCES rooms (id) ON DELETE CASCADE,
    asset_type_id BIGINT NOT NULL REFERENCES asset_types (id) ON DELETE RESTRICT,
    notes         TEXT
);


-- =============================================================
--  PERMISSION SYSTEM
-- =============================================================

-- Alla möjliga behörighetsnycklar i systemet.
-- Fungerar som "master list" — övriga permission-tabeller
-- refererar till dessa nycklar via FK.
CREATE TABLE IF NOT EXISTS system_permissions
(
    key         TEXT PRIMARY KEY,
    description TEXT NOT NULL
);


-- Mallar för behörighetsuppsättningar (roller).
-- En mall tilldelas en användare och definierar grundbehörigheterna.
CREATE TABLE IF NOT EXISTS permission_templates
(
    id         BIGINT  PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name       TEXT    NOT NULL UNIQUE,
    label      TEXT    NOT NULL,
    css_class  TEXT,
    sort_order INTEGER DEFAULT 0
);


-- Behörighetsvärden kopplade till en mall.
-- value: TRUE = tillåten, FALSE = nekad.
CREATE TABLE IF NOT EXISTS permission_template_flags
(
    template_id    BIGINT NOT NULL REFERENCES permission_templates (id) ON DELETE CASCADE,
    permission_key TEXT    NOT NULL REFERENCES system_permissions (key) ON DELETE CASCADE,
    value          BOOLEAN NOT NULL,
    PRIMARY KEY (template_id, permission_key)
);


-- =============================================================
--  USERS & PROFIL
-- =============================================================

-- Klasser/grupper som användare tillhör.
CREATE TABLE IF NOT EXISTS class
(
    id         BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    class_name TEXT NOT NULL
);


-- Huvudtabell för användare.
-- permission_template_id: en användare har exakt ett template.
-- tokens_valid_after: används för JWT-invalidering — tokens utfärdade
-- innan detta värde ska avvisas av applikationen.
-- ON DELETE SET NULL på template: en användare utan template
-- behandlas som en användare utan behörigheter.
CREATE TABLE IF NOT EXISTS users
(
    id                     BIGINT      PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    email                  TEXT        NOT NULL,
    password_hash          TEXT        NOT NULL,
    display_name           TEXT,
    is_banned              BOOLEAN     NOT NULL DEFAULT FALSE,
    tokens_valid_after     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    permission_template_id BIGINT      REFERENCES permission_templates (id) ON DELETE SET NULL
);


-- Personliga behörighetsavvikelser per användare.
-- NULL  = ingen avvikelse, ärv från templatens värde.
-- TRUE  = personlig override: tillåten oavsett template.
-- FALSE = personlig override: nekad oavsett template.
-- Applikationslogik: COALESCE(override.value, template_flag.value, FALSE)
CREATE TABLE IF NOT EXISTS user_permission_overrides
(
    user_id        BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    permission_key TEXT    NOT NULL REFERENCES system_permissions (key) ON DELETE CASCADE,
    value          BOOLEAN, -- NULL = ärv från template
    PRIMARY KEY (user_id, permission_key)
);


-- Kopplingstabell användare ↔ campus
CREATE TABLE IF NOT EXISTS user_campus
(
    id        BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id   BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    campus_id BIGINT NOT NULL REFERENCES campus (id) ON DELETE CASCADE,
    UNIQUE (user_id, campus_id)
);


-- Kopplingstabell användare ↔ klass
CREATE TABLE IF NOT EXISTS user_class
(
    id       BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id  BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    class_id BIGINT NOT NULL REFERENCES class (id) ON DELETE CASCADE,
    UNIQUE (user_id, class_id)
);


-- Kopplingstabell klass ↔ campus (many-to-many)
CREATE TABLE IF NOT EXISTS class_campus
(
    id        BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    class_id  BIGINT NOT NULL REFERENCES class (id) ON DELETE CASCADE,
    campus_id BIGINT NOT NULL REFERENCES campus (id) ON DELETE CASCADE,
    UNIQUE (class_id, campus_id)
);


-- =============================================================
--  BOOKINGS
-- =============================================================

-- En bokning kopplar en användare till ett rum under en tidsperiod.
-- status är en Postgres ENUM — ogiltiga värden avvisas av databasen.
-- ON DELETE RESTRICT på user_id och room_id: en bokning ska inte
-- försvinna om en användare eller ett rum råkar raderas av misstag.
-- created_at sätts av trigger; updated_at uppdateras av trigger vid UPDATE.
CREATE TABLE IF NOT EXISTS bookings
(
    id         BIGINT         PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id    BIGINT         NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    room_id    BIGINT         NOT NULL REFERENCES rooms (id) ON DELETE RESTRICT,
    start_time TIMESTAMPTZ    NOT NULL,
    end_time   TIMESTAMPTZ    NOT NULL,
    status     booking_status NOT NULL DEFAULT 'active',
    notes      TEXT,
    created_at TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,

    -- Säkerställer att sluttid alltid är efter starttid
    CONSTRAINT chk_booking_times CHECK (end_time > start_time)
);


-- Kopplingstabell användare ↔ bokning.
-- Används för bokningar med flera deltagare utöver bokaren själv.
CREATE TABLE IF NOT EXISTS registrations
(
    user_id    BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    booking_id BIGINT NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, booking_id)
);


-- =============================================================
--  VYER
-- =============================================================

-- Effektiva behörigheter per användare.
-- Kombinerar template-flaggor med personliga overrides.
-- COALESCE: personlig override vinner om den finns (även FALSE),
-- annars används templatens värde, annars FALSE (nekad).
CREATE
OR REPLACE
VIEW v_user_effective_permissions AS
SELECT u.id                                  AS user_id,
       sp.key                                AS permission_key,
       COALESCE(upo.value, ptf.value, FALSE) AS is_granted
FROM users u
         CROSS JOIN system_permissions sp
         LEFT JOIN permission_templates pt
                   ON u.permission_template_id = pt.id
         LEFT JOIN permission_template_flags ptf
                   ON pt.id = ptf.template_id AND ptf.permission_key = sp.key
         LEFT JOIN user_permission_overrides upo
                   ON u.id = upo.user_id AND upo.permission_key = sp.key;


-- Berikad bokningsvy med användar- och rumsdata samt antal registrerade.
-- status beräknas dynamiskt: om end_time har passerat sätts 'expired'
-- automatiskt, utan att man behöver uppdatera raden i bookings.
CREATE
OR REPLACE
VIEW v_bookings_detailed AS
SELECT b.id               AS booking_id,
       b.user_id,
       u.display_name     AS user_name,
       u.email            AS user_email,
       b.room_id,
       r.name             AS room_name,
       r.capacity         AS room_capacity,
       rt.name            AS room_type,
       r.floor            AS room_floor,
       b.start_time,
       b.end_time,
       CASE
           WHEN b.status = 'cancelled' THEN 'cancelled'
           WHEN b.end_time < NOW() THEN 'expired'
           ELSE 'active'
           END::booking_status                         AS status, b.notes,
       b.created_at,
       b.updated_at,
       COUNT(reg.user_id) AS registration_count
FROM bookings b
         LEFT JOIN users u ON b.user_id = u.id
         LEFT JOIN rooms r ON b.room_id = r.id
         LEFT JOIN room_types rt ON r.room_type_id = rt.id
         LEFT JOIN registrations reg ON b.id = reg.booking_id
GROUP BY b.id, b.user_id, u.display_name, u.email,
         b.room_id, r.name, r.capacity, rt.name, r.floor,
         b.start_time, b.end_time, b.status, b.notes,
         b.created_at, b.updated_at;


-- Rumsdetaljer med assets som en |||‑separerad sträng.
-- STRING_AGG ger en text som matchar C#-modellens AssetsString
-- (samma mönster som SQLite-vyns GROUP_CONCAT).
DROP VIEW IF EXISTS v_room_details;
CREATE VIEW v_room_details AS
SELECT r.id    AS RoomId,
       r.campus_id  AS CampusId,
       c.city  AS CampusCity,
       r.name  AS Name,
       r.capacity AS Capacity,
       r.room_type_id AS RoomTypeId,
       rt.name AS RoomTypeName,
       r.floor AS Floor,
       r.notes AS Notes,
       STRING_AGG(at.description, '|||') FILTER (WHERE at.description IS NOT NULL)
               AS AssetsString
FROM rooms r
         LEFT JOIN campus c ON r.campus_id = c.id
         LEFT JOIN room_types rt ON r.room_type_id = rt.id
         LEFT JOIN room_assets ra ON r.id = ra.room_id
         LEFT JOIN asset_types at ON ra.asset_type_id = at.id
GROUP BY r.id, r.campus_id, c.city, r.name, r.capacity,
         r.room_type_id, rt.name, r.floor, r.notes;


-- =============================================================
--  TRIGGER: Automatisk hantering av created_at / updated_at
-- =============================================================

-- Triggerfunktion som anropas av Postgres före INSERT och UPDATE.
-- NEW är den rad som håller på att skrivas till disk.
-- Funktionen modifierar NEW innan raden sparas.
-- RETURNS TRIGGER är obligatoriskt för triggerfunktioner.
CREATE
OR REPLACE
FUNCTION set_timestamps()
RETURNS TRIGGER AS $$
BEGIN IF TG_OP = 'INSERT' THEN
        -- Vid INSERT: tvinga created_at till NOW() oavsett vad som skickades in
        NEW.created_at = NOW();
ELSIF TG_OP = 'UPDATE' THEN
        -- Vid UPDATE: rör aldrig created_at, sätt updated_at till nu
        NEW.created_at = OLD.created_at;
NEW.updated_at = NOW();
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- Koppla triggern till bookings.
-- BEFORE: körs innan raden skrivs, så att vi kan ändra NEW.
-- FOR EACH ROW: körs en gång per påverkad rad (inte per query).
CREATE
OR REPLACE
TRIGGER trg_bookings_timestamps
BEFORE INSERT OR
UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION set_timestamps();


-- =============================================================
--  INDEX
--  Enbart det nödvändigaste — för många index kostar skrivprestanda.
--  Primary keys och UNIQUE-constraints skapar automatiskt index.
-- =============================================================

-- Email används vid varje inloggning.
-- UNIQUE INDEX ger både integritetsgaranti och snabb uppslagning.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email
    ON users (email);

-- Det viktigaste prestandaindexet i applikationen.
-- Frågan "är rum X ledigt mellan tid A och B?" körs vid varje bokningsförsök.
-- Sammansatt index på (room_id, start_time, end_time) låter Postgres
-- besvara frågan utan att läsa hela bookings-tabellen.
CREATE INDEX IF NOT EXISTS idx_bookings_room_time
    ON bookings (room_id, start_time, end_time);

-- "Visa mina bokningar" är en vanlig vy för inloggad användare.
CREATE INDEX IF NOT EXISTS idx_bookings_user_id
    ON bookings (user_id);

-- Behörighetskontroll slår upp alla overrides för en specifik användare.
CREATE INDEX IF NOT EXISTS idx_user_perm_overrides_user_id
    ON user_permission_overrides (user_id);