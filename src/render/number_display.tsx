import { formatQuantity } from "../bignum/format.js";
import type { JSX } from "solid-js";
import type { BigNum } from "../types/bignum.js";
import type { NumberFormat } from "../types/state.js";

type NumberDisplayProps = Readonly<{
  value: BigNum;
  format: NumberFormat;
  label: string;
  class?: string;
  /** A display-only unit vocabulary; callers keep resource and formatting ownership. */
  unitPresentation?: Readonly<{ singular: string; plural: string }>;
}>;

export function NumberDisplay(props: NumberDisplayProps): JSX.Element {
  const unit = (): Readonly<{ singular: string; plural: string }> =>
    props.unitPresentation ?? { singular: "cell", plural: "cells" };
  return (
    <output class={props.class} aria-label={props.label}>
      {formatQuantity(props.value, props.format, 2, unit().singular, unit().plural)}
    </output>
  );
}
