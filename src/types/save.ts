export type SerializedGameState = Readonly<Record<string, unknown>>;

/** The only save envelope accepted and produced during pre-production. */
export type CurrentSaveFile = Readonly<{
  version: 2;
  savedAtMs: number;
  stateSchemaVersion: 8;
  state: SerializedGameState;
}>;

/** The sole notice vocabulary shared by the parser, storage boundary, and recovery UI. */
export type SaveNotice = Readonly<{
  code: "storage-error" | "save-rejected";
  field: string;
  message: string;
}>;
