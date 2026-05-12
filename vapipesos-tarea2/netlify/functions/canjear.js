// netlify/functions/canjear.js
// Panel mesero — validación y canje de cupones Vapipesos
// Variables de entorno requeridas (mismas que registrar.js):
//   GOOGLE_SHEET_ID, GOOGLE_SERVICE_EMAIL, GOOGLE_PRIVATE_KEY
// Autenticación via header: x-panel-key  (contraseña mesero: mesero2026)

const MESERO_KEY = process.env.MESERO_KEY || 'mesero2026';

// Columnas hoja Cupones (base 0):
// A=0 Código | B=1 WhatsApp | C=2 Email | D=3 Partido | E=4 Sucursal
// F=5 Monto  | G=6 FechaEmisión | H=7 FechaVencimiento | I=8 Usado

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-panel-key',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido' }) };

  const key = (event.headers['x-panel-key'] || '').trim();
  if (key !== MESERO_KEY) return { statusCode: 401, headers, body: JSON.stringify({ error: 'No autorizado' }) };

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido' }) }; }

  const SHEET_ID    = process.env.GOOGLE_SHEET_ID;
  const SVC_EMAIL   = process.env.GOOGLE_SERVICE_EMAIL;
  const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

  try {
    const token = await getGoogleToken(SVC_EMAIL, PRIVATE_KEY);

    // ── BUSCAR cupón ────────────────────────────────────────────────────
    if (body.action === 'buscar') {
      const codigo = (body.codigo || '').trim().toUpperCase();
      if (!codigo) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Código requerido' }) };

      const { fila, cupon } = await buscarCupon(token, SHEET_ID, codigo);

      if (!cupon) return { statusCode: 200, headers, body: JSON.stringify({ ok: true, estado: 'no_encontrado' }) };

      const estado = calcularEstado(cupon);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, estado, cupon }) };
    }

    // ── CANJEAR cupón ───────────────────────────────────────────────────
    if (body.action === 'canjear') {
      const codigo = (body.codigo || '').trim().toUpperCase();
      if (!codigo) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Código requerido' }) };

      const { fila, cupon } = await buscarCupon(token, SHEET_ID, codigo);

      if (!cupon)              return { statusCode: 200, headers, body: JSON.stringify({ ok: true, estado: 'no_encontrado' }) };
      if (cupon.usado === 'Sí') return { statusCode: 200, headers, body: JSON.stringify({ ok: true, estado: 'ya_canjeado' }) };

      const estado = calcularEstado(cupon);
      if (estado === 'vencido') return { statusCode: 200, headers, body: JSON.stringify({ ok: true, estado: 'vencido', cupon }) };

      // Marcar como usado
      await marcarUsado(token, SHEET_ID, fila);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, estado: 'canjeado', cupon }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Acción no válida' }) };

  } catch (err) {
    console.error('[canjear] Error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

// ── Buscar cupón por código ───────────────────────────────────────────────
async function buscarCupon(token, sheetId, codigo) {
  const rows = await readSheet(token, sheetId, 'Cupones!A:I');
  if (!rows || rows.length <= 1) return { fila: null, cupon: null };

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if ((r[0] || '').toUpperCase() === codigo) {
      return {
        fila: i + 1, // número de fila en Sheets (1-based, +1 por encabezado)
        cupon: {
          codigo:         r[0] || '',
          wa:             r[1] || '',
          email:          r[2] || '',
          partido:        r[3] || '',
          sucursal:       r[4] || '',
          monto:          Number(r[5]) || 0,
          fechaEmision:   r[6] || '',
          fechaVenc:      r[7] || '',
          usado:          r[8] || 'No',
        },
      };
    }
  }
  return { fila: null, cupon: null };
}

// ── Determinar estado del cupón ───────────────────────────────────────────
function calcularEstado(cupon) {
  if (cupon.usado === 'Sí') return 'ya_canjeado';

  // Parsear fecha de vencimiento (formato D/M/YYYY de es-MX)
  const partes = (cupon.fechaVenc || '').split('/').map(Number);
  if (partes.length === 3) {
    const [d, m, y] = partes;
    const vence = new Date(y, m - 1, d, 23, 59, 59);
    const ahora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
    if (ahora > vence) return 'vencido';
  }

  return 'valido';
}

// ── Marcar cupón como usado ───────────────────────────────────────────────
async function marcarUsado(token, sheetId, fila) {
  const range = encodeURIComponent(`Cupones!I${fila}`);
  const url   = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?valueInputOption=USER_ENTERED`;
  const res   = await fetch(url, {
    method:  'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ values: [['Sí']] }),
  });
  if (!res.ok) throw new Error(await res.text());
}

// ── Leer hoja ─────────────────────────────────────────────────────────────
async function readSheet(token, sheetId, range) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.values || [];
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
