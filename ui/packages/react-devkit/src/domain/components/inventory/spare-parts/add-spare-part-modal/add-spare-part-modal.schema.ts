import { z } from "zod";

import { INVALID_MAC_ADDRESS_ERROR, MAC_ADDRESS_REGEX } from "./add-spare-part-modal.constants";

export const makeAddSparePartSchema = (isController: boolean) =>
  z.object({
    partTypeId: z.string().min(1, "Part is required"),
    model: z.string().min(1, "Part model is required"),
    parentDeviceModel: z.string().min(1, "Miner model is required"),
    serialNum: isController ? z.string() : z.string().min(1, "Serial number is required"),
    macAddress: isController
      ? z.string().min(1, "MAC Address is required").regex(MAC_ADDRESS_REGEX, INVALID_MAC_ADDRESS_ERROR)
      : z.string(),
    status: z.string().min(1, "Status is required"),
    location: z.string().min(1, "Location is required"),
    comment: z.string(),
    tags: z.array(z.string()),
  });

export type AddSparePartFormSchema = z.infer<ReturnType<typeof makeAddSparePartSchema>>;
