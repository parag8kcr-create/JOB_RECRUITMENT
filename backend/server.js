require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./config/db');
const { authenticate, allowRoles } = require('./middleware/auth');

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Database connection failed', detail: err.message });
  }
});

// Register applicant or recruiter
app.post('/api/auth/register', async (req, res) => {
  const { full_name, email, password, role, company_name } = req.body;
  if (!full_name || !email || !password || !['applicant', 'recruiter'].includes(role)) {
    return res.status(400).json({ message: 'Please complete all required fields.' });
  }
  if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const hash = await bcrypt.hash(password, 10);
    const result = await client.query(
      'INSERT INTO users(full_name,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING user_id,full_name,email,role',
      [full_name.trim(), email.toLowerCase().trim(), hash, role]
    );
    if (role === 'recruiter') {
      await client.query(
        'INSERT INTO companies(recruiter_id,company_name) VALUES($1,$2)',
        [result.rows[0].user_id, company_name || `${full_name}'s Company`]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ message: 'Account created successfully. Please sign in.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(err.code === '23505' ? 409 : 500).json({ message: err.code === '23505' ? 'Email already registered.' : 'Registration failed.' });
  } finally { client.release(); }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email=$1 AND is_active=TRUE', [(email || '').toLowerCase().trim()]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password || '', user.password_hash))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    const payload = { user_id: user.user_id, full_name: user.full_name, email: user.email, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: payload });
  } catch (err) { res.status(500).json({ message: 'Login failed.' }); }
});

app.get('/api/auth/me', authenticate, (req, res) => res.json({ user: req.user }));

// Public jobs list and details
app.get('/api/jobs', async (req, res) => {
  try {
    const search = `%${req.query.search || ''}%`;
    const result = await pool.query(
      `SELECT * FROM job_listings WHERE status='open'
       AND (title ILIKE $1 OR company_name ILIKE $1 OR location ILIKE $1)
       ORDER BY posted_at DESC`, [search]);
    res.json(result.rows);
  } catch { res.status(500).json({ message: 'Could not load jobs.' }); }
});

app.get('/api/jobs/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM job_listings WHERE job_id=$1', [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ message: 'Job not found.' });
    res.json(result.rows[0]);
  } catch { res.status(500).json({ message: 'Could not load job.' }); }
});

// Recruiter creates job
app.post('/api/jobs', authenticate, allowRoles('recruiter'), async (req, res) => {
  const { title, description, requirements, location, employment_type, experience_required, salary_min, salary_max } = req.body;
  if (!title || !description || !location) return res.status(400).json({ message: 'Title, description and location are required.' });
  try {
    const company = await pool.query('SELECT company_id FROM companies WHERE recruiter_id=$1', [req.user.user_id]);
    if (!company.rowCount) return res.status(400).json({ message: 'Create a company profile first.' });
    const result = await pool.query(
      `INSERT INTO jobs(company_id,title,description,requirements,location,employment_type,experience_required,salary_min,salary_max)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [company.rows[0].company_id,title,description,requirements || '',location,employment_type || 'Full-time',experience_required || 'Fresher',salary_min || null,salary_max || null]);
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: 'Could not create job.' }); }
});

app.get('/api/recruiter/jobs', authenticate, allowRoles('recruiter'), async (req, res) => {
  const result = await pool.query(
    `SELECT j.*, c.company_name FROM jobs j JOIN companies c ON c.company_id=j.company_id
     WHERE c.recruiter_id=$1 ORDER BY j.posted_at DESC`, [req.user.user_id]);
  res.json(result.rows);
});

app.delete('/api/jobs/:id', authenticate, allowRoles('recruiter'), async (req, res) => {
  const result = await pool.query(
    `DELETE FROM jobs j USING companies c WHERE j.company_id=c.company_id
     AND c.recruiter_id=$1 AND j.job_id=$2 RETURNING j.job_id`,
    [req.user.user_id, req.params.id]);
  if (!result.rowCount) return res.status(404).json({ message: 'Job not found or not yours.' });
  res.json({ message: 'Job deleted.' });
});

// Applications
app.post('/api/applications', authenticate, allowRoles('applicant'), async (req, res) => {
  const { job_id, cover_letter } = req.body;
  try {
    const job = await pool.query("SELECT job_id FROM jobs WHERE job_id=$1 AND status='open'", [job_id]);
    if (!job.rowCount) return res.status(404).json({ message: 'This job is no longer open.' });
    const resume = await pool.query('SELECT resume_id FROM resumes WHERE applicant_id=$1', [req.user.user_id]);
    const result = await pool.query(
      `INSERT INTO applications(job_id,applicant_id,resume_id,cover_letter)
       VALUES($1,$2,$3,$4) RETURNING *`,
      [job_id, req.user.user_id, resume.rows[0]?.resume_id || null, cover_letter || '']);
    res.status(201).json({ message: 'Application submitted successfully.', application: result.rows[0] });
  } catch (err) {
    res.status(err.code === '23505' ? 409 : 500).json({ message: err.code === '23505' ? 'You have already applied for this job.' : 'Could not submit application.' });
  }
});

app.get('/api/applications/mine', authenticate, allowRoles('applicant'), async (req, res) => {
  const result = await pool.query(
    `SELECT a.*, j.title, j.location, c.company_name
     FROM applications a JOIN jobs j ON j.job_id=a.job_id
     JOIN companies c ON c.company_id=j.company_id
     WHERE a.applicant_id=$1 ORDER BY a.applied_at DESC`, [req.user.user_id]);
  res.json(result.rows);
});

app.get('/api/recruiter/applications', authenticate, allowRoles('recruiter'), async (req, res) => {
  const result = await pool.query(
    `SELECT a.*, u.full_name AS applicant_name, u.email AS applicant_email,
            j.title AS job_title, c.company_name
     FROM applications a JOIN users u ON u.user_id=a.applicant_id
     JOIN jobs j ON j.job_id=a.job_id JOIN companies c ON c.company_id=j.company_id
     WHERE c.recruiter_id=$1 ORDER BY a.applied_at DESC`, [req.user.user_id]);
  res.json(result.rows);
});

app.patch('/api/applications/:id/status', authenticate, allowRoles('recruiter'), async (req, res) => {
  const allowed = ['pending','shortlisted','accepted','rejected'];
  const { status } = req.body;
  if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status.' });
  const result = await pool.query(
    `UPDATE applications a SET status=$1, updated_at=CURRENT_TIMESTAMP
     FROM jobs j, companies c
     WHERE a.job_id=j.job_id AND j.company_id=c.company_id
       AND c.recruiter_id=$2 AND a.application_id=$3
     RETURNING a.*`, [status, req.user.user_id, req.params.id]);
  if (!result.rowCount) return res.status(404).json({ message: 'Application not found.' });
  res.json({ message: 'Application status updated.', application: result.rows[0] });
});

// Resume/profile details
app.get('/api/resume', authenticate, allowRoles('applicant'), async (req, res) => {
  const result = await pool.query('SELECT * FROM resumes WHERE applicant_id=$1', [req.user.user_id]);
  res.json(result.rows[0] || {});
});

app.put('/api/resume', authenticate, allowRoles('applicant'), async (req, res) => {
  const { education, skills, experience } = req.body;
  const result = await pool.query(
    `INSERT INTO resumes(applicant_id,education,skills,experience)
     VALUES($1,$2,$3,$4)
     ON CONFLICT(applicant_id) DO UPDATE SET education=EXCLUDED.education,
     skills=EXCLUDED.skills, experience=EXCLUDED.experience, updated_at=CURRENT_TIMESTAMP
     RETURNING *`,
    [req.user.user_id, education || '', skills || '', experience || '']);
  res.json({ message: 'Profile saved.', resume: result.rows[0] });
});

// Admin dashboard and user list
app.get('/api/admin/summary', authenticate, allowRoles('admin'), async (_req, res) => {
  const result = await pool.query(
    `SELECT (SELECT COUNT(*) FROM users) AS users,
            (SELECT COUNT(*) FROM jobs) AS jobs,
            (SELECT COUNT(*) FROM applications) AS applications,
            (SELECT COUNT(*) FROM users WHERE role='recruiter') AS recruiters`);
  res.json(result.rows[0]);
});

app.get('/api/admin/users', authenticate, allowRoles('admin'), async (_req, res) => {
  const result = await pool.query('SELECT user_id,full_name,email,role,is_active,created_at FROM users ORDER BY created_at DESC');
  res.json(result.rows);
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Unexpected server error.' });
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Backend running at http://localhost:${port}`));
