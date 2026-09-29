import { useCallback, useEffect, useMemo, useState } from 'react'
import { getProducts, addProduct, getOrders, addOrder, onLog } from './api'
import { money, infoFor, CAT_STYLE, CATEGORIES, SAMPLE, FREE_DELIVERY } from './utils'

const STEPS = ['PLACED', 'SHIPPED', 'DELIVERED']

/* ---------- small building blocks ---------- */

function useCountUp(target, ms = 700) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf
    let start
    const step = (t) => {
      if (!start) start = t
      const p = Math.min((t - start) / ms, 1)
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}

function Stat({ icon, label, value, format = (v) => v.toLocaleString('en-IN') }) {
  const v = useCountUp(value)
  return (
    <div className="stat">
      <div className="stat-icon">{icon}</div>
      <div>
        <div className="stat-value">{format(v)}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  )
}

function Tile({ name, size = 'md' }) {
  const { emoji, cat } = infoFor(name)
  const [a, b] = CAT_STYLE[cat]
  return (
    <div className={'tile ' + size} style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}>
      {emoji}
    </div>
  )
}

function Qty({ value, onInc, onDec }) {
  return (
    <div className="qty">
      <button onClick={onDec} aria-label="Decrease">−</button>
      <span>{value}</span>
      <button onClick={onInc} aria-label="Increase">+</button>
    </div>
  )
}

function Pill({ label, ok }) {
  const cls = ok === null ? 'wait' : ok ? 'up' : 'down'
  return (
    <span className={'status-pill ' + cls}>
      <i />
      {label}
    </span>
  )
}

function Steps({ status }) {
  const idx = Math.max(0, STEPS.indexOf(String(status).toUpperCase()))
  return (
    <div className="steps">
      {STEPS.map((s, i) => (
        <div key={s} className={'step' + (i <= idx ? ' done' : '') + (i === idx ? ' now' : '')}>
          <span className="dot">{i < idx ? '✓' : i + 1}</span>
          <span>{s[0] + s.slice(1).toLowerCase()}</span>
        </div>
      ))}
    </div>
  )
}

const serviceOf = (url) => (url.includes('/products') ? 'Product Service :8081' : 'Order Service :8082')

/* ---------- app ---------- */

export default function App() {
  const [theme, setTheme] = useState(
    () =>
      localStorage.getItem('fc.theme') ||
      (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  )
  const [tab, setTab] = useState('shop')
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [health, setHealth] = useState({ product: null, order: null })
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fc.cart')) || {} } catch { return {} }
  })
  const [cartOpen, setCartOpen] = useState(false)
  const [receipt, setReceipt] = useState(null)
  const [logs, setLogs] = useState([])
  const [logOpen, setLogOpen] = useState(false)
  const [toasts, setToasts] = useState([])
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('All')
  const [sort, setSort] = useState('featured')
  const [form, setForm] = useState({ name: '', price: '' })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('fc.theme', theme)
  }, [theme])
  useEffect(() => { localStorage.setItem('fc.cart', JSON.stringify(cart)) }, [cart])
  useEffect(() => onLog((e) => setLogs((l) => [e, ...l].slice(0, 10))), [])

  const toast = (msg, type = 'ok') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, msg, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }

  const refresh = useCallback(async (silent = false) => {
    const [p, o] = await Promise.allSettled([getProducts(silent), getOrders(silent)])
    if (p.status === 'fulfilled') setProducts(p.value)
    if (o.status === 'fulfilled') setOrders(o.value)
    setHealth({ product: p.status === 'fulfilled', order: o.status === 'fulfilled' })
    setLoading(false)
  }, [])

  // first load + background auto-refresh every 8 seconds
  useEffect(() => {
    refresh(false)
    const id = setInterval(() => refresh(true), 8000)
    return () => clearInterval(id)
  }, [refresh])

  /* derived data */
  const byId = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products])
  const cartItems = useMemo(
    () => Object.entries(cart).map(([id, qty]) => ({ product: byId[id], qty })).filter((i) => i.product),
    [cart, byId]
  )
  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0)
  const cartTotal = cartItems.reduce((s, i) => s + i.qty * i.product.price, 0)

  const catCounts = useMemo(() => {
    const c = { All: products.length }
    products.forEach((p) => { const k = infoFor(p.name).cat; c[k] = (c[k] || 0) + 1 })
    return c
  }, [products])

  const shown = useMemo(() => {
    let list = products.filter(
      (p) =>
        p.name.toLowerCase().includes(query.trim().toLowerCase()) &&
        (cat === 'All' || infoFor(p.name).cat === cat)
    )
    if (sort === 'low') list = [...list].sort((a, b) => a.price - b.price)
    if (sort === 'high') list = [...list].sort((a, b) => b.price - a.price)
    if (sort === 'az') list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    return list
  }, [products, query, cat, sort])

  const enriched = useMemo(
    () =>
      orders.map((o) => ({
        ...o,
        product: byId[o.productId],
        amount: o.quantity * (byId[o.productId]?.price || 0),
      })),
    [orders, byId]
  )
  const revenue = enriched.reduce((s, o) => s + o.amount, 0)
  const units = orders.reduce((s, o) => s + o.quantity, 0)
  const topProducts = useMemo(() => {
    const m = {}
    enriched.forEach((o) => {
      const k = o.product?.name || '#' + o.productId
      m[k] = (m[k] || 0) + o.amount
    })
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [enriched])

  const offline = !loading && health.product === false && health.order === false

  /* actions */
  const add = (id) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }))
  const dec = (id) =>
    setCart((c) => {
      const n = (c[id] || 0) - 1
      const next = { ...c }
      if (n <= 0) delete next[id]
      else next[id] = n
      return next
    })
  const removeItem = (id) => setCart((c) => { const n = { ...c }; delete n[id]; return n })

  const checkout = async () => {
    if (!cartItems.length) return
    setBusy(true)
    try {
      const created = []
      for (const { product, qty } of cartItems) {
        const o = await addOrder({ productId: product.id, quantity: qty, status: 'PLACED' })
        created.push({ ...o, name: product.name, amount: qty * product.price })
      }
      setReceipt({ items: created, total: created.reduce((s, o) => s + o.amount, 0) })
      setCart({})
      setCartOpen(false)
      refresh(true)
    } catch {
      toast('Checkout failed. Is the Order Service running?', 'err')
    }
    setBusy(false)
  }

  const submitProduct = async (e) => {
    e.preventDefault()
    try {
      await addProduct({ name: form.name.trim(), price: Number(form.price) })
      setForm({ name: '', price: '' })
      await refresh(true)
      toast('Product saved by the Product Service')
    } catch {
      toast('Could not add product', 'err')
    }
  }

  const loadSample = async () => {
    const have = new Set(products.map((p) => p.name.toLowerCase()))
    const todo = SAMPLE.filter((p) => !have.has(p.name.toLowerCase()))
    if (!todo.length) return toast('Sample products are already in the catalog')
    setBusy(true)
    try {
      for (const p of todo) await addProduct(p)
      await refresh(true)
      toast(`Added ${todo.length} products`)
    } catch {
      toast('Could not load the sample catalog', 'err')
    }
    setBusy(false)
  }

  const anyUp = health.product || health.order

  return (
    <div className="app">
      {/* ---------- nav ---------- */}
      <header className="nav">
        <div className="nav-in">
          <button className="brand" onClick={() => setTab('shop')}>
            <span className="brand-mark">🥬</span>FreshCart
          </button>
          <nav className="tabs">
            {[['shop', 'Shop'], ['orders', 'Orders'], ['dashboard', 'Dashboard']].map(([k, label]) => (
              <button key={k} className={'tab' + (tab === k ? ' active' : '')} onClick={() => setTab(k)}>
                {label}
                {k === 'orders' && orders.length > 0 && <span className="tab-badge">{orders.length}</span>}
              </button>
            ))}
          </nav>
          <div className="nav-right">
            <button className="icon-btn" title="Toggle theme"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button className="cart-btn" onClick={() => setCartOpen(true)}>
              🛒 <span>Cart</span>
              <b key={cartCount} className="cart-count">{cartCount}</b>
            </button>
          </div>
        </div>
      </header>

      {/* ---------- hero ---------- */}
      {tab === 'shop' && (
        <section className="hero">
          <div className="hero-in">
            <div className="hero-copy">
              <span className="eyebrow">⚡ Live microservices demo</span>
              <h1>Fresh groceries,<br /><span className="grad">delivered fast.</span></h1>
              <p>
                The catalog is served by the Product Service and every order is saved by the Order
                Service. Each request flows through the API Gateway.
              </p>
              <div className="search-box">
                <span>🔎</span>
                <input placeholder="Search apples, milk, bread..." value={query}
                  onChange={(e) => setQuery(e.target.value)} />
                {query && <button className="clear" onClick={() => setQuery('')}>✕</button>}
              </div>
              <div className="pills">
                <Pill label="Gateway :8080" ok={health.product === null ? null : !!anyUp} />
                <Pill label="Product Service :8081" ok={health.product} />
                <Pill label="Order Service :8082" ok={health.order} />
              </div>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="float f1">🍎</div>
              <div className="float f2">🥕</div>
              <div className="float f3">🥛</div>
              <div className="float f4">🍞</div>
              <div className="float f5">🥑</div>
              <div className="float f6">🍌</div>
            </div>
          </div>
        </section>
      )}

      <main className="page">
        {offline && (
          <div className="banner">
            <b>Cannot reach the API Gateway on port 8080.</b> Start all four backend services, then
            <button className="link" onClick={() => refresh(false)}>retry</button>.
          </div>
        )}

        {/* ---------- shop ---------- */}
        {tab === 'shop' && (
          <>
            <div className="toolbar">
              <div className="chips">
                {CATEGORIES.filter((c) => c === 'All' || catCounts[c]).map((c) => (
                  <button key={c} className={'chip' + (cat === c ? ' on' : '')} onClick={() => setCat(c)}>
                    {c}<em>{catCounts[c] || 0}</em>
                  </button>
                ))}
              </div>
              <select className="select" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="featured">Sort: Featured</option>
                <option value="low">Price: Low to high</option>
                <option value="high">Price: High to low</option>
                <option value="az">Name: A to Z</option>
              </select>
            </div>
            <div className="result-line">
              {shown.length} item{shown.length !== 1 ? 's' : ''}{query && ` for "${query}"`}
            </div>

            {loading ? (
              <div className="grid">
                {Array.from({ length: 8 }).map((_, i) => <div key={i} className="card skeleton" />)}
              </div>
            ) : products.length === 0 ? (
              <div className="empty">
                <div className="empty-emoji">🧺</div>
                <h3>The catalog is empty</h3>
                <p>Load a starter set of groceries into the Product Service.</p>
                <button className="primary" disabled={busy || offline} onClick={loadSample}>
                  {busy ? 'Loading...' : 'Load sample catalog'}
                </button>
              </div>
            ) : shown.length === 0 ? (
              <div className="empty">
                <div className="empty-emoji">🔍</div>
                <h3>No products match</h3>
                <p>Try a different search or category.</p>
                <button className="ghost" onClick={() => { setQuery(''); setCat('All') }}>Clear filters</button>
              </div>
            ) : (
              <div className="grid">
                {shown.map((p, i) => (
                  <article className="card" key={p.id} style={{ animationDelay: Math.min(i, 12) * 40 + 'ms' }}>
                    <Tile name={p.name} size="lg" />
                    <span className="tag">{infoFor(p.name).cat}</span>
                    <h3>{p.name}</h3>
                    <div className="card-foot">
                      <div className="price">{money(p.price)}</div>
                      {cart[p.id] ? (
                        <Qty value={cart[p.id]} onInc={() => add(p.id)} onDec={() => dec(p.id)} />
                      ) : (
                        <button className="add" onClick={() => add(p.id)}>+ Add</button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}

        {/* ---------- orders ---------- */}
        {tab === 'orders' && (
          <section>
            <div className="page-head">
              <h2>Your orders</h2>
              <span className="note">Order Service · auto-refreshing</span>
            </div>
            <div className="stats">
              <Stat icon="🧾" label="Orders" value={orders.length} />
              <Stat icon="📦" label="Items" value={units} />
              <Stat icon="💳" label="Total spent" value={revenue} format={money} />
            </div>
            {orders.length === 0 ? (
              <div className="empty">
                <div className="empty-emoji">📭</div>
                <h3>No orders yet</h3>
                <p>Add something to your cart and place an order.</p>
                <button className="primary" onClick={() => setTab('shop')}>Start shopping</button>
              </div>
            ) : (
              <div className="orders">
                {[...enriched].reverse().map((o, i) => (
                  <div className="order" key={o.id} style={{ animationDelay: Math.min(i, 10) * 40 + 'ms' }}>
                    <div className="order-main">
                      <Tile name={o.product?.name || ''} />
                      <div className="order-info">
                        <div className="order-title">{o.product?.name || 'Product #' + o.productId}</div>
                        <div className="muted">Order #{o.id} · {o.quantity} × {money(o.product?.price)}</div>
                      </div>
                      <div className="order-amount">{money(o.amount)}</div>
                    </div>
                    <Steps status={o.status} />
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ---------- dashboard ---------- */}
        {tab === 'dashboard' && (
          <section>
            <div className="page-head">
              <h2>Dashboard</h2>
              <span className="note">Live data from both services</span>
            </div>
            <div className="stats four">
              <Stat icon="🛍️" label="Products" value={products.length} />
              <Stat icon="🧾" label="Orders" value={orders.length} />
              <Stat icon="📦" label="Units sold" value={units} />
              <Stat icon="💰" label="Revenue" value={revenue} format={money} />
            </div>

            <div className="two">
              <div className="panel">
                <h3>Revenue by product</h3>
                {topProducts.length === 0 ? (
                  <p className="muted">No sales yet. Place an order to see the chart.</p>
                ) : (
                  <div className="bars">
                    {topProducts.map(([name, amt]) => (
                      <div className="bar-row" key={name}>
                        <span className="bar-name">{name}</span>
                        <div className="bar-track">
                          <div className="bar-fill" style={{ width: (amt / topProducts[0][1]) * 100 + '%' }} />
                        </div>
                        <span className="bar-val">{money(amt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="panel">
                <h3>Add a product <span className="mini">Product Service</span></h3>
                <form onSubmit={submitProduct} className="form">
                  <input placeholder="Product name" required value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  <input placeholder="Price (₹)" type="number" min="1" required value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })} />
                  <button className="primary" type="submit">Save product</button>
                </form>
                <button className="ghost wide" disabled={busy} onClick={loadSample}>
                  {busy ? 'Loading...' : 'Load sample catalog'}
                </button>
              </div>
            </div>

            <div className="panel">
              <h3>System architecture <span className="mini">live status</span></h3>
              <div className="flow">
                <div className="node"><b>React</b><small>:5173</small></div>
                <span className="arrow">→</span>
                <div className={'node ' + (anyUp ? 'ok' : 'bad')}><b>API Gateway</b><small>:8080</small></div>
                <span className="arrow">→</span>
                <div className="node-col">
                  <div className={'node ' + (health.product ? 'ok' : 'bad')}><b>Product Service</b><small>:8081 · MySQL</small></div>
                  <div className={'node ' + (health.order ? 'ok' : 'bad')}><b>Order Service</b><small>:8082 · MySQL</small></div>
                </div>
                <span className="arrow">⇢</span>
                <div className="node"><b>Eureka</b><small>:8761</small></div>
              </div>
              <div className="links">
                <a href="http://localhost:8761" target="_blank" rel="noreferrer">Eureka dashboard</a>
                <a href="http://localhost:8081/swagger-ui.html" target="_blank" rel="noreferrer">Product Swagger</a>
                <a href="http://localhost:8082/swagger-ui.html" target="_blank" rel="noreferrer">Order Swagger</a>
                <a href="/api/products" target="_blank" rel="noreferrer">/api/products</a>
                <a href="/api/orders" target="_blank" rel="noreferrer">/api/orders</a>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="foot">FreshCart · Spring Cloud microservices demo · React + Vite</footer>

      {/* ---------- cart drawer ---------- */}
      <div className={'scrim' + (cartOpen ? ' show' : '')} onClick={() => setCartOpen(false)} />
      <aside className={'drawer' + (cartOpen ? ' open' : '')}>
        <div className="drawer-head">
          <h2>Your cart <small>{cartCount} item{cartCount !== 1 ? 's' : ''}</small></h2>
          <button className="icon-btn" onClick={() => setCartOpen(false)}>✕</button>
        </div>
        {cartItems.length === 0 ? (
          <div className="empty small">
            <div className="empty-emoji">🛒</div>
            <p>Your cart is empty.</p>
            <button className="primary" onClick={() => { setCartOpen(false); setTab('shop') }}>Browse products</button>
          </div>
        ) : (
          <>
            <div className="ship">
              <div className="ship-text">
                {cartTotal >= FREE_DELIVERY
                  ? '🎉 Free delivery unlocked'
                  : `Add ${money(FREE_DELIVERY - cartTotal)} more for free delivery`}
              </div>
              <div className="progress"><i style={{ width: Math.min(100, (cartTotal / FREE_DELIVERY) * 100) + '%' }} /></div>
            </div>
            <div className="lines">
              {cartItems.map(({ product, qty }) => (
                <div className="line" key={product.id}>
                  <Tile name={product.name} size="sm" />
                  <div className="line-info">
                    <div className="line-name">{product.name}</div>
                    <div className="muted">{money(product.price)} each</div>
                  </div>
                  <Qty value={qty} onInc={() => add(product.id)} onDec={() => dec(product.id)} />
                  <div className="line-total">{money(qty * product.price)}</div>
                  <button className="x" onClick={() => removeItem(product.id)} aria-label="Remove">✕</button>
                </div>
              ))}
            </div>
            <div className="sum">
              <span>Total</span><b>{money(cartTotal)}</b>
            </div>
            <button className="primary wide big" disabled={busy} onClick={checkout}>
              {busy ? 'Placing order...' : 'Place order'}
            </button>
          </>
        )}
      </aside>

      {/* ---------- receipt ---------- */}
      {receipt && (
        <div className="modal-wrap" onClick={() => setReceipt(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="check">
              <svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24" /><path d="M14 27l8 8 16-17" /></svg>
            </div>
            <h2>Order confirmed</h2>
            <p className="muted">Saved by the Order Service through the API Gateway.</p>
            <ul className="receipt">
              {receipt.items.map((o) => (
                <li key={o.id}>
                  <span>{infoFor(o.name).emoji} {o.name} × {o.quantity}</span>
                  <b>{money(o.amount)}</b>
                </li>
              ))}
            </ul>
            <div className="sum"><span>Total</span><b>{money(receipt.total)}</b></div>
            <div className="modal-actions">
              <button className="ghost" onClick={() => setReceipt(null)}>Keep shopping</button>
              <button className="primary" onClick={() => { setReceipt(null); setTab('orders') }}>View orders</button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- api log ---------- */}
     <div className={'log' + (logOpen ? '' : ' closed')}>
        <div className="log-head" onClick={() => setLogOpen(!logOpen)}>
          <span>● Live API log · via Gateway :8080</span><span>{logOpen ? '▾' : '▴'}</span>
        </div>
        {logOpen && (
          <div className="log-body">
            {logs.length === 0 && <div className="log-empty">No calls yet.</div>}
            {logs.map((l) => (
              <div key={l.id} className="log-row">
                <span className={l.status >= 200 && l.status < 300 ? 'ok' : 'bad'}>{l.status || 'ERR'}</span>
                <b>{l.method}</b> {l.url}
                <span className="svc">→ {serviceOf(l.url)} · {l.ms}ms</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---------- toasts ---------- */}
      <div className="toasts">
        {toasts.map((t) => <div key={t.id} className={'toast ' + t.type}>{t.msg}</div>)}
      </div>
    </div>
  )
}