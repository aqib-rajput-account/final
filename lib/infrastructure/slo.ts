export type ServiceTier = 'api' | 'realtime-gateway' | 'workers'

export type ServiceSLO = {
  availabilityTarget: number
  p95LatencyMs: number
  maxErrorRate: number
  autoscaling: {
    minReplicas: number
    maxReplicas: number
    scaleOutWhen: string[]
    scaleInWhen: string[]
  }
}

export const SERVICE_SLO_TARGETS: Record<ServiceTier, ServiceSLO> = {
  api: {
    availabilityTarget: 99.95,
    p95LatencyMs: 250,
    maxErrorRate: 0.5,
    autoscaling: {
      minReplicas: 3,
      maxReplicas: 30,
      scaleOutWhen: [
        'cpu > 65% for 5m',
        'p95 latency > 220ms for 10m',
        'request queue depth > 1,000',
      ],
      scaleInWhen: ['cpu < 35% for 15m', 'request queue depth < 200 for 15m'],
    },
  },
  'realtime-gateway': {
    availabilityTarget: 99.9,
    p95LatencyMs: 120,
    maxErrorRate: 1,
    autoscaling: {
      minReplicas: 2,
      maxReplicas: 24,
      scaleOutWhen: [
        'open websocket connections > 30,000 per pod',
        'gateway event lag > 2s for 5m',
        'cpu > 70% for 5m',
      ],
      scaleInWhen: ['open websocket connections < 10,000 per pod for 20m', 'cpu < 40% for 20m'],
    },
  },
  workers: {
    availabilityTarget: 99.9,
    p95LatencyMs: 2000,
    maxErrorRate: 1,
    autoscaling: {
      minReplicas: 2,
      maxReplicas: 60,
      scaleOutWhen: ['queue depth > 5,000', 'oldest task age > 30s', 'cpu > 70% for 10m'],
      scaleInWhen: ['queue depth < 200 for 30m', 'oldest task age < 5s for 20m'],
    },
  },
}
