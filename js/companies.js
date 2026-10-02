/* companies page */
OMMS.mount(function companies(){return head('Companies','Client companies and their workforce',btn('Add Company','addCo'))+`<div class="card">${tbl(['Name','Industry','Employees','Contact','Status'],DB.companies.map(c=>({cells:[`<b>${c.n}</b>`,c.ind,c.emp,c.ct,bd('Active')]})))}</div>`});
