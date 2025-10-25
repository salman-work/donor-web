import { NextRequest } from 'next/server'

// Authentication: checks if user is logged in via cookie
export function isAuthenticated(req: NextRequest): boolean {
  console.log('Checking authentication status in middleware')
  console.log('Request Url:', req.url)

  const token = req.cookies.get('donorapi-refreshtoken-jwt')?.value
  return !!token
}

// Authorization: checks if user has required role
export function hasRole(req: NextRequest, allowedRoles: string[]): boolean {
  // Example: role stored in cookie (customize as needed)
  const role = req.cookies.get('role')?.value
  return role ? allowedRoles.includes(role) : false
}
