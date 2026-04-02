export interface ThemeTokens {
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
  readonly ctaBg: string
  readonly ctaBorder: string
}

export const lightTheme: ThemeTokens = {
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
  ctaBg: '#0D7A5F',
  ctaBorder: '#0D7A5F',
}

export const darkTheme: ThemeTokens = {
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
  ctaBg: 'transparent',
  ctaBorder: '#312F2C',
}
