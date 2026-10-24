import { isUpcomingBakeDay } from "./dates";
import { isValidPkMobile } from "./format";
import { itemCount } from "./cart";
import type { Draft, FieldErrors } from "../types";

export function validateStep(step: number, draft: Draft): FieldErrors {
  if (step === 1) {
    if (!draft.date || !isUpcomingBakeDay(draft.date)) {
      return { date: "Choose a bake date to continue." };
    }
  }

  if (step === 2 && itemCount(draft.quantities) === 0) {
    return { items: "Add at least one treat to continue." };
  }

  if (step === 3) {
    const errors: FieldErrors = {};
    if (draft.name.trim().length < 2) {
      errors.name = "Add your name.";
    }
    if (!isValidPkMobile(draft.phone)) {
      errors.phone = "Enter a mobile number, like 03XX XXXXXXX.";
    }
    if (draft.area.trim().length < 2) {
      errors.area = "Add the area in Sheikhupura.";
    }
    if (draft.address.trim().length < 5) {
      errors.address = "Add the house and street.";
    }
    if (!draft.withinCity) {
      errors.withinCity = "Please confirm this address is within Sheikhupura city.";
    }
    return errors;
  }

  return {};
}

export function firstIncompleteStep(draft: Draft): number {
  for (let step = 1; step <= 3; step += 1) {
    if (Object.keys(validateStep(step, draft)).length > 0) return step;
  }
  return 4;
}
