import {setFailed} from "@actions/core";
import {run} from "./run";

try {
  await run();
} catch (error) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
      ? error
      : `Unknown error: ${error?.toString?.()}`;
  setFailed(message);
}
