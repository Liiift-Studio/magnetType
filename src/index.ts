// magnetType/src/index.ts — public API exports
export { startMagnetType, applyMagnetType, removeMagnetType, getCleanHTML } from './core/adjust'
export { useMagnetType } from './react/useMagnetType'
export { MagnetTypeText } from './react/MagnetTypeText'
export { MagnetChar } from './react/MagnetBlock'
/** @deprecated Use MagnetChar instead */
export { MagnetBlock } from './react/MagnetBlock'
export type { MagnetCharProps } from './react/MagnetBlock'
/** @deprecated Use MagnetCharProps instead */
export type { MagnetBlockProps } from './react/MagnetBlock'
export type { MagnetTypeOptions, MagnetTypeProps, ScopeType, FalloffType, MagnetModeType, MagnetTypeModeType } from './core/types'
export { MAGNET_TYPE_CLASSES } from './core/types'
