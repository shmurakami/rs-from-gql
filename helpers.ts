/**
 * Convert field value from lowerCameCase(GraphQL Schema style) to snake_case(Rust style)
 * @param str string
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Convert Enum value from SCREAMING_SNAKE_CASE(GraphQL Schema style) to UpperCamelCase(Rust style)
 * @param str string
 */
export function screamingSnakeToUpperCame(str: string) {
  // add _ to first letter to convert upper case
  return `_${str}`.toLocaleLowerCase()
    .replace(/_[a-z]/g, letters => letters[1].toUpperCase());
}

