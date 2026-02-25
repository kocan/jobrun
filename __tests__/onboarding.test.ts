import { verticals } from '../constants/verticals';
import { buildServicesFromDefaults } from '../lib/db/repositories/priceBook';
import { defaultSettings } from '../lib/db/repositories/settings';

describe('Onboarding - Price Book Initialization', () => {
  test('each vertical has default services', () => {
    for (const v of verticals) {
      expect(v.defaultServices.length).toBeGreaterThan(0);
      for (const s of v.defaultServices) {
        expect(s.name).toBeTruthy();
        expect(s.price).toBeGreaterThan(0);
      }
    }
  });

  test('buildServicesFromDefaults creates correct services from vertical', () => {
    const vertical = verticals.find((v) => v.id === 'pressure-washing')!;
    let counter = 0;
    const services = buildServicesFromDefaults(vertical.defaultServices, () => `id-${counter++}`);
    expect(services).toHaveLength(vertical.defaultServices.length);
    expect(services[0].name).toBe('Driveway Wash');
    expect(services[0].price).toBe(150);
    expect(services[0].isActive).toBe(true);
    expect(services[0].id).toBe('id-0');
  });

  test('custom vertical gets empty price book', () => {
    const services = buildServicesFromDefaults([], () => 'id');
    expect(services).toHaveLength(0);
  });

  test('onboarding completion check defaults to false', () => {
    expect(defaultSettings.onboardingComplete).toBe(false);
  });

  test('vertical change resets price book with new defaults', () => {
    const pw = verticals.find((v) => v.id === 'pressure-washing')!;
    const ad = verticals.find((v) => v.id === 'auto-detailing')!;
    let counter = 0;
    const gen = () => `id-${counter++}`;

    const first = buildServicesFromDefaults(pw.defaultServices, gen);
    expect(first[0].name).toBe('Driveway Wash');

    const second = buildServicesFromDefaults(ad.defaultServices, gen);
    expect(second[0].name).toBe('Exterior Wash');
    expect(second).toHaveLength(ad.defaultServices.length);
  });
});
