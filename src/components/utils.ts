export type ClassName = string | false | void | null | 0;
export function cx(...classNames: ClassName[]): string {
  return classNames.filter(Boolean).join(" ");
}
