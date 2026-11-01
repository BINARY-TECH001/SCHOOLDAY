/**
 * Re-export design system primitives from dedicated atomic modules.
 * This file maintains 100% backward compatibility for all existing screen imports.
 */

export * from "./ui/index";
export { colors, fonts, shadows, radii, spacing } from "../theme/tokens";
export { money } from "../domain/model";
