"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import {
  useReservationLookup,
} from "@/features/reservations/hooks/useReservationLookup";
import type {
  ReservationSummary,
} from "@/features/reservations/lib/dto";

type ReservationLookupState = {
  phone: string;
  pin4: string;
  loading: boolean;
  error: string | null;
  result: ReservationSummary[] | null;
};

type ReservationLookupAction =
  | { type: "SET_PHONE"; payload: { phone: string } }
  | { type: "SET_PIN4"; payload: { pin4: string } }
  | { type: "LOOKUP_START" }
  | { type: "LOOKUP_SUCCESS"; payload: { reservations: ReservationSummary[] } }
  | { type: "LOOKUP_FAILURE"; payload: { error: string } };

const initialState: ReservationLookupState = {
  phone: "",
  pin4: "",
  loading: false,
  error: null,
  result: null,
};

const sanitizePhone = (value: string) => value.replace(/[^0-9]/g, "");
const sanitizePin = (value: string) =>
  value.replace(/[^0-9]/g, "").slice(0, 4);

const reducer = (
  state: ReservationLookupState,
  action: ReservationLookupAction,
): ReservationLookupState => {
  switch (action.type) {
    case "SET_PHONE": {
      const phone = sanitizePhone(action.payload.phone);
      return {
        ...state,
        phone,
      };
    }
    case "SET_PIN4":
      return {
        ...state,
        pin4: sanitizePin(action.payload.pin4),
      };
    case "LOOKUP_START":
      return {
        ...state,
        loading: true,
        error: null,
      };
    case "LOOKUP_SUCCESS":
      return {
        ...state,
        loading: false,
        error: null,
        result: action.payload.reservations,
      };
    case "LOOKUP_FAILURE":
      return {
        ...state,
        loading: false,
        error: action.payload.error,
        result: null,
      };
    default:
      return state;
  }
};

type ReservationLookupContextValue = {
  state: ReservationLookupState;
  setPhone(phone: string): void;
  setPin4(pin4: string): void;
  lookup(): Promise<void>;
};

const ReservationLookupContext =
  createContext<ReservationLookupContextValue | null>(null);

type ReservationLookupProviderProps = {
  children: ReactNode;
};

export const ReservationLookupProvider = ({
  children,
}: ReservationLookupProviderProps) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const lookupMutation = useReservationLookup();

  const lookup = useCallback(async () => {
    const phone = sanitizePhone(state.phone);

    if (!/^\d{10,11}$/.test(phone)) {
      dispatch({
        type: "LOOKUP_FAILURE",
        payload: { error: "휴대폰 번호를 10~11자리 숫자로 입력해주세요." },
      });
      return;
    }

    if (state.pin4.length !== 4) {
      dispatch({
        type: "LOOKUP_FAILURE",
        payload: { error: "비밀번호는 숫자 4자리여야 합니다." },
      });
      return;
    }

    dispatch({ type: "LOOKUP_START" });

    try {
      const response = await lookupMutation.mutateAsync({
        phoneNumber: phone,
        password: state.pin4,
      });
      dispatch({
        type: "LOOKUP_SUCCESS",
        payload: { reservations: response.reservations },
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "예약을 조회하는 중 문제가 발생했습니다.";
      dispatch({ type: "LOOKUP_FAILURE", payload: { error: message } });
    }
  }, [lookupMutation, state.phone, state.pin4]);

  const value = useMemo<ReservationLookupContextValue>(() => {
    return {
      state,
      setPhone: (phone) =>
        dispatch({ type: "SET_PHONE", payload: { phone } }),
      setPin4: (pin4) =>
        dispatch({ type: "SET_PIN4", payload: { pin4 } }),
      lookup,
    };
  }, [lookup, state]);

  return (
    <ReservationLookupContext.Provider value={value}>
      {children}
    </ReservationLookupContext.Provider>
  );
};

export const useReservationLookupContext = () => {
  const value = useContext(ReservationLookupContext);

  if (!value) {
    throw new Error("ReservationLookupProvider가 필요합니다.");
  }

  return value;
};
