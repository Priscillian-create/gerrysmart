import { z } from "zod";

const paymentMethodSchema = z.enum(["cash", "pos", "transfer"]);

const optionalDateSchema = z.string().trim().min(1).optional();

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const productCreateSchema = z.object({
  name: z.string().trim().min(1).max(191),
  category: z.string().trim().min(1).max(100),
  price: z.coerce.number().positive(),
  stock: z.coerce.number().int().min(0).default(0),
  barcode: z.string().trim().min(3).max(191).optional().nullable(),
  expiryDate: optionalDateSchema.nullable().optional()
});

export const productUpdateSchema = productCreateSchema.partial();

export const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.coerce.number().int().positive()
      })
    )
    .min(1),
  paymentMethod: paymentMethodSchema,
  idempotencyKey: z.string().trim().min(8).max(191)
});

export const expenseCreateSchema = z.object({
  description: z.string().trim().min(1).max(191),
  category: z.string().trim().min(1).max(100),
  amount: z.coerce.number().positive(),
  date: optionalDateSchema
});

export const expenseFilterSchema = z.object({
  category: z.string().trim().min(1).optional(),
  from: z.string().optional(),
  to: z.string().optional()
});

export const purchaseCreateSchema = z.object({
  supplier: z.string().trim().min(1).max(191),
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
  unitCost: z.coerce.number().positive(),
  unitSell: z.coerce.number().positive()
});

export const purchaseFilterSchema = z.object({
  productId: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional()
});

export const productFilterSchema = z.object({
  category: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional()
});
