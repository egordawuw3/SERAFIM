import { appendFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { config } from './config.ts'
import type { Order } from './order.ts'

/* Резервная копия всех заявок (JSON Lines): если Telegram недоступен, заявка не потеряется. */
export async function saveOrder(order: Order): Promise<void> {
  await mkdir(dirname(config.ordersFile), { recursive: true })
  await appendFile(config.ordersFile, JSON.stringify(order) + '\n', 'utf8')
}
