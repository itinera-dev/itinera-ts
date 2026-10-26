import type { JourneyAbort, Requester } from "itinera/event";

function who(requester: Requester): string {
  switch (requester.kind) {
    case "step":
      return "the step";
    case "adapter":
      return `the adapter ${requester.adapter}`;
    case "step hook":
    case "workflow hook":
      return `${requester.policy}, ${requester.hook}`;
    case "provider":
      return `the provider ${requester.provider}`;
  }
}

export function describe(abort: JourneyAbort): string {
  if (abort.reason === "wrong type") {
    return `${abort.key}, requested by ${who(abort.requester)}, has the wrong type`;
  }
  if (
    abort.reason === "required data missing" &&
    abort.missing.kind === "key"
  ) {
    return `${abort.missing.key} is missing for ${who(abort.missing.requester)}`;
  }
  if (abort.reason === "not a value") {
    return abort.key === undefined
      ? `the data of ${abort.eventKind ?? "a reason"} is not a value`
      : `${abort.key} is not a value`;
  }
  if (
    abort.reason === "step could not be built" &&
    abort.source.kind === "adapter"
  ) {
    return `${abort.step} could not be built: ${abort.source.adapter} failed for ${abort.source.key}`;
  }
  if (abort.reason === "hook failed" || abort.reason === "reporter failed") {
    return `${abort.reason}: ${abort.errorMessage}`;
  }
  return abort.step === undefined
    ? abort.reason
    : `${abort.reason} during ${abort.step}`;
}
