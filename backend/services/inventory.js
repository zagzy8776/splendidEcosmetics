export class InsufficientStockError extends Error {
  constructor(message) {
    super(message || "Not enough stock to confirm this order.");
    this.name = "InsufficientStockError";
  }
}

export function parseStockQuantity(value) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000) {
    throw new Error("Stock quantity must be between 0 and 1,000,000.");
  }
  return Math.trunc(n);
}

export function parseLowStockThreshold(value) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return 3;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000) {
    throw new Error("Low-stock alert must be between 0 and 1,000,000.");
  }
  return Math.trunc(n);
}

export function syncInStockFromQuantity(stockQuantity, fallbackInStock) {
  if (stockQuantity === null || stockQuantity === undefined) {
    return fallbackInStock;
  }
  return stockQuantity > 0;
}

export function productIsAvailable(product) {
  if (!product) return false;
  if (product.stockQuantity === null || product.stockQuantity === undefined) {
    return product.inStock !== false;
  }
  return product.stockQuantity > 0;
}

export function canFulfill(product, requestedQty) {
  const qty = Number(requestedQty);
  if (!product || !Number.isFinite(qty) || qty <= 0) return false;
  if (product.stockQuantity === null || product.stockQuantity === undefined) {
    return product.inStock !== false;
  }
  return product.stockQuantity >= qty;
}

export function shouldConsumeStock(previousStatus, nextStatus) {
  return nextStatus === "confirmed" && previousStatus !== "confirmed";
}

export async function applyOrderStatusWithStock(prisma, orderId, nextStatus) {
  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!existing) return { kind: "missing" };

  if (!shouldConsumeStock(existing.status, nextStatus)) {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status: nextStatus },
      include: { items: true },
    });
    return { kind: "updated", order, statusChanged: existing.status !== nextStatus };
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      const locked = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (!locked) throw new Error("NOT_FOUND");
      if (locked.status === "confirmed") {
        return tx.order.update({
          where: { id: orderId },
          data: { status: nextStatus },
          include: { items: true },
        });
      }

      for (const item of locked.items) {
        const qty = Number(item.quantity);
        if (!Number.isFinite(qty) || qty <= 0) {
          throw new InsufficientStockError("This order has an invalid item quantity.");
        }

        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { id: true, name: true, stockQuantity: true, inStock: true },
        });
        if (!product) {
          throw new InsufficientStockError(`A product on this order is no longer available.`);
        }

        if (product.stockQuantity === null || product.stockQuantity === undefined) {
          if (product.inStock === false) {
            throw new InsufficientStockError(`${product.name} is out of stock.`);
          }
          continue;
        }

        const changed = await tx.$executeRaw`
          UPDATE products
          SET
            stock_quantity = stock_quantity - ${qty},
            "inStock" = (stock_quantity - ${qty}) > 0
          WHERE id = ${product.id}
            AND stock_quantity IS NOT NULL
            AND stock_quantity >= ${qty}
        `;
        if (Number(changed) !== 1) {
          throw new InsufficientStockError(
            `Not enough stock for ${product.name}. Confirmation was not applied.`
          );
        }
      }

      return tx.order.update({
        where: { id: orderId },
        data: { status: nextStatus },
        include: { items: true },
      });
    });

    return { kind: "updated", order, statusChanged: existing.status !== nextStatus };
  } catch (err) {
    if (err instanceof InsufficientStockError || err?.name === "InsufficientStockError") {
      return { kind: "stock", error: err.message };
    }
    throw err;
  }
}
