import React, { useState, useEffect } from 'react';
import { Plus, Save } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../../context/ToastContext';
import { createAdminRegion, updateAdminRegion } from '../../services/apiClient';
import type { RegionItem } from '../../types/region';

interface RegionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialRegion: RegionItem | null;
  token: string | null;
}

export const RegionModal: React.FC<RegionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialRegion,
  token,
}) => {
  const { showToast } = useToast();
  const [code, setCode] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [flag, setFlag] = useState<string>('🌐');
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (initialRegion) {
      setCode(initialRegion.code);
      setName(initialRegion.name);
      setFlag(initialRegion.flag);
      setSortOrder(initialRegion.sort_order);
      setIsActive(initialRegion.is_active);
    } else {
      setCode('');
      setName('');
      setFlag('🌐');
      setSortOrder(0);
      setIsActive(true);
    }
  }, [initialRegion, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!code.trim() || !name.trim()) {
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Region code and name are required.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      if (initialRegion) {
        await updateAdminRegion(token, initialRegion.id, {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          flag: flag.trim() || '🌐',
          sort_order: sortOrder,
          is_active: isActive,
        });
        showToast({
          type: 'success',
          title: 'Region Updated',
          message: `Region ${name} updated successfully.`,
        });
      } else {
        await createAdminRegion(token, {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          flag: flag.trim() || '🌐',
          sort_order: sortOrder,
          is_active: isActive,
        });
        showToast({
          type: 'success',
          title: 'Region Created',
          message: `Region ${name} added successfully.`,
        });
      }
      onSuccess();
      onClose();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Save Failed',
        message: err instanceof Error ? err.message : 'Failed to save region',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialRegion ? `Edit Region: ${initialRegion.name}` : 'Add New Region'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Region Code"
            placeholder="e.g. VN, SG, JP, US"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            hint="2-3 letter ISO or short code"
          />
          <Input
            label="Flag Emoji"
            placeholder="🇻🇳"
            value={flag}
            onChange={(e) => setFlag(e.target.value)}
            hint="Display flag icon"
          />
        </div>

        <Input
          label="Region Name"
          placeholder="e.g. Vietnam, Singapore"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-3 items-center">
          <Input
            label="Sort Order"
            type="number"
            value={sortOrder.toString()}
            onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
            hint="Lower numbers appear first"
          />
          <div className="pt-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-slate-900"
              />
              <span>Region is Active</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="gradient"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
            leftIcon={initialRegion ? <Save className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          >
            {isSubmitting ? 'Saving...' : initialRegion ? 'Save Changes' : 'Create Region'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
