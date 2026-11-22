import type { getI02Sources, I02Reply } from "./i02-chat-contract";

export function I02Evidence({
  reply,
  sources,
}: {
  reply: I02Reply;
  sources: ReturnType<typeof getI02Sources>;
}) {
  return (
    <>
      <I02Claims claims={reply.claims} sources={sources} />
      {reply.unknown && (
        <p>
          <strong>Nieustalone.</strong> {reply.unknown}
        </p>
      )}
    </>
  );
}

export function I02Claims({
  claims,
  sources,
  label,
}: {
  claims: I02Reply["claims"];
  sources: ReturnType<typeof getI02Sources>;
  label?: string;
}) {
  return (
    <>
      {claims.map((claim, index) => (
        <div className="i02-chat-claim" key={index}>
          <p>
            {index === 0 && label && <strong>{label} </strong>}
            {claim.text}
          </p>
          <ul className="i02-chat-sources" aria-label="Źródła stwierdzenia">
            {[...new Set(claim.sourceIds)].map((sourceId) => {
              const source = sources[sourceId];
              return (
                source && (
                  <li key={sourceId}>
                    <details>
                      <summary>{source.label}</summary>
                      <blockquote>{source.text}</blockquote>
                    </details>
                  </li>
                )
              );
            })}
          </ul>
        </div>
      ))}
    </>
  );
}
