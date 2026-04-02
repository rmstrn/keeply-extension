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
  bg: '#222831',
  surface: '#393E46',
  elevated: '#393E46',
  border: '#393E46',
  hoverBg: '#948979',
  text: '#DFD0B8',
  text2: '#948979',
  textMuted: '#948979',
  primary: '#0D7A5F',
  primaryHover: '#393E46',
  primaryText: '#FFFFFF',
}
