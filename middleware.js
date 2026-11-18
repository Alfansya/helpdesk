import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const IS_PROD = process.env.NODE_ENV === 'production';
const COOKIE = IS_PROD ? '__Host-sid' : 'sid';

function secretKey() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) return null;
  return new TextEncoder().encode(s);
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname === '/login') {
    const token = request.cookies.get(COOKIE)?.value || request.cookies.get('sid')?.value;
    if (token) {
      try {
        const key = secretKey();
        if (key) {
          await jwtVerify(token, key, { algorithms: ['HS256'] });
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
      } catch {
        // Token tidak valid/kedaluwarsa, biarkan lanjut ke login
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/login'],
};
