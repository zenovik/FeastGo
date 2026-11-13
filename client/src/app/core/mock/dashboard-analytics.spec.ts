import { describe, expect, it } from 'vitest';
import { Order } from '../models/order.model';
import { adminDashboardStats, sellerDashboardStats } from './dashboard-analytics';

function order(overrides: Partial<Order> = {}): Order {
  const completedAt = new Date(2026, 10, 14, 9).toISOString();
  return {
    _id: 'order-1',
    user: 'user-1',
    restaurant: 'restaurant-1',
    restaurantName: 'Casa Marino',
    deliveryPartner: 'delivery-1',
    items: [{ menuItem: 'menu-1', name: 'Pasta', price: 150, qty: 2, isVeg: true }],
    subtotal: 300,
    deliveryFee: 39,
    taxes: 15,
    discount: 0,
    total: 354,
    status: 'delivered',
    statusHistory: [{ status: 'delivered', at: completedAt }],
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

describe('mock dashboard analytics', () => {
  it('derives seller status totals and revenue from that restaurant’s orders', () => {
    const now = new Date(2026, 10, 14, 12);
    const active = order({
      _id: 'order-2',
      user: 'user-2',
      status: 'placed',
      deliveryStatus: 'pending',
      deliveredAt: null,
      statusHistory: [{ status: 'placed', at: new Date(2026, 10, 14, 10).toISOString() }],
      deliveryStatusHistory: [{ status: 'pending', at: new Date(2026, 10, 14, 10).toISOString() }],
      createdAt: new Date(2026, 10, 14, 10).toISOString(),
    });
    const anotherRestaurant = order({ _id: 'order-3', restaurant: 'restaurant-2', user: 'user-3' });

    expect(sellerDashboardStats([order(), active, anotherRestaurant], 'restaurant-1', now)).toMatchObject({
      todayOrders: 2,
      pendingOrders: 1,
      confirmedOrders: 0,
      preparingOrders: 0,
      readyForPickup: 0,
      outForDelivery: 0,
      deliveredOrders: 1,
      cancelledOrders: 0,
      todayRevenue: 354,
      weeklyRevenue: 354,
      monthlyRevenue: 354,
      totalRevenue: 354,
      totalCustomers: 2,
      bestSellingItems: [{ name: 'Pasta', qty: 2, revenue: 300 }],
    });
  });

  it('derives admin totals and top restaurants from completed orders', () => {
    const now = new Date(2026, 10, 14, 12);
    const secondRestaurant = order({
      _id: 'order-2',
      restaurant: 'restaurant-2',
      restaurantName: 'Sakura Bowl',
      total: 200,
      subtotal: 170,
      taxes: 8,
      deliveryFee: 22,
      items: [{ menuItem: 'menu-2', name: 'Ramen', price: 170, qty: 1, isVeg: false }],
      deliveredAt: new Date(2026, 10, 6, 9).toISOString(),
      statusHistory: [{ status: 'delivered', at: new Date(2026, 10, 6, 9).toISOString() }],
      deliveryStatusHistory: [{ status: 'delivered', at: new Date(2026, 10, 6, 9).toISOString() }],
      createdAt: new Date(2026, 10, 6, 8).toISOString(),
    });
    const active = order({
      _id: 'order-3',
      status: 'preparing',
      deliveryStatus: 'assigned',
      deliveredAt: null,
      statusHistory: [{ status: 'preparing', at: new Date(2026, 10, 14, 10).toISOString() }],
      deliveryStatusHistory: [{ status: 'assigned', at: new Date(2026, 10, 14, 10).toISOString() }],
      createdAt: new Date(2026, 10, 14, 10).toISOString(),
    });
    const stats = adminDashboardStats(
      [order(), secondRestaurant, active],
      2,
      [{ _id: 'restaurant-1', name: 'Casa Marino' }, { _id: 'restaurant-2', name: 'Sakura Bowl' }],
      1,
      1,
      now
    );

    expect(stats).toMatchObject({
      totalUsers: 2,
      totalRestaurants: 2,
      totalOrders: 3,
      activeOrders: 1,
      completedOrders: 2,
      cancelledOrders: 0,
      totalRevenue: 554,
      todayRevenue: 354,
      weeklyRevenue: 354,
      monthlyRevenue: 554,
      topRestaurants: [
        { id: 'restaurant-1', name: 'Casa Marino', revenue: 354, orders: 1 },
        { id: 'restaurant-2', name: 'Sakura Bowl', revenue: 200, orders: 1 },
      ],
    });
    expect(stats.growthPercent).toBeNull();
  });
});
