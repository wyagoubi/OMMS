/* notifications page */
OMMS.mount(function notifications(){return head('Notifications','Alerts, reminders and system updates',`<button class="btn o" onclick="toast('All marked as read')">Mark all read</button>`)+`<div class="card">${DB.notes.map(a=>`<div class="li"><div class="ico ${a[1]}">${ic(a[0])}</div><div><b>${a[2]}</b><div class="mu">${a[3]}</div></div></div>`).join('')}</div>`});
