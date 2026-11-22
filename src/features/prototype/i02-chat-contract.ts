import { z } from "zod";
import { i02Example } from "./i02-example";

export const i02ChatPath = "api/i02/chat";
export const i02AnalysisPath = "api/i02/analysis";
export const maxI02QuestionLength = 800;
export const maxI02ChatHistory = 3;

const sourceIds = [
  "answer-first",
  "answer-second",
  "project-note",
  "cv",
  "role-requirements",
  "role-description",
] as const;
const sourceIdSchema = z.enum(sourceIds);
export type I02SourceId = z.infer<typeof sourceIdSchema>;

const sourceText = z.string().trim().min(1).max(12_000);
const i02MaterialsSchema = z.strictObject({
  answer: sourceText,
  cv: sourceText,
  jobTitle: z.string().trim().min(1).max(200),
  roleDescription: sourceText.optional(),
});
export type I02Materials = z.infer<typeof i02MaterialsSchema>;

export function getI02Sources(materials?: I02Materials) {
  const { answer, cv } = materials ?? i02Example.application;
  const paragraphBreak = /\r?\n[ \t]*\r?\n/.exec(answer);
  const first = paragraphBreak ? answer.slice(0, paragraphBreak.index) : answer;
  const rest = paragraphBreak
    ? answer.slice(paragraphBreak.index + paragraphBreak[0].length).trim()
    : "";
  const sources: Partial<Record<I02SourceId, { label: string; text: string }>> = {
    "answer-first": {
      label: rest ? "Odpowiedź kandydata · akapit 1" : "Odpowiedź kandydata",
      text: first,
    },
    cv: { label: "CV z momentu aplikowania", text: cv },
  };
  if (rest) sources["answer-second"] = { label: "Odpowiedź kandydata · dalsza część", text: rest };
  if (materials) {
    sources["role-description"] = {
      label: "Opis stanowiska",
      text: [materials.jobTitle, materials.roleDescription].filter(Boolean).join("\n\n"),
    };
  } else {
    sources["project-note"] = {
      label: "Fikcyjna notatka projektowa",
      text: i02Example.projectNote,
    };
    sources["role-requirements"] = {
      label: "Wymagania roli",
      text: i02Example.criteria.map((criterion) => criterion.requirement).join("\n"),
    };
  }
  return sources;
}
const claimSchema = z.strictObject({
  text: z.string().trim().min(1).max(500),
  sourceIds: z.array(sourceIdSchema).min(1).max(3),
});
export const i02ReplySchema = z
  .strictObject({
    claims: z.array(claimSchema).max(4),
    unknown: z.string().trim().max(500),
  })
  .refine((reply) => reply.claims.length > 0 || reply.unknown.length > 0);
export type I02Reply = z.infer<typeof i02ReplySchema>;

export function parseI02Reply(input: unknown, sources: ReturnType<typeof getI02Sources>) {
  return i02ReplySchema.refine((reply) => hasAvailableSources(reply, sources)).parse(input);
}

function hasAvailableSources(reply: I02Reply, sources: ReturnType<typeof getI02Sources>) {
  return reply.claims.every((claim) => claim.sourceIds.every((sourceId) => sources[sourceId]));
}

export const i02AnalysisCriteria = [
  {
    id: "contribution",
    label: "Własny wkład",
    question: "Co kandydat opisuje jako swój własny wkład i za co odpowiadał?",
  },
  {
    id: "practice",
    label: "Użycie w pracy",
    question: "Jakie przykłady użycia AI w pracy opisuje kandydat?",
  },
  {
    id: "impact",
    label: "Ocena efektu",
    question: "Jakie efekty pracy opisuje kandydat i jak je potwierdza?",
  },
] as const;

const analysisCriterionSchema = i02ReplySchema.safeExtend({
  // Older saved analyses have no requirement field.
  requirement: z.string().trim().min(1).max(500).nullable().optional(),
});
export const i02AnalysisSchema = z.strictObject({
  contribution: analysisCriterionSchema,
  practice: analysisCriterionSchema,
  impact: analysisCriterionSchema,
});
export type I02Analysis = z.infer<typeof i02AnalysisSchema>;

export function parseI02Analysis(input: unknown, materials: I02Materials) {
  const sources = getI02Sources(materials);
  const analysis = i02AnalysisSchema
    .refine((result) =>
      i02AnalysisCriteria.every(({ id }) => hasAvailableSources(result[id], sources)),
    )
    .parse(input);
  const description = materials.roleDescription?.replace(/\s+/g, " ");
  for (const { id } of i02AnalysisCriteria) {
    const criterion = analysis[id];
    if (criterion.requirement && !description?.includes(criterion.requirement.replace(/\s+/g, " ")))
      criterion.requirement = null;
  }
  return analysis;
}

export const i02AnalysisRequestSchema = z.strictObject({ materials: i02MaterialsSchema });

const analysisContext = z.object({ roleDescription: sourceText.optional() });
export const applicationAnalysisSchema = z.discriminatedUnion("status", [
  analysisContext.extend({ status: z.literal("pending") }),
  analysisContext.extend({ status: z.literal("unavailable") }),
  analysisContext.extend({ status: z.literal("failed") }),
  analysisContext.extend({ status: z.literal("ready"), result: i02AnalysisSchema }),
]);
export type ApplicationAnalysis = z.infer<typeof applicationAnalysisSchema>;

export const i02QuestionSchema = z.string().trim().min(1).max(maxI02QuestionLength);
export const i02ChatTurnSchema = z.strictObject({
  question: i02QuestionSchema,
  reply: i02ReplySchema,
});
export type I02ChatTurn = z.infer<typeof i02ChatTurnSchema>;
export const i02ChatRequestSchema = z
  .strictObject({
    applicationId: z
      .string()
      .max(100)
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),
    materials: i02MaterialsSchema.optional(),
    question: i02QuestionSchema,
    history: z.array(i02ChatTurnSchema).max(maxI02ChatHistory),
  })
  .refine(
    ({ applicationId, materials }) => materials || applicationId === i02Example.application.id,
  );

// The provider validates structure; our Zod schema also checks lengths and usable content.
export function i02ReplyFormat(sources: ReturnType<typeof getI02Sources>) {
  return {
    type: "json_schema",
    name: "i02_grounded_answer",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["claims", "unknown"],
      properties: {
        claims: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["text", "sourceIds"],
            properties: {
              text: { type: "string" },
              sourceIds: { type: "array", items: { type: "string", enum: Object.keys(sources) } },
            },
          },
        },
        unknown: { type: "string" },
      },
    },
  } as const;
}
