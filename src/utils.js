export const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN')

export const FREE_DELIVERY = 499

// [keyword, emoji, category] - the backend only stores name and price,
// so the category and emoji are derived from the product name.
const ITEMS = [
  ['eggplant', '🍆', 'Vegetables'],
  ['apple', '🍎', 'Fruits'], ['banana', '🍌', 'Fruits'], ['mango', '🥭', 'Fruits'],
  ['orange', '🍊', 'Fruits'], ['grape', '🍇', 'Fruits'], ['lemon', '🍋', 'Fruits'],
  ['watermelon', '🍉', 'Fruits'], ['strawberr', '🍓', 'Fruits'],
  ['tomato', '🍅', 'Vegetables'], ['potato', '🥔', 'Vegetables'], ['carrot', '🥕', 'Vegetables'],
  ['onion', '🧅', 'Vegetables'], ['spinach', '🥬', 'Vegetables'], ['broccoli', '🥦', 'Vegetables'],
  ['corn', '🌽', 'Vegetables'],
  ['milk', '🥛', 'Dairy & Eggs'], ['cheese', '🧀', 'Dairy & Eggs'], ['butter', '🧈', 'Dairy & Eggs'],
  ['egg', '🥚', 'Dairy & Eggs'], ['yogurt', '🥣', 'Dairy & Eggs'], ['curd', '🥣', 'Dairy & Eggs'],
  ['bread', '🍞', 'Bakery'], ['croissant', '🥐', 'Bakery'], ['cake', '🍰', 'Bakery'],
  ['cookie', '🍪', 'Bakery'],
  ['rice', '🍚', 'Staples'], ['flour', '🌾', 'Staples'], ['wheat', '🌾', 'Staples'],
  ['olive', '🫒', 'Staples'], ['salt', '🧂', 'Staples'], ['sugar', '🍬', 'Staples'],
  ['dal', '🫘', 'Staples'], ['lentil', '🫘', 'Staples'],
  ['laptop', '💻', 'Other'],
]

export const infoFor = (name = '') => {
  const n = name.toLowerCase()
  const hit = ITEMS.find(([k]) => n.includes(k))
  return hit ? { emoji: hit[1], cat: hit[2] } : { emoji: '🛍️', cat: 'Other' }
}

export const CATEGORIES = ['All', 'Fruits', 'Vegetables', 'Dairy & Eggs', 'Bakery', 'Staples', 'Other']

export const CAT_STYLE = {
  Fruits: ['#ffedd5', '#fdba74'],
  Vegetables: ['#dcfce7', '#86efac'],
  'Dairy & Eggs': ['#e0f2fe', '#7dd3fc'],
  Bakery: ['#fef3c7', '#fcd34d'],
  Staples: ['#ede9fe', '#c4b5fd'],
  Other: ['#e2e8f0', '#cbd5e1'],
}

export const SAMPLE = [
  { name: 'Fresh Apples 1kg', price: 180 },
  { name: 'Bananas 1 dozen', price: 60 },
  { name: 'Alphonso Mango 1kg', price: 250 },
  { name: 'Oranges 1kg', price: 90 },
  { name: 'Tomatoes 1kg', price: 40 },
  { name: 'Carrots 500g', price: 35 },
  { name: 'Potatoes 1kg', price: 38 },
  { name: 'Broccoli 250g', price: 70 },
  { name: 'Farm Milk 1L', price: 56 },
  { name: 'Free-range Eggs (12)', price: 96 },
  { name: 'Cheddar Cheese 200g', price: 130 },
  { name: 'Greek Yogurt 400g', price: 85 },
  { name: 'Whole Wheat Bread', price: 45 },
  { name: 'Butter Croissants (2)', price: 90 },
  { name: 'Basmati Rice 1kg', price: 120 },
  { name: 'Olive Oil 500ml', price: 480 },
]