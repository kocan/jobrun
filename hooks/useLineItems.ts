import { useState, useMemo, useCallback } from 'react';
import * as Crypto from 'expo-crypto';
import { usePriceBook } from '../contexts/PriceBookContext';
import { LineItem } from '../lib/types';

/**
 * Shared line-item management logic used by Job, Estimate, and Invoice detail screens.
 * Encapsulates add/update/remove operations plus service-picker visibility state.
 */
export function useLineItems(
  lineItems: LineItem[],
  setLineItems: (updater: (items: LineItem[]) => LineItem[]) => void,
) {
  const { getActiveServices } = usePriceBook();
  const activeServices = useMemo(() => getActiveServices(), [getActiveServices]);

  const [servicePickerVisible, setServicePickerVisible] = useState(false);

  const addFromService = useCallback(
    (serviceId: string) => {
      const svc = activeServices.find((s) => s.id === serviceId);
      if (!svc) return;
      const li: LineItem = {
        id: Crypto.randomUUID(),
        serviceId: svc.id,
        name: svc.name,
        description: svc.description,
        quantity: 1,
        unitPrice: svc.price,
        total: svc.price,
      };
      setLineItems((items) => [...items, li]);
    },
    [activeServices, setLineItems],
  );

  const updateItem = useCallback(
    (liId: string, updates: Partial<LineItem>) => {
      setLineItems((items) =>
        items.map((li) => {
          if (li.id !== liId) return li;
          const updated = { ...li, ...updates };
          updated.total = Math.round(updated.unitPrice * updated.quantity * 100) / 100;
          return updated;
        }),
      );
    },
    [setLineItems],
  );

  const removeItem = useCallback(
    (liId: string) => {
      setLineItems((items) => items.filter((li) => li.id !== liId));
    },
    [setLineItems],
  );

  const openServicePicker = useCallback(() => setServicePickerVisible(true), []);
  const closeServicePicker = useCallback(() => setServicePickerVisible(false), []);

  const handleServiceSelect = useCallback(
    (svc: { id: string }) => {
      addFromService(svc.id);
      setServicePickerVisible(false);
    },
    [addFromService],
  );

  return {
    activeServices,
    servicePickerVisible,
    openServicePicker,
    closeServicePicker,
    addFromService,
    updateItem,
    removeItem,
    handleServiceSelect,
  };
}
