export function buildSpendSeries(
  paymentRows: Array<{ paidAt: Date; amount: number }>,
) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);

    return {
      label: date.toLocaleString("en-US", { month: "short" }),
      year: date.getFullYear(),
      month: date.getMonth(),
      value: 0,
    };
  });

  for (const payment of paymentRows) {
    const entry = months.find(
      (month) =>
        month.year === payment.paidAt.getFullYear() &&
        month.month === payment.paidAt.getMonth(),
    );

    if (entry) {
      entry.value += payment.amount;
    }
  }

  return months.map(({ label, value }) => ({ label, value }));
}
