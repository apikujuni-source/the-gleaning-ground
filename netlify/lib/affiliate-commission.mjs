export function commissionableAmountForSession(session) {
  const gross = Math.max(0, Number(session?.amount_total || 0));
  const currency = String(session?.currency || '').toLowerCase();
  const metadata = session?.metadata || {};

  if (currency === 'ngn') {
    const bookPriceNaira = Number(metadata.book_price_ngn || 0);
    if (Number.isFinite(bookPriceNaira) && bookPriceNaira > 0) {
      const bookPriceMinor = Math.round(bookPriceNaira * 100);
      return gross > 0 ? Math.min(bookPriceMinor, gross) : bookPriceMinor;
    }
  }

  const subtotal = Math.max(0, Number(session?.amount_subtotal || 0));
  return subtotal || gross;
}

export function commissionBasisSource(session) {
  const currency = String(session?.currency || '').toLowerCase();
  const bookPriceNaira = Number(session?.metadata?.book_price_ngn || 0);
  if (currency === 'ngn' && Number.isFinite(bookPriceNaira) && bookPriceNaira > 0) {
    return 'book_price_ngn';
  }
  return session?.amount_subtotal ? 'amount_subtotal' : 'amount_total';
}

export function commissionableAmountAfterRefund(session, refundedAmount) {
  const gross = Math.max(0, Number(session?.amount_total || 0));
  const basis = commissionableAmountForSession(session);
  const refund = Math.max(0, Number(refundedAmount || 0));

  if (!gross || !basis || !refund) return basis;
  if (refund >= gross) return 0;

  // Delivery and other non-commissionable charges are treated as refunded first.
  // This prevents a delivery-fee refund from reducing an ambassador's book commission.
  const nonCommissionable = Math.max(0, gross - basis);
  const commissionableRefund = Math.max(0, refund - nonCommissionable);
  return Math.max(0, basis - commissionableRefund);
}
