# VAPIPESOS — Guía de instalación Tarea 2
## Google Sheets + Netlify Functions

---

## PASO 1 — Crear la hoja de Google Sheets

1. Ve a **sheets.google.com** → crea una hoja nueva
2. Nómbrala: `VAPIPESOS Registros`
3. En la pestaña inferior (dice "Hoja 1"), haz clic derecho → **Cambiar nombre** → escribe: `Registros`
4. En la fila 1, escribe estos encabezados (uno por celda):

   | A | B | C | D | E | F | G | H |
   |---|---|---|---|---|---|---|---|
   | Timestamp | Sucursal | WhatsApp | Email | Partido | Hora | BloqueID | Tipo |

5. Copia la **ID de la hoja** de la URL:
   `https://docs.google.com/spreadsheets/d/ **ESTA-PARTE** /edit`

---

## PASO 2 — Crear cuenta de servicio en Google Cloud

1. Ve a: **console.cloud.google.com**
2. Crea un proyecto nuevo → nómbralo `vapipesos`
3. Menú izquierdo → **APIs y servicios** → **Biblioteca**
4. Busca `Google Sheets API` → habilítala
5. Menú izquierdo → **APIs y servicios** → **Credenciales**
6. Clic en **+ Crear credenciales** → **Cuenta de servicio**
7. Nombre: `vapipesos-sheets` → clic en **Crear y continuar** → **Listo**
8. Clic en la cuenta de servicio recién creada
9. Pestaña **Claves** → **Agregar clave** → **Crear clave nueva** → **JSON** → Descargar
10. Abre el archivo JSON descargado — necesitas dos valores:
    - `"client_email"` → es tu GOOGLE_SERVICE_EMAIL
    - `"private_key"` → es tu GOOGLE_PRIVATE_KEY

---

## PASO 3 — Compartir la hoja con la cuenta de servicio

1. Abre tu hoja de Google Sheets
2. Clic en **Compartir** (arriba a la derecha)
3. Pega el `client_email` del JSON (termina en `.iam.gserviceaccount.com`)
4. Rol: **Editor** → clic en **Enviar**

---

## PASO 4 — Subir el proyecto a GitHub

1. Ve a **github.com** → crea una cuenta si no tienes
2. Clic en **+** → **New repository** → nombre: `vapipesos` → **Create repository**
3. En tu compu, descarga e instala **GitHub Desktop**: desktop.github.com
4. Abre GitHub Desktop → **Clone a repository** → elige `vapipesos`
5. Copia estos 3 archivos/carpetas a la carpeta del repositorio:
   - `index.html`
   - `netlify.toml`
   - carpeta `netlify/` (con `functions/registrar.js` adentro)
6. En GitHub Desktop: escribe un mensaje ("primer deploy") → **Commit to main** → **Push origin**

---

## PASO 5 — Conectar GitHub con Netlify

1. Ve a **netlify.com** → inicia sesión
2. **Add new site** → **Import an existing project** → **GitHub**
3. Selecciona el repo `vapipesos`
4. Build settings: déjalos en blanco (se leen del `netlify.toml`)
5. Clic en **Deploy site**

---

## PASO 6 — Agregar las variables de entorno en Netlify

1. En tu sitio de Netlify → **Site configuration** → **Environment variables**
2. Agrega estas 3 variables:

   | Key | Value |
   |-----|-------|
   | `GOOGLE_SHEET_ID` | La ID que copiaste en el Paso 1 |
   | `GOOGLE_SERVICE_EMAIL` | El `client_email` del JSON |
   | `GOOGLE_PRIVATE_KEY` | El `private_key` del JSON (cópialo completo, incluyendo `-----BEGIN...`) |

3. Clic en **Save** → ve a **Deploys** → **Trigger deploy**

---

## PASO 7 — Probar

1. Abre tu landing: `https://tu-sitio.netlify.app/?s=carso`
2. Selecciona un partido → regístrate con un WhatsApp y email de prueba
3. Ve a tu Google Sheet → el registro debe aparecer en segundos

---

## Estructura final del proyecto

```
vapiano/
├── index.html                    ← La landing
├── netlify.toml                  ← Configuración Netlify
└── netlify/
    └── functions/
        └── registrar.js          ← Backend que guarda en Sheets
```

---

**¿Algo no funciona?** Dile a Claude exactamente qué paso y qué mensaje de error ves.
