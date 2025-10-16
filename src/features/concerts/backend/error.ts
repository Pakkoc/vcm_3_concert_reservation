export const concertErrorCodes = {
  invalidParams: "INVALID_CONCERT_PARAMS",
  concertNotFound: "CONCERT_NOT_FOUND",
  fetchFailed: "CONCERT_FETCH_FAILED",
  seatsFetchFailed: "SEATS_FETCH_FAILED",
  gradesFetchFailed: "GRADES_FETCH_FAILED",
} as const;

export type ConcertErrorCode =
  (typeof concertErrorCodes)[keyof typeof concertErrorCodes];
