require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

async function seed() {
  const client = await pool.connect();
  try {
    const accounts = [
      ['Demo Admin','admin@demo.com','Admin@123','admin'],
      ['Demo Recruiter','recruiter@demo.com','Recruiter@123','recruiter'],
      ['Demo Applicant','applicant@demo.com','Applicant@123','applicant']
    ];
    const ids = {};
    for (const [name,email,password,role] of accounts) {
      const hash = await bcrypt.hash(password, 10);
      const result = await client.query(
        `INSERT INTO users(full_name,email,password_hash,role)
         VALUES($1,$2,$3,$4)
         ON CONFLICT(email) DO UPDATE SET full_name=EXCLUDED.full_name
         RETURNING user_id`, [name,email,hash,role]);
      ids[role] = result.rows[0].user_id;
    }
    const companyResult = await client.query(
      `INSERT INTO companies(recruiter_id,company_name,industry,description,location)
       VALUES($1,'BrightHire Technologies','Information Technology','A growing technology company hiring fresh talent.','Gurugram')
       ON CONFLICT DO NOTHING RETURNING company_id`, [ids.recruiter]);
    let companyId = companyResult.rows[0]?.company_id;
    if (!companyId) {
      const existing = await client.query('SELECT company_id FROM companies WHERE recruiter_id=$1 LIMIT 1',[ids.recruiter]);
      companyId = existing.rows[0].company_id;
    }
    const count = await client.query('SELECT COUNT(*) FROM jobs WHERE company_id=$1',[companyId]);
    if (Number(count.rows[0].count) === 0) {
      await client.query(
        `INSERT INTO jobs(company_id,title,description,requirements,location,employment_type,experience_required,salary_min,salary_max)
         VALUES
         ($1,'Frontend Developer','Build responsive web interfaces using React and CSS.','HTML, CSS, JavaScript, React','Gurugram','Full-time','Fresher',25000,45000),
         ($1,'Junior Node.js Developer','Work with APIs and PostgreSQL databases.','JavaScript, Node.js, Express, SQL','Delhi','Full-time','0-1 year',30000,50000),
         ($1,'UI/UX Design Intern','Help design clean and accessible digital products.','Figma, wireframing, design basics','Remote','Internship','Fresher',10000,18000)`, [companyId]);
    }
    console.log('Demo data ready.');
    console.log('Admin: admin@demo.com / Admin@123');
    console.log('Recruiter: recruiter@demo.com / Recruiter@123');
    console.log('Applicant: applicant@demo.com / Applicant@123');
  } finally { client.release(); await pool.end(); }
}
seed().catch(err => { console.error(err); process.exit(1); });
