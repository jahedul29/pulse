import { z } from "zod";

export const REGION_CODE_MAX = 16;
export const COUNTRY_CODE_MAX = 10;

export interface NameMessages {
  nameEnRequired: string;
  nameArRequired: string;
}

export interface NameOptions {
  keepArabic?: boolean;
}

function arabicName(messages: NameMessages, options: NameOptions) {
  return options.keepArabic ? z.string().trim().min(1, messages.nameArRequired) : z.string().trim();
}

export interface RegionMessages extends NameMessages {
  countryRequired: string;
  codeTooLong: string;
  codeCharacters: string;
}

export const REGION_CODE_PATTERN = /^[A-Za-z0-9._-]*$/;

export function regionSchema(messages: RegionMessages, options: NameOptions = {}) {
  return z.object({
    countryId: z.string().min(1, messages.countryRequired),
    code: z.string().trim().max(REGION_CODE_MAX, messages.codeTooLong).regex(REGION_CODE_PATTERN, messages.codeCharacters),
    nameEn: z.string().trim().min(1, messages.nameEnRequired),
    nameAr: arabicName(messages, options),
    isActive: z.boolean(),
  });
}

export type RegionForm = z.infer<ReturnType<typeof regionSchema>>;

export interface CountryMessages extends NameMessages {
  codeRequired: string;
  codeTooLong: string;
  codeSpaces: string;
}

export function countrySchema(messages: CountryMessages, options: NameOptions = {}) {
  return z.object({
    code: z
      .string()
      .trim()
      .min(1, messages.codeRequired)
      .max(COUNTRY_CODE_MAX, messages.codeTooLong)
      .regex(/^\S*$/, messages.codeSpaces),
    nameEn: z.string().trim().min(1, messages.nameEnRequired),
    nameAr: arabicName(messages, options),
    isActive: z.boolean(),
  });
}

export type CountryForm = z.infer<ReturnType<typeof countrySchema>>;
