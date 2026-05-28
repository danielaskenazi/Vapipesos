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

  const { nombre, wa, email, partido, sucursal } = body;
  if (!nombre || !wa || !email || !partido || !sucursal) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Faltan campos' }) };
  }

  // ── JWT para Google Sheets API ─────────────────────────────────────────
  const SHEET_ID    = process.env.GOOGLE_SHEET_ID;
  const SVC_EMAIL   = process.env.GOOGLE_SERVICE_EMAIL;
  const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

  try {
    const token = await getGoogleToken(SVC_EMAIL, PRIVATE_KEY);

    // 1. Guardar registro normal
    await appendToSheet(token, SHEET_ID, { nombre, wa, email, partido, sucursal });

    // 2. Contar cuántas veces aparece este número en la hoja Registros
    const conteo = await contarRegistrosWA(token, SHEET_ID, wa);

    // 3. Si llegó a 3 o más, escribir alerta
    if (conteo >= 3) {
      await registrarAlerta(token, SHEET_ID, { nombre, wa, sucursal, total: conteo });
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('Error al guardar:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Error al guardar registro' }) };
  }
};

// ── Contar registros del mismo WhatsApp ───────────────────────────────────
async function contarRegistrosWA(token, sheetId, wa) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Registros!C:C`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return 0;
  const data = await res.json();
  const filas = data.values || [];
  const waNorm = wa.replace(/\D/g, '');
  return filas.filter(fila => fila[0] && fila[0].replace(/\D/g, '') === waNorm).length;
}

// ── Escribir fila en hoja Alertas ─────────────────────────────────────────
async function registrarAlerta(token, sheetId, { nombre, wa, sucursal, total }) {
  const timestamp = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
  const values = [[timestamp, wa, nombre, sucursal, total]];

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Alertas!A:E:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('Error al escribir alerta:', err);
  }
}

// ── Guardar registro en hoja Registros ────────────────────────────────────
async function appendToSheet(token, sheetId, { nombre, wa, email, partido, sucursal }) {
  const timestamp = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
  const partidoLabel = partido?.label || partido?.desc || JSON.stringify(partido);
  const bloqueId = partido?.bloqueId || '';

  const values = [[
    timestamp,
    sucursal,
    wa,
    nombre,
    email,
    partidoLabel,
    partido?.hora || '',
    bloqueId,
    partido?.tipo || 'individual',
  ]];

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Registros!A:I:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
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

// ── Google JWT (sin dependencias externas) ────────────────────────────────
async function getGoogleToken(email, privateKey) {
  const now   = Math.floor(Date.now() / 1000);
  const claim = { iss: email, scope: 'https://www.googleapis.com/auth/spreadsheets', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 };

  const header  = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify(claim));
  const signing = `${header}.${payload}`;

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
