import { DefaultServiceTemplate, Vertical } from '../lib/types';

export const verticals: Vertical[] = [
  {
    id: 'pressure-washing',
    name: 'Pressure Washing',
    icon: '💦',
    defaultServices: [
      { name: 'Driveway Wash', price: 150, description: 'Standard driveway pressure wash' },
      { name: 'House Wash', price: 300, description: 'Full exterior house wash' },
      { name: 'Deck/Patio Wash', price: 175, description: 'Deck or patio surface cleaning' },
      { name: 'Roof Wash', price: 400, description: 'Soft wash roof cleaning' },
      { name: 'Gutter Cleaning', price: 125, description: 'Gutter cleanout and flush' },
    ],
    terminology: { job: 'Wash' },
  },
  {
    id: 'auto-detailing',
    name: 'Auto Detailing',
    icon: '🚗',
    defaultServices: [
      { name: 'Exterior Wash', price: 50, description: 'Hand wash and dry' },
      { name: 'Interior Detail', price: 125, description: 'Full interior vacuum, wipe, and condition' },
      { name: 'Full Detail', price: 200, description: 'Complete interior and exterior detail' },
      { name: 'Ceramic Coating', price: 800, description: 'Professional ceramic coating application' },
      { name: 'Paint Correction', price: 500, description: 'Multi-stage paint correction and polish' },
    ],
    terminology: { job: 'Detail', customer: 'Client' },
  },
  {
    id: 'lawn-care',
    name: 'Lawn Care',
    icon: '🌿',
    defaultServices: [
      { name: 'Mowing', price: 45, description: 'Standard lawn mowing' },
      { name: 'Edging', price: 25, description: 'Sidewalk and bed edging' },
      { name: 'Leaf Cleanup', price: 100, description: 'Full yard leaf removal' },
      { name: 'Mulching', price: 150, description: 'Mulch delivery and spreading' },
      { name: 'Aeration', price: 125, description: 'Core aeration for lawn health' },
    ],
    terminology: { job: 'Service' },
  },
  {
    id: 'cleaning',
    name: 'Cleaning Services',
    icon: '🧹',
    defaultServices: [
      { name: 'Standard Clean', price: 120, description: 'Regular house cleaning' },
      { name: 'Deep Clean', price: 250, description: 'Thorough deep cleaning of all areas' },
      { name: 'Move-In/Move-Out', price: 300, description: 'Complete clean for move-in or move-out' },
      { name: 'Post-Construction', price: 400, description: 'Cleanup after construction or renovation' },
    ],
    terminology: { job: 'Clean', customer: 'Client' },
  },
  {
    id: 'handyman',
    name: 'Handyman',
    icon: '🔧',
    defaultServices: [
      { name: 'Hourly Rate', price: 75, description: 'General handyman work per hour' },
      { name: 'Fixture Install', price: 100, description: 'Light fixture, faucet, or hardware install' },
      { name: 'Minor Repair', price: 85, description: 'Small repairs and fixes' },
      { name: 'Assembly', price: 65, description: 'Furniture or equipment assembly' },
      { name: 'Painting', price: 200, description: 'Interior painting per room' },
    ],
  },
];
