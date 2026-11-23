import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useConfiguredPostHog } from "@/lib/posthog-logger";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ApplicationRecord } from "./application-record";
import { hasPreparedI02Review } from "./i02-example";
import { I02RecruiterNote } from "./i02-recruiter-note";
import { useI02Review } from "./i02-review";
import { nextStages, stageLabels, type Application } from "./model";
import { usePrototype } from "./store";

export function RecruitingApplication({ application }: { application: Application }) {
  const { state, run } = usePrototype();
  const posthog = useConfiguredPostHog();
  const [note, setNote] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const statusRef = useRef<HTMLSpanElement>(null);
  const pendingFocus = useRef(false);
  const company = state.companies.find((item) => item.id === application.companyId);
  const availableStages = nextStages[application.stage];
  const roleDescription = state.jobs.find((job) => job.id === application.jobId)?.description;
  const needsAnalysis = !application.experienceAnalysis && !hasPreparedI02Review(application);
  const i02Review = useI02Review(application, roleDescription, () => {
    void run({ type: "request_application_analysis", applicationId: application.id });
  });

  useEffect(() => {
    if (needsAnalysis)
      void run({ type: "request_application_analysis", applicationId: application.id });
  }, [application.id, needsAnalysis, run]);

  useLayoutEffect(() => {
    if (pendingFocus.current) {
      statusRef.current?.focus();
      pendingFocus.current = false;
    }
  }, [application.stage]);

  return (
    <>
      <ApplicationRecord
        application={application}
        companyName={company?.name ?? ""}
        audience="employer"
        history={application.events}
        statusRef={statusRef}
        {...i02Review}
        reviewNote={<I02RecruiterNote application={application} />}
        footer={
          availableStages.length > 0 ? (
            <>
              <p className="record-caption">Notatka zapisze się w historii po zmianie etapu.</p>
              <div className="record-actions">
                {availableStages.map((stage) => (
                  <Button
                    key={stage}
                    variant={stage === "rejected" ? "outline" : "default"}
                    onClick={async () => {
                      if (
                        await run({ type: "stage", applicationId: application.id, stage, note })
                      ) {
                        posthog?.capture("application_stage_updated", {
                          previous_stage: application.stage,
                          next_stage: stage,
                        });
                        setNote("");
                        setAnnouncement(`Zapisano etap: ${stageLabels[stage]}.`);
                        pendingFocus.current = true;
                      }
                    }}
                  >
                    {stageLabels[stage]}
                  </Button>
                ))}
              </div>
            </>
          ) : (
            <p className="record-caption">
              {stageLabels[application.stage]}. Brak kolejnych działań w tym procesie.
            </p>
          )
        }
      >
        {availableStages.length > 0 ? (
          <>
            <h3>
              <label htmlFor="recruiting-note">Notatka rekrutacyjna</label>
            </h3>
            <p className="record-caption" id="recruiting-note-hint">
              Widoczna tylko pracodawcy w tym scenariuszu.
            </p>
            <Textarea
              id="recruiting-note"
              aria-label="Notatka rekrutacyjna (widoczna pracodawcy)"
              aria-describedby="recruiting-note-hint"
              maxLength={12000}
              rows={4}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Co warto sprawdzić w rozmowie?"
            />
          </>
        ) : null}
      </ApplicationRecord>
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </>
  );
}
