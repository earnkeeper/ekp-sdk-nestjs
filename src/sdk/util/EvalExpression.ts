export interface EvalExpression {
  readonly _expression: string;
  readonly scope: Record<string, string>;
}
