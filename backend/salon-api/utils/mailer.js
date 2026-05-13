const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendMail = (options) => {
  return transporter.sendMail({
    from: `"Beauty Whisper" <${process.env.EMAIL_USER}>`,
    ...options
  });
};

const sendVerificationEmail = async (email, link) => {
  try {
    await sendMail({
      to: email,
      subject: 'Підтвердження реєстрації',
      html: `
        <div>
          <h2>Підтвердіть свій акаунт</h2>
          <p>Натисніть кнопку нижче:</p>
          <a href="${link}"
             style="padding:10px 20px;background:#4CAF50;color:#fff;text-decoration:none;">
             Підтвердити email
          </a>
        </div>
      `
    });

    console.log('Email sent to:', email);
  } catch (error) {
    console.log('Email error:', error);
  }
};

const sendAppointmentReminderEmail = async (email, appointment) => {
  await sendMail({
    to: email,
    subject: 'Нагадування про запис',
    html: `
      <div>
        <h2>Нагадуємо про ваш запис</h2>
        <p>Ви записані на ${appointment.dateTime}.</p>
        <p><strong>Послуга:</strong> ${appointment.serviceName}</p>
        <p><strong>Майстер:</strong> ${appointment.masterName}</p>
        <p>Якщо плани змінилися, будь ласка, зв'яжіться з салоном.</p>
      </div>
    `
  });
};

module.exports = {
  sendVerificationEmail,
  sendAppointmentReminderEmail
};
