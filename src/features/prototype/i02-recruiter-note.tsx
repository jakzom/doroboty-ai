import { useId, useState, type FormEvent } from "react";
import { useConfiguredPostHog } from "@/lib/posthog-logger";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  MAX_RECRUITER_RATIONALE_LENGTH,
  ownRecruiterNote,
  recruiterNoteInputSchema,
  recruiterNoteSteps,
  type Application,
} from "./model";
import { usePrototype } from "./store";

export function I02RecruiterNote({ application }: { application: Application }) {
  const { state, run, issue, blocked } = usePrototype();
  const posthog = useConfiguredPostHog();
  const saved = ownRecruiterNote(state, application);
  const [step, setStep] = useState<string>(saved?.step ?? "");
  const [rationale, setRationale] = useState(saved?.rationale ?? "");
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const id = useId();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = recruiterNoteInputSchema.safeParse({ step, rationale });
    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors;
      setError(fields.step ? "Wybierz kolejny krok." : "Wpisz uzasadnienie od 1 do 1000 znaków.");
      const name = fields.step ? "step" : "rationale";
      (event.currentTarget.elements.namedItem(name) as HTMLElement | null)?.focus();
      return;
    }
    setError("");
    setConfirmed(false);
    if (
      await run({ type: "save_recruiter_note", applicationId: application.id, value: parsed.data })
    ) {
      posthog?.capture("recruiter_note_saved", { proposed_step: parsed.data.step });
      setRationale(parsed.data.rationale);
      setConfirmed(true);
    }
  }

  return (
    <form className="i02-note" aria-labelledby={`${id}-heading`} noValidate onSubmit={submit}>
      <h3 id={`${id}-heading`}>Notatka rekrutera</h3>
      <p className="record-caption">Twój proponowany krok. Zapis nie zmienia etapu aplikacji.</p>
      <label className="field">
        <span>Kolejny krok</span>
        <select
          className="native-select"
          name="step"
          value={step}
          required
          onChange={(event) => {
            setStep(event.target.value);
            setError("");
            setConfirmed(false);
          }}
        >
          <option value="">Wybierz krok</option>
          {Object.entries(recruiterNoteSteps).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Uzasadnienie</span>
        <Textarea
          name="rationale"
          value={rationale}
          maxLength={MAX_RECRUITER_RATIONALE_LENGTH}
          rows={3}
          required
          onChange={(event) => {
            setRationale(event.target.value);
            setError("");
            setConfirmed(false);
          }}
        />
      </label>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <div>
        <Button type="submit">Zapisz notatkę</Button>
      </div>
      <p className="record-caption" role="status">
        {confirmed
          ? issue || blocked
            ? "Notatka jest w pamięci. Wyeksportuj dane, aby ją zachować."
            : "Notatka zapisana."
          : ""}
      </p>
    </form>
  );
}
