"use client";

import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import {
  useConcertListQuery,
} from "@/features/concerts/hooks/useConcertListQuery";
import type {
  ConcertListQueryInput,
} from "@/features/concerts/lib/dto";
import type { UseQueryResult } from "@tanstack/react-query";

type ConcertListFilterState = ConcertListQueryInput;

type ConcertListAction =
  | { type: "SET_SORT_BY"; payload: { sortBy: ConcertListQueryInput["sortBy"] } }
  | {
      type: "SET_SORT_ORDER";
      payload: { sortOrder: ConcertListQueryInput["sortOrder"] };
    };

const initialState: ConcertListFilterState = {
  sortBy: "eventAt",
  sortOrder: "asc",
};

type ConcertListContextValue = {
  filter: ConcertListFilterState;
  listQuery: UseQueryResult<
    import("@/features/concerts/lib/dto").ConcertListResponse,
    Error
  >;
  setSortBy(sortBy: ConcertListQueryInput["sortBy"]): void;
  setSortOrder(sortOrder: ConcertListQueryInput["sortOrder"]): void;
  refetchList(): void;
};

const ConcertListContext = createContext<ConcertListContextValue | null>(null);

const reducer = (
  state: ConcertListFilterState,
  action: ConcertListAction,
): ConcertListFilterState => {
  switch (action.type) {
    case "SET_SORT_BY":
      return {
        ...state,
        sortBy: action.payload.sortBy,
      };
    case "SET_SORT_ORDER":
      return {
        ...state,
        sortOrder: action.payload.sortOrder,
      };
    default:
      return state;
  }
};

type ConcertListProviderProps = {
  children: ReactNode;
};

export const ConcertListProvider = ({ children }: ConcertListProviderProps) => {
  const [filter, dispatch] = useReducer(reducer, initialState);
  const listQuery = useConcertListQuery(filter);

  const value = useMemo<ConcertListContextValue>(() => {
    return {
      filter,
      listQuery,
      setSortBy: (sortBy) => dispatch({ type: "SET_SORT_BY", payload: { sortBy } }),
      setSortOrder: (sortOrder) =>
        dispatch({ type: "SET_SORT_ORDER", payload: { sortOrder } }),
      refetchList: () => {
        void listQuery.refetch();
      },
    };
  }, [filter, listQuery]);

  return (
    <ConcertListContext.Provider value={value}>
      {children}
    </ConcertListContext.Provider>
  );
};

export const useConcertListContext = () => {
  const value = useContext(ConcertListContext);

  if (!value) {
    throw new Error("ConcertListProvider가 필요합니다.");
  }

  return value;
};
