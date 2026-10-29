-- Financial Intelligence Tracker Initial Seed Data
USE financial_intelligence;

-- 1. Jurisdicciones
INSERT INTO jurisdictions (code, name, region, regulatory_tier, notes) VALUES
('US', 'Estados Unidos', 'Norteamérica', 'Tier 1', 'Regulación estricta bajo SEC, FINRA, CFTC. Protección SIPC hasta USD 500,000.'),
('GB', 'Reino Unido', 'Europa', 'Tier 1', 'Regulación FCA. Régimen estricto de protección FSCS.'),
('CY', 'Chipre', 'Unión Europea', 'Tier 2 / MiFID II', 'Miembro UE sujeto a directivas ESMA/MiFID II. Fondo ICF.'),
('IE', 'Irlanda', 'Unión Europea', 'Tier 1 / MiFID II', 'Banco Central de Irlanda. Sede de operativa europea tras Brexit.'),
('SC', 'Seychelles', 'Offshore', 'Offshore / Ligera', 'Regulación FSA Seychelles. Mayor apalancamiento, sin marco MiFID/SIPC.'),
('ZA', 'Sudáfrica', 'África', 'Tier 2', 'Regulación FSCA para operativa financiera continental.'),
('AR', 'Argentina', 'Latinoamérica', 'Local', 'Regulación local CNV/BCRA y régimen impositivo ARCA.')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 2. Reguladores
INSERT INTO regulators (jurisdiction_id, short_name, full_name, official_website, registry_url, country) VALUES
((SELECT id FROM jurisdictions WHERE code='US'), 'SEC', 'U.S. Securities and Exchange Commission', 'https://www.sec.gov', 'https://www.sec.gov/edgar/searchedgar/companysearch', 'Estados Unidos'),
((SELECT id FROM jurisdictions WHERE code='US'), 'FINRA', 'Financial Industry Regulatory Authority', 'https://www.finra.org', 'https://brokercheck.finra.org', 'Estados Unidos'),
((SELECT id FROM jurisdictions WHERE code='US'), 'CFTC', 'Commodity Futures Trading Commission', 'https://www.cftc.gov', 'https://www.nfa.futures.org/basicnet', 'Estados Unidos'),
((SELECT id FROM jurisdictions WHERE code='GB'), 'FCA', 'Financial Conduct Authority', 'https://www.fca.org.uk', 'https://register.fca.org.uk', 'Reino Unido'),
((SELECT id FROM jurisdictions WHERE code='CY'), 'CySEC', 'Cyprus Securities and Exchange Commission', 'https://www.cysec.gov.cy', 'https://www.cysec.gov.cy/en-GB/entities/investment-firms', 'Chipre'),
((SELECT id FROM jurisdictions WHERE code='IE'), 'CBI', 'Central Bank of Ireland', 'https://www.centralbank.ie', 'https://registers.centralbank.ie', 'Irlanda'),
((SELECT id FROM jurisdictions WHERE code='SC'), 'FSA (SC)', 'Financial Services Authority Seychelles', 'https://fsaseychelles.sc', 'https://fsaseychelles.sc/regulated-entities', 'Seychelles'),
((SELECT id FROM jurisdictions WHERE code='AR'), 'CNV', 'Comisión Nacional de Valores', 'https://www.argentina.gob.ar/cnv', 'https://www.argentina.gob.ar/cnv/registro-publico-alyc', 'Argentina'),
((SELECT id FROM jurisdictions WHERE code='AR'), 'BCRA', 'Banco Central de la República Argentina', 'https://www.bcra.gob.ar', 'https://www.bcra.gob.ar/Normativa/comunicaciones.asp', 'Argentina'),
((SELECT id FROM jurisdictions WHERE code='AR'), 'ARCA', 'Agencia de Recaudación y Control Aduanero (ex-AFIP)', 'https://www.arca.gob.ar', 'https://www.arca.gob.ar', 'Argentina')
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

-- 3. Empresas Principales (Exactamente 3)
INSERT INTO companies (id, slug, name, company_type, description, founded_year, global_hq, website, verification_status, last_reviewed_at) VALUES
(1, 'interactive-brokers', 'Interactive Brokers', 'Broker-Dealer Global / Custodio Multiactivos', 'Proveedor global de servicios de intermediación bursátil, negociación electrónica y custodia de activos múltiples (acciones, opciones, futuros, divisas y bonos). Cotiza en NASDAQ (IBKR).', 1977, 'Greenwich, Connecticut, Estados Unidos', 'https://www.interactivebrokers.com', 'Pendiente de verificación', NULL),
(2, 'exness', 'Exness', 'Broker Multiactivos (CFD / Forex)', 'Broker internacional especializado en contratos por diferencia (CFD), divisas (Forex), materias primas e índices con modelos de apalancamiento regulados según filial regional.', 2008, 'Limassol, Chipre', 'https://www.exness.com', 'Pendiente de verificación', NULL),
(3, 'tradingview', 'TradingView', 'Plataforma Tecnológica de Análisis y Gráficos Financieros', 'Plataforma web de análisis técnico, visualización de datos de mercado y red social para inversores. NO actúa como intermediario financiero ni custodio; permite enrutamiento de órdenes a brokers asociados vía API.', 2011, 'Westerville, Ohio / Delaware, Estados Unidos', 'https://www.tradingview.com', 'Pendiente de verificación', NULL)
ON DUPLICATE KEY UPDATE name=VALUES(name), company_type=VALUES(company_type);

-- 4. Entidades Jurídicas (Matrices y Filiales)
INSERT INTO legal_entities (company_id, jurisdiction_id, legal_name, entity_type, registration_number, registered_address, incorporation_date, operational_status, is_parent, verification_status, source_url, consultation_date) VALUES
-- Interactive Brokers
(1, (SELECT id FROM jurisdictions WHERE code='US'), 'Interactive Brokers Group, Inc.', 'Casa Matriz (Holding Cotizada)', 'CIK 0001381197', 'One Pickwick Plaza, Greenwich, CT 06830, USA', '2006-11-14', 'Activa', 1, 'Pendiente de verificación', 'https://www.sec.gov/edgar/browse/?CIK=0001381197', CURRENT_TIMESTAMP),
(1, (SELECT id FROM jurisdictions WHERE code='US'), 'Interactive Brokers LLC', 'Filial Operativa Principal (Broker-Dealer EE.UU.)', 'CRD 36418 / SEC 8-47257', 'One Pickwick Plaza, Greenwich, CT 06830, USA', '1993-12-01', 'Activa', 0, 'Pendiente de verificación', 'https://brokercheck.finra.org/firm/summary/36418', CURRENT_TIMESTAMP),
(1, (SELECT id FROM jurisdictions WHERE code='GB'), 'Interactive Brokers (U.K.) Limited', 'Filial Reino Unido', '03958476 (Companies House)', '20 Fenchurch Street, Floor 12, London, EC3M 3BY, UK', '2000-03-29', 'Activa', 0, 'Pendiente de verificación', 'https://register.fca.org.uk/s/firm?id=001b000000NfA4uAAF', CURRENT_TIMESTAMP),
(1, (SELECT id FROM jurisdictions WHERE code='IE'), 'Interactive Brokers Ireland Limited', 'Filial Unión Europea', '657406 (CBI C423312)', '10 Earlsfort Terrace, Dublin 2, D02 T380, Irlanda', '2019-09-19', 'Activa', 0, 'Pendiente de verificación', 'https://registers.centralbank.ie', CURRENT_TIMESTAMP),

-- Exness
(2, (SELECT id FROM jurisdictions WHERE code='CY'), 'Exness (Cy) Ltd', 'Filial Unión Europea', 'HE 292784', '1, Siafi Street, PORTO BELLO, Office 401, 3042, Limassol, Chipre', '2011-08-16', 'Activa', 0, 'Pendiente de verificación', 'https://www.cysec.gov.cy/en-GB/entities/investment-firms/cypriot/37637/', CURRENT_TIMESTAMP),
(2, (SELECT id FROM jurisdictions WHERE code='GB'), 'Exness (UK) Ltd', 'Filial Reino Unido (B2B/Institucional)', '08861481', '107 Cheapside, London, EC2V 6DN, UK', '2014-01-24', 'Activa', 0, 'Pendiente de verificación', 'https://register.fca.org.uk/s/firm?id=001b0000030W9v5AAC', CURRENT_TIMESTAMP),
(2, (SELECT id FROM jurisdictions WHERE code='SC'), 'Exness (SC) Ltd', 'Filial Operativa Internacional (Offshore)', '8423606-1', '9A, CT House, 2nd Floor, Providence, Mahe, Seychelles', '2019-12-18', 'Activa', 0, 'Pendiente de verificación', 'https://fsaseychelles.sc', CURRENT_TIMESTAMP),

-- TradingView
(3, (SELECT id FROM jurisdictions WHERE code='US'), 'TradingView, Inc.', 'Casa Matriz Tecnológica (C-Corp)', 'Delaware File 5038318', '470 Olde Worthington Rd., Suite 200, Westerville, OH 43082, USA', '2011-09-12', 'Activa', 1, 'Pendiente de verificación', 'https://icis.corp.delaware.gov/', CURRENT_TIMESTAMP),
(3, (SELECT id FROM jurisdictions WHERE code='GB'), 'TradingView UK Limited', 'Filial Reino Unido (Desarrollo y Soporte)', '10609349 (Companies House)', '201 Haverstock Hill, London, NW3 4QG, UK', '2017-02-08', 'Activa', 0, 'Pendiente de verificación', 'https://find-and-update.company-information.service.gov.uk/company/10609349', CURRENT_TIMESTAMP);

-- 5. Licencias y Autorizaciones
INSERT INTO licenses (company_id, legal_entity_id, regulator_id, jurisdiction_id, license_number, license_type, scope_description, authorized_countries, official_record_url, verification_status, granted_date, consultation_date) VALUES
-- IBKR Licenses
(1, (SELECT id FROM legal_entities WHERE legal_name='Interactive Brokers LLC'), (SELECT id FROM regulators WHERE short_name='SEC'), (SELECT id FROM jurisdictions WHERE code='US'), 'SEC 8-47257', 'Broker-Dealer Registration', 'Intermediación y custodia de valores en mercados estadounidenses.', 'Estados Unidos y clientes internacionales bajo jurisdicción US', 'https://brokercheck.finra.org/firm/summary/36418', 'Pendiente de verificación', '1995-01-01', CURRENT_TIMESTAMP),
(1, (SELECT id FROM legal_entities WHERE legal_name='Interactive Brokers LLC'), (SELECT id FROM regulators WHERE short_name='FINRA'), (SELECT id FROM jurisdictions WHERE code='US'), 'CRD 36418', 'FINRA Member Firm', 'Intermediación bursátil, membresía en NYSE, NASDAQ y principales bolsas.', 'Estados Unidos', 'https://brokercheck.finra.org/firm/summary/36418', 'Pendiente de verificación', '1995-01-01', CURRENT_TIMESTAMP),
(1, (SELECT id FROM legal_entities WHERE legal_name='Interactive Brokers (U.K.) Limited'), (SELECT id FROM regulators WHERE short_name='FCA'), (SELECT id FROM jurisdictions WHERE code='GB'), 'FCA 208159', 'Investment Firm Authorization', 'Negociación, custodia y gestión de instrumentos financieros para clientes del Reino Unido y Europa.', 'Reino Unido', 'https://register.fca.org.uk/s/firm?id=001b000000NfA4uAAF', 'Pendiente de verificación', '2001-12-01', CURRENT_TIMESTAMP),
(1, (SELECT id FROM legal_entities WHERE legal_name='Interactive Brokers Ireland Limited'), (SELECT id FROM regulators WHERE short_name='CBI'), (SELECT id FROM jurisdictions WHERE code='IE'), 'C423312', 'MiFID II Investment Firm', 'Provisión de servicios de inversión y custodia para residentes en el Espacio Económico Europeo.', 'Espacio Económico Europeo (EEE)', 'https://registers.centralbank.ie', 'Pendiente de verificación', '2020-11-20', CURRENT_TIMESTAMP),

-- Exness Licenses
(2, (SELECT id FROM legal_entities WHERE legal_name='Exness (Cy) Ltd'), (SELECT id FROM regulators WHERE short_name='CySEC'), (SELECT id FROM jurisdictions WHERE code='CY'), '178/12', 'CIF (Cyprus Investment Firm)', 'Recepción y transmisión de órdenes, ejecución por cuenta de clientes y negociación por cuenta propia en derivados/CFD.', 'Unión Europea / Espacio Económico Europeo', 'https://www.cysec.gov.cy/en-GB/entities/investment-firms/cypriot/37637/', 'Pendiente de verificación', '2012-04-17', CURRENT_TIMESTAMP),
(2, (SELECT id FROM legal_entities WHERE legal_name='Exness (UK) Ltd'), (SELECT id FROM regulators WHERE short_name='FCA'), (SELECT id FROM jurisdictions WHERE code='GB'), '730729', 'FCA Authorised Firm', 'Servicios de inversión mayorista/profesional. Operación minorista B2C discontinuada en UK.', 'Reino Unido (Clientes profesionales e institucionales)', 'https://register.fca.org.uk/s/firm?id=001b0000030W9v5AAC', 'Pendiente de verificación', '2016-10-28', CURRENT_TIMESTAMP),
(2, (SELECT id FROM legal_entities WHERE legal_name='Exness (SC) Ltd'), (SELECT id FROM regulators WHERE short_name='FSA (SC)'), (SELECT id FROM jurisdictions WHERE code='SC'), 'SD025', 'Securities Dealer License', 'Negociación de contratos por diferencia y activos extrabursátiles para clientes globales fuera de UE/UK.', 'Jurisdicciones internacionales admitidas (excluye residentes de EE.UU., UE y otras áreas restringidas)', 'https://fsaseychelles.sc', 'Pendiente de verificación', '2020-05-13', CURRENT_TIMESTAMP),

-- TradingView Regulatory Status (Explícito: No es broker)
(3, (SELECT id FROM legal_entities WHERE legal_name='TradingView, Inc.'), (SELECT id FROM regulators WHERE short_name='SEC'), (SELECT id FROM jurisdictions WHERE code='US'), 'NO_BROKER_REG', 'Entidad Tecnológica Exenta de Registro Broker-Dealer', 'TradingView no custodia fondos de clientes, no actúa como contraparte de operaciones bursátiles ni ejecuta órdenes directamente. Provee tecnología de gráficos y API para que los usuarios se conecten a sus brokers autorizados independientes.', 'Global (Servicio de software y visualización)', 'https://www.tradingview.com/policies/', 'Pendiente de verificación', '2011-09-12', CURRENT_TIMESTAMP);

-- 6. Fuentes Oficiales Iniciales
INSERT INTO sources (company_id, name, category, url, is_official, verification_status, manual_check_required, access_method) VALUES
-- Interactive Brokers Sources
(1, 'SEC EDGAR - Interactive Brokers Group, Inc. CIK 0001381197', 'Regulador Oficial', 'https://www.sec.gov/edgar/browse/?CIK=0001381197', 1, 'Pendiente de verificación', 0, 'HTTP_GET'),
(1, 'FINRA BrokerCheck - Interactive Brokers LLC CRD 36418', 'Regulador Oficial', 'https://brokercheck.finra.org/firm/summary/36418', 1, 'Pendiente de verificación', 1, 'PUBLIC_REGISTRY_SEARCH'),
(1, 'FCA Financial Services Register - Interactive Brokers (U.K.) Limited 208159', 'Regulador Oficial', 'https://register.fca.org.uk/s/firm?id=001b000000NfA4uAAF', 1, 'Pendiente de verificación', 1, 'PUBLIC_REGISTRY_SEARCH'),
(1, 'Portal Legal y Regulatorio de Interactive Brokers', 'Portal Corporativo', 'https://www.interactivebrokers.com/en/general/legal.php', 1, 'Pendiente de verificación', 0, 'HTTP_GET'),
(1, 'Estructura de Comisiones y Tarifas IBKR', 'Portal Corporativo', 'https://www.interactivebrokers.com/en/pricing/commissions-home.php', 1, 'Pendiente de verificación', 0, 'HTTP_GET'),

-- Exness Sources
(2, 'CySEC Register - Exness (Cy) Ltd Licencia 178/12', 'Regulador Oficial', 'https://www.cysec.gov.cy/en-GB/entities/investment-firms/cypriot/37637/', 1, 'Pendiente de verificación', 0, 'HTTP_GET'),
(2, 'FCA Register - Exness (UK) Ltd 730729', 'Regulador Oficial', 'https://register.fca.org.uk/s/firm?id=001b0000030W9v5AAC', 1, 'Pendiente de verificación', 1, 'PUBLIC_REGISTRY_SEARCH'),
(2, 'Portal de Regulación Oficial de Exness', 'Portal Corporativo', 'https://www.exness.com/regulatory/', 1, 'Pendiente de verificación', 0, 'HTTP_GET'),
(2, 'Documentos Legales y Contrato de Cliente Exness', 'Portal Corporativo', 'https://www.exness.com/legal-documents/', 1, 'Pendiente de verificación', 0, 'HTTP_GET'),

-- TradingView Sources
(3, 'Términos de Servicio y Declaraciones Legales de TradingView', 'Términos de Servicio', 'https://www.tradingview.com/policies/', 1, 'Pendiente de verificación', 0, 'HTTP_GET'),
(3, 'Directorio Oficial de Brokers Integrados de TradingView', 'Portal Corporativo', 'https://www.tradingview.com/broker-directory/', 1, 'Pendiente de verificación', 0, 'HTTP_GET'),
(3, 'Registro de Compañías del Reino Unido - TradingView UK Limited', 'Regulador Oficial', 'https://find-and-update.company-information.service.gov.uk/company/10609349', 1, 'Pendiente de verificación', 0, 'HTTP_GET'),

-- Fuentes Argentinas Generales
(NULL, 'CNV - Registro Público de ALYC y Regulaciones', 'Fuente Argentina', 'https://www.argentina.gob.ar/cnv', 1, 'Verificado en fuente oficial', 1, 'MANUAL_PORTAL'),
(NULL, 'ARCA (ex-AFIP) - Normativa Tributaria y Régimen Exterior', 'Fuente Argentina', 'https://www.arca.gob.ar', 1, 'Verificado en fuente oficial', 1, 'MANUAL_PORTAL'),
(NULL, 'BCRA - Régimen Cambiario y Normas sobre Exterior', 'Fuente Argentina', 'https://www.bcra.gob.ar', 1, 'Verificado en fuente oficial', 1, 'MANUAL_PORTAL');

-- 7. Impuestos y Costos Iniciales
INSERT INTO cost_tax_entries (company_id, legal_entity_id, jurisdiction_id, category, title, current_value, source_url, verification_status, notes) VALUES
-- IBKR
(1, (SELECT id FROM legal_entities WHERE legal_name='Interactive Brokers LLC'), (SELECT id FROM jurisdictions WHERE code='US'), 'Comisiones y Tarifas', 'Estructura IBKR Pro vs IBKR Lite', 'Modelo IBKR Pro: Comisiones escalonadas (Tiered desde USD 0.0035/acción) o fijas (Fixed USD 0.005/acción, mín. USD 1.00). Clientes no estadounidenses operan habitualmente bajo IBKR Pro.', 'https://www.interactivebrokers.com/en/pricing/commissions-home.php', 'Pendiente de verificación', 'Consultar siempre la tabla por instrumento bursátil y divisa.'),
(1, (SELECT id FROM legal_entities WHERE legal_name='Interactive Brokers LLC'), (SELECT id FROM jurisdictions WHERE code='US'), 'Custodia / Mantenimiento', 'Cargos de inactividad o custodia', 'Actualmente USD 0.00 de mantenimiento de cuenta mensual o custodia para cuentas estándar (eliminado cargo previo de inactividad en 2021).', 'https://www.interactivebrokers.com/en/pricing/commissions-home.php', 'Pendiente de verificación', 'Sujeto a verificación en última actualización de tarifas.'),
(1, (SELECT id FROM legal_entities WHERE legal_name='Interactive Brokers LLC'), (SELECT id FROM jurisdictions WHERE code='US'), 'Obligaciones Personales', 'Retención Fiscal IRS Formulario W-8BEN', 'Para residentes en Argentina o fuera de EE.UU.: retención de dividendos de fuente US del 30% (tasa general sin tratado bilateral de doble imposición con Argentina). Ganancias de capital exentas de retención en origen US.', 'https://www.irs.gov/forms-pubs/about-form-w-8-ben', 'Pendiente de verificación', 'Requiere firma periódica de W-8BEN.'),

-- Exness
(2, (SELECT id FROM legal_entities WHERE legal_name='Exness (SC) Ltd'), (SELECT id FROM jurisdictions WHERE code='SC'), 'Comisiones y Tarifas', 'Diferenciales (Spreads) y Comisión por Lote', 'Cuentas Standard con spread flotante sin comisión por lote. Cuentas Raw Spread / Zero con spread desde 0.0 pips y comisión fija por lote (hasta USD 3.50 por lote por lado).', 'https://www.exness.com', 'Pendiente de verificación', 'Las condiciones varían de acuerdo a la filial contratante.'),
(2, (SELECT id FROM legal_entities WHERE legal_name='Exness (SC) Ltd'), (SELECT id FROM jurisdictions WHERE code='SC'), 'Margen / Financiamiento', 'Costos de Swap y Opciones Swap-Free', 'Cargos diarios por mantenimiento de posiciones abiertas nocturnas (Swaps) o estatus swap-free en instrumentos selectos para clientes admisibles.', 'https://www.exness.com', 'Pendiente de verificación', 'Difiere según activo y volatilidad.'),

-- TradingView
(3, (SELECT id FROM legal_entities WHERE legal_name='TradingView, Inc.'), (SELECT id FROM jurisdictions WHERE code='US'), 'Comisiones y Tarifas', 'Planes de Suscripción de Software', 'Servicio básico gratuito. Planes pagos mensuales/anuales (Essential, Plus, Premium) para funciones de análisis avanzadas, gráficos adicionales e indicadores ilimitados. No cobra comisión de custodia ni corretaje.', 'https://www.tradingview.com/pricing/', 'Pendiente de verificación', 'No es un cargo transaccional de bolsa; es un cargo SaaS.');

-- 8. Fuentes y Normativa Oficial Argentina (CNV, ARCA, BCRA)
INSERT INTO argentina_regulatory_entries (authority, company_id, category, norm_reference, summary, official_url, requires_manual_check, status_note, verification_status) VALUES
('CNV', 1, 'Regulación Financiera', 'Ley 26.831 de Mercado de Capitales y Normas CNV (N.T. 2013)', 'Interactive Brokers LLC no figura registrada como ALYC (Agente de Liquidación y Compensación) ni AN (Agente de Negociación) en la CNV de la República Argentina. Los inversores argentinos que operan con IBKR lo hacen directamente bajo la jurisdicción de EE.UU. o filial respectiva, sin cobertura del fondo de garantía local de la CNV.', 'https://www.argentina.gob.ar/cnv/registro-publico-alyc', 1, 'Requiere búsqueda manual en el Padrón de ALYC habilitados por la CNV.', 'Verificado en fuente oficial'),
('CNV', 2, 'Regulación Financiera', 'Alertas al Inversor y Registro Público CNV', 'Exness no posee autorización ni matrícula ante la Comisión Nacional de Valores (CNV) para realizar oferta pública de servicios de inversión ni captación de fondos en territorio argentino. Toda contratación se realiza bajo legislación de su filial externa.', 'https://www.argentina.gob.ar/cnv', 1, 'Consulta en Registro Público y Comunicados de Alerta de la CNV.', 'Verificado en fuente oficial'),
('CNV', 3, 'Regulación Financiera', 'Marco Aplicable a Plataformas de Software', 'TradingView Inc. no requiere matrícula de ALYC ante la CNV ya que opera estrictamente como plataforma informática de análisis técnico y provisión de cotizaciones. No recibe depósitos ni intermedia órdenes en mercados locales.', 'https://www.argentina.gob.ar/cnv', 0, 'No sujeta a supervisión de custodia por no ser entidad financiera.', 'Verificado en fuente oficial'),
('BCRA', NULL, 'Régimen Cambiario y Transferencias', 'Texto Ordenado de Exterior y Cambios - Com. A 7030, A 7340 y modif.', 'Regula la transferencia de divisas hacia y desde el exterior. El fondeo de cuentas de inversión en el exterior por parte de residentes puede realizarse a través de operaciones de Contado con Liquidación (CCL) o transferencias bancarias desde cuentas propias a nombre del mismo titular.', 'https://www.bcra.gob.ar/Normativa/comunicaciones.asp', 1, 'Sujeto a circulares periódicas del BCRA y cupos normativos.', 'Verificado en fuente oficial'),
('ARCA', NULL, 'Impuestos Personales / Bienes Personales', 'Ley 23.966 y modificaciones (Impuesto sobre los Bienes Personales)', 'Los saldos en cuentas de inversión en el exterior y las tenencias de acciones, bonos o instrumentos extranjeros al 31 de diciembre de cada año fiscal deben declararse y tributar el Impuesto sobre los Bienes Personales según la escala vigente.', 'https://www.arca.gob.ar', 1, 'Tributación personal del inversor; la plataforma exterior no actúa como agente de retención en Argentina.', 'Verificado en fuente oficial'),
('ARCA', NULL, 'Impuesto a las Ganancias', 'Ley 20.628 de Impuesto a las Ganancias (Rentas de Fuente Extranjera)', 'Los dividendos percibidos y las rentas derivadas de la enajenación de valores mobiliarios en el exterior constituyen ganancias de fuente extranjera sujetas a la alícuota general progresiva en Argentina. Puede computarse como pago a cuenta el impuesto análogo abonado en el exterior según límites de ley.', 'https://www.arca.gob.ar', 1, 'Determinación obligatoria en la Declaración Jurada anual de Ganancias.', 'Verificado en fuente oficial');
