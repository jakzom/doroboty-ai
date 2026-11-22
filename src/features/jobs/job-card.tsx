import { Link } from "react-router";
import { ArrowUpRight, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrototype } from "@/features/prototype/store";
import type { JobWithCompany } from "./types";
import { categoryLabels, functionLabels, remoteLabels, seniorityLabels } from "./presentation";
import { CompanyLogo } from "./company-logo";
import { SalaryFact } from "./salary-fact";

export function JobCard({ job, saved }: { job: JobWithCompany; saved?: boolean }) {
  const { run } = usePrototype();
  return (
    <article className="pp-job-card" data-category={job.category}>
      <div className="pp-job-main">
        <h3 className="pp-job-title">
          <Link to={`/oferty/${job.slug}`}>{job.title}</Link>
        </h3>
        <div className="pp-job-topline">
          <CompanyLogo company={job.company} />
          <Link className="pp-job-company" to={`/firmy/${job.company.slug}`}>
            {job.company.name}
          </Link>
          <span className="pp-job-category">{categoryLabels[job.category]}</span>
        </div>
      </div>
      <div className="pp-job-facts">
        <span>
          {job.locations.join(" / ")}{" "}
          <span className="pp-job-mode">· {remoteLabels[job.remoteStatus]}</span>
        </span>
        <span>
          {seniorityLabels[job.seniority]} · {functionLabels[job.function]}
        </span>
      </div>
      <div className="pp-job-side">
        <SalaryFact job={job} />
        <span className="pp-job-age">
          Opublikowano {new Intl.DateTimeFormat("pl-PL").format(new Date(job.publishedAt))}
        </span>
      </div>
      <div className="pp-job-actions">
        {saved !== undefined && (
          <Button
            className="pp-save-button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Zapisz ofertę: ${job.title}`}
            aria-pressed={saved}
            onClick={() => run({ type: "toggle_saved", jobId: job.id })}
          >
            <Bookmark className="pp-icon" />
          </Button>
        )}
        <Link className="pp-detail-button" to={`/oferty/${job.slug}`}>
          <span className="sr-only">Zobacz rolę</span>
          <ArrowUpRight className="pp-icon" />
        </Link>
      </div>
    </article>
  );
}
