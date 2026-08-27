/** Primitive on-disk representation; BigNums are rehydrated only by the trusted parser. */
export type SerializedBigNum = Readonly<{ mantissa: number; exponent: number }>;
export type SerializedGameState = Readonly<Record<string, unknown>>;

/** Captured M1-era schema supported only through the explicit V1 to V2 migration. */
export type SaveFileV1 = Readonly<{
  version: 1;
  savedAtMs: number;
  state: Readonly<{
    cells: SerializedBigNum;
    atp: SerializedBigNum;
    stageId: string;
    eventSequence: number;
  }>;
}>;
export type SaveFileV2 = Readonly<{
  version: 2;
  savedAtMs: number;
  progressionVersion: number;
  state: SerializedGameState;
}>;
export type SaveVersion = SaveFileV1["version"] | SaveFileV2["version"];
export type SaveFile = SaveFileV1 | SaveFileV2;
export type SaveMigration = (save: SaveFileV1) => SaveFileV2;
