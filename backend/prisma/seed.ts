import bcrypt from 'bcrypt';
import {
  AlertSeverity,
  AlertStatus,
  AmbulanceStatus,
  AmbulanceTier,
  AttendeeRole,
  BedStatus,
  ClinicalNoteType,
  DispatchPriority,
  DispatchStatus,
  DoctorDutyStatus,
  EquipmentCategory,
  EquipmentStatus,
  IncidentCategory,
  IncidentStatus,
  NurseDutyStatus,
  PatientSex,
  PrismaClient,
  StationStatus,
  StationType,
  TriagePriority,
  UserRole,
} from '@prisma/client';

const prisma = new PrismaClient();

/**
 * EMRMS Synthetic Demo Seed Script (Academic Prototype — Synthetic Data Only).
 * Idempotent: checks if seed data already exists before inserting so re-running
 * `npm run db:seed` will not fail or violate immutable audit_logs rules.
 */
async function main() {
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log(
      `[EMRMS Seed] Database already contains ${existingUsers} users. Skipping seed to preserve existing records.`
    );
    return;
  }

  console.log('[EMRMS Seed] Seeding reconciled synthetic demo dataset...');
  const demoPasswordHash = await bcrypt.hash('DemoPass123!', 12);

  // ==========================================================================
  // 1. USERS (All 6 Approved RBAC Roles)
  // ==========================================================================
  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@baust-demo.edu.bd',
      staffCode: 'ADM-001',
      passwordHash: demoPasswordHash,
      fullName: 'SysAdmin Rafiqul Islam',
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  });

  const cmoUser = await prisma.user.create({
    data: {
      email: 'e.vance@baust-demo.edu.bd',
      staffCode: 'BMDC-A-48921',
      passwordHash: demoPasswordHash,
      fullName: 'Dr. Elena Vance',
      role: UserRole.MEDICAL_ADMIN,
      isActive: true,
    },
  });

  const doctorUser = await prisma.user.create({
    data: {
      email: 't.hasan@baust-demo.edu.bd',
      staffCode: 'BMDC-A-63319',
      passwordHash: demoPasswordHash,
      fullName: 'Dr. Tariq Hasan',
      role: UserRole.DOCTOR,
      isActive: true,
    },
  });

  const nurseUser1 = await prisma.user.create({
    data: {
      email: 'f.yasmin@baust-demo.edu.bd',
      staffCode: 'BNMC-8841-A',
      passwordHash: demoPasswordHash,
      fullName: 'Farzana Yasmin, RN',
      role: UserRole.NURSE,
      isActive: true,
    },
  });

  const nurseUser2 = await prisma.user.create({
    data: {
      email: 's.yesmin@baust-demo.edu.bd',
      staffCode: 'BNMC-4190-K',
      passwordHash: demoPasswordHash,
      fullName: 'Sabina Yesmin, RN',
      role: UserRole.NURSE,
      isActive: true,
    },
  });

  const dispatcherUser = await prisma.user.create({
    data: {
      email: 'dispatch@baust-demo.edu.bd',
      staffCode: 'DSP-014',
      passwordHash: demoPasswordHash,
      fullName: 'Imran Chowdhury',
      role: UserRole.DISPATCHER,
      isActive: true,
    },
  });

  const volunteerUser = await prisma.user.create({
    data: {
      email: 'volunteer@baust-demo.edu.bd',
      staffCode: 'VOL-204',
      passwordHash: demoPasswordHash,
      fullName: 'Nabil Ahmed (Volunteer)',
      role: UserRole.VOLUNTEER,
      isActive: true,
    },
  });

  // ==========================================================================
  // 2. MEDICAL STATIONS (1 Central Depot + 4 Campus Field Posts)
  // ==========================================================================
  const centralDepot = await prisma.medicalStation.create({
    data: {
      code: 'ST-00',
      name: 'Central Medical Depot',
      sector: 'Central Wing',
      locationDesc: 'BAUST Medical Center Central Pharmacy & Reserve Warehouse',
      stationType: StationType.CENTRAL_DEPOT,
      capacity: 0,
      status: StationStatus.OPERATIONAL,
    },
  });

  const station1 = await prisma.medicalStation.create({
    data: {
      code: 'ST-01',
      name: 'Main Auditorium & Resuscitation Center',
      sector: 'Sector Alpha',
      locationDesc: 'Main Auditorium Ground Floor — Zone Alpha Bay',
      stationType: StationType.FIELD_POST,
      capacity: 6,
      status: StationStatus.HIGH_LOAD,
    },
  });

  const station2 = await prisma.medicalStation.create({
    data: {
      code: 'ST-02',
      name: 'Outdoor Sports Complex & Heat Triage',
      sector: 'Sector Bravo',
      locationDesc: 'Sports Ground Perimeter Triage Tent',
      stationType: StationType.FIELD_POST,
      capacity: 6,
      status: StationStatus.OPERATIONAL,
    },
  });

  const station3 = await prisma.medicalStation.create({
    data: {
      code: 'ST-03',
      name: 'CSE Labs & Hackathon Pavilion',
      sector: 'Sector Charlie',
      locationDesc: 'Academic Building B — CSE Lab Concourse',
      stationType: StationType.FIELD_POST,
      capacity: 4,
      status: StationStatus.OPERATIONAL,
    },
  });

  const station4 = await prisma.medicalStation.create({
    data: {
      code: 'ST-04',
      name: 'Central Dorm Hub & Observation Quarters',
      sector: 'Sector Delta',
      locationDesc: 'Dormitory Annex Quiet Observation Bay',
      stationType: StationType.FIELD_POST,
      capacity: 4,
      status: StationStatus.OPERATIONAL,
    },
  });

  // ==========================================================================
  // 3. STATION BEDS (20 Total Beds Reconciled Across 4 Field Posts)
  // ==========================================================================
  const bedConfigs = [
    // Station 1 (6 beds)
    { stationId: station1.id, bedCode: 'A-01', status: BedStatus.OCCUPIED },
    { stationId: station1.id, bedCode: 'A-02', status: BedStatus.OCCUPIED },
    { stationId: station1.id, bedCode: 'A-03', status: BedStatus.AVAILABLE },
    { stationId: station1.id, bedCode: 'A-04', status: BedStatus.AVAILABLE },
    { stationId: station1.id, bedCode: 'B-01', status: BedStatus.AVAILABLE },
    { stationId: station1.id, bedCode: 'B-02', status: BedStatus.MAINTENANCE },
    // Station 2 (6 beds)
    { stationId: station2.id, bedCode: 'S2-01', status: BedStatus.OCCUPIED },
    { stationId: station2.id, bedCode: 'S2-02', status: BedStatus.OCCUPIED },
    { stationId: station2.id, bedCode: 'S2-03', status: BedStatus.AVAILABLE },
    { stationId: station2.id, bedCode: 'S2-04', status: BedStatus.AVAILABLE },
    { stationId: station2.id, bedCode: 'S2-05', status: BedStatus.AVAILABLE },
    { stationId: station2.id, bedCode: 'S2-06', status: BedStatus.AVAILABLE },
    // Station 3 (4 beds)
    { stationId: station3.id, bedCode: 'S3-01', status: BedStatus.OCCUPIED },
    { stationId: station3.id, bedCode: 'S3-02', status: BedStatus.AVAILABLE },
    { stationId: station3.id, bedCode: 'S3-03', status: BedStatus.AVAILABLE },
    { stationId: station3.id, bedCode: 'S3-04', status: BedStatus.AVAILABLE },
    // Station 4 (4 beds)
    { stationId: station4.id, bedCode: 'S4-01', status: BedStatus.AVAILABLE },
    { stationId: station4.id, bedCode: 'S4-02', status: BedStatus.AVAILABLE },
    { stationId: station4.id, bedCode: 'S4-03', status: BedStatus.AVAILABLE },
    { stationId: station4.id, bedCode: 'S4-04', status: BedStatus.AVAILABLE },
  ];

  const createdBeds = await Promise.all(
    bedConfigs.map((bed) => prisma.stationBed.create({ data: bed }))
  );

  const bedByKey = new Map(
    createdBeds.map((b) => [`${b.stationId}:${b.bedCode}`, b])
  );

  // ==========================================================================
  // 4. DOCTORS & NURSES (Reconciled — No Duplicate Names Across Roles)
  // ==========================================================================
  const drVance = await prisma.doctor.create({
    data: {
      userId: cmoUser.id,
      stationId: station1.id,
      bmdcNumber: 'A-48921',
      fullName: 'Dr. Elena Vance',
      specialization: 'Emergency Medicine',
      isStationLead: true,
      radioChannel: 'MED-CH1',
      phoneExt: '401',
      dutyStatus: DoctorDutyStatus.ON_DUTY,
    },
  });

  const drTariq = await prisma.doctor.create({
    data: {
      userId: doctorUser.id,
      stationId: station3.id,
      bmdcNumber: 'A-63319',
      fullName: 'Dr. Tariq Hasan',
      specialization: 'Critical Care & Trauma',
      isStationLead: true,
      radioChannel: 'MED-RR1',
      phoneExt: '403',
      dutyStatus: DoctorDutyStatus.CODE_RED,
    },
  });

  const drShamim = await prisma.doctor.create({
    data: {
      stationId: station2.id,
      bmdcNumber: 'A-55210',
      fullName: 'Dr. Shamim Reza',
      specialization: 'General Medicine & Heat Exhaustion',
      isStationLead: true,
      radioChannel: 'MED-CH2',
      phoneExt: '402',
      dutyStatus: DoctorDutyStatus.ON_DUTY,
    },
  });

  const drNusrat = await prisma.doctor.create({
    data: {
      stationId: station1.id,
      bmdcNumber: 'A-71190',
      fullName: 'Dr. Nusrat Jahan',
      specialization: 'Internal Medicine & Allergy',
      isStationLead: false,
      radioChannel: 'MED-CH1',
      phoneExt: '404',
      dutyStatus: DoctorDutyStatus.ON_DUTY,
    },
  });

  const drFahmida = await prisma.doctor.create({
    data: {
      stationId: station4.id,
      bmdcNumber: 'A-69041',
      fullName: 'Dr. Fahmida Rahman',
      specialization: 'Cardiology',
      isStationLead: true,
      radioChannel: 'MED-CH4',
      phoneExt: '406',
      dutyStatus: DoctorDutyStatus.STANDBY,
    },
  });

  const rnFarzana = await prisma.nurse.create({
    data: {
      userId: nurseUser1.id,
      stationId: station1.id,
      bnmcNumber: '8841-A',
      fullName: 'Farzana Yasmin, RN',
      specialty: 'Charge Nurse — Triage Lead',
      vhfCallsign: 'RN-01',
      isRapidResponder: false,
      dutyStatus: NurseDutyStatus.ON_DUTY,
    },
  });

  const rnKamal = await prisma.nurse.create({
    data: {
      stationId: station2.id,
      bnmcNumber: '9014-C',
      fullName: 'Kamal Hossain, RN',
      specialty: 'Rapid Field Responder',
      vhfCallsign: 'RN-02',
      isRapidResponder: true,
      dutyStatus: NurseDutyStatus.INTERCEPTING,
    },
  });

  const rnRumana = await prisma.nurse.create({
    data: {
      stationId: station2.id,
      bnmcNumber: '7623-E',
      fullName: 'Rumana Akter, RN',
      specialty: 'Wound Dressing Specialist',
      vhfCallsign: 'RN-03',
      isRapidResponder: false,
      dutyStatus: NurseDutyStatus.ON_DUTY,
    },
  });

  const rnMehedi = await prisma.nurse.create({
    data: {
      stationId: station3.id,
      bnmcNumber: '5512-T',
      fullName: 'Mehedi Hasan, RN',
      specialty: 'Emergency Trauma Nursing',
      vhfCallsign: 'RN-05',
      isRapidResponder: true,
      dutyStatus: NurseDutyStatus.ON_DUTY,
    },
  });

  await prisma.nurse.create({
    data: {
      userId: nurseUser2.id,
      stationId: station4.id,
      bnmcNumber: '4190-K',
      fullName: 'Sabina Yesmin, RN',
      specialty: 'Medication Custodian',
      vhfCallsign: 'RN-06',
      isRapidResponder: false,
      dutyStatus: NurseDutyStatus.ON_DUTY,
    },
  });

  // ==========================================================================
  // 5. PATIENTS (Synthetic Demo Patients)
  // ==========================================================================
  const ptSadia = await prisma.patient.create({
    data: {
      recordCode: 'PT-4091',
      fullName: 'Sadia Rahman',
      age: 48,
      sex: PatientSex.FEMALE,
      bloodGroup: 'B+',
      attendeeRole: AttendeeRole.VISITOR,
      institutionalId: 'VIS-2025-049',
      emergencyContactName: 'Rafiqul Rahman (Spouse)',
      emergencyContactPhone: '+880-1700-000101',
      allergiesNotes: 'Penicillin & Beta-Lactam Antibiotics (Type 1 anaphylaxis history)',
      medicalHistoryNotes: 'Mild exercise-induced bronchial asthma; carries personal Salbutamol inhaler.',
    },
  });

  const ptMahia = await prisma.patient.create({
    data: {
      recordCode: 'PT-4088',
      fullName: 'Mahia Rahman',
      age: 19,
      sex: PatientSex.FEMALE,
      bloodGroup: 'O+',
      attendeeRole: AttendeeRole.STUDENT,
      institutionalId: 'CSE-2023-088',
      emergencyContactName: 'Karim Rahman (Father)',
      emergencyContactPhone: '+880-1700-000102',
      allergiesNotes: 'No known drug allergies',
      medicalHistoryNotes: 'Prior palpitations under heavy fatigue.',
    },
  });

  const ptNafis = await prisma.patient.create({
    data: {
      recordCode: 'PT-4092',
      fullName: 'Nafis Ahmed',
      age: 21,
      sex: PatientSex.MALE,
      bloodGroup: 'A+',
      attendeeRole: AttendeeRole.STUDENT,
      institutionalId: 'CSE-2021-041',
      emergencyContactName: 'Salma Ahmed (Mother)',
      emergencyContactPhone: '+880-1700-000103',
      allergiesNotes: 'None reported',
      medicalHistoryNotes: 'Occasional migraines.',
    },
  });

  const ptMehnaz = await prisma.patient.create({
    data: {
      recordCode: 'PT-4093',
      fullName: 'Mehnaz Kabir',
      age: 22,
      sex: PatientSex.FEMALE,
      bloodGroup: 'AB+',
      attendeeRole: AttendeeRole.STUDENT,
      institutionalId: 'EEE-2020-055',
      emergencyContactName: 'Tariqul Kabir (Father)',
      emergencyContactPhone: '+880-1700-000104',
      allergiesNotes: 'Peanut allergy (urticaria)',
      medicalHistoryNotes: 'None.',
    },
  });

  const ptTanvir = await prisma.patient.create({
    data: {
      recordCode: 'PT-4094',
      fullName: 'Tanvir Hasan',
      age: 20,
      sex: PatientSex.MALE,
      bloodGroup: 'O-',
      attendeeRole: AttendeeRole.STUDENT,
      institutionalId: 'CSE-2022-019',
      emergencyContactName: 'Mizanur Hasan (Father)',
      emergencyContactPhone: '+880-1700-000105',
      allergiesNotes: 'None reported',
      medicalHistoryNotes: 'None.',
    },
  });

  // ==========================================================================
  // 6. MEDICAL INCIDENTS (Active + Discharged + Volunteer Reported)
  // ==========================================================================
  const now = new Date();
  const minsAgo = (m: number) => new Date(now.getTime() - m * 60_000);

  const incSadia = await prisma.medicalIncident.create({
    data: {
      incidentCode: 'INC-1052',
      patientId: ptSadia.id,
      stationId: station1.id,
      bedId: bedByKey.get(`${station1.id}:A-02`)!.id,
      leadDoctorId: drVance.id,
      leadNurseId: rnFarzana.id,
      reportedByUserId: volunteerUser.id,
      triagePriority: TriagePriority.P1_IMMEDIATE,
      status: IncidentStatus.TRIAGE,
      category: IncidentCategory.HEAT,
      chiefComplaint: 'Heat Exhaustion / Pre-syncope',
      hpiNotes:
        'Patient suffered sudden pre-syncope near Stage 2 during afternoon outdoor event. Marked diaphoresis, dizziness, and tachycardia.',
      gcsScore: 15,
      locationText: 'Main Auditorium Stage 2 Corridor',
      dischargeChecklistJson: [
        { key: 'temp_recovery', label: 'Core temperature recovery < 38.0 C', completed: true },
        { key: 'saline_complete', label: 'Completion of 500mL Normal Saline infusion', completed: false },
        { key: 'ambulation_test', label: 'Ambulation test without postural dizziness', completed: false },
        { key: 'cmo_signoff', label: 'Final clinical sign-off by Attending Physician', completed: false },
      ],
      admittedAt: minsAgo(42),
    },
  });

  const incMahia = await prisma.medicalIncident.create({
    data: {
      incidentCode: 'INC-1049',
      patientId: ptMahia.id,
      stationId: station1.id,
      bedId: bedByKey.get(`${station1.id}:A-01`)!.id,
      leadDoctorId: drTariq.id,
      leadNurseId: rnFarzana.id,
      reportedByUserId: dispatcherUser.id,
      triagePriority: TriagePriority.P1_IMMEDIATE,
      status: IncidentStatus.ESCALATED,
      category: IncidentCategory.CARDIAC,
      chiefComplaint: 'Cardiac Arrhythmia / Sudden Syncopal Event',
      hpiNotes: 'Collapsed near Main Stage barrier. Rapid irregular pulse noted on intake; prepared for CMH transfer.',
      gcsScore: 14,
      locationText: 'Main Stage Front Barrier',
      admittedAt: minsAgo(28),
    },
  });

  const incNafis = await prisma.medicalIncident.create({
    data: {
      incidentCode: 'INC-1048',
      patientId: ptNafis.id,
      stationId: station2.id,
      bedId: bedByKey.get(`${station2.id}:S2-01`)!.id,
      leadDoctorId: drShamim.id,
      leadNurseId: rnRumana.id,
      reportedByUserId: nurseUser1.id,
      triagePriority: TriagePriority.P2_URGENT,
      status: IncidentStatus.OBSERVATION,
      category: IncidentCategory.OTHER,
      chiefComplaint: 'Severe Migraine & Photophobia',
      hpiNotes: 'Sustained screen exposure during 14-hour hackathon session; resting in darkened bay.',
      gcsScore: 15,
      locationText: 'Hackathon Arena Bay 4',
      admittedAt: minsAgo(65),
    },
  });

  const incMehnaz = await prisma.medicalIncident.create({
    data: {
      incidentCode: 'INC-1047',
      patientId: ptMehnaz.id,
      stationId: station3.id,
      bedId: bedByKey.get(`${station3.id}:S3-01`)!.id,
      leadDoctorId: drNusrat.id,
      leadNurseId: rnMehedi.id,
      reportedByUserId: volunteerUser.id,
      triagePriority: TriagePriority.P2_URGENT,
      status: IncidentStatus.OBSERVATION,
      category: IncidentCategory.ALLERGY,
      chiefComplaint: 'Food Allergy (Urticaria)',
      hpiNotes: 'Peanut trace in lunch snack. Oral antihistamine administered; airway clear.',
      gcsScore: 15,
      locationText: 'Food Court Plaza',
      admittedAt: minsAgo(80),
    },
  });

  // Historical Discharged Incident (demonstrates bed reuse & reports data)
  await prisma.medicalIncident.create({
    data: {
      incidentCode: 'INC-1042',
      patientId: ptTanvir.id,
      stationId: station2.id,
      bedId: bedByKey.get(`${station2.id}:S2-01`)!.id, // Same bed now used by Nafis (allowed because DISCHARGED!)
      leadDoctorId: drShamim.id,
      leadNurseId: rnKamal.id,
      reportedByUserId: volunteerUser.id,
      triagePriority: TriagePriority.P3_MINOR,
      status: IncidentStatus.DISCHARGED,
      category: IncidentCategory.TRAUMA,
      chiefComplaint: 'Minor Thumb Sprain (Robotics Arena)',
      hpiNotes: 'Cold compress and elastic bandage applied. Stable on discharge.',
      gcsScore: 15,
      locationText: 'Robotics Arena Bay C',
      admittedAt: minsAgo(160),
      dischargedAt: minsAgo(130),
    },
  });

  // Unlinked Volunteer Incident Report (patientId = null until Nurse/Doctor triages)
  await prisma.medicalIncident.create({
    data: {
      incidentCode: 'INC-1053',
      patientId: null,
      stationId: station2.id,
      bedId: bedByKey.get(`${station2.id}:S2-02`)!.id,
      reportedByUserId: volunteerUser.id,
      triagePriority: TriagePriority.UNTRIAGED,
      status: IncidentStatus.REPORTED,
      category: IncidentCategory.HEAT,
      chiefComplaint: 'Student feeling dizzy near Outdoor Pitch East Gate',
      locationText: 'Outdoor Sports Field — East Gate Queue',
      admittedAt: minsAgo(5),
    },
  });

  // ==========================================================================
  // 7. PATIENT VITALS & CLINICAL NOTES
  // ==========================================================================
  await prisma.patientVital.createMany({
    data: [
      {
        incidentId: incSadia.id,
        recordedByUserId: nurseUser1.id,
        heartRate: 126,
        bpSystolic: 140,
        bpDiastolic: 90,
        spo2: 89,
        tempC: 39.8,
        respRate: 26,
        glucoseMgdl: 104,
        recordedAt: minsAgo(40),
      },
      {
        incidentId: incSadia.id,
        recordedByUserId: cmoUser.id,
        heartRate: 118,
        bpSystolic: 135,
        bpDiastolic: 88,
        spo2: 96,
        tempC: 39.4,
        respRate: 24,
        glucoseMgdl: 104,
        recordedAt: minsAgo(15),
      },
      {
        incidentId: incMahia.id,
        recordedByUserId: doctorUser.id,
        heartRate: 172,
        bpSystolic: 94,
        bpDiastolic: 60,
        spo2: 93,
        tempC: 37.1,
        respRate: 22,
        recordedAt: minsAgo(20),
      },
      {
        incidentId: incNafis.id,
        recordedByUserId: nurseUser1.id,
        heartRate: 78,
        bpSystolic: 125,
        bpDiastolic: 82,
        spo2: 99,
        tempC: 36.8,
        respRate: 16,
        recordedAt: minsAgo(55),
      },
    ],
  });

  await prisma.clinicalNote.createMany({
    data: [
      {
        incidentId: incSadia.id,
        authorUserId: volunteerUser.id,
        milestoneType: ClinicalNoteType.REPORTED,
        title: 'Initial Field Report',
        notes: 'Volunteer reported attendee collapse near Stage 2 corridor; stretcher team notified.',
        createdAt: minsAgo(42),
      },
      {
        incidentId: incSadia.id,
        authorUserId: nurseUser1.id,
        milestoneType: ClinicalNoteType.INTERVENTION,
        title: 'IV Access & Active Cooling Started',
        notes: '18G IV established in left antecubital fossa; 500mL 0.9% Normal Saline initiated with cold packs.',
        createdAt: minsAgo(35),
      },
      {
        incidentId: incSadia.id,
        authorUserId: cmoUser.id,
        milestoneType: ClinicalNoteType.DIAGNOSTIC_NOTE,
        title: 'Manual Point-of-Care Notes',
        notes: '12-Lead ECG: Sinus tachycardia (116 bpm), no ST shifts. Rapid glucose 104 mg/dL (normal).',
        createdAt: minsAgo(20),
      },
      {
        incidentId: incSadia.id,
        authorUserId: cmoUser.id,
        milestoneType: ClinicalNoteType.ASSESSMENT,
        title: 'Attending Assessment',
        notes: 'Condition stabilizing with supplemental O2 (SpO2 96%) and volume repletion. Continue monitoring.',
        createdAt: minsAgo(10),
      },
    ],
  });

  // ==========================================================================
  // 8. MEDICINES, BATCHES & TRANSACTIONAL DISPENSATIONS
  // ==========================================================================
  const medEpi = await prisma.medicine.create({
    data: {
      skuCode: 'MED-EPI-03',
      name: 'Epinephrine Auto-Injector',
      genericName: 'Epinephrine 0.3mg Adult',
      category: 'Anaphylaxis / Resuscitation',
      storageRequirement: 'Cool Dark < 25 C',
      isControlled: false,
      unitLabel: 'kits',
      minParLevel: 20,
    },
  });

  const medOrs = await prisma.medicine.create({
    data: {
      skuCode: 'MED-ORS-20',
      name: 'ORS Electrolyte Powder',
      genericName: 'WHO Standard Oral Rehydration Salts',
      category: 'Hydration & Electrolytes',
      storageRequirement: 'Ambient Dry < 30 C',
      isControlled: false,
      unitLabel: 'sachets',
      minParLevel: 200,
    },
  });

  const medSaline = await prisma.medicine.create({
    data: {
      skuCode: 'MED-NS-500',
      name: 'Normal Saline 0.9% IV',
      genericName: 'Sodium Chloride 0.9% 500mL',
      category: 'Resuscitation Fluids',
      storageRequirement: 'Controlled 20-25 C',
      isControlled: false,
      unitLabel: 'bags',
      minParLevel: 50,
    },
  });

  const medParacetamol = await prisma.medicine.create({
    data: {
      skuCode: 'MED-PARA-IV',
      name: 'Paracetamol IV Infusion',
      genericName: 'Paracetamol 1000mg / 100mL',
      category: 'Analgesics & Antipyretics',
      storageRequirement: 'Protect from Light',
      isControlled: false,
      unitLabel: 'vials',
      minParLevel: 20,
    },
  });

  const medDiazepam = await prisma.medicine.create({
    data: {
      skuCode: 'MED-DZP-05',
      name: 'Diazepam Ampoule (Controlled)',
      genericName: 'Diazepam 5mg/mL — 2mL Ampoule',
      category: 'Anticonvulsant (Controlled)',
      storageRequirement: 'Locked Controlled Vault',
      isControlled: true,
      unitLabel: 'amps',
      minParLevel: 10,
    },
  });

  const batchSalineSt1 = await prisma.medicineBatch.create({
    data: {
      medicineId: medSaline.id,
      stationId: station1.id,
      batchNumber: 'NS-09-501A',
      quantity: 24,
      maxQuantity: 120,
      expiryDate: new Date('2027-03-31'),
    },
  });

  const batchParaSt1 = await prisma.medicineBatch.create({
    data: {
      medicineId: medParacetamol.id,
      stationId: station1.id,
      batchNumber: 'PARA-IV-94',
      quantity: 48,
      maxQuantity: 60,
      expiryDate: new Date('2027-10-31'),
    },
  });

  await prisma.medicineBatch.createMany({
    data: [
      {
        medicineId: medEpi.id,
        stationId: centralDepot.id,
        batchNumber: 'EPN-2025-91',
        quantity: 12,
        maxQuantity: 40,
        expiryDate: new Date('2027-11-30'),
      },
      {
        medicineId: medOrs.id,
        stationId: station2.id,
        batchNumber: 'ORS-BD-8802',
        quantity: 180,
        maxQuantity: 500,
        expiryDate: new Date('2028-08-31'),
      },
    ],
  });

  const batchDiazepamDepot = await prisma.medicineBatch.create({
    data: {
      medicineId: medDiazepam.id,
      stationId: centralDepot.id,
      batchNumber: 'DZP-902-BD',
      quantity: 18,
      maxQuantity: 20,
      expiryDate: new Date('2028-05-31'),
    },
  });

  await prisma.medicineDispensation.createMany({
    data: [
      {
        incidentId: incSadia.id,
        batchId: batchSalineSt1.id,
        quantityDispensed: 1,
        doseRoute: '500 mL IV Rapid Push',
        administeredByUserId: nurseUser1.id,
        dispensedAt: minsAgo(35),
      },
      {
        incidentId: incSadia.id,
        batchId: batchParaSt1.id,
        quantityDispensed: 1,
        doseRoute: '1000 mg IV Infusion',
        administeredByUserId: cmoUser.id,
        dispensedAt: minsAgo(25),
      },
      {
        incidentId: incMahia.id,
        batchId: batchDiazepamDepot.id,
        quantityDispensed: 1,
        doseRoute: '5 mg IV Slow (Dual-Verified Controlled)',
        administeredByUserId: nurseUser1.id,
        verifiedByUserId: nurseUser2.id, // Distinct user — satisfies CHECK constraint!
        dispensedAt: minsAgo(22),
      },
    ],
  });

  // ==========================================================================
  // 9. MEDICAL EQUIPMENT
  // ==========================================================================
  await prisma.medicalEquipment.createMany({
    data: [
      {
        assetCode: 'EQ-AED-03',
        name: 'Mindray BeneHeart D3',
        model: 'BeneHeart D3',
        serialNumber: 'D3-8841-B',
        category: EquipmentCategory.AED,
        stationId: station1.id,
        status: EquipmentStatus.IN_USE,
        batteryPct: 78,
        lastInspectedAt: minsAgo(360),
        nextAuditDue: new Date(now.getTime() + 4 * 60 * 60_000),
        notes: 'Deployed for Main Stage emergency response.',
      },
      {
        assetCode: 'EQ-MON-04',
        name: 'Zoll X-Series Monitor',
        model: 'X-Series',
        serialNumber: 'ZX-9912',
        category: EquipmentCategory.MONITOR,
        stationId: station1.id,
        status: EquipmentStatus.OPERATIONAL,
        batteryPct: 94,
        lastInspectedAt: minsAgo(300),
        notes: 'Connected to AC power in Station 1 Bed A-02.',
      },
      {
        assetCode: 'EQ-O2-08',
        name: 'Inogen One G5 Portable O2',
        model: 'One G5',
        serialNumber: 'IG5-4410',
        category: EquipmentCategory.OXYGEN,
        stationId: station2.id,
        status: EquipmentStatus.OPERATIONAL,
        batteryPct: 100,
        lastInspectedAt: minsAgo(600),
      },
      {
        assetCode: 'EQ-SUC-02',
        name: 'Laerdal Compact Suction 4',
        model: 'LCSU 4',
        serialNumber: 'LC4-2209',
        category: EquipmentCategory.SUCTION,
        stationId: station2.id,
        status: EquipmentStatus.LOW_BATTERY,
        batteryPct: 18,
        lastInspectedAt: minsAgo(480),
        notes: 'Flagged for battery dock swap.',
      },
      {
        assetCode: 'EQ-STR-03',
        name: 'Stryker M1 Roll-in Stretcher',
        model: 'M1',
        serialNumber: 'STR-7710',
        category: EquipmentCategory.STRETCHER,
        stationId: station3.id,
        status: EquipmentStatus.OPERATIONAL,
        batteryPct: null,
        lastInspectedAt: minsAgo(720),
      },
    ],
  });

  // ==========================================================================
  // 10. AMBULANCES & DISPATCHES (Reconciled: 4 Campus Units)
  // ==========================================================================
  const amb1 = await prisma.ambulance.create({
    data: {
      callsign: 'MED-AMB-01',
      plateNumber: 'DHAKA-METRO-CH-4491',
      tier: AmbulanceTier.ALS_ICU,
      driverName: 'M. Ali',
      paramedicLead: 'S. Alam, EMT-P',
      stationId: station1.id,
      status: AmbulanceStatus.EN_ROUTE,
      fuelPct: 82,
      equipmentSummary: 'Defibrillator + Portable Ventilator + Full O2 Reserve',
    },
  });

  await prisma.ambulance.createMany({
    data: [
      {
        callsign: 'MED-AMB-02',
        plateNumber: 'RANGPUR-GA-1102',
        tier: AmbulanceTier.BLS,
        driverName: 'K. Rahman',
        paramedicLead: 'F. Hossain, EMT',
        stationId: station1.id,
        status: AmbulanceStatus.STANDBY,
        fuelPct: 95,
        equipmentSummary: 'Trauma First Response Kit + Stretcher + Splints',
      },
      {
        callsign: 'MED-AMB-03',
        plateNumber: 'DHAKA-METRO-HA-8821',
        tier: AmbulanceTier.FIELD_4X4,
        driverName: 'T. Islam',
        paramedicLead: 'R. Parvez, EMT',
        stationId: station2.id,
        status: AmbulanceStatus.STANDBY,
        fuelPct: 88,
        equipmentSummary: 'All-Terrain Sports Evacuation Kit + Cooling Pack',
      },
      {
        callsign: 'CMH-ALS-01',
        plateNumber: 'MIL-MED-098',
        tier: AmbulanceTier.MUTUAL_AID,
        driverName: 'Escort Crew 01',
        paramedicLead: 'External Partner Team',
        stationId: centralDepot.id,
        status: AmbulanceStatus.STANDBY,
        fuelPct: 96,
        equipmentSummary: 'Heavy Critical Care Mutual-Aid Unit (Demo)',
      },
    ],
  });

  await prisma.ambulanceDispatch.create({
    data: {
      ambulanceId: amb1.id,
      incidentId: incMahia.id,
      dispatchedByUserId: dispatcherUser.id,
      destinationHospital: 'Saidpur CMH Emergency Dept (Demo)',
      priority: DispatchPriority.CODE_RED,
      etaMinutes: 6,
      status: DispatchStatus.EN_ROUTE,
      notes: 'Gate 1 south perimeter cleared by campus security.',
      dispatchedAt: minsAgo(12),
    },
  });

  // ==========================================================================
  // 11. EMERGENCY ALERTS
  // ==========================================================================
  await prisma.emergencyAlert.createMany({
    data: [
      {
        incidentId: incSadia.id,
        createdByUserId: dispatcherUser.id,
        acknowledgedByUserId: cmoUser.id,
        severity: AlertSeverity.P1_CRITICAL,
        title: 'Heat Exhaustion / Pre-syncope — Main Auditorium Corridor',
        locationText: 'Main Auditorium Stage 2 Corridor',
        description: 'Patient admitted to Station 1 Bed A-02. IV rehydration active.',
        status: AlertStatus.ON_SCENE,
        createdAt: minsAgo(41),
        acknowledgedAt: minsAgo(39),
      },
      {
        incidentId: incMahia.id,
        createdByUserId: dispatcherUser.id,
        severity: AlertSeverity.P1_CRITICAL,
        title: 'Cardiac Arrhythmia Escalation — Transfer In Progress',
        locationText: 'Main Stage Front Barrier',
        description: 'MED-AMB-01 dispatched for hospital transfer.',
        status: AlertStatus.INTERCEPTING,
        createdAt: minsAgo(27),
      },
      {
        incidentId: incMehnaz.id,
        createdByUserId: volunteerUser.id,
        acknowledgedByUserId: nurseUser1.id,
        severity: AlertSeverity.P2_URGENT,
        title: 'Allergic Reaction (Urticaria) — Food Court Plaza',
        locationText: 'Food Court Plaza',
        description: 'Patient stabilized at Station 3 under observation.',
        status: AlertStatus.RESOLVED,
        createdAt: minsAgo(80),
        acknowledgedAt: minsAgo(78),
        resolvedAt: minsAgo(50),
      },
    ],
  });

  // ==========================================================================
  // 12. SYSTEM SETTINGS & INITIAL AUDIT LOGS
  // ==========================================================================
  await prisma.systemSetting.createMany({
    data: [
      {
        key: 'event.profile',
        category: 'event',
        valueJson: {
          eventName: 'Medical & Resource Management System For Any Event',
          activeDay: 'Event Day 2',
          expectedAttendance: 6420,
          ambientTempC: 33.4,
          advisoryLevel: 'Heat Advisory Level 2',
          isDemoPrototype: true,
        },
        updatedByUserId: superAdmin.id,
      },
      {
        key: 'triage.slas',
        category: 'clinical',
        valueJson: {
          p1TargetSeconds: 120,
          p1EscalationSeconds: 180,
          p2TargetSeconds: 360,
          p3TargetSeconds: 900,
        },
        updatedByUserId: cmoUser.id,
      },
      {
        key: 'telemetry.polling',
        category: 'system',
        valueJson: {
          dashboardPollIntervalMs: 5000,
          alertsPollIntervalMs: 5000,
          defaultSessionHours: 2,
          rememberTerminalHours: 12,
        },
        updatedByUserId: superAdmin.id,
      },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      {
        actorUserId: superAdmin.id,
        action: 'SYSTEM_SEED',
        entityType: 'SystemSetting',
        entityId: 'event.profile',
        summary: 'Initialized MEDIJIGS synthetic demo dataset for Medical & Resource Management System For Any Event.',
        ipAddress: '127.0.0.1',
        createdAt: minsAgo(180),
      },
      {
        actorUserId: cmoUser.id,
        action: 'VITALS_LOGGED',
        entityType: 'MedicalIncident',
        entityId: incSadia.id,
        summary: 'Recorded follow-up vitals for #INC-1052 (SpO2 recovered to 96%).',
        ipAddress: '10.14.0.24',
        createdAt: minsAgo(15),
      },
      {
        actorUserId: dispatcherUser.id,
        action: 'AMBULANCE_DISPATCHED',
        entityType: 'Ambulance',
        entityId: amb1.id,
        summary: 'Dispatched MED-AMB-01 for Code Red transfer (#INC-1049).',
        ipAddress: '10.14.0.25',
        createdAt: minsAgo(12),
      },
    ],
  });

  console.log('[EMRMS Seed] Synthetic demo seed completed successfully.');
  console.log('[EMRMS Seed] Demo login password for all 7 accounts: DemoPass123!');
  console.log(
    '[EMRMS Seed] Accounts: admin@baust-demo.edu.bd (SUPER_ADMIN), e.vance@baust-demo.edu.bd (MEDICAL_ADMIN), t.hasan@baust-demo.edu.bd (DOCTOR), f.yasmin@baust-demo.edu.bd (NURSE), dispatch@baust-demo.edu.bd (DISPATCHER), volunteer@baust-demo.edu.bd (VOLUNTEER)'
  );
}

main()
  .catch((err) => {
    console.error('[EMRMS Seed] Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
