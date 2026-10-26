/* One persistent stage; hash routes keep sections linkable and Back predictable. */
(function () {
  'use strict';
  const app = document.getElementById('game');
  const data = window.PORTFOLIO;
  if (!app || !data) return;
  const scene = document.getElementById('game-scene');
  const menu = Array.from(app.querySelectorAll('[data-screen]'));
  const names = ['status', 'arsenal', 'targets', 'records', 'contact'];
  const display = {status:'ABOUT',arsenal:'SKILLS',targets:'PROJECTS',records:'EXPERIENCE',contact:'CONTACT'};
  const aliases = {about:'status',skills:'arsenal',projects:'targets',experience:'records',menu:'status',title:'status','duality-stage':'status'};
  const titles = { menu:'SELECT YOUR NEXT MOVE', status:'ABOUT ME', targets:'PROJECTS', records:'EXPERIENCE', arsenal:'SKILLS & TOOLS', contact:'GET IN TOUCH' };
  const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const url = (...parts) => '#' + parts.map(encodeURIComponent).join('/');
  const paused = () => document.documentElement.classList.contains('motion-paused');
  let current = null, revision = 0, transition = null;
  const chapterKeys = ['challenge', 'build', 'evidence'];
  const projectNotes = {
    ad: {
      title:'ACTIVE DIRECTORY LAB', diagram:'directory',
      problem:'How do you keep accounts, authentication, and desktop policies consistent across more than one site?',
      goal:'Build and validate a multi-site Windows Server lab, including replication and OU-scoped Group Policy.',
      contribution:'Configured domain controllers, integrated DNS, site links, and policies; tested controlled DC demotion and repromotion.',
      approach:[['CONNECT THE SITES','Built the routed topology in GNS3 and placed the Windows Server domain controllers across sites.'],['SCOPE THE POLICY','Linked desktop policy to the workstation OU so its scope followed the intended objects.'],['VERIFY THE CHANGE','Checked replication convergence and FSMO role placement after changing the domain-controller setup.']],
      evidence:['repadmin /replsummary','repadmin /showrepl','netdom query fsmo'],
      result:'The project covered cross-site client joins, replication validation, and controlled domain-controller demotion and repromotion.',
      evidenceLabel:'VERIFICATION COMMANDS', lab:'DIRECTORY SERVICES'
    },
    hive: {
      title:'HIVEMIND', diagram:null,
      problem:'How can teammates share live task updates while keeping access scoped to their workspace?',
      goal:'Build a collaborative workspace with real-time task tracking, scoped roles, and a consistent deployment environment.',
      contribution:'Built workspace features, integrated activity summaries and code validation, and containerized the application.',
      approach:[['SHARE THE STATE','React and Next.js views present real-time task updates backed by Firebase.'],['SCOPE THE ACCESS','Workspace roles separate what each member can access.'],['PACKAGE THE APP','Docker provides a consistent environment for local and deployed use.']],
      evidence:['React / Next.js interface','Firebase workspace state','Docker application packaging'],
      result:'The platform brings task tracking, workspace access control, AI activity summaries, and a repository-backed validation sandbox together.',
      evidenceLabel:'IMPLEMENTATION HIGHLIGHTS', lab:'DEVELOPMENT'
    },
    flex: {
      title:'FLEXIFIT', diagram:'development',
      problem:'How do you connect memberships, class schedules, and registration while keeping member and administrator permissions separate?',
      goal:'Build a server-rendered gym platform with a relational data model and validated registration flows.',
      contribution:'Developed MVC flows, modeled SQL Server relationships, and implemented role-based access and server-side validation.',
      approach:[['MODEL THE DATA','Membership plans, class schedules, and registrations are represented in SQL Server.'],['HANDLE THE REQUEST','ASP.NET MVC controllers coordinate the request, authorization, and application logic.'],['VALIDATE THE ACTION','Purchase and registration flows validate requests on the server.']],
      evidence:['Member / administrator permissions','SQL Server data model','Server-side registration validation'],
      result:'The application supports workout browsing, membership-plan purchase, and class registration.',
      evidenceLabel:'IMPLEMENTATION HIGHLIGHTS', lab:'DEVELOPMENT'
    }
  };
  const roles = [
    {id:'pearson', company:'PEARSON MANUFACTURING', year:'2023', title:'HELP DESK TECHNICIAN', dates:'JUN–DEC 2023', location:'MISSISSAUGA, ON',
      lead:'Supported end users across workstations, accounts, software, and network incidents.',
      steps:[['DIAGNOSE','Identify the reported issue and check the device, account, or connection.'],['RESOLVE','Apply the fix or escalate with the steps already taken.'],['DOCUMENT','Record the work and verify that the user can continue.']],
      facts:[['100+','end users supported'],['10+','workstations and wireless devices maintained']],
      contributions:['Active Directory accounts, group membership, and permissions','Hardware, software, network, and remote desktop support','Firewall rules, security patches, and software imaging','Recurring tasks automated with PowerShell and Bash']},
    {id:'samskrita', company:'SAMSKRITA BHARATI', year:'2025', title:'FULL-STACK DEVELOPER INTERN', dates:'MAY–AUG 2025', location:'REMOTE',
      lead:'Built and shipped features for Sanskrit Pictionary, a browser-based word game for online events.',
      steps:[['BUILD','Develop responsive interface components in JavaScript, HTML, and CSS.'],['CONNECT','Integrate REST endpoints with loading and error states.'],['REVIEW','Work through feature branches, pull requests, and peer review.']],
      facts:[], contributions:['Responsive JavaScript and HTML5/CSS3 components','Cross-device layout fixes tracked in Jira','REST API integration for game state and content','GitHub collaboration within an Agile delivery cycle']}
  ];
  const categories = [['dir','SYSTEMS'],['cloud','CLOUD'],['net','NETWORKING'],['auto','AUTOMATION'],['dev','DEVELOPMENT']];
  const labForCategory = {dir:'DIRECTORY SERVICES',cloud:'CLOUD & VIRTUALIZATION',net:'NETWORKING',auto:'SCRIPTING & AUTOMATION',dev:'DEVELOPMENT'};
  const skillNotes = {
    PowerShell:['Automate recurring administration','Configure Windows Server labs','Manage user accounts and permissions'],
    Bash:['Automate recurring administrative tasks','Work with command-line scripts'],
    'Active Directory DS':['Administer users, group membership, and permissions','Build multi-domain-controller lab environments','Validate site replication and role placement'],
    'Group Policy (GPMC)':['Create and link OU-scoped policies','Configure user rights and desktop policy'],
    GNS3:['Build a routed three-subnet lab','Connect Windows clients and domain controllers across sites'],
    Docker:['Containerize HiveMind','Keep local and deployed environments consistent'],
    React:['Build application interfaces','Connect views to application state and APIs'],
    'ASP.NET MVC':['Develop membership and class-registration flows','Apply role-based access and server-side validation'],
    'SQL Server':['Model membership plans, schedules, and registrations','Query relational application data'],
    'Git/GitHub':['Use feature branches and pull requests','Collaborate through peer code review']
  };
  function heading(key, subtitle = titles[key]) {
    return '<header class="screen-heading reveal"><span class="screen-index">' + (names.indexOf(key)+1).toString().padStart(2,'0') + ' / PORTFOLIO</span><h1 tabindex="-1">' + display[key] + '</h1></header>';
  }
  function link(label, target, cls='game-button') { return '<a class="'+cls+'" href="'+target+'">'+esc(label)+' <span aria-hidden="true">↗</span></a>'; }
  function home() {
    return '<div class="menu-intro reveal"><span class="screen-index">COMPUTER SCIENCE / CLOUD COMPUTING</span><h1 tabindex="-1">KAMALDEEP<br><span>SINGH.</span></h1><p>Building systems.<br>Connecting the pieces.</p><div class="intro-note">Choose a section to explore my work.</div></div>';
  }
  function status() {
    return heading('status') + '<div class="profile-sheet paper reveal"><span class="eyebrow">THE PERSON BEHIND THE PROJECTS</span><h2>KAMALDEEP SINGH</h2><details class="tutorial-disclosure" data-discovery="intro"><summary>MEET KAMALDEEP</summary><p class="paper-lead">Computer Science graduate<br>Cloud computing specialty</p></details><div class="specialties"><span>CLOUD</span><span>SYSTEMS</span><span>DEVELOPMENT</span></div><details class="education tutorial-disclosure" data-discovery="education"><summary>EDUCATION & BACKGROUND</summary><h3>SHERIDAN COLLEGE</h3><p>Honours Bachelor of Computer Science<br>Jan 2023 – Aug 2026 · GPA 3.5 / 4.0</p></details><div class="availability">Open to entry-level CS / IT roles<br><span>Brampton, ON · GTA & remote</span></div></div><div class="status-links reveal">'+link('EXPLORE PROJECTS','#targets')+link('WORK EXPERIENCE','#records','text-link')+'</div><div class="status-proof reveal"><span class="eyebrow">EXPLORE MY TECHNICAL LABS</span><div>'+data.stats.map(s=>'<button class="lab-link" data-lab="'+esc(s[0])+'">'+esc(s[0])+' <span aria-hidden="true">↗</span></button>').join('')+'</div></div>';
  }
  function project(route) {
    const mission = data.missions.find(m=>m.id===route[1]) || data.missions[0];
    const note = projectNotes[mission.id];
    const chapter = chapterKeys.includes(route[2]) ? route[2] : 'challenge';
    const index = chapterKeys.indexOf(chapter);
    let detail = '';
    if(chapter==='challenge') {
      detail = '<details class="project-challenge paper reveal tutorial-disclosure" data-discovery="challenge"><summary>EXPLORE THE CHALLENGE</summary><h3>'+note.problem+'</h3><p>'+note.goal+'</p></details><div class="contribution reveal"><span class="eyebrow">MY CONTRIBUTION</span><p>'+note.contribution+'</p></div>';
    } else if(chapter==='build') {
      detail = '<div class="diagram-stage reveal" id="project-diagram">'+(mission.id==='hive'?'<div class="system-flow"><div><b>01</b><strong>TEAMMATES</strong><span>React / Next.js</span></div><i>↔</i><div><b>02</b><strong>WORKSPACE</strong><span>Firebase · scoped roles</span></div><i>→</i><div><b>03</b><strong>DEPLOYMENT</strong><span>Docker</span></div></div>':'')+'</div><details class="approach-steps"><summary>READ ALL BUILD STEPS</summary>'+note.approach.map((step,i)=>'<div class="reveal"><span class="step-number">0'+(i+1)+'</span><h3>'+step[0]+'</h3><p>'+step[1]+'</p></div>').join('')+'</details><button class="replay-button" data-replay>↻ REPLAY BUILD</button>';
    } else {
      const demo = data.demos[mission.id];
      detail = '<div class="evidence-sheet paper reveal"><span class="eyebrow">'+note.evidenceLabel+'</span><div class="evidence-list">'+note.evidence.map(e=>'<div>'+esc(e)+'</div>').join('')+'</div><h3>WHAT THE PROJECT DEMONSTRATES</h3><p>'+note.result+'</p></div><p class="evidence-note reveal">'+(mission.id==='ad'?'These are the checks used in the lab. Command output is not simulated.':'These are implementation details from the project. Screenshots and a recorded demo can be added as supporting evidence.')+'</p>'+(demo?'<video class="project-video reveal" controls playsinline preload="metadata" src="'+esc(demo.src)+'"'+(demo.poster?' poster="'+esc(demo.poster)+'"':'')+' aria-label="'+esc(mission.title)+' demo"></video>':'')+'<button class="game-button reveal" data-lab="'+esc(note.lab)+'">EXPLORE RELATED LAB ↗</button>';
    }
    return heading('targets')+'<nav class="project-selector reveal" aria-label="Select project">'+data.missions.map(m=>'<a href="'+url('targets',m.id,chapter)+'" '+(m.id===mission.id?'aria-current="true"':'')+'>'+esc(m.id==='ad'?'AD INFRASTRUCTURE':m.id==='hive'?'HIVEMIND':'FLEXIFIT')+'</a>').join('')+'</nav><div class="project-intro reveal"><h2>'+note.title+'</h2><p>'+esc(mission.sub)+'</p></div><nav class="chapter-tabs reveal" aria-label="Project chapters">'+chapterKeys.map((c,i)=>'<a href="'+url('targets',mission.id,c)+'" '+(chapter===c?'aria-current="step"':'')+'><span>0'+(i+1)+'</span>'+c.toUpperCase()+'</a>').join('')+'</nav>'+detail+'<div class="project-tools reveal"><span class="eyebrow">TOOLS & TECH</span><p>'+mission.stack.map(esc).join(' <span>·</span> ')+'</p></div><div class="chapter-footer">'+(index?link('BACK',url('targets',mission.id,chapterKeys[index-1]),'text-link'):'<span></span>')+'<span>0'+(index+1)+' / 03</span>'+(index<2?link('NEXT: '+chapterKeys[index+1].toUpperCase(),url('targets',mission.id,chapterKeys[index+1]),'text-link'):link('ALL PROJECTS','#targets','text-link'))+'</div>';
  }
  function records(route) {
    const role = roles.find(r=>r.id===route[1]) || roles[0];
    return heading('records')+'<nav class="role-timeline reveal" aria-label="Select experience">'+roles.map(r=>'<a href="'+url('records',r.id)+'" '+(r===role?'aria-current="true"':'')+'><span>'+r.year+'</span>'+r.company+'</a>').join('')+'</nav><div class="role-heading reveal"><h2>'+role.title+'</h2><h3>'+role.company+'</h3><p>'+role.dates+' <span> / </span> '+role.location+'</p></div><details class="tutorial-disclosure" data-discovery="responsibilities"><summary>EXPLORE MY RESPONSIBILITIES</summary><p class="role-lead reveal">'+role.lead+'</p></details><span class="eyebrow reveal">EXPLORE MY PROCESS</span><div class="workflow '+(role.id==='samskrita'?'workflow-dev':'')+'">'+role.steps.map((s,i)=>'<details class="workflow-panel reveal"><summary><span>0'+(i+1)+'</span> '+s[0]+'</summary><p>'+s[1]+'</p></details>').join('')+'</div><details class="experience-details reveal tutorial-disclosure" data-discovery="contributions"><summary>EXPLORE MY CONTRIBUTIONS</summary>'+(role.facts.length?'<div class="experience-facts">'+role.facts.map(f=>'<p><strong>'+f[0]+'</strong> '+f[1]+'</p>').join('')+'</div>':'')+'<div><span class="eyebrow">KEY CONTRIBUTIONS</span><ul>'+role.contributions.map(c=>'<li>'+c+'</li>').join('')+'</ul></div></details>'+link('VIEW '+(role.id==='pearson'?'DEVELOPER INTERNSHIP':'HELP DESK EXPERIENCE'),url('records',role.id==='pearson'?'samskrita':'pearson'));
  }
  function arsenal(route) {
    const cat = categories.some(c=>c[0]===route[1]) ? route[1] : 'auto';
    const tools = data.skills.filter(s=>s[1]===cat);
    const selected = tools.find(s=>s[0]===route[2]) || tools[0];
    const notes = skillNotes[selected[0]];
    const lab = labForCategory[cat];
    const projectId = cat==='dir'||cat==='net'||cat==='auto'?'ad':cat==='dev'?'flex':'hive';
    return heading('arsenal')+'<nav class="category-tabs reveal" aria-label="Skill categories">'+categories.map(c=>'<a href="'+url('arsenal',c[0])+'" '+(cat===c[0]?'aria-current="true"':'')+'>'+c[1]+'</a>').join('')+'</nav><div class="arsenal-layout"><nav class="tool-inventory reveal" aria-label="Select a tool">'+tools.map((s,i)=>'<a href="'+url('arsenal',cat,s[0])+'" '+(s===selected?'aria-current="true"':'')+'><span class="tool-glyph" aria-hidden="true">'+(cat==='auto'?'&gt;_':cat==='dev'?'&lt;/&gt;':cat==='net'?'↔':cat==='cloud'?'☁':'▤')+'</span><strong>'+esc(s[0])+'</strong></a>').join('')+'</nav><div class="tool-description paper reveal"><span class="eyebrow">'+categories.find(c=>c[0]===cat)[1]+'</span><h2>'+esc(selected[0])+'</h2><h3>'+(notes?'HOW I USE IT':'RELATED EXPERIENCE')+'</h3>'+(notes?'<ul>'+notes.map(n=>'<li>'+n+'</li>').join('')+'</ul>':'<p>This tool is part of my '+categories.find(c=>c[0]===cat)[1].toLowerCase()+' toolkit. Explore the related lab for the context behind this skill area.</p>')+'<div class="tool-evidence"><span class="eyebrow">EXPLORE THE WORK</span><button data-lab="'+esc(lab)+'">'+esc(lab)+' LAB ↗</button>'+link('RELATED PROJECT',url('targets',projectId),'tool-project-link')+'</div></div></div>';
  }
  function contact() {
    return heading('contact')+'<div class="contact-paper paper reveal"><span class="eyebrow">KAMALDEEP SINGH</span><h2>LET’S BUILD<br>SOMETHING.</h2><p class="contact-context">Open to entry-level CS / IT roles<br><span>Brampton, ON · GTA & remote</span></p><details class="tutorial-disclosure" data-discovery="contact"><summary>LET’S WORK TOGETHER</summary><p>Explore how to get in touch. No message or external visit is needed to finish the story.</p><div class="contact-actions"><a href="mailto:singkamal670@gmail.com"><span>01</span>EMAIL ME <b>↗</b></a><a href="https://www.linkedin.com/in/kamaldeep-multani-singh/" target="_blank" rel="noopener"><span>02</span>LINKEDIN <b>↗</b></a><a href="https://github.com/KamalSinghMultani" target="_blank" rel="noopener"><span>03</span>GITHUB <b>↗</b></a></div><div class="copy-row"><span>singkamal670@gmail.com</span><button data-copy>COPY EMAIL</button></div><p class="copy-message" role="status"></p></details><button class="game-button" type="button" data-discovery="ending">FINISH THE STORY →</button></div><p class="contact-thanks reveal">THANKS FOR EXPLORING.</p>';
  }
  function parse() {
    let parts;
    try {parts=location.hash.slice(1).split('?')[0].split('/').map(decodeURIComponent);} catch(_){parts=['status'];}
    parts[0]=aliases[parts[0]]||parts[0];
    if(!names.includes(parts[0]))parts=['status'];
    return parts;
  }
  const scrollMemory=new Map();
  function buildDiagram(id){
    const labels=id==='ad'?['DOMAIN','REPLICATION','OU / POLICY']:id==='hive'?['INTERFACE','WORKSPACE','DEPLOYMENT']:['MEMBER','MVC','SQL SERVER'];
    return '<svg class="build-map" viewBox="0 0 360 164" role="img" aria-label="'+esc(labels.join(' connected to '))+'"><path class="build-wire" d="M80 59H280V119H80Z"/><path class="build-pulse" d="M80 59H280V119H80Z"/>'+labels.map((label,i)=>{const x=i===0?8:i===1?188:98,y=i===2?100:22;return '<g data-node="'+i+'"><path d="M'+x+' '+y+'h156v48H'+x+'Z"/><text x="'+(x+78)+'" y="'+(y+30)+'" text-anchor="middle">'+label+'</text></g>';}).join('')+'</svg>';
  }
  function render(initial=false){
    const route=parse(),screen=route[0],previous=current&&current[0],sectionChanged=screen!==previous;
    if(window.MovieNavigation)window.MovieNavigation.sync(names.indexOf(screen),sectionChanged,initial);
    if(current&&current.join('/')===route.join('/'))return;
    if(current)scrollMemory.set(current.join('/'),scene.scrollTop);
    closeMenu();
    scene.querySelectorAll('video').forEach(v=>v.pause());
    scene.getAnimations({subtree:true}).forEach(a=>a.cancel());
    app.dataset.screen=screen;
    if(sectionChanged && window.matchMedia && window.matchMedia('(max-width:760px)').matches)window.scrollTo({top:0,behavior:'instant'});
    if(sectionChanged&&!window.MovieNavigation)window.AlleyScene.go(names.indexOf(screen),initial);
    menu.forEach(a=>{const active=a.dataset.screen===screen;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    const views={status,targets:project,records,arsenal,contact};
    scene.innerHTML=views[screen](route);current=route;
    scene.scrollTop=scrollMemory.get(route.join('/'))||0;
    const count=String(names.indexOf(screen)+1).padStart(2,'0');
    document.getElementById('game-scene-count').textContent=count+' / 05';
    if(!window.MovieNavigation)document.getElementById('alley-beat-number').textContent=count;
    if(!window.MovieNavigation)document.getElementById('alley-beat-name').textContent=['THE STANDOFF','THE SHOT','BULLET TIME','THE DODGE','THE COUNTER'][names.indexOf(screen)];
    document.title='Kamaldeep Singh — '+display[screen];
    document.getElementById('game-announcement').textContent=display[screen];
    // Render a readable, selectable build explanation instead of a miniature desktop diagram.
    const host=scene.querySelector('#project-diagram');
    if(host){const m=data.missions.find(m=>m.id===route[1])||data.missions[0];const note=projectNotes[m.id];
      host.dataset.step='0';
      host.innerHTML=buildDiagram(m.id)+'<div class="build-flow" aria-label="Implementation steps">'+note.approach.map((step,i)=>'<button data-build-step="'+i+'" aria-pressed="'+(i===0)+'"><span>0'+(i+1)+'</span> '+esc(step[0])+'</button>').join('')+'</div><p class="build-caption" aria-live="polite">'+esc(note.approach[0][1])+'</p>';
    }
    // Native disclosure panels retain the scene and expose experience detail on demand.
    scene.querySelectorAll('.workflow-image').forEach(el=>el.remove());
    if(!paused()&&scene.animate)scene.animate([{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'none'}],{duration:280,easing:'ease-out'});
    if(window.MovieNavigation?.updateGuide)window.MovieNavigation.updateGuide();
    if(!initial)scene.querySelector('h1').focus({preventScroll:true});
    if(sectionChanged&&window.PortfolioTutorial&&app.dataset.guide==='on'&&window.matchMedia('(max-width:760px)').matches)window.PortfolioTutorial.find();
  }
  const menuToggle=document.getElementById('alley-menu-toggle');
  function closeMenu(){app.classList.remove('menu-open');menuToggle.setAttribute('aria-expanded','false');menuToggle.setAttribute('aria-label','Open section menu');scene.inert=false;}
  menuToggle.addEventListener('click',()=>{const open=app.classList.toggle('menu-open');menuToggle.setAttribute('aria-expanded',String(open));menuToggle.setAttribute('aria-label',open?'Close section menu':'Open section menu');scene.inert=open;if(open)menu[names.indexOf(current[0])].focus();});
  app.addEventListener('click',async event=>{
    if(window.MovieNavigation)window.MovieNavigation.interact(event);
    if(event.target.closest('.game-nav a'))closeMenu();
    const lab=event.target.closest('[data-lab]');if(lab){if(window.MovieNavigation)window.MovieNavigation.advance();data.openLab(lab.dataset.lab,lab);}
    const step=event.target.closest('[data-build-step]');
    if(step){if(window.MovieNavigation&&step.getAttribute('aria-pressed')!=='true')window.MovieNavigation.advance();const m=data.missions.find(m=>m.id===current[1])||data.missions[0];scene.querySelectorAll('[data-build-step]').forEach(b=>b.setAttribute('aria-pressed',String(b===step)));scene.querySelector('#project-diagram').dataset.step=step.dataset.buildStep;scene.querySelector('.build-caption').textContent=projectNotes[m.id].approach[Number(step.dataset.buildStep)][1];}
    if(event.target.closest('[data-replay]')){const first=scene.querySelector('[data-build-step]');if(first)first.click();}
    if(current[0]==='contact'&&event.target.closest('.contact-actions a')&&window.MovieNavigation)window.MovieNavigation.advance();
    if(event.target.closest('[data-copy]')){if(window.MovieNavigation)window.MovieNavigation.advance();const message=scene.querySelector('.copy-message');try{await navigator.clipboard.writeText('singkamal670@gmail.com');if(message.isConnected)message.textContent='Email copied.';}catch(_){if(message.isConnected)message.textContent='Select the email address above to copy it.';}}
  });
  app.querySelector('.game-back').addEventListener('click',()=>{location.hash='about';});
  app.querySelector('.game-nav').addEventListener('keydown',event=>{
    const index=menu.indexOf(document.activeElement);if(index<0)return;
    let next=index;
    if(event.key==='ArrowDown'||event.key==='ArrowRight')next=(index+1)%menu.length;
    else if(event.key==='ArrowUp'||event.key==='ArrowLeft')next=(index+menu.length-1)%menu.length;
    else if(event.key==='Home')next=0;else if(event.key==='End')next=menu.length-1;else return;
    event.preventDefault();menu[next].focus();
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!event.defaultPrevented&&document.getElementById('lab').hidden&&current){
      if(app.classList.contains('menu-open')){closeMenu();menuToggle.focus();return;}
      if(current.length>1)location.hash=current[0];else{location.hash='about';menu[0].focus();}
    }
  });
  window.addEventListener('hashchange',()=>render());
  window.addEventListener('portfolio-motion-change',()=>{if(paused())scene.getAnimations({subtree:true}).forEach(a=>a.finish());});
  menu.forEach(a=>{const word=a.querySelector('.menu-word'),label=word.textContent;word.textContent='';word.setAttribute('aria-hidden','true');for(const letter of label){const glyph=document.createElement('span');glyph.textContent=letter;word.appendChild(glyph);}});
  app.hidden=false;document.documentElement.classList.add('game-ready');render(true);
})();
