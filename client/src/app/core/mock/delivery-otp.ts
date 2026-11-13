import { Order } from '../models/order.model';

export function generateDeliveryOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function isDeliveryOtpValid(order: Pick<Order, 'deliveryOtp'>, value: unknown): boolean {
  return typeof value === 'string' && value === order.deliveryOtp;
}

export function withoutDeliveryOtp<T extends Pick<Order, 'deliveryOtp'>>(order: T): Omit<T, 'deliveryOtp'> {
  const safeOrder = { ...order };
  delete safeOrder.deliveryOtp;
  return safeOrder;
}
