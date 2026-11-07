import { z } from "zod";
import { LAND_TYPES, PARCEL_STATUSES } from "./parcel.model.js";

export const parcelIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/);

export const parcelDagSearchSchema = z
  .object({
    dag: z.string().trim().min(1),
  })
  .strict();

const polygonSchema = z
  .array(
    z.tuple([
      z.number().finite().min(0).max(1000),
      z.number().finite().min(0).max(700),
    ]),
  )
  .min(3);

export const createParcelSchema = z
  .object({
    mouza: z.string().trim().min(1).max(120),
    dagNumber: z.string().trim().min(1).max(80),
    khatianNumber: z.string().trim().min(1).max(100),
    landType: z.enum(LAND_TYPES),
    recordedAreaDecimal: z.number().finite().min(0),
    polygon: polygonSchema,
    currentOwnerId: z.string().regex(/^[a-fA-F0-9]{24}$/),
  })
  .strict();

export const updateParcelSchema = z
  .object({
    khatianNumber: z.string().trim().min(1).max(100).optional(),
    landType: z.enum(LAND_TYPES).optional(),
    recordedAreaDecimal: z.number().finite().min(0).optional(),
    polygon: polygonSchema.optional(),
    status: z.enum(PARCEL_STATUSES).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one parcel field must be provided.",
  });

export const disputeFlagSchema = z
  .object({
    disputeFlag: z.boolean(),
    disputeReason: z.string().trim().max(500).nullable(),
  })
  .strict()
  .refine(
    ({ disputeFlag, disputeReason }) =>
      disputeFlag ? Boolean(disputeReason) : disputeReason === null,
    {
      message: "A reason is required when setting a dispute flag; clearing it requires null.",
      path: ["disputeReason"],
    },
  );

export const createTransactionSchema = z
  .object({
    type: z.enum(["SALE", "INHERITANCE", "GIFT", "MUTATION", "CORRECTION"]),
    fromOwnerId: z
      .string()
      .regex(/^[a-fA-F0-9]{24}$/)
      .nullable(),
    toOwnerId: z.string().regex(/^[a-fA-F0-9]{24}$/),
    effectiveDate: z.string().datetime(),
    note: z.string().trim().max(1000).nullable().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      ["SALE", "INHERITANCE", "GIFT"].includes(value.type) &&
      value.fromOwnerId === null
    ) {
      context.addIssue({
        code: "custom",
        message: "A from-owner is required for this transaction type.",
        path: ["fromOwnerId"],
      });
    }
    if (value.type === "MUTATION" && value.fromOwnerId !== null) {
      context.addIssue({
        code: "custom",
        message: "A mutation must not specify a from-owner.",
        path: ["fromOwnerId"],
      });
    }
    if (value.type === "CORRECTION" && !value.note?.trim()) {
      context.addIssue({
        code: "custom",
        message: "A correction requires a note.",
        path: ["note"],
      });
    }
  });
