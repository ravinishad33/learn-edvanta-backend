const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});




const sendOtpEmail = async (user, otp) => {
  return await transporter.sendMail({
    from: `"Edvanta" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: "Your OTP Code",
    html: `
  <div style="margin:0; padding:0; background-color:#f4f6f8; font-family:Arial, Helvetica, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:30px 0;">
      <tr>
        <td align="center">
          <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; box-shadow:0 6px 18px rgba(0,0,0,0.08); padding:40px;">
            
            <!-- Header -->
            <tr>
              <td align="center" style="padding-bottom:10px;">
                <h2 style="margin:0; font-size:24px; color:#111827;">
                  Password Reset Request 🔐
                </h2>
              </td>
            </tr>

            <!-- Greeting -->
            <tr>
              <td style="font-size:15px; color:#4b5563; line-height:1.7; padding-top:10px;">
                Hi <strong>${user.name}</strong>,
                <br /><br />
                We received a request to reset your Edvanta account password.
                Use the One-Time Password (OTP) below to proceed.
                This code is valid for <strong>5 minutes</strong>.
              </td>
            </tr>

            <!-- OTP Box -->
            <tr>
              <td align="center" style="padding:35px 0;">
                <div style="
                  display:inline-block;
                  font-size:32px;
                  letter-spacing:10px;
                  padding:16px 32px;
                  background:linear-gradient(135deg,#2563eb,#1e40af);
                  color:#ffffff;
                  border-radius:10px;
                  font-weight:bold;
                ">
                  ${otp}
                </div>
              </td>
            </tr>

            <!-- Instructions -->
            <tr>
              <td style="font-size:14px; color:#6b7280; line-height:1.6;">
                Enter this code on the password reset page to create a new password.
              </td>
            </tr>

            <!-- Security Note -->
            <tr>
              <td style="font-size:14px; color:#6b7280; line-height:1.6; padding-top:15px;">
                If you did not request a password reset, you can safely ignore this email.
                Your account will remain secure.
              </td>
            </tr>

            <!-- Divider -->
            <tr>
              <td style="padding-top:30px;">
                <hr style="border:none; border-top:1px solid #e5e7eb;" />
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td align="center" style="padding-top:15px; font-size:12px; color:#9ca3af;">
                © ${new Date().getFullYear()} Edvanta. All rights reserved.
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </div>
`,
 
               
       
  
  });
};










const sendFailedOtpEmail = async (user, attempt, ipAddress, deviceName, location) => {
  const mailOptions = {
    from: `"Edvanta" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: "Alert: Failed Login Attempt on Your Account",
    html: `
    <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Edvanta OTP Alert</title>
  <style>
    body {
      font-family: 'Helvetica', Arial, sans-serif;
      background-color: #f4f6f8;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 30px auto;
      background-color: #fff;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background-color: #4B6CB7;
      color: #fff;
      padding: 20px;
      text-align: center;
      font-size: 22px;
      font-weight: bold;
    }
    .content {
      padding: 30px;
      line-height: 1.6;
    }
    .content h2 {
      color: #4B6CB7;
      font-size: 20px;
    }
    .details {
      background-color: #f0f4ff;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
      font-size: 14px;
    }
    .button {
      display: inline-block;
      background-color: #4B6CB7;
      color: #fff;
      text-decoration: none;
      padding: 12px 25px;
      border-radius: 5px;
      font-weight: bold;
      margin-top: 20px;
    }
    .footer {
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #888;
    }
    .footer a {
      color: #4B6CB7;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      Edvanta Security Alert
    </div>
    <div class="content">
      <h2>Hi ${user.name},</h2>
      <p>We noticed a recent attempt to reset your Edvanta account password. Unfortunately, the One-Time Password (OTP) entered was <strong>incorrect</strong>.</p>
      
      <div class="details">
        <p><strong>Attempt Number:</strong> ${attempt}</p>
        <p><strong>Date & Time:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>IP Address / Device:</strong> ${ipAddress || "Unknown"} / ${deviceName}</p>
        <p><strong>Location:</strong> ${location}</p>
      </div>

      <p>If this was <strong>you</strong>, please retry resetting your password using the correct OTP.</p>
      <a href="${process.env.FRONTEND_URL}/forgot-password" class="button">Reset My Password</a> <!-- Replace # with actual reset link -->

      <p>If this wasn’t you, please secure your account immediately:</p>
      <ul>
        <li>Change your password right away.</li>
        <li>Enable two-factor authentication for added security.</li>
        <li>Review your recent account activity.</li>
      </ul>

      <p>For more tips on keeping your account safe, visit: <a href="${process.env.FRONTEND_URL}/contact-support">Edvanta Security Center</a></p> <!-- Replace # with actual link -->
      
      <p>Thank you for being part of Edvanta. Stay safe!</p>
      <p><strong>Edvanta Support Team</strong></p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Edvanta. All rights reserved. | <a href="${process.env.FRONTEND_URL}/privacy">Privacy Policy</a>
    </div>
  </div>
</body>
</html>
    `
  };

  await transporter.sendMail(mailOptions);
};













const sendPasswordResetSuccessEmail = async (user, ipAddress, deviceName, location) => {
  const mailOptions = {
    from: `"Edvanta" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: "Your Edvanta Password Was Reset Successfully",
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Edvanta Password Reset Success</title>
  <style>
    body {
      font-family: 'Helvetica', Arial, sans-serif;
      background-color: #f4f6f8;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 30px auto;
      background-color: #fff;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background-color: #4B6CB7;
      color: #fff;
      padding: 20px;
      text-align: center;
      font-size: 22px;
      font-weight: bold;
    }
    .content {
      padding: 30px;
      line-height: 1.6;
    }
    .content h2 {
      color: #4B6CB7;
      font-size: 20px;
    }
    .details {
      background-color: #f0f4ff;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
      font-size: 14px;
    }
    .button {
      display: inline-block;
      background-color: #4B6CB7;
      color: #fff;
      text-decoration: none;
      padding: 12px 25px;
      border-radius: 5px;
      font-weight: bold;
      margin-top: 20px;
    }
    .footer {
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #888;
    }
    .footer a {
      color: #4B6CB7;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      Edvanta Security Notification
    </div>
    <div class="content">
      <h2>Hi ${user.name},</h2>
      <p>Your Edvanta account password has been <strong>successfully reset</strong>.</p>

      <div class="details">
        <p><strong>Date & Time:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>IP Address:</strong> ${ipAddress || "Unknown"}</p>
        <p><strong>Device:</strong> ${deviceName || "Unknown Device"}</p>
        <p><strong>Location:</strong> ${location || "Unknown Location"}</p>
      </div>

      <p>If you made this change, no further action is required.</p>

      <p>If you did <strong>not</strong> reset your password, please secure your account immediately:</p>
      <ul>
        <li>Reset your password again right away.</li>
        <li>Enable two-factor authentication.</li>
        <li>Contact Edvanta support immediately.</li>
      </ul>

      <a href="${process.env.FRONTEND_URL}/login" class="button">Login to My Account</a>

      <p>Thank you for using Edvanta.</p>
      <p><strong>Edvanta Support Team</strong></p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Edvanta. All rights reserved. |
      <a href="${process.env.FRONTEND_URL}/privacy">Privacy Policy</a>
    </div>
  </div>
</body>
</html>
    `
  };

  await transporter.sendMail(mailOptions);
};



const sendEnrollmentEmail = async (student, course) => {
  const mailOptions = {
    from: `"Edvanta" <${process.env.EMAIL_USER}>`,
    to: student?.email,
    subject: `Enrollment Confirmed: ${course?.title}`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Course Enrollment Confirmation</title>
  <style>
    body {
      font-family: 'Helvetica', Arial, sans-serif;
      background-color: #f4f6f8;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 30px auto;
      background-color: #fff;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background-color: #4B6CB7;
      color: #fff;
      padding: 20px;
      text-align: center;
      font-size: 22px;
      font-weight: bold;
    }
    .content {
      padding: 30px;
      line-height: 1.6;
    }
    .content h2 {
      color: #4B6CB7;
      font-size: 20px;
    }
    .details {
      background-color: #f0f4ff;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
      font-size: 14px;
    }
    .button {
      display: inline-block;
      background-color: #4B6CB7;
      color: #fff;
      text-decoration: none;
      padding: 12px 25px;
      border-radius: 5px;
      font-weight: bold;
      margin-top: 20px;
    }
    .footer {
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #888;
    }
    .footer a {
      color: #4B6CB7;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      Edvanta Enrollment Confirmation
    </div>
    <div class="content">
      <h2>Hi ${student?.name},</h2>
      <p>Congratulations! You have successfully enrolled in the course <strong>${course?.title}</strong>.</p>

      <div class="details">
        <p><strong>Course:</strong> ${course?.title}</p>
        <p><strong>Instructor:</strong> ${course?.instructor?.name}</p>
        <p><strong>Enrolled At:</strong> ${new Date().toLocaleString()}</p>
      </div>

      <p>You can now access the course and start learning.</p>
      <a href="${process.env.FRONTEND_URL}/course/${course?._id}" class="button">Go to Course</a>

      <p>Thank you for choosing Edvanta!</p>
      <p><strong>Edvanta Support Team</strong></p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Edvanta. All rights reserved. |
      <a href="${process.env.FRONTEND_URL}/privacy">Privacy Policy</a>
    </div>
  </div>
</body>
</html>
    `
  };

  await transporter.sendMail(mailOptions);
};












const sendEmailVerificationOtp = async (email, otp) => {
  return await transporter.sendMail({
    from: `"Edvanta" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Verify Your Email - Edvanta",
    html: `
  <div style="margin:0; padding:0; background-color:#f4f6f8; font-family:Arial, Helvetica, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:30px 0;">
      <tr>
        <td align="center">
          <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; box-shadow:0 6px 18px rgba(0,0,0,0.08); padding:40px;">
            
            <!-- Header -->
            <tr>
              <td align="center" style="padding-bottom:10px;">
                <h2 style="margin:0; font-size:24px; color:#111827;">
                  Verify Your Email Address ✉️
                </h2>
              </td>
            </tr>

            <!-- Message -->
            <tr>
              <td style="font-size:15px; color:#4b5563; line-height:1.7; padding-top:10px;">
                Thank you for registering with Edvanta.
                <br /><br />
                Please use the One-Time Password (OTP) below to verify your email address.
                This code is valid for <strong>5 minutes</strong>.
              </td>
            </tr>

            <!-- OTP Box -->
            <tr>
              <td align="center" style="padding:35px 0;">
                <div style="
                  display:inline-block;
                  font-size:32px;
                  letter-spacing:10px;
                  padding:16px 32px;
                  background:linear-gradient(135deg,#2563eb,#1e40af);
                  color:#ffffff;
                  border-radius:10px;
                  font-weight:bold;
                ">
                  ${otp}
                </div>
              </td>
            </tr>

            <!-- Instructions -->
            <tr>
              <td style="font-size:14px; color:#6b7280; line-height:1.6;">
                Enter this code on the registration page to complete your account setup.
              </td>
            </tr>

            <!-- Security Note -->
            <tr>
              <td style="font-size:14px; color:#6b7280; line-height:1.6; padding-top:15px;">
                If you did not create an account, you can safely ignore this email.
              </td>
            </tr>

            <!-- Divider -->
            <tr>
              <td style="padding-top:30px;">
                <hr style="border:none; border-top:1px solid #e5e7eb;" />
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td align="center" style="padding-top:15px; font-size:12px; color:#9ca3af;">
                © ${new Date().getFullYear()} Edvanta. All rights reserved.
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </div>
`,
  });
};






module.exports = { sendOtpEmail, 
  sendFailedOtpEmail ,
  sendPasswordResetSuccessEmail,
  sendEnrollmentEmail,
  sendEmailVerificationOtp
};
