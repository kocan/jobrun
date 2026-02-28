import { PriceBookService } from '../lib/types';
import { ServicePicker } from './ServicePicker';

interface ServicePickerModalProps {
  visible: boolean;
  services: PriceBookService[];
  onSelect: (svc: PriceBookService) => void;
  onClose: () => void;
}

/**
 * Thin wrapper around ServicePicker that pairs with `useLineItems` hook.
 * Usage:
 *   const li = useLineItems(form.lineItems, setLineItems);
 *   <ServicePickerModal
 *     visible={li.servicePickerVisible}
 *     services={li.activeServices}
 *     onSelect={li.handleServiceSelect}
 *     onClose={li.closeServicePicker}
 *   />
 */
export function ServicePickerModal({ visible, services, onSelect, onClose }: ServicePickerModalProps) {
  return (
    <ServicePicker
      visible={visible}
      services={services}
      onSelect={onSelect}
      onClose={onClose}
    />
  );
}
