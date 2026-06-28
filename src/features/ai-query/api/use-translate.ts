"use client";

import { useMutation } from "@tanstack/react-query";

import type { TranslateInput } from "../model/spec";
import { translateQuery, type TranslateActionResult } from "./actions";

/**
 * Client hook over the translation Server Action (ADR 0091). Translation is an
 * imperative, user-initiated server call returning derived data (not a cache
 * read), so it is modelled as a TanStack `useMutation` — no query cache, no
 * Zustand mirror of server data (ADR 0026). The action returns a discriminated
 * result and never throws, so the hook's `data` carries the success-or-failure
 * shape directly.
 */
export function useTranslateQuery() {
  return useMutation<TranslateActionResult, Error, TranslateInput>({
    mutationFn: (input) => translateQuery(input),
  });
}
