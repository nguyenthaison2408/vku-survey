// ── Simple Hash-Based SPA Router ───────────────────────────────────────────

type RouteHandler = (params: Record<string, string>) => void | Promise<void>

interface Route {
  pattern: RegExp
  paramNames: string[]
  handler: RouteHandler
}

const routes: Route[] = []
let currentRoute = ''

export function defineRoute(path: string, handler: RouteHandler) {
  // Convert :param to capture groups
  const paramNames: string[] = []
  const pattern = path
    .replace(/:([^/]+)/g, (_match, name: string) => {
      paramNames.push(name)
      return '([^/]+)'
    })
    .replace(/\//g, '\\/')

  routes.push({
    pattern: new RegExp(`^${pattern}$`),
    paramNames,
    handler
  })
}

export function navigate(path: string) {
  window.location.hash = path
}

function matchRoute(hash: string) {
  const path = hash.replace(/^#/, '') || '/'

  for (const route of routes) {
    const match = path.match(route.pattern)
    if (match) {
      const params: Record<string, string> = {}
      route.paramNames.forEach((name, i) => {
        params[name] = match[i + 1] ?? ''
      })
      return { handler: route.handler, params }
    }
  }
  return null
}

export function initRouter() {
  const handleRoute = async () => {
    const hash = window.location.hash || '#/'
    if (hash === currentRoute) return
    currentRoute = hash

    // Update bottom nav active state
    document.querySelectorAll('.bottom-nav-item').forEach(el => {
      const a = el as HTMLAnchorElement
      const route = a.dataset['route']
      const pathSegment = hash.replace('#/', '').split('/')[0]
      const isActive = route === 'home' ? (pathSegment === '' || pathSegment === '/') : pathSegment === route
      a.classList.toggle('active', isActive)
    })

    const matched = matchRoute(hash)
    if (matched) {
      await matched.handler(matched.params)
    } else {
      // 404 fallback — redirect to home
      navigate('/')
    }
  }

  window.addEventListener('hashchange', handleRoute)
  handleRoute() // Handle initial route
}
