import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { Plan, UIState, ExecutionStep, UserIntent, ExtraService, ChatMessage, ApiConfig, Recommendation, UserProfile, UserLocation, MapConfig, UserAuthState, User, Friend } from '../types';
import { supabase, getUserProfile, getFriends, mapSupabaseUser } from '../services/supabase';

interface AppState {
  uiState: UIState;
  plan: Plan | null;
  intent: UserIntent | null;
  inputText: string;
  isLoading: boolean;
  executionSteps: ExecutionStep[];
  executionComplete: boolean;
  executionSuccess: boolean;
  extraService: ExtraService | null;
  error: string | null;
  position: { x: number; y: number };
  chatHistory: ChatMessage[];
  apiConfig: ApiConfig;
  recommendations: Recommendation[] | null;
  showRecommendations: boolean;
  userProfile: UserProfile;
  location: UserLocation;
  mapConfig: MapConfig;
  voiceInputText: string;
  userAuth: UserAuthState;
}

type AppAction =
  | { type: 'SET_UI_STATE'; payload: UIState }
  | { type: 'SET_PLAN'; payload: Plan | null }
  | { type: 'SET_INTENT'; payload: UserIntent | null }
  | { type: 'SET_INPUT_TEXT'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_EXECUTION_STEPS'; payload: ExecutionStep[] }
  | { type: 'SET_EXECUTION_COMPLETE'; payload: { complete: boolean; success: boolean } }
  | { type: 'SET_EXTRA_SERVICE'; payload: ExtraService | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_POSITION'; payload: { x: number; y: number } }
  | { type: 'UPDATE_PLAN_NODE'; payload: { nodeType: 'activity' | 'restaurant'; node: Plan['activity'] | Plan['restaurant'] } }
  | { type: 'RESET_EXECUTION' }
  | { type: 'RESET_ALL' }
  | { type: 'ADD_CHAT_MESSAGE'; payload: ChatMessage }
  | { type: 'CLEAR_CHAT' }
  | { type: 'SET_API_CONFIG'; payload: ApiConfig }
  | { type: 'SET_RECOMMENDATIONS'; payload: Recommendation[] | null }
  | { type: 'SET_SHOW_RECOMMENDATIONS'; payload: boolean }
  | { type: 'SET_USER_PROFILE'; payload: UserProfile }
  | { type: 'SET_LOCATION'; payload: UserLocation }
  | { type: 'SET_MAP_CONFIG'; payload: MapConfig }
  | { type: 'SET_VOICE_INPUT_TEXT'; payload: string }
  | { type: 'LOGIN'; payload: { user: User; token: string | null } }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  | { type: 'SET_FRIENDS'; payload: Friend[] }
  | { type: 'ADD_FRIEND'; payload: Friend }
  | { type: 'REMOVE_FRIEND'; payload: string }
  | { type: 'SET_INVITE_COUNT'; payload: number }
  | { type: 'SET_FREE_API_QUOTA'; payload: number };

const initialState: AppState = {
  uiState: 'compact',
  plan: null,
  intent: null,
  inputText: '',
  isLoading: false,
  executionSteps: [],
  executionComplete: false,
  executionSuccess: false,
  extraService: null,
  error: null,
  position: { x: typeof window !== 'undefined' ? window.innerWidth - 280 : 100, y: typeof window !== 'undefined' ? window.innerHeight - 80 : 100 },
  chatHistory: [],
  apiConfig: {
    key: (import.meta.env?.VITE_LLM_KEY as string) || '13kNDHWQp9rtxB1zOMDKDOn1z6egMVNq2oez2yly8TL4oWN8XVYU00Cj0QsASRID7',
    baseUrl: (import.meta.env?.VITE_LLM_BASE_URL as string) || 'https://api.stepfun.com/step_plan/v1',
    model: (import.meta.env?.VITE_LLM_MODEL as string) || 'step-3.5-flash-2603',
    enabled: true,
  },
  recommendations: null,
  showRecommendations: false,
  userProfile: {
    interests: [],
    mood: null,
    budgetPreference: 'medium',
  },
  location: {
    lat: 32.0603,
    lng: 118.7969,
    city: '南京',
    district: '',
    address: '南京市',
    loaded: false,
  },
  mapConfig: {
    amapKey: '6d9e0e46ad1d9b806aa0dc557804fd2a',
    useRealMap: true,
  },
  voiceInputText: '',
  userAuth: {
    isLoggedIn: true,  // 默认已登录（访客模式）
    user: {
      id: 'guest-user-' + Date.now(),
      username: 'guest',
      email: 'guest@example.com',
      displayName: '访客用户',
      avatar: undefined,
      phone: undefined,
      bio: undefined,
      createdAt: Date.now(),
    },
    token: 'guest-token',
    friends: [],
    inviteCode: 'GUEST001',
    inviteCount: 0,
    freeApiQuota: 1000,  // 访客模式提供 1000 次免费额度
  },
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_UI_STATE':
      return { ...state, uiState: action.payload };
    case 'SET_PLAN':
      return { ...state, plan: action.payload };
    case 'SET_INTENT':
      return { ...state, intent: action.payload };
    case 'SET_INPUT_TEXT':
      return { ...state, inputText: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_EXECUTION_STEPS':
      return { ...state, executionSteps: action.payload };
    case 'SET_EXECUTION_COMPLETE':
      return {
        ...state,
        executionComplete: action.payload.complete,
        executionSuccess: action.payload.success,
      };
    case 'SET_EXTRA_SERVICE':
      return { ...state, extraService: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_POSITION':
      return { ...state, position: action.payload };
    case 'UPDATE_PLAN_NODE': {
      if (!state.plan) return state;
      const people = state.intent?.people || 1;
      const extraCost = state.plan.extra?.free
        ? 0
        : (state.plan.extra?.pricePerPerson || 0) * people;
      if (action.payload.nodeType === 'activity') {
        const node = action.payload.node as Plan['activity'];
        return {
          ...state,
          plan: {
            ...state.plan,
            activity: node,
            totalBudget: node.pricePerPerson * people + state.plan.restaurant.avgCostPerPerson * people + extraCost,
          },
        };
      } else {
        const node = action.payload.node as Plan['restaurant'];
        return {
          ...state,
          plan: {
            ...state.plan,
            restaurant: node,
            totalBudget: state.plan.activity.pricePerPerson * people + node.avgCostPerPerson * people + extraCost,
          },
        };
      }
    }
    case 'RESET_EXECUTION':
      return {
        ...state,
        executionSteps: [],
        executionComplete: false,
        executionSuccess: false,
      };
    case 'RESET_ALL':
      return { ...initialState, position: state.position, chatHistory: state.chatHistory, userProfile: state.userProfile };
    case 'ADD_CHAT_MESSAGE':
      return { ...state, chatHistory: [...state.chatHistory, action.payload] };
    case 'CLEAR_CHAT':
      return { ...state, chatHistory: [] };
    case 'SET_API_CONFIG':
      return { ...state, apiConfig: action.payload };
    case 'SET_RECOMMENDATIONS':
      return { ...state, recommendations: action.payload };
    case 'SET_SHOW_RECOMMENDATIONS':
      return { ...state, showRecommendations: action.payload };
    case 'SET_USER_PROFILE':
      return { ...state, userProfile: action.payload };
    case 'SET_LOCATION':
      return { ...state, location: action.payload };
    case 'SET_MAP_CONFIG':
      return { ...state, mapConfig: action.payload };
    case 'SET_VOICE_INPUT_TEXT':
      return { ...state, voiceInputText: action.payload };
    case 'LOGIN':
      return {
        ...state,
        userAuth: {
          ...state.userAuth,
          isLoggedIn: true,
          user: action.payload.user,
          token: action.payload.token,
          inviteCode: action.payload.user.id.slice(0, 8).toUpperCase(),
        },
      };
    case 'LOGOUT':
      return {
        ...state,
        userAuth: {
          isLoggedIn: false,
          user: null,
          token: null,
          friends: [],
          inviteCode: '',
          inviteCount: 0,
          freeApiQuota: 0,
        },
      };
    case 'UPDATE_USER':
      return {
        ...state,
        userAuth: {
          ...state.userAuth,
          user: state.userAuth.user ? { ...state.userAuth.user, ...action.payload } : null,
        },
      };
    case 'SET_FRIENDS':
      return {
        ...state,
        userAuth: { ...state.userAuth, friends: action.payload },
      };
    case 'ADD_FRIEND':
      return {
        ...state,
        userAuth: { ...state.userAuth, friends: [...state.userAuth.friends, action.payload] },
      };
    case 'REMOVE_FRIEND':
      return {
        ...state,
        userAuth: {
          ...state.userAuth,
          friends: state.userAuth.friends.filter(f => f.id !== action.payload),
        },
      };
    case 'SET_INVITE_COUNT':
      return {
        ...state,
        userAuth: { ...state.userAuth, inviteCount: action.payload },
      };
    case 'SET_FREE_API_QUOTA':
      return {
        ...state,
        userAuth: { ...state.userAuth, freeApiQuota: action.payload },
      };
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  expandIsland: () => void;
  collapseIsland: () => void;
  showVoiceInput: () => void;
  hideVoiceInput: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    let isMounted = true
    let subscription: { unsubscribe: () => void } | null = null

    async function loadSession() {
      try {
        const { data } = await supabase.auth.getSession()
        const session = data.session
        console.log('[AppContext] loadSession:', { hasSession: !!session, userId: session?.user?.id })
        if (!isMounted) return
        if (session?.user) {
          const profileResult = await getUserProfile(session.user.id)
          console.log('[AppContext] getUserProfile:', { ok: !profileResult.error, error: profileResult.error?.message })
          const profile = profileResult.data || undefined
          dispatch({ type: 'LOGIN', payload: { user: mapSupabaseUser(session.user, profile), token: session.access_token || null } })
          if (profile?.invite_count !== undefined) {
            dispatch({ type: 'SET_INVITE_COUNT', payload: profile.invite_count })
          }
          if (profile?.free_api_quota !== undefined) {
            dispatch({ type: 'SET_FREE_API_QUOTA', payload: profile.free_api_quota })
          }
          try {
            const friendsResult = await getFriends(session.user.id)
            console.log('[AppContext] getFriends:', { ok: !!friendsResult.data, error: friendsResult.error?.message })
            if (friendsResult.data) {
              dispatch({ type: 'SET_FRIENDS', payload: friendsResult.data.map((friend) => ({
                id: friend.friend_id,
                username: friend.friend_username,
                displayName: friend.friend_display_name || friend.friend_username,
                avatar: friend.friend_avatar_url || undefined,
                status: friend.status,
              })) })
            }
          } catch (e) {
            console.error('[AppContext] getFriends exception:', e)
          }
        } else {
          dispatch({ type: 'LOGOUT' })
        }
      } catch (e) {
        console.error('[AppContext] loadSession exception:', e)
      }
    }

    loadSession()

    subscription = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return
      console.log('[AppContext] onAuthStateChange:', { event, hasSession: !!session, userId: session?.user?.id })
      try {
        if (session?.user) {
          const profileResult = await getUserProfile(session.user.id)
          console.log('[AppContext] onAuth getUserProfile:', { ok: !profileResult.error, error: profileResult.error?.message })
          const profile = profileResult.data || undefined
          dispatch({ type: 'LOGIN', payload: { user: mapSupabaseUser(session.user, profile), token: session.access_token || null } })
          if (profile?.invite_count !== undefined) {
            dispatch({ type: 'SET_INVITE_COUNT', payload: profile.invite_count })
          }
          if (profile?.free_api_quota !== undefined) {
            dispatch({ type: 'SET_FREE_API_QUOTA', payload: profile.free_api_quota })
          }
          try {
            const friendsResult = await getFriends(session.user.id)
            console.log('[AppContext] onAuth getFriends:', { ok: !!friendsResult.data, error: friendsResult.error?.message })
            if (friendsResult.data) {
              dispatch({ type: 'SET_FRIENDS', payload: friendsResult.data.map((friend) => ({
                id: friend.friend_id,
                username: friend.friend_username,
                displayName: friend.friend_display_name || friend.friend_username,
                avatar: friend.friend_avatar_url || undefined,
                status: friend.status,
              })) })
            }
          } catch (e) {
            console.error('[AppContext] onAuth getFriends exception:', e)
          }
        } else {
          dispatch({ type: 'LOGOUT' })
        }
      } catch (e) {
        console.error('[AppContext] onAuthStateChange exception:', e)
      }
    }).data.subscription

    return () => {
      isMounted = false
      if (subscription) subscription.unsubscribe()
    }
  }, [])

  const expandIsland = useCallback(() => {
    dispatch({ type: 'SET_UI_STATE', payload: 'expanded' });
  }, []);

  const collapseIsland = useCallback(() => {
    dispatch({ type: 'SET_UI_STATE', payload: 'compact' });
  }, []);

  const showVoiceInput = useCallback(() => {
    dispatch({ type: 'SET_UI_STATE', payload: 'voice' });
  }, []);

  const hideVoiceInput = useCallback(() => {
    dispatch({ type: 'SET_UI_STATE', payload: 'compact' });
  }, []);

  return (
    <AppContext.Provider
      value={{ state, dispatch, expandIsland, collapseIsland, showVoiceInput, hideVoiceInput }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
