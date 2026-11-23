const { EntitySchema } = require('typeorm');

const id = () => ({ type: 'uuid', primary: true, generated: 'uuid' });
const uuid = () => ({ type: 'uuid' });
const text = () => ({ type: 'text' });
const whole = () => ({ type: 'integer' });
const datetime = () => ({ type: 'timestamptz' });
const entity = (name, tableName, columns) => new EntitySchema({ name, tableName, columns });

const User = entity('User', 'users', {
  id: id(), name: text(), email: text(), passwordHash: { ...text(), name: 'password_hash' }, role: text(),
});
const Session = entity('Session', 'sessions', {
  id: id(), userId: { ...uuid(), name: 'user_id' }, expiresAt: { ...datetime(), name: 'expires_at' },
});
const Category = entity('Category', 'categories', { id: id(), slug: text(), name: text() });
const Product = entity('Product', 'products', {
  id: id(), categoryId: { ...uuid(), name: 'category_id' }, slug: text(), name: text(), description: text(),
});
const Variant = entity('Variant', 'variants', {
  id: id(), productId: { ...uuid(), name: 'product_id' }, label: text(), price: whole(), stock: whole(), position: whole(),
});
const Cart = entity('Cart', 'carts', { id: id(), userId: { ...uuid(), name: 'user_id' } });
const CartItem = entity('CartItem', 'cart_items', {
  id: id(), cartId: { ...uuid(), name: 'cart_id' }, variantId: { ...uuid(), name: 'variant_id' }, quantity: whole(),
});
const CartAddition = entity('CartAddition', 'cart_additions', {
  cartId: { ...uuid(), name: 'cart_id', primary: true },
  key: { ...text(), name: 'request_key', primary: true },
  variantId: { ...uuid(), name: 'variant_id' },
  quantity: whole(),
});

module.exports = { User, Session, Category, Product, Variant, Cart, CartItem, CartAddition };
