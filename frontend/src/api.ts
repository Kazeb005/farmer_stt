const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api'

export type CropStatus = 'PLANTED' | 'GROWING' | 'HARVESTED'
export type YieldUnit = 'KG' | 'TONS' | 'BAGS'
export type ExpenseCategory = 'SEEDS' | 'FERTILIZER' | 'LABOR' | 'EQUIPMENT'

export interface Field {
  id: number
  name: string
  location: string | null
  sizeHectares: number
  soilType: string | null
}

export interface Crop {
  id: number
  name: string
  type: string | null
  plantingDate: string | null
  expectedHarvestDate: string | null
  status: CropStatus
  fieldId: number
}

export interface Harvest {
  id: number
  harvestDate: string
  yieldQuantity: number
  unit: YieldUnit
}

export interface Expense {
  id: number
  category: ExpenseCategory
  amount: number
  expenseDate: string
}

export interface ExpenseList {
  items: Expense[]
  total: number
}

export interface Livestock {
  id: number
  type: string
  count: number
  healthStatus: string | null
  acquisitionDate: string | null
  fieldId: number
}

export interface CropSummary {
  cropId: number
  cropName: string
  fieldName: string
  status: CropStatus
  totalExpenses: number
  totalYield: number | null
  yieldUnit: YieldUnit | null
}

export interface Dashboard {
  fieldCount: number
  activeCropCount: number
  harvestedCropCount: number
  totalExpenses: number
  crops: CropSummary[]
  noData: boolean
}

export interface Session {
  token: string
  username: string
  email: string
}

let token = localStorage.getItem('farm-token')

export function setToken(value: string | null) {
  token = value
  if (value) localStorage.setItem('farm-token', value)
  else localStorage.removeItem('farm-token')
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  const responseText = await response.text()
  let body: unknown = null
  let validJson = true
  if (responseText) {
    try {
      body = JSON.parse(responseText)
    } catch {
      validJson = false
    }
  }

  if (!response.ok) {
    const errorBody = body && typeof body === 'object' ? body as Record<string, unknown> : null
    const rawMessage = errorBody?.message ?? errorBody?.detail ?? errorBody?.error
    const message = typeof rawMessage === 'string'
      ? rawMessage
      : Array.isArray(rawMessage)
        ? rawMessage.map(String).join(', ')
        : `Request failed (${response.status})`
    throw new Error(message)
  }
  if (!responseText || response.status === 204 || response.status === 205) return undefined as T
  if (!validJson) throw new Error('The server returned a response that is not valid JSON')
  return body as T
}

export function jsonBody(value: unknown): Pick<RequestInit, 'method' | 'body'> {
  return { method: 'POST', body: JSON.stringify(value) }
}

export function putBody(value: unknown): Pick<RequestInit, 'method' | 'body'> {
  return { method: 'PUT', body: JSON.stringify(value) }
}