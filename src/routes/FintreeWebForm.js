import express from "express";
import nodemailer from "nodemailer";

const router = express.Router();

router.post("/FormApplication", async (req, res) => {
  try {
    const {
      name,
      email,
      dob,
      mobile,
      loanType,
      pincode,
      city,
      state,
      loanAmount,
      constitution,
      businessYears,
      gstRegistered,
      gstin,
    } = req.body;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; background-color: #f9f9f9;">
        <h1 style="color: #004085;">📄 New Loan Request from Website</h1>
        <p style="font-size: 16px;">A new loan application has been submitted. Please find the details below:</p>

        <table cellpadding="8" cellspacing="0" border="0" style="border-collapse: collapse; background-color: #fff; border: 1px solid #ddd; width: 100%; margin-top: 20px;">
          <tr style="background-color: #f1f1f1;">
            <th align="left">Field</th>
            <th align="left">Value</th>
          </tr>
          <tr><td><strong>Name</strong></td><td>${name}</td></tr>
          <tr><td><strong>Email</strong></td><td>${email}</td></tr>
          <tr><td><strong>Date of Birth</strong></td><td>${dob}</td></tr>
          <tr><td><strong>Mobile</strong></td><td>${mobile}</td></tr>
          <tr><td><strong>Loan Type</strong></td><td>${loanType}</td></tr>
          <tr><td><strong>Loan Amount</strong></td><td>₹${loanAmount}</td></tr>
          <tr><td><strong>City</strong></td><td>${city}</td></tr>
          <tr><td><strong>State</strong></td><td>${state}</td></tr>
          <tr><td><strong>Pincode</strong></td><td>${pincode}</td></tr>
          <tr><td><strong>Constitution</strong></td><td>${constitution}</td></tr>
          <tr><td><strong>Years in Business</strong></td><td>${businessYears}</td></tr>
          <tr><td><strong>GST Registered</strong></td><td>${gstRegistered}</td></tr>
          <tr><td><strong>GSTIN</strong></td><td>${gstin || 'N/A'}</td></tr>
        </table>

        <p style="margin-top: 30px; font-size: 14px; color: #555;">This request was generated from the loan inquiry form on the Fintree Finance website.</p>
      </div>
    `;

    // ✅ Create Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: 'wecarefintree@gmail.com',           // e.g. noreplywecarefintree@gmail.com
        pass: 'onvhfgqqnaygmtsu',   // your Gmail App Password (not your real password)
      },
    });

    // ✅ Send the email
    await transporter.sendMail({
      to:'wecarefintree@gmail.com',                 // recipient email (Fintree team)
      from:'noreplywecarefintree@gmail.com',
      replyTo: email,
      subject: `Loan Application - ${name}`,
      html: htmlBody,
    });

    res.status(200).json({ message: "Loan application submitted successfully" });
  } catch (error) {
    console.error("Error submitting loan application:", error);
    res.status(500).json({ error: "Failed to send loan application email" });
  }
});

export default router;
