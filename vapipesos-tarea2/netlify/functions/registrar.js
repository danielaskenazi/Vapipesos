// netlify/functions/registrar.js
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido' }) };

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido' }) }; }

  const { wa, email, partido, sucursal } = body;
  if (!wa || !email || !partido || !sucursal)
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Faltan campos' }) };

  const SHEET_ID    = process.env.GOOGLE_SHEET_ID;
  const SVC_EMAIL   = process.env.GOOGLE_SERVICE_EMAIL;
  let   PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

  // Diagnóstico — quitar después
  if (!PRIVATE_KEY) {
    console.error('GOOGLE_PRIVATE_KEY no está definida');
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Config: falta PRIVATE_KEY' }) };
  }
  if (!SHEET_ID)  { console.error('GOOGLE_SHEET_ID no está definida');    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Config: falta SHEET_ID' }) }; }
  if (!SVC_EMAIL) { console.error('GOOGLE_SERVICE_EMAIL no está definida'); return { statusCode: 500, headers, body: JSON.stringify({ error: 'Config: falta SERVICE_EMAIL' }) }; }

  // Normalizar saltos de línea — Netlify a veces los guarda como literal \n
  PRIVATE_KEY = PRIVATE_KEY.replace(/\\n/g, '\n');

  try {
    const token = await getGoogleToken(SVC_EMAIL, PRIVATE_KEY);
    await appendToSheet(token, SHEET_ID, { wa, email, partido, sucursal });
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('Error al guardar:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

async function getGoogleToken(email, privateKey) {
  const crypto = require('crypto');
  const now    = Math.floor(Date.now() / 1000);
  const claim  = {
    iss: email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
  };

  function b64url(data) {
    const buf = Buffer.from(typeof data === 'string' ? data : JSON.stringify(data));
    return buf.toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
  }

  const header  = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify(claim));
  const signing = `${header}.${payload}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signing);
  const sig = sign.sign(privateKey, 'base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
  const jwt = `${signing}.${sig}`;

  const res  = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Token error: ' + JSON.stringify(data));
  return data.access_token;
}

async function appendToSheet(token, sheetId, { wa, email, partido, sucursal }) {
  const timestamp    = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
  const partidoLabel = partido?.label || partido?.desc || JSON.stringify(partido);

  const values = [[
    timestamp,
    sucursal,
    wa,
    email,
    partidoLabel,
    partido?.hora || '',
    partido?.bloqueId || '',
    partido?.tipo || 'individual',
  ]];

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Registros!A:H:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values }),
  });
  if (!res.ok) throw new Error(await res.text());
}
