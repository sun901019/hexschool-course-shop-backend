const { httpError } = require('../http/error');
const check = require('../http/validate');
const repo = require('../repositories/cart-repository');

function assertAvailable(variant, quantity) {
  if (!variant) throw httpError(404, 'VARIANT_NOT_FOUND', '這個款式找不到。');
  if (quantity > 99 || quantity > variant.stock) {
    throw httpError(409, 'QUANTITY_UNAVAILABLE', '可購買數量不足，請減少數量。');
  }
}

function parseIdempotencyKey(value) {
  const key = check.string(value, '操作識別碼', 80, 8);
  if (!/^[A-Za-z0-9_.-]+$/.test(key)) check.invalid('操作識別碼格式不正確。');
  return key;
}

function createCartService(source) {
  async function readCart(manager, cartId) {
    const rows = cartId ? await repo.listItems(manager, cartId) : [];
    const items = rows.map(row => ({ ...row, subtotal: row.quantity * row.unitPrice }));
    const totals = items.reduce((sum, item) => ({
      quantity: sum.quantity + item.quantity,
      amount: sum.amount + item.subtotal,
    }), { quantity: 0, amount: 0 });
    return { items, totals };
  }

  async function getCart(userId) {
    const cart = await repo.carts(source.manager).findOneBy({ userId });
    return readCart(source.manager, cart?.id);
  }

  async function changeCart(userId, change) {
    return source.transaction(async manager => {
      const cart = await repo.carts(manager).findOne({ where: { userId }, lock: { mode: 'pessimistic_write' } });
      if (!cart) throw httpError(409, 'CART_UNAVAILABLE', '這個會員的購物車尚未建立。');
      await change(manager, cart.id);
      return readCart(manager, cart.id);
    });
  }

  async function addItem(userId, body, keyHeader) {
    check.bodyWithKeys(body, ['variantId', 'quantity']);
    const variantId = check.uuid(body.variantId, '款式');
    const quantity = check.integer(body.quantity, 1, 99, '數量');
    const key = parseIdempotencyKey(keyHeader);
    return changeCart(userId, async (manager, cartId) => {
      const ledger = repo.additions(manager);
      const previous = await ledger.findOneBy({ cartId, key });
      if (previous) {
        if (previous.variantId !== variantId || previous.quantity !== quantity) {
          throw httpError(409, 'REQUEST_KEY_REUSED', '這筆操作識別碼已用於不同內容。');
        }
        return;
      }
      const items = repo.cartItems(manager);
      const current = await items.findOneBy({ cartId, variantId });
      const totalQuantity = (current?.quantity || 0) + quantity;
      const variant = await repo.lockVariant(manager, variantId);
      assertAvailable(variant, totalQuantity);
      await items.save({ ...current, cartId, variantId, quantity: totalQuantity });
      await ledger.insert({ cartId, variantId, quantity, key });
    });
  }

  async function updateItemQuantity(userId, id, body) {
    const itemId = check.uuid(id, '品項');
    check.bodyWithKeys(body, ['quantity']);
    const quantity = check.integer(body.quantity, 1, 99, '數量');
    return changeCart(userId, async (manager, cartId) => {
      const items = repo.cartItems(manager);
      const item = await items.findOneBy({ id: itemId, cartId });
      if (!item) throw httpError(404, 'ITEM_NOT_FOUND', '找不到這筆購物車品項。');
      const variant = await repo.lockVariant(manager, item.variantId);
      assertAvailable(variant, quantity);
      await items.update({ id: item.id, cartId }, { quantity });
    });
  }

  async function removeItem(userId, id) {
    const itemId = check.uuid(id, '品項');
    return changeCart(userId, async (manager, cartId) => {
      const result = await repo.cartItems(manager).delete({ id: itemId, cartId });
      if (!result.affected) throw httpError(404, 'ITEM_NOT_FOUND', '找不到這筆購物車品項。');
    });
  }

  return { getCart, addItem, updateItemQuantity, removeItem };
}

module.exports = { createCartService };
