import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip middleware for static assets, public routes, and API
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api') || 
    pathname.includes('.') ||
    pathname === '/'
  ) {
    return NextResponse.next();
  }

  // 2. Auth Guard: Check if user is logged in
  const adminUid = request.cookies.get('admin_uid')?.value;
  if (!adminUid) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const role = request.cookies.get('userRole')?.value?.trim().toLowerCase() || '';

  // 3. Payments Access (Admin, SuperAdmin, Accountant ONLY)
  if (pathname.startsWith('/dashboard/payments')) {
    const authorized = ['admin', 'superadmin', 'super-admin', 'accountant'];
    if (!authorized.includes(role)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // 4. Logs Access (Admin, SuperAdmin, Accountant, AND Customer Support)
  if (pathname.startsWith('/dashboard/logs')) {
    const authorized = ['admin', 'superadmin', 'super-admin', 'accountant', 'customer-support'];
    if (!authorized.includes(role)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // 5. Restricted Guard: User & Role Management (Admin, SuperAdmin, CS)
  if (pathname.startsWith('/dashboard/users') || pathname.startsWith('/dashboard/manage-roles')) {
    const authorized = ['admin', 'superadmin', 'super-admin', 'customer-support'];
    if (!authorized.includes(role)) {
      return NextResponse.redirect(new URL('/dashboard/payments', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};