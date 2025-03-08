import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  debug: true,
  pages: {
    signIn: '/login',
    newUser: '/',
  },
  providers: [
    // Make sure your email provider is properly configured here.
  ],
  callbacks: {
    async signIn({ user }) {
      // Log the sign-in attempt
      console.log('SignIn callback triggered for:', user.email);
      const email = user.email?.toLowerCase();
      if (!email || !email.endsWith('@centralwcu.org')) {
        console.error('Rejected sign in for:', user.email);
        return false; // Reject the sign in attempt
      }
      return true;
    },
    // You might want to temporarily disable this callback for testing
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnChat = nextUrl.pathname.startsWith('/');
      const isOnRegister = nextUrl.pathname.startsWith('/register');
      const isOnLogin = nextUrl.pathname.startsWith('/login');

      if (isLoggedIn && (isOnLogin || isOnRegister)) {
        return Response.redirect(new URL('/', nextUrl as unknown as URL));
      }

      if (isOnRegister || isOnLogin) {
        return true; // Always allow access to register and login pages
      }

      if (isOnChat) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      }

      if (isLoggedIn) {
        return Response.redirect(new URL('/', nextUrl as unknown as URL));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
