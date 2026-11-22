import { describe, expect, it, vi } from "vitest";
import { analyzeI02Application, askI02Model } from "../../../server/i02-chat";
import { i02Example } from "./i02-example";
import { i02ChatRequestSchema } from "./i02-chat-contract";
import { initialState, ownRecruiterNote, publishedJobs, transition } from "./model";
import { parseState, serializeState } from "./storage";

const applicationId = i02Example.application.id;
const select = (state: ReturnType<typeof initialState>, id: string) =>
  transition(state, { type: "select_person", id });
const noteAction = {
  type: "save_recruiter_note",
  applicationId,
  value: { step: "needs_information", rationale: "  Sprawdzić sposób pomiaru.  " },
} as const;

describe("I02 scenario", () => {
  it("queues analysis on submission and starts older records only for the owning employer", () => {
    const state = initialState();
    const job = state.jobs.find((item) => item.slug === "ai-product-manager")!;
    const submitted = transition(select(state, "candidate-anna"), {
      type: "submit",
      jobId: job.id,
      answer: "Analizowałam zastosowania AI w obsłudze zgłoszeń.",
      notes: "",
      generated: "",
      consent: true,
    });
    expect(submitted.applications.at(-1)?.experienceAnalysis).toEqual({
      status: "pending",
      roleDescription: job.description,
    });
    const backfill = {
      type: "request_application_analysis",
      applicationId: "application-example",
    } as const;
    expect(() => transition(select(state, "employer-northstar"), backfill)).toThrow();
    expect(() => transition(select(state, "candidate-marek"), backfill)).toThrow();
    const own = transition(select(state, "employer-brightlabs"), backfill);
    expect(
      own.applications.find((item) => item.id === "application-example")?.experienceAnalysis
        ?.status,
    ).toBe("pending");
    const prepared = transition(own, { ...backfill, applicationId });
    expect(
      prepared.applications.find((item) => item.id === applicationId)?.experienceAnalysis,
    ).toBeUndefined();
  });

  it("seeds a draft job, an immutable application and exact distinct quotes", () => {
    const state = initialState();
    expect(publishedJobs(state).some((job) => job.id === i02Example.job.id)).toBe(false);
    const application = state.applications.find((item) => item.id === applicationId)!;
    expect(application.answer).toBe(i02Example.application.answer);
    for (const { quote } of i02Example.criteria) {
      expect(application.answer.split(quote)).toHaveLength(2);
    }
  });

  it("keeps independent notes scoped to the persona through edits and export/import", () => {
    const state = initialState();
    const recruiter = state.people.find((person) => person.id === "employer-brightlabs")!;
    const anotherId = "employer-brightlabs-test";
    state.people.push({ ...recruiter, id: anotherId });
    const application = state.applications.find((item) => item.id === applicationId)!;
    const saved = transition(select(state, recruiter.id), noteAction);
    expect(saved.applications).toEqual(state.applications);
    const reloaded = parseState(serializeState(saved));
    expect(ownRecruiterNote(reloaded, application)?.rationale).toBe("Sprawdzić sposób pomiaru.");
    const other = select(reloaded, anotherId);
    expect(ownRecruiterNote(other, application)).toBeUndefined();
    const otherSaved = transition(other, {
      ...noteAction,
      value: { step: "defer", rationale: "Inna notatka." },
    });
    expect(ownRecruiterNote(otherSaved, application)?.step).toBe("defer");
    const edited = transition(select(otherSaved, recruiter.id), {
      ...noteAction,
      value: { step: "interview", rationale: "Po rozmowie o wkładzie." },
    });
    expect(edited.recruiterNotes).toHaveLength(2);
    expect(ownRecruiterNote(edited, application)?.step).toBe("interview");
    const ordinaryApplication = state.applications.find(
      (item) => item.id === "application-example",
    )!;
    const withAnotherNote = transition(edited, {
      ...noteAction,
      applicationId: ordinaryApplication.id,
    });
    expect(
      ownRecruiterNote(parseState(serializeState(withAnotherNote)), ordinaryApplication)?.step,
    ).toBe("needs_information");
    expect(ownRecruiterNote(withAnotherNote, application)?.step).toBe("interview");
    expect(withAnotherNote.applications).toEqual(state.applications);
    expect(edited.applications).toEqual(state.applications);
    expect(initialState().recruiterNotes).toEqual([]);
  });

  it("rejects invalid writes and imports and loads an older v1 file without I02", () => {
    const state = initialState();
    for (const id of ["candidate-marek", "operator", "employer-northstar"])
      expect(() => transition(select(state, id), noteAction)).toThrow();
    const own = select(state, "employer-brightlabs");
    expect(() =>
      transition(own, { ...noteAction, applicationId: "missing-application" }),
    ).toThrow();
    for (const rationale of ["  ", "a".repeat(1001)])
      expect(() =>
        transition(own, { ...noteAction, value: { ...noteAction.value, rationale } }),
      ).toThrow();

    const saved = transition(own, noteAction);
    expect(() =>
      parseState(
        JSON.stringify({
          ...saved,
          recruiterNotes: [{ ...saved.recruiterNotes[0], recruiterId: "employer-northstar" }],
        }),
      ),
    ).toThrow();
    const legacy = JSON.stringify({
      ...state,
      recruiterNotes: undefined,
      applications: state.applications.filter((item) => item.id !== applicationId),
      jobs: state.jobs.filter((item) => item.id !== i02Example.job.id),
    });
    const restored = parseState(legacy);
    expect(restored.recruiterNotes).toEqual([]);
    expect(restored.applications.map((item) => item.id)).toEqual(["application-example"]);
  });
});

describe("I02 model adapter", () => {
  const provider = { key: "mock-key", model: "mock-model" };
  const history = [
    {
      question: "Co zrobił?",
      reply: {
        claims: [
          {
            text: "Kandydat opisuje przygotowanie instrukcji.",
            sourceIds: ["answer-first" as const],
          },
        ],
        unknown: "",
      },
    },
  ];
  const input = { applicationId, question: "A jak zmierzono efekt?", history };
  function envelope(content: unknown, status = "completed") {
    return new Response(JSON.stringify({ status, output: [{ type: "message", content }] }));
  }

  it("supplies canonical synthetic sources and bounded conversation context to Responses", async () => {
    const reply = { claims: [], unknown: "Nie podano wyników pomiaru." };
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(envelope([{ type: "output_text", text: JSON.stringify(reply) }]));
    await expect(
      askI02Model({ ...provider, model: "gpt-5-mini" }, input, AbortSignal.timeout(1000), request),
    ).resolves.toEqual(reply);
    const [url, options] = request.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/responses");
    const body = JSON.parse(options?.body as string);
    expect(body).toMatchObject({
      model: "gpt-5-mini",
      reasoning: { effort: "minimal" },
      store: false,
      text: { format: { strict: true } },
    });
    const sent = JSON.parse(body.input);
    expect(sent).toMatchObject({ question: input.question, history });
    expect(sent.sources["project-note"].text).toBe(i02Example.projectNote);
    expect(i02ChatRequestSchema.safeParse({ ...input, application: "arbitrary CV" }).success).toBe(
      false,
    );
    expect(
      i02ChatRequestSchema.safeParse({ ...input, applicationId: "application-example" }).success,
    ).toBe(false);
  });

  it("rejects unrecognised citations, refusals, incomplete and failed provider responses", async () => {
    const invalidCitation = envelope([
      {
        type: "output_text",
        text: JSON.stringify({
          claims: [{ text: "Przykład.", sourceIds: ["external"] }],
          unknown: "",
        }),
      },
    ]);
    for (const response of [
      invalidCitation,
      envelope([{ type: "refusal" }]),
      envelope([], "incomplete"),
      new Response("", { status: 429 }),
    ]) {
      const request = vi.fn<typeof fetch>().mockResolvedValue(response);
      await expect(
        askI02Model(provider, input, AbortSignal.timeout(1000), request),
      ).rejects.toThrow();
    }
  });

  it("uses submitted materials for ordinary applications and rejects citations to other records", async () => {
    const materials = {
      answer: "Kandydat opisał automatyzację raportu sprzedażowego.",
      cv: "Pracował przy automatyzacji raportów w fikcyjnej firmie.",
      jobTitle: "Analityk",
      roleDescription: "Przygotowanie i kontrola raportów sprzedażowych.",
    };
    const ordinary = i02ChatRequestSchema.parse({
      applicationId: "application-example",
      materials,
      question: "Czym się zajmował?",
      history: [],
    });
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      envelope([
        {
          type: "output_text",
          text: JSON.stringify({
            claims: [
              { text: "Kandydat opisał automatyzację raportu.", sourceIds: ["answer-first"] },
            ],
            unknown: "",
          }),
        },
      ]),
    );
    await askI02Model(provider, ordinary, AbortSignal.timeout(1000), request);
    const body = JSON.parse(request.mock.calls[0][1]?.body as string);
    const { sources } = JSON.parse(body.input);
    expect(Object.keys(sources).sort()).toEqual(["answer-first", "cv", "role-description"]);
    expect(sources["answer-first"].text).toBe(materials.answer);
    expect(sources.cv.text).toBe(materials.cv);
    expect(sources["role-description"].text).toContain(materials.roleDescription);
    request.mockResolvedValue(
      envelope([
        {
          type: "output_text",
          text: JSON.stringify({
            claims: [{ text: "Wniosek z innej aplikacji.", sourceIds: ["project-note"] }],
            unknown: "",
          }),
        },
      ]),
    );
    await expect(
      askI02Model(provider, ordinary, AbortSignal.timeout(1000), request),
    ).rejects.toThrow();
  });

  it("grounds requirements in the role description and rejects unavailable evidence sources", async () => {
    const materials = {
      answer: "Kandydat opisał automatyzację raportu.",
      cv: "Pracował w fikcyjnym zespole danych.",
      jobTitle: "Analityk",
      roleDescription: "Pokaż swój wkład w automatyzację raportów.",
    };
    const result = {
      contribution: {
        requirement: materials.roleDescription,
        claims: [{ text: "Kandydat opisuje automatyzację raportu.", sourceIds: ["answer-first"] }],
        unknown: "",
      },
      practice: { requirement: null, claims: [], unknown: "Nie opisano użycia AI." },
      impact: {
        requirement: "Zmniejsz czas pracy o połowę.",
        claims: [],
        unknown: "Nie podano wyników.",
      },
    };
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(envelope([{ type: "output_text", text: JSON.stringify(result) }]));
    await expect(
      analyzeI02Application(provider, { materials }, AbortSignal.timeout(1000), request),
    ).resolves.toEqual({ ...result, impact: { ...result.impact, requirement: null } });
    const body = JSON.parse(request.mock.calls[0][1]?.body as string);
    expect(body.text.format.schema.required).toEqual(["contribution", "practice", "impact"]);
    expect(body.text.format.schema.properties.contribution.required).toContain("requirement");
    expect(JSON.parse(body.input).sources["answer-first"].text).toBe(materials.answer);
    result.contribution.claims[0].sourceIds = ["project-note"];
    request.mockResolvedValue(envelope([{ type: "output_text", text: JSON.stringify(result) }]));
    await expect(
      analyzeI02Application(provider, { materials }, AbortSignal.timeout(1000), request),
    ).rejects.toThrow();
  });
});
