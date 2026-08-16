import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/** Fire due schedule-trigger workflows (nextRunAt <= now). */
crons.interval(
  "workflow schedule tick",
  { minutes: 1 },
  internal.workflows.tickSchedules,
  {},
);

export default crons;
