export const holdErrorCodes = {
  invalidPayload: "INVALID_HOLD_PAYLOAD",
  seatNotFound: "HOLD_SEAT_NOT_FOUND",
  seatAlreadyReserved: "HOLD_SEAT_ALREADY_RESERVED",
  seatAlreadyHeld: "HOLD_SEAT_ALREADY_HELD",
  creationFailed: "HOLD_CREATION_FAILED",
  releaseFailed: "HOLD_RELEASE_FAILED",
  verificationFailed: "HOLD_VERIFICATION_FAILED",
} as const;

export type HoldErrorCode = (typeof holdErrorCodes)[keyof typeof holdErrorCodes];
