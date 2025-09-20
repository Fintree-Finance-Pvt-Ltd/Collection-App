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
    },
    createdAt: {
      type: 'date',
      nullable: true,
      name: 'Created At',
    },
    partnerLoanId: {
      type: 'varchar',
      length: 50,
      unique: true,
      name: 'Partner Loan Id',
    },

    lan: {
      type: 'varchar',
      length: 20,
      unique: true,
      name: 'LAN',
    },
    applicantName: {
      type: 'varchar',
      length: 100,
      name: 'Applicant Name',
    },
    applicantDob: {
      type: 'date',
      nullable: true,
      name: 'Applicant DOB',
    },
    applicantAge: {
      type: 'int',
      nullable: true,
      name: 'Applicant Age',
    },
    pos: {
      type: 'decimal',
      precision: 15,
      scale: 2,
      nullable: true,
      default: 0.00,
      name: 'pos',
    },

    // ✅ match db: decimal(15,2) NULL DEFAULT 0.00
    overdue: {
      type: 'decimal',
      precision: 15,
      scale: 2,
      nullable: true,
      default: 0.00,
      name: 'overdue',
    },

    // ✅ match db: int(11) NULL DEFAULT 0
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
      name: 'Applicant Father Name',
    },
    panNumber: {
      type: 'varchar',
      length: 10,
      nullable: true,
      name: 'PAN Number',
    },
    applicantAadhaarNumber: {
      type: 'varchar',
      length: 12,
      nullable: true,
      name: 'Applicant Aadhaar Number',
    },
    mobileNumber: {
      type: 'varchar',
      length: 15,
      nullable: true,
      name: 'Mobile Number',
    },
    coApplicantName: {
      type: 'varchar',
      length: 100,
      nullable: true,
      name: 'CO-Applicant Name',
    },
    coApplicantPanNo: {
      type: 'varchar',
      length: 10,
      nullable: true,
      name: 'CO-Applicant Pan No',
    },
    coApplicantAadharNo: {
      type: 'varchar',
      length: 12,
      nullable: true,
      name: 'CO-Applicant Aadhar No',
    },
    coApplicantDob: {
      type: 'date',
      nullable: true,
      name: 'CO-Applicant DOB',
    },
    coApplicantMobileNo: {
      type: 'varchar',
      length: 15,
      nullable: true,
      name: 'CO-Applicant Mobile No',
    },
    approvedLoanAmount: {
      type: 'decimal',
      precision: 12,
      scale: 2,
      name: 'Approved Loan Amount',
    },
    processingFeesWithTax: {
      type: 'decimal',
      precision: 10,
      scale: 2,
      nullable: true,
      name: 'Processing Fees With Tax',
    },
    processingFess: {
      type: 'decimal',
      precision: 10,
      scale: 2,
      nullable: true,
      name: 'Processing Fess',
    },
    processingFeesTax: {
      type: 'decimal',
      precision: 10,
      scale: 2,
      nullable: true,
      name: 'Processing Fees Tax',
    },
    subvention: {
      type: 'decimal',
      precision: 10,
      scale: 2,
      nullable: true,
      name: 'Subvention',
    },
    disbursalAmount: {
      type: 'decimal',
      precision: 12,
      scale: 2,
      name: 'Disbursal Amount',
    },
    loanTenure: {
      type: 'int',
      name: 'Loan Tenure',
    },
    emiAmount: {
      type: 'decimal',
      precision: 10,
      scale: 2,
      name: 'EMI Amount',
    },
    interestRate: {
      type: 'decimal',
      precision: 5,
      scale: 2,
      name: 'Interest Rate',
    },
    loanStatus: {
      type: 'varchar',
      length: 50,
      name: 'Loan Status',
    },
    loanAdminStatus: {
      type: 'varchar',
      length: 50,
      name: 'Loan Admin Status',
    },
    firstEmiDate: {
      type: 'date',
      name: 'First EMI Date',
    },
    lastEmiDate: {
      type: 'date',
      name: 'Last EMI Date',
    },
    disbursementDate: {
      type: 'date',
      name: 'Disbursement Date',
    },
    disbursementUtr: {
      type: 'varchar',
      length: 50,
      nullable: true,
      name: 'Disbursement UTR',
    },
    applicantAddress: {
      type: 'text',
      nullable: true,
      name: 'Applicant Address',
    },
    applicantState: {
      type: 'varchar',
      length: 100,
      nullable: true,
      name: 'Applicant State',
    },
    applicantCity: {
      type: 'varchar',
      length: 100,
      nullable: true,
      name: 'Applicant City',
    },
    applicantPinCode: {
      type: 'varchar',
      length: 10,
      nullable: true,
      name: 'Applicant Pin Code',
    },
    coApplicantAddress: {
      type: 'text',
      nullable: true,
      name: 'CO-Applicant Address',
    },
    coApplicantState: {
      type: 'varchar',
      length: 100,
      nullable: true,
      name: 'CO-Applicant State',
    },
    coApplicantPinCode: {
      type: 'varchar',
      length: 10,
      nullable: true,
      name: 'CO-Applicant Pin Code',
    },
    bureauScore: {
      type: 'int',
      nullable: true,
      name: 'Bureau Score',
    },
    monthlyIncome: {
      type: 'decimal',
      precision: 12,
      scale: 2,
      nullable: true,
      name: 'Monthly Income',
    },
    accountNo: {
      type: 'varchar',
      length: 50,
      nullable: true,
      name: 'Account No.',
    },
    ifscCode: {
      type: 'varchar',
      length: 11,
      nullable: true,
      name: 'IFSC Code',
    },
    gpsDeviceCost: {
      type: 'decimal',
      precision: 10,
      scale: 2,
      nullable: true,
      name: 'GPS Device Cost',
    },
    gstOnGpsDevice: {
      type: 'decimal',
      precision: 10,
      scale: 2,
      nullable: true,
      name: 'GST on GPS device',
    },
    totalGpsDeviceCost: {
      type: 'decimal',
      precision: 10,
      scale: 2,
      nullable: true,
      name: 'Total GPS Device Cost',
    },
    imagePath: {
      type: 'varchar',
      length: 255,
      nullable: true,
      name: 'Image Path',
    },
  },
});
