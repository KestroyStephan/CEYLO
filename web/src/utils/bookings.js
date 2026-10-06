// The apps write statuses in different cases ("Confirmed", "InProgress", "completed"), so group them
export const bookingStage = (status) => {
    const s = String(status || 'pending').toLowerCase();
    if (s === 'completed') return 'completed';
    if (['confirmed', 'accepted', 'arrived', 'inprogress'].includes(s)) return 'confirmed';
    if (['cancelled', 'rejected', 'expired'].includes(s)) return 'cancelled';
    return 'pending';
};
// Guides price their tours in US dollars; rides and orders are in rupees
export const bookingAmount = (b) => Number(b.finalFare ?? b.price ?? b.totalAmount ?? b.cost) || 0;
export const formatBookingAmount = (b) => b.type === 'guide'
    ? (bookingAmount(b) ? `US$ ${bookingAmount(b).toLocaleString()}` : 'Agreed with guide')
    : `LKR ${bookingAmount(b).toLocaleString()}`;
