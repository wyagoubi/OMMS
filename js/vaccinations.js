/* vaccinations page */
OMMS.mount(function vaccinations(){return head('Vaccinations','Record and track all vaccinations with next-dose scheduling',btn('Add Vaccination','addVac'))+`<div class="card">${tbl(['Employee','Vaccine','Date','Next Dose','Status'],DB.vacs.map(v=>({cells:[`<b>${nm(v[0])}</b>`,v[1],v[2],v[3],bd(v[4])]})))}</div>`});
