import type {
  DailyCollectionSummary,
  Payment,
  PaymentMode,
  PaymentReversal,
} from '../models/collection';

const MODES: PaymentMode[] = ['CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'CHEQUE'];
export function aggregateDailyCollection(input: {
  schoolId: string;
  branchId: string;
  date: string;
  payments: readonly Payment[];
  reversals: readonly PaymentReversal[];
}): DailyCollectionSummary {
  const branchPayments = input.payments.filter(
    item =>
      item.schoolId === input.schoolId && item.branchId === input.branchId,
  );
  const payments = branchPayments.filter(
    item => item.paymentDate === input.date,
  );
  const reversals = input.reversals.filter(
    item =>
      item.schoolId === input.schoolId &&
      item.reversedAt.slice(0, 10) === input.date &&
      branchPayments.some(payment => payment.id === item.paymentId),
  );
  const totalPostedPaymentsPaise = payments.reduce(
    (sum, item) => sum + item.amountPaise,
    0,
  );
  const reversedAmountPaise = reversals.reduce(
    (sum, item) => sum + item.amountPaise,
    0,
  );
  const collectorIds = new Set(payments.map(item => item.collectedByUserId));
  reversals.forEach(reversal => {
    const source = branchPayments.find(item => item.id === reversal.paymentId);
    if (source) collectorIds.add(source.collectedByUserId);
  });
  const collectors = [...collectorIds].map(userId => {
    const values = payments.filter(item => item.collectedByUserId === userId);
    const paymentIds = new Set(
      branchPayments
        .filter(item => item.collectedByUserId === userId)
        .map(item => item.id),
    );
    const reversed = reversals
      .filter(item => paymentIds.has(item.paymentId))
      .reduce((sum, item) => sum + item.amountPaise, 0);
    const gross = values.reduce((sum, item) => sum + item.amountPaise, 0);
    return {
      grossCollectionPaise: gross,
      name:
        values[0]?.collectedByName ??
        branchPayments.find(item => item.collectedByUserId === userId)!
          .collectedByName,
      netCollectionPaise: gross - reversed,
      paymentCount: values.length,
      reversedAmountPaise: reversed,
      userId,
    };
  });
  return {
    advanceCollectedPaise: payments.reduce(
      (sum, item) => sum + item.advanceAmountPaise,
      0,
    ),
    branchId: input.branchId,
    collectorCount: collectors.length,
    collectors,
    date: input.date,
    modes: MODES.map(mode => ({
      amountPaise: payments
        .filter(item => item.paymentMode === mode)
        .reduce((sum, item) => sum + item.amountPaise, 0),
      count: payments.filter(item => item.paymentMode === mode).length,
      mode,
    })),
    netCollectionPaise: totalPostedPaymentsPaise - reversedAmountPaise,
    paymentCount: payments.length,
    receiptCount: payments.filter(item => item.receiptId).length,
    reversedAmountPaise,
    schoolId: input.schoolId,
    totalPostedPaymentsPaise,
  };
}
