// Shared status/refund badge styling + cancellation labels, used across the
// customer, seller, delivery and admin order pages so a status reads the
// same everywhere instead of each page inlining its own color logic.

const BADGE_CLASSES: Record<string, string> = {
  placed: 'bg-gold-400/15 text-gold-600',
  confirmed: 'bg-gold-400/15 text-gold-600',
  preparing: 'bg-gold-400/15 text-gold-600',
  ready_for_pickup: 'bg-gold-400/15 text-gold-600',
  out_for_delivery: 'bg-gold-400/15 text-gold-600',
  delivered: 'bg-basil-100 text-basil-600',
  cancelled: 'bg-ember-100 text-ember-700',
  rejected: 'bg-ember-100 text-ember-700',
  failed: 'bg-ember-100 text-ember-700',
  returned: 'bg-ember-100 text-ember-700',
};

export function orderStatusBadgeClass(status: string): string {
  return BADGE_CLASSES[status] ?? 'bg-ink-50 text-ink-600';
}

const CANCELLED_BY_LABEL: Record<string, string> = {
  customer: 'You',
  seller: 'The restaurant',
  delivery: 'The delivery partner',
  admin: 'FeastGo support',
  system: 'The system',
};

export function cancelledByLabel(role: string | null | undefined): string {
  if (!role) return 'Unknown';
  return CANCELLED_BY_LABEL[role] ?? role;
}

const REFUND_LABEL: Record<string, string> = {
  requested: 'Refund Initiated',
  approved: 'Refund Processing',
  refunded: 'Refund Successful',
  rejected: 'Refund Failed',
};

export function refundStatusLabel(status: string | null | undefined): string {
  if (!status || status === 'none') return '';
  return REFUND_LABEL[status] ?? '';
}

export function refundStatusClass(status: string | null | undefined): string {
  switch (status) {
    case 'refunded':
      return 'bg-basil-100 text-basil-700';
    case 'requested':
    case 'approved':
      return 'bg-gold-400/15 text-gold-600';
    case 'rejected':
      return 'bg-ember-100 text-ember-700';
    default:
      return 'bg-ink-50 text-ink-500';
  }
}
