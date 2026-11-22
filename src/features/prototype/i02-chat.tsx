import {
  useEffect,
  useId,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getI02Sources,
  i02ChatPath,
  i02QuestionSchema,
  maxI02ChatHistory,
  maxI02QuestionLength,
  parseI02Reply,
  type I02ChatTurn,
  type I02Materials,
} from "./i02-chat-contract";

import { I02Evidence } from "./i02-evidence";
import { fetchI02Json } from "./i02-client";

export function I02Chat({
  active,
  applicationId,
  materials,
  question,
  setQuestion,
  headingId,
}: {
  active: boolean;
  applicationId: string;
  materials?: I02Materials;
  question: string;
  setQuestion: Dispatch<SetStateAction<string>>;
  headingId: string;
}) {
  const [availability, setAvailability] = useState<"checking" | "ready" | "unavailable">(
    import.meta.env.I02_LOCAL_DEV === "enabled" ? "checking" : "unavailable",
  );
  const [turns, setTurns] = useState<I02ChatTurn[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  const sources = getI02Sources(materials);

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    async function checkAvailability() {
      try {
        const response = await fetchI02Json(i02ChatPath, { cache: "no-store" }, controller.signal);
        const data = response?.data;
        const ready =
          response?.ok &&
          data &&
          typeof data === "object" &&
          "available" in data &&
          data.available === true;
        if (!controller.signal.aborted) setAvailability(ready ? "ready" : "unavailable");
      } catch {
        if (!controller.signal.aborted) setAvailability("unavailable");
      }
    }
    void checkAvailability();
    return () => controller.abort();
  }, [active]);

  useEffect(() => () => request.current?.abort(), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (availability !== "ready" || request.current) return;
    const parsed = i02QuestionSchema.safeParse(question);
    if (!parsed.success) {
      setError("Wpisz pytanie dotyczące aplikacji.");
      input.current?.focus();
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setError("");
    try {
      const response = await fetchI02Json(
        i02ChatPath,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            applicationId,
            materials,
            question: parsed.data,
            history: turns.slice(-maxI02ChatHistory),
          }),
        },
        controller.signal,
      );
      if (!response) {
        setAvailability("unavailable");
        return;
      }
      if (!response.ok) {
        if (response.status === 503) setAvailability("unavailable");
        throw new Error("Chat request failed");
      }
      const reply = parseI02Reply(response.data, sources);
      if (controller.signal.aborted) return;
      setTurns((current) => [...current, { question: parsed.data, reply }]);
      setQuestion((current) => (current === question ? "" : current));
    } catch {
      if (!controller.signal.aborted)
        setError("Nie udało się uzyskać odpowiedzi. Spróbuj ponownie.");
    } finally {
      if (!controller.signal.aborted) {
        request.current = null;
        setPending(false);
      }
    }
  }

  return (
    <div className="i02-chat">
      <div className="i02-chat-heading">
        <h3 id={headingId} tabIndex={-1}>
          Czat o aplikacji
        </h3>
        {turns.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => {
              setTurns([]);
              setQuestion("");
              setError("");
              input.current?.focus();
            }}
          >
            Nowa rozmowa
          </Button>
        )}
      </div>
      {availability === "checking" && <p role="status">Sprawdzam dostępność czatu…</p>}
      {availability === "unavailable" && (
        <p role="status">
          Czat AI jest niedostępny w tej wersji. Kryteria i źródła możesz przejrzeć w panelu.
        </p>
      )}
      <div role="log" aria-label="Rozmowa o aplikacji" className="i02-chat-log">
        {turns.map(({ question, reply }, index) => (
          <article key={index} className="i02-chat-turn">
            <p className="i02-chat-question">
              <strong>Ty</strong> {question}
            </p>
            <div className="i02-chat-reply">
              <strong>AI</strong>
              <I02Evidence reply={reply} sources={sources} />
            </div>
          </article>
        ))}
      </div>
      {availability === "ready" && (
        <form className="i02-chat-form" onSubmit={submit} noValidate>
          <label htmlFor={id}>Pytanie do AI</label>
          <p id={`${id}-help`} className="record-caption">
            {materials
              ? "Wysłanie pytania przekazuje do OpenAI odpowiedź kandydata, CV, opis roli i kontekst rozmowy. Używaj wyłącznie danych fikcyjnych."
              : "Wysłanie pytania przekazuje do OpenAI fikcyjne materiały I02 i kontekst rozmowy."}
          </p>
          <Textarea
            id={id}
            ref={input}
            aria-describedby={`${id}-help`}
            maxLength={maxI02QuestionLength}
            readOnly={pending}
            rows={2}
            placeholder="Za co kandydat odpowiadał przy wdrożeniu?"
            value={question}
            onChange={(event) => {
              setQuestion(event.target.value);
              setError("");
            }}
          />
          <div>
            <Button type="submit" aria-disabled={pending}>
              Wyślij pytanie
            </Button>
          </div>
        </form>
      )}
      <div role="status" className="record-caption">
        {pending ? "AI przygotowuje odpowiedź…" : ""}
      </div>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
    </div>
  );
}
