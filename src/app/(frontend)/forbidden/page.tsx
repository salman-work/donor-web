import Link from 'next/link'

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 max-w-md w-full text-center">
        <h1 className="text-4xl font-bold text-red-600 mb-4">403 Forbidden</h1>
        <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
          You do not have permission to access this page.
        </p>
        <Link
          href="/"
          className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-semibold transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  )
}
