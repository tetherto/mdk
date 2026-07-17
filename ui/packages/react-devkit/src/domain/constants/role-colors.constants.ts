type RoleBadgeColors = {
  color: string
  bgColor: string
}

const ROLE_COLORS: Record<string, RoleBadgeColors> = {
  admin: { color: '#e8833a', bgColor: 'rgba(232, 131, 58, 0.1)' },
  site_admin: { color: '#52c41a', bgColor: 'rgba(82, 196, 26, 0.1)' },
  site_manager: { color: '#52c41a', bgColor: 'rgba(82, 196, 26, 0.1)' },
  site_operator: { color: '#faad14', bgColor: 'rgba(250, 173, 20, 0.1)' },
  field_operator: { color: '#faad14', bgColor: 'rgba(250, 173, 20, 0.1)' },
  repair_technician: { color: '#faad14', bgColor: 'rgba(250, 173, 20, 0.1)' },
  reporting_tool_manager: { color: '#52c41a', bgColor: 'rgba(82, 196, 26, 0.1)' },
  read_only_user: { color: '#8c8c8c', bgColor: 'rgba(140, 140, 140, 0.1)' },
  developer: { color: '#1890ff', bgColor: 'rgba(24, 144, 255, 0.1)' },
}

const DEFAULT_BADGE_COLORS: RoleBadgeColors = {
  color: '#8c8c8c',
  bgColor: 'rgba(140, 140, 140, 0.1)',
}

export const getRoleBadgeColors = (role: string): RoleBadgeColors =>
  ROLE_COLORS[role] || DEFAULT_BADGE_COLORS
