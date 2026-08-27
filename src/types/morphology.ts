/**
 * The deliberately provisional state-to-art contract. M16 specifies combination
 * semantics and biological ranges before any SVG drawing code consumes it.
 */
export type MorphologyParams = Readonly<{
  elongation: number;
  asymmetry: number;
  nuclearToCytoplasmicRatio: number;
  nuclearEccentricity: number;
  membraneWaviness: number;
  polarity: number;
  mitoticState: "quiescent" | "dividing" | "abnormal";
  heterogeneity: number;
  depthStratum: "surface" | "middle" | "deep";
  tissueDisorganization: number;
  invasion: number;
  necrosis: number;
  dissemination: number;
}>;
