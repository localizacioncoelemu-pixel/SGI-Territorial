/**
 * Utility to generate and trigger immediate download of desktop shortcut files
 * (.url internet shortcut for Windows and .html executable launcher with embedded vector icon).
 */

export function downloadWindowsShortcut(customUrl?: string, filename = 'SIG_Territorial_Coelemu.url') {
  const targetUrl = customUrl || window.location.href;
  
  // Format for Windows .url Internet Shortcut file
  const shortcutContent = [
    '[InternetShortcut]',
    `URL=${targetUrl}`,
    'IconIndex=0',
    `IconFile=${window.location.origin}/favicon.ico`,
    'HotKey=0',
    '[{000214A0-0000-0000-C000-000000000046}]',
    'Prop3=19,0',
    ''
  ].join('\r\n');

  const blob = new Blob([shortcutContent], { type: 'application/internet-shortcut;charset=utf-8' });
  triggerFileDownload(blob, filename);
}

export function downloadHtmlLauncher(customUrl?: string, filename = 'SIG_Territorial_Coelemu.html') {
  const targetUrl = customUrl || window.location.href;

  const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>SIG Territorial Municipal Coelemu</title>
  <meta http-equiv="refresh" content="0; url=${targetUrl}">
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%23064e3b'/><circle cx='50' cy='50' r='30' fill='%2310b981'/><text x='50' y='60' font-size='28' font-weight='bold' text-anchor='middle' fill='white'>SIG</text></svg>">
  <style>
    body {
      background: #022c22;
      color: #ecfdf5;
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      text-align: center;
    }
    .card {
      background: #064e3b;
      padding: 30px;
      border-radius: 20px;
      border: 1px solid #10b981;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
      max-width: 400px;
    }
    .btn {
      display: inline-block;
      margin-top: 15px;
      padding: 12px 24px;
      background: #10b981;
      color: #022c22;
      text-decoration: none;
      font-weight: bold;
      border-radius: 12px;
    }
  </style>
</head>
<body>
  <div class="card">
    <h2>Abriendo SIG Territorial Coelemu...</h2>
    <p>Redirigiendo a la plataforma oficial de gestión territorial.</p>
    <a class="btn" href="${targetUrl}">Abrir Aplicación</a>
  </div>
  <script>
    window.location.href = "${targetUrl}";
  </script>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  triggerFileDownload(blob, filename);
}

function triggerFileDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
