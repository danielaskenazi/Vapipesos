// netlify/functions/registrar.js
// Recibe el registro del cliente y lo guarda en Google Sheets
// Variables de entorno requeridas en Netlify:
//   GOOGLE_SHEET_ID       → ID de tu hoja (de la URL)
//   GOOGLE_SERVICE_EMAIL  → email de la cuenta de servicio
//   GOOGLE_PRIVATE_KEY    → clave privada (con \n reales)

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido' }) };
  }

  const { wa, email, partido, sucursal } = body;
  if (!wa || !email || !partido || !sucursal) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Faltan campos' }) };
  }

  // ── JWT para Google Sheets API ─────────────────────────────────────────
  const SHEET_ID    = process.env.GOOGLE_SHEET_ID;
  const SVC_EMAIL   = process.env.GOOGLE_SERVICE_EMAIL;
  const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

  try {
    const token = await getGoogleToken(SVC_EMAIL, PRIVATE_KEY);
    await appendToSheet(token, SHEET_ID, { wa, email, partido, sucursal });
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('Error al guardar:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Error al guardar registro' }) };
  }
};

// ── Google JWT (sin dependencias externas) ────────────────────────────────
async function getGoogleToken(email, privateKey) {
  const now   = Math.floor(Date.now() / 1000);
  const claim = { iss: email, scope: 'https://www.googleapis.com/auth/spreadsheets', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 };

  const header  = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify(claim));
  const signing = `${header}.${payload}`;

  // Importar clave privada RSA
  const keyData = pemToBuffer(privateKey);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );

  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(signing));
  const jwt = `${signing}.${b64url(sig)}`;

  const res  = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(JSON.stringify(data));
  return data.access_token;
}

async function appendToSheet(token, sheetId, { wa, email, partido, sucursal }) {
  const timestamp = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
  const partidoLabel = partido?.label || partido?.desc || JSON.stringify(partido);
  const bloqueId = partido?.bloqueId || '';

  const values = [[
    timestamp,
    sucursal,
    wa,
    email,
    partidoLabel,
    partido?.hora || '',
    bloqueId,
    partido?.tipo || 'individual',
  ]];

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Registros!A:H:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
}

// ── Utils ─────────────────────────────────────────────────────────────────
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
