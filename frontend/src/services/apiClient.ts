/**
 * Unified API Client for xray-proxy
 * Re-exports domain-specific API services.
 */

export { API_BASE_URL } from './api/client';

export {
  fetchHealth,
  loginUser,
  fetchCurrentUser,
  registerUser,
  loginWithGoogle,
} from './api/auth';


export {
  fetchNodes,
  createNode,
  updateNode,
  deleteNode,
  generateRealityKeys,
  addSniProfile,
  updateSniProfile,
  deleteSniProfile,
  fetchNodeInstallScript,
  fetchNodeSyncScript,
  syncNodeUsers,
  fetchRegionsStatus,
} from './api/nodes';

export {
  fetchSubscriptions,
  createSubscription,
  updateSubscription,
  deleteSubscription,
} from './api/subscriptions';

export {
  triggerLiveStatsSync,
  triggerEnforceLimits,
  fetchSyncStatus,
} from './api/sync';

export {
  fetchAdminPlans,
  createAdminPlan,
  updateAdminPlan,
  deleteAdminPlan,
  fetchPublicPlans,
  fetchAdminSettings,
  updateAdminSettings,
  fetchPublicSettings,
} from './api/plans';

export {
  fetchAdminRegions,
  createAdminRegion,
  updateAdminRegion,
  deleteAdminRegion,
  fetchPublicRegions,
} from './api/regions';

export {
  createOrder,
  fetchOrderByCode,
  fetchAdminOrders,
  confirmAdminOrder,
  fetchMyOrders,
  cancelMyOrder,
} from './api/orders';

export {
  fetchMySubscriptions,
  fetchEligibleNodes,
  switchSubscriptionNode,
  renewSubscription,
} from './api/portal';


