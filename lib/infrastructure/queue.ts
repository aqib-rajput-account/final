import { randomUUID } from 'crypto'

type QueueMessage<TPayload extends Record<string, unknown>> = {
  id: string
  taskType: string
  payload: TPayload
  createdAt: string
}

const queueMemory = new Map<string, QueueMessage<Record<string, unknown>>[]>()

function getRedisConfig() {
  const baseUrl = process.env.REDIS_REST_URL
  const token = process.env.REDIS_REST_TOKEN
  if (!baseUrl || !token) return null

  return { baseUrl: baseUrl.replace(/\/$/, ''), token }
}

async function redisPost(path: string, body: unknown[]): Promise<void> {
  const cfg = getRedisConfig()
  if (!cfg) return

  await fetch(`${cfg.baseUrl}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
}

export async function enqueueWork<TPayload extends Record<string, unknown>>(input: {
  queue: string
  taskType: string
  payload: TPayload
}) {
  const message: QueueMessage<TPayload> = {
    id: randomUUID(),
    taskType: input.taskType,
    payload: input.payload,
    createdAt: new Date().toISOString(),
  }

  const queueName = `queue:${input.queue}`
  const entries = queueMemory.get(queueName) ?? []
  entries.push(message)
  queueMemory.set(queueName, entries)

  await redisPost('/rpush', [queueName, JSON.stringify(message)])

  return message
}

export function dequeueWork(queue: string) {
  const queueName = `queue:${queue}`
  const entries = queueMemory.get(queueName) ?? []
  const message = entries.shift() ?? null
  queueMemory.set(queueName, entries)
  return message
}

export function listQueuedWork(queue: string) {
  return [...(queueMemory.get(`queue:${queue}`) ?? [])]
}
