-- Job Recruitment Management System
-- Run this script inside database job_recruitment_db using pgAdmin Query Tool.

CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL CHECK (role IN ('applicant', 'recruiter', 'admin')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS companies (
    company_id SERIAL PRIMARY KEY,
    recruiter_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    company_name VARCHAR(150) NOT NULL,
    industry VARCHAR(100),
    description TEXT,
    location VARCHAR(150),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobs (
    job_id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT,
    location VARCHAR(150) NOT NULL,
    employment_type VARCHAR(40) NOT NULL DEFAULT 'Full-time',
    experience_required VARCHAR(80) DEFAULT 'Fresher',
    salary_min NUMERIC(12,2),
    salary_max NUMERIC(12,2),
    vacancies INTEGER NOT NULL DEFAULT 1 CHECK (vacancies > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    deadline DATE,
    posted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS resumes (
    resume_id SERIAL PRIMARY KEY,
    applicant_id INTEGER NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    education TEXT,
    skills TEXT,
    experience TEXT,
    resume_url TEXT,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS applications (
    application_id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES jobs(job_id) ON DELETE CASCADE,
    applicant_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    resume_id INTEGER REFERENCES resumes(resume_id) ON DELETE SET NULL,
    cover_letter TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'shortlisted', 'accepted', 'rejected', 'withdrawn')),
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_job_applicant UNIQUE(job_id, applicant_id)
);

CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_jobs_title ON jobs(title);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(location);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_applications_applicant ON applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);

CREATE OR REPLACE VIEW job_listings AS
SELECT j.job_id, j.title, j.description, j.requirements, j.location,
       j.employment_type, j.experience_required, j.salary_min, j.salary_max,
       j.vacancies, j.status, j.deadline, j.posted_at,
       c.company_id, c.company_name, c.industry
FROM jobs j
JOIN companies c ON c.company_id = j.company_id;

CREATE OR REPLACE VIEW application_statistics AS
SELECT j.job_id, j.title,
       COUNT(a.application_id) AS total_applications,
       COUNT(*) FILTER (WHERE a.status = 'pending') AS pending_applications,
       COUNT(*) FILTER (WHERE a.status = 'shortlisted') AS shortlisted_applications,
       COUNT(*) FILTER (WHERE a.status = 'accepted') AS accepted_applications
FROM jobs j
LEFT JOIN applications a ON a.job_id = j.job_id
GROUP BY j.job_id, j.title;
