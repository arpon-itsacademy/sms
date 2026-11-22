import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Activity, ArrowDownToLine, ArrowLeft, BookOpen, CalendarCheck, CalendarDays, ChartNoAxesCombined,
  Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, ClipboardList, CreditCard, Eye, EyeOff, GraduationCap, LayoutDashboard,
  LogOut, Menu, MessageSquare, Plus, RefreshCw, Search, Send, Settings, ShieldCheck, SlidersHorizontal, Sparkles, Trash2, UserPlus, Users, X,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, API_ORIGIN, messageFromError, responseData, startSession } from './api.js';

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dateToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
const fmtDate = (value) => value ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtTime = (value) => value ? new Date(`1970-01-01T${value}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
const initials = (name = '') => name.split(' ').slice(0, 2).map((word) => word[0]).join('').toUpperCase();

function useToast() {
  const [toast, setToast] = useState(null);
  const notify = (message, kind = 'success') => {
    setToast({ message, kind });
    window.setTimeout(() => setToast(null), 3500);
  };
  return { toast, notify };
}

function App() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState({
    User: location.pathname.startsWith('/users'),
    Settings: location.pathname.startsWith('/settings'),
  });

  useEffect(() => {
    if (location.pathname.startsWith('/users')) {
      setOpenMenus((prev) => ({ ...prev, User: true }));
    }
    if (location.pathname.startsWith('/settings')) {
      setOpenMenus((prev) => ({ ...prev, Settings: true }));
    }
  }, [location.pathname]);

  const getBreadcrumbTitle = (path) => {
    if (path === '/') return 'Dashboard';
    if (path === '/students') return 'Students';
    if (path.startsWith('/students/')) return 'Student profile';
    if (path === '/batches') return 'Batches';
    if (path.startsWith('/batches/')) return 'Batch details';
    if (path === '/attendance') return 'Attendance';
    if (path === '/fees') return 'Fees & income';
    if (path === '/exams') return 'Exams & results';
    if (path.includes('/marks')) return 'Marks entry';
    if (path === '/results') return 'Results';
    if (path === '/reports') return 'Reports';
    if (path === '/users') return 'All User';
    if (path === '/users/create') return 'Create New User';
    if (path === '/settings') return 'Settings';
    if (path === '/settings/sms') return 'BulkSMSBD Configuration';
    return 'Workspace';
  };

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/auth/me')).data.user,
    retry: false,
  });
  const { data: brandSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get('/settings')).data.settings,
    enabled: Boolean(user),
  });
  const logout = useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSuccess: () => {
      queryClient.clear();
      window.location.assign('/login');
    },
  });
  const links = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/students', label: 'Students', icon: Users },
    { to: '/batches', label: 'Batches', icon: BookOpen },
    { to: '/attendance', label: 'Attendance', icon: CalendarCheck },
    { to: '/fees', label: 'Fees & income', icon: CreditCard },
    { to: '/exams', label: 'Exams & results', icon: ClipboardList },
    { to: '/reports', label: 'Reports', icon: ChartNoAxesCombined },
    {
      label: 'User',
      icon: ShieldCheck,
      sublinks: [
        { to: '/users/create', label: 'Create New User', icon: UserPlus },
        { to: '/users', label: 'All User', icon: Users, end: true },
      ],
    },
    {
      label: 'Settings',
      icon: Settings,
      sublinks: [
        { to: '/settings', label: 'General Settings', icon: SlidersHorizontal, end: true },
        { to: '/settings/sms', label: 'BulkSMSBD Config', icon: MessageSquare },
      ],
    },
  ];

  if (location.pathname === '/login') return <Login />;
  if (isLoading) return <div className="splash"><div className="brand-mark"><GraduationCap /></div><p>Opening your workspace…</p></div>;
  if (isError || !user) return <Navigate to="/login" replace />;

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <Link to="/" className="brand">
          <span className="brand-mark">{brandSettings?.logo_url ? <img src={brandSettings.logo_url} alt="" /> : <GraduationCap size={24} />}</span>
          <span className="brand-copy"><strong>{brandSettings?.institution_name || 'ClassDesk'}</strong><small>COACHING MANAGER</small></span>
        </Link>
        <div className="workspace-tag">WORKSPACE</div>
        <nav className="side-nav">
          {links.map((item) => {
            if (item.sublinks) {
              const isMenuOpen = Boolean(openMenus[item.label]);
              const isGroupActive = item.sublinks.some((sub) => sub.end ? location.pathname === sub.to : location.pathname.startsWith(sub.to));
              return (
                <div key={item.label} className="nav-group">
                  <button
                    type="button"
                    className={`nav-group-trigger ${isGroupActive ? 'active-parent' : ''}`}
                    onClick={() => {
                      if (collapsed) setCollapsed(false);
                      setOpenMenus((prev) => ({ ...prev, [item.label]: !prev[item.label] }));
                    }}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon size={19} strokeWidth={1.8} />
                    <span>{item.label}</span>
                    <ChevronDown size={14} className={`nav-arrow ${isMenuOpen ? 'rotated' : ''}`} />
                  </button>
                  {isMenuOpen && !collapsed && (
                    <div className="nav-sub">
                      {item.sublinks.map((sub) => (
                        <NavLink
                          key={sub.to}
                          to={sub.to}
                          end={sub.end}
                          onClick={() => setMobileOpen(false)}
                          className={({ isActive }) => `nav-sub-link ${isActive ? 'active' : ''}`}
                          title={sub.label}
                        >
                          <sub.icon size={14} strokeWidth={1.8} />
                          <span>{sub.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setMobileOpen(false)} title={collapsed ? item.label : undefined}>
                <item.icon size={19} strokeWidth={1.8} /><span>{item.label}</span>{item.label === 'Students' && <span className="nav-dot" />}
              </NavLink>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card"><div className="help-icon"><CircleHelp size={17} /></div><strong>Need a hand?</strong><span>Visit the quick guide for help getting started.</span><button onClick={() => window.open('https://laravel.com/docs', '_blank')}>Open quick guide <ChevronRight size={14} /></button></div>
          <div className="sidebar-user"><span className="avatar avatar-small">{initials(user.name)}</span><span className="sidebar-user-copy"><strong>{user.name}</strong><small>Administrator</small></span><button className="icon-button" aria-label="Sign out" onClick={() => logout.mutate()}><LogOut size={17} /></button></div>
        </div>
      </aside>
      {mobileOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button menu-toggle" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
            <button className="icon-button collapse-toggle" onClick={() => setCollapsed(!collapsed)} aria-label="Collapse sidebar"><ChevronLeft size={18} /></button>
            <div><div className="breadcrumbs"><span>Workspace</span><ChevronRight size={13} /><strong>{getBreadcrumbTitle(location.pathname)}</strong></div><h1>{getBreadcrumbTitle(location.pathname)}</h1></div>
          </div>
          <div className="topbar-actions">
            <GlobalSearch />
            <span className="topbar-divider" />
            <span className="topbar-profile"><span className="avatar avatar-small">{initials(user.name)}</span><span><strong>{user.name}</strong><small>Admin</small></span><ChevronDown size={15} /></span>
          </div>
        </header>
        <div className="page-container">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/students" element={<Students />} />
            <Route path="/students/:id" element={<StudentProfile />} />
            <Route path="/batches" element={<Batches />} />
            <Route path="/batches/:id" element={<BatchDetails />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/fees" element={<FeesPage />} />
            <Route path="/exams" element={<Exams />} />
            <Route path="/exams/:id/marks" element={<MarksEntry />} />
            <Route path="/results" element={<Results />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/users" element={<AllUsers currentUser={user} />} />
            <Route path="/users/create" element={<CreateUser />} />
            <Route path="/settings" element={<SettingsPage user={user} />} />
            <Route path="/settings/sms" element={<BulkSmsSettings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function Login() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const schema = z.object({ email: z.string().email('Enter a valid email address.'), password: z.string().min(1, 'Password is required.') });
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });
  const submit = handleSubmit(async (values) => {
    setError('');
    try {
      await startSession(values.email, values.password);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      navigate('/');
    } catch (reason) { setError(messageFromError(reason)); }
  });
  return <div className="login-screen">
    <div className="login-decoration"><div className="login-orb orb-one" /><div className="login-orb orb-two" /><div className="login-feature"><div className="brand-mark"><GraduationCap /></div><span className="eyebrow">YOUR COACHING, IN SYNC</span><h2>Make room for<br />better learning.</h2><p>A calm, clear workspace for managing students, classes and academic progress.</p><div className="login-checks"><span><Check size={15} /> One connected workspace</span><span><Check size={15} /> Clear student progress</span></div></div></div>
    <div className="login-panel"><div className="login-form-wrap"><div className="brand-mark"><GraduationCap /></div><div className="eyebrow">ADMINISTRATOR ACCESS</div><h1>Welcome back</h1><p className="muted">Sign in to continue to your workspace.</p>
      {error && <div className="form-alert">{error}</div>}
      <form onSubmit={submit} className="form-stack">
        <label>Email address<input type="email" autoComplete="username" placeholder="admin@example.com" {...register('email')} />{errors.email && <span className="field-error">{errors.email.message}</span>}</label>
        <label>Password<input type="password" autoComplete="current-password" placeholder="Enter your password" {...register('password')} />{errors.password && <span className="field-error">{errors.password.message}</span>}</label>
        <button className="button button-primary button-wide" disabled={isSubmitting}>{isSubmitting ? 'Signing in…' : 'Sign in'}<ChevronRight size={17} /></button>
      </form><p className="login-foot">Accounts are created securely by your system administrator.</p></div></div>
  </div>;
}

function GlobalSearch() {
  const [term, setTerm] = useState('');
  const navigate = useNavigate();
  return <form className="global-search" onSubmit={(event) => { event.preventDefault(); navigate(`/students?q=${encodeURIComponent(term)}`); }}>
    <Search size={16} /><input placeholder="Search students…" value={term} onChange={(event) => setTerm(event.target.value)} aria-label="Search students" /><kbd>⌘ K</kbd>
  </form>;
}

function PageHeading({ eyebrow, title, subtitle, action }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}

function StatCard({ label, value, detail, icon: Icon, tone = 'blue' }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={19} /></div><div className="stat-label">{label}</div><strong className="stat-value">{value ?? '—'}</strong><div className="stat-detail">{detail}</div></div>;
}

function Dashboard() {
  const [incomeYear, setIncomeYear] = useState(String(new Date().getFullYear()));
  const [incomeBatch, setIncomeBatch] = useState('');
  const { data, isLoading, isError } = useQuery({ queryKey: ['dashboard'], queryFn: async () => (await api.get('/dashboard/summary')).data });
  const { data: income } = useQuery({
    queryKey: ['dashboard-income', incomeYear, incomeBatch],
    queryFn: async () => (await api.get('/dashboard/income', { params: { year: incomeYear, batch_id: incomeBatch || undefined } })).data,
  });
  const { data: batches } = useQuery({
    queryKey: ['batches', 'income-filter'],
    queryFn: async () => (await api.get('/batches', { params: { per_page: 100 } })).data.data,
  });
  if (isLoading) return <LoadingPage />;
  if (isError) return <ErrorPage />;
  const summary = data.summary;
  return <>
    <div className="welcome-banner"><div><div className="banner-eyebrow"><Sparkles size={14} /> YOUR COACHING AT A GLANCE</div><h2>A better day starts with clarity.</h2><p>Here’s what’s happening across your coaching today.</p></div><div className="banner-date"><CalendarDays size={17} />{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Dhaka' })}</div><div className="banner-decoration" /></div>
    <div className="stat-grid">
      <StatCard label="Total students" value={summary.total_students} detail="All student records" icon={Users} />
      <StatCard label="Active students" value={summary.active_students} detail="Currently studying" icon={GraduationCap} tone="green" />
      <StatCard label="Active batches" value={summary.active_batches} detail="Available class groups" icon={BookOpen} tone="violet" />
      <StatCard label="Today's classes" value={summary.today_classes} detail="Across your weekly schedule" icon={CalendarCheck} tone="amber" />
      <StatCard label="Total exams" value={summary.total_exams} detail="Assessments created" icon={ClipboardList} tone="violet" />
      <StatCard label="Attendance today" value={`${summary.attendance_rate}%`} detail="Present and late / marked" icon={Activity} tone="green" />
    </div>
    <div className="dashboard-grid">
      <section className="card chart-card"><div className="card-heading"><div><h3>Attendance overview</h3><p>Daily attendance · last 7 days</p></div><span className="pill pill-blue">This week</span></div>
        <div className="chart-wrap">{data.attendance_week.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={data.attendance_week} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}><defs><linearGradient id="presentFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4c7df0" stopOpacity={0.2} /><stop offset="100%" stopColor="#4c7df0" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#eef1f6" vertical={false} /><XAxis dataKey="date" tickFormatter={(value) => new Date(`${value}T00:00:00`).toLocaleDateString('en', { weekday: 'short' })} axisLine={false} tickLine={false} tick={{ fill: '#8490a3', fontSize: 12 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#8490a3', fontSize: 11 }} allowDecimals={false} /><Tooltip /><Area type="monotone" dataKey="present" name="Present" stroke="#4c7df0" strokeWidth={2.5} fill="url(#presentFill)" /><Area type="monotone" dataKey="late" name="Late" stroke="#35b78a" strokeWidth={2} fill="transparent" /></AreaChart></ResponsiveContainer> : <EmptyState title="No attendance yet" text="Saved attendance will appear here." />}</div>
      </section>
      <section className="card schedule-card"><div className="card-heading"><div><h3>Today’s schedule</h3><p>{data.today_schedule.length} classes scheduled today</p></div><Link className="text-link" to="/attendance">Take attendance <ChevronRight size={15} /></Link></div>
        <div className="schedule-list">{data.today_schedule.length ? data.today_schedule.map((item) => <div className="schedule-row" key={`${item.id}-${item.start_time}`}><span className="schedule-time">{fmtTime(item.start_time)}<small>{fmtTime(item.end_time)}</small></span><span className="schedule-line" /><span className="schedule-info"><strong>{item.name}</strong><small>{item.subject || 'General class'}</small></span></div>) : <EmptyState title="A clear calendar" text="No classes are scheduled for today." />}</div>
      </section>
      <section className="card table-card"><div className="card-heading"><div><h3>Recent admissions</h3><p>Your newest students</p></div><Link className="text-link" to="/students">View all <ChevronRight size={15} /></Link></div>
        {data.recent_students.length ? <div className="compact-list">{data.recent_students.map((student) => <Link to={`/students/${student.id}`} className="compact-row" key={student.id}><StudentAvatar student={student} /><span className="compact-main"><strong>{student.name}</strong><small>{student.roll_number} · Class {student.class_level}</small></span><span className="compact-date">{fmtDate(student.admission_date)}</span></Link>)}</div> : <EmptyState title="No students yet" text="Admit your first student to see activity here." action={<Link className="button button-primary button-small" to="/students">Admit a student</Link>} />}
      </section>
      <section className="card table-card"><div className="card-heading"><div><h3>Recent exams</h3><p>Recently scheduled assessments</p></div><Link className="text-link" to="/exams">View exams <ChevronRight size={15} /></Link></div>
        {data.recent_exams.length ? <div className="compact-list">{data.recent_exams.map((exam) => <Link to={`/exams/${exam.id}/marks`} className="compact-row" key={exam.id}><span className="batch-mini-icon"><ClipboardList size={16} /></span><span className="compact-main"><strong>{exam.title}</strong><small>{exam.subject} · {exam.total_marks} marks</small></span><span className="compact-date">{fmtDate(exam.exam_date)}</span></Link>)}</div> : <EmptyState title="No exams yet" text="Created exams will show up here." action={<Link className="button button-outline button-small" to="/exams">Create an exam</Link>} />}
      </section>
      <section className="card table-card"><div className="card-heading"><div><h3>Batch overview</h3><p>Active class groups</p></div><Link className="text-link" to="/batches">Manage batches <ChevronRight size={15} /></Link></div>
        {data.batch_overview.length ? <div className="batch-overview-list">{data.batch_overview.map((batch) => <Link to={`/batches/${batch.id}`} className="batch-overview-row" key={batch.id}><span className="batch-mini-icon"><BookOpen size={16} /></span><span><strong>{batch.name}</strong><small>{batch.subject || 'General'}</small></span><b>{batch.students_count}<small> students</small></b></Link>)}</div> : <EmptyState title="No batches yet" text="Create a batch to organize your classes." />}
      </section>
    </div>
    <section className="card income-analytics">
      <div className="income-heading"><div><div className="eyebrow">FEE COLLECTION</div><h3>Income analytics</h3><p>Income is counted when a payment is recorded.</p></div><div className="income-filters"><select aria-label="Filter income by year" value={incomeYear} onChange={(event) => setIncomeYear(event.target.value)}>{Array.from({ length: 6 }, (_, index) => String(new Date().getFullYear() - index)).map((year) => <option key={year} value={year}>{year}</option>)}</select><select aria-label="Filter income by batch" value={incomeBatch} onChange={(event) => setIncomeBatch(event.target.value)}><option value="">All batches</option>{batches?.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}</select><Link className="button button-primary button-small" to="/fees">Manage fees <ChevronRight size={14} /></Link></div></div>
      {income ? <><div className="income-metrics"><div><small>This month collected</small><strong>৳ {Number(income.month_income).toLocaleString('en-BD', { minimumFractionDigits: 2 })}</strong></div><div><small>{incomeYear} income</small><strong>৳ {Number(income.year_income).toLocaleString('en-BD', { minimumFractionDigits: 2 })}</strong></div><div><small>Total unpaid balance</small><strong>৳ {Number(income.outstanding).toLocaleString('en-BD', { minimumFractionDigits: 2 })}</strong></div></div><div className="income-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={income.monthly_income} margin={{ top: 12, right: 10, left: -8, bottom: 0 }}><defs><linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#35a982" stopOpacity={0.2} /><stop offset="100%" stopColor="#35a982" stopOpacity={0.015} /></linearGradient></defs><CartesianGrid stroke="#eef1f6" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#8490a3', fontSize: 11 }} /><YAxis tickFormatter={(value) => `৳${Number(value).toLocaleString('en-BD')}`} axisLine={false} tickLine={false} tick={{ fill: '#8490a3', fontSize: 10 }} /><Tooltip formatter={(value) => [`৳ ${Number(value).toLocaleString('en-BD', { minimumFractionDigits: 2 })}`, 'Collected']} /><Area type="monotone" dataKey="income" name="Collected" stroke="#35a982" strokeWidth={2.5} fill="url(#incomeFill)" /></AreaChart></ResponsiveContainer></div></> : <div className="income-chart"><LoadingPage /></div>}
    </section>
  </>;
}

function Students() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [term, setTerm] = useState(searchParams.get('q') || '');
  const [status, setStatus] = useState('active');
  const [classLevel, setClassLevel] = useState('');
  const [batchId, setBatchId] = useState('');
  const [modal, setModal] = useState(false);
  const [page, setPage] = useState(1);
  const { toast, notify } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['students', term, status, classLevel, batchId, page],
    queryFn: async () => (await api.get('/students', { params: { q: term || undefined, status, class_level: classLevel || undefined, batch_id: batchId || undefined, page, per_page: 15 } })).data,
  });
  const { data: batches } = useQuery({ queryKey: ['batches', 'filter-options'], queryFn: async () => (await api.get('/batches', { params: { per_page: 100 } })).data.data });
  const statusMutation = useMutation({
    mutationFn: ({ student, next }) => api.patch(`/students/${student.id}/status`, { status: next }),
    onSuccess: (_, vars) => { queryClient.invalidateQueries({ queryKey: ['students'] }); notify(`Student ${vars.next === 'inactive' ? 'deactivated' : 'restored'}.`); },
    onError: (error) => notify(messageFromError(error), 'error'),
  });
  const students = data?.data || [];
  return <>
    <PageHeading eyebrow="STUDENT DIRECTORY" title="Students" subtitle="Keep every learner’s information in one place." action={<button className="button button-primary" onClick={() => setModal(true)}><Plus size={17} /> Admit student</button>} />
    {toast && <Toast toast={toast} />}
    <section className="card data-card">
      <div className="table-toolbar"><div className="toolbar-search"><Search size={16} /><input value={term} onChange={(event) => { setTerm(event.target.value); setPage(1); }} placeholder="Search name, roll, phone or school…" /></div><div className="toolbar-controls"><input className="filter-input" value={classLevel} onChange={(event) => { setClassLevel(event.target.value); setPage(1); }} placeholder="Class / grade" /><select value={batchId} onChange={(event) => { setBatchId(event.target.value); setPage(1); }}><option value="">All batches</option>{batches?.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}</select><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="active">Active students</option><option value="inactive">Inactive students</option></select><span className="result-count">{data?.meta?.total ?? 0} students</span></div></div>
      {isLoading ? <TableSkeleton /> : isError ? <ErrorPage /> : students.length ? <>
        <div className="table-scroll"><table><thead><tr><th>STUDENT</th><th>ROLL NUMBER</th><th>SCHOOL & CLASS</th><th>PHONE</th><th>ASSIGNED BATCHES</th><th>ADMITTED</th><th>STATUS</th><th /></tr></thead><tbody>
          {students.map((student) => <tr key={student.id}><td><Link className="student-cell" to={`/students/${student.id}`}><span className="avatar">{initials(student.name)}</span><span><strong>{student.name}</strong><small>{student.gender ? student.gender[0].toUpperCase() + student.gender.slice(1) : 'Student'}</small></span></Link></td><td><span className="mono">{student.roll_number}</span></td><td><span>{student.school_name}</span><small className="table-sub">Class {student.class_level}</small></td><td>{student.phone || '—'}</td><td><div className="batch-pills">{student.batches?.length ? student.batches.slice(0, 2).map((batch) => <span className="pill" key={batch.id}>{batch.name}</span>) : <span className="table-sub">Unassigned</span>}{student.batches?.length > 2 && <span className="pill">+{student.batches.length - 2}</span>}</div></td><td>{fmtDate(student.admission_date)}</td><td><span className={`status-pill ${student.status}`}>{student.status}</span></td><td><button className="row-action" onClick={() => { if (window.confirm(`${student.status === 'active' ? 'Deactivate' : 'Restore'} ${student.name}?`)) statusMutation.mutate({ student, next: student.status === 'active' ? 'inactive' : 'active' }); }}>{student.status === 'active' ? 'Deactivate' : 'Restore'}</button></td></tr>)}
        </tbody></table></div><Pagination meta={data.meta} page={page} setPage={setPage} />
      </> : <EmptyState title="No students found" text={term ? 'Try another search or clear the filters.' : 'Start by admitting your first student.'} action={<button className="button button-primary button-small" onClick={() => setModal(true)}><Plus size={15} /> Admit student</button>} />}
    </section>
    {modal && <StudentForm onClose={() => setModal(false)} onSaved={(student) => { setModal(false); queryClient.invalidateQueries({ queryKey: ['students'] }); navigate(`/students/${student.id}`, { state: { notice: `${student.name} admitted successfully · ${student.roll_number}` } }); }} />}
  </>;
}

function StudentForm({ student, onClose, onSaved }) {
  const [error, setError] = useState('');
  const defaults = student || { name: '', school_name: '', class_level: '', phone: '', gender: '', date_of_birth: '', father_name: '', father_phone: '', mother_name: '', mother_phone: '', address: '', admission_date: dateToday(), status: 'active', notes: '' };
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ defaultValues: defaults });
  const submit = handleSubmit(async (values) => {
    setError('');
    try {
      let response;
      const hasPhoto = values.photo && values.photo[0] instanceof File;
      if (hasPhoto) {
        const form = new FormData();
        Object.entries(values).forEach(([key, value]) => {
          if (key === 'photo') form.append('photo', value[0]);
          else if (value !== '' && value !== undefined && value !== null) form.append(key, value);
        });
        if (student) {
          form.append('_method', 'PUT');
          response = await api.post(`/students/${student.id}`, form);
        } else {
          response = await api.post('/students', form);
        }
      } else {
        const payload = { ...values };
        delete payload.photo;
        Object.keys(payload).forEach((k) => {
          if (payload[k] === '') payload[k] = null;
        });
        response = student ? await api.put(`/students/${student.id}`, payload) : await api.post('/students', payload);
      }
      onSaved(responseData(response));
    } catch (reason) { setError(messageFromError(reason)); }
  });
  return <Modal title={student ? 'Edit student profile' : 'Admit a student'} onClose={onClose} wide><form className="form-stack" onSubmit={submit}>
    {error && <div className="form-alert">{error}</div>}
    {!student && <div className="info-note">A unique student roll number will be assigned automatically after admission.</div>}
    <div className="form-section-title">Student information</div><div className="form-grid">
      <Field label="Full name" required error={errors.name?.message}><input {...register('name', { required: 'Full name is required.' })} placeholder="Student’s full name" /></Field>
      <Field label="School name" required error={errors.school_name?.message}><input {...register('school_name', { required: 'School is required.' })} /></Field>
      <Field label="Class / grade" required error={errors.class_level?.message}><input {...register('class_level', { required: 'Class is required.' })} placeholder="e.g. 9" /></Field>
      <Field label="Student phone"><input {...register('phone')} placeholder="01XXXXXXXXX" /></Field>
      <Field label="Gender"><select {...register('gender')}><option value="">Not specified</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></Field>
      <Field label="Date of birth"><input type="date" {...register('date_of_birth')} /></Field>
      <Field label="Student photo (optional)"><input type="file" accept="image/jpeg,image/png,image/webp" {...register('photo')} /></Field>
    </div>
    <div className="form-section-title">Parent / guardian (Optional)</div><div className="form-grid">
      <Field label="Father’s name"><input {...register('father_name')} placeholder="Father’s name (optional)" /></Field>
      <Field label="Father’s phone"><input {...register('father_phone')} placeholder="01XXXXXXXXX (optional)" /></Field>
      <Field label="Mother’s name"><input {...register('mother_name')} placeholder="Mother’s name (optional)" /></Field>
      <Field label="Mother’s phone"><input {...register('mother_phone')} placeholder="01XXXXXXXXX (optional)" /></Field>
    </div>
    <div className="form-section-title">Admission details</div><div className="form-grid">
      <Field label="Admission date" required><input type="date" {...register('admission_date', { required: true })} /></Field>
      <Field label="Status"><select {...register('status')}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
      <Field label="Address" className="field-full"><textarea rows="2" {...register('address')} /></Field>
      <Field label="Additional notes" className="field-full"><textarea rows="2" {...register('notes')} /></Field>
    </div>
    <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : student ? 'Save changes' : 'Complete admission'}</button></div>
  </form></Modal>;
}

function StudentProfile() {
  const { id } = useParams();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('personal');
  const [editing, setEditing] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [admissionNotice, setAdmissionNotice] = useState(location.state?.notice || '');
  const { toast, notify } = useToast();
  const { data: response, isLoading, isError } = useQuery({ queryKey: ['student', id], queryFn: async () => (await api.get(`/students/${id}`)).data });
  const student = response?.data;
  const { data: attendanceResponse } = useQuery({ queryKey: ['student-attendance', id], queryFn: async () => (await api.get(`/students/${id}/attendance`)).data, enabled: tab === 'attendance' });
  const { data: resultsResponse } = useQuery({ queryKey: ['student-results', id], queryFn: async () => (await api.get(`/students/${id}/results`)).data, enabled: ['results', 'overview'].includes(tab) });
  useEffect(() => {
    if (!admissionNotice) return undefined;
    const timeout = window.setTimeout(() => setAdmissionNotice(''), 3500);
    return () => window.clearTimeout(timeout);
  }, [admissionNotice]);
  if (isLoading) return <LoadingPage />;
  if (isError || !student) return <ErrorPage />;
  const tabs = [['personal', 'Personal information'], ['batches', 'Assigned batches'], ['attendance', 'Attendance'], ['results', 'Exam results'], ['overview', 'Academic overview']];
  return <>
    <Link className="back-link" to="/students"><ArrowLeft size={15} /> All students</Link>
    <section className="profile-banner card"><StudentAvatar student={student} large /><div className="profile-heading"><div className="profile-title"><h2>{student.name}</h2><span className={`status-pill ${student.status}`}>{student.status}</span></div><p><span className="mono">{student.roll_number}</span><span className="dot-separator">·</span>{student.school_name}<span className="dot-separator">·</span>Class {student.class_level}</p><small>Admitted {fmtDate(student.admission_date)}</small></div><button className="button button-outline" onClick={() => setEditing(true)}>Edit profile</button></section>
    {(toast || admissionNotice) && <Toast toast={toast || { message: admissionNotice, kind: 'success' }} />}
    <div className="tabs">{tabs.map(([key, label]) => <button className={tab === key ? 'active' : ''} key={key} onClick={() => setTab(key)}>{label}</button>)}</div>
    <section className="card profile-content">
      {tab === 'personal' && <div className="detail-grid">{[['Student name', student.name], ['Roll number', student.roll_number], ['School', student.school_name], ['Class / grade', student.class_level], ['Student phone', student.phone], ['Gender', student.gender], ['Date of birth', fmtDate(student.date_of_birth)], ['Admission date', fmtDate(student.admission_date)], ['Father’s name', student.father_name], ['Father’s phone', student.father_phone], ['Mother’s name', student.mother_name], ['Mother’s phone', student.mother_phone], ['Address', student.address], ['Notes', student.notes]].map(([label, value]) => <Detail key={label} label={label} value={value || '—'} />)}</div>}
      {tab === 'batches' && <><div className="card-heading"><div><h3>Current enrollments</h3><p>A student may attend several batches at once.</p></div><button className="button button-primary button-small" onClick={() => setAssigning(true)}><Plus size={15} /> Assign batch</button></div>{student.batches?.length ? <div className="batch-overview-list">{student.batches.map((batch) => <div className="batch-overview-row" key={batch.id}><span className="batch-mini-icon"><BookOpen size={16} /></span><span><strong>{batch.name}</strong><small>{batch.code} · {batch.subject || 'General'}</small></span><button className="row-action danger" onClick={async () => { if (!window.confirm(`End ${student.name}’s enrollment in ${batch.name}?`)) return; try { await api.delete(`/students/${id}/batches/${batch.id}`); await queryClient.invalidateQueries({ queryKey: ['student', id] }); notify('Enrollment ended.'); } catch (error) { notify(messageFromError(error), 'error'); } }}>End enrollment</button></div>)}</div> : <EmptyState title="No active batch enrollments" text="Assign one or more batches to this student." action={<button className="button button-primary button-small" onClick={() => setAssigning(true)}><Plus size={15} /> Assign batch</button>} />}</>}
      {tab === 'attendance' && <><div className="card-heading"><div><h3>Attendance record</h3><p>Present and late count as attended; excused sessions are excluded from the percentage denominator.</p></div><span className="stat-inline">{attendanceResponse?.summary?.percentage ?? 0}% attendance</span></div><AttendanceHistory rows={attendanceResponse?.data?.data || []} /></>}
      {tab === 'results' && <><div className="card-heading"><div><h3>Exam results</h3><p>Published and draft results recorded for this student.</p></div></div><StudentResultTable rows={resultsResponse?.data?.data || []} /></>}
      {tab === 'overview' && <><div className="inline-stats"><StatCard label="Attendance rate" value={`${attendanceResponse?.summary?.percentage ?? 0}%`} detail="Present + late" icon={CalendarCheck} tone="green" /><StatCard label="Exams recorded" value={resultsResponse?.data?.total ?? 0} detail="All saved results" icon={ClipboardList} tone="violet" /><StatCard label="Current batches" value={student.batches?.length || 0} detail="Active enrollments" icon={BookOpen} /></div><PerformanceChart rows={resultsResponse?.data?.data || []} /></>}
    </section>
    {editing && <StudentForm student={student} onClose={() => setEditing(false)} onSaved={async () => { setEditing(false); await queryClient.invalidateQueries({ queryKey: ['student', id] }); notify('Student profile updated.'); }} />}
    {assigning && <AssignBatchModal studentId={student.id} onClose={() => setAssigning(false)} onSaved={async () => { setAssigning(false); await queryClient.invalidateQueries({ queryKey: ['student', id] }); notify('Batch enrollment saved.'); }} />}
  </>;
}

function AssignBatchModal({ studentId, onClose, onSaved }) {
  const [selected, setSelected] = useState([]);
  const [term, setTerm] = useState('');
  const [error, setError] = useState('');
  const { data } = useQuery({ queryKey: ['active-batches'], queryFn: async () => (await api.get('/batches', { params: { status: 'active', per_page: 100 } })).data });
  const batches = (data?.data || []).filter((batch) => `${batch.name} ${batch.code} ${batch.subject || ''}`.toLowerCase().includes(term.toLowerCase()));
  const save = async () => {
    try { await api.put(`/students/${studentId}/batches`, { batch_ids: selected }); onSaved(); }
    catch (reason) { setError(messageFromError(reason)); }
  };
  return <Modal title="Assign to batches" onClose={onClose}><p className="muted">Choose one or more active batches for this student.</p><div className="toolbar-search modal-search"><Search size={16} /><input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Find a batch…" /></div><div className="selection-list">{batches.map((batch) => <label className="selection-row" key={batch.id}><input type="checkbox" checked={selected.includes(batch.id)} onChange={(event) => setSelected(event.target.checked ? [...selected, batch.id] : selected.filter((id) => id !== batch.id))} /><span><strong>{batch.name}</strong><small>{batch.code} · {batch.subject || 'General'} · {batch.students_count} students</small></span></label>)}</div>{error && <div className="form-alert">{error}</div>}<div className="modal-actions"><button className="button button-quiet" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={!selected.length} onClick={save}>Save enrollment{selected.length ? ` (${selected.length})` : ''}</button></div></Modal>;
}

function Batches() {
  const [term, setTerm] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [status, setStatus] = useState('active');
  const { toast, notify } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ['batches', term, status], queryFn: async () => (await api.get('/batches', { params: { q: term || undefined, status, per_page: 100 } })).data });
  const saveStatus = async (batch) => {
    if (!window.confirm(`${batch.status === 'active' ? 'Deactivate' : 'Restore'} ${batch.name}?`)) return;
    try { await api.patch(`/batches/${batch.id}/status`, { status: batch.status === 'active' ? 'inactive' : 'active' }); await queryClient.invalidateQueries({ queryKey: ['batches'] }); notify('Batch status updated.'); }
    catch (error) { notify(messageFromError(error), 'error'); }
  };
  const batches = data?.data || [];
  return <>
    <PageHeading eyebrow="CLASS ORGANIZATION" title="Batches" subtitle="Create class groups and manage their weekly schedule." action={<button className="button button-primary" onClick={() => { setEditing(null); setModal(true); }}><Plus size={17} /> Create batch</button>} />
    {toast && <Toast toast={toast} />}
    <section className="card data-card"><div className="table-toolbar"><div className="toolbar-search"><Search size={16} /><input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Search batch name, code or subject…" /></div><div className="toolbar-controls"><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="active">Active batches</option><option value="inactive">Inactive batches</option></select><span className="result-count">{data?.meta?.total || 0} batches</span></div></div>
      {isLoading ? <TableSkeleton /> : isError ? <ErrorPage /> : batches.length ? <div className="table-scroll"><table><thead><tr><th>BATCH</th><th>SUBJECT / CLASS</th><th>MONTHLY FEE</th><th>WEEKLY SCHEDULE</th><th>STUDENTS</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>{batches.map((batch) => <tr key={batch.id}><td><Link to={`/batches/${batch.id}`} className="batch-cell"><span className="batch-mini-icon"><BookOpen size={16} /></span><span><strong>{batch.name}</strong><small>{batch.code}</small></span></Link></td><td>{batch.subject || '—'}<small className="table-sub">{batch.class_level ? `Class ${batch.class_level}` : 'All levels'}</small></td><td>৳ {Number(batch.monthly_fee || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 })}</td><td><div className="schedule-pills">{batch.schedules?.length ? batch.schedules.map((item) => <span className="schedule-chip" key={item.id}>{dayNames[item.day_of_week]?.slice(0, 3)} · {fmtTime(item.start_time)}</span>) : <span className="table-sub">No schedule</span>}</div></td><td><span className="count-badge">{batch.students_count}</span></td><td><span className={`status-pill ${batch.status}`}>{batch.status}</span></td><td><div className="actions-cell"><Link className="row-action" to={`/batches/${batch.id}`}>View</Link><button className="row-action" onClick={() => { setEditing(batch); setModal(true); }}>Edit</button><button className="row-action danger" onClick={() => saveStatus(batch)}>{batch.status === 'active' ? 'Deactivate' : 'Restore'}</button></div></td></tr>)}</tbody></table></div> : <EmptyState title="No batches found" text="Create your first batch to organize students and class times." action={<button className="button button-primary button-small" onClick={() => setModal(true)}><Plus size={15} /> Create batch</button>} />}
    </section>
    {modal && <BatchForm batch={editing} onClose={() => setModal(false)} onSaved={() => { setModal(false); queryClient.invalidateQueries({ queryKey: ['batches'] }); notify(editing ? 'Batch updated.' : 'Batch created.'); }} />}
  </>;
}

function BatchForm({ batch, onClose, onSaved }) {
  const [error, setError] = useState('');
  const initialSchedules = batch?.schedules?.map(({ day_of_week, start_time, end_time }) => ({ day_of_week, start_time: start_time?.slice(0, 5), end_time: end_time?.slice(0, 5) })) || [];
  const [schedules, setSchedules] = useState(initialSchedules);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({ defaultValues: batch || { name: '', code: '', subject: '', class_level: '', monthly_fee: 0, description: '', status: 'active', start_date: '', end_date: '' } });
  const submit = handleSubmit(async (values) => {
    try {
      const body = { ...values, schedules: schedules.map((row) => ({ ...row, day_of_week: Number(row.day_of_week) })) };
      await (batch ? api.put(`/batches/${batch.id}`, body) : api.post('/batches', body));
      onSaved();
    } catch (reason) { setError(messageFromError(reason)); }
  });
  return <Modal title={batch ? 'Edit batch' : 'Create a batch'} onClose={onClose} wide><form className="form-stack" onSubmit={submit}>{error && <div className="form-alert">{error}</div>}
    <div className="form-grid"><Field label="Batch name" required><input {...register('name', { required: true })} placeholder="e.g. Physics Batch A" /></Field><Field label="Unique batch code" required><input {...register('code', { required: true })} placeholder="PHY-09-A" /></Field><Field label="Subject / course"><input {...register('subject')} /></Field><Field label="Class / grade"><input {...register('class_level')} /></Field><Field label="Monthly fee (Tk)" required><input type="number" min="0" step="0.01" {...register('monthly_fee', { required: true, valueAsNumber: true })} /></Field><Field label="Start date"><input type="date" {...register('start_date')} /></Field><Field label="End date"><input type="date" {...register('end_date')} /></Field><Field label="Status"><select {...register('status')}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field><Field label="Description" className="field-full"><textarea rows="2" {...register('description')} /></Field></div>
    <div className="schedule-form-header"><div><div className="form-section-title">Weekly schedule</div><small>Add a class time for each day of the week.</small></div><button type="button" className="button button-outline button-small" onClick={() => setSchedules([...schedules, { day_of_week: 0, start_time: '16:00', end_time: '17:00' }])}><Plus size={14} /> Add time</button></div>
    {schedules.map((row, index) => <div className="schedule-editor" key={index}><select aria-label="Day" value={row.day_of_week} onChange={(event) => setSchedules(schedules.map((item, i) => i === index ? { ...item, day_of_week: Number(event.target.value) } : item))}>{dayNames.map((day, id) => <option value={id} key={day}>{day}</option>)}</select><input aria-label="Start time" type="time" value={row.start_time} onChange={(event) => setSchedules(schedules.map((item, i) => i === index ? { ...item, start_time: event.target.value } : item))} /><span>to</span><input aria-label="End time" type="time" value={row.end_time} onChange={(event) => setSchedules(schedules.map((item, i) => i === index ? { ...item, end_time: event.target.value } : item))} /><button type="button" className="icon-button danger-icon" aria-label="Remove schedule" onClick={() => setSchedules(schedules.filter((_, i) => i !== index))}><X size={16} /></button></div>)}
    <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : batch ? 'Save changes' : 'Create batch'}</button></div>
  </form></Modal>;
}

function BatchDetails() {
  const { id } = useParams();
  const [adding, setAdding] = useState(false);
  const { data, isLoading, isError } = useQuery({ queryKey: ['batch', id], queryFn: async () => (await api.get(`/batches/${id}`)).data.data });
  if (isLoading) return <LoadingPage />;
  if (isError || !data) return <ErrorPage />;
  return <><Link className="back-link" to="/batches"><ArrowLeft size={15} /> All batches</Link><PageHeading eyebrow={`BATCH ${data.code}`} title={data.name} subtitle={`${data.subject || 'General subject'} · ${data.class_level ? `Class ${data.class_level}` : 'All levels'} · ${data.students_count || data.students?.length || 0} students`} action={<button className="button button-outline" onClick={() => setAdding(true)}><Plus size={16} /> Add students</button>} />
    <div className="dashboard-grid detail-page-grid"><section className="card table-card"><div className="card-heading"><div><h3>Enrolled students</h3><p>Current active enrollments</p></div></div><StudentTable students={data.students || []} /></section><section className="card schedule-card"><div className="card-heading"><div><h3>Weekly schedule</h3><p>Class times shown in Dhaka time</p></div></div>{data.schedules?.length ? data.schedules.map((schedule) => <div className="schedule-row" key={schedule.id}><span className="schedule-time">{dayNames[schedule.day_of_week]}<small>{fmtTime(schedule.start_time)} – {fmtTime(schedule.end_time)}</small></span></div>) : <EmptyState title="No schedule added" text="Edit this batch to add weekly class times." />}</section></div>
    {adding && <AddStudentsModal batchId={id} onClose={() => setAdding(false)} />}
  </>;
}

function AddStudentsModal({ batchId, onClose }) {
  const [selected, setSelected] = useState([]);
  const [term, setTerm] = useState('');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ['available-students', term], queryFn: async () => (await api.get('/students', { params: { q: term, status: 'active', per_page: 100 } })).data });
  const save = async () => {
    try { await api.post(`/batches/${batchId}/students`, { student_ids: selected }); await queryClient.invalidateQueries({ queryKey: ['batch', batchId] }); onClose(); }
    catch (reason) { setError(messageFromError(reason)); }
  };
  return <Modal title="Add students to batch" onClose={onClose}><div className="toolbar-search modal-search"><Search size={16} /><input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Search active students…" /></div><div className="selection-list">{data?.data?.map((student) => <label className="selection-row" key={student.id}><input type="checkbox" checked={selected.includes(student.id)} onChange={(event) => setSelected(event.target.checked ? [...selected, student.id] : selected.filter((id) => id !== student.id))} /><span><strong>{student.name}</strong><small>{student.roll_number} · {student.school_name} · Class {student.class_level}</small></span></label>)}</div>{error && <div className="form-alert">{error}</div>}<div className="modal-actions"><button className="button button-quiet" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={!selected.length} onClick={save}>Add {selected.length || ''} student{selected.length === 1 ? '' : 's'}</button></div></Modal>;
}

function FeesPage() {
  const [month, setMonth] = useState(dateToday().slice(0, 7));
  const [batchId, setBatchId] = useState('');
  const [status, setStatus] = useState('');
  const [term, setTerm] = useState('');
  const [paying, setPaying] = useState(null);
  const { toast, notify } = useToast();
  const queryClient = useQueryClient();
  const { data: batches } = useQuery({
    queryKey: ['batches', 'fee-filter'],
    queryFn: async () => (await api.get('/batches', { params: { per_page: 100 } })).data.data,
  });
  const { data, isLoading, isError } = useQuery({
    queryKey: ['fees', month, batchId, status, term],
    queryFn: async () => (await api.get('/fees', { params: { month, batch_id: batchId || undefined, status: status || undefined, q: term || undefined, per_page: 100 } })).data,
  });
  const invoices = data?.data?.data || [];
  const summary = data?.summary;
  return <>
    <PageHeading eyebrow="MONTHLY BILLING" title="Fees & income" subtitle="Track monthly batch fees, record payments and follow outstanding balances." />
    {toast && <Toast toast={toast} />}
    <div className="fee-summary-grid">
      <div className="card fee-summary-card"><small>Monthly fee due</small><strong>৳ {Number(summary?.total_due || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 })}</strong><span>{summary?.invoice_count || 0} student invoices</span></div>
      <div className="card fee-summary-card"><small>Collected for selected month</small><strong className="collected">৳ {Number(summary?.total_paid || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 })}</strong><span>Payments recorded</span></div>
      <div className="card fee-summary-card"><small>Outstanding balance</small><strong className="outstanding">৳ {Number(summary?.outstanding || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 })}</strong><span>Due for selected month</span></div>
    </div>
    <section className="card data-card">
      <div className="table-toolbar fee-toolbar"><div className="toolbar-search"><Search size={16} /><input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Search student, roll or batch…" /></div><div className="toolbar-controls"><input aria-label="Billing month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} /><select aria-label="Filter fees by batch" value={batchId} onChange={(event) => setBatchId(event.target.value)}><option value="">All batches</option>{batches?.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}</select><select aria-label="Filter fees by payment status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All payment statuses</option><option value="unpaid">Unpaid</option><option value="partial">Partially paid</option><option value="paid">Paid</option></select></div></div>
      {isLoading ? <TableSkeleton /> : isError ? <ErrorPage /> : invoices.length ? <div className="table-scroll"><table><thead><tr><th>STUDENT</th><th>BATCH</th><th>MONTHLY FEE</th><th>PAID</th><th>REMAINING</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>{invoices.map((invoice) => <tr key={invoice.id}><td><strong>{invoice.student.name}</strong><small className="table-sub">{invoice.student.roll_number}{invoice.student.phone ? ` · ${invoice.student.phone}` : ''}</small>{invoice.payments?.length > 0 && <details className="payment-history"><summary>{invoice.payments.length} payment{invoice.payments.length === 1 ? '' : 's'}</summary>{invoice.payments.map((payment) => <span key={payment.id}>৳ {Number(payment.amount).toLocaleString('en-BD', { minimumFractionDigits: 2 })} · {fmtDate(payment.paid_at)} · {payment.method.replace('_', ' ')}{payment.reference ? ` · ${payment.reference}` : ''}</span>)}</details>}</td><td>{invoice.batch.name}<small className="table-sub">{invoice.batch.code}</small></td><td>৳ {Number(invoice.amount).toLocaleString('en-BD', { minimumFractionDigits: 2 })}</td><td>৳ {Number(invoice.paid_amount).toLocaleString('en-BD', { minimumFractionDigits: 2 })}</td><td><strong>{Number(invoice.balance) ? `৳ ${Number(invoice.balance).toLocaleString('en-BD', { minimumFractionDigits: 2 })}` : '—'}</strong></td><td><span className={`status-pill ${invoice.status}`}>{invoice.status}</span></td><td>{invoice.balance > 0 ? <button className="button button-outline button-small" onClick={() => setPaying(invoice)}>Record payment</button> : <span className="table-sub">Settled</span>}</td></tr>)}</tbody></table></div> : <EmptyState title="No invoices for this filter" text="Invoices are generated for enrolled students in batches with a monthly fee. Use fees:generate --month=YYYY-MM to create past-month invoices." />}
    </section>
    {paying && <RecordPaymentModal invoice={paying} onClose={() => setPaying(null)} onSaved={() => { setPaying(null); queryClient.invalidateQueries({ queryKey: ['fees'] }); queryClient.invalidateQueries({ queryKey: ['dashboard-income'] }); notify('Payment recorded successfully.'); }} />}
  </>;
}

function RecordPaymentModal({ invoice, onClose, onSaved }) {
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: { amount: invoice.balance, paid_at: dateToday(), method: 'cash', reference: '' },
  });
  const submit = handleSubmit(async (values) => {
    setError('');
    try {
      await api.post(`/fees/${invoice.id}/payments`, { ...values, amount: Number(values.amount) });
      onSaved();
    } catch (reason) { setError(messageFromError(reason)); }
  });
  return <Modal title="Record fee payment" onClose={onClose}><form className="form-stack" onSubmit={submit}>
    <div className="payment-student"><strong>{invoice.student.name}</strong><span>{invoice.batch.name} · {invoice.billing_month}</span><small>Remaining: ৳ {Number(invoice.balance).toLocaleString('en-BD', { minimumFractionDigits: 2 })}</small></div>
    {error && <div className="form-alert">{error}</div>}
    <div className="form-grid"><Field label="Payment amount (Tk)" required><input type="number" min="0.01" max={invoice.balance} step="0.01" {...register('amount', { required: true, valueAsNumber: true })} /></Field><Field label="Payment date" required><input type="date" max={dateToday()} {...register('paid_at', { required: true })} /></Field><Field label="Payment method" required><select {...register('method')}><option value="cash">Cash</option><option value="bank">Bank transfer</option><option value="mobile_banking">Mobile banking</option><option value="other">Other</option></select></Field><Field label="Reference"><input {...register('reference')} placeholder="Transaction ID / note" /></Field></div>
    <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save payment'}</button></div>
  </form></Modal>;
}

function AttendancePage() {
  const [batchId, setBatchId] = useState('');
  const [date, setDate] = useState(dateToday());
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [historyFilters, setHistoryFilters] = useState({ batch_id: '', student_id: '', from: '', to: '', status: '' });
  const { toast, notify } = useToast();
  const queryClient = useQueryClient();
  const { data: batches } = useQuery({ queryKey: ['batches', 'active'], queryFn: async () => (await api.get('/batches', { params: { status: 'active', per_page: 100 } })).data.data });
  const { data: students } = useQuery({ queryKey: ['students', 'attendance-filter'], queryFn: async () => (await api.get('/students', { params: { per_page: 100 } })).data.data });
  const { data: history, isLoading } = useQuery({
    queryKey: ['attendance-history', historyFilters],
    queryFn: async () => (await api.get('/attendance/history', { params: Object.fromEntries(Object.entries(historyFilters).filter(([, value]) => value)) })).data,
  });
  const load = async () => {
    setError('');
    if (!batchId) { setError('Choose a batch first.'); return; }
    try {
      const response = await api.get('/attendance-sessions/load', { params: { batch_id: batchId, date } });
      setRows(response.data.students.map((student) => ({ ...student, status: student.status || '', remarks: student.remarks || '' })));
    } catch (reason) { setError(messageFromError(reason)); }
  };
  const updateRow = (id, key, value) => setRows(rows.map((row) => row.id === id ? { ...row, [key]: value } : row));
  const save = async () => {
    try {
      await api.put('/attendance-sessions', { batch_id: Number(batchId), session_date: date, records: rows.map(({ id, status, remarks }) => ({ student_id: id, status: status || null, remarks: remarks || null })) });
      notify('Attendance saved successfully.');
      queryClient.invalidateQueries({ queryKey: ['attendance-history'] });
      await load();
    } catch (reason) { setError(messageFromError(reason)); }
  };
  return <>
    <PageHeading eyebrow="CLASSROOM TRACKER" title="Attendance" subtitle="Record and review attendance for each class session." />
    {toast && <Toast toast={toast} />}
    <section className="card attendance-filter"><div><div className="form-section-title">Take attendance</div><p>Select a batch and date to load students enrolled on that day.</p></div><div className="attendance-controls"><Field label="Batch"><select value={batchId} onChange={(event) => setBatchId(event.target.value)}><option value="">Select batch…</option>{batches?.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}</select></Field><Field label="Class date"><input type="date" value={date} max={dateToday()} onChange={(event) => setDate(event.target.value)} /></Field><button className="button button-primary" onClick={load}>Load students</button></div></section>
    {error && <div className="form-alert">{error}</div>}
    {!!rows.length && <section className="card data-card attendance-card"><div className="table-toolbar"><div><h3>{batches?.find((batch) => String(batch.id) === String(batchId))?.name} <span className="dot-separator">·</span> {fmtDate(date)}</h3><p>{rows.length} enrolled students</p></div><div className="toolbar-controls"><button className="button button-outline button-small" onClick={() => setRows(rows.map((row) => ({ ...row, status: 'present' })))}>Mark all present</button><button className="button button-outline button-small" onClick={() => setRows(rows.map((row) => ({ ...row, status: 'absent' })))}>Mark all absent</button><button className="button button-quiet button-small" onClick={load}>Reset changes</button></div></div><div className="table-scroll"><table><thead><tr><th>STUDENT</th><th>ROLL</th><th>ATTENDANCE STATUS</th><th>REMARKS</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><span className="student-cell"><span className="avatar">{initials(row.name)}</span><strong>{row.name}</strong></span></td><td className="mono">{row.roll_number}</td><td><select className={`attendance-select ${row.status}`} value={row.status} onChange={(event) => updateRow(row.id, 'status', event.target.value)}><option value="">Unmarked</option><option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option><option value="excused">Excused</option></select></td><td><input className="table-input" value={row.remarks} placeholder="Optional note" onChange={(event) => updateRow(row.id, 'remarks', event.target.value)} /></td></tr>)}</tbody></table></div><div className="table-footer"><span>Unmarked students are not counted in attendance statistics.</span><button className="button button-primary" onClick={save}><Check size={16} /> Save attendance</button></div></section>}
    {rows.length === 0 && batchId && <div className="card empty-card"><EmptyState title="Load a class to begin" text="Choose a date and load students. New attendance starts unmarked." /></div>}
    <section className="card data-card history-card"><div className="card-heading"><div><h3>Attendance history</h3><p>Excused and unmarked records are excluded from attendance percentages.</p></div><div className="history-stats">{!isLoading && <><span><b>{history?.summary?.present || 0}</b> Present</span><span><b>{history?.summary?.absent || 0}</b> Absent</span><span><b>{history?.summary?.percentage || 0}%</b> Attendance</span></>}</div></div>
      <div className="history-filter-row"><select aria-label="Filter attendance by batch" value={historyFilters.batch_id} onChange={(event) => setHistoryFilters({ ...historyFilters, batch_id: event.target.value })}><option value="">All batches</option>{batches?.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}</select><select aria-label="Filter attendance by student" value={historyFilters.student_id} onChange={(event) => setHistoryFilters({ ...historyFilters, student_id: event.target.value })}><option value="">All students</option>{students?.map((student) => <option key={student.id} value={student.id}>{student.roll_number} · {student.name}</option>)}</select><input aria-label="Attendance from date" type="date" value={historyFilters.from} onChange={(event) => setHistoryFilters({ ...historyFilters, from: event.target.value })} /><input aria-label="Attendance through date" type="date" value={historyFilters.to} onChange={(event) => setHistoryFilters({ ...historyFilters, to: event.target.value })} /><select aria-label="Filter by attendance status" value={historyFilters.status} onChange={(event) => setHistoryFilters({ ...historyFilters, status: event.target.value })}><option value="">All statuses</option><option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option><option value="excused">Excused</option></select></div>
      <AttendanceHistory rows={history?.data?.data || []} /></section>
  </>;
}

function Exams() {
  const [modal, setModal] = useState(false);
  const [term, setTerm] = useState('');
  const { toast, notify } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ['exams', term], queryFn: async () => (await api.get('/exams', { params: { q: term || undefined, per_page: 100 } })).data });
  return <>
    <PageHeading eyebrow="ACADEMIC ASSESSMENT" title="Exams & results" subtitle="Plan assessments, enter marks and keep progress visible." action={<button className="button button-primary" onClick={() => setModal(true)}><Plus size={17} /> Create exam</button>} />
    {toast && <Toast toast={toast} />}
    <div className="section-shortcuts"><Link to="/results"><ChartNoAxesCombined size={16} /> Browse all results <ChevronRight size={15} /></Link></div>
    <section className="card data-card"><div className="table-toolbar"><div className="toolbar-search"><Search size={16} /><input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Search exam title or subject…" /></div><span className="result-count">{data?.meta?.total || 0} exams</span></div>
      {isLoading ? <TableSkeleton /> : isError ? <ErrorPage /> : data?.data?.length ? <div className="table-scroll"><table><thead><tr><th>EXAM</th><th>SUBJECT</th><th>DATE</th><th>TOTAL MARKS</th><th>BATCHES</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>{data.data.map((exam) => <tr key={exam.id}><td><strong>{exam.title}</strong><small className="table-sub">{exam.type.replace('_', ' ')}</small></td><td>{exam.subject}</td><td>{fmtDate(exam.exam_date)}</td><td>{exam.total_marks}</td><td><div className="batch-pills">{exam.batches?.map((batch) => <span className="pill" key={batch.id}>{batch.name}</span>)}</div></td><td><span className={`status-pill ${exam.status}`}>{exam.status}</span></td><td><div className="actions-cell"><Link className="row-action" to={`/exams/${exam.id}/marks`}>Enter marks</Link><Link className="row-action" to={`/results?exam=${exam.id}`}>Results</Link></div></td></tr>)}</tbody></table></div> : <EmptyState title="No exams created" text="Create an exam and assign the batches taking part." action={<button className="button button-primary button-small" onClick={() => setModal(true)}><Plus size={15} /> Create exam</button>} />}
    </section>
    {modal && <ExamForm onClose={() => setModal(false)} onSaved={() => { setModal(false); queryClient.invalidateQueries({ queryKey: ['exams'] }); notify('Exam created.'); }} />}
  </>;
}

function ExamForm({ onClose, onSaved }) {
  const [batchIds, setBatchIds] = useState([]);
  const [error, setError] = useState('');
  const { data } = useQuery({ queryKey: ['batches', 'active'], queryFn: async () => (await api.get('/batches', { params: { status: 'active', per_page: 100 } })).data.data });
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({ defaultValues: { title: '', subject: '', exam_date: dateToday(), total_marks: 100, type: 'class_test', status: 'draft', description: '' } });
  const submit = handleSubmit(async (values) => {
    if (!batchIds.length) { setError('Choose at least one batch.'); return; }
    try { await api.post('/exams', { ...values, total_marks: Number(values.total_marks), batch_ids: batchIds }); onSaved(); }
    catch (reason) { setError(messageFromError(reason)); }
  });
  return <Modal title="Create an exam" onClose={onClose} wide><form className="form-stack" onSubmit={submit}>{error && <div className="form-alert">{error}</div>}
    <div className="form-grid"><Field label="Exam title" required><input {...register('title', { required: true })} placeholder="e.g. Chapter 01 class test" /></Field><Field label="Subject" required><input {...register('subject', { required: true })} /></Field><Field label="Exam date" required><input type="date" {...register('exam_date', { required: true })} /></Field><Field label="Total marks" required><input type="number" min="0.01" step="0.01" {...register('total_marks', { required: true })} /></Field><Field label="Exam type"><select {...register('type')}><option value="class_test">Class test</option><option value="quiz">Quiz</option><option value="midterm">Midterm</option><option value="final">Final</option><option value="other">Other</option></select></Field><Field label="Status"><select {...register('status')}><option value="draft">Draft</option><option value="published">Published</option></select></Field><Field label="Description" className="field-full"><textarea rows="2" {...register('description')} /></Field></div>
    <div className="form-section-title">Assign batches</div><div className="batch-select-grid">{data?.map((batch) => <label className={`batch-select-card ${batchIds.includes(batch.id) ? 'selected' : ''}`} key={batch.id}><input type="checkbox" checked={batchIds.includes(batch.id)} onChange={(event) => setBatchIds(event.target.checked ? [...batchIds, batch.id] : batchIds.filter((id) => id !== batch.id))} /><span><strong>{batch.name}</strong><small>{batch.subject || 'General'} · {batch.students_count} students</small></span></label>)}</div>
    <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Create exam'}</button></div>
  </form></Modal>;
}

function MarksEntry() {
  const { id } = useParams();
  const [batchId, setBatchId] = useState('');
  const [term, setTerm] = useState('');
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const { toast, notify } = useToast();
  const queryClient = useQueryClient();
  const { data: exam } = useQuery({ queryKey: ['exam', id], queryFn: async () => (await api.get(`/exams/${id}`)).data.data });
  const load = async (nextId = batchId) => {
    if (!nextId) return;
    setError('');
    try { const response = await api.get(`/exams/${id}/marks`, { params: { batch_id: nextId } }); setRows(response.data.students.map((row) => ({ ...row, obtained_marks: row.obtained_marks ?? '', is_absent: row.is_absent }))); }
    catch (reason) { setError(messageFromError(reason)); }
  };
  const save = async () => {
    try {
      await api.put(`/exams/${id}/marks`, { records: rows.map((row) => ({ student_id: row.id, obtained_marks: row.is_absent || row.obtained_marks === '' ? null : Number(row.obtained_marks), is_absent: row.is_absent })) });
      notify('Marks saved.'); queryClient.invalidateQueries({ queryKey: ['exam-results', id] }); await load();
    } catch (reason) { setError(messageFromError(reason)); }
  };
  const visibleRows = rows.filter((row) => `${row.name} ${row.roll_number}`.toLowerCase().includes(term.toLowerCase()));
  if (!exam) return <LoadingPage />;
  return <><Link className="back-link" to="/exams"><ArrowLeft size={15} /> All exams</Link><PageHeading eyebrow={`${exam.subject} · ${fmtDate(exam.exam_date)}`} title={exam.title} subtitle={`Maximum score: ${exam.total_marks} marks · ${exam.status}`} />
    {toast && <Toast toast={toast} />}
    <section className="card attendance-filter"><div><div className="form-section-title">Choose a batch</div><p>Marks remain a single result per student for this exam, even if they attend multiple selected batches.</p></div><div className="attendance-controls"><Field label="Exam batch"><select value={batchId} onChange={(event) => { setBatchId(event.target.value); setRows([]); }}><option value="">Select batch…</option>{exam.batches?.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}</select></Field><button className="button button-primary" onClick={() => load()}>Load students</button></div></section>
    {error && <div className="form-alert">{error}</div>}
    {!!rows.length && <section className="card data-card attendance-card"><div className="table-toolbar"><div className="toolbar-search"><Search size={16} /><input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Find a student…" /></div><span className="result-count">Total marks: {exam.total_marks}</span></div><div className="table-scroll"><table><thead><tr><th>STUDENT</th><th>ROLL</th><th>MAXIMUM</th><th>OBTAINED MARKS</th><th>RESULT STATUS</th></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.id}><td><span className="student-cell"><span className="avatar">{initials(row.name)}</span><strong>{row.name}</strong></span></td><td className="mono">{row.roll_number}</td><td>{exam.total_marks}</td><td><input className="marks-input" type="number" min="0" max={exam.total_marks} step="0.01" disabled={row.is_absent} value={row.is_absent ? '' : row.obtained_marks} placeholder="—" onChange={(event) => setRows(rows.map((item) => item.id === row.id ? { ...item, obtained_marks: event.target.value } : item))} /></td><td><label className="absent-toggle"><input type="checkbox" checked={row.is_absent} onChange={(event) => setRows(rows.map((item) => item.id === row.id ? { ...item, is_absent: event.target.checked, obtained_marks: '' } : item))} /> Mark absent</label></td></tr>)}</tbody></table></div><div className="table-footer"><span>Marks can be left blank; absent students are recorded separately from zero marks.</span><button className="button button-primary" onClick={save}><Check size={16} /> Save marks</button></div></section>}
    {!rows.length && batchId && <div className="card empty-card"><EmptyState title="Load the selected batch" text="Students enrolled on the exam date will appear here." /></div>}
  </>;
}

function Results() {
  const [params] = useSearchParams();
  const [examId, setExamId] = useState(params.get('exam') || '');
  const [batchId, setBatchId] = useState('');
  const { data: exams } = useQuery({ queryKey: ['exams'], queryFn: async () => (await api.get('/exams', { params: { per_page: 100 } })).data.data });
  const { data: batches } = useQuery({ queryKey: ['batches', 'all'], queryFn: async () => (await api.get('/batches', { params: { per_page: 100 } })).data.data });
  const { data, isLoading, isError } = useQuery({ queryKey: ['results', examId, batchId], queryFn: async () => (await api.get('/results', { params: { exam_id: examId || undefined, batch_id: batchId || undefined } })).data });
  return <>
    <PageHeading eyebrow="ACADEMIC RECORDS" title="Results" subtitle="Review marks and performance across all exams." action={<Link to="/exams" className="button button-outline"><ArrowLeft size={15} /> Exams</Link>} />
    <section className="card data-card"><div className="table-toolbar"><div className="toolbar-controls"><select value={examId} onChange={(event) => setExamId(event.target.value)}><option value="">All exams</option>{exams?.map((exam) => <option key={exam.id} value={exam.id}>{exam.title}</option>)}</select><select value={batchId} onChange={(event) => setBatchId(event.target.value)}><option value="">All batches</option>{batches?.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}</select></div><span className="result-count">{data?.meta?.total || 0} results</span></div>
      {isLoading ? <TableSkeleton /> : isError ? <ErrorPage /> : data?.data?.length ? <div className="table-scroll"><table><thead><tr><th>STUDENT</th><th>EXAM</th><th>BATCH</th><th>EXAM DATE</th><th>MARKS</th><th>PERCENTAGE</th><th>STATUS</th></tr></thead><tbody>{data.data.map((row) => <tr key={`${row.exam_id}-${row.student_id}`}><td><Link className="text-link" to={`/students/${row.student_id}`}>{row.student} <span className="table-sub">{row.roll_number}</span></Link></td><td>{row.exam}</td><td>{row.batch}</td><td>{fmtDate(row.exam_date)}</td><td>{row.is_absent ? 'Absent' : row.obtained_marks === null ? 'Not entered' : `${row.obtained_marks} / ${row.total_marks}`}</td><td>{row.percentage === null ? '—' : `${row.percentage}%`}</td><td><span className={`status-pill ${row.is_absent ? 'inactive' : row.obtained_marks === null ? 'draft' : 'active'}`}>{row.is_absent ? 'Absent' : row.obtained_marks === null ? 'Pending' : 'Scored'}</span></td></tr>)}</tbody></table></div> : <EmptyState title="No results to show" text="Enter student marks for an exam to see results here." action={<Link to="/exams" className="button button-primary button-small">Go to exams</Link>} />}
      {!!data?.data?.length && <div className="table-footer"><div className="toolbar-controls"><button className="button button-outline button-small" onClick={() => window.print()}><ArrowDownToLine size={15} /> Print results</button><button className="button button-outline button-small" onClick={() => window.open(`${API_ORIGIN}/api/reports/exams?export=1${examId ? `&exam_id=${examId}` : ''}${batchId ? `&batch_id=${batchId}` : ''}`, '_blank')}>Export CSV</button></div><span>Percentage = obtained marks ÷ total marks × 100.</span></div>}
    </section>
  </>;
}

function Reports() {
  const [classLevel, setClassLevel] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [batchId, setBatchId] = useState('');
  const [admittedFrom, setAdmittedFrom] = useState('');
  const [admittedTo, setAdmittedTo] = useState('');
  const { data: batches } = useQuery({ queryKey: ['batches'], queryFn: async () => (await api.get('/batches', { params: { per_page: 100 } })).data.data });
  const filters = { class_level: classLevel || undefined, school_name: schoolName || undefined, batch_id: batchId || undefined, admitted_from: admittedFrom || undefined, admitted_to: admittedTo || undefined, per_page: 50 };
  const exportStudents = () => {
    const params = new URLSearchParams({ export: '1' });
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
    window.open(`${API_ORIGIN}/api/reports/students?${params.toString()}`, '_blank');
  };
  const { data: students, isLoading } = useQuery({ queryKey: ['report-students', classLevel, schoolName, batchId, admittedFrom, admittedTo], queryFn: async () => (await api.get('/reports/students', { params: filters })).data });
  return <>
    <PageHeading eyebrow="INSIGHTS & EXPORTS" title="Reports" subtitle="Filter student records and download practical CSV reports." />
    <div className="report-cards"><div className="card report-card"><span className="report-icon report-blue"><Users size={18} /></span><h3>Student directory</h3><p>Export admission and contact records. Filters apply to the download.</p><button className="button button-outline button-small" onClick={exportStudents}>Download student CSV <ArrowDownToLine size={15} /></button></div><div className="card report-card"><span className="report-icon report-green"><CalendarCheck size={18} /></span><h3>Attendance summary</h3><p>Review recorded attendance across classes and dates.</p><div className="report-actions"><Link className="button button-outline button-small" to="/attendance">Open attendance history <ChevronRight size={15} /></Link><button className="button button-outline button-small" onClick={() => window.open(`${API_ORIGIN}/api/reports/attendance?export=1`, '_blank')}>Download CSV <ArrowDownToLine size={15} /></button></div></div><div className="card report-card"><span className="report-icon report-violet"><ClipboardList size={18} /></span><h3>Exam results</h3><p>Review marks, percentages, and student performance.</p><div className="report-actions"><Link className="button button-outline button-small" to="/results">Open exam results <ChevronRight size={15} /></Link><button className="button button-outline button-small" onClick={() => window.open(`${API_ORIGIN}/api/reports/exams?export=1`, '_blank')}>Download CSV <ArrowDownToLine size={15} /></button></div></div></div>
    <section className="card data-card"><div className="card-heading"><div><h3>Student report preview</h3><p>Export includes the filtered student list.</p></div><button className="button button-outline button-small" onClick={exportStudents}><ArrowDownToLine size={15} /> Export CSV</button></div><div className="table-toolbar"><div className="toolbar-controls"><label className="filter-label">Class <input value={classLevel} onChange={(event) => setClassLevel(event.target.value)} placeholder="Any class" /></label><label className="filter-label">School <input value={schoolName} onChange={(event) => setSchoolName(event.target.value)} placeholder="Any school" /></label><label className="filter-label">Admitted from <input type="date" value={admittedFrom} onChange={(event) => setAdmittedFrom(event.target.value)} /></label><label className="filter-label">To <input type="date" value={admittedTo} onChange={(event) => setAdmittedTo(event.target.value)} /></label><select value={batchId} onChange={(event) => setBatchId(event.target.value)}><option value="">All batches</option>{batches?.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}</select></div><span className="result-count">{students?.meta?.total || 0} students</span></div>
      {isLoading ? <TableSkeleton /> : students?.data?.length ? <StudentTable students={students.data} /> : <EmptyState title="No matching students" text="Adjust the report filters to see student records." />}
    </section>
  </>;
}

function SettingsPage({ user }) {
  const queryClient = useQueryClient();
  const { toast, notify } = useToast();
  const [error, setError] = useState('');
  const { data } = useQuery({ queryKey: ['settings'], queryFn: async () => (await api.get('/settings')).data.settings });
  const [form, setForm] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [profile, setProfile] = useState({ name: user.name, email: user.email });
  const [passwords, setPasswords] = useState({ current_password: '', password: '', password_confirmation: '' });
  const values = form || data || {};
  const updateSetting = (key, value) => setForm({ ...values, [key]: value });
  const saveSettings = async (event) => {
    event.preventDefault(); setError('');
    try {
      const payload = { ...values, classes: (values.classes || []).filter(Boolean), subjects: (values.subjects || []).filter(Boolean) };
      delete payload.logo_url;
      let response;
      if (logoFile) {
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (Array.isArray(value)) value.forEach((item) => formData.append(`${key}[]`, item));
          else if (value !== undefined && value !== null) formData.append(key, String(value));
        });
        formData.append('logo', logoFile);
        formData.append('_method', 'PUT');
        response = await api.post('/settings', formData);
      } else {
        response = await api.put('/settings', payload);
      }
      setLogoFile(null);
      queryClient.setQueryData(['settings'], response.data.settings);
      notify('Coaching settings saved.');
    }
    catch (reason) { setError(messageFromError(reason)); }
  };
  const saveProfile = async (event) => {
    event.preventDefault(); setError('');
    try { const response = await api.put('/auth/profile', profile); queryClient.setQueryData(['me'], response.data.user); notify('Profile updated.'); }
    catch (reason) { setError(messageFromError(reason)); }
  };
  const savePassword = async (event) => {
    event.preventDefault(); setError('');
    try { await api.put('/auth/password', passwords); setPasswords({ current_password: '', password: '', password_confirmation: '' }); notify('Password changed.'); }
    catch (reason) { setError(messageFromError(reason)); }
  };
  if (!data) return <LoadingPage />;
  return <>
    <PageHeading
      eyebrow="WORKSPACE PREFERENCES"
      title="Settings"
      subtitle="Update coaching details, administrator preferences and system integrations."
      action={
        <Link to="/settings/sms" className="button button-outline">
          <MessageSquare size={15} /> BulkSMSBD Configuration
        </Link>
      }
    />
    {toast && <Toast toast={toast} />}{error && <div className="form-alert">{error}</div>}
    <div className="settings-grid"><form className="card settings-card form-stack" onSubmit={saveSettings}><div className="card-heading"><div><h3>Coaching information</h3><p>Details used throughout your workspace.</p></div></div>
      <Field label="Institution name"><input value={values.institution_name || ''} onChange={(event) => updateSetting('institution_name', event.target.value)} placeholder="Your coaching centre" /></Field>
      <Field label="Coaching logo"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setLogoFile(event.target.files?.[0] || null)} />{values.logo_url && <img className="settings-logo-preview" src={values.logo_url} alt="Current coaching logo" />}</Field>
      <div className="form-grid"><Field label="Contact number"><input value={values.contact_number || ''} onChange={(event) => updateSetting('contact_number', event.target.value)} /></Field><Field label="Contact email"><input type="email" value={values.email || ''} onChange={(event) => updateSetting('email', event.target.value)} /></Field></div><Field label="Address"><textarea rows="2" value={values.address || ''} onChange={(event) => updateSetting('address', event.target.value)} /></Field>
      <div className="form-section-title">Academic options</div><TagEditor label="Class / grade options" values={values.classes || []} onChange={(next) => updateSetting('classes', next)} /><TagEditor label="Subjects" values={values.subjects || []} onChange={(next) => updateSetting('subjects', next)} /><button className="button button-primary align-start">Save coaching settings</button>
    </form><div className="settings-column"><form className="card settings-card form-stack" onSubmit={saveProfile}><div className="card-heading"><div><h3>Admin profile</h3><p>Update your account details.</p></div><ShieldCheck size={19} /></div><Field label="Full name"><input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} required /></Field><Field label="Email address"><input type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} required /></Field><button className="button button-outline align-start">Save profile</button></form>
      <form className="card settings-card form-stack" onSubmit={savePassword}><div className="card-heading"><div><h3>Change password</h3><p>Use at least 12 characters.</p></div></div><Field label="Current password"><input type="password" autoComplete="current-password" value={passwords.current_password} onChange={(event) => setPasswords({ ...passwords, current_password: event.target.value })} required /></Field><Field label="New password"><input type="password" autoComplete="new-password" minLength="12" value={passwords.password} onChange={(event) => setPasswords({ ...passwords, password: event.target.value })} required /></Field><Field label="Confirm new password"><input type="password" autoComplete="new-password" value={passwords.password_confirmation} onChange={(event) => setPasswords({ ...passwords, password_confirmation: event.target.value })} required /></Field><button className="button button-outline align-start">Update password</button></form></div></div>
  </>;
}

function TagEditor({ label, values, onChange }) {
  const [value, setValue] = useState('');
  return <div className="tag-editor"><label>{label}</label><div className="tag-row">{values.map((item, index) => <span className="tag" key={`${item}-${index}`}>{item}<button type="button" aria-label={`Remove ${item}`} onClick={() => onChange(values.filter((_, id) => id !== index))}><X size={13} /></button></span>)}</div><div className="tag-add"><input value={value} onChange={(event) => setValue(event.target.value)} placeholder={`Add ${label.toLowerCase()}…`} onKeyDown={(event) => { if (event.key === 'Enter' && value.trim()) { event.preventDefault(); onChange([...values, value.trim()]); setValue(''); } }} /><button type="button" className="button button-outline button-small" onClick={() => { if (value.trim()) { onChange([...values, value.trim()]); setValue(''); } }}>Add</button></div></div>;
}

function AttendanceHistory({ rows }) {
  if (!rows.length) return <EmptyState title="No attendance records" text="Saved class attendance will appear here." />;
  return <div className="table-scroll"><table><thead><tr><th>DATE</th><th>STUDENT</th><th>BATCH</th><th>STATUS</th><th>REMARKS</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.date}-${row.roll_number || index}`}><td>{fmtDate(row.date)}</td><td>{row.student || row.roll_number || '—'}</td><td>{row.batch}</td><td><span className={`status-pill ${row.status || 'draft'}`}>{row.status || 'Unmarked'}</span></td><td>{row.remarks || '—'}</td></tr>)}</tbody></table></div>;
}

function StudentResultTable({ rows }) {
  if (!rows.length) return <EmptyState title="No exam results yet" text="Results entered for this student will appear here." />;
  return <div className="table-scroll"><table><thead><tr><th>EXAM</th><th>SUBJECT</th><th>BATCH</th><th>DATE</th><th>MARKS</th><th>PERCENTAGE</th><th>STATUS</th></tr></thead><tbody>{rows.map((row) => <tr key={row.exam_id}><td>{row.title}</td><td>{row.subject}</td><td>{row.batch || '—'}</td><td>{fmtDate(row.exam_date)}</td><td>{row.is_absent ? 'Absent' : row.obtained_marks === null ? '—' : `${row.obtained_marks} / ${row.total_marks}`}</td><td>{row.percentage === null ? '—' : `${row.percentage}%`}</td><td><span className={`status-pill ${row.is_absent ? 'inactive' : 'active'}`}>{row.is_absent ? 'Absent' : 'Recorded'}</span></td></tr>)}</tbody></table></div>;
}

function PerformanceChart({ rows }) {
  const chartData = [...rows].reverse().filter((row) => row.percentage !== null).map((row) => ({ name: row.title, percentage: row.percentage }));
  return <div className="performance-chart"><div className="card-heading"><div><h3>Exam performance</h3><p>Percentage trend for entered marks</p></div></div>{chartData.length ? <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><CartesianGrid stroke="#eef1f6" vertical={false} /><XAxis dataKey="name" hide /><YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} axisLine={false} tickLine={false} /><Tooltip formatter={(value) => [`${value}%`, 'Score']} /><Area type="monotone" dataKey="percentage" stroke="#4c7df0" fill="#4c7df01c" strokeWidth={2} /></AreaChart></ResponsiveContainer></div> : <EmptyState title="Not enough results" text="Enter marks to see performance over time." />}</div>;
}

function StudentTable({ students }) {
  if (!students.length) return <EmptyState title="No enrolled students" text="Students assigned to this batch will appear here." />;
  return <div className="table-scroll"><table><thead><tr><th>STUDENT</th><th>ROLL</th><th>SCHOOL</th><th>CLASS</th><th>PHONE</th><th>STATUS</th></tr></thead><tbody>{students.map((student) => <tr key={student.id}><td><Link className="student-cell" to={`/students/${student.id}`}><StudentAvatar student={student} /><strong>{student.name}</strong></Link></td><td className="mono">{student.roll_number}</td><td>{student.school_name}</td><td>{student.class_level}</td><td>{student.phone || '—'}</td><td><span className={`status-pill ${student.status}`}>{student.status}</span></td></tr>)}</tbody></table></div>;
}

function StudentAvatar({ student, large = false }) {
  return <span className={`avatar ${large ? 'avatar-large' : ''}`}>{student.photo_url ? <img src={student.photo_url} alt={`${student.name} photo`} /> : initials(student.name)}</span>;
}

function Modal({ title, children, onClose, wide = false }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}><div className="modal-header"><h3>{title}</h3><button className="icon-button" aria-label="Close" onClick={onClose}><X size={19} /></button></div><div className="modal-body">{children}</div></div></div>;
}

function Field({ label, required, error, className = '', children }) {
  return <label className={`field ${className}`}><span>{label}{required && <i> *</i>}</span>{children}{error && <small className="field-error">{error}</small>}</label>;
}

function Detail({ label, value }) {
  return <div className="detail-item"><small>{label}</small><strong>{value}</strong></div>;
}

function EmptyState({ title, text, action }) {
  return <div className="empty-state"><span className="empty-icon"><SlidersHorizontal size={19} /></span><strong>{title}</strong><p>{text}</p>{action}</div>;
}

function LoadingPage() {
  return <div className="loading-page"><span className="spinner" />Loading workspace…</div>;
}

function ErrorPage() {
  return <div className="error-state"><strong>Couldn’t load this data</strong><p>Check your connection and try again.</p></div>;
}

function TableSkeleton() {
  return <div className="skeleton-list">{Array.from({ length: 6 }, (_, index) => <span key={index} />)}</div>;
}

function Toast({ toast }) {
  return <div className={`toast ${toast.kind}`}><span>{toast.kind === 'error' ? <X size={16} /> : <Check size={16} />}</span>{toast.message}</div>;
}

function BulkSmsSettings() {
  const queryClient = useQueryClient();
  const { toast, notify } = useToast();
  const [error, setError] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Hello from ClassDesk! This is a test SMS.');

  const { data, isLoading } = useQuery({
    queryKey: ['sms-settings'],
    queryFn: async () => (await api.get('/settings/sms')).data.settings,
  });

  const [form, setForm] = useState(null);
  const values = form || data || { api_key: '', sender_id: '', api_url: 'https://bulksmsbd.net/api/smsapi', type: 'text' };

  const updateSetting = (key, val) => setForm({ ...values, [key]: val });

  const saveSettingsMutation = useMutation({
    mutationFn: (payload) => api.put('/settings/sms', payload),
    onSuccess: (res) => {
      queryClient.setQueryData(['sms-settings'], res.data.settings);
      notify('BulkSMSBD configuration saved.');
      setError('');
    },
    onError: (err) => {
      setError(messageFromError(err));
    },
  });

  const { data: balanceData, refetch: checkBalance, isFetching: isCheckingBalance } = useQuery({
    queryKey: ['sms-balance'],
    queryFn: async () => (await api.get('/settings/sms/balance')).data,
    enabled: false,
    retry: false,
  });

  const sendTestMutation = useMutation({
    mutationFn: (payload) => api.post('/settings/sms/test', payload),
    onSuccess: (res) => {
      notify(res.data.message || 'Test SMS sent successfully!');
      setError('');
    },
    onError: (err) => {
      setError(messageFromError(err));
    },
  });

  const handleSave = (e) => {
    e.preventDefault();
    setError('');
    saveSettingsMutation.mutate({
      api_key: values.api_key?.trim() || '',
      sender_id: values.sender_id?.trim() || '',
      api_url: values.api_url?.trim() || 'https://bulksmsbd.net/api/smsapi',
      type: values.type || 'text',
    });
  };

  const handleSendTest = (e) => {
    e.preventDefault();
    if (!testPhone.trim() || !testMessage.trim()) {
      setError('Please provide both recipient phone number and test message.');
      return;
    }
    setError('');
    sendTestMutation.mutate({ phone: testPhone.trim(), message: testMessage.trim() });
  };

  if (isLoading) return <LoadingPage />;

  return (
    <>
      <PageHeading
        eyebrow="SMS GATEWAY INTEGRATION"
        title="BulkSMSBD Configuration"
        subtitle="Configure your BulkSMSBD credentials to send instant and bulk SMS to students anytime."
        action={
          <Link className="button button-outline" to="/settings">
            <SlidersHorizontal size={15} /> General Settings
          </Link>
        }
      />
      {toast && <Toast toast={toast} />}
      {error && <div className="form-alert">{error}</div>}

      <div className="settings-grid">
        <form className="card settings-card form-stack" onSubmit={handleSave}>
          <div className="card-heading">
            <div>
              <h3>API Credentials</h3>
              <p>Credentials provided by your BulkSMSBD (bulksmsbd.com) account.</p>
            </div>
            <MessageSquare size={20} style={{ color: '#4779e8' }} />
          </div>

          <Field label="API Key" required>
            <div style={{ position: 'relative' }}>
              <input
                type={showKey ? 'text' : 'password'}
                value={values.api_key || ''}
                onChange={(e) => updateSetting('api_key', e.target.value)}
                placeholder="Enter your BulkSMSBD API Key"
                required
                style={{ paddingRight: 36 }}
              />
              <button
                type="button"
                className="icon-button"
                style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', padding: 4 }}
                onClick={() => setShowKey(!showKey)}
                aria-label="Toggle API Key visibility"
              >
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>

          <Field label="Sender ID" required>
            <input
              type="text"
              value={values.sender_id || ''}
              onChange={(e) => updateSetting('sender_id', e.target.value)}
              placeholder="e.g. 8809612... or approved Sender Name"
              required
            />
          </Field>

          <Field label="Gateway API URL">
            <input
              type="url"
              value={values.api_url || 'https://bulksmsbd.net/api/smsapi'}
              onChange={(e) => updateSetting('api_url', e.target.value)}
              placeholder="https://bulksmsbd.net/api/smsapi"
            />
          </Field>

          <Field label="Default Message Encoding">
            <select
              value={values.type || 'text'}
              onChange={(e) => updateSetting('type', e.target.value)}
            >
              <option value="text">Standard Text (English - 160 characters/SMS)</option>
              <option value="unicode">Unicode (Bangla / Multilingual - 70 characters/SMS)</option>
            </select>
          </Field>

          <div className="info-note">
            💡 If your message contains Bangla or special characters, our system automatically delivers it as Unicode so your recipients receive crystal-clear Bangla text.
          </div>

          <button
            type="submit"
            className="button button-primary align-start"
            disabled={saveSettingsMutation.isPending}
          >
            {saveSettingsMutation.isPending ? 'Saving settings…' : 'Save SMS Configuration'}
          </button>
        </form>

        <div className="settings-column">
          <div className="card settings-card">
            <div className="card-heading">
              <div>
                <h3>Account Balance & Status</h3>
                <p>Check your live SMS wallet balance with BulkSMSBD.</p>
              </div>
              <span className={`status-pill ${values.is_configured ? 'active' : 'draft'}`}>
                {values.is_configured ? 'Configured' : 'Needs Config'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '8px 0 16px' }}>
              <span style={{ fontSize: '26px', fontWeight: 700, color: '#1f2d44' }}>
                {balanceData?.balance !== undefined ? `৳ ${balanceData.balance}` : '—'}
              </span>
              <small style={{ color: '#8898aa', fontSize: '11px' }}>
                {balanceData ? 'Current credits/balance' : 'Click below to fetch balance'}
              </small>
            </div>

            <button
              type="button"
              className="button button-outline align-start"
              disabled={isCheckingBalance}
              onClick={() => checkBalance()}
            >
              <RefreshCw size={14} className={isCheckingBalance ? 'spin' : ''} />
              {isCheckingBalance ? 'Checking balance…' : 'Check Live Balance'}
            </button>
          </div>

          <form className="card settings-card form-stack" onSubmit={handleSendTest}>
            <div className="card-heading">
              <div>
                <h3>Send Test SMS</h3>
                <p>Deliver a sample message to test gateway connectivity.</p>
              </div>
              <Send size={18} style={{ color: '#4779e8' }} />
            </div>

            <Field label="Recipient phone number" required>
              <input
                type="text"
                placeholder="01XXXXXXXXX"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                required
              />
            </Field>

            <Field label="Message body" required>
              <textarea
                rows="3"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Type test message…"
                required
              />
            </Field>

            <button
              type="submit"
              className="button button-primary align-start"
              disabled={sendTestMutation.isPending}
            >
              <Send size={14} />
              {sendTestMutation.isPending ? 'Sending test SMS…' : 'Send Test SMS'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

function AllUsers({ currentUser }) {
  const queryClient = useQueryClient();
  const { toast, notify } = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['users', { page, search }],
    queryFn: async () => (await api.get('/users', { params: { page, search } })).data,
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId) => api.delete(`/users/${userId}`),
    onSuccess: () => {
      notify('User deleted successfully.');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      notify(messageFromError(error), 'error');
      setDeleteTarget(null);
    },
  });

  return (
    <>
      <PageHeading
        eyebrow="SYSTEM ADMINISTRATORS"
        title="All User"
        subtitle="Review and manage user accounts with administrative access to the platform."
        action={
          <Link className="button button-primary" to="/users/create">
            <Plus size={16} /> Create New User
          </Link>
        }
      />
      {toast && <Toast toast={toast} />}

      <section className="card data-card">
        <div className="table-toolbar">
          <div className="toolbar-search">
            <Search size={16} />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search user by name or email…"
            />
            {search && (
              <button
                className="icon-button"
                aria-label="Clear search"
                onClick={() => setSearch('')}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <span className="result-count">{data?.meta?.total ?? data?.data?.length ?? 0} users</span>
        </div>

        {isLoading ? (
          <TableSkeleton />
        ) : isError ? (
          <ErrorPage />
        ) : data?.data?.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>USER</th>
                  <th>EMAIL</th>
                  <th>ROLE</th>
                  <th>JOINED</th>
                  <th style={{ textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((u) => {
                  const isSelf = currentUser?.id === u.id;
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="student-cell">
                          <span className="avatar avatar-small">{initials(u.name)}</span>
                          <div>
                            <strong>{u.name}</strong>
                            {isSelf && (
                              <small style={{ color: '#4779e8', marginLeft: 6, fontWeight: 600 }}>
                                (You)
                              </small>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`status-pill ${u.role === 'admin' ? 'active' : 'draft'}`}>
                          {u.role === 'admin' ? 'Administrator' : u.role}
                        </span>
                      </td>
                      <td>{fmtDate(u.created_at)}</td>
                      <td style={{ textAlign: 'right' }}>
                        {isSelf ? (
                          <span className="muted" style={{ fontSize: '10px' }}>Current user</span>
                        ) : (
                          <button
                            className="button button-quiet button-small"
                            style={{ color: '#c75349' }}
                            onClick={() => setDeleteTarget(u)}
                            title={`Delete ${u.name}`}
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No users found"
            text="No administrator accounts match your search."
            action={
              <Link className="button button-outline button-small" to="/users/create">
                <Plus size={14} /> Add new user
              </Link>
            }
          />
        )}
        <Pagination meta={data?.meta} page={page} setPage={setPage} />
      </section>

      {deleteTarget && (
        <Modal title="Delete Administrator" onClose={() => setDeleteTarget(null)}>
          <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#526178', lineHeight: 1.6 }}>
            Are you sure you want to delete administrator <strong>{deleteTarget.name}</strong> ({deleteTarget.email})? This user will immediately lose access to the system.
          </p>
          <div className="modal-actions">
            <button
              type="button"
              className="button button-outline button-small"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="button button-primary button-small"
              style={{ background: '#d9534f', borderColor: '#d9534f' }}
              disabled={deleteUserMutation.isPending}
              onClick={() => deleteUserMutation.mutate(deleteTarget.id)}
            >
              {deleteUserMutation.isPending ? 'Deleting…' : 'Delete user'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function CreateUser() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast, notify } = useToast();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const schema = z
    .object({
      name: z.string().min(2, 'Name must be at least 2 characters.').max(255),
      email: z.string().email('Enter a valid email address.'),
      password: z.string().min(8, 'Password must be at least 8 characters.'),
      password_confirmation: z.string().min(8, 'Confirm your password.'),
      role: z.enum(['admin', 'staff']).default('admin'),
    })
    .refine((data) => data.password === data.password_confirmation, {
      message: 'Passwords do not match.',
      path: ['password_confirmation'],
    });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { role: 'admin' },
  });

  const submit = handleSubmit(async (values) => {
    setError('');
    try {
      await api.post('/users', {
        name: values.name,
        email: values.email,
        password: values.password,
        role: values.role,
      });
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      notify('Administrator created successfully!');
      reset();
      navigate('/users');
    } catch (reason) {
      setError(messageFromError(reason));
    }
  });

  return (
    <>
      <PageHeading
        eyebrow="ADMINISTRATION"
        title="Create New User"
        subtitle="Create an administrator account to grant access to the website dashboard."
        action={
          <Link className="button button-outline" to="/users">
            <ArrowLeft size={15} /> Back to All User
          </Link>
        }
      />
      {toast && <Toast toast={toast} />}
      {error && <div className="form-alert">{error}</div>}

      <div className="card settings-card" style={{ maxWidth: 680 }}>
        <div className="card-heading">
          <div>
            <h3>Administrator credentials</h3>
            <p>New administrators can sign in at the login page using this email and password.</p>
          </div>
          <ShieldCheck size={20} style={{ color: '#4779e8' }} />
        </div>

        <form onSubmit={submit} className="form-stack">
          <Field label="Full name" required error={errors.name?.message}>
            <input
              placeholder="e.g. Tanvir Ahmed"
              autoComplete="name"
              {...register('name')}
            />
          </Field>

          <Field label="Email address" required error={errors.email?.message}>
            <input
              type="email"
              placeholder="e.g. admin@tabassumenglish.com"
              autoComplete="username"
              {...register('email')}
            />
          </Field>

          <div className="form-grid">
            <Field label="Password" required error={errors.password?.message}>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 8 characters"
                  autoComplete="new-password"
                  {...register('password')}
                  style={{ paddingRight: 36 }}
                />
                <button
                  type="button"
                  className="icon-button"
                  style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', padding: 4 }}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </Field>

            <Field label="Confirm password" required error={errors.password_confirmation?.message}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm password"
                autoComplete="new-password"
                {...register('password_confirmation')}
              />
            </Field>
          </div>

          <Field label="Account role" required error={errors.role?.message}>
            <select {...register('role')}>
              <option value="admin">Administrator (Full Access)</option>
              <option value="staff">Staff (Limited Access)</option>
            </select>
          </Field>

          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button
              type="submit"
              className="button button-primary"
              disabled={isSubmitting}
            >
              <UserPlus size={15} />
              {isSubmitting ? 'Creating admin…' : 'Create Admin User'}
            </button>
            <Link to="/users" className="button button-outline">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}

function Pagination({ meta, page, setPage }) {
  if (!meta || meta.last_page < 2) return null;
  return <div className="pagination"><span>Showing {meta.from}–{meta.to} of {meta.total}</span><div><button className="icon-button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft size={16} /></button><span>Page {page} of {meta.last_page}</span><button className="icon-button" aria-label="Next page" disabled={page >= meta.last_page} onClick={() => setPage(page + 1)}><ChevronRight size={16} /></button></div></div>;
}

export default App;
