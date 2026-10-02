const router = require('express').Router();
const db = require('./database'), { requireRole } = require('./auth');
const ADMIN = ['SUPER_ADMIN', 'ADMINISTRATOR'], MED = ['SUPER_ADMIN', 'OCCUPATIONAL_DOCTOR', 'NURSE'], DOC = ['SUPER_ADMIN', 'OCCUPATIONAL_DOCTOR'];
const scope = req => req.user.role === 'COMPANY_MANAGER' ? req.user.company : null; // managers see only their company
const s = (v, n = 200) => typeof v === 'string' && v.trim() && v.length <= n ? v.trim() : null;
const bad = (res, m) => res.status(400).json({ error: m });
const isId = v => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v);

router.get('/stats', async (req, res) => {
  const c = scope(req);
  const { rows: [r] } = await db.query(`select
    (select count(*) from employees where status='ACTIVE' and ($1::uuid is null or company_id=$1)) employees,
    (select count(*) from vaccinations v join employees e on e.id=v.employee_id where v.status='NOT_STARTED' and ($1::uuid is null or e.company_id=$1)) not_started,
    (select count(*) from vaccinations v join employees e on e.id=v.employee_id where v.status='OVERDUE' and ($1::uuid is null or e.company_id=$1)) overdue,
    (select count(*) from appointments where status='SCHEDULED' and starts_at::date=current_date) appointments_today`, [c]);
  res.json(r);
});
router.get('/employees', async (req, res) => res.json((await db.query(`select id,employee_no,first_name,last_name,company_id,department,position,status from employees where status<>'ARCHIVED' and ($1::uuid is null or company_id=$1) order by last_name,first_name limit 500`, [scope(req)])).rows));
router.get('/employees/:id', async (req, res) => {
  if (!isId(req.params.id)) return bad(res, 'Invalid id');
  const { rows: [e] } = await db.query('select * from employees where id=$1 and ($2::uuid is null or company_id=$2)', [req.params.id, scope(req)]);
  e ? res.json(e) : res.status(404).json({ error: 'Not found' });
});
router.post('/employees', requireRole(...ADMIN), async (req, res) => {
  const b = req.body, d = new Date(b.date_of_birth);
  if (!s(b.employee_no, 32) || !s(b.first_name, 80) || !s(b.last_name, 80) || !isId(b.company_id) || isNaN(d) || d > new Date()) return bad(res, 'Invalid employee data');
  const { rows: [e] } = await db.query('insert into employees(employee_no,first_name,last_name,date_of_birth,company_id,department,position) values($1,$2,$3,$4,$5,$6,$7) returning id', [s(b.employee_no, 32), s(b.first_name, 80), s(b.last_name, 80), d, b.company_id, s(b.department), s(b.position)]);
  res.status(201).json(e);
});
router.get('/companies', async (req, res) => res.json((await db.query('select * from companies where ($1::uuid is null or id=$1) order by name', [scope(req)])).rows));
router.post('/companies', requireRole(...ADMIN), async (req, res) => {
  if (!s(req.body.name)) return bad(res, 'Name required');
  const { rows: [c] } = await db.query('insert into companies(name,industry,email) values($1,$2,$3) returning id', [s(req.body.name), s(req.body.industry), s(req.body.email)]);
  res.status(201).json(c);
});
router.get('/vaccinations', async (req, res) => res.json((await db.query(`select v.id,v.status,v.next_due_on,e.first_name,e.last_name,t.name vaccine,(select count(*) from vaccination_doses d where d.vaccination_id=v.id) doses from vaccinations v join employees e on e.id=v.employee_id join vaccination_types t on t.id=v.vaccination_type_id where ($1::uuid is null or e.company_id=$1) order by v.status limit 500`, [scope(req)])).rows));
router.post('/vaccinations', requireRole(...MED), async (req, res) => { // creates a REQUIREMENT, status NOT_STARTED, no dose
  if (!isId(req.body.employee_id) || !isId(req.body.vaccination_type_id)) return bad(res, 'Invalid data');
  const { rows: [v] } = await db.query('insert into vaccinations(employee_id,vaccination_type_id) values($1,$2) on conflict do nothing returning id', [req.body.employee_id, req.body.vaccination_type_id]);
  res.status(v ? 201 : 200).json(v || { exists: true });
});
router.post('/vaccinations/:id/doses', requireRole(...MED), async (req, res) => {
  const b = req.body, d = new Date(b.administered_on), n = parseInt(b.dose_number, 10), nd = b.next_due_on ? new Date(b.next_due_on) : null;
  if (!isId(req.params.id) || isNaN(d) || !(n > 0) || (nd && isNaN(nd))) return bad(res, 'Invalid dose data');
  await db.query('insert into vaccination_doses(vaccination_id,dose_number,administered_on,batch_number,manufacturer,administered_by) values($1,$2,$3,$4,$5,$6)', [req.params.id, n, d, s(b.batch_number, 60), s(b.manufacturer, 80), req.user.sub]);
  await db.query(`update vaccinations v set next_due_on=$2, status=case when (select count(*) from vaccination_doses where vaccination_id=v.id) >= (select doses_required from vaccination_protocols where id=v.protocol_id) then 'COMPLETED' when $2::date is not null then 'SCHEDULED' else 'UNKNOWN' end where v.id=$1`, [req.params.id, nd]);
  res.status(201).json({ ok: true });
});
router.get('/examinations', requireRole(...MED), async (req, res) => res.json((await db.query('select x.id,x.exam_type,x.exam_date,x.status,e.first_name,e.last_name from examinations x join employees e on e.id=x.employee_id order by x.exam_date desc nulls last limit 500')).rows));
router.post('/examinations', requireRole(...DOC), async (req, res) => {
  if (!isId(req.body.employee_id) || !s(req.body.exam_type, 80)) return bad(res, 'Invalid data');
  const { rows: [x] } = await db.query('insert into examinations(employee_id,exam_type,exam_date,doctor_id) values($1,$2,$3,$4) returning id', [req.body.employee_id, s(req.body.exam_type, 80), req.body.exam_date || null, req.user.sub]);
  res.status(201).json(x);
});
router.get('/appointments', async (req, res) => res.json((await db.query(`select a.id,a.kind,a.starts_at,a.status,e.first_name,e.last_name from appointments a join employees e on e.id=a.employee_id where a.starts_at>=now()-interval '30 days' and ($1::uuid is null or e.company_id=$1) order by a.starts_at limit 500`, [scope(req)])).rows));
router.post('/appointments', requireRole(...ADMIN, ...MED), async (req, res) => {
  const t = new Date(req.body.starts_at);
  if (!isId(req.body.employee_id) || isNaN(t) || !['VACCINATION', 'EXAMINATION', 'FOLLOW_UP', 'OTHER'].includes(req.body.kind)) return bad(res, 'Invalid data');
  const { rows: [a] } = await db.query('insert into appointments(employee_id,kind,starts_at,assigned_to) values($1,$2,$3,$4) returning id', [req.body.employee_id, req.body.kind, t, req.user.sub]);
  res.status(201).json(a);
});
router.get('/notifications', async (req, res) => res.json((await db.query('select id,category,title,body,read_at,created_at from notifications where user_id=$1 or user_id is null order by created_at desc limit 100', [req.user.sub])).rows));
router.post('/notifications/:id/read', async (req, res) => { if (!isId(req.params.id)) return bad(res, 'Invalid id'); await db.query('update notifications set read_at=now() where id=$1 and (user_id=$2 or user_id is null)', [req.params.id, req.user.sub]); res.json({ ok: true }); });
module.exports = router;
