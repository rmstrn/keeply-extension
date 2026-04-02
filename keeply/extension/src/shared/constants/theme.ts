export interface ThemeTokens {
  readonly id: string
  readonly name: string
  readonly bg: string
  readonly surface: string
  readonly elevated: string
  readonly border: string
  readonly hoverBg: string
  readonly text: string
  readonly text2: string
  readonly textMuted: string
  readonly primary: string
  readonly primaryHover: string
  readonly primaryText: string
  readonly danger: string
  readonly dangerBg: string
  readonly warning: string
  readonly success: string
  readonly ctaIcon: string
  readonly ctaIconColor: string
}

export const lightTheme: ThemeTokens = {
  id: 'light',
  name: 'Light',
  bg: '#FFFFFF',
  surface: '#F5F6F1',
  elevated: '#EEEEE9',
  border: '#E4E5E0',
  hoverBg: '#E4F4EE',
  text: '#0F100D',
  text2: '#36382F',
  textMuted: '#6B6D64',
  primary: '#0D7A5F',
  primaryHover: '#0A5C47',
  primaryText: '#FFFFFF',
  danger: '#DC2626',
  dangerBg: '#FFE4E6',
  warning: '#B45309',
  success: '#0D7A5F',
  ctaIcon: '✨',
  ctaIconColor: '#FFFFFF',
}

export const softJadeTheme: ThemeTokens = {
  id: 'soft-jade',
  name: 'Soft Jade',
  bg: '#312F2C',
  surface: '#3D3B38',
  elevated: '#454340',
  border: '#4A4845',
  hoverBg: '#454340',
  text: '#ABD1C6',
  text2: '#7FAFA4',
  textMuted: '#5A8A82',
  primary: '#ABD1C6',
  primaryHover: '#C5DDD8',
  primaryText: '#312F2C',
  danger: '#E57373',
  dangerBg: '#3D2B2B',
  warning: '#D4956A',
  success: '#ABD1C6',
  ctaIcon: '✨',
  ctaIconColor: '#312F2C',
}

export const plumWineTheme: ThemeTokens = {
  id: 'plum-wine',
  name: 'Plum Wine',
  bg: '#3A2650',
  surface: '#4A3260',
  elevated: '#5E4075',
  border: '#6B4D85',
  hoverBg: '#6B4D85',
  text: '#F8F9ED',
  text2: '#C8C9B8',
  textMuted: '#9B8FAA',
  primary: '#F8F9ED',
  primaryHover: '#C5C8B8',
  primaryText: '#3A2650',
  danger: '#E57373',
  dangerBg: '#4A2040',
  warning: '#D4A56A',
  success: '#F8F9ED',
  ctaIcon: '⚡',
  ctaIconColor: '#3A2650',
}

export const THEMES: readonly ThemeTokens[] = [lightTheme, softJadeTheme, plumWineTheme]
