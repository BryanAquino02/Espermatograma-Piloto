// middleware.js — Login por sede con pantalla propia (login.html)
//
// Usuario:    CODIGO_SEDE-NN   (ej. SI-01 = San Isidro, operador 01)
// Contraseña: la de la sede     (ej. SANISIDRO2026)
//
// Variables de entorno en Vercel (Settings → Environment Variables):
//   SEDES_PASSWORDS  → {"SI":"SANISIDRO2026","LO":"LOSOLIVOS2026", ...}
//   SESSION_SECRET   → texto largo al azar (sirve para firmar la sesión)
// Después de cambiarlas, hacer Redeploy.

import { next } from '@vercel/functions';

export const config = { matcher: '/:path*' };

const COOKIE_SESION = 'pranor_sesion';
const COOKIE_USUARIO = 'pranor_usuario';   // solo para mostrar el usuario en pantalla
const DURACION_SEG = 12 * 60 * 60;          // la sesión dura 12 horas
const USUARIO_VALIDO = /^([A-Z]{2,3})-(\d{2})$/;

const enc = new TextEncoder();

function texto(msg, status) {
  return new Response(msg, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

function redirigir(destino, cookies = []) {
  const h = new Headers({ Location: destino, 'Cache-Control': 'no-store' });
  cookies.forEach(c => h.append('Set-Cookie', c));
  return new Response(null, { status: 303, headers: h });
}

function leerCookie(request, nombre) {
  const todas = request.headers.get('cookie') || '';
  for (const parte of todas.split(';')) {
    const i = parte.indexOf('=');
    if (i > -1 && parte.slice(0, i).trim() === nombre) return parte.slice(i + 1).trim();
  }
  return null;
}

async function firmar(contenido) {
  const clave = await crypto.subtle.importKey(
    'raw', enc.encode(process.env.SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const firma = new Uint8Array(await crypto.subtle.sign('HMAC', clave, enc.encode(contenido)));
  let bin = '';
  firma.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// La firma incluye la contraseña de la sede: si se cambia la contraseña,
// las sesiones abiertas de esa sede se cierran solas.
async function crearSesion(usuario, contrasenaSede) {
  const vence = Math.floor(Date.now() / 1000) + DURACION_SEG;
  const firma = await firmar(`${usuario}.${vence}.${contrasenaSede}`);
  return `${usuario}.${vence}.${firma}`;
}

async function sesionValida(valor, contrasenas) {
  if (!valor) return false;
  const [usuario, vence, firma] = valor.split('.');
  const m = (usuario || '').match(USUARIO_VALIDO);
  if (!m || !contrasenas[m[1]]) return false;
  if (!(Number(vence) > Date.now() / 1000)) return false;
  return firma === await firmar(`${usuario}.${vence}.${contrasenas[m[1]]}`);
}

export default async function middleware(request) {
  if (!process.env.SESSION_SECRET) return texto('Error de configuración: falta la variable SESSION_SECRET.', 500);

  let contrasenas;
  try { contrasenas = JSON.parse(process.env.SEDES_PASSWORDS || '{}'); }
  catch { return texto('Error de configuración: SEDES_PASSWORDS no tiene un formato válido.', 500); }

  const { pathname } = new URL(request.url);
  const sesion = leerCookie(request, COOKIE_SESION);

  // 1) Envío del formulario de login
  if (pathname === '/login') {
    if (request.method !== 'POST') return redirigir('/login.html');
    let usuario = '', contrasena = '';
    try {
      const datos = await request.formData();
      usuario = String(datos.get('usuario') || '').trim().toUpperCase();
      contrasena = String(datos.get('contrasena') || '');
    } catch { /* formulario vacío o inválido */ }

    const m = usuario.match(USUARIO_VALIDO);
    if (!m) return redirigir('/login.html?error=formato&u=' + encodeURIComponent(usuario));
    const sede = m[1];
    if (!contrasenas[sede] || contrasena !== contrasenas[sede]) {
      return redirigir('/login.html?error=datos&u=' + encodeURIComponent(usuario));
    }
    const valor = await crearSesion(usuario, contrasenas[sede]);
    return redirigir('/', [
      `${COOKIE_SESION}=${valor}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${DURACION_SEG}`,
      `${COOKIE_USUARIO}=${usuario}; Path=/; Secure; SameSite=Lax; Max-Age=${DURACION_SEG}`,
    ]);
  }

  // 2) Cerrar sesión
  if (pathname === '/logout') {
    return redirigir('/login.html', [
      `${COOKIE_SESION}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
      `${COOKIE_USUARIO}=; Path=/; Secure; SameSite=Lax; Max-Age=0`,
    ]);
  }

  // 3) La pantalla de login es pública (si ya hay sesión, va directo al inicio)
  if (pathname === '/login.html') {
    if (await sesionValida(sesion, contrasenas)) return redirigir('/');
    return next();
  }

  // 4) Todo lo demás requiere sesión
  if (await sesionValida(sesion, contrasenas)) return next();
  return redirigir('/login.html');
}
