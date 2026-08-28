import { formatQuantity } from "../bignum/format.js";
import type { JSX } from "solid-js";
import type { BigNum } from "../types/bignum.js";
import type { NumberFormat } from "../types/state.js";

type NumberDisplayProps = Readonly<{
  value: BigNum;
  format: NumberFormat;
  label: string;
  class?: string;
}>;

export function NumberDisplay(props: NumberDisplayProps): JSX.Element {
  return (
    <output class={props.class} aria-label={props.label}>
      {formatQuantity(props.value, props.format, 2, "cell", "cells")}
    </output>
  );
}
