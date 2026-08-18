// ============================================
// LSP API - Language Server Protocol 状态
// ============================================

import type { FormatterStatus as SDKFormatterStatus, LspStatus as SDKLspStatus } from '@opencode-ai/sdk/v2/client'
import { getSDKClient, unwrap } from './sdk'
import { formatPathForApi } from '../utils/directoryUtils'

/** LSP 服务器状态（SDK 原始结构：id/name/root/status） */
export type LspServerStatus = SDKLspStatus
/** 格式化器状态（SDK 原始结构：name/extensions/enabled） */
export type FormatterServerStatus = SDKFormatterStatus

/**
 * 获取所有 LSP 服务器状态
 */
export async function getLspServers(directory?: string): Promise<LspServerStatus[]> {
  const sdk = getSDKClient()
  return unwrap<SDKLspStatus[]>(await sdk.lsp.status({ directory: formatPathForApi(directory) }))
}

/**
 * 获取所有格式化器状态
 */
export async function getFormatters(directory?: string): Promise<FormatterServerStatus[]> {
  const sdk = getSDKClient()
  return unwrap<SDKFormatterStatus[]>(await sdk.formatter.status({ directory: formatPathForApi(directory) }))
}
