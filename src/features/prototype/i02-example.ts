import example from "./data/i02.json" with { type: "json" };

export const i02Example = example;

export function isI02Application(application: {
  id: string;
  jobId: string;
  companyId: string;
  candidateId: string;
}) {
  return (
    application.id === example.application.id &&
    application.jobId === example.job.id &&
    application.companyId === example.job.companyId &&
    application.candidateId === example.application.candidateId
  );
}

export function hasPreparedI02Review(
  application: Parameters<typeof isI02Application>[0] & {
    candidateName: string;
    answer: string;
    cv: string;
    jobTitle: string;
  },
) {
  return (
    isI02Application(application) &&
    application.candidateName === example.application.candidateName &&
    application.answer === example.application.answer &&
    application.cv === example.application.cv &&
    application.jobTitle === example.job.title
  );
}
