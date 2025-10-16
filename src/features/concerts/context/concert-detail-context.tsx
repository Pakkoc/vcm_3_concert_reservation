"use client";

import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { useConcertDetailQuery } from "@/features/concerts/hooks/useConcertDetailQuery";
import type { ConcertDetail } from "@/features/concerts/lib/dto";

type ConcertDetailState = {
  highlightedGradeId: string | null;
};

type ConcertDetailAction =
  | { type: "HIGHLIGHT_GRADE"; payload: { gradeId: string | null } }
  | { type: "CLEAR_GRADE" };

const initialState: ConcertDetailState = {
  highlightedGradeId: null,
};

const reducer = (
  state: ConcertDetailState,
  action: ConcertDetailAction,
): ConcertDetailState => {
  switch (action.type) {
    case "HIGHLIGHT_GRADE":
      return { ...state, highlightedGradeId: action.payload.gradeId };
    case "CLEAR_GRADE":
      return { ...state, highlightedGradeId: null };
    default:
      return state;
  }
};

type ConcertDetailContextValue = {
  highlightedGradeId: string | null;
  detailQuery: UseQueryResult<ConcertDetail, Error>;
  highlightGrade(gradeId: string | null): void;
  refetchDetail(): void;
};

const ConcertDetailContext = createContext<ConcertDetailContextValue | null>(
  null,
);

type ConcertDetailProviderProps = {
  concertId: string;
  children: ReactNode;
};

export const ConcertDetailProvider = ({
  concertId,
  children,
}: ConcertDetailProviderProps) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const detailQuery = useConcertDetailQuery(concertId);

  const value = useMemo<ConcertDetailContextValue>(() => {
    return {
      highlightedGradeId: state.highlightedGradeId,
      detailQuery,
      highlightGrade: (gradeId) =>
        dispatch({ type: "HIGHLIGHT_GRADE", payload: { gradeId } }),
      refetchDetail: () => {
        void detailQuery.refetch();
      },
    };
  }, [state.highlightedGradeId, detailQuery]);

  return (
    <ConcertDetailContext.Provider value={value}>
      {children}
    </ConcertDetailContext.Provider>
  );
};

export const useConcertDetailContext = () => {
  const value = useContext(ConcertDetailContext);

  if (!value) {
    throw new Error("ConcertDetailProvider가 필요합니다.");
  }

  return value;
};
