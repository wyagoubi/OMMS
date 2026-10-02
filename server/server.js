require('dotenv').config();
const express = require('express'), helmet = require('helmet'), cookieParser = require('cookie-parser'), path = require('path');
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) { console.error('Set JWT_SECRET (32+ chars) in .env'); process.exit(1); }
const auth = require('./auth'), api = require('./api');
const root = path.join(__dirname, '..'), app = express();
app.disable('x-powered-by'); app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], scriptSrcAttr: ["'unsafe-inline'"], styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", 'data:'], connectSrc: ["'self'"], frameAncestors: ["'none'"] } } }));
app.use(express.json({ limit: '100kb' }), cookieParser());
app.use('/api', (q, r, n) => q.method === 'GET' || q.is('json') ? n() : r.status(415).json({ error: 'JSON only' })); // CSRF hardening with SameSite=strict cookie
app.use('/api/auth', auth.router);
app.use('/api', auth.requireAuth, api);
for (const d of ['css', 'js', 'assets']) app.use('/' + d, express.static(path.join(root, d), { dotfiles: 'deny' })); // server/, database/, .env are never served
app.get('/', (q, r) => r.sendFile(path.join(root, 'index.html')));
app.get(/^\/[\w-]+\.html$/, (q, r) => r.sendFile(path.join(root, q.path), e => e && r.status(404).end()));
app.use((e, q, r, n) => { console.error(e); r.status(500).json({ error: 'Server error' }); });
const port = process.env.PORT || 3000;
app.listen(port, () => console.log('OMMS running on http://localhost:' + port));
if (process.env.REMINDERS === 'on') require('../automation/reminders').start();
