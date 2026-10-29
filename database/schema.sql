-- Financial Intelligence Tracker Database Schema
-- Charset: utf8mb4, Collation: utf8mb4_unicode_ci

CREATE DATABASE IF NOT EXISTS financial_intelligence CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE financial_intelligence;

-- Desactivar temporalmente foreign keys para recreación limpia si es necesario
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS verification_records;
DROP TABLE IF EXISTS data_versions;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS findings;
DROP TABLE IF EXISTS research_runs;
DROP TABLE IF EXISTS cost_tax_entries;
DROP TABLE IF EXISTS argentina_regulatory_entries;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS sources;
DROP TABLE IF EXISTS licenses;
DROP TABLE IF EXISTS legal_entities;
DROP TABLE IF EXISTS regulators;
DROP TABLE IF EXISTS jurisdictions;
DROP TABLE IF EXISTS companies;

SET FOREIGN_KEY_CHECKS = 1;

-- 1. Empresas principales (3 monitoreadas: Interactive Brokers, Exness, TradingView)
CREATE TABLE companies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    company_type VARCHAR(150) NOT NULL,
    description TEXT,
    founded_year INT NULL,
    global_hq VARCHAR(255) NULL,
    website VARCHAR(255) NOT NULL,
    verification_status VARCHAR(60) NOT NULL DEFAULT 'Pendiente de verificación',
    last_reviewed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_company_slug (slug),
    INDEX idx_company_status (verification_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Jurisdicciones
CREATE TABLE jurisdictions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    region VARCHAR(100) NULL,
    regulatory_tier VARCHAR(50) NULL,
    notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_jurisdiction_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Entidades Reguladoras
CREATE TABLE regulators (
    id INT AUTO_INCREMENT PRIMARY KEY,
    jurisdiction_id INT NOT NULL,
    short_name VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    official_website VARCHAR(255) NOT NULL,
    registry_url VARCHAR(500) NULL,
    country VARCHAR(100) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_regulators_jurisdiction FOREIGN KEY (jurisdiction_id) REFERENCES jurisdictions(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Entidades Jurídicas (Matrices y Filiales)
CREATE TABLE legal_entities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    jurisdiction_id INT NOT NULL,
    legal_name VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100) NOT NULL, -- Matriz, Filial Operativa, Filial Europea, etc.
    registration_number VARCHAR(100) NULL,
    registered_address TEXT NULL,
    incorporation_date DATE NULL,
    operational_status VARCHAR(50) NOT NULL DEFAULT 'Activa',
    is_parent TINYINT(1) NOT NULL DEFAULT 0,
    verification_status VARCHAR(60) NOT NULL DEFAULT 'Pendiente de verificación',
    last_verified_at DATETIME NULL,
    source_url VARCHAR(1000) NULL,
    consultation_date DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_legal_entities_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_legal_entities_jurisdiction FOREIGN KEY (jurisdiction_id) REFERENCES jurisdictions(id) ON DELETE RESTRICT,
    INDEX idx_legal_company (company_id),
    INDEX idx_legal_status (verification_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Licencias y Autorizaciones Regulatorias
CREATE TABLE licenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    legal_entity_id INT NOT NULL,
    regulator_id INT NOT NULL,
    jurisdiction_id INT NOT NULL,
    license_number VARCHAR(100) NOT NULL,
    license_type VARCHAR(150) NOT NULL,
    scope_description TEXT NULL,
    authorized_countries TEXT NULL,
    official_record_url VARCHAR(1000) NULL,
    verification_status VARCHAR(60) NOT NULL DEFAULT 'Pendiente de verificación',
    granted_date DATE NULL,
    expiry_date DATE NULL,
    document_date DATE NULL,
    publication_date DATE NULL,
    consultation_date DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_licenses_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_licenses_legal_entity FOREIGN KEY (legal_entity_id) REFERENCES legal_entities(id) ON DELETE CASCADE,
    CONSTRAINT fk_licenses_regulator FOREIGN KEY (regulator_id) REFERENCES regulators(id) ON DELETE RESTRICT,
    CONSTRAINT fk_licenses_jurisdiction FOREIGN KEY (jurisdiction_id) REFERENCES jurisdictions(id) ON DELETE RESTRICT,
    INDEX idx_license_company (company_id),
    INDEX idx_license_num (license_number),
    INDEX idx_license_status (verification_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Fuentes de Información Oficiales y Públicas
CREATE TABLE sources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    url VARCHAR(1000) NOT NULL,
    is_official TINYINT(1) NOT NULL DEFAULT 1,
    http_status INT NULL,
    last_checked_at DATETIME NULL,
    last_success_at DATETIME NULL,
    consecutive_failures INT NOT NULL DEFAULT 0,
    last_error TEXT NULL,
    content_hash VARCHAR(64) NULL,
    verification_status VARCHAR(60) NOT NULL DEFAULT 'Pendiente de verificación',
    manual_check_required TINYINT(1) NOT NULL DEFAULT 0,
    access_method VARCHAR(100) NOT NULL DEFAULT 'HTTP_GET',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_sources_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    INDEX idx_sources_company (company_id),
    INDEX idx_sources_status (verification_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Documentos Regulatorios y Corporativos
CREATE TABLE documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    source_id INT NULL,
    legal_entity_id INT NULL,
    jurisdiction_id INT NULL,
    title VARCHAR(255) NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    url VARCHAR(1000) NOT NULL,
    document_date DATE NULL,
    publication_date DATE NULL,
    consultation_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    summary TEXT NULL,
    raw_content_preview TEXT NULL,
    content_hash VARCHAR(64) NOT NULL,
    version_number INT NOT NULL DEFAULT 1,
    verification_status VARCHAR(60) NOT NULL DEFAULT 'Pendiente de verificación',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_documents_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_documents_source FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE SET NULL,
    CONSTRAINT fk_documents_entity FOREIGN KEY (legal_entity_id) REFERENCES legal_entities(id) ON DELETE SET NULL,
    CONSTRAINT fk_documents_jurisdiction FOREIGN KEY (jurisdiction_id) REFERENCES jurisdictions(id) ON DELETE SET NULL,
    INDEX idx_docs_company (company_id),
    INDEX idx_docs_hash (content_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Ejecuciones de Investigación (Automáticas o Manuales)
CREATE TABLE research_runs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    run_type VARCHAR(50) NOT NULL, -- MANUAL, SCHEDULED
    target_scope VARCHAR(100) NOT NULL DEFAULT 'ALL',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- RUNNING, COMPLETED, FAILED, INCOMPLETE
    sources_checked INT NOT NULL DEFAULT 0,
    sources_succeeded INT NOT NULL DEFAULT 0,
    sources_failed INT NOT NULL DEFAULT 0,
    changes_detected INT NOT NULL DEFAULT 0,
    findings_count INT NOT NULL DEFAULT 0,
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME NULL,
    error_summary TEXT NULL,
    triggered_by VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
    INDEX idx_run_status (status),
    INDEX idx_run_started (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Hallazgos y Novedades Detectadas
CREATE TABLE findings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    research_run_id INT NULL,
    source_id INT NULL,
    legal_entity_id INT NULL,
    jurisdiction_id INT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- Regulación, Tarifas y Costos, Entidad Jurídica, Términos, Alerta
    finding_text TEXT NOT NULL,
    impact_level VARCHAR(50) NOT NULL DEFAULT 'INFORMATIVO', -- INFORMATIVO, REVISION_REQUERIDA, CAMBIO_REGULATORIO, ADVERTENCIA
    source_url VARCHAR(1000) NULL,
    document_date DATE NULL,
    publication_date DATE NULL,
    consultation_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    verification_status VARCHAR(60) NOT NULL DEFAULT 'Pendiente de verificación',
    detected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_findings_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_findings_run FOREIGN KEY (research_run_id) REFERENCES research_runs(id) ON DELETE SET NULL,
    CONSTRAINT fk_findings_source FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE SET NULL,
    CONSTRAINT fk_findings_entity FOREIGN KEY (legal_entity_id) REFERENCES legal_entities(id) ON DELETE SET NULL,
    CONSTRAINT fk_findings_jurisdiction FOREIGN KEY (jurisdiction_id) REFERENCES jurisdictions(id) ON DELETE SET NULL,
    INDEX idx_findings_company (company_id),
    INDEX idx_findings_status (verification_status),
    INDEX idx_findings_detected (detected_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Eventos de la Cronología
CREATE TABLE events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    event_type VARCHAR(100) NOT NULL, -- REGULATORY_UPDATE, DOCUMENT_REVISED, ENTITY_MODIFIED, FEE_UPDATE, SOURCE_OUTAGE
    summary VARCHAR(255) NOT NULL,
    detail TEXT NULL,
    source_url VARCHAR(1000) NULL,
    event_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_events_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    INDEX idx_events_company (company_id),
    INDEX idx_events_date (event_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Versiones de Datos e Historial de Cambios (Motor de Comparación Histórica)
CREATE TABLE data_versions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    legal_entity_id INT NULL,
    jurisdiction_id INT NULL,
    source_id INT NULL,
    field_name VARCHAR(100) NOT NULL,
    previous_value LONGTEXT NULL,
    new_value LONGTEXT NOT NULL,
    source_url VARCHAR(1000) NULL,
    document_date DATE NULL,
    publication_date DATE NULL,
    consultation_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    detection_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    verification_status VARCHAR(60) NOT NULL DEFAULT 'Pendiente de verificación',
    change_rationale TEXT NULL,
    CONSTRAINT fk_data_versions_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_data_versions_entity FOREIGN KEY (legal_entity_id) REFERENCES legal_entities(id) ON DELETE SET NULL,
    CONSTRAINT fk_data_versions_jurisdiction FOREIGN KEY (jurisdiction_id) REFERENCES jurisdictions(id) ON DELETE SET NULL,
    CONSTRAINT fk_data_versions_source FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE SET NULL,
    INDEX idx_versions_company (company_id),
    INDEX idx_versions_field (field_name),
    INDEX idx_versions_date (detection_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Registros de Auditoría de Verificación
CREATE TABLE verification_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    target_type VARCHAR(50) NOT NULL, -- LICENSE, LEGAL_ENTITY, DOCUMENT, COST_TAX, SOURCE, FINDING
    target_id INT NOT NULL,
    company_id INT NOT NULL,
    previous_status VARCHAR(60) NULL,
    new_status VARCHAR(60) NOT NULL,
    evidence_source_url VARCHAR(1000) NULL,
    evidence_notes TEXT NULL,
    verified_by VARCHAR(100) NOT NULL DEFAULT 'SYSTEM_RESEARCH',
    verified_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_verif_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    INDEX idx_verif_target (target_type, target_id),
    INDEX idx_verif_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Registro de Actividad y Auditoría General
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    actor VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
    ip_address VARCHAR(45) NULL,
    details JSON NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'SUCCESS',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_action (action),
    INDEX idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Impuestos y Costos
CREATE TABLE cost_tax_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    legal_entity_id INT NULL,
    jurisdiction_id INT NULL,
    source_id INT NULL,
    category VARCHAR(100) NOT NULL, -- Comisiones y Tarifas, Custodia / Mantenimiento, Margen, Impuestos Corporativos, Obligaciones Personales
    title VARCHAR(255) NOT NULL,
    current_value TEXT NOT NULL,
    source_url VARCHAR(1000) NULL,
    document_date DATE NULL,
    publication_date DATE NULL,
    consultation_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    verification_status VARCHAR(60) NOT NULL DEFAULT 'Pendiente de verificación',
    notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_cost_tax_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_cost_tax_entity FOREIGN KEY (legal_entity_id) REFERENCES legal_entities(id) ON DELETE SET NULL,
    CONSTRAINT fk_cost_tax_jurisdiction FOREIGN KEY (jurisdiction_id) REFERENCES jurisdictions(id) ON DELETE SET NULL,
    CONSTRAINT fk_cost_tax_source FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE SET NULL,
    INDEX idx_cost_tax_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Fuentes y Registros Regulatorios Oficiales Argentinos (CNV, ARCA, BCRA)
CREATE TABLE argentina_regulatory_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    authority VARCHAR(50) NOT NULL, -- CNV, ARCA, BCRA
    company_id INT NULL,
    category VARCHAR(100) NOT NULL, -- Regulación Financiera, Régimen Cambiario, Impuestos Personales / Bienes Personales, Impuesto a las Ganancias
    norm_reference VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    official_url VARCHAR(500) NOT NULL,
    requires_manual_check TINYINT(1) NOT NULL DEFAULT 1,
    status_note VARCHAR(255) NOT NULL,
    verification_status VARCHAR(60) NOT NULL DEFAULT 'Verificado en fuente oficial',
    last_checked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_arg_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    INDEX idx_arg_authority (authority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
