/* companies page */
OMMS.mount(function companies(){return head('Companies','Client companies and their workforce',btn('Add Company','addCo'))+`<div class="card">${tbl(['Name','Industry','Employees','Contact','Status','Actions'],DB.companies.map((c,i)=>({cells:[`<b>${c.n}</b>`,c.ind,c.emp,c.ct,bd('Active'),acts('co',i)]})))}</div>`});
