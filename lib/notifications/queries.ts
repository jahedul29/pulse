import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import { useAuthStore } from "@/lib/auth/store";
import {
  createAlertRoute,
  createTemplate,
  deleteAlertRoute,
  deleteTemplate,
  getDelivery,
  getTemplate,
  listAllChannels,
  listAllTemplates,
  listAlertRoutes,
  listCampaigns,
  listChannels,
  listDeliveries,
  listLiveAlerts,
  listTemplates,
  getAlertRoute,
  updateAlertRoute,
  updateTemplate,
  type ListParams,
} from "./notif-api";
import type {
  StoreAlertRouteBody,
  StoreTemplateBody,
  UpdateAlertRouteBody,
  UpdateTemplateBody,
} from "./dto";

function useAuthed() {
  return useAuthStore((state) => Boolean(state.session?.accessToken ?? state.session?.token));
}

export function useAllTemplates() {
  const authed = useAuthed();
  return useQuery({
    queryKey: queryKeys.notificationTemplates(),
    queryFn: listAllTemplates,
    enabled: authed,
  });
}

export function useTemplate(id: number | null) {
  const authed = useAuthed();
  return useQuery({
    queryKey: queryKeys.notificationTemplate(id ?? 0),
    queryFn: () => getTemplate(id as number),
    enabled: authed && Number.isFinite(id) && (id as number) > 0,
  });
}

export function useChannels() {
  const authed = useAuthed();
  return useQuery({
    queryKey: queryKeys.notificationChannels(),
    queryFn: listAllChannels,
    enabled: authed,
  });
}

const CHANNELS_PER_PAGE = 10;

export function useChannelSearch(search: string, enabled: boolean) {
  const authed = useAuthed();
  return useInfiniteQuery({
    queryKey: [...queryKeys.notificationChannels(), "search", search],
    queryFn: ({ pageParam }) =>
      listChannels({ page: pageParam, perPage: CHANNELS_PER_PAGE, search: search || undefined }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const meta = lastPage.meta;
      if (!meta) return undefined;
      return meta.current_page < meta.last_page ? meta.current_page + 1 : undefined;
    },
    enabled: authed && enabled,
    placeholderData: keepPreviousData,
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: StoreTemplateBody) => createTemplate(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.notificationTemplates() }),
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateTemplateBody }) => updateTemplate(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.notificationTemplates() }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.notificationTemplates() }),
  });
}

export function useCampaignSearch(search: string, enabled: boolean) {
  const authed = useAuthed();
  return useInfiniteQuery({
    queryKey: ["notification-campaign-search", search],
    queryFn: ({ pageParam }) =>
      listCampaigns({ page: pageParam, perPage: CHANNELS_PER_PAGE, search: search || undefined }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const meta = lastPage.meta;
      if (!meta) return undefined;
      return meta.current_page < meta.last_page ? meta.current_page + 1 : undefined;
    },
    enabled: authed && enabled,
    placeholderData: keepPreviousData,
  });
}

export function useTemplateSearch(search: string, enabled: boolean) {
  const authed = useAuthed();
  return useInfiniteQuery({
    queryKey: [...queryKeys.notificationTemplates(), "search", search],
    queryFn: ({ pageParam }) =>
      listTemplates({ page: pageParam, perPage: CHANNELS_PER_PAGE, search: search || undefined }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const meta = lastPage.meta;
      if (!meta) return undefined;
      return meta.current_page < meta.last_page ? meta.current_page + 1 : undefined;
    },
    enabled: authed && enabled,
    placeholderData: keepPreviousData,
  });
}

export function useDeliveries(params: ListParams) {
  const authed = useAuthed();
  return useQuery({
    queryKey: queryKeys.notificationDeliveries(params),
    queryFn: () => listDeliveries(params),
    placeholderData: keepPreviousData,
    enabled: authed,
  });
}

export function useLiveAlerts(params: ListParams) {
  const authed = useAuthed();
  return useQuery({
    queryKey: queryKeys.liveAlerts(params),
    queryFn: () => listLiveAlerts(params),
    placeholderData: keepPreviousData,
    enabled: authed,
  });
}

export function useDelivery(id: string | null) {
  const authed = useAuthed();
  return useQuery({
    queryKey: queryKeys.notificationDelivery(id ?? ""),
    queryFn: () => getDelivery(id as string),
    enabled: authed && Boolean(id),
  });
}

export function useAlertRoutes(params: ListParams) {
  const authed = useAuthed();
  return useQuery({
    queryKey: queryKeys.alertRoutes(params),
    queryFn: () => listAlertRoutes(params),
    placeholderData: keepPreviousData,
    enabled: authed,
  });
}

export function useAlertRoute(id: number | null) {
  const authed = useAuthed();
  return useQuery({
    queryKey: queryKeys.alertRoute(id ?? 0),
    queryFn: () => getAlertRoute(id as number),
    enabled: authed && Number.isFinite(id) && (id as number) > 0,
  });
}

export function useCreateAlertRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: StoreAlertRouteBody) => createAlertRoute(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.alertRoutes() }),
  });
}

export function useUpdateAlertRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateAlertRouteBody }) => updateAlertRoute(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.alertRoutes() }),
  });
}

export function useDeleteAlertRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteAlertRoute(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.alertRoutes() }),
  });
}
