/**
 * AI 模块公共工具方法
 */

/** 解析 AI 返回的 JSON（兼容 markdown code block 包裹） */
export function parseJsonResponse(raw: string): any {
  let json = raw.trim()
  // 去除 ```json ... ``` 包裹
  const codeBlock = json.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (codeBlock) json = codeBlock[1]
  return JSON.parse(json)
}
