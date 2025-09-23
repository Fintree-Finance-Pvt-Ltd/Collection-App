// src/entities/Embifi.js
import { EntitySchema } from 'typeorm';

export default new EntitySchema({
  name: 'Embifi',
  tableName: 'embifi',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: 'increment',
      width: 11,
      nullable: false,
      name: 'id',
    },

    createdAt: {
      type: 'datetime',        // matches DATETIME in DB
      nullable: true,
      name: 'created_at',
    },

    partnerLoanId: {
      type: 'varchar',
      length: 50,
      unique: true,
      name: 'partner_loan_id',
    },
    lan: {
      type: 'varchar',
      length: 20,
      unique: true,
      name: 'lan',
    },

    applicantName: {
      type: 'varchar',
      length: 100,
      name: 'applicant_name',
    },

    applicantDob: {
      type: 'date',
      nullable: true,
      name: 'applicant_dob',
    },

    applicantAge: {
      type: 'smallint',
      unsigned: true,
      nullable: true,
      name: 'applicant_age',
    },

    pos: {
      type: 'decimal',
      precision: 15,
      scale: 2,
      nullable: true,
      default: 0.0,
      name: 'pos',
    },
    overdue: {
      type: 'decimal',
      precision: 15,
      scale: 2,
      nullable: true,
      default: 0.0,
      name: 'overdue',
    },
    dpd_days: {
      type: 'int',
      nullable: true,
      default: 0,
      name: 'dpd_days',
    },

    applicantFatherName: {
      type: 'varchar',
      length: 100,
      nullable: true,
      name: 'applicant_father_name',
    },

    panNumber: {
      type: 'varchar',
      length: 10,
      nullable: true,
      name: 'pan_number',
    },

    applicantAadhaarNumber: {
      type: 'varchar',
      length: 12,
      nullable: true,
      name: 'applicant_aadhaar_number',
    },

    mobileNumber: {
      type: 'varchar',
      length: 15,
      nullable: true,
      name: 'mobile_number',
    },

    coApplicantName: {
      type: 'varchar',
      length: 100,
      nullable: true,
      name: 'co_applicant_name',
    },

    coApplicantPanNo: {
      type: 'varchar',
      length: 10,
      nullable: true,
      name: 'co_applicant_pan_no',
    },

    coApplicantAadharNo: {
      type: 'varchar',
      length: 12,
      nullable: true,
      name: 'co_applicant_aadhar_no',
    },

    coApplicantDob: {
      type: 'date',
      nullable: true,
      name: 'co_applicant_dob',
    },

    coApplicantMobileNo: {
      type: 'varchar',
      length: 15,
      nullable: true,
      name: 'co_applicant_mobile_no',
    },

    approvedLoanAmount: {
      type: 'decimal',
      precision: 12,
      scale: 2,
      name: 'approved_loan_amount',
    },

    processingFeesWithTax: {
      type: 'decimal',
      precision: 12,
      scale: 2,
      nullable: true,
      name: 'processing_fees_with_tax',
    },

    // I corrected the spelling: processingFess -> processingFees (JS property).
    processingFees: {
      type: 'decimal',
      precision: 12,
      scale: 2,
      nullable: true,
      name: 'processing_fees',
    },

    processingFeesTax: {
      type: 'decimal',
      precision: 12,
      scale: 2,
      nullable: true,
      name: 'processing_fees_tax',
    },

    subvention: {
      type: 'decimal',
      precision: 12,
      scale: 2,
      nullable: true,
      name: 'subvention',
    },

    disbursalAmount: {
      type: 'decimal',
      precision: 12,
      scale: 2,
      name: 'disbursal_amount',
    },

    loanTenure: {
      type: 'int',
      name: 'loan_tenure',
    },

    emiAmount: {
      type: 'decimal',
      precision: 12,
      scale: 2,
      name: 'emi_amount',
    },

    interestRate: {
      type: 'decimal',
      precision: 5,
      scale: 2,
      name: 'interest_rate',
    },

    loanStatus: {
      type: 'varchar',
      length: 50,
      name: 'loan_status',
    },

    loanAdminStatus: {
      type: 'varchar',
      length: 50,
      name: 'loan_admin_status',
    },

    firstEmiDate: {
      type: 'date',
       nullable: true, 
      name: 'first_emi_date',
    },

    lastEmiDate: {
      type: 'date',
       nullable: true, 
      name: 'last_emi_date',
    },

    disbursementDate: {
      type: 'date',
       nullable: true, 
      name: 'disbursement_date',
    },

    disbursementUtr: {
      type: 'varchar',
      length: 50,
      nullable: true,
      name: 'disbursement_utr',
    },

    applicantAddress: {
      type: 'text',
      nullable: true,
      name: 'applicant_address',
    },

    applicantState: {
      type: 'varchar',
      length: 100,
      nullable: true,
      name: 'applicant_state',
    },

    applicantCity: {
      type: 'varchar',
      length: 100,
      nullable: true,
      name: 'applicant_city',
    },

    applicantPinCode: {
      type: 'varchar',
      length: 10,
      nullable: true,
      name: 'applicant_pin_code',
    },

    coApplicantAddress: {
      type: 'text',
      nullable: true,
      name: 'co_applicant_address',
    },

    coApplicantState: {
      type: 'varchar',
      length: 100,
      nullable: true,
      name: 'co_applicant_state',
    },

    coApplicantPinCode: {
      type: 'varchar',
      length: 10,
      nullable: true,
      name: 'co_applicant_pin_code',
    },

    bureauScore: {
      type: 'smallint',
      nullable: true,
      name: 'bureau_score',
    },

    monthlyIncome: {
      type: 'decimal',
      precision: 12,
      scale: 2,
      nullable: true,
      name: 'monthly_income',
    },

    accountNo: {
      type: 'varchar',
      length: 50,
      nullable: true,
      name: 'account_no',
    },

    ifscCode: {
      type: 'varchar',
      length: 11,
      nullable: true,
      name: 'ifsc_code',
    },

    gpsDeviceCost: {
      type: 'decimal',
      precision: 12,
      scale: 2,
      nullable: true,
      name: 'gps_device_cost',
    },

    gstOnGpsDevice: {
      type: 'decimal',
      precision: 12,
      scale: 2,
      nullable: true,
      name: 'gst_on_gps_device',
    },

    totalGpsDeviceCost: {
      type: 'decimal',
      precision: 12,
      scale: 2,
      nullable: true,
      name: 'total_gps_device_cost',
    },
  },
});
