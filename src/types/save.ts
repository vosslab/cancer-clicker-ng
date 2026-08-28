export type SerializedGameState = Readonly<Record<string, unknown>>;

/** The only envelope shape produced by the current serializer. */
export type CurrentSaveFileV2 = Readonly<{
  version: 2;
  savedAtMs: number;
  progressionVersion: 5;
  state: SerializedGameState;
}>;
/** The sole notice vocabulary shared by the parser, storage boundary, and recovery UI. */
export type SaveNotice = Readonly<{
  code: "field-defaulted" | "storage-error" | "save-rejected";
  field: string;
  message: string;
}>;

const CURRENT_P5_PROBE = {
  version: 2,
  savedAtMs: 0,
  progressionVersion: 5,
  state: {},
} satisfies CurrentSaveFileV2;
// @ts-expect-error Current writers cannot emit a legacy progression version.
const _LEGACY_WRITER_PROBE: CurrentSaveFileV2 = { ...CURRENT_P5_PROBE, progressionVersion: 3 };
// @ts-expect-error Current writers cannot emit a future progression version.
const _FUTURE_WRITER_PROBE: CurrentSaveFileV2 = { ...CURRENT_P5_PROBE, progressionVersion: 6 };
