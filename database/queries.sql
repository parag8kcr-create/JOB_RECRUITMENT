-- Useful PostgreSQL queries for DBMS assignment

-- 1. Display all open jobs
SELECT * FROM job_listings WHERE status = 'open';

-- 2. Search jobs by title
SELECT * FROM job_listings WHERE title ILIKE '%developer%';

-- 3. Show jobs with company names (INNER JOIN)
SELECT j.title, c.company_name, j.location
FROM jobs j INNER JOIN companies c ON c.company_id = j.company_id;

-- 4. Show all jobs and application counts (LEFT JOIN)
SELECT j.title, COUNT(a.application_id) AS applicants
FROM jobs j LEFT JOIN applications a ON a.job_id = j.job_id
GROUP BY j.job_id, j.title;

-- 5. Count users by role
SELECT role, COUNT(*) FROM users GROUP BY role;

-- 6. Jobs having more than one application (HAVING)
SELECT job_id, COUNT(*) FROM applications
GROUP BY job_id HAVING COUNT(*) > 1;

-- 7. Display applicant application history
SELECT u.full_name, j.title, a.status, a.applied_at
FROM applications a
JOIN users u ON u.user_id = a.applicant_id
JOIN jobs j ON j.job_id = a.job_id;

-- 8. Find pending applications
SELECT * FROM applications WHERE status = 'pending';

-- 9. Update an application status
UPDATE applications SET status = 'shortlisted', updated_at = CURRENT_TIMESTAMP
WHERE application_id = 1;

-- 10. Count applications by status
SELECT status, COUNT(*) FROM applications GROUP BY status;

-- 11. Find jobs with maximum salary above 50000
SELECT title, salary_max FROM jobs WHERE salary_max > 50000;

-- 12. Subquery: applicants who have applied for at least one job
SELECT full_name FROM users
WHERE user_id IN (SELECT applicant_id FROM applications);

-- 13. Aggregate: average maximum salary
SELECT AVG(salary_max) AS average_max_salary FROM jobs;

-- 14. Display notification list
SELECT * FROM notifications ORDER BY created_at DESC;

-- 15. View recruitment statistics
SELECT * FROM application_statistics;
