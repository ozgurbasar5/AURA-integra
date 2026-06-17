/** FOUC önleme — tema + sidebar boot (layout inline script ile uyumlu) */
export function themeBootScript(): string {
  return `(function(){try{
var m=localStorage.getItem('aura_color_mode');
var d=m==='dark'||(!m&&window.matchMedia('(prefers-color-scheme: dark)').matches);
if(d){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}
var themes={indigo:{a:'#6366f1',l:'#eef2ff',d:'#4f46e5',r:'#c7d2fe',x:'#4338ca'},blue:{a:'#3b82f6',l:'#eff6ff',d:'#2563eb',r:'#bfdbfe',x:'#1d4ed8'},cyan:{a:'#06b6d4',l:'#ecfeff',d:'#0891b2',r:'#a5f3fc',x:'#0e7490'},emerald:{a:'#10b981',l:'#ecfdf5',d:'#059669',r:'#6ee7b7',x:'#047857'},teal:{a:'#14b8a6',l:'#f0fdfa',d:'#0d9488',r:'#99f6e4',x:'#0f766e'},violet:{a:'#8b5cf6',l:'#f5f3ff',d:'#7c3aed',r:'#ddd6fe',x:'#6d28d9'},rose:{a:'#f43f5e',l:'#fff1f2',d:'#e11d48',r:'#fecdd3',x:'#be123c'},orange:{a:'#f97316',l:'#fff7ed',d:'#ea580c',r:'#fed7aa',x:'#c2410c'},slate:{a:'#475569',l:'#f8fafc',d:'#334155',r:'#cbd5e1',x:'#1e293b'}};
var t=localStorage.getItem('aura_theme')||'indigo';
var th=themes[t]||themes.indigo;
var ui={};try{ui=JSON.parse(localStorage.getItem('aura_ui_appearance')||'{}');}catch(e){}
var accent=ui.customAccent&&/^#[0-9a-fA-F]{6}$/.test(ui.customAccent)?ui.customAccent:th.a;
var r=document.documentElement;
r.style.setProperty('--accent',accent);
r.style.setProperty('--accent-light',th.l);
r.style.setProperty('--accent-dark',th.d);
r.style.setProperty('--accent-ring',th.r);
r.style.setProperty('--accent-text',th.x);
r.style.setProperty('--hero-from',accent);
r.style.setProperty('--hero-to',th.d);
var ss=ui.sidebarStyle||'themed';
r.dataset.sidebarStyle=ss;
var rad=ui.radiusScale||'rounded';
r.dataset.radiusScale=rad;
r.style.setProperty('--radius-ui',rad==='sharp'?'0.375rem':rad==='pill'?'1.25rem':'0.75rem');
if(ss==='light'){r.style.setProperty('--sidebar-from','#f8fafc');r.style.setProperty('--sidebar-to','#f1f5f9');}
else if(ss==='dark'){r.style.setProperty('--sidebar-from','#0f172a');r.style.setProperty('--sidebar-to','#020617');}
}catch(e){}})();`
}
