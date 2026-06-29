export type PosUserRole = "admin" | "cashier" | "user";

export type PosProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  barcode: string | null;
  expiryDate: string | null;
  status: string;
  updatedAt: Date | null;
};

export type PosUser = {
  id: number;
  name: string | null;
  email: string | null;
  password: string | null;
  role: PosUserRole;
};

export type PosSaleItem = {
  productId: string | null;
  productName: string | null;
  quantity: number;
  price: number;
  lineTotal: number;
};

export type PosSale = {
  id: string;
  receiptNumber: string;
  total: number;
  paymentMethod: "cash" | "pos" | "transfer" | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
  idempotencyKey: string | null;
  items: PosSaleItem[];
};

export type ListProductsFilters = {
  category?: string;
  search?: string;
};

export type CreateProductInput = {
  name: string;
  category: string;
  price: number;
  stock: number;
  barcode?: string | null;
  expiryDate?: string | Date | null;
};

export type UpdateProductInput = Partial<CreateProductInput>;

export type ListSalesFilters = {
  from?: Date;
  to?: Date;
};

export type CreateUserInput = {
  name?: string | null;
  email: string;
  password: string;
  role: PosUserRole;
};

export type CheckoutItemInput = {
  productId: string;
  quantity: number;
};

export type CreateCheckoutSaleInput = {
  items: CheckoutItemInput[];
  paymentMethod: "cash" | "pos" | "transfer";
  idempotencyKey: string;
};

export type CreateCheckoutSaleResult = {
  sale: PosSale;
  idempotentReplay: boolean;
};

export class PosDataError extends Error {
  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: unknown
  );
  statusCode: number;
  code: string;
  details: unknown;
}

export function listProducts(filters?: ListProductsFilters): Promise<PosProduct[]>;
export function createProduct(input: CreateProductInput): Promise<PosProduct>;
export function findUserByEmail(email: string): Promise<PosUser | null>;
export function createUser(input: CreateUserInput): Promise<PosUser | null>;
export function updateProduct(id: string, input: UpdateProductInput): Promise<PosProduct>;
export function listSales(filters?: ListSalesFilters): Promise<PosSale[]>;
export function softDeleteSale(id: string): Promise<void>;
export function createCheckoutSale(
  input: CreateCheckoutSaleInput
): Promise<CreateCheckoutSaleResult>;
