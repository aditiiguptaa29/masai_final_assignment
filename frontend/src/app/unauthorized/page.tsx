export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md text-center p-8">
        <h1 className="text-2xl font-semibold text-slate-900">Access Denied</h1>
        <p className="mt-2 text-slate-600">You do not have permission to view this page.</p>
        <a href="/" className="mt-4 inline-block text-primary-600 hover:text-primary-700">Go back home</a>
      </div>
    </div>
  )
}
