import { useLayoutEffect, useState } from "react";
import { Tabs } from "@base-ui/react/tabs";
import { Button } from "@/components/ui/button";
import { JobDescription } from "@/features/jobs/job-description";
import { I02Chat } from "./i02-chat";
import { getI02Sources, i02AnalysisCriteria, type I02Analysis } from "./i02-chat-contract";
import { I02Claims } from "./i02-evidence";
import { hasPreparedI02Review, i02Example } from "./i02-example";
import type { Application } from "./model";

type Criterion = (typeof i02Example.criteria)[number];
type Source = { criterion: Criterion; project?: boolean };
const reviewId = "i02-review";
const reviewLabel = "Przejrzyj doświadczenie z AI";
const explanationTriggerId = "i02-open-criteria";
const chatTriggerId = "i02-open-chat";
const projectId = "i02-project-note";
const answerHeadingId = "i02-answer-heading";
const chatHeadingId = "i02-chat-heading";
const criterionTarget = (criterion: Criterion) => `i02-quote-${criterion.id}`;
const returnTarget = ({ criterion, project }: Source) =>
  `i02-action-${criterion.id}-${project ? "project" : "quote"}`;

export function useI02Review(
  application: Application,
  currentRoleDescription: string | undefined,
  requestAnalysis: () => void,
) {
  const [tab, setTab] = useState("answer");
  const [reviewTab, setReviewTab] = useState("contribution");
  const [openedBy, setOpenedBy] = useState<string | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [focus, setFocus] = useState<{ id: string; project?: boolean } | null>(null);
  const [question, setQuestion] = useState("");
  const prepared = hasPreparedI02Review(application);
  const analysis = application.experienceAnalysis;
  const criteria = prepared ? i02Example.criteria : i02AnalysisCriteria;
  const roleDescription = analysis ? analysis.roleDescription : currentRoleDescription;
  const materials = prepared
    ? undefined
    : {
        answer: application.answer,
        cv: application.cv,
        jobTitle: application.jobTitle,
        roleDescription,
      };

  useLayoutEffect(() => {
    if (!focus) return;
    const target = document.getElementById(focus.id);
    if (focus.project && target?.parentElement instanceof HTMLDetailsElement)
      target.parentElement.open = true;
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ behavior: "instant", block: "nearest" });
  }, [focus]);

  function openReview(triggerId: string) {
    setOpenedBy(triggerId);
    setReviewTab(triggerId === chatTriggerId ? "chat" : criteria[0].id);
    setSource(null);
    setFocus({ id: `${reviewId}-heading` });
  }
  function closeReview() {
    setOpenedBy(null);
    setTab("answer");
    setSource(null);
    setFocus({ id: openedBy ?? explanationTriggerId });
  }
  function viewSource(next: Source) {
    setSource(next);
    setTab("answer");
    setFocus({
      id: next.project ? projectId : criterionTarget(next.criterion),
      project: next.project,
    });
  }
  function returnToReview() {
    if (!source) return;
    setFocus({ id: returnTarget(source) });
    setSource(null);
  }

  const answerContent = (
    <I02Answer
      answer={application.answer}
      prepared={prepared}
      roleDescription={roleDescription}
      openedBy={openedBy}
      source={source}
      onOpen={openReview}
      onClose={closeReview}
      onReturn={returnToReview}
    />
  );
  const review = (
    <section
      id={reviewId}
      className="record-sheet i02-review"
      aria-labelledby={`${reviewId}-heading`}
      hidden={!openedBy}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.defaultPrevented) closeReview();
      }}
    >
      <header className="i02-review-header">
        <div>
          <p className="record-caption">
            {reviewTab === "chat"
              ? "Prototyp · odpowiedzi AI na podstawie źródeł"
              : prepared
                ? "Prototyp · objaśnienie przygotowane ręcznie"
                : "Prototyp · automatyczna analiza źródeł"}
          </p>
          <h2 id={`${reviewId}-heading`} tabIndex={-1}>
            {reviewLabel}
          </h2>
        </div>
        <Button variant="outline" size="sm" onClick={closeReview}>
          Zamknij
        </Button>
      </header>
      <Tabs.Root
        className="i02-review-body"
        value={reviewTab}
        orientation="vertical"
        onValueChange={(value) => {
          setReviewTab(String(value));
          setSource(null);
        }}
      >
        <Tabs.List className="i02-review-tabs" aria-label="Przegląd aplikacji" activateOnFocus>
          {criteria.map((criterion) => (
            <Tabs.Tab key={criterion.id} value={criterion.id} render={<Button variant="outline" />}>
              {criterion.label}
            </Tabs.Tab>
          ))}
          <Tabs.Tab value="chat" render={<Button variant="outline" />}>
            Zapytaj AI
          </Tabs.Tab>
        </Tabs.List>
        {prepared &&
          i02Example.criteria.map((criterion) => (
            <Tabs.Panel value={criterion.id} key={criterion.id} className="i02-review-pane">
              <h3>{criterion.label}</h3>
              <p>
                <strong>Wymaganie.</strong> {criterion.requirement}
              </p>
              <blockquote>
                <p className="record-caption">Deklaracja kandydata</p>
                <p>„{criterion.quote}”</p>
              </blockquote>
              <p>
                <strong>Co wynika.</strong> {criterion.interpretation}
              </p>
              <p>
                <strong>Nieustalone.</strong> {criterion.unknown}
              </p>
              <div className="i02-source-actions">
                <Button
                  id={returnTarget({ criterion })}
                  variant="outline"
                  size="sm"
                  onClick={() => viewSource({ criterion })}
                >
                  Pokaż fragment
                </Button>
                {criterion.id === "contribution" && (
                  <Button
                    id={returnTarget({ criterion, project: true })}
                    variant="ghost"
                    size="sm"
                    onClick={() => viewSource({ criterion, project: true })}
                  >
                    Pokaż notatkę projektową
                  </Button>
                )}
              </div>
            </Tabs.Panel>
          ))}
        {!prepared &&
          i02AnalysisCriteria.map((criterion) => (
            <Tabs.Panel value={criterion.id} key={criterion.id} className="i02-review-pane">
              <h3>{criterion.label}</h3>
              <p
                role="status"
                className={analysis?.status === "ready" ? "sr-only" : "record-caption"}
              >
                {analysis?.status === "ready"
                  ? "Analiza zgłoszenia gotowa."
                  : analysis?.status === "failed"
                    ? "Nie udało się przygotować analizy."
                    : analysis?.status === "unavailable"
                      ? "Automatyczna analiza AI jest niedostępna."
                      : "Trwa przygotowanie analizy zgłoszenia…"}
              </p>
              {analysis?.status === "ready" ? (
                <I02AnalysisReading
                  result={analysis.result[criterion.id]}
                  sources={getI02Sources(materials)}
                />
              ) : (
                <p>{criterion.question}</p>
              )}
              <div className="i02-source-actions">
                {(analysis?.status === "failed" || analysis?.status === "unavailable") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      requestAnalysis();
                      setFocus({ id: `${reviewId}-heading` });
                    }}
                  >
                    Ponów analizę
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTab("answer");
                    setFocus({ id: answerHeadingId });
                  }}
                >
                  Przejdź do odpowiedzi
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQuestion(criterion.question);
                    setReviewTab("chat");
                    setFocus({ id: chatHeadingId });
                  }}
                >
                  {analysis?.status === "ready" ? "Dopytaj w czacie" : "Użyj pytania w czacie"}
                </Button>
              </div>
            </Tabs.Panel>
          ))}
        <Tabs.Panel value="chat" className="i02-review-pane" keepMounted>
          <I02Chat
            active={Boolean(openedBy) && reviewTab === "chat"}
            applicationId={application.id}
            materials={materials}
            question={question}
            setQuestion={setQuestion}
            headingId={chatHeadingId}
          />
        </Tabs.Panel>
      </Tabs.Root>
    </section>
  );
  return { answerContent, review, activeSection: tab, onSectionChange: setTab };
}

function I02AnalysisReading({
  result: { requirement, claims, unknown },
  sources,
}: {
  result: I02Analysis[keyof I02Analysis];
  sources: ReturnType<typeof getI02Sources>;
}) {
  return (
    <>
      <p>
        <strong>Wymaganie.</strong>{" "}
        {requirement ??
          (requirement === undefined
            ? "W zapisanej analizie nie ustalono wymagania dla tego kryterium."
            : "Nie udało się wskazać konkretnego wymagania w opisie stanowiska.")}
      </p>
      {claims.length ? (
        <I02Claims claims={claims} sources={sources} label="Co wynika." />
      ) : (
        <p>
          <strong>Co wynika.</strong> Z dostępnych materiałów nie można wyciągnąć wniosku.
        </p>
      )}
      <p>
        <strong>Nieustalone.</strong>{" "}
        {unknown || "Nie wskazano dodatkowych braków w tym kryterium."}
      </p>
    </>
  );
}

function I02Answer({
  answer,
  prepared,
  roleDescription,
  openedBy,
  source,
  onOpen,
  onClose,
  onReturn,
}: {
  answer: string;
  prepared: boolean;
  roleDescription?: string;
  openedBy: string | null;
  source: Source | null;
  onOpen: (triggerId: string) => void;
  onClose: () => void;
  onReturn: () => void;
}) {
  return (
    <div className="i02-answer">
      {prepared && (
        <>
          <h3>Wymagania roli</h3>
          <ul>
            {i02Example.criteria.map((criterion) => (
              <li key={criterion.id}>{criterion.requirement}</li>
            ))}
          </ul>
        </>
      )}
      <div className="i02-answer-heading">
        <h3 id={answerHeadingId} tabIndex={-1}>
          Przesłana aplikacja
        </h3>
        <div className="i02-source-actions">
          {[
            { id: explanationTriggerId, label: reviewLabel },
            { id: chatTriggerId, label: "Zapytaj AI" },
          ].map(({ id, label }) => (
            <Button
              key={id}
              id={id}
              aria-controls={reviewId}
              aria-expanded={openedBy === id}
              variant="outline"
              size="sm"
              onClick={() => (openedBy === id ? onClose() : onOpen(id))}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
      {answer.split("\n\n").map((paragraph, index) => {
        const quote = source && !source.project ? source.criterion.quote : null;
        const start = quote ? paragraph.indexOf(quote) : -1;
        return quote && start >= 0 && source ? (
          <div key={index}>
            <p>
              {paragraph.slice(0, start)}
              <mark id={criterionTarget(source.criterion)} tabIndex={-1}>
                {quote}
              </mark>
              {paragraph.slice(start + quote.length)}
            </p>
            <Button className="i02-return" variant="outline" size="sm" onClick={onReturn}>
              Wróć do przeglądu
            </Button>
          </div>
        ) : (
          <p key={index}>{paragraph}</p>
        );
      })}
      {prepared && (
        <details className="i02-project">
          <summary id={projectId}>
            Notatka projektowa <span className="record-caption">· fikcyjny materiał</span>
          </summary>
          <p>{i02Example.projectNote}</p>
          {source?.project && (
            <Button className="i02-return" variant="outline" size="sm" onClick={onReturn}>
              Wróć do przeglądu
            </Button>
          )}
        </details>
      )}
      {!prepared && roleDescription && (
        <details className="i02-project">
          <summary>Opis stanowiska</summary>
          <JobDescription description={roleDescription} />
        </details>
      )}
    </div>
  );
}
