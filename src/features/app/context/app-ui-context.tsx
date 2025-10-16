"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";

type AppUiState = {
  currentConcertId: string | null;
  globalLoadingCount: number;
  globalErrorQueue: string[];
};

type AppUiAction =
  | { type: "SET_CURRENT_CONCERT"; payload: { concertId: string | null } }
  | { type: "REQUEST_STARTED" }
  | { type: "REQUEST_FINISHED" }
  | { type: "PUSH_ERROR"; payload: { message: string } }
  | { type: "CLEAR_ERROR"; payload: { index?: number } };

const initialState: AppUiState = {
  currentConcertId: null,
  globalLoadingCount: 0,
  globalErrorQueue: [],
};

const AppUiContext = createContext<AppUiContextValue | null>(null);

const appUiReducer = (state: AppUiState, action: AppUiAction): AppUiState => {
  switch (action.type) {
    case "SET_CURRENT_CONCERT":
      return {
        ...state,
        currentConcertId: action.payload.concertId,
      };
    case "REQUEST_STARTED":
      return {
        ...state,
        globalLoadingCount: state.globalLoadingCount + 1,
      };
    case "REQUEST_FINISHED":
      return {
        ...state,
        globalLoadingCount: Math.max(state.globalLoadingCount - 1, 0),
      };
    case "PUSH_ERROR":
      return {
        ...state,
        globalErrorQueue: [...state.globalErrorQueue, action.payload.message],
      };
    case "CLEAR_ERROR": {
      if (state.globalErrorQueue.length === 0) {
        return state;
      }

      if (
        action.payload.index === undefined ||
        action.payload.index < 0 ||
        action.payload.index >= state.globalErrorQueue.length
      ) {
        return {
          ...state,
          globalErrorQueue: [],
        };
      }

      return {
        ...state,
        globalErrorQueue: state.globalErrorQueue.filter(
          (_, idx) => idx !== action.payload.index,
        ),
      };
    }
    default:
      return state;
  }
};

export type AppUiContextValue = {
  state: AppUiState;
  isGlobalLoading: boolean;
  setCurrentConcert(concertId: string | null): void;
  markRequestStarted(): void;
  markRequestFinished(): void;
  pushError(message: string): void;
  clearError(index?: number): void;
};

type AppUiProviderProps = {
  children: ReactNode;
};

export const AppUiProvider = ({ children }: AppUiProviderProps) => {
  const [state, dispatch] = useReducer(appUiReducer, initialState);

  const setCurrentConcert = useCallback((concertId: string | null) => {
    dispatch({ type: "SET_CURRENT_CONCERT", payload: { concertId } });
  }, []);

  const markRequestStarted = useCallback(() => {
    dispatch({ type: "REQUEST_STARTED" });
  }, []);

  const markRequestFinished = useCallback(() => {
    dispatch({ type: "REQUEST_FINISHED" });
  }, []);

  const pushError = useCallback((message: string) => {
    if (!message) {
      return;
    }

    dispatch({ type: "PUSH_ERROR", payload: { message } });
  }, []);

  const clearError = useCallback((index?: number) => {
    dispatch({ type: "CLEAR_ERROR", payload: { index } });
  }, []);

  const value = useMemo<AppUiContextValue>(() => {
    return {
      state,
      isGlobalLoading: state.globalLoadingCount > 0,
      setCurrentConcert,
      markRequestStarted,
      markRequestFinished,
      pushError,
      clearError,
    };
  }, [
    state,
    setCurrentConcert,
    markRequestStarted,
    markRequestFinished,
    pushError,
    clearError,
  ]);

  return <AppUiContext.Provider value={value}>{children}</AppUiContext.Provider>;
};

export const useAppUiContext = () => {
  const value = useContext(AppUiContext);

  if (!value) {
    throw new Error("AppUiProvider가 트리 상단에 필요합니다.");
  }

  return value;
};
