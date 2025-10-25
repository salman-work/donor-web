// import React from 'react'

// interface ErrorMessageProps {
//   message?: string
//   className?: string
// }

// export function ErrorMessage({ message, className = '' }: ErrorMessageProps) {
//   if (!message) return null
//   return (
//     <div
//       className={`bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-center ${className}`}
//     >
//       {message}
//     </div>
//   )
// }

import React from 'react'

interface ErrorMessageProps {
  message?: string
  title?: string
  className?: string
}

export function ErrorMessage({
  message,
  title = 'Something went wrong',
  className = '',
}: ErrorMessageProps) {
  if (!message) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`relative flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800 shadow-sm ${className}`}
    >
      {/* Icon */}
      <svg
        className="h-5 w-5 flex-shrink-0 text-red-600 mt-0.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      </svg>

      {/* Text */}
      <div className="flex-1">
        <p className="font-semibold">{title}</p>
        <p className="text-sm leading-snug mt-0.5">{message}</p>
      </div>
    </div>
  )
}
