// One icon and label per way of getting around, shared by the ride screen and trip plans
// (MaterialCommunityIcons names).
export const TRANSPORT = {
  Tuk: { icon: 'rickshaw', label: 'Tuk-tuk' },
  tuk: { icon: 'rickshaw', label: 'Tuk-tuk' },
  Bike: { icon: 'motorbike', label: 'Bike' },
  Car: { icon: 'car-side', label: 'Car' },
  car: { icon: 'car-side', label: 'Car' },
  Van: { icon: 'van-passenger', label: 'Van' },
  bus: { icon: 'bus', label: 'Bus' },
  train: { icon: 'train', label: 'Train' },
  walk: { icon: 'walk', label: 'Walk' },
};

export const transportIcon = (mode) => TRANSPORT[mode]?.icon || 'map-marker-path';
export const transportLabel = (mode) => TRANSPORT[mode]?.label || String(mode || '');
