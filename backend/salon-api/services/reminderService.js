const db = require('../config/db');
const { sendAppointmentReminderEmail } = require('../utils/mailer');

const DEFAULT_REMINDER_BEFORE_HOURS = 24;
const DEFAULT_CHECK_INTERVAL_MS = 5 * 60 * 1000;

let isRunning = false;
let intervalId = null;

const getReminderBeforeHours = () => {
  const value = Number(process.env.REMINDER_BEFORE_HOURS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_REMINDER_BEFORE_HOURS;
};

const getCheckIntervalMs = () => {
  const value = Number(process.env.REMINDER_CHECK_INTERVAL_MS);
  return Number.isFinite(value) && value >= 60000 ? value : DEFAULT_CHECK_INTERVAL_MS;
};

const formatAppointmentDateTime = (date) => {
  const timeZone = process.env.TIME_ZONE || 'Europe/Kiev';

  return new Intl.DateTimeFormat('uk-UA', {
    timeZone,
    dateStyle: 'long',
    timeStyle: 'short'
  }).format(new Date(date));
};

const ensureReminderColumn = async () => {
  const [columns] = await db.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'appointments'
       AND COLUMN_NAME = 'reminder_sent_at'`
  );

  if (columns.length > 0) {
    return;
  }

  await db.query('ALTER TABLE appointments ADD COLUMN reminder_sent_at DATETIME NULL');
};

const getPendingReminders = async () => {
  const reminderBeforeHours = getReminderBeforeHours();

  const [rows] = await db.query(
    `SELECT
       a.id,
       a.appointment_datetime,
       COALESCE(a.service_name, s.name, 'Послуга') AS service_name,
       u.email AS user_email,
       COALESCE(NULLIF(CONCAT_WS(' ', mu.name, mu.surname), ''), 'Майстер') AS master_name
     FROM appointments a
     JOIN users u ON u.id = a.user_id
     LEFT JOIN services s ON s.id = a.service_id
     LEFT JOIN masters m ON m.id = a.master_id
     LEFT JOIN users mu ON mu.id = m.user_id
     WHERE a.reminder_sent_at IS NULL
       AND a.status = 'booked'
       AND u.email IS NOT NULL
       AND u.email <> ''
       AND a.appointment_datetime > NOW()
       AND a.appointment_datetime <= DATE_ADD(NOW(), INTERVAL ? HOUR)
       AND (
         a.payment_method = 'offline'
         OR a.payment_status = 'paid'
         OR a.payment_method IS NULL
       )
     ORDER BY a.appointment_datetime ASC
     LIMIT 50`,
    [reminderBeforeHours]
  );

  return rows;
};

const markReminderSent = async (appointmentId) => {
  await db.query(
    'UPDATE appointments SET reminder_sent_at = NOW() WHERE id = ? AND reminder_sent_at IS NULL',
    [appointmentId]
  );
};

const sendDueReminders = async () => {
  if (isRunning) {
    return;
  }

  isRunning = true;

  try {
    const appointments = await getPendingReminders();

    for (const appointment of appointments) {
      await sendAppointmentReminderEmail(appointment.user_email, {
        dateTime: formatAppointmentDateTime(appointment.appointment_datetime),
        serviceName: appointment.service_name,
        masterName: appointment.master_name
      });

      await markReminderSent(appointment.id);
      console.log(`Appointment reminder sent: ${appointment.id}`);
    }
  } catch (error) {
    console.error('Appointment reminders error:', error);
  } finally {
    isRunning = false;
  }
};

const startReminderScheduler = async () => {
  if (intervalId) {
    return intervalId;
  }

  try {
    await ensureReminderColumn();
  } catch (error) {
    console.error('Failed to prepare appointment reminders:', error);
    return null;
  }

  await sendDueReminders();
  intervalId = setInterval(sendDueReminders, getCheckIntervalMs());
  return intervalId;
};

module.exports = {
  startReminderScheduler,
  sendDueReminders
};
