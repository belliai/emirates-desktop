import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AxiosInstance } from "axios"

import { useBelliApi } from "@/lib/utils/network"
import { numberWithSign } from "@/lib/utils/number-utils"
import { getLocalTimezoneOffset } from "@/lib/utils/timezone-utils"

import { ULD } from "../../uld-management/uld-inventory/types/uld"
import {
  BuildUpListItem,
  FinalizeBuildUpPayload,
  OrderShipmentData,
} from "../types/build-up"

const route = "/build-up"

export interface BuildUpParams {
  flight_id: string
}

export type UldListDto = ULD & {
  shipments: OrderShipmentData[]
}

export type FinalizedBuildUpData = {
  id: string
  is_finalized: boolean
  bulk_shipments: OrderShipmentData[]
  offload_shipments: OrderShipmentData[]
  uld_list: UldListDto[]
}

export type BuildUpData = {
  accepted_orders: OrderShipmentData[]
  build_up_data: FinalizedBuildUpData | null
}

export const fetchBuildUpData = async (
  belliApi: AxiosInstance,
  params: BuildUpParams
) => {
  const response = await belliApi.get<BuildUpData>(
    `${route}/${params.flight_id}`,
    {
      params,
    }
  )
  return response.data
}

export const useBuildUpData = (params: BuildUpParams) => {
  const belliApi = useBelliApi()
  return useQuery({
    queryKey: [route, "list", params],
    queryFn: async () => await fetchBuildUpData(await belliApi, params),
    enabled: !!params.flight_id,
    refetchOnWindowFocus: false,
  })
}

export const finalizeBuildUp = async (
  belliApi: AxiosInstance,
  params: FinalizeBuildUpPayload
) => {
  const response = await belliApi.post(`${route}/${params.flight_id}`, params)
  return response.data
}

export const useFinalizeBuildUp = (shouldInvalidate: boolean = true) => {
  const belliApi = useBelliApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: FinalizeBuildUpPayload) =>
      await finalizeBuildUp(await belliApi, params),
    onSuccess: () => {
      if (shouldInvalidate) {
        queryClient.invalidateQueries({ queryKey: [route] })
      }
    },
  })
}

export type BuildUpListParams = PaginationParams & {
  date_start?: string
  date_end?: string
  timezone?: number
}

export const fetchBuildUpList = async (
  belliApi: AxiosInstance,
  params: BuildUpListParams
) => {
  if (!params.timezone) {
    params.timezone = getLocalTimezoneOffset()
  }
  const response = await belliApi.get<APIPaginatedResponse<BuildUpListItem>>(
    route,
    {
      params: {
        ...params,
        timezone: numberWithSign(params.timezone),
      },
    }
  )
  return response.data
}

export const useBuildUpList = (params: BuildUpListParams) => {
  const belliApi = useBelliApi()
  return useQuery({
    queryKey: [route, "list", params],
    queryFn: async () => await fetchBuildUpList(await belliApi, params),
  })
}
