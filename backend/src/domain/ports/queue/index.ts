// 核心佇列介面
export {
  QueueCorePort,
  QUEUE_CORE_PORT_TOKEN,
  JobData,
  JobOptions,
} from './queue-core.port.js';

// 緩存管理介面
export {
  QueueCachePort,
  QUEUE_CACHE_PORT_TOKEN,
  JobStatusCache,
} from './queue-cache.port.js';

// 事件處理介面
export {
  QueueEventPort,
  QUEUE_EVENT_PORT_TOKEN,
  EventHandlerResult,
} from './queue-event.port.js';

// 健康檢查介面
export {
  QueueHealthPort,
  QUEUE_HEALTH_PORT_TOKEN,
  HealthReport,
  QueueStatus,
  QueueMetrics,
} from './queue-health.port.js';

// 向後兼容：重新匯出舊的 QueuePort（將在後續版本中標記為 deprecated）
export { QueuePort, QUEUE_PORT_TOKEN } from '../queue.port.js';
