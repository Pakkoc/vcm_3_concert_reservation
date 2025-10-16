"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import {
  useSeatMapQuery,
} from "@/features/concerts/hooks/useSeatMapQuery";
import type {
  SeatMapResponse,
  SeatMapCell,
} from "@/features/concerts/lib/dto";
import {
  useHoldMutation,
} from "@/features/holds/hooks/useHoldMutation";
import {
  useCreateReservation,
} from "@/features/reservations/hooks/useCreateReservation";
import type { ReservationSummary } from "@/features/reservations/lib/dto";

type SelectedSeat = {
  seatId: string;
  zone: string;
  rowLabel: string;
  seatNumber: number;
  gradeId: string;
  gradeCode: string;
  price: number;
  holdToken: string;
  expiresAt: string;
};

type FormState = {
  reserverName: string;
  phoneNumber: string;
  pin4: string;
  errors: {
    reserverName: string | null;
    phoneNumber: string | null;
    pin4: string | null;
  };
  isValid: boolean;
};

type SubmitState = {
  submitting: boolean;
  error: string | null;
  result: ReservationSummary | null;
};

type ReservationSessionState = {
  selectedSeats: SelectedSeat[];
  selectionWarning: string | null;
  form: FormState;
  submit: SubmitState;
};

type ToggleSeatPayload = {
  seat: SeatMapCell;
  price: number;
};

type ReservationSessionAction =
  | { type: "ADD_SEAT"; payload: { seat: SelectedSeat } }
  | { type: "REMOVE_SEAT"; payload: { seatId: string } }
  | { type: "CLEAR_SELECTION" }
  | { type: "SET_WARNING"; payload: { message: string | null } }
  | { type: "APPLY_RESERVED_TRANSITION"; payload: { seatIds: string[]; message?: string } }
  | {
      type: "SET_FORM_FIELD";
      payload: { field: "reserverName" | "phoneNumber" | "pin4"; value: string };
    }
  | { type: "SUBMIT_START" }
  | { type: "SUBMIT_SUCCESS"; payload: { summary: ReservationSummary } }
  | { type: "SUBMIT_FAILURE"; payload: { error: string } };

const initialFormState: FormState = {
  reserverName: "",
  phoneNumber: "",
  pin4: "",
  errors: {
    reserverName: null,
    phoneNumber: null,
    pin4: null,
  },
  isValid: false,
};

const initialState: ReservationSessionState = {
  selectedSeats: [],
  selectionWarning: null,
  form: initialFormState,
  submit: {
    submitting: false,
    error: null,
    result: null,
  },
};

const validateFormState = (next: FormState): FormState => {
  const errors: FormState["errors"] = {
    reserverName: null,
    phoneNumber: null,
    pin4: null,
  };

  const name = next.reserverName.trim();
  if (name.length < 2 || name.length > 30) {
    errors.reserverName = "예약자 이름은 2~30자 사이여야 합니다.";
  }

  const phoneDigits = next.phoneNumber.replace(/[^0-9]/g, "");
  if (!/^\d{10,11}$/.test(phoneDigits)) {
    errors.phoneNumber = "휴대폰 번호는 숫자 10~11자리여야 합니다.";
  }

  const pinDigits = next.pin4.replace(/[^0-9]/g, "").slice(0, 4);
  if (pinDigits.length !== 4) {
    errors.pin4 = "비밀번호는 숫자 4자리여야 합니다.";
  }

  const isValid = Object.values(errors).every((error) => error === null);

  return {
    reserverName: next.reserverName,
    phoneNumber: phoneDigits,
    pin4: pinDigits,
    errors,
    isValid,
  };
};

const reservationSessionReducer = (
  state: ReservationSessionState,
  action: ReservationSessionAction,
): ReservationSessionState => {
  switch (action.type) {
    case "ADD_SEAT":
      return {
        ...state,
        selectionWarning: null,
        selectedSeats: [...state.selectedSeats, action.payload.seat],
      };
    case "REMOVE_SEAT":
      return {
        ...state,
        selectedSeats: state.selectedSeats.filter(
          (seat) => seat.seatId !== action.payload.seatId,
        ),
      };
    case "CLEAR_SELECTION":
      return {
        ...state,
        selectedSeats: [],
        selectionWarning: null,
      };
    case "SET_WARNING":
      return {
        ...state,
        selectionWarning: action.payload.message,
      };
    case "APPLY_RESERVED_TRANSITION": {
      if (action.payload.seatIds.length === 0) {
        return state;
      }

      return {
        ...state,
        selectionWarning:
          action.payload.message ?? "선택한 좌석 중 일부가 더 이상 예약할 수 없습니다.",
        selectedSeats: state.selectedSeats.filter(
          (seat) => !action.payload.seatIds.includes(seat.seatId),
        ),
      };
    }
    case "SET_FORM_FIELD": {
      const nextForm = validateFormState({
        ...state.form,
        [action.payload.field]: action.payload.value,
      } as FormState);

      return {
        ...state,
        form: nextForm,
      };
    }
    case "SUBMIT_START":
      return {
        ...state,
        submit: {
          submitting: true,
          error: null,
          result: null,
        },
      };
    case "SUBMIT_SUCCESS":
      return {
        ...state,
        submit: {
          submitting: false,
          error: null,
          result: action.payload.summary,
        },
        form: validateFormState(initialFormState),
      };
    case "SUBMIT_FAILURE":
      return {
        ...state,
        submit: {
          submitting: false,
          error: action.payload.error,
          result: null,
        },
      };
    default:
      return state;
  }
};

type ReservationSessionContextValue = {
  selectedSeats: SelectedSeat[];
  selectedCount: number;
  totalPrice: number;
  selectionWarning: string | null;
  seatMapQuery: UseQueryResult<SeatMapResponse, Error>;
  toggleSeat(payload: ToggleSeatPayload): Promise<void>;
  clearSelection(): Promise<void>;
  setSelectionWarning(message: string | null): void;
  applyReservedTransition(seatIds: string[], message?: string): void;
  setName(name: string): void;
  setPhone(phone: string): void;
  setPin4(pin4: string): void;
  form: FormState;
  canSubmit: boolean;
  submitState: SubmitState;
  submitReservation(): Promise<ReservationSummary | null>;
  refetchSeatMap(): void;
};

const ReservationSessionContext =
  createContext<ReservationSessionContextValue | null>(null);

type ReservationSessionProviderProps = {
  concertId: string;
  children: ReactNode;
};

export const ReservationSessionProvider = ({
  concertId,
  children,
}: ReservationSessionProviderProps) => {
  const [state, dispatch] = useReducer(reservationSessionReducer, initialState);
  const seatMapQuery = useSeatMapQuery(concertId);
  const { createHold, releaseHold } = useHoldMutation();
  const createReservationMutation = useCreateReservation();
  const latestSelectedSeatsRef = useRef<SelectedSeat[]>(state.selectedSeats);

  const sessionHint = useMemo(() => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `${concertId}-${Date.now()}`;
  }, [concertId]);

  const selectedSeatMap = useMemo(() => {
    const map = new Map<string, SelectedSeat>();
    state.selectedSeats.forEach((seat) => {
      map.set(seat.seatId, seat);
    });
    return map;
  }, [state.selectedSeats]);

  useEffect(() => {
    latestSelectedSeatsRef.current = state.selectedSeats;
  }, [state.selectedSeats]);

  useEffect(() => {
    return () => {
      const tokens = latestSelectedSeatsRef.current.map((seat) => seat.holdToken);
      if (tokens.length === 0) {
        return;
      }
      void Promise.allSettled(tokens.map((token) => releaseHold(token)));
    };
  }, [releaseHold]);

  const toggleSeat = useCallback(
    async ({ seat, price }: ToggleSeatPayload) => {
      const existing = selectedSeatMap.get(seat.seatId);

      if (existing) {
        try {
          await releaseHold(existing.holdToken);
        } catch (error) {
          console.error("Failed to release hold", error);
        } finally {
          dispatch({ type: "REMOVE_SEAT", payload: { seatId: seat.seatId } });
        }
        return;
      }

      if (state.selectedSeats.length >= 4) {
        dispatch({
          type: "SET_WARNING",
          payload: { message: "한 번에 최대 4개의 좌석까지 선택할 수 있습니다." },
        });
        return;
      }

      try {
        const hold = await createHold({
          seatId: seat.seatId,
          sessionHint,
        });

        dispatch({
          type: "ADD_SEAT",
          payload: {
            seat: {
              seatId: seat.seatId,
              zone: seat.zone,
              rowLabel: seat.rowLabel,
              seatNumber: seat.seatNumber,
              gradeId: seat.gradeId,
              gradeCode: seat.gradeCode,
              price,
              holdToken: hold.holdToken,
              expiresAt: hold.expiresAt,
            },
          },
        });
      } catch (error) {
        dispatch({
          type: "SET_WARNING",
          payload: {
            message:
              error instanceof Error
                ? error.message
                : "좌석을 선택하는 중 오류가 발생했습니다.",
          },
        });
      }
    },
    [createHold, releaseHold, selectedSeatMap, sessionHint, state.selectedSeats.length],
  );

  const clearSelection = useCallback(async () => {
    const tokens = state.selectedSeats.map((seat) => seat.holdToken);
    if (tokens.length > 0) {
      await Promise.allSettled(tokens.map((token) => releaseHold(token)));
    }
    dispatch({ type: "CLEAR_SELECTION" });
  }, [releaseHold, state.selectedSeats]);

  const setSelectionWarning = useCallback((message: string | null) => {
    dispatch({ type: "SET_WARNING", payload: { message } });
  }, []);

  const applyReservedTransition = useCallback(
    (seatIds: string[], message?: string) => {
      if (seatIds.length === 0) {
        return;
      }
      dispatch({
        type: "APPLY_RESERVED_TRANSITION",
        payload: { seatIds, message },
      });
    },
    [],
  );

  const setName = useCallback((name: string) => {
    dispatch({
      type: "SET_FORM_FIELD",
      payload: { field: "reserverName", value: name },
    });
  }, []);

  const setPhone = useCallback((phone: string) => {
    dispatch({
      type: "SET_FORM_FIELD",
      payload: { field: "phoneNumber", value: phone },
    });
  }, []);

  const setPin4 = useCallback((pin4: string) => {
    dispatch({
      type: "SET_FORM_FIELD",
      payload: { field: "pin4", value: pin4 },
    });
  }, []);

  const submitReservation = useCallback(async () => {
    if (!state.form.isValid) {
      dispatch({
        type: "SET_WARNING",
        payload: { message: "예약 정보를 다시 확인해주세요." },
      });
      return null;
    }

    if (state.selectedSeats.length === 0) {
      dispatch({
        type: "SET_WARNING",
        payload: { message: "좌석을 한 개 이상 선택해주세요." },
      });
      return null;
    }

    dispatch({ type: "SUBMIT_START" });

    try {
      const summary = await createReservationMutation.mutateAsync({
        concertId,
        reserverName: state.form.reserverName.trim(),
        phoneNumber: state.form.phoneNumber,
        password: state.form.pin4,
        selections: state.selectedSeats.map((seat) => ({
          seatId: seat.seatId,
          holdToken: seat.holdToken,
        })),
      });

      dispatch({ type: "SUBMIT_SUCCESS", payload: { summary } });
      dispatch({ type: "CLEAR_SELECTION" });
      void seatMapQuery.refetch();
      return summary;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "예약을 완료하는 중 오류가 발생했습니다.";
      dispatch({ type: "SUBMIT_FAILURE", payload: { error: message } });
      return null;
    }
  }, [
    concertId,
    createReservationMutation,
    seatMapQuery,
    state.form.isValid,
    state.form.phoneNumber,
    state.form.pin4,
    state.form.reserverName,
    state.selectedSeats,
  ]);

  const value = useMemo<ReservationSessionContextValue>(() => {
    const totalPrice = state.selectedSeats.reduce(
      (sum, seat) => sum + seat.price,
      0,
    );

    return {
      selectedSeats: state.selectedSeats,
      selectedCount: state.selectedSeats.length,
      totalPrice,
      selectionWarning: state.selectionWarning,
      seatMapQuery,
      toggleSeat,
      clearSelection,
      setSelectionWarning,
      applyReservedTransition,
      setName,
      setPhone,
      setPin4,
      form: state.form,
      canSubmit:
        state.form.isValid &&
        state.selectedSeats.length > 0 &&
        !state.submit.submitting,
      submitState: state.submit,
      submitReservation,
      refetchSeatMap: () => {
        void seatMapQuery.refetch();
      },
    };
  }, [
    applyReservedTransition,
    clearSelection,
    seatMapQuery,
    setName,
    setPhone,
    setPin4,
    setSelectionWarning,
    state.form,
    state.selectedSeats,
    state.selectionWarning,
    state.submit,
    submitReservation,
    toggleSeat,
  ]);

  return (
    <ReservationSessionContext.Provider value={value}>
      {children}
    </ReservationSessionContext.Provider>
  );
};

export const useReservationSessionContext = () => {
  const value = useContext(ReservationSessionContext);

  if (!value) {
    throw new Error("ReservationSessionProvider가 필요합니다.");
  }

  return value;
};
