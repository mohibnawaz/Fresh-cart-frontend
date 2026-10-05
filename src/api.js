// Every call goes through the API Gateway (port 8080) via the Vite proxy.
const BASE = 'https://spring-api-gateway-0rm3.onrender.com'
const listeners = new Set()
let counter = 0

export const onLog = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

async function call(method, url, body, silent = false) {
  const t0 = performance.now()
  let status = 0
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    status = res.status
    if (!res.ok) throw new Error('HTTP ' + res.status)
    return await res.json()
  } finally {
    if (!silent) {
      const entry = {
        id: ++counter,
        method,
        url,
        status,
        ms: Math.round(performance.now() - t0),
      }
      listeners.forEach((fn) => fn(entry))
    }
  }
}

// silent = true skips the on-screen API log (used by background auto-refresh)
export const getProducts = (silent) => call('GET', `${BASE}/api/products`, undefined, silent)
export const addProduct = (p) => call('POST', `${BASE}/api/products`, p)
export const getOrders = (silent) => call('GET', `${BASE}/api/orders`, undefined, silent)
export const addOrder = (o) => call('POST', `${BASE}/api/orders`, o)