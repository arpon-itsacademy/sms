import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Activity, AlertCircle, ArrowDownToLine, ArrowLeft, BookOpen, CalendarCheck, CalendarDays, ChartNoAxesCombined,
  Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, ClipboardList, CreditCard, Eye, EyeOff, GraduationCap, LayoutDashboard,
  LogOut, Menu, MessageSquare, Palette, Plus, RefreshCw, Search, Send, Settings, ShieldCheck, SlidersHorizontal, Sparkles, Trash2, UserPlus, Users, X,
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
  const getActiveMenuFromPath = (path) => {
    if (path.startsWith('/attendance')) return 'Attendance';
    if (path.startsWith('/sms')) return 'SMS Operation';
    if (path.startsWith('/users')) return 'User';
    if (path.startsWith('/appearance')) return 'Appearance';
    if (path.startsWith('/settings')) return 'Settings';
    return null;
  };

  const [openMenu, setOpenMenu] = useState(getActiveMenuFromPath(location.pathname));

  useEffect(() => {
    const matched = getActiveMenuFromPath(location.pathname);
    if (matched) {
      setOpenMenu(matched);
    }
  }, [location.pathname]);

  const getBreadcrumbTitle = (path) => {
    if (path === '/') return 'Dashboard';
    if (path === '/students') return 'Students';
    if (path.startsWith('/students/')) return 'Student profile';
    if (path === '/batches') return 'Batches';
    if (path.startsWith('/batches/')) return 'Batch details';
    if (path === '/attendance/take' || path === '/attendance') return 'Take Attendance';
    if (path === '/attendance/history') return 'Attendance History';
    if (path.startsWith('/attendance')) return 'Attendance';
    if (path === '/fees') return 'Fees & income';
    if (path === '/exams') return 'Exams & results';
    if (path.includes('/marks')) return 'Marks entry';
    if (path === '/results') return 'Results';
    if (path === '/reports') return 'Reports';
    if (path === '/sms/templates') return 'SMS Template';
    if (path === '/sms/automation') return 'SMS Automation';
    if (path === '/sms/bulk') return 'Bulk SMS';
    if (path.startsWith('/sms')) return 'SMS Operation';
    if (path === '/users') return 'All User';
    if (path === '/users/create') return 'Create New User';
    if (path.startsWith('/appearance')) return 'Appearance';
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

  useEffect(() => {
    const fontSize = brandSettings?.font_size || 'medium';
    document.documentElement.setAttribute('data-font-size', fontSize);
  }, [brandSettings?.font_size]);

  useEffect(() => {
    if (brandSettings?.favicon_url) {
      let link = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = brandSettings.favicon_url;
    }
  }, [brandSettings?.favicon_url]);

  useEffect(() => {
    if (brandSettings?.institution_name) {
      document.title = `${brandSettings.institution_name} — Coaching Manager`;
    }
  }, [brandSettings?.institution_name]);

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
    {
      label: 'Attendance',
      icon: CalendarCheck,
      sublinks: [
        { to: '/attendance/take', label: 'Take Attendance', icon: CalendarCheck },
        { to: '/attendance/history', label: 'Attendance History', icon: CalendarDays },
      ],
    },
    { to: '/fees', label: 'Fees & income', icon: CreditCard },
    { to: '/exams', label: 'Exams & results', icon: ClipboardList },
    { to: '/reports', label: 'Reports', icon: ChartNoAxesCombined },
    {
      label: 'SMS Operation',
      icon: Send,
      sublinks: [
        { to: '/sms/bulk', label: 'Bulk SMS', icon: Send },
        { to: '/sms/templates', label: 'SMS Template', icon: ClipboardList },
        { to: '/sms/automation', label: 'SMS Automation', icon: Sparkles },
      ],
    },
    {
      label: 'User',
      icon: ShieldCheck,
      sublinks: [
        { to: '/users/create', label: 'Create New User', icon: UserPlus },
        { to: '/users', label: 'All User', icon: Users, end: true },
      ],
    },
    {
      label: 'Appearance',
      icon: Palette,
      sublinks: [
        { to: '/appearance/general', label: 'General', icon: SlidersHorizontal },
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
              const isMenuOpen = openMenu === item.label;
              const isGroupActive = item.sublinks.some((sub) => sub.end ? location.pathname === sub.to : location.pathname.startsWith(sub.to));
              return (
                <div key={item.label} className="nav-group">
                  <button
                    type="button"
                    className={`nav-group-trigger ${isGroupActive ? 'active-parent' : ''}`}
                    onClick={() => {
                      if (collapsed) setCollapsed(false);
                      setOpenMenu((current) => (current === item.label ? null : item.label));
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
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => {
                  setMobileOpen(false);
                  setOpenMenu(null);
                }}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={19} strokeWidth={1.8} /><span>{item.label}</span>{item.label === 'Students' && <span className="nav-dot" />}
              </NavLink>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
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
            <Route path="/attendance" element={<Navigate to="/attendance/take" replace />} />
            <Route path="/attendance/take" element={<TakeAttendancePage />} />
            <Route path="/attendance/history" element={<AttendanceHistoryPage />} />
            <Route path="/fees" element={<FeesPage />} />
            <Route path="/exams" element={<Exams />} />
            <Route path="/exams/:id/marks" element={<MarksEntry />} />
            <Route path="/results" element={<Results />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/sms" element={<Navigate to="/sms/bulk" replace />} />
            <Route path="/sms/bulk" element={<BulkSmsPage />} />
            <Route path="/sms/templates" element={<SmsTemplatePage />} />
            <Route path="/sms/template" element={<Navigate to="/sms/templates" replace />} />
            <Route path="/sms/automation" element={<SmsAutomationPage />} />
            <Route path="/users" element={<AllUsers currentUser={user} />} />
            <Route path="/users/create" element={<CreateUser />} />
            <Route path="/appearance" element={<Navigate to="/appearance/general" replace />} />
            <Route path="/appearance/general" element={<AppearanceGeneral brandSettings={brandSettings} />} />
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
      <section className="card schedule-card"><div className="card-heading"><div><h3>Today’s schedule</h3><p>{data.today_schedule.length} classes scheduled today</p></div><Link className="text-link" to="/attendance/take">Take attendance <ChevronRight size={15} /></Link></div>
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

function TakeAttendancePage() {
  const [batchId, setBatchId] = useState('');
  const [date, setDate] = useState(dateToday());
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const { toast, notify } = useToast();
  const queryClient = useQueryClient();

  const { data: batches } = useQuery({
    queryKey: ['batches', 'active'],
    queryFn: async () => (await api.get('/batches', { params: { status: 'active', per_page: 100 } })).data.data,
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
      await api.put('/attendance-sessions', {
        batch_id: Number(batchId),
        session_date: date,
        records: rows.map(({ id, status, remarks }) => ({ student_id: id, status: status || null, remarks: remarks || null }))
      });
      notify('Attendance saved successfully.');
      queryClient.invalidateQueries({ queryKey: ['attendance-history'] });
      await load();
    } catch (reason) { setError(messageFromError(reason)); }
  };

  return (
    <>
      <PageHeading
        eyebrow="CLASSROOM TRACKER"
        title="Take Attendance"
        subtitle="Select a batch and date to record attendance for each student."
        action={
          <Link className="button button-outline" to="/attendance/history">
            <CalendarDays size={15} /> View Attendance History
          </Link>
        }
      />
      {toast && <Toast toast={toast} />}

      <section className="card attendance-filter">
        <div>
          <div className="form-section-title">Select Class Session</div>
          <p>Choose the batch and date to load enrolled students.</p>
        </div>
        <div className="attendance-controls">
          <Field label="Batch">
            <select value={batchId} onChange={(event) => { setBatchId(event.target.value); setRows([]); }}>
              <option value="">Select batch…</option>
              {batches?.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}
            </select>
          </Field>
          <Field label="Class date">
            <input type="date" value={date} max={dateToday()} onChange={(event) => { setDate(event.target.value); setRows([]); }} />
          </Field>
          <button className="button button-primary" onClick={load}>
            Load students
          </button>
        </div>
      </section>

      {error && <div className="form-alert">{error}</div>}

      {!!rows.length && (
        <section className="card data-card attendance-card">
          <div className="table-toolbar">
            <div>
              <h3>
                {batches?.find((batch) => String(batch.id) === String(batchId))?.name}{' '}
                <span className="dot-separator">·</span> {fmtDate(date)}
              </h3>
              <p>{rows.length} enrolled students</p>
            </div>
            <div className="toolbar-controls">
              <button className="button button-outline button-small" onClick={() => setRows(rows.map((row) => ({ ...row, status: 'present' })))}>
                Mark all present
              </button>
              <button className="button button-outline button-small" onClick={() => setRows(rows.map((row) => ({ ...row, status: 'absent' })))}>
                Mark all absent
              </button>
              <button className="button button-quiet button-small" onClick={load}>
                Reset changes
              </button>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>STUDENT</th>
                  <th>ROLL</th>
                  <th>ATTENDANCE STATUS</th>
                  <th>REMARKS</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span className="student-cell">
                        <span className="avatar">{initials(row.name)}</span>
                        <strong>{row.name}</strong>
                      </span>
                    </td>
                    <td className="mono">{row.roll_number}</td>
                    <td>
                      <select
                        className={`attendance-select ${row.status}`}
                        value={row.status}
                        onChange={(event) => updateRow(row.id, 'status', event.target.value)}
                      >
                        <option value="">Unmarked</option>
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="late">Late</option>
                        <option value="excused">Excused</option>
                      </select>
                    </td>
                    <td>
                      <input
                        className="table-input"
                        value={row.remarks}
                        placeholder="Optional note"
                        onChange={(event) => updateRow(row.id, 'remarks', event.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-footer">
            <span>Unmarked students are not counted in attendance statistics.</span>
            <button className="button button-primary" onClick={save}>
              <Check size={16} /> Save attendance
            </button>
          </div>
        </section>
      )}

      {rows.length === 0 && batchId && (
        <div className="card empty-card">
          <EmptyState title="Click 'Load students' to begin" text="Students enrolled in this batch on the selected date will be loaded." />
        </div>
      )}

      {rows.length === 0 && !batchId && (
        <div className="card empty-card">
          <EmptyState title="Choose a batch to start" text="Select a batch and date above, then click 'Load students' to take attendance." />
        </div>
      )}
    </>
  );
}

function AttendanceHistoryPage() {
  const [historyFilters, setHistoryFilters] = useState({ batch_id: '', student_id: '', from: '', to: '', status: '' });
  const { toast } = useToast();

  const { data: batches } = useQuery({
    queryKey: ['batches', 'active'],
    queryFn: async () => (await api.get('/batches', { params: { status: 'active', per_page: 100 } })).data.data,
  });

  const { data: students } = useQuery({
    queryKey: ['students', 'attendance-filter'],
    queryFn: async () => (await api.get('/students', { params: { per_page: 100 } })).data.data,
  });

  const { data: history, isLoading } = useQuery({
    queryKey: ['attendance-history', historyFilters],
    queryFn: async () => (await api.get('/attendance/history', { params: Object.fromEntries(Object.entries(historyFilters).filter(([, value]) => value)) })).data,
  });

  const resetFilters = () => {
    setHistoryFilters({ batch_id: '', student_id: '', from: '', to: '', status: '' });
  };

  return (
    <>
      <PageHeading
        eyebrow="CLASSROOM TRACKER"
        title="Attendance History"
        subtitle="Review past attendance records, trends, and individual student logs."
        action={
          <Link className="button button-primary" to="/attendance/take">
            <CalendarCheck size={15} /> Take Attendance
          </Link>
        }
      />
      {toast && <Toast toast={toast} />}

      <section className="card data-card history-card" style={{ marginTop: 0 }}>
        <div className="card-heading">
          <div>
            <h3>Attendance Log & Summary</h3>
            <p>Excused and unmarked records are excluded from attendance percentages.</p>
          </div>
          <div className="history-stats">
            {!isLoading && (
              <>
                <span><b>{history?.summary?.present || 0}</b> Present</span>
                <span><b>{history?.summary?.absent || 0}</b> Absent</span>
                <span><b>{history?.summary?.percentage || 0}%</b> Attendance</span>
              </>
            )}
          </div>
        </div>

        <div className="history-filter-row">
          <select
            aria-label="Filter attendance by batch"
            value={historyFilters.batch_id}
            onChange={(event) => setHistoryFilters({ ...historyFilters, batch_id: event.target.value })}
            style={{ minWidth: '150px' }}
          >
            <option value="">All batches</option>
            {batches?.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}
          </select>

          <select
            aria-label="Filter attendance by student"
            value={historyFilters.student_id}
            onChange={(event) => setHistoryFilters({ ...historyFilters, student_id: event.target.value })}
            style={{ minWidth: '180px' }}
          >
            <option value="">All students</option>
            {students?.map((student) => <option key={student.id} value={student.id}>{student.roll_number} · {student.name}</option>)}
          </select>

          <input
            aria-label="Attendance from date"
            type="date"
            value={historyFilters.from}
            onChange={(event) => setHistoryFilters({ ...historyFilters, from: event.target.value })}
            title="From Date"
          />

          <input
            aria-label="Attendance through date"
            type="date"
            value={historyFilters.to}
            onChange={(event) => setHistoryFilters({ ...historyFilters, to: event.target.value })}
            title="To Date"
          />

          <select
            aria-label="Filter by attendance status"
            value={historyFilters.status}
            onChange={(event) => setHistoryFilters({ ...historyFilters, status: event.target.value })}
          >
            <option value="">All statuses</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
            <option value="excused">Excused</option>
          </select>

          {(historyFilters.batch_id || historyFilters.student_id || historyFilters.from || historyFilters.to || historyFilters.status) && (
            <button type="button" className="button button-quiet button-small" onClick={resetFilters}>
              Clear filters
            </button>
          )}
        </div>

        {isLoading ? (
          <TableSkeleton />
        ) : (
          <AttendanceHistory rows={history?.data?.data || []} />
        )}
      </section>
    </>
  );
}

function AttendancePage() {
  return <Navigate to="/attendance/take" replace />;
}

function Exams() {
  const [modal, setModal] = useState(false);
  const [sendResultExam, setSendResultExam] = useState(null);
  const [term, setTerm] = useState('');
  const { toast, notify } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ['exams', term], queryFn: async () => (await api.get('/exams', { params: { q: term || undefined, per_page: 100 } })).data });
  return <>
    <PageHeading eyebrow="ACADEMIC ASSESSMENT" title="Exams & results" subtitle="Plan assessments, enter marks and keep progress visible." action={<button className="button button-primary" onClick={() => setModal(true)}><Plus size={17} /> Create exam</button>} />
    {toast && <Toast toast={toast} />}
    <div className="section-shortcuts"><Link to="/results"><ChartNoAxesCombined size={16} /> Browse all results <ChevronRight size={15} /></Link></div>
    <section className="card data-card"><div className="table-toolbar"><div className="toolbar-search"><Search size={16} /><input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Search exam title or subject…" /></div><span className="result-count">{data?.meta?.total || 0} exams</span></div>
      {isLoading ? <TableSkeleton /> : isError ? <ErrorPage /> : data?.data?.length ? <div className="table-scroll"><table><thead><tr><th>EXAM</th><th>SUBJECT</th><th>DATE</th><th>TOTAL MARKS</th><th>BATCHES</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>{data.data.map((exam) => <tr key={exam.id}><td><strong>{exam.title}</strong><small className="table-sub">{exam.type.replace('_', ' ')}</small></td><td>{exam.subject}</td><td>{fmtDate(exam.exam_date)}</td><td>{exam.total_marks}</td><td><div className="batch-pills">{exam.batches?.map((batch) => <span className="pill" key={batch.id}>{batch.name}</span>)}</div></td><td><span className={`status-pill ${exam.status}`}>{exam.status}</span></td><td><div className="actions-cell"><Link className="row-action" to={`/exams/${exam.id}/marks`}>Enter marks</Link><Link className="row-action" to={`/results?exam=${exam.id}`}>Results</Link><button type="button" className="row-action" style={{ color: '#2563eb', fontWeight: 650, display: 'inline-flex', alignItems: 'center', gap: 3 }} onClick={() => setSendResultExam(exam)}><Send size={12} /> Send result</button></div></td></tr>)}</tbody></table></div> : <EmptyState title="No exams created" text="Create an exam and assign the batches taking part." action={<button className="button button-primary button-small" onClick={() => setModal(true)}><Plus size={15} /> Create exam</button>} />}
    </section>
    {modal && <ExamForm onClose={() => setModal(false)} onSaved={() => { setModal(false); queryClient.invalidateQueries({ queryKey: ['exams'] }); notify('Exam created.'); }} />}
    {sendResultExam && <SendResultModal exam={sendResultExam} onClose={() => setSendResultExam(null)} />}
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
  const [sendResultModalOpen, setSendResultModalOpen] = useState(false);
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
  return <><Link className="back-link" to="/exams"><ArrowLeft size={15} /> All exams</Link><PageHeading eyebrow={`${exam.subject} · ${fmtDate(exam.exam_date)}`} title={exam.title} subtitle={`Maximum score: ${exam.total_marks} marks · ${exam.status}`} action={<div style={{ display: 'flex', gap: 8 }}><button type="button" className="button button-primary" onClick={() => setSendResultModalOpen(true)}><Send size={15} /> Send Result SMS</button></div>} />
    {toast && <Toast toast={toast} />}
    <section className="card attendance-filter"><div><div className="form-section-title">Choose a batch</div><p>Marks remain a single result per student for this exam, even if they attend multiple selected batches.</p></div><div className="attendance-controls"><Field label="Exam batch"><select value={batchId} onChange={(event) => { setBatchId(event.target.value); setRows([]); }}><option value="">Select batch…</option>{exam.batches?.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}</select></Field><button className="button button-primary" onClick={() => load()}>Load students</button></div></section>
    {error && <div className="form-alert">{error}</div>}
    {!!rows.length && <section className="card data-card attendance-card"><div className="table-toolbar"><div className="toolbar-search"><Search size={16} /><input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Find a student…" /></div><span className="result-count">Total marks: {exam.total_marks}</span></div><div className="table-scroll"><table><thead><tr><th>STUDENT</th><th>ROLL</th><th>MAXIMUM</th><th>OBTAINED MARKS</th><th>RESULT STATUS</th></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.id}><td><span className="student-cell"><span className="avatar">{initials(row.name)}</span><strong>{row.name}</strong></span></td><td className="mono">{row.roll_number}</td><td>{exam.total_marks}</td><td><input className="marks-input" type="number" min="0" max={exam.total_marks} step="0.01" disabled={row.is_absent} value={row.is_absent ? '' : row.obtained_marks} placeholder="—" onChange={(event) => setRows(rows.map((item) => item.id === row.id ? { ...item, obtained_marks: event.target.value } : item))} /></td><td><label className="absent-toggle"><input type="checkbox" checked={row.is_absent} onChange={(event) => setRows(rows.map((item) => item.id === row.id ? { ...item, is_absent: event.target.checked, obtained_marks: '' } : item))} /> Mark absent</label></td></tr>)}</tbody></table></div><div className="table-footer"><span>Marks can be left blank; absent students are recorded separately from zero marks.</span><button className="button button-primary" onClick={save}><Check size={16} /> Save marks</button></div></section>}
    {!rows.length && batchId && <div className="card empty-card"><EmptyState title="Load the selected batch" text="Students enrolled on the exam date will appear here." /></div>}
    {sendResultModalOpen && exam && <SendResultModal exam={exam} onClose={() => setSendResultModalOpen(false)} />}
  </>;
}

function Results() {
  const [params] = useSearchParams();
  const [examId, setExamId] = useState(params.get('exam') || '');
  const [batchId, setBatchId] = useState('');
  const [sendResultExam, setSendResultExam] = useState(null);
  const { data: exams } = useQuery({ queryKey: ['exams'], queryFn: async () => (await api.get('/exams', { params: { per_page: 100 } })).data.data });
  const { data: batches } = useQuery({ queryKey: ['batches', 'all'], queryFn: async () => (await api.get('/batches', { params: { per_page: 100 } })).data.data });
  const { data, isLoading, isError } = useQuery({ queryKey: ['results', examId, batchId], queryFn: async () => (await api.get('/results', { params: { exam_id: examId || undefined, batch_id: batchId || undefined } })).data });
  const activeExam = examId && exams?.find((e) => String(e.id) === String(examId));
  return <>
    <PageHeading eyebrow="ACADEMIC RECORDS" title="Results" subtitle="Review marks and performance across all exams." action={<div style={{ display: 'flex', gap: 8 }}>{activeExam && <button type="button" className="button button-primary" onClick={() => setSendResultExam(activeExam)}><Send size={15} /> Send Result SMS</button>}<Link to="/exams" className="button button-outline"><ArrowLeft size={15} /> Exams</Link></div>} />
    <section className="card data-card"><div className="table-toolbar"><div className="toolbar-controls"><select value={examId} onChange={(event) => setExamId(event.target.value)}><option value="">All exams</option>{exams?.map((exam) => <option key={exam.id} value={exam.id}>{exam.title}</option>)}</select><select value={batchId} onChange={(event) => setBatchId(event.target.value)}><option value="">All batches</option>{batches?.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}</select></div><span className="result-count">{data?.meta?.total || 0} results</span></div>
      {isLoading ? <TableSkeleton /> : isError ? <ErrorPage /> : data?.data?.length ? <div className="table-scroll"><table><thead><tr><th>STUDENT</th><th>EXAM</th><th>BATCH</th><th>EXAM DATE</th><th>MARKS</th><th>PERCENTAGE</th><th>STATUS</th></tr></thead><tbody>{data.data.map((row) => <tr key={`${row.exam_id}-${row.student_id}`}><td><Link className="text-link" to={`/students/${row.student_id}`}>{row.student} <span className="table-sub">{row.roll_number}</span></Link></td><td>{row.exam}</td><td>{row.batch}</td><td>{fmtDate(row.exam_date)}</td><td>{row.is_absent ? 'Absent' : row.obtained_marks === null ? 'Not entered' : `${row.obtained_marks} / ${row.total_marks}`}</td><td>{row.percentage === null ? '—' : `${row.percentage}%`}</td><td><span className={`status-pill ${row.is_absent ? 'inactive' : row.obtained_marks === null ? 'draft' : 'active'}`}>{row.is_absent ? 'Absent' : row.obtained_marks === null ? 'Pending' : 'Scored'}</span></td></tr>)}</tbody></table></div> : <EmptyState title="No results to show" text="Enter student marks for an exam to see results here." action={<Link to="/exams" className="button button-primary button-small">Go to exams</Link>} />}
      {!!data?.data?.length && <div className="table-footer"><div className="toolbar-controls"><button className="button button-outline button-small" onClick={() => window.print()}><ArrowDownToLine size={15} /> Print results</button><button className="button button-outline button-small" onClick={() => window.open(`${API_ORIGIN}/api/reports/exams?export=1${examId ? `&exam_id=${examId}` : ''}${batchId ? `&batch_id=${batchId}` : ''}`, '_blank')}>Export CSV</button></div><span>Percentage = obtained marks ÷ total marks × 100.</span></div>}
    </section>
    {sendResultExam && <SendResultModal exam={sendResultExam} onClose={() => setSendResultExam(null)} />}
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
    <div className="report-cards"><div className="card report-card"><span className="report-icon report-blue"><Users size={18} /></span><h3>Student directory</h3><p>Export admission and contact records. Filters apply to the download.</p><button className="button button-outline button-small" onClick={exportStudents}>Download student CSV <ArrowDownToLine size={15} /></button></div><div className="card report-card"><span className="report-icon report-green"><CalendarCheck size={18} /></span><h3>Attendance summary</h3><p>Review recorded attendance across classes and dates.</p><div className="report-actions"><Link className="button button-outline button-small" to="/attendance/history">Open attendance history <ChevronRight size={15} /></Link><button className="button button-outline button-small" onClick={() => window.open(`${API_ORIGIN}/api/reports/attendance?export=1`, '_blank')}>Download CSV <ArrowDownToLine size={15} /></button></div></div><div className="card report-card"><span className="report-icon report-violet"><ClipboardList size={18} /></span><h3>Exam results</h3><p>Review marks, percentages, and student performance.</p><div className="report-actions"><Link className="button button-outline button-small" to="/results">Open exam results <ChevronRight size={15} /></Link><button className="button button-outline button-small" onClick={() => window.open(`${API_ORIGIN}/api/reports/exams?export=1`, '_blank')}>Download CSV <ArrowDownToLine size={15} /></button></div></div></div>
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

function AppearanceGeneral({ brandSettings }) {
  const queryClient = useQueryClient();
  const { toast, notify } = useToast();
  const [error, setError] = useState('');
  const [siteName, setSiteName] = useState(brandSettings?.institution_name || '');
  const [fontSize, setFontSize] = useState(brandSettings?.font_size || 'medium');
  const [logoFile, setLogoFile] = useState(null);
  const [faviconFile, setFaviconFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(brandSettings?.logo_url || null);
  const [faviconPreview, setFaviconPreview] = useState(brandSettings?.favicon_url || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (brandSettings) {
      setSiteName(brandSettings.institution_name || '');
      setFontSize(brandSettings.font_size || 'medium');
      setLogoPreview(brandSettings.logo_url || null);
      setFaviconPreview(brandSettings.favicon_url || null);
    }
  }, [brandSettings]);

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleFaviconChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFaviconFile(file);
      setFaviconPreview(URL.createObjectURL(file));
    }
  };

  const handleFontSizeChange = (size) => {
    setFontSize(size);
    document.documentElement.setAttribute('data-font-size', size);
  };

  const saveAppearance = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('institution_name', siteName);
      formData.append('font_size', fontSize);
      if (logoFile) formData.append('logo', logoFile);
      if (faviconFile) formData.append('favicon', faviconFile);
      formData.append('_method', 'PUT');

      const response = await api.post('/settings', formData);
      queryClient.setQueryData(['settings'], response.data.settings);
      setLogoFile(null);
      setFaviconFile(null);
      notify('Appearance settings saved successfully!');
    } catch (reason) {
      setError(messageFromError(reason));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHeading
        eyebrow="BRANDING & THEME"
        title="General Appearance"
        subtitle="Manage website name, coaching branding, browser tab favicon, and overall interface font size."
      />
      {toast && <Toast toast={toast} />}
      {error && <div className="form-alert">{error}</div>}

      <form onSubmit={saveAppearance} className="settings-grid">
        <div className="card settings-card form-stack">
          <div className="card-heading">
            <div>
              <h3>Website Branding</h3>
              <p>Configure the title and visual identities for your institution.</p>
            </div>
            <Palette size={20} style={{ color: '#4779e8' }} />
          </div>

          <Field label="Website / Coaching Name" required>
            <input
              type="text"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="e.g. Tabassum English Coaching"
              required
            />
          </Field>

          <Field label="Website Logo">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleLogoChange}
            />
            {logoPreview && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                <div style={{ width: 50, height: 50, borderRadius: 12, overflow: 'hidden', background: '#112846', display: 'grid', placeItems: 'center', padding: 4 }}>
                  <img src={logoPreview} alt="Logo preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>
                <small style={{ color: '#687b96' }}>Current header & sidebar logo</small>
              </div>
            )}
          </Field>

          <Field label="Browser Favicon (.ico, .png, .svg)">
            <input
              type="file"
              accept="image/x-icon,image/png,image/svg+xml,image/webp"
              onChange={handleFaviconChange}
            />
            {faviconPreview && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: 6, overflow: 'hidden', border: '1px solid #e1e7f0', display: 'grid', placeItems: 'center', background: '#fff', padding: 3 }}>
                  <img src={faviconPreview} alt="Favicon preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>
                <small style={{ color: '#687b96' }}>Icon displayed in the browser tab</small>
              </div>
            )}
          </Field>

          <button
            type="submit"
            className="button button-primary align-start"
            disabled={isSubmitting}
            style={{ marginTop: 8 }}
          >
            {isSubmitting ? 'Saving appearance…' : 'Save Appearance Settings'}
          </button>
        </div>

        <div className="settings-column">
          <div className="card settings-card form-stack">
            <div className="card-heading">
              <div>
                <h3>Interface Font Size</h3>
                <p>Select your preferred text scale for the entire website.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              {[
                { id: 'normal', label: 'Normal (14px)', desc: 'Standard compact view for high-DPI displays' },
                { id: 'medium', label: 'Medium (15px) — Default', desc: 'Comfortable & clean reading experience' },
                { id: 'large', label: 'Large (16.5px)', desc: 'High visibility, bigger text for tables and inputs' },
                { id: 'extra_large', label: 'Extra Large (18px)', desc: 'Maximum text scale for effortless viewing' },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`batch-select-card ${fontSize === opt.id ? 'selected' : ''}`}
                  onClick={() => handleFontSizeChange(opt.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <input
                    type="radio"
                    name="font_size_choice"
                    checked={fontSize === opt.id}
                    onChange={() => handleFontSizeChange(opt.id)}
                  />
                  <span>
                    <strong>{opt.label}</strong>
                    <small>{opt.desc}</small>
                  </span>
                </label>
              ))}
            </div>

            <div className="card" style={{ padding: 14, background: '#f8fafc', border: '1px dashed #cbd5e1', marginTop: 6 }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' }}>
                Live Typography Preview
              </div>
              <p style={{ margin: '0 0 6px', fontWeight: 600, color: '#1e293b' }}>
                {siteName || 'ClassDesk Coaching'} — Student Directory
              </p>
              <p style={{ margin: 0, color: '#64748b', lineHeight: 1.5 }}>
                Roll: STD-000001 · Class 10 · English First Paper · Attendance: 95%
              </p>
            </div>
          </div>
        </div>
      </form>
    </>
  );
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

function BulkSmsPage() {
  const queryClient = useQueryClient();
  const { toast, notify } = useToast();
  const textareaRef = useRef(null);

  const [targetType, setTargetType] = useState('all'); // 'all' | 'batch'
  const [selectedBatches, setSelectedBatches] = useState([]);
  const [recipients, setRecipients] = useState({
    student: true,
    father: false,
    mother: false,
  });
  const [batchDropdownOpen, setBatchDropdownOpen] = useState(false);
  const [batchSearch, setBatchSearch] = useState('');
  const [recipientDropdownOpen, setRecipientDropdownOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sendResult, setSendResult] = useState(null);

  // Preview Modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [isSending, setIsSending] = useState(false);

  // Settings & balance queries
  const { data: smsSettings } = useQuery({
    queryKey: ['sms-settings'],
    queryFn: async () => (await api.get('/settings/sms')).data.settings,
  });

  const { data: balanceData, refetch: refetchBalance, isFetching: isCheckingBalance } = useQuery({
    queryKey: ['sms-balance'],
    queryFn: async () => (await api.get('/settings/sms/balance')).data,
    retry: false,
  });

  const { data: batchesData, isLoading: isLoadingBatches } = useQuery({
    queryKey: ['batches-all'],
    queryFn: async () => (await api.get('/batches')).data,
  });

  const batches = batchesData?.data || [];

  // Unicode detection and SMS length calculator
  const isUnicode = Array.from(message).some((char) => char.charCodeAt(0) > 127);
  const charLength = message.length;
  const smsParts = charLength === 0 ? 0 : (isUnicode ? (charLength <= 70 ? 1 : Math.ceil(charLength / 67)) : (charLength <= 160 ? 1 : Math.ceil(charLength / 153)));

  const insertTag = (tag) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setMessage((prev) => prev + tag);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = message.substring(0, start);
    const after = message.substring(end);
    const next = before + tag + after;
    setMessage(next);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const handleToggleBatch = (id) => {
    setSelectedBatches((prev) =>
      prev.includes(id) ? prev.filter((bId) => bId !== id) : [...prev, id]
    );
  };

  const handleSelectAllBatches = () => {
    if (selectedBatches.length === batches.length) {
      setSelectedBatches([]);
    } else {
      setSelectedBatches(batches.map((b) => b.id));
    }
  };

  const activeRecipientTypes = Object.entries(recipients)
    .filter(([_, enabled]) => enabled)
    .map(([type]) => type);

  const handleOpenPreview = async () => {
    setError('');
    setSendResult(null);

    if (!message.trim()) {
      setError('Please write your SMS message before previewing or sending.');
      return;
    }

    if (activeRecipientTypes.length === 0) {
      setError('Please select at least one recipient type (Student, Father, or Mother).');
      return;
    }

    if (targetType === 'batch' && selectedBatches.length === 0) {
      setError('Please select at least one batch when using batch-wise SMS.');
      return;
    }

    setPreviewLoading(true);
    try {
      const res = await api.post('/sms/preview', {
        target_type: targetType,
        batch_ids: targetType === 'batch' ? selectedBatches : [],
        recipients: activeRecipientTypes,
        message: message.trim(),
      });
      setPreviewData(res.data);
      setPreviewOpen(true);
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirmSend = async () => {
    setIsSending(true);
    setError('');
    try {
      const res = await api.post('/sms/send-bulk', {
        target_type: targetType,
        batch_ids: targetType === 'batch' ? selectedBatches : [],
        recipients: activeRecipientTypes,
        message: message.trim(),
      });
      setPreviewOpen(false);
      setSendResult(res.data);
      notify(res.data.message || 'SMS broadcast dispatched successfully!');
      queryClient.invalidateQueries({ queryKey: ['sms-balance'] });
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <PageHeading
        eyebrow="SMS OPERATION"
        title="Bulk SMS Dispatch"
        subtitle="Send broadcast or personalized SMS to all students, specific batches, and their parents."
        action={
          <Link className="button button-outline" to="/settings/sms">
            <Settings size={15} /> SMS Gateway Config
          </Link>
        }
      />

      {toast && <Toast toast={toast} />}

      {/* Gateway Balance Strip */}
      <div className="sms-banner">
        <div>
          <strong style={{ fontSize: '14px', color: '#1c2b43', display: 'block', marginBottom: '2px' }}>
            BulkSMSBD Gateway Status
          </strong>
          <small style={{ fontSize: '12px', color: '#7a899e' }}>
            {smsSettings?.is_configured
              ? `Sender ID: ${smsSettings.sender_id || 'Configured'}`
              : 'BulkSMSBD gateway is not configured yet. Please configure it in Settings.'}
          </small>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {balanceData?.balance !== undefined ? (
            <div className="sms-balance-badge">
              <span>SMS Balance:</span>
              <strong>৳ {balanceData.balance}</strong>
            </div>
          ) : (
            <div className="sms-balance-badge" style={{ background: '#f5f7fa', borderColor: '#e2e7ef', color: '#68778f' }}>
              <span>Balance:</span>
              <strong>{balanceData?.error_message || '—'}</strong>
            </div>
          )}

          <button
            type="button"
            className="button button-quiet button-small"
            onClick={() => refetchBalance()}
            disabled={isCheckingBalance}
            title="Refresh SMS Balance"
          >
            <RefreshCw size={13} className={isCheckingBalance ? 'spin' : ''} />
            {isCheckingBalance ? 'Checking…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <div className="form-alert">{error}</div>}

      {sendResult && (
        <div
          className="card"
          style={{
            padding: '16px 20px',
            marginBottom: '20px',
            borderLeft: `4px solid ${sendResult.success ? '#1b9b70' : '#e65c5c'}`,
            background: sendResult.success ? '#f2fbf7' : '#fff5f5',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <strong style={{ color: sendResult.success ? '#1b9b70' : '#ca4141', fontSize: '14px' }}>
                {sendResult.success ? 'SMS Broadcast Completed' : 'SMS Broadcast Incomplete'}
              </strong>
              <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#526279' }}>{sendResult.message}</p>
            </div>
            <button
              type="button"
              className="button button-quiet button-small"
              onClick={() => setSendResult(null)}
            >
              <X size={14} /> Close
            </button>
          </div>
          {sendResult.errors && sendResult.errors.length > 0 && (
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#b33939' }}>
              <strong>Notice details:</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
                {sendResult.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="settings-grid">
        <div className="settings-card" style={{ position: 'relative' }}>
          {/* Transparent Backdrop to close open dropdowns on outside click */}
          {(batchDropdownOpen || recipientDropdownOpen) && (
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 35 }}
              onClick={() => {
                setBatchDropdownOpen(false);
                setRecipientDropdownOpen(false);
              }}
            />
          )}

          {/* Step 1: Target Audience Dropdown */}
          <div className="card-heading">
            <div>
              <h3>1. Target Audience</h3>
              <p>Choose whether to send to all active students or specific batches.</p>
            </div>
          </div>

          <div className="field" style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4a5970', marginBottom: '6px', display: 'block' }}>
              Target Audience Dropdown
            </label>
            <select
              value={targetType}
              onChange={(e) => {
                setTargetType(e.target.value);
                setBatchDropdownOpen(false);
              }}
              style={{
                width: '100%',
                height: '42px',
                fontSize: '13.5px',
                borderRadius: '8px',
                border: '1.5px solid #dbe2ea',
                padding: '0 12px',
                background: '#fff',
                color: '#1c2b43',
                fontWeight: 500,
              }}
            >
              <option value="all">👥 All Students (Send to all active students in institution)</option>
              <option value="batch">📚 Batch Wise (Filter and select specific batches)</option>
            </select>
          </div>

          {/* Select Batches: Multi-Select Dropdown */}
          {targetType === 'batch' && (
            <div className="field" style={{ position: 'relative', marginBottom: '16px', zIndex: batchDropdownOpen ? 40 : 2 }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4a5970', marginBottom: '6px', display: 'block' }}>
                Select Batches ({selectedBatches.length} of {batches.length} selected)
              </label>

              <button
                type="button"
                onClick={() => {
                  setRecipientDropdownOpen(false);
                  setBatchDropdownOpen((prev) => !prev);
                }}
                style={{
                  width: '100%',
                  minHeight: '42px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: `1.5px solid ${batchDropdownOpen ? '#4779e8' : '#dbe2ea'}`,
                  background: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  fontSize: '13.5px',
                  color: selectedBatches.length === 0 ? '#8b98a9' : '#1e293b',
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: batchDropdownOpen ? '0 0 0 3px rgba(71, 121, 232, 0.15)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {selectedBatches.length === batches.length && batches.length > 0 ? (
                    <span style={{ fontWeight: 600, color: '#2752a7' }}>All Batches Selected ({batches.length})</span>
                  ) : selectedBatches.length === 0 ? (
                    <span>Select Batches (0 of {batches.length} selected)...</span>
                  ) : (
                    <span>
                      <strong style={{ color: '#2752a7' }}>{selectedBatches.length} selected: </strong>
                      {batches.filter((b) => selectedBatches.includes(b.id)).map((b) => b.name).join(', ')}
                    </span>
                  )}
                </span>
                <ChevronDown size={16} style={{ transform: batchDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
              </button>

              {batchDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    zIndex: 50,
                    background: '#ffffff',
                    border: '1.5px solid #dbe2ea',
                    borderRadius: '9px',
                    boxShadow: '0 10px 30px rgba(20, 36, 61, 0.15)',
                    padding: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
                    <input
                      type="text"
                      placeholder="Search batches…"
                      value={batchSearch}
                      onChange={(e) => setBatchSearch(e.target.value)}
                      style={{
                        flex: 1,
                        height: '34px',
                        fontSize: '12.5px',
                        border: '1px solid #dbe2ea',
                        borderRadius: '6px',
                        padding: '0 10px',
                        outline: 'none',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="button button-quiet button-small"
                        onClick={handleSelectAllBatches}
                      >
                        {selectedBatches.length === batches.length ? 'Deselect All' : 'Select All'}
                      </button>
                      <button
                        type="button"
                        className="button button-quiet button-small"
                        onClick={() => setBatchDropdownOpen(false)}
                      >
                        Done
                      </button>
                    </div>
                  </div>

                  <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'grid', gap: '6px' }}>
                    {isLoadingBatches ? (
                      <div style={{ fontSize: '12px', color: '#7e8ea2', padding: '10px 0' }}>Loading batches…</div>
                    ) : batches.length === 0 ? (
                      <div style={{ fontSize: '12px', color: '#7e8ea2', padding: '10px 0' }}>No active batches found.</div>
                    ) : (
                      batches
                        .filter((b) => !batchSearch || b.name.toLowerCase().includes(batchSearch.toLowerCase()) || b.code?.toLowerCase().includes(batchSearch.toLowerCase()))
                        .map((batch) => {
                          const isChecked = selectedBatches.includes(batch.id);
                          return (
                            <label
                              key={batch.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '8px 10px',
                                borderRadius: '6px',
                                background: isChecked ? '#f0f5ff' : '#ffffff',
                                border: `1px solid ${isChecked ? '#b8d0fc' : '#edf1f7'}`,
                                cursor: 'pointer',
                                transition: 'background 0.15s',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleBatch(batch.id)}
                                style={{ width: '16px', height: '16px', accentColor: '#4779e8' }}
                              />
                              <span style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong style={{ fontSize: '13px', color: '#1c2b43' }}>{batch.name}</strong>
                                <small style={{ fontSize: '11px', color: '#7a899e' }}>
                                  {batch.code} {batch.subject ? `• ${batch.subject}` : ''}
                                </small>
                              </span>
                            </label>
                          );
                        })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Recipients Selection Dropdown (Multi-Select) */}
          <div className="card-heading" style={{ marginTop: '10px' }}>
            <div>
              <h3>2. Recipients (Who receives the SMS)</h3>
              <p>Select which contacts will receive the message for each student.</p>
            </div>
          </div>

          <div className="field" style={{ position: 'relative', marginBottom: '16px', zIndex: recipientDropdownOpen ? 40 : 2 }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4a5970', marginBottom: '6px', display: 'block' }}>
              Recipient Targets ({activeRecipientTypes.length} selected)
            </label>

            <button
              type="button"
              onClick={() => {
                setBatchDropdownOpen(false);
                setRecipientDropdownOpen((prev) => !prev);
              }}
              style={{
                width: '100%',
                minHeight: '42px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: `1.5px solid ${recipientDropdownOpen ? '#4779e8' : '#dbe2ea'}`,
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                fontSize: '13.5px',
                color: activeRecipientTypes.length === 0 ? '#8b98a9' : '#1e293b',
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: recipientDropdownOpen ? '0 0 0 3px rgba(71, 121, 232, 0.15)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {activeRecipientTypes.length === 0 ? (
                  <span>Select Recipients (None selected)...</span>
                ) : (
                  <span style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {recipients.student && (
                      <span className="pill pill-blue" style={{ fontSize: '11.5px', padding: '3px 9px' }}>
                        🎓 Student
                      </span>
                    )}
                    {recipients.father && (
                      <span className="pill pill-blue" style={{ fontSize: '11.5px', padding: '3px 9px' }}>
                        👨 Father
                      </span>
                    )}
                    {recipients.mother && (
                      <span className="pill pill-blue" style={{ fontSize: '11.5px', padding: '3px 9px' }}>
                        👩 Mother
                      </span>
                    )}
                  </span>
                )}
              </span>
              <ChevronDown size={16} style={{ transform: recipientDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
            </button>

            {recipientDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  right: 0,
                  zIndex: 50,
                  background: '#ffffff',
                  border: '1.5px solid #dbe2ea',
                  borderRadius: '9px',
                  boxShadow: '0 10px 30px rgba(20, 36, 61, 0.15)',
                  padding: '12px',
                }}
              >
                <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="button button-quiet button-small"
                    onClick={() => setRecipients({ student: true, father: true, mother: true })}
                  >
                    Select Everyone
                  </button>
                  <button
                    type="button"
                    className="button button-quiet button-small"
                    onClick={() => setRecipients({ student: true, father: false, mother: false })}
                  >
                    Student Only
                  </button>
                  <button
                    type="button"
                    className="button button-quiet button-small"
                    onClick={() => setRecipients({ student: false, father: true, mother: true })}
                  >
                    Parents Only
                  </button>
                  <button
                    type="button"
                    className="button button-quiet button-small"
                    style={{ marginLeft: 'auto' }}
                    onClick={() => setRecipientDropdownOpen(false)}
                  >
                    Done
                  </button>
                </div>

                <div style={{ display: 'grid', gap: '8px' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      background: recipients.student ? '#f0f5ff' : '#ffffff',
                      border: `1px solid ${recipients.student ? '#b8d0fc' : '#edf1f7'}`,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={recipients.student}
                      onChange={(e) => setRecipients({ ...recipients, student: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: '#4779e8' }}
                    />
                    <div>
                      <strong style={{ fontSize: '13.5px', color: '#1c2b43', display: 'block' }}>🎓 Student</strong>
                      <small style={{ fontSize: '11.5px', color: '#7a899e' }}>Send to student's personal phone number</small>
                    </div>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      background: recipients.father ? '#f0f5ff' : '#ffffff',
                      border: `1px solid ${recipients.father ? '#b8d0fc' : '#edf1f7'}`,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={recipients.father}
                      onChange={(e) => setRecipients({ ...recipients, father: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: '#4779e8' }}
                    />
                    <div>
                      <strong style={{ fontSize: '13.5px', color: '#1c2b43', display: 'block' }}>👨 Father</strong>
                      <small style={{ fontSize: '11.5px', color: '#7a899e' }}>Send to father's mobile number</small>
                    </div>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      background: recipients.mother ? '#f0f5ff' : '#ffffff',
                      border: `1px solid ${recipients.mother ? '#b8d0fc' : '#edf1f7'}`,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={recipients.mother}
                      onChange={(e) => setRecipients({ ...recipients, mother: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: '#4779e8' }}
                    />
                    <div>
                      <strong style={{ fontSize: '13.5px', color: '#1c2b43', display: 'block' }}>👩 Mother</strong>
                      <small style={{ fontSize: '11.5px', color: '#7a899e' }}>Send to mother's mobile number</small>
                    </div>
                  </label>
                </div>

                <div style={{ marginTop: '8px', fontSize: '11px', color: '#8b98a9', textAlign: 'right' }}>
                  * Numbers without contact info will be safely skipped.
                </div>
              </div>
            )}
          </div>

          {/* Step 3: Message Textarea & Dynamic Tags */}
          <div className="card-heading" style={{ marginTop: '16px' }}>
            <div>
              <h3>3. SMS Message & Dynamic Tags</h3>
              <p>Type your message. Click any tag below to insert personalized student information.</p>
            </div>
          </div>

          {/* Tag Toolbar */}
          <div className="sms-tag-toolbar">
            <span style={{ fontSize: '11.5px', fontWeight: 650, color: '#4a5b73', marginRight: '4px' }}>
              Insert Tag:
            </span>
            <button
              type="button"
              className="sms-tag-chip"
              onClick={() => insertTag('{student_name}')}
              title="Insert student's full name"
            >
              + {'{student_name}'} <span>(Name)</span>
            </button>
            <button
              type="button"
              className="sms-tag-chip"
              onClick={() => insertTag('{batch_name}')}
              title="Insert student's batch name"
            >
              + {'{batch_name}'} <span>(Batch)</span>
            </button>
            <button
              type="button"
              className="sms-tag-chip"
              onClick={() => insertTag('{father_name}')}
              title="Insert father's name"
            >
              + {'{father_name}'} <span>(Father)</span>
            </button>
            <button
              type="button"
              className="sms-tag-chip"
              onClick={() => insertTag('{mother_name}')}
              title="Insert mother's name"
            >
              + {'{mother_name}'} <span>(Mother)</span>
            </button>
            <button
              type="button"
              className="sms-tag-chip"
              onClick={() => insertTag('{school_name}')}
              title="Insert school name"
            >
              + {'{school_name}'} <span>(School)</span>
            </button>
            <button
              type="button"
              className="sms-tag-chip"
              onClick={() => insertTag('{roll_number}')}
              title="Insert roll number"
            >
              + {'{roll_number}'} <span>(Roll)</span>
            </button>
          </div>

          <div style={{ position: 'relative' }}>
            <textarea
              ref={textareaRef}
              rows={5}
              placeholder="e.g. Dear {student_name}, your class for {batch_name} will be held tomorrow at 4:00 PM. Best regards, Tabassum English."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px 8px 0 0',
                border: '1px solid #e3e8ef',
                borderBottom: 0,
                fontSize: '13.5px',
                lineHeight: 1.6,
                minHeight: '120px',
                outline: 'none',
              }}
            />
            <div className="sms-counter-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`status-pill ${isUnicode ? 'excused' : 'active'}`}>
                  {isUnicode ? '📝 Bangla / Unicode' : '🔤 Standard English (GSM)'}
                </span>
                <span>
                  Limit: <strong>{isUnicode ? '70' : '160'}</strong> chars/SMS
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>
                  Length: <strong>{charLength}</strong> characters
                </span>
                <span>
                  Credits: <strong>{smsParts} SMS</strong>
                </span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="button button-primary"
              style={{ padding: '10px 22px', fontSize: '13.5px' }}
              disabled={previewLoading || !message.trim()}
              onClick={handleOpenPreview}
            >
              <Send size={15} />
              {previewLoading ? 'Generating Preview…' : 'Review & Send SMS'}
            </button>
          </div>
        </div>

        {/* Right Column: Personalization Guide */}
        <div className="settings-column">
          <div className="card settings-card">
            <div className="card-heading">
              <div>
                <h3>Personalization Guide</h3>
                <p>How dynamic tags work during bulk delivery</p>
              </div>
              <Sparkles size={18} style={{ color: '#4779e8' }} />
            </div>

            <div style={{ display: 'grid', gap: '10px', fontSize: '12px', color: '#526279', lineHeight: 1.6 }}>
              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '7px', border: '1px solid #edf2f7' }}>
                <strong style={{ color: '#2c3e55', display: 'block', marginBottom: '2px' }}>{'{student_name}'}</strong>
                Replaced with each student's registered full name.
              </div>
              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '7px', border: '1px solid #edf2f7' }}>
                <strong style={{ color: '#2c3e55', display: 'block', marginBottom: '2px' }}>{'{batch_name}'}</strong>
                Replaced with the student's active batch title (e.g. "HSC 2026").
              </div>
              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '7px', border: '1px solid #edf2f7' }}>
                <strong style={{ color: '#2c3e55', display: 'block', marginBottom: '2px' }}>{'{father_name}'} & {'{mother_name}'}</strong>
                Replaced with father's or mother's name.
              </div>
              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '7px', border: '1px solid #edf2f7' }}>
                <strong style={{ color: '#2c3e55', display: 'block', marginBottom: '2px' }}>{'{school_name}'}</strong>
                Replaced with student's school or college name.
              </div>
            </div>

            <div className="info-note" style={{ marginTop: '10px' }}>
              <strong>BulkSMSBD Encoding:</strong>
              <p style={{ margin: '3px 0 0' }}>
                Messages with Bangla characters are sent as Unicode (70 chars per SMS). Standard English messages use 160 characters per SMS.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Preview & Confirmation Modal */}
      {previewOpen && previewData && (
        <Modal
          title="Review & Confirm Bulk SMS"
          wide={true}
          onClose={() => {
            if (!isSending) setPreviewOpen(false);
          }}
        >
          <div className="sms-preview-summary-grid">
            <div className="sms-preview-stat">
              <small>Target Students</small>
              <strong>{previewData.total_students}</strong>
            </div>
            <div className="sms-preview-stat">
              <small>Total Recipients</small>
              <strong>{previewData.total_recipients}</strong>
            </div>
            <div className="sms-preview-stat">
              <small>Unique Numbers</small>
              <strong>{previewData.unique_phone_count}</strong>
            </div>
            <div className="sms-preview-stat">
              <small>SMS Per Person</small>
              <strong style={{ color: '#4779e8' }}>
                {previewData.sms_parts} SMS ({previewData.is_unicode ? 'Unicode' : 'GSM'})
              </strong>
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <strong style={{ fontSize: '13px', color: '#1c2c44', display: 'block', marginBottom: '4px' }}>
              Personalized Message Samples ({previewData.samples?.length || 0} sample previews)
            </strong>
            <p style={{ fontSize: '12px', color: '#778699', margin: '0 0 12px' }}>
              This is how your message will appear when delivered to students and parents with their dynamic data:
            </p>

            <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'grid', gap: '10px' }}>
              {previewData.samples && previewData.samples.length > 0 ? (
                previewData.samples.map((sample, idx) => (
                  <div key={idx} className="sms-preview-item">
                    <div className="sms-preview-item-header">
                      <div>
                        <strong>{sample.student_name}</strong>
                        {sample.school_name ? ` • ${sample.school_name}` : ''}
                        {sample.batch_names ? ` (${sample.batch_names})` : ''}
                      </div>
                      <span className="pill pill-blue">
                        {sample.recipient_type}: {sample.phone}
                      </span>
                    </div>
                    <div className="sms-bubble">{sample.message}</div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                      <small style={{ fontSize: '11px', color: '#8897a8' }}>
                        Length: {sample.char_count} chars
                      </small>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state" style={{ minHeight: '120px' }}>
                  <p>No valid phone numbers found for the selected students.</p>
                </div>
              )}
            </div>
          </div>

          <div className="modal-actions" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#68778d' }}>
              Ready to send via BulkSMSBD API.
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="button button-outline"
                disabled={isSending}
                onClick={() => setPreviewOpen(false)}
              >
                Back to Edit
              </button>
              <button
                type="button"
                className="button button-primary"
                disabled={isSending || previewData.total_recipients === 0}
                onClick={handleConfirmSend}
              >
                <Send size={15} />
                {isSending ? 'Sending SMS Broadcast…' : `Confirm & Send (${previewData.total_recipients} Recipients)`}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function SendResultModal({ exam, onClose }) {
  const { toast, notify } = useToast();
  const [recipients, setRecipients] = useState({
    student: true,
    father: false,
    mother: false,
  });
  const [batchId, setBatchId] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(null);

  const [recipientDropdownOpen, setRecipientDropdownOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const batchesList = (previewData?.batches && previewData.batches.length > 0)
    ? previewData.batches
    : (exam.batches || []);

  const downloadExport = async (targetBatchId = null, targetBatchName = 'All_Batches') => {
    try {
      setIsExporting(true);
      const res = await api.get(`/exams/${exam.id}/export`, {
        params: targetBatchId ? { batch_id: targetBatchId } : {},
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      const cleanTitle = (exam.title || 'Exam').replace(/[^a-zA-Z0-9_-]/g, '_');
      const cleanBatch = (targetBatchName || 'All_Batches').replace(/[^a-zA-Z0-9_-]/g, '_');
      link.setAttribute('download', `Exam_Result_${cleanTitle}_${cleanBatch}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setExportDropdownOpen(false);
      notify(`Downloaded result Excel for ${targetBatchName || 'all batches'}.`);
    } catch (err) {
      notify('Failed to export exam results.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const activeRecipients = Object.entries(recipients)
    .filter(([_, v]) => v)
    .map(([k]) => k);

  const fetchPreview = async (selectedRecipients = activeRecipients, selectedBatch = batchId) => {
    if (selectedRecipients.length === 0) {
      setPreviewData(null);
      setPreviewError('Please select at least one recipient type (Student, Father, or Mother).');
      return;
    }
    setLoadingPreview(true);
    setPreviewError('');
    try {
      const res = await api.post(`/exams/${exam.id}/send-results/preview`, {
        batch_id: selectedBatch ? Number(selectedBatch) : null,
        recipients: selectedRecipients,
      });
      setPreviewData(res.data);
    } catch (err) {
      setPreviewError(messageFromError(err));
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    fetchPreview();
  }, [exam.id, batchId, recipients.student, recipients.father, recipients.mother]);

  const handleToggleRecipient = (type) => {
    setRecipients((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const handlePreset = (type) => {
    if (type === 'student') {
      setRecipients({ student: true, father: false, mother: false });
    } else if (type === 'parents') {
      setRecipients({ student: false, father: true, mother: true });
    } else if (type === 'all') {
      setRecipients({ student: true, father: true, mother: true });
    }
  };

  const handleSend = async () => {
    if (activeRecipients.length === 0) {
      setPreviewError('Please select at least one recipient type.');
      return;
    }
    setIsSending(true);
    setPreviewError('');
    try {
      const res = await api.post(`/exams/${exam.id}/send-results`, {
        batch_id: batchId ? Number(batchId) : null,
        recipients: activeRecipients,
      });
      setSendSuccess(res.data);
      notify(res.data.message || 'Exam results SMS sent successfully!');
    } catch (err) {
      setPreviewError(messageFromError(err));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal title={`Send Exam Result SMS — ${exam.title}`} onClose={onClose} wide>
      {toast && <Toast toast={toast} />}

      {sendSuccess ? (
        <div style={{ padding: '12px 0', display: 'grid', gap: '16px' }}>
          <div className="card" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', padding: '18px 20px', borderRadius: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#166534', marginBottom: '8px' }}>
              <Check size={20} />
              <strong style={{ fontSize: '15.5px' }}>SMS Broadcast Dispatched!</strong>
            </div>
            <p style={{ margin: 0, color: '#15803d', fontSize: '13.5px', lineHeight: 1.5 }}>
              {sendSuccess.message}
            </p>
          </div>

          <div className="sms-preview-summary-grid">
            <div className="sms-preview-stat">
              <small>Total Students</small>
              <strong>{sendSuccess.total_students}</strong>
            </div>
            <div className="sms-preview-stat">
              <small>SMS Delivered</small>
              <strong style={{ color: '#16a34a' }}>{sendSuccess.sent_count}</strong>
            </div>
            <div className="sms-preview-stat">
              <small>Failed</small>
              <strong style={{ color: sendSuccess.failed_count > 0 ? '#dc2626' : '#64748b' }}>{sendSuccess.failed_count}</strong>
            </div>
            <div className="sms-preview-stat">
              <small>Exam</small>
              <strong style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exam.title}</strong>
            </div>
          </div>

          {sendSuccess.errors && sendSuccess.errors.length > 0 && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', fontSize: '12.5px', color: '#991b1b' }}>
              <strong>Failed details:</strong>
              <ul style={{ margin: '6px 0 0', paddingLeft: '20px' }}>
                {sendSuccess.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="modal-actions" style={{ justifyContent: 'flex-end', marginTop: '12px' }}>
            <button type="button" className="button button-primary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '18px', position: 'relative' }}>
          {(recipientDropdownOpen || exportDropdownOpen) && (
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 35 }}
              onClick={() => {
                setRecipientDropdownOpen(false);
                setExportDropdownOpen(false);
              }}
            />
          )}

          {previewError && (
            <div className="card" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b', padding: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>{previewError}</span>
            </div>
          )}

          {/* Exam Summary Banner */}
          <div style={{ background: '#f8fafd', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#64748b', fontWeight: 650 }}>Assessment</div>
              <strong style={{ fontSize: '15px', color: '#0f172a' }}>{exam.title}</strong>
              <span style={{ marginLeft: '8px', fontSize: '12px', color: '#64748b' }}>({exam.subject} · Total: {exam.total_marks})</span>
            </div>
            {exam.batches && exam.batches.length > 1 && (
              <div style={{ minWidth: '180px' }}>
                <select
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', fontSize: '12.5px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="">All Batches ({exam.batches.length})</option>
                  {exam.batches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Recipient Selection & Export Controls */}
          <div className="card" style={{ padding: '16px', position: 'relative' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              {/* 1. Multi-select Recipients Dropdown */}
              <div style={{ flex: '1 1 320px', position: 'relative' }}>
                <label style={{ fontSize: '12px', fontWeight: 650, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Select Recipients (Who receives SMS)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setExportDropdownOpen(false);
                    setRecipientDropdownOpen((prev) => !prev);
                  }}
                  style={{
                    width: '100%',
                    minHeight: '42px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: `1.5px solid ${recipientDropdownOpen ? '#4779e8' : '#cbd5e1'}`,
                    background: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <Users size={16} color="#4779e8" />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                      {activeRecipients.length === 0 ? 'No recipient selected' : `Recipients (${activeRecipients.length} of 3):`}
                    </span>
                    {recipients.student && (
                      <span className="pill" style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: '11px', fontWeight: 600 }}>
                        🎓 Student
                      </span>
                    )}
                    {recipients.father && (
                      <span className="pill" style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: '11px', fontWeight: 600 }}>
                        👨 Father
                      </span>
                    )}
                    {recipients.mother && (
                      <span className="pill" style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: '11px', fontWeight: 600 }}>
                        👩 Mother
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    size={16}
                    style={{
                      transform: recipientDropdownOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s',
                      flexShrink: 0,
                      color: '#64748b',
                    }}
                  />
                </button>

                {recipientDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      right: 0,
                      zIndex: 50,
                      background: '#ffffff',
                      border: '1.5px solid #dbe2ea',
                      borderRadius: '9px',
                      boxShadow: '0 10px 30px rgba(20, 36, 61, 0.15)',
                      padding: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="button button-quiet button-small"
                        onClick={() => handlePreset('all')}
                        style={{ fontSize: '11px' }}
                      >
                        Select Everyone
                      </button>
                      <button
                        type="button"
                        className="button button-quiet button-small"
                        onClick={() => handlePreset('student')}
                        style={{ fontSize: '11px' }}
                      >
                        Student Only
                      </button>
                      <button
                        type="button"
                        className="button button-quiet button-small"
                        onClick={() => handlePreset('parents')}
                        style={{ fontSize: '11px' }}
                      >
                        Parents Only
                      </button>
                      <button
                        type="button"
                        className="button button-primary button-small"
                        style={{ marginLeft: 'auto', fontSize: '11px', padding: '4px 10px' }}
                        onClick={() => setRecipientDropdownOpen(false)}
                      >
                        Done
                      </button>
                    </div>

                    <div style={{ display: 'grid', gap: '8px' }}>
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          background: recipients.student ? '#f0f5ff' : '#ffffff',
                          border: `1px solid ${recipients.student ? '#b8d0fc' : '#edf1f7'}`,
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={recipients.student}
                          onChange={() => handleToggleRecipient('student')}
                          style={{ width: '16px', height: '16px', accentColor: '#4779e8' }}
                        />
                        <div>
                          <strong style={{ fontSize: '13px', display: 'block', color: '#1e293b' }}>Student</strong>
                          <small style={{ fontSize: '11.5px', color: '#64748b' }}>Send SMS to student's mobile number</small>
                        </div>
                      </label>

                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          background: recipients.father ? '#f0f5ff' : '#ffffff',
                          border: `1px solid ${recipients.father ? '#b8d0fc' : '#edf1f7'}`,
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={recipients.father}
                          onChange={() => handleToggleRecipient('father')}
                          style={{ width: '16px', height: '16px', accentColor: '#4779e8' }}
                        />
                        <div>
                          <strong style={{ fontSize: '13px', display: 'block', color: '#1e293b' }}>Father</strong>
                          <small style={{ fontSize: '11.5px', color: '#64748b' }}>Send SMS to father's contact number</small>
                        </div>
                      </label>

                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          background: recipients.mother ? '#f0f5ff' : '#ffffff',
                          border: `1px solid ${recipients.mother ? '#b8d0fc' : '#edf1f7'}`,
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={recipients.mother}
                          onChange={() => handleToggleRecipient('mother')}
                          style={{ width: '16px', height: '16px', accentColor: '#4779e8' }}
                        />
                        <div>
                          <strong style={{ fontSize: '13px', display: 'block', color: '#1e293b' }}>Mother</strong>
                          <small style={{ fontSize: '11.5px', color: '#64748b' }}>Send SMS to mother's contact number</small>
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Export Button with Batch selection dropdown */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <label style={{ fontSize: '12px', fontWeight: 650, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Export Result (Excel / CSV)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setRecipientDropdownOpen(false);
                    setExportDropdownOpen((prev) => !prev);
                  }}
                  style={{
                    height: '42px',
                    padding: '0 16px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderRadius: '8px',
                    border: `1.5px solid ${exportDropdownOpen ? '#4779e8' : '#cbd5e1'}`,
                    background: '#ffffff',
                    color: '#1e293b',
                    fontWeight: 650,
                    cursor: 'pointer',
                    fontSize: '13px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                >
                  <ArrowDownToLine size={16} color="#2563eb" />
                  <span>{isExporting ? 'Downloading…' : 'Export Excel'}</span>
                  <ChevronDown
                    size={15}
                    style={{
                      transform: exportDropdownOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s',
                      color: '#64748b',
                    }}
                  />
                </button>

                {exportDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      right: 0,
                      zIndex: 50,
                      minWidth: '260px',
                      background: '#ffffff',
                      border: '1.5px solid #dbe2ea',
                      borderRadius: '9px',
                      boxShadow: '0 10px 30px rgba(20, 36, 61, 0.15)',
                      padding: '8px',
                      display: 'grid',
                      gap: '4px',
                    }}
                  >
                    <div style={{ padding: '6px 10px 4px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Select Batch to Export:
                    </div>

                    <button
                      type="button"
                      disabled={isExporting}
                      onClick={() => downloadExport(null, 'All_Batches')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        background: '#f0fdf4',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontWeight: 650,
                        color: '#166534',
                        fontSize: '12.5px',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#dcfce7')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#f0fdf4')}
                    >
                      <span>📊 All Exam Batches ({batchesList.length || 1})</span>
                      <ArrowDownToLine size={14} color="#16a34a" />
                    </button>

                    {batchesList.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        disabled={isExporting}
                        onClick={() => downloadExport(b.id, b.name)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'transparent',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontWeight: 500,
                          color: '#334155',
                          fontSize: '12.5px',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <span>🎓 {b.name}</span>
                        <ArrowDownToLine size={14} color="#94a3b8" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          {loadingPreview ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
              Calculating merit ranks and preparing SMS preview…
            </div>
          ) : previewData ? (
            <>
              <div className="sms-preview-summary-grid">
                <div className="sms-preview-stat">
                  <small>Total Students</small>
                  <strong>{previewData.total_students}</strong>
                </div>
                <div className="sms-preview-stat">
                  <small>Total SMS Recipients</small>
                  <strong style={{ color: '#2563eb' }}>{previewData.total_recipients}</strong>
                </div>
                <div className="sms-preview-stat">
                  <small>Highest Score</small>
                  <strong style={{ color: '#16a34a' }}>{previewData.exam?.highest_marks ?? '—'}</strong>
                </div>
                <div className="sms-preview-stat">
                  <small>Encoding</small>
                  <strong style={{ fontSize: '14px' }}>
                    {previewData.is_unicode ? 'Unicode / Bangla' : 'Standard GSM'}
                  </strong>
                </div>
              </div>

              {/* Sample Previews */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <strong style={{ fontSize: '13px', color: '#334155' }}>
                    Message Preview ({previewData.samples?.length || 0} Sample Students)
                  </strong>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    Template configured in SMS Operation → SMS Automation
                  </span>
                </div>

                <div style={{ display: 'grid', gap: '10px', maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' }}>
                  {previewData.samples && previewData.samples.length > 0 ? (
                    previewData.samples.map((sample) => (
                      <div key={sample.student_id} className="sms-preview-item">
                        <div className="sms-preview-item-header">
                          <div>
                            <strong style={{ fontSize: '13px' }}>{sample.student_name}</strong>
                            <span style={{ marginLeft: '8px', fontSize: '11.5px', color: '#64748b' }}>
                              Roll: {sample.roll_number || '—'} · Marks: <strong>{sample.obtained_marks}</strong> · Position: <span className="pill" style={{ background: '#dbeafe', color: '#1e40af', fontWeight: 650 }}>{sample.merit_position}</span>
                            </span>
                          </div>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            {sample.phones?.length || 0} recipient number(s)
                          </span>
                        </div>
                        <div className="sms-bubble">
                          {sample.message}
                        </div>
                        {sample.destinations && sample.destinations.length > 0 && (
                          <div style={{ marginTop: '6px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {sample.destinations.map((d, i) => (
                              <span key={i} style={{ fontSize: '10.5px', background: '#f1f5f9', padding: '2px 7px', borderRadius: '4px', color: '#475569' }}>
                                {d.type}: {d.phone}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="empty-state" style={{ minHeight: '100px' }}>
                      <p>No student results or phone numbers found for this exam.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}

          <div className="modal-actions" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Results will be broadcasted using BulkSMSBD API.
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="button button-outline"
                disabled={isSending}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button button-primary"
                disabled={isSending || !previewData || previewData.total_recipients === 0}
                onClick={handleSend}
              >
                <Send size={15} />
                {isSending
                  ? 'Sending SMS…'
                  : `Send Result SMS (${previewData?.total_recipients || 0} Recipients)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function SmsTemplatePage() {
  const queryClient = useQueryClient();
  const { toast, notify } = useToast();
  const textareaRef = useRef(null);

  const [template, setTemplate] = useState('');
  const [defaultTemplate, setDefaultTemplate] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch saved template
  const { data, isLoading } = useQuery({
    queryKey: ['sms-template-exam-result'],
    queryFn: async () => {
      const res = await api.get('/settings/sms-templates');
      return res.data;
    },
  });

  useEffect(() => {
    if (data) {
      setTemplate(data.exam_result || '');
      setDefaultTemplate(data.default_template || '');
    }
  }, [data]);

  const insertTag = (tag) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setTemplate((prev) => prev + tag);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = template.substring(0, start);
    const after = template.substring(end);
    const next = before + tag + after;
    setTemplate(next);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const handleSave = async () => {
    setError('');
    if (!template.trim()) {
      setError('Please provide a message template.');
      return;
    }
    setIsSaving(true);
    try {
      await api.put('/settings/sms-templates', {
        exam_result: template.trim(),
      });
      queryClient.invalidateQueries({ queryKey: ['sms-template-exam-result'] });
      notify('Exam Result SMS template saved successfully.');
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (defaultTemplate) {
      setTemplate(defaultTemplate);
      notify('Template reset to default.');
    }
  };

  // Mock student data for live preview
  const mockStudent = {
    '{student_name}': 'Abrar Fahim',
    '{name}': 'Abrar Fahim',
    '{father_name}': 'Md. Rafiqul Islam',
    '{mother_name}': 'Nasrin Sultana',
    '{school_name}': 'Dhaka Residential Model College',
    '{school}': 'Dhaka Residential Model College',
    '{roll_number}': '101',
    '{roll}': '101',
    '{exam_name}': 'HSC Model Test 2026',
    '{exam}': 'HSC Model Test 2026',
    '{subject}': 'English 1st Paper',
    '{total_marks}': '100',
    '{obtained_marks}': '88',
    '{marks}': '88',
    '{highest_marks}': '94',
    '{highest_mark}': '94',
    '{merit_position}': '2nd',
    '{position}': '2nd',
    '{rank}': '2nd',
    '{batch_name}': 'Class 12 - Elite Batch',
    '{batch}': 'Class 12 - Elite Batch',
    '{institution_name}': 'Tabassum English Coaching',
  };

  const renderPreview = (tmpl) => {
    if (!tmpl) return 'Type your template above to preview the SMS output.';
    let output = tmpl;
    for (const [tag, val] of Object.entries(mockStudent)) {
      output = output.split(tag).join(val);
    }
    return output;
  };

  const isUnicode = Array.from(template).some((char) => char.charCodeAt(0) > 127);
  const charLength = template.length;
  const smsParts = charLength === 0 ? 0 : (isUnicode ? (charLength <= 70 ? 1 : Math.ceil(charLength / 67)) : (charLength <= 160 ? 1 : Math.ceil(charLength / 153)));

  const renderedPreviewText = renderPreview(template);
  const previewCharLength = renderedPreviewText.length;
  const previewIsUnicode = Array.from(renderedPreviewText).some((char) => char.charCodeAt(0) > 127);
  const previewParts = previewCharLength === 0 ? 0 : (previewIsUnicode ? (previewCharLength <= 70 ? 1 : Math.ceil(previewCharLength / 67)) : (previewCharLength <= 160 ? 1 : Math.ceil(previewCharLength / 153)));

  const availableTags = [
    { tag: '{student_name}', label: "Student's Name" },
    { tag: '{father_name}', label: "Father's Name" },
    { tag: '{mother_name}', label: "Mother's Name" },
    { tag: '{school_name}', label: 'School Name' },
    { tag: '{exam_name}', label: 'Exam Title' },
    { tag: '{subject}', label: 'Subject' },
    { tag: '{obtained_marks}', label: 'Obtained Marks' },
    { tag: '{total_marks}', label: 'Total Marks' },
    { tag: '{highest_marks}', label: 'Highest Marks' },
    { tag: '{merit_position}', label: 'Merit Position (1st, 2nd...)' },
    { tag: '{batch_name}', label: 'Batch Name' },
    { tag: '{institution_name}', label: 'Institution Name' },
  ];

  return (
    <>
      <PageHeading
        eyebrow="SMS OPERATION"
        title="SMS Template"
        subtitle="Configure templates for exam results and student notices with dynamic tags."
      />
      {toast && <Toast toast={toast} />}

      {error && (
        <div className="card" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b', padding: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="sms-automation-layout">
        {/* Editor Card */}
        <section className="card" style={{ padding: '20px', display: 'grid', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <ClipboardList size={18} color="#2563eb" />
              <strong style={{ fontSize: '15px' }}>Exam Result SMS Template</strong>
            </div>
            <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b' }}>
              This template will be used when you click <strong>Send Result</strong> on the Exams, Marks Entry, or Results pages.
            </p>
          </div>

          <div>
            <div style={{ fontSize: '11px', fontWeight: 650, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>
              Dynamic Tags (Click to insert):
            </div>
            <div className="sms-tag-toolbar">
              {availableTags.map((t) => (
                <button
                  key={t.tag}
                  type="button"
                  className="sms-tag-chip"
                  onClick={() => insertTag(t.tag)}
                  title={`Insert ${t.tag}`}
                >
                  {t.tag}
                  <span>({t.label})</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <textarea
              ref={textareaRef}
              rows={6}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              placeholder="e.g. Dear {student_name}, your result for {exam_name} ({subject}): Marks: {obtained_marks}/{total_marks}, Highest: {highest_marks}, Merit Position: {merit_position} in {batch_name}. {institution_name}"
              style={{
                width: '100%',
                borderRadius: '8px 8px 0 0',
                border: '1px solid #cbd5e1',
                padding: '12px 14px',
                fontSize: '13.5px',
                lineHeight: '1.6',
                fontFamily: 'inherit',
                outline: 'none',
                resize: 'vertical',
              }}
            />
            <div className="sms-counter-bar">
              <span style={{ color: '#64748b' }}>
                Template Characters: <strong>{charLength}</strong>
              </span>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span className="pill" style={{ background: isUnicode ? '#fef3c7' : '#e0f2fe', color: isUnicode ? '#92400e' : '#0369a1', fontWeight: 600 }}>
                  {isUnicode ? 'Unicode / Bangla' : 'Standard GSM'}
                </span>
                <span style={{ color: '#334155', fontWeight: 600 }}>
                  ~{smsParts} SMS {smsParts === 1 ? 'part' : 'parts'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
            <button
              type="button"
              className="button button-outline"
              onClick={handleReset}
              disabled={isSaving || !defaultTemplate || template === defaultTemplate}
            >
              <RefreshCw size={14} />
              Reset to Default
            </button>
            <button
              type="button"
              className="button button-primary"
              onClick={handleSave}
              disabled={isSaving || isLoading}
            >
              <Check size={16} />
              {isSaving ? 'Saving Template…' : 'Save Template'}
            </button>
          </div>
        </section>

        {/* Live Preview Card */}
        <section className="card" style={{ padding: '20px', display: 'grid', gap: '16px', background: '#fcfdfd' }}>
          <div>
            <strong style={{ fontSize: '15px', color: '#1e293b' }}>Live Student Output Preview</strong>
            <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#64748b' }}>
              How the actual SMS looks when delivered to a student / guardian:
            </p>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', display: 'grid', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <div>
                <strong style={{ fontSize: '13px', color: '#0f172a' }}>{mockStudent['{student_name}']}</strong>
                <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '6px' }}>Roll: {mockStudent['{roll_number}']}</span>
              </div>
              <span className="pill" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 650 }}>
                Merit: {mockStudent['{merit_position}']}
              </span>
            </div>

            <div className="sms-bubble" style={{ minHeight: '90px', fontSize: '13px', lineHeight: '1.6' }}>
              {renderedPreviewText}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: '#64748b' }}>
              <span>Preview chars: <strong>{previewCharLength}</strong></span>
              <span>Est. SMS parts: <strong>{previewParts}</strong> ({previewIsUnicode ? 'Unicode' : 'GSM'})</span>
            </div>
          </div>

          {/* Sample values table for transparency */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', fontSize: '12px' }}>
            <strong style={{ display: 'block', marginBottom: '8px', color: '#334155' }}>Mock Values Used in Preview:</strong>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', color: '#475569' }}>
              <div>• <code>{`{student_name}`}</code>: Abrar Fahim</div>
              <div>• <code>{`{exam_name}`}</code>: HSC Model Test</div>
              <div>• <code>{`{obtained_marks}`}</code>: 88</div>
              <div>• <code>{`{highest_marks}`}</code>: 94</div>
              <div>• <code>{`{merit_position}`}</code>: 2nd</div>
              <div>• <code>{`{batch_name}`}</code>: Class 12 - Elite</div>
              <div>• <code>{`{father_name}`}</code>: Md. Rafiqul Islam</div>
              <div>• <code>{`{school_name}`}</code>: Dhaka Residential</div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function SmsAutomationPage() {
  const queryClient = useQueryClient();
  const { toast, notify } = useToast();
  const absentTextareaRef = useRef(null);
  const feeTextareaRef = useRef(null);

  const [absentEnabled, setAbsentEnabled] = useState(false);
  const [absentRecipients, setAbsentRecipients] = useState({
    student: false,
    father: true,
    mother: true,
  });
  const [absentTemplate, setAbsentTemplate] = useState('');
  const [defaultAbsentTemplate, setDefaultAbsentTemplate] = useState('');

  const [feeEnabled, setFeeEnabled] = useState(false);
  const [feeRecipients, setFeeRecipients] = useState({
    student: true,
    father: true,
    mother: false,
  });
  const [feeTemplate, setFeeTemplate] = useState('');
  const [defaultFeeTemplate, setDefaultFeeTemplate] = useState('');

  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch automation settings
  const { data, isLoading } = useQuery({
    queryKey: ['sms-automation-settings'],
    queryFn: async () => {
      const res = await api.get('/settings/sms-automation');
      return res.data.settings;
    },
  });

  useEffect(() => {
    if (data) {
      setAbsentEnabled(Boolean(data.absent_sms_enabled));
      if (Array.isArray(data.absent_recipients)) {
        setAbsentRecipients({
          student: data.absent_recipients.includes('student'),
          father: data.absent_recipients.includes('father'),
          mother: data.absent_recipients.includes('mother'),
        });
      }
      setAbsentTemplate(data.absent_template || '');
      setDefaultAbsentTemplate(data.default_absent_template || '');

      setFeeEnabled(Boolean(data.fee_sms_enabled));
      if (Array.isArray(data.fee_recipients)) {
        setFeeRecipients({
          student: data.fee_recipients.includes('student'),
          father: data.fee_recipients.includes('father'),
          mother: data.fee_recipients.includes('mother'),
        });
      }
      setFeeTemplate(data.fee_template || '');
      setDefaultFeeTemplate(data.default_fee_template || '');
    }
  }, [data]);

  const insertAbsentTag = (tag) => {
    const textarea = absentTextareaRef.current;
    if (!textarea) {
      setAbsentTemplate((prev) => prev + tag);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = absentTemplate.substring(0, start);
    const after = absentTemplate.substring(end);
    setAbsentTemplate(before + tag + after);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const insertFeeTag = (tag) => {
    const textarea = feeTextareaRef.current;
    if (!textarea) {
      setFeeTemplate((prev) => prev + tag);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = feeTemplate.substring(0, start);
    const after = feeTemplate.substring(end);
    setFeeTemplate(before + tag + after);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const handleSave = async () => {
    setError('');
    const activeAbsent = Object.entries(absentRecipients).filter(([_, v]) => v).map(([k]) => k);
    const activeFee = Object.entries(feeRecipients).filter(([_, v]) => v).map(([k]) => k);

    if (absentEnabled && activeAbsent.length === 0) {
      setError('Please select at least one recipient type for Absent SMS.');
      return;
    }

    if (feeEnabled && activeFee.length === 0) {
      setError('Please select at least one recipient type for Fee Payment SMS.');
      return;
    }

    setIsSaving(true);
    try {
      await api.put('/settings/sms-automation', {
        absent_sms_enabled: absentEnabled,
        absent_recipients: activeAbsent.length ? activeAbsent : ['father'],
        absent_template: absentTemplate.trim() || defaultAbsentTemplate,
        fee_sms_enabled: feeEnabled,
        fee_recipients: activeFee.length ? activeFee : ['student'],
        fee_template: feeTemplate.trim() || defaultFeeTemplate,
      });
      queryClient.invalidateQueries({ queryKey: ['sms-automation-settings'] });
      notify('SMS Automation settings saved successfully.');
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetAbsent = () => {
    if (defaultAbsentTemplate) {
      setAbsentTemplate(defaultAbsentTemplate);
      notify('Absent SMS template reset to default.');
    }
  };

  const handleResetFee = () => {
    if (defaultFeeTemplate) {
      setFeeTemplate(defaultFeeTemplate);
      notify('Fee payment SMS template reset to default.');
    }
  };

  // Mock preview values
  const mockAbsentValues = {
    '{student_name}': 'Abrar Fahim',
    '{name}': 'Abrar Fahim',
    '{roll_number}': '101',
    '{roll}': '101',
    '{father_name}': 'Md. Rafiqul Islam',
    '{mother_name}': 'Nasrin Sultana',
    '{date}': '23 Nov 2026',
    '{batch_name}': 'Class 12 - Elite',
    '{batch}': 'Class 12 - Elite',
    '{institution_name}': 'Tabassum English Coaching',
  };

  const mockFeeValues = {
    '{student_name}': 'Abrar Fahim',
    '{name}': 'Abrar Fahim',
    '{roll_number}': '101',
    '{roll}': '101',
    '{amount}': '2,500.00',
    '{month}': 'November',
    '{year}': '2026',
    '{due_amount}': '0.00',
    '{balance}': '0.00',
    '{trx_id}': 'TRX-00124',
    '{batch_name}': 'Class 12 - Elite',
    '{batch}': 'Class 12 - Elite',
    '{institution_name}': 'Tabassum English Coaching',
  };

  const renderText = (tmpl, mock) => {
    if (!tmpl) return '';
    let out = tmpl;
    for (const [k, v] of Object.entries(mock)) {
      out = out.split(k).join(v);
    }
    return out;
  };

  const absentPreview = renderText(absentTemplate, mockAbsentValues);
  const feePreview = renderText(feeTemplate, mockFeeValues);

  const absentTags = [
    { tag: '{student_name}', label: 'Student' },
    { tag: '{roll_number}', label: 'Roll' },
    { tag: '{date}', label: 'Date' },
    { tag: '{batch_name}', label: 'Batch' },
    { tag: '{institution_name}', label: 'Coaching' },
    { tag: '{father_name}', label: 'Father' },
  ];

  const feeTags = [
    { tag: '{student_name}', label: 'Student' },
    { tag: '{amount}', label: 'Amount Tk' },
    { tag: '{month}', label: 'Month' },
    { tag: '{year}', label: 'Year' },
    { tag: '{due_amount}', label: 'Due Tk' },
    { tag: '{trx_id}', label: 'Trx ID' },
    { tag: '{institution_name}', label: 'Coaching' },
  ];

  return (
    <>
      <PageHeading
        eyebrow="SMS OPERATION"
        title="SMS Automation"
        subtitle="Configure automatic SMS triggers for absent attendance alerts and fee payments."
      />
      {toast && <Toast toast={toast} />}

      {error && (
        <div className="card" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b', padding: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: 'grid', gap: '24px' }}>
        {/* Rule 1: Absent Attendance Alert */}
        <section className="card" style={{ padding: '22px', display: 'grid', gap: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span className="pill" style={{ background: absentEnabled ? '#dcfce7' : '#f1f5f9', color: absentEnabled ? '#15803d' : '#64748b', fontWeight: 700, fontSize: '11px' }}>
                  {absentEnabled ? 'RULE ACTIVE' : 'RULE INACTIVE'}
                </span>
                <strong style={{ fontSize: '16px', color: '#0f172a' }}>1. Absent Attendance Auto SMS Alert</strong>
              </div>
              <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b' }}>
                Take Attendance পেজে কোনো শিক্ষার্থীকে <strong>Absent</strong> মার্ক করামাত্র স্বয়ংক্রিয়ভাবে অভিভাবকের কাছে SMS চলে যাবে।
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <div
            className={`automation-switch-wrap ${absentEnabled ? 'active' : ''}`}
            onClick={() => setAbsentEnabled(!absentEnabled)}
          >
            <div>
              <strong style={{ fontSize: '13.5px', color: absentEnabled ? '#1e40af' : '#334155', display: 'block' }}>
                Absent Alert Auto SMS: {absentEnabled ? 'Enabled (চালু আছে)' : 'Disabled (বন্ধ আছে)'}
              </strong>
              <small style={{ fontSize: '12px', color: '#64748b' }}>
                {absentEnabled
                  ? 'উপস্থিতি নেওয়ার সময় যারা অনুপস্থিত থাকবে, তাদের নির্বাচিত নম্বরে তাৎক্ষণিক মেসেজ চলে যাবে।'
                  : 'অনুপস্থিত শিক্ষার্থীদের ক্ষেত্রে কোনো স্বয়ংক্রিয় এসএমএস পাঠানো হবে না।'}
              </small>
            </div>
            <div className={`automation-switch ${absentEnabled ? 'active' : ''}`}>
              <div className="automation-switch-handle" />
            </div>
          </div>

          {/* Recipients Selection */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 650, color: '#334155', display: 'block', marginBottom: '8px' }}>
              Who Receives Absent SMS (কার কাছে মেসেজ যাবে):
            </label>
            <div className="automation-recipients-grid">
              <label className={`sms-choice-card ${absentRecipients.student ? 'active' : ''}`} style={{ padding: '10px 12px' }}>
                <input
                  type="checkbox"
                  checked={absentRecipients.student}
                  onChange={(e) => setAbsentRecipients({ ...absentRecipients, student: e.target.checked })}
                />
                <div className="sms-choice-content">
                  <strong>🎓 Student</strong>
                  <small>Student mobile</small>
                </div>
              </label>
              <label className={`sms-choice-card ${absentRecipients.father ? 'active' : ''}`} style={{ padding: '10px 12px' }}>
                <input
                  type="checkbox"
                  checked={absentRecipients.father}
                  onChange={(e) => setAbsentRecipients({ ...absentRecipients, father: e.target.checked })}
                />
                <div className="sms-choice-content">
                  <strong>👨 Father (Guardian)</strong>
                  <small>Father mobile</small>
                </div>
              </label>
              <label className={`sms-choice-card ${absentRecipients.mother ? 'active' : ''}`} style={{ padding: '10px 12px' }}>
                <input
                  type="checkbox"
                  checked={absentRecipients.mother}
                  onChange={(e) => setAbsentRecipients({ ...absentRecipients, mother: e.target.checked })}
                />
                <div className="sms-choice-content">
                  <strong>👩 Mother (Guardian)</strong>
                  <small>Mother mobile</small>
                </div>
              </label>
            </div>
          </div>

          {/* Template & Live Preview in two columns (stacks vertically on mobile) */}
          <div className="automation-template-preview-grid">
            <div>
              <div style={{ fontSize: '11px', fontWeight: 650, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>
                Absent SMS Template (Click tags to insert):
              </div>
              <div className="sms-tag-toolbar" style={{ marginBottom: '8px' }}>
                {absentTags.map((t) => (
                  <button
                    key={t.tag}
                    type="button"
                    className="sms-tag-chip"
                    onClick={() => insertAbsentTag(t.tag)}
                  >
                    {t.tag}
                  </button>
                ))}
              </div>
              <textarea
                ref={absentTextareaRef}
                rows={4}
                value={absentTemplate}
                onChange={(e) => setAbsentTemplate(e.target.value)}
                placeholder="Absent SMS template..."
                style={{
                  width: '100%',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '10px 12px',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  fontFamily: 'inherit',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button
                  type="button"
                  className="button button-quiet button-small"
                  onClick={handleResetAbsent}
                  disabled={!defaultAbsentTemplate || absentTemplate === defaultAbsentTemplate}
                  style={{ fontSize: '11px' }}
                >
                  <RefreshCw size={12} /> Reset Template
                </button>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 650, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>
                Live Output Preview:
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', minHeight: '90px' }}>
                <div className="sms-bubble" style={{ fontSize: '12.5px', lineHeight: '1.5', margin: 0 }}>
                  {absentPreview || 'Template preview...'}
                </div>
                <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Length: <strong>{absentPreview.length}</strong> chars</span>
                  <span className="pill" style={{ fontSize: '10.5px' }}>
                    {Array.from(absentPreview).some((c) => c.charCodeAt(0) > 127) ? 'Unicode' : 'GSM'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Rule 2: Fee Payment Auto SMS */}
        <section className="card" style={{ padding: '22px', display: 'grid', gap: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span className="pill" style={{ background: feeEnabled ? '#dcfce7' : '#f1f5f9', color: feeEnabled ? '#15803d' : '#64748b', fontWeight: 700, fontSize: '11px' }}>
                  {feeEnabled ? 'RULE ACTIVE' : 'RULE INACTIVE'}
                </span>
                <strong style={{ fontSize: '16px', color: '#0f172a' }}>2. Fee Payment Auto SMS Confirmation</strong>
              </div>
              <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b' }}>
                Fees & income পেজে কোনো শিক্ষার্থীর বেতন জমা দেওয়ার সাথে সাথেই শিক্ষার্থী বা অভিভাবকের কাছে কনফার্মেশন SMS চলে যাবে।
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <div
            className={`automation-switch-wrap ${feeEnabled ? 'active' : ''}`}
            onClick={() => setFeeEnabled(!feeEnabled)}
          >
            <div>
              <strong style={{ fontSize: '13.5px', color: feeEnabled ? '#1e40af' : '#334155', display: 'block' }}>
                Fee Payment Auto SMS: {feeEnabled ? 'Enabled (চালু আছে)' : 'Disabled (বন্ধ আছে)'}
              </strong>
              <small style={{ fontSize: '12px', color: '#64748b' }}>
                {feeEnabled
                  ? 'বেতন এন্ট্রি করার সাথে সাথে স্বয়ংক্রিয়ভাবে জমার রসিদ এসএমএস আকারে চলে যাবে।'
                  : 'বেতন নেওয়ার পর কোনো স্বয়ংক্রিয় এসএমএস পাঠানো হবে না।'}
              </small>
            </div>
            <div className={`automation-switch ${feeEnabled ? 'active' : ''}`}>
              <div className="automation-switch-handle" />
            </div>
          </div>

          {/* Recipients Selection */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 650, color: '#334155', display: 'block', marginBottom: '8px' }}>
              Who Receives Fee SMS (কার কাছে মেসেজ যাবে):
            </label>
            <div className="automation-recipients-grid">
              <label className={`sms-choice-card ${feeRecipients.student ? 'active' : ''}`} style={{ padding: '10px 12px' }}>
                <input
                  type="checkbox"
                  checked={feeRecipients.student}
                  onChange={(e) => setFeeRecipients({ ...feeRecipients, student: e.target.checked })}
                />
                <div className="sms-choice-content">
                  <strong>🎓 Student</strong>
                  <small>Student mobile</small>
                </div>
              </label>
              <label className={`sms-choice-card ${feeRecipients.father ? 'active' : ''}`} style={{ padding: '10px 12px' }}>
                <input
                  type="checkbox"
                  checked={feeRecipients.father}
                  onChange={(e) => setFeeRecipients({ ...feeRecipients, father: e.target.checked })}
                />
                <div className="sms-choice-content">
                  <strong>👨 Father (Guardian)</strong>
                  <small>Father mobile</small>
                </div>
              </label>
              <label className={`sms-choice-card ${feeRecipients.mother ? 'active' : ''}`} style={{ padding: '10px 12px' }}>
                <input
                  type="checkbox"
                  checked={feeRecipients.mother}
                  onChange={(e) => setFeeRecipients({ ...feeRecipients, mother: e.target.checked })}
                />
                <div className="sms-choice-content">
                  <strong>👩 Mother (Guardian)</strong>
                  <small>Mother mobile</small>
                </div>
              </label>
            </div>
          </div>

          {/* Template & Live Preview in two columns (stacks vertically on mobile) */}
          <div className="automation-template-preview-grid">
            <div>
              <div style={{ fontSize: '11px', fontWeight: 650, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>
                Fee SMS Template (Click tags to insert):
              </div>
              <div className="sms-tag-toolbar" style={{ marginBottom: '8px' }}>
                {feeTags.map((t) => (
                  <button
                    key={t.tag}
                    type="button"
                    className="sms-tag-chip"
                    onClick={() => insertFeeTag(t.tag)}
                  >
                    {t.tag}
                  </button>
                ))}
              </div>
              <textarea
                ref={feeTextareaRef}
                rows={4}
                value={feeTemplate}
                onChange={(e) => setFeeTemplate(e.target.value)}
                placeholder="Fee payment SMS template..."
                style={{
                  width: '100%',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '10px 12px',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  fontFamily: 'inherit',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button
                  type="button"
                  className="button button-quiet button-small"
                  onClick={handleResetFee}
                  disabled={!defaultFeeTemplate || feeTemplate === defaultFeeTemplate}
                  style={{ fontSize: '11px' }}
                >
                  <RefreshCw size={12} /> Reset Template
                </button>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 650, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>
                Live Output Preview:
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', minHeight: '90px' }}>
                <div className="sms-bubble" style={{ fontSize: '12.5px', lineHeight: '1.5', margin: 0 }}>
                  {feePreview || 'Template preview...'}
                </div>
                <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Length: <strong>{feePreview.length}</strong> chars</span>
                  <span className="pill" style={{ fontSize: '10.5px' }}>
                    {Array.from(feePreview).some((c) => c.charCodeAt(0) > 127) ? 'Unicode' : 'GSM'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Save Bar */}
        <div className="card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <span style={{ fontSize: '12.5px', color: '#64748b' }}>
            Automated SMS will be dispatched automatically using your BulkSMSBD credentials.
          </span>
          <button
            type="button"
            className="button button-primary"
            onClick={handleSave}
            disabled={isSaving || isLoading}
          >
            <Check size={16} />
            {isSaving ? 'Saving Rules…' : 'Save Automation Rules'}
          </button>
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
