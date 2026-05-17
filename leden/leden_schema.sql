-- ==============================================================================
-- Ledenmodule Safe Mode - MariaDB Schema (FASE 3)
-- ==============================================================================

-- 1. Tabel voor aanmeldingen en leden
CREATE TABLE IF NOT EXISTS leden_submissions (
    id VARCHAR(255) PRIMARY KEY,
    naam VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    stem VARCHAR(50) NOT NULL,
    motivatie TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending' of 'member'
    aangemaakt_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    goedgekeurd_op TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabel voor geüploade bestanden (foto's en overige documenten)
CREATE TABLE IF NOT EXISTS leden_submission_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    submission_id VARCHAR(255) NOT NULL,
    bestandsnaam VARCHAR(255) NOT NULL,
    pad VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100),
    geupload_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_submission FOREIGN KEY (submission_id) REFERENCES leden_submissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabel voor toegangscodes (vervangt access.json en leden_access.json)
CREATE TABLE IF NOT EXISTS leden_access_codes (
    label VARCHAR(255) PRIMARY KEY,
    code VARCHAR(255) NOT NULL,
    leden_view BOOLEAN DEFAULT TRUE,
    leden_manage BOOLEAN DEFAULT FALSE,
    actief BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ==============================================================================
-- INDEXES
-- ==============================================================================
CREATE INDEX idx_status ON leden_submissions(status);
CREATE INDEX idx_aangemaakt_op ON leden_submissions(aangemaakt_op);
CREATE INDEX idx_access_code ON leden_access_codes(code);


-- ==============================================================================
-- RELATIES TOELICHTING:
-- ==============================================================================
-- `leden_submission_files`.`submission_id` is een Foreign Key naar `leden_submissions`.`id`.
-- `ON DELETE CASCADE` zorgt ervoor dat als een inzending wordt afgewezen/verwijderd,
-- de verwijzingen naar de bestanden in de DB ook verdwijnen.
-- De bestanden zelf moeten in de backend nog wel van disk worden verwijderd (zie fase 4).
