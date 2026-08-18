// ============================================
// ConnectionDetails - 侧边栏左下角连接详情折叠面板
// 展开后显示：服务器 / MCP / LSP / 格式化器 信息
// ============================================

import { memo, useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDirectory, useServerStore } from '../../../hooks'
import { getMcpStatus } from '../../../api/mcp'
import { getFormatters, getLspServers, type FormatterServerStatus, type LspServerStatus } from '../../../api/lsp'
import type { MCPStatus } from '../../../types/api/mcp'
import { apiErrorHandler } from '../../../utils'
import {
  AlertCircleIcon,
  CheckIcon,
  CodeIcon,
  GlobeIcon,
  KeyIcon,
  PencilIcon,
  PlugIcon,
  RetryIcon,
  SpinnerIcon,
} from '../../../components/Icons'

// ============================================
// 状态点颜色工具
// ============================================

function dotClass(className: string) {
  return `w-1.5 h-1.5 rounded-full shrink-0 ${className}`
}

function mcpStatusDot(status: string): string {
  switch (status) {
    case 'connected':
      return 'bg-success-100'
    case 'failed':
      return 'bg-danger-100'
    case 'needs_auth':
    case 'needs_client_registration':
      return 'bg-warning-100'
    default:
      return 'bg-text-500'
  }
}

function mcpStatusInfo(status: MCPStatus, t: (key: string) => string): { label: string; icon: typeof CheckIcon | null } {
  switch (status.status) {
    case 'connected':
      return { label: t('mcpPanel.connected'), icon: CheckIcon }
    case 'disabled':
      return { label: t('mcpPanel.disabled'), icon: null }
    case 'failed':
      return { label: t('common:failed'), icon: AlertCircleIcon }
    case 'needs_auth':
      return { label: t('mcpPanel.needsAuth'), icon: KeyIcon }
    case 'needs_client_registration':
      return { label: t('mcpPanel.needsRegistration'), icon: KeyIcon }
    default:
      return { label: t('common:unknown'), icon: null }
  }
}

function healthStatus(t: (key: string) => string, status: string): { label: string; dot: string } {
  switch (status) {
    case 'online':
      return { label: t('sidebar.connectionStatusOnline'), dot: 'bg-success-100' }
    case 'offline':
      return { label: t('sidebar.connectionStatusOffline'), dot: 'bg-text-500' }
    case 'checking':
      return { label: t('sidebar.connectionStatusChecking'), dot: 'bg-warning-100 animate-pulse' }
    case 'unauthorized':
      return { label: t('sidebar.connectionStatusUnauthorized'), dot: 'bg-warning-100' }
    case 'error':
      return { label: t('sidebar.connectionStatusError'), dot: 'bg-danger-100' }
    default:
      return { label: t('common:unknown'), dot: 'bg-text-500' }
  }
}

// ============================================
// 小节标题
// ============================================

interface SectionHeaderProps {
  icon: React.ReactNode
  title: string
  count?: number
}

function SectionHeader({ icon, title, count }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-1.5 px-3 pt-2 pb-1 text-[length:var(--fs-xxs)] font-bold uppercase tracking-wider text-text-400">
      <span className="opacity-70 shrink-0">{icon}</span>
      <span className="truncate">{title}</span>
      {typeof count === 'number' && <span className="shrink-0 text-text-500 font-normal">({count})</span>}
    </div>
  )
}

// ============================================
// ConnectionDetails Component
// ============================================

interface ServerEntry {
  name: string
  status: MCPStatus
}

export const ConnectionDetails = memo(function ConnectionDetails() {
  const { t } = useTranslation(['chat', 'components', 'common'])
  const { currentDirectory } = useDirectory()
  const { servers, activeServer, getHealth, checkHealth } = useServerStore()

  const [mcpEntries, setMcpEntries] = useState<ServerEntry[]>([])
  const [lspServers, setLspServers] = useState<LspServerStatus[]>([])
  const [formatters, setFormatters] = useState<FormatterServerStatus[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [mcpResult, lspResult, formatterResult] = await Promise.allSettled([
      getMcpStatus(currentDirectory),
      getLspServers(currentDirectory),
      getFormatters(currentDirectory),
    ])

    if (mcpResult.status === 'fulfilled') {
      const entries: ServerEntry[] = Object.entries(mcpResult.value).map(([name, status]) => ({
        name,
        status: status as MCPStatus,
      }))
      entries.sort((a, b) => a.name.localeCompare(b.name))
      setMcpEntries(entries)
    } else {
      apiErrorHandler('load MCP status', mcpResult.reason)
    }

    if (lspResult.status === 'fulfilled') {
      setLspServers(lspResult.value)
    } else {
      apiErrorHandler('load LSP status', lspResult.reason)
    }

    if (formatterResult.status === 'fulfilled') {
      setFormatters(formatterResult.value)
    } else {
      apiErrorHandler('load formatter status', formatterResult.reason)
    }

    setLoading(false)
  }, [currentDirectory])

  useEffect(() => {
    // 延迟派发初次加载，避免 effect 内同步 setState 触发级联渲染
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const handleRefresh = useCallback(() => {
    setLoading(true)
    void load()
    if (activeServer) {
      void checkHealth(activeServer.id)
    }
  }, [load, activeServer, checkHealth])

  if (loading && servers.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-4 text-[length:var(--fs-sm)] text-text-400">
        <SpinnerIcon size={14} className="animate-spin opacity-50" />
        <span>{t('sidebar.connectionLoading')}</span>
      </div>
    )
  }

  return (
    <div className="text-[length:var(--fs-sm)]">
      {/* 头部：刷新 */}
      <div className="flex items-center justify-between px-3 pt-2">
        <span className="text-[length:var(--fs-xxs)] font-bold uppercase tracking-wider text-text-400">
          {t('sidebar.connectionDetails')}
        </span>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          aria-label={t('common:refresh')}
          title={t('common:refresh')}
          className="shrink-0 p-1 rounded-md text-text-400 hover:text-text-100 hover:bg-bg-200/50 transition-colors disabled:opacity-50"
        >
          <RetryIcon size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* 服务器信息 */}
      <SectionHeader icon={<GlobeIcon size={11} />} title={t('sidebar.connectionServer')} count={servers.length} />
      {servers.length === 0 ? (
        <div className="px-3 pb-1 text-text-500">{t('sidebar.connectionNoServers')}</div>
      ) : (
        <div className="px-2 pb-1">
          {servers.map(server => {
            const health = getHealth(server.id)
            const info = health ? healthStatus(t, health.status) : { label: t('common:unknown'), dot: 'bg-text-500' }
            const isActive = activeServer?.id === server.id
            return (
              <div key={server.id} className="flex items-start gap-2 rounded-md px-1.5 py-1">
                <span className={`mt-1 ${dotClass(info.dot)}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-text-100 truncate">
                    <span className="truncate">{server.name}</span>
                    {isActive && (
                      <span className="shrink-0 rounded bg-accent-main-100/15 px-1 py-px text-[length:var(--fs-xxs)] text-accent-main-100">
                        {t('sidebar.connectionActive')}
                      </span>
                    )}
                  </div>
                  <div className="truncate font-mono text-[length:var(--fs-xxs)] text-text-500">{server.url}</div>
                  <div className="flex items-center gap-1.5 text-[length:var(--fs-xxs)] text-text-400">
                    <span>{info.label}</span>
                    {health?.status === 'online' && health.version && (
                      <span className="text-text-500">{t('sidebar.connectionVersion', { version: health.version })}</span>
                    )}
                    {typeof health?.latency === 'number' && (
                      <span className="text-text-500">{t('sidebar.connectionLatency', { ms: health.latency })}</span>
                    )}
                  </div>
                  {health?.status !== 'online' && health?.error && (
                    <div className="mt-0.5 truncate text-[length:var(--fs-xxs)] text-danger-100" title={health.error}>
                      {health.error}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MCP 信息 */}
      <SectionHeader icon={<PlugIcon size={11} />} title={t('sidebar.connectionMcp')} count={mcpEntries.length} />
      {mcpEntries.length === 0 ? (
        <div className="px-3 pb-1 text-text-500">{t('sidebar.connectionNoMcp')}</div>
      ) : (
        <div className="px-2 pb-1">
          {mcpEntries.map(entry => {
            const info = mcpStatusInfo(entry.status, t)
            const Icon = info.icon
            return (
              <div key={entry.name} className="flex items-center gap-2 rounded-md px-1.5 py-1">
                <span className={dotClass(mcpStatusDot(entry.status.status))} />
                <span className="min-w-0 flex-1 truncate text-text-100">{entry.name}</span>
                <span className={`shrink-0 flex items-center gap-1 text-[length:var(--fs-xxs)] ${entry.status.status === 'connected' ? 'text-success-100' : entry.status.status === 'failed' ? 'text-danger-100' : entry.status.status === 'needs_auth' || entry.status.status === 'needs_client_registration' ? 'text-warning-100' : 'text-text-400'}`}>
                  {Icon && <Icon size={9} />}
                  {info.label}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* LSP 信息 */}
      <SectionHeader icon={<CodeIcon size={11} />} title={t('sidebar.connectionLsp')} count={lspServers.length} />
      {lspServers.length === 0 ? (
        <div className="px-3 pb-1 text-text-500">{t('sidebar.connectionNoLsp')}</div>
      ) : (
        <div className="px-2 pb-1">
          {lspServers.map(server => (
            <div key={server.id} className="flex items-start gap-2 rounded-md px-1.5 py-1">
              <span className={`mt-1 ${dotClass(server.status === 'connected' ? 'bg-success-100' : 'bg-danger-100')}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-text-100 truncate">
                  <span className="truncate">{server.name}</span>
                  <span className={`shrink-0 ${server.status === 'connected' ? 'text-success-100' : 'text-danger-100'}`}>
                    {server.status === 'connected' ? t('mcpPanel.connected') : t('common:failed')}
                  </span>
                </div>
                {server.root && (
                  <div className="truncate font-mono text-[length:var(--fs-xxs)] text-text-500">{server.root}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 格式化器信息 */}
      <SectionHeader
        icon={<PencilIcon size={11} />}
        title={t('sidebar.connectionFormatter')}
        count={formatters.length}
      />
      {formatters.length === 0 ? (
        <div className="px-3 pb-2 text-text-500">{t('sidebar.connectionNoFormatter')}</div>
      ) : (
        <div className="px-2 pb-2">
          {formatters.map(formatter => (
            <div key={formatter.name} className="flex items-center gap-2 rounded-md px-1.5 py-1">
              <span className={dotClass(formatter.enabled ? 'bg-success-100' : 'bg-text-500')} />
              <span className="min-w-0 flex-1 truncate text-text-100">{formatter.name}</span>
              <span className="shrink-0 rounded bg-bg-300/60 px-1.5 py-0.5 font-mono text-[length:var(--fs-xxs)] text-text-400">
                {formatter.extensions.join(', ')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})
