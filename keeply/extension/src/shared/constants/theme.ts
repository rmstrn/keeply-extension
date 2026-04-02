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
}

export const darkTheme: ThemeTokens = {
  bg: '#091413',
  surface: '#285A48',
  elevated: '#408A71',
  border: '#285A48',
  hoverBg: '#408A71',
  text: '#F0F0EF',
  text2: '#CCCCCC',
  textMuted: '#B0E4CC',
  primary: '#0D7A5F',
  primaryHover: '#408A71',
  primaryText: '#FFFFFF',
}
