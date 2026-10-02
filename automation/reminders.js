require('dotenv').config();
const db = require('../server/database');
const OFFSETS = (process.env.REMINDER_DAYS_BEFORE || '7,1,0').split(',').map(Number); // configurable
// Minimal text only: no vaccine/exam/diagnosis details.
const text = d => `OMMS: You have an occupational-health appointment on ${d}. Please contact your occupational-health service for details.`;
async function schedule() {
  for (const o of OFFSETS) await db.query(`insert into notification_jobs(appointment_id,offset_days,channel,run_at)
    select a.id,$1,'INTERNAL',(a.starts_at::date-$1::int)::timestamptz from appointments a
    where a.status='SCHEDULED' and a.starts_at>now() and a.starts_at::date-$1::int>=current_date on conflict do nothing`, [o]);
  await db.query(`update notification_jobs set status='CANCELLED' where status='PENDING' and appointment_id in (select id from appointments where status<>'SCHEDULED')`);
  await db.query(`update vaccinations set status='OVERDUE' where next_due_on<current_date and status not in ('COMPLETED','CANCELLED','OVERDUE')`);
}
async function deliverDue() {
  const { rows } = await db.query(`update notification_jobs set status='PROCESSING',attempts=attempts+1 where id in
    (select id from notification_jobs where status='PENDING' and run_at<=now() order by run_at limit 50 for update skip locked) returning id,appointment_id`);
  for (const j of rows) {
    try {
      const { rows: [a] } = await db.query('select a.starts_at,a.employee_id from appointments a where a.id=$1', [j.appointment_id]);
      await db.query('insert into notifications(category,title,body,employee_id,appointment_id) values($1,$2,$3,$4,$5)', ['Appointment', 'Appointment reminder', text(a.starts_at.toISOString().slice(0, 10)), a.employee_id, j.appointment_id]);
      await db.query("insert into notification_deliveries(job_id,status) values($1,'SENT')", [j.id]); // INTERNAL channel = real in-app notification
      await db.query("update notification_jobs set status='SENT' where id=$1", [j.id]);
    } catch (e) {
      await db.query("update notification_jobs set status='FAILED' where id=$1", [j.id]);
      await db.query("insert into notification_deliveries(job_id,status,error) values($1,'FAILED',$2)", [j.id, String(e)]);
    }
  }
}
const run = async () => { try { await schedule(); await deliverDue(); } catch (e) { console.error('[reminders]', e.message); } };
exports.start = () => { run(); return setInterval(run, 15 * 60 * 1000); };
if (require.main === module) run().then(() => db.pool.end());
