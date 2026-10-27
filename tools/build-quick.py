from pathlib import Path
import subprocess,json,html,sys
ROOT=Path(__file__).resolve().parents[1]
d=json.loads(subprocess.check_output(['node','tools/resume-data.cjs'],cwd=ROOT,encoding='utf-8'))
e=html.escape
roles=d['notes']['roles'];projects=d['notes']['projects']
email='singkamal670@gmail.com';linkedin='https://www.linkedin.com/in/kamaldeep-multani-singh/';github='https://github.com/KamalSinghMultani'
css=(ROOT/'site/quick-resume.css').read_text(encoding='utf-8')
motion=(ROOT/'site/quick-motion.js').read_text(encoding='utf-8')
walk='''<figure class="workshop" aria-label="An animated miniature systems workshop"><div id="workshop-stage" class="workshop-stage" data-status="loading"><div class="workshop-stamp">THE SYSTEMS WORKSHOP<span>A small world. Built to connect.</span></div><span class="workshop-index" aria-hidden="true">KS / 01</span><div class="workshop-fallback"><strong>&lt; / &gt;</strong><p>A little curiosity.<br>A lot of building.</p></div><canvas id="workshop-canvas" role="img" aria-label="A red robot walks between a workstation and connected servers on a miniature studio platform."></canvas></div><figcaption><span>A little curiosity.<br>A lot of building.</span><div class="scene-actions"><button id="workshop-replay" type="button" hidden>Replay</button><button id="workshop-hello" type="button" hidden>Say hello ↗</button></div><div class="workshop-timeline" aria-hidden="true"><i id="workshop-progress"></i></div></figcaption></figure>'''
workshop=operations=toolkit=city=card=''

parts=['<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="Kamaldeep Singh: computer science and cloud computing, IT support experience, infrastructure and full-stack projects."><title>Kamaldeep Singh — Quick résumé</title><meta property="og:title" content="Kamaldeep Singh — Quick résumé"><meta property="og:description" content="Projects, experience, skills and a downloadable résumé. Computer science and cloud computing."><meta property="og:type" content="website"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&amp;family=Space+Grotesk:wght@400;500;600&amp;display=swap"><style>'+css+'</style></head><body><nav class="bar" aria-label="Quick résumé navigation"><a class="brand" href="#overview">KAMALDEEP SINGH</a><a href="#projects">Projects</a><a href="#experience">Experience</a><a href="#skills">Skills</a><a href="#contact">Contact</a><button id="quick-motion" type="button" hidden>Pause animation</button><a href="index.html#about">Cinematic portfolio ↗</a></nav><main id="overview"><header class="hero"><div class="hero-copy"><div class="kicker">Quick résumé · Computer science / Cloud computing</div><h1>Building systems.<br><span>Connecting<br>the pieces.</span></h1><p class="lead">I’m Kamaldeep Singh, a Computer Science graduate with a cloud computing specialty, experience supporting end users, and hands-on infrastructure and full-stack development projects.</p><p>Brampton, ON · Open to entry-level CS / IT roles · GTA &amp; remote</p><div class="actions"><a class="button" href="kamaldeep-singh-resume.pdf" download>Download résumé PDF</a><a class="button secondary" href="mailto:'+email+'">Email me</a><a class="button secondary" href="'+github+'">GitHub profile ↗</a></div></div>'+walk+'</header><div class="facts"><span><b>100+ end users</b>Supported at Pearson Manufacturing</span><span><b>3 selected projects</b>Infrastructure and full-stack development</span><span><b>Honours Bachelor of CS</b>Sheridan College · GPA 3.5 / 4.0</span></div><section id="projects"><div class="kicker">Selected work</div><h2>What I built and how</h2>'+workshop+'<div class="grid">']
for m in d['missions']:
 n=projects[m['id']]
 parts.append('<article class="project"><h3>'+e(n['title'])+'</h3><p class="stack">'+e(' · '.join(m['stack']))+'</p><p><b>Problem.</b> '+e(n['problem'])+'</p><p><b>My contribution.</b> '+e(n['contribution'])+'</p><ul>'+''.join('<li>'+e(a[1])+'</li>' for a in n['approach'])+'</ul><div class="proof"><b>'+e(n['evidenceLabel'].title())+'</b><p>'+e(' · '.join(n['evidence']))+'</p><p>'+e(n['result'])+'</p></div></article>')
parts.append('</div></section><section id="experience"><div class="kicker">Work experience</div><h2>Where I contributed</h2>'+operations)
for r in reversed(roles):
 parts.append('<article><h3>'+e(r['title'].title())+'</h3><p class="meta">'+e(r['company'].title()+' · '+r['dates']+' · '+r['location'].title())+'</p><p>'+e(r['lead'])+'</p><ul>'+''.join('<li>'+e(c)+'</li>' for c in r['contributions'])+'</ul>'+(' <p><b>'+e(' · '.join(' '.join(f) for f in r['facts']))+'</b></p>' if r['facts'] else '')+'</article>')
parts.append('</section><section id="skills"><div class="kicker">Technical toolkit</div><h2>Skills</h2>'+toolkit+'<div class="tool-controls" hidden aria-label="Explore the toolkit">'+''.join('<button type="button" data-tool-index="'+str(i)+'" aria-pressed="'+str(i==1).lower()+'">'+label+'</button>' for i,label in enumerate(['Systems','Cloud','Networking','Automation','Development']))+'</div><p id="tool-status" class="tool-status" aria-live="polite">Choose a category to highlight its skills. All skills stay visible.</p><div class="skills">')
for skill_index,(key,title) in enumerate([('dir','Systems & directory services'),('cloud','Cloud & virtualization'),('net','Networking'),('auto','Automation'),('dev','Development & support')]):
 parts.append('<p data-skill-group="'+str(skill_index)+'"'+(' class="equipped"' if skill_index==1 else '')+'><b>'+title+'</b>'+e(' · '.join(x[0] for x in d['skills'] if x[1]==key))+'</p>')
parts.append('</div></section><section id="education"><h2>Education</h2>'+city+'<article><h3>Honours Bachelor of Computer Science</h3><p>Sheridan College · Cloud computing specialty</p><p>Jan 2023 – Aug 2026 · GPA 3.5 / 4.0</p></article></section><section id="contact"><div class="kicker">Get in touch</div><h2>Let’s work together.</h2>'+card+'<p>Open to entry-level CS / IT opportunities in the GTA and remotely.</p><div class="actions"><a class="button" href="mailto:'+email+'">'+email+'</a><a class="button secondary" href="'+linkedin+'">LinkedIn ↗</a><a class="button secondary" href="'+github+'">GitHub ↗</a></div></section><footer class="footer"><a class="cinematic" href="index.html#about">Explore the interactive comic portfolio →</a><a href="media/robot-license.txt">Character credits ↗</a></footer></main><script>'+motion+'</script><script type="module" src="quick-workshop.mjs"></script></body></html>')
(ROOT/'site/quick.html').write_text(''.join(parts),encoding='utf-8')
if '--pdf' in sys.argv:
 from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer
 from reportlab.lib.styles import getSampleStyleSheet,ParagraphStyle
 from reportlab.lib.colors import HexColor
 styles=getSampleStyleSheet();styles.add(ParagraphStyle(name='Text',fontName='Helvetica',fontSize=9,leading=12,spaceAfter=4));styles.add(ParagraphStyle(name='Section',fontName='Helvetica-Bold',fontSize=11,leading=14,spaceBefore=9,spaceAfter=5,textColor=HexColor('#a40727')))
 story=[]
 def add(t,style='Text'):story.append(Paragraph(t,styles[style]))
 add('KAMALDEEP SINGH','Title');add('Computer Science / Cloud Computing · Brampton, ON');add('<a href="mailto:'+email+'">'+email+'</a> · <a href="'+linkedin+'">LinkedIn</a> · <a href="'+github+'">GitHub</a>')
 add('Computer Science graduate with a cloud computing specialty, end-user support experience, and infrastructure and full-stack development projects. Open to entry-level CS / IT roles in the GTA and remotely.')
 add('EXPERIENCE','Section')
 for r in reversed(roles):
  add('<b>'+e(r['title'].title()+' — '+r['company'].title())+'</b>');add(e(r['dates']+' · '+r['location'].title()))
  add(e(r['lead']+' '+'. '.join(' '.join(f) for f in r['facts'])))
  for c in r['contributions']:add('• '+e(c))
 add('SELECTED PROJECTS','Section')
 for m in d['missions']:
  n=projects[m['id']];add('<b>'+e(n['title'])+'</b> · '+e(' / '.join(m['stack'])));add(e(n['contribution']));add(e(n['result']))
 add('TECHNICAL SKILLS','Section');add('Systems: Active Directory, Windows Server, DNS, DHCP, Group Policy, GNS3. Cloud: AWS, Azure, Hyper-V, Docker. Automation: PowerShell, Bash, Python, Git/GitHub. Development: JavaScript/TypeScript, React, Next.js, C#, ASP.NET MVC, SQL Server, REST APIs.')
 add('EDUCATION','Section');add('<b>Sheridan College — Honours Bachelor of Computer Science</b>');add('Cloud computing specialty · Jan 2023 – Aug 2026 · GPA 3.5 / 4.0')
 SimpleDocTemplate(str(ROOT/'site/kamaldeep-singh-resume.pdf'),pagesize=(612,792),rightMargin=40,leftMargin=40,topMargin=30,bottomMargin=30,title='Kamaldeep Singh — Resume',author='Kamaldeep Singh').build(story)
print('Built quick résumé'+(' and PDF' if '--pdf' in sys.argv else ''))
