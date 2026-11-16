import { useEffect, useState } from 'react';
import { Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import { BriefcaseBusiness, LayoutDashboard, Search, Users, FileText, LogOut, Plus, MapPin, Clock, Building2, CheckCircle2, XCircle, Menu, UserRound } from 'lucide-react';
import api from './api';

function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hirehub_user')); } catch { return null; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  function signOut() {
    localStorage.removeItem('hirehub_token');
    localStorage.removeItem('hirehub_user');
    setUser(null);
    navigate('/login');
  }

  const navItems = user ? (user.role === 'recruiter'
    ? [['/dashboard','Dashboard',LayoutDashboard],['/jobs','Manage jobs',BriefcaseBusiness],['/applications','Applicants',Users]]
    : user.role === 'admin'
    ? [['/dashboard','Dashboard',LayoutDashboard],['/jobs','All jobs',BriefcaseBusiness]]
    : [['/dashboard','Dashboard',LayoutDashboard],['/jobs','Find jobs',Search],['/applications','My applications',FileText],['/profile','My profile',UserRound]]) : [];

  return <div className="app-shell">
    <header className="topbar">
      <Link to="/" className="brand"><span className="brand-icon"><BriefcaseBusiness size={21}/></span> Hire<span>Hub</span></Link>
      <button className="mobile-menu" onClick={() => setMobileOpen(!mobileOpen)}><Menu/></button>
      <nav className={mobileOpen ? 'topnav open' : 'topnav'}>
        {user ? <><span className="welcome">Hi, {user.full_name}</span><button className="btn btn-outline btn-small" onClick={signOut}><LogOut size={15}/> Sign out</button></> :
          <><Link to="/login">Login</Link><Link className="btn btn-primary btn-small" to="/register">Get started</Link></>}
      </nav>
    </header>
    <div className="layout">
      {user && <aside className="sidebar">
        <div className="side-label">WORKSPACE</div>
        {navItems.map(([path,label,Icon]) => <Link key={path} to={path} className="side-link"><Icon size={18}/>{label}</Link>)}
        <div className="sidebar-bottom"><div className="avatar">{user.full_name?.[0]?.toUpperCase()}</div><div><strong>{user.full_name}</strong><small>{user.role}</small></div></div>
      </aside>}
      <main className={user ? 'main-content' : 'main-content full'} onClick={() => mobileOpen && setMobileOpen(false)}>
        <Routes>
          <Route path="/" element={user ? <Navigate to="/dashboard"/> : <Landing/>}/>
          <Route path="/login" element={user ? <Navigate to="/dashboard"/> : <AuthPage mode="login" onAuth={setUser}/>}/>
          <Route path="/register" element={user ? <Navigate to="/dashboard"/> : <AuthPage mode="register" onAuth={setUser}/>}/>
          <Route path="/dashboard" element={user ? <Dashboard user={user}/> : <Navigate to="/login"/>}/>
          <Route path="/jobs" element={user ? <Jobs user={user}/> : <Navigate to="/login"/>}/>
          <Route path="/applications" element={user ? <Applications user={user}/> : <Navigate to="/login"/>}/>
          <Route path="/profile" element={user ? <Profile/> : <Navigate to="/login"/>}/>
          <Route path="*" element={<Navigate to="/"/>}/>
        </Routes>
      </main>
    </div>
  </div>;
}

function Landing() {
  return <div className="landing">
    <div className="hero-copy"><div className="eyebrow"><span className="dot"/> YOUR CAREER STARTS HERE</div>
      <h1>Find work that<br/><span>moves you forward.</span></h1>
      <p>Connect talented people with great opportunities. Explore jobs, apply with confidence, and take the next step in your career.</p>
      <div className="hero-actions"><Link to="/register" className="btn btn-primary">Create free account</Link><Link to="/login" className="btn btn-outline">Sign in</Link></div>
      <div className="hero-proof"><div className="proof-avatars"><i>A</i><i>R</i><i>S</i></div><span>Simple recruitment. Smarter connections.</span></div>
    </div>
    <div className="hero-art"><div className="art-card main-art"><div className="art-top"><span className="mini-icon"><BriefcaseBusiness/></span><span className="pill green">Hiring now</span></div><h3>Frontend Developer</h3><p>BrightHire Technologies</p><div className="art-meta"><span><MapPin size={14}/> Gurugram</span><span><Clock size={14}/> Full-time</span></div><div className="art-bottom"><strong>₹25k – ₹45k <small>/ month</small></strong><span className="round-arrow">↗</span></div></div><div className="float-card"><CheckCircle2 color="#16a36a"/><div><strong>Application sent</strong><small>You're one step closer!</small></div></div><div className="art-orb"/></div>
    <div className="landing-stats"><div><strong>Easy</strong><span>Job discovery</span></div><div><strong>Secure</strong><span>Role-based access</span></div><div><strong>Connected</strong><span>Live database</span></div></div>
  </div>;
}

function AuthPage({mode,onAuth}) {
  const [form,setForm] = useState({full_name:'',email:'',password:'',role:'applicant',company_name:''});
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  const navigate = useNavigate();
  const isRegister = mode === 'register';
  async function submit(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      if (isRegister) {
        await api.post('/auth/register',form);
        setError('Account created! Please sign in.');
      } else {
        const {data} = await api.post('/auth/login',{email:form.email,password:form.password});
        localStorage.setItem('hirehub_token',data.token);
        localStorage.setItem('hirehub_user',JSON.stringify(data.user));
        onAuth(data.user); navigate('/dashboard');
      }
    } catch(err) { setError(err.response?.data?.message || 'Could not connect to server. Is the backend running?'); }
    finally { setBusy(false); }
  }
  return <div className="auth-wrap"><div className="auth-card"><div className="auth-heading"><span className="auth-icon"><BriefcaseBusiness/></span><h2>{isRegister?'Create your account':'Welcome back'}</h2><p>{isRegister?'Join HireHub and discover new opportunities.':'Sign in to continue to your workspace.'}</p></div>
    <form onSubmit={submit} className="form">
      {isRegister && <><label>Full name<input required value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})} placeholder="Your full name"/></label><label>I am a<select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option value="applicant">Applicant</option><option value="recruiter">Recruiter</option></select></label>{form.role==='recruiter' && <label>Company name<input value={form.company_name} onChange={e=>setForm({...form,company_name:e.target.value})} placeholder="Company name"/></label>}</>}
      <label>Email address<input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="you@example.com"/></label>
      <label>Password<input type="password" minLength="6" required value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="At least 6 characters"/></label>
      {error && <div className={error.startsWith('Account created')?'notice success':'notice error'}>{error}</div>}
      <button className="btn btn-primary btn-wide" disabled={busy}>{busy?'Please wait...':isRegister?'Create account':'Sign in'}</button>
    </form>
    <p className="auth-switch">{isRegister?'Already have an account?':'New to HireHub?'} <Link to={isRegister?'/login':'/register'}>{isRegister?'Sign in':'Create account'}</Link></p>
  </div></div>;
}

function Dashboard({user}) {
  const [stats,setStats] = useState(null);
  const [jobs,setJobs] = useState([]);
  const [apps,setApps] = useState([]);
  const [error,setError] = useState('');
  useEffect(()=>{(async()=>{
    try {
      if(user.role==='applicant') { const [j,a]=await Promise.all([api.get('/jobs'),api.get('/applications/mine')]); setJobs(j.data.slice(0,3)); setApps(a.data); }
      else if(user.role==='recruiter') { const [j,a]=await Promise.all([api.get('/recruiter/jobs'),api.get('/recruiter/applications')]); setJobs(j.data); setApps(a.data); setStats({jobs:j.data.length,applications:a.data.length,pending:a.data.filter(x=>x.status==='pending').length}); }
      else { const s=await api.get('/admin/summary'); setStats(s.data); }
    } catch(e){setError(e.response?.data?.message||'Unable to load dashboard data.');}
  })()},[user.role]);
  return <><PageTitle eyebrow="OVERVIEW" title={`Good day, ${user.full_name.split(' ')[0]} 👋`} subtitle="Here is what's happening in your recruitment workspace."/>
    {error&&<div className="notice error">{error}</div>}
    {user.role==='applicant' ? <><div className="stat-grid"><Stat icon={BriefcaseBusiness} label="Open opportunities" value={jobs.length+'+'}/><Stat icon={FileText} label="Applications sent" value={apps.length}/><Stat icon={CheckCircle2} label="Shortlisted" value={apps.filter(a=>a.status==='shortlisted').length}/></div><SectionTitle title="Recommended jobs" link="/jobs" linkText="Browse all jobs"/><JobGrid jobs={jobs}/><SectionTitle title="Recent applications" link="/applications" linkText="View all"/><ApplicationTable rows={apps.slice(0,4)}/></>
    : user.role==='recruiter' ? <><div className="stat-grid"><Stat icon={BriefcaseBusiness} label="Your job posts" value={stats?.jobs??'—'}/><Stat icon={Users} label="Total applicants" value={stats?.applications??'—'}/><Stat icon={Clock} label="Pending review" value={stats?.pending??'—'}/></div><SectionTitle title="Your job postings" link="/jobs" linkText="Manage jobs"/><JobGrid jobs={jobs.slice(0,3)}/><SectionTitle title="Recent applicants" link="/applications" linkText="Review applicants"/><ApplicationTable rows={apps.slice(0,5)} recruiter/></>
    : <><div className="stat-grid"><Stat icon={Users} label="Registered users" value={stats?.users??'—'}/><Stat icon={BriefcaseBusiness} label="Total jobs" value={stats?.jobs??'—'}/><Stat icon={FileText} label="Applications" value={stats?.applications??'—'}/><Stat icon={Building2} label="Recruiters" value={stats?.recruiters??'—'}/></div><div className="panel"><h3>Administrator access</h3><p className="muted">Your dashboard statistics are loaded live from PostgreSQL.</p><Link className="btn btn-outline" to="/jobs">View jobs</Link></div></>}
  </>;
}

function Jobs({user}) {
  const [jobs,setJobs]=useState([]),[search,setSearch]=useState(''),[message,setMessage]=useState(''),[form,setForm]=useState({title:'',description:'',requirements:'',location:'',employment_type:'Full-time',experience_required:'Fresher',salary_min:'',salary_max:''});
  const [showForm,setShowForm]=useState(false),[loading,setLoading]=useState(true);
  async function load(){setLoading(true);try{const r=user.role==='recruiter'?await api.get('/recruiter/jobs'):await api.get('/jobs',{params:{search}});setJobs(r.data)}catch(e){setMessage(e.response?.data?.message||'Unable to load jobs.')}finally{setLoading(false)}}
  useEffect(()=>{load()},[user.role,search]);
  async function create(e){e.preventDefault();try{await api.post('/jobs',form);setMessage('Job posted successfully.');setShowForm(false);setForm({title:'',description:'',requirements:'',location:'',employment_type:'Full-time',experience_required:'Fresher',salary_min:'',salary_max:''});load()}catch(e){setMessage(e.response?.data?.message||'Could not post job.')}}
  async function apply(job){const cover_letter=window.prompt('Write a short cover letter (optional):')||'';try{const r=await api.post('/applications',{job_id:job.job_id,cover_letter});setMessage(r.data.message)}catch(e){setMessage(e.response?.data?.message||'Could not apply.')}}
  async function remove(job){if(!window.confirm('Delete this job posting?'))return;try{await api.delete(`/jobs/${job.job_id}`);setMessage('Job deleted.');load()}catch(e){setMessage(e.response?.data?.message||'Could not delete job.')}}
  return <><PageTitle eyebrow="OPPORTUNITIES" title={user.role==='recruiter'?'Manage job postings':'Explore jobs'} subtitle={user.role==='recruiter'?'Create and manage vacancies at your company.':'Find a role that matches your skills and goals.'} action={user.role==='recruiter'&&<button className="btn btn-primary" onClick={()=>setShowForm(!showForm)}><Plus size={17}/> Post a job</button>}/>
    {message&&<div className="notice">{message}<button onClick={()=>setMessage('')}>×</button></div>}
    {showForm&&<div className="panel form-panel"><h3>Create a new job</h3><form className="form grid-form" onSubmit={create}><label>Job title<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>Location<input required value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></label><label>Employment type<select value={form.employment_type} onChange={e=>setForm({...form,employment_type:e.target.value})}><option>Full-time</option><option>Part-time</option><option>Internship</option><option>Contract</option></select></label><label>Experience<input value={form.experience_required} onChange={e=>setForm({...form,experience_required:e.target.value})}/></label><label>Minimum salary<input type="number" value={form.salary_min} onChange={e=>setForm({...form,salary_min:e.target.value})}/></label><label>Maximum salary<input type="number" value={form.salary_max} onChange={e=>setForm({...form,salary_max:e.target.value})}/></label><label className="span-2">Description<textarea required rows="3" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><label className="span-2">Requirements<textarea rows="2" value={form.requirements} onChange={e=>setForm({...form,requirements:e.target.value})}/></label><div className="span-2"><button className="btn btn-primary">Publish job</button></div></form></div>}
    {user.role!=='recruiter'&&<div className="searchbar"><Search size={18}/><input placeholder="Search by job title, company or location..." value={search} onChange={e=>setSearch(e.target.value)}/></div>}
    {loading?<p className="muted">Loading jobs...</p>:jobs.length?<JobGrid jobs={jobs} action={user.role==='applicant'?apply:user.role==='recruiter'?remove:null} actionLabel={user.role==='applicant'?'Apply now':'Delete'}/>:<Empty title="No jobs found" text="Try another search or post a new vacancy."/>}
  </>;
}

function Applications({user}) {
  const [rows,setRows]=useState([]),[message,setMessage]=useState('');
  async function load(){try{const r=await api.get(user.role==='recruiter'?'/recruiter/applications':'/applications/mine');setRows(r.data)}catch(e){setMessage(e.response?.data?.message||'Unable to load applications.')}}
  useEffect(()=>{load()},[user.role]);
  async function update(id,status){try{await api.patch(`/applications/${id}/status`,{status});setMessage('Application status updated.');load()}catch(e){setMessage(e.response?.data?.message||'Update failed.')}}
  return <><PageTitle eyebrow="APPLICATIONS" title={user.role==='recruiter'?'Applicant applications':'My applications'} subtitle={user.role==='recruiter'?'Review candidates and update their progress.':'Track the progress of your job applications.'}/>{message&&<div className="notice">{message}</div>}<div className="panel table-panel"><ApplicationTable rows={rows} recruiter={user.role==='recruiter'} onUpdate={update}/></div></>;
}

function Profile(){
  const [data,setData]=useState({education:'',skills:'',experience:''}),[message,setMessage]=useState('');
  useEffect(()=>{api.get('/resume').then(r=>setData({...data,...r.data})).catch(()=>{})},[]);
  async function save(e){e.preventDefault();try{await api.put('/resume',data);setMessage('Profile details saved to PostgreSQL.')}catch(e){setMessage(e.response?.data?.message||'Could not save profile.')}}
  return <><PageTitle eyebrow="PROFILE" title="My profile" subtitle="Keep your education and skills up to date for recruiters."/><div className="panel profile-panel"><form className="form" onSubmit={save}><label>Education<textarea rows="2" value={data.education||''} onChange={e=>setData({...data,education:e.target.value})} placeholder="e.g. B.Tech Computer Science"/></label><label>Skills<textarea rows="3" value={data.skills||''} onChange={e=>setData({...data,skills:e.target.value})} placeholder="e.g. HTML, CSS, React, PostgreSQL"/></label><label>Experience<textarea rows="3" value={data.experience||''} onChange={e=>setData({...data,experience:e.target.value})} placeholder="Describe your experience or projects"/></label>{message&&<div className="notice success">{message}</div>}<button className="btn btn-primary">Save profile</button></form></div></>;
}

function JobGrid({jobs,action,actionLabel='Apply now'}) {
  return <div className="job-grid">{jobs.map(job=><article className="job-card" key={job.job_id}><div className="job-card-top"><span className="company-mark">{(job.company_name||'C')[0]}</span><span className="pill">{job.employment_type||'Full-time'}</span></div><h3>{job.title}</h3><p className="company-name">{job.company_name}</p><div className="job-meta"><span><MapPin size={14}/>{job.location}</span><span><Clock size={14}/>{job.experience_required||'Fresher'}</span></div><div className="job-card-bottom"><strong>{job.salary_min||job.salary_max?`₹${Number(job.salary_min||0).toLocaleString('en-IN')} - ₹${Number(job.salary_max||0).toLocaleString('en-IN')}`:'Salary not disclosed'}</strong>{action&&<button className="btn btn-primary btn-small" onClick={()=>action(job)}>{actionLabel}</button>}</div></article>)}</div>;
}
function ApplicationTable({rows,recruiter=false,onUpdate}) {
  if(!rows.length)return <Empty title="No applications yet" text="Applications will appear here when candidates apply."/>;
  return <div className="table-scroll"><table><thead><tr><th>{recruiter?'Applicant':'Job role'}</th><th>{recruiter?'Job title':'Company'}</th><th>Date</th><th>Status</th>{recruiter&&<th>Update status</th>}</tr></thead><tbody>{rows.map(r=><tr key={r.application_id}><td><strong>{recruiter?r.applicant_name:r.title}</strong>{recruiter&&<small className="table-sub">{r.applicant_email}</small>}</td><td>{recruiter?r.job_title:r.company_name}</td><td>{new Date(r.applied_at).toLocaleDateString()}</td><td><span className={`status status-${r.status}`}>{r.status}</span></td>{recruiter&&<td><select className="status-select" value={r.status} onChange={e=>onUpdate(r.application_id,e.target.value)}><option value="pending">Pending</option><option value="shortlisted">Shortlisted</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option></select></td>}</tr>)}</tbody></table></div>;
}
function Stat({icon:Icon,label,value}){return <div className="stat-card"><span className="stat-icon"><Icon size={20}/></span><div><small>{label}</small><strong>{value}</strong></div></div>}
function PageTitle({eyebrow,title,subtitle,action}){return <div className="page-title"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>}
function SectionTitle({title,link,linkText}){return <div className="section-title"><h2>{title}</h2><Link to={link}>{linkText} →</Link></div>}
function Empty({title,text}){return <div className="empty"><span><FileText size={23}/></span><strong>{title}</strong><p>{text}</p></div>}

export default App;
