// Same keys as mobile/screens/driver/DriverPendingScreen.js
export const DRIVER_DOCS = [
  { key: 'nic_front', label: 'NIC – front', required: true },
  { key: 'nic_back', label: 'NIC – back', required: true },
  { key: 'licence_front', label: 'Driving licence – front', required: true, expiry: true },
  { key: 'licence_back', label: 'Driving licence – back', required: true },
  { key: 'vehicle_cr', label: 'Vehicle registration (CR)', required: true },
  { key: 'insurance', label: 'Vehicle insurance certificate', required: true, expiry: true },
  { key: 'revenue_licence', label: 'Revenue licence', required: false, expiry: true },
  { key: 'vehicle_photo', label: 'Vehicle photo showing the plate', required: false },
];

export const toMs = (t) => (t?.toMillis ? t.toMillis() : typeof t === 'number' ? t : t ? Date.parse(t) || 0 : 0);

// A review only counts for the file it was made on; a newer upload needs a new review
export const docState = (file, review) => {
  if (!file) return 'missing';
  if (!review || toMs(review.at) < toMs(file.uploadedAt)) return 'pending';
  return review.status === 'approved' ? 'approved' : review.status === 'rejected' ? 'rejected' : 'pending';
};

export const isExpired = (file) => Boolean(file?.expiry) && Date.parse(file.expiry) < Date.now();

export const docSummary = (record) => {
  const files = record?.files || {};
  const review = record?.review || {};
  const states = Object.fromEntries(DRIVER_DOCS.map(d => [d.key, docState(files[d.key], review[d.key])]));
  const required = DRIVER_DOCS.filter(d => d.required);
  return {
    states,
    uploaded: DRIVER_DOCS.filter(d => states[d.key] !== 'missing').length,
    approved: DRIVER_DOCS.filter(d => states[d.key] === 'approved').length,
    rejected: DRIVER_DOCS.filter(d => states[d.key] === 'rejected').length,
    total: DRIVER_DOCS.length,
    // A driver can be approved once every required document is approved and none has expired
    readyToApprove: required.every(d => states[d.key] === 'approved' && !isExpired(files[d.key])),
  };
};
