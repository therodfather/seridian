"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Doc, Id } from "convex/_generated/dataModel";
import { Badge, Button, Skeleton } from "@bytecats/ui-kit";
import { cn } from "@/lib/utils";

type CaseStudy = Doc<"caseStudies">;

interface CaseStudyListProps {
  onEdit?: (caseStudyId: Id<"caseStudies">) => void;
  onAdd?: () => void;
}

function CaseStudyRow({
  study,
  onEdit,
  onDelete,
}: {
  study: CaseStudy;
  onEdit?: (caseStudyId: Id<"caseStudies">) => void;
  onDelete?: (caseStudyId: Id<"caseStudies">) => void;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-4 rounded-lg border border-white/[0.06] bg-[#0c1222]/80 px-4 py-3",
        "transition-all duration-150",
        "hover:border-seridian-500/20 hover:bg-[#0c1222]"
      )}
    >
      {study.imageUrl ? (
        <img
          src={study.imageUrl}
          alt={study.title}
          className="h-10 w-10 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-seridian-500/10 text-sm font-semibold text-seridian-400 uppercase">
          {study.title.charAt(0)}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="truncate text-sm font-medium text-slate-200 group-hover:text-white">
            {study.title}
          </h4>
          <Badge
            variant={study.published ? "default" : "secondary"}
            className={cn(
              "shrink-0 text-[10px] px-1.5 py-0",
              study.published
                ? "bg-green-500/10 text-green-400 border-green-500/20"
                : "bg-slate-500/10 text-slate-500 border-slate-500/20"
            )}
          >
            {study.published ? "Published" : "Draft"}
          </Badge>
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-500">
          {study.industry && <span>{study.industry}</span>}
          {study.technologies.length > 0 && study.industry && (
            <span className="ml-1.5 text-slate-600">·</span>
          )}
          {study.technologies.length > 0 && (
            <span className="ml-1.5 text-slate-600">
              {study.technologies.slice(0, 3).join(", ")}
              {study.technologies.length > 3 && ` +${study.technologies.length - 3}`}
            </span>
          )}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0 text-slate-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          onClick={() => onEdit?.(study._id)}
        >
          Edit
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0 text-red-400 opacity-100 hover:text-red-300 sm:opacity-0 sm:group-hover:opacity-100"
          onClick={() => onDelete?.(study._id)}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

export function CaseStudyList({ onEdit, onAdd }: CaseStudyListProps) {
  const caseStudies = useQuery(api.caseStudies.list, {});
  const removeCaseStudy = useMutation(api.caseStudies.remove);

  function handleDelete(caseStudyId: Id<"caseStudies">) {
    if (confirm("Are you sure you want to delete this case study?")) {
      removeCaseStudy({ caseStudyId });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Case Studies</h2>
          <p className="text-sm text-slate-500">
            {caseStudies === undefined
              ? "Loading..."
              : `${caseStudies.length} case stud${caseStudies.length !== 1 ? "ies" : "y"}`}
          </p>
        </div>
        <Button type="button" size="sm" onClick={onAdd}>
          + Add Case Study
        </Button>
      </div>

      {caseStudies === undefined ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[60px] rounded-lg" />
          ))}
        </div>
      ) : caseStudies.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-white/[0.06] text-sm text-slate-600">
          No case studies yet. Add your first case study to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {caseStudies.map((study) => (
            <CaseStudyRow
              key={study._id}
              study={study}
              onEdit={onEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
