import type { ApiMeta, AuthUser, UserRole } from '@/types/emrms';

const STORAGE_KEY = 'medijigs_cloud_demo_db_v1';
const SESSION_USER_KEY = 'medijigs_cloud_session_user_v1';

interface DemoDb {
  users: Array<{
    id: string;
    email: string;
    staffCode: string | null;
    fullName: string;
    role: UserRole;
    isActive: boolean;
    lastLoginAt: string | null;
    createdAt: string;
    doctorId?: string | null;
    nurseId?: string | null;
  }>;
  stations: Array<{
    id: string;
    code: string;
    name: string;
    sector: string;
    stationType: string;
    capacity: number;
    status: string;
  }>;
  doctors: Array<{
    id: string;
    bmdcNumber: string;
    fullName: string;
    specialization: string;
    isStationLead: boolean;
    radioChannel: string | null;
    phoneExt: string | null;
    dutyStatus: string;
    stationId: string | null;
  }>;
  nurses: Array<{
    id: string;
    bnmcNumber: string;
    fullName: string;
    specialty: string;
    vhfCallsign: string | null;
    isRapidResponder: boolean;
    dutyStatus: string;
    stationId: string | null;
  }>;
  patients: Array<{
    id: string;
    recordCode: string;
    fullName: string;
    age: number;
    sex: string;
    bloodGroup: string | null;
    attendeeRole: string;
    institutionalId: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    allergiesNotes: string | null;
    medicalHistoryNotes: string | null;
  }>;
  incidents: Array<{
    id: string;
    incidentCode: string;
    admittedAt: string;
    triagePriority: string;
    status: string;
    category: string;
    chiefComplaint: string;
    hpiNotes: string | null;
    gcsScore: number | null;
    locationText: string;
    patientId: string | null;
    stationId: string | null;
    leadDoctorId: string | null;
    leadNurseId: string | null;
    reportedByUserId: string | null;
    dischargeChecklistJson: Array<{ key: string; label: string; completed: boolean }>;
    vitals: Array<{
      id: string;
      heartRate: number | null;
      bpSystolic: number | null;
      bpDiastolic: number | null;
      spo2: number | null;
      tempC: number | null;
      respRate: number | null;
      glucoseMgdl: number | null;
      recordedAt: string;
    }>;
    clinicalNotes: Array<{
      id: string;
      milestoneType: string;
      title: string;
      notes: string;
      createdAt: string;
      author: { fullName: string; role: string } | null;
    }>;
    dispensations: Array<{
      id: string;
      quantityDispensed: number;
      doseRoute: string;
      dispensedAt: string;
      batch: { medicine: { name: string; unitLabel: string } };
      administeredBy: { fullName: string } | null;
      verifiedBy: { fullName: string } | null;
    }>;
  }>;
  alerts: Array<{
    id: string;
    severity: 'P1_CRITICAL' | 'P2_URGENT' | 'BROADCAST';
    title: string;
    locationText: string;
    description: string | null;
    status: 'ACTIVE' | 'INTERCEPTING' | 'ON_SCENE' | 'RESOLVED';
    createdAt: string;
    incident: { id: string; incidentCode: string; triagePriority: string } | null;
    createdBy: { fullName: string; role: string } | null;
    acknowledgedBy: { fullName: string; role: string } | null;
  }>;
  notices: Array<{
    id: string;
    title: string;
    content: string;
    priority: 'NORMAL' | 'IMPORTANT' | 'EMERGENCY';
    targetRole: 'ALL' | 'DOCTOR' | 'NURSE' | 'VOLUNTEER' | 'ADMIN';
    isPublished: boolean;
    createdAt: string;
    updatedAt: string;
    authorName: string;
    authorRole: string;
  }>;
  medicines: Array<{
    id: string;
    skuCode: string;
    name: string;
    genericName: string;
    category: string;
    storageRequirement: string;
    isControlled: boolean;
    unitLabel: string;
    minParLevel: number;
    batches: Array<{
      id: string;
      batchNumber: string;
      quantity: number;
      maxQuantity: number;
      expiryDate: string;
      station: { id: string; code: string; name: string };
    }>;
  }>;
  equipment: Array<{
    id: string;
    assetCode: string;
    name: string;
    model: string;
    serialNumber: string;
    category: string;
    status: string;
    batteryPct: number | null;
    lastInspectedAt: string | null;
    notes: string | null;
    stationId: string | null;
  }>;
  ambulances: Array<{
    id: string;
    callsign: string;
    plateNumber: string;
    tier: string;
    driverName: string;
    paramedicLead: string;
    status: string;
    fuelPct: number | null;
    equipmentSummary: string | null;
    stationId: string | null;
  }>;
  dispatches: Array<{
    id: string;
    ambulanceId: string;
    incidentId: string | null;
    destinationHospital: string;
    priority: string;
    etaMinutes: number | null;
    status: string;
    dispatchedAt: string;
    dispatchedByName: string;
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    summary: string;
    beforeJson: unknown;
    afterJson: unknown;
    ipAddress: string | null;
    createdAt: string;
    actor: { id: string; fullName: string; email: string; role: UserRole } | null;
  }>;
  settings: Array<{
    id: string;
    key: string;
    category: string;
    valueJson: Record<string, unknown>;
    updatedAt: string;
    updatedBy: { fullName: string } | null;
  }>;
}

function buildInitialDemoDb(): DemoDb {
  const now = Date.now();
  const isoAgo = (mins: number) => new Date(now - mins * 60000).toISOString();

  return {
    users: [
      {
        id: 'u-admin',
        email: 'admin@baust-demo.edu.bd',
        staffCode: 'ADM-01',
        fullName: 'SysAdmin Rafiqul Islam',
        role: 'SUPER_ADMIN',
        isActive: true,
        lastLoginAt: isoAgo(5),
        createdAt: isoAgo(1440),
      },
      {
        id: 'u-coord',
        email: 'e.vance@baust-demo.edu.bd',
        staffCode: 'CMD-01',
        fullName: 'Dr. Elena Vance',
        role: 'MEDICAL_ADMIN',
        isActive: true,
        lastLoginAt: isoAgo(2),
        createdAt: isoAgo(1440),
      },
      {
        id: 'u-doc',
        email: 't.hasan@baust-demo.edu.bd',
        staffCode: 'DOC-01',
        fullName: 'Dr. Tariqul Hasan',
        role: 'DOCTOR',
        isActive: true,
        lastLoginAt: isoAgo(12),
        createdAt: isoAgo(1440),
        doctorId: 'doc-1',
      },
      {
        id: 'u-nurse',
        email: 'f.yasmin@baust-demo.edu.bd',
        staffCode: 'NRS-01',
        fullName: 'Farzana Yasmin, RN',
        role: 'NURSE',
        isActive: true,
        lastLoginAt: isoAgo(18),
        createdAt: isoAgo(1440),
        nurseId: 'nrs-1',
      },
      {
        id: 'u-disp',
        email: 'dispatch@baust-demo.edu.bd',
        staffCode: 'DSP-01',
        fullName: 'Imran Chowdhury',
        role: 'DISPATCHER',
        isActive: true,
        lastLoginAt: isoAgo(25),
        createdAt: isoAgo(1440),
      },
      {
        id: 'u-vol',
        email: 'volunteer@baust-demo.edu.bd',
        staffCode: 'VOL-01',
        fullName: 'Sadia Afrin (Volunteer)',
        role: 'VOLUNTEER',
        isActive: true,
        lastLoginAt: isoAgo(30),
        createdAt: isoAgo(1440),
      },
    ],
    stations: [
      {
        id: 'st-alpha',
        code: 'ST-ALPHA',
        name: 'Alpha Triage Tent (Main Stage)',
        sector: 'North Sector',
        stationType: 'FIELD_POST',
        capacity: 8,
        status: 'OPERATIONAL',
      },
      {
        id: 'st-bravo',
        code: 'ST-BRAVO',
        name: 'Bravo Field Post (Sports Arena)',
        sector: 'East Sector',
        stationType: 'FIELD_POST',
        capacity: 6,
        status: 'HIGH_LOAD',
      },
      {
        id: 'st-charlie',
        code: 'ST-CHARLIE',
        name: 'Charlie Hydration & First Aid',
        sector: 'South Gate',
        stationType: 'FIELD_POST',
        capacity: 6,
        status: 'OPERATIONAL',
      },
    ],
    doctors: [
      {
        id: 'doc-1',
        bmdcNumber: 'A-68412',
        fullName: 'Dr. Tariqul Hasan',
        specialization: 'Emergency & Critical Care',
        isStationLead: true,
        radioChannel: 'MED-CH1',
        phoneExt: '4101',
        dutyStatus: 'ON_DUTY',
        stationId: 'st-alpha',
      },
      {
        id: 'doc-2',
        bmdcNumber: 'A-71904',
        fullName: 'Dr. Nusrat Jahan',
        specialization: 'Trauma & Sports Medicine',
        isStationLead: true,
        radioChannel: 'MED-CH2',
        phoneExt: '4102',
        dutyStatus: 'CODE_RED',
        stationId: 'st-bravo',
      },
      {
        id: 'doc-3',
        bmdcNumber: 'A-74219',
        fullName: 'Dr. Mahmudul Karim',
        specialization: 'Internal Medicine',
        isStationLead: false,
        radioChannel: 'MED-CH1',
        phoneExt: '4103',
        dutyStatus: 'ON_DUTY',
        stationId: 'st-charlie',
      },
    ],
    nurses: [
      {
        id: 'nrs-1',
        bnmcNumber: 'RN-30411',
        fullName: 'Farzana Yasmin, RN',
        specialty: 'Acute Triage & Vitals',
        vhfCallsign: 'RN-ALPHA-1',
        isRapidResponder: true,
        dutyStatus: 'ON_DUTY',
        stationId: 'st-alpha',
      },
      {
        id: 'nrs-2',
        bnmcNumber: 'RN-31892',
        fullName: 'Tanvir Ahmed, RN',
        specialty: 'Field Rapid Response',
        vhfCallsign: 'RN-BRAVO-1',
        isRapidResponder: true,
        dutyStatus: 'INTERCEPTING',
        stationId: 'st-bravo',
      },
      {
        id: 'nrs-3',
        bnmcNumber: 'RN-32510',
        fullName: 'Mehnaz Tabassum, RN',
        specialty: 'IV & Hydration Care',
        vhfCallsign: 'RN-CHARLIE-1',
        isRapidResponder: false,
        dutyStatus: 'ON_DUTY',
        stationId: 'st-charlie',
      },
    ],
    patients: [
      {
        id: 'pt-1',
        recordCode: 'PT-1001',
        fullName: 'Arifur Rahman',
        age: 22,
        sex: 'MALE',
        bloodGroup: 'O+',
        attendeeRole: 'STUDENT',
        institutionalId: 'CSE-2101042',
        emergencyContactName: 'Mizanur Rahman',
        emergencyContactPhone: '+880 1711-223344',
        allergiesNotes: 'Penicillin allergy',
        medicalHistoryNotes: 'Mild exercise-induced asthma',
      },
      {
        id: 'pt-2',
        recordCode: 'PT-1002',
        fullName: 'Tasnia Farin',
        age: 20,
        sex: 'FEMALE',
        bloodGroup: 'B+',
        attendeeRole: 'STUDENT',
        institutionalId: 'EEE-2202019',
        emergencyContactName: 'Salma Begum',
        emergencyContactPhone: '+880 1819-556677',
        allergiesNotes: 'None reported',
        medicalHistoryNotes: 'No chronic conditions',
      },
      {
        id: 'pt-3',
        recordCode: 'PT-1003',
        fullName: 'Kamrul Hasan',
        age: 24,
        sex: 'MALE',
        bloodGroup: 'A+',
        attendeeRole: 'VOLUNTEER',
        institutionalId: 'ME-2003011',
        emergencyContactName: 'Shafiqul Islam',
        emergencyContactPhone: '+880 1912-889900',
        allergiesNotes: 'Dust & pollen sensitivity',
        medicalHistoryNotes: 'None',
      },
    ],
    incidents: [
      {
        id: 'inc-1',
        incidentCode: 'INC-2025-001',
        admittedAt: isoAgo(18),
        triagePriority: 'P1_IMMEDIATE',
        status: 'ESCALATED',
        category: 'HEAT',
        chiefComplaint: 'Severe heat syncope & tachycardia near Main Stage crowd barrier',
        hpiNotes: 'Collapsed after 2 hours in direct sun; diaphoretic and dizzy.',
        gcsScore: 14,
        locationText: 'Main Stage Front Barrier',
        patientId: 'pt-1',
        stationId: 'st-alpha',
        leadDoctorId: 'doc-1',
        leadNurseId: 'nrs-1',
        reportedByUserId: 'u-vol',
        dischargeChecklistJson: [
          { key: 'vitals_stable', label: 'Vitals stable for 30+ mins', completed: true },
          { key: 'hydration_ok', label: 'Oral hydration tolerated', completed: false },
          { key: 'doc_signoff', label: 'Attending physician clearance', completed: false },
        ],
        vitals: [
          {
            id: 'v-1',
            heartRate: 118,
            bpSystolic: 102,
            bpDiastolic: 66,
            spo2: 96,
            tempC: 38.4,
            respRate: 22,
            glucoseMgdl: 94,
            recordedAt: isoAgo(14),
          },
        ],
        clinicalNotes: [
          {
            id: 'cn-1',
            milestoneType: 'ASSESSMENT',
            title: 'Doctor Observation (On-Site Rest & Observation)',
            notes:
              'Clinical Observation: Acute heat exhaustion with orthostatic hypotension.\n\nInitial Treatment / First Aid: Rapid cooling, supine elevation, 500mL Normal Saline IV.\n\nMedical Recommendation: Continuous pulse oximetry for 45 mins.\n\nReferral Decision: On-Site Rest & Observation',
            createdAt: isoAgo(10),
            author: { fullName: 'Dr. Tariqul Hasan', role: 'DOCTOR' },
          },
        ],
        dispensations: [
          {
            id: 'disp-1',
            quantityDispensed: 2,
            doseRoute: 'IV Infusion 500mL',
            dispensedAt: isoAgo(11),
            batch: { medicine: { name: 'Normal Saline 0.9% IV (500mL)', unitLabel: 'bags' } },
            administeredBy: { fullName: 'Farzana Yasmin, RN' },
            verifiedBy: { fullName: 'Dr. Tariqul Hasan' },
          },
        ],
      },
      {
        id: 'inc-2',
        incidentCode: 'INC-2025-002',
        admittedAt: isoAgo(42),
        triagePriority: 'P2_URGENT',
        status: 'OBSERVATION',
        category: 'TRAUMA',
        chiefComplaint: 'Right ankle sprain and superficial abrasion at Sports Arena',
        hpiNotes: 'Twisted ankle during inter-department football match.',
        gcsScore: 15,
        locationText: 'Sports Arena East Turf',
        patientId: 'pt-2',
        stationId: 'st-bravo',
        leadDoctorId: 'doc-2',
        leadNurseId: 'nrs-2',
        reportedByUserId: 'u-vol',
        dischargeChecklistJson: [
          { key: 'vitals_stable', label: 'Vitals stable for 30+ mins', completed: true },
          { key: 'dressing_done', label: 'Compression bandage applied', completed: true },
          { key: 'doc_signoff', label: 'Attending physician clearance', completed: false },
        ],
        vitals: [
          {
            id: 'v-2',
            heartRate: 86,
            bpSystolic: 118,
            bpDiastolic: 76,
            spo2: 99,
            tempC: 36.9,
            respRate: 16,
            glucoseMgdl: 102,
            recordedAt: isoAgo(35),
          },
        ],
        clinicalNotes: [],
        dispensations: [],
      },
      {
        id: 'inc-3',
        incidentCode: 'INC-2025-003',
        admittedAt: isoAgo(95),
        triagePriority: 'P3_MINOR',
        status: 'DISCHARGED',
        category: 'HEAT',
        chiefComplaint: 'Mild dehydration and headache near Food Court',
        hpiNotes: 'Resolved after oral rehydration salts and 30 minutes of shaded rest.',
        gcsScore: 15,
        locationText: 'South Gate Food Court',
        patientId: 'pt-3',
        stationId: 'st-charlie',
        leadDoctorId: 'doc-3',
        leadNurseId: 'nrs-3',
        reportedByUserId: 'u-vol',
        dischargeChecklistJson: [
          { key: 'vitals_stable', label: 'Vitals stable for 30+ mins', completed: true },
          { key: 'hydration_ok', label: 'Oral hydration tolerated', completed: true },
          { key: 'doc_signoff', label: 'Attending physician clearance', completed: true },
        ],
        vitals: [],
        clinicalNotes: [],
        dispensations: [],
      },
    ],
    alerts: [
      {
        id: 'al-1',
        severity: 'P1_CRITICAL',
        title: 'Heat Syncope Collapse at Main Stage Front Barrier',
        locationText: 'Main Stage Front Barrier (Sector North)',
        description: 'Rapid responder nurse and standby ALS ambulance requested on standby.',
        status: 'ACTIVE',
        createdAt: isoAgo(16),
        incident: {
          id: 'inc-1',
          incidentCode: 'INC-2025-001',
          triagePriority: 'P1_IMMEDIATE',
        },
        createdBy: { fullName: 'Dr. Elena Vance', role: 'MEDICAL_ADMIN' },
        acknowledgedBy: null,
      },
      {
        id: 'al-2',
        severity: 'P2_URGENT',
        title: 'Sports Arena Ankle Trauma Triage Intake',
        locationText: 'Bravo Field Post (Sports Arena)',
        description: 'Ice compression and analgesia evaluation in progress.',
        status: 'INTERCEPTING',
        createdAt: isoAgo(38),
        incident: {
          id: 'inc-2',
          incidentCode: 'INC-2025-002',
          triagePriority: 'P2_URGENT',
        },
        createdBy: { fullName: 'Imran Chowdhury', role: 'DISPATCHER' },
        acknowledgedBy: { fullName: 'Dr. Nusrat Jahan', role: 'DOCTOR' },
      },
    ],
    notices: [
      {
        id: 'not-1',
        title: 'Heat Advisory Level 2: Extra ORS & IV Saline Deployed',
        content:
          'Ambient temperature has reached 33.4°C. All field posts must maintain at least 30 packs of Oral Rehydration Salts and prioritize shade triage.',
        priority: 'EMERGENCY',
        targetRole: 'ALL',
        isPublished: true,
        createdAt: isoAgo(22),
        updatedAt: isoAgo(22),
        authorName: 'Dr. Elena Vance',
        authorRole: 'MEDICAL_ADMIN',
      },
      {
        id: 'not-2',
        title: 'Standby Ambulance Unit ALS-01 Pre-Positioned at North Gate',
        content:
          'ALS-01 is staged at North Gate for rapid 6-minute hospital transfer turnarounds during the evening concert surge.',
        priority: 'IMPORTANT',
        targetRole: 'ALL',
        isPublished: true,
        createdAt: isoAgo(65),
        updatedAt: isoAgo(65),
        authorName: 'Imran Chowdhury',
        authorRole: 'DISPATCHER',
      },
      {
        id: 'not-3',
        title: 'Shift Handover & Equipment Battery Verification Protocol',
        content:
          'All nurses and field volunteers should verify AED battery levels (>80%) and log all field incidents directly in the MEDIJIGS console.',
        priority: 'NORMAL',
        targetRole: 'ALL',
        isPublished: true,
        createdAt: isoAgo(140),
        updatedAt: isoAgo(140),
        authorName: 'SysAdmin Rafiqul Islam',
        authorRole: 'SUPER_ADMIN',
      },
    ],
    medicines: [
      {
        id: 'med-1',
        skuCode: 'MED-ORS-01',
        name: 'Oral Rehydration Salts (ORS Sachet)',
        genericName: 'Glucose + Electrolytes WHO Formula',
        category: 'Hydration & Electrolytes',
        storageRequirement: 'Cool dry place < 30°C',
        isControlled: false,
        unitLabel: 'sachets',
        minParLevel: 40,
        batches: [
          {
            id: 'bat-1',
            batchNumber: 'B-ORS-2026A',
            quantity: 110,
            maxQuantity: 150,
            expiryDate: '2027-08-30',
            station: { id: 'st-alpha', code: 'ST-ALPHA', name: 'Alpha Triage Tent' },
          },
        ],
      },
      {
        id: 'med-2',
        skuCode: 'MED-NS-500',
        name: 'Normal Saline 0.9% IV (500mL)',
        genericName: 'Sodium Chloride 0.9% Intravenous Infusion',
        category: 'IV Fluids',
        storageRequirement: 'Ambient < 25°C',
        isControlled: false,
        unitLabel: 'bags',
        minParLevel: 25,
        batches: [
          {
            id: 'bat-2',
            batchNumber: 'B-NS-2026B',
            quantity: 18,
            maxQuantity: 60,
            expiryDate: '2027-05-15',
            station: { id: 'st-alpha', code: 'ST-ALPHA', name: 'Alpha Triage Tent' },
          },
        ],
      },
      {
        id: 'med-3',
        skuCode: 'MED-EPI-01',
        name: 'Epinephrine Auto-Injector 0.3mg',
        genericName: 'Adrenaline Intramuscular Injection',
        category: 'Emergency Anaphylaxis',
        storageRequirement: 'Protected 20–25°C (Do not refrigerate)',
        isControlled: true,
        unitLabel: 'pens',
        minParLevel: 10,
        batches: [
          {
            id: 'bat-3',
            batchNumber: 'B-EPI-901',
            quantity: 12,
            maxQuantity: 20,
            expiryDate: '2027-11-01',
            station: { id: 'st-bravo', code: 'ST-BRAVO', name: 'Bravo Field Post' },
          },
        ],
      },
    ],
    equipment: [
      {
        id: 'eq-1',
        assetCode: 'EQ-AED-01',
        name: 'Zoll AED Plus Defibrillator',
        model: 'Zoll AED Plus',
        serialNumber: 'SN-ZL-99812',
        category: 'AED',
        status: 'OPERATIONAL',
        batteryPct: 96,
        lastInspectedAt: isoAgo(45),
        notes: 'Adult & pediatric pads sealed and verified.',
        stationId: 'st-alpha',
      },
      {
        id: 'eq-2',
        assetCode: 'EQ-MON-02',
        name: 'Mindray Multiparameter Patient Monitor',
        model: 'uMEC12',
        serialNumber: 'SN-MR-44210',
        category: 'MONITOR',
        status: 'IN_USE',
        batteryPct: 84,
        lastInspectedAt: isoAgo(60),
        notes: 'Connected to Bed A-1.',
        stationId: 'st-alpha',
      },
      {
        id: 'eq-3',
        assetCode: 'EQ-OXY-03',
        name: 'Portable Medical Oxygen Cylinder Kit (10L)',
        model: 'OxyMed Pro 10L',
        serialNumber: 'SN-OX-77123',
        category: 'OXYGEN',
        status: 'OPERATIONAL',
        batteryPct: 92,
        lastInspectedAt: isoAgo(80),
        notes: 'Regulator pressure at 1800 PSI.',
        stationId: 'st-bravo',
      },
    ],
    ambulances: [
      {
        id: 'amb-1',
        callsign: 'ALS-01',
        plateNumber: 'DHAKA-METRO-CHA-71-4401',
        tier: 'ALS_ICU',
        driverName: 'Abdur Rahim',
        paramedicLead: 'EMT Kamrul Islam',
        status: 'STANDBY',
        fuelPct: 94,
        equipmentSummary: 'Cardiac monitor, ventilator, defibrillator, oxygen',
        stationId: 'st-alpha',
      },
      {
        id: 'amb-2',
        callsign: 'BLS-02',
        plateNumber: 'DHAKA-METRO-CHA-71-4409',
        tier: 'BLS',
        driverName: 'Shafiqul Alam',
        paramedicLead: 'EMT Rezaul Karim',
        status: 'EN_ROUTE',
        fuelPct: 82,
        equipmentSummary: 'Spine board, oxygen cylinder, trauma first-aid kit',
        stationId: 'st-bravo',
      },
    ],
    dispatches: [
      {
        id: 'dsp-1',
        ambulanceId: 'amb-2',
        incidentId: 'inc-1',
        destinationHospital: 'Regional Emergency Medical Center',
        priority: 'CODE_RED',
        etaMinutes: 7,
        status: 'EN_ROUTE',
        dispatchedAt: isoAgo(9),
        dispatchedByName: 'Imran Chowdhury',
      },
    ],
    auditLogs: [
      {
        id: 'log-1',
        action: 'INCIDENT_CREATED',
        entityType: 'MedicalIncident',
        entityId: 'inc-1',
        summary: 'Logged P1 Critical incident INC-2025-001 at Main Stage Front Barrier.',
        beforeJson: null,
        afterJson: { incidentCode: 'INC-2025-001', triagePriority: 'P1_IMMEDIATE' },
        ipAddress: '127.0.0.1',
        createdAt: isoAgo(18),
        actor: {
          id: 'u-coord',
          fullName: 'Dr. Elena Vance',
          email: 'e.vance@baust-demo.edu.bd',
          role: 'MEDICAL_ADMIN',
        },
      },
      {
        id: 'log-2',
        action: 'VITALS_RECORDED',
        entityType: 'Patient',
        entityId: 'pt-1',
        summary: 'Recorded patient vitals for PT-1001 (HR 118 bpm, BP 102/66, SpO2 96%).',
        beforeJson: null,
        afterJson: { heartRate: 118, bp: '102/66', spo2: 96 },
        ipAddress: '127.0.0.1',
        createdAt: isoAgo(14),
        actor: {
          id: 'u-nurse',
          fullName: 'Farzana Yasmin, RN',
          email: 'f.yasmin@baust-demo.edu.bd',
          role: 'NURSE',
        },
      },
      {
        id: 'log-3',
        action: 'MEDICINE_DISPENSED',
        entityType: 'MedicineDispensation',
        entityId: 'disp-1',
        summary: 'Dispensed 2 bags of Normal Saline 0.9% IV (500mL) for INC-2025-001.',
        beforeJson: { batchQty: 20 },
        afterJson: { batchQty: 18, quantityDispensed: 2 },
        ipAddress: '127.0.0.1',
        createdAt: isoAgo(11),
        actor: {
          id: 'u-doc',
          fullName: 'Dr. Tariqul Hasan',
          email: 't.hasan@baust-demo.edu.bd',
          role: 'DOCTOR',
        },
      },
      {
        id: 'log-4',
        action: 'AMBULANCE_DISPATCHED',
        entityType: 'AmbulanceDispatch',
        entityId: 'dsp-1',
        summary: 'Dispatched ambulance BLS-02 (CODE RED) to Regional Emergency Medical Center.',
        beforeJson: null,
        afterJson: { callsign: 'BLS-02', priority: 'CODE_RED', etaMinutes: 7 },
        ipAddress: '127.0.0.1',
        createdAt: isoAgo(9),
        actor: {
          id: 'u-disp',
          fullName: 'Imran Chowdhury',
          email: 'dispatch@baust-demo.edu.bd',
          role: 'DISPATCHER',
        },
      },
    ],
    settings: [
      {
        id: 'set-1',
        key: 'event.profile',
        category: 'event',
        valueJson: {
          eventName: 'Medical & Resource Management System For Any Event',
          activeDay: 'Event Day 2',
          expectedAttendance: 6420,
          ambientTempC: 33.4,
          advisoryLevel: 'Heat Advisory Level 2',
        },
        updatedAt: isoAgo(20),
        updatedBy: { fullName: 'Dr. Elena Vance' },
      },
      {
        id: 'set-2',
        key: 'triage.slas',
        category: 'clinical',
        valueJson: {
          p1TargetSec: 180,
          p2TargetSec: 420,
          p3TargetSec: 900,
        },
        updatedAt: isoAgo(120),
        updatedBy: { fullName: 'SysAdmin Rafiqul Islam' },
      },
      {
        id: 'set-3',
        key: 'telemetry.polling',
        category: 'system',
        valueJson: {
          alertsIntervalSec: 10,
          dashboardIntervalSec: 15,
          sessionTimeoutHours: 8,
        },
        updatedAt: isoAgo(180),
        updatedBy: { fullName: 'SysAdmin Rafiqul Islam' },
      },
    ],
  };
}

function loadDb(): DemoDb {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DemoDb;
  } catch {
    // ignore
  }
  const initial = buildInitialDemoDb();
  saveDb(initial);
  return initial;
}

function saveDb(db: DemoDb) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // ignore
  }
}

function getCurrentUser(db: DemoDb): AuthUser {
  try {
    const raw = localStorage.getItem(SESSION_USER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AuthUser;
      const found = db.users.find((u) => u.id === parsed.id);
      if (found) {
        return {
          id: found.id,
          email: found.email,
          staffCode: found.staffCode,
          fullName: found.fullName,
          role: found.role,
          isActive: found.isActive,
        };
      }
    }
  } catch {
    // ignore
  }
  const def = db.users[1]; // Medical Coordinator default
  return {
    id: def.id,
    email: def.email,
    staffCode: def.staffCode,
    fullName: def.fullName,
    role: def.role,
    isActive: def.isActive,
  };
}

function canSeePhi(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'MEDICAL_ADMIN', 'DOCTOR', 'NURSE'].includes(role);
}

export function handleDemoFallbackRequest<T>(
  rawPath: string,
  method: string,
  body?: unknown
): { data: T; meta?: ApiMeta } {
  const db = loadDb();
  const [pathname, queryStr = ''] = rawPath.split('?');
  const params = new URLSearchParams(queryStr);
  const payload = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;

  // 1. AUTH
  if (pathname === '/auth/csrf-token') {
    return { data: { csrfToken: 'medijigs-cloud-csrf-token' } as unknown as T };
  }

  if (pathname === '/auth/login' && method === 'POST') {
    const identifier = String(payload.identifier ?? '').trim().toLowerCase();
    const matched =
      db.users.find(
        (u) =>
          u.email.toLowerCase() === identifier ||
          (u.staffCode && u.staffCode.toLowerCase() === identifier)
      ) ?? db.users[1];
    const authUser: AuthUser = {
      id: matched.id,
      email: matched.email,
      staffCode: matched.staffCode,
      fullName: matched.fullName,
      role: matched.role,
      isActive: matched.isActive,
    };
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(authUser));
    return { data: { user: authUser } as unknown as T };
  }

  if (pathname === '/auth/logout' && method === 'POST') {
    localStorage.removeItem(SESSION_USER_KEY);
    return { data: { loggedOut: true } as unknown as T };
  }

  if (pathname === '/auth/me') {
    const raw = localStorage.getItem(SESSION_USER_KEY);
    if (!raw) {
      throw new Error('UNAUTHENTICATED');
    }
    return { data: { user: getCurrentUser(db) } as unknown as T };
  }

  const user = getCurrentUser(db);
  const phiAllowed = canSeePhi(user.role);

  const enrichIncident = (inc: DemoDb['incidents'][number]) => {
    const pt = db.patients.find((p) => p.id === inc.patientId) ?? null;
    const doc = db.doctors.find((d) => d.id === inc.leadDoctorId) ?? null;
    const nrs = db.nurses.find((n) => n.id === inc.leadNurseId) ?? null;
    const st = db.stations.find((s) => s.id === inc.stationId) ?? null;

    return {
      ...inc,
      patient: pt
        ? phiAllowed
          ? {
              id: pt.id,
              recordCode: pt.recordCode,
              fullName: pt.fullName,
              age: pt.age,
              sex: pt.sex,
              attendeeRole: pt.attendeeRole,
            }
          : { id: pt.id, recordCode: pt.recordCode }
        : null,
      leadDoctor: doc ? { id: doc.id, fullName: doc.fullName } : null,
      leadNurse: nrs ? { id: nrs.id, fullName: nrs.fullName } : null,
      station: st ? { id: st.id, code: st.code, name: st.name } : null,
      bed: { bedCode: 'BED-A1' },
    };
  };

  // 2. DASHBOARD SUMMARY
  if (pathname === '/dashboard/summary') {
    const ev =
      db.settings.find((s) => s.key === 'event.profile')?.valueJson ?? null;

    if (user.role === 'VOLUNTEER') {
      return {
        data: {
          mode: 'VOLUNTEER',
          eventProfile: ev,
          myReports: db.incidents.map(enrichIncident),
          recentNotices: db.notices.filter((n) => n.isPublished),
        } as unknown as T,
      };
    }

    const lowStockMeds = db.medicines.filter((m) => {
      const total = m.batches.reduce((acc, b) => acc + b.quantity, 0);
      return total < m.minParLevel;
    });

    return {
      data: {
        mode: 'COMMAND',
        eventProfile: ev,
        kpis: {
          doctorsOnDuty: db.doctors.filter((d) => d.dutyStatus === 'ON_DUTY').length,
          doctorsCodeRed: db.doctors.filter((d) => d.dutyStatus === 'CODE_RED').length,
          doctorsTotal: db.doctors.length,
          nursesOnDuty: db.nurses.filter((n) => n.dutyStatus === 'ON_DUTY').length,
          nursesIntercepting: db.nurses.filter((n) => n.dutyStatus === 'INTERCEPTING').length,
          nursesTotal: db.nurses.length,
          activeIncidents: db.incidents.filter((i) => i.status !== 'DISCHARGED').length,
          criticalIncidents: db.incidents.filter(
            (i) => i.triagePriority === 'P1_IMMEDIATE' && i.status !== 'DISCHARGED'
          ).length,
          ambulancesStandby: db.ambulances.filter((a) => a.status === 'STANDBY').length,
          ambulancesActive: db.ambulances.filter((a) => a.status !== 'STANDBY').length,
          ambulancesTotal: db.ambulances.length,
          lowStockCount: lowStockMeds.length,
          lowStockNames: lowStockMeds.map((m) => m.name),
          equipmentReadinessPct: Math.round(
            (db.equipment.filter((e) => e.status === 'OPERATIONAL' || e.status === 'IN_USE').length /
              Math.max(1, db.equipment.length)) *
              100
          ),
          equipmentOperational: db.equipment.filter(
            (e) => e.status === 'OPERATIONAL' || e.status === 'IN_USE'
          ).length,
          equipmentTotal: db.equipment.length,
          activeAlertCount: db.alerts.filter((a) => a.status !== 'RESOLVED').length,
        },
        activeAlerts: db.alerts.filter((a) => a.status !== 'RESOLVED'),
        recentIncidents: db.incidents.slice(0, 8).map(enrichIncident),
        recentNotices: db.notices.filter((n) => n.isPublished).slice(0, 4),
        staffOverview: [
          ...db.doctors.map((d) => ({
            id: d.id,
            name: d.fullName,
            roleLabel: d.specialization,
            station: db.stations.find((s) => s.id === d.stationId)?.name ?? 'Field Post',
            ext: d.phoneExt ? `Ext. ${d.phoneExt}` : d.radioChannel ?? '—',
          })),
          ...db.nurses.map((n) => ({
            id: n.id,
            name: n.fullName,
            roleLabel: n.specialty,
            station: db.stations.find((s) => s.id === n.stationId)?.name ?? 'Field Post',
            ext: n.vhfCallsign ?? '—',
          })),
        ],
        recentLogs: db.auditLogs.slice(0, 6),
      } as unknown as T,
    };
  }

  // 3. NOTICES
  if (pathname === '/notices') {
    if (method === 'GET') {
      return { data: db.notices as unknown as T };
    }
    if (method === 'POST') {
      const created = {
        id: `not-${Date.now()}`,
        title: String(payload.title ?? 'Campus Medical Notice'),
        content: String(payload.content ?? ''),
        priority: (payload.priority as 'NORMAL' | 'IMPORTANT' | 'EMERGENCY') ?? 'NORMAL',
        targetRole: (payload.targetRole as 'ALL' | 'DOCTOR' | 'NURSE' | 'VOLUNTEER' | 'ADMIN') ?? 'ALL',
        isPublished: payload.isPublished !== false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        authorName: user.fullName,
        authorRole: user.role,
      };
      db.notices.unshift(created);
      saveDb(db);
      return { data: created as unknown as T };
    }
  }

  if (pathname.startsWith('/notices/')) {
    const id = pathname.replace('/notices/', '');
    if (method === 'PATCH') {
      const idx = db.notices.findIndex((n) => n.id === id);
      if (idx >= 0) {
        db.notices[idx] = {
          ...db.notices[idx],
          ...(payload as Partial<DemoDb['notices'][number]>),
          updatedAt: new Date().toISOString(),
        };
        saveDb(db);
        return { data: db.notices[idx] as unknown as T };
      }
    }
    if (method === 'DELETE') {
      db.notices = db.notices.filter((n) => n.id !== id);
      saveDb(db);
      return { data: { deleted: true } as unknown as T };
    }
  }

  // 4. ALERTS
  if (pathname === '/alerts') {
    if (method === 'GET') {
      const status = params.get('status');
      const list =
        status && status !== 'ALL'
          ? db.alerts.filter((a) => a.status === status)
          : db.alerts;
      return { data: list as unknown as T };
    }
    if (method === 'POST') {
      const created: DemoDb['alerts'][number] = {
        id: `al-${Date.now()}`,
        severity: (payload.severity as 'P1_CRITICAL' | 'P2_URGENT' | 'BROADCAST') ?? 'P1_CRITICAL',
        title: String(payload.title ?? 'Emergency Alert'),
        locationText: String(payload.locationText ?? 'Campus Sector'),
        description: payload.description ? String(payload.description) : null,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        incident: null,
        createdBy: { fullName: user.fullName, role: user.role },
        acknowledgedBy: null,
      };
      db.alerts.unshift(created);
      saveDb(db);
      return { data: created as unknown as T };
    }
  }

  if (pathname.startsWith('/alerts/')) {
    const [, , alertId, action] = pathname.split('/');
    const found = db.alerts.find((a) => a.id === alertId);
    if (found) {
      if (action === 'acknowledge') {
        found.status = 'INTERCEPTING';
        found.acknowledgedBy = { fullName: user.fullName, role: user.role };
      } else if (action === 'resolve') {
        found.status = 'RESOLVED';
      }
      saveDb(db);
      return { data: found as unknown as T };
    }
  }

  // 5. INCIDENTS
  if (pathname === '/incidents' || pathname === '/incidents/report') {
    if (method === 'GET') {
      const search = (params.get('search') ?? '').toLowerCase();
      const status = params.get('status');
      const priority = params.get('priority');
      const filtered = db.incidents
        .filter((i) => {
          if (status && status !== 'ALL' && i.status !== status) return false;
          if (priority && priority !== 'ALL' && i.triagePriority !== priority) return false;
          if (search) {
            const hay = `${i.incidentCode} ${i.locationText} ${i.chiefComplaint}`.toLowerCase();
            if (!hay.includes(search)) return false;
          }
          return true;
        })
        .map(enrichIncident);
      return { data: filtered as unknown as T };
    }
    if (method === 'POST') {
      const code = `INC-2025-00${db.incidents.length + 1}`;
      const created: DemoDb['incidents'][number] = {
        id: `inc-${Date.now()}`,
        incidentCode: code,
        admittedAt: new Date().toISOString(),
        triagePriority: String(payload.triagePriority ?? 'P2_URGENT'),
        status: 'TRIAGE',
        category: String(payload.category ?? 'HEAT'),
        chiefComplaint: String(payload.chiefComplaint ?? 'Field incident report'),
        hpiNotes: null,
        gcsScore: 15,
        locationText: String(payload.locationText ?? 'Campus Sector'),
        patientId: payload.patientId ? String(payload.patientId) : null,
        stationId: 'st-alpha',
        leadDoctorId: payload.leadDoctorId ? String(payload.leadDoctorId) : 'doc-1',
        leadNurseId: 'nrs-1',
        reportedByUserId: user.id,
        dischargeChecklistJson: [
          { key: 'vitals_stable', label: 'Vitals stable for 30+ mins', completed: false },
          { key: 'doc_signoff', label: 'Attending physician clearance', completed: false },
        ],
        vitals: [],
        clinicalNotes: [],
        dispensations: [],
      };
      db.incidents.unshift(created);
      saveDb(db);
      return { data: enrichIncident(created) as unknown as T };
    }
  }

  if (pathname.startsWith('/incidents/')) {
    const parts = pathname.split('/');
    const incId = parts[2];
    const sub = parts[3];
    const found = db.incidents.find((i) => i.id === incId);
    if (found) {
      if (sub === 'discharge' && method === 'POST') {
        found.status = 'DISCHARGED';
        saveDb(db);
        return { data: enrichIncident(found) as unknown as T };
      }
      if (method === 'PATCH') {
        Object.assign(found, payload);
        saveDb(db);
        return { data: enrichIncident(found) as unknown as T };
      }
    }
  }

  // 6. PATIENTS
  if (pathname === '/patients') {
    if (method === 'GET') {
      const search = (params.get('search') ?? '').toLowerCase();
      const list = db.patients
        .filter((p) =>
          search
            ? `${p.fullName} ${p.recordCode} ${p.institutionalId ?? ''}`
                .toLowerCase()
                .includes(search)
            : true
        )
        .map((p) => {
          const ptIncs = db.incidents.filter((i) => i.patientId === p.id);
          return {
            ...p,
            incidents: ptIncs,
            _count: { incidents: ptIncs.length },
          };
        });
      return { data: list as unknown as T };
    }
    if (method === 'POST') {
      const created: DemoDb['patients'][number] = {
        id: `pt-${Date.now()}`,
        recordCode: `PT-100${db.patients.length + 1}`,
        fullName: String(payload.fullName ?? 'New Patient'),
        age: Number(payload.age ?? 21),
        sex: String(payload.sex ?? 'MALE'),
        bloodGroup: payload.bloodGroup ? String(payload.bloodGroup) : 'O+',
        attendeeRole: String(payload.attendeeRole ?? 'STUDENT'),
        institutionalId: payload.institutionalId ? String(payload.institutionalId) : null,
        emergencyContactName: payload.emergencyContactName ? String(payload.emergencyContactName) : null,
        emergencyContactPhone: payload.emergencyContactPhone ? String(payload.emergencyContactPhone) : null,
        allergiesNotes: payload.allergiesNotes ? String(payload.allergiesNotes) : 'None reported',
        medicalHistoryNotes: null,
      };
      db.patients.unshift(created);
      saveDb(db);
      return { data: created as unknown as T };
    }
  }

  if (pathname.startsWith('/patients/')) {
    const [, , ptId, sub] = pathname.split('/');
    const pt = db.patients.find((p) => p.id === ptId) ?? db.patients[0];
    const ptIncs = db.incidents.filter((i) => i.patientId === pt.id);
    const activeInc = ptIncs[0] ?? db.incidents[0];

    if (!sub && method === 'GET') {
      return {
        data: {
          ...pt,
          incidents: (ptIncs.length > 0 ? ptIncs : [activeInc]).map(enrichIncident),
        } as unknown as T,
      };
    }
    if (sub === 'vitals' && method === 'POST') {
      activeInc.vitals.unshift({
        id: `v-${Date.now()}`,
        heartRate: payload.heartRate ? Number(payload.heartRate) : 88,
        bpSystolic: payload.bpSystolic ? Number(payload.bpSystolic) : 120,
        bpDiastolic: payload.bpDiastolic ? Number(payload.bpDiastolic) : 80,
        spo2: payload.spo2 ? Number(payload.spo2) : 98,
        tempC: payload.tempC ? Number(payload.tempC) : 37.0,
        respRate: payload.respRate ? Number(payload.respRate) : 18,
        glucoseMgdl: payload.glucoseMgdl ? Number(payload.glucoseMgdl) : null,
        recordedAt: new Date().toISOString(),
      });
      saveDb(db);
      return { data: activeInc.vitals[0] as unknown as T };
    }
    if (sub === 'notes' && method === 'POST') {
      activeInc.clinicalNotes.unshift({
        id: `cn-${Date.now()}`,
        milestoneType: String(payload.milestoneType ?? 'ASSESSMENT'),
        title: String(payload.title ?? 'Clinical Observation'),
        notes: String(payload.notes ?? ''),
        createdAt: new Date().toISOString(),
        author: { fullName: user.fullName, role: user.role },
      });
      saveDb(db);
      return { data: activeInc.clinicalNotes[0] as unknown as T };
    }
  }

  // 7. DOCTORS, NURSES & STATIONS
  if (pathname === '/stations') {
    return { data: db.stations as unknown as T };
  }

  if (pathname === '/doctors') {
    if (method === 'GET') {
      const list = db.doctors.map((d) => ({
        ...d,
        station: db.stations.find((s) => s.id === d.stationId) ?? null,
        _count: {
          leadIncidents: db.incidents.filter((i) => i.leadDoctorId === d.id).length,
        },
      }));
      return { data: list as unknown as T };
    }
    if (method === 'POST') {
      const created: DemoDb['doctors'][number] = {
        id: `doc-${Date.now()}`,
        bmdcNumber: String(payload.bmdcNumber ?? 'A-80001'),
        fullName: String(payload.fullName ?? 'Dr. New Physician'),
        specialization: String(payload.specialization ?? 'Emergency Medicine'),
        isStationLead: Boolean(payload.isStationLead),
        radioChannel: payload.radioChannel ? String(payload.radioChannel) : 'MED-CH1',
        phoneExt: payload.phoneExt ? String(payload.phoneExt) : null,
        dutyStatus: 'ON_DUTY',
        stationId: payload.stationId ? String(payload.stationId) : 'st-alpha',
      };
      db.doctors.push(created);
      saveDb(db);
      return { data: created as unknown as T };
    }
  }

  if (pathname.startsWith('/doctors/') && method === 'PATCH') {
    const id = pathname.replace('/doctors/', '');
    const doc = db.doctors.find((d) => d.id === id);
    if (doc) {
      Object.assign(doc, payload);
      saveDb(db);
    }
    return { data: doc as unknown as T };
  }

  if (pathname === '/nurses') {
    if (method === 'GET') {
      const list = db.nurses.map((n) => ({
        ...n,
        station: db.stations.find((s) => s.id === n.stationId) ?? null,
        _count: {
          leadIncidents: db.incidents.filter((i) => i.leadNurseId === n.id).length,
        },
      }));
      return { data: list as unknown as T };
    }
    if (method === 'POST') {
      const created: DemoDb['nurses'][number] = {
        id: `nrs-${Date.now()}`,
        bnmcNumber: String(payload.bnmcNumber ?? 'RN-40010'),
        fullName: String(payload.fullName ?? 'Registered Nurse'),
        specialty: String(payload.specialty ?? 'Triage & Vitals'),
        vhfCallsign: payload.vhfCallsign ? String(payload.vhfCallsign) : 'RN-FIELD',
        isRapidResponder: Boolean(payload.isRapidResponder),
        dutyStatus: 'ON_DUTY',
        stationId: payload.stationId ? String(payload.stationId) : 'st-alpha',
      };
      db.nurses.push(created);
      saveDb(db);
      return { data: created as unknown as T };
    }
  }

  if (pathname.startsWith('/nurses/') && method === 'PATCH') {
    const id = pathname.replace('/nurses/', '');
    const nrs = db.nurses.find((n) => n.id === id);
    if (nrs) {
      Object.assign(nrs, payload);
      saveDb(db);
    }
    return { data: nrs as unknown as T };
  }

  // 8. MEDICINES
  if (pathname === '/medicines') {
    if (method === 'GET') {
      const meds = db.medicines.map((m) => {
        const totalQuantity = m.batches.reduce((acc, b) => acc + b.quantity, 0);
        const totalMax = m.batches.reduce((acc, b) => acc + b.maxQuantity, 0);
        const stockStatus =
          totalQuantity <= m.minParLevel * 0.5
            ? 'CRITICAL'
            : totalQuantity < m.minParLevel
            ? 'LOW'
            : 'OPTIMAL';
        return { ...m, totalQuantity, totalMax, stockStatus };
      });
      return {
        data: {
          medicines: meds,
          totalDispensations: 14,
          verifiers: db.users
            .filter((u) => ['SUPER_ADMIN', 'MEDICAL_ADMIN', 'DOCTOR', 'NURSE'].includes(u.role))
            .map((u) => ({ id: u.id, fullName: u.fullName, role: u.role })),
        } as unknown as T,
      };
    }
    if (method === 'POST') {
      const created: DemoDb['medicines'][number] = {
        id: `med-${Date.now()}`,
        skuCode: String(payload.skuCode ?? 'MED-NEW'),
        name: String(payload.name ?? 'New Medicine'),
        genericName: String(payload.genericName ?? 'Generic Formula'),
        category: String(payload.category ?? 'General'),
        storageRequirement: String(payload.storageRequirement ?? 'Ambient < 25°C'),
        isControlled: Boolean(payload.isControlled),
        unitLabel: String(payload.unitLabel ?? 'units'),
        minParLevel: Number(payload.minParLevel ?? 20),
        batches: [],
      };
      db.medicines.push(created);
      saveDb(db);
      return { data: created as unknown as T };
    }
  }

  if (pathname === '/medicines/batches' && method === 'POST') {
    const med = db.medicines.find((m) => m.id === payload.medicineId) ?? db.medicines[0];
    const st = db.stations.find((s) => s.id === payload.stationId) ?? db.stations[0];
    const batch = {
      id: `bat-${Date.now()}`,
      batchNumber: String(payload.batchNumber ?? 'B-2026'),
      quantity: Number(payload.quantity ?? 50),
      maxQuantity: Number(payload.quantity ?? 50),
      expiryDate: String(payload.expiryDate ?? '2027-12-31'),
      station: { id: st.id, code: st.code, name: st.name },
    };
    med.batches.push(batch);
    saveDb(db);
    return { data: batch as unknown as T };
  }

  if (pathname === '/medicines/dispense' && method === 'POST') {
    const qty = Number(payload.quantityDispensed ?? 1);
    for (const m of db.medicines) {
      const b = m.batches.find((x) => x.id === payload.batchId);
      if (b) {
        b.quantity = Math.max(0, b.quantity - qty);
      }
    }
    saveDb(db);
    return { data: { dispensed: true } as unknown as T };
  }

  // 9. EQUIPMENT
  if (pathname === '/equipment') {
    if (method === 'GET') {
      const list = db.equipment.map((e) => ({
        ...e,
        station: db.stations.find((s) => s.id === e.stationId) ?? null,
      }));
      return { data: list as unknown as T };
    }
    if (method === 'POST') {
      const created: DemoDb['equipment'][number] = {
        id: `eq-${Date.now()}`,
        assetCode: String(payload.assetCode ?? 'EQ-NEW'),
        name: String(payload.name ?? 'Medical Device'),
        model: String(payload.model ?? 'Standard'),
        serialNumber: String(payload.serialNumber ?? `SN-${Date.now()}`),
        category: String(payload.category ?? 'AED'),
        status: 'OPERATIONAL',
        batteryPct: payload.batteryPct !== null ? Number(payload.batteryPct) : 100,
        lastInspectedAt: new Date().toISOString(),
        notes: null,
        stationId: payload.stationId ? String(payload.stationId) : 'st-alpha',
      };
      db.equipment.push(created);
      saveDb(db);
      return { data: created as unknown as T };
    }
  }

  if (pathname.startsWith('/equipment/') && method === 'PATCH') {
    const id = pathname.replace('/equipment/', '');
    const eq = db.equipment.find((e) => e.id === id);
    if (eq) {
      if (payload.status) eq.status = String(payload.status);
      if (payload.batteryPct !== undefined) eq.batteryPct = Number(payload.batteryPct);
      if (payload.markInspected) eq.lastInspectedAt = new Date().toISOString();
      saveDb(db);
    }
    return { data: eq as unknown as T };
  }

  // 10. AMBULANCES
  if (pathname === '/ambulances') {
    if (method === 'GET') {
      const units = db.ambulances.map((a) => ({
        ...a,
        station: db.stations.find((s) => s.id === a.stationId) ?? null,
        dispatches: db.dispatches
          .filter((d) => d.ambulanceId === a.id && d.status !== 'COMPLETED')
          .map((d) => ({
            ...d,
            incident: db.incidents.find((i) => i.id === d.incidentId) ?? null,
          })),
      }));
      const dispatches = db.dispatches.map((d) => ({
        ...d,
        ambulance: db.ambulances.find((a) => a.id === d.ambulanceId) ?? {
          callsign: 'ALS-01',
          tier: 'ALS_ICU',
        },
        incident: db.incidents.find((i) => i.id === d.incidentId) ?? null,
        dispatchedBy: { fullName: d.dispatchedByName },
      }));
      return { data: { ambulances: units, dispatches } as unknown as T };
    }
    if (method === 'POST') {
      const created: DemoDb['ambulances'][number] = {
        id: `amb-${Date.now()}`,
        callsign: String(payload.callsign ?? 'BLS-03'),
        plateNumber: String(payload.plateNumber ?? 'DHAKA-METRO-71'),
        tier: String(payload.tier ?? 'BLS'),
        driverName: String(payload.driverName ?? 'Driver'),
        paramedicLead: String(payload.paramedicLead ?? 'Paramedic'),
        status: 'STANDBY',
        fuelPct: 100,
        equipmentSummary: 'Standard life support kit',
        stationId: 'st-alpha',
      };
      db.ambulances.push(created);
      saveDb(db);
      return { data: created as unknown as T };
    }
  }

  if (pathname === '/ambulances/dispatches' && method === 'POST') {
    const amb = db.ambulances.find((a) => a.id === payload.ambulanceId) ?? db.ambulances[0];
    if (amb) amb.status = 'EN_ROUTE';
    const created: DemoDb['dispatches'][number] = {
      id: `dsp-${Date.now()}`,
      ambulanceId: amb.id,
      incidentId: payload.incidentId ? String(payload.incidentId) : null,
      destinationHospital: String(payload.destinationHospital ?? 'Regional Emergency Hospital'),
      priority: String(payload.priority ?? 'CODE_RED'),
      etaMinutes: payload.etaMinutes ? Number(payload.etaMinutes) : 8,
      status: 'EN_ROUTE',
      dispatchedAt: new Date().toISOString(),
      dispatchedByName: user.fullName,
    };
    db.dispatches.unshift(created);
    saveDb(db);
    return { data: created as unknown as T };
  }

  if (pathname.startsWith('/ambulances/dispatches/') && method === 'PATCH') {
    const [, , , dspId] = pathname.split('/');
    const dsp = db.dispatches.find((d) => d.id === dspId);
    if (dsp) {
      dsp.status = 'COMPLETED';
      const amb = db.ambulances.find((a) => a.id === dsp.ambulanceId);
      if (amb) amb.status = 'STANDBY';
      saveDb(db);
    }
    return { data: dsp as unknown as T };
  }

  // 11. REPORTS OVERVIEW
  if (pathname === '/reports/overview') {
    const total = db.incidents.length;
    const discharged = db.incidents.filter((i) => i.status === 'DISCHARGED').length;
    return {
      data: {
        summary: {
          totalEncounters: total,
          discharged,
          resolutionRatePct: Math.round((discharged / Math.max(1, total)) * 100),
          ambulanceTransfers: db.dispatches.length,
          totalMedicineUnitsDispensed: 24,
          controlledMedDualVerifiedCount: 3,
        },
        triageDistribution: {
          P1_IMMEDIATE: db.incidents.filter((i) => i.triagePriority === 'P1_IMMEDIATE').length,
          P2_URGENT: db.incidents.filter((i) => i.triagePriority === 'P2_URGENT').length,
          P3_MINOR: db.incidents.filter((i) => i.triagePriority === 'P3_MINOR').length,
          UNTRIAGED: db.incidents.filter((i) => i.triagePriority === 'UNTRIAGED').length,
        },
        categoryBreakdown: [
          { category: 'HEAT', count: 2, pct: 67 },
          { category: 'TRAUMA', count: 1, pct: 33 },
        ],
        hourlySurge: [
          { hour: '10:00', count: 2 },
          { hour: '12:00', count: 4 },
          { hour: '14:00', count: 7 },
          { hour: '16:00', count: 5 },
          { hour: '18:00', count: 3 },
        ],
        stationMatrix: db.stations.map((s) => ({
          id: s.id,
          code: s.code,
          name: s.name,
          totalIntake: db.incidents.filter((i) => i.stationId === s.id).length,
          doctors: db.doctors.filter((d) => d.stationId === s.id).length,
          nurses: db.nurses.filter((n) => n.stationId === s.id).length,
          occupiedBeds: 2,
          totalBeds: s.capacity,
          status: s.status,
        })),
        topMedicines: [
          { name: 'Oral Rehydration Salts (ORS)', units: 16 },
          { name: 'Normal Saline 0.9% IV (500mL)', units: 6 },
          { name: 'Paracetamol 500mg', units: 4 },
        ],
      } as unknown as T,
    };
  }

  // 12. AUDIT LOGS
  if (pathname === '/audit-logs') {
    const entityType = params.get('entityType');
    const search = (params.get('search') ?? '').toLowerCase();
    const logs = db.auditLogs.filter((l) => {
      if (entityType && entityType !== 'ALL' && l.entityType !== entityType) return false;
      if (search) {
        const hay = `${l.action} ${l.summary} ${l.actor?.fullName ?? ''}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });
    return {
      data: {
        logs,
        stats: {
          totalEvents: logs.length,
          activeSessionsCount: db.users.filter((u) => u.isActive).length,
          controlledMedCount: 3,
        },
      } as unknown as T,
      meta: {
        page: 1,
        limit: 20,
        total: logs.length,
        totalPages: 1,
      },
    };
  }

  // 13. USERS
  if (pathname === '/users') {
    if (method === 'GET') {
      return {
        data: {
          users: db.users,
          activeSessions: db.users.slice(0, 3).map((u, idx) => ({
            sidPreview: `sess_9f8a${idx}c`,
            userId: u.id,
            userName: u.fullName,
            userRole: u.role,
            expire: new Date(Date.now() + 3600000 * 6).toISOString(),
          })),
        } as unknown as T,
      };
    }
    if (method === 'POST') {
      const created: DemoDb['users'][number] = {
        id: `u-${Date.now()}`,
        email: String(payload.email ?? 'staff@medijigs.org'),
        staffCode: payload.staffCode ? String(payload.staffCode) : null,
        fullName: String(payload.fullName ?? 'New Staff'),
        role: (payload.role as UserRole) ?? 'VOLUNTEER',
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date().toISOString(),
      };
      db.users.push(created);
      saveDb(db);
      return { data: created as unknown as T };
    }
  }

  if (pathname.startsWith('/users/')) {
    const [, , uid, sub] = pathname.split('/');
    const target = db.users.find((u) => u.id === uid);
    if (target && !sub && method === 'PATCH') {
      if (payload.role !== undefined) target.role = payload.role as UserRole;
      if (payload.isActive !== undefined) target.isActive = Boolean(payload.isActive);
      saveDb(db);
      return { data: target as unknown as T };
    }
    if (sub === 'revoke-sessions') {
      return { data: { revokedCount: 1 } as unknown as T };
    }
  }

  // 14. SETTINGS
  if (pathname === '/settings/event-profile') {
    const ev = db.settings.find((s) => s.key === 'event.profile')?.valueJson ?? null;
    return { data: ev as unknown as T };
  }

  if (pathname === '/settings') {
    return { data: db.settings as unknown as T };
  }

  if (pathname.startsWith('/settings/') && method === 'PATCH') {
    const key = decodeURIComponent(pathname.replace('/settings/', ''));
    const existing = db.settings.find((s) => s.key === key);
    if (existing && payload.valueJson && typeof payload.valueJson === 'object') {
      existing.valueJson = {
        ...existing.valueJson,
        ...(payload.valueJson as Record<string, unknown>),
      };
      existing.updatedAt = new Date().toISOString();
      existing.updatedBy = { fullName: user.fullName };
      saveDb(db);
      return { data: existing as unknown as T };
    }
  }

  return { data: {} as unknown as T };
}
