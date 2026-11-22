# ClassDesk — Student & Coaching Management

ClassDesk is a Laravel 12 API and React/Vite admin application for managing student admissions, class batches, attendance, exams and marks. The existing Laravel project remains at the repository root (the backend); the standalone React application lives in `frontend/`.

## Requirements

- PHP 8.2+ with `pdo_mysql`, `mbstring`, `fileinfo`, `openssl` and `zip`
- Composer 2
- MySQL 8+ (MariaDB 10.6+ is also suitable)
- Node.js 20.19+ and npm

SQLite is also supported for local development and automated tests.

## Local setup

From the repository root, install the backend dependencies and configure the environment:

```powershell
composer install
Copy-Item .env.example .env
php artisan key:generate
```

Create a MySQL database, then set `DB_CONNECTION=mysql`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME` and `DB_PASSWORD` in `.env`. The database must use `utf8mb4`. Do not commit `.env` or real credentials.

Configure the SPA and session settings in `.env`. For local development, run both applications using the same hostname (`localhost`):

```dotenv
APP_TIMEZONE=Asia/Dhaka
FRONTEND_URL=http://localhost:5173
SANCTUM_STATEFUL_DOMAINS=localhost:5173,localhost:8000
SESSION_DOMAIN=localhost
SESSION_SECURE_COOKIE=false
```

For an HTTPS deployment, use the production frontend origin, include its host in `SANCTUM_STATEFUL_DOMAINS`, and set `SESSION_SECURE_COOKIE=true`. Keep the frontend and API on the same site for Sanctum's session-cookie authentication and CSRF protection.

Run the migrations and create the first administrator interactively:

```powershell
php artisan migrate
php artisan admin:create
php artisan storage:link
```

The `admin:create` command asks for an email and a password of at least 12 characters. There is no public registration endpoint.

Install and run the React application in a second terminal:

```powershell
Set-Location frontend
Copy-Item .env.example .env
npm.cmd install
npm.cmd run dev
```

Run Laravel in the first terminal:

```powershell
php artisan serve --host=localhost --port=8000
```

Open `http://localhost:5173`. Sign in with the administrator account created above. The frontend reads the API origin from `frontend/.env` (`VITE_API_URL=http://localhost:8000`).

## Optional fictional demo records

Demo data is not loaded by default. To create the demo administrator and sample records, set a unique local-only email and a strong password in `.env`:

```dotenv
DEMO_ADMIN_EMAIL=demo-admin@example.test
DEMO_ADMIN_PASSWORD=replace-with-a-unique-12-character-password
```

Then run:

```powershell
php artisan db:seed --class=DemoSeeder
```

The demo seeder refuses to run when `APP_ENV=production`. It creates five batches, sample schedules, twenty fictional students, enrollments, attendance, exams and marks.

## Tests and production build

```powershell
php artisan test
Set-Location frontend
npm.cmd run build
```

Laravel's feature tests use an in-memory SQLite database, so they do not alter the configured development or production database.

## Implemented workflows

- Administrator login/logout, profile updates and password changes using Sanctum stateful sessions, CSRF cookies, role checks and login throttling.
- Student admission, generated immutable `STD-000001`-style rolls, search, class/batch/status filters, pagination, profile, photo upload, parent details, deactivation/restoration and batch assignment.
- Batch CRUD, weekly schedule validation, active enrollment counts and enrollment history; ending an enrollment preserves its academic records.
- Batch/date attendance sessions with unique constraints, unmarked defaults, edit-in-place records, filters and attendance summaries. The attendance rate is `(present + late) / (present + absent + late) × 100`; excused and unmarked records are excluded.
- Exams assigned to multiple batches, bulk marks entry, absent-vs-zero handling and one authoritative result per student/exam. Marks are constrained to `0..total_marks`; the percentage is `obtained / total × 100`.
- Database-backed dashboard statistics, student CSV exports, attendance/exam reports, coaching settings and administrator profile/password forms.
- Monthly batch-fee invoices with a saved fee snapshot, paid/partial/unpaid tracking, payment history, batch/month filters and dashboard income charts. Income analytics count received payments by their actual payment date; changing a batch fee does not rewrite existing invoices.

All student and parent information is available only through administrator-authenticated endpoints. Normal API routes do not permanently delete students, batches, exams or academic records.

## Deployment notes

Build the frontend with `npm run build` in `frontend/` and serve its generated `dist/` directory as the SPA. Serve Laravel from its `public/` directory and configure the frontend API origin and Laravel CORS/Sanctum stateful domains for the deployed site. Set `APP_DEBUG=false`, use HTTPS, set `SESSION_SECURE_COOKIE=true`, configure a private writable `storage/` directory, and provision a backed-up MySQL database. Use a dedicated, least-privileged database account and never seed demo credentials in production.

Monthly invoices are generated idempotently for enrolled students in batches with a fee greater than zero. The scheduler generates invoices on the first day of each month; ensure Laravel's scheduler is running in production by adding its standard once-per-minute `schedule:run` cron entry (for example, `* * * * * cd /path/to/app && php artisan schedule:run >> /dev/null 2>&1`). To backfill another billing month manually, run `php artisan fees:generate --month=YYYY-MM` (for example, `php artisan fees:generate --month=2026-10`). Partial payments are supported, but payments cannot exceed an invoice balance. Dashboard income is based on recorded payment dates, not invoice months.
