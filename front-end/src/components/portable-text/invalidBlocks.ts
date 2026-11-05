import { createContext } from "react";

// Block _key → the message shown under it in the editor.
export const InvalidBlocksContext = createContext<ReadonlyMap<string, string>>(new Map());
