import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Key, Sparkles } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../../context/ToastContext';
import { createNode, generateRealityKeys, fetchAdminRegions } from '../../services/apiClient';
import type { RealityKeys } from '../../types/node';
import type { RegionItem } from '../../types/region';

interface AddNodeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string | null;
}

export const AddNodeSheet: React.FC<AddNodeSheetProps> = ({
  isOpen,
  onClose,
  onSuccess,
  token,
}) => {
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [name, setName] = useState<string>('');
  const [host, setHost] = useState<string>('');
  const [location, setLocation] = useState<string>('Japan 🇯🇵');
  const [flag, setFlag] = useState<string>('🇯🇵');
  const [grpcPort, setGrpcPort] = useState<string>('10085');
  const [inboundPort, setInboundPort] = useState<string>('443');
  const [maxSubscriptions, setMaxSubscriptions] = useState<string>('100');
  const [realityPrivKey, setRealityPrivKey] = useState<string>('');
  const [realityPubKey, setRealityPubKey] = useState<string>('');
  const [realityShortId, setRealityShortId] = useState<string>('');
  const [carrier, setCarrier] = useState<string>('Docomo 5G');
  const [sniDomain, setSniDomain] = useState<string>('images.apple.com');
  const [regions, setRegions] = useState<RegionItem[]>([]);
  const [regionId, setRegionId] = useState<number | undefined>(undefined);
  const [isGeneratingKeys, setIsGeneratingKeys] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  React.useEffect(() => {
    if (isOpen && token) {
      fetchAdminRegions(token)
        .then((res) => {
          setRegions(res);
          const active = res.filter((r) => r.is_active);
          if (active.length > 0) {
            setRegionId(active[0].id);
            setLocation(active[0].name);
            setFlag(active[0].flag);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, token]);

  const resetForm = () => {
    setName('');
    setHost('');
    setRegionId(undefined);
    setLocation('Japan 🇯🇵');
    setFlag('🇯🇵');
    setGrpcPort('10085');
    setInboundPort('443');
    setMaxSubscriptions('100');
    setRealityPrivKey('');
    setRealityPubKey('');
    setRealityShortId('');
    setCarrier('Docomo 5G');
    setSniDomain('images.apple.com');
  };

  const handleGenerateKeys = async () => {
    if (!token) return;
    try {
      setIsGeneratingKeys(true);
      const keys: RealityKeys = await generateRealityKeys(token);
      setRealityPrivKey(keys.private_key);
      setRealityPubKey(keys.public_key);
      setRealityShortId(keys.short_id);
      showToast({
        type: 'success',
        title: t('management.keysGenerated'),
        message: t('management.keysGeneratedMessage'),
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: t('management.keygenError'),
        message: err instanceof Error ? err.message : 'Could not generate keys',
      });
    } finally {
      setIsGeneratingKeys(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!name.trim() || !host.trim()) {
      showToast({
        type: 'error',
        title: t('management.validationError'),
        message: t('management.nodeRequired'),
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await createNode(token, {
        name: name.trim(),
        host: host.trim(),
        region_id: regionId,
        location: location.trim(),
        flag: flag || '🌐',
        grpc_port: parseInt(grpcPort, 10) || 10085,
        inbound_port: parseInt(inboundPort, 10) || 443,
        max_subscriptions: parseInt(maxSubscriptions, 10) || 100,
        reality_private_key: realityPrivKey.trim() || undefined,
        reality_public_key: realityPubKey.trim() || undefined,
        reality_short_id: realityShortId.trim() || undefined,
        sni_profiles: sniDomain.trim()
          ? [{ carrier: carrier.trim() || 'Default Carrier', domain: sniDomain.trim() }]
          : [],
      });

      showToast({
        type: 'success',
        title: t('management.nodeCreated'),
        message: t('management.nodeCreatedMessage', { name }),
      });

      resetForm();
      onClose();
      onSuccess();
    } catch (err) {
      showToast({
        type: 'error',
        title: t('management.nodeCreateFailed'),
        message: err instanceof Error ? err.message : t('management.nodeCreateFailed'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title={t('management.registerNode')}
      description={t('management.registerNodeDescription')}
      footer={
        <>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="gradient"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            {isSubmitting ? t('common.saving') : t('management.registerNode')}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('management.nodeName')}
          placeholder={t('management.exampleNodeName')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          hint={t('management.nodeIdentifierHint')}
        />

        <Input
          label={t('management.hostAddress')}
          placeholder={t('management.exampleHost')}
          value={host}
          onChange={(e) => setHost(e.target.value)}
          required
          hint={t('management.hostAddressHint')}
        />

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            {t('management.serverRegion')}
          </label>
          <select
            value={regionId || ''}
            onChange={(e) => {
              const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
              setRegionId(val);
              const found = regions.find((r) => r.id === val);
              if (found) {
                setLocation(found.name);
                setFlag(found.flag);
              }
            }}
            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md shadow-xs focus:border-slate-900 focus:outline-none transition-colors"
          >
            <option value="">{t('management.selectRegion')}</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
              {r.flag} {r.name} ({r.code}) {!r.is_active ? `(${t('management.inactive')})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('management.locationLabel')}
            placeholder={t('management.exampleLocation')}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <Input
            label={t('management.countryFlag')}
            placeholder="🇯🇵"
            value={flag}
            onChange={(e) => setFlag(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('management.grpcPort')}
            placeholder="10085"
            value={grpcPort}
            onChange={(e) => setGrpcPort(e.target.value)}
            hint={t('management.grpcPortHint')}
          />
          <Input
            label={t('management.inboundPort')}
            placeholder="443"
            value={inboundPort}
            onChange={(e) => setInboundPort(e.target.value)}
            hint={t('management.inboundPortHint')}
          />
        </div>

        <Input
          label={t('management.capacity')}
          type="number"
          min="1"
          placeholder="100"
          value={maxSubscriptions}
          onChange={(e) => setMaxSubscriptions(e.target.value)}
          hint={t('management.capacityHint')}
          required
        />

        {/* Reality Cryptographic Keys Section */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-slate-500" />
                {t('management.realityKeys')}
              </h4>
              <p className="text-[11px] text-slate-500">{t('management.autoGenerated')}</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={handleGenerateKeys}
              disabled={isGeneratingKeys}
              leftIcon={<Sparkles className="w-3 h-3 text-amber-500" />}
            >
              {isGeneratingKeys ? t('management.generatingScript') : t('management.autoGenerate')}
            </Button>
          </div>

          <Input
            label={t('management.privateKeyOptional')}
            placeholder={t('management.autoGeneratedBase64')}
            value={realityPrivKey}
            onChange={(e) => setRealityPrivKey(e.target.value)}
          />
          <Input
            label={t('management.publicKeyOptional')}
            placeholder={t('management.autoGenerated')}
            value={realityPubKey}
            onChange={(e) => setRealityPubKey(e.target.value)}
          />
          <Input
            label={t('management.shortIdOptional')}
            placeholder={t('management.autoGeneratedHex')}
            value={realityShortId}
            onChange={(e) => setRealityShortId(e.target.value)}
          />
        </div>

        {/* Initial SNI Profile Section */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3">
          <h4 className="text-xs font-semibold text-slate-800">{t('management.initialSni')}</h4>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('management.carrierName')}
              placeholder={t('management.exampleCarrier')}
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
            />
            <Input
              label={t('management.sniDomain')}
              placeholder="images.apple.com"
              value={sniDomain}
              onChange={(e) => setSniDomain(e.target.value)}
            />
          </div>
        </div>
      </form>
    </Sheet>
  );
};
