-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'MEDICAL_ADMIN', 'DOCTOR', 'NURSE', 'DISPATCHER', 'VOLUNTEER');

-- CreateEnum
CREATE TYPE "StationType" AS ENUM ('FIELD_POST', 'CENTRAL_DEPOT');

-- CreateEnum
CREATE TYPE "StationStatus" AS ENUM ('OPERATIONAL', 'HIGH_LOAD', 'FULL', 'CLOSED');

-- CreateEnum
CREATE TYPE "BedStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "DoctorDutyStatus" AS ENUM ('ON_DUTY', 'CODE_RED', 'IN_TRANSIT', 'STANDBY', 'OFF_DUTY');

-- CreateEnum
CREATE TYPE "NurseDutyStatus" AS ENUM ('ON_DUTY', 'INTERCEPTING', 'STANDBY', 'OFF_DUTY');

-- CreateEnum
CREATE TYPE "PatientSex" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "AttendeeRole" AS ENUM ('STUDENT', 'VOLUNTEER', 'FACULTY', 'VISITOR');

-- CreateEnum
CREATE TYPE "TriagePriority" AS ENUM ('P1_IMMEDIATE', 'P2_URGENT', 'P3_MINOR', 'UNTRIAGED');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('REPORTED', 'TRIAGE', 'OBSERVATION', 'ESCALATED', 'DISCHARGED');

-- CreateEnum
CREATE TYPE "IncidentCategory" AS ENUM ('HEAT', 'TRAUMA', 'RESPIRATORY', 'ALLERGY', 'GI', 'CARDIAC', 'OTHER');

-- CreateEnum
CREATE TYPE "ClinicalNoteType" AS ENUM ('REPORTED', 'FIELD_RESPONSE', 'STATION_TRANSFER', 'INTERVENTION', 'ASSESSMENT', 'DIAGNOSTIC_NOTE', 'DISCHARGE');

-- CreateEnum
CREATE TYPE "EquipmentCategory" AS ENUM ('AED', 'MONITOR', 'OXYGEN', 'SUCTION', 'DIAGNOSTIC', 'STRETCHER', 'OTHER');

-- CreateEnum
CREATE TYPE "EquipmentStatus" AS ENUM ('OPERATIONAL', 'IN_USE', 'LOW_BATTERY', 'MAINTENANCE', 'RETIRED');

-- CreateEnum
CREATE TYPE "AmbulanceTier" AS ENUM ('ALS_ICU', 'BLS', 'FIELD_4X4', 'MUTUAL_AID');

-- CreateEnum
CREATE TYPE "AmbulanceStatus" AS ENUM ('STANDBY', 'EN_ROUTE', 'ON_SCENE', 'RETURNING', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "DispatchPriority" AS ENUM ('CODE_RED', 'URGENT', 'STANDARD');

-- CreateEnum
CREATE TYPE "DispatchStatus" AS ENUM ('DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('P1_CRITICAL', 'P2_URGENT', 'BROADCAST');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'INTERCEPTING', 'ON_SCENE', 'RESOLVED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "staff_code" TEXT,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "external_auth_id" TEXT,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "sid" VARCHAR NOT NULL,
    "sess" JSON NOT NULL,
    "expire" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("sid")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "before_json" JSONB,
    "after_json" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "key" VARCHAR(100) NOT NULL,
    "category" TEXT NOT NULL,
    "value_json" JSONB NOT NULL,
    "updated_by_user_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "medical_stations" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "location_desc" TEXT NOT NULL,
    "station_type" "StationType" NOT NULL DEFAULT 'FIELD_POST',
    "capacity" INTEGER NOT NULL,
    "status" "StationStatus" NOT NULL DEFAULT 'OPERATIONAL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medical_stations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "station_beds" (
    "id" TEXT NOT NULL,
    "station_id" TEXT NOT NULL,
    "bed_code" TEXT NOT NULL,
    "status" "BedStatus" NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "station_beds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctors" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "station_id" TEXT,
    "bmdc_number" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "specialization" TEXT NOT NULL,
    "is_station_lead" BOOLEAN NOT NULL DEFAULT false,
    "radio_channel" TEXT,
    "phone_ext" TEXT,
    "duty_status" "DoctorDutyStatus" NOT NULL DEFAULT 'ON_DUTY',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nurses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "station_id" TEXT,
    "bnmc_number" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "vhf_callsign" TEXT,
    "is_rapid_responder" BOOLEAN NOT NULL DEFAULT false,
    "duty_status" "NurseDutyStatus" NOT NULL DEFAULT 'ON_DUTY',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nurses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "record_code" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "sex" "PatientSex" NOT NULL,
    "blood_group" TEXT,
    "attendee_role" "AttendeeRole" NOT NULL,
    "institutional_id" TEXT,
    "emergency_contact_name" TEXT,
    "emergency_contact_phone" TEXT,
    "allergies_notes" TEXT,
    "medical_history_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_incidents" (
    "id" TEXT NOT NULL,
    "incident_code" TEXT NOT NULL,
    "patient_id" TEXT,
    "station_id" TEXT,
    "bed_id" TEXT,
    "lead_doctor_id" TEXT,
    "lead_nurse_id" TEXT,
    "reported_by_user_id" TEXT,
    "triage_priority" "TriagePriority" NOT NULL DEFAULT 'UNTRIAGED',
    "status" "IncidentStatus" NOT NULL DEFAULT 'REPORTED',
    "category" "IncidentCategory" NOT NULL DEFAULT 'OTHER',
    "chief_complaint" TEXT NOT NULL,
    "hpi_notes" TEXT,
    "gcs_score" INTEGER,
    "location_text" TEXT NOT NULL,
    "discharge_checklist_json" JSONB,
    "admitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "discharged_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medical_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_vitals" (
    "id" TEXT NOT NULL,
    "incident_id" TEXT NOT NULL,
    "recorded_by_user_id" TEXT,
    "heart_rate" INTEGER,
    "bp_systolic" INTEGER,
    "bp_diastolic" INTEGER,
    "spo2" INTEGER,
    "temp_c" DECIMAL(4,1),
    "resp_rate" INTEGER,
    "glucose_mgdl" INTEGER,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_vitals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_notes" (
    "id" TEXT NOT NULL,
    "incident_id" TEXT NOT NULL,
    "author_user_id" TEXT,
    "milestone_type" "ClinicalNoteType" NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicines" (
    "id" TEXT NOT NULL,
    "sku_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "generic_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "storage_requirement" TEXT NOT NULL,
    "is_controlled" BOOLEAN NOT NULL DEFAULT false,
    "unit_label" TEXT NOT NULL,
    "min_par_level" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medicines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicine_batches" (
    "id" TEXT NOT NULL,
    "medicine_id" TEXT NOT NULL,
    "station_id" TEXT NOT NULL,
    "batch_number" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "max_quantity" INTEGER NOT NULL,
    "expiry_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medicine_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicine_dispensations" (
    "id" TEXT NOT NULL,
    "incident_id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "quantity_dispensed" INTEGER NOT NULL,
    "dose_route" TEXT NOT NULL,
    "administered_by_user_id" TEXT,
    "verified_by_user_id" TEXT,
    "dispensed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medicine_dispensations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_equipment" (
    "id" TEXT NOT NULL,
    "asset_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "serial_number" TEXT NOT NULL,
    "category" "EquipmentCategory" NOT NULL,
    "station_id" TEXT,
    "status" "EquipmentStatus" NOT NULL DEFAULT 'OPERATIONAL',
    "battery_pct" INTEGER,
    "last_inspected_at" TIMESTAMP(3),
    "next_audit_due" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medical_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ambulances" (
    "id" TEXT NOT NULL,
    "callsign" TEXT NOT NULL,
    "plate_number" TEXT NOT NULL,
    "tier" "AmbulanceTier" NOT NULL,
    "driver_name" TEXT NOT NULL,
    "paramedic_lead" TEXT NOT NULL,
    "station_id" TEXT,
    "status" "AmbulanceStatus" NOT NULL DEFAULT 'STANDBY',
    "fuel_pct" INTEGER,
    "equipment_summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ambulances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ambulance_dispatches" (
    "id" TEXT NOT NULL,
    "ambulance_id" TEXT NOT NULL,
    "incident_id" TEXT,
    "dispatched_by_user_id" TEXT,
    "destination_hospital" TEXT NOT NULL,
    "priority" "DispatchPriority" NOT NULL DEFAULT 'URGENT',
    "eta_minutes" INTEGER,
    "status" "DispatchStatus" NOT NULL DEFAULT 'DISPATCHED',
    "notes" TEXT,
    "dispatched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "ambulance_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_alerts" (
    "id" TEXT NOT NULL,
    "incident_id" TEXT,
    "created_by_user_id" TEXT,
    "acknowledged_by_user_id" TEXT,
    "severity" "AlertSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "location_text" TEXT NOT NULL,
    "description" TEXT,
    "status" "AlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "emergency_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_staff_code_key" ON "users"("staff_code");

-- CreateIndex
CREATE UNIQUE INDEX "users_external_auth_id_key" ON "users"("external_auth_id");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE INDEX "IDX_session_expire" ON "user_sessions"("expire");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_idx" ON "audit_logs"("actor_user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "system_settings_category_idx" ON "system_settings"("category");

-- CreateIndex
CREATE UNIQUE INDEX "medical_stations_code_key" ON "medical_stations"("code");

-- CreateIndex
CREATE INDEX "medical_stations_station_type_idx" ON "medical_stations"("station_type");

-- CreateIndex
CREATE INDEX "medical_stations_status_idx" ON "medical_stations"("status");

-- CreateIndex
CREATE INDEX "station_beds_station_id_status_idx" ON "station_beds"("station_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "station_beds_station_id_bed_code_key" ON "station_beds"("station_id", "bed_code");

-- CreateIndex
CREATE UNIQUE INDEX "doctors_user_id_key" ON "doctors"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "doctors_bmdc_number_key" ON "doctors"("bmdc_number");

-- CreateIndex
CREATE INDEX "doctors_station_id_idx" ON "doctors"("station_id");

-- CreateIndex
CREATE INDEX "doctors_duty_status_idx" ON "doctors"("duty_status");

-- CreateIndex
CREATE UNIQUE INDEX "nurses_user_id_key" ON "nurses"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "nurses_bnmc_number_key" ON "nurses"("bnmc_number");

-- CreateIndex
CREATE UNIQUE INDEX "nurses_vhf_callsign_key" ON "nurses"("vhf_callsign");

-- CreateIndex
CREATE INDEX "nurses_station_id_idx" ON "nurses"("station_id");

-- CreateIndex
CREATE INDEX "nurses_duty_status_idx" ON "nurses"("duty_status");

-- CreateIndex
CREATE UNIQUE INDEX "patients_record_code_key" ON "patients"("record_code");

-- CreateIndex
CREATE INDEX "patients_institutional_id_idx" ON "patients"("institutional_id");

-- CreateIndex
CREATE INDEX "patients_full_name_idx" ON "patients"("full_name");

-- CreateIndex
CREATE UNIQUE INDEX "medical_incidents_incident_code_key" ON "medical_incidents"("incident_code");

-- CreateIndex
CREATE INDEX "medical_incidents_patient_id_idx" ON "medical_incidents"("patient_id");

-- CreateIndex
CREATE INDEX "medical_incidents_station_id_idx" ON "medical_incidents"("station_id");

-- CreateIndex
CREATE INDEX "medical_incidents_bed_id_idx" ON "medical_incidents"("bed_id");

-- CreateIndex
CREATE INDEX "medical_incidents_status_triage_priority_idx" ON "medical_incidents"("status", "triage_priority");

-- CreateIndex
CREATE INDEX "medical_incidents_reported_by_user_id_idx" ON "medical_incidents"("reported_by_user_id");

-- CreateIndex
CREATE INDEX "medical_incidents_admitted_at_idx" ON "medical_incidents"("admitted_at");

-- CreateIndex
CREATE INDEX "patient_vitals_incident_id_recorded_at_idx" ON "patient_vitals"("incident_id", "recorded_at");

-- CreateIndex
CREATE INDEX "clinical_notes_incident_id_created_at_idx" ON "clinical_notes"("incident_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "medicines_sku_code_key" ON "medicines"("sku_code");

-- CreateIndex
CREATE INDEX "medicines_category_idx" ON "medicines"("category");

-- CreateIndex
CREATE INDEX "medicine_batches_station_id_idx" ON "medicine_batches"("station_id");

-- CreateIndex
CREATE INDEX "medicine_batches_expiry_date_idx" ON "medicine_batches"("expiry_date");

-- CreateIndex
CREATE UNIQUE INDEX "medicine_batches_medicine_id_station_id_batch_number_key" ON "medicine_batches"("medicine_id", "station_id", "batch_number");

-- CreateIndex
CREATE INDEX "medicine_dispensations_incident_id_idx" ON "medicine_dispensations"("incident_id");

-- CreateIndex
CREATE INDEX "medicine_dispensations_batch_id_idx" ON "medicine_dispensations"("batch_id");

-- CreateIndex
CREATE INDEX "medicine_dispensations_dispensed_at_idx" ON "medicine_dispensations"("dispensed_at");

-- CreateIndex
CREATE UNIQUE INDEX "medical_equipment_asset_code_key" ON "medical_equipment"("asset_code");

-- CreateIndex
CREATE UNIQUE INDEX "medical_equipment_serial_number_key" ON "medical_equipment"("serial_number");

-- CreateIndex
CREATE INDEX "medical_equipment_station_id_idx" ON "medical_equipment"("station_id");

-- CreateIndex
CREATE INDEX "medical_equipment_status_idx" ON "medical_equipment"("status");

-- CreateIndex
CREATE INDEX "medical_equipment_category_idx" ON "medical_equipment"("category");

-- CreateIndex
CREATE UNIQUE INDEX "ambulances_callsign_key" ON "ambulances"("callsign");

-- CreateIndex
CREATE UNIQUE INDEX "ambulances_plate_number_key" ON "ambulances"("plate_number");

-- CreateIndex
CREATE INDEX "ambulances_status_idx" ON "ambulances"("status");

-- CreateIndex
CREATE INDEX "ambulances_station_id_idx" ON "ambulances"("station_id");

-- CreateIndex
CREATE INDEX "ambulance_dispatches_ambulance_id_status_idx" ON "ambulance_dispatches"("ambulance_id", "status");

-- CreateIndex
CREATE INDEX "ambulance_dispatches_incident_id_idx" ON "ambulance_dispatches"("incident_id");

-- CreateIndex
CREATE INDEX "ambulance_dispatches_dispatched_at_idx" ON "ambulance_dispatches"("dispatched_at");

-- CreateIndex
CREATE INDEX "emergency_alerts_status_severity_idx" ON "emergency_alerts"("status", "severity");

-- CreateIndex
CREATE INDEX "emergency_alerts_incident_id_idx" ON "emergency_alerts"("incident_id");

-- CreateIndex
CREATE INDEX "emergency_alerts_created_at_idx" ON "emergency_alerts"("created_at");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "station_beds" ADD CONSTRAINT "station_beds_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "medical_stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "medical_stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nurses" ADD CONSTRAINT "nurses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nurses" ADD CONSTRAINT "nurses_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "medical_stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_incidents" ADD CONSTRAINT "medical_incidents_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_incidents" ADD CONSTRAINT "medical_incidents_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "medical_stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_incidents" ADD CONSTRAINT "medical_incidents_bed_id_fkey" FOREIGN KEY ("bed_id") REFERENCES "station_beds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_incidents" ADD CONSTRAINT "medical_incidents_lead_doctor_id_fkey" FOREIGN KEY ("lead_doctor_id") REFERENCES "doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_incidents" ADD CONSTRAINT "medical_incidents_lead_nurse_id_fkey" FOREIGN KEY ("lead_nurse_id") REFERENCES "nurses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_incidents" ADD CONSTRAINT "medical_incidents_reported_by_user_id_fkey" FOREIGN KEY ("reported_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_vitals" ADD CONSTRAINT "patient_vitals_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "medical_incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_vitals" ADD CONSTRAINT "patient_vitals_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "medical_incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicine_batches" ADD CONSTRAINT "medicine_batches_medicine_id_fkey" FOREIGN KEY ("medicine_id") REFERENCES "medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicine_batches" ADD CONSTRAINT "medicine_batches_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "medical_stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicine_dispensations" ADD CONSTRAINT "medicine_dispensations_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "medical_incidents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicine_dispensations" ADD CONSTRAINT "medicine_dispensations_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "medicine_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicine_dispensations" ADD CONSTRAINT "medicine_dispensations_administered_by_user_id_fkey" FOREIGN KEY ("administered_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicine_dispensations" ADD CONSTRAINT "medicine_dispensations_verified_by_user_id_fkey" FOREIGN KEY ("verified_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_equipment" ADD CONSTRAINT "medical_equipment_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "medical_stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambulances" ADD CONSTRAINT "ambulances_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "medical_stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambulance_dispatches" ADD CONSTRAINT "ambulance_dispatches_ambulance_id_fkey" FOREIGN KEY ("ambulance_id") REFERENCES "ambulances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambulance_dispatches" ADD CONSTRAINT "ambulance_dispatches_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "medical_incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambulance_dispatches" ADD CONSTRAINT "ambulance_dispatches_dispatched_by_user_id_fkey" FOREIGN KEY ("dispatched_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_alerts" ADD CONSTRAINT "emergency_alerts_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "medical_incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_alerts" ADD CONSTRAINT "emergency_alerts_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_alerts" ADD CONSTRAINT "emergency_alerts_acknowledged_by_user_id_fkey" FOREIGN KEY ("acknowledged_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Custom PostgreSQL Safeguards (Indexes, CHECK Constraints & Audit Immutability)
-- Appended to initial Prisma migration: 20261121000000_init

-- 1. Partial Unique Index: Prevent double-booking of any active (non-DISCHARGED) station bed
-- Allows unlimited historical DISCHARGED incidents to preserve bed history while enforcing
-- at most 1 active incident per bed at the database engine level.
CREATE UNIQUE INDEX "uq_active_incident_bed"
ON "medical_incidents" ("bed_id")
WHERE "bed_id" IS NOT NULL AND "status" <> 'DISCHARGED';

-- 2. Partial Unique Index: Enforce at most 1 designated lead doctor per medical station
-- Avoids a circular foreign key between medical_stations and doctors.
CREATE UNIQUE INDEX "uq_single_lead_doctor_per_station"
ON "doctors" ("station_id")
WHERE "is_station_lead" = true AND "station_id" IS NOT NULL;

-- 3. CHECK Constraints for Clinical, Inventory, and Fleet Integrity
ALTER TABLE "medical_stations"
  ADD CONSTRAINT "chk_medical_stations_capacity_nonneg"
  CHECK ("capacity" >= 0);

ALTER TABLE "patients"
  ADD CONSTRAINT "chk_patients_age_range"
  CHECK ("age" >= 0 AND "age" <= 130);

ALTER TABLE "medical_incidents"
  ADD CONSTRAINT "chk_medical_incidents_gcs_range"
  CHECK ("gcs_score" IS NULL OR ("gcs_score" >= 3 AND "gcs_score" <= 15));

ALTER TABLE "patient_vitals"
  ADD CONSTRAINT "chk_patient_vitals_spo2_range"
  CHECK ("spo2" IS NULL OR ("spo2" >= 0 AND "spo2" <= 100)),
  ADD CONSTRAINT "chk_patient_vitals_hr_range"
  CHECK ("heart_rate" IS NULL OR ("heart_rate" > 0 AND "heart_rate" <= 300));

ALTER TABLE "medicines"
  ADD CONSTRAINT "chk_medicines_min_par_nonneg"
  CHECK ("min_par_level" >= 0);

ALTER TABLE "medicine_batches"
  ADD CONSTRAINT "chk_medicine_batches_qty_nonneg"
  CHECK ("quantity" >= 0),
  ADD CONSTRAINT "chk_medicine_batches_max_qty_pos"
  CHECK ("max_quantity" > 0);

ALTER TABLE "medicine_dispensations"
  ADD CONSTRAINT "chk_medicine_dispensations_qty_pos"
  CHECK ("quantity_dispensed" > 0),
  ADD CONSTRAINT "chk_medicine_dispensations_distinct_verifier"
  CHECK (
    "verified_by_user_id" IS NULL
    OR "administered_by_user_id" IS NULL
    OR "verified_by_user_id" <> "administered_by_user_id"
  );

ALTER TABLE "medical_equipment"
  ADD CONSTRAINT "chk_medical_equipment_battery_range"
  CHECK ("battery_pct" IS NULL OR ("battery_pct" >= 0 AND "battery_pct" <= 100));

ALTER TABLE "ambulances"
  ADD CONSTRAINT "chk_ambulances_fuel_range"
  CHECK ("fuel_pct" IS NULL OR ("fuel_pct" >= 0 AND "fuel_pct" <= 100));

ALTER TABLE "ambulance_dispatches"
  ADD CONSTRAINT "chk_ambulance_dispatches_eta_nonneg"
  CHECK ("eta_minutes" IS NULL OR "eta_minutes" >= 0);

-- 4. Append-Only Immutability Trigger on audit_logs
-- Protects audit_logs against unauthorized UPDATE or DELETE at the PostgreSQL level.
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only: % operations are prohibited.', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_audit_logs_immutable"
BEFORE UPDATE OR DELETE ON "audit_logs"
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_mutation();
