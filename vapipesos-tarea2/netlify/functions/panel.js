// netlify/functions/panel.js
// Panel interno — disparo de cupones Vapipesos
// Variables de entorno requeridas (las mismas que registrar.js):
//   GOOGLE_SHEET_ID, GOOGLE_SERVICE_EMAIL, GOOGLE_PRIVATE_KEY
// Autenticación via header: x-panel-key: vapiano2026

const PANEL_KEY = process.env.PANEL_KEY || 'vapiano2026';

const PARTIDOS = [
  // JORNADA 1
  {id:1,  fecha:'2026-06-11', hora:'13:00', grupo:'A', desc:'México vs. Sudáfrica'},
  {id:2,  fecha:'2026-06-11', hora:'20:00', grupo:'A', desc:'Corea del Sur vs. Chequia'},
  {id:3,  fecha:'2026-06-12', hora:'13:00', grupo:'B', desc:'Canadá vs. Bosnia & Herzegovina'},
  {id:4,  fecha:'2026-06-12', hora:'19:00', grupo:'D', desc:'Estados Unidos vs. Paraguay'},
  {id:5,  fecha:'2026-06-13', hora:'19:00', grupo:'C', desc:'Haití vs. Escocia'},
  {id:6,  fecha:'2026-06-13', hora:'22:00', grupo:'D', desc:'Australia vs. Turquía'},
  {id:7,  fecha:'2026-06-13', hora:'16:00', grupo:'C', desc:'Brasil vs. Marruecos'},
  {id:8,  fecha:'2026-06-13', hora:'13:00', grupo:'B', desc:'Qatar vs. Suiza'},
  {id:9,  fecha:'2026-06-14', hora:'17:00', grupo:'E', desc:'Costa de Marfil vs. Ecuador'},
  {id:10, fecha:'2026-06-14', hora:'11:00', grupo:'E', desc:'Alemania vs. Curazao'},
  {id:11, fecha:'2026-06-14', hora:'14:00', grupo:'F', desc:'Países Bajos vs. Japón'},
  {id:12, fecha:'2026-06-14', hora:'20:00', grupo:'F', desc:'Suecia vs. Túnez'},
  {id:13, fecha:'2026-06-15', hora:'16:00', grupo:'H', desc:'Arabia Saudita vs. Uruguay'},
  {id:14, fecha:'2026-06-15', hora:'10:00', grupo:'H', desc:'España vs. Cabo Verde'},
  {id:15, fecha:'2026-06-15', hora:'19:00', grupo:'G', desc:'Irán vs. Nueva Zelanda'},
  {id:16, fecha:'2026-06-15', hora:'13:00', grupo:'G', desc:'Bélgica vs. Egipto'},
  {id:17, fecha:'2026-06-16', hora:'13:00', grupo:'I', desc:'Francia vs. Senegal'},
  {id:18, fecha:'2026-06-16', hora:'16:00', grupo:'I', desc:'Irak vs. Noruega'},
  {id:19, fecha:'2026-06-16', hora:'19:00', grupo:'J', desc:'Argentina vs. Argelia'},
  {id:20, fecha:'2026-06-16', hora:'22:00', grupo:'J', desc:'Austria vs. Jordania'},
  {id:21, fecha:'2026-06-17', hora:'17:00', grupo:'L', desc:'Ghana vs. Panamá'},
  {id:22, fecha:'2026-06-17', hora:'14:00', grupo:'L', desc:'Inglaterra vs. Croacia'},
  {id:23, fecha:'2026-06-17', hora:'11:00', grupo:'K', desc:'Portugal vs. RD Congo'},
  {id:24, fecha:'2026-06-17', hora:'20:00', grupo:'K', desc:'Uzbekistán vs. Colombia'},
  // JORNADA 2
  {id:25, fecha:'2026-06-18', hora:'10:00', grupo:'A', desc:'Chequia vs. Sudáfrica'},
  {id:26, fecha:'2026-06-18', hora:'13:00', grupo:'B', desc:'Suiza vs. Bosnia & Herzegovina'},
  {id:27, fecha:'2026-06-18', hora:'16:00', grupo:'B', desc:'Canadá vs. Qatar'},
  {id:28, fecha:'2026-06-18', hora:'19:00', grupo:'A', desc:'México vs. Corea del Sur'},
  {id:29, fecha:'2026-06-19', hora:'19:00', grupo:'C', desc:'Brasil vs. Haití'},
  {id:30, fecha:'2026-06-19', hora:'16:00', grupo:'C', desc:'Escocia vs. Marruecos'},
  {id:31, fecha:'2026-06-19', hora:'22:00', grupo:'D', desc:'Turquía vs. Paraguay'},
  {id:32, fecha:'2026-06-19', hora:'13:00', grupo:'D', desc:'Estados Unidos vs. Australia'},
  {id:33, fecha:'2026-06-20', hora:'14:00', grupo:'E', desc:'Alemania vs. Costa de Marfil'},
  {id:34, fecha:'2026-06-20', hora:'18:00', grupo:'E', desc:'Ecuador vs. Curazao'},
  {id:35, fecha:'2026-06-20', hora:'11:00', grupo:'F', desc:'Países Bajos vs. Suecia'},
  {id:36, fecha:'2026-06-20', hora:'22:00', grupo:'F', desc:'Túnez vs. Japón'},
  {id:37, fecha:'2026-06-21', hora:'16:00', grupo:'H', desc:'Uruguay vs. Cabo Verde'},
  {id:38, fecha:'2026-06-21', hora:'10:00', grupo:'H', desc:'España vs. Arabia Saudita'},
  {id:39, fecha:'2026-06-21', hora:'13:00', grupo:'G', desc:'Bélgica vs. Irán'},
  {id:40, fecha:'2026-06-21', hora:'19:00', grupo:'G', desc:'Nueva Zelanda vs. Egipto'},
  {id:41, fecha:'2026-06-22', hora:'18:00', grupo:'I', desc:'Noruega vs. Senegal'},
  {id:42, fecha:'2026-06-22', hora:'15:00', grupo:'I', desc:'Francia vs. Irak'},
  {id:43, fecha:'2026-06-22', hora:'11:00', grupo:'J', desc:'Argentina vs. Austria'},
  {id:44, fecha:'2026-06-22', hora:'21:00', grupo:'J', desc:'Jordania vs. Argelia'},
  {id:45, fecha:'2026-06-23', hora:'14:00', grupo:'L', desc:'Inglaterra vs. Ghana'},
  {id:46, fecha:'2026-06-23', hora:'17:00', grupo:'L', desc:'Panamá vs. Croacia'},
  {id:47, fecha:'2026-06-23', hora:'11:00', grupo:'K', desc:'Portugal vs. Uzbekistán'},
  {id:48, fecha:'2026-06-23', hora:'20:00', grupo:'K', desc:'Colombia vs. RD Congo'},
  // JORNADA 3 — BLOQUES SIMULTÁNEOS
  {id:51, fecha:'2026-06-24', hora:'13:00', grupo:'B', desc:'Suiza vs. Canadá',               bloqueId:'B24'},
  {id:52, fecha:'2026-06-24', hora:'13:00', grupo:'B', desc:'Bosnia & Herzegovina vs. Qatar',  bloqueId:'B24'},
  {id:49, fecha:'2026-06-24', hora:'16:00', grupo:'C', desc:'Escocia vs. Brasil',              bloqueId:'C24'},
  {id:50, fecha:'2026-06-24', hora:'16:00', grupo:'C', desc:'Marruecos vs. Haití',             bloqueId:'C24'},
  {id:53, fecha:'2026-06-24', hora:'19:00', grupo:'A', desc:'Chequia vs. México',              bloqueId:'A24'},
  {id:54, fecha:'2026-06-24', hora:'19:00', grupo:'A', desc:'Sudáfrica vs. Corea del Sur',     bloqueId:'A24'},
  {id:55, fecha:'2026-06-25', hora:'14:00', grupo:'E', desc:'Curazao vs. Costa de Marfil',     bloqueId:'E25'},
  {id:56, fecha:'2026-06-25', hora:'14:00', grupo:'E', desc:'Ecuador vs. Alemania',            bloqueId:'E25'},
  {id:57, fecha:'2026-06-25', hora:'17:00', grupo:'F', desc:'Japón vs. Suecia',                bloqueId:'F25'},
  {id:58, fecha:'2026-06-25', hora:'17:00', grupo:'F', desc:'Túnez vs. Países Bajos',          bloqueId:'F25'},
  {id:59, fecha:'2026-06-25', hora:'20:00', grupo:'D', desc:'Turquía vs. Estados Unidos',      bloqueId:'D25'},
  {id:60, fecha:'2026-06-25', hora:'20:00', grupo:'D', desc:'Paraguay vs. Australia',          bloqueId:'D25'},
  {id:61, fecha:'2026-06-26', hora:'13:00', grupo:'I', desc:'Noruega vs. Francia',             bloqueId:'I26'},
  {id:62, fecha:'2026-06-26', hora:'13:00', grupo:'I', desc:'Senegal vs. Irak',                bloqueId:'I26'},
  {id:65, fecha:'2026-06-26', hora:'18:00', grupo:'H', desc:'Cabo Verde vs. Arabia Saudita',   bloqueId:'H26'},
  {id:66, fecha:'2026-06-26', hora:'18:00', grupo:'H', desc:'Uruguay vs. España',              bloqueId:'H26'},
  {id:63, fecha:'2026-06-26', hora:'21:00', grupo:'G', desc:'Egipto vs. Irán',                 bloqueId:'G26'},
  {id:64, fecha:'2026-06-26', hora:'21:00', grupo:'G', desc:'Nueva Zelanda vs. Bélgica',       bloqueId:'G26'},
  {id:67, fecha:'2026-06-27', hora:'15:00', grupo:'L', desc:'Panamá vs. Inglaterra',           bloqueId:'L27'},
  {id:68, fecha:'2026-06-27', hora:'15:00', grupo:'L', desc:'Croacia vs. Ghana',               bloqueId:'L27'},
  {id:71, fecha:'2026-06-27', hora:'17:30', grupo:'K', desc:'Colombia vs. Portugal',           bloqueId:'K27'},
  {id:72, fecha:'2026-06-27', hora:'17:30', grupo:'K', desc:'RD Congo vs. Uzbekistán',         bloqueId:'K27'},
  {id:69, fecha:'2026-06-27', hora:'20:00', grupo:'J', desc:'Argelia vs. Austria',             bloqueId:'J27'},
  {id:70, fecha:'2026-06-27', hora:'20:00', grupo:'J', desc:'Jordania vs. Argentina',          bloqueId:'J27'},
  // DIECISEISAVOS
  {id:73, fecha:'2026-06-28', hora:'13:00', grupo:'16avos', desc:'2º Grupo A vs. 2º Grupo B'},
  {id:76, fecha:'2026-06-29', hora:'11:00', grupo:'16avos', desc:'1º Grupo C vs. 2º Grupo F'},
  {id:74, fecha:'2026-06-29', hora:'14:30', grupo:'16avos', desc:'1º Grupo E vs. Mejor 3º'},
  {id:75, fecha:'2026-06-29', hora:'19:00', grupo:'16avos', desc:'1º Grupo F vs. 2º Grupo C'},
  {id:78, fecha:'2026-06-30', hora:'11:00', grupo:'16avos', desc:'2º Grupo E vs. 2º Grupo I'},
  {id:77, fecha:'2026-06-30', hora:'15:00', grupo:'16avos', desc:'1º Grupo I vs. Mejor 3º'},
  {id:79, fecha:'2026-06-30', hora:'19:00', grupo:'16avos', desc:'1º Grupo A vs. Mejor 3º'},
  {id:80, fecha:'2026-07-01', hora:'10:00', grupo:'16avos', desc:'1º Grupo L vs. Mejor 3º'},
  {id:82, fecha:'2026-07-01', hora:'14:00', grupo:'16avos', desc:'1º Grupo G vs. Mejor 3º'},
  {id:81, fecha:'2026-07-01', hora:'18:00', grupo:'16avos', desc:'1º Grupo D vs. Mejor 3º'},
  {id:84, fecha:'2026-07-02', hora:'13:00', grupo:'16avos', desc:'1º Grupo H vs. 2º Grupo J'},
  {id:83, fecha:'2026-07-02', hora:'17:00', grupo:'16avos', desc:'2º Grupo K vs. 2º Grupo L'},
  {id:85, fecha:'2026-07-02', hora:'19:00', grupo:'16avos', desc:'1º Grupo B vs. Mejor 3º'},
  {id:88, fecha:'2026-07-03', hora:'12:00', grupo:'16avos', desc:'2º Grupo D vs. 2º Grupo G'},
  {id:86, fecha:'2026-07-03', hora:'16:00', grupo:'16avos', desc:'1º Grupo J vs. 2º Grupo H'},
  {id:87, fecha:'2026-07-03', hora:'19:30', grupo:'16avos', desc:'1º Grupo K vs. Mejor 3º'},
  // OCTAVOS
  {id:89, fecha:'2026-07-04', hora:'15:00', grupo:'8vos', desc:'Ganador P74 vs. Ganador P77'},
  {id:90, fecha:'2026-07-04', hora:'11:00', grupo:'8vos', desc:'Ganador P73 vs. Ganador P75'},
  {id:91, fecha:'2026-07-05', hora:'14:00', grupo:'8vos', desc:'Ganador P76 vs. Ganador P78'},
  {id:92, fecha:'2026-07-05', hora:'18:00', grupo:'8vos', desc:'Ganador P79 vs. Ganador P80'},
  {id:93, fecha:'2026-07-06', hora:'13:00', grupo:'8vos', desc:'Ganador P83 vs. Ganador P84'},
  {id:94, fecha:'2026-07-06', hora:'18:00', grupo:'8vos', desc:'Ganador P81 vs. Ganador P82'},
  {id:95, fecha:'2026-07-07', hora:'10:00', grupo:'8vos', desc:'Ganador P86 vs. Ganador P88'},
  {id:96, fecha:'2026-07-07', hora:'14:00', grupo:'8vos', desc:'Ganador P85 vs. Ganador P87'},
  // CUARTOS
  {id:97,  fecha:'2026-07-09', hora:'14:00', grupo:'4tos', desc:'Ganador P89 vs. Ganador P90'},
  {id:98,  fecha:'2026-07-10', hora:'13:00', grupo:'4tos', desc:'Ganador P93 vs. Ganador P94'},
  {id:99,  fecha:'2026-07-11', hora:'15:00', grupo:'4tos', desc:'Ganador P91 vs. Ganador P92'},
  {id:100, fecha:'2026-07-11', hora:'19:00', grupo:'4tos', desc:'Ganador P95 vs. Ganador P96'},
  // SEMIFINALES
  {id:101, fecha:'2026-07-14', hora:'13:00', grupo:'Semi', desc:'Semifinal 1'},
  {id:102, fecha:'2026-07-15', hora:'13:00', grupo:'Semi', desc:'Semifinal 2'},
  // TERCER LUGAR
  {id:103, fecha:'2026-07-18', hora:'15:00', grupo:'3er Lugar', desc:'Partido por el Tercer Lugar'},
  // FINAL
  {id:104, fecha:'2026-07-19', hora:'13:00', grupo:'Final', desc:'Gran Final — Copa Mundial 2026'},
];

// ── Handler principal ──────────────────────────────────────────────────────
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-panel-key',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido' }) };

  const key = (event.headers['x-panel-key'] || '').trim();
  if (key !== PANEL_KEY) return { statusCode: 401, headers, body: JSON.stringify({ error: 'No autorizado' }) };

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido' }) }; }

  const SHEET_ID    = process.env.GOOGLE_SHEET_ID;
  const SVC_EMAIL   = process.env.GOOGLE_SERVICE_EMAIL;
  const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

  try {
    const token = await getGoogleToken(SVC_EMAIL, PRIVATE_KEY);

    if (body.action === 'buscar') {
      const partido = PARTIDOS.find(p => p.id === Number(body.partidoId));
      if (!partido) return { statusCode: 404, headers, body: JSON.stringify({ error: `No existe partido con ID ${body.partidoId}` }) };
      const registros = await getRegistros(token, SHEET_ID, partido);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, partido, registros }) };
    }

    if (body.action === 'disparar') {
      const partido = PARTIDOS.find(p => p.id === Number(body.partidoId));
      if (!partido) return { statusCode: 404, headers, body: JSON.stringify({ error: `No existe partido con ID ${body.partidoId}` }) };
      const goles = parseInt(body.goles, 10);
      if (isNaN(goles) || goles < 1) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Ingresa al menos 1 gol para generar cupones' }) };
      const monto = goles <= 2 ? 100 : goles <= 4 ? 200 : 300;
      const result = await dispararCupones(token, SHEET_ID, partido, goles, monto);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, ...result }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Acción no válida' }) };

  } catch (err) {
    console.error('[panel] Error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

// ── Buscar registros en Sheets ────────────────────────────────────────────
async function getRegistros(token, sheetId, partido) {
  const rows = await readSheet(token, sheetId, 'Registros!A:H');
  if (!rows || rows.length <= 1) return [];

  const data = rows.slice(1); // omitir encabezado

  // Filtro: por BloqueID si es Jornada 3, por descripción si es individual
  const filter = partido.bloqueId
    ? r => (r[6] || '').trim() === partido.bloqueId
    : r => (r[4] || '').trim() === partido.desc;

  return data
    .filter(filter)
    .map(r => ({
      timestamp: r[0] || '',
      sucursal:  r[1] || '',
      wa:        r[2] || '',
      email:     r[3] || '',
      partido:   r[4] || '',
      hora:      r[5] || '',
      bloqueId:  r[6] || '',
    }))
    .filter(r => r.wa); // descartar filas sin WhatsApp
}

// ── Generar y guardar cupones ─────────────────────────────────────────────
async function dispararCupones(token, sheetId, partido, goles, monto) {
  const registros = await getRegistros(token, sheetId, partido);
  if (!registros.length) return { generados: 0, omitidos: 0, montoTotal: 0, cupones: [] };

  // Asegurar que la hoja Cupones exista con encabezados
  await ensureSheet(token, sheetId, 'Cupones',
    ['Código', 'WhatsApp', 'Email', 'Partido', 'Sucursal', 'Monto', 'FechaEmisión', 'FechaVencimiento', 'Usado']);

  // Leer cupones existentes para evitar duplicados (1 cupón por WA por partido/bloque)
  const existingRows = await readSheet(token, sheetId, 'Cupones!A:I');
  const partidoKey   = partido.bloqueId || partido.desc;
  const yaEnviados   = new Set(
    (existingRows || []).slice(1)
      .filter(r => (r[3] || '') === partidoKey)
      .map(r => r[1]) // columna WhatsApp
  );

  // Fechas en zona México
  const tz          = { timeZone: 'America/Mexico_City' };
  const ahora       = new Date();
  const fechaEmision = ahora.toLocaleDateString('es-MX', tz);
  const fechaVenc    = new Date(ahora.getTime() + 5 * 24 * 3600 * 1000).toLocaleDateString('es-MX', tz);
  const partidoLabel = partido.bloqueId ? `Bloque ${partido.bloqueId}` : partido.desc;

  // Deduplicar por WhatsApp (tomar primer registro por WA)
  const uniqueByWa = new Map();
  for (const r of registros) {
    if (!uniqueByWa.has(r.wa)) uniqueByWa.set(r.wa, r);
  }

  const nuevos   = [];
  const omitidos = [];

  for (const [wa, reg] of uniqueByWa) {
    if (yaEnviados.has(wa)) { omitidos.push(wa); continue; }
    nuevos.push({
      codigo:       generarCodigo(),
      wa,
      email:        reg.email,
      partido:      partidoLabel,
      sucursal:     reg.sucursal,
      monto,
      fechaEmision,
      fechaVenc,
    });
  }

  if (nuevos.length > 0) {
    const values = nuevos.map(c => [c.codigo, c.wa, c.email, c.partido, c.sucursal, c.monto, c.fechaEmision, c.fechaVenc, 'No']);
    await appendToSheet(token, sheetId, 'Cupones', values);

    // ── TAREA 3: aquí irá el envío por WhatsApp Cloud API ──────────────────
    for (const c of nuevos) {
      console.log(`[WHATSAPP-TODO] → ${c.wa} | Código: ${c.codigo} | Descuento: $${c.monto} | Válido hasta: ${c.fechaVenc}`);
    }
  }

  return {
    generados:   nuevos.length,
    omitidos:    omitidos.length,
    montoTotal:  nuevos.length * monto,
    cupones:     nuevos,
  };
}

// ── Generar código VAPI-XXXX-XXXX ────────────────────────────────────────
function generarCodigo() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0,O,1,I para evitar confusión
  const seg   = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `VAPI-${seg()}-${seg()}`;
}

// ── Crear hoja si no existe ───────────────────────────────────────────────
async function ensureSheet(token, sheetId, title, headerRow) {
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const meta   = await metaRes.json();
  const exists = (meta.sheets || []).some(s => s.properties.title === title);
  if (exists) return;

  // Crear pestaña
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ requests: [{ addSheet: { properties: { title } } }] }),
  });

  // Escribir encabezados
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(title + '!A1')}?valueInputOption=USER_ENTERED`,
    {
      method:  'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ values: [headerRow] }),
    }
  );
}

// ── Leer rango de Sheets ──────────────────────────────────────────────────
async function readSheet(token, sheetId, range) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.values || [];
}

// ── Agregar filas a Sheets ────────────────────────────────────────────────
async function appendToSheet(token, sheetId, tab, values) {
  const range = encodeURIComponent(tab + '!A:I');
  const url   = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const res   = await fetch(url, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ values }),
  });
  if (!res.ok) throw new Error(await res.text());
}

// ── Google JWT — igual que registrar.js ──────────────────────────────────
async function getGoogleToken(email, privateKey) {
  const now   = Math.floor(Date.now() / 1000);
  const claim = { iss: email, scope: 'https://www.googleapis.com/auth/spreadsheets', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 };

  const header  = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify(claim));
  const signing = `${header}.${payload}`;

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', pemToBuffer(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(signing));
  const jwt = `${signing}.${b64url(sig)}`;

  const res  = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(JSON.stringify(data));
  return data.access_token;
}

function b64url(data) {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  let bin = '';
  bytes.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function pemToBuffer(pem) {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}
