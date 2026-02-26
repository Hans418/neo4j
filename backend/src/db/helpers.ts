import { isInt, Integer, Record as Neo4jRecord } from 'neo4j-driver'

export const toNumber = (val: unknown): number => {
  if (val === null || val === undefined) return 0
  if (isInt(val as Integer)) return (val as Integer).toNumber()
  if (typeof val === 'number') return val
  return Number(val)
}

type Neo4jNode = { properties: { [key: string]: unknown } }

export const nodeToObj = (node: Neo4jNode | null | undefined): { [key: string]: unknown } => {
  console.log(node)
  if (!node?.properties) return {}
  const result: { [key: string]: unknown } = {}
  for (const [k, v] of Object.entries(node.properties)) {
    result[k] = isInt(v as Integer) ? (v as Integer).toNumber() : v
  }
  return result
}

export const getNode = (record: Neo4jRecord, key: string): { [key: string]: unknown } => {
  const node = record.get(key) as Neo4jNode | null
  if (!node?.properties) return {}
  return nodeToObj(node)
}