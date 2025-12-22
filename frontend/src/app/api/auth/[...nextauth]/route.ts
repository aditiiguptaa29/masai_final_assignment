import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL

if (!BACKEND_URL) {
  console.warn('NEXT_PUBLIC_BACKEND_URL is not set. NextAuth credentials provider will fail to authorize.')
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null
          }

          const res = await fetch(`${BACKEND_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: credentials.email, password: credentials.password }),
          })

          if (!res.ok) {
            return null
          }

          const json = await res.json()
          if (!json?.success || !json?.data?.user || (!json?.data?.token && !json?.data?.accessToken)) {
            return null
          }

          const user = json.data.user
          const token = json.data.accessToken || json.data.token

          return {
            id: user._id,
            name: `${user?.profile?.firstName || ''} ${user?.profile?.lastName || ''}`.trim() || user.email,
            email: user.email,
            role: user.role,
            token,
          } as any
        } catch (e) {
          return null
        }
      },
    }),
  ],
  pages: {
    signIn: '/auth/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      // Persist role and backend token in JWT on login
      if (user) {
        token.role = (user as any).role
        token.backendToken = (user as any).token
      }
      return token
    },
    async session({ session, token }) {
      // Expose role and backend token on session.user
      if (session.user) {
        (session.user as any).role = (token as any).role
        ;(session.user as any).backendToken = (token as any).backendToken
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
