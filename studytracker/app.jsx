// ── Constants & Helpers ───────────────────────────────────────────────
const ST_KEY = 'studytracker.v1';
const PALETTE = ['#f97316','#14b8a6','#a78bfa','#f43f5e','#38bdf8','#84cc16','#fbbf24'];
const DEFAULT_SUBJECTS = [
  {id:'algorithms',   name:'Algorithms',    color:'#f97316', weeklyTarget:6},
  {id:'web-dev',      name:'Web Dev',       color:'#14b8a6', weeklyTarget:5},
  {id:'system-design',name:'System Design', color:'#a78bfa', weeklyTarget:4},
  {id:'databases',    name:'Databases',     color:'#38bdf8', weeklyTarget:3},
];
const DEFAULT_STATE = {weeklyGoal:15, subjects:DEFAULT_SUBJECTS, sessions:[]};

const todayIso = ()=>new Date().toISOString().slice(0,10);
const offsetDate = (base,off)=>{ const d=new Date(base); d.setDate(d.getDate()+off); return d.toISOString().slice(0,10); };
const last7  = ()=>Array.from({length:7},(_,i)=>offsetDate(new Date(),i-6));
const last30 = ()=>Array.from({length:30},(_,i)=>offsetDate(new Date(),i-29));
const withinDays = (date,days)=>{ const diff=Date.now()-new Date(date).getTime(); return diff>=0&&diff<=(days-1)*86400000; };
const hoursFrom  = sessions=>sessions.reduce((s,x)=>s+x.duration,0)/60;
const fmtHrs     = v=>`${v.toFixed(v>=10?0:1)}h`;
const fmtDay     = iso=>new Date(iso).toLocaleDateString('en-US',{weekday:'short'});

function calcStreak(sessions){
  const dates=[...new Set(sessions.map(s=>s.date))].sort().reverse();
  if(!dates.length) return 0;
  let streak=0,cursor=new Date();cursor.setHours(0,0,0,0);
  const latest=new Date(dates[0]);latest.setHours(0,0,0,0);
  if(latest<cursor) cursor=latest;
  for(const d of dates){
    const c=new Date(d);c.setHours(0,0,0,0);
    if(c.getTime()===cursor.getTime()){streak++;cursor.setDate(cursor.getDate()-1);}
    else if(c<cursor) break;
  }
  return streak;
}

function loadTracker(){
  try{
    const raw=localStorage.getItem(ST_KEY);
    if(!raw) return DEFAULT_STATE;
    const p=JSON.parse(raw);
    return{weeklyGoal:p.weeklyGoal??15, subjects:p.subjects?.length?p.subjects:DEFAULT_SUBJECTS, sessions:p.sessions??[]};
  }catch{return DEFAULT_STATE;}
}
function saveTracker(t){ localStorage.setItem(ST_KEY,JSON.stringify(t)); }

function buildDemo(){
  const t=new Date();
  return{weeklyGoal:16,subjects:DEFAULT_SUBJECTS,sessions:[
    {id:crypto.randomUUID(),subjectId:'algorithms',   date:offsetDate(t,-6),duration:120,focus:4,memo:'Dynamic programming and graph review.'},
    {id:crypto.randomUUID(),subjectId:'web-dev',      date:offsetDate(t,-5),duration:90, focus:5,memo:'Built dashboard components.'},
    {id:crypto.randomUUID(),subjectId:'system-design',date:offsetDate(t,-4),duration:75, focus:4,memo:'Queues, caching, load balancing.'},
    {id:crypto.randomUUID(),subjectId:'algorithms',   date:offsetDate(t,-3),duration:105,focus:4,memo:'Interval and binary search problems.'},
    {id:crypto.randomUUID(),subjectId:'databases',    date:offsetDate(t,-2),duration:80, focus:3,memo:'Normalization, indexing, query plans.'},
    {id:crypto.randomUUID(),subjectId:'web-dev',      date:offsetDate(t,-1),duration:110,focus:5,memo:'Connected UI state, polished interactions.'},
    {id:crypto.randomUUID(),subjectId:'web-dev',      date:offsetDate(t, 0),duration:95, focus:4,memo:'Deployment flow and product polish.'},
  ]};
}

const inputSt={width:'100%',padding:'10px 12px',borderRadius:9,background:'var(--s2)',border:'1px solid var(--border)',color:'var(--text)',fontSize:13.5,outline:'none'};
const labelSt={display:'block',fontSize:10,fontWeight:700,color:'var(--text2)',letterSpacing:'0.09em',textTransform:'uppercase',marginBottom:6};

// ── Icon ──────────────────────────────────────────────────────────────
const STIcon=({name,size=18,color='currentColor',sw=1.8})=>{
  const s={stroke:color,strokeWidth:sw,fill:'none',strokeLinecap:'round',strokeLinejoin:'round'};
  const icons={
    grid:   <><rect {...s} x="3" y="3" width="7" height="7" rx="1.5"/><rect {...s} x="14" y="3" width="7" height="7" rx="1.5"/><rect {...s} x="3" y="14" width="7" height="7" rx="1.5"/><rect {...s} x="14" y="14" width="7" height="7" rx="1.5"/></>,
    plus:   <path {...s} d="M12 5v14M5 12h14"/>,
    book:   <><path {...s} d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path {...s} d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></>,
    target: <><circle {...s} cx="12" cy="12" r="9"/><circle {...s} cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="2" fill={color} stroke="none"/></>,
    clock:  <><circle {...s} cx="12" cy="12" r="9"/><path {...s} d="M12 7v5l3.5 2"/></>,
    flame:  <path {...s} d="M12 2s-5 5.5-5 10a5 5 0 0 0 10 0c0-3-2-5-2-5s-1 3.5-3 3.5S10 9 10 8c0 0 2 2.5 4.5.5C16 7 16 4 12 2z"/>,
    export: <><path {...s} d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path {...s} d="M7 10l5 5 5-5M12 15V3"/></>,
    trash:  <><path {...s} d="M3 6h18M19 6l-1.5 14H6.5L5 6M9 6V4h6v2"/></>,
    zap:    <path {...s} d="M13 2L3 14h9l-1 8 10-12h-9z"/>,
    refresh:<path {...s} d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}>{icons[name]||null}</svg>;
};

// ── Vertical Bar Chart ────────────────────────────────────────────────
const BarChart=({bars,max,target})=>(
  <div style={{display:'grid',gridTemplateColumns:`repeat(${bars.length},1fr)`,gap:8,alignItems:'end',height:140}}>
    {bars.map((b,i)=>{
      const h=max>0?Math.max(b.hours/max*100,b.hours>0?8:0):0;
      const isToday=i===bars.length-1;
      return(
        <div key={b.label} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:5,height:'100%',justifyContent:'flex-end'}}>
          <span style={{fontSize:10,fontFamily:'Fira Code',color:'var(--text2)'}}>{b.hours>0?fmtHrs(b.hours):''}</span>
          <div style={{width:'100%',borderRadius:'6px 6px 0 0',background:`linear-gradient(180deg,${isToday?'var(--orange)':'var(--teal)'},${isToday?'#c2580e':'#0d9488'})`,height:`${h}%`,minHeight:b.hours>0?6:0,animation:'barGrow .5s ease',boxShadow:isToday?'0 4px 16px rgba(249,115,22,0.35)':''}}/>
          <span style={{fontSize:10,color:isToday?'var(--orange)':'var(--text2)',fontWeight:isToday?700:400}}>{b.label}</span>
        </div>
      );
    })}
  </div>
);

// ── Heatmap ───────────────────────────────────────────────────────────
const Heatmap=({days,max})=>(
  <div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(10,1fr)',gap:4}}>
      {days.map(d=>{
        const pct=max>0?d.hours/max:0;
        const bg=d.hours===0?'rgba(249,115,22,0.06)':`rgba(249,115,22,${0.18+pct*0.72})`;
        return(
          <div key={d.date} title={`${d.date}: ${fmtHrs(d.hours)}`}
            style={{aspectRatio:'1',borderRadius:5,background:bg,transition:'background .3s',animation:'heatPop .3s ease'}}/>
        );
      })}
    </div>
    <div style={{display:'flex',justifyContent:'flex-end',alignItems:'center',gap:6,marginTop:8,fontSize:10,color:'var(--muted)'}}>
      <span>Less</span>
      {[0.08,0.25,0.5,0.85].map((o,i)=><div key={i} style={{width:14,height:6,borderRadius:3,background:`rgba(249,115,22,${o})`}}/>)}
      <span>More</span>
    </div>
  </div>
);

// ── Subject Ring ──────────────────────────────────────────────────────
const SubjectRing=({subject,spent})=>{
  const pct=subject.weeklyTarget>0?Math.min(spent/subject.weeklyTarget,1):0;
  const over=spent>subject.weeklyTarget&&subject.weeklyTarget>0;
  const R=30,CX=36,CY=36,SW=7,circ=2*Math.PI*R;
  return(
    <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderRadius:12,background:'var(--s2)',border:'1px solid var(--border)'}}>
      <svg width="72" height="72" viewBox="0 0 72 72" style={{flexShrink:0}}>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--s3)" strokeWidth={SW}/>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={over?'var(--red)':subject.color} strokeWidth={SW}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ*(1-pct)}
          transform={`rotate(-90 ${CX} ${CY})`} style={{transition:'stroke-dashoffset .6s ease'}}/>
        <text x={CX} y={CY+5} textAnchor="middle" fill="var(--text)" fontSize="13" fontWeight="700" fontFamily="Fira Code,monospace">{fmtHrs(spent)}</text>
      </svg>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:700,fontSize:13,color:'var(--text)',marginBottom:3}}>{subject.name}</div>
        <div style={{fontSize:11,color:'var(--text2)',marginBottom:5}}>{Math.round(pct*100)}% of {fmtHrs(subject.weeklyTarget)} target</div>
        <div style={{height:3,borderRadius:99,background:'var(--s3)',overflow:'hidden'}}>
          <div style={{width:`${Math.min(pct*100,100)}%`,height:'100%',borderRadius:'inherit',background:over?'var(--red)':subject.color,transition:'width .6s ease'}}/>
        </div>
      </div>
    </div>
  );
};

// ── Stat Card ─────────────────────────────────────────────────────────
const STStat=({label,value,sub,icon,col})=>{
  const c=col||'var(--orange)';
  return(
    <div style={{background:'var(--s1)',border:'1px solid var(--border)',borderRadius:14,padding:'18px 20px',display:'flex',flexDirection:'column',gap:12}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <span style={{fontSize:10,fontWeight:700,color:'var(--text2)',letterSpacing:'0.09em',textTransform:'uppercase'}}>{label}</span>
        <div style={{width:30,height:30,borderRadius:8,background:c+'1a',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <STIcon name={icon} size={14} color={c}/>
        </div>
      </div>
      <div>
        <div style={{fontFamily:'Fira Code',fontSize:28,fontWeight:700,color:'var(--text)',lineHeight:1}}>{value}</div>
        {sub&&<div style={{fontSize:11,color:'var(--text2)',marginTop:5}}>{sub}</div>}
      </div>
    </div>
  );
};

// ── Sidebar ───────────────────────────────────────────────────────────
const NAV=[
  {id:'dashboard',label:'Dashboard',icon:'grid'},
  {id:'log',      label:'Log Session',icon:'plus'},
  {id:'subjects', label:'Subjects',icon:'book'},
];

const Sidebar=({screen,onNav,tracker,onDemo,onExport,onReset})=>{
  const weekly=tracker.sessions.filter(s=>withinDays(s.date,7));
  const weekHrs=hoursFrom(weekly);
  const streak=calcStreak([...tracker.sessions].sort((a,b)=>b.date.localeCompare(a.date)));
  return(
    <div style={{width:216,flexShrink:0,background:'var(--s1)',borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column',padding:'22px 14px',gap:3}}>
      {/* Logo */}
      <div style={{display:'flex',alignItems:'center',gap:10,paddingLeft:8,paddingBottom:22}}>
        <div style={{width:32,height:32,borderRadius:9,background:'linear-gradient(135deg,var(--orange),#e55d0a)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 12px rgba(249,115,22,0.4)'}}>
          <STIcon name="zap" size={15} color="white"/>
        </div>
        <span style={{fontFamily:'Space Grotesk',fontWeight:800,fontSize:15,letterSpacing:'-0.02em',color:'var(--text)'}}>StudyTracker</span>
      </div>

      {NAV.map(item=>{
        const on=screen===item.id;
        return(
          <button key={item.id} onClick={()=>onNav(item.id)} style={{
            display:'flex',alignItems:'center',gap:10,
            padding:'9px 11px',borderRadius:10,border:'none',cursor:'pointer',
            background:on?'rgba(249,115,22,0.12)':'transparent',
            color:on?'var(--orange)':'var(--text2)',
            fontFamily:'Space Grotesk',fontWeight:on?700:400,fontSize:14,
            borderLeft:on?'2px solid var(--orange)':'2px solid transparent',
            transition:'all .15s',textAlign:'left',
          }}>
            <STIcon name={item.icon} size={16} color={on?'var(--orange)':'var(--muted)'}/>
            {item.label}
          </button>
        );
      })}

      <div style={{flex:1}}/>

      {/* Mini stats */}
      <div style={{background:'var(--s2)',border:'1px solid var(--border)',borderRadius:12,padding:'14px',marginBottom:10}}>
        <div style={{fontSize:10,color:'var(--text2)',marginBottom:8,fontWeight:700,letterSpacing:'0.07em',textTransform:'uppercase'}}>This week</div>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
          <span style={{fontSize:12,color:'var(--text2)'}}>Hours</span>
          <span style={{fontFamily:'Fira Code',fontSize:13,fontWeight:700,color:'var(--orange)'}}>{fmtHrs(weekHrs)}</span>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
          <span style={{fontSize:12,color:'var(--text2)'}}>Streak</span>
          <span style={{fontFamily:'Fira Code',fontSize:13,fontWeight:700,color:'var(--teal)'}}>{streak}d</span>
        </div>
        <div style={{display:'flex',justifyContent:'space-between'}}>
          <span style={{fontSize:12,color:'var(--text2)'}}>Goal</span>
          <span style={{fontFamily:'Fira Code',fontSize:13,fontWeight:700,color:weekHrs>=tracker.weeklyGoal?'var(--green)':'var(--text2)'}}>{Math.round(weekHrs/tracker.weeklyGoal*100)}%</span>
        </div>
      </div>

      {[
        {label:'Load Demo',icon:'zap',fn:onDemo},
        {label:'Export JSON',icon:'export',fn:onExport},
        {label:'Reset',icon:'refresh',fn:onReset},
      ].map(a=>(
        <button key={a.label} onClick={a.fn} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',borderRadius:10,border:'1px solid var(--border)',background:'transparent',cursor:'pointer',color:'var(--text2)',fontSize:12.5,fontWeight:500,transition:'all .15s',marginBottom:4}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--border2)';e.currentTarget.style.color='var(--text)';}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.color='var(--text2)';}}
        >
          <STIcon name={a.icon} size={13} color="var(--orange)"/>{a.label}
        </button>
      ))}
    </div>
  );
};

// ── Dashboard Screen ──────────────────────────────────────────────────
const Dashboard=({tracker})=>{
  const weekly  =tracker.sessions.filter(s=>withinDays(s.date,7));
  const monthly =tracker.sessions.filter(s=>withinDays(s.date,30));
  const sorted  =[...tracker.sessions].sort((a,b)=>b.date.localeCompare(a.date));
  const weekHrs =hoursFrom(weekly);
  const monthHrs=hoursFrom(monthly);
  const streak  =calcStreak(sorted);
  const avgFocus=weekly.length?weekly.reduce((s,x)=>s+x.focus,0)/weekly.length:0;
  const weekPct =Math.min(100,weekHrs/Math.max(tracker.weeklyGoal,1)*100);

  const bars=last7().map(d=>({label:fmtDay(d),hours:hoursFrom(weekly.filter(s=>s.date===d))}));
  const maxBar=Math.max(...bars.map(b=>b.hours),1);
  const heatDays=last30().map(d=>({date:d,hours:hoursFrom(monthly.filter(s=>s.date===d))}));
  const maxHeat=Math.max(...heatDays.map(d=>d.hours),1);

  const subjRows=tracker.subjects.map(sub=>({
    ...sub,
    weekHrs:hoursFrom(weekly.filter(s=>s.subjectId===sub.id)),
  }));
  const topSub=subjRows.sort((a,b)=>b.weekHrs-a.weekHrs)[0];
  const recent=sorted.slice(0,5);

  return(
    <div style={{padding:'24px 28px',overflowY:'auto',height:'100%',display:'flex',flexDirection:'column',gap:18}} className="fade-up">
      {/* Header */}
      <div>
        <h1 style={{fontFamily:'Space Grotesk',fontWeight:800,fontSize:22,marginBottom:3}}>Dashboard</h1>
        <p style={{color:'var(--text2)',fontSize:13}}>Week of {new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</p>
      </div>

      {/* Insight strip */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
        {[
          {label:'Momentum',val:topSub?`${topSub.name} leads`:streak?`${streak}-day streak`:'No data yet',sub:topSub?`${fmtHrs(topSub.weekHrs)} this week`:'Log your first session',col:'var(--orange)'},
          {label:'Weekly Goal',val:`${Math.round(weekPct)}%`,sub:`${fmtHrs(weekHrs)} of ${fmtHrs(tracker.weeklyGoal)} logged`,col:weekPct>=100?'var(--green)':weekPct>60?'var(--teal)':'var(--text2)'},
          {label:'Focus Avg',val:avgFocus?`${avgFocus.toFixed(1)}/5`:'—',sub:`${weekly.length} blocks this week`,col:'var(--teal)'},
        ].map(c=>(
          <div key={c.label} style={{background:`linear-gradient(135deg,rgba(249,115,22,0.08),rgba(20,184,166,0.06))`,border:'1px solid var(--border)',borderRadius:14,padding:'16px 18px'}}>
            <div style={{fontSize:10,fontWeight:700,color:'var(--text2)',letterSpacing:'0.09em',textTransform:'uppercase',marginBottom:8}}>{c.label}</div>
            <div style={{fontFamily:'Fira Code',fontWeight:700,fontSize:20,color:c.col,marginBottom:4}}>{c.val}</div>
            <div style={{fontSize:11,color:'var(--text2)'}}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
        <STStat label="This Week"   value={fmtHrs(weekHrs)}  icon="clock"  col="var(--orange)" sub={`${Math.round(weekPct)}% of goal`}/>
        <STStat label="This Month"  value={fmtHrs(monthHrs)} icon="book"   col="var(--teal)"   sub="30 days"/>
        <STStat label="Streak"      value={`${streak}d`}     icon="flame"  col="#f43f5e"        sub="consecutive days"/>
        <STStat label="Sessions"    value={tracker.sessions.length} icon="grid" col="var(--text2)" sub="total logged"/>
      </div>

      {/* Charts */}
      <div style={{display:'grid',gridTemplateColumns:'1.2fr 1fr',gap:16}}>
        <div style={{background:'var(--s1)',border:'1px solid var(--border)',borderRadius:16,padding:'20px 22px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
            <h3 style={{fontFamily:'Space Grotesk',fontWeight:700,fontSize:14}}>Last 7 Days</h3>
            <span style={{fontSize:11,color:'var(--text2)',fontFamily:'Fira Code'}}>{topSub?`${topSub.name} leads`:''}</span>
          </div>
          <BarChart bars={bars} max={maxBar}/>
        </div>
        <div style={{background:'var(--s1)',border:'1px solid var(--border)',borderRadius:16,padding:'20px 22px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <h3 style={{fontFamily:'Space Grotesk',fontWeight:700,fontSize:14}}>Study Heatmap</h3>
            <span style={{fontSize:11,color:'var(--text2)'}}>30 days</span>
          </div>
          <Heatmap days={heatDays} max={maxHeat}/>
        </div>
      </div>

      {/* Recent sessions */}
      <div style={{background:'var(--s1)',border:'1px solid var(--border)',borderRadius:16,padding:'20px 22px'}}>
        <h3 style={{fontFamily:'Space Grotesk',fontWeight:700,fontSize:14,marginBottom:14}}>Recent Sessions</h3>
        {recent.length===0
          ? <p style={{color:'var(--muted)',fontSize:13}}>No sessions yet. Log your first study block or load demo data.</p>
          : <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {recent.map(s=>{
                const sub=tracker.subjects.find(x=>x.id===s.subjectId);
                return(
                  <div key={s.id} style={{display:'flex',alignItems:'center',gap:14,padding:'11px 14px',borderRadius:11,background:'var(--s2)',border:'1px solid var(--border)'}}>
                    <div style={{width:36,height:36,borderRadius:10,flexShrink:0,background:(sub?.color||'var(--orange)')+'1a',border:`1px solid ${sub?.color||'var(--orange)'}33`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Fira Code',fontWeight:700,fontSize:11,color:sub?.color||'var(--orange)'}}>
                      {fmtHrs(s.duration/60)}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
                        <span style={{fontSize:13,fontWeight:700,color:sub?.color||'var(--orange)'}}>{sub?.name||'Unknown'}</span>
                        <span style={{fontSize:10,padding:'2px 7px',borderRadius:20,background:'rgba(249,115,22,0.1)',color:'var(--text2)',fontFamily:'Fira Code'}}>focus {s.focus}/5</span>
                      </div>
                      <span style={{fontSize:12,color:'var(--text2)'}}>{s.memo||'Focused study block.'}</span>
                    </div>
                    <span style={{fontSize:11,color:'var(--muted)',fontFamily:'Fira Code',flexShrink:0}}>{s.date}</span>
                  </div>
                );
              })}
            </div>
        }
      </div>
    </div>
  );
};

// ── Log Session Screen ────────────────────────────────────────────────
const LogSession=({tracker,onSave})=>{
  const [subjectId,setSubjectId]=React.useState(tracker.subjects[0]?.id||'');
  const [date,setDate]=React.useState(todayIso());
  const [duration,setDuration]=React.useState('90');
  const [focus,setFocus]=React.useState('4');
  const [memo,setMemo]=React.useState('');
  const [done,setDone]=React.useState(false);

  const sub=tracker.subjects.find(s=>s.id===subjectId);

  const save=()=>{
    if(!subjectId||!date||parseFloat(duration)<15) return;
    onSave({id:crypto.randomUUID(),subjectId,date,duration:Number(duration),focus:Number(focus),memo:memo.trim()});
    setDone(true);
  };

  if(done) return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16}} className="fade-up">
      <div style={{width:64,height:64,borderRadius:'50%',background:'rgba(74,222,128,0.12)',border:'2px solid var(--green)',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
      </div>
      <h2 style={{fontFamily:'Space Grotesk',fontWeight:700,fontSize:20}}>Session logged!</h2>
    </div>
  );

  return(
    <div style={{padding:'24px 28px',overflowY:'auto',height:'100%'}} className="fade-up">
      <div style={{maxWidth:520,margin:'0 auto'}}>
        <h1 style={{fontFamily:'Space Grotesk',fontWeight:800,fontSize:22,marginBottom:5}}>Log Session</h1>
        <p style={{color:'var(--text2)',fontSize:13,marginBottom:28}}>Record a study block</p>

        <div style={{background:'var(--s1)',border:'1px solid var(--border)',borderRadius:18,padding:'26px',display:'flex',flexDirection:'column',gap:18}}>
          <div>
            <label style={labelSt}>Subject</label>
            <select value={subjectId} onChange={e=>setSubjectId(e.target.value)} style={inputSt}>
              {tracker.subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <div>
              <label style={labelSt}>Date</label>
              <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inputSt}/>
            </div>
            <div>
              <label style={labelSt}>Duration (min)</label>
              <input type="number" min="15" step="15" value={duration} onChange={e=>setDuration(e.target.value)} style={inputSt}/>
            </div>
          </div>

          {/* Duration preview */}
          <div style={{background:'var(--s2)',border:'1px solid var(--border)',borderRadius:12,padding:'14px',textAlign:'center'}}>
            <span style={{color:'var(--text2)',fontSize:13}}>Duration · </span>
            <span style={{fontFamily:'Fira Code',fontSize:28,fontWeight:700,color:sub?.color||'var(--orange)'}}>{fmtHrs(Number(duration)/60)}</span>
          </div>

          <div>
            <label style={labelSt}>Focus Score</label>
            <div style={{display:'flex',gap:8}}>
              {[1,2,3,4,5].map(n=>{
                const on=Number(focus)>=n;
                const col=n<=2?'var(--red)':n<=3?'var(--teal)':'var(--orange)';
                return(
                  <button key={n} onClick={()=>setFocus(String(n))} style={{
                    flex:1,padding:'10px 0',borderRadius:10,border:`1.5px solid`,
                    borderColor:on?col:'var(--border)',
                    background:on?col+'18':'transparent',
                    cursor:'pointer',transition:'all .15s',
                    display:'flex',flexDirection:'column',alignItems:'center',gap:3,
                  }}>
                    <span style={{fontFamily:'Fira Code',fontWeight:700,fontSize:18,color:on?col:'var(--muted)'}}>{n}</span>
                    <span style={{fontSize:8,letterSpacing:'0.04em',color:on?col:'var(--muted)',fontWeight:600}}>
                      {['POOR','LOW','OK','GOOD','PEAK'][n-1]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={labelSt}>Notes <span style={{fontWeight:400,textTransform:'none',letterSpacing:0,fontSize:10,color:'var(--muted)'}}>— optional</span></label>
            <textarea value={memo} onChange={e=>setMemo(e.target.value)} rows={3}
              placeholder="What did you work on?" style={{...inputSt,resize:'none'}}/>
          </div>

          <button onClick={save} style={{
            padding:'14px',borderRadius:12,border:'none',cursor:'pointer',
            background:'linear-gradient(135deg,var(--orange),#c2580e)',
            color:'white',fontFamily:'Space Grotesk',fontWeight:700,fontSize:15,
            boxShadow:'0 4px 20px rgba(249,115,22,0.4)',transition:'transform .15s',
          }}
            onMouseEnter={e=>e.currentTarget.style.transform='translateY(-1px)'}
            onMouseLeave={e=>e.currentTarget.style.transform=''}
          >Save Session</button>
        </div>
      </div>
    </div>
  );
};

// ── Subjects Screen ───────────────────────────────────────────────────
const Subjects=({tracker,setTracker})=>{
  const [name,setName]=React.useState('');
  const [goal,setGoal]=React.useState(String(tracker.weeklyGoal));
  const weekly=tracker.sessions.filter(s=>withinDays(s.date,7));

  const addSubject=()=>{
    if(!name.trim()) return;
    const sub={id:crypto.randomUUID(),name:name.trim(),color:PALETTE[tracker.subjects.length%PALETTE.length],weeklyTarget:3};
    const next={...tracker,subjects:[...tracker.subjects,sub]};
    setTracker(next);saveTracker(next);setName('');
  };

  const updateTarget=(id,val)=>{
    const next={...tracker,subjects:tracker.subjects.map(s=>s.id===id?{...s,weeklyTarget:Number(val)||1}:s)};
    setTracker(next);saveTracker(next);
  };

  const deleteSubject=id=>{
    const next={...tracker,subjects:tracker.subjects.filter(s=>s.id!==id)};
    setTracker(next);saveTracker(next);
  };

  const saveGoal=()=>{
    const n=Number(goal);
    if(!n) return;
    const next={...tracker,weeklyGoal:n};
    setTracker(next);saveTracker(next);
  };

  return(
    <div style={{padding:'24px 28px',overflowY:'auto',height:'100%',display:'flex',flexDirection:'column',gap:18}} className="fade-up">
      <div>
        <h1 style={{fontFamily:'Space Grotesk',fontWeight:800,fontSize:22,marginBottom:3}}>Subjects & Goals</h1>
        <p style={{color:'var(--text2)',fontSize:13}}>Manage tracked subjects and weekly targets</p>
      </div>

      {/* Weekly goal */}
      <div style={{background:'var(--s1)',border:'1px solid var(--border)',borderRadius:16,padding:'20px 22px'}}>
        <h3 style={{fontFamily:'Space Grotesk',fontWeight:700,fontSize:14,marginBottom:14}}>Weekly Study Goal</h3>
        <div style={{display:'flex',gap:10,alignItems:'flex-end'}}>
          <div style={{flex:1}}>
            <label style={labelSt}>Target hours / week</label>
            <input type="number" min="1" value={goal} onChange={e=>setGoal(e.target.value)} style={inputSt}/>
          </div>
          <button onClick={saveGoal} style={{padding:'10px 18px',borderRadius:10,border:'none',cursor:'pointer',background:'var(--orange)',color:'white',fontWeight:700,fontSize:13,height:42}}>Save</button>
        </div>
      </div>

      {/* Add subject */}
      <div style={{background:'var(--s1)',border:'1px solid var(--border)',borderRadius:16,padding:'20px 22px'}}>
        <h3 style={{fontFamily:'Space Grotesk',fontWeight:700,fontSize:14,marginBottom:14}}>Add Subject</h3>
        <div style={{display:'flex',gap:10}}>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Machine Learning"
            style={{...inputSt,flex:1}} onKeyDown={e=>e.key==='Enter'&&addSubject()}/>
          <button onClick={addSubject} style={{padding:'10px 18px',borderRadius:10,border:'none',cursor:'pointer',background:'var(--orange)',color:'white',fontWeight:700,fontSize:13,flexShrink:0}}>Add</button>
        </div>
      </div>

      {/* Subject list with rings */}
      <div style={{background:'var(--s1)',border:'1px solid var(--border)',borderRadius:16,padding:'20px 22px'}}>
        <h3 style={{fontFamily:'Space Grotesk',fontWeight:700,fontSize:14,marginBottom:16}}>Tracked Subjects</h3>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {tracker.subjects.map(sub=>{
            const spent=hoursFrom(weekly.filter(s=>s.subjectId===sub.id));
            return(
              <div key={sub.id} style={{position:'relative'}}>
                <SubjectRing subject={sub} spent={spent}/>
                <div style={{position:'absolute',top:8,right:8,display:'flex',gap:6,alignItems:'center'}}>
                  <input type="number" min="1" value={sub.weeklyTarget} onChange={e=>updateTarget(sub.id,e.target.value)}
                    style={{...inputSt,width:52,padding:'4px 7px',fontSize:12,textAlign:'center'}}/>
                  <button onClick={()=>deleteSubject(sub.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--muted)',padding:3,borderRadius:5,transition:'color .15s'}}
                    onMouseEnter={e=>e.currentTarget.style.color='var(--red)'}
                    onMouseLeave={e=>e.currentTarget.style.color='var(--muted)'}
                  ><STIcon name="trash" size={13} color="currentColor"/></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── App ───────────────────────────────────────────────────────────────
const TWEAK_DEFAULTS=/*EDITMODE-BEGIN*/{"accentColor":"#f97316","bgColor":"#0b0e14"}/*EDITMODE-END*/;

const STApp=()=>{
  const [screen,  setScreen]  = React.useState(()=>localStorage.getItem('st_screen')||'dashboard');
  const [tracker, setTracker] = React.useState(loadTracker);
  const [tweaks,  setTweaks]  = React.useState(TWEAK_DEFAULTS);
  const [showTweaks,setShowTweaks]=React.useState(false);

  const nav=s=>{setScreen(s);localStorage.setItem('st_screen',s);};

  React.useEffect(()=>{
    document.documentElement.style.setProperty('--orange',tweaks.accentColor);
    document.documentElement.style.setProperty('--bg',tweaks.bgColor);
  },[tweaks]);

  React.useEffect(()=>{
    const h=e=>{
      if(e.data?.type==='__activate_edit_mode')   setShowTweaks(true);
      if(e.data?.type==='__deactivate_edit_mode') setShowTweaks(false);
    };
    window.addEventListener('message',h);
    window.parent.postMessage({type:'__edit_mode_available'},'*');
    return()=>window.removeEventListener('message',h);
  },[]);

  const applyTweak=(k,v)=>{
    const next={...tweaks,[k]:v};setTweaks(next);
    window.parent.postMessage({type:'__edit_mode_set_keys',edits:next},'*');
  };

  const addSession=session=>{
    const next={...tracker,sessions:[session,...tracker.sessions]};
    setTracker(next);saveTracker(next);
    setTimeout(()=>nav('dashboard'),1600);
  };

  const onDemo=()=>{const d=buildDemo();setTracker(d);saveTracker(d);nav('dashboard');};
  const onExport=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(tracker,null,2)],{type:'application/json'}));a.download='studytracker-export.json';a.click();};
  const onReset=()=>{setTracker(DEFAULT_STATE);saveTracker(DEFAULT_STATE);nav('dashboard');};

  return(
    <div style={{display:'flex',height:'100vh',overflow:'hidden'}}>
      <Sidebar screen={screen} onNav={nav} tracker={tracker} onDemo={onDemo} onExport={onExport} onReset={onReset}/>
      <div style={{flex:1,overflow:'hidden'}}>
        {screen==='dashboard' && <Dashboard tracker={tracker}/>}
        {screen==='log'       && <LogSession tracker={tracker} onSave={addSession}/>}
        {screen==='subjects'  && <Subjects tracker={tracker} setTracker={setTracker}/>}
      </div>

      {showTweaks&&(
        <div style={{position:'fixed',bottom:24,right:24,zIndex:9999,background:'var(--s1)',border:'1px solid var(--border2)',borderRadius:16,padding:'20px',width:230,boxShadow:'0 12px 48px rgba(0,0,0,0.7)'}}>
          <div style={{fontFamily:'Space Grotesk',fontWeight:700,fontSize:14,marginBottom:16}}>Tweaks</div>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div>
              <div style={{...labelSt,marginBottom:8}}>Accent</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {['#f97316','#14b8a6','#8b5cf6','#f43f5e','#06b6d4','#84cc16'].map(c=>(
                  <button key={c} onClick={()=>applyTweak('accentColor',c)} style={{width:26,height:26,borderRadius:'50%',border:`2px solid ${tweaks.accentColor===c?'white':'transparent'}`,background:c,cursor:'pointer'}}/>
                ))}
              </div>
            </div>
            <div>
              <div style={{...labelSt,marginBottom:8}}>Background</div>
              <div style={{display:'flex',gap:8}}>
                {['#0b0e14','#0e0b14','#0b140e','#140b0b'].map(c=>(
                  <button key={c} onClick={()=>applyTweak('bgColor',c)} style={{width:26,height:26,borderRadius:6,border:`2px solid ${tweaks.bgColor===c?'var(--orange)':'var(--border)'}`,background:c,cursor:'pointer'}}/>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<STApp/>);
