import { HttpRequest } from '@angular/common/http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockResponse } from './mock-api';

beforeEach(() => {
  const storage = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
});

function responseRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Expected an object response from the mock API.');
  }
  return value as Record<string, unknown>;
}

function call(method: string, url: string, body?: unknown): unknown {
  return mockResponse(new HttpRequest(method, `/mock-api/${url}`, body));
}

describe('mock order lifecycle', () => {
  it('scopes seller orders and verifies customer delivery OTPs end to end', () => {
    const createdResponse = responseRecord(
      call('POST', 'orders', {
        restaurantSlug: 'restaurant-1',
        items: [{ menuItemId: 'menu-1-1', qty: 1 }],
        paymentMethod: 'cod',
      })
    );
    const createdOrder = responseRecord(createdResponse['order']);
    const orderId = createdOrder['_id'];
    const otp = createdOrder['deliveryOtp'];
    if (typeof orderId !== 'string' || typeof otp !== 'string') {
      throw new Error('Order creation must return an id and customer delivery code.');
    }

    const customerResponse = responseRecord(call('GET', `orders/${orderId}`));
    expect(responseRecord(customerResponse['order'])['deliveryOtp']).toBe(otp);

    const sellerResponse = responseRecord(call('GET', 'seller/orders'));
    const sellerOrders = sellerResponse['orders'];
    if (!Array.isArray(sellerOrders)) throw new Error('Seller order list must be an array.');
    expect(sellerOrders.every((value) => responseRecord(value)['restaurant'] === 'restaurant-1')).toBe(true);
    expect(responseRecord(sellerOrders.find((value) => responseRecord(value)['_id'] === orderId))['deliveryOtp']).toBeUndefined();
    expect(() => call('PATCH', 'seller/orders/order-demo-2/status', { status: 'confirmed' })).toThrowError();

    call('PATCH', `seller/orders/${orderId}/status`, { status: 'confirmed' });
    call('PATCH', `seller/orders/${orderId}/status`, { status: 'preparing' });
    call('PATCH', `seller/orders/${orderId}/status`, { status: 'ready_for_pickup' });
    call('POST', `delivery/orders/${orderId}/accept`);
    call('PATCH', `delivery/orders/${orderId}/status`, { status: 'reached_restaurant' });
    call('PATCH', `delivery/orders/${orderId}/status`, { status: 'picked_up' });
    call('PATCH', `delivery/orders/${orderId}/status`, { status: 'out_for_delivery' });
    call('PATCH', `delivery/orders/${orderId}/status`, { status: 'reached_customer' });

    expect(() =>
      call('PATCH', `delivery/orders/${orderId}/status`, { status: 'delivered', otp: '0000' })
    ).toThrowError();
    const deliveredResponse = responseRecord(
      call('PATCH', `delivery/orders/${orderId}/status`, { status: 'delivered', otp })
    );
    expect(responseRecord(deliveredResponse['order'])['deliveryOtp']).toBeUndefined();

    const completedCustomerResponse = responseRecord(call('GET', `orders/${orderId}`));
    const completedOrder = responseRecord(completedCustomerResponse['order']);
    expect(completedOrder['status']).toBe('delivered');
    expect(completedOrder['deliveryOtpVerified']).toBe(true);
  });
});
