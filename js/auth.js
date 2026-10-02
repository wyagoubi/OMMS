/* login + settings page */
async function doLogin(){const em=document.getElementById('em').value,pw=document.getElementById('pw').value;
 try{const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:em,password:pw})});
  if(!r.ok&&![404,405,501].includes(r.status))return toast(r.status==429?'Too many attempts, try later':'Invalid credentials');}
 catch(e){/* no server running: static demo mode */}
 sessionStorage.setItem('omms_user','1');location.href='dashboard.html'}
if(document.body.dataset.page=='login'&&sessionStorage.getItem('omms_user'))location.replace('dashboard.html');
if(document.body.dataset.page=='settings')OMMS.mount(function settings(){return head('Settings','System preferences')+`<div class="card" style="max-width:720px"><h2 style="margin-bottom:12px">General</h2><div class="fg"><label>System name<input value="OMMS"></label><label>Language<select><option>English</option><option>Arabic</option><option>French</option></select></label><label>Timezone<select><option>Africa/Algiers (UTC+1)</option></select></label><label>Date format<select><option>DD/MM/YYYY</option><option>YYYY-MM-DD</option></select></label></div>${['Email notifications','Vaccination reminders','Two-factor authentication'].map(t=>`<div class="tg"><span>${t}</span><input type="checkbox" checked></div>`).join('')}<button class="btn" style="margin-top:16px" onclick="toast('Changes saved')">Save Changes</button></div>`});
