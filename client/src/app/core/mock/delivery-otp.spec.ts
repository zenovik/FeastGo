import { describe, expect, it } from 'vitest';
import { isDeliveryOtpValid, withoutDeliveryOtp } from './delivery-otp';

describe('delivery OTP', () => {
  it('accepts only the exact code assigned to an order', () => {
    const order = { deliveryOtp: '4831' };

    expect(isDeliveryOtpValid(order, '4831')).toBe(true);
    expect(isDeliveryOtpValid(order, '4832')).toBe(false);
    expect(isDeliveryOtpValid(order, 4831)).toBe(false);
    expect(isDeliveryOtpValid({}, '4831')).toBe(false);
  });

  it('does not disclose the code in delivery-facing order data', () => {
    const order = { _id: 'order-1', deliveryOtp: '4831' };

    expect(withoutDeliveryOtp(order)).not.toHaveProperty('deliveryOtp');
    expect(order.deliveryOtp).toBe('4831');
  });
});
