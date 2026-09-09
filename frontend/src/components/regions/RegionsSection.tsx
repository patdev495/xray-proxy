import React, { useState, useEffect, useCallback } from 'react';
import { Globe, Plus, Edit2, Trash2, Power, RefreshCw } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useToast } from '../../context/ToastContext';
import {
  fetchAdminRegions,
  updateAdminRegion,
  deleteAdminRegion,
} from '../../services/apiClient';
import type { RegionItem } from '../../types/region';
import { RegionModal } from './RegionModal';

interface RegionsSectionProps {
  token: string | null;
}

export const RegionsSection: React.FC<RegionsSectionProps> = ({ token }) => {
  const { showToast } = useToast();
  const [regions, setRegions] = useState<RegionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingRegion, setEditingRegion] = useState<RegionItem | null>(null);

  const loadRegions = useCallback(async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const data = await fetchAdminRegions(token);
      setRegions(data);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Error Loading Regions',
        message: err instanceof Error ? err.message : 'Could not fetch regions',
      });
    } finally {
      setIsLoading(false);
    }
  }, [token, showToast]);

  useEffect(() => {
    loadRegions();
  }, [loadRegions]);

  const handleToggleActive = async (region: RegionItem) => {
    if (!token) return;
    try {
      const updated = await updateAdminRegion(token, region.id, {
        is_active: !region.is_active,
      });
      setRegions((prev) => prev.map((r) => (r.id === region.id ? updated : r)));
      showToast({
        type: 'success',
        title: 'Status Updated',
        message: `${region.name} is now ${updated.is_active ? 'active' : 'inactive'}.`,
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: err instanceof Error ? err.message : 'Could not toggle status',
      });
    }
  };

  const handleDelete = async (region: RegionItem) => {
    if (!token) return;
    if (!window.confirm(`Delete region "${region.name}" (${region.code})? Associated nodes will be unassigned.`)) {
      return;
    }
    try {
      await deleteAdminRegion(token, region.id);
      setRegions((prev) => prev.filter((r) => r.id !== region.id));
      showToast({
        type: 'success',
        title: 'Region Deleted',
        message: `Region ${region.name} deleted.`,
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Delete Failed',
        message: err instanceof Error ? err.message : 'Could not delete region',
      });
    }
  };

  return (
    <Card variant="glass" className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100/80">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Server Regions</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage geographic clusters for VPS node assignment and user subscription allocation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={loadRegions}
            disabled={isLoading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
          <Button
            variant="gradient"
            size="sm"
            onClick={() => {
              setEditingRegion(null);
              setIsModalOpen(true);
            }}
            leftIcon={<Plus className="w-3.5 h-3.5 text-white" />}
          >
            Add Region
          </Button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-2.5 px-3">Region</th>
              <th className="py-2.5 px-3">Code</th>
              <th className="py-2.5 px-3">Sort Order</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {regions.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-400">
                  {isLoading ? 'Loading regions...' : 'No regions configured yet.'}
                </td>
              </tr>
            ) : (
              regions.map((region) => (
                <tr key={region.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3 font-medium text-slate-900">
                    <span className="mr-2 text-base">{region.flag}</span>
                    {region.name}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[11px]">
                      {region.code}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-600">{region.sort_order}</td>
                  <td className="py-3 px-3">
                    <Badge variant={region.is_active ? 'emerald' : 'slate'} size="sm">
                      {region.is_active ? 'Active' : 'Disabled'}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(region)}
                        title={region.is_active ? 'Disable Region' : 'Enable Region'}
                        className={region.is_active ? 'text-emerald-600' : 'text-slate-400'}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingRegion(region);
                          setIsModalOpen(true);
                        }}
                        title="Edit Region"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(region)}
                        title="Delete Region"
                        className="text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <RegionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadRegions}
        initialRegion={editingRegion}
        token={token}
      />
    </Card>
  );
};
