/* examinations page */
OMMS.mount(function exams(){return head('Medical Examinations','Occupational examinations and results',btn('Schedule Exam','addExam','cal'))+`<div class="card">${tbl(['Employee','Examination Type','Date','Status'],DB.exams.map(v=>({cells:[`<b>${nm(v[0])}</b>`,v[1],v[2],bd(v[3])]})))}</div>`});
