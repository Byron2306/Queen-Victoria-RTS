export interface FitAspectInsideInput {
  sourceWidth: number;
  sourceHeight: number;
  maxWidth: number;
  maxHeight: number;
}

export interface FitAspectInsideResult {
  width: number;
  height: number;
}

export function fitAspectInside(
  input: FitAspectInsideInput,
): FitAspectInsideResult {
  const sourceWidth =
    Math.max(1, input.sourceWidth);

  const sourceHeight =
    Math.max(1, input.sourceHeight);

  const maxWidth =
    Math.max(0, input.maxWidth);

  const maxHeight =
    Math.max(0, input.maxHeight);

  const scale =
    Math.min(
      maxWidth / sourceWidth,
      maxHeight / sourceHeight,
    );

  return {
    width:
      sourceWidth *
      Math.max(0, scale),

    height:
      sourceHeight *
      Math.max(0, scale),
  };
}
