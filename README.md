# Job Recruitment Management System

College assignment project using **HTML, CSS, React, Node.js, Express and PostgreSQL**.

## Requirements
- Node.js 18+
- PostgreSQL + pgAdmin 4
- VS Code

## 1. Create the PostgreSQL database
Open pgAdmin → Servers → PostgreSQL → Databases → right-click → Create → Database.
Name it: `job_recruitment_db`

Open Query Tool for this database and execute `database/schema.sql`.

## 2. Configure the backend
Open a terminal in VS Code:

```bash
cd backend
npm install
```

Copy `.env.example` to `.env` and update `DB_PASSWORD` to your PostgreSQL password.

Windows PowerShell:
```powershell
Copy-Item .env.example .env
```

Run the demo data seeder:
```bash
npm run seed
```

Start backend:
```bash
npm run dev
```

Backend runs at http://localhost:5000

## 3. Start the frontend
Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite (usually http://localhost:5173).

## Demo accounts
After running `npm run seed`:

| Role | Email | Password |
|---|---|---|
| Admin | admin@demo.com | Admin@123 |
| Recruiter | recruiter@demo.com | Recruiter@123 |
| Applicant | applicant@demo.com | Applicant@123 |

## Main demo flow
1. Sign in as recruiter and create a job.
2. Sign out and sign in as applicant.
3. Open Jobs and apply.
4. Sign out and sign in as recruiter.
5. Open Applications and change the status.
6. Sign in as applicant again and see the updated status.

## Notes
- PostgreSQL is the real database. The frontend does not use fake local job/application data.
- Passwords are hashed with bcrypt.
- JWT authentication and role checks protect API routes.
- SQL is parameterized using `pg`.
- Resume details are stored as text/profile information for a simple college demo. This version does not upload PDF files.
