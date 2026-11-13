import { describe, expect, it } from 'vitest';
import { Order } from '../models/order.model';
import { calculateDeliveryEarnings, deliveryEarningsHistory, deliveryWeeklyPerformance } from './delivery-earnings';

function order(overrides: Partial<Order> = {}): Order {
  const completedAt = new Date(2026, 10, 14, 9).toISOString();
  return {
    _id: 'order-1',
    user: 'user-1',
    restaurant: 'restaurant-1',
    restaurantName: 'Casa Marino',
    deliveryPartner: 'delivery-1',
    items: [],
    subtotal: 300,
    deliveryFee: 39,
    taxes: 15,
    discount: 0,
    total: 354,
    status: 'delivered',
    statusHistory: [],
    address: {
      _id: 'address-1',
      label: 'Home',
      line1: '1 Main Street',
      area: 'Downtown',
      city: 'Metro City',
      state: 'CA',
      zip: '90210',
      phone: '5550100',
      isDefault: true,
      instructions: '',
    },
    paymentMethod: 'upi',
    etaMinutes: 30,
    deliveryStatus: 'delivered',
    deliveryStatusHistory: [{ status: 'delivered', at: completedAt }],
    deliveredAt: completedAt,
    createdAt: completedAt,
    ...overrides,
  };
}

describe('delivery earnings', () => {
  it('derives totals and date ranges from completed deliveries only', () => {
    const now = new Date(2026, 10, 14, 12);
    const today = order({ deliveryFee: 0, tip: 10 });
    const lastWeek = order({
      _id: 'order-2',
      deliveryFee: 30,
      tip: 0,
      deliveredAt: new Date(2026, 10, 6, 9).toISOString(),
      createdAt: new Date(2026, 10, 6, 8).toISOString(),
      deliveryStatusHistory: [{ status: 'delivered', at: new Date(2026, 10, 6, 9).toISOString() }],
    });
    const active = order({ _id: 'order-3', deliveryStatus: 'out_for_delivery' });

    expect(calculateDeliveryEarnings([today, lastWeek, active], 1000, now)).toEqual({
      orderCount: 2,
      totalEarnings: 70,
      todayEarnings: 40,
      weeklyEarnings: 40,
      monthlyEarnings: 70,
      tipsReceived: 10,
      incentives: 0,
      pendingPayments: 0,
      dailyTarget: 1000,
    });
  });

  it('keeps weekly chart totals aligned with the weekly earnings summary', () => {
    const now = new Date(2026, 10, 14, 12);
    const orders = [
      order({ deliveryFee: 0, tip: 10 }),
      order({
        _id: 'order-2',
        deliveryFee: 30,
        tip: 0,
        deliveredAt: new Date(2026, 10, 12, 9).toISOString(),
        createdAt: new Date(2026, 10, 12, 8).toISOString(),
        deliveryStatusHistory: [{ status: 'delivered', at: new Date(2026, 10, 12, 9).toISOString() }],
      }),
    ];
    const weekly = deliveryWeeklyPerformance(orders, now);

    expect(weekly).toHaveLength(7);
    expect(weekly.reduce((total, day) => total + day.total, 0)).toBe(
      calculateDeliveryEarnings(orders, 1000, now).weeklyEarnings
    );
    expect(weekly.find((day) => day.day === 'Sat')?.total).toBe(40);
    expect(weekly.find((day) => day.day === 'Thu')?.total).toBe(30);
  });

  it('paginates completed earnings newest first and excludes active orders', () => {
    const recent = order({ _id: 'recent' });
    const older = order({
      _id: 'older',
      deliveredAt: new Date(2026, 10, 12, 9).toISOString(),
      createdAt: new Date(2026, 10, 12, 8).toISOString(),
      deliveryStatusHistory: [{ status: 'delivered', at: new Date(2026, 10, 12, 9).toISOString() }],
    });

    expect(deliveryEarningsHistory([older, recent, order({ deliveryStatus: 'accepted' })], 2, 1)).toEqual({
      earnings: [
        {
          _id: 'older',
          order: { _id: 'older', restaurantName: 'Casa Marino', total: 354 },
          baseFee: 39,
          tip: 0,
          bonus: 0,
          total: 39,
          paid: true,
          createdAt: new Date(2026, 10, 12, 9).toISOString(),
        },
      ],
      total: 2,
      page: 2,
      limit: 1,
    });
  });
});
