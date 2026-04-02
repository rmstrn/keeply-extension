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
  readonly dangerBg: string
  readonly dangerText: string
  readonly warnText: string
  readonly errorText: string
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
  dangerBg: '#FFE4E6',
  dangerText: '#DC2626',
  warnText: '#B45309',
  errorText: '#C0392B',
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
  dangerBg: '#2A1515',
  dangerText: '#E24B4A',
  warnText: '#B45309',
  errorText: '#C0392B',
}
