function carts(manager) {
  return manager.getRepository('Cart');
}

function cartItems(manager) {
  return manager.getRepository('CartItem');
}

function additions(manager) {
  return manager.getRepository('CartAddition');
}

function listItems(manager, cartId) {
  return cartItems(manager)
    .createQueryBuilder('item')
    .innerJoin('Variant', 'choice', 'choice.id = item.variantId')
    .innerJoin('Product', 'product', 'product.id = choice.productId')
    .innerJoin('Category', 'category', 'category.id = product.categoryId')
    .select('item.id', 'id')
    .addSelect('item.quantity', 'quantity')
    .addSelect('choice.id', 'variantId')
    .addSelect('choice.label', 'variantLabel')
    .addSelect('choice.price', 'unitPrice')
    .addSelect('choice.stock', 'stock')
    .addSelect('product.id', 'productId')
    .addSelect('product.name', 'productName')
    .addSelect('category.slug', 'categorySlug')
    .where('item.cartId = :cartId', { cartId })
    .orderBy('product.name', 'ASC')
    .addOrderBy('item.id', 'ASC')
    .getRawMany();
}

function lockVariant(manager, id) {
  return manager.getRepository('Variant').findOne({
    where: { id }, lock: { mode: 'pessimistic_read' },
  });
}

module.exports = { carts, cartItems, additions, listItems, lockVariant };
