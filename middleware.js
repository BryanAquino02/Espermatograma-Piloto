// middleware.js — Login por sede (Basic Auth) para Espermatograma y Capacitación espermática
//
// Usuario:    CODIGO_SEDE-NN   (ej. SI-01 = San Isidro, operador 01)
// Contraseña: la de la sede     (ej. SANISIDRO2026)
//
// Las contraseñas NO están en este archivo: se guardan en Vercel, en la variable
// de entorno SEDES_PASSWORDS, con este formato (JSON):
//   {"SI":"SANISIDRO2026","LO":"LOSOLIVOS2026", ...}
// Para cambiar una contraseña o agregar una sede, se edita esa variable en Vercel
// y se vuelve a publicar (Redeploy). No hace falta tocar este archivo.

import { next } from '@vercel/functions';

export const config = {
  matcher: '/:path*', // protege todas las páginas y archivos del sitio
};

// Código de sede (2 o 3 letras) + guion + operador (2 dígitos)
const USUARIO_VALIDO = /^([A-Z]{2,3})-(\d{2})$/;

function pedirLogin() {
  return new Response('Acceso restringido. Ingrese su usuario (ej. SI-01) y la contraseña de su sede.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Pranor - Laboratorio", charset="UTF-8"',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}

export default function middleware(request) {
  let contrasenas;
  try {
    contrasenas = JSON.parse(process.env.SEDES_PASSWORDS || '{}');
  } catch {
    return new Response('Error de configuración: la variable SEDES_PASSWORDS no tiene un formato válido.', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Basic ')) return pedirLogin();

  let texto = '';
  try { texto = atob(auth.slice(6)); } catch { return pedirLogin(); }

  const sep = texto.indexOf(':');
  if (sep < 0) return pedirLogin();

  const usuario = texto.slice(0, sep).trim().toUpperCase();
  const contrasena = texto.slice(sep + 1);

  const m = usuario.match(USUARIO_VALIDO);
  if (!m) return pedirLogin();

  const sede = m[1];
  if (contrasenas[sede] && contrasena === contrasenas[sede]) {
    return next(); // usuario correcto: continúa a la página
  }
  return pedirLogin();
}
