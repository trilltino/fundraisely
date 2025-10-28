/**
 * Conditional Class Name Utility (cn)
 *
 * **Purpose:**
 * A lightweight utility for conditionally combining CSS class names. Filters out falsy values
 * (false, undefined, empty strings) and joins the remaining class names with spaces. Common
 * pattern in React for dynamic className construction.
 *
 * **Why This Exists:**
 * Simplifies conditional styling without verbose ternaries or template literals. Makes component
 * code cleaner and more readable when applying conditional classes.
 *
 * **Arguments:**
 * - `...classes`: Rest parameter accepting any number of class names or conditional expressions
 *   - `string`: Class name to include
 *   - `boolean`: Filtered out (useful for conditional logic)
 *   - `undefined`: Filtered out (safe for optional classes)
 *
 * **Return Value:**
 * - `string`: Space-separated class names with all falsy values removed
 *
 * **Common Patterns:**
 *
 * **Pattern 1: Conditional Classes**
 * ```typescript
 * <button className={cn(
 *   'btn',
 *   isActive && 'btn-active',
 *   isDisabled && 'btn-disabled'
 * )}>
 * // Result: "btn btn-active" (if isActive=true, isDisabled=false)
 * ```
 *
 * **Pattern 2: Optional Classes**
 * ```typescript
 * <div className={cn('card', size === 'large' && 'card-lg', className)}>
 * // Supports optional className prop from parent
 * ```
 *
 * **Pattern 3: Multiple Conditions**
 * ```typescript
 * <div className={cn(
 *   'player-card',
 *   player.isHost && 'host-badge',
 *   player.isReady && 'ready-state',
 *   player.id === currentUser && 'highlight'
 * )}>
 * ```
 *
 * **vs. Traditional Approaches:**
 *
 * **Without cn (verbose):**
 * ```typescript
 * className={`btn ${isActive ? 'btn-active' : ''} ${isDisabled ? 'btn-disabled' : ''}`}
 * ```
 *
 * **With cn (clean):**
 * ```typescript
 * className={cn('btn', isActive && 'btn-active', isDisabled && 'btn-disabled')}
 * ```
 *
 * **Alternative Libraries:**
 * - `classnames` (npm): More features but heavier (5KB)
 * - `clsx` (npm): Similar API, optimized (200B)
 * - This implementation: Zero dependencies, 1-liner, TypeScript-native
 *
 * **Type Safety:**
 * Accepts `string | boolean | undefined` to support:
 * - Direct strings: `'my-class'`
 * - Conditionals: `condition && 'class'` (boolean && string)
 * - Optional props: `className?` (string | undefined)
 */
export function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}